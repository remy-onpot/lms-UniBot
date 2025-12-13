'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useNetworkState } from 'react-use'; 
import { toast } from 'sonner';
import { db, OfflineAction } from '@/lib/db';
import { supabase } from '@/lib/supabase'; // Client-side client
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

/**
 * Helper to upload raw blobs from Dexie to Supabase Storage
 */
async function uploadOfflineFile(fileBlob: Blob | ArrayBuffer, fileName: string, bucket: string) {
  const path = `offline_sync/${Date.now()}_${fileName}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, fileBlob);
    
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);
    
  return urlData.publicUrl;
}

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
      let successCount = 0;

      for (const action of actions) {
        try {
          await executeAction(action);
          // Mark as synced
          if (action.id) {
             await db.offlineActions.update(action.id, { status: 'synced' });
             successCount++;
          }
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          // Optional: Mark as 'failed' if it's a permanent error, 
          // but usually we leave as 'pending' to retry on next connection.
        }
      }

      if (successCount > 0) {
        toast.success("Sync Complete", { id: toastId, description: `Uploaded ${successCount} items.` });
      } else {
        toast.dismiss(toastId);
      }
      
      const newCount = await db.offlineActions.where('status').equals('pending').count();
      setPendingCount(newCount);

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
         // ✅ FIXED: Handle file upload if a blob exists in the payload
         let fileUrl = payload.file_url;
         
         // If we have a stored blob (from Dexie) and no URL yet
         if (payload.fileBlob && !fileUrl) {
            try {
                fileUrl = await uploadOfflineFile(
                    payload.fileBlob, 
                    payload.fileName || 'submission.pdf', 
                    'assignments' // Ensure this bucket exists in Supabase
                );
            } catch (err) {
                console.error("File upload failed inside sync:", err);
                throw err; // Stop here, retry later
            }
         }

         // Insert the record with the generated URL
         await supabase.from('assignment_submissions').insert({
            assignment_id: payload.assignmentId,
            student_id: payload.studentId,
            content_text: payload.contentText,
            file_url: fileUrl,
            submitted_at: payload.createdAt || new Date().toISOString()
         });
         break;

      case 'announcement':
        await supabase.from('class_announcements').insert(payload);
        break;

      case 'chat_message':
         const { sessionId, role, content, userId } = payload;
         await supabase.from('chat_messages').insert([{ 
           session_id: sessionId, 
           user_id: userId,
           role, 
           content 
         }]);
         break;

      case 'mark_read':
         const { topicId, materialId } = payload;
         // Assuming we need the user ID. Ideally, payload has it, or we rely on RLS (if insert uses auth.uid())
         // But upsert often needs explicit IDs.
         if (payload.userId) {
             await supabase.from('user_progress').upsert({ 
               user_id: payload.userId, 
               topic_id: topicId, 
               material_id: materialId, 
               completed: true,
               updated_at: new Date().toISOString()
             });
         }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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