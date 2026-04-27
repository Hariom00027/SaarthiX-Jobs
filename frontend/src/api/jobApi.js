import axios from 'axios';
import apiClient from './apiClient';
import { getSomethingXUrl } from '../config/redirectUrls';

const JOBS_PROFILE_LOCAL_KEY = 'jobs_profile_local_cache_v1';
const getProfileAuthToken = () => localStorage.getItem('somethingx_auth_token') || localStorage.getItem('token');
const shouldUseLocalOnlyProfile = () => !getProfileAuthToken();
const shouldAvoidRelativeApiBase = () => {
  if (typeof window === 'undefined' || !window.location) return false;
  const host = window.location.hostname;
  const port = window.location.port;
  return (host === 'localhost' || host === '127.0.0.1') && port === '3500';
};

const isBlankValue = (value) => {
  if (Array.isArray(value)) return value.length === 0;
  return value === null || value === undefined || value === '';
};

const mergeProfileData = (baseProfile, incomingProfile) => {
  const merged = { ...(baseProfile || {}) };
  Object.keys(incomingProfile || {}).forEach((key) => {
    if (isBlankValue(merged[key]) && !isBlankValue(incomingProfile[key])) {
      merged[key] = incomingProfile[key];
    }
  });
  return merged;
};

const mergePreferIncoming = (baseProfile, incomingProfile) => ({
  ...(baseProfile || {}),
  ...(incomingProfile || {}),
});

const hasNonEmptyEducationYear = (entries, key) => (
  Array.isArray(entries) && entries.some((entry) => {
    const value = entry?.[key];
    return value !== null && value !== undefined && String(value).trim() !== '';
  })
);

const getEducationEntriesScore = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  let score = entries.length;
  if (hasNonEmptyEducationYear(entries, 'startYear')) score += 100;
  if (hasNonEmptyEducationYear(entries, 'passingYear')) score += 50;
  const withInstitution = entries.filter((entry) => entry?.institution && String(entry.institution).trim()).length;
  score += withInstitution;
  return score;
};

const pickRicherEducationEntries = (firstEntries, secondEntries) => {
  const firstScore = getEducationEntriesScore(firstEntries);
  const secondScore = getEducationEntriesScore(secondEntries);
  if (firstScore > secondScore) return firstEntries;
  if (secondScore > firstScore) return secondEntries;
  return !isBlankValue(secondEntries) ? secondEntries : firstEntries;
};

const readLocalJobsProfile = () => {
  try {
    const raw = localStorage.getItem(JOBS_PROFILE_LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to parse local jobs profile cache:', error);
    return null;
  }
};

const writeLocalJobsProfile = (profileData) => {
  try {
    localStorage.setItem(JOBS_PROFILE_LOCAL_KEY, JSON.stringify(profileData || {}));
  } catch (error) {
    console.warn('Failed to write local jobs profile cache:', error);
  }
};

// Use environment variable for API key, fallback for development
const API_KEY = import.meta.env.VITE_RAPIDAPI_KEY || 'f0235cd2b0mshac603cc0e4cabafp1ffb39jsnd44cae2de884';
const HOST = 'jsearch.p.rapidapi.com';
const BASE_URL = `https://${HOST}`;

// Search for jobs
export const fetchJobs = async (query = 'developer jobs', location = 'us', page = 1) => {
  // Try to load from session storage first to save API quota (429 errors)
  // Reverted: user requested no changes to jobs app

  const options = {
    method: 'GET',
    url: `${BASE_URL}/search`,
    params: {
      query: query || 'developer jobs',
      page: page.toString(),
      num_pages: '1',
      country: location || 'us',
      date_posted: 'all'
    },
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': HOST
    }
  };

  try {
    const response = await axios.request(options);
    const jobs = response.data.data || [];

    // Cache the result
    // Reverted: user requested no changes to jobs app

    return jobs;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    throw error;
  }
};

// Get job details by job_id
export const fetchJobDetails = async (jobId, country = 'us') => {
  // Try to load from session storage first
  // Reverted: user requested no changes to jobs app

  const options = {
    method: 'GET',
    url: `${BASE_URL}/job-details`,
    params: {
      job_id: jobId,
      country: country
    },
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': HOST
    }
  };

  try {
    const response = await axios.request(options);
    const details = response.data.data?.[0] || null;

    // Cache the result
    // Reverted: user requested no changes to jobs app

    return details;
  } catch (error) {
    console.error('Error fetching job details:', error);
    throw error;
  }
};

