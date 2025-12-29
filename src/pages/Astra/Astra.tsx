import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Play, Square, Gamepad2, Info,
    Sword, Star, Target, Crown, Download, RefreshCw, Wand2, Package
} from 'lucide-react';
import { ipc } from '../../services/ipc';
import './Astra.css';

interface AstraStatus {
    serviceRunning: boolean;
    clientConnected: boolean;
    inGame: boolean;
    port: number;
}

interface SummonerInfo {
    displayName: string;
    summonerId: number;
    profileIconId: number;
    summonerLevel: number;
    profileIconUrl: string;
}

interface RankedInfo {
    soloTier: string;
    soloDivision: string;
    soloLP: number;
    soloWins: number;
    soloLosses: number;
    soloWinRate: number;
    flexTier: string;
    flexDivision: string;
}

interface ChampSelectInfo {
    isInChampSelect: boolean;
    assignedPosition?: string;
    championId?: number;
    phase?: string;
    timeRemaining?: number;
    gameId?: number;
}

interface ChampionRecommendation {
    id: number;
    name: string;
    winRate: number;
    tier: string;
    role: string;
}

// Static champion recommendations
const CHAMPION_RECOMMENDATIONS: Record<string, ChampionRecommendation[]> = {
    top: [
        { id: 86, name: 'Garen', winRate: 52.8, tier: 'S', role: 'top' },
        { id: 122, name: 'Darius', winRate: 51.5, tier: 'A', role: 'top' },
        { id: 516, name: 'Ornn', winRate: 52.1, tier: 'S', role: 'top' },
    ],
    jungle: [
        { id: 64, name: 'Lee Sin', winRate: 49.8, tier: 'A', role: 'jungle' },
        { id: 254, name: 'Vi', winRate: 52.5, tier: 'S', role: 'jungle' },
        { id: 427, name: 'Ivern', winRate: 53.2, tier: 'S', role: 'jungle' },
    ],
    middle: [
        { id: 103, name: 'Ahri', winRate: 52.4, tier: 'S', role: 'middle' },
        { id: 112, name: 'Viktor', winRate: 51.6, tier: 'A', role: 'middle' },
        { id: 517, name: 'Sylas', winRate: 51.2, tier: 'A', role: 'middle' },
    ],
    bottom: [
        { id: 51, name: 'Caitlyn', winRate: 51.8, tier: 'A', role: 'bottom' },
        { id: 222, name: 'Jinx', winRate: 52.1, tier: 'S', role: 'bottom' },
        { id: 145, name: "Kai'Sa", winRate: 50.5, tier: 'A', role: 'bottom' },
    ],
    utility: [
        { id: 412, name: 'Thresh', winRate: 50.2, tier: 'A', role: 'utility' },
        { id: 117, name: 'Lulu', winRate: 52.8, tier: 'S', role: 'utility' },
        { id: 350, name: 'Yuumi', winRate: 49.2, tier: 'B', role: 'utility' },
    ],
};

// Rune Pages Data


// Spells Data
const SPELLS = {
    top: { spell1Id: 12, spell2Id: 4, name: 'Teleport + Flash' }, // TP, Flash
    jungle: { spell1Id: 11, spell2Id: 4, name: 'Smite + Flash' }, // Smite, Flash
    middle: { spell1Id: 14, spell2Id: 4, name: 'Ignite + Flash' }, // Ignite, Flash
    bottom: { spell1Id: 7, spell2Id: 4, name: 'Heal + Flash' },   // Heal, Flash
    utility: { spell1Id: 14, spell2Id: 4, name: 'Ignite + Flash' }, // Ignite, Flash
};



