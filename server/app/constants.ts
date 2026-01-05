import { Challenge, ChallengeKey } from "@common/interfaces/challenges";
import { Theme, ThemeOption } from "@common/interfaces/theme";

// Constants for waiting page access code generation
export const ACCESS_CODE_LENGTH = 4;
export const MAX_ACCESS_CODE_VALUE = 10000;

// Constants for map-mocks
export enum TileType {
    Ground = 1,
    Ice = 2,
    Water = 3,
    Wall = 4,
    ClosedDoor = 5,
    OpenDoor = 6,
}

export const GENERATE_COUNT = 5;
export const BASE_36 = 36;
export const TILE_COUNT = 6;
export const DIMENSION = 20;
export const NB_PLAYERS = 6;
export const COLUMN_LENGTH = 2;
export const ROW_LENGTH = 2;

export const NO_ITEM = 0;
export const RANDOM_ITEM = 1;
export const DEFAULT_ACTION_POINT = 1;
export const MAX_ACTION_POINT = 2;

export const SMALL_MAP_PLAYERS = 2;
export const MEDIUM_MAP_PLAYERS = 4;

export const SIZE_SMALL_MAP = 10;
export const SIZE_MEDIUM_MAP = 15;

export const DEFAULT_DATE = new Date();

export const SPAWN_POINT_ID = 8;

// constants for timer
export const WARNING_TIME = 3;
export const STARTING_TIME = 3;
export const TURN_TIME = 30;
export const FIGHT_TIME = 5;
export const TWO_BOTS_FIGHT_TIME = 1;
export const NO_EVASION_TIME = 3;
export const NO_ATTACK_TIME = 25;
export const MILLISECONDS_IN_SECOND = 1000;

export const MOVEMENT_TIME = 150;
export const FALLING_PROBABILITY = 0.1;

export const BOT_NAVIGATION_RANDOM = 0.5;

export const SINGLE_PLAYER = 1;
export const ROLL_DURATION = 800;

// constants for tests
export const FORWARD_TIME = 1000;
export const RANDOM_INT = 5;
export const MAX_RANGE = 3000;
export const SIZE_LARGE_MAP = 20;

export const VICTORIES = 3;
export const EVASION_SUCCESS_RATE = 0.4;
export const END_COMBAT_DELAY = 2500;
export const PLAYER_FELL_DELAY = 2500;

export const DEFAULT_ATTRIBUTE = 4;
export const HIGH_ATTRIBUTE = 6;
export const EQUAL_ODDS_SUCCESS = 0.6;
export const EQUAL_ODDS_PROBABILITY = 0.5;
export const EQUAL_ODDS_FAIL = 0.4;

export const MIN_DICE_VALUE = 1;

export const SECS_IN_HOUR = 3600;
export const SECS_IN_MIN = 60;
export const MINS_IN_HOUR = 60;
export const MAX_GENERATION_VALUE = 1000000000;
export const DISCONNECTED_POSITION = { x: 100, y: 100 };

export const enum LogType {
    StartTurn = "TURN",
    GiveUp = "GIVE_UP",
    OpenDoor = "OPEN_DOOR",
    CloseDoor = "CLOSE_DOOR",
    StartCombat = "START_COMBAT",
    WinCombat = "WIN_COMBAT",
    EvadeCombatFail = "EVADE_COMBAT_FAIL",
    EvadeCombatSuccess = "EVADE_COMBAT_SUCCESS",
    NoWinnerCombat = "NO_WINNER_COMBAT",
    AttackFail = "ATTACK_FAIL",
    AttackSuccess = "ATTACK_SUCCESS",
}

export const ICE_TILE_PENALTY_VALUE = 2;
export const XIPHOS_ATTACK_BONUS = 2;
export const XIPHOS_DEFENSE_PENALTY = 1;
export const MAX_OBJECT_EFFECT = 2;
export const MIN_OBJECT_EFFECT = 1;
export const ADD_OBEJCT_EFFECT_FACTOR = 1;
export const REMOVE_OBEJECT_EFFECT_FACTOR = -1;
export const INVENTORY_SIZE = 2;

