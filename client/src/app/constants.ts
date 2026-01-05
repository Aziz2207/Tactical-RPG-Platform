import {
  GlobalPostGameStat,
  GlobalStatType,
} from "@common/interfaces/global-post-game-stats";
import {
  PlayerStatType,
  PostGameStat,
} from "@common/interfaces/post-game-stat";
import { Theme, ThemeOption } from "@common/interfaces/theme";
import { Challenge, ChallengeKey } from "@common/interfaces/challenges";

export const MAX_INVENTORY_ITEMS = 2;

// Constants for the number of items and spawn points for each type of map
export const MIN_NB_ITEMS = 2;
export const NB_ITEMS_SMALL_MAP = 2;
export const NB_ITEMS_MEDIUM_MAP = 4;
export const NB_ITEMS_LARGE_MAP = 6;

// Constants for the height/width of each type of map
export const SIZE_SMALL_MAP = 10;
export const SIZE_MEDIUM_MAP = 15;
export const SIZE_LARGE_MAP = 20;
export const TEST_INVALID_SIZE = 12;

// Constants for edition page input min/max lengths
export const MIN_LEN_MAP_TITLE = 3;
export const MAX_LEN_MAP_TITLE = 30;
export const MIN_LEN_MAP_DESCRIPTION = 10;
export const MAX_LEN_MAP_DESCRIPTION = 128;

// To validate a door position on a map
export const DIRECTIONS = [
  { x: 0, y: 1 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: -1, y: 0 },
];

export const OBJECT_COUNT_MAP: { [key: string]: number } = {
  small: NB_ITEMS_SMALL_MAP,
  medium: NB_ITEMS_MEDIUM_MAP,
  large: NB_ITEMS_LARGE_MAP,
};

// Constants for initial count of game objects
export const ITEM_COUNT = 1;

export enum ObjectType {
  Trident = 1,
  Armor = 2,
  Sandal = 3,
  Lightning = 4,
  Xiphos = 5,
  Kunee = 6,
  Random = 7,
  Spawn = 8,
  Hestia = 9,
  Zeus = 10,
  Hera = 11,
  Poseidon = 12,
  Artemis = 13,
  Demeter = 14,
  Hermes = 15,
  Athena = 16,
  Hephaestus = 17,
  Apollo = 18,
  Ares = 19,
  Aphrodite = 20,
  Flag = 21,
  Dionysus = 22,
  Hades = 23,
  Persephone = 24,
}

// For no object in grid
export const NO_OBJECT = 0;

// Constants for the size of the dialob box for the creation of a map
export const WIDTH_DIALOG = "40%";
export const HEIGHT_DIALOG = "50%";

// Constants for tests
export const NO_ITEM = 0;
export const RANDOM_ITEM = 1;

// Constants for the map validation to check all the necessary stuff
export const CHECK_BEFORE_SAVING_DELAY = 500;
export const VALIDATION_DURATION = 500;

export const TEST_VALIDATION_DURATION = 1200;

// Constant for the time of the snackbar message
export const MESSAGE_DURATION_ERROR = 4000;
export const MESSAGE_DURATION_CHARACTER_FORM = 2000;
export const MESSAGE_DURATION_SAVE_CHOICE = 3000;
export const MESSAGE_DURATION_VALIDATION_ERROR = 2000;

// Constant for the padding length of the date
export const PAD_LENGTH = 2;

// Constants for attribut values
export const DEFAULT_ATTRIBUTE = 4;
export const HIGH_ATTRIBUTE = 6;
export const DICE_4 = "4 + (1-4)";
export const DICE_6 = "4 + (1-6)";
export const DEFAULT_ACTION_POINT = 1;
export const MAX_ACTION_POINT = 2;
export const DEFAULT_EVASION_POINT = 2;

// Constants for the maximum size of a file
export const BYTES_PER_KILOBYTE = 1024;
export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES =
  MAX_FILE_SIZE_MB * BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;

export enum ErrorMessages {
  MissingAttributes = "ERROR.MISSING_ATTRIBUTES",
  MissingName = "ERROR.MISSING_NAME",
  MissingAvatar = "ERROR.MISSING_AVATAR",
  NameWithSpace = "ERROR.NAME_WITH_SPACE",
  TitleInvalidLength = "ERROR.TITLE_INVALID_LENGTH",
  NameAlreadyExists = "ERROR.NAME_ALREADY_EXISTS",
  InvalidFile = "ERROR.INVALID_FILE",
  InvalidTilesDimensions = "ERROR.INVALID_TILES_DIMENSIONS",
  InvalidDimension = "ERROR.INVALID_DIMENSION",
  InvalidTileType = "ERROR.INVALID_TILE_TYPE",
  InvalidObjectType = "ERROR.INVALID_OBJECT_TYPE",
  InvalidNbFlags = "ERROR.INVALID_NB_FLAGS",
  FileTooLarge = "ERROR.FILE_TOO_LARGE",
  InvalidMode = "ERROR.INVALID_MODE",
  InvalidNbPlayers = "ERROR.INVALID_NB_PLAYERS",
  InvalidNbObjects = "ERROR.INVALID_NB_OBJECTS",
}

