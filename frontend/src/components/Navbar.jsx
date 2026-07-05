import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();

  const tab = (to, label, testId) => {
    const active = loc.pathname === to || (to !== "/" && loc.pathname.startsWith(to));
    return (
      <Link
        to={to}
        data-testid={testId}
        className={`font-mono text-sm px-3 py-1.5 transition-colors ${
          active ? "text-white" : "text-white/50 hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-40 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link to={user ? "/dashboard" : "/"} data-testid="nav-logo" className="flex items-center gap-3">
          <div className="w-8 h-8 border border-white/25 flex items-center justify-center">
            <span className="font-heading font-black text-white text-sm">X</span>
          </div>
          <div className="font-mono text-sm text-white/90">
            <span className="text-white/50">build</span>X<span className="text-white/50">/students</span>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {user ? (
            <>
              {tab("/dashboard", "Dashboard", "nav-dashboard")}
              {tab("/startups", "Startups", "nav-startups")}
              {tab("/profile", "Profile", "nav-profile")}
              <div className="hidden md:flex items-center gap-3 ml-4 pl-4 border-l border-white/10">
                <div className="flex flex-col items-end leading-tight">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">signed in</span>
                  <span className="font-mono text-xs text-white">{user.name || user.email}</span>
                </div>
                <button
                  data-testid="nav-logout"
                  onClick={async () => { await logout(); nav("/"); }}
                  className="font-mono text-sm text-white/60 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login" className="font-mono text-sm text-white/80 hover:text-white transition-colors px-3">Sign in</Link>
              <Link
                to="/register"
                data-testid="nav-register"
                className="font-mono text-sm bg-[#22D3EE] text-[#0A0A0A] px-4 py-2 hover:bg-white transition-colors"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
