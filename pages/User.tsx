import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {
    FaUserCircle, FaVideo, FaPaperPlane, FaCode,
    FaImage, FaPlus, FaEdit, FaTrash, FaSave, FaTimes,
    FaBriefcase, FaFileUpload, FaList,
    FaGraduationCap, FaNewspaper, FaTrophy, FaGlobe, FaCloudUploadAlt, FaSpinner,
    FaSignOutAlt, FaSearch, FaCommentDots, FaLock, FaKey, FaCopy, FaExternalLinkAlt
} from 'react-icons/fa';
import VideoCallInterface from '../components/VideoCallInterface';
import { userService, adminService } from '../services/api';
import { PortfolioData, Project, Skill, WorkExperience, ChatMessage, Region, LocalOrg, Department } from '../types';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface ChatSession { visitorId: string; visitorName: string; messages: ChatMessage[]; unreadCount: number; lastActive: number; }

// Đã bỏ 'cv-import'
type ActiveTab = 'chat' | 'profile' | 'projects' | 'skills' | 'experience' | 'education' | 'publications' | 'events' | 'change-password';

const User: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);

    // --- ORG DATA FOR LINK GENERATION ---
    const [regions, setRegions] = useState<Region[]>([]);
    const [locals, setLocals] = useState<LocalOrg[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);

    // --- CHANGE PASSWORD STATE ---
    const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

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
        fetchOrgData();
        connectSocket();
        return () => { stompClient.current?.deactivate(); };
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const data = await userService.getMyProfile();
            if (data && data.id) {
                setPortfolioData(data);
                setEditingProfile(data);
                localStorage.setItem('profileId', data.id.toString());
            } else {
                console.error("No profile data found!");
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const reloadProfileData = async () => {
        try {
            const data = await userService.getMyProfile();
            if (data) {
                setPortfolioData(data);
                setEditingProfile(data);
            }
        } catch (e) { console.error("Reload error", e); }
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

    const generateShareLink = () => {
        if (!portfolioData?.id) return "";
        const origin = window.location.origin;

        if (portfolioData.departmentId && departments.length > 0) {
            const dept = departments.find(d => d.id === portfolioData.departmentId);
            if (dept) {
                const local = locals.find(l => l.id === dept.localOrgId);
                if (local) {
                    const region = regions.find(r => r.id === local.regionId);
                    if (region) {
                        return `${origin}/#/view/${region.code}/${local.code}/${dept.code}/${portfolioData.id}`;
                    }
                }
            }
        }
        return `${origin}/#/view/${portfolioData.id}`;
    };

    const generatedLink = generateShareLink();
    const copyLink = () => { if (generatedLink) { navigator.clipboard.writeText(generatedLink); alert("Đã copy link vào bộ nhớ tạm!"); } };

    const handleLogout = () => { localStorage.clear(); navigate('/login'); };

    const handleChangePassword = async () => {
        if (passData.newPassword !== passData.confirmPassword) {
            alert("Mật khẩu xác nhận không khớp!");
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/api/v1/auth/change-password`, passData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Đổi mật khẩu thành công!");
            setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (e: any) {
            alert("Lỗi: " + (e.response?.data || "Không thể đổi mật khẩu"));
        }
    };

    const connectSocket = () => {
        const socket = new SockJS(import.meta.env.VITE_WS_URL);
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                const profileId = localStorage.getItem('profileId');
                if (profileId) {
                    client.subscribe(`/topic/private/${profileId}`, (msg) => handleIncomingMessage(JSON.parse(msg.body)));
                    client.subscribe(`/topic/call-requests/${profileId}`, (msg) => {
                        const req = JSON.parse(msg.body);
                        setIncomingCalls(prev => prev.find(c => c.roomId === req.roomId) ? prev : [...prev, req]);
                    });
                }
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
        const replyMsg = { sender: portfolioData?.fullName || "User", senderId: portfolioData?.id?.toString(), recipientId: selectedVisitorId, content: replyText, type: 'CHAT', timestamp: new Date().toLocaleTimeString() };
        stompClient.current.publish({ destination: "/app/chat.replyToUser", body: JSON.stringify(replyMsg) });
        setChatSessions(prev => ({ ...prev, [selectedVisitorId]: { ...prev[selectedVisitorId], messages: [...prev[selectedVisitorId].messages, replyMsg as ChatMessage] } }));
        setReplyText('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'project' | 'event') => {
        if (e.target.files?.[0]) {
            setUploading(true);
            try {
                const url = await adminService.uploadImage(e.target.files[0]);
                if (target === 'avatar' && editingProfile) setEditingProfile({ ...editingProfile, avatarUrl: url });
                else if (target === 'project' && editingProject) setEditingProject(prev => ({ ...prev, imageUrl: url }));
                else if (target === 'event') setEditingEvent((prev: any) => ({ ...prev, imageUrl: url }));
            } catch (err) { alert("Upload failed!"); } finally { setUploading(false); }
        }
    };

    const saveProfile = async () => {
        if (editingProfile) { await userService.updateProfile(editingProfile); alert("✅ Profile updated!"); fetchInitialData(); }
    };

    // --- CRUD WRAPPERS ---
    const openAddProject = () => { setEditingProject({ title: '', role: '', customer: '', description: '', technologies: [], imageUrl: '', repoUrl: '' }); setShowProjectModal(true); };
    const openEditProject = (p: Project) => { setEditingProject({ ...p }); setShowProjectModal(true); };
    const saveProject = async () => {
        if (isSaving) return; setIsSaving(true);
        try {
            if (editingProject.id) await userService.updateProject(editingProject.id, editingProject as Project);
            else await userService.addProject(editingProject as Project);
            setShowProjectModal(false); await reloadProfileData();
        } catch (e) { alert("Error saving project"); } finally { setIsSaving(false); }
    };
    const deleteProject = async (id: number) => { if (confirm("Delete?")) { await userService.deleteProject(id); await reloadProfileData(); } };

    const openAddSkill = () => { setEditingSkill({ name: '', category: 'Backend', proficiency: 50 }); setShowSkillModal(true); };
    const openEditSkill = (s: Skill) => { setEditingSkill({ ...s }); setShowSkillModal(true); };
    const saveSkill = async () => {
        if (isSaving) return; setIsSaving(true);
        try {
            if (editingSkill.id) await userService.updateSkill(editingSkill.id, editingSkill as Skill);
            else await userService.addSkill(editingSkill as Skill);
            setShowSkillModal(false); await reloadProfileData();
        } catch (e) { alert("Error saving skill"); } finally { setIsSaving(false); }
    };
    const deleteSkill = async (id: number) => { if (confirm("Delete?")) { await userService.deleteSkill(id); await reloadProfileData(); } };

    const openAddExp = () => { setEditingExp({ company: '', role: '', startDate: '', endDate: '', description: '', isCurrent: false }); setShowExpModal(true); };
    const openEditExp = (exp: WorkExperience) => { setEditingExp({ ...exp }); setShowExpModal(true); };
    const saveExp = async () => {
        if (isSaving) return; setIsSaving(true);
        try {
            if (editingExp.id) await userService.updateExperience(editingExp.id, editingExp as WorkExperience);
            else await userService.addExperience(editingExp as WorkExperience);
            setShowExpModal(false); await reloadProfileData();
        } catch (e) { alert("Error saving experience"); } finally { setIsSaving(false); }
    };
    const deleteExp = async (id: number) => { if (confirm("Delete?")) { await userService.deleteExperience(id); await reloadProfileData(); } };

    const openAddEdu = () => { setEditingEdu({ schoolName: '', degree: '', startDate: '', endDate: '', description: '' }); setShowEduModal(true); };
    const openEditEdu = (edu: any) => { setEditingEdu({ ...edu }); setShowEduModal(true); };
    const saveEdu = async () => {
        if (isSaving) return; setIsSaving(true);
        try {
            if (editingEdu.id) await userService.updateEducation(editingEdu.id, editingEdu);
            else await userService.addEducation(editingEdu);
            setShowEduModal(false); await reloadProfileData();
        } catch (e) { alert("Error saving education"); } finally { setIsSaving(false); }
    };
    const deleteEdu = async (id: number) => { if (confirm("Delete?")) { await userService.deleteEducation(id); await reloadProfileData(); } };

    const openAddPub = () => { setEditingPub({ title: '', publisher: '', releaseDate: '', url: '' }); setShowPubModal(true); };
    const openEditPub = (pub: any) => { setEditingPub({ ...pub }); setShowPubModal(true); };
    const savePub = async () => {
        if (isSaving) return; setIsSaving(true);
        try {
            if (editingPub.id) await userService.updatePublication(editingPub.id, editingPub);
            else await userService.addPublication(editingPub);
            setShowPubModal(false); await reloadProfileData();
        } catch (e) { alert("Error saving publication"); } finally { setIsSaving(false); }
    };
    const deletePub = async (id: number) => { if (confirm("Delete?")) { await userService.deletePublication(id); await reloadProfileData(); } };

    const openAddEvent = () => { setEditingEvent({ name: '', role: '', date: '', description: '', imageUrl: '' }); setShowEventModal(true); };
    const openEditEvent = (evt: any) => { setEditingEvent({ ...evt }); setShowEventModal(true); };
    const saveEvent = async () => {
        if (isSaving) return; setIsSaving(true);
        try {
            if (editingEvent.id) await userService.updateEvent(editingEvent.id, editingEvent);
            else await userService.addEvent(editingEvent);
            setShowEventModal(false); await reloadProfileData();
        } catch (e) { alert("Error saving event"); } finally { setIsSaving(false); }
    };
    const deleteEvent = async (id: number) => { if (confirm("Delete?")) { await userService.deleteEvent(id); await reloadProfileData(); } };

    if (loading) return <div className="h-screen flex items-center justify-center text-xl font-bold text-orange-600"><FaSpinner className="animate-spin mr-2" /> Loading...</div>;

    return (
        <div className="flex h-screen bg-gray-100 font-sans text-gray-800">
            {/* SIDEBAR */}
            <div className="w-20 md:w-64 bg-white border-r flex flex-col shadow-sm z-10">
                <div className="p-6 border-b flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg shadow-sm"></div>
                    <span className="font-bold text-xl hidden md:block">User Dashboard</span>
                </div>
                <div className="p-4 border-b">
                    <div className="text-xs text-gray-400 uppercase font-bold">My Profile</div>
                    <div className="font-bold truncate">{portfolioData?.fullName}</div>
                    <div className="text-xs text-green-500 flex justify-between items-center">ID: {portfolioData?.id}<button onClick={handleLogout} className="text-red-500 hover:text-red-700" title="Logout"><FaSignOutAlt /></button></div>
                </div>
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {/* ĐÃ BỎ 'cv-import' KHỎI LIST */}
                    {['chat', 'profile', 'change-password', 'projects', 'skills', 'experience', 'education', 'publications', 'events'].map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab as ActiveTab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg capitalize transition ${activeTab === tab ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}>
                            {tab === 'chat' ? <FaCommentDots className="text-sm" /> : tab === 'change-password' ? <FaLock className="text-sm" /> : <FaList className="text-sm" />}
                            <span className="hidden md:block">{tab.replace('-', ' ')}</span>
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* CHAT TAB */}
                {activeTab === 'chat' && (
                    <div className="flex h-full bg-white overflow-hidden">
                        <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
                            <div className="p-4 border-b border-gray-100"><div className="relative"><input placeholder="Search..." className="w-full bg-gray-100 rounded-full px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" /><FaSearch className="absolute left-3 top-3 text-gray-400" /></div></div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {Object.values(chatSessions).length === 0 && <div className="p-4 text-center text-gray-400 text-sm">No active conversations</div>}
                                {Object.values(chatSessions).map(s => (
                                    <div key={s.visitorId} onClick={() => setSelectedVisitorId(s.visitorId)} className={`px-4 py-3 cursor-pointer flex items-center gap-3 hover:bg-gray-50 ${selectedVisitorId === s.visitorId ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">{s.visitorName.charAt(0)}</div>
                                        <div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{s.visitorName}</div><div className="text-xs text-gray-500 truncate">{s.messages.slice(-1)[0]?.content || '...'}</div></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col bg-white">
                            {selectedVisitorId ? (
                                <>
                                    <div className="h-16 bg-white border-b px-6 flex items-center justify-between font-bold shadow-sm z-10">{chatSessions[selectedVisitorId].visitorName}<button onClick={() => setActiveCallRoom(`call-${portfolioData?.id}-${selectedVisitorId}-${Date.now()}`)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><FaVideo size={20} /></button></div>
                                    <div className="flex-1 overflow-y-auto p-6 space-y-3">{chatSessions[selectedVisitorId].messages.map((m, i) => (<div key={i} className={`flex ${m.senderId === portfolioData?.id?.toString() ? 'justify-end' : 'justify-start'}`}><div className={`px-4 py-2 rounded-2xl text-sm max-w-[70%] ${m.senderId === portfolioData?.id?.toString() ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>{m.content}</div></div>))}<div ref={messagesEndRef} /></div>
                                    <form onSubmit={sendReply} className="p-4 bg-white border-t flex gap-2 items-center"><input className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 focus:ring-1 focus:ring-blue-500 outline-none" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type a message..." /><button className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"><FaPaperPlane /></button></form>
                                </>
                            ) : <div className="flex-1 flex flex-col items-center justify-center text-gray-400"><FaCommentDots size={48} className="mb-2" /><p>Select a conversation</p></div>}
                        </div>
                    </div>
                )}

                {/* CHANGE PASSWORD TAB */}
                {activeTab === 'change-password' && (
                    <div className="p-8 flex justify-center items-start h-full bg-gray-50">
                        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
                            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2"><FaKey className="text-blue-500" /> Change Password</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                    <input type="password" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={passData.currentPassword} onChange={e => setPassData({ ...passData, currentPassword: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                    <input type="password" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={passData.newPassword} onChange={e => setPassData({ ...passData, newPassword: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                    <input type="password" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={passData.confirmPassword} onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })} />
                                </div>
                                <button onClick={handleChangePassword} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition">Update Password</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* PROFILE TAB (Updated with Title Placeholders) */}
                {activeTab === 'profile' && editingProfile && (
                    <div className="p-8 overflow-y-auto h-full">
                        <h2 className="text-2xl font-bold mb-6">My Profile</h2>
                        <div className="bg-white p-6 rounded-xl shadow-sm space-y-6 max-w-3xl">
                            <div className="flex items-center gap-6"><div className="relative group w-24 h-24"><img src={editingProfile.avatarUrl || "https://placehold.co/150"} className="w-24 h-24 rounded-full border object-cover" /><label className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition text-white text-xs font-bold text-center">Change <input type="file" hidden onChange={e => handleFileUpload(e, 'avatar')} /></label></div><div><h3 className="font-bold">{editingProfile.fullName}</h3><p className="text-sm text-gray-500">Avatar Image</p></div></div>
                            <div className="grid grid-cols-2 gap-4">
                                <input className="border p-2 rounded" placeholder="Full Name" value={editingProfile.fullName} onChange={e => setEditingProfile({ ...editingProfile, fullName: e.target.value })} />

                                {/* --- UPDATED PLACEHOLDERS WITH INSTRUCTIONS --- */}
                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Website Title (VI)</label>
                                    <input
                                        className="w-full border p-2 rounded"
                                        placeholder="Ví dụ: XIN CHÀO | MỌI NGƯỜI (Dùng | để xuống dòng)"
                                        value={editingProfile.titleVi || ''}
                                        onChange={e => setEditingProfile({ ...editingProfile, titleVi: e.target.value })}
                                    />
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Website Title (EN)</label>
                                    <input
                                        className="w-full border p-2 rounded"
                                        placeholder="Ex: ENGINEERING | PERFECTION (Use | for subtitle)"
                                        value={editingProfile.titleEn || ''}
                                        onChange={e => setEditingProfile({ ...editingProfile, titleEn: e.target.value })}
                                    />
                                </div>
                                {/* --------------------------------------------- */}

                                <input className="border p-2 rounded" placeholder="Job Title" value={editingProfile.jobTitle} onChange={e => setEditingProfile({ ...editingProfile, jobTitle: e.target.value })} />
                                <input className="border p-2 rounded" placeholder="Email" value={editingProfile.contact?.email} onChange={e => setEditingProfile({ ...editingProfile, contact: { ...editingProfile.contact!, email: e.target.value } })} />
                                <input className="border p-2 rounded" placeholder="Phone" value={editingProfile.contact?.phone} onChange={e => setEditingProfile({ ...editingProfile, contact: { ...editingProfile.contact!, phone: e.target.value } })} />
                            </div>

                            {/* --- SHARE LINK SECTION --- */}
                            <div className="mt-4 pt-4 border-t">
                                <label className="block text-sm font-bold text-gray-500 mb-2">My Portfolio Link</label>
                                <div className="flex gap-2">
                                    <input
                                        className="w-full border p-2 rounded bg-gray-50 text-blue-600 font-medium"
                                        readOnly
                                        value={generatedLink}
                                    />
                                    <button onClick={copyLink} className="bg-blue-100 text-blue-600 px-4 rounded hover:bg-blue-200 transition" title="Copy"><FaCopy /></button>
                                    <a href={generatedLink} target="_blank" rel="noreferrer" className="bg-blue-100 text-blue-600 px-4 py-2 rounded hover:bg-blue-200 transition flex items-center" title="Open"><FaExternalLinkAlt /></a>
                                </div>
                            </div>

                            <textarea className="w-full border p-2 rounded" rows={4} placeholder="Bio" value={editingProfile.bio} onChange={e => setEditingProfile({ ...editingProfile, bio: e.target.value })} />
                            <button onClick={saveProfile} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700"><FaSave className="inline mr-2" /> Save Changes</button>
                        </div>
                    </div>
                )}

                {/* PROJECTS TAB */}
                {activeTab === 'projects' && (
                    <div className="p-8 overflow-y-auto h-full">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Projects</h2><button onClick={openAddProject} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><FaPlus className="inline mr-2" /> Add Project</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{portfolioData?.projects.map((p, idx) => (<div key={p.id || idx} className="bg-white rounded-xl shadow-sm border overflow-hidden group relative hover:border-blue-300 transition-all"><img src={p.imageUrl || "https://placehold.co/400"} className="w-full h-40 object-cover" /><div className="absolute top-2 right-2 flex gap-2"><button onClick={(e) => { e.stopPropagation(); openEditProject(p); }} className="bg-white p-2 rounded-full text-blue-600 shadow hover:bg-blue-50"><FaEdit /></button><button onClick={(e) => { e.stopPropagation(); p.id && deleteProject(p.id); }} className="bg-white p-2 rounded-full text-red-600 shadow hover:bg-red-50"><FaTrash /></button></div><div className="p-4"><h3 className="font-bold truncate">{p.title}</h3><p className="text-xs text-gray-500">{p.role}</p></div></div>))}</div>
                    </div>
                )}

                {/* SKILLS TAB */}
                {activeTab === 'skills' && (
                    <div className="p-8 overflow-y-auto h-full">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Skills</h2><button onClick={openAddSkill} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><FaPlus className="inline mr-2" /> Add Skill</button></div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{portfolioData?.skills.map((s, idx) => (<div key={s.id || idx} className="bg-white p-4 rounded border flex justify-between items-center group relative hover:shadow-md transition"><div><div className="font-bold">{s.name}</div><div className="text-xs text-gray-500">{s.category}</div></div><div className="flex gap-2 items-center"><span className="text-blue-600 font-bold mr-2">{s.proficiency}%</span><button onClick={(e) => { e.stopPropagation(); openEditSkill(s) }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><FaEdit /></button><button onClick={(e) => { e.stopPropagation(); s.id && deleteSkill(s.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><FaTrash /></button></div></div>))}</div>
                    </div>
                )}

                {/* EXPERIENCE TAB */}
                {activeTab === 'experience' && (
                    <div className="p-8 overflow-y-auto h-full">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Experience</h2><button onClick={openAddExp} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><FaPlus className="inline mr-2" /> Add Experience</button></div>
                        <div className="space-y-4">{portfolioData?.workHistory.map((w, idx) => (<div key={w.id || idx} className="bg-white p-4 rounded border shadow-sm relative group hover:border-blue-200 transition"><h4 className="font-bold text-lg">{w.company}</h4><div className="text-blue-600 font-medium">{w.role}</div><div className="text-xs text-gray-500">{w.startDate} - {w.isCurrent ? "Present" : w.endDate}</div><p className="text-sm mt-2 text-gray-600 whitespace-pre-wrap">{w.description}</p><div className="absolute top-4 right-4 flex gap-2"><button onClick={(e) => { e.stopPropagation(); openEditExp(w) }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full shadow"><FaEdit /></button><button onClick={(e) => { e.stopPropagation(); w.id && deleteExp(w.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full shadow"><FaTrash /></button></div></div>))}</div>
                    </div>
                )}

                {/* EDUCATION TAB */}
                {activeTab === 'education' && (
                    <div className="p-8 overflow-y-auto h-full">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Education</h2><button onClick={openAddEdu} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><FaPlus className="inline mr-2" /> Add Education</button></div>
                        <div className="space-y-4">{portfolioData?.education.map((e, idx) => (<div key={e.id || idx} className="bg-white p-4 rounded border flex justify-between items-center group relative hover:border-blue-200"><div><h4 className="font-bold">{e.school}</h4><p className="text-sm">{e.degree} <span className="text-gray-400">({e.year})</span></p><p className="text-xs text-gray-500 mt-1">{e.description}</p></div><div className="flex gap-2"><button onClick={(event) => { event.stopPropagation(); openEditEdu(e); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><FaEdit /></button><button onClick={(event) => { event.stopPropagation(); e.id && deleteEdu(e.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><FaTrash /></button></div></div>))}</div>
                    </div>
                )}

                {/* PUBLICATIONS TAB */}
                {activeTab === 'publications' && (
                    <div className="p-8 overflow-y-auto h-full">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Publications</h2><button onClick={openAddPub} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><FaPlus className="inline mr-2" /> Add Publication</button></div>
                        <div className="space-y-4">{portfolioData?.publications?.map((p: any, idx) => (<div key={p.id || idx} className="bg-white p-4 rounded border flex justify-between items-center group hover:border-blue-200"><div><h4 className="font-bold">{p.title}</h4><p className="text-sm text-gray-600">{p.publisher} • {p.releaseDate}</p><a href={p.url} target="_blank" className="text-blue-500 text-xs hover:underline">{p.url}</a></div><div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); openEditPub(p); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><FaEdit /></button><button onClick={(e) => { e.stopPropagation(); p.id && deletePub(p.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><FaTrash /></button></div></div>))}</div>
                    </div>
                )}

                {/* EVENTS TAB */}
                {activeTab === 'events' && (
                    <div className="p-8 overflow-y-auto h-full">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Events</h2><button onClick={openAddEvent} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><FaPlus className="inline mr-2" /> Add Event</button></div>
                        <div className="space-y-4">{portfolioData?.events?.map((e: any, idx) => (<div key={e.id || idx} className="bg-white p-4 rounded border flex justify-between items-center group hover:border-blue-200"><div className="flex items-center gap-3">{e.imageUrl && <img src={e.imageUrl} className="w-10 h-10 rounded object-cover" />}<div><h4 className="font-bold">{e.name} <span className="text-xs bg-gray-100 px-2 rounded font-normal">{e.role}</span></h4><p className="text-xs text-gray-500">{e.date}</p><p className="text-sm mt-1">{e.description}</p></div></div><div className="flex gap-2"><button onClick={(event) => { event.stopPropagation(); openEditEvent(e); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><FaEdit /></button><button onClick={(event) => { event.stopPropagation(); e.id && deleteEvent(e.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><FaTrash /></button></div></div>))}</div>
                    </div>
                )}

                {/* MODALS */}
                {showProjectModal && editingProject && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 space-y-6"><div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">{editingProject.id ? 'Edit Project' : 'New Project'}</h3><button onClick={() => setShowProjectModal(false)}><FaTimes /></button></div><div className="grid grid-cols-2 gap-4"><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Title</label><input className="w-full border p-2 rounded" value={editingProject.title || ''} onChange={e => setEditingProject({ ...editingProject, title: e.target.value })} /></div><div><label className="text-xs font-bold text-gray-400 uppercase">Role</label><input className="w-full border p-2 rounded" value={editingProject.role || ''} onChange={e => setEditingProject({ ...editingProject, role: e.target.value })} /></div><div><label className="text-xs font-bold text-gray-400 uppercase">Customer</label><input className="w-full border p-2 rounded" value={editingProject.customer || ''} onChange={e => setEditingProject({ ...editingProject, customer: e.target.value })} /></div><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Tech Stack</label><input className="w-full border p-2 rounded" value={editingProject.technologies?.join(', ') || ''} onChange={e => setEditingProject({ ...editingProject, technologies: e.target.value.split(',').map(s => s.trim()) })} /></div><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Image</label><label className="cursor-pointer relative w-full h-48 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 flex flex-col items-center justify-center bg-gray-50 overflow-hidden group transition-all"><input type="file" hidden onChange={(e) => handleFileUpload(e, 'project')} />{uploading ? (<div className="flex flex-col items-center text-blue-500"><FaSpinner className="animate-spin text-3xl mb-2" /><span className="text-sm font-bold">Uploading...</span></div>) : editingProject.imageUrl ? (<div className="relative w-full h-full"><img src={editingProject.imageUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><span className="text-white font-bold flex items-center gap-2"><FaCloudUploadAlt /> Change Image</span></div></div>) : (<div className="text-gray-400 text-center"><FaImage className="text-4xl mx-auto mb-2" /><span className="text-sm">Click to upload image</span></div>)}</label></div><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Repo URL</label><input className="w-full border p-2 rounded" value={editingProject.repoUrl || ''} onChange={e => setEditingProject({ ...editingProject, repoUrl: e.target.value })} /></div><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Description</label><textarea className="w-full border p-2 rounded" rows={4} value={editingProject.description || ''} onChange={e => setEditingProject({ ...editingProject, description: e.target.value })} /></div></div><div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowProjectModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={saveProject} className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 transition">Save</button></div></div></div>
                )}

                {showExpModal && editingExp && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6"><div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Experience</h3><button onClick={() => setShowExpModal(false)}><FaTimes /></button></div><div className="grid grid-cols-2 gap-4"><input className="border p-2 rounded" placeholder="Company" value={editingExp.company || ''} onChange={e => setEditingExp({ ...editingExp, company: e.target.value })} /><input className="border p-2 rounded" placeholder="Role" value={editingExp.role || ''} onChange={e => setEditingExp({ ...editingExp, role: e.target.value })} /><input type="date" className="border p-2 rounded" value={editingExp.startDate || ''} onChange={e => setEditingExp({ ...editingExp, startDate: e.target.value })} /><div className="flex gap-2 items-center"><input type="date" disabled={editingExp.isCurrent} className="border p-2 rounded flex-1" value={editingExp.endDate || ''} onChange={e => setEditingExp({ ...editingExp, endDate: e.target.value })} /><label><input type="checkbox" checked={editingExp.isCurrent || false} onChange={e => setEditingExp({ ...editingExp, isCurrent: e.target.checked })} /> Present</label></div></div><textarea className="w-full border p-2 rounded" rows={3} placeholder="Description" value={editingExp.description || ''} onChange={e => setEditingExp({ ...editingExp, description: e.target.value })} /><div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowExpModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={saveExp} className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold">Save</button></div></div></div>
                )}

                {showSkillModal && editingSkill && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-8 space-y-6"><div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Skill</h3><button onClick={() => setShowSkillModal(false)}><FaTimes /></button></div><div className="space-y-4"><div><label className="text-xs font-bold text-gray-500">Name</label><input className="w-full border p-2 rounded" value={editingSkill.name || ''} onChange={e => setEditingSkill({ ...editingSkill, name: e.target.value })} /></div><div><label className="text-xs font-bold text-gray-500">Type</label><select className="w-full border p-2 rounded" value={editingSkill.category} onChange={e => setEditingSkill({ ...editingSkill, category: e.target.value })}><option>Backend</option><option>Frontend</option><option>Database</option><option>DevOps</option><option>Scientific</option></select></div><div><label className="text-xs font-bold text-gray-500">Proficiency (%)</label><input type="number" className="w-full border p-2 rounded" value={editingSkill.proficiency || 0} onChange={e => setEditingSkill({ ...editingSkill, proficiency: parseInt(e.target.value) })} /></div></div><div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowSkillModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={saveSkill} className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold">Save</button></div></div></div>
                )}

                {showEduModal && editingEdu && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6"><div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Education</h3><button onClick={() => setShowEduModal(false)}><FaTimes /></button></div><div className="grid grid-cols-2 gap-4"><input className="border p-2 rounded" placeholder="School" value={editingEdu.schoolName || ''} onChange={e => setEditingEdu({ ...editingEdu, schoolName: e.target.value })} /><input className="border p-2 rounded" placeholder="Degree" value={editingEdu.degree || ''} onChange={e => setEditingEdu({ ...editingEdu, degree: e.target.value })} /><input type="date" className="border p-2 rounded" value={editingEdu.startDate || ''} onChange={e => setEditingEdu({ ...editingEdu, startDate: e.target.value })} /><input type="date" className="border p-2 rounded" value={editingEdu.endDate || ''} onChange={e => setEditingEdu({ ...editingEdu, endDate: e.target.value })} /></div><textarea className="w-full border p-2 rounded" placeholder="Description" value={editingEdu.description || ''} onChange={e => setEditingEdu({ ...editingEdu, description: e.target.value })} /><div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowEduModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={saveEdu} className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold">Save</button></div></div></div>
                )}

                {showPubModal && editingPub && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6"><div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Publication</h3><button onClick={() => setShowPubModal(false)}><FaTimes /></button></div><div className="grid grid-cols-2 gap-4"><input className="border p-2 rounded col-span-2" placeholder="Title" value={editingPub.title || ''} onChange={e => setEditingPub({ ...editingPub, title: e.target.value })} /><input className="border p-2 rounded" placeholder="Publisher" value={editingPub.publisher || ''} onChange={e => setEditingPub({ ...editingPub, publisher: e.target.value })} /><input type="date" className="border p-2 rounded" value={editingPub.releaseDate || ''} onChange={e => setEditingPub({ ...editingPub, releaseDate: e.target.value })} /><input className="border p-2 rounded col-span-2" placeholder="URL" value={editingPub.url || ''} onChange={e => setEditingPub({ ...editingPub, url: e.target.value })} /></div><div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowPubModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={savePub} className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold">Save</button></div></div></div>
                )}

                {showEventModal && editingEvent && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6"><div className="flex justify-between items-center border-b pb-4"><h3 className="font-bold text-2xl">Edit Event</h3><button onClick={() => setShowEventModal(false)}><FaTimes /></button></div><div className="grid grid-cols-2 gap-4"><input className="border p-2 rounded" placeholder="Event Name" value={editingEvent.name || ''} onChange={e => setEditingEvent({ ...editingEvent, name: e.target.value })} /><input className="border p-2 rounded" placeholder="Role" value={editingEvent.role || ''} onChange={e => setEditingEvent({ ...editingEvent, role: e.target.value })} /><input type="date" className="border p-2 rounded" value={editingEvent.date || ''} onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })} /><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Event Image</label><label className="cursor-pointer relative w-full h-32 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 flex flex-col items-center justify-center bg-gray-50 overflow-hidden group"><input type="file" hidden onChange={e => handleFileUpload(e, 'event')} />{uploading ? (<FaSpinner className="animate-spin text-orange-500 text-2xl" />) : editingEvent.imageUrl ? (<div className="relative w-full h-full group"><img src={editingEvent.imageUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><span className="text-white font-bold flex items-center gap-2"><FaCloudUploadAlt /> Change</span></div></div>) : (<div className="text-center"><FaImage className="text-2xl text-gray-400 mx-auto" /><span className="text-xs text-gray-400">Click to upload</span></div>)}</label></div></div><textarea className="w-full border p-2 rounded" placeholder="Description" value={editingEvent.description || ''} onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })} /><div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setShowEventModal(false)} className="px-6 py-2 text-gray-500 font-bold">Cancel</button><button onClick={saveEvent} className="px-8 py-2 bg-orange-500 text-white rounded-lg font-bold">Save</button></div></div></div>
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
                {activeCallRoom && <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"><VideoCallInterface roomId={activeCallRoom} userRole="User" remoteName="Caller" onEndCall={() => setActiveCallRoom('')} /></div>}

            </div>
        </div>
    );
};

export default User;