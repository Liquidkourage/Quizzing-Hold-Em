export type GamePhase = 'lobby' | 'question' | 'betting' | 'reveal' | 'showdown' | 'payout' | 'intermission';

export type PlayerId = string;

export interface NumericCard { digit: 0|1|2|3|4|5|6|7|8|9 }

export interface PlayerState {
  id: PlayerId;
  name: string;
  bankroll: number;
  hand: NumericCard[];
  hasFolded: boolean;
  isAllIn: boolean;
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
}

export interface GameState {
  code: string; // room code
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

export function createEmptyGame(code: string, hostId: string = ''): GameState {
  return {
    code,
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
      // Community cards will be generated during initial deal
    },
  };
}

export function dealInitialCards(state: GameState): GameState {
  // Generate community cards during initial deal - this is the ONLY time they are established
  const communityCards: NumericCard[] = [
    dealCard(),
    dealCard(),
    dealCard(),
    dealCard(),
    dealCard()
  ];
  
  const updatedPlayers = state.players.map(player => ({
    ...player,
    hand: [dealCard(), dealCard()],
  }));
  
  return { 
    ...state, 
    phase: 'betting', 
    players: updatedPlayers,
    round: {
      ...state.round,
      communityCards, // Community cards are now established for the entire round
    }
  };
}

export function dealCommunityCards(state: GameState): GameState {
  // Community cards were already generated when the question was set
  // This function just triggers the reveal/animation of the pre-existing cards
  // No changes to state needed - cards are already there
  return state;
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
    round: { ...state.round, pot: state.round.pot + amount },
    players: updatedPlayers,
  };
}

export function foldPlayer(state: GameState, playerId: string): GameState {
  const updatedPlayers = state.players.map(player => (player.id === playerId ? { ...player, hasFolded: true } : player));
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
    if (player.hasFolded) continue;
    const distance = bestHandDistanceToAnswer(player.hand, state.round.communityCards, state.round.question.answer);
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
    },
    players: afterPayout.players.map(p => ({ ...p, hand: [], hasFolded: false, isAllIn: false })),
  };
}
