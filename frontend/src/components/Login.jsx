import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loginWithGoogle } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { role } = useParams(); // Get role from URL: /login/industry or /login/applicant
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1 = role selection, 2 = sign in

  // If role is in URL, use it
  useEffect(() => {
    if (role === 'industry') {
      setSelectedRole('INDUSTRY');
      setStep(2);
      console.log('[LOGIN] Role from URL: industry');
    } else if (role === 'applicant') {
      setSelectedRole('APPLICANT');
      setStep(2);
      console.log('[LOGIN] Role from URL: applicant');
    }
  }, [role]);

  useEffect(() => {
    console.log('[LOGIN] Auth State:', {
      authLoading,
      isAuthenticated,
      userType: user?.userType,
      email: user?.email
    });
  }, [authLoading, isAuthenticated, user]);

  // Pre-select user's current role if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.userType) {
      // Pre-select their current role so they can see what they are
      setSelectedRole(user.userType);
      console.log('[LOGIN] Pre-selecting role:', user.userType);
      // Don't redirect - let them try to change roles if they want
      console.log('[LOGIN] User already authenticated as:', user.userType);
    }
  }, [isAuthenticated, user, authLoading]);

  const handleRoleSelection = () => {
    if (!selectedRole) {
      setError('Please select a role to continue');
      return;
    }
    
    // Navigate to /login/role to preserve selection in URL
    const roleUrl = selectedRole === 'APPLICANT' ? 'applicant' : 'industry';
    console.log('[LOGIN] Navigating to /login/' + roleUrl);
    navigate(`/login/${roleUrl}`);
    
    setError(null);
  };

  const handleLogin = () => {
    console.log('[LOGIN] handleLogin called', {
      selectedRole,
      isAuthenticated,
      userType: user?.userType,
      userEmail: user?.email
    });

    if (!selectedRole) {
      setError('Please select a role before signing in');
      return;
    }

    // Check if user is already logged in with a different role
    console.log('[LOGIN] Checking role mismatch:', {
      isAuthenticated,
      hasUser: !!user,
      hasUserType: !!user?.userType,
      userType: user?.userType,
      selectedRole,
      isMatch: user?.userType === selectedRole
    });

    if (isAuthenticated && user && user.userType && user.userType !== selectedRole) {
      let errorMsg;
      if (user.userType === 'APPLICANT') {
        errorMsg = '❌ Role Mismatch Error\n\nYou are only allowed to be a Job Seeker (Applicant) because you are registered as an Applicant.\n\nYou cannot login as an Industry account.\n\nTo register as Industry, please logout first and create a new account with a different email address.';
      } else {
        errorMsg = '❌ Role Mismatch Error\n\nYou are only allowed to be an Industry account because you are registered as Industry.\n\nYou cannot login as a Job Seeker (Applicant).\n\nTo register as Applicant, please logout first and create a new account with a different email address.';
      }
      console.log('[LOGIN] ROLE MISMATCH DETECTED! Setting error:', errorMsg);
      setError(errorMsg);
      return;
    }

    // Store role from URL/selection in localStorage for later comparison
    const roleIntent = selectedRole === 'APPLICANT' ? 'applicant' : 'industry';
    localStorage.setItem('loginIntent', roleIntent);
    
    // Set redirect route based on role
    if (selectedRole === 'APPLICANT') {
      localStorage.setItem('redirectRoute', 'apply-jobs');
    } else {
      localStorage.setItem('redirectRoute', 'post-jobs');
    }

    console.log('[LOGIN] URL: /login/' + roleIntent);
    console.log('[LOGIN] Stored intent: ' + roleIntent);
    console.log('[LOGIN] Initiating Google OAuth...');
    
    // Initiate Google login
    loginWithGoogle();
  };

  const handleBackToRoleSelection = () => {
    setStep(1);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center px-4 py-12">
      {/* DEBUG PANEL - REMOVE LATER
      <div className="fixed top-4 right-4 bg-yellow-100 border-2 border-yellow-400 p-3 rounded text-xs max-w-xs z-50">
        <p className="font-bold mb-1">🔍 Debug Info</p>
        <p>Auth Loading: {authLoading ? 'YES' : 'NO'}</p>
        <p>Authenticated: {isAuthenticated ? 'YES' : 'NO'}</p>
        <p>User Type: {user?.userType || 'NONE'}</p>
        <p>Selected Role: {selectedRole || 'NONE'}</p>
        <p>Step: {step}</p>
        <p>Has Error: {error ? 'YES' : 'NO'}</p>
      </div> */}

      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-900 mb-6 shadow-lg">
              <span className="text-3xl">💼</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
              {step === 1 ? 'Welcome to Saarthix Jobs' : 'Sign in with Google'}
            </h1>
            <p className="text-gray-600 text-lg">
              {step === 1 
                ? 'Choose your role to get started' 
                : `You selected: ${selectedRole === 'APPLICANT' ? 'Job Seeker' : 'Industry'}. Sign in to continue.`}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                step >= 1 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? 'bg-gray-900' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                step >= 2 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
            </div>
          </div>

          {/* Error Message - VERY PROMINENT */}
          {error && (
            <div className="mb-6 rounded-xl border-4 border-red-500 bg-red-100 p-6 text-red-900 shadow-2xl animate-pulse">
              <div className="flex items-start gap-4">
                <svg className="w-8 h-8 text-red-700 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <div className="flex-1">
                  <p className="font-bold text-lg mb-3">🚫 ROLE MISMATCH ERROR 🚫</p>
                  <p className="text-base whitespace-pre-wrap font-semibold leading-relaxed">{error}</p>
                  <p className="mt-4 text-sm bg-red-200 p-3 rounded font-bold">
                    👉 Click the logout button in your profile (top right) to change roles
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Role Selection */}
          {step === 1 && (
            <>
              {/* Show current role if authenticated */}
              {isAuthenticated && user?.userType && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Currently Registered As:</strong> {user.userType === 'APPLICANT' ? '👤 Job Seeker (Applicant)' : '🏢 Industry'}
                  </p>
                </div>
              )}

              {/* Role Selection Cards */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* APPLICANT Option */}
            <div
              onClick={() => {
                setSelectedRole('APPLICANT');
                setError(null);
              }}
              className={`cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 ${
                selectedRole === 'APPLICANT'
                  ? 'border-gray-900 bg-gray-50 shadow-md scale-105'
                  : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-lg'
              } ${isAuthenticated && user?.userType === 'APPLICANT' && selectedRole === 'INDUSTRY' ? 'ring-2 ring-red-500' : ''}`}
            >
              <div className="text-5xl mb-4 text-center">👤</div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">
                I'm a Job Seeker
              </h2>
              <p className="text-gray-600 text-sm mb-4 text-center">
                Browse and apply to job opportunities posted by companies.
              </p>
              {/* Badge showing if user is registered as this role */}
              {isAuthenticated && user?.userType === 'APPLICANT' && (
                <div className="mb-3 inline-block bg-green-100 border-2 border-green-500 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                  ✓ YOUR REGISTERED ROLE
                </div>
              )}
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Browse job listings
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Apply to jobs
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Track applications
                </li>
              </ul>
              {selectedRole === 'APPLICANT' && (
                <div className="mt-4 text-center">
                  <span className="inline-flex items-center gap-2 text-gray-800 font-semibold text-sm">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Selected
                  </span>
                </div>
              )}
            </div>

            {/* INDUSTRY Option */}
            <div
              onClick={() => {
                setSelectedRole('INDUSTRY');
                setError(null);
              }}
              className={`cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 ${
                selectedRole === 'INDUSTRY'
                  ? 'border-gray-900 bg-gray-50 shadow-md scale-105'
                  : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-lg'
              }`}
            >
              <div className="text-5xl mb-4 text-center">🏢</div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">
                I'm Hiring (Industry)
              </h2>
              <p className="text-gray-600 text-sm mb-4 text-center">
                Post job openings and find talented candidates for your company.
              </p>
              {/* Badge showing if user is registered as this role */}
              {isAuthenticated && user?.userType === 'INDUSTRY' && (
                <div className="mb-3 inline-block bg-green-100 border-2 border-green-500 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                  ✓ YOUR REGISTERED ROLE
                </div>
              )}
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Post job listings
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Manage openings
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Review applicants
                </li>
              </ul>
              {selectedRole === 'INDUSTRY' && (
                <div className="mt-4 text-center">
                  <span className="inline-flex items-center gap-2 text-gray-800 font-semibold text-sm">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Selected
                  </span>
                </div>
              )}
            </div>
              </div>

              {/* Continue Button */}
              <button
                onClick={handleRoleSelection}
                disabled={!selectedRole}
                className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                Continue
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Step 2: Sign In */}
          {step === 2 && (
            <>
              <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-center mb-4">
                  <div className={`text-6xl mb-2 ${selectedRole === 'APPLICANT' ? '' : ''}`}>
                    {selectedRole === 'APPLICANT' ? '👤' : '🏢'}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  {selectedRole === 'APPLICANT' ? 'Job Seeker' : 'Industry'}
                </h3>
                <p className="text-gray-600 text-center text-sm">
                  {selectedRole === 'APPLICANT' 
                    ? 'You\'ll be able to browse and apply to job opportunities'
                    : 'You\'ll be able to post jobs and manage applications'}
                </p>
              </div>

              {/* Sign In Button */}
              <button
                onClick={handleLogin}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-3 mb-4"
              >
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="white"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="white"/>
                  <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.951H.957C.348 6.174 0 7.55 0 9s.348 2.826.957 4.049l3.007-2.342z" fill="white"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.582C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.951L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="white"/>
                </svg>
                Sign in with Google
              </button>

              {/* Back Button */}
              <button
                onClick={handleBackToRoleSelection}
                className="w-full text-gray-600 hover:text-gray-900 font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Role Selection
              </button>
            </>
          )}

          {/* Back to Home Link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

