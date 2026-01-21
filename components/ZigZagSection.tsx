import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Project } from '../types';
import ProjectModal from './ProjectModal';
import { getTranslation } from '../utils/translations';

interface ZigZagSectionProps {
  projects: Project[];
  visibleCount?: number;
  onShowMore?: () => void;
  hasMore?: boolean;
}

const ZigZagSection: React.FC<ZigZagSectionProps> = ({ 
  projects, 
  visibleCount = projects.length, 
  onShowMore, 
  hasMore = false 
}) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!projects || projects.length === 0) return null;

  const getShortDescription = (description: string): string => {
    if (!description) return '';
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
    setTimeout(() => setSelectedProject(null), 300);
  };

  return (
    <section className="py-3 md:py-5 bg-transparent overflow-hidden relative z-10">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-bold text-center text-canva-primary mb-3 md:mb-5 font-sans relative"
        >
          <span className="relative z-10">{getTranslation('projects.featuredProjects')}</span>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-canva-secondary rounded-full opacity-50"></span>
        </motion.h2>

        <div className="space-y-2 md:space-y-3">
          {projects.slice(0, visibleCount).map((project, index) => {
            const isEven = index % 2 === 0;
            const galleryImages = project.gallery && project.gallery.length > 0
              ? project.gallery
              : [project.imageUrl];

            const previewImages = galleryImages.slice(0, 3);

            return (
              <motion.div
                key={project.id || index}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ 
                  duration: 0.8, 
                  ease: "easeOut",
                  delay: index >= 3 ? (index - 3) * 0.2 : 0
                }}
                // SỬA QUAN TRỌNG: items-start để căn đỉnh trên cùng
                className={`flex flex-col md:flex-row items-start justify-between gap-4 lg:gap-8 w-full max-w-6xl mx-auto ${
                  isEven ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                {/* Image Side */}
                <div className="w-full md:w-1/2 relative group flex-shrink-0 max-w-[520px]">
                  {/* Tăng chiều cao lên h-72 hoặc h-80 để đủ chỗ cho các ảnh xếp chồng ko bị cắt */}
                  <div className="relative h-64 md:h-80 w-full"> 
                    
                    {/* Blob Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-canva-secondary to-canva-accent rounded-3xl opacity-20 blur-3xl scale-95 origin-top"></div>

                    {/* SỬA QUAN TRỌNG: Xóa 'flex items-center justify-center'. Thay bằng block. */}
                    <div className="relative w-full h-full block">
                      {previewImages.map((img, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }} 
                          // SỬA: Giảm độ lệch y để ảnh không trôi xuống quá sâu
                          whileInView={{ opacity: 1, y: i * 15 }} 
                          viewport={{ once: true }}
                          transition={{
                            duration: 0.6,
                            ease: 'easeOut',
                            delay: i * 0.1,
                          }}
                          // SỬA QUAN TRỌNG: 'top-0' để dính sát lên trên, 'left-0' hoặc 'left-1/2' để căn vị trí
                          // Thêm mx-auto và left-0 right-0 để căn giữa theo chiều ngang trong cột của nó
                          className="absolute top-0 left-0 right-0 mx-auto w-full md:w-[90%] aspect-video rounded-2xl overflow-hidden shadow-2xl border-4 border-white cursor-pointer hover:z-50"
                          style={{
                            zIndex: previewImages.length - i,
                            // Không dùng transform translate thủ công ở đây nữa vì Framer đã lo phần y
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectClick(project);
                          }}
                        >
                          <img
                            src={img}
                            alt={`${project.title} - ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Overlay */}
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                            <span className="text-white text-sm font-bold opacity-0 hover:opacity-100 transition-opacity">
                              {galleryImages.length > 1
                                ? `+ ${galleryImages.length - previewImages.length} ảnh nữa`
                                : 'Xem chi tiết'}
                            </span>
                          </div>
                        </motion.div>
                      ))}

                      {/* Badge số lượng ảnh */}
                      {galleryImages.length > 3 && (
                        <div className="absolute top-4 right-4 bg-canva-primary text-white px-3 py-1.5 rounded-full font-bold shadow-lg z-50 text-sm">
                          +{galleryImages.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content Side */}
                <div 
                  // SỬA: Thêm pt-1 hoặc pt-2 để dòng chữ ngang tầm mắt với cạnh trên của ảnh
                  className="w-full md:w-1/2 space-y-3 cursor-pointer group px-2 md:px-4 pt-1 z-20"
                  onClick={() => handleProjectClick(project)}
                >
                  <h3 className="text-2xl md:text-3xl font-bold text-canva-text group-hover:text-canva-primary transition-colors relative inline-block">
                    {project.title}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-canva-primary transition-all duration-300 group-hover:w-full"></span>
                  </h3>

                  {project.role && (
                    <p className="text-orange-500 font-semibold text-sm uppercase tracking-wide">
                      {project.role}
                    </p>
                  )}

                  <p className="text-canva-gray leading-relaxed text-sm md:text-base line-clamp-3">
                    {getShortDescription(project.description)}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {project.technologies.slice(0, 4).map((tech, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 text-xs font-semibold text-canva-text bg-white dark:bg-slate-800 border border-canva-secondary/50 rounded-full shadow-sm"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.technologies.length > 4 && (
                      <span className="px-2.5 py-1 text-xs font-semibold text-gray-400">
                        +{project.technologies.length - 4}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">
                    {getTranslation('projects.clickToViewDetails')}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {hasMore && onShowMore && (
          <div className="flex justify-center mt-8 md:mt-10">
            <motion.button
              onClick={onShowMore}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-orange-200 dark:border-slate-700 rounded-full font-bold text-slate-800 dark:text-slate-200 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all duration-300 shadow-lg flex items-center gap-3"
            >
              <span>Xem thêm dự án</span>
              <motion.div
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ↓
              </motion.div>
            </motion.button>
          </div>
        )}

        <div className="text-center mt-4">
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
            Hiển thị {Math.min(visibleCount, projects.length)} / {projects.length} dự án
          </span>
        </div>
      </div>

      <ProjectModal 
        project={selectedProject} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />
    </section>
  );
};

export default ZigZagSection;