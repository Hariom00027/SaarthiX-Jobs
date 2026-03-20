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
     * Enhance existing hackathon field content using AI based on provided context.
     * The enhancement must preserve user intent and should not invent new requirements.
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
                return "You are an expert hackathon editor. Rewrite the provided description to improve grammar, clarity, tone, and professionalism. " +
                       "Do not add new facts, constraints, deadlines, or claims that are not already present in the input text. " +
                       "Keep the meaning unchanged. Return plain text only.";
            
            case "problemstatement":
                return "You are an expert hackathon editor. Rewrite the provided problem statement to be clear, professional, and easy to understand. " +
                       "Do not add new scope, assumptions, metrics, or requirements. Preserve original intent and facts. " +
                       "Return plain text only.";
            
            case "requirements":
                return "You are an expert technical editor. Improve the provided requirements text for clarity and professionalism only. " +
                       "Do not introduce any new tools, APIs, constraints, or rules. Keep content faithful to the original text. " +
                       "Return plain text only.";
            
            case "submissionprocedure":
                return "You are an expert process editor. Improve the provided submission procedure text for readability and professional tone. " +
                       "Do not add new steps, deadlines, or file requirements that are not in the original text. " +
                       "Return plain text only.";
            
            case "eligibilitycriteria":
                return "You are an expert policy editor. Rewrite the provided eligibility criteria to be concise, clear, and professional. " +
                       "Do not add or remove rules; only improve wording. Return plain text only.";
            
            default:
                return "You are an expert editor. Improve language quality without changing meaning or adding new information. " +
                       "Return plain text only.";
        }
    }

    private String buildUserPrompt(String fieldType, String context) {
        String basePrompt = "Enhance the existing text for the hackathon " + fieldType + " field.";
        
        if (context != null && !context.trim().isEmpty()) {
            basePrompt += "\n\nContext provided:\n" + context;
        }
        
        basePrompt += "\n\nImportant constraints:\n" +
                     "1) Work only with the existing sentence/content.\n" +
                     "2) Do not invent new requirements, timelines, entities, or facts.\n" +
                     "3) Keep the same intent and meaning.\n" +
                     "4) Return only the enhanced text.";
        
        return basePrompt;
    }
}
