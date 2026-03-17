package com.saarthix.jobs.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import com.saarthix.jobs.model.Application;
import com.saarthix.jobs.model.Job;
import com.saarthix.jobs.model.User;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendApplicationConfirmation(User applicant, Job job, Application application) {

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(applicant.getEmail());
        message.setSubject("Application Received - " + job.getTitle());

        message.setText(
                "Hi " + applicant.getName() + ",\n\n"
                + "Your application for the position '" + job.getTitle() + "' at " + job.getCompany() + " has been submitted.\n"
                + "Application ID: " + application.getId() + "\n\n"
                + "Regards,\nSaarthi Jobs"
        );

        mailSender.send(message);
    }

    /**
     * Send notification to student when their profile/resume is downloaded by an industry user
     */
    public void sendProfileDownloadNotification(String studentEmail, String studentName, String industryCompany, String industryEmail) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(studentEmail);
            message.setSubject("Your Profile Was Downloaded - Saarthi Jobs");

            String industryInfo = industryCompany != null && !industryCompany.isEmpty() 
                ? industryCompany 
                : (industryEmail != null ? industryEmail.split("@")[0] : "an industry professional");

            message.setText(
                    "Hi " + (studentName != null ? studentName : "there") + ",\n\n"
                    + "Great news! Your profile/resume was recently downloaded by " + industryInfo + " through Saarthi Jobs.\n\n"
                    + "This is a positive sign that your profile has caught their attention. Keep your profile updated to increase your chances of getting noticed!\n\n"
                    + "If you haven't already, make sure to:\n"
                    + "- Keep your resume updated\n"
                    + "- Add relevant skills and projects\n"
                    + "- Complete your profile to 100%\n\n"
                    + "Best of luck with your job search!\n\n"
                    + "Regards,\nSaarthi Jobs Team"
            );

            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Error sending profile download notification: " + e.getMessage());
            e.printStackTrace();
            // Don't throw exception - notification failure shouldn't block the download
        }
    }
}
