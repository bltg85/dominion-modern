import { cards, getCard, isCardType, CardType, selectKingdomCards } from '../data/cards';

export const createSupply = (numPlayers = 2, selectedKingdom) => {
  const victoryCards = numPlayers === 2 ? 8 : 12;
  const curseCards = (numPlayers - 1) * 10;
  const supply = {
    copper: 60 - (numPlayers * 7),
    silver: 40,
    gold: 30,
    estate: victoryCards,
    duchy: victoryCards,
    province: victoryCards,
    curse: curseCards,
  };
  selectedKingdom.forEach(cardId => {
    supply[cardId] = cardId === 'gardens' ? victoryCards : 10;
  });
  return supply;
};

export const createStartingDeck = () => {
  const deck = [];
  for (let i = 0; i < 7; i++) deck.push('copper');
  for (let i = 0; i < 3; i++) deck.push('estate');
  return shuffle([...deck]);
};

export const shuffle = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const createGameState = (selectedKingdom = null) => {
  const kingdom = selectedKingdom || selectKingdomCards(10);
  const player1Deck = createStartingDeck();
  const player2Deck = createStartingDeck();
  return {
    supply: createSupply(2, kingdom),
    kingdom: kingdom,
    trash: [],
    players: [
      { id: 0, name: 'You', deck: player1Deck.slice(5), hand: player1Deck.slice(0, 5), discard: [], playArea: [], isAI: false },
      { id: 1, name: 'AI', deck: player2Deck.slice(5), hand: player2Deck.slice(0, 5), discard: [], playArea: [], isAI: true },
    ],
    currentPlayer: 0,
    phase: 'action',
    actions: 1,
    buys: 1,
    coins: 0,
    turn: 1,
    gameOver: false,
    winner: null,
    log: ['Game started! Your turn.'],
    pendingEffect: null,
    merchantBonus: false,
  };
};

export const drawCards = (state, playerIndex, count) => {
  const newState = { ...state };
  const player = { ...newState.players[playerIndex] };
  player.deck = [...player.deck];
  player.hand = [...player.hand];
  player.discard = [...player.discard];
  for (let i = 0; i < count; i++) {
    if (player.deck.length === 0) {
      if (player.discard.length === 0) break;
      player.deck = shuffle([...player.discard]);
      player.discard = [];
    }
    if (player.deck.length > 0) player.hand.push(player.deck.pop());
  }
  newState.players = [...state.players];
  newState.players[playerIndex] = player;
  return newState;
};

export const playAction = (state, cardIndex) => {
  if (state.phase !== 'action' || state.actions <= 0) return state;
  const player = state.players[state.currentPlayer];
  const cardId = player.hand[cardIndex];
  const card = getCard(cardId);
  if (!isCardType(card, CardType.ACTION)) return state;
  let newState = { ...state };
  const newPlayer = { ...player };
  newPlayer.hand = [...player.hand];
  newPlayer.hand.splice(cardIndex, 1);
  newPlayer.playArea = [...player.playArea, cardId];
  newState.players = [...state.players];
  newState.players[state.currentPlayer] = newPlayer;
  newState.actions = state.actions - 1;
  newState.log = [...state.log, `${player.name} plays ${card.name}`];
  if (card.effect) {
    const effect = card.effect(newState);
    newState = applyEffect(newState, effect, cardId);
  }
  return newState;
};

const applyEffect = (state, effect, cardId) => {
  let newState = { ...state };
  if (effect.cardsToDraw) newState = drawCards(newState, state.currentPlayer, effect.cardsToDraw);
  if (effect.actionsToAdd) newState.actions += effect.actionsToAdd;
  if (effect.buysToAdd) newState.buys += effect.buysToAdd;
  if (effect.coinsToAdd) newState.coins += effect.coinsToAdd;
  if (effect.attack) newState = handleAttack(newState, effect.attack);
  if (effect.special) newState = handleSpecialEffect(newState, effect.special, cardId);
  return newState;
};

