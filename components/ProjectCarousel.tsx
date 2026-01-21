import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaArrowRight, FaGithub, FaExternalLinkAlt } from 'react-icons/fa';
import { Project } from '../types';

export const ProjectCarousel = ({ projects }: { projects: Project[] }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    const next = () => setActiveIndex((prev) => (prev + 1) % projects.length);
    const prev = () => setActiveIndex((prev) => (prev - 1 + projects.length) % projects.length);

    return (
        <div className="relative w-full flex flex-col items-start justify-start px-8 py-12 gap-8">
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-start gap-4 w-[300px] md:w-[400px]"
                >
                    {/* Image */}
                    <div className="w-full h-56 overflow-hidden relative rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700">
                        <img src={projects[activeIndex].imageUrl} alt={projects[activeIndex].title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    {/* Text Content - Below Image */}
                    <div className="w-full">
                        <h3 className="text-2xl font-black mb-3 dark:text-white">{projects[activeIndex].title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-4 mb-4">{projects[activeIndex].description}</p>
                        <div className="flex gap-4">
                            {projects[activeIndex].sourceUrl && (
                                <a href={projects[activeIndex].sourceUrl} target="_blank" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-500 hover:underline">
                                    <FaGithub /> Source
                                </a>
                            )}
                            {projects[activeIndex].demoUrl && (
                                <a href={projects[activeIndex].demoUrl} target="_blank" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-500 hover:underline">
                                    <FaExternalLinkAlt /> Live Demo
                                </a>
                            )}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <div className="flex gap-4">
                <button onClick={prev} className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-lg hover:bg-orange-500 hover:text-white transition-colors"><FaArrowLeft /></button>
                <button onClick={next} className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-lg hover:bg-orange-500 hover:text-white transition-colors"><FaArrowRight /></button>
            </div>
        </div>
    );
};