import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type Toast = { id: number; msg: string; kind: "success" | "error" };
const Ctx = createContext<(msg: string, kind?: "success" | "error") => void>(() => {});

export function useToast() { return useContext(Ctx); }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const show = useCallback((msg: string, kind: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg, kind }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3000);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((t) => (
          <div
            key={t.id}
            style={{
              background: t.kind === "success" ? "#1b5e20" : "#dc2626",
              color: "#fff", padding: "12px 18px", borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: 240,
              fontSize: 14, fontWeight: 500,
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
