export type GamePhase = 'lobby' | 'question' | 'betting' | 'answering' | 'reveal' | 'showdown' | 'payout' | 'intermission';

export type PlayerId = string;

export interface NumericCard { digit: 0|1|2|3|4|5|6|7|8|9 }

export interface PlayerState {
  id: PlayerId;
  name: string;
  bankroll: number;
  hand: NumericCard[];
  hasFolded: boolean;
  isAllIn: boolean;
  submittedAnswer?: number;
}

export interface Question {
  id: string;
  text: string;
  answer: number; // authoritative numeric answer
  category?: string;
  difficulty?: number; // 1-5
}

export interface RoundState {
  roundId: string;
  question: Question | null;
  communityCards: NumericCard[];
  pot: number;
  dealerIndex: number;
  answerDeadline?: number;
  // Betting state
  bettingRound?: 1 | 2; // 1: pre-community, 2: post-community
  currentBet?: number; // highest bet to be matched in current betting round
  currentPlayerIndex?: number; // seat index of player to act, -1 when closed
  isBettingOpen?: boolean; // when false, actions disabled until host advances
  playerBets?: Record<string, number>; // contributions this betting round by playerId
}

export interface GameState {
  code: string; // venue / event code (shown to humans; not the socket session id)
  /** Table/seat grouping within one venue — each table has its own capped roster and phase. */
  tableId: string;
  hostId: string;
  createdAt: number;
  phase: GamePhase;
  bigBlind: number;
  smallBlind: number;
  minPlayers: number;
  maxPlayers: number;
  round: RoundState;
  players: PlayerState[];
}

export const DIGITS: ReadonlyArray<0|1|2|3|4|5|6|7|8|9> = Object.freeze([0,1,2,3,4,5,6,7,8,9]);

export function compareHandsToAnswer(candidateNumbers: number[], correctAnswer: number): number {
  if (candidateNumbers.length === 0) return Infinity;
  let best = Infinity;
  for (const value of candidateNumbers) {
    const delta = Math.abs(value - correctAnswer);
    if (delta < best) best = delta;
  }
  return best;
}

export function generateAllArrangements(digits: number[]): number[] {
  // generate all permutations and interpret as base-10 numbers without leading zero trimming
  const results: number[] = [];
  const used = new Array(digits.length).fill(false);
  const stack: number[] = [];
  const dfs = () => {
    if (stack.length === digits.length) {
      const value = Number(stack.join(''));
      results.push(value);
      return;
    }
    for (let i=0;i<digits.length;i++) {
      if (used[i]) continue;
      used[i] = true;
      stack.push(digits[i]);
      dfs();
      stack.pop();
      used[i] = false;
    }
  };
  dfs();
  return results;
}

export function bestHandDistanceToAnswer(hand: NumericCard[], community: NumericCard[], answer: number): number {
  const allDigits = hand.concat(community).map(c => c.digit);
  const candidates = generateAllArrangements(allDigits);
  return compareHandsToAnswer(candidates, answer);
}

export function createEmptyGame(code: string, hostId: string = '', tableId: string = '1'): GameState {
  const table = typeof tableId === 'string' && tableId.trim() ? tableId.trim() : '1'
  return {
    code,
    tableId: table,
    hostId,
    createdAt: Date.now(),
    phase: 'lobby',
    bigBlind: 20,
    smallBlind: 10,
    minPlayers: 2,
    maxPlayers: 8,
    round: {
      roundId: 'r1',
      question: null,
      communityCards: [],
      pot: 0,
      dealerIndex: 0,
      bettingRound: 1,
      currentBet: 0,
      currentPlayerIndex: -1,
      isBettingOpen: false,
      playerBets: {},
    },
    players: [],
  };
}

export function addPlayer(state: GameState, id: string, name: string, startingBankroll = 1000): GameState {
  if (state.players.find(p => p.id === id)) return state;
  return {
    ...state,
    players: state.players.concat({ id, name, bankroll: startingBankroll, hand: [], hasFolded: false, isAllIn: false })
  };
}

export function removePlayer(state: GameState, id: string): GameState {
  return { ...state, players: state.players.filter(p => p.id !== id) };
}

