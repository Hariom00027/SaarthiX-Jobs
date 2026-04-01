import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getMyHackathons, getAllHackathons, deleteHackathon, getHackathonApplicants, toggleHackathonStatus, getHackathonApplications } from '../api/jobApi';

export default function IndustryHackathons() {
  const navigate = useNavigate();
  const { isAuthenticated, isIndustry, loading: authLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-hackathons');
  const [myHackathons, setMyHackathons] = useState([]);
  const [allHackathons, setAllHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hackathonToDelete, setHackathonToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedHackathonId, setExpandedHackathonId] = useState(null);
  const [selectedHackathon, setSelectedHackathon] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [applicantCounts, setApplicantCounts] = useState({}); // { hackathonId: count }

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isIndustry) {
        navigate('/');
        return;
      }
      if (isAuthenticated && isIndustry) {
        loadHackathons();
      }
    }
  }, [isAuthenticated, isIndustry, authLoading, navigate]);

  const loadHackathons = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading hackathons for industry user...');
      
      const [myHackathonsData, allHackathonsData] = await Promise.all([
        getMyHackathons(),
        getAllHackathons()
      ]);
      
      console.log('My Hackathons fetched:', myHackathonsData);
      console.log('All Hackathons fetched:', allHackathonsData);
      
      if (!Array.isArray(myHackathonsData)) {
        console.error('Invalid my hackathons response format');
        setMyHackathons([]);
      } else {
        setMyHackathons(myHackathonsData);
        // Load applicant counts for owned hackathons
        loadApplicantCounts(myHackathonsData);
      }

      if (!Array.isArray(allHackathonsData)) {
        console.error('Invalid all hackathons response format');
        setAllHackathons([]);
      } else {
        setAllHackathons(allHackathonsData);
      }
      
      console.log('Hackathons set to state - My: ', myHackathonsData?.length || 0, ' All: ', allHackathonsData?.length || 0);
    } catch (err) {
      console.error('Error loading hackathons:', err);
      console.error('Error details:', err.response?.data, err.message);
      let errorMessage = 'Failed to load hackathons';
      
      if (err.response) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (err.response.status === 403) {
          errorMessage = 'Access denied. Only INDUSTRY users can view their hackathons.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadApplicantCounts = async (hackathons) => {
    if (!user || !isIndustry) return;
    
    const counts = {};
    // Load counts for all hackathons in "My Hackathons" (they're all owned by the user)
    const promises = hackathons.map(async (hackathon) => {
      try {
        const applications = await getHackathonApplications(hackathon.id);
        counts[hackathon.id] = Array.isArray(applications) ? applications.length : 0;
      } catch (err) {
        console.error(`Error loading applicants for hackathon ${hackathon.id}:`, err);
        counts[hackathon.id] = 0;
      }
    });
    
    await Promise.all(promises);
    setApplicantCounts(counts);
  };

  const handleDeleteClick = (hackathon) => {
    setHackathonToDelete(hackathon);
  };

  const handleConfirmDelete = async () => {
    if (!hackathonToDelete) return;

    setIsDeleting(true);
    try {
      await deleteHackathon(hackathonToDelete.id);
      toast.success('Hackathon deleted successfully', {
        position: "top-right",
        autoClose: 3000,
      });
      
      await loadHackathons();
      setHackathonToDelete(null);
    } catch (err) {
      console.error('Error deleting hackathon:', err);
      let errorMessage = 'Failed to delete hackathon';
      if (err.response) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
      }
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (hackathon) => {
    navigate('/edit-hackathon', { state: { hackathonId: hackathon.id } });
  };

  const handleCreateNewHackathon = () => {
    navigate('/create-hackathon');
  };

  const handleViewApplicants = async (hackathon) => {
    // Navigate to the industry hackathon dashboard
    navigate(`/industry/hackathon/${hackathon.id}/dashboard`);
  };

  const handleToggleStatus = async (hackathon) => {
    try {
      const updated = await toggleHackathonStatus(hackathon.id);
      toast.success(`Hackathon ${updated.enabled ? 'enabled' : 'disabled'} successfully`, {
        position: "top-right",
        autoClose: 3000,
      });
      await loadHackathons();
    } catch (err) {
      console.error('Error toggling status:', err);
      toast.error('Failed to toggle hackathon status', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  // Get hackathons based on active tab
  const displayHackathons = activeTab === 'my-hackathons' ? myHackathons : allHackathons;

  // Filter hackathons based on search
  const filteredHackathons = displayHackathons.filter(hackathon => {
    const query = searchQuery.toLowerCase();
    return (
      hackathon.title?.toLowerCase().includes(query) ||
      hackathon.company?.toLowerCase().includes(query) ||
      hackathon.description?.toLowerCase().includes(query)
    );
  });

  const formatDateRange = (startDate, endDate) => {
    const format = (value) => {
      if (!value) return '';
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };
    const start = format(startDate);
    const end = format(endDate);
    if (start && end) return `${start} - ${end}`;
    return start || end || 'TBD';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900"></div>
          <p className="mt-4 text-gray-600 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isIndustry) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white px-6 py-6">
      <div className="mx-auto w-full max-w-[1360px]">
        <div className="mb-4 flex items-center gap-2">
          <button className="flex h-[41px] items-center gap-2 rounded-[6px] border border-black bg-white px-4 text-[14px] font-medium text-[#0F1724]">
            <span className="text-[16px]">👥</span> Candidates
          </button>
          <button className="flex h-[41px] items-center gap-2 rounded-[6px] border border-black bg-white px-4 text-[14px] font-medium text-[#0F1724]">
            <span className="text-[16px]">⚙</span> Settings
          </button>
          <button className="flex h-[41px] items-center gap-2 rounded-[6px] border border-black bg-white px-4 text-[14px] font-medium text-[#0F1724]">
            <span className="text-[16px]">✉</span> Messages
          </button>
        </div>

        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-[62px] w-[62px] items-center justify-center rounded-[10px] border border-black bg-white">
              <svg className="h-8 w-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-[42px] font-bold leading-[1.1] tracking-[-0.5px] text-[#0F1724]">Hackathons Dashboard</h1>
              <p className="mt-1 text-[15px] text-black/75">
                Manage, track and improve your hackathons from one place. Post new challenges and track participation and find top talent with ease.
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateNewHackathon}
            className="mt-2 h-[39px] rounded-[10px] bg-[#3170A5] px-6 text-[20px] font-medium text-white"
          >
            Post a New Job
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-5 text-red-700 text-sm font-medium">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold mb-1">Error Loading Hackathons</p>
                <p>{error}</p>
                <button
                  onClick={loadHackathons}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,950px)_340px]">
          <div>
            <div className="mb-4 border-b border-black/10">
              <div className="flex gap-10">
                <button
                  onClick={() => {
                    setActiveTab('my-hackathons');
                    setSearchQuery('');
                  }}
                  className={`pb-3 text-left ${
                    activeTab === 'my-hackathons' ? 'border-b-2 border-[#3170A5]' : 'border-b-2 border-transparent'
                  }`}
                >
                  <div className="text-[14px] font-semibold text-[#0F1724]">My Hackathons ({myHackathons.length})</div>
                  <div className="text-[12px] text-black/70">Your created hackathons</div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('all-hackathons');
                    setSearchQuery('');
                  }}
                  className={`pb-3 text-left ${
                    activeTab === 'all-hackathons' ? 'border-b-2 border-[#3170A5]' : 'border-b-2 border-transparent'
                  }`}
                >
                  <div className="text-[14px] font-medium text-black/80">All Hackathons ({allHackathons.length})</div>
                  <div className="text-[12px] text-black/70">Browse all hackathons</div>
                </button>
              </div>
            </div>

            {displayHackathons.length > 0 && (
              <div className="mb-6">
                <div className="relative h-[42px] rounded-[6px] border border-black/80 bg-white px-4">
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-black/80">🔍</div>
                  <input
                    type="text"
                    placeholder="Search by title, skills, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-full w-full bg-transparent pl-8 pr-3 text-[14px] text-black/80 outline-none placeholder:text-black/60"
                  />
                </div>
              </div>
            )}

            {displayHackathons.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <div className="mb-4 text-5xl">⚡</div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  {activeTab === 'my-hackathons' ? 'No Hackathons Posted Yet' : 'No Hackathons Available'}
                </h3>
                <p className="mb-6 text-base text-gray-600">
                  {activeTab === 'my-hackathons'
                    ? 'Get started by posting your first hackathon'
                    : 'No hackathons have been posted yet'}
                </p>
                {activeTab === 'my-hackathons' && (
                  <button
                    onClick={handleCreateNewHackathon}
                    className="rounded-lg bg-[#3170A5] px-6 py-3 text-sm font-semibold text-white"
                  >
                    Post Your First Hackathon
                  </button>
                )}
              </div>
            ) : filteredHackathons.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <p className="text-base text-gray-600">No hackathons match your search criteria</p>
              </div>
            ) : (
              <div className="overflow-y-auto pr-2 lg:h-[656px]">
                <div className="space-y-6">
                {filteredHackathons.map((hackathon) => (
                  <div key={hackathon.id} className="rounded-[8px] border border-black/50 bg-white px-6 py-5">
                    {(() => {
                      const isExpanded = expandedHackathonId === hackathon.id;
                      return (
                        <>
                    <div className="mb-5 flex items-start justify-between">
                      <div>
                        <h3 className="text-[32px] font-semibold leading-none text-[#0F1724]">{hackathon.title || 'Hackathon Title'}</h3>
                        {isExpanded ? (
                          <p className="mt-2 text-[14px] text-[#94A3B8]">{hackathon.description || 'Short description'}</p>
                        ) : (
                          <p className="mt-2 text-[14px] text-[#94A3B8]">Click view to see full details</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-2 rounded-[12px] px-3 py-1 text-[12px] font-medium ${
                        hackathon.enabled ? 'bg-[#91F2B5] text-[#15614B]' : 'bg-[#E0F2FE] text-[#3170A5]'
                      }`}>
                        <span className={`h-2 w-2 rounded-full ${hackathon.enabled ? 'bg-[#22C55E]' : 'bg-[#0284C7]'}`} />
                        {hackathon.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="mb-4 grid grid-cols-1 gap-3 text-[13px] text-black/75 md:grid-cols-3">
                        <div>{hackathon.mode || 'Online'}</div>
                        <div>{formatDateRange(hackathon.startDate, hackathon.endDate)}</div>
                        <div>{applicantCounts[hackathon.id] ?? 0} Applicants</div>
                      </div>
                    )}

                    {activeTab === 'my-hackathons' && (
                      <div className="flex items-center justify-between border-t border-black/30 pt-3">
                        <button
                          onClick={() => handleViewApplicants(hackathon)}
                          className="h-[32px] rounded-[6px] bg-[#3170A5] px-4 text-[14px] font-semibold text-white"
                        >
                          Manage
                        </button>
                        <div className="flex items-center gap-4 text-[13px]">
                          <button
                            onClick={() => setExpandedHackathonId(isExpanded ? null : hackathon.id)}
                            className="text-[#3170A5] hover:text-[#25557d] font-medium"
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                          <button onClick={() => handleEditClick(hackathon)} className="text-black/75 hover:text-black">
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatus(hackathon)}
                            className={hackathon.enabled ? 'text-[#9A0B14]/75 hover:text-[#9A0B14]' : 'text-[#15614B] hover:text-[#0f4435]'}
                          >
                            {hackathon.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button onClick={() => handleDeleteClick(hackathon)} className="rounded-[6px] bg-[#3170A5] px-3 py-1.5 text-white">
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                    {activeTab !== 'my-hackathons' && (
                      <div className="flex items-center justify-end border-t border-black/30 pt-3">
                        <button
                          onClick={() => setExpandedHackathonId(isExpanded ? null : hackathon.id)}
                          className="rounded-[6px] border border-[#3170A5] px-3 py-1.5 text-[13px] font-medium text-[#3170A5]"
                        >
                          {isExpanded ? 'Hide' : 'View'}
                        </button>
                      </div>
                    )}
                        </>
                      );
                    })()}
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[8px] border border-black/25 bg-white p-6 shadow-[0px_4px_4px_rgba(0,0,0,0.25)]">
              <h3 className="mb-5 text-[16px] font-semibold text-[#0F1724]">How It Works</h3>
              <div className="relative space-y-5">
                <div className="absolute left-[11px] top-3 bottom-3 w-[2px] bg-black/50" />
                {[
                  ['1', 'Create a Hackathon', 'Post challenge, timeline, requirements'],
                  ['2', 'Get Applications', 'Teams get to register and submit their project'],
                  ['3', 'Evaluate Submissions', 'Review submission of the teams and shortlist best candidates'],
                  ['4', 'Connect & Hire', 'Network with the high performers to explore future potential'],
                ].map(([n, title, desc]) => (
                  <div key={n} className="relative z-10 flex items-start gap-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3170A5] text-[12px] font-semibold text-white">{n}</div>
                    <div>
                      <div className="text-[14px] font-semibold text-[#0F1724]">{title}</div>
                      <div className="text-[13px] leading-[18px] text-black/75">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[8px] border border-black/25 bg-white p-6">
              <h3 className="mb-5 text-[16px] font-semibold text-[#0F1724]">Why Hackathons?</h3>
              <div className="space-y-3 text-[13px] text-black">
                <div className="flex items-start gap-3"><span className="text-[#3170A5]">◎</span><span>Find talent in solving the real life problems</span></div>
                <div className="flex items-start gap-3"><span className="text-[#3170A5]">◎</span><span>Evaluate skills outside of resumes</span></div>
                <div className="flex items-start gap-3"><span className="text-[#3170A5]">◎</span><span>Build your brand with students and developers</span></div>
                <div className="flex items-start gap-3"><span className="text-[#3170A5]">◎</span><span>Reach to the large number of candidates</span></div>
              </div>
            </div>
          </div>
        </div>
        {/* Applicants Modal */}
        {showApplicantsModal && selectedHackathon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 animate-slideIn max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Hackathon Submissions</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedHackathon.title}</p>
                </div>
                <button
                  onClick={() => setShowApplicantsModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {loadingApplicants ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 mb-4"></div>
                      <p className="text-gray-600 text-sm font-medium">Loading applicants...</p>
                    </div>
                  </div>
                ) : applicants.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-gray-600 font-medium">No submissions yet</p>
                    <p className="text-gray-500 text-sm">Submissions will appear here when participants apply and submit their work</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applicants.map((applicant) => (
                      <div key={applicant.id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            {applicant.asTeam ? (
                              <>
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                                  {applicant.teamName}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">Team Size: {applicant.teamSize} members</p>
                              </>
                            ) : (
                              <>
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                                  Individual Application
                                </h4>
                              </>
                            )}
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {new Date(applicant.appliedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {applicant.asTeam && applicant.teamMembers && applicant.teamMembers.length > 0 && (
                          <div className="mt-2 text-xs">
                            <p className="text-gray-600 font-medium mb-1">Team Members: {applicant.teamMembers.length}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {hackathonToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 animate-slideIn">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Delete Hackathon</h2>
                    <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-900 mb-1">{hackathonToDelete.title}</p>
                  <p className="text-xs text-gray-600">{hackathonToDelete.company}</p>
                </div>

                <p className="text-sm text-gray-700 mb-6">
                  Are you sure you want to delete this hackathon? This will remove it from public view and cannot be restored.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="flex-1 rounded-md bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 px-6 transition-colors duration-200 disabled:cursor-not-allowed text-sm"
                  >
                    {isDeleting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Deleting...
                      </span>
                    ) : (
                      "Delete Hackathon"
                    )}
                  </button>
                  <button
                    onClick={() => setHackathonToDelete(null)}
                    disabled={isDeleting}
                    className="flex-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-900 font-semibold py-2.5 px-6 transition-colors duration-200 disabled:cursor-not-allowed text-sm"
                  >
                    Cancel
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

