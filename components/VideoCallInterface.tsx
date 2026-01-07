import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash,
  FaPhoneSlash, FaExpand, FaCompress
} from 'react-icons/fa';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface VideoCallInterfaceProps {
  onEndCall: () => void;
  remoteName: string;
  userRole: 'Admin' | 'Visitor';
  roomId: string;
}

const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({
  onEndCall,
  remoteName,
  userRole,
  roomId
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [status, setStatus] = useState('Initializing...');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const stompClient = useRef<Client | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const iceCandidatesQueue = useRef<any[]>([]);
  const isComponentMounted = useRef(true);

  // --- LOGIC GIỮ NGUYÊN ---
  useEffect(() => {
    isComponentMounted.current = true;
    const timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    return () => { clearInterval(timer); isComponentMounted.current = false; };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    startCall();
    return () => cleanup();
  }, [roomId]);

  const cleanup = () => {
    if (stompClient.current) stompClient.current.deactivate();
    if (localStream.current) localStream.current.getTracks().forEach(t => t.stop());
    if (peerConnection.current) peerConnection.current.close();
  };

  const startCall = async () => {
    setStatus('Accessing Camera...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;

      if (localVideoRef.current && isComponentMounted.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(e => console.warn("Local play interrupted", e));
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnection.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && isComponentMounted.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setStatus('Connected');
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: 'ice-candidate',
            data: {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex
            }
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setStatus('Connected');
        else if (pc.connectionState === 'failed') setStatus('Failed');
      };

      connectSocket();
    } catch (err) {
      console.error(err);
      setStatus('Camera Error');
    }
  };

  const connectSocket = () => {
const socket = new SockJS(import.meta.env.VITE_WS_URL);
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      client.subscribe(`/topic/video/${roomId}`, (message) => {
        const signal = JSON.parse(message.body);
        if (signal.from !== userRole) handleSignal(signal);
      });
      if (userRole === 'Admin') setTimeout(() => createOffer(), 1000);
    };
    client.activate();
    stompClient.current = client;
  };

  const createOffer = async () => {
    if (!peerConnection.current) return;
    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      sendSignal({ type: 'offer', data: { type: offer.type, sdp: offer.sdp } });
    } catch (err) { console.error(err); }
  };

  const createAnswer = async () => {
    if (!peerConnection.current) return;
    try {
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      sendSignal({ type: 'answer', data: { type: answer.type, sdp: answer.sdp } });
    } catch (err) { console.error(err); }
  };

  const handleSignal = async (signal: any) => {
    if (!peerConnection.current) return;
    try {
      if (!signal.data) return;
      if (signal.type === 'offer') {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
        await createAnswer();
        while (iceCandidatesQueue.current.length > 0) {
          await peerConnection.current.addIceCandidate(iceCandidatesQueue.current.shift());
        }
      } else if (signal.type === 'answer') {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
      } else if (signal.type === 'ice-candidate') {
        const candidate = new RTCIceCandidate(signal.data);
        if (peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(candidate);
        } else {
          iceCandidatesQueue.current.push(candidate);
        }
      } else if (signal.type === 'end-call') {
        onEndCall();
      }
    } catch (err) { console.error(err); }
  };

  const sendSignal = (payload: any) => {
    if (stompClient.current?.connected) {
      stompClient.current.publish({
        destination: '/app/video.signal',
        body: JSON.stringify({ ...payload, from: userRole, roomId: roomId }),
      });
    }
  };

  // Toggle Controls
  useEffect(() => { localStream.current?.getAudioTracks().forEach(t => t.enabled = !isMuted); }, [isMuted]);
  useEffect(() => { localStream.current?.getVideoTracks().forEach(t => t.enabled = !isVideoOff); }, [isVideoOff]);

  // --- GIAO DIỆN MỚI: FULL SCREEN & NÚT NỔI ---
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed inset-0 z-[9999] bg-black flex flex-col overflow-hidden
        ${!isExpanded ? 'md:inset-10 md:rounded-2xl md:shadow-2xl md:border md:border-gray-800' : ''}`}
    >

      {/* 1. MÀN HÌNH REMOTE (CHÍNH) */}
      <div className="relative flex-1 bg-gray-900 w-full h-full">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain" />

        {/* Loading State */}
        {!remoteVideoRef.current?.srcObject && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-4">
            <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-semibold text-lg animate-pulse">{status}</p>
            <p className="text-sm text-gray-400">Đang chờ {remoteName}...</p>
          </div>
        )}

        {/* Thông tin thời gian (Góc trái trên) */}
        <div className="absolute top-6 left-6 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-white font-mono text-sm">{formatTime(callDuration)}</span>
        </div>

        {/* Nút phóng to/thu nhỏ (Góc phải trên) */}
        <button onClick={() => setIsExpanded(!isExpanded)}
          className="absolute top-6 right-6 p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
          {isExpanded ? <FaCompress /> : <FaExpand />}
        </button>

        {/* 2. MÀN HÌNH LOCAL (PHỤ - DRAGGABLE) */}
        <motion.div
          drag={!isExpanded}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          className="absolute bottom-24 right-6 w-36 h-52 md:w-56 md:h-80 bg-gray-800 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl z-20 cursor-move"
        >
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          <div className="absolute bottom-2 left-2 text-[10px] text-white bg-black/60 px-2 rounded">Bạn</div>
        </motion.div>
      </div>

      {/* 3. THANH ĐIỀU KHIỂN (NỔI Ở DƯỚI CÙNG) */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-6 z-50">

        {/* Nút Mic */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-110 ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-700/80 backdrop-blur text-white hover:bg-gray-600'}`}
        >
          {isMuted ? <FaMicrophoneSlash size={24} /> : <FaMicrophone size={24} />}
        </button>

        {/* Nút Kết thúc (To nhất) */}
        <button
          onClick={() => { sendSignal({ type: 'end-call' }); onEndCall(); }}
          className="p-5 rounded-full bg-red-600 text-white shadow-xl hover:bg-red-700 transform hover:scale-110 transition-all w-16 h-16 flex items-center justify-center"
        >
          <FaPhoneSlash size={28} />
        </button>

        {/* Nút Camera */}
        <button
          onClick={() => setIsVideoOff(!isVideoOff)}
          className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-110 ${isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-700/80 backdrop-blur text-white hover:bg-gray-600'}`}
        >
          {isVideoOff ? <FaVideoSlash size={24} /> : <FaVideo size={24} />}
        </button>

      </div>
    </motion.div>
  );
};

export default VideoCallInterface;