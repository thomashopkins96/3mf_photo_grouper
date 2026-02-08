interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <h2>{title}</h2>
        <p className="dialog-subtitle">{message}</p>
        <div className="dialog-action">
          <button type="button" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button
            type="button"
            className="dialog-delete"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
