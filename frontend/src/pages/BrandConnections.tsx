import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import Topbar from "../components/Topbar";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { fmtIST } from "../utils/time";

type Connection = {
  id: number | string;
  name: string;
  status?: string;
  is_active?: boolean;
  key_prefix?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  rotated_at?: string | null;
  last_used_at?: string | null;
  revoked_at?: string | null;
  expires_at?: string | null;
};

function listFrom(data: any): any[] {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
}

function connectionStatus(connection: Connection): { label: string; active: boolean } {
  const active = connection.is_active !== false && connection.status !== "revoked";
  return { label: active ? "Active" : "Revoked", active };
}

function getNewKey(data: any): string {
  return data?.key || data?.api_key || data?.secret || data?.token || data?.value ||
    data?.connection?.key || data?.connection?.api_key || "";
}

function errorMessage(error: any, fallback: string): string {
  return error?.response?.data?.detail || error?.response?.data?.message || fallback;
}

function displayDate(value?: string | null): string {
  return value ? fmtIST(value) : "—";
}

export default function BrandConnections() {
  const { brandId } = useParams<{ brandId: string }>();
  const toast = useToast();
  const [brand, setBrand] = useState<any | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newKeyFor, setNewKeyFor] = useState("");
  const [confirm, setConfirm] = useState<{ action: "rotate" | "revoke"; connection: Connection } | null>(null);

  async function load() {
    if (!brandId) return;
    setLoading(true);
    setError("");
    try {
      const [brandsResponse, connectionsResponse] = await Promise.all([
        api.get("/api/brands"),
        api.get(`/api/brands/${brandId}/connections`),
      ]);
      const brands = listFrom(brandsResponse.data);
      setBrand(brands.find((item: any) => String(item.id) === String(brandId)) || null);
      setConnections(listFrom(connectionsResponse.data));
    } catch (e: any) {
      setError(errorMessage(e, "Could not load brand connections."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [brandId]);

  async function createConnection(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast("Connection name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const response = await api.post(`/api/brands/${brandId}/connections`, { name: trimmed });
      const key = getNewKey(response.data);
      if (!key) {
        toast("Connection created, but the API key was not returned", "error");
      } else {
        setNewKey(key);
        setNewKeyFor(trimmed);
      }
      setName("");
      toast("Connection created");
      await load();
    } catch (e: any) {
      toast(errorMessage(e, "Could not create connection"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function performAction() {
    if (!confirm) return;
    const { action, connection } = confirm;
    setConfirm(null);
    setSaving(true);
    try {
      const response = await api.post(`/api/brands/${brandId}/connections/${connection.id}/${action}`);
      if (action === "rotate") {
        const key = getNewKey(response.data);
        if (key) {
          setNewKey(key);
          setNewKeyFor(connection.name);
        } else {
          toast("Key rotated, but the new API key was not returned", "error");
        }
        toast("API key rotated");
      } else {
        toast("Connection revoked");
      }
      await load();
    } catch (e: any) {
      toast(errorMessage(e, `Could not ${action} connection`), "error");
    } finally {
      setSaving(false);
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(newKey);
      toast("API key copied to clipboard");
    } catch {
      toast("Could not copy the key. Select it and copy manually.", "error");
    }
  }

  const currentBrandName = brand?.name || `Brand ${brandId || ""}`;

  return (
    <>
      <Topbar />
      <div className="page">
        <Link to="/brands" className="back-link">← Back to Brands</Link>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">API connections</h1>
            <p className="page-sub">Manage named API keys for {currentBrandName}</p>
          </div>
        </div>

        {error && (
          <div className="card" style={{ color: "#b91c1c", background: "#fef2f2", borderColor: "#fecaca", marginBottom: 16 }}>
            {error}{" "}
            <button className="btn-outline" onClick={load} style={{ marginLeft: 8 }}>Try again</button>
          </div>
        )}

        <div className="card" style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>Create a connection</h2>
          <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 16px" }}>
            Give each integration its own key so you can identify and revoke access independently.
          </p>
          <form onSubmit={createConnection} className="row" style={{ alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label className="label" htmlFor="connection-name">Connection name</label>
              <input
                id="connection-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production storefront"
                maxLength={100}
              />
            </div>
            <button className="btn" type="submit" disabled={saving || loading}>{saving ? "Creating…" : "Create API key"}</button>
          </form>
        </div>

        {newKey && (
          <div className="card" style={{ marginBottom: 18, borderColor: "#f59e0b", background: "#fffbeb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, margin: "0 0 6px", color: "#92400e" }}>Save this API key now</h2>
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, color: "#78350f" }}>
                  This is the only time the full key will be shown for <b>{newKeyFor}</b>. Store it in your server-side secret manager.
                </p>
              </div>
              <button className="btn-icon" aria-label="Dismiss API key" onClick={() => { setNewKey(""); setNewKeyFor(""); }}>✕</button>
            </div>
            <div className="row" style={{ marginTop: 14, alignItems: "stretch" }}>
              <code style={{ flex: 1, padding: "11px 12px", background: "#fff", border: "1px solid #fcd34d", borderRadius: 6, overflowWrap: "anywhere", fontSize: 13 }}>{newKey}</code>
              <button className="btn-outline" onClick={copyKey}>Copy key</button>
            </div>
          </div>
        )}

        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>Connections</h2>
              <p style={{ color: "#6b7280", fontSize: 13, margin: "5px 0 0" }}>Keys are never displayed again after creation or rotation.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 820 }}>
              <thead><tr><th>NAME</th><th>STATUS</th><th>KEY</th><th>CREATED</th><th>LAST USED</th><th>ROTATED</th><th>ACTIONS</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>Loading connections…</td></tr>}
                {!loading && !connections.length && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>No API connections yet. Create one above to get started.</td></tr>}
                {!loading && connections.map((connection) => {
                  const status = connectionStatus(connection);
                  return (
                    <tr key={connection.id}>
                      <td style={{ fontWeight: 600 }}>{connection.name}</td>
                      <td>{status.active ? <span className="badge-active">Active</span> : <span className="badge-inactive">Revoked</span>}</td>
                      <td><code style={{ color: "#6b7280", fontSize: 12 }}>{connection.key_prefix || "••••••••"}</code></td>
                      <td>{displayDate(connection.created_at)}</td>
                      <td>{displayDate(connection.last_used_at)}</td>
                      <td>{displayDate(connection.rotated_at || connection.updated_at)}</td>
                      <td>
                        <div className="row" style={{ gap: 4, flexWrap: "nowrap" }}>
                          <Link
                            className="btn-outline"
                            to={`/brands/${brandId}/connections/${connection.id}/audit`}
                            title={`View audit log for ${connection.name}`}
                          >
                            Audit log
                          </Link>
                          {status.active ? (
                            <>
                            <button className="btn-outline" onClick={() => setConfirm({ action: "rotate", connection })} disabled={saving}>Rotate</button>
                            <button className="btn-outline" style={{ color: "#dc2626" }} onClick={() => setConfirm({ action: "revoke", connection })} disabled={saving}>Revoke</button>
                            </>
                          ) : <span style={{ color: "#9ca3af", fontSize: 12 }}>{displayDate(connection.revoked_at)}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>Integration guide</h2>
          <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 18px", lineHeight: 1.5 }}>
            Use a connection key to authenticate server-to-server verification requests for this brand.
          </p>
          <div className="grid-2" style={{ gap: 22 }}>
            <div>
              <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Endpoint and required header</h3>
              <pre style={codeBlock}>{`POST /api/v1/brands/${brand?.slug || "your-brand-slug"}/verify
Content-Type: application/json
X-API-Key: pv_your_connection_key`}</pre>
              <h3 style={{ fontSize: 14, margin: "18px 0 8px" }}>Request example</h3>
              <pre style={codeBlock}>{`curl -X POST https://your-domain.example/api/v1/brands/${brand?.slug || "your-brand-slug"}/verify \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $PROVERIFY_API_KEY" \\
  -d '{"code":"ABC-123"}'`}</pre>
              <h3 style={{ fontSize: 14, margin: "18px 0 8px" }}>Response examples</h3>
              <pre style={codeBlock}>{`// First verification (HTTP 200)
{"status":"first","brand":"${currentBrandName}","code":"ABC-123","verified_at":"2025-01-15T10:00:00Z"}

// Repeat verification (HTTP 200)
{"status":"repeat","brand":"${currentBrandName}","code":"ABC-123","first_verified_at":"2025-01-15T10:00:00Z","current_scan_at":"2025-01-16T09:30:00Z","history":["2025-01-15T10:00:00Z"]}

// Invalid code (HTTP 200)
{"status":"invalid","brand":"${currentBrandName}"}`}</pre>
            </div>
            <div>
              <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Key safety and rotation</h3>
              <ul style={docList}>
                <li>Keep keys on your server only. Never put them in browser code, browser storage, mobile apps, source control, or URLs.</li>
                <li>Use a separate named connection for each environment or integration.</li>
                <li>Rotation immediately invalidates the prior key. Update the secret in your server immediately after rotating, then verify requests with the new key.</li>
                <li>The full key is shown only once. Copy it to a secrets manager immediately.</li>
              </ul>
              <h3 style={{ fontSize: 14, margin: "18px 0 8px" }}>Audit logs</h3>
              <p style={{ color: "#4b5563", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                Each authenticated verification request is recorded newest-first with its connection, submitted code, result (first, repeat, or invalid), source IP, and user agent. Requests rejected before authentication are not attributable to a connection and do not appear in this connection audit log.
              </p>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        open={!!confirm}
        title={confirm?.action === "rotate" ? "Rotate API key?" : "Revoke connection?"}
        message={confirm?.action === "rotate"
          ? `Rotate "${confirm?.connection.name}"? The current key will stop working and a new key will be shown once.`
          : `Revoke "${confirm?.connection.name}"? Any requests using this key will stop working immediately. This cannot be undone.`}
        confirmText={confirm?.action === "rotate" ? "Rotate key" : "Revoke connection"}
        danger={confirm?.action === "revoke"}
        onConfirm={performAction}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

const codeBlock: React.CSSProperties = {
  margin: 0,
  padding: 12,
  overflowX: "auto",
  borderRadius: 6,
  background: "#111827",
  color: "#e5e7eb",
  fontSize: 12,
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
};

const docList: React.CSSProperties = {
  color: "#4b5563",
  fontSize: 13,
  lineHeight: 1.5,
  margin: 0,
  paddingLeft: 20,
};