const handleSpecialEffect = (state, specialType, cardId) => {
  let newState = { ...state };
  const player = state.players[state.currentPlayer];
  switch (specialType) {
    case 'moneylender': {
      const copperIndex = player.hand.indexOf('copper');
      if (copperIndex !== -1) {
        const newPlayer = { ...player, hand: [...player.hand] };
        newPlayer.hand.splice(copperIndex, 1);
        newState.players = [...state.players];
        newState.players[state.currentPlayer] = newPlayer;
        newState.trash = [...state.trash, 'copper'];
        newState.coins += 3;
        newState.log = [...newState.log, `${player.name} trashes Copper for +$3`];
      }
      break;
    }
    case 'merchant': newState.merchantBonus = true; break;
    case 'cellar':
      if (player.isAI) {
        const newPlayer = { ...player, hand: [...player.hand], discard: [...player.discard] };
        const toDiscard = newPlayer.hand.filter(id => { const c = getCard(id); return isCardType(c, CardType.VICTORY) || isCardType(c, CardType.CURSE); });
        newPlayer.hand = newPlayer.hand.filter(id => { const c = getCard(id); return !isCardType(c, CardType.VICTORY) && !isCardType(c, CardType.CURSE); });
        newPlayer.discard.push(...toDiscard);
        newState.players = [...state.players];
        newState.players[state.currentPlayer] = newPlayer;
        if (toDiscard.length > 0) { newState = drawCards(newState, state.currentPlayer, toDiscard.length); newState.log = [...newState.log, `${player.name} discards ${toDiscard.length} and draws ${toDiscard.length}`]; }
      } else { newState.pendingEffect = { type: 'cellar', maxCards: 99 }; }
      break;
    case 'chapel':
      if (player.isAI) {
        const newPlayer = { ...player, hand: [...player.hand] };
        let trashed = 0; const toTrash = [];
        for (let i = newPlayer.hand.length - 1; i >= 0 && trashed < 4; i--) {
          if (['copper', 'estate', 'curse'].includes(newPlayer.hand[i])) { toTrash.push(newPlayer.hand[i]); newPlayer.hand.splice(i, 1); trashed++; }
        }
        if (toTrash.length > 0) { newState.trash = [...state.trash, ...toTrash]; newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer; newState.log = [...newState.log, `${player.name} trashes ${toTrash.length} cards`]; }
      } else { newState.pendingEffect = { type: 'chapel', maxCards: 4 }; }
      break;
    case 'workshop':
      if (player.isAI) { const opts = ['silver', 'village', 'smithy'].filter(id => state.supply[id] > 0 && getCard(id).cost <= 4); if (opts.length > 0) newState = gainCard(newState, state.currentPlayer, opts[0]); }
      else { newState.pendingEffect = { type: 'workshop', maxCost: 4 }; }
      break;
    case 'remodel':
      if (player.isAI && player.hand.length > 0) {
        const sorted = player.hand.map((id, idx) => ({ id, idx, card: getCard(id) })).sort((a, b) => a.card.cost - b.card.cost);
        const toTrash = sorted[0]; const maxCost = toTrash.card.cost + 2;
        const newPlayer = { ...player, hand: [...player.hand] }; newPlayer.hand.splice(toTrash.idx, 1);
        newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer; newState.trash = [...state.trash, toTrash.id];
        const opts = Object.keys(state.supply).filter(id => state.supply[id] > 0 && getCard(id).cost <= maxCost).sort((a, b) => getCard(b).cost - getCard(a).cost);
        if (opts.length > 0) { newState = gainCard(newState, state.currentPlayer, opts[0]); newState.log = [...newState.log, `${player.name} remodels ${toTrash.card.name} into ${getCard(opts[0]).name}`]; }
      } else { newState.pendingEffect = { type: 'remodel', step: 'trash' }; }
      break;
    case 'mine':
      if (player.isAI) {
        const treasures = player.hand.filter(id => isCardType(getCard(id), CardType.TREASURE));
        const toTrash = treasures.includes('silver') ? 'silver' : treasures.includes('copper') ? 'copper' : null;
        if (toTrash) {
          const idx = player.hand.indexOf(toTrash); const upgrade = toTrash === 'copper' ? 'silver' : 'gold';
          if (state.supply[upgrade] > 0) {
            const newPlayer = { ...player, hand: [...player.hand] }; newPlayer.hand.splice(idx, 1); newPlayer.hand.push(upgrade);
            newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
            newState.supply = { ...state.supply }; newState.supply[upgrade]--; newState.trash = [...state.trash, toTrash];
            newState.log = [...newState.log, `${player.name} mines ${getCard(toTrash).name} into ${getCard(upgrade).name}`];
          }
        }
      } else { newState.pendingEffect = { type: 'mine', step: 'trash' }; }
      break;
    case 'artisan':
      if (player.isAI) {
        const opts = Object.keys(state.supply).filter(id => state.supply[id] > 0 && getCard(id).cost <= 5).sort((a, b) => getCard(b).cost - getCard(a).cost);
        if (opts.length > 0) {
          const toGain = opts.includes('gold') ? 'gold' : opts[0];
          const newPlayer = { ...state.players[state.currentPlayer], hand: [...state.players[state.currentPlayer].hand, toGain] };
          newState.supply = { ...state.supply }; newState.supply[toGain]--;
          const sorted = newPlayer.hand.map((id, idx) => ({ id, idx, card: getCard(id) })).sort((a, b) => a.card.cost - b.card.cost);
          const toPutBack = sorted[0]; newPlayer.hand.splice(toPutBack.idx, 1); newPlayer.deck = [...newPlayer.deck, toPutBack.id];
          newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
          newState.log = [...newState.log, `${player.name} gains ${getCard(toGain).name} and topdecks a card`];
        }
      } else { newState.pendingEffect = { type: 'artisan', step: 'gain', maxCost: 5 }; }
      break;
    case 'bureaucrat':
      if (state.supply.silver > 0) {
        const newPlayer = { ...player, deck: [...player.deck, 'silver'] };
        newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
        newState.supply = { ...state.supply }; newState.supply.silver--;
        newState.log = [...newState.log, `${player.name} gains Silver onto deck`];
      }
      break;
    case 'bandit':
      if (state.supply.gold > 0) { newState = gainCard(newState, state.currentPlayer, 'gold'); newState.log = [...newState.log, `${player.name} gains a Gold`]; }
      break;
    case 'councilRoom':
      const other = state.currentPlayer === 0 ? 1 : 0;
      newState = drawCards(newState, other, 1);
      newState.log = [...newState.log, `${state.players[other].name} draws a card`];
      break;
    case 'library':
      const toDraw = Math.max(0, 7 - player.hand.length);
      if (toDraw > 0) { newState = drawCards(newState, state.currentPlayer, toDraw); newState.log = [...newState.log, `${player.name} draws to 7 cards`]; }
      break;
    case 'vassal': {
      const newPlayer = { ...player, deck: [...player.deck] };
      if (newPlayer.deck.length === 0 && player.discard.length > 0) { newPlayer.deck = shuffle([...player.discard]); newPlayer.discard = []; }
      if (newPlayer.deck.length > 0) {
        const topCard = newPlayer.deck.pop(); const card = getCard(topCard);
        newPlayer.discard = [...(newPlayer.discard || player.discard), topCard];
        newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
        newState.log = [...newState.log, `${player.name} discards ${card.name}`];
        if (isCardType(card, CardType.ACTION) && player.isAI) {
          newPlayer.discard.pop(); newPlayer.playArea = [...player.playArea, topCard];
          if (card.effect) { const effect = card.effect(newState); newState = applyEffect(newState, effect, topCard); }
        }
      }
      break;
    }
    case 'harbinger':
      if (player.isAI && player.discard.length > 0) {
        const newPlayer = { ...player, discard: [...player.discard] };
        const sorted = newPlayer.discard.map((id, idx) => ({ id, idx, card: getCard(id) })).sort((a, b) => b.card.cost - a.card.cost);
        if (sorted.length > 0) {
          const best = sorted[0]; newPlayer.discard.splice(best.idx, 1); newPlayer.deck = [...player.deck, best.id];
          newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
          newState.log = [...newState.log, `${player.name} topdecks ${best.card.name}`];
        }
      }
      break;
    case 'sentry':
      if (player.isAI) {
        const newPlayer = { ...player, deck: [...player.deck] }; const revealed = [];
        for (let i = 0; i < 2 && newPlayer.deck.length > 0; i++) revealed.push(newPlayer.deck.pop());
        const toTrash = revealed.filter(id => ['copper', 'curse', 'estate'].includes(id));
        const toKeep = revealed.filter(id => !['copper', 'curse', 'estate'].includes(id));
        newPlayer.deck.push(...toKeep); newState.trash = [...state.trash, ...toTrash];
        newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
        if (toTrash.length > 0) newState.log = [...newState.log, `${player.name} trashes ${toTrash.length} cards with Sentry`];
      }
      break;
    case 'poacher': {
      const emptyPiles = Object.values(state.supply).filter(c => c === 0).length;
      if (emptyPiles > 0 && player.hand.length > 0) {
        if (player.isAI) {
          const newPlayer = { ...player, hand: [...player.hand], discard: [...player.discard] };
          const toDiscard = Math.min(emptyPiles, newPlayer.hand.length);
          for (let i = 0; i < toDiscard; i++) {
            const sorted = newPlayer.hand.map((id, idx) => ({ id, idx, card: getCard(id) })).sort((a, b) => {
              const av = isCardType(a.card, CardType.VICTORY) ? 0 : 1; const bv = isCardType(b.card, CardType.VICTORY) ? 0 : 1;
              if (av !== bv) return av - bv; return a.card.cost - b.card.cost;
            });
            newPlayer.discard.push(newPlayer.hand.splice(sorted[0].idx, 1)[0]);
          }
          newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
          newState.log = [...newState.log, `${player.name} discards ${toDiscard} cards (Poacher)`];
        } else { newState.pendingEffect = { type: 'poacher', cardsToDiscard: emptyPiles }; }
      }
      break;
    }
    case 'throneRoom':
      if (player.isAI) {
        const actions = player.hand.map((id, idx) => ({ id, idx, card: getCard(id) })).filter(c => isCardType(c.card, CardType.ACTION));
        if (actions.length > 0) {
          actions.sort((a, b) => b.card.cost - a.card.cost);
          const toPlay = actions[0]; const newPlayer = { ...player, hand: [...player.hand], playArea: [...player.playArea, toPlay.id] };
          newPlayer.hand.splice(toPlay.idx, 1);
          newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
          newState.log = [...newState.log, `${player.name} plays ${toPlay.card.name} twice with Throne Room`];
          if (toPlay.card.effect) { const effect = toPlay.card.effect(newState); newState = applyEffect(newState, effect, toPlay.id); newState = applyEffect(newState, effect, toPlay.id); }
        }
      } else { newState.pendingEffect = { type: 'throneRoom' }; }
      break;
  }
  return newState;
};

