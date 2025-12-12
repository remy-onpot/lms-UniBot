'use client';
import { useState } from 'react';
import { db } from '@/lib/db';
import { toast } from 'sonner';

export function SmartFileLink({ fileUrl, id, children, className }: any) {
  
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    try {
      // 1. Check Offline DB first
      const cached = await db.cachedMaterials.get(id);
      
      if (cached && cached.content) {
        // Create a local Blob URL
        const blobUrl = URL.createObjectURL(cached.content as Blob);
        window.open(blobUrl, '_blank');
        return;
      }

      // 2. Fallback to Online URL
      if (navigator.onLine) {
        window.open(fileUrl, '_blank');
      } else {
        toast.error("File not found offline", { description: "Please download this file when you have internet." });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
}