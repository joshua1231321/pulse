import { useEffect, useRef } from "react";
import type { PulseStripProps } from "../types";

/**
 * The dashboard's signature element: a scrolling oscilloscope trace where each
 * incoming button press draws a cyan blip positioned left-to-right by its
 * digit value (0 = far left, 9 = far right). It's a literal, legible reading
 * of "PulseSync" — a live signal, not a decorative sparkline.
 */
export function PulseStrip({ recentEvents }: PulseStripProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastCountRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Baseline grid: ten faint lanes, one per digit.
    ctx.strokeStyle = "rgba(88, 183, 209, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 9; i++) {
      const x = (width / 10) * (i + 0.5);
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x, height - 4);
      ctx.stroke();
    }

    // Plot the most recent ~60 events as cyan blips, older = dimmer, newest
    // pinned to the right edge like a strip-chart recorder.
    const events = recentEvents.slice(-60);
    events.forEach((event, idx) => {
      const age = events.length - idx;
      const alpha = Math.max(0.15, 1 - age * 0.03);
      const laneX = (width / 10) * (event.buttonValue + 0.5);
      const y = height / 2 + Math.sin(idx * 1.3) * (height / 2 - 10);

      ctx.fillStyle = `rgba(88, 183, 209, ${alpha})`;
      ctx.beginPath();
      ctx.arc(laneX, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    lastCountRef.current = recentEvents.length;
  }, [recentEvents]);

  return (
    <div className="pulse-strip-wrap">
      <canvas
        ref={canvasRef}
        className="pulse-strip"
        role="img"
        aria-label="Live strip chart of incoming button-press events by digit"
      />
    </div>
  );
}
