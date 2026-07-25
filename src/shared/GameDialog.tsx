import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface GameDialogProps {
  children: ReactNode;
  id: string;
  onClose(): void;
  open: boolean;
  title: string;
}

export function GameDialog({ children, id, onClose, open, title }: GameDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      className="game-dialog"
      id={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      ref={ref}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button
          className="dialog-close"
          aria-label={`Close ${title}`}
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
