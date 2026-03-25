import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { generateHackathonFieldWithAI } from '../api/jobApi';

// Common skills and technologies for hackathons
const COMMON_SKILLS = [
  'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue.js',
  'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes',
  'Git', 'Linux', 'Spring Boot', 'Django', 'Flask', 'Express.js', 'TypeScript',
  'C++', 'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Go', 'Rust', 'Machine Learning',
  'Data Science', 'Artificial Intelligence', 'DevOps', 'Cybersecurity', 'UI/UX Design',
  'Web Development', 'Mobile Development', 'Cloud Computing', 'Blockchain'
];

// Submission format options
const SUBMISSION_FORMATS = ['PDF', 'PPT', 'DOC', 'Video', 'Repository Link', 'Website Link', 'ZIP File', 'Google Drive Link'];
const MIN_PROBLEM_STATEMENT_WORDS = 50;
const TODAY_ISO = new Date().toISOString().split('T')[0];

const countWords = (value) => {
  if (!value || typeof value !== 'string') return 0;
  return value.trim().split(/\s+/).filter(Boolean).length;
};

// Hackathon form sections
const HACKATHON_TABS = [
  { id: 'basic', label: 'Basic Info', icon: '📋', required: true },
  { id: 'problem', label: 'Problem & Skills', icon: '🎯', required: true },
  { id: 'dates', label: 'Dates & Mode', icon: '📅', required: true },
  { id: 'phases', label: 'Phases', icon: '🔄', required: true },
  { id: 'eligibility', label: 'Eligibility', icon: '👥', required: false },
  { id: 'submission', label: 'Submission', icon: '📤', required: false },
  { id: 'capacity', label: 'Capacity & Prizes', icon: '⚙️', required: false }
];

