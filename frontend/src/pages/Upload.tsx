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

  const selectedBrand = brands.find((b) => String(b.id) === brandId);
  const step = report ? 3 : file && brandId ? 2 : brandId ? 1 : 0;

  return (
    <>
      <Topbar />
      <div className="page" style={{ maxWidth: 1080 }}>
        <Link to="/" className="back-link">← Back to Dashboard</Link>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>Upload New Codes</h1>
            <p className="page-sub" style={{ margin: 0 }}>Upload an Excel file with codes mapped to a brand</p>
          </div>
          <Stepper step={step} />
        </div>

        {report ? (
          <ReportCard report={report} onUploadAnother={resetForNext} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 20, alignItems: "start" }}>
            <form onSubmit={submit} className="card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Section 1: Brand */}
              <Section n={1} title="Select Brand" sub="Pick the brand these codes belong to" done={!!brandId}>
                <select
                  className="select"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  required
                  style={{ maxWidth: 420 }}
                >
                  <option value="">{brands.length ? "Choose a brand..." : "Loading brands..."}</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {selectedBrand && (
                  <div style={{
                    marginTop: 14, padding: 12, background: "#f9fafb", border: "1px solid #e5e7eb",
                    borderRadius: 8, display: "flex", alignItems: "center", gap: 12,
                  }}>
                    {selectedBrand.desktop_image
                      ? <img src={selectedBrand.desktop_image} className="brand-thumb" alt="" />
                      : <div className="brand-thumb" style={{ background: selectedBrand.primary_color }} />}
                    <div>
                      <div style={{ fontWeight: 600 }}>{selectedBrand.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "ui-monospace, Menlo, monospace" }}>
                        /verify/{selectedBrand.slug}
                      </div>
                    </div>
                    <div style={{ flex: 1 }} />
                    <span className="badge-active">Active</span>
                  </div>
                )}
                {!brands.length && (
                  <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
                    No active brands found. <Link to="/brands" style={{ color: "#1b5e20", fontWeight: 600 }}>Create one →</Link>
                  </div>
                )}
              </Section>

              {/* Section 2: File */}
              <Section n={2} title="Upload Excel File" sub="Drop your .xlsx file or browse to select" done={!!file}>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                  <button type="button" className="btn-outline" onClick={downloadSample}>
                    <span style={{ marginRight: 6 }}>↓</span> Download Sample
                  </button>
                </div>
                {file ? (
                  <div style={{
                    border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 10,
                    padding: 16, display: "flex", alignItems: "center", gap: 14,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 8, background: "#1b5e20", color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                    }}>XLSX</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#166534", marginTop: 2 }}>
                        {(file.size / 1024).toFixed(1)} KB • Ready to upload
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => { setFile(null); if (fRef.current) fRef.current.value = ""; }}
                      style={{ color: "#dc2626" }}
                    >
                      Remove
                    </button>
                    <button type="button" className="btn-outline" onClick={() => fRef.current?.click()}>Replace</button>
                  </div>
                ) : (
                  <div
                    className={`dropzone ${drag ? "drag" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={onDrop}
                    onClick={() => fRef.current?.click()}
                    style={{ padding: "44px 24px" }}
                  >
                    <div style={{
                      width: 56, height: 56, borderRadius: "50%", background: "#e8f3ea",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
                    }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1b5e20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>
                      Drop your Excel file here, or <span style={{ color: "#1b5e20", textDecoration: "underline" }}>browse</span>
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 6 }}>
                      .xlsx files only • Must contain a "Code" column
                    </div>
                  </div>
                )}
                <input ref={fRef} type="file" accept=".xlsx" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </Section>

              {/* Footer / Submit */}
              <div style={{
                padding: "18px 24px", borderTop: "1px solid #e5e7eb", background: "#fafafa",
                display: "flex", alignItems: "center", gap: 14, justifyContent: "space-between",
              }}>
                {err ? (
                  <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 500 }}>⚠ {err}</div>
                ) : (
                  <div style={{ color: "#6b7280", fontSize: 13 }}>
                    {brandId && file
                      ? <>Ready to upload <b>{file.name}</b> to <b>{selectedBrand?.name}</b></>
                      : "Complete both steps to enable upload"}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <Link to="/" className="btn-outline">Cancel</Link>
                  <button
                    className="btn"
                    type="submit"
                    disabled={uploading || !brandId || !file}
                    style={{ opacity: !brandId || !file ? 0.55 : 1, cursor: !brandId || !file ? "not-allowed" : "pointer" }}
                  >
                    {uploading ? "Uploading..." : "Upload Codes →"}
                  </button>
                </div>
              </div>
            </form>

            {/* Sidebar: tips */}
            <aside style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 20 }}>
              <div className="card" style={{ padding: 18 }}>
                <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>File Requirements</h4>
                <Tip ok text='Excel format (.xlsx)' />
                <Tip ok text='Header row with a "Code" column' />
                <Tip ok text="One code per row, in the Code column" />
                <Tip ok text="Supports lakhs of codes per file" />
                <button type="button" className="btn-outline" onClick={downloadSample} style={{ width: "100%", marginTop: 12 }}>
                  ↓ Download Sample File
                </button>
              </div>
              <div className="card" style={{ padding: 18, background: "linear-gradient(135deg, #e8f3ea 0%, #f0fdf4 100%)", border: "1px solid #bbf7d0" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#1b5e20" }}>What happens next?</h4>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#166534", lineHeight: 1.7 }}>
                  <li>Codes are validated and stored</li>
                  <li>A batch number is auto-generated</li>
                  <li>Codes become active for verification</li>
                  <li>You'll see a full upload report</li>
                </ol>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = ["Select Brand", "Choose File", "Upload"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {steps.map((s, i) => {
        const done = i < step;
        const active = i === step;
        const bg = done ? "#1b5e20" : active ? "#fff" : "#f3f4f6";
        const color = done ? "#fff" : active ? "#1b5e20" : "#9ca3af";
        const border = done ? "#1b5e20" : active ? "#1b5e20" : "#e5e7eb";
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%", background: bg, color, border: `1.5px solid ${border}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
            }}>
              {done ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 12, color: active ? "#111" : "#6b7280", fontWeight: active ? 700 : 500 }}>{s}</span>
            {i < steps.length - 1 && <div style={{ width: 24, height: 2, background: done ? "#1b5e20" : "#e5e7eb" }} />}
          </div>
        );
      })}
    </div>
  );
}

function Section({ n, title, sub, done, children }: { n: number; title: string; sub: string; done: boolean; children: React.ReactNode }) {
  return (
    <div style={{ padding: 24, borderBottom: "1px solid #f1f2f4" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: done ? "#1b5e20" : "#f3f4f6", color: done ? "#fff" : "#6b7280",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>
          {done ? "✓" : n}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111" }}>{title}</h3>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      <div style={{ paddingLeft: 44 }}>{children}</div>
    </div>
  );
}

function Tip({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13, color: "#374151" }}>
      <span style={{
        width: 18, height: 18, borderRadius: "50%", background: ok ? "#1b5e20" : "#e5e7eb", color: "#fff",
        display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0,
      }}>✓</span>
      <span>{text}</span>
    </div>
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
