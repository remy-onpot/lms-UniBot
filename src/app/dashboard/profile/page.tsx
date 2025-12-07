'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { 
  User, Edit2, Save, LogOut, Camera, ShoppingBag, 
  Trophy, Flame, TrendingUp, Target, Loader2, BookOpen 
} from 'lucide-react';
import { X } from 'lucide-react';
import { GamificationService } from '@/lib/services/gamification.service';
import { FaceAnalyticsService } from '@/lib/services/face-analytics.service';
import { useFace } from '@/components/ui/FaceProvider';
import { UserProfile, ShopItem } from '@/types';

// Types for local state
interface WeeklyStat {
  day: string;
  xp: number;
  hours: number;
}

interface Interest {
  name: string;
  emoji: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const face = useFace();
  
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Data State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [availableInterests, setAvailableInterests] = useState<Interest[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyStat[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Editable Form Data
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    bio: '',
    email: ''
  });

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      try {
        // Fetch all data in parallel for speed
        const [userRes, shopRes, interestsRes, statsRes] = await Promise.all([
          supabase.from('users').select('*').eq('id', user.id).single(),
          GamificationService.getShopItems(),
          GamificationService.getAvailableInterests(),
          GamificationService.getWeeklyStats(user.id)
        ]);

        if (userRes.data) {
          setProfile(userRes.data);
          setFormData({
            full_name: userRes.data.full_name || '',
            phone_number: userRes.data.phone_number || '',
            bio: userRes.data.bio || '',
            email: user.email || ''
          });
        }
        
        if (shopRes) setShopItems(shopRes);
        if (interestsRes) setAvailableInterests(interestsRes);
        if (statsRes) setWeeklyActivity(statsRes);
        
      } catch (error) {
        console.error("Failed to load profile data", error);
        toast.error("Failed to load some profile data");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  // --- ACTIONS ---

  const handleEdit = (field: string) => setEditMode({ ...editMode, [field]: true });
  
  const handleSave = async (field: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ [field]: (formData as any)[field] })
        .eq('id', profile?.id);

      if (error) throw error;
      
      toast.success('Updated successfully');
      face?.pulse('happy', 900, { event: 'profile_save', field });
      await FaceAnalyticsService.recordFaceEvent({
        eventType: 'profile_update',
        faceState: 'happy',
        metadata: { field }
      });
      setEditMode({ ...editMode, [field]: false });
      
