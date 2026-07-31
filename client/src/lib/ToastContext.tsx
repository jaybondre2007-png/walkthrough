import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import clsx from "clsx";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              className={clsx(
                "pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm",
                "animate-[toast-in_0.2s_ease-out]",
                t.kind === "success" &&
                  "border-good/20 bg-white text-neutral-800 dark:border-good/30 dark:bg-neutral-900 dark:text-neutral-100",
                t.kind === "error" &&
                  "border-critical/20 bg-white text-neutral-800 dark:border-critical/30 dark:bg-neutral-900 dark:text-neutral-100",
                t.kind === "info" &&
                  "border-neutral-200 bg-white text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              )}
            >
              <Icon
                className={clsx(
                  "mt-0.5 h-4 w-4 shrink-0",
                  t.kind === "success" && "text-good",
                  t.kind === "error" && "text-critical",
                  t.kind === "info" && "text-brand-500"
                )}
              />
              <p className="flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
