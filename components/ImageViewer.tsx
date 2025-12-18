import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface ImageViewerProps {
  images: string[]; // Mảng nhiều ảnh
}

const ImageViewer: React.FC<ImageViewerProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-full bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 text-sm">
        No Image
      </div>
    );
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  // Hiển thị tối đa 4 ảnh chồng lên nhau
  const stackCount = Math.min(images.length, 4);
  const stackImages = [];
  for (let i = 0; i < stackCount; i++) {
    const imgIndex = (currentIndex + i) % images.length;
    stackImages.push(images[imgIndex]);
  }

  const cardVariants: Variants = {
    front: {
      zIndex: 40,
      scale: 1,
      x: 0,
      y: 0,
      rotate: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 200, damping: 30 }
    },
    layer2: {
      zIndex: 30,
      scale: 0.96,
      x: 20,
      y: 15,
      rotate: 4,
      opacity: 0.9,
      transition: { duration: 0.6 }
    },
    layer3: {
      zIndex: 20,
      scale: 0.92,
      x: -15,
      y: 25,
      rotate: -3,
      opacity: 0.7,
      transition: { duration: 0.6 }
    },
    layer4: {
      zIndex: 10,
      scale: 0.88,
      x: 10,
      y: 35,
      rotate: 2,
      opacity: 0.5,
      transition: { duration: 0.6 }
    },
    exit: {
      x: 300,
      opacity: 0,
      rotate: 20,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center group">
      {/* Stack ảnh chồng lên nhau */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="popLayout">
          {stackImages.map((img, idx) => {
            const layerKey = `layer${idx + 1}` as keyof Variants;
            const variant = idx === 0 ? 'front' : layerKey;

            return (
              <motion.div
                key={`${img}-${currentIndex}-${idx}`}
                variants={cardVariants}
                initial={idx === 0 ? "layer2" : "layer3"}
                animate={variant}
                exit="exit"
                className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl border border-white/50"
              >
                <img
                  src={img}
                  alt={`Project image ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Nút điều hướng (hiện khi hover hoặc có nhiều ảnh) */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-white/80 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <FaChevronLeft size={20} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-white/80 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <FaChevronRight size={20} />
          </button>

          {/* Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
            {images.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-white w-6' : 'bg-white/50'
                  }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageViewer;