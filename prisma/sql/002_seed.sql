-- =============================================================================
-- Kite Hub — Seed Data (SQL Server 2022)
-- Run AFTER 001_schema.sql against the kite_hub database.
-- Safe to re-run: uses MERGE / IF NOT EXISTS guards.
-- =============================================================================

USE kite_hub;
GO

-- ─── Users ───────────────────────────────────────────────────────────────────
-- 1 dev-admin (matches the DEV_AUTH_BYPASS hardcoded sub)
-- 1 staff member
-- 3 students with cardKey values for kiosk QR scans

MERGE users AS target
USING (VALUES
  -- id, auth0Sub, cardKey, name, email, role
  -- NOTE: SQL Server UNIQUE constraints only allow a single NULL value,
  -- so auth0Sub/cardKey must be unique and non-null for all rows in this seed.
  (1, 'dev|bypass-admin', 'KEY_900001','Dev Admin',        'admin@dev.local',   'admin'),
  (2, 'auth0|staff001',   'KEY_900002','María López',      'maria@lab.local',   'staff'),
  (3, 'seed|student001',  'KEY_000001','Carlos Ramírez',   'carlos@uni.local',  'student'),
  (4, 'seed|student002',  'KEY_000002','Laura Sánchez',    'laura@uni.local',   'student'),
  (5, 'seed|student003',  'KEY_000003','Diego Flores',     'diego@uni.local',   'student')
) AS source (id, auth0Sub, cardKey, name, email, role)
ON target.id = source.id
WHEN NOT MATCHED THEN
  INSERT (auth0Sub, cardKey, name, email, role, isBanned, createdAt, updatedAt)
  VALUES (source.auth0Sub, source.cardKey, source.name, source.email, source.role,
          0, SYSUTCDATETIME(), SYSUTCDATETIME());
GO

-- ─── Tools ───────────────────────────────────────────────────────────────────
MERGE tools AS target
USING (VALUES
  (1, 'MAR_001', 'Multímetro Digital',      'Medición de voltaje, corriente y resistencia',    'Medición',    'good',      'Estante A-1'),
  (2, 'MAR_002', 'Osciloscopio 100 MHz',    'Visualización de señales eléctricas en tiempo real', 'Medición', 'excellent', 'Estante A-2'),
  (3, 'MAR_003', 'Soldadora de Estaño',     'Soldadura de componentes electrónicos',           'Ensamble',    'fair',      'Estante B-1'),
  (4, 'MAR_004', 'Fuente de Poder Variable','Suministro regulable 0-30V / 0-5A',              'Alimentación', 'good',      'Estante B-2'),
  (5, 'MAR_005', 'Generador de Funciones',  'Señales sen/cuad/tri hasta 10 MHz',              'Medición',    'good',      'Estante A-3')
) AS source (id, toolId, name, description, category, condition, location)
ON target.id = source.id
WHEN NOT MATCHED THEN
  INSERT (toolId, name, description, category, condition, location, createdAt, updatedAt)
  VALUES (source.toolId, source.name, source.description, source.category,
          source.condition, source.location, SYSUTCDATETIME(), SYSUTCDATETIME());
GO

-- ─── Inventory ───────────────────────────────────────────────────────────────
-- toolId references tools.id (1-5)
-- Tool 3 (Soldadora) is currently borrowed; tool 4 is in maintenance

MERGE inventory AS target
USING (VALUES
  -- toolId, total, available, borrowed, maintenance, lost, status
  (1, 1, 1, 0, 0, 0, 'available'),
  (2, 1, 1, 0, 0, 0, 'available'),
  (3, 1, 0, 1, 0, 0, 'borrowed'),
  (4, 1, 0, 0, 1, 0, 'maintenance'),
  (5, 1, 1, 0, 0, 0, 'available')
) AS source (toolId, total, available, borrowed, maintenance, lost, status)
ON target.toolId = source.toolId
WHEN NOT MATCHED THEN
  INSERT (toolId, totalQuantity, availableQuantity, borrowedQuantity,
          maintenanceQuantity, lostQuantity, status, lastUpdated)
  VALUES (source.toolId, source.total, source.available, source.borrowed,
          source.maintenance, source.lost, source.status, SYSUTCDATETIME());
GO

-- ─── Loans ───────────────────────────────────────────────────────────────────
-- Loan 1: active  — Carlos has the multímetro (tool 1), due tomorrow
-- Loan 2: active  — Laura has the osciloscopio (tool 2), due in 3 days
-- Loan 3: returned — Diego returned the soldadora (tool 3) on time
-- Loan 4: overdue  — Carlos has the soldadora (tool 3) still out, 5 days late

DECLARE @now    DATETIME2 = SYSUTCDATETIME();
DECLARE @tmrw   DATETIME2 = DATEADD(DAY,  1, @now);
DECLARE @3d     DATETIME2 = DATEADD(DAY,  3, @now);
DECLARE @5dago  DATETIME2 = DATEADD(DAY, -5, @now);
DECLARE @8dago  DATETIME2 = DATEADD(DAY, -8, @now);
DECLARE @10dago DATETIME2 = DATEADD(DAY,-10, @now);
DECLARE @7dago  DATETIME2 = DATEADD(DAY, -7, @now);

