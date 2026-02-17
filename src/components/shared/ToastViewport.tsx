import React, { useEffect, useState } from 'react';
import toastService, { ToastMessage } from '../../services/toastService';

const kindClass: Record<ToastMessage['kind'], string> = {
  info: 'border-slate-500 bg-slate-800/95 text-slate-100',
  success: 'border-green-500 bg-green-900/90 text-green-100',
  warning: 'border-yellow-500 bg-yellow-900/90 text-yellow-100',
  error: 'border-red-500 bg-red-900/90 text-red-100',
};

const ToastViewport: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsub = toastService.subscribe((toast) => {
      setToasts((prev) => [...prev, toast]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.durationMs);
    });

    return () => {
      unsub();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[210000] w-full max-w-md px-4 space-y-2" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg border px-4 py-3 shadow-lg backdrop-blur ${kindClass[toast.kind]}`}
        >
          <p className="text-sm font-medium">{toast.text}</p>
        </div>
      ))}
    </div>
  );
};

export default ToastViewport;
