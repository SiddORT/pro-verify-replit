import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import Topbar from "../components/Topbar";
import { useToast } from "../components/Toast";
import { fmtIST, fmtISTLong, fmtRel } from "../utils/time";

type Batch = {
  id: number;
  batch_number: string;
  file_name: string;
  codes_uploaded: number;
  created_at: string;
  brand_name: string;
  brand_slug: string;
  total_verifications: number;
  codes_verified: number;
  last_verified_at: string | null;
};

type Code = {
  id: number;
  code: string;
  created_at: string;
  verification_count: number;
  last_verified_at: string | null;
};

type LogEntry = {
  id: number;
  is_valid: boolean;
  created_at: string;
  ip: string | null;
  user_agent: string | null;
};

const PAGE_SIZE = 20;

export default function BatchDetails() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [codes, setCodes] = useState<Code[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [codesLoading, setCodesLoading] = useState(false);
  const [logsFor, setLogsFor] = useState<Code | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true); setLoadError("");
    api.get(`/api/batches/${id}`)
      .then((r) => setBatch(r.data))
      .catch((e) => {
        const msg = e?.response?.status === 404 ? "This batch does not exist or was deleted." : "Could not load batch.";
        setLoadError(msg); toast(msg, "error");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!id) return;
    setCodesLoading(true);
    const params: any = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (searchDebounced) params.search = searchDebounced;
    if (verifiedOnly) params.verified_only = true;
    api.get(`/api/batches/${id}/codes`, { params })
      .then((r) => { setCodes(r.data.items || []); setTotal(r.data.total || 0); })
      .catch(() => toast("Could not load codes", "error"))
      .finally(() => setCodesLoading(false));
  }, [id, page, searchDebounced, verifiedOnly]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <>
      <Topbar />
      <div className="page" style={{ maxWidth: 1200 }}>
        <Link to="/batches" className="back-link">← Back to Batch Uploads</Link>

        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading…</div>
        ) : !batch ? (
          <div className="card" style={{ padding: 36, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>⚠</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Batch unavailable</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>{loadError || "Could not load this batch."}</div>
            <Link to="/batches" className="btn">← Back to Batch Uploads</Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 14 }}>
              <div>
                <h1 className="page-title" style={{ marginBottom: 6 }}>
                  Batch <span style={{ color: "#1b5e20" }}>{batch.batch_number}</span>
                </h1>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "#6b7280" }}>
                  <span><b style={{ color: "#111" }}>{batch.brand_name}</b> • /verify/{batch.brand_slug}</span>
                  <span>📄 {batch.file_name}</span>
                  <span>🕒 {fmtDate(batch.created_at)}</span>
                </div>
              </div>
              <Link to={`/verify/${batch.brand_slug}`} target="_blank" className="btn-outline">
                Open Verify Page ↗
              </Link>
            </div>

            {/* Stat tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
              <StatTile label="Codes Uploaded" value={batch.codes_uploaded.toLocaleString()} accent="#1b5e20" />
              <StatTile label="Codes Verified" value={batch.codes_verified.toLocaleString()}
                        sub={pct(batch.codes_verified, batch.codes_uploaded)} accent="#1b5e20" />
              <StatTile label="Total Verifications" value={batch.total_verifications.toLocaleString()} />
              <StatTile label="Last Verified" value={batch.last_verified_at ? fmtRel(batch.last_verified_at) : "Never"}
                        sub={batch.last_verified_at ? fmtDate(batch.last_verified_at) : undefined} />
            </div>

            {/* Codes table card */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f2f4", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>Codes in this batch</h3>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  {codesLoading ? "Loading…" : total === 0 ? "No codes" : `Showing ${start}–${end} of ${total.toLocaleString()}`}
                </div>
              </div>

              {/* Toolbar */}
              <div style={{ padding: 14, borderBottom: "1px solid #f1f2f4", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 420 }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 14 }}>🔍</span>
                  <input
                    className="input"
                    placeholder="Search code…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: "100%", paddingLeft: 34 }}
                  />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => { setVerifiedOnly(e.target.checked); setPage(0); }}
                  />
                  Verified only
                </label>
                {(search || verifiedOnly) && (
                  <button type="button" className="btn-outline"
                          onClick={() => { setSearch(""); setVerifiedOnly(false); setPage(0); }}>Clear</button>
                )}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ minWidth: 720 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 56 }}>Sr No</th>
                      <th>Code</th>
                      <th style={{ textAlign: "right" }}>Verifications</th>
                      <th>Last Verified</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Logs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codesLoading && codes.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: "center", padding: 36, color: "#9ca3af" }}>Loading…</td></tr>
                    ) : codes.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                        <div style={{ fontSize: 26, opacity: 0.4, marginBottom: 6 }}>🔍</div>
                        {search || verifiedOnly ? "No codes match these filters." : "This batch has no codes."}
                      </td></tr>
                    ) : codes.map((c, i) => (
                      <tr key={c.id}>
                        <td style={{ color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>{page * PAGE_SIZE + i + 1}</td>
                        <td><span className="code-pill">{c.code}</span></td>
                        <td style={{ textAlign: "right", fontWeight: 600,
                                     color: c.verification_count > 0 ? "#1b5e20" : "#9ca3af",
                                     fontVariantNumeric: "tabular-nums" }}>
                          {c.verification_count.toLocaleString()}
                        </td>
                        <td style={{ color: "#374151", fontSize: 13 }}>
                          {c.last_verified_at ? (
                            <>
                              <div>{fmtDate(c.last_verified_at)}</div>
                              <div style={{ fontSize: 11, color: "#6b7280" }}>{fmtRel(c.last_verified_at)}</div>
                            </>
                          ) : <span style={{ color: "#9ca3af" }}>—</span>}
                        </td>
                        <td>
                          {c.verification_count > 0
                            ? <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>Verified</span>
                            : <span style={{ background: "#f3f4f6", color: "#6b7280", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>Pending</span>}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => setLogsFor(c)}
                            disabled={c.verification_count === 0}
                            title={c.verification_count === 0 ? "No verifications yet" : "View verification logs"}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                              border: "1px solid " + (c.verification_count > 0 ? "#1b5e20" : "#e5e7eb"),
                              background: c.verification_count > 0 ? "#fff" : "#f9fafb",
                              color: c.verification_count > 0 ? "#1b5e20" : "#9ca3af",
                              cursor: c.verification_count > 0 ? "pointer" : "not-allowed",
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z"/>
                            </svg>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {total > PAGE_SIZE && (
                <div style={{ padding: 14, borderTop: "1px solid #f1f2f4", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>Page <b>{page + 1}</b> of <b>{pages}</b></div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-outline" disabled={page === 0} onClick={() => setPage(0)}>« First</button>
                    <button className="btn-outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
                    <button className="btn-outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next ›</button>
                    <button className="btn-outline" disabled={page + 1 >= pages} onClick={() => setPage(pages - 1)}>Last »</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {logsFor && (
        <LogsModal
          code={logsFor}
          onClose={() => setLogsFor(null)}
        />
      )}
    </>
  );
}

const LOG_PAGE_SIZE = 15;

function LogsModal({ code, onClose }: { code: Code; onClose: () => void }) {
  const toast = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [validFilter, setValidFilter] = useState<"all" | "true" | "false">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params: any = { limit: LOG_PAGE_SIZE, offset: page * LOG_PAGE_SIZE };
    if (searchDebounced) params.search = searchDebounced;
    if (validFilter !== "all") params.valid = validFilter;
    api.get(`/api/codes/${code.id}/logs`, { params })
      .then((r) => { setLogs(r.data.items || []); setTotal(r.data.total || 0); })
      .catch(() => { toast("Could not load logs", "error"); setLogs([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [code.id, page, searchDebounced, validFilter, toast]);

  const pages = Math.max(1, Math.ceil(total / LOG_PAGE_SIZE));
  const start = total === 0 ? 0 : page * LOG_PAGE_SIZE + 1;
  const end = Math.min(total, (page + 1) * LOG_PAGE_SIZE);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 12, width: "100%", maxWidth: 820,
          maxHeight: "85vh", display: "flex", flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f2f4", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Verification Logs</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="code-pill">{code.code}</span>
              <span style={{ color: "#6b7280", fontSize: 13, fontWeight: 400 }}>
                · {code.verification_count.toLocaleString()} valid scan{code.verification_count === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 18, color: "#6b7280" }}
            title="Close"
          >×</button>
        </div>

        {/* Toolbar */}
        <div style={{ padding: 14, borderBottom: "1px solid #f1f2f4", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 13 }}>🔍</span>
            <input
              className="input"
              placeholder="Search IP or device…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", paddingLeft: 32 }}
            />
          </div>
          <select
            className="input"
            value={validFilter}
            onChange={(e) => { setValidFilter(e.target.value as any); setPage(0); }}
            style={{ width: "auto", minWidth: 130 }}
          >
            <option value="all">All results</option>
            <option value="true">Valid only</option>
            <option value="false">Invalid only</option>
          </select>
          {(search || validFilter !== "all") && (
            <button type="button" className="btn-outline"
                    onClick={() => { setSearch(""); setValidFilter("all"); setPage(0); }}>Clear</button>
          )}
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
            {loading ? "Loading…" : total === 0 ? "No matches" : `Showing ${start}–${end} of ${total.toLocaleString()}`}
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && logs.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading logs…</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
              <div style={{ fontSize: 28, opacity: 0.4, marginBottom: 8 }}>📋</div>
              {search || validFilter !== "all" ? "No logs match these filters." : "No verification logs found for this code."}
            </div>
          ) : (
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>#</th>
                  <th>When (IST)</th>
                  <th>Result</th>
                  <th>IP Address</th>
                  <th>Device / User Agent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={l.id}>
                    <td style={{ color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>{page * LOG_PAGE_SIZE + i + 1}</td>
                    <td style={{ fontSize: 13 }}>
                      <div>{fmtISTLong(l.created_at)}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{fmtRel(l.created_at)}</div>
                    </td>
                    <td>
                      {l.is_valid
                        ? <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>✓ Valid</span>
                        : <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>✕ Invalid</span>}
                    </td>
                    <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#374151" }}>
                      {l.ip || <span style={{ color: "#9ca3af" }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12, color: "#6b7280", maxWidth: 280, wordBreak: "break-word" }}>
                      {l.user_agent ? shortUA(l.user_agent) : <span style={{ color: "#9ca3af" }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f2f4", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {total > 0 && <>Page <b>{page + 1}</b> of <b>{pages}</b></>}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {total > LOG_PAGE_SIZE && (
              <>
                <button className="btn-outline" disabled={page === 0} onClick={() => setPage(0)}>« First</button>
                <button className="btn-outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
                <button className="btn-outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next ›</button>
                <button className="btn-outline" disabled={page + 1 >= pages} onClick={() => setPage(pages - 1)}>Last »</button>
              </>
            )}
            <button type="button" className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function shortUA(ua: string): string {
  let device = "Unknown";
  if (/iPhone|iPad/i.test(ua)) device = "iOS";
  else if (/Android/i.test(ua)) device = "Android";
  else if (/Windows/i.test(ua)) device = "Windows";
  else if (/Macintosh|Mac OS/i.test(ua)) device = "macOS";
  else if (/Linux/i.test(ua)) device = "Linux";

  let browser = "";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  const label = [device, browser].filter(Boolean).join(" · ");
  return label ? `${label} — ${ua.slice(0, 60)}${ua.length > 60 ? "…" : ""}` : ua;
}

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || "#111", marginTop: 6, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const fmtDate = fmtIST;

function pct(part: number, whole: number) {
  if (!whole) return "0% verified";
  return `${Math.round((part / whole) * 1000) / 10}% verified`;
}
