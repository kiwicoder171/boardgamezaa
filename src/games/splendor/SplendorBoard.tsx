'use client';

import React, { useState } from 'react';
import {
  CardTier,
  DevCard,
  GemColor,
  SplendorAction,
  SplendorPlayer,
  SplendorState,
  TokenType,
} from './types';
import { canAffordCard, getPlayerGemBonuses, getTotalTokens } from './logic';

interface SplendorBoardProps {
  state: SplendorState;
  players: Array<{ id: string; name: string; avatar?: string }>;
  currentPlayerId: string;
  isHost: boolean;
  onAction: (action: SplendorAction) => void;
  onReturnToLobby: () => void;
}

// Web Audio sound synthesizer for heavy clay poker chips and royal fanfares
let isSplendorAudioMuted = false;
function playSplendorSfx(type: 'chip' | 'card' | 'noble' | 'gold' | 'win') {
  if (typeof window === 'undefined' || isSplendorAudioMuted) return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;

    if (type === 'chip') {
      // Heavy clay chip clack
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'gold') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'card') {
      // Card snap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'noble' || type === 'win') {
      // Royal fanfare
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.25, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.6);
      });
    }
  } catch {
    // AudioContext blocked
  }
}

const GEM_COLORS: GemColor[] = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'];

const GEM_CONFIG: Record<
  TokenType,
  {
    label: string;
    icon: string;
    bg: string;
    border: string;
    text: string;
    chipBg: string;
    cardBg: string;
    cardBorder: string;
    cardHeader: string;
    costPill: string;
  }
> = {
  diamond: {
    label: 'Diamond',
    icon: '💎',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    text: 'text-slate-900',
    chipBg: 'from-slate-100 to-slate-300 border-slate-400 text-slate-800',
    cardBg: 'bg-[#181d26]',
    cardBorder: 'border-slate-300/80',
    cardHeader: 'bg-gradient-to-r from-slate-200 via-white to-slate-200 text-slate-950 font-black',
    costPill: 'bg-white border-2 border-slate-300 text-slate-950 font-black shadow-sm',
  },
  sapphire: {
    label: 'Sapphire',
    icon: '🔷',
    bg: 'bg-blue-600',
    border: 'border-blue-400',
    text: 'text-white',
    chipBg: 'from-blue-600 to-blue-800 border-blue-400 text-white',
    cardBg: 'bg-[#0e1d38]',
    cardBorder: 'border-blue-500/80',
    cardHeader: 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white font-black',
    costPill: 'bg-blue-600 border border-blue-300 text-white font-black shadow-sm',
  },
  emerald: {
    label: 'Emerald',
    icon: '🟢',
    bg: 'bg-emerald-600',
    border: 'border-emerald-400',
    text: 'text-white',
    chipBg: 'from-emerald-600 to-emerald-800 border-emerald-400 text-white',
    cardBg: 'bg-[#0a261a]',
    cardBorder: 'border-emerald-500/80',
    cardHeader: 'bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white font-black',
    costPill: 'bg-emerald-600 border border-emerald-300 text-white font-black shadow-sm',
  },
  ruby: {
    label: 'Ruby',
    icon: '🔴',
    bg: 'bg-rose-600',
    border: 'border-rose-400',
    text: 'text-white',
    chipBg: 'from-rose-600 to-rose-800 border-rose-400 text-white',
    cardBg: 'bg-[#290d15]',
    cardBorder: 'border-rose-500/80',
    cardHeader: 'bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 text-white font-black',
    costPill: 'bg-rose-600 border border-rose-300 text-white font-black shadow-sm',
  },
  onyx: {
    label: 'Onyx',
    icon: '⚫',
    bg: 'bg-zinc-900',
    border: 'border-zinc-500',
    text: 'text-white',
    chipBg: 'from-zinc-800 to-zinc-950 border-zinc-500 text-zinc-100',
    cardBg: 'bg-[#141518]',
    cardBorder: 'border-zinc-500/90',
    cardHeader: 'bg-gradient-to-r from-zinc-800 via-zinc-900 to-zinc-800 text-zinc-100 border-b border-zinc-600 font-black',
    costPill: 'bg-zinc-950 border-2 border-zinc-400 text-zinc-100 font-black shadow-md',
  },
  gold: {
    label: 'Gold Joker',
    icon: '🟡',
    bg: 'bg-amber-400',
    border: 'border-amber-300',
    text: 'text-stone-900',
    chipBg: 'from-amber-400 to-amber-600 border-amber-300 text-stone-950',
    cardBg: 'bg-[#2b2108]',
    cardBorder: 'border-amber-400/80',
    cardHeader: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-stone-950 font-black',
    costPill: 'bg-amber-400 border border-amber-300 text-stone-950 font-black shadow-sm',
  },
};


