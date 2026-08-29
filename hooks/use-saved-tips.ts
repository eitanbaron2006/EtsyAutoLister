'use client';

// Saved studio tips + subscription plan, synced with the user profile.
// Loading happens in the auth flow via the returned setters.
import { useState } from 'react';
import { toast } from 'sonner';
import type { AppUser } from '@/lib/auth';
import { updateProfile } from '@/lib/listings-repo';

export function useSavedTips(user: AppUser | null) {
  const [savedTips, setSavedTips] = useState<string[]>([]);
  const [accountPlan, setAccountPlan] = useState<string>('free');

  // Save / unsave a studio tip to the user's account page
  const handleToggleSavedTip = (tip: string) => {
    if (!user) {
      toast.error('Sign in to save tips to your account.');
      return;
    }
    const exists = savedTips.includes(tip);
    const next = exists ? savedTips.filter(t => t !== tip) : [...savedTips, tip];
    setSavedTips(next);
    updateProfile(user.uid, { savedTips: next }).catch(() => { });
    toast.success(exists ? 'Tip removed from your account page.' : 'Tip saved to your account page.');
  };

  return { savedTips, setSavedTips, accountPlan, setAccountPlan, handleToggleSavedTip };
}
