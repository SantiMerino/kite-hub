-- =============================================================================
-- Kite Hub — Wipe schema objects but keep database
-- Target: SQL Server 2022
-- Effect: Drops user objects (FKs, tables, views, routines, triggers, synonyms)
--         inside kite_hub, but DOES NOT drop the database itself.
-- =============================================================================

USE kite_hub;
GO

SET NOCOUNT ON;
GO

PRINT 'Starting wipe for database: kite_hub';
GO

BEGIN TRY
  BEGIN TRANSACTION;

  -- 1) Drop all foreign keys first (safe table cleanup order).
  DECLARE @sql NVARCHAR(MAX) = N'';

  SELECT @sql = @sql + N'
ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(parent.schema_id)) + N'.' + QUOTENAME(parent.name) +
N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
  FROM sys.foreign_keys fk
  JOIN sys.tables parent ON parent.object_id = fk.parent_object_id;

  IF LEN(@sql) > 0 EXEC sp_executesql @sql;

  -- 2) Drop views.
  SET @sql = N'';
  SELECT @sql = @sql + N'
DROP VIEW ' + QUOTENAME(SCHEMA_NAME(v.schema_id)) + N'.' + QUOTENAME(v.name) + N';'
  FROM sys.views v
  WHERE v.is_ms_shipped = 0;

  IF LEN(@sql) > 0 EXEC sp_executesql @sql;

  -- 3) Drop procedures.
  SET @sql = N'';
  SELECT @sql = @sql + N'
DROP PROCEDURE ' + QUOTENAME(SCHEMA_NAME(p.schema_id)) + N'.' + QUOTENAME(p.name) + N';'
  FROM sys.procedures p
  WHERE p.is_ms_shipped = 0;

  IF LEN(@sql) > 0 EXEC sp_executesql @sql;

  -- 4) Drop scalar/table-valued functions.
  SET @sql = N'';
  SELECT @sql = @sql + N'
DROP FUNCTION ' + QUOTENAME(SCHEMA_NAME(o.schema_id)) + N'.' + QUOTENAME(o.name) + N';'
  FROM sys.objects o
  WHERE o.type IN ('FN', 'IF', 'TF', 'FS', 'FT')
    AND o.is_ms_shipped = 0;

  IF LEN(@sql) > 0 EXEC sp_executesql @sql;

  -- 5a) Database-scoped DDL triggers (require ON DATABASE; not schema_id on sys.triggers)
  SET @sql = N'';
  SELECT @sql = @sql + N'
DROP TRIGGER ' + QUOTENAME(t.name) + N' ON DATABASE;'
  FROM sys.triggers t
  WHERE t.parent_class = 0
    AND t.is_ms_shipped = 0;

  IF LEN(@sql) > 0 EXEC sp_executesql @sql;

  -- 5b) Remaining triggers (DML, etc.): use sys.objects for schema + name
  SET @sql = N'';
  SELECT @sql = @sql + N'
DROP TRIGGER ' + QUOTENAME(SCHEMA_NAME(o.schema_id)) + N'.' + QUOTENAME(o.name) + N';'
  FROM sys.objects o
  WHERE o.type = N'TR'
    AND o.is_ms_shipped = 0;

  IF LEN(@sql) > 0 EXEC sp_executesql @sql;

  -- 6) Drop synonyms (if any) — also via sys.objects for full schema + name.
  SET @sql = N'';
  SELECT @sql = @sql + N'
DROP SYNONYM ' + QUOTENAME(SCHEMA_NAME(o.schema_id)) + N'.' + QUOTENAME(o.name) + N';'
  FROM sys.objects o
  WHERE o.type = N'SN'
    AND o.is_ms_shipped = 0;

  IF LEN(@sql) > 0 EXEC sp_executesql @sql;

  -- 7) Drop all user tables.
  SET @sql = N'';
  SELECT @sql = @sql + N'
DROP TABLE ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name) + N';'
  FROM sys.tables t
  WHERE t.is_ms_shipped = 0;

  IF LEN(@sql) > 0 EXEC sp_executesql @sql;

  COMMIT TRANSACTION;
  PRINT 'Wipe completed successfully. Database still exists: kite_hub';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

  DECLARE @err NVARCHAR(4000) = ERROR_MESSAGE();
  DECLARE @line INT = ERROR_LINE();
  DECLARE @num INT = ERROR_NUMBER();

  RAISERROR('Wipe failed. Error %d at line %d: %s', 16, 1, @num, @line, @err);
END CATCH;
GO
