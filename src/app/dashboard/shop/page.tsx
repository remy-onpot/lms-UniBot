'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ShoppingBag, Zap, Clock, Shield, Palette, CheckCircle, Loader2 } from 'lucide-react';

// ✅ FIX: Import strict types directly from the service 
// This ensures 'theme' | 'frame' | 'boost' matches exactly what the service delivers.
import { GamificationService, ShopItem } from '@/lib/services/gamification.service';

export default function ShopPage() {
  // Strict State Typing
  const [items, setItems] = useState<ShopItem[]>([]);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [userGems, setUserGems] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Track which specific item is being purchased to show a loader only on that button
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Instantiate Service
  const gameService = new GamificationService(supabase);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Parallel Fetching for Performance
        const [profileRes, shopItems, inventory] = await Promise.all([
          supabase.from('users').select('gems').eq('id', user.id).single(),
          gameService.getShopItems(),
          gameService.getOwnedItems(user.id)
        ]);

        // Safely set state with fallbacks
        setUserGems(profileRes.data?.gems || 0);
        setItems(shopItems || []);
        setOwnedItems(inventory || []);
        
      } catch (error) {
        console.error("Shop load error:", error);
        toast.error("Failed to load shop");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleBuy = async (item: ShopItem) => {
    // 1. Client-Side Validation (UX)
    if (userGems < item.cost) {
      toast.error("Not enough gems!");
      return;
    }

    setProcessingId(item.id);
    const toastId = toast.loading("Processing purchase...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session expired");

      // 2. Server-Side Transaction
      // This calls the RPC which handles the actual deduction atomically
      const result = await gameService.buyItem(user.id, item.id);
      
      if (result.success) {
        toast.success(`Purchased ${item.name}!`, { id: toastId });
        
        // 3. Secure State Update
        // Only update if server confirmed success. 
        // We use the new balance returned by the server to ensure sync.
        setOwnedItems(prev => [...prev, item.id]);
        setUserGems(result.newGems); 
      }
    } catch (error: any) {
      // The RPC throws an error if funds are insufficient or item is invalid
      toast.error(error.message || "Purchase failed", { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  // --- Helper: Icon Selector ---
  const getIcon = (type: ShopItem['type']) => {
    switch (type) {
      case 'frame': return Palette;
      case 'freeze': return Clock;
      case 'boost': return Zap;
      case 'theme': return Palette;
      default: return ShoppingBag;
    }
  };

  if (loading) return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-indigo-900 to-purple-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-indigo-200" /> 
            Item Shop
          </h1>
          <p className="text-indigo-200 mt-2">Spend your hard-earned gems on boosts and cosmetics!</p>
        </div>

        {/* Live Balance Card */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-2xl flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-500/20">
             <Zap className="w-6 h-6 text-yellow-900" />
           </div>
           <div>
             <span className="block text-xs font-bold text-indigo-200 uppercase tracking-wider">Balance</span>
             <span className="text-2xl font-black text-white">{userGems} Gems</span>
           </div>
        </div>
      </div>

      {/* Shop Grid */}
      {items.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
           <p className="text-slate-500 font-bold">The shop is currently empty. Check back later!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const isOwned = ownedItems.includes(item.id);
            const canAfford = userGems >= item.cost;
            const Icon = getIcon(item.type);

            return (
              <div 
                key={item.id} 
                className={`relative bg-white border rounded-3xl p-6 transition-all duration-300 ${
                  isOwned 
                    ? 'border-green-200 bg-green-50/30' 
                    : 'border-slate-100 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                {/* Item Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                     isOwned ? 'bg-green-100 text-green-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                     <Icon className="w-7 h-7" />
                  </div>
                  {isOwned ? (
                    <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                      <CheckCircle className="w-3 h-3" /> Owned
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                      {item.type}
                    </span>
                  )}
                </div>

                {/* Details */}
                <h3 className="text-xl font-bold text-slate-900 mb-1">{item.name}</h3>
                <p className="text-sm text-slate-500 mb-6 min-h-[40px] leading-relaxed">{item.description}</p>

                {/* Action Button */}
                <button
                  onClick={() => handleBuy(item)}
                  disabled={isOwned || !canAfford || !!processingId}
                  className={`w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    isOwned 
                      ? 'bg-slate-200 text-slate-400 cursor-default'
                      : canAfford
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 active:scale-95'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-70'
                  }`}
                >
                  {processingId === item.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isOwned ? (
                    "In Inventory"
                  ) : (
                    <>
                      <span>Buy for</span>
                      <span className="flex items-center gap-1">
                        {item.cost} <Zap className="w-3 h-3 fill-current" />
                      </span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}