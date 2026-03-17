// API functions for Student Database Access feature
import apiClient from './apiClient';

const API_BASE_URL = '/api/students';

/**
 * Get all students with optional filters
 * @param {Object} filters - Filter criteria (degree, skills, location, etc.)
 * @returns {Promise} - Response with students array and subscription info
 */
export const getAllStudents = async (filters = {}) => {
  try {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        queryParams.append(key, filters[key]);
      }
    });
    
    const url = queryParams.toString() 
      ? `${API_BASE_URL}?${queryParams.toString()}`
      : API_BASE_URL;
    
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
};

/**
 * Get a single student by ID
 * @param {string} studentId - Student's profile ID
 * @returns {Promise} - Response with student data and subscription info
 */
export const getStudentById = async (studentId) => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/${studentId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching student:', error);
    throw error;
  }
};

/**
 * Shortlist a student
 * @param {string} studentId - Student's profile ID
 * @returns {Promise} - Response with success message
 */
export const shortlistStudent = async (studentId) => {
  try {
    const response = await apiClient.post(`${API_BASE_URL}/${studentId}/shortlist`);
    return response.data;
  } catch (error) {
    console.error('Error shortlisting student:', error);
    throw error;
  }
};

/**
 * Remove a student from shortlist
 * @param {string} studentId - Student's profile ID
 * @returns {Promise} - Response with success message
 */
export const removeShortlist = async (studentId) => {
  try {
    const response = await apiClient.delete(`${API_BASE_URL}/${studentId}/shortlist`);
    return response.data;
  } catch (error) {
    console.error('Error removing shortlist:', error);
    throw error;
  }
};

/**
 * Get all shortlisted students
 * @returns {Promise} - Response with shortlisted students array
 */
export const getShortlistedStudents = async () => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/shortlisted`);
    return response.data;
  } catch (error) {
    console.error('Error fetching shortlisted students:', error);
    throw error;
  }
};

/**
 * Download resume
 * @param {string} studentId - Student's profile ID
 * @returns {Promise} - Response with resume data (base64)
 */
export const downloadResume = async (studentId) => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/${studentId}/resume/download`);
    return response.data;
  } catch (error) {
    console.error('Error downloading resume:', error);
    throw error;
  }
};

/**
 * Get current user's subscription info
 * @returns {Promise} - Response with subscription type and features
 */
export const getSubscriptionInfo = async () => {
  try {
    const response = await apiClient.get(`${API_BASE_URL}/subscription/info`);
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription info:', error);
    throw error;
  }
};

/**
 * Update subscription type (for testing)
 * @param {string} subscriptionType - "FREE" or "PAID"
 * @returns {Promise} - Response with updated subscription info
 */
export const updateSubscription = async (subscriptionType) => {
  try {
    const response = await apiClient.post(`${API_BASE_URL}/subscription/update`, { subscriptionType });
    return response.data;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};
