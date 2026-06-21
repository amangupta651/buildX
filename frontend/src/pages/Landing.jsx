import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { ArrowRight, Rocket, GitBranch, ShieldCheck, CheckCircle, GraduationCap, Code } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />

      {/* HERO */}
      <section className="relative grid-paper border-b border-[#1A1A1A]">
        <div className="max-w-[1400px] mx-auto px-6 pt-20 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            <div className="overline mb-6">
              <span className="bg-[#FF3B30] text-white px-2 py-1 mr-2">SPEC 01</span>
              REAL EXPERIENCE FOR ENGINEERING STUDENTS
            </div>
            <h1 className="font-heading text-5xl sm:text-7xl lg:text-[112px] font-black tracking-tighter uppercase leading-[0.92]">
              Join a virtual<br/>startup. Ship real<br/>
              <span className="inline-block bg-[#0A0A0A] text-white px-3">code.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-[#0A0A0A]">
              LaunchPad is a workshop where engineering students plug into virtual startups,
              claim tasks from real product backlogs, ship pull requests, and walk away with a
              <span className="font-bold"> verified experience certificate </span>
              employers can actually trust.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/register" data-testid="hero-cta-register" className="btn-primary inline-flex items-center gap-2">
                Sign up as a student <ArrowRight size={16} />
              </Link>
              <Link to="/login" data-testid="hero-cta-login" className="btn-ghost">I already have an account</Link>
            </div>
          </div>

          <div className="lg:col-span-4 border border-[#1A1A1A] bg-white">
            <div className="grid grid-cols-2">
              {[
                { k: "STARTUPS", v: "05" },
                { k: "OPEN TASKS", v: "13" },
                { k: "SKILLS", v: "24+" },
                { k: "CERT. ISSUED", v: "∞" },
              ].map((s, i) => (
                <div key={s.k} className={`p-6 ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b" : ""} border-[#1A1A1A]`}>
                  <div className="overline text-[#525252]">{s.k}</div>
                  <div className="font-heading text-4xl font-black mt-1">{s.v}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#1A1A1A] p-5 flex items-center gap-3">
              <span className="stamp">Verified</span>
              <span className="font-mono text-xs leading-snug">Every approved task adds to your verifiable engineering profile.</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-[#1A1A1A] bg-white">
        <div className="max-w-[1400px] mx-auto px-6 py-20">
          <div className="overline mb-3">PROTOCOL // 0X02</div>
          <h2 className="font-heading text-4xl sm:text-5xl font-black tracking-tight">How LaunchPad works.</h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 border border-[#1A1A1A]">
            {[
              { n: "01", t: "Sign up as a student", d: "Tell us your university, major, and year. No paywall.", I: GraduationCap },
              { n: "02", t: "Join a virtual startup", d: "Browse 5+ live startups with real tech stacks and backlogs.", I: Rocket },
              { n: "03", t: "Claim & ship a task", d: "Pick a task from the Kanban board. Submit a GitHub PR.", I: Code },
              { n: "04", t: "Get verified credit", d: "Approved tasks compound into a downloadable certificate.", I: ShieldCheck },
            ].map((s, i) => (
              <div key={s.n} className={`p-8 ${i < 3 ? "border-r" : ""} border-[#1A1A1A]`}>
                <s.I size={32} strokeWidth={1.4} />
                <div className="overline mt-6 text-[#525252]">STEP // {s.n}</div>
                <div className="font-heading text-2xl font-bold mt-2">{s.t}</div>
                <p className="text-sm text-[#525252] mt-3 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-b border-[#1A1A1A] bg-[#0A0A0A] text-white overflow-hidden">
        <div className="py-4 whitespace-nowrap">
          <div className="marquee-track inline-flex gap-10 font-heading font-black text-2xl tracking-tight uppercase">
            {Array.from({ length: 2 }).map((_, k) => (
              <span key={k} className="inline-flex gap-10">
                <span>Helix Robotics</span><span className="text-[#FF3B30]">/</span>
                <span>Stratos Climate</span><span className="text-[#FF3B30]">/</span>
                <span>Citadel Health</span><span className="text-[#FF3B30]">/</span>
                <span>Forge AI</span><span className="text-[#FF3B30]">/</span>
                <span>Beacon Mobility</span><span className="text-[#FF3B30]">/</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* BENTO FEATURES */}
      <section className="border-b border-[#1A1A1A]">
        <div className="max-w-[1400px] mx-auto px-6 py-20">
          <div className="overline mb-3">FEATURES // 0X03</div>
          <h2 className="font-heading text-4xl sm:text-5xl font-black tracking-tight">Built like a real engineering workflow.</h2>

          <div className="mt-12 grid grid-cols-12 gap-0 border border-[#1A1A1A]">
            <div className="col-span-12 md:col-span-7 p-10 border-b md:border-b-0 md:border-r border-[#1A1A1A] bg-white">
              <div className="overline text-[#525252]">CONTROL ROOM</div>
              <h3 className="font-heading text-3xl font-bold mt-2">Kanban-style task boards</h3>
              <p className="text-sm text-[#525252] mt-3 max-w-md">Open → In progress → In review → Completed. Every task has a difficulty, skill tags, and points.</p>
              <div className="mt-8 grid grid-cols-4 border border-[#1A1A1A]">
                {["OPEN", "PROGRESS", "REVIEW", "DONE"].map((s, i) => (
                  <div key={s} className={`p-3 ${i < 3 ? "border-r" : ""} border-[#1A1A1A]`}>
                    <div className="overline text-[#525252]">{s}</div>
                    <div className="mt-3 h-3 bg-[#0A0A0A]" style={{ width: `${[80, 55, 30, 60][i]}%` }} />
                    <div className="mt-2 h-3 bg-[#FF3B30]" style={{ width: `${[55, 70, 20, 45][i]}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-12 md:col-span-5 p-10 bg-[#FAFAFA]">
              <div className="overline text-[#525252]">SUBMISSION</div>
              <h3 className="font-heading text-3xl font-bold mt-2">GitHub PR-first</h3>
              <p className="text-sm text-[#525252] mt-3">Paste your pull request URL. Add notes. Mentor bot reviews and marks it verified.</p>
              <div className="mt-6 border border-[#1A1A1A] bg-white">
                <div className="px-4 py-3 border-b border-[#1A1A1A] flex items-center gap-2">
                  <GitBranch size={16} /><span className="font-mono text-xs">github.com/launchpad/helix/pull/42</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="overline text-[#525252]">STATUS</span>
                  <span className="tag tag-red">APPROVED</span>
                </div>
              </div>
            </div>

            <div className="col-span-12 md:col-span-5 p-10 border-t border-[#1A1A1A] md:border-r bg-[#FAFAFA]">
              <div className="overline text-[#525252]">VERIFIED PROFILE</div>
              <h3 className="font-heading text-3xl font-bold mt-2">Downloadable PDF certificate</h3>
              <p className="text-sm text-[#525252] mt-3">A clean, printable record of every approved task, ready for recruiters.</p>
              <div className="mt-6 border border-[#1A1A1A] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="overline">LAUNCHPAD // CERT</span>
                  <span className="stamp text-xs">VERIFIED</span>
                </div>
                <div className="font-heading text-xl font-black mt-3">ALEX RAMIREZ</div>
                <div className="overline text-[#525252]">MIT / CS / SR.</div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="border border-[#1A1A1A] p-2"><div className="overline text-[10px]">XP</div><div className="font-heading font-black text-2xl">240</div></div>
                  <div className="border border-[#1A1A1A] p-2"><div className="overline text-[10px]">TASKS</div><div className="font-heading font-black text-2xl">07</div></div>
                  <div className="border border-[#1A1A1A] p-2"><div className="overline text-[10px]">SKILLS</div><div className="font-heading font-black text-2xl">12</div></div>
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-7 p-10 border-t border-[#1A1A1A] bg-white">
              <div className="overline text-[#525252]">WHY STUDENTS JOIN</div>
              <h3 className="font-heading text-3xl font-bold mt-2">Resume gap, solved.</h3>
              <ul className="mt-6 space-y-3">
                {[
                  "Real product backlogs from 5+ virtual startups",
                  "Skills + points compound as you ship",
                  "Verifiable certificate recruiters can audit",
                  "Pick tasks by difficulty: easy / medium / hard",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <CheckCircle size={18} className="mt-0.5" />
                    <span className="text-sm">{t}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" data-testid="features-cta" className="btn-primary inline-flex items-center gap-2 mt-8">
                Start building <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0A0A0A] text-white">
        <div className="max-w-[1400px] mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="font-heading text-2xl font-black tracking-tighter">LAUNCHPAD</div>
            <div className="overline text-[#A3A3A3]">© {new Date().getFullYear()} ENGINEERED FOR ENGINEERS.</div>
          </div>
          <div className="flex gap-3">
            <Link to="/register" className="btn-primary">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
