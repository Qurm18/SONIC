'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Check, Music } from 'lucide-react';
import { analyzePreferences, TuningPreference } from '@/lib/ai-engine';

interface TuningWizardProps {
  onComplete: (result: { gains: number[], profileName: string, insights: string[] }) => void;
  onClose: () => void;
  onPreview: (scenario: 'warm' | 'bright', stepIndex: number, seekTime?: number) => void;
}

const SCENARIOS = [
  { 
    id: 'bass_depth', 
    title: 'Round 1: The Foundation', 
    description: 'Track: "Idol" style High-Energy Pop. Focus on the kick drum punch.', 
    soundA: 'Thunderous & Deep Bass', 
    soundB: 'Punchy & Responsive Mid-Bass' 
  },
  { 
    id: 'vocal_clarity', 
    title: 'Round 2: The Melody', 
    description: 'Track: Anime OST Piano/Vocal. Focus on the singer\'s intimacy.', 
    soundA: 'Warm & Silky Vocals', 
    soundB: 'Crisp & Airy Presence' 
  },
  {
    id: 'sub_bass',
    title: 'Round 3: Sub-Atomic',
    description: 'Focus on the physical pressure and "rumble" of the lowest octaves.',
    soundA: 'Heavy Floor Vibration',
    soundB: 'Clean & Controlled Lows'
  },
  { 
    id: 'instrument_sep', 
    title: 'Round 4: The Arrangement', 
    description: 'Track: Math Rock / J-Jazz. Focus on guitar layering.', 
    soundA: 'Wide Soundstage (Open)', 
    soundB: 'Tight & Focused (Direct)' 
  },
  {
    id: 'mid_punch',
    title: 'Round 5: Heart of the Drum',
    description: 'Focus on the "thump" of the snare and low guitar strings.',
    soundA: 'Rich & Chest-Hitting',
    soundB: 'Lean & Athletic Punch'
  },
  { 
    id: 'high_frequency', 
    title: 'Round 6: The Detail', 
    description: 'Track: Electronic / Synth-pop. Focus on the high-end sparkle.', 
    soundA: 'Smooth & Natural Roll-off', 
    soundB: 'Ultra-HD Brilliant Sparkle' 
  },
  {
    id: 'presence',
    title: 'Round 7: Leading Edge',
    description: 'Focus on the "bite" of lead instruments and vocal definition.',
    soundA: 'Soft & Forgiving',
    soundB: 'Defined & Forward'
  },
  {
    id: 'warmth_body',
    title: 'Round 8: Harmonic Body',
    description: 'Focus on the fullness and "thickness" of the overall sound.',
    soundA: 'Thick & Soulful',
    soundB: 'Transparent & Neutral'
  },
  {
    id: 'sibilance',
    title: 'Round 9: Sibilance Control',
    description: 'Focus on "S" and "T" sounds and high-hat sharpness.',
    soundA: 'Compressed & Safe',
    soundB: 'Extended & Detailed'
  },
  { 
    id: 'overall_balance', 
    title: 'Final Round: The Master Mix', 
    description: 'Full Rock Anthem. Is it balanced correctly?', 
    soundA: 'V-Shaped (Fun & Aggressive)', 
    soundB: 'Flat/Reference (Purest Form)' 
  },
];

