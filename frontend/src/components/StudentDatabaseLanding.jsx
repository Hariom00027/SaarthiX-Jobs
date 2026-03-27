import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { redirectToSomethingX } from '../config/redirectUrls';
import { logout } from '../api/authApi';
import { getAllStudents } from '../api/studentDatabaseApi';
import LogoImage from './logo_png.png';

/* —— Design tokens (match SaarthiX marketing mockup) —— */
const BLUE = '#337ab7';
const NAV_TEXT = '#333333';
const HEADING = '#1a1a1a';
const BODY_GREY = '#666666';
const LOGO_WORD = '#0D47A1';
const SECTION_BG = '#e8eef4';
const SECTION_TITLE = '#1a2744';
const CARD_BORDER = '#dcdee2';
const LINE_GREY = '#d1d5db';

/* Hero background — public/download (2) 1.png. Stack: white → image → pale tint (Figma) */
const HERO_IMG = `${import.meta.env.BASE_URL}database-hero-bg.png`;
const BTECH_ICON_IMG = `${import.meta.env.BASE_URL}computer-businessman-icon%201.png`;
const MCA_ICON_IMG = `${import.meta.env.BASE_URL}programmer-computer-icon%201.png`;
const BSC_ICON_IMG = `${import.meta.env.BASE_URL}atom-laboratory-science-icon%201.png`;
const AGRI_ICON_IMG = `${import.meta.env.BASE_URL}python-logo-png_seeklogo-480570.png`;
const MBBS_ICON_IMG = `${import.meta.env.BASE_URL}Screenshot%202026-03-27%20145331.png`;
const HEADING_2_IMG = `${import.meta.env.BASE_URL}Heading%202.png`;
const HERO_BASE_WHITE = '#ffffff';
/** Top layer (drawn above image): soft white + brand pale blue so text matches Figma */
const HERO_COLOR_OVERLAY = `linear-gradient(
  180deg,
  rgba(255, 255, 255, 0.55) 0%,
  rgba(255, 255, 255, 0.22) 32%,
  rgba(240, 249, 255, 0.38) 58%,
  rgba(232, 238, 244, 0.5) 100%
)`;
/** Figma headline: #0F1724, alpha C7 (199/255) */
const HERO_TITLE_COLOR = `rgba(15, 23, 36, ${199 / 255})`;
const HERO_SUB = '#666666';
const HELPER_GREY = '#999999';
/** Figma hero strip height (full-bleed width) */
const HERO_BANNER_H = 303;

