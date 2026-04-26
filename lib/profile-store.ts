'use client';

import { EQBand } from './audio-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedProfile {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  color?: string;
  bands: EQBand[];
  preAmp: number;
  createdAt: number;
  updatedAt: number;
  source: 'ai' | 'manual' | 'import';
}

export interface ProfileStore {
  profiles: SavedProfile[];
  lastActiveId: string | null;
}

// ─── EqualizerAPO / AutoEq Format Parser ─────────────────────────────────────
// Supports lines like:
//   Filter 1: ON PK Fc 1000 Hz Gain 3.0 dB BW Oct 1.0
//   Filter 2: ON LSC Fc 105 Hz Gain 4.5 dB Q 0.71
//   Filter 3: ON HSC Fc 10000 Hz Gain -2.0 dB Q 0.71
//   Preamp: -6.5 dB

export interface ParseResult {
  bands: EQBand[];
  preAmp: number;
  errors: string[];
}

const APO_FILTER_TYPES: Record<string, BiquadFilterType> = {
  PK:  'peaking',
  LSC: 'lowshelf',
  HSC: 'highshelf',
  NO:  'notch',
  BP:  'bandpass',
  LP:  'lowpass',
  HP:  'highpass',
};

export function parseEqualizerAPO(text: string): ParseResult {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const bands: EQBand[] = [];
  let preAmp = 0;
  const errors: string[] = [];

  for (const line of lines) {
    // Skip comments
    if (line.startsWith('#') || line.startsWith('//')) continue;

    // Preamp line: "Preamp: -6.5 dB"
    const preampMatch = line.match(/^Preamp:\s*([-\d.]+)\s*dB/i);
    if (preampMatch) {
      preAmp = parseFloat(preampMatch[1]);
      continue;
    }

    // Filter line: "Filter N: ON <TYPE> Fc <freq> Hz Gain <gain> dB [Q <q> | BW Oct <bw>]"
    const filterMatch = line.match(
      /Filter\s+\d+:\s+ON\s+(\w+)\s+Fc\s+([\d.]+)\s+Hz\s+Gain\s+([-\d.]+)\s+dB(?:\s+(?:Q|BW\s+Oct)\s+([\d.]+))?/i
    );
    if (filterMatch) {
      const [, typeStr, freqStr, gainStr, qStr] = filterMatch;
      const filterType = APO_FILTER_TYPES[typeStr.toUpperCase()];

      if (!filterType) {
        errors.push(`Unknown filter type "${typeStr}" — skipped.`);
        continue;
      }

      // Convert bandwidth in octaves to Q: Q = 1 / (2 * sinh(ln(2)/2 * BW))
      let q = qStr ? parseFloat(qStr) : 1.4;
      if (line.match(/BW\s+Oct/i) && qStr) {
        const bw = parseFloat(qStr);
        q = 1 / (2 * Math.sinh((Math.LN2 / 2) * bw));
      }

      bands.push({
        frequency: parseFloat(freqStr),
        gain: parseFloat(gainStr),
        q: Math.max(0.1, Math.min(10, q)),
        type: filterType,
      });
      continue;
    }
  }

  if (bands.length === 0 && errors.length === 0) {
    errors.push('No valid filter lines found. Check the format.');
  }

  return { bands, preAmp, errors };
}

// ─── Export to EqualizerAPO text format ──────────────────────────────────────

const APO_TYPE_MAP: Partial<Record<BiquadFilterType, string>> = {
  peaking:   'PK',
  lowshelf:  'LSC',
  highshelf: 'HSC',
  notch:     'NO',
  bandpass:  'BP',
};

