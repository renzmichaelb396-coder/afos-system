/**
 * lib/permissions.ts
 *
 * Granular permission matrix for AFOS.
 * Extends the existing Role enum without modifying any existing behavior.
 *
 * Usage (server-side):
 *   import { can } from "@/lib/permissions";
 *   if (!can(user, "delete_client")) return 403;
 *
 * Usage (client-side guard):
 *   import { canRole } from "@/lib/permissions";
 *   if (!canRole(role, "manage_users")) return null;
 */
import type { Role } from "@prisma/client";

export type Permission =
  | "create_client"
  | "edit_client"
  | "delete_client"
  | "view_audit_log"
  | "manage_users"
  | "approve_payment"
  | "lock_period"
  | "manage_settings"
  | "view_dashboard"
  | "view_clients"
  | "view_payments"
  | "view_billing"
  | "send_reminders"
  | "export_csv";

/**
 * Permission matrix: maps each Role to the set of permissions it holds.
 * ADMIN has all permissions.
 * MANAGER has operational permissions but cannot manage users or settings.
 * ACCOUNTANT has read/write access to core accounting features.
 * STAFF has read-only access.
 */
const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  ADMIN: [
    "create_client",
    "edit_client",
    "delete_client",
    "view_audit_log",
    "manage_users",
    "approve_payment",
    "lock_period",
    "manage_settings",
    "view_dashboard",
    "view_clients",
    "view_payments",
    "view_billing",
    "send_reminders",
    "export_csv",
  ],
  MANAGER: [
    "create_client",
    "edit_client",
    "view_audit_log",
    "approve_payment",
    "lock_period",
    "view_dashboard",
    "view_clients",
    "view_payments",
    "view_billing",
    "send_reminders",
    "export_csv",
  ],
  ACCOUNTANT: [
    "create_client",
    "edit_client",
    "approve_payment",
    "view_dashboard",
    "view_clients",
    "view_payments",
    "view_billing",
    "export_csv",
  ],
  STAFF: [
    "view_dashboard",
    "view_clients",
    "view_payments",
    "view_billing",
  ],
};

/**
 * Server-side permission check.
 * Accepts a full user object (must have `role` and `isActive`).
 */
export function can(
  user: { role: Role; isActive?: boolean } | null | undefined,
  permission: Permission
): boolean {
  if (!user) return false;
  if (user.isActive === false) return false;
  return PERMISSION_MATRIX[user.role]?.includes(permission) ?? false;
}

/**
 * Role-only permission check (for client components that only know the role).
 */
export function canRole(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

/**
 * Returns all permissions for a given role.
 */
export function getPermissions(role: Role): Permission[] {
  return PERMISSION_MATRIX[role] ?? [];
}
