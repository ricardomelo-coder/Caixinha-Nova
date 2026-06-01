'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Transaction, 
  Account, 
  UserProfile, 
  TransactionType, 
  OutputCategory, 
  TransactionStatus,
  PaymentMethod,
  Settlement,
  Reimbursement,
  MonthlyClosing
} from '../types';
import { createClient } from '../lib/supabase/client';
import { generateUUID } from '../lib/utils';
import { useAuth } from './useAuth';

export function useFinancialState() {
  const { user: authUser } = useAuth();

  // Placeholder for initial render before auth is ready or when redirecting
  const currentUser: UserProfile = useMemo(() => authUser || {
    id: '',
    name: '',
    email: '',
    role: 'USER',
    accountIds: [],
    createdAt: ''
  }, [authUser]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [loading, setLoading] = useState(true);

  // Mappers
  const mapTransactionFromDb = useCallback((t: any): Transaction => ({
    id: t.id,
    type: t.type as TransactionType,
    category: t.category as OutputCategory,
    accountId: t.account_id,
    destinationAccountId: t.destination_account_id || undefined,
    amount: Number(t.amount),
    paymentMethod: t.payment_method as PaymentMethod,
    description: t.description,
    originName: t.origin_name,
    destinationName: t.destination_name,
    date: t.date,
    status: t.status as TransactionStatus,
    userId: t.user_id || '',
    createdAt: t.created_at
  }), []);

  const mapSettlementFromDb = useCallback((s: any): Settlement => ({
    id: s.id,
    transactionId: s.transaction_id,
    amountTransferred: Number(s.amount_transferred),
    amountUsed: Number(s.amount_used),
    returnedAmount: Number(s.returned_amount),
    reimbursementRequired: Number(s.reimbursement_required),
    status: s.status as 'PENDING' | 'RESOLVED',
    description: s.description
  }), []);

  const mapReimbursementFromDb = useCallback((r: any): Reimbursement => ({
    id: r.id,
    requesterName: r.requester_name,
    accountId: r.account_id,
    amount: Number(r.amount),
    description: r.description,
    status: r.status as 'PENDING' | 'PAID' | 'REJECTED',
    date: r.date
  }), []);

  const mapClosingFromDb = useCallback((c: any): MonthlyClosing => ({
    id: c.id,
    year: c.ano,
    month: c.mes,
    closedAt: c.data_criacao,
    closedBy: c.criado_por || 'Administrador'
  }), []);

  // Fetch all financial data from tables
  const loadFinancialData = useCallback(async () => {
    try {
      const supabase = createClient();

      // Load accounts
      const { data: dbAccs } = await supabase
        .from('accounts')
        .select('*')
        .order('name');
      
      if (dbAccs) {
        setAccounts(dbAccs.map((a: any) => ({
          id: a.id,
          name: a.name,
          balance: Number(a.balance),
          initialBalance: Number(a.initial_balance),
          isActive: a.is_active
        })));
      }

      // Load transactions
      const { data: dbTxs } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (dbTxs) {
        setTransactions(dbTxs.map(mapTransactionFromDb));
      }

      // Load settlements
      const { data: dbSets } = await supabase
        .from('settlements')
        .select('*');
      
      if (dbSets) {
        setSettlements(dbSets.map(mapSettlementFromDb));
      }

      // Load reimbursements
      const { data: dbReimbs } = await supabase
        .from('reimbursements')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (dbReimbs) {
        setReimbursements(dbReimbs.map(mapReimbursementFromDb));
      }

      // Load closings (fechamentos)
      const { data: dbClosings } = await supabase
        .from('monthly_closings')
        .select('*');
      
      if (dbClosings) {
        setClosings(dbClosings.map(mapClosingFromDb));
      }

    } catch (e) {
      console.error('Error loading financial state from Supabase', e);
    } finally {
      setLoading(false);
    }
  }, [mapTransactionFromDb, mapSettlementFromDb, mapReimbursementFromDb, mapClosingFromDb]);

  useEffect(() => {
    let active = true;
    const fetchAsync = async () => {
      await Promise.resolve();
      if (active) {
        loadFinancialData();
      }
    };
    fetchAsync();
    return () => {
      active = false;
    };
  }, [loadFinancialData]);

  // Check if a period (month/year) is closed
  const isPeriodClosed = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // 1-12
    return closings.some((c) => c.year === year && c.month === month);
  };

  // Helper to calculate balances
  const getAccountBalances = (allTxs: Transaction[]): Record<string, number> => {
    const balances: Record<string, number> = {};
    accounts.forEach(acc => {
      balances[acc.id] = acc.initialBalance !== undefined ? acc.initialBalance : 0;
    });

    allTxs.forEach((tx) => {
      if (tx.status === 'CANCELLED') return;

      if (tx.type === 'ENTRADA') {
        balances[tx.accountId] = (balances[tx.accountId] || 0) + tx.amount;
      } else if (tx.type === 'SAIDA') {
        // Reembolso only alters the balance if it is settled/paid
        if (tx.category === 'REEMBOLSO' && tx.status === 'AWAITING_REIMBURSEMENT') {
          return;
        }
        balances[tx.accountId] = (balances[tx.accountId] || 0) - tx.amount;
      } else if (tx.type === 'TRANSFERENCIA') {
        balances[tx.accountId] = (balances[tx.accountId] || 0) - tx.amount;
        if (tx.destinationAccountId) {
          balances[tx.destinationAccountId] = (balances[tx.destinationAccountId] || 0) + tx.amount;
        }
      }
    });

    return balances;
  };

  const calculatedBalances = getAccountBalances(transactions);
  const hydratedAccounts = accounts.map(acc => ({
    ...acc,
    balance: calculatedBalances[acc.id] || 0
  }));

  const globalTotalBalance = hydratedAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Business actions backed by Supabase mutations
  const addTransaction = async (newTx: Omit<Transaction, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> => {
    if (isPeriodClosed(newTx.date)) {
      return { success: false, error: 'Este período mensal já está fechado e bloqueado para lançamentos.' };
    }

    if (newTx.amount <= 0) {
      return { success: false, error: 'O valor da transação deve ser positivo e superior a zero.' };
    }

    const supabase = createClient();
    const genId = () => generateUUID();

    // If it is a REEMBOLSO, insert directly into reimbursements table
    if (newTx.type === 'SAIDA' && newTx.category === 'REEMBOLSO') {
      try {
        const reimbId = genId();
        const { error } = await supabase.from('reimbursements').insert({
          id: reimbId,
          requester_name: newTx.destinationName || 'Solicitante',
          account_id: newTx.accountId,
          amount: newTx.amount,
          description: newTx.description,
          status: 'PENDING',
          date: newTx.date || new Date().toISOString().split('T')[0]
        });

        if (error) throw error;
        await loadFinancialData();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Normal transaction
    try {
      const txId = genId();
      const { error: txErr } = await supabase.from('transactions').insert({
        id: txId,
        type: newTx.type,
        category: newTx.category,
        account_id: newTx.accountId,
        destination_account_id: newTx.destinationAccountId || null,
        amount: newTx.amount,
        payment_method: newTx.paymentMethod,
        description: newTx.description,
        origin_name: newTx.originName,
        destination_name: newTx.destinationName,
        date: newTx.date,
        status: newTx.status,
        user_id: currentUser.id || null
      });

      if (txErr) throw txErr;

      // If category === 'ADIANTAMENTO', create an Awaiting Settlement record
      if (newTx.type === 'SAIDA' && newTx.category === 'ADIANTAMENTO') {
        const { error: setErr } = await supabase.from('settlements').insert({
          id: genId(),
          transaction_id: txId,
          amount_transferred: newTx.amount,
          amount_used: 0,
          returned_amount: 0,
          reimbursement_required: 0,
          status: 'PENDING',
          description: `Prestação de conta do adiantamento: ${newTx.description}`
        });

        if (setErr) throw setErr;
      }

      await loadFinancialData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const cancelTransaction = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissão negada. Apenas ADMINISTRADORES podem cancelar lançamentos.' };
    }

    const tx = transactions.find(t => t.id === id);
    if (!tx) {
      return { success: false, error: 'Lançamento não encontrado.' };
    }

    if (isPeriodClosed(tx.date)) {
      return { success: false, error: 'Não é possível cancelar um lançamento de um ciclo mensal fechado.' };
    }

    const supabase = createClient();
    try {
      // Set tx status to CANCELLED
      const { error: txErr } = await supabase
        .from('transactions')
        .update({ status: 'CANCELLED' })
        .eq('id', id);

      if (txErr) throw txErr;

      // Update associated settlements
      const assoc = settlements.find(s => s.transactionId === id);
      if (assoc) {
        const { error: setErr } = await supabase
          .from('settlements')
          .update({ 
            status: 'RESOLVED',
            description: assoc.description + ' (AD_CANCELADO)'
          })
          .eq('transaction_id', id);

        if (setErr) throw setErr;
      }

      await loadFinancialData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const editTransaction = async (id: string, updatedFields: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissão negada. Apenas ADMINISTRADORES podem alterar lançamentos.' };
    }

    const tx = transactions.find(t => t.id === id);
    if (!tx) {
      return { success: false, error: 'Lançamento não encontrado.' };
    }

    if (isPeriodClosed(tx.date)) {
      return { success: false, error: 'Não é possível alterar um lançamento de um ciclo mensal fechado.' };
    }

    if (updatedFields.date && isPeriodClosed(updatedFields.date)) {
      return { success: false, error: 'Não é possível alterar a data para um ciclo mensal fechado.' };
    }

    if (updatedFields.amount !== undefined && updatedFields.amount <= 0) {
      return { success: false, error: 'O valor do lançamento deve ser superior a zero.' };
    }

    const supabase = createClient();
    try {
      // Map back to db fields smoothly
      const mappedUpdate: any = {};
      if (updatedFields.type) mappedUpdate.type = updatedFields.type;
      if (updatedFields.category) mappedUpdate.category = updatedFields.category;
      if (updatedFields.accountId) mappedUpdate.account_id = updatedFields.accountId;
      if (updatedFields.destinationAccountId !== undefined) mappedUpdate.destination_account_id = updatedFields.destinationAccountId;
      if (updatedFields.amount !== undefined) mappedUpdate.amount = updatedFields.amount;
      if (updatedFields.paymentMethod) mappedUpdate.payment_method = updatedFields.paymentMethod;
      if (updatedFields.description) mappedUpdate.description = updatedFields.description;
      if (updatedFields.originName) mappedUpdate.origin_name = updatedFields.originName;
      if (updatedFields.destinationName) mappedUpdate.destination_name = updatedFields.destinationName;
      if (updatedFields.date) mappedUpdate.date = updatedFields.date;
      if (updatedFields.status) mappedUpdate.status = updatedFields.status;

      const { error } = await supabase
        .from('transactions')
        .update(mappedUpdate)
        .eq('id', id);

      if (error) throw error;
      await loadFinancialData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteTransaction = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Permissão negada. Apenas ADMINISTRADORES podem excluir lançamentos.' };
    }

    const tx = transactions.find(t => t.id === id);
    if (!tx) {
      return { success: false, error: 'Lançamento não encontrado.' };
    }

    if (isPeriodClosed(tx.date)) {
      return { success: false, error: 'Não é possível excluir um lançamento de um ciclo mensal fechado.' };
    }

    const supabase = createClient();
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      
      await loadFinancialData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const resolveSettlement = async (settlementId: string, amountUsed: number, description: string): Promise<{ success: boolean; error?: string }> => {
    const targetSet = settlements.find(s => s.id === settlementId);
    if (!targetSet) {
      return { success: false, error: 'Pendência de prestação não encontrada.' };
    }

    const originalTx = transactions.find(t => t.id === targetSet.transactionId);
    if (!originalTx) {
      return { success: false, error: 'Lançamento original correspondente não encontrado.' };
    }

    if (isPeriodClosed(originalTx.date)) {
      return { success: false, error: 'Não é possível prestar contas de um período mensal fechado.' };
    }

    const supabase = createClient();
    const genId = () => generateUUID();
    const amountTransferred = targetSet.amountTransferred;
    let returnedAmount = 0;
    let reimbursementRequired = 0;

    try {
      if (amountUsed < amountTransferred) {
        returnedAmount = amountTransferred - amountUsed;

        // Create Devolução (ENTRADA)
        const { error: devErr } = await supabase.from('transactions').insert({
          id: genId(),
          type: 'ENTRADA',
          category: 'SAIDA_DIRETA',
          account_id: originalTx.accountId,
          amount: returnedAmount,
          payment_method: 'DINHEIRO',
          description: `Devolução parcial do adiantamento (${originalTx.destinationName})`,
          origin_name: originalTx.destinationName,
          destination_name: originalTx.originName,
          date: new Date().toISOString().split('T')[0],
          status: 'SETTLED',
          user_id: currentUser.id || null
        });

        if (devErr) throw devErr;
      } 
      else if (amountUsed > amountTransferred) {
        reimbursementRequired = amountUsed - amountTransferred;

        // Create pending Reimbursement
        const { error: reimbErr } = await supabase.from('reimbursements').insert({
          id: genId(),
          requester_name: originalTx.destinationName,
          account_id: originalTx.accountId,
          amount: reimbursementRequired,
          description: `Complemento de adiantamento: ${originalTx.description}`,
          status: 'PENDING',
          date: new Date().toISOString().split('T')[0]
        });

        if (reimbErr) throw reimbErr;
      }

      // Mark original adiantamento transaction as SETTLED
      const { error: txErr } = await supabase
        .from('transactions')
        .update({ status: 'SETTLED' })
        .eq('id', originalTx.id);

      if (txErr) throw txErr;

      // Update settlements row to RESOLVED
      const { error: setErr } = await supabase
        .from('settlements')
        .update({
          amount_used: amountUsed,
          returned_amount: returnedAmount,
          reimbursement_required: reimbursementRequired,
          status: 'RESOLVED',
          description: description || targetSet.description
        })
        .eq('id', settlementId);

      if (setErr) throw setErr;

      await loadFinancialData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const requestReimbursement = async (reimb: Omit<Reimbursement, 'id' | 'date' | 'status'>): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('reimbursements').insert({
        id: generateUUID(),
        requester_name: reimb.requesterName,
        account_id: reimb.accountId,
        amount: reimb.amount,
        description: reimb.description,
        status: 'PENDING',
        date: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;
      await loadFinancialData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const payReimbursement = async (reimbId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Apenas administradores podem efetuar pagamentos de reembolsos.' };
    }

    const reimb = reimbursements.find(r => r.id === reimbId);
    if (!reimb) return { success: false, error: 'Reembolso não localizado.' };

    if (isPeriodClosed(reimb.date)) {
      return { success: false, error: 'O período deste reembolso já foi fechado e não pode ser alterado.' };
    }

    const supabase = createClient();
    try {
      // 1. Update reimbursement state to PAID
      const { error: reimbErr } = await supabase
        .from('reimbursements')
        .update({ status: 'PAID' })
        .eq('id', reimbId);

      if (reimbErr) throw reimbErr;

      // 2. Create the real settled debit transaction
      const { error: txErr } = await supabase.from('transactions').insert({
        id: generateUUID(),
        type: 'SAIDA',
        category: 'REEMBOLSO',
        account_id: reimb.accountId,
        amount: reimb.amount,
        payment_method: 'PIX',
        description: `[PAGO] Reembolso: ${reimb.description}`,
        origin_name: 'Caixinha Pro Reembolso',
        destination_name: reimb.requesterName,
        date: new Date().toISOString().split('T')[0],
        status: 'SETTLED',
        user_id: currentUser.id || null
      });

      if (txErr) throw txErr;

      await loadFinancialData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const rejectReimbursement = async (reimbId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Apenas administradores podem rejeitar reembolsos.' };
    }

    const reimb = reimbursements.find(r => r.id === reimbId);
    if (!reimb) return { success: false, error: 'Reembolso não localizado.' };

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('reimbursements')
        .update({ status: 'REJECTED' })
        .eq('id', reimbId);

      if (error) throw error;
      await loadFinancialData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const closeMonth = async (year: number, month: number): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Apenas administradores realizam fechamento mensal.' };
    }

    const alreadyClosed = closings.some(c => c.year === year && c.month === month);
    if (alreadyClosed) {
      return { success: false, error: 'Este mês já está fechado.' };
    }

    const supabase = createClient();
    try {
      const { error } = await supabase.from('monthly_closings').insert({
        id: generateUUID(),
        mes: month,
        ano: year,
        status: 'BLOQUEADO',
        criado_por: currentUser.id || null,
        resultado_liquido_geral: 0,
        total_movimentacoes: transactions.length,
        forcado: false,
        contas: []
      });

      if (error) throw error;
      await loadFinancialData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const addAccount = async (name: string, initialBalance: number = 0): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Apenas administradores podem gerenciar caixinhas.' };
    }
    if (!name.trim()) {
      return { success: false, error: 'O nome do caixinha não pode ser vazio.' };
    }
    const alreadyExists = accounts.some(acc => acc.name.toLowerCase() === name.trim().toLowerCase());
    if (alreadyExists) {
      return { success: false, error: 'Já existe um caixinha com este nome.' };
    }

    const supabase = createClient();
    try {
      const { error } = await supabase.from('accounts').insert({
        id: generateUUID(),
        name: name.trim(),
        balance: initialBalance,
        initial_balance: initialBalance,
        is_active: true
      });

      if (error) throw error;
      await loadFinancialData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateAccount = async (id: string, name: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Apenas administradores podem gerenciar caixinhas.' };
    }
    if (!name.trim()) {
      return { success: false, error: 'O nome do caixinha não pode ser vazio.' };
    }
    const nameConflict = accounts.some(acc => acc.id !== id && acc.name.toLowerCase() === name.trim().toLowerCase());
    if (nameConflict) {
      return { success: false, error: 'Já existe outro caixinha com este nome.' };
    }

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ name: name.trim() })
        .eq('id', id);

      if (error) throw error;
      await loadFinancialData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteAccount = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Apenas administradores podem gerenciar caixinhas.' };
    }
    const hasTxs = transactions.some(t => t.accountId === id || t.destinationAccountId === id);
    if (hasTxs) {
      return { success: false, error: 'Este caixinha não pode ser excluído pois possui lançamentos vinculados.' };
    }

    const supabase = createClient();
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
      await loadFinancialData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const toggleAccountActive = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Apenas administradores podem gerenciar caixinhas.' };
    }
    const acc = hydratedAccounts.find(a => a.id === id);
    if (!acc) {
      return { success: false, error: 'Caixinha não encontrado.' };
    }

    const currentActiveStatus = acc.isActive !== false;
    
    if (currentActiveStatus) {
      if (acc.balance !== 0) {
        return { success: false, error: 'Um caixinha só pode ser desativado se o seu saldo atual estiver zerado (R$ 0,00).' };
      }
    }

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ is_active: !currentActiveStatus })
        .eq('id', id);

      if (error) throw error;
      await loadFinancialData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const toggleUserRole = () => {
    // Standard simulation helper triggers reloading or handles visual toggling
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const resetSystem = async (): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Apenas administradores podem zerar o banco de dados.' };
    }

    const supabase = createClient();
    try {
      // Direct delete queries to purge state elements
      await supabase.from('settlements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('reimbursements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('monthly_closings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      await loadFinancialData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    currentUser,
    accounts: hydratedAccounts,
    transactions,
    settlements,
    reimbursements,
    closings,
    globalTotalBalance,
    isPeriodClosed,
    addTransaction,
    cancelTransaction,
    editTransaction,
    deleteTransaction,
    resolveSettlement,
    requestReimbursement,
    payReimbursement,
    rejectReimbursement,
    closeMonth,
    toggleUserRole,
    resetSystem,
    addAccount,
    updateAccount,
    deleteAccount,
    toggleAccountActive,
    loading
  };
}
