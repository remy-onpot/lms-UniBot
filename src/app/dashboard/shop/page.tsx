'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, ShoppingBag, Sparkles, Star } from 'lucide-react';
import { GamificationService } from '@/lib/services/gamification.service';
import { ShopItem, UserProfile } from '@/types';
import { useFace } from '@/components/ui/FaceProvider';

export default function ShopPage() {
  const router = useRouter();
  const face = useFace();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      setProfile(data);
      
      const shopItems = await GamificationService.getShopItems();
      setItems(shopItems || []);
      setLoading(false);
    };
    init();
  }, [router]);

  const handleBuy = async (item: ShopItem) => {
    if (!profile) return;
    try {
      const res = await GamificationService.buyItem(profile.id, item.id);
      setProfile({ ...profile, gems: res.newGems, owned_frames: res.newOwned });
      toast.success(`Bought ${item.name}!`);
      face?.pulse('happy', 1000);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleEquip = async (item: ShopItem) => {
    if (!profile) return;
    try {
      await GamificationService.equipFrame(profile.id, item.id);
      setProfile({ ...profile, profile_frame: item.id });
      toast.success("Equipped!");
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading Shop...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 pb-24">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
           <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition">
             <ChevronLeft className="w-5 h-5" /> Back
           </button>
           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="font-black text-slate-900">{profile?.gems} Gems</span>
           </div>
        </div>

        <div className="text-center mb-12">
           <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10 text-purple-600" />
           </div>
           <h1 className="text-3xl font-black text-slate-900">Item Shop</h1>
           <p className="text-slate-500 mt-2">Customize your profile with exclusive frames.</p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           {items.map(item => {
              const isOwned = profile?.owned_frames?.includes(item.id);
              const isEquipped = profile?.profile_frame === item.id;

              return (
                <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center">
                   <div className={`w-24 h-24 rounded-full bg-slate-100 mb-4 ${item.asset_value}`}></div>
                   <h3 className="font-bold text-slate-900">{item.name}</h3>
                   
                   <div className="mt-auto pt-4 w-full">
                      {isEquipped ? (
                        <button disabled className="w-full py-2 bg-green-50 text-green-600 font-bold rounded-xl text-xs">Equipped</button>
                      ) : isOwned ? (
                        <button onClick={() => handleEquip(item)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition">Equip</button>
                      ) : (
                        <button 
                          onClick={() => handleBuy(item)}
                          disabled={(profile?.gems || 0) < item.cost}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50"
                        >
                          {item.cost} Gems
                        </button>
                      )}
                   </div>
                </div>
              );
           })}
        </div>

      </div>
    </div>
  );
}