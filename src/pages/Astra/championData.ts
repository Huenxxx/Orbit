// ============================================================================
// ORBIT ASTRA - Champion Data (Season 14/15 Meta)
// Builds, Runas y Spells por Campeón y Rol
// Datos basados en U.GG, OP.GG y meta actual
// ============================================================================

// Summoner Spell IDs (Riot Data Dragon)
export const SUMMONER_SPELLS: Record<number, { name: string; icon: string }> = {
    1: { name: 'Cleanse', icon: '🧹' },
    3: { name: 'Exhaust', icon: '💨' },
    4: { name: 'Flash', icon: '⚡' },
    6: { name: 'Ghost', icon: '👻' },
    7: { name: 'Heal', icon: '💚' },
    11: { name: 'Smite', icon: '🔥' },
    12: { name: 'Teleport', icon: '🌀' },
    14: { name: 'Ignite', icon: '🔥' },
    21: { name: 'Barrier', icon: '🛡️' },
};

// Rune Tree IDs
export const RUNE_TREES: Record<number, { name: string; icon: string; color: string }> = {
    8000: { name: 'Precisión', icon: '🎯', color: '#c8aa6e' },
    8100: { name: 'Dominación', icon: '⚔️', color: '#d44444' },
    8200: { name: 'Brujería', icon: '✨', color: '#9b59b6' },
    8300: { name: 'Inspiración', icon: '💡', color: '#49c0b0' },
    8400: { name: 'Valor', icon: '🛡️', color: '#a1d586' },
};

// Keystone Runes
export const KEYSTONES: Record<number, { name: string; tree: number; icon: string }> = {
    // Precision
    8005: { name: 'Ataque Intensificado', tree: 8000, icon: '🏹' },
    8008: { name: 'Cadencia Letal', tree: 8000, icon: '⚡' },
    8010: { name: 'Conquistador', tree: 8000, icon: '⚔️' },
    8021: { name: 'Ritmo de batalla', tree: 8000, icon: '🎵' },
    // Domination
    8112: { name: 'Electrocutar', tree: 8100, icon: '⚡' },
    8124: { name: 'Depredador', tree: 8100, icon: '👁️' },
    8128: { name: 'Cosecha oscura', tree: 8100, icon: '🌙' },
    9923: { name: 'Lluvia de cuchillas', tree: 8100, icon: '🗡️' },
    // Sorcery
    8214: { name: 'Invocar a Aery', tree: 8200, icon: '🦋' },
    8229: { name: 'Cometa Arcano', tree: 8200, icon: '☄️' },
    8230: { name: 'Irrupción de fase', tree: 8200, icon: '🏃' },
    // Inspiration
    8351: { name: 'Calzado mágico', tree: 8300, icon: '👟' },
    8360: { name: 'Banda de sellado', tree: 8300, icon: '📜' },
    8369: { name: 'Primer golpe', tree: 8300, icon: '💰' },
    // Resolve
    8437: { name: 'Garras del inmortal', tree: 8400, icon: '🟢' },
    8439: { name: 'Vendaval', tree: 8400, icon: '🌊' },
    8465: { name: 'Guardián', tree: 8400, icon: '🛡️' },
};

// ============================================================================
// CHAMPION BUILD DATA BY ROLE
// ============================================================================

export interface ChampionBuild {
    championId: number;
    name: string;
    role: string;
    tier: 'S' | 'A' | 'B' | 'C';
    winRate: number;
    pickRate: number;
    banRate: number;
    // Runes
    primaryTree: number;
    secondaryTree: number;
    keystone: number;
    primaryRunes: number[];
    secondaryRunes: number[];
    statShards: number[];
    // Summoner Spells
    spell1: number;
    spell2: number;
    // Core Items (IDs)
    starterItems: string[];
    coreItems: string[];
    situationalItems: string[];
    boots: string;
    // Skills priority
    skillOrder: string;
    // Tips
    playstyle: string;
}

// ============================================================================
// TOP LANE CHAMPIONS
// ============================================================================

