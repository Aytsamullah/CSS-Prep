import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Phone, Loader2, Volume2, AlertCircle, Signal, Award, ThumbsUp, TrendingUp, FileText } from 'lucide-react';
import { InterviewFeedback, InterviewMessage } from '../types';
import { getInterviewFeedback } from '../services/geminiService';

// --- Audio Utilities (PCM Encoding/Decoding) ---

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Float32 (Web Audio API) to Int16 (Gemini API requirements)
function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

const MockInterview: React.FC = () => {
  const [mode, setMode] = useState<'setup' | 'call' | 'analyzing' | 'report'>('setup');
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [topic, setTopic] = useState('Introduction & General');
  const [audioLevel, setAudioLevel] = useState(0); // For visualizer
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);

  // Refs for Audio Contexts and Connection
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback queue management
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  
  // WebSocket connection to server
  const wsRef = useRef<WebSocket | null>(null);

  // Transcription & History
  const transcriptRef = useRef<InterviewMessage[]>([]);
  const currentInputTransRef = useRef<string>("");
  const currentOutputTransRef = useRef<string>("");

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (mode === 'call') {
        endCall();
      }
    };
  }, []);

  // --- Audio Setup & Streaming ---

  const startCall = async () => {
    setMode('call');
    transcriptRef.current = []; // Reset transcript
    currentInputTransRef.current = "";
    currentOutputTransRef.current = "";

    try {
      // 1. Setup Audio Contexts
      // Input: 16kHz for Gemini
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // Output: 24kHz for Gemini
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // 2. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Connect to Server-Side Gemini Live WebSocket Bridge
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live?topic=${encodeURIComponent(topic)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Server Live Bridge Connected");
        setIsConnected(true);
        setupAudioInput();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleServerMessage(message);
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        console.log("Server Live Bridge Closed");
        setIsConnected(false);
      };

      ws.onerror = (err) => {
        console.error("Server Live Bridge Error", err);
        setIsConnected(false);
      };

    } catch (err) {
      console.error("Failed to start call", err);
      setMode('setup');
    }
  };

  const setupAudioInput = () => {
    if (!inputContextRef.current || !streamRef.current || !wsRef.current) return;

    const ctx = inputContextRef.current;
    const source = ctx.createMediaStreamSource(streamRef.current);
    sourceNodeRef.current = source;

    // Use ScriptProcessor for raw PCM access
    const bufferSize = 4096;
    const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (isMuted) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Visualizer logic (simple RMS)
      let sum = 0;
      for (let i = 0; i < inputData.length; i += 10) sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / (inputData.length / 10));
      setAudioLevel(Math.min(1, rms * 5)); // Amplify for visibility

      // Convert to 16-bit PCM
      const pcm16 = floatTo16BitPCM(inputData);
      
      // Base64 Encode
      const base64Data = arrayBufferToBase64(pcm16.buffer);

      // Send to server WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ audio: base64Data }));
      }
    };

    source.connect(processor);
    processor.connect(ctx.destination);
  };

  const handleServerMessage = (message: any) => {
    // 1. Connection confirmation
    if (message.type === 'connected') {
      setIsConnected(true);
    }

    // 2. Handle Audio Output (24kHz PCM)
    if (message.audio && outputContextRef.current) {
      playAudioChunk(message.audio);
    }

    // 3. Handle Transcription
    if (message.outputTranscription) {
      currentOutputTransRef.current += message.outputTranscription;
    }
    if (message.inputTranscription) {
      currentInputTransRef.current += message.inputTranscription;
    }

    // 4. Commit Turns to History
    if (message.turnComplete) {
      const userText = currentInputTransRef.current.trim();
      const aiText = currentOutputTransRef.current.trim();

      if (userText) {
        transcriptRef.current.push({ role: 'user', text: userText, timestamp: Date.now() });
        currentInputTransRef.current = "";
      }
      if (aiText) {
        transcriptRef.current.push({ role: 'ai', text: aiText, timestamp: Date.now() });
        currentOutputTransRef.current = "";
      }
    }

    // 5. Handle Interruptions
    if (message.interrupted) {
      clearAudioQueue();
      currentOutputTransRef.current = "";
    }
  };

  const playAudioChunk = async (base64Audio: string) => {
    if (!outputContextRef.current) return;
    const ctx = outputContextRef.current;

    const audioBytes = base64ToUint8Array(base64Audio);
    
    const audioData = new Int16Array(audioBytes.buffer);
    const float32Data = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      float32Data[i] = audioData[i] / 32768.0;
    }

    const buffer = ctx.createBuffer(1, float32Data.length, 24000);
    buffer.copyToChannel(float32Data, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    if (nextStartTimeRef.current < currentTime) {
      nextStartTimeRef.current = currentTime;
    }

    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;
    
    scheduledSourcesRef.current.push(source);
    
    source.onended = () => {
      const index = scheduledSourcesRef.current.indexOf(source);
      if (index > -1) scheduledSourcesRef.current.splice(index, 1);
    };
  };

  const clearAudioQueue = () => {
    scheduledSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    scheduledSourcesRef.current = [];
    nextStartTimeRef.current = outputContextRef.current?.currentTime || 0;
  };

  const endCall = async () => {
    // 1. Clean Audio & WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // ignore
      }
      wsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    try {
      processorRef.current?.disconnect();
      sourceNodeRef.current?.disconnect();
    } catch (e) {
      console.warn("Error disconnecting nodes", e);
    }
    processorRef.current = null;
    sourceNodeRef.current = null;
    
    const closeContext = async (ctx: AudioContext | null) => {
      if (ctx && ctx.state !== 'closed') {
        try { await ctx.close(); } catch (e) {}
      }
    };
    await closeContext(inputContextRef.current);
    await closeContext(outputContextRef.current);
    inputContextRef.current = null;
    outputContextRef.current = null;

    setIsConnected(false);
    setAudioLevel(0);

    // 2. Generate Report
    setMode('analyzing');
    
    // Commit any remaining text in buffers
    if (currentInputTransRef.current.trim()) {
      transcriptRef.current.push({ role: 'user', text: currentInputTransRef.current.trim(), timestamp: Date.now() });
    }
    if (currentOutputTransRef.current.trim()) {
      transcriptRef.current.push({ role: 'ai', text: currentOutputTransRef.current.trim(), timestamp: Date.now() });
    }

    try {
      const result = await getInterviewFeedback(transcriptRef.current);
      setFeedback(result);
      setMode('report');
    } catch (error) {
      console.error("Failed to generate feedback", error);
      setMode('report');
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // --- RENDER ---

  if (mode === 'setup') {
    return (
      <div className="max-w-xl mx-auto animate-fade-in pt-10">
        <div className="text-center mb-8">
          <div className="inline-block p-5 bg-green-100 rounded-full text-green-700 mb-6 shadow-sm">
             <Phone size={48} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">CSS Mock Interview Call</h1>
          <p className="text-gray-500 text-lg">
            Connect with an AI interviewer for a real-time voice conversation.
            It's just like a phone call.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl space-y-8">
           <div>
             <label className="block text-sm font-bold text-gray-700 mb-3">Choose Topic</label>
             <select 
               value={topic}
               onChange={(e) => setTopic(e.target.value)}
               className="w-full p-4 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-lg"
             >
               <option>Introduction & General</option>
               <option>Current Affairs (Pakistan)</option>
               <option>International Relations</option>
               <option>Pakistan Affairs (History)</option>
               <option>Islamic Studies</option>
             </select>
           </div>

           <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 text-sm text-blue-800 leading-relaxed">
             <AlertCircle size={20} className="shrink-0 mt-0.5" />
             <p>Headphones recommended. The AI will speak naturally. You can interrupt at any time.</p>
           </div>

           <button 
             onClick={startCall}
             className="w-full py-5 bg-green-600 text-white rounded-2xl font-bold text-xl hover:bg-green-700 shadow-lg shadow-green-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
           >
             <Phone size={24} /> Start Call
           </button>
        </div>
      </div>
    );
  }

  if (mode === 'call') {
    return (
      <div className="max-w-md mx-auto h-[calc(100vh-140px)] flex flex-col justify-between py-6">
        {/* Header */}
        <div className="text-center">
           <h2 className="text-lg font-semibold text-gray-900 flex items-center justify-center gap-2">
             <Signal size={18} className={isConnected ? "text-green-600" : "text-gray-400"} />
             {isConnected ? "Connected" : "Connecting..."}
           </h2>
           <p className="text-sm text-gray-500">{topic}</p>
        </div>

        {/* Visualizer / Avatar */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
           <div 
             className="absolute w-64 h-64 bg-green-500 rounded-full opacity-20 transition-transform duration-100 ease-linear blur-3xl"
             style={{ transform: `scale(${1 + audioLevel * 3})` }}
           />
           <div 
             className="absolute w-48 h-48 bg-green-500 rounded-full opacity-30 transition-transform duration-100 ease-linear blur-2xl"
             style={{ transform: `scale(${1 + audioLevel * 1.5})` }}
           />
           
           <div className="relative z-10 w-40 h-40 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-gray-50">
             {isConnected ? (
                <div className="text-green-600">
                  <Volume2 size={64} strokeWidth={1.5} />
                </div>
             ) : (
                <Loader2 size={48} className="text-gray-300 animate-spin" />
             )}
           </div>

           <div className="mt-8 text-center h-8">
             {isConnected && (
               <span className="text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full text-sm animate-pulse">
                 Live Voice
               </span>
             )}
           </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
          <div className="grid grid-cols-3 gap-6 items-center">
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={toggleMute}
                className={`p-4 rounded-full transition-colors cursor-pointer ${isMuted ? 'bg-white text-gray-900 border-2 border-gray-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <span className="text-xs font-medium text-gray-500">Mute</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={endCall}
                className="p-6 bg-red-500 text-white rounded-full shadow-lg shadow-red-500/40 hover:bg-red-600 transition-transform active:scale-95 cursor-pointer"
              >
                <PhoneOff size={32} />
              </button>
              <span className="text-xs font-medium text-gray-500">End</span>
            </div>

             <div className="flex flex-col items-center gap-2 opacity-50">
              <button className="p-4 bg-gray-100 text-gray-600 rounded-full cursor-not-allowed">
                <Volume2 size={24} />
              </button>
              <span className="text-xs font-medium text-gray-500">Speaker</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'analyzing') {
    return (
      <div className="max-w-md mx-auto text-center pt-20 flex flex-col items-center">
        <Loader2 size={64} className="text-green-600 animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Interview...</h2>
        <p className="text-gray-500">
          The AI is reviewing your answers for confidence, clarity, and subject knowledge.
        </p>
      </div>
    );
  }

  // --- RENDER: REPORT ---
  return (
    <div className="max-w-2xl mx-auto animate-fade-in pt-6 pb-20">
      <div className="text-center mb-8">
        <div className="inline-block p-4 bg-green-100 rounded-full text-green-700 mb-4 shadow-sm">
           <Award size={40} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Performance Report</h2>
        <p className="text-gray-500">Feedback on your session: {topic}</p>
      </div>
      
      {feedback ? (
        <div className="space-y-6">
          {/* Score Card */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
             <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Overall Score</p>
             <div className="text-6xl font-bold text-green-700 mb-2">{feedback.score}</div>
             <p className="text-green-600 font-medium">/ 100</p>
          </div>

          {/* Feedback Summary */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={20} className="text-gray-400" /> Summary
            </h3>
            <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
              {feedback.overallFeedback}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
               <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                 <ThumbsUp size={20} className="text-green-600" /> Strengths
               </h3>
               <ul className="space-y-3">
                 {feedback.strengths.map((str, i) => (
                   <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                     <div className="min-w-[6px] h-[6px] rounded-full bg-green-500 mt-1.5" />
                     {str}
                   </li>
                 ))}
               </ul>
            </div>

            {/* Improvements */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
               <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                 <TrendingUp size={20} className="text-orange-500" /> Improvements
               </h3>
               <ul className="space-y-3">
                 {feedback.improvements.map((imp, i) => (
                   <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                     <div className="min-w-[6px] h-[6px] rounded-full bg-orange-400 mt-1.5" />
                     {imp}
                   </li>
                 ))}
               </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-10 bg-red-50 text-red-700 rounded-2xl border border-red-200">
          <AlertCircle size={32} className="mx-auto mb-4" />
          <p className="font-bold">Analysis Failed</p>
          <p className="text-sm">We couldn't generate a report for this session. Please try again.</p>
        </div>
      )}

      <div className="mt-8 text-center">
        <button 
          onClick={() => setMode('setup')}
          className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Start New Call
        </button>
      </div>
    </div>
  );
};

export default MockInterview;
