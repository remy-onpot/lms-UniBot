'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Auth
import { useParams, useRouter } from 'next/navigation';
import { getRouteParam } from '@/lib/route-utils';
import { motion } from 'framer-motion';
// ✅ FIX 1: Import Types
import { Quiz, QuizResult } from '@/types';
// ✅ FIX 2: Import Service Class
import { QuizService } from '@/lib/services/quiz.service';
import { 
  ArrowLeft, Search, TrendingUp, TrendingDown, 
  Minus, AlertCircle, CheckCircle, Zap 
} from 'lucide-react';

export default function QuizGradebookPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = getRouteParam(params, 'quizId');
  
  // ✅ FIX 3: Instantiate Service
  const quizService = new QuizService(supabase);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if(quizId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Verify Role
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'lecturer' && profile?.role !== 'super_admin') {
        return router.push('/dashboard');
      }

      // ✅ FIX 4: Use Instance Methods (getQuizById)
      const quizData = await quizService.getQuizById(quizId!);
      setQuiz(quizData);

      // ✅ FIX 5: Use Instance Methods (getGradebook)
      const resultsData = await quizService.getGradebook(quizId!);
      setResults(resultsData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin text-indigo-500 text-2xl">❖</div>
    </div>
  );

  // --- ANALYTICS LOGIC ---
  const averageScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0;
  
  const passRate = results.length > 0 
    ? Math.round((results.filter(r => r.score >= 70).length / results.length) * 100) 
    : 0;

  const filteredResults = results.filter(r => 
    r.users?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.users?.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* 🌌 BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-purple-600/10 rounded-full blur-[100px]"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        
        {/* HEADER */}
        <div className="mb-8">
            <button onClick={() => router.back()} className="text-slate-500 hover:text-white transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-6">
                <ArrowLeft className="w-4 h-4" /> Back to Quiz
            </button>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono uppercase">
                            AI Gradebook
                        </span>
                        {quiz?.topic && (
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 text-[10px] font-mono uppercase">
                                {quiz.topic}
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">{quiz?.title}</h1>
                </div>
                
                {/* Search Bar */}
                <div className="relative group w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search student..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:bg-white/10 focus:border-indigo-500/50 outline-none text-sm text-slate-200 placeholder:text-slate-600 transition-all"
                    />
                </div>
            </div>
        </div>

        {/* 1. THE PROJECTION HUB (Analytics) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <AnalyticsCard 
                label="Average Performance" 
                value={`${averageScore}%`} 
                trend={averageScore > 70 ? 'up' : 'down'} 
                color="indigo"
            />
            <AnalyticsCard 
                label="Pass Rate" 
                value={`${passRate}%`} 
                trend={passRate > 80 ? 'up' : passRate > 50 ? 'flat' : 'down'}
                color={passRate > 80 ? 'emerald' : 'amber'}
            />
            <AnalyticsCard 
                label="Total Submissions" 
                value={results.length} 
                subtext="Class Participation"
                color="blue"
            />
        </div>

        {/* 2. FLUID GRADE STRIPS (Results) */}
        <div className="space-y-3">
            <div className="flex px-6 text-xs font-bold text-slate-500 uppercase tracking-widest pb-2">
                <div className="w-[35%] md:w-[30%]">Student</div>
                <div className="w-[30%] md:w-[25%]">Status</div>
                <div className="w-[20%] text-right">Score</div>
                <div className="hidden md:block md:flex-1 text-right">Submitted</div>
            </div>

            {filteredResults.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                    <p className="text-slate-500">No results found.</p>
                </div>
            ) : (
                filteredResults.map((result, idx) => (
                    <GradeStrip key={result.id} result={result} index={idx} />
                ))
            )}
        </div>

      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function AnalyticsCard({ label, value, trend, subtext, color }: any) {
    const colorMap: any = {
        indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    };

    return (
        <div className="bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
            <div className="relative z-10">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
                <div className="flex items-baseline gap-3">
                    <h2 className="text-4xl font-black text-white">{value}</h2>
                    {trend === 'up' && <TrendingUp className="w-5 h-5 text-emerald-500" />}
                    {trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500" />}
                    {trend === 'flat' && <Minus className="w-5 h-5 text-slate-500" />}
                </div>
                {subtext && <p className="text-xs text-slate-600 mt-1 font-mono">{subtext}</p>}
            </div>
            {/* Ambient Glow */}
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-20 ${color === 'indigo' ? 'bg-indigo-500' : color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
        </div>
    )
}

function GradeStrip({ result, index }: { result: QuizResult, index: number }) {
    // Calculate Status Logic
    let status = 'Stable';
    let statusColor = 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    let Icon = Minus;

    if (result.score >= 90) {
        status = 'Top Performer';
        statusColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
        Icon = Zap;
    } else if (result.score >= 80) {
        status = 'Rising';
        statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        Icon = TrendingUp;
    } else if (result.score < 50) {
        status = 'At Risk';
        statusColor = 'text-red-400 bg-red-500/10 border-red-500/20';
        Icon = AlertCircle;
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group relative bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-xl p-4 flex items-center transition-all duration-300"
        >
            {/* Student Info */}
            <div className="w-[35%] md:w-[30%] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex-shrink-0">
                    {result.users?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={result.users.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                            {result.users?.full_name?.[0] || '?'}
                        </div>
                    )}
                </div>
                <div className="truncate">
                    <p className="text-sm font-bold text-slate-200 group-hover:text-white truncate">{result.users?.full_name || 'Unknown'}</p>
                    <p className="text-[10px] text-slate-500 truncate hidden md:block">{result.users?.email}</p>
                </div>
            </div>

            {/* Status Pill */}
            <div className="w-[30%] md:w-[25%]">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>
                    <Icon className="w-3 h-3" />
                    <span className="truncate">{status}</span>
                </div>
            </div>

            {/* Score Visualizer */}
            <div className="w-[20%] text-right flex justify-end items-center gap-3">
                <div className="hidden md:block w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full ${result.score >= 70 ? 'bg-indigo-500' : 'bg-amber-500'}`} 
                        style={{ width: `${result.score}%` }}
                    ></div>
                </div>
                <span className={`text-lg font-mono font-bold ${result.score >= 90 ? 'text-white' : result.score >= 70 ? 'text-slate-300' : 'text-slate-500'}`}>
                    {result.score}%
                </span>
            </div>

            {/* Submitted At */}
            <div className="hidden md:block md:flex-1 text-right text-xs text-slate-500 font-mono">
                {result.submitted_at ? new Date(result.submitted_at).toLocaleDateString() : '-'}
            </div>
            
        </motion.div>
    );
}