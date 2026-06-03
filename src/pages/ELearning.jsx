import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import StaffELearning from './StaffELearning';
import StudentELearning from './StudentELearning';

const ELearning = () => {
    const { userRole } = useAuth();

    if (userRole === 'staff') {
        return <StaffELearning />;
    }

    // Default to student view for students or any other role that might have access
    return <StudentELearning />;
};

export default ELearning;
