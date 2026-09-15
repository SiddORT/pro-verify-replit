import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  const navigate = useNavigate();
  const toast = useToast();
  const [brand, setBrand] = useState<any | null>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [name, setName] = useState("");
  const [createBrandId, setCreateBrandId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newKeyFor, setNewKeyFor] = useState("");
  const [confirm, setConfirm] = useState<{ action: "rotate" | "revoke"; connection: Connection } | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

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
      setBrands(brands);
      setBrand(brands.find((item: any) => String(item.id) === String(brandId)) || null);
      setConnections(listFrom(connectionsResponse.data));
    } catch (e: any) {
      setError(errorMessage(e, "Could not load brand connections."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSearch("");
    setPage(1);
    load();
  }, [brandId]);

  function openCreate() {
    setName("");
    setCreateBrandId(brandId || "");
    setShowCreate(true);
  }

  async function createConnection(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast("Connection name is required", "error");
      return;
    }
    setSaving(true);
    try {
      if (!createBrandId) {
        toast("Select a brand", "error");
        return;
      }
      const response = await api.post(`/api/brands/${createBrandId}/connections`, { name: trimmed });
      const key = getNewKey(response.data);
      if (!key) {
        toast("Connection created, but the API key was not returned", "error");
      } else {
        setNewKey(key);
        setNewKeyFor(trimmed);
      }
      setName("");
      setShowCreate(false);
      toast("Connection created");
      if (String(createBrandId) !== String(brandId)) {
        navigate(`/brands/${createBrandId}/connections`);
      } else {
        await load();
      }
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
  const filteredConnections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return connections;
    return connections.filter((connection) => {
      const status = connectionStatus(connection).label;
      return [connection.name, connection.key_prefix, status]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [connections, search]);
  const totalPages = Math.max(1, Math.ceil(filteredConnections.length / pageSize));
  const visibleConnections = filteredConnections.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
          <div className="row" style={{ gap: 10 }}>
            <Link className="btn-outline" to={`/brands/${brandId}/connections/guide`}>Integration guide</Link>
            <button className="btn" onClick={openCreate}>Create connection</button>
          </div>
        </div>

        {error && (
          <div className="card" style={{ color: "#b91c1c", background: "#fef2f2", borderColor: "#fecaca", marginBottom: 16 }}>
            {error}{" "}
            <button className="btn-outline" onClick={load} style={{ marginLeft: 8 }}>Try again</button>
          </div>
        )}

        <div style={{ maxWidth: 320, marginBottom: 18 }}>
          <label className="label" htmlFor="brand-filter">
            Brand <span style={{ color: "#9ca3af", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(select a brand to change connections)</span>
          </label>
          <select
            id="brand-filter"
            className="select"
            value={brandId || ""}
            onChange={(e) => navigate(`/brands/${e.target.value}/connections`)}
            disabled={loading}
          >
            {brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>Connections</h2>
              <p style={{ color: "#6b7280", fontSize: 13, margin: "5px 0 0" }}>Keys are never displayed again after creation or rotation.</p>
            </div>
            <div className="search" style={{ maxWidth: 280 }}>
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Search connections"
                placeholder="Search connections..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 880 }}>
              <thead><tr><th>SR NO</th><th>NAME</th><th>STATUS</th><th>KEY</th><th>CREATED</th><th>LAST USED</th><th>ROTATED</th><th>ACTIONS</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>Loading connections…</td></tr>}
                {!loading && !filteredConnections.length && <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>{search ? "No connections match your search." : "No API connections yet. Create one above to get started."}</td></tr>}
                {!loading && visibleConnections.map((connection, index) => {
                  const status = connectionStatus(connection);
                  return (
                    <tr key={connection.id}>
                      <td>{(page - 1) * pageSize + index + 1}</td>
                      <td style={{ fontWeight: 600 }}>{connection.name}</td>
                      <td>{status.active ? <span className="badge-active">Active</span> : <span className="badge-inactive">Revoked</span>}</td>
                      <td><code style={{ color: "#6b7280", fontSize: 12 }}>{connection.key_prefix || "••••••••"}</code></td>
                      <td>{displayDate(connection.created_at)}</td>
                      <td>{displayDate(connection.last_used_at)}</td>
                      <td>{displayDate(connection.rotated_at || connection.updated_at)}</td>
                      <td>
                        <div className="row" style={{ gap: 4, flexWrap: "nowrap" }}>
                          <Link
                            className="btn-icon"
                            to={`/brands/${brandId}/connections/${connection.id}/audit`}
                            title={`View audit log for ${connection.name}`}
                            aria-label={`View audit log for ${connection.name}`}
                            style={{ display: "inline-flex", alignItems: "center", padding: 4, color: "#1b5e20" }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M3 3v18h18"/>
                              <path d="m7 16 4-4 3 3 5-6"/>
                            </svg>
                          </Link>
                          {status.active ? (
                            <>
                              <button
                                className="btn-icon"
                                title={`Rotate API key for ${connection.name}`}
                                aria-label={`Rotate API key for ${connection.name}`}
                                onClick={() => setConfirm({ action: "rotate", connection })}
                                disabled={saving}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5"/>
                                  <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5"/>
                                </svg>
                              </button>
                              <button
                                className="btn-icon"
                                title={`Revoke ${connection.name}`}
                                aria-label={`Revoke ${connection.name}`}
                                style={{ color: "#dc2626" }}
                                onClick={() => setConfirm({ action: "revoke", connection })}
                                disabled={saving}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <circle cx="12" cy="12" r="9"/>
                                  <path d="m8 8 8 8M16 8l-8 8"/>
                                </svg>
                              </button>
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
          {!loading && filteredConnections.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
              <span style={{ color: "#6b7280", fontSize: 12 }}>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredConnections.length)} of {filteredConnections.length}
              </span>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn-outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
                <span style={{ color: "#6b7280", fontSize: 12 }}>Page {page} of {totalPages}</span>
                <button className="btn-outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
              </div>
            </div>
          )}
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
      {showCreate && (
        <div
          onClick={() => !saving && setShowCreate(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998, padding: 16 }}
        >
          <form
            onSubmit={createConnection}
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 10, padding: 24, width: "min(460px, 100%)", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
          >
            <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>Create connection</h2>
            <p style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.5, margin: "0 0 20px" }}>
              Give each integration its own API key so access can be tracked and revoked independently.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label className="label" htmlFor="create-brand">Brand</label>
              <select id="create-brand" className="select" value={createBrandId} onChange={(e) => setCreateBrandId(e.target.value)} required>
                <option value="">Select a brand</option>
                {brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 22 }}>
              <label className="label" htmlFor="connection-name">Connection name</label>
              <input
                id="connection-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production storefront"
                maxLength={100}
                autoFocus
                required
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="btn-outline" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button>
              <button className="btn" type="submit" disabled={saving}>{saving ? "Creating…" : "Create API key"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
