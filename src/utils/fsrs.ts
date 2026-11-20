import { FSRSCardState, FSRSRating } from "../types/hyperbook";

// FSRS-4.5 / FSRS-5 default parameter weights
const W = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
  0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034,
  0.6567,
];

const REQUEST_RETENTION = 0.9;
const FACTOR = 19 / 81;
const DECAY = -0.5;
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export function createInitialFSRSState(vocabId: string, now = Date.now()): FSRSCardState {
  return {
    vocabId,
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    state: "new",
    due: now,
    lastReview: null,
  };
}

function clampDifficulty(d: number): number {
  return Math.min(10, Math.max(1, d));
}

function initDifficulty(rating: FSRSRating): number {
  return clampDifficulty(W[4] - Math.exp(W[5] * (rating - 1)) + 1);
}

function initStability(rating: FSRSRating): number {
  return Math.max(0.1, W[rating - 1]);
}

function nextIntervalDays(stability: number): number {
  const raw = (stability / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return Math.max(1, Math.round(raw));
}

export function computeRetrievability(card: FSRSCardState, now = Date.now()): number {
  if (card.state === "new" || !card.lastReview || card.stability <= 0) {
    return 0;
  }
  const elapsedDays = Math.max(0, (now - card.lastReview) / DAY_MS);
  return Math.pow(1 + FACTOR * (elapsedDays / card.stability), DECAY);
}

export interface SchedulePreview {
  nextState: FSRSCardState;
  intervalLabel: string;
}

export function formatDurationMs(ms: number): string {
  const minutes = Math.round(ms / MINUTE_MS);
  if (minutes < 60) {
    return `${Math.max(1, minutes)}m`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.round(ms / DAY_MS);
  if (days < 30) {
    return `${days}d`;
  }
  const months = (days / 30).toFixed(1).replace(/\.0$/, "");
  return `${months}mo`;
}

export function scheduleFSRS(
  card: FSRSCardState,
  rating: FSRSRating,
  now = Date.now()
): SchedulePreview {
  if (card.state === "new") {
    const d = initDifficulty(rating);
    const s = initStability(rating);

    let delayMs: number;
    let nextStatus: FSRSCardState["state"];

    if (rating === 1) {
      delayMs = 1 * MINUTE_MS;
      nextStatus = "learning";
    } else if (rating === 2) {
      delayMs = 10 * MINUTE_MS;
      nextStatus = "learning";
    } else if (rating === 3) {
      delayMs = Math.max(1, Math.round(s)) * DAY_MS;
      nextStatus = "review";
    } else {
      delayMs = Math.max(4, nextIntervalDays(s)) * DAY_MS;
      nextStatus = "review";
    }

    return {
      nextState: {
        ...card,
        stability: Number(s.toFixed(2)),
        difficulty: Number(d.toFixed(2)),
        reps: card.reps + 1,
        lapses: rating === 1 ? card.lapses + 1 : card.lapses,
        state: nextStatus,
        lastReview: now,
        due: now + delayMs,
      },
      intervalLabel: formatDurationMs(delayMs),
    };
  }

  const elapsedDays = card.lastReview ? Math.max(0.01, (now - card.lastReview) / DAY_MS) : 1;
  const r = Math.pow(1 + FACTOR * (elapsedDays / Math.max(0.1, card.stability)), DECAY);

  // Mean-reverting difficulty update
  const deltaD = -W[6] * (rating - 3);
  const d0Easy = initDifficulty(4);
  const nextD = clampDifficulty(W[7] * d0Easy + (1 - W[7]) * (card.difficulty + deltaD));

  let nextS: number;
  let delayMs: number;
  let nextStatus: FSRSCardState["state"];
  let lapses = card.lapses;

  if (rating === 1) {
    // Lapse / Forget
    lapses += 1;
    nextS = Math.max(
      0.1,
      W[11] *
        Math.pow(nextD, -W[12]) *
        (Math.pow(card.stability + 1, W[13]) - 1) *
        Math.exp(W[14] * (1 - r))
    );
    delayMs = 5 * MINUTE_MS;
    nextStatus = "relearning";
  } else {
    const hardPenalty = rating === 2 ? W[15] : 1;
    const easyBonus = rating === 4 ? W[16] : 1;
    nextS =
      card.stability *
      (1 +
        Math.exp(W[8]) *
          (11 - nextD) *
          Math.pow(card.stability, -W[9]) *
          (Math.exp(W[10] * (1 - r)) - 1) *
          hardPenalty *
          easyBonus);

    const days = nextIntervalDays(nextS);
    if (rating === 2 && card.state === "learning") {
      delayMs = 15 * MINUTE_MS;
      nextStatus = "learning";
    } else {
      const adjustedDays =
        rating === 2 ? Math.max(1, Math.round(days * 0.8)) : rating === 4 ? Math.max(days + 1, Math.round(days * 1.25)) : days;
      delayMs = adjustedDays * DAY_MS;
      nextStatus = "review";
    }
  }

  return {
    nextState: {
      ...card,
      stability: Number(nextS.toFixed(2)),
      difficulty: Number(nextD.toFixed(2)),
      reps: card.reps + 1,
      lapses,
      state: nextStatus,
      lastReview: now,
      due: now + delayMs,
    },
    intervalLabel: formatDurationMs(delayMs),
  };
}
