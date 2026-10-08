'use client';

import React, { useState, useEffect } from 'react';
import { Player } from '@/types/game';
import { OneNightWerewolfAction, OneNightWerewolfState, RoleId } from './types';
import { ROLES, NIGHT_WAKE_ORDER } from './roles';
import { getOneNightWerewolfBotAction } from './logic';
import { soundFX } from '@/lib/sounds';
import {
  Moon,
  Sun,
  Eye,
  Vote,
  History,
  Shield,
  Clock,
  Sparkles,
  Trophy,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface OneNightWerewolfBoardProps {
  state: OneNightWerewolfState;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  onAction: (action: OneNightWerewolfAction) => void;
  onReturnToLobby?: () => void;
}

export default function OneNightWerewolfBoard({
  state,
  players,
  currentPlayerId,
  isHost,
  onAction,
  onReturnToLobby,
}: OneNightWerewolfBoardProps) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [showRewind, setShowRewind] = useState(false);
  const [peekMyCard, setPeekMyCard] = useState(false);

  const myInitialRole = state.initialPlayerRoles[currentPlayerId] || 'villager';
  const myRoleDef = ROLES[myInitialRole];

  const isNight = state.phase.startsWith('night_');
  const isMyTurnToWake = isNight && state.activeNightRole === myInitialRole;

  const myInspections = state.inspectedCards[currentPlayerId] || [];

  // Reset target selection when phase changes
  useEffect(() => {
    setSelectedTargets([]);
  }, [state.phase]);

  // Audio cues on phase transition
  useEffect(() => {
    if (state.phase === 'day_discussion') {
      soundFX.playStart();
    } else if (state.phase === 'voting' || state.phase === 'reveal') {
      soundFX.playTurnPing();
    }
  }, [state.phase]);

  // Automated bot handling (Host coordinates)
  useEffect(() => {
    if (!isHost) return;

    if (isNight && state.activeNightRole) {
      // Find bots with this active role
      const botPlayers = players.filter(
        (p) => p.id.startsWith('bot_') && state.initialPlayerRoles[p.id] === state.activeNightRole
      );

      if (botPlayers.length > 0) {
        const timer = setTimeout(() => {
          botPlayers.forEach((bot) => {
            const botAction = getOneNightWerewolfBotAction(state, bot.id);
            if (botAction) {
              onAction({ ...botAction, _asPlayerId: bot.id } as any);
            }
          });
          // Complete night turn
          onAction({ type: 'NIGHT_DONE' });
        }, 1200);
        return () => clearTimeout(timer);
      }
    }

    if (state.phase === 'voting') {
      const botsWithoutVote = players.filter(
        (p) => p.id.startsWith('bot_') && !state.votes[p.id]
      );
      if (botsWithoutVote.length > 0) {
        const timer = setTimeout(() => {
          botsWithoutVote.forEach((bot) => {
            const botAction = getOneNightWerewolfBotAction(state, bot.id);
            if (botAction) {
              onAction({ ...botAction, _asPlayerId: bot.id } as any);
            }
          });
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isHost, state, isNight, players, onAction]);

  // Handle player or center card click
  const handleCardClick = (targetId: string) => {
    if (!isMyTurnToWake) return;
    soundFX.playClick();

    if (myInitialRole === 'seer') {
      // Seer can pick 1 player OR up to 2 center cards
      if (targetId.startsWith('center_')) {
        const currentCenters = selectedTargets.filter((t) => t.startsWith('center_'));
        if (currentCenters.includes(targetId)) {
          setSelectedTargets(currentCenters.filter((t) => t !== targetId));
        } else if (currentCenters.length < 2) {
          const updated = [...currentCenters, targetId];
          setSelectedTargets(updated);
          // Peek center action
          onAction({
            type: 'NIGHT_ACTION',
            actionType: 'peek_center',
            targets: [targetId],
          });
        }
      } else if (targetId !== currentPlayerId) {
        // Peek player
        setSelectedTargets([targetId]);
        onAction({
          type: 'NIGHT_ACTION',
          actionType: 'peek_player',
          targets: [targetId],
        });
      }
    } else if (myInitialRole === 'robber' && targetId !== currentPlayerId && !targetId.startsWith('center_')) {
      setSelectedTargets([targetId]);
      onAction({
        type: 'NIGHT_ACTION',
        actionType: 'rob_swap',
        targets: [targetId],
      });
    } else if (myInitialRole === 'troublemaker' && targetId !== currentPlayerId && !targetId.startsWith('center_')) {
      if (selectedTargets.includes(targetId)) {
        setSelectedTargets(selectedTargets.filter((t) => t !== targetId));
      } else if (selectedTargets.length < 2) {
        const nextTargets = [...selectedTargets, targetId];
        setSelectedTargets(nextTargets);
        if (nextTargets.length === 2) {
          onAction({
            type: 'NIGHT_ACTION',
            actionType: 'trouble_swap',
            targets: nextTargets,
          });
        }
      }
    } else if (myInitialRole === 'drunk' && targetId.startsWith('center_')) {
      setSelectedTargets([targetId]);
      onAction({
        type: 'NIGHT_ACTION',
        actionType: 'drunk_swap',
        targets: [targetId],
      });
    } else if (myInitialRole === 'werewolf' && targetId.startsWith('center_')) {
      // Lone werewolf peek
      const livingWolves = Object.keys(state.initialPlayerRoles).filter(
        (id) => state.initialPlayerRoles[id] === 'werewolf'
      );
      if (livingWolves.length === 1) {
        setSelectedTargets([targetId]);
        onAction({
          type: 'NIGHT_ACTION',
          actionType: 'peek_center',
          targets: [targetId],
        });
      }
    }
  };

  const hasVoted = Boolean(state.votes[currentPlayerId]);
  const isReadyForVote = state.readyForVotePlayerIds.includes(currentPlayerId);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12 select-none">
      {/* Top Header & Phase Bar */}
      <div className="bg-[#111215] border border-[#222429] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#18191e] border border-[#272930] text-xl">
            {isNight ? '🌙' : '☀️'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                One Night Werewolf
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                คืนเดียวจบ
              </span>
            </div>
            <p className="text-xs text-zinc-400 capitalize">
              Phase: {state.phase.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Night/Day Phase Indicator */}
          <div className="px-3.5 py-1.5 rounded-xl bg-[#18191e] border border-[#272930] text-xs font-mono flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-200">
              {isNight && state.activeNightRole ? ROLES[state.activeNightRole].name : 'Town Square'}
            </span>
          </div>

          <button
            onClick={() => setShowRewind(!showRewind)}
            className="btn-tactile p-2 rounded-xl bg-[#18191e] hover:bg-[#202228] text-zinc-400 hover:text-white border border-[#272930] transition text-xs flex items-center gap-1.5"
            title="View Night Action Timeline"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Timeline</span>
          </button>
        </div>
      </div>

      {/* Your Secret Starting Card Deck Card */}
      <div className="bg-[#111215] border border-[#222429] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-16 rounded-xl bg-[#18191e] border border-[#272930] flex items-center justify-center text-2xl shadow-inner">
            {peekMyCard || state.phase === 'reveal' ? myRoleDef.icon : '❓'}
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Your Dealt Role (Starting Identity)
            </span>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{myRoleDef.name} ({myRoleDef.nameTh})</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  myRoleDef.team === 'werewolf'
                    ? 'bg-rose-500/20 text-rose-300'
                    : myRoleDef.team === 'tanner'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {myRoleDef.team.toUpperCase()} TEAM
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{myRoleDef.description}</p>
          </div>
        </div>

        <button
          onClick={() => setPeekMyCard(!peekMyCard)}
          className="btn-tactile px-3.5 py-2 rounded-xl bg-[#18191e] hover:bg-[#22242a] text-zinc-300 text-xs font-mono border border-[#272930] flex items-center gap-1.5 transition"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{peekMyCard ? 'Hide Card' : 'Peek Dealt Card'}</span>
        </button>
      </div>

      {/* Center 3 Cards Area */}
      <div className="bg-[#111215] border border-[#222429] rounded-2xl p-6 text-center space-y-3 shadow-md">
        <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500">
          The 3 Center Cards
        </span>

        <div className="flex items-center justify-center gap-4 py-2">
          {[0, 1, 2].map((idx) => {
            const centerKey = `center_${idx}`;
            const inspection = myInspections.find((i) => i.targetId === centerKey);
            const revealedRole = state.phase === 'reveal' ? state.centerRoles[idx] : inspection?.role;
            const isSelected = selectedTargets.includes(centerKey);

            return (
              <div
                key={idx}
                onClick={() => handleCardClick(centerKey)}
                className={`w-24 sm:w-28 h-36 rounded-2xl border-2 flex flex-col items-center justify-center p-2.5 transition-all cursor-pointer btn-tactile ${
                  revealedRole
                    ? 'bg-[#18191e] border-amber-400/80 shadow-md ring-1 ring-amber-400/30'
                    : isSelected
                    ? 'bg-[#1a1b22] border-white ring-2 ring-white/50 scale-105'
                    : 'bg-[#141518] border-[#272930] hover:border-zinc-500'
                }`}
              >
                {revealedRole ? (
                  <>
                    <span className="text-3xl mb-1">{ROLES[revealedRole].icon}</span>
                    <span className="text-xs font-bold text-white leading-tight">
                      {ROLES[revealedRole].name}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1 font-mono">
                      Center #{idx + 1}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl mb-1">🌲</span>
                    <span className="text-xs font-mono text-zinc-400">Center #{idx + 1}</span>
                    <span className="text-[10px] text-zinc-600 font-mono mt-2">Face-Down</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Night Action Instruction Console (When it is your turn to wake up) */}
      {isNight && (
        <div className="bg-[#111215] border border-[#222429] rounded-2xl p-5 text-center space-y-4 shadow-sm">
          {isMyTurnToWake ? (
            <div className="space-y-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
                ✨ <strong>Wake up, {myRoleDef.name}!</strong> {myRoleDef.nightInstruction}
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    soundFX.playClick();
                    onAction({ type: 'NIGHT_DONE' });
                  }}
                  className="btn-tactile px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs uppercase tracking-wider transition shadow-sm"
                >
                  Done / Close Eyes 💤
                </button>
              </div>
            </div>
          ) : (
            <div className="py-2 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-300">
                <span className="animate-spin text-sm">🌙</span>
                <span>The village is asleep in the dead of night...</span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                {isHost && (
                  <button
                    onClick={() => onAction({ type: 'NIGHT_DONE' })}
                    className="underline text-zinc-400 hover:text-white"
                  >
                    Host: Skip to next role ⏩
                  </button>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Village Table (Seated Players) */}
      <div className="bg-[#111215] border border-[#222429] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Village Seats ({players.length} Players)
          </h3>
          {state.phase === 'day_discussion' && (
            <span className="text-xs font-mono text-amber-300">
              Debate who among you is lying!
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {players.map((p) => {
            const isMe = p.id === currentPlayerId;
            const inspected = myInspections.find((i) => i.targetId === p.id);
            const revealedRole =
              state.phase === 'reveal' ? state.playerRoles[p.id] : inspected?.role;
            const isSelected = selectedTargets.includes(p.id);
            const isKilled = state.killedPlayerIds.includes(p.id);
            const myVote = state.votes[currentPlayerId] === p.id;

            return (
              <div
                key={p.id}
                onClick={() => {
                  if (isNight && isMyTurnToWake && !isMe) {
                    handleCardClick(p.id);
                  } else if (state.phase === 'voting' && !isMe) {
                    soundFX.playClick();
                    onAction({ type: 'CAST_VOTE', targetPlayerId: p.id });
                  }
                }}
                className={`rounded-xl p-4 border transition-all text-left flex flex-col justify-between gap-3 btn-tactile ${
                  isKilled
                    ? 'bg-rose-950/40 border-rose-500 text-rose-200 ring-2 ring-rose-500/40'
                    : isSelected
                    ? 'bg-[#18191e] border-white ring-2 ring-white/50'
                    : isMe
                    ? 'bg-[#18191e] border-zinc-700'
                    : 'bg-[#141518] border-[#222429] hover:border-[#383b44] cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{p.avatar}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white truncate flex items-center gap-1">
                        <span>{p.name}</span>
                        {isMe && <span className="text-[10px] text-zinc-500 font-mono">(You)</span>}
                      </div>
                      {p.isHost && (
                        <span className="text-[10px] text-amber-400 font-mono">Host</span>
                      )}
                    </div>
                  </div>

                  {myVote && state.phase === 'voting' && (
                    <span className="text-xs font-mono text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                      Voted
                    </span>
                  )}
                </div>

                {/* Card State (Revealed or Masked) */}
                <div className="pt-2 border-t border-[#1e2025] flex items-center justify-between">
                  {revealedRole ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <span>{ROLES[revealedRole].icon}</span>
                      <span>{ROLES[revealedRole].name}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {isMe ? `${myRoleDef.name} (Start)` : 'Card Face-Down'}
                    </span>
                  )}

                  {isKilled && (
                    <span className="text-xs font-mono font-bold text-rose-400">
                      💀 EXECUTED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Phase Controls & Voting Podium */}
      {state.phase === 'day_discussion' && (
        <div className="bg-[#111215] border border-[#222429] rounded-2xl p-5 text-center space-y-3 shadow-sm">
          <div className="text-sm font-bold text-white">
            Town Discussion is Active!
          </div>
          <p className="text-xs text-zinc-400 max-w-lg mx-auto">
            Discuss who you think the Werewolves are. Be careful: Robbers and Troublemakers may have swapped your cards in the night!
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                soundFX.playClick();
                onAction({ type: 'READY_TO_VOTE' });
              }}
              className={`btn-tactile px-5 py-2.5 rounded-xl font-bold text-xs transition ${
                isReadyForVote
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white hover:bg-zinc-200 text-zinc-950 shadow-sm'
              }`}
            >
              {isReadyForVote ? 'Ready to Vote ✓' : 'Ready to Vote 🗳️'}
            </button>

            {isHost && (
              <button
                onClick={() => {
                  soundFX.playClick();
                  onAction({ type: 'READY_TO_VOTE' });
                }}
                className="btn-tactile px-4 py-2.5 rounded-xl bg-[#18191e] hover:bg-[#202228] text-zinc-300 text-xs font-mono border border-[#272930] transition"
              >
                Host: Force Vote ⚡
              </button>
            )}
          </div>
        </div>
      )}

      {/* Voting Phase Banner */}
      {state.phase === 'voting' && (
        <div className="bg-[#111215] border border-amber-500/40 rounded-2xl p-5 text-center space-y-3 shadow-md animate-pulse">
          <div className="text-base font-bold text-amber-300">
            🗳️ Point and Vote! Tap on any player above to cast your vote.
          </div>
          <p className="text-xs text-zinc-400">
            {hasVoted ? 'Vote recorded! Waiting for others...' : 'Select your suspect!'}
          </p>
        </div>
      )}

      {/* Reveal Phase (Game Over / Outcome) */}
      {state.phase === 'reveal' && (
        <div className="bg-[#111215] border border-amber-500/30 rounded-2xl p-6 text-center space-y-4 shadow-xl animate-in zoom-in-95">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-2xl">
            🏆
          </div>

          <div>
            <h3 className="text-xl font-bold text-white capitalize">
              {state.winningTeam === 'village'
                ? 'Village Team Wins! 🌲'
                : state.winningTeam === 'tanner'
                ? 'The Tanner Wins Alone! 💀'
                : 'Werewolf Team Wins! 🐺'}
            </h3>
            <p className="text-xs text-zinc-300 mt-1">{state.winReason}</p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowRewind(true)}
              className="btn-tactile px-5 py-2.5 rounded-xl bg-[#18191e] hover:bg-[#202228] text-zinc-200 text-xs font-bold border border-[#272930] transition"
            >
              Inspect Night Rewind 📜
            </button>

            {onReturnToLobby && (
              <button
                onClick={onReturnToLobby}
                className="btn-tactile px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs uppercase tracking-wider transition shadow-sm"
              >
                Back to Lobby
              </button>
            )}
          </div>
        </div>
      )}

      {/* Night Rewind Timeline Modal */}
      {showRewind && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#111215] border border-[#222429] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-[#222429]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-400" />
                <span>Night Rewind (สิ่งที่เกิดขึ้นในความมืด)</span>
              </h3>
              <button
                onClick={() => setShowRewind(false)}
                className="btn-tactile p-1 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 pr-1 text-xs">
              {state.nightActionLogs.length === 0 ? (
                <p className="text-zinc-500 py-4 text-center">
                  No card swaps or night actions recorded.
                </p>
              ) : (
                state.nightActionLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#18191e] border border-[#272930] rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white capitalize">
                        {ROLES[log.role].icon} {ROLES[log.role].name}
                      </div>
                      <div className="text-zinc-400 text-[11px] mt-0.5">
                        {log.description}
                      </div>
                    </div>
                    {log.swapped && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Swapped
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#222429]">
              <button
                onClick={() => setShowRewind(false)}
                className="btn-tactile w-full py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
