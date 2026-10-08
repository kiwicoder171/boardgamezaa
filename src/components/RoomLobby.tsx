'use client';

import React, { useState } from 'react';
import { GameDefinition, Player, Room } from '@/types/game';
import { soundFX } from '@/lib/sounds';
import {
  BookOpen,
  Check,
  Clock,
  Copy,
  Crown,
  Play,
  Settings,
  Share2,
  Users,
  Bot,
  Sparkles,
  Layers,
  ShieldAlert,
} from 'lucide-react';

interface RoomLobbyProps {
  room: Room;
  games: GameDefinition[];
  currentPlayerId: string;
  isHost: boolean;
  onSelectGame: (gameId: string) => void;
  onUpdateSettings: (settings: any) => void;
  onToggleReady: (isReady: boolean) => void;
  onStartGame: () => void;
  onAddBotPlayer?: () => void;
}

const GAME_FONTS: Record<string, string> = {
  'sky-team': 'font-scifi text-sky-300',
  'werewolf': 'font-fantasy text-purple-300',
  'cheese-thief': 'font-serifDisplay text-amber-300',
  'splendor': 'font-fantasy text-amber-200',
  'codenames': 'font-typewriter text-amber-200',
  'bomb-busters': 'font-scifi text-red-300',
  'spyfall': 'font-typewriter text-stone-200',
};

