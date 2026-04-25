import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  datetime,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow with role-based access control
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  studentId: varchar("studentId", { length: 50 }).unique(), // Carné de estudiante
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["student", "admin"]).default("student").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tools/Equipment table - stores all laboratory tools
 */
export const tools = mysqlTable("tools", {
  id: int("id").autoincrement().primaryKey(),
  toolId: varchar("toolId", { length: 50 }).notNull().unique(), // e.g., MAR_001
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // e.g., "Herramientas Manuales", "Equipos Electrónicos"
  condition: mysqlEnum("condition", ["excellent", "good", "fair", "poor"]).default("good").notNull(),
  location: varchar("location", { length: 255 }).notNull(), // e.g., "Estante A-1"
  qrCode: varchar("qrCode", { length: 500 }), // QR code data/URL
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tool = typeof tools.$inferSelect;
export type InsertTool = typeof tools.$inferInsert;

/**
 * Inventory table - tracks availability and quantity
 */
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  toolId: int("toolId").notNull(),
  totalQuantity: int("totalQuantity").notNull().default(1),
  availableQuantity: int("availableQuantity").notNull().default(1),
  borrowedQuantity: int("borrowedQuantity").notNull().default(0),
  maintenanceQuantity: int("maintenanceQuantity").notNull().default(0),
  lostQuantity: int("lostQuantity").notNull().default(0),
  status: mysqlEnum("status", ["available", "borrowed", "maintenance", "lost"]).default("available").notNull(),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

/**
 * Loans table - records all tool borrowing transactions
 */
export const loans = mysqlTable("loans", {
  id: int("id").autoincrement().primaryKey(),
  toolId: int("toolId").notNull(),
  studentId: int("studentId").notNull(),
  borrowDate: datetime("borrowDate").notNull(),
  expectedReturnDate: datetime("expectedReturnDate").notNull(),
  actualReturnDate: datetime("actualReturnDate"),
  status: mysqlEnum("status", ["active", "returned", "overdue", "lost"]).default("active").notNull(),
  conditionOnBorrow: mysqlEnum("conditionOnBorrow", ["excellent", "good", "fair", "poor"]).default("good").notNull(),
  conditionOnReturn: mysqlEnum("conditionOnReturn", ["excellent", "good", "fair", "poor"]),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Loan = typeof loans.$inferSelect;
export type InsertLoan = typeof loans.$inferInsert;

/**
 * Sanctions table - tracks user penalties and restrictions
 */
export const sanctions = mysqlTable("sanctions", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  loanId: int("loanId"),
  sanctionType: mysqlEnum("sanctionType", ["overdue", "damage", "loss", "other"]).notNull(),
  daysOverdue: int("daysOverdue").default(0),
  description: text("description"),
  status: mysqlEnum("status", ["active", "resolved", "appealed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type Sanction = typeof sanctions.$inferSelect;
export type InsertSanction = typeof sanctions.$inferInsert;

/**
 * Audit Log table - complete history for compliance and tracking
 */
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  action: varchar("action", { length: 100 }).notNull(), // e.g., "BORROW", "RETURN", "CREATE_TOOL", "UPDATE_INVENTORY"
  entityType: varchar("entityType", { length: 50 }).notNull(), // e.g., "LOAN", "TOOL", "INVENTORY"
  entityId: int("entityId"),
  userId: int("userId"),
  toolId: int("toolId"),
  details: text("details"), // JSON or text description
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

/**
 * Alerts table - tracks notifications and overdue alerts
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  loanId: int("loanId").notNull(),
  studentId: int("studentId").notNull(),
  adminId: int("adminId"),
  alertType: mysqlEnum("alertType", ["overdue", "approaching_deadline", "damage_report", "loss_report"]).notNull(),
  daysOverdue: int("daysOverdue").default(0),
  status: mysqlEnum("status", ["pending", "acknowledged", "resolved"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  acknowledgedAt: timestamp("acknowledgedAt"),
  resolvedAt: timestamp("resolvedAt"),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * Loan Rules Configuration - configurable penalties based on overdue days
 */
export const loanRules = mysqlTable("loanRules", {
  id: int("id").autoincrement().primaryKey(),
  minDays: int("minDays").notNull(), // Minimum days overdue
  maxDays: int("maxDays"), // Maximum days overdue (null = no upper limit)
  sanctionDescription: varchar("sanctionDescription", { length: 255 }).notNull(),
  canBorrow: boolean("canBorrow").default(false).notNull(), // Can user borrow while under this sanction?
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LoanRule = typeof loanRules.$inferSelect;
export type InsertLoanRule = typeof loanRules.$inferInsert;
