import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout as apiLogout } from "../api/authApi";
import UserTypeSelection from "./auth/UserTypeSelection";
import ReviewNotifications from "./notifications/ReviewNotifications";
import { redirectToSomethingX, redirectToProfiling } from "../config/redirectUrls";

const getAuthToken = () =>
  localStorage.getItem("token") || localStorage.getItem("somethingx_auth_token") || "";

const Navbar = () => {
  const { user, isAuthenticated, clearAuth, loading } = useAuth();
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isStudent =
    isAuthenticated &&
    (user?.userType === "STUDENT" || user?.userType === "APPLICANT");

  const goHome = (path, after) => {
    after?.();
    redirectToSomethingX(path, getAuthToken(), user);
  };

  const handleLogout = () => {
    apiLogout(clearAuth);
  };

  const [showUserTypeSelection, setShowUserTypeSelection] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileToggleRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );
  const [openStudentNav, setOpenStudentNav] = useState(null); // 'career' | 'practice' | 'jobs' | null
  const studentNavCloseTimer = useRef(null);
  const studentNavAreaRef = useRef(null);

  const [openInstNav, setOpenInstNav] = useState(null); // 'learning' | 'training' | 'placement' | null
  const instNavCloseTimer = useRef(null);
  const [openIndustryNav, setOpenIndustryNav] = useState(null); // 'talent' | null
  const industryNavCloseTimer = useRef(null);

  const showDashboard = true;

  const dashboardPath = (() => {
    const userType = user?.userType;
    if (userType === "INSTITUTE") return "/institutes/dashboard";
    if (userType === "MENTOR") return "/mentor/dashboard";
    return "/dashboard";
  })();

  // Logo click: when logged in, go to section home for that user type; otherwise go to main home
  const logoHomePath = (() => {
    if (!isAuthenticated || !user?.userType) return "/";
    const userType = user.userType;
    if (userType === "STUDENT" || userType === "APPLICANT") return "/students";
    if (userType === "INSTITUTE") return "/institutes";
    if (userType === "INDUSTRY") return "/industry";
    return "/";
  })();

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
    setOpenStudentNav(null);
    setOpenInstNav(null);
    setOpenIndustryNav(null);
  }, [location.pathname]);

  // Close mobile menu when clicking outside or scrolling
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleClickOrTouch = (e) => {
      const menuEl = mobileMenuRef.current;
      const toggleEl = mobileToggleRef.current;
      const inMenu = menuEl && menuEl.contains(e.target);
      const inToggle = toggleEl && toggleEl.contains(e.target);
      if (!inMenu && !inToggle) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleScroll = () => {
      setIsMobileMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOrTouch);
    document.addEventListener("touchstart", handleClickOrTouch);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOrTouch);
      document.removeEventListener("touchstart", handleClickOrTouch);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isMobileMenuOpen]);

  // Position dropdown and close when clicking outside (dropdown is portaled to body)
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

  useEffect(() => {
    return () => {
      if (studentNavCloseTimer.current) clearTimeout(studentNavCloseTimer.current);
      if (instNavCloseTimer.current) clearTimeout(instNavCloseTimer.current);
      if (industryNavCloseTimer.current) clearTimeout(industryNavCloseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!openStudentNav) return;
    const handleOutside = (e) => {
      const area = studentNavAreaRef.current;
      if (!area) return;
      if (!area.contains(e.target)) setOpenStudentNav(null);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [openStudentNav]);

  const userAvatarInitials = useMemo(() => {
    const first = (user?.firstName || user?.firstname || user?.first_name || "").trim();
    const last = (user?.lastName || user?.lastname || user?.last_name || "").trim();
    const oauthCombined = `${user?.given_name || ""} ${user?.family_name || ""}`.trim();

    let cachedName = "";
    try {
      const cached = JSON.parse(localStorage.getItem("somethingx_auth_user") || "{}");
      cachedName = (cached?.name || cached?.fullName || "").trim();
    } catch {
      cachedName = "";
    }

    let tokenName = "";
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("somethingx_auth_token");
      if (token && token.split(".").length >= 2) {
        const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const decoded = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")));
        tokenName = (decoded?.name || `${decoded?.given_name || ""} ${decoded?.family_name || ""}`).trim();
      }
    } catch {
      tokenName = "";
    }

    const directInitials = `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();
    if (directInitials) return directInitials;

    const preferredName =
      [cachedName, oauthCombined, tokenName, user?.name, user?.fullName]
        .map((val) => (val || "").toString().trim())
        .find((val) => val && val.toLowerCase() !== "user") || "";

    if (!preferredName) return "U";
    const parts = preferredName.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "U";
    const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] || "") : "";
    return (a + b).toUpperCase();
  }, [user]);

  const studentAvatarSrc = useMemo(
    () =>
      user?.picture ||
      user?.profilePicture ||
      user?.avatar ||
      user?.photoURL ||
      "",
    [user]
  );

  const userDisplayName = useMemo(() => {
    const first = (user?.firstName || user?.firstname || "").trim();
    const last = (user?.lastName || user?.lastname || "").trim();
    const combined = `${first} ${last}`.trim();
    const oauthCombined = `${user?.given_name || ""} ${user?.family_name || ""}`.trim();
    const candidates = [
      combined,
      oauthCombined,
      user?.name,
      user?.fullName,
      user?.preferred_username,
      user?.username,
      user?.email?.split("@")?.[0],
    ]
      .map((val) => (val || "").toString().trim())
      .filter(Boolean)
      .filter((val) => val.toLowerCase() !== "user");

    if (candidates.length === 0) return "User";
    return candidates[0];
  }, [user]);

  const userDisplayNameShort = useMemo(() => {
    const firstToken = (userDisplayName || "").trim().split(/\s+/)[0];
    return firstToken || "User";
  }, [userDisplayName]);

  const openStudentDropdown = (key) => {
    // Enable Student dropdowns on desktop + tablet; disable only on mobile drawer UI.
    if (!isStudent || isMobile) return;
    if (studentNavCloseTimer.current) clearTimeout(studentNavCloseTimer.current);
    setOpenStudentNav(key);
  };

  const scheduleCloseStudentDropdown = () => {
    if (!isStudent || isMobile) return;
    if (studentNavCloseTimer.current) clearTimeout(studentNavCloseTimer.current);
    studentNavCloseTimer.current = setTimeout(() => setOpenStudentNav(null), 120);
  };

  const toggleStudentDropdown = (key) => {
    if (!isStudent || isMobile) return;
    if (studentNavCloseTimer.current) clearTimeout(studentNavCloseTimer.current);
    setOpenStudentNav((prev) => (prev === key ? null : key));
  };

  const isInstitute = isAuthenticated && user?.userType === "INSTITUTE";
  const isIndustry = isAuthenticated && user?.userType === "INDUSTRY";
  const isInstituteOrIndustry = isInstitute || isIndustry;

  const openProfilePage = (after) => {
    after?.();
    if (isInstituteOrIndustry) {
      redirectToSomethingX("/edit-your-details", getAuthToken(), user);
      return;
    }
    redirectToSomethingX("/profile-builder", getAuthToken(), user);
  };
  const openInstDropdown = (key) => {
    if (!isInstitute || isMobile) return;
    if (instNavCloseTimer.current) clearTimeout(instNavCloseTimer.current);
    setOpenInstNav(key);
  };

  const scheduleCloseInstDropdown = () => {
    if (!isInstitute || isMobile) return;
    if (instNavCloseTimer.current) clearTimeout(instNavCloseTimer.current);
    instNavCloseTimer.current = setTimeout(() => setOpenInstNav(null), 120);
  };

  const toggleInstDropdown = (key) => {
    if (!isInstitute || isMobile) return;
    if (instNavCloseTimer.current) clearTimeout(instNavCloseTimer.current);
    setOpenInstNav((prev) => (prev === key ? null : key));
  };

  const openIndustryDropdown = (key) => {
    if (!isIndustry || isMobile) return;
    if (industryNavCloseTimer.current) clearTimeout(industryNavCloseTimer.current);
    setOpenIndustryNav(key);
  };

  const scheduleCloseIndustryDropdown = () => {
    if (!isIndustry || isMobile) return;
    if (industryNavCloseTimer.current) clearTimeout(industryNavCloseTimer.current);
    industryNavCloseTimer.current = setTimeout(() => setOpenIndustryNav(null), 120);
  };

  const toggleIndustryDropdown = (key) => {
    if (!isIndustry || isMobile) return;
    if (industryNavCloseTimer.current) clearTimeout(industryNavCloseTimer.current);
    setOpenIndustryNav((prev) => (prev === key ? null : key));
  };

  // Avoid a brief flash of stale navbar state while auth context bootstraps.
  if (loading) {
    return (
      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "10px 48px",
          background: "#FFFFFF",
          borderBottom: "1px solid #F3F4F6",
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          width: "100%",
          boxSizing: "border-box",
          minHeight: "72px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1344px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <img
            src="/assets/Saarthi logoimg.png"
            alt="SaarthiX Logo"
            style={{ height: "45px", width: "auto", objectFit: "contain", display: "block" }}
          />
          <div
            aria-hidden="true"
            style={{
              width: "120px",
              height: "34px",
              borderRadius: "9999px",
              background: "#F3F4F6",
            }}
          />
        </div>
      </nav>
    );
  }

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

        /* Student navbar (desktop) */
        .student-nav-link {
          color: #111827;
          font-weight: 500;
          font-size: 14px;
          line-height: 20px;
          letter-spacing: -0.01em;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px 10px;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          user-select: none;
        }
        .student-nav-link:hover {
          background: #F3F4F6;
        }
        .student-nav-caret {
          width: 10px;
          height: 10px;
          display: inline-block;
          border-right: 2px solid rgba(17, 24, 39, 0.7);
          border-bottom: 2px solid rgba(17, 24, 39, 0.7);
          transform: rotate(45deg);
          margin-top: -2px;
        }
        .student-nav-item {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .student-nav-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          min-width: 220px;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.06);
          padding: 8px;
          z-index: 2147483647;
        }
        .student-nav-dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          text-decoration: none;
          color: #111827;
          font-weight: 500;
          font-size: 14px;
          line-height: 20px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          text-align: left;
        }
        .student-nav-dropdown-item:hover {
          background: #F3F4F6;
        }
        .student-nav-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .student-dashboard-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 14px;
          background-color: rgb(49 112 165);
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          box-shadow: 0 6px 14px rgba(49, 112, 165, 0.25);
        }
        .student-user-trigger {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 6px 10px;
          border-radius: 10px;
          border: 1px solid #E5E7EB;
          background: #FFFFFF;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          color: #111827;
          font-weight: 500;
          font-size: 14px;
        }
        .student-user-trigger:hover {
          background: #F9FAFB;
        }
        .student-avatar {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #F59E0B, #F97316);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 12px;
          flex: 0 0 auto;
        }
        .student-avatar-image {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          object-fit: cover;
          border: 1px solid #E5E7EB;
          flex: 0 0 auto;
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
        zIndex: 100000,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
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
            type="button"
            onClick={() => goHome(logoHomePath)}
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
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL}assets/Saarthi logoimg.png`}
              alt="SaarthiX Logo"
              style={{
                height: isMobile ? '35px' : '45px',
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
                verticalAlign: 'bottom'
              }}
            />
          </button>

          {/* Center links (desktop) */}
          <div
            className="navbar-desktop-menu"
            ref={studentNavAreaRef}
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
                  onClick={() => goHome("/students")}
                  style={{
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#333333",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    padding: 0,
                  }}
                >
                  Students
                </button>
                <button
                  type="button"
                  onClick={() => goHome("/institutes")}
                  style={{
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#333333",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    padding: 0,
                  }}
                >
                  Institutes
                </button>
                <button
                  type="button"
                  onClick={() => goHome("/industry")}
                  style={{
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#333333",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    padding: 0,
                  }}
                >
                  Industry
                </button>
                <button
                  type="button"
                  onClick={() => goHome("/about-us")}
                  style={{
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#333333",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    padding: 0,
                  }}
                >
                  About Us
                </button>
              </>
            )}

            {isStudent && (
              <>
                <div
                  className="student-nav-item"
                  onMouseEnter={() => openStudentDropdown("career")}
                  onMouseLeave={scheduleCloseStudentDropdown}
                >
                  <button
                    type="button"
                    className="student-nav-link"
                    aria-haspopup="menu"
                    aria-expanded={openStudentNav === "career"}
                    onClick={() => toggleStudentDropdown("career")}
                  >
                    Career Tools <span className="student-nav-caret" />
                  </button>
                  {openStudentNav === "career" && (
                    <div
                      className="student-nav-dropdown"
                      role="menu"
                      onMouseEnter={() => openStudentDropdown("career")}
                      onMouseLeave={scheduleCloseStudentDropdown}
                    >
                      <button
                        type="button"
                        className="student-nav-dropdown-item"
                        onClick={() => {
                          setOpenStudentNav(null);
                          redirectToProfiling(getAuthToken(), user);
                        }}
                      >
                        Hire me Profile
                      </button>
                      <button
                        type="button"
                        className="student-nav-dropdown-item"
                        onClick={() => goHome("/students/resume-builder", () => setOpenStudentNav(null))}
                      >
                        Resume Builder
                      </button>
                      <button
                        type="button"
                        className="student-nav-dropdown-item"
                        onClick={() => goHome("/students/career-counselling", () => setOpenStudentNav(null))}
                      >
                        Career Counselling
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className="student-nav-item"
                  onMouseEnter={() => openStudentDropdown("practice")}
                  onMouseLeave={scheduleCloseStudentDropdown}
                >
                  <button
                    type="button"
                    className="student-nav-link"
                    aria-haspopup="menu"
                    aria-expanded={openStudentNav === "practice"}
                    onClick={() => toggleStudentDropdown("practice")}
                  >
                    Practice <span className="student-nav-caret" />
                  </button>
                  {openStudentNav === "practice" && (
                    <div
                      className="student-nav-dropdown"
                      role="menu"
                      onMouseEnter={() => openStudentDropdown("practice")}
                      onMouseLeave={scheduleCloseStudentDropdown}
                    >
                      <button
                        type="button"
                        className="student-nav-dropdown-item"
                        onClick={() => goHome("/students/interview-preparation", () => setOpenStudentNav(null))}
                      >
                        Interview Preparation
                      </button>
                      <button
                        type="button"
                        className="student-nav-dropdown-item"
                        onClick={() => goHome("/students/job-blueprint", () => setOpenStudentNav(null))}
                      >
                        Job Blueprint
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className="student-nav-item"
                  onMouseEnter={() => openStudentDropdown("jobs")}
                  onMouseLeave={scheduleCloseStudentDropdown}
                >
                  <button
                    type="button"
                    className="student-nav-link"
                    aria-haspopup="menu"
                    aria-expanded={openStudentNav === "jobs"}
                    onClick={() => toggleStudentDropdown("jobs")}
                  >
                    Jobs and Hackathons <span className="student-nav-caret" />
                  </button>
                  {openStudentNav === "jobs" && (
                    <div
                      className="student-nav-dropdown"
                      role="menu"
                      onMouseEnter={() => openStudentDropdown("jobs")}
                      onMouseLeave={scheduleCloseStudentDropdown}
                    >
                      <Link
                        to="/apply-jobs"
                        className="student-nav-dropdown-item"
                        onClick={() => setOpenStudentNav(null)}
                      >
                        Apply to Jobs and Hackathons
                      </Link>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => goHome("/about-us")}
                  className="student-nav-link"
                  style={{ padding: "8px 10px" }}
                >
                  About
                </button>
              </>
            )}

            {isInstitute && (
              <>
                {/* Learning dropdown */}
                <div
                  className="student-nav-item"
                  onMouseEnter={() => openInstDropdown("learning")}
                  onMouseLeave={scheduleCloseInstDropdown}
                >
                  <button
                    type="button"
                    className="student-nav-link"
                    aria-haspopup="menu"
                    aria-expanded={openInstNav === "learning"}
                    onClick={() => toggleInstDropdown("learning")}
                  >
                    Learning <span className="student-nav-caret" />
                  </button>
                  {openInstNav === "learning" && (
                    <div
                      className="student-nav-dropdown"
                      role="menu"
                      onMouseEnter={() => openInstDropdown("learning")}
                      onMouseLeave={scheduleCloseInstDropdown}
                    >
                      <button
                        type="button"
                        className="student-nav-dropdown-item"
                        onClick={() => goHome("/institutes/workshops", () => setOpenInstNav(null))}
                      >
                        Workshops
                      </button>
                      <button
                        type="button"
                        className="student-nav-dropdown-item"
                        onClick={() => goHome("/institutes/expert-session", () => setOpenInstNav(null))}
                      >
                        Expert Session
                      </button>
                    </div>
                  )}
                </div>

                {/* Training dropdown */}
                <div
                  className="student-nav-item"
                  onMouseEnter={() => openInstDropdown("training")}
                  onMouseLeave={scheduleCloseInstDropdown}
                >
                  <button
                    type="button"
                    className="student-nav-link"
                    aria-haspopup="menu"
                    aria-expanded={openInstNav === "training"}
                    onClick={() => toggleInstDropdown("training")}
                  >
                    Training <span className="student-nav-caret" />
                  </button>
                  {openInstNav === "training" && (
                    <div
                      className="student-nav-dropdown"
                      role="menu"
                      onMouseEnter={() => openInstDropdown("training")}
                      onMouseLeave={scheduleCloseInstDropdown}
                    >
                      <button
                        type="button"
                        className="student-nav-dropdown-item"
                        onClick={() => goHome("/institutes/internship-management", () => setOpenInstNav(null))}
                      >
                        Student Training
                      </button>
                      <button
                        type="button"
                        className="student-nav-dropdown-item"
                        onClick={() => goHome("/institutes/trainings", () => setOpenInstNav(null))}
                      >
                        Role Ready Training
                      </button>
                    </div>
                  )}
                </div>

                {/* Placement dropdown */}
                <div
                  className="student-nav-item"
                  onMouseEnter={() => openInstDropdown("placement")}
                  onMouseLeave={scheduleCloseInstDropdown}
                >
                  <button
                    type="button"
                    className="student-nav-link"
                    aria-haspopup="menu"
                    aria-expanded={openInstNav === "placement"}
                    onClick={() => toggleInstDropdown("placement")}
                  >
                    Placement <span className="student-nav-caret" />
                  </button>
                  {openInstNav === "placement" && (
                    <div
                      className="student-nav-dropdown"
                      role="menu"
                      onMouseEnter={() => openInstDropdown("placement")}
                      onMouseLeave={scheduleCloseInstDropdown}
                    >
                      <button
                        type="button"
                        className="student-nav-dropdown-item"
                        onClick={() => goHome("/institutes/placement-access", () => setOpenInstNav(null))}
                      >
                        Placement Access
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => goHome("/about-us")}
                  className="student-nav-link"
                  style={{ padding: "8px 10px" }}
                >
                  About Us
                </button>
              </>
            )}

            {isAuthenticated && user?.userType === "INDUSTRY" && (
              <>
                <div
                  className="student-nav-item"
                  onMouseEnter={() => openIndustryDropdown("talent")}
                  onMouseLeave={scheduleCloseIndustryDropdown}
                >
                  <button
                    type="button"
                    className="student-nav-link"
                    aria-haspopup="menu"
                    aria-expanded={openIndustryNav === "talent"}
                    onClick={() => toggleIndustryDropdown("talent")}
                  >
                    Search Talent <span className="student-nav-caret" />
                  </button>
                  {openIndustryNav === "talent" && (
                    <div
                      className="student-nav-dropdown"
                      role="menu"
                      onMouseEnter={() => openIndustryDropdown("talent")}
                      onMouseLeave={scheduleCloseIndustryDropdown}
                    >
                      <Link
                        to="/manage-applications"
                        className="student-nav-dropdown-item"
                        onClick={() => setOpenIndustryNav(null)}
                      >
                        Post Job
                      </Link>
                      <Link
                        to="/manage-hackathons"
                        className="student-nav-dropdown-item"
                        onClick={() => setOpenIndustryNav(null)}
                      >
                        Post Hackathon
                      </Link>
                      <Link
                        to="/student-database"
                        className="student-nav-dropdown-item"
                        onClick={() => setOpenIndustryNav(null)}
                      >
                        Database Access
                      </Link>
                      <button
                        type="button"
                        className="student-nav-dropdown-item"
                        onClick={() => goHome("/industry/ai-interview", () => setOpenIndustryNav(null))}
                      >
                        Technical AI interview
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => goHome("/industry/role-ready-freshers")}
                  className="student-nav-link"
                  style={{ padding: "8px 10px" }}
                >
                  Role Ready Training
                </button>

                <button
                  type="button"
                  onClick={() => goHome("/industry/expert-session")}
                  className="student-nav-link"
                  style={{ padding: "8px 10px" }}
                >
                  Expert Session
                </button>

                <button
                  type="button"
                  onClick={() => goHome("/about-us")}
                  style={{
                    textDecoration: "none"
                  }}
                  className="student-nav-link"
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
                {showDashboard && !isMobile && (
                  <button
                    type="button"
                    onClick={() => goHome(dashboardPath)}
                    className="student-dashboard-btn"
                  >
                    Dashboard
                  </button>
                )}

                {isHomePage && !isMobile && !isTablet &&
                  user?.userType !== "STUDENT" &&
                  user?.userType !== "APPLICANT" &&
                  user?.userType !== "INSTITUTE" &&
                  user?.userType !== "INDUSTRY" && (
                    <button
                      type="button"
                      onClick={() => goHome("/login/admin")}
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
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Admin
                    </button>
                  )}

                {isHomePage && !isMobile && !isTablet &&
                  user?.userType !== "STUDENT" &&
                  user?.userType !== "APPLICANT" &&
                  user?.userType !== "INSTITUTE" &&
                  user?.userType !== "INDUSTRY" && (
                    <button
                      type="button"
                      onClick={() => goHome("/employer/dashboard")}
                      className="navbar-button-text"
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "10px 20px",
                        background: "#10b981",
                        border: "none",
                        borderRadius: "24px",
                        fontWeight: 500,
                        fontSize: "16px",
                        color: "#FFFFFF",
                        cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Employer
                    </button>
                  )}

                <div ref={userMenuRef} style={{ position: "relative", overflow: "visible" }}>
                  <button
                    type="button"
                    className={isStudent ? "student-user-trigger" : undefined}
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
                    style={isStudent ? undefined : {
                      display: "flex",
                      justifyContent: "flex-start",
                      alignItems: "center",
                      gap: "8px",
                      width: "110px",
                      height: "36px",
                      padding: "0 8px 0 0",
                      background: "transparent",
                      border: "none",
                      borderRadius: "0",
                      fontWeight: 500,
                      fontSize: "14px",
                      color: "#000000",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isStudent ? (
                      <>
                        {studentAvatarSrc ? (
                          <img
                            src={studentAvatarSrc}
                            alt=""
                            className="student-avatar-image"
                          />
                        ) : (
                          <span className="student-avatar" aria-hidden="true">{userAvatarInitials}</span>
                        )}
                        <span>User</span>
                        <span className="student-nav-caret" aria-hidden="true" style={{ marginLeft: 2, borderRightColor: "rgba(17, 24, 39, 0.55)", borderBottomColor: "rgba(17, 24, 39, 0.55)" }} />
                      </>
                    ) : (
                      <span>{userDisplayNameShort}</span>
                    )}
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
                      <button
                        type="button"
                        onClick={() => openProfilePage(() => setShowUserMenu(false))}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "12px 16px",
                          color: "#333333",
                          textDecoration: "none",
                          fontWeight: 500,
                          fontSize: "15px",
                          borderBottom: "1px solid #F3F4F6",
                          background: "none",
                          borderLeft: "none",
                          borderRight: "none",
                          borderTop: "none",
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
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
                {isHomePage && !isMobile && !isTablet && (
                  <button
                    type="button"
                    onClick={() => goHome("/login/admin")}
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "10px 20px",
                      background: "#FFFFFF",
                      border: "1px solid #115FD5",
                      borderRadius: "24px",
                      fontWeight: 500,
                      fontSize: "16px",
                      color: "#115FD5",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Admin
                  </button>
                )}
                {isHomePage && !isMobile && !isTablet && (
                  <button
                    type="button"
                    onClick={() => goHome("/employer/dashboard")}
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "10px 20px",
                      background: "#10b981",
                      border: "none",
                      borderRadius: "24px",
                      fontWeight: 500,
                      fontSize: "16px",
                      color: "#FFFFFF",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Employer
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowUserTypeSelection(true)}
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
            ref={mobileToggleRef}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
            style={{
              display: "none",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: "3px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              width: "34px",
              height: "30px",
              marginLeft: "auto",
            }}
          >
            {isMobileMenuOpen ? (
              <div
                style={{
                  position: "relative",
                  width: "22px",
                  height: "22px",
                  borderRadius: "6px",
                  border: "1.5px solid #115FD5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: "12px",
                    height: "2px",
                    background: "#115FD5",
                    borderRadius: "2px",
                    transform: "rotate(45deg)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    width: "12px",
                    height: "2px",
                    background: "#115FD5",
                    borderRadius: "2px",
                    transform: "rotate(-45deg)",
                  }}
                />
              </div>
            ) : (
              <>
                <div
                  style={{
                    width: "20px",
                    height: "2px",
                    background: "#115FD5",
                    borderRadius: "2px",
                    transition: "all 0.2s ease",
                  }}
                />
                <div
                  style={{
                    width: "20px",
                    height: "2px",
                    background: "#115FD5",
                    borderRadius: "2px",
                    transition: "all 0.2s ease",
                  }}
                />
                <div
                  style={{
                    width: "20px",
                    height: "2px",
                    background: "#115FD5",
                    borderRadius: "2px",
                    transition: "all 0.2s ease",
                  }}
                />
              </>
            )}
          </button>
        </div>

        {/* Mobile drawer */}
        <div
          ref={mobileMenuRef}
          className="navbar-mobile-drawer"
          style={{
            position: "fixed",
            top: isMobile ? "54px" : "58px",
            right: "8px",
            left: "auto",
            bottom: "auto",
            width: "78vw",
            maxWidth: "340px",
            background: "#FFFFFF",
            zIndex: 999,
            overflowY: "visible",
            padding: "10px 14px",
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.25)",
            borderRadius: "12px",
            transform: isMobileMenuOpen ? "translateX(0)" : "translateX(110%)",
            opacity: isMobileMenuOpen ? 1 : 0,
            pointerEvents: isMobileMenuOpen ? "auto" : "none",
            transition: "transform 0.28s ease-out, opacity 0.28s ease-out",
          }}
        >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {!isAuthenticated && (
                <>
                  <button
                    type="button"
                    onClick={() => goHome("/students", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Students
                  </button>
                  <button
                    type="button"
                    onClick={() => goHome("/institutes", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Institutes
                  </button>
                  <button
                    type="button"
                    onClick={() => goHome("/industry", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Industry
                  </button>
                  <button
                    type="button"
                    onClick={() => goHome("/industry/role-ready-freshers", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Role Ready Training
                  </button>
                  <button
                    type="button"
                    onClick={() => goHome("/industry/expert-session", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Expert Session
                  </button>
                  <button
                    type="button"
                    onClick={() => goHome("/about-us", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    About Us
                  </button>
                </>
              )}

              {isStudent && (
                <>
                  <ReviewNotifications variant="menuItem" />
                  <div style={{ padding: "6px 14px 2px", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", fontWeight: 700 }}>
                    Career Tools
                  </div>
                  <button
                    type="button"
                    onClick={() => goHome("/students/job-blueprint", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Job Blueprint
                  </button>
                  <button
                    type="button"
                    onClick={() => goHome("/students/career-counselling", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Career Counselling
                  </button>
                  <div style={{ height: 1, background: "#F3F4F6", margin: "6px 0" }} />
                  <div style={{ padding: "6px 14px 2px", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", fontWeight: 700 }}>
                    Practice
                  </div>
                  <button
                    type="button"
                    onClick={() => goHome("/students/interview-preparation", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Interview Preparation
                  </button>
                  <button
                    type="button"
                    onClick={() => goHome("/students/job-blueprint", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Job Blueprint
                  </button>
                  <div style={{ height: 1, background: "#F3F4F6", margin: "6px 0" }} />
                  <div style={{ padding: "6px 14px 2px", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", fontWeight: 700 }}>
                    Jobs and Hackathons
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      redirectToProfiling(getAuthToken(), user);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#333333",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Hire me Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => goHome("/students/resume-builder", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Resume Builder
                  </button>
                  <button
                    type="button"
                    onClick={() => goHome("/students/career-counselling", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Career Counselling
                  </button>
                  <div style={{ height: 1, background: "#F3F4F6", margin: "6px 0" }} />
                  <div style={{ padding: "6px 14px 2px", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", fontWeight: 700 }}>
                    Practice
                  </div>
                  <button
                    type="button"
                    onClick={() => goHome("/students/interview-preparation", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Interview Preparation
                  </button>
                  <button
                    type="button"
                    onClick={() => goHome("/students/job-blueprint", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Job Blueprint
                  </button>
                  <div style={{ height: 1, background: "#F3F4F6", margin: "6px 0" }} />
                  <div style={{ padding: "6px 14px 2px", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", fontWeight: 700 }}>
                    Jobs and Hackathons
                  </div>
                  <Link
                    to="/apply-jobs"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#333333",
                      fontSize: "13px",
                      cursor: "pointer",
                      textDecoration: "none",
                      display: "block",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Apply to Jobs and Hackathons
                  </Link>

                  <button
                    type="button"
                    onClick={() => goHome("/about-us", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    About Us
                  </button>
                </>
              )}

              {isInstitute && (
                <>
                  {/* Learning group */}
                  <div style={{ padding: "6px 14px 2px", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", fontWeight: 700 }}>Learning</div>
                  <button type="button" onClick={() => goHome("/institutes/workshops", () => setIsMobileMenuOpen(false))} style={{ padding: "6px 10px 6px 18px", borderRadius: "8px", textDecoration: "none", color: "#333333", fontSize: "13px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "'Inter', sans-serif", width: "100%" }}>
                    Workshops
                  </button>
                  <button type="button" onClick={() => goHome("/institutes/expert-session", () => setIsMobileMenuOpen(false))} style={{ padding: "6px 10px 6px 18px", borderRadius: "8px", textDecoration: "none", color: "#333333", fontSize: "13px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "'Inter', sans-serif", width: "100%" }}>
                    Expert Session
                  </button>

                  {/* Training group */}
                  <div style={{ padding: "6px 14px 2px", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginTop: "4px" }}>Training</div>
                  <button type="button" onClick={() => goHome("/institutes/internship-management", () => setIsMobileMenuOpen(false))} style={{ padding: "6px 10px 6px 18px", borderRadius: "8px", textDecoration: "none", color: "#333333", fontSize: "13px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "'Inter', sans-serif", width: "100%" }}>
                    Student Training
                  </button>
                  <button type="button" onClick={() => goHome("/institutes/trainings", () => setIsMobileMenuOpen(false))} style={{ padding: "6px 10px 6px 18px", borderRadius: "8px", textDecoration: "none", color: "#333333", fontSize: "13px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "'Inter', sans-serif", width: "100%" }}>
                    Role Ready Training
                  </button>

                  {/* Placement group */}
                  <div style={{ padding: "6px 14px 2px", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginTop: "4px" }}>Placement</div>
                  <button type="button" onClick={() => goHome("/institutes/placement-access", () => setIsMobileMenuOpen(false))} style={{ padding: "6px 10px 6px 18px", borderRadius: "8px", textDecoration: "none", color: "#333333", fontSize: "13px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "'Inter', sans-serif", width: "100%" }}>
                    Placement Access
                  </button>

                  <button type="button" onClick={() => goHome("/about-us", () => setIsMobileMenuOpen(false))} style={{ padding: "6px 10px", borderRadius: "8px", textDecoration: "none", color: "#333333", fontSize: "13px", marginTop: "4px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "'Inter', sans-serif", width: "100%" }}>
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
                      padding: "6px 10px",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#333333",
                      fontSize: "13px",
                      cursor: "pointer",
                      textDecoration: "none",
                      display: "block",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Post Job
                  </Link>
                  <Link
                    to="/manage-hackathons"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: "#333333",
                      fontSize: "13px",
                      cursor: "pointer",
                      textDecoration: "none",
                      display: "block",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Post Hackathon
                  </Link>
                  <Link
                    to="/student-database"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      cursor: "pointer",
                      border: "none",
                      background: "none",
                      textAlign: "left",
                      width: "100%",
                      fontFamily: "'Inter', sans-serif",
                      display: "block",
                    }}
                  >
                    Database Access
                  </Link>
                  <button
                    type="button"
                    onClick={() => goHome("/industry/ai-interview", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                      width: "100%",
                    }}
                  >
                    Technical AI interview
                  </button>
                  <button
                    type="button"
                    onClick={() => goHome("/about-us", () => setIsMobileMenuOpen(false))}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333333",
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                      width: "100%",
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
                  gap: '6px',
                  marginTop: '6px',
                  paddingTop: '6px',
                  borderTop: '1px solid #F3F4F6'
                }}
              >
                {isAuthenticated ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openProfilePage(() => setIsMobileMenuOpen(false))}
                      style={{
                        width: "100%",
                        padding: '8px 12px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: '#333333',
                        fontWeight: '500',
                        fontSize: '14px',
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      Profile
                    </button>

                    {showDashboard && (
                      <button
                        type="button"
                        className="student-dashboard-btn"
                        onClick={() => goHome(dashboardPath, () => setIsMobileMenuOpen(false))}
                        style={{ width: '100%', marginTop: '4px' }}
                      >
                        Dashboard
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: '24px',
                        fontWeight: 500,
                        fontSize: '14px',
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
                    {isHomePage &&
                      user?.userType !== "STUDENT" &&
                      user?.userType !== "APPLICANT" &&
                      user?.userType !== "INSTITUTE" &&
                      user?.userType !== "INDUSTRY" && (
                        <button
                          type="button"
                          onClick={() => goHome("/login/admin", () => setIsMobileMenuOpen(false))}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: '#FFFFFF',
                            border: '1px solid #115FD5',
                            borderRadius: '24px',
                            fontWeight: 500,
                            fontSize: '14px',
                            color: '#115FD5',
                            cursor: 'pointer',
                            fontFamily: "'Inter', sans-serif"
                          }}
                        >
                          Admin
                        </button>
                      )}

                    <button
                      onClick={() => {
                        setShowUserTypeSelection(true);
                        setIsMobileMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#115FD5',
                        border: 'none',
                        borderRadius: '24px',
                        fontWeight: 500,
                        fontSize: '14px',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif"
                      }}
                    >
                      Get Started
                    </button>

                    {isHomePage &&
                      user?.userType !== "STUDENT" &&
                      user?.userType !== "APPLICANT" &&
                      user?.userType !== "INSTITUTE" &&
                      user?.userType !== "INDUSTRY" && (
                        <button
                          type="button"
                          onClick={() => goHome("/employer/dashboard", () => setIsMobileMenuOpen(false))}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: '#10b981',
                            border: 'none',
                            borderRadius: '24px',
                            fontWeight: 500,
                            fontSize: '14px',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            fontFamily: "'Inter', sans-serif"
                          }}
                        >
                          Employer
                        </button>
                      )}
                  </>
                )}
              </div>
            </div>
          </div>

        {showUserTypeSelection && (
          <UserTypeSelection
            onClose={() => setShowUserTypeSelection(false)}
          />
        )}
      </nav>
    </>
  );
};

export default Navbar;