export const TOP_CHAMPIONS: ChampionBuild[] = [
    {
        championId: 266, // Aatrox
        name: 'Aatrox',
        role: 'top',
        tier: 'S',
        winRate: 51.5,
        pickRate: 8.2,
        banRate: 12.1,
        primaryTree: 8000,
        secondaryTree: 8400,
        keystone: 8010, // Conqueror
        primaryRunes: [9111, 9104, 8014], // Triumph, Legend: Alacrity, Coup de Grace
        secondaryRunes: [8444, 8451], // Second Wind, Unflinching
        statShards: [5008, 5008, 5002],
        spell1: 12, // Teleport
        spell2: 4,  // Flash
        starterItems: ['1055'], // Doran's Blade
        coreItems: ['6694', '6610', '3071'], // Serylda's, Sundered Sky, Black Cleaver
        situationalItems: ['3053', '3156', '6333'], // Sterak's, Maw, Death's Dance
        boots: '3111', // Mercury's
        skillOrder: 'Q > E > W',
        playstyle: 'Agresivo en trades cortos. Busca pokes con Q y all-in con R.'
    },
    {
        championId: 24, // Jax
        name: 'Jax',
        role: 'top',
        tier: 'S',
        winRate: 52.3,
        pickRate: 7.8,
        banRate: 8.5,
        primaryTree: 8000,
        secondaryTree: 8400,
        keystone: 8010, // Conqueror
        primaryRunes: [9111, 9105, 8014],
        secondaryRunes: [8444, 8453],
        statShards: [5005, 5008, 5002],
        spell1: 12,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['3078', '3074', '6610'], // Trinity, Ravenous, Sundered Sky
        situationalItems: ['3053', '3193', '3026'],
        boots: '3111',
        skillOrder: 'E > Q > W',
        playstyle: 'Escalar y splitpush. Usa E para counter ataques básicos.'
    },
    {
        championId: 122, // Darius
        name: 'Darius',
        role: 'top',
        tier: 'S',
        winRate: 51.8,
        pickRate: 6.5,
        banRate: 15.2,
        primaryTree: 8000,
        secondaryTree: 8400,
        keystone: 8010,
        primaryRunes: [9111, 9105, 8299],
        secondaryRunes: [8444, 8451],
        statShards: [5005, 5008, 5002],
        spell1: 6, // Ghost
        spell2: 4,
        starterItems: ['1054'], // Doran's Shield
        coreItems: ['3078', '3053', '6333'], // Trinity, Sterak's, Death's Dance
        situationalItems: ['3071', '3026', '3065'],
        boots: '3111',
        skillOrder: 'Q > E > W',
        playstyle: 'Lane bully. Stackea pasiva y ejecuta con R.'
    },
    {
        championId: 86, // Garen
        name: 'Garen',
        role: 'top',
        tier: 'A',
        winRate: 52.0,
        pickRate: 5.8,
        banRate: 4.2,
        primaryTree: 8000,
        secondaryTree: 8400,
        keystone: 8010,
        primaryRunes: [9111, 9105, 8299],
        secondaryRunes: [8444, 8453],
        statShards: [5005, 5008, 5002],
        spell1: 14, // Ignite
        spell2: 4,
        starterItems: ['1054'],
        coreItems: ['6631', '3053', '6333'], // Stridebreaker, Sterak's, Death's Dance
        situationalItems: ['3742', '3065', '3026'],
        boots: '3111',
        skillOrder: 'Q > E > W',
        playstyle: 'Simple pero efectivo. Silencia con Q, spinnea y ejecuta con R.'
    },
    {
        championId: 516, // Ornn
        name: 'Ornn',
        role: 'top',
        tier: 'S',
        winRate: 52.1,
        pickRate: 4.2,
        banRate: 3.8,
        primaryTree: 8400,
        secondaryTree: 8300,
        keystone: 8437, // Grasp
        primaryRunes: [8401, 8429, 8451],
        secondaryRunes: [8345, 8347],
        statShards: [5002, 5002, 5001],
        spell1: 12,
        spell2: 4,
        starterItems: ['1054'],
        coreItems: ['6667', '3068', '3075'], // Unending Despair, Sunfire, Thornmail
        situationalItems: ['3065', '3110', '3742'],
        boots: '3047', // Plated Steelcaps
        skillOrder: 'Q > W > E',
        playstyle: 'Tank de teamfight. Mejora items aliados. R para engages.'
    },
    {
        championId: 875, // Sett
        name: 'Sett',
        role: 'top',
        tier: 'A',
        winRate: 51.2,
        pickRate: 5.1,
        banRate: 6.3,
        primaryTree: 8000,
        secondaryTree: 8400,
        keystone: 8010,
        primaryRunes: [9111, 9105, 8299],
        secondaryRunes: [8444, 8453],
        statShards: [5008, 5008, 5002],
        spell1: 12,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['3078', '3053', '6333'],
        situationalItems: ['3193', '3026', '3742'],
        boots: '3111',
        skillOrder: 'Q > W > E',
        playstyle: 'Pelea extendida. Almacena grit y suelta W verdadero.'
    },
    {
        championId: 58, // Renekton
        name: 'Renekton',
        role: 'top',
        tier: 'A',
        winRate: 50.5,
        pickRate: 4.8,
        banRate: 2.1,
        primaryTree: 8000,
        secondaryTree: 8400,
        keystone: 8010,
        primaryRunes: [9111, 9104, 8299],
        secondaryRunes: [8444, 8453],
        statShards: [5008, 5008, 5002],
        spell1: 14,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['6692', '6610', '3071'], // Eclipse, Sundered, Cleaver
        situationalItems: ['3053', '3156', '6333'],
        boots: '3111',
        skillOrder: 'Q > E > W',
        playstyle: 'Early game bully. Combo: E-W-Q-E out.'
    },
    {
        championId: 114, // Fiora
        name: 'Fiora',
        role: 'top',
        tier: 'A',
        winRate: 51.0,
        pickRate: 5.5,
        banRate: 7.2,
        primaryTree: 8000,
        secondaryTree: 8400,
        keystone: 8010,
        primaryRunes: [9111, 9105, 8299],
        secondaryRunes: [8444, 8453],
        statShards: [5008, 5008, 5002],
        spell1: 12,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['3078', '3074', '6333'], // Trinity, Ravenous, Death's Dance
        situationalItems: ['3156', '3053', '3181'],
        boots: '3047',
        skillOrder: 'Q > E > W',
        playstyle: 'Duelista pura. Proca vitales y riposte habilidades clave.'
    },
    {
        championId: 54, // Malphite
        name: 'Malphite',
        role: 'top',
        tier: 'A',
        winRate: 52.5,
        pickRate: 4.0,
        banRate: 5.5,
        primaryTree: 8200,
        secondaryTree: 8400,
        keystone: 8229, // Comet
        primaryRunes: [8224, 8210, 8237],
        secondaryRunes: [8444, 8453],
        statShards: [5008, 5002, 5001],
        spell1: 12,
        spell2: 4,
        starterItems: ['1054'],
        coreItems: ['3068', '3075', '3110'], // Sunfire, Thornmail, Frozen Heart
        situationalItems: ['3065', '3742', '6667'],
        boots: '3047',
        skillOrder: 'Q > E > W',
        playstyle: 'Poke con Q en lane. R para engage o peel en teamfights.'
    },
    {
        championId: 57, // Maokai
        name: 'Maokai',
        role: 'top',
        tier: 'S',
        winRate: 53.2,
        pickRate: 3.5,
        banRate: 4.8,
        primaryTree: 8400,
        secondaryTree: 8300,
        keystone: 8437,
        primaryRunes: [8401, 8429, 8451],
        secondaryRunes: [8345, 8347],
        statShards: [5002, 5002, 5001],
        spell1: 12,
        spell2: 4,
        starterItems: ['1054'],
        coreItems: ['6667', '3119', '3065'], // Unending Despair, Winter's Approach, Spirit Visage
        situationalItems: ['3068', '3075', '3742'],
        boots: '3047',
        skillOrder: 'Q > E > W',
        playstyle: 'Tank disrumpor. Saplings en bushes, W para engage.'
    },
];

