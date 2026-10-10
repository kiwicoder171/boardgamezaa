'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Player } from '@/types/game';
import {
  Card,
  CreatureType,
  CREATURE_METAS,
  CARD_BACK_IMAGE,
  KakerlakenPokerAction,
  KakerlakenPokerClientState,
} from './types';
import { soundFX } from '@/lib/sounds';
import confetti from 'canvas-confetti';
import {
  AlertTriangle,
  Check,
  Crown,
  Eye,
  HelpCircle,
  Play,
  RotateCw,
  Send,
  Skull,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

interface KakerlakenPokerBoardProps {
  state: KakerlakenPokerClientState;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  onAction: (action: KakerlakenPokerAction) => void;
  onReturnToLobby: () => void;
}

const ALL_CREATURE_TYPES: CreatureType[] = [
  'cockroach',
  'bat',
  'fly',
  'toad',
  'rat',
  'scorpion',
  'stink_bug',
  'spider',
];

export default function KakerlakenPokerBoard({
  state,
  players,
  currentPlayerId,
  isHost,
  onAction,
  onReturnToLobby,
}: KakerlakenPokerBoardProps) {
  // Offering State
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  const [offerTargetId, setOfferTargetId] = useState<string>('');
  const [offerClaimedCreature, setOfferClaimedCreature] = useState<CreatureType>('cockroach');

  // Peek & Pass State
  const [isPeekingModalOpen, setIsPeekingModalOpen] = useState(false);
  const [passTargetId, setPassTargetId] = useState<string>('');
  const [passClaimedCreature, setPassClaimedCreature] = useState<CreatureType>('cockroach');

  // Modals & Controls
  const [showManual, setShowManual] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const isMyTurnToOffer =
    state.phase === 'offering' && state.currentTurnPlayerId === currentPlayerId;
  const isMyTurnToDecide =
    state.phase === 'deciding' && state.activeCard?.currentReceiverId === currentPlayerId;

  // Set default target when offering/passing
  const otherPlayers = players.filter((p) => p.id !== currentPlayerId);
  useEffect(() => {
    if (!offerTargetId && otherPlayers.length > 0) {
      setOfferTargetId(otherPlayers[0].id);
    }
  }, [otherPlayers, offerTargetId]);

  // Turn ping sound
  useEffect(() => {
    if ((isMyTurnToOffer || isMyTurnToDecide) && soundEnabled) {
      soundFX.playTurnPing();
    }
  }, [isMyTurnToOffer, isMyTurnToDecide, soundEnabled]);

  // Victory Confetti when Game Over and I am NOT the loser
  useEffect(() => {
    if (state.phase === 'game_over' && state.loserPlayerId !== currentPlayerId) {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
      });
    }
  }, [state.phase, state.loserPlayerId, currentPlayerId]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFX.setEnabled(next);
  };

  // Helper to handle offering a card
  const handleOfferSubmit = () => {
    if (!selectedHandCardId || !offerTargetId) return;
    soundFX.playTileClack();
    onAction({
      type: 'OFFER_CARD',
      cardId: selectedHandCardId,
      targetPlayerId: offerTargetId,
      declaredCreature: offerClaimedCreature,
    });
    setSelectedHandCardId(null);
  };

  // Helper to handle Guessing True or False
  const handleGuess = (guess: 'true' | 'false') => {
    soundFX.playClick();
    onAction({
      type: 'GUESS',
      guess,
    });
  };

  // Helper to handle Peek and Pass
  const handlePassSubmit = () => {
    if (!passTargetId) return;
    soundFX.playTileClack();
    onAction({
      type: 'PEEK_AND_PASS',
      targetPlayerId: passTargetId,
      declaredCreature: passClaimedCreature,
    });
    setIsPeekingModalOpen(false);
  };

  // Auto-set default pass target when opening peek modal
  const availablePassTargets = players.filter(
    (p) => p.id !== currentPlayerId && !state.activeCard?.seenByPlayerIds.includes(p.id)
  );

  const openPeekModal = () => {
    soundFX.playTileClack();
    if (availablePassTargets.length > 0) {
      setPassTargetId(availablePassTargets[0].id);
    }
    if (state.activeCard) {
      setPassClaimedCreature(state.activeCard.declaredCreature);
    }
    setIsPeekingModalOpen(true);
  };

  const senderPlayer = players.find((p) => p.id === state.activeCard?.currentSenderId);
  const receiverPlayer = players.find((p) => p.id === state.activeCard?.currentReceiverId);
  const currentTurnPlayer = players.find((p) => p.id === state.currentTurnPlayerId);
  const loserPlayer = players.find((p) => p.id === state.loserPlayerId);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 select-none pb-12 font-sans">
      {/* 1. TOP HEADER & ROOM CONTROLS */}
      <div className="bg-[#1b1510]/95 border-2 border-[#804f29]/70 rounded-3xl p-3 sm:p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-amber-100">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl sm:text-3xl p-2 bg-amber-950/60 rounded-2xl border border-amber-800/50 shadow-inner">
            🪳
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300 uppercase">
                Round #{state.roundNumber}
              </span>
              <h2 className="text-base sm:text-lg font-black font-serif text-amber-100 tracking-wide drop-shadow">
                Kakerlaken Poker
              </h2>
            </div>
            <p className="text-xs text-amber-300/70 font-sans">
              The Reverse-Bluffing Classic • Avoid collecting 4 of any critter!
            </p>
          </div>
        </div>

        {/* Current Turn Status Pill */}
        <div className="px-3.5 py-1.5 rounded-2xl bg-black/50 border border-amber-900/60 text-xs sm:text-sm font-semibold shadow-inner">
          {state.phase === 'game_over' ? (
            <span className="text-rose-400 font-bold flex items-center gap-1.5">
              <Skull className="w-4 h-4" />
              <span>GAME OVER: {loserPlayer?.name || 'A player'} LOST!</span>
            </span>
          ) : isMyTurnToOffer ? (
            <span className="text-amber-300 font-black animate-pulse flex items-center gap-1.5">
              <span>👉</span>
              <span>YOUR TURN: Pick a card from your hand to slide to a rival!</span>
            </span>
          ) : isMyTurnToDecide ? (
            <span className="text-cyan-300 font-black animate-pulse flex items-center gap-1.5">
              <span>⚡</span>
              <span>CARD OFFERED TO YOU! Call True, False, or Peek & Pass!</span>
            </span>
          ) : state.phase === 'deciding' ? (
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="text-base">{receiverPlayer?.avatar}</span>
              <span>
                <strong className="text-amber-300">{receiverPlayer?.name}</strong> is deciding on {senderPlayer?.name}&apos;s claim...
              </span>
            </span>
          ) : (
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="text-base">{currentTurnPlayer?.avatar}</span>
              <span>
                <strong className="text-amber-300">{currentTurnPlayer?.name}</strong> is choosing a card to offer...
              </span>
            </span>
          )}
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManual(true)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 text-amber-200 border border-amber-800/60 transition shadow-md flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Kakerlaken Poker Official Rules"
          >
            <span>📖</span>
            <span className="hidden sm:inline">Rules</span>
          </button>
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 text-amber-200 border border-amber-800/60 transition shadow-md cursor-pointer"
            title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
          <button
            onClick={onReturnToLobby}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-100 border border-amber-800/60 transition shadow-md cursor-pointer"
          >
            {isHost ? 'End Game' : 'Lobby'}
          </button>
        </div>
      </div>

      {/* 2. THE TAVERN POKER TABLE (TABLETOP FELT) */}
      <div className="tabletop-arena rounded-[32px] sm:rounded-[40px] p-4 sm:p-6 space-y-6 bg-gradient-to-b from-[#22130a] via-[#1a0f07] to-[#120803] border-4 border-[#7a4823]/80 shadow-2xl relative">
        {/* Table Felt Background Texture & Wood Border */}
        <div className="absolute inset-2 rounded-[28px] sm:rounded-[36px] bg-[#162719]/40 border border-emerald-950/40 pointer-events-none -z-0" />

        {/* 2.1 ACROSS THE TABLE: OPPONENTS SEATED & THEIR CRITTER DISPLAYS */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300/80 px-1 uppercase tracking-wider">
            <span>Rivals Seated Across The Table (สวนสัตว์หน้าตักของคู่แข่ง)</span>
            <span className="text-[10px] text-amber-400/60 font-mono">
              ⚠️ Warning: 4 of any creature = Immediate Elimination!
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {otherPlayers.map((opponent) => {
              const tableau = state.tableaus[opponent.id] || [];
              const handCount = state.handCounts[opponent.id] ?? 0;
              const isOfferingTurn =
                state.phase === 'offering' && state.currentTurnPlayerId === opponent.id;
              const isDecidingTarget =
                state.phase === 'deciding' && state.activeCard?.currentReceiverId === opponent.id;
              const isCardSender =
                state.phase === 'deciding' && state.activeCard?.currentSenderId === opponent.id;

              // Count creatures in opponent's tableau
              const counts: Partial<Record<CreatureType, number>> = {};
              tableau.forEach((c) => {
                counts[c.creature] = (counts[c.creature] || 0) + 1;
              });

              // Check if in danger (has 3 of any creature)
              const hasDanger3 = Object.values(counts).some((cnt) => cnt >= 3);

              return (
                <div
                  key={opponent.id}
                  className={`rounded-2xl p-3.5 transition-all space-y-2.5 border ${
                    isDecidingTarget
                      ? 'bg-cyan-950/50 border-cyan-400 ring-2 ring-cyan-400/50 scale-[1.01]'
                      : isOfferingTurn
                      ? 'bg-amber-950/50 border-amber-400 ring-2 ring-amber-400/50 scale-[1.01]'
                      : hasDanger3
                      ? 'bg-rose-950/40 border-rose-600/70 shadow-rose-950/50'
                      : 'bg-black/50 border-[#4a2e18]/80'
                  }`}
                >
                  {/* Opponent Header Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{opponent.avatar}</span>
                      <div>
                        <div className="font-serif font-bold text-xs sm:text-sm text-amber-100 flex items-center gap-1.5">
                          <span>{opponent.name}</span>
                          {opponent.isHost && (
                            <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[8px] font-mono font-bold">
                              HOST
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-amber-300/70 font-mono">
                          🎴 {handCount} {handCount === 1 ? 'card' : 'cards'} in hand
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isDecidingTarget ? (
                        <span className="text-[9px] uppercase font-mono font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse">
                          Target
                        </span>
                      ) : isCardSender ? (
                        <span className="text-[9px] uppercase font-mono font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                          Sender
                        </span>
                      ) : hasDanger3 ? (
                        <span className="text-[9px] uppercase font-mono font-black px-2 py-0.5 rounded-full bg-rose-600 text-white border border-rose-400 animate-pulse">
                          ⚠️ 3/4 Danger!
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Tableau Critter Icons & Counts (สวนสัตว์หน้าตัก) */}
                  <div className="bg-[#120b06]/80 rounded-xl p-2 border border-[#3b2312] min-h-[64px]">
                    <div className="text-[9px] font-mono uppercase text-amber-400/70 mb-1 flex justify-between">
                      <span>Face-up Collection ({tableau.length})</span>
                      <span>Goal: &lt; 4</span>
                    </div>

                    {tableau.length === 0 ? (
                      <div className="text-[10px] text-slate-500 italic py-1 text-center">
                        Clean display (No pests yet)
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5">
                        {ALL_CREATURE_TYPES.filter((type) => (counts[type] || 0) > 0).map((type) => {
                          const meta = CREATURE_METAS[type];
                          const count = counts[type] || 0;
                          const isCritical = count >= 3;

                          return (
                            <div
                              key={type}
                              className={`flex items-center gap-1 px-1.5 py-1 rounded-lg border text-[10px] font-mono transition ${
                                isCritical
                                  ? 'bg-rose-950/80 border-rose-500 text-rose-200 animate-pulse font-black'
                                  : 'bg-black/60 border-amber-900/50 text-amber-200 font-bold'
                              }`}
                              title={`${meta.nameEn} (${meta.nameTh}): ${count}/4 cards`}
                            >
                              <div className="relative w-4 h-5 rounded overflow-hidden shrink-0">
                                <Image
                                  src={meta.image}
                                  alt={meta.nameEn}
                                  fill
                                  sizes="16px"
                                  className="object-cover"
                                />
                              </div>
                              <span className="font-bold">{count}/4</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2.2 CENTER OF THE TABLE: ACTIVE CARD IN TRANSIT & SHOWDOWN BENCH */}
        <div className="relative z-10 bg-gradient-to-b from-[#1c1008] to-[#120a05] border-2 border-[#7a4823] rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#3d2412] pb-2 text-xs font-mono font-bold text-amber-300">
            <span className="uppercase tracking-wider flex items-center gap-1.5">
              <span>🃏</span> Center Showdown Arena (เวทีท้าทายกลางโต๊ะ)
            </span>
            <span className="text-[11px] text-amber-400/60 font-sans">
              Deck remaining: 64 cards in circulation
            </span>
          </div>

          {/* ACTIVE OFFER DISPLAY */}
          {state.phase === 'deciding' && state.activeCard ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-5 bg-black/40 border border-amber-900/60 rounded-2xl p-4 sm:p-5">
              {/* Card In Transit Graphic */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="relative w-24 h-32 sm:w-28 sm:h-38 rounded-xl overflow-hidden shadow-2xl border-2 border-amber-600/70 -rotate-2 hover:rotate-0 transition-transform">
                  <Image
                    src={CARD_BACK_IMAGE}
                    alt="Card Face Down"
                    fill
                    sizes="(max-width: 640px) 96px, 112px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-1.5">
                    <span className="text-[9px] font-mono uppercase font-black tracking-wider text-amber-300 bg-black/70 px-2 py-0.5 rounded-full border border-amber-500/50">
                      Face Down
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-amber-400/80 uppercase">
                    In Transit: {senderPlayer?.name} ➔ {receiverPlayer?.name}
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>Claimed to be:</span>
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-serif font-black flex items-center gap-1.5 shadow">
                      <span>{CREATURE_METAS[state.activeCard.declaredCreature].emoji}</span>
                      <span>{CREATURE_METAS[state.activeCard.declaredCreature].nameEn}</span>
                      <span className="text-xs text-amber-200">
                        ({CREATURE_METAS[state.activeCard.declaredCreature].nameTh})
                      </span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {senderPlayer?.name} slid this card and claims it is a{' '}
                    <strong>{CREATURE_METAS[state.activeCard.declaredCreature].nameEn}</strong>. Is it the truth, or a cunning bluff?
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS: If I am the Receiver */}
              {isMyTurnToDecide ? (
                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                  <button
                    onClick={() => handleGuess('true')}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/60 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>จริง (TRUE)</span>
                  </button>

                  <button
                    onClick={() => handleGuess('false')}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-rose-950/60 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>โกหก (FALSE)</span>
                  </button>

                  {/* Peek & Pass Button: only allowed if there are players left who haven't seen it */}
                  {availablePassTargets.length > 0 && (
                    <button
                      onClick={openPeekModal}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-950/60 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>แอบดูแล้วส่งต่อ (Peek & Pass)</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center md:text-right text-xs text-amber-300/80 font-mono italic">
                  ⏳ Waiting for {receiverPlayer?.name} to decide...
                </div>
              )}
            </div>
          ) : state.phase === 'resolution' && state.lastResolution ? (
            /* ROUND RESOLUTION REVEAL BANNER */
            <div className="bg-black/60 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
              <div className="flex items-center gap-4">
                {/* Revealed Actual Card */}
                <div className="relative w-20 h-28 sm:w-24 sm:h-34 rounded-xl overflow-hidden shadow-2xl border-2 border-amber-400 rotate-1">
                  <Image
                    src={CREATURE_METAS[state.lastResolution.card.creature].image}
                    alt="Revealed Creature"
                    fill
                    sizes="(max-width: 640px) 80px, 96px"
                    className="object-cover"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      REVEALED TRUTH
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      Actually:{' '}
                      <strong className="text-white">
                        {CREATURE_METAS[state.lastResolution.card.creature].nameEn}
                      </strong>{' '}
                      (Claimed: {CREATURE_METAS[state.lastResolution.declaredCreature].nameEn})
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-amber-200">
                    {state.lastResolution.reasonText}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Next starting player will be{' '}
                    <strong>
                      {players.find((p) => p.id === state.currentTurnPlayerId)?.name}
                    </strong>
                    .
                  </p>
                </div>
              </div>

              {/* Continue Button */}
              <button
                onClick={() => {
                  soundFX.playClick();
                  onAction({ type: 'ACKNOWLEDGE_RESOLUTION' });
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-950/60 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <span>Continue (เล่นรอบถัดไป)</span>
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          ) : (
            /* WAITING OR OFFERING BANNER */
            <div className="text-center py-4 space-y-1 text-slate-400">
              <div className="text-2xl">🎴</div>
              <div className="text-sm font-bold text-amber-200">
                {isMyTurnToOffer
                  ? 'It is your turn! Select a card from your hand below to slide to an opponent.'
                  : `Waiting for ${currentTurnPlayer?.name || 'opponent'} to choose a card to slide...`}
              </div>
              <p className="text-xs text-slate-500">
                You can tell the truth or bluff any of the 8 critters.
              </p>
            </div>
          )}
        </div>

        {/* 2.3 YOUR PERSONAL DEFUSAL / PLAY AREA */}
        <div className="relative z-10 space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎴</span>
              <div>
                <h3 className="text-sm sm:text-base font-serif font-black text-amber-100 drop-shadow">
                  Your Hand & Tableau (การ์ดบนมือ & สวนสัตว์ของคุณ)
                </h3>
                <p className="text-[11px] text-amber-300/70 font-sans">
                  {isMyTurnToOffer
                    ? 'Click any card in your hand to prepare your claim and slide it!'
                    : 'Secret hand cards (Visible only to you).'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-800/60 shadow-inner">
                {state.myHand.length} Cards in Hand
              </span>
            </div>
          </div>

          {/* YOUR PERSONAL TABLEAU DISPLAY (สวนสัตว์ที่หงายอยู่หน้าตักของเรา) */}
          {(() => {
            const myTableau = state.tableaus[currentPlayerId] || [];
            const myCounts: Partial<Record<CreatureType, number>> = {};
            myTableau.forEach((c) => {
              myCounts[c.creature] = (myCounts[c.creature] || 0) + 1;
            });
            const hasDanger3 = Object.values(myCounts).some((cnt) => cnt >= 3);

            return (
              <div
                className={`rounded-2xl p-3 border transition-all ${
                  hasDanger3
                    ? 'bg-rose-950/50 border-rose-500/80 shadow-lg shadow-rose-950/50'
                    : 'bg-black/50 border-amber-950/70'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-amber-300/80 mb-1.5 uppercase font-bold">
                  <span>Your Face-up Penalty Collection ({myTableau.length} cards)</span>
                  {hasDanger3 && (
                    <span className="text-rose-400 animate-pulse font-black">
                      ⚠️ CRITICAL DANGER: 3/4 collected on a species!
                    </span>
                  )}
                </div>

                {myTableau.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-1 text-center">
                    Clean display! You haven&apos;t taken any penalties yet. Keep it up!
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                    {ALL_CREATURE_TYPES.filter((type) => (myCounts[type] || 0) > 0).map((type) => {
                      const meta = CREATURE_METAS[type];
                      const count = myCounts[type] || 0;
                      const isCritical = count >= 3;

                      return (
                        <div
                          key={type}
                          className={`flex items-center gap-2 p-1.5 rounded-xl border transition ${
                            isCritical
                              ? 'bg-rose-950/90 border-rose-500 text-rose-200 animate-pulse ring-1 ring-rose-500'
                              : 'bg-stone-900/90 border-amber-900/60 text-amber-100'
                          }`}
                        >
                          <div className="relative w-7 h-9 rounded-md overflow-hidden shrink-0 border border-black/40">
                            <Image
                              src={meta.image}
                              alt={meta.nameEn}
                              fill
                              sizes="28px"
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold truncate">{meta.nameEn}</div>
                            <div
                              className={`text-xs font-mono font-black ${
                                isCritical ? 'text-rose-400' : 'text-amber-300'
                              }`}
                            >
                              {count} / 4
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* YOUR SECRET HAND CARDS (แฟนการ์ดบนมือ) */}
          <div className="bg-[#180e07]/90 rounded-2xl p-3 sm:p-4 border-2 border-[#543219] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-amber-300/80">
              <span className="font-bold">Your Secret Hand Cards:</span>
              <span className="text-[10px] text-amber-400/60 font-sans">
                {isMyTurnToOffer ? '👉 Click a card to prepare your offer!' : 'Hover to view details'}
              </span>
            </div>

            {state.myHand.length === 0 ? (
              <div className="py-6 text-center text-xs text-rose-400 font-mono">
                No cards in hand! If it becomes your turn to offer, you will be eliminated!
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center items-end min-h-[140px] pt-3 pb-1">
                {state.myHand.map((card, idx) => {
                  const meta = CREATURE_METAS[card.creature];
                  const isSelected = selectedHandCardId === card.id;

                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        if (isMyTurnToOffer) {
                          soundFX.playTileClack();
                          setSelectedHandCardId(isSelected ? null : card.id);
                          setOfferClaimedCreature(card.creature); // Default claim to actual creature
                        }
                      }}
                      className={`relative w-16 h-24 sm:w-20 sm:h-30 rounded-xl overflow-hidden select-none transition-all shadow-xl border-2 ${
                        meta.borderColor
                      } ${
                        isSelected
                          ? '-translate-y-4 ring-4 ring-amber-300 shadow-2xl scale-110 z-20'
                          : isMyTurnToOffer
                          ? 'hover:-translate-y-2 hover:ring-2 hover:ring-amber-300/60 cursor-pointer'
                          : 'cursor-default'
                      }`}
                      title={`${meta.nameEn} (${meta.nameTh})`}
                    >
                      <Image
                        src={meta.image}
                        alt={meta.nameEn}
                        fill
                        sizes="(max-width: 640px) 64px, 80px"
                        className="object-cover"
                      />

                      {/* Bottom Name Label Banner */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-1 pt-3 text-center">
                        <div className="text-[8px] font-bold text-white truncate drop-shadow">
                          {meta.nameEn}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2.4 OFFERING DRAWER: APPEARS WHEN A HAND CARD IS SELECTED */}
        {selectedHandCardId && isMyTurnToOffer && (
          <div className="relative z-20 bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 border-2 border-amber-500 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-amber-800/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">📤</span>
                <div>
                  <h4 className="text-sm font-bold text-amber-100">
                    Prepare Your Card Offer (ส่งการ์ดท้าทายคู่แข่ง)
                  </h4>
                  <p className="text-[11px] text-amber-300/70 font-sans">
                    Choose who to slide this card to, and what creature you declare it to be (Truth or Bluff!).
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedHandCardId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-black/40 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1: Select Target Player */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-amber-300">
                  1. Target Rival (เลือกคู่แข่งที่จะส่งให้):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {otherPlayers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setOfferTargetId(p.id)}
                      className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        offerTargetId === p.id
                          ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-102'
                          : 'bg-black/40 border-amber-900/60 text-amber-200 hover:bg-black/60'
                      }`}
                    >
                      <span>{p.avatar}</span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Declared Creature (Truth or Bluff) */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-amber-300">
                  2. Declare Creature Name (ประกาศว่าเป็นตัวอะไร):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {ALL_CREATURE_TYPES.map((type) => {
                    const meta = CREATURE_METAS[type];
                    const isSelected = offerClaimedCreature === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setOfferClaimedCreature(type)}
                        className={`p-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 text-stone-950 border-amber-200 shadow-md scale-102'
                            : 'bg-black/40 border-amber-900/50 text-amber-300 hover:bg-black/60'
                        }`}
                      >
                        <span>{meta.emoji}</span>
                        <span className="truncate">{meta.nameEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleOfferSubmit}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-xs uppercase tracking-wider transition shadow-xl shadow-amber-950/60 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>SLIDE CARD FACE-DOWN! (เลื่อนการ์ดส่งตัวประหลาด) ➔</span>
              </button>
            </div>
          </div>
        )}

        {/* 2.5 ACTION HISTORY LOG */}
        <div className="relative z-10 bg-black/50 border border-amber-950/60 rounded-2xl p-3 sm:p-4 space-y-1.5 shadow-inner">
          <div className="text-[11px] font-mono font-bold text-amber-200/80 uppercase tracking-wider flex items-center gap-2">
            <span>📋</span> Match Bluffing & Showdown Log
          </div>
          <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-xs font-mono">
            {state.history.slice(-5).reverse().map((h) => (
              <div
                key={h.id}
                className={`p-1.5 rounded-lg border text-[11px] ${
                  h.type === 'game_over'
                    ? 'bg-rose-950/70 border-rose-500 text-rose-200 font-bold'
                    : h.type === 'challenge'
                    ? 'bg-amber-950/50 border-amber-500/60 text-amber-200'
                    : h.type === 'pass'
                    ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                    : 'bg-black/40 border-slate-800 text-slate-300'
                }`}
              >
                {h.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PEEK & PASS MODAL */}
      {isPeekingModalOpen && state.activeCard && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#160d07] border-2 border-amber-500/80 rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl text-amber-100">
            <div className="flex items-center justify-between border-b border-amber-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Secret Peek & Pass (แอบดูแล้วส่งต่อ)
                </h3>
              </div>
              <button
                onClick={() => setIsPeekingModalOpen(false)}
                className="p-1 rounded-xl bg-black/40 text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Secret Card Reveal Box */}
            <div className="bg-black/60 border border-amber-900/60 rounded-2xl p-4 flex items-center gap-4">
              <div className="relative w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden shadow-2xl border-2 border-amber-400 shrink-0">
                {state.activeCard.card ? (
                  <Image
                    src={CREATURE_METAS[state.activeCard.card.creature].image}
                    alt="Secret Creature"
                    fill
                    sizes="(max-width: 640px) 80px, 96px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    Card
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
                  TOP SECRET: ONLY YOU SEE THIS
                </span>
                <div className="text-sm font-bold text-white">
                  The actual card is:{' '}
                  {state.activeCard.card && (
                    <span className="text-amber-300">
                      {CREATURE_METAS[state.activeCard.card.creature].nameEn} (
                      {CREATURE_METAS[state.activeCard.card.creature].nameTh})
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Now choose another rival who hasn&apos;t seen this card yet, and decide what to declare!
                </p>
              </div>
            </div>

            {/* Step 1: Choose New Target */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-amber-300">
                1. Pass to Rival (เลือกคนที่ยังไม่เคยดูการ์ด):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availablePassTargets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPassTargetId(p.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      passTargetId === p.id
                        ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md scale-102'
                        : 'bg-black/40 border-amber-900/60 text-amber-200 hover:bg-black/60'
                    }`}
                  >
                    <span>{p.avatar}</span>
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Declare New or Same Claim */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-amber-300">
                2. Declare Claim (ประกาศชื่อสัตว์):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {ALL_CREATURE_TYPES.map((type) => {
                  const meta = CREATURE_METAS[type];
                  const isSelected = passClaimedCreature === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPassClaimedCreature(type)}
                      className={`p-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-stone-950 border-amber-200 shadow-md scale-102'
                          : 'bg-black/40 border-amber-900/50 text-amber-300 hover:bg-black/60'
                      }`}
                    >
                      <span>{meta.emoji}</span>
                      <span className="truncate">{meta.nameEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Pass Button */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPeekingModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-black/40 hover:bg-black/60 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePassSubmit}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-950/60 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Pass Card to Rival!</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {state.phase === 'game_over' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#180d06] border-2 border-rose-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 text-center shadow-2xl animate-in zoom-in-95 duration-200 text-white">
            <div className="space-y-2">
              <span className="text-5xl inline-block animate-bounce">💥</span>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-rose-400">
                GAME OVER!
              </h2>
              <div className="text-lg font-bold text-amber-200">
                {loserPlayer?.name || 'A player'} has been Eliminated!
              </div>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                {state.lossReason === 'four_of_a_kind'
                  ? 'They accumulated 4 cards of the same creature species!'
                  : state.lossReason === 'all_eight_species'
                  ? 'They collected all 8 different creature species!'
                  : 'They had no cards remaining in hand to offer on their turn!'}
              </p>
            </div>

            <div className="p-4 bg-black/60 border border-amber-900/60 rounded-2xl text-xs text-amber-200 space-y-1">
              <div className="font-bold text-sm text-emerald-400">
                🎉 All Other Operatives Win!
              </div>
              <p className="text-slate-400">
                In Kakerlaken Poker, there is only ONE loser. Everyone else survives and shares the victory!
              </p>
            </div>

            <button
              onClick={onReturnToLobby}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-sm uppercase tracking-wider transition shadow-xl active:scale-95 cursor-pointer"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      )}

      {/* OFFICIAL FIELD MANUAL & RULES MODAL */}
      {showManual && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#140b05] border-2 border-[#804f29] rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col text-amber-100 font-sans">
            <div className="flex items-center justify-between border-b border-[#3b2210] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🪳</span>
                <div>
                  <h3 className="text-base font-bold text-white">Kakerlaken Poker Rulebook</h3>
                  <div className="text-xs text-amber-400/70">
                    Official Bluffing & Reverse-Psychology Rules
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowManual(false)}
                className="p-1.5 rounded-xl bg-black/40 text-slate-400 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3.5 pr-1 text-xs text-amber-200/90 leading-relaxed">
              <div className="p-3 bg-black/40 border border-[#3b2210] rounded-xl text-amber-200">
                <strong className="text-white">Core Philosophy:</strong> This game has only{' '}
                <strong>ONE LOSER</strong> and multiple winners. Avoid collecting 4 of any creature!
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                  1. The 8 Creatures (สัตว์ทั้ง 8 ชนิด)
                </h4>
                <p className="text-slate-300">
                  There are 64 cards in the deck, with 8 cards of each creature: Cockroach, Bat, Fly, Toad, Rat, Scorpion, Stink Bug, and Spider.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">
                  2. Offering a Card (การส่งการ์ด)
                </h4>
                <p className="text-slate-300">
                  On your turn, slide 1 card face-down to any rival and declare: &quot;This is a [Creature]!&quot; You can tell the truth or bluff.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                  3. Receiver Choice A: Guess True or False (ทายจริง/โกหก)
                </h4>
                <p className="text-slate-300">
                  Say &quot;True&quot; or &quot;False&quot; and flip the card:
                  <br />• <strong>Guessed Correctly:</strong> The sender takes the card face-up in front of them!
                  <br />• <strong>Guessed Wrong:</strong> You must take the card face-up in front of yourself!
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-purple-400 uppercase tracking-wider text-[11px]">
                  4. Receiver Choice B: Peek & Pass (แอบดูแล้วส่งต่อ)
                </h4>
                <p className="text-slate-300">
                  Secretly peek at the card, then pass it to another rival who hasn&apos;t seen it yet this round, making your own claim. If everyone else has seen it, the last player MUST guess!
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-rose-400 uppercase tracking-wider text-[11px]">
                  5. Loss Conditions (เงื่อนไขการแพ้)
                </h4>
                <p className="text-slate-300">
                  You lose immediately if:
                  <br />1. You collect <strong>4 cards of the same creature</strong> face-up in your display.
                  <br />2. It is your turn to offer a card, but you have <strong>0 cards left in hand</strong>!
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#3b2210] text-right">
              <button
                onClick={() => setShowManual(false)}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs transition cursor-pointer"
              >
                Understood, Resume Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
