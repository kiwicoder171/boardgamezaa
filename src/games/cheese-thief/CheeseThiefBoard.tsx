'use client';

import React, { useState, useEffect } from 'react';
import {
  CheeseThiefAction,
  CheeseThiefPhase,
  CheeseThiefPlayer,
  CheeseThiefRole,
  CheeseThiefState,
} from './types';

interface CheeseThiefBoardProps {
  state: CheeseThiefState;
  myPlayerId: string;
  isHost: boolean;
  onAction: (action: CheeseThiefAction) => void;
  onReturnToLobby?: () => void;
}

// Web Audio sound synthesizer for physical tabletop immersion
let isGlobalAudioMuted = false;
function playSfx(type: 'shake' | 'tick' | 'swipe' | 'bell' | 'squeak' | 'gavel') {
  if (typeof window === 'undefined' || isGlobalAudioMuted) return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;

    if (type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'shake') {
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150 + Math.random() * 200, now + i * 0.05);
        gain.gain.setValueAtTime(0.15, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.04);
      }
    } else if (type === 'swipe') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'bell') {
      [523.25, 659.25, 783.99].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      });
    } else if (type === 'squeak') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.linearRampToValueAtTime(1800, now + 0.1);
      osc.frequency.linearRampToValueAtTime(1400, now + 0.18);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'gavel') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch {
    // AudioContext blocked or unavailable
  }
}

