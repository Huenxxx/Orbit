import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Play, Square, Gamepad2, Info,
    Sword, Star, Target, Crown, Download, Wand2, Package,
    ChevronDown, ChevronUp, Zap, Shield, Users, Check, Loader2
} from 'lucide-react';
import { ipc } from '../../services/ipc';
import './Astra.css';
import {
    getChampionsByRole, getChampionBuild, getTierColor, getRoleIcon, getRoleName,
    KEYSTONES, RUNE_TREES, SUMMONER_SPELLS,
    type ChampionBuild
} from './championData';

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
        id: 'phase_rush',
        name: 'Irrupción de Fase (Mage/Speed)',
        icon: '🏃',
        primaryStyleId: 8200, subStyleId: 8300,
        perkIds: [8230, 8224, 8210, 8237, 8345, 8304, 5008, 5008, 5002], // Phase Rush, Manaflow, Transcendence, Scorch
        tags: ['battlemage', 'skirmisher'],
        styleName: 'Brujería + Inspiración', desc: 'Movilidad y utilidad.', winRate: 53.1
    },
    {
        id: 'comet',
        name: 'Cometa Arcano (Poke)',
        icon: '☄️',
        primaryStyleId: 8200, subStyleId: 8300,
        perkIds: [8229, 8224, 8210, 8237, 8345, 8304, 5008, 5008, 5002],
        tags: ['mage', 'artillery'],
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
        id: 'grasp',
        name: 'Garras del Inmortal (Tank)',
        icon: '🟢',
        primaryStyleId: 8400, subStyleId: 8300,
        perkIds: [8437, 8401, 8429, 8451, 8345, 8347, 5002, 5002, 5001], // Grasp (ID check?) 8437 is Grasp.
        tags: ['tank', 'warden'],
        styleName: 'Valor + Inspiración', desc: 'Vida máxima y sustain.', winRate: 51.5
    },
    {
        id: 'guardian',
        name: 'Guardián (Support)',
        icon: '🛡️',
        primaryStyleId: 8400, subStyleId: 8300,
        perkIds: [8465, 8401, 8429, 8451, 8345, 8347, 5002, 5002, 5001], // 8465 Sentinel/Guardian
        tags: ['support', 'enchanter'],
        styleName: 'Valor + Inspiración', desc: 'Protección para aliados.', winRate: 50.9
    }
];



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
    const [selectedRole, setSelectedRole] = useState<string>('top');
    const [expandedChampion, setExpandedChampion] = useState<number | null>(null);
    const [showBuildsSection, setShowBuildsSection] = useState(true);

    // New states for detected champion and build options
    const [detectedChampion, setDetectedChampion] = useState<ChampionBuild | null>(null);
    const [detectedRole, setDetectedRole] = useState<string>('');
    const [availableBuilds, setAvailableBuilds] = useState<ChampionBuild[]>([]);
    const [importedBuildId, setImportedBuildId] = useState<number | null>(null);
    const [autoImportEnabled, setAutoImportEnabled] = useState(true);

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
                        if (champSelectResult) {
                            console.log('[Astra Poll] ChampSelect:', JSON.stringify(champSelectResult));
                            setChampSelect(champSelectResult);
                        }
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

    // Track last imported champion to detect changes
    const lastImportedChampRef = useRef<{ gameId: number | null; championId: number | null }>({
        gameId: null,
        championId: null
    });

    // Auto Import Logic - Using C# Backend
    useEffect(() => {
        const performAutoImport = async () => {
            // Only run if service is connected and we're in champ select
            if (!status.serviceRunning || !status.clientConnected) {
                console.log('[Astra] Service not running or not connected');
                return;
            }

            if (champSelect?.isInChampSelect) {
                let roleStr = champSelect.assignedPosition?.toLowerCase() || '';

                // Normalize role names
                if (roleStr === 'adc') roleStr = 'bottom';
                if (roleStr === 'support') roleStr = 'utility';
                if (roleStr === 'mid') roleStr = 'middle';
                if (!roleStr || roleStr === 'none') roleStr = 'middle';

                setDetectedRole(roleStr);
                setSelectedRole(roleStr);

                // Fetch builds for the detected role from C# backend
                try {
                    const roleBuildsFromBackend = await ipc.astra.getBuildsForRole(roleStr);
                    if (roleBuildsFromBackend && roleBuildsFromBackend.length > 0) {
                        // Map to our ChampionBuild type
                        const mappedBuilds: ChampionBuild[] = roleBuildsFromBackend.map(b => ({
                            championId: b.championId,
                            name: b.name,
                            role: b.role,
                            tier: b.tier as 'S' | 'A' | 'B' | 'C',
                            winRate: b.winRate,
                            pickRate: b.pickRate,
                            banRate: b.banRate,
                            primaryTree: b.primaryTree,
                            secondaryTree: b.secondaryTree,
                            keystone: b.keystone,
                            primaryRunes: b.primaryRunes,
                            secondaryRunes: b.secondaryRunes,
                            statShards: b.statShards,
                            spell1: b.spell1,
                            spell2: b.spell2,
                            starterItems: b.starterItems,
                            coreItems: b.coreItems,
                            situationalItems: b.situationalItems,
                            boots: b.boots,
                            skillOrder: b.skillOrder,
                            playstyle: b.playstyle
                        }));
                        setAvailableBuilds(mappedBuilds);
                    } else {
                        // Fallback to local data
                        setAvailableBuilds(getChampionsByRole(roleStr));
                    }
                } catch (e) {
                    console.error("Error fetching builds from backend:", e);
                    setAvailableBuilds(getChampionsByRole(roleStr));
                }

                // When champion is selected, auto-import
                const currentChampionId = champSelect.championId;
                const currentGameId = champSelect.gameId;

                console.log(`[Astra] ChampSelect - ChampionId: ${currentChampionId}, GameId: ${currentGameId}, Role: ${roleStr}`);

                if (currentChampionId && currentChampionId > 0) {
                    // Find the build for this champion
                    let championBuild = getChampionBuild(currentChampionId, roleStr);

                    // If no specific build, get from available builds or use first of role
                    if (!championBuild) {
                        const roleBuilds = getChampionsByRole(roleStr);
                        championBuild = roleBuilds.find(b => b.championId === currentChampionId) || roleBuilds[0];
                    }

                    setDetectedChampion(championBuild || null);

                    // Check if we need to import:
                    // - Different game session OR
                    // - Different champion selected (user changed pick)
                    const needsImport = autoImportEnabled && (
                        lastImportedChampRef.current.gameId !== currentGameId ||
                        lastImportedChampRef.current.championId !== currentChampionId
                    );

                    console.log(`[Astra] NeedsImport: ${needsImport}, LastGame: ${lastImportedChampRef.current.gameId}, LastChamp: ${lastImportedChampRef.current.championId}`);

                    if (needsImport && championBuild) {
                        // Update the ref BEFORE importing to prevent race conditions
                        lastImportedChampRef.current = { gameId: currentGameId ?? null, championId: currentChampionId };
                        setImportedBuildId(championBuild.championId);
                        setAutoImportedGameId(currentGameId ?? null);

                        setMessage(`🎮 ${championBuild.name} (${getRoleName(roleStr)}) - Auto-importando...`);
                        console.log(`[Astra] Importing build for ${championBuild.name}...`);

                        try {
                            // 1. IMPORT RUNES - Always
                            const runeName = `Orbit: ${championBuild.name}`;
                            const allPerkIds = [
                                championBuild.keystone,
                                ...championBuild.primaryRunes,
                                ...championBuild.secondaryRunes,
                                ...championBuild.statShards
                            ];
                            const runesResult = await ipc.astra.importRunes(
                                runeName,
                                championBuild.primaryTree,
                                championBuild.secondaryTree,
                                allPerkIds
                            );
                            console.log('[Astra] Runes import result:', runesResult);

                            // 2. IMPORT SPELLS - Always
                            const spellsResult = await ipc.astra.importSpells(
                                championBuild.spell1,
                                championBuild.spell2
                            );
                            console.log('[Astra] Spells import result:', spellsResult);

                            // 3. IMPORT ITEMS - Always
                            const itemSet = {
                                title: `Orbit: ${championBuild.name}`,
                                blocks: [
                                    {
                                        type: "Starter",
                                        items: championBuild.starterItems.map(id => ({ id: id.toString(), count: 1 }))
                                    },
                                    {
                                        type: "Core Build",
                                        items: championBuild.coreItems.map(id => ({ id: id.toString(), count: 1 }))
                                    },
                                    {
                                        type: "Situacional",
                                        items: championBuild.situationalItems.map(id => ({ id: id.toString(), count: 1 }))
                                    },
                                    {
                                        type: "Botas",
                                        items: [{ id: championBuild.boots.toString(), count: 1 }]
                                    },
                                ]
                            };
                            const itemsResult = await ipc.astra.importItems(currentChampionId, itemSet);
                            console.log('[Astra] Items import result:', itemsResult);

                            setMessage(`✅ ${championBuild.name} - Runas, Spells e Items importados (${championBuild.winRate}% WR)`);
                            setTimeout(() => setMessage(''), 6000);

                        } catch (error: any) {
                            console.error("[Astra] Error importing build:", error);
                            setMessage(`❌ Error: ${error.message}`);
                        }
                    } else if (needsImport && !championBuild) {
                        // No build found at all, use generic role-based import
                        lastImportedChampRef.current = { gameId: currentGameId ?? null, championId: currentChampionId };
                        setMessage(`⚠️ Sin build para este campeón. Importando spells de ${getRoleName(roleStr)}...`);

                        try {
                            // Generic spells by role
                            const spells = SPELLS[roleStr as keyof typeof SPELLS] || SPELLS['middle'];
                            await ipc.astra.importSpells(spells.spell1Id, spells.spell2Id);
                            setMessage(`✅ Spells de ${getRoleName(roleStr)} importados`);
                        } catch (e) {
                            console.error("Error importing fallback:", e);
                        }
                    }
                }
            } else {
                // Reset when leaving champ select
                if (lastImportedChampRef.current.gameId !== null) {
                    console.log('[Astra] Leaving champ select, resetting state');
                    lastImportedChampRef.current = { gameId: null, championId: null };
                    setAutoImportedGameId(null);
                    setDetectedChampion(null);
                    setDetectedRole('');
                    setImportedBuildId(null);
                }
            }
        };

        performAutoImport();
    }, [champSelect, autoImportEnabled, status.serviceRunning, status.clientConnected]);

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



    const getRankColor = (tier: string) => {
        const colors: Record<string, string> = {
            'IRON': '#5c4d44', 'BRONZE': '#8c5a3c', 'SILVER': '#8a9ba8',
            'GOLD': '#ffd700', 'PLATINUM': '#00ff88', 'EMERALD': '#50c878',
            'DIAMOND': '#b9f2ff', 'MASTER': '#9d4dff', 'GRANDMASTER': '#ff4444', 'CHALLENGER': '#00d4ff'
        };
        return colors[tier] || '#6b7280';
    };


    // Helper function to get spell name for CDN URLs
    const getSpellName = (spellId: number): string => {
        const spellNames: Record<number, string> = {
            1: 'boost', // Cleanse
            3: 'exhaust',
            4: 'flash',
            6: 'haste', // Ghost
            7: 'heal',
            11: 'smite',
            12: 'teleport',
            14: 'ignite', // Actually "Dot" in some CDNs
            21: 'barrier',
        };
        return spellNames[spellId] || 'flash';
    };

    // Import champion build to the LoL client
    const handleImportChampionBuild = async (build: ChampionBuild) => {
        setIsLoading(true);
        try {
            // Import Runes
            const runeName = `Orbit: ${build.name} ${build.role.toUpperCase()}`;
            const allPerkIds = [build.keystone, ...build.primaryRunes, ...build.secondaryRunes, ...build.statShards];
            await ipc.astra.importRunes(runeName, build.primaryTree, build.secondaryTree, allPerkIds);

            // Import Spells
            await ipc.astra.importSpells(build.spell1, build.spell2);

            // Import Items
            const itemSet = {
                title: `Orbit: ${build.name}`,
                blocks: [
                    { type: "Starter", items: build.starterItems.map(id => ({ id, count: 1 })) },
                    { type: "Core Build", items: build.coreItems.map(id => ({ id, count: 1 })) },
                    { type: "Situacional", items: build.situationalItems.map(id => ({ id, count: 1 })) },
                    { type: "Botas", items: [{ id: build.boots, count: 1 }] },
                ]
            };
            await ipc.astra.importItems(build.championId, itemSet);

            setMessage(`✅ Build de ${build.name} importada: Runas, Spells e Items!`);
            setTimeout(() => setMessage(''), 5000);
        } catch (error: any) {
            console.error('Error importing build:', error);
            setMessage(`❌ Error al importar build: ${error.message || 'Error desconocido'}`);
        } finally {
            setIsLoading(false);
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

                {/* --- CHAMP SELECT & DETECTED BUILD --- */}
                {champSelect?.isInChampSelect && (
                    <div className="champ-select-section">
                        <div className="section-header">
                            <Gamepad2 size={24} />
                            <span>
                                {champSelect.championId ? '🎮 Campeón Detectado - Auto-Import Activo' : 'Seleccionando Campeón...'}
                            </span>
                            <span className="position-badge">{champSelect.assignedPosition?.toUpperCase() || 'FILL'}</span>
                        </div>

                        {/* Auto Import Toggle */}
                        <div className="auto-import-toggle">
                            <label className="toggle-container">
                                <input
                                    type="checkbox"
                                    checked={autoImportEnabled}
                                    onChange={(e) => setAutoImportEnabled(e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                                <span className="toggle-label">Auto-Import Builds</span>
                            </label>
                        </div>

                        {/* Detected Champion Info */}
                        {detectedChampion && champSelect.championId ? (
                            <div className="detected-champion-section">
                                <div className="detected-champion-card">
                                    <img
                                        src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${champSelect.championId}.png`}
                                        alt={detectedChampion.name}
                                        className="detected-champion-icon"
                                        onError={(e) => { e.currentTarget.src = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/-1.png'; }}
                                    />
                                    <div className="detected-champion-info">
                                        <h3 className="detected-champion-name">{detectedChampion.name}</h3>
                                        <div className="detected-champion-stats">
                                            <span className="tier-badge" style={{ backgroundColor: getTierColor(detectedChampion.tier) }}>
                                                {detectedChampion.tier} Tier
                                            </span>
                                            <span className="winrate-badge">{detectedChampion.winRate}% WR</span>
                                            <span className="role-badge">{getRoleIcon(detectedRole)} {getRoleName(detectedRole)}</span>
                                        </div>
                                        {importedBuildId === detectedChampion.championId && (
                                            <div className="imported-badge">
                                                <Check size={14} /> Build Importada
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Display of Imported Config */}
                                <div className="imported-config-summary">
                                    <div className="config-item">
                                        <Target size={14} />
                                        <span>{KEYSTONES[detectedChampion.keystone]?.name || 'Keystone'}</span>
                                    </div>
                                    <div className="config-item">
                                        <Wand2 size={14} />
                                        <span>{SUMMONER_SPELLS[detectedChampion.spell1]?.name} + {SUMMONER_SPELLS[detectedChampion.spell2]?.name}</span>
                                    </div>
                                    <div className="config-item">
                                        <Package size={14} />
                                        <span>{detectedChampion.coreItems.length} items en build</span>
                                    </div>
                                </div>

                                {/* Playstyle Tip */}
                                <div className="playstyle-tip">
                                    <Info size={14} />
                                    <span>{detectedChampion.playstyle}</span>
                                </div>
                            </div>
                        ) : champSelect.championId ? (
                            <div className="no-build-warning">
                                <Info size={20} />
                                <span>Sin build específica para este campeón. Usando configuración por defecto del rol.</span>
                            </div>
                        ) : (
                            <div className="waiting-champion-section">
                                <div className="waiting-header">
                                    <Loader2 size={24} className="spin" />
                                    <span>Esperando selección de campeón...</span>
                                </div>

                                {/* Show recommended champions for the role while waiting */}
                                {availableBuilds.length > 0 && detectedRole && (
                                    <div className="role-recommendations">
                                        <h4 className="recommendations-title">
                                            <Crown size={16} />
                                            Campeones recomendados para {getRoleName(detectedRole)} (mayor Win Rate):
                                        </h4>
                                        <div className="recommendations-grid">
                                            {availableBuilds.slice(0, 6).map((build) => (
                                                <div key={build.championId} className="recommended-champion-card">
                                                    <img
                                                        src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${build.championId}.png`}
                                                        alt={build.name}
                                                        className="recommended-icon"
                                                    />
                                                    <div className="recommended-info">
                                                        <span className="recommended-name">{build.name}</span>
                                                        <div className="recommended-stats">
                                                            <span className="tier-mini" style={{ backgroundColor: getTierColor(build.tier) }}>
                                                                {build.tier}
                                                            </span>
                                                            <span className="recommended-wr">{build.winRate}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="recommendation-note">
                                            💡 Al seleccionar un campeón, se importarán automáticamente sus runas, spells e items.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Alternative Builds from same role - Only show when champion IS selected */}
                        {availableBuilds.length > 0 && detectedRole && champSelect.championId && champSelect.championId > 0 && (
                            <div className="alternative-builds">
                                <h4 className="alternatives-title">
                                    <Star size={16} />
                                    Otras Builds de {getRoleName(detectedRole)} (Click para importar)
                                </h4>
                                <div className="alternatives-grid">
                                    {availableBuilds.filter(b => b.championId !== champSelect.championId).slice(0, 5).map((build) => (
                                        <div
                                            key={build.championId}
                                            className={`alternative-build-card ${importedBuildId === build.championId ? 'imported' : ''}`}
                                            onClick={() => handleImportChampionBuild(build)}
                                        >
                                            <img
                                                src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${build.championId}.png`}
                                                alt={build.name}
                                                className="alt-champ-icon"
                                            />
                                            <div className="alt-build-info">
                                                <span className="alt-champ-name">{build.name}</span>
                                                <span className="alt-winrate">{build.winRate}% WR</span>
                                            </div>
                                            <span className="tier-mini" style={{ backgroundColor: getTierColor(build.tier) }}>{build.tier}</span>
                                        </div>
                                    ))}
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

                {/* --- CHAMPION BUILDS BY ROLE SECTION --- */}
                {showBuildsSection && (
                    <div className="builds-by-role-section">
                        <div className="section-header clickable" onClick={() => setShowBuildsSection(!showBuildsSection)}>
                            <Users size={24} />
                            <span>Builds por Rol (Meta S14/S15)</span>
                            {showBuildsSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>

                        {/* Role Tabs */}
                        <div className="role-tabs">
                            {['top', 'jungle', 'middle', 'bottom', 'utility'].map(role => (
                                <button
                                    key={role}
                                    className={`role-tab ${selectedRole === role ? 'active' : ''}`}
                                    onClick={() => { setSelectedRole(role); setExpandedChampion(null); }}
                                >
                                    <span className="role-icon">{getRoleIcon(role)}</span>
                                    <span className="role-name">{getRoleName(role)}</span>
                                </button>
                            ))}
                        </div>

                        {/* Champions Grid */}
                        <div className="champions-builds-grid">
                            {getChampionsByRole(selectedRole).map((champ: ChampionBuild) => (
                                <div
                                    key={champ.championId}
                                    className={`champion-build-card ${expandedChampion === champ.championId ? 'expanded' : ''}`}
                                    onClick={() => setExpandedChampion(expandedChampion === champ.championId ? null : champ.championId)}
                                >
                                    <div className="champion-build-header">
                                        <div className="champion-identity">
                                            <img
                                                src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${champ.championId}.png`}
                                                alt={champ.name}
                                                className="champion-icon-img"
                                                onError={(e) => { e.currentTarget.src = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/-1.png'; }}
                                            />
                                            <div className="champion-name-tier">
                                                <span className="champ-name">{champ.name}</span>
                                                <span className="tier-badge" style={{ backgroundColor: getTierColor(champ.tier) }}>
                                                    {champ.tier} Tier
                                                </span>
                                            </div>
                                        </div>
                                        <div className="champion-stats">
                                            <div className="stat-item winrate">
                                                <Zap size={14} />
                                                <span>{champ.winRate}% WR</span>
                                            </div>
                                            <div className="stat-item pickrate">
                                                <Target size={14} />
                                                <span>{champ.pickRate}% Pick</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedChampion === champ.championId && (
                                        <div className="champion-build-details">
                                            {/* Summoner Spells */}
                                            <div className="build-section spells-section">
                                                <h4><Wand2 size={16} /> Hechizos de Invocador</h4>
                                                <div className="spells-display">
                                                    <div className="spell-item">
                                                        <img
                                                            src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/data/spells/icons2d/summoner_${getSpellName(champ.spell1)}.png`}
                                                            alt={SUMMONER_SPELLS[champ.spell1]?.name || 'Spell'}
                                                            className="spell-icon-img"
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                        <span>{SUMMONER_SPELLS[champ.spell1]?.icon} {SUMMONER_SPELLS[champ.spell1]?.name}</span>
                                                    </div>
                                                    <span className="spell-separator">+</span>
                                                    <div className="spell-item">
                                                        <img
                                                            src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/data/spells/icons2d/summoner_${getSpellName(champ.spell2)}.png`}
                                                            alt={SUMMONER_SPELLS[champ.spell2]?.name || 'Spell'}
                                                            className="spell-icon-img"
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                        <span>{SUMMONER_SPELLS[champ.spell2]?.icon} {SUMMONER_SPELLS[champ.spell2]?.name}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Runes */}
                                            <div className="build-section runes-section">
                                                <h4><Target size={16} /> Runas</h4>
                                                <div className="runes-display">
                                                    <div className="rune-tree primary-tree">
                                                        <span className="tree-name" style={{ color: RUNE_TREES[champ.primaryTree]?.color }}>
                                                            {RUNE_TREES[champ.primaryTree]?.icon} {RUNE_TREES[champ.primaryTree]?.name}
                                                        </span>
                                                        <div className="keystone">
                                                            <span className="keystone-icon">{KEYSTONES[champ.keystone]?.icon}</span>
                                                            <span className="keystone-name">{KEYSTONES[champ.keystone]?.name}</span>
                                                        </div>
                                                    </div>
                                                    <div className="rune-tree secondary-tree">
                                                        <span className="tree-name" style={{ color: RUNE_TREES[champ.secondaryTree]?.color }}>
                                                            {RUNE_TREES[champ.secondaryTree]?.icon} {RUNE_TREES[champ.secondaryTree]?.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Items */}
                                            <div className="build-section items-section">
                                                <h4><Package size={16} /> Core Build</h4>
                                                <div className="items-display">
                                                    {champ.coreItems.map((itemId, idx) => (
                                                        <div key={idx} className="item-slot">
                                                            <img
                                                                src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/items/icons2d/${itemId}_class_t1_itemicon_2d.png`}
                                                                alt={`Item ${itemId}`}
                                                                className="item-icon-img"
                                                                onError={(e) => {
                                                                    e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/${itemId}.png`;
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Skill Order */}
                                            <div className="build-section skills-section">
                                                <h4><Star size={16} /> Orden de Habilidades</h4>
                                                <div className="skill-order">{champ.skillOrder}</div>
                                            </div>

                                            {/* Playstyle */}
                                            <div className="build-section playstyle-section">
                                                <h4><Shield size={16} /> Estilo de Juego</h4>
                                                <p className="playstyle-text">{champ.playstyle}</p>
                                            </div>

                                            {/* Import Button */}
                                            <button
                                                className="import-build-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleImportChampionBuild(champ);
                                                }}
                                                disabled={isLoading || !status.clientConnected}
                                            >
                                                <Download size={16} />
                                                <span>Importar Build al Cliente</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
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
