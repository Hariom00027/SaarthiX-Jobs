package com.saarthix.jobs.controller;

import com.saarthix.jobs.config.DataSeeder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class TestController {

    private final DataSeeder dataSeeder;

    @Autowired
    public TestController(DataSeeder dataSeeder) {
        this.dataSeeder = dataSeeder;
    }

    @GetMapping("/test")
    public String test() {
        return "✅ Backend is working perfectly inside Docker!";
    }

    @GetMapping("/seed/students")
    public Map<String, Object> seedStudents(@RequestParam(defaultValue = "50") int count) {
        try {
            int seeded = dataSeeder.seedStudents(count);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Successfully seeded " + seeded + " students");
            response.put("count", seeded);
            return response;
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error seeding students: " + e.getMessage());
            e.printStackTrace();
            return response;
        }
    }
}
