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
  const [helperCardTargetModal, setHelperCardTargetModal] = useState<string | null>(null);

  // Safe X-Ray Probe Helper Card State
  const [xrayModalOpen, setXrayModalOpen] = useState(false);
  const [xrayTargetPlayerId, setXrayTargetPlayerId] = useState<string>('');
  const [xrayTargetWireId, setXrayTargetWireId] = useState<string>('');
  const [xrayCardId, setXrayCardId] = useState<string>('helper_probe');

  // Auto Bot Turn Runner: Host triggers the server-side bot AI so bot secret wire values remain 100% hidden
  useEffect(() => {
    if (state.phase !== 'in_progress' && state.phase !== 'initial_clue') return;
    if (!state.currentTurnPlayerId || !state.currentTurnPlayerId.startsWith('bot_')) return;
    if (!isHost) return;

    const botId = state.currentTurnPlayerId;
    const timer = setTimeout(() => {
      onAction({ type: 'BOT_AUTO_TURN', botId } as any);
      soundFX.playClick();
    }, 1200);

    return () => clearTimeout(timer);
  }, [state.currentTurnPlayerId, state.phase, isHost, onAction]);

  // Audio triggers: match sound on cut, alert sound on miss
  const prevHistoryLenRef = React.useRef(state.history.length);
  useEffect(() => {
    if (state.history.length > prevHistoryLenRef.current) {
      const latest = state.history[state.history.length - 1];
      if (latest?.type === 'success') {
        soundFX.playWireSnip();
      } else if (latest?.type === 'error' || latest?.type === 'boom') {
        soundFX.playAlarm();
      }
    }
    prevHistoryLenRef.current = state.history.length;
  }, [state.history]);

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
  const myHasPlacedClue = myStand.some((w) => w.infoToken !== null);
  const hasOnlyRedWires = myUncutWires.length > 0 && myUncutWires.every((w) => w.color === 'red');
  const canUseDoubleDetector = !(state.doubleDetectorUsed && state.doubleDetectorUsed[currentPlayerId]);

  const progressPercent = Math.round((state.cutWiresCount / state.totalWiresToCut) * 100);


  const getWireColor = (value: WireValue | null, color?: string) => {
    if (value === 'RED' || color === 'red') {
      return {
        name: 'RED DANGER',
        bg: 'bg-rose-700',
        text: 'text-white',
        border: 'border-rose-500',
        wire: '#dc2626',
        accent: 'from-rose-600 to-rose-800',
      };
    }
    if (color === 'yellow' || (typeof value === 'number' && !Number.isInteger(value))) {
      return {
        name: 'YELLOW DECIMAL',
        bg: 'bg-amber-400',
        text: 'text-stone-950 font-black',
        border: 'border-amber-500',
        wire: '#f59e0b',
        accent: 'from-amber-300 to-amber-500',
      };
    }
    // Authentic Bomb Busters: All regular number wires 1-12 are Cobalt Blue
    return {
      name: 'Cobalt Blue',
      bg: 'bg-blue-600',
      text: 'text-white',
      border: 'border-blue-400',
      wire: '#2563eb',
      accent: 'from-blue-600 to-blue-700',
    };
  };

  const handlePlaceAdjacentToken = (leftWireId: string, tokenType: '=' | '≠') => {
    soundFX.playClick();
    onAction({
      type: 'PLACE_ADJACENT_TOKEN',
      leftWireId,
      tokenType,
    });
  };

  // Duo Cut handler
  const handleDuoSnip = () => {
    if (selectedMyWireIds.length !== 1 || !targetSelection) return;

    onAction({
      type: 'CUT_WIRE',
      myWireId: selectedMyWireIds[0],
      targetPlayerId: targetSelection.playerId,
      targetWireId: targetSelection.wireId,
    });

    setSelectedMyWireIds([]);
    setTargetSelection(null);
  };

  // Solo Cut handler (cuts matching wires on own rack when holding all remaining copies)
  const handleSoloCut = () => {
    if (selectedMyWireIds.length !== 2 && selectedMyWireIds.length !== 4) return;
    soundFX.playWireSnip();

    onAction({
      type: 'SOLO_CUT',
      wireId1: selectedMyWireIds[0],
      wireId2: selectedMyWireIds[1],
      wireId3: selectedMyWireIds[2],
      wireId4: selectedMyWireIds[3],
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

  const handleUseHelperCard = (
    cardId: string,
    explicitTargetWireId?: string,
    explicitTargetPlayerId?: string
  ) => {
    const card = state.helperCards?.find((c) => c.id === cardId);
    let targetWireId = explicitTargetWireId;
    let targetPlayerId = explicitTargetPlayerId;

    if (card?.effect === 'EXTRA_INFO_TOKEN') {
      if (!targetWireId) {
        if (selectedMyWireIds.length === 1) {
          targetWireId = selectedMyWireIds[0];
        } else {
          setHelperCardTargetModal(cardId);
          return;
        }
      }
    } else if (card?.effect === 'PEEK_WIRE') {
      if (!targetWireId || !targetPlayerId) {
        if (targetSelection) {
          targetPlayerId = targetSelection.playerId;
          targetWireId = targetSelection.wireId;
        } else {
          const firstOther = players.find((p) => p.id !== currentPlayerId);
          setXrayTargetPlayerId(firstOther?.id || '');
          setXrayTargetWireId('');
          setXrayCardId(cardId);
          setXrayModalOpen(true);
          return;
        }
      }
    }

    soundFX.playClick();
    onAction({
      type: 'USE_HELPER_CARD',
      cardId,
      targetWireId,
      targetPlayerId,
    });
    setHelperCardTargetModal(null);
    setXrayModalOpen(false);
    setSelectedMyWireIds([]);
    setTargetSelection(null);
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
      const clickedWire = myStand.find((w) => w.id === wireId);
      const firstSelected = prev.length > 0 ? myStand.find((w) => w.id === prev[0]) : null;

      // If selecting multiple wires for Solo Cut, check if they share the exact same value
      if (firstSelected && clickedWire && firstSelected.value === clickedWire.value && prev.length < 4) {
        return [...prev, wireId];
      }

      // Otherwise switch selection to newly clicked wire
      return [wireId];
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* LUXURY PHYSICAL TABLETOP FELT */}
      <div className="tabletop-felt rounded-[32px] sm:rounded-[40px] p-4 sm:p-6 space-y-4 relative overflow-hidden shadow-2xl">
        {/* Table Top Controls & Tactical Mission Post-It Memo */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-950/40 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl p-2 bg-amber-950/40 rounded-2xl border border-amber-900/40 shadow-inner">
              💣
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300 uppercase">
                  Mission #{state.missionId || 1}
                </span>
                <h2 className="text-base sm:text-lg font-black text-amber-100 tracking-wide font-serif">
                  {state.missionName || 'Bomb Busters Tabletop'}
                </h2>
              </div>
              <p className="text-xs text-amber-300/70 font-sans line-clamp-1 max-w-sm mt-0.5">
                {state.missionBriefing || 'Cooperative Wire-Defusal Operation'}
              </p>
            </div>
          </div>

          {/* TACTICAL MISSION POST-IT MEMO (โน้ตภารกิจ / สเปกสายไฟ) */}
          <div className="relative bg-gradient-to-br from-amber-100 via-yellow-100 to-amber-200 text-stone-900 rounded-xl p-2.5 shadow-xl border-2 border-amber-300/80 -rotate-1 shrink-0 font-sans select-none min-w-[190px]">
            <div className="w-8 h-1.5 bg-amber-400/60 rounded-sm mx-auto mb-1 opacity-70" />
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-950 border-b border-amber-300 pb-0.5 flex items-center justify-between">
              <span>📌 MISSION DOSSIER</span>
              <span className="text-[9px] font-mono font-bold bg-amber-300/60 px-1 rounded">#{state.missionId || 1}</span>
            </div>
            <div className="mt-1 space-y-0.5 text-[10px] font-mono font-bold">
              <div className="flex justify-between text-blue-900">
                <span>🔵 Normal (Blue):</span>
                <span>{state.blueCount ?? 48}</span>
              </div>
              <div className="flex justify-between text-amber-900">
                <span>🟡 Decimals (.1):</span>
                <span>{state.yellowCount ?? 0}</span>
              </div>
              <div className="flex justify-between text-rose-900">
                <span>🔴 Traps (.5 Red):</span>
                <span>{state.redCount ?? 0}</span>
              </div>
              <div className="pt-0.5 border-t border-amber-300 flex justify-between text-stone-950 font-black text-[10px]">
                <span>DEFUSE GOAL:</span>
                <span>{state.totalWiresToCut} wires</span>
              </div>
            </div>
          </div>

          {/* Current Turn Badge */}
          <div className="px-3.5 py-1.5 rounded-2xl bg-black/40 border border-amber-900/40 text-xs sm:text-sm font-semibold shadow-inner">
            {isMyTurn ? (
              <span className="text-amber-300 font-black animate-pulse flex items-center gap-2">
                <Scissors className="w-4 h-4 text-rose-400" />
                <span>YOUR TURN: Duo Cut with a teammate, or Solo Cut!</span>
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
              className="p-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-900/50 transition shadow-md flex items-center gap-1.5 text-xs font-bold"
              title="Bomb Disposal Field Manual & Rules"
            >
              <span>📖</span>
              <span className="hidden sm:inline">Manual</span>
            </button>
            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-200 border border-amber-900/50 transition shadow-md"
              title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            </button>
            <button
              onClick={onReturnToLobby}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-amber-950/50 hover:bg-amber-900/70 text-amber-100 border border-amber-800/60 transition shadow-md"
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
                    <div className="rack-groove rounded-xl p-2 flex flex-wrap gap-1.5 justify-center min-h-[96px] items-end pb-2.5">
                      {stand.map((wire, idx) => {
                        const isCut = wire.isCut;
                        const teammateId = teammate.id;
                        const isTargeted =
                          targetSelection?.playerId === teammateId &&
                          targetSelection?.wireId === wire.id;
                        const wireCol = getWireColor(wire.value, wire.color);
                        const hasInfoToken = wire.infoToken != null;
                        const hasAdjacentToken = wire.adjacentToken != null;

                        return (
                          <React.Fragment key={wire.id}>
                            <div
                              onClick={() => {
                                if (!isCut && isMyTurn && state.phase === 'in_progress') {
                                  soundFX.playTileClack();
                                  setTargetSelection(
                                    isTargeted
                                      ? null
                                      : {
                                          playerId: teammateId,
                                          wireId: wire.id,
                                          slotIndex: idx,
                                        }
                                  );
                                }
                              }}
                              className={`relative w-11 h-18 sm:w-12 sm:h-20 rounded-lg flex flex-col items-center justify-between p-1 select-none transition-all cursor-pointer ${
                                isCut
                                  ? 'tile-cut'
                                  : isTargeted
                                  ? 'chunky-tile -translate-y-2 ring-4 ring-cyan-400 shadow-2xl scale-105'
                                  : isMyTurn
                                  ? 'chunky-tile hover:-translate-y-1 hover:ring-2 hover:ring-cyan-300/60'
                                  : 'chunky-tile'
                              }`}
                            >
                              {/* Insulated Wire Header Cord on Tile */}
                              <div className="w-full flex items-center justify-between px-0.5">
                                <span className="text-[7px] font-mono font-black text-slate-500">
                                  #{idx + 1}
                                </span>
                                <div
                                  className="w-2.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: isCut ? '#475569' : hasInfoToken ? wireCol.wire : '#475569' }}
                                />
                              </div>

                              {/* Center Value / Unknown Glyph / Info Token Value */}
                              <div className="my-auto text-center">
                                {isCut ? (
                                  <span className="font-mono text-sm sm:text-base font-black text-slate-400 line-through">
                                    {wire.value}
                                  </span>
                                ) : wire.infoToken === 'YELLOW' ? (
                                  <div className="flex flex-col items-center leading-none">
                                    <span className="font-mono text-xs font-black text-amber-300 drop-shadow">
                                      🟡 YELLOW
                                    </span>
                                    <span className="text-[7px] font-mono font-bold text-amber-400 uppercase tracking-tighter">
                                      COLOR CLUE
                                    </span>
                                  </div>
                                ) : wire.infoToken === 'RED' ? (
                                  <div className="flex flex-col items-center leading-none">
                                    <span className="font-mono text-xs font-black text-rose-400 drop-shadow">
                                      🚨 RED
                                    </span>
                                    <span className="text-[7px] font-mono font-bold text-rose-400 uppercase tracking-tighter">
                                      DANGER CLUE
                                    </span>
                                  </div>
                                ) : hasInfoToken ? (
                                  <div className="flex flex-col items-center leading-none">
                                    <span className="font-mono text-base font-black text-amber-300 drop-shadow">
                                      #{wire.infoToken}
                                    </span>
                                    <span className="text-[7px] font-mono font-bold text-amber-400 uppercase tracking-tighter">
                                      NUMBER CLUE 💡
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-serif text-lg font-black text-slate-500/70">
                                    ?
                                  </span>
                                )}
                              </div>

                              {/* Clues / Sticky Notes Attached to Tile */}
                              <div className="w-full flex flex-wrap justify-center gap-0.5 min-h-[12px]">
                                {isCut ? (
                                  <span className="text-[7px] font-black text-emerald-500 uppercase">
                                    CUT ✓
                                  </span>
                                ) : (
                                  wire.clues.slice(-1).map((c, cIdx) => (
                                    <span
                                      key={cIdx}
                                      className="text-[7px] font-mono font-black px-1 rounded shadow-sm bg-amber-100 text-amber-900 border border-amber-300 truncate max-w-full"
                                    >
                                      {c}
                                    </span>
                                  ))
                                )}
                              </div>

                              {/* OFFICIAL INFO TOKEN BADGE PINNED AT BASE OF TILE */}
                              {hasInfoToken && !isCut && (
                                <div
                                  className={`absolute -bottom-2 z-20 px-1.5 py-0.2 rounded-full border shadow-lg flex items-center justify-center font-mono text-[8px] font-black ${
                                    wire.infoToken === 'YELLOW'
                                      ? 'bg-amber-400 text-stone-950 border-amber-600'
                                      : wire.infoToken === 'RED'
                                      ? 'bg-rose-700 text-white border-rose-900'
                                      : 'bg-amber-200 text-amber-950 border-amber-600'
                                  }`}
                                >
                                  {wire.infoToken === 'YELLOW' ? '🟡 YEL' : wire.infoToken === 'RED' ? '🚨 RED' : `#${wire.infoToken}`}
                                </div>
                              )}
                            </div>

                            {/* Adjacent Deduction Token between Teammate Tiles */}
                            {idx < stand.length - 1 && hasAdjacentToken && (
                              <div
                                className="flex items-center justify-center self-center z-10 -mx-1"
                                title={`Operative Deduction: ${wire.adjacentToken === '=' ? 'Equal (=)' : 'Not Equal (≠)'}`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shadow-md border ${
                                    wire.adjacentToken === '='
                                      ? 'bg-amber-400 text-stone-950 border-amber-600'
                                      : 'bg-rose-700 text-white border-rose-900'
                                  }`}
                                >
                                  {wire.adjacentToken}
                                </span>
                              </div>
                            )}
                          </React.Fragment>
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

          {/* INITIAL CLUE SETUP PHASE BANNER (ช่วงวางโทเคนใบ้เริ่มต้น) */}
          {state.phase === 'initial_clue' && (
            <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl shadow-amber-950/40">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-amber-500/25 rounded-2xl border border-amber-500/50 shrink-0">
                  <Sparkles className="w-7 h-7 text-amber-300 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-black text-amber-300 uppercase tracking-widest bg-amber-950/70 px-2.5 py-0.5 rounded-full border border-amber-600/50">
                      PHASE 1: INITIAL CLUE DEPLOYMENT
                    </span>
                    <span className="text-[10px] text-amber-200 font-mono font-bold bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                      {players.filter((p) => (state.stands[p.id] || []).some((w) => w.infoToken != null)).length} / {players.length} Operatives Ready
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {!myHasPlacedClue ? (
                      <span className="text-amber-200 animate-pulse">
                        👉 Choose your starting clue! Click &quot;💡 START CLUE&quot; on any wire on your stand below (Blue wire reveals Number, Decimal wire reveals Color).
                      </span>
                    ) : (
                      <span className="text-slate-300">
                        ⏳ Starting clue deployed! Waiting for remaining operatives to choose theirs...
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Official Rule: Each operative places 1 Info Token on a wire (reveals Number for blue wires, or Color for decimal yellow/red wires) to give the squad an opening clue before defusal begins.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* LATEST ACTION RESULT ALERT BANNER */}
          {state.history.length > 0 && (() => {
            const latest = state.history[state.history.length - 1];
            if (!latest || latest.id === 'start' || latest.id === 'clue_phase') return null;
            return (
              <div
                className={`rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold border shadow-xl transition-all ${
                  latest.type === 'success'
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200 shadow-emerald-950/40'
                    : latest.type === 'error' || latest.type === 'boom'
                    ? 'bg-rose-950/80 border-rose-500/70 text-rose-200 shadow-rose-950/50'
                    : 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">
                    {latest.type === 'success' ? '✂️' : latest.type === 'error' || latest.type === 'boom' ? '⚠️' : '💡'}
                  </span>
                  <span>{latest.text}</span>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 shrink-0 px-2 py-0.5 rounded bg-black/40 border border-slate-700">
                  Last Action
                </span>
              </div>
            );
          })()}
          {/* OFFICIAL CIRCUIT VALIDATION TRACK WITH YELLOW & RED DECIMAL PEGS (Matching Picture 3) */}
          <div className="bg-black/60 border border-slate-700/80 rounded-2xl p-3.5 space-y-2 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-bold">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Circuit Validation Track & Wire Markers:</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                {state.yellowDecimals && state.yellowDecimals.length > 0 && (
                  <span className="flex items-center gap-1 text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-sm" />
                    Yellow Pegs: {state.yellowDecimals.map((d) => `${d}`).join(', ')}
                  </span>
                )}
                {state.redDecimals && state.redDecimals.length > 0 && (
                  <span className="flex items-center gap-1 text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-600 inline-block shadow-sm animate-pulse" />
                    Red Traps: {state.redDecimals.map((d) => `${d}`).join(', ')}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {Array.from({ length: state.numberRange || 12 }, (_, i) => i + 1).map((num) => {
                const track = state.validationTrack?.[num];
                const hasYellow = state.yellowDecimals?.some((d) => Math.floor(d) === num);
                const yellowVal = state.yellowDecimals?.find((d) => Math.floor(d) === num);
                const hasRed = state.redDecimals?.some((d) => Math.floor(d) === num);
                const redVal = state.redDecimals?.find((d) => Math.floor(d) === num);

                return (
                  <div
                    key={num}
                    className={`relative rounded-xl border p-1.5 flex flex-col items-center justify-between min-h-[58px] transition ${
                      track?.isValidated
                        ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-300 shadow-sm'
                        : track && track.cut > 0
                        ? 'bg-blue-950/60 border-blue-500/60 text-blue-300'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full px-0.5">
                      <span className="font-mono text-xs font-black">#{num}</span>
                      <span className="text-[9px] font-mono font-bold">
                        {track?.isValidated ? '✓' : track ? `${track.cut}/${track.total}` : ''}
                      </span>
                    </div>

                    {/* Peg slots on the circuit track */}
                    <div className="flex items-center gap-1 mt-1">
                      {hasYellow && (
                        <span
                          className="px-1 py-0.2 rounded bg-amber-400 text-stone-950 font-mono font-black text-[8px] shadow border border-amber-600"
                          title={`Yellow Decimal Wire in Mission: ${yellowVal}`}
                        >
                          .{yellowVal?.toString().split('.')[1] || '1'}
                        </span>
                      )}
                      {hasRed && (
                        <span
                          className="px-1 py-0.2 rounded bg-rose-600 text-white font-mono font-black text-[8px] shadow border border-rose-800 animate-pulse"
                          title={`Red Hazard Wire in Mission: ${redVal}`}
                        >
                          .{redVal?.toString().split('.')[1] || '5'}
                        </span>
                      )}
                      {!hasYellow && !hasRed && (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-800 border border-slate-700 inline-block opacity-40" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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
                {state.phase === 'initial_clue'
                  ? 'Setup Phase: Click a token (Blue, Yellow, or Red) to place your opening clue on your stand'
                  : 'Tokens in play: Placed automatically on racks when a cut misses'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: state.numberRange || 12 }, (_, i) => i + 1).map((val) => {
                const uncluedTile = myStand.find(
                  (w) => !w.isCut && w.value === val && w.infoToken == null && w.color === 'blue'
                );
                const canUseThisToken = state.phase === 'initial_clue' && !myHasPlacedClue && Boolean(uncluedTile);

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
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 hover:bg-amber-400 hover:text-slate-950 cursor-pointer shadow-amber-900/40 scale-100 hover:scale-105 active:scale-95 animate-pulse'
                        : 'bg-slate-900/80 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                    }`}
                    title={
                      canUseThisToken
                        ? `Place opening Info Token #${val} on your rack wire`
                        : `Info Token #${val}`
                    }
                  >
                    <span>#{val}</span>
                    {canUseThisToken && <span className="text-[10px]">💡</span>}
                  </button>
                );
              })}

              {/* Yellow Decimal Token Option */}
              {Boolean(state.yellowCount && state.yellowCount > 0) && (() => {
                const uncluedYellow = myStand.find(
                  (w) => !w.isCut && w.color === 'yellow' && w.infoToken == null
                );
                const canUseYellow = state.phase === 'initial_clue' && !myHasPlacedClue && Boolean(uncluedYellow);
                return (
                  <button
                    type="button"
                    disabled={!canUseYellow}
                    onClick={() => {
                      if (uncluedYellow) handlePlaceInfoToken(uncluedYellow.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black transition flex items-center gap-1.5 border shadow-sm ${
                      canUseYellow
                        ? 'bg-amber-400 text-stone-950 border-amber-500 hover:bg-amber-300 cursor-pointer shadow-amber-900/40 hover:scale-105 active:scale-95 animate-pulse'
                        : 'bg-slate-900/80 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                    }`}
                    title={canUseYellow ? 'Place Yellow Decimal Clue Token' : 'Yellow Clue Token (.1)'}
                  >
                    <span>🟡</span>
                    <span>Yellow Clue (.1)</span>
                    {canUseYellow && <span className="text-[10px]">💡</span>}
                  </button>
                );
              })()}

              {/* Red Hazard Clue Token Option */}
              {Boolean(state.redCount && state.redCount > 0) && (() => {
                const uncluedRed = myStand.find(
                  (w) => !w.isCut && w.color === 'red' && w.infoToken == null
                );
                const canUseRed = state.phase === 'initial_clue' && !myHasPlacedClue && Boolean(uncluedRed);
                return (
                  <button
                    type="button"
                    disabled={!canUseRed}
                    onClick={() => {
                      if (uncluedRed) handlePlaceInfoToken(uncluedRed.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black transition flex items-center gap-1.5 border shadow-sm ${
                      canUseRed
                        ? 'bg-rose-700 text-white border-rose-500 hover:bg-rose-600 cursor-pointer shadow-rose-950/40 hover:scale-105 active:scale-95 animate-pulse'
                        : 'bg-slate-900/80 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                    }`}
                    title={canUseRed ? 'Place Red Hazard Clue Marker' : 'Red Hazard Marker (.5)'}
                  >
                    <span>🚨</span>
                    <span>Red Danger (.5)</span>
                    {canUseRed && <span className="text-[10px]">💡</span>}
                  </button>
                );
              })()}
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
          {isMyTurn && state.phase === 'in_progress' && (
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
                          {selectedMyWires.length === 4 ? 'All 4x' : 'Pair'} #{selectedMyWires[0].value}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">
                        {selectedMyWires.length === 4
                          ? `You hold all 4 wires of #${selectedMyWires[0].value}! You can cut all 4 simultaneously!`
                          : `You selected 2 identical wires on your rack. You can Solo Cut them directly without asking a teammate!`}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSoloCut}
                    className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 transform active:scale-95"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>EXECUTE SOLO CUT ({selectedMyWires.length} WIRES)! ✂️</span>
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
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WAITING FOR TEAMMATE TURN INDICATOR (Prevents feeling 'frozen') */}
          {!isMyTurn && state.phase === 'in_progress' && (
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3">
                <span className="text-2xl animate-spin">⏳</span>
                <div>
                  <div className="font-bold text-amber-300 text-sm flex items-center gap-2">
                    <span>OPERATIVE {currentTurnPlayer?.name || 'TEAMMATE'} IS CUTTING WIRES</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 animate-pulse">
                      Analyzing Squad Racks...
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Stand by while your squad member executes a Duo Cut or Solo Cut.
                  </div>
                </div>
              </div>
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

          {/* Recessed Mahogany Rack Groove with Standing Resin Tiles & Adjacent Deduction Pins */}
          <div className="rack-groove rounded-2xl p-3 sm:p-4 flex flex-wrap gap-2 sm:gap-2.5 items-end justify-center min-h-[130px] pb-3.5">
            {myStand.map((wire, idx) => {
              const isSelected = selectedMyWireIds.includes(wire.id);
              const isCut = wire.isCut;
              const isRed = wire.value === 'RED' || wire.color === 'red';
              const isYellow = wire.color === 'yellow';
              const wireCol = getWireColor(wire.value, wire.color);
              const hasInfoToken = wire.infoToken != null;

              // Authentic High-Contrast Tile Styling
              let tileTheme = 'bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 border-2 border-blue-400 text-white shadow-blue-950/40';
              let textTheme = 'text-white font-black';

              if (isCut) {
                tileTheme = 'bg-slate-800/80 border-2 border-slate-700 text-slate-500 line-through opacity-50';
                textTheme = 'text-slate-500 line-through';
              } else if (isYellow) {
                // Vibrant Amber tile with Deep Black text for Maximum Legibility
                tileTheme = 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 border-2 border-amber-500 text-stone-950 shadow-amber-950/40';
                textTheme = 'text-stone-950 font-black drop-shadow-none';
              } else if (isRed) {
                tileTheme = 'bg-gradient-to-b from-rose-700 via-rose-800 to-rose-900 border-2 border-rose-500 text-white shadow-rose-950/40';
                textTheme = 'text-white font-black animate-pulse';
              }

              return (
                <React.Fragment key={wire.id}>
                  <div
                    onClick={() => {
                      if (!isCut && isMyTurn) {
                        toggleMyWireSelection(wire.id);
                      }
                    }}
                    className={`relative w-13 h-24 sm:w-16 sm:h-28 rounded-xl flex flex-col justify-between p-1.5 select-none cursor-pointer transition-all shadow-lg ${tileTheme} ${
                      isCut
                        ? 'tile-cut'
                        : isSelected
                        ? '-translate-y-3 ring-4 ring-amber-300 shadow-2xl scale-105'
                        : isMyTurn
                        ? 'hover:-translate-y-1.5 hover:ring-2 hover:ring-amber-300/60'
                        : ''
                    }`}
                  >
                    {/* Top Insulated Cable Wire on Tile */}
                    <div className="w-full flex items-center justify-between px-0.5">
                      <span className={`text-[8px] font-mono font-black ${isYellow ? 'text-amber-950/70' : 'text-slate-300'}`}>
                        #{idx + 1}
                      </span>
                      <div
                        className="w-3.5 h-1.5 rounded-full border border-black/20"
                        style={{ backgroundColor: isCut ? '#475569' : wireCol.wire }}
                      />
                    </div>

                    {/* Wire Big Value Embossed on Tile */}
                    <div className="text-center my-auto">
                      <div className={`text-xl sm:text-2xl font-mono font-black tracking-tight ${textTheme}`}>
                        {wire.value}
                      </div>
                      {isRed && !isCut && (
                        <div className="text-[7px] font-black uppercase text-rose-200 tracking-wider">
                          DANGER RED
                        </div>
                      )}
                      {isYellow && !isCut && (
                        <div className="text-[7px] font-black uppercase text-amber-950 tracking-wider">
                          YELLOW .1
                        </div>
                      )}
                    </div>

                    {/* Bottom Tile Status */}
                    <div className="w-full flex justify-center">
                      {isCut ? (
                        <span className="text-[8px] uppercase font-black text-slate-400">
                          CUT ✓
                        </span>
                      ) : (
                        <div
                          className="w-2 h-2 rounded-full border border-black/20"
                          style={{ backgroundColor: isYellow ? '#78350f' : isRed ? '#fecdd3' : '#93c5fd' }}
                        />
                      )}
                    </div>

                    {/* INFO TOKEN PINNED AT BASE OF TILE OR CLUE BUTTON */}
                    {hasInfoToken && !isCut ? (
                      <div
                        className={`absolute -bottom-2.5 z-20 px-2 py-0.5 rounded-full border-2 shadow-lg flex items-center justify-center font-mono text-[8px] font-black ${
                          wire.infoToken === 'YELLOW'
                            ? 'bg-amber-400 text-stone-950 border-amber-700'
                            : wire.infoToken === 'RED'
                            ? 'bg-rose-700 text-white border-rose-950'
                            : 'bg-amber-200 text-amber-950 border-amber-600'
                        }`}
                      >
                        {wire.infoToken === 'YELLOW' ? '🟡 YELLOW' : wire.infoToken === 'RED' ? '🚨 RED' : `#${wire.infoToken}`}
                      </div>
                    ) : !isCut && state.phase === 'initial_clue' && !myHasPlacedClue ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaceInfoToken(wire.id);
                        }}
                        className={`absolute -bottom-3.5 z-30 px-2 py-0.5 rounded-full font-black text-[8px] whitespace-nowrap shadow-xl border tracking-tight flex items-center gap-1 transition cursor-pointer active:scale-95 animate-bounce ${
                          wire.color === 'yellow'
                            ? 'bg-amber-300 hover:bg-amber-200 text-stone-950 border-amber-600 ring-2 ring-amber-400/50 shadow-amber-900/60'
                            : wire.color === 'red'
                            ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-900 ring-2 ring-rose-500/50 shadow-rose-950/70'
                            : 'bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 border-amber-500 ring-2 ring-amber-400/50 shadow-amber-500/50'
                        }`}
                        title={
                          wire.color === 'yellow'
                            ? 'Start Clue: Reveals that this wire is YELLOW (Color) to squad'
                            : wire.color === 'red'
                            ? 'Start Clue: Reveals that this wire is RED (Color) to squad'
                            : `Start Clue: Reveals Number #${wire.value} to squad`
                        }
                      >
                        <span className="text-[9px]">💡</span>
                        <span className="font-extrabold uppercase">
                          {wire.color === 'yellow'
                            ? 'CLUE: YELLOW'
                            : wire.color === 'red'
                            ? 'CLUE: RED'
                            : `START CLUE #${wire.value}`}
                        </span>
                      </button>
                    ) : null}
                  </div>

                  {/* ADJACENT DEDUCTION TOKEN SLOT (Between wire idx and idx + 1) */}
                  {idx < myStand.length - 1 && (
                    <div className="flex flex-col items-center justify-center self-center z-10 -mx-1 select-none">
                      {wire.adjacentToken ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaceAdjacentToken(wire.id, wire.adjacentToken!);
                          }}
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-black text-[10px] shadow-md border transition cursor-pointer hover:scale-110 active:scale-95 ${
                            wire.adjacentToken === '='
                              ? 'bg-amber-400 text-stone-950 border-amber-600 shadow-amber-900/40'
                              : 'bg-rose-700 text-white border-rose-900 shadow-rose-950/40'
                          }`}
                          title={`Adjacent deduction: ${wire.adjacentToken === '=' ? 'Equal (=)' : 'Not Equal (≠)'}. Click to clear.`}
                        >
                          {wire.adjacentToken}
                        </button>
                      ) : !wire.isCut && !myStand[idx + 1].isCut ? (
                        <div className="flex flex-col gap-0.5 opacity-30 hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaceAdjacentToken(wire.id, '=');
                            }}
                            className="w-4 h-3.5 rounded bg-amber-950/80 hover:bg-amber-400 hover:text-stone-950 text-amber-300 text-[8px] font-black border border-amber-600/50 transition flex items-center justify-center shadow"
                            title="Pin Equal (=) deduction token"
                          >
                            =
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaceAdjacentToken(wire.id, '≠');
                            }}
                            className="w-4 h-3.5 rounded bg-rose-950/80 hover:bg-rose-600 hover:text-white text-rose-300 text-[8px] font-black border border-rose-600/50 transition flex items-center justify-center shadow"
                            title="Pin Not-Equal (≠) deduction token"
                          >
                            ≠
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </React.Fragment>
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
                    const fullStand = state.stands[ddTargetPlayerId] || [];
                    const uncutWires = fullStand.filter((w) => !w.isCut);
                    if (uncutWires.length === 0) {
                      return <span className="text-xs text-zinc-500">No uncut wires remaining</span>;
                    }
                    return uncutWires.map((wire, idx) => {
                      const isSelected = wire.id === ddWireId1 || wire.id === ddWireId2;
                      const boardSlotIndex = fullStand.findIndex((w) => w.id === wire.id);
                      const boardSlotNumber = boardSlotIndex !== -1 ? boardSlotIndex + 1 : idx + 1;

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
                          className={`w-11 h-16 rounded-xl border flex flex-col items-center justify-between p-1 font-mono text-xs font-bold transition ${
                            isSelected
                              ? 'bg-purple-600 border-purple-300 text-white shadow-lg shadow-purple-900/50 scale-105'
                              : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
                          }`}
                        >
                          <span className="text-[8px] text-zinc-400">#{boardSlotNumber}</span>
                          <span className="text-sm font-black">
                            {wire.infoToken === 'YELLOW'
                              ? '🟡 .1'
                              : wire.infoToken === 'RED'
                              ? '🚨 .5'
                              : wire.infoToken != null
                              ? `#${wire.infoToken}`
                              : '?'}
                          </span>
                          <span className="text-[7px] text-zinc-500 uppercase">
                            {wire.infoToken ? 'Clue' : 'Hidden'}
                          </span>
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
                  {Array.from({ length: state.numberRange || 12 }, (_, i) => i + 1).map((val) => {
                    const track = state.validationTrack?.[val];
                    const remaining = track ? track.total - track.cut : null;
                    const isAllCut = track?.isValidated;
                    return (
                      <option key={val} value={val} disabled={isAllCut}>
                        #{val} {isAllCut ? '(All Cut ✓)' : remaining != null ? `(${remaining} remaining)` : ''}
                      </option>
                    );
                  })}
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

      {/* HELPER CARD: SELECT WIRE MODAL FOR EXTRA INFO TOKEN */}
      {helperCardTargetModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111215] border border-indigo-500/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222429] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💡</span>
                <h3 className="text-sm sm:text-base font-bold text-indigo-200">
                  Select Wire for Extra Info Token
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHelperCardTargetModal(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-300">
              Click an uncut wire on your stand to place your Tactical Info Relay token on it:
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center p-3 bg-black/40 rounded-xl border border-zinc-800">
              {myStand.filter((w) => !w.isCut).map((wire, idx) => {
                const isYellow = wire.color === 'yellow';
                const isRed = wire.color === 'red';
                const fullMyStand = state.stands[currentPlayerId] || [];
                const boardSlotIndex = fullMyStand.findIndex((w) => w.id === wire.id);
                const boardSlotNumber = boardSlotIndex !== -1 ? boardSlotIndex + 1 : idx + 1;
                return (
                  <button
                    key={wire.id}
                    type="button"
                    onClick={() => handleUseHelperCard(helperCardTargetModal, wire.id)}
                    className={`w-14 h-20 rounded-xl border flex flex-col items-center justify-between p-2 transition font-mono active:scale-95 cursor-pointer shadow-lg ${
                      isYellow
                        ? 'bg-amber-400 border-amber-600 text-stone-950 hover:bg-amber-300'
                        : isRed
                        ? 'bg-rose-700 border-rose-500 text-white hover:bg-rose-600'
                        : 'bg-blue-600 border-blue-400 text-white hover:bg-blue-500'
                    }`}
                  >
                    <span className="text-[9px] opacity-80">#{boardSlotNumber}</span>
                    <span className="text-base font-black">
                      {isYellow ? `${wire.value}` : isRed ? `${wire.value}` : `#${wire.value}`}
                    </span>
                    <span className="text-[8px] font-bold uppercase">
                      {isYellow ? 'Yellow' : isRed ? 'Danger' : 'Select'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* HELPER CARD: SAFE X-RAY PROBE MODAL */}
      {xrayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111215] border border-cyan-500/50 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222429] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                <div>
                  <h3 className="text-sm font-bold text-white">Safe X-Ray Probe (เอกซเรย์ส่องตรวจ)</h3>
                  <div className="text-[10px] text-cyan-400">Safely inspect 1 teammate wire with zero explosion risk!</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setXrayModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#18191e] hover:bg-[#22242a] text-zinc-400 hover:text-white border border-[#272930] transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* 1. Select Teammate */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">1. Select Teammate to Scan:</label>
                <select
                  value={xrayTargetPlayerId}
                  onChange={(e) => {
                    setXrayTargetPlayerId(e.target.value);
                    setXrayTargetWireId('');
                  }}
                  className="w-full bg-[#141518] border border-[#272930] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
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

              {/* 2. Select Wire to Scan */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">2. Select Wire on Stand (Actual Slot #):</label>
                  <span className="text-[10px] text-cyan-400">
                    {xrayTargetWireId ? '✓ Wire selected' : 'Click a wire to scan'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 p-3 bg-black/40 rounded-xl border border-zinc-800 justify-center min-h-[90px]">
                  {(() => {
                    const fullStand = state.stands[xrayTargetPlayerId] || [];
                    const uncutWires = fullStand.filter((w) => !w.isCut);
                    if (uncutWires.length === 0) {
                      return <span className="text-xs text-zinc-500 self-center">No uncut wires remaining</span>;
                    }
                    return uncutWires.map((wire, idx) => {
                      const isSelected = wire.id === xrayTargetWireId;
                      const boardSlotIndex = fullStand.findIndex((w) => w.id === wire.id);
                      const boardSlotNumber = boardSlotIndex !== -1 ? boardSlotIndex + 1 : idx + 1;

                      return (
                        <button
                          key={wire.id}
                          type="button"
                          onClick={() => setXrayTargetWireId(wire.id)}
                          className={`w-11 h-16 rounded-xl border flex flex-col items-center justify-between p-1.5 transition font-mono cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-600 border-cyan-300 text-white shadow-lg shadow-cyan-900/60 scale-105'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-cyan-400 hover:text-white'
                          }`}
                        >
                          <span className="text-[8px] opacity-70">#{boardSlotNumber}</span>
                          <span className="text-xs font-black">
                            {wire.infoToken === 'YELLOW'
                              ? '🟡 .1'
                              : wire.infoToken === 'RED'
                              ? '🚨 .5'
                              : wire.infoToken != null
                              ? `#${wire.infoToken}`
                              : '?'}
                          </span>
                          <span className="text-[7px] uppercase font-bold text-cyan-300">
                            {isSelected ? 'Ready' : wire.infoToken ? 'Clued' : 'Scan'}
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="p-2.5 bg-cyan-950/30 border border-cyan-900/50 rounded-xl text-[10px] text-cyan-300 space-y-1">
                <div>• <strong>100% Safe:</strong> If wire is Red danger, it reveals the trap WITHOUT exploding! 🚨</div>
                <div>• <strong>Team Info Token:</strong> Automatically places an Info Token on this wire for the whole squad! 💡</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[#222429]">
              <button
                type="button"
                onClick={() => setXrayModalOpen(false)}
                className="px-4 py-2 bg-[#18191e] hover:bg-[#22242a] text-zinc-300 border border-[#272930] rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!xrayTargetPlayerId || !xrayTargetWireId}
                onClick={() => handleUseHelperCard(xrayCardId, xrayTargetWireId, xrayTargetPlayerId)}
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-40 cursor-pointer"
              >
                Deploy Safe X-Ray Probe 🔍
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER (VICTORY OR EXPLODED) MODAL */}
      {(state.phase === 'victory' || state.phase === 'exploded') && (
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
