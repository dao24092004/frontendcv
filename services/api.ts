import axios from 'axios';
import { PortfolioData, Project, Skill, ChatMessage } from './../types/index';

// --- CẤU HÌNH MÔI TRƯỜNG ---
// Bây giờ TypeScript đã hiểu import.meta.env nhờ file vite-env.d.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const API_URL = `${API_BASE_URL}/api/v1`;

console.log("🔌 Đang kết nối Backend tại:", API_BASE_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- HÀM XỬ LÝ LINK ẢNH ---
const resolveImageUrl = (url: string | null | undefined) => {
  // 1. Nếu không có ảnh -> Dùng ảnh giữ chỗ
  if (!url) return "https://placehold.co/600x400?text=No+Image";

  // 2. Nếu là link online (Cloudinary, Imgur...) -> Giữ nguyên
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // 3. Nếu là đường dẫn tương đối (/uploads/...) -> Thêm domain backend vào
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${cleanPath}`;
};

// --- MAPPER DỮ LIỆU ---
const mapBackendToFrontend = (data: any): PortfolioData => {
  return {
    id: data.id,
    fullName: data.fullName,
    jobTitle: data.jobTitle,
    bio: data.bio,
    avatarUrl: resolveImageUrl(data.avatarUrl),
    strengths: data.strengths || "Problem Solving, System Design",
    workStyle: data.workStyle || "Agile, Detail-oriented",

    contact: {
      email: data.contact?.email || "",
      github: data.contact?.github || "",
      linkedin: data.contact?.linkedin || "",
      location: data.contact?.address || "Unknown",
      phone: data.contact?.phone
    },

    projects: Array.isArray(data.projects) ? data.projects.map((p: any, index: number) => {
      // --- LOGIC TỰ ĐỘNG SỬA LỖI ẢNH ---
      // Nếu imageUrl rỗng NHƯNG sourceCodeUrl lại chứa link Cloudinary
      // => Lấy sourceCodeUrl làm ảnh
      let finalImageUrl = p.imageUrl;
      let finalRepoUrl = p.sourceCodeUrl;

      if (!finalImageUrl && finalRepoUrl && finalRepoUrl.includes('cloudinary')) {
        console.warn(`⚠️ Đã tự động sửa ảnh cho dự án: ${p.name}`);
        finalImageUrl = finalRepoUrl;
        finalRepoUrl = null; // Xóa link repo vì nó là link ảnh
      }
      // --------------------------------

      return {
        id: p.id || (index + 1),
        title: p.name,
        description: p.description,
        imageUrl: resolveImageUrl(finalImageUrl),
        gallery: Array.isArray(p.gallery) && p.gallery.length > 0
          ? p.gallery.map((img: string) => resolveImageUrl(img))
          : [resolveImageUrl(finalImageUrl)],
        technologies: p.technologies || [],
        repoUrl: finalRepoUrl || "#",
        demoUrl: "#"
      };
    }) : [],

    workHistory: Array.isArray(data.workHistory) ? data.workHistory.map((w: any) => ({
      id: w.id,
      company: w.companyName,
      role: w.position,
      startDate: w.startDate,
      endDate: w.endDate || "Present",
      description: w.description
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
      description: e.description
    })) : []
  };
};

export const portfolioService = {
  getPortfolioData: async (): Promise<PortfolioData> => {
    try {
      const response = await api.get('/portfolio');
      return mapBackendToFrontend(response.data);
    } catch (error) {
      console.error("Lỗi gọi API Portfolio:", error);
      throw error;
    }
  },

  downloadCV: async () => {
    try {
      window.open(`${API_URL}/export/cv-data`, '_blank');
    } catch (e) {
      alert("Không thể kết nối Server để tải CV.");
    }
  },

  getChatHistory: async (): Promise<ChatMessage[]> => {
    try {
      const response = await api.get<ChatMessage[]>('/chat/history');
      return response.data;
    } catch (error) {
      return [];
    }
  }
};

export const adminService = {
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<string>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  updateProfile: async (data: any) => api.put('/admin/profile', data),
  createProject: async (project: Project) => {
    const payload = {
      name: project.title,
      description: project.description,
      imageUrl: project.imageUrl,
      gallery: project.gallery || [],
      sourceCodeUrl: project.repoUrl,
      techStack: project.technologies.join(", "),
      role: "Developer"
    };
    return api.post('/admin/projects', payload);
  },
  updateProject: async (project: Project) => {
    const payload = {
      name: project.title,
      description: project.description,
      imageUrl: project.imageUrl,
      gallery: project.gallery || [],
      sourceCodeUrl: project.repoUrl,
      techStack: project.technologies.join(", "),
      role: "Developer"
    };
    return api.put(`/admin/projects/${project.id}`, payload);
  },
  deleteProject: async (id: number) => api.delete(`/admin/projects/${id}`),
};

export default api;