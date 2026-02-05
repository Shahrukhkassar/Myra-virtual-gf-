
import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { base64ToUint8Array, decodeAudioData, createPCM16Blob } from '../utils/audioUtils';

// Constants
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';
const SAMPLE_RATE_IN = 16000;
const SAMPLE_RATE_OUT = 24000;
const JITTER_BUFFER_MS = 120; // Increased for maximum smoothness

export interface LiveState {
  isConnected: boolean;
  isConnecting: boolean;
  volume: number;
  isUserTalking: boolean;
  error: string | null;
}

interface ConnectConfig {
  systemInstruction?: string;
}

export const useGeminiLive = () => {
  const [state, setState] = useState<LiveState>({
    isConnected: false,
    isConnecting: false,
    volume: 0,
    isUserTalking: false,
    error: null,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null); 
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const rafIdRef = useRef<number | null>(null);

  const initAudio = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: SAMPLE_RATE_OUT,
          latencyHint: 'interactive',
        });
        const analyzer = audioContextRef.current.createAnalyser();
        analyzer.fftSize = 256;
        analyzer.smoothingTimeConstant = 0.5;
        analyzer.connect(audioContextRef.current.destination);
        analyzerRef.current = analyzer;
      }
      
      if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
      }

      if (!inputContextRef.current) {
        inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: SAMPLE_RATE_IN,
        });
      }
    } catch (e) {
      console.error("Audio init failed", e);
    }
  }, []);

  const stopAllActiveSources = useCallback(() => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const updateVolume = useCallback(() => {
    if (analyzerRef.current && state.isConnected) {
      const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
      analyzerRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      const normalizedVolume = Math.min(1, avg / 128);
      setState(prev => ({ ...prev, volume: normalizedVolume }));
    }
    rafIdRef.current = requestAnimationFrame(updateVolume);
  }, [state.isConnected]);

  useEffect(() => {
    if (state.isConnected) {
      updateVolume();
    } else {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      setState(prev => ({ ...prev, volume: 0 }));
    }
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [state.isConnected, updateVolume]);

  const disconnect = useCallback(() => {
    stopAllActiveSources();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setState(prev => ({ 
      ...prev, 
      isConnected: false, 
      isConnecting: false, 
      isUserTalking: false,
      volume: 0 
    }));
    
    if (sessionRef.current) {
      sessionRef.current.then((s: any) => {
          if (s && typeof s.close === 'function') s.close();
      }).catch(() => {});
      sessionRef.current = null;
    }
  }, [stopAllActiveSources]);

  const connect = async (config?: ConnectConfig) => {
    if (state.isConnecting || state.isConnected) return;
    
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    initAudio();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
        } 
      });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
            if (inputContextRef.current && streamRef.current) {
              const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
              sourceRef.current = source;
              const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              const silentGain = inputContextRef.current.createGain();
              silentGain.gain.value = 0;

              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                let sum = 0;
                for(let i=0; i<inputData.length; i++) sum += Math.abs(inputData[i]);
                const isTalking = (sum / inputData.length) > 0.015;
                setState(prev => ({ ...prev, isUserTalking: isTalking }));

                const pcmBlob = createPCM16Blob(inputData);
                sessionPromise.then((session) => {
                  if (session && typeof session.sendRealtimeInput === 'function') {
                    session.sendRealtimeInput({ media: pcmBlob });
                  }
                });
              };

              source.connect(processor);
              processor.connect(silentGain);
              silentGain.connect(inputContextRef.current.destination);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Immediate interruption handling to prevent "double voice"
            if (message.serverContent?.interrupted) {
              stopAllActiveSources();
              return;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current && analyzerRef.current) {
              const ctx = audioContextRef.current;
              const audioBuffer = await decodeAudioData(base64ToUint8Array(base64Audio), ctx, SAMPLE_RATE_OUT);

              const now = ctx.currentTime;
              // Maintain ultra-smooth monotonic scheduling
              if (nextStartTimeRef.current < now) {
                  nextStartTimeRef.current = now + (JITTER_BUFFER_MS / 1000); 
              }

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(analyzerRef.current);
              
              source.onended = () => {
                activeSourcesRef.current.delete(source);
              };

              activeSourcesRef.current.add(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }
          },
          onclose: (e) => {
            console.log('Session closed:', e);
            disconnect();
          },
          onerror: (err) => {
             console.error('Gemini Live Error:', err);
             setState(prev => ({ ...prev, error: "Neural link lost. Checking stability...", isConnected: false, isConnecting: false }));
             disconnect();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: config?.systemInstruction || "You are Myra.",
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } 
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error("Connection failed", err);
      setState(prev => ({ ...prev, isConnecting: false, error: "Network Sync Failure. Ensure API Key and Microphone access are valid." }));
    }
  };

  const sendText = useCallback((text: string) => {
    if (sessionRef.current && text.trim()) {
        sessionRef.current.then((session: any) => {
            if (session && typeof session.sendRealtimeInput === 'function') {
                session.sendRealtimeInput({ text });
            }
        }).catch((e: any) => console.error("Failed to send text", e));
    }
  }, []);

  return { ...state, connect, disconnect, sendText };
};
