import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

const BASE_URL = `${API_BASE_URL}/notifications`;

/**
 * Fetch all notifications for the current user
 */
export const fetchNotifications = async () => {
  try {
    const response = await axios.get(BASE_URL, {
      withCredentials: true,
    });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Get unread notifications count
 */
export const getUnreadCount = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/unread-count`, {
      withCredentials: true,
    });
    return response.data.count || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await axios.put(
      `${BASE_URL}/${notificationId}/read`,
      {},
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await axios.put(
      `${BASE_URL}/mark-all-read`,
      {},
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId) => {
  try {
    const response = await axios.delete(
      `${BASE_URL}/${notificationId}`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

