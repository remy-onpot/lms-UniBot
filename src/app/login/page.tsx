'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Roles: student, lecturer, ta
  const [role, setRole] = useState<'student' | 'lecturer' | 'ta'>('student');
  const [isCourseRep, setIsCourseRep] = useState(false); // New Checkbox State
  const [taCode, setTaCode] = useState(''); // Code for TAs
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // --- LOGIN LOGIC ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        // --- SIGN UP LOGIC ---
        if (!fullName.trim()) throw new Error('Please enter your full name');

        // TA Code Validation (Mock for now, or check DB)
        if (role === 'ta' && !taCode.trim()) {
            throw new Error('Teaching Assistants must provide an Invite Code from a Lecturer.');
        }

        // Create Account
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: role,
              full_name: fullName,
              is_course_rep: role === 'student' ? isCourseRep : false, // Save Rep Status
              ta_invite_code: role === 'ta' ? taCode : null
            }
          }
        });

        if (error) throw error;
        alert('Account created! Please check your email to verify.');
        setIsLogin(true);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl">🎓</span>
            <h1 className="text-3xl font-bold text-slate-900">
              UniBot
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            {isLogin ? 'Welcome back! Continue learning.' : 'Join your class or start teaching.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Name (Signup Only) */}
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-gray-50 focus:bg-white text-gray-900"
                placeholder="e.g. Kwame Mensah"
                required
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-gray-50 focus:bg-white text-gray-900"
              placeholder="you@university.edu.gh"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-gray-50 focus:bg-white text-gray-900"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Role Selection (Signup Only) */}
          {!isLogin && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase">I am a...</label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button" 
                  onClick={() => setRole('student')} 
                  className={`py-2 px-2 rounded-lg border-2 font-bold text-xs transition flex flex-col items-center justify-center gap-1 ${
                    role === 'student' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-100 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span>🎓</span> Student
                </button>
                <button 
                  type="button" 
                  onClick={() => setRole('lecturer')} 
                  className={`py-2 px-2 rounded-lg border-2 font-bold text-xs transition flex flex-col items-center justify-center gap-1 ${
                    role === 'lecturer' 
                      ? 'border-purple-500 bg-purple-50 text-purple-700' 
                      : 'border-gray-100 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span>👨‍🏫</span> Lecturer
                </button>
                <button 
                  type="button" 
                  onClick={() => setRole('ta')} 
                  className={`py-2 px-2 rounded-lg border-2 font-bold text-xs transition flex flex-col items-center justify-center gap-1 ${
                    role === 'ta' 
                      ? 'border-orange-500 bg-orange-50 text-orange-700' 
                      : 'border-gray-100 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span>📋</span> TA
                </button>
              </div>

              {/* Conditional Fields based on Role */}
              
              {/* 1. Student -> Course Rep Checkbox */}
              {role === 'student' && (
                <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                    <input 
                        type="checkbox" 
                        checked={isCourseRep} 
                        onChange={(e) => setIsCourseRep(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                    />
                    <div>
                        <span className="block text-sm font-bold text-gray-700">I am a Course Rep</span>
                        <span className="block text-xs text-gray-500">I manage the class and coordinate with lecturers.</span>
                    </div>
                </label>
              )}

              {/* 2. TA -> Invite Code Input */}
              {role === 'ta' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-orange-600 uppercase mb-1">Lecturer Invite Code</label>
                    <input 
                        type="text" 
                        value={taCode}
                        onChange={(e) => setTaCode(e.target.value.toUpperCase())}
                        placeholder="TA-XYZ-123"
                        className="w-full px-4 py-3 border border-orange-200 bg-orange-50 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 font-mono tracking-widest"
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">Ask your main Lecturer for this code.</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 disabled:bg-gray-300 transition shadow-lg transform active:scale-[0.98]"
          >
            {loading ? 'Processing...' : isLogin ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <p className="text-gray-500 text-sm mb-2">
            {isLogin ? "New to UniBot?" : "Already have an account?"}
          </p>
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-blue-600 hover:text-blue-800 font-bold text-sm hover:underline"
          >
            {isLogin ? "Create a free account" : "Log in here"}
          </button>
        </div>
      </div>
    </div>
  );
}