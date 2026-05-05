import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  CircleX,
  FilePenLine,
  PackageCheck,
  PackagePlus,
  Pencil,
  RotateCcw,
  ScrollText,
  Send,
  Trash2,
  UserRoundCheck,
  UserX,
  Wrench,
} from "lucide-react";

/** Etiqueta en español para la columna de auditoría (clave API = inglés MAYÚSCULAS). */
export const ACTION_LABELS: Record<string, string> = {
  BORROW: "Préstamo en kiosco",
  RETURN: "Devolución en kiosco",
  LOAN_REQUESTED: "Solicitud de préstamo",
  LOAN_APPROVED: "Préstamo aprobado",
  LOAN_DENIED: "Préstamo denegado",
  LOAN_CANCELLED: "Préstamo cancelado",
  DELETE_LOAN: "Préstamo eliminado",
  ADMIN_RETURN: "Devolución por encargado",
  CREATE_TOOL: "Herramienta Creada",
  UPDATE_TOOL: "Herramienta Actualizada",
  DELETE_TOOL: "Herramienta Eliminada",
  CREATE_SANCTION: "Sanción Creada",
  UPDATE_SANCTION: "Sanción Actualizada",
  DELETE_SANCTION: "Sanción Eliminada",
  BAN_STUDENT: "Estudiante bloqueado",
  UNBAN_STUDENT: "Bloqueo levantado",
};

const ACTION_ICONS: Record<string, LucideIcon> = {
  BORROW: PackagePlus,
  RETURN: PackageCheck,
  LOAN_REQUESTED: Send,
  LOAN_APPROVED: CheckCircle2,
  LOAN_DENIED: CircleX,
  LOAN_CANCELLED: CircleSlash,
  DELETE_LOAN: Trash2,
  ADMIN_RETURN: RotateCcw,
  CREATE_TOOL: Wrench,
  UPDATE_TOOL: Pencil,
  DELETE_TOOL: Trash2,
  CREATE_SANCTION: AlertTriangle,
  UPDATE_SANCTION: FilePenLine,
  DELETE_SANCTION: Trash2,
  BAN_STUDENT: UserX,
  UNBAN_STUDENT: UserRoundCheck,
};

export function getAuditActionIcon(action: string): LucideIcon {
  return ACTION_ICONS[action] ?? ScrollText;
}

export function getAuditActionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .split("_")
    .map((w) => (w ? w.charAt(0) + w.slice(1).toLowerCase() : w))
    .join(" ");
}
