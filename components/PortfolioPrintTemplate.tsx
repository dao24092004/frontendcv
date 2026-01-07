import React from 'react';
import { PortfolioData } from '../types';
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaGithub, FaLinkedin, FaGlobe, FaUser, FaBriefcase, FaGraduationCap, FaProjectDiagram, FaAward, FaBook } from 'react-icons/fa';

interface Props {
    data: PortfolioData;
}

const PortfolioPrintTemplate = React.forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
    return (
        <div
            ref={ref}
            className="p-0 bg-white text-[#2D2E2E]"
            style={{
                width: '210mm',
                minHeight: '297mm',
                margin: '0 auto',
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                WebkitPrintColorAdjust: 'exact'
            }}
        >
            {/* --- HEADER BLOCK --- */}
            <div className="bg-[#1A1A1A] p-12 text-white flex items-center gap-10">
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-orange-400 shadow-2xl flex-shrink-0 bg-gray-200">
                    <img
                        src={data.avatarUrl}
                        alt={data.fullName}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/200?text=Profile")}
                    />
                </div>
                <div>
                    <h1 className="text-5xl font-black tracking-tighter uppercase mb-2 leading-none">
                        {data.fullName}
                    </h1>
                    <p className="text-2xl font-bold text-orange-400 uppercase tracking-[0.2em]">
                        {data.jobTitle}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-12 min-h-[230mm]">
                {/* --- SIDEBAR (LEFT) --- */}
                <div className="col-span-4 bg-[#F8F9FA] p-8 border-r border-gray-100">
                    {/* CONTACT SECTION */}
                    <div className="mb-10">
                        <h2 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] border-b-2 border-orange-400 pb-2 mb-5 flex items-center gap-2">
                            CONTACT
                        </h2>
                        <div className="space-y-4 text-[12px] text-gray-700">
                            <p className="flex items-start gap-3 break-all">
                                <FaEnvelope className="mt-1 text-orange-500 shrink-0" /> {data.contact.email}
                            </p>
                            <p className="flex items-center gap-3">
                                <FaPhone className="text-orange-500 shrink-0" /> {data.contact.phone}
                            </p>
                            <p className="flex items-start gap-3">
                                <FaMapMarkerAlt className="mt-1 text-orange-500 shrink-0" /> {data.contact.location}
                            </p>
                        </div>
                    </div>

                    {/* SKILLS SECTION */}
                    <div className="mb-10">
                        <h2 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] border-b-2 border-orange-400 pb-2 mb-5">
                            MY SKILLS
                        </h2>
                        <div className="space-y-5">
                            {data.skills.map((skill, i) => (
                                <div key={i}>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[11px] font-bold text-[#2D2E2E] uppercase tracking-wider">{skill.name}</span>
                                        <span className="text-[10px] font-black text-gray-400">{skill.proficiency}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
                                            style={{ width: `${skill.proficiency}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* EDUCATION SECTION */}
                    {data.education && (
                        <div>
                            <h2 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] border-b-2 border-orange-400 pb-2 mb-5 flex items-center gap-2">
                                EDUCATION
                            </h2>
                            <div className="space-y-6">
                                {data.education.map((edu, i) => (
                                    <div key={i} className="text-[11px]">
                                        <p className="font-black text-[#1A1A1A] uppercase mb-1">{edu.degree}</p>
                                        <p className="text-orange-600 font-bold mb-1">{edu.school}</p>
                                        <p className="text-gray-400 font-bold">{edu.year}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- MAIN CONTENT (RIGHT) --- */}
                <div className="col-span-8 p-10">
                    {/* PROFILE SUMMARY */}
                    <div className="mb-10" style={{ pageBreakInside: 'avoid' }}>
                        <h2 className="text-[16px] font-black uppercase tracking-widest text-orange-500 mb-4 flex items-center gap-3">
                            <FaUser /> ABOUT ME
                        </h2>
                        <p className="text-[13px] leading-relaxed text-gray-600 italic font-medium">
                            "{data.bio}"
                        </p>
                    </div>

                    {/* EXPERIENCE SECTION */}
                    <div className="mb-10">
                        <h2 className="text-[16px] font-black uppercase tracking-widest text-orange-500 mb-6 flex items-center gap-3">
                            <FaBriefcase /> WORK EXPERIENCE
                        </h2>
                        <div className="space-y-8">
                            {data.workHistory.map((work, i) => (
                                <div key={i} className="relative group" style={{ pageBreakInside: 'avoid' }}>
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-[15px] font-black text-[#1A1A1A] uppercase leading-tight">{work.role}</h3>
                                        <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                                            {work.startDate} — {work.endDate}
                                        </span>
                                    </div>
                                    <p className="text-[13px] font-black text-orange-500 mb-3">{work.company}</p>
                                    <p className="text-[12px] text-gray-600 text-justify leading-relaxed">
                                        {work.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PROJECTS SECTION */}
                    <div>
                        <h2 className="text-[16px] font-black uppercase tracking-widest text-orange-500 mb-6 flex items-center gap-3">
                            <FaProjectDiagram /> KEY PROJECTS
                        </h2>
                        <div className="grid grid-cols-1 gap-5">
                            {data.projects.map((p, i) => (
                                <div key={i} className="p-5 bg-gray-50 rounded-2xl border-l-4 border-orange-400" style={{ pageBreakInside: 'avoid' }}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-[13px] font-black text-[#1A1A1A] uppercase tracking-tight">{p.title}</h3>
                                        <span className="text-[10px] font-bold text-orange-500 px-2 py-0.5 border border-orange-200 rounded uppercase">{p.role}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-600 leading-relaxed">
                                        {p.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className="p-8 text-center border-t border-gray-100 bg-[#FBFBFB]">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">
                    Portfolio Design © {new Date().getFullYear()} • {data.fullName}
                </p>
            </div>
        </div>
    );
});

export default PortfolioPrintTemplate;