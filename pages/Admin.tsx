import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {
  FaUserCircle, FaVideo, FaPaperPlane, FaCode, FaUser, // <--- Đã thêm FaVideo vào đây
  FaImage, FaPlus, FaEdit, FaTrash, FaSave, FaTimes,
  FaTools, FaBriefcase, FaFileUpload, FaList, FaCheck,
  FaGraduationCap, FaNewspaper, FaTrophy, FaGlobe, FaCloudUploadAlt, FaSpinner
} from 'react-icons/fa';
import VideoCallInterface from '../components/VideoCallInterface';
import { portfolioService, adminService } from '../services/api';
import { PortfolioData, Project, Skill, WorkExperience, ChatMessage } from '../types';

interface ChatSession { visitorId: string; visitorName: string; messages: ChatMessage[]; unreadCount: number; lastActive: number; }
type ActiveTab = 'chat' | 'profile' | 'projects' | 'skills' | 'experience' | 'education' | 'publications' | 'events' | 'cv-import' | 'profile-list';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [loading, setLoading] = useState(true);
  const [loadingImport, setLoadingImport] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [profileList, setProfileList] = useState<any[]>([]);

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

  const stompClient = useRef<Client | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();
    connectSocket();
    return () => { stompClient.current?.deactivate(); };
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const list = await adminService.getAllProfiles();
      setProfileList(list);

      if (list.length > 0) {
        const currentId = portfolioData?.id || list[0].id;
        const data = await portfolioService.getPortfolioById(currentId);
        console.log("Projects loaded:", data.projects);
        setPortfolioData(data);
        setEditingProfile(data);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSwitchProfile = async (id: number) => {
    setLoading(true);
    try {
      const data = await portfolioService.getPortfolioById(id);
      setPortfolioData(data);
      setEditingProfile(data);
      setActiveTab('profile');
    } catch (e) { alert("Failed to load profile details"); } finally { setLoading(false); }
  };

  const connectSocket = () => {
    const socket = new SockJS('http://localhost:8080/ws');
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
    const visitorId = msg.senderId;
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
      fetchInitialData();
    }
  };

  const handleImportCV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      if (confirm("Importing CV creates a NEW profile. Continue?")) {
        setLoadingImport(true);
        try {
          await adminService.importCV(e.target.files[0]);
          alert("✅ CV Imported successfully!");
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

  // --- LOGIC PROJECTS ---
  const openAddProject = () => {
    setEditingProject({ title: '', role: '', customer: '', description: '', technologies: [], imageUrl: '', repoUrl: '' });
    setShowProjectModal(true);
  };

  const openEditProject = (project: Project) => {
    console.log("Editing Project:", project);
    if (!project.id) alert("Cảnh báo: Dự án này không có ID, khi lưu sẽ bị tạo mới!");
    setEditingProject({ ...project });
    setShowProjectModal(true);
  };

  const saveProject = async () => {
    if (portfolioData?.id) {
      try {
        if (editingProject.id) {
          await adminService.updateProject(editingProject as Project, portfolioData.id);
          alert("✅ Cập nhật thành công!");
        } else {
          await adminService.createProject(editingProject as Project, portfolioData.id);
          alert("✅ Thêm mới thành công!");
        }
        setShowProjectModal(false);
        fetchInitialData();
      } catch (e) {
        console.error(e);
        alert("Lỗi khi lưu dự án");
      }
    } else {
      alert("Lỗi: Không tìm thấy Profile ID");
    }
  };

  const deleteProject = async (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa dự án này?")) {
      await adminService.deleteProject(id);
      fetchInitialData();
    }
  };

  // --- LOGIC EXPERIENCE ---
  const openAddExperience = () => { setEditingExp({ company: '', role: '', startDate: '', endDate: '', description: '', isCurrent: false }); setShowExpModal(true); };
  const openEditExperience = (exp: WorkExperience) => { setEditingExp({ ...exp }); setShowExpModal(true); };
  const saveExperience = async () => {
    if (portfolioData?.id) {
      if (editingExp.id) await adminService.updateExperience(editingExp as WorkExperience, portfolioData.id);
      else await adminService.addExperience(editingExp as WorkExperience, portfolioData.id);
      setShowExpModal(false); fetchInitialData();
    }
  };
  const deleteExperience = async (id: number) => { if (confirm("Delete?")) { await adminService.deleteExperience(id); fetchInitialData(); } };

  // --- LOGIC SKILL ---
  const openAddSkill = () => { setEditingSkill({ name: '', category: 'Backend', proficiency: 50 }); setShowSkillModal(true); };
  const openEditSkill = (skill: Skill) => { setEditingSkill({ ...skill }); setShowSkillModal(true); };
  const saveSkill = async () => {
    if (portfolioData?.id) {
      if (editingSkill.id) await adminService.updateSkill(editingSkill as Skill, portfolioData.id);
      else await adminService.addSkill(editingSkill as Skill, portfolioData.id);
      setShowSkillModal(false); fetchInitialData();
    }
  };
  const deleteSkill = async (id: number) => { if (confirm("Delete?")) { await adminService.deleteSkill(id); fetchInitialData(); } };

  // --- LOGIC EDUCATION ---
  const openAddEducation = () => { setEditingEdu({ schoolName: '', degree: '', startDate: '', endDate: '', description: '' }); setShowEduModal(true); };
  const openEditEducation = (edu: any) => { setEditingEdu({ ...edu }); setShowEduModal(true); };
  const saveEducation = async () => {
    if (portfolioData?.id) {
      if (editingEdu.id) await adminService.updateEducation(editingEdu, portfolioData.id);
      else await adminService.addEducation(editingEdu, portfolioData.id);
      setShowEduModal(false); fetchInitialData();
    }
  };
  const deleteEducation = async (id: number) => { if (confirm("Delete?")) { await adminService.deleteEducation(id); fetchInitialData(); } };

  // --- LOGIC PUBLICATION ---
  const openAddPub = () => { setEditingPub({ title: '', publisher: '', releaseDate: '', url: '' }); setShowPubModal(true); };
  const openEditPub = (pub: any) => { setEditingPub({ ...pub }); setShowPubModal(true); };
  const savePub = async () => {
    if (portfolioData?.id) {
      if (editingPub.id) await adminService.updatePublication(editingPub, portfolioData.id);
      else await adminService.addPublication(editingPub, portfolioData.id);
      setShowPubModal(false); fetchInitialData();
    }
  };
  const deletePub = async (id: number) => { if (confirm("Delete?")) { await adminService.deletePublication(id); fetchInitialData(); } };

  // --- LOGIC EVENT ---
  const openAddEvent = () => { setEditingEvent({ name: '', role: '', date: '', description: '', imageUrl: '' }); setShowEventModal(true); };
  const openEditEvent = (evt: any) => { setEditingEvent({ ...evt }); setShowEventModal(true); };
  const saveEvent = async () => {
    if (portfolioData?.id) {
      if (editingEvent.id) await adminService.updateEvent(editingEvent, portfolioData.id);
      else await adminService.addEvent(editingEvent, portfolioData.id);
      setShowEventModal(false); fetchInitialData();
    }
  };
  const deleteEvent = async (id: number) => { if (confirm("Delete?")) { await adminService.deleteEvent(id); fetchInitialData(); } };


  if (loading) return <div className="h-screen flex items-center justify-center text-xl font-bold text-orange-600">Loading System...</div>;

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
          <div className="text-xs text-green-500">ID: {portfolioData?.id}</div>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {['chat', 'profile', 'projects', 'skills', 'experience', 'education', 'publications', 'events', 'cv-import', 'profile-list'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as ActiveTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg capitalize transition ${activeTab === tab ? 'bg-orange-50 text-orange-600 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}>
              <FaList className="text-sm" /> <span className="hidden md:block">{tab.replace('-', ' ')}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
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
                <input className="border p-2 rounded" placeholder="Job Title" value={editingProfile.jobTitle} onChange={e => setEditingProfile({ ...editingProfile, jobTitle: e.target.value })} />
                <input className="border p-2 rounded" placeholder="Email" value={editingProfile.contact?.email} onChange={e => setEditingProfile({ ...editingProfile, contact: { ...editingProfile.contact!, email: e.target.value } })} />
                <input className="border p-2 rounded" placeholder="Phone" value={editingProfile.contact?.phone} onChange={e => setEditingProfile({ ...editingProfile, contact: { ...editingProfile.contact!, phone: e.target.value } })} />
              </div>
              <textarea className="w-full border p-2 rounded" rows={4} placeholder="Bio" value={editingProfile.bio} onChange={e => setEditingProfile({ ...editingProfile, bio: e.target.value })} />
              <button onClick={saveProfile} className="bg-orange-500 text-white px-6 py-2 rounded font-bold hover:bg-orange-600"><FaSave className="inline mr-2" /> Save Changes</button>
            </div>
          </div>
        )}

        {/* PROJECTS TAB */}
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

        {/* SKILLS TAB */}
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

        {/* EXPERIENCE TAB */}
        {activeTab === 'experience' && (
          <div className="p-8 overflow-y-auto h-full">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Experience</h2><button onClick={openAddExperience} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"><FaPlus className="inline mr-2" /> Add Experience</button></div>
            <div className="space-y-4">
              {portfolioData?.workHistory.map((w, idx) => (
                <div key={w.id || idx} className="bg-white p-4 rounded border shadow-sm relative group hover:border-orange-200 transition">
                  <h4 className="font-bold text-lg">{w.company}</h4>
                  <div className="text-blue-600 font-medium">{w.role}</div>
                  <div className="text-xs text-gray-500">{w.startDate} - {w.isCurrent ? "Present" : w.endDate}</div>
                  <p className="text-sm mt-2 text-gray-600 whitespace-pre-wrap">{w.description}</p>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openEditExperience(w) }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full shadow"><FaEdit /></button>
                    <button onClick={(e) => { e.stopPropagation(); w.id && deleteExperience(w.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full shadow"><FaTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EDUCATION TAB */}
        {activeTab === 'education' && (
          <div className="p-8 overflow-y-auto h-full">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Education</h2><button onClick={openAddEducation} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"><FaPlus className="inline mr-2" /> Add Education</button></div>
            <div className="space-y-4">
              {portfolioData?.education.map((e, idx) => (
                <div key={e.id || idx} className="bg-white p-4 rounded border flex justify-between items-center group relative hover:border-orange-200">
                  <div><h4 className="font-bold">{e.school}</h4><p className="text-sm">{e.degree} <span className="text-gray-400">({e.year})</span></p><p className="text-xs text-gray-500 mt-1">{e.description}</p></div>
                  <div className="flex gap-2">
                    <button onClick={(event) => { event.stopPropagation(); openEditEducation(e); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><FaEdit /></button>
                    <button onClick={(event) => { event.stopPropagation(); e.id && deleteEducation(e.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><FaTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PUBLICATIONS TAB */}
        {activeTab === 'publications' && (
          <div className="p-8 overflow-y-auto h-full">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Publications</h2><button onClick={openAddPub} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"><FaPlus className="inline mr-2" /> Add Publication</button></div>
            <div className="space-y-4">
              {portfolioData?.publications?.map((p: any, idx) => (
                <div key={p.id || idx} className="bg-white p-4 rounded border flex justify-between items-center group hover:border-orange-200">
                  <div><h4 className="font-bold">{p.title}</h4><p className="text-sm text-gray-600">{p.publisher} • {p.releaseDate}</p><a href={p.url} target="_blank" className="text-blue-500 text-xs hover:underline">{p.url}</a></div>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openEditPub(p); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><FaEdit /></button>
                    <button onClick={(e) => { e.stopPropagation(); p.id && deletePublication(p.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><FaTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === 'events' && (
          <div className="p-8 overflow-y-auto h-full">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Events</h2><button onClick={openAddEvent} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"><FaPlus className="inline mr-2" /> Add Event</button></div>
            <div className="space-y-4">
              {portfolioData?.events?.map((e: any, idx) => (
                <div key={e.id || idx} className="bg-white p-4 rounded border flex justify-between items-center group hover:border-orange-200">
                  <div className="flex items-center gap-3">
                    {e.imageUrl && <img src={e.imageUrl} className="w-10 h-10 rounded object-cover" />}
                    <div><h4 className="font-bold">{e.name} <span className="text-xs bg-gray-100 px-2 rounded font-normal">{e.role}</span></h4><p className="text-xs text-gray-500">{e.date}</p><p className="text-sm mt-1">{e.description}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(event) => { event.stopPropagation(); openEditEvent(e); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><FaEdit /></button>
                    <button onClick={(event) => { event.stopPropagation(); e.id && deleteEvent(e.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><FaTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cv-import' && (
          <div className="p-8 flex items-center justify-center h-full">
            {loadingImport ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-500 border-solid mx-auto mb-4"></div>
                <h2 className="text-xl font-bold">AI Processing...</h2>
                <p className="text-gray-500">Creating bilingual profile from CV.</p>
              </div>
            ) : (
              <div className="bg-white p-10 rounded-2xl shadow-lg text-center max-w-md w-full border-2 border-dashed border-gray-300">
                <FaFileUpload className="mx-auto text-6xl text-orange-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Import CV (PDF/DOCX)</h2>
                <p className="text-gray-500 mb-6 text-sm">Upload CV to auto-generate a new profile.</p>
                <label className="bg-orange-500 text-white px-6 py-3 rounded-lg font-bold cursor-pointer hover:bg-orange-600 transition block w-full">
                  Select File
                  <input type="file" hidden accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleImportCV} />
                </label>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile-list' && (
          <div className="p-8 overflow-y-auto h-full">
            <h2 className="text-2xl font-bold mb-6">Manage Profiles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profileList.map((p: any) => (
                <div key={p.id} className={`bg-white p-6 rounded-xl border shadow-sm relative group hover:border-orange-500 transition`}>
                  <div className="cursor-pointer" onClick={() => handleSwitchProfile(p.id)}>
                    <div className="flex items-center gap-4 mb-4">
                      <img src={p.avatarUrl || "https://placehold.co/100"} className="w-12 h-12 rounded-full bg-gray-200 object-cover" />
                      <div>
                        <h4 className="font-bold truncate max-w-[150px]">{p.fullName || "Unnamed"}</h4>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{p.jobTitle || "No Title"}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">ID: {p.id}</div>
                  </div>
                  <div className="mt-4 flex justify-between items-center border-t pt-4">
                    <button onClick={(e) => { e.stopPropagation(); handleActivateProfile(p.id, p.fullName); }}
                      className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-bold hover:bg-green-200 transition flex items-center gap-1 shadow-sm border border-green-200">
                      <FaGlobe /> Set Public
                    </button>
                    {portfolioData?.id === p.id && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-bold flex items-center gap-1"><FaCheck /> Editing</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- MODALS --- */}

        {/* PROJECT MODAL */}
        {showProjectModal && editingProject && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="font-bold text-2xl">{editingProject.id ? 'Edit Project' : 'New Project'}</h3>
                <button onClick={() => setShowProjectModal(false)}><FaTimes /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Title</label>
                  <input className="w-full border p-2 rounded" value={editingProject.title || ''} onChange={e => setEditingProject({ ...editingProject, title: e.target.value })} />
                </div>
                <div><label className="text-xs font-bold text-gray-400 uppercase">Role</label><input className="w-full border p-2 rounded" value={editingProject.role || ''} onChange={e => setEditingProject({ ...editingProject, role: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-gray-400 uppercase">Customer</label><input className="w-full border p-2 rounded" value={editingProject.customer || ''} onChange={e => setEditingProject({ ...editingProject, customer: e.target.value })} /></div>
                <div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Tech Stack</label><input className="w-full border p-2 rounded" value={editingProject.technologies?.join(', ') || ''} onChange={e => setEditingProject({ ...editingProject, technologies: e.target.value.split(',').map(s => s.trim()) })} /></div>

                {/* PROJECT IMAGE */}
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Image</label>
                  <label className="cursor-pointer relative w-full h-48 rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-500 flex flex-col items-center justify-center bg-gray-50 overflow-hidden group transition-all">
                    <input type="file" hidden onChange={(e) => handleFileUpload(e, 'project')} />
                    {uploading ? (
                      <div className="flex flex-col items-center text-orange-500"><FaSpinner className="animate-spin text-3xl mb-2" /><span className="text-sm font-bold">Uploading...</span></div>
                    ) : editingProject.imageUrl ? (
                      <div className="relative w-full h-full">
                        <img src={editingProject.imageUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <span className="text-white font-bold flex items-center gap-2"><FaCloudUploadAlt /> Change Image</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center"><FaImage className="text-4xl mx-auto mb-2" /><span className="text-sm">Click to upload image</span></div>
                    )}
                  </label>
                </div>

                <div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Repo URL</label><input className="w-full border p-2 rounded" value={editingProject.repoUrl || ''} onChange={e => setEditingProject({ ...editingProject, repoUrl: e.target.value })} /></div>
                <div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Description</label><textarea className="w-full border p-2 rounded" rows={4} value={editingProject.description || ''} onChange={e => setEditingProject({ ...editingProject, description: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button onClick={() => setShowProjectModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button>
                <button onClick={saveProject} className="px-8 py-2 bg-orange-500 text-white rounded-lg font-bold shadow-lg hover:bg-orange-600 transition">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* EXPERIENCE MODAL */}
        {showExpModal && editingExp && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6">
              <div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Experience</h3><button onClick={() => setShowExpModal(false)}><FaTimes /></button></div>
              <div className="grid grid-cols-2 gap-4">
                <input className="border p-2 rounded" placeholder="Company" value={editingExp.company || ''} onChange={e => setEditingExp({ ...editingExp, company: e.target.value })} />
                <input className="border p-2 rounded" placeholder="Role" value={editingExp.role || ''} onChange={e => setEditingExp({ ...editingExp, role: e.target.value })} />
                <input type="date" className="border p-2 rounded" value={editingExp.startDate || ''} onChange={e => setEditingExp({ ...editingExp, startDate: e.target.value })} />
                <div className="flex gap-2 items-center"><input type="date" disabled={editingExp.isCurrent} className="border p-2 rounded flex-1" value={editingExp.endDate || ''} onChange={e => setEditingExp({ ...editingExp, endDate: e.target.value })} /><label><input type="checkbox" checked={editingExp.isCurrent || false} onChange={e => setEditingExp({ ...editingExp, isCurrent: e.target.checked })} /> Present</label></div>
              </div>
              <textarea className="w-full border p-2 rounded" rows={3} placeholder="Description" value={editingExp.description || ''} onChange={e => setEditingExp({ ...editingExp, description: e.target.value })} />
              <div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowExpModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={saveExperience} className="px-8 py-2 bg-orange-500 text-white rounded-lg font-bold">Save</button></div>
            </div>
          </div>
        )}

        {/* SKILL MODAL */}
        {showSkillModal && editingSkill && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-8 space-y-6">
              <div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Skill</h3><button onClick={() => setShowSkillModal(false)}><FaTimes /></button></div>
              <div className="space-y-4">
                <div><label className="text-xs font-bold text-gray-500">Name</label><input className="w-full border p-2 rounded" value={editingSkill.name || ''} onChange={e => setEditingSkill({ ...editingSkill, name: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-gray-500">Type</label><select className="w-full border p-2 rounded" value={editingSkill.category} onChange={e => setEditingSkill({ ...editingSkill, category: e.target.value })}><option>Backend</option><option>Frontend</option><option>Database</option><option>DevOps</option><option>Scientific</option></select></div>
                <div><label className="text-xs font-bold text-gray-500">Proficiency (%)</label><input type="number" className="w-full border p-2 rounded" value={editingSkill.proficiency || 0} onChange={e => setEditingSkill({ ...editingSkill, proficiency: parseInt(e.target.value) })} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowSkillModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={saveSkill} className="px-8 py-2 bg-orange-500 text-white rounded-lg font-bold">Save</button></div>
            </div>
          </div>
        )}

        {/* EDUCATION MODAL */}
        {showEduModal && editingEdu && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6">
              <div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Education</h3><button onClick={() => setShowEduModal(false)}><FaTimes /></button></div>
              <div className="grid grid-cols-2 gap-4">
                <input className="border p-2 rounded" placeholder="School" value={editingEdu.schoolName || ''} onChange={e => setEditingEdu({ ...editingEdu, schoolName: e.target.value })} />
                <input className="border p-2 rounded" placeholder="Degree" value={editingEdu.degree || ''} onChange={e => setEditingEdu({ ...editingEdu, degree: e.target.value })} />
                <input type="date" className="border p-2 rounded" value={editingEdu.startDate || ''} onChange={e => setEditingEdu({ ...editingEdu, startDate: e.target.value })} />
                <input type="date" className="border p-2 rounded" value={editingEdu.endDate || ''} onChange={e => setEditingEdu({ ...editingEdu, endDate: e.target.value })} />
              </div>
              <textarea className="w-full border p-2 rounded" placeholder="Description" value={editingEdu.description || ''} onChange={e => setEditingEdu({ ...editingEdu, description: e.target.value })} />
              <div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowEduModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={saveEducation} className="px-8 py-2 bg-orange-500 text-white rounded-lg font-bold">Save</button></div>
            </div>
          </div>
        )}

        {/* PUBLICATION MODAL */}
        {showPubModal && editingPub && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6">
              <div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Publication</h3><button onClick={() => setShowPubModal(false)}><FaTimes /></button></div>
              <div className="grid grid-cols-2 gap-4">
                <input className="border p-2 rounded col-span-2" placeholder="Title" value={editingPub.title || ''} onChange={e => setEditingPub({ ...editingPub, title: e.target.value })} />
                <input className="border p-2 rounded" placeholder="Publisher" value={editingPub.publisher || ''} onChange={e => setEditingPub({ ...editingPub, publisher: e.target.value })} />
                <input type="date" className="border p-2 rounded" value={editingPub.releaseDate || ''} onChange={e => setEditingPub({ ...editingPub, releaseDate: e.target.value })} />
                <input className="border p-2 rounded col-span-2" placeholder="URL" value={editingPub.url || ''} onChange={e => setEditingPub({ ...editingPub, url: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowPubModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={savePub} className="px-8 py-2 bg-orange-500 text-white rounded-lg font-bold">Save</button></div>
            </div>
          </div>
        )}

        {/* EVENT MODAL */}
        {showEventModal && editingEvent && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6">
              <div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Event</h3><button onClick={() => setShowEventModal(false)}><FaTimes /></button></div>
              <div className="grid grid-cols-2 gap-4">
                <input className="border p-2 rounded" placeholder="Event Name" value={editingEvent.name || ''} onChange={e => setEditingEvent({ ...editingEvent, name: e.target.value })} />
                <input className="border p-2 rounded" placeholder="Role" value={editingEvent.role || ''} onChange={e => setEditingEvent({ ...editingEvent, role: e.target.value })} />
                <input type="date" className="border p-2 rounded" value={editingEvent.date || ''} onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })} />

                {/* EVENT IMAGE */}
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Event Image</label>
                  <label className="cursor-pointer relative w-full h-32 rounded-lg border-2 border-dashed border-gray-300 hover:border-orange-500 flex flex-col items-center justify-center bg-gray-50 overflow-hidden group">
                    <input type="file" hidden onChange={e => handleFileUpload(e, 'event')} />
                    {uploading ? (
                      <FaSpinner className="animate-spin text-orange-500 text-2xl" />
                    ) : editingEvent.imageUrl ? (
                      <div className="relative w-full h-full group">
                        <img src={editingEvent.imageUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><span className="text-white font-bold flex items-center gap-2"><FaCloudUploadAlt /> Change</span></div>
                      </div>
                    ) : (
                      <div className="text-center"><FaImage className="text-2xl text-gray-400 mx-auto" /><span className="text-xs text-gray-400">Click to upload</span></div>
                    )}
                  </label>
                </div>
              </div>
              <textarea className="w-full border p-2 rounded" placeholder="Description" value={editingEvent.description || ''} onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })} />
              <div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowEventModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={saveEvent} className="px-8 py-2 bg-orange-500 text-white rounded-lg font-bold">Save</button></div>
            </div>
          </div>
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