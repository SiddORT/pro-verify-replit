import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiBase } from "../api";
import Topbar from "../components/Topbar";
import { useToast } from "../components/Toast";

type Report = {
  batch_id: number;
  batch_number: string;
  codes_uploaded: number;
  file_name: string;
  file_size_kb: number;
  brand_name: string;
  brand_slug: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
};

export default function Upload() {
  const toast = useToast();
  const [brands, setBrands] = useState<any[]>([]);
  const [brandId, setBrandId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [report, setReport] = useState<Report | null>(null);
  const fRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/api/brands?active_only=true").then((r) => setBrands(r.data));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setReport(null);
    if (!brandId) return setErr("Please select a brand");
    if (!file) return setErr("Please choose an .xlsx file");
    const brand = brands.find((b) => String(b.id) === brandId);
    setUploading(true);
    const start = Date.now();
    try {
      const fd = new FormData();
      fd.append("brand_id", brandId);
      fd.append("file", file);
      const r = await api.post("/api/codes/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const finished = Date.now();
      setReport({
        batch_id: r.data.batch_id,
        batch_number: r.data.batch_number,
        codes_uploaded: r.data.codes_uploaded,
        file_name: file.name,
        file_size_kb: file.size / 1024,
        brand_name: brand?.name || "—",
        brand_slug: brand?.slug || "",
        started_at: new Date(start).toISOString(),
        finished_at: new Date(finished).toISOString(),
        duration_ms: finished - start,
      });
      toast(`Uploaded ${r.data.codes_uploaded} codes`);
      setFile(null); if (fRef.current) fRef.current.value = "";
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Upload failed";
      setErr(msg); toast(msg, "error");
    } finally { setUploading(false); }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  async function downloadSample() {
    const token = localStorage.getItem("pv_token");
    const res = await fetch(`${apiBase}/api/codes/sample`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sample_codes.xlsx"; a.click();
    URL.revokeObjectURL(url);
  }

  function resetForNext() {
    setReport(null); setErr(""); setBrandId(""); setFile(null);
    if (fRef.current) fRef.current.value = "";
  }

  return (
    <>
      <Topbar />
      <div className="page" style={{ maxWidth: 880 }}>
        <Link to="/" className="back-link">← Back to Dashboard</Link>
        <h1 className="page-title">Upload New Codes</h1>
        <p className="page-sub">Upload an Excel file with codes mapped to a brand</p>

        {report ? (
          <ReportCard report={report} onUploadAnother={resetForNext} />
        ) : (
          <form onSubmit={submit} className="card">
            <h3 style={{ margin: "0 0 18px", fontSize: 16 }}>Code Upload</h3>
            <div style={{ marginBottom: 18 }}>
              <label className="label">Select Brand</label>
              <select className="select" value={brandId} onChange={(e) => setBrandId(e.target.value)} required>
                <option value="">{brands.length ? "Choose a brand..." : "Loading brands..."}</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>
                Only active brands from the Brand Master are shown here.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label className="label" style={{ margin: 0 }}>Upload Excel File (.xlsx)</label>
              <button type="button" className="btn-outline" onClick={downloadSample}>↓ Download Sample</button>
            </div>

            <div
              className={`dropzone ${drag ? "drag" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => fRef.current?.click()}
            >
              <div className="dropzone-icon">⬆</div>
              {file ? (
                <div style={{ marginTop: 10, fontWeight: 600 }}>{file.name} <span style={{ color: "#6b7280", fontWeight: 400 }}>({(file.size / 1024).toFixed(1)} KB)</span></div>
              ) : (
                <>
                  <div style={{ marginTop: 10 }}>Drag & drop your Excel file here, or click to browse</div>
                  <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>Accepts .xlsx files. Must have a "Code" column.</div>
                </>
              )}
              <input ref={fRef} type="file" accept=".xlsx" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>

            {err && (
              <div style={{ marginTop: 14, padding: 10, borderRadius: 6,
                background: "#fee2e2", color: "#991b1b", fontSize: 14 }}>
                {err}
              </div>
            )}

            <div style={{ marginTop: 18 }}>
              <button className="btn" type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload Codes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

function ReportCard({ report, onUploadAnother }: { report: Report; onUploadAnother: () => void }) {
  const toast = useToast();
  const verifyUrl = `${window.location.origin}/verify/${report.brand_slug}`;
  const rate = report.duration_ms > 0 ? Math.round((report.codes_uploaded / (report.duration_ms / 1000))) : 0;
  const isNarrow = typeof window !== "undefined" && window.innerWidth < 640;

  async function copyLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(verifyUrl);
      } else {
        const ta = document.createElement("textarea");
        ta.value = verifyUrl; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
      }
      toast("Link copied to clipboard");
    } catch {
      toast("Couldn't copy — please copy manually", "error");
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Success header */}
      <div style={{
        background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)",
        color: "#fff", padding: "26px 28px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.18)",
                        display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.3)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Upload Successful</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
              {report.codes_uploaded.toLocaleString()} codes registered for {report.brand_name}
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          <Metric label="Codes Uploaded" value={report.codes_uploaded.toLocaleString()} accent="#1b5e20" />
          <Metric label="Processing Time" value={fmtDuration(report.duration_ms)} />
          <Metric label="Throughput" value={`${rate.toLocaleString()}/s`} />
          <Metric label="File Size" value={`${report.file_size_kb < 1024 ? report.file_size_kb.toFixed(1) + " KB" : (report.file_size_kb / 1024).toFixed(2) + " MB"}`} />
        </div>

        {/* Detail rows */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <Row k="Batch Number" v={<span className="code-pill">{report.batch_number}</span>} />
          <Row k="Brand" v={<b>{report.brand_name}</b>} />
          <Row k="Source File" v={report.file_name} mono />
          <Row k="Started" v={new Date(report.started_at).toLocaleString()} />
          <Row k="Finished" v={new Date(report.finished_at).toLocaleString()} last />
        </div>

        {/* Verify link callout */}
        <div style={{
          marginTop: 18, padding: 16, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10,
          display: "flex", alignItems: isNarrow ? "stretch" : "center", gap: 14,
          flexDirection: isNarrow ? "column" : "row",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", letterSpacing: "0.05em", textTransform: "uppercase" }}>Public Verification Link</div>
            <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, color: "#1b5e20", marginTop: 4, wordBreak: "break-all" }}>{verifyUrl}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-outline" onClick={copyLink}>Copy</button>
            <a className="btn" href={verifyUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>Open ↗</a>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
          <Link to="/" className="btn-outline">Back to Dashboard</Link>
          <button className="btn" onClick={onUploadAnother}>Upload Another File</button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, background: "#fafafa" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || "#111", letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.06em", marginTop: 6, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function Row({ k, v, mono, last }: { k: string; v: any; mono?: boolean; last?: boolean }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "180px 1fr", padding: "12px 16px",
      borderBottom: last ? 0 : "1px solid #f1f2f4", fontSize: 14, alignItems: "center",
    }}>
      <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{k}</div>
      <div style={{ fontFamily: mono ? "ui-monospace, Menlo, monospace" : undefined, color: "#111" }}>{v}</div>
    </div>
  );
}

function fmtDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 2 : 1)} s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s - m * 60)}s`;
}
