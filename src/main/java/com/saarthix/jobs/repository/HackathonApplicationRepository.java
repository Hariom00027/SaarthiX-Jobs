package com.saarthix.jobs.repository;

import com.saarthix.jobs.model.HackathonApplication;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface HackathonApplicationRepository extends MongoRepository<HackathonApplication, String> {
    List<HackathonApplication> findByApplicantId(String applicantId);
    List<HackathonApplication> findByHackathonId(String hackathonId);
}
