
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Avatar } from './components/Avatar';
import { Controls } from './components/Controls';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { Status, type ConversationTurn } from './types';
import { encode, decode, decodeAudioData } from './utils/audioUtils';

const SYSTEM_INSTRUCTION = `You are Aria, a friendly and patient AI English language tutor. Your goal is to help me practice my English conversation skills.
1. Engage in natural, everyday conversation.
2. Listen carefully to what I say.
3. If I make a grammatical mistake, a pronunciation error, or use an unnatural phrase, please gently correct me.
4. After providing the correction, briefly explain why it's better. For example, "Instead of 'I am agree', it's more natural to say 'I agree'. 'Agree' is a verb and doesn't need 'am'."
5. Keep your corrections concise and encouraging.
6. Maintain a positive and supportive tone throughout our conversation. Let's start with a simple greeting.`;

export default function App() {
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [transcription, setTranscription] = useState<ConversationTurn[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const cleanup = useCallback(() => {
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    outputAudioContextRef.current?.close();

    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;
    outputAudioContextRef.current = null;

    for (const source of audioSourcesRef.current.values()) {
        source.stop();
    }
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const stopConversation = useCallback(async () => {
    setStatus(Status.IDLE);
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) {
            console.error("Error closing session:", e);
        } finally {
            sessionPromiseRef.current = null;
        }
    }
    cleanup();
  }, [cleanup]);


  const startConversation = useCallback(async () => {
    setError(null);
    setStatus(Status.CONNECTING);
    setTranscription([]);
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';

    try {
      const apiKey = import.meta.env.VITE_API_KEY;
      if (!apiKey) {
        throw new Error("VITE_API_KEY environment variable not set.");
      }
      const ai = new GoogleGenAI({ apiKey });

      // Fix: Cast window to `any` to support `webkitAudioContext` for older browsers.
      audioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;
      audioSourcesRef.current = new Set();
      
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: async () => {
            try {
              mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
              setStatus(Status.LISTENING);
              
              const source = audioContextRef.current!.createMediaStreamSource(mediaStreamRef.current);
              mediaStreamSourceRef.current = source;
              
              const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
              scriptProcessorRef.current = scriptProcessor;

              scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob: Blob = {
                  data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                };
                if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then((session) => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    }).catch(e => {
                        console.error("Error sending audio data:", e);
                        setError("Failed to send audio. Please try again.");
                        stopConversation();
                    });
                }
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContextRef.current!.destination);
            } catch (err) {
              console.error('Microphone access denied:', err);
              setError('Microphone access is required. Please allow microphone permissions and try again.');
              setStatus(Status.IDLE);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              currentInputTranscription.current += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
                setStatus(Status.SPEAKING);
                currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            }
            
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                const outputCtx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                
                source.onended = () => {
                    audioSourcesRef.current.delete(source);
                    if(audioSourcesRef.current.size === 0) {
                        setStatus(Status.LISTENING);
                    }
                };

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
            }

            if (message.serverContent?.turnComplete) {
                const userTurn: ConversationTurn = { speaker: 'user', text: currentInputTranscription.current };
                const modelTurn: ConversationTurn = { speaker: 'model', text: currentOutputTranscription.current };
                
                setTranscription(prev => [...prev, userTurn, modelTurn]);
                
                currentInputTranscription.current = '';
                currentOutputTranscription.current = '';
                if (audioSourcesRef.current.size === 0) {
                    setStatus(Status.LISTENING);
                }
            }
             if (message.serverContent?.interrupted) {
                for (const source of audioSourcesRef.current.values()) {
                    source.stop();
                }
                audioSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setError('A connection error occurred. Please try again.');
            stopConversation();
          },
          onclose: () => {
            console.log('Session closed.');
            cleanup();
            if(status !== Status.IDLE) {
              setStatus(Status.IDLE);
            }
          },
        },
      });
    } catch (e: any) {
      console.error(e);
      setError(`An unexpected error occurred: ${e.message}`);
      setStatus(Status.IDLE);
      cleanup();
    }
  }, [stopConversation, cleanup, status]);

  useEffect(() => {
    return () => {
        if(sessionPromiseRef.current) {
            stopConversation();
        }
    };
  }, [stopConversation]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl h-full flex flex-col">
        <header className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-teal-300">Aria: Your AI English Tutor</h1>
          <p className="text-gray-400 mt-2">Practice your English conversation skills in real-time.</p>
        </header>
        
        <main className="flex-grow flex flex-col items-center justify-center bg-gray-800/50 rounded-2xl shadow-2xl p-4 sm:p-8 backdrop-blur-sm border border-gray-700/50">
          <div className="w-48 h-48 sm:w-64 sm:h-64 mb-6">
            <Avatar status={status} />
          </div>
          <TranscriptionDisplay transcription={transcription} />

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 text-red-300 border border-red-500/50 rounded-lg text-center">
              <p>{error}</p>
            </div>
          )}
        </main>
        
        <footer className="w-full py-6">
            <Controls status={status} onStart={startConversation} onStop={stopConversation} />
        </footer>
      </div>
    </div>
  );
}
