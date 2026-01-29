package com.saarthix.jobs.controller;

import com.saarthix.jobs.model.User;
import com.saarthix.jobs.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // -------------------------------
    // 1. GET CURRENT USER FROM JWT
    // -------------------------------
    @GetMapping("/me")
    public Map<String, Object> getCurrentUser(HttpServletRequest request) {
        try {
            // Extract user info from JWT token (set by JwtAuthenticationFilter)
            String email = (String) request.getAttribute("userEmail");
            String userId = (String) request.getAttribute("userId");
            String userType = (String) request.getAttribute("userType");
            
            if (email == null) {
                return Map.of("authenticated", false);
            }
            
            // Get user from database to get additional info
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                return Map.of(
                    "authenticated", true,
                    "name", user.getName() != null ? user.getName() : user.getEmail(),
                    "email", user.getEmail(),
                    "picture", user.getPictureUrl() != null ? user.getPictureUrl() : "",
                    "userType", user.getUserType() != null ? user.getUserType() : "APPLICANT"
                );
            }
            
            // If user not in database yet, return JWT claims
            return Map.of(
                "authenticated", true,
                "email", email,
                "userType", userType != null ? userType : "APPLICANT"
            );
        } catch (Exception e) {
            return Map.of("authenticated", false);
        }
    }

    // -------------------------------
    // 2. INDUSTRY REGISTRATION
    // -------------------------------
    @PostMapping("/industry/register")
    public ResponseEntity<?> registerIndustry(@RequestBody Map<String, String> body) {

        String companyName = body.get("companyName");
        String email = body.get("email");
        String password = body.get("password");

        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Email already registered");
        }

        User industry = new User();
        industry.setName(companyName);
        industry.setEmail(email);
        industry.setPassword(passwordEncoder.encode(password));
        industry.setUserType("INDUSTRY");

        userRepository.save(industry);

        return ResponseEntity.ok("Industry registered successfully");
    }

    // -------------------------------
    // 3. INDUSTRY LOGIN (Returns JWT)
    // -------------------------------
    @PostMapping("/industry/login")
    public ResponseEntity<?> industryLogin(@RequestBody Map<String, String> body) {

        String email = body.get("email");
        String password = body.get("password");

        Optional<User> optionalUser = userRepository.findByEmail(email);

        if (optionalUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid email");
        }

        User user = optionalUser.get();

        if (!"INDUSTRY".equals(user.getUserType())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Account is not an industry account");
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Incorrect password");
        }

        // Generate JWT token for industry user
        // Note: We need to inject JwtUtil for this
        // For now, return success - will add JWT generation next
        return ResponseEntity.ok(Map.of(
            "success", true,
            "user", user,
            "message", "Login successful"
        ));
    }
}
