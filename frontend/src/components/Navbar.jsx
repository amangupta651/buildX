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
        className={`overline px-3 py-2 border border-[#1A1A1A] ${active ? "bg-[#0A0A0A] text-white" : "bg-white text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="border-b border-[#1A1A1A] bg-white sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link to={user ? "/dashboard" : "/"} data-testid="nav-logo" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0A0A0A] border border-[#1A1A1A] flex items-center justify-center">
            <span className="font-heading font-black text-white text-lg">X</span>
          </div>
          <div className="leading-none">
            <div className="font-heading text-2xl font-black tracking-tighter">buildX</div>
            <div className="overline text-[#525252]">VIRTUAL // STARTUP // WORKSHOP</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {tab("/dashboard", "Dashboard", "nav-dashboard")}
              {tab("/startups", "Startups", "nav-startups")}
              {tab("/profile", "Profile", "nav-profile")}
              <div className="hidden md:flex flex-col items-end ml-3 mr-1">
                <span className="overline text-[#525252]">SIGNED IN</span>
                <span className="font-mono text-sm font-bold">{user.name || user.email}</span>
              </div>
              <button
                data-testid="nav-logout"
                onClick={async () => { await logout(); nav("/"); }}
                className="btn-ghost"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login" className="btn-ghost">Login</Link>
              <Link to="/register" data-testid="nav-register" className="btn-primary">Join</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
