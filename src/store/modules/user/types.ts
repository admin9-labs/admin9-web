export type RoleType = '' | '*' | 'admin' | 'user';
export interface UserState {
  id: string;
  name?: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  email_verified: boolean;
  introduction?: string;
  mobile?: string;
  mobile_verified: boolean;
  role: RoleType;
  identity_verified: boolean;
}
