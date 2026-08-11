export interface RoleWritePayload {
  name: string;
  permissions?: string[];
}

export function buildRoleWritePayload(name: string, permissions?: readonly string[]): RoleWritePayload {
  return permissions === undefined ? { name } : { name, permissions: [...permissions] };
}
