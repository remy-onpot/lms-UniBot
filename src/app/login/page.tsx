'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [universities, setUniversities] = useState<any[]>([]); 
  
  // Roles: student, lecturer, university_admin
  const [role, setRole] = useState<'student' | 'lecturer' | 'university_admin'>('student');
  
  // Codes
  const [accessCode, setAccessCode] = useState(''); // For lecturers
  const [adminCode, setAdminCode] = useState('');   // For Uni Admins

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    const { data } = await supabase
      .from('universities')
      .select('*')
      .order('name');
    
    if (data) {
      setUniversities(data);
      if (data.length > 0) setUniversityId(data[0].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // LOGIN
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        // SIGN UP VALIDATION
        if (!fullName.trim()) throw new Error('Please enter your full name');
        if (!universityId) throw new Error('Please select a university');

        // 1. Check Lecturer Code
        if (role === 'lecturer' && accessCode !== 'TEACHER2025') {
          throw new Error('Invalid lecturer access code');
        }

        // 2. Check University Admin Code (Secure RPC Call)
        if (role === 'university_admin') {
            if (!adminCode) throw new Error('Admin Access Key is required');
            
            // Call the database function to check code without exposing it
            const { data: isValid, error: rpcError } = await supabase
                .rpc('verify_university_code', { 
                    uni_id: universityId, 
                    code_attempt: adminCode 
                });

            if (rpcError) throw rpcError;
            if (!isValid) throw new Error('Invalid University Admin Key');
        }

        // 3. Create Account
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: role,
              full_name: fullName,
              org_id: universityId
            }
          }
        });

        if (error) throw error;
        alert('Account created! Please check your email to verify your account.');
        setIsLogin(true);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl">🎓</span>
            <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              UniBot
            </h1>
          </div>
          <p className="text-gray-600 mt-2">
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* University Selection */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Select University</label>
              <select
                value={universityId}
                onChange={(e) => setUniversityId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                {universities.map((uni) => (
                  <option key={uni.id} value={uni.id}>{uni.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Name */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Full Legal Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="John Doe"
                required
              />
            </div>
          )}

          {/* Email & Pass */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Role Selection */}
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">I am a:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setRole('student')} className={`py-2 px-1 text-sm rounded-lg border-2 font-bold transition ${role === 'student' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                    🎓 Student
                  </button>
                  <button type="button" onClick={() => setRole('lecturer')} className={`py-2 px-1 text-sm rounded-lg border-2 font-bold transition ${role === 'lecturer' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'}`}>
                    👨‍🏫 Lecturer
                  </button>
                  <button type="button" onClick={() => setRole('university_admin')} className={`py-2 px-1 text-sm rounded-lg border-2 font-bold transition ${role === 'university_admin' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                    🛠 Admin
                  </button>
                </div>
              </div>

              {/* Conditional Codes */}
              {role === 'lecturer' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Lecturer Access Code</label>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Enter code"
                    required
                  />
                </div>
              )}

              {role === 'university_admin' && (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                  <label className="block text-sm font-bold text-orange-800 mb-2">University Access Key</label>
                  <input
                    type="text"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono uppercase"
                    placeholder="UNI-XXXXXX"
                    required
                  />
                  <p className="text-xs text-orange-600 mt-2">Provided by the Platform Super Admin.</p>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-300 transition shadow-lg shadow-blue-500/30"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}