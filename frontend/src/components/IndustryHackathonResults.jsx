import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHackathonResults, publishShowcaseContent, deleteHackathonApplication, getHackathonById } from '../api/jobApi';
import { toast } from 'react-toastify';
import { Trophy, Medal, Award, Users, Star, Upload, X, Lock, ShieldCheck } from 'lucide-react';

export default function IndustryHackathonResults() {
    const { hackathonId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState([]);
    const [hackathon, setHackathon] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [showcaseModal, setShowcaseModal] = useState(null);
    const [showcaseData, setShowcaseData] = useState({
        title: '',
        description: '',
        innovationHighlights: ''
    });
    const [selectedRanks, setSelectedRanks] = useState({
        1: null,  // 1st place application ID
        2: null,  // 2nd place application ID
        3: null   // 3rd place application ID
    });
    const [resultsLocked, setResultsLocked] = useState(false);

    useEffect(() => {
        loadResults();
    }, [hackathonId]);

    // Auto-populate showcase data when modal opens
    useEffect(() => {
        if (showcaseModal) {
            // Auto-populate title with team/candidate name
            const defaultTitle = showcaseModal.asTeam 
                ? `${showcaseModal.teamName || 'Team'}'s Winning Solution`
                : `${showcaseModal.individualName || 'Candidate'}'s Winning Solution`;
            
            // Auto-populate description if not already set
            const defaultDescription = showcaseModal.showcaseContent?.description || '';
            
            // Auto-populate innovation highlights if not already set
            const defaultHighlights = showcaseModal.showcaseContent?.innovationHighlights || '';
            
            setShowcaseData(prev => ({
                title: prev.title || defaultTitle,
                description: prev.description || defaultDescription,
                innovationHighlights: prev.innovationHighlights || defaultHighlights
            }));
        } else {
            // Reset when modal closes
            setShowcaseData({ title: '', description: '', innovationHighlights: '' });
        }
    }, [showcaseModal]);

    const loadResults = async () => {
        try {
            setLoading(true);
            const [data, hackData] = await Promise.all([
                getHackathonResults(hackathonId),
                getHackathonById(hackathonId)
            ]);
            if (Array.isArray(data)) {
                setResults(data);
            } else {
                console.warn('Unexpected results payload', data);
                setResults([]);
                setLoadError('Could not load results. Please try again.');
            }
            setHackathon(hackData);
        } catch (error) {
            console.error('Error loading results:', error);
            toast.error('Failed to load results');
            setLoadError('Failed to load results');
        } finally {
            setLoading(false);
        }
    };

    const handleRankSelection = (rank, applicationId) => {
        if (!resultsLocked && !hasRankings) {
            toast.warning('Please lock results first after reviewing all solutions.');
            return;
        }
        setSelectedRanks(prev => ({
            ...prev,
            [rank]: applicationId || null
        }));
    };

    const handleOpenCertificatePage = async () => {
        if (!resultsLocked && !hasRankings) {
            toast.error('Please lock results first.');
            return;
        }
        const hasAnySelection = selectedRanks[1] || selectedRanks[2] || selectedRanks[3];
        if (!hasAnySelection) {
            toast.error('Please select at least one winner');
            return;
        }
        navigate(`/industry/hackathon/${hackathonId}/publish-certificates`, {
            state: { selectedRanks }
        });
    };

    const handlePublishShowcase = async (applicationId) => {
        try {
            await publishShowcaseContent(applicationId, showcaseData);
            toast.success('Showcase content published successfully!');
            setShowcaseModal(null);
            setShowcaseData({ title: '', description: '', innovationHighlights: '' });
            await loadResults();
        } catch (error) {
            console.error('Error publishing showcase:', error);
            toast.error(error.response?.data || 'Failed to publish showcase');
        }
    };

    const handleDeleteApplication = async (applicationId) => {
        if (!window.confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
            return;
        }

        try {
            await deleteHackathonApplication(applicationId);
            toast.success('Application deleted successfully');
            await loadResults();
        } catch (error) {
            console.error('Error deleting application:', error);
            toast.error(error.response?.data || 'Failed to delete application');
        }
    };

    const getRankBadge = (rank) => {
        if (rank === 1) {
            return { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50', label: '🥇 1st Place' };
        } else if (rank === 2) {
            return { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-50', label: '🥈 2nd Place' };
        } else if (rank === 3) {
            return { icon: Award, color: 'text-orange-600', bg: 'bg-orange-50', label: '🥉 3rd Place' };
        }
        return null;
    };

    // Helper to calculate total score from phase submissions
    const getTotalScore = (result) => {
        if (result.totalScore !== null && result.totalScore !== undefined) {
            return result.totalScore;
        }

        // Calculate from phase submissions
        let total = 0;
        Object.values(result.phaseSubmissions || {}).forEach(submission => {
            if (submission.score !== null && submission.score !== undefined) {
                total += submission.score;
            }
        });
        return total;
    };

    const renderPhaseBadges = (result) => {
        if (!hackathon?.phases?.length) {
            return <span className="text-xs text-gray-400">No phase data</span>;
        }

        return (
            <div className="flex flex-wrap gap-1">
                {hackathon.phases.map((phase, idx) => {
                    const submission = result.phaseSubmissions?.[phase.id];
                    const status = submission?.status;
                    const score = submission?.score;
                    const badgeClass = status === 'ACCEPTED'
                        ? 'bg-green-100 text-green-700'
                        : status === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700';

                    const label = score !== null && score !== undefined
                        ? `${score}/100`
                        : status || 'N/A';

                    return (
                        <span key={phase.id} className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                            P{idx + 1}: {label}
                        </span>
                    );
                })}
            </div>
        );
    };

    const hasRankings = results.some(r => r.finalRank);
    const phaseIds = (hackathon?.phases || []).map((phase) => phase.id);

    const hasAnySubmittedSolution = (application) => {
        const submissions = application?.phaseSubmissions || {};
        return Object.values(submissions).some((submission) => (
            !!submission && (
                !!submission.submittedAt ||
                !!submission.solutionStatement ||
                !!submission.submissionLink ||
                !!submission.fileName
            )
        ));
    };

    const isApplicationFullyReviewed = (application) => {
        if (!application || application.status === 'REJECTED') {
            return true;
        }

        if (!hasAnySubmittedSolution(application)) {
            return false;
        }

        const submissions = application.phaseSubmissions || {};
        if (phaseIds.length === 0) {
            return Object.values(submissions).some((submission) =>
                submission?.status === 'ACCEPTED' || submission?.status === 'REJECTED'
            );
        }

        return phaseIds.every((phaseId) => {
            const status = submissions?.[phaseId]?.status;
            return status === 'ACCEPTED' || status === 'REJECTED';
        });
    };

    const reviewCandidates = results.filter((application) => application?.status !== 'REJECTED');
    const reviewedCount = reviewCandidates.filter(isApplicationFullyReviewed).length;
    const canLockResults = reviewCandidates.length > 0 && reviewedCount === reviewCandidates.length;

    const winnerEligibleResults = results.filter((application) =>
        application?.status !== 'REJECTED' &&
        hasAnySubmittedSolution(application) &&
        isApplicationFullyReviewed(application)
    );

    const lockStorageKey = `hackathon-results-locked-${hackathonId}`;

    useEffect(() => {
        const persistedLock = localStorage.getItem(lockStorageKey) === 'true';
        if (hasRankings) {
            setResultsLocked(true);
            return;
        }
        if (persistedLock && canLockResults) {
            setResultsLocked(true);
            return;
        }
        if (!canLockResults) {
            setResultsLocked(false);
            localStorage.removeItem(lockStorageKey);
        }
    }, [canLockResults, hasRankings, lockStorageKey]);

    const handleLockResults = () => {
        if (!canLockResults) {
            toast.error('Please complete review of all submitted solutions before locking results.');
            return;
        }
        setResultsLocked(true);
        localStorage.setItem(lockStorageKey, 'true');
        toast.success('Results locked. You can now select winners and publish certificates.');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-md w-full text-center">
                    <p className="text-lg font-semibold text-gray-900 mb-2">Unable to load results</p>
                    <p className="text-sm text-gray-600 mb-4">{loadError}</p>
                    <button
                        onClick={loadResults}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Hackathon Results</h1>
                            <p className="text-gray-600 mt-1">Total Participants: {results.length}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {!hasRankings && results.length > 0 && (
                                <div className="text-sm text-gray-500">
                                    Select winners below to finalize results
                                </div>
                            )}
                            <button
                                onClick={() => navigate(`/industry/hackathon/${hackathonId}/dashboard`)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>

                {!hasRankings && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-3">Result Lock</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Review status: <span className="font-semibold text-gray-900">{reviewedCount}/{reviewCandidates.length}</span> submissions fully checked.
                            Winner selection is enabled only after locking results.
                        </p>
                        <div className={`rounded-xl border p-4 mb-4 ${canLockResults ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                            <div className="flex items-center gap-2">
                                {canLockResults ? (
                                    <ShieldCheck className="w-5 h-5 text-green-600" />
                                ) : (
                                    <Lock className="w-5 h-5 text-amber-600" />
                                )}
                                <span className={`text-sm font-semibold ${canLockResults ? 'text-green-900' : 'text-amber-900'}`}>
                                    {canLockResults
                                        ? 'All solutions are reviewed. You can lock results now.'
                                        : 'Lock will appear once all participant solutions are reviewed.'}
                                </span>
                            </div>
                        </div>

                        {!resultsLocked && canLockResults && (
                            <button
                                onClick={handleLockResults}
                                className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Lock className="w-4 h-4" />
                                Lock Result Now
                            </button>
                        )}

                        {resultsLocked && (
                            <div className="w-full bg-green-100 text-green-800 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                                <ShieldCheck className="w-4 h-4" />
                                Results Locked - Winner Selection Enabled
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Rank Selection (if not finalized) */}
                {!hasRankings && results.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Select Winners</h2>
                        <p className="text-gray-600 mb-6">
                            Choose the top 3 performers from reviewed submissions only.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            {/* 1st Place */}
                            <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
                                <div className="flex items-center gap-2 mb-3">
                                    <Trophy className="w-6 h-6 text-yellow-500" />
                                    <h3 className="font-bold text-yellow-900">1st Place</h3>
                                </div>
                                <select
                                    value={selectedRanks[1] || ''}
                                    onChange={(e) => handleRankSelection(1, e.target.value)}
                                    className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white"
                                    disabled={!resultsLocked}
                                >
                                    <option value="">Select Winner</option>
                                    {winnerEligibleResults.map(app => (
                                        <option
                                            key={app.id}
                                            value={app.id}
                                            disabled={Object.values(selectedRanks).includes(app.id) && selectedRanks[1] !== app.id}
                                        >
                                            {app.asTeam ? app.teamName : 'Individual'} - Score: {getTotalScore(app).toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 2nd Place */}
                            <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                                <div className="flex items-center gap-2 mb-3">
                                    <Medal className="w-6 h-6 text-gray-400" />
                                    <h3 className="font-bold text-gray-700">2nd Place</h3>
                                </div>
                                <select
                                    value={selectedRanks[2] || ''}
                                    onChange={(e) => handleRankSelection(2, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white"
                                    disabled={!resultsLocked}
                                >
                                    <option value="">Select Runner Up</option>
                                    {winnerEligibleResults.map(app => (
                                        <option
                                            key={app.id}
                                            value={app.id}
                                            disabled={Object.values(selectedRanks).includes(app.id) && selectedRanks[2] !== app.id}
                                        >
                                            {app.asTeam ? app.teamName : 'Individual'} - Score: {getTotalScore(app).toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 3rd Place */}
                            <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
                                <div className="flex items-center gap-2 mb-3">
                                    <Award className="w-6 h-6 text-orange-600" />
                                    <h3 className="font-bold text-orange-900">3rd Place</h3>
                                </div>
                                <select
                                    value={selectedRanks[3] || ''}
                                    onChange={(e) => handleRankSelection(3, e.target.value)}
                                    className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                                    disabled={!resultsLocked}
                                >
                                    <option value="">Select 3rd Place</option>
                                    {winnerEligibleResults.map(app => (
                                        <option
                                            key={app.id}
                                            value={app.id}
                                            disabled={Object.values(selectedRanks).includes(app.id) && selectedRanks[3] !== app.id}
                                        >
                                            {app.asTeam ? app.teamName : 'Individual'} - Score: {getTotalScore(app).toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleOpenCertificatePage}
                            disabled={!resultsLocked || (!selectedRanks[1] && !selectedRanks[2] && !selectedRanks[3])}
                            className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            Open Certificate Generation Page
                        </button>
                    </div>
                )}

                {/* Winners Section (Top 3) */}
                {hasRankings && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-yellow-500" />
                            Top Performers
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {results.filter(r => r.finalRank && r.finalRank <= 3).map((result) => {
                                const badge = getRankBadge(result.finalRank);
                                const RankIcon = badge.icon;
                                return (
                                    <div key={result.id} className={`${badge.bg} border-2 border-${badge.color.split('-')[1]}-300 rounded-xl p-6 hover:shadow-lg transition-shadow`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <RankIcon className={`w-12 h-12 ${badge.color}`} />
                                            <span className="text-2xl font-bold">{badge.label}</span>
                                        </div>
                                        <h3 className="font-bold text-lg text-gray-900 mb-2">
                                            {result.asTeam ? result.teamName : 'Individual'}
                                        </h3>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Star className="w-5 h-5 text-purple-600" />
                                            <span className="text-xl font-semibold text-purple-600">
                                                {getTotalScore(result)?.toFixed(2) || 0}
                                            </span>
                                        </div>
                                        
                                        {/* Team/Individual Details Section */}
                                        <div className="bg-white/60 rounded-lg p-4 mb-3 border border-gray-200">
                                            <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
                                                {result.asTeam ? 'Team Details' : 'Candidate Details'}
                                            </h4>
                                            {result.asTeam ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Users className="w-4 h-4" />
                                                        <span className="font-medium">{result.teamSize || 0} members</span>
                                                    </div>
                                                    {result.teamMembers && result.teamMembers.length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            {result.teamMembers.map((member, idx) => (
                                                                <div key={idx} className="text-xs text-gray-700 bg-white/50 rounded px-2 py-1">
                                                                    <span className="font-semibold">{member.name}</span>
                                                                    {member.role && <span className="text-gray-500 ml-1">- {member.role}</span>}
                                                                    {member.email && <div className="text-gray-500 text-xs mt-0.5">{member.email}</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    {result.individualName && (
                                                        <div className="text-sm text-gray-700">
                                                            <span className="font-semibold">Name:</span> {result.individualName}
                                                        </div>
                                                    )}
                                                    {result.individualEmail && (
                                                        <div className="text-sm text-gray-700">
                                                            <span className="font-semibold">Email:</span> {result.individualEmail}
                                                        </div>
                                                    )}
                                                    {result.individualPhone && (
                                                        <div className="text-sm text-gray-700">
                                                            <span className="font-semibold">Phone:</span> {result.individualPhone}
                                                        </div>
                                                    )}
                                                    {result.individualQualifications && (
                                                        <div className="text-sm text-gray-700">
                                                            <span className="font-semibold">Qualifications:</span> {result.individualQualifications}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <button
                                            onClick={() => setShowcaseModal(result)}
                                            className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Upload className="w-4 h-4" />
                                            {result.showcaseContent ? 'Update Showcase' : 'Publish Showcase'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* All Participants */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">All Participants</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team/Individual</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Score</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phase Scores</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {results.map((result, index) => {
                                    const badge = result.finalRank ? getRankBadge(result.finalRank) : null;
                                    return (
                                        <tr key={result.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {badge ? (
                                                    <span className={`${badge.bg} ${badge.color} px-3 py-1 rounded-full text-sm font-semibold`}>
                                                        {badge.label}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-500 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {result.asTeam ? result.teamName : 'Individual'}
                                                    </div>
                                                    {result.asTeam && (
                                                        <div className="text-sm text-gray-500 flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            {result.teamSize} members
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-lg font-semibold text-purple-600">
                                                    {getTotalScore(result)?.toFixed(2) || '0.00'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {renderPhaseBadges(result)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${result.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                    result.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {result.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => navigate(`/industry/hackathon/${hackathonId}/dashboard`)}
                                                    className="text-purple-600 hover:text-purple-700 font-medium mr-4"
                                                >
                                                    View Details
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteApplication(result.id)}
                                                    className="text-red-600 hover:text-red-700 font-medium"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Back Button */}
                <div className="mt-8 text-center">
                    <button
                        onClick={() => navigate('/manage-hackathons')}
                        className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                        ← Back to Hackathons
                    </button>
                </div>
            </div>

            {/* Showcase Modal */}
            {showcaseModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                            <h3 className="text-2xl font-bold text-gray-900">Publish Showcase Content</h3>
                            <button
                                onClick={() => {
                                    setShowcaseModal(null);
                                    setShowcaseData({ title: '', description: '', innovationHighlights: '' });
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Auto-populated Team/Candidate Details */}
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <h4 className="text-sm font-bold text-purple-900 mb-3">Team/Candidate Details</h4>
                                {showcaseModal.asTeam ? (
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-xs font-semibold text-purple-700">Team Name:</span>
                                            <p className="text-sm text-purple-900 font-medium">{showcaseModal.teamName || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-purple-700">Team Size:</span>
                                            <p className="text-sm text-purple-900 font-medium">{showcaseModal.teamSize || 0} members</p>
                                        </div>
                                        {showcaseModal.teamMembers && showcaseModal.teamMembers.length > 0 && (
                                            <div>
                                                <span className="text-xs font-semibold text-purple-700">Team Members:</span>
                                                <div className="mt-1 space-y-1">
                                                    {showcaseModal.teamMembers.map((member, idx) => (
                                                        <div key={idx} className="text-sm text-purple-900 bg-white rounded px-2 py-1">
                                                            <span className="font-medium">{member.name}</span>
                                                            {member.email && <span className="text-xs text-purple-600 ml-2">({member.email})</span>}
                                                            {member.phone && <span className="text-xs text-purple-600 ml-2">- {member.phone}</span>}
                                                            {member.role && <span className="text-xs text-purple-500 ml-2">- {member.role}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-xs font-semibold text-purple-700">Name:</span>
                                            <p className="text-sm text-purple-900 font-medium">{showcaseModal.individualName || 'N/A'}</p>
                                        </div>
                                        {showcaseModal.individualEmail && (
                                            <div>
                                                <span className="text-xs font-semibold text-purple-700">Email:</span>
                                                <p className="text-sm text-purple-900 font-medium">{showcaseModal.individualEmail}</p>
                                            </div>
                                        )}
                                        {showcaseModal.individualPhone && (
                                            <div>
                                                <span className="text-xs font-semibold text-purple-700">Phone:</span>
                                                <p className="text-sm text-purple-900 font-medium">{showcaseModal.individualPhone}</p>
                                            </div>
                                        )}
                                        {showcaseModal.individualQualifications && (
                                            <div>
                                                <span className="text-xs font-semibold text-purple-700">Qualifications:</span>
                                                <p className="text-sm text-purple-900 font-medium">{showcaseModal.individualQualifications}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={showcaseData.title}
                                    onChange={(e) => setShowcaseData({ ...showcaseData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Enter showcase title"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={showcaseData.description}
                                    onChange={(e) => setShowcaseData({ ...showcaseData, description: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Describe the winning solution"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Innovation Highlights</label>
                                <textarea
                                    value={showcaseData.innovationHighlights}
                                    onChange={(e) => setShowcaseData({ ...showcaseData, innovationHighlights: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="What made this solution innovative?"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowcaseModal(null);
                                        setShowcaseData({ title: '', description: '', innovationHighlights: '' });
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handlePublishShowcase(showcaseModal.id)}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                                >
                                    Publish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
