// src/types.ts

export interface Contact {
  email: string;
  github: string;
  linkedin: string;
  location: string;
  phone?: string;
}

export interface Project {
  id?: number;
  title: string;
  description: string;
  imageUrl: string;
  gallery?: string[];
  technologies: string[];
  demoUrl?: string;
  repoUrl?: string;

  // --- BỔ SUNG ĐỂ KHỚP VỚI ADMIN FORM ---
  role?: string;      // Vai trò (VD: Backend Lead)
  customer?: string;  // Khách hàng (VD: Pet Project)
}

export interface Skill {
  id?: number;
  name: string;
  proficiency: number;
  category?: string;
}

export interface WorkExperience {
  id?: number;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  // Bổ sung cờ để biết đang làm việc hay đã nghỉ
  isCurrent?: boolean;
}

export interface Education {
  id?: number;
  school: string;
  degree: string;
  year: string;
  description?: string;
}

export interface PortfolioData {
  id?: number;
  fullName: string;
  jobTitle: string;
  bio: string;
  avatarUrl: string;
  strengths?: string;
  workStyle?: string;

  contact: Contact;
  projects: Project[];
  skills: Skill[];
  workHistory: WorkExperience[];
  education: Education[];
  events?: any[];
  publications?: any[];
}

export interface ChatMessage {
  id?: string;
  sender: string;
  content: string;
  timestamp: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE';
}