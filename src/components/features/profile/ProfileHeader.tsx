'use client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Loader2, Award, Flame, Star, GraduationCap, FileText } from 'lucide-react';
import { UserProfile } from '@/types';

interface ProfileHeaderProps {
  profile: UserProfile;
  fullName: string;
  level: number;
  xpProgress: number;
  currentLevelXp: number;
  xpForNextLevel: number;
  uploading: boolean;
  onAvatarClick: () => void;
}

export function ProfileHeader({ 
  profile, fullName, level, xpProgress, 
  currentLevelXp, xpForNextLevel, uploading, onAvatarClick 
}: ProfileHeaderProps) {
  const router = useRouter();

  return (
    <div className="relative bg-white rounded-4xl shadow-xl overflow-hidden border border-slate-100">
      {/* Banner */}
      <div className="h-40 bg-linear-to-r from-indigo-600 via-purple-600 to-pink-500 relative">
         <div className="absolute inset-0 bg-white/10 opacity-50 backdrop-blur-[1px]"></div>
         
         {/* ✅ TRANSCRIPT BUTTON */}
         <button 
           onClick={() => router.push('/dashboard/transcript')}
           className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-white/20 shadow-lg group"
         >
            <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
            Academic Transcript
         </button>
      </div>

      <div className="px-8 pb-8 relative">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16">
          
          {/* Avatar */}
          <div className="relative group">
            <div className="w-32 h-32 rounded-3xl border-4 border-white bg-slate-200 shadow-2xl overflow-hidden relative z-10">
              <Image 
                src={profile.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.email}`} 
                alt="Profile" 
                fill 
                className="object-cover"
              />
            </div>
            <button 
              onClick={onAvatarClick}
              disabled={uploading}
              className="absolute -bottom-2 -right-2 z-20 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform text-white border-2 border-white"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left mb-2">
            <h1 className="text-3xl font-black text-slate-900">{fullName}</h1>
            <p className="text-slate-500 font-medium">@{profile.email.split('@')[0]} • Level {level} Scholar</p>
          </div>

          {/* Stats Pills */}
          <div className="flex gap-3 mb-4 md:mb-0">
             <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-xl border border-orange-100">
                <Flame className="w-5 h-5 text-orange-600 fill-orange-600" />
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Streak</p>
                   <p className="font-black text-orange-900">{profile.current_streak || 0}</p>
                </div>
             </div>
             <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-xl border border-purple-100">
                <Award className="w-5 h-5 text-purple-600" />
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Level</p>
                   <p className="font-black text-purple-900">{level}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Level Bar */}
        <div className="mt-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
           <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
              <span>Level {level} Progress</span>
              <span>{currentLevelXp} / {xpForNextLevel} XP</span>
           </div>
           <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-linear-to-r from-indigo-500 to-purple-500 transition-all duration-1000" style={{ width: `${xpProgress}%` }}></div>
           </div>
        </div>
      </div>
    </div>
  );
}