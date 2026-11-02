/*
 * Runs inside Strange Eons via `--run` (see the generateFixtures task).
 * Creates one .eon file per card handler and variant in fx.out, named
 * <Handler>/<variant>.eon. Existing files are kept unless fx.overwrite is
 * true. Writes one line per fixture to fx.results, then DONE.
 *
 * ES5 only: this runs on Strange Rhino.
 */
importClass(java.io.File);
importClass(java.io.PrintWriter);
importClass(java.io.OutputStreamWriter);
importClass(java.io.FileOutputStream);
importClass(Packages.ca.cgjennings.apps.arkham.diy.DIY);

function prop(k) {
    var v = java.lang.System.getProperty(k);
    return v == null ? "" : String(v);
}

var outDir = new File(prop("fx.out"));
var overwrite = prop("fx.overwrite") === "true";
var results = new PrintWriter(new OutputStreamWriter(new FileOutputStream(prop("fx.results")), "UTF-8"));

function record(status, name, detail) {
    results.println(status + "\t" + name + "\t" + String(detail).replace(/[\t\r\n]+/g, " "));
    results.flush();
}

// Monster art in the top right of the image; everything else is cropped.
var ART = "res://ArkhamHorrorLCG/default-portraits/Spawn_of_the_Stars_by_Sofyan_Syarief.jpg";
var ART_W = 1169, ART_H = 827;
var MONSTER = { x: 690, y: 30, w: 470, h: 560 };

function placeArt(portrait) {
    portrait.setSource(ART);
    var clip = portrait.getClipDimensions();
    var scale = Math.max(clip.width / MONSTER.w, clip.height / MONSTER.h);
    // keep the visible window inside the monster's bounds
    var halfW = clip.width / scale / 2, halfH = clip.height / scale / 2;
    var cx = Math.min(Math.max(MONSTER.x + MONSTER.w / 2, MONSTER.x + halfW), MONSTER.x + MONSTER.w - halfW);
    var cy = Math.min(Math.max(MONSTER.y + MONSTER.h / 2, MONSTER.y + halfH), MONSTER.y + MONSTER.h - halfH);
    portrait.setScale(scale);
    portrait.setPanX((ART_W / 2 - cx) * scale);
    portrait.setPanY((ART_H / 2 - cy) * scale);
}

function isArtPortrait(portrait) {
    var key = portrait.getBaseKey ? String(portrait.getBaseKey()) : "";
    return /-(Back|Transparent)?Portrait$/.test(key);
}

var RULES = "<rea> After this card enters play: Each investigator takes 1 <hor>.\n"
    + "<act>: Test <wil> (3). If you succeed, place 1 <dmg> on it.";

// Sample data for every face, keyed without the face suffix. Only keys a
// handler defines are set, so each handler picks up the fields it uses.
var FIELDS = {
    // title
    Unique: "1", Subtitle: "Herald of the Deep",
    // enemy
    Health: "5", PerInvestigator: "1",
    Attack: "4", PerInvestigatorAttack: "1",
    Evade: "-", PerInvestigatorEvade: "0",
    Damage: "2", Horror: "1",
    // player cards
    ResourceCost: "3", Level: "2",
    Skill1: "Willpower", Skill2: "Combat", Skill3: "Wild",
    Slot: "Ally", Stamina: "2", Sanity: "3", PerInvestigatorSanity: "1",
    // investigator
    Willpower: "4", Intellect: "3", Combat: "2", Agility: "1",
    InvStory: "She heard the call from beneath the waves.",
    Text1: "30.", Text2: "Seeker or Mystic cards level 0-1.",
    Text3: "Guardian cards level 0-5.",
    // location
    Shroud: "3", Clues: "2", LocationIcon: "Circle",
    Connection1Icon: "Square", Connection2Icon: "Triangle",
    // act / agenda
    ScenarioIndex: "2", ScenarioDeckID: "b", Doom: "6",
    AgendaStory: "The sky splits open above the harbor.",
    ActStory: "You reach the drowned temple.",
    // story
    TraitsA: "Interlude.", HeaderA: "Part I", AccentedStoryA: "The water churns.",
    RulesA: RULES, HeaderB: "Part II", AccentedStoryB: "Something rises.",
    RulesB: "Each investigator draws 1 card.",
    Story: "The water churns.", Header: "Setup",
    // chaos / scenario reference
    Skull: "-1 for each enemy in play.", Cultist: "-2. Take 1 horror.",
    Tablet: "-3. Take 1 damage.", ElderThing: "-4. Discard a card.",
    // customizable
    CustHeader: "Customizable",
    CustName1: "Heirloom", CustText1: "Reduce its cost by 1.",
    CustName2: "Inscribed", CustText2: "It gains <act>: Draw 1 card.",
    // body text
    Traits: "Monster. Elite.", Keywords: "Hunter. Retaliate.",
    Rules: RULES, Flavor: "The stars were right.", Victory: "Victory 1."
};

