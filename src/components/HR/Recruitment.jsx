import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    query,
    orderBy
} from 'firebase/firestore';
import toast from 'react-hot-toast';

const Recruitment = () => {
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [showAddJobModal, setShowAddJobModal] = useState(false);
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

    return (
        <div className="sd-tab-fade">
            <div className="sd-page-header">
                <div>
                    <h2 className="sd-page-title">Recruitment & Applicant Tracking</h2>
                    <p className="sd-page-sub">Manage job postings, track applications, and handle the hiring pipeline.</p>
                </div>
                <button className="sd-btn sd-btn-primary" onClick={() => setShowAddJobModal(true)}>
                    <i className="fas fa-plus"></i> Post New Job
                </button>
            </div>

            <div className="sd-stats-row">
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
                    <div className="sd-stat-icon" style={{ color: '#7c3aed' }}><i className="fas fa-briefcase"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>{jobs.length}</div>
                    </div>
                    <div className="sd-stat-lbl">Active Job Postings</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="sd-stat-icon" style={{ color: '#10b981' }}><i className="fas fa-file-alt"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>{applications.length}</div>
                    </div>
                    <div className="sd-stat-lbl">Total Applications</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
                    <div className="sd-stat-icon" style={{ color: '#2563eb' }}><i className="fas fa-user-clock"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>{applications.filter(a => a.status === 'Interview').length}</div>
                    </div>
                    <div className="sd-stat-lbl">Interviews Scheduled</div>
                </div>
            </div>

            <div className="sd-card" style={{ marginTop: 24 }}>
                <div className="sd-card-header">
                    <span><i className="fas fa-list"></i> Active Postings</span>
                </div>
                <div className="sd-card-body">
                    <div className="table-responsive">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Job Title</th>
                                    <th>Department</th>
                                    <th>Type</th>
                                    <th>Applications</th>
                                    <th>Status</th>
                                    <th>Date Posted</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.length === 0 ? (
                                    <tr><td colSpan={7} className="sd-empty">No job postings found.</td></tr>
                                ) : jobs.map(job => (
                                    <tr key={job.id}>
                                        <td><strong>{job.title}</strong></td>
                                        <td>{job.department}</td>
                                        <td>{job.type}</td>
                                        <td>{applications.filter(a => a.jobId === job.id).length}</td>
                                        <td>
                                            <span className={`sd-badge ${job.status === 'Open' ? 'badge-green' : 'badge-red'}`}>
                                                {job.status}
                                            </span>
                                        </td>
                                        <td>{job.datePosted}</td>
                                        <td>
                                            <button className="sd-btn sd-btn-white sd-btn-sm" title="View Applications">
                                                <i className="fas fa-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showAddJobModal && (
                <div className="sd-modal-overlay">
                    <div className="sd-modal">
                        <div className="sd-modal-head">
                            <h3>Post New Job</h3>
                            <button className="sd-close-btn" onClick={() => setShowAddJobModal(false)}>&times;</button>
                        </div>
                        <div className="sd-modal-body">
                            <form onSubmit={handleAddJob} className="sd-modal-form">
                                <label>Job Title</label>
                                <input required value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} placeholder="e.g. Senior Lecturer" />
                                <label>Department</label>
                                <input required value={newJob.department} onChange={e => setNewJob({ ...newJob, department: e.target.value })} placeholder="e.g. Computer Science" />
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
                                <textarea rows={4} value={newJob.description} onChange={e => setNewJob({ ...newJob, description: e.target.value })} placeholder="Job description and requirements..." style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                <button type="submit" className="sd-btn sd-btn-primary" style={{ width: '100%', marginTop: 20 }}>Create Posting</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Recruitment;