function MultiSelectPopupInput({
  label,
  placeholder,
  options,
  values,
  onChange,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onDocClick = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const normalizedValues = values.map((v) => String(v || '').trim().toLowerCase());
  const availableOptions = options.filter((opt) => !normalizedValues.includes(String(opt).trim().toLowerCase()));
  const filteredOptions = query
    ? availableOptions.filter((opt) => String(opt).toLowerCase().includes(query.toLowerCase()))
    : availableOptions;

  const addValue = (value) => {
    const next = String(value || '').trim();
    if (!next) return;
    const exists = values.some((v) => String(v).trim().toLowerCase() === next.toLowerCase());
    if (!exists) onChange([...values, next]);
    setQuery('');
    setOpen(true);
  };

  const removeValue = (value) => {
    onChange(values.filter((v) => v !== value));
  };

  return (
    <div ref={wrapRef} className="relative">
      {label ? <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label> : null}
      <div
        className="w-full min-h-[46px] rounded-lg border border-gray-300 bg-white px-2 py-1.5 focus-within:border-[#337ab7] focus-within:ring-2 focus-within:ring-[#337ab7]/20"
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {values.map((value) => (
            <span key={value} className="inline-flex items-center gap-1 rounded-md bg-blue-100 text-blue-800 px-2 py-0.5 text-xs">
              {value}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeValue(value);
                }}
                className="text-blue-700 hover:text-blue-900"
                aria-label={`Remove ${value}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                e.preventDefault();
                addValue(query);
              } else if (e.key === 'Backspace' && !query && values.length > 0) {
                onChange(values.slice(0, -1));
              }
            }}
            placeholder={values.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] border-0 bg-transparent text-sm outline-none"
          />
        </div>
      </div>
      {open && filteredOptions.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-44 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filteredOptions.slice(0, 80).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => addValue(option)}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronDown({ className }) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke={NAV_TEXT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NavItem({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 border-0 bg-transparent p-0"
      style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        fontSize: '16px',
        lineHeight: '24px',
        color: NAV_TEXT,
        cursor: 'pointer',
      }}
    >
      {label}
      <ChevronDown className="shrink-0 opacity-90" />
    </button>
  );
}

function IconBTech() {
  return (
    <img
      src={BTECH_ICON_IMG}
      alt=""
      aria-hidden
      className="h-[90px] w-[81px] object-contain"
      style={{ opacity: 1 }}
    />
  );
}

function IconMCA() {
  return (
    <img
      src={MCA_ICON_IMG}
      alt=""
      aria-hidden
      className="h-[90px] w-[81px] object-contain"
      style={{ opacity: 1 }}
    />
  );
}

function IconBSc() {
  return (
    <img
      src={BSC_ICON_IMG}
      alt=""
      aria-hidden
      className="h-[84px] w-[88px] object-contain"
      style={{ opacity: 1 }}
    />
  );
}

function IconAgri() {
  return (
    <img
      src={AGRI_ICON_IMG}
      alt=""
      aria-hidden
      className="h-[84px] w-[95px] object-contain"
      style={{ opacity: 1 }}
    />
  );
}

function IconMBBS() {
  return (
    <img
      src={MBBS_ICON_IMG}
      alt=""
      aria-hidden
      className="h-[84px] w-[95px] object-contain"
      style={{ opacity: 1 }}
    />
  );
}

function StepIconTarget() {
  return (
    <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

function StepIconBulb() {
  return (
    <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 21h6M12 3a5 5 0 00-3 9c0 2 1 3.5 1 5h4c0-1.5 1-3 1-5a5 5 0 00-3-9z" />
    </svg>
  );
}

function StepIconHandshake() {
  return (
    <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M11 14h-1l-4-4V9M7 14v3l3 3 5-5M13 14h1l4-4V9M17 14v3l-3 3-5-5"
      />
    </svg>
  );
}

const categories = [
  { id: 'default-btech', label: 'B.Tech', Icon: IconBTech, filterKey: 'keyword', filterValue: 'B.Tech' },
  { id: 'default-mca', label: 'MCA', Icon: IconMCA, filterKey: 'keyword', filterValue: 'MCA' },
  { id: 'default-bsc', label: 'B.Sc', Icon: IconBSc, filterKey: 'keyword', filterValue: 'B.Sc' },
  { id: 'default-agri', label: 'Python', Icon: IconAgri, filterKey: 'skills', filterValue: 'Python' },
  { id: 'default-mbbs', label: 'Software Development', Icon: IconMBBS, filterKey: 'roles', filterValue: 'Software Development' },
];

const shortcutFilterOptions = [
  { value: 'keyword', label: 'Keyword' },
  { value: 'degree', label: 'Degree' },
  { value: 'specialization', label: 'Specialization / Stream' },
  { value: 'skills', label: 'Skills' },
  { value: 'roles', label: 'Roles' },
  { value: 'location', label: 'Location' },
  { value: 'college', label: 'College' },
  { value: 'gender', label: 'Gender' },
  { value: 'experience', label: 'Experience' },
  { value: 'graduationYear', label: 'Graduation Year' },
  { value: 'availability', label: 'Availability' },
];
const SHORTCUT_CARDS_STORAGE_KEY = 'student_database_shortcut_cards_v1';
const HIDDEN_DEFAULT_CARDS_STORAGE_KEY = 'student_database_hidden_default_cards_v1';

/**
 * Full marketing first screen for /student-database (matches SaarthiX mockup).
 */
export default function StudentDatabaseLanding({ onEnterDatabase }) {
  const MULTI_VALUE_SEPARATOR = '||';
  const navigate = useNavigate();
  const { user, clearAuth } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [accessForm, setAccessForm] = useState({
    location: '',
    degree: '',
    specialization: '',
    roles: '',
    gender: '',
    college: '',
    gradingType: '',
    gradingValue: '',
    graduationYear: '',
    experience: '',
  });
  const [formOptions, setFormOptions] = useState({
    locations: [],
    degrees: [],
    specializations: [],
    roles: [],
    genders: [],
    colleges: [],
    graduationYears: [],
    experiences: [],
  });
  const [customShortcutCards, setCustomShortcutCards] = useState([]);
  const [hiddenDefaultCardIds, setHiddenDefaultCardIds] = useState([]);
  const [showShortcutBuilder, setShowShortcutBuilder] = useState(false);
  const [shortcutDraft, setShortcutDraft] = useState({
    filterKey: 'keyword',
    filterValue: '',
    cardLabel: '',
  });
  const toMultiValues = (value) =>
    String(value || '')
      .split(MULTI_VALUE_SEPARATOR)
      .map((item) => item.trim())
      .filter(Boolean);
  const fromMultiValues = (arr) => arr.join(MULTI_VALUE_SEPARATOR);
  const userMenuRef = useRef(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('somethingx_auth_token') || localStorage.getItem('token') : null;
  const sxUserStr = typeof window !== 'undefined' ? localStorage.getItem('somethingx_auth_user') : null;
  let sxUser = null;
  try {
    sxUser = sxUserStr ? JSON.parse(sxUserStr) : null;
  } catch {
    sxUser = null;
  }
  const displayUser = user || sxUser;
  const displayName = displayUser?.name || displayUser?.email || 'User';
  const picture = displayUser?.picture || displayUser?.profilePictureUrl || '';

  useEffect(() => {
    const close = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setShowAccessForm(false);
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SHORTCUT_CARDS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter((item) => item && item.id && item.label && item.filterKey && item.filterValue)
          .map((item) => ({
            id: String(item.id),
            label: String(item.label),
            filterKey: String(item.filterKey),
            filterValue: String(item.filterValue),
          }));
        setCustomShortcutCards(normalized);
      }
    } catch {
      // ignore malformed local data
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_DEFAULT_CARDS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setHiddenDefaultCardIds(parsed.map((item) => String(item)));
      }
    } catch {
      // ignore malformed local data
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SHORTCUT_CARDS_STORAGE_KEY, JSON.stringify(customShortcutCards));
    } catch {
      // ignore storage errors
    }
  }, [customShortcutCards]);

  useEffect(() => {
    try {
      localStorage.setItem(HIDDEN_DEFAULT_CARDS_STORAGE_KEY, JSON.stringify(hiddenDefaultCardIds));
    } catch {
      // ignore storage errors
    }
  }, [hiddenDefaultCardIds]);

  useEffect(() => {
    let isMounted = true;

    const getUniqueSorted = (values) =>
      Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );
    const getRoleValues = (student) => {
      const roles = [];
      const pushRole = (value) => {
        const next = String(value || '').trim();
        if (next) roles.push(next);
      };
      pushRole(student?.currentPosition);
      if (Array.isArray(student?.professionalExperiences)) {
        student.professionalExperiences.forEach((exp) => pushRole(exp?.jobTitle));
      }
      return roles;
    };

    const loadOptions = async () => {
      try {
        const response = await getAllStudents({});
        const students = response?.students || [];

        const locations = [];
        const degrees = [];
        const specializations = [];
        const roles = [];
        const genders = [];
        const colleges = [];
        const graduationYears = [];
        const experiences = [];

        students.forEach((student) => {
          if (student.currentLocation) locations.push(student.currentLocation);
          if (student.degree) degrees.push(student.degree);
          if (student.specialization) specializations.push(student.specialization);
          roles.push(...getRoleValues(student));
          if (student.gender) genders.push(student.gender);
          if (student.institution) colleges.push(student.institution);
          if (student.graduationYear) graduationYears.push(student.graduationYear);
          if (student.experience !== undefined && student.experience !== null) experiences.push(student.experience);

          if (Array.isArray(student.educationEntries)) {
            student.educationEntries.forEach((edu) => {
              if (edu?.degree) degrees.push(edu.degree);
              if (edu?.level) degrees.push(edu.level);
              if (edu?.stream) specializations.push(edu.stream);
              if (edu?.specialization) specializations.push(edu.specialization);
              if (edu?.institution) colleges.push(edu.institution);
              if (edu?.collegeName) colleges.push(edu.collegeName);
              if (edu?.passingYear) graduationYears.push(edu.passingYear);
              if (edu?.graduationYear) graduationYears.push(edu.graduationYear);
            });
          }
        });

        if (isMounted) {
          setFormOptions({
            locations: getUniqueSorted(locations),
            degrees: getUniqueSorted(degrees),
            specializations: getUniqueSorted(specializations),
            roles: getUniqueSorted(roles),
            genders: getUniqueSorted(genders),
            colleges: getUniqueSorted(colleges),
            graduationYears: getUniqueSorted(graduationYears),
            experiences: getUniqueSorted(experiences),
          });
        }
      } catch (error) {
        // Keep popup usable even if options API fails.
        if (isMounted) {
          setFormOptions({
            locations: [],
            degrees: [],
            specializations: [],
            roles: [],
            genders: [],
            colleges: [],
            graduationYears: [],
            experiences: [],
          });
        }
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const goSx = (route) => {
    redirectToSomethingX(route, token, displayUser);
  };

  const handleDashboard = () => {
    const userType = displayUser?.userType;
    const dashboardPath = userType === 'INSTITUTE' ? '/institutes/dashboard' : '/dashboard';
    goSx(dashboardPath);
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout(clearAuth);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    onEnterDatabase({ keyword: searchInput.trim() });
  };

  const handleViewMore = () => {
    setShowAccessForm(true);
  };

  const handleCategoryClick = (card) => {
    onEnterDatabase({ [card.filterKey || 'keyword']: card.filterValue || card.label });
  };

  const getOptionsForShortcutFilter = (filterKey) => {
    switch (filterKey) {
      case 'degree':
        return formOptions.degrees;
      case 'specialization':
        return formOptions.specializations;
      case 'skills':
        return formOptions.specializations.length > 0 ? formOptions.specializations : [];
      case 'roles':
        return formOptions.roles;
      case 'location':
        return formOptions.locations;
      case 'college':
        return formOptions.colleges;
      case 'gender':
        return formOptions.genders;
      case 'experience':
        return formOptions.experiences;
      case 'graduationYear':
        return formOptions.graduationYears;
      default:
        return [];
    }
  };

  const handleCreateShortcutCard = (e) => {
    e.preventDefault();
    const filterValue = shortcutDraft.filterValue.trim();
    if (!filterValue) return;

    const key = shortcutDraft.filterKey;
    const cardLabel = shortcutDraft.cardLabel.trim() || filterValue;

    setCustomShortcutCards((prev) => [
      ...prev,
      {
        id: `${key}-${filterValue}-${Date.now()}`,
        label: cardLabel,
        filterKey: key,
        filterValue,
      },
    ]);

    setShortcutDraft({
      filterKey: 'keyword',
      filterValue: '',
      cardLabel: '',
    });
    setShowShortcutBuilder(false);
  };

  const handleCustomShortcutClick = (card) => {
    onEnterDatabase({ [card.filterKey]: card.filterValue });
  };

  const handleRemoveCustomShortcutCard = (cardId) => {
    setCustomShortcutCards((prev) => prev.filter((card) => card.id !== cardId));
  };

  const handleRemoveDefaultCard = (cardId) => {
    setHiddenDefaultCardIds((prev) => (prev.includes(cardId) ? prev : [...prev, cardId]));
  };

  const visibleDefaultCards = categories.filter((card) => !hiddenDefaultCardIds.includes(card.id));

  const handleAccessFormChange = (key, value) => {
    setAccessForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAccessFormSubmit = (e) => {
    e.preventDefault();
    onEnterDatabase(accessForm);
  };

  const handleSkipForNow = () => {
    onEnterDatabase({});
  };

  return (
    <div
      className="min-h-screen bg-white antialiased"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* —— Header —— */}
      <header
        className="sticky top-0 z-50 border-b bg-white"
        style={{ borderBottomColor: '#eeeeee', borderBottomWidth: '1px' }}
      >
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-4 px-5 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex shrink-0 items-end gap-0.5 border-0 bg-transparent p-0"
            aria-label="SaarthiX home"
          >
            <img src={LogoImage} alt="" className="block h-9 w-auto object-contain" />
            <span
              style={{
                fontFamily: "'Times New Roman', Times, serif",
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: '22px',
                lineHeight: 1,
                color: LOGO_WORD,
                paddingBottom: '2px',
              }}
            >
              SaarthiX
            </span>
          </button>

          <nav
            className="flex min-w-0 max-w-[42vw] flex-1 justify-start gap-5 overflow-x-auto overflow-y-hidden py-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-none sm:justify-center md:gap-8 lg:gap-10 [&::-webkit-scrollbar]:hidden"
            aria-label="Primary"
          >
            <NavItem label="Search Talent" onClick={() => goSx('/students')} />
            <NavItem label="Role Ready Training" onClick={() => goSx('/students/job-blueprint')} />
            <NavItem label="Expert Session" onClick={() => goSx('/about-us')} />
            <NavItem label="About Us" onClick={() => goSx('/about-us')} />
          </nav>

          <div className="flex shrink-0 items-center gap-3 lg:gap-4">
            <button
              type="button"
              onClick={handleDashboard}
              className="rounded-lg border-0 px-5 py-2.5 text-[16px] font-medium text-white shadow-sm transition hover:brightness-[1.03]"
              style={{ backgroundColor: BLUE, boxShadow: '0 1px 2px rgba(51, 122, 183, 0.25)' }}
            >
              Dashboard
            </button>

            <div className="relative flex items-center gap-2" ref={userMenuRef}>
              {picture ? (
                <img src={picture} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5" />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ring-1 ring-black/5"
                  style={{ backgroundColor: BLUE }}
                >
                  {(displayName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="inline-flex items-center gap-1 border-0 bg-transparent p-0"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: '16px',
                  color: NAV_TEXT,
                  cursor: 'pointer',
                }}
              >
                User
                <ChevronDown className="shrink-0" />
              </button>
              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full z-[60] mt-2 min-w-[160px] rounded-lg border bg-white py-1 shadow-lg"
                  style={{ borderColor: CARD_BORDER }}
                >
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* —— Hero: edge-to-edge under header (no top / left / right outer padding) —— */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: `${HERO_BANNER_H}px`,
          backgroundColor: HERO_BASE_WHITE,
          backgroundImage: `${HERO_COLOR_OVERLAY}, url(${HERO_IMG})`,
          backgroundSize: 'cover, cover',
          backgroundPosition: 'center, center',
          backgroundRepeat: 'no-repeat, no-repeat',
        }}
      >
        <div className="relative z-[1] flex h-full w-full flex-col items-center justify-center px-3 text-center sm:px-6">
          <h1
            className="mx-auto flex w-full max-w-[739.3px] flex-col justify-center text-center md:min-h-[124px]"
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 800,
              fontStyle: 'normal',
              fontSize: 'clamp(22px, 4.25vw, 56px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: HERO_TITLE_COLOR,
            }}
          >
            <span className="block">This is not about volume.</span>
            <span className="block">It is about the right match.</span>
          </h1>
          <p
            className="mx-auto mt-2 max-w-[979px] px-1 text-center sm:mt-2.5 lg:mt-3"
            style={{
              opacity: 1,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 400,
              fontStyle: 'normal',
              fontSize: 'clamp(14px, 1.8vw, 20px)',
              lineHeight: '32px',
              letterSpacing: '0px',
              textAlign: 'center',
              color: '#29292A',
            }}
          >
            We actually verify every profile so that you can hire with confidence, and students can work with trust.
          </p>
          <p
            className="mx-auto mt-2 max-w-[834px] px-1 text-center sm:mt-2.5 lg:mt-3"
            style={{
              width: 'min(834px, 100%)',
              minHeight: '44px',
              opacity: 1,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 700,
              fontStyle: 'normal',
              fontSize: 'clamp(24px, 4vw, 36px)',
              lineHeight: '100%',
              letterSpacing: '-0.72px',
              verticalAlign: 'middle',
              background: 'linear-gradient(90deg, #1B76F8 0%, #FF2007 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}
          >
            Actual Companies. Actual Students. No Fluff.
          </p>
        </div>
      </div>

      <section className="bg-white px-4 pb-[4.5rem] pt-10 sm:pb-24 sm:pt-12 lg:pb-32 lg:pt-14">
        <div className="relative mx-auto max-w-[720px]">
          <form
            onSubmit={handleSearch}
            className="mx-auto flex h-[58px] w-full max-w-[720px] items-stretch overflow-hidden bg-white"
            style={{
              opacity: 1,
              borderRadius: '11px',
              border: '1px solid #00000014',
              boxShadow: '0px 12px 32px 0px #0000000D',
            }}
          >
            <span className="flex items-center pl-5 text-[#9ca3af]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Candidate"
              className="min-w-0 flex-1 border-0 bg-transparent py-[0.95rem] pl-3 pr-3 text-[15px] outline-none ring-0 placeholder:text-[#9ca3af]"
              style={{ color: HEADING, fontFamily: "'Inter', system-ui, sans-serif" }}
            />
            <button
              type="submit"
              className="m-1 shrink-0 text-[15px] font-semibold text-white transition hover:brightness-[1.02]"
              style={{
                width: '91px',
                height: '45px',
                opacity: 1,
                borderRadius: '9px',
                background: '#3170A5',
                border: '1px solid #000000',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Search
            </button>
          </form>
          <p
            className="mx-auto mt-4 max-w-[722px] px-1 text-center"
            style={{
              width: 'min(722px, 100%)',
              minHeight: '32px',
              opacity: 1,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 400,
              fontStyle: 'normal',
              fontSize: 'clamp(14px, 1.8vw, 20px)',
              lineHeight: '32px',
              letterSpacing: '0px',
              textAlign: 'center',
              verticalAlign: 'middle',
              color: '#29292A96',
              whiteSpace: 'nowrap',
              overflowWrap: 'normal',
              wordBreak: 'keep-all',
            }}
          >
            {'Track\u00A0your\u00A0team\u00A0without\u00A0the\u00A0headache.\u00A0See\u00A0the\u00A0progress.\u00A0Keep\u00A0showing\u00A0up.'}
          </p>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => onEnterDatabase({ shortlisted: 'true' })}
              className="inline-flex items-center gap-2 rounded-lg border border-[#337ab7]/30 bg-white px-5 py-2 text-sm font-medium text-[#337ab7] transition hover:bg-[#337ab7]/5"
            >
              See Shortlisted Students
            </button>
          </div>
        </div>

        <div className="relative mx-auto mt-12 max-w-[1100px] sm:mt-14 lg:mt-16">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 md:gap-5">
            {visibleDefaultCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => handleCategoryClick(card)}
                className="group relative flex h-[147px] w-[180px] flex-col items-center justify-start rounded-[6px] bg-white px-3 pt-4 pb-3 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#337ab7]/40"
                style={{
                  opacity: 1,
                  border: '1px solid #00000024',
                }}
              >
                <span className="absolute right-2 top-2">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveDefaultCard(card.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveDefaultCard(card.id);
                      }
                    }}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600"
                    aria-label={`Remove ${card.label}`}
                    title="Remove card"
                  >
                    ×
                  </span>
                </span>
                <div className="mt-1 flex h-[90px] w-[81px] items-center justify-center grayscale">
                  <card.Icon />
                </div>
                <span
                  className="mt-2 text-center text-[15px] font-medium leading-tight"
                  style={{ color: BODY_GREY, fontFamily: "'Inter', system-ui, sans-serif" }}
                >
                  {card.label}
                </span>
              </button>
            ))}
            {customShortcutCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => handleCustomShortcutClick(card)}
                className="group relative flex h-[147px] w-[180px] flex-col items-center justify-start rounded-[6px] bg-white px-3 pt-4 pb-3 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#337ab7]/40"
                style={{
                  opacity: 1,
                  border: '1px solid #00000024',
                }}
                title={`${card.filterKey}: ${card.filterValue}`}
              >
                <span className="absolute right-2 top-2">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCustomShortcutCard(card.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveCustomShortcutCard(card.id);
                      }
                    }}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600"
                    aria-label={`Remove ${card.label}`}
                    title="Remove card"
                  >
                    ×
                  </span>
                </span>
                <svg className="mt-1 h-[90px] w-[81px] text-gray-500 group-hover:text-[#337ab7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span
                  className="mt-2 text-center text-[15px] font-medium leading-tight"
                  style={{ color: BODY_GREY, fontFamily: "'Inter', system-ui, sans-serif" }}
                >
                  {card.label}
                </span>
                <span className="mt-0.5 text-[10px] text-gray-400 uppercase tracking-wide">
                  {card.filterKey}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowShortcutBuilder(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Filter Shortcut Card
              </button>
              {hiddenDefaultCardIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHiddenDefaultCardIds([])}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Restore Default Cards
                </button>
              )}
            </div>
          </div>
          <div className="mt-10 flex justify-center sm:mt-12">
            <button
              type="button"
              onClick={handleViewMore}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg px-9 py-3 text-[15px] font-semibold text-white transition hover:bg-neutral-900"
              style={{
                backgroundColor: '#111111',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              View More
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {showShortcutBuilder && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/45 px-4 py-6"
          onClick={() => setShowShortcutBuilder(false)}
        >
          <div
            className="w-full max-w-[520px] rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Create filter shortcut card</h3>
            <p className="mt-1 text-sm text-gray-500">Choose any filter and value. The card will open table with that filter applied instantly.</p>

            <form onSubmit={handleCreateShortcutCard} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Filter type</label>
                <select
                  value={shortcutDraft.filterKey}
                  onChange={(e) => setShortcutDraft((prev) => ({ ...prev, filterKey: e.target.value, filterValue: '' }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#337ab7] focus:ring-2 focus:ring-[#337ab7]/20"
                >
                  {shortcutFilterOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Filter value</label>
                <input
                  type="text"
                  list="shortcut-filter-values"
                  value={shortcutDraft.filterValue}
                  onChange={(e) => setShortcutDraft((prev) => ({ ...prev, filterValue: e.target.value }))}
                  placeholder="Select or type filter value"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#337ab7] focus:ring-2 focus:ring-[#337ab7]/20"
                  required
                />
                <datalist id="shortcut-filter-values">
                  {getOptionsForShortcutFilter(shortcutDraft.filterKey).map((opt) => (
                    <option key={`${shortcutDraft.filterKey}-${opt}`} value={opt} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Card label (optional)</label>
                <input
                  type="text"
                  value={shortcutDraft.cardLabel}
                  onChange={(e) => setShortcutDraft((prev) => ({ ...prev, cardLabel: e.target.value }))}
                  placeholder="Example: Data Science Freshers"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#337ab7] focus:ring-2 focus:ring-[#337ab7]/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShortcutBuilder(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-[#337ab7] px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* —— Hiring clarity —— */}
      <section
        className="mx-auto mt-1 max-w-[1360px] rounded-[8px] border px-4 py-10 sm:py-12"
        style={{ backgroundColor: SECTION_BG, borderColor: '#d9b4c2' }}
      >
        <div className="mx-auto max-w-[1000px] text-center">
          <img
            src={HEADING_2_IMG}
            alt="A Hiring Interface Built for Clarity"
            className="mx-auto object-contain"
            style={{
              width: 'min(1344px, 100%)',
              height: '44px',
              opacity: 1,
            }}
          />

          <div className="relative mx-auto mt-8 max-w-[880px]">
            <div
              className="absolute left-[12%] right-[12%] top-[22px] hidden h-px md:block"
              style={{ backgroundColor: '#c8d4df' }}
              aria-hidden
            />
            <div className="grid gap-10 md:grid-cols-3 md:gap-8">
              {[
                {
                  title: 'Define Scope',
                  body: 'Get your project requirements in minutes.',
                  Icon: StepIconTarget,
                },
                {
                  title: 'Review Talent',
                  body: 'Make comparisons from profiles based on data that has been verified.',
                  Icon: StepIconBulb,
                },
                {
                  title: 'Agree on the Plan',
                  body: 'Both sides agree on the details so that there are no surprises.',
                  Icon: StepIconHandshake,
                },
              ].map(({ title, body, Icon }) => (
                <div key={title} className="relative flex flex-col items-center text-center">
                  <div
                    className="relative z-10 flex h-[44px] w-[44px] items-center justify-center rounded-full"
                    style={{
                      backgroundColor: BLUE,
                      boxShadow: '0 1px 4px rgba(51, 122, 183, 0.25)',
                    }}
                  >
                    <Icon />
                  </div>
                  <h3
                    className="mt-5 text-[28px] font-bold leading-none"
                    style={{ color: SECTION_TITLE, fontFamily: "'Inter', system-ui, sans-serif" }}
                  >
                    {title}
                  </h3>
                  <p
                    className="mt-1 max-w-[280px] text-[14px] leading-[1.35]"
                    style={{ color: BODY_GREY, fontFamily: "'Inter', system-ui, sans-serif" }}
                  >
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {showAccessForm && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6"
          onClick={() => setShowAccessForm(false)}
        >
          <div
            className="w-full max-w-[620px] rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleAccessFormSubmit} className="space-y-4">
              <div className="text-xs text-gray-500">
                Tip: Choose values from the list; each selection appears as a removable chip.
              </div>
              <div className="grid grid-cols-1 gap-3">
                <MultiSelectPopupInput
                  placeholder="Select your location"
                  options={formOptions.locations}
                  values={toMultiValues(accessForm.location)}
                  onChange={(next) => handleAccessFormChange('location', fromMultiValues(next))}
                />
                <MultiSelectPopupInput
                  placeholder="Select degree"
                  options={formOptions.degrees}
                  values={toMultiValues(accessForm.degree)}
                  onChange={(next) => handleAccessFormChange('degree', fromMultiValues(next))}
                />
                <MultiSelectPopupInput
                  placeholder="Select specialization"
                  options={formOptions.specializations}
                  values={toMultiValues(accessForm.specialization)}
                  onChange={(next) => handleAccessFormChange('specialization', fromMultiValues(next))}
                />
                <MultiSelectPopupInput
                  placeholder="Select role"
                  options={formOptions.roles}
                  values={toMultiValues(accessForm.roles)}
                  onChange={(next) => handleAccessFormChange('roles', fromMultiValues(next))}
                />
              </div>

              <div className="pt-1">
                <MultiSelectPopupInput
                  label="Gender"
                  placeholder="Select gender"
                  options={formOptions.genders}
                  values={toMultiValues(accessForm.gender)}
                  onChange={(next) => handleAccessFormChange('gender', fromMultiValues(next))}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-gray-200 pt-4">
                <MultiSelectPopupInput
                  placeholder="Select college name"
                  options={formOptions.colleges}
                  values={toMultiValues(accessForm.college)}
                  onChange={(next) => handleAccessFormChange('college', fromMultiValues(next))}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_1fr]">
                  <select
                    value={accessForm.gradingType}
                    onChange={(e) => handleAccessFormChange('gradingType', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#337ab7] focus:ring-2 focus:ring-[#337ab7]/20"
                  >
                    <option value="">Grading Type</option>
                    <option value="percentage">Percentage</option>
                    <option value="cgpa">CGPA</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={accessForm.gradingValue}
                    onChange={(e) => handleAccessFormChange('gradingValue', e.target.value)}
                    placeholder={accessForm.gradingType === 'cgpa' ? '8.5' : '78'}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#337ab7] focus:ring-2 focus:ring-[#337ab7]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-gray-200 pt-4">
                <MultiSelectPopupInput
                  placeholder="Select year of graduation"
                  options={formOptions.graduationYears}
                  values={toMultiValues(accessForm.graduationYear)}
                  onChange={(next) => handleAccessFormChange('graduationYear', fromMultiValues(next))}
                />
                <MultiSelectPopupInput
                  placeholder="Select experience"
                  options={formOptions.experiences}
                  values={toMultiValues(accessForm.experience)}
                  onChange={(next) => handleAccessFormChange('experience', fromMultiValues(next))}
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="submit"
                  className="rounded-md bg-[#337ab7] px-10 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={handleSkipForNow}
                  className="rounded-md border border-gray-300 bg-white px-10 py-2.5 text-sm font-medium text-[#337ab7] transition hover:bg-gray-50"
                >
                  Skip for now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
