import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ArrowUpRight, Rocket, ListChecks, GitPullRequest, Award, GitBranch } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [startups, setStartups] = useState([]);

  useEffect(() => {
    if (user && user.role === "admin") return;
    (async () => {
      try {
        const [p, s] = await Promise.all([api.get("/profile/me"), api.get("/startups")]);
        setProfile(p.data);
        setStartups(s.data);
      } catch { /* noop */ }
    })();
  }, []);

  const stats = profile?.stats || { tasks_completed: 0, submissions_total: 0, experience_points: 0, skills_earned: [] };
  const joinedIds = new Set((profile?.startups || []).map((s) => s.id));
  const recommended = startups.filter((s) => !joinedIds.has(s.id)).slice(0, 3);

  // Admins get bounced to /admin
  if (user && user.role === "admin") return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        {/* Header + stats bento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 border border-white/10 bg-white/[0.02] p-8">
            <div className="font-mono text-xs text-white/40">// session {new Date().toISOString().slice(0,10)}</div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mt-3">
              Hey, {user?.name?.split(" ")[0] || "student"}.
            </h1>
            <p className="mt-4 max-w-2xl font-mono text-sm text-white/60 leading-relaxed">
              Pick a task, ship a PR, earn verified experience. Below is your control room.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/startups"
                data-testid="dash-cta-startups"
                className="inline-flex items-center gap-2 bg-white text-[#0A0A0A] font-mono text-sm font-semibold px-5 py-2.5 hover:bg-[#22D3EE] transition-colors"
              >
                Browse startups <ArrowUpRight size={14}/>
              </Link>
              <Link
                to="/profile"
                data-testid="dash-cta-profile"
                className="inline-flex items-center gap-2 font-mono text-sm text-white/80 hover:text-white border border-white/15 hover:border-white/40 px-5 py-2.5 transition-colors"
              >
                View profile
              </Link>
            </div>
          </div>

          <div className="lg:col-span-4 grid grid-cols-2 gap-3">
            {[
              { I: Rocket, k: "startups", v: profile?.startups?.length ?? 0, c: "#22D3EE" },
              { I: ListChecks, k: "tasks done", v: stats.tasks_completed, c: "#A3E635" },
              { I: GitPullRequest, k: "submissions", v: stats.submissions_total, c: "#F472B6" },
              { I: Award, k: "xp", v: stats.experience_points, c: "#FBBF24" },
            ].map((s) => (
              <div key={s.k} className="border border-white/10 bg-white/[0.02] p-5">
                <s.I size={18} strokeWidth={1.4} style={{ color: s.c }} />
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mt-4">{s.k}</div>
                <div className="font-heading text-3xl font-bold mt-1">{String(s.v).padStart(2,"0")}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Active startups */}
        <div className="mt-14">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-mono text-sm text-[#22D3EE]">// your startups</div>
              <h2 className="font-heading text-3xl font-bold tracking-tight mt-2">Active engagements</h2>
            </div>
            <Link to="/startups" className="font-mono text-sm text-white/60 hover:text-white transition-colors">See all →</Link>
          </div>
          {profile?.startups?.length ? (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.startups.map((s) => (
                <Link
                  key={s.id}
                  to={`/startups/${s.id}`}
                  data-testid={`dash-active-${s.id}`}
                  className="group border border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.04] p-6 transition-colors"
                >
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{s.industry || "startup"} · {s.stage}</div>
                  <div className="font-heading text-2xl font-bold mt-2 group-hover:text-[#22D3EE] transition-colors">{s.name}</div>
                  <p className="text-sm font-mono text-white/60 mt-2 line-clamp-2">{s.tagline}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 border border-white/10 bg-white/[0.02] p-8">
              <p className="font-mono text-sm text-white/70">You haven't joined any startups yet.</p>
              <Link
                to="/startups"
                data-testid="dash-empty-cta"
                className="mt-4 inline-flex items-center gap-2 bg-white text-[#0A0A0A] font-mono text-sm font-semibold px-5 py-2.5 hover:bg-[#22D3EE] transition-colors"
              >
                Browse startups →
              </Link>
            </div>
          )}
        </div>

        {/* Recent submissions */}
        <div className="mt-14">
          <div className="font-mono text-sm text-[#22D3EE]">// activity</div>
          <h2 className="font-heading text-3xl font-bold tracking-tight mt-2">Recent submissions</h2>

          <div className="mt-6 border border-white/10 bg-white/[0.02]">
            {profile?.submissions?.length ? profile.submissions.slice(0, 5).map((s) => {
              const statusColor = s.status === "approved" ? "#A3E635" : s.status === "rejected" ? "#F472B6" : "#FBBF24";
              return (
                <div key={s.id} className="p-5 border-b last:border-b-0 border-white/10 grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-12 md:col-span-6">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{s.startup_name}</div>
                    <div className="font-heading text-base font-bold mt-1">{s.task_title}</div>
                  </div>
                  <div className="col-span-8 md:col-span-4 truncate">
                    <a href={s.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-mono text-xs text-white/60 hover:text-white transition-colors truncate">
                      <GitBranch size={12}/> <span className="truncate">{s.github_url}</span>
                    </a>
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right">
                    <span
                      className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border rounded-full"
                      style={{ color: statusColor, borderColor: `${statusColor}55` }}
                    >
                      {s.status}
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 font-mono text-sm text-white/50">No submissions yet — claim a task to get going.</div>
            )}
          </div>
        </div>

        {/* Recommended */}
        {recommended.length > 0 && (
          <div className="mt-14 mb-16">
            <div className="font-mono text-sm text-[#22D3EE]">// for you</div>
            <h2 className="font-heading text-3xl font-bold tracking-tight mt-2">Recommended startups</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommended.map((s) => (
                <Link
                  key={s.id}
                  to={`/startups/${s.id}`}
                  data-testid={`dash-rec-${s.id}`}
                  className="group border border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.04] p-6 transition-colors"
                >
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{s.industry} · {s.stage}</div>
                  <div className="font-heading text-2xl font-bold mt-2 group-hover:text-[#22D3EE] transition-colors">{s.name}</div>
                  <p className="text-sm font-mono text-white/60 mt-2 line-clamp-2">{s.tagline}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
