import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

// ============= ROLE-BASED PROCEDURES =============
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo administradores pueden acceder a esta función",
    });
  }
  return next({ ctx });
});

const studentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "student" && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo estudiantes pueden acceder a esta función",
    });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============= TOOLS ROUTER =============
  tools: router({
    list: publicProcedure.query(async () => {
      return await db.getAllTools();
    }),
    getById: publicProcedure.input(z.number()).query(async ({ input }) => {
      return await db.getToolById(input);
    }),
    getByToolId: publicProcedure.input(z.string()).query(async ({ input }) => {
      return await db.getToolByToolId(input);
    }),
    create: adminProcedure
      .input(
        z.object({
          toolId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          category: z.string(),
          condition: z.enum(["excellent", "good", "fair", "poor"]).default("good"),
          location: z.string(),
          qrCode: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const tool = await db.createTool(input);
        const toolData = await db.getToolByToolId(input.toolId);
        if (toolData) {
          await db.createAuditLog({
            action: "CREATE_TOOL",
            entityType: "TOOL",
            entityId: toolData.id,
            userId: ctx.user.id,
            details: `Herramienta creada: ${input.name}`,
          });
        }
        return tool;
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          updates: z.object({
            name: z.string().optional(),
            description: z.string().optional(),
            category: z.string().optional(),
            condition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
            location: z.string().optional(),
            qrCode: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.updateTool(input.id, input.updates);
        await db.createAuditLog({
          action: "UPDATE_TOOL",
          entityType: "TOOL",
          entityId: input.id,
          userId: ctx.user.id,
          details: `Herramienta actualizada`,
        });
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        await db.deleteTool(input);
        await db.createAuditLog({
          action: "DELETE_TOOL",
          entityType: "TOOL",
          entityId: input,
          userId: ctx.user.id,
          details: `Herramienta eliminada`,
        });
        return { success: true };
      }),
  }),

  // ============= INVENTORY ROUTER =============
  inventory: router({
    getByToolId: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getInventoryByToolId(input);
      }),
    create: adminProcedure
      .input(
        z.object({
          toolId: z.number(),
          totalQuantity: z.number().default(1),
          availableQuantity: z.number().default(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const inv = await db.createInventory(input);
        const invData = await db.getInventoryByToolId(input.toolId);
        if (invData) {
          await db.createAuditLog({
            action: "CREATE_INVENTORY",
            entityType: "INVENTORY",
            entityId: invData.id,
            toolId: input.toolId,
            userId: ctx.user.id,
            details: `Inventario creado para herramienta ${input.toolId}`,
          });
        }
        return inv;
      }),
  }),

  // ============= LOANS ROUTER =============
  loans: router({
    getByStudent: studentProcedure.query(async ({ ctx }) => {
      return await db.getActiveLoansByStudent(ctx.user.id);
    }),
    create: studentProcedure
      .input(
        z.object({
          toolId: z.number(),
          expectedReturnDate: z.date(),
          conditionOnBorrow: z.enum(["excellent", "good", "fair", "poor"]).default("good"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const loan = await db.createLoan({
          toolId: input.toolId,
          studentId: ctx.user.id,
          borrowDate: new Date(),
          expectedReturnDate: input.expectedReturnDate,
          conditionOnBorrow: input.conditionOnBorrow,
          status: "active",
        });
        await db.createAuditLog({
          action: "BORROW",
          entityType: "LOAN",
          toolId: input.toolId,
          userId: ctx.user.id,
          details: `Préstamo registrado`,
        });
        return loan;
      }),
    return: studentProcedure
      .input(
        z.object({
          loanId: z.number(),
          conditionOnReturn: z.enum(["excellent", "good", "fair", "poor"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const loan = await db.getLoanById(input.loanId);
        if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "Préstamo no encontrado" });
        if (loan.studentId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No puedes devolver este préstamo" });
        }
        await db.updateLoan(input.loanId, {
          status: "returned",
          actualReturnDate: new Date(),
          conditionOnReturn: input.conditionOnReturn,
        });
        await db.createAuditLog({
          action: "RETURN",
          entityType: "LOAN",
          toolId: loan.toolId,
          userId: ctx.user.id,
          details: `Devolución registrada`,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
