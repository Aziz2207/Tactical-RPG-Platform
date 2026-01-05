// For game creation and modification
export enum MapSize {
    Small = 'small',
    Medium = 'medium',
    Large = 'large',
}

export enum GameMode {
    Classic = 'GAME.MODE.CLASSIC',
    CaptureTheFlag = 'GAME.MODE.CTF',
}

export enum GameState {
  Public = "GAME.STATE.PUBLIC",
  Private = "GAME.STATE.PRIVATE",
  Shared = "GAME.STATE.SHARED",
}

export enum TileType {
    Ground = 1,
    Ice = 2,
    Water = 3,
    Wall = 4,
    ClosedDoor = 5,
    OpenDoor = 6,
}

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

// constants for tile cost
export enum TileCost {
    Ground = 1,
    Water = 2,
    Ice = 0,
    OpenDoor = 1,
}

export const enum XiphosEffect {
    Attack = 2,
    Defense = 1,
}
