-- AlterTable (idempotent: safe if column already exists, e.g. after db push)
IF NOT EXISTS (
  SELECT 1
  FROM sys.columns c
  INNER JOIN sys.tables t ON c.object_id = t.object_id
  WHERE t.name = 'tool_categories' AND c.name = 'color'
)
BEGIN
  ALTER TABLE [tool_categories] ADD [color] NVARCHAR(7) NULL;
END
