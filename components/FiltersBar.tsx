import React from 'react';
import { Search } from 'lucide-react';
import { Account, TransactionType } from '../types';

interface FiltersBarProps {
  accounts: Account[];
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
  selectedType: string;
  onSelectType: (type: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  startDate: string;
  onStartDateChange: (d: string) => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  selectedType,
  onSelectType,
  searchQuery,
  onSearchChange,
  startDate,
  onStartDateChange,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
      
      {/* Search Input */}
      <div className="relative w-full md:w-80">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <Search className="h-4.5 w-4.5 text-gray-400" />
        </span>
        <input
          id="filter-search-input"
          type="text"
          placeholder="Buscar descrição ou favorecido..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-1 focus:ring-black outline-hidden bg-gray-50/70 text-gray-900 transition"
        />
      </div>

      {/* Selects */}
      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1 justify-end">
        {/* Account Filter */}
        <div className="w-full sm:w-56">
          <select
            id="filter-account-select"
            value={selectedAccountId}
            onChange={(e) => onSelectAccount(e.target.value)}
            className="w-full text-sm font-bold border border-gray-200 rounded-xl p-2.5 bg-white focus:ring-1 focus:ring-black outline-hidden text-gray-800 transition"
          >
            <option value="">Todas as Contas</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}{acc.isActive === false ? ' (Inativa)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div className="w-full sm:w-44">
          <select
            id="filter-type-select"
            value={selectedType}
            onChange={(e) => onSelectType(e.target.value)}
            className="w-full text-sm font-bold border border-gray-200 rounded-xl p-2.5 bg-white focus:ring-1 focus:ring-black outline-hidden text-gray-800 transition"
          >
            <option value="">Todos os Fluxos</option>
            <option value="ENTRADA">ENTRADAS</option>
            <option value="SAIDA">SAÍDAS</option>
            <option value="TRANSFERENCIA">TRANSFERÊNCIAS</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="w-full sm:w-44">
          <input
            id="filter-date-input"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full text-sm font-bold border border-gray-200 rounded-xl p-2.5 bg-white focus:ring-1 focus:ring-black outline-hidden text-gray-800 transition"
            title="Filtrar por data inicial"
          />
        </div>
      </div>

    </div>
  );
};