export const TuningWizard: React.FC<TuningWizardProps> = ({ onComplete, onClose, onPreview }) => {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<TuningPreference[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activePreview, setActivePreview] = useState<'A' | 'B' | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [segments, setSegments] = useState<Record<string, number>>({});
  const [isSceneAnalyzing, setIsSceneAnalyzing] = useState(true);

  const ANALYSIS_MESSAGES = [
    "Scanning audio frequency spectrum...",
    "Locating transient peaks...",
    "Mapping harmonic saturation...",
    "Extracting scene metadata...",
    "Finalizing neural calibration segments..."
  ];

  React.useEffect(() => {
    const initAnalysis = async () => {
      // Small delay to let the wizard appear
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Perform initial track scan if possible
      // This is passed via props or context in real apps, here we trigger it
      const result = await (window as any).__ENGINE__?.findCalibrationSegments((window as any).__AUDIO_SRC__);
      if (result) setSegments(result);

      for (let i = 0; i < ANALYSIS_MESSAGES.length; i++) {
        setAnalysisStep(i);
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      setIsSceneAnalyzing(false);
    };
    initAnalysis();
  }, [ANALYSIS_MESSAGES.length, onPreview, segments]);

  const handleChoice = (choice: 'A' | 'B') => {
    const newPrefs = [...preferences, { choice, scenario: SCENARIOS[step].id }];
    setActivePreview(null);
    if (step < SCENARIOS.length - 1) {
      setPreferences(newPrefs);
      const nextStep = step + 1;
      setStep(nextStep);
      // Automatically jump to the next relevant segment if music is playing
      const nextScenarioId = SCENARIOS[nextStep].id;
      if (segments[nextScenarioId]) {
        onPreview('warm', nextStep, segments[nextScenarioId]);
      }
    } else {
      processResult(newPrefs);
    }
  };

  const togglePreview = (type: 'A' | 'B') => {
    setActivePreview(type);
    onPreview(type === 'A' ? 'warm' : 'bright', step, segments[SCENARIOS[step].id]);
  };

  const processResult = async (finalPrefs: TuningPreference[]) => {
    setIsAnalyzing(true);
    setAnalysisStep(0);
    
    // Simulate final AI optimization steps
    for (let i = 0; i < 5; i++) {
      setAnalysisStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    const result = await analyzePreferences(finalPrefs);
    onComplete(result);
    setIsAnalyzing(false);
  };

  const restartSegment = () => {
    onPreview(activePreview === 'B' ? 'bright' : 'warm', step, segments[SCENARIOS[step].id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-[#151619] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
      >
        <div className="p-6 md:p-10">
                <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F27D26] to-[#FF4444] flex items-center justify-center shadow-lg shadow-[#F27D26]/20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-5 h-5 text-white" />
                </motion.div>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase">Neural Calibration</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-[#F27D26] animate-pulse" />
                  <span className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest">A.I. Engine v2.0 Online</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-mono text-[#8E9299] uppercase tracking-widest mb-1">Confidence</span>
              <div className="text-xl font-black text-white">{Math.round(((step + 1) / SCENARIOS.length) * 100)}%</div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isSceneAnalyzing ? (
              <motion.div 
                key="scene-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 gap-8"
              >
                <div className="flex gap-1 items-end h-12">
                   {[...Array(8)].map((_, i) => (
                     <motion.div
                       key={i}
                       animate={{ height: [10, 40, 20, 35, 15] }}
                       transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                       className="w-1.5 bg-[#F27D26] rounded-full"
                     />
                   ))}
                </div>
                <div className="text-center space-y-2">
                  <p className="text-white font-bold uppercase tracking-widest">{ANALYSIS_MESSAGES[analysisStep]}</p>
                  <p className="text-[#8E9299] text-[10px] font-mono lowercase">A.I. is analyzing your custom track to find optimal testing segments...</p>
                </div>
              </motion.div>
            ) : isAnalyzing ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 gap-6"
              >
                <div className="relative">
                   <div className="w-16 h-16 border-4 border-[#F27D26]/20 rounded-full" />
                   <div className="absolute inset-0 w-16 h-16 border-4 border-[#F27D26] border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-white font-bold uppercase tracking-widest">{ANALYSIS_MESSAGES[analysisStep]}</p>
                  <p className="text-[#8E9299] text-xs font-mono lowercase">Step {analysisStep + 1} of {ANALYSIS_MESSAGES.length} - Neural Compute Core</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="quiz"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-8"
              >
                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Music className="w-5 h-5 text-[#8E9299]" />
                      <div>
                        <span className="block text-[8px] font-mono text-[#8E9299] uppercase tracking-widest">Sourcing Audio</span>
                        <span className="text-sm font-medium text-white truncate max-w-[200px] block">Active Calibration Stream</span>
                      </div>
                   </div>
                   <button 
                     onClick={restartSegment}
                     className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-mono text-white transition-all"
                   >
                     REPLAY BRANCH
                   </button>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-white text-2xl font-black italic uppercase tracking-tighter">{SCENARIOS[step].title}</h3>
                  <p className="text-[#8E9299] text-sm font-medium leading-relaxed max-w-sm mx-auto">{SCENARIOS[step].description}</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <button
                        onClick={() => togglePreview('A')}
                        className={`group relative w-full h-32 rounded-3xl border-2 transition-all overflow-hidden flex items-center justify-center ${
                          activePreview === 'A' 
                            ? 'bg-[#F27D26]/20 border-[#F27D26] shadow-[0_15px_30px_rgba(242,125,38,0.2)]' 
                            : 'bg-[#1a1c20] border-white/5 hover:border-white/10'
                        }`}
                      >
                         <div className="text-center relative z-10">
                           <span className={`block text-[10px] font-mono uppercase tracking-widest mb-2 transition-colors ${activePreview === 'A' ? 'text-[#F27D26]' : 'text-[#8E9299]'}`}>Branch Alpha</span>
                           <span className="text-lg font-black text-white italic">SAMPLE A</span>
                         </div>
                         {activePreview === 'A' && (
                           <motion.div 
                             layoutId="glow"
                             className="absolute inset-0 bg-gradient-to-tr from-[#F27D26]/20 to-transparent"
                           />
                         )}
                      </button>
                      <button
                        onClick={() => handleChoice('A')}
                        disabled={!activePreview}
                        className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all shadow-xl shadow-black/20 ${
                          !activePreview ? 'opacity-30 cursor-not-allowed bg-white/5 text-white' : 'bg-[#F27D26] text-black hover:scale-[1.02] active:scale-95'
                        }`}
                      >
                        Commit A
                      </button>
                    </div>

                    <div className="space-y-4">
                      <button
                        onClick={() => togglePreview('B')}
                        className={`group relative w-full h-32 rounded-3xl border-2 transition-all overflow-hidden flex items-center justify-center ${
                          activePreview === 'B' 
                            ? 'bg-white/10 border-white shadow-[0_15px_30px_rgba(255,255,255,0.1)]' 
                            : 'bg-[#1a1c20] border-white/5 hover:border-white/10'
                        }`}
                      >
                         <div className="text-center relative z-10">
                           <span className={`block text-[10px] font-mono uppercase tracking-widest mb-2 transition-colors ${activePreview === 'B' ? 'text-white' : 'text-[#8E9299]'}`}>Branch Beta</span>
                           <span className="text-lg font-black text-white italic">SAMPLE B</span>
                         </div>
                         {activePreview === 'B' && (
                           <motion.div 
                             layoutId="glow"
                             className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"
                           />
                         )}
                      </button>
                      <button
                        onClick={() => handleChoice('B')}
                        disabled={!activePreview}
                        className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all shadow-xl shadow-black/20 ${
                          !activePreview ? 'opacity-30 cursor-not-allowed bg-white/5 text-white' : 'bg-white text-black hover:scale-[1.02] active:scale-95'
                        }`}
                      >
                        Commit B
                      </button>
                    </div>
                  </div>
                  
                  <div className="px-6 py-3 bg-black/40 rounded-xl border border-white/5 text-center">
                    <p className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest">
                       Listen carefully to the <span className="text-white">harmonics</span>. Switch between Sample A and B in real-time.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-1.5">
                    {SCENARIOS.map((_, i) => (
                      <div key={i} className={`h-1 w-6 rounded-full transition-all duration-500 ${i < step ? 'bg-[#F27D26]' : i === step ? 'bg-white w-10' : 'bg-white/10'}`} />
                    ))}
                  </div>
                  <button 
                    onClick={onClose}
                    className="group flex items-center gap-2 text-[#8E9299] text-[10px] uppercase font-bold tracking-widest hover:text-white transition-colors"
                  >
                    Abort Calibration <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