// Per face type adjustments to FIELDS.
var OVERRIDES = {
    asset: { CardClass: "Guardian" },
    event: { CardClass: "Guardian" },
    skill: { CardClass: "Guardian" },
    customizable: { CardClass: "Guardian" },
    investigator: { CardClass: "Guardian", Stamina: "8", Sanity: "6" },
    miniInvestigator: { CardClass: "Guardian" },
    storyAsset: { CardClass: "Neutral" }
};

// Extra variants per face type, applied to every face of that type.
var PLAYER_VARIANTS = {
    dual: { CardClass: "Seeker", CardClass2: "Mystic" },
    weakness: { CardClass: "Weakness", Level: "None" }
};
var VARIANTS = {
    asset: {
        dual: PLAYER_VARIANTS.dual,
        weakness: PLAYER_VARIANTS.weakness,
        basicweakness: { CardClass: "BasicWeakness", Level: "None" }
    },
    event: PLAYER_VARIANTS,
    skill: PLAYER_VARIANTS,
    storyAsset: { weakness: { CardClass: "Weakness" } },
    act: { reversed: { Orientation: "Reversed" } },
    agenda: { reversed: { Orientation: "Reversed" } },
    story: { tracker: { TrackerBox: "Clues", TrackerHeight: "120" } }
};

var CARD = {
    Artist: "Sofyan Syarief", ArtistBack: "Sofyan Syarief", Copyright: "Test",
    Collection: "CoreSet", CollectionNumber: "42",
    Encounter: "AgentsOfCthulhu", EncounterType: "0", EncounterNumber: "3", EncounterTotal: "4",
    TitleBack: "Spawn of the Stars"
};

var TWO_LINES = "Spawn of\nthe Stars";
var LONG_TOKEN = RULES + " " + RULES + " " + RULES;

// The same values on both sides. Back keys take the suffix before a trailing
// "Spacing", as the chaos token keys do.
function bothSides(values) {
    var both = {};
    for (var k in values) {
        both[k] = values[k];
        both[/Spacing$/.test(k) ? k.replace(/Spacing$/, "BackSpacing") : k + "Back"] = values[k];
    }
    return both;
}

var ONE_TOKEN = { Cultist: "", Tablet: "", ElderThing: "" };
var MERGED = { MergeSkull: "Cultist", MergeTablet: "ElderThing" };
var ALL_MERGED = { MergeSkull: "Cultist", MergeCultist: "Tablet", MergeTablet: "ElderThing" };

