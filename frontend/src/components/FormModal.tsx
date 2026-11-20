import { createContext, useContext, useRef, type ReactNode } from 'react';
import { Button, Modal, type ButtonProps, type ModalProps } from '@mantine/core';
import { confirmDiscard } from '../feedback';

type FormModalContext = {
  /** Closes through the unsaved-changes check. */
  requestClose: () => void;
  setDirtyCheck: (check: () => boolean) => void;
};

const Ctx = createContext<FormModalContext | null>(null);

/**
 * A Modal that never throws typed data away silently. Click outside, Esc, the
 * header × and Cancel all go through `requestClose`; a successful save calls
 * the plain `onClose`, which skips the question.
 *
 * The form lives in a child that knows its own state, so it reports "am I
 * dirty?" with `useDirtyGuard` instead of the parent lifting the form up. A
 * parent that owns the form itself can pass `isDirty` directly.
 */
export function FormModal({
  onClose,
  isDirty,
  onDiscard,
  children,
  ...props
}: Omit<ModalProps, 'children'> & {
  isDirty?: () => boolean;
  /** Runs when the person confirms discarding, e.g. to reset a form that stays mounted. */
  onDiscard?: () => void;
  children: ReactNode;
}) {
  const childCheck = useRef<() => boolean>(() => false);
  const latest = useRef({ onClose, isDirty, onDiscard });
  latest.current = { onClose, isDirty, onDiscard };

  const ctx = useRef<FormModalContext>({
    requestClose: () => {
      const { onClose, isDirty, onDiscard } = latest.current;
      if (isDirty?.() || childCheck.current()) {
        confirmDiscard(() => {
          onDiscard?.();
          onClose();
        });
      } else {
        onClose();
      }
    },
    setDirtyCheck: (check) => {
      childCheck.current = check;
    },
  });

  return (
    <Modal {...props} onClose={ctx.current.requestClose}>
      <Ctx.Provider value={ctx.current}>{children}</Ctx.Provider>
    </Modal>
  );
}

function useFormModal() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('Must be used inside a FormModal.');
  return ctx;
}

/** Called by the form inside a FormModal; returns the close that asks first. */
export function useDirtyGuard(isDirty: () => boolean) {
  const ctx = useFormModal();
  ctx.setDirtyCheck(isDirty);
  return ctx.requestClose;
}

/** The Cancel button of a form modal: same check as clicking outside. */
export function FormCancelButton(props: ButtonProps & { onClick?: never }) {
  const { requestClose } = useFormModal();
  return (
    <Button variant="default" {...props} onClick={requestClose}>
      {props.children ?? 'Cancelar'}
    </Button>
  );
}