export const gainCard = (state, playerIndex, cardId, toHand = false) => {
  if (state.supply[cardId] <= 0) return state;
  const newState = { ...state }; const player = { ...state.players[playerIndex] };
  if (toHand) player.hand = [...player.hand, cardId]; else player.discard = [...player.discard, cardId];
  newState.players = [...state.players]; newState.players[playerIndex] = player;
  newState.supply = { ...state.supply }; newState.supply[cardId]--;
  return newState;
};

const handleAttack = (state, attackType) => {
  let newState = { ...state };
  const opponentIndex = state.currentPlayer === 0 ? 1 : 0;
  const opponent = state.players[opponentIndex];
  if (opponent.hand.includes('moat')) { newState.log = [...newState.log, `${opponent.name} reveals Moat!`]; return newState; }
  switch (attackType) {
    case 'discardTo3':
      if (opponent.hand.length > 3) {
        if (opponent.isAI) newState = aiDiscardTo(newState, opponentIndex, 3);
        else newState.pendingEffect = { type: 'militia', cardsToDiscard: opponent.hand.length - 3 };
      }
      break;
    case 'curse':
      if (state.supply.curse > 0) { newState = gainCard(newState, opponentIndex, 'curse'); newState.log = [...newState.log, `${opponent.name} gains a Curse`]; }
      break;
    case 'bureaucrat': {
      const vics = opponent.hand.filter(id => isCardType(getCard(id), CardType.VICTORY));
      if (vics.length > 0) {
        const newOpp = { ...opponent, hand: [...opponent.hand], deck: [...opponent.deck] };
        const idx = newOpp.hand.indexOf(vics[0]); newOpp.hand.splice(idx, 1); newOpp.deck.push(vics[0]);
        newState.players = [...state.players]; newState.players[opponentIndex] = newOpp;
        newState.log = [...newState.log, `${opponent.name} topdecks ${getCard(vics[0]).name}`];
      }
      break;
    }
    case 'bandit': {
      const newOpp = { ...opponent, deck: [...opponent.deck], discard: [...opponent.discard] };
      if (newOpp.deck.length < 2 && opponent.discard.length > 0) { newOpp.deck = [...newOpp.deck, ...shuffle([...opponent.discard])]; newOpp.discard = []; }
      const revealed = []; for (let i = 0; i < 2 && newOpp.deck.length > 0; i++) revealed.push(newOpp.deck.pop());
      const treasures = revealed.filter(id => { const c = getCard(id); return isCardType(c, CardType.TREASURE) && id !== 'copper'; });
      const others = revealed.filter(id => { const c = getCard(id); return !isCardType(c, CardType.TREASURE) || id === 'copper'; });
      if (treasures.length > 0) {
        treasures.sort((a, b) => getCard(b).cost - getCard(a).cost);
        newState.trash = [...state.trash, treasures[0]]; newOpp.discard.push(...treasures.slice(1), ...others);
        newState.log = [...newState.log, `${opponent.name} trashes ${getCard(treasures[0]).name}`];
      } else { newOpp.discard.push(...revealed); }
      newState.players = [...state.players]; newState.players[opponentIndex] = newOpp;
      break;
    }
  }
  return newState;
};

