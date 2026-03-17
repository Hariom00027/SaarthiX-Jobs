import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Generate unique certificate code in format: dd/mm/yyyy-UNIQUECODE
export const generateCertificateCode = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    // Use timestamp-based suffix for uniqueness (last 6 digits)
    const timestamp = now.getTime();
    const uniqueCode = String(timestamp % 1000000).padStart(6, '0');

    return `${day}/${month}/${year}-${uniqueCode}`;
};

// Shared helpers
const baseWrap = (content, background = '#f5f5f5') => (
    <div
        id="certificate-content"
        style={{
            width: '1122px',
            height: '794px',
            background,
            fontFamily: "'Poppins', 'Arial', sans-serif",
            position: 'relative',
            overflow: 'hidden',
            boxSizing: 'border-box',
            padding: '30px'
        }}
    >
        {content}
    </div>
);

const renderSignatures = (signerLeft, signerRight, company, signatureLeftUrl, signatureRightUrl, color = '#1f2937') => {
    // Only render signatures section if at least one signature URL is provided
    if (!signatureLeftUrl && !signatureRightUrl) {
        return null;
    }
    
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', padding: '0 30px' }}>
            <div style={{ textAlign: 'center', width: '220px' }}>
                {signatureLeftUrl && <img src={signatureLeftUrl} alt="Signature left" style={{ maxHeight: '60px', objectFit: 'contain', margin: '0 auto 6px' }} />}
                {signatureLeftUrl && (
                    <>
                        <div style={{ borderTop: `2px solid ${color}`, paddingTop: '8px', fontSize: '13px', fontWeight: '700', color }}>{signerLeft?.name}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{signerLeft?.title}</div>
                    </>
                )}
            </div>
            <div style={{ textAlign: 'center', width: '220px' }}>
                {signatureRightUrl && <img src={signatureRightUrl} alt="Signature right" style={{ maxHeight: '60px', objectFit: 'contain', margin: '0 auto 6px' }} />}
                {signatureRightUrl && (
                    <>
                        <div style={{ borderTop: `2px solid ${color}`, paddingTop: '8px', fontSize: '13px', fontWeight: '700', color }}>{signerRight?.name}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{signerRight?.title || company}</div>
                    </>
                )}
            </div>
        </div>
    );
};

