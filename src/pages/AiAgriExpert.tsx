import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, AlertCircle, ChevronLeft, Loader2, User, Camera, CameraOff } from 'lucide-react';
import ApiKeyModal from '../components/ApiKeyModal';
import { useAppContext } from '../context/AppContext';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { cn } from '../lib/utils';
import { getFriendlyAiError } from '../utils/aiErrorHandler';

// Audio constants
const SAMPLE_RATE = 24000;
const CHUNK_SIZE = 4096;

const AiAgriExpert: React.FC = () => {
  const { userSettings, appContent, loading: appLoading } = useAppContext();
  const navigate = useNavigate();
  
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyErrorMessage, setApiKeyErrorMessage] = useState<string | undefined>();
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

  // Sync refs with state
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isCameraOnRef.current = isCameraOn; }, [isCameraOn]);
  useEffect(() => { statusRef.current = status; }, [status]);

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

  // Play PCM audio chunks with scheduled timing to prevent gaps
  const playNextChunk = useCallback(async () => {
    if (audioQueueRef.current.length === 0 || !isSpeakerOn || !audioContextRef.current) {
      return;
    }

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
        startTime = currentTime + 0.1;
      }

      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

      // Handle overlap/interruption
      if (audioQueueRef.current.length > 0) {
        setTimeout(playNextChunk, 10);
      }
    }
  }, [isSpeakerOn]);

  const endCall = useCallback(() => {
    stopTimer();
    setIsCalling(false);
    setStatus('idle');
    
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
  }, []);

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

    if (!userSettings?.geminiApiKey) {
      setApiKeyErrorMessage(undefined);
      setIsApiKeyModalOpen(true);
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
      const apiKey = userSettings?.geminiApiKey || "";
      const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `आप एक अनुभवी और दयालु भारतीय कृषि विशेषज्ञ (Agri-Expert) हैं। 
आपका नाम 'कृषि साथी' है और आप 'फल्सावदिया कृषि बाज़ार' (Falsawdiya Krishi Bazar) से बात कर रही हैं। 

📍 हमारा पता (Permanent Address):
डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश (458883)

🕒 दुकान का समय (Shop Timings):
सुबह 8:00 बजे से शाम 8:00 बजे तक (8:00 AM to 8:00 PM)

महत्वपूर्ण निर्देश:
1. आपका लहजा बिल्कुल मानवीय, विनम्र और उत्साहजनक होना चाहिए। रोबोटिक न लगें। हिंदी उच्चारण बहुत साफ और प्राकृतिक होना चाहिए।
2. जैसे ही कॉल कनेक्ट हो, आप सबसे पहले यह वाक्य बोलेंगे: "नमस्कार, मैं फल्सावदिया कृषि बाज़ार से आपकी कृषि साथी बात कर रही हूँ। मैं आपकी किस प्रकार मदद कर सकती हूँ, बताइए।"
3. यदि कोई किसान दुकान का पता (Address) या समय (Timings) पूछे, तो आप गर्व के साथ ऊपर दी गई जानकारी स्पष्ट रूप से बताएंगी।
4. आप किसान के बैक कैमरा फीड के माध्यम से उनकी फसलों को लाइव देख सकती हैं। आप फसल में दिखने वाले रोगों, कीटों (जैसे माहू, इल्ली, सफेद मक्खी), पोषण की कमी, खरपतवार और मिट्टी की समस्याओं को लाइव पहचानेंगी।
5. बातचीत के दौरान आप जो भी दवाई, खाद, कीटनाशक (Pesticide), फफूंदनाशक (Fungicide) या खरपतवारनाशक (Herbicide) सुझाएं, उसके साथ यह जरूर कहें कि यह उत्पाद 'फल्सावदिया कृषि बाज़़ार' दुकान पर उपलब्ध है।
6. बार-बार किसान को हमारी दुकान "फल्सावदिया कृषि बाज़ार" से उत्पाद खरीदने के लिए प्रोत्साहित करें ताकि सेल (Sales) बढ़ सके।
7. उदाहरण: "आपकी फसल में माहू की समस्या दिखाई दे रही है। इसके नियंत्रण के लिए आप 'Confidor' जैसी दवाई उपयोग कर सकती हैं। यह दवाई आपको हमारी 'फल्सावदिया कृषि बाज़ार' दुकान पर आसानी से मिल जाएगी।"
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
              
              playNextChunk();
            }
            
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              nextStartTimeRef.current = 0;
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
        setApiKeyErrorMessage(friendlyError.message);
        setIsApiKeyModalOpen(true);
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
    <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-between p-6 pb-24">
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onClose={() => setIsApiKeyModalOpen(false)} 
        message={apiKeyErrorMessage}
      />
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-6 h-6 text-gray-500" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-sm font-black text-[#4A3728] uppercase tracking-widest">AI विशेषज्ञ कॉल</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
              status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500' : 'bg-gray-300')} />
            <span className="text-[10px] font-bold text-gray-400">
              {status === 'connected' ? 'लाइव बातचीत' : status === 'connecting' ? 'कनेक्ट हो रहा है...' : 'तैयार है'}
            </span>
          </div>
        </div>
        <div className="w-12" /> {/* Spacer */}
      </div>

      {/* Main Experience */}
      <div className="flex-1 flex flex-col items-center justify-center w-full space-y-12">
        {/* Profile Avatar or Video Feed */}
        <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isCalling && isCameraOn ? (
              <motion.div 
                key="video"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full h-full rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl bg-black"
              >
                <video 
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE CAMERA</span>
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
                <AnimatePresence>
                  {status === 'connected' && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      className="absolute inset-0 bg-[#2D5A27] rounded-full blur-2xl"
                    />
                  )}
                </AnimatePresence>
                <div className={cn(
                  "relative w-48 h-48 rounded-full border-8 border-white shadow-2xl flex items-center justify-center bg-gradient-to-br transition-all duration-1000",
                  status === 'connected' ? "from-[#2D5A27] to-[#3D7A35]" : "from-gray-200 to-gray-300"
                )}>
                  <div className="flex flex-col items-center text-white">
                    <Sparkles className={cn("w-16 h-16 mb-2", status === 'connected' ? "text-yellow-400" : "text-white/50")} />
                    <span className="text-xl font-black">{status === 'connected' ? "कृषि साथी" : "कृषि साथी"}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Hidden canvas for video processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Display Status/Timer */}
        <div className="text-center w-full px-8">
          {status === 'connected' ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <p className="text-3xl font-mono font-bold text-[#4A3728]">{formatDuration(callDuration)}</p>
              <p className="text-sm text-green-600 font-black animate-pulse uppercase tracking-wider">बातचीत जारी है...</p>
            </motion.div>
          ) : status === 'connecting' ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-[#2D5A27] animate-spin" />
              <p className="text-sm font-bold text-gray-500">नमस्ते! कनेक्ट हो रहा है...</p>
            </div>
          ) : status === 'requesting_permission' ? (
            <div className="flex flex-col items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-12 h-12 bg-[#2D5A27]/10 rounded-full flex items-center justify-center"
              >
                <Mic className="w-6 h-6 text-[#2D5A27]" />
              </motion.div>
              <p className="text-sm font-bold text-[#2D5A27]">माइक अनुमति मांग रहे हैं...</p>
              <p className="text-[10px] text-gray-400 font-medium max-w-[200px]">कृपया ऊपर आने वाले ब्राउज़र पॉपअप में 'Allow' चुनें</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm max-w-sm mx-auto">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-sm font-black text-red-600 leading-relaxed">{error}</p>
              
              <div className="w-full space-y-2">
                <button 
                  onClick={permissionGranted ? startCall : requestPermissions}
                  className="w-full text-sm font-black text-white bg-red-500 py-4 rounded-2xl shadow-lg active:scale-95 transition-transform"
                >
                  {permissionGranted ? "फिर से कोशिश करें" : "अनुमति दें (Allow Permission)"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-xs mx-auto">
              <h3 className="text-xl font-black text-[#4A3728]">विशेषज्ञ से सीधी बात</h3>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                बिल्कुल इंसानों की तरह बात करने वाला हमारा AI एक्सपर्ट खेती की किसी भी समस्या का तुरंत समाधान देगा। 
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-xs space-y-8">
        <div className="flex items-center justify-around">
          <button 
            disabled={!isCalling || status !== 'connected'}
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95",
              isMuted ? "bg-red-500 text-white" : "bg-white text-gray-400 border border-gray-100 shadow-sm",
              (status === 'requesting_permission' || (!isCalling && !permissionGranted)) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button 
            disabled={status === 'connecting' || status === 'requesting_permission'}
            onClick={isCalling ? endCall : startCall}
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-95 hover:scale-105",
              isCalling ? "bg-red-500 shadow-red-200" : "bg-[#2D5A27] hover:bg-[#3D7A35] shadow-green-200",
              (status === 'requesting_permission' || status === 'connecting') && "opacity-50 cursor-not-allowed"
            )}
          >
            {isCalling ? <PhoneOff className="w-10 h-10 text-white" /> : <Phone className="w-10 h-10 text-white" />}
          </button>

          <button 
            onClick={() => setIsCameraOn(!isCameraOn)}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95",
              isCameraOn ? "bg-[#2D5A27] text-white shadow-lg" : "bg-white text-gray-400 border border-gray-100 shadow-sm",
              status === 'connecting' && "opacity-50 cursor-not-allowed"
            )}
          >
            {isCameraOn ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
          </button>
        </div>

        {!isCalling && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest"
          >
            {status === 'requesting_permission' ? 'अनुमति का इंतज़ार...' : 'कॉल शुरू करने के लिए हरा बटन दबाएं'}
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default AiAgriExpert;
