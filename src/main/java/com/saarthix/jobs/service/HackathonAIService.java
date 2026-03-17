package com.saarthix.jobs.service;

import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import com.theokanning.openai.service.OpenAiService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class HackathonAIService {

    @Value("${openai.api.key:}")
    private String apiKey;

    /**
     * Generate hackathon form content using AI based on provided context
     * @param fieldType The type of field to generate (description, problemStatement, requirements, etc.)
     * @param context Additional context like title, company, skills, etc.
     * @return Generated content
     */
    public String generateFieldContent(String fieldType, String context) {
        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.equals("your-openai-api-key-here")) {
            throw new RuntimeException("OpenAI API key is not configured. Please set openai.api.key in application.properties");
        }

        try {
            OpenAiService service = new OpenAiService(apiKey, Duration.ofSeconds(60));

            String systemPrompt = buildSystemPrompt(fieldType);
            String userPrompt = buildUserPrompt(fieldType, context);

            ChatMessage systemMessage = new ChatMessage(ChatMessageRole.SYSTEM.value(), systemPrompt);
            ChatMessage userMessage = new ChatMessage(ChatMessageRole.USER.value(), userPrompt);

            ChatCompletionRequest request = ChatCompletionRequest.builder()
                    .model("gpt-3.5-turbo")
                    .messages(java.util.Arrays.asList(systemMessage, userMessage))
                    .maxTokens(500)
                    .temperature(0.7)
                    .build();

            String response = service.createChatCompletion(request)
                    .getChoices()
                    .get(0)
                    .getMessage()
                    .getContent()
                    .trim();

            // Clean up response - remove markdown code blocks if present
            if (response.startsWith("```")) {
                int startIdx = response.indexOf("\n") + 1;
                int endIdx = response.lastIndexOf("```");
                if (endIdx > startIdx) {
                    response = response.substring(startIdx, endIdx).trim();
                }
            }

            return response;
        } catch (Exception e) {
            System.err.println("Error generating AI content: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to generate content: " + e.getMessage());
        }
    }

    private String buildSystemPrompt(String fieldType) {
        switch (fieldType.toLowerCase()) {
            case "description":
                return "You are an expert hackathon organizer. Generate a compelling, professional hackathon description that " +
                       "explains the event's purpose, themes, goals, and what participants will be doing. Make it engaging and clear. " +
                       "Keep it between 150-300 words. Do not include markdown formatting.";
            
            case "problemstatement":
                return "You are an expert hackathon problem designer. Generate a clear, detailed problem statement that " +
                       "participants need to solve. Include the problem context, challenges, and desired outcomes. " +
                       "Make it specific and actionable. Keep it between 200-400 words. Do not include markdown formatting.";
            
            case "requirements":
                return "You are an expert hackathon organizer. Generate a comprehensive list of requirements, tools, libraries, " +
                       "APIs, or resources that participants can or should use. Include technical requirements and any constraints. " +
                       "Make it clear and organized. Keep it between 100-250 words. Do not include markdown formatting.";
            
            case "submissionprocedure":
                return "You are an expert hackathon organizer. Generate clear submission procedures explaining what participants " +
                       "must submit, file formats, naming conventions, deadlines, and how to submit. Make it step-by-step and easy to follow. " +
                       "Keep it between 150-300 words. Do not include markdown formatting.";
            
            case "eligibilitycriteria":
                return "You are an expert hackathon organizer. Generate eligibility criteria for participants including " +
                       "academic requirements, skill levels, team composition rules, and any other relevant criteria. " +
                       "Make it clear and fair. Keep it between 100-200 words. Do not include markdown formatting.";
            
            default:
                return "You are an expert hackathon organizer. Generate professional, clear content for hackathon forms. " +
                       "Do not include markdown formatting.";
        }
    }

    private String buildUserPrompt(String fieldType, String context) {
        String basePrompt = "Generate content for a hackathon " + fieldType + " field.";
        
        if (context != null && !context.trim().isEmpty()) {
            basePrompt += "\n\nContext provided:\n" + context;
        }
        
        basePrompt += "\n\nGenerate appropriate, professional content based on this context. " +
                     "If context is minimal, generate a generic but professional template that can be customized.";
        
        return basePrompt;
    }
}
