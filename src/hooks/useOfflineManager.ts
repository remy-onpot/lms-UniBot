'use client';

import { useState, useEffect } from 'react';
import { db, CachedMaterial } from '@/lib/db';
import { toast } from 'sonner';

export function useOfflineManager() {
  
  // Check if a specific file is downloaded
  const checkStatus = async (id: string) => {
    const exists = await db.cachedMaterials.get(id);
    return !!exists;
  };

  // ⬇️ The Heavy Lifter: Downloads File -> Saves to DB
  const downloadMaterial = async (
    id: string, 
    courseId: string, 
    url: string, 
    title: string,
    type: 'handout' | 'syllabus' | 'supplementary' = 'handout'
  ) => {
    const toastId = toast.loading(`Downloading "${title}"...`);

    try {
      // 1. Fetch the File as a Blob
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network error");
      const blob = await response.blob();

      // 2. Save to Dexie (Iron Vault)
      await db.cachedMaterials.put({
        id,
        courseId,
        type: type as any, // Cast to match DB schema if needed
        content: blob,
        last_updated: new Date().toISOString()
      });

      toast.success("Saved Offline", { id: toastId, description: "You can open this without internet." });
      return true;

    } catch (error) {
      console.error(error);
      toast.error("Download Failed", { id: toastId, description: "Check your connection." });
      return false;
    }
  };

  // 🗑️ Delete to free up space
  const deleteMaterial = async (id: string) => {
    await db.cachedMaterials.delete(id);
    toast.info("Removed from Offline Storage");
  };

  // 📦 Bulk Download (e.g. "Download All Week 3")
  const downloadCourseBundle = async (courseId: string, materials: any[]) => {
    // Implementation for bulk download loop
  };

  return {
    checkStatus,
    downloadMaterial,
    deleteMaterial
  };
}