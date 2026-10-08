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
  UserX,
  Pencil,
} from 'lucide-react';
import { DEFAULT_AVATARS } from '@/lib/storage';
import RulesModal from '@/components/RulesModal';

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
  onKickPlayer?: (playerId: string) => void;
  onUpdateProfile?: (name: string, avatar: string) => void;
}

const GAME_FONTS: Record<string, string> = {
  'sky-team': 'font-scifi text-sky-300',
  'werewolf': 'font-fantasy text-purple-300',
  'cheese-thief': 'font-serifDisplay text-amber-300',
  'splendor': 'font-fantasy text-amber-200',
  'codenames': 'font-typewriter text-amber-200',
  'bomb-busters': 'font-scifi text-red-300',
  'spyfall': 'font-typewriter text-stone-200',
  'wavelength': 'font-mono text-cyan-300',
  'one-night-werewolf': 'font-fantasy text-purple-300',
  'for-sale': 'font-mono text-emerald-400',
  'coup': 'font-serifDisplay text-rose-300',
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
  onKickPlayer,
  onUpdateProfile,
}: RoomLobbyProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [optimisticGameId, setOptimisticGameId] = useState<string | null>(null);

  // Category filter state
  const CATEGORIES = ['All', 'Co-op', 'Social Deduction', 'Strategy', 'Party'] as const;
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Instant optimistic game selection
  const activeGameId = optimisticGameId || room.selectedGameId;
  const selectedGame = games.find((g) => g.id === activeGameId) || games[0];
  const me = room.players.find((p) => p.id === currentPlayerId);

  // Inline profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(me?.name || '');
  const [editAvatar, setEditAvatar] = useState(me?.avatar || '🎲');

  React.useEffect(() => {
    if (me && !isEditingProfile) {
      setEditName(me.name);
      setEditAvatar(me.avatar);
    }
  }, [me?.name, me?.avatar, isEditingProfile]);

  const handleSaveProfile = () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    soundFX.playClick();
    onUpdateProfile?.(trimmed, editAvatar);
    setIsEditingProfile(false);
  };

  // Reset optimistic state when server room updates
  React.useEffect(() => {
    setOptimisticGameId(null);
  }, [room.selectedGameId]);

  const filteredGames = games.filter((game) => {
    if (selectedCategory === 'All') return true;
    return game.tags.some((tag) =>
      tag.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  });


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
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Invite Banner */}
      <div className="bg-[#111215] border border-[#222429] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="space-y-1 text-center md:text-left">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            Room Code
          </div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-widest bg-[#18191e] px-4 py-1 rounded-xl border border-[#272930]">
              {room.code}
            </h1>
            <button
              onClick={copyRoomCode}
              className="btn-tactile p-2.5 bg-[#18191e] hover:bg-[#22242a] text-zinc-300 rounded-xl border border-[#272930] transition"
              title="Copy Room Code"
              aria-label="Copy Room Code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Share code or invite link to join this room.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 justify-center">
          <button
            onClick={copyRoomLink}
            className="btn-tactile px-3.5 py-2 rounded-xl bg-[#18191e] hover:bg-[#22242a] text-zinc-200 border border-[#272930] font-medium text-xs flex items-center gap-2 transition"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          {onAddBotPlayer && isHost && (
            <button
              onClick={onAddBotPlayer}
              className="btn-tactile px-3.5 py-2 rounded-xl bg-[#18191e] hover:bg-[#22242a] text-zinc-300 border border-[#272930] font-medium text-xs flex items-center gap-1.5 transition"
              title="Add a test player to easily verify multi-seat gameplay"
            >
              <Bot className="w-3.5 h-3.5 text-zinc-400" />
              <span>+ Add Bot</span>
            </button>
          )}

          <button
            onClick={() => {
              soundFX.playClick();
              setShowRulesModal(true);
            }}
            className="btn-tactile px-3.5 py-2 rounded-xl bg-[#18191e] hover:bg-[#22242a] text-zinc-200 border border-[#272930] font-medium text-xs flex items-center gap-1.5 transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>Rules</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Game Picker & Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Game Selection */}
          <div className="bg-[#111215] border border-[#222429] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">
                  Select Game
                </h2>
                <p className="text-xs text-zinc-400">
                  {isHost
                    ? 'As Table Host, choose which game to play.'
                    : 'The Table Host selects the active game.'}
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setSelectedCategory(cat);
                    }}
                    className={`btn-tactile px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-white text-zinc-950 font-bold shadow-xs'
                        : 'bg-[#18191e] text-zinc-400 hover:text-white border border-[#272930]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredGames.map((game) => {
                const isSelected = game.id === activeGameId;
                return (
                  <div
                    key={game.id}
                    onClick={() => {
                      if (isHost && !isSelected) {
                        soundFX.playClick();
                        setOptimisticGameId(game.id);
                        onSelectGame(game.id);
                      }
                    }}
                    className={`rounded-xl p-4 border transition-all text-left flex flex-col justify-between gap-3 btn-tactile ${
                      isSelected
                        ? 'bg-[#18191e] border-white text-white shadow-sm ring-1 ring-white/20'
                        : isHost
                        ? 'bg-[#141518] border-[#222429] hover:border-[#383b44] hover:bg-[#18191e] cursor-pointer'
                        : 'bg-[#121316] border-[#1c1d22] opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{game.icon}</span>
                        {isSelected && (
                          <span className="text-[10px] font-mono uppercase tracking-wider bg-white text-zinc-950 px-2 py-0.5 rounded font-bold">
                            Selected
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white mt-2">{game.name}</h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {game.description}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-[#1e2025] flex items-center justify-between text-xs text-zinc-500 font-mono">
                      <span>{game.minPlayers}-{game.maxPlayers} players</span>
                      <span>{game.durationMinutes}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Game Settings Customization */}
          {selectedGame && selectedGame.settingsSchema.length > 0 && (
            <div className="bg-[#111215] border border-[#222429] rounded-2xl p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold text-white">
                {selectedGame.name} Options
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {selectedGame.settingsSchema.map((field) => {
                  const currentValue =
                    room.gameSettings[field.key] ?? field.default;

                  return (
                    <div
                      key={field.key}
                      className="bg-[#16171b] rounded-xl p-3.5 border border-[#222429] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-300">
                          {field.label}
                        </label>
                        <span className="text-xs font-mono font-bold text-white">
                          {currentValue}
                        </span>
                      </div>
                      {field.description && (
                        <p className="text-[11px] text-zinc-500">{field.description}</p>
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
                          className="w-full accent-white disabled:opacity-50"
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
                          className="w-full bg-[#18191e] border border-[#272930] rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 disabled:opacity-50"
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
                              ? 'bg-white text-zinc-950 border-white'
                              : 'bg-[#18191e] text-zinc-400 border-[#272930] hover:text-white'
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
          <div className="bg-[#111215] border border-[#222429] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-400" />
                <span>Players ({room.players.length})</span>
              </h2>
              {selectedGame && (
                <span className="text-xs text-zinc-500 font-mono">
                  Min: {selectedGame.minPlayers}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {room.players.map((player) => {
                const isMe = player.id === currentPlayerId;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      isMe
                        ? 'bg-[#18191e] border-zinc-700'
                        : 'bg-[#141518] border-[#222429]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        disabled={!isMe || !onUpdateProfile}
                        onClick={() => {
                          if (isMe && onUpdateProfile) {
                            soundFX.playClick();
                            setEditName(player.name);
                            setEditAvatar(player.avatar);
                            setIsEditingProfile(true);
                          }
                        }}
                        className={`text-xl ${isMe && onUpdateProfile ? 'hover:scale-110 cursor-pointer transition' : ''}`}
                        title={isMe ? 'Change avatar' : undefined}
                      >
                        {player.avatar}
                      </button>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-white truncate flex items-center gap-1.5">
                          <span>{player.name}</span>
                          {isMe && (
                            <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded font-mono">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                          {player.isHost && (
                            <span className="text-zinc-400 flex items-center gap-0.5">
                              <Crown className="w-3 h-3 text-amber-400" /> Host
                            </span>
                          )}
                          {isMe && onUpdateProfile && (
                            <button
                              type="button"
                              onClick={() => {
                                soundFX.playClick();
                                setEditName(player.name);
                                setEditAvatar(player.avatar);
                                setIsEditingProfile(true);
                              }}
                              className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-0.5 underline-offset-2 hover:underline cursor-pointer"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                              <span>Edit profile</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isHost && !player.isHost && player.id !== currentPlayerId && onKickPlayer && (
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playClick();
                            onKickPlayer(player.id);
                          }}
                          className="btn-tactile px-2 py-1 rounded-lg bg-[#18191e] hover:bg-rose-950/70 text-zinc-400 hover:text-rose-400 border border-[#272930] hover:border-rose-900/60 transition text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                          title={`Kick ${player.name} from room`}
                          aria-label={`Kick ${player.name}`}
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Kick</span>
                        </button>
                      )}

                      {player.isReady ? (
                        <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                          Ready
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">
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
                className={`btn-tactile w-full py-2.5 rounded-xl font-semibold text-xs transition ${
                  me.isReady
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-[#1e2025] hover:bg-[#282a32] text-white border border-[#272930]'
                }`}
              >
                {me.isReady ? 'Ready ✓' : 'Mark Ready'}
              </button>
            )}

            {/* Big Start Game Button for Host */}
            {isHost && (
              <div className="space-y-2 pt-1">
                <button
                  disabled={!hasEnoughPlayers}
                  onClick={() => {
                    soundFX.playStart();
                    onStartGame();
                  }}
                  className={`btn-tactile w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                    hasEnoughPlayers
                      ? 'bg-white hover:bg-zinc-200 text-zinc-950 shadow-sm cursor-pointer'
                      : 'bg-[#18191e] text-zinc-500 border border-[#222429] cursor-not-allowed opacity-50'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Match</span>
                </button>

                {!hasEnoughPlayers && selectedGame && (
                  <p className="text-[11px] text-center text-zinc-500 font-medium">
                    Need {selectedGame.minPlayers} players to start (currently {room.players.length}).
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Profile Editor Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#111215] border border-[#222429] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#222429]">
              <h3 className="text-sm font-bold text-white">Edit Your Profile</h3>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="btn-tactile p-1 text-zinc-400 hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveProfile();
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  maxLength={20}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#18191e] border border-[#272930] focus:border-white focus:outline-none rounded-xl px-3.5 py-2 text-xs text-white"
                  placeholder="Your nickname"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Choose Avatar
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DEFAULT_AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setEditAvatar(av)}
                      className={`text-xl p-2 rounded-xl transition ${
                        editAvatar === av
                          ? 'bg-[#22242a] ring-2 ring-white scale-105'
                          : 'bg-[#18191e] hover:bg-[#22242a] border border-[#272930]'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#222429]">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="btn-tactile flex-1 py-2 rounded-xl bg-[#18191e] hover:bg-[#22242a] text-zinc-300 text-xs font-semibold border border-[#272930] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-tactile flex-1 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition shadow-sm"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Rules Modal */}
      {selectedGame && (
        <RulesModal
          isOpen={showRulesModal}
          onClose={() => setShowRulesModal(false)}
          game={selectedGame}
        />
      )}
    </div>
  );
}
