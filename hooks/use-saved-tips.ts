'use client';

// Saved studio tips + subscription plan, synced with the Firestore user
// profile. Loading happens in the auth flow via the returned setters.
import { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';

export function useSavedTips(user: FirebaseUser | null) {
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
    setDoc(doc(db, 'users', user.uid), {
      savedTips: next,
      updatedAt: serverTimestamp()
    }, { merge: true }).catch(() => { });
    toast.success(exists ? 'Tip removed from your account page.' : 'Tip saved to your account page.');
  };

  return { savedTips, setSavedTips, accountPlan, setAccountPlan, handleToggleSavedTip };
}
