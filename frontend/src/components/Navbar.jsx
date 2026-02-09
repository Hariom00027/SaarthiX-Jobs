import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout } from "../api/authApi";
import { redirectToSomethingX, redirectToProfiling } from "../config/redirectUrls";
import NotificationCenter from "./NotificationCenter";
import LogoImage from "./logo_png.png";

const Navbar = () => {
  const { user, isAuthenticated, clearAuth } = useAuth();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );

  // Get SomethingX user info from localStorage
  const getSomethingXUser = () => {
    try {
      const somethingxUserStr = localStorage.getItem('somethingx_auth_user');
      return somethingxUserStr ? JSON.parse(somethingxUserStr) : null;
    } catch {
      return null;
    }
  };

  // Get SomethingX token from localStorage
  const getSomethingXToken = () => {
    return localStorage.getItem('somethingx_auth_token') || localStorage.getItem('token');
  };

  const somethingxUser = getSomethingXUser();
  const somethingxToken = getSomethingXToken();
  const displayUser = somethingxUser || user;

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      if (width >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile menu and user dropdown on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  // Position dropdown and close when clicking outside
  const updateDropdownPosition = () => {
    if (!userMenuRef.current) return;
    const rect = userMenuRef.current.getBoundingClientRect();
    const dropdownWidth = 180;
    setDropdownPosition({
      top: rect.bottom + 8,
      left: rect.right - dropdownWidth,
    });
  };

  useEffect(() => {
    if (!showUserMenu) return;
    updateDropdownPosition();
    const handleScrollOrResize = () => updateDropdownPosition();
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [showUserMenu]);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e) => {
      const inTrigger = userMenuRef.current?.contains(e.target);
      const inDropdown = dropdownRef.current?.contains(e.target);
      if (!inTrigger && !inDropdown) setShowUserMenu(false);
    };
    const id = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = () => {
    logout(clearAuth);
    setShowUserMenu(false);
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    redirectToSomethingX('', somethingxToken, displayUser);
  };

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .navbar-desktop-menu {
            display: none !important;
          }
          .navbar-mobile-menu {
            display: flex !important;
          }
          .navbar-logo-text {
            font-size: 18px !important;
          }
        }

        @media (min-width: 768px) {
          .navbar-mobile-menu {
            display: none !important;
          }
        }
        .navbar-user-dropdown {
          position: fixed !important;
          z-index: 9999 !important;
        }
      `}</style>
      <nav style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '6px 16px' : isTablet ? '8px 24px' : '10px 48px',
        gap: '6px',
        background: '#FFFFFF',
        borderBottom: '1px solid #F3F4F6',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        position: 'relative',
        zIndex: 1000,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}>
        <div className="navbar-container" style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: isMobile ? '16px' : isTablet ? '20px' : windowWidth >= 1280 ? '40px' : '30px',
          width: '100%',
          maxWidth: '1344px',
          minWidth: 0,
          flexWrap: 'nowrap'
        }}>
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '2px',
              textDecoration: 'none',
              flexShrink: 0,
              minWidth: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: '2px',
              textDecoration: 'none',
              flexShrink: 0,
              minWidth: 0
            }}>
              <img 
                src={LogoImage} 
                alt="SaarthiX Logo" 
                style={{
                  height: isMobile ? '28px' : '36px',
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  verticalAlign: 'bottom'
                }}
              />
              <span className="navbar-logo-text" style={{
                fontFamily: "'Times New Roman', serif",
                fontWeight: 'bold',
                fontStyle: 'italic',
                fontSize: isMobile ? '18px' : '22px',
                lineHeight: '1',
                letterSpacing: '-0.01em',
                color: '#0D47A1',
                paddingBottom: '1px'
              }}>SaarthiX</span>
            </div>
          </button>

          {/* Center links (desktop) */}
          <div
            className="navbar-desktop-menu"
            style={{
              display: "flex",
              flex: "1 1 auto",
              justifyContent: "center",
              gap: isMobile ? "12px" : isTablet ? "16px" : "24px",
              alignItems: "center",
              minWidth: 0,
            }}
          >
            {!isAuthenticated && (
              <>
                <button
                  type="button"
                  onClick={() => redirectToSomethingX('/students', somethingxToken, displayUser)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#333333",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Students
                </button>
                <button
                  type="button"
                  onClick={() => redirectToSomethingX('/institutes', somethingxToken, displayUser)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#333333",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Institutes
                </button>
                <button
                  type="button"
                  onClick={() => redirectToSomethingX('/industry', somethingxToken, displayUser)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#333333",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Industry
                </button>
                <button
                  type="button"
                  onClick={() => redirectToSomethingX('/about-us', somethingxToken, displayUser)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#333333",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  About Us
                </button>
              </>
            )}

            {isAuthenticated && (user?.userType === "APPLICANT" || displayUser?.userType === "STUDENT") && (
              <>
                <button
                  type="button"
                  onClick={() => redirectToSomethingX('/students/job-blueprint', somethingxToken, displayUser)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#333333",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Job Blueprint
                </button>
                <button
                  type="button"
                  onClick={() => redirectToProfiling(somethingxToken, displayUser)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#333333",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Profiling
                </button>
                <button
                  type="button"
                  onClick={() => redirectToSomethingX('/students/resume-builder', somethingxToken, displayUser)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#333333",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Resume Builder
                </button>
                <Link
                  to="/apply-jobs"
                  style={{
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#115FD5",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Apply To Jobs
                </Link>
                <button
                  type="button"
                  onClick={() => redirectToSomethingX('/about-us', somethingxToken, displayUser)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#333333",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  About Us
                </button>
              </>
            )}

            {isAuthenticated && user?.userType === "INDUSTRY" && (
              <>
                <Link
                  to="/manage-applications"
                  style={{
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#115FD5",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Post Jobs
                </Link>
                <Link
                  to="/manage-hackathons"
                  style={{
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#115FD5",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Post Hackathons
                </Link>
                <button
                  type="button"
                  onClick={() => redirectToSomethingX('/industry/ai-interview', somethingxToken, displayUser)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#333333",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  AI Interview
                </button>
                <button
                  type="button"
                  onClick={() => redirectToSomethingX('/about-us', somethingxToken, displayUser)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#333333",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  About Us
                </button>
              </>
            )}
          </div>

          {/* Right Side Actions - Desktop */}
          <div
            className="navbar-desktop-menu"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: isMobile ? '8px' : '16px',
              flexShrink: 0,
              minWidth: 0,
              whiteSpace: 'nowrap'
            }}
          >
            {isAuthenticated ? (
              <>
                {!isMobile && !isTablet && (
                  <button
                    type="button"
                    onClick={() => {
                      // Determine the correct dashboard path based on user type
                      const userType = displayUser?.userType;
                      const dashboardPath = userType === "INSTITUTE" ? "/institutes/dashboard" : "/dashboard";
                      redirectToSomethingX(dashboardPath, somethingxToken, displayUser);
                    }}
                    className="navbar-button-text"
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '10px 20px',
                      background: '#FFFFFF',
                      border: '1px solid #115FD5',
                      borderRadius: '24px',
                      fontWeight: 500,
                      fontSize: '16px',
                      color: '#115FD5',
                      cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                      whiteSpace: 'nowrap',
                      textDecoration: 'none'
                    }}
                  >
                    Dashboard
                  </button>
                )}

                <NotificationCenter />

                <div ref={userMenuRef} style={{ position: "relative", overflow: "visible" }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const next = !showUserMenu;
                      if (next && userMenuRef.current) {
                        const rect = userMenuRef.current.getBoundingClientRect();
                        setDropdownPosition({
                          top: rect.bottom + 8,
                          left: rect.right - 180,
                        });
                      }
                      setShowUserMenu(next);
                    }}
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: isMobile ? "8px 12px" : "10px 20px",
                      background: "#115FD5",
                      border: "none",
                      borderRadius: "24px",
                      fontWeight: 500,
                      fontSize: isMobile ? "14px" : "16px",
                      color: "#FFFFFF",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user?.name?.split(" ")[0] || "User"}
                  </button>
                  {showUserMenu && createPortal(
                    <div
                      ref={dropdownRef}
                      className="navbar-user-dropdown"
                      role="menu"
                      style={{
                        position: "fixed",
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        minWidth: "180px",
                        background: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        zIndex: 9999,
                        overflow: "hidden",
                      }}
                    >
                      {user?.userType === 'APPLICANT' && (
                        <>
                          <Link
                            to="/view-profile"
                            onClick={() => setShowUserMenu(false)}
                            style={{
                              display: "block",
                              padding: "12px 16px",
                              color: "#333333",
                              textDecoration: "none",
                              fontWeight: 500,
                              fontSize: "15px",
                              borderBottom: "1px solid #F3F4F6",
                            }}
                          >
                            Profile
                          </Link>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          // Determine the correct dashboard path based on user type
                          const userType = displayUser?.userType;
                          const dashboardPath = userType === "INSTITUTE" ? "/institutes/dashboard" : "/dashboard";
                          redirectToSomethingX(dashboardPath, somethingxToken, displayUser);
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "12px 16px",
                          background: "none",
                          border: "none",
                          color: "#333333",
                          textAlign: "left",
                          textDecoration: "none",
                          fontWeight: 500,
                          fontSize: "15px",
                          borderBottom: "1px solid #F3F4F6",
                          cursor: "pointer",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "12px 16px",
                          background: "none",
                          border: "none",
                          color: "#DC2626",
                          textAlign: "left",
                          fontWeight: 500,
                          fontSize: "15px",
                          cursor: "pointer",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        Logout
                      </button>
                    </div>,
                    document.body
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => redirectToSomethingX('', somethingxToken, displayUser)}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "10px 20px",
                    background: "#115FD5",
                    border: "none",
                    borderRadius: "24px",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#FFFFFF",
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="navbar-mobile-menu"
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
            style={{
              display: "none",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: "4px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              marginLeft: "auto",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "3px",
                background: "#115FD5",
                borderRadius: "2px",
                transform: isMobileMenuOpen
                  ? "rotate(45deg) translate(5px, 5px)"
                  : "none",
                transition: "all 0.3s ease",
              }}
            />
            <div
              style={{
                width: "24px",
                height: "3px",
                background: "#115FD5",
                borderRadius: "2px",
                opacity: isMobileMenuOpen ? 0 : 1,
                transition: "all 0.3s ease",
              }}
            />
            <div
              style={{
                width: "24px",
                height: "3px",
                background: "#115FD5",
                borderRadius: "2px",
                transform: isMobileMenuOpen
                  ? "rotate(-45deg) translate(7px, -6px)"
                  : "none",
                transition: "all 0.3s ease",
              }}
            />
          </button>
        </div>

        {/* Mobile drawer */}
        {isMobileMenuOpen && (
          <div
            className="navbar-mobile-drawer"
            style={{
              position: "fixed",
              top: isMobile ? "50px" : "54px",
              left: 0,
              right: 0,
              bottom: 0,
              background: "#FFFFFF",
              zIndex: 999,
              overflowY: "auto",
              padding: "24px 16px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {!isAuthenticated && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      redirectToSomethingX('/students', somethingxToken, displayUser);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#333333",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Students
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      redirectToSomethingX('/institutes', somethingxToken, displayUser);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#333333",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Institutes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      redirectToSomethingX('/industry', somethingxToken, displayUser);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#333333",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Industry
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      redirectToSomethingX('/about-us', somethingxToken, displayUser);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#333333",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    About Us
                  </button>
                </>
              )}

              {isAuthenticated && (user?.userType === "APPLICANT" || displayUser?.userType === "STUDENT") && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      redirectToSomethingX('/students/job-blueprint', somethingxToken, displayUser);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#333333",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Job Blueprint
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      redirectToProfiling(somethingxToken, displayUser);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#333333",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Profiling
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      redirectToSomethingX('/students/resume-builder', somethingxToken, displayUser);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#333333",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Resume Builder
                  </button>
                  <Link
                    to="/apply-jobs"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#115FD5",
                      fontSize: "14px",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Apply To Jobs
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      redirectToSomethingX('/about-us', somethingxToken, displayUser);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#333333",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    About Us
                  </button>
                </>
              )}

              {isAuthenticated && user?.userType === "INDUSTRY" && (
                <>
                  <Link
                    to="/manage-applications"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#115FD5",
                      fontSize: "14px",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Post Jobs
                  </Link>
                  <Link
                    to="/manage-hackathons"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#115FD5",
                      fontSize: "14px",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Post Hackathons
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      redirectToSomethingX('/industry/ai-interview', somethingxToken, displayUser);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#333333",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    AI Interview
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      redirectToSomethingX('/about-us', somethingxToken, displayUser);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#333333",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    About Us
                  </button>
                </>
              )}

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #F3F4F6'
                }}
              >
                {isAuthenticated ? (
                  <>
                    {user?.userType === 'APPLICANT' && (
                      <Link
                        to="/view-profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          color: '#333333',
                          fontWeight: '500',
                          fontSize: '16px'
                        }}
                      >
                        Profile
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        // Determine the correct dashboard path based on user type
                        const userType = displayUser?.userType;
                        const dashboardPath = userType === "INSTITUTE" ? "/institutes/dashboard" : "/dashboard";
                        redirectToSomethingX(dashboardPath, somethingxToken, displayUser);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        background: '#FFFFFF',
                        border: '1px solid #115FD5',
                        borderRadius: '24px',
                        fontWeight: 500,
                        fontSize: '16px',
                        color: '#115FD5',
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        marginTop: '4px'
                      }}
                    >
                      Dashboard
                    </button>

                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: '24px',
                        fontWeight: 500,
                        fontSize: '16px',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        marginTop: '8px'
                      }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        redirectToSomethingX('', somethingxToken, displayUser);
                        setIsMobileMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        background: '#115FD5',
                        border: 'none',
                        borderRadius: '24px',
                        fontWeight: 500,
                        fontSize: '16px',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif"
                      }}
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
