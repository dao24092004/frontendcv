import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface SkillProps {
    name: string;
    proficiency: number;
    description?: string; // Add this to your types if needed, or use a default
}

export const SkillFlipCard = ({ skill }: { skill: SkillProps }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div
            className="group h-64 w-full perspective-1000 cursor-pointer"
            onMouseEnter={() => setIsFlipped(true)}
            onMouseLeave={() => setIsFlipped(false)}
        >
            <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                className="relative h-full w-full transform-style-3d"
            >
                {/* Front Face */}
                <div className="absolute inset-0 backface-hidden rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-xl flex flex-col items-center justify-center p-6">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl font-black text-orange-500">{skill.name.charAt(0)}</span>
                    </div>
                    <h3 className="text-xl font-bold dark:text-white">{skill.name}</h3>
                    <div className="mt-4 w-full bg-gray-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500" style={{ width: `${skill.proficiency}%` }} />
                    </div>
                </div>

                {/* Back Face */}
                <div className="absolute inset-0 backface-hidden rounded-2xl bg-slate-900 text-white rotate-y-180 p-6 flex flex-col items-center justify-center text-center border border-orange-500/30">
                    <h4 className="text-lg font-bold text-orange-400 mb-2">Experience</h4>
                    <p className="text-sm text-gray-300">
                        Proficiency Level: {skill.proficiency}% <br />
                        Used in production environments for backend scalability.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};