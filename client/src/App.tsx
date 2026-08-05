import { Route, Routes, useLocation } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ResumeBuilderPage } from "./pages/ResumeBuilderPage";
import { ResumeEditPage } from "./pages/ResumeEditPage";
import { PublicResumePage } from "./pages/PublicResumePage";

export default function App() {
  const location = useLocation();
  const isPublicResumeRoute = location.pathname.startsWith("/r/");

  return (
    <>
      {!isPublicResumeRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
        <Route path="*" element={<LandingPage />} />
      </Routes>
      {!isPublicResumeRoute && <Footer />}
    </>
  );
}
