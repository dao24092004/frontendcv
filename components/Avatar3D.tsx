import { motion } from 'framer-motion';

export const Avatar3D = ({ url }: { url: string }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative group"
    >
        {/* Soft Aura */}
        <div className="absolute -inset-8 bg-orange-500/5 rounded-full blur-[80px] group-hover:bg-orange-500/10 transition-colors duration-1000" />

        <div className="relative z-10 w-full max-w-[360px] h-[500px] rounded-[3rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] transition-transform duration-700 ease-out group-hover:scale-[1.01]">
            <img
                src={url}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            />
            {/* Minimal Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    </motion.div>
);