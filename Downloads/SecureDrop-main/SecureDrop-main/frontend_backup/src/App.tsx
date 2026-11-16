import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { getSession } from './services/authService';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { SharePage } from './pages/SharePage';
import { BrandMark } from './components/BrandLogo';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const result = await getSession();
      setIsValid(Boolean(result.success && result.data?.user));
      setIsChecking(false);
    };

    void verify();
  }, []);

  if (isChecking) {
    return (
      <div className="transfer-shell relative flex min-h-screen items-center justify-center overflow-hidden px-5 text-slate-900">
        <div aria-hidden="true" className="transfer-orb transfer-orb-one" />
        <div aria-hidden="true" className="transfer-orb transfer-orb-two" />
        <div className="transfer-card-3d motion-enter relative z-10 rounded-2xl border border-white/60 bg-white/95 px-7 py-6 text-center shadow-xl">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-slate-950">
            <BrandMark />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">Checking your SecureDrop session…</p>
        </div>
      </div>
    );
  }

  return isValid ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          }
        />
        <Route path="/s/:token" element={<SharePage />} />
        <Route path="/SecureDrop/:resource" element={<SharePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
