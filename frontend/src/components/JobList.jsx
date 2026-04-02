import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchJobs, fetchJobDetails, getRecommendedJobs, getUserJobApplications, getUserProfile } from "../api/jobApi";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/apiClient";
import JobApplicationForm from "./JobApplicationForm";
import { redirectToSomethingXLogin } from "../config/redirectUrls";
import { getMissingMandatoryProfileFields } from "../utils/jobsProfileUtils";

// Component to format and display job description in an organized way
function FormattedJobDescription({ description }) {
  if (!description || description === "No description available.") {
    return (
      <p className="text-gray-500 italic text-sm">No description available.</p>
    );
  }
  const normalized = String(description)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const hasBulletStyle = lines.some((line) => /^([•\-*]|\d+[\.\)])\s+/.test(line));

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      {!hasBulletStyle ? (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{normalized}</p>
      ) : (
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
              <span className="mt-1 text-blue-600">•</span>
              <span>{line.replace(/^([•\-*]|\d+[\.\)])\s+/, "")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function JobList() {
  const location = useLocation();
  const navigate = useNavigate();
  const heroSilhouette = `${import.meta.env.BASE_URL}Silhouette_illustration_of_a_man_working_overtime-removebg-preview%201.png`;
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
  const [visibleJobsCount, setVisibleJobsCount] = useState(6);

  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [jobToApply, setJobToApply] = useState(null);
  const [jobMatchPercentages, setJobMatchPercentages] = useState({});
  const [jobMatchReasons, setJobMatchReasons] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [missingMandatoryFields, setMissingMandatoryFields] = useState([]);
  const [appliedLocalJobIds, setAppliedLocalJobIds] = useState(new Set());
  const reviewJobOpenedRef = useRef(null);

  const { isAuthenticated, isIndustry, isApplicant, isApplicantOrStudent, user } = useAuth();
  const normalizeLower = (value) => (value || "").toString().trim().toLowerCase();

  // Load user profile for skill highlighting
  const loadUserProfile = async () => {
    try {
      if (isAuthenticated && isApplicantOrStudent) {
        const profile = await getUserProfile();
        setUserProfile(profile);
      }
    } catch (err) {
      console.error("Error loading user profile:", err);
      // Silent fail
    }
  };

  const loadAppliedJobs = async () => {
    try {
      if (!isAuthenticated || !isApplicantOrStudent) {
        setAppliedLocalJobIds(new Set());
        return;
      }
      const applications = await getUserJobApplications();
      const appliedIds = new Set(
        (Array.isArray(applications) ? applications : [])
          .map((app) => (app?.jobId || "").toString().trim())
          .filter(Boolean)
      );
      setAppliedLocalJobIds(appliedIds);
    } catch (err) {
      console.error("Error loading applied jobs:", err);
    }
  };

  // Calculate match percentage for a job based on user profile
  const calculateJobMatch = (job, userProfile) => {
    if (!userProfile) {
      return { percentage: 0, reasons: ["Complete your profile to see match insights"] };
    }

    const normalizeList = (values) =>
      (Array.isArray(values) ? values : [])
        .map((v) => normalizeLower(v))
        .filter(Boolean);
    const splitLocationTokens = (value) =>
      normalizeLower(value)
        .split(/[,\|/]/)
        .map((v) => normalizeLower(v))
        .filter(Boolean);

    const userSkills = normalizeList(userProfile.skills);
    const jobSkills = normalizeList(job.raw?.skills);
    const userLocations = normalizeList([
      ...(userProfile.preferredLocations || []),
      userProfile.currentLocation || []
    ]);
    const jobLocation = normalizeLower(job.location || "");
    const jobLocationTokens = splitLocationTokens(job.location || "");
    const userLocationTokens = userLocations.flatMap(splitLocationTokens);
    const userRolePreferences = normalizeList(userProfile.rolePreferences);
    const jobTitle = normalizeLower(job.title);
    const matchedSkills = jobSkills.filter((jobSkill) => userSkills.includes(jobSkill));
    const skillsMatch = jobSkills.length > 0 ? (matchedSkills.length / jobSkills.length) * 100 : 0;
    const strictSkillsPass = jobSkills.length > 0 && matchedSkills.length > 0;

    const strictLocationPass = jobLocation
      ? userLocationTokens.some((token) => jobLocationTokens.includes(token))
      : false;

    const strictRolePass = userRolePreferences.length > 0
      ? userRolePreferences.some((role) => role === jobTitle)
      : false;

    let roundedPercentage = Math.round(
      (skillsMatch * 0.6) + (strictLocationPass ? 25 : 0) + (strictRolePass ? 15 : 0)
    );
    if (!(strictSkillsPass && strictLocationPass && strictRolePass)) {
      roundedPercentage = Math.min(roundedPercentage, 35);
    }
    roundedPercentage = Math.max(0, Math.min(100, roundedPercentage));

    const reasons = [];
    if (matchedSkills.length > 0) {
      reasons.push(`Strict skills matched: ${matchedSkills.slice(0, 3).join(", ")}`);
    } else {
      reasons.push("No strict skill match");
    }
    if (strictLocationPass) {
      reasons.push("Strict location preference matched");
    } else {
      reasons.push("Location preference not matched strictly");
    }
    if (strictRolePass) {
      reasons.push("Strict role preference matched");
    } else {
      reasons.push("Role preference not matched strictly");
    }

    return { percentage: roundedPercentage, reasons };
  };

  // Load recommended jobs match percentages
  const loadRecommendedJobs = async () => {
    try {
      if (!isAuthenticated || !isApplicantOrStudent || !userProfile || !jobs?.length) return;

      const recommendedJobs = await getRecommendedJobs().catch(() => []);
      const recommendedIds = new Set(
        (Array.isArray(recommendedJobs) ? recommendedJobs : [])
          .map((item) => item?.job?.id)
          .filter(Boolean)
      );

      const matchMap = {};
      const reasonsMap = {};
      jobs.forEach((job) => {
        const result = calculateJobMatch(job, userProfile);
        matchMap[job.id] = result.percentage;
        reasonsMap[job.id] = recommendedIds.has(job.id)
          ? [...result.reasons, "Also recommended by profile engine"]
          : result.reasons;
      });

      setJobMatchPercentages(matchMap);
      setJobMatchReasons(reasonsMap);
    } catch (err) {
      console.error("Error loading recommended jobs:", err);
      // Fallback: calculate matches for all jobs using user profile
      if (userProfile && isApplicantOrStudent && jobs && jobs.length > 0) {
        const matchMap = {};
        const reasonsMap = {};
        jobs.forEach(job => {
          const result = calculateJobMatch(job, userProfile);
          matchMap[job.id] = result.percentage;
          reasonsMap[job.id] = result.reasons;
        });
        setJobMatchPercentages(matchMap);
        setJobMatchReasons(reasonsMap);
      }
    }
  };

  // Define loadJobs outside useEffect so it can be called manually
  const loadJobs = async () => {
    try {
      if (!refreshing) setLoading(true);
      setError(null);

      const [localResult, externalResult] = await Promise.allSettled([
        apiClient.get('/jobs'),
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
      const parseTime = (item) => {
        const dateVal = item?.raw?.createdAt || item?.raw?.job_posted_at_datetime_utc;
        const ts = dateVal ? new Date(dateVal).getTime() : 0;
        return Number.isNaN(ts) ? 0 : ts;
      };
      setJobs([...localJobs, ...rapidJobs].sort((a, b) => parseTime(b) - parseTime(a)));

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
    
    const alreadyAppliedLocal =
      job.source !== "External" && appliedLocalJobIds.has((job.id || "").toString());
    
    return matchesSearch && matchesRole && matchesIndustry && matchesCompany && 
           matchesSkill && matchesSource && matchesLocation && !alreadyAppliedLocal;
  });

  const displayedJobs = filteredJobs.slice(0, visibleJobsCount);

  useEffect(() => {
    loadJobs();
    loadRecommendedJobs();
    loadUserProfile();
    loadAppliedJobs();
  }, []);

  // Recalculate match percentages when jobs or user profile changes
  useEffect(() => {
    if (jobs.length > 0 && userProfile) {
      loadRecommendedJobs();
    }
  }, [jobs, userProfile]);

  useEffect(() => {
    loadAppliedJobs();
  }, [isAuthenticated, isApplicantOrStudent, user?.email, user?.id]);

  useEffect(() => {
    setVisibleJobsCount(6);
  }, [searchQuery, filterRole, filterIndustry, filterCompany, filterSkill, filterSource, filterLocation, jobs.length]);

  useEffect(() => {
    if (!isAuthenticated || !isApplicantOrStudent) {
      setMissingMandatoryFields([]);
      return;
    }
    setMissingMandatoryFields(getMissingMandatoryProfileFields(userProfile));
  }, [isAuthenticated, isApplicantOrStudent, userProfile]);

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
        must_have_skills: job.raw?.mustHaveSkills || [],
        good_to_have_skills: job.raw?.goodToHaveSkills || [],
        jd_file_name: job.raw?.jdFileName || '',
        jd_file_type: job.raw?.jdFileType || '',
        jd_file_base64: job.raw?.jdFileBase64 || '',
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

  // Open job details when user arrives from a "job updated" notification
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handleViewDetails is stable enough; avoid re-running on every render
  useEffect(() => {
    const reviewJobId = location.state?.reviewJobId;
    if (!reviewJobId) {
      reviewJobOpenedRef.current = null;
      return;
    }
    if (!jobs.length) return;
    if (reviewJobOpenedRef.current === reviewJobId) return;
    const job = jobs.find((j) => j.id === reviewJobId);
    if (!job) return;
    reviewJobOpenedRef.current = reviewJobId;
    handleViewDetails(job);
    navigate(".", { replace: true, state: {} });
  }, [jobs, location.state?.reviewJobId, navigate]);

  const handleApply = async (job, details) => {
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
        window.confirm("Please sign in from SaarthiX Home to apply. Continue to login?")
      ) {
        redirectToSomethingXLogin("student");
      }
      return;
    }

    if (job.source !== "External" && appliedLocalJobIds.has((job.id || "").toString())) {
      toast.info("You have already applied for this job.", {
        position: "top-right",
        autoClose: 2500,
      });
      return;
    }

    const latestProfile = await getUserProfile().catch(() => userProfile);
    if (latestProfile) {
      setUserProfile(latestProfile);
    }

    // Show application form for local jobs only
    setJobToApply({ ...job, details });
    setShowApplicationForm(true);
  };

  const handleApplicationSuccess = () => {
    if (jobToApply?.source !== "External" && jobToApply?.id) {
      setAppliedLocalJobIds((prev) => new Set([...prev, (jobToApply.id || "").toString()]));
    }
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

  const hasActiveFilters =
    filterRole !== "All" ||
    filterCompany !== "All" ||
    filterIndustry !== "All" ||
    filterSkill !== "All" ||
    filterLocation !== "All" ||
    filterSource !== "All" ||
    Boolean(searchQuery);

  return (
    <div className="min-h-screen bg-[#ffffff] px-0 py-3 sm:px-0 lg:px-0">
      <div className="w-full max-w-none">
        <div
          className="relative min-h-[420px] overflow-visible border border-[#d5dde8] md:min-h-[450px]"
          style={{
            width: "100%",
            maxWidth: "100%",
            borderRadius: "10px",
            marginTop: "8px",
            backgroundColor: "#3170A5",
            backgroundImage:
              "linear-gradient(rgba(49, 112, 165, 0.82), rgba(49, 112, 165, 0.82)), url('/Group.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="relative mx-auto max-w-[1440px] px-4 pb-14 pt-10 sm:px-8 md:px-12 lg:px-16 xl:px-20">
            <div className="mb-6 flex flex-wrap gap-3">
              <Link
                to="/apply-jobs"
                className={`h-[39px] rounded-[6px] border px-[18px] py-[10px] text-[14px] font-medium leading-[17px] no-underline ${
                  location.pathname === "/apply-jobs"
                    ? "border-black bg-black text-white"
                    : "border-[#d1d5db] bg-white text-[#111827]"
                }`}
              >
                Apply for Jobs
              </Link>
              <Link
                to="/browse-hackathons"
                className={`h-[39px] rounded-[6px] border px-[18px] py-[10px] text-[14px] font-medium leading-[17px] no-underline ${
                  location.pathname === "/browse-hackathons"
                    ? "border-black bg-black text-white"
                    : "border-[#d1d5db] bg-white text-[#111827]"
                }`}
              >
                Hackathons
              </Link>
              <Link
                to="/job-tracker"
                className={`h-[39px] rounded-[6px] border px-[18px] py-[10px] text-[14px] font-medium leading-[17px] no-underline ${
                  location.pathname === "/job-tracker"
                    ? "border-black bg-black text-white"
                    : "border-[#d1d5db] bg-white text-[#111827]"
                }`}
              >
                My Applications
              </Link>
            </div>

            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-8 lg:gap-10">
              <div className="min-w-0 pt-1">
                <h1
                  className="text-[clamp(2.25rem,5vw,4.25rem)] font-bold leading-[0.96] tracking-[-1.5px] text-transparent"
                  style={{
                    fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                    background: "linear-gradient(180deg, #DDB9AD 6.06%, #EDEBEB 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                  }}
                >
                  Less searching,
                  <br />
                  More applying
                </h1>
                <p
                  className="mt-[14px] max-w-[820px] text-[clamp(1rem,2.2vw,1.5625rem)] font-medium leading-[1.28] text-[#ffffff]"
                  style={{ fontFamily: "'Instrument Sans', 'Inter', sans-serif" }}
                >
                  A gateway to your roles from Saarthix and leading partner companies.
                </p>
              </div>
              <div className="flex justify-center md:justify-end md:pr-2 lg:pr-6">
                <img
                  src={heroSilhouette}
                  alt=""
                  className="pointer-events-none h-auto max-h-[200px] w-auto max-w-[min(298px,88vw)] object-contain object-bottom md:max-h-[260px] lg:max-h-[280px] lg:-translate-y-2"
                />
              </div>
            </div>
          </div>

          <div
            className="absolute bottom-[-27.5px] left-1/2 z-20 w-[min(1200px,calc(100%-1.5rem))] max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-lg border border-[#00000033] bg-white px-3 py-2.5 shadow-[0px_8px_30px_0px_#00000014] sm:px-4"
          >
            <div className="flex min-h-[44px] flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative min-h-[36px] min-w-0 flex-1">
                <svg
                  className="pointer-events-none absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 text-black/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by role, skills, company, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-md border border-transparent bg-transparent py-1 pl-9 pr-2 text-[15px] leading-snug text-[#111827] placeholder:text-black/50 focus:outline-none sm:text-[16px]"
                />
              </div>
              <div className="flex shrink-0 items-center justify-end gap-4 sm:gap-6">
                <button
                  type="button"
                  onClick={() => {
                    setFilterRole("All");
                    setFilterCompany("All");
                    setFilterIndustry("All");
                    setFilterSkill("All");
                    setFilterLocation("All");
                    setFilterSource("All");
                    setSearchQuery("");
                  }}
                  className="whitespace-nowrap text-[15px] font-medium text-[#111827] sm:text-[16px]"
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  className="h-[33px] min-w-[120px] shrink-0 rounded-[6px] bg-[#3170A5] px-6 text-[18px] font-medium leading-[22px] text-white sm:w-[133px] sm:text-[20px]"
                  style={{
                    backgroundImage: "url('/Container (6).png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] pt-20">
          {isApplicantOrStudent && isAuthenticated && missingMandatoryFields.length > 0 && (
            <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-amber-900">
                  Complete profile fields for apply: {missingMandatoryFields.join(", ")}
                </p>
                <button
                  onClick={() => navigate("/build-profile", { state: { mandatoryProfile: true, missingFields: missingMandatoryFields } })}
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Complete Profile
                </button>
              </div>
            </div>
          )}

          <div className="mb-3 flex items-center justify-between gap-3 px-[58px]">
            <div className="flex items-start gap-3">
              <svg className="mt-1 h-6 w-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M7 12h10M10 18h4M4 5v2m0 4v2m0 4v2" />
              </svg>
              <div>
                <h2 className="text-[25px] font-semibold leading-9 text-[#000000]" style={{ fontFamily: "'Instrument Sans', 'Inter', sans-serif" }}>
                  Search smarter and filter faster
                </h2>
                <p className="text-[15px] leading-[22px] text-black/60">Customize your browsing to see only the roles of your interest</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-[41px] rounded-[6px] border border-[#eadfcb] bg-[#F8E7CF] px-5 text-[15px] font-semibold leading-[21px] text-[#000000] disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh Results"}
            </button>
          </div>

          <div className="mb-6 flex flex-nowrap items-center gap-3 overflow-x-auto px-[58px] pb-1">
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="h-[43px] min-w-[120px] rounded-[6px] border border-black bg-[#F6FAFD] px-4 text-[14px] font-medium text-[#000000]">
              <option value="All">Role</option>
              {roles.filter((r) => r !== "All").map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} className="h-[43px] min-w-[180px] rounded-[6px] border border-black bg-[#F6FAFD] px-4 text-[14px] font-medium text-[#000000]">
              <option value="All">Company</option>
              {companies.filter((c) => c !== "All").map((company) => <option key={company} value={company}>{company}</option>)}
            </select>
            <select value={filterIndustry} onChange={(e) => setFilterIndustry(e.target.value)} className="h-[43px] min-w-[130px] rounded-[6px] border border-black bg-[#F6FAFD] px-4 text-[14px] font-medium text-[#000000]">
              <option value="All">Industry</option>
              {industries.filter((i) => i !== "All").map((industry) => <option key={industry} value={industry}>{industry}</option>)}
            </select>
            <select value={filterSkill} onChange={(e) => setFilterSkill(e.target.value)} className="h-[43px] min-w-[170px] rounded-[6px] border border-black bg-[#F6FAFD] px-4 text-[14px] font-medium text-[#000000]">
              <option value="All">Skills / Education</option>
              {skills.filter((s) => s !== "All").slice(0, 60).map((skill) => <option key={skill} value={skill}>{skill}</option>)}
            </select>
            <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="h-[43px] min-w-[130px] rounded-[6px] border border-black bg-[#F6FAFD] px-4 text-[14px] font-medium text-[#000000]">
              <option value="All">Location</option>
              {locations.filter((l) => l !== "All").map((loc) => <option key={loc} value={loc}>{loc}</option>)}
            </select>
            <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="h-[43px] min-w-[110px] rounded-[6px] border border-black bg-[#F6FAFD] px-4 text-[14px] font-medium text-[#000000]">
              <option value="All">Source</option>
              <option value="Local">Local</option>
              <option value="External">External</option>
            </select>
          </div>

          <div className="mb-5 flex items-center gap-3 px-[58px]">
            <svg className="h-7 w-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 2v2m6-2v2M4 7h16M5 5h14a1 1 0 011 1v15a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zm3 9l2 2 4-4" />
            </svg>
            <p className="text-[25px] font-semibold leading-[30px] text-[#111827]">{filteredJobs.length} Jobs Available</p>
            <div>
              <p className="text-[20px] leading-[22px] text-black/75">See available vacancies</p>
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          ) : jobs.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
              No jobs available at the moment. Please check back later.
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
              No jobs match your search criteria. Try adjusting your filters.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 justify-items-center gap-6 px-[58px] md:grid-cols-2 lg:grid-cols-3">
                {displayedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="mx-auto flex h-[331px] w-full max-w-[346px] flex-col rounded-[10px] border border-black/20 bg-white p-6 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.12)]"
                  >
                    <div className="mb-3 flex items-center justify-end">
                      <span className={`rounded-[10px] px-3 py-1 text-[15px] font-medium ${job.source === "Local" ? "bg-[#EAF4FF] text-[#3170A5]" : "bg-[#EAFFF6] text-[#18430B]"}`}>
                        {job.source}
                      </span>
                    </div>
                    <h3 className="line-clamp-1 text-[18px] font-semibold leading-[27px] text-[#0A1905]">{job.title}</h3>
                    <p className="mt-0.5 line-clamp-1 text-[14px] leading-[21px] text-black/75">{job.company || "Company confidential"}</p>
                    <p className="mt-0.5 line-clamp-1 text-[14px] leading-[21px] text-black/75">{job.location || "Location not specified"}</p>
                    <p className="mt-2 line-clamp-3 text-[14px] leading-[22px] text-black/60">
                      {job.description || "No description available for this position."}
                    </p>
                    <button
                      onClick={() => handleViewDetails(job)}
                      className="mt-auto h-[35px] self-center rounded-[10px] bg-[#3170A5] px-6 text-[15px] font-semibold text-white hover:bg-[#2f6898]"
                      style={{ fontFamily: "'Instrument Sans', 'Inter', sans-serif" }}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
              {filteredJobs.length > visibleJobsCount && (
                <div className="my-8 flex items-center justify-center">
                  <button
                    onClick={() => setVisibleJobsCount((prev) => prev + 6)}
                    className="h-[35px] rounded-[10px] bg-[#4B9755] px-10 text-[15px] font-semibold text-white hover:bg-[#3f8849]"
                    style={{ fontFamily: "'Instrument Sans', 'Inter', sans-serif" }}
                  >
                    View More
                  </button>
                </div>
              )}
            </>
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
                  {userProfile && isApplicantOrStudent && (
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

                  {/* Skills Section - differentiated */}
                  {(((jobDetails?.must_have_skills || selectedJob.raw?.mustHaveSkills || []).length > 0) ||
                    ((jobDetails?.good_to_have_skills || selectedJob.raw?.goodToHaveSkills || []).length > 0) ||
                    ((jobDetails?.skills || selectedJob.raw?.skills || []).length > 0)) && (
                    <div className="p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border border-blue-200">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Skills</h3>
                      </div>
                      {((jobDetails?.must_have_skills || selectedJob.raw?.mustHaveSkills || []).length > 0) && (
                        <div className="mb-3">
                          <p className="mb-2 text-xs sm:text-sm font-semibold text-blue-900">Must Have</p>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {(jobDetails?.must_have_skills || selectedJob.raw?.mustHaveSkills || []).map((skill, index) => {
                              const userSkills = userProfile?.skills?.map(s => s.toLowerCase()) || [];
                              const isMatching = userSkills.some(userSkill =>
                                skill.toLowerCase().includes(userSkill.trim()) || userSkill.includes(skill.toLowerCase())
                              );
                              return (
                                <span
                                  key={`must-${index}`}
                                  className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium shadow-sm hover:shadow-md transition-all ${
                                    isMatching
                                      ? 'bg-green-100 border-2 border-green-400 text-green-800 ring-2 ring-green-200'
                                      : 'bg-white border border-blue-200 text-blue-700'
                                  }`}
                                >
                                  <span className="truncate max-w-[150px] sm:max-w-none">{skill}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {((jobDetails?.good_to_have_skills || selectedJob.raw?.goodToHaveSkills || []).length > 0) && (
                        <div className="mb-1">
                          <p className="mb-2 text-xs sm:text-sm font-semibold text-emerald-900">Good To Have</p>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {(jobDetails?.good_to_have_skills || selectedJob.raw?.goodToHaveSkills || []).map((skill, index) => {
                              const userSkills = userProfile?.skills?.map(s => s.toLowerCase()) || [];
                              const isMatching = userSkills.some(userSkill =>
                                skill.toLowerCase().includes(userSkill.trim()) || userSkill.includes(skill.toLowerCase())
                              );
                              return (
                                <span
                                  key={`good-${index}`}
                                  className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium shadow-sm transition-all ${
                                    isMatching
                                      ? 'bg-green-100 border border-green-300 text-green-800'
                                      : 'bg-white border border-emerald-200 text-emerald-700'
                                  }`}
                                >
                                  <span className="truncate max-w-[150px] sm:max-w-none">{skill}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {((jobDetails?.must_have_skills || selectedJob.raw?.mustHaveSkills || []).length === 0 &&
                        (jobDetails?.good_to_have_skills || selectedJob.raw?.goodToHaveSkills || []).length === 0) && (
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
                      )}
                    </div>
                  )}

                  {/* Missing Skills & Location Mismatch Section */}
                  {userProfile && isApplicantOrStudent && (
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
                        {((jobDetails?.must_have_skills || selectedJob.raw?.mustHaveSkills || jobDetails?.skills || selectedJob.raw?.skills) || []).length > 0 && (
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Skills You Don't Have:</p>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {((jobDetails?.must_have_skills || selectedJob.raw?.mustHaveSkills || jobDetails?.skills || selectedJob.raw?.skills) || [])
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
                              {((jobDetails?.must_have_skills || selectedJob.raw?.mustHaveSkills || jobDetails?.skills || selectedJob.raw?.skills) || [])
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

                  {(jobDetails?.jd_file_base64 && jobDetails?.jd_file_name) && (
                    <div className="p-3 sm:p-4 lg:p-5 bg-white rounded-lg sm:rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-gray-900">Job Description File</h3>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">{jobDetails.jd_file_name}</p>
                        </div>
                        <a
                          href={`data:${jobDetails.jd_file_type || 'application/octet-stream'};base64,${jobDetails.jd_file_base64}`}
                          download={jobDetails.jd_file_name}
                          className="rounded-lg bg-[#3170A5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2b6494]"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  )}

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
