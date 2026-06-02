/**
 * ExplainPage — Explainability Dashboard
 * ───────────────────────────────────────
 * Route: /explain
 *
 * 1. User uploads audio → POST /api/v1/explain
 * 2. Response contains attention_timeline, segments, top_evidence, overall
 * 3. Renders:
 *    - ExplainPlayer   → WaveSurfer + heatmap overlay
 *    - Summary pills   → verdict, confidence, peak time, entropy
 *    - MFCC chart      → per-segment spectral centroid bar chart
 *    - Segment table   → top evidence frames (high / low attention)
 */

import React, { useState, useRef, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement,
    Tooltip, Legend,
} from 'chart.js';
import toast from 'react-hot-toast';
import ExplainPlayer from '../components/ExplainPlayer';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ── Small helpers ────────────────────────────────────────────────────
const fmtTime = s => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
};

const confidencePct = c => `${(c * 100).toFixed(1)}%`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function AttentionBadge({ weight }) {
    const pct = Math.round(weight * 100);
    const hue = Math.round((1 - weight) * 240);
    return (
        <span
            className="inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white"
            style={{ background: `hsl(${hue},85%,45%)` }}
        >
            {pct}%
        </span>
    );
}

function SummaryPill({ label, value, sub, accent }) {
    const colours = {
        purple: 'from-purple-600/20 to-purple-900/10 border-purple-500/30 text-purple-300',
        red: 'from-red-600/20    to-red-900/10    border-red-500/30    text-red-300',
        green: 'from-green-600/20  to-green-900/10  border-green-500/30  text-green-300',
        blue: 'from-blue-600/20   to-blue-900/10   border-blue-500/30   text-blue-300',
    };
    return (
        <div className={`rounded-xl border bg-gradient-to-br p-4 ${colours[accent] || colours.purple}`}>
            <p className="text-xs uppercase tracking-widest opacity-70 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white leading-tight">{value}</p>
            {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
        </div>
    );
}

// ── Drop zone ────────────────────────────────────────────────────────
function DropZone({ onFile, loading }) {
    const inputRef = useRef(null);
    const [drag, setDrag] = useState(false);

    const handleFile = useCallback(file => {
        if (!file) return;
        const ok = /audio\//i.test(file.type) || /\.(wav|mp3|flac|m4a|ogg|aac)$/i.test(file.name);
        if (!ok) { toast.error('Unsupported format. Use WAV, MP3, FLAC, M4A, OGG or AAC.'); return; }
        if (file.size > 20 * 1024 * 1024) { toast.error('File exceeds 20 MB limit.'); return; }
        onFile(file);
    }, [onFile]);

    return (
        <div
            id="explain-dropzone"
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => !loading && inputRef.current?.click()}
            className={`
        relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed
        cursor-pointer select-none transition-all duration-200 py-14
        ${drag
                    ? 'border-purple-400 bg-purple-500/10 scale-[1.01]'
                    : 'border-white/10 bg-white/5 hover:border-purple-500/50 hover:bg-purple-500/5'}
        ${loading ? 'pointer-events-none opacity-60' : ''}
      `}
        >
            <input
                ref={inputRef}
                type="file"
                accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.aac"
                className="hidden"
                onChange={e => handleFile(e.target.files[0])}
                id="explain-file-input"
            />

            {loading ? (
                <>
                    <div className="w-10 h-10 border-3 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-purple-300 font-medium">Analysing audio…</p>
                    <p className="text-xs text-gray-500">Running transformer + attention extraction</p>
                </>
            ) : (
                <>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/20">
                        <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                    </div>
                    <p className="text-base font-semibold text-white">Drop audio here or click to select</p>
                    <p className="text-xs text-gray-500">WAV · MP3 · FLAC · M4A · OGG · AAC — max 20 MB</p>
                </>
            )}
        </div>
    );
}

