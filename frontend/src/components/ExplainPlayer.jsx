/**
 * ExplainPlayer
 * ─────────────
 * Renders a WaveSurfer.js waveform with:
 *   1. A transparent canvas heatmap overlay (per-frame attention weights)
 *   2. A per-segment risk indicator strip below the waveform — proportional
 *      coloured blocks, colour-coded by risk level, seekable on click.
 *
 * Props:
 *   audioFile         {File}    – the raw File object to play
 *   attentionTimeline {Array}   – [{ time_sec, attention_weight }, …]
 *   segments          {Array}   – [{ start_sec, end_sec, attention_weight, … }, …]
 *   totalDuration     {number}  – total audio duration in seconds
 *   peakTimeSec       {number}  – timestamp of highest attention
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

// ── Colour map: low attention (blue) → high (red) using HSL ──────────
function weightToColor(w, alpha = 0.55) {
    // w ∈ [0, 1]: 0 → hue 240 (blue), 1 → hue 0 (red)
    const hue = Math.round((1 - w) * 240);
    return `hsla(${hue}, 90%, 55%, ${alpha})`;
}

// ── Draw heatmap onto an overlay canvas ──────────────────────────────
function drawHeatmap(canvas, timeline, duration) {
    if (!canvas || !timeline?.length || !duration) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const barW = Math.max(1, width / timeline.length);

    timeline.forEach(({ time_sec, attention_weight }, i) => {
        const x = (time_sec / duration) * width;
        const alpha = 0.3 + attention_weight * 0.55; // 0.3–0.85
        ctx.fillStyle = weightToColor(attention_weight, alpha);
        ctx.fillRect(x, 0, barW + 0.5, height);
    });

    // Peak marker — bright white dashed line
    const peakFrame = timeline.reduce((best, cur) =>
        cur.attention_weight > best.attention_weight ? cur : best, timeline[0]);
    if (peakFrame) {
        const px = (peakFrame.time_sec / duration) * width;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();
    }
}

// ── Per-segment risk tier ──────────────────────────────────────────────
function riskTier(w) {
    if (w >= 0.75) return { label: 'High', bg: 'bg-red-500', border: 'border-red-400', text: 'text-red-200' };
    if (w >= 0.45) return { label: 'Medium', bg: 'bg-yellow-500', border: 'border-yellow-400', text: 'text-yellow-200' };
    return { label: 'Low', bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-200' };
}

// ── Per-segment risk strip ──────────────────────────────────────────────
function SegmentTimeline({ segments, totalDuration, currentTime, onSeek }) {
    if (!segments?.length || !totalDuration) return null;

    const playheadPct = (currentTime / totalDuration) * 100;

    return (
        <div className="px-4 pb-1">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 font-semibold">Risk Timeline</p>
            {/* Strip */}
            <div
                className="relative flex rounded-lg overflow-hidden h-7 w-full border border-white/5"
                role="group"
                aria-label="Per-segment risk indicator timeline"
            >
                {segments.map((seg, i) => {
                    const widthPct = ((seg.end_sec - seg.start_sec) / totalDuration) * 100;
                    const w = seg.attention_weight ?? 0;
                    const tier = riskTier(w);
                    const isActive = currentTime >= seg.start_sec && currentTime < seg.end_sec;

                    return (
                        <button
                            key={i}
                            id={`risk-seg-${i}`}
                            onClick={() => onSeek(seg.start_sec)}
                            title={`Seg ${i + 1}: ${seg.start_sec.toFixed(1)}s – ${seg.end_sec.toFixed(1)}s | Risk: ${tier.label} (${(w * 100).toFixed(0)}%)`}
                            aria-label={`${tier.label} risk segment from ${seg.start_sec.toFixed(1)}s to ${seg.end_sec.toFixed(1)}s`}
                            className={[
                                'relative flex items-center justify-center transition-all duration-150 cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/40',
                                tier.bg,
                                isActive ? 'brightness-125 ring-1 ring-inset ring-white/50' : 'opacity-70 hover:opacity-100',
                            ].join(' ')}
                            style={{ width: `${widthPct}%`, minWidth: 2 }}
                        >
                            {/* Label only if segment is wide enough */}
                            {widthPct > 8 && (
                                <span className={`text-[9px] font-bold select-none ${tier.text} drop-shadow`}>
                                    {tier.label[0]}
                                </span>
                            )}
                        </button>
                    );
                })}

                {/* Playhead cursor line */}
                <div
                    className="absolute top-0 h-full w-0.5 bg-white/80 shadow-[0_0_4px_white] pointer-events-none transition-all duration-100"
                    style={{ left: `${playheadPct}%` }}
                />
            </div>

            {/* Tick labels - start / mid / end */}
            <div className="flex justify-between text-[9px] text-gray-600 mt-1 px-0.5">
                <span>0:00</span>
                <span className="flex gap-1">
                    <span className="w-2 h-2 rounded-sm inline-block bg-blue-500 opacity-70" />
                    Low
                    <span className="w-2 h-2 rounded-sm inline-block bg-yellow-500 opacity-70 ml-1" />
                    Med
                    <span className="w-2 h-2 rounded-sm inline-block bg-red-500 opacity-70 ml-1" />
                    High
                </span>
                <span>{Math.floor(totalDuration / 60)}:{Math.floor(totalDuration % 60).toString().padStart(2, '0')}</span>
            </div>
        </div>
    );
}

