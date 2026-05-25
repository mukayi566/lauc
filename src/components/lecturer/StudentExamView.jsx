import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QuizSession from './QuizSession';
import {
  getExamQuestions,
  getRemainingTimeMs,
  getStudentExams,
  startOrResumeSubmission,
} from '../../services/examService';

const formatDate = (value) => {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const getExamAvailability = (exam) => {
  const now = Date.now();
  const start = exam.startDate ? new Date(exam.startDate).getTime() : 0;
  const end = exam.endDate ? new Date(exam.endDate).getTime() : 0;

  if (exam.submission?.status === 'submitted') return { label: 'Submitted', canStart: false, tone: 'badge-approved' };
  if (exam.status !== 'published') return { label: 'Draft', canStart: false, tone: 'badge-draft' };
  if (start && now < start) return { label: 'Upcoming', canStart: false, tone: 'badge-teal' };
  if (end && now > end) return { label: 'Closed', canStart: false, tone: 'badge-red' };
  if (exam.submission?.status === 'in-progress') return { label: 'Resume', canStart: true, tone: 'badge-gold' };
  return { label: 'Available', canStart: true, tone: 'badge-green' };
};

const StudentExamView = ({
  student,
  courses,
  courseCatalog = [],
  showError,
  showSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [activeQuestions, setActiveQuestions] = useState([]);

  const reload = useCallback(async () => {
    if (!student?.id) return;

    setLoading(true);
    try {
      const resolvedCourses = courses.map((course) => {
        const match = courseCatalog.find(
          (item) => item.docId === course.courseId
            || item.id === course.id
            || item.code === course.code
        );

        return match
          ? { ...course, docId: match.docId || match.id, courseId: match.docId || match.id, name: match.name || course.name }
          : course;
      });

      const loaded = await getStudentExams(resolvedCourses, student.uid || student.id);
      setExams(loaded);
    } catch (err) {
      console.error(err);
      showError?.('Could not load available exams.');
    } finally {
      setLoading(false);
    }
  }, [courseCatalog, courses, showError, student?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const availableCount = useMemo(
    () => exams.filter((exam) => getExamAvailability(exam).canStart).length,
    [exams]
  );

  const startExam = async (exam) => {
    try {
      const submission = await startOrResumeSubmission({
        courseId: exam.course.docId || exam.course.id,
        examId: exam.id,
        student,
      });

      if (submission?.status === 'submitted') {
        showError?.('This exam has already been submitted.');
        return;
      }

      const remaining = getRemainingTimeMs(submission?.startedAt, exam.durationMinutes);
      const questions = await getExamQuestions(exam.course.docId || exam.course.id, exam.id);

      setActiveQuestions(questions);
      setActiveSubmission(submission);
      setActiveExam(exam);

      if (remaining <= 0 && submission?.status === 'in-progress') {
        showError?.('This exam time has already elapsed. Opening submission review.');
      }
    } catch (err) {
      console.error(err);
      showError?.('Could not start exam.');
    }
  };

  if (activeExam && activeSubmission) {
    return (
      <QuizSession
        exam={activeExam}
        course={activeExam.course}
        student={student}
        questions={activeQuestions}
        submission={activeSubmission}
        showError={showError}
        onExit={() => {
          setActiveExam(null);
          setActiveSubmission(null);
          setActiveQuestions([]);
          reload();
        }}
        onComplete={(result, autoSubmitted) => {
          setActiveExam(null);
          setActiveSubmission(null);
          setActiveQuestions([]);
          showSuccess?.(
            result.manualReviewRequired
              ? 'Exam submitted. Some questions require manual marking.'
              : autoSubmitted
                ? `Exam auto-submitted. Score: ${result.score}/${result.totalMarks}`
                : `Exam submitted. Score: ${result.score}/${result.totalMarks}`
          );
          reload();
        }}
      />
    );
  }

  return (
    <div className="sd-tab-fade">
      <div className="sd-page-header">
        <div>
          <h2 className="sd-page-title">Online Exams & Quizzes</h2>
          <p className="sd-page-sub">
            {availableCount} available · {exams.length} total assessments across your courses
          </p>
        </div>
        <button className="sd-btn sd-btn-white" onClick={reload}>
          <i className="fas fa-rotate"></i> Refresh
        </button>
      </div>

      {loading ? (
        <div className="sd-card">
          <div className="sd-card-body" style={{ padding: 32, textAlign: 'center' }}>
            <i className="fas fa-circle-notch fa-spin" style={{ marginRight: 10 }}></i>
            Loading exams...
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 18 }}>
          {exams.length === 0 && (
            <div className="sd-card">
              <div className="sd-card-body" style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                No online exams or quizzes have been assigned yet.
              </div>
            </div>
          )}

          {exams.map((exam) => {
            const availability = getExamAvailability(exam);
            return (
              <div key={`${exam.course.docId || exam.course.id}_${exam.id}`} className="sd-card">
                <div className="sd-card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0 }}>{exam.title}</h3>
                        <span className={`sd-badge ${availability.tone}`}>{availability.label}</span>
                        <span className="sd-code">{exam.type}</span>
                      </div>
                      <p style={{ margin: '8px 0', color: '#64748b' }}>
                        {(exam.course.code || exam.course.id)} - {exam.course.name}
                      </p>
                      <p style={{ margin: 0, color: '#475569' }}>{exam.description || 'No additional instructions.'}</p>
                    </div>

                    <div style={{ minWidth: 260 }}>
                      <div style={{ display: 'grid', gap: 6, fontSize: 13, color: '#475569' }}>
                        <div><strong>Start:</strong> {formatDate(exam.startDate)}</div>
                        <div><strong>End:</strong> {formatDate(exam.endDate)}</div>
                        <div><strong>Duration:</strong> {exam.durationMinutes} minutes</div>
                        <div><strong>Total Marks:</strong> {exam.totalMarks}</div>
                        <div><strong>Anti-cheat:</strong> {exam.antiCheat ? 'Enabled' : 'Disabled'}</div>
                        {exam.submission && (
                          <div><strong>Progress:</strong> {exam.submission.status} · Violations: {exam.submission.violationCount || 0}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                    <div style={{ color: '#64748b', fontSize: 13 }}>
                      {exam.antiCheat ? 'Fullscreen and focus monitoring will be enforced.' : 'Standard exam mode.'}
                    </div>
                    <button
                      className="sd-btn sd-btn-primary"
                      onClick={() => startExam(exam)}
                      disabled={!availability.canStart}
                    >
                      <i className={`fas ${exam.submission?.status === 'in-progress' ? 'fa-play-circle' : 'fa-file-pen'}`}></i>{' '}
                      {exam.submission?.status === 'in-progress' ? 'Resume' : 'Start'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentExamView;
