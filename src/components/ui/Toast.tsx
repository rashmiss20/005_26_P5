import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastCtx {
  push: (type: ToastType, message: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-cardHover animate-slide-up bg-white ${
              t.type === 'success'
                ? 'border-green-200'
                : t.type === 'error'
                ? 'border-red-200'
                : 'border-navy-200'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
            {t.type === 'error' && <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
            {t.type === 'info' && <Info className="h-5 w-5 text-cyan-500 shrink-0" />}
            <p className="text-sm text-navy-800 flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-navy-300 hover:text-navy-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
