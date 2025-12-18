import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, Variants } from 'framer-motion';

const CustomCursor: React.FC = () => {
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  // Vị trí chuột raw (cho chấm nhỏ - di chuyển tức thời)
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Vị trí chuột có lò xo (cho vòng tròn - di chuyển mượt)
  const springConfig = { damping: 20, stiffness: 300, mass: 0.5 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Logic phát hiện element tương tác
      const isClickable = 
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.closest('a') || 
        target.closest('button') ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        window.getComputedStyle(target).cursor === 'pointer';

      setIsHovering(!!isClickable);
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [mouseX, mouseY]);

  // Animation cho chấm nhỏ (Dot)
  const dotVariants: Variants = {
    default: { opacity: 1, scale: 1 },
    hover: { opacity: 0, scale: 0 }, // Ẩn chấm khi hover để nhường chỗ cho vòng tròn
  };

  // Animation cho vòng tròn (Ring)
  const ringVariants: Variants = {
    default: {
      height: 32,
      width: 32,
      x: -16,
      y: -16,
      backgroundColor: "transparent",
      borderColor: "#E6BAA3", // canva-primary
      borderWidth: 2,
      opacity: 0.6,
      scale: isClicking ? 0.8 : 1, // Nhỏ lại xíu khi click
    },
    hover: {
      height: 60,
      width: 60,
      x: -30,
      y: -30,
      backgroundColor: "rgba(181, 234, 215, 0.4)", // canva-secondary (Mint) mờ
      borderColor: "transparent",
      borderWidth: 0,
      opacity: 1,
      scale: isClicking ? 0.9 : 1,
    }
  };

  return (
    <>
      <style>{`
        body, a, button, input, textarea, label, [role="button"] { 
          cursor: none !important; 
        }
      `}</style>

      {/* Main Dot: Di chuyển tức thời theo chuột */}
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 bg-canva-text rounded-full pointer-events-none z-[9999]"
        style={{ x: mouseX, y: mouseY, translateX: -4, translateY: -4 }}
        variants={dotVariants}
        animate={isHovering ? "hover" : "default"}
        transition={{ duration: 0.2 }}
      />

      {/* Follower Ring: Di chuyển mượt (Spring) */}
      <motion.div
        className="fixed top-0 left-0 rounded-full pointer-events-none z-[9998] border-solid"
        style={{ x: springX, y: springY }}
        variants={ringVariants}
        animate={isHovering ? "hover" : "default"}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      />
    </>
  );
};

export default CustomCursor;