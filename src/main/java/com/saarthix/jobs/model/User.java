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
}
