package com.saarthix.jobs.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "jobs")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Job {
    @Id
    private String id;
    private String title;
    private String description;
    private String company;
    private String location;
    private String postedBy;
    private String industryId;           // NEW: User ID of the INDUSTRY user who posted
    private String industry;             // Industry type (e.g., Technology, Healthcare, Finance)
    private List<String> skills;         // Skills required for this job
    private String employmentType;       // Employment type (Full-time, Part-time, etc.)
    private Integer jobMinSalary;        // Minimum salary
    private Integer jobMaxSalary;        // Maximum salary
    private String jobSalaryCurrency;    // Salary currency
    private Integer yearsOfExperience;   // Required years of experience for this job
    private LocalDateTime createdAt = LocalDateTime.now();
    private boolean active = true;

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getPostedBy() { return postedBy; }
    public void setPostedBy(String postedBy) { this.postedBy = postedBy; }

    public String getIndustryId() { return industryId; }
    public void setIndustryId(String industryId) { this.industryId = industryId; }

    public String getIndustry() { return industry; }
    public void setIndustry(String industry) { this.industry = industry; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public List<String> getSkills() { return skills; }
    public void setSkills(List<String> skills) { this.skills = skills; }

    public String getEmploymentType() { return employmentType; }
    public void setEmploymentType(String employmentType) { this.employmentType = employmentType; }

    public Integer getJobMinSalary() { return jobMinSalary; }
    public void setJobMinSalary(Integer jobMinSalary) { this.jobMinSalary = jobMinSalary; }

    public Integer getJobMaxSalary() { return jobMaxSalary; }
    public void setJobMaxSalary(Integer jobMaxSalary) { this.jobMaxSalary = jobMaxSalary; }

    public String getJobSalaryCurrency() { return jobSalaryCurrency; }
    public void setJobSalaryCurrency(String jobSalaryCurrency) { this.jobSalaryCurrency = jobSalaryCurrency; }

    public Integer getYearsOfExperience() { return yearsOfExperience; }
    public void setYearsOfExperience(Integer yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }
}