export const CheeseThiefBoard: React.FC<CheeseThiefBoardProps> = ({
  state,
  myPlayerId,
  isHost,
  onAction,
  onReturnToLobby,
}) => {
  const [showRoleCard, setShowRoleCard] = useState<boolean>(true);
  const [peekedNotification, setPeekedNotification] = useState<string | null>(null);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [showRulesGuide, setShowRulesGuide] = useState<boolean>(false);

  // Sync mute state
  useEffect(() => {
    isGlobalAudioMuted = soundMuted;
  }, [soundMuted]);

  const me: CheeseThiefPlayer | undefined = state.players[myPlayerId];
  const isNight = state.phase === 'night';
  const isMyHour = isNight && me?.dieValue === state.currentHour;
  const isThief = me?.role === 'thief';
  const isFollower = me?.isFollower;
  const isFallMouse = me?.role === 'fall_mouse';

  // Determine who is awake at the current hour
  const awakePlayerIds = isNight
    ? state.playerOrder.filter((id) => state.players[id].dieValue === state.currentHour)
    : [];
  const amIAwake = isMyHour;
  const isAloneAwake = amIAwake && awakePlayerIds.length === 1;

  // Sound triggers on hour changes
  useEffect(() => {
    if (state.phase === 'night') {
      playSfx('tick');
    } else if (state.phase === 'day') {
      playSfx('bell');
    } else if (state.phase === 'voting') {
      playSfx('gavel');
    }
  }, [state.phase, state.currentHour]);

  // Local countdown timers to eliminate 1-second network POST spam
  const [localHourSeconds, setLocalHourSeconds] = useState(state.hourSecondsRemaining);
  const [localDaySeconds, setLocalDaySeconds] = useState(state.daySecondsRemaining);

  useEffect(() => {
    setLocalHourSeconds(state.hourSecondsRemaining);
  }, [state.hourSecondsRemaining, state.currentHour]);

  useEffect(() => {
    setLocalDaySeconds(state.daySecondsRemaining);
  }, [state.daySecondsRemaining]);

  // Host ticker timer - only dispatches transition action when seconds expire
  useEffect(() => {
    if (state.phase !== 'night' && state.phase !== 'day') return;

    const interval = setInterval(() => {
      if (state.phase === 'night') {
        setLocalHourSeconds((prev) => {
          if (prev <= 1) {
            if (isHost) {
              onAction({ type: 'tick_second' });
            }
            return 0;
          }
          return prev - 1;
        });
      } else if (state.phase === 'day') {
        setLocalDaySeconds((prev) => {
          if (prev <= 1) {
            if (isHost) {
              onAction({ type: 'tick_second' });
            }
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isHost, state.phase, onAction]);

  // Bot automation: Setup ready
  useEffect(() => {
    if (!isHost || state.phase !== 'setup') return;
    const unreadyBot = state.playerOrder.find(
      (id) => (id.startsWith('bot_') || id.startsWith('mouse_bot_')) && !state.players[id]?.isReady
    );
    if (!unreadyBot) return;

    const timer = setTimeout(() => {
      onAction({ type: 'set_ready', playerId: unreadyBot });
    }, 400);

    return () => clearTimeout(timer);
  }, [isHost, state.phase, state.players, state.playerOrder, onAction]);

  // Bot automation: Voting
  useEffect(() => {
    if (!isHost || state.phase !== 'voting') return;
    const unvotedBot = state.playerOrder.find(
      (id) =>
        (id.startsWith('bot_') || id.startsWith('mouse_bot_')) &&
        !state.players[id]?.votedTargetId
    );
    if (!unvotedBot) return;

    const timer = setTimeout(() => {
      const candidates = state.playerOrder.filter((id) => id !== unvotedBot);
      if (candidates.length > 0) {
        const targetId = candidates[Math.floor(Math.random() * candidates.length)];
        onAction({ type: 'cast_vote', playerId: unvotedBot, targetId });
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [isHost, state.phase, state.players, state.playerOrder, onAction]);

  const handleStealCheese = () => {
    playSfx('swipe');
    onAction({ type: 'steal_cheese', playerId: myPlayerId });
  };

  const handlePeekCup = (targetId: string) => {
    playSfx('shake');
    onAction({ type: 'peek_cup', playerId: myPlayerId, targetId });
    const target = state.players[targetId];
    setPeekedNotification(`You peeked under ${target?.name}'s cup and saw Die: 🎲 ${target?.dieValue || '?'}`);
  };

  const handleChooseFollower = (targetId: string) => {
    playSfx('squeak');
    onAction({ type: 'choose_follower', playerId: myPlayerId, targetId });
  };

  const handleCastVote = (targetId: string) => {
    playSfx('gavel');
    onAction({ type: 'cast_vote', playerId: myPlayerId, targetId });
  };

  // Color palette for wooden dice cups
  const cupColors = [
    'from-amber-700 to-amber-900 border-amber-500',
    'from-red-800 to-red-950 border-red-500',
    'from-blue-800 to-blue-950 border-blue-500',
    'from-emerald-800 to-emerald-950 border-emerald-500',
    'from-purple-800 to-purple-950 border-purple-500',
    'from-orange-800 to-orange-950 border-orange-500',
    'from-teal-800 to-teal-950 border-teal-500',
    'from-pink-800 to-pink-950 border-pink-500',
  ];

  return (
    <div className="relative min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center select-none overflow-x-hidden font-sans pb-16">
      {/* Table Background Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(120, 53, 15, 0.25) 0%, rgba(28, 25, 23, 0.95) 75%), repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 2px, transparent 2px, transparent 6px)',
        }}
      />

      {/* Top Header: Clock Tower & Phase Status */}
      <header className="relative z-10 w-full max-w-5xl px-4 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-stone-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl shadow-inner">
            🧀
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wide text-amber-400 font-serif flex items-center gap-2">
              Cheese Thief
              <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/50">
                Jolly Thinkers
              </span>
            </h1>
            <p className="text-xs text-stone-400">Social Deduction & Hidden Dice Game</p>
          </div>
        </div>

        {/* Clock Tower Display */}
        <div
          className={`flex items-center gap-3 bg-stone-900/90 border px-4 py-2 rounded-2xl shadow-xl transition ${
            amIAwake || (state.phase === 'voting' && !me?.votedTargetId)
              ? 'border-amber-400 shadow-amber-950/40 turn-spotlight'
              : 'border-stone-700'
          }`}
        >
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Tavern Clock</span>
            <div className="flex items-center gap-1.5 text-lg font-mono font-bold text-amber-300">
              <span className="text-xl">🕰️</span>
              {state.phase === 'night' ? (
                <span>{state.currentHour}:00 AM ({localHourSeconds}s)</span>
              ) : state.phase === 'day' ? (
                <span className="text-yellow-300">Discussion ({Math.floor(localDaySeconds / 60)}:{(localDaySeconds % 60).toString().padStart(2, '0')})</span>
              ) : state.phase === 'voting' ? (
                <span className="text-red-400">Voting Time!</span>
              ) : state.phase === 'game_over' ? (
                <span className="text-emerald-400">Game Concluded</span>
              ) : (
                <span className="text-stone-300">Pre-Night Setup</span>
              )}
            </div>
          </div>

          {/* Quick controls for host & utility buttons */}
          <div className="flex items-center gap-2 pl-3 border-l border-stone-700">
            {isHost && (
              <>
                {state.phase === 'setup' && (
                  <button
                    onClick={() => onAction({ type: 'start_night' })}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold rounded-lg transition"
                  >
                    Start Night
                  </button>
                )}
                {state.phase === 'night' && (
                  <button
                    onClick={() => onAction({ type: 'advance_hour' })}
                    className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-xs font-semibold rounded-lg"
                    title="Manually advance to next hour"
                  >
                    Next Hour ⏩
                  </button>
                )}
                {state.phase === 'day' && (
                  <button
                    onClick={() => onAction({ type: 'start_voting' })}
                    className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-lg"
                  >
                    Vote Now 🗳️
                  </button>
                )}
                {state.phase === 'voting' && (
                  <button
                    onClick={() => onAction({ type: 'resolve_votes' })}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold rounded-lg shadow"
                  >
                    Verdict 📜
                  </button>
                )}
              </>
            )}

            {/* Rules Guide Button */}
            <button
              onClick={() => setShowRulesGuide(true)}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 text-xs font-semibold flex items-center gap-1"
              title="Tavern Rules & Roles Guide"
            >
              📖
            </button>

            {/* Sound Toggle Button */}
            <button
              onClick={() => setSoundMuted(!soundMuted)}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs"
              title={soundMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {soundMuted ? '🔇' : '🔊'}
            </button>

            {/* Lobby Button */}
            {onReturnToLobby && (
              <button
                onClick={onReturnToLobby}
                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs font-semibold"
                title="Return to Room Lobby"
              >
                Lobby
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Oval Table Area */}
      <main className="relative z-10 w-full max-w-5xl px-4 my-auto py-6 flex flex-col items-center">
        {/* Table Felt & Wood Border */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[520px] rounded-[60px] bg-amber-950/40 border-[12px] border-amber-950/80 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_0_80px_rgba(0,0,0,0.8)] flex items-center justify-center p-6">
          {/* Felt Inner Surface */}
          <div className="absolute inset-2 rounded-[48px] bg-stone-900/90 border border-amber-900/30 overflow-hidden flex items-center justify-center">
            {/* Ambient Lighting depending on phase */}
            {isNight && (
              <div
                className={`absolute inset-0 transition-opacity duration-700 ${
                  amIAwake ? 'bg-indigo-950/40' : 'bg-black/85'
                }`}
              />
            )}
            {state.phase === 'day' && (
              <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />
            )}

            {/* Central Platter & Golden Cheese Token */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              {/* Wooden Platter */}
              <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-stone-800/90 border-4 border-amber-900/60 shadow-2xl flex flex-col items-center justify-center relative p-3">
                {/* Carved Wood Rim Ring */}
                <div className="absolute inset-2 rounded-full border border-stone-700/50 pointer-events-none" />

                {!state.cheeseStolen ? (
                  <div className="flex flex-col items-center text-center">
                    {/* Golden Cheese Wedge */}
                    <div
                      onClick={() => {
                        if (isMyHour && isThief && !state.cheeseStolen) {
                          handleStealCheese();
                        }
                      }}
                      className={`text-6xl sm:text-7xl filter drop-shadow-[0_10px_15px_rgba(245,158,11,0.5)] transition-all transform duration-300 ${
                        isMyHour && isThief
                          ? 'cursor-pointer hover:scale-110 animate-bounce'
                          : 'cursor-default'
                      }`}
                    >
                      🧀
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300 mt-2">
                      Royal Cheese
                    </span>
                    {isMyHour && isThief && (
                      <button
                        onClick={handleStealCheese}
                        className="mt-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-full shadow-lg transition animate-pulse"
                      >
                        Swipe Cheese! 🐾
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="text-4xl text-stone-600 mb-1">🍽️</div>
                    <span className="text-sm font-bold text-red-400">Cheese Stolen!</span>
                    <span className="text-[11px] text-stone-400 max-w-[120px]">
                      Only crumbs remain on the platter...
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Seated Players around the table */}
            {state.playerOrder.map((id, index) => {
              const p = state.players[id];
              const isMe = id === myPlayerId;
              const total = state.playerOrder.length;
              // Angle for oval layout
              const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
              // X and Y percentages (40% radius oval)
              const left = 50 + 38 * Math.cos(angle);
              const top = 50 + 36 * Math.sin(angle);

              const isAwakeNow = isNight && p.dieValue === state.currentHour;
              const canISeeCup = isMe || (me?.peekedTargetId === id && me.peekedTargetDie !== null) || state.phase === 'game_over';
              const canIPeekThisTarget = isAloneAwake && !me?.hasPeeked && !isMe;
              const canISelectAsFollower =
                isNight && isMyHour && isThief && !isMe && p.dieValue === state.currentHour && p.role === 'sleepyhead' && !state.followerId;

              return (
                <div
                  key={id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
                  style={{ left: `${left}%`, top: `${top}%` }}
                >
                  {/* Spotlight on awake players */}
                  {isAwakeNow && amIAwake && (
                    <div className="absolute -inset-4 rounded-full bg-amber-400/20 blur-md pointer-events-none animate-pulse" />
                  )}

                  {/* Player Avatar & Status */}
                  <div className="relative flex flex-col items-center">
                    {/* Dice Cup */}
                    <div className="relative mb-1">
                      <div
                        className={`w-14 h-16 sm:w-16 sm:h-20 rounded-t-2xl rounded-b-lg bg-gradient-to-b ${
                          cupColors[index % cupColors.length]
                        } border-2 shadow-xl flex flex-col items-center justify-between p-1 transition-transform duration-300 ${
                          canISeeCup ? '-translate-y-2' : ''
                        }`}
                      >
                        {/* Cup Texture Rings */}
                        <div className="w-full h-1 bg-amber-400/20 rounded-full mt-1" />

                        {/* Secret Die inside/under cup */}
                        {canISeeCup ? (
                          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white text-stone-900 rounded-lg shadow-md flex items-center justify-center font-bold text-lg border border-stone-300">
                            🎲 {p.dieValue}
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-200/60 font-mono">
                            {state.phase === 'night' ? 'SHUT' : 'HIDDEN'}
                          </div>
                        )}

                        <div className="w-full h-1 bg-amber-400/20 rounded-full mb-1" />
                      </div>

                      {/* Solo Peek Action Button */}
                      {canIPeekThisTarget && (
                        <button
                          onClick={() => handlePeekCup(id)}
                          className="absolute -top-3 -right-2 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-full shadow-lg border border-emerald-400 animate-bounce"
                        >
                          Peek 👁️
                        </button>
                      )}

                      {/* Thief Follower Selection Button */}
                      {canISelectAsFollower && (
                        <button
                          onClick={() => handleChooseFollower(id)}
                          className="absolute -top-3 -right-2 px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded-full shadow-lg border border-purple-400 animate-pulse"
                        >
                          Recruit 🤝
                        </button>
                      )}
                    </div>

                    {/* Mouse Avatar & Badge */}
                    <div
                      className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center text-xl shadow-md transition ${
                        isMe
                          ? `border-amber-400 bg-amber-950/80 ring-2 ring-amber-400/50 ${amIAwake ? 'turn-spotlight' : ''}`
                          : 'border-stone-600 bg-stone-800'
                      }`}
                    >
                      {p.avatar || '🐭'}

                      {/* Awake indicator */}
                      {isNight && (
                        <span
                          className={`absolute -top-1 -right-1 text-xs px-1 rounded-full ${
                            isAwakeNow && amIAwake ? 'bg-amber-500 text-stone-950' : 'bg-stone-700 text-stone-400'
                          }`}
                        >
                          {isAwakeNow && amIAwake ? '👀' : '💤'}
                        </span>
                      )}

                      {/* Voting Target Button */}
                      {state.phase === 'voting' && !isMe && !me?.votedTargetId && (
                        <button
                          onClick={() => handleCastVote(id)}
                          className="absolute -bottom-2 px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-full shadow-lg"
                        >
                          Vote 👉
                        </button>
                      )}

                      {/* Vote indicator */}
                      {state.phase === 'voting' && p.votedTargetId && (
                        <span className="absolute -bottom-2 text-[10px] bg-stone-900 border border-stone-600 px-1 rounded text-stone-300">
                          {isMe ? 'Voted' : 'Locked'}
                        </span>
                      )}

                      {/* Game Over Roles reveal */}
                      {state.phase === 'game_over' && (
                        <span
                          className={`absolute -bottom-3 text-[10px] px-1.5 py-0.2 rounded font-bold shadow ${
                            p.role === 'thief'
                              ? 'bg-amber-600 text-white'
                              : p.role === 'fall_mouse'
                              ? 'bg-purple-600 text-white'
                              : p.isFollower
                              ? 'bg-indigo-600 text-white'
                              : 'bg-stone-700 text-stone-300'
                          }`}
                        >
                          {p.role === 'thief'
                            ? 'Thief 🧀'
                            : p.role === 'fall_mouse'
                            ? 'Fall Mouse 🎭'
                            : p.isFollower
                            ? 'Follower 🤝'
                            : 'Sleepyhead'}
                        </span>
                      )}
                    </div>

                    {/* Name Label */}
                    <span className="mt-1 text-xs font-semibold text-stone-200 truncate max-w-[80px] text-center">
                      {p.name} {isMe && '(You)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Night Eyes-Closed Blindfold Overlay when player is asleep */}
        {isNight && !amIAwake && (
          <div className="mt-4 px-6 py-3 rounded-2xl bg-stone-900/90 border border-stone-800 text-center max-w-md shadow-2xl flex items-center gap-3">
            <span className="text-3xl">💤</span>
            <div className="text-left">
              <h4 className="text-sm font-bold text-stone-300">Eyes Closed — You are asleep</h4>
              <p className="text-xs text-stone-400">
                Clock is at <span className="text-amber-400">{state.currentHour}:00 AM</span>. Your die is{' '}
                <span className="text-amber-300 font-bold">🎲 {me?.dieValue}</span>. Wait for your hour!
              </p>
            </div>
          </div>
        )}

        {/* Solo Peek Notification Banner */}
        {peekedNotification && (
          <div className="mt-3 px-4 py-2 bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs rounded-xl shadow-lg flex items-center justify-between gap-4">
            <span>{peekedNotification}</span>
            <button
              onClick={() => setPeekedNotification(null)}
              className="text-stone-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Discussion / Voting Guidance */}
        {state.phase === 'day' && (
          <div className="mt-4 w-full max-w-xl bg-amber-950/30 border border-amber-800/50 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                ☀️ Morning Investigation Phase
              </h3>
              <p className="text-xs text-stone-300 mt-1">
                The cheese is gone! Discuss: What hour did you wake up? Did you see anyone? Did you peek under any cup?
              </p>
            </div>
            {isHost && (
              <button
                onClick={() => onAction({ type: 'start_voting' })}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow whitespace-nowrap"
              >
                Call for Vote 🗳️
              </button>
            )}
          </div>
        )}

        {/* Game Over Banner */}
        {state.phase === 'game_over' && (
          <div className="mt-6 w-full max-w-xl bg-[#111215] border border-[#222429] p-6 rounded-2xl shadow-2xl text-center flex flex-col items-center">
            <span className="text-5xl mb-2">
              {state.winner === 'sleepyheads' ? '🧀🎉' : state.winner === 'fall_mouse' ? '🎭👑' : '🐭👑'}
            </span>
            <h2 className="text-2xl font-black font-serif text-amber-400 mb-2">
              {state.winner === 'sleepyheads'
                ? 'Sleepyheads Win!'
                : state.winner === 'fall_mouse'
                ? 'Fall Mouse Solo Victory!'
                : 'Cheese Thief & Follower Win!'}
            </h2>
            <p className="text-sm text-zinc-400 max-w-md mb-4">{state.winReason}</p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onAction({ type: 'reset_game' })}
                className="btn-tactile bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg transition"
              >
                Play Again 🔄
              </button>
              {onReturnToLobby && (
                <button
                  onClick={onReturnToLobby}
                  className="btn-tactile bg-[#18191e] hover:bg-[#22242a] text-zinc-300 border border-[#272930] font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg transition"
                >
                  Return to Lobby 🏛️
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Secret Role Card */}
      <footer className="fixed bottom-4 left-4 z-40">
        <div
          onClick={() => setShowRoleCard(!showRoleCard)}
          className="cursor-pointer bg-stone-900/95 border border-stone-700 hover:border-amber-500/60 p-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
            {isThief ? '🧀' : isFallMouse ? '🎭' : '😴'}
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400 flex items-center gap-1.5">
              <span>Your Secret Role</span>
              <span className="text-amber-400 text-xs">{showRoleCard ? '▲' : '▼'}</span>
            </div>
            <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <span>
                {isThief ? 'Cheese Thief' : isFallMouse ? 'Fall Mouse' : 'Sleepyhead'}
              </span>
              {isFollower && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/80 text-indigo-300 border border-indigo-500">
                  Follower 🤝
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Role Details */}
        {showRoleCard && (
          <div className="mt-2 w-72 bg-stone-900/95 border border-stone-700 p-4 rounded-2xl shadow-2xl backdrop-blur-md text-xs text-stone-300">
            <div className="font-bold text-stone-200 mb-1">Your Objective:</div>
            {isThief ? (
              <p className="text-stone-300">
                You are the <strong className="text-amber-400">Cheese Thief</strong>! When Hour{' '}
                <strong className="text-amber-300">{me?.dieValue}:00 AM</strong> arrives, swipe the central
                cheese. Deceive the others and avoid receiving the most votes during the trial.
              </p>
            ) : isFallMouse ? (
              <p className="text-stone-300">
                You are the <strong className="text-purple-400">Fall Mouse</strong>! You win ALONE if you
                convince everyone to cast the most votes against you! Act suspicious, bluff, and take the blame!
              </p>
            ) : (
              <p className="text-stone-300">
                You are a <strong className="text-sky-300">Sleepyhead</strong>. Wake up at Hour{' '}
                <strong className="text-amber-300">{me?.dieValue}:00 AM</strong>. If you are alone, peek under
                one cup! Discuss with fellow mice and vote for the real Cheese Thief!
              </p>
            )}

            {isFollower && (
              <div className="mt-2 pt-2 border-t border-stone-800 text-indigo-300 font-semibold">
                🤝 You witnessed the theft at Hour {me?.dieValue}:00 AM and became the <strong>Accomplice (Follower)</strong>! Your allegiance is now with the
                Thief. Protect the Thief so neither of you receives the most votes!
              </div>
            )}
          </div>
        )}
      </footer>

      {/* TAVERN RULES & ROLES MODAL */}
      {showRulesGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111215] border border-[#222429] rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col text-zinc-200">
            <div className="flex items-center justify-between border-b border-[#222429] pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🧀</span>
                <div>
                  <h3 className="text-xl font-bold font-serif text-zinc-100">Cheese Thief Rules & Roles</h3>
                  <div className="text-xs text-zinc-500">Jolly Thinkers • Hidden Dice Social Deduction</div>
                </div>
              </div>
              <button
                onClick={() => setShowRulesGuide(false)}
                className="p-1.5 rounded-xl bg-[#18191e] border border-[#272930] text-zinc-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 text-xs text-zinc-300 leading-relaxed">
              <div className="p-3 bg-[#141518] border border-[#272930] rounded-xl">
                <strong className="text-amber-300">Premise:</strong> Everyone is a mouse sleeping at the inn. Secretly peek under your cup to view your Wake-Up Hour die (1–6). During the night, the Clock strikes each hour from 1:00 AM to 6:00 AM.
              </div>

              <div className="p-3 bg-[#141518] border border-[#272930] rounded-xl space-y-1">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">🐭 Night Phase (Hours 1:00 to 6:00 AM)</h4>
                <p className="text-zinc-400">
                  When your hour is called, you wake up!
                  <br />• <strong className="text-zinc-200">Solo Waker:</strong> If you are the ONLY mouse awake at your hour, you may secretly peek under ONE fellow player&apos;s cup!
                  <br />• <strong className="text-zinc-200">Multiple Wakers:</strong> If two or more mice share the same hour, you make eye contact, but neither may peek under any cups!
                  <br />• <strong className="text-zinc-200">Cheese Thief:</strong> At your hour, swipe the golden cheese from the platter into your pocket!
                </p>
              </div>

              <div className="p-3 bg-[#141518] border border-[#272930] rounded-xl space-y-1">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">🤝 The Thief&apos;s Accomplice (Follower)</h4>
                <p className="text-zinc-400">
                  If any Sleepyhead shares the same wake-up hour as the Cheese Thief, they witness the crime and become the Thief&apos;s <strong>Accomplice</strong>! The Accomplice switches allegiance and wins if the Thief wins. However, if either the Thief OR the Accomplice receives the most votes, Sleepyheads win! If no one shares the Thief&apos;s hour, the Thief operates alone with no accomplice.
                </p>
              </div>

              <div className="p-3 bg-[#141518] border border-[#272930] rounded-xl space-y-1">
                <h4 className="font-bold text-purple-400 uppercase tracking-wider text-[11px]">🎭 Fall Mouse (Expansion Role)</h4>
                <p className="text-zinc-400">
                  The Fall Mouse wants to take the blame! If the Fall Mouse receives the most votes at the trial, the Fall Mouse wins alone!
                </p>
              </div>

              <div className="p-3 bg-[#141518] border border-[#272930] rounded-xl space-y-1">
                <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">🗳️ Morning Discussion & Verdict</h4>
                <p className="text-zinc-400">
                  Day arrives! Players discuss who woke up at which hour, who saw whom, and who stole the cheese. Then everyone votes simultaneously. If the Cheese Thief (or their Accomplice) is among the most voted (including ties!), the Sleepyheads win! If an innocent mouse receives the most votes, the Thief & Accomplice win!
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#222429] text-right">
              <button
                onClick={() => setShowRulesGuide(false)}
                className="btn-tactile bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs px-5 py-2.5 rounded-xl"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
