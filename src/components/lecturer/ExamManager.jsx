import React, { useEffect, useMemo, useState } from 'react';
import CreateExamModal from './CreateExamModal';
import {
  addQuestion,
  createExam,
  deleteQuestion,
  publishExam,
  subscribeToExamQuestions,
  subscribeToExamSubmissions,
  subscribeToLecturerExams,
  updateExam,
  updateQuestion,
} from '../../services/examService';

const QUESTION_TYPES = [
  { value: 'multiple-choice', label: 'Multiple Choice (Radio)' },
  { value: 'checkbox', label: 'Checkbox / Multi Select' },
  { value: 'true-false', label: 'True or False' },
  { value: 'short-answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
];

const emptyQuestion = {
  question: '',
  prompt: '',
  type: 'multiple-choice',
  options: [],
  correctAnswer: '',
  marks: 1,
  imageUrl: '',
};

const formatDate = (value) => {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const EditableQuestionCard = ({ question, index, onSave, onDelete }) => {
  const [draft, setDraft] = useState({
    question: question.question || '',
    prompt: question.prompt || '',
    type: question.type || 'multiple-choice',
    options: question.options || [],
    correctAnswer: question.correctAnswer || '',
    marks: question.marks || 1,
    imageUrl: question.imageUrl || '',
  });

  const [newOption, setNewOption] = useState('');

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    setDraft(prev => ({
      ...prev,
      options: [...prev.options, newOption.trim()]
    }));
    setNewOption('');
  };

  const handleRemoveOption = (optIndex) => {
    setDraft(prev => {
      const newOptions = prev.options.filter((_, i) => i !== optIndex);
      let newCorrect = prev.correctAnswer;
      
      // If removed option was the correct one (for radio)
      if (prev.type === 'multiple-choice' && prev.options[optIndex] === prev.correctAnswer) {
        newCorrect = '';
      }
      // If removed option was in correct answers (for checkbox)
      if (prev.type === 'checkbox' && Array.isArray(prev.correctAnswer)) {
        newCorrect = prev.correctAnswer.filter(val => val !== prev.options[optIndex]);
      }

      return { ...prev, options: newOptions, correctAnswer: newCorrect };
    });
  };

  const toggleCorrect = (val) => {
    setDraft(prev => {
      if (prev.type === 'multiple-choice' || prev.type === 'true-false') {
        return { ...prev, correctAnswer: val };
      }
      if (prev.type === 'checkbox') {
        const current = Array.isArray(prev.correctAnswer) ? prev.correctAnswer : [];
        const exists = current.includes(val);
        return {
          ...prev,
          correctAnswer: exists ? current.filter(v => v !== val) : [...current, val]
        };
      }
      return prev;
    });
  };

  const isCorrect = (val) => {
    if (Array.isArray(draft.correctAnswer)) {
      return draft.correctAnswer.includes(val);
    }
    return draft.correctAnswer === val;
  };

  return (
    <div className="sd-card" style={{ marginBottom: 20, borderLeft: '4px solid var(--primary-color)' }}>
      <div className="sd-card-header" style={{ background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="sd-badge badge-teal" style={{ borderRadius: '6px', padding: '4px 10px' }}>Q{index + 1}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{QUESTION_TYPES.find(t => t.value === draft.type)?.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sd-btn sd-btn-primary sd-btn-sm" onClick={() => onSave(question.id, draft)}>
            <i className="fas fa-save"></i> Save
          </button>
          <button className="sd-btn sd-btn-ghost sd-btn-sm" onClick={() => onDelete(question.id)}>
            <i className="fas fa-trash" style={{ color: '#ef4444' }}></i>
          </button>
        </div>
      </div>

      <div className="sd-card-body">
        <div style={{ marginBottom: 16 }}>
          <label className="sd-modal-form label" style={{ marginTop: 0, marginBottom: 6, display: 'block' }}>Question Text</label>
          <textarea
            value={draft.question}
            onChange={(e) => setDraft(prev => ({ ...prev, question: e.target.value }))}
            className="sd-input"
            style={{ minHeight: 80, fontSize: 15, fontWeight: 500 }}
            placeholder="Type your question here..."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 16, marginBottom: 16 }}>
          <div>
            <label className="sd-modal-form label" style={{ marginTop: 0, marginBottom: 6, display: 'block' }}>Instructions / Note (Optional)</label>
            <input
              type="text"
              value={draft.prompt}
              onChange={(e) => setDraft(prev => ({ ...prev, prompt: e.target.value }))}
              className="sd-input"
              placeholder="e.g. Choose the most appropriate answer"
            />
          </div>
          <div>
            <label className="sd-modal-form label" style={{ marginTop: 0, marginBottom: 6, display: 'block' }}>Marks</label>
            <input
              type="number"
              value={draft.marks}
              onChange={(e) => setDraft(prev => ({ ...prev, marks: Number(e.target.value) }))}
              className="sd-input"
            />
          </div>
        </div>

        {/* Dynamic Question Options UI */}
        {(draft.type === 'multiple-choice' || draft.type === 'checkbox') && (
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <label className="sd-modal-form label" style={{ marginTop: 0, marginBottom: 12, display: 'block' }}>
              Options & Correct Answer
              <small style={{ display: 'block', textTransform: 'none', fontWeight: 400, marginTop: 4, color: '#94a3b8' }}>
                Add options below. Click a pill to mark it as correct.
              </small>
            </label>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {draft.options.map((opt, i) => (
                <div 
                  key={i} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    padding: '8px 14px', 
                    borderRadius: '20px', 
                    background: isCorrect(opt) ? 'var(--primary-color)' : 'white',
                    color: isCorrect(opt) ? 'white' : '#1e293b',
                    border: '1px solid',
                    borderColor: isCorrect(opt) ? 'var(--primary-color)' : '#e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isCorrect(opt) ? '0 4px 12px var(--primary-shadow)' : 'none'
                  }}
                  onClick={() => toggleCorrect(opt)}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{opt}</span>
                  <i 
                    className="fas fa-times" 
                    style={{ fontSize: 12, opacity: 0.6, cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveOption(i);
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                className="sd-input"
                placeholder="Type an option and press Enter..."
                style={{ flex: 1 }}
              />
              <button type="button" className="sd-btn sd-btn-primary" onClick={handleAddOption}>
                <i className="fas fa-plus"></i>
              </button>
            </div>
          </div>
        )}

        {draft.type === 'true-false' && (
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <label className="sd-modal-form label" style={{ marginTop: 0, marginBottom: 12, display: 'block' }}>Select Correct Answer</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {['True', 'False'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => toggleCorrect(val)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid',
                    borderColor: draft.correctAnswer === val ? 'var(--primary-color)' : '#e2e8f0',
                    background: draft.correctAnswer === val ? 'var(--primary-color)' : 'white',
                    color: draft.correctAnswer === val ? 'white' : '#64748b',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        )}

        {(draft.type === 'short-answer' || draft.type === 'essay') && (
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <label className="sd-modal-form label" style={{ marginTop: 0, marginBottom: 6, display: 'block' }}>
              {draft.type === 'short-answer' ? 'Expected Answer / Keywords' : 'Grading Rubric (Optional)'}
            </label>
            <textarea
              value={draft.correctAnswer}
              onChange={(e) => setDraft(prev => ({ ...prev, correctAnswer: e.target.value }))}
              className="sd-input"
              style={{ minHeight: 60 }}
              placeholder={draft.type === 'short-answer' ? 'Enter the correct answer students should provide...' : 'Enter key points or rubric for grading...'}
            />
          </div>
        )}

        {/* Image Support */}
        <div style={{ marginTop: 16 }}>
          <label className="sd-modal-form label" style={{ marginTop: 0, marginBottom: 6, display: 'block' }}>Reference Image URL (Optional)</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="url"
              value={draft.imageUrl}
              onChange={(e) => setDraft(prev => ({ ...prev, imageUrl: e.target.value }))}
              className="sd-input"
              placeholder="https://example.com/image.png"
              style={{ flex: 1 }}
            />
          </div>
          {draft.imageUrl && (
            <div style={{ marginTop: 12, position: 'relative', display: 'inline-block' }}>
              <img src={draft.imageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <button 
                className="sd-close-btn" 
                style={{ position: 'absolute', top: -10, right: -10, width: 24, height: 24, fontSize: 14 }}
                onClick={() => setDraft(prev => ({ ...prev, imageUrl: '' }))}
              >
                &times;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ExamManager = ({
  courses,
  lecturerId,
  showSuccess,
  showError,
}) => {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [savingExam, setSavingExam] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [newQuestion, setNewQuestion] = useState({
    ...emptyQuestion,
    options: []
  });
  const [newOptionText, setNewOptionText] = useState('');
  const [savingQuestion, setSavingQuestion] = useState(false);

  useEffect(() => {
    const unsub = subscribeToLecturerExams(
      courses,
      (loaded) => {
        setExams(loaded);
        setSelectedExamId((current) => {
          if (current && loaded.some((item) => item.id === current)) return current;
          return loaded[0]?.id || '';
        });
      },
      () => showError?.('Could not load exams.')
    );

    return () => unsub();
  }, [courses, showError]);

  const selectedExam = useMemo(
    () => exams.find((item) => item.id === selectedExamId) || null,
    [exams, selectedExamId]
  );

  useEffect(() => {
    if (!selectedExam?.courseId || !selectedExam?.id) {
      setQuestions([]);
      setSubmissions([]);
      return undefined;
    }

    const unsubQuestions = subscribeToExamQuestions(
      selectedExam.courseId,
      selectedExam.id,
      setQuestions,
      () => showError?.('Could not load exam questions.')
    );

    const unsubSubmissions = subscribeToExamSubmissions(
      selectedExam.courseId,
      selectedExam.id,
      setSubmissions,
      () => showError?.('Could not load submissions.')
    );

    return () => {
      unsubQuestions();
      unsubSubmissions();
    };
  }, [selectedExam, showError]);

  const openCreateModal = () => {
    setEditingExam(null);
    setShowModal(true);
  };

  const handleSaveExam = async (form) => {
    const course = courses.find((item) => (item.docId || item.id) === form.courseId);
    if (!course) {
      showError?.('Please select a valid course.');
      return;
    }

    setSavingExam(true);
    try {
      if (editingExam) {
        await updateExam(editingExam.courseId, editingExam.id, {
          title: form.title,
          type: form.type,
          description: form.description,
          durationMinutes: Number(form.durationMinutes),
          totalMarks: Number(form.totalMarks),
          startDate: form.startDate,
          endDate: form.endDate,
          antiCheat: form.antiCheat,
          shuffleQuestions: form.shuffleQuestions,
        });
        showSuccess?.('Exam updated.');
      } else {
        await createExam({
          course,
          lecturerId,
          data: form,
        });
        showSuccess?.('Exam created.');
      }
      setShowModal(false);
      setEditingExam(null);
    } catch (err) {
      console.error(err);
      showError?.('Could not save exam.');
    } finally {
      setSavingExam(false);
    }
  };

  const handlePublish = async (exam) => {
    try {
      await publishExam(exam.courseId, exam.id);
      showSuccess?.(`${exam.title} published.`);
    } catch (err) {
      console.error(err);
      showError?.('Could not publish exam.');
    }
  };

  const handleAddQuestion = async (e) => {
    if (e) e.preventDefault();
    if (!selectedExam) return;

    setSavingQuestion(true);
    try {
      await addQuestion(selectedExam.courseId, selectedExam.id, {
        question: newQuestion.question,
        prompt: newQuestion.prompt,
        type: newQuestion.type,
        options: newQuestion.options || [],
        correctAnswer: newQuestion.correctAnswer,
        marks: Number(newQuestion.marks),
        imageUrl: newQuestion.imageUrl,
      });
      setNewQuestion({ ...emptyQuestion, options: [] });
      setNewOptionText('');
      showSuccess?.('Question added.');
    } catch (err) {
      console.error(err);
      showError?.('Could not add question.');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleNewOptionAdd = () => {
    if (!newOptionText.trim()) return;
    setNewQuestion(prev => ({
      ...prev,
      options: [...(prev.options || []), newOptionText.trim()]
    }));
    setNewOptionText('');
  };

  const handleNewOptionRemove = (idx) => {
    setNewQuestion(prev => {
      const opts = prev.options.filter((_, i) => i !== idx);
      let correct = prev.correctAnswer;
      if (prev.type === 'multiple-choice' && prev.options[idx] === prev.correctAnswer) correct = '';
      if (prev.type === 'checkbox' && Array.isArray(prev.correctAnswer)) {
        correct = prev.correctAnswer.filter(v => v !== prev.options[idx]);
      }
      return { ...prev, options: opts, correctAnswer: correct };
    });
  };

  const toggleNewCorrect = (val) => {
    setNewQuestion(prev => {
      if (prev.type === 'multiple-choice' || prev.type === 'true-false') {
        return { ...prev, correctAnswer: val };
      }
      if (prev.type === 'checkbox') {
        const current = Array.isArray(prev.correctAnswer) ? prev.correctAnswer : [];
        const exists = current.includes(val);
        return {
          ...prev,
          correctAnswer: exists ? current.filter(v => v !== val) : [...current, val]
        };
      }
      return prev;
    });
  };

  const isNewCorrect = (val) => {
    if (Array.isArray(newQuestion.correctAnswer)) {
      return newQuestion.correctAnswer.includes(val);
    }
    return newQuestion.correctAnswer === val;
  };

  const handleQuestionSave = async (questionId, draft) => {
    try {
      await updateQuestion(selectedExam.courseId, selectedExam.id, questionId, {
        question: draft.question,
        prompt: draft.prompt,
        type: draft.type,
        options: draft.options || [],
        correctAnswer: draft.correctAnswer,
        marks: Number(draft.marks) || 1,
        imageUrl: draft.imageUrl || '',
      });
      showSuccess?.('Question updated.');
    } catch (err) {
      console.error(err);
      showError?.('Could not update question.');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    try {
      await deleteQuestion(selectedExam.courseId, selectedExam.id, questionId);
      showSuccess?.('Question deleted.');
    } catch (err) {
      console.error(err);
      showError?.('Could not delete question.');
    }
  };

  const stats = useMemo(() => ({
    published: exams.filter((item) => item.status === 'published').length,
    drafts: exams.filter((item) => item.status === 'draft').length,
    quizzes: exams.filter((item) => item.type === 'quiz').length,
    exams: exams.filter((item) => item.type === 'exam').length,
  }), [exams]);

  return (
    <div className="sd-tab-fade">
      <div className="sd-page-header">
        <div>
          <h2 className="sd-page-title">Examinations & Quizzes</h2>
          <p className="sd-page-sub">Create, publish, monitor submissions, and score online assessments.</p>
        </div>
        <button className="sd-btn sd-btn-primary" onClick={openCreateModal}>
          <i className="fas fa-plus"></i> Create Exam / Quiz
        </button>
      </div>

      <div className="sd-stats-row" style={{ marginBottom: 24 }}>
        {[
          { icon: 'fa-file-signature', val: exams.length, lbl: 'Total Assessments' },
          { icon: 'fa-paper-plane', val: stats.published, lbl: 'Published' },
          { icon: 'fa-pen-ruler', val: stats.quizzes, lbl: 'Quizzes' },
          { icon: 'fa-graduation-cap', val: stats.exams, lbl: 'Exams' },
        ].map((item) => (
          <div key={item.lbl} className="sd-stat-card">
            <div className="sd-stat-icon"><i className={`fas ${item.icon}`}></i></div>
            <div className="sd-stat-val">{item.val}</div>
            <div className="sd-stat-lbl">{item.lbl}</div>
          </div>
        ))}
      </div>

      <div className="sd-two-col" style={{ alignItems: 'start', gridTemplateColumns: '1fr', gap: 30 }}>
        {/* Assessments List */}
        <div className="sd-card" style={{ borderRadius: 16 }}>
          <div className="sd-card-header" style={{ padding: '20px 24px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <i className="fas fa-list-ul" style={{ color: 'var(--primary-color)' }}></i>
              <span>Active Assessments</span>
            </div>
            <span className="sd-badge badge-teal" style={{ padding: '4px 12px' }}>{stats.drafts} drafts</span>
          </div>
          <div className="sd-card-body" style={{ padding: 12 }}>
            {exams.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                <i className="fas fa-file-invoice fa-3x" style={{ opacity: 0.2, marginBottom: 16 }}></i>
                <p>No exams or quizzes created yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {exams.map((exam) => (
                  <button
                    key={exam.id}
                    onClick={() => setSelectedExamId(exam.id)}
                    style={{
                      textAlign: 'left',
                      border: exam.id === selectedExamId ? '2px solid var(--primary-color)' : '1px solid #e2e8f0',
                      background: exam.id === selectedExamId ? 'var(--primary-light)' : '#fff',
                      padding: 16,
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>{exam.title}</div>
                        <div style={{ color: '#64748b', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-book" style={{ fontSize: 10 }}></i>
                          {exam.courseCode}
                        </div>
                      </div>
                      <span className={`sd-badge ${exam.status === 'published' ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                        {exam.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 14, fontSize: 11, color: '#64748b', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 10 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><i className="fas fa-tag"></i> {exam.type}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><i className="fas fa-clock"></i> {exam.durationMinutes}m</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><i className="fas fa-star"></i> {exam.totalMarks}pts</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedExam ? (
          <div style={{ display: 'grid', gap: 30, width: '100%' }}>
            {/* Assessment Details Card */}
            <div className="sd-card" style={{ borderRadius: 16, borderTop: '4px solid var(--primary-color)' }}>
              <div className="sd-card-header" style={{ padding: '20px 24px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="sd-stat-icon" style={{ width: 32, height: 32, fontSize: 14, margin: 0 }}>
                    <i className="fas fa-info-circle"></i>
                  </div>
                  <span>{selectedExam.title} Details</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="sd-btn sd-btn-ghost"
                    style={{ background: 'white' }}
                    onClick={() => {
                      setEditingExam(selectedExam);
                      setShowModal(true);
                    }}
                  >
                    <i className="fas fa-edit"></i> Edit Info
                  </button>
                  {selectedExam.status !== 'published' && (
                    <button className="sd-btn sd-btn-primary" onClick={() => handlePublish(selectedExam)}>
                      <i className="fas fa-paper-plane"></i> Publish Now
                    </button>
                  )}
                </div>
              </div>
              <div className="sd-card-body" style={{ padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  {[
                    ['Assessment Type', selectedExam.type, 'fa-tag'],
                    ['Start Date', formatDate(selectedExam.startDate), 'fa-calendar-alt'],
                    ['End Date', formatDate(selectedExam.endDate), 'fa-calendar-check'],
                    ['Duration', `${selectedExam.durationMinutes} minutes`, 'fa-clock'],
                    ['Total Marks', `${selectedExam.totalMarks} Points`, 'fa-bullseye'],
                    ['Anti-cheat', selectedExam.antiCheat ? 'Active' : 'Disabled', 'fa-shield-alt'],
                  ].map(([label, value, icon]) => (
                    <div key={label} className="sd-kv" style={{ padding: '12px 16px', borderRadius: 12 }}>
                      <span className="sd-kv-key" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className={`fas ${icon}`} style={{ fontSize: 10 }}></i>
                        {label}
                      </span>
                      <span className="sd-kv-val" style={{ fontSize: 14, marginTop: 4 }}>{value}</span>
                    </div>
                  ))}
                </div>
                {selectedExam.description && (
                  <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px dotted #e2e8f0', color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
                    <i className="fas fa-quote-left" style={{ opacity: 0.2, marginRight: 10 }}></i>
                    {selectedExam.description}
                  </div>
                )}
              </div>
            </div>

            {/* Questions Management Card */}
            <div className="sd-card" style={{ borderRadius: 16 }}>
              <div className="sd-card-header" style={{ padding: '20px 24px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="sd-stat-icon" style={{ width: 32, height: 32, fontSize: 14, margin: 0, background: 'var(--primary-light)', color: 'var(--primary-color)' }}>
                    <i className="fas fa-question-circle"></i>
                  </div>
                  <span>Question Bank</span>
                </div>
                <span className="sd-badge badge-teal" style={{ padding: '4px 12px' }}>{questions.length} total</span>
              </div>
              <div className="sd-card-body" style={{ padding: 24 }}>
                {/* Modernized Add Question Form */}
                <div style={{ background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, marginBottom: 32 }}>
                  <h4 style={{ marginBottom: 20, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="fas fa-plus-circle" style={{ color: 'var(--primary-color)' }}></i>
                    Add New Question
                  </h4>
                  
                  <form onSubmit={handleAddQuestion} className="sd-modal-form">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
                      <div>
                        <label className="sd-modal-form label" style={{ marginTop: 0 }}>Question Prompt</label>
                        <textarea
                          value={newQuestion.question}
                          onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                          className="sd-input"
                          style={{ minHeight: 100, fontSize: 15, fontWeight: 500 }}
                          placeholder="What would you like to ask?"
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 16 }}>
                        <div>
                          <label className="sd-modal-form label" style={{ marginTop: 0 }}>Question Type</label>
                          <select
                            value={newQuestion.type}
                            onChange={(e) => {
                              const type = e.target.value;
                              setNewQuestion(prev => ({ 
                                ...prev, 
                                type, 
                                options: [], 
                                correctAnswer: type === 'true-false' ? 'True' : (type === 'checkbox' ? [] : '') 
                              }));
                            }}
                            className="sd-input"
                          >
                            {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="sd-modal-form label" style={{ marginTop: 0 }}>Instruction / Note</label>
                          <input
                            type="text"
                            value={newQuestion.prompt}
                            onChange={(e) => setNewQuestion(prev => ({ ...prev, prompt: e.target.value }))}
                            className="sd-input"
                            placeholder="e.g. Choose all that apply"
                          />
                        </div>
                        <div>
                          <label className="sd-modal-form label" style={{ marginTop: 0 }}>Marks</label>
                          <input
                            type="number"
                            min="1"
                            value={newQuestion.marks}
                            onChange={(e) => setNewQuestion(prev => ({ ...prev, marks: Number(e.target.value) }))}
                            className="sd-input"
                            required
                          />
                        </div>
                      </div>

                      {/* Interactive Answer Selection UI */}
                      <div style={{ background: 'white', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        {(newQuestion.type === 'multiple-choice' || newQuestion.type === 'checkbox') && (
                          <>
                            <label className="sd-modal-form label" style={{ marginTop: 0, marginBottom: 12 }}>
                              Options & Correct Answers
                              <small style={{ display: 'block', textTransform: 'none', color: '#94a3b8', marginTop: 4 }}>
                                Add answers then click the ones that are correct.
                              </small>
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                              {(newQuestion.options || []).map((opt, i) => (
                                <div 
                                  key={i} 
                                  onClick={() => toggleNewCorrect(opt)}
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 10, 
                                    padding: '10px 16px', 
                                    borderRadius: '24px', 
                                    background: isNewCorrect(opt) ? 'var(--primary-color)' : '#f8fafc',
                                    color: isNewCorrect(opt) ? 'white' : '#1e293b',
                                    border: '1px solid',
                                    borderColor: isNewCorrect(opt) ? 'var(--primary-color)' : '#e2e8f0',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: isNewCorrect(opt) ? '0 4px 12px var(--primary-shadow)' : 'none'
                                  }}
                                >
                                  <span style={{ fontWeight: 600 }}>{opt}</span>
                                  <i 
                                    className="fas fa-times" 
                                    style={{ fontSize: 12, opacity: 0.6 }}
                                    onClick={(e) => { e.stopPropagation(); handleNewOptionRemove(i); }}
                                  />
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <input
                                type="text"
                                value={newOptionText}
                                onChange={(e) => setNewOptionText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleNewOptionAdd())}
                                className="sd-input"
                                placeholder="Type answer and press Enter..."
                                style={{ flex: 1 }}
                              />
                              <button type="button" className="sd-btn sd-btn-white" onClick={handleNewOptionAdd}>
                                <i className="fas fa-plus"></i>
                              </button>
                            </div>
                          </>
                        )}

                        {newQuestion.type === 'true-false' && (
                          <>
                            <label className="sd-modal-form label" style={{ marginTop: 0, marginBottom: 12 }}>Select Correct Answer</label>
                            <div style={{ display: 'flex', gap: 12 }}>
                              {['True', 'False'].map(val => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => toggleNewCorrect(val)}
                                  style={{
                                    flex: 1,
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: '2px solid',
                                    borderColor: newQuestion.correctAnswer === val ? 'var(--primary-color)' : '#e2e8f0',
                                    background: newQuestion.correctAnswer === val ? 'var(--primary-color)' : 'white',
                                    color: newQuestion.correctAnswer === val ? 'white' : '#64748b',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          </>
                        )}

                        {(newQuestion.type === 'short-answer' || newQuestion.type === 'essay') && (
                          <>
                            <label className="sd-modal-form label" style={{ marginTop: 0, marginBottom: 8 }}>
                              {newQuestion.type === 'short-answer' ? 'Expected Correct Answer' : 'Grading Rubric / Key Points (Optional)'}
                            </label>
                            <textarea
                              value={newQuestion.correctAnswer}
                              onChange={(e) => setNewQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                              className="sd-input"
                              style={{ minHeight: 80 }}
                              placeholder={newQuestion.type === 'short-answer' ? 'What answer should the system look for?' : 'Outline what constitutes a good answer...'}
                              required={newQuestion.type === 'short-answer'}
                            />
                          </>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                        <button 
                          type="button" 
                          className="sd-btn sd-btn-ghost" 
                          onClick={() => { setNewQuestion({ ...emptyQuestion, options: [] }); setNewOptionText(''); }}
                        >
                          Clear
                        </button>
                        <button type="submit" className="sd-btn sd-btn-primary" disabled={savingQuestion} style={{ padding: '10px 32px' }}>
                          {savingQuestion ? <><i className="fas fa-circle-notch fa-spin"></i> Saving...</> : 'Add to Bank'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* List of existing questions */}
                <div style={{ display: 'grid', gap: 20 }}>
                  {questions.length === 0 && (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40, border: '2px dashed #e2e8f0', borderRadius: 16 }}>
                      <i className="fas fa-question fa-3x" style={{ opacity: 0.1, marginBottom: 16 }}></i>
                      <p>Your question bank is empty. Start by adding a question above.</p>
                    </div>
                  )}
                  {questions.map((question, index) => (
                    <EditableQuestionCard
                      key={`${question.id}_${question.updatedAt?.seconds || question.updatedAt?.toMillis?.() || 'base'}`}
                      question={question}
                      index={index}
                      onSave={handleQuestionSave}
                      onDelete={handleDeleteQuestion}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Submissions Table Card */}
            <div className="sd-card" style={{ borderRadius: 16 }}>
              <div className="sd-card-header" style={{ padding: '20px 24px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="sd-stat-icon" style={{ width: 32, height: 32, fontSize: 14, margin: 0, background: '#dcfce7', color: '#059669' }}>
                    <i className="fas fa-user-check"></i>
                  </div>
                  <span>Student Submissions</span>
                </div>
                <span className="sd-badge badge-teal" style={{ padding: '4px 12px' }}>{submissions.length} received</span>
              </div>
              <div className="sd-table-wrapper">
                {submissions.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                    <i className="fas fa-user-edit fa-3x" style={{ opacity: 0.1, marginBottom: 16 }}></i>
                    <p>No student submissions yet.</p>
                  </div>
                ) : (
                  <table className="sd-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Violations</th>
                        <th>Started</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((item) => (
                        <tr key={item.id}>
                          <td className="sd-td-bold">{item.studentName || item.studentId}</td>
                          <td>
                            <span className={`sd-badge ${item.status === 'submitted' ? 'badge-green' : 'badge-gold'}`}>
                              {item.status}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                            {item.manualReviewRequired
                              ? 'Pending review'
                              : `${item.percentage ?? item.score ?? 0}${item.percentage != null ? '%' : ''}`}
                          </td>
                          <td>
                            <span style={{ color: (item.violationCount || 0) > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                              {item.violationCount || 0}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: '#64748b' }}>{item.startedAt?.toDate ? item.startedAt.toDate().toLocaleString() : '—'}</td>
                          <td style={{ fontSize: 12, color: '#64748b' }}>{item.submittedAt?.toDate ? item.submittedAt.toDate().toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="sd-card" style={{ width: '100%', borderRadius: 16, border: '2px dashed #e2e8f0', background: 'transparent', boxShadow: 'none' }}>
            <div className="sd-card-body" style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
              <i className="fas fa-mouse-pointer fa-4x" style={{ opacity: 0.1, marginBottom: 20 }}></i>
              <h3>No Assessment Selected</h3>
              <p>Click on an assessment card above to manage its questions and view submissions.</p>
            </div>
          </div>
        )}
      </div>

      <CreateExamModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingExam(null);
        }}
        onSave={handleSaveExam}
        courses={courses}
        saving={savingExam}
        initialExam={editingExam}
      />
    </div>
  );
};

export default ExamManager;
