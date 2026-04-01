package com.saarthix.jobs.service;

import com.saarthix.jobs.model.*;
import com.saarthix.jobs.model.dto.StudentDatabaseDto;
import com.saarthix.jobs.repository.*;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StudentDatabaseService {
    
    private final UserProfileRepository userProfileRepository;
    private final UserRepository userRepository;
    private final HackathonApplicationRepository hackathonApplicationRepository;
    private final ApplicationRepository applicationRepository;
    private final IndustryShortlistRepository industryShortlistRepository;
    private final ActivityLogRepository activityLogRepository;
    private final NotificationService notificationService;
    
    public StudentDatabaseService(
            UserProfileRepository userProfileRepository,
            UserRepository userRepository,
            HackathonApplicationRepository hackathonApplicationRepository,
            ApplicationRepository applicationRepository,
            IndustryShortlistRepository industryShortlistRepository,
            ActivityLogRepository activityLogRepository,
            NotificationService notificationService) {
        this.userProfileRepository = userProfileRepository;
        this.userRepository = userRepository;
        this.hackathonApplicationRepository = hackathonApplicationRepository;
        this.applicationRepository = applicationRepository;
        this.industryShortlistRepository = industryShortlistRepository;
        this.activityLogRepository = activityLogRepository;
        this.notificationService = notificationService;
    }
    
    /**
     * Get all student profiles with filtering
     * @param industryEmail - Email of the industry user (for shortlist status)
     * @param isPaidUser - Whether the industry user has a PAID subscription
     * @param filters - Map of filter criteria
     * @return List of StudentDatabaseDto
     */
    public List<StudentDatabaseDto> getAllStudents(
            String industryEmail, 
            boolean isPaidUser, 
            Map<String, String> filters) {
        try {
            // Get all profiles
            List<UserProfile> allProfiles = userProfileRepository.findAll();
            
            if (allProfiles == null) {
                return new ArrayList<>();
            }
            
            // Filter only APPLICANT profiles
            allProfiles = allProfiles.stream()
                    .filter(profile -> {
                        try {
                            if (profile == null || profile.getApplicantEmail() == null) {
                                return false;
                            }
                            Optional<User> userOpt = userRepository.findByEmail(profile.getApplicantEmail());
                            return userOpt.isPresent() && "APPLICANT".equals(userOpt.get().getUserType());
                        } catch (Exception e) {
                            System.err.println("Error filtering profile: " + e.getMessage());
                            return false;
                        }
                    })
                    .collect(Collectors.toList());
            
            // Apply filters
            List<UserProfile> filteredProfiles = applyFilters(allProfiles, filters);
            
            // Get shortlisted student emails for this industry
            Set<String> shortlistedEmails = new HashSet<>();
            try {
                if (industryEmail != null && !industryEmail.isEmpty()) {
                    List<IndustryShortlist> shortlists = industryShortlistRepository.findByIndustryEmail(industryEmail);
                    if (shortlists != null) {
                        shortlistedEmails = shortlists.stream()
                                .filter(shortlist -> shortlist != null && shortlist.getStudentEmail() != null)
                                .map(IndustryShortlist::getStudentEmail)
                                .collect(Collectors.toSet());
                    }
                }
            } catch (Exception e) {
                System.err.println("Error fetching shortlisted emails: " + e.getMessage());
            }
            
            // Convert to DTOs with error handling
            final Set<String> finalShortlistedEmails = shortlistedEmails;
            return filteredProfiles.stream()
                    .filter(profile -> profile != null)
                    .map(profile -> {
                        try {
                            boolean isShortlisted = profile.getApplicantEmail() != null && 
                                                   finalShortlistedEmails.contains(profile.getApplicantEmail());
                            return convertToDto(profile, isPaidUser, isShortlisted);
                        } catch (Exception e) {
                            System.err.println("Error converting profile to DTO: " + e.getMessage());
                            e.printStackTrace();
                            return null;
                        }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            System.err.println("Error in getAllStudents: " + e.getMessage());
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
    
    /**
     * Get a single student profile by ID
     * @param studentId - ID of the student
     * @param industryEmail - Email of the industry user
     * @param industryId - ID of the industry user
     * @param isPaidUser - Whether the industry user has a PAID subscription
     * @return StudentDatabaseDto
     */
    public StudentDatabaseDto getStudentById(
            String studentId, 
            String industryEmail, 
            String industryId,
            boolean isPaidUser) {
        
        Optional<UserProfile> profileOpt = userProfileRepository.findById(studentId);
        if (!profileOpt.isPresent()) {
            return null;
        }
        
        UserProfile profile = profileOpt.get();
        
        // Check if student is shortlisted
        boolean isShortlisted = industryShortlistRepository
                .existsByIndustryEmailAndStudentEmail(industryEmail, profile.getApplicantEmail());
        
        // Log the profile view
        logActivity(industryEmail, industryId, profile.getApplicantEmail(), studentId, "PROFILE_VIEWED");
        
        return convertToDto(profile, isPaidUser, isShortlisted);
    }
    
    /**
     * Shortlist a student
     * @param studentId - ID of the student
     * @param industryEmail - Email of the industry user
     * @param industryId - ID of the industry user
     * @param isPaidUser - Whether the industry user has a PAID subscription
     * @return success message or error
     */
    public String shortlistStudent(
            String studentId, 
            String industryEmail, 
            String industryId,
            boolean isPaidUser) {
        
        Optional<UserProfile> profileOpt = userProfileRepository.findById(studentId);
        if (!profileOpt.isPresent()) {
            return "Student not found";
        }
        
        UserProfile profile = profileOpt.get();
        
        // Check if already shortlisted
        if (industryShortlistRepository.existsByIndustryEmailAndStudentEmail(industryEmail, profile.getApplicantEmail())) {
            return "Student already shortlisted";
        }
        
        // Create shortlist entry
        IndustryShortlist shortlist = new IndustryShortlist(
                industryEmail, 
                industryId, 
                profile.getApplicantEmail(), 
                studentId
        );
        industryShortlistRepository.save(shortlist);
        
        // Log the activity
        logActivity(industryEmail, industryId, profile.getApplicantEmail(), studentId, "CANDIDATE_SHORTLISTED");
        
        // Create notification for the applicant
        // Get industry user details for better notification
        Optional<User> industryUserOpt = userRepository.findById(industryId);
        String companyName = industryUserOpt.map(User::getName).orElse(null);
        
        notificationService.createProfileShortlistNotification(
                profile.getApplicantId(),
                profile.getApplicantEmail(),
                profile.getFullName(),
                industryEmail,
                companyName
        );
        
        return "Student shortlisted successfully";
    }
    
    /**
     * Remove a student from shortlist
     * @param studentId - ID of the student
     * @param industryEmail - Email of the industry user
     * @return success message
     */
    public String removeShortlist(String studentId, String industryEmail) {
        Optional<UserProfile> profileOpt = userProfileRepository.findById(studentId);
        if (!profileOpt.isPresent()) {
            return "Student not found";
        }
        
        UserProfile profile = profileOpt.get();
        industryShortlistRepository.deleteByIndustryEmailAndStudentEmail(industryEmail, profile.getApplicantEmail());
        
        return "Student removed from shortlist";
    }
    
    /**
     * Get all shortlisted students for an industry user
     * @param industryEmail - Email of the industry user
     * @param isPaidUser - Whether the industry user has a PAID subscription
     * @return List of StudentDatabaseDto
     */
    public List<StudentDatabaseDto> getShortlistedStudents(String industryEmail, boolean isPaidUser) {
        try {
            List<IndustryShortlist> shortlists = industryShortlistRepository.findByIndustryEmail(industryEmail);
            
            if (shortlists == null || shortlists.isEmpty()) {
                return new ArrayList<>();
            }
            
            return shortlists.stream()
                    .filter(shortlist -> shortlist != null && shortlist.getStudentEmail() != null)
                    .map(shortlist -> {
                        try {
                            // Get profile by email (using findByApplicantEmail which returns Optional)
                            Optional<UserProfile> profileOpt = userProfileRepository.findByApplicantEmail(shortlist.getStudentEmail());
                            if (profileOpt.isPresent()) {
                                UserProfile profile = profileOpt.get();
                                return convertToDto(profile, isPaidUser, true);
                            }
                            return null;
                        } catch (Exception e) {
                            System.err.println("Error converting shortlisted student " + shortlist.getStudentEmail() + ": " + e.getMessage());
                            e.printStackTrace();
                            return null;
                        }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            System.err.println("Error fetching shortlisted students: " + e.getMessage());
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
    
    /**
     * Download resume (PAID users only)
     * @param studentId - ID of the student
     * @param industryEmail - Email of the industry user
     * @param industryId - ID of the industry user
     * @param isPaidUser - Whether the industry user has a PAID subscription
     * @return Resume data or null
     */
    public Map<String, String> downloadResume(
            String studentId, 
            String industryEmail, 
            String industryId,
            boolean isPaidUser) {
        
        Optional<UserProfile> profileOpt = userProfileRepository.findById(studentId);
        if (!profileOpt.isPresent()) {
            return null;
        }
        
        UserProfile profile = profileOpt.get();
        
        // Log the activity
        logActivity(industryEmail, industryId, profile.getApplicantEmail(), studentId, "RESUME_DOWNLOADED");
        
        Map<String, String> resumeData = new HashMap<>();
        resumeData.put("fileName", profile.getResumeFileName());
        resumeData.put("fileType", profile.getResumeFileType());
        resumeData.put("base64Data", profile.getResumeBase64());
        
        return resumeData;
    }
    
    // ============= PRIVATE HELPER METHODS =============
    
    /**
     * Apply filters to the list of profiles
     */
    private List<UserProfile> applyFilters(List<UserProfile> profiles, Map<String, String> filters) {
        if (filters == null || filters.isEmpty()) {
            return profiles;
        }
        
        return profiles.stream()
                .filter(profile -> {
                    // Filter by degree - check both original and normalized values
                    if (filters.containsKey("degree") && !filters.get("degree").isEmpty()) {
                        String filterDegree = filters.get("degree").toLowerCase();
                        boolean matchesDegree = false;
                        if (profile.getEducationEntries() != null) {
                            matchesDegree = profile.getEducationEntries().stream()
                                    .anyMatch(edu -> {
                                        if (edu.getDegree() == null) return false;
                                        String originalDegree = edu.getDegree().toLowerCase();
                                        // Check original value
                                        if (originalDegree.contains(filterDegree)) return true;
                                        // Check normalized value
                                        String normalizedDegree = normalizeDegree(edu.getDegree(), profile.getId() != null ? profile.getId() : "");
                                        if (normalizedDegree.toLowerCase().contains(filterDegree)) return true;
                                        return false;
                                    });
                        }
                        if (!matchesDegree) return false;
                    }
                    
                    // Filter by specialization - check both original and normalized values
                    if (filters.containsKey("specialization") && !filters.get("specialization").isEmpty()) {
                        String filterSpec = filters.get("specialization").toLowerCase();
                        boolean matchesSpec = false;
                        if (profile.getEducationEntries() != null) {
                            matchesSpec = profile.getEducationEntries().stream()
                                    .anyMatch(edu -> {
                                        if (edu.getStream() == null && edu.getDegree() == null) return false;
                                        // Check original stream value
                                        if (edu.getStream() != null && edu.getStream().toLowerCase().contains(filterSpec)) return true;
                                        // Check normalized stream value
                                        String normalizedDegree = normalizeDegree(edu.getDegree(), profile.getId() != null ? profile.getId() : "");
                                        String normalizedStream = normalizeSpecialization(normalizedDegree, edu.getStream(), profile.getId() != null ? profile.getId() : "");
                                        if (normalizedStream.toLowerCase().contains(filterSpec)) return true;
                                        // Check degree as fallback
                                        if (edu.getDegree() != null && edu.getDegree().toLowerCase().contains(filterSpec)) return true;
                                        return false;
                                    });
                        }
                        if (!matchesSpec) return false;
                    }
                    
                    // Filter by skills
                    if (filters.containsKey("skills") && !filters.get("skills").isEmpty()) {
                        String filterSkill = filters.get("skills").toLowerCase();
                        if (profile.getSkills() == null || 
                            profile.getSkills().stream().noneMatch(skill -> skill.toLowerCase().contains(filterSkill))) {
                            return false;
                        }
                    }
                    
                    // Filter by graduation year
                    if (filters.containsKey("graduationYear") && !filters.get("graduationYear").isEmpty()) {
                        String filterYear = filters.get("graduationYear");
                        boolean matchesYear = false;
                        if (profile.getEducationEntries() != null) {
                            matchesYear = profile.getEducationEntries().stream()
                                    .anyMatch(edu -> edu.getPassingYear() != null && 
                                            edu.getPassingYear().equals(filterYear));
                        }
                        if (!matchesYear) return false;
                    }
                    
                    // Filter by college/institution - check both original and normalized values
                    if (filters.containsKey("college") && !filters.get("college").isEmpty()) {
                        String filterCollege = filters.get("college").toLowerCase();
                        boolean matchesCollege = false;
                        if (profile.getEducationEntries() != null) {
                            matchesCollege = profile.getEducationEntries().stream()
                                    .anyMatch(edu -> {
                                        if (edu.getInstitution() == null) return false;
                                        String originalInstitution = edu.getInstitution().toLowerCase();
                                        // Check original value
                                        if (originalInstitution.contains(filterCollege)) return true;
                                        // Check normalized value
                                        String normalizedInstitution = normalizeInstitution(edu.getInstitution(), profile.getId() != null ? profile.getId() : "");
                                        if (normalizedInstitution.toLowerCase().contains(filterCollege)) return true;
                                        return false;
                                    });
                        }
                        if (!matchesCollege) return false;
                    }
                    
                    // Filter by location
                    if (filters.containsKey("location") && !filters.get("location").isEmpty()) {
                        String filterLocation = filters.get("location").toLowerCase();
                        boolean matchesLocation = 
                            (profile.getCurrentLocation() != null && profile.getCurrentLocation().toLowerCase().contains(filterLocation)) ||
                            (profile.getPreferredLocations() != null && 
                             profile.getPreferredLocations().stream().anyMatch(loc -> loc.toLowerCase().contains(filterLocation)));
                        if (!matchesLocation) return false;
                    }
                    
                    // Filter by availability
                    if (filters.containsKey("availability") && !filters.get("availability").isEmpty()) {
                        String filterAvail = filters.get("availability").toLowerCase();
                        if (profile.getAvailability() == null || 
                            !profile.getAvailability().toLowerCase().contains(filterAvail)) {
                            return false;
                        }
                    }
                    
                    // Filter by keyword (name, skill, college)
                    if (filters.containsKey("keyword") && !filters.get("keyword").isEmpty()) {
                        String keyword = filters.get("keyword").toLowerCase();
                        boolean matchesKeyword = 
                            (profile.getFullName() != null && profile.getFullName().toLowerCase().contains(keyword)) ||
                            (profile.getSkills() != null && profile.getSkills().stream().anyMatch(s -> s.toLowerCase().contains(keyword))) ||
                            (profile.getEducationEntries() != null && profile.getEducationEntries().stream()
                                    .anyMatch(edu -> edu.getInstitution() != null && edu.getInstitution().toLowerCase().contains(keyword)));
                        if (!matchesKeyword) return false;
                    }
                    
                    // Filter by job role / experience
                    if (filters.containsKey("jobRole") && !filters.get("jobRole").isEmpty()) {
                        String jobRole = filters.get("jobRole").toLowerCase();
                        boolean matchesJobRole = false;
                        
                        // Check in primary current position (backward compatibility)
                        if (profile.getCurrentPosition() != null &&
                            profile.getCurrentPosition().toLowerCase().contains(jobRole)) {
                            matchesJobRole = true;
                        }
                        
                        // Check in professional experiences
                        if (!matchesJobRole && profile.getProfessionalExperiences() != null) {
                            matchesJobRole = profile.getProfessionalExperiences().stream()
                                    .anyMatch(exp -> (exp.getJobTitle() != null && exp.getJobTitle().toLowerCase().contains(jobRole)) ||
                                                     (exp.getDescription() != null && exp.getDescription().toLowerCase().contains(jobRole)));
                        }
                        
                        if (!matchesJobRole) return false;
                    }
                    
                    return true;
                })
                .collect(Collectors.toList());
    }
    
    /**
     * Convert UserProfile to StudentDatabaseDto
     * Applies access control based on subscription type
     */
    private StudentDatabaseDto convertToDto(UserProfile profile, boolean isPaidUser, boolean isShortlisted) {
        if (profile == null) {
            return null;
        }
        
        StudentDatabaseDto dto = new StudentDatabaseDto();
        
        // Always visible fields
        dto.setStudentId(profile.getId() != null ? profile.getId() : "");
        dto.setFullName(profile.getFullName());
        dto.setGender(resolveGender(profile));
        dto.setProfilePictureBase64(profile.getProfilePictureBase64());
        dto.setSkills(profile.getSkills());
        dto.setExperience(profile.getExperience());
        dto.setSummary(profile.getSummary());
        dto.setCurrentLocation(profile.getCurrentLocation());
        dto.setPreferredLocations(profile.getPreferredLocations());
        dto.setWorkPreference(profile.getWorkPreference());
        dto.setLinkedInUrl(profile.getLinkedInUrl());
        dto.setPortfolioUrl(profile.getPortfolioUrl());
        dto.setGithubUrl(profile.getGithubUrl());
        dto.setAvailability(profile.getAvailability());
        dto.setHobbies(profile.getHobbies());
        dto.setCreatedAt(profile.getCreatedAt());
        dto.setLastUpdated(profile.getLastUpdated());
        dto.setIsShortlisted(isShortlisted);
        
        // Contact details - available for all users
        dto.setEmail(profile.getEmail() != null ? profile.getEmail() : (profile.getApplicantEmail() != null ? profile.getApplicantEmail() : ""));
        dto.setPhoneNumber(profile.getPhoneNumber());
        
        // Education entries
        if (profile.getEducationEntries() != null && !profile.getEducationEntries().isEmpty()) {
            // Use profile ID or applicant email as seed for deterministic randomization
            final String seed = profile.getId() != null ? profile.getId() : 
                               (profile.getApplicantEmail() != null ? profile.getApplicantEmail() : 
                                (profile.getApplicantId() != null ? profile.getApplicantId() : "default"));
            List<StudentDatabaseDto.EducationDto> eduDtos = profile.getEducationEntries().stream()
                    .map(edu -> convertEducationToDto(edu, seed))
                    .collect(Collectors.toList());
            dto.setEducationEntries(eduDtos);
            
            // Extract graduation info from highest education
            UserProfile.EducationEntry graduation = profile.getEducationEntries().stream()
                    .filter(e -> "Graduation".equalsIgnoreCase(e.getLevel()) || 
                                 "Post Graduation".equalsIgnoreCase(e.getLevel()))
                    .findFirst()
                    .orElse(null);
            
            if (graduation != null) {
                // Normalize degree, specialization, and institution
                String originalDegree = graduation.getDegree();
                String originalSpecialization = graduation.getStream();
                String originalInstitution = graduation.getInstitution();
                
                // Normalize degree: "Bachelors" -> random degree from list
                // Reuse the seed variable defined above
                String normalizedDegree = normalizeDegree(originalDegree, seed);
                dto.setDegree(normalizedDegree);
                
                // Normalize specialization: "General" -> random specialization based on degree
                String normalizedSpecialization = normalizeSpecialization(normalizedDegree, originalSpecialization, seed);
                dto.setSpecialization(normalizedSpecialization);
                
                // Normalize institution: "Sample University" -> random university
                String normalizedInstitution = normalizeInstitution(originalInstitution, seed);
                dto.setInstitution(normalizedInstitution);
                
                dto.setGraduationYear(graduation.getPassingYear());
            }
        }
        
        // Professional experiences
        if (profile.getProfessionalExperiences() != null) {
            List<StudentDatabaseDto.ProfessionalExperienceDto> expDtos = profile.getProfessionalExperiences().stream()
                    .map(this::convertExperienceToDto)
                    .collect(Collectors.toList());
            dto.setProfessionalExperiences(expDtos);
        }
        
        // Projects
        if (profile.getProjects() != null) {
            List<StudentDatabaseDto.ProjectDto> projDtos = profile.getProjects().stream()
                    .map(this::convertProjectToDto)
                    .collect(Collectors.toList());
            dto.setProjects(projDtos);
        }
        
        // Hackathons participated (with error handling)
        try {
            if (profile.getApplicantId() != null && !profile.getApplicantId().isEmpty()) {
                List<HackathonApplication> hackathonApps = hackathonApplicationRepository
                        .findByApplicantId(profile.getApplicantId());
                dto.setHackathonsParticipated(hackathonApps != null ? hackathonApps.size() : 0);
            } else {
                dto.setHackathonsParticipated(0);
            }
        } catch (Exception e) {
            // If there's an error fetching hackathon data, set to 0
            System.err.println("Warning: Could not fetch hackathon applications: " + e.getMessage());
            dto.setHackathonsParticipated(0);
        }
        
        // Jobs applied (with error handling)
        try {
            String applicantEmail = profile.getApplicantEmail();
            if (applicantEmail != null && !applicantEmail.isEmpty()) {
                List<Application> jobApps = applicationRepository.findByApplicantEmail(applicantEmail);
                dto.setJobsApplied(jobApps != null ? jobApps.size() : 0);
            } else {
                dto.setJobsApplied(0);
            }
        } catch (Exception e) {
            // If there's an error fetching job applications, set to 0
            System.err.println("Warning: Could not fetch job applications: " + e.getMessage());
            dto.setJobsApplied(0);
        }
        
        // Resume info
        dto.setResumeFileName(profile.getResumeFileName());
        dto.setResumeAvailable(profile.getResumeBase64() != null && !profile.getResumeBase64().isEmpty());
        
        // Resume access - available for all users
        if (profile.getResumeBase64() != null) {
            dto.setResumeBase64(profile.getResumeBase64());
        } else {
            dto.setResumeBase64(null);
        }
        
        // Profile completeness score
        dto.setProfileCompletenessScore(calculateProfileCompleteness(profile));
        
        return dto;
    }
    
    /**
     * Convert education entry to DTO
     */
    private StudentDatabaseDto.EducationDto convertEducationToDto(UserProfile.EducationEntry edu, String seed) {
        StudentDatabaseDto.EducationDto dto = new StudentDatabaseDto.EducationDto();
        dto.setLevel(edu.getLevel());
        
        // Normalize degree, specialization, and institution for education entries too
        // Use provided seed (profile ID) for deterministic randomization
        String normalizedDegree = normalizeDegree(edu.getDegree(), seed);
        String normalizedSpecialization = normalizeSpecialization(normalizedDegree, edu.getStream(), seed);
        String normalizedInstitution = normalizeInstitution(edu.getInstitution(), seed);
        
        dto.setDegree(normalizedDegree);
        dto.setInstitution(normalizedInstitution);
        dto.setBoard(edu.getBoard());
        dto.setPassingYear(edu.getPassingYear());
        dto.setPercentage(edu.getPercentage());
        dto.setStream(normalizedSpecialization);
        return dto;
    }
    
    /**
     * Convert professional experience to DTO
     */
    private StudentDatabaseDto.ProfessionalExperienceDto convertExperienceToDto(UserProfile.ProfessionalExperience exp) {
        StudentDatabaseDto.ProfessionalExperienceDto dto = new StudentDatabaseDto.ProfessionalExperienceDto();
        dto.setJobTitle(exp.getJobTitle());
        dto.setCompany(exp.getCompany());
        dto.setStartDate(exp.getStartDate());
        dto.setEndDate(exp.getEndDate());
        dto.setIsCurrentJob(exp.getIsCurrentJob());
        dto.setDescription(exp.getDescription());
        return dto;
    }
    
    /**
     * Convert project to DTO
     */
    private StudentDatabaseDto.ProjectDto convertProjectToDto(UserProfile.Project project) {
        StudentDatabaseDto.ProjectDto dto = new StudentDatabaseDto.ProjectDto();
        dto.setName(project.getName());
        dto.setDescription(project.getDescription());
        dto.setGithubLink(project.getGithubLink());
        dto.setWebsiteLink(project.getWebsiteLink());
        return dto;
    }
    
    /**
     * Calculate profile completeness score (0-100)
     */
    private Integer calculateProfileCompleteness(UserProfile profile) {
        int score = 0;
        int maxScore = 12;
        
        if (profile.getFullName() != null && !profile.getFullName().isEmpty()) score++;
        if (profile.getEmail() != null && !profile.getEmail().isEmpty()) score++;
        if (profile.getPhoneNumber() != null && !profile.getPhoneNumber().isEmpty()) score++;
        if (profile.getProfilePictureBase64() != null && !profile.getProfilePictureBase64().isEmpty()) score++;
        if (profile.getResumeBase64() != null && !profile.getResumeBase64().isEmpty()) score++;
        if (profile.getSkills() != null && !profile.getSkills().isEmpty()) score++;
        if (profile.getEducationEntries() != null && !profile.getEducationEntries().isEmpty()) score++;
        if (profile.getProfessionalExperiences() != null && !profile.getProfessionalExperiences().isEmpty()) score++;
        if (profile.getProjects() != null && !profile.getProjects().isEmpty()) score++;
        if (profile.getSummary() != null && !profile.getSummary().isEmpty()) score++;
        if (profile.getLinkedInUrl() != null && !profile.getLinkedInUrl().isEmpty()) score++;
        if (profile.getCurrentLocation() != null && !profile.getCurrentLocation().isEmpty()) score++;
        
        return (score * 100) / maxScore;
    }
    
    /**
     * Log activity
     */
    private void logActivity(String industryEmail, String industryId, String studentEmail, String studentId, String actionType) {
        ActivityLog log = new ActivityLog(industryEmail, industryId, studentEmail, studentId, actionType);
        activityLogRepository.save(log);
    }

    /**
     * Resolve gender from profile, then user account, then deterministic fallback for legacy dummy records.
     */
    private String resolveGender(UserProfile profile) {
        if (profile == null) {
            return "Prefer not to say";
        }

        if (profile.getGender() != null && !profile.getGender().trim().isEmpty()) {
            return profile.getGender().trim();
        }

        try {
            String email = profile.getApplicantEmail() != null ? profile.getApplicantEmail() : profile.getEmail();
            if (email != null && !email.trim().isEmpty()) {
                Optional<User> userOpt = userRepository.findByEmail(email.trim());
                if (userOpt.isPresent()) {
                    String userGender = userOpt.get().getGender();
                    if (userGender != null && !userGender.trim().isEmpty()) {
                        return userGender.trim();
                    }
                }
            }
        } catch (Exception ignored) {
            // Keep graceful fallback for missing/legacy records.
        }

        String seed = profile.getId() != null && !profile.getId().isEmpty()
                ? profile.getId()
                : (profile.getApplicantEmail() != null ? profile.getApplicantEmail() : profile.getFullName());
        if (seed == null || seed.isEmpty()) {
            return "Prefer not to say";
        }

        String[] fallback = {"Male", "Female", "Other"};
        int idx = Math.abs(seed.hashCode()) % fallback.length;
        return fallback[idx];
    }
    
    /**
     * Normalize degree: "Bachelors" -> random degree from predefined list
     * Uses deterministic randomization based on studentId for consistency
     */
    private String normalizeDegree(String degree, String studentId) {
        if (degree == null || degree.trim().isEmpty()) {
            return degree;
        }
        
        String degreeLower = degree.toLowerCase().trim();
        // Check for "bachelors" or "bachelor" (case-insensitive, handles variations)
        if (degreeLower.contains("bachelor") || "bachelors".equals(degreeLower) || "bachelor".equals(degreeLower)) {
            // List of bachelor's degrees
            String[] bachelorDegrees = {
                "BE/B.Tech", "B.Sc", "B.Com", "B.A", "BBA", "BCA", "MBBS", "BDS", "B.Pharm", "B.Ed", "LLB"
            };
            
            // Deterministic selection based on studentId hash
            String seed = (studentId != null && !studentId.isEmpty()) ? studentId : degree;
            int hash = seed.hashCode();
            int index = Math.abs(hash) % bachelorDegrees.length;
            String normalized = bachelorDegrees[index];
            System.out.println("Normalized degree: " + degree + " -> " + normalized + " (seed: " + seed + ")");
            return normalized;
        }
        
        return degree;
    }
    
    /**
     * Normalize specialization: "General" -> random specialization based on degree
     * Uses deterministic randomization based on studentId for consistency
     */
    private String normalizeSpecialization(String degree, String specialization, String studentId) {
        if (specialization == null || specialization.trim().isEmpty()) {
            return specialization;
        }
        
        String specLower = specialization.toLowerCase().trim();
        // Check for "general" (case-insensitive)
        if ("general".equals(specLower) || specLower.contains("general")) {
            // Get streams based on degree
            String[] streams = getStreamsForDegree(degree);
            
            if (streams.length > 0) {
                // Deterministic selection based on studentId hash
                String seed = (studentId != null && !studentId.isEmpty()) ? studentId : specialization;
                int hash = seed.hashCode();
                int index = Math.abs(hash) % streams.length;
                String normalized = streams[index];
                System.out.println("Normalized specialization: " + specialization + " -> " + normalized + " (degree: " + degree + ", seed: " + seed + ")");
                return normalized;
            } else {
                // If no streams found, return "General" as fallback
                System.out.println("No streams found for degree: " + degree + ", keeping specialization: " + specialization);
            }
        }
        
        return specialization;
    }
    
    /**
     * Get available streams for a given degree
     */
    private String[] getStreamsForDegree(String degree) {
        if (degree == null) return new String[0];
        
        String degreeLower = degree.toLowerCase().trim();
        
        // Engineering streams
        if (degreeLower.contains("tech") || degreeLower.contains("b.e") || degreeLower.contains("m.e")) {
            return new String[]{"Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Electrical"};
        }
        
        // BCA/MCA streams
        if (degreeLower.contains("bca") || degreeLower.contains("mca")) {
            return new String[]{"Computer Applications"};
        }
        
        // MBA streams
        if (degreeLower.contains("mba")) {
            return new String[]{"Finance", "Marketing", "HR", "Operations", "IT"};
        }
        
        // BBA streams
        if (degreeLower.contains("bba")) {
            return new String[]{"Finance", "Marketing", "HR"};
        }
        
        // B.Sc/M.Sc streams
        if (degreeLower.contains("b.sc") || degreeLower.contains("m.sc")) {
            return new String[]{"Computer Science", "IT", "Physics", "Chemistry", "Mathematics"};
        }
        
        // B.Com streams
        if (degreeLower.contains("b.com")) {
            return new String[]{"Commerce", "Accounting", "Finance", "Economics", "Business Studies"};
        }
        
        // B.A streams
        if (degreeLower.contains("b.a")) {
            return new String[]{"English", "History", "Political Science", "Economics", "Psychology", "Sociology"};
        }
        
        // MBBS streams
        if (degreeLower.contains("mbbs")) {
            return new String[]{"General Medicine", "Surgery", "Pediatrics", "Cardiology", "Orthopedics"};
        }
        
        // BDS streams
        if (degreeLower.contains("bds")) {
            return new String[]{"Oral Surgery", "Periodontics", "Orthodontics", "Prosthodontics", "Oral Medicine"};
        }
        
        // B.Pharm streams
        if (degreeLower.contains("b.pharm") || degreeLower.contains("pharm")) {
            return new String[]{"Pharmaceutical Chemistry", "Pharmacology", "Pharmaceutics", "Pharmacy Practice"};
        }
        
        // B.Ed streams
        if (degreeLower.contains("b.ed") || degreeLower.contains("bed")) {
            return new String[]{"Education", "Elementary Education", "Secondary Education", "Special Education"};
        }
        
        // LLB streams
        if (degreeLower.contains("llb")) {
            return new String[]{"Criminal Law", "Corporate Law", "Constitutional Law", "International Law", "Civil Law"};
        }
        
        // Default: return empty array
        return new String[0];
    }
    
    /**
     * Normalize institution: "Sample University" -> random university from list
     * Uses deterministic randomization based on studentId for consistency
     */
    private String normalizeInstitution(String institution, String studentId) {
        if (institution == null || institution.trim().isEmpty()) {
            return institution;
        }
        
        String instLower = institution.toLowerCase().trim();
        // Check for "sample university" (case-insensitive, handles variations)
        if (instLower.contains("sample") && instLower.contains("university") || 
            "sample university".equals(instLower) || "sample".equals(instLower)) {
            // List of universities
            String[] universities = {
                "Loyola Institute of Business Administration",
                "Bundelkhand University",
                "Boston University",
                "Oxford University",
                "KNIT Sultanpur",
                "MMMUT",
                "BIET",
                "IIT Delhi",
                "IIT Bombay",
                "IIT Madras",
                "IIT Kanpur",
                "IIT Kharagpur",
                "NIT Trichy",
                "NIT Warangal",
                "BITS Pilani",
                "JNU Delhi",
                "DU Delhi",
                "Jadavpur University",
                "Calcutta University",
                "Mumbai University",
                "Pune University",
                "Anna University",
                "VTU Bangalore",
                "SRM University",
                "VIT Vellore",
                "Manipal University",
                "Amity University",
                "Symbiosis University",
                "LPU Jalandhar",
                "Chandigarh University"
            };
            
            // Deterministic selection based on studentId hash
            String seed = (studentId != null && !studentId.isEmpty()) ? studentId : institution;
            int hash = seed.hashCode();
            int index = Math.abs(hash) % universities.length;
            String normalized = universities[index];
            System.out.println("Normalized institution: " + institution + " -> " + normalized + " (seed: " + seed + ")");
            return normalized;
        }
        
        return institution;
    }
}
