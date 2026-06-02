// ─────────────────────────────────────────────
// formatAnalysis.js — Shared data-formatting helpers
// ─────────────────────────────────────────────
// Both ResultPage and DetailedAnalysisPage need to transform raw API
// responses into the shape the UI components expect.  Rather than
// duplicating 80+ lines of mapping logic in each page, this module
// exposes pure functions that do the work once.
// ─────────────────────────────────────────────

/**
 * Human-readable model label
 */
const MODEL_LABELS = {
    'wav2vec2-xlsr-deepfake': 'Wav2Vec2 (Advanced)',
    'standard-ml-classifier': 'Standard ML',
    'wav2vec2-demo': 'Demo Version',
    'wav2vec2_transformer_ensemble': 'Transformer Ensemble',
    'transformer_attention_analysis': 'Attention Analysis',
};

/**
 * Build the feature-detail cards from `details.feature_scores`.
 *
 * @param {object|undefined} featureScores
 * @param {boolean}          isDeepfake
 * @param {number}           confidenceScore   (0-1)
 * @returns {Array<{label:string, value:string, description:string, score?:number}>}
 */
export function buildFeatureDetails(featureScores, isDeepfake, confidenceScore) {
    const details = [];

    if (featureScores) {
        const features = [
            {
                key: 'mfcc_score',
                label: 'Voice Pattern Analysis',
                highValue: 'Artificial',
                lowValue: 'Natural',
                highDesc: 'Patterns indicate potential AI generation',
                lowDesc: 'Patterns match typical human speech characteristics',
            },
            {
                key: 'spectral_score',
                label: 'Frequency Analysis',
                highValue: 'Abnormal',
                lowValue: 'Normal',
                highDesc: 'Unusual frequency distribution detected',
                lowDesc: 'Frequency distribution within expected human range',
            },
            {
                key: 'wav2vec2_score',
                label: 'Neural Pattern Analysis',
                highValue: 'AI Detected',
                lowValue: 'Human Likely',
                highDesc: 'Neural network detected patterns consistent with AI generation',
                lowDesc: 'Neural patterns more consistent with human speech',
            },
            {
                key: 'temporal_score',
                label: 'Temporal Coherence',
                highValue: 'Inconsistent',
                lowValue: 'Consistent',
                highDesc: 'Time-based patterns show potential synthesis artifacts',
                lowDesc: 'Time-based patterns show natural human speech variation',
            },
        ];

        for (const f of features) {
            const score = featureScores[f.key];
            if (score === undefined || (f.key === 'wav2vec2_score' && score === 0)) continue;
            details.push({
                label: f.label,
                value: score > 0.5 ? f.highValue : f.lowValue,
                description: score > 0.5 ? f.highDesc : f.lowDesc,
                score,
            });
        }
    }

    // Fallback if nothing was extracted
    if (details.length === 0) {
        details.push({
            label: 'Overall Analysis',
            value: isDeepfake ? 'Artificial' : 'Natural',
            description: isDeepfake
                ? 'AI patterns detected in the audio'
                : 'Natural human voice characteristics detected',
            score: confidenceScore,
        });
    }

    return details;
}

/**
 * Format a raw API analysis object for the Result component.
 *
 * @param {object} data — raw API response from `/analyses/:id`
 * @returns {object}     shape expected by `<Result />`
 */
export function formatForResultComponent(data) {
    const details = buildFeatureDetails(
        data.details?.feature_scores,
        data.is_deepfake,
        data.confidence_score,
    );

    return {
        fileName: data.metadata?.filename || 'Unknown file',
        fileSize: data.metadata?.file_size
            ? `${(data.metadata.file_size / (1024 * 1024)).toFixed(2)} MB`
            : 'Unknown',
        format: data.metadata?.filename
            ? data.metadata.filename.split('.').pop().toUpperCase()
            : 'Unknown',
        duration: data.metadata?.duration
            ? `${data.metadata.duration.toFixed(2)}s`
            : 'Unknown',
        sampleRate: data.metadata?.sample_rate
            ? `${(data.metadata.sample_rate / 1000).toFixed(1)} kHz`
            : 'Unknown',
        bitDepth: '16 bits',
        channels: '2 (Stereo)',
        is_fake: data.is_deepfake,
        isAI: data.is_deepfake,
        confidence: data.confidence_score * 100,
        probability: data.is_deepfake
            ? data.confidence_score
            : 1 - data.confidence_score,
        timestamp: data.analysis_timestamp,
        metadata_id: data.metadata_id,
        analysis_id: data.id,
        details_id: data.details?.id,
        analysisTime: data.details?.processing_time || 'Unknown',
        modelUsed: MODEL_LABELS[data.model_used] || 'Unknown Model',
        details,
    };
}

/**
 * Format a raw API analysis object for the DetailedAnalysis component.
 *
 * @param {object} data — raw API response from `/analyses/:id`
 * @returns {object}     shape expected by `<DetailedAnalysis />`
 */
export function formatForDetailedComponent(data) {
    const uploadDate = new Date(
        data.analysis_timestamp || data.metadata?.upload_timestamp,
    );
    const formattedDate = uploadDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const resultText = data.is_deepfake
        ? `${Math.round(data.confidence_score * 100)}% Fake`
        : `${Math.round((1 - data.confidence_score) * 100)}% Real`;

    const details = buildFeatureDetails(
        data.details?.feature_scores,
        data.is_deepfake,
        data.confidence_score,
    );

    return {
        id: data.id,
        date: formattedDate,
        fileName: data.metadata?.filename || 'Unknown File',
        result: resultText,
        isAI: data.is_deepfake,
        confidence: Math.round(data.confidence_score * 100),
        duration: data.metadata
            ? `${data.metadata.duration.toFixed(2)}s`
            : 'Unknown',
        format: data.metadata
            ? data.metadata.filename.split('.').pop().toUpperCase()
            : 'Unknown',
        sampleRate: data.metadata
            ? `${(data.metadata.sample_rate / 1000).toFixed(1)} kHz`
            : 'Unknown',
        analysisTime: data.details
            ? data.details.processing_time.toFixed(0)
            : 'Unknown',
        details,
        rawData: data,
    };
}
