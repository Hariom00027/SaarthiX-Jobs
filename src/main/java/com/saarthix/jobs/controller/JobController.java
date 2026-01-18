package com.saarthix.jobs.controller;

import com.saarthix.jobs.model.Application;
import com.saarthix.jobs.model.Job;
import com.saarthix.jobs.model.User;
import com.saarthix.jobs.model.UserProfile;
import com.saarthix.jobs.repository.ApplicationRepository;
import com.saarthix.jobs.repository.JobRepository;
import com.saarthix.jobs.repository.UserProfileRepository;
import com.saarthix.jobs.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import com.saarthix.jobs.service.EmailService;
import com.saarthix.jobs.service.JobService;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/jobs")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class JobController {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final EmailService emailService;
    private final JobService jobService;
    private final UserProfileRepository userProfileRepository;

    public JobController(JobRepository jobRepository, UserRepository userRepository, ApplicationRepository applicationRepository, EmailService emailService, JobService jobService, UserProfileRepository userProfileRepository) {
        this.jobRepository = jobRepository;
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
        this.emailService = emailService;
        this.jobService = jobService;
        this.userProfileRepository = userProfileRepository;
    }

    // ✅ GET all jobs (public - no auth required)
    @GetMapping
    public List<Job> getAllJobs() {
        return jobRepository.findAll();
    }

    // ✅ GET a single job by ID (public - no auth required)
    @GetMapping("/{id}")
    public Optional<Job> getJobById(@PathVariable String id) {
        return jobRepository.findById(id);
    }

    // ✅ GET recommended jobs for authenticated applicant
    @GetMapping("/recommended/jobs")
    public ResponseEntity<?> getRecommendedJobs(Authentication auth) {
        try {
            // Check if user is authenticated
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body("Must be logged in to view recommended jobs");
            }

            User user = resolveUserFromOAuth(auth);
            if (user == null) {
                return ResponseEntity.status(401).body("User not found");
            }

            // Check if user is APPLICANT type
            if (!"APPLICANT".equals(user.getUserType())) {
                return ResponseEntity.status(403).body("Only APPLICANT users can view recommended jobs");
            }

            // Get user profile
            Optional<UserProfile> profileOpt = userProfileRepository.findByApplicantEmail(user.getEmail());
            if (profileOpt.isEmpty()) {
                return ResponseEntity.status(404).body("Profile not found. Please create your profile first.");
            }

            UserProfile profile = profileOpt.get();
            List<Map<String, Object>> recommendedJobs = jobService.getRecommendedJobs(profile);

            return ResponseEntity.ok(recommendedJobs);
        } catch (Exception e) {
            System.err.println("Error fetching recommended jobs: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error fetching recommended jobs: " + e.getMessage());
        }
    }

    // ✅ POST a new job (INDUSTRY users only)
    @PostMapping
    public ResponseEntity<?> createJob(@RequestBody Job job, Authentication auth) {
        try {
            // Log the received job data for debugging
            System.out.println("=== Received Job Data ===");
            System.out.println("Title: " + job.getTitle());
            System.out.println("Company: " + job.getCompany());
            System.out.println("Location: " + job.getLocation());
            System.out.println("Description: " + (job.getDescription() != null ? job.getDescription().substring(0, Math.min(50, job.getDescription().length())) + "..." : "null"));
            System.out.println("Skills: " + job.getSkills());
            System.out.println("Employment Type: " + job.getEmploymentType());
            System.out.println("Min Salary: " + job.getJobMinSalary());
            System.out.println("Max Salary: " + job.getJobMaxSalary());
            System.out.println("========================");
            
            // Check if user is authenticated via OAuth
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body("Must be logged in to post jobs");
            }

            // Get user from OAuth principal
            User user = resolveUserFromOAuth(auth);
            if (user == null) {
                return ResponseEntity.status(401).body("User not found");
            }

            // Check if user is INDUSTRY type
            if (!"INDUSTRY".equals(user.getUserType())) {
                return ResponseEntity.status(403).body("Only INDUSTRY users can post jobs. Current type: " + user.getUserType());
            }

            // Set the user/industry who posted the job
            job.setIndustryId(user.getId());
            // Ensure createdAt is set if not provided
            if (job.getCreatedAt() == null) {
                job.setCreatedAt(java.time.LocalDateTime.now());
            }
            // Ensure active is set
            if (!job.isActive() && job.getId() == null) {
                job.setActive(true);
            }
            
            Job savedJob = jobRepository.save(job);
            return ResponseEntity.ok(savedJob);
        } catch (Exception e) {
            // Log the error for debugging
            System.err.println("Error creating job: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(400).body("Error creating job: " + e.getMessage());
        }
    }

    // ✅ PUT update a job (INDUSTRY users only)
    @PutMapping("/{id}")
    public ResponseEntity<?> updateJob(@PathVariable String id, @RequestBody Job updatedJob, Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in to update jobs");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null || !"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only INDUSTRY users can update jobs");
        }

        Optional<Job> jobOpt = jobRepository.findById(id);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Job not found");
        }

        Job job = jobOpt.get();

        // Verify user owns the job
        if (!user.getId().equals(job.getIndustryId())) {
            return ResponseEntity.status(403).body("You can only edit your own jobs");
        }

        job.setTitle(updatedJob.getTitle());
        job.setDescription(updatedJob.getDescription());
        job.setCompany(updatedJob.getCompany());
        job.setLocation(updatedJob.getLocation());
        job.setActive(updatedJob.isActive());
        job.setSkills(updatedJob.getSkills());
        job.setIndustry(updatedJob.getIndustry());
        job.setEmploymentType(updatedJob.getEmploymentType());
        job.setJobMinSalary(updatedJob.getJobMinSalary());
        job.setJobMaxSalary(updatedJob.getJobMaxSalary());
        job.setJobSalaryCurrency(updatedJob.getJobSalaryCurrency());

        return ResponseEntity.ok(jobRepository.save(job));
    }

    // ✅ DELETE a job (INDUSTRY users only)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteJob(@PathVariable String id, Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in to delete jobs");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null || !"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only INDUSTRY users can delete jobs");
        }

        Optional<Job> jobOpt = jobRepository.findById(id);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Job not found");
        }

        Job job = jobOpt.get();

        // Verify user owns the job
        if (!user.getId().equals(job.getIndustryId())) {
            return ResponseEntity.status(403).body("You can only delete your own jobs");
        }

        jobRepository.deleteById(id);
        return ResponseEntity.ok("Job deleted successfully");
    }

    // ✅ Apply to job (APPLICANT users only)
    @PostMapping("/{jobId}/apply")
    public ResponseEntity<?> applyToJob(@PathVariable String jobId, Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in to apply");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null || !"APPLICANT".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only APPLICANT users can apply to jobs. Current type: " + (user != null ? user.getUserType() : "UNKNOWN"));
        }

        Optional<Job> jobOpt = jobRepository.findById(jobId);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Job not found");
        }

        Job job = jobOpt.get();

        // Check if user already applied to this job
        Optional<Application> existingApp = applicationRepository.findByJobIdAndApplicantEmail(jobId, user.getEmail());
        if (existingApp.isPresent()) {
            return ResponseEntity.status(400).body("You have already applied to this job");
        }

        // Create and save application
        Application application = new Application();
        application.setJobId(jobId);
        application.setApplicantEmail(user.getEmail());
        application.setApplicantId(user.getId());
        application.setJobTitle(job.getTitle());
        application.setCompany(job.getCompany());
        application.setLocation(job.getLocation());
        application.setJobDescription(job.getDescription());
        application.setStatus("pending");

        Application saved = applicationRepository.save(application);

        emailService.sendApplicationConfirmation(user, job, saved);
        
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
        System.out.println("Applied At: " + saved.getAppliedAt());
        System.out.println("=========================================");

        return ResponseEntity.ok("Applied successfully to job. Application saved to database with ID: " + saved.getId());
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
