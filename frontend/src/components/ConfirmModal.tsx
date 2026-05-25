type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
};

export default function ConfirmModal({ open, title, message, confirmText = "Confirm", onConfirm, onCancel, danger }: Props) {
  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 10, padding: 24, width: 420,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        <h3 style={{ margin: "0 0 10px", fontSize: 18 }}>{title}</h3>
        <p style={{ margin: "0 0 22px", color: "#4b5563", fontSize: 14, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn-outline" onClick={onCancel}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              background: danger ? "#dc2626" : "#1b5e20", color: "#fff",
              border: 0, padding: "10px 18px", borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
