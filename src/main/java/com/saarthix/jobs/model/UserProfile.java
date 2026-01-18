package com.saarthix.jobs.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "user_profiles")
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserProfile {
    @Id
    private String id;
    
    // User Information
    private String applicantEmail;
    private String applicantId;
    private String fullName;
    private String phoneNumber;
    private String email;  // Additional email if different
    
    // Profile Picture
    private String profilePictureFileName;
    private String profilePictureFileType;
    private String profilePictureBase64;    // Base64 encoded profile picture
    private Long profilePictureFileSize;
    
    // Resume Information
    private String resumeFileName;
    private String resumeFileType;
    private String resumeBase64;    // Base64 encoded resume file
    private Long resumeFileSize;
    
    // Professional Information
    private String currentPosition;  // Keep for backward compatibility
    private String currentCompany;   // Keep for backward compatibility
    private String experience;       // Years of experience
    private List<ProfessionalExperience> professionalExperiences;  // Multiple professional experiences
    private List<String> skills;    // List of skills
    private String summary;         // Professional summary/bio
    
    // Location Preferences
    private String currentLocation;
    private List<String> preferredLocations;  // Multiple preferred locations
    private String preferredLocation;  // Keep for backward compatibility
    private String workPreference;  // Remote, On-site, Hybrid
    private Boolean willingToRelocate;
    
    // Contact & Links
    private String linkedInUrl;
    private String portfolioUrl;
    private String githubUrl;
    private String websiteUrl;
    
    // Additional Information
    private String availability;    // e.g., "Immediately", "2 weeks notice", etc.
    private String expectedSalary;
    private String coverLetterTemplate;  // Default cover letter template
    
    // Education (optional)
    private String education;  // Keep for backward compatibility
    private List<EducationEntry> educationEntries;  // Multiple education entries (Class 12th, Graduation, etc.)
    private String certifications;  // Keep for backward compatibility
    private List<CertificationFile> certificationFiles;  // Multiple certification files
    
    // Hobbies & Interests
    private List<String> hobbies;
    
    // Projects
    private List<Project> projects;
    
    // Timestamps
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime lastUpdated = LocalDateTime.now();

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getApplicantEmail() { return applicantEmail; }
    public void setApplicantEmail(String applicantEmail) { this.applicantEmail = applicantEmail; }

    public String getApplicantId() { return applicantId; }
    public void setApplicantId(String applicantId) { this.applicantId = applicantId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getProfilePictureFileName() { return profilePictureFileName; }
    public void setProfilePictureFileName(String profilePictureFileName) { this.profilePictureFileName = profilePictureFileName; }

    public String getProfilePictureFileType() { return profilePictureFileType; }
    public void setProfilePictureFileType(String profilePictureFileType) { this.profilePictureFileType = profilePictureFileType; }

    public String getProfilePictureBase64() { return profilePictureBase64; }
    public void setProfilePictureBase64(String profilePictureBase64) { this.profilePictureBase64 = profilePictureBase64; }

    public Long getProfilePictureFileSize() { return profilePictureFileSize; }
    public void setProfilePictureFileSize(Long profilePictureFileSize) { this.profilePictureFileSize = profilePictureFileSize; }

    public String getResumeFileName() { return resumeFileName; }
    public void setResumeFileName(String resumeFileName) { this.resumeFileName = resumeFileName; }

    public String getResumeFileType() { return resumeFileType; }
    public void setResumeFileType(String resumeFileType) { this.resumeFileType = resumeFileType; }

    public String getResumeBase64() { return resumeBase64; }
    public void setResumeBase64(String resumeBase64) { this.resumeBase64 = resumeBase64; }

    public Long getResumeFileSize() { return resumeFileSize; }
    public void setResumeFileSize(Long resumeFileSize) { this.resumeFileSize = resumeFileSize; }

    public String getCurrentPosition() { return currentPosition; }
    public void setCurrentPosition(String currentPosition) { this.currentPosition = currentPosition; }

    public String getCurrentCompany() { return currentCompany; }
    public void setCurrentCompany(String currentCompany) { this.currentCompany = currentCompany; }

    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }

    public List<String> getSkills() { return skills; }
    public void setSkills(List<String> skills) { this.skills = skills; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getCurrentLocation() { return currentLocation; }
    public void setCurrentLocation(String currentLocation) { this.currentLocation = currentLocation; }

    public String getPreferredLocation() { return preferredLocation; }
    public void setPreferredLocation(String preferredLocation) { this.preferredLocation = preferredLocation; }

    public List<String> getPreferredLocations() { return preferredLocations; }
    public void setPreferredLocations(List<String> preferredLocations) { this.preferredLocations = preferredLocations; }

    public String getWorkPreference() { return workPreference; }
    public void setWorkPreference(String workPreference) { this.workPreference = workPreference; }

    public Boolean getWillingToRelocate() { return willingToRelocate; }
    public void setWillingToRelocate(Boolean willingToRelocate) { this.willingToRelocate = willingToRelocate; }

    public String getLinkedInUrl() { return linkedInUrl; }
    public void setLinkedInUrl(String linkedInUrl) { this.linkedInUrl = linkedInUrl; }

    public String getPortfolioUrl() { return portfolioUrl; }
    public void setPortfolioUrl(String portfolioUrl) { this.portfolioUrl = portfolioUrl; }

    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String githubUrl) { this.githubUrl = githubUrl; }

    public String getWebsiteUrl() { return websiteUrl; }
    public void setWebsiteUrl(String websiteUrl) { this.websiteUrl = websiteUrl; }

    public String getAvailability() { return availability; }
    public void setAvailability(String availability) { this.availability = availability; }

    public String getExpectedSalary() { return expectedSalary; }
    public void setExpectedSalary(String expectedSalary) { this.expectedSalary = expectedSalary; }

    public String getCoverLetterTemplate() { return coverLetterTemplate; }
    public void setCoverLetterTemplate(String coverLetterTemplate) { this.coverLetterTemplate = coverLetterTemplate; }

    public String getEducation() { return education; }
    public void setEducation(String education) { this.education = education; }

    public List<EducationEntry> getEducationEntries() { return educationEntries; }
    public void setEducationEntries(List<EducationEntry> educationEntries) { this.educationEntries = educationEntries; }

    public String getCertifications() { return certifications; }
    public void setCertifications(String certifications) { this.certifications = certifications; }

    public List<CertificationFile> getCertificationFiles() { return certificationFiles; }
    public void setCertificationFiles(List<CertificationFile> certificationFiles) { this.certificationFiles = certificationFiles; }

    public List<ProfessionalExperience> getProfessionalExperiences() { return professionalExperiences; }
    public void setProfessionalExperiences(List<ProfessionalExperience> professionalExperiences) { this.professionalExperiences = professionalExperiences; }

    public List<String> getHobbies() { return hobbies; }
    public void setHobbies(List<String> hobbies) { this.hobbies = hobbies; }

    public List<Project> getProjects() { return projects; }
    public void setProjects(List<Project> projects) { this.projects = projects; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }

    // Inner class for Professional Experience
    public static class ProfessionalExperience {
        // Empty constructor for MongoDB
        public ProfessionalExperience() {}
        private String jobTitle;
        private String company;
        private String startDate;
        private String endDate;
        private Boolean isCurrentJob;
        private String description;

        // Getters and setters
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

    // Inner class for Education Entry
    public static class EducationEntry {
        // Empty constructor for MongoDB
        public EducationEntry() {}
        private String level;  // "Class 12th", "Graduation", "Post Graduation", etc.
        private String degree;  // "B.Tech", "B.Sc", "M.Tech", etc.
        private String institution;
        private String board;  // For Class 12th
        private String passingYear;
        private String percentage;
        private String stream;  // Science, Commerce, Arts, etc.

        // Getters and setters
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

    // Inner class for Certification File
    public static class CertificationFile {
        // Empty constructor for MongoDB
        public CertificationFile() {}
        private String name;
        private String fileName;
        private String fileType;
        private String fileBase64;
        private Long fileSize;
        private String issuingOrganization;
        private String issueDate;
        private String expiryDate;

        // Getters and setters
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }

        public String getFileType() { return fileType; }
        public void setFileType(String fileType) { this.fileType = fileType; }

        public String getFileBase64() { return fileBase64; }
        public void setFileBase64(String fileBase64) { this.fileBase64 = fileBase64; }

        public Long getFileSize() { return fileSize; }
        public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

        public String getIssuingOrganization() { return issuingOrganization; }
        public void setIssuingOrganization(String issuingOrganization) { this.issuingOrganization = issuingOrganization; }

        public String getIssueDate() { return issueDate; }
        public void setIssueDate(String issueDate) { this.issueDate = issueDate; }

        public String getExpiryDate() { return expiryDate; }
        public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }
    }

    // Inner class for Project
    public static class Project {
        // Empty constructor for MongoDB
        public Project() {}
        private String name;
        private String description;
        private String githubLink;
        private String websiteLink;

        // Getters and setters
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

