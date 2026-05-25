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
        <span style={{ color: "#374151" }}>{email || "--"}</span>
        <button className="btn-outline" style={{ color: "#dc2626" }} onClick={logout}>Logout</button>
        <Link to="/" className="btn-outline">Home</Link>
      </div>
    </div>
  );
}
