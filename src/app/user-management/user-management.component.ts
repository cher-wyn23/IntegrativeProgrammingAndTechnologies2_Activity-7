import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../user';
import { UserFormData, UserRoleType, UserRowData } from '../userEntity';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
})
export class UserManagementComponent implements OnInit {
  public users: UserRowData[] = [];
  public searchQuery = '';

  public submitted = false;
  public domainError: string | null = null;
  public editingOriginalUsername: string | null = null;

  public userForm!: FormGroup;

  constructor(private readonly fb: FormBuilder, private readonly userService: UserService) {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^[0-9\s-+()]{10,20}$/)]],
      address: ['', [Validators.required, Validators.minLength(3)]],
      role: ['student' as UserRoleType, [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(8)]],
    });
  }

  public ngOnInit(): void {
    this.users = this.userService.list();
  }

  public get filteredUsers(): UserRowData[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.users;

    return this.users.filter((u) => {
      const haystack = `${u.username} ${u.email} ${u.contactNumber} ${u.address}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  public isInvalid(controlName: string): boolean {
    const control = this.userForm.get(controlName);
    return !!control && this.submitted && control.invalid;
  }

  public onSearchInput(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  public startCreate(): void {
    this.resetForm();
  }

  public startEdit(user: UserRowData): void {
    this.submitted = false;
    this.domainError = null;
    this.editingOriginalUsername = user.username;

    this.userForm.patchValue({
      username: user.username,
      email: user.email,
      contactNumber: user.contactNumber,
      address: user.address,
      role: user.role,
      password: user.password,
    });
  }

  public onDelete(user: UserRowData): void {
    try {
      this.userService.delete(user.username);
      this.users = this.userService.list();

      if (this.editingOriginalUsername === user.username) {
        this.resetForm();
      }
    } catch (err) {
      this.domainError = this.userService.mapErrorToMessage(err);
    }
  }

  public onSubmit(): void {
    this.submitted = true;
    this.domainError = null;
    this.userForm.markAllAsTouched();

    if (this.userForm.invalid) return;

    const value = this.userForm.getRawValue();
    const payload = value as UserFormData;

    try {
      if (this.editingOriginalUsername) {
        this.userService.update(this.editingOriginalUsername, payload);
      } else {
        this.userService.create(payload);
      }
      this.users = this.userService.list();
      this.resetForm();
    } catch (err) {
      this.domainError = this.userService.mapErrorToMessage(err);
    }
  }

  public resetForm(): void {
    this.submitted = false;
    this.domainError = null;
    this.editingOriginalUsername = null;

    this.userForm.reset({
      username: '',
      email: '',
      contactNumber: '',
      address: '',
      role: 'student' as UserRoleType,
      password: '',
    });
  }
}

