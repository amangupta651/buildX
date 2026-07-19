import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight } from "lucide-react";

const TECH_STACKS = [
  { id: "frontend", label: "Frontend", icon: "🎨", techs: ["React", "Vue", "Angular", "Next.js", "TypeScript"] },
  { id: "backend", label: "Backend", icon: "⚙️", techs: ["Node.js", "Python", "Go", "Java", "Rust"] },
  { id: "mobile", label: "Mobile", icon: "📱", techs: ["React Native", "Flutter", "Swift", "Kotlin"] },
  { id: "devops", label: "DevOps", icon: "🚀", techs: ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform"] },
  { id: "data", label: "Data", icon: "📊", techs: ["Python", "SQL", "Spark", "TensorFlow", "Pandas"] },
  { id: "ml", label: "Machine Learning", icon: "🤖", techs: ["TensorFlow", "PyTorch", "LLM", "Computer Vision"] },
];

export default function RegisterStack() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  // If already has stack, redirect to dashboard
  useEffect(() => {
    if (user?.stack?.length > 0) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const toggleStack = (stackId) => {
    setSelected((prev) =>
      prev.includes(stackId) ? prev.filter((s) => s !== stackId) : [...prev, stackId]
    );
  };

  const handleSubmit = async () => {
    if (selected.length === 0) {
      toast.error("Please select at least one stack");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.patch("/auth/me", { stack: selected });
      setUser(data);
      toast.success("Stack preference saved!");
      navigate("/dashboard", { replace: true });
    } catch (e) {
      toast.error("Failed to save preferences");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="overline">LOADING //</div>
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="border border-white/10 bg-white/[0.02] p-8 mb-8">
            <div className="font-mono text-xs text-white/40">// welcome to buildX</div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mt-3">
              What's your tech stack?
            </h1>
            <p className="mt-4 max-w-2xl font-mono text-sm text-white/60 leading-relaxed">
              Select your preferred technology stacks. We'll match you with tasks aligned to your interests. You can update this anytime in your profile.
            </p>
          </div>

          {/* Stack Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {TECH_STACKS.map((stack) => (
              <button
                key={stack.id}
                onClick={() => toggleStack(stack.id)}
                className={`text-left p-5 border transition-all ${
                  selected.includes(stack.id)
                    ? "border-[#22D3EE] bg-[#22D3EE]/5"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-2xl mb-2">{stack.icon}</div>
                    <div className="font-heading text-lg font-bold">{stack.label}</div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {stack.techs.map((tech) => (
                        <span
                          key={tech}
                          className="font-mono text-[10px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                  {selected.includes(stack.id) && (
                    <CheckCircle2 size={20} className="text-[#22D3EE] flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Selected Count */}
          <div className="border border-white/10 bg-white/[0.02] p-4 mb-8">
            <div className="font-mono text-sm">
              <span className="text-white/60">selected: </span>
              <span className="text-[#22D3EE] font-bold">{selected.length} stack{selected.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={selected.length === 0 || loading}
            className={`w-full font-mono text-sm font-semibold py-3 transition-colors inline-flex items-center justify-center gap-2 ${
              selected.length === 0 || loading
                ? "bg-white/10 text-white/40 cursor-not-allowed"
                : "bg-white text-[#0A0A0A] hover:bg-[#22D3EE]"
            }`}
          >
            {loading ? "Saving..." : <>Continue to dashboard <ArrowRight size={14} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
