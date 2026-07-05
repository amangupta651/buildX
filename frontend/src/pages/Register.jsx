import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

export default function Register() {
  const { register, error } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", university: "", major: "", year: "" });
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await register(form);
    setBusy(false);
    if (ok) {
      toast.success("Welcome aboard.");
      nav("/dashboard");
    } else {
      toast.error("Sign up failed.");
    }
  };

  const field = (label, k, type, placeholder, testId, required = false) => (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest text-white/50">
        {label}{required && " *"}
      </label>
      <input
        data-testid={testId}
        type={type || "text"}
        value={form[k]}
        onChange={upd(k)}
        required={required}
        placeholder={placeholder}
        className="w-full bg-transparent border-0 border-b border-white/15 focus:border-[#22D3EE] px-0 py-3 font-mono text-base text-white placeholder:text-white/30 focus:outline-none"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <div className="max-w-[1200px] mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 border border-white/10 bg-white/[0.02] p-10 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative">
            <div className="font-mono text-sm text-[#22D3EE]">// join roster</div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mt-3">Sign up.</h1>
            <p className="mt-4 font-mono text-sm text-white/60">A short, honest form. Free for students.</p>
            <div className="mt-8 border border-white/10 bg-black/30 p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">what you get</div>
              <ul className="mt-3 font-mono text-sm space-y-2 text-white/80">
                <li><span className="text-[#22D3EE]">→</span> Access to 5+ virtual startups</li>
                <li><span className="text-[#22D3EE]">→</span> Real backlogs with skill tags</li>
                <li><span className="text-[#22D3EE]">→</span> Verified, downloadable certificate</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 border border-white/10 bg-white/[0.02] p-10">
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {field("Full name", "name", "text", "Alex Ramirez", "reg-name", true)}
            {field("Email", "email", "email", "alex@university.edu", "reg-email", true)}
            {field("Password", "password", "password", "min 6 characters", "reg-password", true)}
            {field("University", "university", "text", "MIT", "reg-university")}
            {field("Major", "major", "text", "Computer Science", "reg-major")}
            {field("Year", "year", "text", "Junior", "reg-year")}

            {error && (
              <div data-testid="reg-error" className="md:col-span-2 border border-[#F472B6]/40 text-[#F472B6] bg-[#F472B6]/10 px-4 py-2 text-sm font-mono">{error}</div>
            )}

            <div className="md:col-span-2 flex items-center justify-between mt-4">
              <Link
                to="/login"
                data-testid="reg-go-login"
                className="font-mono text-xs text-white/60 hover:text-white underline transition-colors"
              >
                Have an account?
              </Link>
              <button
                data-testid="reg-submit"
                disabled={busy}
                className="font-mono text-sm font-semibold bg-white text-[#0A0A0A] hover:bg-[#22D3EE] disabled:opacity-50 px-6 py-3 transition-colors"
              >
                {busy ? "Creating…" : "Create account →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