const CertificateTemplate = ({
    participantName,
    hackathonTitle,
    company,
    rank,
    rankTitle, // Single source of truth from backend
    certificateType, // Certificate of Achievement or Certificate of Participation
    isTeam,
    certificateFor, // 'TEAM' | 'INDIVIDUAL' - new context-aware flag
    teamName,
    date,
    certificateCode,
    templateStyle = 'template1',
    logoUrl,
    platformLogoUrl,
    customMessage,
    signerLeft = { name: 'Platform Director', title: 'Saarthix' },
    signerRight = { name: 'Event Organizer', title: company || 'Organizer' },
    signatureLeftUrl,
    signatureRightUrl
}) => {
    // Resolve context primarily from certificateFor, with isTeam as a backward-compatible fallback
    const resolvedCertificateFor = certificateFor || (isTeam ? 'TEAM' : 'INDIVIDUAL');
    const displayName = resolvedCertificateFor === 'TEAM' ? teamName : participantName;
    const getAchievementText = () => {
        // Ensure date is valid - fallback to formatted current date if undefined
        const validDate = date || new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if(rank === 0) {
            return `This certificate is proudly presented to recognize outstanding achievement and exceptional performance in securing <strong>X place</strong> in the <strong>${hackathonTitle}</strong> held on <strong>${validDate}</strong>. This accomplishment demonstrates remarkable innovation, dedication, and technical excellence.`;
        }
        // Always use backend rank-based generation, ignore customMessage
        if (rank === 1) {
            return `This certificate is proudly presented to recognize outstanding achievement and exceptional performance in securing <strong>First Place</strong> in the <strong>${hackathonTitle}</strong> held on <strong>${validDate}</strong>. This accomplishment demonstrates remarkable innovation, dedication, and technical excellence.`;
        }
        if (rank === 2) {
            return `This certificate is awarded in recognition of exceptional achievement and distinguished performance in securing <strong>Second Place</strong> in the <strong>${hackathonTitle}</strong> held on <strong>${validDate}</strong>. This achievement showcases impressive skills and innovative thinking.`;
        }
        if (rank === 3) {
            return `This certificate is presented in recognition of notable achievement and commendable performance in securing <strong>Third Place</strong> in the <strong>${hackathonTitle}</strong> held on <strong>${validDate}</strong>. This accomplishment reflects strong technical skills and creative problem-solving.`;
        }
        // For any non-top-3 (including undefined), show participation message
        return `This certificate is awarded in recognition of active participation and successful completion of all phases in the <strong>${hackathonTitle}</strong> held on <strong>${validDate}</strong>. This participation demonstrates commitment to learning, innovation, and collaborative problem-solving.`;
    };

    const renderHeaderLogos = (accentColor = '#0f3d91') => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg,#0c7dc2,#0f3d91)',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '22px',
                    display: 'grid',
                    placeItems: 'center',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                    {platformLogoUrl ? (
                        <img src={platformLogoUrl} alt="Platform" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        'SX'
                    )}
                </div>
                <div style={{ color: accentColor, fontWeight: 800, fontSize: '14px', letterSpacing: '1px' }}>
                    Platform Organizer
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {logoUrl && (
                    <div style={{
                        width: '68px',
                        height: '68px',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        background: '#fff'
                    }}>
                        <img src={logoUrl} alt="Company" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                )}
                <div style={{ color: accentColor, fontWeight: 800, fontSize: '14px', letterSpacing: '1px' }}>
                    {company || 'Organizer'}
                </div>
            </div>
        </div>
    );

    // Template 1: Classic Achievement (matches latest uploaded design)
    const template1 = () => {
        // Use rankTitle from backend as single source of truth
        const displayRankTitle = rankTitle || 'Participation Certificate/Rank';
        const displayCertificateType = certificateType || 'Certificate of Participation/Achievement';

        return baseWrap(
            <div style={{ background: '#f8fbff', width: '100%', height: '100%', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', position: 'relative', overflow: 'hidden' }}>
                {/* Top ribbon */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '180px',
                    background: 'linear-gradient(135deg, #0d3f84 0%, #0b74c2 50%, #0d3f84 100%)',
                    clipPath: 'ellipse(160% 100% at 50% 0%)'
                }} />

                {/* Bottom ribbon */}
                <div style={{
                    position: 'absolute',
                    bottom: -20,
                    left: 0,
                    right: 0,
                    height: '220px',
                    background: 'linear-gradient(135deg, #0d3f84 0%, #0b74c2 50%, #0d3f84 100%)',
                    clipPath: 'ellipse(160% 100% at 50% 100%)',
                    transform: 'scaleX(-1)'
                }} />

                {/* Inner panel */}
                <div style={{
                    position: 'absolute',
                    top: 70,
                    left: 70,
                    right: 70,
                    bottom: 70,
                    background: 'linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)',
                    border: '2px solid #c8d7e8',
                    boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '50px 70px 70px'
                }}>
                    {renderHeaderLogos('#0f3d91')}
                    <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '3px', color: '#0d3f84', marginBottom: '8px' }}>{displayCertificateType.toUpperCase()}</div>
                    <div style={{ fontSize: '14px', letterSpacing: '2px', color: '#666', marginBottom: '30px' }}>{displayRankTitle}</div>

                    <div style={{ fontSize: '12px', color: '#444', letterSpacing: '1px', marginBottom: '28px', textAlign: 'center' }}>
                        THIS CERTIFICATE IS PROUDLY PRESENTED TO
                    </div>

                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '46px', color: '#0f172a', marginBottom: '18px' }}>
                        {displayName}
                    </div>

                    <div style={{ width: '220px', height: '1px', background: '#9ca3af', marginBottom: '22px' }} />

                    <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6, textAlign: 'center', maxWidth: '620px', marginBottom: '36px' }}
                        dangerouslySetInnerHTML={{ __html: getAchievementText() }} />

                    {/* Signatures and seal - Only show if signatures are uploaded */}
                    {(signatureLeftUrl || signatureRightUrl) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '20px' }}>
                            <div style={{ width: '220px', textAlign: 'center' }}>
                                {signatureLeftUrl && <img src={signatureLeftUrl} alt="Signature left" style={{ maxHeight: '50px', objectFit: 'contain', margin: '0 auto 6px' }} />}
                                {signatureLeftUrl && (
                                    <>
                                        <div style={{ fontSize: '11px', color: '#4b5563', fontWeight: 700 }}>{signerLeft?.name || 'Representative'}</div>
                                        <div style={{ fontSize: '10px', color: '#6b7280' }}>{signerLeft?.title || 'REPRESENTATIVE'}</div>
                                    </>
                                )}
                            </div>

                            <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '2px solid #cdd7e2', display: 'grid', placeItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                <div style={{ width: '88px', height: '88px', borderRadius: '50%', border: '2px dashed #cdd7e2', display: 'grid', placeItems: 'center' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#d6dee9' }} />
                                </div>
                            </div>

                            <div style={{ width: '220px', textAlign: 'center' }}>
                                {signatureRightUrl && <img src={signatureRightUrl} alt="Signature right" style={{ maxHeight: '50px', objectFit: 'contain', margin: '0 auto 6px' }} />}
                                {signatureRightUrl && (
                                    <>
                                        <div style={{ fontSize: '11px', color: '#4b5563', fontWeight: 700 }}>{signerRight?.name || 'Representative'}</div>
                                        <div style={{ fontSize: '10px', color: '#6b7280' }}>{signerRight?.title || 'REPRESENTATIVE'}</div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer with date & unique certificate code */}
                    <div style={{ marginTop: '24px', width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280', letterSpacing: '0.06em' }}>
                        <span>Issued on: {date}</span>
                        {certificateCode && <span>Certificate ID: {certificateCode}</span>}
                    </div>
                </div>
            </div>
        );
    };

    // Template 2: Playful Participation (matches provided teal design)
    const template2 = () => {
        const displayRankTitle = rankTitle || 'Participation Certificate/Rank';
        const displayCertificateType = certificateType || 'Certificate of Participation/Achievement';
        return baseWrap(
            <div style={{
                background: '#f7fffd',
                width: '100%',
                height: '100%',
                borderRadius: '18px',
                border: '1px solid #d1fae5',
                position: 'relative',
                overflow: 'hidden',
                padding: '60px 70px'
            }}>
                {/* Decorative shapes */}
                <div style={{ position: 'absolute', top: 16, right: 22, width: 120, height: 120, borderRadius: '32px', background: 'linear-gradient(135deg,#3cc0d3,#2ab3ad)', transform: 'rotate(12deg)' }} />
                <div style={{ position: 'absolute', top: 24, left: 0, width: 110, height: 110, borderRadius: '28px', background: 'linear-gradient(135deg,#23b8c0,#2196af)', clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                <div style={{ position: 'absolute', bottom: 8, left: 0, width: 180, height: 180, borderRadius: '40px', background: 'linear-gradient(135deg,#2ab3ad,#2a83da)', clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }} />
                <div style={{ position: 'absolute', bottom: 10, right: 8, width: 120, height: 120, borderRadius: '28px', background: 'linear-gradient(135deg,#2f9bd2,#2ab3ad)', clipPath: 'polygon(0 100%, 100% 0, 100% 100%)' }} />

                {/* Inline shapes */}
                <div style={{ position: 'absolute', top: 90, right: 210, width: 52, height: 52, borderRadius: '20px', border: '6px solid #00a8c6', boxSizing: 'border-box' }} />
                <div style={{ position: 'absolute', top: 130, right: 160, width: 18, height: 18, background: '#00a8c6', borderRadius: '999px' }} />
                <div style={{ position: 'absolute', top: 210, right: 40, width: 36, height: 36, borderRadius: '8px', border: '4px solid #00a8c6', transform: 'rotate(-8deg)' }} />
                <div style={{ position: 'absolute', top: 170, left: 110, width: 22, height: 22, borderRadius: '50%', border: '5px solid #00a8c6' }} />
                <div style={{ position: 'absolute', bottom: 160, right: 200, width: 30, height: 30, border: '4px solid #00a8c6', borderRadius: '6px', transform: 'rotate(12deg)' }} />
                <div style={{ position: 'absolute', bottom: 120, left: 220, width: 26, height: 26, border: '4px solid #00a8c6', borderRadius: '6px', transform: 'rotate(-14deg)' }} />
                <div style={{ position: 'absolute', bottom: 100, left: 60, display: 'flex', gap: 10 }}>
                    {[...Array(5)].map((_, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: '#00a8c6' }} />)}
                </div>

                {/* Content */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                    {renderHeaderLogos('#0f172a')}
                    <div style={{ marginBottom: '18px' }}>
                        <div style={{ fontSize: '38px', fontWeight: 900, color: '#07b4aa', letterSpacing: '-1px' }}>{displayCertificateType}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '2px', color: '#0f172a', marginTop: '6px' }}>{displayRankTitle}</div>
                    </div>

                    <div style={{ marginTop: '28px', fontSize: '14px', color: '#0f172a', fontWeight: 600 }}>
                        This Certificate Presented to :
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '46px', fontWeight: 900, color: '#08b2a8', letterSpacing: '-0.5px' }}>
                        {displayName}
                    </div>

                    <div style={{ marginTop: '16px', fontSize: '14px', color: '#0f172a', maxWidth: '720px', lineHeight: 1.5 }}
                        dangerouslySetInnerHTML={{ __html: customMessage || getAchievementText() }} />
                

                    {/* Signatures - Only show if signatures are uploaded */}
                    {(signatureLeftUrl || signatureRightUrl) && (
                        <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', maxWidth: '520px' }}>
                            <div style={{ textAlign: 'center' }}>
                                {signatureLeftUrl && <img src={signatureLeftUrl} alt="Signature left" style={{ maxHeight: '44px', objectFit: 'contain', margin: '0 auto 6px' }} />}
                                {signatureLeftUrl && (
                                    <>
                                        <div style={{ width: '110px', height: '1px', background: '#0f172a', margin: '0 auto 10px' }} />
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>{signerLeft?.name || 'SUPERVISOR'}</div>
                                        <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase' }}>{signerLeft?.title || 'SUPERVISOR'}</div>
                                    </>
                                )}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                {signatureRightUrl && <img src={signatureRightUrl} alt="Signature right" style={{ maxHeight: '44px', objectFit: 'contain', margin: '0 auto 6px' }} />}
                                {signatureRightUrl && (
                                    <>
                                        <div style={{ width: '110px', height: '1px', background: '#0f172a', margin: '0 auto 10px' }} />
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>{signerRight?.name || 'VP FOR OPERATION'}</div>
                                        <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase' }}>{signerRight?.title || 'VP FOR OPERATION'}</div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Template 3: Playful Participation (third design)
    const template3 = () => {
        const displayRankTitle = rankTitle || 'Participation Certificate/Rank';
        const displayCertificateType = certificateType || 'Certificate of Participation/Achievement';
        return baseWrap(
            <div style={{ background: '#f6fffe', width: '100%', height: '100%', borderRadius: '20px', border: '1px solid #d1fae5', position: 'relative', padding: '60px 70px' }}>
                {/* Header with both platform and organizer logos */}
                {renderHeaderLogos('#0ea5e9')}

                <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '3px', color: '#0ea5e9', marginTop: '12px' }}>{displayCertificateType.toUpperCase()}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '1px', color: '#666', marginTop: '4px' }}>{displayRankTitle}</div>

                <div style={{ marginTop: '24px', fontSize: '16px', color: '#111' }}>This Certificate Presented to :</div>
                <div style={{ marginTop: '10px', fontSize: '46px', fontWeight: 800, color: '#0ea5e9' }}>{displayName}</div>
                <div style={{ marginTop: '16px', fontSize: '15px', color: '#0f172a', lineHeight: 1.6, maxWidth: '760px' }} dangerouslySetInnerHTML={{ __html: getAchievementText() }} />

                <div style={{ position: 'absolute', top: '120px', right: '60px', display: 'grid', gap: '12px', color: '#0ea5e9', fontWeight: 700, fontSize: '14px' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#e0f2fe', display: 'grid', placeItems: 'center' }}>⬤</div>
                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#e0f2fe', display: 'grid', placeItems: 'center' }}>△</div>
                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#e0f2fe', display: 'grid', placeItems: 'center' }}>◇</div>
                </div>

                {/* Footer with date & unique certificate code */}
                <div style={{ position: 'absolute', bottom: '40px', left: '70px', right: '70px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280', letterSpacing: '0.06em' }}>
                    <span>Issued on: {date}</span>
                    {certificateCode && <span>Certificate ID: {certificateCode}</span>}
                </div>

                {renderSignatures(signerLeft, signerRight, company, signatureLeftUrl, signatureRightUrl, '#0ea5e9')}
            </div>
        );
    };

    // Template 4: Bold Modern (fourth design)
    const template4 = () => {
        const displayRankTitle = rankTitle || 'Participation Certificate/Rank';
        const displayCertificateType = certificateType || 'Certificate of Participation/Achievement';
        return baseWrap(
            <div style={{ background: '#ffffff', width: '100%', height: '100%', borderRadius: '20px', border: '1px solid #e5e7eb', position: 'relative', padding: '60px 70px' }}>
                {/* Header with both platform and organizer logos */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, marginRight: '40px' }}>
                        {renderHeaderLogos('#0f172a')}
                    </div>
                    <div style={{ width: '90px', height: '90px', background: '#fef2f2', borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#e11d48', fontWeight: 800 }}>
                        {new Date(date).getFullYear?.() || new Date().getFullYear()}
                    </div>
                </div>

                <div style={{ marginTop: '26px', fontSize: '44px', fontWeight: 900, color: '#0f172a' }}>{displayCertificateType.toUpperCase()}</div>
                <div style={{ marginTop: '8px', fontSize: '16px', fontWeight: 700, color: '#ef4444', letterSpacing: '2px' }}>{displayRankTitle}</div>

                <div style={{ marginTop: '18px', fontSize: '14px', color: '#111' }}>This certificate is appreciated to :</div>
                <div style={{ marginTop: '12px', fontSize: '42px', fontWeight: 900, color: '#0f172a' }}>{displayName}</div>

                <div style={{ marginTop: '20px', fontSize: '14px', color: '#374151', lineHeight: 1.7, maxWidth: '760px' }} dangerouslySetInnerHTML={{ __html: getAchievementText() }} />

                <div style={{ marginTop: '30px', display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                    <div style={{ background: '#0f172a', color: 'white', padding: '10px 16px', borderRadius: '12px', fontSize: '12px' }}>
                        Date : {date}
                    </div>
                </div>

                {/* Footer with unique certificate code */}
                <div style={{ position: 'absolute', bottom: '40px', left: '70px', right: '70px', display: 'flex', justifyContent: 'flex-end', fontSize: '10px', color: '#6b7280', letterSpacing: '0.06em' }}>
                    {certificateCode && <span>Certificate ID: {certificateCode}</span>}
                </div>

                {renderSignatures(signerLeft, signerRight, company, signatureLeftUrl, signatureRightUrl, '#0f172a')}
            </div>
        );
    };

    const templates = {
        template1,
        template2,
        template3,
        template4
    };

    const renderer = templates[templateStyle] || template1;
    return renderer();
};

export const generateCertificatePDF = async (certificateData) => {
    const {
        participantName,
        hackathonTitle,
        company,
        rank,
        rankTitle,
        certificateType,
        isTeam,
        teamName,
        templateStyle,
        logoUrl,
        platformLogoUrl,
        customMessage,
        signerLeft,
        signerRight,
        signatureLeftUrl,
        signatureRightUrl
    } = certificateData;

    const date = certificateData.date || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const certificateCode = certificateData.certificateCode || generateCertificateCode();

    console.log('=== [PDF GENERATION] Certificate Data ===');
    console.log('participantName:', participantName);
    console.log('hackathonTitle:', hackathonTitle);
    console.log('rank:', rank);
    console.log('rankTitle:', rankTitle);
    console.log('certificateType:', certificateType);
    console.log('templateStyle:', templateStyle);
    console.log('logoUrl:', logoUrl);
    console.log('platformLogoUrl:', platformLogoUrl);

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '1122px';
    container.style.height = '794px';
    container.style.zIndex = '-9999'; // Hide behind everything but keep in viewport
    container.style.visibility = 'hidden'; // Hide from user but keep in DOM for rendering
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    const root = document.createElement('div');
    root.style.width = '1122px';
    root.style.height = '794px';
    container.appendChild(root);

    const { createRoot } = await import('react-dom/client');
    const reactRoot = createRoot(root);

    await new Promise((resolve) => {
        reactRoot.render(
            <CertificateTemplate
                participantName={participantName}
                hackathonTitle={hackathonTitle}
                company={company}
                rank={rank}
                rankTitle={rankTitle}
                certificateType={certificateType}
                isTeam={isTeam}
                teamName={teamName}
                date={date}
                certificateCode={certificateCode}
                templateStyle={templateStyle}
                logoUrl={logoUrl}
                platformLogoUrl={platformLogoUrl}
                customMessage={customMessage}
                signerLeft={signerLeft}
                signerRight={signerRight}
                signatureLeftUrl={signatureLeftUrl}
                signatureRightUrl={signatureRightUrl}
            />
        );
        setTimeout(resolve, 1500); // Increased wait time for rendering
    });

    const certificateElement = document.getElementById('certificate-content');
    
    if (!certificateElement) {
        console.error('Certificate element not found!');
        document.body.removeChild(container);
        throw new Error('Certificate element not found');
    }

    // Wait for all fonts to load
    console.log('Waiting for fonts to load...');
    await document.fonts.ready;
    
    // Wait for all images to load
    console.log('Waiting for images to load...');
    const images = certificateElement.getElementsByTagName('img');
    const imagePromises = Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => {
                console.warn('Image failed to load:', img.src);
                resolve(); // Continue even if image fails
            };
            setTimeout(resolve, 3000); // Timeout after 3 seconds
        });
    });
    await Promise.all(imagePromises);
    
    // Additional wait to ensure everything is rendered
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Certificate element found, all resources loaded, generating canvas...');

    const canvas = await html2canvas(certificateElement, {
        scale: 2, // Reduced from 4 to prevent memory issues while maintaining quality
        useCORS: true,
        logging: true, // Enable logging to debug issues
        backgroundColor: '#ffffff',
        width: 1122,
        height: 794,
        allowTaint: true,
        foreignObjectRendering: false, // Disable to fix rendering issues
        imageTimeout: 15000,
        letterRendering: true, // Better text rendering
        windowWidth: 1122,
        windowHeight: 794,
        onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.getElementById('certificate-content');
            if (clonedElement) {
                // Force visibility and positioning
                clonedElement.style.display = 'block';
                clonedElement.style.visibility = 'visible';
                clonedElement.style.opacity = '1';
                clonedElement.style.transform = 'none';
                clonedElement.style.position = 'relative';
                clonedElement.style.width = '1122px';
                clonedElement.style.height = '794px';
                clonedElement.style.margin = '0';
                clonedElement.style.padding = '30px';
                clonedElement.style.boxSizing = 'border-box';
                
                // Ensure fonts are loaded
                clonedElement.style.fontFamily = "'Poppins', 'Arial', sans-serif";
                
                // Force all child elements to be visible
                const allElements = clonedElement.getElementsByTagName('*');
                for (let el of allElements) {
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                }
                
                // Force layout recalculation
                void clonedElement.offsetHeight;
                
                console.log('Cloned element dimensions:', clonedElement.offsetWidth, 'x', clonedElement.offsetHeight);
            } else {
                console.error('Cloned certificate element not found!');
            }
        }
    });

    console.log('Canvas generated:', canvas.width, 'x', canvas.height);

    // Check if canvas is blank
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let isBlank = true;
    for (let i = 0; i < pixels.length; i += 4) {
        // Check if any pixel is not white (255, 255, 255)
        if (pixels[i] !== 255 || pixels[i + 1] !== 255 || pixels[i + 2] !== 255) {
            isBlank = false;
            break;
        }
    }
    
    if (isBlank) {
        console.error('WARNING: Canvas appears to be blank!');
        console.error('Certificate element:', certificateElement);
        console.error('Certificate element dimensions:', certificateElement.offsetWidth, 'x', certificateElement.offsetHeight);
        console.error('Certificate element innerHTML length:', certificateElement.innerHTML.length);
    } else {
        console.log('Canvas has content - generating PDF...');
    }

    const imgData = canvas.toDataURL('image/png', 1.0);

    const certificateWidth = 1122;
    const certificateHeight = 794;
    const aspectRatio = certificateWidth / certificateHeight;

    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [297, 210],
        compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    let imgWidth = pdfWidth;
    let imgHeight = pdfWidth / aspectRatio;

    if (imgHeight > pdfHeight) {
        imgHeight = pdfHeight;
        imgWidth = pdfHeight * aspectRatio;
    }

    const xOffset = (pdfWidth - imgWidth) / 2;
    const yOffset = (pdfHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight, '', 'FAST');

    console.log('PDF generated successfully');
    
    // Cleanup
    reactRoot.unmount();
    document.body.removeChild(container);
    
    return pdf;
};

export const downloadCertificate = async (certificateData) => {
    try {
        
        const pdf = await generateCertificatePDF(certificateData);
        
        // Generate filename with participant/team name for uniqueness
        const safeTitle = (certificateData.hackathonTitle || 'Hackathon').replace(/\s+/g, '_');
        const safeName = (certificateData.participantName || certificateData.teamName || 'Participant')
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_-]/g, ''); // Remove special characters
        
        const fileName = `Saarthix_${safeTitle}_${safeName}_Certificate.pdf`;
        
        console.log(`Downloading certificate as: ${fileName}`);
        pdf.save(fileName);
        return true;
    } catch (error) {
        console.error('Error generating certificate:', error);
        throw error;
    }
};

export const shareOnLinkedIn = async (certificateData) => {
    const { hackathonTitle, company, rank } = certificateData;
    const rankText = rank ? `secured ${rank === 1 ? '🥇 1st' : rank === 2 ? '🥈 2nd' : rank === 3 ? '🥉 3rd' : `${rank}th`} place` : 'participated';
    const text = encodeURIComponent(
        `🎉 Excited to share that I ${rankText} in ${hackathonTitle} organized by ${company} via Saarthix! 🚀\n\nGrateful for this incredible learning experience and the opportunity to showcase my skills.\n\n#Hackathon #Achievement #Innovation #TechCommunity #${company?.replace(/\s+/g, '')}`
    );
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${text}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=600');
};

export default CertificateTemplate;
