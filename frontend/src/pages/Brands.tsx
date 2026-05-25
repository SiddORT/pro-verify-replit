import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Topbar from "../components/Topbar";
import { useToast } from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";
}

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

function Req() { return <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>; }

export default function Brands() {
  const toast = useToast();
  const [brands, setBrands] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#1b5e20");
  const [desktop, setDesktop] = useState<string | null>(null);
  const [mobile, setMobile] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const dRef = useRef<HTMLInputElement>(null);
  const mRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await api.get("/api/brands");
    setBrands(r.data);
  }
  useEffect(() => { load(); }, []);

  function reset() {
    setName(""); setColor("#1b5e20"); setDesktop(null); setMobile(null); setEditingId(null);
    if (dRef.current) dRef.current.value = "";
    if (mRef.current) mRef.current.value = "";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast("Brand name is required", "error"); return; }
    setSaving(true);
    try {
      const body = { name, primary_color: color, desktop_image: desktop, mobile_image: mobile, is_active: true };
      if (editingId) {
        await api.put(`/api/brands/${editingId}`, body);
        toast("Brand updated successfully");
      } else {
        await api.post("/api/brands", body);
        toast("Brand created successfully");
      }
      reset();
      load();
    } catch (e: any) {
      toast(e?.response?.data?.detail || "Failed to save brand", "error");
    } finally { setSaving(false); }
  }

  async function edit(b: any) {
    setEditingId(b.id);
    setName(b.name); setColor(b.primary_color || "#1b5e20");
    setDesktop(b.desktop_image || null); setMobile(b.mobile_image || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggle(id: number) {
    try {
      await api.patch(`/api/brands/${id}/toggle`);
      toast("Brand status updated");
      load();
    } catch { toast("Failed to update status", "error"); }
  }
  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await api.delete(`/api/brands/${toDelete.id}`);
      toast("Brand deleted");
      setToDelete(null);
      load();
    } catch { toast("Failed to delete brand", "error"); }
  }

  function verifyUrl(slug: string) {
    return `${window.location.origin}/verify/${slug}`;
  }

  const filtered = brands.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <Topbar />
      <div className="page">
        <Link to="/" className="back-link">← Back to Dashboard</Link>
        <h1 className="page-title">Brand Master</h1>
        <p className="page-sub">Add and manage brands for product code mapping</p>

        <form onSubmit={save} className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 16 }}>{editingId ? "Edit Brand" : "Add New Brand"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label className="label">Brand Name<Req /></label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter brand name" required />
            </div>
            <div>
              <label className="label">Slug (auto-generated)</label>
              <input className="input" value={slugify(name)} readOnly style={{ background: "#f9fafb" }} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="label">Primary Color<Req /></label>
            <div className="row">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                     style={{ width: 50, height: 40, border: "1px solid #e5e7eb", borderRadius: 6, padding: 2 }} />
              <input className="input" value={color} onChange={(e) => setColor(e.target.value)} style={{ maxWidth: 200 }} required />
            </div>
          </div>
          <label className="label">Background Images <span style={{ color: "#9ca3af", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <ImagePicker title="Desktop / Web" sub="Recommended: 1920 x 1080px (16:9)"
              value={desktop} onChange={setDesktop} inputRef={dRef} />
            <ImagePicker title="Mobile" sub="Recommended: 750 x 1334px (9:16)"
              value={mobile} onChange={setMobile} inputRef={mRef} />
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
            <Req /> Required fields
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            {editingId && <button type="button" className="btn-outline" onClick={reset}>Cancel</button>}
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : (editingId ? "Update Brand" : "Add Brand")}</button>
          </div>
        </form>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>All Brands</h3>
            <div className="search" style={{ maxWidth: 260 }}>
              <span>🔍</span>
              <input placeholder="Search brands..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>#</th><th>IMAGE</th><th>BRAND NAME</th><th>STATUS</th>
                <th>CREATED AT</th><th>UPDATED AT</th><th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr key={b.id}>
                  <td>{i + 1}</td>
                  <td>
                    {b.desktop_image
                      ? <img src={b.desktop_image} className="brand-thumb" alt="" />
                      : <div className="brand-thumb" style={{ background: b.primary_color }} />}
                  </td>
                  <td style={{ fontWeight: 600 }}>{b.name}</td>
                  <td>
                    <button
                      onClick={() => toggle(b.id)}
                      title="Click to toggle status"
                      style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                    >
                      {b.is_active ? <span className="badge-active">Active</span> : <span className="badge-inactive">Inactive</span>}
                    </button>
                  </td>
                  <td>{new Date(b.created_at).toLocaleString()}</td>
                  <td>{new Date(b.updated_at).toLocaleString()}</td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      <a
                        href={`/verify/${b.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-icon"
                        title={`Open verification page (${verifyUrl(b.slug)})`}
                        style={{ display: "inline-flex", alignItems: "center", padding: 4 }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/>
                          <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                      <button className="btn-icon" title="Edit" onClick={() => edit(b)}>✎</button>
                      <button className="btn-icon" title="Delete" style={{ color: "#dc2626" }} onClick={() => setToDelete(b)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No brands yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!toDelete}
        title="Delete brand?"
        message={toDelete ? `Delete "${toDelete.name}"? This will permanently remove all its upload batches, product codes, and verification history. This cannot be undone.` : ""}
        confirmText="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}

function ImagePicker({ title, sub, value, onChange, inputRef }: any) {
  async function pick(f: File | undefined) {
    if (!f) return;
    onChange(await fileToDataUrl(f));
  }
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, background: "#fafafa" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.05em" }}>{title.toUpperCase()}</div>
      <div style={{ color: "#6b7280", fontSize: 12, margin: "4px 0 10px" }}>{sub}</div>
      {value
        ? <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <img src={value} style={{ height: 60, borderRadius: 6, border: "1px solid #e5e7eb" }} />
            <button type="button" className="btn-outline" onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value=""; }}>Remove</button>
          </div>
        : <button type="button" className="btn-outline" onClick={() => inputRef.current?.click()} style={{ width: "100%" }}>↑ Upload Image</button>}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
