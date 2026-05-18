export type GamePhase = 'lobby' | 'question' | 'betting' | 'answering' | 'reveal' | 'showdown' | 'payout' | 'intermission';

export type PlayerId = string;

/** Last wagering choice this betting street, by roster seat index (parallel to `players[]`). Cleared when a new street opens. */
export type SeatBettingAction = 'check' | 'call' | 'raise' | 'fold' | 'allIn';

export interface NumericCard { digit: 0|1|2|3|4|5|6|7|8|9 }

export interface PlayerState {
  id: PlayerId;
  name: string;
  bankroll: number;
  hand: NumericCard[];
  hasFolded: boolean;
  isAllIn: boolean;
  submittedAnswer?: number;
  /** Cumulative trivia score across answered rounds (even when busted off chips). */
  answerPoints?: number;
  /**
   * Busted off the chip rails: no blinds, wagering, or pot share; may still compose answers each wave for `{@link answerPoints}`.
   * Set once `bankroll <= 0` after a round settles (`endRound`); cleared only when a fresh game adds the player anew.
   */
  pointsOnly?: boolean;
}

/** Chips: blinds, action, pot. Trivia submissions still allowed when false. */
export function inChipContest(p: Pick<PlayerState, 'pointsOnly'>): boolean {
  return !p.pointsOnly;
}

export interface Question {
  id: string;
  text: string;
  answer: number; // authoritative numeric answer
  category?: string;
  difficulty?: number; // 1-5
}

/** Ordered rundown for trivia night — question ids reference the venue question bank. */
export interface Setlist {
  id: string;
  name: string;
  questionIds: string[];
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
  /** Indexed by `players[]` seat; cleared at each new wagering street. */
  lastSeatBettingAction?: (SeatBettingAction | null)[];
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

/** Sentinel table id — everyone joins here for auto-seating; host runs assign to split into numbered tables. */
export const LOBBY_TABLE_ID = 'LOBBY' as const;

/**
 * Chooses how many tables to use for N players given per-table min/max.
 * - At least ceil(N/max) so no table exceeds capacity.
 * - At most floor(N/min) so each table can satisfy min roster (when possible).
 * - Prefers roughly ~6 per table (capped by max) for balance.
 */
export function computeOptimalTableCount(numPlayers: number, maxPerTable: number, minPerTable: number): number {
  if (numPlayers <= 0) return 1;
  const maxPt = Math.max(1, maxPerTable);
  const minPt = Math.max(1, minPerTable);
  const tLow = Math.max(1, Math.ceil(numPlayers / maxPt));
  const tHigh = Math.max(tLow, Math.floor(numPlayers / minPt));
  const target = Math.min(6, maxPt);
  const ideal = Math.max(tLow, Math.round(numPlayers / target));
  return Math.min(tHigh, Math.max(tLow, ideal));
}

/** Near-equal split, e.g. 11 → [6,5] for 2 tables. */
export function splitIntoTableSizes(totalPlayers: number, tableCount: number): number[] {
  const t = Math.max(1, Math.floor(tableCount));
  if (totalPlayers <= 0) return Array(t).fill(0);
  const base = Math.floor(totalPlayers / t);
  const rem = totalPlayers % t;
  const sizes: number[] = [];
  for (let i = 0; i < t; i++) {
    sizes.push(base + (i < rem ? 1 : 0));
  }
  return sizes;
}

export function compareHandsToAnswer(candidateNumbers: number[], correctAnswer: number): number {
  if (candidateNumbers.length === 0) return Infinity;
  let best = Infinity;
  for (const value of candidateNumbers) {
    const delta = Math.abs(value - correctAnswer);
    if (delta < best) best = delta;
  }
  return best;
}

/** Player UI uses exactly this many digit cards (+ optional decimal) for the submitted value. */
export const PLAYER_ANSWER_DIGIT_CARD_COUNT = 5;

const ANSWER_NUMERIC_EPS = 1e-7;

/** Loose equality for values built from decimal strings vs submitted doubles. */
export function nearlyEqualNumbers(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= ANSWER_NUMERIC_EPS * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Human-readable trivia / guess values — strips float noise from decimal composition. */
export function formatTriviaNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  const fixed = rounded.toFixed(6);
  const trimmed = fixed.replace(/\.?0+$/, '');
  return trimmed === '' ? '0' : trimmed;
}

function addDecimalVariantsForFiveDigits(digitsFive: number[], sink: Set<number>): void {
  sink.add(Number(digitsFive.join('')));
  for (let k = 1; k <= PLAYER_ANSWER_DIGIT_CARD_COUNT - 1; k++) {
    const left = digitsFive.slice(0, k).join('');
    const right = digitsFive.slice(k).join('');
    if (left !== '' && right !== '') sink.add(Number(`${left}.${right}`));
  }
}

/** All numbers you can legally form using exactly five of seven digit cards in order, optional one decimal (player rules). */
export function composeNumericAnswersFromSevenDigitCards(sevenDigits: number[]): Set<number> {
  const out = new Set<number>();
  if (sevenDigits.length !== 7) return out;
  const path: number[] = [];
  const used = [false, false, false, false, false, false, false];
  const dfs = () => {
    if (path.length === PLAYER_ANSWER_DIGIT_CARD_COUNT) {
      const five = path.map((i) => sevenDigits[i]!);
      addDecimalVariantsForFiveDigits(five, out);
      return;
    }
    for (let i = 0; i < 7; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(i);
      dfs();
      path.pop();
      used[i] = false;
    }
  };
  dfs();
  return out;
}

export function isSubmittedAnswerComposableFromDeal(state: GameState, playerId: string, answer: number): boolean {
  if (!Number.isFinite(answer)) return false;
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.hand.length !== 2 || state.round.communityCards.length !== 5) return false;
  const seven = [...player.hand, ...state.round.communityCards].map((c) => c.digit);
  for (const v of composeNumericAnswersFromSevenDigitCards(seven)) {
    if (nearlyEqualNumbers(v, answer)) return true;
  }
  return false;
}

