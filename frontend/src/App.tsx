import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Brands from "./pages/Brands";
import Upload from "./pages/Upload";
import BatchUploads from "./pages/BatchUploads";
import BatchDetails from "./pages/BatchDetails";
import Activity from "./pages/Activity";
import Verify from "./pages/Verify";
import { RequireAuth } from "./auth";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/brands" element={<RequireAuth><Brands /></RequireAuth>} />
      <Route path="/upload" element={<RequireAuth><Upload /></RequireAuth>} />
      <Route path="/batches" element={<RequireAuth><BatchUploads /></RequireAuth>} />
      <Route path="/batches/:id" element={<RequireAuth><BatchDetails /></RequireAuth>} />
      <Route path="/activity" element={<RequireAuth><Activity /></RequireAuth>} />
      {/* Public brand verify page now lives at the bare slug (e.g. /raw-nutrition).
          React Router ranks static routes above dynamic ones, so the admin pages
          above always win over this catch-all. Backend rejects reserved slugs
          that would shadow those routes. */}
      <Route path="/:slug" element={<Verify />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
