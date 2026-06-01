import { Transaction, Account } from '../types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Avoid shift due to timezone
  const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  
  return formatter.format(utcDate).toUpperCase();
}

export function getMonthName(monthNumber: number): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[monthNumber - 1] || '';
}

export function getTransactionNames(tx: Transaction, accounts: Account[]): { origin: string; destination: string } {
  const getAccName = (id: string) => accounts.find(a => a.id === id)?.name || 'Caixinha';
  
  if (tx.type === 'ENTRADA') {
    return {
      origin: tx.originName || 'Origem Externa',
      destination: getAccName(tx.accountId),
    };
  } else if (tx.type === 'SAIDA') {
    return {
      origin: getAccName(tx.accountId),
      destination: tx.destinationName || 'Favorecido Geral',
    };
  } else if (tx.type === 'TRANSFERENCIA') {
    return {
      origin: getAccName(tx.accountId),
      destination: tx.destinationAccountId ? getAccName(tx.destinationAccountId) : 'Caixinha Destino',
    };
  }
  
  return {
    origin: tx.originName,
    destination: tx.destinationName,
  };
}

