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

export function createEmptyGame(code: string, hostId: string): GameState {
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
