'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, SkipForward, SkipBack, 
  Settings, Sparkles, Volume2, Music, 
  Download, List, Sliders, Activity,
  ArrowRight
} from 'lucide-react';
import { AudioEngine, DEFAULT_BANDS, EQBand } from '@/lib/audio-engine';
import { Visualizer } from '@/components/Visualizer';
import { EQPanel } from '@/components/EQPanel';
import { EQCurve } from '@/components/EQCurve';
import { TuningWizard } from '@/components/TuningWizard';

const TRACKS = [
  { id: 'idol', name: 'J-Pop Vibe (CORS)', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a7315b.mp3' },
  { id: 'anime', name: 'Ambient Chill (CORS)', url: 'https://cdn.pixabay.com/audio/2022/01/21/audio_3174244a07.mp3' },
  { id: 'citypop', name: 'Retro Synth (CORS)', url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_17e3a242c1.mp3' },
];

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bands, setBands] = useState<EQBand[]>(DEFAULT_BANDS);
  const [volume, setVolume] = useState(0.8);
  const [preAmp, setPreAmp] = useState(0);
  const [showWizard, setShowWizard] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [lastSync, setLastSync] = useState<string>('');
  const [audioSource, setAudioSource] = useState(TRACKS[0].url);
  const [currentTrackName, setCurrentTrackName] = useState(TRACKS[0].name);
  const [urlInput, setUrlInput] = useState('');
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  const [isAICalibrated, setIsAICalibrated] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Set last sync on mount only to avoid hydration mismatch and linter warnings
    const time = new Date().toLocaleTimeString();
    const timer = setTimeout(() => {
      setLastSync(time);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const initAudio = async () => {
    if (!audioRef.current) return;
    
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
    }
    
    await engineRef.current.initialize(audioRef.current);
    setAnalyzer(engineRef.current.getAnalyzer());
    setIsReady(true);
  };

  useEffect(() => {
    if (engineRef.current && isReady) {
      (window as any).__ENGINE__ = engineRef.current;
      (window as any).__AUDIO_SRC__ = audioSource;
    }
  }, [isReady, audioSource]);

  const togglePlayback = async () => {
    if (!audioRef.current) return;
    
    // Explicitly resume on every click to be safe
    if (engineRef.current) {
      await engineRef.current.resume();
    } else {
      await initAudio();
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const promise = audioRef.current.play();
        if (promise !== undefined) {
          promise.then(() => {
            setIsPlaying(true);
            setErrorHeader(null);
          }).catch(error => {
            console.error("Playback failed:", error);
            setErrorHeader("Autoplay blocked or network error.");
            setIsPlaying(false);
          });
        }
      }
    } catch (err) {
      console.error("Playback error:", err);
      setIsPlaying(false);
    }
  };

  const handleTrackChange = async (url: string, name: string) => {
    setAudioSource(url);
    setCurrentTrackName(name);
    setIsPlaying(false);
    setErrorHeader(null);
    
    // In Next.js/React, we need to wait for src to update before loading
    setTimeout(() => {
      if (audioRef.current) {
        // Clear previous state
        audioRef.current.pause();
        audioRef.current.load();
        setIsPlaying(false);
      }
    }, 0);
  };

  const handleBandChange = (index: number, params: Partial<EQBand>) => {
    const newBands = [...bands];
    newBands[index] = { ...newBands[index], ...params };
    setBands(newBands);
    engineRef.current?.updateBandParams(index, params);

    // Auto Pre-Amp Adjustment:
    // If any band has gain > 0, we should reduce pre-amp to prevent digital clipping
    const maxGain = Math.max(...newBands.map(b => b.gain));
    if (maxGain > 0) {
      handlePreAmpChange(-maxGain);
    } else {
      handlePreAmpChange(0);
    }
  };

  const handlePreAmpChange = (val: number) => {
    setPreAmp(val);
    engineRef.current?.setPreAmp(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    engineRef.current?.setMasterVolume(val);
  };

  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePreview = (type: 'warm' | 'bright', stepIndex?: number, seekTime?: number) => {
    if (!engineRef.current || !audioRef.current) return;
    
    // Auto-play if not playing
    if (audioRef.current.paused) {
      togglePlayback();
    }

    // Smart seek if a segment was found
    if (seekTime !== undefined) {
      audioRef.current.currentTime = seekTime;
    } else if (audioRef.current.currentTime > 120) {
      audioRef.current.currentTime = 30; // Jump to early middle if too far
    }
    
    // Default flat-ish starting point for preview
    let previewGains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    
    switch(stepIndex) {
      case 0: // Bass Depth
        previewGains = type === 'warm' ? [10, 8, 4, 0, 0, 0, 0, 0, 0, 0] : [2, 10, 2, 0, 0, 0, 0, 0, 0, 0];
        break;
      case 1: // Vocal Clarity
        previewGains = type === 'warm' ? [0, 0, 0, 4, 8, 4, 0, 0, 0, 0] : [0, 0, 0, 0, 2, 8, 10, 4, 0, 0];
        break;
      case 2: // Instrument Separation
        previewGains = type === 'warm' ? [2, 2, 2, 2, 2, 2, 2, 2, 2, 2] : [-2, -2, -2, 2, 4, 6, 8, 10, 8, 6];
        break;
      case 3: // Detail
        previewGains = type === 'warm' ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 4, 8, 12, 10];
        break;
      case 4: // Final Balance
        previewGains = type === 'warm' ? [8, 4, 0, -2, -4, -2, 0, 4, 8, 6] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        break;
      default:
        previewGains = type === 'warm' ? [6, 4, 2, 0, 0, 0, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 2, 4, 6, 4];
    }

    previewGains.forEach((gain, i) => {
      engineRef.current?.updateBand(i, gain);
    });
  };

  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const handleTuningComplete = (result: { gains: number[], profileName: string, insights: string[] }) => {
    const newBands = bands.map((band, i) => ({
      ...band,
      gain: result.gains[i]
    }));
    setBands(newBands);
    setIsAICalibrated(true);
    setProfileName(result.profileName);
    setAiInsights(result.insights);
    result.gains.forEach((gain, i) => engineRef.current?.updateBand(i, gain));

    // Auto Pre-Amp Adjustment after AI Calibration
    const maxGain = Math.max(...result.gains);
    if (maxGain > 0) {
      handlePreAmpChange(-maxGain);
    } else {
      handlePreAmpChange(0);
    }

    setShowWizard(false);
  };

  const handleReset = () => {
    setBands(DEFAULT_BANDS);
    DEFAULT_BANDS.forEach((band, i) => engineRef.current?.updateBand(i, 0));
    setIsAICalibrated(false);
    setProfileName(null);
    setPreAmp(0);
  };

  const restoreBands = () => {
    // Restore the physical filters to match the UI State
    bands.forEach((band, i) => {
        engineRef.current?.updateBand(i, band.gain);
    });
    setShowWizard(false);
  };

  const exportLogs = () => {
    const logData = {
      timestamp: new Date().toISOString(),
      bands: bands.map(b => ({ freq: b.frequency, gain: b.gain })),
      masterVolume: volume,
      profile: "Sonic AI Generated"
    };
    
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eq-profile-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      handleTrackChange(url, file.name || 'User Track');
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;
    
    // Simple heuristic for YouTube links to guide user
    if (urlInput.includes('youtube.com') || urlInput.includes('youtu.be')) {
      setErrorHeader("YouTube direct links are restricted. Use a direct MP3/OGG URL or Import local file.");
      return;
    }

    handleTrackChange(urlInput, 'Stream: ' + urlInput.split('/').pop());
    setUrlInput('');
  };

  const handleAudioError = () => {
    setErrorHeader("Audio Source Error: Check your connection or file format.");
    setIsPlaying(false);
  };

  return (
    <main className="min-h-screen bg-[#E6E6E6] p-0 md:p-8 flex items-center justify-center font-sans relative">
      
      {/* Initial Activation Overlay */}
      {!isReady && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0b] p-6">
          <div className="text-center space-y-12 max-w-sm w-full">
             <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="w-24 h-24 bg-gradient-to-tr from-[#F27D26] to-[#FF4444] rounded-[2rem] mx-auto flex items-center justify-center shadow-[0_20px_50px_rgba(242,125,38,0.4)]"
             >
                <Activity className="w-12 h-12 text-white" />
             </motion.div>
             
             <div className="space-y-4">
               <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                 SONIC<span className="text-[#F27D26]">AI</span>
               </h1>
               <p className="text-[#8E9299] text-sm font-medium leading-relaxed">
                 High-fidelity PEQ Engine with Intelligent Calibration.<br/>
                 Tap to initialize the processing core.
               </p>
             </div>
             
             <button 
               onClick={initAudio}
               className="group relative w-full overflow-hidden rounded-2xl bg-white p-5 font-bold uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
             >
               <span className="relative z-10 flex items-center justify-center gap-2">
                 Ignite Engine <ArrowRight className="w-4 h-4" />
               </span>
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
             </button>

             <div className="pt-8 flex justify-center gap-6 opacity-30">
               <Sliders className="w-5 h-5" />
               <Sparkles className="w-5 h-5" />
               <Activity className="w-5 h-5" />
             </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl bg-[#151619] text-white md:rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-white/5 overflow-hidden flex flex-col h-screen md:h-auto">
        
        {/* Header Rail */}
        <div className="border-bottom border-white/10 p-4 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F27D26] flex items-center justify-center">
              <Activity className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-sm font-medium tracking-tight uppercase tracking-widest text-[#8E9299]">
                Sonic AI <span className="text-white">v1.0</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest leading-none">System Status</span>
              <span className="text-[10px] font-mono text-[#F27D26] uppercase tracking-widest">Active • AI Optimal</span>
            </div>
            <button 
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 bg-[#F27D26]/10 hover:bg-[#F27D26]/20 text-[#F27D26] rounded-full text-xs font-mono uppercase tracking-widest border border-[#F27D26]/20 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3 h-3" />
              AI Calibrate
            </button>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 p-4 md:p-10 space-y-6 md:space-y-8 overflow-y-auto">
          
          {/* Top Section: Visualizer and Player */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-8 space-y-4 md:space-y-6">
              <EQCurve bands={bands} />
              <Visualizer analyzer={analyzer} />
              
              <div className="bg-[#1a1c20] p-4 md:p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                    <Music className="w-6 h-6 text-[#8E9299]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <select 
                         value={audioSource} 
                         onChange={(e) => {
                            const track = TRACKS.find(t => t.url === e.target.value);
                            handleTrackChange(e.target.value, track?.name || 'User Track');
                         }}
                         className="bg-transparent text-sm font-medium text-white border-none focus:ring-0 cursor-pointer outline-none max-w-[200px] truncate"
                       >
                         {TRACKS.map(t => (
                           <option key={t.id} value={t.url} className="bg-[#1a1c20]">{t.name}</option>
                         ))}
                         {audioSource !== TRACKS[0].url && audioSource !== TRACKS[1].url && audioSource !== TRACKS[2].url && (
                           <option value={audioSource} className="bg-[#1a1c20]">Custom Track</option>
                         )}
                       </select>
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] text-[#F27D26] font-mono uppercase tracking-widest hover:underline mt-1 block"
                    >
                      + Import your own Music
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="audio/*" 
                      className="hidden" 
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4 md:gap-6 justify-center w-full md:w-auto">
                  <div className="flex items-center gap-4">
                    <button className="text-[#8E9299] hover:text-white transition-colors p-2"><SkipBack className="w-5 h-5 md:w-6 md:h-6" /></button>
                    <button 
                      onClick={togglePlayback}
                      className="w-12 h-12 md:w-14 md:h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 md:w-6 md:h-6" /> : <Play className="w-5 h-5 md:w-6 md:h-6 ml-1" />}
                    </button>
                    <button className="text-[#8E9299] hover:text-white transition-colors p-2"><SkipForward className="w-5 h-5 md:w-6 md:h-6" /></button>
                  </div>
                  
                  <div className="hidden sm:flex items-center gap-3 border-l border-white/10 pl-4 md:pl-6">
                    <Volume2 className="w-4 h-4 text-[#8E9299]" />
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#F27D26]" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="flex-1 bg-[#1a1c20] p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#8E9299] uppercase tracking-widest">Stream Source</span>
                    <Activity className="w-4 h-4 text-[#F27D26]" />
                  </div>
                  
                  <form onSubmit={handleUrlSubmit} className="space-y-2">
                    <div className="relative">
                      <input 
                        type="text" 
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="Paste Audio/Direct Link..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono focus:border-[#F27D26] outline-none transition-all pr-10"
                      />
                      <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-[#F27D26] hover:scale-110 transition-transform">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#8E9299] uppercase tracking-widest">Neural Insights</span>
                      <Sparkles className="w-4 h-4 text-[#F27D26]" />
                    </div>
                    <div className="space-y-3">
                      {aiInsights.length > 0 ? (
                        aiInsights.map((insight, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: idx * 0.2 }}
                            className="bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] text-[#8E9299] italic leading-relaxed"
                          >
                            &quot;{insight}&quot;
                          </motion.div>
                        ))
                      ) : (
                        <p className="text-[10px] text-[#8E9299]/50 italic">Calibrate neural core to unlock track-specific insights.</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={exportLogs}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export EQ Log
                </button>
              </div>
            </div>
          </div>

          {/* EQ Controls Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-xs font-mono text-[#8E9299] uppercase tracking-widest font-bold">10-Band Parametric Equalizer</h3>
                </div>
                {isAICalibrated && (
                   <motion.div 
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="flex items-center gap-2 px-2 py-0.5 bg-[#F27D26]/10 rounded border border-[#F27D26]/30"
                   >
                     <Sparkles className="w-2.5 h-2.5 text-[#F27D26]" />
                     <span className="text-[9px] text-[#F27D26] font-bold uppercase tracking-wider">
                       AI: {profileName || 'Neural Tuning'}
                     </span>
                   </motion.div>
                )}
              </div>
              <div className="flex gap-2">
                 <button 
                   onClick={handleReset}
                   className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-md text-[10px] font-mono uppercase tracking-widest text-[#8E9299] hover:text-white transition-all"
                 >
                   Reset
                 </button>
              </div>
            </div>
            <EQPanel 
              bands={bands} 
              onBandChange={handleBandChange} 
              preAmp={preAmp}
              onPreAmpChange={handlePreAmpChange}
            />
          </div>

        </div>
        
        {/* Footer Info */}
        <div className="p-4 bg-black/40 border-t border-white/10 flex flex-col gap-2">
          {errorHeader && (
            <div className="text-[10px] font-mono text-red-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {errorHeader}
            </div>
          )}
          <div className="flex justify-between items-center text-[10px] font-mono text-[#8E9299] uppercase tracking-widest">
            <div>Engine: WebAudio 2.0 • AI-Model: Gemini 3 Flash</div>
            <div>Project: PEQ Calibration • Last Sync: {lastSync || 'Initializing...'}</div>
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio 
          ref={audioRef} 
          src={audioSource} 
          onEnded={() => setIsPlaying(false)}
          onError={handleAudioError}
          crossOrigin={audioSource.startsWith('blob:') ? undefined : "anonymous"}
        />
        
        {/* Modals */}
        <AnimatePresence>
          {showWizard && (
            <TuningWizard 
              onComplete={handleTuningComplete} 
              onClose={restoreBands}
              onPreview={handlePreview}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
