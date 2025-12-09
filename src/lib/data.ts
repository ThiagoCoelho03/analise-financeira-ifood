// src/lib/data.ts
// Camada de persistência: Supabase com fallback para localStorage

import { supabase } from './supabase';
import type { User, AnalysisData } from './types';

// ============================================================================
// AUTENTICAÇÃO E USUÁRIOS
// ============================================================================

/**
 * Verifica se o Supabase está configurado e disponível
 */
function isSupabaseAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return hasUrl && hasKey;
}

/**
 * Obtém o usuário atual (Supabase ou localStorage)
 */
export async function getCurrentUser(): Promise<User | null> {
  if (typeof window === 'undefined') return null;

  // Tentar Supabase primeiro
  if (isSupabaseAvailable()) {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // Buscar dados completos do usuário na tabela Usuario
        const { data: userData, error } = await supabase
          .from('Usuario')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (!error && userData) {
          // Converter snake_case para camelCase
          return {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            tenantId: userData.tenant_id,
            role: userData.role,
            createdAt: userData.created_at
          } as User;
        }
      }
    } catch (error) {
      console.warn('Erro ao buscar usuário no Supabase, usando localStorage:', error);
    }
  }

  // Fallback: localStorage
  try {
    const raw = localStorage.getItem('ifood-user');
    if (!raw) return null;

    const user = JSON.parse(raw) as Partial<User>;
    if (user && typeof user === 'object' && user.id && user.tenantId) {
      return user as User;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Salva usuário na tabela Usuario (Supabase ou localStorage)
 */
export async function saveUser(user: User): Promise<void> {
  if (typeof window === 'undefined') return;

  // Tentar Supabase primeiro
  if (isSupabaseAvailable()) {
    try {
      const { error } = await supabase
        .from('Usuario')
        .upsert({
          id: user.id,
          email: user.email,
          name: user.name,
          tenant_id: user.tenantId,
          role: user.role,
          created_at: user.createdAt
        }, {
          onConflict: 'id'
        });

      if (!error) {
        console.log('✅ Usuário salvo na tabela Usuario do Supabase:', user.id);
        // Salvar também no localStorage como cache
        localStorage.setItem('ifood-user', JSON.stringify(user));
        return;
      }
      
      console.warn('Erro ao salvar usuário no Supabase, usando localStorage:', error);
    } catch (error) {
      console.warn('Erro ao salvar usuário no Supabase, usando localStorage:', error);
    }
  }

  // Fallback: localStorage
  localStorage.setItem('ifood-user', JSON.stringify(user));
  console.log('✅ Usuário salvo no localStorage:', user.id);
}

/**
 * Logout (Supabase ou localStorage)
 */
export async function logout(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Tentar Supabase primeiro
  if (isSupabaseAvailable()) {
    try {
      await supabase.auth.signOut();
      console.log('✅ Logout realizado no Supabase');
    } catch (error) {
      console.warn('Erro ao fazer logout no Supabase:', error);
    }
  }

  // Sempre limpar localStorage
  localStorage.removeItem('ifood-user');
  console.log('✅ Logout realizado - localStorage limpo');
}

// ============================================================================
// ANÁLISES FINANCEIRAS - TABELA historicodeanalise
// ============================================================================

/**
 * Salva uma análise na tabela historicodeanalise (Supabase ou localStorage)
 */
export async function saveAnalysis(analysis: AnalysisData): Promise<void> {
  if (typeof window === 'undefined') return;

  // Tentar Supabase primeiro
  if (isSupabaseAvailable()) {
    try {
      const { error } = await supabase
        .from('historicodeanalise')
        .insert({
          id: analysis.id,
          user_id: analysis.userId,
          tenant_id: analysis.tenantId,
          form_data: analysis.formData,
          calculated_data: analysis.calculatedData,
          timestamp: analysis.timestamp
        });

      if (!error) {
        console.log('✅ Análise salva na tabela historicodeanalise do Supabase:', analysis.id);
        return;
      }
      
      console.warn('Erro ao salvar no Supabase, usando localStorage:', error);
    } catch (error) {
      console.warn('Erro ao salvar análise no Supabase, usando localStorage:', error);
    }
  }

  // Fallback: localStorage
  const key = `ifood-analyses-${analysis.tenantId}`;
  const arr: AnalysisData[] = JSON.parse(localStorage.getItem(key) || '[]');
  arr.push(analysis);
  localStorage.setItem(key, JSON.stringify(arr));
  console.log('✅ Análise salva no localStorage:', analysis.id);
}

/**
 * Carrega análises de um tenant da tabela historicodeanalise (Supabase ou localStorage)
 */
export async function loadAnalyses(tenantId: string): Promise<AnalysisData[]> {
  if (typeof window === 'undefined') return [];

  // Tentar Supabase primeiro
  if (isSupabaseAvailable()) {
    try {
      const { data, error } = await supabase
        .from('historicodeanalise')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('timestamp', { ascending: false });

      if (!error && data) {
        // Converter snake_case para camelCase
        const analyses: AnalysisData[] = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          tenantId: row.tenant_id,
          formData: row.form_data,
          calculatedData: row.calculated_data,
          timestamp: row.timestamp
        }));

        console.log(`✅ ${analyses.length} análises carregadas da tabela historicodeanalise do Supabase`);
        return analyses;
      }

      console.warn('Erro ao carregar do Supabase, usando localStorage:', error);
    } catch (error) {
      console.warn('Erro ao carregar análises do Supabase, usando localStorage:', error);
    }
  }

  // Fallback: localStorage
  try {
    const key = `ifood-analyses-${tenantId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const analyses = JSON.parse(raw);
    console.log(`✅ ${analyses.length} análises carregadas do localStorage`);
    return Array.isArray(analyses) ? analyses : [];
  } catch (error) {
    console.error('Erro ao carregar do localStorage:', error);
    return [];
  }
}

/**
 * Deleta uma análise da tabela historicodeanalise (Supabase ou localStorage)
 */
export async function deleteAnalysis(analysisId: string, tenantId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  // Tentar Supabase primeiro
  if (isSupabaseAvailable()) {
    try {
      const { error } = await supabase
        .from('historicodeanalise')
        .delete()
        .eq('id', analysisId)
        .eq('tenant_id', tenantId);

      if (!error) {
        console.log('✅ Análise deletada da tabela historicodeanalise do Supabase:', analysisId);
        return;
      }

      console.warn('Erro ao deletar do Supabase, usando localStorage:', error);
    } catch (error) {
      console.warn('Erro ao deletar análise do Supabase, usando localStorage:', error);
    }
  }

  // Fallback: localStorage
  const key = `ifood-analyses-${tenantId}`;
  const arr: AnalysisData[] = JSON.parse(localStorage.getItem(key) || '[]');
  const filtered = arr.filter(a => a.id !== analysisId);
  localStorage.setItem(key, JSON.stringify(filtered));
  console.log('✅ Análise deletada do localStorage:', analysisId);
}

/**
 * Busca análises por período da tabela historicodeanalise (Supabase ou localStorage)
 */
export async function getAnalysisByPeriod(
  tenantId: string,
  contains: string
): Promise<AnalysisData[]> {
  const allAnalyses = await loadAnalyses(tenantId);
  return allAnalyses.filter(a => 
    (a.formData?.periodo || '').includes(contains)
  );
}

/**
 * Busca análises de um usuário específico da tabela historicodeanalise
 */
export async function getAnalysesByUser(userId: string, tenantId: string): Promise<AnalysisData[]> {
  if (typeof window === 'undefined') return [];

  // Tentar Supabase primeiro
  if (isSupabaseAvailable()) {
    try {
      const { data, error } = await supabase
        .from('historicodeanalise')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .order('timestamp', { ascending: false });

      if (!error && data) {
        const analyses: AnalysisData[] = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          tenantId: row.tenant_id,
          formData: row.form_data,
          calculatedData: row.calculated_data,
          timestamp: row.timestamp
        }));

        console.log(`✅ ${analyses.length} análises do usuário ${userId} carregadas do Supabase`);
        return analyses;
      }
    } catch (error) {
      console.warn('Erro ao buscar análises do usuário no Supabase:', error);
    }
  }

  // Fallback: localStorage
  const allAnalyses = await loadAnalyses(tenantId);
  return allAnalyses.filter(a => a.userId === userId);
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Sincroniza dados do localStorage para o Supabase (migração)
 */
export async function syncLocalStorageToSupabase(tenantId: string): Promise<void> {
  if (!isSupabaseAvailable()) {
    console.warn('Supabase não disponível para sincronização');
    return;
  }

  try {
    // Carregar do localStorage
    const key = `ifood-analyses-${tenantId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    const localAnalyses: AnalysisData[] = JSON.parse(raw);
    if (!Array.isArray(localAnalyses) || localAnalyses.length === 0) return;

    console.log(`🔄 Sincronizando ${localAnalyses.length} análises para a tabela historicodeanalise do Supabase...`);

    // Inserir no Supabase
    const { error } = await supabase
      .from('historicodeanalise')
      .upsert(
        localAnalyses.map(a => ({
          id: a.id,
          user_id: a.userId,
          tenant_id: a.tenantId,
          form_data: a.formData,
          calculated_data: a.calculatedData,
          timestamp: a.timestamp
        })),
        { onConflict: 'id' }
      );

    if (error) {
      console.error('Erro ao sincronizar:', error);
    } else {
      console.log('✅ Sincronização concluída com sucesso!');
    }
  } catch (error) {
    console.error('Erro na sincronização:', error);
  }
}
