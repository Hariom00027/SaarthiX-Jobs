import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { recordJobApplication, getUserProfile } from '../api/jobApi';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'jobApplicationFormData';
const STORAGE_JOB_KEY = 'jobApplicationJobData';

export default function JobApplicationForm({ job, onClose, onSuccess }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    phoneNumber: '',
    coverLetter: '',
    linkedInUrl: '',
    portfolioUrl: '',
    experience: '',
    availability: 'Immediately',
  });

  const [resume, setResume] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [useProfileData, setUseProfileData] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Restore saved form data on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const savedJobData = localStorage.getItem(STORAGE_JOB_KEY);
    
    if (savedData && savedJobData) {
      try {
        const parsedData = JSON.parse(savedData);
        const parsedJobData = JSON.parse(savedJobData);
        
        // If saved data is for a different job, clear it
        if (parsedJobData.jobId !== job.id) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_JOB_KEY);
          return;
        }
        
        // Only restore if it's for the same job
        if (parsedJobData.jobId === job.id) {
          // Check if there's actually form data to restore
          const hasDataToRestore = parsedData.formData && (
            parsedData.formData.fullName ||
            parsedData.formData.phoneNumber ||
            parsedData.formData.coverLetter ||
            parsedData.formData.linkedInUrl ||
            parsedData.formData.portfolioUrl ||
            parsedData.formData.experience ||
            parsedData.formData.availability !== 'Immediately'
          );
          
          if (hasDataToRestore) {
            // Restore form data, preserving any fields that might have been filled
            setFormData(prev => ({
              ...prev,
              ...parsedData.formData,
              // Only override if saved data has a value
              fullName: parsedData.formData.fullName || prev.fullName,
              phoneNumber: parsedData.formData.phoneNumber || prev.phoneNumber,
              coverLetter: parsedData.formData.coverLetter || prev.coverLetter,
              linkedInUrl: parsedData.formData.linkedInUrl || prev.linkedInUrl,
              portfolioUrl: parsedData.formData.portfolioUrl || prev.portfolioUrl,
              experience: parsedData.formData.experience || prev.experience,
              availability: parsedData.formData.availability || prev.availability,
            }));
            
            // Restore resume if it was saved (only metadata, not the actual file)
            if (parsedData.resume && parsedData.resume.isFromProfile && parsedData.resume.base64) {
              setResume(parsedData.resume);
            } else if (parsedData.resumeFileName && !resume) {
              // If resume was uploaded but we can't restore the file object,
              // notify user to re-upload
              toast.info('Please re-upload your resume file', {
                position: "top-right",
                autoClose: 3000,
              });
            }
            
            toast.success('Your previous form entries have been restored!', {
              position: "top-right",
              autoClose: 3000,
            });
          }
        }
      } catch (err) {
        console.error('Error restoring saved form data:', err);
      }
    }
  }, [job.id]); // Only run once when component mounts with a job

  // Save form data to localStorage whenever it changes
  // Only save if there's actual data entered (not just initial empty state)
  useEffect(() => {
    const hasData = formData.fullName || 
                    formData.phoneNumber || 
                    formData.coverLetter || 
                    formData.linkedInUrl || 
                    formData.portfolioUrl || 
                    formData.experience ||
                    resume;
    
    if (hasData) {
      const dataToSave = {
        formData,
        resume: resume ? {
          name: resume.name,
          type: resume.type,
          size: resume.size,
          isFromProfile: resume.isFromProfile || false,
          base64: resume.base64 || null,
        } : null,
        resumeFileName: resume?.name || null,
      };
      
      const jobDataToSave = {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      localStorage.setItem(STORAGE_JOB_KEY, JSON.stringify(jobDataToSave));
    }
  }, [formData, resume, job.id, job.title, job.company]);

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getUserProfile();
        if (profile) {
          setUserProfile(profile);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    loadProfile();
  }, []);

  // Auto-fill form when useProfileData is toggled
  useEffect(() => {
    if (useProfileData && userProfile) {
      setFormData({
        fullName: userProfile.fullName || user?.name || '',
        phoneNumber: userProfile.phoneNumber || '',
        coverLetter: userProfile.coverLetterTemplate || '',
        linkedInUrl: userProfile.linkedInUrl || '',
        portfolioUrl: userProfile.portfolioUrl || '',
        experience: userProfile.experience || '',
        availability: userProfile.availability || 'Immediately',
      });

      // If profile has resume, create a file object from base64
      if (userProfile.resumeBase64 && userProfile.resumeFileName) {
        // Note: We'll use the profile resume data when submitting
        setResume({
          name: userProfile.resumeFileName,
          type: userProfile.resumeFileType,
          size: userProfile.resumeFileSize,
          isFromProfile: true,
          base64: userProfile.resumeBase64,
        });
      }
    }
  }, [useProfileData, userProfile, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, DOC, DOCX, or TXT file');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setResume(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const removeResume = () => {
    setResume(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]); // Remove data:type;base64, prefix
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!formData.phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    if (!resume) {
      setError('Please upload your resume or use your saved profile resume');
      return;
    }

    if (!formData.coverLetter.trim()) {
      setError('Cover letter is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get resume base64 - either from uploaded file or profile
      let resumeBase64;
      let resumeFileName;
      let resumeFileType;
      let resumeFileSize;

      if (resume.isFromProfile) {
        // Use resume from profile
        resumeBase64 = resume.base64;
        resumeFileName = resume.name;
        resumeFileType = resume.type;
        resumeFileSize = resume.size;
      } else {
        // Convert uploaded resume to base64
        resumeBase64 = await convertFileToBase64(resume);
        resumeFileName = resume.name;
        resumeFileType = resume.type;
        resumeFileSize = resume.size;
      }

      // Prepare application data
      const applicationData = {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company || 'Company confidential',
        location: job.location || 'Location not specified',
        jobDescription: job.description || job.jobDescription || '',
        status: 'pending',
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        coverLetter: formData.coverLetter,
        resumeFileName: resumeFileName,
        resumeFileType: resumeFileType,
        resumeBase64: resumeBase64,
        resumeFileSize: resumeFileSize,
        linkedInUrl: formData.linkedInUrl,
        portfolioUrl: formData.portfolioUrl,
        experience: formData.experience,
        availability: formData.availability,
      };

      await recordJobApplication(applicationData);
      
      // Clear saved form data after successful submission
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_JOB_KEY);
      
      // Show success toast notification
      toast.success('Application submitted successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (err) {
      console.error('Error submitting application:', err);
      const errorMessage = err.response?.data?.message || err.response?.data || err.message || 'Failed to submit application';
      setError(errorMessage);
      
      // Check if user already applied to this job
      const isAlreadyApplied = 
        err.response?.status === 400 && 
        (errorMessage.includes('already applied') || errorMessage.includes('already applied to this job'));
      
      if (isAlreadyApplied) {
        toast.warning('You have already applied to this job!', {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        // Clear saved data if already applied
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_JOB_KEY);
      } else {
        // Show error toast for other errors
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToProfile = () => {
    // Save current form state before navigating
    const dataToSave = {
      formData,
      resume: resume ? {
        name: resume.name,
        type: resume.type,
        size: resume.size,
        isFromProfile: resume.isFromProfile || false,
        base64: resume.base64 || null,
      } : null,
      resumeFileName: resume?.name || null,
    };
    
    const jobDataToSave = {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    localStorage.setItem(STORAGE_JOB_KEY, JSON.stringify(jobDataToSave));
    
    // Navigate to build-profile with return path
    navigate('/build-profile', { state: { returnToApplication: true, jobId: job.id } });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Apply for Position</h2>
              <p className="text-sm text-gray-600 mt-1">{job.title} at {job.company}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Use Profile Data Toggle */}
          {userProfile && !loadingProfile && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Use Saved Profile Data</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Auto-fill this form with your saved profile information
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useProfileData}
                    onChange={(e) => setUseProfileData(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-800"></div>
                </label>
              </div>
              {!useProfileData && (
                <p className="text-xs text-gray-500 mt-2">
                  💡 Tip: Enable this to quickly fill the form with your saved profile data
                </p>
              )}
            </div>
          )}

          {!userProfile && !loadingProfile && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                💡 <button 
                  type="button"
                  onClick={handleNavigateToProfile}
                  className="font-semibold underline hover:text-blue-900"
                >
                  Create a profile
                </button> to auto-fill application forms in the future!
              </p>
            </div>
          )}

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Personal Information
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="linkedInUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn Profile (Optional)
                </label>
                <input
                  type="url"
                  id="linkedInUrl"
                  name="linkedInUrl"
                  value={formData.linkedInUrl}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <div>
                <label htmlFor="portfolioUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  Portfolio/Website (Optional)
                </label>
                <input
                  type="url"
                  id="portfolioUrl"
                  name="portfolioUrl"
                  value={formData.portfolioUrl}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  placeholder="https://yourportfolio.com"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Experience
                </label>
                <input
                  type="text"
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  placeholder="e.g., 3-5 years"
                />
              </div>

              <div>
                <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">
                  Availability
                </label>
                <select
                  id="availability"
                  name="availability"
                  value={formData.availability}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="Immediately">Immediately</option>
                  <option value="1 week notice">1 week notice</option>
                  <option value="2 weeks notice">2 weeks notice</option>
                  <option value="1 month notice">1 month notice</option>
                  <option value="2+ months notice">2+ months notice</option>
                </select>
              </div>
            </div>
          </div>

          {/* Resume Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Resume <span className="text-red-500">*</span>
            </h3>
            
            {!resume ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                  isDragging
                    ? 'border-gray-800 bg-gray-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="resume-upload"
                />
                <label htmlFor="resume-upload" className="cursor-pointer">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-4"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-semibold text-gray-900">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, DOC, DOCX, or TXT (MAX. 5MB)
                  </p>
                </label>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {resume.name}
                        {resume.isFromProfile && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">From Profile</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(resume.size || 0)}
                        {resume.isFromProfile && ' • Using saved resume from your profile'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeResume}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cover Letter */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Cover Letter <span className="text-red-500">*</span>
            </h3>
            <textarea
              id="coverLetter"
              name="coverLetter"
              value={formData.coverLetter}
              onChange={handleInputChange}
              required
              rows={6}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
              placeholder="Tell us why you're interested in this position and what makes you a great fit..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                // Don't clear saved data when closing - user might want to come back
                // Data will be cleared on successful submission or when applying to a different job
                onClose();
              }}
              disabled={isSubmitting}
              className="flex-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-900 font-semibold py-3 px-6 transition disabled:cursor-not-allowed text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-md bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold py-3 px-6 transition disabled:cursor-not-allowed text-sm"
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
          </div>
        </form>
      </div>
    </div>
  );
}

