import React, { useState, useRef } from 'react';
import { X, ArrowDown, Printer, RefreshCw, Trash2, Check, AlertCircle } from 'lucide-react';
import { Settlement, Transaction, User } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { jsPDF } from 'jspdf';

const formatDatePortugueseUppercase = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr.toUpperCase();
  const year = parts[0];
  const day = parseInt(parts[2], 10).toString().padStart(2, '0');
  const monthIndex = parseInt(parts[1], 10);
  const months = [
    'MAI.' // Default fallback if bounds are weird
  ];
  const fullMonths = [
    'JAN.', 'FEV.', 'MAR.', 'ABR.', 'MAI.', 'JUN.',
    'JUL.', 'AGO.', 'SET.', 'OUT.', 'NOV.', 'DEZ.'
  ];
  const monthName = fullMonths[monthIndex - 1] || 'MAI.';
  return `${day} DE ${monthName} DE ${year}`;
};

const getReceiptDocumentId = (txId: string) => {
  if (!txId) return 'C2EEB26E';
  const cleanId = txId.replace('tx-', '').replace('-dev', '').replace('-reimb', '');
  const digitsOnly = cleanId.replace(/\D/g, '');
  if (digitsOnly.length > 5) {
    const num = Number(digitsOnly);
    return num.toString(16).toUpperCase().substring(0, 8).padEnd(8, 'E');
  }
  return cleanId.toUpperCase().substring(0, 8);
};

