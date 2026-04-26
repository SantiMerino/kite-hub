-- =============================================================================
-- Kite Hub — Additive migration: tool_categories & tool_locations
-- Run AFTER 001_schema.sql on existing databases.
-- Safe to re-run: uses IF NOT EXISTS guards.
-- =============================================================================

USE kite_hub;
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
  PRINT 'Table tool_categories created.';
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
  PRINT 'Table tool_locations created.';
END
GO

-- ─── Seed categories from existing tools ─────────────────────────────────────
MERGE tool_categories AS target
USING (
  SELECT DISTINCT category AS name FROM tools WHERE category IS NOT NULL AND category <> ''
) AS source ON target.name = source.name
WHEN NOT MATCHED THEN
  INSERT (name, createdAt, updatedAt)
  VALUES (source.name, SYSUTCDATETIME(), SYSUTCDATETIME());
GO

-- ─── Seed locations from existing tools ──────────────────────────────────────
MERGE tool_locations AS target
USING (
  SELECT DISTINCT
    location AS name,
    CASE
      WHEN LOWER(location) LIKE 'gaveta%' THEN 'gaveta'
      ELSE 'estante'
    END AS locationType,
    CASE
      WHEN location LIKE '% [A-Z]-%' THEN CONCAT('Mueble ', SUBSTRING(location, PATINDEX('% [A-Z]-%', location) + 1, 1))
      WHEN location LIKE '%[A-Z]-[0-9]%' THEN CONCAT('Mueble ', SUBSTRING(location, PATINDEX('%[A-Z]-[0-9]%', location), 1))
      ELSE 'General'
    END AS area
  FROM tools
  WHERE location IS NOT NULL AND location <> ''
) AS source ON target.name = source.name
WHEN NOT MATCHED THEN
  INSERT (name, locationType, area, createdAt, updatedAt)
  VALUES (source.name, source.locationType, source.area, SYSUTCDATETIME(), SYSUTCDATETIME());
GO

PRINT 'Migration 004: tool_categories and tool_locations applied successfully.';
GO
