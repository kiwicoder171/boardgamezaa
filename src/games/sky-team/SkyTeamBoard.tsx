'use client';

import React, { useState } from 'react';
import { Player } from '@/types/game';
import { SkyTeamState, SkyTeamAction, SkyTeamDie } from './types';
import {
  Plane,
  Radio,
  Coffee,
  RotateCcw,
  Volume2,
  VolumeX,
  AlertTriangle,
  Compass,
  Gauge,
  Check,
  ChevronRight,
  Shield,
  Zap,
} from 'lucide-react';

// Web Audio Cockpit SFX
class CockpitSoundFX {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playSwitchClick() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Audio fallback
    }
  }

  playDiceRattle() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const count = 3;
      for (let i = 0; i < count; i++) {
        const time = this.ctx.currentTime + i * 0.04;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200 + Math.random() * 150, time);
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.linearRampToValueAtTime(0.01, time + 0.03);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.03);
      }
    } catch {
      // Audio fallback
    }
  }

  playRadioTower() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch {
      // Audio fallback
    }
  }

  playMasterAlarm() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, this.ctx.currentTime);
      osc.frequency.setValueAtTime(450, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch {
      // Audio fallback
    }
  }
}

const cockpitFX = new CockpitSoundFX();

interface SkyTeamBoardProps {
  state: SkyTeamState;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  onAction: (action: SkyTeamAction) => void;
  onReturnToLobby: () => void;
}