/** Best legal guess for bots: minimum distance to `target`, tie-break lower numeric value. */
export function nearestLegalAnswerToTarget(sevenDigits: number[], target: number): number {
  if (sevenDigits.length !== 7 || !Number.isFinite(target)) return 0;
  const values = composeNumericAnswersFromSevenDigitCards(sevenDigits);
  let best: number | null = null;
  let bestD = Infinity;
  for (const v of values) {
    const d = Math.abs(v - target);
    if (d < bestD - 1e-15) {
      bestD = d;
      best = v;
    } else if (best !== null && Math.abs(d - bestD) <= 1e-15 && v < best) {
      best = v;
    }
  }
  return best ?? 0;
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
  if (hand.length !== 2 || community.length !== 5) return Infinity;
  const seven = hand.concat(community).map((c) => c.digit);
  const candidates = [...composeNumericAnswersFromSevenDigitCards(seven)];
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
    /** Large enough for test sessions (many CPU seats); lobby split still shards by venue rules. */
    maxPlayers: 32,
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
    players: state.players.concat({
      id,
      name,
      bankroll: startingBankroll,
      hand: [],
      hasFolded: false,
      isAllIn: false,
      answerPoints: 0,
      pointsOnly: false,
    }),
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

/** Sets the active round question (synced to tables by the server). */
export function setQuestion(state: GameState, question: Question): GameState {
  return {
    ...state,
    phase: 'question',
    round: {
      ...state.round,
      question,
      communityCards: [],
    },
  };
}

export function pickRandomQuestion(bank: Question[]): Question | undefined {
  if (bank.length === 0) return undefined
  const i = Math.floor(Math.random() * bank.length)
  return bank[i]
}

/** Hole cards only + blinds; first wagering round (no community yet). */
export function dealInitialCards(state: GameState): GameState {
  const updatedPlayers = state.players.map((player) => ({
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
    if (player.pointsOnly) return;
    const contribution = Math.min(player.bankroll, amount);
    playersAfterBlinds = playersAfterBlinds.map((p, i) =>
      i === idx ? { ...p, bankroll: p.bankroll - contribution, isAllIn: p.bankroll - contribution === 0 } : p,
    );
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
      if (inChipContest(p) && !p.hasFolded && !p.isAllIn) return idx;
    }
    return -1;
  };

  const currentPlayerIndex = findNextToAct(startIndex);
  const isBettingOpen = currentPlayerIndex >= 0;

  return {
    ...state,
    phase: 'betting',
    players: playersAfterBlinds,
    round: {
      ...state.round,
      communityCards: [],
      bettingRound: 1,
      currentBet: Math.max(state.bigBlind, 0),
      currentPlayerIndex: isBettingOpen ? currentPlayerIndex : -1,
      isBettingOpen,
      playerBets,
      pot,
      lastSeatBettingAction: Array.from({ length: playersAfterBlinds.length }, () => null),
    },
  };
}

/**
 * Seat indices for dealer + blinds mapped to contiguous `players[0 .. n-1]`, identical to `{@link dealInitialCards}` modulo math.
 * Use on venue-wall displays with `seatNames[]` indexed the same way; null when absent (no players / one player has no blinds).
 */
export function displayBlindSeatIndices(
  seatedPlayerCount: number,
  dealerIndex: number
): {
  dealerSeatIndex: number | null;
  smallBlindSeatIndex: number | null;
  bigBlindSeatIndex: number | null;
} {
  const n = Math.max(0, Math.floor(seatedPlayerCount));
  if (n <= 0) return { dealerSeatIndex: null, smallBlindSeatIndex: null, bigBlindSeatIndex: null };
  const d = ((Math.floor(dealerIndex) % n) + n) % n;
  if (n === 1) return { dealerSeatIndex: d, smallBlindSeatIndex: null, bigBlindSeatIndex: null };
  return {
    dealerSeatIndex: d,
    smallBlindSeatIndex: (d + 1) % n,
    bigBlindSeatIndex: (d + 2) % n,
  };
}

/** Seat whose action it is during open wagering (`players[]` / venue `seatNames` index). Null otherwise. */
export function displayActingSeatIndex(
  phase: GamePhase | string,
  seatedPlayerCount: number,
  round: Partial<Pick<RoundState, 'currentPlayerIndex' | 'isBettingOpen'>>
): number | null {
  const ph = String(phase ?? '').trim().toLowerCase();
  if (ph !== 'betting') return null;
  // Only an explicit `false` means “no one may act”. Missing / undefined must not hide a valid `currentPlayerIndex`
  // (older snapshots, partial merges, or JSON without the flag).
  if (round.isBettingOpen === false) return null;

  const raw = round.currentPlayerIndex as unknown;
  let idx: number | undefined;
  if (typeof raw === 'number' && Number.isFinite(raw)) idx = raw;
  else if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) idx = n;
  }

  const n = Math.max(0, Math.floor(seatedPlayerCount));
  if (idx === undefined) return null;
  const i = Math.floor(idx);
  if (i < 0 || i >= n) return null;
  return i;
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
      if (inChipContest(p) && !p.hasFolded && !p.isAllIn) return idx;
    }
    return -1;
  };

  const currentPlayerIndex = findNextToAct();
  const isBettingOpen = currentPlayerIndex >= 0;

  return {
    ...state,
    phase: 'betting',
    round: {
      ...state.round,
      communityCards,
      bettingRound: 2,
      currentBet: 0,
      currentPlayerIndex: isBettingOpen ? currentPlayerIndex : -1,
      isBettingOpen,
      playerBets: {},
      lastSeatBettingAction: Array.from({ length: state.players.length }, () => null),
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

/** Chips the player must add to call the current bet (capped by their remaining stack). */
export function chipsRequiredToCall(state: GameState, playerId: string): number {
  const to = amountToCall(state, playerId);
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat < 0) return 0;
  return Math.min(to, state.players[seat].bankroll);
}

/** Share of current stack (0–100) required to call; `null` when stack is zero. */
export function pctOfStackToCall(state: GameState, playerId: string): number | null {
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat < 0) return null;
  if (state.players[seat]?.pointsOnly) return null;
  const br = state.players[seat].bankroll;
  if (br <= 0) return null;
  return (chipsRequiredToCall(state, playerId) / br) * 100;
}

