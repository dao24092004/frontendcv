// src/components/ChatWidget.tsx
import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { FaCommentDots, FaPaperPlane, FaTimes, FaVideo } from 'react-icons/fa';
import { ChatMessage } from '../types';
import { portfolioService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import VideoCallInterface from './VideoCallInterface';

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [username, setUsername] = useState('');
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  // State cho video call popup
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string>('');

  const stompClientRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      portfolioService.getChatHistory()
        .then(data => setMessages(data))
        .catch(err => console.warn("Could not load chat history", err));

      if (!connected && !connectionError) {
        connect();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connect = () => {
    if (username === '') {
      const guestName = `Guest_${Math.floor(Math.random() * 1000)}`;
      setUsername(guestName);
    }

    try {
      const socket = new SockJS('http://localhost:8080/ws');
      const client = Stomp.over(socket);
      client.debug = () => { };

      client.connect({}, () => {
        setConnected(true);
        setConnectionError(false);

        client.subscribe('/topic/public', (payload: any) => {
          const message = JSON.parse(payload.body);
          setMessages(prev => [...prev, message]);
        });

        client.send("/app/chat.addUser", {}, JSON.stringify({
          sender: username || "Visitor",
          type: 'JOIN'
        }));
      }, (error: any) => {
        console.warn('Chat Disconnected');
        setConnected(false);
        setConnectionError(true);
      });

      stompClientRef.current = client;
    } catch (e) {
      setConnectionError(true);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      const chatMessage: ChatMessage = {
        sender: username || "Visitor",
        content: inputMessage,
        type: 'CHAT',
        timestamp: new Date().toISOString()
      };

      if (stompClientRef.current && connected) {
        stompClientRef.current.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
      } else {
        setMessages(prev => [...prev, chatMessage]);
      }
      setInputMessage('');
    }
  };

  const startVideoCall = () => {
    const roomId = 'room-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    setCurrentRoomId(roomId);
    setIsVideoCallActive(true);

    if (stompClientRef.current?.connected) {
      stompClientRef.current.publish({
        destination: '/app/video.request',
        body: JSON.stringify({
          roomId,
          visitorName: username || 'Visitor'
        })
      });
    }

    const callMsg: ChatMessage = {
      sender: "System",
      content: `${username || 'Guest'} đã bắt đầu cuộc gọi video.`,
      type: 'CHAT',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, callMsg]);
  };

  return (
    <>
      {/* Nút mở chat - giữ nguyên */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-canva-primary text-white p-4 rounded-full shadow-lg hover:bg-opacity-90 transition-colors"
      >
        {isOpen ? <FaTimes size={24} /> : <FaCommentDots size={24} />}
      </motion.button>

      {/* Khung chat - giữ nguyên hoàn toàn */}
      <AnimatePresence>
        {isOpen && !isVideoCallActive && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-80 md:w-96 bg-canva-paper rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col border border-canva-accent/30 h-[500px]"
          >
            <div className="bg-canva-primary p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Live Chat</h3>
                <p className="text-xs opacity-90">
                  {connected ? 'Online' : 'Offline (Demo Mode)'}
                </p>
              </div>
              <button
                onClick={startVideoCall}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors text-white"
                title="Start Video Call"
              >
                <FaVideo size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-canva-bg">
              {messages.map((msg, idx) => {
                const isMe = msg.sender === username;
                return (
                  <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg text-sm ${isMe
                      ? 'bg-canva-primary text-white rounded-br-none'
                      : 'bg-white border border-gray-100 text-canva-text rounded-bl-none shadow-sm'
                      }`}>
                      {msg.type === 'JOIN' && <span className="text-xs italic block mb-1">{msg.sender} joined</span>}
                      {msg.type === 'LEAVE' && <span className="text-xs italic block mb-1">{msg.sender} left</span>}
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-canva-gray mt-1 px-1">{msg.sender}</span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 bg-canva-bg border border-transparent focus:border-canva-primary rounded-full px-4 py-2 text-sm outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="bg-canva-secondary text-canva-text p-2 rounded-full hover:brightness-95 disabled:opacity-50 transition-all"
              >
                <FaPaperPlane size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popup Video Call - TO LỚN, CHÍNH GIỮA MÀN HÌNH */}
      <AnimatePresence>
        {isVideoCallActive && currentRoomId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-7xl h-[90vh] max-h-[800px] relative rounded-3xl overflow-hidden shadow-4xl"
            >
              <VideoCallInterface
                onEndCall={() => setIsVideoCallActive(false)}
                remoteName="Admin"
                userRole="Visitor"
                roomId={currentRoomId}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;