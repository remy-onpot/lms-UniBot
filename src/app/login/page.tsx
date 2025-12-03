'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Role State
  const [role, setRole] = useState<'student' | 'lecturer' | 'ta'>('student');
  const [isCourseRep, setIsCourseRep] = useState(false);
  const [taCode, setTaCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        console.log('🔐 Attempting login...');
        
        // Client-side login - this WILL set cookies automatically
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('❌ Login error:', error);
          throw error;
        }

        console.log('✅ Login successful:', data.user.email);
        console.log('🍪 Session created:', data.session);

        // CRITICAL: Hard navigation to ensure middleware runs with fresh cookies
        // DO NOT use router.push() - it won't trigger middleware properly
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
        
      } else {
        // --- SIGN UP ---
        if (!fullName.trim()) throw new Error('Please enter your full name');
        if (role === 'ta' && !taCode.trim()) throw new Error('TA invite code is required');

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role,
              full_name: fullName,
              is_course_rep: role === 'student' ? isCourseRep : false,
              ta_invite_code: role === 'ta' ? taCode : null
            }
          }
        });

        if (error) throw error;
        alert('Success! Check your email to verify account.');
        setIsLogin(true);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('💥 Auth error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-blue-200 rounded-full blur-3xl opacity-40 pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10 bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl mx-auto mb-6 shadow-lg shadow-indigo-200 flex items-center justify-center transform -rotate-3">
            <span className="text-4xl text-white">🎓</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Get Started'}
          </h1>
          <p className="text-slate-500 font-medium">
            {isLogin ? 'Continue your learning journey' : 'Create your smart account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <AnimatePresence>
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="space-y-5 overflow-hidden"
              >
                {/* Role Selector */}
                <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
                  {['student', 'lecturer', 'ta'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r as any)}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold capitalize transition-all duration-200 ${
                        role === r 
                          ? 'bg-white text-indigo-600 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {r === 'ta' ? 'TA' : r}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full bg-slate-50 border-2 border-transparent px-5 py-4 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white outline-none font-bold transition"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />

                {role === 'ta' && (
                  <input
                    type="text"
                    placeholder="TA Invite Code"
                    className="w-full bg-orange-50 border-2 border-orange-100 px-5 py-4 rounded-2xl text-orange-900 placeholder:text-orange-300 focus:border-orange-500 outline-none font-bold transition"
                    value={taCode}
                    onChange={(e) => setTaCode(e.target.value)}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Common Fields */}
          <input
            type="email"
            placeholder="Email Address"
            className="w-full bg-slate-50 border-2 border-transparent px-5 py-4 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white outline-none font-bold transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full bg-slate-50 border-2 border-transparent px-5 py-4 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white outline-none font-bold transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {!isLogin && role === 'student' && (
            <motion.label 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex items-center gap-4 p-4 border-2 border-slate-100 rounded-2xl cursor-pointer hover:border-indigo-100 hover:bg-indigo-50/30 transition"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isCourseRep ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                {isCourseRep && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <input type="checkbox" className="hidden" checked={isCourseRep} onChange={(e) => setIsCourseRep(e.target.checked)} />
              <div className="flex-1">
                <p className="font-bold text-slate-700 text-sm">I am a Course Rep</p>
                <p className="text-xs text-slate-400 font-medium">I manage my class cohort</p>
              </div>
            </motion.label>
          )}

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-sm font-bold text-center border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isLogin ? 'Signing in...' : 'Processing...'}
              </span>
            ) : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500 font-medium text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }} 
            className="text-indigo-600 font-bold ml-2 hover:text-indigo-700 transition"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
}