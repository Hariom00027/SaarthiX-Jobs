package com.saarthix.jobs.model;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.fasterxml.jackson.annotation.JsonProperty;

@Document("hackathon_applications")
public class HackathonApplication {

    @Id
    private String id;

    private String hackathonId;
    private String applicantId;

    @JsonProperty("asTeam")
    private Boolean asTeam = false;
    
    private String teamName;
    private int teamSize = 1;

    private List<String> teamMembers;  // team member IDs

    private LocalDateTime appliedAt;

    // Default Constructor
    public HackathonApplication() {
        this.asTeam = false;
        this.teamSize = 1;
    }

    // Getters & Setters

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getHackathonId() { return hackathonId; }
    public void setHackathonId(String hackathonId) { this.hackathonId = hackathonId; }

    public String getApplicantId() { return applicantId; }
    public void setApplicantId(String applicantId) { this.applicantId = applicantId; }

    public Boolean getAsTeam() { return asTeam != null ? asTeam : false; }
    public void setAsTeam(Boolean asTeam) { this.asTeam = asTeam != null ? asTeam : false; }

    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }

    public int getTeamSize() { return teamSize > 0 ? teamSize : 1; }
    public void setTeamSize(int teamSize) { this.teamSize = teamSize > 0 ? teamSize : 1; }

    public List<String> getTeamMembers() { return teamMembers; }
    public void setTeamMembers(List<String> teamMembers) { this.teamMembers = teamMembers; }

    public LocalDateTime getAppliedAt() { return appliedAt; }
    public void setAppliedAt(LocalDateTime appliedAt) { this.appliedAt = appliedAt; }
}
