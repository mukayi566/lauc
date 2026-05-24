import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { calculateGrade, getGradePoints } from '../utils/resultUtils';

const subjectiveQuestionTypes = new Set(['essay']);

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

const normalizeAnswerValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean).sort();
  }
  return normalizeText(value);
};

const isQuestionAutoGradable = (question) => !subjectiveQuestionTypes.has(question.type);

const evaluateQuestion = (question, rawAnswer) => {
  if (rawAnswer == null || rawAnswer === '' || (Array.isArray(rawAnswer) && rawAnswer.length === 0)) {
    return { awardedMarks: 0, autoGradable: isQuestionAutoGradable(question), answered: false };
  }

  if (!isQuestionAutoGradable(question)) {
    return { awardedMarks: 0, autoGradable: false, answered: true };
  }

  const marks = Number(question.marks) || 0;
  const correctAnswer = normalizeAnswerValue(question.correctAnswer);
  const answer = normalizeAnswerValue(rawAnswer);

  let isCorrect = false;

  switch (question.type) {
    case 'multiple-choice':
    case 'true-false':
    case 'short-answer':
      isCorrect = answer && answer === correctAnswer;
      break;
    case 'checkbox':
      isCorrect = Array.isArray(answer)
        && Array.isArray(correctAnswer)
        && answer.length === correctAnswer.length
        && answer.every((item, index) => item === correctAnswer[index]);
      break;
    default:
      isCorrect = answer && answer === correctAnswer;
      break;
  }

  return {
    awardedMarks: isCorrect ? marks : 0,
    autoGradable: true,
    answered: true,
  };
};

const examsCollection = (courseId) => collection(db, 'courses', courseId, 'exams');
const examDoc = (courseId, examId) => doc(db, 'courses', courseId, 'exams', examId);
const questionsCollection = (courseId, examId) => collection(db, 'courses', courseId, 'exams', examId, 'questions');
const questionDoc = (courseId, examId, questionId) => doc(db, 'courses', courseId, 'exams', examId, 'questions', questionId);
const submissionsCollection = (courseId, examId) => collection(db, 'courses', courseId, 'exams', examId, 'submissions');
const submissionDoc = (courseId, examId, studentId) => doc(db, 'courses', courseId, 'exams', examId, 'submissions', studentId);

const mapSnapshotDocs = (snap, extra = {}) =>
  snap.docs.map((item) => ({ id: item.id, ...extra, ...item.data() }));

const sortByStartDateDesc = (items) =>
  [...items].sort((a, b) => {
    const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
    const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
    return bTime - aTime;
  });

