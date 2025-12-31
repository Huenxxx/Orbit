using System.Collections.Generic;
using System.Linq;

namespace Orbit.Core.Services;

/// <summary>
/// Service containing champion build data (Runes, Spells, Items) based on meta stats.
/// Data sourced from U.GG, OP.GG for Season 14/15.
/// </summary>
public class ChampionBuildsService
{
    private static readonly Dictionary<int, ChampionBuild> _builds = new();
    
    static ChampionBuildsService()
    {
        InitializeBuilds();
    }

    /// <summary>
    /// Get build for a specific champion and role
    /// </summary>
    public static ChampionBuild? GetBuild(int championId, string role)
    {
        var normalizedRole = NormalizeRole(role);
        
        // First try exact champion match
        if (_builds.TryGetValue(championId, out var build) && build.Role == normalizedRole)
        {
            return build;
        }
        
        // Try finding champion in any role
        var championBuild = _builds.Values.FirstOrDefault(b => b.ChampionId == championId);
        if (championBuild != null) return championBuild;
        
        // Return a default build based on role
        return GetDefaultBuildForRole(normalizedRole);
    }

    /// <summary>
    /// Get all builds for a specific role
    /// </summary>
    public static List<ChampionBuild> GetBuildsForRole(string role)
    {
        var normalizedRole = NormalizeRole(role);
        return _builds.Values.Where(b => b.Role == normalizedRole)
                             .OrderByDescending(b => b.WinRate)
                             .ToList();
    }

    /// <summary>
    /// Get all builds
    /// </summary>
    public static List<ChampionBuild> GetAllBuilds() => _builds.Values.ToList();

    private static string NormalizeRole(string role)
    {
        return role?.ToLower() switch
        {
            "adc" => "bottom",
            "support" => "utility",
            "mid" => "middle",
            "top" => "top",
            "jungle" => "jungle",
            "bottom" => "bottom",
            "utility" => "utility",
            "middle" => "middle",
            _ => "middle" // Default
        };
    }

    private static ChampionBuild? GetDefaultBuildForRole(string role)
    {
        return _builds.Values.FirstOrDefault(b => b.Role == role);
    }