export function dealCard(): NumericCard {
  const digit = DIGITS[Math.floor(Math.random()*DIGITS.length)];
  return { digit };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function nextRoundId(prev: string): string {
  const n = Number(prev.replace(/[^0-9]/g, '')) || 0;
  return `r${n+1}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

// Sample questions for gameplay
export const SAMPLE_QUESTIONS: ReadonlyArray<{ id: string; text: string; answer: number; category?: string; difficulty?: number }> = [
  { id: 'q1', text: 'How many minutes are there in a day?', answer: 1440, category: 'Time', difficulty: 1 },
  { id: 'q2', text: 'What is the boiling point of water in Kelvin?', answer: 373, category: 'Science', difficulty: 1 },
  { id: 'q3', text: 'How many bones are in the adult human body?', answer: 206, category: 'Biology', difficulty: 2 },
  { id: 'q4', text: 'What year did the Apollo 11 land on the moon?', answer: 1969, category: 'History', difficulty: 2 },
  { id: 'q5', text: 'What is the average distance from Earth to the Moon in km?', answer: 384400, category: 'Astronomy', difficulty: 3 },
];

// Game flow functions
export function startGame(state: GameState): GameState {
  return { ...state, phase: 'question' };
}

export function setQuestion(state: GameState): GameState {
  const randomQuestion = SAMPLE_QUESTIONS[Math.floor(Math.random() * SAMPLE_QUESTIONS.length)];
  
  return {
    ...state,
    phase: 'question', // Stay in question phase so players can see the question
    round: {
      ...state.round,
      question: randomQuestion,
      communityCards: [],
    },
  };
}

/** Hole cards only + blinds; first wagering round (no community yet). */
export function dealInitialCards(state: GameState): GameState {
  const updatedPlayers = state.players.map(player => ({
    ...player,
    hand: [dealCard(), dealCard()],
  }));

  // Initialize betting state for round 1 and auto-post blinds
  const smallBlindIndex = updatedPlayers.length > 0 ? (state.round.dealerIndex + 1) % Math.max(1, updatedPlayers.length) : -1;
  const bigBlindIndex = updatedPlayers.length > 0 ? (state.round.dealerIndex + 2) % Math.max(1, updatedPlayers.length) : -1;

  let playersAfterBlinds = updatedPlayers;
  let pot = state.round.pot;
  const playerBets: Record<string, number> = {};

  const postBlind = (idx: number, amount: number) => {
    if (idx < 0 || idx >= playersAfterBlinds.length || amount <= 0) return;
    const player = playersAfterBlinds[idx];
    const contribution = Math.min(player.bankroll, amount);
    playersAfterBlinds = playersAfterBlinds.map((p, i) => i === idx ? { ...p, bankroll: p.bankroll - contribution, isAllIn: p.bankroll - contribution === 0 } : p);
    pot += contribution;
    playerBets[player.id] = (playerBets[player.id] || 0) + contribution;
  };

  postBlind(smallBlindIndex, state.smallBlind);
  postBlind(bigBlindIndex, state.bigBlind);

  const startIndex = playersAfterBlinds.length > 0 ? (bigBlindIndex + 1) % playersAfterBlinds.length : -1;
  const findNextToAct = (start: number): number => {
    if (playersAfterBlinds.length === 0) return -1;
    for (let step = 0; step < playersAfterBlinds.length; step++) {
      const idx = (start + step) % playersAfterBlinds.length;
      const p = playersAfterBlinds[idx];
      if (!p.hasFolded && !p.isAllIn) return idx;
    }
    return -1;
  };

  const currentPlayerIndex = findNextToAct(startIndex);

  return {
    ...state,
    phase: 'betting',
    players: playersAfterBlinds,
    round: {
      ...state.round,
      communityCards: [],
      bettingRound: 1,
      currentBet: Math.max(state.bigBlind, 0),
      currentPlayerIndex,
      isBettingOpen: true,
      playerBets,
      pot,
    },
  };
}

/** After round-1 wagering is closed: deal five community cards and open round-2 wagering. */
export function dealCommunityCards(state: GameState): GameState {
  if (state.phase !== 'betting') return state;
  if (state.round.bettingRound !== 1) return state;
  if (state.round.isBettingOpen) return state;
  if ((state.round.communityCards?.length ?? 0) >= 5) return state;

  const communityCards: NumericCard[] = [dealCard(), dealCard(), dealCard(), dealCard(), dealCard()];

  const findNextToAct = (): number => {
    const players = state.players;
    if (players.length === 0) return -1;
    const start = (state.round.dealerIndex + 1) % players.length;
    for (let step = 0; step < players.length; step++) {
      const idx = (start + step) % players.length;
      const p = players[idx];
      if (!p.hasFolded && !p.isAllIn) return idx;
    }
    return -1;
  };

  return {
    ...state,
    phase: 'betting',
    round: {
      ...state.round,
      communityCards,
      bettingRound: 2,
      currentBet: 0,
      currentPlayerIndex: findNextToAct(),
      isBettingOpen: true,
      playerBets: {},
    },
  };
}

export function placeBet(state: GameState, playerId: string, amount: number): GameState {
  if (amount <= 0) return state;
  const updatedPlayers = state.players.map(player => {
    if (player.id === playerId) {
      const newBankroll = Math.max(0, player.bankroll - amount);
      return { ...player, bankroll: newBankroll, isAllIn: newBankroll === 0 };
    }
    return player;
  });
  return {
    ...state,
    round: { 
      ...state.round, 
      pot: state.round.pot + amount,
      playerBets: { ...(state.round.playerBets || {}), [playerId]: ((state.round.playerBets || {})[playerId] || 0) + amount }
    },
    players: updatedPlayers,
  };
}

// Betting helpers and actions
function getSeatIndexByPlayerId(state: GameState, playerId: string): number {
  return state.players.findIndex(p => p.id === playerId);
}

function amountToCall(state: GameState, playerId: string): number {
  const current = state.round.currentBet || 0;
  const contributed = (state.round.playerBets || {})[playerId] || 0;
  return Math.max(0, current - contributed);
}

function advanceToNextPlayer(state: GameState): number {
  const players = state.players;
  if (!players.length || typeof state.round.currentPlayerIndex !== 'number') return -1;
  for (let step = 1; step <= players.length; step++) {
    const idx = ((state.round.currentPlayerIndex as number) + step) % players.length;
    const p = players[idx];
    if (!p.hasFolded && !p.isAllIn) return idx;
  }
  return -1;
}

function isBettingComplete(state: GameState): boolean {
  if (!state.round.isBettingOpen) return true;
  const cur = state.round.currentBet || 0;
  const bets = state.round.playerBets || {};
  let activeCount = 0;
  for (const p of state.players) {
    if (p.hasFolded) continue;
    if (p.isAllIn) continue;
    activeCount++;
    const contributed = bets[p.id] || 0;
    if (contributed !== cur) return false;
  }
  // If zero or one active players remain, betting is trivially complete
  return true;
}

export function playerCheck(state: GameState, playerId: string): GameState {
  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state;
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat !== state.round.currentPlayerIndex) return state;
  if ((state.round.currentBet || 0) > ((state.round.playerBets || {})[playerId] || 0)) return state; // cannot check facing a bet
  const nextIndex = advanceToNextPlayer(state);
  const nextState = { ...state, round: { ...state.round, currentPlayerIndex: nextIndex } };
  return isBettingComplete(nextState) ? { ...nextState, round: { ...nextState.round, isBettingOpen: false, currentPlayerIndex: -1 } } : nextState;
}

export function playerCall(state: GameState, playerId: string): GameState {
  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state;
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat !== state.round.currentPlayerIndex) return state;
  const toCall = amountToCall(state, playerId);
  if (toCall <= 0) return playerCheck(state, playerId);
  const callAmount = Math.min(toCall, state.players[seat].bankroll);
  let after = placeBet(state, playerId, callAmount);
  const nextIndex = advanceToNextPlayer(after);
  after = { ...after, round: { ...after.round, currentPlayerIndex: nextIndex } };
  return isBettingComplete(after) ? { ...after, round: { ...after.round, isBettingOpen: false, currentPlayerIndex: -1 } } : after;
}

export function playerRaise(state: GameState, playerId: string, raiseAmount: number): GameState {
  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state;
  if (raiseAmount <= 0) return state;
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat !== state.round.currentPlayerIndex) return state;
  const toCall = amountToCall(state, playerId);
  // Enforce min raise equal to big blind
  const minRaise = Math.max(0, state.bigBlind);
  if (raiseAmount < minRaise) return state;
  const targetBet = (state.round.currentBet || 0) + raiseAmount;
  // Total contribution needed this action = toCall + raiseAmount
  const totalNeeded = toCall + raiseAmount;
  const contribution = Math.min(totalNeeded, state.players[seat].bankroll);
  let after = placeBet(state, playerId, contribution);
  // Update current bet to the player's total contributed if it exceeds current
  const contributedNow = (after.round.playerBets || {})[playerId] || 0;
  after = { ...after, round: { ...after.round, currentBet: Math.max(after.round.currentBet || 0, contributedNow) } };
  const nextIndex = advanceToNextPlayer(after);
  return { ...after, round: { ...after.round, currentPlayerIndex: nextIndex } };
}

export function playerAllIn(state: GameState, playerId: string): GameState {
  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state;
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat !== state.round.currentPlayerIndex) return state;
  const bankroll = state.players[seat].bankroll;
  if (bankroll <= 0) return state;
  let after = placeBet(state, playerId, bankroll);
  // If this increased the player's contribution beyond current bet, update current bet
  const contributedNow = (after.round.playerBets || {})[playerId] || 0;
  after = { ...after, round: { ...after.round, currentBet: Math.max(after.round.currentBet || 0, contributedNow) } };
  const nextIndex = advanceToNextPlayer(after);
  after = { ...after, round: { ...after.round, currentPlayerIndex: nextIndex } };
  return isBettingComplete(after) ? { ...after, round: { ...after.round, isBettingOpen: false, currentPlayerIndex: -1 } } : after;
}

// Admin/host helpers
export function adminCloseBetting(state: GameState): GameState {
  if (state.phase !== 'betting') return state;
  return { ...state, round: { ...state.round, isBettingOpen: false, currentPlayerIndex: -1 } };
}

export function adminAdvanceTurn(state: GameState): GameState {
  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state;
  const nextIdx = advanceToNextPlayer(state);
  if (nextIdx === -1) {
    return { ...state, round: { ...state.round, isBettingOpen: false, currentPlayerIndex: -1 } };
  }
  return { ...state, round: { ...state.round, currentPlayerIndex: nextIdx } };
}

export function adminSetBlinds(state: GameState, smallBlind: number, bigBlind: number): GameState {
  const sb = Math.max(0, Math.floor(smallBlind));
  const bb = Math.max(sb, Math.floor(bigBlind));
  return { ...state, smallBlind: sb, bigBlind: bb };
}

export function foldPlayer(state: GameState, playerId: string): GameState {
  const updatedPlayers = state.players.map(player => (player.id === playerId ? { ...player, hasFolded: true } : player));
  // Advance turn if the folder was the one to act
  let nextIndex = state.round.currentPlayerIndex ?? -1;
  const folderIndex = getSeatIndexByPlayerId(state, playerId);
  if (folderIndex === state.round.currentPlayerIndex) {
    const tempState: GameState = { ...state, players: updatedPlayers } as GameState;
    nextIndex = advanceToNextPlayer(tempState);
  }
  const newState: GameState = { ...state, players: updatedPlayers, round: { ...state.round, currentPlayerIndex: nextIndex } };
  return isBettingComplete(newState) ? { ...newState, round: { ...newState.round, isBettingOpen: false, currentPlayerIndex: -1 } } : newState;
}

export function submitAnswer(state: GameState, playerId: string, answer: number): GameState {
  const updatedPlayers = state.players.map(player => 
    player.id === playerId ? { ...player, submittedAnswer: answer } : player
  );
  return { ...state, players: updatedPlayers };
}

export function revealAnswer(state: GameState): GameState {
  return { ...state, phase: 'showdown' };
}

export function determineWinner(state: GameState): { winnerId: string; distance: number } | null {
  if (!state.round.question) return null;
  let bestPlayer: PlayerState | null = null;
  let bestDistance = Infinity;
  
  for (const player of state.players) {
    if (player.hasFolded || player.submittedAnswer === undefined) continue;
    
    const distance = Math.abs(player.submittedAnswer - state.round.question.answer);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestPlayer = player;
    }
  }
  
  return bestPlayer ? { winnerId: bestPlayer.id, distance: bestDistance } : null;
}

export function payoutWinner(state: GameState, winnerId: string): GameState {
  const updatedPlayers = state.players.map(player => (player.id === winnerId ? { ...player, bankroll: player.bankroll + state.round.pot } : player));
  return { ...state, round: { ...state.round, pot: 0 }, players: updatedPlayers };
}

export function endRound(state: GameState): GameState {
  const winner = determineWinner(state);
  const afterPayout = winner ? payoutWinner(state, winner.winnerId) : state;
  return {
    ...afterPayout,
    phase: 'lobby',
    round: {
      roundId: nextRoundId(state.round.roundId),
      question: null,
      communityCards: [],
      pot: 0,
      dealerIndex: (state.round.dealerIndex + 1) % Math.max(1, state.players.length),
      bettingRound: 1,
      currentBet: 0,
      currentPlayerIndex: -1,
      isBettingOpen: false,
      playerBets: {},
    },
    players: afterPayout.players.map(p => ({ ...p, hand: [], hasFolded: false, isAllIn: false, submittedAnswer: undefined })),
  };
}
