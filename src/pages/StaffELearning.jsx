import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, where, doc, updateDoc } from 'firebase/firestore';
import { JitsiMeeting } from '@jitsi/react-sdk';
import Layout from '../components/Layout';
import '../dashboards.css';
import './elearning.css';

const StaffELearning = () => {
    const [staffTab, setStaffTab] = useState('summary');
    const { currentUser, userRole } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Form State
    const [selectedType, setSelectedType] = useState('pdf');
    const [course, setCourse] = useState('');
    const [topic, setTopic] = useState('');
    const [title, setTitle] = useState('');
    const [access, setAccess] = useState('All Students');
    const [files, setFiles] = useState([]); // Array of files
    const [externalUrl, setExternalUrl] = useState(''); // For link resources
    const [uploading, setUploading] = useState(false);
    const [overallProgress, setOverallProgress] = useState(0);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isInClass, setIsInClass] = useState(false);
    const [activeSession, setActiveSession] = useState(null);

    // Materials State
    const [materials, setMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(true);
    const [dbCourses, setDbCourses] = useState([]);

    const handleBack = () => {
        if (userRole === 'student') navigate('/student-dashboard');
        else if (userRole === 'staff') navigate('/staff-dashboard');
        else navigate('/login');
    };

    // Fetch Materials
    useEffect(() => {
        const q = query(collection(db, 'learning_materials'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const mats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMaterials(mats);
            setLoadingMaterials(false);
        });
        return () => unsubscribe();
    }, []);

    // Fetch assigned courses
    useEffect(() => {
        if (!currentUser?.uid) return;

        // Query courses assigned to this lecturer
        const coursesCol = collection(db, 'courses');
        const q = query(coursesCol, where('lecturerId', '==', currentUser.uid));

        const unsubscribe = onSnapshot(q, (snap) => {
            const loaded = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                display: `${d.data().code || d.id} — ${d.data().name || 'Unnamed Course'}`
            }));
            setDbCourses(loaded);
        });

        return () => unsubscribe();
    }, [currentUser?.uid]);

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 0) {
            setFiles(prev => [...prev, ...selectedFiles]);
            if (!title && selectedFiles.length === 1) {
                setTitle(selectedFiles[0].name.split('.')[0]);
            }
        }
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async (publish = true) => {
        if (!course) {
            setMessage({ type: 'error', text: 'Please select a course.' });
            return;
        }

        if (selectedType === 'link' && !externalUrl) {
            setMessage({ type: 'error', text: 'Please provide an external URL.' });
            return;
        }

        if (selectedType !== 'link' && files.length === 0) {
            setMessage({ type: 'error', text: 'Please select at least one file.' });
            return;
        }

        setUploading(true);
        setMessage({ type: 'info', text: selectedType === 'link' ? 'Saving link...' : `Uploading ${files.length} material(s)...` });

        try {
            if (selectedType === 'link') {
                await addDoc(collection(db, 'learning_materials'), {
                    title: title || 'External Resource',
                    course,
                    topic,
                    access,
                    type: 'link',
                    fileUrl: externalUrl,
                    fileName: 'External Link',
                    fileSize: '--',
                    uploaderId: currentUser?.uid,
                    uploaderName: currentUser?.displayName || 'Staff Member',
                    published: publish,
                    createdAt: serverTimestamp(),
                    views: 0
                });
            } else {
                let completed = 0;
                const totalFiles = files.length;
                const uploadPromises = files.map(async (file, index) => {
                    const fileName = `${Date.now()}_${file.name}`;
                    const storageRef = ref(storage, `elearning/${course}/${fileName}`);
                    const uploadTask = uploadBytesResumable(storageRef, file);

                    return new Promise((resolve, reject) => {
                        uploadTask.on('state_changed',
                            (snapshot) => {
                                // Can track individual progress if needed
                            },
                            (error) => {
                                console.error("Upload error:", error);
                                reject(error);
                            },
                            async () => {
                                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                                await addDoc(collection(db, 'learning_materials'), {
                                    title: files.length === 1 && title ? title : file.name.split('.')[0],
                                    course,
                                    topic,
                                    access,
                                    type: selectedType,
                                    fileUrl: downloadURL,
                                    fileName: file.name,
                                    fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
                                    uploaderId: currentUser?.uid,
                                    uploaderName: currentUser?.displayName || 'Staff Member',
                                    published: publish,
                                    createdAt: serverTimestamp(),
                                    views: 0
                                });

                                completed++;
                                setOverallProgress(Math.round((completed / totalFiles) * 100));
                                resolve();
                            }
                        );
                    });
                });

                await Promise.all(uploadPromises);
            }

            setUploading(false);
            setFiles([]);
            setExternalUrl('');
            setOverallProgress(0);
            setTitle('');
            setTopic('');
            setMessage({ type: 'success', text: `Successfully published materials!` });
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);

        } catch (error) {
            console.error("Error during upload: ", error);
            setMessage({ type: 'error', text: 'Error uploading one or more files.' });
            setUploading(false);
        }
    };

    const startClass = async () => {
        if (!course || !topic) {
            setMessage({ type: 'error', text: 'Please select a course and session topic.' });
            return;
        }

        setUploading(true);
        try {
            const sanitize = (str) => str.replace(/[^a-zA-Z0-9]/g, '-');
            const roomName = `Fairview-${sanitize(course)}-${sanitize(topic)}-${Date.now().toString().slice(-5)}`;
            const sessionData = {
                course,
                topic,
                roomName,
                lecturerId: currentUser.uid,
                lecturerName: currentUser.displayName || 'Professor',
                status: 'active',
                startTime: serverTimestamp(),
                studentsCount: 0
            };
            const docRef = await addDoc(collection(db, 'virtual_classes'), sessionData);
            setActiveSession({ id: docRef.id, ...sessionData });
            setIsInClass(true);
            setUploading(false);
        } catch (error) {
            console.error('Error starting class: ', error);
            setMessage({ type: 'error', text: 'Failed to start virtual class. Please try again.' });
            setUploading(false);
        }
    };

    const endClass = async () => {
        if (activeSession?.id) {
            try {
                await updateDoc(doc(db, 'virtual_classes', activeSession.id), {
                    status: 'ended',
                    endTime: serverTimestamp()
                });
            } catch (error) {
                console.error("Error ending session in DB:", error);
            }
        }
        setIsInClass(false);
        setActiveSession(null);
        setCourse('');
        setTopic('');
    };

    return (
        <Layout>
            <div className="elearning-page">
                <div className="staff-elearning-view container section">
                    <div className="staff-elearning-header">
                        <div className="flex-between">
                            <div className="title-area">
                                <h1 className="staff-view-title">E-learning &bull; Study Materials</h1>
                                <p className="staff-view-subtitle">Manage course resources and track student engagement</p>
                            </div>
                            <button className="btn-context" onClick={handleBack}>
                                <i className="fas fa-arrow-left"></i> Exit to Dashboard
                            </button>
                        </div>

                        <div className="staff-tab-row">
                            <button className={`staff-tab ${staffTab === 'summary' ? 'active' : ''}`} onClick={() => setStaffTab('summary')}>
                                <i className="fas fa-th-large"></i> Overview
                            </button>
                            <button className={`staff-tab ${staffTab === 'upload' ? 'active' : ''}`} onClick={() => setStaffTab('upload')}>
                                <i className="fas fa-cloud-upload-alt"></i> Upload Materials
                            </button>
                            <button className={`staff-tab ${staffTab === 'browse' ? 'active' : ''}`} onClick={() => setStaffTab('browse')}>
                                <i className="fas fa-folder-open"></i> Uploaded Resources
                            </button>
                            <button className={`staff-tab ${staffTab === 'performance' ? 'active' : ''}`} onClick={() => setStaffTab('performance')}>
                                <i className="fas fa-chart-line"></i> Performance
                            </button>
                            <button className={`staff-tab ${staffTab === 'classroom' ? 'active' : ''}`} onClick={() => setStaffTab('classroom')}>
                                <i className="fas fa-video"></i> Virtual Classroom
                            </button>
                        </div>
                    </div>

                    {staffTab === 'summary' && (
                        <div className="staff-tab-content">
                            <div className="stat-row">
                                <div className="stat-card">
                                    <div className="num">{materials.length}</div>
                                    <div className="lbl">Total Materials</div>
                                </div>
                                <div className="stat-card">
                                    <div className="num">{new Set(materials.map(m => m.course)).size}</div>
                                    <div className="lbl">Courses Covered</div>
                                </div>
                                <div className="stat-card">
                                    <div className="num">{materials.reduce((acc, m) => acc + (m.views || 0), 0)}</div>
                                    <div className="lbl">Total Views</div>
                                </div>
                                <div className="stat-card">
                                    <div className="num">{materials.filter(m => m.createdAt?.toDate().toDateString() === new Date().toDateString()).length}</div>
                                    <div className="lbl">New Today</div>
                                </div>
                            </div>

                            <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px' }}>
                                <div className="recent-activity-card">
                                    <h3>Resource Types Distribution</h3>
                                    <div className="engagement-list" style={{ marginTop: '20px' }}>
                                        {['pdf', 'video', 'slides', 'link', 'zip', 'past'].map(type => {
                                            const count = materials.filter(m => m.type === type).length;
                                            const percentage = materials.length > 0 ? (count / materials.length) * 100 : 0;
                                            const labels = { pdf: 'PDF Notes', video: 'Video Lectures', slides: 'Slides', link: 'External Links', zip: 'Assignment Files', past: 'Past Papers' };
                                            return (
                                                <div key={type} className="eng-item">
                                                    <span style={{ fontSize: '14px' }}>{labels[type]}</span>
                                                    <div className="eng-bar-bg"><div className="eng-bar-fill" style={{ width: `${percentage}%` }}></div></div>
                                                    <span style={{ fontSize: '13px', color: '#64748b' }}>{count} items</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="recent-activity-card">
                                    <h3>Quick Actions</h3>
                                    <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                                        <button className="btn-context" style={{ justifyContent: 'center', padding: '15px', background: '#e0f2fe', color: '#0369a1' }} onClick={() => setStaffTab('upload')}>
                                            <i className="fas fa-plus-circle"></i> Upload New Resource
                                        </button>
                                        <button className="btn-context" style={{ justifyContent: 'center', padding: '15px', background: '#f1f5f9' }} onClick={() => setStaffTab('browse')}>
                                            <i className="fas fa-folder-open"></i> Manage Uploaded Materials
                                        </button>
                                        <button className="btn-context" style={{ justifyContent: 'center', padding: '15px', background: '#f1f5f9' }} onClick={() => setStaffTab('performance')}>
                                            <i className="fas fa-chart-line"></i> View Detailed Performance
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {staffTab === 'upload' && (
                        <div className="staff-tab-content">
                            {message.text && (
                                <div className={`alert-banner ${message.type}`} style={{ marginBottom: '20px', padding: '12px', borderRadius: '8px', backgroundColor: message.type === 'error' ? '#fee2e2' : message.type === 'success' ? '#dcfce7' : '#e0f2fe' }}>
                                    {message.text}
                                </div>
                            )}

                            <p className="section-label">Select Resource Type</p>
                            <div className="resource-type-grid">
                                {[
                                    { id: 'pdf', label: 'PDF / Notes', icon: 'fa-file-pdf' },
                                    { id: 'video', label: 'Video Lecture', icon: 'fa-video' },
                                    { id: 'slides', label: 'Slides / PPT', icon: 'fa-file-powerpoint' },
                                    { id: 'link', label: 'External Link', icon: 'fa-link' },
                                    { id: 'zip', label: 'Assignment Files', icon: 'fa-file-archive' },
                                    { id: 'past', label: 'Past Papers', icon: 'fa-book-open' }
                                ].map(type => (
                                    <div
                                        key={type.id}
                                        className={`rtype-card ${selectedType === type.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedType(type.id)}
                                    >
                                        <i className={`fas ${type.icon}`}></i>
                                        <span>{type.label}</span>
                                    </div>
                                ))}
                            </div>

                            <p className="section-label">Material Details</p>
                            <div className="upload-row">
                                <select
                                    className="staff-input"
                                    value={course}
                                    onChange={(e) => setCourse(e.target.value)}
                                    required
                                >
                                    <option value="">Select Course</option>
                                    {dbCourses.length > 0 ? (
                                        dbCourses.map(c => (
                                            <option key={c.id} value={c.code || c.id}>{c.display}</option>
                                        ))
                                    ) : (
                                        <>
                                            <option value="ICT 301">ICT 301 — Database Systems</option>
                                            <option value="ICT 302">ICT 302 — Software Engineering</option>
                                            <option value="ICT 303">ICT 303 — Computer Networks</option>
                                        </>
                                    )}
                                </select>
                                <select
                                    className="staff-input"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                >
                                    <option value="">Week / Topic</option>
                                    <option>Week 1 — Introduction</option>
                                    <option>Week 2 — Core Concepts</option>
                                    <option>Week 3 — Practical Session</option>
                                </select>
                            </div>
                            <div className="upload-row">
                                <input
                                    type="text"
                                    placeholder="Title (e.g. Week 3 lecture notes — SQL joins)"
                                    className="staff-input"
                                    style={{ flex: 2 }}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                                <select
                                    className="staff-input"
                                    value={access}
                                    onChange={(e) => setAccess(e.target.value)}
                                >
                                    <option>Access: All Students</option>
                                    <option>Access: Selective Year</option>
                                    <option>Access: Restricted</option>
                                </select>
                            </div>

                            {selectedType === 'link' ? (
                                <div className="url-input-container" style={{ marginTop: '20px' }}>
                                    <p className="section-label" style={{ marginTop: 0 }}>Resource URL</p>
                                    <input
                                        type="url"
                                        placeholder="https://example.com/external-resource-link"
                                        className="staff-input"
                                        style={{ width: '100%', padding: '15px' }}
                                        value={externalUrl}
                                        onChange={(e) => setExternalUrl(e.target.value)}
                                        required
                                    />
                                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                                        <i className="fas fa-info-circle"></i> This link will be opened when students click on the resource.
                                    </p>
                                </div>
                            ) : (
                                <div
                                    className={`upload-zone ${files.length > 0 ? 'has-file' : ''}`}
                                    onClick={() => fileInputRef.current.click()}
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-active'); }}
                                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-active'); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove('drag-active');
                                        const droppedFiles = Array.from(e.dataTransfer.files);
                                        if (droppedFiles.length > 0) {
                                            setFiles(prev => [...prev, ...droppedFiles]);
                                        }
                                    }}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handleFileSelect}
                                        multiple
                                    />
                                    <i className="fas fa-cloud-upload-alt"></i>
                                    {files.length > 0 ? (
                                        <div className="selected-files-list">
                                            <p className="selected-count-label">Selected ({files.length}):</p>
                                            <div className="files-grid">
                                                {files.map((f, idx) => (
                                                    <div key={idx} className="file-tag">
                                                        <span className="file-tag-name">{f.name}</span>
                                                        <button
                                                            className="remove-file-btn"
                                                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                                        >
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p>Drag & drop files here, or click to browse</p>
                                            <span>Supports PDF, MP4, PPTX, DOCX, ZIP — max 500 MB per file</span>
                                        </>
                                    )}
                                </div>
                            )}

                            {uploading && (
                                <div className="upload-progress-container" style={{ marginTop: '20px' }}>
                                    <div className="progress-bar-bg" style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div className="progress-bar-fill" style={{ height: '100%', width: `${overallProgress}%`, backgroundColor: '#2563eb', transition: 'width 0.3s ease' }}></div>
                                    </div>
                                    <p style={{ fontSize: '12px', textAlign: 'center', marginTop: '5px' }}>Overall Progress: {overallProgress}%</p>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button
                                    className="btn-context"
                                    onClick={() => handleUpload(false)}
                                    disabled={uploading}
                                >
                                    Save as Draft
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleUpload(true)}
                                    disabled={uploading}
                                >
                                    {uploading ? 'Uploading...' : 'Upload & Publish'}
                                </button>
                            </div>
                        </div>
                    )}

                    {staffTab === 'browse' && (
                        <div className="staff-tab-content">
                            <div className="filter-row">
                                <select className="staff-input">
                                    <option>All Courses</option>
                                    {dbCourses.map(c => (
                                        <option key={c.id} value={c.code || c.id}>{c.code || c.id}</option>
                                    ))}
                                    {dbCourses.length === 0 && (
                                        <>
                                            <option>ICT 301</option>
                                            <option>ICT 302</option>
                                            <option>ICT 303</option>
                                        </>
                                    )}
                                </select>
                                <select className="staff-input">
                                    <option>All Types</option>
                                    <option>pdf</option>
                                    <option>video</option>
                                    <option>slides</option>
                                </select>
                                <input type="text" placeholder="Search materials..." className="staff-input" style={{ flex: 1 }} />
                            </div>

                            <div className="material-list">
                                {loadingMaterials ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
                                        <p>Loading materials...</p>
                                    </div>
                                ) : materials.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                        <i className="fas fa-folder-open" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
                                        <p>No materials uploaded yet.</p>
                                    </div>
                                ) : (
                                    materials.map((mat) => {
                                        const typeConfig = {
                                            pdf: { icon: 'fa-file-pdf', color: 'blue' },
                                            video: { icon: 'fa-video', color: 'indigo' },
                                            slides: { icon: 'fa-file-powerpoint', color: 'pink' },
                                            zip: { icon: 'fa-file-archive', color: 'orange' },
                                            link: { icon: 'fa-link', color: 'cyan' },
                                            past: { icon: 'fa-book-open', color: 'purple' }
                                        };
                                        const config = typeConfig[mat.type] || { icon: 'fa-file', color: 'green' };

                                        return (
                                            <div key={mat.id} className="material-row">
                                                <div className={`file-icon-circle ${config.color}`}>
                                                    <i className={`fas ${config.icon}`}></i>
                                                </div>
                                                <div className="mat-info">
                                                    <div className="name">{mat.title}</div>
                                                    <div className="meta">
                                                        {mat.course} &bull; {mat.type?.toUpperCase()} &bull; {mat.fileSize} &bull; {mat.createdAt?.toDate().toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="mat-actions">
                                                    <button className="icon-btn" title="Edit"><i className="fas fa-edit"></i></button>
                                                    <a href={mat.fileUrl} target="_blank" rel="noreferrer" className="icon-btn" title="Download"><i className="fas fa-download"></i></a>
                                                    <button className="icon-btn" title="Delete" onClick={() => {
                                                        if (window.confirm('Are you sure you want to delete this material?')) {
                                                            // Add delete logic here
                                                        }
                                                    }}><i className="fas fa-trash"></i></button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {staffTab === 'performance' && (
                        <div className="staff-tab-content">
                            <div className="stat-row">
                                <div className="stat-card">
                                    <div className="num">47</div>
                                    <div className="lbl">Total Materials</div>
                                </div>
                                <div className="stat-card">
                                    <div className="num">6</div>
                                    <div className="lbl">Courses Covered</div>
                                </div>
                                <div className="stat-card">
                                    <div className="num">1,204</div>
                                    <div className="lbl">Student Views</div>
                                </div>
                                <div className="stat-card">
                                    <div className="num">3</div>
                                    <div className="lbl">Uploaded Today</div>
                                </div>
                            </div>

                            <div className="recent-activity-card">
                                <h3>Engagement Trends</h3>
                                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Your most viewed resources this week</p>
                                <div className="engagement-list">
                                    <div className="eng-item">
                                        <span>ICT 301 - Quiz 2 Solution</span>
                                        <div className="eng-bar-bg"><div className="eng-bar-fill" style={{ width: '85%' }}></div></div>
                                        <span>452 views</span>
                                    </div>
                                    <div className="eng-item">
                                        <span>Software Patterns Slides</span>
                                        <div className="eng-bar-bg"><div className="eng-bar-fill" style={{ width: '60%' }}></div></div>
                                        <span>312 views</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {staffTab === 'classroom' && (
                        <div className="staff-tab-content">
                            {!isInClass ? (
                                <div className="classroom-setup-card" style={{ background: 'white', padding: '40px', borderRadius: '24px', border: '1px solid #e2e8f0', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
                                    <div className="setup-icon" style={{ width: '80px', height: '80px', background: '#eff6ff', color: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '2rem' }}>
                                        <i className="fas fa-video" style={{ margin: '0 auto' }}></i>
                                    </div>
                                    <h2 style={{ fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>Virtual Classroom</h2>
                                    <p style={{ color: '#64748b', marginBottom: '30px' }}>Launch a live session with your students. You can share your screen, present slides, and interact in real-time.</p>

                                    <div style={{ textAlign: 'left', display: 'grid', gap: '20px' }}>
                                        <div className="form-group">
                                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Target Course</label>
                                            <select
                                                className="staff-input"
                                                style={{ width: '100%' }}
                                                value={course}
                                                onChange={(e) => setCourse(e.target.value)}
                                            >
                                                <option value="">Select Course</option>
                                                {dbCourses.length > 0 ? (
                                                    dbCourses.map(c => (
                                                        <option key={c.id} value={c.code || c.id}>{c.display}</option>
                                                    ))
                                                ) : (
                                                    <>
                                                        <option value="ICT 301">ICT 301 — Database Systems</option>
                                                        <option value="ICT 302">ICT 302 — Software Engineering</option>
                                                        <option value="ICT 303">ICT 303 — Computer Networks</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Session Topic</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Week 4: Introduction to SQL Queries"
                                                className="staff-input"
                                                style={{ width: '100%' }}
                                                value={topic}
                                                onChange={(e) => setTopic(e.target.value)}
                                            />
                                        </div>

                                        <button
                                            className="btn btn-primary"
                                            style={{ width: '100%', padding: '15px', marginTop: '10px' }}
                                            onClick={startClass}
                                            disabled={uploading}
                                        >
                                            {uploading ? 'Preparing Session...' : 'Start Live Class Now'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="active-classroom-view" style={{ background: '#0f172a', borderRadius: '24px', overflow: 'hidden', height: '700px', display: 'flex', flexDirection: 'column' }}>
                                    {/* Top Bar */}
                                    <div className="classroom-top-bar" style={{ padding: '14px 24px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ background: '#3b82f6', color: 'white', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                                                {activeSession?.course}
                                            </span>
                                            <h4 style={{ color: 'white', margin: 0, fontSize: '14px', fontWeight: 600 }}>{activeSession?.topic}</h4>
                                            <span style={{ color: '#10b981', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <i className="fas fa-circle" style={{ fontSize: '7px', animation: 'pulse 1.5s infinite' }}></i> LIVE
                                            </span>
                                        </div>
                                        <button
                                            style={{ background: '#ef4444', color: 'white', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                            onClick={endClass}
                                        >
                                            <i className="fas fa-phone-slash" style={{ marginRight: '6px' }}></i>
                                            End Session
                                        </button>
                                    </div>

                                    {/* Jitsi Meeting Embed */}
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        {activeSession?.roomName && (
                                            <JitsiMeeting
                                                domain="meet.jit.si"
                                                roomName={activeSession.roomName}
                                                userInfo={{
                                                    displayName: currentUser?.displayName || 'Professor',
                                                    email: currentUser?.email || ''
                                                }}
                                                configOverwrite={{
                                                    startWithAudioMuted: false,
                                                    startWithVideoMuted: false,
                                                    disableDeepLinking: true,
                                                    prejoinPageEnabled: false
                                                }}
                                                interfaceConfigOverwrite={{
                                                    SHOW_JITSI_WATERMARK: false,
                                                    SHOW_WATERMARK_FOR_GUESTS: false,
                                                    TOOLBAR_BUTTONS: [
                                                        'microphone', 'camera', 'closedcaptions',
                                                        'desktop', 'fullscreen', 'fodeviceselection',
                                                        'hangup', 'profile', 'chat', 'recording',
                                                        'sharedvideo', 'settings', 'raisehand',
                                                        'videoquality', 'filmstrip', 'shortcuts',
                                                        'tileview', 'select-background', 'mute-everyone'
                                                    ]
                                                }}
                                                getIFrameRef={(el) => {
                                                    if (el) {
                                                        el.style.width = '100%';
                                                        el.style.height = '100%';
                                                        el.style.border = 'none';
                                                    }
                                                }}
                                                onReadyToClose={endClass}
                                                onApiReady={(api) => {
                                                    console.log('Jitsi API ready:', api);
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default StaffELearning;
