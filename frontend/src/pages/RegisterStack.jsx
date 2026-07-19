import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, ChevronDown } from "lucide-react";

const TECH_STACK_OPTIONS = {
  frontend: {
    label: "Frontend",
    icon: "🎨",
    techs: [
      { id: "react", label: "React", popular: true },
      { id: "vue", label: "Vue.js" },
      { id: "angular", label: "Angular" },
      { id: "nextjs", label: "Next.js", popular: true },
      { id: "typescript", label: "TypeScript" },
      { id: "tailwind", label: "Tailwind CSS" },
    ],
  },
  backend: {
    label: "Backend",
    icon: "⚙️",
    techs: [
      { id: "nodejs", label: "Node.js", popular: true },
      { id: "python", label: "Python", popular: true },
      { id: "java", label: "Java", popular: true },
      { id: "go", label: "Go" },
      { id: "rust", label: "Rust" },
      { id: "csharp", label: "C#" },
      { id: "php", label: "PHP" },
      { id: "spring-boot", label: "Spring Boot" },
      { id: "django", label: "Django" },
      { id: "fastapi", label: "FastAPI" },
    ],
  },
  mobile: {
    label: "Mobile",
    icon: "📱",
    techs: [
      { id: "react-native", label: "React Native", popular: true },
      { id: "flutter", label: "Flutter" },
      { id: "swift", label: "Swift" },
      { id: "kotlin", label: "Kotlin" },
      { id: "expo", label: "Expo" },
    ],
  },
  devops: {
    label: "DevOps",
    icon: "🚀",
    techs: [
      { id: "docker", label: "Docker", popular: true },
      { id: "kubernetes", label: "Kubernetes", popular: true },
      { id: "aws", label: "AWS" },
      { id: "gcp", label: "GCP" },
      { id: "terraform", label: "Terraform" },
      { id: "ci-cd", label: "CI/CD" },
      { id: "jenkins", label: "Jenkins" },
      { id: "gitlab-ci", label: "GitLab CI" },
    ],
  },
  data: {
    label: "Data",
    icon: "📊",
    techs: [
      { id: "python-data", label: "Python Data", popular: true },
      { id: "sql", label: "SQL", popular: true },
      { id: "spark", label: "Apache Spark" },
      { id: "pandas", label: "Pandas" },
      { id: "postgresql", label: "PostgreSQL" },
      { id: "mongodb", label: "MongoDB" },
      { id: "elasticsearch", label: "Elasticsearch" },
    ],
  },
  ml: {
    label: "Machine Learning",
    icon: "🤖",
    techs: [
      { id: "tensorflow", label: "TensorFlow", popular: true },
      { id: "pytorch", label: "PyTorch", popular: true },
      { id: "llm", label: "LLM", popular: true },
      { id: "computer-vision", label: "Computer Vision" },
      { id: "scikit-learn", label: "Scikit-learn" },
      { id: "huggingface", label: "Hugging Face" },
    ],
  },
};

export default function RegisterStack() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [selectedTechs, setSelectedTechs] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [loading, setLoading] = useState(false);

  // If already has stack, redirect to dashboard
  useEffect(() => {
    if (user?.stack?.length > 0) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const toggleTech = (techId) => {
    setSelectedTechs((prev) =>
      prev.includes(techId) ? prev.filter((t) => t !== techId) : [...prev, techId]
    );
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSubmit = async () => {
    if (selectedTechs.length === 0) {
      toast.error("Please select at least one technology");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.patch("/auth/me", { stack: selectedTechs });
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="border border-white/10 bg-white/[0.02] p-8 mb-8">
            <div className="font-mono text-xs text-white/40">// welcome to buildX</div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mt-3">
              What technologies do you work with?
            </h1>
            <p className="mt-4 max-w-2xl font-mono text-sm text-white/60 leading-relaxed">
              Select your preferred technologies. We'll match you with real production assignments aligned to your skills. You can update this anytime in your profile.
            </p>
          </div>

          {/* Tech Stack Selection */}
          <div className="space-y-4 mb-8">
            {Object.entries(TECH_STACK_OPTIONS).map(([category, data]) => (
              <div key={category} className="border border-white/10 bg-white/[0.02]">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{data.icon}</span>
                    <div className="text-left">
                      <div className="font-heading text-lg font-bold">{data.label}</div>
                      <div className="font-mono text-xs text-white/40">
                        {data.techs.length} technologies
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`transition-transform ${expandedCategories[category] ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Technology Grid */}
                {expandedCategories[category] && (
                  <div className="border-t border-white/10 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {data.techs.map((tech) => (
                        <button
                          key={tech.id}
                          onClick={() => toggleTech(tech.id)}
                          className={`p-3 border rounded transition-all text-sm font-mono ${
                            selectedTechs.includes(tech.id)
                              ? "border-[#22D3EE] bg-[#22D3EE]/10 text-[#22D3EE]"
                              : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{tech.label}</span>
                            {selectedTechs.includes(tech.id) && (
                              <CheckCircle2 size={14} className="ml-1" />
                            )}
                          </div>
                          {tech.popular && (
                            <div className="text-[10px] text-[#FBBF24] mt-1">popular</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Selected Summary */}
          <div className="border border-white/10 bg-white/[0.02] p-4 mb-8">
            <div className="font-mono text-sm mb-3">
              <span className="text-white/60">Selected technologies: </span>
              <span className="text-[#22D3EE] font-bold">{selectedTechs.length}</span>
            </div>
            {selectedTechs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTechs.map((tech) => (
                  <span
                    key={tech}
                    className="font-mono text-xs bg-[#22D3EE]/10 border border-[#22D3EE]/40 text-[#22D3EE] px-2 py-1 rounded"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={selectedTechs.length === 0 || loading}
            className={`w-full font-mono text-sm font-semibold py-3 transition-colors inline-flex items-center justify-center gap-2 ${
              selectedTechs.length === 0 || loading
                ? "bg-white/10 text-white/40 cursor-not-allowed"
                : "bg-white text-[#0A0A0A] hover:bg-[#22D3EE]"
            }`}
          >
            {loading ? "Saving..." : <>Continue to dashboard <ArrowRight size={14} /></>}
          </button>

          {/* Info Box */}
          <div className="mt-8 border border-white/10 bg-white/[0.02] p-4">
            <div className="font-mono text-xs text-white/60">
              💡 <span className="text-white/70">Tip:</span> Select multiple technologies to see more assignment options. You'll receive tasks that match your selected tech stack.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
