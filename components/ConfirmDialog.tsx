import React from 'react';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'info',
}) => {
  if (!isOpen) return null;

  const getTheme = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-rose-600 animate-bounce" />,
          iconBg: 'bg-rose-50 border border-rose-100',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 shadow-rose-100',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-6 h-6 text-amber-600" />,
          iconBg: 'bg-amber-50 border border-amber-100',
          confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 shadow-amber-100',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-6 h-6 text-blue-600" />,
          iconBg: 'bg-blue-50 border border-blue-100',
          confirmBtn: 'bg-gray-900 hover:bg-black text-white border border-black shadow-gray-100',
        };
    }
  };

  const theme = getTheme();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Background overlay with smooth backdrop-blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300" 
        onClick={onCancel}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-150 overflow-hidden transform transition-all duration-300 scale-100">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full shrink-0 ${theme.iconBg}`}>
              {theme.icon}
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <h3 className="text-base font-extrabold text-gray-950 tracking-tight leading-snug">
                {title}
              </h3>
              <p className="text-xs text-gray-500 font-semibold leading-relaxed whitespace-pre-line">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-black rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${theme.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
