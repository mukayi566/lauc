import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, getDocs, where } from 'firebase/firestore';
import '../dashboards.css';

const FinanceDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState([
        { id: 'PAY-8821', student: 'Chileshe Mulenga', idNo: 'FU/2024/CSC/042', amount: 'ZMW 4,500', method: 'Bank Transfer', date: '2026-05-28', status: 'Verified' },
        { id: 'PAY-8822', student: 'Priscilla Mwamba', idNo: 'FU/2024/NUR/018', amount: 'ZMW 2,200', method: 'Mobile Money', date: '2026-05-28', status: 'Pending' },
        { id: 'PAY-8823', student: 'Joseph Zulu', idNo: 'FU/2024/BBA/009', amount: 'ZMW 5,000', method: 'Cash', date: '2026-05-27', status: 'Verified' },
        { id: 'PAY-8824', student: 'Miriam Phiri', idNo: 'FU/2024/CSC/012', amount: 'ZMW 3,100', method: 'Bank Transfer', date: '2026-05-27', status: 'Verified' },
    ]);

    const [stats, setStats] = useState({
        totalRevenue: 'ZMW 784,200',
        pendingPayments: '28',
        scholarshipFund: 'ZMW 120,000',
        monthlyGrowth: '+8.4%'
    });

    const { signOut } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="dashboard-container finance-theme">
            {/* Sidebar */}
            <aside className="dashboard-sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <i className="fas fa-wallet"></i>
                        <span>FINANCE HUB</span>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
                        <i className="fas fa-chart-line"></i> Summary
                    </button>
                    <button className={activeTab === 'payments' ? 'active' : ''} onClick={() => setActiveTab('payments')}>
                        <i className="fas fa-receipt"></i> Transactions
                    </button>
                    <button className={activeTab === 'students' ? 'active' : ''} onClick={() => setActiveTab('students')}>
                        <i className="fas fa-user-graduate"></i> Student Balances
                    </button>
                    <button className={activeTab === 'scholarships' ? 'active' : ''} onClick={() => setActiveTab('scholarships')}>
                        <i className="fas fa-hand-holding-usd"></i> Scholarships
                    </button>
                    <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>
                        <i className="fas fa-file-invoice-dollar"></i> Reports
                    </button>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="logout-btn">
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <div className="header-search">
                        <i className="fas fa-search"></i>
                        <input type="text" placeholder="Search by Student ID, Name or Receipt No..." />
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-primary btn-sm"><i className="fas fa-plus"></i> New Entry</button>
                        <div className="user-profile">
                            <div className="user-info">
                                <span className="user-name">Finance Officer</span>
                                <span className="user-role">Accounts Dept</span>
                            </div>
                            <div className="user-avatar fin">FIN</div>
                        </div>
                    </div>
                </header>

                <div className="dashboard-content">
                    {activeTab === 'overview' && (
                        <>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon emerald"><i className="fas fa-money-bill-wave"></i></div>
                                    <div className="stat-details">
                                        <h3>Total Collection</h3>
                                        <p>{stats.totalRevenue}</p>
                                        <span className="trend positive"><i className="fas fa-arrow-up"></i> {stats.monthlyGrowth}</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon amber"><i className="fas fa-clock"></i></div>
                                    <div className="stat-details">
                                        <h3>Pending Tasks</h3>
                                        <p>{stats.pendingPayments}</p>
                                        <span className="trend neutral">Manual Review Req.</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon blue"><i className="fas fa-graduation-cap"></i></div>
                                    <div className="stat-details">
                                        <h3>Scholarship Payouts</h3>
                                        <p>{stats.scholarshipFund}</p>
                                        <span className="trend positive">Disbursed</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon red"><i className="fas fa-exclamation-triangle"></i></div>
                                    <div className="stat-details">
                                        <h3>Arrears Total</h3>
                                        <p>ZMW 42,900</p>
                                        <span className="trend negative">Attention High</span>
                                    </div>
                                </div>
                            </div>

                            <div className="dashboard-grid">
                                <div className="content-card col-span-2">
                                    <div className="card-header">
                                        <h3>Recent Transactions</h3>
                                        <div className="header-filters">
                                            <select><option>All Methods</option></select>
                                            <button className="btn-icon"><i className="fas fa-download"></i></button>
                                        </div>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Receipt</th>
                                                    <th>Student</th>
                                                    <th>Amount</th>
                                                    <th>Method</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payments.map(p => (
                                                    <tr key={p.id}>
                                                        <td><code className="text-xs">{p.id}</code></td>
                                                        <td>
                                                            <div className="student-info">
                                                                <span className="student-name">{p.student}</span>
                                                                <span className="student-id">{p.idNo}</span>
                                                            </div>
                                                        </td>
                                                        <td className="font-bold">{p.amount}</td>
                                                        <td>{p.method}</td>
                                                        <td><span className={`status-pill ${p.status.toLowerCase()}`}>{p.status}</span></td>
                                                        <td>
                                                            <button className="btn-icon-sm"><i className="fas fa-print"></i></button>
                                                            <button className="btn-icon-sm"><i className="fas fa-check"></i></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="content-card">
                                    <div className="card-header">
                                        <h3>Upcoming Invoices</h3>
                                    </div>
                                    <div className="mini-list">
                                        {[
                                            { label: 'Exam Fees - Semester 1', date: 'June 15', total: 'ZMW 850' },
                                            { label: 'Hostel Maintenance', date: 'July 01', total: 'ZMW 300' },
                                            { label: 'Graduation Package', date: 'Oct 10', total: 'ZMW 2,500' }
                                        ].map((item, idx) => (
                                            <div key={idx} className="mini-item">
                                                <div className="mini-info">
                                                    <span className="mini-title">{item.label}</span>
                                                    <span className="mini-date">Due: {item.date}</span>
                                                </div>
                                                <div className="mini-amount">{item.total}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="btn btn-outline btn-full mt-20">Generate Billing Run</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            <style>{`
                .finance-theme { --primary: #059669; --primary-hover: #047857; }
                .stat-icon.emerald { background: #dcfce7; color: #059669; }
                .stat-icon.amber { background: #fef3c7; color: #d97706; }
                
                .student-info { display: flex; flex-direction: column; }
                .student-name { font-weight: 600; font-size: 14px; color: #1e293b; }
                .student-id { font-size: 11px; color: #64748b; }

                .status-pill { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 700; }
                .status-pill.verified { background: #dcfce7; color: #16a34a; }
                .status-pill.pending { background: #fff7ed; color: #ea580c; }

                .mini-list { display: flex; flex-direction: column; gap: 15px; margin-top: 10px; }
                .mini-item { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
                .mini-info { display: flex; flex-direction: column; }
                .mini-title { font-size: 13px; font-weight: 600; color: #334155; }
                .mini-date { font-size: 11px; color: #94a3b8; }
                .mini-amount { font-weight: 700; color: #059669; font-size: 14px; }

                .mt-20 { margin-top: 20px; }
                .btn-full { width: 100%; }
                .text-xs { font-size: 10px; }
            `}</style>
        </div>
    );
};

export default FinanceDashboard;
