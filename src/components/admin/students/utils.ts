import { StatusFilter, StudentRow } from "./types";

export function studentUiStatus(student: StudentRow): StatusFilter {
  if (student.isBanned) return "banned";
  if (student.sanctions.length > 0) return "sanctioned";
  return "active";
}

export function filterStudents(students: StudentRow[], query: string, statusFilter: StatusFilter) {
  const q = query.trim().toLowerCase();
  return students.filter((student) => {
    const name = (student.name ?? "").toLowerCase();
    const card = (student.cardKey ?? "").toLowerCase();
    const email = (student.email ?? "").toLowerCase();
    const matchesQuery = !q || name.includes(q) || card.includes(q) || email.includes(q);
    const overdueCount = student.loans.filter((loan) => loan.status === "overdue").length;
    const uiStatus = studentUiStatus(student);

    let matchesStatus = true;
    if (statusFilter === "active") matchesStatus = uiStatus === "active";
    else if (statusFilter === "sanctioned") matchesStatus = uiStatus === "sanctioned";
    else if (statusFilter === "banned") matchesStatus = uiStatus === "banned";
    else if (statusFilter === "has_loans") matchesStatus = student.loans.length > 0;
    else if (statusFilter === "overdue") matchesStatus = overdueCount > 0;

    return matchesQuery && matchesStatus;
  });
}