// ============================================================================
// JUNGLE CHAMPIONS
// ============================================================================

export const JUNGLE_CHAMPIONS: ChampionBuild[] = [
    {
        championId: 64, // Lee Sin
        name: 'Lee Sin',
        role: 'jungle',
        tier: 'A',
        winRate: 49.5,
        pickRate: 9.2,
        banRate: 8.5,
        primaryTree: 8100,
        secondaryTree: 8000,
        keystone: 8112, // Electrocute
        primaryRunes: [8143, 8138, 8106],
        secondaryRunes: [9111, 9105],
        statShards: [5008, 5008, 5002],
        spell1: 11, // Smite
        spell2: 4,
        starterItems: ['1103'], // Scorchclaw
        coreItems: ['6692', '6610', '3071'], // Eclipse, Sundered, Cleaver
        situationalItems: ['3156', '6333', '3026'],
        boots: '3047',
        skillOrder: 'Q > W > E',
        playstyle: 'Early ganker. Insecing con R es clave para teamfights.'
    },
    {
        championId: 254, // Vi
        name: 'Vi',
        role: 'jungle',
        tier: 'S',
        winRate: 52.8,
        pickRate: 6.5,
        banRate: 5.2,
        primaryTree: 8000,
        secondaryTree: 8100,
        keystone: 8010, // Conqueror
        primaryRunes: [9111, 9105, 8014],
        secondaryRunes: [8139, 8135],
        statShards: [5005, 5008, 5002],
        spell1: 11,
        spell2: 4,
        starterItems: ['1103'],
        coreItems: ['3078', '6333', '3053'], // Trinity, Death's Dance, Sterak's
        situationalItems: ['3193', '3026', '3156'],
        boots: '3047',
        skillOrder: 'Q > E > W',
        playstyle: 'Engage y lockdown. Q-Flash para sorprender. R imparable.'
    },
    {
        championId: 121, // Kha'Zix
        name: "Kha'Zix",
        role: 'jungle',
        tier: 'S',
        winRate: 52.5,
        pickRate: 8.8,
        banRate: 12.5,
        primaryTree: 8100,
        secondaryTree: 8000,
        keystone: 8112,
        primaryRunes: [8143, 8138, 8106],
        secondaryRunes: [9111, 9105],
        statShards: [5008, 5008, 5002],
        spell1: 11,
        spell2: 4,
        starterItems: ['1102'], // Mosstomper
        coreItems: ['6692', '6701', '3156'], // Eclipse, Opportunity, Maw
        situationalItems: ['6609', '3814', '6676'],
        boots: '3158', // Ionian
        skillOrder: 'Q > W > E',
        playstyle: 'Assassin. Busca targets aislados. Evolve Q>E>R/W.'
    },
    {
        championId: 233, // Briar
        name: 'Briar',
        role: 'jungle',
        tier: 'S',
        winRate: 52.2,
        pickRate: 7.5,
        banRate: 18.5,
        primaryTree: 8000,
        secondaryTree: 8100,
        keystone: 8010,
        primaryRunes: [9111, 9105, 8014],
        secondaryRunes: [8139, 8135],
        statShards: [5005, 5008, 5002],
        spell1: 11,
        spell2: 4,
        starterItems: ['1103'],
        coreItems: ['6692', '6610', '3071'],
        situationalItems: ['3053', '6333', '3156'],
        boots: '3047',
        skillOrder: 'Q > E > W',
        playstyle: 'All-in berserker. W para lifesteal, R para engage.'
    },
    {
        championId: 104, // Graves
        name: 'Graves',
        role: 'jungle',
        tier: 'S',
        winRate: 51.8,
        pickRate: 7.2,
        banRate: 6.8,
        primaryTree: 8100,
        secondaryTree: 8000,
        keystone: 8128, // Dark Harvest
        primaryRunes: [8143, 8138, 8106],
        secondaryRunes: [9111, 9105],
        statShards: [5008, 5008, 5002],
        spell1: 11,
        spell2: 4,
        starterItems: ['1102'],
        coreItems: ['3006', '6676', '6696'], // Berserker's, Collector, Axiom Arc
        situationalItems: ['3031', '3036', '3156'],
        boots: '3006',
        skillOrder: 'Q > E > W',
        playstyle: 'Farm pesado. Kiting con E. Burst con autos + Q.'
    },
    {
        championId: 876, // Lillia
        name: 'Lillia',
        role: 'jungle',
        tier: 'A',
        winRate: 51.5,
        pickRate: 5.2,
        banRate: 3.8,
        primaryTree: 8000,
        secondaryTree: 8200,
        keystone: 8010,
        primaryRunes: [9111, 9105, 8014],
        secondaryRunes: [8229, 8237],
        statShards: [5008, 5008, 5002],
        spell1: 11,
        spell2: 4,
        starterItems: ['1102'],
        coreItems: ['4633', '3118', '4645'], // Riftmaker, Malignance, Shadowflame
        situationalItems: ['3157', '3089', '3116'],
        boots: '3158',
        skillOrder: 'Q > W > E',
        playstyle: 'Kiting speed demon. Stackea pasiva y duerme con R.'
    },
    {
        championId: 234, // Viego
        name: 'Viego',
        role: 'jungle',
        tier: 'A',
        winRate: 50.8,
        pickRate: 8.5,
        banRate: 10.2,
        primaryTree: 8000,
        secondaryTree: 8100,
        keystone: 8010,
        primaryRunes: [9111, 9105, 8014],
        secondaryRunes: [8139, 8135],
        statShards: [5005, 5008, 5002],
        spell1: 11,
        spell2: 4,
        starterItems: ['1103'],
        coreItems: ['6672', '6610', '3031'], // Kraken, Sundered Sky, IE
        situationalItems: ['3026', '3156', '3053'],
        boots: '3006',
        skillOrder: 'Q > E > W',
        playstyle: 'Reset king. Mata y posee para curar y castear.'
    },
    {
        championId: 72, // Skarner
        name: 'Skarner',
        role: 'jungle',
        tier: 'S',
        winRate: 53.5,
        pickRate: 4.2,
        banRate: 8.5,
        primaryTree: 8400,
        secondaryTree: 8000,
        keystone: 8437,
        primaryRunes: [8401, 8429, 8451],
        secondaryRunes: [9111, 9105],
        statShards: [5005, 5002, 5001],
        spell1: 11,
        spell2: 4,
        starterItems: ['1102'],
        coreItems: ['6667', '3078', '3742'], // Unending, Trinity, Dead Man's
        situationalItems: ['3068', '3065', '3193'],
        boots: '3047',
        skillOrder: 'Q > E > W',
        playstyle: 'Tank con CC insano. Arrastra con R.'
    },
    {
        championId: 19, // Warwick
        name: 'Warwick',
        role: 'jungle',
        tier: 'A',
        winRate: 52.0,
        pickRate: 5.8,
        banRate: 3.2,
        primaryTree: 8000,
        secondaryTree: 8400,
        keystone: 8010,
        primaryRunes: [9111, 9105, 8014],
        secondaryRunes: [8444, 8451],
        statShards: [5005, 5008, 5002],
        spell1: 11,
        spell2: 4,
        starterItems: ['1103'],
        coreItems: ['3153', '3078', '3053'], // BOTRK, Trinity, Sterak's
        situationalItems: ['3068', 'wit', '3193'],
        boots: '3047',
        skillOrder: 'Q > W > E',
        playstyle: 'Sustain beast. Sigue al enemigo con W, salta con R.'
    },
    {
        championId: 28, // Evelynn
        name: 'Evelynn',
        role: 'jungle',
        tier: 'A',
        winRate: 51.2,
        pickRate: 4.5,
        banRate: 5.8,
        primaryTree: 8100,
        secondaryTree: 8200,
        keystone: 8112,
        primaryRunes: [8143, 8136, 8106],
        secondaryRunes: [8224, 8237],
        statShards: [5008, 5008, 5002],
        spell1: 11,
        spell2: 4,
        starterItems: ['1102'],
        coreItems: ['4636', '4645', '3089'], // Night Harvester, Shadowflame, Deathcap
        situationalItems: ['3157', '3135', '3165'],
        boots: '3020', // Sorc Shoes
        skillOrder: 'Q > E > W',
        playstyle: 'Invisible assassin. Espera nivel 6 para ganks.'
    },
];

