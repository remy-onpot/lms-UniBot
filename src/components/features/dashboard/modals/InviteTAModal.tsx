// src/components/features/dashboard/modals/InviteTAModal.tsx
'use client';
import { Button } from '../../../ui/Button';
import { FocusTrap } from 'focus-trap-react';

interface InviteTAModalProps {
  onClose: () => void;
  userId: string;
}

export default function InviteTAModal({ onClose, userId }: InviteTAModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="invite-ta-title">
      <FocusTrap focusTrapOptions={{ onDeactivate: onClose, clickOutsideDeactivates: true }}>
        <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center animate-in zoom-in-95 duration-200">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4" aria-hidden="true">🤝</div>
          <h2 id="invite-ta-title" className="text-xl font-bold mb-2 text-slate-900">Invite Co-Lecturer</h2>
          <p className="text-slate-500 text-sm mb-6">Share this code with your TA or colleague.</p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
              <p className="font-mono text-2xl font-bold text-orange-800 tracking-widest select-all">
                  {`TA-${userId.substring(0,4).toUpperCase()}-${Math.floor(Math.random()*1000)}`}
              </p>
          </div>
          <Button onClick={onClose} variant="primary" className="w-full bg-slate-900 hover:bg-slate-800">Done</Button>
        </div>
      </FocusTrap>
    </div>
  );
}