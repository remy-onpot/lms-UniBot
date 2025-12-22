'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, useSpring, Variants } from 'framer-motion';import { UniBotMascot } from '@/components/ui/UniBotMascot'; 
import { 
  ArrowRight, Brain, Zap, CheckCircle, BarChart, 
  Sparkles, MessageCircle, FileText, ChevronRight, Wifi, WifiOff,
  Users, Trophy, Clock, Shield, Smartphone, Lock, Globe
} from 'lucide-react';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  
  // Parallax & Scroll Hooks
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

 // Animation Variants (Spring Physics)
  const containerVariants: Variants = { // <--- Added ": Variants"
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = { // <--- Added ": Variants"
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 400,
        damping: 30
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
      
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-indigo-500 origin-left z-[60]"
        style={{ scaleX }}
      />

      {/* BACKGROUND: Animated Mesh Gradient Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            x: [0, 30, -20, 0], 
            y: [0, -50, 20, 0],
            scale: [1, 1.1, 0.9, 1] 
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 -left-40 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -40, 20, 0], 
            y: [0, 40, -30, 0],
            scale: [1, 0.9, 1.1, 1] 
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-20 -right-20 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, 20, -30, 0], 
            y: [0, -30, 40, 0] 
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-40 left-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px]" 
        />
      </div>
      
      {/* NAVIGATION */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-slate-950/80 backdrop-blur-md border-b border-white/5 shadow-xl' : 'bg-transparent border-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <UniBotMascot size={32} emotion="happy" action="none" className="w-8 h-8" />
            <span className="text-lg font-black tracking-tight text-white">UniBot</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-bold text-slate-400 hover:text-white transition">
              Log In
            </Link>
            <Link href="/login" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition shadow-lg shadow-indigo-500/25">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION: "Assemble" Effect */}
      <section className="relative pt-24 sm:pt-32 pb-12 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16"
          >
            
            {/* Left: Copy */}
            <div className="flex-1 text-center lg:text-left space-y-6">
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-sm mx-auto lg:mx-0">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] sm:text-xs font-bold text-indigo-300 uppercase tracking-wider">v2.0 Now Live</span>
              </motion.div>
              
              <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight">
                Your Personal <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-purple-400">
                  Academic OS.
                </span>
              </motion.h1>
              
              <motion.div variants={itemVariants}>
                <p className="text-lg sm:text-xl text-slate-300 font-medium max-w-xl mx-auto lg:mx-0">
                  Not another LMS. An academic survival tool.
                </p>
                <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  Used by students who can&apos;t afford to fail. <br className="hidden sm:block"/>
                  Built for lecturers who are tired of broken systems.
                </p>
              </motion.div>
              
              <motion.div variants={itemVariants} className="flex flex-row gap-3 justify-center lg:justify-start pt-2">
                <Link href="/login" className="flex-1 sm:flex-none px-6 py-3.5 bg-white text-slate-950 rounded-xl font-bold text-base hover:bg-indigo-50 transition flex items-center justify-center gap-2 shadow-lg shadow-white/10">
                  Enter as Student
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/login" className="flex-1 sm:flex-none px-6 py-3.5 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-base hover:bg-white/10 transition backdrop-blur-sm flex items-center justify-center">
                  Teach with UniBot
                </Link>
              </motion.div>
            </div>

            {/* Right: Shrinking Mascot & Floating UI */}
            {/* The logic here allows the mascot to shrink on mobile (w-48) and grow on desktop (lg:w-[500px]) */}
            <motion.div 
              variants={itemVariants}
              className="flex-1 relative flex justify-center items-center w-full"
            >
              <div className="relative w-48 h-48 sm:w-80 sm:h-80 lg:w-[450px] lg:h-[450px] transition-all duration-500 ease-spring">
                
                {/* Floating Card: Quiz Score */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -left-4 top-8 sm:-left-8 sm:top-20 z-20 bg-slate-900/90 backdrop-blur border border-white/10 p-3 rounded-xl shadow-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Quiz Score</p>
                      <p className="text-sm font-black text-white">98%</p>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Card: Data Saved */}
                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -right-2 bottom-4 sm:-right-4 sm:bottom-12 z-20 bg-slate-900/90 backdrop-blur border border-white/10 p-3 rounded-xl shadow-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <WifiOff className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Mode</p>
                      <p className="text-sm font-black text-white">Offline</p>
                    </div>
                  </div>
                </motion.div>

                {/* The Mascot */}
                <div className="w-full h-full relative z-10">
                   <UniBotMascot className="w-full h-full drop-shadow-2xl" />
                </div>
                
                {/* Glow Behind */}
                <div className="absolute inset-0 bg-indigo-500/30 blur-[60px] rounded-full -z-10" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* TRUST STRIP - Slim & Professional */}
      <section className="border-y border-white/5 bg-slate-900/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap justify-center sm:justify-between items-center gap-4 text-xs sm:text-sm text-slate-400 font-medium uppercase tracking-wide">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-indigo-400" /> 
              <span className="hidden sm:inline">Offline-first</span>
              <span className="sm:hidden">Offline</span>
            </div>
            <div className="w-1 h-1 bg-slate-700 rounded-full" />
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Low-data</span>
            </div>
            <div className="w-1 h-1 bg-slate-700 rounded-full" />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Secure</span>
            </div>
            <div className="w-1 h-1 bg-slate-700 rounded-full" />
            <div className="flex items-center gap-2">
              <span>🇬🇭 Ghana-tested</span>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN SECTION: Stressed Images + Emotional Hook */}
      <section className="py-16 px-4 sm:px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">If this feels familiar, UniBot was built for you.</h2>
            <p className="text-slate-400">We get it. The struggle is real.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Student Pain */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative group rounded-2xl overflow-hidden border border-white/10 bg-slate-900"
            >
              {/* Placeholder for Stressed Student Image */}
              <div className="h-48 bg-slate-800 relative">
                 <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                    <span className="flex flex-col items-center gap-2">
                        <Users className="w-12 h-12 opacity-20"/>
                        [Image: Stressed Student with stack of handouts]
                    </span>
                 </div>
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
              </div>
              <div className="p-6 relative z-10 -mt-12">
                <div className="text-4xl mb-3">😰</div>
                <h3 className="text-xl font-bold text-white mb-2">Students Drowning</h3>
                <p className="text-sm text-slate-400">Scattered PDFs, missed deadlines, expensive data bundles, and no real support when you're stuck.</p>
              </div>
            </motion.div>

            {/* Lecturer Pain */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative group rounded-2xl overflow-hidden border border-white/10 bg-slate-900"
            >
              {/* Placeholder for Stressed Lecturer Image */}
              <div className="h-48 bg-slate-800 relative">
                 <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                    <span className="flex flex-col items-center gap-2">
                        <Brain className="w-12 h-12 opacity-20"/>
                        [Image: Overwhelmed Lecturer with papers]
                    </span>
                 </div>
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
              </div>
              <div className="p-6 relative z-10 -mt-12">
                <div className="text-4xl mb-3">😤</div>
                <h3 className="text-xl font-bold text-white mb-2">Lecturers Overwhelmed</h3>
                <p className="text-sm text-slate-400">Grading piles up, attendance sheets go missing, and administrative chaos eats into your teaching time.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* HOW IT ACTUALLY WORKS - Horizontal Step Flow */}
      <section className="py-12 border-t border-white/5 bg-slate-900/30">
        <div className="max-w-5xl mx-auto px-4">
            <h3 className="text-center text-white font-bold mb-8">How It Actually Works</h3>
            <div className="grid md:grid-cols-3 gap-8">
                {[
                    { title: "Upload / Enroll", desc: "Lecturers upload materials once. Students enroll with a code." },
                    { title: "Learn Anywhere", desc: "Students read, ask questions, and practice — even offline." },
                    { title: "Sync & Grade", desc: "Progress syncs. Grades update. Everyone stays aligned." }
                ].map((step, i) => (
                    <div key={i} className="relative text-center md:text-left">
                        <div className="inline-block px-3 py-1 bg-indigo-600 rounded-lg text-xs font-bold text-white mb-3">Step {i+1}</div>
                        <h4 className="text-lg font-bold text-white mb-2">{step.title}</h4>
                        <p className="text-sm text-slate-400">{step.desc}</p>
                        {/* Connecting Line for Desktop */}
                        {i < 2 && <div className="hidden md:block absolute top-4 -right-4 w-8 h-[1px] bg-slate-700" />}
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* BENTO GRID: What Makes UniBot Different */}
      {/* Horizontal Snap Scroll on Mobile, Grid on Desktop */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 text-center sm:text-left">
            <h2 className="text-3xl font-black text-white mb-3">What makes UniBot different.</h2>
            <p className="text-slate-400 max-w-2xl">Engineered for emerging markets. Architected for the enterprise.</p>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 md:grid md:grid-cols-3 md:gap-6 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {/* CARD 1: Offline First */}
            <div className="snap-center shrink-0 w-[85vw] md:w-auto md:col-span-1 p-6 rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-md hover:bg-slate-800/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                    <WifiOff className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Offline-First</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">Sync once, study anywhere. Zero-data reading. Progress uploads automatically when you reconnect.</p>
                <div className="text-xs font-bold text-indigo-400">No refresh anxiety.</div>
            </div>

            {/* CARD 2: Curriculum AI (Big Card) */}
            <div className="snap-center shrink-0 w-[85vw] md:w-auto md:col-span-2 p-6 rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-md hover:bg-slate-800/50 transition-colors relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Contextual, Curriculum-Aware AI</h3>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-md mb-4">
                        UniBot doesn&apos;t just &quot;Google&quot; answers. It ingests your actual handouts and slides to provide answers grounded in your specific curriculum.
                    </p>
                    <div className="text-xs font-bold text-cyan-400">No hallucinations. No generic answers.</div>
                </div>
                {/* Decoration */}
                <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-cyan-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* CARD 3: Virtual Sandboxes */}
            <div className="snap-center shrink-0 w-[85vw] md:w-auto md:col-span-1 p-6 rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-md hover:bg-slate-800/50 transition-colors">
                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Virtual Sandboxes</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">Code and experiment right in the browser. No complex IDE installations required.</p>
                <div className="text-xs font-bold text-pink-400">Your laptop is enough.</div>
            </div>

            {/* CARD 4: WhatsApp Native */}
            <div className="snap-center shrink-0 w-[85vw] md:w-auto md:col-span-1 p-6 rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-md hover:bg-slate-800/50 transition-colors">
                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4">
                    <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">WhatsApp Native</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">Stop shouting into the void. Send alerts and reminders to the app students actually use.</p>
                <div className="text-xs font-bold text-green-400">Zero-friction communication.</div>
            </div>

            {/* CARD 5: Enterprise Security */}
            <div className="snap-center shrink-0 w-[85vw] md:w-auto md:col-span-1 p-6 rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-md hover:bg-slate-800/50 transition-colors">
                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Role-Based Security</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">Grades, payments, and records are encrypted. Fee integration links payment status to result access automatically.</p>
                <div className="text-xs font-bold text-violet-400">Enterprise-grade integrity.</div>
            </div>
          </div>
        </div>
      </section>

      {/* STUDENTS VS LECTURERS - Clean Split */}
      <section className="py-16 bg-slate-900/30 border-t border-white/5">
         <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-3xl bg-indigo-900/20 border border-indigo-500/20">
                <h3 className="text-2xl font-black text-white mb-4">For Students</h3>
                <p className="text-indigo-300 font-bold mb-6">No more chasing information. Focus on passing.</p>
                <ul className="space-y-3">
                    <li className="flex gap-3 text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-indigo-400"/> Unified Hub: Materials & Grades in one place</li>
                    <li className="flex gap-3 text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-indigo-400"/> Gamified Consistency: Streaks & XP</li>
                    <li className="flex gap-3 text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-indigo-400"/> Academic Transcript Tracking</li>
                </ul>
                <Link href="/login" className="inline-flex items-center gap-2 mt-8 text-indigo-400 font-bold text-sm hover:text-white transition">
                    Enter as Student <ArrowRight className="w-4 h-4"/>
                </Link>
            </div>

            <div className="p-8 rounded-3xl bg-cyan-900/20 border border-cyan-500/20">
                <h3 className="text-2xl font-black text-white mb-4">For Lecturers</h3>
                <p className="text-cyan-300 font-bold mb-6">Less chaos. More control.</p>
                <ul className="space-y-3">
                    <li className="flex gap-3 text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-cyan-400"/> Effortless Attendance Management</li>
                    <li className="flex gap-3 text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-cyan-400"/> AI-Assisted Grading Workflows</li>
                    <li className="flex gap-3 text-slate-300 text-sm"><CheckCircle className="w-5 h-5 text-cyan-400"/> High-Impact Teaching, Less Admin</li>
                </ul>
                 <Link href="/login" className="inline-flex items-center gap-2 mt-8 text-cyan-400 font-bold text-sm hover:text-white transition">
                    Teach with UniBot <ArrowRight className="w-4 h-4"/>
                </Link>
            </div>
         </div>
      </section>

      {/* FINAL PRE-FOOTER CTA */}
      <section className="py-20 px-6 text-center border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600/5" />
        <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">University is hard.<br/>Your tools shouldn&apos;t be.</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Link href="/login" className="px-8 py-4 bg-white text-slate-950 rounded-xl font-bold text-lg hover:bg-slate-200 transition shadow-xl">
                    Start as Student
                </Link>
                <Link href="/login" className="px-8 py-4 bg-transparent border border-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition">
                    Request Lecturer Access
                </Link>
            </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-white/10 bg-slate-950 text-center">
        <div className="flex justify-center mb-6">
            <UniBotMascot size={32} emotion="cool" className="opacity-80 grayscale hover:grayscale-0 transition-all" />
        </div>
        <p className="text-slate-500 text-sm mb-2">Built for lecturers for students by students.</p>
        <p className="text-slate-600 text-xs font-bold">🇬🇭 Battle-tested by reality.</p>
      </footer>

     
    </div>
  );
}