// Constants for timer component
export const TOTAL_TIME = 60;
export const WARNING_TIME = 3;
export const TIMER_RADIUS = 45;
export const MILLISECONDS_IN_SECOND = 1000;
export const TIMER_CENTER_POSITION = 50;
export const ATTACK_TIME = 5;

export const TEMP_DIALOG_DURATION = 1500;
export const LONG_TEMP_DIALOG_DURATION = 4500;
export const EVADE_SUCCES_RATE = 0.4;
export const COMBAT_TURN_LENGTH = 5;
export const SHORT_COMBAT_TURN_LENGTH = 3;

export const ROLL_DURATION = 800;

export const INIT_DISPLAY_DELAY = 50;
export const EXIT_COMBAT_DELAY = 4000;
export const INACTIVE_DICE_DELAY = 200;
export const DISPLAY_TEXT_DELAY = 300;
export const ATTACK_DELAY = 1200;
export const TURN_DIALOG_DELAY = 1000;
export const START_TURN_TIMER_DELAY = 2000;
export const DISPLAY_DICE_DELAY = 1300;
export const ROLL_DICE_DELAY = 4000;

export const FAIL_EVASION_RANDOM_NUM = 0.5;
export const SUCCES_EVASION_RANDOM_NUM = 0.1;
export const TIMER_ARC_WIDTH = 5;

// Constants for random generation
export const MAX_GENERATION_VALUE = 1000000000;

// Constants for timer
export const STARTING_TIME = 3;
export const TURN_TIME = 30;

// Constants for main page test
export const NUMBER_OF_TEAM_MEMBERS = 6;

// Constants for tiles button in map editor
export enum TileId {
  Water = "water-tile",
  Ice = "ice-tile",
  Wall = "wall-tile",
  Door = "door-tile",
}
export enum TileButtonName {
  Water = "TILES.WATER.NAME",
  Ice = "TILES.ICE.NAME",
  Door = "TILES.DOOR.NAME",
  Wall = "TILES.WALL.NAME",
}

export enum TileClass {
  Water = "water",
  Ice = "ice",
  Door = "door",
  Wall = "wall",
}

export const NAVIGATION_DELAY = 150;

// Maximum number of players in a room
export const MAX_PLAYER_SMALL_MAP = 2;
export const MAX_PLAYER_MEDIUM_MAP = 4;
export const MAX_PLAYER_LARGE_MAP = 6;

// Constants for the maximum number of players for each type of map
export const MAX_NUMBER_PLAYER: { [key: string]: number } = {
  small: MAX_PLAYER_SMALL_MAP,
  medium: MAX_PLAYER_MEDIUM_MAP,
  large: MAX_PLAYER_LARGE_MAP,
};

// Constant for the minimum number of players for each type of map
export const MIN_NUMBER_PLAYER = 2;

// Constant for only player
export const SINGLE_PLAYER = 1;

// Constants for dialog
export enum DialogOptions {
  Close = "DIALOG.CLOSE",
  Confirm = "DIALOG.CONFIRM",
  Cancel = "DIALOG.CANCEL",
  Quit = "DIALOG.QUIT",
  Stay = "DIALOG.STAY",
}

export enum DialogTitle {
  StartGame = "DIALOG.TITLE.START_GAME",
  GameCanceled = "DIALOG.TITLE.GAME_CANCELED",
  QuitGame = "DIALOG.TITLE.QUIT_GAME",
  KickedOut = "DIALOG.TITLE.KICKED_OUT",
  DrawGame = "DIALOG.TITLE.DRAW_GAME",
  EndTurn = "DIALOG.TITLE.END_TURN",
  EndGame = "DIALOG.TITLE.END_GAME",
  EndFight = "DIALOG.TITLE.END_FIGHT",
  DefaultFightWin = "DIALOG.TITLE.DEFAULT_FIGHT_WIN",
  SuccessEvasion = "DIALOG.TITLE.SUCCESS_EVASION",
  MaxPlayers = "DIALOG.TITLE.MAX_PLAYERS",
  AddBotWhenLocked = "DIALOG.TITLE.ADD_BOT_WHEN_LOCKED",
  ItemExchange = "DIALOG.TITLE.ITEM_EXCHANGE",
  QuitPostGameLobby = "DIALOG.TITLE.QUIT_POST_GAME_LOBBY",
}

