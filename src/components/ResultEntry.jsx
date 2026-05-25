import React, { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, doc, setDoc,
  updateDoc, serverTimestamp, addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { calculateGrade, getGradePoints } from '../utils/resultUtils';

const ResultEntry = ({ lecturerId, course, onBack, showSuccess }) => {
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Get all students enrolled in this course
        const studentsSnap = await getDocs(collection(db, 'students'));
        const enrolledStudents = [];

        for (const sDoc of studentsSnap.docs) {
          const sCoursesSnap = await getDocs(collection(db, 'students', sDoc.id, 'courses'));
          const hasCourse = sCoursesSnap.docs.some(d => {
            const cd = d.data();
            const targetCode = (course.code || course.id || '').toUpperCase();
            return (cd.code || cd.id || '').toUpperCase() === targetCode;
          });
          if (hasCourse) {
            enrolledStudents.push({ docId: sDoc.id, ...sDoc.data() });
          }
        }
        setStudents(enrolledStudents);

        // 2. Get existing results for this course
        const resultsQuery = query(
          collection(db, 'results'),
          where('courseCode', '==', course.code)
        );
        const resultsSnap = await getDocs(resultsQuery);
        const resultsMap = {};
        resultsSnap.docs.forEach(d => {
          const data = d.data();
          resultsMap[data.studentId] = { id: d.id, ...data };
        });
        setResults(resultsMap);
      } catch (err) {
        console.error("Error fetching results data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [course.code]);

  const handleScoreChange = (studentDocId, field, value) => {
    const val = value === '' ? '' : Math.min(field === 'caScore' ? 40 : 60, Math.max(0, parseFloat(value) || 0));

    setResults(prev => {
      const current = prev[studentDocId] || {
        studentId: studentDocId,
        caScore: 0,
        examScore: 0,
        status: 'draft'
      };

      const updated = { ...current, [field]: val };

      // Auto-calculate
      updated.total = (parseFloat(updated.caScore) || 0) + (parseFloat(updated.examScore) || 0);
      updated.grade = calculateGrade(updated.total);

      return { ...prev, [studentDocId]: updated };
    });
  };

  const saveResults = async (status = 'draft') => {
    setSubmitting(true);
    try {
      for (const student of students) {
        const res = results[student.docId];
        if (!res) continue;

        const resultData = {
          studentId: student.docId,
          studentName: student.name,
          studentRegNo: student.studentId || student.id,
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          caScore: parseFloat(res.caScore) || 0,
          examScore: parseFloat(res.examScore) || 0,
          total: res.total || 0,
          grade: res.grade || 'F',
          gpa: getGradePoints(res.grade || 'F'),
          status: status,
          submittedBy: lecturerId,
          updatedAt: serverTimestamp(),
          semester: course.semester
        };

        if (res.id) {
          await updateDoc(doc(db, 'results', res.id), resultData);
        } else {
          await addDoc(collection(db, 'results'), resultData);
        }
      }
      showSuccess(status === 'submitted' ? 'Results submitted for approval!' : 'Draft saved successfully!');
      if (status === 'submitted') onBack();
    } catch (err) {
      console.error("Error saving results:", err);
      alert("Failed to save results.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const newResults = { ...results };

      // Assume CSV format: StudentID, CA, Exam
      lines.slice(1).forEach(line => {
        const parts = line.split(',').map(s => s.trim());
        if (parts.length < 3) return;

        const [sid, ca, exam] = parts;
        const searchId = sid.toUpperCase();

        const student = students.find(s =>
          (s.studentId || '').toUpperCase() === searchId ||
          (s.id || '').toUpperCase() === searchId
        );

        if (student) {
          const caVal = parseFloat(ca) || 0;
          const exVal = parseFloat(exam) || 0;
          const total = caVal + exVal;
          const grade = calculateGrade(total);

          newResults[student.docId] = {
            ...(newResults[student.docId] || {}),
            studentId: student.docId,
            caScore: caVal,
            examScore: exVal,
            total,
            grade,
            status: 'draft'
          };
        }
      });
      setResults(newResults);
      showSuccess('CSV data imported!');
    };
    reader.readAsText(file);
  };

  if (loading) return <div className="sd-loading">Loading students...</div>;

  return (
    <div className="sd-tab-fade">
      <div className="sd-page-header">
        <div>
          <button className="sd-link-btn" onClick={onBack} style={{ marginBottom: 10 }}>
            <i className="fas fa-arrow-left"></i> Back to Courses
          </button>
          <h2 className="sd-page-title">Manage Results: {course.code}</h2>
          <p className="sd-page-sub">{course.name} · {students.length} Students</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="sd-btn sd-btn-white" style={{ cursor: 'pointer' }}>
            <i className="fas fa-upload"></i> Bulk Upload CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div className="sd-card">
        <div className="sd-table-wrapper">
          <table className="sd-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Reg No.</th>
                <th>CA (40)</th>
                <th>Exam (60)</th>
                <th>Total (100)</th>
                <th>Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const res = results[student.docId] || { caScore: '', examScore: '', total: 0, grade: '—', status: 'draft' };
                const isLocked = res.status === 'approved' || res.status === 'published';
                // Note: 'submitted' remains editable by staff until approved, or as per institution policy. 
                // If they want 'submitted' to be locked, we add it back. But they said 'ensure editable before'.

                return (
                  <tr key={student.docId}>
                    <td><strong>{student.name}</strong></td>
                    <td><span className="sd-code">{student.studentId || '—'}</span></td>
                    <td>
                      <input
                        type="number"
                        className="sd-input-small"
                        value={res.caScore}
                        onChange={(e) => handleScoreChange(student.docId, 'caScore', e.target.value)}
                        disabled={isLocked}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="sd-input-small"
                        value={res.examScore}
                        onChange={(e) => handleScoreChange(student.docId, 'examScore', e.target.value)}
                        disabled={isLocked}
                      />
                    </td>
                    <td><strong style={{ fontSize: 16 }}>{res.total}</strong></td>
                    <td>
                      <span className={`sd-badge ${res.grade === 'F' ? 'badge-red' : 'badge-green'}`}>
                        {res.grade}
                      </span>
                    </td>
                    <td>
                      <span className={`sd-badge badge-teal`} style={{ opacity: 0.7 }}>
                        {res.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="sd-card-footer" style={{ padding: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="sd-btn sd-btn-white" onClick={() => saveResults('draft')} disabled={submitting}>
            Save as Draft
          </button>
          <button className="sd-btn sd-btn-primary" onClick={() => saveResults('submitted')} disabled={submitting}>
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultEntry;
