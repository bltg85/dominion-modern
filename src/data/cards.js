// Korttyper
export const CardType = {
  TREASURE: 'treasure',
  VICTORY: 'victory',
  ACTION: 'action',
  ATTACK: 'attack',
  REACTION: 'reaction',
  CURSE: 'curse',
};

// Kortbilder (emoji-ikoner för varje kort)
export const cardImages = {
  // Treasures
  copper: '🪙',
  silver: '🥈',
  gold: '🥇',
  // Victory
  estate: '🏠',
  duchy: '🏰',
  province: '👑',
  curse: '💀',
  // Kingdom
  cellar: '🍷',
  chapel: '⛪',
  moat: '🏞️',
  harbinger: '🔮',
  merchant: '💰',
  vassal: '🎭',
  village: '🏘️',
  workshop: '🔨',
  bureaucrat: '📋',
  gardens: '🌳',
  militia: '⚔️',
  moneylender: '🏦',
  poacher: '🏹',
  remodel: '🔄',
  smithy: '⚒️',
  throneRoom: '🪑',
  bandit: '🗡️',
  councilRoom: '📜',
  festival: '🎪',
  laboratory: '🧪',
  library: '📚',
  market: '🛒',
  mine: '⛏️',
  sentry: '👁️',
  witch: '🧙‍♀️',
  artisan: '🎨',
};

