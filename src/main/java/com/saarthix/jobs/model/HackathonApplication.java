package com.saarthix.jobs.model;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Document("hackathon_applications")
@JsonIgnoreProperties(ignoreUnknown = true)
public class HackathonApplication {

    @Id
    private String id;

    private String hackathonId;
    private String applicantId;

    @JsonProperty("asTeam")
    private Boolean asTeam = false;

    private String teamName;
    private int teamSize = 1;

    private List<TeamMember> teamMembers = new ArrayList<>();

    // Individual applicant details (when asTeam = false)
    private String individualName;
    private String individualEmail;
    private String individualPhone;
    private String individualQualifications;

    private LocalDateTime appliedAt;

    private String currentPhaseId;
    private String status; // "ACTIVE", "REJECTED", "COMPLETED"
    private String rejectionMessage; // Message from industry when rejecting the application

    // Map phaseId -> PhaseSubmission
    private java.util.Map<String, PhaseSubmission> phaseSubmissions = new java.util.HashMap<>();

    // Result and Ranking fields
    private Integer finalRank; // 1, 2, 3, or null for others
    private Double totalScore; // Sum of all phase scores
    private String certificateUrl; // URL to generated certificate

    // Certificate customization (per application; backend source of truth)
    // Template id selected by industry (e.g. "template1"..."template4")
    private String certificateTemplateId;
    // Visual customization coming from publisher screen
    private String certificateLogoUrl;
    private String certificatePlatformLogoUrl;
    private String certificateCustomMessage;
    private String certificateSignatureLeftUrl;
    private String certificateSignatureRightUrl;

    private ShowcaseContent showcaseContent; // For top 3 winners

    // Default Constructor
    public HackathonApplication() {
        this.asTeam = false;
        this.teamSize = 1;
        this.status = "ACTIVE";
    }

    // Getters & Setters

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getHackathonId() {
        return hackathonId;
    }

    public void setHackathonId(String hackathonId) {
        this.hackathonId = hackathonId;
    }

    public String getApplicantId() {
        return applicantId;
    }

    public void setApplicantId(String applicantId) {
        this.applicantId = applicantId;
    }

    public Boolean getAsTeam() {
        return asTeam != null ? asTeam : false;
    }

    public void setAsTeam(Boolean asTeam) {
        this.asTeam = asTeam != null ? asTeam : false;
    }

    public String getTeamName() {
        return teamName;
    }

    public void setTeamName(String teamName) {
        this.teamName = teamName;
    }

    public int getTeamSize() {
        return teamSize > 0 ? teamSize : 1;
    }

    public void setTeamSize(int teamSize) {
        this.teamSize = teamSize > 0 ? teamSize : 1;
    }

    public List<TeamMember> getTeamMembers() {
        return teamMembers;
    }

    public void setTeamMembers(List<TeamMember> teamMembers) {
        this.teamMembers = teamMembers;
    }

    public String getIndividualName() {
        return individualName;
    }

    public void setIndividualName(String individualName) {
        this.individualName = individualName;
    }

    public String getIndividualEmail() {
        return individualEmail;
    }

    public void setIndividualEmail(String individualEmail) {
        this.individualEmail = individualEmail;
    }

    public String getIndividualPhone() {
        return individualPhone;
    }

    public void setIndividualPhone(String individualPhone) {
        this.individualPhone = individualPhone;
    }

    public String getIndividualQualifications() {
        return individualQualifications;
    }

    public void setIndividualQualifications(String individualQualifications) {
        this.individualQualifications = individualQualifications;
    }

    public LocalDateTime getAppliedAt() {
        return appliedAt;
    }

    public void setAppliedAt(LocalDateTime appliedAt) {
        this.appliedAt = appliedAt;
    }

    public String getCurrentPhaseId() {
        return currentPhaseId;
    }

