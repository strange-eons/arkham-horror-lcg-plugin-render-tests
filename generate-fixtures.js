/*
 * Runs inside Strange Eons via `--run` (see the generateFixtures and
 * dumpDefaults tasks).
 *
 * fx.mode "fixtures": creates one .eon file per card handler and variant in
 * fx.out, named <Handler>/<variant>.eon, and one per flexible card face and
 * variant in fx.flexibleOut, named <face>/<variant>.eon. Existing files are
 * kept unless fx.overwrite is true.
 *
 * fx.mode "defaults": writes <Handler>.txt to fx.out, listing the state of a
 * newly created component (settings, portraits, version, templates);
 * flexible card faces are written as Flexible-<face>.txt.
 * Also writes amd-loader.txt from the fx.amdScript handler: the AMD loader
 * checks it records; token-blocks.txt, from editing a flexible token rules
 * card; collector-tabs.txt, from choosing sets on a flexible card; sides.txt,
 * from painting flexible card faces with the same data on both sides; and text-blocks.txt, from editing a flexible story
 * card's text blocks; and editor-fit.txt, from resizing flexible card editors.
 *
 * Writes one line per handler or fixture to fx.results, then DONE.
 *
 * ES5 only: this runs on Strange Rhino.
 */
/* global
  importClass, Packages, File, PrintWriter, OutputStreamWriter,
  FileOutputStream, DIY, ResourceKit
 */
importClass(java.io.File);
importClass(java.io.PrintWriter);
importClass(java.io.OutputStreamWriter);
importClass(java.io.FileOutputStream);
importClass(Packages.ca.cgjennings.apps.arkham.diy.DIY);

function prop(k) {
    var v = java.lang.System.getProperty(k);
    return v == null ? '' : String(v);
}

var mode = prop('fx.mode') || 'fixtures';
var outDir = new File(prop('fx.out'));
var flexibleOutDir = new File(prop('fx.flexibleOut') || prop('fx.out'));
var overwrite = prop('fx.overwrite') === 'true';
var results = new PrintWriter(
    new OutputStreamWriter(new FileOutputStream(prop('fx.results')), 'UTF-8')
);

function record(status, name, detail) {
    results.println(
        status + '\t' + name + '\t' + String(detail).replace(/[\t\r\n]+/g, ' ')
    );
    results.flush();
}

// Monster art in the top right of the image; everything else is cropped.
var ART =
    'res://ArkhamHorrorLCG/default-portraits/Spawn_of_the_Stars_by_Sofyan_Syarief.jpg';
var ART_W = 1169,
    ART_H = 827;
var MONSTER = { x: 690, y: 30, w: 470, h: 560 };

function placeArt(portrait) {
    portrait.setSource(ART);
    var clip = portrait.getClipDimensions();
    var scale = Math.max(clip.width / MONSTER.w, clip.height / MONSTER.h);
    // keep the visible window inside the monster's bounds
    var halfW = clip.width / scale / 2,
        halfH = clip.height / scale / 2;
    var cx = Math.min(
        Math.max(MONSTER.x + MONSTER.w / 2, MONSTER.x + halfW),
        MONSTER.x + MONSTER.w - halfW
    );
    var cy = Math.min(
        Math.max(MONSTER.y + MONSTER.h / 2, MONSTER.y + halfH),
        MONSTER.y + MONSTER.h - halfH
    );
    portrait.setScale(scale);
    portrait.setPanX((ART_W / 2 - cx) * scale);
    portrait.setPanY((ART_H / 2 - cy) * scale);
}

function isArtPortrait(portrait) {
    var key = portrait.getBaseKey ? String(portrait.getBaseKey()) : '';
    return /-(Back)?(Transparent)?Portrait$/.test(key);
}

var RULES =
    '<rea> After this card enters play: Each investigator takes 1 <hor>.\n' +
    '<act>: Test <wil> (3). If you succeed, place 1 <dmg> on it.';

// Sample data for every face, keyed without the face suffix. Only keys a
// handler defines are set, so each handler picks up the fields it uses.
var FIELDS = {
    // title
    Unique: '1',
    Subtitle: 'Herald of the Deep',
    // enemy
    Health: '5',
    PerInvestigator: '1',
    Attack: '4',
    PerInvestigatorAttack: '1',
    Evade: '-',
    PerInvestigatorEvade: '0',
    Damage: '2',
    Horror: '1',
    // player cards
    ResourceCost: '3',
    Level: '2',
    Skill1: 'Willpower',
    Skill2: 'Combat',
    Skill3: 'Wild',
    Slot: 'Ally',
    Stamina: '2',
    Sanity: '3',
    PerInvestigatorSanity: '1',
    // investigator
    Willpower: '4',
    Intellect: '3',
    Combat: '2',
    Agility: '1',
    InvStory: 'She heard the call from beneath the waves.',
    Text1: '30.',
    Text2: 'Seeker or Mystic cards level 0-1.',
    Text3: 'Guardian cards level 0-5.',
    // location
    Shroud: '3',
    Clues: '2',
    LocationIcon: 'Circle',
    Connection1Icon: 'Square',
    Connection2Icon: 'Triangle',
    // act / agenda
    ScenarioIndex: '2',
    ScenarioDeckID: 'b',
    Doom: '6',
    AgendaStory: 'The sky splits open above the harbor.',
    ActStory: 'You reach the drowned temple.',
    // story
    TraitsA: 'Interlude.',
    HeaderA: 'Part I',
    AccentedStoryA: 'The water churns.',
    RulesA: RULES,
    HeaderB: 'Part II',
    AccentedStoryB: 'Something rises.',
    RulesB: 'Each investigator draws 1 card.',
    Story: 'The water churns.',
    Header: 'Setup',
    // chaos / scenario reference
    Skull: '-1 for each enemy in play.',
    Cultist: '-2. Take 1 horror.',
    Tablet: '-3. Take 1 damage.',
    ElderThing: '-4. Discard a card.',
    // customizable
    CustHeader: 'Customizable',
    CustName1: 'Heirloom',
    CustText1: 'Reduce its cost by 1.',
    CustName2: 'Inscribed',
    CustText2: 'It gains <act>: Draw 1 card.',
    // body text
    Traits: 'Monster. Elite.',
    Keywords: 'Hunter. Retaliate.',
    Rules: RULES,
    Flavor: 'The stars were right.',
    Victory: 'Victory 1.',
};

// Per face type adjustments to FIELDS.
var OVERRIDES = {
    asset: { CardClass: 'Guardian' },
    event: { CardClass: 'Guardian' },
    skill: { CardClass: 'Guardian' },
    customizable: { CardClass: 'Guardian' },
    investigator: { CardClass: 'Guardian', Stamina: '8', Sanity: '6' },
    miniInvestigator: { CardClass: 'Guardian' },
    storyAsset: { CardClass: 'Neutral' },
};

// Extra variants per face type, applied to every face of that type.
var PLAYER_VARIANTS = {
    dual: { CardClass: 'Seeker', CardClass2: 'Mystic' },
    weakness: { CardClass: 'Weakness', Level: 'None' },
};
var VARIANTS = {
    asset: {
        dual: PLAYER_VARIANTS.dual,
        weakness: PLAYER_VARIANTS.weakness,
        basicweakness: { CardClass: 'BasicWeakness', Level: 'None' },
    },
    event: PLAYER_VARIANTS,
    skill: PLAYER_VARIANTS,
    storyAsset: { weakness: { CardClass: 'Weakness' } },
    act: { reversed: { Orientation: 'Reversed' } },
    agenda: { reversed: { Orientation: 'Reversed' } },
    story: { tracker: { TrackerBox: 'Clues', TrackerHeight: '120' } },
    scenarioRules: { resolution: { Resolution: '1' } },
};

var CARD = {
    Artist: 'Sofyan Syarief',
    ArtistBack: 'Sofyan Syarief',
    Copyright: 'Test',
    Collection: 'CoreSet',
    CollectionNumber: '42',
    Encounter: 'AgentsOfCthulhu',
    EncounterType: '0',
    EncounterNumber: '3',
    EncounterTotal: '4',
    TitleBack: 'Spawn of the Stars',
};

var TWO_LINES = 'Spawn of\nthe Stars';
var LONG_TOKEN = RULES + ' ' + RULES + ' ' + RULES;

// The same values on both sides. Back keys take the suffix before a trailing
// "Spacing", as the chaos token keys do.
function bothSides(values) {
    var both = {};
    for (var k in values) {
        both[k] = values[k];
        both[
            /Spacing$/.test(k)
                ? k.replace(/Spacing$/, 'BackSpacing')
                : k + 'Back'
        ] = values[k];
    }
    return both;
}

var ONE_TOKEN = { Cultist: '', Tablet: '', ElderThing: '' };
var MERGED = { MergeSkull: 'Cultist', MergeTablet: 'ElderThing' };
var ALL_MERGED = {
    MergeSkull: 'Cultist',
    MergeCultist: 'Tablet',
    MergeTablet: 'ElderThing',
};

