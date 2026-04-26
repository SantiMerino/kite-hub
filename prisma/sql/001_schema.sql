-- =============================================================================
-- Kite Hub — T-SQL Schema (SQL Server 2022)
-- Mirrors prisma/schema.prisma exactly.
-- Run this script against an empty `kite_hub` database.
-- The script is idempotent: tables are only created if they do not exist.
-- Creation order respects FK dependencies.
-- =============================================================================

USE kite_hub;
GO

-- ─── users ───────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'users')
BEGIN
  CREATE TABLE users (
    id           INT           IDENTITY(1,1) NOT NULL,
    auth0Sub     NVARCHAR(128) NULL,
    cardKey      NVARCHAR(20)  NULL,
    name         NVARCHAR(255) NULL,
    email        NVARCHAR(320) NULL,
    role         NVARCHAR(20)  NOT NULL CONSTRAINT DF_users_role DEFAULT 'student',
    isBanned     BIT           NOT NULL CONSTRAINT DF_users_isBanned DEFAULT 0,
    banReason    NVARCHAR(500) NULL,
    createdAt    DATETIME2     NOT NULL CONSTRAINT DF_users_createdAt DEFAULT SYSUTCDATETIME(),
    updatedAt    DATETIME2     NOT NULL CONSTRAINT DF_users_updatedAt DEFAULT SYSUTCDATETIME(),
    lastSignedIn DATETIME2     NULL,

    CONSTRAINT PK_users PRIMARY KEY (id),
    CONSTRAINT UQ_users_auth0Sub UNIQUE (auth0Sub),
    CONSTRAINT UQ_users_cardKey  UNIQUE (cardKey)
  );

  CREATE INDEX IX_users_cardKey  ON users (cardKey);
  CREATE INDEX IX_users_auth0Sub ON users (auth0Sub);
  CREATE INDEX IX_users_role     ON users (role);
END
GO

-- ─── tools ───────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tools')
BEGIN
  CREATE TABLE tools (
    id          INT            IDENTITY(1,1) NOT NULL,
    toolId      NVARCHAR(50)   NOT NULL,
    prefix      NVARCHAR(10)   NOT NULL,
    name        NVARCHAR(255)  NOT NULL,
    description NVARCHAR(MAX)  NULL,
    category    NVARCHAR(100)  NOT NULL,
    condition   NVARCHAR(20)   NOT NULL CONSTRAINT DF_tools_condition DEFAULT 'good',
    location    NVARCHAR(255)  NOT NULL,
    requiresApproval BIT       NOT NULL CONSTRAINT DF_tools_requiresApproval DEFAULT 0,
    qrCode      NVARCHAR(500)  NULL,
    createdAt   DATETIME2      NOT NULL CONSTRAINT DF_tools_createdAt DEFAULT SYSUTCDATETIME(),
    updatedAt   DATETIME2      NOT NULL CONSTRAINT DF_tools_updatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_tools         PRIMARY KEY (id),
    CONSTRAINT UQ_tools_toolId  UNIQUE (toolId)
  );

  CREATE INDEX IX_tools_toolId ON tools (toolId);
  CREATE INDEX IX_tools_prefix ON tools (prefix);
END
GO

-- ─── inventory ───────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'inventory')
BEGIN
  CREATE TABLE inventory (
    id                  INT          IDENTITY(1,1) NOT NULL,
    toolId              INT          NOT NULL,
    totalQuantity       INT          NOT NULL CONSTRAINT DF_inv_total       DEFAULT 1,
    availableQuantity   INT          NOT NULL CONSTRAINT DF_inv_available   DEFAULT 1,
    borrowedQuantity    INT          NOT NULL CONSTRAINT DF_inv_borrowed    DEFAULT 0,
    maintenanceQuantity INT          NOT NULL CONSTRAINT DF_inv_maintenance DEFAULT 0,
    lostQuantity        INT          NOT NULL CONSTRAINT DF_inv_lost        DEFAULT 0,
    status              NVARCHAR(20) NOT NULL CONSTRAINT DF_inv_status      DEFAULT 'available',
    lastUpdated         DATETIME2    NOT NULL CONSTRAINT DF_inv_lastUpdated DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_inventory        PRIMARY KEY (id),
    CONSTRAINT UQ_inventory_toolId UNIQUE (toolId),
    CONSTRAINT FK_inventory_tools  FOREIGN KEY (toolId) REFERENCES tools (id)
  );
END
GO

