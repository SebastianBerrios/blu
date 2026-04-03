import { useState, useCallback } from "react";

interface ModalState<T> {
  isOpen: boolean;
  selected: T | undefined;
  openCreate: () => void;
  openEdit: (item: T) => void;
  close: () => void;
}

/**
 * Generic modal state hook that encapsulates the common open/close/select pattern.
 * Use for new code and future migrations — existing pages are NOT migrated to this hook.
 */
export function useModalState<T>(): ModalState<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<T | undefined>();

  const openCreate = useCallback(() => {
    setSelected(undefined);
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setSelected(item);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSelected(undefined);
  }, []);

  return { isOpen, selected, openCreate, openEdit, close };
}