// Expanded Rune Pages (S14 Meta)
const RUNE_PAGES = [
    {
        id: 'conqueror',
        name: 'Conquistador (Fighter)',
        icon: '⚔️',
        primaryStyleId: 8000, subStyleId: 8100,
        perkIds: [8010, 9111, 9104, 8014, 8139, 8135, 5005, 5008, 5003],
        tags: ['fighter', 'diver', 'juggernaut'],
        styleName: 'Precisión + Dominación', desc: 'Sustain y daño sostenido.', winRate: 52.5
    },
    {
        id: 'electrocute',
        name: 'Electrocutar (Burst)',
        icon: '⚡',
        primaryStyleId: 8100, subStyleId: 8200,
        perkIds: [8112, 8143, 8138, 8106, 8229, 8233, 5008, 5008, 5002],
        tags: ['assassin', 'burst'],
        styleName: 'Dominación + Brujería', desc: 'Daño explosivo rápido.', winRate: 51.8
    },
    {
        id: 'comet',
        name: 'Cometa Arcano (Mage)',
        icon: '☄️',
        primaryStyleId: 8200, subStyleId: 8300,
        perkIds: [8229, 8224, 8210, 8237, 8345, 8304, 5008, 5008, 5002],
        tags: ['mage'],
        styleName: 'Brujería + Inspiración', desc: 'Pokeo y control de zona.', winRate: 50.4
    },
    {
        id: 'pta',
        name: 'Ataque Intensificado (ADC)',
        icon: '🏹',
        primaryStyleId: 8000, subStyleId: 8100,
        perkIds: [8005, 9111, 9104, 8014, 8139, 8135, 5005, 5008, 5003],
        tags: ['marksman'],
        styleName: 'Precisión + Dominación', desc: 'Daño sostenido y vulnerabilidad.', winRate: 51.2
    },
    {
        id: 'guardian',
        name: 'Guardián (Tank/Supp)',
        icon: '🛡️',
        primaryStyleId: 8400, subStyleId: 8300,
        perkIds: [8437, 8401, 8429, 8451, 8345, 8347, 5002, 5002, 5001],
        tags: ['tank', 'support'],
        styleName: 'Valor + Inspiración', desc: 'Protección para aliados.', winRate: 50.9
    }
];

// Champion Default Roles (Fallback when position is unknown)
const CHAMPION_DEFAULT_ROLES: Record<string, string> = {
    "233": "jungle", "64": "jungle", "157": "middle", "222": "bottom", "86": "top", "103": "middle"
};

// Rich Item Sets (S14 Class-Based + Specific Champs)
const ITEM_SETS: Record<string, any> = {
    // --- Clases Genéricas (S14) ---
    fighter: {
        title: "Orbit Fighter S14",
        blocks: [
            { type: "Starter", items: [{ id: "1055", count: 1 }, { id: "2003", count: 1 }] },
            { type: "Core", items: [{ id: "6692", count: 1 }, { id: "6610", count: 1 }, { id: "3071", count: 1 }] } // Eclipse, Sundered Sky, Cleaver
        ]
    },
    mage: {
        title: "Orbit Mage S14",
        blocks: [
            { type: "Starter", items: [{ id: "1056", count: 1 }, { id: "2003", count: 2 }] },
            { type: "Core", items: [{ id: "3028", count: 1 }, { id: "4645", count: 1 }, { id: "3157", count: 1 }] } // Luden's Companion, Shadowflame, Zhonya
        ]
    },
    marksman: {
        title: "Orbit ADC S14",
        blocks: [
            { type: "Starter", items: [{ id: "1055", count: 1 }, { id: "2003", count: 1 }] },
            { type: "Core", items: [{ id: "6672", count: 1 }, { id: "3031", count: 1 }, { id: "3036", count: 1 }] } // Kraken, IE, LDR
        ]
    },
    assassin: {
        title: "Orbit Assassin S14",
        blocks: [
            { type: "Starter", items: [{ id: "1055", count: 1 }] },
            { type: "Core", items: [{ id: "3142", count: 1 }, { id: "6690", count: 1 }, { id: "3814", count: 1 }] } // Youmuu, Profane Hydra, Edge of Night
        ]
    },
    tank: {
        title: "Orbit Tank S14",
        blocks: [
            { type: "Starter", items: [{ id: "1054", count: 1 }, { id: "2003", count: 1 }] },
            { type: "Core", items: [{ id: "3084", count: 1 }, { id: "3068", count: 1 }, { id: "3075", count: 1 }] } // Heartsteel, Sunfire, Thornmail
        ]
    },
    support: {
        title: "Orbit Support S14",
        blocks: [
            { type: "Starter", items: [{ id: "3865", count: 1 }, { id: "2003", count: 2 }] }, // World Atlas
            { type: "Core", items: [{ id: "6616", count: 1 }, { id: "3107", count: 1 }, { id: "3190", count: 1 }] } // Moonstone, Redemption, Locket
        ]
    },

    // --- Campeones Específicos (Overrides) ---
    // Yasuo (157)
    "157": {
        title: "Yasuo Wind S14",
        blocks: [
            { type: "Starter", items: [{ id: "1055", count: 1 }] },
            { type: "Core", items: [{ id: "6672", count: 1 }, { id: "3031", count: 1 }, { id: "3072", count: 1 }] } // Kraken, IE, Bloodthirster
        ]
    },
    // Briar (233)
    "233": {
        title: "Briar Frenzy (Meta S14)",
        blocks: [
            { type: "Starter", items: [{ id: "1055", count: 1 }] }, // Doran Blade (Safe)
            { type: "Core", items: [{ id: "6692", count: 1 }, { id: "6610", count: 1 }, { id: "3071", count: 1 }] } // Eclipse, Sundered Sky, Cleaver
        ]
    }
    // Add more ID-based overrides here
};

