import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CheckCircle } from 'lucide-react';
import CertificateTemplate from './CertificateGenerator';
import apiClient from '../api/apiClient';
import { finalizeHackathonResults, getHackathonById, getHackathonResults } from '../api/jobApi';

const ALLOWED_TEMPLATES = ['template1', 'template2'];

const isPngFile = (file) => {
  if (!file) return false;
  const mimeType = (file.type || '').toLowerCase();
  const fileName = (file.name || '').toLowerCase();
  return mimeType === 'image/png' || fileName.endsWith('.png');
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function IndustryCertificatePublishPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hackathonId } = useParams();

  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [results, setResults] = useState([]);
  const [hackathon, setHackathon] = useState(null);

  const [selectedRanks, setSelectedRanks] = useState({
    1: null,
    2: null,
    3: null
  });

  const [settings, setSettings] = useState({
    certificateTemplateId: 'template1',
    logoUrl: '',
    signatureLeftUrl: '',
    signatureRightUrl: '',
    signerLeftName: 'Platform Director',
    signerLeftTitle: 'SaarthiX',
    signerRightName: 'Event Organizer',
    signerRightTitle: ''
  });

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [resultData, hackathonData] = await Promise.all([
          getHackathonResults(hackathonId),
          getHackathonById(hackathonId)
        ]);
        setResults(Array.isArray(resultData) ? resultData : []);
        setHackathon(hackathonData);
        const incomingRanks = location.state?.selectedRanks || {};
        const inferredRanks = {};
        (Array.isArray(resultData) ? resultData : []).forEach((application) => {
          if (application?.finalRank >= 1 && application?.finalRank <= 3) {
            inferredRanks[application.finalRank] = application.id;
          }
        });

        const resolvedRanks = {
          1: incomingRanks[1] || inferredRanks[1] || null,
          2: incomingRanks[2] || inferredRanks[2] || null,
          3: incomingRanks[3] || inferredRanks[3] || null,
        };
        const hasResolvedRanks = resolvedRanks[1] || resolvedRanks[2] || resolvedRanks[3];
        if (!hasResolvedRanks) {
          toast.error('Please select winners on the results page first.');
          navigate(`/industry/hackathon/${hackathonId}/results`);
          return;
        }
        setSelectedRanks(resolvedRanks);
      } catch (error) {
        console.error('Error loading certificate publish page:', error);
        toast.error('Failed to load certificate publishing data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hackathonId]);

  const previewData = useMemo(() => ({
    participantName: 'Participant Name',
    teamName: 'Team Innovators',
    hackathonTitle: hackathon?.title || 'Hackathon Name',
    company: hackathon?.company || 'Organization',
    rank: 1,
    rankTitle: 'First Place',
    certificateType: 'Certificate of Achievement',
    isTeam: true,
    templateStyle: settings.certificateTemplateId,
    logoUrl: settings.logoUrl,
    signatureLeftUrl: settings.signatureLeftUrl,
    signatureRightUrl: settings.signatureRightUrl,
    signerLeft: {
      name: settings.signerLeftName || 'Platform Director',
      title: settings.signerLeftTitle || 'SaarthiX'
    },
    signerRight: {
      name: settings.signerRightName || 'Event Organizer',
      title: settings.signerRightTitle || hackathon?.company || 'Organizer'
    },
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }), [hackathon?.company, hackathon?.title, settings]);

  const handlePngUpload = async (file, targetKey, label) => {
    if (!file) {
      setSettings(prev => ({ ...prev, [targetKey]: '' }));
      return;
    }
    if (!isPngFile(file)) {
      toast.error(`${label} must be in PNG format only.`);
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setSettings(prev => ({ ...prev, [targetKey]: dataUrl }));
      toast.success(`${label} uploaded successfully.`);
    } catch (error) {
      console.error(`Error uploading ${label}:`, error);
      toast.error(`Failed to upload ${label}. Please try again.`);
    }
  };

  const handleFinalize = async () => {
    const hasAnySelection = selectedRanks[1] || selectedRanks[2] || selectedRanks[3];
    if (!hasAnySelection) {
      toast.error('Please select at least one winner.');
      return;
    }
    if (!settings.logoUrl) {
      toast.error('Please upload your organization logo in PNG format.');
      return;
    }

    const selectedCount = [selectedRanks[1], selectedRanks[2], selectedRanks[3]].filter(Boolean).length;
    if (!window.confirm(`Finalize results and publish certificates for ${selectedCount} winner(s)?`)) {
      return;
    }

    try {
      setFinalizing(true);

      for (const [rank, appId] of Object.entries(selectedRanks)) {
        if (!appId) continue;
        const response = await apiClient.patch(`/hackathon-applications/${appId}`, {
          finalRank: parseInt(rank, 10)
        });
        console.log('Updated winner rank:', response.data?.id, rank);
      }

      await finalizeHackathonResults(hackathonId, settings);
      toast.success('Certificates published successfully.');
      navigate(`/industry/hackathon/${hackathonId}/results`);
    } catch (error) {
      console.error('Error finalizing and publishing certificates:', error);
      toast.error(error.response?.data?.message || error.response?.data || 'Failed to publish certificates.');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Publish Certificates</h1>
              <p className="text-gray-600 mt-1">
                Winners are already selected. Choose one template, upload PNG logo/signatures, then publish certificates.
              </p>
            </div>
            <button
              onClick={() => navigate(`/industry/hackathon/${hackathonId}/results`)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Back to Results
            </button>
          </div>
          <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-4">
            Top 3 winners receive heading <span className="font-semibold">Certificate of Achievement</span>; all others receive <span className="font-semibold">Certificate of Participation</span>.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Choose Certificate Template</h2>
          <p className="text-sm text-gray-600 mb-5">
            First row contains two square preview cards. Select one template to apply to all published certificates.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ALLOWED_TEMPLATES.map(templateId => (
              <button
                key={templateId}
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, certificateTemplateId: templateId }))}
                className={`text-left rounded-xl border-2 transition overflow-hidden ${
                  settings.certificateTemplateId === templateId
                    ? 'border-purple-600 ring-2 ring-purple-100'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{templateId === 'template1' ? 'Template 1' : 'Template 2'}</span>
                  {settings.certificateTemplateId === templateId && (
                    <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-full">Selected</span>
                  )}
                </div>
                <div className="aspect-square bg-white p-3 overflow-hidden flex items-center justify-center">
                  <div style={{ transform: 'scale(0.33)', transformOrigin: 'center center', width: '1122px', height: '794px' }}>
                    <CertificateTemplate
                      participantName={previewData.participantName}
                      teamName={previewData.teamName}
                      hackathonTitle={previewData.hackathonTitle}
                      company={previewData.company}
                      rank={previewData.rank}
                      rankTitle={previewData.rankTitle}
                      certificateType={previewData.certificateType}
                      isTeam={previewData.isTeam}
                      templateStyle={templateId}
                      logoUrl={previewData.logoUrl}
                      signatureLeftUrl={previewData.signatureLeftUrl}
                      signatureRightUrl={previewData.signatureRightUrl}
                      signerLeft={previewData.signerLeft}
                      signerRight={previewData.signerRight}
                      date={previewData.date}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Customize Certificate Details</h2>
          <p className="text-sm text-gray-600 mb-6">
            Second row lets you upload PNG assets, set signer details, and verify the full live certificate preview before publishing.
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization Logo (required, PNG)</label>
                <input
                  type="file"
                  accept="image/png,.png"
                  onChange={(e) => handlePngUpload(e.target.files?.[0], 'logoUrl', 'Organization logo')}
                  className="w-full text-sm rounded-lg border border-gray-300 p-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Left Signature (PNG)</label>
                  <input
                    type="file"
                    accept="image/png,.png"
                    onChange={(e) => handlePngUpload(e.target.files?.[0], 'signatureLeftUrl', 'Left signature')}
                    className="w-full text-sm rounded-lg border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Right Signature (PNG)</label>
                  <input
                    type="file"
                    accept="image/png,.png"
                    onChange={(e) => handlePngUpload(e.target.files?.[0], 'signatureRightUrl', 'Right signature')}
                    className="w-full text-sm rounded-lg border border-gray-300 p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Left Signer Name</label>
                  <input
                    type="text"
                    value={settings.signerLeftName}
                    onChange={(e) => setSettings(prev => ({ ...prev, signerLeftName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Left Signer Title</label>
                  <input
                    type="text"
                    value={settings.signerLeftTitle}
                    onChange={(e) => setSettings(prev => ({ ...prev, signerLeftTitle: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Right Signer Name</label>
                  <input
                    type="text"
                    value={settings.signerRightName}
                    onChange={(e) => setSettings(prev => ({ ...prev, signerRightName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Right Signer Title</label>
                  <input
                    type="text"
                    value={settings.signerRightTitle}
                    placeholder={hackathon?.company || 'Organizer'}
                    onChange={(e) => setSettings(prev => ({ ...prev, signerRightTitle: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {finalizing ? 'Publishing...' : 'Finalize Results & Publish Certificates'}
                <CheckCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Full Certificate Preview</h3>
              <div className="rounded border border-gray-300 bg-white p-2 h-[500px] overflow-hidden flex items-center justify-center">
                <div style={{ transform: 'scale(0.58)', transformOrigin: 'center center', width: '1122px', height: '794px' }}>
                  <CertificateTemplate
                    participantName={previewData.participantName}
                    teamName={previewData.teamName}
                    hackathonTitle={previewData.hackathonTitle}
                    company={previewData.company}
                    rank={previewData.rank}
                    rankTitle={previewData.rankTitle}
                    certificateType={previewData.certificateType}
                    isTeam={previewData.isTeam}
                    templateStyle={settings.certificateTemplateId}
                    logoUrl={previewData.logoUrl}
                    signatureLeftUrl={previewData.signatureLeftUrl}
                    signatureRightUrl={previewData.signatureRightUrl}
                    signerLeft={previewData.signerLeft}
                    signerRight={previewData.signerRight}
                    date={previewData.date}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