function mergeLastSeatBettingAction(
  round: RoundState,
  playerCount: number,
  seat: number,
  action: SeatBettingAction
): (SeatBettingAction | null)[] {
  const prev = round.lastSeatBettingAction;
  return Array.from({ length: playerCount }, (_, i) => {
    if (i === seat) return action;
    if (prev && i < prev.length) return prev[i] ?? null;
    return null;
  });
}

function advanceToNextPlayer(state: GameState): number {
  const players = state.players;
  if (!players.length || typeof state.round.currentPlayerIndex !== 'number') return -1;
  for (let step = 1; step <= players.length; step++) {
    const idx = ((state.round.currentPlayerIndex as number) + step) % players.length;
    const p = players[idx];
    if (inChipContest(p) && !p.hasFolded && !p.isAllIn) return idx;
  }
  return -1;
}

function isBettingComplete(state: GameState): boolean {
  if (!state.round.isBettingOpen) return true;
  const cur = state.round.currentBet || 0;
  const bets = state.round.playerBets || {};
  const lastActions = state.round.lastSeatBettingAction ?? [];
  let activeCount = 0;
  let actedCount = 0;
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i]!;
    if (p.hasFolded) continue;
    if (p.isAllIn) continue;
    if (!inChipContest(p)) continue;
    activeCount++;
    const contributed = bets[p.id] || 0;
    if (contributed !== cur) return false;
    if (lastActions[i] != null) actedCount++;
  }
  if (activeCount === 0) return true;
  // Lone actor on an unopened street still needs to check/raise (common post-board).
  if (activeCount === 1 && cur === 0) {
    for (let i = 0; i < state.players.length; i++) {
      const p = state.players[i]!;
      if (p.hasFolded || p.isAllIn || !inChipContest(p)) continue;
      return lastActions[i] != null;
    }
    return true;
  }
  if (activeCount === 1) return true;
  // Matched bets with a live wager on the street — no further calls needed.
  if (cur > 0) return true;
  // currentBet === 0: require a full check-around, not merely “everyone at $0”
  // (fresh post-board streets reset playerBets and would otherwise auto-close).
  return actedCount >= activeCount;
}