    private static void InitializeBuilds()
    {
        // ============================================
        // TOP LANE CHAMPIONS
        // ============================================
        
        AddBuild(new ChampionBuild
        {
            ChampionId = 266, Name = "Aatrox", Role = "top", Tier = "S",
            WinRate = 51.5, PickRate = 8.2, BanRate = 12.1,
            PrimaryTree = 8000, SecondaryTree = 8400, Keystone = 8010, // Conqueror
            PrimaryRunes = new[] { 9111, 9104, 8014 },
            SecondaryRunes = new[] { 8444, 8451 },
            StatShards = new[] { 5008, 5008, 5002 },
            Spell1 = 12, Spell2 = 4, // TP + Flash
            StarterItems = new[] { "1055" }, // Doran's Blade
            CoreItems = new[] { "6694", "6610", "3071" }, // Serylda's, Sundered, Cleaver
            SituationalItems = new[] { "3053", "3156", "6333" },
            Boots = "3111",
            SkillOrder = "Q > E > W",
            Playstyle = "Agresivo en trades cortos. Busca pokes con Q y all-in con R."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 24, Name = "Jax", Role = "top", Tier = "S",
            WinRate = 52.3, PickRate = 7.8, BanRate = 8.5,
            PrimaryTree = 8000, SecondaryTree = 8400, Keystone = 8010,
            PrimaryRunes = new[] { 9111, 9105, 8014 },
            SecondaryRunes = new[] { 8444, 8453 },
            StatShards = new[] { 5005, 5008, 5002 },
            Spell1 = 12, Spell2 = 4,
            StarterItems = new[] { "1055" },
            CoreItems = new[] { "3078", "3074", "6610" }, // Trinity, Ravenous, Sundered
            SituationalItems = new[] { "3053", "3193", "3026" },
            Boots = "3111",
            SkillOrder = "E > Q > W",
            Playstyle = "Escalar y splitpush. Usa E para counter ataques básicos."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 122, Name = "Darius", Role = "top", Tier = "S",
            WinRate = 51.8, PickRate = 6.5, BanRate = 15.2,
            PrimaryTree = 8000, SecondaryTree = 8400, Keystone = 8010,
            PrimaryRunes = new[] { 9111, 9105, 8299 },
            SecondaryRunes = new[] { 8444, 8451 },
            StatShards = new[] { 5005, 5008, 5002 },
            Spell1 = 6, Spell2 = 4, // Ghost + Flash
            StarterItems = new[] { "1054" }, // Doran's Shield
            CoreItems = new[] { "3078", "3053", "6333" }, // Trinity, Sterak's, Death's Dance
            SituationalItems = new[] { "3071", "3026", "3065" },
            Boots = "3111",
            SkillOrder = "Q > E > W",
            Playstyle = "Lane bully. Stackea pasiva y ejecuta con R."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 86, Name = "Garen", Role = "top", Tier = "A",
            WinRate = 52.0, PickRate = 5.8, BanRate = 4.2,
            PrimaryTree = 8000, SecondaryTree = 8400, Keystone = 8010,
            PrimaryRunes = new[] { 9111, 9105, 8299 },
            SecondaryRunes = new[] { 8444, 8453 },
            StatShards = new[] { 5005, 5008, 5002 },
            Spell1 = 14, Spell2 = 4, // Ignite + Flash
            StarterItems = new[] { "1054" },
            CoreItems = new[] { "6631", "3053", "6333" }, // Stridebreaker, Sterak's, DD
            SituationalItems = new[] { "3742", "3065", "3026" },
            Boots = "3111",
            SkillOrder = "Q > E > W",
            Playstyle = "Simple pero efectivo. Silencia con Q, spinnea y ejecuta con R."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 516, Name = "Ornn", Role = "top", Tier = "S",
            WinRate = 52.1, PickRate = 4.2, BanRate = 3.8,
            PrimaryTree = 8400, SecondaryTree = 8300, Keystone = 8437, // Grasp
            PrimaryRunes = new[] { 8401, 8429, 8451 },
            SecondaryRunes = new[] { 8345, 8347 },
            StatShards = new[] { 5002, 5002, 5001 },
            Spell1 = 12, Spell2 = 4,
            StarterItems = new[] { "1054" },
            CoreItems = new[] { "6667", "3068", "3075" }, // Unending, Sunfire, Thornmail
            SituationalItems = new[] { "3065", "3110", "3742" },
            Boots = "3047",
            SkillOrder = "Q > W > E",
            Playstyle = "Tank de teamfight. Mejora items aliados. R para engages."
        });

        // ============================================
        // JUNGLE CHAMPIONS
        // ============================================

        AddBuild(new ChampionBuild
        {
            ChampionId = 64, Name = "Lee Sin", Role = "jungle", Tier = "A",
            WinRate = 49.5, PickRate = 9.2, BanRate = 8.5,
            PrimaryTree = 8100, SecondaryTree = 8000, Keystone = 8112, // Electrocute
            PrimaryRunes = new[] { 8143, 8138, 8106 },
            SecondaryRunes = new[] { 9111, 9105 },
            StatShards = new[] { 5008, 5008, 5002 },
            Spell1 = 11, Spell2 = 4, // Smite + Flash
            StarterItems = new[] { "1103" }, // Scorchclaw
            CoreItems = new[] { "6692", "6610", "3071" }, // Eclipse, Sundered, Cleaver
            SituationalItems = new[] { "3156", "6333", "3026" },
            Boots = "3047",
            SkillOrder = "Q > W > E",
            Playstyle = "Early ganker. Insecing con R es clave para teamfights."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 254, Name = "Vi", Role = "jungle", Tier = "S",
            WinRate = 52.8, PickRate = 6.5, BanRate = 5.2,
            PrimaryTree = 8000, SecondaryTree = 8100, Keystone = 8010,
            PrimaryRunes = new[] { 9111, 9105, 8014 },
            SecondaryRunes = new[] { 8139, 8135 },
            StatShards = new[] { 5005, 5008, 5002 },
            Spell1 = 11, Spell2 = 4,
            StarterItems = new[] { "1103" },
            CoreItems = new[] { "3078", "6333", "3053" }, // Trinity, DD, Sterak's
            SituationalItems = new[] { "3193", "3026", "3156" },
            Boots = "3047",
            SkillOrder = "Q > E > W",
            Playstyle = "Engage y lockdown. Q-Flash para sorprender. R imparable."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 121, Name = "Kha'Zix", Role = "jungle", Tier = "S",
            WinRate = 52.5, PickRate = 8.8, BanRate = 12.5,
            PrimaryTree = 8100, SecondaryTree = 8000, Keystone = 8112,
            PrimaryRunes = new[] { 8143, 8138, 8106 },
            SecondaryRunes = new[] { 9111, 9105 },
            StatShards = new[] { 5008, 5008, 5002 },
            Spell1 = 11, Spell2 = 4,
            StarterItems = new[] { "1102" }, // Mosstomper
            CoreItems = new[] { "6692", "6701", "3156" }, // Eclipse, Opportunity, Maw
            SituationalItems = new[] { "6609", "3814", "6676" },
            Boots = "3158", // Ionian
            SkillOrder = "Q > W > E",
            Playstyle = "Assassin. Busca targets aislados. Evolve Q>E>R/W."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 104, Name = "Graves", Role = "jungle", Tier = "S",
            WinRate = 51.8, PickRate = 7.2, BanRate = 6.8,
            PrimaryTree = 8100, SecondaryTree = 8000, Keystone = 8128, // Dark Harvest
            PrimaryRunes = new[] { 8143, 8138, 8106 },
            SecondaryRunes = new[] { 9111, 9105 },
            StatShards = new[] { 5008, 5008, 5002 },
            Spell1 = 11, Spell2 = 4,
            StarterItems = new[] { "1102" },
            CoreItems = new[] { "6676", "6696", "3031" }, // Collector, Axiom, IE
            SituationalItems = new[] { "3036", "3156", "3072" },
            Boots = "3006", // Berserker's
            SkillOrder = "Q > E > W",
            Playstyle = "Farm pesado. Kiting con E. Burst con autos + Q."
        });

        // ============================================
        // MID LANE CHAMPIONS
        // ============================================

        AddBuild(new ChampionBuild
        {
            ChampionId = 103, Name = "Ahri", Role = "middle", Tier = "S",
            WinRate = 52.5, PickRate = 9.5, BanRate = 6.2,
            PrimaryTree = 8100, SecondaryTree = 8200, Keystone = 8112,
            PrimaryRunes = new[] { 8143, 8138, 8106 },
            SecondaryRunes = new[] { 8224, 8237 },
            StatShards = new[] { 5008, 5008, 5002 },
            Spell1 = 14, Spell2 = 4, // Ignite + Flash
            StarterItems = new[] { "1056" }, // Doran's Ring
            CoreItems = new[] { "3118", "3165", "4645" }, // Malignance, Morello, Shadowflame
            SituationalItems = new[] { "3157", "3089", "3135" },
            Boots = "3020", // Sorc
            SkillOrder = "Q > W > E",
            Playstyle = "Mage versátil. Charm para picks, R para movilidad."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 112, Name = "Viktor", Role = "middle", Tier = "S",
            WinRate = 51.8, PickRate = 6.2, BanRate = 4.5,
            PrimaryTree = 8200, SecondaryTree = 8300, Keystone = 8229, // Comet
            PrimaryRunes = new[] { 8224, 8210, 8237 },
            SecondaryRunes = new[] { 8345, 8347 },
            StatShards = new[] { 5008, 5008, 5002 },
            Spell1 = 12, Spell2 = 4, // TP + Flash
            StarterItems = new[] { "1056" },
            CoreItems = new[] { "3100", "3089", "3135" }, // Lich Bane, Deathcap, Void
            SituationalItems = new[] { "3157", "4645", "3165" },
            Boots = "3020",
            SkillOrder = "E > Q > W",
            Playstyle = "Scaling mage. Upgrade E primero. Zonea con W y R."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 238, Name = "Zed", Role = "middle", Tier = "A",
            WinRate = 50.5, PickRate = 9.8, BanRate = 15.5,
            PrimaryTree = 8100, SecondaryTree = 8000, Keystone = 8112,
            PrimaryRunes = new[] { 8143, 8138, 8106 },
            SecondaryRunes = new[] { 9111, 8014 },
            StatShards = new[] { 5008, 5008, 5002 },
            Spell1 = 14, Spell2 = 4,
            StarterItems = new[] { "1055" },
            CoreItems = new[] { "6692", "6701", "3814" }, // Eclipse, Opportunity, Edge
            SituationalItems = new[] { "6676", "3156", "3142" },
            Boots = "3158",
            SkillOrder = "Q > W > E",
            Playstyle = "AD assassin. R para ulti, vuelve con R para escapar."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 134, Name = "Syndra", Role = "middle", Tier = "S",
            WinRate = 51.5, PickRate = 6.8, BanRate = 5.2,
            PrimaryTree = 8100, SecondaryTree = 8200, Keystone = 8112,
            PrimaryRunes = new[] { 8143, 8138, 8106 },
            SecondaryRunes = new[] { 8224, 8237 },
            StatShards = new[] { 5008, 5008, 5002 },
            Spell1 = 12, Spell2 = 4,
            StarterItems = new[] { "1056" },
            CoreItems = new[] { "3118", "4645", "3089" },
            SituationalItems = new[] { "3157", "3135", "3165" },
            Boots = "3020",
            SkillOrder = "Q > W > E",
            Playstyle = "Burst mage. Stun con E, ejecuta con R multi-esferas."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 777, Name = "Yone", Role = "middle", Tier = "A",
            WinRate = 50.8, PickRate = 12.5, BanRate = 18.2,
            PrimaryTree = 8000, SecondaryTree = 8100, Keystone = 8008, // Lethal Tempo
            PrimaryRunes = new[] { 9111, 9105, 8014 },
            SecondaryRunes = new[] { 8143, 8135 },
            StatShards = new[] { 5005, 5008, 5002 },
            Spell1 = 14, Spell2 = 4,
            StarterItems = new[] { "1055" },
            CoreItems = new[] { "6672", "3031", "3046" }, // Kraken, IE, PD
            SituationalItems = new[] { "3156", "3026", "3053" },
            Boots = "3006",
            SkillOrder = "Q > W > E",
            Playstyle = "Melee carry. E para engage, Q3 knockup, R para teamfights."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 157, Name = "Yasuo", Role = "middle", Tier = "A",
            WinRate = 50.2, PickRate = 11.8, BanRate = 14.5,
            PrimaryTree = 8000, SecondaryTree = 8100, Keystone = 8008,
            PrimaryRunes = new[] { 9111, 9105, 8014 },
            SecondaryRunes = new[] { 8143, 8135 },
            StatShards = new[] { 5005, 5008, 5002 },
            Spell1 = 14, Spell2 = 4,
            StarterItems = new[] { "1055" },
            CoreItems = new[] { "6672", "3031", "3072" }, // Kraken, IE, BT
            SituationalItems = new[] { "3156", "3026", "3053" },
            Boots = "3006",
            SkillOrder = "Q > E > W",
            Playstyle = "Windwall para proyectiles. R con cualquier knockup aliado."
        });

        // ============================================
        // ADC / BOTTOM LANE CHAMPIONS
        // ============================================

        AddBuild(new ChampionBuild
        {
            ChampionId = 222, Name = "Jinx", Role = "bottom", Tier = "S",
            WinRate = 52.5, PickRate = 12.5, BanRate = 8.2,
            PrimaryTree = 8000, SecondaryTree = 8200, Keystone = 8008,
            PrimaryRunes = new[] { 9111, 9104, 8014 },
            SecondaryRunes = new[] { 8224, 8237 },
            StatShards = new[] { 5005, 5008, 5002 },
            Spell1 = 7, Spell2 = 4, // Heal + Flash
            StarterItems = new[] { "1055" },
            CoreItems = new[] { "6672", "3031", "3094" }, // Kraken, IE, RFC
            SituationalItems = new[] { "3036", "3072", "3156" },
            Boots = "3006",
            SkillOrder = "Q > W > E",
            Playstyle = "Hypercarry. Rocket para teamfights, minigun para DPS."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 51, Name = "Caitlyn", Role = "bottom", Tier = "S",
            WinRate = 52.0, PickRate = 15.5, BanRate = 9.8,
            PrimaryTree = 8100, SecondaryTree = 8200, Keystone = 8128, // Dark Harvest
            PrimaryRunes = new[] { 8139, 8138, 8106 },
            SecondaryRunes = new[] { 8224, 8237 },
            StatShards = new[] { 5008, 5008, 5002 },
            Spell1 = 7, Spell2 = 4,
            StarterItems = new[] { "1055" },
            CoreItems = new[] { "6676", "3031", "3094" }, // Collector, IE, RFC
            SituationalItems = new[] { "3036", "3072", "3156" },
            Boots = "3006",
            SkillOrder = "Q > W > E",
            Playstyle = "Lane bully. Usa W+Q combo. Headshots son clave."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 145, Name = "Kai'Sa", Role = "bottom", Tier = "S",
            WinRate = 51.8, PickRate = 14.2, BanRate = 7.5,
            PrimaryTree = 8000, SecondaryTree = 8100, Keystone = 8021, // Navori
            PrimaryRunes = new[] { 9111, 9104, 8014 },
            SecondaryRunes = new[] { 8143, 8135 },
            StatShards = new[] { 5005, 5008, 5002 },
            Spell1 = 7, Spell2 = 4,
            StarterItems = new[] { "1055" },
            CoreItems = new[] { "3124", "3115", "3091" }, // Rageblade, Nashor, Wit
            SituationalItems = new[] { "3031", "3072", "3157" },
            Boots = "3006",
            SkillOrder = "Q > E > W",
            Playstyle = "Híbrida AP/AD. Evolve Q y E primero. R para reposition."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 81, Name = "Ezreal", Role = "bottom", Tier = "A",
            WinRate = 50.5, PickRate = 20.5, BanRate = 3.2,
            PrimaryTree = 8300, SecondaryTree = 8200, Keystone = 8369, // First Strike
            PrimaryRunes = new[] { 8345, 8313, 8352 },
            SecondaryRunes = new[] { 8224, 8237 },
            StatShards = new[] { 5008, 5008, 5002 },
            Spell1 = 7, Spell2 = 4,
            StarterItems = new[] { "3070" }, // Tear
            CoreItems = new[] { "6672", "3004", "3078" }, // Kraken, Manamune, Trinity
            SituationalItems = new[] { "3036", "3156", "3139" },
            Boots = "3158",
            SkillOrder = "Q > E > W",
            Playstyle = "Poke ADC. Kiting con E. Stacks Manamune con Q."
        });

        // ============================================
        // SUPPORT CHAMPIONS
        // ============================================

        AddBuild(new ChampionBuild
        {
            ChampionId = 412, Name = "Thresh", Role = "utility", Tier = "S",
            WinRate = 51.5, PickRate = 9.8, BanRate = 6.5,
            PrimaryTree = 8400, SecondaryTree = 8300, Keystone = 8439, // Aftershock
            PrimaryRunes = new[] { 8401, 8429, 8451 },
            SecondaryRunes = new[] { 8345, 8347 },
            StatShards = new[] { 5002, 5002, 5001 },
            Spell1 = 14, Spell2 = 4, // Ignite + Flash
            StarterItems = new[] { "3862" }, // Steel Shoulderguards
            CoreItems = new[] { "3866", "3190", "3107" }, // Zeke's, Locket, Redemption
            SituationalItems = new[] { "3110", "4401", "3222" },
            Boots = "3047",
            SkillOrder = "E > Q > W",
            Playstyle = "Engage support. Hook para picks, Lantern para saves."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 111, Name = "Nautilus", Role = "utility", Tier = "S",
            WinRate = 52.2, PickRate = 8.5, BanRate = 10.2,
            PrimaryTree = 8400, SecondaryTree = 8300, Keystone = 8439,
            PrimaryRunes = new[] { 8401, 8429, 8451 },
            SecondaryRunes = new[] { 8345, 8347 },
            StatShards = new[] { 5002, 5002, 5001 },
            Spell1 = 14, Spell2 = 4,
            StarterItems = new[] { "3862" },
            CoreItems = new[] { "3866", "3190", "3075" },
            SituationalItems = new[] { "3110", "3065", "4401" },
            Boots = "3047",
            SkillOrder = "E > Q > W",
            Playstyle = "Tank engage. Hook, Root pasiva, R para lockdown."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 117, Name = "Lulu", Role = "utility", Tier = "S",
            WinRate = 52.8, PickRate = 7.2, BanRate = 5.8,
            PrimaryTree = 8200, SecondaryTree = 8300, Keystone = 8214, // Aery
            PrimaryRunes = new[] { 8224, 8210, 8237 },
            SecondaryRunes = new[] { 8345, 8347 },
            StatShards = new[] { 5008, 5008, 5002 },
            Spell1 = 14, Spell2 = 4,
            StarterItems = new[] { "3850" }, // Spellthief
            CoreItems = new[] { "3853", "3504", "3011" }, // Shard, Ardent, Chemtech
            SituationalItems = new[] { "3107", "3222", "3157" },
            Boots = "3158",
            SkillOrder = "E > W > Q",
            Playstyle = "Enchanter. Buffea ADC, polymorph amenazas, R para peel."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 89, Name = "Leona", Role = "utility", Tier = "A",
            WinRate = 51.0, PickRate = 6.8, BanRate = 4.5,
            PrimaryTree = 8400, SecondaryTree = 8300, Keystone = 8439,
            PrimaryRunes = new[] { 8401, 8429, 8451 },
            SecondaryRunes = new[] { 8345, 8347 },
            StatShards = new[] { 5002, 5002, 5001 },
            Spell1 = 14, Spell2 = 4,
            StarterItems = new[] { "3862" },
            CoreItems = new[] { "3866", "3190", "3075" },
            SituationalItems = new[] { "3110", "3065", "4401" },
            Boots = "3047",
            SkillOrder = "Q > W > E",
            Playstyle = "All-in tank. E+Q para engage, W para resistencias, R zoning."
        });

        AddBuild(new ChampionBuild
        {
            ChampionId = 63, Name = "Brand", Role = "utility", Tier = "A",
            WinRate = 51.5, PickRate = 5.2, BanRate = 6.8,
            PrimaryTree = 8100, SecondaryTree = 8200, Keystone = 8128, // Dark Harvest
            PrimaryRunes = new[] { 8143, 8138, 8106 },
            SecondaryRunes = new[] { 8224, 8237 },
            StatShards = new[] { 5008, 5008, 5002 },
            Spell1 = 14, Spell2 = 4,
            StarterItems = new[] { "3850" },
            CoreItems = new[] { "3118", "4637", "3116" }, // Malignance, Demonic, Rylai
            SituationalItems = new[] { "3165", "3089", "3157" },
            Boots = "3020",
            SkillOrder = "W > E > Q",
            Playstyle = "Mage support. Poke con W, stun con Q, R en teamfights."
        });
    }

