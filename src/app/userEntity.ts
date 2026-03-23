export type UserRoleType = 'student' | 'instructor';

export interface UserFormData {
  username: string;
  email: string;
  contactNumber: string;
  address: string;
  role: UserRoleType;
  password: string;
}

// Includes password because the edit form needs to load it.
export interface UserRowData extends UserFormData {}

export class UserValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super('User validation failed');
  }
}

export class UserNotFoundError extends Error {
  constructor(username: string) {
    super(`User '${username}' not found`);
  }
}

export class DuplicateUsernameError extends Error {
  constructor(username: string) {
    super(`Username '${username}' already exists`);
  }
}

// Value object (Composition): owned by UserEntity.
export class ContactInfo {
  private readonly contactNumber: string;

  constructor(contactNumber: string) {
    const normalized = contactNumber.replace(/[^\d]/g, '');
    // Keep it permissive for UI formatting; enforce length here.
    if (!/^\d{10,15}$/.test(normalized)) {
      throw new Error('Contact number must contain 10 to 15 digits.');
    }
    this.contactNumber = normalized;
  }

  public get value(): string {
    return this.contactNumber;
  }
}

// Value object (Composition): owned by UserEntity.
export class Address {
  private readonly valueText: string;

  constructor(address: string) {
    const normalized = address.trim();
    if (normalized.length < 3) {
      throw new Error('Address is required.');
    }
    this.valueText = normalized;
  }

  public get value(): string {
    return this.valueText;
  }
}

// Value object (Composition): owned by UserEntity.
export class PasswordValue {
  private readonly valueText: string;

  constructor(password: string) {
    const normalized = password ?? '';
    if (normalized.length < 5) {
      throw new Error('Password must be at least 5 characters.');
    }
    if (normalized.length > 8) {
      throw new Error('Password cannot exceed 8 characters.');
    }
    this.valueText = normalized;
  }

  public get value(): string {
    return this.valueText;
  }
}

// Association: UserEntity has a role object.
export class UserRole {
  private readonly roleType: UserRoleType;

  constructor(roleType: UserRoleType) {
    this.roleType = roleType;
  }

  public get type(): UserRoleType {
    return this.roleType;
  }

  public get label(): string {
    return this.roleType === 'student' ? 'Student' : 'Instructor';
  }
}

export type UserActivityKind = 'validated';

export interface UserActivityEvent {
  kind: UserActivityKind;
  at: number;
}

export interface UserValidationRule {
  readonly key: string;
  validate(user: UserEntity): string | null;
}

// Abstraction (Inheritance base + Repository abstraction via interface in user.ts).
export abstract class UserEntity {
  // Encapsulation: private fields with getters.
  private readonly usernameValue: string;
  private readonly emailValue: string;
  private readonly contactInfoValue: ContactInfo;
  private readonly addressValue: Address;
  private readonly passwordValue: PasswordValue;
  private readonly roleValue: UserRole;

  // Aggregation: entity holds a collection of rule objects.
  private readonly validationRules: UserValidationRule[];

  // Aggregation: entity holds a collection of activity events.
  private readonly activityLog: UserActivityEvent[] = [];

  protected constructor(data: {
    username: string;
    email: string;
    contactNumber: string;
    address: string;
    password: string;
    role: UserRole;
  }) {
    this.usernameValue = data.username.trim();
    this.emailValue = data.email.trim().toLowerCase();
    this.contactInfoValue = new ContactInfo(data.contactNumber);
    this.addressValue = new Address(data.address);
    this.passwordValue = new PasswordValue(data.password);
    this.roleValue = data.role;

    // Polymorphism: subclass override supplies role-specific rules.
    this.validationRules = [...this.commonValidationRules(), ...this.getRoleSpecificValidationRules()];
  }

  public get username(): string {
    return this.usernameValue;
  }

  public get email(): string {
    return this.emailValue;
  }

  public get contactNumber(): string {
    return this.contactInfoValue.value;
  }

  public get address(): string {
    return this.addressValue.value;
  }

  public get role(): UserRoleType {
    return this.roleValue.type;
  }

  // Demo/UI use: needed for loading the edit form.
  public get password(): string {
    return this.passwordValue.value;
  }

  public get activity(): ReadonlyArray<UserActivityEvent> {
    return this.activityLog;
  }

  public validate(): void {
    const issues = this.validationRules
      .map((r) => r.validate(this))
      .filter((x): x is string => x !== null);

    if (issues.length > 0) {
      throw new UserValidationError(issues);
    }

    this.activityLog.push({ kind: 'validated', at: Date.now() });
  }

  public toRowData(): UserRowData {
    return {
      username: this.username,
      email: this.email,
      contactNumber: this.contactNumber,
      address: this.address,
      role: this.role,
      password: this.password,
    };
  }

  private commonValidationRules(): UserValidationRule[] {
    return [
      {
        key: 'username-required-format',
        validate: (user) => {
          const u = user.username.trim();
          if (u.length < 3 || u.length > 20) return 'Username must be between 3 and 20 characters.';
          if (!/^[a-zA-Z0-9_]+$/.test(u)) return 'Username can only contain letters, numbers, and underscore.';
          return null;
        },
      },
      {
        key: 'email-format',
        validate: (user) => {
          const email = user.email.trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email must be a valid email address.';
          return null;
        },
      },
      {
        key: 'address-required',
        validate: (user) => {
          if (user.address.trim().length < 3) return 'Address is required.';
          return null;
        },
      },
      {
        key: 'password-length',
        validate: (user) => {
          const pw = user.password;
          if (pw.length < 5) return 'Password must be at least 5 characters.';
          if (pw.length > 8) return 'Password cannot exceed 8 characters.';
          return null;
        },
      },
    ];
  }

  // Polymorphism (override behaviors): role-specific rules.
  protected abstract getRoleSpecificValidationRules(): UserValidationRule[];
}

export class StudentUserEntity extends UserEntity {
  constructor(data: UserFormData) {
    if (data.role !== 'student') {
      throw new Error('StudentUserEntity requires role="student".');
    }
    super({
      username: data.username,
      email: data.email,
      contactNumber: data.contactNumber,
      address: data.address,
      password: data.password,
      role: new UserRole('student'),
    });
  }

  protected override getRoleSpecificValidationRules(): UserValidationRule[] {
    return [
      {
        // Role-specific override (polymorphism): keep student rules lenient.
        key: 'student-password-no-whitespace',
        validate: (user) => {
          if (/\s/.test(user.password)) return 'Password cannot contain spaces.';
          return null;
        },
      },
    ];
  }
}

export class InstructorUserEntity extends UserEntity {
  constructor(data: UserFormData) {
    if (data.role !== 'instructor') {
      throw new Error('InstructorUserEntity requires role="instructor".');
    }
    super({
      username: data.username,
      email: data.email,
      contactNumber: data.contactNumber,
      address: data.address,
      password: data.password,
      role: new UserRole('instructor'),
    });
  }

  protected override getRoleSpecificValidationRules(): UserValidationRule[] {
    return [
      {
        // Role-specific override (polymorphism): keep instructor rules lenient too.
        key: 'instructor-password-no-whitespace',
        validate: (user) => {
          if (/\s/.test(user.password)) return 'Password cannot contain spaces.';
          return null;
        },
      },
    ];
  }
}

