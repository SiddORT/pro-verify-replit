import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Topbar from "../components/Topbar";
import { fmtIST } from "../utils/time";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LabelList,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#1b5e20", "#388e3c", "#66bb6a", "#a5d6a7", "#c8e6c9", "#81c784"];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const [s, b] = await Promise.all([api.get("/api/dashboard/stats"), api.get("/api/batches", { params: { limit: 200 } })]);
    setStats(s.data);
    setBatches(Array.isArray(b.data) ? b.data : (b.data?.items || []));
  }
  useEffect(() => { load(); }, []);

  async function del(id: number) {
    if (!confirm("Delete this batch and all its codes?")) return;
    await api.delete(`/api/batches/${id}`);
    load();
  }

  const filtered = batches.filter(
    (b) => !q || b.batch_number.toLowerCase().includes(q.toLowerCase()) || (b.file_name || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <Topbar />
      <div className="page">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-sub">Manage product codes and view authentication activity</p>
          </div>
          <Link to="/upload" className="btn">+ Upload New Codes</Link>
        </div>

        <div className="stat-grid">
          <Card v={stats?.totals.codes ?? "—"} l="Total Codes Uploaded" />
          <Card v={stats?.totals.verifications ?? "—"} l="Total Verifications" />
          <Card v={stats?.totals.batches ?? "—"} l="Upload Batches" />
          <Card v={stats?.totals.brands ?? "—"} l="Brands" />
        </div>

        <div className="chart-grid">
          <div className="chart-card">
            <h3 className="chart-title">Verifications by Brand</h3>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={stats?.verifications_per_brand || []}>
                  <CartesianGrid stroke="#f1f2f4" vertical={false} />
                  <XAxis dataKey="brand" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#388e3c" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="count" position="top" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="chart-card">
            <h3 className="chart-title">Codes per Brand</h3>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={(stats?.codes_per_brand || []).filter((d: any) => d.count > 0)}
                    dataKey="count" nameKey="brand"
                    innerRadius={55} outerRadius={85} paddingAngle={2}
                  >
                    {(stats?.codes_per_brand || []).map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="square" />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Upload Batches</h3>
            <div className="row">
              <Link to="/brands" className="btn-outline">Brand Master</Link>
            </div>
          </div>
          <div className="toolbar">
            <div className="search">
              <span>🔍</span>
              <input placeholder="Search batch number or file name..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="table-wrap">
          <table className="table" style={{ minWidth: 820 }}>
            <thead>
              <tr>
                <th>SR NO</th><th>DATE & TIME</th><th>BATCH NUMBER</th>
                <th>FILE NAME</th><th>CODES UPLOADED</th><th>BRAND</th><th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 5).map((b, i) => (
                <tr key={b.id}>
                  <td>{i + 1}</td>
                  <td>{fmtIST(b.created_at)}</td>
                  <td>{b.batch_number}</td>
                  <td>{b.file_name}</td>
                  <td>{b.codes_uploaded}</td>
                  <td>{b.brand_name}</td>
                  <td><button className="btn-danger" onClick={() => del(b.id)}>Delete</button></td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No batches yet</td></tr>
              )}
            </tbody>
          </table>
          </div>
          {filtered.length > 5 && (
            <div style={{
              padding: "14px 4px 0", display: "flex", alignItems: "center",
              justifyContent: "space-between", borderTop: "1px solid #f1f2f4", marginTop: 4,
            }}>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Showing 5 of {filtered.length.toLocaleString()} batches
              </div>
              <Link to="/batches" style={{ color: "#1b5e20", fontWeight: 600, textDecoration: "none", fontSize: 13 }}>
                Show more →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Card({ v, l }: { v: any; l: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{v}</div>
      <div className="stat-label">{l}</div>
    </div>
  );
}