      // Optimistic update
      if (profile) setProfile({ ...profile, [field]: (formData as any)[field] });
      
    } catch (e: any) {
      toast.error(e.message);
      face?.pulse('sad', 1400, { event: 'profile_save_error', field });
      await FaceAnalyticsService.logError('profile_save', e);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !profile) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const filePath = `${profile.id}/${Date.now()}.${file.name.split('.').pop()}`;
      
      await supabase.storage.from('avatars').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', profile.id);
      
      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success('Avatar updated!');
      face?.pulse('happy', 900, { event: 'avatar_upload' });
      await FaceAnalyticsService.recordFaceEvent({
        eventType: 'avatar_uploaded',
        faceState: 'happy',
        metadata: { file_name: file.name }
      });
    } catch (e: any) {
      toast.error(e.message);
      face?.pulse('sad', 1200, { event: 'avatar_upload_error' });
      await FaceAnalyticsService.logError('avatar_upload', e);
    } finally {
      setUploading(false);
    }
  };

  const toggleInterest = async (interest: string) => {
    if (!profile) return;
    const current = profile.interests || [];
    const updated = current.includes(interest) 
      ? current.filter(i => i !== interest)
      : [...current, interest];

    setProfile({ ...profile, interests: updated });
    await supabase.from('users').update({ interests: updated }).eq('id', profile.id);
  };

  const handleBuyItem = async (item: ShopItem) => {
    if (!profile) return;
    try {
      const res = await GamificationService.buyItem(profile.id, item.id);
      setProfile({ ...profile, gems: res.newGems, owned_frames: res.newOwned });
      toast.success(`Purchased ${item.name}!`);
      face?.pulse('happy', 900, { event: 'shop_purchase', item: item.name });
      await FaceAnalyticsService.logShopPurchase(item.name, item.cost);
    } catch (e: any) {
      toast.error(e.message);
      face?.pulse('sad', 1200, { event: 'shop_purchase_error' });
      await FaceAnalyticsService.logError('shop_purchase', e);
    }
  };

  const handleEquipFrame = async (item: ShopItem) => {
    if (!profile) return;
    try {
      await GamificationService.equipFrame(profile.id, item.id);
      setProfile({ ...profile, profile_frame: item.id });
      toast.success('Frame equipped!');
      face?.pulse('happy', 800, { event: 'frame_equipped', item: item.name });
      await FaceAnalyticsService.recordFaceEvent({
        eventType: 'frame_equipped',
        faceState: 'happy',
        metadata: { item_name: item.name }
      });
    } catch (e: any) {
      toast.error(e.message);
      face?.pulse('sad', 1200, { event: 'frame_equip_error' });
      await FaceAnalyticsService.logError('frame_equip', e);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCancel = (field: string) => {
    setEditMode({ ...editMode, [field]: false });
  };
  if (loading || !profile) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
    </div>
  );

  // Calculations
  const level = Math.floor(profile.xp / 1000) + 1;
  const xpForNextLevel = 1000;
  const currentLevelXp = profile.xp % 1000;
  
  // Chart Scaling
  const maxXp = Math.max(...weeklyActivity.map(d => d.xp), 100); 
  const activeFrame = shopItems.find(i => i.id === profile.profile_frame);
  const frameClass = activeFrame ? activeFrame.asset_value : 'border-slate-200';

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-sm font-bold text-gray-500 hover:text-gray-900 transition">← Back</button>
            <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
          </div>
          <Button
            variant="danger"
            size="md"
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-visible mb-6 relative border border-slate-100">
          <div className="h-32 bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-t-2xl"></div>
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-12">
              
              {/* Avatar */}
              <div className="relative group">
                <div className={`w-32 h-32 rounded-full border-4 border-white bg-slate-200 shadow-2xl relative z-10 overflow-hidden ${frameClass}`}>
                   <Image 
                     src={profile.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.email}`} 
                     alt="Profile" 
                     fill 
                     className="object-cover"
                   />
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 z-20 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition"
                  aria-label="Change Avatar"
                >
                  {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                </button>
                <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
              </div>

              {/* Info */}
              <div className="flex-1 mt-4 sm:mt-0">
                <h2 className="text-3xl font-bold text-gray-900">{formData.full_name}</h2>
                <p className="text-gray-500 font-medium">@{profile.email.split('@')[0]} • Level {level}</p>
                
                <div className="flex flex-wrap gap-3 mt-4">
                  <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                    <Trophy className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-indigo-900 text-sm">Lvl {level}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                    <Flame className="w-4 h-4 text-orange-600" />
                    <span className="font-bold text-orange-900 text-sm">{profile.current_streak} Day Streak</span>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                    <span className="text-sm">💎</span>
                    <span className="font-bold text-blue-900 text-sm">{profile.gems} Gems</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                <span>XP: {currentLevelXp}</span>
                <span>Goal: {xpForNextLevel}</span>
              </div>
              <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-linear-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${(currentLevelXp / xpForNextLevel) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden border border-slate-100">
          <div className="flex overflow-x-auto">
            {[
              { id: 'profile', icon: User, label: 'Profile' },
              { id: 'stats', icon: TrendingUp, label: 'Activity' },
              { id: 'shop', icon: ShoppingBag, label: 'Frame Shop' },
              { id: 'interests', icon: Target, label: 'Interests' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 flex-1 min-w-[120px] px-6 py-4 font-bold text-sm transition ${
                  activeTab === tab.id
                    ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* --- TAB CONTENT --- */}
        <div className="space-y-6">
          
          {/* PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" /> Personal Information
                </h3>
                
                <div className="space-y-4 max-w-3xl">
                  {/* Full Name Field */}
                  <div className="group flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">Full Name</p>
                      {editMode.full_name ? (
                        <input 
                          value={formData.full_name} 
                          onChange={e => setFormData({...formData, full_name: e.target.value})} 
                          className="w-full bg-white p-2 rounded border border-indigo-300 focus:ring-2 focus:ring-indigo-200 outline-none" 
                        />
                      ) : <p className="font-bold text-gray-900">{formData.full_name}</p>}
                    </div>
                    <div className="flex gap-2">
                      {editMode.full_name ? (
                        <>
                          <button onClick={() => handleCancel('full_name')} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                          <button onClick={() => handleSave('full_name')} className="text-green-600 p-2 hover:bg-green-50 rounded-lg"><Save className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <button onClick={() => handleEdit('full_name')} className="text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>

                  {/* Phone Field */}
                  <div className="group flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">Phone</p>
                      {editMode.phone_number ? (
                        <input value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} className="w-full bg-white p-2 rounded border border-indigo-300 focus:ring-2 focus:ring-indigo-200 outline-none" />
                      ) : <p className="font-bold text-gray-900">{formData.phone_number || 'Not Set'}</p>}
                    </div>
                    <div className="flex gap-2">
                      {editMode.phone_number ? (
                        <>
                          <button onClick={() => handleCancel('phone_number')} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                          <button onClick={() => handleSave('phone_number')} className="text-green-600 p-2 hover:bg-green-50 rounded-lg"><Save className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <button onClick={() => handleEdit('phone_number')} className="text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>

                  {/* Bio Field */}
                  <div className="group flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">Bio</p>
                      {editMode.bio ? (
                        <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full bg-white p-2 rounded border border-indigo-300 focus:ring-2 focus:ring-indigo-200 outline-none h-24 resize-none" />
                      ) : <p className="text-gray-700 leading-relaxed">{formData.bio || 'No bio yet.'}</p>}
                    </div>
                    <div className="flex gap-2">
                      {editMode.bio ? (
                        <>
                          <button onClick={() => handleCancel('bio')} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                          <button onClick={() => handleSave('bio')} className="text-green-600 p-2 hover:bg-green-50 rounded-lg"><Save className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <button onClick={() => handleEdit('bio')} className="text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                </div>
            </div>
          )}

          {/* SHOP */}
          {activeTab === 'shop' && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Frame Shop</h3>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Balance: 💎 {profile.gems}</span>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {shopItems.map(item => {
                    const isOwned = profile.owned_frames?.includes(item.id);
                    const isEquipped = profile.profile_frame === item.id;
                    return (
                      <div key={item.id} className={`p-4 rounded-xl border-2 text-center transition ${isEquipped ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200'}`}>
                         <div className={`w-16 h-16 rounded-full mx-auto mb-3 bg-slate-200 ${item.asset_value}`}></div>
                         <h4 className="font-bold text-gray-900 text-sm">{item.name}</h4>
                         <p className="text-xs text-gray-500 mb-3">{item.cost === 0 ? 'Free' : `💎 ${item.cost}`}</p>
                         
                         {isEquipped ? (
                           <span className="text-xs font-bold text-indigo-600 block py-1.5">Equipped</span>
                         ) : isOwned ? (
                           <Button onClick={() => handleEquipFrame(item)} variant="outline" size="sm" className="w-full">Equip</Button>
                         ) : (
                           <Button onClick={() => handleBuyItem(item)} disabled={profile.gems < item.cost} variant="primary" size="sm" className="w-full">Buy</Button>
                         )}
                      </div>
                    );
                  })}
               </div>
            </div>
          )}

          {/* INTERESTS */}
          {activeTab === 'interests' && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
               <h3 className="text-lg font-bold text-gray-900 mb-2">Learning Interests</h3>
               <p className="text-gray-500 text-sm mb-6">Select topics to personalize your AI content.</p>
               <div className="flex flex-wrap gap-3">
                  {availableInterests.map(interest => (
                    <button
                      key={interest.name}
                      onClick={() => toggleInterest(interest.name)}
                      className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-2 flex items-center gap-2 ${
                        profile.interests?.includes(interest.name)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <span>{interest.emoji}</span>
                      {interest.name}
                    </button>
                  ))}
               </div>
            </div>
          )}

          {/* STATS (Real Data) */}
          {activeTab === 'stats' && (
             <div className="grid gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                      <div className="flex items-center gap-2 mb-1 text-slate-400">
                         <BookOpen className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Total XP</span>
                      </div>
                      <p className="text-2xl font-black text-indigo-600">{profile.xp.toLocaleString()}</p>
                   </div>
                   <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                      <div className="flex items-center gap-2 mb-1 text-slate-400">
                         <Flame className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Streak</span>
                      </div>
                      <p className="text-2xl font-black text-orange-600">{profile.current_streak} Days</p>
                   </div>
                   <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                      <div className="flex items-center gap-2 mb-1 text-slate-400">
                         <Target className="w-4 h-4" /> <span className="text-xs font-bold uppercase">This Week</span>
                      </div>
                      <p className="text-2xl font-black text-green-600">
                        {weeklyActivity.reduce((acc, curr) => acc + curr.hours, 0).toFixed(1)} Hrs
                      </p>
                   </div>
                </div>

                {/* Weekly Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                   <h3 className="text-lg font-bold text-gray-900 mb-6">Activity (Last 7 Days)</h3>
                   <div className="flex items-end justify-between gap-2 h-48">
                      {weeklyActivity.map((day, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="relative flex-1 w-full flex items-end">
                            <div 
                              className="w-full bg-indigo-100 rounded-t-lg transition-all duration-500 group-hover:bg-indigo-600"
                              style={{ height: `${(day.xp / maxXp) * 100}%` }}
                            >
                               {/* Tooltip */}
                               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 shadow-lg">
                                   <p className="font-bold">{day.xp} XP</p>
                                   <p className="opacity-80">{day.hours} hrs</p>
                               </div>
                            </div>
                          </div>
                          <p className="text-xs font-bold text-gray-400">{day.day}</p>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          )}

        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Log out?</h3>
            <p className="text-gray-500 text-sm mb-6">You will be returned to the login screen.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleLogout} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition">Log Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}