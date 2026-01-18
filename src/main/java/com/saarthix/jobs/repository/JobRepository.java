package com.saarthix.jobs.repository;

import com.saarthix.jobs.model.Job;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface JobRepository extends MongoRepository<Job, String> {
    List<Job> findByIndustryId(String industryId);  // Find all jobs posted by an industry user
}
