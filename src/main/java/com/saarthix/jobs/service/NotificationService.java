package com.saarthix.jobs.service;

import com.saarthix.jobs.model.Application;
import com.saarthix.jobs.model.Job;
import com.saarthix.jobs.model.Notification;
import com.saarthix.jobs.model.User;
import com.saarthix.jobs.repository.JobRepository;
import com.saarthix.jobs.repository.NotificationRepository;
import com.saarthix.jobs.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

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

    /**
     * Notify applicants who already applied when job details change (within allowed edit window).
     */
    public void createJobDetailsUpdatedNotifications(Job previous, Job updated, List<Application> applications) {
        if (applications == null || applications.isEmpty() || previous == null || updated == null) {
            return;
        }
        String summary = buildJobChangeSummary(previous, updated);
        if (summary == null || summary.isBlank()) {
            return;
        }

        for (Application app : applications) {
            if (app.getApplicantId() == null || app.getApplicantId().isBlank()) {
                continue;
            }
            Optional<User> applicantOpt = userRepository.findById(app.getApplicantId());
            if (applicantOpt.isEmpty()) {
                continue;
            }
            User applicant = applicantOpt.get();
            String uType = applicant.getUserType();
            if (uType == null || uType.isBlank()) {
                uType = "APPLICANT";
            }

            Notification notification = new Notification();
            notification.setUserId(applicant.getId());
            notification.setUserType(uType);
            notification.setType("job_details_updated");
            notification.setTitle("Job posting updated — please review");
            notification.setMessage(String.format(
                    "The employer updated the role \"%s\" at %s. Review the changes below:\n\n%s\n\nOpen Apply to Jobs to see the full updated posting.",
                    safe(updated.getTitle()),
                    safe(updated.getCompany()),
                    summary
            ));
            notification.setApplicationId(app.getId());
            notification.setJobId(updated.getId());
            notification.setJobTitle(updated.getTitle());
            notification.setCompanyName(updated.getCompany());
            notification.setRead(false);

            notificationRepository.save(notification);
            System.out.println("Created job-updated notification for applicant id: " + applicant.getId());
        }
    }

    private static String safe(String s) {
        return s != null ? s : "";
    }

    private static String trunc(String s, int max) {
        if (s == null) return "";
        String t = s.replaceAll("\\s+", " ").trim();
        if (t.isEmpty()) return "";
        return t.length() <= max ? t : t.substring(0, max) + "…";
    }

    private String buildJobChangeSummary(Job before, Job after) {
        StringBuilder sb = new StringBuilder();
        if (!Objects.equals(trimToNull(before.getTitle()), trimToNull(after.getTitle()))) {
            sb.append("• Title: ").append(safe(before.getTitle())).append(" → ").append(safe(after.getTitle())).append("\n");
        }
        if (!Objects.equals(trimToNull(before.getCompany()), trimToNull(after.getCompany()))) {
            sb.append("• Company: ").append(safe(before.getCompany())).append(" → ").append(safe(after.getCompany())).append("\n");
        }
        if (!Objects.equals(trimToNull(before.getLocation()), trimToNull(after.getLocation()))) {
            sb.append("• Location: ").append(safe(before.getLocation())).append(" → ").append(safe(after.getLocation())).append("\n");
        }
        if (!Objects.equals(trimToNull(before.getEmploymentType()), trimToNull(after.getEmploymentType()))) {
            sb.append("• Employment type: ").append(safe(before.getEmploymentType())).append(" → ").append(safe(after.getEmploymentType())).append("\n");
        }
        if (!Objects.equals(before.getYearsOfExperience(), after.getYearsOfExperience())) {
            sb.append("• Years of experience required: ")
                    .append(before.getYearsOfExperience() != null ? before.getYearsOfExperience() : "—")
                    .append(" → ")
                    .append(after.getYearsOfExperience() != null ? after.getYearsOfExperience() : "—")
                    .append("\n");
        }
        if (!Objects.equals(before.getJobMinSalary(), after.getJobMinSalary())
                || !Objects.equals(before.getJobMaxSalary(), after.getJobMaxSalary())
                || !Objects.equals(trimToNull(before.getJobSalaryCurrency()), trimToNull(after.getJobSalaryCurrency()))) {
            sb.append("• Compensation updated.\n");
        }
        if (!listEquals(before.getSkills(), after.getSkills())) {
            sb.append("• Required skills were updated.\n");
        }
        if (!Objects.equals(trimToNull(before.getDescription()), trimToNull(after.getDescription()))) {
            sb.append("• Description (previous excerpt):\n  ")
                    .append(trunc(before.getDescription(), 400))
                    .append("\n• Description (new excerpt):\n  ")
                    .append(trunc(after.getDescription(), 400))
                    .append("\n");
        }
        return sb.toString().trim();
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static boolean listEquals(List<String> a, List<String> b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        List<String> na = a.stream().filter(Objects::nonNull).map(String::trim).filter(s -> !s.isEmpty()).sorted().collect(Collectors.toList());
        List<String> nb = b.stream().filter(Objects::nonNull).map(String::trim).filter(s -> !s.isEmpty()).sorted().collect(Collectors.toList());
        return na.equals(nb);
    }
}

