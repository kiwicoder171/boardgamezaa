'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Player } from '@/types/game';
import { WavelengthAction, WavelengthState } from './types';
import { getWavelengthBotAction } from './logic';
import { soundFX } from '@/lib/sounds';
import {
  Brain,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Eye,
  EyeOff,
  Check,
  Send,
  Trophy,
  History,
  Users,
  Compass,
} from 'lucide-react';

interface WavelengthBoardProps {
  state: WavelengthState;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  onAction: (action: WavelengthAction) => void;
  onReturnToLobby?: () => void;
}

export default function WavelengthBoard({
  state,
  players,
  currentPlayerId,
  isHost,
  onAction,
  onReturnToLobby,
}: WavelengthBoardProps) {
  const [clueInput, setClueInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const dialRef = useRef<SVGSVGElement | null>(null);

  const isPsychic = state.psychicId === currentPlayerId;
  const activeTeam = state.teams[state.activeTeam];
  const psychicPlayer = players.find((p) => p.id === state.psychicId);

  const isActiveTeamMember =
    state.mode === 'coop' ||
    (state.activeTeam && state.teams[state.activeTeam].playerIds.includes(currentPlayerId));

  const opposingTeamId = state.activeTeam === 'brain' ? 'mind' : 'brain';
  const isOpposingMember =
    state.mode === 'competitive' &&
    state.teams[opposingTeamId].playerIds.includes(currentPlayerId);

  // Play audio on phase transitions
  useEffect(() => {
    if (state.phase === 'reveal') {
      soundFX.playTurnPing();
    }
  }, [state.phase]);

  // Bot Auto-play Hook (Host proxies bot turns)
  useEffect(() => {
    if (!isHost) return;

    // 1. Bot is Psychic in 'clue' phase
    if (state.phase === 'clue' && state.psychicId.startsWith('bot_')) {
      const timer = setTimeout(() => {
        const botAction = getWavelengthBotAction(state, state.psychicId);
        if (botAction) {
          onAction({ ...botAction, _asPlayerId: state.psychicId } as any);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }

    // 2. Bot on guessing team in 'guessing' phase (when team has no humans)
    if (state.phase === 'guessing') {
      const teamPlayers =
        state.mode === 'coop'
          ? players
          : players.filter((p) => state.teams[state.activeTeam].playerIds.includes(p.id));
      const hasHumanGuesser = teamPlayers.some(
        (p) => !p.id.startsWith('bot_') && p.id !== state.psychicId
      );

      if (!hasHumanGuesser) {
        const botGuesser = teamPlayers.find(
          (p) => p.id.startsWith('bot_') && p.id !== state.psychicId
        );
        if (botGuesser) {
          const timer = setTimeout(() => {
            const botAction = getWavelengthBotAction(state, botGuesser.id);
            if (botAction) {
              onAction({ ...botAction, _asPlayerId: botGuesser.id } as any);
              setTimeout(() => {
                onAction({ type: 'LOCK_GUESS', _asPlayerId: botGuesser.id } as any);
              }, 700);
            }
          }, 1000);
          return () => clearTimeout(timer);
        }
      }
    }

    // 3. Bot on opposing team in 'counter_guess' phase (when opponents are all bots)
    if (state.phase === 'counter_guess') {
      const oppPlayers = players.filter((p) =>
        state.teams[opposingTeamId].playerIds.includes(p.id)
      );
      const hasHumanOpponent = oppPlayers.some((p) => !p.id.startsWith('bot_'));

      if (!hasHumanOpponent) {
        const botOpponent = oppPlayers.find((p) => p.id.startsWith('bot_'));
        if (botOpponent) {
          const timer = setTimeout(() => {
            const botAction = getWavelengthBotAction(state, botOpponent.id);
            if (botAction) {
              onAction({ ...botAction, _asPlayerId: botOpponent.id } as any);
            }
          }, 1000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [isHost, state, players, opposingTeamId, onAction]);

  // Handle rotational angle calculation from mouse/touch event
  const calculateAngleFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      if (!dialRef.current) return;
      const rect = dialRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.bottom; // Dial base is at bottom center

      const dx = clientX - centerX;
      const dy = centerY - clientY; // inverted Y

      if (dy <= 0) return; // Ignore drag below the baseline

      // atan2 returns angle in radians from positive X axis
      const rad = Math.atan2(dy, dx);
      let deg = 180 - (rad * 180) / Math.PI;
      deg = Math.max(0, Math.min(180, Math.round(deg)));

      onAction({ type: 'ROTATE_DIAL', angle: deg });
    },
    [onAction]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (state.phase !== 'guessing' || !isActiveTeamMember) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    calculateAngleFromEvent(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    calculateAngleFromEvent(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      soundFX.playClick();
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  const nudgeDial = (delta: number) => {
    if (state.phase !== 'guessing' || !isActiveTeamMember) return;
    soundFX.playClick();
    const newAngle = Math.max(0, Math.min(180, state.dialAngle + delta));
    onAction({ type: 'ROTATE_DIAL', angle: newAngle });
  };

  const handleSubmitClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clueInput.trim() || !isPsychic) return;
    soundFX.playClick();
    onAction({ type: 'SUBMIT_CLUE', clue: clueInput.trim() });
    setClueInput('');
  };

  // Convert angle (0° to 180°) to SVG coordinate on radius
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((180 - angleInDegrees) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY - radius * Math.sin(angleInRadians),
    };
  };

  // Describe an SVG arc sector for target zones
  const describeWedgeSector = (
    centerX: number,
    centerY: number,
    innerR: number,
    outerR: number,
    startAngle: number,
    endAngle: number
  ) => {
    const startInner = polarToCartesian(centerX, centerY, innerR, startAngle);
    const endInner = polarToCartesian(centerX, centerY, innerR, endAngle);
    const startOuter = polarToCartesian(centerX, centerY, outerR, startAngle);
    const endOuter = polarToCartesian(centerX, centerY, outerR, endAngle);

    const arcSweep = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      `M ${startInner.x} ${startInner.y}`,
      `L ${startOuter.x} ${startOuter.y}`,
      `A ${outerR} ${outerR} 0 ${arcSweep} 1 ${endOuter.x} ${endOuter.y}`,
      `L ${endInner.x} ${endInner.y}`,
      `A ${innerR} ${innerR} 0 ${arcSweep} 0 ${startInner.x} ${startInner.y}`,
      'Z',
    ].join(' ');
  };

  // Target wedge zones (Bullseye = 4.5°, Inner = 11°, Outer = 19°)
  const targetAngle = state.targetAngle ?? 90;
  const isTargetVisible = state.shutterOpen || isPsychic;

  const needlePos = polarToCartesian(200, 200, 165, state.dialAngle);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12 select-none">
      {/* Top Match Bar */}
      <div className="bg-[#111215] border border-[#222429] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#18191e] border border-[#272930] text-xl">
            📡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Wavelength</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {state.mode === 'coop' ? 'Co-op Party' : 'Team Battle'}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Round {state.round} {state.mode === 'coop' ? `/ ${state.maxRounds}` : ''} • Target Score: {state.targetScore}
            </p>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="flex items-center gap-4">
          {state.mode === 'competitive' ? (
            <div className="flex items-center gap-3 font-mono text-xs">
              <div
                className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 ${
                  state.activeTeam === 'brain'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-[#18191e] border-[#272930] text-zinc-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-bold">Brain: {state.teams.brain.score}</span>
              </div>
              <span className="text-zinc-600">vs</span>
              <div
                className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 ${
                  state.activeTeam === 'mind'
                    ? 'bg-sky-500/10 border-sky-500/40 text-sky-300'
                    : 'bg-[#18191e] border-[#272930] text-zinc-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="font-bold">Mind: {state.teams.mind.score}</span>
              </div>
            </div>
          ) : (
            <div className="px-4 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-bold">Team Total: {state.teams.brain.score} pts</span>
            </div>
          )}

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn-tactile p-2 rounded-xl bg-[#18191e] hover:bg-[#202228] text-zinc-400 hover:text-white border border-[#272930] transition text-xs flex items-center gap-1.5"
            title="View Round History"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log</span>
          </button>
        </div>
      </div>

      {/* Spectrum Card Header */}
      <div className="bg-[#111215] border border-[#222429] rounded-2xl p-5 shadow-sm text-center space-y-3">
        <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 flex items-center justify-center gap-1.5">
          <span>Spectrum Card</span>
          <span>•</span>
          <span className="text-zinc-400">{state.currentCard.category || 'General'}</span>
        </div>

        <div className="grid grid-cols-2 items-center gap-4 max-w-3xl mx-auto py-1">
          {/* Left Pole */}
          <div className="bg-[#18191e] border border-[#272930] rounded-xl p-3 sm:p-4 text-left space-y-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              Left 0°
            </span>
            <div className="text-sm sm:text-base font-bold text-amber-300">
              {state.currentCard.leftTh}
            </div>
            <div className="text-xs text-zinc-400">{state.currentCard.left}</div>
          </div>

          {/* Right Pole */}
          <div className="bg-[#18191e] border border-[#272930] rounded-xl p-3 sm:p-4 text-right space-y-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              Right 180°
            </span>
            <div className="text-sm sm:text-base font-bold text-sky-300">
              {state.currentCard.rightTh}
            </div>
            <div className="text-xs text-zinc-400">{state.currentCard.right}</div>
          </div>
        </div>
      </div>

      {/* Main Wheel Device */}
      <div className="bg-[#111215] border border-[#222429] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center space-y-6 relative overflow-hidden shadow-md">
        {/* Psychic Status Pill */}
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span>Psychic:</span>
          <span className="text-white font-bold flex items-center gap-1">
            <span>{psychicPlayer?.avatar || '🔮'}</span>
            <span>{psychicPlayer?.name || 'Psychic'}</span>
          </span>
          {isPsychic && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
              You are the Psychic!
            </span>
          )}
        </div>

        {/* Interactive SVG Dial Wheel */}
        <div className="relative w-full max-w-md aspect-[2/1.1] flex items-end justify-center select-none">
          <svg
            ref={dialRef}
            viewBox="0 0 400 220"
            className="w-full h-full overflow-visible touch-none cursor-pointer"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Background semi-circle housing */}
            <path
              d="M 20 200 A 180 180 0 0 1 380 200 Z"
              fill="#141518"
              stroke="#272930"
              strokeWidth="3"
            />

            {/* Inner track */}
            <path
              d="M 50 200 A 150 150 0 0 1 350 200 Z"
              fill="#0e0f11"
              stroke="#1e2025"
              strokeWidth="2"
            />

            {/* Degree tick marks */}
            {[0, 30, 60, 90, 120, 150, 180].map((deg) => {
              const p1 = polarToCartesian(200, 200, 175, deg);
              const p2 = polarToCartesian(200, 200, 160, deg);
              return (
                <line
                  key={deg}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#383b44"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Hidden / Revealed Bullseye Target Wedges */}
            {isTargetVisible && (
              <g className="transition-opacity duration-500">
                {/* Outer Zone (2 pts) */}
                <path
                  d={describeWedgeSector(
                    200,
                    200,
                    70,
                    175,
                    Math.max(0, targetAngle - 19),
                    Math.min(180, targetAngle + 19)
                  )}
                  fill="#6366f1"
                  fillOpacity="0.45"
                  stroke="#818cf8"
                  strokeWidth="1"
                />

                {/* Inner Zone (3 pts) */}
                <path
                  d={describeWedgeSector(
                    200,
                    200,
                    70,
                    175,
                    Math.max(0, targetAngle - 11),
                    Math.min(180, targetAngle + 11)
                  )}
                  fill="#10b981"
                  fillOpacity="0.75"
                  stroke="#34d399"
                  strokeWidth="1"
                />

                {/* Bullseye Zone (4 pts) */}
                <path
                  d={describeWedgeSector(
                    200,
                    200,
                    70,
                    175,
                    Math.max(0, targetAngle - 4.5),
                    Math.min(180, targetAngle + 4.5)
                  )}
                  fill="#f59e0b"
                  fillOpacity="0.95"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Mechanical Shutter Screen (when closed and not psychic) */}
            {!isTargetVisible && (
              <g>
                <path
                  d="M 40 200 A 160 160 0 0 1 360 200 Z"
                  fill="#18191e"
                  stroke="#272930"
                  strokeWidth="1.5"
                />
                <text
                  x="200"
                  y="140"
                  textAnchor="middle"
                  fill="#52525b"
                  fontSize="12"
                  fontFamily="monospace"
                >
                  🔒 SHUTTER CLOSED
                </text>
              </g>
            )}

            {/* Center Dial Hub */}
            <circle cx="200" cy="200" r="30" fill="#22242a" stroke="#383b44" strokeWidth="3" />
            <circle cx="200" cy="200" r="10" fill="#f43f5e" />

            {/* Needle Pointer */}
            <g className="transition-transform duration-75">
              <line
                x1="200"
                y1="200"
                x2={needlePos.x}
                y2={needlePos.y}
                stroke="#f43f5e"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx={needlePos.x} cy={needlePos.y} r="6" fill="#f43f5e" />
            </g>
          </svg>

          {/* Current Needle Angle Pill */}
          <div className="absolute -bottom-2 px-3 py-1 bg-[#18191e] border border-[#272930] rounded-lg text-xs font-mono font-bold text-white shadow">
            Pointer: {state.dialAngle}°
          </div>
        </div>

        {/* Nudge Fine-Tuning Buttons (Only active team during guess phase) */}
        {state.phase === 'guessing' && isActiveTeamMember && (
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => nudgeDial(-5)}
              className="btn-tactile px-2.5 py-1.5 rounded-xl bg-[#18191e] hover:bg-[#202228] text-zinc-300 border border-[#272930] text-xs font-mono"
              title="Nudge 5° Left"
            >
              -5°
            </button>
            <button
              onClick={() => nudgeDial(-1)}
              className="btn-tactile px-2.5 py-1.5 rounded-xl bg-[#18191e] hover:bg-[#202228] text-zinc-300 border border-[#272930] text-xs font-mono"
              title="Nudge 1° Left"
            >
              -1°
            </button>
            <span className="text-xs text-zinc-500 font-mono px-2">Fine-Tune</span>
            <button
              onClick={() => nudgeDial(1)}
              className="btn-tactile px-2.5 py-1.5 rounded-xl bg-[#18191e] hover:bg-[#202228] text-zinc-300 border border-[#272930] text-xs font-mono"
              title="Nudge 1° Right"
            >
              +1°
            </button>
            <button
              onClick={() => nudgeDial(5)}
              className="btn-tactile px-2.5 py-1.5 rounded-xl bg-[#18191e] hover:bg-[#202228] text-zinc-300 border border-[#272930] text-xs font-mono"
              title="Nudge 5° Right"
            >
              +5°
            </button>
          </div>
        )}

        {/* Phase Specific Interaction Consoles */}

        {/* 1. Clue Phase */}
        {state.phase === 'clue' && (
          <div className="w-full max-w-md space-y-3">
            {isPsychic ? (
              <form onSubmit={handleSubmitClue} className="space-y-3">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
                  💡 <strong>Psychic Clue:</strong> Look at the target angle above. Type a single clue representing this point on the spectrum, then transmit it!
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clueInput}
                    onChange={(e) => setClueInput(e.target.value)}
                    placeholder="Enter clue (e.g. 'Walking on sunshine', 'Black coffee')..."
                    className="flex-1 bg-[#18191e] border border-[#272930] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                    maxLength={60}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!clueInput.trim()}
                    className="btn-tactile px-4 py-2.5 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Transmit</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 bg-[#18191e] border border-[#272930] rounded-xl text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs text-zinc-300">
                  <span className="animate-spin text-sm">🔮</span>
                  <span>Waiting for Psychic to think and transmit a clue...</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Psychic is viewing the secret target location.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2. Guessing Phase */}
        {state.phase === 'guessing' && (
          <div className="w-full max-w-md space-y-3 text-center">
            {/* Clue Banner */}
            <div className="p-4 bg-[#18191e] border border-[#272930] rounded-xl space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Psychic Clue
              </span>
              <div className="text-lg font-bold text-white tracking-wide">
                &ldquo;{state.clue}&rdquo;
              </div>
            </div>

            {isActiveTeamMember ? (
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">
                  Drag the needle or use nudge buttons above to point where &ldquo;{state.clue}&rdquo; belongs!
                </p>
                <button
                  onClick={() => {
                    soundFX.playClick();
                    onAction({ type: 'LOCK_GUESS' });
                  }}
                  className="btn-tactile w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs uppercase tracking-wider transition shadow-sm"
                >
                  Lock Dial Guess 🔒
                </button>
              </div>
            ) : (
              <p className="text-xs text-zinc-400">
                Team {activeTeam.name} is currently discussing and aiming the pointer...
              </p>
            )}
          </div>
        )}

        {/* 3. Counter-Guess Phase (Competitive Mode) */}
        {state.phase === 'counter_guess' && (
          <div className="w-full max-w-md space-y-3 text-center">
            <div className="p-4 bg-[#18191e] border border-[#272930] rounded-xl space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Psychic Clue
              </span>
              <div className="text-base font-bold text-white">&ldquo;{state.clue}&rdquo;</div>
              <div className="text-xs text-zinc-400 font-mono">
                Team dialed: {state.dialAngle}°
              </div>
            </div>

            {isOpposingMember || isHost ? (
              <div className="space-y-2">
                <p className="text-xs text-amber-300 font-medium">
                  Opposing Team Counter-Guess (+1 bonus pt): Is the true target LEFT or RIGHT of the needle?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      soundFX.playClick();
                      onAction({ type: 'SUBMIT_COUNTER_GUESS', guess: 'left' });
                    }}
                    className="btn-tactile py-3 rounded-xl bg-[#18191e] hover:bg-[#22242a] text-zinc-200 hover:text-white border border-[#272930] text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>LEFT of Needle</span>
                  </button>
                  <button
                    onClick={() => {
                      soundFX.playClick();
                      onAction({ type: 'SUBMIT_COUNTER_GUESS', guess: 'right' });
                    }}
                    className="btn-tactile py-3 rounded-xl bg-[#18191e] hover:bg-[#22242a] text-zinc-200 hover:text-white border border-[#272930] text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <span>RIGHT of Needle</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400">
                Waiting for the opposing team to make their Left/Right counter-guess...
              </p>
            )}
          </div>
        )}

        {/* 4. Reveal Phase */}
        {state.phase === 'reveal' && state.lastRoundResult && (
          <div className="w-full max-w-md space-y-4 text-center animate-in fade-in">
            <div className="p-4 bg-[#18191e] border border-[#272930] rounded-xl space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Round Result
              </span>

              <div className="text-2xl font-extrabold text-white">
                {state.lastRoundResult.points === 4 && '🎯 Bullseye! (+4 pts)'}
                {state.lastRoundResult.points === 3 && '✨ Great Read! (+3 pts)'}
                {state.lastRoundResult.points === 2 && '👍 Close Call! (+2 pts)'}
                {state.lastRoundResult.points === 0 && '💨 Missed Target (+0 pts)'}
              </div>

              <div className="text-xs text-zinc-400 font-mono">
                Target: {state.targetAngle}° • Guess: {state.dialAngle}° • Diff: {state.lastRoundResult.diff.toFixed(1)}°
              </div>

              {state.lastRoundResult.counterPoints ? (
                <div className="text-xs text-sky-400 font-medium">
                  Opponents guessed {state.counterGuess?.toUpperCase()} correctly! (+1 pt)
                </div>
              ) : null}
            </div>

            <button
              onClick={() => {
                soundFX.playClick();
                onAction({ type: 'NEXT_ROUND' });
              }}
              className="btn-tactile w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs uppercase tracking-wider transition shadow-sm"
            >
              Next Round ➡️
            </button>
          </div>
        )}

        {/* 5. Game Over Phase */}
        {state.phase === 'gameover' && (
          <div className="w-full max-w-md space-y-4 text-center animate-in zoom-in-95">
            <div className="p-6 bg-[#18191e] border border-amber-500/30 rounded-2xl space-y-3">
              <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">
                {state.mode === 'coop'
                  ? 'Co-op Session Completed!'
                  : `${state.winnerTeam === 'brain' ? 'Team Brain' : 'Team Mind'} Wins!`}
              </h3>
              <p className="text-xs text-zinc-400">
                {state.mode === 'coop'
                  ? `Your table scored a total of ${state.teams.brain.score} points!`
                  : `Final Score: Brain ${state.teams.brain.score} - Mind ${state.teams.mind.score}`}
              </p>
            </div>

            {onReturnToLobby && (
              <button
                onClick={onReturnToLobby}
                className="btn-tactile w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs uppercase tracking-wider transition shadow-sm"
              >
                Back to Lobby
              </button>
            )}
          </div>
        )}
      </div>

      {/* History Log Drawer */}
      {showHistory && (
        <div className="bg-[#111215] border border-[#222429] rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#222429]">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <History className="w-4 h-4 text-zinc-400" />
              <span>Round History Log</span>
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-zinc-500 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          {state.history.length === 0 ? (
            <p className="text-xs text-zinc-500">No rounds completed yet.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {state.history.map((entry, idx) => (
                <div
                  key={idx}
                  className="bg-[#18191e] border border-[#272930] rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white">
                      R{entry.round}: &ldquo;{entry.clue}&rdquo;
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {entry.card.leftTh} ⟷ {entry.card.rightTh}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-emerald-400">+{entry.points} pts</span>
                    <div className="text-[10px] text-zinc-500">
                      Target {entry.targetAngle}° / Dial {entry.dialAngle}°
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
