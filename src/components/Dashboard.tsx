"use client";

import { useState, useEffect } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Save, 
  Download,
  AlertTriangle,
  Info,
  LogOut,
  Settings,
  Calendar,
  BarChart3,
  PieChart,
  User,
  Building2,
  Trash2
} from 'lucide-react';
import { 
  FormData, 
  CalculatedData, 
  AnalysisData, 
  User as UserType,
  ValidationResult 
} from '@/lib/types';
import { 
  calculateMetrics, 
  validateFormData,
  saveAnalysisData, 
  getAnalysisDataByPeriod,
  formatCurrency, 
  formatPercentage,
  normalizeNumber,
  exportToCSV,
  generateResultMessages,
  generateTestData,
  logout
} from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DetailedAnalysis from '@/components/DetailedAnalysis';

interface DashboardProps {
  user: UserType;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [formData, setFormData] = useState<FormData>({
    vbv: 0,
    valoresPagosCliente: 0,
    vrl: 0,
    vrlj: 0,
    additionalValues: {},
    periodo: new Date().toISOString().slice(0, 7),
    tenantId: user.tenantId
  });

  const [calculatedData, setCalculatedData] = useState<CalculatedData | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<AnalysisData[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAnalysisData();
  }, [user.tenantId]);

  const loadAnalysisData = () => {
    try {
      // Carregar dados salvos do localStorage
      const savedData = localStorage.getItem(`ifood-analyses-${user.tenantId}`);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setSavedAnalyses(Array.isArray(parsedData) ? parsedData : []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados salvos:', error);
      setSavedAnalyses([]);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    const numericValue = normalizeNumber(value);
    setFormData(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  const handleAdditionalValueChange = (field: string, value: number) => {
    // Se o campo contém "additionalValues.", extrair apenas o nome do campo
    const fieldName = field.includes('additionalValues.') ? field.split('.')[1] : field;
    
    setFormData(prev => ({
      ...prev,
      additionalValues: {
        ...prev.additionalValues,
        [fieldName]: value
      }
    }));
  };

  const handleCalculate = () => {
    const validationResult = validateFormData(formData);
    setValidation(validationResult);

    if (validationResult.isValid) {
      const results = calculateMetrics(formData);
      setCalculatedData(results);
      setShowResults(true);
    }
  };

  const handleSave = async () => {
    if (!calculatedData || !validation?.isValid) {
      alert('⚠️ Não é possível salvar: calcule as métricas primeiro e certifique-se de que não há erros.');
      return;
    }

    setIsSaving(true);
    
    try {
      // Usar as datas de início e fim para criar o período de análise
      const periodString = `${startDate} até ${endDate}`;
      
      const analysisData: AnalysisData = {
        id: Date.now().toString(),
        formData: {
          ...formData,
          periodo: periodString // Salvar com o período personalizado
        },
        calculatedData,
        timestamp: new Date().toISOString(),
        userId: user.id,
        tenantId: user.tenantId
      };
      
      // Salvar no localStorage
      const currentData = localStorage.getItem(`ifood-analyses-${user.tenantId}`);
      let analyses: AnalysisData[] = [];
      
      if (currentData) {
        try {
          analyses = JSON.parse(currentData);
          if (!Array.isArray(analyses)) {
            analyses = [];
          }
        } catch (error) {
          console.error('Erro ao parsear dados existentes:', error);
          analyses = [];
        }
      }
      
      // Adicionar nova análise
      analyses.push(analysisData);
      
      // Salvar de volta no localStorage
      localStorage.setItem(`ifood-analyses-${user.tenantId}`, JSON.stringify(analyses));
      
      // Atualizar estado local
      setSavedAnalyses(analyses);
      
      // Feedback visual de sucesso
      alert('✅ Análise salva com sucesso!\n\n' + 
            `Período: ${periodString}\n` +
            `RBR: ${formatCurrency(calculatedData.rbr)}\n` +
            `ROL: ${formatCurrency(calculatedData.rol)}\n` +
            `Rentabilidade: ${formatPercentage(calculatedData.rentabilidadeLiquida)}`);
      
    } catch (error) {
      console.error('Erro ao salvar análise:', error);
      alert('❌ Erro ao salvar análise. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAnalysis = (analysisId: string) => {
    if (!analysisId) return;

    try {
      // use updater function para evitar estado "stale"
      setSavedAnalyses((prev) => {
        const updated = prev.filter(a => a.id !== analysisId);

        // persiste somente JSON puro
        localStorage.setItem(
          `ifood-analyses-${user.tenantId}`,
          JSON.stringify(updated)
        );

        // log mínimo (sem objetos complexos)
        console.log('✅ Análise excluída', {
          analysisId,
          remainingCount: updated.length,
        });

        return updated;
      });

      // se quiser feedback visual, use um toast do seu UI kit.
      // evite window.alert/confirm dentro da Lasy/iframe
    } catch (err) {
      console.error('❌ Erro ao excluir análise', {
        analysisId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleExport = () => {
    if (savedAnalyses.length === 0) return;

    const exportData = savedAnalyses.map(analysis => ({
      periodo: analysis.formData.periodo,
      vbv: analysis.formData.vbv,
      valoresPagosCliente: analysis.formData.valoresPagosCliente,
      rbr: analysis.calculatedData.rbr,
      vrl: analysis.formData.vrl,
      vrlj: analysis.formData.vrlj,
      rol: analysis.calculatedData.rol,
      rentabilidadeLiquida: analysis.calculatedData.rentabilidadeLiquida,
      retencaoIfoodPercentual: analysis.calculatedData.retencaoIfoodPercentual,
      valorRetidoIfood: analysis.calculatedData.valorRetidoIfood,
      // Novos campos da análise detalhada
      promocoes: analysis.formData.additionalValues.promocoes || 0,
      taxasComissoes: analysis.formData.additionalValues.taxasComissoes || 0,
      servicosLogisticos: analysis.formData.additionalValues.servicosLogisticos || 0,
      outrosValores: analysis.formData.additionalValues.outrosValores || 0,
      debitosDetalhados: analysis.calculatedData.detailedAnalysis?.debitosDetalhados || 0,
      rbrPosDebitos: analysis.calculatedData.detailedAnalysis?.rbrPosDebitos || 0,
      repasseLiquidoReal: analysis.calculatedData.detailedAnalysis?.repasseLiquidoReal || 0,
      percentualPromocoes: analysis.calculatedData.detailedAnalysis?.percentuais.promocoes || 0,
      percentualTaxasComissoes: analysis.calculatedData.detailedAnalysis?.percentuais.taxasComissoes || 0,
      percentualServicosLogisticos: analysis.calculatedData.detailedAnalysis?.percentuais.servicosLogisticos || 0,
      percentualOutrosValores: analysis.calculatedData.detailedAnalysis?.percentuais.outrosValores || 0,
      percentualTotalDebitos: analysis.calculatedData.detailedAnalysis?.percentuais.totalDebitos || 0
    }));

    exportToCSV(exportData, `ifood-analysis-${user.tenantId}-${new Date().toISOString().slice(0, 10)}`);
  };

  const loadTestData = () => {
    const testData = generateTestData();
    setFormData({ ...testData, tenantId: user.tenantId });
  };

  const handleLogout = () => {
    logout();
    onLogout();
  };

  // Todos os campos são editáveis agora
  const canEdit = true;
  const canView = true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      {/* Header - Otimizado para mobile */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 p-1.5 sm:p-2 rounded-xl flex-shrink-0">
                <Building2 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Margem Real</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Tenant: {user.tenantId}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* User Info - Compacto em mobile */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">
                    {user.role === 'owner' ? 'Proprietário' : user.role === 'manager' ? 'Gerente' : 'Visualizador'}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-red-500 to-orange-500 p-1.5 sm:p-2 rounded-lg">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Formulário de Entrada - Otimizado para mobile */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0" />
                <h2 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">Dados Financeiros</h2>
              </div>
              <button
                onClick={loadTestData}
                className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium whitespace-nowrap"
              >
                Exemplo
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* Período de Análise com Data de Início e Fim - SEMPRE EDITÁVEL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Período de Análise
                  <Info className="inline w-3 h-3 sm:w-4 sm:h-4 ml-1 text-gray-400" title="Defina o período exato para análise" />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data de Início</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data de Término</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm sm:text-base"
                    />
                  </div>
                </div>
                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    <strong>Período selecionado:</strong> {startDate} até {endDate}
                  </p>
                </div>
              </div>

              {/* Valor Bruto de Vendas - SEMPRE EDITÁVEL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Valor Bruto de Vendas (VBV)
                  <Info className="inline w-3 h-3 sm:w-4 sm:h-4 ml-1 text-gray-400" title="Total bruto de vendas no período" />
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.vbv || ''}
                    onChange={(e) => handleInputChange('vbv', e.target.value)}
                    placeholder="100.000,00"
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Valores pagos pelo cliente - SEMPRE EDITÁVEL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="block sm:inline">Valores pagos pelo cliente</span>
                  <span className="block sm:inline"> e repassados ao iFood</span>
                  <Info className="inline w-3 h-3 sm:w-4 sm:h-4 ml-1 text-gray-400" title="Total de valores pagos pelo cliente e repassados ao iFood" />
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.valoresPagosCliente || ''}
                    onChange={(e) => handleInputChange('valoresPagosCliente', e.target.value)}
                    placeholder="4.000,00"
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Repasse Líquido iFood - SEMPRE EDITÁVEL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Repasse Líquido iFood (VRL)
                  <Info className="inline w-3 h-3 sm:w-4 sm:h-4 ml-1 text-gray-400" title="Valor efetivamente repassado pelo iFood à loja" />
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.vrl || ''}
                    onChange={(e) => handleInputChange('vrl', e.target.value)}
                    placeholder="70.000,00"
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Valores Recebidos via Loja - SEMPRE EDITÁVEL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Valores Recebidos via Loja (VRLJ)
                  <Info className="inline w-3 h-3 sm:w-4 sm:h-4 ml-1 text-gray-400" title="Pagamentos recebidos diretamente (dinheiro/PIX/TEF)" />
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.vrlj || ''}
                    onChange={(e) => handleInputChange('vrlj', e.target.value)}
                    placeholder="5.000,00"
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Botões de ação - SEMPRE VISÍVEIS */}
              <div className="flex flex-col gap-3 pt-2 sm:pt-4">
                <button
                  onClick={handleCalculate}
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                >
                  Calcular Métricas
                </button>
                <button
                  onClick={() => {
                    setFormData({
                      vbv: 0, valoresPagosCliente: 0, vrl: 0, vrlj: 0,
                      additionalValues: {}, periodo: new Date().toISOString().slice(0, 7),
                      tenantId: user.tenantId
                    });
                    setCalculatedData(null);
                    setValidation(null);
                    setShowResults(false);
                    setStartDate(new Date().toISOString().slice(0, 10));
                    setEndDate(new Date().toISOString().slice(0, 10));
                  }}
                  className="w-full bg-gray-100 text-gray-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300 text-sm sm:text-base"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Validação - Otimizada para mobile */}
            {validation && (
              <div className="mt-4 sm:mt-6 space-y-3">
                {validation.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                      <span className="font-semibold text-red-700 text-sm sm:text-base">Erros encontrados:</span>
                    </div>
                    <ul className="space-y-1">
                      {validation.errors.map((error, index) => (
                        <li key={index} className="text-xs sm:text-sm text-red-600 break-words">• {error.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
                      <span className="font-semibold text-yellow-700 text-sm sm:text-base">Avisos:</span>
                    </div>
                    <ul className="space-y-1">
                      {validation.warnings.map((warning, index) => (
                        <li key={index} className="text-xs sm:text-sm text-yellow-600 break-words">• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dashboard de Resultados - Otimizado para mobile */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0" />
                <h2 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">KPIs Financeiros</h2>
              </div>
              {savedAnalyses.length > 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Exportar</span> CSV
                </button>
              )}
            </div>

            {showResults && calculatedData && validation?.isValid ? (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="overview" className="text-xs sm:text-sm">
                    Visão Geral
                  </TabsTrigger>
                  <TabsTrigger value="detailed" className="text-xs sm:text-sm">
                    Análise Detalhada
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                  {/* KPI Cards - Grid otimizado para mobile */}
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:p-4 rounded-xl border border-green-200">
                      <div className="text-xs sm:text-sm font-semibold text-green-700 mb-1">Receita Bruta Real</div>
                      <div className="text-lg sm:text-2xl font-bold text-green-800 break-all">
                        {formatCurrency(calculatedData.rbr)}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-3 sm:p-4 rounded-xl border border-blue-200">
                      <div className="text-xs sm:text-sm font-semibold text-blue-700 mb-1">Receita Operacional Líquida</div>
                      <div className="text-lg sm:text-2xl font-bold text-blue-800 break-all">
                        {formatCurrency(calculatedData.rol)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-3 sm:p-4 rounded-xl border border-purple-200">
                        <div className="text-xs sm:text-sm font-semibold text-purple-700 mb-1">Rentabilidade Líquida</div>
                        <div className="text-lg sm:text-2xl font-bold text-purple-800">
                          {formatPercentage(calculatedData.rentabilidadeLiquida)}
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-red-50 to-pink-50 p-3 sm:p-4 rounded-xl border border-red-200">
                        <div className="text-xs sm:text-sm font-semibold text-red-700 mb-1">Retenção iFood</div>
                        <div className="text-lg sm:text-2xl font-bold text-red-800">
                          {formatPercentage(calculatedData.retencaoIfoodPercentual)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 sm:p-6 rounded-xl border border-orange-200">
                    <div className="text-xs sm:text-sm font-semibold text-orange-700 mb-2">Valor Retido pelo iFood</div>
                    <div className="text-xl sm:text-3xl font-bold text-orange-800 break-all">
                      {formatCurrency(calculatedData.valorRetidoIfood)}
                    </div>
                  </div>

                  {/* Mensagens de Resultado - Otimizadas para mobile */}
                  <div className="bg-gray-50 p-4 sm:p-6 rounded-xl">
                    <h3 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Resumo da Análise:</h3>
                    <div className="space-y-2">
                      {generateResultMessages(calculatedData).map((message, index) => (
                        <p key={index} className="text-xs sm:text-sm text-gray-700 break-words">• {message}</p>
                      ))}
                    </div>
                  </div>

                  {/* Botão Salvar - CORRIGIDO E FUNCIONAL */}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-semibold transition-all duration-300 transform shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base ${
                      isSaving 
                        ? 'bg-gray-400 text-white cursor-not-allowed' 
                        : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 hover:scale-105'
                    }`}
                  >
                    <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                    {isSaving ? 'Salvando...' : 'Salvar Análise'}
                  </button>
                </TabsContent>

                <TabsContent value="detailed">
                  <DetailedAnalysis
                    formData={formData}
                    calculatedData={calculatedData}
                    onUpdateFormData={handleAdditionalValueChange}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="bg-gray-100 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm sm:text-lg px-4">
                  Preencha os dados financeiros e clique em "Calcular Métricas" para ver os resultados
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Histórico de Análises - Otimizado para mobile */}
        {savedAnalyses.length > 0 && (
          <div className="mt-6 sm:mt-8 bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-2xl font-bold text-gray-800">Histórico de Análises</h3>
              <div className="text-xs sm:text-sm text-gray-500">
                {savedAnalyses.length} análise{savedAnalyses.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-full inline-block align-middle">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">Período</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">RBR</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">ROL</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">Rentab.</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">Retenção</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">Data</th>
                      <th className="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedAnalyses.slice(-10).reverse().map((analysis, index) => (
                      <tr key={analysis.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-900">
                          {analysis.formData.periodo.includes(' até ') 
                            ? analysis.formData.periodo.split(' até ').map(date => {
                                const [year, month, day] = date.split('-');
                                return `${day}/${month}/${year}`;
                              }).join(' até ')
                            : analysis.formData.periodo
                          }
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-green-600 font-semibold">
                          {formatCurrency(analysis.calculatedData.rbr)}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-blue-600 font-semibold">
                          {formatCurrency(analysis.calculatedData.rol)}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-purple-600 font-semibold">
                          {formatPercentage(analysis.calculatedData.rentabilidadeLiquida)}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-red-600 font-semibold">
                          {formatPercentage(analysis.calculatedData.retencaoIfoodPercentual)}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-500">
                          {new Date(analysis.timestamp).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                          <button
                            type="button"
                            // dispara em CAPTURA antes do overlay do host
                            onClickCapture={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteAnalysis(analysis.id);
                            }}
                            // fallback se o click for bloqueado
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteAnalysis(analysis.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteAnalysis(analysis.id);
                              }
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                            title="Excluir análise"
                            data-testid={`delete-${analysis.id}`}
                            aria-label="Excluir análise"
                            role="button"
                            tabIndex={0}
                          >
                            {/* Impede que o SVG capture o evento */}
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 pointer-events-none" aria-hidden />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}