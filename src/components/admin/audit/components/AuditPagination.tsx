type AuditPaginationProps = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function AuditPagination({ page, limit, total, totalPages }: AuditPaginationProps) {
  return (
    <div className="flex justify-between items-center pt-4 text-sm">
      <span className="text-muted-foreground">
        Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <a href={`?page=${page - 1}`} className="px-3 py-1.5 rounded-md border hover:bg-muted text-sm">
            Anterior
          </a>
        )}
        {page < totalPages && (
          <a href={`?page=${page + 1}`} className="px-3 py-1.5 rounded-md border hover:bg-muted text-sm">
            Siguiente
          </a>
        )}
      </div>
    </div>
  );
}
