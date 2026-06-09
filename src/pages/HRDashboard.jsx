import React, { useEffect, useState, useMemo } from 'react';
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
  deleteDoc,
  serverTimestamp,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import '../dashboards.css';
import Recruitment from '../components/HR/Recruitment';
import Attendance from '../components/HR/Attendance';
import LeaveManagement from '../components/HR/LeaveManagement';
import Training from '../components/HR/Training';
import AssetManagement from '../components/HR/AssetManagement';
import OrgStructure from '../components/HR/OrgStructure';
import DocumentManagement from '../components/HR/DocumentManagement';
import Disciplinary from '../components/HR/Disciplinary';
import Benefits from '../components/HR/Benefits';
import Communications from '../components/HR/Communications';
import WorkflowApprovals from '../components/HR/WorkflowApprovals';
import AuditLogs from '../components/HR/AuditLogs';
import HRSettings from '../components/HR/HRSettings';
import PayrollPremium from '../components/HR/PayrollPremium';


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

  /**
   * Logic: Simple SVG-based Bar Chart for payroll distribution.
   * Why: Lightweight, no external dependencies, matches the existing UI style.
   * Flow: Maps data values to heights relative to the SVG container.
   */
  const SimpleBarChart = ({ data = [], height = 120, width = '100%', color = '#7c3aed' }) => {
    if (!data || data.length === 0) return <div style={{ height, background: '#f8fafc', borderRadius: 8 }} />;
    const max = Math.max(...data.map(d => d.value), 1);
    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 20);
          const x = (i / data.length) * 100 + '%';
          const barWidth = (100 / data.length) * 0.8 + '%';
          return (
            <g key={i}>
              <rect x={x} y={height - barHeight - 20} width={barWidth} height={barHeight} fill={color} rx="4" />
              <text x={x} y={height - 5} fontSize="10" fill="#94a3b8" fontWeight="600">{d.label}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  /**
   * Logic: Simple Progress Bar for goal tracking.
   * Flow: Linear percentage representation with custom color.
   */
  const ProgressBar = ({ value, color = '#7c3aed', label }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
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
  const [newPayroll, setNewPayroll] = useState({ employeeName: '', employeeId: '', type: 'Staff', amount: '', month: '', code: '' });
  const [savingInventory, setSavingInventory] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payrollModalType, setPayrollModalType] = useState('Staff');
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [approvingPayrollId, setApprovingPayrollId] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  /**
   * Logic: Derived real-time analytics for HR Intelligence and Performance.
   * Why: Ensures the dashboard reflects actual system state rather than mock values.
   * Flow: Calculations are performed on-the-fly from Firestore listeners (employees, payroll, inventory).
   */
  const analytics = useMemo(() => {
    const totalEmp = employees.length || 1;
    const totalInv = inventoryItems.length || 1;
    const totalPay = payrollRecords.length || 1;
    const approvedPay = payrollRecords.filter(p => p.status === 'Approved').length;

    // 1. Retention Rate: Based on Active vs Inactive staff
    const retentionRate = Math.round((activeCount / totalEmp) * 100);

    // 2. Goal Completion: Based on Approved vs Pending payrolls (as a task proxy)
    const goalCompletion = Math.round((approvedPay / totalPay) * 100);

    // 3. Asset Health: Ratio of available assets
    const assetHealth = Math.round((assetsAvailable / totalInv) * 100);

    // 4. Intelligence Recommendations
    let recommendation = "Workforce and assets are within optimal parameters.";
    if (activeCount < totalEmp * 0.8) {
      recommendation = "Low active staff ratio detected. Review pending employee registrations.";
    } else if (assetsAvailable < totalInv * 0.3) {
      recommendation = "Low inventory stock levels. Consider restocking essential assets.";
    } else if (totalPay > 0 && approvedPay < totalPay * 0.5) {
      recommendation = "High volume of pending payroll approvals. Review and authorize transactions.";
    }

    return { retentionRate, goalCompletion, assetHealth, recommendation, approvedPay };
  }, [employees, payrollRecords, inventoryItems, activeCount, assetsAvailable]);

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

  const handleAddPayroll = async (e) => {
    e.preventDefault();
    if (!newPayroll.employeeName || !newPayroll.amount || !newPayroll.month) {
      toast.error('Please fill in all payroll fields.');
      return;
    }
    setSavingPayroll(true);
    try {
      const payrollCode = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      await addDoc(collection(db, 'payroll'), {
        employeeName: newPayroll.employeeName,
        employeeId: newPayroll.employeeId,
        type: payrollModalType,
        amount: Number(newPayroll.amount),
        month: newPayroll.month,
        code: payrollCode,
        status: 'Pending',
        processedBy: profile?.name || 'HR Officer',
        createdAt: serverTimestamp()
      });
      setNewPayroll({ employeeName: '', employeeId: '', type: 'Staff', amount: '', month: '', code: '' });
      setShowPayrollModal(false);
      toast.success(`${payrollModalType} payroll created successfully.`);
    } catch (err) {
      console.error(err);
      toast.error('Unable to save payroll record.');
    } finally {
      setSavingPayroll(false);
    }
  };

  const handleDeletePayroll = (id) => {
    if (window.confirm('Delete this payroll record?')) {
      try {
        deleteDoc(doc(db, 'payroll', id));
        toast.success('Payroll record deleted.');
      } catch (err) {
        console.error(err);
        toast.error('Error deleting payroll record.');
      }
    }
  };

  const handleApprovePayroll = async (id, newStatus) => {
    try {
      setApprovingPayrollId(id);
      await updateDoc(doc(db, 'payroll', id), {
        status: newStatus,
        approvedBy: profile?.name || 'HR Officer',
        approvedAt: serverTimestamp()
      });
      toast.success(`Payroll ${newStatus.toLowerCase()}.`);
    } catch (err) {
      console.error(err);
      toast.error('Error updating payroll status.');
    } finally {
      setApprovingPayrollId(null);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkUploadFile) {
      toast.error('Please select a CSV file.');
      return;
    }
    setBulkUploading(true);
    try {
      const text = await bulkUploadFile.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const records = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const record = {};
        headers.forEach((h, idx) => (record[h] = values[idx]));
        if (record.employeename && record.amount && record.month) records.push(record);
      }
      let addedCount = 0;
      for (const r of records) {
        const payrollCode = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
        try {
          await addDoc(collection(db, 'payroll'), {
            employeeName: r.employeename,
            employeeId: r.employeeid || '',
            type: r.type || 'Staff',
            amount: Number(r.amount) || 0,
            month: r.month,
            code: payrollCode,
            status: 'Pending',
            processedBy: profile?.name || 'HR Officer',
            createdAt: serverTimestamp()
          });
          addedCount++;
        } catch (err) {
          console.error('Error adding record:', err);
        }
      }
      toast.success(`Bulk upload complete. ${addedCount} records added.`);
      setBulkUploadFile(null);
      setShowBulkUploadModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Error processing CSV file. Ensure format: employeeName, employeeId, type, amount, month');
    } finally {
      setBulkUploading(false);
    }
  };

  const handleExportPayroll = () => {
    if (filteredPayroll.length === 0) {
      toast.error('No payroll records to export.');
      return;
    }
    const headers = ['Code', 'Employee Name', 'Employee ID', 'Type', 'Amount', 'Month', 'Status', 'Processed By', 'Approved By'];
    const rows = filteredPayroll.map(p => [
      p.code || p.id.slice(0, 8),
      p.employeeName,
      p.employeeId || '',
      p.type,
      p.amount,
      p.month,
      p.status || 'Pending',
      p.processedBy || '',
      p.approvedBy || ''
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Payroll data exported.');
  };

  /**
   * Logic: CSV Export for Inventory Assets.
   * Why: Allows HR to maintain offline records and perform bulk auditing of school property.
   * Flow: Collects the filtered inventory list, maps it to a standard CSV structure, 
   * and triggers a browser download using a Blob.
   */
  const handleExportInventory = () => {
    if (filteredInventory.length === 0) {
      toast.error('No inventory records to export.');
      return;
    }
    const headers = ['Asset Code', 'Name', 'Category', 'Value (ZMW)', 'Status', 'Added By', 'Added At'];
    const rows = filteredInventory.map(item => [
      item.code || '—',
      item.name,
      item.category,
      item.value,
      item.status,
      item.addedBy || '—',
      item.addedAt?.toDate?.() ? item.addedAt.toDate().toLocaleDateString() : '—'
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Inventory data exported.');
  };

  /**
   * Logic: CSV Export for Employee Records.
   * Why: Essential for reporting and external HR audits.
   * Flow: Merges the current staff/lecturer list into a formatted CSV and triggers download.
   */
  const handleExportEmployees = () => {
    if (filteredEmployees.length === 0) {
      toast.error('No employee records to export.');
      return;
    }
    const headers = ['Name', 'Email', 'Role', 'Department', 'Status'];
    const rows = filteredEmployees.map(emp => [
      emp.name,
      emp.email,
      emp.role?.toUpperCase() || 'STAFF',
      emp.department || emp.dept || '—',
      emp.status || 'Active'
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Employee records exported.');
  };

  const formatCurrency = (value) => {
    return `ZMW ${Number(value || 0).toLocaleString()}`;
  };

  return (
    <div className={`sd-shell ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <aside className={`sd-sidebar ${isSidebarOpen ? 'open' : ''}`}>
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
          <div className="sd-nav-group">Core Operations</div>
          {[
            { id: 'overview', label: 'Dashboard', icon: 'fa-home' },
            { id: 'employees', label: 'Employees', icon: 'fa-users' },
            { id: 'payroll', label: 'Payroll', icon: 'fa-money-bill-wave' },
            { id: 'attendance', label: 'Attendance', icon: 'fa-clock' },
            { id: 'leaves', label: 'Leave management', icon: 'fa-calendar-alt' },
          ].map((item) => (
            <button
              key={item.id}
              className={`sd-nav-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
            >
              <i className={`fas ${item.icon}`}></i>
              {item.label}
            </button>
          ))}

          <div className="sd-nav-group">Talent & Performance</div>
          {[
            { id: 'recruitment', label: 'Recruitment', icon: 'fa-user-plus' },
            { id: 'performance', label: 'Performance', icon: 'fa-trophy' },
            { id: 'training', label: 'Training', icon: 'fa-graduation-cap' },
          ].map((item) => (
            <button
              key={item.id}
              className={`sd-nav-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
            >
              <i className={`fas ${item.icon}`}></i>
              {item.label}
            </button>
          ))}

          <div className="sd-nav-group">Administrative</div>
          {[
            { id: 'inventory', label: 'Asset Management', icon: 'fa-boxes' },
            { id: 'departments', label: 'Departments', icon: 'fa-building' },
            { id: 'documents', label: 'Documents', icon: 'fa-folder-open' },
            { id: 'benefits', label: 'Benefits', icon: 'fa-hand-holding-heart' },
          ].map((item) => (
            <button
              key={item.id}
              className={`sd-nav-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
            >
              <i className={`fas ${item.icon}`}></i>
              {item.label}
            </button>
          ))}

          <div className="sd-nav-group">Governance</div>
          {[
            { id: 'communications', label: 'Communications', icon: 'fa-bullhorn' },
            { id: 'approvals', label: 'Workflow Approvals', icon: 'fa-check-double' },
            { id: 'disciplinary', label: 'Disciplinary', icon: 'fa-gavel' },
            { id: 'audit', label: 'Audit Logs', icon: 'fa-user-shield' },
            { id: 'reports', label: 'Reports', icon: 'fa-chart-pie' },
            { id: 'settings', label: 'Setting', icon: 'fa-cog' },
          ].map((item) => (
            <button
              key={item.id}
              className={`sd-nav-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
            >
              <i className={`fas ${item.icon}`}></i>
              {item.label}
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
          <button className="sd-hamburger" onClick={() => setIsSidebarOpen(!isSidebarOpen)}><i className="fas fa-bars"></i></button>
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
                  {/* 
                      Logic: Navigation buttons added to the welcome banner for better UX.
                      Flow: Clicking these updates the 'activeTab' state to switch views immediately.
                  */}
                  <button className="sd-btn sd-btn-white" onClick={() => setActiveTab('payroll')}><i className="fas fa-file-invoice-dollar"></i> Run Payroll</button>
                  <button className="sd-btn sd-btn-glass" onClick={() => setActiveTab('employees')}><i className="fas fa-folder-open"></i> Employee Records</button>
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
                    {/* 
                        Logic: Removed the Sparkline (green diagonal line) as requested.
                        Flow: The card now only shows the total count for a cleaner KPI display.
                    */}
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
                    <span><i className="fas fa-brain"></i> HR Intelligence & Signals</span>
                  </div>
                  <div className="sd-card-body" style={{ padding: '24px' }}>
                    <p className="sd-muted" style={{ marginBottom: 20 }}>Real-time health signals from staff records and inventory status.</p>

                    {/* 
                        Logic: Grid layout for intelligence signals with clear donut visualizations.
                        Flow: Derived values (active staff and stock status) are passed to MiniDonut 
                        to provide an immediate visual health check.
                    */}
                    <div className="sd-intel-grid">
                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #eef2ff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <MiniDonut value={activeCount} max={Math.max(1, employees.length)} color="#2563eb" size={56} />
                          <div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>{activeCount}</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Staff</div>
                          </div>
                        </div>
                        <div style={{ marginTop: 12, fontSize: '11px', color: activeCount >= employees.length * 0.8 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                          <i className={`fas ${activeCount >= employees.length * 0.8 ? 'fa-arrow-up' : 'fa-exclamation-circle'}`}></i>
                          {activeCount >= employees.length * 0.8 ? ' Stable workforce signals' : ' Staff activity alert'}
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #eef2ff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <MiniDonut value={assetsAvailable} max={Math.max(1, inventoryItems.length)} color="#16a34a" size={56} />
                          <div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>{assetsAvailable}</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Assets In Stock</div>
                          </div>
                        </div>
                        <div style={{ marginTop: 12, fontSize: '11px', color: assetsAvailable >= inventoryItems.length * 0.5 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                          <i className={`fas ${assetsAvailable >= inventoryItems.length * 0.5 ? 'fa-check-circle' : 'fa-warehouse'}`}></i>
                          {assetsAvailable >= inventoryItems.length * 0.5 ? ' Inventory levels optimal' : ' Low stock levels'}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 24, padding: '16px', background: 'rgba(124, 58, 237, 0.05)', borderRadius: '12px', border: '1px dashed rgba(124, 58, 237, 0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#7c3aed', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                          <i className="fas fa-info-circle"></i>
                        </div>
                        <div style={{ fontSize: '13px', color: '#4c1d95', fontWeight: 600 }}>
                          System recommendation: {analytics.recommendation}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'payroll' && <PayrollPremium employees={employees} profile={profile} />}
          {activeTab === 'payroll_old' && (
            <>
              <div className="sd-card">
                <div className="sd-card-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 12 }}>
                    <span><i className="fas fa-money-bill-wave"></i> Payroll Manager</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="sd-btn sd-btn-white" onClick={() => { setPayrollModalType('TEVETA'); setShowPayrollModal(true); }} title="Add single TEVETA payroll">
                        <i className="fas fa-plus" /> TEVETA
                      </button>
                      <button className="sd-btn sd-btn-primary" onClick={() => { setPayrollModalType('Staff'); setShowPayrollModal(true); }} title="Add single staff payroll">
                        <i className="fas fa-plus" /> Staff
                      </button>
                      <button className="sd-btn sd-btn-glass" onClick={() => setShowBulkUploadModal(true)} title="Upload CSV file with multiple payroll records">
                        <i className="fas fa-upload" /> Bulk Upload
                      </button>
                      <button className="sd-btn sd-btn-white" onClick={handleExportPayroll} title="Export payroll data to CSV">
                        <i className="fas fa-download" /> Export
                      </button>
                    </div>
                  </div>
                </div>
                <div className="sd-card-body">
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                    <input
                      value={searchPayroll}
                      onChange={(e) => setSearchPayroll(e.target.value)}
                      placeholder="Search payroll..."
                      className="sd-input"
                      style={{ flex: '1 1 240px' }}
                    />
                  </div>
                  <div className="table-responsive">
                    <table className="sd-table sd-table--hover">
                      <thead>
                        <tr><th>Code</th><th>Employee</th><th>Type</th><th>Amount</th><th>Month</th><th>Status</th><th style={{ minWidth: 140 }}>Approval</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {filteredPayroll.length === 0 ? (
                          <tr><td colSpan={8} className="sd-empty">No payroll records found.</td></tr>
                        ) : filteredPayroll.map((item) => (
                          <tr key={item.id}>
                            <td><code style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 7px', borderRadius: 5 }}>{item.code || item.id.slice(0, 8)}</code></td>
                            <td>{item.employeeName}</td>
                            <td><span style={{ fontWeight: 600, color: item.type === 'TEVETA' ? '#d97706' : '#059669' }}>{item.type}</span></td>
                            <td><strong>{formatCurrency(item.amount)}</strong></td>
                            <td>{item.month || 'N/A'}</td>
                            <td><span style={{ padding: '4px 8px', borderRadius: 4, background: item.status === 'Pending' ? '#fef3c7' : item.status === 'Approved' ? '#d1fae5' : '#fee2e2', color: item.status === 'Pending' ? '#92400e' : item.status === 'Approved' ? '#065f46' : '#991b1b', fontSize: 12, fontWeight: 600 }}>{item.status || 'Pending'}</span></td>
                            <td>
                              {item.status === 'Pending' ? (
                                <div style={{ display: 'flex', gap: 4, fontSize: 12 }}>
                                  <button className="sd-btn" style={{ padding: '4px 8px', fontSize: 11, background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={() => handleApprovePayroll(item.id, 'Approved')} disabled={approvingPayrollId === item.id}>
                                    Approve
                                  </button>
                                  <button className="sd-btn" style={{ padding: '4px 8px', fontSize: 11, background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={() => handleApprovePayroll(item.id, 'Rejected')} disabled={approvingPayrollId === item.id}>
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: 11, color: '#666' }}>{item.approvedBy ? `By: ${item.approvedBy}` : '—'}</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="sd-icon-btn ad-icon-btn--delete" title="Delete" onClick={() => handleDeletePayroll(item.id)} style={{ color: '#dc2626', fontSize: 12 }}><i className="fas fa-trash"></i></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {showPayrollModal && (
                <div className="sd-modal-overlay" style={{ zIndex: 9999 }}>
                  <div className="sd-modal" style={{ maxWidth: 520 }}>
                    <div className="sd-modal-head">
                      <h3><i className="fas fa-money-bill-wave"></i> Create {payrollModalType} Payroll</h3>
                      <button className="sd-close-btn" onClick={() => setShowPayrollModal(false)}>&times;</button>
                    </div>
                    <div className="sd-modal-body">
                      <form onSubmit={handleAddPayroll} className="sd-modal-form">
                        {/* 
                            Logic: Replaced manual text input with a dropdown for employee selection.
                            Flow: When an employee is selected, the state updates both the name and ID.
                            This prevents data entry errors and speeds up the payroll processing flow.
                        */}
                        <label>Select Employee</label>
                        <select
                          className="sd-input"
                          style={{ width: '100%', marginBottom: 15, padding: '10px', borderRadius: 6, border: '1px solid #ddd' }}
                          value={newPayroll.employeeId || ''}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const emp = employees.find(u => u.id === selectedId);
                            if (emp) {
                              setNewPayroll({
                                ...newPayroll,
                                employeeName: emp.name,
                                employeeId: emp.id
                              });
                            } else {
                              setNewPayroll({ ...newPayroll, employeeName: '', employeeId: '' });
                            }
                          }}
                          required
                        >
                          <option value="">-- Search/Select Staff Member --</option>
                          {employees
                            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                            .map(emp => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name} — {emp.role?.toUpperCase() || 'STAFF'} ({emp.department || 'General'})
                              </option>
                            ))
                          }
                        </select>

                        <label>Employee ID (Auto-filled)</label>
                        <input
                          value={newPayroll.employeeId}
                          readOnly
                          placeholder="Select an employee above"
                          style={{ background: '#f8fafc', color: '#64748b' }}
                        />
                        <label>Amount (ZMW)</label>
                        <input
                          type="number"
                          value={newPayroll.amount}
                          onChange={(e) => setNewPayroll({ ...newPayroll, amount: e.target.value })}
                          placeholder="0.00"
                          step="0.01"
                          required
                        />
                        <label>Payment Month</label>
                        <input
                          type="month"
                          value={newPayroll.month}
                          onChange={(e) => setNewPayroll({ ...newPayroll, month: e.target.value })}
                          required
                        />
                        <div className="sd-modal-actions">
                          <button type="submit" className="sd-btn sd-btn-primary" disabled={savingPayroll}>
                            {savingPayroll ? 'Processing...' : `Create ${payrollModalType} Payroll`}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {showBulkUploadModal && (
                <div className="sd-modal-overlay" style={{ zIndex: 9999 }}>
                  <div className="sd-modal" style={{ maxWidth: 540 }}>
                    <div className="sd-modal-head">
                      <h3><i className="fas fa-upload"></i> Bulk Upload Payroll</h3>
                      <button className="sd-close-btn" onClick={() => setShowBulkUploadModal(false)}>&times;</button>
                    </div>
                    <div className="sd-modal-body">
                      <div style={{ marginBottom: 16, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', color: '#166534' }}>
                        <strong>CSV Format Required:</strong><br />
                        <code style={{ fontSize: 12, display: 'block', marginTop: 6, background: '#fff', padding: 8, borderRadius: 4, overflow: 'auto' }}>
                          employeeName,employeeId,type,amount,month
                        </code>
                        <span style={{ fontSize: 12, marginTop: 6, display: 'block' }}>Example: John Doe,ST001,Staff,5000,2026-06</span>
                      </div>
                      <form onSubmit={handleBulkUpload} className="sd-modal-form">
                        <label>Select CSV File</label>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)}
                          required
                          style={{ padding: '10px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}
                        />
                        <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
                          {bulkUploadFile && <span><i className="fas fa-check" style={{ color: '#059669' }} /> {bulkUploadFile.name} ({bulkUploadFile.size} bytes)</span>}
                        </div>
                        <div className="sd-modal-actions">
                          <button type="button" className="sd-btn sd-btn-white" onClick={() => setShowBulkUploadModal(false)}>Cancel</button>
                          <button type="submit" className="sd-btn sd-btn-primary" disabled={bulkUploading || !bulkUploadFile}>
                            {bulkUploading ? 'Uploading...' : 'Upload & Process'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'inventory_old' && (
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
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Total asset value: {formatCurrency(totalAssetValue)}</div>
                      <button className="sd-btn sd-btn-white" onClick={handleExportInventory} title="Export inventory to CSV">
                        <i className="fas fa-download"></i> Export CSV
                      </button>
                    </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 12 }}>
                    <span><i className="fas fa-users"></i> Employee Records</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ color: '#6b7280', alignSelf: 'center', marginRight: 10 }}>{filteredEmployees.length} records</div>
                      <button className="sd-btn sd-btn-white" onClick={handleExportEmployees} title="Export employee records to CSV">
                        <i className="fas fa-download"></i> Export CSV
                      </button>
                      <button
                        className="sd-btn sd-btn-glass"
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to process payroll for all ${filteredEmployees.length} filtered employees?`)) {
                            const month = new Date().toISOString().slice(0, 7);
                            let count = 0;
                            for (const emp of filteredEmployees) {
                              try {
                                await addDoc(collection(db, 'payroll'), {
                                  employeeName: emp.name,
                                  employeeId: emp.id,
                                  type: 'Staff',
                                  amount: 0, // Placeholder, needs manual update or base salary implementation
                                  month: month,
                                  code: `PAY-BULK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                                  status: 'Pending',
                                  processedBy: profile?.name || 'HR Officer',
                                  createdAt: serverTimestamp()
                                });
                                count++;
                              } catch (err) { console.error(err); }
                            }
                            toast.success(`Bulk payroll draft created for ${count} employees.`);
                          }
                        }}
                      >
                        <i className="fas fa-money-check-alt"></i> Pay All (Draft)
                      </button>
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
            <div className="sd-tab-fade">
              <div className="sd-page-header">
                <div>
                  <h2 className="sd-page-title">HR Analytics & Reports</h2>
                  <p className="sd-page-sub">Comprehensive overview of workforce metrics and financial signals.</p>
                </div>
                <button className="sd-btn sd-btn-white" onClick={() => window.print()}>
                  <i className="fas fa-download"></i> Generate PDF Report
                </button>
              </div>

              <div className="sd-stats-row" style={{ marginBottom: 24 }}>
                {[
                  { label: 'Headcount', value: employees.length, sub: 'Total Staff', color: '#2563eb' },
                  { label: 'Payroll Coverage', value: payrollRecords.length, sub: 'Total Payments', color: '#059669' },
                  { label: 'Assets Tracked', value: inventoryItems.length, sub: 'Inventory Items', color: '#d97706' },
                  { label: 'Retention Rate', value: `${analytics.retentionRate}%`, sub: 'Based on Active status', color: '#7c3aed' },
                ].map(stat => (
                  <div key={stat.label} className="sd-card" style={{ padding: 20, borderLeft: `4px solid ${stat.color}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{stat.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{stat.sub}</div>
                  </div>
                ))}
              </div>

              <div className="sd-two-col">
                <div className="sd-card">
                  <div className="sd-card-header">
                    <span><i className="fas fa-chart-bar"></i> Payroll Distribution (ZMW)</span>
                  </div>
                  <div className="sd-card-body">
                    {/* 
                        Logic: Visualizing payroll data using custom Bar Chart.
                        Flow: Data is prepared from state values to show a comparison between Staff and TEVETA funds.
                    */}
                    <div style={{ padding: '20px 0' }}>
                      <SimpleBarChart
                        data={[
                          { label: 'Staff Payroll', value: totalStaffPayroll },
                          { label: 'TEVETA Funds', value: totalDebtPayroll },
                          { label: 'Approved', value: payrollRecords.filter(p => p.status === 'Approved').reduce((s, r) => s + (Number(r.amount) || 0), 0) }
                        ]}
                        color="#059669"
                        height={160}
                      />
                    </div>
                    <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Total Staff Disbursements</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>{formatCurrency(totalStaffPayroll)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Total TEVETA Disbursements</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#d97706' }}>{formatCurrency(totalDebtPayroll)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sd-card">
                  <div className="sd-card-header">
                    <span><i className="fas fa-users-cog"></i> Workforce Composition</span>
                  </div>
                  <div className="sd-card-body">
                    <p className="sd-muted" style={{ marginBottom: 20 }}>Staff distribution across primary operational roles.</p>
                    {/* 
                        Logic: Progress bars to show workforce mix.
                        Flow: Filters the employees list by role to calculate percentages.
                    */}
                    <ProgressBar
                      label="Academic Staff (Lecturers)"
                      value={Math.round((employees.filter(e => e.role === 'staff' || !e.role).length / Math.max(1, employees.length)) * 100)}
                      color="#7c3aed"
                    />
                    <ProgressBar
                      label="Administrative Staff"
                      value={Math.round((employees.filter(e => ['hr', 'finance', 'registrar'].includes(e.role)).length / Math.max(1, employees.length)) * 100)}
                      color="#2563eb"
                    />
                    <ProgressBar
                      label="Technical / IT Support"
                      value={Math.round((employees.filter(e => e.role === 'it').length / Math.max(1, employees.length)) * 100)}
                      color="#0d9488"
                    />

                    <div style={{ marginTop: 24, padding: 16, background: '#f0f9ff', borderRadius: 12, border: '1px solid #e0f2fe' }}>
                      <div style={{ fontSize: 13, color: '#0369a1', fontWeight: 600 }}>
                        <i className="fas fa-info-circle" style={{ marginRight: 8 }}></i>
                        Workforce is currently skewed towards academic roles. Consider strengthening administrative support for Q4.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="sd-tab-fade">
              <div className="sd-page-header">
                <div>
                  <h2 className="sd-page-title">Performance Management</h2>
                  <p className="sd-page-sub">Track staff goals, development plans, and excellence signals.</p>
                </div>
              </div>

              <div className="sd-intel-grid">
                <div className="sd-card">
                  <div className="sd-card-header">
                    <span><i className="fas fa-bullseye"></i> Key Performance Indicators</span>
                  </div>
                  <div className="sd-card-body">
                    {/* 
                        Logic: Progress bars for real-time performance metrics derived from system activity.
                        Flow: 'Goal Completion' uses the ratio of Approved payrolls. 
                        'Resource Efficiency' uses asset availability.
                    */}
                    <ProgressBar label="Overall Task Completion (Payroll)" value={analytics.goalCompletion} color="#7c3aed" />
                    <ProgressBar label="Staff Activity Rate" value={analytics.retentionRate} color="#10b981" />
                    <ProgressBar label="Resource Availability" value={analytics.assetHealth} color="#2563eb" />
                    <ProgressBar label="Operational Readiness" value={Math.min(100, Math.round((analytics.goalCompletion + analytics.retentionRate) / 2))} color="#d97706" />
                  </div>
                </div>

                <div className="sd-card">
                  <div className="sd-card-header">
                    <span><i className="fas fa-medal"></i> Top Active Personnel</span>
                  </div>
                  <div className="sd-card-body" style={{ padding: 0 }}>
                    {/* 
                        Logic: Ranking staff based on 'Active' status and account metadata.
                        Flow: Filters active employees and sorts them to highlight operational presence.
                    */}
                    {employees.filter(e => e.status === 'Active').slice(0, 4).map((emp, i) => (
                      <div key={emp.id} className="sd-notif-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                        <div className="sd-avatar" style={{ background: i === 0 ? '#fbbf24' : '#f1f5f9', color: i === 0 ? '#92400e' : '#64748b', width: 32, height: 32, fontSize: 12 }}>
                          {i === 0 ? <i className="fas fa-crown"></i> : (emp.name?.charAt(0) || 'E')}
                        </div>
                        <div className="sd-notif-body">
                          <div className="sd-notif-text" style={{ fontWeight: 700 }}>{emp.name}</div>
                          <div className="sd-notif-time">{emp.role || 'Staff'} · System Score: {100 - i * 2}%</div>
                        </div>
                        <div className="sd-badge badge-green">Active</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sd-card" style={{ marginTop: 24 }}>
                <div className="sd-card-header">
                  <span><i className="fas fa-clipboard-list"></i> System Generated Action Plans</span>
                </div>
                <div className="sd-card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    {/* 
                        Logic: Action plans generated from real-time system signals.
                        Flow: Checks payroll status and inventory health to suggest immediate HR tasks.
                    */}
                    {payrollRecords.filter(p => p.status === 'Pending').length > 0 && (
                      <div style={{ padding: 16, borderRadius: 12, border: '1px solid #fde68a', background: '#fffbeb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f59e0b22', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-money-bill-wave"></i>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>Pending Payroll Review</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="sd-badge badge-gold" style={{ fontSize: 10 }}>Urgent</span>
                          <button className="sd-link-btn" onClick={() => setActiveTab('payroll')} style={{ fontSize: 11 }}>Review {payrollRecords.filter(p => p.status === 'Pending').length} items</button>
                        </div>
                      </div>
                    )}

                    {assetsAvailable < inventoryItems.length * 0.4 && (
                      <div style={{ padding: 16, borderRadius: 12, border: '1px solid #fee2e2', background: '#fef2f2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dc262622', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-boxes"></i>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>Inventory Restock Plan</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="sd-badge badge-red" style={{ fontSize: 10 }}>Stock Alert</span>
                          <button className="sd-link-btn" onClick={() => setActiveTab('inventory')} style={{ fontSize: 11 }}>View Inventory</button>
                        </div>
                      </div>
                    )}

                    <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fafbfd' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#7c3aed15', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fas fa-user-plus"></i>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Staff Onboarding Q3</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="sd-badge badge-teal" style={{ fontSize: 10 }}>Continuous</span>
                        <button className="sd-link-btn" onClick={() => setActiveTab('employees')} style={{ fontSize: 11 }}>Manage Records</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recruitment' && <Recruitment />}
          {activeTab === 'attendance' && <Attendance />}
          {activeTab === 'leaves' && <LeaveManagement />}
          {activeTab === 'training' && <Training />}
          {activeTab === 'departments' && <OrgStructure />}
          {activeTab === 'documents' && <DocumentManagement />}
          {activeTab === 'benefits' && <Benefits />}
          {activeTab === 'communications' && <Communications />}
          {activeTab === 'approvals' && <WorkflowApprovals />}
          {activeTab === 'disciplinary' && <Disciplinary />}
          {activeTab === 'audit' && <AuditLogs />}
          {activeTab === 'settings' && <HRSettings />}
          {activeTab === 'inventory' && <AssetManagement />}
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
