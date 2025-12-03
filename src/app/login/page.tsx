'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // Force refresh so middleware sees the cookie immediately
        router.refresh();
        // Short delay to allow cookie propagation
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        if (!fullName.trim()) throw new Error('Full Name is required');
        if (role === 'ta' && !taCode.trim()) throw new Error('TA Code is required');

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
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-purple-200 rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-72 h-72 bg-blue-200 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10">
        
        {/* Header with 3D-style Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-linear-to-br from-indigo-500 to-purple-600 rounded-3xl mx-auto mb-6 shadow-2xl shadow-indigo-200 flex items-center justify-center transform -rotate-6">
            <span className="text-4xl text-white">🎓</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            {isLogin ? 'Welcome Back!' : 'Create Account'}
          </h1>
          <p className="text-slate-500 text-lg">
            {isLogin ? 'Let\'s get you back to class.' : 'Start your smarter learning journey.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Sign Up Fields */}
          {!isLogin && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-5 overflow-hidden">
              <div className="bg-slate-50 p-1 rounded-2xl flex gap-1">
                {['student', 'lecturer', 'ta'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r as any)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold capitalize transition-all ${
                      role === r 
                        ? 'bg-white text-indigo-600 shadow-md shadow-slate-200' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Full Name"
                className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />

              {role === 'ta' && (
                <input
                  type="text"
                  placeholder="Invite Code (Required)"
                  className="w-full bg-orange-50 border-none px-6 py-4 rounded-2xl text-orange-900 placeholder:text-orange-300 focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                  value={taCode}
                  onChange={(e) => setTaCode(e.target.value)}
                />
              )}
            </motion.div>
          )}

          {/* Common Fields */}
          <input
            type="email"
            placeholder="Email Address"
            className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {/* Course Rep Checkbox */}
          {!isLogin && role === 'student' && (
            <label className="flex items-center gap-4 p-4 border-2 border-slate-100 rounded-2xl cursor-pointer hover:border-indigo-100 transition">
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${isCourseRep ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                {isCourseRep && <span className="text-white text-xs">✓</span>}
              </div>
              <input type="checkbox" className="hidden" checked={isCourseRep} onChange={(e) => setIsCourseRep(e.target.checked)} />
              <div className="flex-1">
                <p className="font-bold text-slate-700 text-sm">I am a Course Rep</p>
                <p className="text-xs text-slate-400">I manage my class cohort</p>
              </div>
            </label>
          )}

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-sm font-bold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500 font-medium">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-indigo-600 font-bold ml-2 hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
}