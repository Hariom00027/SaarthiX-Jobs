package com.saarthix.jobs.config;

import com.saarthix.jobs.model.User;
import com.saarthix.jobs.model.UserProfile;
import com.saarthix.jobs.repository.UserRepository;
import com.saarthix.jobs.repository.UserProfileRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;

    // Dummy data arrays
    private static final String[] FIRST_NAMES = {
        "Aarav", "Aditi", "Akshay", "Ananya", "Arjun", "Avni", "Dev", "Diya", "Ishaan", "Kavya",
        "Krishna", "Meera", "Neha", "Pranav", "Priya", "Rahul", "Riya", "Rohan", "Saanvi", "Samarth",
        "Shreya", "Siddharth", "Sneha", "Tanvi", "Ved", "Vidya", "Yash", "Zara", "Aryan", "Isha",
        "Kabir", "Maya", "Nikhil", "Pooja", "Raj", "Sara", "Varun", "Anika", "Dhruv", "Kriti",
        "Manav", "Nisha", "Om", "Radha", "Sahil", "Tara", "Vikram", "Aaliyah", "Arnav", "Ishita"
    };

    private static final String[] LAST_NAMES = {
        "Sharma", "Patel", "Kumar", "Singh", "Gupta", "Verma", "Reddy", "Mehta", "Joshi", "Shah",
        "Malhotra", "Agarwal", "Nair", "Iyer", "Menon", "Rao", "Desai", "Kapoor", "Chopra", "Bansal",
        "Goyal", "Khanna", "Saxena", "Tiwari", "Mishra", "Jain", "Bhatt", "Pandey", "Yadav", "Khan",
        "Ali", "Hussain", "Ahmed", "Kumar", "Das", "Bose", "Chatterjee", "Mukherjee", "Banerjee", "Ghosh",
        "Dutta", "Sengupta", "Basu", "Roy", "Mitra", "Saha", "Chakraborty", "Ganguly", "Biswas", "Mandal"
    };

    private static final String[] SKILLS_POOL = {
        "Java", "Python", "JavaScript", "React", "Node.js", "Spring Boot", "Angular", "Vue.js",
        "SQL", "MongoDB", "PostgreSQL", "MySQL", "AWS", "Docker", "Kubernetes", "Git",
        "HTML", "CSS", "TypeScript", "Express.js", "REST API", "GraphQL", "Microservices",
        "Machine Learning", "Data Science", "TensorFlow", "PyTorch", "Pandas", "NumPy",
        "C++", "C#", ".NET", "PHP", "Ruby", "Go", "Rust", "Swift", "Kotlin", "Flutter",
        "Android Development", "iOS Development", "UI/UX Design", "Figma", "Adobe XD",
        "Agile", "Scrum", "DevOps", "CI/CD", "Jenkins", "Linux", "System Design"
    };

    private static final String[] LOCATIONS = {
        "Mumbai, Maharashtra", "Delhi, Delhi", "Bangalore, Karnataka", "Hyderabad, Telangana",
        "Chennai, Tamil Nadu", "Pune, Maharashtra", "Kolkata, West Bengal", "Ahmedabad, Gujarat",
        "Jaipur, Rajasthan", "Surat, Gujarat", "Lucknow, Uttar Pradesh", "Kanpur, Uttar Pradesh",
        "Nagpur, Maharashtra", "Indore, Madhya Pradesh", "Thane, Maharashtra", "Bhopal, Madhya Pradesh",
        "Visakhapatnam, Andhra Pradesh", "Patna, Bihar", "Vadodara, Gujarat", "Ghaziabad, Uttar Pradesh"
    };

    private static final String[] ROLES = {
        "Software Engineer", "Full Stack Developer", "Backend Developer", "Frontend Developer",
        "DevOps Engineer", "Data Scientist", "Machine Learning Engineer", "QA Engineer",
        "UI/UX Designer", "Product Manager", "Business Analyst", "System Administrator",
        "Mobile App Developer", "Cloud Architect", "Security Engineer", "Database Administrator"
    };

    private static final String[] COMPANIES = {
        "TechCorp", "InnovateLabs", "Digital Solutions", "CloudTech", "DataSystems", "WebWorks",
        "AppDev Inc", "CodeMasters", "FutureTech", "SmartSolutions", "NextGen IT", "ProSoft",
        "GlobalTech", "InnovationHub", "TechVenture", "DigitalEdge", "CodeForge", "TechNova",
        "SoftServe", "DevStudio", "TechFlow", "CodeCraft", "InnovateSoft", "TechBridge"
    };

    private static final String[] DEGREES = {
        "B.Tech", "B.E.", "B.Sc", "B.Com", "BBA", "BCA", "M.Tech", "M.E.", "M.Sc", "MBA", "MCA", "MS"
    };

    private static final String[] STREAMS = {
        "Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil",
        "Electrical", "Data Science", "Artificial Intelligence", "Business Administration",
        "Commerce", "Science", "Mathematics", "Physics", "Chemistry"
    };

    private static final String[] INSTITUTIONS = {
        "IIT Delhi", "IIT Bombay", "IIT Madras", "IIT Kanpur", "IIT Kharagpur", "IIT Roorkee",
        "NIT Trichy", "NIT Surathkal", "NIT Warangal", "BITS Pilani", "IIIT Hyderabad",
        "Delhi University", "Mumbai University", "Bangalore University", "Anna University",
        "Jadavpur University", "Calcutta University", "Pune University", "Osmania University"
    };

    private static final String[] WORK_PREFERENCES = {"Remote", "On-site", "Hybrid"};
    private static final String[] AVAILABILITY_OPTIONS = {"Immediately", "1 week notice", "2 weeks notice", "1 month notice"};

    public DataSeeder(UserRepository userRepository, UserProfileRepository userProfileRepository) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
    }

    @Override
    public void run(String... args) {
        // Check if we should seed data (only if no profiles exist)
        long existingProfiles = userProfileRepository.count();
        if (existingProfiles > 0) {
            System.out.println("DataSeeder: Found " + existingProfiles + " existing profiles. Skipping automatic seed.");
            System.out.println("DataSeeder: Use GET /jobs-api/seed/students?count=50 to seed manually.");
            return;
        }

        System.out.println("DataSeeder: No profiles found. Starting to seed student data...");
        seedStudents(50); // Seed 50 students
    }

    public int seedStudents(int count) {
        System.out.println("Starting to seed " + count + " student users...");
        
        Random random = new Random();
        int seededCount = 0;
        
        for (int i = 0; i < count; i++) {
            try {
                // Generate unique email
                String email = "student" + (i + 1) + "@gmail.com";
                
                // Check if user already exists
                if (userRepository.findByEmail(email).isPresent()) {
                    System.out.println("User with email " + email + " already exists, skipping...");
                    continue;
                }
                
                // Generate random name
                String firstName = FIRST_NAMES[random.nextInt(FIRST_NAMES.length)];
                String lastName = LAST_NAMES[random.nextInt(LAST_NAMES.length)];
                String fullName = firstName + " " + lastName;
                String pictureUrl = "https://ui-avatars.com/api/?name=" + firstName + "+" + lastName + "&background=random";
                
                // Create User with APPLICANT type
                User user = new User();
                user.setName(fullName);
                user.setEmail(email);
                user.setPictureUrl(pictureUrl);
                user.setPicture(pictureUrl);
                user.setUserType("APPLICANT");
                user.setActive(true);
                user.setCreatedAt(LocalDateTime.now());
                user = userRepository.save(user);
                
                // Create UserProfile
                UserProfile profile = createUserProfile(user, fullName, email, random, i + 1);
                userProfileRepository.save(profile);
                
                seededCount++;
                
                if (seededCount % 10 == 0) {
                    System.out.println("Seeded " + seededCount + " students so far...");
                }
                
            } catch (Exception e) {
                System.err.println("Error seeding student " + i + ": " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        System.out.println("Seeding completed! Successfully seeded " + seededCount + " new students.");
        System.out.println("Total users in database: " + userRepository.count());
        System.out.println("Total profiles in database: " + userProfileRepository.count());
        return seededCount;
    }

    private UserProfile createUserProfile(User user, String fullName, String email, Random random, int studentNumber) {
        UserProfile profile = new UserProfile();
        
        // Basic Information
        profile.setApplicantEmail(email);
        profile.setApplicantId(user.getId());
        profile.setFullName(fullName);
        profile.setEmail(email);
        profile.setPhoneNumber(String.valueOf(9000000000L + studentNumber));
        
        // Profile picture
        profile.setProfilePictureFileName("student" + studentNumber + ".jpg");
        profile.setProfilePictureFileType("image/jpeg");
        profile.setProfilePictureBase64(null);
        profile.setProfilePictureFileSize(40000L + random.nextInt(20000)); // 40KB - 60KB
        
        // Resume
        profile.setResumeFileName("Student" + studentNumber + "_Resume.pdf");
        profile.setResumeFileType("application/pdf");
        // Set a dummy base64 resume (just for testing - in production this would be actual resume data)
        profile.setResumeBase64("dummy_resume_base64_data_for_student_" + studentNumber);
        profile.setResumeFileSize(700000L + random.nextInt(300000)); // 700KB - 1MB
        
        // Professional Information
        String role = ROLES[random.nextInt(ROLES.length)];
        profile.setCurrentPosition(role);
        profile.setCurrentCompany(COMPANIES[random.nextInt(COMPANIES.length)]);
        
        // Experience
        int yearsOfExp = random.nextInt(11);
        profile.setExperience(yearsOfExp + (yearsOfExp == 1 ? " Year" : " Years"));
        
        // Skills
        int numSkills = 3 + random.nextInt(6); // 3-8 skills
        Set<String> selectedSkills = new HashSet<>();
        while (selectedSkills.size() < numSkills) {
            selectedSkills.add(SKILLS_POOL[random.nextInt(SKILLS_POOL.length)]);
        }
        profile.setSkills(new ArrayList<>(selectedSkills));
        
        // Summary
        profile.setSummary("Experienced " + role + " with " + yearsOfExp + " years of experience. Passionate about technology and innovation.");
        
        // Location
        String location = LOCATIONS[random.nextInt(LOCATIONS.length)];
        profile.setCurrentLocation(location);
        
        // Preferred Locations (1-3 locations)
        List<String> preferredLocations = new ArrayList<>();
        int numPreferred = 1 + random.nextInt(3);
        Set<String> selectedLocations = new HashSet<>();
        selectedLocations.add(location); // Include current location
        while (selectedLocations.size() < numPreferred) {
            selectedLocations.add(LOCATIONS[random.nextInt(LOCATIONS.length)]);
        }
        preferredLocations.addAll(selectedLocations);
        profile.setPreferredLocations(preferredLocations);
        profile.setPreferredLocation(preferredLocations.get(0));
        
        // Work Preference
        profile.setWorkPreference(WORK_PREFERENCES[random.nextInt(WORK_PREFERENCES.length)]);
        profile.setWillingToRelocate(random.nextBoolean());
        
        // Contact & Links
        profile.setLinkedInUrl("https://linkedin.com/in/" + fullName.toLowerCase().replace(" ", "-"));
        profile.setGithubUrl("https://github.com/student" + studentNumber);
        profile.setPortfolioUrl("https://portfolio-student" + studentNumber + ".com");
        
        // Additional Information
        profile.setAvailability(AVAILABILITY_OPTIONS[random.nextInt(AVAILABILITY_OPTIONS.length)]);
        int expectedSalary = 800000 + random.nextInt(800000); // 8L to 16L
        profile.setExpectedSalary(String.valueOf(expectedSalary));
        profile.setCoverLetterTemplate("Cover letter for " + role + " position.");
        
        // Professional Experiences
        List<UserProfile.ProfessionalExperience> experiences = new ArrayList<>();
        if (yearsOfExp > 0) {
            int numExperiences = Math.min(1 + random.nextInt(3), yearsOfExp);
            for (int i = 0; i < numExperiences; i++) {
                UserProfile.ProfessionalExperience exp = new UserProfile.ProfessionalExperience();
                exp.setJobTitle(ROLES[random.nextInt(ROLES.length)]);
                exp.setCompany(COMPANIES[random.nextInt(COMPANIES.length)]);
                int startYear = 2024 - yearsOfExp - i;
                exp.setStartDate("01/" + String.format("%02d", 1 + random.nextInt(12)) + "/" + startYear);
                if (i == 0 && random.nextBoolean()) {
                    exp.setIsCurrentJob(true);
                    exp.setEndDate("Present");
                } else {
                    exp.setIsCurrentJob(false);
                    exp.setEndDate("31/" + String.format("%02d", 1 + random.nextInt(12)) + "/" + (startYear + 1 + random.nextInt(2)));
                }
                exp.setDescription("Worked on developing and maintaining software applications. Collaborated with cross-functional teams to deliver high-quality products.");
                experiences.add(exp);
            }
        }
        profile.setProfessionalExperiences(experiences);
        
        // Education
        List<UserProfile.EducationEntry> educationEntries = new ArrayList<>();
        
        // Graduation (main education)
        UserProfile.EducationEntry graduation = new UserProfile.EducationEntry();
        graduation.setLevel("Graduation");
        graduation.setDegree(DEGREES[random.nextInt(DEGREES.length)]);
        graduation.setStream(STREAMS[random.nextInt(STREAMS.length)]);
        graduation.setInstitution(INSTITUTIONS[random.nextInt(INSTITUTIONS.length)]);
        graduation.setPassingYear(String.valueOf(2020 + random.nextInt(4)));
        graduation.setPercentage(String.valueOf(70 + random.nextInt(25)) + "%");
        educationEntries.add(graduation);
        
        profile.setEducationEntries(educationEntries);
        profile.setEducation("Graduation");
        
        // Hobbies
        String[] hobbiesPool = {"Reading", "Traveling", "Photography", "Cooking", "Gaming", "Music", "Sports", "Dancing", "Writing", "Painting"};
        List<String> hobbies = new ArrayList<>();
        Set<String> selectedHobbies = new HashSet<>();
        while (selectedHobbies.size() < 3) {
            selectedHobbies.add(hobbiesPool[random.nextInt(hobbiesPool.length)]);
        }
        hobbies.addAll(selectedHobbies);
        profile.setHobbies(hobbies);
        
        // Projects
        List<UserProfile.Project> projects = new ArrayList<>();
        UserProfile.Project project = new UserProfile.Project();
        project.setName(role + " Application Project");
        project.setDescription("A professional project demonstrating skills in " + String.join(", ", profile.getSkills().subList(0, Math.min(3, profile.getSkills().size()))) + ".");
        project.setGithubLink("https://github.com/student" + studentNumber + "/project");
        project.setWebsiteLink("https://project-student" + studentNumber + ".com");
        projects.add(project);
        profile.setProjects(projects);
        
        // Certifications
        profile.setCertifications("Professional Certification in " + role);
        List<UserProfile.CertificationFile> certificationFiles = new ArrayList<>();
        UserProfile.CertificationFile cert = new UserProfile.CertificationFile();
        cert.setName("Professional Certification");
        cert.setFileName("Student" + studentNumber + "_Certification.pdf");
        cert.setFileType("application/pdf");
        cert.setFileBase64(null);
        cert.setFileSize(200000L + random.nextInt(100000)); // 200KB - 300KB
        cert.setIssuingOrganization("Professional Certification Board");
        cert.setIssueDate("01/01/2023");
        cert.setExpiryDate("01/01/2026");
        certificationFiles.add(cert);
        profile.setCertificationFiles(certificationFiles);
        
        // Timestamps
        profile.setCreatedAt(LocalDateTime.now());
        profile.setLastUpdated(LocalDateTime.now());
        
        return profile;
    }
}
