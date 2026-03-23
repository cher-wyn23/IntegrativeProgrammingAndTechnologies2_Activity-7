import { NgModule } from '@angular/core';
import { UserManagementComponent } from './user-management.component';

@NgModule({
  // Importing a standalone component via NgModule makes template analysis deterministic for tooling.
  imports: [UserManagementComponent],
  exports: [UserManagementComponent],
})
export class UserManagementModule {}