const aiDiscardTo = (state, playerIndex, target) => {
  const player = state.players[playerIndex];
  const newPlayer = { ...player, hand: [...player.hand], discard: [...player.discard] };
  while (newPlayer.hand.length > target) {
    const sorted = newPlayer.hand.map((id, idx) => ({ id, idx, card: getCard(id) })).sort((a, b) => {
      const av = isCardType(a.card, CardType.VICTORY) || isCardType(a.card, CardType.CURSE) ? 0 : 1;
      const bv = isCardType(b.card, CardType.VICTORY) || isCardType(b.card, CardType.CURSE) ? 0 : 1;
      if (av !== bv) return av - bv; return a.card.cost - b.card.cost;
    });
    newPlayer.discard.push(newPlayer.hand.splice(sorted[0].idx, 1)[0]);
  }
  const newState = { ...state }; newState.players = [...state.players]; newState.players[playerIndex] = newPlayer;
  newState.log = [...state.log, `${player.name} discards ${player.hand.length - newPlayer.hand.length} cards`];
  return newState;
};

export const discardCards = (state, cardIndices) => {
  const playerIndex = state.pendingEffect?.type === 'militia' ? (state.currentPlayer === 0 ? 1 : 0) : state.currentPlayer;
  const player = state.players[playerIndex];
  const newState = { ...state }; const newPlayer = { ...player };
  const discarded = []; const newHand = [];
  player.hand.forEach((cardId, index) => { if (cardIndices.includes(index)) discarded.push(cardId); else newHand.push(cardId); });
  newPlayer.hand = newHand; newPlayer.discard = [...player.discard, ...discarded];
  newState.players = [...state.players]; newState.players[playerIndex] = newPlayer;
  newState.pendingEffect = null; newState.log = [...state.log, `${player.name} discards ${discarded.length} cards`];
  return newState;
};

