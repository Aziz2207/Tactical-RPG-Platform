import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, effect } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { Router } from "@angular/router";
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";
import { PathRoute } from "@common/interfaces/route";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
@Component({
  selector: "app-signin-page",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: "./signin-page.component.html",
  styleUrl: "../../../common/css/signup-signin.scss",
})
export class SigninPageComponent {
  showPassword = false;

  constructor(
    private router: Router,
    private userAccountService: UserAccountService,
    private fb: FormBuilder
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
  form = this.fb.group({
    // email: ["", [Validators.required, Validators.email]],
    username: ["", [Validators.required, Validators.pattern(/^\S*$/)]],
    password: ["", [Validators.required, Validators.pattern(/^\S*$/)]],
  });

  goToSignUp() {
    this.router.navigate([PathRoute.SignUp]);
  }

  async onSubmit() {
    this.error = "";
    this.loading = true;
    const { username, password } = this.form.value;
    // console.log("userAccountService : signIn");
    try {
      await this.userAccountService
        .signInWithUsernameAndPassword(username!, password!)
        .then(() => {
          this.router.navigate([PathRoute.Home]);
        })
        .catch((errorResponse: HttpErrorResponse) => {
          this.error = errorResponse.error;
          throw new Error(errorResponse.error);
        })
    } catch (error: any) {
      this.error ||= "Pseudonyme ou mot de passe invalide ou incorrect";
    }
    this.loading = false;
  }
}
