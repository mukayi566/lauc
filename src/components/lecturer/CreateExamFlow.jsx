import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import {
    collection, query, where, getDocs, addDoc, doc, updateDoc,
    serverTimestamp, onSnapshot, getDoc, orderBy
} from 'firebase/firestore';
import { createExam, updateExam, addQuestion, getExamQuestions, publishExam } from '../services/examService';
import '../dashboards.css';

const STEPS = [
    { id: 1, label: 'Details', icon: 'fa-info-circle' },
    { id: 2, label: 'Time & Access', icon: 'fa-clock' },
    { id: 3, label: 'Security', icon: 'fa-shield-alt' },
    { id: 4, label: 'Questions', icon: 'fa-list-ol' },
    { id: 5, label: 'Preview', icon: 'fa-eye' },
    { id: 6, label: 'Publish', icon: 'fa-paper-plane' }
];

const QUESTION_TYPES = [
    { value: 'multiple-choice', label: 'Multiple Choice (MCQ)' },
    { value: 'checkbox', label: 'Multi-Select' },
    { value: 'true-false', label: 'True / False' },
    { value: 'short-answer', label: 'Short Answer' },
    { value: 'essay', label: 'Essay / Long Answer' },
    { value: 'matching', label: 'Matching' },
    { value: 'ordering', label: 'Ordering / Sequence' },
    { value: 'fill-blank', label: 'Fill in the Blank' },
];

