import { Navigate, Route, Routes } from "react-router-dom";
import { Wallet } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { DashboardPage } from "./pages/DashboardPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { IncomePage } from "./pages/IncomePage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { useAuth } from "./lib/AuthContext";

function AppShell() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/income" element={<IncomePage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl bg-brand-500 text-white">
        <Wallet className="h-6 w-6" strokeWidth={2.25} />
      </div>
    </div>
  );
}

function App() {
  const { status } = useAuth();

  if (status === "loading") return <SplashScreen />;

  if (status === "unauthenticated") {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  );
}

export default App;
