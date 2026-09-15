import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import Topbar from "../components/Topbar";

function listFrom(data: any): any[] {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
}

export default function IntegrationGuide() {
  const { brandId } = useParams<{ brandId: string }>();
  const [brand, setBrand] = useState<any | null>(null);
  const [error, setError] = useState("");

  async function loadBrand() {
    try {
      const response = await api.get("/api/brands");
      const found = listFrom(response.data).find((item: any) => String(item.id) === String(brandId));
      if (!found) {
        setError("Brand not found.");
        return;
      }
      setBrand(found);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Could not load the integration guide.");
    }
  }

  useEffect(() => { loadBrand(); }, [brandId]);

  const brandName = brand?.name || "this brand";
  const slug = brand?.slug || "your-brand-slug";

  return (
    <>
      <Topbar />
      <div className="page">
        <Link to={`/brands/${brandId}/connections`} className="back-link">← Back to API connections</Link>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Integration guide</h1>
            <p className="page-sub">Connect your server to PROverify for {brandName}</p>
          </div>
        </div>

        {error && (
          <div className="card" style={{ color: "#b91c1c", background: "#fef2f2", borderColor: "#fecaca", marginBottom: 18 }}>
            {error} <button className="btn-outline" onClick={loadBrand} style={{ marginLeft: 8 }}>Try again</button>
          </div>
        )}

        <div className="card">
          <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 22px", lineHeight: 1.6 }}>
            Use a connection key to authenticate server-to-server verification requests. Create and manage keys from the API connections page.
          </p>
          <div className="grid-2" style={{ gap: 28 }}>
            <div>
              <h2 style={sectionTitle}>Endpoint and required header</h2>
              <pre style={codeBlock}>{`POST /api/v1/brands/${slug}/verify
Content-Type: application/json
X-API-Key: pv_your_connection_key`}</pre>

              <h2 style={sectionTitle}>Request example</h2>
              <pre style={codeBlock}>{`curl -X POST https://your-domain.example/api/v1/brands/${slug}/verify \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $PROVERIFY_API_KEY" \\
  -d '{"code":"ABC-123"}'`}</pre>

              <h2 style={sectionTitle}>Response examples</h2>
              <pre style={codeBlock}>{`// First verification (HTTP 200)
{"status":"first","brand":"${brandName}","code":"ABC-123","verified_at":"2025-01-15T10:00:00Z"}

// Repeat verification (HTTP 200)
{"status":"repeat","brand":"${brandName}","code":"ABC-123","first_verified_at":"2025-01-15T10:00:00Z","current_scan_at":"2025-01-16T09:30:00Z","history":["2025-01-15T10:00:00Z"]}

// Invalid code (HTTP 200)
{"status":"invalid","brand":"${brandName}"}`}</pre>
            </div>

            <div>
              <h2 style={sectionTitle}>Key safety and rotation</h2>
              <ul style={docList}>
                <li>Keep keys on your server only. Never put them in browser code, browser storage, mobile apps, source control, or URLs.</li>
                <li>Use a separate named connection for each environment or integration.</li>
                <li>Rotation immediately invalidates the prior key. Update your server secret immediately and test with the new key.</li>
                <li>The full key is shown only once. Copy it to a secrets manager immediately.</li>
              </ul>

              <h2 style={sectionTitle}>Audit logs</h2>
              <p style={bodyText}>
                Each authenticated verification request is recorded with its connection, submitted code, result, source IP, and user agent. Open a connection's audit log from its row in the connections table.
              </p>

              <h2 style={sectionTitle}>Typical results</h2>
              <ul style={docList}>
                <li><b>first</b> — the valid code was verified for the first time.</li>
                <li><b>repeat</b> — the valid code has been verified before.</li>
                <li><b>invalid</b> — the code does not belong to this brand.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  margin: "20px 0 8px",
};

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

const bodyText: React.CSSProperties = {
  color: "#4b5563",
  fontSize: 13,
  lineHeight: 1.6,
  margin: 0,
};

const docList: React.CSSProperties = {
  ...bodyText,
  paddingLeft: 20,
};