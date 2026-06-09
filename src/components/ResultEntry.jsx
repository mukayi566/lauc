import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, query, where, getDocs, doc, setDoc,
  updateDoc, serverTimestamp, addDoc, orderBy, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { calculateGrade, getGradePoints } from '../utils/resultUtils';
import { subscribeToExamSubmissions, getExamQuestions } from '../services/examService';

const ResultEntry = ({ lecturerId, course, onBack, showSuccess }) => {
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* ── Student Submissions States ── */
  const [activeSubTab, setActiveSubTab] = useState('direct'); // 'direct' or 'submissions'
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [examQuestions, setExamQuestions] = useState([]);
  const [viewingSubmission, setViewingSubmission] = useState(null);

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

        // 3. Fetch exams for this course to support the "Student Submissions" tab
        const examsQuery = query(
          collection(db, 'courses', course.docId || course.id, 'exams'),
          orderBy('createdAt', 'desc')
        );
        const examsSnap = await getDocs(examsQuery);
        const loadedExams = examsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setExams(loadedExams);
        if (loadedExams.length > 0) setSelectedExamId(loadedExams[0].id);

      } catch (err) {
        console.error("Error fetching results data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [course.code, course.docId, course.id]);

  /* 
     LOGIC: We subscribe to submissions for the selected exam.
     This ensures real-time updates when students submit.
     We also fetch questions once to map student answers to the actual question text.
  */
  useEffect(() => {
    if (!selectedExamId || activeSubTab !== 'submissions') return;

    const courseId = course.docId || course.id;

    // Fetch questions for context in the detailed view
    getExamQuestions(courseId, selectedExamId).then(setExamQuestions);

    // Subscribe to submissions
    const unsub = subscribeToExamSubmissions(
      courseId,
      selectedExamId,
      (data) => setSubmissions(data),
      (err) => console.error("Submissions subscription error:", err)
    );

    return () => unsub();
  }, [selectedExamId, activeSubTab, course.docId, course.id]);

  const selectedExam = useMemo(() =>
    exams.find(e => e.id === selectedExamId),
    [exams, selectedExamId]);

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
      const batch = writeBatch(db);
      let count = 0;

      for (const student of students) {
        const res = results[student.docId];
        if (!res) continue;

        const resultData = {
          studentId: student.docId,
          studentName: student.name,
          studentRegNo: student.studentId || student.id,
          courseId: course.docId || course.id,
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
          semester: course.semester || 'Current'
        };

        if (res.id) {
          batch.update(doc(db, 'results', res.id), resultData);
        } else {
          // Generate a new doc ref for fresh results
          const newDocRef = doc(collection(db, 'results'));
          batch.set(newDocRef, resultData);
        }
        count++;
      }

      if (count > 0) {
        await batch.commit();
      }

      showSuccess(status === 'submitted' ? `Successfully submitted ${count} results for approval!` : 'Draft saved successfully!');
      if (status === 'submitted') onBack();
    } catch (err) {
      console.error("Error saving results:", err);
      alert("Failed to save results. " + (err.message || ''));
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
          {activeSubTab === 'direct' && (
            <label className="sd-btn sd-btn-white" style={{ cursor: 'pointer' }}>
              <i className="fas fa-upload"></i> Bulk Upload CSV
              <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          )}
        </div>
      </div>

      {/* ── SUB-TABS NAVIGATION ── */}
      <div className="sd-tabs" style={{ marginBottom: 24, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 30 }}>
        <button
          onClick={() => setActiveSubTab('direct')}
          style={{
            padding: '12px 4px',
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'direct' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeSubTab === 'direct' ? 'var(--primary-color)' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <i className="fas fa-keyboard" style={{ marginRight: 8 }}></i>
          Direct Score Entry
        </button>
        <button
          onClick={() => setActiveSubTab('submissions')}
          style={{
            padding: '12px 4px',
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'submissions' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeSubTab === 'submissions' ? 'var(--primary-color)' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <i className="fas fa-user-check" style={{ marginRight: 8 }}></i>
          Student Exam Submissions
        </button>
      </div>

      {activeSubTab === 'direct' ? (
        /* ── DIRECT SCORE ENTRY VIEW ── */
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
      ) : (
        /* ── STUDENT EXAM SUBMISSIONS VIEW ── */
        <div className="sd-tab-fade">
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
            {/* Exam Selector List */}
            <div className="sd-card" style={{ height: 'fit-content' }}>
              <div className="sd-card-header" style={{ fontSize: 14, fontWeight: 700 }}>Available Assessments</div>
              <div className="sd-card-body" style={{ padding: 8 }}>
                {exams.length === 0 ? (
                  <p style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No exams found for this course.</p>
                ) : (
                  exams.map(exam => (
                    <button
                      key={exam.id}
                      onClick={() => { setSelectedExamId(exam.id); setViewingSubmission(null); }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: selectedExamId === exam.id ? 'var(--primary-light)' : 'transparent',
                        color: selectedExamId === exam.id ? 'var(--primary-color)' : '#475569',
                        fontWeight: selectedExamId === exam.id ? 700 : 500,
                        cursor: 'pointer',
                        marginBottom: 4,
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontSize: 14 }}>{exam.title}</div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                        <i className="fas fa-tag"></i> {exam.type.toUpperCase()} · {exam.status}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Submissions Table / Detail View */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {!selectedExam ? (
                <div className="sd-card" style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                  <i className="fas fa-mouse-pointer fa-3x" style={{ opacity: 0.2, marginBottom: 16 }}></i>
                  <p>Select an exam from the left to view student submissions.</p>
                </div>
              ) : viewingSubmission ? (
                /* ── DETAILED SUBMISSION VIEW (FETCH ANSWERS) ── */
                <div className="sd-card sd-tab-fade">
                  <div className="sd-card-header" style={{ background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button className="sd-icon-btn-sm" onClick={() => setViewingSubmission(null)}>
                        <i className="fas fa-arrow-left"></i>
                      </button>
                      <div>
                        <div style={{ fontWeight: 700 }}>{viewingSubmission.studentName}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Submission for: {selectedExam.title}</div>
                      </div>
                    </div>
                    <div className="sd-badge badge-green">Score: {viewingSubmission.percentage ?? viewingSubmission.score}%</div>
                  </div>
                  <div className="sd-card-body" style={{ padding: 24 }}>
                    <h4 style={{ marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>Student Answers</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {examQuestions.map((q, idx) => {
                        const answer = viewingSubmission.answers?.[q.id];
                        const breakdown = viewingSubmission.questionBreakdown?.find(b => b.questionId === q.id);
                        const isCorrect = breakdown?.awardedMarks === breakdown?.maxMarks && breakdown?.maxMarks > 0;

                        /* 
                           FLOW: For each question in the exam, we look up the student's answer 
                           from the submission's 'answers' map. We then show the question text,
                           the student's answer, and whether it was correct based on the 'questionBreakdown'.
                        */
                        return (
                          <div key={q.id} style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fafbfc' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                              <span style={{ fontWeight: 700, fontSize: 14 }}>Question {idx + 1}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: isCorrect ? '#10b981' : '#ef4444' }}>
                                {breakdown?.awardedMarks || 0} / {breakdown?.maxMarks || q.marks} Marks
                              </span>
                            </div>
                            <div style={{ fontSize: 15, color: '#1e293b', marginBottom: 12 }}>{q.question}</div>

                            <div style={{ background: 'white', padding: 12, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Student's Answer:</div>
                              <div style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>
                                {Array.isArray(answer) ? answer.join(', ') : (answer || <em style={{ color: '#cbd5e1' }}>No answer provided</em>)}
                              </div>
                            </div>

                            {!isCorrect && q.correctAnswer && (
                              <div style={{ marginTop: 10, fontSize: 13, color: '#059669' }}>
                                <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>
                                Correct Answer: {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── SUBMISSIONS LIST TABLE ── */
                <div className="sd-card">
                  <div className="sd-card-header">
                    <span>Submissions for {selectedExam.title}</span>
                    <span className="sd-badge badge-teal">{submissions.length} Students</span>
                  </div>
                  <div className="sd-table-wrapper">
                    {submissions.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No submissions received yet.</div>
                    ) : (
                      <table className="sd-table">
                        <thead>
                          <tr>
                            <th>Student Name</th>
                            <th>Status</th>
                            <th>Score</th>
                            <th>Submitted</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map(sub => (
                            <tr key={sub.id}>
                              <td className="sd-td-bold">{sub.studentName}</td>
                              <td><span className="sd-badge badge-green">{sub.status}</span></td>
                              <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                                {sub.percentage ?? sub.score}%
                              </td>
                              <td style={{ fontSize: 12, color: '#64748b' }}>
                                {sub.submittedAt?.toDate?.() ? sub.submittedAt.toDate().toLocaleString() : '—'}
                              </td>
                              <td>
                                <button
                                  className="sd-btn sd-btn-white sd-btn-sm"
                                  onClick={() => setViewingSubmission(sub)}
                                >
                                  <i className="fas fa-eye"></i> View Answers
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultEntry;
