import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const DocumentManagement = () => {
    const [documents, setDocuments] = useState([
        { name: 'HR Policy Manual 2026.pdf', type: 'Policy', size: '2.4 MB', uploadedBy: 'Admin', date: '2026-01-15' },
        { name: 'Employee Contract Template.docx', type: 'Template', size: '1.1 MB', uploadedBy: 'HR Head', date: '2026-02-10' },
        { name: 'Health and Safety Guidelines.pdf', type: 'Policy', size: '3.2 MB', uploadedBy: 'Admin', date: '2026-03-05' }
    ]);

    return (
        <div className="sd-tab-fade">
            <div className="sd-page-header">
                <div>
                    <h2 className="sd-page-title">Document Management</h2>
                    <p className="sd-page-sub">Central repository for contracts, policies, and employee credentials.</p>
                </div>
                <button className="sd-btn sd-btn-primary">
                    <i className="fas fa-upload"></i> Upload Document
                </button>
            </div>

            <div className="sd-stats-row">
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
                    <div className="sd-stat-icon" style={{ color: '#2563eb' }}><i className="fas fa-file-pdf"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>142</div>
                    </div>
                    <div className="sd-stat-lbl">Total Documents</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="sd-stat-icon" style={{ color: '#10b981' }}><i className="fas fa-file-signature"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>89</div>
                    </div>
                    <div className="sd-stat-lbl">Signed Contracts</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="sd-stat-icon" style={{ color: '#f59e0b' }}><i className="fas fa-exclamation-triangle"></i></div>
                    <div className="sd-stat-val">
                        <div style={{ fontWeight: 800, fontSize: 20 }}>12</div>
                    </div>
                    <div className="sd-stat-lbl">Expiring ID Documents</div>
                </div>
            </div>

            <div className="sd-card" style={{ marginTop: 24 }}>
                <div className="sd-card-header">
                    <span><i className="fas fa-folder-open"></i> Central Repository</span>
                </div>
                <div className="sd-card-body">
                    <div className="table-responsive">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Document Name</th>
                                    <th>Type</th>
                                    <th>Size</th>
                                    <th>Uploaded By</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map((doc, i) => (
                                    <tr key={i}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <i className={`fas ${doc.name.endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-word'}`} style={{ color: doc.name.endsWith('.pdf') ? '#dc2626' : '#2563eb' }}></i>
                                                <strong>{doc.name}</strong>
                                            </div>
                                        </td>
                                        <td>{doc.type}</td>
                                        <td>{doc.size}</td>
                                        <td>{doc.uploadedBy}</td>
                                        <td>{doc.date}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="sd-icon-btn"><i className="fas fa-download"></i></button>
                                                <button className="sd-icon-btn ad-icon-btn--delete"><i className="fas fa-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentManagement;