// ============================================================================
// MID LANE CHAMPIONS
// ============================================================================

export const MID_CHAMPIONS: ChampionBuild[] = [
    {
        championId: 103, // Ahri
        name: 'Ahri',
        role: 'middle',
        tier: 'S',
        winRate: 52.5,
        pickRate: 9.5,
        banRate: 6.2,
        primaryTree: 8100,
        secondaryTree: 8200,
        keystone: 8112,
        primaryRunes: [8143, 8138, 8106],
        secondaryRunes: [8224, 8237],
        statShards: [5008, 5008, 5002],
        spell1: 14, // Ignite
        spell2: 4,
        starterItems: ['1056'], // Doran's Ring
        coreItems: ['3118', '3165', '4645'], // Malignance, Morello, Shadowflame
        situationalItems: ['3157', '3089', '3135'],
        boots: '3020',
        skillOrder: 'Q > W > E',
        playstyle: 'Mage versátil. Charm para picks, R para movilidad.'
    },
    {
        championId: 112, // Viktor
        name: 'Viktor',
        role: 'middle',
        tier: 'S',
        winRate: 51.8,
        pickRate: 6.2,
        banRate: 4.5,
        primaryTree: 8200,
        secondaryTree: 8300,
        keystone: 8229, // Comet
        primaryRunes: [8224, 8210, 8237],
        secondaryRunes: [8345, 8347],
        statShards: [5008, 5008, 5002],
        spell1: 12,
        spell2: 4,
        starterItems: ['1056'],
        coreItems: ['3100', '3089', '3135'], // Lich Bane, Deathcap, Void Staff
        situationalItems: ['3157', '4645', '3165'],
        boots: '3020',
        skillOrder: 'E > Q > W',
        playstyle: 'Scaling mage. Upgrade E primero. Zonea con W y R.'
    },
    {
        championId: 84, // Akali
        name: 'Akali',
        role: 'middle',
        tier: 'A',
        winRate: 50.2,
        pickRate: 8.5,
        banRate: 12.8,
        primaryTree: 8000,
        secondaryTree: 8100,
        keystone: 8010,
        primaryRunes: [9111, 9105, 8014],
        secondaryRunes: [8143, 8135],
        statShards: [5008, 5008, 5002],
        spell1: 14,
        spell2: 4,
        starterItems: ['1056'],
        coreItems: ['4636', '3157', '4645'],
        situationalItems: ['3135', '3089', '3165'],
        boots: '3020',
        skillOrder: 'Q > E > W',
        playstyle: 'Assassin AP. Combo: Q-E-R1-AA-Q-R2.'
    },
    {
        championId: 238, // Zed
        name: 'Zed',
        role: 'middle',
        tier: 'A',
        winRate: 50.5,
        pickRate: 9.8,
        banRate: 15.5,
        primaryTree: 8100,
        secondaryTree: 8000,
        keystone: 8112,
        primaryRunes: [8143, 8138, 8106],
        secondaryRunes: [9111, 8014],
        statShards: [5008, 5008, 5002],
        spell1: 14,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['6692', '6701', '3814'], // Eclipse, Opportunity, Edge of Night
        situationalItems: ['6676', '3156', '3142'],
        boots: '3158',
        skillOrder: 'Q > W > E',
        playstyle: 'AD assassin. R para ulti, vuelve con R para escapar.'
    },
    {
        championId: 134, // Syndra
        name: 'Syndra',
        role: 'middle',
        tier: 'S',
        winRate: 51.5,
        pickRate: 6.8,
        banRate: 5.2,
        primaryTree: 8100,
        secondaryTree: 8200,
        keystone: 8112,
        primaryRunes: [8143, 8138, 8106],
        secondaryRunes: [8224, 8237],
        statShards: [5008, 5008, 5002],
        spell1: 12,
        spell2: 4,
        starterItems: ['1056'],
        coreItems: ['3118', '4645', '3089'],
        situationalItems: ['3157', '3135', '3165'],
        boots: '3020',
        skillOrder: 'Q > W > E',
        playstyle: 'Burst mage. Stun con E, ejecuta con R multi-esferas.'
    },
    {
        championId: 777, // Yone
        name: 'Yone',
        role: 'middle',
        tier: 'A',
        winRate: 50.8,
        pickRate: 12.5,
        banRate: 18.2,
        primaryTree: 8000,
        secondaryTree: 8100,
        keystone: 8008, // Lethal Tempo
        primaryRunes: [9111, 9105, 8014],
        secondaryRunes: [8143, 8135],
        statShards: [5005, 5008, 5002],
        spell1: 14,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['6672', '3031', '3046'], // Kraken, IE, Phantom Dancer
        situationalItems: ['3156', '3026', '3053'],
        boots: '3006',
        skillOrder: 'Q > W > E',
        playstyle: 'Melee carry. E para engage, Q3 knockup, R para teamfights.'
    },
    {
        championId: 157, // Yasuo
        name: 'Yasuo',
        role: 'middle',
        tier: 'A',
        winRate: 50.2,
        pickRate: 11.8,
        banRate: 14.5,
        primaryTree: 8000,
        secondaryTree: 8100,
        keystone: 8008,
        primaryRunes: [9111, 9105, 8014],
        secondaryRunes: [8143, 8135],
        statShards: [5005, 5008, 5002],
        spell1: 14,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['6672', '3031', '3072'], // Kraken, IE, Bloodthirster
        situationalItems: ['3156', '3026', '3053'],
        boots: '3006',
        skillOrder: 'Q > E > W',
        playstyle: 'Windwall para proyectiles. R con cualquier knockup aliado.'
    },
    {
        championId: 136, // Aurelion Sol
        name: 'Aurelion Sol',
        role: 'middle',
        tier: 'A',
        winRate: 51.2,
        pickRate: 4.5,
        banRate: 6.8,
        primaryTree: 8200,
        secondaryTree: 8300,
        keystone: 8229,
        primaryRunes: [8224, 8210, 8237],
        secondaryRunes: [8345, 8347],
        statShards: [5008, 5008, 5002],
        spell1: 12,
        spell2: 4,
        starterItems: ['1056'],
        coreItems: ['3116', '4645', '3089'], // Rylai's, Shadowflame, Deathcap
        situationalItems: ['3157', '3135', '3165'],
        boots: '3020',
        skillOrder: 'Q > W > E',
        playstyle: 'Scaling battlemage. Stackea estrellas. R para engage.'
    },
    {
        championId: 55, // Katarina
        name: 'Katarina',
        role: 'middle',
        tier: 'A',
        winRate: 50.5,
        pickRate: 7.2,
        banRate: 8.5,
        primaryTree: 8100,
        secondaryTree: 8000,
        keystone: 8112,
        primaryRunes: [8143, 8138, 8106],
        secondaryRunes: [9111, 8014],
        statShards: [5008, 5008, 5002],
        spell1: 14,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['3115', '3124', '3091'], // Nashor's, Rageblade, Wit's End
        situationalItems: ['3157', '3089', '3135'],
        boots: '3020',
        skillOrder: 'Q > E > W',
        playstyle: 'Reset assassin. Limpia teamfights con resets de E.'
    },
    {
        championId: 99, // Lux
        name: 'Lux',
        role: 'middle',
        tier: 'A',
        winRate: 51.8,
        pickRate: 5.5,
        banRate: 3.2,
        primaryTree: 8200,
        secondaryTree: 8300,
        keystone: 8229,
        primaryRunes: [8224, 8210, 8237],
        secondaryRunes: [8345, 8347],
        statShards: [5008, 5008, 5002],
        spell1: 12,
        spell2: 4,
        starterItems: ['1056'],
        coreItems: ['3118', '4645', '3089'],
        situationalItems: ['3157', '3135', '3165'],
        boots: '3020',
        skillOrder: 'E > Q > W',
        playstyle: 'Artillery mage. Bind con Q, burst con combo completo.'
    },
];

