import { Users, GraduationCap, BookOpen, Archive } from 'lucide-react';

interface StatsOverviewProps {
  activeClasses: any[];
  archivedClasses: any[];
}

export function StatsOverview({ activeClasses, archivedClasses }: StatsOverviewProps) {
  // Safe Calculations
  const totalStudents = activeClasses.reduce((acc, c) => acc + (c.studentCount || 0), 0);
  const totalModules = activeClasses.reduce((acc, c) => acc + (c.course_count || 0), 0);

  const StatCard = ({ icon: Icon, color, label, value, bg }: any) => (
    <div className={`${bg} p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group`}>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className={`text-[10px] font-bold ${color} uppercase tracking-wider`}>{label}</span>
        </div>
        <p className={`text-3xl font-black ${color.replace('text-', 'text-slate-')}`}>{value}</p>
      </div>
      <Icon className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-5 ${color}`} />
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StatCard icon={Users} color="text-blue-600" bg="bg-blue-50/50" label="Total Students" value={totalStudents} />
      <StatCard icon={GraduationCap} color="text-purple-600" bg="bg-purple-50/50" label="Active Classes" value={activeClasses.length} />
      <StatCard icon={BookOpen} color="text-indigo-600" bg="bg-indigo-50/50" label="Modules" value={totalModules} />
      <StatCard icon={Archive} color="text-orange-600" bg="bg-orange-50/50" label="Archived" value={archivedClasses.length} />
    </div>
  );
}