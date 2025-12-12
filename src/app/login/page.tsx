'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { UniBotMascot, MascotEmotion, MascotAction } from '@/components/ui/UniBotMascot';
// FaceAnalyticsService removed
import { Mail, Lock, User, Key, Check, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 🎭 MASCOT STATE
  const [mascotEmotion, setMascotEmotion] = useState<MascotEmotion>('idle');
  const [mascotAction, setMascotAction] = useState<MascotAction>('wave');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'lecturer' | 'ta'>('student');
  const [isCourseRep, setIsCourseRep] = useState(false);
  const [taCode, setTaCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // 🧠 UNI-BOT: Thinking/Processing
    setMascotEmotion('thinking');
    setMascotAction('dance');

    try {
      if (isLogin) {
        // --- LOGIN LOGIC ---
        if (!email || !password) throw new Error('Please enter your email and password');

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // 🎉 SUCCESS
        toast.success('Welcome back!');
        setMascotEmotion('cool');
        setMascotAction('backflip');
        
        // Removed: FaceAnalyticsService.logLogin('email');
        
        // Wait for animation, then redirect to dashboard
        await new Promise((res) => setTimeout(res, 1500));
        window.location.href = '/dashboard';

      } else {
        // --- SIGN UP LOGIC (Securely setting user metadata for DB trigger) ---
        if (!fullName.trim()) throw new Error('Please enter your full name');
        if (role === 'ta' && !taCode.trim()) throw new Error('TA invite code is required');

        const safeRole = role === 'ta' ? 'student' : role;
        
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              requested_role: role, 
              role: safeRole,
              is_course_rep: role === 'student' ? isCourseRep : false,
              ta_invite_code: role === 'ta' ? taCode : null
            }
          }
        });

        if (signUpError) throw signUpError;

        // 🎉 SUCCESS: DANCE
        setMascotEmotion('happy');
        setMascotAction('dance');
        toast.success('Account created! Please check your email.');
        
        await new Promise((res) => setTimeout(res, 2000));
        setIsLogin(true);
        setMascotEmotion('idle');
        setMascotAction('wave');
      }
    } catch (err: any) {
      // 😔 ERROR: SAD
      setError(err.message);
      toast.error(err.message);
      setMascotEmotion('sad');
      setMascotAction('none');
      
      // Reset to idle after a bit
      setTimeout(() => setMascotEmotion('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvhlate-900 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,#1e1b4b,transparent)] opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto relative z-10 bg-white/10 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-white/10"
      >
        
        {/* 🎭 UNI-BOT STAGE */}
        <div className="flex justify-center -mt-24 mb-4">
           <div className="relative w-48 h-48 drop-shadow-2xl transition-transform hover:scale-105 duration-300 cursor-pointer"
                onMouseEnter={() => { if(mascotEmotion !== 'sad') setMascotEmotion('happy') }}
                onMouseLeave={() => { if(mascotEmotion !== 'sad') setMascotEmotion('idle') }}>
              <UniBotMascot 
                size={190} 
                emotion={mascotEmotion} 
                action={mascotAction} 
              />
           </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Get Started'}
          </h1>
          <p className="text-slate-400 font-medium text-sm">
            {isLogin ? 'Continue your learning journey' : 'Join the smartest LMS in Ghana'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                {/* Role Selector */}
                <div className="bg-slate-800/50 p-1.5 rounded-2xl flex gap-1 border border-white/5">
                  {['student', 'lecturer', 'ta'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r as any)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold capitalize transition-all duration-200 ${
                        role === r 
                          ? 'bg-indigo-600 text-white shadow-lg' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {r === 'ta' ? 'TA' : r}
                    </button>
                  ))}
                </div>

                {/* Name Input */}
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full bg-slate-900/50 border border-white/10 pl-12 pr-5 py-3.5 rounded-2xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:bg-slate-900 outline-none font-bold transition text-sm"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                {/* TA Code */}
                {role === 'ta' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative group"
                  >
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                    <input
                      type="text"
                      placeholder="TA Invite Code"
                      className="w-full bg-orange-900/20 border border-orange-500/30 pl-12 pr-5 py-3.5 rounded-2xl text-orange-200 placeholder:text-orange-500/50 focus:border-orange-500 outline-none font-bold transition text-sm"
                      value={taCode}
                      onChange={(e) => setTaCode(e.target.value)}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email */}
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="email"
              placeholder="Email Address"
              className="w-full bg-slate-900/50 border border-white/10 pl-12 pr-5 py-3.5 rounded-2xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:bg-slate-900 outline-none font-bold transition text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => { if(mascotEmotion === 'sad') setMascotEmotion('idle'); }}
              required
            />
          </div>

          {/* Password - 🫣 SHY MODE */}
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-slate-900/50 border border-white/10 pl-12 pr-5 py-3.5 rounded-2xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:bg-slate-900 outline-none font-bold transition text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => { setMascotEmotion('shy'); setMascotAction('none'); }} 
              onBlur={() => setMascotEmotion('idle')}
              required
            />
          </div>

          {/* Course Rep Checkbox */}
          {!isLogin && role === 'student' && (
            <motion.label 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-3 border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition select-none"
            >
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isCourseRep ? 'bg-indigo-600 border-indigo-600' : 'border-slate-500 bg-transparent'}`}>
                {isCourseRep && <Check className="w-3.5 h-3.5 text-white stroke-4" />}
              </div>
              <input type="checkbox" className="hidden" checked={isCourseRep} onChange={(e) => setIsCourseRep(e.target.checked)} />
              <div>
                <p className="font-bold text-slate-200 text-xs">I am a Course Rep</p>
                <p className="text-[10px] text-slate-500 leading-tight">I manage my class cohort</p>
              </div>
            </motion.label>
          )}

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 text-red-400 p-3 rounded-xl text-xs font-bold text-center border border-red-500/20"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Toggle Mode */}
        <p className="text-center mt-6 text-slate-500 font-medium text-xs">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); setMascotEmotion('idle'); }} 
            className="text-indigo-400 font-bold ml-1 hover:text-indigo-300 transition"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>

      </motion.div>
    </div>
  );
}