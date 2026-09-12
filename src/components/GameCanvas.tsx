"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { GameEngine } from "@/game/engine";
import type { GamePhase } from "@/game/types";
import type { SessionToken } from "@/lib/anticheat";
import NameInput from "./NameInput";

const directions = [
  { key: "w", label: "Move up", arrow: "↑" },
  { key: "a", label: "Move left", arrow: "←" },
  { key: "s", label: "Move down", arrow: "↓" },
  { key: "d", label: "Move right", arrow: "→" },
];

export default function GameCanvas({ onScoreSubmitted }: { onScoreSubmitted: (id: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const sessionRef = useRef<SessionToken | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const startingRef = useRef(false);
  const submittingRef = useRef(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(0);
  const [phase, setPhase] = useState<GamePhase>("title");
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ranked, setRanked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setPhase("gameover");
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.setCallbacks({ onScoreChange: setScore, onLivesChange: setLives, onWaveChange: setWave, onGameOver: handleGameOver });
    engine.start();
    return () => {
      requestRef.current?.abort();
      engine.stop();
      engineRef.current = null;
    };
  }, [handleGameOver]);

  const startRun = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || phase === "playing" || startingRef.current || submittingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setSaved(false);
    setError(null);
    sessionRef.current = null;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await fetch("/api/token", { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5_000)]) });
      if (!response.ok) throw new Error("Session unavailable");
      const session = await response.json() as SessionToken;
      if (!controller.signal.aborted) sessionRef.current = session;
    } catch {
      // A disconnected player can still play; the UI explicitly marks practice runs.
    } finally {
      if (!controller.signal.aborted && engineRef.current === engine) {
        setRanked(sessionRef.current !== null);
        startingRef.current = false;
        setStarting(false);
        setPhase("playing");
        engine.startRun();
        canvasRef.current?.focus({ preventScroll: true });
        sectionRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
      }
    }
  }, [phase]);

  useEffect(() => {
    function handleStart(event: KeyboardEvent) {
      if (event.repeat || ![" ", "Enter"].includes(event.key) || phase === "playing") return;
      if (phase === "gameover" && ranked && !saved) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, button, a, [contenteditable='true']")) return;
      event.preventDefault();
      void startRun();
    }
    window.addEventListener("keydown", handleStart);
    return () => window.removeEventListener("keydown", handleStart);
  }, [phase, ranked, saved, startRun]);

  const submitScore = async (name: string) => {
    const session = sessionRef.current;
    if (!session || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, score, wave, ...session }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
      });
      if (!response.ok) throw new Error("Score not saved");
      const data = await response.json() as { inserted: { id: number } };
      if (!controller.signal.aborted) {
        onScoreSubmitted(data.inserted.id);
        sessionRef.current = null;
        setSaved(true);
      }
    } catch {
      if (!controller.signal.aborted) setError("Couldn’t save your score. Please try again.");
    } finally {
      if (!controller.signal.aborted) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };

  return (
    <section ref={sectionRef} className="game-section" aria-label="Pew Game arcade">
      <div className="cabinet">
        <div className="cabinet-header"><span><i className={phase === "playing" ? "signal-dot playing" : "signal-dot"} />{phase === "playing" ? "ON THE PRAIRIE" : phase === "gameover" ? "RUN COMPLETE" : "READY WHEN YOU ARE"}</span><span>PRAIRIE / 01</span></div>
        <div className="game-hud">
          <div className="hud-score"><span>SCORE</span><strong aria-label={`Score: ${score}`}>{String(score).padStart(6, "0")}</strong></div>
          <div className="hud-wave"><span>WAVE</span><strong aria-label={`Wave: ${wave}`}>{String(wave).padStart(2, "0")}</strong></div>
          <div className="hud-lives"><span>LIVES</span><div role="img" aria-label={`${Math.max(0, lives)} lives remaining`}>{[0, 1, 2].map((index) => <svg key={index} className={index < lives ? "heart filled" : "heart"} viewBox="0 0 16 14" aria-hidden="true"><path d="M1 2h2V0h4v2h2V0h4v2h2v5h-2v2h-2v2H9v2H7v-2H5V9H3V7H1Z" /></svg>)}</div></div>
        </div>

        <div className={`game-stage game-stage-${phase}`}>
          <canvas ref={canvasRef} tabIndex={0} aria-label="Prairie game arena. Move with WASD or arrow keys. Shooting is automatic." />
          {phase === "title" && <div className="start-screen">
            <span className="start-star" aria-hidden="true">✦</span>
            <p className="eyebrow">THE PRAIRIE IS CALLING</p>
            <h2>Ready,<br /><em>partner?</em></h2>
            <p className="start-description">Hold your ground.<br />Leave a high score.</p>
            <button className="primary-button start-button" onClick={() => void startRun()} disabled={starting}>{starting ? "Saddling up…" : "Start a run"}<span aria-hidden="true">↗</span></button>
            <p className="keyboard-hint">or press <kbd>SPACE</kbd></p>
          </div>}
          {phase === "gameover" && <div className="result-overlay"><NameInput score={score} wave={wave} onSubmit={(name) => void submitScore(name)} onRestart={() => void startRun()} submitting={submitting} starting={starting} canSave={ranked} saved={saved} error={error} /></div>}
          {phase === "playing" && <span className="arena-label" aria-hidden="true">HOLD YOUR GROUND</span>}
        </div>

        <div className="cabinet-footer"><span role="status">{phase === "title" ? "ONE PLAYER · THREE LIVES" : !ranked ? "PRACTICE RUN · SCORES UNAVAILABLE" : saved ? "SCORE SAVED · NICE SHOOTING" : "AUTO-FIRE ON · KEEP MOVING"}</span><span aria-hidden="true">✦</span></div>
      </div>

      <div className="touch-controls" role="group" aria-label="Touch movement controls">
        <div className="touch-pad">{directions.map(({ key, label, arrow }) => <button
          key={key}
          className={`direction-${key}`}
          type="button"
          aria-label={label}
          disabled={phase !== "playing"}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            engineRef.current?.setTouchKey(key, true);
          }}
          onPointerUp={() => engineRef.current?.setTouchKey(key, false)}
          onLostPointerCapture={() => engineRef.current?.setTouchKey(key, false)}
          onPointerCancel={() => engineRef.current?.setTouchKey(key, false)}
          onKeyDown={(event) => {
            if ([" ", "Enter"].includes(event.key)) {
              event.preventDefault();
              engineRef.current?.setTouchKey(key, true);
            }
          }}
          onKeyUp={() => engineRef.current?.setTouchKey(key, false)}
          onBlur={() => engineRef.current?.setTouchKey(key, false)}
        >{arrow}</button>)}</div>
        <p><strong>Move. Aim. Survive.</strong><br />Hold the arrows to move.<br />We’ll handle the shooting.</p>
      </div>
    </section>
  );
}