export const trashCards = (state, cardIndices) => {
  const player = state.players[state.currentPlayer];
  const newState = { ...state }; const newPlayer = { ...player };
  const trashed = []; const newHand = [];
  player.hand.forEach((cardId, index) => { if (cardIndices.includes(index)) trashed.push(cardId); else newHand.push(cardId); });
  newPlayer.hand = newHand; newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
  newState.trash = [...state.trash, ...trashed];
  if (state.pendingEffect?.type === 'cellar') {
    newPlayer.discard = [...player.discard, ...trashed]; newState.trash = state.trash;
    const drawState = drawCards(newState, state.currentPlayer, trashed.length);
    drawState.log = [...state.log, `${player.name} discards ${trashed.length} and draws ${trashed.length}`];
    drawState.pendingEffect = null; return drawState;
  }
  newState.log = [...state.log, `${player.name} trashes ${trashed.map(id => getCard(id).name).join(', ')}`];
  newState.pendingEffect = null; return newState;
};

export const selectGainCard = (state, cardId) => {
  let newState = { ...state }; const player = state.players[state.currentPlayer];
  if (state.pendingEffect?.type === 'workshop') { newState = gainCard(newState, state.currentPlayer, cardId); newState.log = [...newState.log, `${player.name} gains ${getCard(cardId).name}`]; newState.pendingEffect = null; }
  if (state.pendingEffect?.type === 'remodel' && state.pendingEffect.step === 'gain') { newState = gainCard(newState, state.currentPlayer, cardId); newState.log = [...newState.log, `${player.name} gains ${getCard(cardId).name}`]; newState.pendingEffect = null; }
  if (state.pendingEffect?.type === 'artisan' && state.pendingEffect.step === 'gain') {
    const newPlayer = { ...player, hand: [...player.hand, cardId] }; newState.supply = { ...state.supply }; newState.supply[cardId]--;
    newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
    newState.log = [...newState.log, `${player.name} gains ${getCard(cardId).name} to hand`];
    newState.pendingEffect = { type: 'artisan', step: 'topdeck' };
  }
  if (state.pendingEffect?.type === 'mine' && state.pendingEffect.step === 'gain') {
    const newPlayer = { ...player, hand: [...player.hand, cardId] }; newState.supply = { ...state.supply }; newState.supply[cardId]--;
    newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
    newState.log = [...newState.log, `${player.name} gains ${getCard(cardId).name} to hand`]; newState.pendingEffect = null;
  }
  return newState;
};

