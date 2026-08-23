import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { CareerCenterPage } from "./pages/CareerCenterPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { UnsubscribePage } from "./pages/UnsubscribePage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ResumeBuilderPage } from "./pages/ResumeBuilderPage";
import { ResumeEditPage } from "./pages/ResumeEditPage";
import { PublicResumePage } from "./pages/PublicResumePage";
import { ThankYouLetterPage } from "./pages/ThankYouLetterPage";
import { CareerCoachPage } from "./pages/CareerCoachPage";
import { JobApplicationsPage } from "./pages/JobApplicationsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AdminProtectedRoute } from "./components/layout/AdminProtectedRoute";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminResumesPage } from "./pages/admin/AdminResumesPage";
import { AdminResumeEditPage } from "./pages/admin/AdminResumeEditPage";
import { AdminPlansPage } from "./pages/admin/AdminPlansPage";
import { AdminTemplatesPage } from "./pages/admin/AdminTemplatesPage";
import { AdminSkillSuggestionsPage } from "./pages/admin/AdminSkillSuggestionsPage";
import { AdminRoleDescriptionsPage } from "./pages/admin/AdminRoleDescriptionsPage";
import { AdminAuditLogPage } from "./pages/admin/AdminAuditLogPage";
import { AdminAdminsPage } from "./pages/admin/AdminAdminsPage";

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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/unsubscribe" element={<UnsubscribePage />} />
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
        <Route
          path="/job-applications"
          element={
            <ProtectedRoute>
              <JobApplicationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/thank-you-letter"
          element={
            <ProtectedRoute>
              <ThankYouLetterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/career-coach"
          element={
            <ProtectedRoute>
              <CareerCoachPage />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboardPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminProtectedRoute>
              <AdminUsersPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/resumes"
          element={
            <AdminProtectedRoute>
              <AdminResumesPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/resumes/:id/edit"
          element={
            <AdminProtectedRoute>
              <AdminResumeEditPage />
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
        <Route
          path="/admin/skill-suggestions"
          element={
            <AdminProtectedRoute>
              <AdminSkillSuggestionsPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/role-descriptions"
          element={
            <AdminProtectedRoute>
              <AdminRoleDescriptionsPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-log"
          element={
            <AdminProtectedRoute>
              <AdminAuditLogPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/admins"
          element={
            <AdminProtectedRoute>
              <AdminAdminsPage />
            </AdminProtectedRoute>
          }
        />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {!isPublicResumeRoute && !isAdminRoute && <Footer />}
    </>
  );
}