export const DEFAULT_COMBAT_RESULT = {
    attackValues: { diceValue: 0, total: 0 },
    defenseValues: { diceValue: 0, total: 0 },
};

export const MODES = ["GAME.MODE.CTF", "GAME.MODE.CLASSIC"];

export const BACKGROUNDS_CATALOG = [
    {
        url: "./assets/images/backgrounds/title_page_bgd16.jpg",
        price: 0,
        title: "BACKGROUND.DEFAULT_ATHENA",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd19.jpg",
        price: 20,
        title: "BACKGROUND.SPARTAN_WARRIOR",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd20.jpg",
        price: 20,
        title: "BACKGROUND.DIONYSUS",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd21.jpg",
        price: 20,
        title: "BACKGROUND.HADES",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd22.jpg",
        price: 20,
        title: "BACKGROUND.PERSEPHONE",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd23.jpg",
        price: 20,
        title: "BACKGROUND.APOLLO",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd24.jpg",
        price: 20,
        title: "BACKGROUND.ATHENA",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd25.jpg",
        price: 20,
        title: "BACKGROUND.HEPHAESTUS",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd26.jpg",
        price: 20,
        title: "BACKGROUND.HERMES",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd27.jpg",
        price: 20,
        title: "BACKGROUND.DEMETER",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd28.jpg",
        price: 20,
        title: "BACKGROUND.ARTEMIS",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd29.jpg",
        price: 20,
        title: "BACKGROUND.POSEIDON",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd30.jpg",
        price: 20,
        title: "BACKGROUND.HERA",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd31.jpg",
        price: 20,
        title: "BACKGROUND.ZEUS",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd32.jpg",
        price: 20,
        title: "BACKGROUND.HESTIA",
    },
    {
        url: "./assets/images/backgrounds/title_page_bgd33.jpg",
        price: 20,
        title: "BACKGROUND.ARES",
    },
];

export const PURCHASABLE_AVATARS = [
    {
        id: 21,
        name: "Dionysus",
        src: "./assets/images/characters/Dionysus.webp",
        price: 30,
        title: "AVATAR.DIONYSUS",
        isTaken: false,
    },
    {
        id: 22,
        name: "Hades",
        src: "./assets/images/characters/Hades.webp",
        price: 30,
        title: "AVATAR.HADES",
        isTaken: false,
    },
    {
        id: 23,
        name: "Persephone",
        src: "./assets/images/characters/Persephone.webp",
        price: 30,
        title: "AVATAR.PERSEPHONE",
        isTaken: false,
    },
];

