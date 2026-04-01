import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import LogoImage from './logo_png.png';

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

const FONT_STYLESHEET =
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Great+Vibes&family=Poppins:wght@300;400;600&display=swap';

const ensureCertificateFonts = () => {
    if (typeof document === 'undefined') return;
    const fontLinkId = 'certificate-google-fonts';
    if (document.getElementById(fontLinkId)) return;

    const link = document.createElement('link');
    link.id = fontLinkId;
    link.rel = 'stylesheet';
    link.href = FONT_STYLESHEET;
    document.head.appendChild(link);
};

export const preloadCertificateFonts = async () => {
    ensureCertificateFonts();
    await new Promise((r) => setTimeout(r, 80));
    if (typeof document !== 'undefined' && document.fonts?.load) {
        try {
            await Promise.all([
                document.fonts.load("400 52px 'Great Vibes'"),
                document.fonts.load("700 68px 'Playfair Display'"),
                document.fonts.load("400 28px 'Playfair Display'"),
                document.fonts.load("400 14px 'Poppins'"),
                document.fonts.load("600 14px 'Poppins'"),
            ]);
        } catch {
            /* ignore */
        }
    }
    if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready;
    }
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
    signatureRightUrl,
    teamAffiliationLine
}) => {
    ensureCertificateFonts();

    // Resolve context primarily from certificateFor, with isTeam as a backward-compatible fallback
    const resolvedCertificateFor = certificateFor || (isTeam ? 'TEAM' : 'INDIVIDUAL');
    const trimmedParticipant = String(participantName ?? '').trim();
    const trimmedTeam = String(teamName ?? '').trim();
    const displayName =
        resolvedCertificateFor === 'TEAM'
            ? trimmedTeam || trimmedParticipant
            : trimmedParticipant;
    const affiliation = String(teamAffiliationLine ?? '').trim();
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

    // Template 1: exact layout/style based on provided HTML
    const template1 = () => {
        const isAchievement = (certificateType || '').toLowerCase().includes('achievement');
        const subtitle = isAchievement ? 'Of Achievement' : 'Of Participation';
        const descriptionText = customMessage || 'Your commitment and contribution have been truly commendable and serve as an inspiration to others.';
        const platformLogo = platformLogoUrl || LogoImage;

        return baseWrap(
            <div style={{ width: '100%', height: '100%', background: '#d9e3ec', position: 'relative' }}>
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        left: 0,
                        top: 0,
                        transform: 'none',
                        background: 'linear-gradient(135deg, #9fb4c7, #b8c9d8)',
                        overflow: 'hidden'
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: 'radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)',
                            backgroundSize: '14px 14px',
                            opacity: 0.4
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            bottom: -150,
                            right: -150,
                            width: 600,
                            height: 600,
                            background: 'repeating-radial-gradient(circle, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 2px, transparent 3px, transparent 12px)',
                            borderRadius: '50%',
                            opacity: 0.4
                        }}
                    />

                    <div
                        style={{
                            width: 900,
                            height: 600,
                            background: '#ffffff',
                            margin: 'auto',
                            position: 'relative',
                            top: 70,
                            borderRadius: 18,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                            textAlign: 'center',
                            padding: '22px 70px 40px',
                            boxSizing: 'border-box'
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                inset: 12,
                                border: '1.5px solid rgba(0,0,0,0.35)',
                                borderRadius: 14,
                                pointerEvents: 'none'
                            }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <img
                                    src={platformLogo}
                                    alt="SaarthiX"
                                    style={{ height: 36, width: 'auto', objectFit: 'contain' }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {logoUrl ? (
                                    <img
                                        src={logoUrl}
                                        alt="Organization"
                                        style={{ height: 34, width: 'auto', objectFit: 'contain', maxWidth: 110 }}
                                    />
                                ) : (
                                    <div style={{ height: 34, minWidth: 92, border: '1px dashed #9ca3af', borderRadius: 6, fontSize: 10, color: '#6b7280', display: 'grid', placeItems: 'center', padding: '0 8px' }}>
                                        Industry Logo
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 68, letterSpacing: 4, color: '#2e2e2e' }}>
                            CERTIFICATE
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginTop: 5, marginBottom: 15 }}>
                            {subtitle}
                        </div>
                        <div style={{ fontSize: 12, letterSpacing: 2, color: '#444', margin: '15px 0' }}>
                            THE FOLLOWING AWARD IS GIVEN TO
                        </div>
                        <div style={{ fontFamily: "'Great Vibes', cursive", fontSize: 48, margin: '20px 0 8px', color: '#2e2e2e', minHeight: 56, lineHeight: 1.15 }}>
                            {displayName}
                        </div>
                        {affiliation ? (
                            <div style={{ fontSize: 15, color: '#374151', margin: '0 auto 14px', fontFamily: "'Poppins', Arial, sans-serif", fontWeight: 600, lineHeight: 1.35, maxWidth: '85%' }}>
                                {affiliation}
                            </div>
                        ) : null}
                        <div style={{ fontSize: 14, color: '#444', width: '70%', margin: '0 auto', lineHeight: 1.6 }}>
                            {descriptionText}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 50, padding: '0 26px' }}>
                            <div style={{ width: '40%', textAlign: 'center' }}>
                                {signatureLeftUrl && (
                                    <img src={signatureLeftUrl} alt="Signature left" style={{ maxHeight: 38, maxWidth: 170, objectFit: 'contain', margin: '0 auto 2px' }} />
                                )}
                                <div style={{ fontFamily: "'Great Vibes', cursive", fontSize: 22 }}>{signerLeft?.name || 'Chad Gibbons'}</div>
                                <div style={{ width: '60%', height: 1, background: '#333', margin: '5px auto' }} />
                                <div style={{ fontSize: 12, color: '#444' }}>{signerLeft?.title || 'Head of Event'}</div>
                            </div>
                            <div style={{ width: '40%', textAlign: 'center' }}>
                                {signatureRightUrl && (
                                    <img src={signatureRightUrl} alt="Signature right" style={{ maxHeight: 38, maxWidth: 170, objectFit: 'contain', margin: '0 auto 2px' }} />
                                )}
                                <div style={{ fontFamily: "'Great Vibes', cursive", fontSize: 22 }}>{signerRight?.name || 'Juliana Silva'}</div>
                                <div style={{ width: '60%', height: 1, background: '#333', margin: '5px auto' }} />
                                <div style={{ fontSize: 12, color: '#444' }}>{signerRight?.title || 'Mentor'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Template 2: exact layout/style based on provided HTML
    const template2 = () => {
        const isAchievement = (certificateType || '').toLowerCase().includes('achievement');
        const subtitle = isAchievement ? 'OF ACHIEVEMENT' : 'OF PARTICIPATION';
        const descriptionText = customMessage || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce varius suscipit turpis, in efficitur elit luctus eget. Aenean in consectetur nulla. Suspendisse efficitur sollicitudin magna ut cursus.';
        const platformLogo = platformLogoUrl || LogoImage;

        return baseWrap(
            <div style={{ width: '100%', height: '100%', background: '#e6e6e6', position: 'relative' }}>
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        left: 0,
                        top: 0,
                        transform: 'none',
                        background: 'linear-gradient(135deg, #17b3a3 50%, #6faea6 50%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: '40%',
                            width: 300,
                            height: '100%',
                            background: 'rgba(255,255,255,0.15)',
                            transform: 'skewX(-20deg)'
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 350,
                            height: 200,
                            background: 'rgba(255,255,255,0.25)',
                            clipPath: 'polygon(100% 0, 0 100%, 100% 100%)'
                        }}
                    />

                    <div
                        style={{
                            width: 900,
                            height: 570,
                            background: '#efefef',
                            padding: '22px 60px 46px',
                            boxSizing: 'border-box',
                            textAlign: 'center',
                            position: 'relative'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <img src={platformLogo} alt="SaarthiX" style={{ height: 34, width: 'auto', objectFit: 'contain' }} />
                            {logoUrl ? (
                                <img src={logoUrl} alt="Organization" style={{ height: 32, width: 'auto', objectFit: 'contain', maxWidth: 110 }} />
                            ) : (
                                <div style={{ height: 32, minWidth: 92, border: '1px dashed #9ca3af', borderRadius: 6, fontSize: 10, color: '#6b7280', display: 'grid', placeItems: 'center', padding: '0 8px' }}>
                                    Industry Logo
                                </div>
                            )}
                        </div>

                        <div style={{ fontFamily: "'Great Vibes', cursive", fontSize: 72, color: '#1aa191', marginBottom: 10 }}>
                            Certificate
                        </div>
                        <div style={{ fontSize: 14, letterSpacing: 2, marginBottom: 25 }}>
                            {subtitle}
                        </div>
                        <div style={{ fontSize: 13, letterSpacing: 4, color: '#444', marginBottom: 15 }}>
                            This certificate is awarded to :
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, color: '#1aa191', marginBottom: affiliation ? 8 : 20, minHeight: 44 }}>
                            {displayName}
                        </div>
                        {affiliation ? (
                            <div style={{ fontSize: 14, color: '#334155', marginBottom: 16, fontFamily: "'Poppins', Arial, sans-serif", fontWeight: 600 }}>
                                {affiliation}
                            </div>
                        ) : null}
                        <div style={{ fontSize: 14, color: '#333', lineHeight: 1.7, width: '80%', margin: '0 auto 60px' }}>
                            {descriptionText}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26 }}>
                            <div style={{ width: '40%', textAlign: 'center' }}>
                                {signatureLeftUrl && (
                                    <img src={signatureLeftUrl} alt="Signature left" style={{ maxHeight: 34, maxWidth: 170, objectFit: 'contain', margin: '0 auto 4px' }} />
                                )}
                                <div style={{ height: 2, background: '#1aa191', marginBottom: 10 }} />
                                <div style={{ color: '#1aa191', fontWeight: 600, fontSize: 14 }}>
                                    {(signerLeft?.name || 'JAMIE CHASTAIN').toUpperCase()}
                                </div>
                                <div style={{ fontSize: 13, color: '#333' }}>
                                    {(signerLeft?.title || 'DIRECTOR').toUpperCase()}
                                </div>
                            </div>
                            <div style={{ width: '40%', textAlign: 'center' }}>
                                {signatureRightUrl && (
                                    <img src={signatureRightUrl} alt="Signature right" style={{ maxHeight: 34, maxWidth: 170, objectFit: 'contain', margin: '0 auto 4px' }} />
                                )}
                                <div style={{ height: 2, background: '#1aa191', marginBottom: 10 }} />
                                <div style={{ color: '#1aa191', fontWeight: 600, fontSize: 14 }}>
                                    {(signerRight?.name || 'CLAUDIA ALVES').toUpperCase()}
                                </div>
                                <div style={{ fontSize: 13, color: '#333' }}>
                                    {(signerRight?.title || 'GENERAL MANAGER').toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </div>
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
        certificateFor,
        teamName,
        templateStyle,
        logoUrl,
        platformLogoUrl,
        customMessage,
        signerLeft,
        signerRight,
        signatureLeftUrl,
        signatureRightUrl,
        teamAffiliationLine
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

    ensureCertificateFonts();
    await preloadCertificateFonts();

    // Use position:fixed at (0,0) so the element is always at viewport (0,0),
    // regardless of page scroll. html2canvas uses getBoundingClientRect() and the
    // actual scroll position to calculate document coordinates. With position:fixed
    // at (0,0), getBoundingClientRect() always returns top=0,left=0, so
    // html2canvas always captures from document origin correctly.
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '1122px';
    container.style.height = '794px';
    container.style.zIndex = '-9999';
    container.style.pointerEvents = 'none';
    container.style.overflow = 'hidden';
    container.style.opacity = '1';
    container.style.visibility = 'visible';
    // Give the container a unique attribute so onclone can target it precisely
    container.setAttribute('data-pdf-render', 'true');
    document.body.prepend(container);

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
                certificateFor={certificateFor}
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
                teamAffiliationLine={teamAffiliationLine}
            />
        );
        setTimeout(resolve, 1200); // Allow webfonts + layout to settle
    });

    // Important: query only inside the hidden PDF render root.
    // The page can contain other previews with the same id, which causes cropped/wrong capture.
    const certificateElement = root.querySelector('#certificate-content');
    
    if (!certificateElement) {
        console.error('Certificate element not found!');
        document.body.removeChild(container);
        throw new Error('Certificate element not found');
    }

    console.log('Waiting for fonts to load...');
    await preloadCertificateFonts();
    
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

    // position:fixed at (0,0) means getBoundingClientRect() always returns {top:0, left:0}.
    // html2canvas computes capture origin as: bounds.top + window.scrollY = 0 + scrollY.
    // Do NOT override scrollX/scrollY — let html2canvas use the real values so the math
    // resolves to document (0,0), capturing the full certificate from top-left.
    const canvas = await html2canvas(certificateElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 1122,
        height: 794,
        allowTaint: true,
        foreignObjectRendering: false,
        imageTimeout: 15000,
        letterRendering: true,
        onclone: (clonedDoc) => {
            // Find the container we placed (has data-pdf-render attribute) then get
            // the #certificate-content inside it — avoids accidentally targeting
            // preview certificate elements elsewhere in the cloned page.
            const clonedContainer = clonedDoc.querySelector('[data-pdf-render="true"]');
            const clonedElement = clonedContainer
                ? clonedContainer.querySelector('#certificate-content')
                : clonedDoc.querySelector('#certificate-content');
            if (clonedElement) {
                const h = clonedDoc.head || clonedDoc.getElementsByTagName('head')[0];
                if (h && !clonedDoc.getElementById('certificate-fonts-clone')) {
                    const fl = clonedDoc.createElement('link');
                    fl.id = 'certificate-fonts-clone';
                    fl.rel = 'stylesheet';
                    fl.href = FONT_STYLESHEET;
                    h.appendChild(fl);
                }
                clonedElement.style.display = 'block';
                clonedElement.style.visibility = 'visible';
                clonedElement.style.opacity = '1';
                clonedElement.style.width = '1122px';
                clonedElement.style.height = '794px';
                clonedElement.style.margin = '0';
                clonedElement.style.overflow = 'hidden';
                clonedElement.style.boxSizing = 'border-box';
                const allElements = clonedElement.getElementsByTagName('*');
                for (const el of allElements) {
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                    el.style.backdropFilter = 'none';
                    el.style.webkitBackdropFilter = 'none';
                }
                void clonedElement.offsetHeight;
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

export const downloadCertificateFromElement = async (element, certificateData = {}) => {
    if (!element) {
        throw new Error('Certificate preview element not found');
    }
    const sourceCertificate = element;
    const captureRoot =
        sourceCertificate.id === 'certificate-content'
            ? sourceCertificate
            : sourceCertificate.querySelector('#certificate-content') || sourceCertificate;

    ensureCertificateFonts();
    await preloadCertificateFonts();

    const captureHost = document.createElement('div');
    captureHost.setAttribute('data-pdf-render', 'true');
    captureHost.style.position = 'fixed';
    captureHost.style.left = '0';
    captureHost.style.top = '0';
    captureHost.style.width = '1122px';
    captureHost.style.height = '794px';
    captureHost.style.zIndex = '-9999';
    captureHost.style.pointerEvents = 'none';
    captureHost.style.overflow = 'hidden';
    captureHost.style.background = '#ffffff';
    document.body.prepend(captureHost);

    try {
        const clone = captureRoot.cloneNode(true);
        clone.style.width = '1122px';
        clone.style.height = '794px';
        clone.style.margin = '0';
        clone.style.transform = 'none';
        clone.style.position = 'relative';
        clone.style.left = '0';
        clone.style.top = '0';
        clone.style.maxWidth = 'none';
        clone.style.display = 'block';
        clone.style.visibility = 'visible';
        clone.style.opacity = '1';
        clone.style.overflow = 'hidden';
        clone.style.boxSizing = 'border-box';
        captureHost.appendChild(clone);

        await preloadCertificateFonts();
        const images = clone.getElementsByTagName('img');
        await Promise.all(
            Array.from(images).map((img) => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                    setTimeout(resolve, 3000);
                });
            })
        );
        await new Promise((r) => setTimeout(r, 400));

        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: 1122,
            height: 794,
            allowTaint: true,
            foreignObjectRendering: false,
            imageTimeout: 15000,
            letterRendering: true,
            onclone: (clonedDoc) => {
                const clonedContainer = clonedDoc.querySelector('[data-pdf-render="true"]');
                const clonedElement = clonedContainer
                    ? clonedContainer.querySelector('#certificate-content') || clonedContainer.firstElementChild
                    : null;
                if (!clonedElement) return;
                const h = clonedDoc.head || clonedDoc.getElementsByTagName('head')[0];
                if (h && !clonedDoc.getElementById('certificate-fonts-clone')) {
                    const fl = clonedDoc.createElement('link');
                    fl.id = 'certificate-fonts-clone';
                    fl.rel = 'stylesheet';
                    fl.href = FONT_STYLESHEET;
                    h.appendChild(fl);
                }
                clonedElement.style.display = 'block';
                clonedElement.style.visibility = 'visible';
                clonedElement.style.opacity = '1';
                clonedElement.style.width = '1122px';
                clonedElement.style.height = '794px';
                clonedElement.style.margin = '0';
                clonedElement.style.overflow = 'hidden';
                clonedElement.style.boxSizing = 'border-box';
                const allElements = clonedElement.getElementsByTagName('*');
                for (const el of allElements) {
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                    el.style.backdropFilter = 'none';
                    el.style.webkitBackdropFilter = 'none';
                }
            },
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [297, 210],
            compress: true
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const aspectRatio = canvas.width / canvas.height;

        let imgWidth = pdfWidth;
        let imgHeight = pdfWidth / aspectRatio;
        if (imgHeight > pdfHeight) {
            imgHeight = pdfHeight;
            imgWidth = pdfHeight * aspectRatio;
        }

        const xOffset = (pdfWidth - imgWidth) / 2;
        const yOffset = (pdfHeight - imgHeight) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight, '', 'FAST');

        const safeTitle = (certificateData.hackathonTitle || 'Hackathon').replace(/\s+/g, '_');
        const safeName = (certificateData.participantName || certificateData.teamName || 'Participant')
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_-]/g, '');
        const fileName = `Saarthix_${safeTitle}_${safeName}_Certificate.pdf`;
        pdf.save(fileName);

        return true;
    } finally {
        if (captureHost.parentNode) {
            captureHost.parentNode.removeChild(captureHost);
        }
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
