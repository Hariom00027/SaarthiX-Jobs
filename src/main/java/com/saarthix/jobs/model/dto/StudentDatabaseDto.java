package com.saarthix.jobs.model.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for Student Database responses
 * Filters sensitive data based on subscription type
 */
public class StudentDatabaseDto {
    private String studentId;
    private String fullName;
    private String email;  // Hidden for FREE users
    private String phoneNumber;  // Hidden for FREE users
    private String gender;  // Gender
    private String profilePictureBase64;
    
    // Education info
    private String degree;
    private String specialization;
    private String institution;
    private String graduationYear;
    private List<EducationDto> educationEntries;
    
    // Professional info
    private List<String> skills;
    private String experience;
    private String summary;
    private List<ProfessionalExperienceDto> professionalExperiences;
    
    // Location
    private String currentLocation;
    private List<String> preferredLocations;
    private String workPreference;
    
    // Links
    private String linkedInUrl;
    private String portfolioUrl;
    private String githubUrl;
    
    // Additional info
    private String availability;
    private List<String> hobbies;
    private List<ProjectDto> projects;
    
    // Hackathons and jobs
    private Integer hackathonsParticipated;
    private List<String> hackathonNames;
    private Integer jobsApplied;
    
    // Resume info (controlled access)
    private String resumeFileName;
    private Boolean resumeAvailable;
    private String resumeBase64;  // Only for PAID users, blurred for FREE
    
    // Profile completeness
    private Integer profileCompletenessScore;
    
    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime lastUpdated;
    
    // Shortlist status (for current industry user)
    private Boolean isShortlisted;
    
    // Constructor
    public StudentDatabaseDto() {}
    
    // Getters and Setters
    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    
    public String getProfilePictureBase64() { return profilePictureBase64; }
    public void setProfilePictureBase64(String profilePictureBase64) { this.profilePictureBase64 = profilePictureBase64; }
    
