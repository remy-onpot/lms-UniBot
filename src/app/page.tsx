'use client';

import { useState } from 'react';
import { UniBotFace } from '@/components/ui/UniBotFace'; // ✅ Brand Identity
import { 
  BookOpen, Brain, Zap, CheckCircle, BarChart, Layers 
} from 'lucide-react';

export default function LandingPage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    {
      icon: Brain,
      title: "AI Tutor",
      description: "Get instant help and personalized explanations 24/7.",
      color: "from-violet-500 to-purple-600"
    },
    {
      icon: Zap,
      title: "Auto-Generated Quizzes",
      description: "Turn any PDF into a study quiz in seconds.",
      color: "from-orange-500 to-red-600"
    },
    {
      icon: CheckCircle,
      title: "Instant Grading",
      description: "Upload assignments and get AI-powered feedback immediately.",
      color: "from-green-500 to-teal-600"
    },
    {
      icon: BarChart,
      title: "Progress Analytics",
      description: "Track your learning journey with detailed insights.",
      color: "from-blue-500 to-cyan-600"
    },
    {
      icon: Layers,
      title: "Smart Library",
      description: "Organize and access all your course materials in one place.",
      color: "from-pink-500 to-rose-600"
    },
    {
      icon: BookOpen,
      title: "Gamified Learning",
      description: "Earn XP, maintain streaks, and climb the leaderboard.",
      color: "from-indigo-500 to-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden font-sans selection:bg-indigo-100">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-3">
              {/* ✅ Brand Logo */}
              <UniBotFace size="sm" />
              <span className="text-xl font-black text-slate-900 tracking-tight">UniBot</span>
            </div>
            
            <div className="flex items-center gap-4">
              <a href="/login" className="px-5 py-2.5 text-slate-600 hover:text-indigo-600 font-bold text-sm transition">
                Login
              </a>
              <a href="/login" className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition shadow-lg shadow-slate-200">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <div className="text-center lg:text-left space-y-8 relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">The Future of EdTech</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
                Your Personal <br/>
                <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-violet-600">
                  AI Professor
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                UniBot isn't just a tool; it's your study partner. It reads your handouts, quizzes you on your weak spots, and helps you ace your exams.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a href="/login" className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] transition flex items-center justify-center gap-2">
                  Start Learning
                  <span className="text-xl">→</span>
                </a>
                <button className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-lg hover:border-indigo-200 hover:bg-indigo-50 transition">
                  How it Works
                </button>
              </div>
            </div>

            {/* Right Visual: The Hero Character */}
            <div className="relative hidden lg:block">
              <div className="relative w-full aspect-square flex items-center justify-center">
                {/* Glow Effects */}
                <div className="absolute inset-0 bg-linear-to-tr from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                
                {/* ✅ The Hero Character */}
                <div className="relative z-10 w-80 h-80 transition-transform duration-700 hover:scale-105 hover:rotate-3">
                   <UniBotFace size="xl" className="w-full h-full shadow-2xl border-8 border-white" />
                   
                   {/* Floating UI Elements (Decor) */}
                   <div className="absolute -left-12 top-20 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-bounce delay-100">
                      <span className="text-2xl">🅰️+</span>
                   </div>
                   <div className="absolute -right-8 bottom-20 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-bounce delay-300">
                      <span className="text-2xl">⚡</span>
                   </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Powerful features packed into one intelligent interface.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                className={`group relative p-8 bg-slate-50 rounded-3xl border-2 transition-all duration-300 ${
                  hoveredFeature === i 
                    ? 'border-indigo-500 bg-white shadow-2xl shadow-indigo-100 -translate-y-1' 
                    : 'border-transparent hover:border-indigo-200'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-linear-to-br ${feature.color} text-white shadow-lg`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto text-center flex flex-col items-center">
          <UniBotFace size="sm" className="mb-4 grayscale opacity-50" />
          <p className="text-slate-500 font-medium">
            © 2024 UniBot LMS. Built for students, by students.
          </p>
        </div>
      </footer>
    </div>
  );
}