// ── MFCC bar chart ───────────────────────────────────────────────────
function MfccChart({ segments }) {
    if (!segments?.length) return null;

    const labels = segments.map(s => `${fmtTime(s.start_sec)}–${fmtTime(s.end_sec)}`);

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Spectral Centroid (Hz)',
                data: segments.map(s => s.spectral_centroid_hz),
                backgroundColor: segments.map(s => {
                    const w = s.attention_weight ?? 0;
                    const hue = Math.round((1 - w) * 240);
                    return `hsla(${hue}, 80%, 55%, 0.75)`;
                }),
                borderRadius: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    afterLabel: ctx => {
                        const seg = segments[ctx.dataIndex];
                        return [
                            `RMS Energy: ${(seg.rms_energy * 1000).toFixed(2)}`,
                            `ZCR: ${(seg.zero_crossing_rate * 1000).toFixed(2)}`,
                            `Attn: ${((seg.attention_weight ?? 0) * 100).toFixed(0)}%`,
                        ];
                    },
                },
            },
        },
        scales: {
            x: {
                ticks: { color: '#9ca3af', font: { size: 10 } },
                grid: { color: 'rgba(255,255,255,0.04)' },
            },
            y: {
                ticks: { color: '#9ca3af', font: { size: 10 } },
                grid: { color: 'rgba(255,255,255,0.06)' },
            },
        },
    };

    return (
        <div className="rounded-2xl border border-white/5 bg-gray-900/60 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Per-Segment Spectral Centroid
                <span className="text-xs font-normal text-gray-500">(bar colour = attention weight)</span>
            </h3>
            <Bar data={chartData} options={options} />
        </div>
    );
}