    public void setCurrentPhaseId(String currentPhaseId) {
        this.currentPhaseId = currentPhaseId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRejectionMessage() {
        return rejectionMessage;
    }

    public void setRejectionMessage(String rejectionMessage) {
        this.rejectionMessage = rejectionMessage;
    }

    public String getCertificateTemplateId() {
        return certificateTemplateId;
    }

    public void setCertificateTemplateId(String certificateTemplateId) {
        this.certificateTemplateId = certificateTemplateId;
    }

    public String getCertificateLogoUrl() {
        return certificateLogoUrl;
    }

    public void setCertificateLogoUrl(String certificateLogoUrl) {
        this.certificateLogoUrl = certificateLogoUrl;
    }

    public String getCertificatePlatformLogoUrl() {
        return certificatePlatformLogoUrl;
    }

    public void setCertificatePlatformLogoUrl(String certificatePlatformLogoUrl) {
        this.certificatePlatformLogoUrl = certificatePlatformLogoUrl;
    }

    public String getCertificateCustomMessage() {
        return certificateCustomMessage;
    }

    public void setCertificateCustomMessage(String certificateCustomMessage) {
        this.certificateCustomMessage = certificateCustomMessage;
    }

    public String getCertificateSignatureLeftUrl() {
        return certificateSignatureLeftUrl;
    }

    public void setCertificateSignatureLeftUrl(String certificateSignatureLeftUrl) {
        this.certificateSignatureLeftUrl = certificateSignatureLeftUrl;
    }

    public String getCertificateSignatureRightUrl() {
        return certificateSignatureRightUrl;
    }

    public void setCertificateSignatureRightUrl(String certificateSignatureRightUrl) {
        this.certificateSignatureRightUrl = certificateSignatureRightUrl;
    }

    public java.util.Map<String, PhaseSubmission> getPhaseSubmissions() {
        return phaseSubmissions;
    }

    public void setPhaseSubmissions(java.util.Map<String, PhaseSubmission> phaseSubmissions) {
        this.phaseSubmissions = phaseSubmissions;
    }

    // Inner class for Team Member details
    public static class TeamMember {
        private String name;
        private String email;
        private String phone;
        private String role; // "Team Lead" or "Member"
        private String certificateUrl;
        private String certificateName; // Customized name for certificate (if different from actual name)

        public TeamMember() {
        }

        public TeamMember(String name, String email, String phone, String role) {
            this.name = name;
            this.email = email;
            this.phone = phone;
            this.role = role;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getCertificateUrl() {
            return certificateUrl;
        }

        public void setCertificateUrl(String certificateUrl) {
            this.certificateUrl = certificateUrl;
        }

        public String getCertificateName() {
            return certificateName;
        }

        public void setCertificateName(String certificateName) {
            this.certificateName = certificateName;
        }
    }

    // Inner class for Phase Submission details
    public static class PhaseSubmission {
        private String solutionStatement; // For initial phase or text submissions
        private String fileUrl; // For file uploads
        private String fileName;
        private String submissionLink; // For URL submissions (GitHub, Project Link)
        private LocalDateTime submittedAt;

        private String status; // "PENDING", "ACCEPTED", "REJECTED", "REUPLOAD_REQUESTED"
        private String remarks;
        private Integer score;
        private Integer reuploadCount = 0; // Track how many times re-upload has been requested
        private Boolean isReuploaded = false; // Track if this solution is a re-upload (was submitted after REUPLOAD_REQUESTED)

        public PhaseSubmission() {
            this.status = "PENDING";
            this.submittedAt = LocalDateTime.now();
            this.reuploadCount = 0;
        }

        public String getSolutionStatement() {
            return solutionStatement;
        }

        public void setSolutionStatement(String solutionStatement) {
            this.solutionStatement = solutionStatement;
        }

        public String getFileUrl() {
            return fileUrl;
        }

        public void setFileUrl(String fileUrl) {
            this.fileUrl = fileUrl;
        }

        public String getFileName() {
            return fileName;
        }

        public void setFileName(String fileName) {
            this.fileName = fileName;
        }

        public String getSubmissionLink() {
            return submissionLink;
        }

        public void setSubmissionLink(String submissionLink) {
            this.submissionLink = submissionLink;
        }

        public LocalDateTime getSubmittedAt() {
            return submittedAt;
        }

        public void setSubmittedAt(LocalDateTime submittedAt) {
            this.submittedAt = submittedAt;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getRemarks() {
            return remarks;
        }

        public void setRemarks(String remarks) {
            this.remarks = remarks;
        }

        public Integer getScore() {
            return score;
        }

        public void setScore(Integer score) {
            this.score = score;
        }

        public Integer getReuploadCount() {
            return reuploadCount != null ? reuploadCount : 0;
        }

        public void setReuploadCount(Integer reuploadCount) {
            this.reuploadCount = reuploadCount != null ? reuploadCount : 0;
        }

        public Boolean getIsReuploaded() {
            return isReuploaded != null ? isReuploaded : false;
        }

        public void setIsReuploaded(Boolean isReuploaded) {
            this.isReuploaded = isReuploaded != null ? isReuploaded : false;
        }
    }

    // Inner class for Showcase Content (for top 3 winners)
    public static class ShowcaseContent {
        private String title;
        private String description;
        private String innovationHighlights;
        private List<String> fileUrls = new ArrayList<>();
        private LocalDateTime publishedAt;

        public ShowcaseContent() {
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getInnovationHighlights() {
            return innovationHighlights;
        }

        public void setInnovationHighlights(String innovationHighlights) {
            this.innovationHighlights = innovationHighlights;
        }

        public List<String> getFileUrls() {
            return fileUrls;
        }

        public void setFileUrls(List<String> fileUrls) {
            this.fileUrls = fileUrls;
        }

        public LocalDateTime getPublishedAt() {
            return publishedAt;
        }

        public void setPublishedAt(LocalDateTime publishedAt) {
            this.publishedAt = publishedAt;
        }
    }

    // Getters and Setters for Result fields
    public Integer getFinalRank() {
        return finalRank;
    }

    public void setFinalRank(Integer finalRank) {
        this.finalRank = finalRank;
    }

    public Double getTotalScore() {
        return totalScore;
    }

    public void setTotalScore(Double totalScore) {
        this.totalScore = totalScore;
    }

    public String getCertificateUrl() {
        return certificateUrl;
    }

    public void setCertificateUrl(String certificateUrl) {
        this.certificateUrl = certificateUrl;
    }

    public ShowcaseContent getShowcaseContent() {
        return showcaseContent;
    }

    public void setShowcaseContent(ShowcaseContent showcaseContent) {
        this.showcaseContent = showcaseContent;
    }

    // Computed field: Rank Title for Certificate (Single Source of Truth)
    public String getRankTitle() {
        if (finalRank == null) {
            return "Participation Certificate";
        }
        switch (finalRank) {
            case 1:
                return "Winner / 1st Rank";
            case 2:
                return "2nd Rank";
            case 3:
                return "3rd Rank";
            default:
                return "Participation Certificate";
        }
    }

    // Certificate Type: Achievement for top 3, Participation for others
    public String getCertificateType() {
        if (finalRank != null && finalRank >= 1 && finalRank <= 3) {
            return "Certificate of Achievement";
        }
        return "Certificate of Participation";
    }
}
