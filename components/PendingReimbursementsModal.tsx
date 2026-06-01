import React, { useState, useRef } from 'react';
import { X, AlertTriangle, Printer, Trash2, Check, AlertCircle, DollarSign, ArrowUp } from 'lucide-react';
import { Reimbursement, Transaction, User, Account } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { jsPDF } from 'jspdf';

const formatDatePortugueseUppercase = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr.toUpperCase();
  const year = parts[0];
  const day = parseInt(parts[2], 10).toString().padStart(2, '0');
  const monthIndex = parseInt(parts[1], 10);
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

interface PendingReimbursementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reimbursements: Reimbursement[];
  transactions: Transaction[];
  accounts: Account[];
  currentUser: User;
  onPayReimbursement: (reimbId: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onRejectReimbursement: (reimbId: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
}

export const PendingReimbursementsModal: React.FC<PendingReimbursementsModalProps> = ({
  isOpen,
  onClose,
  reimbursements,
  transactions,
  accounts,
  currentUser,
  onPayReimbursement,
  onRejectReimbursement,
}) => {
  const [payingId, setPayingId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<{ name: string; size: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [printReimb, setPrintReimb] = useState<Reimbursement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Filter pending reimbursements
  const pendingReimbursements = reimbursements.filter(r => r.status === 'PENDING');

  const getAccountName = (accId: string): string => {
    const acc = accounts.find(a => a.id === accId);
    return acc ? acc.name : 'Caixinha Administrativo';
  };

  const handlePrintVoucher = (reimb: Reimbursement) => {
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
      const docId = getReceiptDocumentId(reimb.id);
      const docDate = formatDatePortugueseUppercase(reimb.date);
      doc.text(`Nº do Documento: ${docId}`, 20, 48);
      
      // Right-aligned Date
      doc.text(`Data: ${docDate}`, 190, 48, { align: 'right' });

      // VALOR: R$ XXX,XX
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('VALOR: ', 20, 62);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(reimb.amount), 38, 62);

      // Main Text paragraphs
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text('Recebi da Suprema Charque a importância acima discriminada, referente a reembolso de despesas de:', 20, 76);

      // Description
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const descLines = doc.splitTextToSize(reimb.description || 'Despesas operacionais corporativas', 170);
      doc.text(descLines, 20, 86);

      const descHeight = descLines.length * 6;
      const declY = 88 + descHeight + 6;

      // Declaration Clause
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      const declText = 'Declaro que os valores recebidos correspondem ao reembolso integral das despesas anteriormente descritas e devidamente comprovadas.';
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
      const recipientName = (reimb.requesterName || 'NÃO ESPECIFICADO').toUpperCase();
      doc.text(recipientName, 105, signatureY + 6, { align: 'center' });

      // Label under name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('RESPONSÁVEL PELO RECEBIMENTO', 105, signatureY + 11, { align: 'center' });

      // Save PDF triggering auto download
      doc.save(`Recibo_Reembolso_Valores_${docId}.pdf`);
    } catch (e) {
      console.error('Error generating PDF:', e);
      alert('Ocorreu um erro ao gerar o PDF do recibo.');
    }
  };

  const startPaymentFlow = (reimb: Reimbursement) => {
    setPayingId(reimb.id);
    setRemarks('');
    setReceiptFile(null);
    setErrorFeedback(null);
    setSuccessFeedback(null);
  };

  const handleConfirmPayment = async (reimbId: string) => {
    setErrorFeedback(null);
    setSuccessFeedback(null);

    const res = await onPayReimbursement(reimbId);
    if (res.success) {
      setSuccessFeedback('Reembolso pago com sucesso! O valor foi debitado de seu respectivo caixa.');
      setTimeout(() => {
        setPayingId(null);
        setReceiptFile(null);
        setRemarks('');
        setErrorFeedback(null);
        setSuccessFeedback(null);
      }, 1200);
    } else {
      setErrorFeedback(res.error || 'Erro ao efetivar o pagamento do reembolso.');
    }
  };

  const handleReject = async (reimbId: string) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Apenas administradores podem rejeitar solicitações de reembolso.');
      return;
    }

    if (confirm('Tem certeza de que deseja REJEITAR esta solicitação de reembolso? O lançamento provisório associado será cancelado.')) {
      const res = await onRejectReimbursement(reimbId);
      if (res.success) {
        alert('Solicitação de reembolso rejeitada e cancelada com sucesso!');
      } else {
        alert(res.error || 'Erro ao rejeitar reembolso.');
      }
    }
  };

  // Drag and drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setReceiptFile({
        name: file.name,
        size: Math.round(file.size / 1024)
      });
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setReceiptFile({
        name: file.name,
        size: Math.round(file.size / 1024)
      });
    }
  };

  const selectFileManually = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div id="pending-reimbursements-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      
      {/* List Modal */}
      <div 
        id="reimbursements-modal-body" 
        className={`bg-white w-full max-w-2xl rounded-2xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all duration-300 ${
          payingId ? 'scale-95 opacity-50 blur-xs pointer-events-none' : 'scale-100 opacity-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-neutral-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Pendências de Reembolso</h2>
            <p className="text-xs text-gray-500 mt-1 font-medium">Lista de solicitações que aguardam comprovação e pagamento.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {pendingReimbursements.length === 0 ? (
            <div className="text-center py-16 text-gray-500 bg-neutral-50/50 rounded-2xl border border-dashed border-gray-200 p-6 flex flex-col items-center justify-center">
              <Check className="w-12 h-12 text-purple-500 mb-3 bg-purple-50 rounded-full p-2 border border-purple-100" />
              <span className="text-sm font-bold text-gray-800">Tudo em dia!</span>
              <span className="text-xs text-gray-400 mt-1">Nenhuma solicitação de reembolso aguarda pagamento no momento.</span>
            </div>
          ) : (
            pendingReimbursements.map((r) => {
              return (
                <div 
                  key={r.id} 
                  id={`reimb-row-${r.id}`}
                  className="bg-neutral-50/60 hover:bg-neutral-50 border border-gray-100/90 rounded-2xl p-4 transition flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-purple-50 border border-purple-100 rounded-full text-purple-500 shrink-0 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 font-black" />
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-gray-900 truncate max-w-[180px] md:max-w-[280px]" title={r.description}>
                            {r.description || 'Reembolso'}
                          </span>
                          <span className="text-[9px] border border-purple-300 text-purple-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-purple-50/20">
                            PARA: {r.requesterName.toUpperCase()}
                          </span>
                          <span className="bg-purple-100/80 text-purple-800 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border border-purple-200">
                            REEMBOLSO PENDENTE
                          </span>
                        </div>

                        {/* Connected Account Box Info */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border bg-neutral-100 text-gray-700 border-neutral-200">
                            CAIXA: {getAccountName(r.accountId)}
                          </span>
                          <span className="text-[11px] text-gray-500 font-semibold truncate max-w-[240px]">
                            {r.description}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Numeric value / Date Column */}
                    <div className="text-right shrink-0">
                      <span className="text-sm md:text-base font-black text-purple-600 tracking-tight block">
                        + {formatCurrency(r.amount)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mt-1 block">
                        {r.date.split('-').reverse().join('/')}
                      </span>
                    </div>
                  </div>

                  {/* Operational controls */}
                  <div className="flex items-center justify-end gap-3 border-t border-gray-100/60 pt-2.5 mt-1">
                    <button
                      onClick={() => handlePrintVoucher(r)}
                      className="p-1.5 hover:bg-purple-50 rounded-xl text-gray-400 hover:text-purple-600 transition flex items-center justify-center cursor-pointer"
                      title="Imprimir comprovante de solicitação"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => startPaymentFlow(r)}
                      className="p-1.5 hover:bg-emerald-50 rounded-xl text-emerald-600 hover:text-emerald-800 transition flex items-center justify-center cursor-pointer font-bold gap-1 text-xs"
                      title="Efetuar pagamento deste reembolso"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Pagar Reembolso</span>
                    </button>

                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => handleReject(r.id)}
                        className="p-1.5 hover:bg-rose-50 rounded-xl text-gray-400 hover:text-rose-600 transition flex items-center justify-center cursor-pointer"
                        title="Rejeitar e cancelar reembolso solicitado"
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

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 hover:border-black transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Embedded Specific Payment Flow Modal Overlay */}
      {payingId && (() => {
        const activeReimb = reimbursements.find(r => r.id === payingId);
        if (!activeReimb) return null;

        return (
          <div 
            id="reimburse-payment-modal-overlay-inner" 
            className="absolute inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
          >
            <div 
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] text-left"
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-3 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight font-sans">Pagamento de Reembolso</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Confirme o repasse do dinheiro de reembolso ao solicitante.</p>
                </div>
                <button 
                  onClick={() => {
                    setPayingId(null);
                    setReceiptFile(null);
                    setErrorFeedback(null);
                    setSuccessFeedback(null);
                  }} 
                  className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto pb-4">
                
                {/* Details list preview */}
                <div className="mx-6 my-2 bg-purple-50/20 border border-purple-100/50 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">VALOR PARA REEMBOLSAR</span>
                    <span className="text-base font-black text-purple-700">{formatCurrency(activeReimb.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SOLICITANTE</span>
                    <span className="text-sm font-bold text-gray-800">{activeReimb.requesterName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">DÉBITO DO CAIXA</span>
                    <span className="text-xs font-extrabold uppercase text-gray-700 bg-white border border-gray-200 rounded px-2 py-0.5">
                      {getAccountName(activeReimb.accountId)}
                    </span>
                  </div>
                </div>

                {/* Info and warnings strip */}
                <div className="mx-6 my-3 p-3.5 bg-amber-50 border border-amber-200/60 rounded-2xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] sm:text-xs text-amber-800 font-medium leading-relaxed">
                    <strong>Regra Financeira:</strong> Este reembolso foi contabilizado provisoriamente. Ao confirmar o pagamento abaixo, o saldo de <strong>{getAccountName(activeReimb.accountId)}</strong> será debitado em <strong>{formatCurrency(activeReimb.amount)}</strong> de forma irreversível.
                  </p>
                </div>

                {/* Notifications feedback */}
                {errorFeedback && (
                  <div className="mx-6 my-2 p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-2xl border border-rose-100 flex items-center gap-1.5">
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

                {/* Upload Section matching receipt guidelines */}
                <div className="mx-6 mt-4">
                  <label className="text-xs font-bold text-gray-850 block mb-2 font-medium">Anexar Comprovante de Transferência / PIX (Opcional)</label>
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={selectFileManually}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition ${
                      isDragging 
                        ? 'border-black bg-neutral-50/50' 
                        : 'border-slate-201 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={onFileChange}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                    />

                    {receiptFile ? (
                      <div className="flex flex-col items-center text-center">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full mb-2 border border-emerald-100 animate-bounce">
                          <Check className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-gray-900 max-w-[200px] truncate">{receiptFile.name}</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-semibold">{receiptFile.size} KB • Clique para alterar</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <div className="p-3 bg-neutral-50 text-gray-450 rounded-full mb-3">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5h10.5" />
                          </svg>
                        </div>
                        <p className="text-xs font-bold text-gray-600">Clique ou arraste o comprovante aqui</p>
                        <p className="text-[9px] text-gray-400 font-extrabold uppercase mt-1 tracking-wider">PDF, JPG, PNG</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional optional payment remarks input style matching */}
                <div className="mx-6 mt-4">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">
                    Número de Autenticação ou Informações Adicionais
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Transação PIX E241031..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-white font-medium focus:ring-1 focus:ring-black outline-hidden"
                  />
                </div>

              </div>

              {/* Action buttons inside sub card */}
              <div className="px-6 py-5 border-t border-gray-100 flex items-center gap-3 bg-neutral-50/40">
                <button
                  type="button"
                  onClick={() => {
                    setPayingId(null);
                    setReceiptFile(null);
                    setErrorFeedback(null);
                    setSuccessFeedback(null);
                  }}
                  className="flex-1 py-3 text-center text-xs font-black text-gray-700 bg-white hover:bg-neutral-50 rounded-xl border border-gray-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmPayment(activeReimb.id)}
                  className="flex-1 py-3 text-center text-xs font-bold text-white bg-purple-650 hover:bg-purple-700 bg-purple-600 rounded-xl transition cursor-pointer"
                >
                  Confirmar Pagamento
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 3. PRINTABLE REAL RECEIPT MODAL FOR SYSTEM WITH ASSIGNMENT FIELD */}
      {printReimb && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/85 p-4 overflow-y-auto backdrop-blur-xs dynamic-print-modal text-left">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-150 flex flex-col my-8 print:my-0 print:border-none print:shadow-none animate-fade-in text-left">
            
            {/* Buttons for UI (hidden during print) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-neutral-50 print:hidden">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-purple-600" />
                Visualização do Recibo de Reembolso
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Recibo
                </button>
                <button
                  onClick={() => setPrintReimb(null)}
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
                  <span className="font-semibold">{getReceiptDocumentId(printReimb.id)}</span>
                </div>
                <div>
                  <span>Data: </span>
                  <span className="font-semibold uppercase">{formatDatePortugueseUppercase(printReimb.date)}</span>
                </div>
              </div>

              {/* Value Box */}
              <div className="text-base text-neutral-900 mb-10 font-sans">
                <span className="uppercase">VALOR: </span>
                <span className="font-bold text-lg text-black">{formatCurrency(printReimb.amount)}</span>
              </div>

              {/* Paragraphs and Text Descriptions */}
              <div className="text-sm text-neutral-950 mb-6 text-justify leading-relaxed font-sans">
                <p className="mb-6">
                  Recebi da Suprema Charque a importância acima discriminada, referente a reembolso de despesas de:
                </p>
                <div className="font-bold text-sm text-black pl-0 mb-8 select-all">
                  {printReimb.description || 'Despesas operacionais corporativas'}
                </div>
                <p>
                  Declaro que os valores recebidos correspondem ao reembolso integral das despesas anteriormente descritas e devidamente comprovadas.
                </p>
              </div>

              {/* Spacing for Signature */}
              <div className="mt-40 text-center font-sans">
                <div className="border-t border-neutral-300 w-9/12 md:w-8/12 mx-auto mb-2"></div>
                <p className="text-sm font-bold text-black uppercase tracking-wide">
                  {printReimb.requesterName ? printReimb.requesterName.toUpperCase() : 'NÃO ESPECIFICADO'}
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
