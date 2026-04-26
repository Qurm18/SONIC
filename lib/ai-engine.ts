'use client';

export interface TuningPreference {
  choice: 'A' | 'B';
  scenario: string;
}

// 10 bands: 32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz.
const WEIGHT_MATRIX: Record<string, { A: number[], B: number[] }> = {
  'bass_depth': {
    A: [5.0, 3.5, 1.0, 0, 0, 0, 0, 0, 0, 0], // Thunderous & Deep
    B: [0, 4.0, 2.5, 0, 0, 0, 0, 0, 0, 0]    // Punchy & Responsive
  },
  'vocal_clarity': {
    A: [0, 0, 0, 2.5, 3.5, 1.0, 0, 0, 0, 0], // Warm & Silky
    B: [0, 0, 0, 0, 0.5, 3.0, 4.5, 2.0, 0, 0] // Crisp & Airy
  },
  'sub_bass': {
    A: [6.0, 2.0, 0, 0, 0, 0, 0, 0, 0, 0],
    B: [-1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  'instrument_sep': {
    A: [0, 0, 0, 0, -1.0, 2.0, 3.5, 4.0, 2.0, 0], // Wide/Open
    B: [0, 0, 0, 2.5, 4.0, 3.0, 0, 0, 0, 0]        // Tight/Focused
  },
  'mid_punch': {
    A: [0, 1.5, 4.5, 3.0, 1.0, 0, 0, 0, 0, 0],
    B: [0, 0, -1.0, -1.5, 2.0, 1.0, 0, 0, 0, 0]
  },
  'high_frequency': {
    A: [0, 0, 0, 0, 0, 0, 0, -1.0, -2.5, -4.0], // Smooth
    B: [0, 0, 0, 0, 0, 0, 1.0, 2.5, 4.5, 6.0]   // Brillant
  },
  'presence': {
    A: [0, 0, 0, 0, 0, -1.5, -2.0, -1.5, 0, 0], // Soft
    B: [0, 0, 0, 0, 0, 1.5, 3.5, 3.0, 1.0, 0]    // Defined
  },
  'warmth_body': {
    A: [0, 0, 1.5, 4.0, 3.5, 2.0, 0, 0, 0, 0],
    B: [0, 0, 0, -1.0, -1.5, 0, 0, 0, 0, 0]
  },
  'sibilance': {
    A: [0, 0, 0, 0, 0, 0, -1.5, -3.5, -5.0, -3.0], // Compressed/Safe
    B: [0, 0, 0, 0, 0, 0, 0, 2.0, 3.5, 2.5]        // Extended/Detailed
  },
  'overall_balance': {
    A: [3.5, 2.0, 0, -1.5, -2.5, -1.5, 0, 2.0, 3.5, 4.5], // V-Shaped
    B: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]                      // Reference
  }
};

/**
 * Deterministic local analysis of user preferences.
 * Maps user choices to specific frequency band adjustments via a pseudo-neural weight matrix.
 */
export async function analyzePreferences(preferences: TuningPreference[]) {
  console.group('🧠 Neural Audio Engine: Preference Analysis');
  console.log('Incoming preferences:', preferences);

  const rawGains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let bassEnergy = 0;
  let vocalWarmth = 0;
  let highClarity = 0;

  // 1. Feature Extraction & Weight Summation
  preferences.forEach((p, index) => {
    const scenarioWeights = WEIGHT_MATRIX[p.scenario];
    if (scenarioWeights) {
      const weights = scenarioWeights[p.choice];
      console.log(`[Step ${index + 1}] Processing "${p.scenario}" (${p.choice}). Weight vector:`, weights);
      
      for (let i = 0; i < 10; i++) {
        rawGains[i] += weights[i];
      }

      // Feature tracking for profile classification
      if ((p.scenario === 'bass_depth' || p.scenario === 'sub_bass') && p.choice === 'A') {
         bassEnergy += 1;
      }
      if ((p.scenario === 'vocal_clarity' || p.scenario === 'warmth_body') && p.choice === 'A') {
         vocalWarmth += 1;
      }
      if ((p.scenario === 'high_frequency' || p.scenario === 'sibilance' || p.scenario === 'presence') && p.choice === 'B') {
         highClarity += 1;
      }
    }
  });

  // 2. Scaling (Normalization)
  // Scale down to maintain musicality and prevent extreme gain peaks
  const SCALE_FACTOR = 0.7;
  let normalizedGains = rawGains.map(g => g * SCALE_FACTOR);
  console.log('Normalized output (pre-bias):', [...normalizedGains]);

  // 3. Neural Bias Injection
  // Inject "Global Intent" bias based on detected user signature
  if (bassEnergy >= 2) {
    console.log('BIAS DETECTED: Low-Frequency Emphasis. Injecting shelf boost...');
    normalizedGains = normalizedGains.map((g, i) => i < 3 ? g + 1.5 : g);
  }
  if (highClarity >= 2) {
    console.log('BIAS DETECTED: High-Resolution Precision. Injecting harmonic lift...');
    normalizedGains = normalizedGains.map((g, i) => i > 6 ? g + 1.5 : g);
  }
  if (vocalWarmth >= 2) {
    console.log('BIAS DETECTED: Analog Warmth. Injecting mid-body saturation...');
    normalizedGains = normalizedGains.map((g, i) => (i >= 2 && i <= 5) ? g + 1.2 : g);
  }

  // 4. Spatial Interpolation (Gaussian Smoothing)
  // Ensures phase linearity by smoothing transitions between adjacent bands
  let finalGains = [...normalizedGains];
  for (let i = 0; i < normalizedGains.length; i++) {
    const prev = normalizedGains[i - 1] ?? normalizedGains[i];
    const curr = normalizedGains[i];
    const next = normalizedGains[i + 1] ?? normalizedGains[i];
    finalGains[i] = (prev * 0.2) + (curr * 0.6) + (next * 0.2);
  }

  // 5. Classification Layer (Profile Metadata)
  let profileName = "Studio Reference";
  let insights = ["Neutral response curve ensuring high fidelity to the original master.", "Optimized for raw monitoring and critical listening."];

  if (bassEnergy > highClarity && bassEnergy > vocalWarmth) {
    profileName = "Power Bass";
    insights = ["Aggressive sub-bass boost with controlled mid-bass transients.", "Ideal for EDM, modern pop, and cinematic experiences."];
  } else if (highClarity > bassEnergy && highClarity > vocalWarmth) {
    profileName = "Ultra Clarity";
    insights = ["Meticulous detail retrieval in the upper harmonics.", "Vocal textures and instruments separation are maximized."];
  } else if (vocalWarmth > bassEnergy && vocalWarmth > highClarity) {
    profileName = "Analog Warmth";
    insights = ["Rich, velvety mid-range focus reminiscent of tube amplification.", "Optimized for vocal jazz, acoustic tracks, and fatigue-free listening."];
  } else if (bassEnergy > 0 && highClarity > 0) {
    profileName = "V-Excitement";
    insights = ["The classic 'fun' curve. Enhanced impact on both ends of the spectrum.", "Best for outdoor listening and energetic rock genres."];
  }

  console.log('Final EQ Mapping Optimized:', finalGains);
  console.log('Selected Profile:', profileName);
  console.groupEnd();

  return {
    gains: finalGains.map(g => Math.max(-12, Math.min(12, g))),
    profileName,
    insights
  };
}
