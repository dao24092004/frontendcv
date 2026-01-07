import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export const Avatar3D = ({ url }: { url: string }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
    const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - rect.left - rect.width / 2);
        y.set(e.clientY - rect.top - rect.height / 2);

        const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
        const mouseY = (e.clientY - rect.top) / rect.height - 0.5;
        x.set(mouseX);
        y.set(mouseY);
    };

    return (
        <motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="relative w-full max-w-[420px] h-[580px] group cursor-pointer perspective-1000"
        >
            <div className="absolute -inset-4 bg-gradient-to-tr from-orange-500/20 to-indigo-500/20 rounded-[4.5rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -inset-2 border-2 border-orange-500/20 rounded-[4.5rem] animate-pulse" />

            <div className="relative z-10 w-full h-full bg-white/10 dark:bg-black/40 backdrop-blur-md border-[12px] border-white dark:border-slate-800 shadow-2xl rounded-[4rem] overflow-hidden">
                <motion.img
                    src={url}
                    className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700"
                    style={{ translateZ: 50 }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/10 to-transparent h-1/2 w-full -translate-y-full group-hover:animate-scan" />
            </div>
        </motion.div>
    );
};