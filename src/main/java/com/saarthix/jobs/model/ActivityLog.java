package com.saarthix.jobs.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "activity_logs")
public class ActivityLog {
    @Id
    private String id;
    
    private String industryEmail;  // Email of the industry user performing the action
    private String industryId;     // ID of the industry user
    private String studentEmail;   // Email of the student whose profile was accessed
    private String studentId;      // ID of the student
    private String actionType;     // "PROFILE_VIEWED", "RESUME_VIEWED", "RESUME_DOWNLOADED", "CANDIDATE_SHORTLISTED"
    private LocalDateTime timestamp;
    private String ipAddress;      // Optional: for security tracking
    
    public ActivityLog() {
        this.timestamp = LocalDateTime.now();
    }
    
    public ActivityLog(String industryEmail, String industryId, String studentEmail, String studentId, String actionType) {
        this.industryEmail = industryEmail;
        this.industryId = industryId;
        this.studentEmail = studentEmail;
        this.studentId = studentId;
        this.actionType = actionType;
        this.timestamp = LocalDateTime.now();
    }
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getIndustryEmail() { return industryEmail; }
    public void setIndustryEmail(String industryEmail) { this.industryEmail = industryEmail; }
    
    public String getIndustryId() { return industryId; }
    public void setIndustryId(String industryId) { this.industryId = industryId; }
    
    public String getStudentEmail() { return studentEmail; }
    public void setStudentEmail(String studentEmail) { this.studentEmail = studentEmail; }
    
    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    
    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }
    
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
}
