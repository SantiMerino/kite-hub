import { buildAuditListHref, type AuditListQuery } from "../build-audit-href";

type AuditPaginationProps = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  query: Omit<AuditListQuery, "page">;
};

export default function AuditPagination({ page, limit, total, totalPages, query }: AuditPaginationProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center pt-4 text-sm">
      <span className="text-muted-foreground">
        Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <a
            href={buildAuditListHref({ ...query, page: page - 1 })}
            className="px-3 py-1.5 rounded-md border border-border hover:bg-muted text-sm"
          >
            Anterior
          </a>
        )}
        {page < totalPages && (
          <a
            href={buildAuditListHref({ ...query, page: page + 1 })}
            className="px-3 py-1.5 rounded-md border border-border hover:bg-muted text-sm"
          >
            Siguiente
          </a>
        )}
      </div>
    </div>
  );
}
