import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Tags,
  Settings,
  Wallet,
  Sun,
  Moon,
  LogOut,
  BarChart3,
  PiggyBank,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../lib/AuthContext";
import { useTheme } from "../lib/ThemeContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/analytics", label: "Analytics", icon: BarChart3, end: false },
  { to: "/expenses", label: "Expenses", icon: Receipt, end: false },
  { to: "/income", label: "Income", icon: PiggyBank, end: false },
  { to: "/categories", label: "Categories", icon: Tags, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const initial = (user?.name?.trim()?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white shadow-sm shadow-brand-500/30">
          <Wallet className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div>
          <p className="text-[15px] font-semibold leading-tight text-neutral-900 dark:text-white">
            ExpenseTrac
          </p>
          <p className="text-xs leading-tight text-neutral-400">Personal finance</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        <button
          onClick={toggleTheme}
          className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px]" strokeWidth={2} />
          ) : (
            <Moon className="h-[18px] w-[18px]" strokeWidth={2} />
          )}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-200">
              {user?.name || "Account"}
            </p>
            <p className="truncate text-xs text-neutral-400">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-critical/10 hover:text-critical"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
