'use client';

import React, { useState, useEffect } from 'react';
import { Player } from '@/types/game';
import {
  CoupAction,
  CoupActionType,
  CoupClientState,
  CoupRole,
} from './types';
import { ROLE_METADATA } from './cards';
import { soundFX } from '@/lib/sounds';
import {
  Shield,
  Coins,
  History,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Skull,
  UserX,
  Swords,
  CheckCircle2,
  HelpCircle,
  Clock,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface CoupBoardProps {
  state: CoupClientState;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  onAction: (action: CoupAction) => void;
  onReturnToLobby?: () => void;
}

export default function CoupBoard({
  state,
  players,
  currentPlayerId,
  isHost,
  onAction,
  onReturnToLobby,
}: CoupBoardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [targetSelectAction, setTargetSelectAction] = useState<CoupActionType | null>(null);
  const [exchangeKeptIds, setExchangeKeptIds] = useState<string[]>([]);

  const myState = state.players[currentPlayerId];
  const isMyTurn = state.phase === 'action_selection' && state.currentTurnPlayerId === currentPlayerId;
  const currentActor = players.find((p) => p.id === state.currentTurnPlayerId);

  // Audio feedback on phase changes
  useEffect(() => {
    if (state.phase === 'action_selection') {
      if (isMyTurn) soundFX.playTurnPing();
    } else if (state.phase === 'action_reaction' || state.phase === 'block_reaction') {
      soundFX.playClick();
    } else if (state.phase === 'game_over') {
      soundFX.playVictory();
    }
  }, [state.phase, isMyTurn]);

  // Host coordinates bot actions
  useEffect(() => {
    if (!isHost) return;

    const botToAct = state.turnOrder.find((id) => {
      if (!id.startsWith('bot_')) return false;
      const bot = state.players[id];
      if (bot?.isEliminated) return false;

      if (state.phase === 'action_selection' && state.currentTurnPlayerId === id) return true;
      if (state.phase === 'choose_loss' && state.pendingLoss?.playerId === id) return true;
      if (state.phase === 'exchange_selection' && state.exchangeCards?.playerId === id) return true;
      if (
        state.phase === 'action_reaction' &&
        state.pendingAction &&
        state.pendingAction.actorId !== id &&
        !state.pendingAction.passedPlayerIds.includes(id)
      ) {
        return true;
      }
      if (
        state.phase === 'block_reaction' &&
        state.pendingBlock &&
        state.pendingBlock.blockerId !== id &&
        !state.pendingBlock.passedPlayerIds.includes(id)
      ) {
        return true;
      }
      return false;
    });

    if (botToAct) {
      const timer = setTimeout(() => {
        onAction({ type: 'BOT_AUTO_TURN', botId: botToAct });
        soundFX.playClick();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state, isHost, onAction]);

  // Handle action declaration
  const handleDeclareAction = (type: CoupActionType, targetId?: string) => {
    soundFX.playClick();
    onAction({
      type: 'DECLARE_ACTION',
      playerId: currentPlayerId,
      actionType: type,
      targetId,
    });
    setTargetSelectAction(null);
  };

  // Alive opponents list for targeting
  const aliveOpponents = state.turnOrder
    .filter((id) => id !== currentPlayerId && !state.players[id]?.isEliminated)
    .map((id) => players.find((p) => p.id === id) || { id, name: id, avatar: '👤' });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 select-none font-sans pb-12">
      {/* Top Banner / Match Info */}
      <div className="bg-[#111215] border border-[#222429] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide">
                Coup (โค่นอำนาจ)
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 font-semibold">
                {state.phase === 'action_selection'
                  ? `Turn: ${currentActor?.name || state.currentTurnPlayerId}`
                  : state.phase === 'action_reaction'
                  ? `Reaction Window`
                  : state.phase === 'block_reaction'
                  ? `Block Reaction`
                  : state.phase === 'choose_loss'
                  ? `Sacrifice Influence`
                  : state.phase === 'exchange_selection'
                  ? `Ambassador Exchange`
                  : `Court Crowned`}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Rikki Tahta Classic • Dystopian Italian Court Intrigue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCheatSheet(!showCheatSheet)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#18191e] border border-[#272930] text-amber-300 hover:text-white hover:bg-[#222429] transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Role Guide</span>
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#18191e] border border-[#272930] text-zinc-300 hover:text-white hover:bg-[#222429] transition"
          >
            <History className="w-3.5 h-3.5" />
            <span>Court Log ({state.logs.length})</span>
          </button>
          {onReturnToLobby && (
            <button
              onClick={onReturnToLobby}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#18191e] border border-[#272930] text-zinc-400 hover:text-white hover:bg-[#222429] transition"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      {/* Role Cheat Sheet Drawer */}
      {showCheatSheet && (
        <div className="bg-[#111215] border border-amber-500/30 rounded-2xl p-5 space-y-3 animate-in fade-in zoom-in-95 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#222429] pb-2">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>📜</span> Character Roles & Rules Summary (สรุปบทบาทและหน้าที่)
            </h3>
            <button
              onClick={() => setShowCheatSheet(false)}
              className="text-xs text-zinc-500 hover:text-white"
            >
              ✕ Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
            {Object.values(ROLE_METADATA).map((rm) => (
              <div
                key={rm.role}
                className={`p-3 rounded-xl border bg-gradient-to-br ${rm.gradient} space-y-1.5`}
              >
                <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                  <span>{rm.icon}</span>
                  <span>{rm.name}</span>
                </div>
                <div className="text-[11px] text-zinc-300 font-mono">
                  {rm.nameTh}
                </div>
                <div className="pt-1 border-t border-white/10 space-y-1">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">
                      Action:
                    </span>
                    <p className="text-[11px] text-zinc-200">{rm.actionNameTh}</p>
                  </div>
                  {rm.counterActionNameTh && (
                    <div>
                      <span className="text-[10px] text-amber-300 uppercase font-bold">
                        Block:
                      </span>
                      <p className="text-[11px] text-amber-200">
                        {rm.counterActionNameTh}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Log Drawer */}
      {showHistory && (
        <div className="bg-[#111215] border border-[#222429] rounded-2xl p-4 max-h-48 overflow-y-auto space-y-2">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Court Action Log
          </h3>
          <div className="space-y-1 text-xs">
            {state.logs.slice(-12).reverse().map((log, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-2 text-zinc-300 py-1 border-b border-[#1c1d22] last:border-0"
              >
                <span>{log.textTh || log.text}</span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Arena */}
      {state.phase !== 'game_over' && (
        <div className="space-y-6">
          {/* Reaction Console Popover (Challenges & Blocks) */}
          {state.phase === 'action_reaction' && state.pendingAction && (
            <div className="bg-gradient-to-r from-purple-950/60 via-zinc-900 to-indigo-950/60 border-2 border-purple-500/60 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-xl">
                    ⚔️
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>
                        {players.find((p) => p.id === state.pendingAction?.actorId)?.name ||
                          state.pendingAction.actorId}{' '}
                        declared {state.pendingAction.type}
                      </span>
                      {state.pendingAction.claimedRole && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 border border-purple-500/50 text-purple-200">
                          Claiming {ROLE_METADATA[state.pendingAction.claimedRole].name}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Do you challenge their claim or allow the action to proceed?
                    </p>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="text-xs font-mono text-zinc-400">
                  {state.pendingAction.passedPlayerIds.includes(currentPlayerId) ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> You Allowed
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 animate-spin" /> Awaiting Decision...
                    </span>
                  )}
                </div>
              </div>

              {/* Reaction Buttons */}
              {currentPlayerId !== state.pendingAction.actorId &&
                !myState?.isEliminated &&
                !state.pendingAction.passedPlayerIds.includes(currentPlayerId) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Challenge button if role claimed */}
                    {state.pendingAction.claimedRole && (
                      <button
                        onClick={() => {
                          soundFX.playClick();
                          onAction({ type: 'CHALLENGE_ACTION', playerId: currentPlayerId });
                        }}
                        className="btn-tactile px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                      >
                        <Swords className="w-4 h-4" />
                        <span>Challenge {ROLE_METADATA[state.pendingAction.claimedRole].name} Claim!</span>
                      </button>
                    )}

                    {/* Block button for Foreign Aid (Duke) */}
                    {state.pendingAction.type === 'FOREIGN_AID' && (
                      <button
                        onClick={() => {
                          soundFX.playClick();
                          onAction({
                            type: 'DECLARE_BLOCK',
                            playerId: currentPlayerId,
                            claimedRole: 'duke',
                          });
                        }}
                        className="btn-tactile px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                      >
                        <Shield className="w-4 h-4" />
                        <span>Block with Duke</span>
                      </button>
                    )}

                    {/* Block button for Assassinate (Contessa) */}
                    {state.pendingAction.type === 'ASSASSINATE' &&
                      state.pendingAction.targetId === currentPlayerId && (
                        <button
                          onClick={() => {
                            soundFX.playClick();
                            onAction({
                              type: 'DECLARE_BLOCK',
                              playerId: currentPlayerId,
                              claimedRole: 'contessa',
                            });
                          }}
                          className="btn-tactile px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Block with Contessa</span>
                        </button>
                      )}

                    {/* Block button for Steal (Captain or Ambassador) */}
                    {state.pendingAction.type === 'STEAL' &&
                      state.pendingAction.targetId === currentPlayerId && (
                        <>
                          <button
                            onClick={() => {
                              soundFX.playClick();
                              onAction({
                                type: 'DECLARE_BLOCK',
                                playerId: currentPlayerId,
                                claimedRole: 'captain',
                              });
                            }}
                            className="btn-tactile px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                          >
                            <Shield className="w-4 h-4" />
                            <span>Block with Captain</span>
                          </button>
                          <button
                            onClick={() => {
                              soundFX.playClick();
                              onAction({
                                type: 'DECLARE_BLOCK',
                                playerId: currentPlayerId,
                                claimedRole: 'ambassador',
                              });
                            }}
                            className="btn-tactile px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                          >
                            <Shield className="w-4 h-4" />
                            <span>Block with Ambassador</span>
                          </button>
                        </>
                      )}

                    {/* Pass button */}
                    <button
                      onClick={() => {
                        soundFX.playClick();
                        onAction({
                          type: 'PASS_ACTION_REACTION',
                          playerId: currentPlayerId,
                        });
                      }}
                      className="btn-tactile px-5 py-2.5 rounded-xl bg-[#18191e] border border-[#272930] hover:bg-[#222429] text-zinc-300 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Pass / Allow Action</span>
                    </button>
                  </div>
                )}
            </div>
          )}

          {/* Block Reaction Popover */}
          {state.phase === 'block_reaction' && state.pendingBlock && (
            <div className="bg-gradient-to-r from-amber-950/60 via-zinc-900 to-rose-950/60 border-2 border-amber-500/60 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl">
                    🛡️
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>
                        {players.find((p) => p.id === state.pendingBlock?.blockerId)?.name ||
                          state.pendingBlock.blockerId}{' '}
                        claimed {ROLE_METADATA[state.pendingBlock.claimedRole].name} to Block!
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Do you challenge their block claim, or allow the block to succeed?
                    </p>
                  </div>
                </div>

                <div className="text-xs font-mono text-zinc-400">
                  {state.pendingBlock.passedPlayerIds.includes(currentPlayerId) ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> You Allowed
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 animate-spin" /> Awaiting Decision...
                    </span>
                  )}
                </div>
              </div>

              {currentPlayerId !== state.pendingBlock.blockerId &&
                !myState?.isEliminated &&
                !state.pendingBlock.passedPlayerIds.includes(currentPlayerId) && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        soundFX.playClick();
                        onAction({ type: 'CHALLENGE_BLOCK', playerId: currentPlayerId });
                      }}
                      className="btn-tactile px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                    >
                      <Swords className="w-4 h-4" />
                      <span>Challenge Block Claim!</span>
                    </button>

                    <button
                      onClick={() => {
                        soundFX.playClick();
                        onAction({
                          type: 'PASS_BLOCK_REACTION',
                          playerId: currentPlayerId,
                        });
                      }}
                      className="btn-tactile px-5 py-2.5 rounded-xl bg-[#18191e] border border-[#272930] hover:bg-[#222429] text-zinc-300 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Allow Block</span>
                    </button>
                  </div>
                )}
            </div>
          )}

          {/* Sacrifice Modal: Choose Influence Card to Lose */}
          {state.phase === 'choose_loss' && state.pendingLoss?.playerId === currentPlayerId && (
            <div className="bg-rose-950/30 border-2 border-rose-500/60 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 border-b border-rose-500/20 pb-3">
                <Skull className="w-8 h-8 text-rose-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Sacrifice Influence: {state.pendingLoss.cause}
                  </h3>
                  <p className="text-xs text-rose-300">
                    You have lost an influence! Choose one of your active cards to reveal face-up.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {myState.cards
                  .filter((c) => !c.isRevealed)
                  .map((card) => {
                    const meta = card.role ? ROLE_METADATA[card.role] : null;
                    return (
                      <button
                        key={card.id}
                        onClick={() => {
                          soundFX.playTileClack();
                          onAction({
                            type: 'CHOOSE_INFLUENCE_LOSS',
                            playerId: currentPlayerId,
                            cardId: card.id,
                          });
                        }}
                        className="btn-tactile bg-[#16171c] hover:bg-rose-950/60 border-2 border-rose-500/50 hover:border-rose-400 rounded-2xl p-4 flex flex-col items-center justify-between text-center transition-all shadow-md group"
                      >
                        <div className="text-3xl my-2">{meta?.icon || '🎴'}</div>
                        <div className="text-sm font-bold text-white group-hover:text-rose-300">
                          {meta?.name || 'Card'}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1">
                          Click to Sacrifice
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Ambassador Exchange Modal */}
          {state.phase === 'exchange_selection' &&
            state.exchangeCards?.playerId === currentPlayerId && (
              <div className="bg-emerald-950/30 border-2 border-emerald-500/60 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">📜</span>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        Ambassador Card Exchange
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Choose{' '}
                        {myState.cards.filter((c) => !c.isRevealed).length} card(s) to keep. The
                        rest will be shuffled back into the Court Deck.
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={
                      exchangeKeptIds.length !==
                      myState.cards.filter((c) => !c.isRevealed).length
                    }
                    onClick={() => {
                      soundFX.playClick();
                      onAction({
                        type: 'CONFIRM_EXCHANGE',
                        playerId: currentPlayerId,
                        keepCardIds: exchangeKeptIds,
                      });
                      setExchangeKeptIds([]);
                    }}
                    className="btn-tactile px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold text-xs transition shadow-md"
                  >
                    Confirm Selection ({exchangeKeptIds.length}/
                    {myState.cards.filter((c) => !c.isRevealed).length})
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {state.exchangeCards.cards.map((c) => {
                    const isKept = exchangeKeptIds.includes(c.id);
                    const meta = c.role ? ROLE_METADATA[c.role] : null;
                    const maxAllowed = myState.cards.filter((x) => !x.isRevealed).length;

                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          soundFX.playClick();
                          if (isKept) {
                            setExchangeKeptIds(exchangeKeptIds.filter((id) => id !== c.id));
                          } else if (exchangeKeptIds.length < maxAllowed) {
                            setExchangeKeptIds([...exchangeKeptIds, c.id]);
                          }
                        }}
                        className={`cursor-pointer rounded-2xl p-4 border-2 transition-all flex flex-col items-center justify-between text-center ${
                          isKept
                            ? 'bg-emerald-950/70 border-emerald-400 ring-2 ring-emerald-400/30 scale-102'
                            : 'bg-[#16171c] border-[#272930] hover:border-[#383b44]'
                        }`}
                      >
                        <div className="text-3xl my-2">{meta?.icon || '🎴'}</div>
                        <div className="text-sm font-bold text-white">{meta?.name}</div>
                        <div className="text-[10px] text-zinc-400">{meta?.nameTh}</div>
                        <div
                          className={`mt-2 text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            isKept
                              ? 'bg-emerald-400 text-zinc-950'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {isKept ? 'KEEP' : 'RETURN'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Center Stage: Seated Players Circle & Court Treasury */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: The Seated Court */}
            <div className="lg:col-span-2 bg-[#111215] border border-[#222429] rounded-3xl p-6 space-y-6 shadow-md">
              <div className="flex items-center justify-between border-b border-[#222429] pb-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  The Royal Court ({state.turnOrder.length} Operatives)
                </span>
                <span className="text-xs text-zinc-500">
                  {state.turnOrder.filter((id) => !state.players[id]?.isEliminated).length}{' '}
                  Survivors Standing
                </span>
              </div>

              {/* Seated Players Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {state.turnOrder.map((id) => {
                  const pData = state.players[id];
                  const pProfile = players.find((p) => p.id === id);
                  const isActive =
                    state.phase === 'action_selection' && id === state.currentTurnPlayerId;
                  const isDead = pData?.isEliminated;

                  return (
                    <div
                      key={id}
                      className={`relative rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                        isActive
                          ? 'bg-[#181a22] border-purple-500/60 ring-2 ring-purple-500/20'
                          : isDead
                          ? 'bg-[#101114] border-[#1c1d22] opacity-50'
                          : 'bg-[#141518] border-[#222429]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-2xl">{pProfile?.avatar || '👤'}</div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{pProfile?.name || id}</span>
                              {id === currentPlayerId && (
                                <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1 py-0.2 rounded font-mono">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-amber-400 font-mono font-bold flex items-center gap-1 mt-0.5">
                              <Coins className="w-3 h-3" />
                              <span>{pData?.coins} coins</span>
                            </div>
                          </div>
                        </div>

                        {isActive && !isDead && (
                          <span className="text-[9px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                            Turn
                          </span>
                        )}
                        {isDead && (
                          <span className="text-[9px] font-mono uppercase bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded font-bold">
                            Dead 💀
                          </span>
                        )}
                      </div>

                      {/* Influence Card Slots */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        {pData?.cards.map((c, cIdx) => {
                          const isRevealed = c.isRevealed;
                          const roleName = c.role ? ROLE_METADATA[c.role].name : null;
                          const roleIcon = c.role ? ROLE_METADATA[c.role].icon : '🎴';

                          return (
                            <div
                              key={c.id || cIdx}
                              className={`flex-1 rounded-xl p-2 border flex flex-col items-center justify-center text-center transition ${
                                isRevealed
                                  ? 'bg-rose-950/20 border-rose-900/60 text-rose-400'
                                  : 'bg-[#1c1d24] border-[#2c2e38] text-zinc-300'
                              }`}
                            >
                              <div className="text-lg">{isRevealed ? '💀' : roleIcon}</div>
                              <div className="text-[10px] font-bold truncate max-w-full">
                                {isRevealed ? roleName : id === currentPlayerId ? roleName : 'Hidden'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col: Court Treasury & Deck */}
            <div className="bg-[#111215] border border-[#222429] rounded-3xl p-6 space-y-6 shadow-md flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Court Treasury & Deck
                </h3>

                <div className="bg-[#16171c] border border-[#222429] rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl font-bold">
                      🪙
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">Treasury Bank</div>
                      <div className="text-lg font-mono font-black text-amber-400">
                        {state.treasuryCoins} Coins Left
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#16171c] border border-[#222429] rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xl font-bold">
                      🎴
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">Court Deck Stack</div>
                      <div className="text-lg font-mono font-black text-purple-400">
                        {state.courtDeckCount} Cards Remaining
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Graveyard of Dead Influences */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase text-zinc-500 flex items-center justify-between">
                  <span>Eliminated Influences</span>
                  <span>{state.discardGraveyard.length} Dead</span>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-[#141518] border border-[#222429] rounded-xl">
                  {state.discardGraveyard.map((c, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300 font-bold"
                    >
                      {ROLE_METADATA[c.role].icon} {ROLE_METADATA[c.role].name}
                    </span>
                  ))}
                  {state.discardGraveyard.length === 0 && (
                    <span className="text-[10px] text-zinc-600 italic">
                      No influences lost yet
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Console: Your Influence Hand & Actions */}
          {myState && !myState.isEliminated && (
            <div className="bg-[#111215] border border-[#222429] rounded-3xl p-6 space-y-6 shadow-lg">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222429] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl">
                    🪙
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      Your Influences & Action Console
                    </h2>
                    <div className="text-xs text-zinc-400 flex items-center gap-3 mt-0.5">
                      <span className="text-amber-400 font-mono font-bold">
                        {myState.coins} Coins
                      </span>
                      {myState.coins >= 10 && (
                        <span className="text-rose-400 font-bold animate-pulse">
                          ⚠️ 10+ Coins: Mandatory Coup!
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isMyTurn && (
                  <div className="text-xs px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold animate-pulse">
                    Your Turn: Choose an action below
                  </div>
                )}
              </div>

              {/* Your 2 Cards Hand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                {myState.cards.map((c) => {
                  const meta = c.role ? ROLE_METADATA[c.role] : null;
                  const isDead = c.isRevealed;

                  return (
                    <div
                      key={c.id}
                      className={`rounded-2xl p-4 border-2 flex items-center gap-4 transition-all ${
                        isDead
                          ? 'bg-[#101114] border-rose-950/40 opacity-50'
                          : meta
                          ? `bg-gradient-to-br ${meta.gradient}`
                          : 'bg-[#16171c] border-[#272930]'
                      }`}
                    >
                      <div className="text-4xl">{isDead ? '💀' : meta?.icon || '🎴'}</div>
                      <div>
                        <div className="text-base font-bold text-white flex items-center gap-2">
                          <span>{meta?.name || 'Card'}</span>
                          {isDead && (
                            <span className="text-[9px] uppercase font-mono px-1.5 rounded bg-rose-950 text-rose-400">
                              Dead
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-300 font-mono">
                          {meta?.nameTh}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1 line-clamp-1">
                          {meta?.actionDesc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Selection Buttons (When it's your turn) */}
              {isMyTurn && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Select Your Action (Bluffing Allowed!)
                  </div>

                  {targetSelectAction ? (
                    <div className="bg-[#18191e] border border-[#272930] rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          Select Target for {targetSelectAction}:
                        </span>
                        <button
                          onClick={() => setTargetSelectAction(null)}
                          className="text-xs text-zinc-400 hover:text-white"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {aliveOpponents.map((opp) => (
                          <button
                            key={opp.id}
                            onClick={() => handleDeclareAction(targetSelectAction, opp.id)}
                            className="btn-tactile p-3 rounded-xl bg-[#141518] hover:bg-purple-950/60 border border-[#272930] hover:border-purple-500/50 flex items-center gap-2 text-left transition"
                          >
                            <span className="text-xl">{opp.avatar}</span>
                            <div>
                              <div className="text-xs font-bold text-white">
                                {opp.name}
                              </div>
                              <div className="text-[10px] text-amber-400 font-mono">
                                {state.players[opp.id]?.coins} coins
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                      {/* Income */}
                      <button
                        onClick={() => handleDeclareAction('INCOME')}
                        disabled={myState.coins >= 10}
                        className="btn-tactile p-3 rounded-xl bg-[#18191e] hover:bg-[#222429] disabled:opacity-30 border border-[#272930] text-left transition flex flex-col justify-between"
                      >
                        <div className="text-lg">🪙</div>
                        <div>
                          <div className="text-xs font-bold text-white">Income</div>
                          <div className="text-[10px] text-zinc-400">+1 Coin</div>
                        </div>
                      </button>

                      {/* Foreign Aid */}
                      <button
                        onClick={() => handleDeclareAction('FOREIGN_AID')}
                        disabled={myState.coins >= 10}
                        className="btn-tactile p-3 rounded-xl bg-[#18191e] hover:bg-[#222429] disabled:opacity-30 border border-[#272930] text-left transition flex flex-col justify-between"
                      >
                        <div className="text-lg">🤝</div>
                        <div>
                          <div className="text-xs font-bold text-white">Foreign Aid</div>
                          <div className="text-[10px] text-zinc-400">+2 (Duke blocks)</div>
                        </div>
                      </button>

                      {/* Tax (Duke) */}
                      <button
                        onClick={() => handleDeclareAction('TAX')}
                        disabled={myState.coins >= 10}
                        className="btn-tactile p-3 rounded-xl bg-purple-950/40 hover:bg-purple-950/70 disabled:opacity-30 border border-purple-500/30 text-left transition flex flex-col justify-between"
                      >
                        <div className="text-lg">👑</div>
                        <div>
                          <div className="text-xs font-bold text-purple-200">Tax (Duke)</div>
                          <div className="text-[10px] text-purple-400">+3 Coins</div>
                        </div>
                      </button>

                      {/* Steal (Captain) */}
                      <button
                        onClick={() => setTargetSelectAction('STEAL')}
                        disabled={myState.coins >= 10}
                        className="btn-tactile p-3 rounded-xl bg-sky-950/40 hover:bg-sky-950/70 disabled:opacity-30 border border-sky-500/30 text-left transition flex flex-col justify-between"
                      >
                        <div className="text-lg">⚓</div>
                        <div>
                          <div className="text-xs font-bold text-sky-200">Steal (Capt)</div>
                          <div className="text-[10px] text-sky-400">Take 2 from foe</div>
                        </div>
                      </button>

                      {/* Assassinate (Assassin) */}
                      <button
                        onClick={() => setTargetSelectAction('ASSASSINATE')}
                        disabled={myState.coins < 3 || myState.coins >= 10}
                        className="btn-tactile p-3 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 disabled:opacity-30 border border-rose-500/30 text-left transition flex flex-col justify-between"
                      >
                        <div className="text-lg">🗡️</div>
                        <div>
                          <div className="text-xs font-bold text-rose-200">Assassinate</div>
                          <div className="text-[10px] text-rose-400">-3 Coins (Kill 1)</div>
                        </div>
                      </button>

                      {/* Exchange (Ambassador) */}
                      <button
                        onClick={() => handleDeclareAction('EXCHANGE')}
                        disabled={myState.coins >= 10}
                        className="btn-tactile p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/70 disabled:opacity-30 border border-emerald-500/30 text-left transition flex flex-col justify-between"
                      >
                        <div className="text-lg">📜</div>
                        <div>
                          <div className="text-xs font-bold text-emerald-200">Exchange</div>
                          <div className="text-[10px] text-emerald-400">Swap 2 cards</div>
                        </div>
                      </button>

                      {/* Coup */}
                      <button
                        onClick={() => setTargetSelectAction('COUP')}
                        disabled={myState.coins < 7}
                        className={`btn-tactile p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          myState.coins >= 10
                            ? 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-zinc-950 font-black animate-pulse shadow-lg'
                            : 'bg-amber-950/40 hover:bg-amber-950/70 disabled:opacity-30 border-amber-500/40 text-amber-200'
                        }`}
                      >
                        <div className="text-lg">💥</div>
                        <div>
                          <div className="text-xs font-bold">Coup</div>
                          <div className="text-[10px] opacity-80">-7 Coins (Kill 1)</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Game Over Leaderboard / Crown Presentation */}
      {state.phase === 'game_over' && (
        <div className="bg-[#111215] border border-[#222429] rounded-3xl p-8 space-y-6 text-center max-w-xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-4xl">
            👑
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">
              Coup Champion Victorious!
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              All rivals have lost their court influence. The supreme ruler has taken
              control of the state!
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#16171c] border border-amber-500/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">
                {players.find((p) => p.id === state.winnerId)?.avatar || '👤'}
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white">
                  {players.find((p) => p.id === state.winnerId)?.name || state.winnerId}
                </div>
                <div className="text-xs text-amber-400 font-mono">
                  Royal Ruler of the Court
                </div>
              </div>
            </div>
            <span className="text-2xl">🏆</span>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            {isHost && (
              <button
                onClick={() => {
                  soundFX.playClick();
                  onAction({ type: 'RESTART_GAME', playerId: currentPlayerId });
                }}
                className="btn-tactile px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
            )}
            {onReturnToLobby && (
              <button
                onClick={onReturnToLobby}
                className="btn-tactile px-6 py-2.5 rounded-xl bg-[#18191e] border border-[#272930] hover:bg-[#222429] text-zinc-300 font-bold text-xs"
              >
                Back to Lobby
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
