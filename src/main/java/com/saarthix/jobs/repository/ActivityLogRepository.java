package com.saarthix.jobs.repository;

import com.saarthix.jobs.model.ActivityLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ActivityLogRepository extends MongoRepository<ActivityLog, String> {
    List<ActivityLog> findByIndustryEmail(String industryEmail);
    List<ActivityLog> findByStudentEmail(String studentEmail);
    List<ActivityLog> findByIndustryEmailAndActionType(String industryEmail, String actionType);
    List<ActivityLog> findByIndustryEmailAndStudentEmail(String industryEmail, String studentEmail);
}