-- ─── loans ───────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'loans')
BEGIN
  CREATE TABLE loans (
    id                 INT            IDENTITY(1,1) NOT NULL,
    toolId             INT            NOT NULL,
    studentId          INT            NOT NULL,
    borrowDate         DATETIME2      NOT NULL,
    expectedReturnDate DATETIME2      NOT NULL,
    actualReturnDate   DATETIME2      NULL,
    status             NVARCHAR(20)   NOT NULL CONSTRAINT DF_loans_status           DEFAULT 'active',
    conditionOnBorrow  NVARCHAR(20)   NOT NULL CONSTRAINT DF_loans_conditionOnBorrow DEFAULT 'good',
    conditionOnReturn  NVARCHAR(20)   NULL,
    notes              NVARCHAR(MAX)  NULL,
    idempotencyKey     NVARCHAR(100)  NULL,
    createdAt          DATETIME2      NOT NULL CONSTRAINT DF_loans_crea                                                                   tedAt DEFAULT SYSUTCDATETIME(),
    updatedAt          DATETIME2      NOT NULL CONSTRAINT DF_loans_updatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_loans                  PRIMARY KEY (id),
    CONSTRAINT UQ_loans_idempotencyKey   UNIQUE (idempotencyKey),
    CONSTRAINT FK_loans                                                                                       _tools            FOREIGN KEY (toolId)    REFERENCES tools (id),
    CONSTRAINT FK_loans_users            FOREIGN KEY (studentId) REFERENCES users (id)
  );

  CREATE INDEX IX_loans_toolId_status             ON loans (toolId,             status);
  CREATE INDEX IX_loans_studentId_status          ON loans (studentId,          status);
  CREATE INDEX IX_loans_expectedReturnDate_status ON loans (expectedReturnDate, status);
END
GO

-- ─── sanctions ───────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'sanctions')
BEGIN
  CREATE TABLE sanctions (
    id           INT           IDENTITY(1,1) NOT NULL,
    studentId    INT           NOT NULL,
    loanId       INT           NULL,
    sanctionType NVARCHAR(20)  NOT NULL,
    daysOverdue  INT           NOT NULL CONSTRAINT DF_sanctions_daysOverdue DEFAULT 0,
    description  NVARCHAR(MAX) NULL,
    startsAt     DATETIME2     NOT NULL CONSTRAINT DF_sanctions_startsAt DEFAULT SYSUTCDATETIME(),
    endsAt       DATETIME2     NULL,
    isPermanent  BIT           NOT NULL CONSTRAINT DF_sanctions_isPermanent DEFAULT 0,
    appealMessage NVARCHAR(500) NULL,
    status       NVARCHAR(20)  NOT NULL CONSTRAINT DF_sanctions_status      DEFAULT 'active',
    createdAt    DATETIME2     NOT NULL CONSTRAINT DF_sanctions_createdAt   DEFAULT SYSUTCDATETIME(),
    resolvedAt   DATETIME2     NULL,

    CONSTRAINT PK_sanctions         PRIMARY KEY (id),
    CONSTRAINT FK_sanctions_users   FOREIGN KEY (studentId) REFERENCES users (id),
    CONSTRAINT FK_sanctions_loans   FOREIGN KEY (loanId)    REFERENCES loans (id)
  );

  CREATE INDEX IX_sanctions_studentId_status ON sanctions (studentId, status);
  CREATE INDEX IX_sanctions_blocking_window ON sanctions (studentId, status, startsAt, endsAt);
END
GO

-- ─── audit_log ───────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audit_log')
BEGIN
  CREATE TABLE audit_log (
    id         INT           IDENTITY(1,1) NOT NULL,
    action     NVARCHAR(100) NOT NULL,
    entityType NVARCHAR(50)  NOT NULL,
    entityId   INT           NULL,
    userId     INT           NULL,
    toolId     INT           NULL,
    details    NVARCHAR(MAX) NULL,
    timestamp  DATETIME2     NOT NULL CONSTRAINT DF_audit_log_timestamp DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_audit_log        PRIMARY KEY (id),
    CONSTRAINT FK_audit_log_users  FOREIGN KEY (userId) REFERENCES users (id),
    CONSTRAINT FK_audit_log_tools  FOREIGN KEY (toolId) REFERENCES tools (id)
  );

  CREATE INDEX IX_audit_log_timestamp ON audit_log (timestamp);
  CREATE INDEX IX_audit_log_userId    ON audit_log (userId);
  CREATE INDEX IX_audit_log_toolId    ON audit_log (toolId);
END
GO

-- ─── alerts ──────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'alerts')
BEGIN
  CREATE TABLE alerts (
    id             INT          IDENTITY(1,1) NOT NULL,
    loanId         INT          NOT NULL,
    studentId      INT          NOT NULL,
    alertType      NVARCHAR(40) NOT NULL,
    daysOverdue    INT          NOT NULL CONSTRAINT DF_alerts_daysOverdue DEFAULT 0,
    status         NVARCHAR(20) NOT NULL CONSTRAINT DF_alerts_status      DEFAULT 'pending',
    createdAt      DATETIME2    NOT NULL CONSTRAINT DF_alerts_createdAt   DEFAULT SYSUTCDATETIME(),
    acknowledgedAt DATETIME2    NULL,
    resolvedAt     DATETIME2    NULL,

    CONSTRAINT PK_alerts        PRIMARY KEY (id),
    CONSTRAINT FK_alerts_loans  FOREIGN KEY (loanId)    REFERENCES loans (id),
    CONSTRAINT FK_alerts_users  FOREIGN KEY (studentId) REFERENCES users (id)
  );

  CREATE INDEX IX_alerts_status_alertType ON alerts (status, alertType);