// Extra variants of one handler, with keys set on both sides; Title also sets
// the name. These cover chaos template layouts, by token rules, and story
// class templates.
var HANDLER_VARIANTS = {
    // StoryStory, StoryEnemy and Chaos variants were saved by the legacy
    // handlers, as files to upgrade; the face handlers would save them without
    // their legacy text
    StoryStory: {
        classNeutral: bothSides({ StoryClass: 'Neutral' }),
        classGuardian: bothSides({ StoryClass: 'Guardian' }),
        classSeeker: bothSides({ StoryClass: 'Seeker' }),
        classRogue: bothSides({ StoryClass: 'Rogue' }),
        classMystic: bothSides({ StoryClass: 'Mystic' }),
        classSurvivor: bothSides({ StoryClass: 'Survivor' }),
        classChaos: bothSides({ Template: 'Chaos', StoryClass: 'Guardian' }),
        chaos: bothSides({ Template: 'Chaos' }),
        chaosTwoLines: bothSides({ Template: 'Chaos', Title: TWO_LINES }),
        chaosUntitled: bothSides({ Template: 'Chaos', Title: '' }),
        chaosTracker: bothSides({
            Template: 'Chaos',
            TrackerBox: 'Clues',
            TrackerHeight: '120',
        }),
        chaosTrackerTwoLines: bothSides({
            Template: 'Chaos',
            TrackerBox: 'Clues',
            TrackerHeight: '120',
            Title: TWO_LINES,
        }),
        chaosFull: bothSides({ Template: 'ChaosFull' }),
        chaosFullTracker: bothSides({
            Template: 'ChaosFull',
            TrackerBox: 'Clues',
            TrackerHeight: '120',
        }),
    },
    StoryEnemy: { classGuardian: { StoryClass: 'Guardian' } },
    StoryTreachery: { classGuardian: { StoryClass: 'Guardian' } },
    StoryLocation: { classGuardian: { StoryClass: 'Guardian' } },
    StoryAsset: { classGuardian: { StoryClass: 'Guardian' } },
    Scenario: {
        chaos: bothSides({ Template: 'Chaos' }),
        chaosTwoLines: bothSides({ Template: 'Chaos', Title: TWO_LINES }),
        chaosFull: bothSides({ Template: 'ChaosFull' }),
        chaosBackNumberOnly: {
            Template: 'Chaos',
            TemplateBack: 'Chaos',
            CollectionType: '0',
            ShowCollectionNumberFront: '0',
        },
        chaosFrontNumberOnly: {
            Template: 'Chaos',
            TemplateBack: 'Chaos',
            CollectionType: '0',
            ShowCollectionNumberBack: '0',
        },
        titleFrontChaosBack: {
            Template: 'Title',
            TemplateBack: 'Chaos',
            CollectionType: '0',
        },
    },
    Chaos: {
        tracker: bothSides({ TrackerBox: 'Clues', TrackerHeight: '120' }),
        twoLines: bothSides({ Title: TWO_LINES }),
        untitled: bothSides({ Title: '' }),
        oneToken: bothSides(ONE_TOKEN),
        merged: bothSides(MERGED),
        allMerged: bothSides(ALL_MERGED),
        mergedTracker: bothSides({
            MergeSkull: 'Cultist',
            MergeTablet: 'ElderThing',
            TrackerBox: 'Clues',
            TrackerHeight: '120',
        }),
        long: bothSides({
            Skull: LONG_TOKEN,
            Cultist: LONG_TOKEN,
            Tablet: LONG_TOKEN,
            ElderThing: LONG_TOKEN,
        }),
        longTracker: bothSides({
            Skull: LONG_TOKEN,
            Cultist: LONG_TOKEN,
            Tablet: LONG_TOKEN,
            ElderThing: LONG_TOKEN,
            TrackerBox: 'Clues',
            TrackerHeight: '120',
        }),
    },
    StoryChaos: {
        classGuardian: { StoryClass: 'Guardian' },
        backTracker: { TrackerBoxBack: 'Clues', TrackerHeightBack: '120' },
        backOneToken: { CultistBack: '', TabletBack: '', ElderThingBack: '' },
        backMerged: {
            MergeSkullBack: 'Cultist',
            MergeTabletBack: 'ElderThing',
        },
        backLong: {
            SkullBack: LONG_TOKEN,
            CultistBack: LONG_TOKEN,
            TabletBack: LONG_TOKEN,
            ElderThingBack: LONG_TOKEN,
        },
    },
};

// Card handler scripts and their [front, back] face types. Campaign guides,
// dividers and box/pack covers are not cards and are left out.
var HANDLERS = {
    // player cards
    Investigator: ['investigator', 'investigatorBack'],
    Asset: ['asset', 'playerBack'],
    Event: ['event', 'playerBack'],
    Skill: ['skill', 'playerBack'],
    AssetAsset: ['asset', 'asset'],
    Customizable: ['customizable', 'customizableBack'],
    WeaknessEnemy: ['enemy', 'encounterBack'],
    WeaknessTreachery: ['treachery', 'playerBack'],
    // encounter cards
    Treachery: ['treachery', 'encounterBack'],
    Enemy: ['enemy', 'encounterBack'],
    TreacheryLocation: ['treachery', 'encounterBack'],
    // story cards
    Location: ['location', 'locationBack'],
    Act: ['act', 'actBack'],
    Agenda: ['agenda', 'agendaBack'],
    Chaos: ['chaos', 'chaos'],
    StoryStory: ['story', 'story'],
    Key: ['key', 'keyBack'],
    // story card variants
    ActEnemy: ['act', 'enemy'],
    ActLocation: ['act', 'location'],
    ActPortrait: ['act', 'portraitBack'],
    ActAssetStory: ['act', 'storyAsset'],
    AgendaFrontPortrait: ['agenda', 'agendaBack'],
    AgendaEnemy: ['agenda', 'enemy'],
    AgendaLocation: ['agenda', 'location'],
    AgendaPortrait: ['agenda', 'portraitBack'],
    AgendaAssetStory: ['agenda', 'storyAsset'],
    AgendaTreachery: ['agenda', 'treachery'],
    StoryAsset: ['story', 'storyAsset'],
    StoryEnemy: ['story', 'enemy'],
    StoryLocation: ['story', 'location'],
    StoryChaos: ['story', 'chaos'],
    StoryTreachery: ['story', 'treachery'],
    LocationLocation: ['location', 'location'],
    InvestigatorStory: ['investigator', 'investigatorBack'],
    EnemyLocation: ['enemy', 'location'],
    EnemyEnemy: ['enemy', 'enemy'],
    AssetStory: ['storyAsset', 'encounterBack'],
    AssetStoryAsset: ['storyAsset', 'storyAsset'],
    AssetStoryEnemy: ['storyAsset', 'enemy'],
    // other cards
    MiniInvestigator: ['miniInvestigator', 'miniInvestigator'],
    Concealed: ['concealed', 'concealedBack'],
    Ultimatum: ['ultimatum', 'ultimatumBack'],
    Scenario: ['scenario', 'scenario'],
    // not in the class map, but still opened from older saves
    AssetStoryPortrait: ['storyAsset', 'portraitBack'],
    EnemyPortrait: ['enemy', 'portraitBack'],
    TreacheryPortrait: ['treachery', 'portraitBack'],
    TreacheryStory: ['treachery', 'story'],
};

// Flexible card faces. Each fixture uses the face on both sides and renders
// the front only, so its masters show that face alone.
var FLEXIBLE = [
    'playerBack',
    'encounterBack',
    'enemy',
    'scenarioRules',
    'story',
    'tokenRules',
    'treachery',
    'asset',
    'event',
    'skill',
    'customizable',
    'customizableBack',
    'location',
    'locationBack',
    'key',
    'investigator',
    'investigatorBack',
    'act',
    'actBack',
    'agenda',
    'agendaBack',
    'agendaFrontPortrait',
    'agendaPortrait',
    'portrait',
];

var STORY_BLOCKS = {
    BlockCount: '9',
    BlockStyle1: 'traits',
    BlockText1: 'Interlude.',
    BlockSpacing1: '0',
    BlockStyle2: 'header',
    BlockText2: 'Part I',
    BlockSpacing2: '0',
    BlockStyle3: 'story',
    BlockText3: 'The water churns.',
    BlockSpacing3: '0',
    BlockStyle4: 'rules',
    BlockText4: RULES,
    BlockSpacing4: '0',
    BlockStyle5: 'rule',
    BlockText5: '',
    BlockSpacing5: '0',
    BlockStyle6: 'header',
    BlockText6: 'Part II',
    BlockSpacing6: '0',
    BlockStyle7: 'story',
    BlockText7: 'Something rises.',
    BlockSpacing7: '0',
    BlockStyle8: 'rules',
    BlockText8: 'Each investigator draws 1 card.',
    BlockSpacing8: '0',
    BlockStyle9: 'victory',
    BlockText9: 'Victory 1.',
    BlockSpacing9: '0',
};

// Keys a flexible face adds beyond its defaults, such as more text blocks;
// set on every variant but "default".
var FACE_KEYS = {
    // the filled story fields, as blocks
    story: STORY_BLOCKS,
    tokenRules: STORY_BLOCKS,
    actBack: STORY_BLOCKS,
    agendaBack: STORY_BLOCKS,
};

// Token blocks from [ icons, text ] pairs, after any other blocks.
function tokenBlocks(groups, intro) {
    var keys = {};
    var n = 0;
    function block(style, text, tokens) {
        ++n;
        keys['BlockStyle' + n] = style;
        keys['BlockText' + n] = text;
        keys['BlockSpacing' + n] = '0';
        if (tokens != null) keys['BlockTokens' + n] = tokens;
    }
    if (intro != null) block('intro', intro);
    for (var i = 0; i < groups.length; ++i)
        block('token', groups[i][1], groups[i][0]);
    keys.BlockCount = String(n);
    return keys;
}

