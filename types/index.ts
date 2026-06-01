export type TransactionType = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA';
export type PaymentMethod = 'PIX' | 'DINHEIRO';
export type TransactionStatus = 'SETTLED' | 'AWAITING_SETTLEMENT' | 'AWAITING_REIMBURSEMENT' | 'CANCELLED';
export type OutputCategory = 'SAIDA_DIRETA' | 'ADIANTAMENTO' | 'REEMBOLSO';

export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountIds: string[];
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number; // calculated dynamically but stored as physical list element for info if needed
  isActive?: boolean;
  initialBalance?: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category: OutputCategory;
  accountId: string; // From account
  destinationAccountId?: string; // Only for TRANSFERENCIA
  amount: number; // Always positive
  paymentMethod: PaymentMethod;
  description: string;
  originName: string; // Ex: SEVERINO JOSE DOS SANTOS
  destinationName: string; // Ex: ROMERO JOSE DA SILVA RODRIGUES
  date: string; // ISO date string YYYY-MM-DD
  status: TransactionStatus;
  userId: string; // Managed by
  createdAt: string;
}

export interface Settlement {
  id: string;
  transactionId: string; // the ADIANTAMENTO transaction
  amountTransferred: number;
  amountUsed: number;
  returnedAmount: number;
  reimbursementRequired: number;
  status: 'PENDING' | 'RESOLVED';
  description: string;
}

export interface Reimbursement {
  id: string;
  requesterName: string;
  accountId: string;
  amount: number;
  description: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  date: string;
}

export interface MonthlyClosing {
  id: string;
  year: number;
  month: number; // 1-12
  closedAt: string;
  closedBy: string; // Admin User ID
}

export interface PendenciaItem {
  transactionId: string;
  tipo: 'ADIANTAMENTO_PENDENTE' | 'REEMBOLSO_PENDENTE';
  valor: number;
  descricao: string;
  data: string;
}

export interface SnapshotConta {
  accountId: string;
  accountName: string;
  saldoInicial: number;
  totalEntradas: number;
  totalSaidas: number;
  totalTransfRecebidas: number;
  totalTransfEnviadas: number;
  saldoFinal: number;
  pendencias: PendenciaItem[];
}

export interface FechamentoMensal {
  id: string;
  mes: number; // 1-12
  ano: number;
  dataCriacao: string;
  criadoPor: string;
  status: 'BLOQUEADO' | 'REABERTO';
  contas: SnapshotConta[];
  resultadoLiquidoGeral: number; // sum of entries - exits
  totalMovimentacoes: number;
  forcado: boolean;
  motivoReabertura?: string;
}