export const selectTrashCard = (state, cardIndex) => {
  const player = state.players[state.currentPlayer]; const cardId = player.hand[cardIndex]; const card = getCard(cardId);
  const newState = { ...state }; const newPlayer = { ...player, hand: [...player.hand] }; newPlayer.hand.splice(cardIndex, 1);
  newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
  newState.trash = [...state.trash, cardId]; newState.log = [...state.log, `${player.name} trashes ${card.name}`];
  if (state.pendingEffect?.type === 'remodel') newState.pendingEffect = { type: 'remodel', step: 'gain', maxCost: card.cost + 2 };
  if (state.pendingEffect?.type === 'mine') newState.pendingEffect = { type: 'mine', step: 'gain', maxCost: card.cost + 3 };
  return newState;
};

export const topdeckCard = (state, cardIndex) => {
  const player = state.players[state.currentPlayer]; const cardId = player.hand[cardIndex];
  const newState = { ...state }; const newPlayer = { ...player, hand: [...player.hand], deck: [...player.deck] };
  newPlayer.hand.splice(cardIndex, 1); newPlayer.deck.push(cardId);
  newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
  newState.log = [...state.log, `${player.name} topdecks ${getCard(cardId).name}`]; newState.pendingEffect = null;
  return newState;
};

export const playTreasures = (state) => {
  let newState = { ...state }; const player = state.players[state.currentPlayer];
  const newPlayer = { ...player }; let totalCoins = state.coins; const treasures = []; const nonTreasures = []; let silverPlayed = false;
  player.hand.forEach(cardId => {
    const card = getCard(cardId);
    if (isCardType(card, CardType.TREASURE)) { treasures.push(cardId); totalCoins += card.coins; if (cardId === 'silver') silverPlayed = true; }
    else nonTreasures.push(cardId);
  });
  if (state.merchantBonus && silverPlayed) { totalCoins += 1; newState.log = [...state.log, `Merchant bonus: +$1`]; }
  newPlayer.hand = nonTreasures; newPlayer.playArea = [...player.playArea, ...treasures];
  newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
  newState.coins = totalCoins; newState.phase = 'buy';
  if (treasures.length > 0) newState.log = [...(newState.log || state.log), `${player.name} plays treasures for $${totalCoins}`];
  return newState;
};

