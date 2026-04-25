import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, tools, InsertTool, inventory, InsertInventory, loans, InsertLoan, sanctions, InsertSanction, auditLog, InsertAuditLog, alerts, InsertAlert, loanRules, InsertLoanRule } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= TOOLS QUERIES =============
export async function getAllTools() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tools).orderBy(asc(tools.toolId));
}

export async function getToolById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tools).where(eq(tools.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getToolByToolId(toolId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tools).where(eq(tools.toolId, toolId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createTool(tool: InsertTool) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tools).values(tool);
  return result;
}

export async function updateTool(id: number, updates: Partial<InsertTool>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(tools).set(updates).where(eq(tools.id, id));
}

export async function deleteTool(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(tools).where(eq(tools.id, id));
}

// ============= INVENTORY QUERIES =============
export async function getInventoryByToolId(toolId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(inventory).where(eq(inventory.toolId, toolId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createInventory(inv: InsertInventory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(inventory).values(inv);
}

export async function updateInventory(id: number, updates: Partial<InsertInventory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(inventory).set(updates).where(eq(inventory.id, id));
}

// ============= LOANS QUERIES =============
export async function getActiveLoansByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(loans).where(eq(loans.studentId, studentId)).orderBy(desc(loans.borrowDate));
}

export async function getLoanById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(loans).where(eq(loans.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLoan(loan: InsertLoan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(loans).values(loan);
}

export async function updateLoan(id: number, updates: Partial<InsertLoan>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(loans).set(updates).where(eq(loans.id, id));
}

// ============= SANCTIONS QUERIES =============
export async function getActiveSanctionsByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(sanctions).where(and(eq(sanctions.studentId, studentId), eq(sanctions.status, "active")));
}

export async function createSanction(sanction: InsertSanction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(sanctions).values(sanction);
}

export async function updateSanction(id: number, updates: Partial<InsertSanction>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(sanctions).set(updates).where(eq(sanctions.id, id));
}

// ============= AUDIT LOG QUERIES =============
export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(auditLog).values(log);
}

export async function getAuditLogs(filters?: { userId?: number; toolId?: number; action?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  let query: any = db.select().from(auditLog);
  const conditions: any[] = [];
  if (filters?.userId) conditions.push(eq(auditLog.userId, filters.userId));
  if (filters?.toolId) conditions.push(eq(auditLog.toolId, filters.toolId));
  if (filters?.action) conditions.push(eq(auditLog.action, filters.action));
  if (conditions.length > 0) query = query.where(and(...conditions));
  query = query.orderBy(desc(auditLog.timestamp));
  if (filters?.limit) query = query.limit(filters.limit);
  return await query;
}

// ============= ALERTS QUERIES =============
export async function createAlert(alert: InsertAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(alerts).values(alert);
}

export async function getPendingAlerts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(alerts).where(eq(alerts.status, "pending")).orderBy(desc(alerts.createdAt));
}

export async function updateAlert(id: number, updates: Partial<InsertAlert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(alerts).set(updates).where(eq(alerts.id, id));
}

// ============= LOAN RULES QUERIES =============
export async function getLoanRules() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(loanRules).orderBy(asc(loanRules.minDays));
}

export async function createLoanRule(rule: InsertLoanRule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(loanRules).values(rule);
}

export async function updateLoanRule(id: number, updates: Partial<InsertLoanRule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(loanRules).set(updates).where(eq(loanRules.id, id));
}

// ============= HELPER FUNCTIONS =============
export async function getUserByStudentId(studentId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.studentId, studentId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOverdueLoans() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return await db.select().from(loans).where(and(eq(loans.status, "active"), lte(loans.expectedReturnDate, now)));
}

export async function getToolsWithInventory() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tools).leftJoin(inventory, eq(tools.id, inventory.toolId));
}
