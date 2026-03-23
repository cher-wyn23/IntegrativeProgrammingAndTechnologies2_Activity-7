import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { usersModel } from './Models/usersModel';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {

  protected readonly title = signal('login');

  private fb = inject(FormBuilder);

public loginForm = this.fb.group({
    username: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(5), Validators.maxLength(8)])
  });
  public registerForm = this.fb.group({
    regEmail: new FormControl('', [Validators.required, Validators.email]),
    usernameReg: new FormControl('', [Validators.required]),
    regPassword: new FormControl('', [Validators.required, Validators.minLength(5), Validators.maxLength(8)]),
    role: new FormControl<'student' | 'instructor'>('student', [Validators.required])
  });

  isLogin: boolean = true;
  submittedLogin: boolean = false;
  submittedRegister: boolean = false;

  role: string = 'student';
  message: string = '';

  students: usersModel[] = [];
  instructors: usersModel[] = [];
  newuserList: usersModel[] = [];
  hasValidated: boolean = false;

  switchForm(){
    this.isLogin = !this.isLogin;
    this.message = '';
    this.loginForm.reset();
    this.registerForm.reset();
    this.submittedLogin = false;
    this.submittedRegister = false;
  }

  register(){
    this.submittedRegister = true;
    this.registerForm.markAllAsTouched();

    if(this.registerForm.invalid){
      this.message = "Please fix errors in registration form.";
      return;
    }

    const newUser: usersModel = {
      username: this.registerForm.get('usernameReg')?.value!,
      email: this.registerForm.get('regEmail')?.value!,
      password: this.registerForm.get('regPassword')?.value!,
      role: this.registerForm.get('role')?.value!
    };

    this.newuserList.push(newUser);

    if (newUser.role === 'student') {
      this.students.push(newUser);
    } else if (newUser.role === 'instructor') {
      this.instructors.push(newUser);
    }
    this.hasValidated = true;
    this.message = "Registration successful";
  }

  Validate(){
    this.submittedLogin = true;
    this.loginForm.markAllAsTouched();

    if(this.loginForm.invalid){
      this.message = "Invalid login credentials. Check your username/email or password.";
      return;
    }

    const username = this.loginForm.get('username')?.value;
    const password = this.loginForm.get('password')?.value;

    const student = this.students.find(
      u => u.username === username && u.password === password
    );

    const instructor = this.instructors.find(
      u => u.username === username && u.password === password
    );

    if(student){
      this.message = "Logged in as Student";
    }
    else if(instructor){
      this.message = "Logged in as Instructor";
    }
    else{
      this.message = "Invalid credentials";
    }

    console.log("Username:", username);
    console.log("Password:", password);
  }

}
