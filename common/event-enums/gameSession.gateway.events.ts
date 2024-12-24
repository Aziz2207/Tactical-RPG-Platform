export enum GameSessionEvents {
    CreateRoom = 'createRoom',
    CreateAck = 'createAck',
    CreateFailed = 'createFailed',

    JoinRoom = 'joinRoom',
    JoinAck = 'joinAck',
    JoinFailed = 'joinFailed',

    LeaveRoom = 'leaveRoom',

    PlayersUpdate = 'playersUpdate',
    PlayerUpdate = 'updatePlayerInfo',
    RemovedFromRoom = 'removedFromRoom',
    RemovePlayer = 'removePlayer',
    TakenCharactersUpdate = 'takenCharactersUpdate',

    RoomLockToggled = 'roomLockToggled',
    ToggeLock = 'toggleLock',

    HostLeft = 'hostLeft',
    UpdatePlayerInfo = 'updatePlayerInfo',
    UpdateAttribute = 'updateAttribute',
    UpdatePlayerSpeed = 'updatePlayerSpeed',

    AddVirtualPlayer = 'addVirtualPlayer',
    RoomDestroyed = 'roomDestroyed',

    PlayerLeft = 'playerLeft',
}
