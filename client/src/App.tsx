import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Menu, Wallet } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { DashboardPage } from "./pages/DashboardPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { IncomePage } from "./pages/IncomePage";
import { RecurringPage } from "./pages/RecurringPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { useAuth } from "./lib/AuthContext";

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 md:hidden dark:border-neutral-800 dark:bg-neutral-950">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-white">
              <Wallet className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <span className="text-sm font-semibold text-neutral-900 dark:text-white">
              WalkThrough
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/income" element={<IncomePage />} />
              <Route path="/recurring" element={<RecurringPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
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
