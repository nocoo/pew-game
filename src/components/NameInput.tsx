"use client";

import { useState, useRef, useEffect } from "react";

interface NameInputProps {
  score: number;
  wave: number;
  onSubmit: (name: string) => void;
  onRestart: () => void;
  submitting: boolean;
  starting: boolean;
  canSave: boolean;
  saved: boolean;
  error: string | null;
}

export default function NameInput({ score, wave, onSubmit, onRestart, submitting, starting, canSave, saved, error }: NameInputProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);
  const valid = /^[a-zA-Z0-9]{1,6}$/.test(name.trim());

  useEffect(() => {
    if (canSave && !saved) inputRef.current?.focus({ preventScroll: true });
    else restartRef.current?.focus({ preventScroll: true });
  }, [canSave, saved]);

  return (
    <div className="run-result" role="region" aria-labelledby="result-title">
      <p className="eyebrow">{saved ? "NAME ON THE BOARD" : "GAME OVER"}</p>
      <h2 id="result-title">{saved ? "Nicely done, partner." : "End of the trail."}</h2>
      <div className="result-score"><strong>{score.toLocaleString("en-US")}</strong><span>POINTS · WAVE {wave}</span></div>
      {saved ? <p className="result-note" role="status">Your score is saved. See you on the next run.</p> : canSave ? (
        <form onSubmit={(event) => {
          event.preventDefault();
          if (valid && !submitting) onSubmit(name.trim().toUpperCase());
        }}>
          <label htmlFor="player-name">Leave your name</label>
          <div className="score-form-row">
            <input
              ref={inputRef}
              id="player-name"
              name="player-name"
              value={name}
              onChange={(event) => setName(event.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6))}
              placeholder="ACE"
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={submitting || starting}
              aria-describedby="name-hint"
            />
            <button className="primary-button" type="submit" disabled={!valid || submitting || starting}>{submitting ? "Saving…" : "Save score"}</button>
          </div>
          <p className="input-hint" id="name-hint">1–6 letters or numbers. Make them count.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
      ) : <p className="result-note">This was a practice run. Start again to reconnect to the leaderboard.</p>}
      <button ref={restartRef} className={saved || !canSave ? "primary-button" : "text-button"} type="button" onClick={onRestart} disabled={submitting || starting}>
        {starting ? "Saddling up…" : "Play again"} <span aria-hidden="true">↗</span>
      </button>
    </div>
  );
}
