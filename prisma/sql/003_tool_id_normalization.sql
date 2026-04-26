-- =============================================================================
-- Kite Hub — Tool identifier normalization
-- Rebuilds toolId values as PREFIX_NNN while preserving unique per tool unit.
-- Also backfills new Tool columns: prefix, requiresApproval.
-- =============================================================================

USE kite_hub;
GO

IF COL_LENGTH('tools', 'prefix') IS NULL
BEGIN
  ALTER TABLE tools ADD prefix NVARCHAR(10) NULL;
END
GO

IF COL_LENGTH('tools', 'requiresApproval') IS NULL
BEGIN
  ALTER TABLE tools ADD requiresApproval BIT NOT NULL CONSTRAINT DF_tools_requiresApproval_mig DEFAULT 0;
END
GO

;WITH normalized AS (
  SELECT
    t.id,
    t.toolId AS oldToolId,
    UPPER(LEFT(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(t.name)), ' ', ''), '-', ''), '_', ''), 3)) AS basePrefix
  FROM tools t
),
prepared AS (
  SELECT
    n.id,
    n.oldToolId,
    CASE WHEN LEN(n.basePrefix) < 3 THEN RIGHT(CONCAT(n.basePrefix, 'XXX'), 3) ELSE n.basePrefix END AS prefix
  FROM normalized n
),
sequenced AS (
  SELECT
    p.id,
    p.oldToolId,
    p.prefix,
    ROW_NUMBER() OVER (PARTITION BY p.prefix ORDER BY p.id) AS seq
  FROM prepared p
)
UPDATE t
SET
  t.prefix = s.prefix,
  t.toolId = CONCAT(s.prefix, '_', RIGHT(CONCAT('000', CAST(s.seq AS NVARCHAR(10))), 3)),
  t.qrCode = CASE
    WHEN t.qrCode IS NULL OR t.qrCode = '' OR t.qrCode = s.oldToolId
      THEN CONCAT(s.prefix, '_', RIGHT(CONCAT('000', CAST(s.seq AS NVARCHAR(10))), 3))
    ELSE t.qrCode
  END
FROM tools t
INNER JOIN sequenced s ON s.id = t.id;
GO

ALTER TABLE tools ALTER COLUMN prefix NVARCHAR(10) NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tools_prefix' AND object_id = OBJECT_ID('tools'))
BEGIN
  CREATE INDEX IX_tools_prefix ON tools (prefix);
END
GO

PRINT 'Tool identifier normalization completed successfully.';
GO
