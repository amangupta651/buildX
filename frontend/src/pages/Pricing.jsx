import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Check, Sparkles, Zap, Trophy } from "lucide-react";

const ICONS = { free: Zap, pro: Sparkles, industry: Trophy };
const ACCENTS = { free: "#94A3B8", pro: "#22D3EE", industry: "#FBBF24" };

export default function Pricing() {
  const { user, refresh } = useAuth();
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    api.get("/plans").then((r) => setPlans(r.data));
  }, []);

  const currentPlan = user ? user.plan || "free" : null;

  const upgrade = async (planId) => {
    if (!user) {
      nav("/register");
      return;
    }
    setBusy(planId);
    try {
      const { data } = await api.post("/billing/upgrade", { plan: planId });
      await refresh();
      toast.success(data.message);
      nav("/dashboard");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="font-mono text-sm text-[#22D3EE]">// pricing</div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mt-4">
            Work in virtual startups.
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, #22D3EE, #F0F9FF)" }}
            >
              Build verified experience.
            </span>
          </h1>
          <p className="mt-6 font-mono text-sm text-white/60 max-w-xl mx-auto">
            Start free with a single project. Upgrade when you want unlimited startups and an AI mentor in your pocket.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((p) => {
            const Icon = ICONS[p.id] || Sparkles;
            const accent = ACCENTS[p.id] || "#22D3EE";
            const isCurrent = currentPlan === p.id;
            const isHighlighted = p.id === "pro";
            return (
              <div
                key={p.id}
                data-testid={`plan-card-${p.id}`}
                className={`relative border p-8 flex flex-col ${
                  isHighlighted
                    ? "border-white/40 bg-white/[0.04]"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                {isHighlighted && (
                  <div className="absolute -top-3 left-8 font-mono text-[10px] uppercase tracking-widest px-2 py-1 bg-[#22D3EE] text-[#0A0A0A]">
                    most popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-8 font-mono text-[10px] uppercase tracking-widest px-2 py-1 bg-[#A3E635] text-[#0A0A0A]">
                    your plan
                  </div>
                )}

                <Icon size={22} strokeWidth={1.5} style={{ color: accent }} />
                <div className="mt-4 font-heading text-2xl font-bold">{p.name}</div>
                <div className="mt-1 font-mono text-sm text-white/60">{p.tagline}</div>

                <div className="mt-8 flex items-baseline gap-2">
                  {p.price_inr === 0 ? (
                    <span className="font-heading text-5xl font-bold">Free</span>
                  ) : (
                    <>
                      <span className="font-heading text-5xl font-bold">₹{p.price_inr}</span>
                      <span className="font-mono text-sm text-white/50">/ {p.cadence}</span>
                    </>
                  )}
                </div>

                <ul className="mt-8 space-y-3 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 font-mono text-sm text-white/80">
                      <Check size={16} strokeWidth={2} style={{ color: accent }} className="mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  data-testid={`plan-cta-${p.id}`}
                  disabled={isCurrent || busy === p.id}
                  onClick={() => (p.id === "free" ? nav(user ? "/dashboard" : "/register") : upgrade(p.id))}
                  className={`mt-8 w-full font-mono text-sm font-semibold py-3 transition-colors ${
                    isCurrent
                      ? "bg-white/5 text-white/50 border border-white/10 cursor-default"
                      : isHighlighted
                        ? "bg-[#22D3EE] text-[#0A0A0A] hover:bg-white"
                        : "bg-white text-[#0A0A0A] hover:bg-[#22D3EE]"
                  }`}
                >
                  {busy === p.id
                    ? "Processing…"
                    : isCurrent
                      ? "Current plan"
                      : p.id === "free"
                        ? user ? "Continue free" : "Start free"
                        : p.id === "pro"
                          ? "Upgrade to Pro →"
                          : "Join Program →"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-14"></div>
      </div>
    </div>
  );
}
