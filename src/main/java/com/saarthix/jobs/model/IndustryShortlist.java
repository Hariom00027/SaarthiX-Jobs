package com.saarthix.jobs.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "industry_shortlists")
public class IndustryShortlist {
    @Id
    private String id;
    
    private String industryEmail;  // Email of the industry user
    private String industryId;     // ID of the industry user
    private String studentEmail;   // Email of the shortlisted student
    private String studentId;      // ID of the student
    private LocalDateTime shortlistedAt;
    private String notes;          // Optional notes about the candidate
    
    public IndustryShortlist() {
        this.shortlistedAt = LocalDateTime.now();
    }
    
    public IndustryShortlist(String industryEmail, String industryId, String studentEmail, String studentId) {
        this.industryEmail = industryEmail;
        this.industryId = industryId;
        this.studentEmail = studentEmail;
        this.studentId = studentId;
        this.shortlistedAt = LocalDateTime.now();
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
    
    public LocalDateTime getShortlistedAt() { return shortlistedAt; }
    public void setShortlistedAt(LocalDateTime shortlistedAt) { this.shortlistedAt = shortlistedAt; }
    
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
