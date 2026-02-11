import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { portfolioService } from '../services/api';
import { PortfolioData } from '../types';
import Header from '../components/Header';
import DarkModeSwitch from '../components/DarkModeSwitch';
import ZigZagSection from '../components/ZigZagSection';
import ChatWidget from '../components/ChatWidget';
import MagneticWrapper from '../components/MagneticWrapper';
import { motion, useScroll, useSpring, useTransform, Variants } from 'framer-motion';
import { FaEnvelope, FaGithub, FaLinkedin, FaDownload, FaExternalLinkAlt, FaAward, FaBookOpen, FaBriefcase, FaGraduationCap, FaTerminal, FaCode, FaRocket, FaFingerprint, FaPhone, FaCog, FaBrain, FaUsers, FaLaptop, FaMicrochip, FaDesktop, FaHeartbeat, FaRobot, FaDumbbell } from 'react-icons/fa';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useReactToPrint } from 'react-to-print';
import PortfolioPrintTemplate from '../components/PortfolioPrintTemplate';
import { TechScene } from '@/components/TechScene';
import { getTranslation } from '../utils/translations';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const Home: React.FC = () => {
  const { id, rCode, lCode, dCode } = useParams();

  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // State để trigger re-render khi đổi ngôn ngữ
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'vi');

  const [visibleWorkItems, setVisibleWorkItems] = useState(5);
  const [visibleProjectItems, setVisibleProjectItems] = useState(3);

  const stompClient = useRef<Client | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  const yHero = useTransform(scrollYProgress, [0, 0.5], [0, 150]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 50, damping: 10 }
    }
  };

  const toggleDark = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleShowMoreWork = () => {
    setVisibleWorkItems(prev => prev + 5);
  };

  const handleShowMoreProjects = () => {
    setVisibleProjectItems(prev => prev + 3);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: data ? `${data.fullName}_Portfolio` : 'Portfolio',
  });

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      let result: PortfolioData;
      const params = [rCode, lCode, dCode].filter(Boolean);

      if (id && params.length === 3) {
        result = await portfolioService.getPortfolioByHierarchyCodes(rCode!, lCode!, dCode!, Number(id));
      } else if (id && params.length === 2) {
        result = await portfolioService.getPortfolioByLocalOrg(rCode!, lCode!, Number(id));
      } else if (id && params.length === 1) {
        result = await portfolioService.getPortfolioByRegion(rCode!, Number(id));
      } else if (id) {
        result = await portfolioService.getPortfolioById(Number(id));
      } else {
        result = await portfolioService.getPortfolioData();
      }

      setData(result);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const socket = new SockJS(`${API_BASE_URL}/ws`);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        client.subscribe('/topic/public/updates', (msg) => {
          if (msg.body === 'PROFILE_UPDATED') fetchData();
        });
      }
    });
    client.activate();
    stompClient.current = client;

    // Lắng nghe sự kiện đổi ngôn ngữ
    const handleStorageChange = () => {
      setLang(localStorage.getItem('app_lang') || 'vi');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('languageChanged', handleStorageChange);

    return () => {
      if (stompClient.current) stompClient.current.deactivate();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('languageChanged', handleStorageChange);
    };
  }, [id, rCode, lCode, dCode]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCF0] dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <FaTerminal className="text-5xl text-orange-500 animate-pulse" />
        <span className="font-mono text-xs tracking-[0.5em] text-slate-400 uppercase">System Booting...</span>
      </div>
    </div>
  );

  if (error || !data) return <div className="p-20 text-center font-bold text-red-400">Connection Error / Invalid Profile URL</div>;

  const hasData = (arr: any) => arr && arr.length > 0;

  const headingClassName = "text-5xl md:text-7xl font-black tracking-tighter uppercase text-slate-900 dark:text-white dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]";

  // ==================================================================================
  // 🔥 XỬ LÝ TÁCH CHUỖI TITLE | SUBTITLE 🔥
  // ==================================================================================
  const currentLang = localStorage.getItem('app_lang') || 'vi';

  // 1. Lấy chuỗi thô từ DB dựa trên ngôn ngữ (hoặc dùng mặc định nếu DB rỗng)
  // Mặc định: "ENGINEERING | PERFECTION."
  const rawTitle = currentLang === 'vi'
    ? (data.titleVi || "XIN CHÀO | CÁC BẠN")
    : (data.titleEn || "ENGINEERING | PERFECTION");

  // 2. Tách chuỗi bằng dấu gạch đứng "|"
  // Nếu nhập "Dòng 1 | Dòng 2" -> parts = ["Dòng 1", "Dòng 2"]
  // Nếu nhập "Chỉ một dòng" -> parts = ["Chỉ một dòng"]
  const parts = rawTitle.includes('|')
    ? rawTitle.split('|')
    : [rawTitle];

  const displayTitleLine1 = parts[0].trim(); // Dòng chữ trắng to
  const displayTitleLine2 = parts[1] ? parts[1].trim() : ""; // Dòng chữ gradient (nếu có)

  const systemOnline = getTranslation('hero.systemOnline');
  const sectionJourney = getTranslation('sections.journey');
  const sectionWorkSelection = getTranslation('sections.workSelection');
  const sectionEducation = getTranslation('sections.education');
  const sectionMyArsenal = getTranslation('sections.myArsenal');
  const sectionResearch = getTranslation('sections.research');
  const sectionRecognitions = getTranslation('sections.recognitions');
  const coreTech = getTranslation('stats.coreTech');
  const experience = getTranslation('stats.experience');
  const connect = getTranslation('stats.connect');
  const socialNetwork = getTranslation('stats.socialNetwork');
  const yearsActive = getTranslation('stats.yearsActive');
  const letsConnect = getTranslation('footer.letsConnect');
  const letsConnect2 = getTranslation('footer.letsConnect2');
  const availableForNewOpportunities = getTranslation('footer.availableForNewOpportunities');

  return (
    <div className={`min-h-screen font-sans transition-colors duration-700 selection:bg-orange-500 selection:text-white ${isDark ? 'bg-black text-slate-200' : 'bg-slate-50 text-[#1a1a1a]'}`}>

      <div className="hidden">
        <PortfolioPrintTemplate ref={printRef} data={data} />
      </div>

      <Header
        fullName={data.fullName}
        hasProjects={hasData(data.projects)}
        hasSkills={hasData(data.skills)}
        hasResearch={hasData(data.publications)}
        hasEvents={hasData(data.events)}
      >
        <DarkModeSwitch isDark={isDark} toggleDark={toggleDark} />
      </Header>

      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 origin-left z-[110]" style={{ scaleX }} />

      {/* ================= HERO SECTION ================= */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center pt-20 pb-16 md:pb-24 overflow-hidden px-4 md:px-8">
        {/* Space Background - Dark with stars */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-blue-950/20 to-slate-950">
          <TechScene isDark={true} />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
          {/* Additional star effects */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(2px 2px at 20% 30%, white, transparent), radial-gradient(2px 2px at 60% 70%, white, transparent), radial-gradient(1px 1px at 50% 50%, white, transparent), radial-gradient(1px 1px at 80% 10%, white, transparent), radial-gradient(2px 2px at 90% 60%, white, transparent)',
            backgroundSize: '200% 200%',
            opacity: 0.4
          }}></div>
        </div>

        <motion.div
          style={{ y: yHero, opacity: opacityHero }}
          className="container mx-auto relative z-10 max-w-6xl"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* MAIN PROFILE CARD - Layout như ảnh: Logo + Info bên trái, Ảnh bên phải */}
          <motion.div 
            variants={itemVariants} 
            className="relative bg-slate-900/30 backdrop-blur-xl rounded-[2.5rem] p-0 overflow-hidden"
            style={{
              border: '2px solid rgba(6, 182, 212, 0.3)',
              boxShadow: '0 0 60px rgba(6, 182, 212, 0.2), inset 0 0 60px rgba(6, 182, 212, 0.05)'
            }}
          >
            {/* Top glow line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* LEFT SECTION: Profile Image */}
              <div className="lg:col-span-5 p-8 md:p-10 relative flex items-center">
                {/* Blue glow effect behind image */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-transparent rounded-l-[2.5rem]"></div>
                
                <div className="relative w-full">
                  <div className="relative rounded-2xl overflow-hidden">
                    <motion.img
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.5 }}
                      src={data.avatarUrl}
                      alt={data.fullName}
                      className="w-full aspect-[3/4] object-cover rounded-2xl"
                      style={{
                        filter: 'brightness(0.95) contrast(1.1)'
                      }}
                    />
                    {/* Subtle overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent"></div>
                  </div>
                  
                  {/* Decorative corner lines */}
                  <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-cyan-400/50 rounded-tl-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-cyan-400/50 rounded-bl-2xl"></div>
                  <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-cyan-400/50 rounded-tr-2xl"></div>
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-cyan-400/50 rounded-br-2xl"></div>
                </div>
              </div>

              {/* Vertical divider line */}
              <div className="absolute left-[41.67%] top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent hidden lg:block"></div>

              {/* RIGHT SECTION: Logo + Info */}
              <div className="lg:col-span-7 p-8 md:p-10 space-y-8 text-white">
                {/* Logo Atom + Name */}
                <div className="flex items-center gap-6 pb-6 border-b border-cyan-500/20">
                  {/* Atom Logo */}
                  <div className="relative flex-shrink-0">
                    <div className="relative w-32 h-32">
                      {/* Center core with glow */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 bg-cyan-400 rounded-full shadow-[0_0_40px_rgba(6,182,212,1)]"></div>
                      </div>
                      {/* Orbit rings */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                        {/* Orbit 1 */}
                        <ellipse cx="50" cy="50" rx="45" ry="15" fill="none" stroke="rgba(6,182,212,0.5)" strokeWidth="2">
                          <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="3s" repeatCount="indefinite"/>
                        </ellipse>
                        <circle cx="95" cy="50" r="4" fill="#06b6d4">
                          <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="3s" repeatCount="indefinite"/>
                        </circle>
                        
                        {/* Orbit 2 */}
                        <ellipse cx="50" cy="50" rx="45" ry="15" fill="none" stroke="rgba(6,182,212,0.5)" strokeWidth="2" transform="rotate(60 50 50)">
                          <animateTransform attributeName="transform" type="rotate" from="60 50 50" to="420 50 50" dur="2.5s" repeatCount="indefinite"/>
                        </ellipse>
                        <circle cx="95" cy="50" r="4" fill="#3b82f6" transform="rotate(60 50 50)">
                          <animateTransform attributeName="transform" type="rotate" from="60 50 50" to="420 50 50" dur="2.5s" repeatCount="indefinite"/>
                        </circle>
                        
                        {/* Orbit 3 */}
                        <ellipse cx="50" cy="50" rx="45" ry="15" fill="none" stroke="rgba(6,182,212,0.5)" strokeWidth="2" transform="rotate(120 50 50)">
                          <animateTransform attributeName="transform" type="rotate" from="120 50 50" to="480 50 50" dur="3.5s" repeatCount="indefinite"/>
                        </ellipse>
                        <circle cx="95" cy="50" r="4" fill="#8b5cf6" transform="rotate(120 50 50)">
                          <animateTransform attributeName="transform" type="rotate" from="120 50 50" to="480 50 50" dur="3.5s" repeatCount="indefinite"/>
                        </circle>
                      </svg>
                    </div>
                  </div>

                  {/* Name & Title */}
                  <div className="flex-1">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2 text-white">
                      {data.fullName}
                    </h1>
                    <p className="text-xl text-cyan-300 font-normal mb-1">{data.jobTitle}</p>
                    <p className="text-sm text-slate-400 tracking-wide">
                      PITECH LAB / INNOTECH SOLUTIONS
                    </p>
                  </div>
                </div>

                {/* Expertise Section */}
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-5 tracking-wide">Expertise</h3>
                  <div className="space-y-4">
                    {data.skills.slice(0, 4).map((skill, i) => (
                      <div key={i} className="flex items-center gap-4 text-slate-200">
                        <FaCog className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                        <span className="text-base font-light">{skill.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Focus Areas Section */}
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-5 tracking-wide">Focus Areas</h3>
                  <div className="space-y-4">
                    {data.workHistory.slice(0, 6).map((work, i) => (
                      <div key={i} className="flex items-center gap-4 text-slate-200">
                        <FaBriefcase className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                        <span className="text-base font-light">{work.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Contact Bar */}
            <div className="border-t border-cyan-500/20 px-8 md:px-10 py-5 flex flex-wrap items-center justify-center gap-8 bg-slate-900/20">
              <div className="flex items-center gap-3 text-white">
                <FaPhone className="w-5 h-5 text-cyan-400" />
                <span className="text-base font-light">0904 140 022</span>
              </div>
              <div className="flex items-center gap-3 text-white">
                <FaEnvelope className="w-5 h-5 text-cyan-400" />
                <span className="text-base font-light">{data.contact.email}</span>
              </div>
            </div>

            {/* Bottom glow line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60"></div>
          </motion.div>

          {/* Download CV Button */}
          <div className="mt-8 flex justify-center">
            <MagneticWrapper strength={30}>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(6,182,212,0.6)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePrint()}
                className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-semibold tracking-wide shadow-lg flex items-center gap-3 border border-cyan-400/50 hover:border-cyan-300"
              >
                <FaDownload className="text-lg" /> DOWNLOAD CV
              </motion.button>
            </MagneticWrapper>
          </div>

          {/* STATS CARDS - Simplified */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <motion.div 
              variants={itemVariants} 
              whileHover={{ y: -5, boxShadow: "0 0 30px rgba(6,182,212,0.3)" }} 
              className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 p-6 rounded-2xl flex items-center gap-4"
            >
              <div className="p-4 bg-cyan-500/20 text-cyan-400 rounded-xl text-2xl"><FaCode /></div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{coreTech}</p>
                <div className="flex gap-2 mt-1 text-white text-sm">{data.skills.slice(0, 2).map((s, i) => (<span key={i} className="font-light">{s.name}{i < 1 ? ',' : ''}</span>))}</div>
              </div>
            </motion.div>
            <motion.div 
              variants={itemVariants} 
              whileHover={{ y: -5, boxShadow: "0 0 30px rgba(6,182,212,0.3)" }} 
              className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 p-6 rounded-2xl flex items-center gap-4"
            >
              <div className="p-4 bg-purple-500/20 text-purple-400 rounded-xl text-2xl"><FaRocket /></div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{experience}</p>
                <p className="text-lg font-bold text-white">{data.workHistory.length}+ {yearsActive}</p>
              </div>
            </motion.div>
            <motion.div 
              variants={itemVariants} 
              whileHover={{ y: -5, boxShadow: "0 0 30px rgba(6,182,212,0.3)" }} 
              className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 p-6 rounded-2xl flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{connect}</p>
                <p className="text-sm font-light text-white">{socialNetwork}</p>
              </div>
              <div className="flex gap-2">
                {data.contact.github && (<a href={data.contact.github} target="_blank" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-cyan-500 text-white transition-colors border border-cyan-500/30"><FaGithub /></a>)}
                {data.contact.linkedin && (<a href={data.contact.linkedin} target="_blank" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-blue-600 text-white transition-colors border border-cyan-500/30"><FaLinkedin /></a>)}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ================= JOURNEY SECTION ================= */}
      {hasData(data.workHistory) && (
        <section id="experience" className="pt-12 md:pt-16 pb-6 md:pb-10 scroll-mt-20 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl border-y border-orange-50 dark:border-slate-800">
          <div className="container mx-auto px-6">
            <div className="flex items-center gap-4 mb-6">
              <FaBriefcase className="text-3xl text-blue-400" />
              <h2 className={headingClassName}>{sectionJourney}</h2>
            </div>
            <div className="space-y-6 md:space-y-8 px-5">
              {data.workHistory.slice(0, visibleWorkItems).map((work, i) => (
                <motion.div
                  key={`work-item-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i >= 5 ? (i - 5) * 0.1 : 0 }}
                  className="relative pl-8 border-l-2 border-gray-200 dark:border-slate-700 group"
                >
                  <motion.div className="absolute w-4 h-4 bg-orange-400 rounded-full -left-[9px] top-2 transition-all duration-300 group-hover:scale-150 group-hover:bg-blue-500 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{work.role}</h3>
                      <p className="text-base md:text-lg font-bold text-orange-500">{work.company}</p>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-full text-[10px] md:text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                      {work.startDate} — {work.endDate}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-200 leading-relaxed max-w-3xl whitespace-pre-wrap font-medium text-justify text-sm md:text-base">{work.description}</p>
                </motion.div>
              ))}
            </div>

            {visibleWorkItems < data.workHistory.length && (
              <div className="flex justify-center mt-6">
                <motion.button
                  onClick={handleShowMoreWork}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-orange-200 dark:border-slate-700 rounded-full font-bold text-slate-800 dark:text-slate-200 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all duration-300 shadow-lg flex items-center gap-2 text-sm"
                >
                  <span>Xem thêm</span>
                  <motion.div animate={{ y: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>↓</motion.div>
                </motion.button>
              </div>
            )}

            <div className="text-center mt-2">
              <span className="text-[10px] md:text-xs font-mono text-slate-400 dark:text-slate-500">
                Hiển thị {Math.min(visibleWorkItems, data.workHistory.length)} / {data.workHistory.length} kinh nghiệm
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ================= PROJECTS SECTION ================= */}
      {hasData(data.projects) && (
        <section id="projects" className="pt-6 md:pt-8 pb-2 scroll-mt-20">
          <div className="container mx-auto px-6 text-center mb-2">
            <h2 className={`text-5xl md:text-7xl font-black tracking-tighter uppercase transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'}`}>{sectionWorkSelection}</h2>
          </div>
          <ZigZagSection
            projects={data.projects}
            visibleCount={visibleProjectItems}
            onShowMore={handleShowMoreProjects}
            hasMore={visibleProjectItems < data.projects.length}
            isDark={isDark}
          />
        </section>
      )}

      {/* ================= EDUCATION SECTION ================= */}
      {hasData(data.education) && (
        <section id="education" className="py-6 md:py-10 bg-slate-100 dark:bg-slate-900/80 rounded-[3rem] mx-4 scroll-mt-20 border border-white/20">
          <div className="container mx-auto px-6">
            <div className="flex items-center gap-4 mb-6">
              <FaGraduationCap className="text-3xl text-purple-400" />
              <h2 className={headingClassName}>{sectionEducation}</h2>
            </div>
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={containerVariants}>
              {data.education.map((edu, i) => (
                <motion.div key={i} variants={itemVariants} whileHover={{ y: -5, borderColor: "rgba(249, 115, 22, 0.5)" }} className="p-6 bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{edu.year}</span>
                  <h3 className="text-xl md:text-2xl font-black mt-2 mb-1 uppercase text-slate-900 dark:text-white">{edu.degree}</h3>
                  <p className="text-orange-500 font-bold mb-2 text-sm md:text-base">{edu.school}</p>
                  <p className="text-slate-500 dark:text-slate-200 text-sm leading-relaxed font-medium">{edu.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ================= SKILLS SECTION ================= */}
      {hasData(data.skills) && (
        <section id="skills" className="py-6 md:py-10 bg-transparent scroll-mt-20">
          <div className="container mx-auto px-6">
            <h2 className={`text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'}`}>{sectionMyArsenal}</h2>
            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={containerVariants}>
              {data.skills.map((skill, index) => (
                <motion.div key={index} variants={itemVariants} whileHover={{ y: -5, scale: 1.02 }} className="p-6 bg-white/95 dark:bg-white/5 backdrop-blur-lg rounded-[2rem] border border-orange-100 dark:border-white/10 transition-all shadow-md hover:shadow-xl">
                  <h3 className={`text-xs md:text-sm font-black uppercase tracking-widest mb-3 transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'}`}>{skill.name}</h3>
                  <div className="h-1.5 w-full bg-white/60 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${skill.proficiency}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-gradient-to-r from-orange-400 to-indigo-500" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ================= PUBLICATIONS SECTION ================= */}
      {hasData(data.publications) && (
        <section id="publications" className="py-6 md:py-10 scroll-mt-20 bg-slate-950 text-white rounded-[3rem] mx-4">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="flex items-center gap-4 mb-6">
              <FaBookOpen className="text-3xl text-orange-400" />
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter">{sectionResearch}</h2>
            </div>
            <motion.div className="space-y-4" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={containerVariants}>
              {data.publications?.map((pub, i) => (
                <motion.div key={i} variants={itemVariants} whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.1)" }} className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 transition-all">
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg md:text-xl font-bold">{pub.title}</h3>
                    <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">{pub.publisher || "Publisher N/A"} • {pub.releaseDate || "Year N/A"}</span>
                  </div>
                  <a href={pub.url} target="_blank" rel="noreferrer" className="p-3 bg-orange-400 text-white rounded-xl hover:bg-white hover:text-orange-400 transition-all shadow-md">
                    <FaExternalLinkAlt className="text-sm" />
                  </a>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ================= EVENTS SECTION ================= */}
      {hasData(data.events) && (
        <section id="events" className="py-6 md:py-10 scroll-mt-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-6">
              <h2 className={`text-5xl md:text-7xl font-black tracking-tighter uppercase italic transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'}`}>{sectionRecognitions}</h2>
            </div>
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={containerVariants}>
              {data.events?.map((event, i) => (
                <motion.div key={i} variants={itemVariants} whileHover={{ y: -5, rotate: 1 }} className="p-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-orange-100 dark:border-white/5 rounded-[3rem] group flex flex-col items-center text-center shadow-sm hover:border-orange-400/50 transition-colors">
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-lg flex items-center justify-center text-2xl text-orange-400 mb-4 group-hover:rotate-12 transition-transform">
                    <FaAward />
                  </div>
                  <h3 className={`font-black text-xl mb-2 leading-tight uppercase transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-900'}`}>{event.name}</h3>
                  <p className="text-orange-400 text-[10px] font-black mb-2 tracking-widest uppercase">{event.role}</p>
                  <p className={`text-sm italic line-clamp-3 transition-colors duration-300 ${isDark ? 'text-slate-200' : 'text-slate-500'}`}>{event.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="relative pt-10 pb-10 bg-white dark:bg-slate-900 rounded-t-[3rem] shadow-2xl border-t border-orange-50 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 -z-0" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 -z-0" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8 md:mb-12">
            <div className="space-y-4">
              <h2 className="text-5xl md:text-7xl font-black tracking-[0.02em] leading-none uppercase text-slate-900 dark:text-white">
                {letsConnect} <br /> {letsConnect2}
              </h2>
              <div className="inline-block px-4 py-1 border-b-4 border-orange-400 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                {availableForNewOpportunities}
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              {data.contact.github && (
                <MagneticWrapper strength={20}>
                  <a href={data.contact.github} target="_blank" rel="noreferrer" className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xl hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all shadow-sm">
                    <FaGithub />
                  </a>
                </MagneticWrapper>
              )}
              {data.contact.linkedin && (
                <MagneticWrapper strength={20}>
                  <a href={data.contact.linkedin} target="_blank" rel="noreferrer" className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                    <FaLinkedin />
                  </a>
                </MagneticWrapper>
              )}
              <MagneticWrapper strength={20}>
                <a href={`mailto:${data.contact.email}`} className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xl hover:bg-orange-400 hover:text-white transition-all shadow-sm">
                  <FaEnvelope />
                </a>
              </MagneticWrapper>
            </div>
          </div>

          <div className="pt-8 border-t border-orange-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <span>© {new Date().getFullYear()} {data.fullName.toUpperCase()}</span>
            <span>DESIGNED WITH CANVA AESTHETICS • REACT • GROQ AI • THREE.JS</span>
          </div>
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
};

export default Home;