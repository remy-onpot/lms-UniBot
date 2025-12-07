// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { UniBotFace } from '@/components/ui/UniBotFace';
import { useFace } from '@/components/ui/FaceProvider';
import { FaceAnalyticsService } from '@/lib/services/face-analytics.service';

export default function LoginPage() {
  const router = useRouter();
  const face = useFace();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    face.pulse('thinking', 2000, { event: 'login_attempt', isLogin });

    try {
      if (isLogin) {
        if (!email || !password) {
          toast.error('Please enter your email and password');
          face.pulse('sad', 1200, { event: 'login_validation_error' });
          setLoading(false);
          return;
        }

        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Login failed');
        
        // Celebrate briefly then redirect
        toast.success('Welcome back!');
        face.pulse('happy', 1500, { event: 'login_success' });
        await FaceAnalyticsService.logLogin('email');
        await new Promise((res) => setTimeout(res, 700));
        window.location.href = '/dashboard';
      } else {
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
        // Show happy face, then switch to login view
        toast.success('Account created! Please check your email.');
        face.pulse('happy', 1500, { event: 'signup_success', role });
        await FaceAnalyticsService.recordFaceEvent({
          eventType: 'signup',
          faceState: 'happy',
          metadata: { role }
        });
        await new Promise((res) => setTimeout(res, 900));
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      face.pulse('sad', 1500, { event: 'login_error', error: err.message });
      await FaceAnalyticsService.logError('login_page', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-blue-200 rounded-full blur-3xl opacity-40 pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10 bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50">
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-linear-to-tr from-indigo-600 to-violet-600 rounded-3xl mx-auto mb-6 shadow-lg shadow-indigo-200 flex items-center justify-center transform -rotate-3">
            <UniBotFace size="md" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Get Started'}
          </h1>
          {/* Fix: text-slate-500 -> text-slate-600 */}
          <p className="text-slate-600 font-medium">
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
                <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
                  {['student', 'lecturer', 'ta'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r as any)}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold capitalize transition-all duration-200 ${
                        role === r 
                          ? 'bg-white text-indigo-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700' // Darker non-active text
                      }`}
                    >
                      {r === 'ta' ? 'TA' : r}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Full Name"
                  aria-label="Full Name"
                  className="w-full bg-slate-50 border-2 border-transparent px-5 py-4 rounded-2xl text-slate-900 placeholder:text-slate-500 focus:border-indigo-500 focus:bg-white outline-none font-bold transition"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />

                {role === 'ta' && (
                  <input
                    type="text"
                    placeholder="TA Invite Code"
                    aria-label="TA Invite Code"
                    className="w-full bg-orange-50 border-2 border-orange-100 px-5 py-4 rounded-2xl text-orange-900 placeholder:text-orange-400 focus:border-orange-500 outline-none font-bold transition"
                    value={taCode}
                    onChange={(e) => setTaCode(e.target.value)}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <input
            type="email"
            placeholder="Email Address"
            aria-label="Email Address"
            className="w-full bg-slate-50 border-2 border-transparent px-5 py-4 rounded-2xl text-slate-900 placeholder:text-slate-500 focus:border-indigo-500 focus:bg-white outline-none font-bold transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            aria-label="Password"
            className="w-full bg-slate-50 border-2 border-transparent px-5 py-4 rounded-2xl text-slate-900 placeholder:text-slate-500 focus:border-indigo-500 focus:bg-white outline-none font-bold transition"
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
                {/* Fix: text-slate-400 -> text-slate-500 */}
                <p className="text-xs text-slate-500 font-medium">I manage my class cohort</p>
              </div>
            </motion.label>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold text-center border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-600 font-medium text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-indigo-600 font-bold ml-2 hover:text-indigo-700 transition"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
}