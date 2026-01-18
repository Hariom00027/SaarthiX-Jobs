package com.saarthix.jobs.controller;

import com.saarthix.jobs.model.User;
import com.saarthix.jobs.model.UserProfile;
import com.saarthix.jobs.repository.UserProfileRepository;
import com.saarthix.jobs.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/profile")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class UserProfileController {

    private final UserProfileRepository userProfileRepository;
    private final UserRepository userRepository;

    public UserProfileController(UserProfileRepository userProfileRepository, UserRepository userRepository) {
        this.userProfileRepository = userProfileRepository;
        this.userRepository = userRepository;
    }

    /**
     * Get current user's profile
     */
    @GetMapping
    public ResponseEntity<?> getMyProfile(Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in to view profile");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        Optional<UserProfile> profileOpt = userProfileRepository.findByApplicantEmail(user.getEmail());
        if (profileOpt.isPresent()) {
            return ResponseEntity.ok(profileOpt.get());
        } else {
            return ResponseEntity.status(404).body("Profile not found. Please create your profile first.");
        }
    }

    /**
     * Create or update user profile
     */
    @PostMapping
    public ResponseEntity<?> saveProfile(@RequestBody Map<String, Object> profileData, Authentication auth) {
        try {
            System.out.println("=========================================");
            System.out.println("RECEIVED PROFILE SAVE REQUEST");
            System.out.println("Profile data keys: " + profileData.keySet());
            System.out.println("Full profile data: " + profileData);
            System.out.println("Skills: " + profileData.get("skills"));
            System.out.println("Professional Experiences: " + profileData.get("professionalExperiences"));
            System.out.println("Education Entries: " + profileData.get("educationEntries"));
            System.out.println("Certification Files: " + profileData.get("certificationFiles"));
            System.out.println("Hobbies: " + profileData.get("hobbies"));
            System.out.println("Projects: " + profileData.get("projects"));
            System.out.println("Preferred Locations: " + profileData.get("preferredLocations"));
            System.out.println("=========================================");
            
            // Check authentication
            if (auth == null || !auth.isAuthenticated()) {
                System.err.println("ERROR: User not authenticated");
                return ResponseEntity.status(401).body("Must be logged in to save profile");
            }

            User user = resolveUserFromOAuth(auth);
            if (user == null) {
                System.err.println("ERROR: User not found in database");
                return ResponseEntity.status(401).body("User not found");
            }

            System.out.println("User found: " + user.getEmail() + ", UserType: " + user.getUserType());

            // Check if user is APPLICANT type
            if (!"APPLICANT".equals(user.getUserType())) {
                System.err.println("ERROR: User is not APPLICANT type: " + user.getUserType());
                return ResponseEntity.status(403).body("Only APPLICANT users can create profiles");
            }

            // Check if profile already exists
            Optional<UserProfile> existingProfileOpt = userProfileRepository.findByApplicantEmail(user.getEmail());
            UserProfile profile;
            boolean isNewProfile = !existingProfileOpt.isPresent();

            if (existingProfileOpt.isPresent()) {
                // Update existing profile
                profile = existingProfileOpt.get();
                System.out.println("Updating existing profile with ID: " + profile.getId());
            } else {
                // Create new profile
                profile = new UserProfile();
                profile.setApplicantEmail(user.getEmail());
                profile.setApplicantId(user.getId());
                System.out.println("Creating new profile for user: " + user.getEmail());
            }

            // Update profile fields - ALWAYS set all fields from request to ensure complete state is saved
            // Use getOrDefault to handle missing fields gracefully
            
            // Basic Information
            String fullName = (String) profileData.getOrDefault("fullName", "");
            profile.setFullName(fullName != null ? fullName : "");
            System.out.println("Full Name set: " + (fullName != null && !fullName.isEmpty() ? fullName : "empty"));
            
            String phoneNumber = (String) profileData.getOrDefault("phoneNumber", "");
            profile.setPhoneNumber(phoneNumber != null ? phoneNumber : "");
            System.out.println("Phone Number set: " + (phoneNumber != null && !phoneNumber.isEmpty() ? phoneNumber : "empty"));
            
            String email = (String) profileData.getOrDefault("email", user.getEmail());
            profile.setEmail(email != null ? email : user.getEmail());
            System.out.println("Email set: " + (email != null && !email.isEmpty() ? email : "empty"));

            // Resume information
            String resumeFileName = (String) profileData.getOrDefault("resumeFileName", "");
            profile.setResumeFileName(resumeFileName != null ? resumeFileName : "");
            System.out.println("Resume File Name set: " + (resumeFileName != null && !resumeFileName.isEmpty() ? resumeFileName : "empty"));
            
            String resumeFileType = (String) profileData.getOrDefault("resumeFileType", "");
            profile.setResumeFileType(resumeFileType != null ? resumeFileType : "");
            
            String resumeBase64 = (String) profileData.getOrDefault("resumeBase64", "");
            profile.setResumeBase64(resumeBase64 != null ? resumeBase64 : "");
            System.out.println("Resume Base64 set: " + (resumeBase64 != null && !resumeBase64.isEmpty() ? resumeBase64.length() + " characters" : "empty"));
            
            Object resumeFileSize = profileData.get("resumeFileSize");
            if (resumeFileSize instanceof Number) {
                profile.setResumeFileSize(((Number) resumeFileSize).longValue());
            } else if (resumeFileSize instanceof String) {
                try {
                    profile.setResumeFileSize(Long.parseLong((String) resumeFileSize));
                } catch (NumberFormatException e) {
                    profile.setResumeFileSize(0L);
                }
            } else {
                profile.setResumeFileSize(0L);
            }

            // Profile Picture Information
            String profilePictureFileName = (String) profileData.getOrDefault("profilePictureFileName", "");
            profile.setProfilePictureFileName(profilePictureFileName != null ? profilePictureFileName : "");
            System.out.println("Profile Picture File Name set: " + (profilePictureFileName != null && !profilePictureFileName.isEmpty() ? profilePictureFileName : "empty"));
            
            String profilePictureFileType = (String) profileData.getOrDefault("profilePictureFileType", "");
            profile.setProfilePictureFileType(profilePictureFileType != null ? profilePictureFileType : "");
            
            String profilePictureBase64 = (String) profileData.getOrDefault("profilePictureBase64", "");
            profile.setProfilePictureBase64(profilePictureBase64 != null ? profilePictureBase64 : "");
            System.out.println("Profile Picture Base64 set: " + (profilePictureBase64 != null && !profilePictureBase64.isEmpty() ? profilePictureBase64.length() + " characters" : "empty"));
            
            Object profilePictureFileSize = profileData.get("profilePictureFileSize");
            if (profilePictureFileSize instanceof Number) {
                profile.setProfilePictureFileSize(((Number) profilePictureFileSize).longValue());
            } else if (profilePictureFileSize instanceof String) {
                try {
                    profile.setProfilePictureFileSize(Long.parseLong((String) profilePictureFileSize));
                } catch (NumberFormatException e) {
                    profile.setProfilePictureFileSize(0L);
                }
            } else {
                profile.setProfilePictureFileSize(0L);
            }

            // Professional information
            String currentPosition = (String) profileData.getOrDefault("currentPosition", "");
            profile.setCurrentPosition(currentPosition != null ? currentPosition : "");
            System.out.println("Current Position set: " + (currentPosition != null && !currentPosition.isEmpty() ? currentPosition : "empty"));
            
            String currentCompany = (String) profileData.getOrDefault("currentCompany", "");
            profile.setCurrentCompany(currentCompany != null ? currentCompany : "");
            System.out.println("Current Company set: " + (currentCompany != null && !currentCompany.isEmpty() ? currentCompany : "empty"));
            
            String experience = (String) profileData.getOrDefault("experience", "");
            profile.setExperience(experience != null ? experience : "");
            System.out.println("Experience set: " + (experience != null && !experience.isEmpty() ? experience : "empty"));
            
            // Skills - Always set, even if empty
            Object skillsObj = profileData.get("skills");
            if (skillsObj instanceof List) {
                @SuppressWarnings("unchecked")
                List<String> skillsList = (List<String>) skillsObj;
                profile.setSkills(skillsList != null ? skillsList : new java.util.ArrayList<>());
                System.out.println("Skills set: " + (skillsList != null ? skillsList.size() + " items" : "0 items"));
            } else if (skillsObj instanceof String) {
                String skillsStr = (String) skillsObj;
                if (skillsStr != null && !skillsStr.trim().isEmpty()) {
                    profile.setSkills(List.of(skillsStr.split(",")));
                } else {
                    profile.setSkills(new java.util.ArrayList<>());
                }
            } else {
                profile.setSkills(new java.util.ArrayList<>());
            }
            
            String summary = (String) profileData.getOrDefault("summary", "");
            profile.setSummary(summary != null ? summary : "");
            System.out.println("Summary set: " + (summary != null && !summary.isEmpty() ? summary.substring(0, Math.min(50, summary.length())) + "..." : "empty"));

            // Location preferences
            String currentLocation = (String) profileData.getOrDefault("currentLocation", "");
            profile.setCurrentLocation(currentLocation != null ? currentLocation : "");
            System.out.println("Current Location set: " + (currentLocation != null && !currentLocation.isEmpty() ? currentLocation : "empty"));
            
            String preferredLocation = (String) profileData.getOrDefault("preferredLocation", "");
            profile.setPreferredLocation(preferredLocation != null ? preferredLocation : "");
            
            // Preferred Locations - Always set, even if empty
            Object preferredLocationsObj = profileData.get("preferredLocations");
            if (preferredLocationsObj instanceof List) {
                @SuppressWarnings("unchecked")
                List<String> locationsList = (List<String>) preferredLocationsObj;
                profile.setPreferredLocations(locationsList != null ? locationsList : new java.util.ArrayList<>());
                System.out.println("Preferred locations set: " + (locationsList != null ? locationsList.size() + " items" : "0 items"));
            } else {
                profile.setPreferredLocations(new java.util.ArrayList<>());
            }
            
            String workPreference = (String) profileData.getOrDefault("workPreference", "Remote");
            profile.setWorkPreference(workPreference != null ? workPreference : "Remote");
            System.out.println("Work Preference set: " + workPreference);
            
            Object willingToRelocate = profileData.get("willingToRelocate");
            if (willingToRelocate instanceof Boolean) {
                profile.setWillingToRelocate((Boolean) willingToRelocate);
            } else if (willingToRelocate instanceof String) {
                profile.setWillingToRelocate(Boolean.parseBoolean((String) willingToRelocate));
            } else {
                profile.setWillingToRelocate(false);
            }

            // Contact & Links
            String linkedInUrl = (String) profileData.getOrDefault("linkedInUrl", "");
            profile.setLinkedInUrl(linkedInUrl != null ? linkedInUrl : "");
            System.out.println("LinkedIn URL set: " + (linkedInUrl != null && !linkedInUrl.isEmpty() ? linkedInUrl : "empty"));
            
            String portfolioUrl = (String) profileData.getOrDefault("portfolioUrl", "");
            profile.setPortfolioUrl(portfolioUrl != null ? portfolioUrl : "");
            System.out.println("Portfolio URL set: " + (portfolioUrl != null && !portfolioUrl.isEmpty() ? portfolioUrl : "empty"));
            
            String githubUrl = (String) profileData.getOrDefault("githubUrl", "");
            profile.setGithubUrl(githubUrl != null ? githubUrl : "");
            System.out.println("GitHub URL set: " + (githubUrl != null && !githubUrl.isEmpty() ? githubUrl : "empty"));
            
            String websiteUrl = (String) profileData.getOrDefault("websiteUrl", "");
            profile.setWebsiteUrl(websiteUrl != null ? websiteUrl : "");
            System.out.println("Website URL set: " + (websiteUrl != null && !websiteUrl.isEmpty() ? websiteUrl : "empty"));

            // Additional information
            String availability = (String) profileData.getOrDefault("availability", "Immediately");
            profile.setAvailability(availability != null ? availability : "Immediately");
            System.out.println("Availability set: " + availability);
            
            String expectedSalary = (String) profileData.getOrDefault("expectedSalary", "");
            profile.setExpectedSalary(expectedSalary != null ? expectedSalary : "");
            System.out.println("Expected Salary set: " + (expectedSalary != null && !expectedSalary.isEmpty() ? expectedSalary : "empty"));
            
            String coverLetterTemplate = (String) profileData.getOrDefault("coverLetterTemplate", "");
            profile.setCoverLetterTemplate(coverLetterTemplate != null ? coverLetterTemplate : "");
            System.out.println("Cover Letter Template set: " + (coverLetterTemplate != null && !coverLetterTemplate.isEmpty() ? coverLetterTemplate.length() + " characters" : "empty"));
            
            String education = (String) profileData.getOrDefault("education", "");
            profile.setEducation(education != null ? education : "");
            System.out.println("Education set: " + (education != null && !education.isEmpty() ? education : "empty"));
            
            String certifications = (String) profileData.getOrDefault("certifications", "");
            profile.setCertifications(certifications != null ? certifications : "");
            System.out.println("Certifications set: " + (certifications != null && !certifications.isEmpty() ? certifications : "empty"));

            // Professional Experiences - Always set, even if empty
            Object professionalExperiencesObj = profileData.get("professionalExperiences");
            if (professionalExperiencesObj instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> experiencesList = (List<Map<String, Object>>) professionalExperiencesObj;
                List<UserProfile.ProfessionalExperience> experiences = new java.util.ArrayList<>();
                if (experiencesList != null) {
                    for (Map<String, Object> expMap : experiencesList) {
                        UserProfile.ProfessionalExperience exp = new UserProfile.ProfessionalExperience();
                        exp.setJobTitle((String) expMap.getOrDefault("jobTitle", ""));
                        exp.setCompany((String) expMap.getOrDefault("company", ""));
                        exp.setStartDate((String) expMap.getOrDefault("startDate", ""));
                        exp.setEndDate((String) expMap.getOrDefault("endDate", ""));
                        Object isCurrentJobObj = expMap.get("isCurrentJob");
                        if (isCurrentJobObj instanceof Boolean) {
                            exp.setIsCurrentJob((Boolean) isCurrentJobObj);
                        } else if (isCurrentJobObj instanceof String) {
                            exp.setIsCurrentJob(Boolean.parseBoolean((String) isCurrentJobObj));
                        } else {
                            exp.setIsCurrentJob(false);
                        }
                        exp.setDescription((String) expMap.getOrDefault("description", ""));
                        experiences.add(exp);
                    }
                }
                profile.setProfessionalExperiences(experiences);
                System.out.println("Professional experiences set: " + experiences.size() + " items");
            } else {
                profile.setProfessionalExperiences(new java.util.ArrayList<>());
            }

            // Education Entries - Always set, even if empty
            Object educationEntriesObj = profileData.get("educationEntries");
            if (educationEntriesObj instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> educationList = (List<Map<String, Object>>) educationEntriesObj;
                List<UserProfile.EducationEntry> educationEntries = new java.util.ArrayList<>();
                if (educationList != null) {
                    for (Map<String, Object> eduMap : educationList) {
                        UserProfile.EducationEntry edu = new UserProfile.EducationEntry();
                        edu.setLevel((String) eduMap.getOrDefault("level", ""));
                        edu.setDegree((String) eduMap.getOrDefault("degree", ""));
                        edu.setInstitution((String) eduMap.getOrDefault("institution", ""));
                        edu.setBoard((String) eduMap.getOrDefault("board", ""));
                        edu.setPassingYear((String) eduMap.getOrDefault("passingYear", ""));
                        edu.setPercentage((String) eduMap.getOrDefault("percentage", ""));
                        edu.setStream((String) eduMap.getOrDefault("stream", ""));
                        educationEntries.add(edu);
                    }
                }
                profile.setEducationEntries(educationEntries);
                System.out.println("Education entries set: " + educationEntries.size() + " items");
            } else {
                profile.setEducationEntries(new java.util.ArrayList<>());
            }

            // Certification Files - Always set, even if empty
            Object certificationFilesObj = profileData.get("certificationFiles");
            if (certificationFilesObj instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> certFilesList = (List<Map<String, Object>>) certificationFilesObj;
                List<UserProfile.CertificationFile> certificationFiles = new java.util.ArrayList<>();
                if (certFilesList != null) {
                    for (Map<String, Object> certMap : certFilesList) {
                        UserProfile.CertificationFile cert = new UserProfile.CertificationFile();
                        cert.setName((String) certMap.getOrDefault("name", ""));
                        cert.setFileName((String) certMap.getOrDefault("fileName", ""));
                        cert.setFileType((String) certMap.getOrDefault("fileType", ""));
                        cert.setFileBase64((String) certMap.getOrDefault("fileBase64", ""));
                        Object fileSizeObj = certMap.get("fileSize");
                        if (fileSizeObj instanceof Number) {
                            cert.setFileSize(((Number) fileSizeObj).longValue());
                        } else if (fileSizeObj instanceof String) {
                            try {
                                cert.setFileSize(Long.parseLong((String) fileSizeObj));
                            } catch (NumberFormatException e) {
                                cert.setFileSize(0L);
                            }
                        } else {
                            cert.setFileSize(0L);
                        }
                        cert.setIssuingOrganization((String) certMap.getOrDefault("issuingOrganization", ""));
                        cert.setIssueDate((String) certMap.getOrDefault("issueDate", ""));
                        cert.setExpiryDate((String) certMap.getOrDefault("expiryDate", ""));
                        certificationFiles.add(cert);
                    }
                }
                profile.setCertificationFiles(certificationFiles);
                System.out.println("Certification files set: " + certificationFiles.size() + " items");
            } else {
                profile.setCertificationFiles(new java.util.ArrayList<>());
            }

            // Hobbies - Always set, even if empty
            Object hobbiesObj = profileData.get("hobbies");
            if (hobbiesObj instanceof List) {
                @SuppressWarnings("unchecked")
                List<String> hobbiesList = (List<String>) hobbiesObj;
                profile.setHobbies(hobbiesList != null ? hobbiesList : new java.util.ArrayList<>());
                System.out.println("Hobbies set: " + (hobbiesList != null ? hobbiesList.size() + " items" : "0 items"));
            } else if (hobbiesObj instanceof String) {
                String hobbiesStr = (String) hobbiesObj;
                if (hobbiesStr != null && !hobbiesStr.trim().isEmpty()) {
                    profile.setHobbies(List.of(hobbiesStr.split(",")));
                } else {
                    profile.setHobbies(new java.util.ArrayList<>());
                }
            } else {
                profile.setHobbies(new java.util.ArrayList<>());
            }

            // Projects - Always set, even if empty
            Object projectsObj = profileData.get("projects");
            if (projectsObj instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> projectsList = (List<Map<String, Object>>) projectsObj;
                List<UserProfile.Project> projects = new java.util.ArrayList<>();
                if (projectsList != null) {
                    for (Map<String, Object> projectMap : projectsList) {
                        UserProfile.Project project = new UserProfile.Project();
                        project.setName((String) projectMap.getOrDefault("name", ""));
                        project.setDescription((String) projectMap.getOrDefault("description", ""));
                        project.setGithubLink((String) projectMap.getOrDefault("githubLink", ""));
                        project.setWebsiteLink((String) projectMap.getOrDefault("websiteLink", ""));
                        projects.add(project);
                    }
                }
                profile.setProjects(projects);
                System.out.println("Projects set: " + projects.size() + " items");
            } else {
                profile.setProjects(new java.util.ArrayList<>());
            }

            // Update lastUpdated timestamp
            profile.setLastUpdated(java.time.LocalDateTime.now());
            
            // Set createdAt only for new profiles
            if (isNewProfile) {
                profile.setCreatedAt(java.time.LocalDateTime.now());
            }

            System.out.println("=========================================");
            System.out.println("SAVING COMPLETE PROFILE TO MONGODB");
            System.out.println("Collection: user_profiles");
            System.out.println("Is New Profile: " + isNewProfile);
            System.out.println("=========================================");
            
            UserProfile saved = userProfileRepository.save(profile);
            
            System.out.println("=========================================");
            System.out.println("PROFILE SAVED SUCCESSFULLY TO MONGODB");
            System.out.println("Profile ID: " + saved.getId());
            System.out.println("Applicant Email: " + saved.getApplicantEmail());
            System.out.println("Full Name: " + (saved.getFullName() != null ? saved.getFullName() : "empty"));
            System.out.println("Skills Count: " + (saved.getSkills() != null ? saved.getSkills().size() : 0));
            System.out.println("Professional Experiences Count: " + (saved.getProfessionalExperiences() != null ? saved.getProfessionalExperiences().size() : 0));
            System.out.println("Education Entries Count: " + (saved.getEducationEntries() != null ? saved.getEducationEntries().size() : 0));
            System.out.println("Certification Files Count: " + (saved.getCertificationFiles() != null ? saved.getCertificationFiles().size() : 0));
            System.out.println("Hobbies Count: " + (saved.getHobbies() != null ? saved.getHobbies().size() : 0));
            System.out.println("Projects Count: " + (saved.getProjects() != null ? saved.getProjects().size() : 0));
            System.out.println("Last Updated: " + saved.getLastUpdated());
            System.out.println("=========================================");
            
            System.out.println("=========================================");
            System.out.println("USER PROFILE SAVED TO MONGODB DATABASE");
            System.out.println("Collection: user_profiles");
            System.out.println("Profile ID: " + saved.getId());
            System.out.println("Applicant Email: " + saved.getApplicantEmail());
            System.out.println("Applicant ID: " + saved.getApplicantId());
            System.out.println("Full Name: " + saved.getFullName());
            System.out.println("Phone: " + saved.getPhoneNumber());
            System.out.println("Email: " + saved.getEmail());
            System.out.println("Current Position: " + saved.getCurrentPosition());
            System.out.println("Current Company: " + saved.getCurrentCompany());
            System.out.println("Experience: " + saved.getExperience());
            System.out.println("Skills: " + (saved.getSkills() != null ? saved.getSkills().toString() : "Not provided"));
            System.out.println("Summary: " + (saved.getSummary() != null && !saved.getSummary().isEmpty() ? saved.getSummary().substring(0, Math.min(50, saved.getSummary().length())) + "..." : "Not provided"));
            System.out.println("Current Location: " + saved.getCurrentLocation());
            System.out.println("Preferred Location: " + saved.getPreferredLocation());
            System.out.println("Work Preference: " + saved.getWorkPreference());
            System.out.println("Willing to Relocate: " + saved.getWillingToRelocate());
            System.out.println("LinkedIn: " + (saved.getLinkedInUrl() != null && !saved.getLinkedInUrl().isEmpty() ? saved.getLinkedInUrl() : "Not provided"));
            System.out.println("Portfolio: " + (saved.getPortfolioUrl() != null && !saved.getPortfolioUrl().isEmpty() ? saved.getPortfolioUrl() : "Not provided"));
            System.out.println("GitHub: " + (saved.getGithubUrl() != null && !saved.getGithubUrl().isEmpty() ? saved.getGithubUrl() : "Not provided"));
            System.out.println("Website: " + (saved.getWebsiteUrl() != null && !saved.getWebsiteUrl().isEmpty() ? saved.getWebsiteUrl() : "Not provided"));
            System.out.println("Availability: " + saved.getAvailability());
            System.out.println("Expected Salary: " + (saved.getExpectedSalary() != null && !saved.getExpectedSalary().isEmpty() ? saved.getExpectedSalary() : "Not provided"));
            System.out.println("Education: " + (saved.getEducation() != null && !saved.getEducation().isEmpty() ? saved.getEducation() : "Not provided"));
            System.out.println("Certifications: " + (saved.getCertifications() != null && !saved.getCertifications().isEmpty() ? saved.getCertifications() : "Not provided"));
            System.out.println("Resume File: " + (saved.getResumeFileName() != null && !saved.getResumeFileName().isEmpty() ? saved.getResumeFileName() + " (" + (saved.getResumeFileSize() != null ? saved.getResumeFileSize() + " bytes" : "N/A") + ")" : "Not provided"));
            System.out.println("Cover Letter Template Length: " + (saved.getCoverLetterTemplate() != null ? saved.getCoverLetterTemplate().length() + " characters" : "Not provided"));
            System.out.println("Education Entries: " + (saved.getEducationEntries() != null ? saved.getEducationEntries().size() + " items" : "Not provided"));
            System.out.println("Certification Files: " + (saved.getCertificationFiles() != null ? saved.getCertificationFiles().size() + " items" : "Not provided"));
            System.out.println("Professional Experiences: " + (saved.getProfessionalExperiences() != null ? saved.getProfessionalExperiences().size() + " items" : "Not provided"));
            System.out.println("Hobbies: " + (saved.getHobbies() != null ? saved.getHobbies().size() + " items" : "Not provided"));
            System.out.println("Projects: " + (saved.getProjects() != null ? saved.getProjects().size() + " items" : "Not provided"));
            System.out.println("Last Updated: " + saved.getLastUpdated());
            System.out.println("=========================================");
            
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            System.err.println("Error saving profile: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error saving profile: " + e.getMessage());
        }
    }

    /**
     * Update user profile (PUT method)
     */
    @PutMapping
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> profileData, Authentication auth) {
        // PUT is same as POST for this use case
        return saveProfile(profileData, auth);
    }

    /**
     * Helper method to extract user from OAuth2 principal
     */
    private User resolveUserFromOAuth(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return null;
        }

        Object principal = auth.getPrincipal();

        if (principal instanceof OAuth2User oauthUser) {
            String email = oauthUser.getAttribute("email");
            if (email != null) {
                return userRepository.findByEmail(email).orElse(null);
            }
        }

        return null;
    }
}

