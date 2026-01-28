import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserJobApplications } from "../api/jobApi";
import { useAuth } from "../context/AuthContext";
import { loginWithGoogle } from "../api/authApi";

export default function JobTracker() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const statusColors = {
    pending: "bg-amber-50 border-amber-200 text-amber-800",
    resume_viewed: "bg-blue-50 border-blue-200 text-blue-800",
    call_scheduled: "bg-purple-50 border-purple-200 text-purple-800",
    interview_scheduled: "bg-indigo-50 border-indigo-200 text-indigo-800",
    offer_sent: "bg-green-50 border-green-200 text-green-800",
    accepted: "bg-emerald-50 border-emerald-200 text-emerald-800",
    rejected: "bg-rose-50 border-rose-200 text-rose-800",
    interview: "bg-blue-50 border-blue-200 text-blue-800", // Keep for backward compatibility
    offer: "bg-violet-50 border-violet-200 text-violet-800", // Keep for backward compatibility
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      pending: "Pending",
      resume_viewed: "Resume Viewed",
      call_scheduled: "Call Scheduled",
      interview_scheduled: "Interview Scheduled",
      offer_sent: "Offer Sent",
      accepted: "Accepted",
      rejected: "Rejected",
      interview: "Interview", // Keep for backward compatibility
      offer: "Offer", // Keep for backward compatibility
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const loadApplications = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      
      // Fetch only from database
      const data = await getUserJobApplications();
      
      if (Array.isArray(data)) {
        setApplications(data);
        console.log(`Loaded ${data.length} applications from database`);
      } else {
        setApplications([]);
        setError("Invalid data received from server.");
      }
    } catch (err) {
      console.error("Error loading applications from database:", err);
      
      // Show specific error messages
      if (err.response?.status === 401) {
        setError("Please sign in to view your applications.");
      } else if (err.response?.status === 404) {
        setError("Applications endpoint not found. Please contact support.");
      } else {
        setError("Failed to load applications from database. Please try again later.");
      }
      
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        loadApplications();
      } else {
        setLoading(false);
      }
    }
  }, [isAuthenticated, authLoading]);

  // Show all applications without filtering
  const filteredApplications = applications;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => navigate("/")}
            className="mb-4 text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2 text-sm"
          >
            ← Back to Dashboard
          </button>

          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Authentication Required</h1>
            <p className="text-gray-600 mb-8 text-sm">
              Sign in with your Google account to track your job applications.
            </p>
            <button
              onClick={loginWithGoogle}
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading your applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 animate-fadeIn">
          <button
            onClick={() => navigate("/")}
            className="mb-5 text-gray-600 hover:text-gray-900 font-semibold flex items-center gap-2 text-sm transition-colors duration-200 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform duration-200">←</span> Back to Dashboard
          </button>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">Application Tracker</h1>
          <p className="mt-2 text-gray-600 text-base font-light">Monitor the status of your job applications</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 rounded-xl bg-rose-50 border border-rose-200 p-5 text-rose-700 text-sm font-medium shadow-sm animate-fadeIn">
            {error}
          </div>
        )}

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm animate-fadeIn">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="font-bold text-xl text-gray-900 mb-3">No applications found</h3>
            {applications.length === 0 ? (
              <>
                <p className="text-base text-gray-600 mb-8 font-light">You haven't applied to any positions yet.</p>
                <button
                  onClick={() => navigate("/apply-jobs")}
                  className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  Browse Job Opportunities
                </button>
              </>
            ) : (
              <p className="text-base text-gray-600 font-light">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApplications.map((app, index) => (
              <div
                key={app.id}
                onClick={() => setSelectedApplication(app)}
                className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 cursor-pointer p-6 hover-lift animate-fadeIn"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-900 truncate mb-2 leading-tight">{app.jobTitle || "Job Title"}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="text-gray-700 font-semibold text-sm">{app.company || "Company"}</p>
                    </div>
                  </div>
                </div>
                <span className={`inline-block px-4 py-2 rounded-xl text-xs font-bold border ${statusColors[app.status] || "bg-gray-50 border-gray-200 text-gray-700"}`}>
                  {getStatusLabel(app.status)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Application Details Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 sm:p-10 max-h-[80vh] overflow-y-auto border border-gray-100 animate-slideIn">
              <button
                onClick={() => setSelectedApplication(null)}
                className="absolute right-6 top-6 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all duration-200 flex items-center justify-center text-xl font-light shadow-sm hover:shadow-md"
              >
                ×
              </button>

              <div className="mb-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedApplication.jobTitle}</h2>
                    <p className="text-gray-700 font-semibold">{selectedApplication.company}</p>
                  </div>
                  <span className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap border ${statusColors[selectedApplication.status] || "bg-gray-50 border-gray-200 text-gray-700"}`}>
                    {getStatusLabel(selectedApplication.status)}
                  </span>
                </div>

                <p className="text-gray-600 text-sm">
                  {selectedApplication.location || "Location not specified"}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium mb-1">Applied On</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {new Date(selectedApplication.appliedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium mb-1">Status</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {getStatusLabel(selectedApplication.status)}
                  </p>
                </div>
                {selectedApplication.salary && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-600 font-medium mb-1">Salary Range</p>
                    <p className="font-semibold text-gray-900 text-sm">{selectedApplication.salary}</p>
                  </div>
                )}
                {selectedApplication.lastUpdated && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-600 font-medium mb-1">Last Updated</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {new Date(selectedApplication.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {selectedApplication.notes && (
                <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium mb-2">Notes</p>
                  <p className="text-gray-700 text-sm">{selectedApplication.notes}</p>
                </div>
              )}

              {selectedApplication.jobDescription && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Job Description</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 max-h-48 overflow-y-auto border border-gray-200">
                    {selectedApplication.jobDescription}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="flex-1 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 text-gray-900 font-semibold py-3 px-6 transition-all duration-200 text-sm shadow-sm hover:shadow-md"
                >
                  Close
                </button>
                <button
                  onClick={() => navigate("/apply-jobs")}
                  className="flex-1 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-6 transition-all duration-200 text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  Browse More Jobs
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

