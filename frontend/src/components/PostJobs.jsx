import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { loginWithGoogle } from "../api/authApi";
import { API_BASE_URL } from "../config/apiConfig";

export default function PostJobs() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, isIndustry } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    company: "",
    location: "",
    industry: "",
    employmentType: "",
    minSalary: "",
    maxSalary: "",
    yearsOfExperience: "",
    skills: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [salaryError, setSalaryError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle salary validation
    if (name === "minSalary" || name === "maxSalary") {
      const numValue = value === "" ? "" : parseFloat(value);
      
      if (name === "minSalary") {
        // When minimum salary changes, validate against maximum
        setFormData((prev) => {
          const newData = {
            ...prev,
            [name]: value,
          };
          
          // Check if maxSalary exists and is less than new minSalary
          if (newData.maxSalary && numValue !== "" && parseFloat(newData.maxSalary) < numValue) {
            setSalaryError("Maximum salary cannot be less than minimum salary");
          } else {
            setSalaryError("");
          }
          
          return newData;
        });
      } else if (name === "maxSalary") {
        // When maximum salary changes, validate against minimum
        setFormData((prev) => {
          const newData = {
            ...prev,
            [name]: value,
          };
          
          // Check if maxSalary is less than minSalary
          if (newData.minSalary && numValue !== "" && numValue < parseFloat(newData.minSalary)) {
            setSalaryError("Maximum salary cannot be less than minimum salary");
          } else {
            setSalaryError("");
          }
          
          return newData;
        });
        return; // Early return since we already set formData above
      }
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert("Please sign in to post a job");
      return;
    }

    // Validate salary range before submission
    if (formData.minSalary && formData.maxSalary) {
      const minSalary = parseFloat(formData.minSalary);
      const maxSalary = parseFloat(formData.maxSalary);
      
      if (maxSalary < minSalary) {
        setSalaryError("Maximum salary cannot be less than minimum salary");
        toast.error("Please fix the salary range before submitting", {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }
    }

    setSubmitting(true);
    setSalaryError(""); // Clear any error before submitting
    try {
      const jobData = {
        title: formData.title,
        description: formData.description,
        company: formData.company,
        location: formData.location,
        industry: formData.industry || "General",
        employmentType: formData.employmentType,
        jobMinSalary: formData.minSalary ? parseInt(formData.minSalary) : null,
        jobMaxSalary: formData.maxSalary ? parseInt(formData.maxSalary) : null,
        jobSalaryCurrency: "USD", // Default currency
        yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null,
        skills: formData.skills
          ? formData.skills.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
          : [],
      };

      const response = await axios.post(
        `${API_BASE_URL}/jobs`,
        jobData,
        {
          withCredentials: true,
        }
      );

      console.log("Job Posted Successfully:", response.data);
      
      // Show success toast
      toast.success("Job posted successfully! Redirecting to jobs page...", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        company: "",
        location: "",
        industry: "",
        employmentType: "",
        minSalary: "",
        maxSalary: "",
        yearsOfExperience: "",
        skills: "",
      });

      // Redirect to apply-jobs after 2 seconds
      setTimeout(() => {
        navigate("/apply-jobs");
      }, 2000);
    } catch (error) {
      console.error("Error posting job:", error);
      
      // Show error toast
      let errorMessage = "Failed to post job. Please try again.";
      if (error.response?.data) {
        errorMessage = typeof error.response.data === 'string' 
          ? error.response.data 
          : error.response.data.message || errorMessage;
      }
      
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication required message if not logged in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => navigate("/")}
            className="mb-4 text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2 text-sm"
          >
            ← Back to Dashboard
          </button>
          
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Authentication Required
            </h1>
            <p className="text-gray-600 mb-8 text-sm">
              Sign in with your Google account to create and post job opportunities.
            </p>
            <button
              onClick={() => {
                loginWithGoogle();
                // Redirect to role selection after OAuth
                sessionStorage.setItem('postJobsRedirect', 'true');
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors duration-200 font-semibold"
            >
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.951H.957C.348 6.174 0 7.55 0 9s.348 2.826.957 4.049l3.007-2.342z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.582C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.951L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has INDUSTRY role
  if (!isIndustry) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => navigate("/")}
            className="mb-4 text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2 text-sm"
          >
            ← Back to Dashboard
          </button>
          
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-8 text-sm">
              Only INDUSTRY users (recruiters/HR) can post jobs. You are currently logged in as a JOB SEEKER.
            </p>
            <p className="text-gray-600 mb-8 text-sm">
              To post jobs, please create a new account with an INDUSTRY role.
            </p>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors duration-200 font-semibold"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate("/")}
              className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2 text-sm"
            >
              ← Back to Dashboard
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/manage-hackathons")}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors duration-200 text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Hackathons
              </button>
              <button
                onClick={() => navigate("/manage-applications")}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold transition-colors duration-200 text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Manage Applications
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Job Posting</h1>
          <p className="mt-2 text-gray-600 text-sm">
            Fill out the form to post a new job opportunity
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Senior Frontend Engineer"
                required
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="e.g., Tech Company Inc."
                required
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Bangalore, India"
                required
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry *
              </label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                <option value="">Select Industry</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Education">Education</option>
                <option value="Marketing & Sales">Marketing & Sales</option>
                <option value="Engineering">Engineering</option>
                <option value="General">General</option>
              </select>
            </div>

            {/* Employment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employment Type *
              </label>
              <select
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                <option value="">Select Employment Type</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>

            {/* Years of Experience Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Years of Experience
              </label>
              <input
                type="number"
                name="yearsOfExperience"
                value={formData.yearsOfExperience}
                onChange={handleChange}
                placeholder="e.g., 3"
                min="0"
                max="100"
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500">
                Specify the minimum years of experience required for this position
              </p>
            </div>

            {/* Salary Range */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Salary
                </label>
                <input
                  type="number"
                  name="minSalary"
                  value={formData.minSalary}
                  onChange={handleChange}
                  placeholder="e.g., 500000"
                  min="0"
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Salary
                </label>
                <input
                  type="number"
                  name="maxSalary"
                  value={formData.maxSalary}
                  onChange={handleChange}
                  onBlur={(e) => {
                    // When user leaves the field, validate and reset if invalid
                    if (formData.minSalary && formData.maxSalary) {
                      const minSalary = parseFloat(formData.minSalary);
                      const maxSalary = parseFloat(formData.maxSalary);
                      if (!isNaN(minSalary) && !isNaN(maxSalary) && maxSalary < minSalary) {
                        // Reset to minimum salary if invalid
                        setFormData(prev => ({
                          ...prev,
                          maxSalary: formData.minSalary
                        }));
                        setSalaryError("");
                      }
                    }
                  }}
                  placeholder="e.g., 1500000"
                  min={formData.minSalary || "0"}
                  className={`w-full rounded-md border px-4 py-2.5 text-gray-900 placeholder-gray-500 transition focus:outline-none focus:ring-1 ${
                    salaryError 
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50" 
                      : "border-gray-300 bg-white focus:border-gray-400 focus:ring-gray-400"
                  }`}
                />
                {salaryError && (
                  <p className="mt-1 text-sm text-red-600">{salaryError}</p>
                )}
              </div>
            </div>

            {/* Skills Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Skills
              </label>
              <input
                type="text"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="e.g., JavaScript, React, Node.js, Python (comma-separated)"
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter skills separated by commas
              </p>
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the job responsibilities, requirements, and benefits..."
                rows="8"
                required
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-md bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold py-2.5 px-6 transition-colors duration-200 disabled:cursor-not-allowed text-sm"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Posting...
                  </span>
                ) : (
                  "Post Job"
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                disabled={submitting}
                className="flex-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-900 font-semibold py-2.5 px-6 transition-colors duration-200 disabled:cursor-not-allowed text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

