import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getUserProfile, saveUserProfile } from '../api/jobApi';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'jobApplicationFormData';
const STORAGE_JOB_KEY = 'jobApplicationJobData';

// Common suggestions data
const COMMON_LOCATIONS = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata',
  'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore',
  'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad',
  'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Remote',
  'Gurgaon', 'Noida', 'Chandigarh', 'Goa', 'Kochi', 'Coimbatore'
];

const COMMON_SKILLS = [
  'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue.js',
  'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes',
  'Git', 'Linux', 'Spring Boot', 'Django', 'Flask', 'Express.js', 'TypeScript',
  'C++', 'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Go', 'Rust', 'Machine Learning',
  'Data Science', 'Artificial Intelligence', 'DevOps', 'Cybersecurity', 'UI/UX Design',
  'Project Management', 'Agile', 'Scrum', 'Sales', 'Marketing', 'Content Writing'
];

const COMMON_HOBBIES = [
  'Reading', 'Writing', 'Photography', 'Painting', 'Drawing', 'Music', 'Dancing',
  'Singing', 'Traveling', 'Cooking', 'Gardening', 'Sports', 'Gaming', 'Movies',
  'Yoga', 'Meditation', 'Cycling', 'Swimming', 'Hiking', 'Running', 'Chess',
  'Blogging', 'Volunteering', 'Learning Languages', 'Crafting', 'Fitness',
  'Trekking', 'Camping', 'Fishing', 'Bird Watching'
];

// Section definitions for the journey
const PROFILE_SECTIONS = [
  {
    id: 'personal',
    title: 'Personal Information',
    icon: '👤',
    description: 'Tell us about yourself',
    fields: ['profilePicture', 'fullName', 'phoneNumber', 'email']
  },
  {
    id: 'professional',
    title: 'Professional Background',
    icon: '💼',
    description: 'Your work experience and skills',
    fields: ['professionalExperiences', 'skills', 'summary']
  },
  {
    id: 'education',
    title: 'Education & Certifications',
    icon: '🎓',
    description: 'Academic achievements and credentials',
    fields: ['educationEntries', 'certificationFiles']
  },
  {
    id: 'location',
    title: 'Location Preferences',
    icon: '📍',
    description: 'Where do you want to work?',
    fields: ['currentLocation', 'preferredLocations', 'workPreference', 'willingToRelocate']
  },
  {
    id: 'hobbies',
    title: 'Hobbies & Interests',
    icon: '🎨',
    description: 'Share your hobbies and interests',
    fields: ['hobbies']
  },
  {
    id: 'projects',
    title: 'Projects',
    icon: '🚀',
    description: 'Showcase your projects and work',
    fields: ['projects']
  },
  {
    id: 'links',
    title: 'Online Presence',
    icon: '🔗',
    description: 'Connect your profiles and portfolios',
    fields: ['linkedInUrl', 'portfolioUrl', 'githubUrl', 'websiteUrl']
  },
  {
    id: 'additional',
    title: 'Additional Details',
    icon: '📝',
    description: 'Availability and expectations',
    fields: ['availability', 'expectedSalary', 'coverLetterTemplate']
  },
  {
    id: 'resume',
    title: 'Resume Upload',
    icon: '📄',
    description: 'Upload your resume document',
    fields: ['resume']
  }
];

