import React, { useState, useEffect } from 'react';
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
    yearsOfExperience: '',
    minSalary: '',
    maxSalary: '',
    jobSalaryCurrency: 'USD',
    active: true
  });

  const [skillsInput, setSkillsInput] = useState('');
  const [showSkillsSuggestions, setShowSkillsSuggestions] = useState(false);
  const [salaryError, setSalaryError] = useState('');
  const [savedJobId, setSavedJobId] = useState(null); // Track saved draft job ID

  // Check if editing existing job
  const editingJobId = location.state?.jobId || null;

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
          yearsOfExperience: job.yearsOfExperience ? job.yearsOfExperience.toString() : '',
          minSalary: job.jobMinSalary ? job.jobMinSalary.toString() : '',
          maxSalary: job.jobMaxSalary ? job.jobMaxSalary.toString() : '',
          jobSalaryCurrency: job.jobSalaryCurrency || 'USD',
          active: job.active !== undefined ? job.active : true
        });
        setSkillsInput('');
        // Set savedJobId when loading an existing job
        setSavedJobId(job.id);
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
        return isFieldFilled('description') && isFieldFilled('industry') && isFieldFilled('employmentType');
      case 'requirements':
        return isFieldFilled('skills');
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

  const handleAddSkill = (skill) => {
    const trimmedSkill = skill.trim();
    if (trimmedSkill && !formData.skills.includes(trimmedSkill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, trimmedSkill]
      }));
      setSkillsInput('');
      setShowSkillsSuggestions(false);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent multiple simultaneous saves
    if (saving) return;

    // For saving as draft, silently save without validation or toasts
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
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
        skills: formData.skills || [],
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
      // No toast for draft save errors
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent multiple simultaneous submissions
    if (saving) return;

    // Check for missing required fields
    const missingFields = [];
    if (!formData.title) missingFields.push('Job Title');
    if (!formData.company) missingFields.push('Company Name');
    if (!formData.location) missingFields.push('Location');
    if (!formData.description) missingFields.push('Job Description');
    if (!formData.industry) missingFields.push('Industry');
    if (!formData.employmentType) missingFields.push('Employment Type');
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
      } else if (!formData.yearsOfExperience && formData.yearsOfExperience !== 0) {
        setActiveTab('yearsOfExperience');
      }
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
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
        skills: formData.skills || [],
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
      const errorMessage = err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        'Failed to post job. Please check your connection and try again.';
      setError(errorMessage);
      // Show error toast for missing details
      toast.error('Please fill in all required details about the job', {
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
          <button
            onClick={() => navigate('/')}
            className="mb-6 text-gray-500 hover:text-gray-700 font-medium flex items-center gap-2 text-sm transition-colors"
          >
            ← Back to Dashboard
          </button>

          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-2">
              {editingJobId ? 'Edit Job Posting' : 'Create Job Posting'}
            </h1>
            <p className="text-gray-600 text-base">
              {editingJobId ? 'Update your job posting details' : 'Fill out the form below to post a new job opportunity'}
            </p>
          </div>

        </div>

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
                  required
                  onKeyDown={(e) => {
                    // Allow Ctrl+Enter or Cmd+Enter to submit, but regular Enter should create new line
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSave(e);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100 resize-none"
                />
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Skills
                </label>

                <div className="relative mb-4">
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(e) => {
                      setSkillsInput(e.target.value);
                      setShowSkillsSuggestions(e.target.value.length > 0);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (skillsInput.trim()) {
                          handleAddSkill(skillsInput);
                        }
                      }
                    }}
                    placeholder="Type a skill and press Enter or select from suggestions"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />

                  {showSkillsSuggestions && skillsInput && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {COMMON_SKILLS.filter(skill =>
                        skill.toLowerCase().includes(skillsInput.toLowerCase()) &&
                        !formData.skills.includes(skill)
                      ).slice(0, 5).map((skill, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleAddSkill(skill)}
                          className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-sm text-gray-700 transition-colors"
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {formData.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-blue-600 hover:text-blue-700 focus:outline-none"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm border border-gray-200 rounded-lg bg-gray-50">
                    No skills added yet. Start typing to add skills.
                  </div>
                )}
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
