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
      <div className="sd-modal" style={{ maxWidth: 800, width: '95%', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div className="sd-modal-head" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-file-signature" style={{ color: 'var(--primary-color)', marginRight: 10 }}></i> 
            {initialExam ? 'Edit Assessment' : 'New Assessment'}
          </h3>
          <button className="sd-close-btn" onClick={onClose} style={{ background: '#f1f5f9', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
          className="sd-modal-form"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <div className="sd-modal-body" style={{ padding: '24px', background: '#fff' }}>
            {/* Section: Basic Information */}
            <div style={{ marginBottom: 30 }}>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-info-circle"></i> Basic Information
              </h4>
              
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label className="sd-modal-form label" style={{ marginTop: 0 }}>Course Assignment</label>
                  <select
                    value={form.courseId}
                    onChange={(e) => updateForm((prev) => ({ ...prev, courseId: e.target.value }))}
                    className="sd-input"
                    required
                  >
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option key={course.docId || course.id} value={course.docId || course.id}>
                        {(course.code || course.id)} - {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
                  <div>
                    <label className="sd-modal-form label" style={{ marginTop: 0 }}>Assessment Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => updateForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="sd-input"
                      placeholder="e.g. Mid-term Examination"
                      required
                    />
                  </div>
                  <div>
                    <label className="sd-modal-form label" style={{ marginTop: 0 }}>Category</label>
                    <select
                      value={form.type}
                      onChange={(e) => updateForm((prev) => ({ ...prev, type: e.target.value }))}
                      className="sd-input"
                    >
                      <option value="quiz">Quiz</option>
                      <option value="exam">Exam</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="sd-modal-form label" style={{ marginTop: 0 }}>Description & Instructions</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="sd-input"
                    style={{ minHeight: 100, resize: 'vertical' }}
                    placeholder="Provide students with the scope and rules of this assessment."
                  />
                </div>
              </div>
            </div>

            {/* Section: Schedule & Scoring */}
            <div style={{ marginBottom: 30 }}>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-clock"></i> Schedule & Scoring
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label className="sd-modal-form label" style={{ marginTop: 0 }}>Time Limit (Minutes)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="1"
                      value={form.durationMinutes}
                      onChange={(e) => updateForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                      className="sd-input"
                      style={{ paddingLeft: 40 }}
                      required
                    />
                    <i className="fas fa-hourglass-half" style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                  </div>
                </div>
                <div>
                  <label className="sd-modal-form label" style={{ marginTop: 0 }}>Total Grade Points</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="1"
                      value={form.totalMarks}
                      onChange={(e) => updateForm((prev) => ({ ...prev, totalMarks: e.target.value }))}
                      className="sd-input"
                      style={{ paddingLeft: 40 }}
                      required
                    />
                    <i className="fas fa-star" style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label className="sd-modal-form label" style={{ marginTop: 0 }}>Window Opens</label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => {
                      setEndDateManuallyChanged(false);
                      updateForm((prev) => ({ ...prev, startDate: e.target.value }));
                    }}
                    className="sd-input"
                    required
                  />
                </div>
                <div>
                  <label className="sd-modal-form label" style={{ marginTop: 0 }}>Window Closes</label>
                  <input
                    type="datetime-local"
                    value={displayedEndDate}
                    onChange={(e) => {
                      setEndDateManuallyChanged(true);
                      setForm((prev) => ({ ...prev, endDate: e.target.value }));
                    }}
                    className="sd-input"
                    required
                  />
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: endDateManuallyChanged ? '#f59e0b' : '#64748b', fontWeight: 500 }}>
                      <i className={`fas ${endDateManuallyChanged ? 'fa-hand-paper' : 'fa-magic'}`}></i> {endDateManuallyChanged ? 'Manual override' : 'Auto-calculated'}
                    </span>
                    {endDateManuallyChanged && (
                      <button
                        type="button"
                        className="sd-link-btn"
                        style={{ fontSize: 11 }}
                        onClick={() => {
                          setEndDateManuallyChanged(false);
                          setForm((prev) => ({
                            ...prev,
                            endDate: computeEndDate(prev.startDate, prev.durationMinutes) || prev.endDate,
                          }));
                        }}
                      >
                        Reset to Auto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Assessment Settings */}
            <div>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-cog"></i> Security & Experience
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', gap: 12, cursor: 'pointer' }}>
                  <div style={{ marginTop: 3 }}>
                    <input
                      type="checkbox"
                      checked={form.antiCheat}
                      onChange={(e) => updateForm((prev) => ({ ...prev, antiCheat: e.target.checked }))}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>Anti-Cheat Protection</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Locks student window and tracks violations.</div>
                  </div>
                </label>

                <label style={{ display: 'flex', gap: 12, cursor: 'pointer' }}>
                  <div style={{ marginTop: 3 }}>
                    <input
                      type="checkbox"
                      checked={form.shuffleQuestions}
                      onChange={(e) => updateForm((prev) => ({ ...prev, shuffleQuestions: e.target.checked }))}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>Shuffle Questions</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Randomize question order for each student.</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="sd-modal-actions" style={{ padding: '20px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', margin: 0, justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="sd-btn sd-btn-ghost" onClick={onClose} style={{ padding: '10px 24px' }}>Cancel</button>
            <button type="submit" className="sd-btn sd-btn-primary" disabled={saving} style={{ padding: '10px 32px', minWidth: 160 }}>
              {saving
                ? <><i className="fas fa-circle-notch fa-spin"></i> Processing...</>
                : initialExam ? 'Update Details' : 'Initialize Assessment'}
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
