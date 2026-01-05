import { CommonModule } from "@angular/common";
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  ErrorMessages,
  MESSAGE_DURATION_VALIDATION_ERROR,
  MOCK_CHALLENGE,
} from "@app/constants";
import { defaultPostGameStats } from "@app/default-attributes";
import { AttributesService } from "@app/services/attributes/attributes.service";
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";
import { BackgroundService } from "@app/services/user-account/background/background.service";
import { DEFAULT_AVATARS } from "@common/avatars-info";
import {
  Attributes,
  Avatar,
  Behavior,
  Player,
  Status,
} from "@common/interfaces/player";
import { GameAvailability } from "@common/interfaces/room";
import { A11yModule } from "@angular/cdk/a11y";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { Game } from "@common/interfaces/game";

@Component({
  selector: "app-character-creator",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    FormsModule,
    A11yModule,
    TranslateModule,
    MatSlideToggleModule,
  ],
  templateUrl: "./character-creator.component.html",
  styleUrls: ["./character-creator.component.scss"],
})
export class CharacterCreatorComponent implements OnInit, OnDestroy {
  @Input() availableAvatars: Avatar[] = [];
  @Input() showAvailabilityOptions: boolean = false;
  @Input() roomEntryFee?: number = 0;
  @Input() selectedGame?: Game | null = null;
  @Output() closeCharacterCreator = new EventEmitter<void>();
  @Output() confirmCharacterSelection = new EventEmitter<{
    player: Player;
    availability: GameAvailability;
    entryFee: number;
    quickEliminationEnabled: boolean;
  }>();
  @Output() selectCharacter = new EventEmitter<Avatar>();

  avatars: Avatar[] = DEFAULT_AVATARS;
  clickedAvatar: Avatar | undefined;
  characterName: string =
    this.userAccountService.accountDetails()?.username || "John Smith";
  selectedAvailability: GameAvailability = GameAvailability.Public;
  quickEliminationEnabled: boolean = false;
  player: Player;
  attributes: Attributes;
  userBalance: number = 0;
  maxEntryFee: number = 200;

  GameAvailability = GameAvailability;
  entryFee: number = 0;

  constructor(
    private attributesService: AttributesService,
    private snackBar: MatSnackBar,
    private userAccountService: UserAccountService,
    private backgroundService: BackgroundService,
    private translate: TranslateService,
  ) {
    this.attributesService.resetAttributes();
  }

  async ngOnInit(): Promise<void> {
    try {
      this.userBalance = await this.backgroundService.getBalance();
    } catch (error) {
      console.error("Failed to load user balance:", error);
      this.userBalance = 0;
    }
  }

  ngOnDestroy(): void {
    this.resetClickedImage();
    this.clickedAvatar = undefined;
  }

  setName(name: string) {
    this.characterName = name;
  }

  closeComponent() {
    this.attributesService.resetAttributes();
    this.setAttributes();
    this.closeCharacterCreator.emit();
  }

  resetClickedImage() {
    if (this.clickedAvatar) {
      this.clickedAvatar.isSelected = false;
    }
  }

  getClickedImage(avatar: Avatar) {
    this.resetClickedImage();
    avatar.isSelected = true;
    this.clickedAvatar = avatar;
    this.selectCharacter.emit(this.clickedAvatar);
  }

  setAvailability(availability: GameAvailability) {
    this.selectedAvailability = availability;
  }

  isAvailabilitySelected(availability: GameAvailability): boolean {
    return this.selectedAvailability === availability;
  }

  onEntryFeeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = parseInt(target.value, 10);
    this.entryFee = value;

    const progress = (value / this.maxEntryFee) * 100;
    target.style.setProperty("--slider-progress", `${progress}%`);
  }

  isButtonSelected(buttonName: string) {
    return this.attributesService.isButtonSelected(buttonName);
  }

  getAttributeValue(attribute: keyof Attributes) {
    return this.attributesService.getAttributeValue(attribute);
  }

  addHealth() {
    this.attributesService.setHealth();
  }

  addSpeed() {
    this.attributesService.setSpeed();
  }

  setAttack(dice: string) {
    this.attributesService.setAttack(dice);
  }

  setDefense(dice: string) {
    this.attributesService.setDefense(dice);
  }

  diceDisplay(chosenAttribute: keyof Attributes) {
    return this.attributesService.getDiceMessage(chosenAttribute);
  }

  saveChoices() {
    this.attributesService.setCharacterName(this.characterName);
    const saveStatus = this.attributesService.saveAttributesValue();

    if (!this.clickedAvatar) {
      this.showSaveErroMessage(
        this.translate.instant(ErrorMessages.MissingAvatar)
      );
      return;
    }

    if (saveStatus.length > 1) {
      this.showSaveErroMessage(saveStatus);
      return;
    }

    if (this.entryFee > this.userBalance) {
      this.showSaveErroMessage(
        this.translate.instant("GAME_CREATION.INSUFFICIENT_FUNDS")
      );
      return;
    }

    this.setAttributes();
    this.createPlayer();

    this.confirmCharacterSelection.emit({
      player: this.player,
      availability: this.selectedAvailability,
      entryFee: this.entryFee,
      quickEliminationEnabled: this.quickEliminationEnabled,
    });
  }

  setAttributes() {
    this.attributes = this.attributesService.getAttributes();
  }


  createPlayer() {
    this.player = {
      uid: "test",
      id: "test",
      attributes: this.attributes,
      avatar: this.clickedAvatar,
      isActive: false,
      name: this.characterName,
      status: Status.Player,
      inventory: [],
      postGameStats: defaultPostGameStats,
      position: { x: -1, y: -1 },
      behavior: Behavior.Sentient,
      spawnPosition: { x: -1, y: -1 },
      positionHistory: [],
      collectedItems: [],
      assignedChallenge: MOCK_CHALLENGE,
    };
  }

  preventSpace(event: KeyboardEvent) {
    if (event.key === " ") {
      this.showSaveErroMessage(
        this.translate.instant(ErrorMessages.NameWithSpace)
      );
      event.preventDefault();
    }
  }

  removeSpaces() {
    this.characterName = this.characterName.replace(/\s+/g, "");
  }

  private showSaveErroMessage(message: string) {
    this.snackBar.open(message, this.translate.instant("DIALOG.CLOSE"), {
      duration: MESSAGE_DURATION_VALIDATION_ERROR,
    });
  }
}
