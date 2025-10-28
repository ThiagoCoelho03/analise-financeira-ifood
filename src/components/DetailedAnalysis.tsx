"use client";

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  PieChart, 
  BarChart3, 
  Info, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { 
  PieChart as RechartsPieChart, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Pie
} from 'recharts';
import { FormData, CalculatedData } from '@/lib/types';
import { formatCurrency, formatPercentageDirect, normalizeNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DetailedAnalysisProps {
  formData: FormData;
  calculatedData: CalculatedData;
  onUpdateFormData: (field: string, value: number) => void;
}

export default function DetailedAnalysis({ 
  formData, 
  calculatedData, 
  onUpdateFormData 
}: DetailedAnalysisProps) {
  const [inputValues, setInputValues] = useState({
    promocoes: '',
    taxasComissoes: '',
    servicosLogisticos: '',
    outrosValores: ''
  });

  // Sincronizar valores dos inputs com formData
  useEffect(() => {
    setInputValues({
      promocoes: formData.additionalValues.promocoes?.toString() || '',
      taxasComissoes: formData.additionalValues.taxasComissoes?.toString() || '',
      servicosLogisticos: formData.additionalValues.servicosLogisticos?.toString() || '',
      outrosValores: formData.additionalValues.outrosValores?.toString() || ''
    });
  }, [formData.additionalValues]);

  const handleInputChange = (field: string, value: string) => {
    setInputValues(prev => ({ ...prev, [field]: value }));
    const numericValue = normalizeNumber(value);
    onUpdateFormData(`additionalValues.${field}`, numericValue);
  };

  // Cálculos da análise detalhada
  const promocoes = normalizeNumber(formData.additionalValues.promocoes || 0);
  const taxasComissoes = normalizeNumber(formData.additionalValues.taxasComissoes || 0);
  const servicosLogisticos = normalizeNumber(formData.additionalValues.servicosLogisticos || 0);
  const outrosValores = normalizeNumber(formData.additionalValues.outrosValores || 0);
  
  const debitosDetalhados = promocoes + taxasComissoes + servicosLogisticos + outrosValores;
  const rbrPosDebitos = calculatedData.rbr - debitosDetalhados;
  const repasseLiquidoReal = rbrPosDebitos + normalizeNumber(formData.vrlj);
  
  // Percentuais sobre RBR
  const percentuais = {
    promocoes: calculatedData.rbr > 0 ? (promocoes / calculatedData.rbr) * 100 : 0,
    taxasComissoes: calculatedData.rbr > 0 ? (taxasComissoes / calculatedData.rbr) * 100 : 0,
    servicosLogisticos: calculatedData.rbr > 0 ? (servicosLogisticos / calculatedData.rbr) * 100 : 0,
    outrosValores: calculatedData.rbr > 0 ? (outrosValores / calculatedData.rbr) * 100 : 0,
    totalDebitos: calculatedData.rbr > 0 ? (debitosDetalhados / calculatedData.rbr) * 100 : 0
  };

  // Dados para gráfico de pizza
  const pieData = [
    { name: 'Promoções', value: percentuais.promocoes, color: '#ef4444' },
    { name: 'Taxas/Comissões', value: percentuais.taxasComissoes, color: '#f97316' },
    { name: 'Serviços Logísticos', value: percentuais.servicosLogisticos, color: '#eab308' },
    { name: 'Outros Valores', value: percentuais.outrosValores, color: '#8b5cf6' }
  ].filter(item => item.value > 0);

  // Dados para gráfico de barras
  const barData = [
    { name: 'RBR', value: calculatedData.rbr, color: '#10b981' },
    { name: 'Débitos', value: debitosDetalhados, color: '#ef4444' },
    { name: 'RBR Pós-Débitos', value: rbrPosDebitos, color: '#3b82f6' },
    { name: 'VRLJ', value: normalizeNumber(formData.vrlj), color: '#8b5cf6' },
    { name: 'Repasse Real', value: repasseLiquidoReal, color: '#06b6d4' }
  ];

  // Validações
  const hasRbrError = calculatedData.rbr <= 0;
  const hasDebitosError = debitosDetalhados > calculatedData.rbr;

  return (
    <div className="space-y-6">
      {/* Campos de Entrada */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-xl border border-blue-200">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-800">Despesas Detalhadas</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Promoções */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Gastos com Promoções
              <Info className="inline w-3 h-3 ml-1 text-gray-400" title="Valores gastos com promoções e descontos" />
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
              <input
                type="text"
                value={inputValues.promocoes}
                onChange={(e) => handleInputChange('promocoes', e.target.value)}
                placeholder="Ex.: 2.500,00"
                className={`w-full pl-9 pr-3 py-2 sm:py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base ${
                  hasDebitosError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                aria-label="Gastos com promoções"
                aria-describedby="promocoes-help"
              />
            </div>
            <p id="promocoes-help" className="text-xs text-gray-500 mt-1">
              Valores investidos em promoções e descontos
            </p>
          </div>

          {/* Taxas/Comissões */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Taxas/Comissões iFood
              <Info className="inline w-3 h-3 ml-1 text-gray-400" title="Taxas e comissões cobradas pelo iFood" />
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
              <input
                type="text"
                value={inputValues.taxasComissoes}
                onChange={(e) => handleInputChange('taxasComissoes', e.target.value)}
                placeholder="Ex.: 1.200,00"
                className={`w-full pl-9 pr-3 py-2 sm:py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base ${
                  hasDebitosError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                aria-label="Taxas e comissões iFood"
                aria-describedby="taxas-help"
              />
            </div>
            <p id="taxas-help" className="text-xs text-gray-500 mt-1">
              Taxas e comissões cobradas pela plataforma
            </p>
          </div>

          {/* Serviços Logísticos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Serviços Logísticos
              <Info className="inline w-3 h-3 ml-1 text-gray-400" title="Custos com logística e entrega" />
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
              <input
                type="text"
                value={inputValues.servicosLogisticos}
                onChange={(e) => handleInputChange('servicosLogisticos', e.target.value)}
                placeholder="Ex.: 800,00"
                className={`w-full pl-9 pr-3 py-2 sm:py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base ${
                  hasDebitosError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                aria-label="Serviços logísticos"
                aria-describedby="logistica-help"
              />
            </div>
            <p id="logistica-help" className="text-xs text-gray-500 mt-1">
              Custos com logística, entrega e transporte
            </p>
          </div>

          {/* Outros Valores */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Outros Débitos
              <Info className="inline w-3 h-3 ml-1 text-gray-400" title="Outros valores debitados" />
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
              <input
                type="text"
                value={inputValues.outrosValores}
                onChange={(e) => handleInputChange('outrosValores', e.target.value)}
                placeholder="Ex.: 300,00"
                className={`w-full pl-9 pr-3 py-2 sm:py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base ${
                  hasDebitosError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                aria-label="Outros débitos"
                aria-describedby="outros-help"
              />
            </div>
            <p id="outros-help" className="text-xs text-gray-500 mt-1">
              Outros valores debitados não categorizados
            </p>
          </div>
        </div>

        {/* Validações */}
        {hasRbrError && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <span className="text-sm text-yellow-700">
                Informe VBV e Valores pagos pelo cliente para calcular percentuais
              </span>
            </div>
          </div>
        )}

        {hasDebitosError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">
                Débitos detalhados não podem exceder o RBR ({formatCurrency(calculatedData.rbr)})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      {!hasRbrError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* RBR */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
            <div className="text-sm font-semibold text-green-700 mb-1">Receita Bruta Real</div>
            <div className="text-xl font-bold text-green-800">{formatCurrency(calculatedData.rbr)}</div>
          </div>

          {/* Débitos Detalhados */}
          <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-xl border border-red-200">
            <div className="text-sm font-semibold text-red-700 mb-1 flex items-center gap-2">
              Débitos Detalhados
              <Badge variant="outline" className="text-xs">
                {formatPercentageDirect(percentuais.totalDebitos)} do RBR
              </Badge>
            </div>
            <div className="text-xl font-bold text-red-800">{formatCurrency(debitosDetalhados)}</div>
          </div>

          {/* RBR Pós-Débitos */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200">
            <div className="text-sm font-semibold text-blue-700 mb-1 flex items-center gap-2">
              RBR Pós-Débitos
              {rbrPosDebitos >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className={`text-xl font-bold ${rbrPosDebitos >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
              {formatCurrency(rbrPosDebitos)}
            </div>
          </div>

          {/* VRLJ */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-200">
            <div className="text-sm font-semibold text-purple-700 mb-1">Valores via Loja (VRLJ)</div>
            <div className="text-xl font-bold text-purple-800">{formatCurrency(normalizeNumber(formData.vrlj))}</div>
          </div>

          {/* Repasse Líquido Real */}
          <div className="bg-gradient-to-r from-cyan-50 to-teal-50 p-4 rounded-xl border border-cyan-200 sm:col-span-2">
            <div className="text-sm font-semibold text-cyan-700 mb-1 flex items-center gap-2">
              Repasse Líquido Real
              <Badge variant="secondary" className="text-xs">
                Número final de repasse
              </Badge>
            </div>
            <div className="text-2xl font-bold text-cyan-800">{formatCurrency(repasseLiquidoReal)}</div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      {!hasRbrError && debitosDetalhados > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Pizza */}
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Composição dos Débitos</h3>
            </div>
            
            {pieData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(2)}%`, 'Percentual']}
                      labelStyle={{ color: '#374151' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <PieChart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum débito informado</p>
                </div>
              </div>
            )}

            {/* Legenda */}
            {pieData.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {pieData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-gray-600">
                      {item.name}: {formatPercentageDirect(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gráfico de Barras */}
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Comparativo de Valores</h3>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Resumo dos Percentuais */}
      {!hasRbrError && debitosDetalhados > 0 && (
        <div className="bg-gray-50 p-4 sm:p-6 rounded-xl">
          <h3 className="font-semibold text-gray-800 mb-3">Percentuais sobre RBR:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-600">Promoções</div>
              <div className="text-lg font-bold text-red-600">
                {formatPercentageDirect(percentuais.promocoes)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Taxas/Comissões</div>
              <div className="text-lg font-bold text-orange-600">
                {formatPercentageDirect(percentuais.taxasComissoes)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Serv. Logísticos</div>
              <div className="text-lg font-bold text-yellow-600">
                {formatPercentageDirect(percentuais.servicosLogisticos)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Outros</div>
              <div className="text-lg font-bold text-purple-600">
                {formatPercentageDirect(percentuais.outrosValores)}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <div className="text-sm text-gray-600">Total de Débitos</div>
            <div className="text-xl font-bold text-gray-800">
              {formatPercentageDirect(percentuais.totalDebitos)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}