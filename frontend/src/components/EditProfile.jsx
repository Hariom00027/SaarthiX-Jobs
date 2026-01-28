import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/apiConfig';

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, updateAuth, isAuthenticated, loading } = useAuth();
  const [selectedUserType, setSelectedUserType] = useState(user?.userType || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/');
      return;
    }
    
    // Prevent applicants from changing their role
    if (isAuthenticated && user?.userType === 'APPLICANT') {
      console.log('[EDIT_PROFILE] Applicant attempted to change role - redirecting to apply-jobs');
      navigate('/apply-jobs');
      return;
    }
  }, [loading, isAuthenticated, navigate, user]);

  useEffect(() => {
    if (user?.userType) {
      setSelectedUserType(user.userType);
    }
  }, [user]);

  const handleSave = async () => {
    // Prevent applicants from changing their role
    if (user?.userType === 'APPLICANT') {
      setError('Applicants cannot change their role. Please contact support if you need assistance.');
      return;
    }
    
    if (!selectedUserType) {
      setError('Please select a user type');
      return;
    }

    if (selectedUserType === user?.userType) {
      setError('No changes to save');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`${API_BASE_URL}/user/update-profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userType: selectedUserType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      // Update auth context with new user type
      updateAuth({
        ...user,
        userType: selectedUserType,
        authenticated: true,
      });

      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="mb-4 text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2 text-sm"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="mt-2 text-gray-600 text-sm">
            Update your user type to change your account permissions
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          {/* User Info Display */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <div className="flex items-center gap-4 mb-4">
              <img 
                src={user?.picture} 
                alt={user?.name}
                className="w-16 h-16 rounded-full border border-gray-300"
              />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{user?.name}</h2>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-1">Current User Type:</p>
              <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-md text-sm font-medium">
                {user?.userType === 'INDUSTRY' ? 'Industry' : 'Job Seeker'}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 text-sm">
              ✅ Profile updated successfully! Redirecting...
            </div>
          )}

          {/* User Type Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Select Your User Type *
            </label>
            <div className="grid md:grid-cols-2 gap-6">
              {/* APPLICANT Option */}
              <div
                onClick={() => setSelectedUserType('APPLICANT')}
                className={`cursor-pointer rounded-lg border-2 p-6 transition-all ${
                  selectedUserType === 'APPLICANT'
                    ? 'border-gray-800 bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-gray-400'
                }`}
              >
                <div className="text-4xl mb-4">👤</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Job Seeker</h2>
                <p className="text-gray-600 text-sm mb-4">
                  Browse and apply to job opportunities posted by companies.
                </p>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>✓ Browse job listings</li>
                  <li>✓ Apply to jobs</li>
                  <li>✓ Track applications</li>
                </ul>
                {selectedUserType === 'APPLICANT' && (
                  <div className="mt-4 text-gray-800 font-semibold">✓ Selected</div>
                )}
              </div>

              {/* INDUSTRY Option */}
              <div
                onClick={() => setSelectedUserType('INDUSTRY')}
                className={`cursor-pointer rounded-lg border-2 p-6 transition-all ${
                  selectedUserType === 'INDUSTRY'
                    ? 'border-gray-800 bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-gray-400'
                }`}
              >
                <div className="text-4xl mb-4">🏢</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Industry</h2>
                <p className="text-gray-600 text-sm mb-4">
                  Post job openings and find talented candidates for your company.
                </p>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>✓ Post job listings</li>
                  <li>✓ Apply to jobs</li>
                  <li>✓ Review applicants</li>
                </ul>
                {selectedUserType === 'INDUSTRY' && (
                  <div className="mt-4 text-gray-800 font-semibold">✓ Selected</div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/')}
              disabled={saving}
              className="flex-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-900 font-semibold py-3 px-6 transition disabled:cursor-not-allowed text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedUserType || saving || selectedUserType === user?.userType}
              className="flex-1 rounded-md bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold py-3 px-6 transition disabled:cursor-not-allowed text-sm"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