/**
 * When the action seat is folded, all-in, or off the roster, advance or close wagering so
 * CPU drains and venue lockstep do not stall with an open clock on a dead seat.
 */
export function normalizeBettingTurn(state: GameState): GameState {
  if (state.phase !== 'betting' || state.round.isBettingOpen !== true) return state;

  if (isBettingComplete(state)) {
    return {
      ...state,
      round: { ...state.round, isBettingOpen: false, currentPlayerIndex: -1 },
    };
  }

  const rawIdx = state.round.currentPlayerIndex;
  const idx = typeof rawIdx === 'number' && Number.isFinite(rawIdx) ? Math.floor(rawIdx) : -1;
  if (idx >= 0 && idx < state.players.length) {
    const p = state.players[idx]!;
    if (inChipContest(p) && !p.hasFolded && !p.isAllIn) return state;
  }

  const probeIdx = idx >= 0 ? idx : 0;
  const next = advanceToNextPlayer({
    ...state,
    round: { ...state.round, currentPlayerIndex: probeIdx },
  });
  if (next < 0) {
    return {
      ...state,
      round: { ...state.round, isBettingOpen: false, currentPlayerIndex: -1 },
    };
  }
  return { ...state, round: { ...state.round, currentPlayerIndex: next } };
}

export function playerCheck(state: GameState, playerId: string): GameState {
  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state;
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat < 0 || state.players[seat]?.pointsOnly) return state;
  if (seat !== state.round.currentPlayerIndex) return state;
  if ((state.round.currentBet || 0) > ((state.round.playerBets || {})[playerId] || 0)) return state; // cannot check facing a bet
  const nextIndex = advanceToNextPlayer(state);
  const nextState = {
    ...state,
    round: {
      ...state.round,
      currentPlayerIndex: nextIndex,
      lastSeatBettingAction: mergeLastSeatBettingAction(state.round, state.players.length, seat, 'check'),
    },
  };
  return isBettingComplete(nextState) ? { ...nextState, round: { ...nextState.round, isBettingOpen: false, currentPlayerIndex: -1 } } : nextState;
}

