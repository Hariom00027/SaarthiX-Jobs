import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getUserJobApplications,
  getMyHackathonApplications,
  getAllHackathons,
} from "../api/jobApi";
import { useAuth } from "../context/AuthContext";
import { redirectToSomethingXLogin } from "../config/redirectUrls";

export default function JobTracker() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const notebookIcon = `${import.meta.env.BASE_URL}Container (7).png`;
  const [applications, setApplications] = useState([]);
  const [hackathonApplications, setHackathonApplications] = useState([]);
  const [allHackathons, setAllHackathons] = useState([]);
  const [trackerTab, setTrackerTab] = useState("jobs"); // 'jobs' | 'hackathons'
  const [loading, setLoading] = useState(true);
  const [jobError, setJobError] = useState(null);
  const [hackathonError, setHackathonError] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedHackathonApplication, setSelectedHackathonApplication] =
    useState(null);

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

    setLoading(true);
    setJobError(null);
    setHackathonError(null);

    try {
      const data = await getUserJobApplications();
      if (Array.isArray(data)) {
        setApplications(data);
      } else {
        setApplications([]);
        setJobError("Invalid data received from server.");
      }
    } catch (err) {
      console.error("Error loading job applications:", err);
      setApplications([]);
      if (err.response?.status === 401) {
        setJobError("Please sign in to view your applications.");
      } else if (err.response?.status === 404) {
        setJobError("Applications endpoint not found. Please contact support.");
      } else {
        setJobError(
          "Failed to load job applications. Please try again later."
        );
      }
    }

    try {
      const [hApps, hacks] = await Promise.all([
        getMyHackathonApplications(),
        getAllHackathons(),
      ]);
      setHackathonApplications(Array.isArray(hApps) ? hApps : []);
      setAllHackathons(Array.isArray(hacks) ? hacks : []);
    } catch (err) {
      console.error("Error loading hackathon applications:", err);
      setHackathonApplications([]);
      setAllHackathons([]);
      if (err.response?.status === 401) {
        setHackathonError("Please sign in to view hackathon applications.");
      } else {
        setHackathonError(
          "Failed to load hackathon applications. Please try again later."
        );
      }
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

  useEffect(() => {
    setSelectedApplication(null);
    setSelectedHackathonApplication(null);
  }, [trackerTab]);

  const filteredApplications = applications;

  const resolveHackathon = (hackathonId) =>
    allHackathons.find((h) => h.id === hackathonId);

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
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Authentication Required</h1>
            <p className="text-gray-600 mb-8 text-sm">
              Sign in from SaarthiX Home to track your job applications.
            </p>
            <button
              onClick={() => redirectToSomethingXLogin("student")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors duration-200 font-semibold"
            >
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.951H.957C.348 6.174 0 7.55 0 9s.348 2.826.957 4.049l3.007-2.342z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.582C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.951L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue to SaarthiX Login
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

  const selectedHackathonDetails =
    selectedHackathonApplication &&
    resolveHackathon(selectedHackathonApplication.hackathonId);

  return (
    <div className="min-h-screen bg-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1254px]">
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/apply-jobs")}
            className="h-[39px] rounded-[6px] border border-black bg-white px-[18px] text-[14px] font-medium text-black"
          >
            Apply for Jobs
          </button>
          <button
            onClick={() => navigate("/browse-hackathons")}
            className="h-[39px] rounded-[6px] border border-black bg-white px-[18px] text-[14px] font-medium text-black shadow-[0px_1px_2px_rgba(37,99,235,0.2)]"
          >
            Hackathons 
          </button>
          <button
            onClick={() => navigate("/job-tracker")}
            className="h-[39px] rounded-[6px] border border-white bg-black px-[18px] text-[14px] font-medium text-white"
          >
            My Applications
          </button>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="rounded-[6px] bg-[#3170A5] px-3 py-1.5 text-[12px] font-normal text-white"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-black/50 bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
              <svg className="h-7 w-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 7v-7h7v7h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-[48px] font-bold leading-[1.05] tracking-[-0.5px] text-[#0F1724]">Application Tracker</h1>
              <p className="text-[16px] text-black/75">
                {trackerTab === "jobs"
                  ? "Monitor the status of your job applications"
                  : "View and open your hackathon application dashboards"}
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              navigate(
                trackerTab === "jobs" ? "/apply-jobs" : "/browse-hackathons"
              )
            }
            className="mt-2 h-[39px] rounded-[10px] bg-[#3170A5] px-5 text-[16px] font-semibold text-white"
          >
            {trackerTab === "jobs"
              ? "Browse Job Opportunities"
              : "Browse Hackathons"}
          </button>
        </div>

        <div className="mb-8 flex max-w-xl overflow-hidden rounded-[6px] border border-black/10 bg-white">
          <button
            type="button"
            onClick={() => setTrackerTab("jobs")}
            className={`flex h-[52px] flex-1 items-center justify-center gap-2 border text-[14px] font-semibold transition-colors ${
              trackerTab === "jobs"
                ? "border-b-[3px] border-[#3170A5] text-[#3170A5]"
                : "border-transparent text-black/75 hover:text-black"
            }`}
          >
            Job applications
          </button>
          <button
            type="button"
            onClick={() => setTrackerTab("hackathons")}
            className={`flex h-[52px] flex-1 items-center justify-center gap-2 border text-[14px] font-semibold transition-colors ${
              trackerTab === "hackathons"
                ? "border-b-[3px] border-[#3170A5] text-[#3170A5]"
                : "border-transparent text-black/75 hover:text-black"
            }`}
          >
            Hackathon applications
          </button>
        </div>

        {(jobError || hackathonError) && (
          <div className="mb-8 space-y-2 animate-fadeIn">
            {jobError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700 shadow-sm">
                {jobError}
              </div>
            )}
            {hackathonError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700 shadow-sm">
                {hackathonError}
              </div>
            )}
          </div>
        )}

        <div className="relative min-h-[463px] w-full rounded-[6px] border border-black/40 bg-white shadow-[0px_4px_4px_rgba(0,0,0,0.25)]">
          {trackerTab === "jobs" ? (
            filteredApplications.length === 0 ? (
              <>
                <div className="absolute left-1/2 top-[70px] -translate-x-1/2">
                  <img src={notebookIcon} alt="Notebook icon" className="h-[49px] w-[40px] object-contain" />
                </div>
                <button
                  onClick={() => navigate("/apply-jobs")}
                  className="absolute left-1/2 top-[270px] h-[100px] w-[min(540px,calc(100%-2rem))] max-w-full -translate-x-1/2 rounded-[6px] border border-black/70 bg-[#3170A5] px-4 text-[clamp(18px,4vw,35px)] font-semibold leading-tight text-white"
                >
                  Browse Job Opportunities
                </button>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredApplications.map((app, index) => (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApplication(app)}
                    className="flex h-[298px] w-full max-w-[346px] flex-col rounded-[10px] border border-black/20 bg-white p-5 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.18)] transition-all duration-300 cursor-pointer hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.25)] animate-fadeIn"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-1 text-[18px] font-semibold leading-[27px] text-[#0A1905]">{app.jobTitle || "Job Title"}</h3>
                        <div className="mt-1 flex items-center gap-2">
                          <svg className="h-4 w-4 flex-shrink-0 text-black/45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <p className="line-clamp-1 text-[14px] font-medium leading-[21px] text-black/75">{app.company || "Company"}</p>
                        </div>
                      </div>
                      <span
                        className={`rounded-[10px] border px-3 py-1 text-[12px] font-semibold ${
                          statusColors[app.status] || "bg-gray-50 border-gray-200 text-gray-700"
                        }`}
                      >
                        {getStatusLabel(app.status)}
                      </span>
                    </div>

                    <div className="space-y-1 text-[14px] leading-[21px] text-black/70">
                      <p>Location: {app.location || "Remote"}</p>
                      <p>Applied: {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "N/A"}</p>
                      <p>Status: {getStatusLabel(app.status)}</p>
                    </div>

                    <div className="mt-auto border-t border-black/30 pt-3">
                      <button className="h-[35px] rounded-[10px] bg-[#3170A5] px-5 text-[15px] font-semibold text-white">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : hackathonApplications.length === 0 ? (
            <>
              <div className="absolute left-1/2 top-[70px] -translate-x-1/2">
                <img src={notebookIcon} alt="Notebook icon" className="h-[49px] w-[40px] object-contain" />
              </div>
              <button
                onClick={() => navigate("/browse-hackathons")}
                className="absolute left-1/2 top-[270px] h-[100px] w-[min(540px,calc(100%-2rem))] max-w-full -translate-x-1/2 rounded-[6px] border border-black/70 bg-[#3170A5] px-4 text-[clamp(18px,4vw,35px)] font-semibold leading-tight text-white"
              >
                Browse Hackathons
              </button>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
              {hackathonApplications.map((application, index) => {
                const hackathon = resolveHackathon(application.hackathonId);
                return (
                  <div
                    key={application.id}
                    onClick={() => setSelectedHackathonApplication(application)}
                    className="flex min-h-[298px] w-full max-w-[346px] flex-col rounded-[10px] border border-black/20 bg-white p-5 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.18)] transition-all duration-300 cursor-pointer hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.25)] animate-fadeIn"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-[18px] font-semibold leading-[27px] text-[#0A1905]">
                          {hackathon?.title || "Hackathon"}
                        </h3>
                        <p className="mt-1 line-clamp-1 text-[14px] font-medium text-black/75">
                          {hackathon?.company || "—"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-[10px] border border-green-200 bg-green-50 px-3 py-1 text-[12px] font-semibold text-green-700">
                        Applied
                      </span>
                    </div>
                    <div className="space-y-1 text-[14px] leading-[21px] text-black/70">
                      <p>
                        {application.asTeam
                          ? `Team: ${application.teamName || "—"}`
                          : "Individual"}
                      </p>
                      {application.asTeam && application.teamSize != null && (
                        <p>Team size: {application.teamSize}</p>
                      )}
                      <p>
                        Applied:{" "}
                        {application.appliedAt
                          ? new Date(application.appliedAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div className="mt-auto border-t border-black/30 pt-3">
                      <button
                        type="button"
                        className="h-[35px] rounded-[10px] bg-[#3170A5] px-5 text-[15px] font-semibold text-white"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedHackathonApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="relative w-full max-w-2xl rounded-2xl border border-gray-100 bg-white p-8 shadow-2xl sm:p-10 max-h-[80vh] overflow-y-auto animate-slideIn">
              <button
                type="button"
                onClick={() => setSelectedHackathonApplication(null)}
                className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xl font-light text-gray-600 shadow-sm transition-all duration-200 hover:bg-gray-200 hover:text-gray-900 hover:shadow-md"
              >
                ×
              </button>
              <div className="mb-6">
                <h2 className="mb-1 text-2xl font-bold text-gray-900">
                  {selectedHackathonDetails?.title || "Hackathon"}
                </h2>
                <p className="font-semibold text-gray-700">
                  {selectedHackathonDetails?.company || "—"}
                </p>
                <span className="mt-3 inline-flex rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-xs font-bold text-green-700">
                  Applied
                </span>
              </div>
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-1 text-xs font-medium text-gray-600">
                    Application type
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedHackathonApplication.asTeam
                      ? `Team: ${selectedHackathonApplication.teamName || "—"}`
                      : "Individual"}
                  </p>
                  {selectedHackathonApplication.asTeam &&
                    selectedHackathonApplication.teamSize != null && (
                      <p className="mt-1 text-xs text-gray-600">
                        Team size: {selectedHackathonApplication.teamSize}
                      </p>
                    )}
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-1 text-xs font-medium text-gray-600">
                    Applied on
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedHackathonApplication.appliedAt
                      ? new Date(
                          selectedHackathonApplication.appliedAt
                        ).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
              {selectedHackathonDetails?.submissionUrl && (
                <div className="mb-6">
                  <a
                    href={selectedHackathonDetails.submissionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-[#3170A5] hover:underline"
                  >
                    Open hackathon link →
                  </a>
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setSelectedHackathonApplication(null)}
                  className="flex-1 rounded-xl border-2 border-gray-300 bg-white py-3 px-6 text-sm font-semibold text-gray-900 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate(
                      `/hackathon-application/${selectedHackathonApplication.id}`
                    );
                    setSelectedHackathonApplication(null);
                  }}
                  className="flex-1 rounded-xl bg-[#3170A5] py-3 px-6 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-[#2b6494] hover:shadow-lg"
                >
                  Application dashboard
                </button>
              </div>
            </div>
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

