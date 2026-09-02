import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />;
          let bgStyle = 'bg-white border-slate-200 text-slate-800 shadow-lg';

          if (toast.type === 'error') {
            icon = <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />;
            bgStyle = 'bg-white border-rose-200 text-slate-800 shadow-lg';
          } else if (toast.type === 'warning') {
            icon = <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />;
            bgStyle = 'bg-white border-amber-200 text-slate-800 shadow-lg';
          } else if (toast.type === 'info') {
            icon = <Info className="w-4 h-4 text-slate-700 flex-shrink-0" />;
            bgStyle = 'bg-white border-slate-200 text-slate-800 shadow-lg';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border text-xs ${bgStyle}`}
            >
              <div className="flex items-center space-x-2.5 mr-2">
                {icon}
                <span className="leading-snug font-medium">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
