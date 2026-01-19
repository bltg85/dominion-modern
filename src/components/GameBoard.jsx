import { useState, useEffect } from 'react';
import { createInitialState, playAction, playTreasure, goToBuyPhase, buyCard, endTurn, handleEffectChoice, playAllTreasures, checkGameEnd } from '../game/gameState';
import { getCard, isCardType, CardType, cardImages, cards } from '../data/cards';
import { executeAITurn } from '../game/ai';
import './GameBoard.css';

const Card = ({ cardId, onClick, selected, small, disabled, showCost }) => {
  const card = getCard(cardId);
  if (!card) return null;

  const getCardClass = () => {
    const types = [];
    if (isCardType(card, CardType.TREASURE)) types.push('treasure');
    if (isCardType(card, CardType.VICTORY)) types.push('victory');
    if (isCardType(card, CardType.ACTION)) types.push('action');
    if (isCardType(card, CardType.ATTACK)) types.push('attack');
    if (isCardType(card, CardType.REACTION)) types.push('reaction');
    if (isCardType(card, CardType.CURSE)) types.push('curse');
    return types[0] || 'action';
  };

  return (
    <div
      className={`card ${getCardClass()} ${selected ? 'selected' : ''} ${small ? 'small' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <div className="card-image">{cardImages[cardId]}</div>
      <div className="card-name">{card.name}</div>
      {showCost && <div className="card-cost">{card.cost}</div>}
      <div className="card-description">{card.description}</div>
    </div>
  );
};

const SupplyPile = ({ cardId, count, onClick, disabled }) => {
  const card = getCard(cardId);
  if (!card) return null;

  return (
    <div
      className={`supply-pile ${count === 0 ? 'empty' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={disabled || count === 0 ? undefined : onClick}
    >
      <Card cardId={cardId} small showCost disabled={disabled || count === 0} />
      <div className="pile-count">{count}</div>
    </div>
  );
};

export default function GameBoard() {
  const [gameState, setGameState] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  useEffect(() => {
    startNewGame();
  }, []);

  useEffect(() => {
    if (gameState && gameState.currentPlayer === 1 && !gameOver && !gameState.pendingEffect) {
      runAITurn();
    }
  }, [gameState?.currentPlayer, gameState?.pendingEffect, gameOver]);

  const startNewGame = () => {
    const state = createInitialState();
    setGameState(state);
    setSelectedCards([]);
    setMessage('Din tur! Spela actions eller gå till köpfasen.');
    setGameOver(false);
  };

  const runAITurn = async () => {
    if (!gameState || aiThinking) return;
    setAiThinking(true);
    setMessage('AI tänker...');

    try {
      const finalState = await executeAITurn(gameState, (newState) => {
        setGameState(newState);
      });

      const endResult = checkGameEnd(finalState);
      if (endResult.ended) {
        setGameOver(true);
        setMessage(getWinnerMessage(endResult));
      } else {
        setMessage('Din tur! Spela actions eller gå till köpfasen.');
      }
    } catch (error) {
      console.error('AI error:', error);
    }

    setAiThinking(false);
  };

  const getWinnerMessage = (endResult) => {
    const p1 = endResult.scores[0];
    const p2 = endResult.scores[1];
    if (p1 > p2) return `🎉 Du vann! ${p1}-${p2}`;
    if (p2 > p1) return `😔 AI vann! ${p2}-${p1}`;
    return `🤝 Oavgjort! ${p1}-${p2}`;
  };

  const handleCardClick = (index) => {
    if (!gameState || gameState.currentPlayer !== 0 || aiThinking) return;

    const player = gameState.players[0];
    const cardId = player.hand[index];
    const card = getCard(cardId);

    if (gameState.pendingEffect) {
      handlePendingEffectCardClick(index, cardId);
      return;
    }

    if (gameState.phase === 'action' && isCardType(card, CardType.ACTION) && gameState.actions > 0) {
      const newState = playAction(gameState, index);
      setGameState(newState);
      checkForGameEnd(newState);
    } else if (gameState.phase === 'buy' && isCardType(card, CardType.TREASURE)) {
      const newState = playTreasure(gameState, index);
      setGameState(newState);
    }
  };

  const handlePendingEffectCardClick = (index, cardId) => {
    const effect = gameState.pendingEffect;
    const card = getCard(cardId);

    // Multi-select effects (cellar, chapel, militia, poacher)
    if (['cellar', 'chapel', 'militia', 'poacher'].includes(effect.type)) {
      const newSelected = [...selectedCards];
      const idx = newSelected.indexOf(index);
      if (idx > -1) {
        newSelected.splice(idx, 1);
      } else {
        const maxCards = effect.type === 'chapel' ? 4 :
                        effect.type === 'militia' ? effect.cardsToDiscard :
                        effect.type === 'poacher' ? effect.cardsToDiscard : 999;
        if (newSelected.length < maxCards) {
          newSelected.push(index);
        }
      }
      setSelectedCards(newSelected);
      return;
    }

    // Single-select effects (remodel trash, mine trash, artisan topdeck, throneRoom)
    if (effect.type === 'remodel' && effect.step === 'trash') {
      const newState = handleEffectChoice(gameState, { selectedIndex: index });
      setGameState(newState);
      setSelectedCards([]);
      checkForGameEnd(newState);
      return;
    }
    if (effect.type === 'mine' && effect.step === 'trash') {
      if (isCardType(card, CardType.TREASURE)) {
        const newState = handleEffectChoice(gameState, { selectedIndex: index });
        setGameState(newState);
        setSelectedCards([]);
        checkForGameEnd(newState);
      }
      return;
    }
    if (effect.type === 'artisan' && effect.step === 'topdeck') {
      const newState = handleEffectChoice(gameState, { selectedIndex: index });
      setGameState(newState);
      setSelectedCards([]);
      checkForGameEnd(newState);
      return;
    }
    if (effect.type === 'throneRoom') {
      if (isCardType(card, CardType.ACTION)) {
        const newState = handleEffectChoice(gameState, { selectedIndex: index });
        setGameState(newState);
        setSelectedCards([]);
        checkForGameEnd(newState);
      }
      return;
    }
  };

  const handleSupplyClick = (cardId) => {
    if (!gameState || gameState.currentPlayer !== 0 || aiThinking) return;
    const card = getCard(cardId);

    if (gameState.pendingEffect) {
      const effect = gameState.pendingEffect;
      // Handle workshop, remodel gain, mine gain, artisan gain
      if (effect.type === 'workshop' && card.cost <= 4) {
        const newState = handleEffectChoice(gameState, { selectedCard: cardId });
        setGameState(newState);
        checkForGameEnd(newState);
        return;
      }
      if (effect.type === 'remodel' && effect.step === 'gain' && card.cost <= effect.maxCost) {
        const newState = handleEffectChoice(gameState, { selectedCard: cardId });
        setGameState(newState);
        checkForGameEnd(newState);
        return;
      }
      if (effect.type === 'mine' && effect.step === 'gain' && isCardType(card, CardType.TREASURE) && card.cost <= effect.maxCost) {
        const newState = handleEffectChoice(gameState, { selectedCard: cardId });
        setGameState(newState);
        checkForGameEnd(newState);
        return;
      }
      if (effect.type === 'artisan' && effect.step === 'gain' && card.cost <= 5) {
        const newState = handleEffectChoice(gameState, { selectedCard: cardId });
        setGameState(newState);
        checkForGameEnd(newState);
        return;
      }
      return;
    }

    if (gameState.phase === 'buy' && gameState.buys > 0) {
      if (card.cost <= gameState.coins) {
        const newState = buyCard(gameState, cardId);
        setGameState(newState);
        checkForGameEnd(newState);
      }
    }
  };

  const handleGoToBuyPhase = () => {
    if (!gameState || gameState.currentPlayer !== 0 || gameState.pendingEffect) return;
    const newState = goToBuyPhase(gameState);
    setGameState(newState);
  };

  const handlePlayAllTreasures = () => {
    if (!gameState || gameState.currentPlayer !== 0 || gameState.phase !== 'buy') return;
    const newState = playAllTreasures(gameState);
    setGameState(newState);
  };

  const handleEndTurn = () => {
    if (!gameState || gameState.currentPlayer !== 0 || gameState.pendingEffect) return;
    const newState = endTurn(gameState);
    setGameState(newState);
    checkForGameEnd(newState);
  };

  const handleConfirmSelection = () => {
    if (!gameState || !gameState.pendingEffect) return;
    const effect = gameState.pendingEffect;

    // For militia/poacher, must select exact number
    if (effect.type === 'militia' && selectedCards.length !== effect.cardsToDiscard) return;
    if (effect.type === 'poacher' && selectedCards.length !== effect.cardsToDiscard) return;

    const newState = handleEffectChoice(gameState, { selectedIndices: selectedCards });
    setGameState(newState);
    setSelectedCards([]);
    checkForGameEnd(newState);
  };

  const checkForGameEnd = (state) => {
    const endResult = checkGameEnd(state);
    if (endResult.ended) {
      setGameOver(true);
      setMessage(getWinnerMessage(endResult));
    }
  };

  const getPendingEffectMessage = (effect) => {
    if (!effect) return '';
    switch (effect.type) {
      case 'cellar': return 'Cellar: Välj kort att slänga, dra lika många.';
      case 'chapel': return 'Chapel: Välj upp till 4 kort att slänga (trash).';
      case 'militia': return `Militia: Välj ${effect.cardsToDiscard} kort att slänga.`;
      case 'poacher': return `Poacher: Välj ${effect.cardsToDiscard} kort att slänga.`;
      case 'workshop': return 'Workshop: Välj ett kort som kostar max $4.';
      case 'remodel':
        return effect.step === 'trash'
          ? 'Remodel: Välj ett kort att slänga (trash).'
          : `Remodel: Välj ett kort som kostar max $${effect.maxCost}.`;
      case 'mine':
        return effect.step === 'trash'
          ? 'Mine: Välj en skatt att slänga (trash).'
          : `Mine: Välj en skatt som kostar max $${effect.maxCost}.`;
      case 'artisan':
        return effect.step === 'gain'
          ? 'Artisan: Välj ett kort som kostar max $5 till handen.'
          : 'Artisan: Välj ett kort att lägga överst på leken.';
      case 'throneRoom': return 'Throne Room: Välj ett action-kort att spela dubbelt.';
      default: return effect.message || 'Väntar på val...';
    }
  };

  if (!gameState) return <div className="loading">Laddar spel...</div>;

  const player = gameState.players[0];
  const opponent = gameState.players[1];
  const isMyTurn = gameState.currentPlayer === 0;
  const pendingEffect = gameState.pendingEffect;

  const treasures = ['copper', 'silver', 'gold'];
  const victories = ['estate', 'duchy', 'province', 'curse'];
  const kingdoms = Object.keys(gameState.supply).filter(
    k => !treasures.includes(k) && !victories.includes(k)
  );

  return (
    <div className="game-board">
      <header className="game-header">
        <h1>🏰 Dominion</h1>
        <button className="new-game-btn" onClick={startNewGame}>Nytt Spel</button>
      </header>

      <div className="message-bar">
        {pendingEffect ? (
          <span className="pending-effect">{getPendingEffectMessage(pendingEffect)}</span>
        ) : (
          <span>{message}</span>
        )}
      </div>

      <div className="main-area">
        <div className="supply-area">
          <h3>Förråd</h3>
          <div className="supply-section">
            <h4>Skatter</h4>
            <div className="supply-row">
              {treasures.map(id => (
                <SupplyPile
                  key={id}
                  cardId={id}
                  count={gameState.supply[id]}
                  onClick={() => handleSupplyClick(id)}
                  disabled={!isMyTurn || gameState.phase !== 'buy' || pendingEffect?.type !== 'gainCard'}
                />
              ))}
            </div>
          </div>

          <div className="supply-section">
            <h4>Seger & Förbannelse</h4>
            <div className="supply-row">
              {victories.map(id => (
                <SupplyPile
                  key={id}
                  cardId={id}
                  count={gameState.supply[id]}
                  onClick={() => handleSupplyClick(id)}
                  disabled={!isMyTurn || gameState.phase !== 'buy' || pendingEffect?.type !== 'gainCard'}
                />
              ))}
            </div>
          </div>

          <div className="supply-section">
            <h4>Kungariket</h4>
            <div className="supply-grid">
              {kingdoms.map(id => (
                <SupplyPile
                  key={id}
                  cardId={id}
                  count={gameState.supply[id]}
                  onClick={() => handleSupplyClick(id)}
                  disabled={!isMyTurn || (gameState.phase !== 'buy' && pendingEffect?.type !== 'gainCard')}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="play-area">
          <div className="opponent-info">
            <h3>🤖 AI</h3>
            <div className="player-stats">
              <span>Kort i lek: {opponent.deck.length + opponent.hand.length + opponent.discard.length + opponent.playArea.length}</span>
            </div>
          </div>

          <div className="current-play">
            <h4>Spelade kort</h4>
            <div className="played-cards">
              {player.playArea.map((cardId, i) => (
                <Card key={i} cardId={cardId} small />
              ))}
            </div>
          </div>

          <div className="turn-info">
            <div className="resources">
              <span className="resource actions">⚡ {gameState.actions}</span>
              <span className="resource buys">🛒 {gameState.buys}</span>
              <span className="resource coins">💰 {gameState.coins}</span>
            </div>
            <div className="phase-indicator">
              Fas: {gameState.phase === 'action' ? 'Action' : 'Köp'}
            </div>
          </div>

          <div className="action-buttons">
            {gameState.phase === 'action' && isMyTurn && !pendingEffect && (
              <button onClick={handleGoToBuyPhase}>Gå till köpfas →</button>
            )}
            {gameState.phase === 'buy' && isMyTurn && !pendingEffect && (
              <>
                <button onClick={handlePlayAllTreasures}>Spela alla skatter</button>
                <button onClick={handleEndTurn}>Avsluta tur</button>
              </>
            )}
            {pendingEffect && ['cellar', 'chapel', 'militia', 'poacher'].includes(pendingEffect.type) && (
              <button onClick={handleConfirmSelection}>
                Bekräfta ({selectedCards.length}{pendingEffect.type === 'militia' || pendingEffect.type === 'poacher' ? `/${pendingEffect.cardsToDiscard}` : ''} valda)
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="hand-area">
        <h3>Din hand ({player.hand.length} kort)</h3>
        <div className="hand">
          {player.hand.map((cardId, index) => (
            <Card
              key={index}
              cardId={cardId}
              onClick={() => handleCardClick(index)}
              selected={selectedCards.includes(index)}
              disabled={!isMyTurn || aiThinking}
            />
          ))}
        </div>
        <div className="deck-info">
          <span>📚 Lek: {player.deck.length}</span>
          <span>🗑️ Slängt: {player.discard.length}</span>
        </div>
      </div>

      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2>Spelet är slut!</h2>
            <p className="final-score">{message}</p>
            <button onClick={startNewGame}>Spela igen</button>
          </div>
        </div>
      )}
    </div>
  );
}