export default function SkyTeamBoard({
  state,
  onAction,
  currentPlayerId,
  players,
  isHost,
  onReturnToLobby,
}: SkyTeamBoardProps) {
  const [selectedDieId, setSelectedDieId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showFlightManual, setShowFlightManual] = useState(false);

  const isPilot = currentPlayerId === state.pilotPlayerId;
  const isCopilot = currentPlayerId === state.copilotPlayerId;
  const isMyTurn = state.currentTurnPlayerId === currentPlayerId;

  const myDice = isPilot ? state.pilotDice : isCopilot ? state.copilotDice : [];
  const selectedDie = myDice.find((d) => d.id === selectedDieId && !d.placed);

  // Play audio helper
  const playSound = (fn: () => void) => {
    if (soundEnabled) fn();
  };

  // Die click handler
  const handleSelectDie = (die: SkyTeamDie) => {
    if (die.placed) return;
    playSound(() => cockpitFX.playDiceRattle());
    setSelectedDieId((prev: string | null) => (prev === die.id ? null : die.id));
  };

  // Slot click handler
  const handleSlotClick = (slotId: string) => {
    if (!isMyTurn || !selectedDieId) return;
    playSound(() => cockpitFX.playSwitchClick());
    onAction({
      type: 'PLACE_DIE',
      playerId: currentPlayerId,
      dieId: selectedDieId,
      slotId,
    });
    setSelectedDieId(null);
  };

  // Coffee modifier
  const handleUseCoffee = (delta: 1 | -1) => {
    if (!selectedDieId || state.coffeeTokens <= 0) return;
    playSound(() => cockpitFX.playSwitchClick());
    onAction({
      type: 'USE_COFFEE',
      playerId: currentPlayerId,
      dieId: selectedDieId,
      delta,
    });
  };

  // Reroll action
  const handleReroll = () => {
    if (state.rerollTokens <= 0) return;
    const unplacedIds = myDice.filter((d) => !d.placed).map((d) => d.id);
    if (unplacedIds.length === 0) return;
    playSound(() => cockpitFX.playDiceRattle());
    onAction({
      type: 'USE_REROLL',
      playerId: currentPlayerId,
      dieIds: unplacedIds,
    });
    setSelectedDieId(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* 1. COCKPIT DASHBOARD CONSOLE CONTAINER */}
      <div className="cockpit-chassis rounded-[36px] sm:rounded-[44px] p-5 sm:p-7 relative overflow-hidden shadow-2xl border-4 border-slate-700/80 bg-gradient-to-b from-[#121826] via-[#0d121d] to-[#080b12] text-slate-100">
        
        {/* Top Aircraft Windshield Header & Flight Deck Telemetry */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-slate-800/80 rounded-2xl border border-sky-500/30 shadow-inner">
              ✈️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-[10px] font-mono font-bold text-sky-300 uppercase">
                  {state.airportCode} • {state.difficulty}
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-100 tracking-wide font-sans">
                  {state.airportName}
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 max-w-xl line-clamp-1">
                {state.briefing}
              </p>
            </div>
          </div>

          {/* Turn & Silence Indicator */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-black/60 border border-slate-700 text-xs sm:text-sm font-semibold shadow-inner">
              {state.status === 'playing' ? (
                isMyTurn ? (
                  <span className="text-amber-300 font-black animate-pulse flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>YOUR FLIGHT ACTION: Select a die and click a cockpit slot!</span>
                  </span>
                ) : (
                  <span className="text-slate-300 flex items-center gap-2">
                    <span>🤫</span>
                    <span>
                      Radio Silence! Awaiting{' '}
                      <strong className="text-sky-300">
                        {state.currentTurnPlayerId === state.pilotPlayerId ? 'Captain (Pilot)' : 'First Officer (Co-Pilot)'}
                      </strong>...
                    </span>
                  </span>
                )
              ) : state.status === 'won' ? (
                <span className="text-emerald-400 font-black flex items-center gap-2">
                  <Check className="w-4 h-4" /> TOUCHDOWN SUCCESSFUL! MISSION COMPLETE!
                </span>
              ) : (
                <span className="text-rose-400 font-black flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {state.crashReason || 'FLIGHT CRASH!'}
                </span>
              )}
            </div>

            {/* Flight Manual, Sound & Lobby controls */}
            <button
              onClick={() => setShowFlightManual(true)}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-sky-400 border border-slate-600 transition shadow-md flex items-center gap-1.5 text-xs font-bold"
              title="Flight Operations Manual & Approach Checklist"
            >
              <span>📖</span>
              <span className="hidden sm:inline">Manual</span>
            </button>
            <button
              onClick={() => setSoundEnabled((v: boolean) => !v)}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-600 transition shadow-md"
              title={soundEnabled ? 'Mute Cockpit Audio' : 'Enable Cockpit Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            </button>
            <button
              onClick={onReturnToLobby}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-100 border border-slate-600 transition shadow-md"
              title="Return to Room Lobby"
            >
              {isHost ? 'Abort Flight' : 'Lobby'}
            </button>
          </div>
        </div>

        {/* 2. THE COCKPIT INSTRUMENT MAIN PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">

          {/* LEFT COLUMN: CAPTAIN (PILOT) SYSTEMS (4 COLS) */}
          <div className="lg:col-span-4 bg-[#141b2b]/90 border border-blue-900/60 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
            {/* Captain Header */}
            <div className="flex items-center justify-between border-b border-blue-900/40 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">👨‍✈️</span>
                <div>
                  <div className="font-sans font-black text-sm text-blue-300">CAPTAIN (PILOT)</div>
                  <div className="text-[10px] text-blue-400/80 font-mono">Blue Controls • Landing Gear & Brakes</div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                {players.find((p) => p.id === state.pilotPlayerId)?.name || 'Pilot'}
              </span>
            </div>

            {/* A. Mandatory Engine Pilot Slot */}
            <div className="bg-black/40 border border-blue-950 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-blue-400" />
                  <span>Engines (Throttle)</span>
                </span>
                <span className="text-[10px] text-rose-400 font-mono font-bold uppercase">MANDATORY</span>
              </div>
              <div
                onClick={() => handleSlotClick('enginesPilot')}
                className={`h-16 rounded-xl border-2 border-dashed flex items-center justify-center transition cursor-pointer ${
                  state.slots.enginesPilot
                    ? 'border-blue-500 bg-blue-950/40'
                    : 'border-blue-700/50 hover:border-blue-400 bg-black/30'
                }`}
              >
                {state.slots.enginesPilot ? (
                  <DieToken die={state.slots.enginesPilot} />
                ) : (
                  <span className="text-xs font-mono text-blue-400/70">Place Pilot Die (1-6)</span>
                )}
              </div>
            </div>

            {/* B. Landing Gear Switches (3 Stages) */}
            <div className="bg-black/40 border border-blue-950 rounded-2xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>⚙️</span>
                  <span>Landing Gear Checklist</span>
                </span>
                <span className="text-[10px] text-blue-300 font-mono">All 3 Required for Landing</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Gear 1 */}
                <div
                  onClick={() => handleSlotClick('gear1')}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-between min-h-[72px] transition cursor-pointer ${
                    state.landingGear[0]
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-emerald-900/20 shadow-md'
                      : 'border-blue-900/50 hover:border-blue-500 bg-black/20'
                  }`}
                >
                  <div className="text-[10px] font-mono text-slate-400">GEAR 1</div>
                  <div className="text-xs font-mono font-black text-blue-300">[1 or 2]</div>
                  <div
                    className={`w-3 h-3 rounded-full mt-1 border ${
                      state.landingGear[0]
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] border-emerald-300'
                        : 'bg-rose-600 border-rose-800'
                    }`}
                  />
                </div>

                {/* Gear 2 */}
                <div
                  onClick={() => handleSlotClick('gear2')}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-between min-h-[72px] transition cursor-pointer ${
                    state.landingGear[1]
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-emerald-900/20 shadow-md'
                      : 'border-blue-900/50 hover:border-blue-500 bg-black/20'
                  }`}
                >
                  <div className="text-[10px] font-mono text-slate-400">GEAR 2</div>
                  <div className="text-xs font-mono font-black text-blue-300">[3 or 4]</div>
                  <div
                    className={`w-3 h-3 rounded-full mt-1 border ${
                      state.landingGear[1]
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] border-emerald-300'
                        : 'bg-rose-600 border-rose-800'
                    }`}
                  />
                </div>

                {/* Gear 3 */}
                <div
                  onClick={() => handleSlotClick('gear3')}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-between min-h-[72px] transition cursor-pointer ${
                    state.landingGear[2]
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-emerald-900/20 shadow-md'
                      : 'border-blue-900/50 hover:border-blue-500 bg-black/20'
                  }`}
                >
                  <div className="text-[10px] font-mono text-slate-400">GEAR 3</div>
                  <div className="text-xs font-mono font-black text-blue-300">[5 or 6]</div>
                  <div
                    className={`w-3 h-3 rounded-full mt-1 border ${
                      state.landingGear[2]
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] border-emerald-300'
                        : 'bg-rose-600 border-rose-800'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* C. Pilot Brakes Hydraulic Track */}
            <div className="bg-black/40 border border-blue-950 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                  <span>Hydraulic Brakes</span>
                </span>
                <span className="text-[10px] font-mono text-amber-300 font-black">
                  Current: {state.brakesLevel} Pressure
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div
                  onClick={() => handleSlotClick('brakes1')}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    state.brakesLevel >= 2
                      ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                      : 'border-blue-900/50 hover:border-blue-400 bg-black/20 text-slate-400'
                  }`}
                >
                  <div className="text-[9px] font-mono">STAGE 1</div>
                  <div className="text-xs font-mono font-black">Die: [2]</div>
                </div>

                <div
                  onClick={() => handleSlotClick('brakes2')}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    state.brakesLevel >= 4
                      ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                      : 'border-blue-900/50 hover:border-blue-400 bg-black/20 text-slate-400'
                  }`}
                >
                  <div className="text-[9px] font-mono">STAGE 2</div>
                  <div className="text-xs font-mono font-black">Die: [4]</div>
                </div>

                <div
                  onClick={() => handleSlotClick('brakes3')}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    state.brakesLevel >= 6
                      ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                      : 'border-blue-900/50 hover:border-blue-400 bg-black/20 text-slate-400'
                  }`}
                >
                  <div className="text-[9px] font-mono">STAGE 3</div>
                  <div className="text-xs font-mono font-black">Die: [6]</div>
                </div>
              </div>
            </div>

            {/* D. Pilot Radio Slot */}
            <div className="bg-black/40 border border-blue-950 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-sky-400" />
                  <span>Tower Radio Frequency</span>
                </span>
                <span className="text-[10px] text-sky-300/80 font-mono">Diverts Plane @ Distance</span>
              </div>
              <div
                onClick={() => handleSlotClick('radioPilot')}
                className={`h-14 rounded-xl border-2 border-dashed flex items-center justify-center transition cursor-pointer ${
                  state.slots.radioPilot
                    ? 'border-sky-500 bg-sky-950/40'
                    : 'border-blue-900/50 hover:border-sky-400 bg-black/20'
                }`}
              >
                {state.slots.radioPilot ? (
                  <DieToken die={state.slots.radioPilot} />
                ) : (
                  <span className="text-xs font-mono text-sky-400/60">Any Die Value</span>
                )}
              </div>
            </div>
          </div>

          {/* CENTER COLUMN: CENTRAL FLIGHT COMPUTER, ARTIFICIAL HORIZON & RUNWAY APPROACH (4 COLS) */}
          <div className="lg:col-span-4 space-y-4">

            {/* A. ARTIFICIAL HORIZON (AXIS / TILT GYRO) */}
            <div className="bg-gradient-to-b from-slate-900 to-black border-2 border-slate-700 rounded-3xl p-4 shadow-2xl relative overflow-hidden flex flex-col items-center">
              <div className="w-full flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-1.5 mb-2">
                <span className="flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Artificial Horizon (Axis)</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">MANDATORY</span>
              </div>

              {/* Gyro Horizon Round Gauge */}
              <div className="relative w-40 h-40 rounded-full border-4 border-slate-600 shadow-inner flex items-center justify-center overflow-hidden bg-slate-900">
                {/* Upper Sky / Lower Ground split */}
                <div
                  className="absolute inset-0 transition-transform duration-500 ease-out"
                  style={{
                    transform: `rotate(${state.tilt * 15}deg)`,
                    background: 'linear-gradient(180deg, #0284c7 50%, #78350f 50%)',
                  }}
                >
                  {/* Pitch ladder lines */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-amber-300" />
                  <div className="absolute top-[35%] left-6 right-6 h-0.5 bg-white/40" />
                  <div className="absolute top-[65%] left-6 right-6 h-0.5 bg-white/40" />
                </div>

                {/* Aircraft Fixed Crosshair Reticle */}
                <div className="relative z-10 w-20 h-5 flex items-center justify-between">
                  <div className="w-6 h-1 bg-amber-400 rounded-full shadow-md" />
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-amber-400/20" />
                  <div className="w-6 h-1 bg-amber-400 rounded-full shadow-md" />
                </div>

                {/* Tilt Degree Readout Badge */}
                <div className="absolute bottom-2 z-20 px-2 py-0.5 rounded-full bg-black/80 border border-slate-600 text-[10px] font-mono font-bold text-amber-300">
                  {state.tilt === 0 ? 'LEVEL 0°' : `${state.tilt > 0 ? '+' : ''}${state.tilt * 10}°`}
                </div>
              </div>

              {/* Axis Dual Placement Slots (Pilot on Left, Co-pilot on Right) */}
              <div className="grid grid-cols-2 gap-3 w-full mt-3">
                <div
                  onClick={() => handleSlotClick('axisPilot')}
                  className={`h-14 rounded-xl border-2 border-dashed flex items-center justify-center transition cursor-pointer ${
                    state.slots.axisPilot
                      ? 'border-blue-500 bg-blue-950/40'
                      : 'border-blue-700/50 hover:border-blue-400 bg-black/30'
                  }`}
                >
                  {state.slots.axisPilot ? (
                    <DieToken die={state.slots.axisPilot} />
                  ) : (
                    <span className="text-[10px] font-mono text-blue-300">Pilot Axis</span>
                  )}
                </div>

                <div
                  onClick={() => handleSlotClick('axisCopilot')}
                  className={`h-14 rounded-xl border-2 border-dashed flex items-center justify-center transition cursor-pointer ${
                    state.slots.axisCopilot
                      ? 'border-orange-500 bg-orange-950/40'
                      : 'border-orange-700/50 hover:border-orange-400 bg-black/30'
                  }`}
                >
                  {state.slots.axisCopilot ? (
                    <DieToken die={state.slots.axisCopilot} />
                  ) : (
                    <span className="text-[10px] font-mono text-orange-300">Co-Pilot Axis</span>
                  )}
                </div>
              </div>
            </div>

            {/* B. APPROACH TRACK & AIR TRAFFIC RADAR */}
            <div className="bg-black/60 border border-slate-700 rounded-3xl p-4 space-y-2 shadow-inner">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-amber-400" />
                  <span>Runway Approach Corridor</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Altitude: <strong className="text-cyan-300">{state.altitude.toLocaleString()} ft</strong>
                </span>
              </div>

              {/* Visual Strip of Approach Sectors */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-2">
                {state.approachTrack.map((space) => {
                  const isCurrentPosition = space.index === state.currentApproachIndex;
                  return (
                    <div
                      key={space.index}
                      className={`min-w-[44px] h-20 rounded-xl border flex flex-col items-center justify-between p-1.5 transition ${
                        space.isRunway
                          ? 'border-emerald-500 bg-emerald-950/30'
                          : isCurrentPosition
                          ? 'border-amber-400 bg-amber-950/30 ring-2 ring-amber-400/50'
                          : 'border-slate-800 bg-slate-900/60'
                      }`}
                    >
                      <span className="text-[9px] font-mono text-slate-500">#{space.index + 1}</span>

                      {/* Content: Our Plane, Other Plane, or Runway */}
                      <div className="my-auto flex flex-col items-center">
                        {isCurrentPosition ? (
                          <span className="text-base animate-bounce" title="Your Airliner">
                            🛬
                          </span>
                        ) : space.airplanes > 0 ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-rose-400">✈️</span>
                            {space.airplanes > 1 && (
                              <span className="text-[8px] font-mono font-bold text-rose-300">
                                x{space.airplanes}
                              </span>
                            )}
                          </div>
                        ) : space.isRunway ? (
                          <span className="text-xs text-emerald-400 font-mono font-black">RWY</span>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-600">CLR</span>
                        )}
                      </div>

                      {space.isRunway ? (
                        <span className="text-[8px] font-black text-emerald-400 uppercase">Touchdown</span>
                      ) : (
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            space.airplanes > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-700'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* C. SHARED FLIGHT SUPPLIES (COFFEE & REROLLS) */}
            <div className="bg-black/50 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Coffee Tokens: {state.coffeeTokens}/3</div>
                  <div className="text-[10px] text-slate-400 font-mono">+1 or -1 Die Concentration</div>
                </div>
              </div>

              {/* Coffee controls if die selected */}
              {selectedDie && state.coffeeTokens > 0 && isMyTurn ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleUseCoffee(-1)}
                    disabled={selectedDie.value <= 1}
                    className="px-2 py-1 rounded bg-amber-950/70 hover:bg-amber-800 text-amber-200 border border-amber-600 text-xs font-bold disabled:opacity-30"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => handleUseCoffee(1)}
                    disabled={selectedDie.value >= 6}
                    className="px-2 py-1 rounded bg-amber-950/70 hover:bg-amber-800 text-amber-200 border border-amber-600 text-xs font-bold disabled:opacity-30"
                  >
                    +1
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3.5 h-3.5 rounded-full border ${
                        i < state.coffeeTokens
                          ? 'bg-amber-500 border-amber-300 shadow-[0_0_6px_rgba(245,158,11,0.8)]'
                          : 'bg-slate-900 border-slate-700'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: FIRST OFFICER (CO-PILOT) SYSTEMS (4 COLS) */}
          <div className="lg:col-span-4 bg-[#211614]/90 border border-orange-900/60 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
            {/* First Officer Header */}
            <div className="flex items-center justify-between border-b border-orange-900/40 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">👩‍✈️</span>
                <div>
                  <div className="font-sans font-black text-sm text-orange-300">FIRST OFFICER (CO-PILOT)</div>
                  <div className="text-[10px] text-orange-400/80 font-mono">Orange Controls • Wing Flaps & Radar</div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40">
                {players.find((p) => p.id === state.copilotPlayerId)?.name || 'Co-Pilot'}
              </span>
            </div>

            {/* A. Mandatory Engine Co-Pilot Slot */}
            <div className="bg-black/40 border border-orange-950 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-orange-400" />
                  <span>Engines (Throttle)</span>
                </span>
                <span className="text-[10px] text-rose-400 font-mono font-bold uppercase">MANDATORY</span>
              </div>
              <div
                onClick={() => handleSlotClick('enginesCopilot')}
                className={`h-16 rounded-xl border-2 border-dashed flex items-center justify-center transition cursor-pointer ${
                  state.slots.enginesCopilot
                    ? 'border-orange-500 bg-orange-950/40'
                    : 'border-orange-700/50 hover:border-orange-400 bg-black/30'
                }`}
              >
                {state.slots.enginesCopilot ? (
                  <DieToken die={state.slots.enginesCopilot} />
                ) : (
                  <span className="text-xs font-mono text-orange-400/70">Place Co-Pilot Die (1-6)</span>
                )}
              </div>
            </div>

            {/* B. Wing Flaps Deployment (4 Stages) */}
            <div className="bg-black/40 border border-orange-950 rounded-2xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>🪶</span>
                  <span>Wing Flaps Checklist</span>
                </span>
                <span className="text-[10px] text-orange-300 font-mono">All 4 Required for Landing</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {/* Flap 1 */}
                <div
                  onClick={() => handleSlotClick('flaps1')}
                  className={`p-1.5 rounded-xl border flex flex-col items-center justify-between min-h-[72px] transition cursor-pointer ${
                    state.flaps[0]
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-emerald-900/20 shadow-md'
                      : 'border-orange-900/50 hover:border-orange-500 bg-black/20'
                  }`}
                >
                  <div className="text-[9px] font-mono text-slate-400">FLAP 1</div>
                  <div className="text-[11px] font-mono font-black text-orange-300">[1, 2]</div>
                  <div
                    className={`w-3 h-3 rounded-full mt-1 border ${
                      state.flaps[0]
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] border-emerald-300'
                        : 'bg-rose-600 border-rose-800'
                    }`}
                  />
                </div>

                {/* Flap 2 */}
                <div
                  onClick={() => handleSlotClick('flaps2')}
                  className={`p-1.5 rounded-xl border flex flex-col items-center justify-between min-h-[72px] transition cursor-pointer ${
                    state.flaps[1]
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-emerald-900/20 shadow-md'
                      : 'border-orange-900/50 hover:border-orange-500 bg-black/20'
                  }`}
                >
                  <div className="text-[9px] font-mono text-slate-400">FLAP 2</div>
                  <div className="text-[11px] font-mono font-black text-orange-300">[2, 3]</div>
                  <div
                    className={`w-3 h-3 rounded-full mt-1 border ${
                      state.flaps[1]
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] border-emerald-300'
                        : 'bg-rose-600 border-rose-800'
                    }`}
                  />
                </div>

                {/* Flap 3 */}
                <div
                  onClick={() => handleSlotClick('flaps3')}
                  className={`p-1.5 rounded-xl border flex flex-col items-center justify-between min-h-[72px] transition cursor-pointer ${
                    state.flaps[2]
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-emerald-900/20 shadow-md'
                      : 'border-orange-900/50 hover:border-orange-500 bg-black/20'
                  }`}
                >
                  <div className="text-[9px] font-mono text-slate-400">FLAP 3</div>
                  <div className="text-[11px] font-mono font-black text-orange-300">[4, 5]</div>
                  <div
                    className={`w-3 h-3 rounded-full mt-1 border ${
                      state.flaps[2]
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] border-emerald-300'
                        : 'bg-rose-600 border-rose-800'
                    }`}
                  />
                </div>

                {/* Flap 4 */}
                <div
                  onClick={() => handleSlotClick('flaps4')}
                  className={`p-1.5 rounded-xl border flex flex-col items-center justify-between min-h-[72px] transition cursor-pointer ${
                    state.flaps[3]
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-emerald-900/20 shadow-md'
                      : 'border-orange-900/50 hover:border-orange-500 bg-black/20'
                  }`}
                >
                  <div className="text-[9px] font-mono text-slate-400">FLAP 4</div>
                  <div className="text-[11px] font-mono font-black text-orange-300">[5, 6]</div>
                  <div
                    className={`w-3 h-3 rounded-full mt-1 border ${
                      state.flaps[3]
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] border-emerald-300'
                        : 'bg-rose-600 border-rose-800'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* C. Co-Pilot Radio Slots (2 Slots) */}
            <div className="bg-black/40 border border-orange-950 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-orange-400" />
                  <span>Tower Radios (2 Channels)</span>
                </span>
                <span className="text-[10px] text-orange-300/80 font-mono">Clears Traffic</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => handleSlotClick('radioCopilot1')}
                  className={`h-14 rounded-xl border-2 border-dashed flex items-center justify-center transition cursor-pointer ${
                    state.slots.radioCopilot1
                      ? 'border-orange-500 bg-orange-950/40'
                      : 'border-orange-900/50 hover:border-orange-400 bg-black/20'
                  }`}
                >
                  {state.slots.radioCopilot1 ? (
                    <DieToken die={state.slots.radioCopilot1} />
                  ) : (
                    <span className="text-[10px] font-mono text-orange-400/60">Radio 1</span>
                  )}
                </div>

                <div
                  onClick={() => handleSlotClick('radioCopilot2')}
                  className={`h-14 rounded-xl border-2 border-dashed flex items-center justify-center transition cursor-pointer ${
                    state.slots.radioCopilot2
                      ? 'border-orange-500 bg-orange-950/40'
                      : 'border-orange-900/50 hover:border-orange-400 bg-black/20'
                  }`}
                >
                  {state.slots.radioCopilot2 ? (
                    <DieToken die={state.slots.radioCopilot2} />
                  ) : (
                    <span className="text-[10px] font-mono text-orange-400/60">Radio 2</span>
                  )}
                </div>
              </div>
            </div>

            {/* D. Galley Coffee Brew Slot */}
            <div className="bg-black/40 border border-orange-950 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-amber-500" />
                  <span>Brew Fresh Coffee</span>
                </span>
                <span className="text-[10px] text-amber-400/80 font-mono">+1 Token</span>
              </div>
              <div
                onClick={() => handleSlotClick('coffee1')}
                className={`h-14 rounded-xl border-2 border-dashed flex items-center justify-center transition cursor-pointer ${
                  state.slots.coffee1
                    ? 'border-amber-500 bg-amber-950/40'
                    : 'border-orange-900/50 hover:border-amber-400 bg-black/20'
                }`}
              >
                {state.slots.coffee1 ? (
                  <DieToken die={state.slots.coffee1} />
                ) : (
                  <span className="text-xs font-mono text-amber-400/60">Any Die Value</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. FLIGHT SCREENS: PERSONAL SECRET ROLLED DICE BEHIND SCREEN */}
        <div className="mt-6 bg-black/70 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🛡️</span>
              <div>
                <h3 className="text-sm font-sans font-black text-slate-200">
                  Your Flight Screen ({isPilot ? 'Captain - Blue Dice' : isCopilot ? 'First Officer - Orange Dice' : 'Spectator'})
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Secretly rolled for your eyes only. Click a die to select it, then click an available cockpit slot above.
                </p>
              </div>
            </div>

            {/* Reroll button */}
            {state.rerollTokens > 0 && isMyTurn && (
              <button
                onClick={handleReroll}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-mono font-bold text-slate-200 flex items-center gap-2 shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reroll Unplaced Dice ({state.rerollTokens} Left)</span>
              </button>
            )}
          </div>

          {/* Dice tray */}
          <div className="flex flex-wrap items-center justify-center gap-5 py-2">
            {myDice.map((die) => {
              const isSelected = selectedDieId === die.id;
              return (
                <div
                  key={die.id}
                  onClick={() => isMyTurn && handleSelectDie(die)}
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center select-none transition transform cursor-pointer border-2 ${
                    die.placed
                      ? 'opacity-30 border-slate-700 bg-slate-900 cursor-not-allowed scale-90'
                      : isSelected
                      ? '-translate-y-3 ring-4 ring-cyan-400 scale-105 border-cyan-300 shadow-2xl bg-slate-800'
                      : isMyTurn
                      ? 'hover:-translate-y-1 hover:ring-2 hover:ring-cyan-300/60 border-slate-600 bg-slate-800/90'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  <span className="text-2xl sm:text-3xl font-mono font-black">
                    {die.placed ? '✓' : die.value}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold mt-0.5 px-2 py-0.5 rounded-full ${
                      die.color === 'blue'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40'
                        : 'bg-orange-500/20 text-orange-300 border border-orange-400/40'
                    }`}
                  >
                    {die.placed ? 'PLACED' : die.color.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. BLACK BOX / COCKPIT VOICE RECORDER (ACTION LOG) */}
        <div className="mt-5 bg-black/50 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span>📻</span> Cockpit Voice Recorder & Flight Director Log
          </div>
          <div className="max-h-24 overflow-y-auto space-y-1 text-xs font-mono">
            {state.history.slice(-6).reverse().map((h) => (
              <div
                key={h.id}
                className={`p-1.5 rounded-lg border text-[11px] ${
                  h.type === 'crash'
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold'
                    : h.type === 'success'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : h.type === 'warning'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : h.type === 'radio'
                    ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                    : 'bg-black/30 border-slate-800 text-slate-300'
                }`}
              >
                {h.text}
              </div>
            ))}
          </div>
        </div>

      {/* MISSION DEBRIEF MODAL (LANDING / CRASH) */}
      {(state.status === 'won' || state.status === 'crashed') && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border-2 border-sky-500/60 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-2xl">
            <div className="text-6xl animate-bounce">
              {state.status === 'won' ? '🛬' : '💥'}
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wide">
                {state.status === 'won' ? (
                  <span className="text-emerald-400">TOUCHDOWN SUCCESSFUL!</span>
                ) : (
                  <span className="text-rose-500">MAYDAY - FLIGHT CRASHED!</span>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                {state.status === 'won'
                  ? `All checklists cleared! Perfectly landed at ${state.airportName} (${state.airportCode})!`
                  : state.crashReason || 'Aircraft lost control during approach.'}
              </p>
            </div>

            {/* Telemetry Debrief Stats */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-left grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">AIRPORT</span>
                <span className="font-bold text-sky-300">{state.airportCode} ({state.difficulty})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">FINAL ALTITUDE</span>
                <span className="font-bold text-amber-300">{state.altitude} ft (Round {state.round}/7)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">AXIS TILT</span>
                <span className={`font-bold ${state.tilt === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {state.tilt === 0 ? 'LEVEL (0°)' : `${state.tilt > 0 ? '+' : ''}${state.tilt}°`}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">APPROACH DISTANCE</span>
                <span className="font-bold text-purple-300">{state.currentApproachIndex} / {state.approachTrack.length}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => onAction({ type: 'RESTART_GAME' })}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold rounded-xl transition shadow-lg shadow-sky-900/50 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <span>Fly Again ✈️</span>
              </button>
              <button
                onClick={onReturnToLobby}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-extrabold rounded-xl transition text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <span>Return to Lobby 🏛️</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLIGHT OPERATIONS MANUAL & CHECKLIST MODAL */}
      {showFlightManual && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border-2 border-sky-600/60 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✈️</span>
                <div>
                  <h3 className="text-xl font-bold font-sans text-sky-400">Sky Team Flight Operations Manual</h3>
                  <div className="text-xs text-slate-400">Official Cockpit Procedures & Approach Checklist</div>
                </div>
              </div>
              <button
                onClick={() => setShowFlightManual(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs text-slate-300 leading-relaxed font-sans">
              <div className="p-3 bg-sky-950/40 border border-sky-500/30 rounded-2xl">
                <strong className="text-sky-300">Cooperative Flight Crew:</strong> Pilot (Blue dice) and Co-pilot (Orange dice) must work together under radio silence to land safely across 7 altitude rounds.
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sky-400 uppercase tracking-wider">🕹️ Artificial Horizon (Axis - Mandatory)</h4>
                <p>
                  Both Pilot & Co-pilot place 1 die. The difference tilts the plane left or right. If the needle exceeds ±3 at any moment, the plane spirals and crashes! At final touchdown (altitude 0), the needle MUST be perfectly level (0).
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sky-400 uppercase tracking-wider">⚡ Engines & Throttle (Mandatory)</h4>
                <p>
                  Sum of Pilot + Co-pilot engine dice determines distance moved along the approach track. If you advance into a space occupied by traffic airplanes, you crash! Use Radio to clear them beforehand.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-blue-400 uppercase tracking-wider">🛞 Landing Gear (Pilot) & 🪽 Flaps (Co-Pilot)</h4>
                <p>
                  • <strong>Landing Gear:</strong> Pilot must activate slots [1-2], [3-4], and [5-6] sequentially. All 3 green lights must be lit before landing.
                  <br />• <strong>Flaps:</strong> Co-pilot must activate slots [1-2], [2-3], [3-4], and [4-5] sequentially to deploy flaps.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-rose-400 uppercase tracking-wider">🛑 Brakes & Touchdown Speed</h4>
                <p>
                  Pilot must deploy brake slots [2], [4], [6] sequentially. When landing at altitude 0, the total braking power MUST be strictly greater than the airplane speed!
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider">☕ Coffee & 🎲 Reroll Tokens</h4>
                <p>
                  • <strong>Coffee:</strong> Spends 1 coffee to modify any unplaced die value by +1 or -1.
                  <br />• <strong>Reroll:</strong> Allows you to pick up and reroll any number of unplaced dice.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-purple-400 uppercase tracking-wider">🌪️ Turbulence & Expansion Modules</h4>
                <p>
                  • <strong>Wind:</strong> Crosswinds skew the artificial horizon each round.
                  <br />• <strong>Ice:</strong> Increases required braking distance on the runway.
                  <br />• <strong>Kerosene:</strong> Plane burns fuel each round; fuel dump actions regulate weight.
                  <br />• <strong>Intern:</strong> Enables training apprentice dice on helper slots.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-right">
              <button
                onClick={() => setShowFlightManual(false)}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

// Sub-component for rendering die tokens inside slots
function DieToken({ die }: { die: SkyTeamDie }) {
  const isBlue = die.color === 'blue';
  return (
    <div
      className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-mono font-black border-2 shadow-lg ${
        isBlue
          ? 'bg-blue-900 border-blue-400 text-blue-100 shadow-blue-900/40'
          : 'bg-orange-900 border-orange-400 text-orange-100 shadow-orange-900/40'
      }`}
    >
      <span className="text-lg leading-none">{die.value}</span>
      <span className="text-[7px] tracking-wider uppercase opacity-80 mt-0.5">
        {isBlue ? 'PILOT' : 'CO-PILOT'}
      </span>
    </div>
  );
}
