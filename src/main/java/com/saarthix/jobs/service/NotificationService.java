package com.saarthix.jobs.service;

import com.saarthix.jobs.model.Application;
import com.saarthix.jobs.model.Job;
import com.saarthix.jobs.model.Notification;
import com.saarthix.jobs.model.User;
import com.saarthix.jobs.repository.JobRepository;
import com.saarthix.jobs.repository.NotificationRepository;
import com.saarthix.jobs.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;

    public NotificationService(NotificationRepository notificationRepository,
                              UserRepository userRepository,
                              JobRepository jobRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
    }

    /**
     * Create notification when application status is updated (for APPLICANT)
     */
    public void createStatusUpdateNotification(Application application, String oldStatus, String newStatus) {
        // Find the applicant user
        Optional<User> applicantOpt = userRepository.findById(application.getApplicantId());
        if (applicantOpt.isEmpty()) {
            System.out.println("Warning: Applicant user not found for application: " + application.getId());
            return;
        }

        User applicant = applicantOpt.get();
        
        // Create notification for the applicant
        Notification notification = new Notification();
        notification.setUserId(application.getApplicantId());
        notification.setUserType("APPLICANT");
        notification.setType("application_status_update");
        notification.setTitle("Application Status Updated");
        notification.setMessage(String.format(
            "Your application for %s at %s has been updated from %s to %s",
            application.getJobTitle(),
            application.getCompany(),
            oldStatus != null ? oldStatus : "pending",
            newStatus
        ));
        notification.setApplicationId(application.getId());
        notification.setJobId(application.getJobId());
        notification.setJobTitle(application.getJobTitle());
        notification.setCompanyName(application.getCompany());
        notification.setRead(false);

        notificationRepository.save(notification);
        System.out.println("Created status update notification for applicant: " + applicant.getEmail());
    }

    /**
     * Create notification when a new application is submitted (for INDUSTRY)
     */
    public void createNewApplicationNotification(Application application) {
        // Find the job to get the industry user ID
        Optional<Job> jobOpt = jobRepository.findById(application.getJobId());
        if (jobOpt.isEmpty()) {
            System.out.println("Warning: Job not found for application: " + application.getId());
            return;
        }

        Job job = jobOpt.get();
        if (job.getIndustryId() == null || job.getIndustryId().isEmpty()) {
            System.out.println("Warning: Job does not have an industryId: " + job.getId());
            return;
        }

        // Find the industry user
        Optional<User> industryUserOpt = userRepository.findById(job.getIndustryId());
        if (industryUserOpt.isEmpty()) {
            System.out.println("Warning: Industry user not found for job: " + job.getId());
            return;
        }

        User industryUser = industryUserOpt.get();
        
        // Create notification for the industry user
        Notification notification = new Notification();
        notification.setUserId(job.getIndustryId());
        notification.setUserType("INDUSTRY");
        notification.setType("new_application");
        notification.setTitle("New Application Received");
        notification.setMessage(String.format(
            "%s has applied for the position: %s",
            application.getFullName() != null && !application.getFullName().isEmpty() 
                ? application.getFullName() 
                : application.getApplicantEmail(),
            application.getJobTitle()
        ));
        notification.setApplicationId(application.getId());
        notification.setJobId(application.getJobId());
        notification.setJobTitle(application.getJobTitle());
        notification.setCompanyName(application.getCompany());
        notification.setRead(false);

        notificationRepository.save(notification);
        System.out.println("Created new application notification for industry user: " + industryUser.getEmail());
    }

    /**
     * Create notification when an industry shortlists a profile (for APPLICANT)
     * @param applicantId - ID of the applicant whose profile was shortlisted
     * @param applicantEmail - Email of the applicant
     * @param applicantName - Name of the applicant
     * @param industryEmail - Email of the industry user who shortlisted
     * @param companyName - Company name of the industry user (optional)
     */
    public void createProfileShortlistNotification(
            String applicantId, 
            String applicantEmail,
            String applicantName,
            String industryEmail,
            String companyName) {
        
        // Verify the applicant user exists
        Optional<User> applicantOpt = userRepository.findByEmail(applicantEmail);
        if (applicantOpt.isEmpty()) {
            System.out.println("Warning: Applicant user not found for email: " + applicantEmail);
            return;
        }

        User applicant = applicantOpt.get();
        
        // Get industry user details for the notification
        Optional<User> industryUserOpt = userRepository.findByEmail(industryEmail);
        String industryDisplayName = companyName;
        if (industryDisplayName == null || industryDisplayName.isEmpty()) {
            industryDisplayName = industryUserOpt.map(User::getName).orElse("An industry");
        }
        
        // Create notification for the applicant
        Notification notification = new Notification();
        notification.setUserId(applicant.getId());
        notification.setUserType("APPLICANT");
        notification.setType("profile_shortlisted");
        notification.setTitle("Profile Shortlisted!");
        notification.setMessage(String.format(
            "Great news! %s has shortlisted your profile. They're interested in your skills and experience.",
            industryDisplayName
        ));
        notification.setCompanyName(companyName);
        notification.setRead(false);

        notificationRepository.save(notification);
        System.out.println("Created profile shortlist notification for applicant: " + applicantEmail);
    }
}