function merge() {
    var all = {};
    for (var i = 0; i < arguments.length; ++i) {
        for (var k in arguments[i]) all[k] = arguments[i][k];
    }
    return all;
}

var ALL_TOKENS = [
    ['Skull', FIELDS.Skull],
    ['Cultist', FIELDS.Cultist],
    ['Tablet', FIELDS.Tablet],
    ['ElderThing', FIELDS.ElderThing],
];
var ONE_GROUP = [['Skull', FIELDS.Skull]];
var MERGED_GROUPS = [
    ['Skull,Cultist', FIELDS.Skull],
    ['Tablet,ElderThing', FIELDS.Tablet],
];
var ALL_MERGED_GROUP = [['Skull,Cultist,Tablet,ElderThing', FIELDS.Skull]];
var LONG_GROUPS = [
    ['Skull', LONG_TOKEN],
    ['Cultist', LONG_TOKEN],
    ['Tablet', LONG_TOKEN],
    ['ElderThing', LONG_TOKEN],
];
var TRACKER = { TrackerBox: 'Clues', TrackerHeight: '120' };
var EASY = { Difficulty: 'Front' };

var REPLACEMENT_IMAGE =
    'res://ArkhamHorrorLCG/default-portraits/Spawn_of_the_Stars_by_Sofyan_Syarief.jpg';

// Custom collection and encounter set icons, in the card's portraits.
var CUSTOM_ICONS = {
    keys: {
        Collection: 'CustomCollection',
        CollectionType: '-1',
        Encounter: 'CustomEncounterSet',
        EncounterType: '-1',
    },
    sources: {
        Collection: 'res://ArkhamHorrorLCG/icons/AHLCG-CoreSet.png',
        Encounter: 'res://ArkhamHorrorLCG/icons/AHLCG-AgentsOfCthulhu.png',
    },
};
// Chaos cards with custom and return-to icons, unlike the standard icons on
// the other variants, saved at the version before the token rules face.
HANDLER_VARIANTS.Chaos.customIcons = merge(CUSTOM_ICONS.keys, {
    Portraits: {
        Collection: 'res://ArkhamHorrorLCG/icons/AHLCG-TheDunwichLegacy.png',
        Encounter: 'res://ArkhamHorrorLCG/icons/AHLCG-TheGathering.png',
    },
    Version: 30,
});
HANDLER_VARIANTS.Chaos.returnTo = {
    Encounter: 'ReturnToCultOfUmordhoth',
    EncounterType: '0',
    Version: 30,
};
// saved by the token rules face, with an image replacing each side's template
HANDLER_VARIANTS.Chaos.replaced = {
    TemplateReplacement: REPLACEMENT_IMAGE,
    TemplateReplacementBack: REPLACEMENT_IMAGE,
};