export function playerCall(state: GameState, playerId: string): GameState {
  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state;
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat < 0 || state.players[seat]?.pointsOnly) return state;
  if (seat !== state.round.currentPlayerIndex) return state;
  const toCall = amountToCall(state, playerId);
  if (toCall <= 0) return playerCheck(state, playerId);
  const callAmount = Math.min(toCall, state.players[seat].bankroll);
  let after = placeBet(state, playerId, callAmount);
  const nextIndex = advanceToNextPlayer(after);
  after = {
    ...after,
    round: {
      ...after.round,
      currentPlayerIndex: nextIndex,
      lastSeatBettingAction: mergeLastSeatBettingAction(after.round, after.players.length, seat, 'call'),
    },
  };
  return isBettingComplete(after) ? { ...after, round: { ...after.round, isBettingOpen: false, currentPlayerIndex: -1 } } : after;
}

export function playerRaise(state: GameState, playerId: string, raiseAmount: number): GameState {
  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state;
  if (raiseAmount <= 0) return state;
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat < 0 || state.players[seat]?.pointsOnly) return state;
  if (seat !== state.round.currentPlayerIndex) return state;
  const toCall = amountToCall(state, playerId);
  // Enforce min raise equal to big blind
  const minRaise = Math.max(0, state.bigBlind);
  if (raiseAmount < minRaise) return state;
  // Total contribution needed this action = toCall + raiseAmount
  const totalNeeded = toCall + raiseAmount;
  const contribution = Math.min(totalNeeded, state.players[seat].bankroll);
  let after = placeBet(state, playerId, contribution);
  // Update current bet to the player's total contributed if it exceeds current
  const contributedNow = (after.round.playerBets || {})[playerId] || 0;
  after = { ...after, round: { ...after.round, currentBet: Math.max(after.round.currentBet || 0, contributedNow) } };
  const nextIndex = advanceToNextPlayer(after);
  after = {
    ...after,
    round: {
      ...after.round,
      currentPlayerIndex: nextIndex,
      lastSeatBettingAction: mergeLastSeatBettingAction(after.round, after.players.length, seat, 'raise'),
    },
  };
  return isBettingComplete(after)
    ? { ...after, round: { ...after.round, isBettingOpen: false, currentPlayerIndex: -1 } }
    : after;
}

