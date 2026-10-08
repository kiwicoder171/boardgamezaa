import {
  initSplendorGame,
  splendorReducer,
  canAffordCard,
  getPlayerGemBonuses,
} from '../src/games/splendor/logic';
import { GemColor, DevCard } from '../src/games/splendor/types';

function runSplendorTests() {
  console.log('🧪 Starting Splendor Tests...\n');

  const players = [
    { id: 'p1', name: 'Lorenzo de Medici' },
    { id: 'p2', name: 'Cosimo de Medici' },
  ];

  // Test 1: Initialization
  console.log('--- Test 1: Bank & Board Setup ---');
  let state = initSplendorGame(players, 'none');
  if (state.bank.diamond !== 4 || state.bank.gold !== 5) {
    throw new Error(`Expected 4 diamonds and 5 gold for 2 players, got ${state.bank.diamond}`);
  }
  if (state.nobles.length !== 3) {
    throw new Error(`Expected 3 nobles for 2 players, got ${state.nobles.length}`);
  }
  if (state.market[1].filter(Boolean).length !== 4) {
    throw new Error('Expected 4 cards in Tier 1 market');
  }
  console.log('✅ 2-Player Bank and Market initialized correctly.');

  // Test 2: Take 3 distinct tokens
  console.log('--- Test 2: Take 3 Gem Tokens ---');
  state = splendorReducer(state, {
    type: 'take_3_tokens',
    colors: ['diamond', 'sapphire', 'emerald'],
  });
  if (state.players['p1'].tokens.diamond !== 1 || state.bank.diamond !== 3) {
    throw new Error('Diamond token was not transferred correctly');
  }
  if (state.currentTurnPlayerId !== 'p2') {
    throw new Error(`Expected turn to advance to p2, got ${state.currentTurnPlayerId}`);
  }
  console.log('✅ Took 3 tokens and turn passed to P2.');

  // Test 3: Take 2 of the same token
  console.log('--- Test 3: Take 2 Tokens of Same Color ---');
  // Ruby has 4 available in bank
  state = splendorReducer(state, {
    type: 'take_2_tokens',
    color: 'ruby',
  });
  if (state.players['p2'].tokens.ruby !== 2 || state.bank.ruby !== 2) {
    throw new Error('Ruby tokens not transferred correctly');
  }
  if (state.currentTurnPlayerId !== 'p1') {
    throw new Error('Expected turn back to p1');
  }
  console.log('✅ P2 took 2 Ruby tokens from stack of 4.');

  // Test 4: Reserve a card & receive gold
  console.log('--- Test 4: Reserve Card & Gain Gold ---');
  const cardToReserve = state.market[1][0]!;
  state = splendorReducer(state, {
    type: 'reserve_card',
    cardId: cardToReserve.id,
  });
  if (state.players['p1'].reservedCards.length !== 1) {
    throw new Error('Card not in reserved list');
  }
  if (state.players['p1'].tokens.gold !== 1 || state.bank.gold !== 4) {
    throw new Error('Gold joker was not awarded for reservation');
  }
  if (state.market[1][0]?.id === cardToReserve.id) {
    throw new Error('Reserved card was not replaced in market');
  }
  console.log('✅ P1 reserved card into hand and received 1 Gold Joker.');

  // Test 5: Buy card with discounts & gold
  console.log('--- Test 5: Engine Building & Card Purchases ---');
  // Give P1 a custom affordable card and check buying
  const testCard: DevCard = {
    id: 'test_card_1',
    tier: 1,
    gemBonus: 'diamond',
    prestige: 1,
    cost: { sapphire: 1, diamond: 1 },
  };
  state.players['p1'].reservedCards.push(testCard);
  state.currentTurnPlayerId = 'p1';

  // P1 has 1 diamond, 1 sapphire, 1 emerald, 1 gold
  if (!canAffordCard(state.players['p1'], testCard)) {
    throw new Error('P1 should be able to afford test card');
  }

  state = splendorReducer(state, {
    type: 'buy_card',
    cardId: testCard.id,
  });

  if (state.players['p1'].cards.length !== 1 || state.players['p1'].prestige !== 1) {
    throw new Error('Card not added to purchased deck or prestige not updated');
  }
  const bonuses = getPlayerGemBonuses(state.players['p1']);
  if (bonuses.diamond !== 1) {
    throw new Error('Permanent diamond discount not registered');
  }
  console.log('✅ P1 purchased card, gained 1 Prestige and permanent Diamond discount.');

  // Test 6: Noble Visit
  console.log('--- Test 6: Noble Patron Visit ---');
  // Give P1 matching cards for noble 1
  const noble = state.nobles[0];
  const requiredGemCards: DevCard[] = [];
  for (const [color, req] of Object.entries(noble.requirements)) {
    for (let i = 0; i < (req || 0); i++) {
      requiredGemCards.push({
        id: `mock_${color}_${i}`,
        tier: 1,
        gemBonus: color as GemColor,
        prestige: 0,
        cost: {},
      });
    }
  }
  state.players['p1'].cards.push(...requiredGemCards);

  // Trigger buy card to evaluate noble visit
  const dummyBuy: DevCard = {
    id: 'dummy_card',
    tier: 1,
    gemBonus: 'ruby',
    prestige: 0,
    cost: {},
  };
  state.players['p1'].reservedCards.push(dummyBuy);
  state.currentTurnPlayerId = 'p1';

  state = splendorReducer(state, {
    type: 'buy_card',
    cardId: dummyBuy.id,
  });

  if (state.players['p1'].nobles.length !== 1) {
    throw new Error('Noble did not visit player with matching gem bonuses');
  }
  if (state.players['p1'].prestige < 4) {
    throw new Error(`Expected at least 4 prestige (1 + 3 from noble), got ${state.players['p1'].prestige}`);
  }
  console.log(`✅ Noble ${noble.name} visited P1! (+3 Prestige).`);

  // Test 7: Cities of Splendor Module
  console.log('--- Test 7: The Cities of Splendor Module ---');
  let cityState = initSplendorGame(players, 'cities');
  if (!cityState.cities || cityState.cities.length !== 3) {
    throw new Error('Expected 3 cities in The Cities expansion');
  }
  if (cityState.nobles.length !== 0) {
    throw new Error('Nobles should be replaced by Cities in Cities expansion');
  }
  console.log('✅ The Cities expansion module properly replaces Nobles with 3 City tiles.');

  // Test 8: Orient Module
  console.log('--- Test 8: The Orient Module ---');
  let orientState = initSplendorGame(players, 'orient');
  if (!orientState.orientMarket || orientState.orientMarket[1].length !== 2) {
    throw new Error('Expected 2 face-up Orient cards per tier');
  }
  console.log('✅ The Orient expansion module initialized with 3 Orient decks & marketplace.');

  console.log('\n🎉 ALL SPLENDOR TESTS PASSED 100%!');
}

runSplendorTests();
