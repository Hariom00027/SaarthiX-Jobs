import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginWithGoogle } from "../api/authApi";

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isIndustry, isApplicant, user, loading: authLoading, exchangeToken } = useAuth();

  // Handle URL parameters and route from SomethingX redirect
  React.useEffect(() => {
    // Check for URL parameters from SomethingX
    const token = searchParams.get('token');
    const userType = searchParams.get('userType');
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    
    // If we have SomethingX redirect parameters, exchange token
    if (token && email) {
      console.log('[Dashboard] Detected SomethingX redirect, exchanging token...', { email, name, userType });
      
      // Exchange token and then navigate
      exchangeToken(token, email, name, userType)
        .then((success) => {
          if (success) {
            // Clean URL after successful exchange
            window.history.replaceState({}, '', window.location.pathname);
            
            // Navigate based on userType
            const currentPath = window.location.pathname;
            const isOnDashboard = currentPath === '/' || currentPath === '/jobs' || currentPath === '/jobs/';
            
            if (isOnDashboard && userType) {
              if (userType === 'STUDENT' || userType === 'APPLICANT') {
                navigate('/apply-jobs');
              } else if (userType === 'INDUSTRY') {
                navigate('/manage-applications');
              }
            }
          } else {
            console.error('[Dashboard] Token exchange failed');
          }
        })
        .catch((error) => {
          console.error('[Dashboard] Error during token exchange:', error);
        });
    } else if (userType || email || name) {
      // Store token in localStorage if provided (for potential API calls)
      if (token) {
        localStorage.setItem('somethingx_token', token);
      }
      
      // Determine route based on userType from URL params if we're on the dashboard
      const currentPath = window.location.pathname;
      const isOnDashboard = currentPath === '/' || currentPath === '/jobs' || currentPath === '/jobs/';
      
      if (isOnDashboard && userType) {
        if (userType === 'STUDENT' || userType === 'APPLICANT') {
          navigate('/apply-jobs');
        } else if (userType === 'INDUSTRY') {
          navigate('/manage-applications');
        }
      }
    }
  }, [searchParams, navigate, exchangeToken]);

  // Handle routing after OAuth login based on redirectRoute
  React.useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading || !isAuthenticated || !user) {
      return;
    }

    // Check if user has a redirectRoute set (from login button clicks or login page)
    const redirectRoute = localStorage.getItem('redirectRoute');
    const loginIntent = localStorage.getItem('loginIntent');
    
    if (redirectRoute) {
      // Check if user has a role
      if (!user.userType || user.userType === '') {
        // User doesn't have a role yet - redirect to role selection with intent
        const email = user.email;
        const name = user.name;
        const picture = user.picture;
        const intent = loginIntent || (redirectRoute === 'apply-jobs' ? 'applicant' : 'industry');
        navigate(`/choose-role?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name || '')}&picture=${encodeURIComponent(picture || '')}&intent=${intent}`);
        return;
      }

      // User has a role - check if it matches the redirect route
      if (redirectRoute === 'apply-jobs' && user.userType === 'APPLICANT') {
        localStorage.removeItem('redirectRoute');
        localStorage.removeItem('loginIntent');
        navigate('/apply-jobs');
        return;
      } else if (redirectRoute === 'post-jobs' && user.userType === 'INDUSTRY') {
        localStorage.removeItem('redirectRoute');
        localStorage.removeItem('loginIntent');
        navigate('/manage-applications');
        return;
      } else if (redirectRoute === 'role-selection') {
        // Route to role selection page (for editing role)
        const email = user.email;
        const name = user.name;
        const picture = user.picture;
        localStorage.removeItem('redirectRoute');
        navigate(`/choose-role?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name || '')}&picture=${encodeURIComponent(picture || '')}`);
        return;
      }
      
      // If redirectRoute doesn't match user's role, clear it and stay on dashboard
      localStorage.removeItem('redirectRoute');
      localStorage.removeItem('loginIntent');
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-20 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-900 mb-6 shadow-lg">
            <span className="text-3xl">💼</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 tracking-tight">
            Welcome to Saarthix Jobs
          </h1>
          <p className="text-gray-600 text-xl max-w-2xl mx-auto leading-relaxed font-light">
            Connect with opportunities that match your career goals. Browse jobs or post positions to find the right talent.
          </p>
        </div>

        {/* Edit Profile Button - Only show if authenticated */}
        {isAuthenticated && (
          <div className="mb-12 flex justify-center animate-fadeIn">
            {/* <button
              onClick={() => navigate("/edit-profile")}
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profilee
            </button> */}
          </div>
        )}

        {/* Two/Three Card Layout */}
        <div className={`grid gap-6 ${
          isAuthenticated && isIndustry ? 'md:grid-cols-3' :
          isAuthenticated && !isIndustry ? 'md:grid-cols-1 max-w-2xl mx-auto' : 
          'md:grid-cols-2'
        }`}>
          {/* Browse Jobs Card */}
          <div
            onClick={() => {
              if (!isAuthenticated) {
                // Not logged in - clear any previous intent and save applicant intent
                localStorage.removeItem('loginIntent');
                localStorage.removeItem('redirectRoute');
                localStorage.setItem('loginIntent', 'applicant');
                localStorage.setItem('redirectRoute', 'apply-jobs'); // Route to applicant dashboard
                console.log('[DASHBOARD] Setting loginIntent to: applicant, redirectRoute to: apply-jobs');
                loginWithGoogle();
              } else {
                // Already logged in - go to jobs
                navigate("/apply-jobs");
              }
            }}
            className="group cursor-pointer animate-fadeIn"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="h-full bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 p-12 flex flex-col items-center justify-center text-center hover-lift"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Browse Jobs
              </h2>
              <p className="text-gray-600 mb-10 text-base leading-relaxed max-w-sm">
                Explore curated job opportunities from top companies. Find roles that align with your skills, experience, and career aspirations.
              </p>
              <button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg">
                Explore Opportunities
              </button>
            </div>
          </div>

          {/* Browse Hackathons Card - Only for Applicants */}
          {isAuthenticated && !isIndustry && (
            <div
              onClick={() => navigate("/browse-hackathons")}
              className="group cursor-pointer animate-fadeIn"
              style={{ animationDelay: '0.15s' }}
            >
              <div className="h-full bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 p-12 flex flex-col items-center justify-center text-center hover-lift"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Hackathons
                </h2>
                <p className="text-gray-600 mb-10 text-base leading-relaxed max-w-sm">
                  Discover and apply for exciting hackathons. Compete, innovate, and showcase your skills with developers from around the world.
                </p>
                <button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg">
                  Browse Hackathons
                </button>
              </div>
            </div>
          )}

          {/* Manage Hackathons Card - Only for Industry users */}
          {isAuthenticated && isIndustry && (
            <div
              onClick={() => navigate("/manage-hackathons")}
              className="group cursor-pointer animate-fadeIn"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="h-full bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 p-12 flex flex-col items-center justify-center text-center hover-lift"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Hackathons
                </h2>
                <p className="text-gray-600 mb-10 text-base leading-relaxed max-w-sm">
                  Post and manage hackathons to engage developers and innovators. Discover new talent through coding competitions.
                </p>
                <button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg">
                  Manage Hackathons
                </button>
              </div>
            </div>
          )}

          {/* Post a Job Card - Only show for Industry users or non-authenticated users */}
          {(isIndustry || !isAuthenticated) && (
            <div
              onClick={() => {
                if (!isAuthenticated) {
                  // Not logged in - clear any previous intent and save industry intent
                  localStorage.removeItem('loginIntent');
                  localStorage.removeItem('redirectRoute');
                  localStorage.setItem('loginIntent', 'industry');
                  localStorage.setItem('redirectRoute', 'post-jobs'); // Route to industry dashboard
                  console.log('[DASHBOARD] Setting loginIntent to: industry, redirectRoute to: post-jobs');
                  loginWithGoogle();
                } else if (isIndustry) {
                  // Already logged in as INDUSTRY - go to posting form
                  navigate("/manage-applications");
                }
              }}
              className="group cursor-pointer animate-fadeIn"
              style={{ animationDelay: `${isAuthenticated && isIndustry ? '0.3s' : '0.2s'}` }}
            >
              <div className="h-full bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 p-12 flex flex-col items-center justify-center text-center hover-lift"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Post a Job
                </h2>
                <p className="text-gray-600 mb-10 text-base leading-relaxed max-w-sm">
                  Reach qualified candidates. Create a job posting and connect with professionals who are actively seeking new opportunities.
                </p>
                <button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg">
                  Create a Posting
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-20 text-center animate-fadeIn" style={{ animationDelay: '0.3s' }}>
          <div className="inline-block bg-white rounded-2xl border border-gray-200 px-8 py-6 shadow-sm">
            <p className="text-gray-700 text-base font-medium mb-2">
              A platform designed to bridge the gap between job seekers and employers.
            </p>
            <p className="text-gray-500 text-sm">
              Start your journey today.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

