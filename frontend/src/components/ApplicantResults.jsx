import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApplicationResults } from '../api/jobApi';
import { toast } from 'react-toastify';
import { Trophy, Award, Medal, Download, Star, CheckCircle, Clock, FileText, Eye } from 'lucide-react';
import CertificateTemplate, { downloadCertificate, generateCertificateCode } from './CertificateGenerator';
import { useAuth } from '../context/AuthContext';

export default function ApplicantResults() {
    const { applicationId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // Get current logged-in user
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState(null);
    const [showCelebration, setShowCelebration] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        loadResults();
    }, [applicationId]);

    const loadResults = async () => {
        try {
            setLoading(true);
            const data = await getApplicationResults(applicationId);
            setResults(data);

            // LOG FULL API RESPONSE FOR CERTIFICATE DATA
            console.log('=== [APPLICANT] API Response for Application', applicationId, '===');
            console.log('Full response:', data);
            console.log('Certificate Fields from Backend:');
            console.log('  rank:', data.finalRank);
            console.log('  rankTitle:', data.rankTitle);
            console.log('  certificateTemplateId:', data.certificateTemplateId);
            console.log('  certificateLogoUrl:', data.certificateLogoUrl);
            console.log('  certificatePlatformLogoUrl:', data.certificatePlatformLogoUrl);
            console.log('  certificateCustomMessage:', data.certificateCustomMessage);
            console.log('  certificateSignatureLeftUrl:', data.certificateSignatureLeftUrl);
            console.log('  certificateSignatureRightUrl:', data.certificateSignatureRightUrl);

            // Check if this is a 1st place winner and if they haven't seen the animation
            if (data.finalRank === 1) {
                const hasSeenCelebration = localStorage.getItem(`celebration_${applicationId}`);
                if (!hasSeenCelebration) {
                    setShowCelebration(true);
                    localStorage.setItem(`celebration_${applicationId}`, 'true');

                    // Hide celebration after 5 seconds
                    setTimeout(() => {
                        setShowCelebration(false);
                    }, 5000);
                }
            }
        } catch (error) {
            console.error('Error loading results:', error);
            toast.error('Failed to load results');
        } finally {
            setLoading(false);
        }
    };

    const getRankBadge = (rank) => {
        if (rank === 1) {
            return {
                icon: Trophy,
                color: 'text-yellow-500',
                bg: 'bg-yellow-50',
                border: 'border-yellow-300',
                label: '1st Place - Winner',
                gradient: 'from-yellow-400 to-yellow-600'
            };
        } else if (rank === 2) {
            return {
                icon: Medal,
                color: 'text-gray-400',
                bg: 'bg-gray-50',
                border: 'border-gray-300',
                label: '2nd Place - Runner Up',
                gradient: 'from-gray-300 to-gray-500'
            };
        } else if (rank === 3) {
            return {
                icon: Award,
                color: 'text-orange-600',
                bg: 'bg-orange-50',
                border: 'border-orange-300',
                label: '3rd Place',
                gradient: 'from-orange-400 to-orange-600'
            };
        }
        return null;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <h2 className="text-2xl font-bold text-gray-800">Results not found</h2>
                <button onClick={() => navigate('/browse-hackathons')} className="mt-4 text-purple-600 hover:underline">
                    Back to Hackathons
                </button>
            </div>
        );
    }

    // Calculate total score from phase submissions if not already set
    const calculateTotalScore = () => {
        if (results.totalScore !== null && results.totalScore !== undefined) {
            return results.totalScore;
        }

        // Calculate from phase submissions
        let total = 0;
        Object.values(results.phaseSubmissions || {}).forEach(submission => {
            if (submission.score !== null && submission.score !== undefined) {
                total += submission.score;
            }
        });
        return total;
    };

    // Calculate maximum possible score (100 per phase)
    const calculateMaxScore = () => {
        const phaseCount = Object.keys(results.phaseSubmissions || {}).length;
        return phaseCount * 100;
    };

    const totalScore = calculateTotalScore();
    const maxScore = calculateMaxScore();
    const rankBadge = results.finalRank ? getRankBadge(results.finalRank) : null;
    const RankIcon = rankBadge?.icon;

    const isPublished = Boolean(
        results.certificateUrl ||
        results.finalRank ||
        (results.teamMembers || []).some(m => m.certificateUrl)
    );

    const handleDownloadCertificate = async () => {
        try {
            setDownloading(true);
            
            // Determine the correct participant name to use
            let participantNameForCertificate;
            
            if (results.asTeam) {
                // For team applications, find the current user's team member entry
                const currentUserEmail = user?.email;
                const currentTeamMember = results.teamMembers?.find(
                    member => member.email === currentUserEmail
                );
                
                if (currentTeamMember) {
                    // Use certificateName if set by industry, otherwise use member's actual name
                    participantNameForCertificate = currentTeamMember.certificateName || currentTeamMember.name;
                    console.log('=== [TEAM MEMBER] Using individual name for certificate ===');
                    console.log('Team member:', currentTeamMember.name);
                    console.log('Certificate name:', participantNameForCertificate);
                } else {
                    // Fallback: If team member not found, use team name
                    participantNameForCertificate = results.teamName;
                    console.warn('Current user not found in team members, using team name');
                }
            } else {
                // For individual applications
                participantNameForCertificate = results.individualName || 
                    (results.teamMembers && results.teamMembers.length > 0 ? results.teamMembers[0].name : 'Participant');
            }
            
            const certificateData = {
                participantName: participantNameForCertificate,
                hackathonTitle: results.hackathonTitle || results.title || 'Hackathon',
                company: results.company || results.organizer || 'Organizer',
                rank: results.finalRank,
                rankTitle: results.rankTitle,
                certificateType: results.certificateType,
                isTeam: results.asTeam,
                teamName: results.teamName,
                // ONLY use backend data - NO localStorage fallback
                templateStyle: results.certificateTemplateId || 'template1',
                logoUrl: results.certificateLogoUrl,
                platformLogoUrl: results.certificatePlatformLogoUrl,
                customMessage: results.certificateCustomMessage,
                signerLeft: null,
                signerRight: null,
                signatureLeftUrl: results.certificateSignatureLeftUrl,
                signatureRightUrl: results.certificateSignatureRightUrl,
                date: new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                certificateCode: results.certificateCode || generateCertificateCode()
            };

            console.log('=== [DOWNLOAD] Certificate Data Being Used ===');
            console.log(certificateData);

            await downloadCertificate(certificateData);
        } catch (e) {
            console.error('Download certificate failed', e);
            toast.error('Could not generate certificate');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
            {/* Confetti Celebration Overlay - Only for 1st Place Winners */}
            {showCelebration && (
                <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
                    {/* Confetti pieces */}
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: '-10%',
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${3 + Math.random() * 2}s`,
                            }}
                        >
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{
                                    backgroundColor: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][Math.floor(Math.random() * 6)],
                                    transform: `rotate(${Math.random() * 360}deg)`,
                                }}
                            />
                        </div>
                    ))}

                    {/* Celebration Message */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-md mx-4 animate-bounce-in">
                            <div className="text-center">
                                <div className="text-6xl mb-4 animate-pulse">🎉</div>
                                <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 mb-2">
                                    CONGRATULATIONS!
                                </h2>
                                <p className="text-2xl font-bold text-gray-800 mb-2">🏆 1st Place Winner! 🏆</p>
                                <p className="text-lg text-gray-600">You're a Champion!</p>
                                <div className="mt-4 flex justify-center gap-2">
                                    <span className="text-3xl animate-bounce" style={{ animationDelay: '0s' }}>⭐</span>
                                    <span className="text-3xl animate-bounce" style={{ animationDelay: '0.1s' }}>🌟</span>
                                    <span className="text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes confetti {
                    0% {
                        transform: translateY(0) rotateZ(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotateZ(720deg);
                        opacity: 0;
                    }
                }
                
                @keyframes bounce-in {
                    0% {
                        transform: scale(0) rotate(-180deg);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.2) rotate(10deg);
                    }
                    100% {
                        transform: scale(1) rotate(0deg);
                        opacity: 1;
                    }
                }
                
                .animate-confetti {
                    animation: confetti linear forwards;
                }
                
                .animate-bounce-in {
                    animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }
            `}</style>

            <div className="max-w-5xl mx-auto">
                {/* Header with Rank */}
                {isPublished && rankBadge ? (
                    <div className={`bg-gradient-to-r ${rankBadge.gradient} rounded-2xl shadow-2xl overflow-hidden mb-8 transform hover:scale-105 transition-transform duration-300`}>
                        <div className="p-8 text-center text-white">
                            <div className="flex justify-center mb-4">
                                <div className="bg-white/20 backdrop-blur-sm rounded-full p-6">
                                    <RankIcon className="w-20 h-20" />
                                </div>
                            </div>
                            <h1 className="text-4xl font-bold mb-2">Congratulations!</h1>
                            <p className="text-2xl font-semibold">{rankBadge.label}</p>
                            <div className="mt-4 flex items-center justify-center gap-2">
                                <Star className="w-6 h-6 fill-current" />
                                <span className="text-xl">Total Score: {totalScore?.toFixed(2) || 0}/{maxScore}</span>
                                <Star className="w-6 h-6 fill-current" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-200">
                        <div className="text-center">
                            <div className="flex justify-center mb-4">
                                <div className="bg-purple-100 rounded-full p-6">
                                    <CheckCircle className="w-16 h-16 text-purple-600" />
                                </div>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {isPublished ? 'Hackathon Completed!' : 'Your Submissions Summary'}
                            </h1>
                            <p className="text-lg text-gray-600">
                                {isPublished
                                    ? 'Thank you for participating'
                                    : 'Official results are not published yet. Here is your phase performance.'}
                            </p>
                            <div className="mt-4">
                                <span className="text-2xl font-bold text-purple-600">
                                    {isPublished ? 'Total Score' : 'Your current score'}: {totalScore?.toFixed(2) || 0}/{maxScore}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Phase-wise Performance */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-purple-600" />
                        Phase-wise Performance
                    </h2>
                    <div className="space-y-4">
                        {Object.entries(results.phaseSubmissions || {}).map(([phaseId, submission], index) => (
                            <div key={phaseId} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <h3 className="font-semibold text-gray-900">Phase {index + 1}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {submission.status === 'ACCEPTED' && (
                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                                                <CheckCircle className="w-4 h-4" />
                                                Accepted
                                            </span>
                                        )}
                                        {submission.status === 'PENDING' && (
                                            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                Pending
                                            </span>
                                        )}
                                        {submission.status === 'REJECTED' && (
                                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                                                Rejected
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Score</p>
                                        <p className="text-2xl font-bold text-purple-600">
                                            {submission.score !== null && submission.score !== undefined ? `${submission.score}/100` : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Submitted</p>
                                        <p className="text-sm text-gray-700">
                                            {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {submission.remarks && (
                                    <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm font-medium text-gray-700 mb-1">Reviewer's Remarks:</p>
                                        <p className="text-sm text-gray-600">{submission.remarks}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rejected Status Warning */}
                {results.status === 'REJECTED' && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center mb-8">
                        <div className="text-red-600 text-xl font-bold mb-2">❌ Application Not Accepted</div>
                        <p className="text-red-700">Your application was not accepted for this hackathon. Certificates are only issued to active participants.</p>
                    </div>
                )}

                {/* Certificate Download/Preview - regenerated with latest template - ONLY for non-rejected */}
                {isPublished && results.status !== 'REJECTED' && (
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold mb-2">Your Certificate is Ready!</h3>
                                <p className="text-purple-100">Download with the latest published template</p>
                            </div>
                            <button
                                onClick={handleDownloadCertificate}
                                disabled={downloading}
                                className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center gap-2 disabled:opacity-60"
                            >
                                <Download className="w-5 h-5" />
                                {downloading ? 'Generating...' : 'Download'}
                            </button>
                        </div>
                        <div className="bg-white rounded-lg p-4 overflow-hidden">
                            <div style={{ 
                                width: '100%',
                                maxWidth: '1122px',
                                margin: '0 auto',
                                aspectRatio: '1122/794',
                                position: 'relative'
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
                                        participantName={results.asTeam ? results.teamName : (results.individualName || (results.teamMembers && results.teamMembers.length > 0 ? results.teamMembers[0].name : 'Participant'))}
                                        hackathonTitle={results.hackathonTitle || results.title || 'Hackathon'}
                                        company={results.company || results.organizer || 'Organizer'}
                                        rank={results.finalRank}
                                        rankTitle={results.rankTitle}
                                        certificateType={results.certificateType}
                                        isTeam={results.asTeam}
                                        teamName={results.teamName}
                                        // ONLY use backend data - NO localStorage fallback
                                        templateStyle={results.certificateTemplateId || 'template1'}
                                        logoUrl={results.certificateLogoUrl}
                                        platformLogoUrl={results.certificatePlatformLogoUrl}
                                        customMessage={results.certificateCustomMessage}
                                        signerLeft={null}
                                        signerRight={null}
                                        signatureLeftUrl={results.certificateSignatureLeftUrl}
                                        signatureRightUrl={results.certificateSignatureRightUrl}
                                        date={new Date().toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                        certificateCode={results.certificateCode || generateCertificateCode()}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Showcase Content (if winner) */}
                {isPublished && results.showcaseContent && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mt-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Winning Solution</h2>
                        <div className="prose max-w-none">
                            <h3 className="text-xl font-semibold text-purple-600">{results.showcaseContent.title}</h3>
                            <p className="text-gray-700 mt-2">{results.showcaseContent.description}</p>
                            {results.showcaseContent.innovationHighlights && (
                                <div className="mt-4 bg-purple-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-purple-900 mb-2">Innovation Highlights:</h4>
                                    <p className="text-gray-700">{results.showcaseContent.innovationHighlights}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Back Button */}
                <div className="mt-8 text-center">
                    <button
                        onClick={() => navigate('/browse-hackathons')}
                        className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                        ← Back to Hackathons
                    </button>
                </div>
            </div>
        </div>
    );
}

