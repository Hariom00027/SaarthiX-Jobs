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
}
