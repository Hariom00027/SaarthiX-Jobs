package com.saarthix.jobs.repository;

import com.saarthix.jobs.model.Application;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepository extends MongoRepository<Application, String> {
    List<Application> findByApplicantEmail(String applicantEmail);
    List<Application> findByApplicantId(String applicantId);
    Optional<Application> findByJobIdAndApplicantEmail(String jobId, String applicantEmail);
    List<Application> findByJobId(String jobId);  // For industry users to see all applications for a job
}

