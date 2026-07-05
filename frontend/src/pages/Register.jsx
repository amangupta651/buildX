import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { Github } from "lucide-react";

const ROLES = ["Frontend", "Backend", "Full-Stack", "ML", "DevOps", "Mobile", "Design"];
const STACK = [
  "TypeScript", "Python", "Rust", "Go", "React", "Next.js",
  "Postgres", "Kubernetes", "PyTorch", "Swift", "Kotlin", "FastAPI",
];

export default function Register() {
  const { register, error } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    university: "",
    year: "",
    github_handle: "",
    bio: "",
    roles_wanted: [],
    stack: [],
  });
  const [busy, setBusy] = useState(false);

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleIn = (key, value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await register(form);
    setBusy(false);
    if (ok) {
      toast.success("Profile created. Time to ship.");
      nav("/dashboard");
    } else {
      toast.error("Sign up failed.");
    }
  };

  const inputCls =
    "w-full bg-transparent border border-white/15 focus:border-[#22D3EE] px-4 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none transition-colors";

  const Pill = ({ label, active, onClick, testId }) => (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`font-mono text-xs px-4 py-1.5 border rounded-full transition-colors ${
        active
          ? "border-[#22D3EE] text-[#22D3EE] bg-[#22D3EE]/10"
          : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
      }`}
    >
      {active ? "✓ " : ""}{label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-14">
        <div className="text-center mb-12">
          <div className="font-mono text-sm text-[#22D3EE]">// create profile</div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mt-3">
            Ship real code. Get verified.
          </h1>
          <p className="mt-4 font-mono text-sm text-white/60">
            This becomes your engineering profile. Founders will see it when you apply.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-10">
          {/* Row: name / email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="font-mono text-sm text-white/80 mb-2 block">Full name</label>
              <input
                data-testid="reg-name"
                value={form.name}
                onChange={upd("name")}
                required
                placeholder="Alex Rivera"
                className={inputCls}
              />
            </div>
            <div>
              <label className="font-mono text-sm text-white/80 mb-2 block">Email</label>
              <input
                data-testid="reg-email"
                type="email"
                value={form.email}
                onChange={upd("email")}
                required
                placeholder="alex@school.edu"
                className={inputCls}
              />
            </div>
          </div>

          {/* Row: password */}
          <div>
            <label className="font-mono text-sm text-white/80 mb-2 block">Password</label>
            <input
              data-testid="reg-password"
              type="password"
              value={form.password}
              onChange={upd("password")}
              required
              placeholder="min 6 characters"
              className={inputCls}
            />
          </div>

          {/* Row: university / year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="font-mono text-sm text-white/80 mb-2 block">University</label>
              <input
                data-testid="reg-university"
                value={form.university}
                onChange={upd("university")}
                placeholder="Carnegie Mellon"
                className={inputCls}
              />
            </div>
            <div>
              <label className="font-mono text-sm text-white/80 mb-2 block">Graduation year</label>
              <input
                data-testid="reg-year"
                value={form.year}
                onChange={upd("year")}
                placeholder="2027"
                className={inputCls}
              />
            </div>
          </div>

          {/* GitHub handle */}
          <div>
            <label className="font-mono text-sm text-white/80 mb-2 block">GitHub handle</label>
            <div className="flex items-stretch border border-white/15 focus-within:border-[#22D3EE] transition-colors">
              <div className="flex items-center gap-2 px-4 border-r border-white/15 bg-white/[0.03] font-mono text-sm text-white/50">
                <Github size={14} /> github.com/
              </div>
              <input
                data-testid="reg-github"
                value={form.github_handle}
                onChange={upd("github_handle")}
                placeholder="alexr"
                className="flex-1 bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="font-mono text-sm text-white/80 mb-2 block">Short bio</label>
            <textarea
              data-testid="reg-bio"
              rows={3}
              value={form.bio}
              onChange={upd("bio")}
              placeholder="What do you love building? What do you want to learn?"
              className={inputCls}
            />
          </div>

          {/* Roles */}
          <div>
            <label className="font-mono text-sm text-white/80 mb-3 block">Roles you want</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <Pill
                  key={r}
                  label={r}
                  active={form.roles_wanted.includes(r)}
                  onClick={() => toggleIn("roles_wanted", r)}
                  testId={`reg-role-${r}`}
                />
              ))}
            </div>
          </div>

          {/* Stack */}
          <div>
            <label className="font-mono text-sm text-white/80 mb-3 block">Stack you're comfortable with</label>
            <div className="flex flex-wrap gap-2">
              {STACK.map((s) => (
                <Pill
                  key={s}
                  label={s}
                  active={form.stack.includes(s)}
                  onClick={() => toggleIn("stack", s)}
                  testId={`reg-stack-${s}`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div data-testid="reg-error" className="border border-[#F472B6]/40 text-[#F472B6] bg-[#F472B6]/10 px-4 py-3 text-sm font-mono">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="font-mono text-xs text-white/50">
              By joining, you agree to ship.
              <span className="mx-2 text-white/20">·</span>
              <Link to="/login" data-testid="reg-go-login" className="text-white/70 hover:text-white underline transition-colors">
                Already have an account?
              </Link>
            </div>
            <div className="flex gap-3">
              <Link
                to="/"
                className="font-mono text-sm text-white/60 hover:text-white border border-white/15 hover:border-white/40 px-5 py-3 transition-colors"
              >
                Cancel
              </Link>
              <button
                data-testid="reg-submit"
                disabled={busy}
                className="font-mono text-sm font-semibold bg-[#22D3EE] text-[#0A0A0A] hover:bg-white disabled:opacity-50 px-6 py-3 transition-colors"
              >
                {busy ? "Creating…" : "Create profile →"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
