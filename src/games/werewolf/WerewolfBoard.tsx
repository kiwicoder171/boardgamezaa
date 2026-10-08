'use client';

import React, { useState } from 'react';
import { Player } from '@/types/game';
import { WerewolfState, WerewolfAction, WerewolfPlayer } from './types';
import { WEREWOLF_ROLES_CATALOG } from './roles';
import {
  Moon,
  Sun,
  Shield,
  Eye,
  Skull,
  Heart,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
  Check,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { CardFlip } from '@/components/ui/CardFlip';

// Web Audio Ambient & Sound Effects
class WerewolfSoundFX {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playWolfHowl() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.3);
      osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.8);
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.8);
    } catch {
      // Audio fallback
    }
  }

  playBellToll() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 1.2);
    } catch {
      // Audio fallback
    }
  }

  playGavel() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {
      // Audio fallback
    }
  }
}

const werewolfAudio = new WerewolfSoundFX();

interface WerewolfBoardProps {
  state: WerewolfState;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  onAction: (action: WerewolfAction) => void;
  onReturnToLobby: () => void;
}

export default function WerewolfBoard({
  state,
  onAction,
  currentPlayerId,
  isHost,
  onReturnToLobby,
}: WerewolfBoardProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [cardFlipped, setCardFlipped] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showGrimoire, setShowGrimoire] = useState(false);
  const [discussionSecondsLeft, setDiscussionSecondsLeft] = useState(60);

  // Day discussion timer effect
  React.useEffect(() => {
    if (state.phase !== 'day_discussion') {
      setDiscussionSecondsLeft(60);
      return;
    }
    const interval = setInterval(() => {
      setDiscussionSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [state.phase]);

  const me = state.players.find((p) => p.id === currentPlayerId);
  const roleConfig = me ? WEREWOLF_ROLES_CATALOG[me.role] : null;
  const isNight = state.phase === 'night';
  const isMyNightTurn =
    isNight &&
    me &&
    me.isAlive &&
    (state.activeNightRole === me.role ||
      (state.activeNightRole === 'werewolf' && me.role === 'wolf_pup'));

  const playSound = (fn: () => void) => {
    if (soundEnabled) fn();
  };

  // Night Action Submit
  const handlePerformNightAction = () => {
    if (!selectedTargetId || !me) return;
    playSound(() => werewolfAudio.playGavel());

    if (state.activeNightRole === 'werewolf') {
      onAction({
        type: 'NIGHT_WOLF_KILL',
        playerId: currentPlayerId,
        targetId: selectedTargetId,
      });
    } else if (state.activeNightRole === 'seer') {
      onAction({
        type: 'NIGHT_SEER_INSPECT',
        playerId: currentPlayerId,
        targetId: selectedTargetId,
      });
    } else if (state.activeNightRole === 'bodyguard') {
      onAction({
        type: 'NIGHT_BODYGUARD_PROTECT',
        playerId: currentPlayerId,
        targetId: selectedTargetId,
      });
    }
    setSelectedTargetId(null);
  };

  // Voting Submit
  const handleCastVote = (targetId: string) => {
    if (!me || !me.isAlive || state.phase !== 'day_voting') return;
    playSound(() => werewolfAudio.playGavel());
    onAction({
      type: 'CAST_VOTE',
      playerId: currentPlayerId,
      targetId,
    });
  };

  // Hunter Revenge Submit
  const handleHunterShoot = (targetId: string) => {
    playSound(() => werewolfAudio.playGavel());
    onAction({
      type: 'HUNTER_REVENGE',
      playerId: currentPlayerId,
      targetId,
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* 1. MOONLIT VILLAGE CONTAINER */}
      <div
        className={`rounded-[36px] sm:rounded-[44px] p-5 sm:p-8 relative overflow-hidden shadow-2xl border-4 transition-colors duration-700 ${
          isNight
            ? 'bg-gradient-to-b from-[#060a14] via-[#091124] to-[#04060c] border-indigo-950/80 text-slate-100'
            : 'bg-gradient-to-b from-[#1a140d] via-[#241a0f] to-[#120d06] border-amber-950/80 text-amber-50'
        }`}
      >
        {/* Sky Ambient Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 rounded-2xl bg-black/40 border border-white/10 shadow-inner">
              {isNight ? '🌙' : '☀️'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                    isNight
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {isNight ? `Night ${state.dayNumber}` : `Day ${state.dayNumber} Trial`}
                </span>
                <h2 className="text-lg sm:text-xl font-serif font-black tracking-wide">
                  Ultimate Werewolf
                </h2>
              </div>
              <p className="text-xs opacity-75 font-mono mt-0.5">
                {isNight
                  ? `Active Night Call: ${
                      state.activeNightRole
                        ? WEREWOLF_ROLES_CATALOG[state.activeNightRole].name
                        : 'Resolving night...'
                    }`
                  : state.phase === 'day_discussion'
                  ? 'Village Square: Open Town Hall Discussion'
                  : 'Village Square: Voting Podium'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGrimoire(true)}
              className="p-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-amber-300 transition shadow-md flex items-center gap-1.5 text-xs font-bold"
              title="Village Grimoire & Roles Catalog"
            >
              <span>📜</span>
              <span className="hidden sm:inline">Grimoire</span>
            </button>
            <button
              onClick={() => setSoundEnabled((v: boolean) => !v)}
              className="p-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 transition shadow-md"
              title={soundEnabled ? 'Mute Ambient Audio' : 'Enable Ambient Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            </button>
            <button
              onClick={onReturnToLobby}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 transition shadow-md"
              title="Return to Room Lobby"
            >
              {isHost ? 'End Game' : 'Lobby'}
            </button>
          </div>
        </div>

        {/* 2. VILLAGE SQUARE CIRCLE */}
        <div className="my-6 relative py-4">
          <div className="text-center mb-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 border border-white/10 text-xs font-serif font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Village Gathering at the Campfire</span>
            </div>

            {state.phase === 'day_discussion' && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-xs font-mono font-bold text-amber-300">
                <span>🗣️ Deliberation Timer:</span>
                <span className="text-sm font-black text-amber-200">
                  00:{discussionSecondsLeft.toString().padStart(2, '0')}
                </span>
                <button
                  onClick={() => setDiscussionSecondsLeft((s) => s + 30)}
                  className="px-2 py-0.5 rounded bg-amber-800/80 hover:bg-amber-700 text-[10px] text-white font-bold ml-1"
                >
                  +30s
                </button>
                {isHost && (
                  <button
                    onClick={() => onAction({ type: 'PROCEED_TO_VOTING', playerId: currentPlayerId })}
                    className="px-2.5 py-0.5 rounded bg-rose-700 hover:bg-rose-600 text-[10px] text-white font-bold ml-1 shadow"
                  >
                    Call Vote 🗳️
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Seated Villagers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {state.players.map((p) => {
              const isMe = p.id === currentPlayerId;
              const isSelected = selectedTargetId === p.id;
              const hasVotedForThis = Object.values(state.votes).filter((targetId) => targetId === p.id).length;
              const myVote = state.votes[currentPlayerId] === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (p.isAlive && !isMe) {
                      setSelectedTargetId((prev: string | null) => (prev === p.id ? null : p.id));
                    }
                  }}
                  className={`relative rounded-2xl p-4 flex flex-col items-center justify-between gap-2.5 select-none transition border-2 cursor-pointer ${
                    !p.isAlive
                      ? 'bg-black/40 border-slate-800 opacity-40 grayscale cursor-not-allowed'
                      : isSelected
                      ? 'bg-amber-950/40 border-amber-400 shadow-xl -translate-y-1.5 scale-105'
                      : 'bg-black/30 hover:bg-black/50 border-white/10 hover:border-white/30'
                  }`}
                >
                  {/* Status Badges */}
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold opacity-60">#{p.name}</span>
                    {!p.isAlive ? (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <Skull className="w-3 h-3" /> DEAD
                      </span>
                    ) : p.isLover && me?.isLover ? (
                      <span className="text-pink-400 font-bold flex items-center gap-1">
                        <Heart className="w-3 h-3" /> LOVER
                      </span>
                    ) : null}
                  </div>

                  {/* Avatar */}
                  <div className="relative">
                    <span className="text-4xl">{p.avatar}</span>
                    {!p.isAlive && (
                      <div className="absolute inset-0 flex items-center justify-center text-3xl">
                        🪦
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="text-center">
                    <div className="font-serif font-black text-sm">{p.name}</div>
                    {isMe && (
                      <span className="text-[9px] font-mono font-bold text-amber-300">
                        (You)
                      </span>
                    )}
                  </div>

                  {/* Day Voting Count Badges */}
                  {state.phase === 'day_voting' && p.isAlive && (
                    <div className="w-full flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {hasVotedForThis} vote(s)
                      </span>
                      {me?.isAlive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCastVote(p.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold border transition ${
                            myVote
                              ? 'bg-rose-600 border-rose-400 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                          }`}
                        >
                          {myVote ? 'VOTED ✓' : 'VOTE'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Hunter Revenge Button */}
                  {state.phase === 'hunter_revenge' &&
                    state.hunterActivePlayerId === currentPlayerId &&
                    p.isAlive &&
                    !isMe && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHunterShoot(p.id);
                        }}
                        className="w-full mt-2 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-mono font-bold rounded-lg transition"
                      >
                        SHOOT 🏹
                      </button>
                    )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. ACTIVE NIGHT OR DAY WORKBENCH */}
        {isNight && isMyNightTurn && (
          <div className="bg-indigo-950/40 border border-indigo-700/60 rounded-3xl p-5 space-y-3 shadow-xl turn-spotlight">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-indigo-400" />
                <span className="font-serif font-bold text-sm text-indigo-200">
                  {state.activeNightRole === 'werewolf'
                    ? '🐺 WEREWOLF NIGHT ACTION: Pick a villager to eliminate!'
                    : state.activeNightRole === 'seer'
                    ? '🔮 SEER INSPECTION: Gaze into the crystal ball!'
                    : state.activeNightRole === 'bodyguard'
                    ? '🛡️ BODYGUARD PROTECTION: Shield someone from harm!'
                    : 'Your Night Turn'}
                </span>
              </div>
              <button
                onClick={() => onAction({ type: 'SKIP_NIGHT_STEP', playerId: currentPlayerId })}
                className="px-3 py-1 bg-black/40 hover:bg-black/60 border border-white/10 text-xs font-mono rounded-xl transition"
              >
                Skip Turn
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-300 font-mono">
                Selected target:{' '}
                <strong className="text-amber-300">
                  {state.players.find((p) => p.id === selectedTargetId)?.name || 'None selected'}
                </strong>
              </span>
              <button
                disabled={!selectedTargetId}
                onClick={handlePerformNightAction}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-serif font-bold text-xs rounded-xl transition shadow-lg disabled:opacity-40"
              >
                Confirm Night Action ➔
              </button>
            </div>
          </div>
        )}

        {/* Day Discussion Proceed to Voting Button */}
        {state.phase === 'day_discussion' && (
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-3xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-200">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Discuss suspicions and gather alibis. Ready to cast accusations?</span>
            </div>
            <button
              onClick={() => onAction({ type: 'PROCEED_TO_VOTING', playerId: currentPlayerId })}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-serif font-bold text-xs rounded-xl transition shadow-md"
            >
              Begin Trial Voting ⚖️
            </button>
          </div>
        )}

        {/* 4. SECRET ROLE CARD CONSOLE */}
        <div className="mt-6 bg-black/50 border border-white/10 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div
              onClick={() => setCardFlipped((v: boolean) => !v)}
              className="w-16 h-24 select-none cursor-pointer"
              title="Click to Flip Secret Role Card"
            >
              <CardFlip
                isFlipped={cardFlipped}
                className="w-full h-full"
                front={
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-amber-500/40 flex flex-col items-center justify-center p-2 text-center shadow-lg hover:border-amber-400 transition">
                    <span className="text-2xl">❓</span>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-300/80 mt-1">
                      Peep Role
                    </span>
                  </div>
                }
                back={
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-amber-950/80 to-slate-950 border-2 border-amber-400 flex flex-col items-center justify-center p-2 text-center shadow-lg shadow-amber-500/20">
                    <span className="text-3xl">{roleConfig?.icon || '🎭'}</span>
                    <span className="text-[9px] font-mono font-black uppercase text-amber-300 mt-1 truncate max-w-full">
                      {roleConfig?.name || 'Villager'}
                    </span>
                  </div>
                }
              />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">Your Secret Role</div>
              <h3 className="font-serif font-black text-base text-amber-300">
                {cardFlipped ? roleConfig?.name : '•••••••• (Click card to reveal)'}
              </h3>
              <p className="text-xs text-slate-300 max-w-md font-sans">
                {cardFlipped ? roleConfig?.description : 'Protected against screen peeking.'}
              </p>
            </div>
          </div>

          {/* Seer Inspection History */}
          {state.seerInspected[currentPlayerId] && (
            <div className="px-3.5 py-2 rounded-2xl bg-cyan-950/40 border border-cyan-700/60 text-xs font-mono">
              <span className="text-cyan-300 font-bold">🔮 Seer Inspection: </span>
              <span>
                {
                  state.players.find(
                    (p) => p.id === state.seerInspected[currentPlayerId].targetId
                  )?.name
                }{' '}
                is{' '}
                <strong
                  className={
                    state.seerInspected[currentPlayerId].isEvil
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }
                >
                  {state.seerInspected[currentPlayerId].isEvil ? 'WEREWOLF' : 'VILLAGER'}
                </strong>
                !
              </span>
            </div>
          )}
        </div>

        {/* 5. VILLAGE TOWN CHRONICLE (LOG) */}
        <div className="mt-5 bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider opacity-70">
            📜 The Village Chronicle
          </div>
          <div className="max-h-24 overflow-y-auto space-y-1 text-xs font-mono">
            {state.history
              .slice(-6)
              .reverse()
              .map((h) => (
                <div
                  key={h.id}
                  className={`p-1.5 rounded-lg border text-[11px] ${
                    h.type === 'win'
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 font-bold'
                      : h.type === 'death'
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold'
                      : h.type === 'vote'
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'bg-black/30 border-white/5 text-slate-300'
                  }`}
                >
                  {h.text}
                </div>
              ))}
          </div>
        </div>

      {/* VILLAGE VERDICT / VICTORY MODAL */}
      {state.phase === 'game_over' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#10141f] border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-2xl text-slate-100">
            <div className="text-6xl animate-bounce">
              {state.winner === 'werewolves' ? '🐺' : state.winner === 'tanner' ? '🤡' : '🛡️'}
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-wide">
                {state.winner === 'werewolves' ? (
                  <span className="text-rose-400">THE WEREWOLVES WIN!</span>
                ) : state.winner === 'tanner' ? (
                  <span className="text-purple-400">THE TANNER WINS ALONE!</span>
                ) : (
                  <span className="text-emerald-400">THE VILLAGERS WIN!</span>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                {state.winner === 'werewolves'
                  ? 'The lycanthropes have equaled or outnumbered the surviving villagers!'
                  : state.winner === 'tanner'
                  ? 'The Tanner fooled the entire village into executing him, achieving his eccentric victory!'
                  : 'All evil werewolves have been identified and purged from the village!'}
              </p>
            </div>

            {/* Complete Village Roles Reveal Roster */}
            <div className="bg-black/60 rounded-2xl p-4 border border-white/10 text-left space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                True Identities Revealed:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {state.players.map((p) => {
                  const role = WEREWOLF_ROLES_CATALOG[p.role];
                  return (
                    <div
                      key={p.id}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className={`font-mono text-[10px] font-bold ${role.team === 'werewolves' ? 'text-rose-400' : role.team === 'tanner' ? 'text-purple-400' : 'text-emerald-400'}`}>
                        {role.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => onAction({ type: 'RESTART_GAME' })}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold rounded-xl transition shadow-lg shadow-amber-900/50 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <span>Play Again 🔄</span>
              </button>
              <button
                onClick={onReturnToLobby}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-extrabold rounded-xl transition text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <span>Return to Lobby 🏛️</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VILLAGE GRIMOIRE & ROLES GUIDE MODAL */}
      {showGrimoire && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f1422] border-2 border-amber-600/60 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📜</span>
                <div>
                  <h3 className="text-xl font-bold font-serif text-amber-400">Village Grimoire & Roles</h3>
                  <div className="text-xs text-slate-400">All Base & Expansion Roles Reference</div>
                </div>
              </div>
              <button
                onClick={() => setShowGrimoire(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 text-xs text-slate-300">
              {Object.values(WEREWOLF_ROLES_CATALOG).map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-2xl bg-black/40 border border-slate-800 flex items-start gap-3"
                >
                  <div className="text-2xl p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                    {r.icon}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{r.name}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          r.team === 'werewolves'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : r.team === 'tanner'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {r.team.toUpperCase()} TEAM
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{r.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 text-right">
              <button
                onClick={() => setShowGrimoire(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider"
              >
                Close Grimoire
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
