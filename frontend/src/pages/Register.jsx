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
      <label className="overline">{label}{required && " *"}</label>
      <input
        data-testid={testId}
        type={type || "text"}
        value={form[k]}
        onChange={upd(k)}
        required={required}
        placeholder={placeholder}
        className="w-full bg-transparent border-0 border-b-2 border-[#1A1A1A] px-0 py-3 font-mono text-base focus:outline-none focus:border-[#FF3B30]"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 grid-paper border border-[#1A1A1A] bg-white p-10">
          <div className="overline">JOIN ROSTER // 0X12</div>
          <h1 className="font-heading text-5xl font-black tracking-tighter mt-3">Sign up.</h1>
          <p className="mt-3 text-sm text-[#525252]">A short, honest form. Free for students.</p>
          <div className="mt-8 space-y-4">
            <div className="border border-[#1A1A1A] p-4 bg-white">
              <div className="overline text-[#525252]">WHAT YOU GET</div>
              <ul className="mt-2 text-sm font-mono space-y-1">
                <li>→ Access to 5 virtual startups</li>
                <li>→ Real backlogs with skill tags</li>
                <li>→ Verified, downloadable certificate</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 border border-[#1A1A1A] bg-white p-10">
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {field("Full name", "name", "text", "Alex Ramirez", "reg-name", true)}
            {field("Email", "email", "email", "alex@university.edu", "reg-email", true)}
            {field("Password", "password", "password", "min 6 characters", "reg-password", true)}
            {field("University", "university", "text", "MIT", "reg-university")}
            {field("Major", "major", "text", "Computer Science", "reg-major")}
            {field("Year", "year", "text", "Junior", "reg-year")}

            {error && <div data-testid="reg-error" className="md:col-span-2 border border-[#FF3B30] text-[#FF3B30] px-4 py-2 text-sm font-mono">{error}</div>}

            <div className="md:col-span-2 flex items-center justify-between mt-4">
              <Link to="/login" data-testid="reg-go-login" className="overline underline">HAVE AN ACCOUNT?</Link>
              <button data-testid="reg-submit" disabled={busy} className="btn-primary">
                {busy ? "Creating…" : "Create account →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
