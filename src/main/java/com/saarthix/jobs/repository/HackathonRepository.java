package com.saarthix.jobs.repository;

import com.saarthix.jobs.model.Hackathon;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface HackathonRepository extends MongoRepository<Hackathon, String> {
    List<Hackathon> findByCreatedByIndustryId(String createdByIndustryId);
}