export function exportToEqualizerAPO(profile: SavedProfile): string {
  const lines: string[] = [
    `# SONIC AI — EQ Profile`,
    `# Profile: ${profile.name}`,
    `# Created: ${new Date(profile.createdAt).toISOString()}`,
    `#`,
    `Preamp: ${profile.preAmp.toFixed(1)} dB`,
    ``,
  ];

  profile.bands.forEach((band, i) => {
    const typeStr = APO_TYPE_MAP[band.type] ?? 'PK';
    lines.push(
      `Filter ${i + 1}: ON ${typeStr} Fc ${band.frequency} Hz Gain ${band.gain.toFixed(1)} dB Q ${band.q.toFixed(2)}`
    );
  });

  return lines.join('\n');
}

// ─── localStorage CRUD ────────────────────────────────────────────────────────

const STORE_KEY = 'sonic_profiles';
const CURRENT_BANDS_KEY = 'sonic_current_bands';
const CURRENT_PREAMP_KEY = 'sonic_current_preamp';

function loadStore(): ProfileStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as ProfileStore;
  } catch {}
  return { profiles: [], lastActiveId: null };
}

function saveStore(store: ProfileStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('ProfileStore: localStorage write failed', e);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getAllProfiles(): SavedProfile[] {
  return loadStore().profiles.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveProfile(
  name: string,
  bands: EQBand[],
  preAmp: number,
  opts?: { description?: string; genre?: string; color?: string; source?: SavedProfile['source'] }
): SavedProfile {
  const store = loadStore();
  const now = Date.now();
  const profile: SavedProfile = {
    id: `profile_${now}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    description: opts?.description,
    genre: opts?.genre,
    color: opts?.color,
    bands: bands.map((b) => ({ ...b })),
    preAmp,
    createdAt: now,
    updatedAt: now,
    source: opts?.source ?? 'manual',
  };
  store.profiles.unshift(profile);
  store.lastActiveId = profile.id;
  saveStore(store);
  return profile;
}

export function updateProfile(id: string, updates: Partial<Pick<SavedProfile, 'name' | 'bands' | 'preAmp' | 'description'>>): boolean {
  const store = loadStore();
  const idx = store.profiles.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  store.profiles[idx] = { ...store.profiles[idx], ...updates, updatedAt: Date.now() };
  saveStore(store);
  return true;
}

export function deleteProfile(id: string): boolean {
  const store = loadStore();
  const before = store.profiles.length;
  store.profiles = store.profiles.filter((p) => p.id !== id);
  if (store.lastActiveId === id) store.lastActiveId = store.profiles[0]?.id ?? null;
  saveStore(store);
  return store.profiles.length < before;
}

export function getProfile(id: string): SavedProfile | undefined {
  return loadStore().profiles.find((p) => p.id === id);
}

// ─── Current session persistence (auto-save current EQ state) ────────────────

export function persistCurrentState(bands: EQBand[], preAmp: number): void {
  try {
    localStorage.setItem(CURRENT_BANDS_KEY, JSON.stringify(bands));
    localStorage.setItem(CURRENT_PREAMP_KEY, String(preAmp));
  } catch {}
}

export function loadCurrentState(): { bands: EQBand[] | null; preAmp: number } {
  try {
    const bandsRaw = localStorage.getItem(CURRENT_BANDS_KEY);
    const preAmpRaw = localStorage.getItem(CURRENT_PREAMP_KEY);
    return {
      bands: bandsRaw ? JSON.parse(bandsRaw) : null,
      preAmp: preAmpRaw ? parseFloat(preAmpRaw) : 0,
    };
  } catch {
    return { bands: null, preAmp: 0 };
  }
}

export function clearCurrentState(): void {
  try {
    localStorage.removeItem(CURRENT_BANDS_KEY);
    localStorage.removeItem(CURRENT_PREAMP_KEY);
  } catch {}
}

// ─── Export profile as downloadable JSON ──────────────────────────────────────

export function exportProfileAsJSON(profile: SavedProfile): void {
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sonic-${profile.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportProfileAsAPO(profile: SavedProfile): void {
  const text = exportToEqualizerAPO(profile);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sonic-${profile.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
