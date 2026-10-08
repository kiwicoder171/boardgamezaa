'use client';

import React, { useState, useEffect } from 'react';
import { Player } from '@/types/game';
import { BombBustersAction, BombBustersClientState, ClientWireTile, WireValue } from './types';
import { soundFX } from '@/lib/sounds';
import confetti from 'canvas-confetti';
import {
  AlertOctagon,
  AlertTriangle,
  Award,
  BatteryCharging,
  Check,
  Crown,
  Flame,
  HelpCircle,
  Radio,
  Scissors,
  Shield,
  Sparkles,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

interface BombBustersBoardProps {
  state: BombBustersClientState;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  onAction: (action: BombBustersAction) => void;
  onReturnToLobby: () => void;
}

export default function BombBustersBoard({
  state,
  players,
  currentPlayerId,
  isHost,
  onAction,
  onReturnToLobby,
}: BombBustersBoardProps) {
  // Wire selections
  const [selectedMyWireIds, setSelectedMyWireIds] = useState<string[]>([]);
  const [targetSelection, setTargetSelection] = useState<{
    playerId: string;
    wireId: string;
    slotIndex: number;
  } | null>(null);

  const [guessedCallValue, setGuessedCallValue] = useState<number>(1);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannerTargetPlayerId, setScannerTargetPlayerId] = useState<string>('');
  const [scannerValue, setScannerValue] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showManual, setShowManual] = useState(false);

  // Double Detector Skill State
  const [doubleDetectorModalOpen, setDoubleDetectorModalOpen] = useState(false);
  const [ddTargetPlayerId, setDdTargetPlayerId] = useState<string>('');
  const [ddWireId1, setDdWireId1] = useState<string>('');
  const [ddWireId2, setDdWireId2] = useState<string>('');
  const [ddGuessedValue, setDdGuessedValue] = useState<number>(1);

  // Auto Bot Turn Runner: Host triggers the server-side bot AI so bot secret wire values remain 100% hidden
  useEffect(() => {
    if (state.phase !== 'in_progress') return;
    if (!state.currentTurnPlayerId || !state.currentTurnPlayerId.startsWith('bot_')) return;
    if (!isHost) return;

    const botId = state.currentTurnPlayerId;
    const timer = setTimeout(() => {
      onAction({ type: 'BOT_AUTO_TURN', botId } as any);
      soundFX.playClick();
    }, 1200);

    return () => clearTimeout(timer);
  }, [state.currentTurnPlayerId, state.phase, isHost, onAction]);

  // Victory / Defeat audio triggers
  useEffect(() => {
    if (state.phase === 'victory') {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
      });
      soundFX.playVictory();
    } else if (state.phase === 'exploded') {
      soundFX.playAlarm();
    }
  }, [state.phase]);

  const isMyTurn = state.currentTurnPlayerId === currentPlayerId;
  const currentTurnPlayer = players.find((p) => p.id === state.currentTurnPlayerId);

  const myStand = state.stands[currentPlayerId] || [];
  const selectedMyWires = myStand.filter((w) => selectedMyWireIds.includes(w.id));
  const isSoloCutReady =
    (selectedMyWires.length === 2 || selectedMyWires.length === 4) &&
    selectedMyWires.every((w) => w.value === selectedMyWires[0].value) &&
    selectedMyWires[0].color !== 'red';

  const myUncutWires = myStand.filter((w) => !w.isCut);
  const hasOnlyRedWires = myUncutWires.length > 0 && myUncutWires.every((w) => w.color === 'red');
  const canUseDoubleDetector = !(state.doubleDetectorUsed && state.doubleDetectorUsed[currentPlayerId]);

  const progressPercent = Math.round((state.cutWiresCount / state.totalWiresToCut) * 100);


  const getWireColor = (value: WireValue | null, color?: string) => {
    if (value === 'RED' || color === 'red') {
      return {
        name: 'RED DANGER',
        bg: 'bg-rose-600',
        text: 'text-rose-600',
        border: 'border-rose-500',
        wire: '#ef4444',
        accent: 'from-rose-600 to-rose-700',
      };
    }
    if (color === 'yellow' || (typeof value === 'number' && !Number.isInteger(value))) {
      return {
        name: 'YELLOW DECIMAL',
        bg: 'bg-amber-400',
        text: 'text-amber-500',
        border: 'border-amber-400',
        wire: '#f59e0b',
        accent: 'from-amber-400 to-yellow-500',
      };
    }
    const colors = [
      { name: 'Azure', bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-500', wire: '#2563eb', accent: 'from-blue-600 to-blue-700' },
      { name: 'Amber', bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-500', wire: '#d97706', accent: 'from-amber-500 to-amber-600' },
      { name: 'Emerald', bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-500', wire: '#059669', accent: 'from-emerald-600 to-emerald-700' },
      { name: 'Purple', bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-500', wire: '#7c3aed', accent: 'from-purple-600 to-purple-700' },
      { name: 'Orange', bg: 'bg-orange-600', text: 'text-orange-600', border: 'border-orange-500', wire: '#ea580c', accent: 'from-orange-600 to-orange-700' },
      { name: 'Cyan', bg: 'bg-cyan-600', text: 'text-cyan-600', border: 'border-cyan-500', wire: '#0891b2', accent: 'from-cyan-600 to-cyan-700' },
      { name: 'Pink', bg: 'bg-pink-600', text: 'text-pink-600', border: 'border-pink-500', wire: '#db2777', accent: 'from-pink-600 to-pink-700' },
      { name: 'Indigo', bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-500', wire: '#4f46e5', accent: 'from-indigo-600 to-indigo-700' },
      { name: 'Lime', bg: 'bg-lime-600', text: 'text-lime-600', border: 'border-lime-500', wire: '#65a30d', accent: 'from-lime-600 to-lime-700' },
      { name: 'Gold', bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500', wire: '#ca8a04', accent: 'from-yellow-500 to-yellow-600' },
      { name: 'Teal', bg: 'bg-teal-600', text: 'text-teal-600', border: 'border-teal-500', wire: '#0d9488', accent: 'from-teal-600 to-teal-700' },
      { name: 'Ruby', bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-500', wire: '#e11d48', accent: 'from-rose-600 to-rose-700' },
    ];
    const num = typeof value === 'number' ? Math.floor(value) : typeof value === 'string' ? parseInt(value, 10) : NaN;
    if (!isNaN(num) && num >= 1 && num <= 12) {
      return colors[num - 1];
    }
    return { name: 'Unknown', bg: 'bg-slate-600', text: 'text-slate-400', border: 'border-slate-500', wire: '#64748b', accent: 'from-slate-600 to-slate-700' };
  };

  // Duo Cut handler
  const handleDuoSnip = () => {
    if (selectedMyWireIds.length !== 1 || !targetSelection) return;
    soundFX.playWireSnip();

    onAction({
      type: 'CUT_WIRE',
      myWireId: selectedMyWireIds[0],
      targetPlayerId: targetSelection.playerId,
      targetWireId: targetSelection.wireId,
    });

    setSelectedMyWireIds([]);
    setTargetSelection(null);
  };

  // Solo Cut handler
  const handleSoloCut = () => {
    if (selectedMyWireIds.length !== 2) return;
    soundFX.playWireSnip();

    onAction({
      type: 'SOLO_CUT',
      wireId1: selectedMyWireIds[0],
      wireId2: selectedMyWireIds[1],
    });

    setSelectedMyWireIds([]);
    setTargetSelection(null);
  };

  const handleUseScanner = () => {
    if (!scannerTargetPlayerId) return;
    soundFX.playClick();
    onAction({
      type: 'USE_SCANNER',
      targetPlayerId: scannerTargetPlayerId,
      scannedValue: scannerValue,
    });
    setScannerModalOpen(false);
  };

  const handleUseStabilizer = () => {
    soundFX.playClick();
    onAction({ type: 'USE_STABILIZER' });
  };

  const handlePlaceInfoToken = (wireId: string) => {
    soundFX.playClick();
    onAction({
      type: 'PLACE_INFO_TOKEN',
      wireId,
    });
    setSelectedMyWireIds([]);
    setTargetSelection(null);
  };

  const handleOperativeCall = (guessedValue: number) => {
    if (!targetSelection) return;
    soundFX.playWireSnip();
    onAction({
      type: 'OPERATIVE_CALL',
      targetPlayerId: targetSelection.playerId,
      targetWireId: targetSelection.wireId,
      guessedValue,
    });
    setTargetSelection(null);
  };

  const handlePassTurn = () => {
    soundFX.playClick();
    onAction({ type: 'PASS_TURN' });
    setSelectedMyWireIds([]);
    setTargetSelection(null);
  };

  const handleDoubleDetector = () => {
    if (!ddTargetPlayerId || !ddWireId1 || !ddWireId2) return;
    soundFX.playClick();
    onAction({
      type: 'USE_DOUBLE_DETECTOR',
      targetPlayerId: ddTargetPlayerId,
      wireId1: ddWireId1,
      wireId2: ddWireId2,
      guessedValue: ddGuessedValue,
    });
    setDoubleDetectorModalOpen(false);
    setDdWireId1('');
    setDdWireId2('');
  };

  const handleUseHelperCard = (cardId: string, targetWireId?: string) => {
    soundFX.playClick();
    onAction({
      type: 'USE_HELPER_CARD',
      cardId,
      targetWireId,
    });
  };

  const handleRevealRedWires = () => {
    soundFX.playClick();
    onAction({ type: 'REVEAL_RED_WIRES' });
  };


  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFX.setEnabled(next);
  };

  const toggleMyWireSelection = (wireId: string) => {
    soundFX.playTileClack();
    setTargetSelection(null); // Clear teammate target if multi-selecting for solo cut

    setSelectedMyWireIds((prev) => {
      if (prev.includes(wireId)) {
        return prev.filter((id) => id !== wireId);
      }
      if (prev.length >= 2) {
        return [wireId];
      }
      return [...prev, wireId];
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* LUXURY PHYSICAL TABLETOP FELT */}
      <div className="tabletop-felt rounded-[36px] sm:rounded-[44px] p-5 sm:p-8 space-y-8 relative overflow-hidden shadow-2xl">
        {/* Table Top Controls & Mission Dossier */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-950/40 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-amber-950/40 rounded-2xl border border-amber-900/40 shadow-inner">
              💣
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300 uppercase">
                  Mission #{state.missionId || 1}
                </span>
                <h2 className="text-lg sm:text-xl font-black text-amber-100 tracking-wide font-serif">
                  {state.missionName || 'Bomb Busters Tabletop'}
                </h2>
              </div>
              <p className="text-xs text-amber-300/70 font-sans line-clamp-1 max-w-lg mt-0.5">
                {state.missionBriefing || 'Cooperative Wire-Defusal Operation'}
              </p>
            </div>
          </div>

          {/* Current Turn Badge */}
          <div className="px-4 py-2 rounded-2xl bg-black/40 border border-amber-900/40 text-xs sm:text-sm font-semibold shadow-inner">
            {isMyTurn ? (
              <span className="text-amber-300 font-black animate-pulse flex items-center gap-2">
                <Scissors className="w-4 h-4 text-rose-400" />
                <span>YOUR TURN: Duo Cut with a teammate, or Solo Cut your own pair!</span>
              </span>
            ) : (
              <span className="text-slate-300 flex items-center gap-2">
                <span className="text-base">{currentTurnPlayer?.avatar}</span>
                <span>
                  Operative <strong className="text-amber-300">{currentTurnPlayer?.name}</strong> is cutting wires...
                </span>
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManual(true)}
              className="p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-900/50 transition shadow-md flex items-center gap-1.5 text-xs font-bold"
              title="Bomb Disposal Field Manual & Rules"
            >
              <span>📖</span>
              <span className="hidden sm:inline">Manual</span>
            </button>
            <button
              onClick={toggleSound}
              className="p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-200 border border-amber-900/50 transition shadow-md"
              title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            </button>
            <button
              onClick={onReturnToLobby}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-950/50 hover:bg-amber-900/70 text-amber-100 border border-amber-800/60 transition shadow-md"
              title="Return to Room Lobby"
            >
              {isHost ? 'End Mission' : 'Lobby'}
            </button>
          </div>
        </div>

        {/* 1. ACROSS THE TABLE: TEAMMATES' WOODEN STANDS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-amber-200/80 px-2 uppercase tracking-wider">
            <span>Operatives Seated Across The Table</span>
            <span className="text-[11px] text-amber-400/60 normal-case font-mono">
              (Numbered strictly in ascending order ➔ Left to Right)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {players
              .filter((p) => p.id !== currentPlayerId)
              .map((teammate) => {
                const stand = state.stands[teammate.id] || [];
                const isTheirTurn = state.currentTurnPlayerId === teammate.id;

                return (
                  <div
                    key={teammate.id}
                    className={`wooden-rack rounded-2xl p-3.5 space-y-2.5 transition transform ${
                      isTheirTurn ? 'ring-2 ring-amber-400 scale-[1.02]' : ''
                    }`}
                  >
                    {/* Teammate Nameplate on Rack */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{teammate.avatar}</span>
                        <div className="font-serif font-black text-xs sm:text-sm text-amber-100 drop-shadow flex items-center gap-1.5">
                          <span>{teammate.name}</span>
                          {teammate.id === state.captainPlayerId && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5 text-amber-400" />
                              <span>CAPTAIN</span>
                            </span>
                          )}
                          {stand.length > 0 && stand.every((w) => w.isCut) && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[8px] font-mono font-bold">
                              ✓ CLEARED
                            </span>
                          )}
                        </div>
                      </div>
                      {isTheirTurn && (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse">
                          Active Turn
                        </span>
                      )}
                    </div>

                    {/* Wooden Rack Groove with Upright Chunky Domino Tiles */}
                    <div className="rack-groove rounded-xl p-2.5 flex flex-wrap gap-2 justify-center min-h-[110px] items-end pb-3">
                      {stand.map((wire, idx) => {
                        const isCut = wire.isCut;
                        const isTargeted =
                          targetSelection?.playerId === teammate.id &&
                          targetSelection?.wireId === wire.id;
                        const wireCol = getWireColor(wire.value, wire.color);
                        const hasInfoToken = wire.infoToken != null;

                        return (
                          <div
                            key={wire.id}
                            onClick={() => {
                              if (!isCut && isMyTurn) {
                                soundFX.playTileClack();
                                setTargetSelection(
                                  isTargeted
                                    ? null
                                    : {
                                        playerId: teammate.id,
                                        wireId: wire.id,
                                        slotIndex: idx,
                                      }
                                );
                              }
                            }}
                            className={`relative w-12 h-20 sm:w-14 sm:h-22 rounded-lg flex flex-col items-center justify-between p-1.5 select-none transition-all cursor-pointer ${
                              isCut
                                ? 'tile-cut'
                                : isTargeted
                                ? 'chunky-tile -translate-y-3 ring-4 ring-cyan-400 shadow-2xl scale-105'
                                : isMyTurn
                                ? 'chunky-tile hover:-translate-y-1 hover:ring-2 hover:ring-cyan-300/60'
                                : 'chunky-tile'
                            }`}
                          >
                            {/* Insulated Wire Header Cord on Tile */}
                            <div className="w-full flex items-center justify-between px-0.5">
                              <span className="text-[8px] font-mono font-black text-slate-500">
                                #{idx + 1}
                              </span>
                              <div
                                className="w-2.5 h-1.5 rounded-full"
                                style={{ backgroundColor: isCut ? '#475569' : wireCol.wire }}
                              />
                            </div>

                            {/* Center Value / Unknown Glyph / Info Token Value */}
                            <div className="my-auto text-center">
                              {isCut ? (
                                <span className="font-mono text-base font-black text-slate-400">
                                  {wire.value}
                                </span>
                              ) : wire.value !== null ? (
                                <span className={`font-mono text-lg font-black ${wireCol.text}`}>
                                  {wire.value}
                                </span>
                              ) : hasInfoToken ? (
                                <span className={`font-mono text-lg font-black text-amber-400`}>
                                  {wire.infoToken}
                                </span>
                              ) : (
                                <span className="font-serif text-lg font-black text-slate-400 opacity-60">
                                  ?
                                </span>
                              )}
                            </div>

                            {/* Clues / Sticky Notes Attached to Tile */}
                            <div className="w-full flex flex-wrap justify-center gap-0.5 min-h-[14px]">
                              {isCut ? (
                                <span className="text-[8px] font-black text-emerald-600 uppercase">
                                  CUT ✓
                                </span>
                              ) : (
                                wire.clues.slice(-2).map((c, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className={`text-[8px] font-mono font-black px-1 rounded shadow-sm ${
                                      c.startsWith('=') || c.startsWith('Token')
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}
                                  >
                                    {c}
                                  </span>
                                ))
                              )}
                            </div>

                            {/* OFFICIAL INFO TOKEN BADGE PINNED AT BASE OF TILE */}
                            {hasInfoToken && !isCut && (
                              <div className="absolute -bottom-2.5 z-20 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 border-2 border-amber-600 shadow-lg flex items-center justify-center font-mono text-[9px] font-black text-amber-950">
                                #{wire.infoToken}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* 2. CENTER OF THE TABLE: BRUSHED METAL BOMB DETONATOR CHASSIS */}
        <div className="metal-chassis rounded-3xl p-5 sm:p-6 relative shadow-2xl space-y-5 border border-slate-700">
          {/* Rivets on the corners */}
          <div className="absolute top-3 left-3 rivet" />
          <div className="absolute top-3 right-3 rivet" />
          <div className="absolute bottom-3 left-3 rivet" />
          <div className="absolute bottom-3 right-3 rivet" />

          {/* OFFICIAL CIRCUIT VALIDATION TRACK (Numbers 1 to 12) */}
          {state.validationTrack && Object.keys(state.validationTrack).length > 0 && (
            <div className="bg-black/50 border border-slate-700/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-inner">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-bold">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Circuit Validation Track:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {Object.entries(state.validationTrack).map(([numStr, track]) => {
                  const num = Number(numStr);
                  return (
                    <div
                      key={num}
                      className={`px-2 py-1 rounded-lg border font-mono text-xs flex items-center gap-1 transition ${
                        track.isValidated
                          ? 'bg-emerald-500/20 border-emerald-500/70 text-emerald-300 font-black shadow-sm'
                          : track.cut > 0
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-bold'
                          : 'bg-slate-900/80 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span>#{num}</span>
                      <span className="text-[9px]">
                        {track.isValidated ? '✓' : `${track.cut}/${track.total}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TACTICAL HELPER CARDS (การ์ดตัวช่วย) */}
          {state.helperCards && state.helperCards.length > 0 && (
            <div className="bg-black/50 border border-indigo-900/50 rounded-2xl p-3.5 space-y-2.5 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-300 flex items-center gap-2 font-bold">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>Tactical Helper Cards (การ์ดตัวช่วย):</span>
                </div>
                <span className="text-[10px] text-indigo-300/70 font-mono">
                  Unlocked when wire #{'{n}'} is cut. Can play multiple per turn!
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {state.helperCards.map((card) => {
                  const canUse = isMyTurn && card.isUnlocked && !card.isUsed;
                  return (
                    <div
                      key={card.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                        card.isUsed
                          ? 'bg-slate-950/60 border-slate-800 opacity-40'
                          : card.isUnlocked
                          ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md shadow-indigo-950/30'
                          : 'bg-slate-900/70 border-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                          <span className={card.isUnlocked ? 'text-indigo-200' : 'text-slate-400'}>
                            {card.name}
                          </span>
                          {card.isUsed ? (
                            <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.2 rounded font-mono">
                              USED
                            </span>
                          ) : card.isUnlocked ? (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> READY
                            </span>
                          ) : (
                            <span className="text-[9px] bg-amber-500/10 text-amber-400/80 px-1.5 py-0.2 rounded font-mono">
                              Need #{card.requiredNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {card.description}
                        </p>
                      </div>

                      {canUse && (
                        <button
                          type="button"
                          onClick={() => handleUseHelperCard(card.id)}
                          className="px-2.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold transition shrink-0 shadow active:scale-95 cursor-pointer"
                        >
                          Use
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CENTER INFO TOKEN SUPPLY TRAY (โทเคนใบ้ตรงกลาง) */}
          <div className="bg-black/40 border border-amber-900/40 rounded-2xl p-3.5 space-y-2 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-2 font-bold">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Center Clue Token Supply (โทเคนใบ้ตรงกลาง):</span>
              </div>
              <span className="text-[10px] text-amber-300/70 font-mono">
                Click a token to clue your matching wire, or click &quot;💡 Clue&quot; on your stand
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: state.numberRange || 12 }, (_, i) => i + 1).map((val) => {
                const uncluedTile = myStand.find(
                  (w) => !w.isCut && w.value === val && w.infoToken == null
                );
                const canUseThisToken = isMyTurn && Boolean(uncluedTile);

                return (
                  <button
                    key={val}
                    type="button"
                    disabled={!canUseThisToken}
                    onClick={() => {
                      if (uncluedTile) {
                        handlePlaceInfoToken(uncluedTile.id);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black transition flex items-center gap-1.5 border shadow-sm ${
                      canUseThisToken
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 hover:bg-amber-400 hover:text-slate-950 cursor-pointer shadow-amber-900/40 scale-100 hover:scale-105 active:scale-95'
                        : 'bg-slate-900/80 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                    }`}
                    title={
                      canUseThisToken
                        ? `Place Info Token #${val} on your rack wire`
                        : `Info Token #${val}`
                    }
                  >
                    <span>#{val}</span>
                    {canUseThisToken && <span className="text-[10px]">💡</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
            {/* Detonator Stability Analog / LED Meter */}
            <div className="flex items-center gap-3">
              <div className="led-display px-4 py-2.5 rounded-2xl flex items-center gap-3 border">
                <Flame
                  className={`w-6 h-6 ${
                    state.detonatorLives <= 1
                      ? 'text-rose-500 animate-ping'
                      : 'text-amber-500'
                  }`}
                />
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-400 font-mono">
                    Detonator Stability
                  </div>
                  <div className="font-mono text-xl sm:text-2xl font-black text-rose-500 tracking-wider">
                    {state.detonatorLives} / {state.maxDetonatorLives}
                    <span className="text-xs text-rose-400/80 ml-2">CELLS</span>
                  </div>
                </div>
              </div>

              {/* Progress Needle / Bar */}
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Defused Wires: {state.cutWiresCount} / {state.totalWiresToCut}</span>
                </div>
                <div className="w-32 sm:w-44 h-3 bg-black/60 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-400 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Tactical Squad Equipment Rested On Chassis */}
            <div className="flex items-center gap-2.5">
              <button
                disabled={!state.equipment.scannerAvailable || !isMyTurn}
                onClick={() => {
                  soundFX.playClick();
                  setScannerTargetPlayerId(players.find((p) => p.id !== currentPlayerId)?.id || '');
                  setScannerModalOpen(true);
                }}
                className={`px-3.5 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition shadow-md ${
                  state.equipment.scannerAvailable && isMyTurn
                    ? 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border-indigo-500/60 shadow-indigo-900/30'
                    : 'bg-slate-900/80 text-slate-500 border-slate-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <Radio className="w-4 h-4 text-indigo-400" />
                <span>Sonar Scanner {state.equipment.scannerAvailable ? '(Ready)' : '(Used)'}</span>
              </button>

              <button
                disabled={
                  !state.equipment.stabilizerAvailable ||
                  state.detonatorLives >= state.maxDetonatorLives ||
                  !isMyTurn
                }
                onClick={handleUseStabilizer}
                className={`px-3.5 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition shadow-md ${
                  state.equipment.stabilizerAvailable && state.detonatorLives < state.maxDetonatorLives && isMyTurn
                    ? 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/60 shadow-emerald-900/30'
                    : 'bg-slate-900/80 text-slate-500 border-slate-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
                <span>Stabilizer +1 {state.equipment.stabilizerAvailable ? '(Ready)' : '(Used)'}</span>
              </button>

              <button
                disabled={!canUseDoubleDetector || !isMyTurn}
                onClick={() => {
                  soundFX.playClick();
                  const firstOther = players.find((p) => p.id !== currentPlayerId);
                  setDdTargetPlayerId(firstOther?.id || '');
                  setDdWireId1('');
                  setDdWireId2('');
                  setDoubleDetectorModalOpen(true);
                }}
                className={`px-3.5 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition shadow-md ${
                  canUseDoubleDetector && isMyTurn
                    ? 'bg-slate-800 hover:bg-slate-700 text-purple-300 border-purple-500/60 shadow-purple-900/30'
                    : 'bg-slate-900/80 text-slate-500 border-slate-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <Zap className="w-4 h-4 text-purple-400" />
                <span>Double Detector {canUseDoubleDetector ? '(1 Left)' : '(Used)'}</span>
              </button>
            </div>
          </div>

          {/* ACTIVE SNIP ACTION BENCH (DUO CUT, SOLO CUT, SAFE RED REVEAL, OR OPERATIVE CALL) */}
          {isMyTurn && (
            <div className="bg-black/50 border border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-inner">
              {/* Option A: Safe Red Wire Reveal when only Red wires remain */}
              {hasOnlyRedWires ? (
                <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 bg-rose-950/30 border border-rose-500/40 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-rose-400 animate-pulse shrink-0" />
                    <div>
                      <div className="font-bold text-rose-300 text-xs sm:text-sm">
                        ALL REMAINING WIRES ON YOUR STAND ARE RED DANGER WIRES!
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Per defusal protocol (Rule 6.3), you can safely reveal all red wires to clear your stand!
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleRevealRedWires}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xl shadow-rose-950/60 flex items-center justify-center gap-2 transform active:scale-95 shrink-0"
                  >
                    <span>REVEAL ALL RED WIRES 🚩</span>
                  </button>
                </div>
              ) : isSoloCutReady ? (
                <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <div className="font-bold text-amber-300 text-sm flex items-center gap-2">
                        <span>SOLO CUT OPPORTUNITY READY!</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
                          Pair #{selectedMyWires[0].value}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">
                        You selected 2 identical wires in your own stand. If no other player holds wire #{selectedMyWires[0].value}, you can cut both yourself!
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSoloCut}
                    className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 transform active:scale-95"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>EXECUTE SOLO CUT! ✂️</span>
                  </button>
                </div>
              ) : myStand.filter((w) => !w.isCut).length === 0 ? (
                /* Option B: All Wires Cut! Operative Deduction Call or Pass */
                <div className="flex flex-col w-full gap-3">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-slate-700 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚡</span>
                      <div>
                        <div className="font-bold text-emerald-400 text-xs sm:text-sm">
                          ALL YOUR WIRES ARE DEFUSED! OPERATIVE CALL ACTIVE
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Pick a teammate&apos;s uncut wire above, choose a guessed number, or pass turn.
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handlePassTurn}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition"
                    >
                      Pass Turn ⏭️
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-sans">Target:</span>
                      {targetSelection ? (
                        <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-400/50 rounded-xl font-mono text-xs font-black text-cyan-300">
                          Slot #{targetSelection.slotIndex + 1}
                        </span>
                      ) : (
                        <span className="text-xs text-cyan-400 italic">
                          Click a teammate&apos;s tile above
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-slate-400">Call Value:</span>
                      <select
                        value={guessedCallValue}
                        onChange={(e) => setGuessedCallValue(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
                      >
                        {Array.from({ length: state.numberRange || 12 }, (_, i) => i + 1).map((val) => (
                          <option key={val} value={val}>
                            #{val}
                          </option>
                        ))}
                      </select>

                      <button
                        disabled={!targetSelection}
                        onClick={() => handleOperativeCall(guessedCallValue)}
                        className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl transition shadow-md disabled:opacity-40"
                      >
                        Call Wire #{guessedCallValue}! 🎯
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Option C: Standard Duo Cut */
                <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
                  <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-sans">Your Wire:</span>
                      {selectedMyWires.length === 1 ? (
                        <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/50 rounded-xl font-mono text-base font-black text-amber-300">
                          Wire #{selectedMyWires[0].value}
                        </span>
                      ) : (
                        <span className="text-amber-400/80 italic animate-pulse">
                          Click 1 of your uncut tiles below ➔
                        </span>
                      )}
                    </div>

                    <span className="text-slate-600 font-black">➔</span>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-sans">Teammate Target:</span>
                      {targetSelection ? (
                        <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-400/50 rounded-xl font-mono text-base font-black text-cyan-300">
                          Slot #{targetSelection.slotIndex + 1}
                        </span>
                      ) : (
                        <span className="text-cyan-400/80 italic">
                          Pick a teammate&apos;s tile above
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      disabled={selectedMyWires.length !== 1 || !targetSelection}
                      onClick={handleDuoSnip}
                      className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xl shadow-rose-950/60 disabled:opacity-40 flex items-center justify-center gap-2 transform active:scale-95"
                    >
                      <Scissors className="w-4 h-4" />
                      <span>SNIP WIRE! ✂️</span>
                    </button>

                    {selectedMyWires.length === 1 &&
                      !selectedMyWires[0].isCut &&
                      selectedMyWires[0].infoToken === null && (
                        <button
                          type="button"
                          onClick={() => handlePlaceInfoToken(selectedMyWires[0].id)}
                          className="w-full sm:w-auto px-5 py-3.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-2 transform active:scale-95"
                          title="Place Info Token from center onto this wire to give your team a clue"
                        >
                          <span>💡</span>
                          <span>PLACE INFO TOKEN (#{selectedMyWires[0].value})</span>
                        </button>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. IN FRONT OF YOU: YOUR PERSONAL WOODEN STAND */}
        <div className="wooden-rack rounded-3xl p-5 space-y-4 shadow-2xl border-t-4 border-[#7a4f30]">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🪵</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-serif font-black text-amber-100 drop-shadow">
                    Your Personal Defusal Stand (Secret Wires)
                  </h3>
                  {currentPlayerId === state.captainPlayerId && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                      <Crown className="w-3 h-3 text-amber-400" />
                      CAPTAIN
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-300/70 font-sans">
                  Sorted strictly ascending (1 ➔ 12). Select 1 wire for a Duo Cut, or select 2 identical wires for a Solo Cut!
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-800/60 shadow-inner">
              {myStand.filter((w) => !w.isCut).length} Active Wires
            </span>
          </div>

          {/* Recessed Mahogany Rack Groove with Standing Resin Tiles */}
          <div className="rack-groove rounded-2xl p-4 flex flex-wrap gap-3.5 items-end justify-center min-h-[145px] pb-4">
            {myStand.map((wire, idx) => {
              const isSelected = selectedMyWireIds.includes(wire.id);
              const isCut = wire.isCut;
              const isRed = wire.value === 'RED' || wire.color === 'red';
              const isYellow = wire.color === 'yellow';
              const wireCol = getWireColor(wire.value, wire.color);
              const hasInfoToken = wire.infoToken != null;

              return (
                <div
                  key={wire.id}
                  onClick={() => {
                    if (!isCut && isMyTurn) {
                      toggleMyWireSelection(wire.id);
                    }
                  }}
                  className={`relative w-16 h-28 sm:w-20 sm:h-32 rounded-xl flex flex-col justify-between p-2 select-none cursor-pointer transition-all ${
                    isCut
                      ? 'tile-cut'
                      : isSelected
                      ? 'chunky-tile -translate-y-4 ring-4 ring-amber-400 shadow-2xl scale-105'
                      : isMyTurn
                      ? 'chunky-tile hover:-translate-y-2 hover:ring-2 hover:ring-amber-300/60'
                      : 'chunky-tile'
                  }`}
                >
                  {/* Top Insulated Cable Wire on Tile */}
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black text-slate-500">
                      #{idx + 1}
                    </span>
                    <div
                      className="w-4 h-2 rounded-full border border-black/20"
                      style={{ backgroundColor: isCut ? '#475569' : wireCol.wire }}
                    />
                  </div>

                  {/* Wire Big Value Embossed on Tile */}
                  <div className="text-center my-auto">
                    <div
                      className={`text-2xl sm:text-3xl font-mono font-black ${
                        isRed
                          ? 'text-rose-600 animate-pulse'
                          : isYellow
                          ? 'text-amber-500'
                          : isCut
                          ? 'text-slate-400'
                          : wireCol.text
                      }`}
                    >
                      {wire.value}
                    </div>
                    {isRed && !isCut && (
                      <div className="text-[8px] font-black uppercase text-rose-600 tracking-wider">
                        DANGER RED
                      </div>
                    )}
                    {isYellow && !isCut && (
                      <div className="text-[8px] font-black uppercase text-amber-500 tracking-wider">
                        YELLOW DECIMAL
                      </div>
                    )}
                  </div>

                  {/* Bottom Tile Status */}
                  <div className="w-full flex justify-center">
                    {isCut ? (
                      <span className="text-[9px] uppercase font-black text-slate-400">
                        CUT ✓
                      </span>
                    ) : (
                      <div
                        className="w-2.5 h-2.5 rounded-full border border-black/30"
                        style={{ backgroundColor: wireCol.wire }}
                      />
                    )}
                  </div>

                  {/* INFO TOKEN PINNED AT BASE OF TILE OR CLUE BUTTON */}
                  {hasInfoToken && !isCut ? (
                    <div className="absolute -bottom-2.5 z-20 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 border-2 border-amber-600 shadow-lg flex items-center justify-center font-mono text-[9px] font-black text-amber-950">
                      #{wire.infoToken}
                    </div>
                  ) : !isCut && isMyTurn ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaceInfoToken(wire.id);
                      }}
                      className="absolute -bottom-3 z-20 px-2 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-[9px] shadow-lg border border-amber-500 uppercase tracking-wider flex items-center gap-0.5 transition cursor-pointer"
                      title={`Place Info Token #${wire.value} on this wire`}
                    >
                      <span>💡</span>
                      <span>Clue</span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. TABLE FELT ACTION LOG / INVESTIGATION CLIPBOARD */}
        <div className="bg-black/40 border border-amber-950/60 rounded-2xl p-4 space-y-2 shadow-inner">
          <div className="text-[11px] font-mono font-bold text-amber-200/80 uppercase tracking-wider flex items-center gap-2">
            <span>📋</span> Squad Defusal Action Log
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 pr-2 text-xs font-mono">
            {state.history.slice(-6).reverse().map((h) => (
              <div
                key={h.id}
                className={`p-1.5 rounded-lg border text-[11px] ${
                  h.type === 'boom'
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold'
                    : h.type === 'success'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : h.type === 'error'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-black/30 border-slate-800 text-slate-300'
                }`}
              >
                {h.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SCANNER MODAL */}
      {scannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111215] border border-[#222429] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222429] pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Radio className="w-4 h-4 text-amber-400" />
                <span>Sonar Scanner Query</span>
              </div>
              <button
                onClick={() => setScannerModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#18191e] hover:bg-[#22242a] text-zinc-400 hover:text-white border border-[#272930] transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Select Teammate to Scan:</label>
                <select
                  value={scannerTargetPlayerId}
                  onChange={(e) => setScannerTargetPlayerId(e.target.value)}
                  className="w-full bg-[#141518] border border-[#272930] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                >
                  {players
                    .filter((p) => p.id !== currentPlayerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.avatar} {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Select Wire Value to Search (1-12):
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={scannerValue}
                  onChange={(e) => setScannerValue(parseInt(e.target.value, 10))}
                  className="w-full bg-[#141518] border border-[#272930] rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[#222429]">
              <button
                onClick={() => setScannerModalOpen(false)}
                className="px-4 py-2 bg-[#18191e] hover:bg-[#22242a] text-zinc-300 border border-[#272930] rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUseScanner}
                className="px-5 py-2 btn-tactile bg-white hover:bg-zinc-200 text-zinc-950 rounded-xl text-xs font-bold transition shadow-sm"
              >
                Deploy Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOUBLE DETECTOR (เครื่องตรวจจับแบบสองเท่า) MODAL */}
      {doubleDetectorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111215] border border-purple-500/40 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222429] pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Double Detector (เครื่องตรวจจับแบบสองเท่า)</h3>
                  <div className="text-[10px] text-zinc-400">1 use per operative per mission</div>
                </div>
              </div>
              <button
                onClick={() => setDoubleDetectorModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#18191e] hover:bg-[#22242a] text-zinc-400 hover:text-white border border-[#272930] transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Select Teammate */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">1. Select Teammate:</label>
                <select
                  value={ddTargetPlayerId}
                  onChange={(e) => {
                    setDdTargetPlayerId(e.target.value);
                    setDdWireId1('');
                    setDdWireId2('');
                  }}
                  className="w-full bg-[#141518] border border-[#272930] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {players
                    .filter((p) => p.id !== currentPlayerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.avatar} {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Select 2 Adjacent Wires */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">2. Select 2 Adjacent Wires:</label>
                  <span className="text-[10px] text-purple-400">
                    {ddWireId1 && ddWireId2 ? '✓ 2 Adjacent wires selected' : ddWireId1 ? 'Pick 1 adjacent wire' : 'Click first wire'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 p-3 bg-black/40 rounded-xl border border-zinc-800 justify-center">
                  {(() => {
                    const uncutWires = (state.stands[ddTargetPlayerId] || []).filter((w) => !w.isCut);
                    if (uncutWires.length === 0) {
                      return <span className="text-xs text-zinc-500">No uncut wires remaining</span>;
                    }
                    return uncutWires.map((wire, idx) => {
                      const isSelected = wire.id === ddWireId1 || wire.id === ddWireId2;
                      return (
                        <button
                          key={wire.id}
                          type="button"
                          onClick={() => {
                            if (wire.id === ddWireId1) {
                              setDdWireId1(ddWireId2);
                              setDdWireId2('');
                            } else if (wire.id === ddWireId2) {
                              setDdWireId2('');
                            } else if (!ddWireId1) {
                              setDdWireId1(wire.id);
                            } else if (!ddWireId2) {
                              const idx1 = uncutWires.findIndex((w) => w.id === ddWireId1);
                              if (Math.abs(idx - idx1) === 1) {
                                setDdWireId2(wire.id);
                              } else {
                                setDdWireId1(wire.id);
                              }
                            } else {
                              setDdWireId1(wire.id);
                              setDdWireId2('');
                            }
                          }}
                          className={`w-10 h-14 rounded-xl border flex flex-col items-center justify-center font-mono text-xs font-bold transition ${
                            isSelected
                              ? 'bg-purple-600 border-purple-300 text-white shadow-lg shadow-purple-900/50 scale-105'
                              : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
                          }`}
                        >
                          <span className="text-[9px] text-zinc-400">#{idx + 1}</span>
                          <span>{wire.infoToken ? `#${wire.infoToken}` : '?'}</span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Select Guess Value */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">3. Call Guessed Value (1-12):</label>
                <select
                  value={ddGuessedValue}
                  onChange={(e) => setDdGuessedValue(Number(e.target.value))}
                  className="w-full bg-[#141518] border border-[#272930] rounded-xl p-2.5 text-xs text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-500"
                >
                  {Array.from({ length: state.numberRange || 12 }, (_, i) => i + 1).map((val) => (
                    <option key={val} value={val}>
                      #{val}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 bg-purple-950/20 border border-purple-900/40 rounded-xl text-[10px] text-purple-300/80 space-y-1">
                <div>• <strong>Both Match:</strong> Cut both wires immediately! ✂️✂️</div>
                <div>• <strong>1 Matches:</strong> Wire reveals its Info Token (no stability lost). 💡</div>
                <div>• <strong>0 Match:</strong> Detonator loses 1 stability cell. 💥</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[#222429]">
              <button
                onClick={() => setDoubleDetectorModalOpen(false)}
                className="px-4 py-2 bg-[#18191e] hover:bg-[#22242a] text-zinc-300 border border-[#272930] rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                disabled={!ddTargetPlayerId || !ddWireId1 || !ddWireId2}
                onClick={handleDoubleDetector}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-40"
              >
                Scan Adjacent Wires
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER (VICTORY OR EXPLODED) MODAL */}
      {state.phase !== 'in_progress' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className="bg-[#111215] border border-[#222429] rounded-2xl p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-2xl"
          >
            <div className="text-5xl">
              {state.phase === 'victory' ? '🏆' : '💥'}
            </div>

            <div className="space-y-1.5">
              <h2
                className={`text-2xl font-bold ${
                  state.phase === 'victory' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {state.phase === 'victory' ? 'Bomb Defused!' : 'Mission Failed!'}
              </h2>
              <p className="text-xs text-zinc-400">{state.endReason}</p>
            </div>

            <div className="p-3.5 bg-[#141518] rounded-xl border border-[#272930] text-xs text-zinc-300 space-y-1 text-left">
              <div>
                Mission #{state.missionId}: <strong className="text-white">{state.missionName}</strong>
              </div>
              <div>
                Disarmed: <strong className="text-white">{state.cutWiresCount} / {state.totalWiresToCut} Wires</strong>
              </div>
              <div>Detonator Stability Remaining: <strong className="text-white">{state.detonatorLives}</strong></div>
            </div>

            {isHost ? (
              <button
                onClick={onReturnToLobby}
                className="w-full py-2.5 btn-tactile bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl transition shadow-sm text-xs"
              >
                Return to Lobby
              </button>
            ) : (
              <div className="text-xs text-zinc-500">
                Waiting for host to return squad to lobby...
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOMB DISPOSAL FIELD MANUAL MODAL */}
      {showManual && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111215] border border-[#222429] rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col text-zinc-200 font-sans">
            <div className="flex items-center justify-between border-b border-[#222429] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">💣</span>
                <div>
                  <h3 className="text-base font-bold text-white">Bomb Disposal Field Manual</h3>
                  <div className="text-xs text-zinc-400">Cooperative Wire Defusal Protocols & Tactics</div>
                </div>
              </div>
              <button
                onClick={() => setShowManual(false)}
                className="p-1.5 rounded-xl bg-[#18191e] hover:bg-[#22242a] text-zinc-400 hover:text-white border border-[#272930] transition"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3.5 pr-1 text-xs text-zinc-300 leading-relaxed">
              <div className="p-3 bg-[#141518] border border-[#272930] rounded-xl text-zinc-300">
                <strong className="text-white">Mission Protocol:</strong> Complete up to 60 missions from easiest to expert! Work with your squad to cut all standard numbered wires across everyone&apos;s stands without detonating. If all standard wires are cut (or red wires safely revealed), you win!
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">👑 Captain & Turn Order</h4>
                <p className="text-zinc-400">
                  Player #1 in the randomized turn order is designated <strong>Mission Captain</strong>. Each operative starts the mission by placing 1 Info Token on a matching wire on their rack to give the squad an opening clue.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">✂️ Duo Cut (ตัดคู่)</h4>
                <p className="text-zinc-400">
                  Select 1 wire on your stand and target 1 wire on a teammate&apos;s stand:
                  <br />• <strong>Match:</strong> Both wires are safely cut!
                  <br />• <strong>Miss:</strong> Detonator loses 1 stability cell, and your teammate reveals that wire&apos;s Info Token to assist future deductions.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">⚡ Solo Cut (ตัดเดี่ยว)</h4>
                <p className="text-zinc-400">
                  You can cut wires on your own rack without teammate confirmation in two scenarios:
                  <br />1. You hold all 4 copies of that number in your own hand.
                  <br />2. That number has already had 1 pair cut on the board, and you hold the remaining 2 copies in your hand.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">🟡 Yellow Decimals (.1) & 🚨 Red Danger (.5)</h4>
                <p className="text-zinc-400">
                  • <strong>Yellow Wires (.1):</strong> 1.1, 2.1, etc. Sorted naturally between whole numbers. Yellow pairs can be cut together without guessing numbers!
                  <br />• <strong>Red Danger Wires (.5):</strong> Cutting a red wire causes immediate explosion! However, if <strong>only Red wires remain</strong> on your stand, you can use <em>Safe Red Wire Reveal</em> to clear your rack without detonation.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-purple-400 uppercase tracking-wider text-[11px]">⚡ Double Detector (เครื่องตรวจจับแบบสองเท่า)</h4>
                <p className="text-zinc-400">
                  Each operative can use the Double Detector <strong>once per mission</strong>. Choose 2 adjacent wires on a teammate&apos;s rack and guess 1 number:
                  <br />• <strong>Both match:</strong> Cut both wires immediately!
                  <br />• <strong>1 matches:</strong> Reveal that wire&apos;s Info Token (no stability lost).
                  <br />• <strong>0 match:</strong> Detonator loses 1 stability cell.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">🛡️ Tactical Helper Cards (การ์ดตัวช่วย)</h4>
                <p className="text-zinc-400">
                  Helper cards unlock once their designated wire number has been cut on the board. Once unlocked, operatives can play them on their turn (multiple can be used per turn, one-time use per card).
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-rose-400 uppercase tracking-wider text-[11px]">💥 Detonator Stability Formula</h4>
                <p className="text-zinc-400">
                  Total mistakes allowed = <strong>Number of Players + 1</strong>. When an operative has no uncut wires remaining, their turns are automatically skipped.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#222429] text-right">
              <button
                onClick={() => setShowManual(false)}
                className="px-5 py-2 rounded-xl btn-tactile bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition"
              >
                Understood, Resume Mission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
