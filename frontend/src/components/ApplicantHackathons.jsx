import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getAllHackathons, getMyHackathonApplications, applyForHackathon } from '../api/jobApi';

export default function ApplicantHackathons() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, isApplicant, user } = useAuth();
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' or 'my-applications'
  const [allHackathons, setAllHackathons] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHackathon, setSelectedHackathon] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    asTeam: false,
    teamName: '',
    teamSize: 1,
    teamMembers: [],
  });

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isApplicant) {
        navigate('/');
        return;
      }
      if (isAuthenticated && isApplicant) {
        loadHackathons();
      }
    }
  }, [isAuthenticated, isApplicant, authLoading, navigate]);

  const loadHackathons = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading hackathons for applicant...');
      
      // Load all hackathons first (this should work regardless)
      const hackathonsData = await getAllHackathons();
      console.log('All Hackathons fetched:', hackathonsData);
      
      if (!Array.isArray(hackathonsData)) {
        console.error('Invalid hackathons response format from server');
        setError('Invalid response format from server');
        setAllHackathons([]);
        setMyApplications([]);
        return;
      }

      setAllHackathons(hackathonsData);
      
      // Try to load applications, but don't fail if it errors
      try {
        const applicationsData = await getMyHackathonApplications();
        console.log('My Applications fetched:', applicationsData);
        
        if (Array.isArray(applicationsData)) {
          setMyApplications(applicationsData);
        } else {
          console.warn('Applications response is not an array:', applicationsData);
          setMyApplications([]);
        }
      } catch (appErr) {
        console.error('Error loading applications (non-fatal):', appErr);
        console.error('Applications error details:', appErr.response?.data);
        // Don't set error for applications - hackathons still loaded
        setMyApplications([]);
      }
    } catch (err) {
      console.error('Error loading hackathons:', err);
      console.error('Error response:', err.response?.data);
      let errorMessage = 'Failed to load hackathons';
      
      if (err.response) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      asTeam: false,
      teamName: '',
      teamSize: 1,
      teamMembers: [],
    });
    setShowApplicationForm(false);
  };

  const handleApply = async (hackathon) => {
    setSelectedHackathon(hackathon);
    resetForm();
    setShowApplicationForm(true);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    
    if (formData.asTeam) {
      if (!formData.teamName || formData.teamName.trim() === '') {
        toast.error('Team name is required', {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }
      if (formData.teamSize < 2) {
        toast.error('Team size must be at least 2', {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Build application data with proper types
      const applicationData = {
        asTeam: Boolean(formData.asTeam),
        teamName: formData.asTeam && formData.teamName ? String(formData.teamName).trim() : null,
        teamSize: formData.asTeam ? Math.max(2, parseInt(formData.teamSize) || 1) : 1,
        teamMembers: formData.asTeam && Array.isArray(formData.teamMembers) ? formData.teamMembers : [],
      };

      console.log('Submitting application for hackathon:', selectedHackathon.id);
      console.log('Hackathon ID type:', typeof selectedHackathon.id);
      console.log('Application data:', applicationData);
      console.log('Application data types:', {
        asTeam: typeof applicationData.asTeam,
        teamName: typeof applicationData.teamName,
        teamSize: typeof applicationData.teamSize,
        teamMembers: Array.isArray(applicationData.teamMembers)
      });
      
      const response = await applyForHackathon(selectedHackathon.id, applicationData);
      console.log('Application response:', response);
      
      toast.success('Application submitted successfully!', {
        position: "top-right",
        autoClose: 3000,
      });

      resetForm();
      await loadHackathons();
      setActiveTab('my-applications');
    } catch (err) {
      console.error('Error submitting application:', err);
      console.error('Error response status:', err.response?.status);
      console.error('Error response data:', err.response?.data);
      console.error('Error message:', err.message);
      
      let errorMessage = 'Failed to submit application';
      if (err.response) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
        } else if (err.response.status === 403) {
          errorMessage = 'Only applicants can apply for hackathons.';
        } else if (err.response.status === 404) {
          errorMessage = 'Hackathon not found.';
        } else if (err.response.status === 400) {
          errorMessage = 'Invalid application data. Please check your inputs.';
        }
      }
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHackathons = allHackathons.filter(hackathon => {
    const query = searchQuery.toLowerCase();
    const hasApplied = myApplications.some(app => app.hackathonId === hackathon.id);
    
    return (
      !hasApplied &&
      (hackathon.title?.toLowerCase().includes(query) ||
       hackathon.company?.toLowerCase().includes(query) ||
       hackathon.description?.toLowerCase().includes(query))
    );
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900"></div>
          <p className="mt-4 text-gray-600 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isApplicant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="mb-6 text-gray-500 hover:text-gray-700 font-medium flex items-center gap-2 text-sm transition-colors"
          >
            ← Back to Dashboard
          </button>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-200">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 tracking-tight">Hackathons</h1>
              <p className="text-gray-600 text-base">Browse and apply for exciting hackathons</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-5 text-red-700 text-sm font-medium">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold mb-1">Error Loading Hackathons</p>
                <p>{error}</p>
                <button
                  onClick={loadHackathons}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs Section */}
        <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex">
            <button
              onClick={() => {
                setActiveTab('browse');
                setSearchQuery('');
              }}
              className={`flex-1 py-4 px-6 font-semibold text-sm transition-all duration-200 border-b-2 ${
                activeTab === 'browse'
                  ? 'text-blue-600 border-b-blue-600'
                  : 'text-gray-600 border-b-transparent hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Browse Hackathons ({filteredHackathons.length})
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('my-applications');
                setSearchQuery('');
              }}
              className={`flex-1 py-4 px-6 font-semibold text-sm transition-all duration-200 border-b-2 ${
                activeTab === 'my-applications'
                  ? 'text-blue-600 border-b-blue-600'
                  : 'text-gray-600 border-b-transparent hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                My Applications ({myApplications.length})
              </div>
            </button>
          </div>
        </div>

        {/* Search Bar - Show for Browse tab */}
        {activeTab === 'browse' && filteredHackathons.length > 0 && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search hackathons by title, company, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
            </div>
          </div>
        )}

        {/* Browse Hackathons Tab */}
        {activeTab === 'browse' && (
          <>
            {filteredHackathons.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">
                  {allHackathons.length === 0 ? 'No Hackathons Available' : 'No New Hackathons'}
                </h3>
                <p className="text-gray-600 text-base">
                  {allHackathons.length === 0 
                    ? 'Check back soon for hackathons to apply to' 
                    : 'You have already applied to all available hackathons'}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredHackathons.map((hackathon) => (
                  <div
                    key={hackathon.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-lg transition-all duration-200 group flex flex-col"
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {hackathon.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">{hackathon.company}</p>

                      <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                        {hackathon.description}
                      </p>

                      {/* Prize Display */}
                      {hackathon.prize && (
                        <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs text-gray-600">Prize Pool</p>
                          <p className="text-sm font-semibold text-blue-700">{hackathon.prize}</p>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                        {hackathon.teamSize > 0 && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0a6 6 0 11-12 0 6 6 0 0112 0z" />
                            </svg>
                            Max team: {hackathon.teamSize}
                          </span>
                        )}
                        {hackathon.views !== undefined && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {hackathon.views} views
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Apply Button */}
                    <button
                      onClick={() => handleApply(hackathon)}
                      className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Apply Now
                    </button>

                    {/* View Details Link */}
                    {hackathon.submissionUrl && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <a
                          href={hackathon.submissionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                          View Details
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* My Applications Tab */}
        {activeTab === 'my-applications' && (
          <>
            {myApplications.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">No Applications Yet</h3>
                <p className="text-gray-600 text-base mb-6">Start by applying to hackathons</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm shadow-md hover:shadow-lg"
                >
                  Browse Hackathons
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myApplications.map((application) => {
                  const hackathon = allHackathons.find(h => h.id === application.hackathonId);
                  return (
                    <div
                      key={application.id}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-lg transition-all duration-200"
                    >
                      <div className="mb-4">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">
                          {hackathon?.title || 'Unknown Hackathon'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{hackathon?.company || 'N/A'}</p>
                        <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-semibold border border-green-200">
                          ✓ Applied
                        </span>
                      </div>

                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Application Type</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {application.asTeam ? `Team: ${application.teamName}` : 'Individual'}
                        </p>
                        {application.asTeam && (
                          <p className="text-xs text-gray-600 mt-1">Team Size: {application.teamSize}</p>
                        )}
                      </div>

                      <div className="text-xs text-gray-500">
                        Applied on {new Date(application.appliedAt).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Application Form Modal */}
        {showApplicationForm && selectedHackathon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 animate-slideIn">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Apply for Hackathon</h2>
                    <p className="text-sm text-gray-600 mt-1">{selectedHackathon.title}</p>
                  </div>
                  <button
                    onClick={() => resetForm()}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all duration-200 flex items-center justify-center text-xl font-light shadow-sm hover:shadow-md"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmitApplication} className="space-y-6">
                  {/* Application Type */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Application Type</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="asTeam"
                          checked={!formData.asTeam}
                          onChange={() => handleInputChange({ target: { name: 'asTeam', type: 'checkbox', checked: false } })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">Apply as Individual</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="asTeam"
                          checked={formData.asTeam}
                          onChange={() => handleInputChange({ target: { name: 'asTeam', type: 'checkbox', checked: true } })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">Apply as Team</span>
                      </label>
                    </div>
                  </div>

                  {/* Team Fields - Show only if team is selected */}
                  {formData.asTeam && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Team Name *</label>
                        <input
                          type="text"
                          name="teamName"
                          value={formData.teamName}
                          onChange={handleInputChange}
                          placeholder="e.g., Tech Innovators"
                          required={formData.asTeam}
                          className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Team Size *</label>
                        <input
                          type="number"
                          name="teamSize"
                          value={formData.teamSize}
                          onChange={handleInputChange}
                          min="2"
                          max={selectedHackathon.teamSize || 10}
                          required={formData.asTeam}
                          className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                        />
                        <p className="text-xs text-gray-600 mt-1">Max: {selectedHackathon.teamSize || 'No limit'} members</p>
                      </div>
                    </>
                  )}

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-6 transition-colors duration-200 disabled:cursor-not-allowed text-sm"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Submitting...
                        </span>
                      ) : (
                        'Submit Application'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetForm()}
                      disabled={isSubmitting}
                      className="flex-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-900 font-semibold py-2.5 px-6 transition-colors duration-200 disabled:cursor-not-allowed text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

