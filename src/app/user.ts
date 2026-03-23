import { Injectable } from '@angular/core';
import {
  DuplicateUsernameError,
  InstructorUserEntity,
  StudentUserEntity,
  UserEntity,
  UserFormData,
  UserNotFoundError,
  UserRowData,
  UserValidationError,
} from './userEntity';

export interface UserRepository {
  list(): UserRowData[];
  getByUsername(username: string): UserRowData | undefined;
  create(input: UserFormData): UserRowData;
  update(originalUsername: string, input: UserFormData): UserRowData;
  delete(username: string): void;
}

class InMemoryUserRepository implements UserRepository {
  // Aggregation in repository: in-memory collection of domain entities.
  private readonly users: UserEntity[] = [];

  constructor() {
    const seed: UserFormData[] = [
      {
        username: 'student_1',
        email: 'student1@example.com',
        contactNumber: '09123456789',
        address: 'Dulag, Leyte',
        role: 'student',
        password: 'stu1234',
      },
      {
        username: 'instructor_1',
        email: 'instructor1@example.com',
        contactNumber: '09112223344',
        address: 'Tacloban City',
        role: 'instructor',
        password: 'teach12',
      },
    ];

    for (const u of seed) {
      // Seed must pass domain validation or the demo won't start.
      const entity = this.createEntity(u);
      entity.validate();
      this.users.push(entity);
    }
  }

  public list(): UserRowData[] {
    return this.users.map((u) => u.toRowData());
  }

  public getByUsername(username: string): UserRowData | undefined {
    const found = this.users.find((u) => u.username === username);
    return found?.toRowData();
  }

  public create(input: UserFormData): UserRowData {
    if (this.users.some((u) => u.username === input.username.trim())) {
      throw new DuplicateUsernameError(input.username);
    }
    const entity = this.createEntity(input);
    entity.validate();
    this.users.push(entity);
    return entity.toRowData();
  }

  public update(originalUsername: string, input: UserFormData): UserRowData {
    const idx = this.users.findIndex((u) => u.username === originalUsername);
    if (idx < 0) throw new UserNotFoundError(originalUsername);

    const newUsername = input.username.trim();
    if (this.users.some((u) => u.username === newUsername && u.username !== originalUsername)) {
      throw new DuplicateUsernameError(newUsername);
    }

    const entity = this.createEntity(input);
    entity.validate();
    this.users[idx] = entity;
    return entity.toRowData();
  }

  public delete(username: string): void {
    const idx = this.users.findIndex((u) => u.username === username);
    if (idx < 0) throw new UserNotFoundError(username);
    this.users.splice(idx, 1);
  }

  private createEntity(input: UserFormData): UserEntity {
    if (input.role === 'student') return new StudentUserEntity(input);
    return new InstructorUserEntity(input);
  }
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly repo: UserRepository;

  public getSnapshot(): UserRowData[] {
    return this.repo.list();
  }

  constructor() {
    this.repo = new InMemoryUserRepository();
  }

  // The UI polls the snapshot after each operation.
  public list(): UserRowData[] {
    return this.repo.list();
  }

  public create(input: UserFormData): void {
    // Let domain errors bubble up so the UI can show them.
    this.repo.create(input);
  }

  public update(originalUsername: string, input: UserFormData): void {
    this.repo.update(originalUsername, input);
  }

  public delete(username: string): void {
    this.repo.delete(username);
  }

  public mapErrorToMessage(err: unknown): string {
    if (err instanceof UserValidationError) return err.issues.join(' ');
    if (err instanceof Error) return err.message;
    return 'Unknown error';
  }
}

export { UserValidationError };

