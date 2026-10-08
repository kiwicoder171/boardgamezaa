'use client';

import React, { useState } from 'react';
import { GameDefinition } from '@/types/game';
import { Layers, X } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: GameDefinition;
}

export default function RulesModal({ isOpen, onClose, game }: RulesModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'sections'>('summary');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#111215] border border-[#222429] rounded-2xl p-6 max-w-2xl w-full space-y-5 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222429] pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-[#18191e] rounded-xl border border-[#272930]">
              {game.icon}
            </span>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {game.name} Rules
              </h3>
              <div className="text-xs text-zinc-400 mt-0.5">{game.description}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-tactile p-2 rounded-xl bg-[#18191e] hover:bg-[#22242a] text-zinc-400 hover:text-white border border-[#272930] transition"
            aria-label="Close Rules Manual"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabbed Info Selector */}
        <div className="flex gap-2 border-b border-[#222429] pb-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={`btn-tactile px-3.5 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTab === 'summary'
                ? 'bg-white text-zinc-950 font-bold'
                : 'bg-[#18191e] text-zinc-400 hover:text-white border border-[#272930]'
            }`}
          >
            Overview & Objective
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`btn-tactile px-3.5 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTab === 'sections'
                ? 'bg-white text-zinc-950 font-bold'
                : 'bg-[#18191e] text-zinc-400 hover:text-white border border-[#272930]'
            }`}
          >
            Turn Guide & Rules ({game.rules.sections.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto space-y-3.5 pr-1 text-sm text-zinc-300">
          {activeTab === 'summary' ? (
            <div className="space-y-3.5">
              <div className="p-4 bg-[#141518] border border-[#222429] rounded-xl text-xs text-zinc-300 leading-relaxed">
                <span className="font-bold text-white font-mono uppercase text-[10px] block mb-1">
                  Objective
                </span>
                {game.rules.summary}
              </div>

              <div className="p-4 bg-[#141518] border border-[#222429] rounded-xl space-y-1.5">
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  Tabletop Simulation
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  All physical tokens, cards, and dice are simulated in real time with anti-cheat state masking. Secret roles and unplaced dice are concealed until legally revealed.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {game.rules.sections.map((sec, idx) => (
                <div key={idx} className="p-4 bg-[#141518] rounded-xl border border-[#222429] space-y-1.5">
                  <h4 className="font-bold text-white text-xs font-mono uppercase tracking-wider">
                    {sec.title}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">{sec.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#222429] flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">
            👥 {game.minPlayers}-{game.maxPlayers} players • ⏱️ {game.durationMinutes}
          </span>
          <button
            onClick={onClose}
            className="btn-tactile px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