// ============================================================================
// ADC / BOTTOM LANE CHAMPIONS
// ============================================================================

export const ADC_CHAMPIONS: ChampionBuild[] = [
    {
        championId: 222, // Jinx
        name: 'Jinx',
        role: 'bottom',
        tier: 'S',
        winRate: 52.5,
        pickRate: 12.5,
        banRate: 6.8,
        primaryTree: 8000,
        secondaryTree: 8200,
        keystone: 8008, // Lethal Tempo
        primaryRunes: [9111, 9103, 8014],
        secondaryRunes: [8233, 8237],
        statShards: [5005, 5008, 5002],
        spell1: 7, // Heal
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['6672', '3031', '3094'], // Kraken, IE, RFC
        situationalItems: ['3036', '3072', '3026'],
        boots: '3006',
        skillOrder: 'Q > W > E',
        playstyle: 'Hypercarry. Gets excited con kills. R global para snipes.'
    },
    {
        championId: 51, // Caitlyn
        name: 'Caitlyn',
        role: 'bottom',
        tier: 'S',
        winRate: 51.8,
        pickRate: 10.5,
        banRate: 8.2,
        primaryTree: 8000,
        secondaryTree: 8100,
        keystone: 8021, // Fleet Footwork
        primaryRunes: [9111, 9103, 8014],
        secondaryRunes: [8139, 8135],
        statShards: [5008, 5008, 5002],
        spell1: 7,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['6676', '3031', '3094'], // Collector, IE, RFC
        situationalItems: ['3036', '3153', '3072'],
        boots: '3006',
        skillOrder: 'Q > W > E',
        playstyle: 'Lane bully con rango. Traps para zone. R para ejecutar.'
    },
    {
        championId: 145, // Kai'Sa
        name: "Kai'Sa",
        role: 'bottom',
        tier: 'A',
        winRate: 50.5,
        pickRate: 14.5,
        banRate: 8.5,
        primaryTree: 8000,
        secondaryTree: 8100,
        keystone: 8005, // PTA
        primaryRunes: [9111, 9103, 8014],
        secondaryRunes: [8143, 8135],
        statShards: [5005, 5008, 5002],
        spell1: 7,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['3124', '3302', '3091'], // Rageblade, Terminus, Wit's End
        situationalItems: ['3115', '3157', '3153'],
        boots: '3006',
        skillOrder: 'Q > E > W',
        playstyle: 'Evoluciona habilidades. R para reposicionarte.'
    },
    {
        championId: 81, // Ezreal
        name: 'Ezreal',
        role: 'bottom',
        tier: 'A',
        winRate: 48.5,
        pickRate: 18.5,
        banRate: 2.5,
        primaryTree: 8000,
        secondaryTree: 8300,
        keystone: 8010, // Conqueror
        primaryRunes: [9111, 9104, 8014],
        secondaryRunes: [8345, 8347],
        statShards: [5008, 5008, 5002],
        spell1: 7,
        spell2: 4,
        starterItems: ['3070'], // Tear
        coreItems: ['3078', '3042', '3508'], // Trinity, Muramana, ER
        situationalItems: ['3036', '3156', '3026'],
        boots: '3158',
        skillOrder: 'Q > E > W',
        playstyle: 'Poke con Q. Seguro con E. Ultimate global.'
    },
    {
        championId: 21, // Miss Fortune
        name: 'Miss Fortune',
        role: 'bottom',
        tier: 'S',
        winRate: 52.2,
        pickRate: 8.5,
        banRate: 4.2,
        primaryTree: 8000,
        secondaryTree: 8200,
        keystone: 8005,
        primaryRunes: [9111, 9103, 8014],
        secondaryRunes: [8233, 8237],
        statShards: [5008, 5008, 5002],
        spell1: 7,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['6676', '3031', '3036'], // Collector, IE, LDR
        situationalItems: ['3072', '3094', '3026'],
        boots: '3006',
        skillOrder: 'Q > W > E',
        playstyle: 'Lane bully. Ultimate devastador en teamfights.'
    },
    {
        championId: 67, // Vayne
        name: 'Vayne',
        role: 'bottom',
        tier: 'A',
        winRate: 51.5,
        pickRate: 9.2,
        banRate: 10.5,
        primaryTree: 8000,
        secondaryTree: 8200,
        keystone: 8008,
        primaryRunes: [9111, 9103, 8014],
        secondaryRunes: [8233, 8237],
        statShards: [5005, 5008, 5002],
        spell1: 7,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['6672', '3124', '3153'], // Kraken, Rageblade, BOTRK
        situationalItems: ['3091', '3026', '3156'],
        boots: '3006',
        skillOrder: 'Q > W > E',
        playstyle: 'Tank killer. True damage con W procs.'
    },
    {
        championId: 119, // Draven
        name: 'Draven',
        role: 'bottom',
        tier: 'A',
        winRate: 51.2,
        pickRate: 5.5,
        banRate: 6.8,
        primaryTree: 8000,
        secondaryTree: 8100,
        keystone: 8008,
        primaryRunes: [9111, 9103, 8014],
        secondaryRunes: [8126, 8135],
        statShards: [5008, 5008, 5002],
        spell1: 7,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['6698', '3072', '3031'], // Hubris, BT, IE
        situationalItems: ['3036', '3156', '3026'],
        boots: '3006',
        skillOrder: 'Q > W > E',
        playstyle: 'Snowball con kills. Mantén hachas para DPS.'
    },
    {
        championId: 202, // Jhin
        name: 'Jhin',
        role: 'bottom',
        tier: 'A',
        winRate: 51.0,
        pickRate: 11.5,
        banRate: 4.5,
        primaryTree: 8000,
        secondaryTree: 8200,
        keystone: 8021, // Fleet
        primaryRunes: [9111, 9103, 8014],
        secondaryRunes: [8233, 8237],
        statShards: [5008, 5008, 5002],
        spell1: 7,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['6676', '3094', '3031'], // Collector, RFC, IE
        situationalItems: ['3036', '3072', '3814'],
        boots: '3009', // Swiftness
        skillOrder: 'Q > W > E',
        playstyle: 'Cuarto disparo = mega crit. Ultimate para poke/finish.'
    },
    {
        championId: 236, // Lucian
        name: 'Lucian',
        role: 'bottom',
        tier: 'A',
        winRate: 50.5,
        pickRate: 8.8,
        banRate: 3.5,
        primaryTree: 8000,
        secondaryTree: 8100,
        keystone: 8005,
        primaryRunes: [9111, 9103, 8014],
        secondaryRunes: [8143, 8135],
        statShards: [5008, 5008, 5002],
        spell1: 7,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['6676', '3031', '3508'], // Collector, IE, ER
        situationalItems: ['3036', '3072', '3156'],
        boots: '3006',
        skillOrder: 'Q > E > W',
        playstyle: 'Burst ADC. Combo: AA-ability-AA para pasiva.'
    },
    {
        championId: 360, // Samira
        name: 'Samira',
        role: 'bottom',
        tier: 'A',
        winRate: 50.8,
        pickRate: 6.5,
        banRate: 5.2,
        primaryTree: 8000,
        secondaryTree: 8100,
        keystone: 8010,
        primaryRunes: [9111, 9103, 8014],
        secondaryRunes: [8143, 8135],
        statShards: [5008, 5008, 5002],
        spell1: 7,
        spell2: 4,
        starterItems: ['1055'],
        coreItems: ['6632', '3031', '3072'], // Shieldbow/Other, IE, BT
        situationalItems: ['3036', '3156', '3026'],
        boots: '3006',
        skillOrder: 'Q > E > W',
        playstyle: 'Melee when close. Stack style para R devastador.'
    },
];

