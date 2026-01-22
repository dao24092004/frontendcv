// Translation system for static texts
// These texts will automatically switch when user changes language
// Using IT/Software Engineering terminology

export const translations = {
  vi: {
    hero: {
      systemOnline: "Hệ thống trực tuyến • Sẵn sàng triển khai",
      title: "ENGINEERING",
      subtitle: "PERFECTION.",
    },
    sections: {
      journey: "Lộ trình nghề nghiệp",
      workSelection: "Dự án",
      education: "Học vấn",
      myArsenal: "Kỹ năng",
      research: "Nghiên cứu",
      recognitions: "Thành tựu",
    },
    projects: {
      featuredProjects: "Dự án nổi bật",
      clickToViewDetails: "Click để xem chi tiết →",
    },
    navigation: {
      projects: "Dự án",
      skills: "Kỹ năng",
      research: "Nghiên cứu",
      events: "Sự kiện",
    },
    stats: {
      coreTech: "Công nghệ cốt lõi",
      experience: "Kinh nghiệm",
      connect: "Kết nối",
      socialNetwork: "Mạng xã hội",
      yearsActive: "Năm hoạt động",
    },
    footer: {
      letsConnect: "Hãy",
      letsConnect2: "kết nối.",
      availableForNewOpportunities: "SẴN SÀNG CHO CƠ HỘI MỚI",
    },
  },
  en: {
    hero: {
      systemOnline: "System Online • Ready to Deploy",
      title: "ENGINEERING",
      subtitle: "PERFECTION.",
    },
    sections: {
      journey: "Career Journey",
      workSelection: "Projects",
      education: "Education",
      myArsenal: "Skills",
      research: "Research",
      recognitions: "Recognitions",
    },
    projects: {
      featuredProjects: "Featured Projects",
      clickToViewDetails: "Click to view details →",
    },
    navigation: {
      projects: "Projects",
      skills: "Skills",
      research: "Research",
      events: "Events",
    },
    stats: {
      coreTech: "Core Tech",
      experience: "Experience",
      connect: "Connect",
      socialNetwork: "Social Network",
      yearsActive: "Years Active",
    },
    footer: {
      letsConnect: "Let's",
      letsConnect2: "connect.",
      availableForNewOpportunities: "AVAILABLE FOR NEW OPPORTUNITIES",
    },
  },
};

// Get translation by key path (e.g., "sections.journey")
export const getTranslation = (key: string): string => {
  const lang = localStorage.getItem('app_lang') || 'vi';
  const keys = key.split('.');
  let value: any = translations[lang as 'vi' | 'en'];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fallback to Vietnamese if key not found
      value = translations.vi;
      for (const k2 of keys) {
        value = value?.[k2];
      }
      break;
    }
  }
  
  return value || key;
};

// Hook for React components
export const useTranslation = () => {
  const lang = localStorage.getItem('app_lang') || 'vi';
  const t = (key: string): string => getTranslation(key);
  
  return { t, lang };
};