export default function HackathonForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading, isIndustry } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('basic');
  const [completedTabs, setCompletedTabs] = useState(new Set());

  const [formData, setFormData] = useState({
    // Basic Information
    title: '',
    company: '',
    description: '',
    // Problem & Skills
    problemStatement: '',
    skillsRequired: [],
    // Phases
    phases: [
      { id: 1, name: 'Phase 1', description: '', deadline: '', formats: [] }
    ],
    // Eligibility
    eligibilityCriteria: '',
    participationType: 'Both',
    courseBranch: '',
    year: '',
    // Dates & Schedule
    startDate: '',
    endDate: '',
    mode: 'Online',
    venueLocation: '',
    venueTime: '',
    venueDate: '',
    venueReportingTime: '',
    // Submission & Requirements
    submissionProcedure: '',
    requirements: '',
    submissionUrl: '',
    // Capacity & Prize
    participantLimit: '',
    teamSize: '',
    prize: '',
    enabled: true
  });

  const [skillsInput, setSkillsInput] = useState('');
  const [showSkillsSuggestions, setShowSkillsSuggestions] = useState(false);
  const [savedHackathonId, setSavedHackathonId] = useState(null);
  const [nextPhaseId, setNextPhaseId] = useState(2);
  const [generatingAI, setGeneratingAI] = useState({});

  const editingHackathonId = location.state?.hackathonId || null;

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/');
        return;
      }
      if (!isIndustry) {
        toast.error('Only INDUSTRY users can create hackathons');
        navigate('/');
        return;
      }
      if (editingHackathonId) {
        loadHackathon();
      } else {
        setLoading(false);
      }
    }
  }, [isAuthenticated, authLoading, isIndustry, navigate, editingHackathonId]);

  useEffect(() => {
    updateCompletedTabs();
  }, [formData]);

  const loadHackathon = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/hackathons/${editingHackathonId}`
      );

      const hackathon = response.data;
      if (hackathon) {
        setFormData({
          title: hackathon.title || '',
          company: hackathon.company || '',
          description: hackathon.description || '',
          problemStatement: hackathon.problemStatement || '',
          skillsRequired: hackathon.skillsRequired ? (typeof hackathon.skillsRequired === 'string' ? hackathon.skillsRequired.split(',').map(s => s.trim()) : hackathon.skillsRequired) : [],
          eligibilityCriteria: hackathon.eligibilityCriteria || '',
          participationType: hackathon.participationType || 'Both',
          courseBranch: hackathon.courseBranch || '',
          year: hackathon.year || '',
          startDate: hackathon.startDate || '',
          endDate: hackathon.endDate || '',
          mode: hackathon.mode || 'Online',
          venueLocation: hackathon.venueLocation || '',
          venueTime: hackathon.venueTime || '',
          venueDate: hackathon.venueDate || '',
          venueReportingTime: hackathon.venueReportingTime || '',
          submissionProcedure: hackathon.submissionProcedure || '',
          requirements: hackathon.requirements || '',
          submissionUrl: hackathon.submissionUrl || '',
          participantLimit: hackathon.participantLimit ? hackathon.participantLimit.toString() : '',
          teamSize: hackathon.teamSize ? hackathon.teamSize.toString() : '',
          prize: hackathon.prize || '',
          enabled: hackathon.enabled !== undefined ? hackathon.enabled : true
        });
        setSkillsInput('');
        setSavedHackathonId(hackathon.id);
      }
    } catch (err) {
      console.error('Error loading hackathon:', err);
      toast.error('Failed to load hackathon details');
    } finally {
      setLoading(false);
    }
  };

  const isFieldFilled = (fieldName) => {
    const value = formData[fieldName];
    if (fieldName === 'skillsRequired') {
      return Array.isArray(value) && value.length > 0;
    }
    return value !== null && value !== undefined && value !== '';
  };

  const isTabComplete = (tabId) => {
    const problemWordCount = countWords(formData.problemStatement);
    switch (tabId) {
      case 'basic':
        return isFieldFilled('title') && isFieldFilled('company') && isFieldFilled('description');
      case 'problem':
        return isFieldFilled('problemStatement') && problemWordCount >= MIN_PROBLEM_STATEMENT_WORDS;
      case 'phases':
        // Complete if at least one phase has name and formats
        return formData.phases && formData.phases.length > 0 && formData.phases.some(phase => phase.name && phase.formats && phase.formats.length > 0);
      case 'eligibility':
        // Complete only if at least one meaningful field is filled (excluding default values)
        return isFieldFilled('courseBranch') || isFieldFilled('year') || isFieldFilled('eligibilityCriteria');
      case 'dates':
        return isFieldFilled('startDate') && isFieldFilled('endDate') && isFieldFilled('mode');
      case 'submission':
        // Complete only if at least one field is filled
        return isFieldFilled('submissionProcedure') || isFieldFilled('requirements') || isFieldFilled('submissionUrl');
      case 'capacity':
        // Complete only if at least one field is filled
        return isFieldFilled('participantLimit') || isFieldFilled('teamSize') || isFieldFilled('prize');
      default:
        return false;
    }
  };

  const updateCompletedTabs = () => {
    const completed = new Set();
    HACKATHON_TABS.forEach(tab => {
      if (isTabComplete(tab.id)) {
        completed.add(tab.id);
      }
    });
    setCompletedTabs(completed);
  };

  const calculateProgress = () => {
    const requiredTabs = HACKATHON_TABS.filter(tab => tab.required);
    const completedRequired = Array.from(completedTabs).filter(tabId => 
      HACKATHON_TABS.find(tab => tab.id === tabId && tab.required)
    );
    return Math.round((completedRequired.length / requiredTabs.length) * 100);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'startDate' || name === 'endDate') {
      const hasAnyPhaseDeadline = (formData.phases || []).some(phase => !!phase?.deadline);
      if (hasAnyPhaseDeadline) {
        toast.warning('You cannot change hackathon start/end dates after setting phase deadlines. Clear phase deadlines first.', {
          position: "top-right",
          autoClose: 3500,
        });
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const problemWordCount = countWords(formData.problemStatement);
  const isProblemStatementValid = problemWordCount >= MIN_PROBLEM_STATEMENT_WORDS;

  const canLeaveCurrentTab = (nextTabId) => {
    if (nextTabId === activeTab) return true;

    const showValidationError = (message) => {
      toast.error(message, {
        position: "top-right",
        autoClose: 4000,
      });
    };

    if (activeTab === 'basic') {
      if (!formData.title?.trim()) {
        showValidationError('Hackathon Title is required before proceeding.');
        return false;
      }
      if (!formData.company?.trim()) {
        showValidationError('Company/Organization Name is required before proceeding.');
        return false;
      }
      if (!formData.description?.trim()) {
        showValidationError('Hackathon Description is required before proceeding.');
        return false;
      }
    }

    if (activeTab === 'problem') {
      if (!formData.problemStatement?.trim()) {
        showValidationError('Problem Statement is required before proceeding.');
        return false;
      }
      if (!isProblemStatementValid) {
        showValidationError(`Problem Statement must be at least ${MIN_PROBLEM_STATEMENT_WORDS} words before moving to another section.`);
        return false;
      }
    }

    if (activeTab === 'phases') {
      if (!formData.startDate || !formData.endDate) {
        showValidationError('Please select hackathon start and end dates first.');
        return false;
      }
      const invalidPhase = (formData.phases || []).find((phase, idx) => {
        if (!phase?.name?.trim()) {
          showValidationError(`Phase ${idx + 1} name is required.`);
          return true;
        }
        if (!phase?.deadline) {
          showValidationError(`Phase ${idx + 1} deadline is required.`);
          return true;
        }
        if (!phase?.formats || phase.formats.length === 0) {
          showValidationError(`Select at least one submission format for Phase ${idx + 1}.`);
          return true;
        }
        return false;
      });
      if (invalidPhase) return false;

      const dateValidationError = validateDateRules();
      if (dateValidationError) {
        showValidationError(dateValidationError);
        return false;
      }
    }

    if (activeTab === 'dates') {
      if (!formData.startDate) {
        showValidationError('Start Date is required before proceeding.');
        return false;
      }
      if (!formData.endDate) {
        showValidationError('End Date is required before proceeding.');
        return false;
      }
      if (!formData.mode) {
        showValidationError('Hackathon mode is required before proceeding.');
        return false;
      }
      const dateValidationError = validateDateRules();
      if (dateValidationError) {
        showValidationError(dateValidationError);
        return false;
      }
    }

    return true;
  };

  const moveToTab = (nextTabId) => {
    if (!nextTabId || nextTabId === activeTab) return;
    if (!canLeaveCurrentTab(nextTabId)) return;
    setActiveTab(nextTabId);
  };

  const validateDateRules = () => {
    const { startDate, endDate, phases } = formData;

    if (startDate && startDate < TODAY_ISO) {
      return 'Hackathon start date cannot be in the past.';
    }

    if (startDate && endDate && endDate < startDate) {
      return 'Hackathon end date cannot be before start date.';
    }

    let previousPhaseDate = null;
    for (let i = 0; i < (phases || []).length; i += 1) {
      const phase = phases[i];
      if (!phase?.deadline) continue;

      if (phase.deadline < TODAY_ISO) {
        return `Phase ${i + 1} date cannot be in the past.`;
      }
      if (startDate && phase.deadline < startDate) {
        return `Phase ${i + 1} date cannot be before hackathon start date.`;
      }
      if (endDate && phase.deadline > endDate) {
        return `Phase ${i + 1} date cannot be after hackathon end date.`;
      }

      if (previousPhaseDate && phase.deadline < previousPhaseDate) {
        return `Phase ${i + 1} date cannot be before previous phase date.`;
      }

      previousPhaseDate = phase.deadline;
    }

    return null;
  };

  const getPhaseMinDate = (phaseIndex) => {
    const startDate = formData.startDate || TODAY_ISO;
    if (phaseIndex <= 0) {
      return startDate || undefined;
    }
    const prevPhaseDate = formData.phases[phaseIndex - 1]?.deadline || '';
    if (startDate && prevPhaseDate) {
      const candidate = prevPhaseDate > startDate ? prevPhaseDate : startDate;
      return candidate > TODAY_ISO ? candidate : TODAY_ISO;
    }
    const candidate = prevPhaseDate || startDate || TODAY_ISO;
    return candidate > TODAY_ISO ? candidate : TODAY_ISO;
  };

  const getPhaseDateValidationMessage = (phaseId, deadline) => {
    if (!deadline) return null;
    const phaseIndex = formData.phases.findIndex(phase => phase.id === phaseId);
    if (phaseIndex < 0) return null;

    const startDate = formData.startDate || '';
    const endDate = formData.endDate || '';
    const previousDeadline = phaseIndex > 0 ? (formData.phases[phaseIndex - 1]?.deadline || '') : '';

    if (!startDate || !endDate) {
      return 'Please select hackathon start and end dates before setting phase deadlines.';
    }
    if (deadline < TODAY_ISO) {
      return `Phase ${phaseIndex + 1} date cannot be in the past.`;
    }
    if (startDate && deadline < startDate) {
      return `Phase ${phaseIndex + 1} date cannot be before hackathon start date.`;
    }
    if (endDate && deadline > endDate) {
      return `Phase ${phaseIndex + 1} date cannot be after hackathon end date.`;
    }
    if (previousDeadline && deadline < previousDeadline) {
      return `Phase ${phaseIndex + 1} date cannot be before previous phase date.`;
    }
    return null;
  };

  const handleSkillsInputChange = (e) => {
    setSkillsInput(e.target.value);
    setShowSkillsSuggestions(e.target.value.length > 0);
  };

  const handleAddSkill = (skill) => {
    const trimmedSkill = skill.trim();
    if (trimmedSkill && !formData.skillsRequired.includes(trimmedSkill)) {
      setFormData(prev => ({
        ...prev,
        skillsRequired: [...prev.skillsRequired, trimmedSkill]
      }));
      setSkillsInput('');
      setShowSkillsSuggestions(false);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skillsRequired: prev.skillsRequired.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleEnhanceWithAI = async (fieldName, fieldType) => {
    const currentValue = (formData[fieldName] || '').trim();
    if (!currentValue) {
      toast.info('Please write something first, then click Enhance with AI.', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setGeneratingAI(prev => ({ ...prev, [fieldName]: true }));
    try {
      // Build enhancement context from current form data plus existing field content
      const context = [
        `Existing ${fieldType}: ${currentValue}`,
        formData.title ? `Title: ${formData.title}` : '',
        formData.company ? `Company: ${formData.company}` : '',
        formData.skillsRequired.length > 0 ? `Skills: ${formData.skillsRequired.join(', ')}` : '',
        formData.description ? `Description: ${formData.description.substring(0, 200)}` : ''
      ].filter(Boolean).join('\n');

      const generatedContent = await generateHackathonFieldWithAI(fieldType, context);
      
      setFormData(prev => ({
        ...prev,
        [fieldName]: generatedContent
      }));
      
      toast.success('Content enhanced successfully!', {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (err) {
      console.error('Error generating AI content:', err);
      const errorMsg = err.response?.data || err.message || 'Failed to generate content';
      toast.error(errorMsg.includes('API key') || errorMsg.includes('not configured') 
        ? 'AI service is not configured. Please configure OpenAI API key in backend.'
        : 'Failed to enhance content. Please try again.',
      {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setGeneratingAI(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleAddPhase = () => {
    setFormData(prev => ({
      ...prev,
      phases: [...prev.phases, { id: nextPhaseId, name: '', description: '', deadline: '', formats: [] }]
    }));
    setNextPhaseId(nextPhaseId + 1);
  };

  const handleRemovePhase = (phaseId) => {
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.filter(phase => phase.id !== phaseId)
    }));
  };

  const handlePhaseChange = (phaseId, field, value) => {
    if (field === 'deadline') {
      if (!formData.startDate || !formData.endDate) {
        toast.warning('Please select hackathon start and end dates first.', {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }
      const message = getPhaseDateValidationMessage(phaseId, value);
      if (message) {
        toast.warning(message, {
          position: "top-right",
          autoClose: 3500,
        });
        return;
      }
    }
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.map(phase =>
        phase.id === phaseId ? { ...phase, [field]: value } : phase
      )
    }));
  };

  const handlePhaseFormatToggle = (phaseId, format) => {
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.map(phase => {
        if (phase.id === phaseId) {
          const updatedFormats = phase.formats.includes(format)
            ? phase.formats.filter(f => f !== format)
            : [...phase.formats, format];
          return { ...phase, formats: updatedFormats };
        }
        return phase;
      })
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (saving) return;

    const dateValidationError = validateDateRules();
    if (dateValidationError) {
      toast.error(dateValidationError, {
        position: "top-right",
        autoClose: 5000,
      });
      setActiveTab('dates');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const hackathonData = {
        title: formData.title || '',
        company: formData.company || '',
        description: formData.description || '',
        problemStatement: formData.problemStatement || '',
        skillsRequired: formData.skillsRequired.join(', '),
        phases: JSON.stringify(formData.phases),
        eligibilityCriteria: formData.eligibilityCriteria || '',
        participationType: formData.participationType,
        courseBranch: formData.courseBranch || '',
        year: formData.year || '',
        startDate: formData.startDate,
        endDate: formData.endDate,
        mode: formData.mode,
        venueLocation: formData.venueLocation || '',
        venueTime: formData.venueTime || '',
        venueDate: formData.venueDate || '',
        venueReportingTime: formData.venueReportingTime || '',
        submissionProcedure: formData.submissionProcedure || '',
        requirements: formData.requirements || '',
        submissionUrl: formData.submissionUrl || '',
        participantLimit: formData.participantLimit ? parseInt(formData.participantLimit) : null,
        teamSize: formData.teamSize ? parseInt(formData.teamSize) : 0,
        prize: formData.prize || '',
        enabled: false // Save as draft
      };

      let response;
      const hackathonIdToUpdate = savedHackathonId || editingHackathonId;

      if (hackathonIdToUpdate) {
        response = await apiClient.put(
          `/hackathons/${hackathonIdToUpdate}`,
          hackathonData
        );
      } else {
        response = await apiClient.post(
          `/hackathons`,
          hackathonData
        );
        if (response.data && response.data.id) {
          setSavedHackathonId(response.data.id);
        }
      }

      console.log('Hackathon saved as draft');

      // Move to next section
      const currentTabIndex = HACKATHON_TABS.findIndex(tab => tab.id === activeTab);
      if (currentTabIndex < HACKATHON_TABS.length - 1) {
        moveToTab(HACKATHON_TABS[currentTabIndex + 1].id);
      }
    } catch (err) {
      console.error('Error saving hackathon:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (saving) return;

    // Validation
    const missingFields = [];
    if (!formData.title) missingFields.push('Hackathon Title');
    if (!formData.company) missingFields.push('Company Name');
    if (!formData.description) missingFields.push('Hackathon Description');
    if (!formData.problemStatement) missingFields.push('Problem Statement');
    if (!formData.startDate) missingFields.push('Start Date');
    if (!formData.endDate) missingFields.push('End Date');
    if (!formData.mode) missingFields.push('Hackathon Mode');

    if (missingFields.length > 0) {
      toast.error('Please fill in all required fields', {
        position: "top-right",
        autoClose: 5000,
      });

      if (!formData.title || !formData.company || !formData.description) {
        setActiveTab('basic');
      } else if (!formData.problemStatement) {
        setActiveTab('problem');
      } else if (!formData.startDate || !formData.endDate || !formData.mode) {
        setActiveTab('dates');
      }
      return;
    }

    if (!isProblemStatementValid) {
      toast.error(`Problem Statement must contain at least ${MIN_PROBLEM_STATEMENT_WORDS} words.`, {
        position: "top-right",
        autoClose: 5000,
      });
      setActiveTab('problem');
      return;
    }

    const dateValidationError = validateDateRules();
    if (dateValidationError) {
      toast.error(dateValidationError, {
        position: "top-right",
        autoClose: 5000,
      });
      setActiveTab('dates');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const hackathonData = {
        title: formData.title,
        company: formData.company,
        description: formData.description,
        problemStatement: formData.problemStatement,
        skillsRequired: formData.skillsRequired.join(', '),
        phases: JSON.stringify(formData.phases),
        eligibilityCriteria: formData.eligibilityCriteria,
        participationType: formData.participationType,
        courseBranch: formData.courseBranch || null,
        year: formData.year || null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        mode: formData.mode,
        venueLocation: formData.venueLocation || null,
        venueTime: formData.venueTime || null,
        venueDate: formData.venueDate || null,
        venueReportingTime: formData.venueReportingTime || null,
        submissionProcedure: formData.submissionProcedure,
        requirements: formData.requirements,
        submissionUrl: formData.submissionUrl,
        participantLimit: formData.participantLimit ? parseInt(formData.participantLimit) : null,
        teamSize: formData.teamSize ? parseInt(formData.teamSize) : 0,
        prize: formData.prize,
        enabled: true // Publish as active
      };

      let response;
      const hackathonIdToUpdate = savedHackathonId || editingHackathonId;

      if (hackathonIdToUpdate) {
        response = await apiClient.put(
          `/hackathons/${hackathonIdToUpdate}`,
          hackathonData
        );
      } else {
        response = await apiClient.post(
          `/hackathons`,
          hackathonData
        );
      }

      console.log('Hackathon published successfully:', response.data);

      toast.success('Hackathon published successfully!', {
        position: "top-right",
        autoClose: 3000,
      });

      setTimeout(() => {
        navigate('/manage-hackathons');
      }, 2000);
    } catch (err) {
      console.error('Error publishing hackathon:', err);
      const errorMessage = err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        'Failed to publish hackathon. Please try again.';
      setError(errorMessage);
      toast.error('Failed to publish hackathon', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredSkillsSuggestions = COMMON_SKILLS.filter(skill =>
    skill.toLowerCase().includes(skillsInput.toLowerCase()) &&
    !formData.skillsRequired.includes(skill)
  );

  const progressPercentage = calculateProgress();

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
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-2">
              {editingHackathonId ? 'Edit Hackathon' : 'Create Hackathon'}
            </h1>
            <p className="text-gray-600 text-base">
              {editingHackathonId ? 'Update your hackathon details' : 'Fill out the form to post a new hackathon'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Form Progress</h3>
            <span className="text-sm font-medium text-purple-600">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex overflow-x-auto">
            {HACKATHON_TABS.map((tab, index) => {
              const isCompleted = completedTabs.has(tab.id);
              const isActive = activeTab === tab.id;
              const isRequired = tab.required;

              return (
                <button
                  key={tab.id}
                  onClick={() => moveToTab(tab.id)}
                  className={`flex-1 min-w-max sm:min-w-0 py-4 px-4 sm:px-6 text-center border-b-2 transition-all relative group ${
                    isActive
                      ? 'text-purple-600 border-b-purple-600 bg-purple-50'
                      : isCompleted
                      ? 'text-green-600 border-b-green-500 hover:bg-green-50'
                      : 'text-gray-600 border-b-transparent hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">{tab.icon}</span>
                    <span className="text-xs sm:text-sm font-semibold">{tab.label}</span>
                    {isRequired && <span className="text-red-500 text-xs">*</span>}
                  </div>
                  {isCompleted && !isActive && (
                    <div className="absolute top-2 right-2 text-green-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          {/* SECTION: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hackathon Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., AI Innovation Hackathon 2024"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company/Organization Name *
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  placeholder="e.g., Tech Company Inc."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                  Hackathon Description *
                </label>
                  <button
                    type="button"
                    onClick={() => handleEnhanceWithAI('description', 'description')}
                    disabled={generatingAI.description}
                    className="text-xs px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {generatingAI.description ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Enhance with AI
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the hackathon, its themes, goals, and what participants will be doing..."
                  rows="5"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                />
              </div>
            </div>
          )}

          {/* SECTION: PROBLEM & SKILLS */}
          {activeTab === 'problem' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-gray-900">Problem Statement & Skills</h2>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                  Problem Statement *
                </label>
                  <button
                    type="button"
                    onClick={() => handleEnhanceWithAI('problemStatement', 'problemStatement')}
                    disabled={generatingAI.problemStatement}
                    className="text-xs px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {generatingAI.problemStatement ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Enhance with AI
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  name="problemStatement"
                  value={formData.problemStatement}
                  onChange={handleInputChange}
                  placeholder="Describe the problem that participants need to solve..."
                  rows="5"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                />
                <p className={`text-xs mt-2 ${isProblemStatementValid ? 'text-green-600' : 'text-red-600'}`}>
                  {problemWordCount}/{MIN_PROBLEM_STATEMENT_WORDS} words required to unlock other sections.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Skills Required
                </label>
                <div className="relative">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.skillsRequired.map(skill => (
                      <div key={skill} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full flex items-center gap-2 text-sm font-medium">
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-purple-900"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={skillsInput}
                    onChange={handleSkillsInputChange}
                    placeholder="Type a skill and press Enter or select from suggestions..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill(skillsInput);
                      }
                    }}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                  />

                  {showSkillsSuggestions && filteredSkillsSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {filteredSkillsSuggestions.map(skill => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => handleAddSkill(skill)}
                          className="w-full text-left px-4 py-2 hover:bg-purple-50 text-sm text-gray-700"
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Added: {formData.skillsRequired.length} skills</p>
              </div>
            </div>
          )}

          {/* SECTION: PHASES */}
          {activeTab === 'phases' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Hackathon Phases</h2>
                <button
                  type="button"
                  onClick={handleAddPhase}
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition text-sm font-semibold flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Phase
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Define the different phases of your hackathon and specify what format submissions should be in for each phase.
              </p>

              {(!formData.startDate || !formData.endDate) && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <h3 className="text-sm font-semibold text-purple-900 mb-3">Select Hackathon Date Range First</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-purple-900 mb-1">Start Date *</label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        min={TODAY_ISO}
                        className="w-full px-3 py-2 rounded-lg border border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-purple-900 mb-1">End Date *</label>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        min={formData.startDate || TODAY_ISO}
                        className="w-full px-3 py-2 rounded-lg border border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition bg-white"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-purple-700 mt-2">
                    Phase deadlines are enabled only after both start and end dates are selected.
                  </p>
                </div>
              )}

              <div className="space-y-6">
                {formData.phases.map((phase, index) => (
                  <div key={phase.id} className="border border-gray-300 rounded-lg p-6 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg text-gray-900">Phase {index + 1}</h3>
                      {formData.phases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhase(phase.id)}
                          className="text-red-600 hover:text-red-800 font-semibold text-sm"
                        >
                          Remove Phase
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phase Name *
                        </label>
                        <input
                          type="text"
                          value={phase.name}
                          onChange={(e) => handlePhaseChange(phase.id, 'name', e.target.value)}
                          placeholder="e.g., Problem Statement Submission, Prototype Review, Final Presentation"
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phase Description
                        </label>
                        <textarea
                          value={phase.description}
                          onChange={(e) => handlePhaseChange(phase.id, 'description', e.target.value)}
                          placeholder="Describe what participants need to do in this phase..."
                          rows="3"
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Deadline / Date
                        </label>
                        <input
                          type="date"
                          value={phase.deadline}
                          onChange={(e) => handlePhaseChange(phase.id, 'deadline', e.target.value)}
                          min={getPhaseMinDate(index)}
                          disabled={!formData.startDate || !formData.endDate}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                        />
                        {!formData.startDate || !formData.endDate ? (
                          <p className="text-xs text-amber-700 mt-2">Select start and end dates first to set this deadline.</p>
                        ) : null}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Submission Formats Allowed *
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {SUBMISSION_FORMATS.map(format => (
                            <label
                              key={format}
                              className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${
                                phase.formats.includes(format)
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={phase.formats.includes(format)}
                                onChange={() => handlePhaseFormatToggle(phase.id, format)}
                                className="w-4 h-4 rounded"
                              />
                              <span className="text-sm font-medium text-gray-700">{format}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Selected: {phase.formats.length} format(s)</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Tip:</span> Create multiple phases to structure your hackathon. For example:
                  <br /> • Phase 1: Submit problem analysis (PDF, PPT)
                  <br /> • Phase 2: Submit prototype (Repository Link, Website Link, Video)
                  <br /> • Phase 3: Final presentation (PPT, Video, DOC)
                </p>
              </div>
            </div>
          )}

          {/* SECTION: ELIGIBILITY */}
          {activeTab === 'eligibility' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-gray-900">Eligibility Criteria</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participation Type
                </label>
                <select
                  name="participationType"
                  value={formData.participationType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                >
                  <option value="Both">Teams or Individuals</option>
                  <option value="TeamsOnly">Teams Only</option>
                  <option value="IndividualsOnly">Individuals Only</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course / Branch
                  </label>
                  <input
                    type="text"
                    name="courseBranch"
                    value={formData.courseBranch}
                    onChange={handleInputChange}
                    placeholder="e.g., Computer Science, Any"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year / Class Level
                  </label>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                  >
                    <option value="">Select Year (Optional)</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Any">Any Year</option>
                    <option value="Professionals">Professionals</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                  Eligibility Criteria
                </label>
                  <button
                    type="button"
                    onClick={() => handleEnhanceWithAI('eligibilityCriteria', 'eligibilityCriteria')}
                    disabled={generatingAI.eligibilityCriteria}
                    className="text-xs px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {generatingAI.eligibilityCriteria ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Enhance with AI
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  name="eligibilityCriteria"
                  value={formData.eligibilityCriteria}
                  onChange={handleInputChange}
                  placeholder="Any additional eligibility requirements..."
                  rows="4"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                />
              </div>
            </div>
          )}

          {/* SECTION: DATES & MODE */}
          {activeTab === 'dates' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-gray-900">Dates & Schedule</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    min={TODAY_ISO}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    min={formData.startDate || TODAY_ISO}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mode of Hackathon *
                </label>
                <select
                  name="mode"
                  value={formData.mode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Hybrid">Hybrid (Online + Offline)</option>
                </select>
              </div>

              {(formData.mode === 'Offline' || formData.mode === 'Hybrid') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Venue Location
                    </label>
                    <input
                      type="text"
                      name="venueLocation"
                      value={formData.venueLocation}
                      onChange={handleInputChange}
                      placeholder="e.g., Main Campus, Conference Hall A"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Venue Time
                    </label>
                    <input
                      type="text"
                      name="venueTime"
                      value={formData.venueTime}
                      onChange={handleInputChange}
                      placeholder="e.g., 9:00 AM - 5:00 PM"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Venue Reporting Date
                      </label>
                      <input
                        type="date"
                        name="venueDate"
                        value={formData.venueDate}
                        onChange={handleInputChange}
                        min={formData.startDate || TODAY_ISO}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Venue Reporting Time
                      </label>
                      <input
                        type="time"
                        name="venueReportingTime"
                        value={formData.venueReportingTime}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* SECTION: SUBMISSION */}
          {activeTab === 'submission' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-gray-900">Submission & Requirements</h2>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                  Submission Procedure
                </label>
                  <button
                    type="button"
                    onClick={() => handleEnhanceWithAI('submissionProcedure', 'submissionProcedure')}
                    disabled={generatingAI.submissionProcedure}
                    className="text-xs px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {generatingAI.submissionProcedure ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Enhance with AI
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  name="submissionProcedure"
                  value={formData.submissionProcedure}
                  onChange={handleInputChange}
                  placeholder="Describe what participants must submit, file formats, naming conventions, etc."
                  rows="5"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                  Additional Requirements & Resources
                </label>
                  <button
                    type="button"
                    onClick={() => handleEnhanceWithAI('requirements', 'requirements')}
                    disabled={generatingAI.requirements}
                    className="text-xs px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {generatingAI.requirements ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Enhance with AI
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  placeholder="Any tools, libraries, APIs, or resources participants can use..."
                  rows="4"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Submission URL / Platform Link
                </label>
                <input
                  type="url"
                  name="submissionUrl"
                  value={formData.submissionUrl}
                  onChange={handleInputChange}
                  placeholder="e.g., https://hackathon.example.com/submit"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                />
              </div>
            </div>
          )}

          {/* SECTION: CAPACITY & PRIZES */}
          {activeTab === 'capacity' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-gray-900">Capacity & Prizes</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Participant Limit (Capacity)
                  </label>
                  <input
                    type="number"
                    name="participantLimit"
                    value={formData.participantLimit}
                    onChange={handleInputChange}
                    placeholder="e.g., 100"
                    min="1"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Team Size (members allowed per team)
                  </label>
                  <input
                    type="number"
                    name="teamSize"
                    value={formData.teamSize}
                    onChange={handleInputChange}
                    placeholder="e.g., 5"
                    min="1"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prize Pool / Prize Details
                </label>
                <textarea
                  name="prize"
                  value={formData.prize}
                  onChange={handleInputChange}
                  placeholder="e.g., 1st Prize: $5000, 2nd Prize: $3000, 3rd Prize: $2000"
                  rows="4"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                />
              </div>
            </div>
          )}

          {/* Form Actions */}
          {activeTab === HACKATHON_TABS[HACKATHON_TABS.length - 1].id && (
            <div className="flex gap-4 pt-8 border-t border-gray-200 mt-8">
              <button
                type="button"
                onClick={() => navigate('/manage-hackathons')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-900 font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              {/* Auto-save button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-900 font-semibold rounded-lg transition disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>

              {/* Publish button */}
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold rounded-lg transition disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    {editingHackathonId ? 'Updating...' : 'Publishing...'}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editingHackathonId ? 'Update & Publish' : 'Publish Hackathon'}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tab Navigation Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200 mt-4">
            <button
              type="button"
              onClick={() => {
                const currentIndex = HACKATHON_TABS.findIndex(t => t.id === activeTab);
                if (currentIndex > 0) {
                  moveToTab(HACKATHON_TABS[currentIndex - 1].id);
                }
              }}
              disabled={activeTab === HACKATHON_TABS[0].id}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              ← Previous
            </button>

            <button
              type="button"
              onClick={() => {
                const currentIndex = HACKATHON_TABS.findIndex(t => t.id === activeTab);
                if (currentIndex < HACKATHON_TABS.length - 1) {
                  moveToTab(HACKATHON_TABS[currentIndex + 1].id);
                }
              }}
              disabled={activeTab === HACKATHON_TABS[HACKATHON_TABS.length - 1].id}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

