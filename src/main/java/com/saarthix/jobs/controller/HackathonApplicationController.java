package com.saarthix.jobs.controller;

import com.saarthix.jobs.model.Hackathon;
import com.saarthix.jobs.model.HackathonApplication;
import com.saarthix.jobs.model.HackathonPhase;
import com.saarthix.jobs.model.User;
import com.saarthix.jobs.repository.HackathonApplicationRepository;
import com.saarthix.jobs.repository.HackathonRepository;
import com.saarthix.jobs.repository.UserRepository;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.beans.factory.annotation.Value;

import jakarta.servlet.http.HttpServletRequest;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/hackathon-applications")
public class HackathonApplicationController {

    private final HackathonApplicationRepository applicationRepository;
    private final HackathonRepository hackathonRepository;
    private final UserRepository userRepository;

    public HackathonApplicationController(
            HackathonApplicationRepository applicationRepository,
            HackathonRepository hackathonRepository,
            UserRepository userRepository) {
        this.applicationRepository = applicationRepository;
        this.hackathonRepository = hackathonRepository;
        this.userRepository = userRepository;
    }

    // --------------------------------------------
    // Helper — resolve logged-in user from JWT/OAuth
    // Uses same pattern as HackathonController for SSO compatibility
    // --------------------------------------------
    private User resolveUser(Authentication auth, HttpServletRequest request) {
        if (auth == null || auth.getPrincipal() == null) {
            return null;
        }

        Object principal = auth.getPrincipal();
        String email = null;
        String userId = null;
        String userType = null;
        String name = null;

        // First, try to get from JWT token attributes (set by JwtAuthenticationFilter)
        if (request != null) {
            email = (String) request.getAttribute("userEmail");
            userId = (String) request.getAttribute("userId");
            userType = (String) request.getAttribute("userType");
            name = (String) request.getAttribute("userName");
        }

        // Fallback to OAuth2 principal
        if (email == null) {
            if (principal instanceof OAuth2User oauth) {
                email = oauth.getAttribute("email");
                name = oauth.getAttribute("name");
            } else if (principal instanceof String) {
                email = (String) principal;
            }
        }

        if (email != null) {
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                return userOpt.get();
            }

            // User doesn't exist - create from JWT token claims
            if (userId != null || userType != null) {
                User newUser = new User();
                newUser.setEmail(email);
                if (userId != null) {
                    newUser.setId(userId);
                }
                if (userType != null) {
                    newUser.setUserType(userType);
                } else {
                    newUser.setUserType("APPLICANT"); // Default
                }
                if (name != null) {
                    newUser.setName(name);
                } else {
                    newUser.setName(email.split("@")[0]); // Use email prefix as name
                }
                newUser.setActive(true);
                newUser.setCreatedAt(java.time.LocalDateTime.now());
                
                User savedUser = userRepository.save(newUser);
                System.out.println("Auto-created user from JWT: " + email + " (type: " + userType + ")");
                return savedUser;
            }
        }

