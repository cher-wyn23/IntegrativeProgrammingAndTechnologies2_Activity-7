import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserManagementComponent } from './user-management/user-management.component';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from './user';
import { UserFormData, UserRoleType } from './userEntity';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  public readonly userManagementCmp = UserManagementComponent;

  public isLogin: boolean = true;
  public view: 'auth' | 'manage' = 'auth';

  public submittedLogin: boolean = false;
  public submittedRegister: boolean = false;

  public message: string = '';

  public loginForm!: FormGroup;
  public registerForm!: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
  ) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

    this.loginForm = this.fb.nonNullable.group({
      username: [
        '',
        [
          Validators.required,
          // Accept either username or email.
          (control: AbstractControl) => {
            const v = (control.value ?? '').trim();
            if (emailRegex.test(v) || usernameRegex.test(v)) return null;
            return { usernameOrEmail: true };
          },
        ],
      ],
      password: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(8)]],
    });

    this.registerForm = this.fb.nonNullable.group({
      usernameReg: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(20), Validators.pattern(/^[a-zA-Z0-9_]+$/)],
      ],
      regEmail: ['', [Validators.required, Validators.email]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^[0-9\s-+()]{10,20}$/)]],
      address: ['', [Validators.required, Validators.minLength(3)]],
      role: ['student' as UserRoleType, [Validators.required]],
      regPassword: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(8)]],
    });
  }

  public switchForm(): void {
    this.isLogin = !this.isLogin;
    // If user is switching between Sign In / Sign Up, ensure the management table is hidden.
    this.view = 'auth';
    this.message = '';
    this.loginForm.reset();
    this.registerForm.reset();
    this.submittedLogin = false;
    this.submittedRegister = false;
  }

  public validateLogin(): void {
    this.submittedLogin = true;
    this.message = '';
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) return;

    const usernameOrEmail = this.loginForm.getRawValue().username.trim().toLowerCase();
    const password = this.loginForm.getRawValue().password;

    const users = this.userService.list();
    const found = users.find((u) => {
      const uName = u.username.trim().toLowerCase();
      const uEmail = u.email.trim().toLowerCase();
      return (uName === usernameOrEmail || uEmail === usernameOrEmail) && u.password === password;
    });

    if (!found) {
      this.message = 'Invalid credentials';
      return;
    }

    this.view = 'manage';
  }

  public register(): void {
    this.submittedRegister = true;
    this.message = '';
    this.registerForm.markAllAsTouched();

    if (this.registerForm.invalid) return;

    const value = this.registerForm.getRawValue();
    const payload: UserFormData = {
      username: value.usernameReg,
      email: value.regEmail,
      contactNumber: value.contactNumber,
      address: value.address,
      role: value.role,
      password: value.regPassword,
    };

    try {
      this.userService.create(payload);
      this.message = 'Registration successful';
      // After sign up, keep user on auth view (no table) and show login form.
      this.view = 'auth';
      // After sign up, show login form.
      this.isLogin = true;
      this.submittedRegister = false;
      this.registerForm.reset();
    } catch (err) {
      this.message = this.userService.mapErrorToMessage(err);
    }
  }

  public logout(): void {
    this.view = 'auth';
    this.isLogin = true;
    this.message = '';
    this.submittedLogin = false;
    this.submittedRegister = false;
  }
}