export const SplendorBoard: React.FC<SplendorBoardProps> = ({
  state,
  currentPlayerId,
  isHost,
  onAction,
  onReturnToLobby,
}) => {
  const [selectedTokens, setSelectedTokens] = useState<GemColor[]>([]);
  const [discardSelection, setDiscardSelection] = useState<Partial<Record<TokenType, number>>>({});
  const [showGuide, setShowGuide] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);

  React.useEffect(() => {
    isSplendorAudioMuted = soundMuted;
  }, [soundMuted]);

  const me: SplendorPlayer | undefined = state.players[currentPlayerId];
  const isMyTurn = state.currentTurnPlayerId === currentPlayerId;
  const isDiscardPhase = state.phase === 'discard_tokens' && state.discardingPlayerId === currentPlayerId;
  const myBonuses = me ? getPlayerGemBonuses(me) : { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0 };
  const myTotalTokens = me ? getTotalTokens(me.tokens) : 0;

  // Automated Bot AI Player for Splendor
  React.useEffect(() => {
    if (state.phase !== 'action' && state.phase !== 'discard_tokens') return;
    if (!isHost) return;

    const activeBotId =
      state.phase === 'discard_tokens'
        ? state.discardingPlayerId
        : state.currentTurnPlayerId;

    if (!activeBotId || !activeBotId.startsWith('bot_')) return;

    const timer = setTimeout(() => {
      const bot = state.players[activeBotId];
      if (!bot) return;

      // 1. Handle Token Discard Phase for Bot (if > 10 tokens)
      if (state.phase === 'discard_tokens') {
        const total = getTotalTokens(bot.tokens);
        if (total > 10) {
          let neededToDiscard = total - 10;
          const toDiscard: Partial<Record<TokenType, number>> = {};
          const colorsByCount = (['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'] as GemColor[])
            .sort((a, b) => (bot.tokens[b] || 0) - (bot.tokens[a] || 0));

          for (const c of colorsByCount) {
            const avail = bot.tokens[c] || 0;
            if (avail > 0 && neededToDiscard > 0) {
              const discardAmount = Math.min(avail, neededToDiscard);
              toDiscard[c] = discardAmount;
              neededToDiscard -= discardAmount;
            }
          }
          if (neededToDiscard > 0 && (bot.tokens.gold || 0) > 0) {
            toDiscard.gold = Math.min(bot.tokens.gold, neededToDiscard);
          }
          onAction({ type: 'discard_tokens', tokens: toDiscard });
        }
        return;
      }

      // 2. Action Phase: Check if bot can buy a card (Market or Reserved)
      const availableCards: DevCard[] = [
        ...bot.reservedCards,
        ...((state.market[3]?.filter(Boolean) || []) as DevCard[]),
        ...((state.market[2]?.filter(Boolean) || []) as DevCard[]),
        ...((state.market[1]?.filter(Boolean) || []) as DevCard[]),
      ];

      const affordableCards = availableCards.filter((c) => canAffordCard(bot, c));

      if (affordableCards.length > 0) {
        // Pick card with highest prestige, or highest tier
        const bestCard = affordableCards.sort((a, b) => {
          if (b.prestige !== a.prestige) return b.prestige - a.prestige;
          return b.tier - a.tier;
        })[0];

        onAction({ type: 'buy_card', cardId: bestCard.id });
        return;
      }

      // 3. Can Bot Reserve a high-prestige Tier 3 card?
      if (bot.reservedCards.length < 3 && (state.bank.gold || 0) > 0) {
        const tier3Cards = (state.market[3]?.filter(Boolean) || []) as DevCard[];
        const highValue = tier3Cards.find((c) => c.prestige >= 4);
        if (highValue && Math.random() < 0.3) {
          onAction({ type: 'reserve_card', cardId: highValue.id });
          return;
        }
      }

      // 4. Take Tokens: Try to take 3 different gem colors or 2 of same color
      const availableGems = (['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'] as GemColor[])
        .filter((c) => (state.bank[c] || 0) > 0);

      const doubleColor = availableGems.find((c) => (state.bank[c] || 0) >= 4);
      if (doubleColor && (availableGems.length < 3 || Math.random() < 0.35)) {
        onAction({ type: 'take_2_tokens', color: doubleColor });
        return;
      }

      if (availableGems.length >= 3) {
        const chosen = availableGems.slice(0, 3);
        onAction({ type: 'take_3_tokens', colors: [chosen[0], chosen[1], chosen[2]] });
        return;
      }

      if (availableGems.length > 0) {
        onAction({ type: 'take_3_tokens', colors: availableGems as any });
        return;
      }

      // Fallback: reserve any card
      const anyCard = availableCards[0];
      if (anyCard && bot.reservedCards.length < 3) {
        onAction({ type: 'reserve_card', cardId: anyCard.id });
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [state.phase, state.currentTurnPlayerId, state.discardingPlayerId, isHost, state.players, state.market, state.bank, onAction]);


  // Handle Token Selection
  const handleSelectToken = (color: GemColor) => {
    if (!isMyTurn || state.phase !== 'action') return;
    if (state.bank[color] <= 0) return;

    playSplendorSfx('chip');

    // If clicking same color twice when >= 4 available, prepare Take 2
    if (selectedTokens.length === 1 && selectedTokens[0] === color && state.bank[color] >= 4) {
      setSelectedTokens([color, color]);
      return;
    }

    if (selectedTokens.includes(color)) {
      setSelectedTokens(selectedTokens.filter((c) => c !== color));
    } else {
      if (selectedTokens.length < 3) {
        // If already selected 2 of same color, reset to new color
        if (selectedTokens.length === 2 && selectedTokens[0] === selectedTokens[1]) {
          setSelectedTokens([color]);
        } else {
          setSelectedTokens([...selectedTokens, color]);
        }
      }
    }
  };

  const handleConfirmTakeTokens = () => {
    if (selectedTokens.length === 3) {
      playSplendorSfx('chip');
      onAction({
        type: 'take_3_tokens',
        colors: [selectedTokens[0], selectedTokens[1], selectedTokens[2]],
      });
      setSelectedTokens([]);
    } else if (selectedTokens.length === 2 && selectedTokens[0] === selectedTokens[1]) {
      playSplendorSfx('chip');
      onAction({ type: 'take_2_tokens', color: selectedTokens[0] });
      setSelectedTokens([]);
    }
  };

  const handleBuyCard = (card: DevCard) => {
    if (!isMyTurn || state.phase !== 'action') return;
    if (!me || !canAffordCard(me, card)) return;

    playSplendorSfx('card');
    onAction({ type: 'buy_card', cardId: card.id });
  };

  const handleReserveCard = (card: DevCard) => {
    if (!isMyTurn || state.phase !== 'action') return;
    if (!me || me.reservedCards.length >= 3) return;

    playSplendorSfx('gold');
    onAction({ type: 'reserve_card', cardId: card.id });
  };

  const handleConfirmDiscard = () => {
    onAction({ type: 'discard_tokens', tokens: discardSelection });
    setDiscardSelection({});
  };

  return (
    <div className="relative min-h-screen bg-[#07130f] text-stone-100 flex flex-col items-center select-none overflow-x-hidden font-sans pb-24">
      {/* Tabletop Velvet Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.12) 0%, rgba(4, 30, 23, 0.95) 75%), repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 2px, transparent 2px, transparent 6px)',
        }}
      />

      {/* Header Bar */}
      <header className="relative z-10 w-full max-w-7xl px-4 pt-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-emerald-900/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-xl">
            💎
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wide text-amber-300 font-serif flex items-center gap-2">
              Splendor
              <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/60 font-sans">
                {state.expansion === 'cities'
                  ? 'The Cities'
                  : state.expansion === 'orient'
                  ? 'The Orient'
                  : 'Renaissance'}
              </span>
            </h1>
            <p className="text-xs text-stone-400">Renaissance Gem Merchant Engine Building</p>
          </div>
        </div>

        {/* Turn Status & Goal */}
        <div
          className={`flex items-center gap-4 bg-stone-900/90 border border-stone-800 px-4 py-2 rounded-2xl shadow-xl ${
            isMyTurn ? 'turn-spotlight' : ''
          }`}
        >
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Current Turn</span>
            <span
              className={`text-sm font-bold ${
                isMyTurn ? 'text-emerald-400 animate-pulse' : 'text-stone-300'
              }`}
            >
              {isMyTurn ? 'Your Turn!' : `${state.players[state.currentTurnPlayerId]?.name}'s Turn`}
            </span>
          </div>

          <div className="h-8 w-px bg-stone-700" />

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Winning Goal</span>
            <span className="text-sm font-bold text-amber-300">
              {state.expansion === 'cities' ? 'Claim 1 City Tile' : '15 Prestige Points'}
            </span>
          </div>

          {state.finalRoundTriggered && (
            <div className="px-2.5 py-1 bg-rose-950 border border-rose-500 rounded-xl text-rose-300 text-xs font-bold animate-bounce">
              Final Round! 🏁
            </div>
          )}

          <div className="flex items-center gap-1.5 pl-2 border-l border-stone-700">
            <button
              onClick={() => setShowGuide(true)}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 text-xs font-semibold flex items-center gap-1"
              title="Renaissance Merchant Rules Guide"
            >
              📖
            </button>
            <button
              onClick={() => setSoundMuted(!soundMuted)}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs"
              title={soundMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {soundMuted ? '🔇' : '🔊'}
            </button>
            <button
              onClick={onReturnToLobby}
              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-lg border border-stone-700 transition"
              title="Return to Room Lobby"
            >
              Lobby
            </button>
          </div>
        </div>
      </header>

      {/* Main Tabletop Felt Area */}
      <main className="relative z-10 w-full max-w-7xl px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Left Section: Marketplace & Nobles */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Top Row: Nobles / Cities */}
          <section className="bg-stone-900/80 border border-amber-900/40 p-4 rounded-3xl shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-serif flex items-center gap-2">
                <span>{state.expansion === 'cities' ? '🏛️ City Tiles' : '👑 Noble Patrons'}</span>
                <span className="text-[10px] text-stone-400 font-sans font-normal">
                  {state.expansion === 'cities'
                    ? '(Claim 1 to trigger victory!)'
                    : '(Visit you when bonus gems match, +3 VP)'}
                </span>
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              {state.expansion === 'cities' && state.cities
                ? state.cities.map((city) => (
                    <div
                      key={city.id}
                      className="w-36 h-24 rounded-2xl bg-gradient-to-b from-stone-800 to-stone-950 border-2 border-amber-500/60 p-2.5 flex flex-col justify-between shadow-lg relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 truncate">{city.name}</span>
                        <span className="text-sm">{city.avatar}</span>
                      </div>
                      <div className="text-[10px] text-stone-300 font-semibold">
                        Req: {city.minPrestige} VP
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.entries(city.requirements).map(([c, count]) => (
                          <span
                            key={c}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              GEM_CONFIG[c as GemColor].bg
                            } ${GEM_CONFIG[c as GemColor].text}`}
                          >
                            {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                : state.nobles.map((noble) => (
                    <div
                      key={noble.id}
                      className="w-32 h-24 rounded-2xl bg-gradient-to-b from-stone-850 to-stone-950 border-2 border-amber-500/50 p-2 flex flex-col justify-between shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black font-serif text-amber-400">
                          {noble.prestige}
                        </span>
                        <span className="text-xs text-stone-300 truncate max-w-[65px] font-semibold">
                          {noble.name}
                        </span>
                        <span className="text-sm">{noble.avatar}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.entries(noble.requirements).map(([c, count]) => {
                          const col = c as GemColor;
                          const cfg = GEM_CONFIG[col];
                          return (
                            <div
                              key={c}
                              className={`px-1.5 py-0.5 rounded-lg border font-mono text-[11px] font-black shadow-sm flex items-center gap-1 ${cfg.costPill}`}
                            >
                              <span className="text-[10px]">{cfg.icon}</span>
                              <span>{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
            </div>
          </section>

          {/* Development Cards Grid (Tiers 3, 2, 1) */}
          <section className="bg-stone-900/80 border border-emerald-950 p-5 rounded-3xl shadow-2xl backdrop-blur-sm flex flex-col gap-4">
            {([3, 2, 1] as CardTier[]).map((tier) => {
              const cards = state.market[tier];
              const orientCards = state.orientMarket ? state.orientMarket[tier] : [];
              const tierName = tier === 3 ? 'Tier III' : tier === 2 ? 'Tier II' : 'Tier I';
              const deckCount = state.decks[tier].length;

              return (
                <div key={tier} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-400 px-1">
                    <span className="uppercase tracking-wider flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          tier === 3 ? 'bg-blue-500' : tier === 2 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                      {tierName}
                    </span>
                    <span className="text-[11px] font-mono text-stone-500">
                      Deck: {deckCount} cards left
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3">
                    {cards.map((card, idx) => {
                      if (!card) {
                        return (
                          <div
                            key={`empty_${tier}_${idx}`}
                            className="aspect-[5/7] rounded-2xl border-2 border-dashed border-stone-800 bg-stone-950/40 flex items-center justify-center text-stone-700 text-xs font-mono"
                          >
                            Empty
                          </div>
                        );
                      }

                      const canBuy = me ? canAffordCard(me, card) : false;
                      const gemCfg = GEM_CONFIG[card.gemBonus];

                      return (
                        <div
                          key={card.id}
                          className={`group relative aspect-[5/7] rounded-2xl ${gemCfg.cardBg} border-2 ${gemCfg.cardBorder} transition-all duration-200 shadow-xl flex flex-col justify-between p-2.5 overflow-hidden ${
                            canBuy && isMyTurn
                              ? 'ring-2 ring-amber-400 shadow-amber-500/25 hover:scale-[1.03] cursor-pointer'
                              : 'hover:border-stone-400'
                          }`}
                        >
                          {/* Card Top Banner: Prestige Plaque & Large Gem Bonus Emblem */}
                          <div className={`-mx-2.5 -mt-2.5 mb-1 px-2.5 py-1.5 ${gemCfg.cardHeader} flex items-center justify-between shadow-sm`}>
                            <div className="flex items-center gap-1 min-h-[22px]">
                              {card.prestige > 0 ? (
                                <span className="text-xl font-black font-serif text-inherit drop-shadow leading-none">
                                  {card.prestige}
                                </span>
                              ) : (
                                <span className="text-xs opacity-50 font-mono">•</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/20 shadow-inner">
                              <span className="text-sm leading-none">{gemCfg.icon}</span>
                              <span className="text-[10px] font-black text-white font-mono leading-none">1</span>
                            </div>
                          </div>

                          {/* Center Subtle Gem Motif / Watermark */}
                          <div className="my-auto flex items-center justify-center opacity-15 pointer-events-none select-none text-4xl">
                            {gemCfg.icon}
                          </div>

                          {/* Card Bottom: Gem Costs */}
                          <div className="flex flex-col gap-1.5 z-10">
                            <div className="flex flex-wrap gap-1 items-center">
                              {Object.entries(card.cost).map(([c, amount]) => {
                                const color = c as GemColor;
                                const discount = myBonuses[color] || 0;
                                const effectiveCost = Math.max(0, (amount || 0) - discount);
                                const costCfg = GEM_CONFIG[color];

                                return (
                                  <div
                                    key={c}
                                    className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shadow-md flex items-center gap-1 ${costCfg.costPill} ${
                                      effectiveCost === 0 ? 'opacity-40 line-through' : ''
                                    }`}
                                    title={`${costCfg.label}: ${amount}`}
                                  >
                                    <span className="text-[10px] leading-none">{costCfg.icon}</span>
                                    <span className="leading-none">{effectiveCost}</span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Action Buttons overlay on hover */}
                            {isMyTurn && state.phase === 'action' && (
                              <div className="mt-1 flex items-center gap-1 opacity-95 group-hover:opacity-100">
                                {canBuy && (
                                  <button
                                    onClick={() => handleBuyCard(card)}
                                    className="flex-1 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 text-[10px] font-black rounded-lg shadow-md transition uppercase tracking-wider"
                                  >
                                    Buy 🛒
                                  </button>
                                )}
                                {me && me.reservedCards.length < 3 && (
                                  <button
                                    onClick={() => handleReserveCard(card)}
                                    className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-100 text-[10px] font-bold rounded-lg border border-stone-600 shadow transition"
                                    title="Reserve Card (+1 Gold Joker)"
                                  >
                                    📥
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Orient Cards Column (if enabled) */}
                    {state.expansion === 'orient' &&
                      orientCards.map((card, idx) => {
                        if (!card) return null;
                        const canBuy = me ? canAffordCard(me, card) : false;
                        return (
                          <div
                            key={card.id}
                            className={`group relative aspect-[5/7] rounded-2xl bg-[#2a0e14] border-2 border-red-500/80 p-2.5 flex flex-col justify-between shadow-xl overflow-hidden ${
                              canBuy && isMyTurn ? 'ring-2 ring-amber-400 shadow-amber-500/25 hover:scale-[1.03] cursor-pointer' : 'hover:border-red-400'
                            }`}
                          >
                            <div className="-mx-2.5 -mt-2.5 mb-1 px-2.5 py-1.5 bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white flex items-center justify-between shadow-sm">
                              <span className="text-xl font-black font-serif text-white drop-shadow leading-none">
                                {card.prestige > 0 ? card.prestige : '•'}
                              </span>
                              <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/20 shadow-inner">
                                <span className="text-xs">🏮</span>
                                <span className="text-[10px] font-black text-white font-mono leading-none">
                                  {card.bonusCount || 2}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5 z-10">
                              <div className="flex flex-wrap gap-1 items-center">
                                {Object.entries(card.cost).map(([c, amount]) => {
                                  const costCfg = GEM_CONFIG[c as GemColor];
                                  return (
                                    <div
                                      key={c}
                                      className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shadow-md flex items-center gap-1 ${costCfg.costPill}`}
                                    >
                                      <span className="text-[10px] leading-none">{costCfg.icon}</span>
                                      <span className="leading-none">{amount}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {isMyTurn && canBuy && (
                                <button
                                  onClick={() => handleBuyCard(card)}
                                  className="mt-1 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 text-[10px] font-black rounded-lg shadow uppercase tracking-wider"
                                >
                                  Buy 🏮
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {/* Right Section: Clay Poker Chip Bank & Opponent Overview */}
        <div className="w-full lg:w-80 flex flex-col gap-5">
          {/* Bank: Stackable Clay Poker Chips */}
          <section className="bg-stone-900/90 border border-amber-900/50 p-4 rounded-3xl shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-serif flex items-center gap-2">
                <span>🏦 Gem Token Bank</span>
              </h2>
              <span className="text-[10px] text-stone-400">Click 3 diff or 2 same</span>
            </div>

            {/* Clay Chip Columns */}
            <div className="grid grid-cols-3 gap-3">
              {GEM_COLORS.map((color) => {
                const count = state.bank[color];
                const isSelected = selectedTokens.includes(color);
                const isDoubleSelected =
                  selectedTokens.filter((c) => c === color).length === 2;

                return (
                  <div
                    key={color}
                    onClick={() => handleSelectToken(color)}
                    className={`cursor-pointer group flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all transform duration-200 ${
                      isDoubleSelected
                        ? 'border-amber-400 bg-amber-950/60 scale-105 shadow-lg'
                        : isSelected
                        ? 'border-emerald-400 bg-emerald-950/60 scale-105 shadow-md'
                        : 'border-stone-700 bg-stone-850 hover:border-stone-500'
                    }`}
                  >
                    {/* Poker Chip representation */}
                    <div
                      className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${
                        GEM_CONFIG[color].chipBg
                      } border-4 flex items-center justify-center shadow-lg transition-transform ${
                        isSelected ? '-translate-y-1' : ''
                      }`}
                    >
                      <span className="text-lg">{GEM_CONFIG[color].icon}</span>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-stone-950 text-white text-[10px] font-bold border border-stone-600 flex items-center justify-center shadow">
                        {count}
                      </span>
                    </div>

                    <span className="mt-1 text-[11px] font-semibold text-stone-300 capitalize">
                      {color}
                    </span>

                    {isSelected && (
                      <span className="text-[9px] text-emerald-400 font-bold mt-0.5">
                        {isDoubleSelected ? 'Take 2' : 'Selected'}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Gold Joker Chip (Reserve bonus) */}
              <div className="flex flex-col items-center justify-center p-2 rounded-2xl border-2 border-stone-700 bg-stone-850">
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-4 border-amber-300 flex items-center justify-center shadow-lg">
                  <span className="text-lg">🟡</span>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-stone-950 text-amber-300 text-[10px] font-bold border border-stone-600 flex items-center justify-center shadow">
                    {state.bank.gold}
                  </span>
                </div>
                <span className="mt-1 text-[11px] font-semibold text-amber-300">Gold (Wild)</span>
                <span className="text-[9px] text-stone-500 mt-0.5">Reserve Bonus</span>
              </div>
            </div>

            {/* Confirm Take Tokens Button */}
            {isMyTurn && (
              <button
                disabled={!(selectedTokens.length === 3 || (selectedTokens.length === 2 && selectedTokens[0] === selectedTokens[1]))}
                onClick={handleConfirmTakeTokens}
                className={`mt-4 w-full py-2.5 font-bold text-xs rounded-xl shadow-lg transition ${
                  selectedTokens.length === 3 || (selectedTokens.length === 2 && selectedTokens[0] === selectedTokens[1])
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white animate-pulse'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                {selectedTokens.length === 2 && selectedTokens[0] === selectedTokens[1]
                  ? `Take 2 ${selectedTokens[0]} Tokens`
                  : selectedTokens.length === 3
                  ? 'Take 3 Different Tokens'
                  : selectedTokens.length > 0
                  ? `Select ${3 - selectedTokens.length} more token(s)`
                  : 'Select 3 Tokens or Double-Click for 2'}
              </button>
            )}
          </section>

          {/* Opponent Merchant Dashboards */}
          <section className="bg-stone-900/90 border border-stone-800 p-4 rounded-3xl shadow-xl flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Other Merchants
            </h2>

            {state.playerOrder
              .filter((id) => id !== currentPlayerId)
              .map((id) => {
                const opp = state.players[id];
                const oppBonuses = getPlayerGemBonuses(opp);
                const oppTokens = getTotalTokens(opp.tokens);

                const isOppTurn = state.currentTurnPlayerId === id;
                return (
                  <div
                    key={id}
                    className={`p-3 rounded-2xl bg-stone-950/60 border flex flex-col gap-2 transition ${
                      isOppTurn ? 'border-amber-400 shadow-lg turn-spotlight' : 'border-stone-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{opp.avatar || '💎'}</span>
                        <span className="text-xs font-bold text-stone-200">{opp.name}</span>
                        {isOppTurn && (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-600 animate-pulse">
                            Thinking...
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-amber-400 font-serif">
                          {opp.prestige} VP
                        </span>
                      </div>
                    </div>

                    {/* Permanent Card Discounts */}
                    <div className="flex items-center gap-1 text-[10px]">
                      {GEM_COLORS.map((c) => (
                        <span
                          key={c}
                          className={`w-4 h-4 rounded flex items-center justify-center font-bold ${
                            GEM_CONFIG[c].bg
                          } ${GEM_CONFIG[c].text}`}
                        >
                          {oppBonuses[c] || 0}
                        </span>
                      ))}
                      <span className="ml-auto text-stone-400 font-mono">
                        🪙 {oppTokens} | 📥 {opp.reservedCards.length}
                      </span>
                    </div>
                  </div>
                );
              })}
          </section>
        </div>
      </main>

      {/* Bottom Sticky Player Dashboard */}
      {me && (
        <footer
          className={`fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 border-t px-4 py-3 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto rounded-t-3xl transition ${
            isMyTurn ? 'border-emerald-400 shadow-emerald-900/40 turn-spotlight' : 'border-emerald-900/80'
          }`}
        >
          {/* Player Identity & Prestige */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-900 border-2 border-emerald-400 flex items-center justify-center text-2xl shadow">
              {me.avatar || '💎'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-100">{me.name} (You)</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-serif font-black">
                  {me.prestige} Prestige Points
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Cards: {me.cards.length} | Nobles: {me.nobles.length} | Reserved: {me.reservedCards.length}/3
              </p>
            </div>
          </div>

          {/* Tokens in Hand & Capacity */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-2xl">
              <span className="text-[10px] font-bold text-stone-400 mr-1">
                Chips ({myTotalTokens}/10):
              </span>
              {(['diamond', 'sapphire', 'emerald', 'ruby', 'onyx', 'gold'] as TokenType[]).map((t) => (
                <div key={t} className="flex items-center gap-0.5">
                  <span className="text-xs">{GEM_CONFIG[t].icon}</span>
                  <span className="text-xs font-bold text-stone-200">{me.tokens[t]}</span>
                </div>
              ))}
            </div>

            {/* Permanent Discounts */}
            <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-2xl">
              <span className="text-[10px] font-bold text-stone-400 mr-1">Discounts:</span>
              {GEM_COLORS.map((c) => (
                <div
                  key={c}
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shadow ${
                    GEM_CONFIG[c].bg
                  } ${GEM_CONFIG[c].text}`}
                >
                  {myBonuses[c]}
                </div>
              ))}
            </div>
          </div>

          {/* Reserved Cards Drawer trigger */}
          {me.reservedCards.length > 0 && (
            <div className="flex items-center gap-2">
              {me.reservedCards.map((c) => {
                const canBuy = canAffordCard(me, c);
                return (
                  <div
                    key={c.id}
                    className="px-2.5 py-1.5 rounded-xl bg-stone-900 border border-amber-600/60 flex items-center gap-2 shadow"
                  >
                    <span className="text-xs font-serif font-black text-amber-300">
                      {c.prestige > 0 ? `${c.prestige} VP` : '+1'}
                    </span>
                    <span className="text-xs">{GEM_CONFIG[c.gemBonus].icon}</span>
                    {isMyTurn && canBuy && (
                      <button
                        onClick={() => handleBuyCard(c)}
                        className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-[10px] font-bold rounded shadow"
                      >
                        Buy 🛒
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </footer>
      )}

      {/* Discard Tokens Modal (if over 10 tokens) */}
      {isDiscardPhase && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border-2 border-rose-500 p-6 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <h3 className="text-lg font-bold text-rose-400 mb-1">Token Limit Exceeded!</h3>
            <p className="text-xs text-stone-300 mb-4">
              You hold {myTotalTokens} tokens. Rules require returning tokens to the bank until you hold
              at most 10.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {(['diamond', 'sapphire', 'emerald', 'ruby', 'onyx', 'gold'] as TokenType[]).map((t) => {
                const selectedToDiscard = discardSelection[t] || 0;
                return (
                  <div key={t} className="p-2 bg-stone-950 rounded-xl border border-stone-800 flex flex-col items-center">
                    <span className="text-lg">{GEM_CONFIG[t].icon}</span>
                    <span className="text-xs font-bold text-stone-200 mt-1">
                      Hold: {me?.tokens[t]}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() =>
                          setDiscardSelection({
                            ...discardSelection,
                            [t]: Math.max(0, selectedToDiscard - 1),
                          })
                        }
                        className="w-5 h-5 rounded bg-stone-800 text-white font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-rose-400">{selectedToDiscard}</span>
                      <button
                        onClick={() => {
                          if ((me?.tokens[t] || 0) > selectedToDiscard) {
                            setDiscardSelection({
                              ...discardSelection,
                              [t]: selectedToDiscard + 1,
                            });
                          }
                        }}
                        className="w-5 h-5 rounded bg-stone-800 text-white font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleConfirmDiscard}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
            >
              Confirm Discard
            </button>
          </div>
        </div>
      )}

      {/* Game Over Celebration Modal */}
      {state.phase === 'game_over' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-amber-400 p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl flex flex-col items-center">
            <span className="text-6xl mb-3">🏆👑</span>
            <h2 className="text-3xl font-black font-serif text-amber-300 mb-2">
              Merchant Victorious!
            </h2>
            <p className="text-sm text-stone-300 mb-6">{state.winReason}</p>

            <div className="w-full flex flex-col gap-2 mb-6">
              {state.playerOrder.map((id) => {
                const p = state.players[id];
                const isWinner = id === state.winner;
                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      isWinner
                        ? 'border-amber-400 bg-amber-950/60 font-bold'
                        : 'border-stone-800 bg-stone-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{p.avatar || '💎'}</span>
                      <span className="text-sm">{p.name}</span>
                    </div>
                    <span className="text-sm font-serif font-black text-amber-300">
                      {p.prestige} Prestige Points
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onAction({ type: 'reset_game' })}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-xl transition"
              >
                Play Again 🔄
              </button>
              {onReturnToLobby && (
                <button
                  onClick={onReturnToLobby}
                  className="px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs uppercase tracking-wider rounded-xl shadow-xl transition"
                >
                  Return to Lobby 🏛️
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENAISSANCE MERCHANT RULES GUIDE MODAL */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1612] border-2 border-emerald-600/60 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col text-stone-200 font-sans">
            <div className="flex items-center justify-between border-b border-emerald-950 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💎</span>
                <div>
                  <h3 className="text-xl font-bold font-serif text-amber-300">Splendor Merchant Rules & Strategy</h3>
                  <div className="text-xs text-stone-400">Renaissance Gem Trading & Engine Building Guide</div>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs text-stone-300 leading-relaxed">
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl">
                <strong className="text-emerald-300">Merchant Objective:</strong> Gather gemstone tokens, acquire development cards to gain permanent discounts, attract noble visits, and be the first to reach 15 prestige points (or claim a City tile in the Cities expansion)!
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-amber-300 uppercase tracking-wider">🪙 Taking Gem Tokens</h4>
                <p>
                  On your turn, you may perform ONE of these actions:
                  <br />• Take <strong>3 gem tokens</strong> of different colors (diamond, sapphire, emerald, ruby, onyx).
                  <br />• Take <strong>2 gem tokens</strong> of the same color (only if that pile has at least 4 tokens).
                  <br />• Token limit: You can hold at most <strong>10 tokens</strong> at the end of your turn. You must discard excess tokens if you exceed 10.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sky-300 uppercase tracking-wider">🃏 Buying Development Cards</h4>
                <p>
                  Spend gem tokens matching the card's cost. Each card you own provides a <strong>permanent gem bonus discount</strong> for all future purchases, plus prestige points towards victory!
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider">🟡 Reserving Cards & Gold Wildcards</h4>
                <p>
                  Reserve 1 card from the market into your private hand (maximum 3 reserved cards). You receive <strong>1 Gold Joker token</strong> (which acts as any color gem) if available in the bank!
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-purple-300 uppercase tracking-wider">👑 Noble Patrons (+3 Prestige Points)</h4>
                <p>
                  Nobles visit the first player whose permanent card bonuses fulfill their requirements. A noble visit gives +3 prestige points immediately and does not cost an action!
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-emerald-400 uppercase tracking-wider">🏛️ Cities of Splendor & Orient Expansion</h4>
                <p>
                  • <strong>The Cities:</strong> Replaces Nobles with City tiles. To win, fulfill a City tile's prestige and bonus gem requirements!
                  <br />• <strong>The Orient:</strong> Adds 3 extra tiers of red-backed cards offering double bonuses, pairing tokens, and instant noble recruitment.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-950 text-right">
              <button
                onClick={() => setShowGuide(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider"
              >
                Got It, Let&apos;s Trade!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplendorBoard;