export function Astra() {
    const [status, setStatus] = useState<AstraStatus>({
        serviceRunning: false, clientConnected: false, inGame: false, port: 0
    });
    const [summoner, setSummoner] = useState<SummonerInfo | null>(null);
    const [ranked, setRanked] = useState<RankedInfo | null>(null);
    const [champSelect, setChampSelect] = useState<ChampSelectInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [autoImportedGameId, setAutoImportedGameId] = useState<number | null>(null);

    const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    // Poll status and data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const statusResult = await ipc.astra.getStatus();
                if (statusResult) {
                    setStatus(statusResult);

                    if (statusResult.clientConnected) {
                        const summonerResult = await ipc.astra.getSummoner();
                        if (summonerResult) setSummoner(summonerResult);

                        const rankedResult = await ipc.astra.getRanked();
                        if (rankedResult) setRanked(rankedResult);

                        const champSelectResult = await ipc.astra.getChampSelect();
                        if (champSelectResult) setChampSelect(champSelectResult);
                    } else {
                        setSummoner(null); setRanked(null); setChampSelect(null);
                    }
                }
            } catch (error) {
                console.error('Error fetching status:', error);
            }
        };

        fetchData();
        pollInterval.current = setInterval(fetchData, 2000);
        return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
    }, []);

    // Auto Import Logic
    useEffect(() => {
        const performAutoImport = async () => {
            if (champSelect?.isInChampSelect && champSelect.championId && champSelect.championId > 0 && champSelect.gameId) {
                // If we haven't imported for this game yet
                if (autoImportedGameId !== champSelect.gameId) {
                    setAutoImportedGameId(champSelect.gameId);
                    const championId = champSelect.championId?.toString() || "";
                    let roleStr = champSelect.assignedPosition?.toLowerCase() || '';
                    let championRoles: string[] = []; // To store champion class tags

                    // If role is missing (Practice Tool/Blind Pick), try to infer from champion
                    if (!roleStr || roleStr === 'none') {
                        // 1. Static Override
                        roleStr = CHAMPION_DEFAULT_ROLES[championId] || '';

                        // 2. Dynamic LCU Fetch + Class Detection
                        if (!roleStr) {
                            try {
                                const roles = await ipc.astra.getChampionRoles(Number(championId));
                                if (roles && roles.length > 0) {
                                    // Store roles for build selection
                                    championRoles = roles.map(r => r.toLowerCase());

                                    // Derive basic roleStr for UI
                                    const tag = championRoles[0];
                                    if (tag === 'marksman') roleStr = 'bottom';
                                    else if (tag === 'support') roleStr = 'utility';
                                    else if (tag === 'mage' || tag === 'assassin') roleStr = 'middle';
                                    else if (tag === 'fighter' || tag === 'tank') roleStr = 'top';
                                    else if (tag === 'jungle') roleStr = 'jungle';
                                }
                            } catch (e) {
                                console.error("Error fetching roles", e);
                            }
                        }

                        // 3. Ultimate Fallback
                        if (!roleStr) roleStr = 'middle';
                    }

                    const role = roleStr as keyof typeof SPELLS;
                    setMessage(`Champion detectado (ID: ${championId}, Rol: ${role})! Auto-importando config...`);

                    // 1. Runes based on Tags/Class
                    let bestPage = RUNE_PAGES[0]; // Default Conqueror
                    if (championRoles.length > 0) {
                        // Find first page that matches any of the champion's tags
                        bestPage = RUNE_PAGES.find(p => p.tags.some(t => championRoles.includes(t))) || RUNE_PAGES[0];
                    }
                    await ipc.astra.importRunes(bestPage.name, bestPage.primaryStyleId, bestPage.subStyleId, bestPage.perkIds);

                    // 2. Spells based on Role (Position)
                    const spells = SPELLS[role] || SPELLS['middle'];
                    await ipc.astra.importSpells(spells.spell1Id, spells.spell2Id);

                    // 3. Item Set (Specific Champ > Class Tag > Position > Fallback)
                    let itemSet = ITEM_SETS[championId];
                    if (!itemSet && championRoles.length > 0) {
                        // Try to find a set for the primary class (e.g. 'fighter', 'mage')
                        const primaryClass = championRoles[0];
                        itemSet = ITEM_SETS[primaryClass];
                    }
                    if (!itemSet) itemSet = ITEM_SETS['fighter']; // Safe fallack

                    await ipc.astra.importItems(champSelect.championId, itemSet);

                    setMessage('Configuración (Runas, Spells, Items) importada automáticamente!');
                    setTimeout(() => setMessage(''), 5000);
                }
            } else if (!champSelect?.isInChampSelect) {
                // Reset when leaving champ select
                if (autoImportedGameId !== null) setAutoImportedGameId(null);
            }
        };

        performAutoImport();
    }, [champSelect, autoImportedGameId]);

    const handleStartService = useCallback(async () => {
        setIsLoading(true);
        setMessage('Iniciando servicio Astra...');
        try {
            const result = await ipc.astra.startService();
            if (result?.success) {
                setStatus(prev => ({ ...prev, serviceRunning: true }));
                setMessage(result.message || 'Servicio iniciado.');
            }
        } catch (error: any) {
            console.error("Astra start error:", error);
            setMessage(`Error: ${error.message || 'Fallo desconocido al iniciar'}`);
        }
        finally { setIsLoading(false); }
    }, []);

    const handleStopService = useCallback(async () => {
        setIsLoading(true);
        try {
            await ipc.astra.stopService();
            setStatus({ serviceRunning: false, clientConnected: false, inGame: false, port: 0 });
            setSummoner(null); setRanked(null); setChampSelect(null);
            setMessage('Servicio detenido.');
        } catch (error) { setMessage('Error al detener el servicio'); }
        finally { setIsLoading(false); }
    }, []);

    const handleManualImport = async (rune: typeof RUNE_PAGES[0]) => {
        setIsLoading(true);
        try {
            await ipc.astra.importRunes(rune.name, rune.primaryStyleId, rune.subStyleId, rune.perkIds);
            setMessage(`Runas "${rune.name}" importadas exitosamente.`);
        } catch (e) { setMessage('Error al importar runas.'); }
        finally { setIsLoading(false); }
    };

    const getPositionRecommendations = () => {
        if (!champSelect?.assignedPosition) return [];
        return CHAMPION_RECOMMENDATIONS[champSelect.assignedPosition] || [];
    };

    const getRankColor = (tier: string) => {
        const colors: Record<string, string> = {
            'IRON': '#5c4d44', 'BRONZE': '#8c5a3c', 'SILVER': '#8a9ba8',
            'GOLD': '#ffd700', 'PLATINUM': '#00ff88', 'EMERALD': '#50c878',
            'DIAMOND': '#b9f2ff', 'MASTER': '#9d4dff', 'GRANDMASTER': '#ff4444', 'CHALLENGER': '#00d4ff'
        };
        return colors[tier] || '#6b7280';
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'S': return '#ffd700'; case 'A': return '#22c55e'; case 'B': return '#3b82f6'; default: return '#6b7280';
        }
    };

    return (
        <div className="astra-page">
            <div className="astra-background">
                <div className="astra-stars">
                    {[...Array(30)].map((_, i) => (
                        <div key={i} className="astra-star" style={{
                            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s`
                        }} />
                    ))}
                </div>
                <div className="astra-nebula" />
            </div>

            <div className="astra-content">
                <header className="astra-header">
                    <div className="logo-section">
                        <div className="astra-logo-large">
                            <div className="logo-orbit-large">
                                <div className="orbit-ring-large" />
                                <div className="orbit-planet-large" />
                            </div>
                        </div>
                        <div className="logo-text-section">
                            <h1 className="astra-title">ORBIT ASTRA</h1>
                            <p className="astra-subtitle">Gaming Overlay para League of Legends</p>
                        </div>
                    </div>
                </header>

                {/* --- ACCOUNT INFO --- */}
                {summoner && (
                    <div className="account-section">
                        <div className="account-card">
                            <img src={summoner.profileIconUrl} alt="Icon" className="profile-icon" />
                            <div className="account-info">
                                <h2 className="summoner-name">{summoner.displayName}</h2>
                                <span className="summoner-level">Nivel {summoner.summonerLevel}</span>
                            </div>
                            {ranked && ranked.soloTier !== 'UNRANKED' && (
                                <div className="rank-badge" style={{ borderColor: getRankColor(ranked.soloTier) }}>
                                    <Crown size={16} style={{ color: getRankColor(ranked.soloTier) }} />
                                    <span style={{ color: getRankColor(ranked.soloTier) }}>
                                        {ranked.soloTier} {ranked.soloDivision}
                                    </span>
                                    <span className="lp-text">{ranked.soloLP} LP</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- CHAMP SELECT & DRAFT ANALYSIS --- */}
                {champSelect?.isInChampSelect && (
                    <div className="champ-select-section">
                        <div className="section-header">
                            <Gamepad2 size={24} />
                            <span>
                                {champSelect.championId ? 'Campeón Seleccionado (Auto-Config Activo)' : 'Seleccionando Campeón'}
                            </span>
                            <span className="position-badge">{champSelect.assignedPosition?.toUpperCase() || 'FILL'}</span>
                        </div>

                        {!champSelect.championId ? (
                            <div className="champion-recommendations">
                                <h3 className="subsection-title">
                                    <Star size={16} />
                                    <span>Recomendaciones para {champSelect.assignedPosition || 'tu rol'}</span>
                                </h3>
                                <div className="champions-grid">
                                    {getPositionRecommendations().map((champ) => (
                                        <div key={champ.id} className="champion-card">
                                            <div className="champion-info">
                                                <span className="champion-name">{champ.name}</span>
                                                <span className="champion-winrate" style={{ color: '#22c55e' }}>{champ.winRate}% WR</span>
                                            </div>
                                            <span className="tier-badge" style={{ backgroundColor: getTierColor(champ.tier) }}>{champ.tier}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="matchup-analysis">
                                <div className="analysis-card">
                                    <h3 className="subsection-title">
                                        <RefreshCw size={16} />
                                        <span>Análisis del Matchup</span>
                                    </h3>
                                    <p className="analysis-text">
                                        Runas, Hechizos e Items se han configurado automáticamente para maximizar winrate.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- CONFIGURATION DISPLAY --- */}
                {champSelect?.championId ? (
                    <div className="builds-runes-section">
                        <div className="builds-panel">
                            <h3 className="section-title"> <Sword size={18} /> <span>Configuración Activa</span> </h3>

                            {/* Spells Display */}
                            <div className="config-row">
                                <div className="config-item">
                                    <Wand2 size={16} className="config-icon" />
                                    <span>Hechizos: {SPELLS[champSelect.assignedPosition as keyof typeof SPELLS]?.name || 'Auto'}</span>
                                </div>
                                <div className="config-item">
                                    <Package size={16} className="config-icon" />
                                    <span>Item Set: Orbit Recommended</span>
                                </div>
                            </div>

                            <div className="items-grid">
                                <div className="item-card build-card">
                                    <span className="item-icon">🔥</span>
                                    <div className="item-info">
                                        <span className="item-name">Core Build</span>
                                        <span className="item-winrate">54.2% WR</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="runes-panel">
                            <h3 className="section-title"> <Target size={18} /> <span>Runas Seleccionadas</span> </h3>
                            <div className="runes-grid">
                                {RUNE_PAGES.map((rune, idx) => (
                                    <div key={idx} className="rune-card interactive" onClick={() => handleManualImport(rune)}>
                                        <div className="rune-header">
                                            <span className="rune-icon">{rune.icon}</span>
                                            <span className="rune-name">{rune.name}</span>
                                            <button className="import-btn" title="Re-Importar"> <Download size={14} /> </button>
                                        </div>
                                        <div className="rune-desc">{rune.desc}</div>
                                        <div className="rune-details">
                                            <span className="rune-style">{rune.styleName}</span>
                                            <span className="rune-winrate">{rune.winRate}% WR</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    champSelect?.isInChampSelect ? (
                        <div className="waiting-pick-message">
                            <Info size={20} /> <span>Selecciona un campeón para auto-importar configuración.</span>
                        </div>
                    ) : null
                )}

                {/* Control Panel */}
                <div className="control-panel">
                    <h2 className="panel-title">Estado del Sistema</h2>
                    <div className="control-buttons">
                        {!status.serviceRunning ? (
                            <button className="control-btn start-btn" onClick={handleStartService} disabled={isLoading}>
                                <Play size={20} /> <span>Iniciar Servicio</span>
                            </button>
                        ) : (
                            <button className="control-btn stop-btn" onClick={handleStopService} disabled={isLoading}>
                                <Square size={20} /> <span>Detener Servicio</span>
                            </button>
                        )}
                    </div>
                    {message && <div className="message-box">{message}</div>}
                </div>
            </div>
        </div>
    );
}
