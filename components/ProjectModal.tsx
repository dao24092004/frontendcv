import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaGithub, FaExternalLinkAlt, FaUser, FaCode, FaBriefcase } from 'react-icons/fa';
import { Project } from '../types';

interface ProjectModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ project, isOpen, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!project) return null;

  // Parse description into bullets if it contains newlines or is long
  const parseDescription = (desc: string): string[] => {
    if (!desc) return [];
    // If contains newlines, split by them
    if (desc.includes('\n')) {
      return desc.split('\n').filter(line => line.trim().length > 0);
    }
    // If very long, try to split by periods
    if (desc.length > 200) {
      return desc.split('.').filter(s => s.trim().length > 0).map(s => s.trim() + '.');
    }
    // Otherwise return as single item
    return [desc];
  };

  const descriptionBullets = parseDescription(project.description);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[90vh] 
                       bg-white dark:bg-slate-900 rounded-3xl shadow-2xl 
                       overflow-hidden flex flex-col z-[101]"
          >
            {/* Header with close button */}
            <div className="relative p-4 md:p-5 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 md:top-5 md:right-5 w-10 h-10 flex items-center justify-center 
                         rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-orange-500 hover:text-white 
                         transition-colors text-gray-600 dark:text-gray-400"
                aria-label="Close"
              >
                <FaTimes />
              </button>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white pr-12">
                {project.title}
              </h2>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
              {/* Project Image */}
              {project.imageUrl && (
                <div className="w-full h-40 md:h-56 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800">
                  <img
                    src={project.imageUrl}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Role */}
              {project.role && (
                <div className="flex items-start gap-2">
                  <FaBriefcase className="text-orange-500 mt-0.5 flex-shrink-0 text-sm" />
                  <div>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">
                      Vai trò
                    </p>
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      {project.role}
                    </p>
                  </div>
                </div>
              )}

              {/* Description - Bullet format */}
              {descriptionBullets.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                    Mô tả dự án
                  </p>
                  <ul className="space-y-1.5">
                    {descriptionBullets.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-orange-500 mt-1 flex-shrink-0 text-sm">•</span>
                        <span className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Technologies */}
              {project.technologies && project.technologies.length > 0 && (
                <div className="flex items-start gap-2">
                  <FaCode className="text-orange-500 mt-0.5 flex-shrink-0 text-sm" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                      Công nghệ sử dụng
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {project.technologies.map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 text-xs font-semibold 
                                   text-slate-800 dark:text-slate-200 
                                   bg-gray-100 dark:bg-slate-800 
                                   border border-gray-200 dark:border-slate-700 
                                   rounded-full"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Team Members */}
              {project.teamMembers && project.teamMembers.length > 0 && (
                <div className="flex items-start gap-2">
                  <FaUser className="text-orange-500 mt-0.5 flex-shrink-0 text-sm" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                      Thành viên dự án
                    </p>
                    <ul className="space-y-0.5">
                      {project.teamMembers.map((member, idx) => (
                        <li key={idx} className="text-slate-700 dark:text-slate-300 text-sm">
                          • {member}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Links */}
              {(project.demoUrl || project.repoUrl || project.sourceUrl) && (
                <div className="pt-3 border-t border-gray-200 dark:border-slate-700 flex flex-wrap gap-3">
                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 
                               bg-orange-500 text-white rounded-full 
                               hover:bg-orange-600 transition-colors font-semibold"
                    >
                      <FaExternalLinkAlt /> Live Demo
                    </a>
                  )}
                  {(project.repoUrl || project.sourceUrl) && (
                    <a
                      href={project.repoUrl || project.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 
                               bg-slate-900 dark:bg-slate-800 text-white rounded-full 
                               hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors font-semibold"
                    >
                      <FaGithub /> Source Code
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProjectModal;

