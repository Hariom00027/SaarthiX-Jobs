package com.saarthix.jobs.repository;

import com.saarthix.jobs.model.ResumeAndDetails;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ResumeAndDetailsRepository extends MongoRepository<ResumeAndDetails, String> {
    List<ResumeAndDetails> findByApplicantEmail(String applicantEmail);
    List<ResumeAndDetails> findByApplicantId(String applicantId);
    Optional<ResumeAndDetails> findByJobIdAndApplicantEmail(String jobId, String applicantEmail);
    List<ResumeAndDetails> findByJobId(String jobId);
}

