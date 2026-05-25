
import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export const ConfirmModal: React.FC = () => {
  const { confirmModal, closeConfirm } = useUIStore();
  const { isOpen, options } = confirmModal;

  if (!isOpen || !options) return null;

  const handleConfirm = () => {
    options.onConfirm();
    closeConfirm();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={closeConfirm}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-surface border border-gray-200 dark:border-neutral-800 w-full max-w-md shadow-2xl animate-pop-in p-6">
        <div className="flex gap-4">
          <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full ${
            options.variant === 'danger' 
              ? 'bg-red-50 dark:bg-red-900/20 text-red-600' 
              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
          }`}>
            {options.variant === 'danger' ? <AlertTriangle size={24} /> : <HelpCircle size={24} />}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">{options.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
              {options.message}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeConfirm}
                className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors rounded-none"
              >
                {options.cancelText || 'انصراف'}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-6 py-2 text-sm font-bold text-white transition-colors rounded-none shadow-md ${
                  options.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-primary dark:bg-white dark:text-primary hover:opacity-90'
                }`}
              >
                {options.confirmText || 'بله، تایید می‌کنم'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
