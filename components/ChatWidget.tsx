import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { FaCommentDots, FaPaperPlane, FaTimes, FaVideo } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import VideoCallInterface from './VideoCallInterface';

// Helper tạo ID ngẫu nhiên
const generateId = () => 'guest-' + Math.random().toString(36).substr(2, 9);

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  // Thông tin định danh khách
  const [visitorId, setVisitorId] = useState('');
  const [visitorName, setVisitorName] = useState('');

  const stompClientRef = useRef<Client | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Video Call State
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState('');

  // 1. Khởi tạo ID khi load trang
  useEffect(() => {
    let storedId = localStorage.getItem('cv_visitor_id');
    if (!storedId) {
      storedId = generateId();
      localStorage.setItem('cv_visitor_id', storedId);
    }
    setVisitorId(storedId);
    setVisitorName(`Guest ${storedId.substr(-4)}`);
  }, []);

  // 2. Kết nối Socket khi mở chat
  useEffect(() => {
    if (isOpen && visitorId && !stompClientRef.current) {
      connect();
    }
  }, [isOpen, visitorId]);

  // Scroll xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connect = () => {
    const socket = new SockJS('http://localhost:8080/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("Connected as " + visitorId);

        // A. Lắng nghe tin nhắn Admin trả lời RIÊNG mình
        client.subscribe(`/topic/private/${visitorId}`, (msg) => {
          const received = JSON.parse(msg.body);
          setMessages(prev => [...prev, received]);
        });
      }
    });
    client.activate();
    stompClientRef.current = client;
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !stompClientRef.current) return;

    const chatMsg = {
      sender: visitorName,
      senderId: visitorId, // Gửi kèm ID để Admin biết ai
      content: inputMessage,
      type: 'CHAT',
      timestamp: new Date().toLocaleTimeString()
    };

    // B. Gửi tin nhắn đến Admin
    stompClientRef.current.publish({
      destination: "/app/chat.sendToAdmin",
      body: JSON.stringify(chatMsg)
    });

    // Hiển thị tin nhắn của mình ngay lập tức
    setMessages(prev => [...prev, chatMsg]);
    setInputMessage('');
  };

  const startVideoCall = () => {
    const roomId = `room-${visitorId}-${Date.now()}`;
    setCurrentRoomId(roomId);
    setIsVideoCallActive(true);

    // Gửi yêu cầu gọi
    stompClientRef.current?.publish({
      destination: '/app/video.request',
      body: JSON.stringify({ roomId, visitorName })
    });
  };

  return (
    <>
      <motion.button onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-orange-500 text-white p-4 rounded-full shadow-lg hover:scale-110 transition">
        {isOpen ? <FaTimes /> : <FaCommentDots />}
      </motion.button>

      <AnimatePresence>
        {isOpen && !isVideoCallActive && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 right-6 w-80 h-[450px] bg-white rounded-2xl shadow-2xl flex flex-col border z-40 overflow-hidden">

            <div className="bg-orange-600 p-4 text-white flex justify-between items-center shadow-md">
              <div>
                <h3 className="font-bold">Hỗ trợ trực tuyến</h3>
                <p className="text-xs opacity-80">ID: {visitorId.substr(0, 8)}...</p>
              </div>
              <button onClick={startVideoCall} className="bg-white/20 p-2 rounded-full hover:bg-white/30"><FaVideo /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
              {messages.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">Xin chào! Bạn cần giúp gì?</p>}
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === visitorId;
                return (
                  <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2 rounded-xl text-sm max-w-[85%] ${isMe ? 'bg-orange-500 text-white rounded-br-none' : 'bg-white border text-gray-800 rounded-bl-none shadow-sm'}`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1">{msg.timestamp}</span>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2">
              <input
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Nhập tin nhắn..."
              />
              <button type="submit" className="text-orange-600 p-2 hover:bg-orange-50 rounded-full"><FaPaperPlane /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIDEO CALL */}
      {isVideoCallActive && (
        <VideoCallInterface roomId={currentRoomId} userRole="Visitor" remoteName="Admin" onEndCall={() => setIsVideoCallActive(false)} />
      )}
    </>
  );
};

export default ChatWidget;