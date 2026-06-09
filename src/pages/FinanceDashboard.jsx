import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import '../dashboards.css';

const FinanceDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState([]);
    const [txSearch, setTxSearch] = useState('');
    const [txFilter, setTxFilter] = useState('all');
    const [updatingId, setUpdatingId] = useState(null);
    const [stats, setStats] = useState({
        totalRevenue: 'ZMW 0',
        pendingPayments: '0',
        scholarshipFund: 'ZMW 0',
        arrearsTotal: 'ZMW 0',
        monthlyGrowth: '0%'
    });

    const { currentUser, signOut, changePassword } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [showPassModal, setShowPassModal] = useState(false);
    const [passForm, setPassForm] = useState({ new: '', confirm: '' });
    const [updatingPass, setUpdatingPass] = useState(false);

    const [students, setStudents] = useState([]);
    const [stuSearch, setStuSearch] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Update 'Arrears Total' whenever payments or students data changes
    useEffect(() => {
        if (students.length === 0) return;

        const annualFee = 15000;
        let totalArrears = 0;

        students.forEach(student => {
            const paid = payments
                .filter(p => (p.studentUid === student.uid || p.studentId === student.studentId) && p.status?.toLowerCase() === 'verified')
                .reduce((acc, curr) => acc + (typeof curr.amount === 'number' ? curr.amount : parseFloat(curr.amount || 0)), 0);

            const balance = annualFee - paid;
            if (balance > 0) totalArrears += balance;
        });

        setStats(prev => ({
            ...prev,
            arrearsTotal: `ZMW ${totalArrears.toLocaleString()}`
        }));
    }, [payments, students]);

    useEffect(() => {
        if (!currentUser) return;

        // 1. Fetch Profile
        const fetchProfile = async () => {
            const d = await getDoc(doc(db, 'users', currentUser.uid));
            if (d.exists()) {
                const data = d.data();
                setProfile(data);
                if (data.mustChangePassword) setShowPassModal(true);
            }
        };
        fetchProfile();

        // 2. Real-time Payments Listener – orders by Firestore timestamp
        const qPayments = query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(100));
        const unsubPayments = onSnapshot(qPayments, (snap) => {
            const pData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPayments(pData);

            // Calculate Total Revenue (amount is stored as a number)
            const total = pData
                .filter(p => p.status?.toLowerCase() === 'verified')
                .reduce((acc, p) => {
                    const amt = typeof p.amount === 'number' ? p.amount : parseFloat(p.amount || 0);
                    return acc + amt;
                }, 0);

            const pending = pData.filter(p => p.status?.toLowerCase() === 'pending').length;

            setStats(prev => ({
                ...prev,
                totalRevenue: `ZMW ${total.toLocaleString()}`,
                pendingPayments: pending.toString()
            }));
            if (activeTab === 'overview' || activeTab === 'payments') {
                setLoading(false);
            }
        });

        // 3. Real-time Students Listener
        const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
            const sData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(sData);
            setLoading(false);
        });

        return () => {
            unsubPayments();
            unsubStudents();
        };
    }, [currentUser, activeTab]);

    // Update payment status (Verify or Reject)
    const handleStatusUpdate = async (paymentId, newStatus) => {
        setUpdatingId(paymentId);
        try {
            await updateDoc(doc(db, 'payments', paymentId), {
                status: newStatus,
                verifiedBy: profile?.name || 'Finance Officer',
                verifiedAt: new Date(),
            });
            toast.success(`Payment ${newStatus.toLowerCase()} successfully.`);
        } catch (err) {
            toast.error('Failed to update status. Try again.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (passForm.new !== passForm.confirm) { toast.error("Passwords do not match"); return; }
        if (passForm.new.length < 6) { toast.error("Password too short"); return; }
        setUpdatingPass(true);
        try {
            await changePassword(passForm.new);
            await updateDoc(doc(db, 'users', currentUser.uid), {
                mustChangePassword: false,
                password: passForm.new,
                updatedAt: new Date()
            });
            setShowPassModal(false);
            toast.success("Security credentials updated!");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUpdatingPass(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    // Filtered + searched payments for the Transactions tab
    const filteredPayments = payments.filter(p => {
        const matchesFilter = txFilter === 'all' || p.status?.toLowerCase() === txFilter;
        const q = txSearch.toLowerCase();
        const matchesSearch = !q ||
            p.studentName?.toLowerCase().includes(q) ||
            p.receiptNo?.toLowerCase().includes(q) ||
            p.studentId?.toLowerCase().includes(q) ||
            p.method?.toLowerCase().includes(q);
        return matchesFilter && matchesSearch;
    });

    const txTotals = {
        all: payments.length,
        pending: payments.filter(p => p.status?.toLowerCase() === 'pending').length,
        verified: payments.filter(p => p.status?.toLowerCase() === 'verified').length,
        rejected: payments.filter(p => p.status?.toLowerCase() === 'rejected').length,
        totalAmt: payments.filter(p => p.status?.toLowerCase() === 'verified').reduce((a, p) => a + (typeof p.amount === 'number' ? p.amount : parseFloat(p.amount || 0)), 0),
    };

    // ── Shared transaction table row renderer ──
    const TxRow = ({ p }) => (
        <tr key={p.id}>
            <td>
                <code style={{ fontSize: 11, background: '#f0fdf4', color: '#059669', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>
                    {p.receiptNo || p.id.substring(0, 10)}
                </code>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{p.date}</div>
            </td>
            <td>
                <div className="student-info">
                    <span className="student-name">{p.studentName || 'Unknown Student'}</span>
                    <span className="student-id">{p.studentId || 'N/A'}</span>
                </div>
            </td>
            <td style={{ fontWeight: 700, color: '#1e293b' }}>
                ZMW {(typeof p.amount === 'number' ? p.amount : parseFloat(p.amount || 0)).toLocaleString()}
            </td>
            <td>{p.method}</td>
            <td>
                <span className={`status-pill ${p.status?.toLowerCase() || 'pending'}`}>
                    {p.status || 'Pending'}
                </span>
            </td>
            <td>
                {updatingId === p.id ? (
                    <i className="fas fa-spinner fa-spin" style={{ color: '#059669' }}></i>
                ) : p.status?.toLowerCase() === 'pending' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            className="btn-icon-sm"
                            title="Verify Payment"
                            style={{ color: '#059669', borderColor: '#bbf7d0' }}
                            onClick={() => handleStatusUpdate(p.id, 'Verified')}
                        >
                            <i className="fas fa-check"></i>
                        </button>
                        <button
                            className="btn-icon-sm"
                            title="Reject Payment"
                            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={() => handleStatusUpdate(p.id, 'Rejected')}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                ) : (
                    <button className="btn-icon-sm" title="Print Receipt">
                        <i className="fas fa-print"></i>
                    </button>
                )}
            </td>
        </tr>
    );

    return (
        <div className="dashboard-container finance-theme">
            {showPassModal && (
                <div className="sd-modal-overlay" style={{ zIndex: 5000 }}>
                    <div className="sd-modal" style={{ maxWidth: 400 }}>
                        <div className="sd-modal-head">
                            <h3 style={{ color: '#059669' }}><i className="fas fa-shield-alt"></i> Finance Security</h3>
                        </div>
                        <div className="sd-modal-body">
                            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                                Your account is currently using a temporary password. Please set a new secure password.
                            </p>
                            <form onSubmit={handleUpdatePassword}>
                                <div style={{ marginBottom: 15 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>New Password</label>
                                    <input type="password" className="sd-input"
                                        style={{ width: '100%', padding: '10px', display: 'block', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                        value={passForm.new} onChange={e => setPassForm({ ...passForm, new: e.target.value })} required />
                                </div>
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Confirm Password</label>
                                    <input type="password" className="sd-input"
                                        style={{ width: '100%', padding: '10px', display: 'block', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                        value={passForm.confirm} onChange={e => setPassForm({ ...passForm, confirm: e.target.value })} required />
                                </div>
                                <button type="submit" className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center', background: '#059669', borderColor: '#059669' }}
                                    disabled={updatingPass}>
                                    {updatingPass ? <i className="fas fa-spinner fa-spin"></i> : 'Update Security Settings'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {isSidebarOpen && <div className="dashboard-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

            {/* Sidebar */}
            <aside className={`dashboard-sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <i className="fas fa-wallet"></i>
                        <span>FINANCE HUB</span>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}>
                        <i className="fas fa-chart-line"></i> Summary
                    </button>
                    <button className={activeTab === 'payments' ? 'active' : ''} onClick={() => { setActiveTab('payments'); setIsSidebarOpen(false); }}>
                        <i className="fas fa-receipt"></i> Transactions
                        {txTotals.pending > 0 && (
                            <span style={{ marginLeft: 'auto', background: '#fbbf24', color: '#1e293b', borderRadius: 20, fontSize: 10, fontWeight: 800, padding: '2px 7px' }}>
                                {txTotals.pending}
                            </span>
                        )}
                    </button>
                    <button className={activeTab === 'students' ? 'active' : ''} onClick={() => { setActiveTab('students'); setIsSidebarOpen(false); }}>
                        <i className="fas fa-user-graduate"></i> Student Balances
                    </button>
                    <button className={activeTab === 'scholarships' ? 'active' : ''} onClick={() => { setActiveTab('scholarships'); setIsSidebarOpen(false); }}>
                        <i className="fas fa-hand-holding-usd"></i> Scholarships
                    </button>
                    <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}>
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
                    <button className="fin-hamburger" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <i className="fas fa-bars"></i>
                    </button>
                    <div className="header-search">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            placeholder={activeTab === 'payments' ? "Search transactions..." : activeTab === 'students' ? "Search students..." : "Search..."}
                            value={activeTab === 'payments' ? txSearch : activeTab === 'students' ? stuSearch : ''}
                            onChange={e => {
                                if (activeTab === 'payments') setTxSearch(e.target.value);
                                if (activeTab === 'students') setStuSearch(e.target.value);
                            }}
                        />
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => toast.success("Opening manual entry form...")}><i className="fas fa-plus"></i> New Entry</button>
                        <div className="user-profile">
                            <div className="user-info">
                                <span className="user-name">{profile?.name || 'Finance Officer'}</span>
                                <span className="user-role">Accounts Dept</span>
                            </div>
                            <div className="user-avatar fin">{profile?.name?.charAt(0) || 'F'}</div>
                        </div>
                    </div>
                </header>

                <div className="dashboard-content">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                            <i className="fas fa-circle-notch fa-spin fa-3x" style={{ color: '#059669' }}></i>
                        </div>
                    ) : (
                        <>
                            {/* ══ OVERVIEW TAB ══ */}
                            {activeTab === 'overview' && (
                                <>
                                    <div className="stats-grid">
                                        <div className="stat-card">
                                            <div className="stat-icon emerald"><i className="fas fa-money-bill-wave"></i></div>
                                            <div className="stat-details">
                                                <h3>Verified Revenue</h3>
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
                                                <p>{stats.arrearsTotal || 'ZMW 0'}</p>
                                                <span className="trend negative">Attention High</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="dashboard-grid">
                                        <div className="content-card col-span-2">
                                            <div className="card-header">
                                                <h3>Recent Transactions</h3>
                                                <div className="header-filters">
                                                    <button className="btn btn-sm btn-outline" onClick={() => setActiveTab('payments')}>
                                                        <i className="fas fa-list"></i> View All
                                                    </button>
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
                                                        {payments.length === 0 ? (
                                                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No transactions found. Payments made by students will appear here.</td></tr>
                                                        ) : payments.slice(0, 5).map(p => <TxRow key={p.id} p={p} />)}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="content-card">
                                            <div className="card-header">
                                                <h3>Upcoming Invoices</h3>
                                                <button className="btn-icon-sm"><i className="fas fa-ellipsis-v"></i></button>
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
                                                            <span className="mini-date"><i className="far fa-calendar-alt"></i> {item.date}</span>
                                                        </div>
                                                        <div className="mini-amount">{item.total}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ padding: '0 16px 16px' }}>
                                                <button className="btn btn-outline btn-full" style={{ width: '100%', justifyContent: 'center' }}>
                                                    <i className="fas fa-plus-circle"></i> Generate Billing Run
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ══ TRANSACTIONS TAB ══ */}
                            {activeTab === 'payments' && (
                                <div style={{ animation: 'fadeSlideIn 0.3s ease' }}>
                                    {/* Page Title */}
                                    <div style={{ marginBottom: 20 }}>
                                        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
                                            <i className="fas fa-receipt" style={{ color: '#059669', marginRight: 10 }}></i>
                                            All Transactions
                                        </h2>
                                        <p style={{ fontSize: 13, color: '#94a3b8' }}>
                                            Real-time view of all student payments. Verify or reject pending entries below.
                                        </p>
                                    </div>

                                    {/* Summary Stat Badges */}
                                    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                                        {[
                                            { label: 'Total Transactions', val: txTotals.all, color: '#1e293b', bg: '#f8fafc', border: '#e2e8f0' },
                                            { label: 'Verified', val: txTotals.verified, color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
                                            { label: 'Pending Review', val: txTotals.pending, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                                            { label: 'Rejected', val: txTotals.rejected, color: '#dc2626', bg: '#fff5f5', border: '#fca5a5' },
                                            { label: 'Verified Amount', val: `ZMW ${txTotals.totalAmt.toLocaleString()}`, color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
                                        ].map(s => (
                                            <div key={s.label} style={{
                                                background: s.bg, border: `1px solid ${s.border}`,
                                                borderRadius: 10, padding: '10px 18px', minWidth: 130
                                            }}>
                                                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.val}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Filter Pills + Search row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                                        {['all', 'pending', 'verified', 'rejected'].map(f => (
                                            <button key={f} onClick={() => setTxFilter(f)}
                                                style={{
                                                    padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                                                    border: txFilter === f ? 'none' : '1px solid #e2e8f0',
                                                    background: txFilter === f ? '#059669' : 'white',
                                                    color: txFilter === f ? 'white' : '#64748b',
                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                    textTransform: 'capitalize'
                                                }}>
                                                {f === 'all' ? `All (${txTotals.all})` : f === 'pending' ? `Pending (${txTotals.pending})` : f === 'verified' ? `Verified (${txTotals.verified})` : `Rejected (${txTotals.rejected})`}
                                            </button>
                                        ))}
                                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                            <button className="btn-icon" title="Export CSV" style={{ width: 36, height: 36 }}>
                                                <i className="fas fa-download"></i>
                                            </button>
                                            <button className="btn-icon" title="Print" style={{ width: 36, height: 36 }}>
                                                <i className="fas fa-print"></i>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Full Transaction Table */}
                                    <div className="content-card" style={{ borderRadius: 12 }}>
                                        <div className="table-responsive">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Receipt / Date</th>
                                                        <th>Student</th>
                                                        <th>Amount (ZMW)</th>
                                                        <th>Method</th>
                                                        <th>Status</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredPayments.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="6" style={{ textAlign: 'center', padding: '60px 20px' }}>
                                                                <i className="fas fa-inbox" style={{ fontSize: 36, color: '#cbd5e1', display: 'block', marginBottom: 12 }}></i>
                                                                <div style={{ color: '#94a3b8', fontWeight: 600 }}>
                                                                    {txSearch ? `No results for "${txSearch}"` : 'No transactions match the current filter.'}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : filteredPayments.map(p => <TxRow key={p.id} p={p} />)}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#94a3b8' }}>
                                            Showing {filteredPayments.length} of {payments.length} transactions
                                        </div>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'students' && (
                                <div style={{ animation: 'fadeSlideIn 0.3s ease' }}>
                                    <div style={{ marginBottom: 20 }}>
                                        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
                                            <i className="fas fa-user-graduate" style={{ color: '#059669', marginRight: 10 }}></i>
                                            Student Financial Records
                                        </h2>
                                        <p style={{ fontSize: 13, color: '#94a3b8' }}>
                                            Managing account statements and outstanding balances for all registered students.
                                        </p>
                                    </div>

                                    <div className="content-card">
                                        <div className="table-responsive">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Student ID</th>
                                                        <th>Student Name</th>
                                                        <th>Program</th>
                                                        <th>Total Paid</th>
                                                        <th>Balance Due</th>
                                                        <th>Status</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {students.filter(s =>
                                                        s.name?.toLowerCase().includes(stuSearch.toLowerCase()) ||
                                                        s.studentId?.toLowerCase().includes(stuSearch.toLowerCase())
                                                    ).length === 0 ? (
                                                        <tr>
                                                            <td colSpan="7" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                                                No students found.
                                                            </td>
                                                        </tr>
                                                    ) : students
                                                        .filter(s =>
                                                            s.name?.toLowerCase().includes(stuSearch.toLowerCase()) ||
                                                            s.studentId?.toLowerCase().includes(stuSearch.toLowerCase())
                                                        )
                                                        .map(s => {
                                                            const paid = payments
                                                                .filter(p => (p.studentUid === s.uid || p.studentId === s.studentId) && p.status?.toLowerCase() === 'verified')
                                                                .reduce((acc, curr) => acc + (typeof curr.amount === 'number' ? curr.amount : parseFloat(curr.amount || 0)), 0);

                                                            // Logic: Assume 15,000 ZMW per year as a demo invoice
                                                            const totalDue = 15000;
                                                            const balance = totalDue - paid;

                                                            return (
                                                                <tr key={s.id}>
                                                                    <td><code style={{ fontWeight: 700 }}>{s.studentId || 'N/A'}</code></td>
                                                                    <td>
                                                                        <div className="student-info">
                                                                            <span className="student-name">{s.name}</span>
                                                                            <span className="student-id" style={{ fontSize: 10 }}>{s.email}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td>{s.course || 'Degree in Primary Ed.'}</td>
                                                                    <td style={{ color: '#059669', fontWeight: 700 }}>ZMW {paid.toLocaleString()}</td>
                                                                    <td style={{ color: balance > 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                                                                        ZMW {balance.toLocaleString()}
                                                                    </td>
                                                                    <td>
                                                                        <span className={`status-pill ${balance <= 0 ? 'verified' : 'pending'}`} style={{ textTransform: 'capitalize' }}>
                                                                            {balance <= 0 ? 'Cleared' : 'Owing'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                                            <button className="btn-icon-sm" title="Financial Statement"><i className="fas fa-file-invoice-dollar"></i></button>
                                                                            <button className="btn-icon-sm" title="Edit Balance" style={{ color: '#0ea5e9', borderColor: '#bae6fd' }}><i className="fas fa-edit"></i></button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    }
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ══ REPORTS TAB ══ */}
                            {activeTab === 'reports' && (
                                <div style={{ animation: 'fadeSlideIn 0.3s ease' }}>
                                    <div style={{ marginBottom: 20 }}>
                                        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
                                            <i className="fas fa-file-invoice-dollar" style={{ color: '#059669', marginRight: 10 }}></i>
                                            Financial Reports & Audits
                                        </h2>
                                        <p style={{ fontSize: 13, color: '#94a3b8' }}>
                                            Generate and download institutional financial summaries for administration.
                                        </p>
                                    </div>

                                    <div className="dashboard-grid">
                                        {[
                                            { title: 'Revenue Summary', desc: 'Detailed breakdown of all verified payments by method and date range.', icon: 'fa-chart-pie', color: '#059669' },
                                            { title: 'Student Arrears Report', desc: 'List of all students with outstanding balances above a specified threshold.', icon: 'fa-user-clock', color: '#dc2626' },
                                            { title: 'Scholarship Allocation', desc: 'Audit of all disbursed financial aid and remaining fund balances.', icon: 'fa-hand-holding-heart', color: '#0ea5e9' },
                                            { title: 'Daily Collection Log', desc: 'Automated daily log of all transaction activities for the current day.', icon: 'fa-file-alt', color: '#1e293b' },
                                        ].map((report, idx) => (
                                            <div key={idx} className="content-card" style={{ padding: 24, display: 'flex', gap: 20 }}>
                                                <div style={{
                                                    width: 60, height: 60, borderRadius: 15, background: `${report.color}15`,
                                                    color: report.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0
                                                }}>
                                                    <i className={`fas ${report.icon}`}></i>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>{report.title}</h3>
                                                    <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 15 }}>{report.desc}</p>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button className="btn btn-sm btn-primary" style={{ background: report.color, borderColor: report.color }}>
                                                            <i className="fas fa-file-pdf"></i> PDF
                                                        </button>
                                                        <button className="btn btn-sm btn-outline">
                                                            <i className="fas fa-file-excel"></i> XLSX
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {activeTab === 'scholarships' && (
                                <div style={{ animation: 'fadeSlideIn 0.3s ease' }}>
                                    <div style={{ marginBottom: 20 }}>
                                        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
                                            <i className="fas fa-hand-holding-usd" style={{ color: '#059669', marginRight: 10 }}></i>
                                            Scholarship Management
                                        </h2>
                                        <p style={{ fontSize: 13, color: '#94a3b8' }}>
                                            Monitor and distribute institutional and external financial aid.
                                        </p>
                                    </div>

                                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: 24 }}>
                                        <div className="stat-card" style={{ padding: 24 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                                <h3 style={{ fontSize: 14, color: '#64748b' }}>Scholarship Fund Utilization</h3>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>65.4%</span>
                                            </div>
                                            <div style={{ height: 8, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                                                <div style={{ width: '65.4%', height: '100%', background: 'linear-gradient(90deg, #059669, #10b981)' }}></div>
                                            </div>
                                            <p style={{ fontSize: 12, color: '#94a3b8' }}>ZMW 654,000 of ZMW 1,000,000 disbursed this academic year.</p>
                                        </div>
                                        <div className="stat-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <button className="btn btn-primary" style={{ height: 48, background: '#059669', borderColor: '#059669', fontSize: 14 }}>
                                                <i className="fas fa-plus"></i> Grant New Scholarship
                                            </button>
                                        </div>
                                    </div>

                                    <div className="content-card">
                                        <div className="card-header">
                                            <h3>Active Beneficiaries</h3>
                                            <div className="header-filters">
                                                <select className="sd-select" style={{ padding: '6px 12px', fontSize: 12 }}>
                                                    <option>Full Scholarships</option>
                                                    <option>Partial Bursaries</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="table-responsive">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Student</th>
                                                        <th>Scheme Name</th>
                                                        <th>Allowance</th>
                                                        <th>Expiry</th>
                                                        <th>Status</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td colSpan="6" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                                            <i className="fas fa-search" style={{ fontSize: 32, display: 'block', marginBottom: 15 }}></i>
                                                            Select a filter or search to view scholarship data.
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .student-info { display: flex; flex-direction: column; }
                .student-name { font-weight: 600; font-size: 14px; color: #1e293b; }
                .student-id   { font-size: 11px; color: #64748b; }
                .status-pill  { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 700; display: inline-block; }
                .status-pill.verified { background: #dcfce7; color: #16a34a; }
                .status-pill.pending  { background: #fff7ed; color: #ea580c; }
                .status-pill.rejected { background: #fee2e2; color: #dc2626; }
                .font-bold { font-weight: 700; }
                .text-xs    { font-size: 10px; }
                .mt-20      { margin-top: 20px; }
                .btn-full   { width: 100%; }
            `}</style>
        </div>
    );
};

export default FinanceDashboard;
