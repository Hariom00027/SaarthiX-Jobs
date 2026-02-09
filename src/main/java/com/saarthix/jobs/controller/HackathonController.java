package com.saarthix.jobs.controller;

import org.springframework.web.bind.annotation.GetMapping;
import java.util.List;

import com.saarthix.jobs.model.Hackathon;
import com.saarthix.jobs.model.HackathonApplication;
import com.saarthix.jobs.model.User;

import com.saarthix.jobs.repository.HackathonRepository;
import com.saarthix.jobs.repository.HackathonApplicationRepository;
import com.saarthix.jobs.repository.UserRepository;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.core.Authentication;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/hackathons")
public class HackathonController {

    private final HackathonRepository hackathonRepository;
    private final HackathonApplicationRepository hackathonApplicationRepository;
    private final UserRepository userRepository;

    public HackathonController(HackathonRepository hackathonRepository, HackathonApplicationRepository hackathonApplicationRepository, UserRepository userRepository) {
        this.hackathonRepository = hackathonRepository;
        this.hackathonApplicationRepository = hackathonApplicationRepository;
        this.userRepository = userRepository;
    }

    // --- KEEP ONLY THIS METHOD ---
    private User resolveUser(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return null;
        }

        Object principal = auth.getPrincipal();
        String email = null;

        if (principal instanceof OAuth2User oauth) {
            email = oauth.getAttribute("email");
        } else if (principal instanceof String) {
            email = (String) principal;
        }

        if (email != null) {
            return userRepository.findByEmail(email).orElse(null);
        }

