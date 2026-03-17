import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHackathonApplicationDetails, getHackathonById, submitHackathonPhase } from '../api/jobApi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, Clock, Upload, FileText, AlertCircle, ChevronRight, Download, Share2, Award, Eye, X, User } from 'lucide-react';
import { downloadCertificate, shareOnLinkedIn, generateCertificateCode } from './CertificateGenerator';
import CertificateTemplate from './CertificateGenerator';

export default function HackathonApplicationDashboard() {
    const { applicationId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [application, setApplication] = useState(null);
    const [hackathon, setHackathon] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Submission State
    // Submission State
    const [solutionText, setSolutionText] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [submissionLink, setSubmissionLink] = useState('');
    const [downloadingCertificate, setDownloadingCertificate] = useState(false);

    // Certificate Preview State
    const [previewCertificate, setPreviewCertificate] = useState(null);
    const [previewingMember, setPreviewingMember] = useState(null);

    // Validate domain format
    const isValidDomain = (url) => {
        if (!url || url.trim() === '') return true; // Allow empty for now
        
        try {
            // Check if it starts with http:// or https://
            if (!/^https?:\/\//i.test(url)) {
                return false;
            }
            
            // Parse the URL
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            
            // Check if hostname is valid (contains at least one dot and valid characters)
            // Valid domain pattern: subdomain.domain.tld or domain.tld
            const domainPattern = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
            
            // Remove port if present
            const hostnameWithoutPort = hostname.split(':')[0];
            
            return domainPattern.test(hostnameWithoutPort);
        } catch (error) {
            return false;
        }
    };

    // Certificate data comes from backend ONLY - no localStorage fallback

    const handleDownloadCertificate = async () => {
        try {
            setDownloadingCertificate(true);
            const certificateData = {
                participantName: user?.name || 'Participant',
                hackathonTitle: hackathon.title,
                company: hackathon.company,
                rank: application.finalRank,
                rankTitle: application.rankTitle,
                certificateType: application.certificateType,
                isTeam: application.asTeam,
                teamName: application.teamName,
                // ONLY use backend data - NO localStorage fallback
                templateStyle: application.certificateTemplateId || 'template1',
                logoUrl: application.certificateLogoUrl,
                platformLogoUrl: application.certificatePlatformLogoUrl,
                customMessage: application.certificateCustomMessage,
                signerLeft: null,
                signerRight: null,
                signatureLeftUrl: application.certificateSignatureLeftUrl,
                signatureRightUrl: application.certificateSignatureRightUrl,
                date: new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                certificateCode: generateCertificateCode()
            };

            await downloadCertificate(certificateData);
            toast.success('Certificate downloaded successfully!');
        } catch (error) {
            console.error('Error downloading certificate:', error);
            toast.error('Failed to download certificate');
        } finally {
            setDownloadingCertificate(false);
        }
    };

    const handleShareOnLinkedIn = () => {
        try {
            const certificateData = {
                participantName: user?.name || 'Participant',
                hackathonTitle: hackathon.title,
                company: hackathon.company,
                rank: application.finalRank,
                rankTitle: application.rankTitle,
                certificateType: application.certificateType,
                isTeam: application.asTeam,
                teamName: application.teamName,
                // ONLY use backend data - NO localStorage fallback
                templateStyle: application.certificateTemplateId || 'template1',
                logoUrl: application.certificateLogoUrl,
                platformLogoUrl: application.certificatePlatformLogoUrl,
                customMessage: application.certificateCustomMessage,
                signerLeft: null,
                signerRight: null,
                signatureLeftUrl: application.certificateSignatureLeftUrl,
                signatureRightUrl: application.certificateSignatureRightUrl
            };

            shareOnLinkedIn(certificateData);
        } catch (error) {
            console.error('Error sharing on LinkedIn:', error);
            toast.error('Failed to share on LinkedIn');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();

        const getSuffix = (d) => {
            if (d > 3 && d < 21) return 'th';
            switch (d % 10) {
                case 1: return "st";
                case 2: return "nd";
                case 3: return "rd";
                default: return "th";
            }
        };

        return `${day.toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${year} (${day}${getSuffix(day)} ${month} ${year})`;
    };

    const getAllowedExtensions = (format) => {
        if (!format) return '*';
        const lowerFormat = format.toLowerCase();
        switch (lowerFormat) {
            case 'document': return '.pdf,.doc,.docx,.txt';
            case 'video': return '.mp4,.avi,.mov,.mkv';
            case 'image': return '.jpg,.jpeg,.png,.gif';
            case 'code': return '.zip,.rar,.7z,.tar,.gz';
            case 'presentation': return '.ppt,.pptx,.pdf';
            case 'link': return '';
            default: return '*';
        }
    };

    useEffect(() => {
        loadData();
    }, [applicationId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const appData = await getHackathonApplicationDetails(applicationId);
            setApplication(appData);

            const hackData = await getHackathonById(appData.hackathonId);
            setHackathon(hackData);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            toast.error('Failed to load application dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e, format) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error('File size must be less than 5MB');
                return;
            }

            // Validate format
            if (format && format !== 'any' && format !== 'link') {
                const allowed = getAllowedExtensions(format).split(',');
                const ext = '.' + file.name.split('.').pop().toLowerCase();

                // If allowed is *, accept anything. Otherwise check extension.
                if (allowed[0] !== '*' && !allowed.includes(ext)) {
                    toast.error(`Invalid file format. Allowed: ${allowed.join(', ')}`);
                    return;
                }
            }

            setSelectedFile(file);
        }
    };

    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]); // Remove data:type/ext;base64,
            reader.onerror = error => reject(error);
        });
    };

    const handleSubmit = async (phaseId, format) => {
        try {
            // STRICT: Check if phase deadline has passed
            if (hackathon && hackathon.phases) {
                const targetPhase = hackathon.phases.find(p => p.id === phaseId) || 
                                   (phaseId && hackathon.phases[0]); // Fallback to first phase if ID doesn't match
                
                if (targetPhase && targetPhase.deadline) {
                    try {
                        const deadline = new Date(targetPhase.deadline);
                        const now = new Date();
                        if (now > deadline) {
                            toast.error(`Submission deadline has passed. The deadline for ${targetPhase.name || 'this phase'} was ${deadline.toLocaleString()}.`);
                            return;
                        }
                    } catch (e) {
                        console.error('Error parsing phase deadline:', e);
                        toast.error('Unable to verify phase deadline. Please contact support.');
                        return;
                    }
                }
            }

            // Validation
            if (!solutionText.trim()) {
                toast.error('Please provide a solution description/statement');
                return;
            }

            // URL validation helper
            const isValidURL = (string) => {
                try {
                    const url = new URL(string);
                    return url.protocol === 'http:' || url.protocol === 'https:';
                } catch (_) {
                    return false;
                }
            };

            // Validate based on format - ALL formats require either file or link
            if (format === 'link') {
                // Link format: MUST have a valid URL link
                if (!submissionLink.trim()) {
                    toast.error('Please provide a submission link');
                    return;
                }
                if (!isValidURL(submissionLink.trim())) {
                    toast.error('Please enter a valid URL (must start with http:// or https://)');
                    return;
                }
            } else if (format === 'code' || format === 'any') {
                // Code/Any format: Require BOTH file AND valid URL link
                if (!selectedFile) {
                    toast.error('Please upload a file (zip/code)');
                    return;
                }
                if (!submissionLink.trim()) {
                    toast.error('Please provide a GitHub/repository link');
                    return;
                }
                if (!isValidURL(submissionLink.trim())) {
                    toast.error('Please enter a valid URL for your repository (must start with http:// or https://)');
                    return;
                }
            } else {
                // Specific formats (document, video, image, presentation): MUST have a file
                if (!selectedFile) {
                    toast.error(`Please upload a ${format} file`);
                    return;
                }
            }

            setSubmitting(true);

            const submissionData = {
                solutionStatement: solutionText,
                fileName: selectedFile ? selectedFile.name : null,
                fileUrl: selectedFile ? await convertFileToBase64(selectedFile) : null,
                submissionLink: submissionLink.trim() || null // Add link to submission data
            };

            await submitHackathonPhase(applicationId, phaseId, submissionData);

            toast.success('Solution submitted successfully!');
            setSolutionText('');
            setSelectedFile(null);
            setSubmissionLink('');
            loadData(); // Reload to show updated status

        } catch (error) {
            console.error('Error submitting solution:', error);
            toast.error('Failed to submit solution');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!application || !hackathon) return null;

    // Determine current active phase index
    // Logic: Find the first phase that is either PENDING (submitted but not reviewed) or not submitted yet
    // But we also need to respect the sequence. 
    // If Phase 1 is submitted & accepted -> Phase 2 is active.
    // If Phase 1 is submitted & pending -> Phase 1 is active (waiting).
    // If Phase 1 is rejected -> Stopped.

    let activePhaseIndex = 0;
    if (application.status === 'REJECTED') {
        activePhaseIndex = -1; // No active phase
    } else {
        for (let i = 0; i < hackathon.phases.length; i++) {
            const phaseId = hackathon.phases[i].id;
            const submission = application.phaseSubmissions?.[phaseId];

            if (!submission) {
                activePhaseIndex = i;
                break;
            } else if (submission.status === 'ACCEPTED') {
                // Continue to next phase
                if (i === hackathon.phases.length - 1) {
                    activePhaseIndex = i; // Completed all, stay on last
                }
                continue;
            } else if (submission.status === 'REUPLOAD_REQUESTED') {
                // Allow re-upload for this phase
                activePhaseIndex = i;
                break;
            } else {
                // PENDING or REJECTED (though rejected should be caught by app status)
                activePhaseIndex = i;
                break;
            }
        }
    }

    // Check if all phases are completed (all submitted and reviewed)
    const allPhasesCompleted = hackathon.phases.every(phase => {
        const submission = application.phaseSubmissions?.[phase.id];
        return submission && (submission.status === 'ACCEPTED' || submission.status === 'REJECTED');
    });

    const hasPublishedResults = Boolean(
        application.certificateUrl ||
        (application.teamMembers || []).some(member => member.certificateUrl)
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{hackathon.title}</h1>
                        <p className="text-gray-500">Application ID: {application.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-2 rounded-full text-sm font-medium border ${application.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                            application.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-gray-100 text-gray-700 border-gray-200'
                            }`}>
                            Status: {application.status}
                        </span>
                        {application.asTeam ? (
                            <span className="px-4 py-2 rounded-full text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                👥 Team: {application.teamName}
                            </span>
                        ) : (
                            <span className="px-4 py-2 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                👤 Individual Application
                            </span>
                        )}
                    </div>
                </div>

                {/* Rejection Message Section */}
                {application.status === 'REJECTED' && application.rejectionMessage && (
                    <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-6">
                        <div className="flex items-start gap-3">
                            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-red-900 mb-2">Application Rejected</h3>
                                <p className="text-sm text-red-700 whitespace-pre-line leading-relaxed">{application.rejectionMessage}</p>
                                <p className="text-xs text-red-600 mt-3 font-medium">You cannot re-apply to this hackathon.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Individual Applicant Details Section - Show for individual applications */}
                {!application.asTeam && application.individualName && (
                    <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border border-blue-200">
                        <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Your Application Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Full Name</p>
                                <p className="text-sm font-medium text-gray-900">{application.individualName}</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg md:col-span-2">
                                <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Qualifications</p>
                                <p className="text-sm text-gray-700 whitespace-pre-line">{application.individualQualifications}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Results Button - Shows when all phases are completed */}
                {allPhasesCompleted && (
                    <div className="mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white animate-fadeIn">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold mb-1">🎉 All Phases Completed!</h3>
                                <p className="text-purple-100">
                                    {hasPublishedResults
                                        ? 'Results are live. View your performance and certificates.'
                                        : 'Waiting for the industry to publish official results.'}
                                </p>
                            </div>
                            {hasPublishedResults ? (
                                <button
                                    onClick={() => navigate(`/hackathon-application/${applicationId}/results`)}
                                    className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center gap-2 whitespace-nowrap"
                                >
                                    View Results
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            ) : (
                                <div className="px-4 py-2 rounded-lg bg-white/10 border border-white/30 text-sm font-semibold text-white flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Publication pending
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Certificate Section - Shows when hackathon is completed AND not rejected */}
                {allPhasesCompleted && hasPublishedResults && application.status !== 'REJECTED' && (
                    <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border-2 border-purple-200">
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Award className="w-6 h-6 text-purple-600" />
                                {application.finalRank ? '🏆 Your Achievement Certificate' : '🎉 Your Participation Certificate'}
                            </h3>
                            <p className="text-gray-600 text-sm">
                                {application.finalRank
                                    ? `Congratulations on securing ${application.finalRank === 1 ? '1st' : application.finalRank === 2 ? '2nd' : application.finalRank === 3 ? '3rd' : `${application.finalRank}th`} place!`
                                    : 'Thank you for participating in this hackathon!'
                                }
                            </p>
                        </div>

                        {/* Certificate Preview */}
                        <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="relative" style={{
                                width: '100%',
                                paddingBottom: '70.77%', // Maintain A4 landscape aspect ratio (794/1122)
                                overflow: 'hidden',
                                borderRadius: '8px',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    transform: 'scale(0.95)',
                                    transformOrigin: 'center center'
                                }}>
                                    <CertificateTemplate
                                        participantName={user?.name || 'Participant'}
                                        hackathonTitle={hackathon.title}
                                        company={hackathon.company}
                                        rank={application.finalRank}
                                        rankTitle={application.rankTitle}
                                        certificateType={application.certificateType}
                                        isTeam={application.asTeam}
                                        teamName={application.teamName}
                                        // ONLY use backend data - NO localStorage fallback
                                        templateStyle={application.certificateTemplateId || 'template1'}
                                        logoUrl={application.certificateLogoUrl}
                                        platformLogoUrl={application.certificatePlatformLogoUrl}
                                        customMessage={application.certificateCustomMessage}
                                        signerLeft={null}
                                        signerRight={null}
                                        signatureLeftUrl={application.certificateSignatureLeftUrl}
                                        signatureRightUrl={application.certificateSignatureRightUrl}
                                        date={new Date().toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                        certificateCode={generateCertificateCode()}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Team Member Certificates List */}
                        {application.asTeam && application.teamMembers && application.teamMembers.length > 0 && (
                            <div className="mb-6 border-t border-gray-200 pt-6">
                                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Award className="w-5 h-5 text-purple-600" />
                                    Team Member Certificates
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {application.teamMembers.map((member, idx) => {
                                        const memberCertificateData = {
                                            participantName: member.name,  // Individual team member name
                                            hackathonTitle: hackathon.title,
                                            company: hackathon.company,
                                            rank: application.finalRank,
                                            rankTitle: application.rankTitle,
                                            certificateType: application.certificateType,
                                            isTeam: false,  // Show as individual for each team member
                                            teamName: application.teamName,  // Still include team name for reference
                                            // ONLY use backend data - NO localStorage fallback
                                            templateStyle: application.certificateTemplateId || 'template1',
                                            logoUrl: application.certificateLogoUrl,
                                            platformLogoUrl: application.certificatePlatformLogoUrl,
                                            customMessage: application.certificateCustomMessage,
                                            signerLeft: null,
                                            signerRight: null,
                                            signatureLeftUrl: application.certificateSignatureLeftUrl,
                                            signatureRightUrl: application.certificateSignatureRightUrl,
                                            date: new Date().toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            }),
                                            certificateCode: generateCertificateCode()
                                        };

                                        return (
                                            <div key={idx} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-purple-200 transition-colors">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{member.name}</p>
                                                    <p className="text-xs text-gray-500">{member.role} • {member.email}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setPreviewingMember(member);
                                                            console.log(memberCertificateData);
                                                            setPreviewCertificate(memberCertificateData);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                                                        title="Preview Certificate"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const loadingToast = toast.loading(`Generating certificate for ${member.name}...`);
                                                                await downloadCertificate(memberCertificateData);
                                                                toast.dismiss(loadingToast);
                                                                toast.success(`Certificate for ${member.name} downloaded!`);
                                                            } catch (e) {
                                                                toast.dismiss();
                                                                toast.error('Failed to download certificate');
                                                            }
                                                        }}
                                                        className="text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 p-2 rounded-lg transition-colors"
                                                        title="Download Certificate"
                                                    >
                                                        <Download className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 justify-center">
                            <button
                                onClick={() => {
                                    setPreviewCertificate({
                                        participantName: user?.name || 'Participant',
                                        hackathonTitle: hackathon.title,
                                        company: hackathon.company,
                                        rank: application.finalRank,
                                        rankTitle: application.rankTitle,
                                        certificateType: application.certificateType,
                                        isTeam: application.asTeam,
                                        teamName: application.teamName,
                                        // ONLY use backend data - NO localStorage fallback
                                        templateStyle: application.certificateTemplateId || 'template1',
                                        logoUrl: application.certificateLogoUrl,
                                        platformLogoUrl: application.certificatePlatformLogoUrl,
                                        customMessage: application.certificateCustomMessage,
                                        signerLeft: null,
                                        signerRight: null,
                                        signatureLeftUrl: application.certificateSignatureLeftUrl,
                                        signatureRightUrl: application.certificateSignatureRightUrl
                                    });
                                    setPreviewingMember(null);
                                }}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
                            >
                                <Eye className="w-5 h-5" />
                                Preview Certificate
                            </button>
                            <button
                                onClick={handleDownloadCertificate}
                                disabled={downloadingCertificate}
                                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                            >
                                <Download className="w-5 h-5" />
                                {downloadingCertificate ? 'Generating PDF...' : 'Download Certificate'}
                            </button>
                            <button
                                onClick={handleShareOnLinkedIn}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
                            >
                                <Share2 className="w-5 h-5" />
                                Share on LinkedIn
                            </button>
                        </div>
                    </div>
                )}

                {allPhasesCompleted && !hasPublishedResults && (
                    <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border border-dashed border-purple-300 text-sm text-gray-700">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-purple-600" />
                            <div>
                                <p className="font-semibold text-gray-900">Results pending publication</p>
                                <p className="text-gray-600">You will be able to view and download your certificate as soon as the industry partner publishes the final results.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notifications Area */}
                {(application.status === 'REJECTED' || hackathon.phases.some(p => application.phaseSubmissions?.[p.id]?.status === 'ACCEPTED' || application.phaseSubmissions?.[p.id]?.status === 'REJECTED')) && (
                    <div className="mb-6 space-y-2">
                        {application.status === 'REJECTED' && (
                            <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700 animate-fadeIn">
                                <XCircle className="w-5 h-5" />
                                <div>
                                    <p className="font-bold">Application Rejected</p>
                                    <p className="text-sm">Unfortunately, your application has been rejected.</p>
                                </div>
                            </div>
                        )}
                        {hackathon.phases.map((phase, idx) => {
                            const status = application.phaseSubmissions?.[phase.id]?.status;
                            if (status === 'ACCEPTED') {
                                return (
                                    <div key={phase.id} className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3 text-green-700 animate-fadeIn">
                                        <CheckCircle className="w-5 h-5" />
                                        <div>
                                            <p className="font-bold">Phase {idx + 1} Accepted!</p>
                                            <p className="text-sm">Congratulations! You have passed {phase.name}.</p>
                                        </div>
                                    </div>
                                );
                            } else if (status === 'REJECTED') {
                                return (
                                    <div key={phase.id} className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700 animate-fadeIn">
                                        <XCircle className="w-5 h-5" />
                                        <div>
                                            <p className="font-bold">Phase {idx + 1} Rejected</p>
                                            <p className="text-sm">Your submission for {phase.name} was not accepted.</p>
                                        </div>
                                    </div>
                                );
                            } else if (status === 'REUPLOAD_REQUESTED') {
                                const submission = application.phaseSubmissions?.[phase.id];
                                return (
                                    <div key={phase.id} className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start gap-3 text-orange-700 animate-fadeIn">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-bold mb-1">Re-upload Requested for Phase {idx + 1}: {phase.name}</p>
                                            {submission?.remarks && (
                                                <p className="text-sm mb-2">{submission.remarks}</p>
                                            )}
                                            <p className="text-xs text-orange-600 font-medium">Please review the feedback and submit an improved solution.</p>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Phases Timeline (Left Col) */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-bold text-gray-900">Hackathon Phases</h2>

                        <div className="space-y-6">
                            {hackathon.phases.map((phase, index) => {
                                const submission = application.phaseSubmissions?.[phase.id];
                                const isLocked = activePhaseIndex !== -1 && index > activePhaseIndex;
                                const isActive = index === activePhaseIndex;
                                const isCompleted = submission?.status === 'ACCEPTED';
                                const isRejected = submission?.status === 'REJECTED';
                                const isPending = submission?.status === 'PENDING';
                                const isReuploadRequested = submission?.status === 'REUPLOAD_REQUESTED';
                                const reuploadCount = submission?.reuploadCount || 0;
                                
                                // Check if phase deadline has passed
                                const isDeadlinePassed = () => {
                                    if (!phase.deadline) return false;
                                    try {
                                        const deadline = new Date(phase.deadline);
                                        const now = new Date();
                                        return now > deadline;
                                    } catch (e) {
                                        return false;
                                    }
                                };
                                const deadlinePassed = isDeadlinePassed();

                                return (
                                    <div key={phase.id} className={`bg-white rounded-xl border ${isActive ? 'border-purple-500 shadow-md ring-1 ring-purple-100' : 'border-gray-200'
                                        } overflow-hidden transition-all`}>
                                        {/* Phase Header */}
                                        <div className={`p-4 flex justify-between items-center ${isActive ? 'bg-purple-50' : 'bg-gray-50'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isCompleted ? 'bg-green-100 text-green-600' :
                                                    isRejected ? 'bg-red-100 text-red-600' :
                                                        isActive ? 'bg-purple-600 text-white' :
                                                            'bg-gray-200 text-gray-500'
                                                    }`}>
                                                    {isCompleted ? <CheckCircle className="w-5 h-5" /> :
                                                        isRejected ? <XCircle className="w-5 h-5" /> :
                                                            index + 1}
                                                </div>
                                                <div>
                                                    <h3 className={`font-semibold ${isActive ? 'text-purple-900' : 'text-gray-900'}`}>
                                                        {phase.name}
                                                    </h3>
                                                    <p className="text-xs text-gray-500">Deadline: {formatDate(phase.deadline)}</p>
                                                </div>
                                            </div>

                                            <div className="text-sm font-medium">
                                                {isCompleted && <span className="text-green-600">Completed</span>}
                                                {isRejected && <span className="text-red-600">Rejected</span>}
                                                {isReuploadRequested && <span className="text-orange-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Re-upload Requested</span>}
                                                {isPending && <span className="text-yellow-600 flex items-center gap-1"><Clock className="w-4 h-4" /> Under Review</span>}
                                                {isActive && !submission && <span className="text-purple-600">Current Phase</span>}
                                                {isLocked && <span className="text-gray-400">Locked</span>}
                                            </div>
                                        </div>

                                        {/* Phase Content */}
                                        <div className="p-6">
                                            <p className="text-gray-600 mb-4">{phase.description}</p>

                                            {/* Submission View (if submitted) */}
                                            {submission && (
                                                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                                                    {/* Re-upload Indicator - Show permanently if solution was re-uploaded */}
                                                    {submission.isReuploaded && (
                                                        <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-green-900">
                                                                    ✅ This is a re-uploaded solution
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-sm font-semibold text-gray-700">Your Submission</h4>
                                                        {reuploadCount > 0 && (
                                                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                                reuploadCount === 1 ? 'bg-blue-100 text-blue-700' :
                                                                reuploadCount === 2 ? 'bg-orange-100 text-orange-700' :
                                                                'bg-gray-100 text-gray-700'
                                                            }`}>
                                                                Re-upload requested: {reuploadCount === 1 ? '1st time' : reuploadCount === 2 ? '2nd time (Final)' : `${reuploadCount} times`}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {submission.solutionStatement && (
                                                        <p className="text-sm text-gray-600 mb-2">{submission.solutionStatement}</p>
                                                    )}
                                                    {submission.fileName && (
                                                        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded w-fit">
                                                            <FileText className="w-4 h-4" />
                                                            {submission.fileName}
                                                        </div>
                                                    )}
                                                    <div className="mt-2 text-xs text-gray-400">
                                                        Submitted on: {new Date(submission.submittedAt).toLocaleString()}
                                                    </div>

                                                    {/* Feedback / Score */}
                                                    {(submission.score || submission.remarks) && (
                                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                                            <h5 className="text-sm font-semibold text-gray-700 mb-2">
                                                                {isReuploadRequested ? 'Re-upload Request' : 'Feedback'}
                                                            </h5>
                                                            {submission.score && (
                                                                <div className="mb-1">
                                                                    <span className="text-xs font-bold text-gray-500 uppercase">Score:</span>
                                                                    <span className="ml-2 font-mono font-bold text-purple-600">{submission.score}/100</span>
                                                                </div>
                                                            )}
                                                            {submission.remarks && (
                                                                <div>
                                                                    <span className="text-xs font-bold text-gray-500 uppercase">
                                                                        {isReuploadRequested ? 'Industry Feedback:' : 'Remarks:'}
                                                                    </span>
                                                                    <p className="text-sm text-gray-700 mt-1 italic">"{submission.remarks}"</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Re-upload Request Message */}
                                            {isReuploadRequested && (
                                                <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                                                    <div className="flex items-start gap-2">
                                                        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-orange-900 mb-1">Re-upload Requested</p>
                                                            <p className="text-sm text-orange-700">Please review the feedback above and submit an improved solution.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Submission Form (if active and not pending/accepted/rejected, or if re-upload requested) */}
                                            {((isActive && !isPending && !isCompleted && !isRejected) || (isReuploadRequested && isActive)) && (
                                                <div className="mt-4 animate-fadeIn">
                                                    <h4 className="text-sm font-bold text-gray-900 mb-3">Submit Solution</h4>

                                                    {/* Solution Statement - Always visible */}
                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Solution Statement / Description
                                                        </label>
                                                        <textarea
                                                            rows="3"
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                            placeholder="Describe your solution approach..."
                                                            value={solutionText}
                                                            onChange={(e) => setSolutionText(e.target.value)}
                                                        ></textarea>
                                                    </div>

                                                    {/* Link Submission - Visible for Link, Code, or Any */}
                                                    {(phase.uploadFormat === 'link' || phase.uploadFormat === 'code' || phase.uploadFormat === 'any') && (
                                                        <div className="mb-4">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Submission Link
                                                                <span className="text-xs text-gray-500 ml-2">
                                                                    {phase.uploadFormat === 'code' ? '(GitHub/GitLab Repository)' : '(Project URL)'}
                                                                </span>
                                                            </label>
                                                            <input
                                                                type="url"
                                                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                                                    submissionLink && !isValidDomain(submissionLink) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                                                }`}
                                                                placeholder="https://example.com or https://github.com/username/repo"
                                                                value={submissionLink}
                                                                onChange={(e) => {
                                                                    const value = e.target.value;
                                                                    setSubmissionLink(value);
                                                                    if (value && !isValidDomain(value)) {
                                                                        // Show validation error
                                                                    }
                                                                }}
                                                                pattern="https?://.*"
                                                                title="Please enter a valid URL with a valid domain (e.g., https://example.com)"
                                                            />
                                                            {submissionLink && !isValidDomain(submissionLink) && (
                                                                <p className="mt-1 text-xs text-red-600">
                                                                    Please enter a valid URL with a valid domain (e.g., https://example.com, https://github.com/user/repo)
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* File Upload - Visible unless format is strictly 'link' */}
                                                    {phase.uploadFormat !== 'link' && (
                                                        <div className="mb-4">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Upload File
                                                                <span className="text-xs text-gray-500 ml-2 capitalize">
                                                                    ({phase.uploadFormat === 'any' ? 'Any Format' : phase.uploadFormat || 'Document'})
                                                                </span>
                                                            </label>
                                                            <div className="flex items-center justify-center w-full">
                                                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                                                                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                                                        <p className="text-xs text-gray-500">
                                                                            Allowed: {getAllowedExtensions(phase.uploadFormat).replace(/\./g, ' ').toUpperCase()}
                                                                        </p>
                                                                    </div>
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        onChange={(e) => handleFileChange(e, phase.uploadFormat)}
                                                                        accept={getAllowedExtensions(phase.uploadFormat)}
                                                                    />
                                                                </label>
                                                            </div>
                                                            {selectedFile && (
                                                                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                                                                    <p className="text-sm text-green-700 flex items-center gap-2">
                                                                        <CheckCircle className="w-4 h-4" />
                                                                        <span className="font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                                                                    </p>
                                                                    <button
                                                                        onClick={() => setSelectedFile(null)}
                                                                        className="text-gray-400 hover:text-red-500"
                                                                    >
                                                                        <XCircle className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {deadlinePassed ? (
                                                        <div className="w-full bg-red-50 border border-red-200 text-red-700 py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2">
                                                            <XCircle className="w-4 h-4" />
                                                            Submission Deadline Passed
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSubmit(phase.id, phase.uploadFormat)}
                                                            disabled={
                                                                submitting ||
                                                                !solutionText.trim() ||
                                                                (phase.uploadFormat === 'link' && (!submissionLink.trim() || !isValidDomain(submissionLink))) ||
                                                                ((phase.uploadFormat === 'code' || phase.uploadFormat === 'any') && (!selectedFile || !submissionLink.trim() || !isValidDomain(submissionLink))) ||
                                                                (phase.uploadFormat !== 'link' && phase.uploadFormat !== 'code' && phase.uploadFormat !== 'any' && !selectedFile)
                                                            }
                                                            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                        >
                                                            {submitting ? (
                                                                <>
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                                    Submitting...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Upload className="w-4 h-4" />
                                                                    Submit Solution
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {isLocked && (
                                                <div className="flex items-center gap-2 text-gray-400 text-sm italic bg-gray-50 p-3 rounded">
                                                    <AlertCircle className="w-4 h-4" />
                                                    Complete previous phases to unlock this phase.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sidebar (Right Col) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-4">Hackathon Details</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Mode</span>
                                    <span className="font-medium text-gray-900">{hackathon.mode}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Team Size</span>
                                    <span className="font-medium text-gray-900">{hackathon.teamSize} Max</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Prize</span>
                                    <span className="font-medium text-gray-900">{hackathon.prize}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/hackathon/${hackathon.id}`)}
                                className="w-full mt-6 text-purple-600 text-sm font-medium hover:underline"
                            >
                                View Full Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Certificate Preview Modal */}
            {previewCertificate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => {
                    setPreviewCertificate(null);
                    setPreviewingMember(null);
                }}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    {previewingMember ? `Certificate Preview - ${previewingMember.name}` : 'Certificate Preview'}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {previewingMember ? `${previewingMember.role} • ${previewingMember.email}` : 'Review your certificate before downloading'}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={async () => {
                                        try {
                                            setDownloadingCertificate(true);
                                            await downloadCertificate(previewCertificate);
                                            toast.success('Certificate downloaded successfully!');
                                            setPreviewCertificate(null);
                                            setPreviewingMember(null);
                                        } catch (error) {
                                            console.error('Error downloading certificate:', error);
                                            toast.error('Failed to download certificate');
                                        } finally {
                                            setDownloadingCertificate(false);
                                        }
                                    }}
                                    disabled={downloadingCertificate}
                                    className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download className="w-5 h-5" />
                                    {downloadingCertificate ? 'Generating...' : 'Download PDF'}
                                </button>
                                <button
                                    onClick={() => {
                                        setPreviewCertificate(null);
                                        setPreviewingMember(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50">
                            <div className="bg-white rounded-lg p-4 shadow-lg" style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minHeight: '600px'
                            }}>
                                <div style={{
                                    width: '100%',
                                    maxWidth: '1122px',
                                    transform: 'scale(0.85)',
                                    transformOrigin: 'center center'
                                }}>
                                    <CertificateTemplate
                                        participantName={previewCertificate.participantName}
                                        hackathonTitle={previewCertificate.hackathonTitle}
                                        company={previewCertificate.company}
                                        rank={previewCertificate.rank}
                                        rankTitle={previewCertificate.rankTitle}
                                        certificateType={previewCertificate.certificateType}
                                        isTeam={previewCertificate.isTeam}
                                        teamName={previewCertificate.teamName}
                                        // ONLY use backend data from previewCertificate - NO fallbacks
                                        templateStyle={previewCertificate.templateStyle}
                                        logoUrl={previewCertificate.logoUrl}
                                        platformLogoUrl={previewCertificate.platformLogoUrl}
                                        customMessage={previewCertificate.customMessage}
                                        signerLeft={previewCertificate.signerLeft}
                                        signerRight={previewCertificate.signerRight}
                                        signatureLeftUrl={previewCertificate.signatureLeftUrl}
                                        signatureRightUrl={previewCertificate.signatureRightUrl}
                                        date={new Date().toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                        certificateCode={generateCertificateCode()}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