// ── Evidence segment card ─────────────────────────────────────────────
function SegmentCard({ seg, type }) {
    const isFake = type === 'high';
    return (
        <div className={`rounded-xl p-3.5 border text-sm ${isFake
            ? 'border-red-500/20 bg-red-500/5'
            : 'border-green-500/20 bg-green-500/5'
            }`}>
            <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold uppercase tracking-wide ${isFake ? 'text-red-400' : 'text-green-400'}`}>
                    {isFake ? '⚠ Suspicious' : '✓ Natural'}
                </span>
                <AttentionBadge weight={seg.attention_weight ?? 0} />
            </div>
            <p className="text-gray-300 font-mono text-xs">
                {fmtTime(seg.start_sec)} – {fmtTime(seg.end_sec)}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-500">
                <span>Centroid: <span className="text-gray-300">{seg.spectral_centroid_hz?.toFixed(0)} Hz</span></span>
                <span>RMS:      <span className="text-gray-300">{(seg.rms_energy * 1000)?.toFixed(2)}</span></span>
                <span>ZCR:      <span className="text-gray-300">{(seg.zero_crossing_rate * 1000)?.toFixed(2)}</span></span>
                <span>Dur:      <span className="text-gray-300">{seg.duration_sec?.toFixed(2)}s</span></span>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function ExplainPage() {
    const { user } = useAuth();
    const [audioFile, setAudioFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);   // /explain response

    const handleFile = useCallback(async file => {
        setAudioFile(file);
        setData(null);
        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);

        const toastId = toast.loading('Running explainability analysis…');
        try {
            const result = await api.explainAudio(formData, user?.token);
            setData(result);
            toast.success('Analysis complete!', { id: toastId });
        } catch (err) {
            toast.error(err.message || 'Analysis failed', { id: toastId });
            setAudioFile(null);
        } finally {
            setLoading(false);
        }
    }, [user?.token]);

    const overall = data?.overall;
    const isFake = overall?.is_fake;
    const timeline = data?.attention_timeline ?? [];
    const segments = data?.segments ?? [];
    const highSegs = data?.top_evidence?.high_attention_segments ?? [];
    const lowSegs = data?.top_evidence?.low_attention_segments ?? [];
    const modelInfo = data?.model_info ?? {};

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-purple-950/40 to-gray-950">
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full opacity-10 blur-3xl"
                            style={{
                                width: 300 + i * 120, height: 300 + i * 120,
                                background: i % 2 === 0 ? '#7c3aed' : '#db2777',
                                top: `${-30 + i * 20}%`, left: `${10 + i * 30}%`,
                            }}
                        />
                    ))}
                </div>
                <div className="relative container py-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m1.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                            Explainability Dashboard
                        </h1>
                    </div>
                    <p className="text-gray-400 text-sm max-w-xl">
                        Upload audio to see <em>why</em> the model made its decision — visualised as an attention heatmap
                        overlaid on the waveform with per-second feature breakdown.
                    </p>
                </div>
            </div>

            <div className="container py-8 space-y-6">

                {/* ── Upload zone ─────────────────────────────────────────── */}
                <DropZone onFile={handleFile} loading={loading} />

                {/* ── Results ─────────────────────────────────────────────── */}
                {data && (
                    <>
                        {/* ── Verdict banner ────────────────────────────────── */}
                        <div className={`rounded-2xl p-5 border flex items-center gap-4 ${isFake
                            ? 'bg-red-500/10 border-red-500/30'
                            : 'bg-green-500/10 border-green-500/30'
                            }`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${isFake ? 'bg-red-500/20' : 'bg-green-500/20'
                                }`}>
                                {isFake ? '🚨' : '✅'}
                            </div>
                            <div>
                                <p className={`text-lg font-bold ${isFake ? 'text-red-300' : 'text-green-300'}`}>
                                    {isFake ? 'Likely Deepfake Detected' : 'Likely Authentic Audio'}
                                </p>
                                <p className="text-sm text-gray-400">
                                    {data.filename} · {modelInfo.num_transformer_layers} transformer layers · {modelInfo.num_attention_heads} heads
                                </p>
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-3xl font-black text-white">{confidencePct(overall.confidence)}</p>
                                <p className="text-xs text-gray-500">confidence</p>
                            </div>
                        </div>

                        {/* ── Summary pills ─────────────────────────────────── */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <SummaryPill
                                label="Verdict"
                                value={isFake ? 'FAKE' : 'REAL'}
                                sub={`${confidencePct(overall.confidence)} certainty`}
                                accent={isFake ? 'red' : 'green'}
                            />
                            <SummaryPill
                                label="Peak Suspicion"
                                value={fmtTime(overall.peak_attention_time_sec)}
                                sub="Jump to peak"
                                accent="purple"
                            />
                            <SummaryPill
                                label="Attention Entropy"
                                value={overall.attention_entropy?.toFixed(2)}
                                sub={overall.attention_entropy > 2.5 ? 'Diffuse focus' : 'Concentrated focus'}
                                accent="blue"
                            />
                            <SummaryPill
                                label="Segments"
                                value={overall.total_segments}
                                sub={`${overall.duration_sec?.toFixed(1)}s total`}
                                accent="purple"
                            />
                        </div>

                        {/* ── Waveform heatmap player ────────────────────────── */}
                        <ExplainPlayer
                            audioFile={audioFile}
                            attentionTimeline={timeline}
                            segments={segments}
                            totalDuration={overall.duration_sec}
                            peakTimeSec={overall.peak_attention_time_sec}
                        />

                        {/* ── MFCC / spectral chart ──────────────────────────── */}
                        <MfccChart segments={segments} />

                        {/* ── Evidence segments ──────────────────────────────── */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* High attention — fake evidence */}
                            <div className="rounded-2xl border border-white/5 bg-gray-900/60 p-5">
                                <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-400" />
                                    Top Suspicious Segments
                                    <span className="text-xs font-normal text-gray-500">highest model focus</span>
                                </h3>
                                <div className="space-y-2">
                                    {highSegs.slice(0, 5).map((s, i) => (
                                        <SegmentCard key={i} seg={s} type="high" />
                                    ))}
                                    {highSegs.length === 0 && (
                                        <p className="text-xs text-gray-500">No high-attention segments found.</p>
                                    )}
                                </div>
                            </div>

                            {/* Low attention — natural evidence */}
                            <div className="rounded-2xl border border-white/5 bg-gray-900/60 p-5">
                                <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-400" />
                                    Most Natural Segments
                                    <span className="text-xs font-normal text-gray-500">low attention</span>
                                </h3>
                                <div className="space-y-2">
                                    {lowSegs.slice(0, 5).map((s, i) => (
                                        <SegmentCard key={i} seg={s} type="low" />
                                    ))}
                                    {lowSegs.length === 0 && (
                                        <p className="text-xs text-gray-500">No low-attention segments found.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Analyse another ────────────────────────────────── */}
                        <div className="text-center pt-2">
                            <button
                                id="explain-reset-btn"
                                onClick={() => { setData(null); setAudioFile(null); }}
                                className="px-6 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                            >
                                ↑ Analyse another file
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
