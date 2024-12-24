// import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { GameService, GameState } from '@app/services/game.service';
// import { Attributes } from '@common/Interfaces/attributes';
// import { Player } from '@common/Interfaces/player';
// import { PlayerListGameComponent } from './player-list-game.component';

// describe('PlayerListGameComponent', () => {
//     let component: PlayerListGameComponent;
//     let fixture: ComponentFixture<PlayerListGameComponent>;
//     let mockGameService: jasmine.SpyObj<GameService>;

//     const createMockPlayers = (): Player[] => [
//         {
//             userName: 'Lyna',
//             attributes: { speedPoints: 4, lifePoints: 4, offensePoints: 4, defensePoints: 4 } as Attributes,
//             characterType: 'aero',
//             isHost: true,
//             socketId: '',
//             nbWins: 0,
//             hasActed: false,
//         },
//         {
//             userName: 'Delany',
//             attributes: { speedPoints: 4, lifePoints: 4, offensePoints: 4, defensePoints: 4 } as Attributes,
//             characterType: 'elec',
//             isHost: false,
//             socketId: '',
//             nbWins: 0,
//             hasActed: false,
//         },
//     ];

//     beforeEach(async () => {
//         const mockPlayers = createMockPlayers();
//         const mockGameState: GameState = {
//             map: { _size: 10 },
//             players: mockPlayers,
//         } as GameState;

//         mockGameService = jasmine.createSpyObj('GameService', [], {
//             gameState: mockGameState,
//         });

//         await TestBed.configureTestingModule({
//             imports: [PlayerListGameComponent, CommonModule], // Include CommonModule for ngIf, ngFor, etc.
//             providers: [{ provide: GameService, useValue: mockGameService }],
//         }).compileComponents();

//         fixture = TestBed.createComponent(PlayerListGameComponent);
//         component = fixture.componentInstance;
//         fixture.detectChanges();
//     });

//     it('should create', () => {
//         expect(component).toBeTruthy();
//     });

//     it('should correctly identify a deleted player', () => {
//         component.ngOnInit();
//         const deletedPlayer = { ...createMockPlayers()[1], userName: 'DeletedPlayer' };
//         expect(component.isPlayerDeleted(deletedPlayer)).toBeTrue();
//     });

//     it('should set the players and initplayer on effect', () => {
//         const mockPlayers = createMockPlayers();
//         // Simulate effect trigger
//         component['gameService'].gameState.players = mockPlayers;
//         component.ngOnInit(); // Manually trigger ngOnInit to initialize players
//         expect(component.players).toEqual(mockPlayers);
//         expect(component.initplayer).toEqual(mockPlayers.map((player) => ({ ...player })));
//         expect(component.playersIn).toBeTrue();
//     });

//     it('should initialize players and initplayer in the effect', () => {
//         const mockPlayers = createMockPlayers();
//         mockGameService.getPlayers.and.returnValue(mockPlayers);
//         component = new PlayerListGameComponent(mockGameService);
//         expect(component.players).toEqual(mockPlayers);
//         expect(component.initplayer).toEqual(mockPlayers);
//     });

//     it('should reset playersIn on ngOnDestroy', () => {
//         component.ngOnDestroy();
//         expect(component.playersIn).toBeFalse();
//     });

//     it('should render the player list with correct classes and player details', () => {
//         component.ngOnInit(); // Initialize component state
//         fixture.detectChanges(); // Trigger change detection to update the template

//         const playerElements = fixture.debugElement.queryAll(By.css('.player'));
//         expect(playerElements.length).toBe(2); // There are 2 players in our mock data

//         // Check if the host class is applied to the correct player
//         const hostPlayer = playerElements.find((el) => el.nativeElement.querySelector('.host'));
//         expect(hostPlayer).toBeTruthy(); // Lyna should be the host

//         // Check if the active player class is applied correctly
//         const activePlayer = playerElements.find((el) => el.nativeElement.querySelector('.yourTurn'));
//         expect(activePlayer).toBeFalsy(); // No active player initially (should be updated in further tests)

//         // Check if the correct image for a player is loaded
//         const playerImage = playerElements[0].nativeElement.querySelector('img');
//         expect(playerImage.src).toContain('assets/characters/waitingRoom/aero.png'); // For Lyna
//     });

//     it('should display the correct number of wins for each player', () => {
//         component.ngOnInit();
//         fixture.detectChanges(); // Trigger change detection

//         const playerElements = fixture.debugElement.queryAll(By.css('.player'));
//         const winsElement = playerElements[0].nativeElement.querySelector('.nb-wins');
//         expect(winsElement.textContent).toContain('0'); // Both players have 0 wins initially
//     });

//     it('should apply "dead" class for deleted players', () => {
//         component.ngOnInit();
//         fixture.detectChanges();

//         // Simulate a deleted player
//         // const deletedPlayer = { ...createMockPlayers()[1], userName: 'DeletedPlayer' };
//         component.players = [createMockPlayers()[0]]; // Remove Delany to simulate deletion
//         fixture.detectChanges();

//         const playerElements = fixture.debugElement.queryAll(By.css('.player'));
//         const deletedPlayerImage = playerElements[0].nativeElement.querySelector('img');
//         expect(deletedPlayerImage.classList).toContain('dead'); // Lyna should have "dead" class
//     });

//     it('should not update initplayer when players are added after initial load', () => {
//         const mockPlayers = createMockPlayers();
//         mockGameService.getPlayers.and.returnValue(mockPlayers);
//         component = new PlayerListGameComponent(mockGameService);

//         const newPlayer = { ...mockPlayers[0], userName: 'NewPlayer' };
//         mockGameService.getPlayers.and.returnValue([...mockPlayers, newPlayer]);

//         // Trigger the effect
//         TestBed.inject(GameService);

//         expect(component.players).toContain(newPlayer);
//         expect(component.initplayer).not.toContain(newPlayer);
//     });

//     it('should set playersIn to false on destroy', () => {
//         component.ngOnDestroy();
//         expect(component['playersIn']).toBeFalse();
//     });

//     it('should display the correct number of wins', () => {
//         const players = createMockPlayers();
//         players[0].nbWins = 3;
//         mockGameService.gameState.players = players;
//         component.ngOnInit();
//         fixture.detectChanges();

//         const winSpans = fixture.nativeElement.querySelectorAll('.nb-wins');
//         expect(winSpans[0].textContent).toContain('3');
//     });
// });
