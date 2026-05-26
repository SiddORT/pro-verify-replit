import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Topbar from "../components/Topbar";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";

type Batch = {
  id: number;
  batch_number: string;
  file_name: string;
  codes_uploaded: number;
  created_at: string;
  brand_id: number;
  brand_name: string;
  brand_slug: string;
};

const PAGE_SIZE = 15;

export default function BatchUploads() {
  const toast = useToast();
  const [items, setItems] = useState<Batch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [brands, setBrands] = useState<any[]>([]);
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState<Batch | null>(null);

  useEffect(() => {
    api.get("/api/brands").then((r) => setBrands(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params: any = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (searchDebounced) params.search = searchDebounced;
    if (brandFilter) params.brand_id = brandFilter;
    api.get("/api/batches", { params })
      .then((r) => { setItems(r.data.items || []); setTotal(r.data.total || 0); })
      .catch(() => toast("Could not load batches", "error"))
      .finally(() => setLoading(false));
  }, [page, searchDebounced, brandFilter]);

  async function doDelete() {
    if (!confirmDel) return;
    try {
      await api.delete(`/api/batches/${confirmDel.id}`);
      toast(`Deleted batch ${confirmDel.batch_number}`);
      setConfirmDel(null);
      // refresh
      if (items.length === 1 && page > 0) setPage((p) => p - 1);
      else {
        const params: any = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
        if (searchDebounced) params.search = searchDebounced;
        if (brandFilter) params.brand_id = brandFilter;
        const r = await api.get("/api/batches", { params });
        setItems(r.data.items || []); setTotal(r.data.total || 0);
      }
    } catch {
      toast("Delete failed", "error");
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <>
      <Topbar />
      <div className="page" style={{ maxWidth: 1200 }}>
        <Link to="/" className="back-link">← Back to Dashboard</Link>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>Batch Uploads</h1>
            <p className="page-sub" style={{ margin: 0 }}>All upload batches across every brand. Search, filter and manage.</p>
          </div>
          <Link to="/upload" className="btn">+ Upload New Codes</Link>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Toolbar */}
          <div style={{
            padding: 14, borderBottom: "1px solid #f1f2f4",
            display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
          }}>
            <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 420 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 14 }}>🔍</span>
              <input
                className="input"
                placeholder="Search by batch #, file name, or brand…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", paddingLeft: 34 }}
              />
            </div>
            <select
              className="select"
              value={brandFilter}
              onChange={(e) => { setBrandFilter(e.target.value); setPage(0); }}
              style={{ maxWidth: 240 }}
            >
              <option value="">All brands</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {(search || brandFilter) && (
              <button
                type="button"
                className="btn-outline"
                onClick={() => { setSearch(""); setBrandFilter(""); setPage(0); }}
              >Clear</button>
            )}
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {loading ? "Loading…" : total === 0 ? "No batches" : `Showing ${start}–${end} of ${total.toLocaleString()}`}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>Sr No</th>
                  <th>Batch Number</th>
                  <th>Brand</th>
                  <th>File</th>
                  <th style={{ textAlign: "right" }}>Codes</th>
                  <th>Uploaded</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && items.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Loading…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 50, color: "#6b7280" }}>
                    <div style={{ fontSize: 30, marginBottom: 6, opacity: 0.4 }}>📭</div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>No batches found</div>
                    <div style={{ fontSize: 13 }}>
                      {search || brandFilter ? "Try a different search or filter." : <>Get started by <Link to="/upload" style={{ color: "#1b5e20", fontWeight: 600 }}>uploading codes →</Link></>}
                    </div>
                  </td></tr>
                ) : items.map((b, i) => (
                  <tr key={b.id}>
                    <td style={{ color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>{page * PAGE_SIZE + i + 1}</td>
                    <td><span className="code-pill">{b.batch_number}</span></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{b.brand_name}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "ui-monospace, Menlo, monospace" }}>/verify/{b.brand_slug}</div>
                    </td>
                    <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={b.file_name}>
                      {b.file_name}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{b.codes_uploaded.toLocaleString()}</td>
                    <td style={{ color: "#6b7280", fontSize: 13 }}>{fmtDate(b.created_at)}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => setConfirmDel(b)}
                        style={{ color: "#dc2626", borderColor: "#fecaca" }}
                      >Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div style={{
              padding: 14, borderTop: "1px solid #f1f2f4", display: "flex",
              alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
            }}>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Page <b>{page + 1}</b> of <b>{pages}</b>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn-outline" disabled={page === 0} onClick={() => setPage(0)}>« First</button>
                <button className="btn-outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
                <button className="btn-outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next ›</button>
                <button className="btn-outline" disabled={page + 1 >= pages} onClick={() => setPage(pages - 1)}>Last »</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDel}
        title="Delete this batch?"
        message={confirmDel ? `This will permanently delete batch "${confirmDel.batch_number}" and all ${confirmDel.codes_uploaded.toLocaleString()} of its codes. This cannot be undone.` : ""}
        confirmText="Delete Batch"
        danger
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(null)}
      />
    </>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
