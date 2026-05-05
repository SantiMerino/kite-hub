-- Normalize legacy appealed rows, then drop appeal message column.
BEGIN TRY
  BEGIN TRAN;

  UPDATE [dbo].[sanctions]
  SET
    [status] = N'resolved',
    [resolvedAt] = COALESCE([resolvedAt], SYSUTCDATETIME())
  WHERE [status] = N'appealed';

  ALTER TABLE [dbo].[sanctions] DROP COLUMN [appealMessage];

  COMMIT TRAN;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRAN;
  THROW;
END CATCH;
