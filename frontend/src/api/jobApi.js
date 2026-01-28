import axios from 'axios';
import apiClient from './apiClient';
import { API_BASE_URL } from '../config/apiConfig';

// Use environment variable for API key, fallback for development
const API_KEY = import.meta.env.VITE_RAPIDAPI_KEY || 'af93a5aec5msh431daab4f70e59fp1726b9jsn6d555bb1cda3';
const HOST = 'jsearch.p.rapidapi.com';
const BASE_URL = `https://${HOST}`;

// Search for jobs
export const fetchJobs = async (query = 'developer jobs', location = 'us', page = 1) => {
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
    console.log(response.data);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching jobs:', error);
    throw error;
  }
};

// Get job details by job_id
export const fetchJobDetails = async (jobId, country = 'us') => {
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
    return response.data.data?.[0] || null;
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
export const getUserProfile = async () => {
  try {
    const response = await apiClient.get('/profile');
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // Profile doesn't exist yet
    }
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export const saveUserProfile = async (profileData) => {
  try {
    console.log('Sending profile data to backend:', {
      url: `${API_BASE_URL}/profile`,
      dataKeys: Object.keys(profileData),
      hasResume: !!profileData.resumeBase64
    });

    const response = await apiClient.post(
      '/profile',
      profileData
    );

    console.log('Profile save response:', {
      status: response.status,
      data: response.data
    });

    return response.data;
  } catch (error) {
    console.error('Error saving user profile:', error);
    console.error('Error response:', error.response);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
    throw error;
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const response = await apiClient.put(
      '/profile',
      profileData
    );
    return response.data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
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
    const response = await axios.get(
      `${API_BASE_URL}/applications/job/${jobId}`,
      {
        withCredentials: true,
      }
    );
    return response.data || [];
  } catch (error) {
    console.error('Error fetching applications for job:', error);
    throw error;
  }
};

export const updateApplicationStatusByIndustry = async (applicationId, status) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/applications/${applicationId}/status`,
      { status },
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      }
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
    const response = await axios.put(
      `${API_BASE_URL}/jobs/${jobId}`,
      jobData,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      }
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
    const response = await axios.delete(
      `${API_BASE_URL}/jobs/${jobId}`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
};

// Get applicant profiles for a job (INDUSTRY users only)
export const getApplicantProfilesByJobId = async (jobId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/applications/job/${jobId}/profiles`,
      {
        withCredentials: true,
      }
    );
    return response.data || [];
  } catch (error) {
    console.error('Error fetching applicant profiles:', error);
    throw error;
  }
};

// Get recommended jobs for authenticated applicant
export const getRecommendedJobs = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/jobs/recommended/jobs`,
      {
        withCredentials: true,
      }
    );
    return response.data || [];
  } catch (error) {
    console.error('Error fetching recommended jobs:', error);
    throw error;
  }
};

// Hackathon API functions
export const getAllHackathons = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/hackathons`,
      {
        withCredentials: true,
      }
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching all hackathons:', error);
    throw error;
  }
};

export const getMyHackathons = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/hackathons/my-hackathons`,
      {
        withCredentials: true,
      }
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching my hackathons:', error);
    throw error;
  }
};

export const createHackathon = async (hackathonData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/hackathons`,
      hackathonData,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating hackathon:', error);
    throw error;
  }
};

export const deleteHackathon = async (hackathonId) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/hackathons/${hackathonId}`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting hackathon:', error);
    throw error;
  }
};

export const updateHackathon = async (hackathonId, hackathonData) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/hackathons/${hackathonId}`,
      hackathonData,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      }
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
    const response = await axios.post(
      `${API_BASE_URL}/hackathon-applications/${hackathonId}/apply`,
      applicationData,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error applying for hackathon:', error);
    throw error;
  }
};

export const getMyHackathonApplications = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/hackathon-applications/my-applications`,
      {
        withCredentials: true,
      }
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching my hackathon applications:', error);
    throw error;
  }
};

// Get applicants for a specific hackathon (Industry only)
export const getHackathonApplicants = async (hackathonId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/hackathons/${hackathonId}/applicants`,
      {
        withCredentials: true,
      }
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching hackathon applicants:', error);
    throw error;
  }
};

// Toggle hackathon enable/disable status (Industry only)
export const toggleHackathonStatus = async (hackathonId) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/hackathons/${hackathonId}/toggle-status`,
      {},
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error toggling hackathon status:', error);
    throw error;
  }
};