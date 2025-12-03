'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const features = [
    { title: 'AI Tutor', color: 'bg-indigo-500', icon: '🤖', desc: 'Instant Help' },
    { title: 'Quizzes', color: 'bg-orange-500', icon: '⚡', desc: 'Auto-Gen' },
    { title: 'Grading', color: 'bg-green-500', icon: '📝', desc: 'Feedback' },
    { title: 'Schedule', color: 'bg-blue-500', icon: '📅', desc: 'Planner' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      
      {/* Top Section with Search & Profile */}
      <div className="bg-white p-6 rounded-b-[2.5rem] shadow-sm mb-6 pb-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200">
              U
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Welcome to</p>
              <h1 className="text-xl font-black text-slate-900 leading-none">UniBot LMS</h1>
            </div>
          </div>
          <Link href="/login" className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-xs font-bold hover:bg-slate-200 transition">
            Login
          </Link>
        </div>

        {/* Hero Search / Call to Action */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-200 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Ace Your Exams</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-[200px]">AI-powered learning for the modern student.</p>
            <Link href="/login" className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition inline-block">
              Get Started →
            </Link>
          </div>
          <div className="absolute -right-5om-[-20px] text-8xl opacity-20 rotate-12">🎓</div>
        </div>
      </div>

      {/* Feature Grid (The "Android Home" Style) */}
      <div className="px-6">
        <h3 className="font-bold text-lg text-slate-900 mb-4">Explore Features</h3>
        <div className="grid grid-cols-2 gap-4">
          {features.map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`${f.color} p-5 rounded-3xl text-white shadow-lg relative overflow-hidden h-40 flex flex-col justify-between group cursor-pointer hover:scale-[1.02] transition-transform`}
            >
              <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
                {f.icon}
              </div>
              <div>
                <h4 className="font-bold text-lg leading-tight">{f.title}</h4>
                <p className="text-white/80 text-xs mt-1">{f.desc}</p>
              </div>
              {/* Decor */}
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Floating Bar */}
      <div className="fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md border border-white/20 p-2 rounded-full shadow-2xl flex justify-between items-center px-6 md:max-w-md md:mx-auto">
        {['🏠', '📚', '💬', '👤'].map((icon, i) => (
          <button key={i} className={`text-2xl p-2 rounded-full transition ${i === 0 ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
            {icon}
          </button>
        ))}
      </div>

    </div>
  );
}