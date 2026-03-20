import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getAllHackathons, getMyHackathonApplications, applyForHackathon } from '../api/jobApi';

export default function ApplicantHackathons() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, isApplicantOrStudent, user } = useAuth();
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' or 'my-applications'
  const [allHackathons, setAllHackathons] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHackathon, setSelectedHackathon] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsHackathon, setDetailsHackathon] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    asTeam: false,
    teamName: '',
    teamSize: 1,
    teamMembers: [],
    individualName: '',
    individualEmail: user?.email || '',
    individualPhone: '',
    individualQualifications: '',
  });

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
  const isValidPhone = (phone) => /^\d{10}$/.test((phone || '').trim());
  const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '').slice(0, 10);
  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return String(dateValue);
    return parsed.toLocaleDateString();
  };

  const getHackathonPhases = (hackathon) => {
    if (!hackathon?.phases) return [];
    if (Array.isArray(hackathon.phases)) return hackathon.phases;
    if (typeof hackathon.phases === 'string') {
      try {
        const parsed = JSON.parse(hackathon.phases);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isApplicantOrStudent) {
        navigate('/');
        return;
      }
      if (isAuthenticated && isApplicantOrStudent) {
        loadHackathons();
      }
    }
  }, [isAuthenticated, isApplicantOrStudent, authLoading, navigate]);

  useEffect(() => {
    if (!showApplicationForm && !showDetailsModal) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showApplicationForm, showDetailsModal]);

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
    if (name === 'individualPhone') {
      setFormData(prev => ({ ...prev, individualPhone: normalizePhone(value) }));
      return;
    }

    if (name === 'teamSize') {
      const parsed = Math.max(2, parseInt(value, 10) || 2);
      const maxAllowed = selectedHackathon?.teamSize || parsed;
      const strictSize = Math.min(parsed, maxAllowed);
      setFormData(prev => {
        const nextMembers = Array.from({ length: strictSize }, (_, index) => ({
          name: prev.teamMembers[index]?.name || '',
          email: prev.teamMembers[index]?.email || '',
          phone: prev.teamMembers[index]?.phone || '',
          role: index === 0 ? 'Team Lead' : 'Member',
        }));
        return {
          ...prev,
          teamSize: strictSize,
          teamMembers: nextMembers,
        };
      });
      return;
    }

    if (name === 'asTeam') {
      const isTeam = type === 'checkbox' ? checked : Boolean(value);
      setFormData(prev => ({
        ...prev,
        asTeam: isTeam,
        teamName: isTeam ? prev.teamName : '',
        teamSize: isTeam ? Math.max(2, parseInt(prev.teamSize, 10) || 2) : 1,
        teamMembers: isTeam ? (prev.teamMembers.length > 0 ? prev.teamMembers : [
          { name: '', email: '', phone: '', role: 'Team Lead' },
          { name: '', email: '', phone: '', role: 'Member' },
        ]) : [],
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleTeamMemberChange = (index, field, value) => {
    const updatedValue = field === 'phone' ? normalizePhone(value) : value;
    setFormData(prev => {
      const normalizedCandidate = field === 'email'
        ? String(updatedValue || '').trim().toLowerCase()
        : field === 'phone'
          ? normalizePhone(updatedValue)
          : String(updatedValue || '').trim().toLowerCase();

      const shouldCheckDuplicate = field === 'email'
        ? isValidEmail(updatedValue)
        : field === 'phone'
          ? normalizedCandidate.length === 10
          : normalizedCandidate.length >= 3;

      const hasDuplicate = shouldCheckDuplicate && prev.teamMembers.some((member, memberIndex) => {
        if (memberIndex === index) return false;
        const normalizedExisting = field === 'email'
          ? String(member?.email || '').trim().toLowerCase()
          : field === 'phone'
            ? normalizePhone(member?.phone || '')
            : String(member?.name || '').trim().toLowerCase();
        return normalizedExisting && normalizedExisting === normalizedCandidate;
      });

      if (hasDuplicate) {
        toast.error(`Duplicate ${field} is not allowed for team members.`, {
          position: 'top-right',
          autoClose: 2200,
        });
        return prev;
      }

      return {
        ...prev,
        teamMembers: prev.teamMembers.map((member, memberIndex) =>
          memberIndex === index ? { ...member, [field]: updatedValue } : member
        ),
      };
    });
  };

  const resetForm = () => {
    setFormData({
      asTeam: false,
      teamName: '',
      teamSize: 1,
      teamMembers: [],
      individualName: '',
      individualEmail: user?.email || '',
      individualPhone: '',
      individualQualifications: '',
    });
    setShowApplicationForm(false);
  };

  const handleApply = async (hackathon) => {
    setSelectedHackathon(hackathon);
    setFormData({
      asTeam: false,
      teamName: '',
      teamSize: 1,
      teamMembers: [],
      individualName: user?.name || '',
      individualEmail: user?.email || '',
      individualPhone: '',
      individualQualifications: '',
    });
    setShowApplicationForm(true);
  };

  const handleViewDetails = (hackathon) => {
    setDetailsHackathon(hackathon);
    setShowDetailsModal(true);
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

      if (selectedHackathon?.teamSize && formData.teamSize > selectedHackathon.teamSize) {
        toast.error(`Team size cannot exceed ${selectedHackathon.teamSize} members.`, {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      if (formData.teamMembers.length !== parseInt(formData.teamSize, 10)) {
        toast.error(`Please add exactly ${formData.teamSize} team members.`, {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      const hasInvalidMember = formData.teamMembers.some(member =>
        !member.name?.trim() || !isValidPhone(member.phone) || !isValidEmail(member.email?.trim())
      );
      if (hasInvalidMember) {
        toast.error('Each team member must have valid name, 10-digit phone, and email.', {
          position: "top-right",
          autoClose: 3500,
        });
        return;
      }

      const emailSet = new Set();
      const phoneSet = new Set();
      const nameSet = new Set();
      for (const member of formData.teamMembers) {
        const emailKey = member.email.trim().toLowerCase();
        const phoneKey = normalizePhone(member.phone);
        const nameKey = member.name.trim().toLowerCase();
        if (emailSet.has(emailKey) || phoneSet.has(phoneKey) || nameSet.has(nameKey)) {
          toast.error('Duplicate member details are not allowed. Each member must have unique name, email, and phone.', {
            position: "top-right",
            autoClose: 4000,
          });
          return;
        }
        emailSet.add(emailKey);
        phoneSet.add(phoneKey);
        nameSet.add(nameKey);
      }
    } else {
      if (!formData.individualName?.trim() || !isValidEmail(formData.individualEmail?.trim()) || !isValidPhone(formData.individualPhone)) {
        toast.error('For individual application, valid name, email, and 10-digit phone are required.', {
          position: "top-right",
          autoClose: 3500,
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
        teamSize: formData.asTeam ? Math.max(2, parseInt(formData.teamSize, 10) || 1) : 1,
        teamMembers: formData.asTeam && Array.isArray(formData.teamMembers)
          ? formData.teamMembers.map((member, index) => ({
              name: String(member.name || '').trim(),
              email: String(member.email || '').trim(),
              phone: String(member.phone || '').trim(),
              role: index === 0 ? 'Team Lead' : 'Member',
            }))
          : [],
        individualName: !formData.asTeam ? String(formData.individualName || '').trim() : null,
        individualEmail: !formData.asTeam ? String(formData.individualEmail || '').trim() : null,
        individualPhone: !formData.asTeam ? normalizePhone(formData.individualPhone) : null,
        individualQualifications: !formData.asTeam ? String(formData.individualQualifications || '').trim() : null,
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

  if (!isAuthenticated || !isApplicantOrStudent) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-200">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 tracking-tight">Hackathons</h1>
              <p className="text-gray-600 text-base">Browse and apply for exciting hackathons</p>
            </div>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <button
              onClick={() => {
                navigate('/apply-jobs');
              }}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#ffffff',
                color: '#115FD5',
                fontWeight: '600',
                borderRadius: '0.5rem',
                transition: 'all 0.2s',
                fontSize: '0.875rem',
                border: '1px solid #115FD5',
                cursor: 'pointer',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 'fit-content'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f0f7ff';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#ffffff';
              }}
            >
              Apply for Jobs
            </button>
            <button
              onClick={() => {
                // Already on Hackathons page, no action needed
              }}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#115FD5',
                color: '#ffffff',
                fontWeight: '600',
                borderRadius: '0.5rem',
                transition: 'all 0.2s',
                fontSize: '0.875rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: 'none',
                cursor: 'pointer',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 'fit-content'
              }}
            >
              Hackathons
            </button>
            <button
              onClick={() => {
                navigate('/job-tracker');
              }}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#ffffff',
                color: '#115FD5',
                fontWeight: '600',
                borderRadius: '0.5rem',
                transition: 'all 0.2s',
                fontSize: '0.875rem',
                border: '1px solid #115FD5',
                cursor: 'pointer',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 'fit-content'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f0f7ff';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#ffffff';
              }}
            >
              My Applications
            </button>
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

                    <button
                      onClick={() => handleViewDetails(hackathon)}
                      className="w-full mt-2 py-2 px-4 bg-white hover:bg-gray-50 text-blue-700 font-semibold rounded-lg border border-blue-200 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      View Details
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

                      {/* Application Dashboard Button */}
                      <div className="mb-4">
                        <button
                          onClick={() => navigate(`/hackathon-application/${application.id}`)}
                          className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Application Dashboard
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Applied on {new Date(application.appliedAt).toLocaleDateString()}</span>
                        {hackathon?.submissionUrl && (
                          <a
                            href={hackathon.submissionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 font-semibold"
                          >
                            Open link →
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {showDetailsModal && detailsHackathon && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 py-6 overflow-y-auto">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[calc(100vh-3rem)] overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{detailsHackathon.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">{detailsHackathon.company}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all duration-200 flex items-center justify-center text-xl font-light"
                >
                  ×
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(100vh-12rem)] space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-700">{detailsHackathon.description || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Problem Statement</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{detailsHackathon.problemStatement || 'N/A'}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Mode</p>
                    <p className="text-sm text-gray-900">{detailsHackathon.mode || 'N/A'}</p>
                    <p className="text-xs font-semibold text-gray-600 mt-3 mb-1">Dates</p>
                    <p className="text-sm text-gray-900">Start: {formatDate(detailsHackathon.startDate)}</p>
                    <p className="text-sm text-gray-900">End: {formatDate(detailsHackathon.endDate)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Team Rules</p>
                    <p className="text-sm text-gray-900">Max Team Size: {detailsHackathon.teamSize || 'N/A'}</p>
                    <p className="text-sm text-gray-900">Participant Limit: {detailsHackathon.participantLimit || 'N/A'}</p>
                    <p className="text-xs font-semibold text-gray-600 mt-3 mb-1">Prize</p>
                    <p className="text-sm text-gray-900">{detailsHackathon.prize || 'N/A'}</p>
                  </div>
                </div>

                {(detailsHackathon.mode === 'Offline' || detailsHackathon.mode === 'Hybrid') && (
                  <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Venue Details</h3>
                    <p className="text-sm text-gray-900">Location: {detailsHackathon.venueLocation || 'N/A'}</p>
                    <p className="text-sm text-gray-900">Time: {detailsHackathon.venueTime || 'N/A'}</p>
                    <p className="text-sm text-gray-900">Reporting Date: {formatDate(detailsHackathon.venueDate)}</p>
                    <p className="text-sm text-gray-900">Reporting Time: {detailsHackathon.venueReportingTime || 'N/A'}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Guidelines & Submission</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{detailsHackathon.submissionProcedure || 'N/A'}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mt-3">{detailsHackathon.requirements || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Phases</h3>
                  <div className="space-y-2">
                    {getHackathonPhases(detailsHackathon).length === 0 ? (
                      <p className="text-sm text-gray-600">No phase details available.</p>
                    ) : (
                      getHackathonPhases(detailsHackathon).map((phase, index) => (
                        <div key={phase.id || index} className="rounded-lg border border-gray-200 p-3">
                          <p className="text-sm font-semibold text-gray-900">{phase.name || `Phase ${index + 1}`}</p>
                          <p className="text-xs text-gray-600 mt-1">Deadline: {formatDate(phase.deadline)}</p>
                          {phase.description && <p className="text-sm text-gray-700 mt-2">{phase.description}</p>}
                          {phase.uploadFormat && <p className="text-xs text-gray-600 mt-2">Formats: {phase.uploadFormat}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Application Form Modal */}
        {showApplicationForm && selectedHackathon && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 md:p-6">
            <div className="mx-auto w-full max-w-4xl h-[92vh] md:h-[88vh] bg-white rounded-3xl shadow-2xl border border-gray-200 animate-slideIn flex flex-col overflow-hidden">
              <div className="px-6 md:px-8 py-5 bg-gradient-to-r from-blue-50 via-white to-indigo-50 border-b border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Apply for Hackathon</h2>
                    <p className="text-sm text-gray-600 mt-1">{selectedHackathon.title}</p>
                  </div>
                  <button
                    onClick={() => resetForm()}
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all duration-200 flex items-center justify-center text-xl font-light shadow-sm"
                  >
                    ×
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitApplication} className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 md:px-8 py-6 space-y-6">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <label className="block text-sm font-semibold text-gray-800 mb-3">Application Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleInputChange({ target: { name: 'asTeam', type: 'checkbox', checked: false } })}
                        className={`px-4 py-3 rounded-lg border text-sm font-semibold transition ${
                          !formData.asTeam
                            ? 'bg-blue-600 text-white border-blue-600 shadow'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        Individual
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange({ target: { name: 'asTeam', type: 'checkbox', checked: true } })}
                        className={`px-4 py-3 rounded-lg border text-sm font-semibold transition ${
                          formData.asTeam
                            ? 'bg-blue-600 text-white border-blue-600 shadow'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        Team
                      </button>
                    </div>
                  </div>

                  {!formData.asTeam && (
                    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                      <h3 className="text-base font-semibold text-gray-900">Individual Details</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                        <input
                          type="text"
                          name="individualName"
                          value={formData.individualName}
                          onChange={handleInputChange}
                          required={!formData.asTeam}
                          placeholder="Your full name"
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <input
                          type="email"
                          name="individualEmail"
                          value={formData.individualEmail}
                          onChange={handleInputChange}
                          required={!formData.asTeam}
                          placeholder="your@email.com"
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                        <input
                          type="text"
                          name="individualPhone"
                          value={formData.individualPhone}
                          onChange={handleInputChange}
                          required={!formData.asTeam}
                          placeholder="10-digit mobile number"
                          inputMode="numeric"
                          maxLength={10}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Qualifications</label>
                        <textarea
                          name="individualQualifications"
                          value={formData.individualQualifications}
                          onChange={handleInputChange}
                          rows={3}
                          placeholder="College, skills, relevant experience..."
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  )}

                  {formData.asTeam && (
                    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                      <h3 className="text-base font-semibold text-gray-900">Team Details</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Team Name *</label>
                        <input
                          type="text"
                          name="teamName"
                          value={formData.teamName}
                          onChange={handleInputChange}
                          placeholder="e.g., Tech Innovators"
                          required={formData.asTeam}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                        <p className="text-xs text-gray-600 mt-1">Max: {selectedHackathon.teamSize || 'No limit'} members</p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-800 mb-3">Team Members (exactly {formData.teamSize})</p>
                        <div className="space-y-3">
                          {Array.from({ length: parseInt(formData.teamSize, 10) || 0 }).map((_, index) => (
                            <div key={index} className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                              <p className="text-xs font-semibold text-gray-600 mb-2">
                                {index === 0 ? 'Team Lead' : `Member ${index + 1}`}
                              </p>
                              <div className="grid gap-2">
                                <input
                                  type="text"
                                  name={`team-member-name-${index}`}
                                  value={formData.teamMembers[index]?.name || ''}
                                  onChange={(e) => handleTeamMemberChange(index, 'name', e.target.value)}
                                  placeholder="Full name"
                                  required={formData.asTeam}
                                  autoComplete={index === 0 ? 'name' : 'off'}
                                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                                <input
                                  type="email"
                                  name={`team-member-email-${index}`}
                                  value={formData.teamMembers[index]?.email || ''}
                                  onChange={(e) => handleTeamMemberChange(index, 'email', e.target.value)}
                                  placeholder="Email"
                                  required={formData.asTeam}
                                  autoComplete={index === 0 ? 'email' : 'off'}
                                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                                <input
                                  type="text"
                                  name={`team-member-phone-${index}`}
                                  value={formData.teamMembers[index]?.phone || ''}
                                  onChange={(e) => handleTeamMemberChange(index, 'phone', e.target.value)}
                                  placeholder="Phone number"
                                  required={formData.asTeam}
                                  inputMode="numeric"
                                  maxLength={10}
                                  autoComplete={index === 0 ? 'tel' : 'off'}
                                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          You must provide complete and unique details for every team member.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 px-6 md:px-8 py-4 bg-white">
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 transition-colors duration-200 disabled:cursor-not-allowed text-sm"
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
                      className="flex-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-900 font-semibold py-3 px-6 transition-colors duration-200 disabled:cursor-not-allowed text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

