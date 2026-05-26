import { useEffect, useRef, useState } from "react";

export default function RowActions({ onDetails, onDelete }: {
  onDetails: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function place() {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return;
    const menuW = 180;
    const left = Math.max(8, Math.min(window.innerWidth - menuW - 8, b.right - menuW));
    setPos({ top: b.bottom + 4, left });
  }

  function toggle() {
    if (!open) place();
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onScrollOrResize() { setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title="Actions"
        style={{
          width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb",
          background: open ? "#f3f4f6" : "#fff", cursor: "pointer", color: "#374151",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, lineHeight: 1, padding: 0,
        }}
      >⋯</button>
      {open && pos && (
        <div
          ref={menuRef}
          style={{
            position: "fixed", top: pos.top, left: pos.left, minWidth: 180,
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
            boxShadow: "0 12px 32px rgba(0,0,0,0.18)", padding: 6, zIndex: 1000, textAlign: "left",
          }}
        >
          <MenuRow icon="👁" label="View Details" onClick={() => { setOpen(false); onDetails(); }} />
          <div style={{ height: 1, background: "#f1f2f4", margin: "4px 0" }} />
          <MenuRow icon="🗑" label="Delete Batch" danger onClick={() => { setOpen(false); onDelete(); }} />
        </div>
      )}
    </>
  );
}

function MenuRow({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
        borderRadius: 6, border: "none", background: "transparent", cursor: "pointer",
        width: "100%", textAlign: "left",
        color: danger ? "#dc2626" : "#111", fontSize: 13, fontWeight: 500,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? "#fef2f2" : "#f3f4f6")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ fontSize: 14 }}>{icon}</span> {label}
    </button>
  );
}
