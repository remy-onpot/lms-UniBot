'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, ShoppingBag, Sparkles, Check, Lock, Shirt } from 'lucide-react';
import { GamificationService } from '@/lib/services/gamification.service';
import { UniBotMascot, MascotAccessory } from '@/components/ui/UniBotMascot';
import { EmptyState } from '@/components/ui/EmptyStateCard';
import { cn } from '@/lib/utils';

// Types specific to Shop
interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'frame' | 'accessory' | 'theme';
  asset_value: string; // CSS class for frames, or ID for accessories
  is_owned?: boolean;
  is_equipped?: boolean;
}

export default function ShopPage() {
  const router = useRouter();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [userGems, setUserGems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'frame' | 'accessory'>('all');
  
  // 🎭 FITTING ROOM STATE
  // Allows users to preview items locally before buying
  const [previewFrame, setPreviewFrame] = useState<string>('');
  const [previewAccessory, setPreviewAccessory] = useState<MascotAccessory>('none');

  useEffect(() => {
    fetchShopData();
  }, []);

  const fetchShopData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      
      // 1. Get User Gems & Current setup
      const { data: profile } = await supabase.from('users').select('gems, profile_frame').eq('id', user.id).single();
      setUserGems(profile?.gems || 0);
      setPreviewFrame(profile?.profile_frame || '');

      // 2. Get Shop Items
      const { data: shopItems, error: shopError } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_active', true)
        .order('cost', { ascending: true });
        
      if (shopError) throw shopError;

      // 3. Get Inventory (What do I own?)
      const { data: inventory } = await supabase
        .from('user_inventory')
        .select('item_id, is_equipped')
        .eq('user_id', user.id);

      const inventoryMap = new Set(inventory?.map((i: any) => i.item_id));
      const equippedMap = new Set(inventory?.filter((i: any) => i.is_equipped).map((i: any) => i.item_id));

      // 4. Merge Data
      const mergedItems: ShopItem[] = shopItems.map((item: any) => ({
        ...item,
        is_owned: inventoryMap.has(item.id),
        is_equipped: equippedMap.has(item.id)
      }));

      // Find current equipped accessory for preview
      const equippedAccessory = mergedItems.find(i => i.type === 'accessory' && i.is_equipped);
      if (equippedAccessory) setPreviewAccessory(equippedAccessory.asset_value as MascotAccessory);

      setItems(mergedItems);
    } catch (e) {
      toast.error("Failed to load shop");
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: ShopItem) => {
    // 👗 UPDATE PREVIEW (Visual only)
    if (item.type === 'frame') setPreviewFrame(item.asset_value);
    if (item.type === 'accessory') setPreviewAccessory(item.asset_value as MascotAccessory);
  };

  const handleBuy = async (item: ShopItem) => {
    if (userGems < item.cost) {
      toast.error("Not enough gems!", { description: "Complete quizzes to earn more." });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ⚡ CALL RPC
      const { error } = await supabase.rpc('purchase_item', { 
        p_user_id: user.id, 
        p_item_id: item.id 
      });

      if (error) throw error;

      toast.success(`Bought ${item.name}!`);
      fetchShopData(); // Refresh to update balance and inventory
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleEquip = async (item: ShopItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ⚡ CALL RPC
      const { error } = await supabase.rpc('equip_item', { 
        p_user_id: user.id, 
        p_item_id: item.id 
      });

      if (error) throw error;
      
      toast.success("Equipped!");
      fetchShopData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredItems = items.filter(i => activeTab === 'all' || i.type === activeTab);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin text-indigo-600">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* 1. FITTING ROOM (Header) */}
      <div className="bg-slate-900 text-white pt-8 pb-12 px-6 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
         {/* Decor */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
         
         <div className="max-w-4xl mx-auto relative z-10">
            <div className="flex justify-between items-start mb-8">
               <button onClick={() => router.back()} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition backdrop-blur-md">
                 <ChevronLeft className="w-5 h-5" />
               </button>
               <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
                 <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                 <span className="font-black tracking-wide">{userGems} Gems</span>
               </div>
            </div>

            <div className="flex flex-col items-center">
               <div className="relative group cursor-pointer transition-transform hover:scale-105 duration-500">
                  {/* FRAME RENDERER */}
                  <div className={cn(
                    "w-32 h-32 rounded-3xl flex items-center justify-center bg-white shadow-2xl relative z-10 transition-all duration-300 border-4",
                    previewFrame ? previewFrame : "border-transparent" 
                  )}>
                     <UniBotMascot 
                       size={100} 
                       emotion="happy" 
                       action="idle" 
                       accessory={previewAccessory} 
                     />
                  </div>
                  {/* Platform Shadow */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/40 blur-lg rounded-full"></div>
               </div>
               
               <h1 className="text-2xl font-black mt-6">The Item Shop</h1>
               <p className="text-slate-400 text-sm">Select an item to preview it on your mascot.</p>
            </div>
         </div>
      </div>

      {/* 2. SHOP CONTENT */}
      <div className="max-w-4xl mx-auto px-6 -mt-6 relative z-20">
         
         {/* Tabs */}
         <div className="bg-white p-1.5 rounded-2xl shadow-lg border border-slate-100 flex gap-1 mb-8">
            {['all', 'frame', 'accessory'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "flex-1 py-3 rounded-xl text-xs font-bold capitalize transition-all duration-300",
                  activeTab === tab ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                {tab === 'accessory' ? 'Accessories' : tab + 's'}
              </button>
            ))}
         </div>

         {/* Grid */}
         {filteredItems.length > 0 ? (
           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredItems.map(item => {
                 const canAfford = userGems >= item.cost;
                 
                 return (
                   <div 
                     key={item.id} 
                     onClick={() => handleItemClick(item)}
                     className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer group flex flex-col items-center text-center relative overflow-hidden"
                   >
                      {/* Active Preview Indicator */}
                      {(previewFrame === item.asset_value || previewAccessory === item.asset_value) && (
                        <div className="absolute top-3 right-3 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                      )}

                      <div className="w-16 h-16 bg-slate-50 rounded-2xl mb-4 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                         {item.type === 'accessory' ? (
                            // Show mini mascot for accessory preview
                            <div className="scale-50"><UniBotMascot size={60} emotion="idle" accessory={item.asset_value as any} /></div>
                         ) : (
                            <div className={cn("w-10 h-10 border-2 bg-white", item.asset_value)} />
                         )}
                      </div>
                      
                      <h3 className="font-bold text-slate-900 text-sm mb-1">{item.name}</h3>
                      <p className="text-[10px] text-slate-400 font-medium mb-4 line-clamp-1">{item.description}</p>
                      
                      <div className="mt-auto w-full">
                         {item.is_equipped ? (
                           <button disabled className="w-full py-2.5 bg-green-50 text-green-600 font-black rounded-xl text-xs flex items-center justify-center gap-1 cursor-default">
                              <Check className="w-3 h-3" /> Equipped
                           </button>
                         ) : item.is_owned ? (
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleEquip(item); }} 
                             className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
                           >
                              <Shirt className="w-3 h-3" /> Equip
                           </button>
                         ) : (
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleBuy(item); }}
                             disabled={!canAfford}
                             className={cn(
                               "w-full py-2.5 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1",
                               canAfford ? "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                             )}
                           >
                             {canAfford ? 'Buy' : <Lock className="w-3 h-3" />} {item.cost}
                           </button>
                         )}
                      </div>
                   </div>
                 );
              })}
           </div>
         ) : (
           <EmptyState 
             title="Shop Empty" 
             description="We are restocking the shelves!" 
             mascotEmotion="surprised"
           />
         )}
      </div>
    </div>
  );
}