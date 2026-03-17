'use client';

import { useState } from 'react';

export interface ShareData {
  title: string;
  text: string;
  url?: string;
}

export const useShareDialog = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [shareData, setShareData] = useState<ShareData>({ title: '', text: '' });

  const openFallbackDialog = (data: ShareData) => {
     setShareData(data);
     setIsDialogOpen(true);
  }

  const handleShare = async (data: ShareData) => {
      if (navigator.share) {
        try {
            await navigator.share(data);
            return; // Exit if native share is successful
        } catch (error) {
            console.warn('Native share failed:', error);
            // Fall through to fallback dialog if native share fails
        }
      }
      
      // If native share is not supported or fails, open the fallback dialog.
      openFallbackDialog(data);
  };

  const openShareDialog = (data: ShareData) => {
    handleShare(data);
  };

  return {
    isShareDialogOpen: isDialogOpen,
    shareDialogData: shareData,
    openShareDialog,
    closeShareDialog: () => setIsDialogOpen(false),
  };
};
