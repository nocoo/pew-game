"use client";

import { useState, useEffect } from "react";

interface ScoreEntry {
  id: number;
  name: string;
  score: number;
  wave: number;
}

interface LeaderboardProps {
  /** Trigger a refresh when this value changes */
  refreshKey: number;
  /** Highlight this score ID (just inserted) */
  highlightId?: number;
}

export default function Leaderboard({ refreshKey, highlightId }: LeaderboardProps) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const res = await fetch("/api/scores");
        if (res.ok) {
          const data = (await res.json()) as ScoreEntry[];
          setScores(data);
        }
      } catch {
        // silently ignore fetch errors
      } finally {
        setLoading(false);
      }
    };
    void fetchScores();
  }, [refreshKey]);

  return (
    <div className="flex h-[640px] w-56 flex-col rounded border border-[#5b3a29] bg-[#1a1510] px-4 py-3 font-mono">
      <h2 className="mb-3 text-center text-sm font-bold tracking-widest text-[#f1c40f]">
        LEADERBOARD
      </h2>

      <div className="flex flex-1 flex-col">
        {loading ? (
          <p className="text-center text-xs text-[#666]">Loading...</p>
        ) : scores.length === 0 ? (
          <p className="text-center text-xs text-[#666]">No scores yet</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {scores.map((entry, i) => (
              <li
                key={entry.id}
                className={`flex items-center gap-2 text-xs ${
                  entry.id === highlightId
                    ? "text-[#f1c40f]"
                    : "text-[#c4956a]"
                }`}
              >
                <span className="w-5 text-right text-[#666]">
                  {i + 1}.
                </span>
                <span className="flex-1 truncate">{entry.name}</span>
                <span className="tabular-nums">{entry.score.toLocaleString()}</span>
                <span className="text-[#666]">W{entry.wave}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="border-t border-[#333] pt-2 text-center text-[8px] leading-tight text-[#555]">
        Top 10 all-time scores
      </div>
    </div>
  );
}
