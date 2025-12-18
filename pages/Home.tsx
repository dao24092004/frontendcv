import React, { useEffect, useState } from 'react';
import { portfolioService } from '../services/api';
import { PortfolioData } from '../types';
import ZigZagSection from '../components/ZigZagSection';
import ChatWidget from '../components/ChatWidget';
import TextReveal from '../components/TextReveal';
import MagneticWrapper from '../components/MagneticWrapper';
import { motion, useScroll, useSpring, Variants } from 'framer-motion';
import { FaEnvelope, FaGithub, FaLinkedin, FaDownload } from 'react-icons/fa';

// Animation Variants
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.3 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } }
};

const Home: React.FC = () => {
    const [data, setData] = useState<PortfolioData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Scroll Progress Logic
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await portfolioService.getPortfolioData();
                setData(result);
            } catch (err) {
                setError(true);
                console.error("Failed to fetch portfolio data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canva-bg">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-canva-primary"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canva-bg text-canva-text">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Không thể kết nối Server</h2>
                    <p className="text-canva-gray">Vui lòng kiểm tra xem Backend (Port 8080) đã bật chưa.</p>
                </div>
            </div>
        );
    }

    // Tách tên để highlight họ hoặc tên
    const nameParts = data.fullName.split(' ');
    const lastName = nameParts[nameParts.length - 1];

    return (
        <div className="min-h-screen bg-canva-bg font-sans text-canva-text selection:bg-canva-primary selection:text-white relative overflow-hidden">

            {/* 1. Scroll Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-canva-primary to-canva-secondary origin-left z-[100]"
                style={{ scaleX }}
            />

            {/* 2. Ambient Background Blobs */}
            <div className="fixed inset-0 pointer-events-none -z-0 overflow-hidden">
                <motion.div
                    animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-canva-secondary/20 rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.3, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-canva-primary/20 rounded-full blur-[100px]"
                />
            </div>

            <div className="relative z-10">
                {/* Hero Section */}
                <header className="relative pt-20 pb-32 px-6 md:px-12 overflow-visible">
                    <div className="container mx-auto flex flex-col-reverse md:flex-row items-center gap-12">

                        {/* Text Content */}
                        <div className="w-full md:w-1/2 space-y-6 text-center md:text-left z-10">
                            <motion.span
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="inline-block px-4 py-1 bg-white/50 backdrop-blur-sm border border-canva-secondary/30 text-canva-text rounded-full text-sm font-medium tracking-wide shadow-sm"
                            >
                                ✨ {data.jobTitle}
                            </motion.span>

                            <div className="text-5xl md:text-7xl font-bold leading-tight min-h-[1.2em] tracking-tight">
                                <TextReveal
                                    text={`Hi, I'm ${data.fullName}`}
                                    highlightWords={[lastName]}
                                    delay={0.2}
                                />
                            </div>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-lg text-canva-gray leading-relaxed max-w-xl mx-auto md:mx-0"
                            >
                                {data.bio}
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="flex items-center justify-center md:justify-start gap-6 pt-6"
                            >
                                <MagneticWrapper strength={40}>
                                    <button
                                        onClick={portfolioService.downloadCV}
                                        className="flex items-center gap-3 bg-canva-text text-white px-8 py-4 rounded-full hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl group"
                                    >
                                        <FaDownload className="group-hover:translate-y-1 transition-transform" />
                                        <span className="font-medium">Download CV</span>
                                    </button>
                                </MagneticWrapper>

                                <div className="flex gap-4">
                                    {data.contact.github && (
                                        <MagneticWrapper strength={20}>
                                            <a href={data.contact.github} className="flex items-center justify-center w-12 h-12 bg-white rounded-full text-canva-gray hover:text-canva-primary shadow-sm hover:shadow-md transition-all text-xl"><FaGithub /></a>
                                        </MagneticWrapper>
                                    )}
                                    {data.contact.linkedin && (
                                        <MagneticWrapper strength={20}>
                                            <a href={data.contact.linkedin} className="flex items-center justify-center w-12 h-12 bg-white rounded-full text-canva-gray hover:text-canva-primary shadow-sm hover:shadow-md transition-all text-xl"><FaLinkedin /></a>
                                        </MagneticWrapper>
                                    )}
                                    {data.contact.email && (
                                        <MagneticWrapper strength={20}>
                                            <a href={`mailto:${data.contact.email}`} className="flex items-center justify-center w-12 h-12 bg-white rounded-full text-canva-gray hover:text-canva-primary shadow-sm hover:shadow-md transition-all text-xl"><FaEnvelope /></a>
                                        </MagneticWrapper>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        {/* Avatar */}
                        <div className="w-full md:w-1/2 flex justify-center relative z-10">
                            <div className="relative w-64 h-64 md:w-80 md:h-80 group">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    className="absolute -inset-4 border-2 border-dashed border-canva-primary/30 rounded-full"
                                />
                                <motion.div
                                    animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.7, 0.5] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="absolute inset-0 bg-gradient-to-tr from-canva-primary to-canva-secondary rounded-full blur-2xl transform translate-x-2 translate-y-2 opacity-50"
                                ></motion.div>
                                <motion.div
                                    whileHover={{ scale: 1.05, rotate: 2 }}
                                    className="relative z-10 w-full h-full overflow-hidden rounded-full border-4 border-white shadow-2xl"
                                >
                                    <img
                                        src={data.avatarUrl}
                                        alt={data.fullName}
                                        className="w-full h-full object-cover"
                                    />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Projects Section */}
                <ZigZagSection projects={data.projects} />

                {/* Skills Section */}
                <section className="py-20 bg-white/50 backdrop-blur-sm">
                    <div className="container mx-auto px-6">
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl font-bold text-center text-canva-primary mb-12"
                        >
                            Technical Skills
                        </motion.h2>

                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: "-50px" }}
                            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8"
                        >
                            {data.skills.map((skill) => (
                                <motion.div
                                    key={skill.id}
                                    variants={itemVariants}
                                    whileHover={{ y: -5, boxShadow: "0 15px 30px rgba(0,0,0,0.05)" }}
                                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 transition-all duration-300 relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-canva-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-canva-text text-lg">{skill.name}</h3>
                                            <span className="text-sm font-medium text-canva-gray bg-gray-100 px-2 py-0.5 rounded-full">{skill.proficiency}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                whileInView={{ width: `${skill.proficiency}%` }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 1.5, ease: "easeOut" }}
                                                className="bg-gradient-to-r from-canva-secondary to-canva-primary h-2.5 rounded-full"
                                            ></motion.div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* Timeline Section (Experience & Education) */}
                <section className="py-20 bg-transparent overflow-hidden">
                    <div className="container mx-auto px-6 max-w-4xl">
                        <h2 className="text-3xl font-bold text-center text-canva-primary mb-16">Experience & Education</h2>

                        <div className="relative">
                            <motion.div
                                initial={{ height: 0 }}
                                whileInView={{ height: "100%" }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.5 }}
                                className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-gray-200 origin-top"
                            ></motion.div>

                            {[...data.workHistory, ...data.education].map((item: any, index) => {
                                const isLeft = index % 2 === 0;
                                const isWork = 'company' in item;
                                const title = isWork ? item.role : item.degree;
                                const subtitle = isWork ? item.company : item.school;
                                const date = isWork ? `${item.startDate} - ${item.endDate}` : item.year;

                                return (
                                    <div key={index} className={`relative flex items-center justify-between mb-12 ${isLeft ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-5/12"></div>
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            whileInView={{ scale: 1 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: 0.2 }}
                                            className="z-20 flex items-center justify-center w-4 h-4 bg-white border-4 border-canva-primary rounded-full shadow-md"
                                        ></motion.div>
                                        <div className="w-5/12">
                                            <motion.div
                                                initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true, amount: 0.3 }}
                                                transition={{ duration: 0.5 }}
                                                className="p-6 bg-white rounded-xl shadow-soft hover:shadow-lg transition-all border border-gray-50"
                                            >
                                                <h3 className="font-bold text-lg text-canva-text">{title}</h3>
                                                <p className="text-sm text-canva-primary font-medium mb-2">{subtitle}</p>
                                                <p className="text-xs text-canva-gray mb-3 italic flex items-center gap-1">
                                                    <span className="w-2 h-2 bg-canva-secondary rounded-full inline-block"></span>
                                                    {date}
                                                </p>
                                                {'description' in item && <p className="text-sm text-canva-text opacity-80 leading-relaxed">{item.description}</p>}
                                            </motion.div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>

                {/* Footer (Dấu Ấn Cá Nhân) */}
                <footer className="bg-white/80 backdrop-blur-md pt-20 pb-10 border-t border-gray-100 mt-20 relative z-10">
                    <div className="container mx-auto px-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">

                            {/* Cột 1: Contact */}
                            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
                                <h3 className="font-bold text-canva-text text-lg border-b-2 border-canva-primary pb-1">Contact Me</h3>
                                <div className="text-4xl text-canva-primary">
                                    <FaEnvelope />
                                </div>
                                <a href={`mailto:${data.contact.email}`} className="text-lg font-medium text-canva-text hover:text-canva-primary transition-colors">
                                    {data.contact.email}
                                </a>
                            </div>

                            {/* Cột 2: Sở Trường */}
                            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
                                <h3 className="font-bold text-canva-text text-lg border-b-2 border-canva-secondary pb-1">My Strengths</h3>
                                <p className="text-canva-text text-md leading-relaxed font-semibold max-w-xs">
                                    {data.strengths || "Fullstack Development, System Architecture"}
                                </p>
                            </div>

                            {/* Cột 3: Phong Cách */}
                            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
                                <h3 className="font-bold text-canva-text text-lg border-b-2 border-canva-accent pb-1">Work Style</h3>
                                <p className="text-canva-text text-xl leading-relaxed font-serif italic max-w-xs">
                                    "{data.workStyle || "Discipline, Creativity, Perfectionism"}"
                                </p>
                            </div>

                        </div>

                        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-canva-gray">
                            <p>&copy; {new Date().getFullYear()} {data.fullName}. All rights reserved.</p>
                            <p>Designed & Built with React & Spring Boot</p>
                        </div>
                    </div>
                </footer>

                {/* Chat Widget Realtime - DUY NHẤT xử lý chat + gọi video */}
                <ChatWidget />
            </div>
        </div>
    );
};

export default Home;