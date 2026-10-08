'use client';

import React, { useState, useEffect } from 'react';
import { Player } from '@/types/game';
import {
  ForSaleAction,
  ForSaleState,
  PropertyCard,
  CheckCard,
} from './types';
import { getForSaleBotAction } from './logic';
import { soundFX } from '@/lib/sounds';
import {
  Coins,
  Home,
  CheckCircle2,
  ArrowUpRight,
  Trophy,
  History,
  RotateCcw,
  Sparkles,
  DollarSign,
  TrendingUp,
  Award,
  ChevronRight,
  Clock,
  Building,
} from 'lucide-react';

interface ForSaleBoardProps {
  state: ForSaleState;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  onAction: (action: ForSaleAction) => void;
  onReturnToLobby?: () => void;
}

export default function ForSaleBoard({
  state,
  players,
  currentPlayerId,
  isHost,
  onAction,
  onReturnToLobby,
}: ForSaleBoardProps) {
  const [bidInput, setBidInput] = useState<number>(state.currentHighBid + 1);
  const [selectedHandCardId, setSelectedHandCardId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const myState = state.players[currentPlayerId];
  const activePlayerId = state.turnOrder[state.activePlayerIndex];
  const isMyTurn = state.phase === 'phase1_auction' && activePlayerId === currentPlayerId;

  // Auto-adjust bid input when high bid changes
  useEffect(() => {
    if (state.phase === 'phase1_auction') {
      const minBid = state.currentHighBid + 1;
      setBidInput(Math.min(myState?.coins || minBid, minBid));
    }
  }, [state.currentHighBid, state.phase, myState?.coins]);

  // Audio feedback on phase transitions
  useEffect(() => {
    if (state.phase === 'phase1_auction') {
      soundFX.playStart();
    } else if (state.phase === 'phase2_selling') {
      soundFX.playTurnPing();
    } else if (state.phase === 'game_over') {
      soundFX.playVictory();
    }
  }, [state.phase]);

  // Host coordinates bot actions
  useEffect(() => {
    if (!isHost) return;

    if (state.phase === 'phase1_auction') {
      if (activePlayerId && activePlayerId.startsWith('bot_')) {
        const timer = setTimeout(() => {
          const botAction = getForSaleBotAction(state, activePlayerId);
          if (botAction) {
            onAction(botAction);
            soundFX.playClick();
          }
        }, 1000);
        return () => clearTimeout(timer);
      }
    }

    if (state.phase === 'phase2_selling') {
      const pendingBots = state.turnOrder
        .filter((id) => id.startsWith('bot_'))
        .filter((id) => !state.players[id]?.isLockedIn);

      if (pendingBots.length > 0) {
        const nextBotId = pendingBots[0];
        const timer = setTimeout(() => {
          const botAction = getForSaleBotAction(state, nextBotId);
          if (botAction) {
            onAction(botAction);
          }
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [isHost, state, activePlayerId, onAction]);

  const handleBid = () => {
    if (!isMyTurn || !myState) return;
    if (bidInput <= state.currentHighBid || bidInput > myState.coins) return;
    soundFX.playClick();
    onAction({
      type: 'BID',
      playerId: currentPlayerId,
      amount: bidInput,
    });
  };

  const handlePass = () => {
    if (!isMyTurn) return;
    soundFX.playClick();
    onAction({
      type: 'PASS',
      playerId: currentPlayerId,
    });
  };

  const handleLockInCard = () => {
    if (!selectedHandCardId || state.phase !== 'phase2_selling') return;
    soundFX.playTurnPing();
    onAction({
      type: 'SELECT_PROPERTY',
      playerId: currentPlayerId,
      propertyId: selectedHandCardId,
    });
  };

  const handleNextRound = () => {
    soundFX.playClick();
    onAction({
      type: 'CONTINUE_NEXT_ROUND',
      playerId: currentPlayerId,
    });
  };

  // Category styling helper
  const getCategoryBadge = (category: PropertyCard['category']) => {
    switch (category) {
      case 'humble':
        return 'border-zinc-700 bg-zinc-800/80 text-zinc-300';
      case 'suburban':
        return 'border-sky-700/60 bg-sky-950/60 text-sky-300';
      case 'luxury':
        return 'border-purple-700/60 bg-purple-950/60 text-purple-300';
      case 'fantasy':
        return 'border-amber-600/60 bg-amber-950/60 text-amber-300';
    }
  };

  const getCategoryBorder = (category: PropertyCard['category']) => {
    switch (category) {
      case 'humble':
        return 'border-zinc-700';
      case 'suburban':
        return 'border-sky-500/50';
      case 'luxury':
        return 'border-purple-500/50';
      case 'fantasy':
        return 'border-amber-500/70 shadow-amber-500/20 shadow-md';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 select-none font-sans pb-12">
      {/* Top Banner / Match Info */}
      <div className="bg-[#111215] border border-[#222429] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl">
            🏷️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide">
                Bid แล้วรวย (For Sale)
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-semibold">
                {state.phase === 'phase1_auction'
                  ? `Phase 1: Real Estate Auction`
                  : state.phase === 'phase2_selling' || state.phase === 'phase2_reveal'
                  ? `Phase 2: Check Cashing`
                  : `Game Over`}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Round {state.round} of {state.totalRounds} • Stefan Dorra Classic
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#18191e] border border-[#272930] text-zinc-300 hover:text-white hover:bg-[#222429] transition"
          >
            <History className="w-3.5 h-3.5" />
            <span>Log ({state.logs.length})</span>
          </button>
          {onReturnToLobby && (
            <button
              onClick={onReturnToLobby}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#18191e] border border-[#272930] text-zinc-400 hover:text-white hover:bg-[#222429] transition"
            >
              Exit to Lobby
            </button>
          )}
        </div>
      </div>

      {/* History Log Drawer */}
      {showHistory && (
        <div className="bg-[#111215] border border-[#222429] rounded-2xl p-4 max-h-48 overflow-y-auto space-y-2">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Game Action Log
          </h3>
          <div className="space-y-1 text-xs">
            {state.logs.slice(-10).reverse().map((log, i) => (
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Center Stage: The Table & Market (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Phase 1: Property Auction Stage */}
            {state.phase === 'phase1_auction' && (
              <div className="bg-[#111215] border border-[#222429] rounded-3xl p-6 space-y-6 shadow-md relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222429] pb-4">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                      Auction Block
                    </span>
                    <h2 className="text-base font-bold text-white">
                      Properties for Sale this Round
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                        High Bid
                      </div>
                      <div className="text-lg font-mono font-black text-amber-400">
                        {state.currentHighBid}{' '}
                        <span className="text-xs font-normal text-zinc-400">
                          coins ($ {state.currentHighBid * 1000})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table Properties Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {state.tableProperties.map((prop, idx) => (
                    <div
                      key={prop.id}
                      className={`relative bg-[#16171c] border-2 ${getCategoryBorder(
                        prop.category
                      )} rounded-2xl p-3 flex flex-col justify-between items-center text-center transition-transform hover:-translate-y-1 shadow-sm`}
                    >
                      {/* Priority Tag: Lowest gets taken next on pass */}
                      {idx === 0 && (
                        <div className="absolute -top-2.5 bg-emerald-500 text-zinc-950 font-black text-[9px] uppercase px-2 py-0.5 rounded-full shadow-sm tracking-wider">
                          Next on Pass
                        </div>
                      )}
                      {idx === state.tableProperties.length - 1 && (
                        <div className="absolute -top-2.5 bg-amber-400 text-zinc-950 font-black text-[9px] uppercase px-2 py-0.5 rounded-full shadow-sm tracking-wider">
                          Top Prize
                        </div>
                      )}

                      <div className="w-full flex items-center justify-between">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${getCategoryBadge(
                            prop.category
                          )}`}
                        >
                          #{prop.rank}
                        </span>
                        <span className="text-[10px] text-zinc-400 capitalize">
                          {prop.category}
                        </span>
                      </div>

                      <div className="text-4xl my-3 filter drop-shadow">
                        {prop.icon}
                      </div>

                      <div className="w-full space-y-0.5">
                        <div className="text-xs font-bold text-white truncate">
                          {prop.nameTh}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {prop.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Turn Status Alert */}
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                    isMyTurn
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                      : 'bg-[#18191e] border-[#272930] text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isMyTurn
                          ? 'bg-emerald-400 animate-ping'
                          : 'bg-zinc-600'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-white">
                        {isMyTurn
                          ? 'Your Turn to Bid or Pass!'
                          : `Waiting for ${
                              players.find((p) => p.id === activePlayerId)?.name ||
                              activePlayerId
                            }...`}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {isMyTurn
                          ? `Minimum raise: ${
                              state.currentHighBid + 1
                            } coins. Or pass to take #${
                              state.tableProperties[0]?.rank
                            } ${state.tableProperties[0]?.nameTh}`
                          : 'Turn passes clockwise among active bidders.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Phase 2: Selling for Checks Stage */}
            {(state.phase === 'phase2_selling' || state.phase === 'phase2_reveal') && (
              <div className="bg-[#111215] border border-[#222429] rounded-3xl p-6 space-y-6 shadow-md relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222429] pb-4">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                      Open Market Checks
                    </span>
                    <h2 className="text-base font-bold text-white">
                      Checks to be Distributed this Round
                    </h2>
                  </div>
                  <div className="text-xs text-zinc-400">
                    Highest property takes highest check!
                  </div>
                </div>

                {/* Table Checks Display */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {state.tableChecks.map((chk, idx) => (
                    <div
                      key={chk.id || idx}
                      className={`relative bg-gradient-to-br ${
                        chk.value >= 10
                          ? 'from-emerald-900/60 to-emerald-950/80 border-emerald-500/60 text-emerald-300'
                          : chk.value === 0
                          ? 'from-zinc-900 to-zinc-950 border-red-500/40 text-red-300'
                          : 'from-teal-950/40 to-zinc-900 border-teal-500/40 text-teal-300'
                      } border-2 rounded-2xl p-4 flex flex-col justify-between items-center text-center shadow-sm`}
                    >
                      <div className="w-full flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <span>CHECK</span>
                        <span>#{idx + 1}</span>
                      </div>
                      <div className="text-2xl font-black font-mono my-2">
                        ${chk.value},000
                      </div>
                      <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                        {chk.value === 0 ? 'Void Check (0)' : 'Cashier Draft'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Phase 2 Showdown Reveal Modal / Section */}
                {state.phase === 'phase2_reveal' && state.lastRoundResults && (
                  <div className="bg-[#18191e] border border-emerald-500/50 rounded-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-sm font-bold text-white">
                          Showdown Reveal! (การเปิดเผยการขาย)
                        </h3>
                      </div>
                      <button
                        onClick={handleNextRound}
                        className="btn-tactile px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <span>Next Round</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {state.lastRoundResults.map((res) => {
                        const pName =
                          players.find((p) => p.id === res.playerId)?.name ||
                          res.playerId;
                        return (
                          <div
                            key={res.playerId}
                            className="bg-[#111215] border border-[#272930] rounded-xl p-3 flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="text-xs font-bold text-white">
                                {pName}
                              </div>
                              <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                <span>{res.property.icon}</span>
                                <span>
                                  #{res.property.rank} {res.property.nameTh}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                                +${res.check.value},000
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Player Roster & Status (1 Col) */}
          <div className="space-y-6">
            <div className="bg-[#111215] border border-[#222429] rounded-3xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Table Roster</span>
                <span>{state.turnOrder.length} Players</span>
              </h3>

              <div className="space-y-2.5">
                {state.turnOrder.map((id) => {
                  const pData = state.players[id];
                  const pProfile = players.find((p) => p.id === id);
                  const isActive =
                    state.phase === 'phase1_auction' && id === activePlayerId;
                  const isHigh =
                    state.phase === 'phase1_auction' && id === state.highBidderId;

                  return (
                    <div
                      key={id}
                      className={`rounded-2xl p-3 border transition-all ${
                        isActive
                          ? 'bg-[#1a1c22] border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : 'bg-[#141518] border-[#222429]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="text-xl">{pProfile?.avatar || '👤'}</div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{pProfile?.name || id}</span>
                              {id === currentPlayerId && (
                                <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded font-mono">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-0.5 text-amber-400">
                                <Coins className="w-3 h-3" />
                                {pData?.coins} coins
                              </span>
                              <span>•</span>
                              <span>{pData?.properties.length} props</span>
                              {pData?.checks.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-400">
                                    ${pData.checks.reduce((a, c) => a + c.value, 0)},000
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div>
                          {state.phase === 'phase1_auction' && (
                            <>
                              {pData?.hasPassed ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                  PASSED
                                </span>
                              ) : isHigh ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 font-bold">
                                  BID {pData?.currentBid}
                                </span>
                              ) : pData?.currentBid > 0 ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                  Bid {pData?.currentBid}
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-zinc-500">
                                  Pending
                                </span>
                              )}
                            </>
                          )}

                          {state.phase === 'phase2_selling' && (
                            <>
                              {pData?.isLockedIn ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  LOCKED
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Thinking...
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Player Console (Bottom Area) */}
      {state.phase !== 'game_over' && myState && (
        <div className="bg-[#111215] border border-[#222429] rounded-3xl p-6 space-y-6 shadow-lg">
          {/* My Stats & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222429] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  Your Wallet & Real Estate Hand
                </h2>
                <div className="text-xs text-zinc-400 flex items-center gap-3 mt-0.5">
                  <span className="text-amber-400 font-mono font-bold">
                    {myState.coins} Cash Coins ($ {myState.coins * 1000})
                  </span>
                  <span>•</span>
                  <span>{myState.properties.length} Properties in Portfolio</span>
                </div>
              </div>
            </div>

            {/* Phase 1 Bidding Controls */}
            {state.phase === 'phase1_auction' && isMyTurn && (
              <div className="flex flex-wrap items-center gap-3">
                {/* Stepper buttons */}
                <div className="flex items-center bg-[#18191e] border border-[#272930] rounded-xl p-1 gap-1">
                  {[1, 2, 5].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => {
                        const target = Math.min(
                          myState.coins,
                          state.currentHighBid + inc
                        );
                        setBidInput(target);
                        soundFX.playClick();
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#141518] hover:bg-[#222429] text-zinc-300 hover:text-white transition"
                    >
                      +{inc}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setBidInput(myState.coins);
                      soundFX.playClick();
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#141518] hover:bg-amber-950/60 text-amber-400 transition"
                  >
                    MAX
                  </button>
                </div>

                {/* Bid Number Input */}
                <input
                  type="number"
                  min={state.currentHighBid + 1}
                  max={myState.coins}
                  value={bidInput}
                  onChange={(e) => setBidInput(parseInt(e.target.value) || 0)}
                  className="w-16 bg-[#18191e] border border-[#272930] rounded-xl px-2.5 py-1.5 text-center text-sm font-mono font-bold text-white focus:outline-hidden focus:border-emerald-500"
                />

                {/* Raise Button */}
                <button
                  onClick={handleBid}
                  disabled={
                    bidInput <= state.currentHighBid || bidInput > myState.coins
                  }
                  className="btn-tactile px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Raise to {bidInput}</span>
                </button>

                {/* Pass Button with Preview */}
                <button
                  onClick={handlePass}
                  className="btn-tactile px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center gap-1.5 border border-zinc-700"
                >
                  <span>Pass (Refund {Math.floor(myState.currentBid / 2)})</span>
                </button>
              </div>
            )}

            {/* Phase 2 Lock-In Button */}
            {state.phase === 'phase2_selling' && (
              <div className="flex items-center gap-3">
                {myState.isLockedIn ? (
                  <div className="px-4 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Card Locked In! Waiting for others...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleLockInCard}
                    disabled={!selectedHandCardId}
                    className="btn-tactile px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lock In Selected Property</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Player's Property Cards Carousel / Hand */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                {state.phase === 'phase2_selling'
                  ? 'Choose a Property Card to Sell for Cash Checks'
                  : 'Acquired Properties'}
              </span>
              <span className="text-xs text-zinc-500">
                {myState.properties.length} cards held
              </span>
            </div>

            {myState.properties.length === 0 ? (
              <div className="p-8 border border-dashed border-[#222429] rounded-2xl text-center text-xs text-zinc-500">
                No properties acquired yet. Bid or pass in Phase 1 to collect real estate!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {myState.properties.map((prop) => {
                  const isSelected = selectedHandCardId === prop.id;
                  const canSelect = state.phase === 'phase2_selling' && !myState.isLockedIn;

                  return (
                    <div
                      key={prop.id}
                      onClick={() => {
                        if (canSelect) {
                          setSelectedHandCardId(prop.id);
                          soundFX.playClick();
                        }
                      }}
                      className={`relative bg-[#16171c] border-2 rounded-2xl p-3 flex flex-col justify-between items-center text-center transition-all ${
                        canSelect ? 'cursor-pointer hover:-translate-y-1' : ''
                      } ${
                        isSelected
                          ? 'border-emerald-400 ring-2 ring-emerald-400/30 bg-[#1e2028]'
                          : getCategoryBorder(prop.category)
                      }`}
                    >
                      <div className="w-full flex items-center justify-between">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${getCategoryBadge(
                            prop.category
                          )}`}
                        >
                          #{prop.rank}
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </div>

                      <div className="text-3xl my-2">{prop.icon}</div>

                      <div className="w-full">
                        <div className="text-xs font-bold text-white truncate">
                          {prop.nameTh}
                        </div>
                        <div className="text-[9px] text-zinc-400 truncate">
                          {prop.name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Over Leaderboard & Portfolio Tally */}
      {state.phase === 'game_over' && (
        <div className="bg-[#111215] border border-[#222429] rounded-3xl p-6 sm:p-8 space-y-8 shadow-xl max-w-3xl mx-auto text-center">
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-3xl">
              🏆
            </div>
            <h2 className="text-2xl font-black text-white">
              Real Estate Mogul Crowned!
            </h2>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              All properties and checks have been settled. The highest combined wealth
              in cash checks and liquid coins wins!
            </p>
          </div>

          {/* Leaderboard Table */}
          <div className="space-y-3 text-left">
            {state.turnOrder
              .map((id) => {
                const p = state.players[id];
                const prof = players.find((pl) => pl.id === id);
                const checkTotal = p.checks.reduce((acc, c) => acc + c.value, 0);
                const totalWealth = checkTotal + p.coins;
                return {
                  id,
                  name: prof?.name || id,
                  avatar: prof?.avatar || '👤',
                  coins: p.coins,
                  checkTotal,
                  totalWealth,
                  checks: p.checks,
                };
              })
              .sort((a, b) => b.totalWealth - a.totalWealth || b.coins - a.coins)
              .map((entry, index) => {
                const isWinner = entry.id === state.winnerId;
                return (
                  <div
                    key={entry.id}
                    className={`rounded-2xl p-4 border flex items-center justify-between gap-4 transition ${
                      isWinner
                        ? 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/20'
                        : 'bg-[#16171c] border-[#222429]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#111215] flex items-center justify-center font-mono font-bold text-sm text-zinc-400">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>
                      <div className="text-2xl">{entry.avatar}</div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{entry.name}</span>
                          {entry.id === currentPlayerId && (
                            <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded font-mono">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Checks: ${entry.checkTotal},000 • Cash: ${entry.coins},000
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-zinc-400 uppercase tracking-wider font-mono">
                        Total Wealth
                      </div>
                      <div className="text-lg font-black font-mono text-emerald-400">
                        ${entry.totalWealth},000
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            {isHost && (
              <button
                onClick={() => {
                  soundFX.playClick();
                  onAction({
                    type: 'RESTART_GAME',
                    playerId: currentPlayerId,
                  });
                }}
                className="btn-tactile px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
            )}
            {onReturnToLobby && (
              <button
                onClick={onReturnToLobby}
                className="btn-tactile px-6 py-2.5 rounded-xl bg-[#18191e] border border-[#272930] hover:bg-[#222429] text-zinc-200 font-bold text-xs"
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