END
GO

-- ─── staff_notifications ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'staff_notifications')
BEGIN
  CREATE TABLE staff_notifications (
    id        INT           IDENTITY(1,1) NOT NULL,
    userId    INT           NOT NULL,
    title     NVARCHAR(255) NOT NULL,
    body      NVARCHAR(MAX) NOT NULL,
    linkHref  NVARCHAR(500) NULL,
    status    NVARCHAR(10)  NOT NULL CONSTRAINT DF_staff_notif_status    DEFAULT 'unread',
    createdAt DATETIME2     NOT NULL CONSTRAINT DF_staff_notif_createdAt DEFAULT SYSUTCDATETIME(),
    readAt    DATETIME2     NULL,

    CONSTRAINT PK_staff_notifications       PRIMARY KEY (id),
    CONSTRAINT FK_staff_notifications_users FOREIGN KEY (userId) REFERENCES users (id)
  );

  CREATE INDEX IX_staff_notifications_userId_status ON staff_notifications (userId, status);
END
GO

-- ─── email_outbox ─────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'email_outbox')
BEGIN
  CREATE TABLE email_outbox (
    id          INT           IDENTITY(1,1) NOT NULL,
    userId      INT           NULL,
    toEmail     NVARCHAR(320) NOT NULL,
    subject     NVARCHAR(500) NOT NULL,
    htmlBody    NVARCHAR(MAX) NOT NULL,
    status      NVARCHAR(10)  NOT NULL CONSTRAINT DF_email_outbox_status      DEFAULT 'pending',
    attempts    INT           NOT NULL CONSTRAINT DF_email_outbox_attempts    DEFAULT 0,
    lastError   NVARCHAR(MAX) NULL,
    scheduledAt DATETIME2     NOT NULL CONSTRAINT DF_email_outbox_scheduledAt DEFAULT SYSUTCDATETIME(),
    sentAt      DATETIME2     NULL,
    createdAt   DATETIME2     NOT NULL CONSTRAINT DF_email_outbox_createdAt   DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_email_outbox       PRIMARY KEY (id),
    CONSTRAINT FK_email_outbox_users FOREIGN KEY (userId) REFERENCES users (id)
  );

  CREATE INDEX IX_email_outbox_status_scheduledAt ON email_outbox (status, scheduledAt);
END
GO

-- ─── tool_categories ─────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tool_categories')
BEGIN
  CREATE TABLE tool_categories (
    id          INT           IDENTITY(1,1) NOT NULL,
    name        NVARCHAR(100) NOT NULL,
    description NVARCHAR(500) NULL,
    createdAt   DATETIME2     NOT NULL CONSTRAINT DF_tool_cat_createdAt DEFAULT SYSUTCDATETIME(),
    updatedAt   DATETIME2     NOT NULL CONSTRAINT DF_tool_cat_updatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_tool_categories      PRIMARY KEY (id),
    CONSTRAINT UQ_tool_categories_name UNIQUE (name)
  );
END
GO

-- ─── tool_locations ──────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tool_locations')
BEGIN
  CREATE TABLE tool_locations (
    id           INT           IDENTITY(1,1) NOT NULL,
    name         NVARCHAR(100) NOT NULL,
    locationType NVARCHAR(20)  NOT NULL CONSTRAINT DF_tool_loc_type DEFAULT 'estante',
    area         NVARCHAR(100) NOT NULL,
    createdAt    DATETIME2     NOT NULL CONSTRAINT DF_tool_loc_createdAt DEFAULT SYSUTCDATETIME(),
    updatedAt    DATETIME2     NOT NULL CONSTRAINT DF_tool_loc_updatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_tool_locations      PRIMARY KEY (id),
    CONSTRAINT UQ_tool_locations_name UNIQUE (name)
  );

  CREATE INDEX IX_tool_locations_area ON tool_locations (area);
END
GO

-- ─── loan_rules ──────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'loan_rules')
BEGIN
  CREATE TABLE loan_rules (
    id                  INT           IDENTITY(1,1) NOT NULL,
    minDays             INT           NOT NULL,
    maxDays             INT           NULL,
    sanctionDescription NVARCHAR(255) NOT NULL,
    canBorrow           BIT           NOT NULL CONSTRAINT DF_loan_rules_canBorrow DEFAULT 0,
    createdAt           DATETIME2     NOT NULL CONSTRAINT DF_loan_rules_createdAt DEFAULT SYSUTCDATETIME(),
    updatedAt           DATETIME2     NOT NULL CONSTRAINT DF_loan_rules_updatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_loan_rules PRIMARY KEY (id)
  );
END
GO

PRINT 'Kite Hub schema created successfully.';
GO
