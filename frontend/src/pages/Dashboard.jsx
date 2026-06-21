import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ArrowUpRight, Rocket, ListChecks, GitPullRequest, Award } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [startups, setStartups] = useState([]);

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border border-[#1A1A1A] bg-white">
          <div className="lg:col-span-8 p-8 border-b lg:border-b-0 lg:border-r border-[#1A1A1A]">
            <div className="overline text-[#525252]">SESSION // {new Date().toISOString().slice(0,10)}</div>
            <h1 className="font-heading text-5xl font-black tracking-tighter mt-2">
              HEY, {(user?.name || "STUDENT").toUpperCase()}.
            </h1>
            <p className="mt-3 text-sm text-[#525252] max-w-2xl">Pick a task, ship a PR, earn verified experience. Below is your control room.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/startups" data-testid="dash-cta-startups" className="btn-primary inline-flex items-center gap-2">
                Browse startups <ArrowUpRight size={16}/>
              </Link>
              <Link to="/profile" data-testid="dash-cta-profile" className="btn-ghost">View profile</Link>
            </div>
          </div>
          <div className="lg:col-span-4 grid grid-cols-2">
            {[
              { I: Rocket, k: "STARTUPS", v: profile?.startups?.length ?? 0 },
              { I: ListChecks, k: "TASKS DONE", v: stats.tasks_completed },
              { I: GitPullRequest, k: "SUBMISSIONS", v: stats.submissions_total },
              { I: Award, k: "XP", v: stats.experience_points },
            ].map((s, i) => (
              <div key={s.k} className={`p-6 ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b" : ""} border-[#1A1A1A]`}>
                <s.I size={20} strokeWidth={1.5}/>
                <div className="overline text-[#525252] mt-4">{s.k}</div>
                <div className="font-heading text-4xl font-black mt-1">{String(s.v).padStart(2,"0")}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Active startups */}
        <div className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-3xl font-bold tracking-tight">Your active startups</h2>
            <Link to="/startups" className="overline underline">SEE ALL →</Link>
          </div>
          {profile?.startups?.length ? (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#1A1A1A]">
              {profile.startups.map((s, i) => (
                <Link
                  key={s.id}
                  to={`/startups/${s.id}`}
                  data-testid={`dash-active-${s.id}`}
                  className={`p-6 bg-white hover:bg-[#0A0A0A] hover:text-white transition-colors ${i % 3 !== 2 ? "md:border-r" : ""} ${i < (profile.startups.length - (profile.startups.length % 3 || 3)) ? "border-b md:border-b" : ""} border-[#1A1A1A]`}
                >
                  <div className="overline text-[#525252]">{s.industry || "STARTUP"}</div>
                  <div className="font-heading text-2xl font-black mt-2">{s.name}</div>
                  <p className="text-sm mt-2 line-clamp-2">{s.tagline}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 border border-[#1A1A1A] p-8 bg-white">
              <p className="font-mono text-sm">You haven't joined any startups yet.</p>
              <Link to="/startups" className="btn-primary inline-flex mt-4" data-testid="dash-empty-cta">Browse startups →</Link>
            </div>
          )}
        </div>

        {/* Recent submissions */}
        <div className="mt-12">
          <h2 className="font-heading text-3xl font-bold tracking-tight">Recent submissions</h2>
          <div className="mt-5 border border-[#1A1A1A] bg-white">
            {profile?.submissions?.length ? profile.submissions.slice(0, 5).map((s) => (
              <div key={s.id} className="p-5 border-b last:border-b-0 border-[#1A1A1A] grid grid-cols-12 gap-4 items-center">
                <div className="col-span-12 md:col-span-6">
                  <div className="overline text-[#525252]">{s.startup_name}</div>
                  <div className="font-heading text-lg font-bold mt-1">{s.task_title}</div>
                </div>
                <div className="col-span-8 md:col-span-4 truncate">
                  <a href={s.github_url} target="_blank" rel="noreferrer" className="font-mono text-xs underline truncate">{s.github_url}</a>
                </div>
                <div className="col-span-4 md:col-span-2 text-right">
                  <span className={`tag ${s.status === "approved" ? "tag-red" : s.status === "rejected" ? "tag-ink" : ""}`}>{s.status}</span>
                </div>
              </div>
            )) : (
              <div className="p-8 font-mono text-sm">No submissions yet — claim a task to get going.</div>
            )}
          </div>
        </div>

        {/* Recommended */}
        {recommended.length > 0 && (
          <div className="mt-12 mb-16">
            <h2 className="font-heading text-3xl font-bold tracking-tight">Recommended startups</h2>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#1A1A1A]">
              {recommended.map((s, i) => (
                <Link key={s.id} to={`/startups/${s.id}`} className={`p-6 bg-white hover:bg-[#FF3B30] hover:text-white transition-colors ${i < 2 ? "md:border-r" : ""} border-[#1A1A1A]`} data-testid={`dash-rec-${s.id}`}>
                  <div className="overline">{s.industry}</div>
                  <div className="font-heading text-2xl font-black mt-2">{s.name}</div>
                  <p className="text-sm mt-2 line-clamp-2">{s.tagline}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
