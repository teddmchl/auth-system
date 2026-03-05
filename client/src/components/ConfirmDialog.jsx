export default function ConfirmDialog({ open, title, message, confirmText, cancelText, onConfirm, onCancel, danger }) {
    if (!open) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 className="modal-title">{title}</h3>
                <p className="modal-message">{message}</p>
                <div className="modal-actions">
                    <button onClick={onCancel} className="btn-secondary">
                        {cancelText || "Cancel"}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={danger ? "btn-danger" : "btn-primary"}
                    >
                        {confirmText || "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
}
