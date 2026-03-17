package com.saarthix.jobs.model;

public class HackathonPhase {
    private String id;
    private String name;
    private String description;
    private String uploadFormat;
    private String deadline;
    private String phaseMode; // Online, Offline, or Hybrid for this phase
    private String phaseVenueLocation; // Venue location if phase is offline/hybrid
    private String phaseReportingTime; // Reporting time if phase is offline/hybrid

    // Constructors
    public HackathonPhase() {
    }

    public HackathonPhase(String id, String name, String description, String uploadFormat, String deadline) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.uploadFormat = uploadFormat;
        this.deadline = deadline;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getUploadFormat() {
        return uploadFormat;
    }

    public void setUploadFormat(String uploadFormat) {
        this.uploadFormat = uploadFormat;
    }

    public String getDeadline() {
        return deadline;
    }

    public void setDeadline(String deadline) {
        this.deadline = deadline;
    }

    public String getPhaseMode() {
        return phaseMode;
    }

    public void setPhaseMode(String phaseMode) {
        this.phaseMode = phaseMode;
    }

    public String getPhaseVenueLocation() {
        return phaseVenueLocation;
    }

    public void setPhaseVenueLocation(String phaseVenueLocation) {
        this.phaseVenueLocation = phaseVenueLocation;
    }

    public String getPhaseReportingTime() {
        return phaseReportingTime;
    }

    public void setPhaseReportingTime(String phaseReportingTime) {
        this.phaseReportingTime = phaseReportingTime;
    }
}