// Get estimated salaries for jobs
export const fetchJobSalaries = async (jobTitle, location, radius = 200) => {
  const options = {
    method: 'GET',
    url: `${BASE_URL}/estimated-salary`,
    params: {
      job_title: jobTitle,
      location: location,
      radius: radius.toString()
    },
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': HOST
    }
  };

  try {
    const response = await axios.request(options);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching job salaries:', error);
    return [];
  }
};

// Get user's job applications with tracking (from database only)
export const getUserJobApplications = async () => {
  const response = await apiClient.get('/applications');
  return response.data || [];
};

// Update job application status
export const updateApplicationStatus = async (applicationId, status) => {
  try {
    const response = await apiClient.put(
      `/applications/${applicationId}`,
      { status }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating application status:', error);
    throw error;
  }
};

// Record job application (add to tracker with full form data)
export const recordJobApplication = async (applicationData) => {
  try {
    const response = await apiClient.post(
      '/applications',
      applicationData
    );
    return response.data;
  } catch (error) {
    console.error('Error recording job application:', error);
    throw error;
  }
};

// Profile API functions
const getJobsBackendProfile = async () => {
  const response = await apiClient.get('/profile');
  return response.data || null;
};

const saveJobsBackendProfile = async (profileData) => {
  const response = await apiClient.post('/profile', profileData);
  return response.data || null;
};

/**
 * Home /auth/profile returns User.picture as a full data URL (or raw base64 / https URL).
 * Jobs profile UI builds src as data:${type};base64,${base64} — must not put the whole data URL in base64.
 */
const normalizeAuthPictureToJobsProfileFields = (picture) => {
  if (!picture || typeof picture !== 'string' || !picture.trim()) {
    return { profilePictureBase64: '', profilePictureFileType: '', profilePictureFileName: '' };
  }
  const trimmed = picture.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      profilePictureBase64: trimmed,
      profilePictureFileType: 'image/jpeg',
      profilePictureFileName: 'profile-picture.jpg',
    };
  }
  const dataMatch = trimmed.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (dataMatch) {
    return {
      profilePictureBase64: dataMatch[2].replace(/\s/g, ''),
      profilePictureFileType: dataMatch[1],
      profilePictureFileName: 'profile-picture.jpg',
    };
  }
  return {
    profilePictureBase64: trimmed,
    profilePictureFileType: 'image/jpeg',
    profilePictureFileName: 'profile-picture.jpg',
  };
};

