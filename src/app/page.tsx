'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';

// --- Hero Sparkles / Background Effect ---
const GridPattern = () => (
  <svg className="absolute inset-0 -z-10 h-full w-full stroke-gray-200 mask-[radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true">
    <defs>
      <pattern id="0787a7c5-978c-4f66-83c7-11c213f99cb7" width={200} height={200} x="50%" y={-1} patternUnits="userSpaceOnUse">
        <path d="M.5 200V.5H200" fill="none" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" strokeWidth={0} fill="url(#0787a7c5-978c-4f66-83c7-11c213f99cb7)" />
  </svg>
);

export default function LandingPage() {
  const router = useRouter();
  const [dbStatus, setDbStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9]);

  useEffect(() => {
    async function checkConnection() {
      try {
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error && error.code !== 'PGRST116') {
          setDbStatus('error');
        } else {
          setDbStatus('connected');
        }
      } catch (err) {
        setDbStatus('error');
      }
    }
    checkConnection();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/70 backdrop-blur-xl border-b border-slate-200/50 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎓</span>
              <span className="text-xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                UniBot
              </span>
              {dbStatus === 'connected' && (
                <span className="hidden sm:inline-block ml-3 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] uppercase tracking-wider font-bold rounded-full border border-green-200">
                  System Online
                </span>
              )}
            </div>
            <div className="flex items-center gap-6">
              <Link href="/ai-assistant" className="hidden md:block text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                AI Assistant
              </Link>
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                  Log in
                </Link>
                <Link 
                  href="/login" 
                  className="px-5 py-2 bg-slate-900 text-white rounded-full text-sm font-semibold hover:bg-slate-800 transition shadow-lg hover:shadow-blue-500/20"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:pt-48 sm:pb-32">
        <GridPattern />
        <motion.div 
          style={{ opacity, scale }}
          className="max-w-7xl mx-auto text-center relative z-10"
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            For Lecturers & Students
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-[1.1] tracking-tight"
          >
            Supercharge Your <br />
            <span className="bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Classroom Experience
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Lecturers save hours on grading. Students get 24/7 AI tutoring.<br/>
            The modern way to manage quizzes, handouts, and grades.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/login"
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95"
            >
              Create a Class
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-slate-50 transition border border-slate-200 hover:border-slate-300 shadow-sm"
            >
              Join a Class
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid - Glassmorphism Style */}
      <section id="features" className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Tools that save you time</h2>
            <p className="text-lg text-slate-600">Everything you need to run a modern class.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "AI Quiz Gen", icon: "⚡", desc: "Turn PDF handouts into quizzes instantly.", color: "blue" },
              { title: "Instant Grading", icon: "✅", desc: "Automatic grading with detailed feedback.", color: "green" },
              { title: "24/7 AI Tutor", icon: "🤖", desc: "Personalized help based on course notes.", color: "purple" },
              { title: "Smart Roster", icon: "👥", desc: "Easily manage students and track progress.", color: "orange" },
              { title: "Announcements", icon: "📢", desc: "Keep everyone updated with push alerts.", color: "pink" },
              { title: "Secure Access", icon: "🔒", desc: "Content protection and secure logins.", color: "indigo" }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="group p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-${feature.color}-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity -mr-16 -mt-16`} />
                
                <div className={`w-14 h-14 rounded-2xl bg-${feature.color}-50 flex items-center justify-center mb-6 text-3xl shadow-inner`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed relative z-10">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-blue-50 via-white to-white opacity-50"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Flexible Pricing</h2>
            <p className="text-xl text-slate-600">Free for trial. Affordable for pros.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <div className="p-8 rounded-3xl border border-slate-200 bg-white hover:border-blue-200 transition-colors">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Starter</h3>
              <p className="text-slate-500 mb-6 text-sm">For TAs & Trials</p>
              <div className="mb-8">
                <span className="text-4xl font-bold text-slate-900">₵0</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-slate-600">
                <li className="flex gap-3">✓ 1 Active Class</li>
                <li className="flex gap-3">✓ Max 50 Students</li>
                <li className="flex gap-3">✓ Basic AI Quiz Gen</li>
              </ul>
              <Link href="/login" className="block w-full py-3 rounded-xl bg-slate-100 text-slate-900 font-bold text-center hover:bg-slate-200 transition">
                Start Free
              </Link>
            </div>

            {/* Professional Plan */}
            <div className="relative p-8 rounded-3xl bg-slate-900 text-white shadow-2xl transform md:-translate-y-4 border border-slate-800">
              <div className="absolute top-0 right-0 bg-linear-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                POPULAR
              </div>
              <h3 className="text-lg font-bold mb-2">Professional</h3>
              <p className="text-slate-400 mb-6 text-sm">For Standard Lecturers</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">₵300</span>
                <span className="text-slate-400">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-slate-300">
                <li className="flex gap-3 text-white">✓ 3 Active Classes</li>
                <li className="flex gap-3 text-white">✓ Max 500 Students</li>
                <li className="flex gap-3 text-white">✓ 300 AI Graded Papers</li>
                <li className="flex gap-3 text-white">✓ Priority Support</li>
              </ul>
              <Link href="/login" className="block w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-center hover:bg-blue-700 transition shadow-lg shadow-blue-900/50">
                Get Pro
              </Link>
            </div>

            {/* Elite Plan */}
            <div className="p-8 rounded-3xl border border-slate-200 bg-white hover:border-blue-200 transition-colors">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Elite</h3>
              <p className="text-slate-500 mb-6 text-sm">For Power Users</p>
              <div className="mb-8">
                <span className="text-4xl font-bold text-slate-900">₵600</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-slate-600">
                <li className="flex gap-3">✓ Unlimited Classes</li>
                <li className="flex gap-3">✓ Max 2,000 Students</li>
                <li className="flex gap-3">✓ 1,500 AI Graded Papers</li>
                <li className="flex gap-3">✓ 3 Admin Seats (Co-Lecturers)</li>
              </ul>
              <Link href="/login" className="block w-full py-3 rounded-xl border border-slate-200 text-slate-900 font-bold text-center hover:bg-slate-50 transition">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎓</span>
              <span className="font-bold text-slate-900">UniBot</span>
            </div>
            <div className="flex gap-8 text-sm text-slate-600">
              <a href="#" className="hover:text-blue-600 transition">Features</a>
              <a href="#" className="hover:text-blue-600 transition">Pricing</a>
              <a href="#" className="hover:text-blue-600 transition">Twitter</a>
              <a href="#" className="hover:text-blue-600 transition">GitHub</a>
            </div>
            <p className="text-xs text-slate-500">© 2025 UniBot Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}