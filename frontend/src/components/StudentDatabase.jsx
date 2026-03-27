import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAllStudents, shortlistStudent, removeShortlist } from '../api/studentDatabaseApi';
import { useAuth } from '../context/AuthContext';
import StudentDetailModal from './StudentDetailModal';

function MultiSelectFilterInput({
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
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        className="w-full min-h-[42px] rounded-lg border border-gray-300 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-transparent"
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

export default function StudentDatabase() {
  const MULTI_VALUE_SEPARATOR = '||';
  const { user, isIndustry } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const getFiltersFromParams = (searchString = '') => {
    const params = new URLSearchParams(searchString);
    return {
      keyword: params.get('q')?.trim() ?? '',
      degree: params.get('degree')?.trim() ?? '',
      skills: params.get('skills')?.trim() ?? '',
      roles: params.get('roles')?.trim() ?? '',
      shortlisted: params.get('shortlisted')?.trim() ?? '',
      location: params.get('location')?.trim() ?? '',
      graduationYear: params.get('graduationYear')?.trim() ?? '',
      availability: params.get('availability')?.trim() ?? '',
      specialization: params.get('specialization')?.trim() ?? '',
      gender: params.get('gender')?.trim() ?? '',
      college: params.get('college')?.trim() ?? '',
      gradingType: params.get('gradingType')?.trim() ?? '',
      gradingValue: params.get('gradingValue')?.trim() ?? '',
      experience: params.get('experience')?.trim() ?? '',
    };
  };
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]); // Store all students for filter options
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionType, setSubscriptionType] = useState('FREE');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Filter states
  const [filters, setFilters] = useState(() => getFiltersFromParams(location.search));
  const [showFilters, setShowFilters] = useState(true);
  const toMultiValues = (value) =>
    String(value || '')
      .split(MULTI_VALUE_SEPARATOR)
      .map((item) => item.trim())
      .filter(Boolean);
  const fromMultiValues = (arr) => arr.join(MULTI_VALUE_SEPARATOR);

  // Column configuration
  const [columnOrder, setColumnOrder] = useState([
    'name', 'gender', 'degree', 'specialization', 'roles', 'institution', 'year', 'skills', 'location', 'experience', 'resume', 'actions'
  ]);
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    gender: true,
    degree: true,
    specialization: true,
    roles: true,
    institution: true,
    year: true,
    skills: true,
    location: true,
    experience: true,
    resume: true,
    actions: true,
  });
  const [columnWidths, setColumnWidths] = useState({
    name: 13,
    gender: 8,
    degree: 7,
    specialization: 9,
    roles: 10,
    institution: 12,
    year: 6,
    skills: 16,
    location: 10,
    experience: 6,
    resume: 6,
    actions: 7,
  });
  const [resizingColumn, setResizingColumn] = useState(null);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [showAddColumnMenu, setShowAddColumnMenu] = useState(false);
  const tableRef = useRef(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const getRoleValues = (student) => {
    const roles = [];
    const pushRole = (value) => {
      const next = String(value || '').trim();
      if (next) roles.push(next);
    };

    pushRole(student?.currentPosition);
    if (Array.isArray(student?.professionalExperiences)) {
      student.professionalExperiences.forEach((exp) => {
        pushRole(exp?.jobTitle);
      });
    }

    return Array.from(new Set(roles));
  };

  // Column definitions
  const columnDefinitions = {
    name: { 
      id: 'name', 
      label: 'Name', 
      sortKey: 'fullName', 
      sortable: true,
      render: (student) => (
        <div className="flex items-center gap-1.5">
          {student.profilePictureBase64 ? (
            <img
              src={`data:image/jpeg;base64,${student.profilePictureBase64}`}
              alt={student.fullName}
              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-gray-500">
                {student.fullName?.charAt(0) || '?'}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-gray-900 truncate" title={student.fullName || 'N/A'}>
              {student.fullName || 'N/A'}
            </div>
            {student.email && (
              <div className="text-xs text-gray-500 truncate" title={student.email}>
                {student.email}
              </div>
            )}
          </div>
        </div>
      )
    },
    gender: {
      id: 'gender',
      label: 'Gender',
      sortKey: 'gender',
      sortable: true,
      render: (student) => (
        <div className="text-xs text-gray-900 truncate" title={student.gender || 'N/A'}>
          {student.gender || 'N/A'}
        </div>
      )
    },
    degree: { 
      id: 'degree', 
      label: 'Degree', 
      sortKey: 'degree', 
      sortable: true,
      render: (student) => (
        <div className="text-xs text-gray-900 truncate" title={student.degree || 'N/A'}>
          {student.degree || 'N/A'}
        </div>
      )
    },
    specialization: { 
      id: 'specialization', 
      label: 'Specialization', 
      sortKey: 'specialization', 
      sortable: true,
      render: (student) => (
        <div className="text-xs text-gray-900 truncate" title={student.specialization || 'N/A'}>
          {student.specialization || 'N/A'}
        </div>
      )
    },
    roles: {
      id: 'roles',
      label: 'Role',
      sortable: false,
      render: (student) => {
        const roles = getRoleValues(student);
        return (
          <div className="text-xs text-gray-900 truncate" title={roles.join(', ') || 'N/A'}>
            {roles[0] || 'N/A'}
          </div>
        );
      },
    },
    institution: { 
      id: 'institution', 
      label: 'Institution', 
      sortKey: 'institution', 
      sortable: true,
      render: (student) => (
        <div className="text-xs text-gray-900 truncate" title={student.institution || 'N/A'}>
          {student.institution || 'N/A'}
        </div>
      )
    },
    year: { 
      id: 'year', 
      label: 'Year', 
      sortKey: 'graduationYear', 
      sortable: true,
      render: (student) => (
        <div className="text-xs text-gray-900">{student.graduationYear || 'N/A'}</div>
      )
    },
    skills: { 
      id: 'skills', 
      label: 'Skills', 
      sortable: false,
      render: (student) => (
        <div className="flex flex-wrap gap-0.5">
          {student.skills && student.skills.length > 0 ? (
            <>
              {student.skills.slice(0, 2).map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  title={skill}
                >
                  {skill.length > 10 ? skill.substring(0, 10) + '...' : skill}
                </span>
              ))}
              {student.skills.length > 2 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600" title={`${student.skills.length - 2} more skills`}>
                  +{student.skills.length - 2}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-400">N/A</span>
          )}
        </div>
      )
    },
    location: { 
      id: 'location', 
      label: 'Location', 
      sortKey: 'currentLocation', 
      sortable: true,
      render: (student) => (
        <div className="text-xs text-gray-900 truncate" title={student.currentLocation || 'N/A'}>
          {student.currentLocation || 'N/A'}
        </div>
      )
    },
    experience: { 
      id: 'experience', 
      label: 'Exp', 
      sortable: false,
      render: (student) => (
        <div className="text-xs text-gray-900">{student.experience || '0'}</div>
      )
    },
    resume: { 
      id: 'resume', 
      label: 'Resume', 
      sortable: false,
      render: (student) => (
        student.resumeAvailable ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            ✓
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            ✗
          </span>
        )
      )
    },
    actions: { 
      id: 'actions', 
      label: '⭐', 
      sortable: false,
      render: (student, handleShortlist, handleRemoveShortlist) => (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          {student.isShortlisted ? (
            <button
              onClick={(e) => handleRemoveShortlist(student.studentId, e)}
              className="p-1 rounded-full bg-yellow-100 text-yellow-600 hover:bg-yellow-200 transition-colors"
              title="Remove from shortlist"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={(e) => handleShortlist(student.studentId, e)}
              className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Add to shortlist"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          )}
        </div>
      )
    },
  };

  // Sync filters when opening /browse with search params (or params update without remount)
  useEffect(() => {
    setFilters(getFiltersFromParams(location.search));
  }, [location.search]);

  // Fetch students on mount
  useEffect(() => {
    if (isIndustry) {
      fetchAllStudents();
    }
  }, [isIndustry]);

  // Close add column menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAddColumnMenu && !event.target.closest('.add-column-menu')) {
        setShowAddColumnMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddColumnMenu]);

  const fetchAllStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getAllStudents({});
      const allStudentsData = response.students || [];
      setAllStudents(allStudentsData);
      setStudents(allStudentsData);
      setSubscriptionType(response.subscriptionType || 'FREE');
    } catch (err) {
      setError(err.response?.data || err.message || 'Failed to load students');
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique filter options from all students
  const filterOptions = useMemo(() => {
    const options = {
      degrees: new Set(),
      specializations: new Set(),
      skills: new Set(),
      roles: new Set(),
      locations: new Set(),
      colleges: new Set(),
      genders: new Set(),
      experiences: new Set(),
      graduationYears: new Set(),
      availability: new Set(),
    };

    allStudents.forEach(student => {
      if (student.degree) options.degrees.add(student.degree);
      if (student.specialization) options.specializations.add(student.specialization);
      if (student.skills && Array.isArray(student.skills)) {
        student.skills.forEach(skill => {
          if (skill) options.skills.add(skill);
        });
      }
      getRoleValues(student).forEach((role) => options.roles.add(role));
      if (student.currentLocation) options.locations.add(student.currentLocation);
      if (student.institution) options.colleges.add(student.institution);
      if (student.gender) options.genders.add(student.gender);
      if (student.experience !== undefined && student.experience !== null) options.experiences.add(String(student.experience));
      if (student.graduationYear) options.graduationYears.add(student.graduationYear);
      if (student.availability) options.availability.add(student.availability);

      if (Array.isArray(student.educationEntries)) {
        student.educationEntries.forEach((edu) => {
          if (edu?.degree) options.degrees.add(edu.degree);
          if (edu?.level) options.degrees.add(edu.level);
          if (edu?.stream) options.specializations.add(edu.stream);
          if (edu?.specialization) options.specializations.add(edu.specialization);
          if (edu?.institution) options.colleges.add(edu.institution);
          if (edu?.collegeName) options.colleges.add(edu.collegeName);
          if (edu?.passingYear) options.graduationYears.add(String(edu.passingYear));
          if (edu?.graduationYear) options.graduationYears.add(String(edu.graduationYear));
        });
      }
    });

    return {
      degrees: Array.from(options.degrees).sort(),
      specializations: Array.from(options.specializations).sort(),
      skills: Array.from(options.skills).sort(),
      roles: Array.from(options.roles).sort(),
      locations: Array.from(options.locations).sort(),
      colleges: Array.from(options.colleges).sort(),
      genders: Array.from(options.genders).sort(),
      experiences: Array.from(options.experiences).sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b)),
      graduationYears: Array.from(options.graduationYears).sort((a, b) => b.localeCompare(a)),
      availability: Array.from(options.availability).sort(),
    };
  }, [allStudents]);

  // Apply filters to students
  const filteredStudents = useMemo(() => {
    const getFirstValue = (student, keys) => {
      for (const key of keys) {
        const value = student[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value);
        }
      }
      return '';
    };

    const getEducationValues = (student, keys) => {
      if (!Array.isArray(student.educationEntries)) return [];
      return student.educationEntries
        .map((entry) => {
          for (const key of keys) {
            const value = entry?.[key];
            if (value !== undefined && value !== null && String(value).trim() !== '') {
              return String(value).trim();
            }
          }
          return '';
        })
        .filter(Boolean);
    };

    const normalizeText = (value) =>
      String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const canonicalDegree = (value) => {
      const text = normalizeText(value);
      if (!text) return '';
      if (text.includes('b tech') || text.includes('btech') || text.includes('be') || text.includes('b e') || text.includes('be b tech')) return 'be_btech';
      if (text.includes('m tech') || text.includes('mtech') || text === 'm e' || text === 'me') return 'me_mtech';
      if (text.includes('b sc') || text.includes('bsc')) return 'bsc';
      if (text.includes('m sc') || text.includes('msc')) return 'msc';
      if (text.includes('mca')) return 'mca';
      if (text.includes('mbbs')) return 'mbbs';
      if (text.includes('bba')) return 'bba';
      if (text.includes('agri') || text.includes('agriculture')) return 'agriculture';
      return '';
    };

    const strictMatch = (source, query) => normalizeText(source) === normalizeText(query);
    const strictSome = (values, query) => values.some((value) => strictMatch(value, query));
    const parseMultiValues = (value) =>
      String(value || '')
        .split(MULTI_VALUE_SEPARATOR)
        .map((item) => item.trim())
        .filter(Boolean);

    return allStudents.filter(student => {
      // Keyword filter (name, skills, institution)
      if (filters.keyword) {
        const keywordValues = parseMultiValues(filters.keyword);
        const hasKeywordMatch = keywordValues.some((keyword) => {
          const keywordDegree = canonicalDegree(keyword);
        const degreeValues = [
          student.degree,
          ...getEducationValues(student, ['degree', 'level']),
        ].filter(Boolean);

        if (keywordDegree) {
            return degreeValues.some((value) => canonicalDegree(value) === keywordDegree);
        } else {
          const keywordSources = [
            student.fullName,
            student.institution,
            student.degree,
            student.specialization,
            student.currentLocation,
            ...(Array.isArray(student.skills) ? student.skills : []),
            ...getEducationValues(student, ['degree', 'level', 'stream', 'specialization', 'institution', 'collegeName']),
          ].filter(Boolean);
            return strictSome(keywordSources, keyword);
          }
        });
        if (!hasKeywordMatch) return false;
        }

      // Degree filter
      if (filters.degree) {
        const queryDegrees = parseMultiValues(filters.degree);
        const degreeOptions = [getFirstValue(student, ['degree']), ...getEducationValues(student, ['degree', 'level'])].filter(Boolean);
        const hasDegreeMatch = queryDegrees.some((queryDegreeValue) => {
          const queryDegree = canonicalDegree(queryDegreeValue);
          return queryDegree
            ? degreeOptions.some((value) => canonicalDegree(value) === queryDegree)
            : strictSome(degreeOptions, queryDegreeValue);
        });
        if (!hasDegreeMatch) return false;
      }

      // Specialization filter
      if (filters.specialization) {
        const querySpecializations = parseMultiValues(filters.specialization);
        const specializationOptions = [
          getFirstValue(student, ['specialization']),
          ...getEducationValues(student, ['stream', 'specialization']),
        ].filter(Boolean);
        const hasSpecializationMatch = querySpecializations.some((query) => strictSome(specializationOptions, query));
        if (!hasSpecializationMatch) return false;
      }

      // Skills filter
      if (filters.skills) {
        const querySkills = parseMultiValues(filters.skills);
        const skillLikeValues = [
          ...(Array.isArray(student.skills) ? student.skills : []),
          getFirstValue(student, ['specialization', 'degree']),
          ...getEducationValues(student, ['stream', 'specialization', 'degree', 'level']),
        ].filter(Boolean);

        const hasSkillMatch = querySkills.some((query) => strictSome(skillLikeValues, query));
        if (!hasSkillMatch) return false;
      }

      // Role filter
      if (filters.roles) {
        const queryRoles = parseMultiValues(filters.roles);
        const roleValues = getRoleValues(student);
        const hasRoleMatch = queryRoles.some((query) => strictSome(roleValues, query));
        if (!hasRoleMatch) return false;
      }

      if (filters.shortlisted && filters.shortlisted.toLowerCase() === 'true' && !student.isShortlisted) {
        return false;
      }

      // Location filter
      if (filters.location) {
        const queryLocations = parseMultiValues(filters.location);
        const location = getFirstValue(student, ['currentLocation', 'location']);
        const hasLocationMatch = queryLocations.some((query) => strictMatch(location, query));
        if (!hasLocationMatch) return false;
      }

      // Gender filter
      if (filters.gender) {
        const queryGenders = parseMultiValues(filters.gender);
        const gender = getFirstValue(student, ['gender']);
        const hasGenderMatch = queryGenders.some((query) => strictMatch(gender, query));
        if (!gender || !hasGenderMatch) return false;
      }

      // College filter
      if (filters.college) {
        const queryColleges = parseMultiValues(filters.college);
        const collegeOptions = [
          getFirstValue(student, ['institution', 'college', 'collegeName']),
          ...getEducationValues(student, ['institution', 'college', 'collegeName']),
        ].filter(Boolean);
        const hasCollegeMatch = queryColleges.some((query) => strictSome(collegeOptions, query));
        if (!hasCollegeMatch) return false;
      }

      // Graduation year filter
      if (filters.graduationYear) {
        const queryYears = parseMultiValues(filters.graduationYear);
        const years = [
          getFirstValue(student, ['graduationYear']),
          ...getEducationValues(student, ['passingYear', 'graduationYear']),
        ].filter(Boolean);
        const hasYearMatch = queryYears.some((query) => strictSome(years, query));
        if (!hasYearMatch) return false;
      }

      // Experience filter
      if (filters.experience) {
        const queryExperiences = parseMultiValues(filters.experience);
        const experienceValue = getFirstValue(student, ['experience', 'yearsOfExperience']);
        const hasExperienceMatch = queryExperiences.some((query) => {
          const expectedExperience = Number.parseFloat(query);
          const studentExperience = Number.parseFloat(experienceValue);
          if (!Number.isNaN(expectedExperience)) {
            return !Number.isNaN(studentExperience) && studentExperience === expectedExperience;
          }
          return strictMatch(experienceValue, query);
        });
        if (!hasExperienceMatch) return false;
      }

      // Availability filter
      if (filters.availability) {
        const queryAvailabilityValues = parseMultiValues(filters.availability);
        const hasAvailabilityMatch = queryAvailabilityValues.some((query) => strictMatch(student.availability, query));
        if (!hasAvailabilityMatch) return false;
      }

      // Grading filter
      if (filters.gradingType && filters.gradingValue) {
        const gradeFieldCandidates = filters.gradingType.toLowerCase() === 'cgpa'
          ? ['cgpa', 'gradePoint', 'gpa']
          : ['percentage', 'marksPercentage', 'scorePercentage'];
        const gradeRaw = [
          getFirstValue(student, gradeFieldCandidates),
          ...getEducationValues(student, gradeFieldCandidates),
        ].find(Boolean) || '';
        const studentGrade = Number.parseFloat(gradeRaw);
        const expectedGrade = Number.parseFloat(filters.gradingValue);

        if (!Number.isNaN(expectedGrade)) {
          if (Number.isNaN(studentGrade) || studentGrade < expectedGrade) return false;
        }
      }

      return true;
    });
  }, [allStudents, filters]);

  // Apply sorting
  const sortedStudents = useMemo(() => {
    if (!sortConfig.key) return filteredStudents;

    return [...filteredStudents].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // Handle arrays (like skills)
      if (Array.isArray(aValue)) aValue = aValue.join(', ');
      if (Array.isArray(bValue)) bValue = bValue.join(', ');

      // Convert to strings for comparison
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredStudents, sortConfig]);

  // Update displayed students when filters change
  useEffect(() => {
    setStudents(sortedStudents);
  }, [sortedStudents]);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      keyword: '',
      degree: '',
      skills: '',
      roles: '',
      shortlisted: '',
      location: '',
      graduationYear: '',
      availability: '',
      specialization: '',
      gender: '',
      college: '',
      gradingType: '',
      gradingValue: '',
      experience: '',
    });
  };

  const handleViewProfile = (student) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const handleShortlist = async (studentId, e) => {
    e.stopPropagation();
    
    try {
      await shortlistStudent(studentId);
      fetchAllStudents(); // Refresh the list
      alert('Student shortlisted successfully!');
    } catch (err) {
      alert(err.response?.data || err.message || 'Failed to shortlist student');
    }
  };

  const handleRemoveShortlist = async (studentId, e) => {
    e.stopPropagation();
    
    try {
      await removeShortlist(studentId);
      fetchAllStudents(); // Refresh the list
      alert('Student removed from shortlist');
    } catch (err) {
      alert(err.response?.data || err.message || 'Failed to remove shortlist');
    }
  };

  // Column resize handlers
  const handleResizeStart = (e, columnId) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnId);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columnWidths[columnId];
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e) => {
    if (!resizingColumn || !tableRef.current) return;
    
    const tableWidth = tableRef.current.offsetWidth;
    const deltaX = e.clientX - resizeStartX.current;
    const deltaPercent = (deltaX / tableWidth) * 100;
    const newWidth = Math.max(3, Math.min(30, resizeStartWidth.current + deltaPercent));
    
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }));
  };

  const handleResizeEnd = () => {
    setResizingColumn(null);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // Column drag handlers for reordering
  const handleColumnDragStart = (e, columnId) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedColumn(columnId);
  };

  const handleColumnDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedColumn && draggedColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleColumnDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleColumnDrop = (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDraggedColumn(null);
      return;
    }

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumnId);
    
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);
    
    setColumnOrder(newOrder);
    setDraggedColumn(null);
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnId) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  // Get visible columns in order
  const visibleColumns = useMemo(() => {
    return columnOrder.filter(colId => columnVisibility[colId]);
  }, [columnOrder, columnVisibility]);

  // Get hidden columns
  const hiddenColumns = useMemo(() => {
    return Object.keys(columnDefinitions).filter(colId => !columnVisibility[colId]);
  }, [columnVisibility]);

  // Show hidden column
  const showColumn = (columnId) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: true
    }));
    setShowAddColumnMenu(false);
  };

  if (!isIndustry) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only Industry users can access the student database.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-4 lg:px-6">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
            <div>
              <button
                type="button"
                onClick={() => navigate('/student-database')}
                className="mb-3 text-sm font-medium text-[#337ab7] hover:underline"
              >
                ← Back to overview
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Student Database</h1>
              <p className="text-gray-600 mt-1">Browse and filter registered student profiles</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{students.length}</span> of <span className="font-semibold text-gray-900">{allStudents.length}</span> students
              </span>
            <button
              onClick={() => handleFilterChange('shortlisted', filters.shortlisted === 'true' ? '' : 'true')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border border-[#337ab7]/30 text-[#337ab7] bg-white hover:bg-[#337ab7]/5"
            >
              {filters.shortlisted === 'true' ? 'Show All Students' : 'See Shortlisted Students'}
            </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>
          </div>
          
          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2 lg:col-span-3 text-xs text-gray-500">
                  Tip: Select from list; each selected value appears as a removable chip.
                </div>
                {/* Keyword Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Name, skill, or college"
                    value={filters.keyword}
                    onChange={(e) => handleFilterChange('keyword', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                {/* Degree Dropdown */}
                <MultiSelectFilterInput
                  label="Degree"
                  placeholder="Select degree"
                  options={filterOptions.degrees}
                  values={toMultiValues(filters.degree)}
                  onChange={(next) => handleFilterChange('degree', fromMultiValues(next))}
                />

                {/* Skills Dropdown */}
                <MultiSelectFilterInput
                  label="Skills"
                  placeholder="Select skills"
                  options={filterOptions.skills}
                  values={toMultiValues(filters.skills)}
                  onChange={(next) => handleFilterChange('skills', fromMultiValues(next))}
                />

                <MultiSelectFilterInput
                  label="Roles"
                  placeholder="Select role"
                  options={filterOptions.roles}
                  values={toMultiValues(filters.roles)}
                  onChange={(next) => handleFilterChange('roles', fromMultiValues(next))}
                />

                {/* Location Dropdown */}
                <MultiSelectFilterInput
                  label="Location"
                  placeholder="Select location"
                  options={filterOptions.locations}
                  values={toMultiValues(filters.location)}
                  onChange={(next) => handleFilterChange('location', fromMultiValues(next))}
                />

                {/* Graduation Year Dropdown */}
                <MultiSelectFilterInput
                  label="Graduation Year"
                  placeholder="Select graduation year"
                  options={filterOptions.graduationYears}
                  values={toMultiValues(filters.graduationYear)}
                  onChange={(next) => handleFilterChange('graduationYear', fromMultiValues(next))}
                />

                {/* Specialization Dropdown */}
                <MultiSelectFilterInput
                  label="Specialization"
                  placeholder="Select specialization"
                  options={filterOptions.specializations}
                  values={toMultiValues(filters.specialization)}
                  onChange={(next) => handleFilterChange('specialization', fromMultiValues(next))}
                />

                {/* College Dropdown */}
                <MultiSelectFilterInput
                  label="College"
                  placeholder="Select college"
                  options={filterOptions.colleges}
                  values={toMultiValues(filters.college)}
                  onChange={(next) => handleFilterChange('college', fromMultiValues(next))}
                />

                {/* Gender Dropdown */}
                <MultiSelectFilterInput
                  label="Gender"
                  placeholder="Select gender"
                  options={filterOptions.genders}
                  values={toMultiValues(filters.gender)}
                  onChange={(next) => handleFilterChange('gender', fromMultiValues(next))}
                />

                {/* Experience Dropdown */}
                <MultiSelectFilterInput
                  label="Experience"
                  placeholder="Select experience"
                  options={filterOptions.experiences}
                  values={toMultiValues(filters.experience)}
                  onChange={(next) => handleFilterChange('experience', fromMultiValues(next))}
                />

                {/* Grading Type Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grading Type</label>
                  <select
                    value={filters.gradingType}
                    onChange={(e) => handleFilterChange('gradingType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                  >
                    <option value="">Any Grading Type</option>
                    <option value="percentage">Percentage</option>
                    <option value="cgpa">CGPA</option>
                  </select>
                </div>

                {/* Minimum Grade Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Grade</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={filters.gradingValue}
                    onChange={(e) => handleFilterChange('gradingValue', e.target.value)}
                    placeholder={filters.gradingType === 'cgpa' ? 'e.g. 8.5' : 'e.g. 75'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                  />
                </div>

                {/* Availability Dropdown */}
                <MultiSelectFilterInput
                  label="Availability"
                  placeholder="Select availability"
                  options={filterOptions.availability}
                  values={toMultiValues(filters.availability)}
                  onChange={(next) => handleFilterChange('availability', fromMultiValues(next))}
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleClearFilters}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Excel-like Table */}
        {!loading && !error && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Add Column Button */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between relative">
              <div className="flex items-center gap-2">
                <div className="relative add-column-menu">
                  <button
                    onClick={() => hiddenColumns.length > 0 && setShowAddColumnMenu(!showAddColumnMenu)}
                    disabled={hiddenColumns.length === 0}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      hiddenColumns.length > 0 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Column
                    {hiddenColumns.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-blue-500 rounded text-xs">
                        {hiddenColumns.length}
                      </span>
                    )}
                  </button>
                  
                  {/* Hidden Columns Menu */}
                  {showAddColumnMenu && hiddenColumns.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                      <div className="p-2">
                        <div className="text-xs font-semibold text-gray-700 mb-2 px-2">Hidden Columns</div>
                        {hiddenColumns.map(columnId => (
                          <button
                            key={columnId}
                            onClick={() => showColumn(columnId)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center justify-between"
                          >
                            <span>{columnDefinitions[columnId].label}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {hiddenColumns.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {hiddenColumns.length} hidden column{hiddenColumns.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <table 
              ref={tableRef}
              className="w-full divide-y divide-gray-200" 
              style={{ tableLayout: 'fixed', width: '100%' }}
            >
              <thead className="bg-gray-50">
                <tr>
                  {visibleColumns.map((columnId, index) => {
                    const colDef = columnDefinitions[columnId];
                    const isLast = index === visibleColumns.length - 1;
                    
                    return (
                      <th
                        key={columnId}
                        draggable
                        onDragStart={(e) => handleColumnDragStart(e, columnId)}
                        onDragOver={(e) => handleColumnDragOver(e, columnId)}
                        onDragLeave={handleColumnDragLeave}
                        onDrop={(e) => handleColumnDrop(e, columnId)}
                        className={`px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider relative group ${
                          draggedColumn === columnId ? 'opacity-50' : ''
                        } ${
                          dragOverColumn === columnId ? 'bg-blue-100 border-l-2 border-blue-500' : ''
                        }`}
                        style={{ width: `${columnWidths[columnId]}%` }}
                      >
                        <div className="flex items-center gap-1">
                          {/* Drag Handle */}
                          <div 
                            className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Drag to reorder"
                          >
                            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </div>
                          
                          {/* Column Label */}
                          {colDef.sortable ? (
                            <div 
                              className="flex-1 flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded transition-colors"
                              onClick={() => handleSort(colDef.sortKey)}
                            >
                              <span>{colDef.label}</span>
                              {sortConfig.key === colDef.sortKey && (
                                <svg className={`w-3 h-3 ${sortConfig.direction === 'asc' ? '' : 'transform rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              )}
                            </div>
                          ) : (
                            <div className="flex-1">{colDef.label}</div>
                          )}
                          
                          {/* Hide Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnVisibility(columnId);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-200 rounded"
                            title="Hide column"
                          >
                            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Resize Handle */}
                        {!isLast && (
                          <div
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors group-hover:bg-gray-300"
                            onMouseDown={(e) => handleResizeStart(e, columnId)}
                            style={{ cursor: resizingColumn === columnId ? 'col-resize' : 'col-resize' }}
                            title="Drag to resize"
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student, index) => (
                  <tr 
                    key={student.studentId} 
                    className={`hover:bg-blue-50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    onClick={() => handleViewProfile(student)}
                  >
                    {visibleColumns.map(columnId => {
                      const colDef = columnDefinitions[columnId];
                      return (
                        <td 
                          key={columnId}
                          className="px-2 py-2"
                          style={{ width: `${columnWidths[columnId]}%` }}
                        >
                          {colDef.id === 'actions' 
                            ? colDef.render(student, handleShortlist, handleRemoveShortlist)
                            : colDef.render(student)
                          }
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* No Results */}
            {students.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">No students found</h3>
                <p className="mt-1 text-gray-500">Try adjusting your filters or search criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {showDetailModal && selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          subscriptionType={subscriptionType}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedStudent(null);
            fetchAllStudents(); // Refresh in case shortlist status changed
          }}
        />
      )}
    </div>
  );
}
