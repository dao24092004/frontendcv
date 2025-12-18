// src/components/VideoCallInterface.tsx
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
  roomId: string; // BẮT BUỘC
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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const stompClient = useRef<Client | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const socket = new SockJS('http://localhost:8080/ws');
    stompClient.current = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
    });

    stompClient.current.onConnect = () => {
      console.log(`${userRole} connected to room ${roomId}`);

      // Subscribe topic riêng của room này
      stompClient.current?.subscribe(`/topic/video/${roomId}`, (message) => {
        const signal = JSON.parse(message.body);
        handleSignal(signal);
      });
    };

    stompClient.current.activate();

    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: 'ice-candidate',
          data: event.candidate,
        });
      }
    };

    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        if (!remoteVideoRef.current.srcObject) {
          remoteVideoRef.current.srcObject = new MediaStream();
        }
        const stream = remoteVideoRef.current.srcObject as MediaStream;
        stream.addTrack(event.track);
      }
    };

    const startCamera = async () => {
      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream.current.getTracks().forEach(track => {
          peerConnection.current?.addTrack(track, localStream.current!);
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream.current;
        }

        // Luôn tạo offer khi tham gia phòng
        const offer = await peerConnection.current?.createOffer();
        await peerConnection.current?.setLocalDescription(offer);
        sendSignal({
          type: 'offer',
          data: offer,
        });

      } catch (err) {
        console.error('Camera access denied', err);
      }
    };

    startCamera();

    return () => {
      stompClient.current?.deactivate();
      localStream.current?.getTracks().forEach(t => t.stop());
      peerConnection.current?.close();
    };
  }, [roomId, userRole]);

  const handleSignal = async (signal: any) => {
    if (!peerConnection.current) return;
    try {
      if (signal.type === 'offer') {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        sendSignal({ type: 'answer', data: answer });
      } else if (signal.type === 'answer') {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
      } else if (signal.type === 'ice-candidate') {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal.data));
      }
    } catch (err) {
      console.error('Signal error:', err);
    }
  };

  const sendSignal = (signal: any) => {
    stompClient.current?.publish({
      destination: '/app/video.signal',
      body: JSON.stringify({
        ...signal,
        from: userRole,
        roomId: roomId,
      }),
    });
  };

  // Toggle mute/video
  useEffect(() => {
    localStream.current?.getAudioTracks().forEach(t => t.enabled = !isMuted);
  }, [isMuted]);

  useEffect(() => {
    localStream.current?.getVideoTracks().forEach(t => t.enabled = !isVideoOff);
  }, [isVideoOff]);

  const handleEndCall = () => {
    // Gửi thông báo end (tùy chọn)
    stompClient.current?.publish({
      destination: '/app/video.end',
      body: JSON.stringify({ roomId })
    });
    onEndCall();
  };

  return (
    <motion.div className={`fixed z-[60] bg-gray-900 shadow-2xl overflow-hidden flex flex-col
      ${isExpanded ? 'inset-0 rounded-none' : 'bottom-24 right-6 w-80 md:w-96 h-[500px] rounded-2xl border border-gray-700'}`}>
      <div className="relative flex-1">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

        {!remoteVideoRef.current?.srcObject && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
            <div className="w-24 h-24 bg-canva-primary/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-canva-primary">{remoteName.charAt(0)}</span>
            </div>
            <p>Connecting to {remoteName}...</p>
          </div>
        )}

        <div className="absolute top-4 left-4">
          <div className="bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            {formatTime(callDuration)}
          </div>
        </div>

        <button onClick={() => setIsExpanded(!isExpanded)} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 bg-black/20 rounded-full">
          {isExpanded ? <FaCompress size={16} /> : <FaExpand size={16} />}
        </button>

        <motion.div drag={!isExpanded} className={`absolute z-20 overflow-hidden border-2 border-white/20 rounded-lg
          ${isExpanded ? 'bottom-8 right-8 w-48 h-36' : 'top-16 right-4 w-24 h-32'}`}>
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
        </motion.div>
      </div>

      <div className="h-20 bg-gray-900/90 flex items-center justify-center gap-6">
        <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full ${isMuted ? 'bg-white text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
          {isMuted ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
        </button>
        <button onClick={handleEndCall} className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg scale-110">
          <FaPhoneSlash size={24} />
        </button>
        <button onClick={() => setIsVideoOff(!isVideoOff)} className={`p-4 rounded-full ${isVideoOff ? 'bg-white text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
          {isVideoOff ? <FaVideoSlash size={20} /> : <FaVideo size={20} />}
        </button>
      </div>
    </motion.div>
  );
};

export default VideoCallInterface;