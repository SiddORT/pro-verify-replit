import { Link } from "react-router-dom";
import { getEmail, logout } from "../auth";

export default function Topbar() {
  const email = getEmail();
  return (
    <div className="topbar">
      <Link to="/" className="brand-logo">
        <span className="pro">PRO</span><span className="verify">verify</span>
      </Link>
      <div className="row" style={{ gap: 18, fontSize: 14 }}>
        <Link to="/" className="btn-outline">Dashboard</Link>
        <Link to="/brands" className="btn-outline">Brands</Link>
        <Link to="/upload" className="btn-outline">Upload</Link>
        <Link to="/activity" className="btn-outline">Activity</Link>
        <span style={{ color: "#374151" }}>{email || "--"}</span>
        <button className="btn-outline" style={{ color: "#dc2626" }} onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
