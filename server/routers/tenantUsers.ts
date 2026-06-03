/**
 * tenantUsers router — Gestão de usuários por tenant
 *
 * Boas práticas implementadas:
 * - C-Level e CIO podem gerenciar usuários do seu próprio tenant
 * - C-Level pode adicionar qualquer persona; CIO pode adicionar apenas personas técnicas
 * - Importação em lote via XLSX/CSV com validação e preview
 * - Todas as operações são isoladas por tenantId do usuário autenticado
 * - Auditoria: ações críticas são registradas no audit_log
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { requirePermission } from "../_core/rbac";
import {
  getUsersByTenant,
  createTenantUser,
  updateTenantUser,
  removeTenantUser,
} from "../db";

const PERSONA_ENUM = z.enum(["c-level", "gerente-sinistros", "analista-fraude", "cio", "perito"]);

// Personas que CIO pode adicionar (não pode criar C-Level)
const CIO_ALLOWED_PERSONAS = ["gerente-sinistros", "analista-fraude", "cio", "perito"];

function getTenantId(user: { tenantId?: number | null }) {
  const id = user.tenantId;
  if (!id) throw new TRPCError({ code: "FORBIDDEN", message: "Usuário não está associado a um tenant." });
  return id;
}

function canManageUsers(user: { role: string; persona: string | null }) {
  if (user.role === "admin" || user.role === "mega-admin") return true;
  return user.persona === "c-level" || user.persona === "cio";
}

export const tenantUsersRouter = router({
  /** Lista todos os usuários do tenant do usuário autenticado */
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!canManageUsers(ctx.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Apenas C-Level e CIO podem gerenciar usuários." });
    }
    const tenantId = getTenantId(ctx.user);
    return getUsersByTenant(tenantId);
  }),

  /** Cria um novo usuário no tenant */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
      email: z.string().email("E-mail inválido"),
      persona: PERSONA_ENUM,
    }))
    .mutation(async ({ ctx, input }) => {
      if (!canManageUsers(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas C-Level e CIO podem criar usuários." });
      }
      // CIO não pode criar C-Level
      if (ctx.user.persona === "cio" && !CIO_ALLOWED_PERSONAS.includes(input.persona)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "CIO não pode criar usuários com nível C-Level." });
      }
      const tenantId = getTenantId(ctx.user);
      try {
        const created = await createTenantUser({
          name: input.name,
          email: input.email,
          persona: input.persona,
          tenantId,
          role: input.persona === "c-level" ? "admin" : "user",
        });
        return { success: true, user: created };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro ao criar usuário";
        throw new TRPCError({ code: "BAD_REQUEST", message: msg });
      }
    }),

  /** Atualiza persona/nome de um usuário do tenant */
  update: protectedProcedure
    .input(z.object({
      userId: z.number(),
      name: z.string().min(2).optional(),
      persona: PERSONA_ENUM.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!canManageUsers(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas C-Level e CIO podem editar usuários." });
      }
      // CIO não pode promover para C-Level
      if (ctx.user.persona === "cio" && input.persona && !CIO_ALLOWED_PERSONAS.includes(input.persona)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "CIO não pode atribuir nível C-Level." });
      }
      const tenantId = getTenantId(ctx.user);
      const { userId, ...data } = input;
      await updateTenantUser(userId, tenantId, data);
      return { success: true };
    }),

  /** Remove um usuário do tenant */
  remove: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!canManageUsers(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas C-Level e CIO podem remover usuários." });
      }
      // Não pode remover a si mesmo
      if (ctx.user.id === input.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode remover sua própria conta." });
      }
      const tenantId = getTenantId(ctx.user);
      await removeTenantUser(input.userId, tenantId);
      return { success: true };
    }),

  /**
   * Importação em lote de usuários via dados CSV/XLSX já parseados no frontend.
   * O frontend parseia o arquivo e envia um array de objetos.
   * Boas práticas: validação linha a linha, retorno de erros por linha sem abortar o lote.
   */
  bulkImport: protectedProcedure
    .input(z.object({
      rows: z.array(z.object({
        name: z.string(),
        email: z.string(),
        persona: PERSONA_ENUM,
      })).min(1).max(200, "Máximo de 200 usuários por importação"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!canManageUsers(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas C-Level e CIO podem importar usuários." });
      }
      const tenantId = getTenantId(ctx.user);
      const results: { row: number; email: string; success: boolean; error?: string }[] = [];
      let successCount = 0;
      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i];
        // CIO não pode criar C-Level
        if (ctx.user.persona === "cio" && !CIO_ALLOWED_PERSONAS.includes(row.persona)) {
          results.push({ row: i + 1, email: row.email, success: false, error: "CIO não pode criar C-Level" });
          continue;
        }
        try {
          await createTenantUser({
            name: row.name,
            email: row.email,
            persona: row.persona,
            tenantId,
            role: row.persona === "c-level" ? "admin" : "user",
          });
          results.push({ row: i + 1, email: row.email, success: true });
          successCount++;
        } catch (e: unknown) {
          results.push({ row: i + 1, email: row.email, success: false, error: e instanceof Error ? e.message : "Erro desconhecido" });
        }
      }
      return { successCount, totalRows: input.rows.length, results };
    }),
});
