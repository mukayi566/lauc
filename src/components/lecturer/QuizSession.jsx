import React, { useEffect, useMemo, useRef, useState } from 'react';
import ExamTimer from './ExamTimer';
import ExamSecurityWrapper from './ExamSecurityWrapper';
import {
  incrementViolation,
  saveSubmissionProgress,
  submitExam,
} from '../../services/examService';

const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const normalizeArrayAnswer = (value) => (Array.isArray(value) ? value : []);

const QuizSession = ({
  exam,
  course,
  student,
  questions,
  submission,
  onExit,
  onComplete,
  showError,
}) => {
  const submittingRef = useRef(false);
  const [answers, setAnswers] = useState(submission?.answers || {});
  const [currentIndex, setCurrentIndex] = useState(Number(submission?.currentQuestionIndex || 0));
  const [violationCount, setViolationCount] = useState(Number(submission?.violationCount || 0));
  const [questionOrder, setQuestionOrder] = useState(submission?.questionOrder || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAnswers(submission?.answers || {});
    setCurrentIndex(Number(submission?.currentQuestionIndex || 0));
    setViolationCount(Number(submission?.violationCount || 0));
    setQuestionOrder(submission?.questionOrder || []);
  }, [submission]);

  useEffect(() => {
    if (!questions.length) return;
    if (questionOrder.length === questions.length) return;

    const orderedIds = exam.shuffleQuestions
      ? shuffle(questions.map((item) => item.id))
      : questions.map((item) => item.id);

    setQuestionOrder(orderedIds);
    saveSubmissionProgress(course.docId || course.id, exam.id, student.id, {
      questionOrder: orderedIds,
    }).catch(() => {});
  }, [course, exam.id, exam.shuffleQuestions, questionOrder.length, questions, student.id]);

  const orderedQuestions = useMemo(() => {
    if (!questions.length) return [];
    if (!questionOrder.length) return questions;

    const byId = new Map(questions.map((item) => [item.id, item]));
    return questionOrder.map((id) => byId.get(id)).filter(Boolean);
  }, [questionOrder, questions]);

  const activeQuestion = orderedQuestions[currentIndex];
  const selectedCheckboxAnswers = normalizeArrayAnswer(answers?.[activeQuestion?.id]);

  useEffect(() => {
    if (!submission || !orderedQuestions.length) return undefined;

    const timeout = window.setTimeout(async () => {
      setSaving(true);
      try {
        await saveSubmissionProgress(course.docId || course.id, exam.id, student.id, {
          answers,
          currentQuestionIndex: currentIndex,
          questionOrder,
          violationCount,
        });
      } catch {
        /* ignore autosave retries */
      } finally {
        setSaving(false);
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [answers, course, currentIndex, exam.id, orderedQuestions.length, questionOrder, student.id, submission, violationCount]);

  const handleSubmit = async (autoSubmitted = false) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);

    try {
      const result = await submitExam({
        course,
        exam,
        student,
        answers,
        autoSubmitted,
        violationCount,
      });
      onComplete?.(result, autoSubmitted);
    } catch (err) {
      console.error(err);
      showError?.('Failed to submit exam.');
      submittingRef.current = false;
    } finally {
      setSaving(false);
    }
  };

  const handleViolation = async (reason) => {
    const nextCount = await incrementViolation(course.docId || course.id, exam.id, student.id, violationCount, reason);
    setViolationCount(nextCount);
    return nextCount;
  };

  if (!activeQuestion) {
    return (
      <div className="sd-card">
        <div className="sd-card-body" style={{ padding: 32, textAlign: 'center' }}>
          No questions have been added to this assessment yet.
        </div>
      </div>
    );
  }

  return (
    <ExamSecurityWrapper
      enabled={exam.antiCheat}
      violationCount={violationCount}
      onViolation={handleViolation}
      onAutoSubmit={() => handleSubmit(true)}
    >
      <div className="sd-card">
        <div className="sd-card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{exam.title}</div>
            <div style={{ color: '#64748b', fontSize: 13 }}>
              {course.code || exam.courseCode} - {course.name || exam.courseName}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <ExamTimer
              key={`${submission?.startedAt?.seconds || submission?.startedAt?.toMillis?.() || 'start'}_${exam.durationMinutes}`}
              startedAt={submission?.startedAt}
              durationMinutes={exam.durationMinutes}
              onTimeout={() => handleSubmit(true)}
            />
            <span className="sd-badge badge-teal">
              Question {currentIndex + 1} / {orderedQuestions.length}
            </span>
          </div>
        </div>

        <div className="sd-card-body">
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{activeQuestion.question}</div>
            {activeQuestion.prompt && (
              <div style={{ color: '#475569', fontSize: 14, marginBottom: 10 }}>
                {activeQuestion.prompt}
              </div>
            )}
            {activeQuestion.imageUrl && (
              <img
                src={activeQuestion.imageUrl}
                alt="Question reference"
                style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 12, marginBottom: 12, background: '#f8fafc' }}
              />
            )}
            <div style={{ color: '#64748b', fontSize: 13 }}>
              Marks: {activeQuestion.marks} · Type: {activeQuestion.type}
            </div>
          </div>

          {(activeQuestion.type === 'multiple-choice' || activeQuestion.type === 'true-false') && (
            <div style={{ display: 'grid', gap: 12 }}>
              {((activeQuestion.type === 'true-false' ? ['True', 'False'] : activeQuestion.options) || []).map((option, index) => {
                const optionValue = String(option);
                const checked = answers?.[activeQuestion.id] === optionValue;
                return (
                  <label
                    key={`${activeQuestion.id}_${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 14,
                      borderRadius: 12,
                      border: `2px solid ${checked ? '#7c3aed' : '#e2e8f0'}`,
                      background: checked ? '#7c3aed12' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name={activeQuestion.id}
                      checked={checked}
                      onChange={() => setAnswers((prev) => ({ ...prev, [activeQuestion.id]: optionValue }))}
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          )}

          {activeQuestion.type === 'checkbox' && (
            <div style={{ display: 'grid', gap: 12 }}>
              {(activeQuestion.options || []).map((option, index) => {
                const optionValue = String(option);
                const checked = selectedCheckboxAnswers.includes(optionValue);
                return (
                  <label
                    key={`${activeQuestion.id}_${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 14,
                      borderRadius: 12,
                      border: `2px solid ${checked ? '#7c3aed' : '#e2e8f0'}`,
                      background: checked ? '#7c3aed12' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setAnswers((prev) => {
                          const current = normalizeArrayAnswer(prev?.[activeQuestion.id]);
                          const next = checked
                            ? current.filter((item) => item !== optionValue)
                            : [...current, optionValue];
                          return { ...prev, [activeQuestion.id]: next };
                        });
                      }}
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          )}

          {activeQuestion.type === 'short-answer' && (
            <textarea
              value={answers?.[activeQuestion.id] || ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [activeQuestion.id]: e.target.value }))}
              placeholder="Type your short answer"
              style={{ width: '100%', minHeight: 90, padding: 12, borderRadius: 12, border: '2px solid #e2e8f0', resize: 'vertical' }}
            />
          )}

          {activeQuestion.type === 'essay' && (
            <textarea
              value={answers?.[activeQuestion.id] || ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [activeQuestion.id]: e.target.value }))}
              placeholder="Write your essay response"
              style={{ width: '100%', minHeight: 220, padding: 12, borderRadius: 12, border: '2px solid #e2e8f0', resize: 'vertical' }}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="sd-btn sd-btn-ghost"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
              >
                Previous
              </button>
              <button
                className="sd-btn sd-btn-white"
                onClick={() => setCurrentIndex((prev) => Math.min(orderedQuestions.length - 1, prev + 1))}
                disabled={currentIndex === orderedQuestions.length - 1}
              >
                Next
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {saving ? 'Saving progress...' : 'Progress saved automatically'}
              </span>
              <button className="sd-btn sd-btn-ghost" onClick={onExit} disabled={saving}>
                Exit
              </button>
              <button className="sd-btn sd-btn-primary" onClick={() => handleSubmit(false)} disabled={saving}>
                {saving ? <><i className="fas fa-circle-notch fa-spin"></i> Submitting...</> : 'Submit Exam'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ExamSecurityWrapper>
  );
};

export default QuizSession;
