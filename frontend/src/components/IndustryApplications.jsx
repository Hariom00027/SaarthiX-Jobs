import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getMyPostedJobs, getApplicationsByJobId, updateApplicationStatusByIndustry, updateJob, deleteJob, getApplicantProfilesByJobId } from '../api/jobApi';

export default function IndustryApplications() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isIndustry, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [applicationsWithProfiles, setApplicationsWithProfiles] = useState([]);
  
  // Search and filter states
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [applicationSearchQuery, setApplicationSearchQuery] = useState('');

  // Status options with descriptions
  const statusOptions = [
    { value: 'pending', label: 'Pending', description: 'Application received, awaiting review', color: 'amber' },
    { value: 'resume_viewed', label: 'Resume Viewed', description: 'Your resume has been reviewed', color: 'blue' },
    { value: 'call_scheduled', label: 'Call Scheduled', description: 'Recruiter will contact you soon', color: 'purple' },
    { value: 'interview_scheduled', label: 'Interview Scheduled', description: 'Interview has been scheduled', color: 'indigo' },
    { value: 'offer_sent', label: 'Offer Sent', description: 'Job offer has been sent', color: 'green' },
    { value: 'accepted', label: 'Accepted', description: 'Application accepted', color: 'emerald' },
    { value: 'rejected', label: 'Rejected', description: 'Application not selected', color: 'red' },
  ];

  const statusColors = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    resume_viewed: 'bg-blue-50 text-blue-700 border-blue-200',
    call_scheduled: 'bg-purple-50 text-purple-700 border-purple-200',
    interview_scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    offer_sent: 'bg-green-50 text-green-700 border-green-200',
    accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isIndustry) {
        navigate('/');
        return;
      }
      if (isAuthenticated && isIndustry) {
        loadJobs();
      }
    }
  }, [isAuthenticated, isIndustry, authLoading, navigate]);

  // Handle location state to auto-select job when navigating from notification
  useEffect(() => {
    if (location.state?.selectedJobId && jobs.length > 0) {
      const jobToSelect = jobs.find(job => job.id === location.state.selectedJobId);
      if (jobToSelect && (!selectedJob || selectedJob.id !== jobToSelect.id)) {
        handleJobSelect(jobToSelect);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, jobs]);

  // Load application counts for all jobs
  useEffect(() => {
    if (jobs.length > 0 && !selectedJob) {
      loadAllApplicationCounts();
    }
  }, [jobs]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const allJobs = await getMyPostedJobs();
      
      if (!Array.isArray(allJobs)) {
        setError('Invalid response format from server');
        return;
      }

      setJobs(allJobs);
    } catch (err) {
      console.error('Error loading jobs:', err);
      let errorMessage = 'Failed to load your posted jobs';
      
      if (err.response) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (err.response.status === 403) {
          errorMessage = 'Access denied. Only INDUSTRY users can view their posted jobs.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadAllApplicationCounts = async () => {
    // Load application counts for all jobs in parallel
    const countPromises = jobs.map(async (job) => {
      try {
        const apps = await getApplicationsByJobId(job.id);
        return { jobId: job.id, count: apps.length };
      } catch {
        return { jobId: job.id, count: 0 };
      }
    });
    
    const counts = await Promise.all(countPromises);
    setJobs(prevJobs => 
      prevJobs.map(job => {
        const countData = counts.find(c => c.jobId === job.id);
        return { ...job, applicationCount: countData?.count || 0 };
      })
    );
  };

  const loadApplications = async (jobId) => {
    try {
      setApplicationsLoading(true);
      setError(null);
      const data = await getApplicationsByJobId(jobId);
      setApplications(data);
      
      // Also load applications with profiles
      try {
        const profilesData = await getApplicantProfilesByJobId(jobId);
        setApplicationsWithProfiles(profilesData);
      } catch (profileErr) {
        console.error('Error loading profiles:', profileErr);
        // Don't fail the whole operation if profiles fail
      }
    } catch (err) {
      console.error('Error loading applications:', err);
      setError('Failed to load applications for this job');
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleViewFullProfile = async (application) => {
    try {
      setLoadingProfile(true);
      setError(null);
      
      // Find the profile from the loaded profiles data
      const appWithProfile = applicationsWithProfiles.find(
        item => item.application?.id === application.id || 
                item.application?.applicantEmail === application.applicantEmail
      );
      
      if (appWithProfile?.userProfile) {
        setSelectedProfile(appWithProfile.userProfile);
      } else {
        // If not found, try to fetch it again
        const profilesData = await getApplicantProfilesByJobId(selectedJob.id);
        const foundProfile = profilesData.find(
          item => item.application?.id === application.id || 
                  item.application?.applicantEmail === application.applicantEmail
        );
        
        if (foundProfile?.userProfile) {
          setSelectedProfile(foundProfile.userProfile);
        } else {
          toast.error('Profile not found for this applicant', {
            position: "top-right",
            autoClose: 3000,
          });
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      toast.error('Failed to load applicant profile', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    setSelectedApplication(null);
    setStatusFilter('All');
    setApplicationSearchQuery('');
    // Reset job filters when selecting a job
    setJobSearchQuery('');
    setRoleFilter('All');
    setCompanyFilter('All');
    loadApplications(job.id);
  };

  const handleStatusUpdate = async (applicationId, newStatus) => {
    try {
      setUpdatingStatus(true);
      
      const updated = await updateApplicationStatusByIndustry(applicationId, newStatus);
      
      setApplications(prev => prev.map(app => 
        app.id === applicationId ? { ...app, ...updated, status: newStatus } : app
      ));
      
      if (selectedApplication?.id === applicationId) {
        setSelectedApplication(prev => ({ ...prev, ...updated, status: newStatus }));
      }

      if (selectedJob) {
        await loadApplications(selectedJob.id);
        await loadJobs(); // Refresh job list to update counts
      }

      const statusLabel = statusOptions.find(s => s.value === newStatus)?.label || newStatus;
      toast.success(`Status updated to: ${statusLabel}`, {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (err) {
      console.error('Error updating status:', err);
      let errorMessage = 'Failed to update status';
      if (err.response) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
      }
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const downloadResume = (application) => {
    if (!application.resumeBase64) {
      toast.error('Resume not available', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    try {
      const byteCharacters = atob(application.resumeBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: application.resumeFileType || 'application/pdf' });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = application.resumeFileName || 'resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Resume downloaded successfully', {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err) {
      console.error('Error downloading resume:', err);
      toast.error('Failed to download resume', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleEditJob = (job) => {
    navigate('/post-jobs', { state: { jobId: job.id } });
  };

  const handleDeleteClick = (job) => {
    setJobToDelete(job);
  };

  const handleConfirmDelete = async () => {
    if (!jobToDelete) return;

    setIsDeleting(true);
    try {
      await deleteJob(jobToDelete.id);
      toast.success('Job deleted successfully', {
        position: "top-right",
        autoClose: 3000,
      });
      
      if (selectedJob?.id === jobToDelete.id) {
        setSelectedJob(null);
        setApplications([]);
      }
      
      await loadJobs();
      setJobToDelete(null);
    } catch (err) {
      console.error('Error deleting job:', err);
      let errorMessage = 'Failed to delete job';
      if (err.response) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
      }
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Get unique roles from jobs
  const uniqueRoles = React.useMemo(() => {
    const roles = jobs
      .map(job => job.title)
      .filter(role => role && role.trim() !== '')
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return roles;
  }, [jobs]);

  // Get unique companies from jobs
  const uniqueCompanies = React.useMemo(() => {
    const companies = jobs
      .map(job => job.company)
      .filter(company => company && company.trim() !== '')
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return companies;
  }, [jobs]);

  // Filter jobs based on search, role, and company
  const filteredJobs = jobs.filter(job => {
    // Search filter
    const matchesSearch = !jobSearchQuery || (() => {
      const query = jobSearchQuery.toLowerCase();
      return (
        job.title?.toLowerCase().includes(query) ||
        job.company?.toLowerCase().includes(query) ||
        job.location?.toLowerCase().includes(query)
      );
    })();
    
    // Role filter
    const matchesRole = roleFilter === 'All' || job.title === roleFilter;
    
    // Company filter
    const matchesCompany = companyFilter === 'All' || job.company === companyFilter;
    
    return matchesSearch && matchesRole && matchesCompany;
  });

  // Filter applications based on search and status
  const filteredApplications = applications.filter(app => {
    const matchesSearch = !applicationSearchQuery || 
      app.fullName?.toLowerCase().includes(applicationSearchQuery.toLowerCase()) ||
      app.applicantEmail?.toLowerCase().includes(applicationSearchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    inProgress: applications.filter(a => ['resume_viewed', 'call_scheduled', 'interview_scheduled'].includes(a.status)).length,
    offers: applications.filter(a => ['offer_sent', 'accepted'].includes(a.status)).length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

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

  if (!isAuthenticated || !isIndustry) {
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
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-200">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 tracking-tight">Manage Applications</h1>
                <p className="text-gray-600 text-base">Review and manage applications for your posted jobs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedJob && (
                <button
                  onClick={() => {
                    setSelectedJob(null);
                    setApplications([]);
                    setSelectedApplication(null);
                    setSelectedProfile(null);
                  }}
                  className="px-5 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg flex items-center gap-2 border border-gray-200 hover:border-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Jobs
                </button>
              )}
            {/* <button
              onClick={() => navigate('/manage-hackathons')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors text-sm shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Manage Hackathonss
            </button> */}
            <button
              onClick={() => navigate('/post-jobs')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors text-sm shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Post New Job
            </button>
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
                <p className="font-semibold mb-1">Error Loading Jobs</p>
                <p>{error}</p>
                <button
                  onClick={loadJobs}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {!selectedJob ? (
          /* Jobs Overview - Show when no job is selected */
          <div className="space-y-6">
            {/* Search and Filter Bar */}
            {jobs.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search jobs by title, company, or location..."
                      value={jobSearchQuery}
                      onChange={(e) => setJobSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                    />
                  </div>
                  {uniqueRoles.length > 0 && (
                    <div className="md:w-64">
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                      >
                        <option value="All">All Roles</option>
                        {uniqueRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {uniqueCompanies.length > 0 && (
                    <div className="md:w-64">
                      <select
                        value={companyFilter}
                        onChange={(e) => setCompanyFilter(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                      >
                        <option value="All">All Companies</option>
                        {uniqueCompanies.map((company) => (
                          <option key={company} value={company}>
                            {company}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Jobs Grid */}
            {jobs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">No Jobs Posted Yet</h3>
                <p className="text-gray-600 text-base mb-6">Get started by posting your first job opportunity</p>
                <button
                  onClick={() => navigate('/post-jobs')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors text-sm shadow-md hover:shadow-lg"
                >
                  Post Your First Job
                </button>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <p className="text-gray-600 text-base">No jobs match your search criteria</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                    onClick={() => handleJobSelect(job)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                          {job.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">{job.company}</p>
                        <p className="text-xs text-gray-500">{job.location}</p>
                      </div>
                      {job.active ? (
                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-semibold border border-green-200">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold border border-gray-200">
                          Draft
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-900">
                          {job.applicationCount !== undefined ? job.applicationCount : '...'} Application{job.applicationCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditJob(job);
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Job"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(job);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Job"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Applications View - Show when a job is selected */
          <div className="space-y-6">
            {/* Job Header with Back Button */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    setSelectedJob(null);
                    setApplications([]);
                    setSelectedApplication(null);
                    setSelectedProfile(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg font-semibold text-sm transition-all duration-200 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Back to All Jobs</span>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleEditJob(selectedJob)}
                    className="px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-semibold text-sm transition-colors border border-indigo-200"
                  >
                    Edit Job
                  </button>
                  <button
                    onClick={() => handleDeleteClick(selectedJob)}
                    className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-semibold text-sm transition-colors border border-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedJob.title}</h2>
                <p className="text-sm text-gray-600">{selectedJob.company} • {selectedJob.location}</p>
              </div>
            </div>

            {/* Statistics Cards */}
            {applications.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-4 bg-amber-50">
                  <p className="text-xs text-amber-600 uppercase tracking-wide mb-1">Pending</p>
                  <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
                </div>
                <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4 bg-blue-50">
                  <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">In Progress</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
                </div>
                <div className="bg-white rounded-xl border border-green-200 shadow-sm p-4 bg-green-50">
                  <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Offers</p>
                  <p className="text-2xl font-bold text-green-700">{stats.offers}</p>
                </div>
                <div className="bg-white rounded-xl border border-red-200 shadow-sm p-4 bg-red-50">
                  <p className="text-xs text-red-600 uppercase tracking-wide mb-1">Rejected</p>
                  <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
                </div>
              </div>
            )}

            {/* Search and Filter Bar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search applicants by name or email..."
                    value={applicationSearchQuery}
                    onChange={(e) => setApplicationSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                >
                  <option value="All">All Statuses</option>
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Applications List */}
            {applicationsLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900"></div>
                <p className="mt-4 text-gray-600 text-sm font-medium">Loading applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">No Applications Yet</h3>
                <p className="text-gray-600 text-base">No one has applied to this job yet.</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <p className="text-gray-600 text-base">No applications match your search criteria</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => setSelectedApplication(app)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-lg font-semibold text-indigo-700">
                              {app.fullName?.charAt(0)?.toUpperCase() || 'A'}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-900">{app.fullName || 'Applicant'}</h3>
                            <p className="text-sm text-gray-600">{app.applicantEmail}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 ml-15">
                          {app.phoneNumber && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {app.phoneNumber}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Applied {new Date(app.appliedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-4 py-2 rounded-lg text-xs font-bold border ${statusColors[app.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                          {statusOptions.find(s => s.value === app.status)?.label || app.status}
                        </span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {jobToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 animate-slideIn">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Delete Job</h2>
                    <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-900 mb-1">{jobToDelete.title}</p>
                  <p className="text-xs text-gray-600">{jobToDelete.company} • {jobToDelete.location}</p>
                </div>

                <p className="text-sm text-gray-700 mb-6">
                  Are you sure you want to delete this job posting? All applications associated with this job will remain in the system, but the job will no longer be visible to applicants.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="flex-1 rounded-md bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 px-6 transition-colors duration-200 disabled:cursor-not-allowed text-sm"
                  >
                    {isDeleting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Deleting...
                      </span>
                    ) : (
                      "Delete Job"
                    )}
                  </button>
                  <button
                    onClick={() => setJobToDelete(null)}
                    disabled={isDeleting}
                    className="flex-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-900 font-semibold py-2.5 px-6 transition-colors duration-200 disabled:cursor-not-allowed text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Profile Modal */}
        {selectedProfile && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100 animate-slideIn">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Applicant Full Profile</h2>
                    <p className="text-sm text-gray-600 mt-1">{selectedProfile.fullName || selectedApplication?.fullName || 'Applicant'}</p>
                  </div>
                  <button
                    onClick={() => setSelectedProfile(null)}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all duration-200 flex items-center justify-center text-xl font-light shadow-sm hover:shadow-md"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Helper function to check if value exists */}
                {(() => {
                  const hasValue = (value) => {
                    if (Array.isArray(value)) return value.length > 0;
                    return value !== null && value !== undefined && value !== '';
                  };

                  const formatFileSize = (bytes) => {
                    if (!bytes || bytes === 0) return '0 Bytes';
                    const k = 1024;
                    const sizes = ['Bytes', 'KB', 'MB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
                  };

                  return (
                    <>
                      {/* Profile Picture */}
                      {selectedProfile.profilePictureBase64 && (
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-200 shadow-sm p-6">
                          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-indigo-200">
                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800">Profile Picture</h2>
                          </div>
                          <div className="flex justify-center">
                            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-indigo-300 bg-white shadow-md">
                              <img
                                src={`data:${selectedProfile.profilePictureFileType};base64,${selectedProfile.profilePictureBase64}`}
                                alt={selectedProfile.fullName || 'Applicant Profile'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Personal Information */}
                      {(hasValue(selectedProfile.fullName) || hasValue(selectedProfile.email) || hasValue(selectedProfile.phoneNumber)) && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            {hasValue(selectedProfile.fullName) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Full Name</p>
                                <p className="text-sm font-medium text-gray-800">{selectedProfile.fullName}</p>
                              </div>
                            )}
                            {hasValue(selectedProfile.email) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</p>
                                <p className="text-sm font-medium text-gray-800">{selectedProfile.email}</p>
                              </div>
                            )}
                            {hasValue(selectedProfile.phoneNumber) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Phone Number</p>
                                <p className="text-sm font-medium text-gray-800">{selectedProfile.phoneNumber}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Professional Information */}
                      {(hasValue(selectedProfile.professionalExperiences) || hasValue(selectedProfile.currentPosition) || hasValue(selectedProfile.currentCompany) || hasValue(selectedProfile.experience) || hasValue(selectedProfile.skills) || hasValue(selectedProfile.summary)) && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800">Professional Information</h2>
                          </div>
                          <div className="space-y-6">
                            {hasValue(selectedProfile.professionalExperiences) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Professional Experiences</p>
                                <div className="space-y-4">
                                  {selectedProfile.professionalExperiences.map((exp, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-indigo-50">
                                      <div className="flex items-start justify-between mb-3">
                                        <div>
                                          <h3 className="text-base font-semibold text-gray-800">{exp.jobTitle || 'N/A'}</h3>
                                          <p className="text-sm text-gray-600 mt-0.5">{exp.company || 'N/A'}</p>
                                        </div>
                                        {exp.isCurrentJob && (
                                          <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-200">
                                            Current
                                          </span>
                                        )}
                                      </div>
                                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                                        <div>
                                          <p className="text-xs text-gray-500 mb-0.5">Start Date</p>
                                          <p className="text-gray-700">{exp.startDate || 'N/A'}</p>
                                        </div>
                                        {!exp.isCurrentJob && (
                                          <div>
                                            <p className="text-xs text-gray-500 mb-0.5">End Date</p>
                                            <p className="text-gray-700">{exp.endDate || 'N/A'}</p>
                                          </div>
                                        )}
                                      </div>
                                      {exp.description && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                          <p className="text-xs text-gray-500 mb-1">Description</p>
                                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{exp.description}</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {(hasValue(selectedProfile.currentPosition) || hasValue(selectedProfile.currentCompany) || hasValue(selectedProfile.experience)) && !hasValue(selectedProfile.professionalExperiences) && (
                              <div className="grid md:grid-cols-2 gap-4">
                                {hasValue(selectedProfile.currentPosition) && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Current Position</p>
                                    <p className="text-sm font-medium text-gray-800">{selectedProfile.currentPosition}</p>
                                  </div>
                                )}
                                {hasValue(selectedProfile.currentCompany) && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Current Company</p>
                                    <p className="text-sm font-medium text-gray-800">{selectedProfile.currentCompany}</p>
                                  </div>
                                )}
                                {hasValue(selectedProfile.experience) && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Years of Experience</p>
                                    <p className="text-sm font-medium text-gray-800">{selectedProfile.experience}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {hasValue(selectedProfile.skills) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Skills</p>
                                <div className="flex flex-wrap gap-2">
                                  {selectedProfile.skills.map((skill, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {hasValue(selectedProfile.summary) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Professional Summary</p>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selectedProfile.summary}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Education & Certifications */}
                      {(hasValue(selectedProfile.educationEntries) || hasValue(selectedProfile.certificationFiles) || hasValue(selectedProfile.education) || hasValue(selectedProfile.certifications)) && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800">Education & Certifications</h2>
                          </div>
                          <div className="space-y-6">
                            {hasValue(selectedProfile.educationEntries) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Education</p>
                                <div className="space-y-4">
                                  {selectedProfile.educationEntries.map((edu, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-indigo-50">
                                      <div className="grid md:grid-cols-2 gap-3">
                                        <div>
                                          <p className="text-xs text-gray-500 mb-0.5">Level</p>
                                          <p className="text-sm font-medium text-gray-800">{edu.level || 'N/A'}</p>
                                        </div>
                                        {edu.degree && (
                                          <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Degree/Course</p>
                                            <p className="text-sm font-medium text-gray-800">{edu.degree}</p>
                                          </div>
                                        )}
                                        <div>
                                          <p className="text-xs text-gray-500 mb-0.5">Institution/University</p>
                                          <p className="text-sm font-medium text-gray-800">{edu.institution || 'N/A'}</p>
                                        </div>
                                        {edu.passingYear && (
                                          <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Passing Year</p>
                                            <p className="text-sm font-medium text-gray-800">{edu.passingYear}</p>
                                          </div>
                                        )}
                                        {edu.percentage && (
                                          <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Percentage/CGPA</p>
                                            <p className="text-sm font-medium text-gray-800">{edu.percentage}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {hasValue(selectedProfile.certificationFiles) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Certifications</p>
                                <div className="space-y-4">
                                  {selectedProfile.certificationFiles.map((cert, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-indigo-50">
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                          <h3 className="text-base font-semibold text-gray-800 mb-1">{cert.name || 'Unnamed Certification'}</h3>
                                          {cert.issuingOrganization && (
                                            <p className="text-sm text-gray-600">{cert.issuingOrganization}</p>
                                          )}
                                        </div>
                                        {cert.fileName && (
                                          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {formatFileSize(cert.fileSize || 0)}
                                          </div>
                                        )}
                                      </div>
                                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                                        {cert.issueDate && (
                                          <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Issue Date</p>
                                            <p className="text-gray-700">{cert.issueDate}</p>
                                          </div>
                                        )}
                                        {cert.expiryDate && (
                                          <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Expiry Date</p>
                                            <p className="text-gray-700">{cert.expiryDate}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Projects */}
                      {hasValue(selectedProfile.projects) && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                              </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800">Projects</h2>
                          </div>
                          <div className="space-y-4">
                            {selectedProfile.projects.map((project, index) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-purple-50">
                                <div className="mb-3">
                                  <h3 className="text-lg font-semibold text-gray-800">{project.name || 'Untitled Project'}</h3>
                                </div>
                                {project.description && (
                                  <div className="mb-3">
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{project.description}</p>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-3">
                                  {project.githubLink && (
                                    <a
                                      href={project.githubLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                      </svg>
                                      GitHub
                                    </a>
                                  )}
                                  {project.websiteLink && (
                                    <a
                                      href={project.websiteLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                      </svg>
                                      Website
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contact & Links */}
                      {(hasValue(selectedProfile.linkedInUrl) || hasValue(selectedProfile.portfolioUrl) || hasValue(selectedProfile.githubUrl) || hasValue(selectedProfile.websiteUrl)) && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800">Contact & Links</h2>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            {hasValue(selectedProfile.linkedInUrl) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">LinkedIn</p>
                                <a
                                  href={selectedProfile.linkedInUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
                                >
                                  {selectedProfile.linkedInUrl}
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            )}
                            {hasValue(selectedProfile.portfolioUrl) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Portfolio</p>
                                <a
                                  href={selectedProfile.portfolioUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
                                >
                                  {selectedProfile.portfolioUrl}
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            )}
                            {hasValue(selectedProfile.githubUrl) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">GitHub</p>
                                <a
                                  href={selectedProfile.githubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
                                >
                                  {selectedProfile.githubUrl}
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            )}
                            {hasValue(selectedProfile.websiteUrl) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Website</p>
                                <a
                                  href={selectedProfile.websiteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
                                >
                                  {selectedProfile.websiteUrl}
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Resume */}
                      {selectedProfile.resumeFileName && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800">Resume</h2>
                          </div>
                          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-200">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">{selectedProfile.resumeFileName}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {formatFileSize(selectedProfile.resumeFileSize || 0)} • {selectedProfile.resumeFileType || 'Document'}
                              </p>
                            </div>
                            <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Uploaded
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Application Details Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100 animate-slideIn">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Application Details</h2>
                    <p className="text-sm text-gray-600 mt-1">{selectedApplication.jobTitle}</p>
                  </div>
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all duration-200 flex items-center justify-center text-xl font-light shadow-sm hover:shadow-md"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Applicant Information */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="font-bold text-lg text-gray-900 mb-4">Applicant Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">Full Name</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedApplication.fullName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">Email</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedApplication.applicantEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">Phone</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedApplication.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">Experience</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedApplication.experience || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Cover Letter */}
                {selectedApplication.coverLetter && (
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-3">Cover Letter</h3>
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedApplication.coverLetter}
                      </p>
                    </div>
                  </div>
                )}

                {/* Resume */}
                {selectedApplication.resumeFileName && (
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-3">Resume</h3>
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-200">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{selectedApplication.resumeFileName}</p>
                          <p className="text-xs text-gray-600">
                            {selectedApplication.resumeFileSize ? `${(selectedApplication.resumeFileSize / 1024).toFixed(2)} KB` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadResume(selectedApplication)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        Download Resume
                      </button>
                    </div>
                  </div>
                )}

                {/* Links */}
                {(selectedApplication.linkedInUrl || selectedApplication.portfolioUrl) && (
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-3">Links</h3>
                    <div className="flex flex-wrap gap-3">
                      {selectedApplication.linkedInUrl && (
                        <a
                          href={selectedApplication.linkedInUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-semibold text-sm transition-all duration-200 border border-blue-200"
                        >
                          LinkedIn
                        </a>
                      )}
                      {selectedApplication.portfolioUrl && (
                        <a
                          href={selectedApplication.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-semibold text-sm transition-all duration-200 border border-indigo-200"
                        >
                          Portfolio
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* View Full Profile Button */}
                <div className="border-t border-gray-200 pt-6">
                  <button
                    onClick={() => handleViewFullProfile(selectedApplication)}
                    disabled={loadingProfile}
                    className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 mb-4"
                  >
                    {loadingProfile ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Loading Profile...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        View Full Profile
                      </>
                    )}
                  </button>
                </div>

                {/* Status Update */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-4">Update Application Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {statusOptions.map((status) => (
                      <button
                        key={status.value}
                        onClick={() => handleStatusUpdate(selectedApplication.id, status.value)}
                        disabled={updatingStatus || selectedApplication.status === status.value}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 text-sm font-semibold ${
                          selectedApplication.status === status.value
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        <div className="text-xs mb-1">{status.label}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Current status: <span className="font-semibold">{statusOptions.find(s => s.value === selectedApplication.status)?.label || selectedApplication.status}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
