import {User as BaseUser} from "@awc/helpers/user"
export type UserRole = 'admin' | 'user' | 'viewer';

export interface User extends BaseUser {
  role: UserRole;
  fullName: string;
}


