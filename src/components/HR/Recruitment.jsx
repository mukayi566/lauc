import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Search, Plus, Briefcase, Users, Calendar, TrendingUp, Target, Star, Bot, MapPin, ChevronRight, Activity } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const Recruitment = () => {
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [showAddJobModal, setShowAddJobModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [newJob, setNewJob] = useState({
        title: '',
        department: '',
        type: 'Full-time',
        location: 'Main Campus',
        description: '',
        status: 'Open',
        datePosted: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const unsubJobs = onSnapshot(
            query(collection(db, 'job_postings'), orderBy('createdAt', 'desc')),
            (snap) => setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        const unsubApps = onSnapshot(
            query(collection(db, 'job_applications'), orderBy('createdAt', 'desc')),
            (snap) => setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        return () => { unsubJobs(); unsubApps(); };
    }, []);

    const handleAddJob = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'job_postings'), {
                ...newJob,
                createdAt: serverTimestamp()
            });
            setShowAddJobModal(false);
            setNewJob({ title: '', department: '', type: 'Full-time', location: 'Main Campus', description: '', status: 'Open', datePosted: new Date().toISOString().split('T')[0] });
            toast.success('Job posting created');
        } catch (err) {
            toast.error('Error creating job posting');
        }
    };

    const totalJobs = jobs.length || 1;
    const totalApps = applications.length;
    const interviewsCount = applications.filter(a => a.status === 'Interview').length;
    const hiredCount = applications.filter(a => a.status === 'Hired').length;
    const hiringRate = Math.round((hiredCount / totalJobs) * 100);

    const appGrowthData = [
        { name: 'W1', apps: Math.floor(totalApps * 0.2) || 12 },
        { name: 'W2', apps: Math.floor(totalApps * 0.4) || 25 },
        { name: 'W3', apps: Math.floor(totalApps * 0.3) || 18 },
        { name: 'W4', apps: totalApps || 32 }
    ];

    const srcMap = {};
    applications.forEach(a => {
        let source = a.source || 'Direct';
        if (source.toLowerCase().includes('linked')) source = 'LinkedIn';
        if (source.toLowerCase().includes('indeed')) source = 'Indeed';
        srcMap[source] = (srcMap[source] || 0) + 1;
    });
    const sourceColors = ['#0077b5', '#2563eb', '#10b981', '#f59e0b', '#ec4899'];
    const dySource = Object.entries(srcMap).map(([name, value], i) => ({
        name,
        value: Math.round((value / totalApps) * 100),
        color: sourceColors[i % 5]
    }));
    const sourceData = dySource.length > 0 ? dySource : [
        { name: 'LinkedIn', value: 60, color: '#0077b5' },
        { name: 'Indeed', value: 25, color: '#2563eb' },
        { name: 'Referral', value: 15, color: '#10b981' }
    ];

    const dyRecent = applications.slice(0, 3).map(a => ({
        name: a.name || 'Unknown User',
        role: a.jobTitle || 'Applicant',
        match: a.matchScore || Math.floor(Math.random() * 30 + 60)
    }));
    const recentApplicants = dyRecent.length > 0 ? dyRecent : [
        { name: 'John M', role: 'Software Eng', match: 92 },
        { name: 'Sarah K', role: 'Finance', match: 88 },
        { name: 'David B', role: 'Marketing Lead', match: 75 }
    ];

    const appliedCount = totalApps - applications.filter(a => ['Screening', 'Interview', 'Offer', 'Hired'].includes(a.status)).length;
    const screeningCount = applications.filter(a => a.status === 'Screening').length;
    const offerCount = applications.filter(a => a.status === 'Offer').length;

    const pipelineStages = [
        { name: 'Applied', val: totalApps > 0 ? appliedCount : 120, color: '#94a3b8' },
        { name: 'Screening', val: totalApps > 0 ? screeningCount : 45, color: '#8b5cf6' },
        { name: 'Interview', val: totalApps > 0 ? interviewsCount : 18, color: '#3b82f6' },
        { name: 'Offer', val: totalApps > 0 ? offerCount : 6, color: '#f59e0b' },
        { name: 'Hired', val: totalApps > 0 ? hiredCount : 3, color: '#10b981' }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full h-full text-slate-800"
            style={{ padding: '80px 24px 24px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100vh' }}
        >
            {/* 1. Header & Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px 24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Recruitment</h1>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                        <input
                            type="text"
                            placeholder="Search candidates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ padding: '8px 16px 8px 38px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontSize: '13px', width: '220px', outline: 'none' }}
                        />
                    </div>
                    <button onClick={() => setShowAddJobModal(true)} style={{ padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}>
                        <Plus size={16} /> New Vacancy
                    </button>
                </div>
            </div>

            {/* 2. Stat Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                {[
                    { label: 'Active Jobs', val: jobs.length || 0, icon: <Briefcase size={22} color="#4f46e5" />, bg: '#e0e7ff' },
                    { label: 'Applicants', val: applications.length || 0, icon: <Users size={22} color="#10b981" />, bg: '#d1fae5' },
                    { label: 'Interviews', val: interviewsCount, icon: <Calendar size={22} color="#f59e0b" />, bg: '#fef3c7' },
                    { label: 'Hiring Rate', val: hiringRate + '%', icon: <Target size={22} color="#ec4899" />, bg: '#fce7f3' }
                ].map((stat, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {stat.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>{stat.val}</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 3. Hiring Pipeline Stepper */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 30px 0', color: '#1e293b' }}>Hiring Pipeline</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                    {/* Connecting Line */}
                    <div style={{ position: 'absolute', top: '24px', left: '10%', right: '10%', height: '3px', background: '#e2e8f0', zIndex: 0 }}></div>

                    {pipelineStages.map((stage, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1 }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: stage.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                {stage.val}
                            </div>
                            <div style={{ marginTop: '14px', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                                {stage.name}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. Analytics & Recent Applicants */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: '24px' }}>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: '#1e293b' }}>Applications</h3>
                        <div style={{ fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px', fontWeight: 600 }}>
                            <TrendingUp size={14} /> This month ↑ 18%
                        </div>
                        <div style={{ flex: 1, minHeight: '180px', minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                <AreaChart data={appGrowthData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" dataKey="apps" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: '#1e293b' }}>Source</h3>
                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Applicant origin distribution</div>
                        <div style={{ flex: 1, minHeight: '180px', position: 'relative', minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                <PieChart>
                                    <Pie data={sourceData} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                                        {sourceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: '#0077b5', fontWeight: 800 }}>LinkedIn</div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>60%</div>
                            </div>
                        </div>
                    </div>

                </div>

                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 20px 0', color: '#1e293b' }}>Recent Applicants</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {recentApplicants.map((app, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>
                                        {app.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{app.name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{app.role}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                                    <Star size={14} color="#f59e0b" fill="#f59e0b" /> {app.match}%
                                </div>
                            </div>
                        ))}
                    </div>
                    <button style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', marginTop: '20px', fontSize: '13px', fontWeight: 600, color: '#4f46e5', cursor: 'pointer', transition: 'all 0.2s' }}>
                        View Directory
                    </button>
                </div>
            </div>

            {/* 5. Open Positions & AI Insights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1e293b' }}>Open Positions</h3>
                        <span style={{ fontSize: '13px', color: '#4f46e5', fontWeight: 600, cursor: 'pointer' }}>View All ({jobs.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {jobs.slice(0, 3).length > 0 ? jobs.slice(0, 3).map(job => (
                            <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>{job.title}</h4>
                                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase size={12} /> {job.department}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {job.location}</span>
                                    </div>
                                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${Math.min(100, (applications.filter(a => a.jobId === job.id).length / 10) * 100)}%`, background: '#4f46e5', borderRadius: '4px' }}></div>
                                        </div>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>{applications.filter(a => a.jobId === job.id).length} applicants</span>
                                    </div>
                                </div>
                                <button style={{ marginLeft: '24px', padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#4f46e5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    View Pipeline <ChevronRight size={14} />
                                </button>
                            </div>
                        )) : (
                            <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '14px', border: '1px dashed #cbd5e1' }}>
                                No active postings found. Add a new vacancy to get started.
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Insights Card */}
                <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', borderRadius: '16px', padding: '24px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 25px rgba(49, 46, 129, 0.4)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}><Bot size={120} /></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 }}>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '12px' }}><Bot size={24} color="#a5b4fc" /></div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, letterSpacing: '0.5px' }}>AI Recruitment Insights</h3>
                    </div>
                    <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', lineHeight: '1.4', borderLeft: '3px solid #34d399', backdropFilter: 'blur(4px)' }}>
                            "Most applicants are coming from <strong>LinkedIn</strong>. Consider boosting ads there."
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', lineHeight: '1.4', borderLeft: '4px solid #60a5fa', backdropFilter: 'blur(4px)' }}>
                            "Average hiring time across IT department is currently <strong>14 days</strong>."
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', lineHeight: '1.4', borderLeft: '4px solid #fbbf24', backdropFilter: 'blur(4px)' }}>
                            "Engineering roles need attention. Only <strong>2 valid applicants</strong> this week."
                        </div>
                    </div>
                </div>
            </div>

            {showAddJobModal && (
                <div className="sd-modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="sd-modal">
                        <div className="sd-modal-head">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Plus size={18} color="#0d9488" /> Post New Job</h3>
                            <button className="sd-close-btn" onClick={() => setShowAddJobModal(false)}>&times;</button>
                        </div>
                        <div className="sd-modal-body">
                            <form onSubmit={handleAddJob} className="sd-modal-form">
                                <label>Job Title</label>
                                <input required value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} placeholder="e.g. Senior Software Engineer" />
                                <label>Department</label>
                                <input required value={newJob.department} onChange={e => setNewJob({ ...newJob, department: e.target.value })} placeholder="e.g. IT Department" />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label>Job Type</label>
                                        <select value={newJob.type} onChange={e => setNewJob({ ...newJob, type: e.target.value })}>
                                            <option>Full-time</option>
                                            <option>Part-time</option>
                                            <option>Contract</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label>Location</label>
                                        <input value={newJob.location} onChange={e => setNewJob({ ...newJob, location: e.target.value })} />
                                    </div>
                                </div>
                                <label>Description</label>
                                <textarea rows={4} value={newJob.description} onChange={e => setNewJob({ ...newJob, description: e.target.value })} placeholder="Job description and requirements..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit', fontSize: '14px', marginTop: '6px' }} />
                                <button type="submit" style={{ width: '100%', padding: '12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, marginTop: '20px', cursor: 'pointer' }}>Create Posting</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default Recruitment;
