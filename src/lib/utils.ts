// src/lib/utils.ts
import { type ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { FormData, CalculatedData, AnalysisData, ValidationResult } from "./types";

/** Tailwind className helper */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 
 * Normaliza número digitado em PT-BR (pontos milhar, vírgula decimal) para float
 * Aceita formatos como: 50.889,20 | 1.234.567,89 | 123,45 | 1234,56
 */
export function normalizeNumber(value: string | number): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  
  // Remove espaços e símbolos de moeda
  let clean = String(value).trim()
    .replace(/[R$\s]/g, "")  // Remove R$, espaços
    .replace(/[^\d.,-]/g, ""); // Mantém apenas dígitos, ponto, vírgula e sinal
  
  // Se tem vírgula E ponto, assume formato BR: ponto=milhar, vírgula=decimal
  if (clean.includes(',') && clean.includes('.')) {
    // Remove todos os pontos (milhares) e troca vírgula por ponto (decimal)
    clean = clean.replace(/\./g, "").replace(",", ".");
  }
  // Se tem APENAS vírgula, assume que é decimal
  else if (clean.includes(',') && !clean.includes('.')) {
    clean = clean.replace(",", ".");
  }
  // Se tem APENAS ponto(s), verifica se é milhar ou decimal
  else if (clean.includes('.') && !clean.includes(',')) {
    // Se tem múltiplos pontos, são milhares - remove todos
    const dotCount = (clean.match(/\./g) || []).length;
    if (dotCount > 1) {
      clean = clean.replace(/\./g, "");
    }
    // Se tem apenas 1 ponto e está a 3 dígitos do final, é milhar
    else if (dotCount === 1) {
      const parts = clean.split('.');
      if (parts[1] && parts[1].length === 3 && !parts[1].includes(',')) {
        // É milhar: 1.000 -> 1000
        clean = clean.replace('.', '');
      }
      // Senão, assume que é decimal: 123.45 -> 123.45
    }
  }
  
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