export function playerAllIn(state: GameState, playerId: string): GameState {
  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state;
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat < 0 || state.players[seat]?.pointsOnly) return state;
  if (seat !== state.round.currentPlayerIndex) return state;
  const bankroll = state.players[seat].bankroll;
  if (bankroll <= 0) return state;
  let after = placeBet(state, playerId, bankroll);
  // If this increased the player's contribution beyond current bet, update current bet
  const contributedNow = (after.round.playerBets || {})[playerId] || 0;
  after = { ...after, round: { ...after.round, currentBet: Math.max(after.round.currentBet || 0, contributedNow) } };
  const nextIndex = advanceToNextPlayer(after);
  after = {
    ...after,
    round: {
      ...after.round,
      currentPlayerIndex: nextIndex,
      lastSeatBettingAction: mergeLastSeatBettingAction(after.round, after.players.length, seat, 'allIn'),
    },
  };
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
  const seat = getSeatIndexByPlayerId(state, playerId);
  if (seat >= 0 && state.players[seat]?.pointsOnly) return state;
  const updatedPlayers = state.players.map((player) =>
    player.id === playerId ? { ...player, hasFolded: true, hand: [] } : player,
  );
  // Advance turn if the folder was the one to act
  let nextIndex = state.round.currentPlayerIndex ?? -1;
  const folderIndex = getSeatIndexByPlayerId(state, playerId);
  if (folderIndex === state.round.currentPlayerIndex) {
    const tempState: GameState = { ...state, players: updatedPlayers } as GameState;
    nextIndex = advanceToNextPlayer(tempState);
  }
  const newState: GameState = {
    ...state,
    players: updatedPlayers,
    round: {
      ...state.round,
      currentPlayerIndex: nextIndex,
      lastSeatBettingAction:
        folderIndex >= 0
          ? mergeLastSeatBettingAction(state.round, updatedPlayers.length, folderIndex, 'fold')
          : state.round.lastSeatBettingAction,
    },
  };
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

/** Trivia leaderboard: ties share the same `distance`; all IDs are joint winners for payout split. */
export function determineTriviaWinners(state: GameState): { winnerIds: string[]; distance: number } | null {
  const q = state.round.question;
  if (!q) return null;
  let bestDistance = Infinity;
  for (const player of state.players) {
    if (player.hasFolded || player.submittedAnswer === undefined) continue;
    const distance = Math.abs(player.submittedAnswer - q.answer);
    if (distance < bestDistance) bestDistance = distance;
  }
  if (bestDistance === Infinity) return null;
  const winnerIds = state.players
    .filter(
      (p) =>
        !p.hasFolded &&
        p.submittedAnswer !== undefined &&
        Math.abs(p.submittedAnswer - q.answer) === bestDistance
    )
    .map((p) => p.id);
  return winnerIds.length === 0 ? null : { winnerIds, distance: bestDistance };
}

/** Winners eligible to receive `{@link payoutPotSplitAmong}` this wave (closest answer among chip contestants only). */
export function determineChipPotTriviaWinners(state: GameState): { winnerIds: string[]; distance: number } | null {
  const q = state.round.question;
  if (!q) return null;
  let bestDistance = Infinity;
  for (const player of state.players) {
    if (!inChipContest(player) || player.hasFolded || player.submittedAnswer === undefined) continue;
    const distance = Math.abs(player.submittedAnswer - q.answer);
    if (distance < bestDistance) bestDistance = distance;
  }
  if (bestDistance === Infinity) return null;
  const winnerIds = state.players
    .filter(
      (p) =>
        inChipContest(p) &&
        !p.hasFolded &&
        p.submittedAnswer !== undefined &&
        Math.abs(p.submittedAnswer - q.answer) === bestDistance,
    )
    .map((p) => p.id);
  return winnerIds.length === 0 ? null : { winnerIds, distance: bestDistance };
}

/** @deprecated Prefer determineTriviaWinners — this returns only the first tied seat in roster order. */
export function determineWinner(state: GameState): { winnerId: string; distance: number } | null {
  const tw = determineChipPotTriviaWinners(state);
  if (!tw || tw.winnerIds.length === 0) return null;
  return { winnerId: tw.winnerIds[0]!, distance: tw.distance };
}

/** Split whole pot evenly in whole dollars; remainder $1 chips go to earliest ids in `winnerIds`. */
export function payoutPotSplitAmong(state: GameState, winnerIds: string[]): GameState {
  const pot = state.round.pot;
  const ids = [...new Set(winnerIds)].filter((id) => {
    const p = state.players.find((x) => x.id === id);
    return p != null && inChipContest(p);
  });
  if (pot <= 0 || ids.length === 0) {
    return { ...state, round: { ...state.round, pot: 0 } };
  }
  const n = ids.length;
  const baseShare = Math.floor(pot / n);
  let remainder = pot - baseShare * n;
  const extraById = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const id = ids[i]!;
    const add = baseShare + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    extraById.set(id, (extraById.get(id) || 0) + add);
  }
  const players = state.players.map((p) => {
    const add = extraById.get(p.id);
    return add ? { ...p, bankroll: p.bankroll + add } : p;
  });
  return { ...state, round: { ...state.round, pot: 0 }, players };
}