// Story cards saved by the legacy handlers at the version before the story
// and enemy faces: other backs, spacing, the third part, an empty first part
// and replacement templates.
var STORY_SPACING = bothSides({
    TraitsASpacing: '4',
    HeaderASpacing: '6',
    AccentedStoryASpacing: '8',
    HeaderBSpacing: '6',
    AccentedStoryBSpacing: '8',
    VictorySpacing: '10',
});
var LEGACY_STORY = {
    playerBack: { TemplateBack: 'Player' },
    encounterBack: { TemplateBack: 'Encounter' },
    spacing: STORY_SPACING,
    partC: bothSides({
        HeaderC: 'Part III',
        AccentedStoryC: 'The tide turns.',
        RulesC: 'Each investigator draws 1 card.',
    }),
    emptyFirstPart: bothSides({
        TraitsA: '',
        HeaderA: '',
        AccentedStoryA: '',
        RulesA: '',
    }),
    replaced: {
        TemplateReplacement: REPLACEMENT_IMAGE,
        TemplateReplacementBack: REPLACEMENT_IMAGE,
    },
};
var LEGACY_STORY_ENEMY = {
    spacing: merge(STORY_SPACING, {
        TraitsBackSpacing: '4',
        KeywordsBackSpacing: '6',
        RulesBackSpacing: '8',
        FlavorBackSpacing: '10',
    }),
    chaos: { Template: 'Chaos' },
    chaosFull: { Template: 'ChaosFull' },
    replaced: LEGACY_STORY.replaced,
};
// Encounter cards saved by the legacy handlers before their faces.
var LEGACY_ENCOUNTER = {
    customIcons: merge(CUSTOM_ICONS.keys, {
        Portraits: CUSTOM_ICONS.sources,
    }),
    returnTo: { Encounter: 'ReturnToCultOfUmordhoth', EncounterType: '0' },
    replaced: { TemplateReplacement: REPLACEMENT_IMAGE },
};
var LEGACY_ENEMY = merge(LEGACY_ENCOUNTER, {
    dashes: { Health: '-', Attack: '-', PerInvestigatorAttack: '0' },
});
[
    ['StoryStory', LEGACY_STORY],
    ['StoryEnemy', LEGACY_STORY_ENEMY],
    ['Enemy', LEGACY_ENEMY],
    ['Treachery', LEGACY_ENCOUNTER],
    [
        'WeaknessTreachery',
        {
            weakness: { Subtype: 'Weakness' },
            storyWeakness: { Subtype: 'StoryWeakness' },
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
    [
        'Asset',
        {
            encounterBack: { BackTypeBack: 'Encounter' },
            triple: {
                CardClass: 'Seeker',
                CardClass2: 'Mystic',
                CardClass3: 'Rogue',
            },
            costDash: { ResourceCost: '-', Stamina: '-', Sanity: 'X' },
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
    [
        'Event',
        {
            encounterBack: { BackTypeBack: 'Encounter' },
            triple: {
                CardClass: 'Seeker',
                CardClass2: 'Mystic',
                CardClass3: 'Rogue',
            },
            basicWeakness: { CardClass: 'BasicWeakness', Level: 'None' },
            story: { CardClass: 'Story' },
            storyWeakness: { CardClass: 'StoryWeakness' },
            costDash: { ResourceCost: '-' },
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
    [
        'Skill',
        {
            encounterBack: { BackTypeBack: 'Encounter' },
            basicWeakness: { CardClass: 'BasicWeakness', Level: 'None' },
            story: { CardClass: 'Story' },
            storyWeakness: { CardClass: 'StoryWeakness' },
            specialist: { CardClass: 'Specialist', Level: 'None' },
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
    [
        'Customizable',
        {
            allOptions: {
                CustHeader: 'Customizable.',
                CustHeaderSpacing: '4',
                CustText3: 'It gains Retaliate.',
                CustName3: 'Sharp',
                CustCost3: '3',
                CustText3Spacing: '6',
                CustText4: 'Heal 1 damage.',
                CustName4: 'Mended',
                CustCost4: '1',
                CustText5: 'Draw 1 card.',
                CustName5: 'Lucky',
                CustCost5: '4',
                CustText6: 'Gain 1 resource.',
                CustName6: 'Rich',
                CustText7: 'Move 1 location.',
                CustName7: 'Swift',
                CustText8: 'Discover 1 clue.',
                CustName8: 'Keen',
            },
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
    [
        'AssetAsset',
        {
            backClass: {
                CardClassBack: 'Mystic',
                CardClass2Back: 'Survivor',
                LevelBack: '2',
            },
            triple: {
                CardClass: 'Seeker',
                CardClass2: 'Mystic',
                CardClass3: 'Rogue',
            },
            costDash: { ResourceCost: '-', Stamina: '-', Sanity: 'X' },
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    ],
    [
        'ActEnemy',
        {
            reversed: { Orientation: 'Reversed' },
            oldPan: { Version: 16 },
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    ],
    [
        'AgendaEnemy',
        {
            reversed: { Orientation: 'Reversed' },
            oldPan: { Version: 16 },
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    ],
    [
        'ActLocation',
        {
            reversed: { Orientation: 'Reversed' },
            oldPan: { Version: 17 },
            backIcons: {
                LocationIconBack: 'Square',
                Connection2IconBack: 'Moon',
            },
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    ],
    [
        'AgendaLocation',
        {
            reversed: { Orientation: 'Reversed' },
            oldPan: { Version: 17 },
            backIcons: {
                LocationIconBack: 'Square',
                Connection2IconBack: 'Moon',
            },
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    ],
    [
        'AgendaTreachery',
        {
            reversed: { Orientation: 'Reversed' },
            oldPan: { Version: 16 },
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    ],
    [
        'EnemyEnemy',
        {
            separateArt: { PortraitShare: '0', ArtistBack: 'Other Artist' },
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    ],
    [
        'EnemyPortrait',
        {
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    ],
    [
        'TreacheryPortrait',
        {
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    ],
    [
        'ActPortrait',
        {
            reversed: { Orientation: 'Reversed' },
            backTitle: { TitleBack: 'The Drowned Temple' },
            separateArtist: { ArtistBack: 'Other Artist' },
            oldPan: { Version: 16 },
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    ],
    [
        'AgendaPortrait',
        {
            reversed: { Orientation: 'Reversed' },
            backTitle: { TitleBack: 'The Drowned Temple' },
            separateArtist: { ArtistBack: 'Other Artist' },
            oldPan: { Version: 16 },
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    ],
    [
        'AgendaFrontPortrait',
        {
            perInvestigator: { Doom: '12', PerInvestigator: '1' },
            asterisk: { Doom: '3', PerInvestigator: '0', Asterisk: '1' },
            partsBC: {
                HeaderBBack: 'Part III',
                RulesBBack: 'Advance.',
            },
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
    [
        'Agenda',
        {
            perInvestigator: { Doom: '12', PerInvestigator: '1' },
            reversedPerInvestigator: {
                Orientation: 'Reversed',
                Doom: '4',
                PerInvestigator: '1',
            },
            asterisk: { Doom: 'Star', PerInvestigator: '0', Asterisk: '1' },
            dash: { Doom: '-' },
            reversedReturnTo: merge(LEGACY_ENCOUNTER.returnTo, {
                Orientation: 'Reversed',
            }),
            twoLines: { Title: TWO_LINES },
            partsBC: {
                HeaderBBack: 'Part III',
                RulesBBack: 'Advance.',
                AccentedStoryCBack: 'The end draws near.',
                RulesCBack: 'The investigators win.',
            },
            scaled: { ScaleModifier: '80' },
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
    [
        'Act',
        {
            perInvestigator: { Clues: '3', PerInvestigator: '1' },
            asterisk: { Clues: '2', PerInvestigator: '0', Asterisk: '1' },
            reversedReturnTo: merge(LEGACY_ENCOUNTER.returnTo, {
                Orientation: 'Reversed',
            }),
            twoLines: { Title: TWO_LINES },
            partsBC: {
                HeaderBBack: 'Part III',
                RulesBBack: 'Advance.',
                AccentedStoryCBack: 'The end draws near.',
                RulesCBack: 'The investigators win.',
            },
            scaled: { ScaleModifier: '80' },
            oldPan: { Version: 16 },
            oldPanReversed: { Version: 16, Orientation: 'Reversed' },
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
    [
        'Investigator',
        {
            parallel: { CardClass: 'ParallelRogue' },
            parallelNeutral: { CardClass: 'ParallelNeutral', Subtitle: '' },
            neutral: { CardClass: 'Neutral' },
            stats: { Stamina: '-', Sanity: 'X', Willpower: '0', Agility: '6' },
            sections: {
                Text1BackSpacing: '6',
                Text4Back: 'At least 5 <i>Tome</i> cards.',
                Text7Back: 'No more than 2 <b>Spell</b> cards.',
                Text8NameBack: 'Special',
                Text8Back: 'You may include 1 <i>Relic</i>.',
            },
            oldSections: {
                Version: 11,
                Undefined: {
                    DeckSizeBack: '33.',
                    DeckSizeBackSpacing: '4',
                    SecondaryClassBack: 'Rogue cards level 0-2.',
                    DeckOptionsBack: 'Seeker cards level 0-5.',
                    AdditionalRequirementsBack: 'Lose 1 resource.',
                },
            },
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
    [
        'InvestigatorStory',
        {
            noSubtitle: { Subtitle: '' },
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
    [
        'Key',
        {
            separateArt: { PortraitShare: '0', ArtistBack: 'Other Artist' },
            backTitle: {
                Undefined: { TitleBack: 'The Key of Ys' },
                UniqueBack: '0',
            },
            blankBackTitle: { Undefined: { TitleBack: '' }, UniqueBack: '0' },
            blankBackSubtitle: { SubtitleBack: '' },
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
    [
        'Location',
        {
            playerBack: { BackTypeBack: 'Player' },
            separateArt: { PortraitShare: '0', ArtistBack: 'Other Artist' },
            dashes: { Shroud: '-', Clues: '-' },
            perInvestigatorShroud: {
                Shroud: '4',
                ShroudPerInvestigator: '1',
                Clues: 'X',
            },
            star: { Shroud: 'Star', Clues: 'Star', PerInvestigator: '0' },
            noEncounterIcon: {
                ShowEncounterIcon: '0',
                ShowEncounterIconBack: '0',
            },
            backIcons: {
                LocationIconBack: 'Square',
                Connection1IconBack: 'None',
                Connection3IconBack: 'Moon',
            },
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
    [
        'LocationLocation',
        {
            separateArt: { PortraitShare: '0', ArtistBack: 'Other Artist' },
            backStats: {
                ShroudBack: '3',
                CluesBack: '2',
                PerInvestigatorBack: '0',
                ShroudPerInvestigatorBack: '1',
                VictoryBack: 'Victory 2',
            },
            backIcons: {
                LocationIconBack: 'Square',
                Connection1IconBack: 'None',
                Connection3IconBack: 'Moon',
            },
            noBackIcon: { LocationIconBack: 'None' },
            noEncounterIcon: {
                ShowEncounterIcon: '0',
                ShowEncounterIconBack: '0',
            },
            returnTo: LEGACY_ENCOUNTER.returnTo,
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
    [
        'WeaknessEnemy',
        {
            weakness: { Subtype: 'Weakness' },
            investigatorWeakness: { Subtype: 'InvestigatorWeakness' },
            storyWeakness: { Subtype: 'StoryWeakness' },
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
    [
        'TreacheryStory',
        {
            customIcons: LEGACY_ENCOUNTER.customIcons,
            replaced: LEGACY_ENCOUNTER.replaced,
        },
    ],
].forEach(function (entry) {
    HANDLER_VARIANTS[entry[0]] = HANDLER_VARIANTS[entry[0]] || {};
    for (var v in entry[1])
        HANDLER_VARIANTS[entry[0]][v] = merge({ Version: 30 }, entry[1][v]);
});

// flexible variants set both sides alike, so each back can be checked
// against its front's master
var HIDE_COLLECTOR = {
    ShowCollectionNumberFront: '0',
    ShowEncounterNumberFront: '0',
    ShowCollectionNumberBack: '0',
    ShowEncounterNumberBack: '0',
};

// Flexible variants that set any key, unlike VARIANTS, after FACE_KEYS. Title
// sets the component name, Card sets keys without a suffix and Portraits sets
// the source of each portrait, by kind.
var FACE_VARIANTS = {
    portrait: {
        noArtist: { Artist: '' },
    },
    agendaPortrait: {
        returnTo: {
            Card: { Encounter: 'ReturnToCultOfUmordhoth', EncounterType: '0' },
        },
        customIcons: {
            Card: CUSTOM_ICONS.keys,
            Portraits: CUSTOM_ICONS.sources,
        },
    },
    agendaFrontPortrait: {
        perInvestigator: { Doom: '12', PerInvestigator: '1' },
        asterisk: { Doom: '3', PerInvestigator: '0', Asterisk: '1' },
        returnTo: {
            Card: { Encounter: 'ReturnToCultOfUmordhoth', EncounterType: '0' },
        },
    },
    agendaBack: {
        returnTo: {
            Card: { Encounter: 'ReturnToCultOfUmordhoth', EncounterType: '0' },
        },
    },
    agenda: {
        reversed: { Orientation: 'Reversed' },
        reversedReturnTo: {
            Orientation: 'Reversed',
            Card: { Encounter: 'ReturnToCultOfUmordhoth', EncounterType: '0' },
        },
        perInvestigator: { Doom: '12', PerInvestigator: '1' },
        reversedPerInvestigator: {
            Orientation: 'Reversed',
            Doom: '4',
            PerInvestigator: '1',
        },
        asterisk: { Doom: 'Star', PerInvestigator: '0', Asterisk: '1' },
        dash: { Doom: '-' },
        twoLines: { Title: TWO_LINES },
        replaced: {
            Card: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    },
    actBack: {
        returnTo: {
            Card: { Encounter: 'ReturnToCultOfUmordhoth', EncounterType: '0' },
        },
        twoDigitIndex: { Card: { ScenarioIndex: '12', ScenarioDeckID: 'e' } },
    },
    act: {
        reversed: { Orientation: 'Reversed' },
        reversedReturnTo: {
            Orientation: 'Reversed',
            Card: { Encounter: 'ReturnToCultOfUmordhoth', EncounterType: '0' },
        },
        perInvestigator: { Clues: '3', PerInvestigator: '1' },
        asterisk: { Clues: '2', PerInvestigator: '0', Asterisk: '1' },
        twoLines: { Title: TWO_LINES },
        customIcons: {
            Card: CUSTOM_ICONS.keys,
            Portraits: CUSTOM_ICONS.sources,
        },
        replaced: {
            Card: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    },
    investigatorBack: {
        parallel: { Card: { CardClass: 'ParallelSeeker' } },
        neutral: { Card: { CardClass: 'Neutral' } },
        story: { Card: { CardClass: 'Story' } },
    },
    investigator: {
        parallel: { CardClass: 'ParallelRogue' },
        neutral: { CardClass: 'Neutral', Subtitle: '' },
        story: { CardClass: 'Story' },
        dashes: { Stamina: '-', Sanity: 'Star', Willpower: '0' },
        replaced: {
            Card: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    },
    key: {
        plainTitle: { Unique: '0', Subtitle: '' },
        returnTo: {
            Card: { Encounter: 'ReturnToCultOfUmordhoth', EncounterType: '0' },
        },
        customIcons: {
            Card: CUSTOM_ICONS.keys,
            Portraits: CUSTOM_ICONS.sources,
        },
    },
    location: {
        dashes: { Shroud: '-', Clues: '-' },
        perInvestigatorShroud: {
            Shroud: '4',
            ShroudPerInvestigator: '1',
            Clues: 'X',
        },
        star: { Shroud: 'Star', Clues: 'Star', PerInvestigator: '0' },
        noEncounterIcon: { ShowEncounterIcon: '0' },
        returnTo: {
            Card: { Encounter: 'ReturnToCultOfUmordhoth', EncounterType: '0' },
        },
        customIcons: {
            Card: CUSTOM_ICONS.keys,
            Portraits: CUSTOM_ICONS.sources,
        },
        replaced: {
            Card: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    },
    locationBack: {
        noEncounterIcon: { ShowEncounterIcon: '0' },
        returnTo: {
            Card: { Encounter: 'ReturnToCultOfUmordhoth', EncounterType: '0' },
        },
    },
    skill: {
        basicWeakness: { CardClass: 'BasicWeakness', Level: 'None' },
        story: { CardClass: 'Story' },
        storyWeakness: { CardClass: 'StoryWeakness' },
        specialist: { CardClass: 'Specialist', Level: 'None' },
        replaced: {
            Card: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    },
    event: {
        triple: {
            CardClass: 'Seeker',
            CardClass2: 'Mystic',
            CardClass3: 'Rogue',
        },
        basicWeakness: { CardClass: 'BasicWeakness', Level: 'None' },
        story: { CardClass: 'Story' },
        storyWeakness: { CardClass: 'StoryWeakness' },
        costDash: { ResourceCost: '-' },
        replaced: {
            Card: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    },
    asset: {
        triple: {
            CardClass: 'Seeker',
            CardClass2: 'Mystic',
            CardClass3: 'Rogue',
        },
        neutral: { CardClass: 'Neutral', Subtitle: '' },
        costDash: { ResourceCost: '-', Stamina: '-', Sanity: 'X' },
        replaced: {
            Card: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    },
    treachery: {
        weakness: { Subtype: 'Weakness' },
        basicWeakness: { Subtype: 'BasicWeakness' },
        storyWeakness: { Subtype: 'StoryWeakness' },
        customIcons: {
            Card: CUSTOM_ICONS.keys,
            Portraits: CUSTOM_ICONS.sources,
        },
        returnTo: {
            Card: { Encounter: 'ReturnToCultOfUmordhoth', EncounterType: '0' },
        },
        replaced: {
            Card: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    },
    enemy: {
        // the back shows the front's art, and credits its artist
        sharedArt: { Card: { PortraitShare: '1', ArtistBack: '' } },
        basicWeakness: { Subtype: 'BasicWeakness' },
        investigatorWeakness: { Subtype: 'InvestigatorWeakness' },
        storyWeakness: { Subtype: 'StoryWeakness' },
        customIcons: {
            Card: CUSTOM_ICONS.keys,
            Portraits: CUSTOM_ICONS.sources,
        },
        returnTo: {
            Card: { Encounter: 'ReturnToCultOfUmordhoth', EncounterType: '0' },
        },
        noCollectorLine: { Card: HIDE_COLLECTOR },
        plainStats: {
            Subtitle: '',
            Unique: '0',
            Health: '12',
            Attack: '1',
            Evade: '10',
            PerInvestigatorEvade: '1',
            PerInvestigator: '0',
            PerInvestigatorAttack: '0',
            Damage: '5',
            Horror: '5',
        },
        dashes: { Health: '-', Attack: '-', PerInvestigatorAttack: '0' },
        replaced: {
            Card: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
    },
    story: {
        classGuardian: { StoryClass: 'Guardian' },
        replaced: {
            Card: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
        customIcons: {
            Card: CUSTOM_ICONS.keys,
            Portraits: CUSTOM_ICONS.sources,
        },
        returnTo: {
            Card: { Encounter: 'ReturnToCultOfUmordhoth', EncounterType: '0' },
        },
        noCollectorLine: { Card: HIDE_COLLECTOR },
        noCopyright: {
            Card: { ShowCopyrightFront: '0', ShowCopyrightBack: '0' },
        },
    },
    tokenRules: {
        replaced: {
            Card: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
            },
        },
        replacedBleed: {
            Card: {
                TemplateReplacement: REPLACEMENT_IMAGE,
                TemplateReplacementBack: REPLACEMENT_IMAGE,
                TemplateReplacementBleed: '1',
            },
        },
        replacedUnreadable: {
            Card: {
                TemplateReplacement: 'missing-replacement.png',
                TemplateReplacementBack: 'missing-replacement.png',
            },
        },
        customIcons: {
            Card: CUSTOM_ICONS.keys,
            Portraits: CUSTOM_ICONS.sources,
        },
        returnTo: {
            Card: { Encounter: 'ReturnToCultOfUmordhoth', EncounterType: '0' },
        },
        noCollectorLine: { Card: HIDE_COLLECTOR },
        noCopyright: {
            Card: { ShowCopyrightFront: '0', ShowCopyrightBack: '0' },
        },
        twoLines: { Title: TWO_LINES },
        untitled: { Title: '' },
        tracker: TRACKER,
        trackerTwoLines: merge(TRACKER, { Title: TWO_LINES }),
        full: { ChaosFull: '1' },
        fullTracker: merge(TRACKER, { ChaosFull: '1' }),
        difficulty: EASY,
        tokens: merge(tokenBlocks(ALL_TOKENS), EASY),
        tokensTwoLines: merge(tokenBlocks(ALL_TOKENS), EASY, {
            Title: TWO_LINES,
        }),
        tokensUntitled: merge(tokenBlocks(ALL_TOKENS), EASY, { Title: '' }),
        tokensTracker: merge(tokenBlocks(ALL_TOKENS), EASY, TRACKER),
        tokensOne: merge(tokenBlocks(ONE_GROUP), EASY),
        tokensMerged: merge(tokenBlocks(MERGED_GROUPS), EASY),
        tokensAllMerged: merge(tokenBlocks(ALL_MERGED_GROUP), EASY),
        tokensMergedTracker: merge(tokenBlocks(MERGED_GROUPS), EASY, TRACKER),
        tokensLong: merge(tokenBlocks(LONG_GROUPS), EASY),
        tokensLongTracker: merge(tokenBlocks(LONG_GROUPS), EASY, TRACKER),
        tokensFull: merge(tokenBlocks(ALL_TOKENS), { ChaosFull: '1' }),
        intro: tokenBlocks(ALL_TOKENS, 'Setup'),
        introTracker: merge(tokenBlocks(ALL_TOKENS, 'Setup'), TRACKER),
        introOne: tokenBlocks(ONE_GROUP, 'Setup'),
        introMerged: tokenBlocks(MERGED_GROUPS, 'Setup'),
        introLong: tokenBlocks(LONG_GROUPS, 'Setup'),
        rulesAndTokens: {
            BlockCount: '3',
            BlockStyle1: 'rules',
            BlockText1: RULES,
            BlockSpacing1: '0',
            BlockStyle2: 'token',
            BlockText2: FIELDS.Skull,
            BlockSpacing2: '0',
            BlockTokens2: 'Skull',
            BlockStyle3: 'rules',
            BlockText3: 'Each investigator draws 1 card.',
            BlockSpacing3: '0',
        },
    },
};

// Keys a handler reads without defining them in setDefaults; set on every
// variant ("default" uses empty values). A legacy variant's Undefined sets
// such keys for that variant alone.
var UNDEFINED_KEYS = {
    Scenario: { TitleBack: 'Spawn of the Stars (cont.)' },
};

var SUFFIX = ['', 'Back'];

// Sets only keys the handler defines, so saved files carry no stray keys.
function apply(gc, values, suffix) {
    var s = gc.getSettings();
    var own = s.getKeySet();
    for (var k in values) {
        var key = k + suffix;
        if (own.contains(key)) s.set(key, values[k]);
    }
}

// Selects the faces of a flexible card; the handler applies them, with their
// defaults, the next time it is asked for portraits.
function selectFaces(gc, faces) {
    gc.getSettings().set('FrontFace', faces[0]);
    gc.getSettings().set('BackFace', faces[1]);
    gc.getPortraitCount();
}

// Sets the source of each portrait named in sources by its kind, the end of
// its base key.
function setPortraitSources(gc, sources) {
    for (var i = 0; i < gc.getPortraitCount(); ++i) {
        var key = String(gc.getPortrait(i).getBaseKey());
        var kind = key.substring(key.lastIndexOf('-') + 1);
        if (sources[kind] != null) gc.getPortrait(i).setSource(sources[kind]);
    }
}

// The version a card was saved with, as an older plug-in would have saved
// it; handlers only set it in create and onRead.
function setSavedVersion(gc, version) {
    var field = gc.getClass().getDeclaredField('cardVersion');
    field.setAccessible(true);
    field.setInt(gc, version);
    if (gc.getVersion() !== version)
        throw new Error('saved version ' + gc.getVersion());
}

function build(handler, faces, variant, extra, flexible) {
    var gc = new DIY('ArkhamHorrorLCG/diy/' + handler + '.js', 'AHLCG', false);
    if (flexible) selectFaces(gc, faces);
    gc.setName('Spawn of the Stars');
    for (var i = 0; i < gc.getPortraitCount(); ++i) {
        var p = gc.getPortrait(i);
        if (isArtPortrait(p)) placeArt(p);
    }
    if (variant !== 'default') {
        apply(gc, CARD, '');
        for (var f = 0; f < 2; ++f) {
            apply(gc, FIELDS, SUFFIX[f]);
            if (OVERRIDES[faces[f]] != null)
                apply(gc, OVERRIDES[faces[f]], SUFFIX[f]);
            if (extra != null && extra.face === faces[f])
                apply(gc, extra.values, SUFFIX[f]);
            if (flexible && FACE_KEYS[faces[f]] != null) {
                for (var k in FACE_KEYS[faces[f]])
                    gc.getSettings().set(k + SUFFIX[f], FACE_KEYS[faces[f]][k]);
            }
            if (
                extra != null &&
                extra.face === faces[f] &&
                extra.faceKeys != null
            ) {
                for (var fk in extra.faceKeys) {
                    if (fk === 'Title') gc.setName(extra.faceKeys[fk]);
                    else if (fk === 'Card') {
                        for (var ck in extra.faceKeys.Card)
                            gc.getSettings().set(ck, extra.faceKeys.Card[ck]);
                    } else if (fk === 'Portraits') {
                        for (var pi = 0; pi < gc.getPortraitCount(); ++pi) {
                            var pk = String(
                                gc.getPortrait(pi).getBaseKey()
                            ).replace('AHLCG-Face-', '');
                            if (extra.faceKeys.Portraits[pk] != null)
                                gc.getPortrait(pi).setSource(
                                    extra.faceKeys.Portraits[pk]
                                );
                        }
                    } else
                        gc.getSettings().set(
                            fk + SUFFIX[f],
                            extra.faceKeys[fk]
                        );
                }
            }
        }
    }
    var undefinedKeys = UNDEFINED_KEYS[handler] || {};
    for (var u in undefinedKeys) {
        gc.getSettings().set(u, variant === 'default' ? '' : undefinedKeys[u]);
    }
    if (extra != null && extra.keys != null) {
        apply(gc, extra.keys, '');
        if (extra.keys.Title != null) gc.setName(extra.keys.Title);
        if (extra.keys.Portraits != null)
            setPortraitSources(gc, extra.keys.Portraits);
        for (var uk in extra.keys.Undefined || {})
            gc.getSettings().set(uk, extra.keys.Undefined[uk]);
        if (extra.keys.Version != null) setSavedVersion(gc, extra.keys.Version);
    }
    if (flexible) matchBack(gc);
    return gc;
}

// A flexible card's back shows the front's title and page number, so the
// back can be checked against the front's master.
function matchBack(gc) {
    var s = gc.getSettings();
    if (s.get('TitleBack') != null) s.set('TitleBack', gc.getName());
    if (s.get('PageBack') != null) s.set('PageBack', s.get('Page'));
}

function write(handler, faces, variant, extra, flexible) {
    var name = (flexible ? faces[0] : handler) + '/' + variant;
    var file = new File(flexible ? flexibleOutDir : outDir, name + '.eon');
    if (file.exists() && !overwrite) {
        record('SKIP', name, 'exists');
        return;
    }
    try {
        file.getParentFile().mkdirs();
        ResourceKit.writeGameComponentToFile(
            file,
            build(handler, faces, variant, extra, flexible)
        );
        record('OK', name, file);
    } catch (e) {
        record(
            'FAIL',
            name,
            e.javaException ? e.javaException.toString() : String(e)
        );
    }
}

function describe(gc) {
    var lines = [];
    var s = gc.getSettings();
    for (var it = s.getKeySet().iterator(); it.hasNext();) {
        var k = String(it.next());
        lines.push('setting ' + k + ' = ' + s.get(k));
    }
    lines.sort();
    var head = [
        'version ' + gc.getVersion(),
        'faceStyle ' + gc.getFaceStyle(),
        'frontTemplateKey ' + gc.getFrontTemplateKey(),
        'backTemplateKey ' + gc.getBackTemplateKey(),
        'cornerRadius ' + gc.getCornerRadius(),
        'name ' + gc.getName(),
    ];
    for (var i = 0; i < gc.getPortraitCount(); ++i) {
        head.push('portrait ' + i + ' ' + gc.getPortrait(i).getBaseKey());
    }
    return head.concat(lines).join('\n') + '\n';
}

// editor tabs and titled panels, in layout order
function describeEditor(gc) {
    var lines = [];
    var editor = gc.createDefaultEditor();
    var tabs = editor.getTabbedPane();
    function title(b) {
        if (b instanceof javax.swing.border.TitledBorder) return b.getTitle();
        if (b instanceof javax.swing.border.CompoundBorder)
            return title(b.getOutsideBorder()) || title(b.getInsideBorder());
        return null;
    }
    function walk(c, depth) {
        var t =
            c instanceof javax.swing.JComponent ? title(c.getBorder()) : null;
        if (t != null)
            lines.push(
                '  panel ' + t + ' (' + c.getComponentCount() + ' controls)'
            );
        if (depth > 0 && c instanceof javax.swing.JTabbedPane) return;
        var children = c.getComponents();
        for (var i = 0; i < children.length; ++i) walk(children[i], depth + 1);
    }
    for (var t = 0; t < tabs.getTabCount(); ++t) {
        lines.push('tab ' + tabs.getTitleAt(t));
        walk(tabs.getComponentAt(t), 1);
    }
    editor.dispose();
    return lines.join('\n') + '\n';
}

function writeDefaults(handler, faces) {
    var name = faces ? handler + '-' + faces[0] : handler;
    try {
        var gc = new DIY(
            'ArkhamHorrorLCG/diy/' + handler + '.js',
            'AHLCG',
            false
        );
        if (faces) selectFaces(gc, faces);
        var file = new File(outDir, name + '.txt');
        file.getParentFile().mkdirs();
        java.nio.file.Files.writeString(
            file.toPath(),
            describe(gc) + describeEditor(gc)
        );
        record('OK', name, file);
    } catch (e) {
        record(
            'FAIL',
            name,
            e.javaException ? e.javaException.toString() : String(e)
        );
    }
}

function writeAll(handler, faces, flexible) {
    write(handler, faces, 'default', null, flexible);
    write(handler, faces, 'filled', null, flexible);
    var seen = {};
    for (var f = 0; f < 2; ++f) {
        var type = faces[f];
        if (seen[type] || VARIANTS[type] == null) continue;
        seen[type] = true;
        for (var v in VARIANTS[type]) {
            write(
                handler,
                faces,
                v,
                { face: type, values: VARIANTS[type][v] },
                flexible
            );
        }
    }
    if (flexible && FACE_VARIANTS[faces[0]] != null) {
        for (var fv in FACE_VARIANTS[faces[0]]) {
            write(
                handler,
                faces,
                fv,
                { face: faces[0], faceKeys: FACE_VARIANTS[faces[0]][fv] },
                true
            );
        }
    }
    if (!flexible && HANDLER_VARIANTS[handler] != null) {
        for (var hv in HANDLER_VARIANTS[handler]) {
            write(
                handler,
                faces,
                hv,
                { keys: HANDLER_VARIANTS[handler][hv] },
                false
            );
        }
    }
}

function writeAmdLoader() {
    try {
        var gc = new DIY(
            new File(prop('fx.amdScript')).toURI().toString(),
            'AHLCG',
            false
        );
        var s = gc.getSettings();
        var lines = [];
        for (var it = s.getKeySet().iterator(); it.hasNext();) {
            var k = String(it.next());
            if (k.indexOf('amd-') === 0)
                lines.push(k.substring(4) + ' ' + s.get(k));
        }
        if (lines.length === 0)
            throw new Error('the AMD loader handler recorded nothing');
        lines.sort();
        var file = new File(outDir, 'amd-loader.txt');
        java.nio.file.Files.writeString(file.toPath(), lines.join('\n') + '\n');
        record('OK', 'amd-loader', file);
    } catch (e) {
        record(
            'FAIL',
            'amd-loader',
            e.javaException ? e.javaException.toString() : String(e)
        );
    }
}

// Edits a flexible story card's text blocks through its editor: adding,
// typing, deleting, restyling and clearing. Writes the blocks after each step.
function writeTextBlocks() {
    try {
        var gc = new DIY('ArkhamHorrorLCG/diy/Flexible.js', 'AHLCG', false);
        selectFaces(gc, ['story', 'story']);
        var editor = gc.createDefaultEditor();
        var tabs = editor.getTabbedPane();
        var tab = tabs.getComponentAt(tabs.indexOfTab('Game Text: Front'));
        var s = gc.getSettings();
        var lines = [];

        // components of a type in the tab, in layout order
        function find(type) {
            var found = [];
            (function walk(c) {
                if (c instanceof type) found.push(c);
                var children = c.getComponents();
                for (var i = 0; i < children.length; ++i) walk(children[i]);
            })(tab);
            return found;
        }
        function button(label, index) {
            return find(javax.swing.JButton).filter(function (b) {
                return String(b.getText()) === label;
            })[index || 0];
        }
        function step(name) {
            var count = Number(s.get('BlockCount'));
            var areas = find(javax.swing.JTextArea);
            var blocks = [];
            for (var n = 1; n <= count; ++n) {
                blocks.push(
                    s.get('BlockStyle' + n) +
                        ' "' +
                        s.get('BlockText' + n) +
                        '"' +
                        (areas[n - 1] && !areas[n - 1].isEnabled()
                            ? ' (text disabled)'
                            : '')
                );
            }
            lines.push(
                name +
                    ': ' +
                    count +
                    ' block(s), ' +
                    areas.length +
                    ' row(s): ' +
                    blocks.join(', ')
            );
        }

        step('new');
        button('Add Block').doClick();
        button('Add Block').doClick();
        step('add twice');
        var areas = find(javax.swing.JTextArea);
        areas[0].setText('one');
        areas[1].setText('two');
        areas[2].setText('three');
        // deleting copies the typing first
        button('Delete', 1).doClick();
        step('type, delete second');
        find(javax.swing.JComboBox)[1].setSelectedIndex(5);
        step('second to rule');
        gc.clearAll();
        editor.populateFieldsFromComponent();
        step('clear');

        editor.dispose();
        var file = new File(outDir, 'text-blocks.txt');
        java.nio.file.Files.writeString(file.toPath(), lines.join('\n') + '\n');
        record('OK', 'text-blocks', file);
    } catch (e) {
        record(
            'FAIL',
            'text-blocks',
            e.javaException ? e.javaException.toString() : String(e)
        );
    }
}

// Widens and narrows each tab of each flexible card face's editor, writing the
// controls left outside their parent or the tab.
function writeEditorFit() {
    try {
        var lines = [];
        function layOut(c) {
            c.doLayout();
            c.getComponents().forEach(layOut);
        }
        function resize(tab, width) {
            tab.setSize(width, 2000);
            layOut(tab);
            layOut(tab);
        }
        function clipped(tab, width) {
            var found = [];
            (function walk(c) {
                var isControl =
                    c instanceof javax.swing.JComboBox ||
                    c instanceof javax.swing.JSpinner ||
                    c instanceof javax.swing.JButton ||
                    c instanceof javax.swing.text.JTextComponent;
                if (isControl) {
                    var inTab = javax.swing.SwingUtilities.convertRectangle(
                        c.getParent(),
                        c.getBounds(),
                        tab
                    );
                    if (
                        c.getX() < 0 ||
                        c.getX() + c.getWidth() > c.getParent().getWidth() ||
                        inTab.x < 0 ||
                        inTab.x + inTab.width > width
                    )
                        found.push(c.getClass().getSimpleName());
                }
                c.getComponents().forEach(walk);
            })(tab);
            return found;
        }
        FLEXIBLE.forEach(function (face) {
            var gc = new DIY('ArkhamHorrorLCG/diy/Flexible.js', 'AHLCG', false);
            selectFaces(gc, [face, face]);
            var editor = gc.createDefaultEditor();
            var tabs = editor.getTabbedPane();
            for (var i = 0; i < tabs.getTabCount(); ++i) {
                var tab = tabs.getComponentAt(i);
                var width = tab.getPreferredSize().width;
                resize(tab, width + 100);
                resize(tab, width);
                lines.push(
                    face +
                        ' / ' +
                        tabs.getTitleAt(i) +
                        ': ' +
                        (clipped(tab, width).join(' ') || 'fits')
                );
            }
            editor.dispose();
        });
        var file = new File(outDir, 'editor-fit.txt');
        java.nio.file.Files.writeString(file.toPath(), lines.join('\n') + '\n');
        record('OK', 'editor-fit', file);
    } catch (e) {
        record(
            'FAIL',
            'editor-fit',
            e.javaException ? e.javaException.toString() : String(e)
        );
    }
}

// Edits token blocks on a flexible token rules card through its editor, writing
// the blocks and the visible token check boxes after each step.
function writeTokenBlocks() {
    try {
        var gc = new DIY('ArkhamHorrorLCG/diy/Flexible.js', 'AHLCG', false);
        selectFaces(gc, ['tokenRules', 'tokenRules']);
        var editor = gc.createDefaultEditor();
        var tabs = editor.getTabbedPane();
        var tab = tabs.getComponentAt(tabs.indexOfTab('Game Text: Front'));
        var s = gc.getSettings();
        var lines = [];

        function find(type) {
            var found = [];
            (function walk(c) {
                if (c instanceof type) found.push(c);
                var children = c.getComponents();
                for (var i = 0; i < children.length; ++i) walk(children[i]);
            })(tab);
            return found;
        }
        function button(label, index) {
            return find(javax.swing.JButton).filter(function (b) {
                return String(b.getText()) === label;
            })[index || 0];
        }
        function check(label, index) {
            return find(javax.swing.JCheckBox).filter(function (b) {
                return String(b.getText()) === label;
            })[index || 0];
        }
        function step(name) {
            var blocks = [];
            for (var n = 1; n <= Number(s.get('BlockCount')); ++n) {
                blocks.push(
                    s.get('BlockStyle' + n) +
                        ' [' +
                        s.get('BlockTokens' + n, '') +
                        ']'
                );
            }
            var visible = find(javax.swing.JCheckBox).filter(function (b) {
                return b.getParent().isVisible();
            }).length;
            lines.push(
                name +
                    ': ' +
                    blocks.join(', ') +
                    '; ' +
                    visible +
                    ' check box(es) visible; ChaosFull ' +
                    s.get('ChaosFull')
            );
        }

        step('new');
        // the first combo box is the difficulty
        find(javax.swing.JComboBox)[1].setSelectedIndex(7);
        step('to token');
        check('Cultist').doClick();
        check('Skull').doClick();
        step('select cultist, skull');
        check('Cultist').doClick();
        step('clear cultist');
        check('Skull').doClick();
        check('Tablet').doClick();
        button('Add Block').doClick();
        step('add block');
        check('Full page').doClick();
        button('Delete', 1).doClick();
        step('full page, delete second');
        gc.clearAll();
        editor.populateFieldsFromComponent();
        step('clear');

        editor.dispose();
        var file = new File(outDir, 'token-blocks.txt');
        java.nio.file.Files.writeString(file.toPath(), lines.join('\n') + '\n');
        record('OK', 'token-blocks', file);
    } catch (e) {
        record(
            'FAIL',
            'token-blocks',
            e.javaException ? e.javaException.toString() : String(e)
        );
    }
}

// Chooses sets on a flexible card's Collection and Encounter Set tabs, writing
// the settings and the side toggles offered after each step.
function writeCollectorTabs() {
    try {
        var gc = new DIY('ArkhamHorrorLCG/diy/Flexible.js', 'AHLCG', false);
        selectFaces(gc, ['story', 'playerBack']);
        var editor = gc.createDefaultEditor();
        var tabs = editor.getTabbedPane();
        var s = gc.getSettings();
        var lines = [];

        function find(tab, type) {
            var found = [];
            (function walk(c) {
                if (c instanceof type) found.push(c);
                var children = c.getComponents();
                for (var i = 0; i < children.length; ++i) walk(children[i]);
            })(tab);
            return found;
        }
        function tab(title) {
            return tabs.getComponentAt(tabs.indexOfTab(title));
        }
        function select(title, value) {
            var list = find(tab(title), javax.swing.JComboBox)[0];
            for (var i = 0; i < list.getItemCount(); ++i) {
                if (String(list.getItemAt(i)) === value)
                    list.setSelectedIndex(i);
            }
        }
        function step(name) {
            var boxes = find(tab('Encounter Set'), javax.swing.JCheckBox).map(
                function (b) {
                    return b.getText();
                }
            );
            lines.push(
                name +
                    ': ' +
                    s.get('Collection') +
                    ' ' +
                    s.get('CollectionType') +
                    ', ' +
                    s.get('Encounter') +
                    ' ' +
                    s.get('EncounterType') +
                    ', copyright "' +
                    s.get('Copyright') +
                    '" [' +
                    find(tabs.getComponentAt(0), javax.swing.JCheckBox)
                        .map(function (b) {
                            return b.getText();
                        })
                        .join(', ') +
                    '], toggles [' +
                    boxes.join(', ') +
                    ']'
            );
        }

        step('story and player back');
        select('Collection', 'StrangeEons');
        select('Encounter Set', 'CustomEncounterSet');
        step('plug-in collection, custom encounter');
        select('Collection', 'CustomCollection');
        step('custom collection');
        s.set('Copyright', 'Test');
        step('copyright');
        gc.clearAll();
        editor.populateFieldsFromComponent();
        step('clear');

        editor.dispose();
        var file = new File(outDir, 'collector-tabs.txt');
        java.nio.file.Files.writeString(file.toPath(), lines.join('\n') + '\n');
        record('OK', 'collector-tabs', file);
    } catch (e) {
        record(
            'FAIL',
            'collector-tabs',
            e.javaException ? e.javaException.toString() : String(e)
        );
    }
}

// Switches a flexible card's faces through its editor, writing the tabs, the
// sheets' templates and the settings after each step.
function writeFaceSwitch() {
    try {
        var gc = new DIY('ArkhamHorrorLCG/diy/Flexible.js', 'AHLCG', false);
        var editor = gc.createDefaultEditor();
        var tabs = editor.getTabbedPane();
        var s = gc.getSettings();
        var general = tabs.getComponentAt(0);
        var lastSheet = null;
        var lines = [];

        function find(root, type) {
            var found = [];
            (function walk(c) {
                if (c instanceof type) found.push(c);
                var children = c.getComponents();
                for (var i = 0; i < children.length; ++i) walk(children[i]);
            })(root);
            return found;
        }
        function borderTitle(b) {
            if (b instanceof javax.swing.border.TitledBorder)
                return b.getTitle();
            if (b instanceof javax.swing.border.CompoundBorder)
                return (
                    borderTitle(b.getOutsideBorder()) ||
                    borderTitle(b.getInsideBorder())
                );
            return null;
        }
        function titles(root) {
            var found = [];
            find(root, javax.swing.JComponent).forEach(function (c) {
                var t = borderTitle(c.getBorder());
                if (t != null) found.push(t);
            });
            return found;
        }
        function select(side, id) {
            find(general, javax.swing.JComboBox)[side].setSelectedIndex(
                FLEXIBLE.indexOf(id)
            );
        }
        function textAreas(title) {
            return find(
                tabs.getComponentAt(tabs.indexOfTab(title)),
                javax.swing.JTextArea
            );
        }
        function step(name) {
            var sheet = editor.getSheetViewer(0).getSheet();
            var names = [];
            for (var t = 0; t < tabs.getTabCount(); ++t)
                names.push(tabs.getTitleAt(t));
            lines.push(
                name +
                    ': tabs [' +
                    names.join(', ') +
                    '], general [' +
                    titles(general).join(', ') +
                    '], front ' +
                    s.get('FrontFace') +
                    ', back ' +
                    s.get('BackFace') +
                    ', template ' +
                    s.get('AHLCG-FlexibleHandler-Front-template') +
                    ', name "' +
                    gc.getName() +
                    '", selected ' +
                    tabs.getTitleAt(tabs.getSelectedIndex()) +
                    ', front sheet replaced ' +
                    (sheet !== lastSheet) +
                    ', unsaved ' +
                    gc.hasUnsavedChanges()
            );
            lastSheet = sheet;
        }

        step('new');
        select(0, 'story');
        step('front story');
        select(1, 'scenarioRules');
        step('back rules');

        // typing survives the switch; replaced controls no longer write
        find(general, javax.swing.JTextArea)[0].setText('Named');
        var oldArea = textAreas('Game Text: Front')[0];
        oldArea.setText('old');
        select(0, 'scenarioRules');
        step('front rules');
        oldArea.setText('stale');
        var heartbeat =
            Packages.ca.cgjennings.apps.arkham.AbstractGameComponentEditor.__javaObject__.getDeclaredMethod(
                'onHeartbeat'
            );
        heartbeat.setAccessible(true);
        heartbeat.invoke(editor);
        lines.push(
            'name field ' +
                gc.getNameField().getText() +
                ', BlockText1 ' +
                s.get('BlockText1')
        );

        select(0, 'playerBack');
        step('front back');
        lines.push('name field ' + gc.getNameField());
        select(0, 'story');
        step('front story again');
        lines.push(
            'name field ' +
                gc.getNameField().getText() +
                ', text ' +
                textAreas('Game Text: Front')[0].getText()
        );

        // blocks left from the earlier story face still repopulate
        s.set('BlockCount', '2');
        s.set('BlockSpacing2', '0');
        editor.populateFieldsFromComponent();
        lines.push('populated rows ' + textAreas('Game Text: Front').length);

        // art portraits follow the faces; a side's art survives the other
        // side's switch, and a save
        function art(card) {
            var found = [];
            for (var i = 0; i < card.getPortraitCount(); ++i) {
                var p = card.getPortrait(i);
                var source = String(p.getSource());
                found.push(
                    p.getBaseKey() +
                        (source.indexOf('Spawn_of_the_Stars') >= 0
                            ? ' (art)'
                            : '')
                );
            }
            return 'portraits [' + found.join(', ') + ']';
        }
        select(1, 'enemy');
        step('back enemy');
        placeArt(gc.getPortrait(0));
        lines.push(art(gc));
        select(0, 'enemy');
        step('front enemy');
        lines.push(art(gc));
        select(0, 'story');
        step('front story with enemy back');
        lines.push(art(gc));
        var saved = File.createTempFile('face-switch', '.eon');
        ResourceKit.writeGameComponentToFile(saved, gc);
        lines.push('read: ' + art(ResourceKit.getGameComponentFromFile(saved)));
        saved['delete']();

        editor.dispose();
        var file = new File(outDir, 'face-switch.txt');
        java.nio.file.Files.writeString(file.toPath(), lines.join('\n') + '\n');
        record('OK', 'face-switch', file);
    } catch (e) {
        record(
            'FAIL',
            'face-switch',
            e.javaException ? e.javaException.toString() : String(e)
        );
    }
}

// Paints each variant twice per sheet, as a preview does, and lists those whose
// second paint differs from the first.
function writeRepaint() {
    var RenderTarget = Packages.ca.cgjennings.apps.arkham.sheet.RenderTarget;
    var lines = [];
    // a copy, since a sheet can reuse its image
    function pixels(image) {
        var w = image.getWidth(),
            h = image.getHeight();
        return image.getRGB(0, 0, w, h, null, 0, w);
    }
    function check(handler, faces, variant, extra, flexible) {
        var name =
            (flexible ? 'flexible/' + faces[0] : handler) + '/' + variant;
        try {
            var gc = build(handler, faces, variant, extra, flexible);
            var sheets = gc.createDefaultSheets();
            for (var i = 0; i < sheets.length; ++i) {
                var first = pixels(
                    sheets[i].paint(RenderTarget.PREVIEW, 150, false)
                );
                gc.markChanged(i);
                var second = pixels(
                    sheets[i].paint(RenderTarget.PREVIEW, 150, false)
                );
                if (!java.util.Arrays.equals(first, second))
                    lines.push(name + ' sheet ' + i);
            }
        } catch (e) {
            lines.push(
                name + ' FAIL ' + (e.javaException ? e.javaException : e)
            );
        }
    }
    function all(handler, faces, flexible) {
        check(handler, faces, 'default', null, flexible);
        check(handler, faces, 'filled', null, flexible);
        var seen = {};
        for (var f = 0; f < 2; ++f) {
            var type = faces[f];
            if (seen[type] || VARIANTS[type] == null) continue;
            seen[type] = true;
            for (var v in VARIANTS[type])
                check(
                    handler,
                    faces,
                    v,
                    { face: type, values: VARIANTS[type][v] },
                    flexible
                );
        }
        if (!flexible && HANDLER_VARIANTS[handler] != null) {
            for (var hv in HANDLER_VARIANTS[handler])
                check(
                    handler,
                    faces,
                    hv,
                    { keys: HANDLER_VARIANTS[handler][hv] },
                    false
                );
        }
    }
    for (var h in HANDLERS) all(h, HANDLERS[h], false);
    for (var i = 0; i < FLEXIBLE.length; ++i)
        all('Flexible', [FLEXIBLE[i], FLEXIBLE[i]], true);

    var file = new File(outDir, 'repaint.txt');
    java.nio.file.Files.writeString(
        file.toPath(),
        lines.length > 0 ? lines.join('\n') + '\n' : ''
    );
    record('OK', 'repaint', file);
}

// Paints each flexible face with the same data on both sides, before and
// after setting each text tab's spacing spinners through the editor, and
// lists the rows where the sides differ.
function writeSides() {
    var RenderTarget = Packages.ca.cgjennings.apps.arkham.sheet.RenderTarget;
    var lines = [];
    function rows(gc) {
        var sheets = gc.createDefaultSheets();
        var images = [0, 1].map(function (i) {
            return sheets[i].paint(RenderTarget.PREVIEW, 150, false);
        });
        var w = images[0].getWidth();
        var h = images[0].getHeight();
        var front = images[0].getRGB(0, 0, w, h, null, 0, w);
        var back = images[1].getRGB(0, 0, w, h, null, 0, w);
        var first = -1,
            last = -1;
        for (var i = 0; i < front.length; ++i) {
            if (front[i] !== back[i]) {
                var y = Math.floor(i / w);
                if (first < 0) first = y;
                last = y;
            }
        }
        return first < 0 ? 'same' : 'rows ' + first + '-' + last + ' differ';
    }
    function spinners(editor, title) {
        var tabs = editor.getTabbedPane();
        var index = tabs.indexOfTab(title);
        var found = [];
        if (index < 0) return found;
        (function walk(c) {
            if (c instanceof javax.swing.JSpinner) found.push(c);
            var children = c.getComponents();
            for (var i = 0; i < children.length; ++i) walk(children[i]);
        })(tabs.getComponentAt(index));
        return found;
    }
    FLEXIBLE.forEach(function (face) {
        try {
            var gc = build('Flexible', [face, face], 'filled', null, true);
            var settings = gc.getSettings();
            // the collection number's side suffix differs by design
            settings.set('ShowCollectionNumberFront', '0');
            settings.set('ShowCollectionNumberBack', '0');
            var line = face + ': ' + rows(gc);

            var editor = gc.createDefaultEditor();
            var set = 0;
            ['Game Text: Front', 'Game Text: Back'].forEach(function (title) {
                spinners(editor, title).forEach(function (spinner) {
                    spinner.setValue(new java.lang.Integer(5));
                    ++set;
                });
            });
            editor.dispose();
            if (set > 0) line += ', with ' + set + ' spacings set ' + rows(gc);
            lines.push(line);
        } catch (e) {
            lines.push(
                face + ' FAIL ' + (e.javaException ? e.javaException : e)
            );
        }
    });
    var file = new File(outDir, 'sides.txt');
    java.nio.file.Files.writeString(file.toPath(), lines.join('\n') + '\n');
    record('OK', 'sides', file);
}

try {
    for (var h in HANDLERS) {
        if (mode === 'defaults') writeDefaults(h, null);
        else writeAll(h, HANDLERS[h], false);
    }
    for (var i = 0; i < FLEXIBLE.length; ++i) {
        var faces = [FLEXIBLE[i], FLEXIBLE[i]];
        if (mode === 'defaults') writeDefaults('Flexible', faces);
        else writeAll('Flexible', faces, true);
    }
    if (mode === 'defaults') writeAmdLoader();
    if (mode === 'defaults') writeTextBlocks();
    if (mode === 'defaults') writeEditorFit();
    if (mode === 'defaults') writeTokenBlocks();
    if (mode === 'defaults') writeCollectorTabs();
    if (mode === 'defaults') writeFaceSwitch();
    if (mode === 'defaults') writeRepaint();
    if (mode === 'defaults') writeSides();
    results.println('DONE');
} finally {
    results.close();
}
