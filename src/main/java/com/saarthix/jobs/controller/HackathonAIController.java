package com.saarthix.jobs.controller;

import com.saarthix.jobs.service.HackathonAIService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/hackathons/ai")
public class HackathonAIController {

    private final HackathonAIService aiService;

    @Autowired
    public HackathonAIController(HackathonAIService aiService) {
        this.aiService = aiService;
    }

    /**
     * Generate hackathon form field content using AI
     * POST /api/hackathons/ai/generate
     * Body: { "fieldType": "description|problemStatement|requirements|submissionProcedure|eligibilityCriteria", "context": "optional context string" }
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generateContent(@RequestBody Map<String, String> request) {
        try {
            String fieldType = request.get("fieldType");
            String context = request.getOrDefault("context", "");

            if (fieldType == null || fieldType.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("fieldType is required");
            }

            String generatedContent = aiService.generateFieldContent(fieldType, context);
            return ResponseEntity.ok(Map.of("content", generatedContent));
        } catch (RuntimeException e) {
            if (e.getMessage().contains("API key")) {
                return ResponseEntity.status(503)
                    .body("AI service is not configured. Please configure OpenAI API key.");
            }
            return ResponseEntity.status(500)
                .body("Error generating content: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Error in AI generation: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body("Error generating content: " + e.getMessage());
        }
    }
}