export const buyCard = (state, cardId) => {
  if (state.phase !== 'buy' || state.buys <= 0) return state;
  const card = getCard(cardId); if (!card || card.cost > state.coins || state.supply[cardId] <= 0) return state;
  let newState = { ...state }; newState = gainCard(newState, state.currentPlayer, cardId);
  newState.coins = state.coins - card.cost; newState.buys = state.buys - 1;
  newState.log = [...newState.log, `${state.players[state.currentPlayer].name} buys ${card.name}`];
  return newState;
};

export const endTurn = (state) => {
  const newState = { ...state }; const player = state.players[state.currentPlayer];
  const newPlayer = { ...player }; newPlayer.discard = [...player.discard, ...player.hand, ...player.playArea];
  newPlayer.hand = []; newPlayer.playArea = [];
  newState.players = [...state.players]; newState.players[state.currentPlayer] = newPlayer;
  const drawnState = drawCards(newState, state.currentPlayer, 5);
  const nextPlayer = state.currentPlayer === 0 ? 1 : 0;
  drawnState.currentPlayer = nextPlayer; drawnState.phase = 'action'; drawnState.actions = 1; drawnState.buys = 1;
  drawnState.coins = 0; drawnState.merchantBonus = false; drawnState.pendingEffect = null;
  if (nextPlayer === 0) drawnState.turn = state.turn + 1;
  drawnState.log = [...drawnState.log, `--- Turn ${drawnState.turn}: ${drawnState.players[nextPlayer].name}'s turn ---`];
  return checkGameOver(drawnState);
};

export const calculateVP = (player) => {
  const allCards = [...player.deck, ...player.hand, ...player.discard, ...player.playArea];
  const totalCards = allCards.length;
  return allCards.reduce((total, cardId) => {
    const card = getCard(cardId);
    if (card.dynamicVP) return total + Math.floor(totalCards / 10);
    return total + (card.victoryPoints || 0);
  }, 0);
};

export const checkGameOver = (state) => {
  const newState = { ...state };
  const emptyPiles = Object.entries(state.supply).filter(([id, count]) => count === 0).length;
  if (state.supply.province === 0 || emptyPiles >= 3) {
    newState.gameOver = true;
    const scores = state.players.map(player => calculateVP(player)); newState.scores = scores;
    if (scores[0] > scores[1]) newState.winner = 0;
    else if (scores[1] > scores[0]) newState.winner = 1;
    else newState.winner = -1;
    newState.log = [...state.log, `Game Over! You ${scores[0]} - AI ${scores[1]}`, newState.winner === 0 ? 'You win!' : newState.winner === 1 ? 'AI wins!' : 'Tie!'];
  }
  return newState;
};

export const goToBuyPhase = (state) => playTreasures({ ...state, phase: 'buy' });
export const cancelPendingEffect = (state) => ({ ...state, pendingEffect: null });

