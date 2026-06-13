'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';

// Confirmation dialog for destructive actions (shared across views)
export function DeleteConfirmDialog({ request, onClose }: {
  request: { title: string; description: string; action: () => void } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!request} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="!max-w-md bg-[#f7f1de] dark:bg-[#1a1914] border border-[rgba(21,20,15,0.16)] dark:border-[rgba(247,241,222,0.14)] sm:rounded-[24px] text-[#15140f] dark:text-[#f7f1de] font-sans">
        {request && (
          <>
            <DialogHeader>
              <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#ed6f5c] font-bold">Confirm Deletion</span>
              <DialogTitle className="text-lg font-serif font-medium text-[#15140f] dark:text-[#f7f1de]">{request.title}</DialogTitle>
              <DialogDescription className="text-[#5a5448] dark:text-[#a39e8f] text-xs leading-relaxed">
                {request.description}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-[#5a5448] dark:text-[#a39e8f] hover:bg-[#ece4cf] dark:hover:bg-[#22211b] hover:text-[#15140f] dark:hover:text-[#f7f1de] text-xs font-mono uppercase tracking-wider cursor-pointer rounded-full px-5"
              >
                Cancel
              </Button>
              <Button
                onClick={() => { request.action(); onClose(); }}
                className="bg-[#ed6f5c] hover:bg-[#e25e4a] text-white font-mono text-xs rounded-full px-6 uppercase tracking-wider cursor-pointer border-0"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Yes, Discard
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
