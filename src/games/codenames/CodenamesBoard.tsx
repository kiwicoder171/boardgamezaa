'use client';

import React, { useState } from 'react';
import {
  CardType,
  CodenamesAction,
  CodenamesCard,
  CodenamesPlayer,
  CodenamesState,
  PlayerRole,
  TeamColor,
} from './types';
import { CardFlip } from '@/components/ui/CardFlip';

interface CodenamesBoardProps {
  state: CodenamesState;
  players: Array<{ id: string; name: string; avatar?: string }>;
  currentPlayerId: string;
  isHost: boolean;
  onAction: (action: CodenamesAction) => void;
  onReturnToLobby: () => void;
}

// Web Audio sound synthesizer for physical tabletop espionage immersion
let isCodenamesAudioMuted = false;
function playCodenamesSfx(type: 'typewriter' | 'reveal' | 'wrong' | 'assassin' | 'victory') {
  if (typeof window === 'undefined' || isCodenamesAudioMuted) return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;

    if (type === 'typewriter') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } else if (type === 'reveal') {
      [440, 554.37, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.2, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.2);
      });
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.25);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'assassin') {
      // Gunshot / explosion impact
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (type === 'victory') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.3, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.5);
      });
    }
  } catch {
    // AudioContext blocked
  }
}

