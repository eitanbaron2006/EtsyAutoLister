'use client';

// Local-development sign-in. Only surfaces when the Google provider is not
// configured on the Supabase stack — once [auth.external.google] is enabled in
// supabase/config.toml, the Google button succeeds and this never opens.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LogIn } from 'lucide-react';

export function DevSignInDialog({ open, onClose, onSubmit }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    try {
      await onSubmit(email.trim(), password);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="!max-w-md bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.14)] sm:rounded-[24px] text-[#15140f] dark:text-[#f7f1de] font-sans">
        <DialogHeader>
          <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#ed6f5c] font-bold">Local Development</span>
          <DialogTitle className="text-lg font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">Sign in with email</DialogTitle>
          <DialogDescription className="text-[#5a5448] dark:text-[#a39e8f] text-xs leading-relaxed">
            Google sign-in is not configured on this Supabase stack yet. The seeded
            development accounts use the password <span className="font-mono">devpassword123</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-1">
          <Input
            type="email"
            autoFocus
            placeholder="you@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
            className="bg-[#ece4cf] dark:bg-[#22211b] border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.14)] text-[#15140f] dark:text-[#f7f1de] rounded-xl text-sm"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
            className="bg-[#ece4cf] dark:bg-[#22211b] border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.14)] text-[#15140f] dark:text-[#f7f1de] rounded-xl text-sm"
          />
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[#5a5448] dark:text-[#a39e8f] hover:bg-[#ece4cf] dark:hover:bg-[#22211b] hover:text-[#15140f] dark:hover:text-[#f7f1de] text-xs font-mono uppercase tracking-wider cursor-pointer rounded-full px-5"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy || !email.trim() || !password}
            className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white font-mono text-xs rounded-full px-6 uppercase tracking-wider cursor-pointer border-0 disabled:opacity-50"
          >
            <LogIn className="w-3.5 h-3.5 mr-1.5" /> {busy ? 'Signing in…' : 'Sign In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
