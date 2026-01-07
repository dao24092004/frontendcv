import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars, FaTimes } from 'react-icons/fa';

interface HeaderProps {
    fullName: string;
    hasProjects: boolean;
    hasSkills: boolean;
    hasResearch: boolean;
    hasEvents: boolean;
    children?: React.ReactNode; // Thêm children để nhận DarkModeSwitch
}

const Header: React.FC<HeaderProps> = ({ fullName, hasProjects, hasSkills, hasResearch, hasEvents, children }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [lang, setLang] = useState('vi');

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        const currentLang = localStorage.getItem('app_lang') || 'vi';
        setLang(currentLang);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const changeLanguage = (newLang: string) => {
        if (lang === newLang) return;
        localStorage.setItem('app_lang', newLang);
        window.location.reload();
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            window.scrollTo({ top: element.offsetTop - 80, behavior: 'smooth' });
        }
        setIsMobileMenuOpen(false);
    };

    return (
        <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${isScrolled ? 'py-4' : 'py-8'}`}>
            <div className="container mx-auto px-6">
                <div className={`flex items-center justify-between px-6 py-3 rounded-full transition-all duration-500 ${isScrolled ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg border border-orange-50 dark:border-slate-800' : 'bg-transparent'}`}>

                    {/* Logo */}
                    <div className="text-2xl font-black bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent cursor-pointer tracking-tighter" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        {fullName.split(' ').pop()?.toUpperCase()}.
                    </div>

                    {/* Right Side: Desktop Nav + Mode Switch + Lang Switcher */}
                    <div className="hidden md:flex items-center gap-6">
                        <nav className="flex gap-8">
                            {hasProjects && <button onClick={() => scrollToSection('projects')} className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-orange-500 transition-all">Projects</button>}
                            {hasSkills && <button onClick={() => scrollToSection('skills')} className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-orange-500 transition-all">Skills</button>}
                            {hasResearch && <button onClick={() => scrollToSection('publications')} className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-orange-500 transition-all">Research</button>}
                            {hasEvents && <button onClick={() => scrollToSection('events')} className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-orange-500 transition-all">Events</button>}
                        </nav>

                        <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 mx-2" />

                        {/* DarkModeSwitch truyền từ Home */}
                        {children}

                        {/* Language Switcher */}
                        <div className="flex gap-2 bg-gray-100/50 dark:bg-slate-800/50 p-1 rounded-full border border-gray-100 dark:border-slate-700">
                            <button onClick={() => changeLanguage('vi')} className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all ${lang === 'vi' ? 'border-orange-400 scale-110 shadow-sm' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg" className="w-full h-full object-cover" alt="VI" />
                            </button>
                            <button onClick={() => changeLanguage('en')} className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all ${lang === 'en' ? 'border-orange-400 scale-110 shadow-sm' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Flag_of_the_United_States.svg" className="w-full h-full object-cover" alt="EN" />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Button */}
                    <div className="md:hidden flex items-center gap-4">
                        {children}
                        <button className="text-2xl text-gray-700 dark:text-slate-300" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-full left-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-orange-50 dark:border-slate-800 p-8 flex flex-col gap-6 md:hidden">
                        {hasProjects && <button onClick={() => scrollToSection('projects')} className="text-2xl font-black text-left dark:text-white">Projects</button>}
                        {hasSkills && <button onClick={() => scrollToSection('skills')} className="text-2xl font-black text-left dark:text-white">Skills</button>}
                        {hasResearch && <button onClick={() => scrollToSection('publications')} className="text-2xl font-black text-left dark:text-white">Research</button>}
                        {hasEvents && <button onClick={() => scrollToSection('events')} className="text-2xl font-black text-left dark:text-white">Events</button>}
                        <div className="flex gap-4 pt-6 border-t border-gray-100 dark:border-slate-800 items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Language:</span>
                            <button onClick={() => changeLanguage('vi')} className={`font-black ${lang === 'vi' ? 'text-orange-500' : 'text-gray-300'}`}>VI</button>
                            <button onClick={() => changeLanguage('en')} className={`font-black ${lang === 'en' ? 'text-orange-500' : 'text-gray-300'}`}>EN</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Header;