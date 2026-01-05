import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { AVATARS } from "@app/constants";
import { FireStorageService } from "@app/services/user-account/fire-storage/fire-storage.service";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { Camera, LucideAngularModule } from "lucide-angular";
import { SimpleDialogComponent } from "../simple-dialog/simple-dialog.component";

@Component({
  selector: "app-avatar-selector",
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: "./avatar-selector.component.html",
  styleUrl: "./avatar-selector.component.scss",
})
export class AvatarSelectorComponent {
  // Output signal pour notifier le parent
  @Output() avatarChanged = new EventEmitter<string>();
  @Input() selectedAvatar: string = "";
  @Input() isEditing: boolean = false;

  avatars: string[] = AVATARS;
  readonly Camera = Camera;
  constructor(
    private dialog: MatDialog,
    private fireStorageService: FireStorageService,
    private translate: TranslateService
  ) {}

  selectAvatar(avatar: string) {
    if (!this.avatars.includes(this.selectedAvatar)) {
      this.fireStorageService.removeImage(this.selectedAvatar);
    }
    this.selectedAvatar = avatar;
    this.avatarChanged.emit(avatar);
  }

  async onCustomUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validation taille
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      this.dialog.open(SimpleDialogComponent, {
        data: {
          title: this.translate.instant(
            "AVATAR_SELECTOR.IMAGE_UPLOAD_ERROR_TITLE"
          ),
          messages: [
            this.translate.instant("AVATAR_SELECTOR.IMAGE_FILE_TOO_LARGE"),
          ],
          options: ["Fermer"],
          confirm: false,
        },
      });
      return;
    }

    // Lecture du fichier
    await this.fireStorageService
      .uploadAvatar(file)
      .then((customAvatar) => {
        console.log("Avatar uploaded successfully!", customAvatar);
        this.selectAvatar(customAvatar);
      })
      .catch((error) => {
        console.error(error);
        this.dialog.open(SimpleDialogComponent, {
          data: {
            title: this.translate.instant(
              "AVATAR_SELECTOR.IMAGE_UPLOAD_ERROR_TITLE"
            ),
            messages: [
              this.translate.instant("AVATAR_SELECTOR.IMAGE_READ_ERROR"),
            ],
            options: ["Fermer"],
            confirm: false,
          },
        });
      });
  }
}
