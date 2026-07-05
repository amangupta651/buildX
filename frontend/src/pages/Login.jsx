import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

export default function Login() {
  const { login, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await login(email, password);
    setBusy(false);
    if (ok) {
      toast.success("Welcome back.");
      // Admins go straight to admin dashboard
      // (login() sets user via response; we read the freshly returned user via context on next tick)
      const to = loc.state?.from || null;
      // If a specific redirect was requested, honour it; otherwise let App-level logic route by role
      nav(to || "/dashboard");
    } else {
      toast.error("Login failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <div className="max-w-[1200px] mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="border border-white/10 bg-white/[0.02] p-10 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative">
            <div className="font-mono text-sm text-[#22D3EE]">// secure login</div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mt-3">Sign in.</h1>
            <p className="mt-4 font-mono text-sm text-white/60 max-w-md">Pick up where you left off. Your virtual startups are waiting.</p>
            <div className="mt-10 border border-white/10 bg-black/30 p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">tip</div>
              <p className="font-mono text-sm text-white/70 mt-2">Don't have an account? Sign up — it's free. Every approved task adds to your verifiable engineering profile.</p>
            </div>
          </div>
        </div>

        <div className="border border-white/10 bg-white/[0.02] p-10">
          <form onSubmit={submit} className="space-y-6">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-white/50">Email</label>
              <input
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border-0 border-b border-white/15 focus:border-[#22D3EE] px-0 py-3 font-mono text-base text-white placeholder:text-white/30 focus:outline-none"
                placeholder="alex@university.edu"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-white/50">Password</label>
              <input
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent border-0 border-b border-white/15 focus:border-[#22D3EE] px-0 py-3 font-mono text-base text-white placeholder:text-white/30 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div data-testid="login-error" className="border border-[#F472B6]/40 text-[#F472B6] bg-[#F472B6]/10 px-4 py-2 text-sm font-mono">{error}</div>
            )}
            <button
              data-testid="login-submit"
              disabled={busy}
              className="w-full font-mono text-sm font-semibold bg-white text-[#0A0A0A] hover:bg-[#22D3EE] disabled:opacity-50 py-3 transition-colors"
            >
              {busy ? "Signing in…" : "Sign in →"}
            </button>
            <div className="font-mono text-xs text-white/50 text-center">
              New here?{" "}
              <Link to="/register" data-testid="login-go-register" className="text-white hover:text-[#22D3EE] underline transition-colors">Create account</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