// Extra variants of one handler, with keys set on both sides; Title also sets
// the name. These cover chaos template layouts, by token rules.
var HANDLER_VARIANTS = {
    StoryStory: {
        chaos: bothSides({ Template: "Chaos" }),
        chaosTwoLines: bothSides({ Template: "Chaos", Title: TWO_LINES }),
        chaosUntitled: bothSides({ Template: "Chaos", Title: "" }),
        chaosTracker: bothSides({ Template: "Chaos", TrackerBox: "Clues", TrackerHeight: "120" }),
        chaosTrackerTwoLines: bothSides({ Template: "Chaos", TrackerBox: "Clues", TrackerHeight: "120", Title: TWO_LINES }),
        chaosFull: bothSides({ Template: "ChaosFull" }),
        chaosFullTracker: bothSides({ Template: "ChaosFull", TrackerBox: "Clues", TrackerHeight: "120" })
    },
    Scenario: {
        chaos: bothSides({ Template: "Chaos" }),
        chaosTwoLines: bothSides({ Template: "Chaos", Title: TWO_LINES }),
        chaosFull: bothSides({ Template: "ChaosFull" }),
        chaosBackNumberOnly: { Template: "Chaos", TemplateBack: "Chaos", CollectionType: "0", ShowCollectionNumberFront: "0" },
        chaosFrontNumberOnly: { Template: "Chaos", TemplateBack: "Chaos", CollectionType: "0", ShowCollectionNumberBack: "0" },
        titleFrontChaosBack: { Template: "Title", TemplateBack: "Chaos", CollectionType: "0" }
    },
    Chaos: {
        tracker: bothSides({ TrackerBox: "Clues", TrackerHeight: "120" }),
        twoLines: bothSides({ Title: TWO_LINES }),
        untitled: bothSides({ Title: "" }),
        oneToken: bothSides(ONE_TOKEN),
        merged: bothSides(MERGED),
        allMerged: bothSides(ALL_MERGED),
        mergedTracker: bothSides({ MergeSkull: "Cultist", MergeTablet: "ElderThing", TrackerBox: "Clues", TrackerHeight: "120" }),
        long: bothSides({ Skull: LONG_TOKEN, Cultist: LONG_TOKEN, Tablet: LONG_TOKEN, ElderThing: LONG_TOKEN }),
        longTracker: bothSides({ Skull: LONG_TOKEN, Cultist: LONG_TOKEN, Tablet: LONG_TOKEN, ElderThing: LONG_TOKEN, TrackerBox: "Clues", TrackerHeight: "120" })
    },
    StoryChaos: {
        backTracker: { TrackerBoxBack: "Clues", TrackerHeightBack: "120" },
        backOneToken: { CultistBack: "", TabletBack: "", ElderThingBack: "" },
        backMerged: { MergeSkullBack: "Cultist", MergeTabletBack: "ElderThing" },
        backLong: { SkullBack: LONG_TOKEN, CultistBack: LONG_TOKEN, TabletBack: LONG_TOKEN, ElderThingBack: LONG_TOKEN }
    }
};

// Card handler scripts and their [front, back] face types. Campaign guides,
// dividers and box/pack covers are not cards and are left out.
var HANDLERS = {
    // player cards
    Investigator: ["investigator", "investigatorBack"],
    Asset: ["asset", "playerBack"],
    Event: ["event", "playerBack"],
    Skill: ["skill", "playerBack"],
    AssetAsset: ["asset", "asset"],
    Customizable: ["customizable", "customizableBack"],
    WeaknessEnemy: ["enemy", "encounterBack"],
    WeaknessTreachery: ["treachery", "playerBack"],
    // encounter cards
    Treachery: ["treachery", "encounterBack"],
    Enemy: ["enemy", "encounterBack"],
    TreacheryLocation: ["treachery", "encounterBack"],
    // story cards
    Location: ["location", "locationBack"],
    Act: ["act", "actBack"],
    Agenda: ["agenda", "agendaBack"],
    Chaos: ["chaos", "chaos"],
    StoryStory: ["story", "story"],
    Key: ["key", "keyBack"],
    // story card variants
    ActEnemy: ["act", "enemy"],
    ActLocation: ["act", "location"],
    ActPortrait: ["act", "portraitBack"],
    ActAssetStory: ["act", "storyAsset"],
    AgendaFrontPortrait: ["agenda", "agendaBack"],
    AgendaEnemy: ["agenda", "enemy"],
    AgendaLocation: ["agenda", "location"],
    AgendaPortrait: ["agenda", "portraitBack"],
    AgendaAssetStory: ["agenda", "storyAsset"],
    AgendaTreachery: ["agenda", "treachery"],
    StoryAsset: ["story", "storyAsset"],
    StoryEnemy: ["story", "enemy"],
    StoryLocation: ["story", "location"],
    StoryChaos: ["story", "chaos"],
    StoryTreachery: ["story", "treachery"],
    LocationLocation: ["location", "location"],
    InvestigatorStory: ["investigator", "investigatorBack"],
    EnemyLocation: ["enemy", "location"],
    EnemyEnemy: ["enemy", "enemy"],
    AssetStory: ["storyAsset", "encounterBack"],
    AssetStoryAsset: ["storyAsset", "storyAsset"],
    AssetStoryEnemy: ["storyAsset", "enemy"],
    // other cards
    MiniInvestigator: ["miniInvestigator", "miniInvestigator"],
    Concealed: ["concealed", "concealedBack"],
    Ultimatum: ["ultimatum", "ultimatumBack"],
    Scenario: ["scenario", "scenario"],
    // not in the class map, but still opened from older saves
    AssetStoryPortrait: ["storyAsset", "portraitBack"],
    EnemyPortrait: ["enemy", "portraitBack"],
    TreacheryPortrait: ["treachery", "portraitBack"],
    TreacheryStory: ["treachery", "story"]
};

