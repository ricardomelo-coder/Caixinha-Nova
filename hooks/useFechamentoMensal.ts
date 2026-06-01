'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FechamentoMensal, 
  Transaction, 
  Account, 
  Settlement, 
  Reimbursement, 
  UserProfile 
} from '../types';
import { calcularSnapshot } from '../lib/closingUtils';
import { createClient } from '../lib/supabase/client';
import { useAuth } from './useAuth';
import { generateUUID } from '../lib/utils';

export function useFechamentoMensal() {
  const { user: authUser } = useAuth();
  
  const currentUser: UserProfile | null = useMemo(() => authUser ? {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    role: authUser.role,
    accountIds: authUser.accountIds || [],
    createdAt: authUser.createdAt || ''
  } : null, [authUser]);

  const [fechamentos, setFechamentos] = useState<FechamentoMensal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<FechamentoMensal | null>(null);

  // Sync state loading from Supabase
  const carregarFechamentos = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('monthly_closings')
        .select('*')
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });

      if (data && !error) {
        setFechamentos(data.map((f: any) => ({
          id: f.id,
          mes: f.mes,
          ano: f.ano,
          dataCriacao: f.data_criacao,
          criadoPor: f.criado_por || 'Administrador',
          status: f.status as 'BLOQUEADO' | 'REABERTO',
          contas: (f.contas as any) || [],
          resultadoLiquidoGeral: Number(f.resultado_liquido_geral),
          totalMovimentacoes: f.total_movimentacoes,
          forcado: f.forcado,
          motivoReabertura: f.motivo_reabertura || undefined,
        })));
      }
    } catch (e) {
      console.error('Error loading closing documents', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchAsync = async () => {
      await Promise.resolve();
      if (active) {
        carregarFechamentos();
      }
    };
    fetchAsync();
    return () => {
      active = false;
    };
  }, [carregarFechamentos]);

  // Load database entities dynamically to run snapshots on recent figures
  const fetchSupabaseDependencies = async () => {
    const supabase = createClient();
    
    const { data: dbTxs } = await supabase.from('transactions').select('*');
    const { data: dbAccs } = await supabase.from('accounts').select('*');
    const { data: dbSets } = await supabase.from('settlements').select('*');
    const { data: dbReimbs } = await supabase.from('reimbursements').select('*');

    const transactions: Transaction[] = (dbTxs || []).map((t: any) => ({
      id: t.id,
      type: t.type as any,
      category: t.category as any,
      accountId: t.account_id,
      destinationAccountId: t.destination_account_id || undefined,
      amount: Number(t.amount),
      paymentMethod: t.payment_method as any,
      description: t.description,
      originName: t.origin_name,
      destinationName: t.destination_name,
      date: t.date,
      status: t.status as any,
      userId: t.user_id || '',
      createdAt: t.created_at
    }));

    const accounts: Account[] = (dbAccs || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      balance: Number(a.balance),
      initialBalance: Number(a.initial_balance),
      isActive: a.is_active
    }));

    const settlements: Settlement[] = (dbSets || []).map((s: any) => ({
      id: s.id,
      transactionId: s.transaction_id,
      amountTransferred: Number(s.amount_transferred),
      amountUsed: Number(s.amount_used),
      returnedAmount: Number(s.returned_amount),
      reimbursementRequired: Number(s.reimbursement_required),
      status: s.status as any,
      description: s.description
    }));

    const reimbursements: Reimbursement[] = (dbReimbs || []).map((r: any) => ({
      id: r.id,
      requesterName: r.requester_name,
      accountId: r.account_id,
      amount: Number(r.amount),
      description: r.description,
      status: r.status as any,
      date: r.date
    }));

    return { transactions, accounts, settlements, reimbursements };
  };

  const listarFechamentos = (): FechamentoMensal[] => {
    return fechamentos;
  };

  const buscarFechamento = (mes: number, ano: number): FechamentoMensal | null => {
    return fechamentos.find(f => f.mes === mes && f.ano === ano) || null;
  };

  /**
   * Generates a preview closing doc without saving it.
   */
  const gerarPreview = useCallback(async (mes: number, ano: number): Promise<FechamentoMensal | null> => {
    const { transactions, accounts, settlements, reimbursements } = await fetchSupabaseDependencies();

    // Chronologically previous closing (status BLOQUEADO)
    const previousClosingDoc = fechamentos
      .filter(f => f.status === 'BLOQUEADO' && (f.ano * 12 + f.mes) < (ano * 12 + mes))
      .sort((a, b) => (b.ano * 12 + b.mes) - (a.ano * 12 + a.mes))[0];

    // Filter transactions for that specific month and year
    const periodTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getUTCFullYear() === ano && (d.getUTCMonth() + 1) === mes;
    });

    const contasSnapshots = accounts.map(acc => {
      let rollbackBal = acc.initialBalance || 0;
      if (previousClosingDoc) {
        const prevAcc = previousClosingDoc.contas.find(c => c.accountId === acc.id);
        if (prevAcc) {
          rollbackBal = prevAcc.saldoFinal;
        }
      }
      return calcularSnapshot(acc, periodTxs, settlements, reimbursements, rollbackBal, mes, ano);
    });

    const totalEntradasGeral = contasSnapshots.reduce((acc, snap) => acc + snap.totalEntradas, 0);
    const totalSaidasGeral = contasSnapshots.reduce((acc, snap) => acc + snap.totalSaidas, 0);
    const resultadoLiquidoGeral = totalEntradasGeral - totalSaidasGeral;
    const totalMovimentacoes = periodTxs.filter(tx => tx.status !== 'CANCELLED').length;

    return {
      id: `preview-${Date.now()}`,
      mes,
      ano,
      dataCriacao: new Date().toISOString(),
      criadoPor: currentUser?.name || 'Administrador',
      status: 'BLOQUEADO',
      contas: contasSnapshots,
      resultadoLiquidoGeral,
      totalMovimentacoes,
      forcado: false,
    };
  }, [fechamentos, currentUser]);

  const executarFechamento = async (mes: number, ano: number, forcar: boolean = false): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setErro(null);

    try {
      const supabase = createClient();
      const { transactions, accounts, settlements, reimbursements } = await fetchSupabaseDependencies();

      // Verify if already closed with BLOQUEADO in local map state
      const existing = fechamentos.find(f => f.mes === mes && f.ano === ano && f.status === 'BLOQUEADO');
      if (existing) {
        setLoading(false);
        return { success: false, error: 'Este ciclo mensal já está fechado.' };
      }

      // Rollover of pending settlements and pending reimbursements to the next month
      const nextMonth = mes === 12 ? 1 : mes + 1;
      const nextYear = mes === 12 ? ano + 1 : ano;
      const nextMonthStr = String(nextMonth).padStart(2, '0');
      const rolledDateStr = `${nextYear}-${nextMonthStr}-01`;

      // Filter transactions that should migrate chronologically
      const txsToRoll = transactions.filter(t => {
        const d = new Date(t.date);
        const isCurrentPeriod = d.getUTCFullYear() === ano && (d.getUTCMonth() + 1) === mes;
        if (isCurrentPeriod && t.category === 'ADIANTAMENTO' && t.status === 'AWAITING_SETTLEMENT') {
          return settlements.some(s => s.transactionId === t.id && s.status === 'PENDING');
        }
        return false;
      });

      const reimbsToRoll = reimbursements.filter(r => {
        const d = new Date(r.date);
        const isCurrentPeriod = d.getUTCFullYear() === ano && (d.getUTCMonth() + 1) === mes;
        return isCurrentPeriod && r.status === 'PENDING';
      });

      // Execute Rollover mutations on DB
      if (txsToRoll.length > 0) {
        const txIds = txsToRoll.map(t => t.id);
        const { error: rollTxErr } = await supabase
          .from('transactions')
          .update({ date: rolledDateStr })
          .in('id', txIds);
        
        if (rollTxErr) throw rollTxErr;
      }

      if (reimbsToRoll.length > 0) {
        const reimbIds = reimbsToRoll.map(r => r.id);
        const { error: rollReimbErr } = await supabase
          .from('reimbursements')
          .update({ date: rolledDateStr })
          .in('id', reimbIds);

        if (rollReimbErr) throw rollReimbErr;
      }

      // Refresh dependencies after rolling
      const freshDeps = await fetchSupabaseDependencies();
      const finalTxs = freshDeps.transactions;
      const finalReimbs = freshDeps.reimbursements;

      // Previous closed snapshot
      const previousClosingDoc = fechamentos
        .filter(f => f.status === 'BLOQUEADO' && (f.ano * 12 + f.mes) < (ano * 12 + mes))
        .sort((a, b) => (b.ano * 12 + b.mes) - (a.ano * 12 + a.mes))[0];

      const periodTxs = finalTxs.filter(t => {
        const d = new Date(t.date);
        return d.getUTCFullYear() === ano && (d.getUTCMonth() + 1) === mes;
      });

      const contasSnapshots = accounts.map(acc => {
        let prevBal = acc.initialBalance || 0;
        if (previousClosingDoc) {
          const prevAcc = previousClosingDoc.contas.find(c => c.accountId === acc.id);
          if (prevAcc) {
            prevBal = prevAcc.saldoFinal;
          }
        }
        return calcularSnapshot(acc, periodTxs, settlements, finalReimbs, prevBal, mes, ano);
      });

      const pendenciasCount = contasSnapshots.reduce((count, s) => count + s.pendencias.length, 0);

      if (pendenciasCount > 0 && !forcar) {
        setLoading(false);
        return { 
          success: false, 
          error: `Existem ${pendenciasCount} pendências em aberto nesse mês. Resolva-as ou marque "Forçar Fechamento" (Apenas administradores podem forçar).` 
        };
      }

      const totalEntradasGeral = contasSnapshots.reduce((acc, snap) => acc + snap.totalEntradas, 0);
      const totalSaidasGeral = contasSnapshots.reduce((acc, snap) => acc + snap.totalSaidas, 0);
      const resultadoLiquidoGeral = totalEntradasGeral - totalSaidasGeral;
      const totalMovimentacoes = periodTxs.filter(tx => tx.status !== 'CANCELLED').length;

      const closingDocId = generateUUID();

      // Insert closing document to Supabase
      const { error: insertErr } = await supabase.from('monthly_closings').insert({
        id: closingDocId,
        mes,
        ano,
        status: 'BLOQUEADO',
        contas: contasSnapshots as any,
        resultado_liquido_geral: resultadoLiquidoGeral,
        total_movimentacoes: totalMovimentacoes,
        forcado: forcar,
        criado_por: currentUser ? currentUser.id : null
      });

      if (insertErr) throw insertErr;

      await carregarFechamentos();
      
      const newlyCreated: FechamentoMensal = {
        id: closingDocId,
        mes,
        ano,
        dataCriacao: new Date().toISOString(),
        criadoPor: currentUser?.name || 'Administrador',
        status: 'BLOQUEADO',
        contas: contasSnapshots,
        resultadoLiquidoGeral,
        totalMovimentacoes,
        forcado: forcar
      };
      setResumo(newlyCreated);

      // Trigger window event so standard financial hooks can refresh as well
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  const reabrirFechamento = async (mes: number, ano: number, motivo: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setErro(null);

    if (!currentUser || currentUser.role !== 'ADMIN') {
      setLoading(false);
      return { success: false, error: 'Permissão negada. Apenas ADMINISTRADORES podem reabrir períodos fechados.' };
    }

    if (!motivo || !motivo.trim()) {
      setLoading(false);
      return { success: false, error: 'É obrigatório informar o motivo para a reabertura do mês.' };
    }

    try {
      const supabase = createClient();
      
      // Update DB
      const { error } = await supabase
        .from('monthly_closings')
        .update({
          status: 'REABERTO',
          motivo_reabertura: motivo
        })
        .eq('mes', mes)
        .eq('ano', ano);

      if (error) throw error;

      await carregarFechamentos();
      setResumo(null);

      // Dispatch window storage event to let independent components sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  return {
    executarFechamento,
    reabrirFechamento,
    buscarFechamento,
    listarFechamentos,
    gerarPreview,
    loading,
    erro,
    resumo,
    setResumo,
  };
}
