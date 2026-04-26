type LoanDeniedNotificationPayload = {
  loanId: number;
  studentId: number;
  studentName: string;
  studentEmail: string | null;
  toolName: string;
  toolCode: string;
  deniedReason: string;
};

/**
 * Placeholder notifier for denied loans.
 * Intentionally does not send emails yet because user identity delivery is external.
 */
export async function notifyLoanDeniedByEmail(
  payload: LoanDeniedNotificationPayload
): Promise<{ queued: false; reason: string; payload: LoanDeniedNotificationPayload }> {
  return {
    queued: false,
    reason: "Email sending is intentionally disabled in this phase.",
    payload,
  };
}