const CreateExamPage = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState([]);
    const [examId, setExamId] = useState(null);
    const [isQuestionModalOpen, setQuestionModalOpen] = useState(false);
    const [isBankModalOpen, setBankModalOpen] = useState(false);
    const [bankQuestions, setBankQuestions] = useState([]);

    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const uid = currentUser?.uid;

    // Form State
    const [form, setForm] = useState({
        title: '',
        courseId: '',
        type: 'Continuous Assessment Test (CAT)',
        totalMarks: 100,
        passMark: 50,
        weighting: 30,
        instructions: '',

        // Step 2: Time & Access
        startDate: '',
        endDate: '',
        duration: 60,
        attempts: 1,

        // Step 3: Security
        shuffleQuestions: true,
        shuffleAnswers: true,
        oneAtATime: false,
        preventBack: false,

        // Grading
        autoGrade: true,
        showResults: 'immediately'
    });

    const [questions, setQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState({
        type: 'multiple-choice',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        marks: 1,
        prompt: ''
    });

    useEffect(() => {
        if (!uid) return;
        const fetchCourses = async () => {
            const q = query(collection(db, 'courses'), where('lecturerId', '==', uid));
            const snap = await getDocs(q);
            setCourses(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
        };
        fetchCourses();
    }, [uid]);

    // Real-time listener for questions once examId is set
    useEffect(() => {
        if (!examId || !form.courseId) return;
        const unsub = onSnapshot(
            query(collection(db, 'courses', form.courseId, 'exams', examId, 'questions'), orderBy('createdAt', 'asc')),
            (snap) => {
                setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        );
        return unsub;
    }, [examId, form.courseId]);

    const handleNext = async () => {
        setLoading(true);
        try {
            if (currentStep === 1) {
                if (!examId) {
                    const course = courses.find(c => c.docId === form.courseId);
                    const res = await createExam({
                        course: course,
                        lecturerId: uid,
                        data: { ...form, durationMinutes: form.duration }
                    });
                    setExamId(res.id);
                } else {
                    await updateExam(form.courseId, examId, {
                        title: form.title,
                        type: form.type,
                        description: form.instructions,
                        totalMarks: form.totalMarks,
                        passMark: form.passMark,
                        weighting: form.weighting
                    });
                }
            } else if (currentStep === 2 || currentStep === 3) {
                await updateExam(form.courseId, examId, {
                    startDate: form.startDate,
                    endDate: form.endDate,
                    durationMinutes: form.duration,
                    attempts: form.attempts,
                    shuffleQuestions: form.shuffleQuestions,
                    shuffleAnswers: form.shuffleAnswers,
                    oneAtATime: form.oneAtATime,
                    preventBack: form.preventBack
                });
            } else if (currentStep === 6) {
                await publishExam(form.courseId, examId);
                navigate('/staff-dashboard');
                return;
            }

            if (currentStep < 6) setCurrentStep(currentStep + 1);
        } catch (err) {
            console.error(err);
            alert("Failed to save progress.");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
        else navigate('/staff-dashboard');
    };

    const handleAddQuestion = async () => {
        if (!examId) return;
        setLoading(true);
        try {
            await addQuestion(form.courseId, examId, {
                ...newQuestion,
                options: newQuestion.options.filter(o => o.trim() !== '')
            });
            setQuestionModalOpen(false);
            setNewQuestion({
                type: 'multiple-choice',
                question: '',
                options: ['', '', '', ''],
                correctAnswer: '',
                marks: 1,
                prompt: ''
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openBank = async () => {
        setLoading(true);
        try {
            // Fetch all questions from all other exams of this course to act as a bank
            const q = query(collection(db, 'courses', form.courseId, 'exams'));
            const examSnap = await getDocs(q);
            let allQ = [];
            for (const eDoc of examSnap.docs) {
                if (eDoc.id === examId) continue;
                const qSnap = await getDocs(collection(db, 'courses', form.courseId, 'exams', eDoc.id, 'questions'));
                allQ = [...allQ, ...qSnap.docs.map(d => ({ ...d.data(), id: d.id, fromExam: eDoc.data().title }))];
            }
            setBankQuestions(allQ);
            setBankModalOpen(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const importFromBank = async (bankQ) => {
        setLoading(true);
        try {
            await addQuestion(form.courseId, examId, {
                question: bankQ.question,
                type: bankQ.type,
                options: bankQ.options || [],
                correctAnswer: bankQ.correctAnswer,
                marks: bankQ.marks,
                prompt: bankQ.prompt || ''
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderStepIndicator = () => (
        <div className="cep-stepper">
            {STEPS.map((step, idx) => (
                <React.Fragment key={step.id}>
                    <div className={`cep-step ${currentStep >= step.id ? 'active' : ''}`} onClick={() => examId && setCurrentStep(step.id)} style={{ cursor: examId ? 'pointer' : 'default' }}>
                        <div className="cep-step-num">{step.id}</div>
                        <div className="cep-step-label">{step.label}</div>
                    </div>
                    {idx < STEPS.length - 1 && <div className={`cep-step-line ${currentStep > step.id ? 'active' : ''}`} />}
                </React.Fragment>
            ))}
        </div>
    );

    return (
        <div className="cep-container staff-theme">
            <header className="cep-header">
                <div className="cep-header-left">
                    <h1>Create exam / quiz</h1>
                    <p>Eden University · Examination Office</p>
                </div>
                <div className="cep-header-right">
                    <span className="cep-badge-draft">Draft</span>
                </div>
            </header>

            {renderStepIndicator()}

            <div className="cep-form-container">
                {currentStep === 1 && (
                    <div className="cep-step-content animate-fade">
                        <h2 className="cep-section-title">Basic details</h2>

                        <div className="cep-form-group">
                            <label>Assessment title</label>
                            <input
                                type="text"
                                placeholder="e.g. Artificial Intelligence CAT 2"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                            />
                        </div>

                        <div className="cep-form-row">
                            <div className="cep-form-group">
                                <label>Course</label>
                                <select
                                    value={form.courseId}
                                    onChange={e => setForm({ ...form, courseId: e.target.value })}
                                >
                                    <option value="">Select a course</option>
                                    {courses.map(c => (
                                        <option key={c.docId} value={c.docId}>{c.code} — {c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="cep-form-group">
                                <label>Assessment type</label>
                                <select
                                    value={form.type}
                                    onChange={e => setForm({ ...form, type: e.target.value })}
                                >
                                    <option>Continuous Assessment Test (CAT)</option>
                                    <option>Final Examination</option>
                                    <option>Quiz</option>
                                    <option>Assignment</option>
                                </select>
                            </div>
                        </div>

                        <div className="cep-form-row">
                            <div className="cep-form-group">
                                <label>Total marks</label>
                                <input
                                    type="number"
                                    value={form.totalMarks}
                                    onChange={e => setForm({ ...form, totalMarks: e.target.value })}
                                />
                            </div>
                            <div className="cep-form-group">
                                <label>Pass mark (%)</label>
                                <input
                                    type="number"
                                    value={form.passMark}
                                    onChange={e => setForm({ ...form, passMark: e.target.value })}
                                />
                            </div>
                            <div className="cep-form-group">
                                <label>Weighting (%)</label>
                                <input
                                    type="number"
                                    value={form.weighting}
                                    onChange={e => setForm({ ...form, weighting: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="cep-form-group">
                            <label>Instructions for students</label>
                            <textarea
                                placeholder="e.g. Answer all questions. No electronic devices are permitted..."
                                value={form.instructions}
                                onChange={e => setForm({ ...form, instructions: e.target.value })}
                                style={{ height: '140px' }}
                            />
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="cep-step-content animate-fade">
                        <h2 className="cep-section-title">Time & Access</h2>
                        <div className="cep-form-row">
                            <div className="cep-form-group">
                                <label>Start date & time</label>
                                <input type="datetime-local" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                            </div>
                            <div className="cep-form-group">
                                <label>End date & time</label>
                                <input type="datetime-local" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                            </div>
                        </div>
                        <div className="cep-form-row">
                            <div className="cep-form-group">
                                <label>Duration (minutes)</label>
                                <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
                            </div>
                            <div className="cep-form-group">
                                <label>Number of attempts allowed</label>
                                <select value={form.attempts} onChange={e => setForm({ ...form, attempts: e.target.value })}>
                                    <option value="1">1 Attempt</option>
                                    <option value="2">2 Attempts</option>
                                    <option value="999">Unlimited</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="cep-step-content animate-fade">
                        <h2 className="cep-section-title">Security Settings</h2>
                        <div className="cep-security-grid">
                            <div className="cep-security-card">
                                <div className="cep-sec-icon"><i className="fas fa-random"></i></div>
                                <div className="cep-sec-info">
                                    <h4>Shuffle questions</h4>
                                    <p>Randomize order for students.</p>
                                </div>
                                <input type="checkbox" checked={form.shuffleQuestions} onChange={e => setForm({ ...form, shuffleQuestions: e.target.checked })} className="cep-toggle" />
                            </div>
                            <div className="cep-security-card">
                                <div className="cep-sec-icon"><i className="fas fa-bars"></i></div>
                                <div className="cep-sec-info">
                                    <h4>Shuffle answers</h4>
                                    <p>Randomize MCQ options.</p>
                                </div>
                                <input type="checkbox" checked={form.shuffleAnswers} onChange={e => setForm({ ...form, shuffleAnswers: e.target.checked })} className="cep-toggle" />
                            </div>
                            <div className="cep-security-card">
                                <div className="cep-sec-icon"><i className="fas fa-file-alt"></i></div>
                                <div className="cep-sec-info">
                                    <h4>One at a time</h4>
                                    <p>One question per page.</p>
                                </div>
                                <input type="checkbox" checked={form.oneAtATime} onChange={e => setForm({ ...form, oneAtATime: e.target.checked })} className="cep-toggle" />
                            </div>
                            <div className="cep-security-card">
                                <div className="cep-sec-icon"><i className="fas fa-arrow-left"></i></div>
                                <div className="cep-sec-info">
                                    <h4>Prevent back</h4>
                                    <p>Disable previous access.</p>
                                </div>
                                <input type="checkbox" checked={form.preventBack} onChange={e => setForm({ ...form, preventBack: e.target.checked })} className="cep-toggle" />
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="cep-step-content animate-fade">
                        <div className="cep-questions-header">
                            <h2 className="cep-section-title">Questions ({questions.length})</h2>
                            <div className="cep-question-actions">
                                <button className="sd-btn sd-btn-white" onClick={openBank}><i className="fas fa-university"></i> Bank</button>
                                <button className="sd-btn sd-btn-primary" onClick={() => setQuestionModalOpen(true)}><i className="fas fa-plus"></i> Add</button>
                            </div>
                        </div>

                        <div className="cep-questions-list">
                            {questions.length === 0 ? (
                                <div className="cep-empty-state">
                                    <i className="fas fa-tasks"></i>
                                    <p>Start building your exam by adding questions.</p>
                                </div>
                            ) : (
                                questions.map((q, i) => (
                                    <div key={q.id} className="cep-question-item">
                                        <div className="cep-q-num">Q{i + 1}</div>
                                        <div className="cep-q-body">
                                            <div className="cep-q-text">{q.question}</div>
                                            <div className="cep-q-meta">
                                                <span className="cep-q-type">{q.type}</span>
                                                <span className="cep-q-marks">{q.marks} marks</span>
                                            </div>
                                        </div>
                                        <button className="cep-q-btn red"><i className="fas fa-trash"></i></button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {currentStep === 5 && (
                    <div className="cep-step-content animate-fade">
                        <h2 className="cep-section-title">Student View Preview</h2>
                        <div className="cep-preview-frame">
                            <div className="cep-preview-header">
                                <h3>{form.title}</h3>
                                <div className="cep-timer">60:00</div>
                            </div>
                            <div className="cep-preview-content">
                                {questions.length > 0 ? (
                                    <div className="cep-p-q">
                                        <p className="cep-p-q-text">{questions[0].question}</p>
                                        <div className="cep-p-options">
                                            {(questions[0].options || []).map((o, i) => (
                                                <div key={i} className="cep-p-opt"><input type="radio" disabled /> {o}</div>
                                            ))}
                                        </div>
                                    </div>
                                ) : <p>Add questions to see a preview.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 6 && (
                    <div className="cep-step-content animate-fade">
                        <div className="cep-publish-center">
                            <div className="cep-publish-icon"><i className="fas fa-check-circle"></i></div>
                            <h2 className="cep-section-title">Ready to Publish</h2>
                            <p>Everything looks great! You've set up <strong>{questions.length}</strong> questions.</p>
                            <div className="cep-summary-card">
                                <div className="cep-summary-item"><span>Start:</span> <span>{form.startDate ? new Date(form.startDate).toLocaleString() : '—'}</span></div>
                                <div className="cep-summary-item"><span>End:</span> <span>{form.endDate ? new Date(form.endDate).toLocaleString() : '—'}</span></div>
                                <div className="cep-summary-item"><span>Status:</span> <span className="cep-badge-draft">Draft</span></div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="cep-footer">
                    <button className="sd-btn sd-btn-white" onClick={handleBack}>
                        <i className={`fas ${currentStep === 1 ? 'fa-times' : 'fa-arrow-left'}`}></i> {currentStep === 1 ? 'Discard' : 'Back'}
                    </button>
                    <button className="sd-btn sd-btn-primary" onClick={handleNext} disabled={loading || (currentStep === 4 && questions.length === 0)}>
                        {loading ? <i className="fas fa-circle-notch fa-spin"></i> : (
                            <>
                                {currentStep === 6 ? 'Publish Assessment' : 'Continue'} <i className={`fas ${currentStep === 6 ? 'fa-paper-plane' : 'fa-arrow-right'}`}></i>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* QUESTION MODAL */}
            {isQuestionModalOpen && (
                <div className="cep-modal-overlay">
                    <div className="cep-modal">
                        <div className="cep-modal-header">
                            <h3>Add New Question</h3>
                            <button onClick={() => setQuestionModalOpen(false)}>&times;</button>
                        </div>
                        <div className="cep-modal-body">
                            <div className="cep-form-group">
                                <label>Question Type</label>
                                <select value={newQuestion.type} onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value })}>
                                    {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="cep-form-group">
                                <label>Question Prompt</label>
                                <textarea value={newQuestion.question} onChange={e => setNewQuestion({ ...newQuestion, question: e.target.value })} placeholder="What is the capital of..." />
                            </div>
                            {['multiple-choice', 'checkbox'].includes(newQuestion.type) && (
                                <div className="cep-options-list">
                                    {newQuestion.options.map((opt, i) => (
                                        <div key={i} className="cep-opt-input">
                                            <input type="text" value={opt} onChange={e => {
                                                const n = [...newQuestion.options];
                                                n[i] = e.target.value;
                                                setNewQuestion({ ...newQuestion, options: n });
                                            }} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="cep-form-group">
                                <label>Correct Answer</label>
                                <input type="text" value={newQuestion.correctAnswer} onChange={e => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })} placeholder="Value or Option index" />
                            </div>
                            <div className="cep-form-group">
                                <label>Marks</label>
                                <input type="number" value={newQuestion.marks} onChange={e => setNewQuestion({ ...newQuestion, marks: e.target.value })} />
                            </div>
                        </div>
                        <div className="cep-modal-footer">
                            <button className="sd-btn sd-btn-white" onClick={() => setQuestionModalOpen(false)}>Cancel</button>
                            <button className="sd-btn sd-btn-primary" onClick={handleAddQuestion}>Add Question</button>
                        </div>
                    </div>
                </div>
            )}

            {/* QUESTION BANK MODAL */}
            {isBankModalOpen && (
                <div className="cep-modal-overlay">
                    <div className="cep-modal" style={{ maxWidth: '800px' }}>
                        <div className="cep-modal-header">
                            <h3>Course Question Bank</h3>
                            <button onClick={() => setBankModalOpen(false)}>&times;</button>
                        </div>
                        <div className="cep-modal-body">
                            <p style={{ color: '#94a3b8', marginBottom: 20 }}>Select questions from previous assessments.</p>
                            <div className="cep-bank-list">
                                {bankQuestions.length === 0 ? <p className="cep-empty-state">No reusable questions found.</p> : bankQuestions.map(bq => (
                                    <div key={bq.id} className="cep-bank-item">
                                        <div className="cep-bank-item-info">
                                            <strong>{bq.question}</strong>
                                            <span>From: {bq.fromExam}</span>
                                        </div>
                                        <button className="sd-btn sd-btn-ghost" onClick={() => importFromBank(bq)}>Import</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .cep-container { 
          padding: 40px 20px; 
          max-width: 1000px; 
          margin: 0 auto; 
          color: #fff; 
          font-family: 'Inter', 'Outfit', sans-serif; 
          min-height: 100vh; 
          background: #0f172a; 
        }
        .cep-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 30px; 
          gap: 15px; 
        }
        .cep-header h1 { 
          font-size: 28px; 
          margin: 0; 
          font-weight: 800; 
          color: #f8fafc; 
        }
        .cep-header p { 
          color: #94a3b8; 
          margin: 4px 0 0 0; 
          font-size: 13px; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
        }
        .cep-badge-draft { 
          background: rgba(16, 185, 129, 0.1); 
          color: #10b981; 
          padding: 6px 14px; 
          border-radius: 20px; 
          font-size: 12px; 
          font-weight: 700; 
          border: 1px solid rgba(16, 185, 129, 0.15); 
        }
        .cep-stepper { 
          display: flex; 
          align-items: center; 
          margin-bottom: 40px; 
          padding: 0; 
          overflow-x: auto; 
          padding-bottom: 10px; 
          scrollbar-width: none; 
        }
        .cep-stepper::-webkit-scrollbar { display: none; }
        .cep-step { 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          gap: 10px; 
          position: relative; 
          z-index: 1; 
          min-width: 80px; 
        }
        .cep-step-num { 
          width: 34px; 
          height: 34px; 
          border-radius: 50%; 
          background: #1e293b; 
          border: 2px solid #334155; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: 700; 
          color: #64748b; 
          transition: all 0.3s; 
          font-size: 13px; 
        }
        .cep-step.active .cep-step-num { 
          background: var(--primary-color, #7c3aed); 
          border-color: var(--primary-color, #7c3aed); 
          color: #fff; 
          box-shadow: 0 0 15px var(--primary-light, rgba(124,58,237,0.3)); 
        }
        .cep-step-label { 
          font-size: 11px; 
          color: #64748b; 
          font-weight: 600; 
          white-space: nowrap; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
        }
        .cep-step.active .cep-step-label { color: #f8fafc; }
        .cep-step-line { 
          flex: 1; 
          height: 2px; 
          background: #1e293b; 
          margin: 0 5px; 
          margin-top: -24px; 
          min-width: 20px; 
        }
        .cep-step-line.active { background: var(--primary-color, #7c3aed); }
        .cep-form-container { 
          background: #1e293b; 
          border-radius: 20px; 
          padding: 30px; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
          border: 1px solid rgba(255,255,255,0.05); 
        }
        .cep-section-title { font-size: 20px; margin-bottom: 24px; font-weight: 700; color: #f8fafc; }
        .cep-form-group { margin-bottom: 20px; }
        .cep-form-group label { display: block; color: #94a3b8; font-size: 12px; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .cep-form-group input, .cep-form-group select, .cep-form-group textarea { 
          width: 100%; 
          background: #0f172a; 
          border: 1px solid #334155; 
          border-radius: 10px; 
          padding: 12px 16px; 
          color: #fff; 
          font-size: 15px; 
          transition: all 0.2s; 
          font-family: inherit; 
        }
        .cep-form-group input:focus, .cep-form-group select:focus, .cep-form-group textarea:focus { border-color: var(--primary-color, #7c3aed); outline: none; box-shadow: 0 0 0 3px var(--primary-light, rgba(124,58,237,0.1)); }
        .cep-form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .cep-form-row .cep-form-group { margin-bottom: 0; }
        .cep-security-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
        .cep-security-card { background: #0f172a; border: 1px solid #334155; border-radius: 14px; padding: 16px; display: flex; align-items: center; gap: 16px; }
        .cep-sec-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--primary-light, rgba(124,58,237,0.1)); color: var(--primary-color, #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .cep-sec-info { flex: 1; min-width: 0; }
        .cep-sec-info h4 { margin: 0; font-size: 14px; font-weight: 600; color: #f8fafc; }
        .cep-sec-info p { margin: 2px 0 0 0; font-size: 11px; color: #64748b; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cep-toggle { width: 38px; height: 20px; appearance: none; background: #334155; border-radius: 20px; position: relative; cursor: pointer; transition: 0.3s; outline: none; flex-shrink: 0; }
        .cep-toggle:checked { background: var(--primary-color, #7c3aed); }
        .cep-toggle::before { content: ''; position: absolute; width: 14px; height: 14px; border-radius: 50%; background: #fff; top: 3px; left: 4px; transition: 0.3s; }
        .cep-toggle:checked::before { left: 20px; }
        .cep-questions-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 10px; }
        .cep-questions-list { display: flex; flex-direction: column; gap: 12px; }
        .cep-question-item { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 14px; }
        .cep-q-num { font-weight: 800; color: var(--primary-color, #7c3aed); font-size: 15px; width: 30px; }
        .cep-q-body { flex: 1; min-width: 0; }
        .cep-q-text { font-size: 14px; font-weight: 500; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cep-q-meta { display: flex; gap: 8px; }
        .cep-q-type { font-size: 10px; background: rgba(255,255,255,0.03); padding: 2px 6px; border-radius: 4px; color: #64748b; text-transform: uppercase; font-weight: 700; }
        .cep-q-marks { font-size: 10px; color: var(--primary-color, #7c3aed); font-weight: 700; }
        .cep-q-btn { background: none; border: none; color: #475569; cursor: pointer; padding: 6px; border-radius: 6px; transition: 0.2s; }
        .cep-q-btn:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .cep-empty-state { text-align: center; padding: 40px 20px; color: #64748b; border: 2px dashed #334155; border-radius: 16px; font-size: 14px; }
        .cep-empty-state i { font-size: 32px; margin-bottom: 12px; opacity: 0.5; }
        .cep-footer { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 24px; border-top: 1px solid #334155; gap: 15px; }
        .cep-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .cep-modal { background: #1e293b; border: 1px solid #334155; border-radius: 20px; width: 100%; max-width: 540px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); overflow: hidden; }
        .cep-modal-header { padding: 20px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }
        .cep-modal-header h3 { margin: 0; font-size: 18px; font-weight: 700; }
        .cep-modal-header button { background: none; border: none; color: #64748b; font-size: 24px; cursor: pointer; }
        .cep-modal-body { padding: 20px; max-height: 60vh; overflow-y: auto; }
        .cep-modal-footer { padding: 20px; border-top: 1px solid #334155; display: flex; justify-content: flex-end; gap: 12px; }
        .cep-preview-frame { background: #0f172a; border-radius: 16px; border: 1px solid #334155; overflow: hidden; }
        .cep-preview-header { background: #1e293b; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
        .cep-preview-header h3 { margin: 0; font-size: 14px; color: #94a3b8; }
        .cep-timer { background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-family: monospace; font-size: 16px; }
        .cep-preview-content { padding: 30px; min-height: 200px; }
        .cep-p-q-text { font-size: 18px; font-weight: 600; margin-bottom: 20px; line-height: 1.5; }
        .cep-p-options { display: grid; gap: 10px; }
        .cep-p-opt { background: #1e293b; padding: 12px 16px; border-radius: 10px; border: 1px solid #334155; font-size: 14px; display: flex; align-items: center; gap: 12px; }
        .cep-publish-center { text-align: center; padding: 20px 0; }
        .cep-publish-icon { width: 64px; height: 64px; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px; }
        .cep-summary-card { background: #0f172a; border-radius: 14px; padding: 20px; max-width: 360px; margin: 20px auto; text-align: left; border: 1px solid #334155; }
        .cep-summary-item { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
        .cep-summary-item span:first-child { color: #64748b; font-weight: 600; }
        .cep-summary-item span:last-child { color: #f1f5f9; font-weight: 700; }
        .cep-bank-list { display: flex; flex-direction: column; gap: 10px; }
        .cep-bank-item { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .cep-bank-item-info { flex: 1; min-width: 0; }
        .cep-bank-item-info strong { font-size: 13px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cep-bank-item-info span { font-size: 10px; color: #64748b; text-transform: uppercase; }
        .animate-fade { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        /* Media Queries - Responsive Design */
        @media (max-width: 768px) {
          .cep-container { padding: 20px 15px; }
          .cep-header h1 { font-size: 22px; }
          .cep-form-container { padding: 20px; }
          .cep-section-title { font-size: 18px; margin-bottom: 20px; }
          .cep-security-grid { grid-template-columns: 1fr; }
          .cep-question-actions { gap: 8px; flex-wrap: wrap; }
          .cep-footer { flex-direction: column-reverse; }
          .cep-footer button { width: 100%; }
          .cep-modal { width: 95%; max-width: none; border-radius: 16px; }
          .cep-step-label { display: none; }
          .cep-p-q-text { font-size: 16px; }
        }

        /* Staff Theme Overrides */
        .staff-theme input[type="radio"]:checked { accent-color: var(--primary-color); }
        .staff-theme .sd-btn-primary { background: var(--primary-gradient); }
        .staff-theme .sd-btn-white { color: var(--primary-color); }
      `}</style>
        </div>
    );
};

export default CreateExamPage;
