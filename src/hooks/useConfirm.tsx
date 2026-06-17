"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import ConfirmDialog, {
  type ConfirmVariant,
} from "@/components/ui/ConfirmDialog";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  /**
   * Acción async opcional. Si se provee, el diálogo permanece abierto con el
   * botón "Confirmar" en estado de carga mientras corre; al terminar cierra y
   * `confirm()` resuelve `true`. Si lanza, el diálogo se cierra y `confirm()`
   * re-lanza el error para que el `try/catch` del caller lo maneje.
   */
  onConfirm?: () => Promise<void>;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface DialogState extends ConfirmOptions {
  isOpen: boolean;
}

const DEFAULT_STATE: DialogState = {
  isOpen: false,
  title: "",
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>(DEFAULT_STATE);
  const [isConfirming, setIsConfirming] = useState(false);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const rejecterRef = useRef<((reason: unknown) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve, reject) => {
      resolverRef.current = resolve;
      rejecterRef.current = reject;
      setState({ ...options, isOpen: true });
    });
  }, []);

  const close = useCallback(() => {
    resolverRef.current = null;
    rejecterRef.current = null;
    setIsConfirming(false);
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleCancel = useCallback(() => {
    if (isConfirming) return;
    resolverRef.current?.(false);
    close();
  }, [isConfirming, close]);

  const handleConfirm = useCallback(async () => {
    const action = state.onConfirm;
    if (!action) {
      resolverRef.current?.(true);
      close();
      return;
    }
    setIsConfirming(true);
    try {
      await action();
      resolverRef.current?.(true);
      close();
    } catch (err) {
      rejecterRef.current?.(err);
      close();
    }
  }, [state.onConfirm, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={state.isOpen}
        title={state.title}
        description={state.description}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        variant={state.variant}
        isConfirming={isConfirming}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
}
