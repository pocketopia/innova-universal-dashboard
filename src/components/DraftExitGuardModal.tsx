import React from 'react';
import { AlertTriangle, Save, Trash2, X } from 'lucide-react';
import { InnovaDraftTenant } from '../lib/draftVault';

interface DraftExitGuardModalProps {
  open: boolean;
  tenant: InnovaDraftTenant;
  projectTitle?: string;
  isUploading?: boolean;
  onSaveAndExit: () => void;
  onDiscardAndExit: () => void;
  onStay: () => void;
}

const TENANT_THEME: Record<InnovaDraftTenant, { label: string; border: string; glow: string; btn: string; text: string }> = {
  StreamShare: {
    label: 'StreamShare Client Delivery',
    border: 'border-amber-400',
    glow: 'shadow-[0_0_35px_rgba(245,158,11,0.45)]',
    btn: 'bg-amber-400 hover:bg-amber-300 text-black',
    text: 'text-amber-400',
  },
  MVN: {
    label: 'Music Video Nation Artist Upload',
    border: 'border-red-500',
    glow: 'shadow-[0_0_35px_rgba(239,68,68,0.5)]',
    btn: 'bg-red-500 hover:bg-red-400 text-white',
    text: 'text-red-400',
  },
  HekticTV: {
    label: 'Hektic TV Broadcast Submission',
    border: 'border-rose-500',
    glow: 'shadow-[0_0_35px_rgba(244,63,94,0.5)]',
    btn: 'bg-rose-500 hover:bg-rose-400 text-white',
    text: 'text-rose-400',
  },
  Kreation: {
    label: 'Kreation Cloud Game Build (.zip / WebGL2)',
    border: 'border-cyan-400',
    glow: 'shadow-[0_0_35px_rgba(0,240,255,0.5)]',
    btn: 'bg-cyan-400 hover:bg-cyan-300 text-black',
    text: 'text-cyan-400',
  },
  ArcHaven: {
    label: 'ArcHaven AI Series / Feature Film Premiere',
    border: 'border-sky-400',
    glow: 'shadow-[0_0_35px_rgba(0,163,255,0.5)]',
    btn: 'bg-sky-400 hover:bg-sky-300 text-black',
    text: 'text-sky-400',
  },
};

export default function DraftExitGuardModal({
  open,
  tenant,
  projectTitle,
  isUploading,
  onSaveAndExit,
  onDiscardAndExit,
  onStay,
}: DraftExitGuardModalProps) {
  if (!open) return null;
  const theme = TENANT_THEME[tenant];

  return (
    <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`w-full max-w-lg rounded-2xl bg-[#070a12] border-2 ${theme.border} ${theme.glow} p-6 space-y-5 text-white`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl bg-white/5 border ${theme.border} flex items-center justify-center shrink-0`}>
              <AlertTriangle className={`w-6 h-6 ${theme.text}`} />
            </div>
            <div>
              <p className={`text-[10px] font-mono font-black uppercase tracking-widest ${theme.text}`}>
                {isUploading ? 'ACTIVE CLOUD UPLOAD IN PROGRESS' : 'UNSAVED SUBMISSION DRAFT DETECTED'}
              </p>
              <h3 className="text-lg font-bold text-white mt-0.5">{theme.label}</h3>
            </div>
          </div>
          <button onClick={onStay} className="cursor-pointer text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {isUploading ? (
            <>
              Your cloud upload for <strong className="text-white">{projectTitle || 'this project'}</strong> is currently streaming bytes to Google Cloud Storage. Leaving now will interrupt the active transfer, though we can preserve your draft &amp; selected files so you can resume anytime.
            </>
          ) : (
            <>
              You have an in-progress draft{projectTitle ? <> for <strong className="text-white">&ldquo;{projectTitle}&rdquo;</strong></> : ''}. Would you like to save your draft (including your selected media files &amp; metadata) before returning to the Hub?
            </>
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onStay}
            className="cursor-pointer px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white"
          >
            Stay &amp; Continue
          </button>
          <button
            onClick={onDiscardAndExit}
            className="cursor-pointer px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Discard Draft
          </button>
          <button
            onClick={onSaveAndExit}
            className={`cursor-pointer px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 ${theme.btn}`}
          >
            <Save className="w-4 h-4" /> Save Draft &amp; Exit
          </button>
        </div>
      </div>
    </div>
  );
}