export default function ExplainPlayer({ audioFile, attentionTimeline, segments, totalDuration, peakTimeSec }) {
    const waveRef = useRef(null); // div that WaveSurfer mounts into
    const heatRef = useRef(null); // overlay <canvas>
    const wsRef = useRef(null); // WaveSurfer instance
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [ready, setReady] = useState(false);
    const [zoom, setZoom] = useState(50);

    // ── Init WaveSurfer ────────────────────────────────────────────────
    useEffect(() => {
        if (!waveRef.current || !audioFile) return;

        const ws = WaveSurfer.create({
            container: waveRef.current,
            waveColor: 'rgba(139, 92, 246, 0.6)',   // purple-500
            progressColor: 'rgba(167, 139, 250, 1)',    // purple-400
            cursorColor: '#f0abfc',                   // fuchsia-300
            cursorWidth: 2,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            height: 80,
            normalize: true,
            backend: 'WebAudio',
            interact: true,
        });

        ws.on('ready', () => setReady(true));
        ws.on('audioprocess', t => setCurrentTime(t));
        ws.on('seek', () => setCurrentTime(ws.getCurrentTime()));
        ws.on('play', () => setPlaying(true));
        ws.on('pause', () => setPlaying(false));
        ws.on('finish', () => setPlaying(false));

        ws.loadBlob(audioFile);
        wsRef.current = ws;

        return () => { ws.destroy(); wsRef.current = null; };
    }, [audioFile]);

    // ── Zoom ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (wsRef.current && ready) wsRef.current.zoom(zoom);
    }, [zoom, ready]);

    // ── Draw heatmap once data + canvas are ready ─────────────────────
    useEffect(() => {
        if (ready && heatRef.current && attentionTimeline?.length) {
            // Match canvas resolution to DOM size
            const el = heatRef.current;
            el.width = el.offsetWidth * window.devicePixelRatio;
            el.height = el.offsetHeight * window.devicePixelRatio;
            const ctx = el.getContext('2d');
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            drawHeatmap(el, attentionTimeline, totalDuration);
        }
    }, [ready, attentionTimeline, totalDuration]);

    // ── Playback controls ─────────────────────────────────────────────
    const togglePlay = useCallback(() => wsRef.current?.playPause(), []);
    const seekTo = useCallback(sec => {
        if (!wsRef.current || !totalDuration) return;
        wsRef.current.seekTo(sec / totalDuration);
    }, [totalDuration]);

    const fmt = s => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    const progress = totalDuration ? (currentTime / totalDuration) * 100 : 0;

    // ── Most suspicious segment (highest attention_weight) ─────────────
    const mostSuspicious = segments?.length
        ? segments.reduce((best, cur) =>
            (cur.attention_weight ?? 0) > (best.attention_weight ?? 0) ? cur : best
        )
        : null;

    // Is the playhead currently inside the most suspicious segment?
    const playheadInHot = mostSuspicious &&
        currentTime >= mostSuspicious.start_sec &&
        currentTime < mostSuspicious.end_sec;

    return (
        <div className="rounded-2xl overflow-hidden border border-purple-500/20 bg-gray-900/60 backdrop-blur-sm shadow-xl shadow-purple-900/20">

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-xs font-semibold text-purple-300 uppercase tracking-widest">
                        Attention Heatmap Player
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="w-3 h-3 rounded-sm" style={{ background: weightToColor(0.15, 0.8) }} />
                    <span>Low</span>
                    <span className="w-3 h-3 rounded-sm" style={{ background: weightToColor(0.5, 0.8) }} />
                    <span>Medium</span>
                    <span className="w-3 h-3 rounded-sm" style={{ background: weightToColor(0.9, 0.8) }} />
                    <span>High attention</span>
                </div>
            </div>

            {/* ── Waveform + overlay ────────────────────────────────────── */}
            <div className="relative px-4 pt-4" style={{ minHeight: 88 }}>
                {/* WaveSurfer mount target */}
                <div ref={waveRef} className="w-full" />

                {/* Attention heatmap canvas — absolute on top of waveform */}
                {ready && attentionTimeline?.length > 0 && (
                    <canvas
                        ref={heatRef}
                        className="absolute inset-x-4 top-4 pointer-events-none rounded"
                        style={{ height: 80, mixBlendMode: 'screen', opacity: 0.75 }}
                    />
                )}

                {/* ── Most suspicious segment range highlight ──────────── */}
                {ready && mostSuspicious && totalDuration > 0 && (
                    <div
                        className="absolute top-4 pointer-events-none"
                        style={{
                            left: `calc(${(mostSuspicious.start_sec / totalDuration) * 100}% + 1rem)`,
                            width: `${((mostSuspicious.end_sec - mostSuspicious.start_sec) / totalDuration) * 100}%`,
                            height: 80,
                        }}
                        aria-hidden="true"
                    >
                        {/* Semi-transparent fill */}
                        <div className="absolute inset-0 bg-red-500/15 rounded" />

                        {/* Animated border */}
                        <div className={`absolute inset-0 rounded border-2 ${playheadInHot
                                ? 'border-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'
                                : 'border-red-500/50'
                            } transition-all duration-300`} />

                        {/* Left bracket arm */}
                        <div className="absolute left-0 top-0 w-1.5 h-3 border-l-2 border-t-2 border-red-400 rounded-tl" />
                        <div className="absolute left-0 bottom-0 w-1.5 h-3 border-l-2 border-b-2 border-red-400 rounded-bl" />

                        {/* Right bracket arm */}
                        <div className="absolute right-0 top-0 w-1.5 h-3 border-r-2 border-t-2 border-red-400 rounded-tr" />
                        <div className="absolute right-0 bottom-0 w-1.5 h-3 border-r-2 border-b-2 border-red-400 rounded-br" />
                    </div>
                )}

                {/* Peak annotation */}
                {ready && peakTimeSec !== undefined && totalDuration > 0 && (
                    <button
                        onClick={() => seekTo(peakTimeSec)}
                        className="absolute top-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/80 text-white font-bold shadow cursor-pointer hover:bg-red-400 transition-colors"
                        style={{ left: `calc(${(peakTimeSec / totalDuration) * 100}% + 1rem)` }}
                        title={`Jump to peak suspicious moment (${fmt(peakTimeSec)})`}
                    >
                        ⚠ Peak
                    </button>
                )}

                {!ready && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {/* ── Progress bar ──────────────────────────────────────────── */}
            <div className="px-4 pt-2 pb-3">
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* ── Per-segment risk timeline ─────────────────────────────── */}
            {ready && (
                <SegmentTimeline
                    segments={segments}
                    totalDuration={totalDuration}
                    currentTime={currentTime}
                    onSeek={seekTo}
                />
            )}

            {/* ── Most suspicious jump-to banner ────────────────────────── */}
            {ready && mostSuspicious && (
                <div className="mx-4 mb-3">
                    <button
                        id="explain-jump-suspicious"
                        onClick={() => seekTo(mostSuspicious.start_sec)}
                        aria-label={`Jump to most suspicious segment: ${fmt(mostSuspicious.start_sec)} to ${fmt(mostSuspicious.end_sec)}`}
                        className={[
                            'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border transition-all duration-200',
                            'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-400/60',
                            'group cursor-pointer',
                        ].join(' ')}
                    >
                        {/* Left: icon + label */}
                        <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 ${playheadInHot ? 'animate-pulse' : ''
                                }`}>
                                <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-bold text-red-300 leading-tight">
                                    Most Suspicious Segment
                                </p>
                                <p className="text-[11px] text-gray-500">
                                    Attention score: <span className="text-red-400 font-semibold">{((mostSuspicious.attention_weight ?? 0) * 100).toFixed(0)}%</span>
                                </p>
                            </div>
                        </div>

                        {/* Centre: time range pill */}
                        <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/25 rounded-lg px-3 py-1">
                            <svg className="w-3 h-3 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 1-2 0v-.07A8 8 0 0 1 4.07 11H4a1 1 0 0 1 0-2h.07A8 8 0 0 1 11 4.07V4a1 1 0 0 1 2 0v.07A8 8 0 0 1 19.93 11H20a1 1 0 0 1 0 2h-.07A8 8 0 0 1 13 16.93z" />
                            </svg>
                            <span className="text-xs font-mono text-red-300 font-bold">
                                {fmt(mostSuspicious.start_sec)} – {fmt(mostSuspicious.end_sec)}
                            </span>
                        </div>

                        {/* Right: arrow */}
                        <svg
                            className="w-4 h-4 text-red-400/60 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all shrink-0"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}

            {/* ── Controls row ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3">

                {/* Time */}
                <span className="text-xs tabular-nums text-gray-400 w-20">
                    {fmt(currentTime)} / {fmt(totalDuration || 0)}
                </span>

                {/* Play/Pause */}
                <button
                    id="explain-player-toggle"
                    onClick={togglePlay}
                    disabled={!ready}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label={playing ? 'Pause' : 'Play'}
                >
                    {playing ? (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>

                {/* Zoom */}
                <div className="flex items-center gap-2 w-28">
                    <svg className="w-3 h-3 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
                    </svg>
                    <input
                        type="range" min={10} max={200} value={zoom}
                        onChange={e => setZoom(Number(e.target.value))}
                        className="flex-1 accent-purple-500 h-1 cursor-pointer"
                        aria-label="Waveform zoom"
                    />
                </div>
            </div>
        </div>
    );
}
