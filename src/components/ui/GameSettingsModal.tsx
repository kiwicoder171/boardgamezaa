'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, VolumeX, Share2, Copy, Check, Sparkles, Sliders } from 'lucide-react';
import { soundFX } from '@/lib/sounds';

interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string;
  gameTitle?: string;
}

export function GameSettingsModal({
  isOpen,
  onClose,
  roomCode,
  gameTitle,
}: GameSettingsModalProps) {
  const [muted, setMuted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const isMuted = localStorage.getItem('bgz_sound_muted') === 'true';
    setMuted(isMuted);
  }, []);

  const toggleSound = () => {
    const nextState = !muted;
    setMuted(nextState);
    localStorage.setItem('bgz_sound_muted', String(nextState));
    if (!nextState) {
      soundFX.playClick();
    }
  };

  const copyInvite = () => {
    if (!roomCode) return;
    soundFX.playClick();
    const url = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Dialog Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="w-full max-w-md bg-[#0d1422] border-2 border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white tracking-wide">
                      Game & Table Preferences
                    </h3>
                    <p className="text-xs text-slate-400">
                      {gameTitle ? `Session: ${gameTitle}` : 'BoardgameZaa Console'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="btn-tactile p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60"
                  aria-label="Close settings"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Settings Options */}
              <div className="space-y-4">
                {/* Audio Effects Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-slate-800">
                  <div className="flex items-center gap-3">
                    {muted ? (
                      <VolumeX className="w-5 h-5 text-rose-400" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-amber-400" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-white">Table Audio & Sound FX</div>
                      <div className="text-[11px] text-slate-400">
                        Synthesized dice, card flips & timer cues
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={toggleSound}
                    className={`btn-tactile px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                      muted
                        ? 'bg-slate-800 border-slate-700 text-slate-400'
                        : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    }`}
                  >
                    {muted ? 'Muted 🔇' : 'Enabled 🔊'}
                  </button>
                </div>

                {/* Invite Link Share */}
                {roomCode && (
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Room Invite Link</span>
                      <span className="font-mono text-amber-400 font-black">{roomCode}</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={
                          typeof window !== 'undefined'
                            ? `${window.location.origin}/room/${roomCode}`
                            : `room/${roomCode}`
                        }
                        className="flex-1 bg-[#060a12] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono select-all focus:outline-none"
                      />
                      <button
                        onClick={copyInvite}
                        className="btn-tactile px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="btn-tactile w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs border border-slate-700 transition"
              >
                Close Preferences
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
