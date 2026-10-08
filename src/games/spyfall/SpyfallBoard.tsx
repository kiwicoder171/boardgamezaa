'use client';

import React, { useState, useEffect } from 'react';
import { Player } from '@/types/game';
import { SpyfallAction, SpyfallClientState } from './types';
import { LocationInfo, SPYFALL_LOCATIONS } from './data';
import { soundFX } from '@/lib/sounds';
import confetti from 'canvas-confetti';
import {
  AlertTriangle,
  Bell,
  Check,
  Clock,
  Eye,
  EyeOff,
  Filter,
  HelpCircle,
  History,
  Info,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  Star,
  User,
  Users,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from 'lucide-react';

interface SpyfallBoardProps {
  state: SpyfallClientState;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  onAction: (action: SpyfallAction) => void;
  onReturnToLobby: () => void;
}

export default function SpyfallBoard({
  state,
  players,
  currentPlayerId,
  isHost,
  onAction,
  onReturnToLobby,
}: SpyfallBoardProps) {
  // Client state
  const [isIdentityHidden, setIsIdentityHidden] = useState(false);
  const [selectedGuessLoc, setSelectedGuessLoc] = useState<string | null>(null);
  const [isGuessModalOpen, setIsGuessModalOpen] = useState(false);
  const [inspectLocation, setInspectLocation] = useState<LocationInfo | null>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showQuestionsHelp, setShowQuestionsHelp] = useState(false);

  // Scratchpad: Cross out or star locations on personal client
  const [eliminatedLocations, setEliminatedLocations] = useState<Record<string, boolean>>({});
  const [starredLocations, setStarredLocations] = useState<Record<string, boolean>>({});

  // Trigger sounds on game phases
  useEffect(() => {
    if (state.phase === 'gameover') {
      const weWon =
        (state.isSpy && state.winner === 'spy') ||
        (!state.isSpy && state.winner === 'citizens');

      if (weWon) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
        soundFX.playVictory();
      } else {
        soundFX.playAlarm();
      }
    }
  }, [state.phase, state.winner, state.isSpy]);

  useEffect(() => {
    if (state.phase === 'accusation') {
      soundFX.playAlarm();
    }
  }, [state.phase]);

  // Local smoothly-ticking countdown timers for serverless environments
  const [localTimeRemaining, setLocalTimeRemaining] = useState(state.timeRemaining);
  const [localVotingTime, setLocalVotingTime] = useState(state.votingTimeRemaining);

  useEffect(() => {
    setLocalTimeRemaining(state.timeRemaining);
  }, [state.timeRemaining]);

  useEffect(() => {
    setLocalVotingTime(state.votingTimeRemaining);
  }, [state.votingTimeRemaining]);

  // Main questioning phase countdown interval
  useEffect(() => {
    if (state.isPaused || state.phase !== 'questioning') return;

    const timer = setInterval(() => {
      setLocalTimeRemaining((prev) => {
        if (prev <= 1) {
          if (isHost) {
            onAction({ type: 'TIMES_UP' });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state.isPaused, state.phase, isHost, onAction]);

  // Accusation voting phase countdown interval
  useEffect(() => {
    if (state.phase !== 'accusation') return;

    const timer = setInterval(() => {
      setLocalVotingTime((prev) => {
        if (prev <= 1) {
          if (isHost) {
            onAction({ type: 'CANCEL_ACCUSATION' });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state.phase, isHost, onAction]);

  // Audio tick when timer is critical
  useEffect(() => {
    if (state.phase === 'questioning' && !state.isPaused && localTimeRemaining <= 10 && localTimeRemaining > 0) {
      soundFX.playTick();
    }
  }, [localTimeRemaining, state.phase, state.isPaused]);

  // Nudge reaction
  useEffect(() => {
    if (state.lastNudgeAt) {
      soundFX.playClick();
    }
  }, [state.lastNudgeAt]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFX.setEnabled(next);
  };

  const toggleCrossOut = (locName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundFX.playClick();
    setEliminatedLocations((prev) => ({
      ...prev,
      [locName]: !prev[locName],
    }));
  };

  const toggleStar = (locName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundFX.playClick();
    setStarredLocations((prev) => ({
      ...prev,
      [locName]: !prev[locName],
    }));
  };

  const minutes = Math.floor(localTimeRemaining / 60);
  const seconds = localTimeRemaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const currentAsker = players.find((p) => p.id === state.currentAskerId);
  const currentAnswerer = players.find((p) => p.id === state.currentAnswererId);
  const accuser = players.find((p) => p.id === state.accuserId);
  const accused = players.find((p) => p.id === state.accusedId);

  const isMyTurnToAsk = state.currentAskerId === currentPlayerId && !state.currentAnswererId;
  const isMyTurnToAnswer = state.currentAnswererId === currentPlayerId;
  const amIAccused = state.accusedId === currentPlayerId;
  const amIAccuser = state.accuserId === currentPlayerId;
  const hasVoted = state.votes[currentPlayerId] !== undefined;

  const categories = ['All', 'Transport', 'Leisure & Fun', 'Public & Services', 'Work & High Stakes'];

  const filteredLocations = SPYFALL_LOCATIONS.filter((loc) => {
    const matchesSearch = loc.name.toLowerCase().includes(locationSearch.toLowerCase());
    const matchesCat = activeCategory === 'All' || loc.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const myLocationInfo = state.myLocation
    ? SPYFALL_LOCATIONS.find((l) => l.name === state.myLocation)
    : null;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* CASINO GREEN TABLETOP FELT */}
      <div className="tabletop-felt-green rounded-[36px] sm:rounded-[44px] p-5 sm:p-8 space-y-8 relative overflow-hidden shadow-2xl">
        {/* TOP CONTROL BAR: Vintage Stopwatch, Turn Description, Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-950/60 pb-4">
          <div className="flex items-center gap-3">
            {/* Vintage Mechanical Stopwatch */}
            <div
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-mono text-2xl font-black tracking-wider transition shadow-inner border ${
                state.isPaused
                  ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                  : state.timeRemaining <= 60
                  ? 'bg-rose-950/80 text-rose-400 border-rose-600 animate-pulse'
                  : 'bg-black/40 text-amber-200 border-amber-900/60'
              }`}
            >
              <Clock className="w-6 h-6 text-amber-400" />
              <span>{timeFormatted}</span>
              {state.isPaused && (
                <span className="text-[10px] bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded font-sans uppercase">
                  Paused
                </span>
              )}
            </div>

            {/* Host Pause/Resume Button */}
            {isHost && state.phase === 'questioning' && (
              <button
                onClick={() => {
                  soundFX.playClick();
                  onAction({ type: 'TOGGLE_PAUSE' });
                }}
                className="p-2.5 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 text-amber-200 border border-amber-800/60 transition shadow"
                title={state.isPaused ? 'Resume Timer' : 'Pause Timer'}
              >
                {state.isPaused ? <Play className="w-4 h-4 text-emerald-400 fill-current" /> : <Pause className="w-4 h-4 text-amber-400" />}
              </button>
            )}

            <div className="text-xs hidden sm:block">
              <span className="text-amber-300/70">Table Phase: </span>
              <span className="font-serif font-bold text-amber-100 capitalize">
                {state.phase === 'questioning' ? '💬 Q&A Cross-Examination' : state.phase}
              </span>
            </div>
          </div>

          {/* Turn description indicator */}
          <div className="flex-1 max-w-md text-center px-4 py-2 bg-black/40 rounded-2xl border border-amber-900/50 text-xs sm:text-sm shadow-inner">
            {state.phase === 'questioning' && (
              <div className="flex items-center justify-center gap-2">
                {state.currentAnswererId ? (
                  <span className="text-amber-100">
                    <strong className="text-amber-300">{currentAsker?.name}</strong> is questioning{' '}
                    <strong className="text-cyan-300">{currentAnswerer?.name}</strong>
                  </span>
                ) : state.currentAskerId ? (
                  <span className="text-amber-100">
                    <strong className="text-amber-300">{currentAsker?.name}</strong> is choosing who to question
                  </span>
                ) : (
                  <span className="text-amber-200">Anyone at the table can start questioning!</span>
                )}

                {state.currentAnswererId && (isHost || isMyTurnToAsk) && (
                  <button
                    onClick={() => onAction({ type: 'NUDGE_PLAYER' })}
                    className="p-1 hover:bg-amber-900/50 text-amber-400 rounded transition"
                    title="Friendly Nudge"
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            {state.phase === 'accusation' && (
              <span className="text-rose-400 font-bold flex items-center justify-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-4 h-4" /> Unanimous Vote on {accused?.name}&apos;s guilt!
              </span>
            )}
            {state.phase === 'gameover' && (
              <span className="text-emerald-400 font-bold">Round Finished</span>
            )}
          </div>

          {/* Action icons: Audio, Logs, Return */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2.5 rounded-xl border transition shadow ${
                showHistory
                  ? 'bg-amber-600/40 border-amber-500 text-amber-200'
                  : 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-200 border-amber-900/50'
              }`}
              title="Investigation Log"
            >
              <History className="w-4 h-4" />
            </button>

            <button
              onClick={toggleSound}
              className="p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-200 border border-amber-900/50 transition shadow"
              title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-200" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            </button>

            <button
              onClick={onReturnToLobby}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-950/50 hover:bg-amber-900/70 text-amber-100 border border-amber-800/60 transition shadow"
              title="Return to Room Lobby"
            >
              {isHost ? 'End Round' : 'Lobby'}
            </button>
          </div>
        </div>

        {/* SECRET DOSSIER IDENTITY (Authentic Manila Dossier Folder) */}
        <div className="dossier-paper rounded-3xl p-6 sm:p-7 relative shadow-2xl transition-all">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-4xl shadow-inner">
                {isIdentityHidden ? '🔒' : state.isSpy ? '🕵️‍♂️' : myLocationInfo?.icon || '🗺️'}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className={state.isSpy ? 'rubber-stamp text-xs' : 'font-mono text-[11px] font-black tracking-widest text-amber-900 uppercase'}>
                    {state.isSpy ? 'TOP SECRET // SPY' : 'CONFIDENTIAL // FIELD AGENT'}
                  </span>
                  <button
                    onClick={() => {
                      soundFX.playCardFlip();
                      setIsIdentityHidden(!isIdentityHidden);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold transition flex items-center gap-1.5 text-xs shadow-sm border border-amber-400"
                    title={isIdentityHidden ? 'Reveal Identity' : 'Hide from Peeking Eyes'}
                  >
                    {isIdentityHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{isIdentityHidden ? 'Peek Dossier' : 'Conceal Dossier'}</span>
                  </button>
                </div>

                {isIdentityHidden ? (
                  <div className="text-xl font-bold text-amber-900/60 py-1 font-mono">
                    •••••••••••••••••••• (Concealed Folder)
                  </div>
                ) : (
                  <>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2 font-serif">
                      {state.isSpy ? (
                        <span className="text-rose-700 tracking-tight">YOU ARE THE INFILTRATOR</span>
                      ) : (
                        <span>
                          Secret Location: <span className="text-indigo-900 underline decoration-indigo-400">{state.myLocation}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-700 flex items-center gap-2 font-sans font-semibold">
                      <User className="w-4 h-4 text-slate-500" />
                      <span>
                        Your Assigned Role:{' '}
                        <strong className={state.isSpy ? 'text-rose-700 text-base' : 'text-amber-900 text-base font-serif'}>
                          {state.myRole}
                        </strong>
                      </span>
                      {!state.isSpy && myLocationInfo && (
                        <button
                          onClick={() => setShowQuestionsHelp(!showQuestionsHelp)}
                          className="ml-2 text-xs text-indigo-700 hover:underline flex items-center gap-1 font-bold"
                        >
                          <HelpCircle className="w-3.5 h-3.5" /> Question Prompts
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action on Dossier */}
            <div>
              {state.isSpy ? (
                <button
                  disabled={state.phase !== 'questioning'}
                  onClick={() => {
                    soundFX.playCardFlip();
                    setIsGuessModalOpen(true);
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-700 via-rose-600 to-amber-700 hover:from-rose-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-rose-950/60 border border-rose-500/40 flex items-center gap-2 disabled:opacity-40 transition transform hover:-translate-y-0.5"
                >
                  <MapPin className="w-4 h-4" />
                  Guess Secret Location!
                </button>
              ) : (
                <div className="text-right text-xs text-slate-600 max-w-xs font-serif italic">
                  Ask discreet questions without revealing the secret destination to the infiltrator!
                </div>
              )}
            </div>
          </div>

          {/* Expandable Sample Questions Helper for Non-Spies */}
          {showQuestionsHelp && myLocationInfo && !isIdentityHidden && !state.isSpy && (
            <div className="mt-4 pt-4 border-t border-amber-300 text-xs space-y-2 animate-in fade-in">
              <div className="font-bold text-amber-950 flex items-center gap-1 font-serif">
                <span>💡 Question Ideas for {myLocationInfo.name}:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {myLocationInfo.sampleQuestions.map((q, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 font-serif text-[11px] shadow-sm"
                  >
                    &quot;{q}&quot;
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

      {/* Answerer Action Prompt */}
      {isMyTurnToAnswer && state.phase === 'questioning' && (
        <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border-2 border-amber-500/60 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🗣️</span>
            <div>
              <div className="font-black text-amber-300 text-sm sm:text-base">
                You are currently in the hot seat!
              </div>
              <div className="text-xs text-slate-300">
                Answer the question verbally (or in chat), then click below to take the floor and ask someone else.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              soundFX.playClick();
              onAction({ type: 'FINISH_ANSWER' });
            }}
            className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg shadow-amber-500/30 transform hover:scale-105"
          >
            Finished Answering ✓
          </button>
        </div>
      )}

      {/* Investigation Log Drawer */}
      {showHistory && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-indigo-400" /> Investigation Events Log
            </h4>
            <button onClick={() => setShowHistory(false)} className="text-xs text-slate-500 hover:text-white">
              ✕
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2 text-xs">
            {state.history.map((item) => (
              <div
                key={item.id}
                className={`p-2 rounded-xl border ${
                  item.type === 'accuse'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : item.type === 'verdict'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-800/40 border-slate-800 text-slate-300'
                }`}
              >
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PLAYER ROSTER GRID */}
        {/* SUSPECTS SEATED AT THE TABLE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-amber-200/80 px-1 uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Suspects Seated At The Table ({players.length})
            </span>
            <span className="text-[11px] text-amber-400/60 font-mono normal-case">
              {isMyTurnToAsk ? '🎯 Click a suspect to interrogate them' : 'Click "Accuse" to call a vote'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {players.map((player) => {
              const isMe = player.id === currentPlayerId;
              const isAsker = player.id === state.currentAskerId;
              const isAnswerer = player.id === state.currentAnswererId;
              const isAccused = player.id === state.accusedId;

              return (
                <div
                  key={player.id}
                  className={`relative wooden-rack rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 shadow-xl ${
                    isAnswerer
                      ? 'ring-2 ring-amber-400 scale-[1.02]'
                      : isAsker
                      ? 'ring-2 ring-cyan-400'
                      : isAccused
                      ? 'ring-2 ring-rose-500 scale-[1.02]'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl p-2 rounded-xl bg-black/40 border border-amber-900/40 shadow-inner">
                      {player.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-serif font-black text-sm text-amber-100 truncate flex items-center gap-1.5 drop-shadow">
                        <span>{player.name}</span>
                        {isMe && (
                          <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {player.isHost && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold">
                            Host
                          </span>
                        )}
                        {isAsker && (
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded font-black uppercase">
                            Asking
                          </span>
                        )}
                        {isAnswerer && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-black uppercase animate-pulse">
                            In Hot Seat
                          </span>
                        )}
                        {isAccused && (
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded font-black uppercase animate-bounce">
                            Accused!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for player */}
                  {state.phase === 'questioning' && !isMe && (
                    <div className="flex items-center gap-2 pt-2 border-t border-amber-950/60">
                      {isMyTurnToAsk && (
                        <button
                          onClick={() => {
                            soundFX.playCardFlip();
                            onAction({ type: 'SELECT_QUESTIONEE', targetPlayerId: player.id });
                          }}
                          className="flex-1 py-1.5 px-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-black transition shadow"
                        >
                          Interrogate
                        </button>
                      )}
                      <button
                        onClick={() => {
                          soundFX.playClick();
                          onAction({ type: 'ACCUSE', targetPlayerId: player.id });
                        }}
                        className="py-1.5 px-2.5 bg-black/40 hover:bg-rose-950/60 text-rose-300 border border-amber-900/60 hover:border-rose-500/60 rounded-xl text-xs font-bold transition flex items-center gap-1"
                        title="Formally accuse suspect"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        Accuse
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CANDIDATE LOCATIONS MATRIX (Polaroid Evidence Cards) */}
        <div className="bg-black/40 border border-amber-950/60 rounded-3xl p-5 sm:p-6 space-y-5 shadow-inner">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-serif font-black text-amber-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-400" />
                Photographic Dossier: Candidate Locations ({SPYFALL_LOCATIONS.length})
              </h3>
              <p className="text-xs text-amber-200/70 font-sans mt-0.5">
                💡 <strong>Tactile Board:</strong> Click ❌ to cross out with red marker, ⭐ to star bookmark suspicions, or click any card to inspect typical roles!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-amber-400/60 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search location..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-amber-950/40 border border-amber-900/60 rounded-xl text-xs text-amber-100 placeholder-amber-400/40 focus:outline-none focus:border-amber-400 w-36 sm:w-40"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                      activeCategory === cat
                        ? 'bg-amber-600 text-slate-950 shadow'
                        : 'bg-amber-950/40 text-amber-300 hover:text-white border border-amber-900/40'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Locations Grid - Styled as Physical Polaroid Photo Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {filteredLocations.map((loc) => {
              const isTheSecretLoc = !state.isSpy && state.myLocation === loc.name;
              const isEliminated = !!eliminatedLocations[loc.name];
              const isStarred = !!starredLocations[loc.name];

              return (
                <div
                  key={loc.id}
                  onClick={() => {
                    soundFX.playCardFlip();
                    setInspectLocation(loc);
                  }}
                  className={`relative group polaroid-card flex flex-col items-center justify-between gap-1 text-center cursor-pointer select-none ${
                    isTheSecretLoc
                      ? 'ring-4 ring-cyan-500 shadow-2xl scale-105'
                      : isEliminated
                      ? 'opacity-40 grayscale line-through'
                      : isStarred
                      ? 'ring-2 ring-amber-400 shadow-lg'
                      : ''
                  }`}
                >
                  {/* Scratchpad controls (Cross-out & Star) */}
                  <div className="absolute top-1 right-1 flex items-center gap-0.5 z-10">
                    <button
                      onClick={(e) => toggleStar(loc.name, e)}
                      className={`p-1 rounded transition ${
                        isStarred ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500 opacity-0 group-hover:opacity-100'
                      }`}
                      title="Bookmark suspicion"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={(e) => toggleCrossOut(loc.name, e)}
                      className={`p-1 rounded transition ${
                        isEliminated ? 'text-rose-600' : 'text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100'
                      }`}
                      title="Cross out location"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-3xl mt-1">{loc.icon}</span>
                  <span className="text-xs font-serif font-black text-slate-800 truncate w-full px-1">
                    {loc.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans truncate w-full">
                    {loc.category}
                  </span>

                  {isTheSecretLoc && (
                    <span className="text-[8px] font-black uppercase tracking-wider bg-cyan-600 text-white px-1.5 py-0.5 rounded shadow-sm">
                      ★ Secret Spot
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LOCATION INSPECTOR MODAL */}
      {inspectLocation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{inspectLocation.icon}</span>
                <div>
                  <h3 className="text-lg font-black text-white">{inspectLocation.name}</h3>
                  <span className="text-xs text-indigo-400 font-semibold">{inspectLocation.category}</span>
                </div>
              </div>
              <button
                onClick={() => setInspectLocation(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Typical Roles List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Typical Roles at this Location:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {inspectLocation.roles.map((r) => (
                  <span
                    key={r}
                    className="text-xs px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Sample Questions */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Sample Question Ideas:
              </div>
              <div className="space-y-1 text-xs text-slate-300">
                {inspectLocation.sampleQuestions.map((q, idx) => (
                  <div key={idx} className="p-2 bg-slate-800/40 rounded-lg">
                    &quot;{q}&quot;
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={(e) => {
                  toggleCrossOut(inspectLocation.name, e);
                  setInspectLocation(null);
                }}
                className="text-xs font-bold text-rose-400 hover:underline"
              >
                {eliminatedLocations[inspectLocation.name] ? 'Un-Cross Out' : 'Cross Out Location'}
              </button>
              <button
                onClick={() => setInspectLocation(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACCUSATION MODAL OVERLAY */}
      {state.phase === 'accusation' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl shadow-rose-950/80 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 animate-pulse">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">SPY ACCUSATION!</h2>
              <p className="text-sm text-slate-300">
                <strong className="text-indigo-400">{accuser?.name}</strong> has formally accused{' '}
                <strong className="text-rose-400 text-base">{accused?.name}</strong> of being the SPY!
              </p>
              <div className="text-xs text-slate-400 font-mono">
                Voting ends in <strong className="text-amber-400">{localVotingTime}s</strong> (Unanimous guilty required)
              </div>
            </div>

            {/* Voting Progress */}
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span className="uppercase tracking-wider">Cast Votes</span>
                <span>
                  {Object.keys(state.votes).length} / {players.length - 1} Voted
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {players
                  .filter((p) => p.id !== state.accusedId)
                  .map((voter) => {
                    const vote = state.votes[voter.id];
                    return (
                      <div
                        key={voter.id}
                        className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-medium ${
                          vote === undefined
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : vote === true
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        <span>{voter.name}:</span>
                        <span>
                          {vote === undefined ? '⏳ Deciding...' : vote ? '🚨 GUILTY' : '🛡️ INNOCENT'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Voting Buttons */}
            {amIAccused ? (
              <div className="text-center p-4 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-slate-300 space-y-1">
                <div className="font-bold text-amber-300">You are on trial!</div>
                <div>Defend yourself verbally or in chat. You cannot cast a vote on your own trial.</div>
              </div>
            ) : hasVoted ? (
              <div className="text-center p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs text-slate-400">
                Your vote has been submitted. Waiting for remaining players to vote...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    soundFX.playClick();
                    onAction({ type: 'CAST_VOTE', voteGuilty: true });
                  }}
                  className="py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-900/40 transition flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Vote GUILTY
                </button>
                <button
                  onClick={() => {
                    soundFX.playClick();
                    onAction({ type: 'CAST_VOTE', voteGuilty: false });
                  }}
                  className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/40 transition flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Vote INNOCENT
                </button>
              </div>
            )}

            {/* Accuser can withdraw */}
            {amIAccuser && (
              <div className="text-center pt-2">
                <button
                  onClick={() => onAction({ type: 'CANCEL_ACCUSATION' })}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Withdraw Accusation
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SPY GUESS MODAL */}
      {isGuessModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 max-w-2xl w-full space-y-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-amber-300 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-rose-500" />
                  Spy Location Guess
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Choose the location where you believe everyone is. If correct, you win immediately! If wrong, citizens win!
                </p>
              </div>
              <button
                onClick={() => setIsGuessModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SPYFALL_LOCATIONS.map((loc) => {
                const isSelected = selectedGuessLoc === loc.name;
                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedGuessLoc(loc.name)}
                    className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-2 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-2 ring-amber-400'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-3xl">{loc.icon}</span>
                    <span className="text-xs font-bold">{loc.name}</span>
                    <span className="text-[10px] text-slate-500">{loc.category}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsGuessModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={!selectedGuessLoc}
                onClick={() => {
                  if (selectedGuessLoc) {
                    onAction({ type: 'SPY_GUESS', locationName: selectedGuessLoc });
                    setIsGuessModalOpen(false);
                  }
                }}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-900/30 disabled:opacity-40"
              >
                Confirm Guess: {selectedGuessLoc || 'None'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED MISSION DEBRIEF (GAME OVER MODAL) */}
      {state.phase === 'gameover' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-indigo-500/60 rounded-3xl p-6 sm:p-8 max-w-xl w-full text-center space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="text-6xl animate-bounce">
              {state.winner === 'spy' ? '🕵️‍♂️' : '🎉'}
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                {state.winner === 'spy' ? (
                  <span className="text-rose-400">THE SPY WINS!</span>
                ) : (
                  <span className="text-emerald-400">CITIZENS WIN!</span>
                )}
              </h2>
              <p className="text-sm text-slate-300 font-medium">{state.winReason}</p>
            </div>

            {/* Revealed Location Card */}
            <div className="bg-gradient-to-br from-indigo-950/60 to-slate-850 p-4 rounded-2xl border border-indigo-500/30 text-left space-y-1">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                Secret Location Was
              </span>
              <div className="text-2xl font-black text-white flex items-center gap-2">
                <span>{SPYFALL_LOCATIONS.find((l) => l.name === state.revealedLocation)?.icon}</span>
                <span>{state.revealedLocation || 'Unknown'}</span>
              </div>
            </div>

            {/* Complete Player Roles Roster */}
            {state.revealedRoles && (
              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 text-left space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Player Identities & Roles Revealed:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {players.map((p) => {
                    const isSpyPlayer = state.revealedSpies?.includes(p.id);
                    const roleName = state.revealedRoles?.[p.id] || 'Citizen';

                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          isSpyPlayer
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                            : 'bg-slate-800 border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{p.avatar}</span>
                          <span className="font-bold truncate">{p.name}</span>
                        </div>
                        <span className={`font-mono text-[11px] font-bold ${isSpyPlayer ? 'text-rose-400' : 'text-amber-300'}`}>
                          {roleName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Host Controls */}
            {isHost ? (
              <button
                onClick={onReturnToLobby}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-2xl transition shadow-lg shadow-indigo-900/50 text-sm uppercase tracking-wider"
              >
                Return to Lobby (Next Round or Switch Game)
              </button>
            ) : (
              <div className="text-xs text-slate-400">
                Waiting for the host to return everyone to the lobby...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
