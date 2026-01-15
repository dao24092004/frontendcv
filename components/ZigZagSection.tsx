import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Project } from '../types';
import ImageViewer from './ImageViewer';
import ProjectModal from './ProjectModal';
import { getTranslation } from '../utils/translations';

interface ZigZagSectionProps {
  projects: Project[];
}

const ZigZagSection: React.FC<ZigZagSectionProps> = ({ projects }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!projects || projects.length === 0) return null;

  // Helper function to get short description (1-2 lines, ~120 chars)
  const getShortDescription = (description: string): string => {
    if (!description) return '';
    // Take first sentence or first 120 characters
    const firstSentence = description.split(/[.!?]/)[0];
    if (firstSentence.length <= 120) {
      return firstSentence + (description.includes('.') ? '.' : '');
    }
    return description.substring(0, 120).trim() + '...';
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Small delay to allow animation to complete
    setTimeout(() => setSelectedProject(null), 300);
  };

  return (
    <section className="py-8 md:py-12 bg-transparent overflow-hidden relative z-10">
      <div className="container mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-bold text-center text-canva-primary mb-8 md:mb-10 font-sans relative"
        >
          <span className="relative z-10">{getTranslation('projects.featuredProjects')}</span>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-canva-secondary rounded-full opacity-50"></span>
        </motion.h2>

        <div className="space-y-10 md:space-y-12">
          {projects.map((project, index) => {
            const isEven = index % 2 === 0;
            const galleryImages = project.gallery && project.gallery.length > 0
              ? project.gallery
              : [project.imageUrl];

            // Lấy 3 ảnh đầu để hiển thị chồng (nếu có)
            const previewImages = galleryImages.slice(0, 3);

            return (
              <motion.div
                key={project.id || index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`flex flex-col md:flex-row items-center gap-8 lg:gap-12 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
              >
                {/* Image Side - Ảnh chồng lên nhau + click mở viewer */}
                <div className="w-full md:w-1/2 relative group">
                  <div className="relative h-96 md:h-[28rem]">
                    {/* Hiệu ứng nền blob */}
                    <div className="absolute inset-0 bg-gradient-to-br from-canva-secondary to-canva-accent rounded-3xl opacity-20 blur-3xl scale-105"></div>

                    {/* Stack ảnh chồng */}
                    <div className="relative h-full flex items-center justify-center">
                      {previewImages.map((img, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.9, rotate: -10 }}
                          whileInView={{ opacity: 1, scale: 1, rotate: i * 5 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1 }}
                          className={`absolute w-80 md:w-96 rounded-2xl overflow-hidden shadow-2xl border-4 border-white cursor-pointer transition-all duration-500 hover:z-50 hover:scale-105`}
                          style={{
                            transform: `translate(${i * 20}px, ${i * 20}px) rotate(${i * 8}deg)`,
                            zIndex: previewImages.length - i,
                          }}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering project modal
                            // Mở viewer khi click vào bất kỳ ảnh nào
                            const viewer = document.getElementById(`image-viewer-${project.id || index}`);
                            if (viewer) {
                              (viewer as any).open(galleryImages);
                            }
                          }}
                        >
                          <img
                            src={img}
                            alt={`${project.title} - ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {/* Overlay khi hover */}
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                            <span className="text-white text-lg font-bold opacity-0 hover:opacity-100 transition-opacity">
                              {galleryImages.length > 1 ? `+ ${galleryImages.length - previewImages.length} ảnh nữa` : 'Xem chi tiết'}
                            </span>
                          </div>
                        </motion.div>
                      ))}

                      {/* Badge số lượng ảnh nếu có nhiều hơn 3 */}
                      {galleryImages.length > 3 && (
                        <div className="absolute -bottom-4 -right-4 bg-canva-primary text-white px-4 py-2 rounded-full font-bold shadow-lg z-50">
                          +{galleryImages.length - 3} ảnh
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ImageViewer ẩn - sẽ mở khi click */}
                  <ImageViewer id={`image-viewer-${project.id || index}`} images={galleryImages} />
                </div>

                {/* Content Side - Clickable to open modal */}
                <div 
                  className="w-full md:w-1/2 space-y-4 cursor-pointer group"
                  onClick={() => handleProjectClick(project)}
                >
                  {/* Project Title */}
                  <h3 className="text-3xl font-bold text-canva-text group-hover:text-canva-primary transition-colors relative inline-block">
                    {project.title}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-canva-primary transition-all duration-300 group-hover:w-full"></span>
                  </h3>

                  {/* Role - if available */}
                  {project.role && (
                    <p className="text-orange-500 font-semibold text-sm uppercase tracking-wide">
                      {project.role}
                    </p>
                  )}

                  {/* Short Description - 1-2 lines only */}
                  <p className="text-canva-gray leading-relaxed text-base line-clamp-2">
                    {getShortDescription(project.description)}
                  </p>

                  {/* Tech Stack - Compact display */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {project.technologies.slice(0, 5).map((tech, i) => (
                      <motion.span
                        key={i}
                        whileHover={{ scale: 1.05 }}
                        className="px-3 py-1 text-xs font-semibold text-canva-text bg-white dark:bg-slate-800 border border-canva-secondary/50 rounded-full shadow-sm transition-all"
                      >
                        {tech}
                      </motion.span>
                    ))}
                    {project.technologies.length > 5 && (
                      <span className="px-3 py-1 text-xs font-semibold text-gray-400">
                        +{project.technologies.length - 5} more
                      </span>
                    )}
                  </div>

                  {/* Hint text */}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 italic">
                    {getTranslation('projects.clickToViewDetails')}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Project Modal */}
      <ProjectModal 
        project={selectedProject} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />
    </section>
  );
};

export default ZigZagSection;