    public String getDegree() { return degree; }
    public void setDegree(String degree) { this.degree = degree; }
    
    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }
    
    public String getInstitution() { return institution; }
    public void setInstitution(String institution) { this.institution = institution; }
    
    public String getGraduationYear() { return graduationYear; }
    public void setGraduationYear(String graduationYear) { this.graduationYear = graduationYear; }
    
    public List<EducationDto> getEducationEntries() { return educationEntries; }
    public void setEducationEntries(List<EducationDto> educationEntries) { this.educationEntries = educationEntries; }
    
    public List<String> getSkills() { return skills; }
    public void setSkills(List<String> skills) { this.skills = skills; }
    
    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }
    
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    
    public List<ProfessionalExperienceDto> getProfessionalExperiences() { return professionalExperiences; }
    public void setProfessionalExperiences(List<ProfessionalExperienceDto> professionalExperiences) { this.professionalExperiences = professionalExperiences; }
    
    public String getCurrentLocation() { return currentLocation; }
    public void setCurrentLocation(String currentLocation) { this.currentLocation = currentLocation; }
    
    public List<String> getPreferredLocations() { return preferredLocations; }
    public void setPreferredLocations(List<String> preferredLocations) { this.preferredLocations = preferredLocations; }
    
    public String getWorkPreference() { return workPreference; }
    public void setWorkPreference(String workPreference) { this.workPreference = workPreference; }
    
    public String getLinkedInUrl() { return linkedInUrl; }
    public void setLinkedInUrl(String linkedInUrl) { this.linkedInUrl = linkedInUrl; }
    
    public String getPortfolioUrl() { return portfolioUrl; }
    public void setPortfolioUrl(String portfolioUrl) { this.portfolioUrl = portfolioUrl; }
    
    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String githubUrl) { this.githubUrl = githubUrl; }
    
    public String getAvailability() { return availability; }
    public void setAvailability(String availability) { this.availability = availability; }
    
    public List<String> getHobbies() { return hobbies; }
    public void setHobbies(List<String> hobbies) { this.hobbies = hobbies; }
    
    public List<ProjectDto> getProjects() { return projects; }
    public void setProjects(List<ProjectDto> projects) { this.projects = projects; }
    
    public Integer getHackathonsParticipated() { return hackathonsParticipated; }
    public void setHackathonsParticipated(Integer hackathonsParticipated) { this.hackathonsParticipated = hackathonsParticipated; }
    
    public List<String> getHackathonNames() { return hackathonNames; }
    public void setHackathonNames(List<String> hackathonNames) { this.hackathonNames = hackathonNames; }
    
    public Integer getJobsApplied() { return jobsApplied; }
    public void setJobsApplied(Integer jobsApplied) { this.jobsApplied = jobsApplied; }
    
    public String getResumeFileName() { return resumeFileName; }
    public void setResumeFileName(String resumeFileName) { this.resumeFileName = resumeFileName; }
    
    public Boolean getResumeAvailable() { return resumeAvailable; }
    public void setResumeAvailable(Boolean resumeAvailable) { this.resumeAvailable = resumeAvailable; }
    
    public String getResumeBase64() { return resumeBase64; }
    public void setResumeBase64(String resumeBase64) { this.resumeBase64 = resumeBase64; }
    
    public Integer getProfileCompletenessScore() { return profileCompletenessScore; }
    public void setProfileCompletenessScore(Integer profileCompletenessScore) { this.profileCompletenessScore = profileCompletenessScore; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
    
    public Boolean getIsShortlisted() { return isShortlisted; }
    public void setIsShortlisted(Boolean isShortlisted) { this.isShortlisted = isShortlisted; }
    
    // Inner DTOs
    public static class EducationDto {
        private String level;
        private String degree;
        private String institution;
        private String board;
        private String passingYear;
        private String percentage;
        private String stream;
        
        public EducationDto() {}
        
        public String getLevel() { return level; }
        public void setLevel(String level) { this.level = level; }
        
        public String getDegree() { return degree; }
        public void setDegree(String degree) { this.degree = degree; }
        
        public String getInstitution() { return institution; }
        public void setInstitution(String institution) { this.institution = institution; }
        
        public String getBoard() { return board; }
        public void setBoard(String board) { this.board = board; }
        
        public String getPassingYear() { return passingYear; }
        public void setPassingYear(String passingYear) { this.passingYear = passingYear; }
        
        public String getPercentage() { return percentage; }
        public void setPercentage(String percentage) { this.percentage = percentage; }
        
        public String getStream() { return stream; }
        public void setStream(String stream) { this.stream = stream; }
    }
    
    public static class ProfessionalExperienceDto {
        private String jobTitle;
        private String company;
        private String startDate;
        private String endDate;
        private Boolean isCurrentJob;
        private String description;
        
        public ProfessionalExperienceDto() {}
        
        public String getJobTitle() { return jobTitle; }
        public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }
        
        public String getCompany() { return company; }
        public void setCompany(String company) { this.company = company; }
        
        public String getStartDate() { return startDate; }
        public void setStartDate(String startDate) { this.startDate = startDate; }
        
        public String getEndDate() { return endDate; }
        public void setEndDate(String endDate) { this.endDate = endDate; }
        
        public Boolean getIsCurrentJob() { return isCurrentJob; }
        public void setIsCurrentJob(Boolean isCurrentJob) { this.isCurrentJob = isCurrentJob; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }
    
    public static class ProjectDto {
        private String name;
        private String description;
        private String githubLink;
        private String websiteLink;
        
        public ProjectDto() {}
        
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        
        public String getGithubLink() { return githubLink; }
        public void setGithubLink(String githubLink) { this.githubLink = githubLink; }
        
        public String getWebsiteLink() { return websiteLink; }
        public void setWebsiteLink(String websiteLink) { this.websiteLink = websiteLink; }
    }
}
