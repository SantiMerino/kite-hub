-- =============================================================================
-- Kite Hub — Add color column to tool_categories (manual / legacy SQL path)
-- Safe to re-run on SQL Server.
-- =============================================================================

IF NOT EXISTS (
  SELECT 1
  FROM sys.columns c
  INNER JOIN sys.tables t ON c.object_id = t.object_id
  WHERE t.name = 'tool_categories' AND c.name = 'color'
)
BEGIN
  ALTER TABLE tool_categories ADD color NVARCHAR(7) NULL;
  PRINT 'Column tool_categories.color added.';
END
ELSE
  PRINT 'Column tool_categories.color already exists.';
GO
