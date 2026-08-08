import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { CareerCenterPage } from "./pages/CareerCenterPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ResumeBuilderPage } from "./pages/ResumeBuilderPage";
import { ResumeEditPage } from "./pages/ResumeEditPage";
import { PublicResumePage } from "./pages/PublicResumePage";
import { AdminProtectedRoute } from "./components/layout/AdminProtectedRoute";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminPlansPage } from "./pages/admin/AdminPlansPage";
import { AdminTemplatesPage } from "./pages/admin/AdminTemplatesPage";

export default function App() {
  const location = useLocation();
  const isPublicResumeRoute = location.pathname.startsWith("/r/");
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <>
      {!isPublicResumeRoute && !isAdminRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/career-center" element={<CareerCenterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/r/:slug" element={<PublicResumePage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resumes/new"
          element={
            <ProtectedRoute>
              <ResumeBuilderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resumes/:id/edit"
          element={
            <ProtectedRoute>
              <ResumeEditPage />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin/users"
          element={
            <AdminProtectedRoute>
              <AdminUsersPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/plans"
          element={
            <AdminProtectedRoute>
              <AdminPlansPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/templates"
          element={
            <AdminProtectedRoute>
              <AdminTemplatesPage />
            </AdminProtectedRoute>
          }
        />
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
      {!isPublicResumeRoute && !isAdminRoute && <Footer />}
    </>
  );
}
