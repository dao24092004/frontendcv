import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaArrowRight, FaGithub, FaExternalLinkAlt } from 'react-icons/fa';
import { Project } from '../types';

export const ProjectCarousel = ({ projects }: { projects: Project[] }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    const next = () => setActiveIndex((prev) => (prev + 1) % projects.length);
    const prev = () => setActiveIndex((prev) => (prev - 1 + projects.length) % projects.length);

    // Determine position for 3D effect
    const getCardStyle = (index: number) => {
        if (index === activeIndex) return { scale: 1, zIndex: 10, x: 0, rotateY: 0, opacity: 1 };
        if (index === (activeIndex - 1 + projects.length) % projects.length)
            return { scale: 0.8, zIndex: 5, x: -300, rotateY: 15, opacity: 0.6 };
        if (index === (activeIndex + 1) % projects.length)
            return { scale: 0.8, zIndex: 5, x: 300, rotateY: -15, opacity: 0.6 };
        return { scale: 0.6, zIndex: 1, x: 0, rotateY: 0, opacity: 0 }; // Hide others
    };

    return (
        <div className="relative h-[600px] w-full flex items-center justify-center perspective-1000 overflow-hidden">
            {projects.map((project, index) => {
                const style = getCardStyle(index);
                // Only render active, prev, and next for performance
                if (style.opacity === 0) return null;

                return (
                    <motion.div
                        key={index}
                        initial={false}
                        animate={style}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="absolute w-[350px] md:w-[500px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden"
                    >
                        <div className="h-64 overflow-hidden relative">
                            <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        </div>
                        <div className="p-8">
                            <h3 className="text-2xl font-black mb-2 dark:text-white">{project.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3 mb-6">{project.description}</p>
                            <div className="flex gap-4">
                                {project.sourceUrl && (
                                    <a href={project.sourceUrl} target="_blank" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-500 hover:underline">
                                        <FaGithub /> Source
                                    </a>
                                )}
                                {project.demoUrl && (
                                    <a href={project.demoUrl} target="_blank" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-500 hover:underline">
                                        <FaExternalLinkAlt /> Live Demo
                                    </a>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );
            })}

            {/* Controls */}
            <div className="absolute bottom-10 flex gap-4 z-20">
                <button onClick={prev} className="p-4 rounded-full bg-white dark:bg-slate-800 shadow-lg hover:bg-orange-500 hover:text-white transition-colors"><FaArrowLeft /></button>
                <button onClick={next} className="p-4 rounded-full bg-white dark:bg-slate-800 shadow-lg hover:bg-orange-500 hover:text-white transition-colors"><FaArrowRight /></button>
            </div>
        </div>
    );
};