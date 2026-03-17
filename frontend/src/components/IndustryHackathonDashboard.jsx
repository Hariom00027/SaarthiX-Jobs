import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHackathonById, getHackathonApplications, reviewHackathonPhase, deleteHackathonApplication, rejectHackathonApplication, requestReupload } from '../api/jobApi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Users, Search, Filter, ChevronRight, CheckCircle, XCircle, Clock, FileText, Download, Trash2, User, AlertCircle } from 'lucide-react';

export default function IndustryHackathonDashboard() {
    const { hackathonId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [hackathon, setHackathon] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState(null); // For modal/detail view

    // Review State
    const [reviewScore, setReviewScore] = useState('');
    const [reviewRemarks, setReviewRemarks] = useState('');
    const [reviewAction, setReviewAction] = useState('ACCEPTED'); // ACCEPTED or REJECTED
    const [submittingReview, setSubmittingReview] = useState(false);

    // Reject Application State
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionMessage, setRejectionMessage] = useState('');
    const [rejectingApplication, setRejectingApplication] = useState(false);

    // Request Re-upload State
    const [showReuploadModal, setShowReuploadModal] = useState(false);
    const [reuploadPhaseId, setReuploadPhaseId] = useState(null);
    const [reuploadMessage, setReuploadMessage] = useState('');
    const [requestingReupload, setRequestingReupload] = useState(false);

    // Calculate re-upload info for modal
    const currentSubmissionForModal = selectedApp?.phaseSubmissions?.[reuploadPhaseId];
    const currentReuploadCountForModal = currentSubmissionForModal?.reuploadCount || 0;
    const isFinalReuploadForModal = currentReuploadCountForModal === 1;
    const remainingReuploadsForModal = 2 - currentReuploadCountForModal;

    useEffect(() => {
        loadData();
    }, [hackathonId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [hackData, appsData] = await Promise.all([
                getHackathonById(hackathonId),
                getHackathonApplications(hackathonId)
            ]);
            setHackathon(hackData);
            setApplications(appsData);
            
            console.log('[Industry Dashboard] Loaded applications:', appsData);
            appsData.forEach((app, index) => {
                console.log(`[App ${index}] asTeam:`, app.asTeam, 
                           '| individualName:', app.individualName,
                           '| individualQualifications:', app.individualQualifications);
            });
        } catch (error) {
            console.error('Error loading dashboard:', error);
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteApplication = async (e, applicationId) => {
        e.stopPropagation(); // Prevent selecting the app
        if (!window.confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
            return;
        }

        try {
            await deleteHackathonApplication(applicationId);
            toast.success('Application deleted successfully');

            // Remove from local state
            setApplications(applications.filter(app => app.id !== applicationId));
            if (selectedApp && selectedApp.id === applicationId) {
                setSelectedApp(null);
            }
        } catch (error) {
            console.error('Error deleting application:', error);
            toast.error(error.response?.data || 'Failed to delete application');
        }
    };

    const handleReviewSubmit = async (phaseId) => {
        if (!selectedApp) return;

        // Validate score
        const scoreValue = reviewScore ? parseInt(reviewScore) : 0;
        if (scoreValue > 100) {
            toast.error('Score cannot be more than 100');
            return;
        }
        if (scoreValue < 0) {
            toast.error('Score cannot be negative');
            return;
        }

        try {
            setSubmittingReview(true);
            const reviewData = {
                status: reviewAction,
                score: scoreValue,
                remarks: reviewRemarks
            };

            await reviewHackathonPhase(selectedApp.id, phaseId, reviewData);

            toast.success(`Submission ${reviewAction.toLowerCase()} successfully`);

            // Update local state
            const updatedApps = applications.map(app => {
                if (app.id === selectedApp.id) {
                    const updatedSubmissions = { ...app.phaseSubmissions };
                    updatedSubmissions[phaseId] = {
                        ...updatedSubmissions[phaseId],
                        ...reviewData
                    };
                    // Also update overall status if rejected
                    const newStatus = reviewAction === 'REJECTED' ? 'REJECTED' : app.status;

                    const updatedApp = { ...app, phaseSubmissions: updatedSubmissions, status: newStatus };
                    setSelectedApp(updatedApp); // Update selected view
                    return updatedApp;
                }
                return app;
            });

            setApplications(updatedApps);
            setReviewScore('');
            setReviewRemarks('');

        } catch (error) {
            console.error('Error submitting review:', error);
            toast.error('Failed to submit review');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleRejectApplication = async () => {
        if (!selectedApp || !rejectionMessage.trim()) {
            toast.error('Please provide a rejection message');
            return;
        }

        try {
            setRejectingApplication(true);
            await rejectHackathonApplication(selectedApp.id, rejectionMessage);
            toast.success('Application rejected successfully');

            // Update local state
            const updatedApps = applications.map(app => {
                if (app.id === selectedApp.id) {
                    const updatedApp = { ...app, status: 'REJECTED', rejectionMessage };
                    setSelectedApp(updatedApp);
                    return updatedApp;
                }
                return app;
            });

            setApplications(updatedApps);
            setShowRejectModal(false);
            setRejectionMessage('');

        } catch (error) {
            console.error('Error rejecting application:', error);
            toast.error(error.response?.data || 'Failed to reject application');
        } finally {
            setRejectingApplication(false);
        }
    };

    const handleRequestReupload = async () => {
        if (!selectedApp || !reuploadPhaseId || !reuploadMessage.trim()) {
            toast.error('Please provide a message for the re-upload request');
            return;
        }

        // STRICT VALIDATION: Check re-upload count before submitting
        const currentSubmission = selectedApp.phaseSubmissions?.[reuploadPhaseId];
        const currentReuploadCount = currentSubmission?.reuploadCount || 0;
        
        // Reject if count is 2 or more - STRICT ENFORCEMENT
        if (currentReuploadCount >= 2) {
            toast.error('Maximum re-upload limit (2 times) has already been reached for this submission. You cannot request another re-upload.');
            setShowReuploadModal(false);
            setReuploadPhaseId(null);
            setReuploadMessage('');
            return;
        }
        
        // Additional safety check: reject if count is exactly 2
        if (currentReuploadCount === 2) {
            toast.error('This submission has already reached the maximum re-upload limit of 2 times.');
            setShowReuploadModal(false);
            setReuploadPhaseId(null);
            setReuploadMessage('');
            return;
        }

        try {
            setRequestingReupload(true);
            const response = await requestReupload(selectedApp.id, reuploadPhaseId, reuploadMessage);
            toast.success('Re-upload requested successfully');

            // Reload applications to get fresh data from backend (ensures count is accurate)
            try {
                const freshApps = await getHackathonApplications(hackathonId);
                setApplications(freshApps);
                
                // Update selected app with fresh data
                const freshSelectedApp = freshApps.find(app => app.id === selectedApp.id);
                if (freshSelectedApp) {
                    setSelectedApp(freshSelectedApp);
                }
            } catch (reloadError) {
                console.error('Error reloading applications:', reloadError);
                // Fallback: update local state
                const updatedApps = applications.map(app => {
                    if (app.id === selectedApp.id) {
                        const responseSubmissions = response.phaseSubmissions || {};
                        const updatedSubmissions = { ...app.phaseSubmissions };
                        Object.keys(responseSubmissions).forEach(phaseId => {
                            updatedSubmissions[phaseId] = {
                                ...updatedSubmissions[phaseId],
                                ...responseSubmissions[phaseId]
                            };
                        });
                        const updatedApp = { ...app, phaseSubmissions: updatedSubmissions };
                        setSelectedApp(updatedApp);
                        return updatedApp;
                    }
                    return app;
                });
                setApplications(updatedApps);
            }
            
            setShowReuploadModal(false);
            setReuploadPhaseId(null);
            setReuploadMessage('');

        } catch (error) {
            console.error('Error requesting re-upload:', error);
            const errorMessage = error.response?.data || 'Failed to request re-upload';
            toast.error(errorMessage);
            
            // If backend rejected due to limit, close modal
            if (error.response?.status === 400 && errorMessage.includes('limit')) {
                setShowReuploadModal(false);
                setReuploadPhaseId(null);
                setReuploadMessage('');
            }
        } finally {
            setRequestingReupload(false);
        }
    };

    const downloadFile = (base64, fileName) => {
        const link = document.createElement("a");
        link.href = `data:application/octet-stream;base64,${base64}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!hackathon) return null;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{hackathon.title} - Dashboard</h1>
                        <p className="text-gray-500">Manage applications and reviews</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(`/industry/hackathon/${hackathonId}/results`)}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                            Publish Results
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button onClick={() => navigate('/manage-hackathons')} className="text-purple-600 hover:underline">
                            Back to Hackathons
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Applications List (Left Col) */}
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-200px)] flex flex-col">
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <h2 className="font-bold text-gray-700 flex items-center gap-2">
                                <Users className="w-5 h-5" /> Applicants ({applications.length})
                            </h2>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-2">
                            {applications.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No applications yet.</p>
                            ) : (
                                applications.map(app => (
                                    <div
                                        key={app.id}
                                        onClick={() => setSelectedApp(app)}
                                        className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedApp?.id === app.id
                                            ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-200'
                                            : 'bg-white border-gray-200 hover:border-purple-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-medium text-gray-900">
                                                        {app.asTeam ? app.teamName : (app.individualName || (app.teamMembers && app.teamMembers.length > 0 ? app.teamMembers[0].name : 'Participant'))}
                                                    </h3>
                                                    {app.asTeam ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                            👥 Team
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                            👤 Individual
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500">ID: {app.id.substring(0, 8)}...</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${app.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                    app.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {app.status}
                                                </span>
                                                <button
                                                    onClick={(e) => handleDeleteApplication(e, app.id)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                    title="Delete Application"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500 flex justify-between">
                                            <span>Phase: {app.currentPhaseId ? hackathon.phases.find(p => p.id === app.currentPhaseId)?.name || 'Started' : 'Started'}</span>
                                            <span>{new Date(app.appliedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Detail View (Right Col) */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-200px)] overflow-y-auto">
                        {selectedApp ? (
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-xl font-bold text-gray-900">
                                                {selectedApp.asTeam ? selectedApp.teamName : (selectedApp.individualName || (selectedApp.teamMembers && selectedApp.teamMembers.length > 0 ? selectedApp.teamMembers[0].name : 'Participant'))}
                                            </h2>
                                            {selectedApp.asTeam ? (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                                                    👥 Team Application
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                                                    👤 Individual Application
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">Applicant ID: {selectedApp.applicantId}</p>
                                        {selectedApp.asTeam && (
                                            <p className="text-sm text-gray-500">Team Size: {selectedApp.teamSize}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedApp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                            selectedApp.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {selectedApp.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Rejection Message Display */}
                                {selectedApp.status === 'REJECTED' && selectedApp.rejectionMessage && (
                                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <h4 className="font-bold text-red-900 mb-1">Application Rejected</h4>
                                                <p className="text-sm text-red-700 whitespace-pre-line">{selectedApp.rejectionMessage}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                {selectedApp.status === 'ACTIVE' && (
                                    <div className="mb-6 flex gap-3">
                                        <button
                                            onClick={() => setShowRejectModal(true)}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Reject Application
                                        </button>
                                    </div>
                                )}

                                {!selectedApp.asTeam && selectedApp.individualName && (
                                    <div className="mb-8 bg-blue-50 rounded-xl p-4 border border-blue-200">
                                        <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                                            <User className="w-4 h-4" /> Individual Applicant Details
                                        </h3>
                                        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</p>
                                                    <p className="text-sm font-medium text-gray-900">{selectedApp.individualName}</p>
                                                </div>
                                                {selectedApp.individualEmail && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Email</p>
                                                        <p className="text-sm text-gray-700">{selectedApp.individualEmail}</p>
                                                    </div>
                                                )}
                                                {selectedApp.individualPhone && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Phone Number</p>
                                                        <p className="text-sm text-gray-700">{selectedApp.individualPhone}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Qualifications</p>
                                                    <p className="text-sm text-gray-700 whitespace-pre-line">{selectedApp.individualQualifications}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedApp.asTeam && selectedApp.teamMembers && selectedApp.teamMembers.length > 0 && (
                                    <div className="mb-8 bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <Users className="w-4 h-4" /> Team Members
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {selectedApp.teamMembers.map((member, idx) => (
                                                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-semibold text-gray-900">{member.name}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${member.role === 'Team Lead' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {member.role}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 space-y-0.5">
                                                        <p>{member.email}</p>
                                                        <p>{member.phone}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-8">
                                    {hackathon.phases.map((phase, index) => {
                                        const submission = selectedApp.phaseSubmissions?.[phase.id];
                                        const isPending = submission?.status === 'PENDING';
                                        const isReuploadRequested = submission?.status === 'REUPLOAD_REQUESTED';
                                        const reuploadCount = submission?.reuploadCount || 0;
                                        const canRequestReupload = reuploadCount < 2;

                                        return (
                                            <div key={phase.id} className="border border-gray-200 rounded-xl overflow-hidden">
                                                <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                                                    <h3 className="font-bold text-gray-800">Phase {index + 1}: {phase.name}</h3>
                                                    {submission && (
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                            submission.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                                                            submission.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                            submission.status === 'REUPLOAD_REQUESTED' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {submission.status === 'REUPLOAD_REQUESTED' ? 'RE-UPLOAD REQUESTED' : submission.status}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="p-4">
                                                    {!submission ? (
                                                        <p className="text-gray-400 italic text-sm">No submission yet.</p>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {/* Re-upload Indicators */}
                                                            {submission.isReuploaded && (
                                                                <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-bold text-green-900">
                                                                            ✅ This solution has been re-uploaded by the applicant
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Re-upload Request Count Badge */}
                                                            {reuploadCount > 0 && (
                                                                <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-bold text-blue-900">
                                                                            Re-upload requested: {reuploadCount === 1 ? '1st time' : reuploadCount === 2 ? '2nd time (Final)' : `${reuploadCount} times`}
                                                                        </span>
                                                                        {reuploadCount >= 2 && (
                                                                            <span className="text-xs text-red-600 font-semibold">(Maximum limit reached - cannot request more)</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Submission Content */}
                                                            <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                                                                {submission.solutionStatement && (
                                                                    <div>
                                                                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Solution Statement</p>
                                                                        <p className="text-gray-800 text-sm">{submission.solutionStatement}</p>
                                                                    </div>
                                                                )}
                                                                {submission.submissionLink && (
                                                                    <div>
                                                                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Submission Link</p>
                                                                        <a
                                                                            href={submission.submissionLink}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium break-all hover:underline"
                                                                        >
                                                                            🔗 {submission.submissionLink}
                                                                        </a>
                                                                    </div>
                                                                )}
                                                                {submission.fileName && (
                                                                    <div>
                                                                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Attached File</p>
                                                                        <button
                                                                            onClick={() => downloadFile(submission.fileUrl, submission.fileName)}
                                                                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                                        >
                                                                            <FileText className="w-4 h-4" /> {submission.fileName} <Download className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <p className="text-xs text-gray-400 mt-2 text-right">
                                                                    Submitted: {new Date(submission.submittedAt).toLocaleString()}
                                                                </p>
                                                            </div>

                                                            {/* Re-upload Requested Message */}
                                                            {submission.status === 'REUPLOAD_REQUESTED' && (
                                                                <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
                                                                    <div className="flex items-start gap-2">
                                                                        <Clock className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                                                                        <div className="flex-1">
                                                                            <p className="text-xs font-bold text-orange-900 mb-1">Re-upload Requested</p>
                                                                            {submission.remarks && (
                                                                                <p className="text-sm text-orange-700">{submission.remarks}</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Review Section - Only show for PENDING status, not REUPLOAD_REQUESTED */}
                                                            {isPending ? (
                                                                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 animate-fadeIn">
                                                                    <h4 className="font-bold text-purple-900 mb-3">Review Submission</h4>

                                                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                                                        <div>
                                                                            <label className="block text-xs font-bold text-gray-600 mb-1">Score (0-100)</label>
                                                                            <input
                                                                                type="number"
                                                                                min="0" max="100"
                                                                                value={reviewScore}
                                                                                onChange={(e) => {
                                                                                    const value = e.target.value;
                                                                                    const numValue = parseInt(value);
                                                                                    if (value === '' || (numValue >= 0 && numValue <= 100)) {
                                                                                        setReviewScore(value);
                                                                                    } else if (numValue > 100) {
                                                                                        toast.warning('Score cannot exceed 100');
                                                                                        setReviewScore('100');
                                                                                    }
                                                                                }}
                                                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-bold text-gray-600 mb-1">Decision</label>
                                                                            <select
                                                                                value={reviewAction}
                                                                                onChange={(e) => setReviewAction(e.target.value)}
                                                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500"
                                                                            >
                                                                                <option value="ACCEPTED">Accept</option>
                                                                                <option value="REJECTED">Reject</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>

                                                                    <div className="mb-3">
                                                                        <label className="block text-xs font-bold text-gray-600 mb-1">Remarks</label>
                                                                        <textarea
                                                                            rows="2"
                                                                            value={reviewRemarks}
                                                                            onChange={(e) => setReviewRemarks(e.target.value)}
                                                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500"
                                                                            placeholder="Optional remarks..."
                                                                        ></textarea>
                                                                    </div>

                                                                    <div className="flex gap-2">
                                                                        {reuploadCount >= 2 ? (
                                                                            <div className="flex-1 px-3 py-2 bg-gray-300 text-gray-600 rounded font-medium text-sm text-center cursor-not-allowed">
                                                                                Re-upload Limit Reached (2/2)
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => {
                                                                                    // Strict validation: double-check the limit before opening modal
                                                                                    if (reuploadCount >= 2) {
                                                                                        toast.error('Maximum re-upload limit (2 times) has been reached for this submission');
                                                                                        return;
                                                                                    }
                                                                                    // Additional check
                                                                                    const currentSub = selectedApp.phaseSubmissions?.[phase.id];
                                                                                    const currentCount = currentSub?.reuploadCount || 0;
                                                                                    if (currentCount >= 2) {
                                                                                        toast.error('Maximum re-upload limit (2 times) has been reached');
                                                                                        return;
                                                                                    }
                                                                                    setReuploadPhaseId(phase.id);
                                                                                    setShowReuploadModal(true);
                                                                                }}
                                                                                disabled={!canRequestReupload || reuploadCount >= 2}
                                                                                className={`flex-1 px-3 py-2 rounded font-medium transition-colors text-sm ${
                                                                                    canRequestReupload && reuploadCount < 2
                                                                                        ? 'bg-orange-600 text-white hover:bg-orange-700' 
                                                                                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                                                                }`}
                                                                                title={reuploadCount >= 2 ? 'Maximum re-upload limit (2 times) reached' : ''}
                                                                            >
                                                                                {canRequestReupload 
                                                                                    ? `Request Re-upload ${reuploadCount > 0 ? `(${reuploadCount + 1}/2)` : '(1/2)'}` 
                                                                                    : 'Re-upload Limit Reached'}
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => handleReviewSubmit(phase.id)}
                                                                            disabled={submittingReview}
                                                                            className={`flex-1 py-2 rounded font-bold text-white transition-colors ${reviewAction === 'ACCEPTED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                                                                }`}
                                                                        >
                                                                            {submittingReview ? 'Submitting...' : `Submit ${reviewAction === 'ACCEPTED' ? 'Acceptance' : 'Rejection'}`}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : isReuploadRequested ? (
                                                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                                                    <div className="flex items-start gap-3">
                                                                        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                                                        <div className="flex-1">
                                                                            <h4 className="font-bold text-orange-900 mb-2">
                                                                                Waiting for Re-upload {reuploadCount > 0 && `(${reuploadCount === 1 ? '1st' : '2nd'} time)`}
                                                                            </h4>
                                                                            <p className="text-sm text-orange-700 mb-3">
                                                                                You have requested a re-upload for this submission. Please wait for the applicant to submit an improved solution before you can review it.
                                                                            </p>
                                                                            {reuploadCount >= 2 && (
                                                                                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-semibold">
                                                                                    ⚠️ Maximum re-upload limit reached. This is the final chance for the applicant.
                                                                                </div>
                                                                            )}
                                                                            {submission.remarks && (
                                                                                <div className="mt-3 pt-3 border-t border-orange-200">
                                                                                    <p className="text-xs font-semibold text-orange-900 mb-1">Your Feedback to Applicant:</p>
                                                                                    <p className="text-sm text-orange-800 italic">"{submission.remarks}"</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="border-t border-gray-200 pt-3">
                                                                    <h4 className="text-sm font-bold text-gray-700 mb-2">Review Details</h4>
                                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                                        <div>
                                                                            <span className="text-gray-500">Score:</span>
                                                                            <span className="ml-2 font-bold">{submission.score !== null && submission.score !== undefined ? `${submission.score}/100` : 'N/A'}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-gray-500">Decision:</span>
                                                                            <span className={`ml-2 font-bold ${
                                                                                submission.status === 'ACCEPTED' ? 'text-green-600' : 
                                                                                submission.status === 'REJECTED' ? 'text-red-600' :
                                                                                submission.status === 'REUPLOAD_REQUESTED' ? 'text-orange-600' :
                                                                                'text-gray-600'
                                                                            }`}>
                                                                                {submission.status === 'REUPLOAD_REQUESTED' ? 'RE-UPLOAD REQUESTED' : submission.status}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {submission.remarks && (
                                                                        <div className="mt-2 text-sm">
                                                                            <span className="text-gray-500">
                                                                                {submission.status === 'REUPLOAD_REQUESTED' ? 'Re-upload Request:' : 'Remarks:'}
                                                                            </span>
                                                                            <p className="text-gray-800 italic">"{submission.remarks}"</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Users className="w-16 h-16 mb-4 opacity-20" />
                                <p>Select an applicant to view details</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reject Application Modal */}
                {showRejectModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-200">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                        <XCircle className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Reject Application</h3>
                                        <p className="text-sm text-gray-500">This will prevent the applicant from proceeding further</p>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Rejection Reason <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows="4"
                                        value={rejectionMessage}
                                        onChange={(e) => setRejectionMessage(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                        placeholder="Please explain why this application is being rejected. This message will be shown to the applicant."
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        The applicant will see this message and won't be able to re-apply to this hackathon.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowRejectModal(false);
                                            setRejectionMessage('');
                                        }}
                                        disabled={rejectingApplication}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRejectApplication}
                                        disabled={rejectingApplication || !rejectionMessage.trim()}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {rejectingApplication ? 'Rejecting...' : 'Reject Application'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Request Re-upload Modal */}
                {showReuploadModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-200">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                        <Clock className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Request Re-upload</h3>
                                        <p className="text-sm text-gray-500">
                                            {currentReuploadCountForModal === 0 
                                                ? 'Give the applicant a chance to improve their submission' 
                                                : isFinalReuploadForModal 
                                                    ? 'Final re-upload request (2/2)' 
                                                    : `Re-upload request ${currentReuploadCountForModal + 1}/2`}
                                        </p>
                                    </div>
                                </div>

                                {/* Re-upload Count Info */}
                                <div className={`mb-4 p-3 rounded-lg border ${
                                    isFinalReuploadForModal 
                                        ? 'bg-red-50 border-red-200' 
                                        : 'bg-orange-50 border-orange-200'
                                }`}>
                                    <p className={`text-sm font-semibold ${
                                        isFinalReuploadForModal ? 'text-red-900' : 'text-orange-900'
                                    }`}>
                                        {currentReuploadCountForModal === 0 
                                            ? `🔄 This will be the 1st re-upload request (${remainingReuploadsForModal} remaining)`
                                            : isFinalReuploadForModal 
                                                ? '⚠️ This will be the 2nd and FINAL re-upload request (0 remaining)'
                                                : `🔄 This will be re-upload request #${currentReuploadCountForModal + 1} (${remainingReuploadsForModal} remaining)`}
                                    </p>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Message to Applicant <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows="4"
                                        value={reuploadMessage}
                                        onChange={(e) => setReuploadMessage(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Explain what needs to be improved or corrected. The applicant will be able to re-upload their solution."
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        The applicant will see this message and can submit an improved version.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowReuploadModal(false);
                                            setReuploadMessage('');
                                            setReuploadPhaseId(null);
                                        }}
                                        disabled={requestingReupload}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Final validation before submitting
                                            if (currentReuploadCountForModal >= 2) {
                                                toast.error('Maximum re-upload limit (2 times) has been reached');
                                                setShowReuploadModal(false);
                                                setReuploadPhaseId(null);
                                                setReuploadMessage('');
                                                return;
                                            }
                                            handleRequestReupload();
                                        }}
                                        disabled={requestingReupload || !reuploadMessage.trim() || currentReuploadCountForModal >= 2}
                                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                            currentReuploadCountForModal >= 2
                                                ? 'bg-gray-400 text-gray-200'
                                                : isFinalReuploadForModal 
                                                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                                                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                                        }`}
                                    >
                                        {currentReuploadCountForModal >= 2
                                            ? 'Limit Reached (2/2)'
                                            : requestingReupload 
                                                ? 'Requesting...' 
                                                : isFinalReuploadForModal 
                                                    ? 'Request Final Re-upload (2/2)' 
                                                    : `Request Re-upload (${currentReuploadCountForModal + 1}/2)`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