        return null;
    }
    // ------------------------------

    // GET all hackathons (public)
    @GetMapping
    public List<Hackathon> getAll() {
        return hackathonRepository.findAll();
    }

    // GET hackathons posted by the authenticated industry user
    @GetMapping("/my-hackathons")
    public ResponseEntity<?> getMyHackathons(Authentication auth) {
        try {
            User user = resolveUser(auth);

            if (user == null) {
                System.err.println("User resolution failed - auth is null or not OAuth2");
                return ResponseEntity.status(401).body("Authentication failed. Please log in again.");
            }

            if (user.getId() == null || user.getId().isEmpty()) {
                System.err.println("User ID is null or empty");
                return ResponseEntity.status(401).body("User ID not found. Please log in again.");
            }

            if (!"INDUSTRY".equals(user.getUserType())) {
                System.err.println("User type check failed: " + user.getUserType());
                return ResponseEntity.status(403).body("Only industry users can view their hackathons. You are: " + user.getUserType());
            }

            List<Hackathon> hackathons = hackathonRepository.findByCreatedByIndustryId(user.getId());
            System.out.println("Retrieved " + hackathons.size() + " hackathons for industry: " + user.getId());
            return ResponseEntity.ok(hackathons);
        } catch (NullPointerException e) {
            System.err.println("NullPointerException in getMyHackathons: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Null pointer error: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("Error retrieving hackathons: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error retrieving hackathons: " + e.getMessage());
        }
    }

    // POST create hackathon (industry only)
    @PostMapping
    public ResponseEntity<?> createHackathon(@RequestBody Hackathon hackathon, Authentication auth) {
        try {
            User user = resolveUser(auth);

            if (user == null) {
                System.err.println("User resolution failed - auth is null or not OAuth2");
                return ResponseEntity.status(401).body("Authentication failed. Please log in again.");
            }

            if (user.getId() == null || user.getId().isEmpty()) {
                System.err.println("User ID is null or empty");
                return ResponseEntity.status(401).body("User ID not found. Please log in again.");
            }

            if (!"INDUSTRY".equals(user.getUserType())) {
                System.err.println("User type check failed: " + user.getUserType());
                return ResponseEntity.status(403).body("Only industry users can create hackathons. You are: " + user.getUserType());
            }

            hackathon.setCreatedByIndustryId(user.getId());
            hackathon.setViews(0);

            Hackathon saved = hackathonRepository.save(hackathon);
            System.out.println("Hackathon saved with ID: " + saved.getId() + " for industry: " + user.getId());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            System.err.println("Error saving hackathon: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error saving hackathon: " + e.getMessage());
        }
    }

    // PUT update hackathon (industry only)
    @PutMapping("/{hackathonId}")
    public ResponseEntity<?> updateHackathon(@PathVariable String hackathonId, @RequestBody Hackathon updatedHackathon, Authentication auth) {

        User user = resolveUser(auth);

        if (user == null || !"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only industry users can update hackathons");
        }

        var hackathon = hackathonRepository.findById(hackathonId);
        if (hackathon.isEmpty()) {
            return ResponseEntity.status(404).body("Hackathon not found");
        }

        Hackathon existingHackathon = hackathon.get();
        
        // Check if the user owns this hackathon
        if (!user.getId().equals(existingHackathon.getCreatedByIndustryId())) {
            return ResponseEntity.status(403).body("You can only update your own hackathons");
        }

        // Update fields
        existingHackathon.setTitle(updatedHackathon.getTitle());
        existingHackathon.setDescription(updatedHackathon.getDescription());
        existingHackathon.setCompany(updatedHackathon.getCompany());
        existingHackathon.setPrize(updatedHackathon.getPrize());
        existingHackathon.setTeamSize(updatedHackathon.getTeamSize());
        existingHackathon.setSubmissionUrl(updatedHackathon.getSubmissionUrl());
        existingHackathon.setStartDate(updatedHackathon.getStartDate());
        existingHackathon.setEndDate(updatedHackathon.getEndDate());
        existingHackathon.setMode(updatedHackathon.getMode());
        existingHackathon.setRequirements(updatedHackathon.getRequirements());
        existingHackathon.setInstructions(updatedHackathon.getInstructions());
        existingHackathon.setProblemStatement(updatedHackathon.getProblemStatement());
        existingHackathon.setSkillsRequired(updatedHackathon.getSkillsRequired());
        existingHackathon.setEligibilityCriteria(updatedHackathon.getEligibilityCriteria());
        existingHackathon.setParticipationType(updatedHackathon.getParticipationType());
        existingHackathon.setCourseBranch(updatedHackathon.getCourseBranch());
        existingHackathon.setYear(updatedHackathon.getYear());
        existingHackathon.setVenueLocation(updatedHackathon.getVenueLocation());
        existingHackathon.setVenueTime(updatedHackathon.getVenueTime());
        existingHackathon.setSubmissionProcedure(updatedHackathon.getSubmissionProcedure());
        existingHackathon.setParticipantLimit(updatedHackathon.getParticipantLimit());
        existingHackathon.setPhases(updatedHackathon.getPhases());

        return ResponseEntity.ok(hackathonRepository.save(existingHackathon));
    }

    // DELETE hackathon (industry only)
    @DeleteMapping("/{hackathonId}")
    public ResponseEntity<?> deleteHackathon(@PathVariable String hackathonId, Authentication auth) {

        User user = resolveUser(auth);

        if (user == null || !"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(403).body("Only industry users can delete hackathons");
        }

        var hackathon = hackathonRepository.findById(hackathonId);
        if (hackathon.isEmpty()) {
            return ResponseEntity.status(404).body("Hackathon not found");
        }

        // Check if the user owns this hackathon
        if (!user.getId().equals(hackathon.get().getCreatedByIndustryId())) {
            return ResponseEntity.status(403).body("You can only delete your own hackathons");
        }

        hackathonRepository.deleteById(hackathonId);
        return ResponseEntity.ok("Hackathon deleted successfully");
    }

    // GET applicants for a specific hackathon (industry only)
    @GetMapping("/{hackathonId}/applicants")
    public ResponseEntity<?> getHackathonApplicants(@PathVariable String hackathonId, Authentication auth) {
        try {
            User user = resolveUser(auth);

            if (user == null) {
                return ResponseEntity.status(401).body("Authentication failed. Please log in again.");
            }

            if (!"INDUSTRY".equals(user.getUserType())) {
                return ResponseEntity.status(403).body("Only industry users can view hackathon applicants");
            }

            var hackathon = hackathonRepository.findById(hackathonId);
            if (hackathon.isEmpty()) {
                return ResponseEntity.status(404).body("Hackathon not found");
            }

            // Check if the user owns this hackathon
            if (!user.getId().equals(hackathon.get().getCreatedByIndustryId())) {
                return ResponseEntity.status(403).body("You can only view applicants for your own hackathons");
            }

            List<HackathonApplication> applications = hackathonApplicationRepository.findByHackathonId(hackathonId);
            return ResponseEntity.ok(applications);
        } catch (Exception e) {
            System.err.println("Error retrieving hackathon applicants: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error retrieving applicants: " + e.getMessage());
        }
    }

    // PUT toggle enable/disable hackathon (industry only)
    @PutMapping("/{hackathonId}/toggle-status")
    public ResponseEntity<?> toggleHackathonStatus(@PathVariable String hackathonId, Authentication auth) {
        try {
            User user = resolveUser(auth);

            if (user == null) {
                return ResponseEntity.status(401).body("Authentication failed. Please log in again.");
            }

            if (!"INDUSTRY".equals(user.getUserType())) {
                return ResponseEntity.status(403).body("Only industry users can toggle hackathon status");
            }

            var hackathon = hackathonRepository.findById(hackathonId);
            if (hackathon.isEmpty()) {
                return ResponseEntity.status(404).body("Hackathon not found");
            }

            Hackathon existingHackathon = hackathon.get();
            
            // Check if the user owns this hackathon
            if (!user.getId().equals(existingHackathon.getCreatedByIndustryId())) {
                return ResponseEntity.status(403).body("You can only toggle status for your own hackathons");
            }

            // Toggle enabled status
            existingHackathon.setEnabled(!existingHackathon.isEnabled());
            Hackathon updated = hackathonRepository.save(existingHackathon);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            System.err.println("Error toggling hackathon status: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error toggling status: " + e.getMessage());
        }
    }
}
