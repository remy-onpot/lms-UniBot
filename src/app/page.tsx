import Link from 'next/link';
import { UniBotMascot } from '@/components/ui/UniBotMascot'; // ✅ FIXED IMPORT
import { 
  BookOpen, Brain, Zap, CheckCircle, BarChart, Layers, 
  ArrowRight, ShieldCheck, Globe 
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 text-slate-900">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
               <UniBotMascot size={32} variant="dashboard" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">UniBot<span className="text-indigo-600">.LMS</span></span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition">
              Log In
            </Link>
            <Link 
              href="/login?mode=signup" 
              className="hidden sm:flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-20 px-6 overflow-hidden relative">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          
          <div className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
              <Zap className="w-3 h-3" /> AI-Powered Education
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
              The <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-purple-600">Smartest</span> way to manage your campus.
            </h1>
            
            <p className="text-lg text-slate-600 mb-8 max-w-lg leading-relaxed">
              Automate grading, generate instant syllabi, and give every student a personal AI tutor. Built for the modern Ghanaian university.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/login"
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2"
              >
                Launch Console
              </Link>
              <a 
                href="#features"
                className="px-8 py-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-lg transition flex items-center justify-center"
              >
                View Features
              </a>
            </div>

            <div className="mt-8 flex items-center gap-4 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> Offline-First</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> WhatsApp Alerts</span>
            </div>
          </div>

          {/* HERO IMAGE / MASCOT */}
          <div className="relative flex justify-center lg:justify-end">
             {/* Abstract Decor */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl animate-pulse" />
             
             {/* The Mascot */}
             <div className="relative z-10 w-[350px] h-[350px] lg:w-[500px] lg:h-[500px] drop-shadow-2xl hover:scale-105 transition-transform duration-500 cursor-pointer">
                {/* 🏆 WE USE THE LANDING VARIANT HERE */}
                <UniBotMascot 
                  variant="landing" 
                  size={500} 
                  emotion="happy" 
                  action="wave"
                  className="w-full h-full"
                />
             </div>
          </div>

        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-black text-slate-900 mb-4">Everything you need to run a modern class.</h2>
            <p className="text-slate-500">UniBot combines a traditional LMS with next-gen AI tools to save lecturers 10+ hours a week.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Brain} 
              title="AI Auto-Grading" 
              desc="Upload assignment PDFs and let Gemini 2.0 grade them based on your rubric. You just review and approve."
            />
            <FeatureCard 
              icon={BookOpen} 
              title="Instant Syllabus" 
              desc="Drop a raw PDF handout and watch UniBot parse it into weekly topics, quizzes, and flashcards instantly."
            />
            <FeatureCard 
              icon={Globe} 
              title="Offline Resilience" 
              desc="Built for Ghana. Students can download quizzes and content to work offline. Syncs automatically when online."
            />
            <FeatureCard 
              icon={BarChart} 
              title="Live Analytics" 
              desc="Track student performance in real-time. Identify struggling students before the final exam."
            />
            <FeatureCard 
              icon={Layers} 
              title="Cohort Management" 
              desc="Course Reps can create 'Shadow Classes' to organize materials for their department easily."
            />
            <FeatureCard 
              icon={ShieldCheck} 
              title="Enterprise Security" 
              desc="Bank-grade encryption and Role-Based Access Control (RBAC) ensure exam data stays safe."
            />
          </div>
        </div>
      </section>

      {/* --- CTA FOOTER --- */}
      <footer className="bg-slate-900 text-white py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">Ready to upgrade your classroom?</h2>
          <p className="text-indigo-200 text-lg mb-10">Join over 500+ lecturers utilizing AI to teach better.</p>
          <Link 
            href="/login?mode=signup" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-indigo-50 transition"
          >
            Get Started for Free <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-8 text-slate-500 text-sm">© {new Date().getFullYear()} UniBot LMS. Built for Ghana 🇬🇭</p>
        </div>
      </footer>

    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:shadow-lg transition-all group">
      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm mb-6 group-hover:scale-110 transition-transform">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}