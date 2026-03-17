package com.saarthix.jobs.model;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class HackathonPhaseDeserializer extends JsonDeserializer<List<HackathonPhase>> {

    @Override
    public List<HackathonPhase> deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        ObjectMapper mapper = (ObjectMapper) p.getCodec();
        List<HackathonPhase> phases = new ArrayList<>();
        
        // Check if the current token is a string (JSON stringified array from frontend)
        if (p.getCurrentToken() == JsonToken.VALUE_STRING) {
            String jsonString = p.getText();
            if (jsonString == null || jsonString.trim().isEmpty()) {
                return phases;
            }
            
            try {
                // Parse the JSON string into a JsonNode
                JsonNode jsonNode = mapper.readTree(jsonString);
                if (jsonNode.isArray()) {
                    for (JsonNode phaseNode : jsonNode) {
                        HackathonPhase phase = mapPhaseNode(phaseNode, mapper);
                        if (phase != null) {
                            phases.add(phase);
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Error parsing phases JSON string: " + e.getMessage());
                e.printStackTrace();
                return phases;
            }
        }
        // If it's already an array, deserialize each element
        else if (p.getCurrentToken() == JsonToken.START_ARRAY) {
            while (p.nextToken() != JsonToken.END_ARRAY) {
                JsonNode phaseNode = mapper.readTree(p);
                HackathonPhase phase = mapPhaseNode(phaseNode, mapper);
                if (phase != null) {
                    phases.add(phase);
                }
            }
        }
        // If it's null, return empty list
        else if (p.getCurrentToken() == JsonToken.VALUE_NULL) {
            return phases;
        }
        
        return phases;
    }
    
    private HackathonPhase mapPhaseNode(JsonNode phaseNode, ObjectMapper mapper) {
        try {
            HackathonPhase phase = new HackathonPhase();
            
            // Map id (can be number or string)
            if (phaseNode.has("id")) {
                JsonNode idNode = phaseNode.get("id");
                if (idNode.isNumber()) {
                    phase.setId(String.valueOf(idNode.asInt()));
                } else if (idNode.isTextual()) {
                    phase.setId(idNode.asText());
                }
            }
            
            // Map name
            if (phaseNode.has("name")) {
                phase.setName(phaseNode.get("name").asText());
            }
            
            // Map description
            if (phaseNode.has("description")) {
                phase.setDescription(phaseNode.get("description").asText());
            }
            
            // Map deadline
            if (phaseNode.has("deadline")) {
                phase.setDeadline(phaseNode.get("deadline").asText());
            }
            
            // Map uploadFormat (from "formats" array or "uploadFormat" string)
            if (phaseNode.has("uploadFormat")) {
                phase.setUploadFormat(phaseNode.get("uploadFormat").asText());
            } else if (phaseNode.has("formats")) {
                JsonNode formatsNode = phaseNode.get("formats");
                if (formatsNode.isArray()) {
                    List<String> formats = new ArrayList<>();
                    for (JsonNode format : formatsNode) {
                        formats.add(format.asText());
                    }
                    phase.setUploadFormat(String.join(", ", formats));
                } else if (formatsNode.isTextual()) {
                    phase.setUploadFormat(formatsNode.asText());
                }
            }
            
            // Map phaseMode
            if (phaseNode.has("phaseMode")) {
                phase.setPhaseMode(phaseNode.get("phaseMode").asText());
            } else if (phaseNode.has("mode")) {
                phase.setPhaseMode(phaseNode.get("mode").asText());
            }
            
            // Map phaseVenueLocation
            if (phaseNode.has("phaseVenueLocation")) {
                phase.setPhaseVenueLocation(phaseNode.get("phaseVenueLocation").asText());
            } else if (phaseNode.has("venueLocation")) {
                phase.setPhaseVenueLocation(phaseNode.get("venueLocation").asText());
            }
            
            // Map phaseReportingTime
            if (phaseNode.has("phaseReportingTime")) {
                phase.setPhaseReportingTime(phaseNode.get("phaseReportingTime").asText());
            } else if (phaseNode.has("reportingTime")) {
                phase.setPhaseReportingTime(phaseNode.get("reportingTime").asText());
            }
            
            return phase;
        } catch (Exception e) {
            System.err.println("Error mapping phase node: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }
}