MERGE loans AS target
USING (VALUES
  -- idempotencyKey, toolCode, studentCardKey, borrowDate, expectedReturn, actualReturn, status, condBorrow
  ('seed-loan-001', 'MAR_001', 'KEY_000001', @now,    @tmrw,  NULL,    'active',   'good'),
  ('seed-loan-002', 'MAR_002', 'KEY_000002', @now,    @3d,    NULL,    'active',   'excellent'),
  ('seed-loan-003', 'MAR_003', 'KEY_000003', @10dago, @7dago, @7dago,  'returned', 'fair'),
  ('seed-loan-004', 'MAR_003', 'KEY_000001', @8dago,  @5dago, NULL,    'overdue',  'good')
) AS source (idempotencyKey, toolCode, studentCardKey, borrowDate, expectedReturnDate, actualReturnDate, status, conditionOnBorrow)
ON target.idempotencyKey = source.idempotencyKey
WHEN NOT MATCHED THEN
  INSERT (toolId, studentId, borrowDate, expectedReturnDate, actualReturnDate,
          status, conditionOnBorrow, idempotencyKey, createdAt, updatedAt)
  VALUES (
    (SELECT TOP 1 t.id FROM tools t WHERE t.toolId = source.toolCode),
    (SELECT TOP 1 u.id FROM users u WHERE u.cardKey = source.studentCardKey),
    source.borrowDate,
    source.expectedReturnDate,
    source.actualReturnDate,
    source.status,
    source.conditionOnBorrow,
    source.idempotencyKey,
    SYSUTCDATETIME(),
    SYSUTCDATETIME()
  );
GO

-- ─── Sanctions ───────────────────────────────────────────────────────────────
-- One active overdue sanction for loan 4 (Carlos, soldadora, 5 days late)

MERGE sanctions AS target
USING (VALUES
  ('seed-sanction-001', 'KEY_000001', 'seed-loan-004', 'overdue', 5, 'Devolución pendiente con 5 días de atraso en MAR_003.', 'active')
) AS source (seedKey, studentCardKey, loanSeedKey, sanctionType, daysOverdue, description, status)
ON target.description = source.seedKey
WHEN NOT MATCHED THEN
  INSERT (studentId, loanId, sanctionType, daysOverdue, description, status, createdAt)
  VALUES (
    (SELECT TOP 1 u.id FROM users u WHERE u.cardKey = source.studentCardKey),
    (SELECT TOP 1 l.id FROM loans l WHERE l.idempotencyKey = source.loanSeedKey),
    source.sanctionType,
    source.daysOverdue,
    source.seedKey,
    source.status,
    SYSUTCDATETIME()
  );
GO

-- ─── Audit Log ───────────────────────────────────────────────────────────────

INSERT INTO audit_log (action, entityType, entityId, userId, toolId, details)
SELECT
  v.action,
  'Loan' AS entityType,
  l.id AS entityId,
  u.id AS userId,
  t.id AS toolId,
  v.details
FROM (VALUES
  ('LOAN_CREATED', 'seed-loan-001', 'MAR_001', '{"seed":"seed-audit-001","note":"Préstamo MAR_001 creado por admin dev"}'),
  ('LOAN_CREATED', 'seed-loan-004', 'MAR_003', '{"seed":"seed-audit-002","note":"Préstamo MAR_003 creado por admin dev"}'),
  ('LOAN_OVERDUE', 'seed-loan-004', 'MAR_003', '{"seed":"seed-audit-003","daysOverdue":5,"note":"Marcado como vencido por job automático"}')
) AS v (action, loanSeedKey, toolCode, details)
JOIN users u ON u.auth0Sub = 'dev|bypass-admin'
JOIN loans l ON l.idempotencyKey = v.loanSeedKey
JOIN tools t ON t.toolId = v.toolCode
WHERE NOT EXISTS (SELECT 1 FROM audit_log WHERE details = v.details);
GO

-- ─── Loan Rules ──────────────────────────────────────────────────────────────
-- Rule 1: 1–3 days overdue → student can still borrow
-- Rule 2: 4+ days overdue  → student is blocked from borrowing

MERGE loan_rules AS target
USING (VALUES
  (1, 1, 3,    '1 a 3 días de atraso: advertencia, puede seguir prestando.', 1),
  (2, 4, NULL, '4 o más días de atraso: bloqueo de préstamo hasta resolución.', 0)
) AS source (id, minDays, maxDays, sanctionDescription, canBorrow)
ON target.id = source.id
WHEN NOT MATCHED THEN
  INSERT (minDays, maxDays, sanctionDescription, canBorrow, createdAt, updatedAt)
  VALUES (source.minDays, source.maxDays, source.sanctionDescription,
          source.canBorrow, SYSUTCDATETIME(), SYSUTCDATETIME());
GO

PRINT 'Kite Hub seed data inserted successfully.';
GO
