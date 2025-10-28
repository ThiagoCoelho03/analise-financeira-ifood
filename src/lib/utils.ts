// src/lib/utils.ts
import { type ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { FormData, CalculatedData, AnalysisData, ValidationResult, User as UserType } from "./types";

/** Tailwind className helper */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normaliza número digitado em PT-BR (pontos milhar, vírgula decimal) para float */
export function normalizeNumber(value: string | number): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const clean = value
    .replace(/[^\d.,-]/g, "")      // mantém dígitos, vírgula, ponto e sinal
    .replace(/\.(?=.*\.)/g, "")    // remove pontos intermediários (milhar)
    .replace(",", ".");            // vírgula -> ponto
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

/** Formata moeda BRL */
export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
}

/** Formata percentual (entrada 0–100) */
export function formatPercentage(p: number): string {
  const frac = (p ?? 0) / 100;
  return new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(frac);
}

/** Formata percentual direto (entrada já é 0-100, não divide por 100) */
export function formatPercentageDirect(p: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((p ?? 0) / 100);
}

/** Cálculo principal das métricas */
export function calculateMetrics(data: FormData): CalculatedData {
  const vbv = Number(data.vbv) || 0;
  const valoresPagosCliente = Number(data.valoresPagosCliente) || 0;
  const vrl = Number(data.vrl) || 0;
  const vrlj = Number(data.vrlj) || 0;

  const rbr = vbv - valoresPagosCliente;   // Receita Bruta Real
  const rol = vrl + vrlj;                  // Receita Operacional Líquida
  const rentabilidadeLiquida = rbr > 0 ? (rol / rbr) * 100 : 0;
  const retencaoIfoodPercentual = 100 - rentabilidadeLiquida;
  const valorRetidoIfood = rbr - rol;

  return {
    rbr,
    rol,
    rentabilidadeLiquida,
    retencaoIfoodPercentual,
    valorRetidoIfood,
  };
}

/** Validação simples do formulário */
export function validateFormData(data: FormData): ValidationResult {
  const errors: { field: keyof FormData | "base"; message: string }[] = [];
  const warnings: string[] = [];

  const vbv = Number(data.vbv) || 0;
  const vpc = Number(data.valoresPagosCliente) || 0;
  const vrl = Number(data.vrl) || 0;
  const vrlj = Number(data.vrlj) || 0;

  const rbr = vbv - vpc;
  const rol = vrl + vrlj;

  if (vbv <= 0) errors.push({ field: "vbv", message: "VBV deve ser maior que zero." });
  if (vpc < 0) errors.push({ field: "valoresPagosCliente", message: "Valores pagos pelo cliente não pode ser negativo." });
  if (rbr <= 0) errors.push({ field: "base", message: "Receita Bruta Real (VBV - valores pagos) deve ser positiva." });
  if (rol > rbr) warnings.push("ROL maior do que a Receita Bruta Real. Revise os números.");

  return { isValid: errors.length === 0, errors, warnings };
}

/** Mensagens de resultado para o dashboard */
export function generateResultMessages(calc: CalculatedData): string[] {
  return [
    `Sua RBR foi ${formatCurrency(calc.rbr)}.`,
    `Seu ROL foi ${formatCurrency(calc.rol)}.`,
    `Rentabilidade líquida: ${formatPercentage(calc.rentabilidadeLiquida)}.`,
    `Retenção iFood: ${formatPercentage(calc.retencaoIfoodPercentual)} (${formatCurrency(calc.valorRetidoIfood)}).`,
  ];
}

/** Exportar CSV no browser (no SSR, não faz nada) */
export function exportToCSV(rows: Record<string, string | number>[], filename = "dados") {
  if (typeof window === "undefined") return; // evita erro no lado do servidor

  const headers = Object.keys(rows[0] || {});
  const csv = [
    headers.join(";"),
    ...rows.map(r => headers.map(h => String(r[h] ?? "")).join(";")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Dados de exemplo para preencher o formulário */
export function generateTestData(): FormData {
  return {
    vbv: 100000,
    valoresPagosCliente: 4000,
    vrl: 70000,
    vrlj: 5000,
    additionalValues: {},
    periodo: new Date().toISOString().slice(0, 7),
    tenantId: "demo-tenant",
  };
}

/** Salva uma análise no localStorage (array por tenant) */
export function saveAnalysisData(analysis: AnalysisData) {
  if (typeof window === "undefined") return;
  const key = `ifood-analyses-${analysis.tenantId}`;
  const arr: AnalysisData[] = JSON.parse(localStorage.getItem(key) || "[]");
  arr.push(analysis);
  localStorage.setItem(key, JSON.stringify(arr));
}

/** Lê análises por período (string livre) */
export function getAnalysisDataByPeriod(tenantId: string, contains: string): AnalysisData[] {
  if (typeof window === "undefined") return [];
  const key = `ifood-analyses-${tenantId}`;
  const arr: AnalysisData[] = JSON.parse(localStorage.getItem(key) || "[]");
  return arr.filter(a => (a.formData?.periodo || "").includes(contains));
}

/** Lê o usuário salvo no localStorage (protegido para SSR) */
export function getCurrentUser(): UserType | null {
  if (typeof window === "undefined") return null; // evita erro no SSR/Turbopack

  try {
    const raw = localStorage.getItem("ifood-user");
    if (!raw) return null;

    const user = JSON.parse(raw) as Partial<UserType>;
    // validações mínimas
    if (user && typeof user === "object" && user.id && user.tenantId) {
      return user as UserType;
    }
    return null;
  } catch {
    return null;
  }
}

/** Salva usuário "logado" no localStorage para reabrir sessão */
export function saveUser(user: UserType) {
  if (typeof window === "undefined") return;
  localStorage.setItem("ifood-user", JSON.stringify(user));
}

/** "Logout" simples */
export function logout() {
  if (typeof window === "undefined") return;
  // Se quiser limpar só o usuário, mantenha as análises
  localStorage.removeItem("ifood-user");
}