// Tipos para autenticação e multi-tenant
export interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: 'owner' | 'manager' | 'viewer';
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  settings: TenantSettings;
  createdAt: string;
}

export interface TenantSettings {
  customLabels: Record<string, string>;
  additionalFields: AdditionalField[];
  defaultPeriod: string;
  decimalPlaces: number;
  showCards: boolean;
  showCharts: boolean;
}

export interface AdditionalField {
  id: string;
  label: string;
  type: 'currency' | 'percentage';
  required: boolean;
}

// Tipos para dados financeiros (seguindo especificação exata)
export interface FormData {
  vbv: number; // Valor Bruto de Vendas
  valoresPagosCliente: number; // Valores pagos pelo cliente e repassados ao iFood
  vrl: number; // Repasse Líquido iFood
  vrlj: number; // Valores Recebidos via Loja
  additionalValues: Record<string, number>; // Campos adicionais configuráveis
  periodo: string;
  tenantId: string;
}

// Tipos para análise detalhada
export interface DetailedAnalysisData {
  promocoes: number;
  taxasComissoes: number;
  servicosLogisticos: number;
  outrosValores: number;
  debitosDetalhados: number;
  rbrPosDebitos: number;
  repasseLiquidoReal: number;
  percentuais: {
    promocoes: number;
    taxasComissoes: number;
    servicosLogisticos: number;
    outrosValores: number;
    totalDebitos: number;
  };
}

// Tipos para cálculos (seguindo fórmulas exatas da especificação)
export interface CalculatedData {
  rbr: number; // Receita Bruta Real = VBV - valoresPagosCliente
  rol: number; // Receita Operacional Líquida = VRL + VRLJ
  rentabilidadeLiquida: number; // ROL / RBR
  retencaoIfoodPercentual: number; // 1 - Rentabilidade Líquida
  valorRetidoIfood: number; // RBR - ROL
  detailedAnalysis?: DetailedAnalysisData; // Análise detalhada opcional
}

export interface AnalysisData {
  id: string;
  formData: FormData;
  calculatedData: CalculatedData;
  timestamp: string;
  userId: string;
  tenantId: string;
}

// Tipos para exportação
export interface ExportData {
  periodo: string;
  vbv: number;
  valoresPagosCliente: number;
  rbr: number;
  vrl: number;
  vrlj: number;
  rol: number;
  rentabilidadeLiquida: number;
  retencaoIfoodPercentual: number;
  valorRetidoIfood: number;
  // Novos campos para análise detalhada
  promocoes?: number;
  taxasComissoes?: number;
  servicosLogisticos?: number;
  outrosValores?: number;
  debitosDetalhados?: number;
  rbrPosDebitos?: number;
  repasseLiquidoReal?: number;
  percentualPromocoes?: number;
  percentualTaxasComissoes?: number;
  percentualServicosLogisticos?: number;
  percentualOutrosValores?: number;
  percentualTotalDebitos?: number;
}

// Tipos para gráficos
export interface ChartData {
  period: string;
  rbr: number;
  rol: number;
}

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}

// Tipos para validação
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}