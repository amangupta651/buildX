import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Download, ShieldCheck, Pencil, Save, GitBranch } from "lucide-react";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", university: "", major: "", year: "", bio: "", skills: "" });

  useEffect(() => {
    api.get("/profile/me").then((r) => {
      setProfile(r.data);
      const u = r.data.user;
      setForm({
        name: u.name || "",
        university: u.university || "",
        major: u.major || "",
        year: u.year || "",
        bio: u.bio || "",
        skills: (u.skills || []).join(", "),
      });
    });
  }, []);

  const save = async () => {
    try {
      const payload = {
        ...form,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const { data } = await api.patch("/auth/me", payload);
      setUser(data);
      setEditing(false);
      toast.success("Profile updated.");
      const r = await api.get("/profile/me");
      setProfile(r.data);
    } catch {
      toast.error("Could not update.");
    }
  };

  const downloadCertificate = async () => {
    try {
      const res = await api.get("/profile/me/certificate", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `buildx-certificate-${(user?.name || "student").replace(/\s+/g, "_").toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Certificate downloaded.");
    } catch {
      toast.error("Could not download certificate.");
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <Navbar />
        <div className="max-w-[1400px] mx-auto px-6 py-20 font-mono text-sm text-white/50">// loading</div>
      </div>
    );
  }

  const stats = profile.stats;
  const skills = stats.skills_earned.length ? stats.skills_earned : (profile.user.skills || []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        {/* Certificate-style header */}
        <div className="relative border border-white/10 bg-white/[0.02]">
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #22D3EE, transparent)" }} />
          <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="font-mono text-xs text-[#22D3EE]">// verified engineering profile</div>
            <div className="font-mono text-xs text-white/40">CERT-ID {profile.user.id?.slice(-8).toUpperCase()}</div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-8 p-8 lg:border-r border-white/10">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border rounded-full text-[#A3E635] border-[#A3E635]/40">
                  ✓ verified
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">certificate of experience</span>
              </div>
              {!editing ? (
                <>
                  <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mt-4">{profile.user.name || "Student"}</h1>
                  <div className="mt-2 font-mono text-sm text-white/50">
                    {profile.user.university || "—"} · {profile.user.major || "—"} · {profile.user.year || "—"}
                  </div>
                  {profile.user.bio && <p className="mt-4 font-mono text-sm text-white/70 max-w-2xl leading-relaxed">{profile.user.bio}</p>}
                  <button
                    data-testid="profile-edit"
                    onClick={() => setEditing(true)}
                    className="mt-6 inline-flex items-center gap-2 font-mono text-sm text-white/70 hover:text-white border border-white/15 hover:border-white/40 px-4 py-2 transition-colors"
                  >
                    <Pencil size={14}/> Edit profile
                  </button>
                </>
              ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
                  {[
                    ["name", "Name"], ["university", "University"], ["major", "Major"], ["year", "Year"],
                  ].map(([k, l]) => (
                    <div key={k}>
                      <label className="font-mono text-[10px] uppercase tracking-widest text-white/50">{l}</label>
                      <input
                        value={form[k]}
                        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                        data-testid={`profile-input-${k}`}
                        className="w-full bg-transparent border-0 border-b border-white/15 focus:border-[#22D3EE] px-0 py-2 font-mono text-sm text-white focus:outline-none"
                      />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-white/50">Bio</label>
                    <textarea
                      rows={3}
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      data-testid="profile-input-bio"
                      className="w-full bg-transparent border border-white/15 focus:border-[#22D3EE] px-3 py-2 font-mono text-sm text-white focus:outline-none mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-white/50">Skills (comma separated)</label>
                    <input
                      value={form.skills}
                      onChange={(e) => setForm({ ...form, skills: e.target.value })}
                      data-testid="profile-input-skills"
                      className="w-full bg-transparent border-0 border-b border-white/15 focus:border-[#22D3EE] px-0 py-2 font-mono text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-3 mt-2">
                    <button
                      onClick={save}
                      data-testid="profile-save"
                      className="inline-flex items-center gap-2 bg-white text-[#0A0A0A] font-mono text-sm font-semibold px-5 py-2.5 hover:bg-[#22D3EE] transition-colors"
                    >
                      <Save size={14}/> Save
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="font-mono text-sm text-white/60 hover:text-white border border-white/15 hover:border-white/40 px-5 py-2.5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="lg:col-span-4 grid grid-cols-2">
              {[
                { k: "XP", v: stats.experience_points, c: "#FBBF24" },
                { k: "tasks done", v: stats.tasks_completed, c: "#A3E635" },
                { k: "startups", v: profile.startups.length, c: "#22D3EE" },
                { k: "skills", v: stats.skills_earned.length, c: "#F472B6" },
              ].map((s, i) => (
                <div key={s.k} className={`p-6 ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b" : ""} border-white/10`}>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{s.k}</div>
                  <div className="font-heading text-3xl font-bold mt-1" style={{ color: s.c }}>{String(s.v || 0).padStart(2,"0")}</div>
                </div>
              ))}
              <div className="col-span-2 p-5 border-t border-white/10">
                <button
                  data-testid="profile-download-cert"
                  onClick={downloadCertificate}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#22D3EE] text-[#0A0A0A] font-mono text-sm font-semibold py-3 hover:bg-white transition-colors"
                >
                  <Download size={16}/> Download PDF certificate
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="mt-10">
          <div className="font-mono text-sm text-[#22D3EE]">// verified skills</div>
          <h2 className="font-heading text-2xl font-bold tracking-tight mt-2">Skill tags</h2>
          <div className="mt-4 border border-white/10 bg-white/[0.02] p-5 flex flex-wrap gap-2">
            {skills.length === 0 && <span className="font-mono text-sm text-white/50">Complete tasks to earn verified skill tags.</span>}
            {skills.map((s) => (
              <span key={s} className="font-mono text-xs inline-flex items-center gap-1.5 bg-[#A3E635]/10 border border-[#A3E635]/40 text-[#A3E635] px-2.5 py-1">
                <ShieldCheck size={12}/> {s}
              </span>
            ))}
          </div>
        </div>

        {/* Startups joined */}
        <div className="mt-10">
          <div className="font-mono text-sm text-[#22D3EE]">// engagements</div>
          <h2 className="font-heading text-2xl font-bold tracking-tight mt-2">Startups joined</h2>
          {profile.startups.length === 0 ? (
            <div className="mt-4 border border-white/10 bg-white/[0.02] p-6 font-mono text-sm text-white/50">You haven't joined any startups yet.</div>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.startups.map((s) => (
                <div key={s.id} className="border border-white/10 bg-white/[0.02] p-5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{s.industry}</div>
                  <div className="font-heading text-xl font-bold mt-2">{s.name}</div>
                  <p className="text-sm font-mono text-white/60 mt-2 line-clamp-2">{s.tagline}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submissions history */}
        <div className="mt-10 mb-16">
          <div className="font-mono text-sm text-[#22D3EE]">// activity log</div>
          <h2 className="font-heading text-2xl font-bold tracking-tight mt-2">Submission history</h2>
          <div className="mt-4 border border-white/10 bg-white/[0.02]">
            {profile.submissions.length === 0 ? (
              <div className="p-6 font-mono text-sm text-white/50">No submissions yet.</div>
            ) : (
              profile.submissions.map((s) => {
                const statusColor = s.status === "approved" ? "#A3E635" : s.status === "rejected" ? "#F472B6" : "#FBBF24";
                return (
                  <div key={s.id} className="p-5 border-b last:border-b-0 border-white/10 grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-12 md:col-span-5">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{s.startup_name}</div>
                      <div className="font-heading text-base font-bold mt-1">{s.task_title}</div>
                    </div>
                    <div className="col-span-8 md:col-span-5 truncate">
                      <a
                        className="inline-flex items-center gap-2 font-mono text-xs text-white/60 hover:text-white transition-colors truncate"
                        href={s.github_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <GitBranch size={12}/> <span className="truncate">{s.github_url}</span>
                      </a>
                      {s.feedback && <div className="text-xs font-mono text-white/40 mt-1 line-clamp-1">{s.feedback}</div>}
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
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