export default function ProfileBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const fileInputRef = useRef(null);

  // Check if user came from application form
  const cameFromApplication = location.state?.returnToApplication || false;
  const jobId = location.state?.jobId || null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState(new Set());

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    profilePictureBase64: '',
    profilePictureFileType: '',
    profilePictureFileName: '',
    profilePictureFileSize: 0,
    currentPosition: '',  // Keep for backward compatibility
    currentCompany: '',  // Keep for backward compatibility
    experience: '',
    professionalExperiences: [],
    skills: [],
    summary: '',
    currentLocation: '',
    preferredLocations: [],
    workPreference: 'Remote',
    willingToRelocate: false,
    linkedInUrl: '',
    portfolioUrl: '',
    githubUrl: '',
    websiteUrl: '',
    availability: 'Immediately',
    expectedSalary: '',
    coverLetterTemplate: '',
    education: '',  // Keep for backward compatibility
    educationEntries: [],
    certifications: '',  // Keep for backward compatibility
    certificationFiles: [],
    hobbies: [],
    projects: [],
  });

  const [resume, setResume] = useState(null);
  const [skillsInput, setSkillsInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [hobbiesInput, setHobbiesInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showSkillsSuggestions, setShowSkillsSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showHobbiesSuggestions, setShowHobbiesSuggestions] = useState(false);
  const certificationFileInputRef = useRef(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/');
        return;
      }
      loadProfile();
    }
  }, [isAuthenticated, authLoading, navigate]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await getUserProfile();
      if (profile) {
        console.log('Loading profile data from database:', profile);

        setFormData({
          fullName: profile.fullName || user?.name || '',
          phoneNumber: profile.phoneNumber || '',
          email: profile.email || user?.email || '',
          profilePictureBase64: profile.profilePictureBase64 || '',
          profilePictureFileType: profile.profilePictureFileType || '',
          profilePictureFileName: profile.profilePictureFileName || '',
          profilePictureFileSize: profile.profilePictureFileSize || 0,
          currentPosition: profile.currentPosition || '',
          currentCompany: profile.currentCompany || '',
          experience: profile.experience || '',
          skills: profile.skills || [],
          summary: profile.summary || '',
          currentLocation: profile.currentLocation || '',
          preferredLocations: profile.preferredLocations || (profile.preferredLocation ? [profile.preferredLocation] : []),
          workPreference: profile.workPreference || 'Remote',
          willingToRelocate: profile.willingToRelocate || false,
          linkedInUrl: profile.linkedInUrl || '',
          portfolioUrl: profile.portfolioUrl || '',
          githubUrl: profile.githubUrl || '',
          websiteUrl: profile.websiteUrl || '',
          availability: profile.availability || 'Immediately',
          expectedSalary: profile.expectedSalary || '',
          coverLetterTemplate: profile.coverLetterTemplate || '',
          education: profile.education || '',
          educationEntries: profile.educationEntries || [],
          certifications: profile.certifications || '',
          certificationFiles: profile.certificationFiles || [],
          professionalExperiences: profile.professionalExperiences || [],
          hobbies: profile.hobbies || [],
          projects: profile.projects || [],
        });

        setSkillsInput('');
        setLocationInput('');
        setHobbiesInput('');

        if (profile.resumeBase64 && profile.resumeFileName) {
          const resumeFile = {
            name: profile.resumeFileName,
            type: profile.resumeFileType || 'application/pdf',
            size: profile.resumeFileSize || 0,
            isFromProfile: true,
            base64: profile.resumeBase64,
          };
          setResume(resumeFile);
        }

        setProfileLoaded(true);

        // Calculate completion directly from loaded profile data
        const completed = new Set();
        PROFILE_SECTIONS.forEach(section => {
          const isComplete = section.fields.every(field => {
            if (field === 'resume') {
              return profile.resumeBase64 && profile.resumeFileName;
            }
            if (field === 'profilePicture') {
              return profile.profilePictureBase64 && profile.profilePictureBase64.length > 0;
            }
            const value = profile[field];
            if (field === 'skills' || field === 'preferredLocations' || field === 'hobbies' ||
              field === 'professionalExperiences' || field === 'educationEntries' ||
              field === 'certificationFiles' || field === 'projects') {
              return Array.isArray(value) && value.length > 0;
            }
            if (field === 'willingToRelocate') {
              return true;
            }
            return value !== null && value !== undefined && value !== '';
          });
          if (isComplete) {
            completed.add(section.id);
          }
        });
        setCompletedSections(completed);
      } else {
        setFormData(prev => ({
          ...prev,
          fullName: user?.name || '',
          email: user?.email || '',
        }));
        setProfileLoaded(false);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      if (err.response?.status !== 404) {
        setError('Failed to load profile from database');
      }
    } finally {
      setLoading(false);
    }
  };

  const isFieldFilled = (fieldName) => {
    const value = formData[fieldName];
    if (fieldName === 'resume') {
      return resume !== null;
    }
    if (fieldName === 'profilePicture') {
      return formData.profilePictureBase64 && formData.profilePictureBase64.length > 0;
    }
    if (fieldName === 'skills' || fieldName === 'preferredLocations' || fieldName === 'hobbies' ||
      fieldName === 'professionalExperiences' || fieldName === 'educationEntries' || fieldName === 'certificationFiles' ||
      fieldName === 'projects') {
      return Array.isArray(value) && value.length > 0;
    }
    if (fieldName === 'willingToRelocate') {
      return true; // Checkbox is always considered filled
    }
    return value !== null && value !== undefined && value !== '';
  };

  const isSectionComplete = (section) => {
    return section.fields.every(field => isFieldFilled(field));
  };

  // Auto-save function to save profile to database
  const autoSaveProfile = async (dataToSave) => {
    try {
      console.log('Auto-saving section to database...');
      await saveUserProfile(dataToSave);
      console.log('Section auto-saved successfully');
      return true;
    } catch (err) {
      console.error('Auto-save failed:', err);
      // Don't show error toast for auto-save to avoid interrupting user
      return false;
    }
  };

  const updateCompletedSections = async () => {
    const completed = new Set();
    PROFILE_SECTIONS.forEach(section => {
      if (isSectionComplete(section)) {
        completed.add(section.id);
      }
    });
    setCompletedSections(completed);

    // Auto-save the current form data to database whenever a section is completed
    if (formData.fullName.trim()) {
      const profileData = { ...formData };
      
      // Include resume if present
      if (resume) {
        if (resume.isFromProfile && resume.base64) {
          profileData.resumeFileName = resume.name;
          profileData.resumeFileType = resume.type;
          profileData.resumeBase64 = resume.base64;
          profileData.resumeFileSize = resume.size;
        } else if (resume && resume.size) {
          // For newly selected files, convert to base64
          const reader = new FileReader();
          reader.onload = async (e) => {
            profileData.resumeFileName = resume.name;
            profileData.resumeFileType = resume.type;
            profileData.resumeBase64 = e.target.result.split(',')[1];
            profileData.resumeFileSize = resume.size;
            await autoSaveProfile(profileData);
          };
          reader.readAsDataURL(resume);
        }
      } else {
        await autoSaveProfile(profileData);
      }
    }
  };

  const calculateProgress = () => {
    const totalFields = PROFILE_SECTIONS.reduce((sum, section) => sum + section.fields.length, 0);
    let filledFields = 0;

    PROFILE_SECTIONS.forEach(section => {
      section.fields.forEach(field => {
        if (isFieldFilled(field)) {
          filledFields++;
        }
      });
    });

    return Math.round((filledFields / totalFields) * 100);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
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
      // Force update of completed sections
      setTimeout(() => updateCompletedSections(), 100);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
    // Force update of completed sections
    setTimeout(() => updateCompletedSections(), 100);
  };

  const handleAddLocation = (location) => {
    const trimmedLocation = location.trim();
    if (trimmedLocation && !formData.preferredLocations.includes(trimmedLocation)) {
      setFormData(prev => ({
        ...prev,
        preferredLocations: [...prev.preferredLocations, trimmedLocation]
      }));
      setLocationInput('');
      setShowLocationSuggestions(false);
      // Force update of completed sections
      setTimeout(() => updateCompletedSections(), 100);
    }
  };

  const handleRemoveLocation = (locationToRemove) => {
    setFormData(prev => ({
      ...prev,
      preferredLocations: prev.preferredLocations.filter(location => location !== locationToRemove)
    }));
    // Force update of completed sections
    setTimeout(() => updateCompletedSections(), 100);
  };

  const handleAddHobby = (hobby) => {
    const trimmedHobby = hobby.trim();
    if (trimmedHobby && !formData.hobbies.includes(trimmedHobby)) {
      setFormData(prev => ({
        ...prev,
        hobbies: [...prev.hobbies, trimmedHobby]
      }));
      setHobbiesInput('');
      setShowHobbiesSuggestions(false);
      // Force update of completed sections
      setTimeout(() => updateCompletedSections(), 100);
    }
  };

  const handleRemoveHobby = (hobbyToRemove) => {
    setFormData(prev => ({
      ...prev,
      hobbies: prev.hobbies.filter(hobby => hobby !== hobbyToRemove)
    }));
    // Force update of completed sections
    setTimeout(() => updateCompletedSections(), 100);
  };

  // Project Handlers
  const handleAddProject = () => {
    setFormData(prev => ({
      ...prev,
      projects: [...prev.projects, {
        name: '',
        description: '',
        githubLink: '',
        websiteLink: ''
      }]
    }));
    setTimeout(() => updateCompletedSections(), 100);
  };

  const handleUpdateProject = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.projects];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, projects: updated };
    });
    setTimeout(() => updateCompletedSections(), 100);
  };

  const handleRemoveProject = (index) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
    setTimeout(() => updateCompletedSections(), 100);
  };

  // Professional Experience Handlers
  const handleAddExperience = () => {
    setFormData(prev => ({
      ...prev,
      professionalExperiences: [...prev.professionalExperiences, {
        jobTitle: '',
        company: '',
        startDate: '',
        endDate: '',
        isCurrentJob: false,
        description: ''
      }]
    }));
  };

  const handleUpdateExperience = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.professionalExperiences];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'isCurrentJob' && value) {
        updated[index].endDate = '';
      }
      return { ...prev, professionalExperiences: updated };
    });
    setTimeout(() => updateCompletedSections(), 100);
  };

  const handleRemoveExperience = (index) => {
    setFormData(prev => ({
      ...prev,
      professionalExperiences: prev.professionalExperiences.filter((_, i) => i !== index)
    }));
    setTimeout(() => updateCompletedSections(), 100);
  };

  // Education Handlers
  const handleAddEducation = () => {
    setFormData(prev => ({
      ...prev,
      educationEntries: [...prev.educationEntries, {
        level: '',
        degree: '',
        institution: '',
        board: '',
        passingYear: '',
        percentage: '',
        stream: ''
      }]
    }));
  };

  const handleUpdateEducation = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.educationEntries];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, educationEntries: updated };
    });
    setTimeout(() => updateCompletedSections(), 100);
  };

  const handleRemoveEducation = (index) => {
    setFormData(prev => ({
      ...prev,
      educationEntries: prev.educationEntries.filter((_, i) => i !== index)
    }));
    setTimeout(() => updateCompletedSections(), 100);
  };

  // Certification File Handlers
  const handleCertificationFileSelect = async (file, index) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1];
      setFormData(prev => {
        const updated = [...prev.certificationFiles];
        if (!updated[index]) {
          updated[index] = {
            name: '',
            fileName: file.name,
            fileType: file.type,
            fileBase64: base64,
            fileSize: file.size,
            issuingOrganization: '',
            issueDate: '',
            expiryDate: ''
          };
        } else {
          updated[index] = {
            ...updated[index],
            fileName: file.name,
            fileType: file.type,
            fileBase64: base64,
            fileSize: file.size
          };
        }
        return { ...prev, certificationFiles: updated };
      });
      setTimeout(() => updateCompletedSections(), 100);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCertification = () => {
    setFormData(prev => ({
      ...prev,
      certificationFiles: [...prev.certificationFiles, {
        name: '',
        fileName: '',
        fileType: '',
        fileBase64: '',
        fileSize: 0,
        issuingOrganization: '',
        issueDate: '',
        expiryDate: ''
      }]
    }));
  };

  const handleUpdateCertification = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.certificationFiles];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, certificationFiles: updated };
    });
    setTimeout(() => updateCompletedSections(), 100);
  };

  const handleRemoveCertification = (index) => {
    setFormData(prev => ({
      ...prev,
      certificationFiles: prev.certificationFiles.filter((_, i) => i !== index)
    }));
    setTimeout(() => updateCompletedSections(), 100);
  };

  const getFilteredSuggestions = (input, suggestions, existingItems) => {
    if (!input || input.trim().length < 2) return [];
    const lowerInput = input.toLowerCase();
    return suggestions
      .filter(item =>
        item.toLowerCase().includes(lowerInput) &&
        !existingItems.includes(item)
      )
      .slice(0, 8);
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    const allowedTypes = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, DOC, DOCX, or TXT file');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setResume(file);

    // Mark resume section as complete
    if (!completedSections.has('resume')) {
      setCompletedSections(prev => new Set([...prev, 'resume']));
    }

    // Check if profile is complete and show toast
    setTimeout(() => {
      const progress = calculateProgress();
      if (progress === 100) {
        toast.success('🎉 Congratulations! Your profile is 100% complete!', {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    }, 200);
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

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleSectionChange = async (newIndex) => {
    // Auto-save before changing section
    if (formData.fullName.trim()) {
      const profileData = { ...formData };
      
      if (resume) {
        if (resume.isFromProfile && resume.base64) {
          profileData.resumeFileName = resume.name;
          profileData.resumeFileType = resume.type;
          profileData.resumeBase64 = resume.base64;
          profileData.resumeFileSize = resume.size;
        }
      }
      
      await autoSaveProfile(profileData);
    }

    // Update completion for current section before navigating away
    const currentSection = PROFILE_SECTIONS[currentSectionIndex];
    if (isSectionComplete(currentSection)) {
      setCompletedSections(prev => new Set([...prev, currentSection.id]));
    } else {
      setCompletedSections(prev => {
        const updated = new Set(prev);
        updated.delete(currentSection.id);
        return updated;
      });
    }

    setCurrentSectionIndex(newIndex);
  };

  const handleNext = () => {
    if (currentSectionIndex < PROFILE_SECTIONS.length - 1) {
      handleSectionChange(currentSectionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      handleSectionChange(currentSectionIndex - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.fullName.trim()) {
      setError('Full name is required');
      setCurrentSectionIndex(0);
      return;
    }

    setSaving(true);

    try {
      const profileData = { ...formData };

      if (resume) {
        if (resume.isFromProfile && resume.base64) {
          profileData.resumeFileName = resume.name;
          profileData.resumeFileType = resume.type;
          profileData.resumeBase64 = resume.base64;
          profileData.resumeFileSize = resume.size;
        } else {
          const resumeBase64 = await convertFileToBase64(resume);
          profileData.resumeFileName = resume.name;
          profileData.resumeFileType = resume.type;
          profileData.resumeBase64 = resumeBase64;
          profileData.resumeFileSize = resume.size;
        }
      }

      // Log the data being sent for debugging
      console.log('=========================================');
      console.log('SAVING PROFILE DATA TO BACKEND');
      console.log('Full profile data object:', JSON.stringify(profileData, null, 2));
      console.log('Skills:', profileData.skills);
      console.log('Professional Experiences:', profileData.professionalExperiences);
      console.log('Education Entries:', profileData.educationEntries);
      console.log('Certification Files:', profileData.certificationFiles);
      console.log('Hobbies:', profileData.hobbies);
      console.log('Projects:', profileData.projects);
      console.log('Preferred Locations:', profileData.preferredLocations);
      console.log('Summary:', profileData.summary);
      console.log('Profile Picture Base64:', profileData.profilePictureBase64 ? 'Present (' + profileData.profilePictureBase64.length + ' chars)' : 'Not present');
      console.log('Profile Picture File Name:', profileData.profilePictureFileName);
      console.log('Profile Picture File Type:', profileData.profilePictureFileType);
      console.log('=========================================');

      const savedProfile = await saveUserProfile(profileData);

      console.log('Profile saved successfully:', savedProfile);

      setSuccess(true);

      if (profileLoaded) {
        toast.success('Profile updated successfully! 🎉', {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        toast.success('Profile created successfully! 🎉', {
          position: "top-right",
          autoClose: 3000,
        });
      }

      setProfileLoaded(true);

      // Reload the profile to ensure we have the latest data
      await loadProfile();

      // Dispatch event to notify Header that profile was saved
      window.dispatchEvent(new Event('profileSaved'));

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      });
      const errorMessage = err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        'Failed to save profile. Please check your connection and try again.';
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const progressPercentage = calculateProgress();
  const currentSection = PROFILE_SECTIONS[currentSectionIndex];
  const isCurrentSectionComplete = isSectionComplete(currentSection);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 rounded-full border-4 border-gray-200 border-t-gray-400"></div>
          <p className="mt-4 text-gray-500 text-sm font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            {cameFromApplication ? (
              <button
                onClick={() => {
                  // Navigate back to job list with state to indicate return from profile
                  navigate('/apply-jobs', { state: { returnFromProfile: true } });
                  toast.info('Returning to application form. Your previous entries will be restored.', {
                    position: "top-right",
                    autoClose: 3000,
                  });
                }}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 text-sm transition-colors"
              >
                ← Back to Application Form
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-2 text-sm transition-colors"
              >
                ← Back to Dashboard
              </button>
            )}
            {cameFromApplication && (
              <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                💡 Your application form data is saved. You can return anytime!
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-200">
              <span className="text-3xl">{currentSection.icon}</span>
            </div>
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-semibold text-gray-800 tracking-tight">
                Build Your Profile
              </h1>
              <p className="mt-2 text-gray-500 text-base">
                Complete your profile step by step - {currentSection.description}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-200">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-700">Profile Completion</p>
                  <p className="text-sm text-gray-500">Continue building your profile</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold text-gray-800 mb-1">{progressPercentage}%</div>
                <p className="text-xs text-gray-500">Complete</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Section Indicators */}
            <div className="mt-6 grid grid-cols-7 gap-2">
              {PROFILE_SECTIONS.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(index)}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200 ${index === currentSectionIndex
                    ? 'bg-indigo-50 border-2 border-indigo-300 text-indigo-700 shadow-sm'
                    : completedSections.has(section.id)
                      ? 'bg-blue-50 border-2 border-blue-200 text-blue-700 hover:bg-blue-100'
                      : 'bg-gray-50 border-2 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                >
                  <div className="text-xl">{section.icon}</div>
                  <div className="text-xs font-medium text-center leading-tight">{section.title.split(' ')[0]}</div>
                  {completedSections.has(section.id) && index !== currentSectionIndex && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-pink-200 bg-pink-50 p-5 text-pink-700 text-sm font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-700 text-sm font-medium">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Profile saved successfully</span>
            </div>
          </div>
        )}

        {/* Current Section Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 md:p-10">
          {/* Section Header */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl border ${isCurrentSectionComplete
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-indigo-50 border-indigo-200'
                  }`}>
                  {currentSection.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-1">
                    {currentSection.title}
                  </h2>
                  <p className="text-gray-500 text-sm">{currentSection.description}</p>
                </div>
              </div>
              {isCurrentSectionComplete && (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium border border-blue-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete
                </div>
              )}
            </div>
          </div>

          {/* Section Content */}
          <div>
            {/* Render section-specific fields */}
            {currentSection.id === 'personal' && (
              <div className="space-y-6">
                {/* Profile Picture Upload */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-200 p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    Profile Picture
                    {formData.profilePictureBase64 && <span className="text-blue-600 text-xs">✓</span>}
                  </label>
                  <div className="flex items-center gap-6">
                    {/* Profile Picture Preview */}
                    <div className="flex-shrink-0">
                      {formData.profilePictureBase64 ? (
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-300 bg-white flex items-center justify-center">
                          <img
                            src={`data:${formData.profilePictureFileType};base64,${formData.profilePictureBase64}`}
                            alt="Profile Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-full border-4 border-gray-300 bg-gray-100 flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Upload Button */}
                    <div className="flex-1">
                      <div className="relative inline-block">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
                              toast.error('Please upload a valid image file (JPEG, PNG, GIF, WebP)');
                              return;
                            }
                            
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error('Image size must be less than 2MB');
                              return;
                            }
                            
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = event.target.result.split(',')[1];
                              setFormData(prev => ({
                                ...prev,
                                profilePictureBase64: base64,
                                profilePictureFileType: file.type,
                                profilePictureFileName: file.name,
                                profilePictureFileSize: file.size
                              }));
                              toast.success('Profile picture uploaded successfully!');
                              setTimeout(() => updateCompletedSections(), 100);
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                          id="profilePictureInput"
                        />
                        <label
                          htmlFor="profilePictureInput"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg cursor-pointer transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Upload Picture
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Recommended: Square image, at least 400x400px, Max 2MB
                      </p>
                      {formData.profilePictureFileName && (
                        <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">File:</span> {formData.profilePictureFileName}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Other personal fields */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Full Name <span className="text-pink-400">*</span>
                      {isFieldFilled('fullName') && <span className="text-blue-600 text-xs">✓</span>}
                    </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Phone Number
                    {isFieldFilled('phoneNumber') && <span className="text-blue-600 text-xs">✓</span>}
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Email
                    {isFieldFilled('email') && <span className="text-blue-600 text-xs">✓</span>}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
              </div>
              </div>
            )}

            {currentSection.id === 'professional' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    Professional Experiences
                    {isFieldFilled('professionalExperiences') && <span className="text-blue-600 text-xs">✓</span>}
                  </label>
                  <button
                    type="button"
                    onClick={handleAddExperience}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-200"
                  >
                    + Add Experience
                  </button>
                </div>

                {formData.professionalExperiences.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No professional experiences added yet. Click "Add Experience" to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.professionalExperiences.map((exp, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-6 bg-indigo-50">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium text-gray-700">Experience {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => handleRemoveExperience(index)}
                            className="text-pink-400 hover:text-pink-500 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Job Title *</label>
                            <input
                              type="text"
                              value={exp.jobTitle || ''}
                              onChange={(e) => handleUpdateExperience(index, 'jobTitle', e.target.value)}
                              placeholder="e.g., Software Engineer"
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Company *</label>
                            <input
                              type="text"
                              value={exp.company || ''}
                              onChange={(e) => handleUpdateExperience(index, 'company', e.target.value)}
                              placeholder="e.g., Google"
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
                            <input
                              type="month"
                              value={exp.startDate || ''}
                              onChange={(e) => handleUpdateExperience(index, 'startDate', e.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                            <input
                              type="month"
                              value={exp.endDate || ''}
                              onChange={(e) => handleUpdateExperience(index, 'endDate', e.target.value)}
                              disabled={exp.isCurrentJob}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                              <input
                                type="checkbox"
                                checked={exp.isCurrentJob || false}
                                onChange={(e) => handleUpdateExperience(index, 'isCurrentJob', e.target.checked)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-200"
                              />
                              I currently work here
                            </label>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                            <textarea
                              value={exp.description || ''}
                              onChange={(e) => handleUpdateExperience(index, 'description', e.target.value)}
                              rows={3}
                              placeholder="Describe your role and achievements..."
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-100 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Skills
                    {isFieldFilled('skills') && <span className="text-blue-600 text-xs">✓</span>}
                  </label>
                  {/* Skills Tags */}
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
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
                  )}
                  {/* Skills Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={skillsInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSkillsInput(value);
                        setShowSkillsSuggestions(value.trim().length >= 2);
                      }}
                      onFocus={() => {
                        if (skillsInput.trim().length >= 2) {
                          setShowSkillsSuggestions(true);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowSkillsSuggestions(false), 200)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && skillsInput.trim()) {
                          e.preventDefault();
                          handleAddSkill(skillsInput);
                        }
                      }}
                      placeholder="Type at least 2 letters to see suggestions"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                    />
                    {showSkillsSuggestions && skillsInput.trim().length >= 2 && getFilteredSuggestions(skillsInput, COMMON_SKILLS, formData.skills).length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {getFilteredSuggestions(skillsInput, COMMON_SKILLS, formData.skills).map((skill, index) => (
                          <button
                            key={index}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleAddSkill(skill);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors cursor-pointer"
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Type at least 2 letters and click a suggestion or press Enter to add</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Professional Summary
                    {isFieldFilled('summary') && <span className="text-blue-600 text-xs">✓</span>}
                  </label>
                  <textarea
                    name="summary"
                    value={formData.summary}
                    onChange={handleInputChange}
                    rows={5}
                    placeholder="Brief summary of your professional background..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-lavender-400 focus:outline-none focus:ring-1 focus:ring-lavender-200 resize-none"
                  />
                </div>
              </div>
            )}

            {currentSection.id === 'education' && (
              <div className="space-y-8">
                {/* Education Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      Education
                      {isFieldFilled('educationEntries') && <span className="text-blue-600 text-xs">✓</span>}
                    </label>
                    <button
                      type="button"
                      onClick={handleAddEducation}
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-200"
                    >
                      + Add Education
                    </button>
                  </div>

                  {formData.educationEntries.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No education entries added yet. Click "Add Education" to get started.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.educationEntries.map((edu, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-6 bg-purple-50">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-medium text-gray-700">Education {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => handleRemoveEducation(index)}
                              className="text-pink-400 hover:text-pink-500 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Level *</label>
                              <select
                                value={edu.level || ''}
                                onChange={(e) => handleUpdateEducation(index, 'level', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-100"
                              >
                                <option value="">Select Level</option>
                                <option value="Class 12th">Class 12th</option>
                                <option value="Graduation">Graduation</option>
                                <option value="Post Graduation">Post Graduation</option>
                                <option value="Diploma">Diploma</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Degree/Course</label>
                              <input
                                type="text"
                                value={edu.degree || ''}
                                onChange={(e) => handleUpdateEducation(index, 'degree', e.target.value)}
                                placeholder="e.g., B.Tech, B.Sc, M.Tech"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Institution/University *</label>
                              <input
                                type="text"
                                value={edu.institution || ''}
                                onChange={(e) => handleUpdateEducation(index, 'institution', e.target.value)}
                                placeholder="e.g., IIT Delhi, Delhi University"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                              />
                            </div>
                            {edu.level === 'Class 12th' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Board</label>
                                <input
                                  type="text"
                                  value={edu.board || ''}
                                  onChange={(e) => handleUpdateEducation(index, 'board', e.target.value)}
                                  placeholder="e.g., CBSE, ICSE, State Board"
                                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                                />
                              </div>
                            )}
                            {edu.level === 'Class 12th' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Stream</label>
                                <select
                                  value={edu.stream || ''}
                                  onChange={(e) => handleUpdateEducation(index, 'stream', e.target.value)}
                                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-100"
                                >
                                  <option value="">Select Stream</option>
                                  <option value="Science">Science</option>
                                  <option value="Commerce">Commerce</option>
                                  <option value="Arts">Arts</option>
                                </select>
                              </div>
                            )}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Passing Year</label>
                              <input
                                type="text"
                                value={edu.passingYear || ''}
                                onChange={(e) => handleUpdateEducation(index, 'passingYear', e.target.value)}
                                placeholder="e.g., 2020"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Percentage/CGPA</label>
                              <input
                                type="text"
                                value={edu.percentage || ''}
                                onChange={(e) => handleUpdateEducation(index, 'percentage', e.target.value)}
                                placeholder="e.g., 85% or 8.5 CGPA"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Certifications Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      Certifications
                      {isFieldFilled('certificationFiles') && <span className="text-blue-600 text-xs">✓</span>}
                    </label>
                    <button
                      type="button"
                      onClick={handleAddCertification}
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-200"
                    >
                      + Add Certification
                    </button>
                  </div>

                  {formData.certificationFiles.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No certifications added yet. Click "Add Certification" to get started.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.certificationFiles.map((cert, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-6 bg-purple-50">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-medium text-gray-700">Certification {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => handleRemoveCertification(index)}
                              className="text-pink-400 hover:text-pink-500 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Certification Name *</label>
                              <input
                                type="text"
                                value={cert.name || ''}
                                onChange={(e) => handleUpdateCertification(index, 'name', e.target.value)}
                                placeholder="e.g., AWS Certified Solutions Architect"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Issuing Organization</label>
                              <input
                                type="text"
                                value={cert.issuingOrganization || ''}
                                onChange={(e) => handleUpdateCertification(index, 'issuingOrganization', e.target.value)}
                                placeholder="e.g., Amazon Web Services"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Issue Date</label>
                              <input
                                type="month"
                                value={cert.issueDate || ''}
                                onChange={(e) => handleUpdateCertification(index, 'issueDate', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date (if applicable)</label>
                              <input
                                type="month"
                                value={cert.expiryDate || ''}
                                onChange={(e) => handleUpdateCertification(index, 'expiryDate', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-100"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Certification File *</label>
                              <input
                                ref={certificationFileInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => handleCertificationFileSelect(e.target.files[0], index)}
                                className="hidden"
                                id={`cert-file-${index}`}
                              />
                              <label htmlFor={`cert-file-${index}`} className="cursor-pointer">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-300 hover:bg-purple-50 transition-colors">
                                  {cert.fileName ? (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-sm text-gray-700">{cert.fileName}</span>
                                        <span className="text-xs text-gray-500">({formatFileSize(cert.fileSize || 0)})</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateCertification(index, 'fileName', '');
                                          handleUpdateCertification(index, 'fileBase64', '');
                                          handleUpdateCertification(index, 'fileSize', 0);
                                          if (certificationFileInputRef.current) certificationFileInputRef.current.value = '';
                                        }}
                                        className="text-pink-400 hover:text-pink-500 text-sm"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-sm text-gray-600 mb-1">
                                        <span className="text-purple-400">Click to upload</span> certification file
                                      </p>
                                      <p className="text-xs text-gray-400">PDF, DOC, DOCX, JPG, PNG (MAX. 5MB)</p>
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentSection.id === 'location' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Current Location
                      {isFieldFilled('currentLocation') && <span className="text-blue-600 text-xs">✓</span>}
                    </label>
                    <input
                      type="text"
                      name="currentLocation"
                      value={formData.currentLocation}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Preferred Locations
                      {isFieldFilled('preferredLocations') && <span className="text-blue-600 text-xs">✓</span>}
                    </label>
                    {/* Preferred Locations Tags */}
                    {formData.preferredLocations.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.preferredLocations.map((location, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200"
                          >
                            {location}
                            <button
                              type="button"
                              onClick={() => handleRemoveLocation(location)}
                              className="text-blue-600 hover:text-blue-700 focus:outline-none"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Location Input */}
                    <div className="relative">
                      <input
                        type="text"
                        value={locationInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          setLocationInput(value);
                          setShowLocationSuggestions(value.trim().length >= 2);
                        }}
                        onFocus={() => {
                          if (locationInput.trim().length >= 2) {
                            setShowLocationSuggestions(true);
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && locationInput.trim()) {
                            e.preventDefault();
                            handleAddLocation(locationInput);
                          }
                        }}
                        placeholder="Type at least 2 letters to see suggestions"
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                      />
                      {showLocationSuggestions && locationInput.trim().length >= 2 && getFilteredSuggestions(locationInput, COMMON_LOCATIONS, formData.preferredLocations).length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {getFilteredSuggestions(locationInput, COMMON_LOCATIONS, formData.preferredLocations).map((location, index) => (
                            <button
                              key={index}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleAddLocation(location);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors cursor-pointer"
                            >
                              {location}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">Type at least 2 letters and click a suggestion or press Enter to add</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Work Preference
                      {isFieldFilled('workPreference') && <span className="text-blue-600 text-xs">✓</span>}
                    </label>
                    <select
                      name="workPreference"
                      value={formData.workPreference}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 transition-colors focus:border-lavender-400 focus:outline-none focus:ring-1 focus:ring-lavender-200"
                    >
                      <option value="Remote">Remote</option>
                      <option value="On-site">On-site</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-8">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="willingToRelocate"
                        name="willingToRelocate"
                        checked={formData.willingToRelocate}
                        onChange={handleInputChange}
                        className="h-5 w-5 text-purple-400 focus:ring-purple-300 border-gray-300 rounded cursor-pointer"
                      />
                      <label htmlFor="willingToRelocate" className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                        Willing to relocate
                        <span className="text-blue-600 text-xs">✓</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentSection.id === 'hobbies' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Hobbies & Interests
                    {isFieldFilled('hobbies') && <span className="text-blue-600 text-xs">✓</span>}
                  </label>
                  {/* Hobbies Tags */}
                  {formData.hobbies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.hobbies.map((hobby, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium border border-purple-200"
                        >
                          {hobby}
                          <button
                            type="button"
                            onClick={() => handleRemoveHobby(hobby)}
                            className="text-purple-500 hover:text-purple-700 focus:outline-none"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Hobbies Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={hobbiesInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setHobbiesInput(value);
                        setShowHobbiesSuggestions(value.trim().length >= 2);
                      }}
                      onFocus={() => {
                        if (hobbiesInput.trim().length >= 2) {
                          setShowHobbiesSuggestions(true);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowHobbiesSuggestions(false), 200)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && hobbiesInput.trim()) {
                          e.preventDefault();
                          handleAddHobby(hobbiesInput);
                        }
                      }}
                      placeholder="Type at least 2 letters to see suggestions"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                    />
                    {showHobbiesSuggestions && hobbiesInput.trim().length >= 2 && getFilteredSuggestions(hobbiesInput, COMMON_HOBBIES, formData.hobbies).length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {getFilteredSuggestions(hobbiesInput, COMMON_HOBBIES, formData.hobbies).map((hobby, index) => (
                          <button
                            key={index}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleAddHobby(hobby);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors cursor-pointer"
                          >
                            {hobby}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Type at least 2 letters and click a suggestion or press Enter to add</p>
                </div>
              </div>
            )}

            {currentSection.id === 'projects' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      Projects
                      {isFieldFilled('projects') && <span className="text-blue-600 text-xs">✓</span>}
                    </label>
                    <button
                      type="button"
                      onClick={handleAddProject}
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-200"
                    >
                      + Add Project
                    </button>
                  </div>

                  {formData.projects.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No projects added yet. Click "Add Project" to showcase your work.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.projects.map((project, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-6 bg-purple-50">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-medium text-gray-700">Project {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => handleRemoveProject(index)}
                              className="text-pink-400 hover:text-pink-500 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Project Name *</label>
                              <input
                                type="text"
                                value={project.name || ''}
                                onChange={(e) => handleUpdateProject(index, 'name', e.target.value)}
                                placeholder="e.g., E-Commerce Website"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                              <textarea
                                value={project.description || ''}
                                onChange={(e) => handleUpdateProject(index, 'description', e.target.value)}
                                placeholder="Describe your project, technologies used, key features, etc."
                                rows={4}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-100 resize-none"
                              />
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">GitHub Link</label>
                                <input
                                  type="url"
                                  value={project.githubLink || ''}
                                  onChange={(e) => handleUpdateProject(index, 'githubLink', e.target.value)}
                                  placeholder="https://github.com/username/project"
                                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Website/Demo Link</label>
                                <input
                                  type="url"
                                  value={project.websiteLink || ''}
                                  onChange={(e) => handleUpdateProject(index, 'websiteLink', e.target.value)}
                                  placeholder="https://yourproject.com"
                                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-gray-400">* At least one link (GitHub or Website) is recommended</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentSection.id === 'links' && (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    LinkedIn URL
                    {isFieldFilled('linkedInUrl') && <span className="text-blue-600 text-xs">✓</span>}
                  </label>
                  <input
                    type="url"
                    name="linkedInUrl"
                    value={formData.linkedInUrl}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Portfolio URL
                    {isFieldFilled('portfolioUrl') && <span className="text-blue-600 text-xs">✓</span>}
                  </label>
                  <input
                    type="url"
                    name="portfolioUrl"
                    value={formData.portfolioUrl}
                    onChange={handleInputChange}
                    placeholder="https://yourportfolio.com"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    GitHub URL
                    {isFieldFilled('githubUrl') && <span className="text-blue-600 text-xs">✓</span>}
                  </label>
                  <input
                    type="url"
                    name="githubUrl"
                    value={formData.githubUrl}
                    onChange={handleInputChange}
                    placeholder="https://github.com/username"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Website URL
                    {isFieldFilled('websiteUrl') && <span className="text-blue-600 text-xs">✓</span>}
                  </label>
                  <input
                    type="url"
                    name="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={handleInputChange}
                    placeholder="https://yourwebsite.com"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
              </div>
            )}

            {currentSection.id === 'additional' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Availability
                      {isFieldFilled('availability') && <span className="text-blue-600 text-xs">✓</span>}
                    </label>
                    <select
                      name="availability"
                      value={formData.availability}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 transition-colors focus:border-lavender-400 focus:outline-none focus:ring-1 focus:ring-lavender-200"
                    >
                      <option value="Immediately">Immediately</option>
                      <option value="1 week notice">1 week notice</option>
                      <option value="2 weeks notice">2 weeks notice</option>
                      <option value="1 month notice">1 month notice</option>
                      <option value="2+ months notice">2+ months notice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Expected Salary
                      {isFieldFilled('expectedSalary') && <span className="text-blue-600 text-xs">✓</span>}
                    </label>
                    <input
                      type="text"
                      name="expectedSalary"
                      value={formData.expectedSalary}
                      onChange={handleInputChange}
                      placeholder="e.g., $50,000 - $70,000"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Cover Letter Template <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                    {isFieldFilled('coverLetterTemplate') && <span className="text-blue-600 text-xs">✓</span>}
                  </label>
                  <textarea
                    name="coverLetterTemplate"
                    value={formData.coverLetterTemplate}
                    onChange={handleInputChange}
                    rows={6}
                    placeholder="Default cover letter template that can be used when applying to jobs..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-lavender-400 focus:outline-none focus:ring-1 focus:ring-lavender-200 resize-none"
                  />
                </div>
              </div>
            )}

            {currentSection.id === 'resume' && (
              <div className="space-y-6">
                {!resume ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${isDragging
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-200 hover:bg-purple-50'
                      }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label htmlFor="resume-upload" className="cursor-pointer">
                      <div className="w-20 h-20 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-5 border border-purple-200">
                        <svg className="h-10 w-10 text-purple-300" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-base text-gray-600 mb-2 font-medium">
                        <span className="text-purple-400">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-sm text-gray-400">PDF, DOC, DOCX, or TXT (MAX. 5MB)</p>
                    </label>
                  </div>
                ) : (
                  <div className="border border-emerald-300 rounded-xl p-6 bg-emerald-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-emerald-200 rounded-lg flex items-center justify-center border border-emerald-300">
                          <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-base font-medium text-gray-700 mb-1 flex items-center gap-2">
                            {resume.name}
                            <span className="text-blue-600 text-xs">✓</span>
                          </p>
                          <p className="text-xs text-gray-500">{formatFileSize(resume.size || 0)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setResume(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-pink-400 hover:text-pink-500 text-sm font-medium px-4 py-2 rounded-lg hover:bg-pink-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4 pt-8 mt-8 border-t border-gray-200">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentSectionIndex === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:bg-gray-50 disabled:border-gray-200 text-gray-700 font-medium transition-colors disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex-1"></div>

            {currentSectionIndex < PROFILE_SECTIONS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-400 hover:bg-purple-500 text-white font-medium transition-colors"
              >
                Next
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 rounded-lg bg-emerald-400 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Profile
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
