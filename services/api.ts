import axios from 'axios';
import { PortfolioData, Project, Skill, ChatMessage, WorkExperience, Region, LocalOrg, Department } from './../types/index';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const API_URL = `${API_BASE_URL}/api/v1`;

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const lang = localStorage.getItem('app_lang') || 'vi';
  config.headers['Accept-Language'] = lang;
  return config;
});

const resolveImageUrl = (url: string | null | undefined) => {
  if (!url) return "https://placehold.co/600x400?text=No+Image";
  if (url.startsWith('http')) return url;
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${cleanPath}`;
};

const mapBackendToFrontend = (data: any): PortfolioData => {
  return {
    id: data.id,
    fullName: data.fullName,
    jobTitle: data.jobTitle,
    bio: data.bio,
    avatarUrl: resolveImageUrl(data.avatarUrl),
    strengths: data.strengths || "Problem Solving",
    workStyle: data.workStyle || "Professional",

    // --- Map thông tin tổ chức ---
    regionName: data.regionName,
    localOrgName: data.localOrgName,
    departmentName: data.departmentName,
    departmentId: data.departmentId,

    contact: {
      email: data.contact?.email || "",
      github: data.contact?.github || "",
      linkedin: data.contact?.linkedin || "",
      location: data.contact?.address || "Unknown",
      phone: data.contact?.phone
    },
    projects: Array.isArray(data.projects) ? data.projects.map((p: any) => ({
      id: p.id,
      title: p.name || p.nameVi || p.nameEn,
      description: p.description || p.descriptionVi || p.descriptionEn,
      imageUrl: resolveImageUrl(p.imageUrl),
      gallery: p.gallery || [],
      technologies: p.techStack ? p.techStack.split(',').map((s: string) => s.trim()) : [],
      repoUrl: p.sourceCodeUrl,
      role: p.role || p.roleVi || p.roleEn,
      customer: p.customer
    })) : [],
    workHistory: Array.isArray(data.workHistory) ? data.workHistory.map((w: any) => ({
      id: w.id,
      company: w.companyName,
      role: w.position,
      startDate: w.startDate || "N/A",
      endDate: w.endDate || "Present",
      description: w.description,
      isCurrent: w.isCurrent
    })) : [],
    skills: Array.isArray(data.skills) ? data.skills.map((s: any) => ({
      id: s.id,
      name: s.name,
      proficiency: s.proficiency,
      category: s.category
    })) : [],
    education: Array.isArray(data.education) ? data.education.map((e: any) => ({
      id: e.id,
      school: e.school,
      degree: e.degree,
      year: e.period,
      description: e.description,
      startDate: e.startDate,
      endDate: e.endDate
    })) : [],
    publications: Array.isArray(data.publications) ? data.publications.map((p: any) => ({
      id: p.id,
      title: p.title,
      publisher: p.publisher,
      releaseDate: p.releaseDate,
      url: p.link || p.url
    })) : [],
    events: Array.isArray(data.events) ? data.events.map((e: any) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      date: e.date,
      description: e.description,
      imageUrl: resolveImageUrl(e.imageUrl)
    })) : []
  };
};

export const portfolioService = {
  getPortfolioData: async (): Promise<PortfolioData> => {
    const response = await api.get('/portfolio');
    return mapBackendToFrontend(response.data);
  },
  getPortfolioById: async (id: number): Promise<PortfolioData> => {
    const response = await api.get(`/admin/portfolio/${id}`);
    return mapBackendToFrontend(response.data);
  },
  getPortfolioByHierarchyCodes: async (
    rCode: string,
    lCode: string,
    dCode: string,
    pid: number
  ): Promise<PortfolioData> => {
    const response = await api.get(`/view/code/${rCode}/${lCode}/${dCode}/${pid}`);
    return mapBackendToFrontend(response.data);
  },
  downloadCV: async () => window.open(`${API_URL}/export/cv-data`, '_blank'),
  getChatHistory: async () => (await api.get<ChatMessage[]>('/chat/history')).data
};

export const adminService = {
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return (await api.post<string>('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  getAllProfiles: async () => (await api.get('/admin/list')).data,

  updateProfile: async (data: any) => {
    // API update profile chấp nhận cả các field cũ và departmentId
    return api.put('/admin/profile', data);
  },

  activateProfile: async (id: number) => api.post(`/admin/profile/${id}/activate`),
  importCV: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/import-cv', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getProjectDetail: (id: number) => api.get(`/admin/projects/${id}`),

  // ============================================================
  // QUẢN LÝ TỔ CHỨC (ORGANIZATION) - FULL CRUD
  // ============================================================

  // 1. REGION (Vùng)
  getRegions: async () => (await api.get<Region[]>('/org/regions')).data,
  createRegion: async (data: { name: string; code: string }) => api.post('/org/regions', data),
  updateRegion: async (id: number, data: { name: string; code: string }) => api.put(`/org/regions/${id}`, data),
  deleteRegion: async (id: number) => api.delete(`/org/regions/${id}`),

  // 2. LOCAL ORG (Chi nhánh)
  getLocals: async () => (await api.get<LocalOrg[]>('/org/locals')).data,
  createLocal: async (data: { name: string; code: string; regionId: number }) => api.post('/org/locals', data),
  updateLocal: async (id: number, data: { name: string; code: string; regionId: number }) => api.put(`/org/locals/${id}`, data),
  deleteLocal: async (id: number) => api.delete(`/org/locals/${id}`),

  // 3. DEPARTMENT (Phòng ban)
  getDepartments: async () => (await api.get<Department[]>('/org/departments')).data,
  createDepartment: async (data: { name: string; code: string; localOrgId: number }) => api.post('/org/departments', data),
  updateDepartment: async (id: number, data: { name: string; code: string; localOrgId: number }) => api.put(`/org/departments/${id}`, data),
  deleteDepartment: async (id: number) => api.delete(`/org/departments/${id}`),

  // 4. GÁN USER VÀO TỔ CHỨC
  assignUserToOrg: async (profileId: number, departmentId: number) => {
    const payload = { id: profileId, departmentId: departmentId };
    return api.put('/admin/profile', payload);
  },

  // ============================================================
  // CÁC MODULE KHÁC - GIỮ NGUYÊN
  // ============================================================

  // Projects
  createProject: async (project: Project, profileId: number) => api.post('/admin/projects', { ...project, profileId }),
  updateProject: async (project: Project, profileId: number) => api.put(`/admin/projects/${project.id}`, { ...project, id: project.id, profileId }),
  deleteProject: (id: number) => api.delete(`/admin/projects/${id}`),

  // Skills
  addSkill: (skill: Skill, profileId: number) => api.post('/admin/skills', { ...skill, profileId }),
  updateSkill: (skill: Skill, profileId: number) => api.put(`/admin/skills/${skill.id}`, { ...skill, id: skill.id, profileId }),
  deleteSkill: (id: number) => api.delete(`/admin/skills/${id}`),

  // Experiences
  addExperience: (exp: WorkExperience, profileId: number) => api.post('/admin/experiences', { ...exp, profileId }),
  updateExperience: (exp: WorkExperience, profileId: number) => api.put(`/admin/experiences/${exp.id}`, { ...exp, id: exp.id, profileId }),
  deleteExperience: (id: number) => api.delete(`/admin/experiences/${id}`),

  // Education
  addEducation: (edu: any, profileId: number) => api.post('/admin/educations', { ...edu, profileId }),
  updateEducation: (edu: any, profileId: number) => api.put(`/admin/educations/${edu.id}`, { ...edu, id: edu.id, profileId }),
  deleteEducation: (id: number) => api.delete(`/admin/educations/${id}`),

  // Publications
  addPublication: (pub: any, profileId: number) => api.post('/admin/publications', { ...pub, profileId }),
  updatePublication: (pub: any, profileId: number) => api.put(`/admin/publications/${pub.id}`, { ...pub, id: pub.id, profileId }),
  deletePublication: (id: number) => api.delete(`/admin/publications/${id}`),

  // Events
  addEvent: (evt: any, profileId: number) => api.post('/admin/events', { ...evt, profileId }),
  updateEvent: (evt: any, profileId: number) => api.put(`/admin/events/${evt.id}`, { ...evt, id: evt.id, profileId }),
  deleteEvent: (id: number) => api.delete(`/admin/events/${id}`),
};

export default api;