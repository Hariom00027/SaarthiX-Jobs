import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Star, X, RefreshCw } from 'lucide-react';
import homeApiClient from '../../lib/homeApiClient';
import { useAuth } from '../../context/AuthContext';
import { redirectToSomethingX } from '../../config/redirectUrls';

const DROPDOWN_WIDTH = 400;
const VIEWPORT_PADDING = 16;

const ReviewNotifications = ({ variant = 'default' }) => {
  const [notifications, setNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: DROPDOWN_WIDTH });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const { user } = useAuth();

  // Get read notifications from localStorage
  const getReadNotifications = () => {
    try {
      const read = localStorage.getItem('readNotifications');
      return read ? JSON.parse(read) : [];
    } catch (e) {
      return [];
    }
  };

  // Mark notification as read in localStorage
  const markAsRead = (reviewId) => {
    try {
      const read = getReadNotifications();
      if (!read.includes(reviewId)) {
        read.push(reviewId);
        localStorage.setItem('readNotifications', JSON.stringify(read));
        // Trigger a custom event to update notifications in the same tab
        window.dispatchEvent(new Event('notificationRead'));
        // Also update local state immediately
        setNotifications(prev =>
          prev.map(n => n.id === reviewId ? { ...n, read: true } : n)
        );
      }
    } catch (e) {
      console.error('Error marking notification as read:', e);
    }
  };

  useEffect(() => {
    if (user?.userType === 'STUDENT' || user?.userType === 'APPLICANT') {
      fetchNotifications();
      // Refresh notifications every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      
      // Listen for storage changes (when notification is marked as read)
      const handleStorageChange = () => {
        // Update read status from localStorage without re-fetching from API
        const readNotifications = getReadNotifications();
        setNotifications(prev =>
          prev.map(n => ({
            ...n,
            read: readNotifications.includes(n.id)
          }))
        );
      };
      // Listen for both storage events (other tabs) and custom events (same tab)
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('notificationRead', handleStorageChange);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('notificationRead', handleStorageChange);
      };
    }
  }, [user]);

  // Prevent body scrolling only when notification drawer is open
  // Allow scrolling when expanded notification is open, but backdrop will hide dashboard
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal]);

  // Close notification box when scrolling outside it
  useEffect(() => {
    if (!showModal) return;

    const handleScrollLikeEvent = (event) => {
      // If the scroll starts inside the dropdown, do nothing
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
        return;
      }
      setShowModal(false);
    };

    window.addEventListener('scroll', handleScrollLikeEvent, { passive: true });
    window.addEventListener('wheel', handleScrollLikeEvent, { passive: true });
    window.addEventListener('touchmove', handleScrollLikeEvent, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScrollLikeEvent);
      window.removeEventListener('wheel', handleScrollLikeEvent);
      window.removeEventListener('touchmove', handleScrollLikeEvent);
    };
  }, [showModal]);

  const fetchNotifications = async () => {
    try {
      const accessToken = localStorage.getItem('token');
      if (!accessToken) {
        setNotifications([]);
        return;
      }

      // Get student ID from user - try multiple possible IDs
      const studentId = user?.id || user?.googleId || user?.email;

      if (!studentId) {
        console.log('No student ID available');
        setNotifications([]);
        return;
      }

      console.log('Fetching notifications for student:', studentId);
      console.log('User object:', user);

      // Try fetching by studentId
      let response;
      try {
        response = await homeApiClient.get(`/reviews/student/${studentId}`);
      } catch (error) {
        console.error('Error fetching reviews by studentId:', error);
        // Try alternative IDs if main one fails
        const altIds = [user?.googleId, user?.email, user?.id].filter(id => id && id !== studentId);
        for (const altId of altIds) {
          try {
            console.log('Trying alternative student ID:', altId);
            response = await homeApiClient.get(`/reviews/student/${altId}`);
            if (response.data && response.data.length > 0) {
              console.log('Found reviews with alternative ID:', altId);
              break;
            }
          } catch (e) {
            console.log('Alternative ID failed:', altId);
          }
        }
        if (!response) {
          throw error;
        }
      }

      console.log('All reviews for student:', response.data);

      // Filter for completed mentor reviews
      const completedReviews = (response.data || []).filter(
        review => review && review.type === 'HUMAN' && review.status === 'COMPLETED'
      );

      console.log('Completed mentor reviews:', completedReviews);

      // If still no reviews, try fetching all resumes for this student and get their reviews
      if (completedReviews.length === 0) {
        try {
          console.log('No reviews found, trying to fetch via resumes...');
          const resumesResponse = await homeApiClient.get(`/resumes/student/${studentId}`);
          console.log('Student resumes:', resumesResponse.data);

          if (resumesResponse.data && resumesResponse.data.length > 0) {
            const allReviews = [];
            for (const resume of resumesResponse.data) {
              try {
                const resumeReviewsResponse = await homeApiClient.get(`/reviews/resume/${resume.id}`);
                const resumeReviews = (resumeReviewsResponse.data || []).filter(
                  review => review && review.type === 'HUMAN' && review.status === 'COMPLETED'
                );
                allReviews.push(...resumeReviews);
              } catch (e) {
                console.log('Error fetching reviews for resume:', resume.id, e);
              }
            }
            console.log('Reviews found via resumes:', allReviews);
            if (allReviews.length > 0) {
              completedReviews.push(...allReviews);
            }
          }
        } catch (e) {
          console.log('Error fetching via resumes:', e);
        }
      }

      // Sort by reviewedAt (most recent first)
      completedReviews.sort((a, b) => {
        const dateA = a.reviewedAt ? new Date(a.reviewedAt) : new Date(0);
        const dateB = b.reviewedAt ? new Date(b.reviewedAt) : new Date(0);
        return dateB - dateA;
      });

      // Mark notifications as read based on localStorage
      const readNotifications = getReadNotifications();
      const notificationsWithReadStatus = completedReviews.map(review => ({
        ...review,
        read: readNotifications.includes(review.id)
      }));

      setNotifications(notificationsWithReadStatus);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      console.error('Error details:', error.response?.data);
      setNotifications([]);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Position dropdown in viewport when opening so it's never clipped by parent overflow
  const updateDropdownPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.min(DROPDOWN_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
    const isNarrow = window.innerWidth < 768;
    const left = isNarrow
      ? Math.max(VIEWPORT_PADDING, (window.innerWidth - width) / 2)
      : Math.max(VIEWPORT_PADDING, Math.min(rect.right, window.innerWidth - VIEWPORT_PADDING) - width);
    setDropdownPosition({
      top: rect.bottom + 8,
      left,
      width,
    });
  };

  const openModal = () => {
    fetchNotifications();
    updateDropdownPosition();
    setShowModal(true);
  };

  // Keep dropdown in view on resize
  useEffect(() => {
    if (!showModal) return;
    updateDropdownPosition();
    const handleResize = () => updateDropdownPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showModal]);

  const handleNotificationClick = (review) => {
    // Mark as read in localStorage and locally
    markAsRead(review.id);
    setNotifications(prev =>
      prev.map(n => n.id === review.id ? { ...n, read: true } : n)
    );
    // Navigate to notification details page
    const token =
      localStorage.getItem("token") || localStorage.getItem("somethingx_auth_token");
    redirectToSomethingX(`/students/notifications/${review.id}`, token, user);
  };

  if (user?.userType !== 'STUDENT' && user?.userType !== 'APPLICANT') {
    return null;
  }

  const isMenuItem = variant === 'menuItem';

  return (
    <div>
      {/* Bell: menu item (for hamburger) or standalone button (dashboard) */}
      <div style={{ position: 'relative' }}>
        <button
          ref={buttonRef}
          onClick={openModal}
          style={isMenuItem ? {
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'none',
            border: 'none',
            textAlign: 'left',
            color: '#333333',
            fontSize: '13px',
            cursor: 'pointer',
            position: 'relative',
          } : {
            background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)',
            border: '2px solid rgba(30, 144, 255, 0.2)',
            cursor: 'pointer',
            position: 'relative',
            padding: '0.75rem',
            borderRadius: '0.75rem',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(30, 144, 255, 0.15)'
          }}
          onMouseEnter={!isMenuItem ? (e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #1e90ff 0%, #0066cc 100%)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(30, 144, 255, 0.3)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          } : (e) => {
            e.currentTarget.style.background = '#f3f4f6';
          }}
          onMouseLeave={!isMenuItem ? (e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 144, 255, 0.15)';
            e.currentTarget.style.transform = 'translateY(0)';
          } : (e) => {
            e.currentTarget.style.background = 'none';
          }}
        >
          <Bell style={{
            width: isMenuItem ? '1.125rem' : '1.5rem',
            height: isMenuItem ? '1.125rem' : '1.5rem',
            color: isMenuItem ? '#115FD5' : '#1e90ff',
            flexShrink: 0,
          }}
            className="notification-bell-icon"
          />
          {isMenuItem && <span>Notifications</span>}
          {unreadCount > 0 && (
            isMenuItem ? (
              <span
                style={{
                  marginLeft: 'auto',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  flexShrink: 0,
                  animation: 'pulse 2s infinite',
                }}
                aria-hidden="true"
              />
            ) : (
              <span style={{
                position: 'absolute',
                top: '-0.25rem',
                right: '-0.25rem',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                borderRadius: '9999px',
                minWidth: '1.5rem',
                height: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 0.375rem',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.5)',
                border: '2px solid #ffffff',
                animation: 'pulse 2s infinite'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )
          )}
        </button>


        {/* Notifications Dropdown - portaled to body so parent overflow never clips it */}
        {showModal && createPortal(
          <>
            {/* Backdrop for closing */}
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9998,
                cursor: 'default'
              }}
              onClick={() => {
                setShowModal(false);
                setShowModal(false);
              }}
              aria-hidden="true"
            />

            {/* Dropdown Container - fixed position, always in viewport */}
            <div
              className="review-notifications-dropdown"
              role="dialog"
              aria-label="Notifications"
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width || Math.min(DROPDOWN_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2),
                minWidth: 280,
                maxHeight: '80vh',
                backgroundColor: '#ffffff',
                borderRadius: '1.5rem',
                boxShadow: '0 20px 40px -5px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                zIndex: 9999,
                animation: 'slideDown 0.2s ease-out',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxSizing: 'border-box',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - ensure text is visible */}
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '1.25rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
                minWidth: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                  <h2 style={{
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'visible',
                  }}>
                    Notifications
                  </h2>
                  {unreadCount > 0 && (
                    <span style={{
                      background: '#ef4444',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '999px',
                      flexShrink: 0,
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    onClick={() => fetchNotifications()}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: 'transparent',
                      color: '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    className="hover:bg-slate-100 hover:text-blue-600"
                    title="Refresh"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: 'transparent',
                      color: '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    className="hover:bg-slate-100 hover:text-red-500"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Content List - scrollable, content fully visible */}
              <div style={{
                overflowY: 'auto',
                overflowX: 'visible',
                maxHeight: 'calc(80vh - 70px)',
                padding: '0.5rem',
                minWidth: 0,
                boxSizing: 'border-box',
              }}>
                {notifications.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '3rem 1.5rem',
                    color: '#64748b',
                    boxSizing: 'border-box',
                  }}>
                    <div style={{
                      display: 'inline-flex',
                      padding: '1rem',
                      background: '#f1f5f9',
                      borderRadius: '50%',
                      marginBottom: '1rem'
                    }}>
                      <Bell size={24} color="#94a3b8" />
                    </div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>No notifications yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {notifications.map((review) => (
                      <div
                        key={review.id}
                        onClick={() => handleNotificationClick(review)}
                        style={{
                          padding: '1rem',
                          borderRadius: '0.75rem',
                          background: !review.read ? '#eff6ff' : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          border: '1px solid transparent',
                          position: 'relative',
                          boxSizing: 'border-box',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = !review.read ? '#dbeafe' : '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = !review.read ? '#eff6ff' : 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', minWidth: 0 }}>
                          <div style={{
                            minWidth: '2.5rem',
                            height: '2.5rem',
                            borderRadius: '0.5rem',
                            background: !review.read ? '#3b82f6' : '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '0.125rem',
                            flexShrink: 0,
                          }}>
                            <Star size={16} color={!review.read ? 'white' : '#94a3b8'} fill={!review.read ? 'white' : '#94a3b8'} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                              <h4 style={{
                                fontSize: '0.875rem',
                                fontWeight: !review.read ? 700 : 600,
                                color: '#1e293b',
                                margin: 0,
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word',
                              }}>
                                Resume Review
                              </h4>
                              {!review.read && (
                                <span style={{
                                  width: '0.5rem',
                                  height: '0.5rem',
                                  background: '#3b82f6',
                                  borderRadius: '50%',
                                  flexShrink: 0,
                                }} />
                              )}
                            </div>
                            <p style={{
                              fontSize: '0.75rem',
                              color: '#64748b',
                              margin: '0 0 0.5rem 0',
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              wordWrap: 'break-word',
                              overflowWrap: 'break-word',
                            }}>
                              {review.review || 'Your resume has been reviewed.'}
                            </p>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {review.reviewedAt ? new Date(review.reviewedAt).toLocaleDateString() : 'Recently'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
          }
          
          .notification-bell-icon {
            transition: all 0.3s ease;
          }
          
          button:hover .notification-bell-icon {
            color: #ffffff !important;
          }

          /* Dropdown position is set in JS (fixed, viewport-safe); only adjust appearance on small screens */
          @media (max-width: 480px) {
            .review-notifications-dropdown {
              border-radius: 1.25rem;
            }
          }
        `}
      </style>
    </div>
  );
};

export default ReviewNotifications;

