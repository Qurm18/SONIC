'use client';

export interface TuningPreference {
  choice: 'A' | 'B';
  scenario: string;
}

export interface EQProfile {
  name: string;
  description: string;
  genre: string;
  gains: number[];
  insights: string[];
  color: string;
}

// ─── Weight Matrix ────────────────────────────────────────────────────────────
// 10 bands: 32Hz · 64Hz · 125Hz · 250Hz · 500Hz · 1kHz · 2kHz · 4kHz · 8kHz · 16kHz
const WEIGHT_MATRIX: Record<string, { A: number[]; B: number[] }> = {
  bass_depth:       { A: [5.0, 3.5, 1.0, 0, 0, 0, 0, 0, 0, 0],         B: [0, 4.0, 2.5, 0, 0, 0, 0, 0, 0, 0]       },
  vocal_clarity:    { A: [0, 0, 0, 2.5, 3.5, 1.0, 0, 0, 0, 0],          B: [0, 0, 0, 0, 0.5, 3.0, 4.5, 2.0, 0, 0]   },
  sub_bass:         { A: [6.0, 2.0, 0, 0, 0, 0, 0, 0, 0, 0],             B: [-1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0]        },
  instrument_sep:   { A: [0, 0, 0, 0, -1.0, 2.0, 3.5, 4.0, 2.0, 0],     B: [0, 0, 0, 2.5, 4.0, 3.0, 0, 0, 0, 0]     },
  mid_punch:        { A: [0, 1.5, 4.5, 3.0, 1.0, 0, 0, 0, 0, 0],         B: [0, 0, -1.0, -1.5, 2.0, 1.0, 0, 0, 0, 0] },
  high_frequency:   { A: [0, 0, 0, 0, 0, 0, 0, -1.0, -2.5, -4.0],        B: [0, 0, 0, 0, 0, 0, 1.0, 2.5, 4.5, 6.0]   },
  presence:         { A: [0, 0, 0, 0, 0, -1.5, -2.0, -1.5, 0, 0],        B: [0, 0, 0, 0, 0, 1.5, 3.5, 3.0, 1.0, 0]   },
  warmth_body:      { A: [0, 0, 1.5, 4.0, 3.5, 2.0, 0, 0, 0, 0],         B: [0, 0, 0, -1.0, -1.5, 0, 0, 0, 0, 0]      },
  sibilance:        { A: [0, 0, 0, 0, 0, 0, -1.5, -3.5, -5.0, -3.0],     B: [0, 0, 0, 0, 0, 0, 0, 2.0, 3.5, 2.5]      },
  overall_balance:  { A: [3.5, 2.0, 0, -1.5, -2.5, -1.5, 0, 2.0, 3.5, 4.5], B: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]        },
};

// ─── Multi-dimensional Feature Scoring ───────────────────────────────────────
interface FeatureScores {
  subBassEnergy: number;
  midBassEnergy: number;
  midRange: number;
  presence: number;
  airDetail: number;
  flatness: number;
}

const FEATURE_RULES: Record<string, Partial<Record<keyof FeatureScores, { A: number; B: number }>>> = {
  bass_depth:       { subBassEnergy: { A: 1.5, B: 0.3 }, midBassEnergy: { A: 0.5, B: 1.2 } },
  sub_bass:         { subBassEnergy: { A: 2.0, B: -0.5 } },
  mid_punch:        { midBassEnergy: { A: 1.5, B: -0.3 }, midRange: { A: 0.8, B: -0.5 } },
  vocal_clarity:    { midRange: { A: 1.5, B: -0.2 }, presence: { A: -0.3, B: 1.0 } },
  warmth_body:      { midRange: { A: 1.8, B: -0.8 }, flatness: { A: -0.5, B: 0.8 } },
  instrument_sep:   { presence: { A: 0.8, B: -0.2 }, midRange: { A: -0.3, B: 0.5 } },
  presence:         { presence: { A: -1.0, B: 2.0 } },
  high_frequency:   { airDetail: { A: -1.5, B: 2.0 }, flatness: { A: 0.5, B: -0.3 } },
  sibilance:        { airDetail: { A: -1.0, B: 1.5 } },
  overall_balance:  { subBassEnergy: { A: 0.8, B: 0 }, airDetail: { A: 0.8, B: 0 }, flatness: { A: -1.0, B: 2.0 } },
};

