import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';
import { API_BASE_URL } from '../config/apiConfig';

// Common suggestions data
const COMMON_SKILLS = [
  'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue.js',
  'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes',
  'Git', 'Linux', 'Spring Boot', 'Django', 'Flask', 'Express.js', 'TypeScript',
  'C++', 'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Go', 'Rust', 'Machine Learning',
  'Data Science', 'Artificial Intelligence', 'DevOps', 'Cybersecurity', 'UI/UX Design',
  'Project Management', 'Agile', 'Scrum', 'Sales', 'Marketing', 'Content Writing'
];

// Tab-based sections
const JOB_TABS = [
  { id: 'basic', label: 'Basic Info', icon: '📋', required: true },
  { id: 'details', label: 'Job Details', icon: '📝', required: true },
  { id: 'requirements', label: 'Requirements', icon: '🎯', required: false },
  { id: 'yearsOfExperience', label: 'Experience', icon: '📊', required: true },
  { id: 'compensation', label: 'Compensation', icon: '💰', required: false }
];

export default function JobBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading, isIndustry } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState('basic');
  const [completedTabs, setCompletedTabs] = useState(new Set());

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    description: '',
    industry: '',
    employmentType: '',
    skills: [],
    mustHaveSkills: [],
    goodToHaveSkills: [],
    jdFileName: '',
    jdFileType: '',
    jdFileBase64: '',
    yearsOfExperience: '',
    minSalary: '',
    maxSalary: '',
    jobSalaryCurrency: 'USD',
    active: true
  });

  const [mustHaveInput, setMustHaveInput] = useState('');
  const [goodToHaveInput, setGoodToHaveInput] = useState('');
  const [showMustHaveSuggestions, setShowMustHaveSuggestions] = useState(false);
  const [showGoodToHaveSuggestions, setShowGoodToHaveSuggestions] = useState(false);
  const [salaryError, setSalaryError] = useState('');
  const [savedJobId, setSavedJobId] = useState(null); // Track saved draft job ID
  const [jobCreatedAt, setJobCreatedAt] = useState(null); // ISO string from API — 24h edit window

  // Check if editing existing job
  const editingJobId = location.state?.jobId || null;

  const editWindowExpired = useMemo(() => {
    if (!jobCreatedAt) return false;
    let created;
    if (Array.isArray(jobCreatedAt)) {
      const [y, m, d, hh = 0, mm = 0, ss = 0, nano = 0] = jobCreatedAt;
      created = new Date(y, (m || 1) - 1, d || 1, hh, mm, ss, Math.floor((nano || 0) / 1e6)).getTime();
    } else {
      created = new Date(jobCreatedAt).getTime();
    }
    if (Number.isNaN(created)) return false;
    return Date.now() - created > 24 * 60 * 60 * 1000;
  }, [jobCreatedAt]);

  const parseApiErrorMessage = (err) => {
    const d = err?.response?.data;
    if (d && typeof d === 'object' && d.message) return d.message;
    if (typeof d === 'string') return d;
    return err?.message || 'Request failed';
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/');
        return;
      }
      if (!isIndustry) {
        toast.error('Only INDUSTRY users can post jobs');
        navigate('/');
        return;
      }
      if (editingJobId) {
        loadJob();
      } else {
        setLoading(false);
      }
    }
  }, [isAuthenticated, authLoading, isIndustry, navigate, editingJobId]);

  useEffect(() => {
    updateCompletedTabs();
  }, [formData]);

  const loadJob = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/jobs/${editingJobId}`);

      const job = response.data;
      if (job) {
        setFormData({
          title: job.title || '',
          company: job.company || '',
          location: job.location || '',
          description: job.description || '',
          industry: job.industry || '',
          employmentType: job.employmentType || '',
          skills: job.skills || [],
          mustHaveSkills: job.mustHaveSkills || job.skills || [],
          goodToHaveSkills: job.goodToHaveSkills || [],
          jdFileName: job.jdFileName || '',
          jdFileType: job.jdFileType || '',
          jdFileBase64: job.jdFileBase64 || '',
          yearsOfExperience: job.yearsOfExperience ? job.yearsOfExperience.toString() : '',
          minSalary: job.jobMinSalary ? job.jobMinSalary.toString() : '',
          maxSalary: job.jobMaxSalary ? job.jobMaxSalary.toString() : '',
          jobSalaryCurrency: job.jobSalaryCurrency || 'USD',
          active: job.active !== undefined ? job.active : true
        });
        setMustHaveInput('');
        setGoodToHaveInput('');
        // Set savedJobId when loading an existing job
        setSavedJobId(job.id);
        setJobCreatedAt(job.createdAt || null);
      }
    } catch (err) {
      console.error('Error loading job:', err);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const isFieldFilled = (fieldName) => {
    const value = formData[fieldName];
    if (fieldName === 'skills') {
      return Array.isArray(value) && value.length > 0;
    }
    if (fieldName === 'minSalary' || fieldName === 'maxSalary') {
      return value !== null && value !== undefined && value !== '';
    }
    return value !== null && value !== undefined && value !== '';
  };

  const isTabComplete = (tabId) => {
    switch (tabId) {
      case 'basic':
        return isFieldFilled('title') && isFieldFilled('company') && isFieldFilled('location');
      case 'details':
        return (isFieldFilled('description') || isFieldFilled('jdFileBase64')) && isFieldFilled('industry') && isFieldFilled('employmentType');
      case 'requirements':
        return isFieldFilled('mustHaveSkills');
      case 'yearsOfExperience':
        return isFieldFilled('yearsOfExperience');
      case 'compensation':
        return isFieldFilled('minSalary') && isFieldFilled('maxSalary');
      default:
        return false;
    }
  };

  const updateCompletedTabs = () => {
    const completed = new Set();
    JOB_TABS.forEach(tab => {
      if (isTabComplete(tab.id)) {
        completed.add(tab.id);
      }
    });
    setCompletedTabs(completed);
  };

  const calculateProgress = () => {
    const totalTabs = JOB_TABS.length;
    const completedCount = completedTabs.size;
    return Math.round((completedCount / totalTabs) * 100);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Handle salary validation
    if (name === 'minSalary' || name === 'maxSalary') {
      const numValue = value === '' ? '' : parseFloat(value);

      if (name === 'minSalary') {
        setFormData((prev) => {
          const newData = { ...prev, [name]: value };
          if (newData.maxSalary && numValue !== '' && parseFloat(newData.maxSalary) < numValue) {
            setSalaryError('Maximum salary cannot be less than minimum salary');
          } else {
            setSalaryError('');
          }
          return newData;
        });
        return;
      } else if (name === 'maxSalary') {
        setFormData((prev) => {
          const newData = { ...prev, [name]: value };
          if (newData.minSalary && numValue !== '' && numValue < parseFloat(newData.minSalary)) {
            setSalaryError('Maximum salary cannot be less than minimum salary');
          } else {
            setSalaryError('');
          }
          return newData;
        });
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddSkill = (fieldName, skill) => {
    const trimmedSkill = skill.trim();
    const currentSkills = formData[fieldName] || [];
    if (trimmedSkill && !currentSkills.includes(trimmedSkill)) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: [...(prev[fieldName] || []), trimmedSkill]
      }));
      if (fieldName === 'mustHaveSkills') {
        setMustHaveInput('');
        setShowMustHaveSuggestions(false);
      } else {
        setGoodToHaveInput('');
        setShowGoodToHaveSuggestions(false);
      }
    }
  };

  const handleRemoveSkill = (fieldName, skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: (prev[fieldName] || []).filter(skill => skill !== skillToRemove)
    }));
  };

  const handleJdFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload only PDF, DOC, or DOCX files.');
      e.target.value = '';
      return;
    }

    const toBase64 = (inputFile) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const base64 = result.includes(',') ? result.split(',')[1] : '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(inputFile);
    });

    try {
      const base64 = await toBase64(file);
      setFormData(prev => ({
        ...prev,
        jdFileName: file.name,
        jdFileType: file.type,
        jdFileBase64: base64,
      }));
    } catch (err) {
      console.error('Error reading JD file:', err);
      toast.error('Unable to process selected file. Please try again.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent multiple simultaneous saves
    if (saving) return;
    if (editWindowExpired && (savedJobId || editingJobId)) {
      toast.error('This job can no longer be edited (24 hours after posting have passed).');
      return;
    }

    // For saving as draft, silently save without validation or toasts
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const mergedSkills = Array.from(new Set([
        ...(formData.mustHaveSkills || []),
        ...(formData.goodToHaveSkills || []),
      ]));
      const jobData = {
        title: formData.title || '',
        description: formData.description || '',
        company: formData.company || '',
        location: formData.location || '',
        industry: formData.industry || 'General',
        employmentType: formData.employmentType || '',
        jobMinSalary: formData.minSalary ? parseInt(formData.minSalary) : null,
        jobMaxSalary: formData.maxSalary ? parseInt(formData.maxSalary) : null,
        yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null,
        jobSalaryCurrency: formData.jobSalaryCurrency || 'USD',
        skills: mergedSkills,
        mustHaveSkills: formData.mustHaveSkills || [],
        goodToHaveSkills: formData.goodToHaveSkills || [],
        jdFileName: formData.jdFileName || '',
        jdFileType: formData.jdFileType || '',
        jdFileBase64: formData.jdFileBase64 || '',
        active: false // Save as draft (inactive)
      };

      let response;
      // Use savedJobId if we've already saved a draft, otherwise use editingJobId
      const jobIdToUpdate = savedJobId || editingJobId;

      if (jobIdToUpdate) {
        // Update existing job
        response = await apiClient.put(
          `/jobs/${jobIdToUpdate}`,
          jobData
        );
      } else {
        // Create new draft job
        response = await apiClient.post(
          '/jobs',
          jobData
        );
        // Store the ID of the newly created draft job
        if (response.data && response.data.id) {
          setSavedJobId(response.data.id);
        }
      }

      console.log('Job saved as draft');

      // Automatically move to next section
      const currentTabIndex = JOB_TABS.findIndex(tab => tab.id === activeTab);
      if (currentTabIndex < JOB_TABS.length - 1) {
        setActiveTab(JOB_TABS[currentTabIndex + 1].id);
      }
    } catch (err) {
      console.error('Error saving job:', err);
      if (err?.response?.status === 403) {
        toast.error(parseApiErrorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent multiple simultaneous submissions
    if (saving) return;
    if (editWindowExpired && (savedJobId || editingJobId)) {
      toast.error('This job can no longer be edited (24 hours after posting have passed).');
      return;
    }

    // Check for missing required fields
    const missingFields = [];
    if (!formData.title) missingFields.push('Job Title');
    if (!formData.company) missingFields.push('Company Name');
    if (!formData.location) missingFields.push('Location');
    if (!formData.description && !formData.jdFileBase64) missingFields.push('Job Description');
    if (!formData.industry) missingFields.push('Industry');
    if (!formData.employmentType) missingFields.push('Employment Type');
    if (!formData.mustHaveSkills || formData.mustHaveSkills.length === 0) missingFields.push('Must Have Skills');
    if (!formData.yearsOfExperience && formData.yearsOfExperience !== 0) missingFields.push('Years of Experience');

    // Validate salary range if both are provided
    if (formData.minSalary && formData.maxSalary) {
      const minSalary = parseFloat(formData.minSalary);
      const maxSalary = parseFloat(formData.maxSalary);

      if (maxSalary < minSalary) {
        setSalaryError('Maximum salary cannot be less than minimum salary');
        toast.error('Please fill in all required details about the job', {
          position: "top-right",
          autoClose: 5000,
        });
        return;
      }
    }

    // Show toast if any required fields are missing
    if (missingFields.length > 0) {
      toast.error('Please fill in all required details about the job', {
        position: "top-right",
        autoClose: 5000,
      });
      // Navigate to the first section with missing fields
      if (!formData.title || !formData.company || !formData.location) {
        setActiveTab('basic');
      } else if (!formData.description || !formData.industry || !formData.employmentType) {
        setActiveTab('details');
      } else if (!formData.mustHaveSkills || formData.mustHaveSkills.length === 0) {
        setActiveTab('requirements');
      } else if (!formData.yearsOfExperience && formData.yearsOfExperience !== 0) {
        setActiveTab('yearsOfExperience');
      }
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const mergedSkills = Array.from(new Set([
        ...(formData.mustHaveSkills || []),
        ...(formData.goodToHaveSkills || []),
      ]));
      const jobData = {
        title: formData.title,
        description: formData.description,
        company: formData.company,
        location: formData.location,
        industry: formData.industry || 'General',
        employmentType: formData.employmentType,
        jobMinSalary: formData.minSalary ? parseInt(formData.minSalary) : null,
        jobMaxSalary: formData.maxSalary ? parseInt(formData.maxSalary) : null,
        yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null,
        jobSalaryCurrency: formData.jobSalaryCurrency || 'USD',
        skills: mergedSkills,
        mustHaveSkills: formData.mustHaveSkills || [],
        goodToHaveSkills: formData.goodToHaveSkills || [],
        jdFileName: formData.jdFileName || '',
        jdFileType: formData.jdFileType || '',
        jdFileBase64: formData.jdFileBase64 || '',
        active: true // Post as active job
      };

      let response;
      // Use savedJobId if we've saved a draft, otherwise use editingJobId
      const jobIdToUpdate = savedJobId || editingJobId;

      if (jobIdToUpdate) {
        // Update existing job (convert draft to active or update active job)
        response = await apiClient.put(
          `/jobs/${jobIdToUpdate}`,
          jobData
        );
      } else {
        // Create new active job
        response = await apiClient.post(
          '/jobs',
          jobData
        );
      }

      console.log('Job posted successfully:', response.data);

      // Show success toast
      toast.success('Job posted successfully!', {
        position: "top-right",
        autoClose: 3000,
      });

      setTimeout(() => {
        navigate('/manage-applications');
      }, 2000);
    } catch (err) {
      console.error('Error posting job:', err);
      const errorMessage = parseApiErrorMessage(err);
      setError(errorMessage);
      toast.error(err?.response?.status === 403 ? errorMessage : 'Please fill in all required details about the job', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const progressPercentage = calculateProgress();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 rounded-full border-4 border-gray-200 border-t-gray-400"></div>
          <p className="mt-4 text-gray-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isIndustry) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-2">
              {editingJobId ? 'Edit Job Posting' : 'Create Job Posting'}
            </h1>
            <p className="text-gray-600 text-base">
              {editingJobId ? 'Update your job posting details' : 'Fill out the form below to post a new job opportunity'}
            </p>
          </div>

        </div>

        {editWindowExpired && (editingJobId || savedJobId) && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm font-medium">
            The 24-hour edit window for this job has ended. You can still view the details below, but changes can no longer be saved.
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-700 text-sm font-medium">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Job {editingJobId ? 'updated' : 'posted'} successfully! Redirecting...</span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="flex border-b border-gray-200">
            {JOB_TABS.map((tab) => {
              const isComplete = completedTabs.has(tab.id);
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 relative ${isActive
                      ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {isComplete && !isActive && (
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {tab.required && (
                    <span className="absolute top-2 right-2 text-xs text-red-400">*</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <form
          onSubmit={(e) => {
            // Only submit if on last section (compensation)
            if (activeTab === 'compensation') {
              handleSubmit(e);
            } else {
              e.preventDefault();
              // On other tabs, save and move to next section when Enter is pressed
              handleSave(e);
            }
          }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-8"
        >
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Basic Information</h2>
                <p className="text-sm text-gray-500 mt-1">Provide the essential details about the job</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Senior Frontend Engineer"
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="e.g., Tech Company Inc."
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g., Bangalore, India"
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
              </div>

            </div>
          )}

          {/* Job Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Job Details</h2>
                <p className="text-sm text-gray-500 mt-1">Describe the role, requirements, and responsibilities</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the job responsibilities, requirements, and benefits..."
                  rows="10"
                  required={!formData.jdFileBase64}
                  onKeyDown={(e) => {
                    // Allow Ctrl+Enter or Cmd+Enter to submit, but regular Enter should create new line
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSave(e);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100 resize-none"
                />
                <p className="mt-2 text-xs text-gray-500">
                  You can provide either text description or upload JD file below.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description File (PDF/DOC/DOCX)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleJdFileChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                />
                {formData.jdFileName && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs">
                    <span className="text-blue-900">
                      Uploaded: <span className="font-medium">{formData.jdFileName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, jdFileName: '', jdFileType: '', jdFileBase64: '' }))}
                      className="font-semibold text-blue-700 hover:text-blue-900"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  >
                    <option value="">Select Industry</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Education">Education</option>
                    <option value="Marketing & Sales">Marketing & Sales</option>
                    <option value="Engineering">Engineering</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  >
                    <option value="">Select Employment Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Requirements Tab */}
          {activeTab === 'requirements' && (
            <div className="space-y-6">
              <div className="mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Requirements</h2>
                <p className="text-sm text-gray-500 mt-1">Specify the skills and qualifications needed</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Must Have Skills <span className="text-red-400">*</span>
                  </label>
                  <div className="relative mb-3">
                    <input
                      type="text"
                      value={mustHaveInput}
                      onChange={(e) => {
                        setMustHaveInput(e.target.value);
                        setShowMustHaveSuggestions(e.target.value.length > 0);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (mustHaveInput.trim()) {
                            handleAddSkill('mustHaveSkills', mustHaveInput);
                          }
                        }
                      }}
                      placeholder="Add must-have skills"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                    />
                    {showMustHaveSuggestions && mustHaveInput && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {COMMON_SKILLS.filter(skill =>
                          skill.toLowerCase().includes(mustHaveInput.toLowerCase()) &&
                          !(formData.mustHaveSkills || []).includes(skill)
                        ).slice(0, 6).map((skill, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleAddSkill('mustHaveSkills', skill)}
                            className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-sm text-gray-700 transition-colors"
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {(formData.mustHaveSkills || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(formData.mustHaveSkills || []).map((skill, index) => (
                        <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
                          {skill}
                          <button type="button" onClick={() => handleRemoveSkill('mustHaveSkills', skill)} className="text-blue-600 hover:text-blue-700 focus:outline-none">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400 text-sm border border-gray-200 rounded-lg bg-gray-50">
                      Add at least one must-have skill.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Good To Have Skills
                  </label>
                  <div className="relative mb-3">
                    <input
                      type="text"
                      value={goodToHaveInput}
                      onChange={(e) => {
                        setGoodToHaveInput(e.target.value);
                        setShowGoodToHaveSuggestions(e.target.value.length > 0);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (goodToHaveInput.trim()) {
                            handleAddSkill('goodToHaveSkills', goodToHaveInput);
                          }
                        }
                      }}
                      placeholder="Add good-to-have skills"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                    />
                    {showGoodToHaveSuggestions && goodToHaveInput && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {COMMON_SKILLS.filter(skill =>
                          skill.toLowerCase().includes(goodToHaveInput.toLowerCase()) &&
                          !(formData.goodToHaveSkills || []).includes(skill)
                        ).slice(0, 6).map((skill, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleAddSkill('goodToHaveSkills', skill)}
                            className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-sm text-gray-700 transition-colors"
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {(formData.goodToHaveSkills || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(formData.goodToHaveSkills || []).map((skill, index) => (
                        <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-200">
                          {skill}
                          <button type="button" onClick={() => handleRemoveSkill('goodToHaveSkills', skill)} className="text-emerald-600 hover:text-emerald-700 focus:outline-none">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400 text-sm border border-gray-200 rounded-lg bg-gray-50">
                      Optional: add good-to-have skills.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Years of Experience Tab */}
          {activeTab === 'yearsOfExperience' && (
            <div className="space-y-6">
              <div className="mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Years of Experience</h2>
                <p className="text-sm text-gray-500 mt-1">Specify the minimum years of experience needed for this position</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Years of Experience Required <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="yearsOfExperience"
                  value={formData.yearsOfExperience}
                  onChange={handleInputChange}
                  placeholder="e.g., 3"
                  min="0"
                  max="100"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter the minimum years of experience candidates should have. This will be used to match candidates with their experience level.
                </p>
              </div>
            </div>
          )}

          {/* Compensation Tab */}
          {activeTab === 'compensation' && (
            <div className="space-y-6">
              <div className="mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Compensation</h2>
                <p className="text-sm text-gray-500 mt-1">Set the salary range and currency</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Salary
                  </label>
                  <input
                    type="number"
                    name="minSalary"
                    value={formData.minSalary}
                    onChange={handleInputChange}
                    placeholder="e.g., 500000"
                    min="0"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Salary
                  </label>
                  <input
                    type="number"
                    name="maxSalary"
                    value={formData.maxSalary}
                    onChange={handleInputChange}
                    placeholder="e.g., 1500000"
                    min={formData.minSalary || "0"}
                    className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:outline-none focus:ring-1 ${salaryError
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50"
                        : "border-gray-300 bg-white focus:border-indigo-300 focus:ring-indigo-100"
                      }`}
                  />
                  {salaryError && (
                    <p className="mt-1 text-sm text-red-600">{salaryError}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  name="jobSalaryCurrency"
                  value={formData.jobSalaryCurrency}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>

            <div className="flex gap-3">
              {/* Save Button - Show on all sections except last */}
              {activeTab !== 'compensation' && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors text-sm disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Saving...
                    </span>
                  ) : (
                    'Save'
                  )}
                </button>
              )}

              {/* Post Job Button - Show only on last section */}
              {activeTab === 'compensation' && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors text-sm disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      {editingJobId ? 'Updating...' : 'Posting...'}
                    </span>
                  ) : (
                    editingJobId ? 'Update Job' : 'Post Job'
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
