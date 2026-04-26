type MetricsSummaryTableProps = {
  totalLoans30d: number;
  returnedLoans30d: number;
  overdueLoans: number;
  sanctionCount: number;
  returnRate: number;
};

export default function MetricsSummaryTable({
  totalLoans30d,
  returnedLoans30d,
  overdueLoans,
  sanctionCount,
  returnRate,
}: MetricsSummaryTableProps) {
  return (
    <table className="w-full text-sm">
      <tbody>
        <tr className="border-b">
          <td className="py-2.5 text-muted-foreground">Total prestamos</td>
          <td className="py-2.5 text-right font-semibold">{totalLoans30d}</td>
        </tr>
        <tr className="border-b">
          <td className="py-2.5 text-muted-foreground">Devueltos</td>
          <td className="py-2.5 text-right font-semibold text-emerald-600">{returnedLoans30d}</td>
        </tr>
        <tr className="border-b">
          <td className="py-2.5 text-muted-foreground">Con atraso (activos)</td>
          <td className="py-2.5 text-right font-semibold text-red-600">{overdueLoans}</td>
        </tr>
        <tr className="border-b">
          <td className="py-2.5 text-muted-foreground">Sanciones activas</td>
          <td className="py-2.5 text-right font-semibold text-purple-600">{sanctionCount}</td>
        </tr>
        <tr>
          <td className="py-2.5 text-muted-foreground">Tasa de devolucion</td>
          <td className="py-2.5 text-right font-semibold text-emerald-600">{returnRate}%</td>
        </tr>
      </tbody>
    </table>
  );
}
