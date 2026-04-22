import type { SupabaseClient, User } from "@supabase/supabase-js";

import { normalizeEmail } from "@/lib/auth";

export const APP_ROLES = ["admin", "porteria", "logistica"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const FORM_PERMISSIONS = ["fsu01", "fsu02", "fsu03"] as const;
export type FormPermission = (typeof FORM_PERMISSIONS)[number];

export const APP_PERMISSIONS = [
  ...FORM_PERMISSIONS,
  "audit",
  "user_admin",
] as const;
export type AppPermission = (typeof APP_PERMISSIONS)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  porteria: "Porteria",
  logistica: "Logistica",
};

export const PERMISSION_LABELS: Record<AppPermission, string> = {
  fsu01: "F-SU-01",
  fsu02: "F-SU-02",
  fsu03: "F-SU-03",
  audit: "Auditoria",
  user_admin: "Gestion de usuarios",
};

const DEFAULT_FORM_PERMISSIONS_BY_ROLE: Record<AppRole, FormPermission[]> = {
  admin: [...FORM_PERMISSIONS],
  porteria: ["fsu01", "fsu02"],
  logistica: ["fsu03"],
};

export type AppUserRecord = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string | null;
  role: AppRole;
  permissions: AppPermission[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AppUserRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string | null;
  role: string;
  permissions: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AppUserInput = {
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  isActive: boolean;
};

export function buildPermissionsForRole(
  role: AppRole,
  permissions: string[] | null | undefined,
) {
  if (role === "admin") {
    return [...APP_PERMISSIONS];
  }

  const requested = Array.isArray(permissions) ? permissions : [];
  const normalized = requested.filter((value): value is FormPermission =>
    FORM_PERMISSIONS.includes(value as FormPermission),
  );

  return Array.from(new Set(normalized));
}

export function getDefaultPermissionsForRole(role: AppRole) {
  if (role === "admin") {
    return [...APP_PERMISSIONS];
  }

  return [...DEFAULT_FORM_PERMISSIONS_BY_ROLE[role]];
}

export function hasPermission(
  appUser: Pick<AppUserRecord, "role" | "permissions">,
  permission: AppPermission,
) {
  return buildPermissionsForRole(appUser.role, appUser.permissions).includes(
    permission,
  );
}

export function getAuthorizationFailureMessage() {
  return "Tu usuario no esta autorizado para ingresar a esta plataforma.";
}

export function getPermissionFailureMessage(permission: AppPermission) {
  return `No tienes permiso para usar ${PERMISSION_LABELS[permission]}.`;
}

export function validateAppRole(role: string): AppRole {
  if (!APP_ROLES.includes(role as AppRole)) {
    throw new Error("El rol seleccionado no es valido.");
  }

  return role as AppRole;
}

export function validateAppUserInput(input: AppUserInput) {
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("El correo del usuario no es valido.");
  }

  const role = validateAppRole(input.role);
  const permissions = buildPermissionsForRole(role, input.permissions);

  if (role !== "admin" && permissions.length === 0) {
    throw new Error("Debes asignar al menos un formulario al usuario.");
  }

  return {
    email,
    fullName: input.fullName.trim() || null,
    isActive: Boolean(input.isActive),
    permissions,
    role,
  };
}

export function mapAppUserRow(row: AppUserRow): AppUserRecord {
  const role = validateAppRole(row.role);

  return {
    ...row,
    email: normalizeEmail(row.email),
    permissions: buildPermissionsForRole(role, row.permissions),
    role,
  };
}

export async function getAppUserByAuthUserWithClient(
  supabase: SupabaseClient,
  user: User,
) {
  const email = normalizeEmail(user.email ?? "");
  if (!email || !user.email_confirmed_at) {
    return null;
  }

  const byAuthId = await supabase
    .from("app_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle<AppUserRow>();

  if (byAuthId.error) {
    throw new Error(`No fue posible consultar app_users: ${byAuthId.error.message}`);
  }

  if (byAuthId.data) {
    return byAuthId.data.is_active ? mapAppUserRow(byAuthId.data) : null;
  }

  const byEmail = await supabase
    .from("app_users")
    .select("*")
    .eq("email", email)
    .maybeSingle<AppUserRow>();

  if (byEmail.error) {
    throw new Error(`No fue posible consultar app_users: ${byEmail.error.message}`);
  }

  if (!byEmail.data || !byEmail.data.is_active) {
    return null;
  }

  return mapAppUserRow(byEmail.data);
}
