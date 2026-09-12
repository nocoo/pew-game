import type { ScoreSubmission } from "./anticheat";

export interface ScoreRow {
  id: number;
  name: string;
  score: number;
  wave: number;
  duration: number;
  created: string;
}

// Never publish the session identifier used for persistent replay protection.
const columns = "id, name, score, wave, duration, created";
const ranking = `SELECT ${columns} FROM scores ORDER BY score DESC, created ASC, id ASC LIMIT 10`;

export async function getTopScores(db: D1Database): Promise<ScoreRow[]> {
  return (await db.prepare(ranking).all<ScoreRow>()).results;
}

export async function insertScore(db: D1Database, sub: ScoreSubmission, duration: number) {
  // D1 batches are transactional: the session is consumed only with a saved score.
  // The UNIQUE constraint also holds across concurrent requests and Worker restarts.
  // A matching retry returns the original row; the no-op update preserves its fields.
  const [inserted, scores] = await db.batch<ScoreRow>([
    db.prepare(`INSERT INTO scores (name, score, wave, duration, session_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET session_id = excluded.session_id
      WHERE scores.name = excluded.name AND scores.score = excluded.score AND scores.wave = excluded.wave
      RETURNING ${columns}`)
      .bind(sub.name, sub.score, sub.wave, duration, sub.sessionId),
    db.prepare(ranking),
  ]);
  return { inserted: inserted.results[0] ?? null, scores: scores.results };
}