export const CodenamesBoard: React.FC<CodenamesBoardProps> = ({
  state,
  currentPlayerId,
  isHost,
  onAction,
  onReturnToLobby,
}) => {
  const [clueWord, setClueWord] = useState('');
  const [clueCount, setClueCount] = useState<number>(1);
  const [spymasterVisionToggle, setSpymasterVisionToggle] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [showManual, setShowManual] = useState<boolean>(false);
  const [showIntelLog, setShowIntelLog] = useState<boolean>(false);
  const [pinnedCardIds, setPinnedCardIds] = useState<string[]>([]);

  React.useEffect(() => {
    isCodenamesAudioMuted = soundMuted;
  }, [soundMuted]);

  const me: CodenamesPlayer | undefined = state.players[currentPlayerId];
  const isSpymaster = me?.role === 'spymaster' || spymasterVisionToggle;
  const isMyTeamTurn = me?.team === state.currentTeam;
  const canGiveClue = isMyTeamTurn && me?.role === 'spymaster' && state.turnPhase === 'clue';
  const canGuess = isMyTeamTurn && me?.role === 'operative' && state.turnPhase === 'guess';

  const handleGiveClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clueWord.trim()) return;

    playCodenamesSfx('typewriter');
    onAction({
      type: 'give_clue',
      word: clueWord.trim().toUpperCase(),
      count: clueCount,
    });
    setClueWord('');
  };

  const handleGuessCard = (card: CodenamesCard) => {
    if (card.revealed) return;
    if (state.turnPhase !== 'guess') return;

    if (card.type === 'assassin') {
      playCodenamesSfx('assassin');
    } else if (card.type === state.currentTeam) {
      playCodenamesSfx('reveal');
    } else {
      playCodenamesSfx('wrong');
    }

    onAction({ type: 'guess_card', cardId: card.id });
  };

  const handleEndGuessing = () => {
    playCodenamesSfx('reveal');
    onAction({ type: 'end_guessing' });
  };

  const handleSwitchTeam = (team: TeamColor) => {
    onAction({ type: 'set_team', playerId: currentPlayerId, team });
  };

  const handleSwitchRole = (role: PlayerRole) => {
    onAction({ type: 'set_role', playerId: currentPlayerId, role });
  };

  return (
    <div className="relative min-h-screen bg-[#111620] text-stone-100 flex flex-col items-center select-none overflow-x-hidden font-sans pb-24">
      {/* Tabletop Intelligence Briefing Felt Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(30, 41, 59, 0.4) 0%, rgba(10, 15, 26, 0.95) 75%), repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 2px, transparent 2px, transparent 6px)',
        }}
      />

      {/* Header Bar */}
      <header className="relative z-10 w-full max-w-6xl px-4 pt-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-stone-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 via-stone-800 to-blue-600 border-2 border-stone-600 flex items-center justify-center text-2xl shadow-xl font-black font-mono">
            🕵️
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider text-stone-100 font-mono flex items-center gap-2">
              CODENAMES
              <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 font-sans">
                {state.theme === 'scifi'
                  ? 'Sci-Fi Pack'
                  : state.theme === 'fairytales'
                  ? 'Fairy Tales Pack'
                  : 'Classic Edition'}
              </span>
            </h1>
            <p className="text-xs text-stone-400">Classified Intelligence Word Association Game</p>
          </div>
        </div>

        {/* Central Agency Scoreboard */}
        <div className="flex items-center gap-5 bg-stone-900/90 border border-stone-700 px-5 py-2.5 rounded-2xl shadow-xl">
          {/* Red Team Score */}
          <div
            className={`flex items-center gap-2.5 px-3 py-1 rounded-xl transition-all ${
              state.currentTeam === 'red'
                ? 'bg-rose-950/80 border border-rose-500 shadow-md scale-105 turn-spotlight'
                : 'opacity-70'
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-rose-300">Red Agency</span>
              <span className="text-lg font-black font-mono text-rose-400 leading-tight">
                {state.redRemaining} Left
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-stone-700" />

          {/* Blue Team Score */}
          <div
            className={`flex items-center gap-2.5 px-3 py-1 rounded-xl transition-all ${
              state.currentTeam === 'blue'
                ? 'bg-sky-950/80 border border-sky-500 shadow-md scale-105 turn-spotlight'
                : 'opacity-70'
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-sky-300">Blue Agency</span>
              <span className="text-lg font-black font-mono text-sky-400 leading-tight">
                {state.blueRemaining} Left
              </span>
            </div>
          </div>

          {/* Quick Spymaster Vision Toggle */}
          <button
            onClick={() => setSpymasterVisionToggle(!spymasterVisionToggle)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              spymasterVisionToggle
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-white'
            }`}
            title="Toggle Spymaster Classified Vision Map"
          >
            <span>{spymasterVisionToggle ? '👁️ Spymaster' : '🕶️ Operative'}</span>
          </button>

          {/* Intel Clue Log */}
          <button
            onClick={() => setShowIntelLog(true)}
            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs font-semibold flex items-center gap-1"
            title="Intel Clue Transmission History"
          >
            📜 Log
          </button>

          {/* Field Manual */}
          <button
            onClick={() => setShowManual(true)}
            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 text-xs font-semibold flex items-center gap-1"
            title="Field Operatives Manual & Rules"
          >
            📖
          </button>

          {/* Sound Mute Toggle */}
          <button
            onClick={() => setSoundMuted(!soundMuted)}
            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs"
            title={soundMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>

          {/* Return to Lobby */}
          <button
            onClick={onReturnToLobby}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl border border-stone-700"
            title="Return to Room Lobby"
          >
            Lobby
          </button>
        </div>
      </header>

      {/* Main Grid Area */}
      <main className="relative z-10 w-full max-w-5xl px-4 py-6 flex flex-col items-center gap-5">
        {/* Active Clue Announcement Banner */}
        {state.currentClue && (
          <div
            className={`w-full max-w-xl p-3.5 rounded-2xl border flex items-center justify-between shadow-2xl backdrop-blur-md ${
              state.currentClue.team === 'red'
                ? 'bg-rose-950/80 border-rose-500/80 text-rose-200'
                : 'bg-sky-950/80 border-sky-500/80 text-sky-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔎</span>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  {state.currentClue.team.toUpperCase()} Spymaster Clue:
                </span>
                <div className="text-xl font-black font-mono tracking-widest text-white">
                  &quot;{state.currentClue.word}&quot; : {state.currentClue.count}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/20">
                {state.guessesRemaining} guess(es) left
              </span>
              {canGuess && (
                <button
                  onClick={handleEndGuessing}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-600 shadow transition"
                >
                  End Turn ⏩
                </button>
              )}
            </div>
          </div>
        )}

        {/* 5x5 Grid of 25 Word Cards */}
        <div className="grid grid-cols-5 gap-3 w-full max-w-4xl aspect-[5/4] p-4 rounded-3xl bg-stone-900/90 border-4 border-stone-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          {state.grid.map((card) => {
            const isRevealed = card.revealed;
            const cardType = card.type; // On client, masked to 'neutral' for unrevealed cards unless spymaster or game over
            const isPinned = pinnedCardIds.includes(card.id);

            return (
              <div
                key={card.id}
                onClick={() => {
                  if (!isRevealed && state.turnPhase === 'guess') {
                    handleGuessCard(card);
                  }
                }}
                className={`relative w-full h-full min-h-[75px] sm:min-h-[95px] select-none cursor-pointer transition-transform ${
                  isPinned && !isRevealed ? 'ring-4 ring-amber-400 shadow-amber-500/50 scale-[1.02]' : ''
                } ${!isRevealed && state.turnPhase === 'guess' ? 'hover:scale-[1.03]' : ''}`}
              >
                {/* Pin Suspect Marker Button */}
                {!isRevealed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinnedCardIds((prev) =>
                        prev.includes(card.id) ? prev.filter((id) => id !== card.id) : [...prev, card.id]
                      );
                    }}
                    className={`absolute top-1.5 right-1.5 z-30 px-1 py-0.5 rounded text-[10px] transition ${
                      isPinned ? 'bg-amber-400 text-stone-950 font-bold shadow' : 'opacity-25 hover:opacity-100 text-stone-700 bg-black/10'
                    }`}
                    title={isPinned ? 'Unmark Suspect Pin' : 'Pin Suspect for Discussion'}
                  >
                    📌
                  </button>
                )}

                <CardFlip
                  isFlipped={isRevealed}
                  className="w-full h-full"
                  front={
                    <div
                      className={`w-full h-full rounded-2xl flex flex-col items-center justify-between p-2 shadow-md transition-colors ${
                        isSpymaster
                          ? cardType === 'red'
                            ? 'bg-[#e2d5c3] border-4 border-rose-500 text-stone-900 shadow-rose-500/20'
                            : cardType === 'blue'
                            ? 'bg-[#e2d5c3] border-4 border-sky-500 text-stone-900 shadow-sky-500/20'
                            : cardType === 'assassin'
                            ? 'bg-[#e2d5c3] border-4 border-stone-950 text-stone-900 shadow-black'
                            : 'bg-[#e2d5c3] border-2 border-[#b5a48e] text-stone-800'
                          : 'bg-[#ede3d4] hover:bg-[#f5ecdd] border-2 border-[#c8b79f] text-stone-900 shadow-lg'
                      }`}
                    >
                      {/* Vintage Top Inverted Word for Table-facing opponents */}
                      <span className="transform rotate-180 text-[9px] font-mono font-bold tracking-tight opacity-40 uppercase truncate max-w-full">
                        {card.word}
                      </span>

                      {/* Primary Card Word */}
                      <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-center uppercase text-stone-900 my-auto">
                        {card.word}
                      </span>

                      {/* Bottom Spymaster Icon Marker */}
                      {isSpymaster ? (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                            cardType === 'red'
                              ? 'bg-rose-600 text-white'
                              : cardType === 'blue'
                              ? 'bg-sky-600 text-white'
                              : cardType === 'assassin'
                              ? 'bg-stone-900 text-white'
                              : 'bg-stone-400 text-stone-900'
                          }`}
                        >
                          {cardType === 'red'
                            ? 'Red'
                            : cardType === 'blue'
                            ? 'Blue'
                            : cardType === 'assassin'
                            ? 'Assassin 💀'
                            : 'Bystander'}
                        </span>
                      ) : (
                        <div className="h-2" />
                      )}
                    </div>
                  }
                  back={
                    <div
                      className={`w-full h-full rounded-2xl flex flex-col items-center justify-between p-2 shadow-md ${
                        cardType === 'red'
                          ? 'bg-gradient-to-br from-rose-600 to-rose-800 border-2 border-rose-400 text-white'
                          : cardType === 'blue'
                          ? 'bg-gradient-to-br from-sky-600 to-sky-800 border-2 border-sky-400 text-white'
                          : cardType === 'assassin'
                          ? 'bg-gradient-to-br from-stone-900 to-black border-2 border-rose-600 text-white'
                          : 'bg-stone-700/80 border-2 border-stone-500 text-stone-300'
                      }`}
                    >
                      <span className="text-2xl mt-1">
                        {cardType === 'red'
                          ? '🔴'
                          : cardType === 'blue'
                          ? '🔵'
                          : cardType === 'assassin'
                          ? '💀'
                          : '👤'}
                      </span>
                      <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-center uppercase text-white drop-shadow mb-1">
                        {card.word}
                      </span>
                      <div className="h-1" />
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>

        {/* Spymaster Clue Input Console */}
        {state.turnPhase === 'clue' && (
          <form
            onSubmit={handleGiveClue}
            className="w-full max-w-xl bg-stone-900/90 border-2 border-stone-700 p-4 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center gap-3 backdrop-blur-md"
          >
            <div className="flex-1 w-full">
              <label className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block mb-1">
                {state.currentTeam.toUpperCase()} Spymaster Clue (Single Word)
              </label>
              <input
                type="text"
                value={clueWord}
                onChange={(e) => setClueWord(e.target.value.toUpperCase())}
                placeholder="ENTER CODEWORD..."
                className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl font-mono font-bold text-stone-100 placeholder:text-stone-600 uppercase focus:outline-none focus:border-amber-400 text-sm"
              />
            </div>

            <div className="w-24">
              <label className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block mb-1">
                Cards Count
              </label>
              <select
                value={clueCount}
                onChange={(e) => setClueCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl font-mono font-bold text-stone-100 text-sm focus:outline-none focus:border-amber-400"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                  <option key={num} value={num}>
                    {num === 0 ? '0 (Unlimited)' : num}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!clueWord.trim()}
              className="mt-auto sm:mt-5 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Transmit Clue 📡
            </button>
          </form>
        )}
      </main>

      {/* Floating Bottom Agency Controls & Team Selection */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 border-t border-stone-800 px-4 py-3 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto rounded-t-3xl">
        {/* Your Dossier */}
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow border-2 ${
              me?.team === 'red'
                ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                : 'bg-sky-950/80 border-sky-500 text-sky-300'
            }`}
          >
            {me?.role === 'spymaster' ? '🕶️' : '🕵️'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-stone-200">{me?.name || 'Player'}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  me?.team === 'red'
                    ? 'bg-rose-900/60 text-rose-300 border border-rose-600'
                    : 'bg-sky-900/60 text-sky-300 border border-sky-600'
                }`}
              >
                {me?.team} Agency • {me?.role}
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              {me?.role === 'spymaster'
                ? 'You see all card identities. Transmit 1-word clues!'
                : 'Discuss with teammates and touch suspected cards!'}
            </p>
          </div>
        </div>

        {/* Team & Role Switchers */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-stone-900 p-1 border border-stone-800">
            <button
              onClick={() => handleSwitchTeam('red')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                me?.team === 'red' ? 'bg-rose-600 text-white shadow' : 'text-stone-400 hover:text-white'
              }`}
            >
              Red Team
            </button>
            <button
              onClick={() => handleSwitchTeam('blue')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                me?.team === 'blue' ? 'bg-sky-600 text-white shadow' : 'text-stone-400 hover:text-white'
              }`}
            >
              Blue Team
            </button>
          </div>

          <div className="flex items-center rounded-xl bg-stone-900 p-1 border border-stone-800">
            <button
              onClick={() => handleSwitchRole('spymaster')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                me?.role === 'spymaster' ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-white'
              }`}
            >
              Spymaster 🕶️
            </button>
            <button
              onClick={() => handleSwitchRole('operative')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                me?.role === 'operative' ? 'bg-stone-700 text-white shadow' : 'text-stone-400 hover:text-white'
              }`}
            >
              Operative 🕵️
            </button>
          </div>
        </div>
      </footer>

      {/* Game Over Modal */}
      {state.winner && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border-2 border-amber-400 p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl flex flex-col items-center">
            <span className="text-6xl mb-3">{state.winner === 'red' ? '🔴🎉' : '🔵🎉'}</span>
            <h2 className="text-3xl font-black font-mono tracking-wider text-amber-300 mb-2 uppercase">
              {state.winner} Team Triumphs!
            </h2>
            <p className="text-sm text-stone-300 mb-6">{state.winReason}</p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onAction({ type: 'reset_game' })}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black font-mono text-xs uppercase tracking-wider rounded-xl shadow-xl transition"
              >
                Play Another Mission 🔄
              </button>
              {onReturnToLobby && (
                <button
                  onClick={onReturnToLobby}
                  className="px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-black font-mono text-xs uppercase tracking-wider rounded-xl shadow-xl transition"
                >
                  Return to Lobby 🏛️
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INTEL CLUE TRANSMISSION LOG MODAL */}
      {showIntelLog && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121622] border-2 border-stone-700 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col text-stone-200">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📜</span>
                <div>
                  <h3 className="text-xl font-bold font-mono text-amber-400">Classified Clue Intel Log</h3>
                  <div className="text-xs text-stone-400">Chronological Transmissions & Contact Reports</div>
                </div>
              </div>
              <button
                onClick={() => setShowIntelLog(false)}
                className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 text-xs font-mono max-h-96">
              {state.logs.length === 0 ? (
                <div className="text-stone-500 text-center py-8">
                  No clue transmissions logged yet this match.
                </div>
              ) : (
                state.logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 leading-relaxed"
                  >
                    {log.text}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-stone-800 text-right">
              <button
                onClick={() => setShowIntelLog(false)}
                className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs"
              >
                Close Intel Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIELD OPERATIVES & SPYMASTER MANUAL MODAL */}
      {showManual && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#10141f] border-2 border-amber-600/60 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col text-stone-200">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🕵️</span>
                <div>
                  <h3 className="text-xl font-bold font-mono text-amber-400">Codenames Field Manual</h3>
                  <div className="text-xs text-stone-400">Classified Espionage Rules & Protocols</div>
                </div>
              </div>
              <button
                onClick={() => setShowManual(false)}
                className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs text-stone-300 leading-relaxed font-sans">
              <div className="p-3 bg-stone-900 border border-amber-500/30 rounded-2xl">
                <strong className="text-amber-300">Objective:</strong> Two rival Spymasters know the secret identities of 25 agents. Teammates must decode one-word clues to contact all friendly agents before the opponent does—without contacting the deadly Assassin!
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider font-mono">🕶️ Giving Clues (Spymaster)</h4>
                <p>
                  Transmit <strong>1 single word</strong> and <strong>1 number</strong> (indicating how many cards relate to that word).
                  <br />• Your clue word must NOT be any word currently unrevealed on the table.
                  <br />• Clue number <strong>0 (Unlimited)</strong> permits operatives to guess as many cards as they like.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sky-400 uppercase tracking-wider font-mono">🕵️ Guessing Cards (Operatives)</h4>
                <p>
                  Operatives touch cards one by one:
                  <br />• <strong>Friendly Agent:</strong> Success! The team may make another guess (up to clue count + 1 bonus guess) or click <strong>End Turn ⏩</strong>.
                  <br />• <strong>Bystander:</strong> Neutral civilian. Turn ends immediately.
                  <br />• <strong>Opposing Agent:</strong> Turn ends immediately, and the other team gets a free agent contact!
                  <br />• <strong>Assassin 💀:</strong> Sudden Death! Your team loses immediately!
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-emerald-400 uppercase tracking-wider font-mono">📌 Pinning Suspects</h4>
                <p>
                  Click the <strong>📌 pin icon</strong> on any card to mark it as a tentative suspect while debating with teammates before committing to touch it.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-800 text-right">
              <button
                onClick={() => setShowManual(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider font-mono"
              >
                Acknowledge Protocol
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodenamesBoard;
