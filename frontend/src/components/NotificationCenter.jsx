import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchNotifications, getUnreadCount, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../api/notificationApi';
import { useAuth } from '../context/AuthContext';
import NotificationToast from './NotificationToast';
import { initializeAudioOnInteraction, initializeAudioContext } from '../utils/soundUtils';

export default function NotificationCenter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastNotifications, setToastNotifications] = useState([]);
  const previousNotificationIdsRef = useRef(new Set());
  const previousUserTypeRef = useRef(null); // Track previous userType to detect role selection
  const notificationsShownOnDashboardRef = useRef(new Set()); // Track which dashboard pages have shown notifications
  const dropdownRef = useRef(null);

  // Initialize audio on component mount for user interaction
  useEffect(() => {
    console.log('[NOTIFICATION_CENTER] Initializing audio on interaction');
    initializeAudioOnInteraction();
    // Also initialize audio context immediately if possible
    initializeAudioContext();
  }, []);

  // Show toast notification
  const showToastNotification = useCallback((notification) => {
    const toastId = Date.now();
    setToastNotifications(prev => [...prev, { id: toastId, notification }]);
  }, []);

  // Fetch notifications and unread count - memoized to avoid recreating on every render
  const loadNotifications = useCallback(async (showUnreadToasts = false) => {
    // Don't load if not authenticated
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const [notifs, count] = await Promise.all([
        fetchNotifications(),
        getUnreadCount()
      ]);
      
      // Detect new notifications (arrived during polling)
      if (previousNotificationIdsRef.current.size > 0) {
        const currentIds = new Set(notifs.map(n => n.id));
        const newNotifications = notifs.filter(n => 
          !previousNotificationIdsRef.current.has(n.id) && !n.read
        );
        
        // Show toast for new notifications (arrived after initial load)
        if (newNotifications.length > 0) {
          // Show only the most recent new notification
          const latestNewNotification = newNotifications[0];
          showToastNotification(latestNewNotification);
        }
      }
      
      // If showUnreadToasts is true (after login, role selection, or page navigation), show all unread notifications
      if (showUnreadToasts) {
        const unreadNotifs = notifs.filter(n => !n.read);
        if (unreadNotifs.length > 0) {
          // Show the most recent unread notification as a toast with sound
          const mostRecentUnread = unreadNotifs[0];
          console.log(`[NOTIFICATION] Showing unread notification as toast with sound:`, mostRecentUnread);
          // Show immediately - the toast component will handle sound playback
          showToastNotification(mostRecentUnread);
          
          // If there are more unread notifications, show them with slight delays
          if (unreadNotifs.length > 1) {
            unreadNotifs.slice(1, 3).forEach((notif, index) => {
              setTimeout(() => {
                showToastNotification(notif);
              }, (index + 1) * 2000); // Show additional notifications 2 seconds apart
            });
          }
        } else {
          console.log(`[NOTIFICATION] No unread notifications found for ${user?.userType}`);
        }
      }
      
      // Update previous notification IDs
      previousNotificationIdsRef.current = new Set(notifs.map(n => n.id));
      
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
      // On error, still try to set empty arrays to avoid stale data
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, showToastNotification]);

  // Close toast notification
  const closeToast = useCallback((toastId) => {
    setToastNotifications(prev => prev.filter(toast => toast.id !== toastId));
  }, []);

  // Handle marking notification as read from toast
  const handleToastMarkRead = useCallback(async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Track if this is the first load after authentication
  const isFirstLoadAfterAuthRef = useRef(true);

  // Load notifications when user becomes available or changes
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // Only load if authenticated
    if (isAuthenticated && user) {
      // On first load after authentication, show unread notifications and play sound once
      if (isFirstLoadAfterAuthRef.current) {
        isFirstLoadAfterAuthRef.current = false;
        console.log('[NOTIFICATION] First load after authentication - showing unread notifications');
        // Small delay to ensure page is ready and audio context can be activated
        setTimeout(() => {
          loadNotifications(true); // Pass true to show unread toasts
        }, 500);
      } else {
        // Normal load for subsequent updates (no automatic toast display)
        loadNotifications();
      }
    } else {
      // Clear notifications if not authenticated
      setNotifications([]);
      setUnreadCount(0);
      previousUserTypeRef.current = null; // Reset when not authenticated
      notificationsShownOnDashboardRef.current.clear(); // Reset dashboard tracking
      isFirstLoadAfterAuthRef.current = true; // Reset for next login
    }
  }, [isAuthenticated, user, authLoading, loadNotifications]); // Reload when auth state changes

  // Handle bell click to toggle dropdown
  const handleBellClick = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Set up polling interval for notifications (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated || !user || authLoading) {
      return;
    }

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, user, authLoading, loadNotifications]);

  // Reload notifications when window becomes visible (user returns to tab)
  useEffect(() => {
    if (!isAuthenticated || !user || authLoading) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reload notifications when user returns to the tab
        loadNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, user, authLoading, loadNotifications]);

  // Auto-mark notifications as read when navigating to relevant pages
  const autoMarkNotificationsAsRead = useCallback(async () => {
    if (!isAuthenticated || !user || !notifications.length) {
      return;
    }

    try {
      // For applicants on job-tracker page: mark application_status_update notifications as read
      if (user.userType === 'APPLICANT' && location.pathname === '/job-tracker') {
        const unreadStatusNotifications = notifications.filter(
          n => !n.read && n.type === 'application_status_update'
        );
        
        if (unreadStatusNotifications.length > 0) {
          // Mark all application status update notifications as read
          await Promise.all(
            unreadStatusNotifications.map(n => markNotificationAsRead(n.id))
          );
          
          // Update local state
          setNotifications(prev =>
            prev.map(n =>
              unreadStatusNotifications.some(un => un.id === n.id)
                ? { ...n, read: true }
                : n
            )
          );
          
          setUnreadCount(prev => Math.max(0, prev - unreadStatusNotifications.length));
        }
      }
      
      // For industry users on manage-applications page: mark new_application notifications as read
      if (user.userType === 'INDUSTRY' && location.pathname === '/manage-applications') {
        const unreadApplicationNotifications = notifications.filter(
          n => !n.read && n.type === 'new_application'
        );
        
        if (unreadApplicationNotifications.length > 0) {
          // Mark all new application notifications as read
          await Promise.all(
            unreadApplicationNotifications.map(n => markNotificationAsRead(n.id))
          );
          
          // Update local state
          setNotifications(prev =>
            prev.map(n =>
              unreadApplicationNotifications.some(un => un.id === n.id)
                ? { ...n, read: true }
                : n
            )
          );
          
          setUnreadCount(prev => Math.max(0, prev - unreadApplicationNotifications.length));
        }
      }
    } catch (error) {
      console.error('Error auto-marking notifications as read:', error);
    }
  }, [isAuthenticated, user, location.pathname, notifications.length]);

  // Show notifications only once on dashboard pages (/apply-jobs for applicants, /post-jobs for industry)
  useEffect(() => {
    if (!isAuthenticated || !user || authLoading) {
      return;
    }

    // Define dashboard routes where notifications should appear as toasts
    const applicantDashboard = '/apply-jobs';
    const industryDashboard = '/post-jobs';
    
    // Check if user is on their dashboard page
    const isApplicantOnDashboard = user.userType === 'APPLICANT' && location.pathname === applicantDashboard;
    const isIndustryOnDashboard = user.userType === 'INDUSTRY' && location.pathname === industryDashboard;
    
    if (isApplicantOnDashboard || isIndustryOnDashboard) {
      const dashboardRoute = isApplicantOnDashboard ? applicantDashboard : industryDashboard;
      
      // Only show notifications once per session on the dashboard
      if (!notificationsShownOnDashboardRef.current.has(dashboardRoute)) {
        console.log(`[NOTIFICATION] Showing notifications on dashboard: ${dashboardRoute}, userType: ${user?.userType}`);
        notificationsShownOnDashboardRef.current.add(dashboardRoute);
        
        const timer = setTimeout(() => {
          loadNotifications(true); // Pass true to show unread toasts with sound
        }, 800); // Delay to ensure page is fully loaded before showing notifications
        return () => clearTimeout(timer);
      } else {
        console.log(`[NOTIFICATION] Notifications already shown on dashboard: ${dashboardRoute}, skipping`);
      }
    }
  }, [location.pathname, isAuthenticated, user, authLoading, loadNotifications]);

  // Auto-mark notifications as read when navigating to relevant pages
  useEffect(() => {
    if (!isAuthenticated || !user || authLoading || !notifications.length) {
      return;
    }

    // Auto-mark as read after a short delay to ensure page has loaded
    const timer = setTimeout(() => {
      autoMarkNotificationsAsRead();
    }, 1000);

    return () => clearTimeout(timer);
  }, [location.pathname, isAuthenticated, user, authLoading, notifications.length, autoMarkNotificationsAsRead]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Reload notifications when dropdown opens (only if authenticated)
  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      loadNotifications();
    }
  }, [isOpen, isAuthenticated, user]);

  const handleNotificationClick = async (notification, e) => {
    // Prevent navigation if clicking the delete button
    if (e?.target.closest('.delete-button')) {
      return;
    }

    // Mark as read if not already read
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on user type and notification type
    if (notification.type === 'application_status_update' && user?.userType === 'APPLICANT') {
      // Navigate to job tracker for applicants
      navigate('/job-tracker');
    } else if (notification.type === 'new_application' && user?.userType === 'INDUSTRY') {
      // Navigate to manage applications and select the job
      if (notification.jobId) {
        navigate('/manage-applications', { 
          state: { selectedJobId: notification.jobId, selectedApplicationId: notification.applicationId } 
        });
      } else {
        navigate('/manage-applications');
      }
    }

    setIsOpen(false);
  };

  const handleDeleteNotification = async (notificationId, e) => {
    e.stopPropagation(); // Prevent triggering the notification click
    try {
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'application_status_update':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'new_application':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  return (
    <>
      {/* Toast Notifications Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toastNotifications.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <NotificationToast
              notification={toast.notification}
              onClose={() => closeToast(toast.id)}
              onMarkRead={handleToastMarkRead}
            />
          </div>
        ))}
      </div>

      <div className="relative" ref={dropdownRef}>
        {/* Bell Icon Button */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[20px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[500px] flex flex-col animate-fadeIn">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl">
            <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-sm">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={(e) => handleNotificationClick(notification, e)}
                    className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                            {/* Delete Button */}
                            <button
                              onClick={(e) => handleDeleteNotification(notification.id, e)}
                              className="delete-button p-1 hover:bg-gray-200 rounded-full transition-colors duration-150"
                              aria-label="Delete notification"
                              title="Delete notification"
                            >
                              <svg
                                className="w-4 h-4 text-gray-400 hover:text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
}

