package com.saarthix.jobs.controller;

import com.saarthix.jobs.model.Application;
import com.saarthix.jobs.model.Job;
import com.saarthix.jobs.model.ResumeAndDetails;
import com.saarthix.jobs.model.User;
import com.saarthix.jobs.model.UserProfile;
import com.saarthix.jobs.repository.ApplicationRepository;
import com.saarthix.jobs.repository.JobRepository;
import com.saarthix.jobs.repository.ResumeAndDetailsRepository;
import com.saarthix.jobs.repository.UserRepository;
import com.saarthix.jobs.repository.UserProfileRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import com.saarthix.jobs.service.NotificationService;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/applications")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class ApplicationController {

    private final ApplicationRepository applicationRepository;
    private final ResumeAndDetailsRepository resumeAndDetailsRepository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final NotificationService notificationService;
    private final UserProfileRepository userProfileRepository;

    public ApplicationController(ApplicationRepository applicationRepository, 
                                ResumeAndDetailsRepository resumeAndDetailsRepository,
                                UserRepository userRepository,
                                JobRepository jobRepository,
                                NotificationService notificationService,
                                UserProfileRepository userProfileRepository) {
        this.applicationRepository = applicationRepository;
        this.resumeAndDetailsRepository = resumeAndDetailsRepository;
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
        this.notificationService = notificationService;
        this.userProfileRepository = userProfileRepository;
    }

    /**
     * Get all applications for the current authenticated user
     */
    @GetMapping
    public ResponseEntity<?> getMyApplications(Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in to view applications");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        // Get applications by email
        List<Application> applications = applicationRepository.findByApplicantEmail(user.getEmail());
        
        // Log for verification
        System.out.println("Retrieved " + applications.size() + " applications from MongoDB collection 'all_applied_jobs' for user: " + user.getEmail());
        
        return ResponseEntity.ok(applications);
    }

    /**
     * Create a new application (alternative endpoint for frontend)
     */
    @PostMapping
    public ResponseEntity<?> createApplication(@RequestBody Map<String, Object> applicationData, Authentication auth) {
        try {
            // Check authentication
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body("Must be logged in to apply");
            }

            User user = resolveUserFromOAuth(auth);
            if (user == null) {
                return ResponseEntity.status(401).body("User not found");
            }

            // Check if user is APPLICANT type
            if (!"APPLICANT".equals(user.getUserType())) {
                return ResponseEntity.status(403).body("Only APPLICANT users can apply to jobs. Your current type: " + user.getUserType());
            }

            String jobId = (String) applicationData.get("jobId");
            if (jobId == null || jobId.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Job ID is required");
            }

            // Log the jobId being used
            System.out.println("=========================================");
            System.out.println("CREATING APPLICATION");
            System.out.println("Job ID from request: " + jobId);
            System.out.println("Applicant Email: " + user.getEmail());
            System.out.println("Applicant ID: " + user.getId());
            
            // Verify the job exists
            Optional<Job> jobOpt = jobRepository.findById(jobId);
            if (jobOpt.isPresent()) {
                Job job = jobOpt.get();
                System.out.println("Job found in database:");
                System.out.println("  - Job Title: " + job.getTitle());
                System.out.println("  - Company: " + job.getCompany());
                System.out.println("  - Industry ID: " + job.getIndustryId());
            } else {
                System.out.println("WARNING: Job not found in database with ID: " + jobId);
                System.out.println("This might be an external job or the ID format is different");
            }

            // Check if already applied
            Optional<Application> existingApp = applicationRepository.findByJobIdAndApplicantEmail(jobId, user.getEmail());
            if (existingApp.isPresent()) {
                System.out.println("Application already exists for this job and user");
                return ResponseEntity.status(400).body("You have already applied to this job");
            }
            System.out.println("No existing application found, creating new one");

            // Create new application
            Application application = new Application();
            application.setJobId(jobId);
            application.setApplicantEmail(user.getEmail());
            application.setApplicantId(user.getId());
            application.setJobTitle((String) applicationData.getOrDefault("jobTitle", ""));
            application.setCompany((String) applicationData.getOrDefault("company", "Company confidential"));
            application.setLocation((String) applicationData.getOrDefault("location", "Location not specified"));
            application.setJobDescription((String) applicationData.getOrDefault("jobDescription", ""));
            application.setStatus((String) applicationData.getOrDefault("status", "pending"));
            
            // Application form fields
            application.setFullName((String) applicationData.getOrDefault("fullName", user.getName()));
            application.setPhoneNumber((String) applicationData.getOrDefault("phoneNumber", ""));
            application.setCoverLetter((String) applicationData.getOrDefault("coverLetter", ""));
            application.setResumeFileName((String) applicationData.getOrDefault("resumeFileName", ""));
            application.setResumeFileType((String) applicationData.getOrDefault("resumeFileType", ""));
            application.setResumeBase64((String) applicationData.getOrDefault("resumeBase64", ""));
            Object resumeFileSize = applicationData.get("resumeFileSize");
            if (resumeFileSize != null) {
                if (resumeFileSize instanceof Number) {
                    application.setResumeFileSize(((Number) resumeFileSize).longValue());
                } else if (resumeFileSize instanceof String) {
                    try {
                        application.setResumeFileSize(Long.parseLong((String) resumeFileSize));
                    } catch (NumberFormatException e) {
                        // Ignore
                    }
                }
            }
            application.setLinkedInUrl((String) applicationData.getOrDefault("linkedInUrl", ""));
            application.setPortfolioUrl((String) applicationData.getOrDefault("portfolioUrl", ""));
            application.setExperience((String) applicationData.getOrDefault("experience", ""));
            application.setAvailability((String) applicationData.getOrDefault("availability", ""));

            Application saved = applicationRepository.save(application);
            
            // Also save to resume_and_details collection
            ResumeAndDetails resumeAndDetails = new ResumeAndDetails();
            resumeAndDetails.setJobId(jobId);
            resumeAndDetails.setJobTitle((String) applicationData.getOrDefault("jobTitle", ""));
            resumeAndDetails.setCompany((String) applicationData.getOrDefault("company", "Company confidential"));
            resumeAndDetails.setLocation((String) applicationData.getOrDefault("location", "Location not specified"));
            resumeAndDetails.setJobDescription((String) applicationData.getOrDefault("jobDescription", ""));
            resumeAndDetails.setApplicantEmail(user.getEmail());
            resumeAndDetails.setApplicantId(user.getId());
            resumeAndDetails.setFullName((String) applicationData.getOrDefault("fullName", user.getName()));
            resumeAndDetails.setPhoneNumber((String) applicationData.getOrDefault("phoneNumber", ""));
            resumeAndDetails.setResumeFileName((String) applicationData.getOrDefault("resumeFileName", ""));
            resumeAndDetails.setResumeFileType((String) applicationData.getOrDefault("resumeFileType", ""));
            resumeAndDetails.setResumeBase64((String) applicationData.getOrDefault("resumeBase64", ""));
            Object resumeFileSizeObj = applicationData.get("resumeFileSize");
            if (resumeFileSizeObj != null) {
                if (resumeFileSizeObj instanceof Number) {
                    resumeAndDetails.setResumeFileSize(((Number) resumeFileSizeObj).longValue());
                } else if (resumeFileSizeObj instanceof String) {
                    try {
                        resumeAndDetails.setResumeFileSize(Long.parseLong((String) resumeFileSizeObj));
                    } catch (NumberFormatException e) {
                        // Ignore
                    }
                }
            }
            resumeAndDetails.setCoverLetter((String) applicationData.getOrDefault("coverLetter", ""));
            resumeAndDetails.setLinkedInUrl((String) applicationData.getOrDefault("linkedInUrl", ""));
            resumeAndDetails.setPortfolioUrl((String) applicationData.getOrDefault("portfolioUrl", ""));
            resumeAndDetails.setExperience((String) applicationData.getOrDefault("experience", ""));
            resumeAndDetails.setAvailability((String) applicationData.getOrDefault("availability", ""));
            resumeAndDetails.setStatus((String) applicationData.getOrDefault("status", "pending"));
            
            ResumeAndDetails savedResume = resumeAndDetailsRepository.save(resumeAndDetails);
            
            // Create notification for industry user about new application
            notificationService.createNewApplicationNotification(saved);
            
            // Log detailed information about the saved application
            System.out.println("=========================================");
            System.out.println("APPLICATION SAVED TO MONGODB DATABASE");
            System.out.println("Collection: all_applied_jobs");
            System.out.println("Application ID: " + saved.getId());
            System.out.println("Applicant Email: " + saved.getApplicantEmail());
            System.out.println("Applicant ID: " + saved.getApplicantId());
            System.out.println("Job ID: " + saved.getJobId());
            System.out.println("Job Title: " + saved.getJobTitle());
            System.out.println("Company: " + saved.getCompany());
            System.out.println("Location: " + saved.getLocation());
            System.out.println("Status: " + saved.getStatus());
            System.out.println("Full Name: " + saved.getFullName());
            System.out.println("Phone: " + saved.getPhoneNumber());
            System.out.println("Resume File: " + saved.getResumeFileName() + " (" + 
                             (saved.getResumeFileSize() != null ? saved.getResumeFileSize() + " bytes" : "N/A") + ")");
            System.out.println("LinkedIn: " + (saved.getLinkedInUrl() != null && !saved.getLinkedInUrl().isEmpty() ? saved.getLinkedInUrl() : "Not provided"));
            System.out.println("Portfolio: " + (saved.getPortfolioUrl() != null && !saved.getPortfolioUrl().isEmpty() ? saved.getPortfolioUrl() : "Not provided"));
            System.out.println("Experience: " + (saved.getExperience() != null && !saved.getExperience().isEmpty() ? saved.getExperience() : "Not provided"));
            System.out.println("Availability: " + saved.getAvailability());
            System.out.println("Cover Letter Length: " + (saved.getCoverLetter() != null ? saved.getCoverLetter().length() + " characters" : "Not provided"));
            System.out.println("Applied At: " + saved.getAppliedAt());
            System.out.println("=========================================");
            
            // Log resume and details save
            System.out.println("=========================================");
            System.out.println("RESUME AND DETAILS SAVED TO MONGODB DATABASE");
            System.out.println("Collection: resume_and_details");
            System.out.println("Resume ID: " + savedResume.getId());
            System.out.println("Applicant Email: " + savedResume.getApplicantEmail());
            System.out.println("Full Name: " + savedResume.getFullName());
            System.out.println("Phone: " + savedResume.getPhoneNumber());
            System.out.println("Resume File: " + savedResume.getResumeFileName() + " (" + 
                             (savedResume.getResumeFileSize() != null ? savedResume.getResumeFileSize() + " bytes" : "N/A") + ")");
            System.out.println("Resume Type: " + savedResume.getResumeFileType());
            System.out.println("Cover Letter Length: " + (savedResume.getCoverLetter() != null ? savedResume.getCoverLetter().length() + " characters" : "Not provided"));
            System.out.println("LinkedIn: " + (savedResume.getLinkedInUrl() != null && !savedResume.getLinkedInUrl().isEmpty() ? savedResume.getLinkedInUrl() : "Not provided"));
            System.out.println("Portfolio: " + (savedResume.getPortfolioUrl() != null && !savedResume.getPortfolioUrl().isEmpty() ? savedResume.getPortfolioUrl() : "Not provided"));
            System.out.println("Experience: " + (savedResume.getExperience() != null && !savedResume.getExperience().isEmpty() ? savedResume.getExperience() : "Not provided"));
            System.out.println("Availability: " + savedResume.getAvailability());
            System.out.println("Job Title: " + savedResume.getJobTitle());
            System.out.println("Company: " + savedResume.getCompany());
            System.out.println("Applied At: " + savedResume.getAppliedAt());
            System.out.println("=========================================");
            
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            System.err.println("Error creating application: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error saving application: " + e.getMessage());
        }
    }

    /**
     * Get all jobs posted by the current industry user with application counts
     * IMPORTANT: This must be defined BEFORE @PutMapping("/{id}") to avoid path conflict
     */
    @GetMapping("/my-jobs")
    public ResponseEntity<?> getMyPostedJobs(Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in to view your jobs");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        // Check if user is INDUSTRY type
        if (!"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only INDUSTRY users can view their posted jobs");
        }

        // Get all jobs posted by this industry user
        List<Job> jobs = jobRepository.findByIndustryId(user.getId());
        
        // Log for debugging
        System.out.println("=========================================");
        System.out.println("GET /api/applications/my-jobs");
        System.out.println("User ID: " + user.getId());
        System.out.println("User Email: " + user.getEmail());
        System.out.println("User Type: " + user.getUserType());
        System.out.println("Found " + jobs.size() + " jobs for industry user");
        System.out.println("=========================================");
        
        // If no jobs found, check for backward compatibility (jobs without industryId)
        if (jobs.isEmpty()) {
            List<Job> allJobs = jobRepository.findAll();
            System.out.println("Total jobs in database: " + allJobs.size());
            
            // For backward compatibility: if jobs were created before industryId was added,
            // try to match by postedBy field (if it contains user email or name)
            List<Job> matchedJobs = allJobs.stream()
                .filter(job -> {
                    if (job.getIndustryId() == null || job.getIndustryId().isEmpty()) {
                        // Try to match by postedBy field
                        String postedBy = job.getPostedBy();
                        return postedBy != null && 
                               (postedBy.equals(user.getEmail()) || 
                                postedBy.equals(user.getName()));
                    }
                    return false;
                })
                .toList();
            
            if (!matchedJobs.isEmpty()) {
                System.out.println("Found " + matchedJobs.size() + " jobs by backward compatibility matching");
                // Update these jobs with the industryId for future queries
                for (Job job : matchedJobs) {
                    job.setIndustryId(user.getId());
                    jobRepository.save(job);
                }
                jobs = matchedJobs;
            }
        }

        return ResponseEntity.ok(jobs);
    }

    /**
     * Get applications for a specific job (for industry users who posted the job)
     * IMPORTANT: This must be defined BEFORE @GetMapping("/by-email/{email}") to avoid path conflict
     */
    @GetMapping("/job/{jobId}")
    public ResponseEntity<?> getApplicationsByJobId(
            @PathVariable String jobId,
            Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in to view applications");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        // Check if user is INDUSTRY type
        if (!"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only INDUSTRY users can view job applications");
        }

        // Verify the job exists and belongs to this industry user
        Optional<Job> jobOpt = jobRepository.findById(jobId);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Job not found");
        }

        Job job = jobOpt.get();
        if (!user.getId().equals(job.getIndustryId())) {
            return ResponseEntity.status(403).body("You can only view applications for your own jobs");
        }

        // Get all applications for this job
        List<Application> applications = applicationRepository.findByJobId(jobId);
        
        // Also check for applications that might have been created with different job ID formats
        // (e.g., if job ID was stored differently)
        if (applications.isEmpty()) {
            // Get all applications and filter by job title and company as fallback
            List<Application> allApplications = applicationRepository.findAll();
            List<Application> matchedApplications = allApplications.stream()
                .filter(app -> {
                    // Match by job title and company if jobId doesn't match
                    boolean titleMatch = job.getTitle() != null && 
                                       app.getJobTitle() != null && 
                                       job.getTitle().equalsIgnoreCase(app.getJobTitle());
                    boolean companyMatch = job.getCompany() != null && 
                                          app.getCompany() != null && 
                                          job.getCompany().equalsIgnoreCase(app.getCompany());
                    return titleMatch && companyMatch;
                })
                .toList();
            
            if (!matchedApplications.isEmpty()) {
                System.out.println("Found " + matchedApplications.size() + " applications by title/company matching");
                // Update these applications with the correct jobId
                for (Application app : matchedApplications) {
                    if (!jobId.equals(app.getJobId())) {
                        app.setJobId(jobId);
                        applicationRepository.save(app);
                    }
                }
                applications = matchedApplications;
            }
        }
        
        // Log for debugging
        System.out.println("=========================================");
        System.out.println("GET /api/applications/job/" + jobId);
        System.out.println("Job Title: " + job.getTitle());
        System.out.println("Company: " + job.getCompany());
        System.out.println("Industry User ID: " + user.getId());
        System.out.println("Job Industry ID: " + job.getIndustryId());
        System.out.println("Found " + applications.size() + " applications for this job");
        if (!applications.isEmpty()) {
            System.out.println("Application IDs: " + applications.stream()
                .map(Application::getId)
                .toList());
            System.out.println("Application Job IDs: " + applications.stream()
                .map(Application::getJobId)
                .toList());
        }
        System.out.println("=========================================");
        
        return ResponseEntity.ok(applications);
    }

    /**
     * Get applicant profiles for a specific job (for industry users who posted the job)
     * Returns applications with their corresponding user profiles
     * IMPORTANT: This must be defined BEFORE @PutMapping("/{id}/status") to avoid path conflict
     */
    @GetMapping("/job/{jobId}/profiles")
    public ResponseEntity<?> getApplicantProfilesByJobId(
            @PathVariable String jobId,
            Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in to view applicant profiles");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        // Check if user is INDUSTRY type
        if (!"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only INDUSTRY users can view applicant profiles");
        }

        // Verify the job exists and belongs to this industry user
        Optional<Job> jobOpt = jobRepository.findById(jobId);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Job not found");
        }

        Job job = jobOpt.get();
        if (!user.getId().equals(job.getIndustryId())) {
            return ResponseEntity.status(403).body("You can only view applicant profiles for your own jobs");
        }

        // Get all applications for this job
        List<Application> applications = applicationRepository.findByJobId(jobId);
        
        // Also check for applications that might have been created with different job ID formats
        if (applications.isEmpty()) {
            // Get all applications and filter by job title and company as fallback
            List<Application> allApplications = applicationRepository.findAll();
            List<Application> matchedApplications = allApplications.stream()
                .filter(app -> {
                    // Match by job title and company if jobId doesn't match
                    boolean titleMatch = job.getTitle() != null && 
                                       app.getJobTitle() != null && 
                                       job.getTitle().equalsIgnoreCase(app.getJobTitle());
                    boolean companyMatch = job.getCompany() != null && 
                                          app.getCompany() != null && 
                                          job.getCompany().equalsIgnoreCase(app.getCompany());
                    return titleMatch && companyMatch;
                })
                .toList();
            
            if (!matchedApplications.isEmpty()) {
                System.out.println("Found " + matchedApplications.size() + " applications by title/company matching");
                // Update these applications with the correct jobId
                for (Application app : matchedApplications) {
                    if (!jobId.equals(app.getJobId())) {
                        app.setJobId(jobId);
                        applicationRepository.save(app);
                    }
                }
                applications = matchedApplications;
            }
        }
        
        // For each application, fetch the corresponding user profile
        List<Map<String, Object>> applicationsWithProfiles = new java.util.ArrayList<>();
        
        for (Application application : applications) {
            Map<String, Object> applicationWithProfile = new java.util.HashMap<>();
            applicationWithProfile.put("application", application);
            
            // Try to find user profile by applicantId first, then by applicantEmail
            Optional<UserProfile> profileOpt = Optional.empty();
            if (application.getApplicantId() != null && !application.getApplicantId().isEmpty()) {
                profileOpt = userProfileRepository.findByApplicantId(application.getApplicantId());
            }
            
            if (profileOpt.isEmpty() && application.getApplicantEmail() != null && !application.getApplicantEmail().isEmpty()) {
                profileOpt = userProfileRepository.findByApplicantEmail(application.getApplicantEmail());
            }
            
            if (profileOpt.isPresent()) {
                applicationWithProfile.put("userProfile", profileOpt.get());
            } else {
                // If no profile found, set to null
                applicationWithProfile.put("userProfile", null);
                System.out.println("No user profile found for applicant: " + 
                    (application.getApplicantEmail() != null ? application.getApplicantEmail() : application.getApplicantId()));
            }
            
            applicationsWithProfiles.add(applicationWithProfile);
        }
        
        // Log for debugging
        System.out.println("=========================================");
        System.out.println("GET /api/applications/job/" + jobId + "/profiles");
        System.out.println("Job Title: " + job.getTitle());
        System.out.println("Company: " + job.getCompany());
        System.out.println("Industry User ID: " + user.getId());
        System.out.println("Found " + applications.size() + " applications");
        System.out.println("Found " + applicationsWithProfiles.stream()
            .filter(item -> item.get("userProfile") != null)
            .count() + " applications with profiles");
        System.out.println("=========================================");
        
        return ResponseEntity.ok(applicationsWithProfiles);
    }

    /**
     * Update application status (for industry users)
     * Industry users can update status of applications for their posted jobs
     * IMPORTANT: This must be defined BEFORE @GetMapping("/by-email/{email}") to avoid path conflict
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateApplicationStatusByIndustry(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in to update application status");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        // Check if user is INDUSTRY type
        if (!"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only INDUSTRY users can update application status");
        }

        Optional<Application> appOpt = applicationRepository.findById(id);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Application not found");
        }

        Application application = appOpt.get();
        
        // Verify the job belongs to this industry user
        Optional<Job> jobOpt = jobRepository.findById(application.getJobId());
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Job not found for this application");
        }

        Job job = jobOpt.get();
        if (!user.getId().equals(job.getIndustryId())) {
            return ResponseEntity.status(403).body("You can only update status for applications to your own jobs");
        }
        
        String newStatus = body.get("status");
        if (newStatus == null || newStatus.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Status is required");
        }

        // Validate status - expanded status list
        List<String> validStatuses = List.of(
            "pending", 
            "resume_viewed", 
            "call_scheduled", 
            "interview_scheduled", 
            "offer_sent", 
            "accepted", 
            "rejected"
        );
        if (!validStatuses.contains(newStatus.toLowerCase())) {
            return ResponseEntity.badRequest().body("Invalid status. Must be one of: " + validStatuses);
        }
        
        // Store old status before updating
        String oldStatus = application.getStatus();
        
        // Update status and lastUpdated timestamp
        application.setStatus(newStatus.toLowerCase());
        Application updated = applicationRepository.save(application);
        
        // Create notification for applicant about status update (only if status actually changed)
        if (oldStatus == null || !oldStatus.equalsIgnoreCase(newStatus.toLowerCase())) {
            notificationService.createStatusUpdateNotification(updated, oldStatus, newStatus.toLowerCase());
        }
        
        // Log for debugging
        System.out.println("=========================================");
        System.out.println("PUT /api/applications/" + id + "/status");
        System.out.println("Application ID: " + updated.getId());
        System.out.println("Job ID: " + updated.getJobId());
        System.out.println("Job Title: " + updated.getJobTitle());
        System.out.println("Applicant: " + updated.getApplicantEmail());
        System.out.println("Old Status: " + (oldStatus != null ? oldStatus : "N/A"));
        System.out.println("New Status: " + updated.getStatus());
        System.out.println("Updated By: " + user.getEmail() + " (Industry User)");
        System.out.println("=========================================");
        
        return ResponseEntity.ok(updated);
    }

    /**
     * Get applications by email (for admin or user verification)
     */
    @GetMapping("/by-email/{email}")
    public ResponseEntity<?> getApplicationsByEmail(@PathVariable String email, Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        // Users can only view their own applications
        if (!user.getEmail().equalsIgnoreCase(email)) {
            return ResponseEntity.status(403).body("You can only view your own applications");
        }

        List<Application> applications = applicationRepository.findByApplicantEmail(email);
        return ResponseEntity.ok(applications);
    }

    /**
     * Get all resume and details for the current authenticated user
     */
    @GetMapping("/resume-details")
    public ResponseEntity<?> getMyResumeAndDetails(Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in to view resume and details");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        // Get resume and details by email
        List<ResumeAndDetails> resumeAndDetails = resumeAndDetailsRepository.findByApplicantEmail(user.getEmail());
        
        // Log for verification
        System.out.println("Retrieved " + resumeAndDetails.size() + " resume and details from MongoDB collection 'resume_and_details' for user: " + user.getEmail());
        
        return ResponseEntity.ok(resumeAndDetails);
    }

    /**
     * Helper method to extract user from OAuth2 principal
     */
    private User resolveUserFromOAuth(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return null;
        }

        Object principal = auth.getPrincipal();

        if (principal instanceof OAuth2User oauthUser) {
            String email = oauthUser.getAttribute("email");
            if (email != null) {
                return userRepository.findByEmail(email).orElse(null);
            }
        }

        return null;
    }
}

