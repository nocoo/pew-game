"use client";

import { useState, useEffect } from "react";

interface ScoreEntry { id: number; name: string; score: number; wave: number }
interface LeaderboardProps { refreshKey: number; highlightId?: number }

export default function Leaderboard({ refreshKey, highlightId }: LeaderboardProps) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchScores() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch("/api/scores", { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
        if (!response.ok) throw new Error("Scores unavailable");
        const data = await response.json() as ScoreEntry[];
        if (!controller.signal.aborted) setScores(data);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void fetchScores();
    return () => controller.abort();
  }, [refreshKey, retry]);

  return (
    <section className="leaderboard" id="leaderboard" aria-labelledby="leaderboard-title" aria-busy={loading}>
      <div className="board-kicker"><span>THE MOST WANTED</span><span className="little-star" aria-hidden="true">✦</span></div>
      <div className="board-heading"><h2 id="leaderboard-title">Leaderboard</h2><button className="refresh-button" aria-label="Refresh leaderboard" disabled={loading} onClick={() => setRetry((value) => value + 1)}>↻</button></div>
      <p className="board-description">A place for prairie legends.</p>
      <div className="board-columns" aria-hidden="true"><span>OUTLAW</span><span>POINTS</span></div>
      {error && <div className="board-error" role="status"><p>Couldn’t load the leaderboard.</p><button className="text-button" onClick={() => setRetry((value) => value + 1)}>Try again <span aria-hidden="true">↗</span></button></div>}
      {loading && scores.length === 0 ? (
        <div className="board-loading" role="status"><span className="little-star" aria-hidden="true">✦</span> Rounding up the scores…</div>
      ) : scores.length > 0 ? (
        <ol className="score-list" aria-label="All-time top 10 scores">
          {scores.map((entry, index) => (
            <li key={entry.id} className={entry.id === highlightId ? "score-row your-score" : "score-row"}>
              <span className="rank">{String(index + 1).padStart(2, "0")}</span>
              <span className="outlaw-name">{entry.name}<small>WAVE {String(entry.wave).padStart(2, "0")}{entry.id === highlightId ? " · YOU" : ""}</small></span>
              <strong>{entry.score.toLocaleString("en-US")}</strong>
            </li>
          ))}
        </ol>
      ) : !error && (
        <div className="board-empty">
          <span className="sheriff-star" aria-hidden="true">✦</span>
          <h3>Your name belongs here.</h3>
          <p>The prairie has no legends yet.<br />Finish a run and be the first.</p>
          <a className="text-button" href="#play">Take your shot <span aria-hidden="true">↗</span></a>
        </div>
      )}
      <div className="board-footer"><span className="little-star" aria-hidden="true">✦</span><span>ALL-TIME SCORES</span><span>TOP 10</span></div>
    </section>
  );
}
