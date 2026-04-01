import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StudentDatabaseLanding from './StudentDatabaseLanding';

export default function StudentDatabaseIntro() {
  const { isIndustry } = useAuth();
  const navigate = useNavigate();

  if (!isIndustry) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600">Only Industry users can access the student database.</p>
        </div>
      </div>
    );
  }

  return (
    <StudentDatabaseLanding
      onEnterDatabase={(payload = {}) => {
        const params = new URLSearchParams();

        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null && String(value).trim() !== '') {
            const normalizedKey = key === 'keyword' ? 'q' : key;
            params.set(normalizedKey, String(value).trim());
          }
        });

        const queryString = params.toString();
        navigate(`/student-database/browse${queryString ? `?${queryString}` : ''}`);
      }}
    />
  );
}
