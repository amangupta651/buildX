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
      const to = loc.state?.from || "/dashboard";
      nav(to);
    } else {
      toast.error("Login failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-6 grid-paper border border-[#1A1A1A] bg-white p-10">
          <div className="overline">SECURE LOGIN // 0X11</div>
          <h1 className="font-heading text-5xl font-black tracking-tighter mt-3">Sign in.</h1>
          <p className="mt-3 text-sm text-[#525252] max-w-md">Pick up where you left off. Your virtual startups are waiting.</p>
          <div className="mt-10 border border-[#1A1A1A] p-6 bg-[#FAFAFA]">
            <div className="overline text-[#525252]">TIP</div>
            <p className="font-mono text-sm mt-2">Don't have an account? Sign up — it's free. Every approved task adds to your verifiable engineering profile.</p>
          </div>
        </div>

        <div className="lg:col-span-6 border border-[#1A1A1A] bg-white p-10">
          <form onSubmit={submit} className="space-y-6 max-w-md">
            <div>
              <label className="overline">Email</label>
              <input
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border-0 border-b-2 border-[#1A1A1A] px-0 py-3 font-mono text-base focus:outline-none focus:border-[#FF3B30]"
                placeholder="alex@university.edu"
              />
            </div>
            <div>
              <label className="overline">Password</label>
              <input
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent border-0 border-b-2 border-[#1A1A1A] px-0 py-3 font-mono text-base focus:outline-none focus:border-[#FF3B30]"
                placeholder="••••••••"
              />
            </div>
            {error && <div data-testid="login-error" className="border border-[#FF3B30] text-[#FF3B30] px-4 py-2 text-sm font-mono">{error}</div>}
            <button data-testid="login-submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Signing in…" : "Sign in →"}
            </button>
            <div className="overline text-[#525252] text-center">
              NEW HERE? <Link to="/register" data-testid="login-go-register" className="underline">CREATE ACCOUNT</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