export const getUserProfile = async () => {
  const localCachedProfile = readLocalJobsProfile();
  if (shouldUseLocalOnlyProfile()) {
    return localCachedProfile;
  }

  try {
    const [jobsProfileResult, homeUnifiedResult, homeAuthResult] = await Promise.allSettled([
      getJobsBackendProfile(),
      getSomethingXUnifiedProfile(),
      getSomethingXUserProfile(),
    ]);

    const jobsProfile = jobsProfileResult.status === 'fulfilled' ? jobsProfileResult.value : null;
    const homeUnifiedProfile = homeUnifiedResult.status === 'fulfilled' ? homeUnifiedResult.value : null;
    const homeAuthProfile = homeAuthResult.status === 'fulfilled' ? homeAuthResult.value : null;

    const authPic = homeAuthProfile ? normalizeAuthPictureToJobsProfileFields(homeAuthProfile.picture) : null;
    const mappedHomeAuthProfile = homeAuthProfile ? {
      fullName: homeAuthProfile.name || '',
      phoneNumber: homeAuthProfile.phone || '',
      email: homeAuthProfile.email || '',
      profilePictureBase64: authPic?.profilePictureBase64 || '',
      profilePictureFileType: authPic?.profilePictureFileType || '',
      profilePictureFileName: authPic?.profilePictureFileName || '',
      profilePictureFileSize: 0,
      experience: homeAuthProfile.experience || '',
      skills: Array.isArray(homeAuthProfile.skills) ? homeAuthProfile.skills : [],
      summary: homeAuthProfile.bio || '',
      currentLocation: homeAuthProfile.location || '',
      linkedInUrl: homeAuthProfile.linkedinUrl || homeAuthProfile.linkedin || '',
      portfolioUrl: homeAuthProfile.portfolioUrl || homeAuthProfile.portfolio || '',
      githubUrl: homeAuthProfile.githubUrl || homeAuthProfile.github || '',
      websiteUrl: homeAuthProfile.websiteUrl || homeAuthProfile.website || '',
      educationEntries: Array.isArray(homeAuthProfile.academicBackground) ? homeAuthProfile.academicBackground : [],
      projects: Array.isArray(homeAuthProfile.projects) ? homeAuthProfile.projects : [],
    } : null;

    // Home unified profile is the canonical shared profile for cross-microservice access.
    const mergedFromHome = mergeProfileData(homeUnifiedProfile, mappedHomeAuthProfile);
    const mergedProfile = mergedFromHome
      ? mergeProfileData(mergedFromHome, jobsProfile)
      : jobsProfile;

    if (mergedProfile) {
      const mergedEducationEntries = pickRicherEducationEntries(
        mergedFromHome?.educationEntries,
        jobsProfile?.educationEntries
      );
      mergedProfile.educationEntries = pickRicherEducationEntries(
        mergedEducationEntries,
        localCachedProfile?.educationEntries
      );
    }

    if (mergedProfile && Object.keys(mergedProfile).length > 0) {
      writeLocalJobsProfile(mergedProfile);
      return mergedProfile;
    }

    return localCachedProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return localCachedProfile;
  }
};

