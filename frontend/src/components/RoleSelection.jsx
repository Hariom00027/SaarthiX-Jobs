import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/apiConfig';

/**
 * RoleSelection Component
 * Allows new OAuth users to choose their role: APPLICANT (job seeker) or INDUSTRY (job poster)
 */
export default function RoleSelection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateAuth, user: currentUser } = useAuth();
  
  const email = searchParams.get('email') || currentUser?.email;
  const name = searchParams.get('name') || currentUser?.name;
  const pictureUrl = searchParams.get('picture') || currentUser?.picture;
  const intent = searchParams.get('intent'); // 'applicant' or 'industry'

  // Pre-select role based on current user role, intent, or localStorage
  const getInitialRole = () => {
    // First, check if user already has a role (for editing existing users)
    if (currentUser?.userType) {
      return currentUser.userType;
    }
    // Check URL intent parameter
    if (intent === 'industry') return 'INDUSTRY';
    if (intent === 'applicant') return 'APPLICANT';
    // Check localStorage from previous intent
    const storedIntent = localStorage.getItem('loginIntent');
    if (storedIntent === 'industry') return 'INDUSTRY';
    if (storedIntent === 'applicant') return 'APPLICANT';
    return null;
  };

  const [selectedRole, setSelectedRole] = useState(getInitialRole());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDebug, setShowDebug] = useState(true);
  const [mismatchChecked, setMismatchChecked] = useState(false); // Track if we checked for mismatch

  // FIRST: Check for mismatch when user comes back from OAuth
  // This runs FIRST and blocks all other logic if mismatch found
  useEffect(() => {
    console.log('[ROLE_SELECTION] === MISMATCH CHECK PHASE ===');
    console.log('[ROLE_SELECTION] currentUser:', currentUser?.userType);
    console.log('[ROLE_SELECTION] loginIntent:', localStorage.getItem('loginIntent'));
    
    if (!currentUser || !currentUser.userType) {
      console.log('[ROLE_SELECTION] Waiting for currentUser to load...');
      return; // Wait for user data to load
    }

    const loginIntent = localStorage.getItem('loginIntent');
    console.log('[ROLE_SELECTION] loginIntent value:', loginIntent);
    
    // ALWAYS check for mismatch if loginIntent exists
    if (loginIntent) {
      const intendedRole = loginIntent === 'applicant' ? 'APPLICANT' : 'INDUSTRY';
      const registeredRole = currentUser.userType;
      
      console.log('[ROLE_SELECTION] Comparing: Intended=' + intendedRole + ' vs Registered=' + registeredRole);
      
      if (intendedRole !== registeredRole) {
        console.log('[ROLE_SELECTION] *** MISMATCH DETECTED - SETTING ERROR ***');
        
        let errorMsg;
        if (registeredRole === 'APPLICANT') {
          errorMsg = '❌ Role Mismatch Error\n\nYou clicked "I\'m Hiring (Industry)" but you are registered as a Job Seeker (Applicant).\n\nYou cannot login as an Industry account.\n\nTo register as Industry, please logout first and create a new account with a different email address.';
        } else {
          errorMsg = '❌ Role Mismatch Error\n\nYou clicked "I\'m a Job Seeker" but you are registered as an Industry account.\n\nYou cannot login as a Job Seeker (Applicant).\n\nTo register as Applicant, please logout first and create a new account with a different email address.';
        }
        
        console.log('[ROLE_SELECTION] Setting error state NOW');
        setError(errorMsg);
        localStorage.removeItem('loginIntent');
        localStorage.removeItem('redirectRoute');
        setMismatchChecked(true);
        console.log('[ROLE_SELECTION] Mismatch state set - will not redirect');
        return; // BLOCK ALL REDIRECTS
      }
    }
    
    // No mismatch found - ok to proceed with redirects
    console.log('[ROLE_SELECTION] No mismatch - allowing redirects');
    setMismatchChecked(true);
  }, [currentUser]);

  // SECOND: Handle redirects ONLY if:
  // 1. mismatchChecked = true (mismatch check completed)
  // 2. No error (no mismatch found)
  useEffect(() => {
    console.log('[ROLE_SELECTION] === REDIRECT CHECK PHASE ===');
    console.log('[ROLE_SELECTION] mismatchChecked:', mismatchChecked);
    console.log('[ROLE_SELECTION] error:', !!error);
    
    // WAIT until mismatch check is done
    if (!mismatchChecked) {
      console.log('[ROLE_SELECTION] Waiting for mismatch check...');
      return;
    }
    
    // Don't redirect if there's an error (mismatch found)
    if (error) {
      console.log('[ROLE_SELECTION] *** ERROR EXISTS - NO REDIRECT ***');
      return;
    }

    // If no email in query params and no current user from auth context, redirect to home
    if (!email && !currentUser?.email) {
      console.log('[ROLE_SELECTION] No email/user - redirecting to home');
      navigate('/');
      return;
    }
    
    // Redirect users who are already logged in with a valid role (only if no error)
    // Check if this is an EXISTING user (no email in URL params) returning after OAuth
    const isNewUser = searchParams.get('email') != null;
    
    if (currentUser?.userType === 'APPLICANT' && !isNewUser) {
      // Existing applicant user returning = just coming back, redirect to apply-jobs
      console.log('[ROLE_SELECTION] Existing Applicant user - redirecting to apply-jobs');
      navigate('/apply-jobs');
      return;
    }
    
    if (currentUser?.userType === 'INDUSTRY' && !isNewUser) {
      // Existing industry user returning = just coming back, redirect to post-jobs
      console.log('[ROLE_SELECTION] Existing Industry user - redirecting to post-jobs');
      navigate('/manage-applications');
      return;
    }
  }, [mismatchChecked, error, searchParams, currentUser, navigate]);

  // THIRD: Auto-submit if no mismatch
  useEffect(() => {
    const loginIntent = localStorage.getItem('loginIntent');
    
    // Only auto-submit if NO ERROR
    if (error) {
      console.log('[ROLE_SELECTION] Not auto-submitting - error detected');
      return;
    }
    
    if (selectedRole && (intent || loginIntent)) {
      // Role was pre-selected by intent - auto submit after short delay
      const timer = setTimeout(() => {
        console.log('[ROLE_SELECTION] Auto-submitting role:', selectedRole);
        handleConfirmRoleInternal(selectedRole);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedRole, intent, error]);

  const handleConfirmRoleInternal = async (roleToSubmit) => {
    setLoading(true);
    setError(null);

    try {
      // Prevent applicants from changing their role
      if (currentUser?.userType === 'APPLICANT') {
        setError('Applicants cannot change their role. Please contact support if you need assistance.');
        setLoading(false);
        return;
      }
      
      const userEmail = email || currentUser?.email;
      const userName = name || currentUser?.name || userEmail?.split('@')[0];
      const userPicture = pictureUrl || currentUser?.picture;
      
      console.log('[ROLE_SELECTION] === SENDING TO BACKEND ===');
      console.log('[ROLE_SELECTION] Email:', userEmail);
      console.log('[ROLE_SELECTION] Selected Role:', roleToSubmit);
      console.log('[ROLE_SELECTION] Name:', userName);
      
      // Check if user already exists and has a role - use update-profile endpoint
      const isExistingUserWithRole = currentUser?.userType != null && currentUser.userType !== '';
      
      console.log('[ROLE_SELECTION] Current User Type:', currentUser?.userType);
      console.log('[ROLE_SELECTION] Is Existing User With Role:', isExistingUserWithRole);
      
      let response;
      
      if (isExistingUserWithRole) {
        // Existing user with role - use update-profile endpoint
        response = await fetch(`${API_BASE_URL}/user/update-profile`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userType: roleToSubmit,
          }),
        });
      } else {
        // New user or user without role - try save-role first
        response = await fetch(`${API_BASE_URL}/user/save-role`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userEmail,
            name: userName,
            pictureUrl: userPicture,
            userType: roleToSubmit,
          }),
        });
        
        // If save-role fails because user already has a role, try update-profile
        if (!response.ok) {
          const errorText = await response.text();
          if (errorText.includes("already has a role") || errorText.includes("User already registered")) {
            // User exists with a role, use update-profile instead
            response = await fetch(`${API_BASE_URL}/user/update-profile`, {
              method: 'PUT',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userType: roleToSubmit,
              }),
            });
          }
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to save role';
        
        console.log('[ROLE_SELECTION] Error Response Status:', response.status);
        console.log('[ROLE_SELECTION] Error Response Text:', errorText);
        
        // Try to parse as JSON first
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
          console.log('[ROLE_SELECTION] Parsed JSON error:', errorMessage);
        } catch {
          // If not JSON, use plain text
          errorMessage = errorText || errorMessage;
          console.log('[ROLE_SELECTION] Using plain text error:', errorMessage);
        }
        
        console.log('[ROLE_SELECTION] Final Error Message:', errorMessage);
        
        // Check if it's a role conflict error (409 status)
        if (response.status === 409) {
          console.log('[ROLE_SELECTION] *** ROLE MISMATCH DETECTED ***');
          console.log('[ROLE_SELECTION] Setting error state for 409 conflict');
          setError(errorMessage);
          setLoading(false);
          console.log('[ROLE_SELECTION] Error state set. Staying on page.');
          return;
        }
        
        throw new Error(errorMessage);
      }

      // Clear loginIntent from localStorage after role is saved
      localStorage.removeItem('loginIntent');
      console.log(`[ROLE_SELECTION] Cleared loginIntent after saving role: ${roleToSubmit}`);

      // Parse response - update-profile returns UserResponse, save-role returns string
      let updatedUserData;
      
      // Check if we used update-profile endpoint (returns JSON) or save-role (returns string)
      const contentType = response.headers.get("content-type");
      const isUpdateProfileResponse = contentType && contentType.includes("application/json");
      
      if (isUpdateProfileResponse) {
        // update-profile endpoint returns UserResponse object
        const userResponse = await response.json();
        updatedUserData = {
          authenticated: true,
          name: userResponse.name,
          email: userResponse.email,
          picture: userResponse.picture,
          userType: userResponse.userType,
        };
      } else {
        // save-role endpoint returns a string message, construct user data from request
        await response.text(); // Read the response to clear it
        updatedUserData = {
          authenticated: true,
          name: userName,
          email: userEmail,
          picture: userPicture,
          userType: roleToSubmit,
        };
      }

      // Update auth context with new user info
      updateAuth(updatedUserData);

      // Redirect based on redirectRoute if available, otherwise based on role
      const redirectRoute = localStorage.getItem('redirectRoute');
      if (redirectRoute === 'apply-jobs') {
        navigate('/apply-jobs');
      } else if (redirectRoute === 'post-jobs') {
        navigate('/post-jobs');
      } else if (redirectRoute === 'role-selection') {
        // Stay on role selection page (for editing)
        // Could refresh to show updated role
        window.location.reload();
      } else {
        // Default redirect based on role
        if (roleToSubmit === 'APPLICANT') {
          navigate('/apply-jobs');
        } else {
          navigate('/post-jobs');
        }
      }
      
      // Clear redirectRoute and loginIntent after using it
      localStorage.removeItem('redirectRoute');
      localStorage.removeItem('loginIntent');
    } catch (err) {
      console.error('Error saving role:', err);
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleConfirmRole = async () => {
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }
    await handleConfirmRoleInternal(selectedRole);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      {/* DEBUG PANEL
      <div className="fixed top-4 right-4 bg-yellow-100 border-2 border-yellow-400 p-3 rounded text-xs max-w-xs z-50">
        <p className="font-bold mb-1">🔍 Debug Info</p>
        <p>Current User: {currentUser?.userType || 'NONE'}</p>
        <p>Selected Role: {selectedRole || 'NONE'}</p>
        <p>Loading: {loading ? 'YES' : 'NO'}</p>
        <p>Has Error: {error ? 'YES' : 'NO'}</p>
        <p>Email: {email || 'N/A'}</p>
      </div> */}

      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {currentUser?.userType ? 'Update Your Role' : <>Welcome to <span style={{ fontFamily: "'Times New Roman', serif", fontWeight: 'bold', fontStyle: 'italic' }}>Saarthix</span> Jobs</>}
        </h1>
        <p className="text-gray-600 mb-8">
          {currentUser?.userType 
            ? `Hi ${name || email?.split('@')[0]}, you can change your role here.`
            : `Hi ${name || email?.split('@')[0]}, please choose your role to get started.`}
        </p>

        {error && (
          <div className="mb-6 rounded-xl border-4 border-red-500 bg-red-100 p-6 text-red-900 shadow-2xl animate-pulse">
            <div className="flex items-start gap-4">
              <svg className="w-8 h-8 text-red-700 flex-shrink-0 mt-0.5 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <div className="flex-1">
                <p className="font-bold text-xl mb-3">🚫 ROLE MISMATCH - LOGIN DENIED 🚫</p>
                <div className="text-base whitespace-pre-wrap leading-relaxed font-semibold bg-red-200 p-4 rounded mb-4">
                  {error}
                </div>
                <div className="bg-red-200 p-3 rounded">
                  <p className="text-sm font-bold mb-2">⚠️ What to do:</p>
                  <ol className="text-sm space-y-2 list-decimal list-inside">
                    <li>Click your profile picture (top right)</li>
                    <li>Click "Logout"</li>
                    <li>Use a DIFFERENT email address to register as Industry</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* APPLICANT Option */}
          <div
            onClick={() => setSelectedRole('APPLICANT')}
            className={`cursor-pointer rounded-lg border-2 p-6 transition-all ${
              selectedRole === 'APPLICANT'
                ? 'border-gray-800 bg-gray-50'
                : 'border-gray-200 bg-white hover:border-gray-400'
            }`}
          >
            <div className="text-4xl mb-4">👤</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">I'm a Job Seeker</h2>
            <p className="text-gray-600 text-sm mb-4">
              Browse and apply to job opportunities posted by companies.
            </p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>✓ Browse job listings</li>
              <li>✓ Apply to jobs</li>
              <li>✓ Track applications</li>
            </ul>
            {selectedRole === 'APPLICANT' && (
              <div className="mt-4 text-gray-800 font-semibold">✓ Selected</div>
            )}
          </div>

          {/* INDUSTRY Option */}
          <div
            onClick={() => setSelectedRole('INDUSTRY')}
            className={`cursor-pointer rounded-lg border-2 p-6 transition-all ${
              selectedRole === 'INDUSTRY'
                ? 'border-gray-800 bg-gray-50'
                : 'border-gray-200 bg-white hover:border-gray-400'
            }`}
          >
            <div className="text-4xl mb-4">🏢</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">I'm Hiring (Industry)</h2>
            <p className="text-gray-600 text-sm mb-4">
              Post job openings and find talented candidates for your company.
            </p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>✓ Post job listings</li>
              <li>✓ Manage openings</li>
              <li>✓ Review applicants</li>
            </ul>
            {selectedRole === 'INDUSTRY' && (
              <div className="mt-4 text-gray-800 font-semibold">✓ Selected</div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-6 transition"
          >
            Back
          </button>
          <button
            onClick={handleConfirmRole}
            disabled={!selectedRole || loading}
            className="flex-1 rounded-md bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold py-3 px-6 transition disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