interface PendingSettlementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlements: Settlement[];
  transactions: Transaction[];
  currentUser: User;
  onResolveSettlement: (settlementId: string, amountUsed: number, description: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onCancelTransaction: (transactionId: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
}

export const PendingSettlementsModal: React.FC<PendingSettlementsModalProps> = ({
  isOpen,
  onClose,
  settlements,
  transactions,
  currentUser,
  onResolveSettlement,
  onCancelTransaction,
}) => {
  // Main Modal list state
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [printTx, setPrintTx] = useState<Transaction | null>(null);
  
  // "Prestação de Contas" input states
  const [amountUsedInput, setAmountUsedInput] = useState<string>('');
  const [remarksInput, setRemarksInput] = useState<string>('');
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // File drag & drop file mockup upload state
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Filter only pending ones
  const pendingSettlements = settlements.filter(s => s.status === 'PENDING');

  // Find related transaction details
  const getRelatedTx = (txId: string): Transaction | undefined => {
    return transactions.find(t => t.id === txId);
  };

  const handlePrintMock = (tx: Transaction) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 1. Title
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(22);
      doc.text('RECIBO DE ENTREGA DE VALORES', 105, 30, { align: 'center' });

      // Line divider
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(20, 36, 190, 36);

      // Doc Info (Nº do Documento and Data)
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      const docId = getReceiptDocumentId(tx.id);
      const docDate = formatDatePortugueseUppercase(tx.date);
      doc.text(`Nº do Documento: ${docId}`, 20, 48);
      
      // Right-aligned Date
      doc.text(`Data: ${docDate}`, 190, 48, { align: 'right' });

      // VALOR: R$ XXX,XX
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('VALOR: ', 20, 62);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(tx.amount), 38, 62);

      // Main Text paragraphs
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text('Recebi da Suprema Charque a importância acima discriminada, referente a:', 20, 76);

      // Description
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const descLines = doc.splitTextToSize(tx.description || 'Despesas operacionais corporativas', 170);
      doc.text(descLines, 20, 86);

      const descHeight = descLines.length * 6;
      const declY = 88 + descHeight + 6;

      // Declaration Clause
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      const declText = 'Declaro que os valores serão utilizados exclusivamente para a finalidade descrita acima, comprometendo-me a realizar a prestação de contas no prazo estabelecido.';
      const declLines = doc.splitTextToSize(declText, 170);
      doc.text(declLines, 20, declY);

      // Signature line relative to text end
      const signatureY = declY + 45;
      doc.setDrawColor(200, 200, 200);
      doc.line(40, signatureY, 170, signatureY);

      // Recipient Name in Upper Case
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const recipientName = (tx.destinationName || 'NÃO ESPECIFICADO').toUpperCase();
      doc.text(recipientName, 105, signatureY + 6, { align: 'center' });

      // Label under name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('RESPONSÁVEL PELO RECEBIMENTO', 105, signatureY + 11, { align: 'center' });

      // Save PDF triggering auto download
      doc.save(`Recibo_Entrega_Valores_${docId}.pdf`);
    } catch (e) {
      console.error('Error generating PDF:', e);
      alert('Ocorreu um erro ao gerar o PDF do recibo.');
    }
  };

  const handleSettleAction = (settlement: Settlement, tx: Transaction) => {
    setSettlingId(settlement.id);
    setAmountUsedInput(settlement.amountTransferred.toString());
    setRemarksInput('');
    setSelectedFile(null);
    setErrorFeedback(null);
    setSuccessFeedback(null);
  };

  const submitSettlement = async (settlementId: string) => {
    setErrorFeedback(null);
    setSuccessFeedback(null);
    const parsedAmount = parseFloat(amountUsedInput);

    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setErrorFeedback('Por favor, informe um valor gasto real válido superior ou igual a zero.');
      return;
    }

    const res = await onResolveSettlement(settlementId, parsedAmount, remarksInput);
    if (res.success) {
      setSuccessFeedback('Prestação concluída com sucesso!');
      setTimeout(() => {
        setSettlingId(null);
        setAmountUsedInput('');
        setRemarksInput('');
        setSelectedFile(null);
        setErrorFeedback(null);
        setSuccessFeedback(null);
      }, 1200);
    } else {
      setErrorFeedback(res.error || 'Não foi possível processar a prestação de contas.');
    }
  };

  const handleCancelTx = async (txId: string) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Apenas administradores podem cancelar lançamentos de adiantamentos.');
      return;
    }

    if (confirm('Tem certeza de que deseja cancelar este adiantamento? Isso anulará o saldo comprometido e resolverá a pendência correspondente.')) {
      const res = await onCancelTransaction(txId);
      if (res.success) {
        alert('Adiantamento cancelado e resolvido com sucesso!');
      } else {
        alert(res.error || 'Erro ao cancelar adiantamento.');
      }
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile({
        name: file.name,
        size: Math.round(file.size / 1024) // size in KB
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile({
        name: file.name,
        size: Math.round(file.size / 1024)
      });
    }
  };

  const handleUploadBoxClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Find active settlement if any
  let activeSettlement: Settlement | undefined;
  let activeTx: Transaction | undefined;
  if (settlingId) {
    activeSettlement = settlements.find(s => s.id === settlingId);
    if (activeSettlement) {
      activeTx = getRelatedTx(activeSettlement.transactionId);
    }
  }

  return (
    <div id="pending-settlements-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      
      {/* 1. Main list of Pending Adiantamentos */}
      <div 
        id="pending-settlements-modal-body" 
        className={`bg-white w-full max-w-2xl rounded-2xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all duration-300 ${
          settlingId ? 'scale-95 opacity-50 blur-xs pointer-events-none' : 'scale-100 opacity-100'
        }`}
      >
        {/* Header matching image exactly */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-neutral-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Pendências de Prestação</h2>
            <p className="text-xs text-gray-500 mt-1 font-medium">Lista de saídas que aguardam prestação de contas.</p>
          </div>
          <button id="close-settlements-modal-btn" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {pendingSettlements.length === 0 ? (
            <div className="text-center py-16 text-gray-500 bg-neutral-50/50 rounded-2xl border border-dashed border-gray-200 p-6 flex flex-col items-center justify-center">
              <Check className="w-12 h-12 text-emerald-500 mb-3 bg-emerald-50 rounded-full p-2 border border-emerald-100" />
              <span className="text-sm font-bold text-gray-800">Tudo em dia!</span>
              <span className="text-xs text-gray-400 mt-1">Nenhum adiantamento aguarda prestação de contas no momento.</span>
            </div>
          ) : (
            pendingSettlements.map((s) => {
              const tx = getRelatedTx(s.transactionId);
              if (!tx) return null;

              return (
                <div 
                  key={s.id} 
                  id={`pending-row-${s.id}`}
                  className="bg-neutral-50/60 hover:bg-neutral-50 border border-gray-100/90 rounded-2xl p-4 transition flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Visual indicators */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-full text-rose-500 shrink-0 flex items-center justify-center">
                        <ArrowDown className="w-4 h-4 font-black" />
                      </div>
                      
                      <div className="min-w-0">
                        {/* Title and badges row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-gray-900 truncate max-w-[180px] md:max-w-[280px]" title={tx.description}>
                            {tx.description || 'Adiantamento'}
                          </span>
                          <span className="text-[9px] border border-orange-300 text-orange-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-orange-50/20">
                            VIA: {tx.destinationName.toUpperCase()}
                          </span>
                          <span className="bg-amber-100/80 text-amber-800 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border border-amber-200">
                            PRESTAÇÃO PENDENTE
                          </span>
                        </div>

                        {/* Payment & Ref info */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                            tx.paymentMethod === 'PIX' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          }`}>
                            {tx.paymentMethod}
                          </span>
                          <span className="text-[11px] text-gray-500 font-semibold truncate max-w-[240px]">
                            {tx.description}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Numeric value / Date Column */}
                    <div className="text-right shrink-0">
                      <span className="text-sm md:text-base font-black text-rose-600 tracking-tight block">
                        - {formatCurrency(s.amountTransferred)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mt-1 block">
                        {tx.date.split('-').reverse().join('/')}
                      </span>
                    </div>
                  </div>

                  {/* Operational controls row */}
                  <div className="flex items-center justify-end gap-3 border-t border-gray-100/60 pt-2.5 mt-1">
                    {/* Simulation print */}
                    <button
                      onClick={() => handlePrintMock(tx)}
                      className="p-1.5 hover:bg-emerald-50 rounded-xl text-gray-400 hover:text-emerald-600 transition flex items-center justify-center cursor-pointer"
                      title="Imprimir comprovante de adiantamento"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {/* Trigger settlement in-place flow */}
                    <button
                      onClick={() => handleSettleAction(s, tx)}
                      className="p-1.5 hover:bg-sky-50 rounded-xl text-sky-600 hover:text-sky-800 transition flex items-center justify-center cursor-pointer font-bold gap-1 text-xs"
                      title="Prestar contas deste adiantamento"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="hidden sm:inline">Prestar Contas</span>
                    </button>

                    {/* Cancellation controls accessible if admin */}
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => handleCancelTx(tx.id)}
                        className="p-1.5 hover:bg-rose-50 rounded-xl text-gray-400 hover:text-rose-605 transition flex items-center justify-center cursor-pointer"
                        title="Cancelar e invalidar adiantamento"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-rose-500" />
                      </button>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Footer with Close button */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-2 border-t border-gray-100">
          <button
            id="close-settlements-modal-bottom-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 hover:border-black transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* 2. SPECIFIC PRESTACAO DE CONTAS NESTED MODAL OVERLAY */}
      {settlingId && activeSettlement && activeTx && (() => {
        const originalVal = activeSettlement.amountTransferred;
        const spentVal = parseFloat(amountUsedInput) || 0;
        const calculatedDiff = spentVal - originalVal;
        const absoluteDiff = Math.abs(calculatedDiff);

        return (
          <div 
            id="prestacao-contas-modal-overlay-inner" 
            className="absolute inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
          >
            <div 
              id="prestacao-contas-modal-card" 
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] text-left"
            >
              
              {/* Header */}
              <div className="px-6 pt-6 pb-3 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">Prestação de Contas</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Finalize o processo de retirada de dinheiro.</p>
                </div>
                <button 
                  onClick={() => {
                    setSettlingId(null);
                    setSelectedFile(null);
                    setErrorFeedback(null);
                    setSuccessFeedback(null);
                  }} 
                  className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable contents */}
              <div className="flex-1 overflow-y-auto pb-4">
                
                {/* 2a. Original Withdrawal Card Panel */}
                <div className="mx-6 my-2 bg-neutral-50/80 border border-neutral-200/40 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">VALOR RETIRADO</span>
                    <span className="text-base font-black text-gray-900">{formatCurrency(originalVal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RESPONSÁVEL</span>
                    <span className="text-sm font-bold text-gray-800">{activeTx.destinationName || 'Não Informado'}</span>
                  </div>
                </div>

                {/* Main calculation feeds errors */}
                {errorFeedback && (
                  <div className="mx-6 my-2 p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-2xl border border-rose-100 flex items-center gap-1.5 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errorFeedback}
                  </div>
                )}
                {successFeedback && (
                  <div className="mx-6 my-2 p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-2xl border border-emerald-100 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    {successFeedback}
                  </div>
                )}

                {/* 2b. Input of actual expenditure */}
                <div className="mx-6 mt-4">
                  <label className="text-xs font-bold text-gray-850 block mb-2 font-medium">Valor Efetivamente Gasto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={amountUsedInput}
                    onChange={(e) => setAmountUsedInput(e.target.value)}
                    className="w-full text-base font-bold border-2 border-gray-300 rounded-2xl p-3 bg-white text-gray-900 focus:ring-2 focus:ring-black outline-hidden focus:border-black transition"
                    autoFocus
                  />
                </div>

                {/* 2c. Drag and drop file select section */}
                <div className="mx-6 mt-4">
                  <label className="text-xs font-bold text-gray-850 block mb-2 font-medium">Anexar Comprovantes</label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleUploadBoxClick}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition ${
                      isDragging 
                        ? 'border-black bg-neutral-50/50' 
                        : 'border-slate-200 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                    />
                    
                    {selectedFile ? (
                      <div className="flex flex-col items-center text-center">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full mb-2 border border-emerald-100">
                          <Check className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-gray-900 max-w-[200px] truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-semibold">{selectedFile.size} KB • Clique para remover ou alterar</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <div className="p-3 bg-neutral-50 text-gray-400 rounded-full mb-3">
                          {/* File upload arrow icon precisely matching sample screenshot */}
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5h10.5" />
                          </svg>
                        </div>
                        <p className="text-xs font-bold text-gray-600">Clique ou arraste arquivos aqui</p>
                        <p className="text-[9px] text-gray-400 font-extrabold uppercase mt-1 tracking-wider">PDF, JPG, PNG</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2d. Optional description comment referent text */}
                <div className="mx-6 mt-3">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">
                    Descrição ou Referências Opcionais
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ref nota fiscal do almoço corporativo..."
                    value={remarksInput}
                    onChange={(e) => setRemarksInput(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-white font-medium focus:ring-1 focus:ring-black outline-hidden"
                  />
                </div>

                {/* 2e. Dynamically Calculated Information/Alert Strip */}
                {amountUsedInput !== '' && parseFloat(amountUsedInput) >= 0 && (() => {
                  if (calculatedDiff > 0) {
                    // Reembolso pendente (Purple bar) style matching precisely
                    return (
                      <div className="mx-6 mt-4 p-4 bg-violet-50/70 border border-violet-100 rounded-2xl flex items-center gap-3 animate-fade-in">
                        <div className="p-1.5 bg-violet-100 text-purple-600 rounded-full shrink-0 flex items-center justify-center">
                          <AlertCircle className="w-4 h-4 font-bold" />
                        </div>
                        <span className="text-xs font-bold text-violet-750 text-purple-600">
                          Reembolso pendente: {formatCurrency(absoluteDiff)}
                        </span>
                      </div>
                    );
                  } else if (calculatedDiff < 0) {
                    // Saldo a devolver (Blue bar) style matching precisely
                    return (
                      <div className="mx-6 mt-4 p-4 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center gap-3 animate-fade-in">
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-full shrink-0 flex items-center justify-center">
                          {/* Standard arrow up icon */}
                          <svg className="w-4 h-4 font-black" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                        </div>
                        <span className="text-xs font-bold text-blue-700">
                          Saldo a devolver: {formatCurrency(absoluteDiff)}
                        </span>
                      </div>
                    );
                  } else {
                    // Equal value (No off-balance returned)
                    return (
                      <div className="mx-6 mt-4 p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-fade-in">
                        <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-full shrink-0 flex items-center justify-center">
                          <Check className="w-4 h-4 font-black" />
                        </div>
                        <span className="text-xs font-bold text-emerald-700">
                          Tudo certo! Valor gasto é idêntico ao adiantamento.
                        </span>
                      </div>
                    );
                  }
                })()}

              </div>

              {/* 2f. Action footer inside the sub card */}
              <div className="px-6 py-5 border-t border-gray-100 flex items-center gap-3 bg-neutral-50/40">
                <button
                  type="button"
                  onClick={() => {
                    setSettlingId(null);
                    setSelectedFile(null);
                    setErrorFeedback(null);
                    setSuccessFeedback(null);
                  }}
                  className="flex-1 py-3 text-center text-xs font-black text-gray-700 bg-white hover:bg-neutral-50 rounded-xl border border-gray-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => submitSettlement(activeSettlement!.id)}
                  className="flex-1 py-3 text-center text-xs font-bold text-white bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-xl transition cursor-pointer"
                >
                  Finalizar Prestação
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 3. PRINTABLE REAL RECEIPT MODAL FOR SYSTEM WITH ASSIGNMENT FIELD */}
      {printTx && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/85 p-4 overflow-y-auto backdrop-blur-xs dynamic-print-modal">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-150 flex flex-col my-8 print:my-0 print:border-none print:shadow-none animate-fade-in text-left">
            
            {/* Buttons for UI (hidden during print) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-neutral-50 print:hidden">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                Visualização do Recibo de Adiantamento
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Recibo
                </button>
                <button
                  onClick={() => setPrintTx(null)}
                  className="px-4 py-2 bg-gray-250 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Printable Area - Matching the exact simple layout style requested */}
            <div id="printable-receipt-card" className="p-12 md:p-16 text-black bg-white font-sans tracking-normal print:p-0 print:text-black leading-relaxed">
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-receipt-card, #printable-receipt-card * {
                    visibility: visible !important;
                  }
                  #printable-receipt-card {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                  }
                  .dynamic-print-modal {
                    background: white !important;
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    z-index: 99999 !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    overflow: visible !important;
                  }
                }
              `}} />
              
              {/* Header Title */}
              <div className="text-center mb-8">
                <h2 className="text-[22px] md:text-2xl font-normal uppercase tracking-wide text-black text-center font-sans">
                  RECIBO DE ENTREGA DE VALORES
                </h2>
                <div className="border-t border-neutral-300 w-full mt-4"></div>
              </div>

              {/* Document Info Row (No. do Documento & Data) */}
              <div className="flex justify-between text-sm text-neutral-900 mb-8 font-sans">
                <div>
                  <span>Nº do Documento: </span>
                  <span className="font-semibold">{getReceiptDocumentId(printTx.id)}</span>
                </div>
                <div>
                  <span>Data: </span>
                  <span className="font-semibold uppercase">{formatDatePortugueseUppercase(printTx.date)}</span>
                </div>
              </div>

              {/* Value Box */}
              <div className="text-base text-neutral-900 mb-10 font-sans">
                <span className="uppercase">VALOR: </span>
                <span className="font-bold text-lg text-black">{formatCurrency(printTx.amount)}</span>
              </div>

              {/* Paragraphs and Text Descriptions */}
              <div className="text-sm text-neutral-950 mb-6 text-justify leading-relaxed font-sans">
                <p className="mb-6">
                  Recebi da Suprema Charque a importância acima discriminada, referente a:
                </p>
                <div className="font-bold text-sm text-black pl-0 mb-8 select-all">
                  {printTx.description || 'Despesas operacionais corporativas'}
                </div>
                <p>
                  Declaro que os valores serão utilizados exclusivamente para a finalidade descrita acima, comprometendo-me a realizar a prestação de contas no prazo estabelecido.
                </p>
              </div>

              {/* Spacing for Signature */}
              <div className="mt-40 text-center font-sans">
                <div className="border-t border-neutral-300 w-9/12 md:w-8/12 mx-auto mb-2"></div>
                <p className="text-sm font-bold text-black uppercase tracking-wide">
                  {printTx.destinationName ? printTx.destinationName.toUpperCase() : 'NÃO ESPECIFICADO'}
                </p>
                <p className="text-[10px] text-neutral-500 tracking-wider font-semibold uppercase mt-0.5">
                  RESPONSÁVEL PELO RECEBIMENTO
                </p>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
