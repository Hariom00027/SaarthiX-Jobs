import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getAllHackathons, getMyHackathonApplications, applyForHackathon } from '../api/jobApi';
import { parsePhaseFormatLabels, describeAllowedFormatsForUi } from '../utils/hackathonSubmissionFormats';

export default function ApplicantHackathons() {
  const navigate = useNavigate();
  const hackathonIcon = `${import.meta.env.BASE_URL}Container%20(2).png`;
  const prizeIcon = `${import.meta.env.BASE_URL}prize-icon%201.png`;
  const externalLinkIcon = `${import.meta.env.BASE_URL}Container%20(7).png`;
  const { isAuthenticated, loading: authLoading, isApplicantOrStudent, user } = useAuth();
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' or 'my-applications'
  const [allHackathons, setAllHackathons] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterTitle, setFilterTitle] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterSkills, setFilterSkills] = useState('');
  const [filterMode, setFilterMode] = useState('');
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

  const browsePool = useMemo(() => {
    return allHackathons.filter((hackathon) => {
      if (hackathon.enabled === false) return false;
      const hasApplied = myApplications.some((app) => app.hackathonId === hackathon.id);
      return !hasApplied;
    });
  }, [allHackathons, myApplications]);

  const uniqueCompanies = useMemo(() => {
    const names = new Set();
    allHackathons.forEach((h) => {
      const c = String(h.company || '').trim();
      if (c) names.add(c);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [allHackathons]);

  const uniqueTitles = useMemo(() => {
    const titles = new Set();
    allHackathons.forEach((h) => {
      const t = String(h.title || '').trim();
      if (t) titles.add(t);
    });
    return Array.from(titles).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [allHackathons]);

  const uniqueSkillOptions = useMemo(() => {
    const splitTokens = (text) =>
      String(text || '')
        .split(/[,;\n|/]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 80);
    const set = new Set();
    allHackathons.forEach((h) => {
      splitTokens(h.skillsRequired).forEach((t) => set.add(t));
      splitTokens(h.courseBranch).forEach((t) => set.add(t));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [allHackathons]);

  const filteredHackathons = useMemo(() => {
    const titlePick = filterTitle.trim();
    const skillsPick = filterSkills.trim().toLowerCase();
    const modeNorm = filterMode.trim().toLowerCase();
    const companyPick = filterCompany.trim();

    return browsePool.filter((hackathon) => {
      if (titlePick) {
        if (String(hackathon.title || '').trim() !== titlePick) return false;
      }

      if (companyPick) {
        if (String(hackathon.company || '').trim() !== companyPick) return false;
      }

      if (skillsPick) {
        const skillsHaystack = [
          hackathon.skillsRequired,
          hackathon.requirements,
          hackathon.courseBranch,
          hackathon.description,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!skillsHaystack.includes(skillsPick)) return false;
      }

      if (modeNorm) {
        const m = String(hackathon.mode || '').trim().toLowerCase();
        if (m !== modeNorm) return false;
      }

      return true;
    });
  }, [browsePool, filterTitle, filterCompany, filterSkills, filterMode]);

  const clearBrowseFilters = () => {
    setFilterTitle('');
    setFilterCompany('');
    setFilterSkills('');
    setFilterMode('');
  };

  const totalHackathonsCount = allHackathons.length;
  const attendedHackathonsCount = myApplications.length;
  const featuredHackathon = filteredHackathons[0] || allHackathons[0] || null;
  const userDisplayName = user?.name || user?.fullName || 'Applicant';
  const userAvatar =
    user?.profilePicture ||
    user?.avatar ||
    user?.photo ||
    user?.image ||
    null;
  const userInitial = String(userDisplayName).trim().charAt(0).toUpperCase() || 'A';
  const featuredTeamSizeText = featuredHackathon?.teamSize
    ? `1 - ${featuredHackathon.teamSize} Members`
    : 'N/A';
  const featuredDomainText =
    featuredHackathon?.domain ||
    featuredHackathon?.mode ||
    featuredHackathon?.category ||
    'N/A';

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
    <div className="min-h-screen bg-[#ffffff] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/apply-jobs')}
            className="h-[39px] rounded-[6px] border border-black bg-white px-[18px] text-[14px] font-medium text-black"
          >
            Apply for Jobs
          </button>
          <button className="h-[39px] rounded-[6px] bg-black px-[18px] text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(37,99,235,0.2)]">
            Hackathons
          </button>
        </div>

        <div className="mb-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[16px] border border-black/40 bg-white shadow-sm">
              <img src={hackathonIcon} alt="Hackathon" className="h-[34px] w-[34px] object-contain" />
            </div>
            <div>
              <h1 className="text-[36px] font-bold leading-[44px] tracking-[-0.5px] text-[#0F1724]">Hackathons</h1>
              <p className="text-[16px] text-black/75">Uncover top-tier hackathons, build your team, and accelerate your career</p>
            </div>
          </div>
          <div className="w-full max-w-[438px] rounded-[10px] border border-black/50 bg-[#A69E9E] p-4">
            <p className="font-['Instrument_Sans'] text-[30px] font-semibold italic leading-[37px] text-white">{totalHackathonsCount}+ Hackathons in India</p>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-full bg-black/20 text-white">
                  {userAvatar ? (
                    <img src={userAvatar} alt={userDisplayName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold">{userInitial}</span>
                  )}
                </div>
                <div>
                  <p className="font-['Instrument_Sans'] text-[20px] font-medium text-white">{userDisplayName}</p>
                  <p className="font-['Instrument_Sans'] text-[11px] font-medium text-white">{attendedHackathonsCount} Hackathon Attended</p>
                </div>
              </div>
              <div className="text-right font-['Instrument_Sans'] text-[15px] italic text-white">
                <p>Team Size : {featuredTeamSizeText}</p>
                <p>Domain : {featuredDomainText}</p>
              </div>
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

        <div className="mb-5 flex overflow-hidden rounded-[6px] border border-black/10 bg-white">
          <div className="flex w-full">
            <button
              onClick={() => {
                setActiveTab('browse');
                clearBrowseFilters();
              }}
              className={`flex h-[54px] flex-1 items-center justify-center gap-2 border ${
                activeTab === 'browse'
                  ? 'border-b-[3px] border-[#3170A5] text-[#3170A5]'
                  : 'border-black/50 text-black/75'
              }`}
            >
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Find Your Hackathon
            </button>
            <button
              onClick={() => {
                setActiveTab('my-applications');
                clearBrowseFilters();
              }}
              className={`flex h-[54px] flex-1 items-center justify-center gap-2 border ${
                activeTab === 'my-applications'
                  ? 'border-b-[3px] border-[#3170A5] text-[#3170A5]'
                  : 'border-black/50 text-black/75'
              }`}
            >
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              My Applications
            </button>
          </div>
        </div>

        {activeTab === 'browse' && allHackathons.length > 0 && (
          <div className="mb-5 rounded-[10px] border border-black/50 bg-white px-4 py-4 shadow-sm">
            <p className="mb-3 text-[13px] font-medium text-black/60">Filter hackathons using the dropdowns below.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:items-end">
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor="hackathon-filter-title" className="text-[12px] font-semibold uppercase tracking-wide text-black/55">
                  Hackathon title
                </label>
                <select
                  id="hackathon-filter-title"
                  value={filterTitle}
                  onChange={(e) => setFilterTitle(e.target.value)}
                  className="h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-[14px] text-[#0F1724] focus:border-[#3170A5] focus:outline-none focus:ring-1 focus:ring-[#3170A5]"
                >
                  <option value="">All titles</option>
                  {uniqueTitles.map((title) => (
                    <option key={title} value={title}>
                      {title.length > 70 ? `${title.slice(0, 67)}…` : title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor="hackathon-filter-company" className="text-[12px] font-semibold uppercase tracking-wide text-black/55">
                  Company
                </label>
                <select
                  id="hackathon-filter-company"
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-[14px] text-[#0F1724] focus:border-[#3170A5] focus:outline-none focus:ring-1 focus:ring-[#3170A5]"
                >
                  <option value="">All companies</option>
                  {uniqueCompanies.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor="hackathon-filter-skills" className="text-[12px] font-semibold uppercase tracking-wide text-black/55">
                  Skills / tech
                </label>
                <select
                  id="hackathon-filter-skills"
                  value={filterSkills}
                  onChange={(e) => setFilterSkills(e.target.value)}
                  className="h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-[14px] text-[#0F1724] focus:border-[#3170A5] focus:outline-none focus:ring-1 focus:ring-[#3170A5]"
                >
                  <option value="">All skills</option>
                  {uniqueSkillOptions.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill.length > 60 ? `${skill.slice(0, 57)}…` : skill}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor="hackathon-filter-mode" className="text-[12px] font-semibold uppercase tracking-wide text-black/55">
                  Mode
                </label>
                <select
                  id="hackathon-filter-mode"
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value)}
                  className="h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-[14px] text-[#0F1724] focus:border-[#3170A5] focus:outline-none focus:ring-1 focus:ring-[#3170A5]"
                >
                  <option value="">All modes</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={clearBrowseFilters}
                className="h-11 rounded-lg border border-black/20 bg-white px-4 text-[14px] font-semibold text-[#0F1724] transition hover:bg-gray-50"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}

        {activeTab === 'browse' && (
          <>
            {filteredHackathons.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="text-5xl mb-4">{allHackathons.length === 0 ? '📭' : '🔍'}</div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">
                  {allHackathons.length === 0
                    ? 'No Hackathons Available'
                    : browsePool.length === 0
                      ? 'No New Hackathons'
                      : 'No Matching Hackathons'}
                </h3>
                <p className="text-gray-600 text-base">
                  {allHackathons.length === 0
                    ? 'Check back soon for hackathons to apply to'
                    : browsePool.length === 0
                      ? 'You have already applied to all available hackathons'
                      : 'Try changing the filter dropdowns, or clear filters to see every hackathon you can still apply to.'}
                </p>
                {browsePool.length > 0 && filteredHackathons.length === 0 && (
                  <button
                    type="button"
                    onClick={clearBrowseFilters}
                    className="mt-6 rounded-lg bg-[#3170A5] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2b6494]"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-center gap-2">
                  <svg className="h-6 w-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 2v2m6-2v2M4 7h16M5 5h14a1 1 0 011 1v15a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" /></svg>
                  <h2 className="text-[30px] font-semibold leading-[36px] text-[#0F1724]">Available Hackathons</h2>
                </div>
                <div className="grid grid-cols-1 gap-[28px] md:grid-cols-2 xl:grid-cols-3">
                {filteredHackathons.map((hackathon) => (
                  <div
                    key={hackathon.id}
                    className="group relative flex h-[332px] w-[331px] flex-col rounded-[10px] border border-black/50 bg-white px-[20px] pt-[16px] pb-[14px] shadow-[inset_4px_4px_4px_1px_rgba(0,0,0,0.25)]"
                  >
                    <div className="flex-1">
                      <h3 className="line-clamp-2 h-[29px] w-[235px] pb-[5px] text-center text-[18px] font-semibold leading-[23px] text-[#0F1724] mx-auto">
                        {hackathon.title}
                      </h3>
                      <p className="mt-[10px] line-clamp-3 h-[68px] w-[281.83px] text-[14px] font-normal leading-[22px] text-black/75">
                        {hackathon.description}
                      </p>

                      <div className="mx-auto mb-[16px] mt-[13px] flex h-[40px] w-[127px] items-center justify-between rounded-[6px] bg-[#F5D2BC] px-[10px]">
                          <div className="flex flex-col">
                            <p className="h-[12px] w-[51px] text-[10px] font-medium leading-[10px] text-black">Prize Pool</p>
                            <p className="mt-[3px] h-[15px] w-[69px] text-[12px] font-semibold leading-[12px] text-[#0F1724]">{hackathon.prize || 'TBA'}</p>
                          </div>
                          <img src={prizeIcon} alt="Prize" className="h-[23px] w-[20px] object-contain" />
                      </div>

                      <div className="mx-auto mb-[12px] flex h-[42px] w-[284.66px] items-end justify-between border-t border-black/10 pb-[8px] pt-[14px] text-[12px] font-medium text-black">
                        {hackathon.teamSize > 0 && (
                          <span className="flex items-center gap-1 text-[12px]">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Team Size: 1-{hackathon.teamSize}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[12px]">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Deadline: {formatDate(hackathon.endDate)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto flex w-full flex-col gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleApply(hackathon)}
                        className="mx-auto h-[40px] w-full max-w-[200px] rounded-lg bg-[#3170A5] text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#2b6494]"
                      >
                        Apply now
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewDetails(hackathon)}
                        className="mx-auto inline-flex h-[36px] w-full max-w-[200px] items-center justify-center gap-2 rounded-lg border border-[#3170A5] bg-white text-[14px] font-semibold text-[#3170A5] transition hover:bg-gray-50"
                      >
                        View details
                        <img src={externalLinkIcon} alt="" className="h-[14px] w-[14px] object-contain" />
                      </button>
                    </div>
                  </div>
                ))}
                </div>
              </>
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
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {myApplications.map((application) => {
                  const hackathon = allHackathons.find(h => h.id === application.hackathonId);
                  return (
                    <div
                      key={application.id}
                      className="rounded-[10px] border border-black/30 bg-white p-6 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.12)]"
                    >
                      <div className="mb-4">
                        <h3 className="mb-1 text-[22px] font-semibold text-[#0F1724]">
                          {hackathon?.title || 'Unknown Hackathon'}
                        </h3>
                        <p className="mb-2 text-[14px] text-black/75">{hackathon?.company || 'N/A'}</p>
                        <span className="inline-flex items-center rounded-lg border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          ✓ Applied
                        </span>
                      </div>

                      <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="mb-1 text-xs text-gray-600">Application Type</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {application.asTeam ? `Team: ${application.teamName}` : 'Individual'}
                        </p>
                        {application.asTeam && (
                          <p className="text-xs text-gray-600 mt-1">Team Size: {application.teamSize}</p>
                        )}
                      </div>

                      <div className="mb-4">
                        <button
                          onClick={() => navigate(`/hackathon-application/${application.id}`)}
                          className="w-full rounded-lg bg-[#3170A5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2b6494]"
                        >
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
                          {(() => {
                            const labs = parsePhaseFormatLabels(phase);
                            if (labs.length) {
                              return (
                                <p className="text-xs text-gray-600 mt-2">
                                  <span className="font-semibold text-gray-800">Submission formats: </span>
                                  {labs.join(', ')}
                                  <span className="block mt-1 text-gray-500">{describeAllowedFormatsForUi(labs)}</span>
                                </p>
                              );
                            }
                            if (phase.uploadFormat) {
                              return <p className="text-xs text-gray-600 mt-2">Formats: {phase.uploadFormat}</p>;
                            }
                            return null;
                          })()}
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

