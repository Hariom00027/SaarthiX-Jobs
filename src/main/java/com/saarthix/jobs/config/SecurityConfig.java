package com.saarthix.jobs.config;

import com.saarthix.jobs.model.User;
import com.saarthix.jobs.repository.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;


import java.util.List;

@Configuration
public class SecurityConfig {

    private final UserRepository userRepository;

    public SecurityConfig(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // ✅ Enable CORS for frontend
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())

                // ✅ Authorization rules
                .authorizeHttpRequests(auth -> auth
        // ✅ Allow GET & POST job APIs without Google login
        .requestMatchers("/api/hackathons/**").permitAll()
.requestMatchers("/api/hackathons/apply/**").permitAll()

        .requestMatchers(HttpMethod.GET, "/api/jobs/**").permitAll()
        .requestMatchers(HttpMethod.POST, "/api/jobs/**").permitAll()
        
        // Public endpoints
        .requestMatchers(
                "/api/auth/**",
                "/api/test",
                "/",
                "/index.html",
                "/static/**",
                "/error",
                "/oauth2/**"
        ).permitAll()

        // ✅ Get current user endpoint (requires auth)
        .requestMatchers(HttpMethod.GET, "/api/user/me").authenticated()
        
        // ✅ Save role endpoint (public, called after OAuth)
        .requestMatchers(HttpMethod.POST, "/api/user/save-role").permitAll()

        // Everything else requires Google OAuth
        .anyRequest().authenticated()
)


                // ✅ OAuth2 Login config
                .oauth2Login(oauth -> oauth
                        // IMPORTANT: Do not override Google's login page
                        .defaultSuccessUrl("http://localhost:5173", true)
                        .successHandler(successHandler())
                )

                // ✅ Logout config
                .logout(logout -> logout
                        .logoutSuccessUrl("http://localhost:5173")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID")
                );

        return http.build();
    }


    // ✅ Success handler — handles both new and existing users
    @Bean
    public AuthenticationSuccessHandler successHandler() {
        return (request, response, authentication) -> {
            OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();

            String email = oauthUser.getAttribute("email");
            String name = oauthUser.getAttribute("name");
            String picture = oauthUser.getAttribute("picture");

            User existingUser = userRepository.findByEmail(email).orElse(null);

            if (existingUser == null) {
                // NEW USER - redirect to role selection
                // Get intent from session/cookie if available (from Dashboard click)
                String intent = request.getParameter("intent");
                String intentParam = (intent != null && !intent.isEmpty()) ? "&intent=" + intent : "";
                
                // Encode URL parameters properly
                String redirectUrl = String.format(
                    "http://localhost:5173/choose-role?email=%s&name=%s&picture=%s%s",
                    java.net.URLEncoder.encode(email, "UTF-8"),
                    java.net.URLEncoder.encode(name != null ? name : "", "UTF-8"),
                    java.net.URLEncoder.encode(picture != null ? picture : "", "UTF-8"),
                    intentParam
                );
                response.sendRedirect(redirectUrl);
            } else {
    // Existing user -> attach userType into session
    request.getSession().setAttribute("USER_TYPE", existingUser.getUserType());
    request.getSession().setAttribute("USER_ID", existingUser.getId());

    response.sendRedirect("http://localhost:5173/choose-role");
}

        };
    }

    // ✅ Proper CORS config
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
configuration.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:5174"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
