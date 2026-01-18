package com.saarthix.jobs.controller;

import com.saarthix.jobs.model.Notification;
import com.saarthix.jobs.model.User;
import com.saarthix.jobs.repository.NotificationRepository;
import com.saarthix.jobs.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationController(NotificationRepository notificationRepository,
                                 UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    /**
     * Get all notifications for the current authenticated user
     * Filtered by userType to ensure users only see relevant notifications
     */
    @GetMapping
    public ResponseEntity<?> getMyNotifications(Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in to view notifications");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        // Get all notifications for this user, ordered by most recent first
        List<Notification> allNotifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        
        // Filter by userType to ensure users only see their relevant notifications
        List<Notification> filteredNotifications = allNotifications.stream()
            .filter(n -> user.getUserType() != null && user.getUserType().equals(n.getUserType()))
            .toList();
        
        return ResponseEntity.ok(filteredNotifications);
    }

    /**
     * Get unread notifications count for the current authenticated user
     */
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.ok(Map.of("count", 0));
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null) {
            return ResponseEntity.ok(Map.of("count", 0));
        }

        // Get all unread notifications for this user
        List<Notification> unreadNotifications = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(user.getId());
        
        // Filter by userType
        long unreadCount = unreadNotifications.stream()
            .filter(n -> user.getUserType() != null && user.getUserType().equals(n.getUserType()))
            .count();
        
        return ResponseEntity.ok(Map.of("count", unreadCount));
    }

    /**
     * Mark a notification as read
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable String id, Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        // Find the notification
        Notification notification = notificationRepository.findById(id).orElse(null);
        if (notification == null) {
            return ResponseEntity.status(404).body("Notification not found");
        }

        // Verify the notification belongs to the current user
        if (!user.getId().equals(notification.getUserId())) {
            return ResponseEntity.status(403).body("You can only mark your own notifications as read");
        }

        // Mark as read
        notification.setRead(true);
        notificationRepository.save(notification);

        return ResponseEntity.ok(notification);
    }

    /**
     * Mark all notifications as read for the current user
     */
    @PutMapping("/mark-all-read")
    public ResponseEntity<?> markAllAsRead(Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        // Get all unread notifications for this user
        List<Notification> unreadNotifications = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(user.getId());
        
        // Mark all as read
        unreadNotifications.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(unreadNotifications);

        return ResponseEntity.ok(Map.of("message", "All notifications marked as read", "count", unreadNotifications.size()));
    }

    /**
     * Delete a notification
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable String id, Authentication auth) {
        // Check authentication
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body("Must be logged in");
        }

        User user = resolveUserFromOAuth(auth);
        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        // Find the notification
        Notification notification = notificationRepository.findById(id).orElse(null);
        if (notification == null) {
            return ResponseEntity.status(404).body("Notification not found");
        }

        // Verify the notification belongs to the current user
        if (!user.getId().equals(notification.getUserId())) {
            return ResponseEntity.status(403).body("You can only delete your own notifications");
        }

        // Delete the notification
        notificationRepository.delete(notification);

        return ResponseEntity.ok(Map.of("message", "Notification deleted successfully"));
    }

    /**
     * Helper method to extract user from OAuth2 principal
     */
    private User resolveUserFromOAuth(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return null;
        }

        Object principal = auth.getPrincipal();

        if (principal instanceof OAuth2User oauthUser) {
            String email = oauthUser.getAttribute("email");
            if (email != null) {
                return userRepository.findByEmail(email).orElse(null);
            }
        }

        return null;
    }
}

