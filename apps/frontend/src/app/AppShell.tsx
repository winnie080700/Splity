import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { type ReactNode } from "react";

export function AppShell() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-8">
      <header className="mb-6 card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="text-2xl font-bold tracking-tight">Splity</Link>
          {!isHome && (
            <nav className="flex items-center gap-2 text-sm">
              <NavItem to="/">Home</NavItem>
              <NavItem to={location.pathname.includes("participants") ? location.pathname : location.pathname.replace(/\/[^/]+$/, "/participants")}>Participants</NavItem>
              <NavItem to={location.pathname.includes("bills") ? location.pathname : location.pathname.replace(/\/[^/]+$/, "/bills")}>Bills</NavItem>
              <NavItem to={location.pathname.includes("settlements") ? location.pathname : location.pathname.replace(/\/[^/]+$/, "/settlements")}>Settlement</NavItem>
            </nav>
          )}
        </div>
      </header>
      <Outlet />
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-full px-3 py-1.5 ${isActive ? "bg-ink text-white" : "bg-white/70 text-ink hover:bg-white"}`
      }
    >
      {children}
    </NavLink>
  );
}
