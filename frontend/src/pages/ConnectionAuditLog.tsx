import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import Topbar from "../components/Topbar";
import { fmtIST } from "../utils/time";

type AuditRow = {
  id: number | string;
  key_prefix?: string;
  connection_key_prefix?: string;
  submitted_code?: string;
  code?: string;
  result?: string;
  ip_address?: string;
  ip?: string;
  user_agent?: string;
  created_at?: string | null;
  metadata?: string | Record<string, unknown> | null;
};

function listFrom(data: any): any[] {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
}

function errorMessage(error: any, fallback: string): string {
  return error?.response?.data?.detail || error?.response?.data?.message || fallback;
}

function auditMetadata(row: AuditRow): Record<string, any> {
  if (!row.metadata) return {};
  if (typeof row.metadata === "object") return row.metadata;
  try {
    const parsed = JSON.parse(row.metadata);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function ConnectionAuditLog() {
  const { brandId, connectionId } = useParams<{ brandId: string; connectionId: string }>();
  const [connectionName, setConnectionName] = useState("Connection");
  const [brandName, setBrandName] = useState("Brand");
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [result, setResult] = useState("");
  const [code, setCode] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  async function load() {
    if (!brandId || !connectionId) return;
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (result) params.result = result;
      if (code.trim()) params.code = code.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const [connectionResponse, logsResponse] = await Promise.all([
        api.get(`/api/brands/${brandId}/connections/${connectionId}`),
        api.get(`/api/brands/${brandId}/connections/${connectionId}/logs`, { params }),
      ]);
      setConnectionName(connectionResponse.data?.name || `Connection ${connectionId}`);
      setBrandName(connectionResponse.data?.brand_name || `Brand ${brandId}`);
      setRows(listFrom(logsResponse.data));
      setTotal(Number(logsResponse.data?.total || 0));
    } catch (e: any) {
      setError(errorMessage(e, "Could not load the audit log."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [brandId, connectionId, page, search, result, code, dateFrom, dateTo]);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  return (
    <>
      <Topbar />
      <div className="page">
        <Link to={`/brands/${brandId}/connections`} className="back-link">← Back to API connections</Link>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Audit log</h1>
            <p className="page-sub" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              Authenticated verification requests for
              <span className="badge-active">{brandName}</span>
              using
              <span style={{ background: "#eef2ff", color: "#3730a3", padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                {connectionName}
              </span>
            </p>
          </div>
          <span style={{ color: "#6b7280", fontSize: 12 }}>{total} request{total === 1 ? "" : "s"}</span>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: filtersOpen ? 16 : 14, flexWrap: "wrap" }}>
            <div className="search" style={{ maxWidth: 340 }}>
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Search audit log"
                placeholder="Search audit log..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <button
              className="btn-icon"
              title={filtersOpen ? "Hide filters" : "Show filters"}
              aria-label={filtersOpen ? "Hide audit log filters" : "Show audit log filters"}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
              style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 8, color: filtersOpen ? "var(--green)" : "#6b7280", background: filtersOpen ? "var(--green-light)" : "#fff" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z"/>
              </svg>
            </button>
          </div>
          {filtersOpen && (
            <div className="toolbar">
              <div style={{ minWidth: 150 }}>
                <label className="label">Result</label>
                <select className="select" value={result} onChange={(e) => { setResult(e.target.value); setPage(1); }}>
                  <option value="">All results</option>
                  <option value="first">First</option>
                  <option value="repeat">Repeat</option>
                  <option value="invalid">Invalid</option>
                  <option value="error">Request error</option>
                  <option value="rate_limited">Rate limited</option>
                </select>
              </div>
              <div style={{ minWidth: 190 }}>
                <label className="label">Submitted code</label>
                <input className="input" placeholder="Filter by code" value={code} onChange={(e) => { setCode(e.target.value); setPage(1); }} />
              </div>
              <div style={{ minWidth: 145 }}>
                <label className="label">From</label>
                <input className="input" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
              </div>
              <div style={{ minWidth: 145 }}>
                <label className="label">To</label>
                <input className="input" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
              </div>
              <button className="btn-outline" style={{ alignSelf: "flex-end" }} onClick={() => {
                setResult(""); setCode(""); setDateFrom(""); setDateTo(""); setPage(1);
              }}>Clear filters</button>
            </div>
          )}

          {error && <div style={{ color: "#b91c1c", background: "#fef2f2", padding: 12, borderRadius: 6, fontSize: 13, marginBottom: 12 }}>{error} <button className="btn-outline" onClick={load}>Try again</button></div>}
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 940 }}>
              <thead><tr><th>SR NO</th><th>TIMESTAMP</th><th>KEY PREFIX</th><th>SUBMITTED CODE</th><th>RESULT</th><th>SOURCE IP</th><th>USER AGENT</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={7} style={{ padding: 28, textAlign: "center", color: "#6b7280" }}>Loading audit log…</td></tr>}
                {!loading && !rows.length && <tr><td colSpan={7} style={{ padding: 28, textAlign: "center", color: "#9ca3af" }}>No verification requests match your search or filters.</td></tr>}
                {!loading && rows.map((row, index) => {
                  const metadata = auditMetadata(row);
                  const rowResult = row.result || metadata.result || "—";
                  return (
                    <tr key={row.id}>
                      <td>{(page - 1) * pageSize + index + 1}</td>
                      <td>{row.created_at ? fmtIST(row.created_at) : "—"}</td>
                      <td><code style={{ color: "#6b7280", fontSize: 12 }}>{row.key_prefix || row.connection_key_prefix ? `${row.key_prefix || row.connection_key_prefix}…` : "—"}</code></td>
                      <td><code style={{ fontSize: 12 }}>{row.submitted_code || row.code || metadata.code || "—"}</code></td>
                      <td><span className={["invalid", "error", "rate_limited"].includes(String(rowResult)) ? "badge-inactive" : "badge-active"}>{rowResult}</span></td>
                      <td style={{ color: "#6b7280", fontSize: 12 }}>{row.ip_address || row.ip || "—"}</td>
                      <td style={{ color: "#6b7280", fontSize: 12, maxWidth: 320, whiteSpace: "normal" }}>{row.user_agent || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && total > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
              <span style={{ color: "#6b7280", fontSize: 12 }}>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </span>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn-outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
                <span style={{ color: "#6b7280", fontSize: 12 }}>Page {page} of {pages}</span>
                <button className="btn-outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}