        return null;
    }

    // --------------------------------------------
    // ✅ APPLY TO HACKATHON (Individual or Team)
    // POST /hackathon-applications/{hackathonId}/apply
    // --------------------------------------------
    @PostMapping("/{hackathonId}/apply")
    public ResponseEntity<?> apply(
            @PathVariable String hackathonId,
            @RequestBody HackathonApplication req,
            Authentication auth,
            HttpServletRequest request) {
        
        try {
            System.out.println("=== Apply endpoint called ===");
            System.out.println("Hackathon ID: " + hackathonId);

            // 1️⃣ Validate logged-in user
            User user = resolveUser(auth, request);
            System.out.println("User resolved: " + (user != null));
            
            if (user == null) {
                System.err.println("User resolution failed");
                return ResponseEntity.status(401)
                        .body("Authentication failed. Please log in again.");
            }
            
            System.out.println("User Type: " + user.getUserType());
            if (!"APPLICANT".equals(user.getUserType()) && !"STUDENT".equals(user.getUserType())) {
                System.err.println("User is not an applicant or student: " + user.getUserType());
                return ResponseEntity.status(403)
                        .body("Only applicants or students can apply for hackathons. You are: " + user.getUserType());
            }

            // 2️⃣ Validate hackathon existence
            System.out.println("Checking if hackathon exists: " + hackathonId);
            Optional<Hackathon> hackOpt = hackathonRepository.findById(hackathonId);
            if (hackOpt.isEmpty()) {
                System.err.println("Hackathon not found: " + hackathonId);
                return ResponseEntity.status(404).body("Hackathon not found");
            }
            System.out.println("Hackathon found: " + hackOpt.get().getTitle());
            Hackathon hackathon = hackOpt.get();

            // 2.3️⃣ Check if results are published - STRICT: No new applications allowed
            if (Boolean.TRUE.equals(hackathon.getResultsPublished())) {
                System.err.println("Results published. Applications closed. Hackathon: " + hackathonId);
                return ResponseEntity.status(403)
                        .body("Applications are closed. Results for this hackathon have been declared.");
            }

            // 2.4️⃣ Check if Phase 1 deadline has passed - STRICT: No new applications allowed
            if (hackathon.getPhases() != null && !hackathon.getPhases().isEmpty()) {
                HackathonPhase phase1 = hackathon.getPhases().get(0);
                if (phase1.getDeadline() != null && !phase1.getDeadline().isBlank()) {
                    try {
                        LocalDateTime phase1Deadline = parseDeadline(phase1.getDeadline());
                        if (phase1Deadline != null) {
                            LocalDateTime now = LocalDateTime.now();
                            if (now.isAfter(phase1Deadline)) {
                                System.err.println("Phase 1 deadline passed. Deadline: " + phase1Deadline + ", Current time: " + now);
                                return ResponseEntity.status(403)
                                        .body("Applications are closed. Phase 1 submission deadline (" + phase1Deadline + ") has passed.");
                            }
                            System.out.println("Phase 1 deadline check passed. Deadline: " + phase1Deadline);
                        } else {
                            System.err.println("Warning: Could not parse Phase 1 deadline: " + phase1.getDeadline() + ". Allowing application to proceed.");
                        }
                    } catch (Exception e) {
                        System.err.println("Error parsing Phase 1 deadline: " + e.getMessage() + ". Deadline value: " + phase1.getDeadline());
                        System.err.println("Warning: Allowing application despite deadline parsing error.");
                    }
                }
            }

            // 2.5️⃣ Check if user already has a rejected application for this hackathon
            List<HackathonApplication> existingApps = applicationRepository.findByHackathonIdAndApplicantId(hackathonId, user.getId());
            if (existingApps != null && !existingApps.isEmpty()) {
                HackathonApplication existingApp = existingApps.get(0);
                if ("REJECTED".equals(existingApp.getStatus())) {
                    String message = "You cannot re-apply to this hackathon. Your previous application was rejected.";
                    if (existingApp.getRejectionMessage() != null && !existingApp.getRejectionMessage().trim().isEmpty()) {
                        message += "\n\nRejection Reason: " + existingApp.getRejectionMessage();
                    }
                    return ResponseEntity.status(403).body(message);
                }
            }

            // 2.6️⃣ Check registration cutoff (server-side enforcement)
            if (hackathon.getEndDate() != null && !hackathon.getEndDate().isBlank()) {
                try {
                    LocalDateTime endDate = LocalDateTime.parse(hackathon.getEndDate());
                    LocalDateTime now = LocalDateTime.now();
                    if (now.isAfter(endDate)) {
                        System.err.println("Registration closed. End date: " + endDate + ", Current time: " + now);
                        return ResponseEntity.status(403)
                                .body("Registration period has ended. Applications are no longer accepted.");
                    }
                    System.out.println("Registration is open. End date: " + endDate);
                } catch (Exception e) {
                    System.err.println("Error parsing end date: " + e.getMessage());
                }
            }

            // 3️⃣ Team validation
            Boolean isTeam = req.getAsTeam() != null ? req.getAsTeam() : false;
            System.out.println("Is team application: " + isTeam);
            if (Boolean.TRUE.equals(isTeam)) {
                if (req.getTeamName() == null || req.getTeamName().isBlank()) {
                    System.err.println("Team name is missing");
                    return ResponseEntity.badRequest().body("Team name is required for team applications");
                }
                if (req.getTeamSize() <= 1) {
                    System.err.println("Team size is invalid: " + req.getTeamSize());
                    return ResponseEntity.badRequest().body("Team size must be greater than 1");
                }
                System.out.println("Team application validated - Name: " + req.getTeamName() + ", Size: " + req.getTeamSize());
            } else {
                // Individual mode
                req.setTeamName(null);
                req.setTeamSize(1);
                System.out.println("Individual application set");
            }

            // 4️⃣ Set required fields
            req.setHackathonId(hackathonId);
            req.setApplicantId(user.getId());
            req.setAppliedAt(LocalDateTime.now());
            if (req.getStatus() == null) {
                req.setStatus("ACTIVE");
            }
            System.out.println("Application fields set - Applicant ID: " + user.getId());

            // 5️⃣ Save and return
            HackathonApplication saved = applicationRepository.save(req);
            System.out.println("Application saved with ID: " + saved.getId());
            return ResponseEntity.ok(saved);
            
        } catch (Exception e) {
            System.err.println("Error in apply endpoint: " + e.getMessage());
            System.err.println("Exception class: " + e.getClass().getName());
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body("Error submitting application: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        }
    }

    // --------------------------------------------
    // GET MY HACKATHON APPLICATIONS (Applicant)
    // GET /hackathon-applications/my-applications
    // --------------------------------------------
    @GetMapping("/my-applications")
    public ResponseEntity<?> getMyApplications(Authentication auth, HttpServletRequest request) {
        try {
            System.out.println("=== getMyApplications called ===");
            
            User user = resolveUser(auth, request);
            System.out.println("User resolved: " + (user != null));
            
            if (user == null) {
                System.err.println("User resolution failed");
                return ResponseEntity.status(401).body("Authentication failed. Please log in again.");
            }
            
            System.out.println("User ID: " + user.getId());
            System.out.println("User Email: " + user.getEmail());
            System.out.println("User Type: " + user.getUserType());
            
            if (!"APPLICANT".equals(user.getUserType()) && !"STUDENT".equals(user.getUserType())) {
                System.err.println("User is not an applicant or student: " + user.getUserType());
                return ResponseEntity.status(403).body("Only applicants or students can view their applications. You are: " + user.getUserType());
            }
            
            System.out.println("Fetching applications for applicant ID: " + user.getId());
            List<HackathonApplication> applications = applicationRepository.findByApplicantId(user.getId());
            System.out.println("Retrieved " + applications.size() + " hackathon applications");
            
            return ResponseEntity.ok(applications);
        } catch (Exception e) {
            System.err.println("Error retrieving applications: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error retrieving applications: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        }
    }

    // --------------------------------------------
    // SUBMIT PHASE SOLUTION (Applicant)
    // POST /hackathon-applications/{applicationId}/phases/{phaseId}/submit
    // --------------------------------------------
    @PostMapping("/{applicationId}/phases/{phaseId}/submit")
    public ResponseEntity<?> submitPhase(
            @PathVariable String applicationId,
            @PathVariable String phaseId,
            @RequestBody HackathonApplication.PhaseSubmission submission,
            Authentication auth,
            HttpServletRequest request) {

        User user = resolveUser(auth, request);
        if (user == null || (!"APPLICANT".equals(user.getUserType()) && !"STUDENT".equals(user.getUserType()))) {
            return ResponseEntity.status(403).body("Only applicants or students can submit solutions.");
        }

        Optional<HackathonApplication> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Application not found.");
        }
        HackathonApplication app = appOpt.get();

        if (!app.getApplicantId().equals(user.getId())) {
            return ResponseEntity.status(403).body("You can only submit for your own application.");
        }

        if ("REJECTED".equals(app.getStatus())) {
            return ResponseEntity.status(403).body("Application is rejected.");
        }

        // STRICT: Check if phase deadline has passed
        Optional<Hackathon> hackOpt = hackathonRepository.findById(app.getHackathonId());
        if (hackOpt.isPresent()) {
            Hackathon hackathon = hackOpt.get();
            if (hackathon.getPhases() != null && !hackathon.getPhases().isEmpty()) {
                HackathonPhase targetPhase = hackathon.getPhases().stream()
                        .filter(p -> p.getId() != null && p.getId().equals(phaseId))
                        .findFirst()
                        .orElse(null);
                
                if (targetPhase == null && hackathon.getPhases().size() > 0) {
                    String phaseIdLower = phaseId.toLowerCase();
                    if (phaseIdLower.contains("1") || phaseIdLower.equals("phase1") || phaseIdLower.equals("phase-1")) {
                        targetPhase = hackathon.getPhases().get(0);
                    } else if (phaseIdLower.contains("2") || phaseIdLower.equals("phase2") || phaseIdLower.equals("phase-2")) {
                        if (hackathon.getPhases().size() > 1) {
                            targetPhase = hackathon.getPhases().get(1);
                        }
                    } else if (phaseIdLower.contains("3") || phaseIdLower.equals("phase3") || phaseIdLower.equals("phase-3")) {
                        if (hackathon.getPhases().size() > 2) {
                            targetPhase = hackathon.getPhases().get(2);
                        }
                    }
                }
                
                if (targetPhase == null && hackathon.getPhases().size() > 0) {
                    targetPhase = hackathon.getPhases().get(0);
                }
                
                if (targetPhase != null && targetPhase.getDeadline() != null && !targetPhase.getDeadline().isBlank()) {
                    try {
                        LocalDateTime phaseDeadline = parseDeadline(targetPhase.getDeadline());
                        if (phaseDeadline != null) {
                            LocalDateTime now = LocalDateTime.now();
                            if (now.isAfter(phaseDeadline)) {
                                return ResponseEntity.status(403)
                                        .body("Submission deadline has passed. The deadline for " + targetPhase.getName() + " was " + phaseDeadline + ".");
                            }
                        }
                    } catch (Exception e) {
                        System.err.println("Error parsing phase deadline: " + e.getMessage());
                    }
                }
            }
        }

        // Check if this is a re-upload
        HackathonApplication.PhaseSubmission existingSubmission = app.getPhaseSubmissions().get(phaseId);
        int reuploadCount = 0;
        boolean isReuploaded = false;
        if (existingSubmission != null && "REUPLOAD_REQUESTED".equals(existingSubmission.getStatus())) {
            reuploadCount = existingSubmission.getReuploadCount() != null ? existingSubmission.getReuploadCount() : 0;
            isReuploaded = true;
        }

        // Update submission
        submission.setSubmittedAt(LocalDateTime.now());
        submission.setStatus("PENDING");
        submission.setReuploadCount(reuploadCount);
        submission.setIsReuploaded(isReuploaded);
        app.getPhaseSubmissions().put(phaseId, submission);
        app.setCurrentPhaseId(phaseId);

        applicationRepository.save(app);
        return ResponseEntity.ok(app);
    }

    // --------------------------------------------
    // REVIEW PHASE SOLUTION (Industry)
    // PUT /hackathon-applications/{applicationId}/phases/{phaseId}/review
    // --------------------------------------------
    @PutMapping("/{applicationId}/phases/{phaseId}/review")
    public ResponseEntity<?> reviewPhase(
            @PathVariable String applicationId,
            @PathVariable String phaseId,
            @RequestBody HackathonApplication.PhaseSubmission review,
            Authentication auth,
            HttpServletRequest request) {

        User user = resolveUser(auth, request);
        if (user == null || !"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only industry users can review submissions.");
        }

        Optional<HackathonApplication> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Application not found.");
        }
        HackathonApplication app = appOpt.get();

        // Verify industry owns the hackathon
        Optional<Hackathon> hackOpt = hackathonRepository.findById(app.getHackathonId());
        if (hackOpt.isEmpty() || !hackOpt.get().getCreatedByIndustryId().equals(user.getId())) {
            return ResponseEntity.status(403).body("You can only review applications for your hackathons.");
        }

        HackathonApplication.PhaseSubmission existingSubmission = app.getPhaseSubmissions().get(phaseId);
        if (existingSubmission == null) {
            return ResponseEntity.status(404).body("No submission found for this phase.");
        }

        // Prevent accepting a submission that has been requested for re-upload
        if ("REUPLOAD_REQUESTED".equals(existingSubmission.getStatus()) && "ACCEPTED".equals(review.getStatus())) {
            return ResponseEntity.status(400).body("Cannot accept a submission that has been requested for re-upload. Please wait for the applicant to submit a new solution.");
        }

        // Update review details
        existingSubmission.setStatus(review.getStatus());
        existingSubmission.setScore(review.getScore());
        existingSubmission.setRemarks(review.getRemarks());

        // Update overall status if rejected
        if ("REJECTED".equals(review.getStatus())) {
            app.setStatus("REJECTED");
        }

        applicationRepository.save(app);
        return ResponseEntity.ok(app);
    }

    // --------------------------------------------
    // REQUEST RE-UPLOAD FOR PHASE (Industry)
    // PUT /hackathon-applications/{applicationId}/phases/{phaseId}/request-reupload
    // --------------------------------------------
    @PutMapping("/{applicationId}/phases/{phaseId}/request-reupload")
    public ResponseEntity<?> requestReupload(
            @PathVariable String applicationId,
            @PathVariable String phaseId,
            @RequestBody Map<String, String> requestBody,
            Authentication auth,
            HttpServletRequest request) {

        User user = resolveUser(auth, request);
        if (user == null || !"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only industry users can request re-upload.");
        }

        Optional<HackathonApplication> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Application not found.");
        }
        HackathonApplication app = appOpt.get();

        // Verify industry owns the hackathon
        Optional<Hackathon> hackOpt = hackathonRepository.findById(app.getHackathonId());
        if (hackOpt.isEmpty() || !hackOpt.get().getCreatedByIndustryId().equals(user.getId())) {
            return ResponseEntity.status(403).body("You can only request re-upload for your hackathons.");
        }

        HackathonApplication.PhaseSubmission existingSubmission = app.getPhaseSubmissions().get(phaseId);
        if (existingSubmission == null) {
            return ResponseEntity.status(404).body("No submission found for this phase.");
        }

        // STRICT VALIDATION: Check if re-upload has already been requested 2 times
        int currentReuploadCount = existingSubmission.getReuploadCount() != null ? existingSubmission.getReuploadCount() : 0;
        
        if (currentReuploadCount >= 2) {
            return ResponseEntity.status(400).body("Maximum re-upload limit reached (2 times). You cannot request another re-upload for this submission.");
        }

        // Increment re-upload count and set status to REUPLOAD_REQUESTED
        existingSubmission.setReuploadCount(currentReuploadCount + 1);
        existingSubmission.setStatus("REUPLOAD_REQUESTED");
        String message = requestBody.get("message");
        if (message != null && !message.trim().isEmpty()) {
            existingSubmission.setRemarks(message);
        }

        applicationRepository.save(app);
        return ResponseEntity.ok(app);
    }

    // --------------------------------------------
    // REJECT APPLICATION (Industry)
    // PUT /hackathon-applications/{applicationId}/reject
    // --------------------------------------------
    @PutMapping("/{applicationId}/reject")
    public ResponseEntity<?> rejectApplication(
            @PathVariable String applicationId,
            @RequestBody Map<String, String> requestBody,
            Authentication auth,
            HttpServletRequest request) {

        User user = resolveUser(auth, request);
        if (user == null || !"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only industry users can reject applications.");
        }

        Optional<HackathonApplication> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Application not found.");
        }
        HackathonApplication app = appOpt.get();

        // Verify industry owns the hackathon
        Optional<Hackathon> hackOpt = hackathonRepository.findById(app.getHackathonId());
        if (hackOpt.isEmpty() || !hackOpt.get().getCreatedByIndustryId().equals(user.getId())) {
            return ResponseEntity.status(403).body("You can only reject applications for your hackathons.");
        }

        // Set application status to REJECTED and store rejection message
        app.setStatus("REJECTED");
        String rejectionMessage = requestBody.get("rejectionMessage");
        if (rejectionMessage != null && !rejectionMessage.trim().isEmpty()) {
            app.setRejectionMessage(rejectionMessage);
        }

        applicationRepository.save(app);
        return ResponseEntity.ok(app);
    }

    // --------------------------------------------
    // GET APPLICATIONS BY HACKATHON (Industry)
    // GET /hackathon-applications/hackathon/{hackathonId}
    // --------------------------------------------
    @GetMapping("/hackathon/{hackathonId}")
    public ResponseEntity<?> getApplicationsByHackathon(
            @PathVariable String hackathonId,
            Authentication auth,
            HttpServletRequest request) {

        User user = resolveUser(auth, request);
        if (user == null || !"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only industry users can view applications.");
        }

        Optional<Hackathon> hackOpt = hackathonRepository.findById(hackathonId);
        if (hackOpt.isEmpty() || !hackOpt.get().getCreatedByIndustryId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Access denied.");
        }

        List<HackathonApplication> applications = applicationRepository.findByHackathonId(hackathonId);
        return ResponseEntity.ok(applications);
    }

    // --------------------------------------------
    // GET APPLICATION DETAILS
    // GET /hackathon-applications/{applicationId}
    // --------------------------------------------
    @GetMapping("/{applicationId}")
    public ResponseEntity<?> getApplicationDetails(
            @PathVariable String applicationId,
            Authentication auth,
            HttpServletRequest request) {

        User user = resolveUser(auth, request);
        if (user == null)
            return ResponseEntity.status(401).build();

        Optional<HackathonApplication> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty())
            return ResponseEntity.status(404).build();
        HackathonApplication app = appOpt.get();

        // Access control: Applicant or Owner Industry
        boolean isApplicant = app.getApplicantId().equals(user.getId());
        boolean isOwner = false;
        if (!isApplicant) {
            Optional<Hackathon> hackOpt = hackathonRepository.findById(app.getHackathonId());
            if (hackOpt.isPresent() && hackOpt.get().getCreatedByIndustryId().equals(user.getId())) {
                isOwner = true;
            }
        }

        if (!isApplicant && !isOwner) {
            return ResponseEntity.status(403).body("Access denied.");
        }

        return ResponseEntity.ok(app);
    }

    // --------------------------------------------
    // FINALIZE RESULTS & CALCULATE RANKINGS (Industry)
    // POST /hackathon-applications/hackathon/{hackathonId}/finalize-results
    // --------------------------------------------
    @PostMapping("/hackathon/{hackathonId}/finalize-results")
    public ResponseEntity<?> finalizeResults(
            @PathVariable String hackathonId,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication auth,
            HttpServletRequest request) {

        User user = resolveUser(auth, request);
        if (user == null || !"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only industry users can finalize results");
        }

        // Read certificate customization from request
        String certificateTemplateId = null;
        String logoUrl = null;
        String platformLogoUrl = null;
        String customMessage = null;
        String signatureLeftUrl = null;
        String signatureRightUrl = null;

        if (body != null) {
            if (body.get("certificateTemplateId") != null) {
                certificateTemplateId = String.valueOf(body.get("certificateTemplateId"));
            }
            if (body.get("logoUrl") != null) {
                logoUrl = String.valueOf(body.get("logoUrl"));
            }
            if (body.get("platformLogoUrl") != null) {
                platformLogoUrl = String.valueOf(body.get("platformLogoUrl"));
            }
            if (body.get("customMessage") != null) {
                customMessage = String.valueOf(body.get("customMessage"));
            }
            if (body.get("signatureLeftUrl") != null) {
                signatureLeftUrl = String.valueOf(body.get("signatureLeftUrl"));
            }
            if (body.get("signatureRightUrl") != null) {
                signatureRightUrl = String.valueOf(body.get("signatureRightUrl"));
            }
        }

        // Get all applications for this hackathon
        List<HackathonApplication> applications = applicationRepository.findByHackathonId(hackathonId);

        // Calculate total scores for each application
        for (HackathonApplication app : applications) {
            double totalScore = 0.0;
            if (app.getPhaseSubmissions() != null) {
                for (HackathonApplication.PhaseSubmission submission : app.getPhaseSubmissions().values()) {
                    if (submission.getScore() != null) {
                        totalScore += submission.getScore();
                    }
                }
            }
            app.setTotalScore(totalScore);
        }

        // Sort by total score (descending) for display purposes only
        applications.sort((a, b) -> Double.compare(
                b.getTotalScore() != null ? b.getTotalScore() : 0.0,
                a.getTotalScore() != null ? a.getTotalScore() : 0.0));

        // Apply certificate customization to all applications
        for (HackathonApplication app : applications) {
            if (certificateTemplateId != null && !certificateTemplateId.isBlank()) {
                app.setCertificateTemplateId(certificateTemplateId);
            }
            if (logoUrl != null) {
                app.setCertificateLogoUrl(logoUrl);
            }
            if (platformLogoUrl != null) {
                app.setCertificatePlatformLogoUrl(platformLogoUrl);
            }
            if (customMessage != null) {
                app.setCertificateCustomMessage(customMessage);
            }
            if (signatureLeftUrl != null) {
                app.setCertificateSignatureLeftUrl(signatureLeftUrl);
            }
            if (signatureRightUrl != null) {
                app.setCertificateSignatureRightUrl(signatureRightUrl);
            }
            generateCertificateUrls(app);
        }

        // Save all applications
        applicationRepository.saveAll(applications);

        return ResponseEntity.ok("Results finalized successfully");
    }

    @Value("${app.frontend.url:https://saarthix.com/jobs}")
    private String jobsFrontendUrl;

    private void generateCertificateUrls(HackathonApplication app) {
        // Use the frontend URL to construct the certificate view link
        String baseUrl = jobsFrontendUrl.replaceAll("/+$", "") + "/certificates/view";

        if (Boolean.TRUE.equals(app.getAsTeam()) && app.getTeamMembers() != null) {
            // Generate for each team member
            for (HackathonApplication.TeamMember member : app.getTeamMembers()) {
                String certUrl = baseUrl + "?applicationId=" + app.getId() + "&email=" + member.getEmail();
                member.setCertificateUrl(certUrl);
            }
        } else {
            // Generate for individual
            String certUrl = baseUrl + "?applicationId=" + app.getId();
            app.setCertificateUrl(certUrl);
        }
    }

    // --------------------------------------------
    // PUBLISH SHOWCASE CONTENT (Industry - for top 3)
    // PUT /hackathon-applications/{applicationId}/showcase
    // --------------------------------------------
    @PutMapping("/{applicationId}/showcase")
    public ResponseEntity<?> publishShowcase(
            @PathVariable String applicationId,
            @RequestBody HackathonApplication.ShowcaseContent showcase,
            Authentication auth,
            HttpServletRequest request) {

        User user = resolveUser(auth, request);
        if (user == null || !"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only industry users can publish showcase");
        }

        Optional<HackathonApplication> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        HackathonApplication app = appOpt.get();

        // Only allow for top 3
        if (app.getFinalRank() == null || app.getFinalRank() > 3) {
            return ResponseEntity.status(400).body("Showcase only available for top 3 winners");
        }

        showcase.setPublishedAt(LocalDateTime.now());
        app.setShowcaseContent(showcase);
        applicationRepository.save(app);

        return ResponseEntity.ok(app);
    }

    // --------------------------------------------
    // GET RESULTS (Applicant - view own results)
    // GET /hackathon-applications/{applicationId}/results
    // --------------------------------------------
    @GetMapping("/{applicationId}/results")
    public ResponseEntity<?> getResults(
            @PathVariable String applicationId,
            Authentication auth,
            HttpServletRequest request) {

        User user = resolveUser(auth, request);
        if (user == null) {
            return ResponseEntity.status(401).body("Authentication required");
        }

        Optional<HackathonApplication> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        HackathonApplication app = appOpt.get();

        // Applicants can only view their own results
        if (("APPLICANT".equals(user.getUserType()) || "STUDENT".equals(user.getUserType())) && !app.getApplicantId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        return ResponseEntity.ok(app);
    }

    // --------------------------------------------
    // GET ALL RESULTS FOR HACKATHON (Industry)
    // GET /hackathon-applications/hackathon/{hackathonId}/results
    // --------------------------------------------
    @GetMapping("/hackathon/{hackathonId}/results")
    public ResponseEntity<?> getHackathonResults(
            @PathVariable String hackathonId,
            Authentication auth,
            HttpServletRequest request) {

        User user = resolveUser(auth, request);
        if (user == null || !"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only industry users can view all results");
        }

        List<HackathonApplication> applications = applicationRepository.findByHackathonId(hackathonId);

        // Sort by rank (nulls last) then by total score
        applications.sort((a, b) -> {
            if (a.getFinalRank() != null && b.getFinalRank() != null) {
                return Integer.compare(a.getFinalRank(), b.getFinalRank());
            }
            if (a.getFinalRank() != null)
                return -1;
            if (b.getFinalRank() != null)
                return 1;
            return Double.compare(
                    b.getTotalScore() != null ? b.getTotalScore() : 0.0,
                    a.getTotalScore() != null ? a.getTotalScore() : 0.0);
        });

        return ResponseEntity.ok(applications);
    }

    // --------------------------------------------
    // UPDATE APPLICATION RANK (Industry - Manual Selection)
    // PATCH /hackathon-applications/{applicationId}
    // --------------------------------------------
    @PatchMapping("/{applicationId}")
    public ResponseEntity<?> updateApplicationRank(
            @PathVariable String applicationId,
            @RequestBody Map<String, Object> updates,
            Authentication auth,
            HttpServletRequest request) {

        User user = resolveUser(auth, request);
        if (user == null || !"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only industry users can update rankings");
        }

        Optional<HackathonApplication> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        HackathonApplication app = appOpt.get();

        // Update finalRank if provided
        if (updates.containsKey("finalRank")) {
            Integer rank = (Integer) updates.get("finalRank");
            app.setFinalRank(rank);
            
            // Mark hackathon as having published results when a rank is assigned
            Optional<Hackathon> hackathonOpt = hackathonRepository.findById(app.getHackathonId());
            if (hackathonOpt.isPresent()) {
                Hackathon hackathon = hackathonOpt.get();
                hackathon.setResultsPublished(true);
                hackathonRepository.save(hackathon);
            }
        }

        // Update totalScore if provided
        if (updates.containsKey("totalScore")) {
            Double score = ((Number) updates.get("totalScore")).doubleValue();
            app.setTotalScore(score);
        }

        applicationRepository.save(app);
        return ResponseEntity.ok(app);
    }

    // --------------------------------------------
    // DELETE APPLICATION (Industry)
    // DELETE /hackathon-applications/{applicationId}
    // --------------------------------------------
    @DeleteMapping("/{applicationId}")
    public ResponseEntity<?> deleteApplication(
            @PathVariable String applicationId,
            Authentication auth,
            HttpServletRequest request) {

        User user = resolveUser(auth, request);
        if (user == null || !"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only industry users can delete applications");
        }

        Optional<HackathonApplication> appOpt = applicationRepository.findById(applicationId);
        if (appOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        HackathonApplication app = appOpt.get();

        // Verify ownership
        Optional<Hackathon> hackOpt = hackathonRepository.findById(app.getHackathonId());
        if (hackOpt.isEmpty() || !hackOpt.get().getCreatedByIndustryId().equals(user.getId())) {
            return ResponseEntity.status(403).body("You can only delete applications for your hackathons");
        }

        applicationRepository.delete(app);
        return ResponseEntity.ok("Application deleted successfully");
    }

    // --------------------------------------------
    // Helper — parse deadline with multiple format support
    // --------------------------------------------
    private LocalDateTime parseDeadline(String deadlineStr) {
        if (deadlineStr == null || deadlineStr.isBlank()) {
            return null;
        }

        // List of common date-time formats to try
        DateTimeFormatter[] formatters = {
            DateTimeFormatter.ISO_LOCAL_DATE_TIME,
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
            DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm:ss"),
            DateTimeFormatter.ISO_DATE_TIME,
            DateTimeFormatter.ISO_INSTANT
        };

        // Try each format
        for (DateTimeFormatter formatter : formatters) {
            try {
                return LocalDateTime.parse(deadlineStr.trim(), formatter);
            } catch (DateTimeParseException e) {
                continue;
            }
        }

        // If all formats fail, try parsing as ISO date-time with optional parts
        try {
            if (deadlineStr.matches("\\d{4}-\\d{2}-\\d{2}")) {
                return LocalDateTime.parse(deadlineStr + "T23:59:59", DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            }
        } catch (Exception e) {
            // Ignore
        }

        System.err.println("Could not parse deadline with any known format: " + deadlineStr);
        return null;
    }
}
