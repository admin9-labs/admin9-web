export type RoleType = string;

export interface AdminRole {
  id: number;
  name: string;
  guard_name: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  roles?: AdminRole[];
  created_at: string | null;
  updated_at: string | null;
}

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
}