// ============================================================================
// SUPPORT CHAMPIONS
// ============================================================================

export const SUPPORT_CHAMPIONS: ChampionBuild[] = [
    {
        championId: 412, // Thresh
        name: 'Thresh',
        role: 'utility',
        tier: 'A',
        winRate: 50.5,
        pickRate: 8.5,
        banRate: 4.2,
        primaryTree: 8400,
        secondaryTree: 8300,
        keystone: 8439, // Aftershock
        primaryRunes: [8401, 8429, 8453],
        secondaryRunes: [8345, 8347],
        statShards: [5002, 5002, 5001],
        spell1: 14, // Ignite
        spell2: 4,
        starterItems: ['3865'], // Support Item
        coreItems: ['3190', '3109', '3107'], // Locket, Knight's Vow, Redemption
        situationalItems: ['3050', '3001', '3222'],
        boots: '3117', // Mobility
        skillOrder: 'Q > E > W',
        playstyle: 'Hook engage. Lantern para salvar. Flay para peel.'
    },
    {
        championId: 111, // Nautilus
        name: 'Nautilus',
        role: 'utility',
        tier: 'S',
        winRate: 51.8,
        pickRate: 9.5,
        banRate: 12.5,
        primaryTree: 8400,
        secondaryTree: 8300,
        keystone: 8439,
        primaryRunes: [8401, 8429, 8453],
        secondaryRunes: [8345, 8347],
        statShards: [5002, 5002, 5001],
        spell1: 14,
        spell2: 4,
        starterItems: ['3865'],
        coreItems: ['3190', '3109', '3050'],
        situationalItems: ['3001', '3107', '3222'],
        boots: '3117',
        skillOrder: 'Q > E > W',
        playstyle: 'CC machine. Hook, Ult imparable, AA root.'
    },
    {
        championId: 117, // Lulu
        name: 'Lulu',
        role: 'utility',
        tier: 'S',
        winRate: 52.2,
        pickRate: 7.5,
        banRate: 8.5,
        primaryTree: 8200,
        secondaryTree: 8300,
        keystone: 8214, // Summon Aery
        primaryRunes: [8224, 8210, 8237],
        secondaryRunes: [8345, 8347],
        statShards: [5008, 5002, 5001],
        spell1: 14,
        spell2: 4,
        starterItems: ['3850'], // Spellthief's
        coreItems: ['6616', '3107', '3011'], // Staff of Flowing Water, Redemption, Chemtech
        situationalItems: ['3190', '3222', '3504'],
        boots: '3158',
        skillOrder: 'E > W > Q',
        playstyle: 'Enchanter. Polymorph key targets. R para salvar.'
    },
    {
        championId: 53, // Blitzcrank
        name: 'Blitzcrank',
        role: 'utility',
        tier: 'A',
        winRate: 51.5,
        pickRate: 6.8,
        banRate: 15.5,
        primaryTree: 8400,
        secondaryTree: 8300,
        keystone: 8439,
        primaryRunes: [8401, 8429, 8453],
        secondaryRunes: [8345, 8347],
        statShards: [5002, 5002, 5001],
        spell1: 14,
        spell2: 4,
        starterItems: ['3865'],
        coreItems: ['3190', '3109', '3050'],
        situationalItems: ['3001', '3075', '3222'],
        boots: '3117',
        skillOrder: 'Q > E > W',
        playstyle: 'Un hook = un kill. Presión psicológica.'
    },
    {
        championId: 89, // Leona
        name: 'Leona',
        role: 'utility',
        tier: 'S',
        winRate: 52.0,
        pickRate: 8.2,
        banRate: 6.8,
        primaryTree: 8400,
        secondaryTree: 8300,
        keystone: 8439,
        primaryRunes: [8401, 8429, 8453],
        secondaryRunes: [8345, 8347],
        statShards: [5002, 5002, 5001],
        spell1: 14,
        spell2: 4,
        starterItems: ['3865'],
        coreItems: ['3190', '3109', '3050'],
        situationalItems: ['3001', '3075', '3107'],
        boots: '3047',
        skillOrder: 'Q > W > E',
        playstyle: 'All-in engage. E-Q lockdown. R para teamfight.'
    },
    {
        championId: 350, // Yuumi
        name: 'Yuumi',
        role: 'utility',
        tier: 'B',
        winRate: 48.5,
        pickRate: 4.5,
        banRate: 8.2,
        primaryTree: 8200,
        secondaryTree: 8300,
        keystone: 8214,
        primaryRunes: [8224, 8210, 8237],
        secondaryRunes: [8345, 8347],
        statShards: [5008, 5002, 5001],
        spell1: 3, // Exhaust
        spell2: 4,
        starterItems: ['3850'],
        coreItems: ['3011', '6616', '3107'],
        situationalItems: ['3222', '3504', '3190'],
        boots: '0', // No boots needed
        skillOrder: 'E > Q > W',
        playstyle: 'Attach y heal. Detach solo para pasiva.'
    },
    {
        championId: 16, // Soraka
        name: 'Soraka',
        role: 'utility',
        tier: 'A',
        winRate: 51.8,
        pickRate: 5.5,
        banRate: 4.5,
        primaryTree: 8200,
        secondaryTree: 8300,
        keystone: 8214,
        primaryRunes: [8224, 8210, 8237],
        secondaryRunes: [8345, 8347],
        statShards: [5008, 5002, 5001],
        spell1: 3,
        spell2: 4,
        starterItems: ['3850'],
        coreItems: ['4644', '3107', '3011'], // Dawncore, Redemption, Chemtech
        situationalItems: ['3222', '3190', '6616'],
        boots: '3158',
        skillOrder: 'W > Q > E',
        playstyle: 'Healer principal. Q para sustain propio. R global.'
    },
    {
        championId: 63, // Brand
        name: 'Brand',
        role: 'utility',
        tier: 'A',
        winRate: 51.5,
        pickRate: 5.2,
        banRate: 5.8,
        primaryTree: 8200,
        secondaryTree: 8100,
        keystone: 8229, // Comet
        primaryRunes: [8224, 8210, 8237],
        secondaryRunes: [8143, 8135],
        statShards: [5008, 5008, 5002],
        spell1: 14,
        spell2: 4,
        starterItems: ['3850'],
        coreItems: ['3118', '4637', '4645'], // Malignance, Liandry's, Shadowflame
        situationalItems: ['3135', '3089', '3165'],
        boots: '3020',
        skillOrder: 'W > E > Q',
        playstyle: 'Damage support. R bounces = teamfight winner.'
    },
    {
        championId: 526, // Rell
        name: 'Rell',
        role: 'utility',
        tier: 'A',
        winRate: 51.2,
        pickRate: 4.5,
        banRate: 2.5,
        primaryTree: 8400,
        secondaryTree: 8000,
        keystone: 8439,
        primaryRunes: [8401, 8429, 8453],
        secondaryRunes: [9111, 9105],
        statShards: [5002, 5002, 5001],
        spell1: 14,
        spell2: 4,
        starterItems: ['3865'],
        coreItems: ['3190', '3109', '3050'],
        situationalItems: ['3001', '3075', '3107'],
        boots: '3047',
        skillOrder: 'W > E > Q',
        playstyle: 'Engage tank. W para crashear. R magnetiza.'
    },
    {
        championId: 497, // Rakan
        name: 'Rakan',
        role: 'utility',
        tier: 'S',
        winRate: 52.5,
        pickRate: 7.2,
        banRate: 5.8,
        primaryTree: 8400,
        secondaryTree: 8200,
        keystone: 8465, // Guardian
        primaryRunes: [8401, 8429, 8453],
        secondaryRunes: [8224, 8237],
        statShards: [5002, 5002, 5001],
        spell1: 14,
        spell2: 4,
        starterItems: ['3865'],
        coreItems: ['3190', '4401', '3107'], // Locket, Force of Nature, Redemption
        situationalItems: ['3109', '3222', '3050'],
        boots: '3117',
        skillOrder: 'W > E > Q',
        playstyle: 'Engage con R+W. Dash a aliados con E.'
    },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getChampionsByRole(role: string): ChampionBuild[] {
    switch (role.toLowerCase()) {
        case 'top': return TOP_CHAMPIONS;
        case 'jungle': return JUNGLE_CHAMPIONS;
        case 'middle':
        case 'mid': return MID_CHAMPIONS;
        case 'bottom':
        case 'adc': return ADC_CHAMPIONS;
        case 'utility':
        case 'support': return SUPPORT_CHAMPIONS;
        default: return [];
    }
}

export function getChampionBuild(championId: number, role?: string): ChampionBuild | undefined {
    const allChampions = [
        ...TOP_CHAMPIONS,
        ...JUNGLE_CHAMPIONS,
        ...MID_CHAMPIONS,
        ...ADC_CHAMPIONS,
        ...SUPPORT_CHAMPIONS,
    ];

    if (role) {
        const roleChampions = getChampionsByRole(role);
        return roleChampions.find(c => c.championId === championId);
    }

    return allChampions.find(c => c.championId === championId);
}

export function getTierColor(tier: string): string {
    switch (tier) {
        case 'S': return '#ffd700';
        case 'A': return '#22c55e';
        case 'B': return '#3b82f6';
        case 'C': return '#9ca3af';
        default: return '#6b7280';
    }
}

export function getRoleIcon(role: string): string {
    switch (role.toLowerCase()) {
        case 'top': return '🗡️';
        case 'jungle': return '🌲';
        case 'middle':
        case 'mid': return '⚡';
        case 'bottom':
        case 'adc': return '🏹';
        case 'utility':
        case 'support': return '🛡️';
        default: return '❓';
    }
}

export function getRoleName(role: string): string {
    switch (role.toLowerCase()) {
        case 'top': return 'Top Lane';
        case 'jungle': return 'Jungla';
        case 'middle':
        case 'mid': return 'Mid Lane';
        case 'bottom':
        case 'adc': return 'ADC';
        case 'utility':
        case 'support': return 'Support';
        default: return role;
    }
}
