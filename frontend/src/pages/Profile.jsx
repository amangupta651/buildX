import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api, API } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Download, ShieldCheck, Pencil, Save } from "lucide-react";

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
      <div className="min-h-screen bg-[#FAFAFA]">
        <Navbar />
        <div className="max-w-[1400px] mx-auto px-6 py-20 overline">LOADING //</div>
      </div>
    );
  }

  const stats = profile.stats;
  const skills = stats.skills_earned.length ? stats.skills_earned : (profile.user.skills || []);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        {/* Certificate-style header */}
        <div className="border border-[#1A1A1A] bg-white">
          <div className="px-6 py-3 border-b border-[#1A1A1A] flex items-center justify-between">
            <div className="overline">BUILDX // VERIFIED ENGINEERING PROFILE</div>
            <div className="overline text-[#525252]">CERT-ID {profile.user.id?.slice(-8).toUpperCase()}</div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-8 p-10 lg:border-r border-[#1A1A1A]">
              <div className="flex items-center gap-3">
                <span className="stamp">Verified</span>
                <span className="overline text-[#525252]">CERTIFICATE OF EXPERIENCE</span>
              </div>
              {!editing ? (
                <>
                  <h1 className="font-heading text-5xl sm:text-6xl font-black tracking-tighter uppercase mt-4">{profile.user.name || "Student"}</h1>
                  <div className="mt-2 font-mono text-sm text-[#525252]">
                    {profile.user.university || "—"} / {profile.user.major || "—"} / {profile.user.year || "—"}
                  </div>
                  {profile.user.bio && <p className="mt-4 text-sm max-w-2xl">{profile.user.bio}</p>}
                  <button data-testid="profile-edit" onClick={() => setEditing(true)} className="btn-ghost mt-6 inline-flex items-center gap-2"><Pencil size={14}/> Edit profile</button>
                </>
              ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
                  {[
                    ["name", "Name"], ["university", "University"], ["major", "Major"], ["year", "Year"],
                  ].map(([k, l]) => (
                    <div key={k}>
                      <label className="overline">{l}</label>
                      <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} data-testid={`profile-input-${k}`} className="w-full bg-transparent border-0 border-b-2 border-[#1A1A1A] px-0 py-2 font-mono text-sm focus:outline-none focus:border-[#FF3B30]" />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <label className="overline">Bio</label>
                    <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} data-testid="profile-input-bio" className="w-full bg-transparent border border-[#1A1A1A] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#FF3B30]" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="overline">Skills (comma separated)</label>
                    <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} data-testid="profile-input-skills" className="w-full bg-transparent border-0 border-b-2 border-[#1A1A1A] px-0 py-2 font-mono text-sm focus:outline-none focus:border-[#FF3B30]" />
                  </div>
                  <div className="md:col-span-2 flex gap-3 mt-2">
                    <button onClick={save} data-testid="profile-save" className="btn-primary inline-flex items-center gap-2"><Save size={14}/> Save</button>
                    <button onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
                  </div>
                </div>
              )}
            </div>
            <div className="lg:col-span-4 grid grid-cols-2">
              {[
                { k: "XP", v: stats.experience_points },
                { k: "TASKS DONE", v: stats.tasks_completed },
                { k: "STARTUPS", v: profile.startups.length },
                { k: "SKILLS", v: stats.skills_earned.length },
              ].map((s, i) => (
                <div key={s.k} className={`p-6 ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b" : ""} border-[#1A1A1A]`}>
                  <div className="overline text-[#525252]">{s.k}</div>
                  <div className="font-heading text-4xl font-black mt-1">{String(s.v || 0).padStart(2,"0")}</div>
                </div>
              ))}
              <div className="col-span-2 p-6 border-t border-[#1A1A1A]">
                <button
                  data-testid="profile-download-cert"
                  onClick={downloadCertificate}
                  className="btn-primary w-full inline-flex items-center justify-center gap-2"
                >
                  <Download size={16}/> Download PDF certificate
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="mt-10">
          <h2 className="font-heading text-3xl font-bold tracking-tight">Verified skills</h2>
          <div className="mt-4 border border-[#1A1A1A] bg-white p-5 flex flex-wrap gap-2">
            {skills.length === 0 && <span className="font-mono text-sm text-[#525252]">Complete tasks to earn verified skill tags.</span>}
            {skills.map((s) => (
              <span key={s} className="tag inline-flex items-center gap-1.5"><ShieldCheck size={12}/> {s}</span>
            ))}
          </div>
        </div>

        {/* Startups joined */}
        <div className="mt-10">
          <h2 className="font-heading text-3xl font-bold tracking-tight">Startups joined</h2>
          {profile.startups.length === 0 ? (
            <div className="mt-4 border border-[#1A1A1A] bg-white p-6 font-mono text-sm text-[#525252]">You haven't joined any startups yet.</div>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#1A1A1A]">
              {profile.startups.map((s, i) => (
                <div key={s.id} className={`p-6 bg-white ${i % 3 !== 2 ? "lg:border-r" : ""} ${i % 2 === 0 ? "md:border-r lg:border-r" : ""} border-b border-[#1A1A1A]`}>
                  <div className="overline text-[#525252]">{s.industry}</div>
                  <div className="font-heading text-2xl font-black mt-2">{s.name}</div>
                  <p className="text-sm mt-2 text-[#525252] line-clamp-2">{s.tagline}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submissions history */}
        <div className="mt-10 mb-16">
          <h2 className="font-heading text-3xl font-bold tracking-tight">Submission history</h2>
          <div className="mt-4 border border-[#1A1A1A] bg-white">
            {profile.submissions.length === 0 ? (
              <div className="p-6 font-mono text-sm text-[#525252]">No submissions yet.</div>
            ) : (
              profile.submissions.map((s) => (
                <div key={s.id} className="p-5 border-b last:border-b-0 border-[#1A1A1A] grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12 md:col-span-5">
                    <div className="overline text-[#525252]">{s.startup_name}</div>
                    <div className="font-heading text-base font-bold">{s.task_title}</div>
                  </div>
                  <div className="col-span-8 md:col-span-5 truncate">
                    <a className="font-mono text-xs underline" href={s.github_url} target="_blank" rel="noreferrer">{s.github_url}</a>
                    {s.feedback && <div className="text-xs text-[#525252] mt-1 line-clamp-1">{s.feedback}</div>}
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right">
                    <span className={`tag ${s.status === "approved" ? "tag-red" : s.status === "rejected" ? "tag-ink" : ""}`}>{s.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