export default function RoomLobby({
  room,
  games,
  currentPlayerId,
  isHost,
  onSelectGame,
  onUpdateSettings,
  onToggleReady,
  onStartGame,
  onAddBotPlayer,
}: RoomLobbyProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesActiveTab, setRulesActiveTab] = useState<'summary' | 'sections'>('summary');

  const selectedGame = games.find((g) => g.id === room.selectedGameId) || games[0];
  const me = room.players.find((p) => p.id === currentPlayerId);

  const copyRoomCode = () => {
    soundFX.playClick();
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyRoomLink = () => {
    soundFX.playClick();
    const link = `${window.location.origin}/room/${room.code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const hasEnoughPlayers = selectedGame
    ? room.players.length >= selectedGame.minPlayers
    : false;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Top Invite Banner with Wood & Felt Table Trim */}
      <div className="bg-gradient-to-r from-[#111927] via-[#0d1422] to-[#151c2e] border-2 border-amber-900/40 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="text-xs font-black tracking-widest text-amber-400 uppercase flex items-center justify-center md:justify-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Private Table Dispatcher</span>
          </div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <h1 className="text-4xl sm:text-5xl font-black text-white font-mono tracking-widest bg-black/40 px-4 py-1 rounded-2xl border border-white/10 shadow-inner">
              {room.code}
            </h1>
            <button
              onClick={copyRoomCode}
              className="btn-tactile p-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700 shadow-md"
              title="Copy Room Code"
              aria-label="Copy Room Code"
            >
              {copiedCode ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Share this 4-letter room code or link with friends to seat them at the table.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-center">
          <button
            onClick={copyRoomLink}
            className="btn-tactile px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 shadow-sm"
          >
            {copiedLink ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Share2 className="w-4 h-4 text-amber-400" />
            )}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
          </button>

          {onAddBotPlayer && isHost && (
            <button
              onClick={onAddBotPlayer}
              className="btn-tactile px-4 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-2 shadow-sm"
              title="Add a test player to easily verify multi-seat gameplay"
            >
              <Bot className="w-4 h-4 text-amber-400" />
              <span>+ Add Test Player</span>
            </button>
          )}

          <button
            onClick={() => {
              soundFX.playClick();
              setShowRulesModal(true);
            }}
            className="btn-tactile px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>📖 Rules & Materials</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Game Picker & Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Game Selection */}
          <div className="bg-[#0e1524] border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2 font-fantasy">
                  <span>🎲</span> Tabletop Title Selector
                </h2>
                <p className="text-xs text-slate-400">
                  {isHost
                    ? 'As Table Host, choose which board game to play next.'
                    : 'The Table Host selects the active game.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {games.map((game) => {
                const isSelected = game.id === room.selectedGameId;
                const fontClass = GAME_FONTS[game.id] || 'text-white';
                return (
                  <div
                    key={game.id}
                    onClick={() => {
                      if (isHost && !isSelected) {
                        soundFX.playClick();
                        onSelectGame(game.id);
                      }
                    }}
                    className={`relative rounded-2xl p-5 border transition-all text-left flex flex-col justify-between gap-3 btn-tactile ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#1a2337] via-[#101725] to-[#1d263b] border-amber-500 ring-2 ring-amber-500/40 shadow-xl'
                        : isHost
                        ? 'bg-[#121929] border-slate-800 hover:border-slate-700 hover:bg-[#182236] cursor-pointer'
                        : 'bg-[#101522] border-slate-800/80 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-3xl p-2.5 rounded-xl bg-black/40 border border-white/10 inline-block shadow-inner">
                          {game.icon}
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full shadow-sm">
                            ★ Selected Game
                          </span>
                        )}
                      </div>

                      <h3 className={`text-xl font-black mt-3 ${fontClass}`}>{game.name}</h3>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                        {game.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-medium">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {game.minPlayers} - {game.maxPlayers} players
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {game.durationMinutes}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Game Settings Customization */}
          {selectedGame && selectedGame.settingsSchema.length > 0 && (
            <div className="bg-[#0e1524] border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <span>{selectedGame.name} Table Rules & Expansions</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedGame.settingsSchema.map((field) => {
                  const currentValue =
                    room.gameSettings[field.key] ?? field.default;

                  return (
                    <div
                      key={field.key}
                      className="bg-[#141b2a] rounded-2xl p-4 border border-slate-800 space-y-2 shadow-inner"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-200">
                          {field.label}
                        </label>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {currentValue}
                        </span>
                      </div>
                      {field.description && (
                        <p className="text-[11px] text-slate-400">{field.description}</p>
                      )}

                      {field.type === 'number' && (
                        <input
                          type="range"
                          disabled={!isHost}
                          min={field.min ?? 1}
                          max={field.max ?? 20}
                          step={field.step ?? 1}
                          value={currentValue}
                          onChange={(e) => {
                            if (isHost) {
                              onUpdateSettings({
                                [field.key]: parseInt(e.target.value, 10),
                              });
                            }
                          }}
                          className="w-full accent-amber-500 disabled:opacity-50"
                        />
                      )}

                      {field.type === 'select' && (
                        <select
                          disabled={!isHost}
                          value={currentValue}
                          onChange={(e) => {
                            if (isHost) {
                              onUpdateSettings({
                                [field.key]: isNaN(Number(e.target.value))
                                  ? e.target.value
                                  : Number(e.target.value),
                              });
                            }
                          }}
                          className="w-full bg-[#0a0f19] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
                        >
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.type === 'boolean' && (
                        <button
                          type="button"
                          disabled={!isHost}
                          onClick={() => {
                            if (isHost) {
                              onUpdateSettings({
                                [field.key]: !currentValue,
                              });
                            }
                          }}
                          className={`btn-tactile w-full py-2 rounded-xl text-xs font-bold border transition ${
                            currentValue
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          } disabled:opacity-50`}
                        >
                          {currentValue ? 'Enabled ✓' : 'Disabled ✗'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Player Roster & Start Button */}
        <div className="space-y-6">
          <div className="bg-[#0e1524] border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>Players Seated ({room.players.length})</span>
              </h2>
              {selectedGame && (
                <span className="text-xs text-slate-400 font-mono">
                  Min: {selectedGame.minPlayers}
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {room.players.map((player) => {
                const isMe = player.id === currentPlayerId;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      isMe
                        ? 'bg-[#192336] border-amber-500/40 ring-1 ring-amber-500/30'
                        : 'bg-[#121827] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl p-1.5 bg-black/40 rounded-xl border border-white/5">
                        {player.avatar}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                          <span>{player.name}</span>
                          {isMe && (
                            <span className="text-[10px] text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          {player.isHost && (
                            <span className="text-amber-400 flex items-center gap-0.5 font-bold">
                              <Crown className="w-3 h-3" /> Host
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {player.isReady ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                          Ready ✓
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-700/40 text-slate-400 px-2 py-0.5 rounded-full">
                          Waiting
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ready Toggle Button for non-host */}
            {me && !isHost && (
              <button
                onClick={() => {
                  soundFX.playClick();
                  onToggleReady(!me.isReady);
                }}
                className={`btn-tactile w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition ${
                  me.isReady
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {me.isReady ? 'You Are Ready ✓' : 'Mark Ready'}
              </button>
            )}

            {/* Big Start Game Button for Host */}
            {isHost && (
              <div className="space-y-2 pt-2">
                <button
                  disabled={!hasEnoughPlayers}
                  onClick={() => {
                    soundFX.playStart();
                    onStartGame();
                  }}
                  className={`btn-tactile w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl ${
                    hasEnoughPlayers
                      ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-950/60 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Begin Game Match</span>
                </button>

                {!hasEnoughPlayers && selectedGame && (
                  <p className="text-[11px] text-center text-amber-400/90 font-medium">
                    Need at least {selectedGame.minPlayers} players to start (currently{' '}
                    {room.players.length}). Share the invite code or click &quot;+ Add Test Player&quot; above!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thematic Tabletop Rules & Component Manual Modal */}
      {showRulesModal && selectedGame && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0f1728] border-2 border-amber-900/50 rounded-3xl p-6 max-w-2xl w-full space-y-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl p-2 bg-black/40 rounded-2xl border border-white/10">{selectedGame.icon}</span>
                <div>
                  <h3 className="text-2xl font-black text-white font-fantasy">{selectedGame.name} Official Rules</h3>
                  <div className="text-xs text-slate-400">{selectedGame.description}</div>
                </div>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="btn-tactile p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                aria-label="Close Rules Manual"
              >
                ✕
              </button>
            </div>

            {/* Tabbed Bite-Sized Information Selector */}
            <div className="flex gap-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setRulesActiveTab('summary')}
                className={`btn-tactile px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  rulesActiveTab === 'summary'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Core Objective & Gameplay
              </button>
              <button
                onClick={() => setRulesActiveTab('sections')}
                className={`btn-tactile px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  rulesActiveTab === 'sections'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Detailed Turn Guide & Sections ({selectedGame.rules.sections.length})
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-sm text-slate-300">
              {rulesActiveTab === 'summary' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-200 leading-relaxed">
                    <span className="font-bold text-amber-300">Overview: </span>
                    {selectedGame.rules.summary}
                  </div>

                  <div className="p-4 bg-[#141d30] border border-slate-800 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      Tabletop Component Guide
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      All physical tokens, cards, and dice are simulated in real time with anti-cheat state masking. Secret roles and unplaced dice are concealed until legally revealed.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedGame.rules.sections.map((sec, idx) => (
                    <div key={idx} className="p-3.5 bg-[#141d30] rounded-2xl border border-slate-800 space-y-1">
                      <h4 className="font-black text-amber-300 text-xs uppercase tracking-wider">
                        {sec.title}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{sec.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                👥 {selectedGame.minPlayers} - {selectedGame.maxPlayers} Players • ⏱️ {selectedGame.durationMinutes}
              </span>
              <button
                onClick={() => setShowRulesModal(false)}
                className="btn-tactile px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md"
              >
                Ready to Play!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
