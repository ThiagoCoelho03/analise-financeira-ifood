"use client";

import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { normalizeNumber, formatCurrency } from '@/lib/utils';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function CurrencyInput({ 
  value, 
  onChange, 
  placeholder = "0,00", 
  className = "",
  disabled = false 
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Atualiza o valor de exibição quando o valor prop muda
  useEffect(() => {
    if (!isFocused) {
      if (value === 0) {
        setDisplayValue("");
      } else {
        // Remove o símbolo R$ e espaços para mostrar apenas o número formatado
        const formatted = formatCurrency(value).replace('R$', '').trim();
        setDisplayValue(formatted);
      }
    }
  }, [value, isFocused]);

  const handleInputChange = (inputValue: string) => {
    // Permite digitar livremente no formato BR
    setDisplayValue(inputValue);
    
    // Normaliza o valor para number (aceita 50.889,20 ou 50889,20 ou 50.889,2)
    const numericValue = normalizeNumber(inputValue);
    onChange(numericValue);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    // Permite colar valores no formato BRL (ex: 50.889,20)
    const pastedText = e.clipboardData.getData('text');
    
    // Normaliza o valor colado
    const numericValue = normalizeNumber(pastedText);
    
    // Formata para exibição no padrão BR
    const formatted = numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    setDisplayValue(formatted);
    onChange(numericValue);
    
    // Previne o comportamento padrão de colar
    e.preventDefault();
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Quando foca, mostra o valor numérico formatado para edição
    if (value > 0) {
      const numericString = value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      setDisplayValue(numericString);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Quando perde o foco, formata para exibição
    if (value === 0) {
      setDisplayValue("");
    } else {
      const formatted = formatCurrency(value).replace('R$', '').trim();
      setDisplayValue(formatted);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permite: números, vírgula, ponto, backspace, delete, tab, escape, enter, setas
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', ',', '.'
    ];
    
    const isNumber = /^[0-9]$/.test(e.key);
    const isAllowedKey = allowedKeys.includes(e.key);
    const isCtrlCmd = e.ctrlKey || e.metaKey; // Permite Ctrl+C, Ctrl+V, etc.
    
    if (!isNumber && !isAllowedKey && !isCtrlCmd) {
      e.preventDefault();
    }
  };

  return (
    <div className="relative">
      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm sm:text-base ${className}`}
      />
    </div>
  );
}
