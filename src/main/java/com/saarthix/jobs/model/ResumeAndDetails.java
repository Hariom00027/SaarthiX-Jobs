package com.saarthix.jobs.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "resume_and_details")
public class ResumeAndDetails {
    @Id
    private String id;
    
    // Job Information
    private String jobId;
    private String jobTitle;
    private String company;
    private String location;
    private String jobDescription;
    
    // Applicant Information
    private String applicantEmail;
    private String applicantId;
    private String fullName;
    private String phoneNumber;
    
    // Resume Information
    private String resumeFileName;
    private String resumeFileType;  // e.g., "application/pdf", "application/msword"
    private String resumeBase64;    // Base64 encoded resume file
    private Long resumeFileSize;    // File size in bytes
    
    // Additional Information
    private String coverLetter;
    private String linkedInUrl;
    private String portfolioUrl;
    private String experience;      // Years of experience
    private String availability;    // e.g., "Immediately", "2 weeks notice", etc.
    
    // Status and Timestamps
    private String status = "pending";
    private LocalDateTime appliedAt = LocalDateTime.now();
    private LocalDateTime lastUpdated = LocalDateTime.now();

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public String getJobTitle() { return jobTitle; }
    public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }

    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getJobDescription() { return jobDescription; }
    public void setJobDescription(String jobDescription) { this.jobDescription = jobDescription; }

    public String getApplicantEmail() { return applicantEmail; }
    public void setApplicantEmail(String applicantEmail) { this.applicantEmail = applicantEmail; }

    public String getApplicantId() { return applicantId; }
    public void setApplicantId(String applicantId) { this.applicantId = applicantId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getResumeFileName() { return resumeFileName; }
    public void setResumeFileName(String resumeFileName) { this.resumeFileName = resumeFileName; }

    public String getResumeFileType() { return resumeFileType; }
    public void setResumeFileType(String resumeFileType) { this.resumeFileType = resumeFileType; }

    public String getResumeBase64() { return resumeBase64; }
    public void setResumeBase64(String resumeBase64) { this.resumeBase64 = resumeBase64; }

    public Long getResumeFileSize() { return resumeFileSize; }
    public void setResumeFileSize(Long resumeFileSize) { this.resumeFileSize = resumeFileSize; }

    public String getCoverLetter() { return coverLetter; }
    public void setCoverLetter(String coverLetter) { this.coverLetter = coverLetter; }

    public String getLinkedInUrl() { return linkedInUrl; }
    public void setLinkedInUrl(String linkedInUrl) { this.linkedInUrl = linkedInUrl; }

    public String getPortfolioUrl() { return portfolioUrl; }
    public void setPortfolioUrl(String portfolioUrl) { this.portfolioUrl = portfolioUrl; }

    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }

    public String getAvailability() { return availability; }
    public void setAvailability(String availability) { this.availability = availability; }

    public String getStatus() { return status; }
    public void setStatus(String status) { 
        this.status = status;
        this.lastUpdated = LocalDateTime.now();
    }

    public LocalDateTime getAppliedAt() { return appliedAt; }
    public void setAppliedAt(LocalDateTime appliedAt) { this.appliedAt = appliedAt; }

    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
}

