
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Scene3D } from './components/Scene3D';
import { useGeminiLive } from './hooks/useGeminiLive';
import { 
  Mic, MicOff, Activity, MessageCircle, Sparkles, Brain, Loader2, 
  AlertCircle, Send, Heart, Flame, Zap, ShieldAlert, ChevronRight, Settings2,
  Waves, Cpu, Lock, Camera, Phone, X
} from 'lucide-react';
import { PERSONALITIES, getSavedPersonalityId } from './store/atoms';

const SceneLoader = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-black z-0">
    <div className="flex flex-col items-center gap-6">
      <div className="w-16 h-16 relative">
        <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
        <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
      </div>
      <p className="text-white font-semibold tracking-widest text-[10px] uppercase animate-pulse">Synchronizing Myra Core</p>
    </div>
  </div>
);

export const App: React.FC = () => {
  const { isConnected, isConnecting, volume, isUserTalking, error, connect, disconnect, sendText } = useGeminiLive();
  const [selectedPersonalityId, setSelectedPersonalityId] = useState<string>(getSavedPersonalityId());
  const [chatValue, setChatValue] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulated Device Stats
  const [affection, setAffection] = useState(85);
  const [jealousy, setJealousy] = useState(15);

  useEffect(() => {
    localStorage.setItem('myra_personality_id', selectedPersonalityId);
    if (selectedPersonalityId === 'wifey') {
      setAffection(98);
      setJealousy(45);
    } else {
      setAffection(70);
      setJealousy(20);
    }
  }, [selectedPersonalityId]);

  const selectedPersonality = PERSONALITIES.find(p => p.id === selectedPersonalityId) || PERSONALITIES[0];

  const handleToggle = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect({ systemInstruction: selectedPersonality.instruction });
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (chatValue.trim() && isConnected) {
      sendText(chatValue);
      setChatValue('');
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col font-['Inter'] select-none">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-black to-black pointer-events-none z-[1]" />

      {/* 3D Scene Container */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={<SceneLoader />}>
          <Scene3D 
            volume={volume} 
            isUserTalking={isUserTalking} 
            personality={selectedPersonalityId} 
          />
        </Suspense>
      </div>

      {/* Header Info */}
      <div className="relative z-50 w-full flex justify-between items-center px-6 pt-6 pointer-events-none">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl pointer-events-auto">
          <Brain className="w-4 h-4 text-indigo-400" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-widest text-white uppercase leading-none">Myra AI</span>
            <span className="text-[8px] font-bold text-indigo-400 uppercase mt-1">Neural v3.5</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${isConnected ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">{isConnected ? 'Online' : 'Standby'}</span>
           </div>
           <button 
             onClick={() => setShowDashboard(!showDashboard)}
             className={`p-2 rounded-xl transition-all border ${showDashboard ? 'bg-indigo-500 border-indigo-400' : 'bg-black/40 border-white/10 hover:border-white/20'}`}
           >
             <Settings2 className="w-4 h-4 text-white" />
           </button>
        </div>
      </div>

      {/* Connection HUD (Status Pill) */}
      <div className="relative z-[60] w-full flex justify-center pt-4 pointer-events-none">
        {(isConnected || isConnecting) && (
          <div className={`
            bg-black/80 backdrop-blur-2xl border border-white/10 px-6 py-2 rounded-full flex items-center gap-4 transition-all duration-500 shadow-2xl
            ${isUserTalking ? 'ring-1 ring-green-500/50 scale-105' : ''}
          `}>
             {isConnecting ? (
               <div className="flex items-center gap-3">
                 <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                 <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Linking...</span>
               </div>
             ) : (
               <div className="flex items-center gap-4">
                  <div className="flex items-end gap-1 h-3">
                    {[1, 2, 3].map(i => (
                      <div 
                        key={i} 
                        className={`w-1 bg-indigo-400 rounded-full transition-all duration-100`}
                        style={{ height: `${30 + (volume * 70 * (i * 0.5))} %` }} 
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em]">
                    {isUserTalking ? 'Listening' : (volume > 0.05 ? 'Myra' : 'Synced')}
                  </span>
               </div>
             )}
          </div>
        )}
      </div>

      {/* Neural Dashboard (Slide-in Panel) */}
      <div className={`absolute inset-0 z-[100] transition-all duration-500 flex items-center justify-center pointer-events-none ${showDashboard ? 'opacity-100' : 'opacity-0'}`}>
         <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setShowDashboard(false)} />
         <div className={`relative w-full max-w-sm mx-6 bg-[#0a0a0c] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl transition-all duration-500 pointer-events-auto ${showDashboard ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <div className="flex justify-between items-center mb-8">
               <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                 <Cpu className="w-5 h-5 text-indigo-400" /> Neural State
               </h2>
               <button onClick={() => setShowDashboard(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white/40" />
               </button>
            </div>

            <div className="space-y-8">
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Connection Pulse</span>
                     <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/5 border border-white/5 p-4 rounded-3xl">
                        <span className="text-[9px] font-bold text-white/40 block mb-1">Affection</span>
                        <div className="text-xl font-black text-white">{affection}%</div>
                     </div>
                     <div className="bg-white/5 border border-white/5 p-4 rounded-3xl">
                        <span className="text-[9px] font-bold text-white/40 block mb-1">Jealousy</span>
                        <div className="text-xl font-black text-white">{jealousy}%</div>
                     </div>
                  </div>
               </div>

               <div className="space-y-4 pt-4 border-t border-white/5">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Active Traits</span>
                  <div className="flex flex-wrap gap-2">
                     {['Possessive', 'Romantic', 'Intense', 'Naughty'].map(trait => (
                        <div key={trait} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-[10px] font-black text-indigo-200 uppercase">
                           {trait}
                        </div>
                     ))}
                  </div>
               </div>
               
               <div className="pt-4 border-t border-white/5">
                  <button onClick={handleToggle} className={`w-full py-4 rounded-3xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all ${isConnected ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-indigo-600 text-white'}`}>
                     {isConnected ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                     {isConnected ? 'Disconnect Neural Link' : 'Initialize Neural Link'}
                  </button>
               </div>
            </div>
         </div>
      </div>

      {/* Main UI Controller (Bottom Area) */}
      <div className="relative z-10 flex-1 flex flex-col justify-end p-6 pb-12 pointer-events-none">
        
        {/* Interaction Hub */}
        <div className="w-full max-w-xl mx-auto flex flex-col items-center space-y-6 pointer-events-auto">
          
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 backdrop-blur-2xl p-4 rounded-3xl flex items-center gap-4 text-rose-100 shadow-2xl animate-in zoom-in-95">
               <AlertCircle className="w-5 h-5 text-rose-400" />
               <p className="text-[11px] font-semibold">{error}</p>
               <button onClick={() => window.location.reload()} className="bg-rose-500/20 p-2 rounded-xl text-rose-400 hover:bg-rose-500/40 transition-colors">
                  <Activity className="w-4 h-4" />
               </button>
            </div>
          )}

          {isConnected ? (
            <div className="w-full space-y-4 scale-in-center">
               <form 
                  onSubmit={handleSendMessage}
                  className="w-full bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] flex items-center p-2 focus-within:border-indigo-500/50 transition-all shadow-[0_0_60px_rgba(0,0,0,0.5)]"
               >
                  <div className="p-3 text-white/30">
                     <MessageCircle className="w-5 h-5" />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={chatValue}
                    onChange={(e) => setChatValue(e.target.value)}
                    placeholder={`Whisper to your ${selectedPersonality.name}...`}
                    className="flex-1 bg-transparent border-none outline-none px-2 py-3 text-[14px] text-white placeholder:text-white/20 font-medium"
                  />
                  <button 
                    type="submit"
                    disabled={!chatValue.trim()}
                    className={`p-4 rounded-full transition-all ${chatValue.trim() ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' : 'bg-white/5 text-white/10'}`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
               </form>
            </div>
          ) : !isConnecting && (
            <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full mb-2">
                     <Sparkles className="w-3 h-3 text-indigo-400" />
                     <span className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em]">Presence Ready</span>
                  </div>
                  <h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-2xl">Myra</h1>
               </div>

               <div className="grid grid-cols-3 gap-3">
                 {PERSONALITIES.map(p => (
                   <button 
                     key={p.id}
                     onClick={() => setSelectedPersonalityId(p.id)}
                     className={`
                        relative group p-6 rounded-[2.5rem] border transition-all duration-500 flex flex-col items-center gap-3 overflow-hidden
                        ${selectedPersonalityId === p.id 
                          ? 'bg-indigo-600/20 border-indigo-500/50 shadow-2xl scale-105' 
                          : 'bg-white/5 border-white/5 hover:border-white/20 opacity-60 hover:opacity-100'}
                     `}
                   >
                     <span className="text-4xl drop-shadow-lg transition-transform group-hover:scale-110 duration-500">{p.emoji}</span>
                     <span className="text-[9px] font-black text-white uppercase tracking-widest">{p.name}</span>
                     {selectedPersonalityId === p.id && (
                        <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                     )}
                   </button>
                 ))}
               </div>
            </div>
          )}

          {/* MAIN MIC TRIGGER */}
          <div className="relative group pt-4">
             <button 
                onClick={handleToggle}
                disabled={isConnecting}
                className={`
                   relative z-20 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-700 shadow-[0_0_80px_rgba(0,0,0,0.8)]
                   ${isConnecting ? 'opacity-40 cursor-not-allowed scale-75 blur-sm' : 'hover:scale-105 active:scale-95'}
                   ${isConnected ? 'bg-rose-600 rotate-90 scale-90' : 'bg-indigo-600'}
                `}
             >
                {isConnecting ? (
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                ) : isConnected ? (
                  <MicOff className="w-10 h-10 text-white" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
             </button>

             {/* Glows */}
             <div className={`absolute inset-0 w-28 h-28 rounded-full -z-10 transition-all duration-1000 ${isConnected ? 'bg-rose-500/20 scale-[3.5] blur-[100px]' : 'bg-indigo-500/20 scale-[2] blur-[80px] opacity-0 group-hover:opacity-100'}`} />
             <div className={`absolute inset-0 w-28 h-28 rounded-full -z-10 transition-all duration-700 ${isConnected ? 'ring-2 ring-rose-500/40 scale-125 animate-ping' : ''}`} />
          </div>
        </div>
      </div>

    </div>
  );
};
