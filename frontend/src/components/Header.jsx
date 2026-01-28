import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { loginWithGoogle, logout } from '../api/authApi';
import { getUserProfile } from '../api/jobApi';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';

export default function Header() {
  const { user, loading, clearAuth, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  const handleLogin = () => {
    // Clear any previous login intent
    localStorage.removeItem('loginIntent');
    localStorage.removeItem('redirectRoute');
    loginWithGoogle();
  };

  const handleLogout = () => {
    logout(clearAuth);
    setDropdownOpen(false);
  };

  // Check if profile exists for APPLICANT users
  useEffect(() => {
    const checkProfile = async () => {
      if (isAuthenticated && user?.userType === 'APPLICANT' && !checkingProfile) {
        setCheckingProfile(true);
        try {
          const profile = await getUserProfile();
          setHasProfile(profile !== null && profile !== undefined);
        } catch (error) {
          if (error.response?.status !== 404) {
            console.error('Error checking profile:', error);
          }
          setHasProfile(false);
        } finally {
          setCheckingProfile(false);
        }
      }
    };

    checkProfile();
  }, [isAuthenticated, user, location.pathname]);

  // Listen for profile save events (from ProfileBuilder)
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (isAuthenticated && user?.userType === 'APPLICANT') {
        getUserProfile().then(profile => {
          setHasProfile(profile !== null && profile !== undefined);
        }).catch(() => setHasProfile(false));
      }
    };

    window.addEventListener('profileSaved', handleProfileUpdate);
    return () => window.removeEventListener('profileSaved', handleProfileUpdate);
  }, [isAuthenticated, user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors duration-200 tracking-tight">
            Saarthix Jobs
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-10">
            <Link to="/apply-jobs" className="text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200 text-sm relative group">
              Browse Jobs
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gray-900 group-hover:w-full transition-all duration-300"></span>
            </Link>
            {user?.userType === 'INDUSTRY' ? (
              <>
                <Link to="/manage-applications" className="text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200 text-sm relative group">
                  My Posted Jobs
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gray-900 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link to="/manage-hackathons" className="text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200 text-sm relative group">
                  Hackathons
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gray-900 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link to="/post-jobs" className="text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200 text-sm relative group">
                  Post a Job
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gray-900 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/job-tracker" className="text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200 text-sm relative group">
                  My Applications
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gray-900 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link to="/browse-hackathons" className="text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200 text-sm relative group">
                  Hackathons
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gray-900 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="text-gray-500 text-sm">Loading...</div>
            ) : user ? (
              <>
                {/* Notification Center */}
                <NotificationCenter />
                
                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-xl p-1.5 transition-all duration-200 hover:bg-gray-50"
                >
                  <img 
                    src={user.picture} 
                    alt={user.name}
                    className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm"
                  />
                  <span className="text-gray-800 font-semibold text-sm hidden sm:inline max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <svg 
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-fadeIn overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                      <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-600 truncate mt-1">{user.email}</p>
                    </div>
                    {/* <Link
                      to="/edit-profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 group"
                    >
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="font-medium">Edit Profile</span>
                    </Link> */}
                    {user?.userType === 'APPLICANT' && (
                      hasProfile ? (
                        <>
                          <Link
                            to="/view-profile"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 group"
                          >
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="font-medium">View Profile</span>
                          </Link>
                          {/* <Link
                            to="/build-profile"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 group border-t border-gray-100"
                          >
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="font-medium">Edit Profile</span>
                          </Link> */}
                        </>
                      ) : (
                        <Link
                          to="/build-profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 group"
                        >
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="font-medium">Build Profile</span>
                        </Link>
                      )
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 group border-t border-gray-100 mt-1"
                    >
                      <svg className="w-5 h-5 text-red-500 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                )}
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 flex items-center gap-2.5 text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="white"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="white"/>
                  <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.951H.957C.348 6.174 0 7.55 0 9s.348 2.826.957 4.049l3.007-2.342z" fill="white"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.582C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.951L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="white"/>
                </svg>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

