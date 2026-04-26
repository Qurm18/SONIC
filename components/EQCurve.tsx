'use client';

import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';
import { EQBand } from '@/lib/audio-engine';

interface EQCurveProps {
  bands: EQBand[];
}

export const EQCurve: React.FC<EQCurveProps> = ({ bands }) => {
  // Generate curve data points
  const data = useMemo(() => {
    const points = [];
    // We want a logarithmic look, but simplified for display
    // Generate 50 points from 20Hz to 20kHz
    for (let i = 0; i <= 60; i++) {
        // Log frequency mapping
        const freq = 20 * Math.pow(1000, i / 60);
        
        // Calculate influence of each band (very simplified approximation)
        let totalGain = 0;
        bands.forEach(band => {
            // Distance in octaves
            const dist = Math.abs(Math.log2(freq / band.frequency));
            // Basic bell curve influence based on Q - Adjusted for more realistic overlap
            const influence = Math.exp(-Math.pow(dist / (1.2 / band.q), 2));
            totalGain += band.gain * influence;
        });

        points.push({
            freq: Math.round(freq),
            gain: parseFloat(totalGain.toFixed(2))
        });
    }
    return points;
  }, [bands]);

  return (
    <div className="w-full h-32 md:h-48 bg-[#0a0a0b] rounded-2xl border border-white/10 p-4 overflow-hidden relative group">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F27D26" stopOpacity={0.8} />
              <stop offset="50%" stopColor="#F27D26" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#F27D26" stopOpacity={0} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <XAxis 
            dataKey="freq" 
            hide 
            type="number" 
            domain={[20, 20000]} 
            scale="log" 
          />
          <YAxis 
            domain={[-15, 15]} 
            hide 
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.05)" />
          <Area 
            type="monotone" 
            dataKey="gain" 
            stroke="#F27D26" 
            strokeWidth={4} 
            fill="url(#eqGradient)" 
            isAnimationActive={false}
            style={{ filter: 'url(#glow)' }}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-[#1a1c20] border border-white/10 p-2 rounded-lg shadow-xl">
                    <p className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest">{payload[0].payload.freq} Hz</p>
                    <p className="text-sm font-bold text-white">{payload[0].value} dB</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="absolute top-4 left-6 pointer-events-none">
         <span className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest bg-black/40 px-2 py-1 rounded">Freq Response (Approximation)</span>
      </div>
    </div>
  );
};