// Alla kort i spelet (Dominion Base Set)
export const cards = {
  // === TREASURE ===
  copper: {
    id: 'copper',
    name: 'Copper',
    type: [CardType.TREASURE],
    cost: 0,
    coins: 1,
    description: '+$1',
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    type: [CardType.TREASURE],
    cost: 3,
    coins: 2,
    description: '+$2',
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    type: [CardType.TREASURE],
    cost: 6,
    coins: 3,
    description: '+$3',
  },

  // === VICTORY ===
  estate: {
    id: 'estate',
    name: 'Estate',
    type: [CardType.VICTORY],
    cost: 2,
    victoryPoints: 1,
    description: '1 VP',
  },
  duchy: {
    id: 'duchy',
    name: 'Duchy',
    type: [CardType.VICTORY],
    cost: 5,
    victoryPoints: 3,
    description: '3 VP',
  },
  province: {
    id: 'province',
    name: 'Province',
    type: [CardType.VICTORY],
    cost: 8,
    victoryPoints: 6,
    description: '6 VP',
  },

  // === CURSE ===
  curse: {
    id: 'curse',
    name: 'Curse',
    type: [CardType.CURSE],
    cost: 0,
    victoryPoints: -1,
    description: '-1 VP',
  },

  // === KINGDOM CARDS (2 cost) ===
  cellar: {
    id: 'cellar',
    name: 'Cellar',
    type: [CardType.ACTION],
    cost: 2,
    description: '+1 Action. Discard any number, draw that many.',
    effect: () => ({ actionsToAdd: 1, special: 'cellar' }),
  },
  chapel: {
    id: 'chapel',
    name: 'Chapel',
    type: [CardType.ACTION],
    cost: 2,
    description: 'Trash up to 4 cards.',
    effect: () => ({ special: 'chapel' }),
  },
  moat: {
    id: 'moat',
    name: 'Moat',
    type: [CardType.ACTION, CardType.REACTION],
    cost: 2,
    description: '+2 Cards. Blocks attacks.',
    effect: () => ({ cardsToDraw: 2 }),
  },

  // === KINGDOM CARDS (3 cost) ===
  harbinger: {
    id: 'harbinger',
    name: 'Harbinger',
    type: [CardType.ACTION],
    cost: 3,
    description: '+1 Card, +1 Action. Topdeck from discard.',
    effect: () => ({ cardsToDraw: 1, actionsToAdd: 1, special: 'harbinger' }),
  },
  merchant: {
    id: 'merchant',
    name: 'Merchant',
    type: [CardType.ACTION],
    cost: 3,
    description: '+1 Card, +1 Action. First Silver: +$1.',
    effect: () => ({ cardsToDraw: 1, actionsToAdd: 1, special: 'merchant' }),
  },
  vassal: {
    id: 'vassal',
    name: 'Vassal',
    type: [CardType.ACTION],
    cost: 3,
    description: '+$2. Discard top card, may play if Action.',
    effect: () => ({ coinsToAdd: 2, special: 'vassal' }),
  },
  village: {
    id: 'village',
    name: 'Village',
    type: [CardType.ACTION],
    cost: 3,
    description: '+1 Card, +2 Actions',
    effect: () => ({ cardsToDraw: 1, actionsToAdd: 2 }),
  },
  workshop: {
    id: 'workshop',
    name: 'Workshop',
    type: [CardType.ACTION],
    cost: 3,
    description: 'Gain a card costing up to $4.',
    effect: () => ({ special: 'workshop' }),
  },

  // === KINGDOM CARDS (4 cost) ===
  bureaucrat: {
    id: 'bureaucrat',
    name: 'Bureaucrat',
    type: [CardType.ACTION, CardType.ATTACK],
    cost: 4,
    description: 'Gain Silver to deck. Others topdeck Victory.',
    effect: () => ({ special: 'bureaucrat', attack: 'bureaucrat' }),
  },
  gardens: {
    id: 'gardens',
    name: 'Gardens',
    type: [CardType.VICTORY],
    cost: 4,
    victoryPoints: 0,
    description: '1 VP per 10 cards.',
    dynamicVP: true,
  },
  militia: {
    id: 'militia',
    name: 'Militia',
    type: [CardType.ACTION, CardType.ATTACK],
    cost: 4,
    description: '+$2. Others discard to 3.',
    effect: () => ({ coinsToAdd: 2, attack: 'discardTo3' }),
  },
  moneylender: {
    id: 'moneylender',
    name: 'Moneylender',
    type: [CardType.ACTION],
    cost: 4,
    description: 'Trash a Copper for +$3.',
    effect: () => ({ special: 'moneylender' }),
  },
  poacher: {
    id: 'poacher',
    name: 'Poacher',
    type: [CardType.ACTION],
    cost: 4,
    description: '+1 Card, +1 Action, +$1. Discard per empty pile.',
    effect: () => ({ cardsToDraw: 1, actionsToAdd: 1, coinsToAdd: 1, special: 'poacher' }),
  },
  remodel: {
    id: 'remodel',
    name: 'Remodel',
    type: [CardType.ACTION],
    cost: 4,
    description: 'Trash a card. Gain one costing up to $2 more.',
    effect: () => ({ special: 'remodel' }),
  },
  smithy: {
    id: 'smithy',
    name: 'Smithy',
    type: [CardType.ACTION],
    cost: 4,
    description: '+3 Cards',
    effect: () => ({ cardsToDraw: 3 }),
  },
  throneRoom: {
    id: 'throneRoom',
    name: 'Throne Room',
    type: [CardType.ACTION],
    cost: 4,
    description: 'Play an Action twice.',
    effect: () => ({ special: 'throneRoom' }),
  },

  // === KINGDOM CARDS (5 cost) ===
  bandit: {
    id: 'bandit',
    name: 'Bandit',
    type: [CardType.ACTION, CardType.ATTACK],
    cost: 5,
    description: 'Gain Gold. Others trash a Treasure.',
    effect: () => ({ special: 'bandit', attack: 'bandit' }),
  },
  councilRoom: {
    id: 'councilRoom',
    name: 'Council Room',
    type: [CardType.ACTION],
    cost: 5,
    description: '+4 Cards, +1 Buy. Others draw 1.',
    effect: () => ({ cardsToDraw: 4, buysToAdd: 1, special: 'councilRoom' }),
  },
  festival: {
    id: 'festival',
    name: 'Festival',
    type: [CardType.ACTION],
    cost: 5,
    description: '+2 Actions, +1 Buy, +$2',
    effect: () => ({ actionsToAdd: 2, buysToAdd: 1, coinsToAdd: 2 }),
  },
  laboratory: {
    id: 'laboratory',
    name: 'Laboratory',
    type: [CardType.ACTION],
    cost: 5,
    description: '+2 Cards, +1 Action',
    effect: () => ({ cardsToDraw: 2, actionsToAdd: 1 }),
  },
  library: {
    id: 'library',
    name: 'Library',
    type: [CardType.ACTION],
    cost: 5,
    description: 'Draw to 7 cards.',
    effect: () => ({ special: 'library' }),
  },
  market: {
    id: 'market',
    name: 'Market',
    type: [CardType.ACTION],
    cost: 5,
    description: '+1 Card, +1 Action, +1 Buy, +$1',
    effect: () => ({ cardsToDraw: 1, actionsToAdd: 1, buysToAdd: 1, coinsToAdd: 1 }),
  },
  mine: {
    id: 'mine',
    name: 'Mine',
    type: [CardType.ACTION],
    cost: 5,
    description: 'Trash Treasure, gain one costing up to $3 more.',
    effect: () => ({ special: 'mine' }),
  },
  sentry: {
    id: 'sentry',
    name: 'Sentry',
    type: [CardType.ACTION],
    cost: 5,
    description: '+1 Card, +1 Action. Look at top 2, trash/discard.',
    effect: () => ({ cardsToDraw: 1, actionsToAdd: 1, special: 'sentry' }),
  },
  witch: {
    id: 'witch',
    name: 'Witch',
    type: [CardType.ACTION, CardType.ATTACK],
    cost: 5,
    description: '+2 Cards. Others gain Curse.',
    effect: () => ({ cardsToDraw: 2, attack: 'curse' }),
  },

  // === KINGDOM CARDS (6 cost) ===
  artisan: {
    id: 'artisan',
    name: 'Artisan',
    type: [CardType.ACTION],
    cost: 6,
    description: 'Gain card up to $5 to hand. Topdeck a card.',
    effect: () => ({ special: 'artisan' }),
  },
};

// Hämta ett kort baserat på ID
export const getCard = (cardId) => cards[cardId];

// Kontrollera om ett kort är av en viss typ
export const isCardType = (card, type) => card.type.includes(type);

// Lista över alla kingdom-kort
export const kingdomCards = [
  'cellar', 'chapel', 'moat',
  'harbinger', 'merchant', 'vassal', 'village', 'workshop',
  'bureaucrat', 'gardens', 'militia', 'moneylender', 'poacher', 'remodel', 'smithy', 'throneRoom',
  'bandit', 'councilRoom', 'festival', 'laboratory', 'library', 'market', 'mine', 'sentry', 'witch',
  'artisan',
];

// Välj 10 slumpmässiga kingdom-kort för ett spel
export const selectKingdomCards = (count = 10) => {
  const shuffled = [...kingdomCards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};