export enum DialogMessages {
  NotEnoughPlayers = "DIALOG.MESSAGE.NOT_ENOUGH_PLAYERS",
  ConfirmStartGame = "DIALOG.MESSAGE.CONFIRM_START_GAME",
  RoomLocked = "DIALOG.MESSAGE.ROOM_LOCKED",
  QuitGame = "DIALOG.MESSAGE.QUIT_GAME",
  KickedOut = "DIALOG.MESSAGE.KICKED_OUT",
  DrawGame = "DIALOG.MESSAGE.DRAW_GAME",
  Fell = "DIALOG.MESSAGE.FELL",
  EndFight = "DIALOG.MESSAGE.END_FIGHT",
  DefaultFightWin = "DIALOG.MESSAGE.DEFAULT_FIGHT_WIN",
  MaxPlayers = "DIALOG.MESSAGE.MAX_PLAYERS",
  AddBotWhenLocked = "DIALOG.MESSAGE.ADD_BOT_WHEN_LOCKED",
  QuitPostGameLobby = "DIALOG.MESSAGE.QUIT_POST_GAME_LOBBY",
}

export enum DialogResult {
  Right = "right",
  Left = "left",
  Close = "close",
}

export const INVALID_TILES_TYPE = 999;

export const INFO_DIALOG_TIME = 2500;

export const SECS_IN_HOUR = 3600;
export const SECS_IN_MIN = 60;
export const MINS_IN_HOUR = 60;

export const TOTAL_PERCENTAGE = 100;

export const VICTORIES_FOR_WIN = 3;

export const PLAYER_STAT_TYPES: PostGameStat[] = [
  {
    id: 0,
    key: PlayerStatType.Combats,
    displayText: "POST_GAME_LOBBY.STATS.COMBATS",
    explanations: "Nombre de combats participés par le joueur",
  },
  {
    id: 1,
    key: PlayerStatType.Victories,
    displayText: "POST_GAME_LOBBY.STATS.VICTORIES",
    explanations:
      "Résultats des combats du joueur sous la forme victoires/évasions/défaites",
  },
  {
    id: 2,
    key: PlayerStatType.DamageDealt,
    displayText: "POST_GAME_LOBBY.STATS.DMG_DEALT",
    explanations:
      "Nombre de points de dégats infligés sur les joueurs adverses",
  },
  {
    id: 3,
    key: PlayerStatType.DamageTaken,
    displayText: "POST_GAME_LOBBY.STATS.DMG_TAKEN",
    explanations: "Nombre de points de dégats subis par le joueur",
  },
  {
    id: 4,
    key: PlayerStatType.ItemsObtained,
    displayText: "POST_GAME_LOBBY.STATS.OBJECTS_TAKEN",
    explanations:
      "Nombre d'objets distincts ramassés par le joueur au cours de la partie",
  },
  {
    id: 5,
    key: PlayerStatType.TilesVisited,
    displayText: "POST_GAME_LOBBY.STATS.PCT_TILES_VISITED",
    explanations: "Pourcentage des tuiles de terrain visités par le joueur",
  },
];

export const GLOBAL_STAT_TYPES: GlobalPostGameStat[] = [
  {
    id: 0,
    key: GlobalStatType.GameDuration,
    displayText: "POST_GAME_LOBBY.STATS.GAME_LENGTH",
    explanations:
      "Temps écoulé depuis le début de la partie jusqu'à la fin de la partie",
  },
  {
    id: 1,
    key: GlobalStatType.Turns,
    displayText: "POST_GAME_LOBBY.STATS.TURNS",
    explanations: "Somme des tours de tous les joueurs de cette partie",
  },
  {
    id: 2,
    key: GlobalStatType.GlobalTilesVisited,
    displayText: "POST_GAME_LOBBY.STATS.GLOBAL_TILES_VISITED",
    explanations:
      "Pourcentage des tuiles de terrain visitées par au moins un joueur",
  },
  {
    id: 3,
    key: GlobalStatType.DoorsInteracted,
    displayText: "POST_GAME_LOBBY.STATS.PCT_DOORS_INTEREACTED",
    explanations:
      "Pourcentage des portes ayant été manipulées au moins une fois",
  },
  {
    id: 4,
    key: GlobalStatType.NbFlagBearers,
    displayText: "POST_GAME_LOBBY.STATS.NB_FLAG_BEARERS",
    explanations:
      "Nombre de joueurs différents ayant détenu le drapeau (si applicable)",
  },
];

export enum SortOrder {
  Unsorted = "unsorted",
  Ascending = "ascending",
  Descending = "descending",
}

export const WINNER_PRIZE = 100;
export const LOSER_PRIZE = 20;

