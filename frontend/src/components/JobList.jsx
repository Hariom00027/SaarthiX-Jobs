import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { fetchJobs, fetchJobDetails, getRecommendedJobs, getUserProfile } from "../api/jobApi";
import { loginWithGoogle } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/apiConfig";
import JobApplicationForm from "./JobApplicationForm";

// Component to format and display job description in an organized way
function FormattedJobDescription({ description }) {
  if (!description || description === "No description available.") {
    return (
      <p className="text-gray-500 italic text-sm">No description available.</p>
    );
  }

  // Function to parse and organize the description
  const parseDescription = (desc) => {
    // First, try to extract text from HTML while preserving line breaks
    let textOnly = desc;
    
    // Replace common HTML list tags with markers
    textOnly = textOnly.replace(/<ul[^>]*>/gi, '\n').replace(/<\/ul>/gi, '\n');
    textOnly = textOnly.replace(/<ol[^>]*>/gi, '\n').replace(/<\/ol>/gi, '\n');
    textOnly = textOnly.replace(/<li[^>]*>/gi, '• ').replace(/<\/li>/gi, '\n');
    textOnly = textOnly.replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '\n');
    textOnly = textOnly.replace(/<br\s*\/?>/gi, '\n');
    textOnly = textOnly.replace(/<div[^>]*>/gi, '\n').replace(/<\/div>/gi, '\n');
    textOnly = textOnly.replace(/<h[1-6][^>]*>/gi, '\n### ').replace(/<\/h[1-6]>/gi, '\n');
    textOnly = textOnly.replace(/<strong[^>]*>/gi, '**').replace(/<\/strong>/gi, '**');
    textOnly = textOnly.replace(/<b[^>]*>/gi, '**').replace(/<\/b>/gi, '**');
    textOnly = textOnly.replace(/<em[^>]*>/gi, '*').replace(/<\/em>/gi, '*');
    textOnly = textOnly.replace(/<i[^>]*>/gi, '*').replace(/<\/i>/gi, '*');
    
    // Remove remaining HTML tags
    textOnly = textOnly.replace(/<[^>]*>/g, '');
    
    // Clean up whitespace but preserve line breaks
    textOnly = textOnly.replace(/[ \t]+/g, ' '); // Multiple spaces to single
    textOnly = textOnly.replace(/\n{3,}/g, '\n\n'); // Multiple newlines to double
    textOnly = textOnly.trim();
    
    // Common section headers to look for (improved patterns)
    const sectionPatterns = [
      { pattern: /(?:^|\n)\s*(?:about\s+(?:the\s+)?(?:role|position|job)|overview|summary|introduction|job\s+summary)[:•\-]?\s*/i, title: "About the Role" },
      { pattern: /(?:^|\n)\s*(?:responsibilities|what\s+you'?ll\s+do|key\s+responsibilities|duties|role\s+and\s+responsibilities|what\s+we\s+do)[:•\-]?\s*/i, title: "Responsibilities" },
      { pattern: /(?:^|\n)\s*(?:requirements|qualifications|what\s+we'?re\s+looking\s+for|must\s+have|required|skills?\s+required|key\s+requirements)[:•\-]?\s*/i, title: "Requirements" },
      { pattern: /(?:^|\n)\s*(?:preferred|nice\s+to\s+have|bonus|additional|pluses?)[:•\-]?\s*/i, title: "Preferred Qualifications" },
      { pattern: /(?:^|\n)\s*(?:benefits?|perks?|what\s+we\s+offer|compensation|salary|rewards?)[:•\-]?\s*/i, title: "Benefits & Perks" },
      { pattern: /(?:^|\n)\s*(?:education|degree|academic|bachelor|master|phd)[:•\-]?\s*/i, title: "Education" },
      { pattern: /(?:^|\n)\s*(?:experience|years?\s+of\s+experience|work\s+experience|professional\s+experience)[:•\-]?\s*/i, title: "Experience" },
    ];

    // Try to split by common patterns
    let sections = [];
    let remainingText = textOnly;

    // Find all section headers
    const foundSections = [];
    sectionPatterns.forEach(({ pattern, title }) => {
      const match = remainingText.search(pattern);
      if (match !== -1) {
        foundSections.push({ index: match, title, pattern });
      }
    });

    // Sort by index
    foundSections.sort((a, b) => a.index - b.index);

    // If we found sections, split accordingly
    if (foundSections.length > 0) {
      foundSections.forEach((section, idx) => {
        const startIndex = section.index;
        const endIndex = idx < foundSections.length - 1 ? foundSections[idx + 1].index : remainingText.length;
        let content = remainingText.substring(startIndex, endIndex)
          .replace(section.pattern, '')
          .trim();
        
        // Split content into items (by bullets, numbers, or lines)
        const items = content.split(/\n+/)
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.match(/^###/)); // Remove empty and headers
        
        if (items.length > 0) {
          sections.push({ title: section.title, content: items });
        }
      });
      
      // Add content before first section if any
      if (foundSections[0].index > 0) {
        const intro = remainingText.substring(0, foundSections[0].index).trim();
        if (intro.length > 20) { // Only if substantial content
          sections.unshift({ title: "Job Overview", content: [intro] });
        }
      }
    }

    // If no sections found, try to split by bullet points or numbered lists
    if (sections.length === 0) {
      // Check if it's a bullet list (look for lines starting with bullets)
      const lines = textOnly.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const bulletLines = lines.filter(line => 
        /^[•·▪▫◦‣⁃\-\*]\s/.test(line) || 
        /^\d+[\.\)]\s/.test(line) ||
        line.startsWith('•') || 
        line.startsWith('-') ||
        line.startsWith('*')
      );
      
      if (bulletLines.length > 2) {
        // It's a list, organize by context
        const listItems = bulletLines.map(item => 
          item.replace(/^[•·▪▫◦‣⁃\-\*\d+\.\)]\s*/, '').trim()
        ).filter(item => item.length > 0);
        
        // Try to group by keywords
        const responsibilities = [];
        const requirements = [];
        const benefits = [];
        const other = [];

        listItems.forEach(item => {
          const lower = item.toLowerCase();
          if (lower.includes('responsibilit') || lower.includes('develop') || lower.includes('build') || 
              lower.includes('create') || lower.includes('design') || lower.includes('implement') ||
              lower.includes('maintain') || lower.includes('collaborate') || lower.includes('work with')) {
            responsibilities.push(item);
          } else if (lower.includes('requirement') || lower.includes('qualification') || 
                     lower.includes('experience') || lower.includes('skill') || lower.includes('degree') ||
                     lower.includes('bachelor') || lower.includes('master') || lower.includes('years') ||
                     lower.includes('proficient') || lower.includes('knowledge') || lower.includes('familiar')) {
            requirements.push(item);
          } else if (lower.includes('benefit') || lower.includes('perk') || lower.includes('salary') ||
                     lower.includes('compensation') || lower.includes('insurance') || lower.includes('remote') ||
                     lower.includes('health') || lower.includes('vacation') || lower.includes('pto')) {
            benefits.push(item);
          } else {
            other.push(item);
          }
        });

        if (responsibilities.length > 0) sections.push({ title: "Responsibilities", content: responsibilities });
        if (requirements.length > 0) sections.push({ title: "Requirements", content: requirements });
        if (benefits.length > 0) sections.push({ title: "Benefits & Perks", content: benefits });
        if (other.length > 0 && other.length < 10) sections.push({ title: "Additional Information", content: other });
        if (other.length >= 10) {
          // Too many items, split into responsibilities and requirements
          const split = Math.ceil(other.length / 2);
          if (sections.length === 0) {
            sections.push({ title: "Key Points", content: other.slice(0, split) });
            sections.push({ title: "Additional Details", content: other.slice(split) });
          } else {
            sections.push({ title: "Additional Information", content: other });
          }
        }
      } else {
        // Just plain text, split into paragraphs
        const paragraphs = lines.filter(p => p.length > 20); // Only substantial paragraphs
        if (paragraphs.length > 1) {
          sections.push({ title: "Job Overview", content: paragraphs });
        } else {
          sections.push({ title: "Job Description", content: [textOnly] });
        }
      }
    }

    // If still no sections, just return the text as a single section
    if (sections.length === 0) {
      sections.push({ title: "Job Description", content: [textOnly] });
    }

    return sections;
  };

  const sections = parseDescription(description);

  return (
    <div className="space-y-4 sm:space-y-6">
      {sections.map((section, sectionIdx) => (
        <div key={sectionIdx} className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-3 sm:p-4 border-l-4 border-blue-500 shadow-sm">
          <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {section.title}
          </h4>
          <div className="space-y-2 sm:space-y-2.5 ml-0 sm:ml-8 lg:ml-10">
            {Array.isArray(section.content) ? (
              section.content.map((item, itemIdx) => (
                <div key={itemIdx} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-gray-700 leading-relaxed group hover:bg-blue-50/50 rounded-md p-1.5 sm:p-2 -m-1.5 sm:-m-2 transition-colors">
                  <span className="text-blue-500 mt-1 sm:mt-1.5 flex-shrink-0 font-bold">•</span>
                  <span className="flex-1">{item}</span>
                </div>
              ))
            ) : (
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line">{section.content}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function JobList() {
  const location = useLocation();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [filterIndustry, setFilterIndustry] = useState("All");
  const [filterCompany, setFilterCompany] = useState("All");
  const [filterSkill, setFilterSkill] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [jobToApply, setJobToApply] = useState(null);
  const [jobMatchPercentages, setJobMatchPercentages] = useState({});
  const [userProfile, setUserProfile] = useState(null);

  const { isAuthenticated, isIndustry, isApplicant } = useAuth();

  // Load user profile for skill highlighting
  const loadUserProfile = async () => {
    try {
      if (isAuthenticated && isApplicant) {
        const profile = await getUserProfile();
        setUserProfile(profile);
      }
    } catch (err) {
      console.error("Error loading user profile:", err);
      // Silent fail
    }
  };

  // Calculate match percentage for a job based on user profile
  const calculateJobMatch = (job, userProfile) => {
    if (!userProfile || !userProfile.skills) {
      return 0;
    }

    const userSkills = userProfile.skills.map(s => s.toLowerCase());
    const jobSkills = (job.raw?.skills || []).map(s => s.toLowerCase());
    const userLocations = [
      ...(userProfile.preferredLocations || []),
      userProfile.currentLocation || []
    ].map(l => l.toLowerCase()).filter(Boolean);
    const jobLocation = (job.location || '').toLowerCase();

    // Skills match (60% weight)
    let skillsMatch = 50; // Base score if no skills listed
    if (jobSkills.length > 0) {
      const matchedSkills = jobSkills.filter(jobSkill =>
        userSkills.some(userSkill => 
          jobSkill.includes(userSkill) || userSkill.includes(jobSkill)
        )
      );
      skillsMatch = (matchedSkills.length / jobSkills.length) * 100;
    }

    // Location match (40% weight)
    let locationMatch = 50; // Base score if no location specified
    if (jobLocation) {
      const isLocationMatch = userLocations.some(loc =>
        jobLocation.includes(loc) || loc.includes(jobLocation)
      );
      locationMatch = isLocationMatch ? 100 : (jobLocation.includes('remote') ? 75 : 0);
    }

    const totalMatch = (skillsMatch * 0.6) + (locationMatch * 0.4);
    return Math.round(Math.min(totalMatch, 100));
  };

  // Load recommended jobs match percentages
  const loadRecommendedJobs = async () => {
    try {
      if (isAuthenticated && isApplicant) {
        // Try to get recommended jobs from backend first
        const recommendedJobs = await getRecommendedJobs();
        const matchMap = {};
        if (Array.isArray(recommendedJobs)) {
          recommendedJobs.forEach(item => {
            matchMap[item.job.id] = item.matchPercentage;
          });
        }
        
        // Also calculate matches for all loaded jobs using user profile
        if (userProfile && jobs && jobs.length > 0) {
          jobs.forEach(job => {
            if (matchMap[job.id] === undefined) {
              // Only calculate if not already in recommended list
              matchMap[job.id] = calculateJobMatch(job, userProfile);
            }
          });
        }
        
        setJobMatchPercentages(matchMap);
      }
    } catch (err) {
      console.error("Error loading recommended jobs:", err);
      // Fallback: calculate matches for all jobs using user profile
      if (userProfile && isApplicant && jobs && jobs.length > 0) {
        const matchMap = {};
        jobs.forEach(job => {
          matchMap[job.id] = calculateJobMatch(job, userProfile);
        });
        setJobMatchPercentages(matchMap);
      }
    }
  };

  // Define loadJobs outside useEffect so it can be called manually
  const loadJobs = async () => {
    try {
      if (!refreshing) setLoading(true);
      setError(null);

      const [localResult, externalResult] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/jobs`, {
          withCredentials: true,
        }),
        fetchJobs("software developer in India"),
      ]);

      const localData =
        localResult.status === "fulfilled" ? localResult.value.data : [];
      const externalJobs =
        externalResult.status === "fulfilled" ? externalResult.value : [];
      console.log(localData, externalJobs);

      const localJobs = (Array.isArray(localData) ? localData : []).map(
        (job, idx) => ({
        id:
          job.id ??
          job._id ??
          `local-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        title: job.title,
        description: job.description,
        company: job.company,
        location: job.location || "Remote",
        industry: job.industry || "General",
        source: "Local",
        raw: {
          ...job,
          skills: job.skills || [],
          industry: job.industry || "General",
          employmentType: job.employmentType,
          jobMinSalary: job.jobMinSalary,
          jobMaxSalary: job.jobMaxSalary,
          jobSalaryCurrency: job.jobSalaryCurrency,
          createdAt: job.createdAt,
        },
      }));

      // Helper function to extract industry from job title
      const extractIndustryFromTitle = (title) => {
        if (!title) return "General";
        const titleLower = title.toLowerCase();
        if (titleLower.includes('software') || titleLower.includes('developer') || titleLower.includes('tech')) return 'Technology';
        if (titleLower.includes('nurse') || titleLower.includes('medical') || titleLower.includes('healthcare')) return 'Healthcare';
        if (titleLower.includes('finance') || titleLower.includes('accountant') || titleLower.includes('bank')) return 'Finance';
        if (titleLower.includes('teacher') || titleLower.includes('education') || titleLower.includes('instructor')) return 'Education';
        if (titleLower.includes('marketing') || titleLower.includes('sales')) return 'Marketing & Sales';
        if (titleLower.includes('engineer') && !titleLower.includes('software')) return 'Engineering';
        return 'General';
      };

      const rapidJobs = (Array.isArray(externalJobs) ? externalJobs : []).map((job) => ({
        id: job.job_id,
        title: job.job_title,
        description: job.job_description,
        company: job.employer_name,
        location: [job.job_city, job.job_country].filter(Boolean).join(", "),
        industry: extractIndustryFromTitle(job.job_title),
        source: "External",
        raw: job,
      }));

      setJobs([...localJobs, ...rapidJobs]);

      if (
        localResult.status === "rejected" &&
        externalResult.status === "fulfilled"
      ) {
        console.warn("Failed to load local jobs:", localResult.reason);
      }
      if (
        externalResult.status === "rejected" &&
        localResult.status === "fulfilled"
      ) {
        console.warn("Failed to load external jobs:", externalResult.reason);
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError("Unable to load jobs right now. Please try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
  };

  // Get unique values for filters
  // Roles (job titles) - use full titles
  const uniqueRoles = new Set();
  jobs.forEach((job) => {
    if (job.title && job.title.trim()) {
      uniqueRoles.add(job.title.trim());
    }
  });
  const roles = ["All", ...Array.from(uniqueRoles).sort()];

  // Industries
  const uniqueIndustries = new Set();
  jobs.forEach((job) => {
    if (job.industry && job.industry.trim()) {
      uniqueIndustries.add(job.industry.trim());
    }
  });
  const industries = ["All", ...Array.from(uniqueIndustries).sort()];

  // Skills/Education
  const uniqueSkills = new Set();
  jobs.forEach((job) => {
    if (job.raw?.skills && Array.isArray(job.raw.skills)) {
      job.raw.skills.forEach(skill => {
        if (skill && skill.trim()) {
          uniqueSkills.add(skill.trim());
        }
      });
    }
  });
  const skills = ["All", ...Array.from(uniqueSkills).sort()];

  // Locations
  const uniqueLocations = new Set();
  jobs.forEach((job) => {
    if (job.location && job.location.trim()) {
      uniqueLocations.add(job.location.trim());
    }
  });
  const locations = ["All", ...Array.from(uniqueLocations).sort()];

  // Companies
  const companyMap = new Map();
  jobs.forEach((job) => {
    if (job.company && job.company.trim()) {
      const normalized = job.company.trim();
      const lowerKey = normalized.toLowerCase();
      if (!companyMap.has(lowerKey)) {
        companyMap.set(lowerKey, normalized);
      }
    }
  });
  const companies = ["All", ...Array.from(companyMap.values()).sort((a, b) => a.localeCompare(b))];

  // Filter jobs based on all filters
  const filteredJobs = jobs.filter((job) => {
    // Search query matches title or description
    const matchesSearch = !searchQuery || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.description && job.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Role filter (job title)
    const matchesRole = filterRole === "All" || 
      (job.title && job.title === filterRole);
    
    // Industry filter
    const matchesIndustry = filterIndustry === "All" || 
      (job.industry && job.industry.toLowerCase() === filterIndustry.toLowerCase());
    
    // Company filter
    const matchesCompany = filterCompany === "All" || 
      (job.company && job.company === filterCompany);
    
    // Skills/Education filter
    const matchesSkill = filterSkill === "All" || 
      (job.raw?.skills && Array.isArray(job.raw.skills) && 
       job.raw.skills.some(skill => 
         skill && skill.toLowerCase().includes(filterSkill.toLowerCase())
       ));
    
    // Other filters
    const matchesSource = filterSource === "All" || job.source === filterSource;
    const matchesLocation = filterLocation === "All" || job.location === filterLocation;
    
    return matchesSearch && matchesRole && matchesIndustry && matchesCompany && 
           matchesSkill && matchesSource && matchesLocation;
  });

  useEffect(() => {
    loadJobs();
    loadRecommendedJobs();
    loadUserProfile();
  }, []);

  // Recalculate match percentages when jobs or user profile changes
  useEffect(() => {
    if (jobs.length > 0 && userProfile) {
      loadRecommendedJobs();
    }
  }, [jobs, userProfile]);

  // Check if user returned from build-profile and should open application form
  useEffect(() => {
    const savedJobData = localStorage.getItem('jobApplicationJobData');
    const savedFormData = localStorage.getItem('jobApplicationFormData');
    const returnFromProfile = location.state?.returnFromProfile;
    
    // Only auto-open if user returned from profile AND has saved form data
    if (returnFromProfile && savedJobData && savedFormData && jobs.length > 0 && !showApplicationForm) {
      try {
        const parsedJobData = JSON.parse(savedJobData);
        const parsedFormData = JSON.parse(savedFormData);
        
        // Verify that saved form data exists and has some content
        const hasFormData = parsedFormData.formData && (
          parsedFormData.formData.fullName ||
          parsedFormData.formData.phoneNumber ||
          parsedFormData.formData.coverLetter ||
          parsedFormData.formData.linkedInUrl ||
          parsedFormData.formData.portfolioUrl ||
          parsedFormData.formData.experience
        );
        
        if (hasFormData) {
          // Find the job that matches the saved job ID
          const matchingJob = jobs.find(job => job.id === parsedJobData.jobId);
          if (matchingJob) {
            // Get job details first, then open form
            const openFormWithJob = async () => {
              try {
                let details = null;
                if (matchingJob.source !== "External") {
                  details = {
                    job_title: matchingJob.title,
                    job_description: matchingJob.description,
                    employer_name: matchingJob.company,
                    job_city: matchingJob.location,
                    job_country: "",
                    job_apply_link: matchingJob.raw?.applyLink || "",
                    job_employment_type: matchingJob.raw?.employmentType || "",
                    job_min_salary: matchingJob.raw?.jobMinSalary,
                    job_max_salary: matchingJob.raw?.jobMaxSalary,
                    job_salary_currency: matchingJob.raw?.jobSalaryCurrency || "USD",
                    job_posted_at_datetime_utc: matchingJob.raw?.createdAt,
                    skills: matchingJob.raw?.skills || [],
                  };
                } else {
                  details = await fetchJobDetails(matchingJob.id);
                }
                setJobToApply({ ...matchingJob, details });
                setShowApplicationForm(true);
              } catch (err) {
                console.error('Error loading job details:', err);
                // Still open form with basic job info
                setJobToApply(matchingJob);
                setShowApplicationForm(true);
              }
            };
            
            // Small delay to ensure component is ready
            setTimeout(openFormWithJob, 300);
          }
        }
      } catch (err) {
        console.error('Error checking saved form data:', err);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.length, location.state?.returnFromProfile]); // Run when jobs are loaded or location state changes

  const handleViewDetails = async (job) => {
    setSelectedJob(job);
    setJobDetails(null);
    setDetailsError(null);

    if (job.source !== "External") {
      setJobDetails({
        job_title: job.title,
        job_description: job.description,
        employer_name: job.company,
        job_city: job.location,
        job_country: "",
        job_apply_link: job.raw?.applyLink || "",
        job_employment_type: job.raw?.employmentType || job.raw?.employmentType || "",
        job_min_salary: job.raw?.job_min_salary || job.raw?.jobMinSalary,
        job_max_salary: job.raw?.job_max_salary || job.raw?.jobMaxSalary,
        job_salary_currency: job.raw?.job_salary_currency || job.raw?.jobSalaryCurrency || "USD",
        job_posted_at_datetime_utc: job.raw?.createdAt,
        skills: job.raw?.skills || [],
      });
      return;
    }

    setDetailsLoading(true);
    try {
      const details = await fetchJobDetails(job.id);
      if (details) {
        setJobDetails(details);
      } else {
        setDetailsError("No additional details available for this job.");
      }
    } catch (err) {
      console.error("Failed to load job details:", err);
      setDetailsError("Failed to load job details. Please try again.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleApply = (job, details) => {
    // For external jobs, redirect to the company's website
    if (job.source === "External") {
      const applyLink = details?.job_apply_link || job.raw?.job_apply_link || job.raw?.apply_link;
      if (applyLink) {
        window.open(applyLink, '_blank', 'noopener,noreferrer');
        toast.info("Redirecting to company website...", {
          position: "top-right",
          autoClose: 2000,
        });
        return;
      } else {
        toast.warning("Application link not available for this job.", {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }
    }

    // For local jobs, show application form (requires authentication)
    if (!isAuthenticated) {
      if (
        window.confirm("Please sign in with Google to apply. Continue to login?")
      ) {
        loginWithGoogle();
      }
      return;
    }

    // Show application form for local jobs only
    setJobToApply({ ...job, details });
    setShowApplicationForm(true);
  };

  const handleApplicationSuccess = () => {
    setShowApplicationForm(false);
    setJobToApply(null);
    closeModal();
  };

  const closeModal = () => {
    setSelectedJob(null);
    setJobDetails(null);
    setDetailsError(null);
    setDetailsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Navigation Buttons */}
        <div className="mb-6 sm:mb-8 flex flex-wrap gap-3 sm:gap-4 justify-center sm:justify-start">
          <Link
            to="/apply-jobs"
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 no-underline ${
              location.pathname === '/apply-jobs'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
            }`}
          >
            Apply for Jobs
          </Link>
          <Link
            to="/browse-hackathons"
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 transition-all duration-200 no-underline ${
              location.pathname === '/browse-hackathons'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
            }`}
          >
            Hackathons
          </Link>
          <Link
            to="/manage-applications"
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 transition-all duration-200 no-underline ${
              location.pathname === '/manage-applications'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
            }`}
          >
            Manage Applications
          </Link>
        </div>

        <div className="mb-6 sm:mb-10 animate-fadeIn">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 tracking-tight">
            Job Opportunities
          </h1>
          <p className="mt-1 sm:mt-2 text-gray-600 text-sm sm:text-base font-light">
            Explore positions from <span style={{ fontFamily: "'Times New Roman', serif", fontWeight: 'bold', fontStyle: 'italic' }}>Saarthix</span> and partner organizations.
          </p>
        </div>

        {/* Main Filter Section - Prominent at Top */}
        <div className="mb-6 sm:mb-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl sm:rounded-2xl border-2 border-blue-200 shadow-lg p-4 sm:p-6 lg:p-8 animate-fadeIn">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              Filter Jobs
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm">Find your perfect opportunity by filtering jobs below</p>
          </div>

          {/* Primary Filters - Role, Company, Industry, Skills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Filter by Role */}
            <div className="bg-white rounded-lg sm:rounded-xl border-2 border-indigo-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Filter by Role
              </label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="All">All Roles</option>
                {roles.filter(r => r !== "All").map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Company */}
            <div className="bg-white rounded-lg sm:rounded-xl border-2 border-green-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Filter by Company
              </label>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 transition-all duration-200 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
              >
                <option value="All">All Companies</option>
                {companies.filter(c => c !== "All").map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Industry */}
            <div className="bg-white rounded-lg sm:rounded-xl border-2 border-blue-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Filter by Industry
              </label>
              <select
                value={filterIndustry}
                onChange={(e) => setFilterIndustry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="All">All Industries</option>
                {industries.filter(i => i !== "All").map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Skills/Education */}
            <div className="bg-white rounded-lg sm:rounded-xl border-2 border-purple-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Filter by Skills/Education
              </label>
              <select
                value={filterSkill}
                onChange={(e) => setFilterSkill(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 transition-all duration-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="All">All Skills</option>
                {skills.filter(s => s !== "All").slice(0, 50).map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Filters and Search - Collapsible/Compact */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-end sm:justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by job title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>

              {/* Additional Filters */}
              <div className="flex gap-2 sm:gap-3 flex-wrap items-end">
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 transition-all duration-200 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  <option value="All">All Locations</option>
                  {locations.filter(l => l !== "All").map((location) => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>

                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-900 transition-all duration-200 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  <option value="All">All Sources</option>
                  <option value="Local">Local</option>
                  <option value="External">External</option>
                </select>

                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:bg-gray-100 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-900 transition-all duration-200 disabled:cursor-not-allowed"
                  title="Refresh jobs list"
                >
                  {refreshing ? (
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent"></div>
                    </span>
                  ) : (
                    "Refresh"
                  )}
                </button>

                {/* Clear Filters Button */}
                {(filterRole !== "All" || filterCompany !== "All" || filterIndustry !== "All" || filterSkill !== "All" || 
                  searchQuery || filterLocation !== "All" || filterSource !== "All") && (
                  <button
                    onClick={() => {
                      setFilterRole("All");
                      setFilterCompany("All");
                      setFilterIndustry("All");
                      setFilterSkill("All");
                      setSearchQuery("");
                      setFilterLocation("All");
                      setFilterSource("All");
                    }}
                    className="rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-red-700 transition-all duration-200"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className={`mb-4 sm:mb-6 rounded-lg sm:rounded-xl border px-3 sm:px-5 py-3 sm:py-4 shadow-sm animate-fadeIn ${
          (filterRole !== "All" || filterCompany !== "All" || filterIndustry !== "All" || filterSkill !== "All" || 
           searchQuery || filterLocation !== "All" || filterSource !== "All")
            ? "bg-blue-50 border-blue-200"
            : "bg-white border-gray-200"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                (filterRole !== "All" || filterCompany !== "All" || filterIndustry !== "All" || filterSkill !== "All" || 
                 searchQuery || filterLocation !== "All" || filterSource !== "All")
                  ? "bg-blue-600"
                  : "bg-gray-600"
              }`}>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-900">
                  {filteredJobs.length} Job{filteredJobs.length !== 1 ? "s" : ""} Available
                </p>
                <p className="text-xs text-gray-600">
                  {(filterRole !== "All" || filterCompany !== "All" || filterIndustry !== "All" || filterSkill !== "All" || 
                    searchQuery || filterLocation !== "All" || filterSource !== "All")
                    ? "Matching your selected filters"
                    : "Browse all available opportunities"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 sm:p-4 text-rose-700 text-xs sm:text-sm">
            {error}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-md border border-gray-200 bg-white p-6 sm:p-8 text-center">
            <p className="text-gray-600 text-xs sm:text-sm">No jobs available at the moment. Please check back later.</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-md border border-gray-200 bg-white p-6 sm:p-8 text-center">
            <p className="text-gray-600 text-xs sm:text-sm">No jobs match your search criteria. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job, index) => (
              <div
                key={job.id}
                className="flex h-full flex-col rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 lg:p-7 transition-all duration-300 hover:border-gray-300 hover:shadow-xl hover-lift animate-fadeIn"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex-1">
                  <div className="mb-3 sm:mb-5 flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg ${
                      job.source === 'Local' 
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                        : 'text-blue-700 bg-blue-50 border border-blue-200'
                    }`}>
                      {job.source}
                    </span>
                    {jobMatchPercentages[job.id] !== undefined && (
                      <span className={`text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg ${
                        jobMatchPercentages[job.id] >= 75
                          ? 'text-green-700 bg-green-50 border border-green-200'
                          : jobMatchPercentages[job.id] >= 50
                          ? 'text-amber-700 bg-amber-50 border border-amber-200'
                          : 'text-red-700 bg-red-50 border border-red-200'
                      }`}>
                        {Math.round(jobMatchPercentages[job.id])}% Match
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-2 sm:mb-3 line-clamp-2 leading-tight">
                    {job.title}
                  </h2>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-gray-800 font-semibold text-xs sm:text-sm truncate">
                      {job.company || "Company confidential"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-5">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      {job.location || "Location not specified"}
                    </p>
                  </div>
                  {job.description && (
                    <p className="line-clamp-3 text-xs sm:text-sm text-gray-600 leading-relaxed mb-2 sm:mb-0">
                      {job.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleViewDetails(job)}
                  className="mt-4 sm:mt-6 w-full rounded-lg sm:rounded-xl bg-gray-900 hover:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn">
          <div className="relative w-full max-w-3xl rounded-xl sm:rounded-2xl bg-white shadow-2xl animate-slideIn border border-gray-100 max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <button
              onClick={closeModal}
              className="absolute right-3 top-3 sm:right-5 sm:top-5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all duration-200 flex items-center justify-center text-lg sm:text-xl font-light shadow-sm hover:shadow-md z-10"
              aria-label="Close"
            >
              ×
            </button>

            <div className="max-h-[85vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6 lg:p-8">
              {/* Header Section */}
              <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold ${
                  selectedJob.source === 'Local' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {selectedJob.source}
                </span>
                {detailsLoading && (
                  <span className="text-xs sm:text-sm text-gray-500 flex items-center gap-1.5 sm:gap-2">
                    <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
                    <span className="hidden sm:inline">Loading details...</span>
                    <span className="sm:hidden">Loading...</span>
                  </span>
                )}
              </div>

              {/* Job Title */}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                {jobDetails?.job_title || selectedJob.title}
              </h2>

              {/* Company Name */}
              <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-base sm:text-lg text-gray-700 font-semibold truncate">
                  {jobDetails?.employer_name || selectedJob.company}
                </p>
              </div>

              {detailsError && (
                <div className="mb-4 sm:mb-6 rounded-lg border border-rose-200 bg-rose-50 p-3 sm:p-4 text-xs sm:text-sm text-rose-700">
                  {detailsError}
                </div>
              )}

              {detailsLoading ? (
                <div className="mt-6 sm:mt-8 flex justify-center py-8 sm:py-12">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600"></div>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {/* Key Information Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 lg:p-5 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200">
                    {/* Location - Fixed to show only once - with matching highlight */}
                    <div className={`flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg ${
                      (() => {
                        const jobLocation = (jobDetails?.job_city || selectedJob.location || "").toLowerCase();
                        const preferredLocations = userProfile?.preferredLocations?.map(l => l.toLowerCase()) || [];
                        const currentLocation = userProfile?.currentLocation?.toLowerCase() || "";
                        const isLocationMatch = preferredLocations.some(loc => 
                          jobLocation.includes(loc) || loc.includes(jobLocation)
                        ) || (currentLocation && (jobLocation.includes(currentLocation) || currentLocation.includes(jobLocation)));
                        const isRemote = jobLocation.includes("remote");
                        
                        return isLocationMatch || isRemote
                          ? 'bg-green-50 border-2 border-green-300'
                          : 'bg-transparent';
                      })()
                    }`}>
                      <svg className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 ${
                        (() => {
                          const jobLocation = (jobDetails?.job_city || selectedJob.location || "").toLowerCase();
                          const preferredLocations = userProfile?.preferredLocations?.map(l => l.toLowerCase()) || [];
                          const currentLocation = userProfile?.currentLocation?.toLowerCase() || "";
                          const isLocationMatch = preferredLocations.some(loc => 
                            jobLocation.includes(loc) || loc.includes(jobLocation)
                          ) || (currentLocation && (jobLocation.includes(currentLocation) || currentLocation.includes(jobLocation)));
                          const isRemote = jobLocation.includes("remote");
                          return isLocationMatch || isRemote ? 'text-green-600' : 'text-blue-600';
                        })()
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Location</p>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <p className="text-xs sm:text-sm font-medium text-gray-900">
                            {(() => {
                              const locationParts = [
                                jobDetails?.job_city,
                                jobDetails?.job_country,
                                selectedJob.location && !jobDetails?.job_city ? selectedJob.location : null
                              ].filter(Boolean);
                              return locationParts.length > 0 ? locationParts.join(", ") : "Location not specified";
                            })()}
                          </p>
                          {(() => {
                            const jobLocation = (jobDetails?.job_city || selectedJob.location || "").toLowerCase();
                            const preferredLocations = userProfile?.preferredLocations?.map(l => l.toLowerCase()) || [];
                            const currentLocation = userProfile?.currentLocation?.toLowerCase() || "";
                            const isLocationMatch = preferredLocations.some(loc => 
                              jobLocation.includes(loc) || loc.includes(jobLocation)
                            ) || (currentLocation && (jobLocation.includes(currentLocation) || currentLocation.includes(jobLocation)));
                            
                            if (isLocationMatch) {
                              return (
                                <span className="text-xs font-bold bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                                  ✓ Your preference
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Employment Type */}
                    {(jobDetails?.job_employment_type || selectedJob.raw?.employmentType) && (
                      <div className="flex items-start gap-2 sm:gap-3">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Employment Type</p>
                          <p className="text-xs sm:text-sm font-medium text-gray-900">
                            {jobDetails?.job_employment_type || selectedJob.raw?.employmentType}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Salary Range */}
                    {(jobDetails?.job_min_salary || jobDetails?.job_max_salary || selectedJob.raw?.jobMinSalary || selectedJob.raw?.jobMaxSalary) && (
                      <div className="flex items-start gap-2 sm:gap-3">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Salary Range</p>
                          <p className="text-xs sm:text-sm font-medium text-gray-900">
                            {(() => {
                              const minSalary = jobDetails?.job_min_salary || selectedJob.raw?.jobMinSalary;
                              const maxSalary = jobDetails?.job_max_salary || selectedJob.raw?.jobMaxSalary;
                              const currency = jobDetails?.job_salary_currency || selectedJob.raw?.jobSalaryCurrency || "USD";
                              if (minSalary && maxSalary) {
                                return `${currency === "USD" ? "$" : currency} ${minSalary.toLocaleString()} - ${maxSalary.toLocaleString()}`;
                              } else if (minSalary) {
                                return `${currency === "USD" ? "$" : currency} ${minSalary.toLocaleString()}+`;
                              } else if (maxSalary) {
                                return `Up to ${currency === "USD" ? "$" : currency} ${maxSalary.toLocaleString()}`;
                              }
                              return "Salary not specified";
                            })()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Years of Experience Required */}
                    {(jobDetails?.years_of_experience || selectedJob.raw?.yearsOfExperience) && (
                      <div className="flex items-start gap-2 sm:gap-3">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Experience Required</p>
                          <p className="text-xs sm:text-sm font-medium text-gray-900">
                            {(() => {
                              const yearsRequired = jobDetails?.years_of_experience || selectedJob.raw?.yearsOfExperience;
                              return yearsRequired 
                                ? `${yearsRequired} year${yearsRequired !== 1 ? 's' : ''} of experience` 
                                : "Experience not specified";
                            })()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Posted Date */}
                    {(jobDetails?.job_posted_at_datetime_utc || selectedJob.raw?.createdAt) && (
                      <div className="flex items-start gap-2 sm:gap-3">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Posted Date</p>
                          <p className="text-xs sm:text-sm font-medium text-gray-900">
                            {(() => {
                              const dateStr = jobDetails?.job_posted_at_datetime_utc || selectedJob.raw?.createdAt;
                              if (dateStr) {
                                try {
                                  const date = new Date(dateStr);
                                  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                                } catch {
                                  return dateStr;
                                }
                              }
                              return "Date not available";
                            })()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Your Matching Profile Section */}
                  {userProfile && isApplicant && (
                    <div className="p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg sm:rounded-xl border-2 border-indigo-300">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Your Profile Match</h3>
                      </div>
                      <div className="space-y-2 sm:space-y-3">
                        {/* Matching Skills */}
                        {userProfile?.skills && userProfile.skills.length > 0 && (
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Your Skills:</p>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {userProfile.skills.map((skill, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-300">
                                  <span className="truncate max-w-[120px] sm:max-w-none">{skill}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Preferred Locations */}
                        {(userProfile?.preferredLocations?.length > 0 || userProfile?.currentLocation) && (
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Your Locations:</p>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {userProfile?.preferredLocations?.map((loc, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                                  <span className="truncate max-w-[120px] sm:max-w-none">📍 {loc}</span>
                                </span>
                              ))}
                              {userProfile?.currentLocation && !userProfile?.preferredLocations?.includes(userProfile.currentLocation) && (
                                <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                                  <span className="truncate max-w-[120px] sm:max-w-none">📍 {userProfile.currentLocation}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Years of Experience */}
                        {userProfile?.experience && (
                          <div className="pt-1.5 sm:pt-2 border-t border-indigo-200">
                            <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Your Experience:</p>
                            <div className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                              📊 {userProfile.experience} years
                            </div>
                          </div>
                        )}

                        {/* Work Preference */}
                        {userProfile?.workPreference && (
                          <div className="pt-1.5 sm:pt-2 border-t border-indigo-200">
                            <p className="text-xs text-gray-600">
                              <span className="font-semibold">Work Preference:</span> {userProfile.workPreference}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Skills Section - with matching highlights */}
                  {((jobDetails?.skills && jobDetails.skills.length > 0) || (selectedJob.raw?.skills && selectedJob.raw.skills.length > 0)) && (
                    <div className="p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border border-blue-200">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Required Skills</h3>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {((jobDetails?.skills || selectedJob.raw?.skills) || []).map((skill, index) => {
                          // Check if this skill matches user's skills
                          const userSkills = userProfile?.skills?.map(s => s.toLowerCase()) || [];
                          const isMatching = userSkills.some(userSkill => 
                            skill.toLowerCase().includes(userSkill.trim()) || 
                            userSkill.includes(skill.toLowerCase())
                          );
                          
                          return (
                            <span
                              key={index}
                              className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium shadow-sm hover:shadow-md transition-all ${
                                isMatching
                                  ? 'bg-green-100 border-2 border-green-400 text-green-800 ring-2 ring-green-200'
                                  : 'bg-white border border-blue-200 text-blue-700'
                              }`}
                            >
                              <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 flex-shrink-0 ${isMatching ? 'text-green-600' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="truncate max-w-[150px] sm:max-w-none">{skill}</span>
                              {isMatching && (
                                <span className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs font-bold bg-green-200 text-green-800 rounded-full whitespace-nowrap">
                                  <span className="hidden sm:inline">✓ You have</span>
                                  <span className="sm:hidden">✓</span>
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Missing Skills & Location Mismatch Section */}
                  {userProfile && isApplicant && (
                    <div className="p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg sm:rounded-xl border-2 border-red-200">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0v2m0-6v-2m0 0V7m0 6v2m0 4v2" />
                        </svg>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">What You're Missing</h3>
                      </div>
                      <div className="space-y-2 sm:space-y-3">
                        {/* Experience Mismatch */}
                        {selectedJob?.raw?.yearsOfExperience && (() => {
                          const userExpStr = userProfile?.experience || "0";
                          const userExp = parseInt(userExpStr) || 0;
                          const requiredExp = selectedJob.raw.yearsOfExperience || 0;
                          
                          if (userExp < requiredExp) {
                            return (
                              <div>
                                <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Experience Gap:</p>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                  <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium bg-red-100 border-2 border-red-300 text-red-700 shadow-sm">
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="hidden sm:inline">You have {userExp} year{userExp !== 1 ? 's' : ''}, need {requiredExp} year{requiredExp !== 1 ? 's' : ''} ({requiredExp - userExp} year{(requiredExp - userExp) !== 1 ? 's' : ''} short)</span>
                                    <span className="sm:hidden">{userExp}yr / {requiredExp}yr needed</span>
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        {/* Missing Skills */}
                        {((jobDetails?.skills || selectedJob.raw?.skills) || []).length > 0 && (
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Skills You Don't Have:</p>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {((jobDetails?.skills || selectedJob.raw?.skills) || [])
                                .filter(skill => {
                                  const userSkills = userProfile?.skills?.map(s => s.toLowerCase()) || [];
                                  return !userSkills.some(userSkill => 
                                    skill.toLowerCase().includes(userSkill.trim()) || 
                                    userSkill.includes(skill.toLowerCase())
                                  );
                                })
                                .map((skill, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium bg-red-100 border-2 border-red-300 text-red-700 shadow-sm"
                                  >
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span className="truncate max-w-[120px] sm:max-w-none">{skill}</span>
                                  </span>
                                ))}
                              {((jobDetails?.skills || selectedJob.raw?.skills) || [])
                                .filter(skill => {
                                  const userSkills = userProfile?.skills?.map(s => s.toLowerCase()) || [];
                                  return !userSkills.some(userSkill => 
                                    skill.toLowerCase().includes(userSkill.trim()) || 
                                    userSkill.includes(skill.toLowerCase())
                                  );
                                }).length === 0 && (
                                <span className="text-xs text-green-700 font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 bg-green-100 rounded-md sm:rounded-lg border border-green-300">
                                  ✅ Great! You have all the required skills!
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Location Mismatch - Only show if NOT matching and NOT remote */}
                        {selectedJob?.location && (() => {
                          const userLocations = [
                            ...(userProfile?.preferredLocations || []),
                            userProfile?.currentLocation || []
                          ].map(l => l.toLowerCase()).filter(Boolean);
                          const jobLocation = (selectedJob.location || '').toLowerCase();
                          
                          const isMatch = userLocations.some(loc =>
                            jobLocation.includes(loc) || loc.includes(jobLocation)
                          );
                          
                          const isRemote = jobLocation.includes('remote');
                          
                          // Only show location if it doesn't match AND it's not remote
                          if (isMatch || isRemote) {
                            return null;
                          }
                          
                          return (
                            <div>
                              <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Location</p>
                              <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium shadow-sm bg-red-100 border-2 border-red-300 text-red-700 flex-wrap gap-1.5 sm:gap-2">
                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="truncate max-w-[150px] sm:max-w-none">📍 {selectedJob.location}</span>
                                <span className="px-1.5 sm:px-2 py-0.5 text-xs font-bold rounded-full bg-red-200 text-red-800 whitespace-nowrap">
                                  ✗ No Match
                                </span>
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Job Description */}
                  <div className="p-3 sm:p-4 lg:p-5 bg-white rounded-lg sm:rounded-xl border border-gray-200">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">Job Description</h3>
                    </div>
                    <FormattedJobDescription 
                      description={jobDetails?.job_description || selectedJob.description || "No description available."}
                    />
                  </div>

                  {/* Job Highlights (for external jobs) */}
                  {jobDetails?.job_highlights && (
                    <div className="p-3 sm:p-4 lg:p-5 bg-amber-50 rounded-lg sm:rounded-xl border border-amber-200">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Job Highlights</h3>
                      </div>
                      <div className="space-y-2 sm:space-y-3">
                        {Object.entries(jobDetails.job_highlights).map(([key, values]) => (
                          <div key={key}>
                            <p className="font-semibold text-sm sm:text-base text-gray-900 mb-1.5 sm:mb-2 capitalize flex items-center gap-1.5 sm:gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                              {key.replace(/_/g, " ")}
                            </p>
                            <ul className="ml-4 sm:ml-6 space-y-1 sm:space-y-1.5">
                              {Array.isArray(values) ? (
                                values.map((value, idx) => (
                                  <li key={idx} className="text-xs sm:text-sm text-gray-700 flex items-start gap-1.5 sm:gap-2">
                                    <span className="text-amber-600 mt-1.5 flex-shrink-0">•</span>
                                    <span>{value}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-xs sm:text-sm text-gray-700 flex items-start gap-1.5 sm:gap-2">
                                  <span className="text-amber-600 mt-1.5 flex-shrink-0">•</span>
                                  <span>{values}</span>
                                </li>
                              )}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Apply Buttons */}
                  {!isIndustry && (
                    <div className="pt-3 sm:pt-4 flex flex-col gap-2 sm:gap-3">
                      {selectedJob.source === "External" ? (
                        <>
                          <button
                            onClick={() => handleApply(selectedJob, jobDetails)}
                            className="flex-1 rounded-lg sm:rounded-xl bg-blue-600 text-white hover:bg-blue-700 px-4 sm:px-6 py-2.5 sm:py-3.5 text-xs sm:text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-1.5 sm:gap-2"
                          >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span className="hidden sm:inline">Apply on Company Website</span>
                            <span className="sm:hidden">Apply on Website</span>
                          </button>
                          {/* {jobDetails?.job_apply_link && (
                            <a
                              href={jobDetails.job_apply_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 px-6 py-3.5 text-center text-sm font-semibold text-gray-900 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Original Posting
                            </a>
                          )} */}
                        </>
                      ) : (
                        <button
                          onClick={() => handleApply(selectedJob, jobDetails)}
                          className={`flex-1 rounded-lg sm:rounded-xl px-4 sm:px-6 py-2.5 sm:py-3.5 text-xs sm:text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-1.5 sm:gap-2 ${
                            isAuthenticated
                              ? "bg-gray-900 text-white hover:bg-gray-800"
                              : "bg-gray-300 text-gray-600 cursor-not-allowed shadow-none hover:translate-y-0"
                          }`}
                          disabled={!isAuthenticated}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {isAuthenticated ? "Apply Now" : "Sign in to Apply"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Application Form Modal */}
      {showApplicationForm && jobToApply && (
        <JobApplicationForm
          job={jobToApply}
          onClose={() => {
            setShowApplicationForm(false);
            setJobToApply(null);
          }}
          onSuccess={handleApplicationSuccess}
        />
      )}
    </div>
  );
}
