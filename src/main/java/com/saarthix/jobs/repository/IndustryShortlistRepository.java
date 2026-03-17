package com.saarthix.jobs.repository;

import com.saarthix.jobs.model.IndustryShortlist;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface IndustryShortlistRepository extends MongoRepository<IndustryShortlist, String> {
    List<IndustryShortlist> findByIndustryEmail(String industryEmail);
    Optional<IndustryShortlist> findByIndustryEmailAndStudentEmail(String industryEmail, String studentEmail);
    boolean existsByIndustryEmailAndStudentEmail(String industryEmail, String studentEmail);
    void deleteByIndustryEmailAndStudentEmail(String industryEmail, String studentEmail);
}
