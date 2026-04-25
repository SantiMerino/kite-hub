import * as db from "./db";

/**
 * Verifica préstamos vencidos y crea alertas automáticas
 */
export async function checkOverdueLoans() {
  const overdueLoans = await db.getOverdueLoans();
  
  for (const loan of overdueLoans) {
    const daysOverdue = Math.floor(
      (new Date().getTime() - new Date(loan.expectedReturnDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Crear alerta si no existe una pendiente
    const existingAlert = await db.getPendingAlerts();
    const hasAlert = existingAlert.some(a => a.loanId === loan.id);

    if (!hasAlert && daysOverdue > 0) {
      await db.createAlert({
        loanId: loan.id,
        studentId: loan.studentId,
        alertType: "overdue",
        daysOverdue,
        status: "pending",
      });

      // Crear sanción si los días de atraso lo justifican
      const rules = await db.getLoanRules();
      for (const rule of rules) {
        if (
          daysOverdue >= rule.minDays &&
          (!rule.maxDays || daysOverdue <= rule.maxDays)
        ) {
          // Verificar si ya existe sanción activa
          const activeSanctions = await db.getActiveSanctionsByStudent(loan.studentId);
          const hasSanction = activeSanctions.some(s => s.loanId === loan.id);

          if (!hasSanction) {
            await db.createSanction({
              studentId: loan.studentId,
              loanId: loan.id,
              sanctionType: "overdue",
              daysOverdue,
              description: rule.sanctionDescription,
              status: "active",
            });
          }
          break;
        }
      }
    }
  }
}

/**
 * Verifica préstamos próximos a vencer (1 día antes)
 */
export async function checkApproachingDeadlines() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const loans = await db.getActiveLoansByStudent(0); // Get all active loans
  
  for (const loan of loans) {
    if (loan.status === "active") {
      const daysUntilDue = Math.floor(
        (new Date(loan.expectedReturnDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDue === 1) {
        const existingAlert = await db.getPendingAlerts();
        const hasAlert = existingAlert.some(
          a => a.loanId === loan.id && a.alertType === "approaching_deadline"
        );

        if (!hasAlert) {
          await db.createAlert({
            loanId: loan.id,
            studentId: loan.studentId,
            alertType: "approaching_deadline",
            daysOverdue: 0,
            status: "pending",
          });
        }
      }
    }
  }
}

/**
 * Inicializa las reglas de sanciones por defecto
 */
export async function initializeDefaultRules() {
  const existingRules = await db.getLoanRules();
  
  if (existingRules.length === 0) {
    const defaultRules = [
      {
        minDays: 1,
        maxDays: 2,
        sanctionDescription: "Atraso leve: 1-2 días. Se permite continuar prestando.",
        canBorrow: true,
      },
      {
        minDays: 3,
        maxDays: 5,
        sanctionDescription: "Atraso moderado: 3-5 días. Restricción temporal de préstamos.",
        canBorrow: false,
      },
      {
        minDays: 6,
        maxDays: 10,
        sanctionDescription: "Atraso severo: 6-10 días. Prohibición de préstamos por 1 semana.",
        canBorrow: false,
      },
      {
        minDays: 11,
        maxDays: null,
        sanctionDescription: "Atraso crítico: +11 días. Prohibición de préstamos hasta resolución.",
        canBorrow: false,
      },
    ];

    for (const rule of defaultRules) {
      await db.createLoanRule(rule);
    }
  }
}

/**
 * Resuelve sanciones automáticamente cuando se devuelve el préstamo
 */
export async function resolveSanctionsForLoan(loanId: number) {
  const sanctions = await db.getActiveSanctionsByStudent(0);
  
  for (const sanction of sanctions) {
    if (sanction.loanId === loanId) {
      await db.updateSanction(sanction.id, {
        status: "resolved",
        resolvedAt: new Date(),
      });
    }
  }
}
