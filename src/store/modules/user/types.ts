export type RoleType = '' | '*' | 'admin' | 'user';
export interface UserState {
  id: number | '';
  name?: string;
  avatar?: string;
  job?: string;
  organization?: string;
  location?: string;
  email?: string;
  introduction?: string;
  personalWebsite?: string;
  jobName?: string;
  organizationName?: string;
  locationName?: string;
  phone?: string;
  registrationDate?: string;
  accountId?: string;
  certification?: number;
  role: RoleType;
  nickname?: string;
  introduce?: string;
  is_active?: boolean;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  roles: string[];
  permission_names: string[];
  created_at?: string | null;
  updated_at?: string | null;
}
