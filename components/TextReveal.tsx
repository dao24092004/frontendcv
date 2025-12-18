import React from 'react';
import { motion, Variants } from 'framer-motion';

interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  highlightWords?: string[]; // Các từ cần tô màu nhấn
}

const TextReveal: React.FC<TextRevealProps> = ({ text, className = "", delay = 0, highlightWords = [] }) => {
  // Tách câu thành các từ
  const words = text.split(" ");

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: (i: number = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: delay * i },
    }),
  };

  const child: Variants = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.h1
      className={`overflow-hidden flex flex-wrap ${className}`}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {words.map((word, index) => {
        const isHighlight = highlightWords.includes(word.replace(/[^a-zA-Z]/g, ""));
        return (
          <motion.span 
            variants={child} 
            key={index} 
            className={`mr-[0.25em] ${isHighlight ? 'text-canva-primary' : ''}`}
          >
            {word}
          </motion.span>
        );
      })}
    </motion.h1>
  );
};

export default TextReveal;