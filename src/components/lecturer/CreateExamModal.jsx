import React, { useMemo, useState } from 'react';

const defaultForm = {
  courseId: '',
  title: '',
  type: 'quiz',
  description: '',
  durationMinutes: 30,
  totalMarks: 100,
  startDate: '',
  endDate: '',
  status: 'draft',
  antiCheat: true,
  shuffleQuestions: true,
};

const toDateTimeLocalValue = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const computeEndDate = (startDate, durationMinutes) => {
  if (!startDate || !durationMinutes) return '';
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start.getTime() + Number(durationMinutes) * 60 * 1000);
  return toDateTimeLocalValue(end);
};

const buildInitialForm = (initialExam, courses) => {
  if (initialExam) {
    return {
      courseId: initialExam.courseId || initialExam.course?.docId || '',
      title: initialExam.title || '',
      type: initialExam.type || 'quiz',
      description: initialExam.description || '',
      durationMinutes: initialExam.durationMinutes || 30,
      totalMarks: initialExam.totalMarks || 100,
      startDate: initialExam.startDate || '',
      endDate: initialExam.endDate || '',
      status: initialExam.status || 'draft',
      antiCheat: initialExam.antiCheat !== false,
      shuffleQuestions: initialExam.shuffleQuestions !== false,
    };
  }

  return {
    ...defaultForm,
    courseId: courses[0]?.docId || '',
  };
};

const CreateExamModalContent = ({
  onClose,
  onSave,
  courses,
  saving,
  initialExam,
}) => {
  const [form, setForm] = useState(() => buildInitialForm(initialExam, courses));
  const [endDateManuallyChanged, setEndDateManuallyChanged] = useState(false);

  const autoCalculatedEndDate = useMemo(
    () => computeEndDate(form.startDate, form.durationMinutes),
    [form.startDate, form.durationMinutes]
  );

  const displayedEndDate = endDateManuallyChanged ? form.endDate : (autoCalculatedEndDate || form.endDate);

  const updateForm = (updater) => {
    setForm((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (endDateManuallyChanged) return next;

      return {
        ...next,
        endDate: computeEndDate(next.startDate, next.durationMinutes) || next.endDate,
      };
    });
  };

  return (
    <div className="sd-modal-overlay" onClick={onClose}>
      <div className="sd-modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div className="sd-modal-head">
          <h3>
            <i className="fas fa-file-signature"></i> {initialExam ? 'Edit Exam' : 'Create Exam or Quiz'}
          </h3>
          <button className="sd-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
          className="sd-modal-form"
        >
          <label>Course</label>
          <select
            value={form.courseId}
            onChange={(e) => updateForm((prev) => ({ ...prev, courseId: e.target.value }))}
            required
          >
            <option value="">Select course</option>
            {courses.map((course) => (
              <option key={course.docId || course.id} value={course.docId || course.id}>
                {(course.code || course.id)} - {course.name}
              </option>
            ))}
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Week 4 Quiz"
                required
              />
            </div>
            <div>
              <label>Type</label>
              <select
                value={form.type}
                onChange={(e) => updateForm((prev) => ({ ...prev, type: e.target.value }))}
              >
                <option value="quiz">Quiz</option>
                <option value="exam">Exam</option>
              </select>
            </div>
          </div>

          <label>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => updateForm((prev) => ({ ...prev, description: e.target.value }))}
            style={{ padding: 12, borderRadius: 10, border: '2px solid #e2e8f0', minHeight: 100, resize: 'vertical' }}
            placeholder="Outline the scope or instructions."
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label>Duration (minutes)</label>
              <input
                type="number"
                min="1"
                value={form.durationMinutes}
                onChange={(e) => updateForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                required
              />
            </div>
            <div>
              <label>Total Marks</label>
              <input
                type="number"
                min="1"
                value={form.totalMarks}
                onChange={(e) => updateForm((prev) => ({ ...prev, totalMarks: e.target.value }))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label>Start Date & Time</label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => {
                  setEndDateManuallyChanged(false);
                  updateForm((prev) => ({ ...prev, startDate: e.target.value }));
                }}
                required
              />
            </div>
            <div>
              <label>End Date & Time</label>
              <input
                type="datetime-local"
                value={displayedEndDate}
                onChange={(e) => {
                  setEndDateManuallyChanged(true);
                  setForm((prev) => ({ ...prev, endDate: e.target.value }));
                }}
                required
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {endDateManuallyChanged
                    ? 'Using your manual end time.'
                    : 'Auto-calculated from start time + duration.'}
                </span>
                <button
                  type="button"
                  className="sd-link-btn"
                  onClick={() => {
                    setEndDateManuallyChanged(false);
                    setForm((prev) => ({
                      ...prev,
                      endDate: computeEndDate(prev.startDate, prev.durationMinutes) || prev.endDate,
                    }));
                  }}
                >
                  Reset to auto
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
              <input
                type="checkbox"
                checked={form.antiCheat}
                onChange={(e) => updateForm((prev) => ({ ...prev, antiCheat: e.target.checked }))}
              />
              Enable anti-cheat protection
            </label>

            <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
              <input
                type="checkbox"
                checked={form.shuffleQuestions}
                onChange={(e) => updateForm((prev) => ({ ...prev, shuffleQuestions: e.target.checked }))}
              />
              Shuffle questions for students
            </label>
          </div>

          <div className="sd-modal-actions">
            <button type="button" className="sd-btn sd-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="sd-btn sd-btn-primary" disabled={saving}>
              {saving
                ? <><i className="fas fa-circle-notch fa-spin"></i> Saving...</>
                : initialExam ? 'Save Changes' : 'Create Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateExamModal = ({
  isOpen,
  onClose,
  onSave,
  courses,
  saving,
  initialExam,
}) => {
  if (!isOpen) return null;

  const modalKey = `${initialExam?.id || 'new'}_${courses[0]?.docId || 'none'}`;

  return (
    <CreateExamModalContent
      key={modalKey}
      onClose={onClose}
      onSave={onSave}
      courses={courses}
      saving={saving}
      initialExam={initialExam}
    />
  );
};

export default CreateExamModal;