export const AVATARS: string[] = [
  "./assets/images/characters/Aphrodite.webp",
  "./assets/images/characters/Apollo.webp",
  "./assets/images/characters/Ares.webp",
  "./assets/images/characters/Artemis.webp",
  "./assets/images/characters/Athena.webp",
  "./assets/images/characters/Demeter.webp",
  "./assets/images/characters/Hephaestus.webp",
  "./assets/images/characters/Hera.webp",
  "./assets/images/characters/Hermes.webp",
  "./assets/images/characters/Hestia.webp",
  "./assets/images/characters/Poseidon.webp",
  "./assets/images/characters/Zeus.webp",
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
  //   id: 6,
  //   value: Theme.Copper,
  //   label: "THEME.COPPER",
  //   colorClass: "copper",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 7,
  //   value: Theme.Cyberpunk,
  //   label: "THEME.CYBERPUNK",
  //   colorClass: "cyberpunk",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 8,
  //   value: Theme.Arctic,
  //   label: "THEME.ARCTIC",
  //   colorClass: "arctic",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 9,
  //   value: Theme.Aqua,
  //   label: "THEME.AQUA",
  //   colorClass: "aqua",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 10,
  //   value: Theme.McDonalds,
  //   label: "THEME.MCDONALDS",
  //   colorClass: "mcdonalds",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 11,
  //   value: Theme.Magenta,
  //   label: "THEME.MAGENTA",
  //   colorClass: "magenta",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 12,
  //   value: Theme.MyEyesBleed,
  //   label: "THEME.MY_EYES_BLEED",
  //   colorClass: "my-eyes-bleed",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 13,
  //   value: Theme.Sapphire,
  //   label: "THEME.SAPPHIRE",
  //   colorClass: "sapphire",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 14,
  //   value: Theme.SapphireCrimson,
  //   label: "THEME.SAPPHIRE_CRIMSON",
  //   colorClass: "sapphire-crimson",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 15,
  //   value: Theme.VerdantAmethyst,
  //   label: "THEME.VERDANT_AMETHYST",
  //   colorClass: "verdant-amethyst",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 16,
  //   value: Theme.DarkFlat,
  //   label: "THEME.DARK_FLAT",
  //   colorClass: "dark-flat",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 17,
  //   value: Theme.GoldFlat,
  //   label: "THEME.GOLD_FLAT",
  //   colorClass: "gold-flat",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 18,
  //   value: Theme.NavyFlat,
  //   label: "THEME.NAVY_FLAT",
  //   colorClass: "navy-flat",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 19,
  //   value: Theme.GreenFlat,
  //   label: "THEME.GREEN_FLAT",
  //   colorClass: "green-flat",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 20,
  //   value: Theme.RedFlat,
  //   label: "THEME.RED_FLAT",
  //   colorClass: "red-flat",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 20,
  //   value: Theme.TotalDark,
  //   label: "THEME.TOTAL_DARK",
  //   colorClass: "total-dark",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 21,
  //   value: Theme.Silver,
  //   label: "THEME.SILVER",
  //   colorClass: "silver",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 22,
  //   value: Theme.Crimson,
  //   label: "THEME.CRIMSON",
  //   colorClass: "crimson",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 23,
  //   value: Theme.Pink,
  //   label: "THEME.PINK",
  //   colorClass: "pink",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 24,
  //   value: Theme.GreenBlue,
  //   label: "THEME.GREEN_BLUE",
  //   colorClass: "green-blue",
  //   price: 10,
  //   owned: false,
  // },
  // {
  //   id: 25,
  //   value: Theme.BlackOrange,
  //   label: "THEME.BLACK_ORANGE",
  //   colorClass: "black-orange",
  //   price: 10,
  //   owned: false,
  // },
];

export const MODIFY_USER_ERRORS: Record<string, string> = {
  EMAIL_REQUIRED: "Adresse e-mail requise",
  EMAIL_INVALID: "Adresse e-mail invalide",
  USERNAME_REQUIRED: "Pseudonyme requis",
  USERNAME_LENGTH: "Pseudonyme doit contenir entre 3 et 20 caractères",
  EMAIL_EXISTS: "Adresse courriel déjà associée à un compte",
  USERNAME_EXISTS: "Pseudonyme existe déjà",
};

/**
 * Reversed map: message -> key
 * If multiple keys share the same message, the first encountered key is kept.
 */
export const REVERSED_MODIFY_USER_ERRORS: Record<string, string> = (() => {
  return Object.entries(MODIFY_USER_ERRORS).reduce<Record<string, string>>(
    (acc, [k, v]) => {
      if (!(v in acc))
        acc[v] = `SETTINGS_PAGE.SECTIONS.MODIFY_ACCOUNT_ERRORS.${k}`;
      return acc;
    },
    {}
  );
})();

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