export const createExam = async ({ course, lecturerId, data }) => {
  const payload = {
    courseId: course.docId || course.id,
    courseCode: course.code || course.id || '',
    courseName: course.name || '',
    lecturerId,
    title: data.title?.trim() || '',
    type: data.type || 'quiz',
    description: data.description?.trim() || '',
    durationMinutes: Number(data.durationMinutes) || 30,
    totalMarks: Number(data.totalMarks) || 100,
    startDate: data.startDate || '',
    endDate: data.endDate || '',
    status: data.status || 'draft',
    antiCheat: data.antiCheat !== false,
    shuffleQuestions: data.shuffleQuestions !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  return addDoc(examsCollection(payload.courseId), payload);
};

export const updateExam = async (courseId, examId, data) => {
  await updateDoc(examDoc(courseId, examId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const publishExam = async (courseId, examId) => {
  await updateExam(courseId, examId, { status: 'published' });
};

export const addQuestion = async (courseId, examId, data) => {
  await addDoc(questionsCollection(courseId, examId), {
    question: data.question?.trim() || '',
    prompt: data.prompt?.trim() || '',
    type: data.type || 'multiple-choice',
    options: Array.isArray(data.options) ? data.options : [],
    correctAnswer: data.correctAnswer ?? '',
    imageUrl: data.imageUrl || '',
    marks: Number(data.marks) || 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateQuestion = async (courseId, examId, questionId, data) => {
  await updateDoc(questionDoc(courseId, examId, questionId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteQuestion = async (courseId, examId, questionId) => {
  await deleteDoc(questionDoc(courseId, examId, questionId));
};

export const subscribeToExamQuestions = (courseId, examId, onData, onError) =>
  onSnapshot(
    query(questionsCollection(courseId, examId), orderBy('createdAt', 'asc')),
    (snap) => onData(mapSnapshotDocs(snap)),
    onError
  );

export const subscribeToExamSubmissions = (courseId, examId, onData, onError) =>
  onSnapshot(
    query(submissionsCollection(courseId, examId), orderBy('startedAt', 'desc')),
    (snap) => onData(mapSnapshotDocs(snap)),
    onError
  );

export const subscribeToLecturerExams = (courses, onData, onError) => {
  if (!Array.isArray(courses) || courses.length === 0) {
    onData([]);
    return () => {};
  }

  const byCourse = new Map();
  const unsubs = courses
    .filter((course) => course?.docId || course?.id)
    .map((course) => {
      const courseId = course.docId || course.id;
      return onSnapshot(
        query(examsCollection(courseId), orderBy('createdAt', 'desc')),
        (snap) => {
          byCourse.set(courseId, mapSnapshotDocs(snap, { course }));
          onData(sortByStartDateDesc(Array.from(byCourse.values()).flat()));
        },
        onError
      );
    });

  return () => unsubs.forEach((unsub) => unsub());
};

export const getExamQuestions = async (courseId, examId) => {
  const snap = await getDocs(query(questionsCollection(courseId, examId), orderBy('createdAt', 'asc')));
  return mapSnapshotDocs(snap);
};

export const getSubmission = async (courseId, examId, studentId) => {
  const snap = await getDoc(submissionDoc(courseId, examId, studentId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const getStudentExams = async (studentCourses, studentId) => {
  const items = [];

  for (const course of studentCourses) {
    const courseId = course.docId || course.courseId || course.id;
    if (!courseId) continue;

    const snap = await getDocs(query(examsCollection(courseId), orderBy('createdAt', 'desc')));
    for (const examSnap of snap.docs) {
      const submissionSnap = await getDoc(submissionDoc(courseId, examSnap.id, studentId));
      items.push({
        id: examSnap.id,
        course,
        ...examSnap.data(),
        submission: submissionSnap.exists() ? { id: submissionSnap.id, ...submissionSnap.data() } : null,
      });
    }
  }

  return sortByStartDateDesc(items);
};

export const startOrResumeSubmission = async ({ courseId, examId, student }) => {
  const ref = submissionDoc(courseId, examId, student.id);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    return { id: existing.id, ...existing.data() };
  }

  await setDoc(ref, {
    studentId: student.id,
    studentName: student.name || '',
    studentNumber: student.studentId || student.student_id || student.id,
    startedAt: serverTimestamp(),
    submittedAt: null,
    score: 0,
    autoSubmitted: false,
    status: 'in-progress',
    answers: {},
    questionOrder: [],
    currentQuestionIndex: 0,
    violationCount: 0,
    violationHistory: [],
    updatedAt: serverTimestamp(),
  });

  const created = await getDoc(ref);
  return created.exists() ? { id: created.id, ...created.data() } : null;
};

export const saveSubmissionProgress = async (courseId, examId, studentId, data) => {
  await setDoc(
    submissionDoc(courseId, examId, studentId),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const incrementViolation = async (courseId, examId, studentId, currentCount, reason) => {
  const nextCount = Number(currentCount || 0) + 1;
  const existing = await getSubmission(courseId, examId, studentId);
  const history = Array.isArray(existing?.violationHistory) ? existing.violationHistory : [];

  await saveSubmissionProgress(courseId, examId, studentId, {
    violationCount: nextCount,
    latestViolation: reason,
    violationHistory: [
      ...history,
      {
        reason,
        at: new Date().toISOString(),
      },
    ],
  });

  return nextCount;
};

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getRemainingTimeMs = (startedAt, durationMinutes) => {
  const startedAtMs = toMillis(startedAt);
  if (!startedAtMs || !durationMinutes) return 0;
  const endAtMs = startedAtMs + Number(durationMinutes) * 60 * 1000;
  return Math.max(0, endAtMs - Date.now());
};

export const submitExam = async ({
  course,
  exam,
  student,
  answers,
  autoSubmitted = false,
  violationCount = 0,
}) => {
  const courseId = course.docId || course.courseId || course.id;
  const questions = await getExamQuestions(courseId, exam.id);

  let score = 0;
  let autoGradableMarks = 0;
  let answeredCount = 0;
  let manualReviewRequired = false;
  const questionBreakdown = [];

  for (const question of questions) {
    const rawAnswer = answers?.[question.id];
    const evaluation = evaluateQuestion(question, rawAnswer);

    if (evaluation.answered) {
      answeredCount += 1;
    }

    if (evaluation.autoGradable) {
      autoGradableMarks += Number(question.marks) || 0;
      score += evaluation.awardedMarks;
    } else {
      manualReviewRequired = true;
    }

    questionBreakdown.push({
      questionId: question.id,
      type: question.type,
      awardedMarks: evaluation.awardedMarks,
      maxMarks: Number(question.marks) || 0,
      autoGradable: evaluation.autoGradable,
    });
  }

  const totalMarks = Number(exam.totalMarks) || questions.reduce((sum, item) => sum + (Number(item.marks) || 0), 0) || 100;
  const gradableBase = autoGradableMarks > 0 ? autoGradableMarks : totalMarks;
  const percentage = gradableBase > 0 ? Math.round((score / gradableBase) * 100) : 0;
  const grade = calculateGrade(percentage);

  await setDoc(
    submissionDoc(courseId, exam.id, student.id),
    {
      studentId: student.id,
      studentName: student.name || '',
      studentNumber: student.studentId || student.student_id || student.id,
      submittedAt: serverTimestamp(),
      score,
      percentage,
      autoSubmitted,
      status: 'submitted',
      answers: answers || {},
      answeredCount,
      questionBreakdown,
      manualReviewRequired,
      violationCount: Number(violationCount || 0),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    doc(db, 'results', `exam_${exam.id}_${student.id}`),
    {
      studentId: student.id,
      studentName: student.name || '',
      studentRegNo: student.studentId || student.student_id || student.id,
      courseId,
      courseCode: exam.courseCode || course.code || course.id || '',
      courseName: exam.courseName || course.name || '',
      caScore: exam.type === 'quiz' ? percentage : 0,
      examScore: exam.type === 'exam' ? percentage : 0,
      total: percentage,
      rawScore: score,
      autoGradableMarks,
      totalMarks,
      grade,
      gpa: getGradePoints(grade),
      status: 'submitted',
      submittedBy: exam.lecturerId,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      semester: course.semester || exam.semester || '',
      assessmentType: exam.type,
      examId: exam.id,
      examTitle: exam.title || '',
      autoSubmitted,
      manualReviewRequired,
      violationCount: Number(violationCount || 0),
    },
    { merge: true }
  );

  return { score, percentage, totalMarks, grade, manualReviewRequired };
};
