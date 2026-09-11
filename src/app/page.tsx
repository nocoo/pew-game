"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState, useCallback } from "react";
import Leaderboard from "@/components/Leaderboard";
import { APP_VERSION } from "@/lib/version";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
  loading: () => <div className="game-loading" role="status">Getting the prairie ready…</div>,
});

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [highlightId, setHighlightId] = useState<number>();
  const handleScoreSubmitted = useCallback((id: number) => {
    setHighlightId(id);
    setRefreshKey((key) => key + 1);
  }, []);

  return (
    <>
      <a className="skip-link" href="#play">Skip to game</a>
      <header className="site-header shell">
        <Link className="brand" href="/" aria-label="Pew Game home">
          <Image src="/logo-128.png" width={44} height={44} alt="" priority unoptimized />
          <span>Pew Game<small>THE PRAIRIE ARCADE</small></span>
        </Link>
        <nav aria-label="Main navigation">
          <a className="nav-active" href="#play">Play</a>
          <a href="#leaderboard">Leaderboard</a>
          <a href="#how-to-play">How to play</a>
        </nav>
        <a className="hexly-link" href="https://hexly.ai">Made at hexly <span aria-hidden="true">↗</span></a>
      </header>

      <main className="shell">
        <div className="page-intro">
          <div>
            <p className="eyebrow"><span className="little-star" aria-hidden="true">✦</span> SMALL GAME. WILD WEST.</p>
            <h1>A little wild. <em>A lot of pew.</em></h1>
          </div>
          <p className="intro-note">Three lives. Endless waves. <br />Make your name on the prairie.</p>
        </div>

        <div className="arcade-layout">
          <div className="play-column" id="play">
            <GameCanvas onScoreSubmitted={handleScoreSubmitted} />
            <section className="field-guide" id="how-to-play" aria-labelledby="guide-title">
              <div className="guide-heading"><h2 id="guide-title">A quick field guide</h2><span>JUST KEEP MOVING</span></div>
              <div className="guide-items">
                <div className="guide-item">
                  <div className="key-group" aria-hidden="true"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>
                  <h3>Move &amp; aim</h3>
                  <p>WASD, arrow keys, or the touch pad.</p>
                </div>
                <div className="guide-item">
                  <span className="guide-symbol" aria-hidden="true">↗</span>
                  <h3>Let it fly</h3>
                  <p>You fire automatically in the direction you face.</p>
                </div>
                <div className="guide-item">
                  <span className="guide-symbol" aria-hidden="true">✦</span>
                  <h3>Catch a break</h3>
                  <p>Collect power-ups. Clear waves. Chase the top spot.</p>
                </div>
              </div>
            </section>
          </div>
          <aside className="ranking-column" aria-label="High scores">
            <Leaderboard refreshKey={refreshKey} highlightId={highlightId} />
            <div className="trail-note">
              <span aria-hidden="true">✳</span>
              <p>No quarters needed.<br /><strong>Just one more run.</strong></p>
            </div>
          </aside>
        </div>
      </main>

      <footer className="site-footer shell">
        <span>A tiny escape, built by <a href="https://hexly.ai">hexly</a>.</span>
        <div><span>v{APP_VERSION}</span><a href="https://github.com/nocoo/pew-game" target="_blank" rel="noreferrer">Source code <span aria-hidden="true">↗</span></a></div>
      </footer>
    </>
  );
}
