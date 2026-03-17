package com.saarthix.jobs.controller;

import com.saarthix.jobs.model.User;
import com.saarthix.jobs.model.UserProfile;
import com.saarthix.jobs.model.dto.StudentDatabaseDto;
import com.saarthix.jobs.repository.UserProfileRepository;
import com.saarthix.jobs.repository.UserRepository;
import com.saarthix.jobs.service.EmailService;
import com.saarthix.jobs.service.StudentDatabaseService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/students")
public class StudentDatabaseController {
    
    private final StudentDatabaseService studentDatabaseService;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final EmailService emailService;
    
    public StudentDatabaseController(
            StudentDatabaseService studentDatabaseService, 
            UserRepository userRepository,
            UserProfileRepository userProfileRepository,
            EmailService emailService) {
        this.studentDatabaseService = studentDatabaseService;
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.emailService = emailService;
    }
    
    /**
     * GET all students with optional filters
     * INDUSTRY users only
     */
    @GetMapping
    public ResponseEntity<?> getAllStudents(
            @RequestParam(required = false) Map<String, String> filters,
            Authentication auth) {
        try {
            // Check authentication
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body("Must be logged in to access student database");
            }
            
            User user = resolveUserFromOAuth(auth);
            if (user == null) {
                return ResponseEntity.status(401).body("User not found");
            }
            
            // Check if user is INDUSTRY type
            if (!"INDUSTRY".equals(user.getUserType())) {
                return ResponseEntity.status(403).body("Only INDUSTRY users can access student database");
            }
            
            // Check subscription type (defaults to FREE if not set)
            String subscriptionType = user.getSubscriptionType();
            if (subscriptionType == null || subscriptionType.isEmpty()) {
                subscriptionType = "FREE";
                user.setSubscriptionType("FREE");
                userRepository.save(user);
            }
            boolean isPaidUser = "PAID".equals(subscriptionType);
            
            // Get students with filters
            List<StudentDatabaseDto> students = studentDatabaseService.getAllStudents(
                    user.getEmail(), 
                    isPaidUser, 
                    filters
            );
            
            // Return response with subscription info
            Map<String, Object> response = new HashMap<>();
            response.put("students", students);
            response.put("subscriptionType", subscriptionType);
            response.put("totalCount", students.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error fetching students: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error fetching students: " + e.getMessage());
        }
    }
    
