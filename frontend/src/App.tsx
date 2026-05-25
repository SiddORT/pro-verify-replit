import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Brands from "./pages/Brands";
import Upload from "./pages/Upload";
import Activity from "./pages/Activity";
import Verify from "./pages/Verify";
import { RequireAuth } from "./auth";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify/:slug" element={<Verify />} />
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/brands" element={<RequireAuth><Brands /></RequireAuth>} />
      <Route path="/upload" element={<RequireAuth><Upload /></RequireAuth>} />
      <Route path="/activity" element={<RequireAuth><Activity /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