export const THEMES_CATALOG: ThemeOption[] = [
    {
        id: 0,
        value: Theme.Gold,
        label: "THEME.GOLD",
        colorClass: "gold",
        price: 10,
        owned: true,
    },
    {
        id: 1,
        value: Theme.Blue,
        label: "THEME.BLUE",
        colorClass: "blue",
        price: 10,
        owned: false,
    },
    {
        id: 2,
        value: Theme.Emerald,
        label: "THEME.EMERALD",
        colorClass: "emerald",
        price: 10,
        owned: false,
    },
    {
        id: 3,
        value: Theme.Ruby,
        label: "THEME.RUBY",
        colorClass: "ruby",
        price: 10,
        owned: false,
    },
    {
        id: 4,
        value: Theme.Amethyst,
        label: "THEME.AMETHYST",
        colorClass: "amethyst",
        price: 10,
        owned: false,
    },
    {
        id: 5,
        value: Theme.Obsidian,
        label: "THEME.OBSIDIAN",
        colorClass: "obsidian",
        price: 10,
        owned: false,
    },
    // {
    //     id: 6,
    //     value: Theme.Copper,
    //     label: "THEME.COPPER",
    //     colorClass: "copper",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 7,
    //     value: Theme.Cyberpunk,
    //     label: "THEME.CYBERPUNK",
    //     colorClass: "cyberpunk",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 8,
    //     value: Theme.Arctic,
    //     label: "THEME.ARCTIC",
    //     colorClass: "arctic",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 9,
    //     value: Theme.Aqua,
    //     label: "THEME.AQUA",
    //     colorClass: "aqua",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 10,
    //     value: Theme.McDonalds,
    //     label: "THEME.MCDONALDS",
    //     colorClass: "mcdonalds",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 11,
    //     value: Theme.Magenta,
    //     label: "THEME.MAGENTA",
    //     colorClass: "magenta",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 12,
    //     value: Theme.MyEyesBleed,
    //     label: "THEME.MY_EYES_BLEED",
    //     colorClass: "my-eyes-bleed",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 13,
    //     value: Theme.Sapphire,
    //     label: "THEME.SAPPHIRE",
    //     colorClass: "sapphire",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 14,
    //     value: Theme.SapphireCrimson,
    //     label: "THEME.SAPPHIRE_CRIMSON",
    //     colorClass: "sapphire-crimson",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 15,
    //     value: Theme.VerdantAmethyst,
    //     label: "THEME.VERDANT_AMETHYST",
    //     colorClass: "verdant-amethyst",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 16,
    //     value: Theme.DarkFlat,
    //     label: "THEME.DARK_FLAT",
    //     colorClass: "dark-flat",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 17,
    //     value: Theme.GoldFlat,
    //     label: "THEME.GOLD_FLAT",
    //     colorClass: "gold-flat",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 18,
    //     value: Theme.NavyFlat,
    //     label: "THEME.NAVY_FLAT",
    //     colorClass: "navy-flat",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 19,
    //     value: Theme.GreenFlat,
    //     label: "THEME.GREEN_FLAT",
    //     colorClass: "green-flat",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 20,
    //     value: Theme.RedFlat,
    //     label: "THEME.RED_FLAT",
    //     colorClass: "red-flat",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 20,
    //     value: Theme.TotalDark,
    //     label: "THEME.TOTAL_DARK",
    //     colorClass: "total-dark",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 21,
    //     value: Theme.Silver,
    //     label: "THEME.SILVER",
    //     colorClass: "silver",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 22,
    //     value: Theme.Crimson,
    //     label: "THEME.CRIMSON",
    //     colorClass: "crimson",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 23,
    //     value: Theme.Pink,
    //     label: "THEME.PINK",
    //     colorClass: "pink",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 24,
    //     value: Theme.GreenBlue,
    //     label: "THEME.GREEN_BLUE",
    //     colorClass: "green-blue",
    //     price: 10,
    //     owned: false,
    // },
    // {
    //     id: 25,
    //     value: Theme.BlackOrange,
    //     label: "THEME.BLACK_ORANGE",
    //     colorClass: "black-orange",
    //     price: 10,
    //     owned: false,
    // },
];

export const CHALLENGES: Challenge[] = [
  {
    id: 0,
    key: ChallengeKey.VisitedTiles,
    title: "CHALLENGES.EXPLORER.TITLE",
    description: "CHALLENGES.EXPLORER.DESCRIPTION",
    goal: 5,
    reward: 50,
  },
  {
    id: 1,
    key: ChallengeKey.Evasions,
    title: "CHALLENGES.STRATEGIC_RETREAT.TITLE",
    description: "CHALLENGES.STRATEGIC_RETREAT.DESCRIPTION",
    goal: 1,
    reward: 50,
  },
  {
    id: 2,
    key: ChallengeKey.Items,
    title: "CHALLENGES.RELIC_HUNTER.TITLE",
    description: "CHALLENGES.RELIC_HUNTER.DESCRIPTION",
    goal: 1,
    reward: 50,
  },
  {
    id: 3,
    key: ChallengeKey.Wins,
    title: "CHALLENGES.SPILLED_BLOOD.TITLE",
    description: "CHALLENGES.SPILLED_BLOOD.DESCRIPTION",
    goal: 1,
    reward: 50,
  },
  {
    id: 4,
    key: ChallengeKey.DoorsInteracted,
    title: "CHALLENGES.DOOR_MASTER.TITLE",
    description: "CHALLENGES.DOOR_MASTER.DESCRIPTION",
    goal: 1,
    reward: 50,
  },
];

export const MOCK_CHALLENGE: Challenge = {
    id: 5,
    key: ChallengeKey.DoorsInteracted,
    title: "Mock Challenge",
    description: "This is a mock challenge",
    goal: -1,
    reward: -1,
}