// Aliases for GameBoard compatibility
export const createInitialState = createGameState;
export const playAllTreasures = playTreasures;
export const checkGameEnd = (state) => {
  const emptyPiles = Object.entries(state.supply).filter(([id, count]) => count === 0).length;
  if (state.supply.province === 0 || emptyPiles >= 3) {
    const scores = state.players.map(player => calculateVP(player));
    return { ended: true, scores };
  }
  return { ended: false, scores: null };
};

export const playTreasure = (state, cardIndex) => {
  const player = state.players[state.currentPlayer];
  const cardId = player.hand[cardIndex];
  const card = getCard(cardId);
  if (!isCardType(card, CardType.TREASURE)) return state;
  const newState = { ...state };
  const newPlayer = { ...player, hand: [...player.hand], playArea: [...player.playArea] };
  newPlayer.hand.splice(cardIndex, 1);
  newPlayer.playArea.push(cardId);
  let coinBonus = card.coins;
  if (cardId === 'silver' && state.merchantBonus) {
    coinBonus += 1;
    newState.merchantBonus = false;
  }
  newState.coins = state.coins + coinBonus;
  newState.players = [...state.players];
  newState.players[state.currentPlayer] = newPlayer;
  return newState;
};

export const handleEffectChoice = (state, choice) => {
  if (!state.pendingEffect) return state;
  const effectType = state.pendingEffect.type;

  if (effectType === 'cellar' && choice.selectedIndices) {
    return trashCards(state, choice.selectedIndices);
  }
  if (effectType === 'chapel' && choice.selectedIndices) {
    return trashCards(state, choice.selectedIndices);
  }
  if (effectType === 'militia' && choice.selectedIndices) {
    return discardCards(state, choice.selectedIndices);
  }
  if (effectType === 'poacher' && choice.selectedIndices) {
    return discardCards(state, choice.selectedIndices);
  }
  if (effectType === 'workshop' && choice.selectedCard) {
    return selectGainCard(state, choice.selectedCard);
  }
  if (effectType === 'remodel') {
    if (state.pendingEffect.step === 'trash' && choice.selectedIndex !== undefined) {
      return selectTrashCard(state, choice.selectedIndex);
    }
    if (state.pendingEffect.step === 'gain' && choice.selectedCard) {
      return selectGainCard(state, choice.selectedCard);
    }
  }
  if (effectType === 'mine') {
    if (state.pendingEffect.step === 'trash' && choice.selectedIndex !== undefined) {
      return selectTrashCard(state, choice.selectedIndex);
    }
    if (state.pendingEffect.step === 'gain' && choice.selectedCard) {
      return selectGainCard(state, choice.selectedCard);
    }
  }
  if (effectType === 'artisan') {
    if (state.pendingEffect.step === 'gain' && choice.selectedCard) {
      return selectGainCard(state, choice.selectedCard);
    }
    if (state.pendingEffect.step === 'topdeck' && choice.selectedIndex !== undefined) {
      return topdeckCard(state, choice.selectedIndex);
    }
  }
  if (effectType === 'throneRoom' && choice.selectedIndex !== undefined) {
    const player = state.players[state.currentPlayer];
    const cardId = player.hand[choice.selectedIndex];
    const card = getCard(cardId);
    if (!isCardType(card, CardType.ACTION)) return state;
    const newPlayer = { ...player, hand: [...player.hand], playArea: [...player.playArea, cardId] };
    newPlayer.hand.splice(choice.selectedIndex, 1);
    let newState = { ...state };
    newState.players = [...state.players];
    newState.players[state.currentPlayer] = newPlayer;
    newState.pendingEffect = null;
    newState.log = [...state.log, `${player.name} plays ${card.name} twice with Throne Room`];
    if (card.effect) {
      const effect = card.effect(newState);
      newState = applyEffect(newState, effect, cardId);
      newState = applyEffect(newState, effect, cardId);
    }
    return newState;
  }
  return state;
};
