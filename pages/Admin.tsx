import React, { useState, useEffect } from 'react';
import { PortfolioData, Project, Skill, WorkExperience } from '../types';
import { adminService, portfolioService } from '../services/api';
import {
  FaEdit, FaTrash, FaPlus, FaSave, FaImage, FaTimes,
  FaUser, FaCode, FaBriefcase, FaGraduationCap, FaVideo, FaMinusCircle
} from 'react-icons/fa';
import VideoCallInterface from '../components/VideoCallInterface';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

type ActiveTab = 'profile' | 'skills' | 'experience' | 'education' | 'projects';

interface IncomingCall {
  roomId: string;
  visitorName: string;
}

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('projects');
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'project' | 'skill' | 'experience'>('project');

  // Editing states
  const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);
  const [editingSkill, setEditingSkill] = useState<Partial<Skill> | null>(null);
  const [editingExperience, setEditingExperience] = useState<Partial<WorkExperience> | null>(null);
  const [editingProfile, setEditingProfile] = useState<Partial<PortfolioData> | null>(null);

  const [uploadingImg, setUploadingImg] = useState(false);

  // State cho video call
  const [incomingCalls, setIncomingCalls] = useState<IncomingCall[]>([]);
  const [activeCallRoom, setActiveCallRoom] = useState<string>('');

  // WebSocket connection
  useEffect(() => {
    const socket = new SockJS('http://localhost:8080/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/call-requests', (message) => {
          const req = JSON.parse(message.body);
          setIncomingCalls(prev => [...prev.filter(c => c.roomId !== req.roomId), req]);
        });
      }
    });
    client.activate();
    return () => { client.deactivate(); };
  }, []);

  // Fetch Data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const result = await portfolioService.getPortfolioData();
      setData(result);
      setEditingProfile(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Handle Image Upload
  // targetType: 'project-main' (ảnh chính), 'project-gallery' (thêm vào gallery), 'avatar'
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetType: 'project-main' | 'project-gallery' | 'avatar') => {
    if (e.target.files && e.target.files[0]) {
      setUploadingImg(true);
      try {
        const url = await adminService.uploadImage(e.target.files[0]);

        if (targetType === 'project-main' && editingProject) {
          setEditingProject({ ...editingProject, imageUrl: url });
        } else if (targetType === 'project-gallery' && editingProject) {
          const currentGallery = editingProject.gallery || [];
          setEditingProject({ ...editingProject, gallery: [...currentGallery, url] });
        } else if (targetType === 'avatar' && editingProfile) {
          setEditingProfile({ ...editingProfile, avatarUrl: url });
        }
      } catch (err) {
        alert("Upload failed. Backend might be offline.");
      } finally {
        setUploadingImg(false);
      }
    }
  };

  // --- SAVE FUNCTIONS ---

  const saveProfile = async () => {
    if (!editingProfile) return;
    try {
      await adminService.updateProfile(editingProfile);
      alert("Updated Profile successfully!");
      fetchData();
    } catch (err) { alert("Failed to update profile."); }
  };

  const saveProject = async () => {
    if (!editingProject) return;
    try {
      const projectToSave = {
        ...editingProject,
        technologies: editingProject.technologies || [],
        gallery: editingProject.gallery || []
      } as Project;

      if (editingProject.id) {
        await adminService.updateProject(projectToSave);
      } else {
        await adminService.createProject(projectToSave);
      }
      setShowModal(false);
      fetchData();
      alert("Project saved!");
    } catch (err) { alert("Failed to save project."); }
  };

  const deleteProject = async (id: number) => {
    if (window.confirm("Delete this project?")) {
      await adminService.deleteProject(id);
      fetchData();
    }
  };

  // Helper để xóa ảnh khỏi gallery khi đang edit
  const removeGalleryImage = (indexToRemove: number) => {
    if (editingProject && editingProject.gallery) {
      const newGallery = editingProject.gallery.filter((_, idx) => idx !== indexToRemove);
      setEditingProject({ ...editingProject, gallery: newGallery });
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading Admin Dashboard...</div>;

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-orange-500">My Portfolio</h1>
          <p className="text-xs text-gray-400 mt-1">Admin Dashboard</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'profile', icon: FaUser, label: 'Profile' },
            { id: 'projects', icon: FaCode, label: 'Projects' },
            { id: 'skills', icon: FaCode, label: 'Skills' },
            { id: 'experience', icon: FaBriefcase, label: 'Experience' },
            { id: 'education', icon: FaGraduationCap, label: 'Education' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === item.id
                ? 'bg-orange-50 text-orange-600'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <item.icon /> {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8 relative">

        {/* Call Notifications */}
        {incomingCalls.length > 0 && (
          <div className="absolute top-8 right-8 z-50 w-80 space-y-2">
            {incomingCalls.map(call => (
              <div key={call.roomId} className="bg-white p-4 rounded-xl shadow-xl border border-orange-100 flex justify-between items-center animate-bounce-in">
                <div>
                  <p className="font-bold text-gray-800">{call.visitorName} calling...</p>
                </div>
                <button onClick={() => { setActiveCallRoom(call.roomId); setIncomingCalls(prev => prev.filter(c => c.roomId !== call.roomId)) }}
                  className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 shadow-lg">
                  <FaVideo />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && editingProfile && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>

            {/* Avatar Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-6">
              <img src={editingProfile.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-orange-100" />
              <div>
                <label className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg cursor-pointer text-sm font-medium shadow-sm transition-all inline-flex items-center gap-2">
                  <FaImage /> Change Avatar
                  <input type="file" hidden onChange={(e) => handleFileUpload(e, 'avatar')} />
                </label>
                {uploadingImg && <span className="ml-3 text-xs text-orange-500">Uploading...</span>}
              </div>
            </div>

            {/* Basic Info Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Full Name</label>
                <input className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-200 outline-none"
                  value={editingProfile.fullName || ''} onChange={e => setEditingProfile({ ...editingProfile, fullName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Job Title</label>
                <input className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-200 outline-none"
                  value={editingProfile.jobTitle || ''} onChange={e => setEditingProfile({ ...editingProfile, jobTitle: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">Bio</label>
                <textarea rows={3} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-200 outline-none"
                  value={editingProfile.bio || ''} onChange={e => setEditingProfile({ ...editingProfile, bio: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={saveProfile} className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 shadow-md flex items-center gap-2">
                <FaSave /> Save Changes
              </button>
            </div>
          </div>
        )}

        {/* --- PROJECTS TAB --- */}
        {activeTab === 'projects' && (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Projects</h2>
              <button onClick={() => { setEditingProject({ technologies: [], gallery: [] }); setShowModal(true); setModalType('project'); }}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center gap-2 shadow-sm">
                <FaPlus /> New Project
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.projects.map(project => (
                <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="h-48 overflow-hidden relative">
                    <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button onClick={() => { setEditingProject(project); setShowModal(true); setModalType('project'); }}
                        className="p-2 bg-white/90 text-blue-600 rounded-full hover:bg-white shadow-sm"><FaEdit /></button>
                      <button onClick={() => project.id && deleteProject(project.id)}
                        className="p-2 bg-white/90 text-red-500 rounded-full hover:bg-white shadow-sm"><FaTrash /></button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1">{project.title}</h3>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {project.technologies.slice(0, 3).map((t, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Placeholder for other tabs */}
        {(activeTab === 'skills' || activeTab === 'experience' || activeTab === 'education') && (
          <div className="flex items-center justify-center h-64 text-gray-400">
            Functionality coming soon for {activeTab}...
          </div>
        )}

        {/* --- VIDEO CALL OVERLAY --- */}
        {activeCallRoom && (
          <VideoCallInterface
            roomId={activeCallRoom}
            userRole="Admin"
            remoteName="Visitor"
            onEndCall={() => setActiveCallRoom('')}
          />
        )}

        {/* --- PROJECT MODAL --- */}
        {showModal && modalType === 'project' && editingProject && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="text-xl font-bold text-gray-800">{editingProject.id ? 'Edit Project' : 'New Project'}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500"><FaTimes size={20} /></button>
              </div>

              <div className="p-8 space-y-6">
                {/* 1. Title */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Project Name</label>
                  <input className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={editingProject.title || ''}
                    onChange={e => setEditingProject({ ...editingProject, title: e.target.value })}
                    placeholder="e.g. E-Commerce Platform"
                  />
                </div>

                {/* 2. Main Image */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Main Thumbnail</label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border flex-shrink-0">
                      {editingProject.imageUrl ?
                        <img src={editingProject.imageUrl} className="w-full h-full object-cover" /> :
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Img</div>
                      }
                    </div>
                    <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      {uploadingImg ? 'Uploading...' : 'Choose Image'}
                      <input type="file" hidden onChange={(e) => handleFileUpload(e, 'project-main')} />
                    </label>
                  </div>
                </div>

                {/* 3. Gallery (Multiple Images) */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Gallery Images</label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {editingProject.gallery?.map((imgUrl, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border group">
                        <img src={imgUrl} className="w-full h-full object-cover" />
                        <button onClick={() => removeGalleryImage(idx)}
                          className="absolute top-0 right-0 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <FaMinusCircle size={12} />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-orange-400 hover:text-orange-500 transition-colors">
                      <FaPlus />
                      <input type="file" hidden onChange={(e) => handleFileUpload(e, 'project-gallery')} />
                    </label>
                  </div>
                </div>

                {/* 4. Description */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                  <textarea rows={4} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={editingProject.description || ''}
                    onChange={e => setEditingProject({ ...editingProject, description: e.target.value })}
                  />
                </div>

                {/* 5. Technologies & Repo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Technologies</label>
                    <input className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                      value={editingProject.technologies?.join(', ') || ''}
                      onChange={e => setEditingProject({
                        ...editingProject,
                        technologies: e.target.value.split(',').map(s => s.trim())
                      })}
                      placeholder="React, Spring Boot, MySQL"
                    />
                    <p className="text-xs text-gray-400 mt-1">Separate by comma</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Source Code URL</label>
                    <input className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                      value={editingProject.repoUrl || ''}
                      onChange={e => setEditingProject({ ...editingProject, repoUrl: e.target.value })}
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={() => setShowModal(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium">Cancel</button>
                <button onClick={saveProject} className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-bold shadow-md">
                  Save Project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;