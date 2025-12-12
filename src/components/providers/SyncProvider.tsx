'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useNetworkState } from 'react-use'; // pnpm add react-use
import { toast } from 'sonner';
import { db, OfflineAction } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  forceSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  forceSync: async () => {},
});

export const useSync = () => useContext(SyncContext);

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const network = useNetworkState();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  
  // 1. Monitor Offline Queue Count
  useEffect(() => {
    const updateCount = async () => {
      const count = await db.offlineActions.where('status').equals('pending').count();
      setPendingCount(count);
    };
    
    // Initial check & Poll for changes
    updateCount();
    const interval = setInterval(updateCount, 2000); 
    return () => clearInterval(interval);
  }, []);

  // 2. The Sync Logic (The Brain)
  const processQueue = async () => {
    if (isSyncing || pendingCount === 0) return;
    
    setIsSyncing(true);
    const toastId = toast.loading("Syncing offline data...", { icon: <Wifi className="w-4 h-4 animate-pulse" /> });

    try {
      const actions = await db.offlineActions.where('status').equals('pending').toArray();

      for (const action of actions) {
        try {
          await executeAction(action);
          // Mark as synced
          if (action.id) {
             await db.offlineActions.update(action.id, { status: 'synced' });
          }
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
        }
      }

      toast.success("Sync Complete", { id: toastId, description: `Uploaded ${actions.length} items.` });
      setPendingCount(0);

    } catch (error) {
      toast.error("Sync Error", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. The Executor Switch
  const executeAction = async (action: OfflineAction) => {
    const { type, payload } = action;

    switch (type) {
      case 'quiz_submission':
        await supabase.from('assignment_submissions').insert(payload);
        break;

      case 'assignment_submission':
         // Note: File uploads are tricky offline. Usually we sync metadata, 
         // but for full file sync, we'd need to store the Blob in Dexie and upload here.
         // For now, assuming payload contains the necessary text/link data.
         await supabase.from('assignment_submissions').insert(payload);
         break;

      case 'announcement':
        await supabase.from('class_announcements').insert(payload);
        break;

      case 'chat_message':
         const { sessionId, role, content } = payload;
         await supabase.from('chat_messages').insert([{ 
           session_id: sessionId, 
           role, 
           content 
         }]);
         break;

      case 'mark_read':
         const { userId, topicId, materialId } = payload;
         await supabase.from('user_progress').upsert({ 
           user_id: userId, 
           topic_id: topicId, 
           material_id: materialId, 
           completed: true,
           updated_at: new Date().toISOString()
         });
         break;
         
      default:
        console.warn("Unknown action type:", type);
    }
  };

  // 4. Auto-Sync Trigger
  useEffect(() => {
    if (network.online && pendingCount > 0) {
      processQueue();
    }
  }, [network.online, pendingCount]);

  return (
    <SyncContext.Provider value={{ 
      isOnline: network.online ?? true, 
      isSyncing, 
      pendingCount, 
      forceSync: processQueue 
    }}>
      {children}
      
      {/* 5. The "Offline Indicator" (Floating UI) */}
      {(!network.online || pendingCount > 0) && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 px-4 py-2 bg-slate-900 text-white rounded-full shadow-2xl text-xs font-bold animate-in slide-in-from-bottom-4 border border-slate-700">
          {!network.online ? (
            <>
              <WifiOff className="w-4 h-4 text-red-400" />
              <span>You are Offline</span>
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-green-400" />
              <span>Syncing {pendingCount} items...</span>
            </>
          )}
        </div>
      )}
    </SyncContext.Provider>
  );
}