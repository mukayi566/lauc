/**
 * Grade calculation logic for LAUC
 * @param {number} totalScore 
 * @returns {string} Grade (A, B+, B, C+, C, D, F)
 */
export const calculateGrade = (totalScore) => {
  if (totalScore >= 80) return 'A';
  if (totalScore >= 75) return 'B+';
  if (totalScore >= 70) return 'B';
  if (totalScore >= 65) return 'C+';
  if (totalScore >= 60) return 'C';
  if (totalScore >= 50) return 'D';
  return 'F';
};

/**
 * GPA point mapping
 * @param {string} grade 
 * @returns {number} Points
 */
export const getGradePoints = (grade) => {
  const points = {
    'A': 4.0,
    'B+': 3.5,
    'B': 3.0,
    'C+': 2.5,
    'C': 2.0,
    'D': 1.0,
    'F': 0.0
  };
  return points[grade] || 0.0;
};
