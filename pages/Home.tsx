import React, { useEffect, useState, useRef } from 'react';
import { portfolioService } from '../services/api';
import { PortfolioData } from '../types';
import Header from '../components/Header';
import ZigZagSection from '../components/ZigZagSection';
import ChatWidget from '../components/ChatWidget';
import MagneticWrapper from '../components/MagneticWrapper';
import DarkModeSwitch from '../components/DarkModeSwitch';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
// --- Đã thêm các Icon mới cần thiết cho giao diện Bento ---
import { FaEnvelope, FaGithub, FaLinkedin, FaDownload, FaExternalLinkAlt, FaAward, FaBookOpen, FaBriefcase, FaGraduationCap, FaTerminal, FaCode, FaRocket, FaFingerprint } from 'react-icons/fa';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useReactToPrint } from 'react-to-print';
import PortfolioPrintTemplate from '../components/PortfolioPrintTemplate';
import { TechScene } from '@/components/TechScene';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const Home: React.FC = () => {
    const [data, setData] = useState<PortfolioData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isDark, setIsDark] = useState(false);

    const stompClient = useRef<Client | null>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

    // --- THÊM LOGIC PARALLAX CHO HERO MỚI ---
    const yHero = useTransform(scrollYProgress, [0, 0.5], [0, 150]);
    const opacityHero = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

    const toggleDark = () => {
        setIsDark(!isDark);
        document.documentElement.classList.toggle('dark');
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: data ? `${data.fullName}_Portfolio` : 'Portfolio',
    });

    const fetchData = async () => {
        try {
            const result = await portfolioService.getPortfolioData();
            setData(result);
            setLoading(false);
        } catch (err) {
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
        return () => { if (stompClient.current) stompClient.current.deactivate(); };
    }, []);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCF0] dark:bg-black">
            <div className="flex flex-col items-center gap-4">
                <FaTerminal className="text-5xl text-orange-500 animate-pulse" />
                <span className="font-mono text-xs tracking-[0.5em] text-slate-400 uppercase">System Booting...</span>
            </div>
        </div>
    );

    if (error || !data) return <div className="p-20 text-center font-bold text-red-400">Connection Error</div>;

    const hasData = (arr: any) => arr && arr.length > 0;

    return (
        <div className={`min-h-screen font-sans transition-colors duration-700 selection:bg-orange-500 selection:text-white ${isDark ? 'bg-black text-slate-200' : 'bg-slate-50 text-[#1a1a1a]'
            }`}>

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

            {/* ============================================================================
               NEW HERO SECTION: "THE BENTO GRID & GLASS INTERFACE"
               Concept: Modern, clearly divided blocks, creating the feel of a high-tech Dashboard.
            ============================================================================= */}
            <section id="hero" className="relative min-h-screen flex items-center justify-center pt-32 pb-20 overflow-hidden px-4 md:px-8">
                <TechScene /> {/* 3D Background */}

                {/* Background Noise/Grid Overlay for texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light"></div>

                <motion.div
                    style={{ y: yHero, opacity: opacityHero }}
                    className="container mx-auto relative z-10 max-w-7xl"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* 1. BIG HEADLINE CARD (Spans 8 columns) */}
                        <div className="lg:col-span-8 bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] -z-10 group-hover:bg-orange-500/30 transition-colors duration-700" />

                            <div className="flex items-center gap-3 mb-8">
                                <span className="flex h-3 w-3 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span className="font-mono text-xs text-orange-600 dark:text-orange-400 tracking-widest uppercase">System Online • Ready to Deploy</span>
                            </div>

                            <h1 className="text-5xl md:text-7xl xl:text-8xl font-black tracking-tighter leading-[0.9] mb-6 text-slate-900 dark:text-white">
                                ENGINEERING <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-600">
                                    PERFECTION.
                                </span>
                            </h1>

                            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl font-medium leading-relaxed mb-10">
                                "{data.bio}"
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <MagneticWrapper strength={30}>
                                    <button
                                        onClick={() => handlePrint()}
                                        className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full font-bold tracking-wide hover:scale-105 transition-transform shadow-lg flex items-center gap-2"
                                    >
                                        <FaDownload /> DOWNLOAD CV
                                    </button>
                                </MagneticWrapper>
                                <div className="flex items-center gap-2 px-6 py-4 rounded-full border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                                    <FaFingerprint className="text-orange-500" />
                                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{data.fullName}</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. PROFILE IMAGE CARD (Spans 4 columns) */}
                        <div className="lg:col-span-4 relative group h-[500px] lg:h-auto">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-purple-600 rounded-[3rem] rotate-2 group-hover:rotate-0 transition-transform duration-500 opacity-80 blur-sm"></div>
                            <div className="absolute inset-0 bg-slate-900 rounded-[3rem] overflow-hidden border-4 border-white/20 shadow-2xl">
                                <img
                                    src={data.avatarUrl}
                                    alt={data.fullName}
                                    className="w-full h-full object-cover opacity-90 group-hover:scale-110 group-hover:opacity-100 transition-all duration-700 ease-out"
                                />
                                {/* Overlay text on image */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
                                    <p className="font-mono text-xs text-orange-400 mb-1">/// ID_VERIFIED</p>
                                    <h3 className="text-2xl font-bold text-white uppercase">{data.jobTitle}</h3>
                                </div>
                            </div>
                        </div>

                        {/* 3. STATS / TECH STACK BAR (Spans 12 columns - Full width) */}
                        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Tech Stack Mini-Card */}
                            <motion.div whileHover={{ y: -5 }} className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] flex items-center gap-4 shadow-sm">
                                <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl text-2xl">
                                    <FaCode />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Core Tech</p>
                                    <div className="flex gap-2 mt-1">
                                        {data.skills.slice(0, 3).map((s, i) => (
                                            <span key={i} className="text-sm font-bold text-slate-800 dark:text-slate-200">{s.name}{i < 2 ? ',' : ''}</span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Experience Mini-Card */}
                            <motion.div whileHover={{ y: -5 }} className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] flex items-center gap-4 shadow-sm">
                                <div className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl text-2xl">
                                    <FaRocket />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Experience</p>
                                    <p className="text-lg font-black text-slate-800 dark:text-slate-200">{data.workHistory.length}+ Years Active</p>
                                </div>
                            </motion.div>

                            {/* Social Links Mini-Card */}
                            <motion.div whileHover={{ y: -5 }} className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] flex items-center justify-between shadow-sm">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Connect</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Social Network</p>
                                </div>
                                <div className="flex gap-2">
                                    {data.contact.github && (
                                        <a href={data.contact.github} target="_blank" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-black hover:text-white transition-colors">
                                            <FaGithub />
                                        </a>
                                    )}
                                    {data.contact.linkedin && (
                                        <a href={data.contact.linkedin} target="_blank" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white transition-colors">
                                            <FaLinkedin />
                                        </a>
                                    )}
                                    <a href={`mailto:${data.contact.email}`} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-orange-500 hover:text-white transition-colors">
                                        <FaEnvelope />
                                    </a>
                                </div>
                            </motion.div>

                        </div>
                    </div>
                </motion.div>
            </section>
            {/* ================= END NEW HERO ================= */}

            {hasData(data.workHistory) && (
                <section id="experience" className="py-32 scroll-mt-20 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl border-y border-orange-50 dark:border-slate-800">
                    <div className="container mx-auto px-6">
                        <div className="flex items-center gap-6 mb-16">
                            <FaBriefcase className="text-4xl text-blue-400" />
                            <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase">Journey</h2>
                        </div>
                        <div className="space-y-12">
                            {data.workHistory.map((work, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    className="relative pl-8 border-l-2 border-gray-200 dark:border-slate-800"
                                >
                                    <div className="absolute w-4 h-4 bg-orange-400 rounded-full -left-[9px] top-2" />
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                        <div>
                                            <h3 className="text-2xl font-black">{work.role}</h3>
                                            <p className="text-lg font-bold text-orange-500">{work.company}</p>
                                        </div>
                                        <span className="px-4 py-2 bg-gray-100 dark:bg-slate-800 rounded-full text-xs font-black tracking-widest text-gray-500 uppercase">
                                            {work.startDate} — {work.endDate}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 dark:text-slate-400 leading-relaxed max-w-3xl whitespace-pre-wrap italic">{work.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {hasData(data.projects) && (
                <section id="projects" className="py-32 scroll-mt-20">
                    <div className="container mx-auto px-6 text-center mb-24">
                        <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase">Work Selection</h2>
                    </div>
                    <ZigZagSection projects={data.projects} />
                </section>
            )}

            {hasData(data.education) && (
                <section id="education" className="py-32 bg-slate-100 dark:bg-slate-900/80 rounded-[5rem] mx-4 scroll-mt-20 border border-white/20">
                    <div className="container mx-auto px-6">
                        <div className="flex items-center gap-6 mb-20">
                            <FaGraduationCap className="text-4xl text-purple-400" />
                            <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase">Education</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {data.education.map((edu, i) => (
                                <motion.div key={i} whileHover={{ y: -5 }} className="p-10 bg-white dark:bg-slate-800 rounded-[3rem] shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{edu.year}</span>
                                    <h3 className="text-2xl font-black mt-4 mb-2 uppercase">{edu.degree}</h3>
                                    <p className="text-orange-500 font-bold mb-4">{edu.school}</p>
                                    <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed">{edu.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {hasData(data.skills) && (
                <section id="skills" className="py-32 bg-transparent scroll-mt-20">
                    <div className="container mx-auto px-6">
                        <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-20 uppercase">My Arsenal</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            {data.skills.map((skill, index) => (
                                <motion.div key={index} whileHover={{ y: -10 }} className="p-10 bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-[3rem] border border-orange-50 dark:border-white/10 transition-all shadow-sm">
                                    <h3 className="text-sm font-black uppercase tracking-widest mb-4">{skill.name}</h3>
                                    <div className="h-2 w-full bg-white dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${skill.proficiency}%` }} transition={{ duration: 1.5 }} className="h-full bg-gradient-to-r from-orange-400 to-indigo-500" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {hasData(data.publications) && (
                <section id="publications" className="py-32 scroll-mt-20 bg-slate-950 text-white rounded-[5rem] mx-4">
                    <div className="container mx-auto px-6 max-w-4xl">
                        <div className="flex items-center gap-6 mb-16">
                            <FaBookOpen className="text-4xl text-orange-400" />
                            <h2 className="text-5xl font-black tracking-tighter">Research</h2>
                        </div>
                        <div className="space-y-6">
                            {data.publications?.map((pub, i) => (
                                <motion.div key={i} whileHover={{ x: 10 }} className="p-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 transition-all">
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-xl font-bold">{pub.title}</h3>
                                        <span className="text-xs font-black text-pink-400 uppercase tracking-widest">{pub.publisher || "Publisher N/A"} • {pub.releaseDate || "Year N/A"}</span>
                                    </div>
                                    <a href={pub.url} target="_blank" rel="noreferrer" className="p-4 bg-orange-400 text-white rounded-2xl hover:bg-white hover:text-orange-400 transition-all shadow-md">
                                        <FaExternalLinkAlt />
                                    </a>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {hasData(data.events) && (
                <section id="events" className="py-32 scroll-mt-20">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-24">
                            <h2 className="text-6xl md:text-8xl font-black tracking-tighter italic uppercase">Recognitions</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {data.events?.map((event, i) => (
                                <motion.div key={i} whileHover={{ y: -10 }} className="p-12 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-orange-100 dark:border-white/5 rounded-[4rem] group flex flex-col items-center text-center shadow-sm">
                                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl flex items-center justify-center text-3xl text-orange-400 mb-10 group-hover:rotate-12 transition-transform">
                                        <FaAward />
                                    </div>
                                    <h3 className="font-black text-2xl mb-4 leading-tight uppercase">{event.name}</h3>
                                    <p className="text-orange-400 text-xs font-black mb-4 tracking-widest uppercase">{event.role}</p>
                                    <p className="text-sm text-gray-400 italic line-clamp-3">{event.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <footer className="relative pt-40 pb-16 bg-white dark:bg-slate-900 rounded-t-[5rem] shadow-2xl border-t border-orange-50 dark:border-slate-800 overflow-hidden transition-colors">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 -z-0" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 -z-0" />

                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-16 mb-32">
                        <div className="space-y-6">
                            <h2 className="text-6xl md:text-8xl font-black tracking-[0.02em] leading-none uppercase">
                                Let's <br /> connect.
                            </h2>
                            <div className="inline-block px-4 py-1 border-b-4 border-orange-400 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                                AVAILABLE FOR NEW OPPORTUNITIES
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 md:gap-8">
                            {data.contact.github && (
                                <MagneticWrapper strength={20}>
                                    <a href={data.contact.github} target="_blank" rel="noreferrer" className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all shadow-sm">
                                        <FaGithub />
                                    </a>
                                </MagneticWrapper>
                            )}
                            {data.contact.linkedin && (
                                <MagneticWrapper strength={20}>
                                    <a href={data.contact.linkedin} target="_blank" rel="noreferrer" className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                        <FaLinkedin />
                                    </a>
                                </MagneticWrapper>
                            )}
                            <MagneticWrapper strength={20}>
                                <a href={`mailto:${data.contact.email}`} className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl hover:bg-orange-400 hover:text-white transition-all shadow-sm">
                                    <FaEnvelope />
                                </a>
                            </MagneticWrapper>
                        </div>
                    </div>

                    <div className="pt-16 border-t border-orange-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
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