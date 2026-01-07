import React from 'react';
import { motion } from 'framer-motion';
import { FaSun, FaMoon } from 'react-icons/fa';

interface Props {
    isDark: boolean;
    toggleDark: () => void;
}

const DarkModeSwitch: React.FC<Props> = ({ isDark, toggleDark }) => {
    return (
        <div
            onClick={toggleDark}
            className={`relative w-20 h-10 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-500 shadow-inner ${isDark ? 'bg-slate-800' : 'bg-orange-100'
                }`}
        >
            {/* Knob trượt */}
            <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${isDark ? 'bg-indigo-500' : 'bg-white'
                    }`}
                style={{ x: isDark ? 40 : 0 }}
            >
                {isDark ? (
                    <FaMoon className="text-white text-sm" />
                ) : (
                    <FaSun className="text-orange-400 text-sm" />
                )}
            </motion.div>

            {/* Biểu tượng ẩn tạo chiều sâu */}
            <div className="absolute inset-0 flex justify-between items-center px-3 opacity-20">
                <FaSun className={`${isDark ? 'text-transparent' : 'text-orange-400'}`} />
                <FaMoon className={`${isDark ? 'text-indigo-200' : 'text-transparent'}`} />
            </div>
        </div>
    );
};

export default DarkModeSwitch;