// ─── Profile Definitions ──────────────────────────────────────────────────────
interface ProfileDef {
  name: string;
  description: string;
  genre: string;
  color: string;
  insights: string[];
  requires: Partial<Record<keyof FeatureScores, number>>;
  rejects?: Partial<Record<keyof FeatureScores, number>>;
  bias: number[];
  priority: number;
}

const PROFILES: ProfileDef[] = [
  {
    name: 'Deep Sub Reference',
    description: 'Maximum sub-bass extension with ultra-controlled mids',
    genre: 'EDM · Cinematic · Hip-Hop',
    color: '#7F77DD',
    insights: [
      'Sub-bass shelf boosted to physical pressure threshold.',
      'Mid-range notched for maximum sub clarity and definition.',
    ],
    requires: { subBassEnergy: 2.5 },
    rejects: { flatness: 2.0 },
    bias: [3.0, 1.5, 0, -1.0, -1.5, -1.0, 0, 0, 0, 0],
    priority: 8,
  },
  {
    name: 'Power Bass',
    description: 'Aggressive low-end impact across the entire bass register',
    genre: 'EDM · Modern Pop · Gaming',
    color: '#E24B4A',
    insights: [
      'Full bass register boosted — sub slam meets mid-bass thump.',
      'Treble kept clean to prevent listener fatigue at high volumes.',
    ],
    requires: { subBassEnergy: 1.0, midBassEnergy: 1.0 },
    rejects: { flatness: 2.0, airDetail: 2.0 },
    bias: [2.0, 2.5, 1.0, 0, -1.0, 0, 0, 0, 0, 0],
    priority: 7,
  },
  {
    name: 'Analog Warmth',
    description: 'Tube-like mid-body saturation, rolled-off highs',
    genre: 'Vocal Jazz · Acoustic · R&B',
    color: '#EF9F27',
    insights: [
      'Lower midrange lifted for a rich, full-bodied texture.',
      'High-frequency air gently rolled off for zero digital harshness.',
    ],
    requires: { midRange: 2.0 },
    rejects: { airDetail: 1.5, subBassEnergy: 2.5 },
    bias: [0, 0, 1.5, 2.0, 1.5, 0.5, -0.5, -1.0, -1.5, -2.0],
    priority: 6,
  },
  {
    name: 'Vocal Forward',
    description: 'Elevated presence and clarity, optimized for voices',
    genre: 'Pop · Podcast · Live Performance',
    color: '#D4537E',
    insights: [
      '1-4 kHz presence region lifted — vocals sit front and center.',
      'Bass is intentionally lean to prevent masking the vocal fundamental.',
    ],
    requires: { midRange: 1.5, presence: 1.0 },
    rejects: { subBassEnergy: 2.0 },
    bias: [0, 0, 0, 1.0, 2.5, 3.0, 1.5, 0.5, 0, 0],
    priority: 6,
  },
  {
    name: 'Ultra Clarity',
    description: 'Maximum detail retrieval and upper-harmonic resolution',
    genre: 'Classical · Jazz · Audiophile',
    color: '#378ADD',
    insights: [
      'Upper harmonics lifted for microscopic instrument separation.',
      'Presence region tuned for forward transient attack on every note.',
    ],
    requires: { airDetail: 2.0, presence: 1.0 },
    rejects: { subBassEnergy: 2.0, midRange: 2.5 },
    bias: [0, 0, 0, -0.5, 0, 1.0, 2.5, 3.0, 2.0, 1.0],
    priority: 7,
  },
  {
    name: 'V-Excitement',
    description: 'Classic consumer V-curve — boosted bass and treble',
    genre: 'Rock · Pop · Outdoor Listening',
    color: '#D85A30',
    insights: [
      'Classic V-shaped fun curve — both ends of the spectrum amplified.',
      'Ideal for energetic listening when critical accuracy is secondary.',
    ],
    requires: { subBassEnergy: 0.8, airDetail: 0.8 },
    rejects: { flatness: 2.5, midRange: 2.5 },
    bias: [2.0, 1.5, 0, -1.5, -2.0, -1.5, 0, 1.5, 2.0, 2.5],
    priority: 5,
  },
  {
    name: 'Harman Target',
    description: 'Research-based target curve for over-ear headphones',
    genre: 'Universal · Critical Listening',
    color: '#1D9E75',
    insights: [
      'Follows Harman International research — statistically preferred by most listeners.',
      'Gentle bass shelf, flat mids, slight treble dip around 6kHz.',
    ],
    requires: { flatness: 0.5 },
    rejects: { subBassEnergy: 2.5, airDetail: 2.5 },
    bias: [3.0, 2.0, 1.0, 0, -0.5, -0.5, -1.5, -2.0, -1.0, 0],
    priority: 4,
  },
  {
    name: 'Studio Reference',
    description: 'Neutral flat response for accurate monitoring',
    genre: 'Mixing · Mastering · Production',
    color: '#888780',
    insights: [
      'Flat response — every frequency reproduced with equal weight.',
      'Optimized for critical listening where source accuracy is paramount.',
    ],
    requires: {},
    bias: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    priority: 1,
  },
];

