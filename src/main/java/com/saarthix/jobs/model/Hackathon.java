package com.saarthix.jobs.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.util.List;

@Document(collection = "hackathons")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Hackathon {

    @Id
    private String id;

    private String title;
    private String description;
    private String company;
    private String prize;
    private int teamSize;
    private String submissionUrl;
    private String createdByIndustryId;
    private int views;
    private String startDate;
    private String endDate;
    private String mode;           // Online, Offline, Hybrid
    private String requirements;   // Requirements for participants
    private String instructions;   // Instructions for hackathon
    private boolean enabled = true; // Enable/Disable hackathon
    
    // New fields for comprehensive hackathon management
    private String problemStatement;      // Problem Statement
    private String skillsRequired;        // Skills Required
    private String eligibilityCriteria;   // Eligibility Criteria
    private String participationType;     // "Both", "TeamsOnly", or "IndividualsOnly"
    private String courseBranch;          // Course / Branch
    private String year;                  // Year (e.g., "1st Year", "2nd Year", "Any")
    private String venueLocation;         // Venue location (for offline/hybrid)
    private String venueTime;             // Venue time (for offline/hybrid)
    private String venueDate;             // Venue reporting date (for offline/hybrid)
    private String venueReportingTime;    // Venue reporting time (for offline/hybrid)
    private String submissionProcedure;   // What participants must submit
    private Integer participantLimit;     // Max number of participants/teams
    @JsonDeserialize(using = HackathonPhaseDeserializer.class)
    private List<HackathonPhase> phases;  // List of hackathon phases (supports both String and List formats)
    private Boolean resultsPublished = false; // Whether results have been announced

    // Getters + Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }

    public String getPrize() { return prize; }
    public void setPrize(String prize) { this.prize = prize; }

    public int getTeamSize() { return teamSize; }
    public void setTeamSize(int teamSize) { this.teamSize = teamSize; }

    public String getSubmissionUrl() { return submissionUrl; }
    public void setSubmissionUrl(String submissionUrl) { this.submissionUrl = submissionUrl; }

    public String getCreatedByIndustryId() { return createdByIndustryId; }
    public void setCreatedByIndustryId(String createdByIndustryId) { this.createdByIndustryId = createdByIndustryId; }

    public int getViews() { return views; }
    public void setViews(int views) { this.views = views; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public String getRequirements() { return requirements; }
    public void setRequirements(String requirements) { this.requirements = requirements; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getProblemStatement() { return problemStatement; }
    public void setProblemStatement(String problemStatement) { this.problemStatement = problemStatement; }

    public String getSkillsRequired() { return skillsRequired; }
    public void setSkillsRequired(String skillsRequired) { this.skillsRequired = skillsRequired; }

    public String getEligibilityCriteria() { return eligibilityCriteria; }
    public void setEligibilityCriteria(String eligibilityCriteria) { this.eligibilityCriteria = eligibilityCriteria; }

    public String getParticipationType() { return participationType; }
    public void setParticipationType(String participationType) { this.participationType = participationType; }

    public String getCourseBranch() { return courseBranch; }
    public void setCourseBranch(String courseBranch) { this.courseBranch = courseBranch; }

    public String getYear() { return year; }
    public void setYear(String year) { this.year = year; }

    public String getVenueLocation() { return venueLocation; }
    public void setVenueLocation(String venueLocation) { this.venueLocation = venueLocation; }

    public String getVenueTime() { return venueTime; }
    public void setVenueTime(String venueTime) { this.venueTime = venueTime; }

    public String getVenueDate() { return venueDate; }
    public void setVenueDate(String venueDate) { this.venueDate = venueDate; }

    public String getVenueReportingTime() { return venueReportingTime; }
    public void setVenueReportingTime(String venueReportingTime) { this.venueReportingTime = venueReportingTime; }

    public String getSubmissionProcedure() { return submissionProcedure; }
    public void setSubmissionProcedure(String submissionProcedure) { this.submissionProcedure = submissionProcedure; }

    public Integer getParticipantLimit() { return participantLimit; }
    public void setParticipantLimit(Integer participantLimit) { this.participantLimit = participantLimit; }

    public List<HackathonPhase> getPhases() { return phases; }
    public void setPhases(List<HackathonPhase> phases) { this.phases = phases; }
    
    public Boolean getResultsPublished() { return resultsPublished != null ? resultsPublished : false; }
    public void setResultsPublished(Boolean resultsPublished) { this.resultsPublished = resultsPublished != null ? resultsPublished : false; }
}