// Keys a handler reads without defining them in setDefaults; set on every
// variant ("default" uses empty values).
var UNDEFINED_KEYS = {
    Scenario: { TitleBack: "Spawn of the Stars (cont.)" }
};

var SUFFIX = ["", "Back"];

// Sets only keys the handler defines, so saved files carry no stray keys.
function apply(gc, values, suffix) {
    var s = gc.getSettings();
    var own = s.getKeySet();
    for (var k in values) {
        var key = k + suffix;
        if (own.contains(key)) s.set(key, values[k]);
    }
}

function build(handler, faces, variant, extra) {
    var gc = new DIY("ArkhamHorrorLCG/diy/" + handler + ".js", "AHLCG", false);
    gc.setName("Spawn of the Stars");
    for (var i = 0; i < gc.getPortraitCount(); ++i) {
        var p = gc.getPortrait(i);
        if (isArtPortrait(p)) placeArt(p);
    }
    if (variant !== "default") {
        apply(gc, CARD, "");
        for (var f = 0; f < 2; ++f) {
            apply(gc, FIELDS, SUFFIX[f]);
            if (OVERRIDES[faces[f]] != null) apply(gc, OVERRIDES[faces[f]], SUFFIX[f]);
            if (extra != null && extra.face === faces[f]) apply(gc, extra.values, SUFFIX[f]);
        }
    }
    var undefinedKeys = UNDEFINED_KEYS[handler] || {};
    for (var u in undefinedKeys) {
        gc.getSettings().set(u, variant === "default" ? "" : undefinedKeys[u]);
    }
    if (extra != null && extra.keys != null) {
        apply(gc, extra.keys, "");
        if (extra.keys.Title != null) gc.setName(extra.keys.Title);
    }
    return gc;
}

function write(handler, faces, variant, extra) {
    var name = handler + "/" + variant;
    var file = new File(outDir, name + ".eon");
    if (file.exists() && !overwrite) {
        record("SKIP", name, "exists");
        return;
    }
    try {
        file.getParentFile().mkdirs();
        ResourceKit.writeGameComponentToFile(file, build(handler, faces, variant, extra));
        record("OK", name, file);
    } catch (e) {
        record("FAIL", name, e.javaException ? e.javaException.toString() : String(e));
    }
}

try {
    for (var h in HANDLERS) {
        var faces = HANDLERS[h];
        write(h, faces, "default", null);
        write(h, faces, "filled", null);
        var seen = {};
        for (var f = 0; f < 2; ++f) {
            var type = faces[f];
            if (seen[type] || VARIANTS[type] == null) continue;
            seen[type] = true;
            for (var v in VARIANTS[type]) {
                write(h, faces, v, { face: type, values: VARIANTS[type][v] });
            }
        }
        if (HANDLER_VARIANTS[h] != null) {
            for (var hv in HANDLER_VARIANTS[h]) {
                write(h, faces, hv, { keys: HANDLER_VARIANTS[h][hv] });
            }
        }
    }
    results.println("DONE");
} finally {
    results.close();
}
