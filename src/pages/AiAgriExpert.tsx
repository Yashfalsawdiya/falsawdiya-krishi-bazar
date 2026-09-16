import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, AlertCircle, ChevronLeft, Loader2, User, Camera, CameraOff } from 'lucide-react';
import ApiKeyModal from '../components/ApiKeyModal';
import useAiGuard from '../hooks/useAiGuard';
import { useAppContext } from '../context/AppContext';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { cn } from '../lib/utils';
import { getFriendlyAiError } from '../utils/aiErrorHandler';

// Audio constants
const SAMPLE_RATE = 24000;
const CHUNK_SIZE = 4096;

const AiAgriExpert: React.FC = () => {
  const { appContent, loading: appLoading } = useAppContext();
  const navigate = useNavigate();
  
  const { 
    apiKey: effectiveApiKey, 
    requireApiKey, 
    isApiKeyModalOpen, 
    apiKeyModalMessage, 
    openApiKeyModal, 
    closeApiKeyModal 
  } = useAiGuard();
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const isCameraOnRef = useRef(false);

  const [callDuration, setCallDuration] = useState(0);
  const [status, setStatus] = useState<'idle' | 'requesting_permission' | 'connecting' | 'connected' | 'error'>('idle');
  const statusRef = useRef(status);
  
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const isCallingRef = useRef(isCalling);
  
  // Refs for audio, video and Gemini session
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isPlayingRef = useRef(false);

  // Sync refs with state
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isCameraOnRef.current = isCameraOn; }, [isCameraOn]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { isCallingRef.current = isCalling; }, [isCalling]);

  // Handle Mute State Changes during call
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  // Start/Stop video streaming interval helper
  const startVideoInterval = useCallback((session: any) => {
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    
    videoIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current && session && isCameraOnRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext('2d');
        if (context && video.readyState >= 2) {
          // Resize canvas to a reasonable size for the API
          const maxWidth = 640;
          const scale = maxWidth / video.videoWidth;
          canvas.width = maxWidth;
          canvas.height = video.videoHeight * scale;
          
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
          
          session.sendRealtimeInput({
            video: { data: base64Data, mimeType: 'image/jpeg' }
          });
        }
      }
    }, 1000); // 1 FPS for better stability
  }, []);

  // Handle Camera Toggle mid-call
  useEffect(() => {
    async function updateCameraMidCall() {
      if (isCalling && status === 'connected') {
        if (isCameraOn) {
          try {
            // Request camera - avoid 'exact' constraint to prevent 'Requested device not found' on desktop/non-conforming devices
            let videoConstraints: any = { facingMode: 'environment' };
            
            let videoStream;
            try {
              videoStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
            } catch (e) {
              console.warn("Failed with environment facingMode, trying default video", e);
              videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
            
            const videoTrack = videoStream.getVideoTracks()[0];
            if (streamRef.current) {
              streamRef.current.addTrack(videoTrack);
              if (videoRef.current) videoRef.current.srcObject = streamRef.current;
            }
            startVideoInterval(sessionRef.current);
          } catch (err) {
            console.error("Failed to enable camera mid-call:", err);
            setIsCameraOn(false);
          }
        } else {
          // Disable camera
          if (streamRef.current) {
            streamRef.current.getVideoTracks().forEach(track => {
              track.stop();
              streamRef.current?.removeTrack(track);
            });
            if (videoRef.current) videoRef.current.srcObject = streamRef.current;
          }
          if (videoIntervalRef.current) {
            clearInterval(videoIntervalRef.current);
            videoIntervalRef.current = null;
          }
        }
      }
    }
    updateCameraMidCall();
  }, [isCameraOn, isCalling, status, startVideoInterval]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Convert Float32Array (browser) to Int16Array (PCM)
  const float32ToInt16 = (buffer: Float32Array) => {
    const buf = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
        // Normalizing to signed 16-bit PCM
        buf[i] = Math.max(-32768, Math.min(32767, Math.floor(buffer[i] * 32768)));
    }
    return buf.buffer;
  };

  // Helper to convert ArrayBuffer to Base64 safely
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Stop and cancel all active and scheduled audio source nodes
  const stopAllActiveSources = useCallback(() => {
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Source already ended or was not started
      }
    });
    activeSourcesRef.current = [];
  }, []);

  // Play PCM audio chunks with scheduled timing to prevent gaps
  const playNextChunk = useCallback(async () => {
    if (audioQueueRef.current.length === 0 || !isSpeakerOn || !audioContextRef.current) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const pcmData = audioQueueRef.current.shift()!;
    
    if (audioContextRef.current) {
      const float32Data = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        float32Data[i] = pcmData[i] / 32768.0;
      }

      const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, SAMPLE_RATE);
      audioBuffer.getChannelData(0).set(float32Data);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      // Strict scheduling for seamless playback
      const currentTime = audioContextRef.current.currentTime;
      let startTime = Math.max(currentTime, nextStartTimeRef.current);
      
      // Buffer a tiny bit if we have a gap to prevent audio artifacts
      if (startTime <= currentTime) {
        startTime = currentTime + 0.05;
      }

      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

      // Track active sources so they can be canceled/interrupted
      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(src => src !== source);
        const stillSpeaking = audioQueueRef.current.length > 0 || activeSourcesRef.current.length > 0;
        if (!stillSpeaking) {
          isPlayingRef.current = false;
        }
      };

      // Handle overlap/interruption
      if (audioQueueRef.current.length > 0) {
        setTimeout(playNextChunk, 10);
      } else {
        isPlayingRef.current = false;
      }
    } else {
      isPlayingRef.current = false;
    }
  }, [isSpeakerOn]);

  const endCall = useCallback(() => {
    stopTimer();
    setIsCalling(false);
    setStatus('idle');
    
    // Stop and clear all active speech sources immediately
    stopAllActiveSources();
    
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
    isPlayingRef.current = false;
  }, [stopAllActiveSources]);

  const requestPermissions = async () => {
    setStatus('requesting_permission');
    setError(null);
    try {
      // Direct call to getUserMedia within user gesture
      // Explicitly relax constraints to ensure it works on most devices
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setStatus('idle');
      return true;
    } catch (err: any) {
      console.error("Permission request failed:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
        setError("माइक एक्सेस ब्लॉक है। कृपया ब्राउज़र की ताला (Lock) सेटिंग्स में जाकर माइक्रोफोन के लिए 'Allow' चुनें।");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("आपके फोन में माइक्रोफोन नहीं मिला।");
      } else {
        setError("माइक शुरू करने में तकनीकी समस्या आई।");
      }
      setStatus('error');
      setPermissionGranted(false);
      return false;
    }
  };

  const startCall = async () => {
    if (appLoading) return;

    if (!requireApiKey("AI कृषि विशेषज्ञ से लाइव बात करने के लिए कृपया अपनी Gemini API Key जोड़ें।")) {
      return;
    }

    setIsCalling(true);
    setStatus('connecting');
    setError(null);
    setCallDuration(0);

    try {
      // 1. Setup Media First (Required for User Gesture context)
      let videoConstraints: any = false;
      if (isCameraOn) {
        videoConstraints = { facingMode: 'environment' };
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: videoConstraints 
        });
      } catch (innerErr) {
        console.warn("Retrying media with relaxed constraints", innerErr);
        // If fails, try just audio first, or fallback to any video
        if (isCameraOn) {
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: true 
          });
        } else {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      }

      streamRef.current = stream;
      if (videoRef.current && isCameraOn) {
        videoRef.current.srcObject = stream;
      }
      setPermissionGranted(true);

      // 2. Setup Audio Context at 24kHz for high-quality voice
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      processorRef.current = audioContextRef.current.createScriptProcessor(CHUNK_SIZE, 1, 1);
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // 3. Setup Gemini Session
      const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
    const systemInstruction = `आप एक अनुभवी और दयालु भारतीय कृषि विशेषज्ञ (Agri-Expert) हैं। 
आपका नाम 'कृषि साथी' है और आप 'फल्सावदिया कृषि बाजार' (Falsawdiya Krishi Bazar) से बात कर रही हैं। 

📍 हमारा पता (Permanent Address):
डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश (458883)

🕒 दुकान का समय (Shop Timings):
सुबह 8:00 बजे से रात 8:00 बजे तक (08:00 AM – 08:00 PM)

STRICT RULE ON NAME:
हमेशा दुकान का नाम "फल्सावदिया कृषि बाजार" ही लें। "फालसावदिया" (extra aa matra after pha) का उपयोग वर्जित है।

महत्वपूर्ण निर्देश:
1. आपका लहजा बिल्कुल मानवीय, विनम्र और उत्साहजनक होना चाहिए। रोबोटिक न लगें। हिंदी उच्चारण बहुत साफ और प्राकृतिक होना चाहिए।
2. जैसे ही कॉल कनेक्ट हो, आप सबसे पहले यह वाक्य बोलेंगे: "नमस्कार, मैं फल्सावदिया कृषि बाजार से आपकी कृषि साथी बात कर रही हूँ। मैं आपकी किस प्रकार मदद कर सकती हूँ, बताइए।"
3. यदि कोई किसान दुकान का पता (Address) या समय (Timings) पूछे, तो आप गर्व के साथ ऊपर दी गई जानकारी स्पष्ट रूप से बताएंगी।
4. आप किसान के बैक कैमरा फीड के माध्यम से उनकी फसलों को लाइव देख सकती हैं। आप फसल में दिखने वाले रोगों, कीटों (जैसे माहू, इल्ली, सफेद मक्खी), पोषण की कमी, खरपतवार और मिट्टी की समस्याओं को लाइव पहचानेंगी।
5. बातचीत के दौरान आप जो भी दवाई, खाद, कीटनाशक (Pesticide), फफूंदनाशक (Fungicide) या खरपतवारनाशक (Herbicide) सुझाएं, उसके साथ यह जरूर कहें कि यह उत्पाद 'फल्सावदिया कृषि बाजार' दुकान पर उपलब्ध है।
6. बार-बार किसान को हमारी दुकान "फल्सावदिया कृषि बाजार" से उत्पाद खरीदने के लिए प्रोत्साहित करें ताकि सेल (Sales) बढ़ सके।
7. उदाहरण: "आपकी फसल में माहू की समस्या दिखाई दे रही है। इसके नियंत्रण के लिए आप 'Confidor' जैसी दवाई उपयोग कर सकती हैं। यह दवाई आपको हमारी 'फल्सावदिया कृषि बाजार' दुकान पर आसानी से मिल जाएगी।"
8. किसानों को सम्मान देने के लिए 'जी', 'नमस्ते', 'भैया' या 'चाचा' जैसे शब्दों का प्रयोग करें।

आपका ज्ञान क्षेत्र: फसल रोग, कीट प्रबंधन, खाद की गणना, खरपतवार नियंत्रण और मंडी भाव।`;

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction,
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            startTimer();
            // Trigger the initial greeting explicitly once the session is open
            sessionPromise.then(session => {
              sessionRef.current = session;
              session.sendRealtimeInput({ text: "नमस्ते! कृपया अपना परिचय दें और मेरा स्वागत करें।" });
              
              // Start video streaming if camera is on
              if (isCameraOnRef.current) {
                startVideoInterval(session);
              }
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio) {
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const pcmData = new Int16Array(bytes.buffer);
              audioQueueRef.current.push(pcmData);
              
              if (audioContextRef.current?.state === 'suspended') {
                await audioContextRef.current.resume();
              }
              
              if (!isPlayingRef.current) {
                playNextChunk();
              }
            }
            
            if (message.serverContent?.interrupted) {
              console.log("Model turn interrupted by server. Ignoring to maintain stable, continuous farmer experience.");
              // We intentionally do not stop playback here, allowing the currently buffered/playing text to finish smoothly!
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            const friendlyError = getFriendlyAiError(err);
            setError(friendlyError.message);
            setStatus('error');
            setTimeout(endCall, 3000);
          },
          onclose: () => {
            if (isCalling) endCall();
          }
        }
      });

      sessionRef.current = await sessionPromise;

      // 4. Start Streaming Mic Data
      processorRef.current.onaudioprocess = (e) => {
        // Prevent feedback loop
        const outputData = e.outputBuffer.getChannelData(0);
        outputData.fill(0);

        if (isMutedRef.current || statusRef.current !== 'connected' || !sessionRef.current) return;
        
        const inputData = e.inputBuffer.getChannelData(0);

        // If AI is speaking, do not send microphone data to the Gemini Live session.
        // This prevents background noise, echo, or user speaking from triggering server-side interruptions,
        // and keeps the playback 100% continuous and smooth!
        const isCurrentlySpeaking = isPlayingRef.current || audioQueueRef.current.length > 0 || activeSourcesRef.current.length > 0;
        if (isCurrentlySpeaking) {
          return; // Skip sending mic data to the server
        }

        const pcmBuffer = float32ToInt16(inputData);
        const base64Data = arrayBufferToBase64(pcmBuffer);
        
        sessionRef.current.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=24000' }
        });
      };

    } catch (err: any) {
      console.error("Call initialization failed:", err);
      const friendlyError = getFriendlyAiError(err);
      
      if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
        openApiKeyModal(friendlyError.message);
        setIsCalling(false);
        setStatus('idle');
        return;
      }

      setError(friendlyError.message);
      setStatus('error');
      setIsCalling(false);
    }
  };

  useEffect(() => {
    // Check permission status on mount
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
        if (result.state === 'granted') {
          setPermissionGranted(true);
        }
        result.onchange = () => {
          if (result.state === 'granted') {
            setPermissionGranted(true);
            setError(null);
            setStatus('idle');
          } else {
            setPermissionGranted(false);
          }
        };
      });
    }

    return () => {
      endCall();
    };
  }, [endCall]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7FAF6] via-[#F4F7F2] to-[#EAF2E8] flex flex-col items-center justify-between p-4 sm:p-6 pb-20 sm:pb-24 relative overflow-hidden select-none">
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-gradient-to-br from-emerald-400/15 via-teal-300/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-64 sm:w-80 h-64 sm:h-80 bg-gradient-to-tr from-amber-300/10 to-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onClose={closeApiKeyModal} 
        message={apiKeyModalMessage}
      />

      {/* Header */}
      <div className="w-full max-w-lg flex items-center justify-between z-20 mb-4 sm:mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-2.5 sm:p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xs border border-gray-200/80 active:scale-95 transition-transform cursor-pointer text-gray-700 hover:text-gray-900"
          title="वापस जाएँ (Back)"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-emerald-200/80 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                status === 'connected' ? 'bg-emerald-400' : status === 'connecting' ? 'bg-amber-400' : 'bg-emerald-500'
              )} />
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                status === 'connected' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-500' : 'bg-emerald-600'
              )} />
            </span>
            <span className="text-xs font-black text-[#1B4318]">
              {status === 'connected' ? 'लाइव बातचीत' : status === 'connecting' ? 'कनेक्ट हो रहा है...' : 'AI कृषि साथी'}
            </span>
            <span className="text-[10px] font-bold text-gray-400 border-l border-gray-200 pl-2">24×7</span>
          </div>
        </div>

        {/* Speaker Volume Toggle */}
        <button
          onClick={() => setIsSpeakerOn(!isSpeakerOn)}
          className={cn(
            "p-2.5 sm:p-3 rounded-2xl shadow-2xs border transition-all active:scale-95 cursor-pointer",
            isSpeakerOn 
              ? "bg-white/90 backdrop-blur-md text-[#1B4318] border-gray-200/80 hover:bg-emerald-50" 
              : "bg-red-50 text-red-600 border-red-200"
          )}
          title={isSpeakerOn ? "स्पीकर चालू" : "स्पीकर बंद"}
        >
          {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Experience */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md z-10 space-y-6 sm:space-y-8 my-auto">
        {/* Profile Avatar or Video Feed */}
        <div className="relative w-full aspect-square max-w-[270px] sm:max-w-[310px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isCalling && isCameraOn ? (
              <motion.div 
                key="video"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl bg-black"
              >
                <video 
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder target brackets */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg pointer-events-none" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg pointer-events-none" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg pointer-events-none" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg pointer-events-none" />

                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-black text-white tracking-wider uppercase">LIVE SCAN</span>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="avatar"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative flex items-center justify-center"
              >
                {/* Ambient dynamic ripple rings */}
                <motion.div 
                  animate={status === 'connected' 
                    ? { scale: [1, 1.25, 1], opacity: [0.35, 0.1, 0.35] } 
                    : { scale: [1, 1.12, 1], opacity: [0.22, 0.08, 0.22] }
                  }
                  transition={{ repeat: Infinity, duration: status === 'connected' ? 2 : 3.5, ease: "easeInOut" }}
                  className="absolute -inset-6 sm:-inset-8 bg-gradient-to-tr from-emerald-500/30 to-teal-400/20 rounded-full blur-xl pointer-events-none"
                />

                <motion.div 
                  animate={status === 'connected' 
                    ? { scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] } 
                    : { scale: [1, 1.06, 1], opacity: [0.3, 0.12, 0.3] }
                  }
                  transition={{ repeat: Infinity, duration: status === 'connected' ? 1.5 : 3, ease: "easeInOut", delay: 0.3 }}
                  className="absolute -inset-3 sm:-inset-4 bg-emerald-400/25 rounded-full blur-md pointer-events-none"
                />

                {/* The Central Glowing AI Agritech Orb */}
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full p-1 bg-gradient-to-tr from-emerald-300 via-white to-teal-200 shadow-2xl flex items-center justify-center">
                  <div className={cn(
                    "w-full h-full rounded-full flex flex-col items-center justify-center relative overflow-hidden transition-all duration-700 shadow-inner",
                    status === 'connected' 
                      ? "bg-gradient-to-br from-[#123815] via-[#1C4D21] to-[#2E7A35]" 
                      : "bg-gradient-to-br from-[#183D16] via-[#245720] to-[#3B7A32]"
                  )}>
                    {/* Internal lighting flares */}
                    <div className="absolute -top-8 -left-8 w-28 h-28 bg-white/20 rounded-full blur-xl pointer-events-none" />
                    <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

                    {/* AI Sparkles & Badge */}
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-1.5 shadow-xs">
                        <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300 animate-pulse drop-shadow-md" />
                      </div>
                      <span className="text-lg sm:text-xl font-black text-white tracking-wide drop-shadow-sm">
                        कृषि साथी
                      </span>
                      <span className="text-[11px] font-bold text-emerald-200/90 tracking-wider uppercase mt-0.5">
                        AI वॉयस डॉक्टर
                      </span>

                      {/* Animated Soundwave Equalizer */}
                      <div className="flex items-center gap-1 mt-2.5 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-white/10">
                        <span className={cn("w-1 rounded-full transition-all duration-300", status === 'connected' ? "h-4 bg-emerald-400 animate-pulse" : "h-2 bg-white/60 animate-pulse")} />
                        <span className={cn("w-1 rounded-full transition-all duration-300", status === 'connected' ? "h-6 bg-amber-300 animate-pulse" : "h-3.5 bg-white/80 animate-pulse")} style={{ animationDelay: '150ms' }} />
                        <span className={cn("w-1 rounded-full transition-all duration-300", status === 'connected' ? "h-5 bg-emerald-300 animate-pulse" : "h-4.5 bg-white animate-pulse")} style={{ animationDelay: '300ms' }} />
                        <span className={cn("w-1 rounded-full transition-all duration-300", status === 'connected' ? "h-6 bg-yellow-300 animate-pulse" : "h-3.5 bg-white/80 animate-pulse")} style={{ animationDelay: '450ms' }} />
                        <span className={cn("w-1 rounded-full transition-all duration-300", status === 'connected' ? "h-3.5 bg-emerald-400 animate-pulse" : "h-2 bg-white/60 animate-pulse")} style={{ animationDelay: '600ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Hidden canvas for video processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Display Status/Timer/Info */}
        <div className="text-center w-full px-4 sm:px-6">
          {status === 'connected' ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-emerald-100 shadow-xs max-w-xs mx-auto"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                <span>लाइव बातचीत जारी है</span>
              </div>
              <p className="text-3xl sm:text-4xl font-mono font-black text-gray-900 tracking-tight">{formatDuration(callDuration)}</p>
              <p className="text-xs text-gray-500 font-semibold">बोलें, AI आपकी समस्या सुन रहा है...</p>
            </motion.div>
          ) : status === 'connecting' ? (
            <div className="flex flex-col items-center gap-3 bg-white/85 backdrop-blur-md p-4 rounded-3xl border border-emerald-100 shadow-xs max-w-xs mx-auto">
              <Loader2 className="w-8 h-8 text-[#2D5A27] animate-spin" />
              <div>
                <p className="text-sm font-black text-gray-900">AI विशेषज्ञ से कनेक्ट हो रहा है...</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">कृपया 2 सेकंड रुकें</p>
              </div>
            </div>
          ) : status === 'requesting_permission' ? (
            <div className="flex flex-col items-center gap-3 bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-emerald-100 shadow-xs max-w-xs mx-auto">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center shadow-xs"
              >
                <Mic className="w-6 h-6 text-[#183D16]" />
              </motion.div>
              <div>
                <p className="text-sm font-black text-gray-900">माइक अनुमति की आवश्यकता है</p>
                <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">बातचीत के लिए कृपया ऊपर ब्राउज़र पॉपअप में <strong className="text-[#183D16]">'Allow'</strong> चुनें</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-3xl border border-red-100 shadow-sm max-w-xs mx-auto">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-xs font-bold text-red-600 leading-relaxed text-center">{error}</p>
              
              <button 
                onClick={permissionGranted ? startCall : requestPermissions}
                className="w-full text-xs font-black text-white bg-red-500 hover:bg-red-600 py-3 rounded-xl shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                {permissionGranted ? "फिर से कोशिश करें" : "अनुमति दें (Allow)"}
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-w-sm mx-auto">
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">विशेषज्ञ से सीधी बात</h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                फसल, कीट, खाद या दवाई की समस्या बताएं — इंसानों की तरह बात करके तुरंत समाधान पाएं।
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Controls Floating Dock */}
      <div className="w-full max-w-xs z-20 space-y-3 sm:space-y-4">
        <div className="bg-white/90 backdrop-blur-xl p-3 sm:p-4 rounded-full border border-emerald-900/10 shadow-xl shadow-emerald-950/5 flex items-center justify-around">
          {/* Mute Button */}
          <button 
            disabled={!isCalling || status !== 'connected'}
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? "अनम्यूट करें" : "म्यूट करें"}
            className={cn(
              "w-14 h-14 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer",
              isMuted 
                ? "bg-red-500 text-white shadow-md shadow-red-500/25" 
                : "bg-emerald-50 text-[#183D16] border border-emerald-200/80 hover:bg-emerald-100",
              (status === 'requesting_permission' || (!isCalling && !permissionGranted)) && "opacity-40 cursor-not-allowed"
            )}
          >
            {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* Hero Call Action Button */}
          <div className="relative">
            {!isCalling && (
              <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-40 pointer-events-none" />
            )}
            <button 
              disabled={status === 'connecting' || status === 'requesting_permission'}
              onClick={isCalling ? endCall : startCall}
              title={isCalling ? "कॉल समाप्त करें" : "कॉल शुरू करें"}
              className={cn(
                "relative w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 hover:scale-105 cursor-pointer ring-4",
                isCalling 
                  ? "bg-gradient-to-tr from-red-600 to-rose-500 text-white ring-red-400/30 shadow-red-500/30" 
                  : "bg-gradient-to-tr from-[#183D16] via-[#245720] to-[#34782E] text-white ring-emerald-500/30 shadow-emerald-950/30",
                (status === 'requesting_permission' || status === 'connecting') && "opacity-50 cursor-not-allowed"
              )}
            >
              {isCalling ? <PhoneOff className="w-8 h-8 sm:w-9 sm:h-9 text-white" /> : <Phone className="w-8 h-8 sm:w-9 sm:h-9 text-white" />}
            </button>
          </div>

          {/* Camera Button */}
          <button 
            onClick={() => setIsCameraOn(!isCameraOn)}
            title={isCameraOn ? "कैमरा बंद करें" : "कैमरा चालू करें"}
            className={cn(
              "w-14 h-14 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer",
              isCameraOn 
                ? "bg-[#2D5A27] text-white shadow-md shadow-emerald-900/25" 
                : "bg-emerald-50 text-[#183D16] border border-emerald-200/80 hover:bg-emerald-100",
              status === 'connecting' && "opacity-40 cursor-not-allowed"
            )}
          >
            {isCameraOn ? <Camera className="w-5 h-5 sm:w-6 sm:h-6" /> : <CameraOff className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </div>

        {/* Guidance / Status hint */}
        <p className="text-center text-[11px] font-bold text-gray-500 tracking-wide flex items-center justify-center gap-1.5">
          {status === 'requesting_permission' ? (
            'अनुमति का इंतज़ार...'
          ) : isCalling ? (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>कॉल समाप्त करने के लिए लाल बटन दबाएं</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>कॉल शुरू करने के लिए हरा बटन दबाएं</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AiAgriExpert;
