package com.saarthix.jobs.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {
    @Id
    private String id;
    
    @Indexed(unique = false, sparse = true)
    private String googleId;
    
    @Indexed(unique = true)
    private String email;
    
    private String name;
    private String picture;
    private String pictureUrl; // Keep for Jobs compatibility
    private String firstName;
    private String lastName;
    
    // Admin authentication fields
    @Indexed(unique = true, sparse = true)
    private String username; // For admin login
    private String password; // Hashed password
    
    private String provider; // compatibility
    private Set<String> roles;
    private String role; // compatibility
    private String userType; // STUDENT, INSTITUTE, INDUSTRY, APPLICANT
    
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
    private boolean active;
    
    // Additional profile fields
    private String phone;
    private String gender;
    private String location;
    private String bio;
    private String linkedinUrl;
    private String githubUrl;
    
    // Institute specific fields
    private String instituteName;
    private String instituteType;
    private String instituteLocation;
    
    // Industry specific fields
    private String companyName;
    private String companyType;
    private String industry;
    private String position;
    private String subscriptionType; // FREE or PAID for INDUSTRY users
    
    // Student specific fields
    private String course;
    private String stream;
    private String specialization;
    private String year;
    private String semester;
    private String studentId;
    private String batch;
    private String cgpa;
    private String expectedGraduationYear;
    private String expectedGraduationMonth;
    private String skills;
    private String interests;
    private String achievements;
    private String projects;
    private String certifications;
    private String languages;
    private String resumeUrl;
    private String portfolioUrl;

    // Explicit getters/setters to avoid relying on Lombok in some Docker environments
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getUserType() { return userType; }
    public void setUserType(String userType) { this.userType = userType; }
    public String getPictureUrl() { return pictureUrl; }
    public void setPictureUrl(String pictureUrl) { this.pictureUrl = pictureUrl; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getSubscriptionType() { return subscriptionType; }
    public void setSubscriptionType(String subscriptionType) { this.subscriptionType = subscriptionType; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPicture() { return picture; }
    public void setPicture(String picture) { this.picture = picture; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public Set<String> getRoles() { return roles; }
    public void setRoles(Set<String> roles) { this.roles = roles; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
}
