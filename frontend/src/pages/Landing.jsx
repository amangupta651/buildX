import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ArrowRight, Terminal, Rocket, GitBranch, ShieldCheck, Sparkles } from "lucide-react";

const STAGE_COLORS = {
  "Pre-seed": "#22D3EE",
  "Seed": "#A3E635",
  "Series A": "#F472B6",
  "Series B": "#FBBF24",
};

function DarkNav() {
  return (
    <nav className="sticky top-0 z-40 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 bg-[#22D3EE] flex items-center justify-center transition-transform group-hover:rotate-12">
            <span className="font-heading font-black text-[#0A0A0A] text-lg leading-none">×</span>
          </div>
          <div className="font-heading text-xl font-bold tracking-tight text-white">
            build<span className="text-[#22D3EE]">X</span>
          </div>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/startups" className="hidden md:inline font-mono text-sm text-white/70 hover:text-white transition-colors">Startups</Link>
          <Link to="/pricing" className="hidden md:inline font-mono text-sm text-white/70 hover:text-white transition-colors">Pricing</Link>
          <Link to="/login" data-testid="nav-login" className="font-mono text-sm text-white/80 hover:text-white transition-colors">Sign in</Link>
          <Link
            to="/register"
            data-testid="nav-register"
            className="font-mono text-sm bg-[#22D3EE] text-[#0A0A0A] px-4 py-2 border border-[#22D3EE] hover:bg-white hover:border-white transition-colors"
          >
            Join
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function Landing() {
  const [startups, setStartups] = useState([]);

  useEffect(() => {
    api.get("/startups").then((r) => setStartups(r.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#22D3EE] selection:text-[#0A0A0A]">
      <DarkNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* subtle grid backdrop */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        <div className="relative max-w-[1400px] mx-auto px-6 pt-24 pb-32 text-center">
          {/* Terminal pill */}
          <div className="inline-flex items-center gap-2 border border-white/15 bg-white/[0.03] rounded-full px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22D3EE] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22D3EE]"></span>
            </span>
            <span className="font-mono text-xs text-white/70">
              <span className="text-white/40">v0.4.0</span> · onboarding 240 students this cohort
            </span>
          </div>

          <h1 className="font-heading text-6xl sm:text-7xl md:text-8xl lg:text-[128px] font-bold tracking-tight leading-[0.95] mt-8 max-w-6xl mx-auto">
            Internship-grade work,
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #22D3EE 0%, #67E8F9 40%, #F0F9FF 100%)",
              }}
            >
              without the internship.
            </span>
          </h1>

          <p className="mt-10 max-w-2xl mx-auto text-base sm:text-lg text-white/60 leading-relaxed font-mono">
            Join a virtual startup. Pick up real tickets. Ship pull requests. Walk away with a profile of merged PRs and founder-approved experience that a recruiter can verify in one click.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              data-testid="hero-cta-register"
              className="group inline-flex items-center gap-2 bg-white text-[#0A0A0A] font-mono text-sm font-semibold px-6 py-3.5 rounded-full hover:bg-[#22D3EE] transition-colors"
            >
              Create student profile
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/startups"
              data-testid="hero-cta-browse"
              className="font-mono text-sm text-white/80 hover:text-white transition-colors px-3"
            >
              Browse startups →
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 py-24">
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight max-w-3xl">
            From signup to verified PR in a week.
          </h2>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: "01", t: "Sign up", d: "Tell us your university, stack, and what you want to learn — free for students.", I: Terminal },
              { n: "02", t: "Join a startup", d: "Browse virtual startups by stage, stack, and open roles. Apply in one click.", I: Rocket },
              { n: "03", t: "Ship tasks", d: "Pull a ticket from the board, push a PR, link it to the task.", I: GitBranch },
              { n: "04", t: "Get verified", d: "Mentor approves the task or the PR auto-merges. Either way, it lands on your profile.", I: ShieldCheck },
            ].map((s) => (
              <div key={s.n} className="group relative">
                <div className="border border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.04] p-6 h-full transition-colors">
                  <s.I size={22} strokeWidth={1.4} className="text-[#22D3EE]" />
                  <div className="mt-8 font-mono text-sm text-white/50">
                    {s.n} <span className="text-white/30">·</span> <span className="text-white">{s.t}</span>
                  </div>
                  <p className="mt-3 text-sm text-white/60 leading-relaxed font-mono">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HIRING NOW */}
      <section className="border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 py-24">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <div className="font-mono text-sm text-[#22D3EE] mb-3">// HIRING NOW</div>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight max-w-3xl">
                Startups looking for student engineers
              </h2>
            </div>
            <Link
              to="/startups"
              data-testid="hiring-view-all"
              className="font-mono text-sm text-white/80 hover:text-white transition-colors"
            >
              View all →
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(startups.length ? startups : Array(3).fill(null)).slice(0, 6).map((s, i) => {
              if (!s) {
                return (
                  <div key={i} className="border border-white/10 bg-white/[0.02] h-56 animate-pulse" />
                );
              }
              const stageColor = STAGE_COLORS[s.stage] || "#A3E635";
              const openTasks = s.tasks_count || 0;
              return (
                <Link
                  key={s.id}
                  to="/register"
                  data-testid={`hiring-card-${s.id}`}
                  className="group relative border border-white/10 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04] p-6 transition-colors block"
                >
                  {/* Top color bar */}
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${stageColor}, transparent)` }} />

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-heading text-2xl font-bold tracking-tight">{s.name}</div>
                      <p className="mt-2 text-sm text-white/60 line-clamp-2">{s.tagline}</p>
                    </div>
                    <span
                      className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border rounded-full whitespace-nowrap"
                      style={{ color: stageColor, borderColor: `${stageColor}55` }}
                    >
                      {s.stage}
                    </span>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-1.5">
                    {(s.tech_stack || []).slice(0, 4).map((t) => (
                      <span key={t} className="font-mono text-[11px] text-white/70 bg-white/5 border border-white/10 px-2 py-0.5">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="font-mono text-sm text-white/60">
                      {openTasks} open task{openTasks === 1 ? "" : "s"}
                    </span>
                    <span className="font-mono text-sm text-white/40 group-hover:text-[#22D3EE] transition-colors">
                      Apply →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="border-t border-white/10 relative overflow-hidden">
        {/* subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.10) 0%, transparent 60%)",
          }}
        />
        <div className="relative max-w-[1400px] mx-auto px-6 py-28 text-center">
          <Sparkles className="mx-auto text-[#22D3EE]" size={28} strokeWidth={1.4} />
          <h2 className="mt-6 font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-tight">
            Your next commit is your<br className="hidden sm:block" /> next line on the résumé.
          </h2>
          <p className="mt-6 max-w-xl mx-auto font-mono text-sm text-white/60">
            Stop building todo apps for class. Ship code people will actually use.
          </p>
          <Link
            to="/register"
            data-testid="closing-cta-register"
            className="mt-10 inline-flex items-center gap-2 bg-white text-[#0A0A0A] font-mono text-sm font-semibold px-6 py-3.5 rounded-full hover:bg-[#22D3EE] transition-colors"
          >
            Get started · it's free for students
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="font-mono text-xs text-white/40">© 2026 buildX · for engineering students</div>
          <div className="font-mono text-xs text-white/40">ship code · earn verified experience.</div>
        </div>
      </footer>
    </div>
  );
}
