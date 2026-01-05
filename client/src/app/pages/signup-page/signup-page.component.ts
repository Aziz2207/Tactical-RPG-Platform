import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, effect } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { Router } from "@angular/router";
import { TemporaryDialogComponent } from "@app/components/temporary-dialog/temporary-dialog.component";
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";
import { PathRoute } from "@common/interfaces/route";

@Component({
  selector: "app-signup-page",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: "./signup-page.component.html",
  styleUrl: "../../../common/css/signup-signin.scss",
})
export class SignupPageComponent {
  showPassword = false;

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private userAccountService: UserAccountService
  ) {
    effect(() => {
      const user = this.userAccountService.accountDetails();
      if (user) {
        this.router.navigate([PathRoute.Home]);
      }
    });
  }

  loading = false;
  error = "";
  avatars: string[] = [
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
  form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: [
      "",
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(20),
        Validators.pattern(/^\S*$/),
      ],
    ],
    username: [
      "",
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
        Validators.pattern(/^\S*$/),
      ],
    ],
    avatarURL: [""],
  });

  goToSignIn() {
    this.router.navigate([PathRoute.SignIn]);
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.error = "";
    this.loading = true;

    const { email, password, username, avatarURL } = this.form.value;
    try {
      if (!avatarURL) {
        throw new Error("Avatar requis");
      }
      // console.log("userAccountService : signUp");
      await this.userAccountService
        .signUp(email!, password!, username!, avatarURL!)
        .then(() => {
          this.router.navigate([PathRoute.Home]);
          this.dialog.open(TemporaryDialogComponent, {
            data: {
              title: "Compte créé",
              message: "Compte créé avec succès",
              duration: 3000,
            },
          });
        })
        .catch((errorResponse: HttpErrorResponse) => {
          this.error = errorResponse.error;
        });
    } catch (err: any) {
      this.error = err?.message || "Erreur lors de la création du compte";
    } finally {
      this.loading = false;
    }
  }
}
