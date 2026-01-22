import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {
  FaUserCircle, FaVideo, FaPaperPlane, FaCode, FaUser,
  FaImage, FaPlus, FaEdit, FaTrash, FaSave, FaTimes,
  FaTools, FaBriefcase, FaFileUpload, FaList, FaCheck,
  FaGraduationCap, FaNewspaper, FaTrophy, FaGlobe, FaCloudUploadAlt, FaSpinner,
  FaSitemap, FaBuilding, FaUsers, FaMapMarkerAlt, FaLink, FaCopy, FaExternalLinkAlt, FaUserPlus, FaLock, FaSignOutAlt,
  FaChevronLeft, FaChevronRight, FaIdBadge
} from 'react-icons/fa';
import VideoCallInterface from '../components/VideoCallInterface';
import { portfolioService, adminService } from '../services/api';
import { PortfolioData, Project, Skill, WorkExperience, ChatMessage, Region, LocalOrg, Department } from '../types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Định nghĩa URL gốc để gọi API Auth riêng
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface ChatSession { visitorId: string; visitorName: string; messages: ChatMessage[]; unreadCount: number; lastActive: number; }

type ActiveTab = 'chat' | 'profile' | 'account' | 'organization' | 'projects' | 'skills' | 'experience' | 'education' | 'publications' | 'events' | 'cv-import' | 'profile-list';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [loading, setLoading] = useState(true);
  const [loadingImport, setLoadingImport] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [profileList, setProfileList] = useState<any[]>([]);

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const PAGE_SIZE = 6;

  // --- ACCOUNT TAB STATE ---
  const [accountState, setAccountState] = useState<'create' | 'update'>('create');
  const [accountForm, setAccountForm] = useState({ username: '', password: '', confirmPassword: '' });

  // --- STATE TỔ CHỨC ---
  const [regions, setRegions] = useState<Region[]>([]);
  const [locals, setLocals] = useState<LocalOrg[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [selRegionId, setSelRegionId] = useState<number | string>('');
  const [selLocalId, setSelLocalId] = useState<number | string>('');
  const [selDeptId, setSelDeptId] = useState<number | string>('');

  const [showRegionModal, setShowRegionModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Partial<Region>>({});

  const [showLocalModal, setShowLocalModal] = useState(false);
  const [editingLocal, setEditingLocal] = useState<Partial<LocalOrg> & { regionId?: number }>({});

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Partial<Department> & { localOrgId?: number }>({});

  // --- ADD FORMS ---
  const [newSkill, setNewSkill] = useState<Partial<Skill>>({ name: '', category: 'Backend', proficiency: 50 });
  const [newExp, setNewExp] = useState<Partial<WorkExperience>>({ company: '', role: '', startDate: '', endDate: '', description: '', isCurrent: false });
  const [newEdu, setNewEdu] = useState<any>({ schoolName: '', degree: '', startDate: '', endDate: '', description: '' });
  const [newPub, setNewPub] = useState<any>({ title: '', publisher: '', releaseDate: '', url: '' });
  const [newEvent, setNewEvent] = useState<any>({ name: '', role: '', date: '', description: '', imageUrl: '' });

  // --- EDIT MODALS ---
  const [editingProfile, setEditingProfile] = useState<Partial<PortfolioData> | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<Project>>({ title: '', role: '', customer: '', description: '', technologies: [], imageUrl: '', repoUrl: '' });
  const [showExpModal, setShowExpModal] = useState(false);
  const [editingExp, setEditingExp] = useState<Partial<WorkExperience>>({});
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Partial<Skill>>({});
  const [showEduModal, setShowEduModal] = useState(false);
  const [editingEdu, setEditingEdu] = useState<any>({});
  const [showPubModal, setShowPubModal] = useState(false);
  const [editingPub, setEditingPub] = useState<any>({});
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>({});

  // --- CHAT STATE ---
  const [chatSessions, setChatSessions] = useState<Record<string, ChatSession>>({});
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [incomingCalls, setIncomingCalls] = useState<any[]>([]);
  const [activeCallRoom, setActiveCallRoom] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const stompClient = useRef<Client | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();
    connectSocket();
    return () => { stompClient.current?.deactivate(); };
  }, [currentPage]);

  useEffect(() => {
    if (activeTab === 'organization') fetchOrgData();
    if (activeTab === 'account') checkAccountStatus();
  }, [activeTab, portfolioData]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // 🔥 UPDATE: Tự động check username từ portfolioData
  const checkAccountStatus = async () => {
    if (!portfolioData?.id) return;

    // Nếu portfolioData đã có username (từ backend)
    if (portfolioData.username) {
      setAccountState('update');
      // Điền sẵn username vào form (để hiển thị)
      setAccountForm({
        username: portfolioData.username,
        password: '',
        confirmPassword: ''
      });
    } else {
      setAccountState('create');
      setAccountForm({ username: '', password: '', confirmPassword: '' });
    }
  };

  const handleAccountAction = async () => {
    if (accountForm.password !== accountForm.confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (accountState === 'create' && !accountForm.username.trim()) {
      alert("Vui lòng nhập Username!");
      return;
    }

    if (!portfolioData?.id) {
      alert("Lỗi: Không xác định được Profile ID!");
      return;
    }

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (accountState === 'create') {
        await axios.post(`${API_BASE_URL}/api/v1/auth/register`, {
          profileId: portfolioData.id,
          fullName: portfolioData?.fullName,
          username: accountForm.username,
          password: accountForm.password
        }, { headers });

        alert(`✅ Đã tạo tài khoản cho profile: ${portfolioData.fullName}`);

        // Refresh lại data để lấy username vừa tạo
        reloadProfileData();
        setAccountState('update');
      } else {
        alert("Tính năng đổi mật khẩu user khác cần API Backend hỗ trợ!");
      }
      // Giữ lại username trong form
      setAccountForm({ username: accountForm.username, password: '', confirmPassword: '' });
    } catch (e: any) {
      alert("Lỗi: " + (e.response?.data?.message || e.response?.data || "Không thể thực hiện yêu cầu"));
    }
  };

  const handleDeleteProfile = async (id: number, name: string) => {
    if (confirm(`Bạn có chắc muốn XÓA VĨNH VIỄN hồ sơ "${name}"? Hành động này không thể hoàn tác.`)) {
      try {
        await adminService.deleteProfile(id);
        alert("✅ Đã xóa hồ sơ thành công!");
        if (portfolioData?.id === id) {
          setPortfolioData(null);
          setEditingProfile(null);
          if (currentPage !== 0) setCurrentPage(0);
          else fetchInitialData();
        } else {
          fetchInitialData();
        }
      } catch (e: any) {
        console.error("Delete Error:", e);
        alert("Lỗi khi xóa: " + (e.response?.data || "Lỗi không xác định"));
      }
    }
  };

  useEffect(() => {
    if (portfolioData && regions.length > 0 && locals.length > 0 && departments.length > 0) {
      let foundRegionId, foundLocalId, foundDeptId;
      if (portfolioData.departmentId) {
        const d = departments.find(item => item.id === portfolioData.departmentId);
        if (d) {
          foundDeptId = d.id;
          foundLocalId = d.localOrgId;
          const l = locals.find(item => item.id === d.localOrgId);
          if (l) foundRegionId = l.regionId;
        }
      }
      if (!foundDeptId && portfolioData.regionName && portfolioData.localOrgName && portfolioData.departmentName) {
        const r = regions.find(item => item.name === portfolioData.regionName);
        if (r) {
          foundRegionId = r.id;
          const l = locals.find(item => item.name === portfolioData.localOrgName && item.regionId === r.id);
          if (l) {
            foundLocalId = l.id;
            const d = departments.find(item => item.name === portfolioData.departmentName && item.localOrgId === l.id);
            if (d) foundDeptId = d.id;
          }
        }
      }
      if (foundRegionId && foundLocalId && foundDeptId) {
        setSelRegionId(foundRegionId);
        setSelLocalId(foundLocalId);
        setSelDeptId(foundDeptId);
      }
    }
  }, [portfolioData, regions, locals, departments]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllProfiles(currentPage, PAGE_SIZE);

      const list = response.content || [];
      setProfileList(list);
      setTotalPages(response.totalPages || 0);

      if (list.length > 0 && !portfolioData) {
        const currentId = list[0].id;
        const data = await portfolioService.getPortfolioById(currentId);
        setPortfolioData(data);
        setEditingProfile(data);
      } else if (list.length === 0) {
        setPortfolioData(null);
        setEditingProfile(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const reloadProfileData = async () => {
    if (!portfolioData?.id) return;
    try {
      const data = await portfolioService.getPortfolioById(portfolioData.id);
      setPortfolioData(data);
      setEditingProfile(data);
    } catch (e) { console.error("Error reloading profile:", e); }
  };

  const fetchOrgData = async () => {
    try {
      const [r, l, d] = await Promise.all([
        adminService.getRegions(),
        adminService.getLocals(),
        adminService.getDepartments()
      ]);
      setRegions(r || []);
      setLocals(l || []);
      setDepartments(d || []);
    } catch (e) { console.error("Error fetching org data:", e); }
  };

  const handleSwitchProfile = async (id: number) => {
    setLoading(true);
    try {
      const data = await portfolioService.getPortfolioById(id);
      setPortfolioData(data);
      setEditingProfile(data);
      setActiveTab('profile');
      setSelRegionId('');
      setSelLocalId('');
      setSelDeptId('');
    } catch (e) { alert("Failed to load profile details"); } finally { setLoading(false); }
  };

  const connectSocket = () => {
    const socket = new SockJS(import.meta.env.VITE_WS_URL);
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/admin/messages', (msg) => handleIncomingMessage(JSON.parse(msg.body)));
        client.subscribe('/topic/call-requests', (msg) => {
          const req = JSON.parse(msg.body);
          setIncomingCalls(prev => prev.find(c => c.roomId === req.roomId) ? prev : [...prev, req]);
        });
      }
    });
    client.activate();
    stompClient.current = client;
  };

  const handleIncomingMessage = (msg: ChatMessage) => {
    const visitorId = msg.senderId || 'unknown';
    setChatSessions(prev => {
      const current = prev[visitorId] || { visitorId, visitorName: msg.sender, messages: [], unreadCount: 0, lastActive: Date.now() };
      return { ...prev, [visitorId]: { ...current, messages: [...current.messages, msg], unreadCount: (selectedVisitorId === visitorId && activeTab === 'chat') ? 0 : current.unreadCount + 1 } };
    });
  };

  const sendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedVisitorId || !stompClient.current) return;
    const replyMsg = { sender: "Admin", senderId: "admin", recipientId: selectedVisitorId, content: replyText, type: 'CHAT', timestamp: new Date().toLocaleTimeString() };
    stompClient.current.publish({ destination: "/app/chat.replyToUser", body: JSON.stringify(replyMsg) });
    setChatSessions(prev => ({ ...prev, [selectedVisitorId]: { ...prev[selectedVisitorId], messages: [...prev[selectedVisitorId].messages, replyMsg as ChatMessage] } }));
    setReplyText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'project' | 'event') => {
    if (e.target.files?.[0]) {
      setUploading(true);
      try {
        const url = await adminService.uploadImage(e.target.files[0]);
        if (target === 'avatar' && editingProfile) {
          setEditingProfile({ ...editingProfile, avatarUrl: url });
        } else if (target === 'project' && editingProject) {
          setEditingProject(prev => ({ ...prev, imageUrl: url }));
        } else if (target === 'event') {
          setEditingEvent((prev: any) => ({ ...prev, imageUrl: url }));
        }
      } catch (err) { alert("Upload failed!"); } finally { setUploading(false); }
    }
  };

  const saveProfile = async () => {
    if (editingProfile) {
      await adminService.updateProfile(editingProfile);
      alert("✅ Profile updated!");
      reloadProfileData();
    }
  };

  const handleImportCV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      if (confirm("Importing CV creates a NEW profile. Continue?")) {
        setLoadingImport(true);
        try {
          await adminService.importCV(e.target.files[0]);
          alert("✅ CV Imported successfully!");
          setCurrentPage(0);
          await fetchInitialData();
          setActiveTab('profile-list');
        } catch (err) { alert("❌ Import failed!"); }
        finally { setLoadingImport(false); }
      }
    }
  };

  const handleActivateProfile = async (id: number, name: string) => {
    if (confirm(`Activate profile "${name}"?`)) {
      try { await adminService.activateProfile(id); alert("✅ Activated!"); fetchInitialData(); }
      catch (e) { alert("Error activating profile"); }
    }
  };

  const getAssignmentLevelText = () => {
    if (selDeptId) return "Department Level";
    if (selLocalId) return "Local Org Level";
    if (selRegionId) return "Region Level";
    return "No Level Selected";
  };

  const handleAssignOrg = async () => {
    if (!portfolioData?.id) { alert("Không tìm thấy thông tin profile!"); return; }
    if (!selDeptId && !selLocalId && !selRegionId) { alert("Vui lòng chọn ít nhất một cấp độ tổ chức!"); return; }
    try {
      await adminService.assignUserToOrg(
        portfolioData.id,
        selDeptId ? Number(selDeptId) : undefined,
        selLocalId ? Number(selLocalId) : undefined,
        selRegionId ? Number(selRegionId) : undefined
      );
      alert("✅ Đã gán tổ chức thành công!");
      reloadProfileData();
    } catch (e) { alert("Lỗi khi gán tổ chức"); }
  };

  const openAddRegion = () => { setEditingRegion({ name: '', code: '' }); setShowRegionModal(true); };
  const openEditRegion = (r: Region) => { setEditingRegion({ ...r }); setShowRegionModal(true); };
  const saveRegion = async () => {
    try {
      if (editingRegion.id) await adminService.updateRegion(editingRegion.id, editingRegion as any);
      else await adminService.createRegion(editingRegion as any);
      setShowRegionModal(false); fetchOrgData();
    } catch (e) { alert("Lỗi lưu Vùng"); }
  };
  const deleteRegion = async (id: number) => { if (confirm("Xóa vùng này?")) { await adminService.deleteRegion(id); fetchOrgData(); } };

  const openAddLocal = () => { setEditingLocal({ name: '', code: '', regionId: regions[0]?.id }); setShowLocalModal(true); };
  const openEditLocal = (l: LocalOrg) => { setEditingLocal({ ...l, regionId: l.regionId }); setShowLocalModal(true); };
  const saveLocal = async () => {
    try {
      if (editingLocal.id) await adminService.updateLocal(editingLocal.id, editingLocal as any);
      else await adminService.createLocal(editingLocal as any);
      setShowLocalModal(false); fetchOrgData();
    } catch (e) { alert("Lỗi lưu Chi nhánh"); }
  };
  const deleteLocal = async (id: number) => { if (confirm("Xóa chi nhánh này?")) { await adminService.deleteLocal(id); fetchOrgData(); } };

  const openAddDept = () => { setEditingDept({ name: '', code: '', localOrgId: locals[0]?.id }); setShowDeptModal(true); };
  const openEditDept = (d: Department) => { setEditingDept({ ...d, localOrgId: d.localOrgId }); setShowDeptModal(true); };
  const saveDept = async () => {
    try {
      if (editingDept.id) await adminService.updateDepartment(editingDept.id, editingDept as any);
      else await adminService.createDepartment(editingDept as any);
      setShowDeptModal(false); fetchOrgData();
    } catch (e) { alert("Lỗi lưu Phòng ban"); }
  };
  const deleteDept = async (id: number) => { if (confirm("Xóa phòng ban này?")) { await adminService.deleteDepartment(id); fetchOrgData(); } };

  const generateShareLink = () => {
    if (!portfolioData?.id) return null;
    const origin = window.location.origin;
    const r = selRegionId ? regions.find(item => item.id === Number(selRegionId)) : null;
    const l = selLocalId ? locals.find(item => item.id === Number(selLocalId)) : null;
    const d = selDeptId ? departments.find(item => item.id === Number(selDeptId)) : null;
    if (r?.code && l?.code && d?.code) return `${origin}/#/view/${r.code}/${l.code}/${d.code}/${portfolioData.id}`;
    else if (r?.code && l?.code) return `${origin}/#/view/${r.code}/${l.code}/${portfolioData.id}`;
    else if (r?.code) return `${origin}/#/view/${r.code}/${portfolioData.id}`;
    else return `${origin}/#/view/${portfolioData.id}`;
  };
  const generatedLink = generateShareLink();
  const copyLink = () => { if (generatedLink) { navigator.clipboard.writeText(generatedLink); alert("Đã copy link!"); } };

  // --- CRUD WRAPPERS ---
  const openAddProject = () => { setEditingProject({ title: '', role: '', customer: '', description: '', technologies: [], imageUrl: '', repoUrl: '' }); setShowProjectModal(true); };
  const openEditProject = (project: Project) => { setEditingProject({ ...project }); setShowProjectModal(true); };
  const saveProject = async () => {
    if (portfolioData?.id) {
      if (isSaving) return; setIsSaving(true);
      try {
        if (editingProject.id) await adminService.updateProject(editingProject as Project, portfolioData.id);
        else await adminService.createProject(editingProject as Project, portfolioData.id);
        setShowProjectModal(false); reloadProfileData();
      } catch (e) { alert("Error saving project"); } finally { setIsSaving(false); }
    }
  };
  const deleteProject = async (id: number) => { if (confirm("Delete?")) { await adminService.deleteProject(id); reloadProfileData(); } };

  const openAddExperience = () => { setEditingExp({ company: '', role: '', startDate: '', endDate: '', description: '', isCurrent: false }); setShowExpModal(true); };
  const openEditExperience = (exp: WorkExperience) => { setEditingExp({ ...exp }); setShowExpModal(true); };
  const saveExperience = async () => { if (portfolioData?.id) { if (isSaving) return; setIsSaving(true); try { if (editingExp.id) await adminService.updateExperience(editingExp as WorkExperience, portfolioData.id); else await adminService.addExperience(editingExp as WorkExperience, portfolioData.id); setShowExpModal(false); reloadProfileData(); } catch (e) { alert("Error") } finally { setIsSaving(false); } } };
  const deleteExperience = async (id: number) => { if (confirm("Delete?")) { await adminService.deleteExperience(id); reloadProfileData(); } };

  const openAddSkill = () => { setEditingSkill({ name: '', category: 'Backend', proficiency: 50 }); setShowSkillModal(true); };
  const openEditSkill = (skill: Skill) => { setEditingSkill({ ...skill }); setShowSkillModal(true); };
  const saveSkill = async () => { if (portfolioData?.id) { if (isSaving) return; setIsSaving(true); try { if (editingSkill.id) await adminService.updateSkill(editingSkill as Skill, portfolioData.id); else await adminService.addSkill(editingSkill as Skill, portfolioData.id); setShowSkillModal(false); reloadProfileData(); } catch (e) { alert("Error") } finally { setIsSaving(false); } } };
  const deleteSkill = async (id: number) => { if (confirm("Delete?")) { await adminService.deleteSkill(id); reloadProfileData(); } };

  const openAddEducation = () => { setEditingEdu({ schoolName: '', degree: '', startDate: '', endDate: '', description: '' }); setShowEduModal(true); };
  const openEditEducation = (edu: any) => { setEditingEdu({ ...edu }); setShowEduModal(true); };
  const saveEducation = async () => { if (portfolioData?.id) { if (isSaving) return; setIsSaving(true); try { if (editingEdu.id) await adminService.updateEducation(editingEdu, portfolioData.id); else await adminService.addEducation(editingEdu, portfolioData.id); setShowEduModal(false); reloadProfileData(); } catch (e) { alert("Error") } finally { setIsSaving(false); } } };
  const deleteEducation = async (id: number) => { if (confirm("Delete?")) { await adminService.deleteEducation(id); reloadProfileData(); } };

  const openAddPub = () => { setEditingPub({ title: '', publisher: '', releaseDate: '', url: '' }); setShowPubModal(true); };
  const openEditPub = (pub: any) => { setEditingPub({ ...pub }); setShowPubModal(true); };
  const savePub = async () => { if (portfolioData?.id) { if (isSaving) return; setIsSaving(true); try { if (editingPub.id) await adminService.updatePublication(editingPub, portfolioData.id); else await adminService.addPublication(editingPub, portfolioData.id); setShowPubModal(false); reloadProfileData(); } catch (e) { alert("Error") } finally { setIsSaving(false); } } };
  const deletePub = async (id: number) => { if (confirm("Delete?")) { await adminService.deletePublication(id); reloadProfileData(); } };

  const openAddEvent = () => { setEditingEvent({ name: '', role: '', date: '', description: '', imageUrl: '' }); setShowEventModal(true); };
  const openEditEvent = (evt: any) => { setEditingEvent({ ...evt }); setShowEventModal(true); };
  const saveEvent = async () => { if (portfolioData?.id) { if (isSaving) return; setIsSaving(true); try { if (editingEvent.id) await adminService.updateEvent(editingEvent, portfolioData.id); else await adminService.addEvent(editingEvent, portfolioData.id); setShowEventModal(false); reloadProfileData(); } catch (e) { alert("Error") } finally { setIsSaving(false); } } };
  const deleteEvent = async (id: number) => { if (confirm("Delete?")) { await adminService.deleteEvent(id); reloadProfileData(); } };

  if (loading) return <div className="h-screen flex items-center justify-center text-xl font-bold text-orange-600">Loading System...</div>;

  const filteredLocalsForAssign = (locals || []).filter(l => l.regionId === Number(selRegionId));
  const filteredDepartmentsForAssign = (departments || []).filter(d => d.localOrgId === Number(selLocalId));

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800">
      {/* SIDEBAR */}
      <div className="w-20 md:w-64 bg-white border-r flex flex-col shadow-sm z-10">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg shadow-sm"></div>
          <span className="font-bold text-xl hidden md:block">Admin</span>
        </div>
        <div className="p-4 border-b">
          <div className="text-xs text-gray-400 uppercase font-bold">Editing Profile</div>
          <div className="font-bold truncate">{portfolioData?.fullName}</div>

          {/* 🔥 HIỂN THỊ USERNAME Ở SIDEBAR 🔥 */}
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <FaUser className="text-orange-500" />
            <span className="font-bold text-orange-600 truncate">{portfolioData?.username || 'Chưa có TK'}</span>
          </div>

          <div className="text-xs text-green-500 flex justify-between items-center mt-2">
            ID: {portfolioData?.id}
            <button onClick={handleLogout} className="text-red-500 hover:text-red-700" title="Logout"><FaSignOutAlt /></button>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {['chat', 'profile', 'account', 'organization', 'projects', 'skills', 'experience', 'education', 'publications', 'events', 'cv-import', 'profile-list'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as ActiveTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg capitalize transition ${activeTab === tab ? 'bg-orange-50 text-orange-600 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}>
              {tab === 'organization' ? <FaSitemap className="text-sm" /> : tab === 'account' ? <FaUserPlus className="text-sm" /> : <FaList className="text-sm" />}
              <span className="hidden md:block">{tab.replace('-', ' ')}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex h-full">
            <div className="w-80 bg-white border-r flex flex-col">
              <div className="p-4 border-b font-bold bg-gray-50">Inbox</div>
              <div className="flex-1 overflow-y-auto">
                {Object.values(chatSessions).map(s => (
                  <div key={s.visitorId} onClick={() => setSelectedVisitorId(s.visitorId)} className={`p-4 border-b cursor-pointer hover:bg-orange-50 flex gap-3 ${selectedVisitorId === s.visitorId ? 'bg-orange-100' : ''}`}>
                    <div className="bg-gray-200 p-3 rounded-full"><FaUserCircle /></div>
                    <div><div className="font-bold text-sm">{s.visitorName}</div><div className="text-xs text-gray-500 truncate">{s.messages.slice(-1)[0]?.content}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 flex flex-col bg-gray-50">
              {selectedVisitorId ? (
                <>
                  <div className="h-16 bg-white border-b px-6 flex items-center justify-between font-bold">{chatSessions[selectedVisitorId].visitorName}</div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {chatSessions[selectedVisitorId].messages.map((m, i) => (
                      <div key={i} className={`flex ${m.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`px-4 py-2 rounded-xl max-w-[70%] ${m.senderId === 'admin' ? 'bg-blue-600 text-white' : 'bg-white'}`}>{m.content}</div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  <form onSubmit={sendReply} className="p-4 bg-white border-t flex gap-2"><input className="flex-1 border rounded px-4 py-2" value={replyText} onChange={e => setReplyText(e.target.value)} /><button className="bg-blue-600 text-white px-6 rounded"><FaPaperPlane /></button></form>
                </>
              ) : <div className="flex-1 flex items-center justify-center text-gray-400">Select conversation</div>}
            </div>
          </div>
        )}

        {/* ACCOUNT TAB - UPDATED WITH USERNAME DISPLAY */}
        {activeTab === 'account' && (
          <div className="p-8 flex justify-center items-start h-full bg-gray-50">
            <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                {accountState === 'create' ? <FaUserPlus className="text-green-500" /> : <FaLock className="text-orange-500" />}
                {accountState === 'create' ? 'Create User Account' : 'Change User Password'}
              </h2>
              <div className="mb-4 text-sm text-gray-600 bg-gray-100 p-3 rounded">
                For Profile: <span className="font-bold">{portfolioData?.fullName}</span><br />
                ID: {portfolioData?.id}
              </div>

              {/* 🔥 LOGIC HIỂN THỊ USERNAME NẾU ĐÃ CÓ 🔥 */}
              {accountState === 'create' ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    value={accountForm.username}
                    onChange={e => setAccountForm({ ...accountForm, username: e.target.value })}
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Enter username"
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <div className="w-full border p-2 rounded bg-gray-100 text-gray-600 font-bold flex items-center gap-2">
                    <FaUser className="text-gray-400" />
                    {portfolioData?.username}
                  </div>
                  <p className="text-xs text-orange-500 mt-1 italic">*Username cannot be changed.</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input type="password" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={accountForm.password} onChange={e => setAccountForm({ ...accountForm, password: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input type="password" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={accountForm.confirmPassword} onChange={e => setAccountForm({ ...accountForm, confirmPassword: e.target.value })} />
                </div>
                <button onClick={handleAccountAction} className={`w-full text-white py-2 rounded font-bold transition ${accountState === 'create' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                  {accountState === 'create' ? 'Register Account' : 'Update Password'}
                </button>
                <div className="mt-4 text-center text-xs text-gray-400 cursor-pointer hover:underline" onClick={() => setAccountState(accountState === 'create' ? 'update' : 'create')}>
                  (Dev: Switch Mode)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && editingProfile && (
          <div className="p-8 overflow-y-auto h-full">
            <h2 className="text-2xl font-bold mb-6">General Information</h2>
            <div className="bg-white p-6 rounded-xl shadow-sm space-y-6 max-w-3xl">
              <div className="flex items-center gap-6">
                <div className="relative group w-24 h-24">
                  <img src={editingProfile.avatarUrl || "https://placehold.co/150"} className="w-24 h-24 rounded-full border object-cover" />
                  {uploading && <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"><FaSpinner className="animate-spin text-white" /></div>}
                  <label className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition text-white text-xs font-bold text-center">
                    Change <input type="file" hidden onChange={e => handleFileUpload(e, 'avatar')} />
                  </label>
                </div>
                <div>
                  <h3 className="font-bold">{editingProfile.fullName}</h3>
                  <p className="text-sm text-gray-500">Avatar Image</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input className="border p-2 rounded" placeholder="Full Name" value={editingProfile.fullName} onChange={e => setEditingProfile({ ...editingProfile, fullName: e.target.value })} />

                <input className="border p-2 rounded" placeholder="Website Title (VI)" value={editingProfile.titleVi || ''} onChange={e => setEditingProfile({ ...editingProfile, titleVi: e.target.value })} />
                <input className="border p-2 rounded" placeholder="Website Title (EN)" value={editingProfile.titleEn || ''} onChange={e => setEditingProfile({ ...editingProfile, titleEn: e.target.value })} />

                <input className="border p-2 rounded" placeholder="Job Title" value={editingProfile.jobTitle} onChange={e => setEditingProfile({ ...editingProfile, jobTitle: e.target.value })} />
                <input className="border p-2 rounded" placeholder="Email" value={editingProfile.contact?.email} onChange={e => setEditingProfile({ ...editingProfile, contact: { ...editingProfile.contact!, email: e.target.value } })} />
                <input className="border p-2 rounded" placeholder="Phone" value={editingProfile.contact?.phone} onChange={e => setEditingProfile({ ...editingProfile, contact: { ...editingProfile.contact!, phone: e.target.value } })} />
              </div>
              <textarea className="w-full border p-2 rounded" rows={4} placeholder="Bio" value={editingProfile.bio} onChange={e => setEditingProfile({ ...editingProfile, bio: e.target.value })} />
              <button onClick={saveProfile} className="bg-orange-500 text-white px-6 py-2 rounded font-bold hover:bg-orange-600"><FaSave className="inline mr-2" /> Save Changes</button>
            </div>
          </div>
        )}

        {/* ORGANIZATION TAB */}
        {activeTab === 'organization' && portfolioData && (
          <div className="p-8 overflow-y-auto h-full">
            <div className="bg-white p-6 rounded-xl shadow-sm border mb-8 max-w-4xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg flex items-center gap-2"><FaUser /> Assign Current User</h3>
                <span className="text-sm bg-gray-100 px-3 py-1 rounded text-gray-500">
                  Current: <span className="font-bold text-gray-700 ml-1">{portfolioData.regionName || 'N/A'}</span> &gt; <span className="font-bold text-gray-700 ml-1">{portfolioData.localOrgName || 'N/A'}</span> &gt; <span className="font-bold text-orange-600 ml-1">{portfolioData.departmentName || 'N/A'}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">1. Region</label><select className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-500 outline-none" value={selRegionId} onChange={(e) => { setSelRegionId(e.target.value); setSelLocalId(''); setSelDeptId(''); }}><option value="">-- Select Region --</option>{(regions || []).map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}</select></div>
                <div><label className={`block text-xs font-bold uppercase mb-2 ${!selRegionId ? 'text-gray-300' : 'text-gray-400'}`}>2. Local Org</label><select className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100" value={selLocalId} onChange={(e) => { setSelLocalId(e.target.value); setSelDeptId(''); }} disabled={!selRegionId}><option value="">-- Select Local --</option>{filteredLocalsForAssign.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}</select></div>
                <div><label className={`block text-xs font-bold uppercase mb-2 ${!selLocalId ? 'text-gray-300' : 'text-gray-400'}`}>3. Department</label><select className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100" value={selDeptId} onChange={(e) => setSelDeptId(e.target.value)} disabled={!selLocalId}><option value="">-- Select Dept --</option>{filteredDepartmentsForAssign.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}</select></div>
              </div>
              <div className="flex flex-col md:flex-row justify-between items-center border-t pt-6 gap-4">
                <div className="flex-1 w-full">{generatedLink ? (<div className="flex items-center gap-2 bg-blue-50 border border-blue-200 p-3 rounded-lg w-full"><FaLink className="text-blue-500" /><input readOnly value={generatedLink} className="bg-transparent text-sm text-blue-800 flex-1 outline-none font-mono" onClick={(e) => e.currentTarget.select()} /><button onClick={copyLink} className="text-blue-600 hover:text-blue-800 px-2" title="Copy"><FaCopy /></button><a href={generatedLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 px-2" title="Open"><FaExternalLinkAlt /></a></div>) : (<div className="text-sm text-gray-400 italic flex items-center gap-2"><FaLink /> Select all fields to generate shareable link...</div>)}</div>
                <div className="flex flex-col gap-2">{(selRegionId || selLocalId || selDeptId) && (<div className="text-xs text-gray-500 text-center">Will assign to: <span className="font-semibold text-orange-600">{getAssignmentLevelText()}</span></div>)}<button onClick={handleAssignOrg} disabled={!selRegionId && !selLocalId && !selDeptId} className={`px-8 py-3 rounded-lg font-bold text-white shadow-lg transition flex items-center gap-2 whitespace-nowrap ${(selRegionId || selLocalId || selDeptId) ? 'bg-orange-500 hover:bg-orange-600 hover:scale-105' : 'bg-gray-300 cursor-not-allowed'}`}><FaCheck /> Confirm Assignment</button></div>
              </div>
            </div>
            <hr className="my-8 border-gray-200" />
            <h2 className="text-2xl font-bold mb-6">Manage Organization Data</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border h-fit"><div className="flex justify-between items-center mb-4 pb-2 border-b"><h4 className="font-bold flex items-center gap-2"><FaGlobe className="text-blue-500" /> Regions</h4><button onClick={openAddRegion} className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"><FaPlus /> Add</button></div><div className="space-y-2 max-h-96 overflow-y-auto">{(regions || []).map(r => (<div key={r.id} className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100 group"><div><div className="font-bold text-sm">{r.name}</div><div className="text-xs text-orange-500 font-mono">[{r.code}]</div></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => openEditRegion(r)} className="text-blue-500 p-1"><FaEdit /></button><button onClick={() => deleteRegion(r.id)} className="text-red-500 p-1"><FaTrash /></button></div></div>))}</div></div>
              <div className="bg-white p-4 rounded-xl shadow-sm border h-fit"><div className="flex justify-between items-center mb-4 pb-2 border-b"><h4 className="font-bold flex items-center gap-2"><FaBuilding className="text-orange-500" /> Local Orgs</h4><button onClick={openAddLocal} className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600"><FaPlus /> Add</button></div><div className="space-y-2 max-h-96 overflow-y-auto">{(locals || []).map(l => (<div key={l.id} className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100 group"><div><div className="font-bold text-sm">{l.name} <span className="text-xs text-orange-500 font-mono">[{l.code}]</span></div><div className="text-xs text-gray-400">{l.regionName}</div></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => openEditLocal(l)} className="text-blue-500 p-1"><FaEdit /></button><button onClick={() => deleteLocal(l.id)} className="text-red-500 p-1"><FaTrash /></button></div></div>))}</div></div>
              <div className="bg-white p-4 rounded-xl shadow-sm border h-fit"><div className="flex justify-between items-center mb-4 pb-2 border-b"><h4 className="font-bold flex items-center gap-2"><FaUsers className="text-purple-500" /> Departments</h4><button onClick={openAddDept} className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600"><FaPlus /> Add</button></div><div className="space-y-2 max-h-96 overflow-y-auto">{(departments || []).map(d => (<div key={d.id} className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100 group"><div><div className="font-bold text-sm">{d.name} <span className="text-xs text-orange-500 font-mono">[{d.code}]</span></div><div className="text-xs text-gray-400">{d.localOrgName}</div></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => openEditDept(d)} className="text-blue-500 p-1"><FaEdit /></button><button onClick={() => deleteDept(d.id)} className="text-red-500 p-1"><FaTrash /></button></div></div>))}</div></div>
            </div>
          </div>
        )}

        {/* ... PROJECTS TAB ... */}
        {activeTab === 'projects' && (
          <div className="p-8 overflow-y-auto h-full">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Projects</h2><button onClick={openAddProject} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"><FaPlus className="inline mr-2" /> Add Project</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolioData?.projects.map((p, idx) => (
                <div key={p.id || idx} className="bg-white rounded-xl shadow-sm border overflow-hidden group relative hover:border-orange-300 transition-all">
                  <img src={p.imageUrl || "https://placehold.co/400"} className="w-full h-40 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openEditProject(p); }} className="bg-white p-2 rounded-full text-blue-600 shadow hover:bg-blue-50"><FaEdit /></button>
                    <button onClick={(e) => { e.stopPropagation(); p.id && deleteProject(p.id); }} className="bg-white p-2 rounded-full text-red-600 shadow hover:bg-red-50"><FaTrash /></button>
                  </div>
                  <div className="p-4"><h3 className="font-bold truncate">{p.title}</h3><p className="text-xs text-gray-500">{p.role}</p><p className="text-xs text-gray-300">ID: {p.id}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ... SKILLS TAB ... */}
        {activeTab === 'skills' && (
          <div className="p-8 overflow-y-auto h-full">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Skills</h2><button onClick={openAddSkill} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"><FaPlus className="inline mr-2" /> Add Skill</button></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {portfolioData?.skills.map((s, idx) => (
                <div key={s.id || idx} className="bg-white p-4 rounded border flex justify-between items-center group relative hover:shadow-md transition">
                  <div><div className="font-bold">{s.name}</div><div className="text-xs text-gray-500">{s.category}</div></div>
                  <div className="flex gap-2 items-center">
                    <span className="text-blue-600 font-bold mr-2">{s.proficiency}%</span>
                    <button onClick={(e) => { e.stopPropagation(); openEditSkill(s) }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><FaEdit /></button>
                    <button onClick={(e) => { e.stopPropagation(); s.id && deleteSkill(s.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><FaTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ... EXPERIENCE TAB ... */}
        {activeTab === 'experience' && (
          <div className="p-8 overflow-y-auto h-full">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Experience</h2><button onClick={openAddExperience} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"><FaPlus className="inline mr-2" /> Add Experience</button></div>
            <div className="space-y-4">{portfolioData?.workHistory.map((w, idx) => (<div key={w.id || idx} className="bg-white p-4 rounded border shadow-sm relative group hover:border-orange-200 transition"><h4 className="font-bold text-lg">{w.company}</h4><div className="text-blue-600 font-medium">{w.role}</div><div className="text-xs text-gray-500">{w.startDate} - {w.isCurrent ? "Present" : w.endDate}</div><p className="text-sm mt-2 text-gray-600 whitespace-pre-wrap">{w.description}</p><div className="absolute top-4 right-4 flex gap-2"><button onClick={(e) => { e.stopPropagation(); openEditExperience(w) }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full shadow"><FaEdit /></button><button onClick={(e) => { e.stopPropagation(); w.id && deleteExperience(w.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full shadow"><FaTrash /></button></div></div>))}</div>
          </div>
        )}

        {/* ... EDUCATION TAB ... */}
        {activeTab === 'education' && (
          <div className="p-8 overflow-y-auto h-full">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Education</h2><button onClick={openAddEducation} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"><FaPlus className="inline mr-2" /> Add Education</button></div>
            <div className="space-y-4">{portfolioData?.education.map((e, idx) => (<div key={e.id || idx} className="bg-white p-4 rounded border flex justify-between items-center group relative hover:border-orange-200"><div><h4 className="font-bold">{e.school}</h4><p className="text-sm">{e.degree} <span className="text-gray-400">({e.year})</span></p><p className="text-xs text-gray-500 mt-1">{e.description}</p></div><div className="flex gap-2"><button onClick={(event) => { event.stopPropagation(); openEditEducation(e); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><FaEdit /></button><button onClick={(event) => { event.stopPropagation(); e.id && deleteEducation(e.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><FaTrash /></button></div></div>))}</div>
          </div>
        )}

        {/* ... PUBLICATIONS TAB ... */}
        {activeTab === 'publications' && (
          <div className="p-8 overflow-y-auto h-full">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Publications</h2><button onClick={openAddPub} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"><FaPlus className="inline mr-2" /> Add Publication</button></div>
            <div className="space-y-4">{portfolioData?.publications?.map((p: any, idx) => (<div key={p.id || idx} className="bg-white p-4 rounded border flex justify-between items-center group hover:border-orange-200"><div><h4 className="font-bold">{p.title}</h4><p className="text-sm text-gray-600">{p.publisher} • {p.releaseDate}</p><a href={p.url} target="_blank" className="text-blue-500 text-xs hover:underline">{p.url}</a></div><div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); openEditPub(p); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><FaEdit /></button><button onClick={(e) => { e.stopPropagation(); p.id && deletePub(p.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><FaTrash /></button></div></div>))}</div>
          </div>
        )}

        {/* ... EVENTS TAB ... */}
        {activeTab === 'events' && (
          <div className="p-8 overflow-y-auto h-full">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Events</h2><button onClick={openAddEvent} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"><FaPlus className="inline mr-2" /> Add Event</button></div>
            <div className="space-y-4">{portfolioData?.events?.map((e: any, idx) => (<div key={e.id || idx} className="bg-white p-4 rounded border flex justify-between items-center group hover:border-orange-200"><div className="flex items-center gap-3">{e.imageUrl && <img src={e.imageUrl} className="w-10 h-10 rounded object-cover" />}<div><h4 className="font-bold">{e.name} <span className="text-xs bg-gray-100 px-2 rounded font-normal">{e.role}</span></h4><p className="text-xs text-gray-500">{e.date}</p><p className="text-sm mt-1">{e.description}</p></div></div><div className="flex gap-2"><button onClick={(event) => { event.stopPropagation(); openEditEvent(e); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><FaEdit /></button><button onClick={(event) => { event.stopPropagation(); e.id && deleteEvent(e.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><FaTrash /></button></div></div>))}</div>
          </div>
        )}

        {/* ... CV IMPORT TAB ... */}
        {activeTab === 'cv-import' && (
          <div className="p-8 flex items-center justify-center h-full">
            {loadingImport ? (
              <div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-500 border-solid mx-auto mb-4"></div><h2 className="text-xl font-bold">AI Processing...</h2></div>
            ) : (
              <div className="bg-white p-10 rounded-2xl shadow-lg text-center max-w-md w-full border-2 border-dashed border-gray-300">
                <FaFileUpload className="mx-auto text-6xl text-orange-500 mb-4" /><h2 className="text-2xl font-bold mb-2">Import CV</h2><p className="text-gray-500 mb-6 text-sm">Upload CV to auto-generate.</p>
                <label className="bg-orange-500 text-white px-6 py-3 rounded-lg font-bold cursor-pointer hover:bg-orange-600 transition block w-full">Select File<input type="file" hidden accept=".pdf,.docx" onChange={handleImportCV} /></label>
              </div>
            )}
          </div>
        )}

        {/* ... PROFILE LIST TAB ... */}
        {activeTab === 'profile-list' && (
          <div className="p-8 overflow-y-auto h-full">
            <h2 className="text-2xl font-bold mb-6">Manage Profiles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{profileList.map((p: any) => (<div key={p.id} className={`bg-white p-6 rounded-xl border shadow-sm relative group hover:border-orange-500 transition`}><div className="cursor-pointer" onClick={() => handleSwitchProfile(p.id)}><div className="flex items-center gap-4 mb-4"><img src={p.avatarUrl || "https://placehold.co/100"} className="w-12 h-12 rounded-full bg-gray-200 object-cover" /><div><h4 className="font-bold truncate max-w-[150px]">{p.fullName || "Unnamed"}</h4><p className="text-xs text-gray-500 truncate max-w-[150px]">{p.jobTitle || "No Title"}</p></div></div>

              {/* 🔥 HIỂN THỊ USERNAME TRONG LIST 🔥 */}
              <div className="text-xs text-gray-400 flex justify-between items-center">
                <span>ID: {p.id}</span>
                <span className="font-bold text-orange-500 flex items-center gap-1"><FaUser className="text-[10px]" /> {p.username || 'No Acc'}</span>
              </div>

            </div>

              {/* Action Buttons */}
              <div className="mt-4 flex justify-between items-center border-t pt-4">
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleActivateProfile(p.id, p.fullName); }} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-bold hover:bg-green-200 transition flex items-center gap-1 shadow-sm border border-green-200"><FaGlobe /> Public</button>
                  {/* DELETE BUTTON */}
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteProfile(p.id, p.fullName); }} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold hover:bg-red-200 transition flex items-center gap-1 shadow-sm border border-red-200"><FaTrash /> Del</button>
                </div>
                {portfolioData?.id === p.id && (<span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-bold flex items-center gap-1"><FaCheck /> Editing</span>)}
              </div>

            </div>))}</div>

            {/* --- THANH PHÂN TRANG --- */}
            <div className="flex justify-center items-center mt-8 gap-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="bg-white border p-2 rounded-full shadow hover:bg-gray-100 disabled:opacity-50"
              >
                <FaChevronLeft />
              </button>
              <span className="font-bold text-gray-600">
                Page {currentPage + 1} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => (p + 1 < totalPages ? p + 1 : p))}
                disabled={currentPage >= totalPages - 1}
                className="bg-white border p-2 rounded-full shadow hover:bg-gray-100 disabled:opacity-50"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* MODALS */}
        {showRegionModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
              <h3 className="font-bold text-xl">{editingRegion.id ? 'Edit' : 'Add'} Region</h3>
              <div><label className="text-xs font-bold text-gray-500">Region Name</label><input className="w-full border p-2 rounded" placeholder="e.g. Miền Bắc" value={editingRegion.name || ''} onChange={e => setEditingRegion({ ...editingRegion, name: e.target.value })} /></div>
              <div><label className="text-xs font-bold text-gray-500">Region Code (Unique)</label><input className="w-full border p-2 rounded uppercase" placeholder="e.g. MB" value={editingRegion.code || ''} onChange={e => setEditingRegion({ ...editingRegion, code: e.target.value?.toUpperCase() })} /></div>
              <div className="flex justify-end gap-2 pt-2"><button onClick={() => setShowRegionModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button><button onClick={saveRegion} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Save</button></div>
            </div>
          </div>
        )}

        {showLocalModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
              <h3 className="font-bold text-xl">{editingLocal.id ? 'Edit' : 'Add'} Local Org</h3>
              <div><label className="text-xs font-bold text-gray-500">Local Org Name</label><input className="w-full border p-2 rounded" placeholder="e.g. Chi Nhánh Hà Nội" value={editingLocal.name || ''} onChange={e => setEditingLocal({ ...editingLocal, name: e.target.value })} /></div>
              <div><label className="text-xs font-bold text-gray-500">Org Code (Unique)</label><input className="w-full border p-2 rounded uppercase" placeholder="e.g. HN" value={editingLocal.code || ''} onChange={e => setEditingLocal({ ...editingLocal, code: e.target.value?.toUpperCase() })} /></div>
              <div><label className="text-xs font-bold text-gray-500">Belongs to Region</label><select className="w-full border p-2 rounded" value={editingLocal.regionId} onChange={e => setEditingLocal({ ...editingLocal, regionId: Number(e.target.value) })}><option value="">Select Region</option>{(regions || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              <div className="flex justify-end gap-2 pt-2"><button onClick={() => setShowLocalModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button><button onClick={saveLocal} className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">Save</button></div>
            </div>
          </div>
        )}

        {showDeptModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
              <h3 className="font-bold text-xl">{editingDept.id ? 'Edit' : 'Add'} Department</h3>
              <div><label className="text-xs font-bold text-gray-500">Department Name</label><input className="w-full border p-2 rounded" placeholder="e.g. Phòng IT" value={editingDept.name || ''} onChange={e => setEditingDept({ ...editingDept, name: e.target.value })} /></div>
              <div><label className="text-xs font-bold text-gray-500">Dept Code (Unique)</label><input className="w-full border p-2 rounded uppercase" placeholder="e.g. IT" value={editingDept.code || ''} onChange={e => setEditingDept({ ...editingDept, code: e.target.value?.toUpperCase() })} /></div>
              <div><label className="text-xs font-bold text-gray-500">Belongs to Local Org</label><select className="w-full border p-2 rounded" value={editingDept.localOrgId} onChange={e => setEditingDept({ ...editingDept, localOrgId: Number(e.target.value) })}><option value="">Select Local Org</option>{(locals || []).map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}</select></div>
              <div className="flex justify-end gap-2 pt-2"><button onClick={() => setShowDeptModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button><button onClick={saveDept} className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">Save</button></div>
            </div>
          </div>
        )}

        {showProjectModal && editingProject && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 space-y-6"><div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">{editingProject.id ? 'Edit Project' : 'New Project'}</h3><button onClick={() => setShowProjectModal(false)}><FaTimes /></button></div><div className="grid grid-cols-2 gap-4"><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Title</label><input className="w-full border p-2 rounded" value={editingProject.title || ''} onChange={e => setEditingProject({ ...editingProject, title: e.target.value })} /></div><div><label className="text-xs font-bold text-gray-400 uppercase">Role</label><input className="w-full border p-2 rounded" value={editingProject.role || ''} onChange={e => setEditingProject({ ...editingProject, role: e.target.value })} /></div><div><label className="text-xs font-bold text-gray-400 uppercase">Customer</label><input className="w-full border p-2 rounded" value={editingProject.customer || ''} onChange={e => setEditingProject({ ...editingProject, customer: e.target.value })} /></div><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Tech Stack</label><input className="w-full border p-2 rounded" value={editingProject.technologies?.join(', ') || ''} onChange={e => setEditingProject({ ...editingProject, technologies: e.target.value.split(',').map(s => s.trim()) })} /></div><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Image</label><label className="cursor-pointer relative w-full h-48 rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-500 flex flex-col items-center justify-center bg-gray-50 overflow-hidden group transition-all"><input type="file" hidden onChange={(e) => handleFileUpload(e, 'project')} />{uploading ? (<div className="flex flex-col items-center text-orange-500"><FaSpinner className="animate-spin text-3xl mb-2" /><span className="text-sm font-bold">Uploading...</span></div>) : editingProject.imageUrl ? (<div className="relative w-full h-full"><img src={editingProject.imageUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><span className="text-white font-bold flex items-center gap-2"><FaCloudUploadAlt /> Change Image</span></div></div>) : (<div className="text-gray-400 text-center"><FaImage className="text-4xl mx-auto mb-2" /><span className="text-sm">Click to upload image</span></div>)}</label></div><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Repo URL</label><input className="w-full border p-2 rounded" value={editingProject.repoUrl || ''} onChange={e => setEditingProject({ ...editingProject, repoUrl: e.target.value })} /></div><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Description</label><textarea className="w-full border p-2 rounded" rows={4} value={editingProject.description || ''} onChange={e => setEditingProject({ ...editingProject, description: e.target.value })} /></div></div><div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowProjectModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={saveProject} className="px-8 py-2 bg-orange-500 text-white rounded-lg font-bold shadow-lg hover:bg-orange-600 transition">Save</button></div></div></div>
        )}

        {showExpModal && editingExp && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6"><div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Experience</h3><button onClick={() => setShowExpModal(false)}><FaTimes /></button></div><div className="grid grid-cols-2 gap-4"><input className="border p-2 rounded" placeholder="Company" value={editingExp.company || ''} onChange={e => setEditingExp({ ...editingExp, company: e.target.value })} /><input className="border p-2 rounded" placeholder="Role" value={editingExp.role || ''} onChange={e => setEditingExp({ ...editingExp, role: e.target.value })} /><input type="date" className="border p-2 rounded" value={editingExp.startDate || ''} onChange={e => setEditingExp({ ...editingExp, startDate: e.target.value })} /><div className="flex gap-2 items-center"><input type="date" disabled={editingExp.isCurrent} className="border p-2 rounded flex-1" value={editingExp.endDate || ''} onChange={e => setEditingExp({ ...editingExp, endDate: e.target.value })} /><label><input type="checkbox" checked={editingExp.isCurrent || false} onChange={e => setEditingExp({ ...editingExp, isCurrent: e.target.checked })} /> Present</label></div></div><textarea className="w-full border p-2 rounded" rows={3} placeholder="Description" value={editingExp.description || ''} onChange={e => setEditingExp({ ...editingExp, description: e.target.value })} /><div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowExpModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={saveExperience} className="px-8 py-2 bg-orange-500 text-white rounded-lg font-bold">Save</button></div></div></div>
        )}

        {showSkillModal && editingSkill && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-8 space-y-6"><div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Skill</h3><button onClick={() => setShowSkillModal(false)}><FaTimes /></button></div><div className="space-y-4"><div><label className="text-xs font-bold text-gray-500">Name</label><input className="w-full border p-2 rounded" value={editingSkill.name || ''} onChange={e => setEditingSkill({ ...editingSkill, name: e.target.value })} /></div><div><label className="text-xs font-bold text-gray-500">Type</label><select className="w-full border p-2 rounded" value={editingSkill.category} onChange={e => setEditingSkill({ ...editingSkill, category: e.target.value })}><option>Backend</option><option>Frontend</option><option>Database</option><option>DevOps</option><option>Scientific</option></select></div><div><label className="text-xs font-bold text-gray-500">Proficiency (%)</label><input type="number" className="w-full border p-2 rounded" value={editingSkill.proficiency || 0} onChange={e => setEditingSkill({ ...editingSkill, proficiency: parseInt(e.target.value) })} /></div></div><div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowSkillModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={saveSkill} className="px-8 py-2 bg-orange-500 text-white rounded-lg font-bold">Save</button></div></div></div>
        )}

        {showEduModal && editingEdu && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6"><div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Education</h3><button onClick={() => setShowEduModal(false)}><FaTimes /></button></div><div className="grid grid-cols-2 gap-4"><input className="border p-2 rounded" placeholder="School" value={editingEdu.schoolName || ''} onChange={e => setEditingEdu({ ...editingEdu, schoolName: e.target.value })} /><input className="border p-2 rounded" placeholder="Degree" value={editingEdu.degree || ''} onChange={e => setEditingEdu({ ...editingEdu, degree: e.target.value })} /><input type="date" className="border p-2 rounded" value={editingEdu.startDate || ''} onChange={e => setEditingEdu({ ...editingEdu, startDate: e.target.value })} /><input type="date" className="border p-2 rounded" value={editingEdu.endDate || ''} onChange={e => setEditingEdu({ ...editingEdu, endDate: e.target.value })} /></div><textarea className="w-full border p-2 rounded" placeholder="Description" value={editingEdu.description || ''} onChange={e => setEditingEdu({ ...editingEdu, description: e.target.value })} /><div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowEduModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={saveEducation} className="px-8 py-2 bg-orange-500 text-white rounded-lg font-bold">Save</button></div></div></div>
        )}

        {showPubModal && editingPub && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6"><div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Publication</h3><button onClick={() => setShowPubModal(false)}><FaTimes /></button></div><div className="grid grid-cols-2 gap-4"><input className="border p-2 rounded col-span-2" placeholder="Title" value={editingPub.title || ''} onChange={e => setEditingPub({ ...editingPub, title: e.target.value })} /><input className="border p-2 rounded" placeholder="Publisher" value={editingPub.publisher || ''} onChange={e => setEditingPub({ ...editingPub, publisher: e.target.value })} /><input type="date" className="border p-2 rounded" value={editingPub.releaseDate || ''} onChange={e => setEditingPub({ ...editingPub, releaseDate: e.target.value })} /><input className="border p-2 rounded col-span-2" placeholder="URL" value={editingPub.url || ''} onChange={e => setEditingPub({ ...editingPub, url: e.target.value })} /></div><div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowPubModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={savePub} className="px-8 py-2 bg-orange-500 text-white rounded-lg font-bold">Save</button></div></div></div>
        )}

        {showEventModal && editingEvent && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6"><div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Event</h3><button onClick={() => setShowEventModal(false)}><FaTimes /></button></div><div className="grid grid-cols-2 gap-4"><input className="border p-2 rounded" placeholder="Event Name" value={editingEvent.name || ''} onChange={e => setEditingEvent({ ...editingEvent, name: e.target.value })} /><input className="border p-2 rounded" placeholder="Role" value={editingEvent.role || ''} onChange={e => setEditingEvent({ ...editingEvent, role: e.target.value })} /><input type="date" className="border p-2 rounded" value={editingEvent.date || ''} onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })} /><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Event Image</label><label className="cursor-pointer relative w-full h-32 rounded-lg border-2 border-dashed border-gray-300 hover:border-orange-500 flex flex-col items-center justify-center bg-gray-50 overflow-hidden group"><input type="file" hidden onChange={e => handleFileUpload(e, 'event')} />{uploading ? (<FaSpinner className="animate-spin text-orange-500 text-2xl" />) : editingEvent.imageUrl ? (<div className="relative w-full h-full group"><img src={editingEvent.imageUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><span className="text-white font-bold flex items-center gap-2"><FaCloudUploadAlt /> Change</span></div></div>) : (<div className="text-center"><FaImage className="text-2xl text-gray-400 mx-auto" /><span className="text-xs text-gray-400">Click to upload</span></div>)}</label></div></div><textarea className="w-full border p-2 rounded" placeholder="Description" value={editingEvent.description || ''} onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })} /><div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowEventModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={saveEvent} className="px-8 py-2 bg-orange-500 text-white rounded-lg font-bold">Save</button></div></div></div>
        )}

        {incomingCalls.length > 0 && (
          <div className="absolute top-6 right-6 z-50 w-80 space-y-3">
            {incomingCalls.map((call, i) => (
              <div key={i} className="bg-white p-4 rounded-xl shadow-2xl border-l-4 border-green-500 flex justify-between items-center animate-bounce">
                <div><p className="font-bold">{call.visitorName} calling...</p><p className="text-xs text-gray-500">Video Request</p></div>
                <button onClick={() => { setActiveCallRoom(call.roomId); setIncomingCalls(p => p.filter(c => c.roomId !== call.roomId)) }} className="bg-green-500 text-white p-3 rounded-full hover:bg-green-600"><FaVideo /></button>
              </div>
            ))}
          </div>
        )}
        {activeCallRoom && <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"><VideoCallInterface roomId={activeCallRoom} userRole="Admin" remoteName="Visitor" onEndCall={() => setActiveCallRoom('')} /></div>}

      </div>
    </div>
  );
};

export default Admin;