export function payoutWinner(state: GameState, winnerId: string): GameState {
  return payoutPotSplitAmong(state, [winnerId]);
}

function playerIdsStillInChipContest(state: GameState): string[] {
  return state.players.filter((p) => inChipContest(p) && !p.hasFolded).map((p) => p.id);
}

function answerRoundPointsGained(snapshotPlayer: Pick<PlayerState, 'submittedAnswer' | 'hasFolded'>, correct: number): number {
  if (snapshotPlayer.hasFolded || snapshotPlayer.submittedAnswer === undefined) return 0;
  const distance = Math.abs(snapshotPlayer.submittedAnswer - correct);
  return Math.max(0, 100 - Math.min(distance, 100));
}

/** Run only from showdown (after reveal): pays pot, resets to lobby. Wrong phase → unchanged. */
export function endRound(state: GameState): GameState {
  if (state.phase !== 'showdown') return state;

  const pendingPot = state.round.pot;
  let afterPayout = state;
  const snapById = new Map(state.players.map((p) => [p.id, p]));

  const triviaChip = determineChipPotTriviaWinners(state);
  if (triviaChip && triviaChip.winnerIds.length > 0 && pendingPot > 0) {
    afterPayout = payoutPotSplitAmong(state, triviaChip.winnerIds);
  } else if (pendingPot > 0) {
    const alive = playerIdsStillInChipContest(state);
    if (alive.length === 1) {
      afterPayout = payoutPotSplitAmong(state, alive);
    } else if (alive.length >= 2) {
      afterPayout = payoutPotSplitAmong(state, alive);
    } else {
      const seated = state.players.filter((p) => inChipContest(p)).map((p) => p.id);
      afterPayout = seated.length > 0 ? payoutPotSplitAmong(state, seated) : { ...state, round: { ...state.round, pot: 0 } };
    }
  } else {
    afterPayout = { ...state, round: { ...state.round, pot: 0 } };
  }

  const q = state.round.question;
  const clearedPlayers: PlayerState[] = afterPayout.players.map((p) => {
    const snap = snapById.get(p.id);
    const gained = q != null && snap != null ? answerRoundPointsGained(snap, q.answer) : 0;
    const answerPoints = (p.answerPoints ?? 0) + gained;
    const pointsOnly = p.pointsOnly === true || p.bankroll <= 0;
    return {
      ...p,
      answerPoints,
      pointsOnly,
      hand: [],
      hasFolded: false,
      isAllIn: false,
      submittedAnswer: undefined,
    };
  });

  return {
    ...afterPayout,
    phase: 'lobby',
    round: {
      roundId: nextRoundId(afterPayout.round.roundId),
      question: null,
      communityCards: [],
      pot: 0,
      dealerIndex: (afterPayout.round.dealerIndex + 1) % Math.max(1, afterPayout.players.length),
      bettingRound: 1,
      currentBet: 0,
      currentPlayerIndex: -1,
      isBettingOpen: false,
      playerBets: {},
    },
    players: clearedPlayers,
  };
}

export {
  DISPLAY_PREVIEW_BANKROLLS,
  DISPLAY_PREVIEW_DEMO_QUESTION_ANSWER,
  DISPLAY_PREVIEW_DEMO_QUESTION_TEXT,
  DISPLAY_PREVIEW_NAMES,
  DISPLAY_PREVIEW_SYNCED_PHASE,
  DISPLAY_PREVIEW_SYNCED_SUBTITLE,
  DISPLAY_PREVIEW_TABLES,
  buildDisplayPreviewGameState,
  normalizeDisplayPreviewTableNum,
  rehearsalSeatDisplayName,
} from './displayPreviewFixture'
