import React, { useEffect, useMemo, useState } from 'react';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
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
import { storage } from '../../firebase';

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
  optionsText: '',
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

const parseCorrectAnswer = (type, rawValue) => {
  if (type === 'checkbox') {
    return String(rawValue || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return rawValue ?? '';
};

const responsiveFieldGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
};

const sectionCardStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 14,
  background: '#f8fafc',
};

const EditableQuestionCard = ({ question, index, onSave, onDelete }) => {
  const [draft, setDraft] = useState({
    question: question.question || '',
    prompt: question.prompt || '',
    type: question.type || 'multiple-choice',
    optionsText: (question.options || []).join('\n'),
    correctAnswer: Array.isArray(question.correctAnswer)
      ? question.correctAnswer.join('\n')
      : (question.correctAnswer || ''),
    marks: question.marks || 1,
    imageUrl: question.imageUrl || '',
  });

  const requiresOptions = draft.type === 'multiple-choice' || draft.type === 'checkbox';
  const usesTrueFalse = draft.type === 'true-false';
  const usesTextAnswer = draft.type === 'short-answer' || draft.type === 'essay';

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <strong>Question {index + 1}</strong>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="sd-btn sd-btn-white"
            type="button"
            onClick={() => onSave(question.id, draft)}
          >
            <i className="fas fa-save"></i> Save
          </button>
          <button className="sd-btn sd-btn-ghost" type="button" onClick={() => onDelete(question.id)}>
            <i className="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>

      <textarea
        value={draft.question}
        onChange={(e) => setDraft((prev) => ({ ...prev, question: e.target.value }))}
        style={{ width: '100%', marginBottom: 12, padding: 10, borderRadius: 10, border: '2px solid #e2e8f0', minHeight: 70, resize: 'vertical' }}
      />

      <div style={sectionCardStyle}>
        <label>Short Description / Note</label>
        <input
          type="text"
          value={draft.prompt}
          onChange={(e) => setDraft((prev) => ({ ...prev, prompt: e.target.value }))}
          style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 10, border: '2px solid #e2e8f0' }}
        />
      </div>

      <div style={{ ...sectionCardStyle, marginTop: 12 }}>
        <div style={responsiveFieldGrid}>
          <div>
            <label>Type</label>
            <select
              value={draft.type}
              onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))}
            >
              {QUESTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Correct Answer</label>
            {usesTrueFalse ? (
              <select
                value={draft.correctAnswer}
                onChange={(e) => setDraft((prev) => ({ ...prev, correctAnswer: e.target.value }))}
              >
                <option value="True">True</option>
                <option value="False">False</option>
              </select>
            ) : (
              <textarea
                value={draft.correctAnswer}
                onChange={(e) => setDraft((prev) => ({ ...prev, correctAnswer: e.target.value }))}
                style={{ width: '100%', padding: 10, borderRadius: 10, border: '2px solid #e2e8f0', minHeight: usesTextAnswer ? 80 : 48, resize: 'vertical' }}
                placeholder={draft.type === 'checkbox' ? 'One correct option per line' : 'Correct answer'}
              />
            )}
          </div>
          <div>
            <label>Marks</label>
            <input
              type="number"
              min="1"
              value={draft.marks}
              onChange={(e) => setDraft((prev) => ({ ...prev, marks: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div style={{ ...sectionCardStyle, marginTop: 12 }}>
        <label>Image URL</label>
        <input
          type="url"
          value={draft.imageUrl}
          onChange={(e) => setDraft((prev) => ({ ...prev, imageUrl: e.target.value }))}
          placeholder="https://..."
          style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 10, border: '2px solid #e2e8f0' }}
        />

        {draft.imageUrl && (
          <img
            src={draft.imageUrl}
            alt="Question reference"
            style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 12, marginTop: 12, background: '#fff' }}
          />
        )}
      </div>

      {requiresOptions && (
        <div style={{ ...sectionCardStyle, marginTop: 12 }}>
          <label>Options (one per line)</label>
          <textarea
            value={draft.optionsText}
            onChange={(e) => setDraft((prev) => ({ ...prev, optionsText: e.target.value }))}
            style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 10, border: '2px solid #e2e8f0', minHeight: 100, resize: 'vertical' }}
          />
        </div>
      )}
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
  const [newQuestion, setNewQuestion] = useState(emptyQuestion);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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
    e.preventDefault();
    if (!selectedExam) return;

    setSavingQuestion(true);
    try {
      const options = newQuestion.optionsText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);

      await addQuestion(selectedExam.courseId, selectedExam.id, {
        question: newQuestion.question,
        prompt: newQuestion.prompt,
        type: newQuestion.type,
        options,
        correctAnswer: parseCorrectAnswer(newQuestion.type, newQuestion.correctAnswer),
        marks: Number(newQuestion.marks),
        imageUrl: newQuestion.imageUrl,
      });
      setNewQuestion(emptyQuestion);
      showSuccess?.('Question added.');
    } catch (err) {
      console.error(err);
      showError?.('Could not add question.');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleQuestionSave = async (questionId, draft) => {
    try {
      await updateQuestion(selectedExam.courseId, selectedExam.id, questionId, {
        question: draft.question,
        prompt: draft.prompt,
        type: draft.type,
        options: draft.optionsText
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        correctAnswer: parseCorrectAnswer(draft.type, draft.correctAnswer),
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

  const questionTypeMeta = useMemo(
    () => QUESTION_TYPES.find((type) => type.value === newQuestion.type),
    [newQuestion.type]
  );

  const questionNeedsOptions = newQuestion.type === 'multiple-choice' || newQuestion.type === 'checkbox';
  const questionUsesTrueFalse = newQuestion.type === 'true-false';
  const questionUsesTextResponse = newQuestion.type === 'short-answer' || newQuestion.type === 'essay';

  async function handleQuestionImageUpload(file) {
    if (!selectedExam || !file) return;
    setUploadingImage(true);
    try {
      const fileRef = ref(storage, `exam-question-images/${selectedExam.courseId}/${selectedExam.id}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setNewQuestion((prev) => ({ ...prev, imageUrl: url }));
      showSuccess?.('Question image uploaded.');
    } catch (err) {
      console.error(err);
      showError?.('Could not upload question image.');
    } finally {
      setUploadingImage(false);
    }
  }

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

      <div className="sd-two-col" style={{ alignItems: 'start', gridTemplateColumns: 'minmax(260px, 320px) minmax(0, 1fr)' }}>
        <div className="sd-card">
          <div className="sd-card-header">
            <span>Assessments</span>
            <span className="sd-badge badge-teal">{stats.drafts} drafts</span>
          </div>
          <div className="sd-card-body" style={{ padding: 0 }}>
            {exams.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                No exams or quizzes created yet.
              </div>
            ) : exams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => setSelectedExamId(exam.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  background: exam.id === selectedExamId ? '#7c3aed12' : '#fff',
                  borderBottom: '1px solid #e2e8f0',
                  padding: 18,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{exam.title}</div>
                    <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                      {exam.courseCode} - {exam.courseName}
                    </div>
                  </div>
                  <span className={`sd-badge ${exam.status === 'published' ? 'badge-published' : 'badge-draft'}`}>
                    {exam.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, fontSize: 12, color: '#64748b' }}>
                  <span>{exam.type}</span>
                  <span>{exam.durationMinutes} mins</span>
                  <span>{exam.totalMarks} marks</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 20, justifyItems: 'center' }}>
          {selectedExam ? (
            <>
              <div className="sd-card" style={{ width: '100%', maxWidth: 1120 }}>
                <div className="sd-card-header">
                  <span>{selectedExam.title}</span>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      className="sd-btn sd-btn-white"
                      onClick={() => {
                        setEditingExam(selectedExam);
                        setShowModal(true);
                      }}
                    >
                      <i className="fas fa-edit"></i> Edit
                    </button>
                    {selectedExam.status !== 'published' && (
                      <button className="sd-btn sd-btn-primary" onClick={() => handlePublish(selectedExam)}>
                        <i className="fas fa-paper-plane"></i> Publish
                      </button>
                    )}
                  </div>
                </div>
                <div className="sd-card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                    {[
                      ['Type', selectedExam.type],
                      ['Start', formatDate(selectedExam.startDate)],
                      ['End', formatDate(selectedExam.endDate)],
                      ['Duration', `${selectedExam.durationMinutes} minutes`],
                      ['Total Marks', selectedExam.totalMarks],
                      ['Anti-cheat', selectedExam.antiCheat ? 'Enabled' : 'Disabled'],
                    ].map(([label, value]) => (
                      <div key={label} className="sd-kv">
                        <span className="sd-kv-key">{label}</span>
                        <span className="sd-kv-val">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 18, color: '#475569' }}>
                    {selectedExam.description || 'No description supplied.'}
                  </div>
                </div>
              </div>

              <div className="sd-card" style={{ width: '100%', maxWidth: 1120 }}>
                <div className="sd-card-header">
                  <span>Questions</span>
                  <span className="sd-badge badge-teal">{questions.length}</span>
                </div>
                <div className="sd-card-body">
                  <form onSubmit={handleAddQuestion} className="sd-modal-form" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: 18, alignItems: 'start' }}>
                      <div style={{ display: 'grid', gap: 14 }}>
                        <div style={sectionCardStyle}>
                          <label>Question</label>
                          <textarea
                            value={newQuestion.question}
                            onChange={(e) => setNewQuestion((prev) => ({ ...prev, question: e.target.value }))}
                            style={{ width: '100%', marginTop: 6, padding: 12, borderRadius: 10, border: '2px solid #e2e8f0', minHeight: 110, resize: 'vertical' }}
                            placeholder="Write the full question here"
                            required
                          />
                        </div>

                        <div style={sectionCardStyle}>
                          <label>Short Description / Note</label>
                          <input
                            type="text"
                            value={newQuestion.prompt}
                            onChange={(e) => setNewQuestion((prev) => ({ ...prev, prompt: e.target.value }))}
                            placeholder="Optional instruction or short description"
                            style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 10, border: '2px solid #e2e8f0' }}
                          />
                        </div>

                        <div style={sectionCardStyle}>
                          <div style={responsiveFieldGrid}>
                            <div>
                              <label>Type</label>
                              <select
                                value={newQuestion.type}
                                onChange={(e) => setNewQuestion((prev) => ({ ...prev, type: e.target.value, correctAnswer: e.target.value === 'true-false' ? 'True' : prev.correctAnswer }))}
                              >
                                {QUESTION_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label>Marks</label>
                              <input
                                type="number"
                                min="1"
                                value={newQuestion.marks}
                                onChange={(e) => setNewQuestion((prev) => ({ ...prev, marks: e.target.value }))}
                                required
                              />
                            </div>
                          </div>
                        </div>

                        {questionNeedsOptions && (
                          <div style={sectionCardStyle}>
                            <label>Options (one per line)</label>
                            <textarea
                              value={newQuestion.optionsText}
                              onChange={(e) => setNewQuestion((prev) => ({ ...prev, optionsText: e.target.value }))}
                              style={{ width: '100%', marginTop: 6, padding: 12, borderRadius: 10, border: '2px solid #e2e8f0', minHeight: 140, resize: 'vertical' }}
                              placeholder={
                                newQuestion.type === 'checkbox'
                                  ? 'Option A\nOption B\nOption C\nOption D'
                                  : 'Option A\nOption B\nOption C\nOption D'
                              }
                              required
                            />
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gap: 14 }}>
                        <div style={sectionCardStyle}>
                          <label>Correct Answer</label>
                          <div style={{ marginTop: 6 }}>
                            {questionUsesTrueFalse ? (
                              <select
                                value={newQuestion.correctAnswer || 'True'}
                                onChange={(e) => setNewQuestion((prev) => ({ ...prev, correctAnswer: e.target.value }))}
                              >
                                <option value="True">True</option>
                                <option value="False">False</option>
                              </select>
                            ) : questionUsesTextResponse ? (
                              <textarea
                                value={newQuestion.correctAnswer}
                                onChange={(e) => setNewQuestion((prev) => ({ ...prev, correctAnswer: e.target.value }))}
                                required={newQuestion.type !== 'essay'}
                                style={{ width: '100%', padding: 12, borderRadius: 10, border: '2px solid #e2e8f0', minHeight: 110, resize: 'vertical' }}
                                placeholder={
                                  newQuestion.type === 'essay'
                                    ? 'Optional rubric / expected key points'
                                    : 'Type the correct short answer'
                                }
                              />
                            ) : (
                              <textarea
                                value={newQuestion.correctAnswer}
                                onChange={(e) => setNewQuestion((prev) => ({ ...prev, correctAnswer: e.target.value }))}
                                required={newQuestion.type !== 'essay'}
                                style={{ width: '100%', padding: 12, borderRadius: 10, border: '2px solid #e2e8f0', minHeight: 110, resize: 'vertical' }}
                                placeholder={
                                  newQuestion.type === 'checkbox'
                                    ? 'Write all correct options, one per line'
                                    : 'Correct answer'
                                }
                              />
                            )}
                          </div>

                          {!questionNeedsOptions && (
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                              {questionTypeMeta?.label} does not require selectable options.
                            </div>
                          )}
                        </div>

                        <div style={sectionCardStyle}>
                          <div style={{ display: 'grid', gap: 12 }}>
                            <div>
                              <label>Question Image</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleQuestionImageUpload(e.target.files?.[0])}
                              />
                              {uploadingImage && <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Uploading image...</div>}
                            </div>

                            <div>
                              <label>Image URL (optional)</label>
                              <input
                                type="url"
                                value={newQuestion.imageUrl}
                                onChange={(e) => setNewQuestion((prev) => ({ ...prev, imageUrl: e.target.value }))}
                                placeholder="https://..."
                              />
                            </div>
                          </div>

                          {newQuestion.imageUrl && (
                            <img
                              src={newQuestion.imageUrl}
                              alt="Question preview"
                              style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 12, marginTop: 12, background: '#fff' }}
                            />
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <button type="submit" className="sd-btn sd-btn-primary" disabled={savingQuestion}>
                            {savingQuestion ? <><i className="fas fa-circle-notch fa-spin"></i> Saving...</> : 'Add Question'}
                          </button>
                          <button
                            type="button"
                            className="sd-btn sd-btn-white"
                            onClick={() => setNewQuestion((prev) => ({
                              ...emptyQuestion,
                              type: prev.type,
                            }))}
                          >
                            Clear Form
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>

                  <div style={{ display: 'grid', gap: 14 }}>
                    {questions.length === 0 && (
                      <div style={{ color: '#94a3b8', textAlign: 'center', padding: 16 }}>
                        No questions added yet.
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

              <div className="sd-card" style={{ width: '100%', maxWidth: 980 }}>
                <div className="sd-card-header">
                  <span>Submissions</span>
                  <span className="sd-badge badge-teal">{submissions.length}</span>
                </div>
                <div className="sd-table-wrapper">
                  {submissions.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                      No student submissions yet.
                    </div>
                  ) : (
                    <table className="sd-table">
                      <thead>
                        <tr>
                          <th>Student</th>
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
                            <td><span className="sd-badge badge-teal">{item.status}</span></td>
                            <td>
                              {item.manualReviewRequired
                                ? 'Pending review'
                                : `${item.percentage ?? item.score ?? 0}${item.percentage != null ? '%' : ''}`}
                            </td>
                            <td>{item.violationCount || 0}</td>
                            <td>{item.startedAt?.toDate ? item.startedAt.toDate().toLocaleString() : '—'}</td>
                            <td>{item.submittedAt?.toDate ? item.submittedAt.toDate().toLocaleString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="sd-card" style={{ width: '100%', maxWidth: 980 }}>
              <div className="sd-card-body" style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                Select an exam to manage questions, publishing, and submissions.
              </div>
            </div>
          )}
        </div>
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
