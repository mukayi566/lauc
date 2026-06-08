import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import '../dashboards.css';

const HRDashboard = () => {
  // Small inline sparkline (SVG) for quick trends
  const Sparkline = ({ data = [], width = 120, height = 28, color = '#7c3aed' }) => {
    if (!data || data.length === 0) return <div style={{ height }} />;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = width / (data.length - 1 || 1);
    const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');
    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        <polyline fill="none" stroke={color} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  // Mini donut showing percentage
  const MiniDonut = ({ value = 0, max = 100, size = 48, color = '#10b981' }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.max(0, Math.min(1, (max === 0 ? 0 : value / max)));
    const dash = `${(circumference * pct).toFixed(2)} ${circumference.toFixed(2)}`;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`translate(${size / 2}, ${size / 2})`}>
            <circle r={radius} fill="none" stroke="#eef2ff" strokeWidth="6" />
            <circle r={radius} fill="none" stroke={color} strokeWidth="6" strokeDasharray={dash} strokeLinecap="round" transform={`rotate(-90)`} />
          </g>
        </svg>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{Math.round(pct * 100)}%</div>
      </div>
    );
  };
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [showPassModal, setShowPassModal] = useState(false);
  const [passForm, setPassForm] = useState({ new: '', confirm: '' });
  const [updatingPass, setUpdatingPass] = useState(false);

  const [payrollRecords, setPayrollRecords] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [searchPayroll, setSearchPayroll] = useState('');
  const [searchInventory, setSearchInventory] = useState('');
  const [searchEmployees, setSearchEmployees] = useState('');

  const [newInventory, setNewInventory] = useState({ name: '', category: '', value: '' });
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', role: 'staff', department: 'Human Resources', status: 'Active' });
  const [savingInventory, setSavingInventory] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const { currentUser, signOut, changePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    const loadProfile = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setProfile(data);
          if (data.mustChangePassword) setShowPassModal(true);
        }
      } catch (err) {
        console.error('Failed to load HR profile:', err);
      }
    };

    loadProfile();
  }, [currentUser]);

  useEffect(() => {
    const payrollQuery = query(collection(db, 'payroll'), orderBy('createdAt', 'desc'));
    const unsubPayroll = onSnapshot(
      payrollQuery,
      (snap) => setPayrollRecords(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
      (err) => console.error('Payroll listener error:', err)
    );

    const inventoryQuery = query(collection(db, 'inventory'), orderBy('addedAt', 'desc'));
    const unsubInventory = onSnapshot(
      inventoryQuery,
      (snap) => setInventoryItems(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
      (err) => console.error('Inventory listener error:', err)
    );

    // Listen for users with staff-like roles and lecturers, then merge into a single employees list
    let usersList = [];
    let lecturersList = [];

    const mergeLists = (a, b) => {
      const map = new Map();
      a.forEach(u => map.set((u.email || u.id || u.uid || u.docId) + '', u));
      b.forEach(u => {
        const key = (u.email || u.id || u.uid || u.docId) + '';
        if (!map.has(key)) map.set(key, u);
      });
      return Array.from(map.values());
    };

    const rolesToFetch = ['staff', 'registrar', 'it', 'finance'];
    const usersQuery = query(collection(db, 'users'), where('role', 'in', rolesToFetch));
    const unsubUsers = onSnapshot(
      usersQuery,
      (snap) => {
        usersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEmployees(mergeLists(usersList, lecturersList));
      },
      (err) => console.error('Users listener error:', err)
    );

    const unsubLecturers = onSnapshot(
      collection(db, 'lecturers'),
      (snap) => {
        lecturersList = snap.docs.map(d => ({ id: d.id, ...d.data(), role: d.data().role || 'staff' }));
        setEmployees(mergeLists(usersList, lecturersList));
      },
      (err) => console.error('Lecturers listener error:', err)
    );

    return () => {
      unsubPayroll();
      unsubInventory();
      unsubUsers();
      unsubLecturers();
    };
  }, []);

  const filteredPayroll = payrollRecords.filter((item) => {
    const q = searchPayroll.toLowerCase();
    return (
      !q ||
      item.employeeName?.toLowerCase().includes(q) ||
      item.type?.toLowerCase().includes(q) ||
      item.month?.toLowerCase().includes(q) ||
      item.code?.toLowerCase().includes(q)
    );
  });

  const filteredInventory = inventoryItems.filter((item) => {
    const q = searchInventory.toLowerCase();
    return (
      !q ||
      item.name?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q) ||
      item.code?.toLowerCase().includes(q)
    );
  });

  const filteredEmployees = employees.filter((record) => {
    const q = searchEmployees.toLowerCase();
    return (
      !q ||
      record.name?.toLowerCase().includes(q) ||
      record.email?.toLowerCase().includes(q) ||
      record.department?.toLowerCase().includes(q) ||
      record.role?.toLowerCase().includes(q)
    );
  });

  const totalDebtPayroll = payrollRecords
    .filter((item) => item.type === 'TEVETA')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const totalStaffPayroll = payrollRecords
    .filter((item) => item.type === 'Staff')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const totalAssetValue = inventoryItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  // Small datasets for inline charts
  const payrollTrend = payrollRecords.slice(0, 12).map(r => Number(r.amount) || 0).reverse();
  const tevetaTrend = payrollRecords.filter(r => r.type === 'TEVETA').slice(0, 12).map(r => Number(r.amount) || 0).reverse();
  const staffTrend = payrollRecords.filter(r => r.type === 'Staff').slice(0, 12).map(r => Number(r.amount) || 0).reverse();
  const inventoryValues = inventoryItems.slice(0, 12).map(i => Number(i.value) || 0).reverse();
  const activeCount = employees.filter((item) => item.status === 'Active').length;
  const assetsAvailable = inventoryItems.filter((item) => item.status === 'In Stock').length;

  const handleLogout = async () => {
    await signOut();
    navigate('/hr-login');
  };

  const generateInventoryCode = () => {
    return `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const handleAddInventory = async (e) => {
    e.preventDefault();
    if (!newInventory.name || !newInventory.category || !newInventory.value) {
      toast.error('Please complete inventory details.');
      return;
    }
    setSavingInventory(true);
    try {
      await addDoc(collection(db, 'inventory'), {
        ...newInventory,
        code: generateInventoryCode(),
        value: Number(newInventory.value),
        addedBy: profile?.name || 'HR Officer',
        addedAt: serverTimestamp(),
        status: 'In Stock'
      });
      setNewInventory({ name: '', category: '', value: '' });
      toast.success('Inventory item registered.');
    } catch (err) {
      console.error(err);
      toast.error('Unable to save inventory item.');
    } finally {
      setSavingInventory(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.email) {
      toast.error('Please fill in the employee name and email.');
      return;
    }
    setSavingEmployee(true);
    try {
      await addDoc(collection(db, 'employees'), {
        ...newEmployee,
        createdBy: profile?.name || 'HR Officer',
        createdAt: serverTimestamp()
      });
      setNewEmployee({ name: '', email: '', role: 'staff', department: 'Human Resources', status: 'Active' });
      toast.success('Employee record created.');
    } catch (err) {
      console.error(err);
      toast.error('Unable to save employee record.');
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passForm.new !== passForm.confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    if (passForm.new.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setUpdatingPass(true);
    try {
      await changePassword(passForm.new);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        mustChangePassword: false,
        password: passForm.new,
        updatedAt: serverTimestamp()
      });
      setShowPassModal(false);
      toast.success('Password updated successfully.');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Password update failed.');
    } finally {
      setUpdatingPass(false);
    }
  };

  const formatCurrency = (value) => {
    return `ZMW ${Number(value || 0).toLocaleString()}`;
  };

  return (
    <div className="sd-shell">
      <aside className="sd-sidebar">
        <div className="sd-sidebar-header">
          <div className="sd-sidebar-logo">
            <div className="sd-logo-icon" style={{ background: '#fde68a', color: '#92400e' }}>
              <i className="fas fa-briefcase"></i>
            </div>
            <div>
              <div className="sd-logo-title">HR MODULE</div>
              <div className="sd-logo-sub">People Operations</div>
            </div>
          </div>
        </div>

        <div className="sd-profile-pill">
          <div className="sd-avatar">{profile?.name?.charAt(0) || 'H'}</div>
          <div className="sd-profile-info">
            <div className="sd-profile-name">{profile?.name || 'HR Officer'}</div>
            <div className="sd-profile-id">{profile?.email}</div>
          </div>
        </div>

        <nav className="sd-nav">
          <div className="sd-nav-group">HR Operations</div>
          {['overview', 'payroll', 'inventory', 'employees', 'reports', 'performance'].map((tab) => (
            <button
              key={tab}
              className={`sd-nav-link ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              <i className={`fas ${tab === 'overview' ? 'fa-home' : tab === 'payroll' ? 'fa-money-bill-wave' : tab === 'inventory' ? 'fa-boxes' : tab === 'employees' ? 'fa-users' : tab === 'reports' ? 'fa-chart-pie' : 'fa-trophy'}`}></i>
              {tab === 'overview' ? 'Overview' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        <div className="sd-sidebar-footer">
          <button onClick={handleLogout} className="sd-nav-link sd-logout" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}>
            <i className="fas fa-power-off"></i> Sign Out
          </button>
        </div>
      </aside>

      <main className="sd-body">
        <header className="sd-topbar">
          <button className="sd-hamburger"><i className="fas fa-bars"></i></button>
          <div className="sd-topbar-title">HR Admin Module</div>
          <div className="sd-topbar-right">
            <div className="header-badge" style={{ background: '#fef3c7', borderColor: '#fde68a', color: '#b45309' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706' }}></span>
              HR Portal
            </div>
            <div className="sd-icon-btn"><i className="fas fa-bell"></i></div>
            <div className="sd-topbar-avatar">{profile?.name?.charAt(0) || 'H'}</div>
          </div>
        </header>

        <div className="sd-main">
          {activeTab === 'overview' && (
            <>
              <div className="sd-welcome-banner" style={{ borderColor: '#fde68a' }}>
                <div>
                  <h1 className="sd-welcome-h1">Welcome back, {profile?.name?.split(' ')[0] || 'HR'}</h1>
                  <p className="sd-welcome-p">Securely manage payroll, inventory, employee records, HR reports, and performance workflows.</p>
                </div>
                <div className="sd-welcome-actions">
                  <button className="sd-btn sd-btn-white"><i className="fas fa-file-invoice-dollar"></i> Run Payroll</button>
                  <button className="sd-btn sd-btn-glass"><i className="fas fa-folder-open"></i> Employee Records</button>
                </div>
              </div>

              <div className="sd-stats-row">
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <div className="sd-stat-icon" style={{ color: '#b45309' }}><i className="fas fa-money-check-alt"></i></div>
                  <div className="sd-stat-val">
                    <div style={{ fontWeight: 800, fontSize: 20 }}>{payrollRecords.length}</div>
                    <div style={{ marginTop: 6 }}><Sparkline data={payrollTrend} color="#b45309" /></div>
                  </div>
                  <div className="sd-stat-lbl">Payroll Transactions</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #16a34a' }}>
                  <div className="sd-stat-icon" style={{ color: '#15803d' }}><i className="fas fa-boxes"></i></div>
                  <div className="sd-stat-val">
                    <div style={{ fontWeight: 800, fontSize: 20 }}>{inventoryItems.length}</div>
                    <div style={{ marginTop: 6 }}><Sparkline data={inventoryValues} color="#15803d" /></div>
                  </div>
                  <div className="sd-stat-lbl">Inventory Assets</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
                  <div className="sd-stat-icon" style={{ color: '#1d4ed8' }}><i className="fas fa-user-tie"></i></div>
                  <div className="sd-stat-val">
                    <div style={{ fontWeight: 800, fontSize: 20 }}>{employees.length}</div>
                    <div style={{ marginTop: 6 }}><Sparkline data={staffTrend} color="#2563eb" /></div>
                  </div>
                  <div className="sd-stat-lbl">Employee Records</div>
                </div>
                <div className="sd-stat-card" style={{ borderLeft: '4px solid #9333ea' }}>
                  <div className="sd-stat-icon" style={{ color: '#7c3aed' }}><i className="fas fa-chart-line"></i></div>
                  <div className="sd-stat-val">
                    <div style={{ fontWeight: 800, fontSize: 20 }}>{Math.max(0, Math.round((employees.length * 100) / 25))}%</div>
                    <div style={{ marginTop: 6 }}><Sparkline data={staffTrend} color="#7c3aed" /></div>
                  </div>
                  <div className="sd-stat-lbl">Performance Index</div>
                </div>
              </div>

              <div className="sd-two-col">
                <div className="sd-card">
                  <div className="sd-card-header">
                    <span><i className="fas fa-user-check"></i> TEVETA Payroll Summary</span>
                  </div>
                  <div className="sd-card-body">
                    <p className="sd-muted">Net TEVETA disbursements and student stipends under current cycle.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
                      <div>
                        <div className="sd-small-label">TEVETA Funds</div>
                        <div className="sd-small-value">
                          <div style={{ fontWeight: 700 }}>{formatCurrency(totalDebtPayroll)}</div>
                          <div style={{ marginTop: 8 }}><Sparkline data={tevetaTrend} color="#b45309" /></div>
                        </div>
                      </div>
                      <div>
                        <div className="sd-small-label">Staff Payroll Total</div>
                        <div className="sd-small-value">
                          <div style={{ fontWeight: 700 }}>{formatCurrency(totalStaffPayroll)}</div>
                          <div style={{ marginTop: 8 }}><Sparkline data={staffTrend} color="#059669" /></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="sd-card">
                  <div className="sd-card-header">
                    <span><i className="fas fa-chart-bar"></i> HR Intelligence</span>
                  </div>
                  <div className="sd-card-body">
                    <p className="sd-muted">Keep an eye on employee health, attendance, and performance signals.</p>
                    <div className="sd-stat-grid" style={{ marginTop: 16 }}>
                      <div className="sd-stat-block">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <MiniDonut value={activeCount} max={Math.max(1, employees.length)} color="#2563eb" />
                          <div>
                            <div style={{ fontWeight: 800 }}>{activeCount}</div>
                            <div className="sd-stat-block-label">Active Staff</div>
                          </div>
                        </div>
                      </div>
                      <div className="sd-stat-block">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <MiniDonut value={assetsAvailable} max={Math.max(1, inventoryItems.length)} color="#16a34a" />
                          <div>
                            <div style={{ fontWeight: 800 }}>{assetsAvailable}</div>
                            <div className="sd-stat-block-label">Assets Available</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'payroll' && (
            <div className="sd-card">
              <div className="sd-card-header">
                <span><i className="fas fa-money-bill-wave"></i> Payroll Manager</span>
              </div>
              <div className="sd-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                  <div style={{ flex: '1 1 240px' }}>
                    <input
                      value={searchPayroll}
                      onChange={(e) => setSearchPayroll(e.target.value)}
                      placeholder="Search payroll..."
                      className="sd-input"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="sd-btn sd-btn-white">New TEVETA Payroll</button>
                    <button className="sd-btn sd-btn-glass">Staff Payroll</button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="sd-table sd-table--hover">
                    <thead>
                      <tr><th>Code</th><th>Employee</th><th>Type</th><th>Amount</th><th>Month</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {filteredPayroll.length === 0 ? (
                        <tr><td colSpan={6} className="sd-empty">No payroll records found.</td></tr>
                      ) : filteredPayroll.map((item) => (
                        <tr key={item.id}>
                          <td>{item.code || item.id.slice(0, 8)}</td>
                          <td>{item.employeeName}</td>
                          <td>{item.type}</td>
                          <td>{formatCurrency(item.amount)}</td>
                          <td>{item.month || 'N/A'}</td>
                          <td>{item.status || 'Pending'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="sd-two-col">
              <div className="sd-card">
                <div className="sd-card-header">
                  <span><i className="fas fa-boxes"></i> Asset Inventory</span>
                </div>
                <div className="sd-card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                    <div style={{ flex: '1 1 320px' }}>
                      <input
                        value={searchInventory}
                        onChange={(e) => setSearchInventory(e.target.value)}
                        placeholder="Search assets..."
                        className="sd-input"
                      />
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Total asset value: {formatCurrency(totalAssetValue)}</div>
                  </div>
                  <div className="table-responsive">
                    <table className="sd-table sd-table--hover">
                      <thead>
                        <tr><th>Code</th><th>Name</th><th>Category</th><th>Value</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {filteredInventory.length === 0 ? (
                          <tr><td colSpan={5} className="sd-empty">No registered inventory assets.</td></tr>
                        ) : filteredInventory.map((item) => (
                          <tr key={item.id}>
                            <td>{item.code}</td>
                            <td>{item.name}</td>
                            <td>{item.category}</td>
                            <td>{formatCurrency(item.value)}</td>
                            <td>{item.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="sd-card">
                <div className="sd-card-header">
                  <span><i className="fas fa-plus-circle"></i> Add New Asset</span>
                </div>
                <div className="sd-card-body">
                  <form onSubmit={handleAddInventory} className="sd-modal-form">
                    <label>Asset Name</label>
                    <input
                      value={newInventory.name}
                      onChange={(e) => setNewInventory({ ...newInventory, name: e.target.value })}
                      placeholder="Laptop, Projector, Desk"
                      required
                    />
                    <label>Category</label>
                    <input
                      value={newInventory.category}
                      onChange={(e) => setNewInventory({ ...newInventory, category: e.target.value })}
                      placeholder="Office equipment"
                      required
                    />
                    <label>Estimated Value</label>
                    <input
                      type="number"
                      value={newInventory.value}
                      onChange={(e) => setNewInventory({ ...newInventory, value: e.target.value })}
                      placeholder="0"
                      required
                    />
                    <button type="submit" className="sd-btn sd-btn-primary" disabled={savingInventory}>
                      {savingInventory ? 'Saving...' : 'Register Asset'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            <>
              <div className="sd-card">
                <div className="sd-card-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span><i className="fas fa-users"></i> Employee Records</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ color: '#6b7280', alignSelf: 'center' }}>{filteredEmployees.length} records</div>
                      <button className="sd-btn sd-btn-primary" onClick={() => setShowRegisterModal(true)}>
                        <i className="fas fa-user-plus" /> Register Employee
                      </button>
                    </div>
                  </div>
                </div>
                <div className="sd-card-body">
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                    <input
                      value={searchEmployees}
                      onChange={(e) => setSearchEmployees(e.target.value)}
                      placeholder="Search employees..."
                      className="sd-input"
                      style={{ flex: '1 1 320px' }}
                    />
                  </div>
                  <div className="table-responsive">
                    <table className="sd-table sd-table--hover">
                      <thead>
                        <tr><th>Name</th><th>Email</th><th>Dept</th><th>Role</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {filteredEmployees.length === 0 ? (
                          <tr><td colSpan={5} className="sd-empty">No employee records found.</td></tr>
                        ) : filteredEmployees.map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.email}</td>
                            <td>{item.department || item.dept || item.role || '—'}</td>
                            <td>{item.role}</td>
                            <td>{item.status || (item.active ? 'Active' : '—')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {showRegisterModal && (
                <div className="sd-modal-overlay" style={{ zIndex: 9999 }}>
                  <div className="sd-modal" style={{ maxWidth: 520 }}>
                    <div className="sd-modal-head">
                      <h3><i className="fas fa-user-plus"></i> Register Employee</h3>
                      <button className="sd-close-btn" onClick={() => setShowRegisterModal(false)}>&times;</button>
                    </div>
                    <div className="sd-modal-body">
                      <form onSubmit={async (e) => { await handleAddEmployee(e); setShowRegisterModal(false); }} className="sd-modal-form">
                        <label>Full Name</label>
                        <input
                          value={newEmployee.name}
                          onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                          placeholder="Jane Doe"
                          required
                        />
                        <label>Email Address</label>
                        <input
                          type="email"
                          value={newEmployee.email}
                          onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                          placeholder="jane@fairview.edu"
                          required
                        />
                        <label>Role</label>
                        <select
                          value={newEmployee.role}
                          onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                        >
                          <option value="staff">Staff</option>
                          <option value="hr">HR</option>
                          <option value="finance">Finance</option>
                          <option value="it">IT</option>
                          <option value="registrar">Registrar</option>
                        </select>
                        <label>Department</label>
                        <input
                          value={newEmployee.department}
                          onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                          required
                        />
                        <div className="sd-modal-actions">
                          <button type="submit" className="sd-btn sd-btn-primary" disabled={savingEmployee}>
                            {savingEmployee ? 'Registering...' : 'Create Record'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'reports' && (
            <div className="sd-card">
              <div className="sd-card-header">
                <span><i className="fas fa-chart-pie"></i> Staff Reports & Analytics</span>
              </div>
              <div className="sd-card-body">
                <div className="sd-grid-3" style={{ gap: 16 }}>
                  <div className="sd-report-card">
                    <div className="sd-report-title">Headcount Growth</div>
                    <div className="sd-report-value">{employees.length} staff</div>
                    <div className="sd-report-meta">Updated from latest employee records</div>
                  </div>
                  <div className="sd-report-card">
                    <div className="sd-report-title">Payroll Coverage</div>
                    <div className="sd-report-value">{payrollRecords.length} payments</div>
                    <div className="sd-report-meta">Includes TEVETA and staff payroll</div>
                  </div>
                  <div className="sd-report-card">
                    <div className="sd-report-title">Inventory Utilization</div>
                    <div className="sd-report-value">{inventoryItems.length} assets</div>
                    <div className="sd-report-meta">Track property codes and stock status</div>
                  </div>
                </div>
                <div style={{ marginTop: 24 }}>
                  <div className="sd-chart-legend">Latest HR insights and trend analysis.</div>
                  <div className="sd-chart-placeholder">Analytics dashboard coming soon</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="sd-card">
              <div className="sd-card-header">
                <span><i className="fas fa-trophy"></i> Performance Management</span>
              </div>
              <div className="sd-card-body">
                <div className="sd-card-grid" style={{ gap: 16 }}>
                  <div className="sd-mini-card">
                    <div className="sd-mini-title">Goal Completion</div>
                    <div className="sd-mini-value">78%</div>
                  </div>
                  <div className="sd-mini-card">
                    <div className="sd-mini-title">High Performers</div>
                    <div className="sd-mini-value">12</div>
                  </div>
                  <div className="sd-mini-card">
                    <div className="sd-mini-title">Action Plans</div>
                    <div className="sd-mini-value">4</div>
                  </div>
                </div>
                <div style={{ marginTop: 20 }}>
                  <p className="sd-muted">Use this section to capture staff development, training progress, and performance reviews.</p>
                  <div className="sd-task-list">
                    <div className="sd-task-item"><span>Quarterly review schedule</span><span className="sd-badge badge-teal">Planned</span></div>
                    <div className="sd-task-item"><span>Training needs assessment</span><span className="sd-badge badge-info">In progress</span></div>
                    <div className="sd-task-item"><span>Employee feedback follow-up</span><span className="sd-badge badge-warning">Pending</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showPassModal && (
        <div className="sd-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="sd-modal" style={{ maxWidth: 420 }}>
            <div className="sd-modal-head">
              <h3><i className="fas fa-shield-alt"></i> Set a New Password</h3>
            </div>
            <div className="sd-modal-body">
              <p style={{ marginBottom: 18 }}>
                Your account is using a temporary password. Please choose a new secure password before continuing.
              </p>
              <form className="sd-modal-form" onSubmit={handleUpdatePassword}>
                <label>New Password</label>
                <input
                  type="password"
                  value={passForm.new}
                  onChange={(e) => setPassForm({ ...passForm, new: e.target.value })}
                  placeholder="Create a new password"
                  required
                />
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={passForm.confirm}
                  onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
                  placeholder="Repeat new password"
                  required
                />
                <button type="submit" className="sd-btn sd-btn-primary" disabled={updatingPass}>
                  {updatingPass ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;