    /**
     * GET a single student by ID
     * INDUSTRY users only
     */
    @GetMapping("/{studentId}")
    public ResponseEntity<?> getStudentById(
            @PathVariable String studentId,
            Authentication auth) {
        try {
            // Check authentication
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body("Must be logged in to view student profile");
            }
            
            User user = resolveUserFromOAuth(auth);
            if (user == null) {
                return ResponseEntity.status(401).body("User not found");
            }
            
            // Check if user is INDUSTRY type
            if (!"INDUSTRY".equals(user.getUserType())) {
                return ResponseEntity.status(403).body("Only INDUSTRY users can view student profiles");
            }
            
            // Check subscription type
            String subscriptionType = user.getSubscriptionType();
            if (subscriptionType == null || subscriptionType.isEmpty()) {
                subscriptionType = "FREE";
            }
            boolean isPaidUser = "PAID".equals(subscriptionType);
            
            // Get student
            StudentDatabaseDto student = studentDatabaseService.getStudentById(
                    studentId, 
                    user.getEmail(), 
                    user.getId(),
                    isPaidUser
            );
            
            if (student == null) {
                return ResponseEntity.status(404).body("Student not found");
            }
            
            // Return response with subscription info
            Map<String, Object> response = new HashMap<>();
            response.put("student", student);
            response.put("subscriptionType", subscriptionType);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error fetching student: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error fetching student: " + e.getMessage());
        }
    }
    
    /**
     * POST - Shortlist a student
     * INDUSTRY users only
     */
    @PostMapping("/{studentId}/shortlist")
    public ResponseEntity<?> shortlistStudent(
            @PathVariable String studentId,
            Authentication auth) {
        try {
            // Check authentication
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body("Must be logged in to shortlist students");
            }
            
            User user = resolveUserFromOAuth(auth);
            if (user == null) {
                return ResponseEntity.status(401).body("User not found");
            }
            
            // Check if user is INDUSTRY type
            if (!"INDUSTRY".equals(user.getUserType())) {
                return ResponseEntity.status(403).body("Only INDUSTRY users can shortlist students");
            }
            
            // Shortlist student - available for all users
            String result = studentDatabaseService.shortlistStudent(
                    studentId, 
                    user.getEmail(), 
                    user.getId(),
                    true  // Allow all users to shortlist
            );
            
            return ResponseEntity.ok(Map.of("message", result));
        } catch (Exception e) {
            System.err.println("Error shortlisting student: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error shortlisting student: " + e.getMessage());
        }
    }
    
    /**
     * DELETE - Remove student from shortlist
     * INDUSTRY users only
     */
    @DeleteMapping("/{studentId}/shortlist")
    public ResponseEntity<?> removeShortlist(
            @PathVariable String studentId,
            Authentication auth) {
        try {
            // Check authentication
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body("Must be logged in");
            }
            
            User user = resolveUserFromOAuth(auth);
            if (user == null) {
                return ResponseEntity.status(401).body("User not found");
            }
            
            // Check if user is INDUSTRY type
            if (!"INDUSTRY".equals(user.getUserType())) {
                return ResponseEntity.status(403).body("Only INDUSTRY users can manage shortlists");
            }
            
            // Remove from shortlist
            String result = studentDatabaseService.removeShortlist(studentId, user.getEmail());
            
            return ResponseEntity.ok(Map.of("message", result));
        } catch (Exception e) {
            System.err.println("Error removing shortlist: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error removing shortlist: " + e.getMessage());
        }
    }
    
    /**
     * GET all shortlisted students
     * INDUSTRY users only
     */
    @GetMapping("/shortlisted")
    public ResponseEntity<?> getShortlistedStudents(Authentication auth) {
        try {
            // Check authentication
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body("Must be logged in to view shortlisted students");
            }
            
            User user = resolveUserFromOAuth(auth);
            if (user == null) {
                return ResponseEntity.status(401).body("User not found");
            }
            
            // Check if user is INDUSTRY type
            if (!"INDUSTRY".equals(user.getUserType())) {
                return ResponseEntity.status(403).body("Only INDUSTRY users can view shortlisted students");
            }
            
            // Get shortlisted students - available for all users
            List<StudentDatabaseDto> students = studentDatabaseService.getShortlistedStudents(
                    user.getEmail(), 
                    true  // Allow all users to view shortlisted students
            );
            
            return ResponseEntity.ok(Map.of("students", students, "totalCount", students.size()));
        } catch (Exception e) {
            System.err.println("Error fetching shortlisted students: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error fetching shortlisted students: " + e.getMessage());
        }
    }
    
    /**
     * GET - Download resume
     * INDUSTRY users only
     */
    @GetMapping("/{studentId}/resume/download")
    public ResponseEntity<?> downloadResume(
            @PathVariable String studentId,
            Authentication auth) {
        try {
            // Check authentication
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body("Must be logged in to download resumes");
            }
            
            User user = resolveUserFromOAuth(auth);
            if (user == null) {
                return ResponseEntity.status(401).body("User not found");
            }
            
            // Check if user is INDUSTRY type
            if (!"INDUSTRY".equals(user.getUserType())) {
                return ResponseEntity.status(403).body("Only INDUSTRY users can download resumes");
            }
            
            // Download resume - available for all users
            Map<String, String> resumeData = studentDatabaseService.downloadResume(
                    studentId, 
                    user.getEmail(), 
                    user.getId(),
                    true  // Allow all users to download resumes
            );
            
            if (resumeData == null) {
                return ResponseEntity.status(404).body("Resume not found");
            }
            
            // Send notification to student
            try {
                Optional<UserProfile> profileOpt = userProfileRepository.findById(studentId);
                if (profileOpt.isPresent()) {
                    UserProfile profile = profileOpt.get();
                    String studentEmail = profile.getApplicantEmail() != null ? profile.getApplicantEmail() : profile.getEmail();
                    if (studentEmail != null && !studentEmail.isEmpty()) {
                        // Get student user to get their name
                        Optional<User> studentUserOpt = userRepository.findByEmail(studentEmail);
                        String studentName = studentUserOpt.map(User::getName).orElse(null);
                        
                        // Get industry company name from user name or email
                        String industryCompany = user.getName() != null ? user.getName() : null;
                        
                        // Send notification email
                        emailService.sendProfileDownloadNotification(
                            studentEmail, 
                            studentName, 
                            industryCompany, 
                            user.getEmail()
                        );
                    }
                }
            } catch (Exception e) {
                // Log error but don't fail the download if notification fails
                System.err.println("Error sending download notification: " + e.getMessage());
                e.printStackTrace();
            }
            
            return ResponseEntity.ok(resumeData);
        } catch (Exception e) {
            System.err.println("Error downloading resume: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error downloading resume: " + e.getMessage());
        }
    }
    
    /**
     * GET current user's subscription info
     * INDUSTRY users only
     */
    @GetMapping("/subscription/info")
    public ResponseEntity<?> getSubscriptionInfo(Authentication auth) {
        try {
            // Check authentication
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body("Must be logged in");
            }
            
            User user = resolveUserFromOAuth(auth);
            if (user == null) {
                return ResponseEntity.status(401).body("User not found");
            }
            
            // Check if user is INDUSTRY type
            if (!"INDUSTRY".equals(user.getUserType())) {
                return ResponseEntity.status(403).body("Only INDUSTRY users have subscriptions");
            }
            
            // Get subscription type
            String subscriptionType = user.getSubscriptionType();
            if (subscriptionType == null || subscriptionType.isEmpty()) {
                subscriptionType = "FREE";
            }
            
            Map<String, Object> info = new HashMap<>();
            info.put("subscriptionType", subscriptionType);
            info.put("isPaidUser", "PAID".equals(subscriptionType));
            info.put("features", getFeaturesBySubscription(subscriptionType));
            
            return ResponseEntity.ok(info);
        } catch (Exception e) {
            System.err.println("Error fetching subscription info: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error fetching subscription info: " + e.getMessage());
        }
    }
    
    /**
     * POST - Update subscription (for testing - in production this would be handled by payment gateway)
     * INDUSTRY users only
     */
    @PostMapping("/subscription/update")
    public ResponseEntity<?> updateSubscription(
            @RequestBody Map<String, String> requestBody,
            Authentication auth) {
        try {
            // Check authentication
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body("Must be logged in");
            }
            
            User user = resolveUserFromOAuth(auth);
            if (user == null) {
                return ResponseEntity.status(401).body("User not found");
            }
            
            // Check if user is INDUSTRY type
            if (!"INDUSTRY".equals(user.getUserType())) {
                return ResponseEntity.status(403).body("Only INDUSTRY users can update subscriptions");
            }
            
            String newSubscriptionType = requestBody.get("subscriptionType");
            if (!"FREE".equals(newSubscriptionType) && !"PAID".equals(newSubscriptionType)) {
                return ResponseEntity.status(400).body("Invalid subscription type. Must be FREE or PAID.");
            }
            
            user.setSubscriptionType(newSubscriptionType);
            userRepository.save(user);
            
            return ResponseEntity.ok(Map.of(
                    "message", "Subscription updated successfully",
                    "subscriptionType", newSubscriptionType
            ));
        } catch (Exception e) {
            System.err.println("Error updating subscription: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error updating subscription: " + e.getMessage());
        }
    }
    
    // ============= HELPER METHODS =============
    
    /**
     * Resolve User from OAuth authentication
     */
    private User resolveUserFromOAuth(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return null;
        }

        Object principal = auth.getPrincipal();
        String email = null;

        if (principal instanceof OAuth2User oauthUser) {
            email = oauthUser.getAttribute("email");
        } else if (principal instanceof String) {
            email = (String) principal;
        }

        if (email != null) {
            return userRepository.findByEmail(email).orElse(null);
        }

        return null;
    }
    
    /**
     * Get features by subscription type
     */
    private Map<String, Object> getFeaturesBySubscription(String subscriptionType) {
        Map<String, Object> features = new HashMap<>();
        
        // All features available to all users now
        features.put("viewFullResume", true);
        features.put("downloadResume", true);
        features.put("viewContactDetails", true);
        features.put("shortlistCandidates", true);
        features.put("unlimitedAccess", true);
        
        return features;
    }
}