// Fetch profile from SaarthiX Home app (/api/auth/profile)
export const getSomethingXUserProfile = async () => {
  const token = localStorage.getItem('somethingx_auth_token') || localStorage.getItem('token');
  if (!token) {
    return null;
  }

  const headers = { Authorization: `Bearer ${token}` };
  const baseCandidates = [];
  const pushUnique = (url) => {
    if (url && !baseCandidates.includes(url)) {
      baseCandidates.push(url);
    }
  };

  try {
    const somethingXUrl = getSomethingXUrl();
    if (somethingXUrl && somethingXUrl !== '/') {
      pushUnique(`${somethingXUrl.replace(/\/$/, '')}/api`);
    }
  } catch (_) {
    // Ignore URL derivation issues and use fallback URLs
  }

  if (!shouldAvoidRelativeApiBase()) {
    pushUnique('/api');
  }
  pushUnique('http://localhost:8080/api');
  pushUnique('http://127.0.0.1:8080/api');

  let lastError = null;
  for (const baseURL of baseCandidates) {
    try {
      const response = await axios.get(`${baseURL}/auth/profile`, { headers, timeout: 12000 });
      return response.data || null;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError?.response?.status === 401 || lastError?.response?.status === 403) {
    return null;
  }

  console.warn('Unable to fetch SaarthiX Home profile:', lastError?.message || lastError);
  return null;
};

const getSomethingXUnifiedProfile = async () => {
  const token = localStorage.getItem('somethingx_auth_token') || localStorage.getItem('token');
  if (!token) {
    return null;
  }

  const headers = { Authorization: `Bearer ${token}` };
  const baseCandidates = [];
  const pushUnique = (url) => {
    if (url && !baseCandidates.includes(url)) {
      baseCandidates.push(url);
    }
  };

  try {
    const somethingXUrl = getSomethingXUrl();
    if (somethingXUrl && somethingXUrl !== '/') {
      pushUnique(`${somethingXUrl.replace(/\/$/, '')}/api`);
    }
  } catch (_) {
    // Ignore URL derivation issues and use fallback URLs
  }

  if (!shouldAvoidRelativeApiBase()) {
    pushUnique('/api');
  }
  pushUnique('http://localhost:3000/api');
  pushUnique('http://127.0.0.1:3000/api');
  pushUnique('http://localhost:8080/api');
  pushUnique('http://127.0.0.1:8080/api');

  let lastError = null;
  for (const baseURL of baseCandidates) {
    try {
      const response = await axios.get(`${baseURL}/profile`, { headers, timeout: 12000 });
      return response.data || null;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError?.response?.status === 401 || lastError?.response?.status === 403 || lastError?.response?.status === 404) {
    return null;
  }

  console.warn('Unable to fetch unified SaarthiX Home profile:', lastError?.message || lastError);
  return null;
};

const saveSomethingXUnifiedProfile = async (profileData) => {
  const token = localStorage.getItem('somethingx_auth_token') || localStorage.getItem('token');
  if (!token) {
    return null;
  }

  const headers = { Authorization: `Bearer ${token}` };
  const baseCandidates = [];
  const pushUnique = (url) => {
    if (url && !baseCandidates.includes(url)) {
      baseCandidates.push(url);
    }
  };

  try {
    const somethingXUrl = getSomethingXUrl();
    if (somethingXUrl && somethingXUrl !== '/') {
      pushUnique(`${somethingXUrl.replace(/\/$/, '')}/api`);
    }
  } catch (_) {
    // Ignore URL derivation issues and use fallback URLs
  }

  if (!shouldAvoidRelativeApiBase()) {
    pushUnique('/api');
  }
  pushUnique('http://localhost:3000/api');
  pushUnique('http://127.0.0.1:3000/api');
  pushUnique('http://localhost:8080/api');
  pushUnique('http://127.0.0.1:8080/api');

  let lastError = null;
  for (const baseURL of baseCandidates) {
    try {
      const response = await axios.post(`${baseURL}/profile`, profileData, { headers, timeout: 12000 });
      return response.data || null;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError?.response?.status === 401 || lastError?.response?.status === 403) {
    return null;
  }

  throw lastError || new Error('Unable to save unified SaarthiX Home profile');
};

/** Build a data-URI for User.picture (Home /auth/profile) from Jobs profile builder fields. */
const buildProfilePictureDataUri = (profileData) => {
  const raw = profileData?.profilePictureBase64;
  if (!raw || typeof raw !== 'string' || !String(raw).trim()) return null;
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('data:')) return trimmed;
  const mime = profileData?.profilePictureFileType || 'image/jpeg';
  if (typeof mime !== 'string' || !mime.includes('/')) return null;
  return `data:${mime};base64,${trimmed}`;
};

/**
 * Home navbar reads AuthContext user.picture from GET /auth/profile (User document).
 * Unified POST /api/profile does not necessarily update that field — sync explicitly.
 */
const putSomethingXAuthProfilePicture = async (pictureDataUri) => {
  const token = getProfileAuthToken();
  if (!token || !pictureDataUri) return null;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const baseCandidates = [];
  const pushUnique = (url) => {
    if (url && !baseCandidates.includes(url)) baseCandidates.push(url);
  };

  try {
    const somethingXUrl = getSomethingXUrl();
    if (somethingXUrl && somethingXUrl !== '/') {
      pushUnique(`${somethingXUrl.replace(/\/$/, '')}/api`);
    }
  } catch (_) {}

  if (!shouldAvoidRelativeApiBase()) {
    pushUnique('/api');
  }
  pushUnique('http://localhost:3000/api');
  pushUnique('http://127.0.0.1:3000/api');
  pushUnique('http://localhost:8080/api');
  pushUnique('http://127.0.0.1:8080/api');

  let lastError = null;
  for (const baseURL of baseCandidates) {
    try {
      const response = await axios.put(
        `${baseURL}/auth/profile`,
        { picture: pictureDataUri },
        { headers, timeout: 120000 }
      );
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to sync profile picture to SaarthiX Home auth profile');
};

const notifySomethingXParentAuthRefresh = () => {
  if (typeof window === 'undefined' || !window.parent || window.parent === window) return;
  let targetOrigin = '*';
  try {
    const u = getSomethingXUrl();
    if (u && u !== '/') targetOrigin = new URL(u).origin;
  } catch (_) {}
  try {
    window.parent.postMessage(
      { type: 'saarthix-auth-profile-sync', source: 'jobs-profile' },
      targetOrigin
    );
  } catch (_) {}
};

const syncAuthPictureAfterJobsProfileSave = async (profileData) => {
  const uri = buildProfilePictureDataUri(profileData);
  if (!uri) return;
  try {
    await putSomethingXAuthProfilePicture(uri);
    notifySomethingXParentAuthRefresh();
  } catch (e) {
    console.warn('SaarthiX Home navbar picture sync failed (auth User.picture):', e?.message || e);
  }
};

export const saveUserProfile = async (profileData) => {
  if (shouldUseLocalOnlyProfile()) {
    writeLocalJobsProfile(profileData);
    return { ...profileData, _savedLocallyOnly: true };
  }

  try {
    // Primary persistence target: shared Home profile API for all microservices.
    const homeSavedProfile = await saveSomethingXUnifiedProfile(profileData);
    if (!homeSavedProfile || Object.keys(homeSavedProfile).length === 0) {
      throw new Error('Shared profile save was not accepted by Home backend');
    }
    const savedProfile = homeSavedProfile && Object.keys(homeSavedProfile).length > 0
      ? mergePreferIncoming(homeSavedProfile, profileData)
      : profileData;
    writeLocalJobsProfile(savedProfile);

    // Best-effort mirror into Jobs backend profile collection.
    try {
      const jobsMirroredProfile = await saveJobsBackendProfile(savedProfile);
      if (jobsMirroredProfile && Object.keys(jobsMirroredProfile).length > 0) {
        savedProfile.educationEntries = pickRicherEducationEntries(
          savedProfile.educationEntries,
          jobsMirroredProfile.educationEntries
        );
      }
    } catch (syncError) {
      console.warn('Shared profile saved, but Jobs mirror sync failed:', syncError?.message || syncError);
    }

    await syncAuthPictureAfterJobsProfileSave(profileData);

    return savedProfile;
  } catch (error) {
    console.error('Error saving user profile to shared Home backend:', error);

    // Fallback: save directly into Jobs backend before local-only fallback.
    try {
      const jobsSavedProfile = await saveJobsBackendProfile(profileData);
      const savedProfile = jobsSavedProfile && Object.keys(jobsSavedProfile).length > 0
        ? jobsSavedProfile
        : profileData;
      writeLocalJobsProfile(savedProfile);
      await syncAuthPictureAfterJobsProfileSave(profileData);
      return savedProfile;
    } catch (jobsError) {
      console.error('Error saving user profile to Jobs backend:', jobsError);
      writeLocalJobsProfile(profileData);
      return { ...profileData, _savedLocallyOnly: true };
    }
  }
};

export const updateUserProfile = async (profileData) => {
  return saveUserProfile(profileData);
};

// Industry API functions
export const getMyPostedJobs = async () => {
  try {
    const response = await apiClient.get('/applications/my-jobs');
    console.log('getMyPostedJobs response:', response);
    console.log('Response data:', response.data);
    console.log('Response data type:', typeof response.data);

    // Handle both direct array and wrapped response
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    } else if (typeof response.data === 'string') {
      // If backend returns a string error message
      console.error('Backend returned string:', response.data);
      throw new Error(response.data);
    } else {
      console.warn('Unexpected response format:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching posted jobs:', error);
    console.error('Error response:', error.response);
    console.error('Error response data:', error.response?.data);
    console.error('Error response status:', error.response?.status);

    // Re-throw with more context
    if (error.response) {
      // Handle string error messages from backend
      let errorMsg = error.response.data;
      if (typeof errorMsg === 'string') {
        throw new Error(errorMsg);
      } else if (errorMsg?.message) {
        throw new Error(errorMsg.message);
      } else {
        throw new Error(error.response.statusText || `Server error: ${error.response.status}`);
      }
    }
    throw error;
  }
};

export const getApplicationsByJobId = async (jobId) => {
  try {
    const response = await apiClient.get(`/applications/job/${jobId}`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching applications for job:', error);
    throw error;
  }
};

export const updateApplicationStatusByIndustry = async (applicationId, status) => {
  try {
    const response = await apiClient.put(
      `/applications/${applicationId}/status`,
      { status }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating application status:', error);
    throw error;
  }
};

// Update a job (INDUSTRY users only)
export const updateJob = async (jobId, jobData) => {
  try {
    const response = await apiClient.put(
      `/jobs/${jobId}`,
      jobData
    );
    return response.data;
  } catch (error) {
    console.error('Error updating job:', error);
    throw error;
  }
};

// Delete a job (INDUSTRY users only)
export const deleteJob = async (jobId) => {
  try {
    const response = await apiClient.delete(`/jobs/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
};

// Get applicant profiles for a job (INDUSTRY users only)
export const getApplicantProfilesByJobId = async (jobId) => {
  try {
    const response = await apiClient.get(`/applications/job/${jobId}/profiles`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching applicant profiles:', error);
    throw error;
  }
};

// Get recommended jobs for authenticated applicant
export const getRecommendedJobs = async () => {
  try {
    const response = await apiClient.get('/jobs/recommended/jobs');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching recommended jobs:', error);
    throw error;
  }
};

// Hackathon API functions
export const getAllHackathons = async () => {
  try {
    const response = await apiClient.get('/hackathons');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching all hackathons:', error);
    throw error;
  }
};

export const getMyHackathons = async () => {
  try {
    const response = await apiClient.get('/hackathons/my-hackathons');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching my hackathons:', error);
    throw error;
  }
};

export const createHackathon = async (hackathonData) => {
  try {
    const response = await apiClient.post(
      '/hackathons',
      hackathonData
    );
    return response.data;
  } catch (error) {
    console.error('Error creating hackathon:', error);
    throw error;
  }
};

export const deleteHackathon = async (hackathonId) => {
  try {
    const response = await apiClient.delete(`/hackathons/${hackathonId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting hackathon:', error);
    throw error;
  }
};

export const updateHackathon = async (hackathonId, hackathonData) => {
  try {
    const response = await apiClient.put(
      `/hackathons/${hackathonId}`,
      hackathonData
    );
    return response.data;
  } catch (error) {
    console.error('Error updating hackathon:', error);
    throw error;
  }
};

// Hackathon Application API functions (for Applicants)
export const applyForHackathon = async (hackathonId, applicationData) => {
  try {
    const response = await apiClient.post(
      `/hackathon-applications/${hackathonId}/apply`,
      applicationData
    );
    return response.data;
  } catch (error) {
    console.error('Error applying for hackathon:', error);
    throw error;
  }
};

export const getMyHackathonApplications = async () => {
  try {
    const response = await apiClient.get('/hackathon-applications/my-applications');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching my hackathon applications:', error);
    throw error;
  }
};

// Get applicants for a specific hackathon (Industry only)
export const getHackathonApplicants = async (hackathonId) => {
  try {
    const response = await apiClient.get(`/hackathons/${hackathonId}/applicants`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching hackathon applicants:', error);
    throw error;
  }
};

// Toggle hackathon enable/disable status (Industry only)
export const toggleHackathonStatus = async (hackathonId) => {
  try {
    const response = await apiClient.put(`/hackathons/${hackathonId}/toggle-status`, {});
    return response.data;
  } catch (error) {
    console.error('Error toggling hackathon status:', error);
    throw error;
  }
};

// Generate hackathon form field content using AI
export const generateHackathonFieldWithAI = async (fieldType, context = '') => {
  try {
    const response = await apiClient.post('/hackathons/ai/generate', {
      fieldType,
      context
    });
    return response.data.content;
  } catch (error) {
    console.error('Error generating AI content:', error);
    throw error;
  }
};

// Enhance profile summary text using AI while preserving meaning
export const enhanceProfileSummaryWithAI = async (summaryText) => {
  try {
    const response = await apiClient.post('/hackathons/ai/generate', {
      fieldType: 'summary',
      context: summaryText
    });
    return response.data?.content || '';
  } catch (error) {
    console.error('Error enhancing profile summary with AI:', error);
    throw error;
  }
};

// Hackathon AI content generation
export const generateHackathonAIContent = async (fieldName, currentFormData) => {
  try {
    const response = await apiClient.post('/hackathons/ai/generate', {
      fieldName,
      currentFormData
    });
    return response.data;
  } catch (error) {
    console.error(`Error generating AI content for ${fieldName}:`, error);
    throw error;
  }
};

// Get hackathon by ID
export const getHackathonById = async (hackathonId) => {
  try {
    const response = await apiClient.get(`/hackathons/${hackathonId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching hackathon by ID:', error);
    throw error;
  }
};

// Submit hackathon phase submission
export const submitHackathonPhase = async (applicationId, phaseId, submissionData) => {
  try {
    const response = await apiClient.post(
      `/hackathon-applications/${applicationId}/phases/${phaseId}/submit`,
      submissionData
    );
    return response.data;
  } catch (error) {
    console.error('Error submitting hackathon phase:', error);
    throw error;
  }
};

// Get hackathon application details
export const getHackathonApplicationDetails = async (applicationId) => {
  try {
    const response = await apiClient.get(
      `/hackathon-applications/${applicationId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching hackathon application details:', error);
    throw error;
  }
};

// Review hackathon phase (Industry only)
export const reviewHackathonPhase = async (applicationId, phaseId, reviewData) => {
  try {
    const response = await apiClient.put(
      `/hackathon-applications/${applicationId}/phases/${phaseId}/review`,
      reviewData
    );
    return response.data;
  } catch (error) {
    console.error('Error reviewing hackathon phase:', error);
    throw error;
  }
};

// Get hackathon applications (Industry only)
export const getHackathonApplications = async (hackathonId) => {
  try {
    const response = await apiClient.get(
      `/hackathon-applications/hackathon/${hackathonId}`
    );
    return response.data || [];
  } catch (error) {
    console.error('Error fetching hackathon applications:', error);
    throw error;
  }
};

// Delete hackathon application (Industry only)
export const deleteHackathonApplication = async (applicationId) => {
  try {
    const response = await apiClient.delete(
      `/hackathon-applications/${applicationId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting hackathon application:', error);
    throw error;
  }
};

// Reject hackathon application (Industry only)
export const rejectHackathonApplication = async (applicationId, rejectionMessage) => {
  try {
    const response = await apiClient.put(
      `/hackathon-applications/${applicationId}/reject`,
      { rejectionMessage }
    );
    return response.data;
  } catch (error) {
    console.error('Error rejecting hackathon application:', error);
    throw error;
  }
};

// Request re-upload (Industry only)
export const requestReupload = async (applicationId, phaseId, message) => {
  try {
    const response = await apiClient.put(
      `/hackathon-applications/${applicationId}/phases/${phaseId}/request-reupload`,
      { message }
    );
    return response.data;
  } catch (error) {
    console.error('Error requesting re-upload:', error);
    throw error;
  }
};

// Get application results (Student)
export const getApplicationResults = async (applicationId) => {
  try {
    const response = await apiClient.get(
      `/hackathon-applications/${applicationId}/results`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching application results:', error);
    throw error;
  }
};

// Finalize hackathon results (Industry only)
export const finalizeHackathonResults = async (hackathonId, payload) => {
  try {
    const response = await apiClient.post(
      `/hackathon-applications/hackathon/${hackathonId}/finalize-results`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error('Error finalizing hackathon results:', error);
    throw error;
  }
};

// Get hackathon results (Industry only)
export const getHackathonResults = async (hackathonId) => {
  try {
    const response = await apiClient.get(
      `/hackathon-applications/hackathon/${hackathonId}/results`
    );
    return response.data || [];
  } catch (error) {
    console.error('Error fetching hackathon results:', error);
    throw error;
  }
};

// Publish showcase content (Industry only)
export const publishShowcaseContent = async (applicationId, showcaseData) => {
  try {
    const response = await apiClient.put(
      `/hackathon-applications/${applicationId}/showcase`,
      showcaseData
    );
    return response.data;
  } catch (error) {
    console.error('Error publishing showcase content:', error);
    throw error;
  }
};

// Get hackathon submissions (Industry only)
export const getHackathonSubmissions = async (hackathonId) => {
  try {
    const response = await apiClient.get(`/hackathons/${hackathonId}/submissions`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching hackathon submissions:', error);
    throw error;
  }
};

// Evaluate submission (Industry only)
export const evaluateSubmission = async (submissionId, evaluationData) => {
  try {
    const response = await apiClient.put(
      `/hackathons/submissions/${submissionId}/evaluate`,
      evaluationData
    );
    return response.data;
  } catch (error) {
    console.error('Error evaluating submission:', error);
    throw error;
  }
};

// Generate certificate (Industry only)
export const generateCertificate = async (submissionId) => {
  try {
    const response = await apiClient.post(
      `/hackathons/submissions/${submissionId}/generate-certificate`
    );
    return response.data;
  } catch (error) {
    console.error('Error generating certificate:', error);
    throw error;
  }
};