    private static void AddBuild(ChampionBuild build)
    {
        _builds[build.ChampionId] = build;
    }
}

/// <summary>
/// Champion Build Data Model
/// </summary>
public class ChampionBuild
{
    public int ChampionId { get; set; }
    public string Name { get; set; } = "";
    public string Role { get; set; } = "";
    public string Tier { get; set; } = "A";
    public double WinRate { get; set; }
    public double PickRate { get; set; }
    public double BanRate { get; set; }
    
    // Runes
    public int PrimaryTree { get; set; }
    public int SecondaryTree { get; set; }
    public int Keystone { get; set; }
    public int[] PrimaryRunes { get; set; } = Array.Empty<int>();
    public int[] SecondaryRunes { get; set; } = Array.Empty<int>();
    public int[] StatShards { get; set; } = Array.Empty<int>();
    
    // Summoner Spells
    public int Spell1 { get; set; }
    public int Spell2 { get; set; }
    
    // Items
    public string[] StarterItems { get; set; } = Array.Empty<string>();
    public string[] CoreItems { get; set; } = Array.Empty<string>();
    public string[] SituationalItems { get; set; } = Array.Empty<string>();
    public string Boots { get; set; } = "";
    
    // Meta
    public string SkillOrder { get; set; } = "";
    public string Playstyle { get; set; } = "";

    /// <summary>
    /// Get all perk IDs in order for the LCU API
    /// </summary>
    public List<int> GetAllPerkIds()
    {
        var perks = new List<int> { Keystone };
        perks.AddRange(PrimaryRunes);
        perks.AddRange(SecondaryRunes);
        perks.AddRange(StatShards);
        return perks;
    }

    /// <summary>
    /// Create an Item Set object for LCU API
    /// </summary>
    public object ToItemSetObject()
    {
        return new
        {
            title = $"Orbit: {Name}",
            blocks = new[]
            {
                new {
                    type = "Starter",
                    items = StarterItems.Select(id => new { id, count = 1 }).ToArray()
                },
                new {
                    type = "Core Build",
                    items = CoreItems.Select(id => new { id, count = 1 }).ToArray()
                },
                new {
                    type = "Situacional",
                    items = SituationalItems.Select(id => new { id, count = 1 }).ToArray()
                },
                new {
                    type = "Botas",
                    items = new[] { new { id = Boots, count = 1 } }
                }
            }
        };
    }
}
