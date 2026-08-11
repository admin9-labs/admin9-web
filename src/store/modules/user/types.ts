export type RoleType = string;

export interface UserState {
  id: number | null;
  name: string;
  email: string;
  roles: RoleType[];
  permissionNames: string[];
  is_active: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  created_at: string | null;
  updated_at: string | null;
  identityLoaded: boolean;
  identitySessionGeneration: string | null;
  identitySessionToken: string | null;
}
