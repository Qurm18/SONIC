'use client';

export interface EQBand {
  frequency: number;
  type: BiquadFilterType;
  gain: number;
  q: number;
}

export const DEFAULT_BANDS: EQBand[] = [
  { frequency: 32, type: 'lowshelf', gain: 0, q: 0.7 },
  { frequency: 64, type: 'peaking', gain: 0, q: 1.4 },
  { frequency: 125, type: 'peaking', gain: 0, q: 1.4 },
  { frequency: 250, type: 'peaking', gain: 0, q: 1.4 },
  { frequency: 500, type: 'peaking', gain: 0, q: 1.4 },
  { frequency: 1000, type: 'peaking', gain: 0, q: 1.4 },
  { frequency: 2000, type: 'peaking', gain: 0, q: 1.4 },
  { frequency: 4000, type: 'peaking', gain: 0, q: 1.4 },
  { frequency: 8000, type: 'peaking', gain: 0, q: 1.4 },
  { frequency: 16000, type: 'highshelf', gain: 0, q: 0.7 },
];

export class AudioEngine {
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private analyzer: AnalyserNode | null = null;
  private preGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public async initialize(audioElement: HTMLAudioElement) {
    if (!this.context) return;
    
    // Explicitly resume context (it might be suspended by the browser)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    // Connect source if not connected
    if (!this.source) {
      try {
        this.source = this.context.createMediaElementSource(audioElement);
      } catch (err) {
        // Source already connected to this or another element
        console.warn("Audio source connection warning:", err);
      }
    }

    if (!this.analyzer) {
      this.analyzer = this.context.createAnalyser();
      this.analyzer.fftSize = 512; // High resolution
      this.analyzer.smoothingTimeConstant = 0.85;
    }

    if (!this.compressor) {
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.context.currentTime);
      this.compressor.knee.setValueAtTime(30, this.context.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.context.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.context.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.context.currentTime);
    }

    if (!this.preGain) {
      this.preGain = this.context.createGain();
      this.preGain.gain.value = 1.0;
    }

    if (!this.masterGain) {
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.8;
    }

    // Initialize/Connect filters
    if (this.filters.length === 0) {
      this.filters = DEFAULT_BANDS.map((band) => {
        const filter = this.context!.createBiquadFilter();
        filter.type = band.type;
        filter.frequency.value = band.frequency;
        filter.gain.value = band.gain;
        filter.Q.value = band.q;
        return filter;
      });

      // Chain: Source -> PreGain -> Filters -> Compressor -> MasterGain -> Analyzer -> Destination
      if (this.source && this.preGain && this.masterGain && this.analyzer && this.compressor) {
        let lastNode: AudioNode = this.source;
        
        lastNode.connect(this.preGain);
        lastNode = this.preGain;

        this.filters.forEach((filter) => {
          lastNode.connect(filter);
          lastNode = filter;
        });

        lastNode.connect(this.compressor);
        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.analyzer);
        this.analyzer.connect(this.context.destination);
      }
    }
  }

  public setPreAmp(dB: number) {
    if (this.preGain && this.context) {
      const gain = Math.pow(10, dB / 20);
      this.preGain.gain.setTargetAtTime(gain, this.context.currentTime, 0.01);
    }
  }

  public async resume() {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  public async findCalibrationSegments(audioUrl: string): Promise<Record<string, number>> {
    try {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
      
      const duration = audioBuffer.duration;
      const sampleRate = audioBuffer.sampleRate;
      const channelData = audioBuffer.getChannelData(0); // Use first channel for analysis
      
      // Analysis parameters
      const windowSize = Math.floor(sampleRate * 0.5); // 500ms windows
      const step = Math.floor(sampleRate * 1.0); // 1s steps
      
      const results: Record<string, number> = {};
      
      // Helper to find peak in a filtered range (simplified RMS-like approach)
      const scanTrack = (filterCallback: (val: number, i: number) => number) => {
        let maxEnergy = -1;
        let bestTime = duration * 0.2; // Default to 20% in
        
        for (let i = 0; i < channelData.length - windowSize; i += step) {
          let energy = 0;
          for (let j = 0; j < windowSize; j++) {
            const val = filterCallback(channelData[i + j], i + j);
            energy += val * val;
          }
          if (energy > maxEnergy) {
            maxEnergy = energy;
            bestTime = i / sampleRate;
          }
        }
        return bestTime;
      };

      // Heuristic "Neural" Scene Detection
      results['bass_depth'] = scanTrack((v) => v); // Overall energy peak (usually hook)
      results['sub_bass'] = scanTrack((v) => v); 
      results['vocal_clarity'] = duration * 0.15; // Usually intro/verse
      results['instrument_sep'] = duration * 0.45;
      results['mid_punch'] = scanTrack((v) => Math.abs(v) > 0.5 ? v : 0); // High transient sections
      results['high_frequency'] = scanTrack((v) => v); 
      results['presence'] = duration * 0.75;
      results['warmth_body'] = duration * 0.85;
      results['sibilance'] = duration * 0.20;
      results['overall_balance'] = duration * 0.50;

      return results;
    } catch (e) {
      console.warn("Scene analysis failed, using defaults", e);
      return {
        'bass_depth': 15,
        'vocal_clarity': 30,
        'high_frequency': 45
      };
    }
  }

  public updateBandParams(index: number, params: Partial<EQBand>) {
    if (this.filters[index]) {
      const filter = this.filters[index];
      if (params.type !== undefined) filter.type = params.type;
      if (params.frequency !== undefined) filter.frequency.setTargetAtTime(params.frequency, this.context!.currentTime, 0.01);
      if (params.gain !== undefined) filter.gain.setTargetAtTime(params.gain, this.context!.currentTime, 0.01);
      if (params.q !== undefined) filter.Q.setTargetAtTime(params.q, this.context!.currentTime, 0.01);
    }
  }

  public updateBand(index: number, gain: number) {
    this.updateBandParams(index, { gain });
  }

  public getAnalyzer() {
    return this.analyzer;
  }

  public setMasterVolume(value: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = value;
    }
  }

  public close() {
    this.context?.close();
  }
}
