export const JOBS_REQUIRED_PROFILE_LABELS = [
  "Resume",
  "LinkedIn",
  "Cover letter",
  "Phone number",
  "Availability",
  "Years of experience",
];

export const getMissingMandatoryProfileFields = (profile) => {
  if (!profile) {
    return [...JOBS_REQUIRED_PROFILE_LABELS];
  }

  const missing = [];
  const hasResume = Boolean(profile.resumeBase64 || profile.resumeFileName);
  const hasLinkedIn = Boolean(profile.linkedInUrl);
  const hasCoverLetter = Boolean(profile.coverLetterTemplate);
  const hasPhoneNumber = Boolean(profile.phoneNumber);
  const hasAvailability = Boolean(profile.availability);
  const hasExperience = Boolean(profile.experience);

  if (!hasResume) missing.push("Resume");
  if (!hasLinkedIn) missing.push("LinkedIn");
  if (!hasCoverLetter) missing.push("Cover letter");
  if (!hasPhoneNumber) missing.push("Phone number");
  if (!hasAvailability) missing.push("Availability");
  if (!hasExperience) missing.push("Years of experience");

  return missing;
};

export const getJobsProfileCompletion = (profile) => {
  const total = JOBS_REQUIRED_PROFILE_LABELS.length;
  const missing = getMissingMandatoryProfileFields(profile);
  const completed = Math.max(total - missing.length, 0);
  return Math.round((completed / total) * 100);
};

/** Same section/field layout as ProfileBuilder — use for navbar % so it matches the builder. */
export const PROFILE_BUILDER_SECTIONS_FOR_COMPLETION = [
  { id: 'personal', fields: ['profilePicture', 'fullName', 'phoneNumber', 'email'] },
  { id: 'professional', fields: ['experience', 'professionalExperiences', 'skills', 'summary'] },
  { id: 'education', fields: ['educationEntries', 'certificationFiles'] },
  { id: 'location', fields: ['currentLocation', 'preferredLocations', 'workPreference', 'willingToRelocate'] },
  { id: 'hobbies', fields: ['hobbies'] },
  { id: 'projects', fields: ['projects'] },
  { id: 'links', fields: ['linkedInUrl', 'portfolioUrl', 'githubUrl', 'websiteUrl'] },
  { id: 'additional', fields: ['rolePreferences', 'opportunityPreferences', 'availability', 'expectedSalary'] },
  { id: 'resume', fields: ['resume', 'coverLetterTemplate'] },
];

const parseArrayField = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

export const mapSomethingXProfileToJobsShape = (homeProfile) => {
  if (!homeProfile) return {};
  return {
    fullName: homeProfile.name || '',
    phoneNumber: homeProfile.phone || '',
    email: homeProfile.email || '',
    profilePictureBase64: homeProfile.picture || '',
    profilePictureFileType: homeProfile.picture ? 'image/jpeg' : '',
    profilePictureFileName: homeProfile.picture ? 'profile-picture.jpg' : '',
    profilePictureFileSize: 0,
    experience: homeProfile.experience || '',
    skills: parseArrayField(homeProfile.skills),
    summary: homeProfile.bio || '',
    currentLocation: homeProfile.location || '',
    linkedInUrl: homeProfile.linkedinUrl || homeProfile.linkedin || '',
    portfolioUrl: homeProfile.portfolioUrl || homeProfile.portfolio || '',
    githubUrl: homeProfile.githubUrl || homeProfile.github || '',
    websiteUrl: homeProfile.websiteUrl || homeProfile.website || '',
    rolePreferences: parseArrayField(homeProfile.rolePreferences),
    opportunityPreferences: parseArrayField(homeProfile.opportunityPreferences),
    educationEntries: parseArrayField(homeProfile.academicBackground),
    projects: parseArrayField(homeProfile.projects),
  };
};

const isBlankMerge = (value) => {
  if (Array.isArray(value)) return value.length === 0;
  return value === null || value === undefined || value === '';
};

/** Same merge as ProfileBuilder load: fill blanks in jobs profile from Home profile. */
export const mergeJobsProfilesForCompletion = (jobsProfile, mappedHome) => {
  const merged = { ...(jobsProfile || {}) };
  Object.keys(mappedHome || {}).forEach((key) => {
    if (isBlankMerge(merged[key]) && !isBlankMerge(mappedHome[key])) {
      merged[key] = mappedHome[key];
    }
  });
  return merged;
};

const isFieldFilledForCompletion = (fieldName, profile) => {
  const value = profile[fieldName];
  if (fieldName === 'resume') {
    return Boolean(profile.resumeBase64 && profile.resumeFileName);
  }
  if (fieldName === 'profilePicture') {
    return Boolean(profile.profilePictureBase64 && String(profile.profilePictureBase64).length > 0);
  }
  if (
    fieldName === 'skills' ||
    fieldName === 'preferredLocations' ||
    fieldName === 'hobbies' ||
    fieldName === 'professionalExperiences' ||
    fieldName === 'educationEntries' ||
    fieldName === 'certificationFiles' ||
    fieldName === 'projects'
  ) {
    return Array.isArray(value) && value.length > 0;
  }
  if (fieldName === 'rolePreferences') {
    return Array.isArray(value) && value.length > 0;
  }
  if (fieldName === 'opportunityPreferences') {
    if (!Array.isArray(value)) return false;
    return value.includes('INTERNSHIP') || value.includes('FREELANCE');
  }
  if (fieldName === 'willingToRelocate') {
    return true;
  }
  return value !== null && value !== undefined && value !== '';
};

/**
 * Completion % matching ProfileBuilder.calculateProgress (all wizard fields).
 * Pass merged profile (Jobs + Home) like the builder uses after load.
 */
export const getProfileBuilderStyleCompletionPercent = (profile) => {
  if (!profile || typeof profile !== 'object') return 0;
  let filled = 0;
  let total = 0;
  PROFILE_BUILDER_SECTIONS_FOR_COMPLETION.forEach((section) => {
    section.fields.forEach((field) => {
      total += 1;
      if (isFieldFilledForCompletion(field, profile)) filled += 1;
    });
  });
  return total === 0 ? 0 : Math.round((filled / total) * 100);
};
