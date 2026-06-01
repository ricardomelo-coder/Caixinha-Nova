import { Transaction, Account, PendenciaItem, SnapshotConta, Settlement, Reimbursement } from '../types';

/**
 * Pure function to calculate a month-closed snapshot for a specific account.
 */
export function calcularSnapshot(
  account: Account,
  transactions: Transaction[], // filtered for this month
  settlements: Settlement[], // all settlements
  reimbursements: Reimbursement[], // all reimbursements
  saldoInicialValue: number, // initial balance for this account
  mes: number,
  ano: number
): SnapshotConta {
  // Filter transactions belonging to this account (either origin or destination)
  const accountTxs = transactions.filter(
    tx => tx.accountId === account.id || tx.destinationAccountId === account.id
  );

  let totalEntradas = 0;
  let totalSaidas = 0;
  let totalTransfRecebidas = 0;
  let totalTransfEnviadas = 0;

  accountTxs.forEach(tx => {
    if (tx.status === 'CANCELLED') return;

    if (tx.type === 'ENTRADA') {
      if (tx.accountId === account.id) {
        totalEntradas += tx.amount;
      }
    } else if (tx.type === 'SAIDA') {
      if (tx.accountId === account.id) {
        // Skip awaiting reimbursement since it doesn't decrease physical balance yet
        if (tx.category === 'REEMBOLSO' && tx.status === 'AWAITING_REIMBURSEMENT') {
          return;
        }
        totalSaidas += tx.amount;
      }
    } else if (tx.type === 'TRANSFERENCIA') {
      if (tx.accountId === account.id) {
        totalTransfEnviadas += tx.amount;
      }
      if (tx.destinationAccountId === account.id) {
        totalTransfRecebidas += tx.amount;
      }
    }
  });

  // Saldo final is calculated correctly from starting balance and all movements
  const saldoFinal = saldoInicialValue + totalEntradas + totalTransfRecebidas - totalSaidas - totalTransfEnviadas;

  // Track pending items for this account in this specific month/year
  const pendencias: PendenciaItem[] = [];

  // 1. Pending adiantamentos
  settlements.forEach(s => {
    if (s.status === 'PENDING') {
      // Find related transaction
      const relatedTx = transactions.find(t => t.id === s.transactionId);
      if (relatedTx && relatedTx.accountId === account.id) {
        const d = new Date(relatedTx.date);
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth() + 1;
        if (y === ano && m === mes) {
          pendencias.push({
            transactionId: relatedTx.id,
            tipo: 'ADIANTAMENTO_PENDENTE',
            valor: relatedTx.amount,
            descricao: relatedTx.description,
            data: relatedTx.date,
          });
        }
      }
    }
  });

  // 2. Pending reimbursements
  reimbursements.forEach(r => {
    if (r.status === 'PENDING' && r.accountId === account.id) {
      const d = new Date(r.date);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      if (y === ano && m === mes) {
        pendencias.push({
          transactionId: r.id,
          tipo: 'REEMBOLSO_PENDENTE',
          valor: r.amount,
          descricao: r.description,
          data: r.date,
        });
      }
    }
  });

  return {
    accountId: account.id,
    accountName: account.name,
    saldoInicial: saldoInicialValue,
    totalEntradas,
    totalSaidas,
    totalTransfRecebidas,
    totalTransfEnviadas,
    saldoFinal,
    pendencias,
  };
}
