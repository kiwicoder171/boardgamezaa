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
              className="w-full max-w-md bg-[#111215] border border-[#222429] rounded-2xl p-6 shadow-2xl text-zinc-100 space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#222429] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#18191e] border border-[#272930] flex items-center justify-center text-zinc-300">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-tight">
                      Game & Table Preferences
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {gameTitle ? `Session: ${gameTitle}` : 'BoardgameZaa Console'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="btn-tactile p-2 rounded-xl bg-[#18191e] hover:bg-[#22242a] text-zinc-400 hover:text-white border border-[#272930] transition"
                  aria-label="Close settings"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Settings Options */}
              <div className="space-y-3.5">
                {/* Audio Effects Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#141518] border border-[#222429]">
                  <div className="flex items-center gap-3">
                    {muted ? (
                      <VolumeX className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-zinc-200" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-white">Table Audio & Sound FX</div>
                      <div className="text-[11px] text-zinc-500">
                        Synthesized dice, card flips & timer cues
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={toggleSound}
                    className={`btn-tactile px-3.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                      muted
                        ? 'bg-[#18191e] border-[#272930] text-zinc-400'
                        : 'bg-white border-white text-zinc-950 font-bold'
                    }`}
                  >
                    {muted ? 'Muted 🔇' : 'Enabled 🔊'}
                  </button>
                </div>

                {/* Invite Link Share */}
                {roomCode && (
                  <div className="p-3.5 rounded-xl bg-[#141518] border border-[#222429] space-y-2">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span className="text-zinc-300">Room Invite Link</span>
                      <span className="font-mono text-zinc-200 font-bold bg-[#18191e] px-2 py-0.5 rounded border border-[#272930]">
                        {roomCode}
                      </span>
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
                        className="flex-1 bg-[#18191e] border border-[#272930] rounded-lg px-3 py-1.5 text-xs text-zinc-300 font-mono select-all focus:outline-none focus:border-zinc-500"
                      />
                      <button
                        onClick={copyInvite}
                        className="btn-tactile px-3.5 py-1.5 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="btn-tactile w-full py-2 bg-[#18191e] hover:bg-[#22242a] text-zinc-300 hover:text-white font-semibold rounded-xl text-xs border border-[#272930] transition"
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