// ─── Sigmoid Normalization ────────────────────────────────────────────────────
// f(x) = 12 * tanh(x / 8)
// Never hard-clips: x=8→9.6dB, x=12→11.2dB, x=20→11.9dB
function sigmoidGain(raw: number): number {
  return 12 * Math.tanh(raw / 8);
}

// ─── Gaussian Smoothing ───────────────────────────────────────────────────────
// Kernel [0.2, 0.6, 0.2] — prevents adjacent band conflicts
function gaussianSmooth(gains: number[]): number[] {
  return gains.map((g, i) => {
    const prev = gains[i - 1] ?? g;
    const next = gains[i + 1] ?? g;
    return prev * 0.2 + g * 0.6 + next * 0.2;
  });
}

// ─── Profile Matching ─────────────────────────────────────────────────────────
function matchProfile(scores: FeatureScores): ProfileDef {
  const qualified = PROFILES.filter((p) => {
    for (const [key, threshold] of Object.entries(p.requires)) {
      if ((scores[key as keyof FeatureScores] ?? 0) < threshold) return false;
    }
    for (const [key, threshold] of Object.entries(p.rejects ?? {})) {
      if ((scores[key as keyof FeatureScores] ?? 0) >= threshold!) return false;
    }
    return true;
  });
  return qualified.sort((a, b) => b.priority - a.priority)[0] ?? PROFILES[PROFILES.length - 1];
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export async function analyzePreferences(
  preferences: TuningPreference[]
): Promise<{ gains: number[]; profileName: string; insights: string[]; profile: EQProfile }> {
  console.group('SONIC AI Engine v2 — Preference Analysis');

  const rawGains = new Array(10).fill(0);
  const featureScores: FeatureScores = { subBassEnergy: 0, midBassEnergy: 0, midRange: 0, presence: 0, airDetail: 0, flatness: 0 };

  for (const pref of preferences) {
    const weights = WEIGHT_MATRIX[pref.scenario]?.[pref.choice];
    if (weights) for (let i = 0; i < 10; i++) rawGains[i] += weights[i];

    const rules = FEATURE_RULES[pref.scenario];
    if (rules) {
      for (const [feature, votes] of Object.entries(rules)) {
        featureScores[feature as keyof FeatureScores] += votes[pref.choice] ?? 0;
      }
    }
  }

  console.log('Feature scores:', { ...featureScores });

  const profile = matchProfile(featureScores);
  console.log('Matched profile:', profile.name);

  const biasedGains = rawGains.map((g, i) => g + profile.bias[i]);
  const sigmoidGains = biasedGains.map(sigmoidGain);
  const finalGains = gaussianSmooth(sigmoidGains);

  console.log('Final gains:', finalGains.map((g) => g.toFixed(2)));
  console.groupEnd();

  const result: EQProfile = {
    name: profile.name,
    description: profile.description,
    genre: profile.genre,
    color: profile.color,
    gains: finalGains,
    insights: profile.insights,
  };

  return { gains: finalGains, profileName: profile.name, insights: profile.insights, profile: result };
}

export function getProfileNames(): string[] {
  return PROFILES.map((p) => p.name);
}