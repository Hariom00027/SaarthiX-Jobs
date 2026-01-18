package com.saarthix.jobs.controller;

import com.saarthix.jobs.model.User;
import com.saarthix.jobs.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // -------------------------------
    // 1. RETURN LOGGED-IN GOOGLE USER
    // -------------------------------
    @GetMapping("/me")
    public Map<String, Object> getCurrentUser(@AuthenticationPrincipal OAuth2User oauthUser) {
        if (oauthUser == null) {
            return Map.of("authenticated", false);
        }

        return Map.of(
            "authenticated", true,
            "name", oauthUser.getAttribute("name"),
            "email", oauthUser.getAttribute("email"),
            "picture", oauthUser.getAttribute("picture")
        );
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
    // 3. INDUSTRY LOGIN
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

        return ResponseEntity.ok(user);
    }
}
