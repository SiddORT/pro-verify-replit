import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import Topbar from "../components/Topbar";
import { useToast } from "../components/Toast";

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
                    </tr>
                  </thead>
                  <tbody>
                    {codesLoading && codes.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: 36, color: "#9ca3af" }}>Loading…</td></tr>
                    ) : codes.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
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
    </>
  );
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

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fmtRel(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const dys = Math.floor(h / 24); if (dys < 30) return `${dys}d ago`;
  const mo = Math.floor(dys / 30); if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
function pct(part: number, whole: number) {
  if (!whole) return "0% verified";
  return `${Math.round((part / whole) * 1000) / 10}% verified`;
}
