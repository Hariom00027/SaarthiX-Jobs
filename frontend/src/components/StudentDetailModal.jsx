import React, { useState, useEffect } from 'react';
import { getStudentById, downloadResume, shortlistStudent, removeShortlist } from '../api/studentDatabaseApi';

export default function StudentDetailModal({ student: initialStudent, subscriptionType, onClose }) {
  const [student, setStudent] = useState(initialStudent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFullResume, setShowFullResume] = useState(false);

  // Refresh student data when modal opens
  useEffect(() => {
    const refreshStudentData = async () => {
      try {
        setLoading(true);
        const response = await getStudentById(initialStudent.studentId);
        setStudent(response.student);
      } catch (err) {
        console.error('Error refreshing student data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    refreshStudentData();
  }, [initialStudent.studentId]);

  const handleDownloadResume = async () => {
    try {
      const response = await downloadResume(student.studentId);
      
      // Convert base64 to blob and download
      const byteCharacters = atob(response.base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: response.fileType || 'application/pdf' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.fileName || 'resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert('Resume downloaded successfully!');
    } catch (err) {
      alert(err.response?.data || err.message || 'Failed to download resume');
    }
  };

  const handleShortlist = async () => {
    try {
      if (student.isShortlisted) {
        await removeShortlist(student.studentId);
        setStudent({ ...student, isShortlisted: false });
        alert('Student removed from shortlist');
      } else {
        await shortlistStudent(student.studentId);
        setStudent({ ...student, isShortlisted: true });
        alert('Student shortlisted successfully!');
      }
    } catch (err) {
      alert(err.response?.data || err.message || 'Action failed');
    }
  };


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Student Profile</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        )}

        {!loading && student && (
          <div className="p-6">
            {/* Profile Header */}
            <div className="flex items-start gap-6 mb-8 pb-6 border-b border-gray-200">
              {student.profilePictureBase64 ? (
                <img
                  src={`data:image/jpeg;base64,${student.profilePictureBase64}`}
                  alt={student.fullName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-500">
                    {student.fullName?.charAt(0) || '?'}
                  </span>
                </div>
              )}
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{student.fullName}</h3>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleShortlist}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      student.isShortlisted
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {student.isShortlisted ? '⭐ Shortlisted' : '⭐ Shortlist'}
                  </button>
                  
                  {student.resumeAvailable && (
                    <button
                      onClick={handleDownloadResume}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Resume
                    </button>
                  )}
                </div>
              </div>

              {/* Profile Stats */}
              <div className="text-right">
                {student.profileCompletenessScore && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Profile Completeness</p>
                    <div className="text-3xl font-bold text-green-600">{student.profileCompletenessScore}%</div>
                  </div>
                )}
              </div>
            </div>

            {/* Education */}
            {student.educationEntries && student.educationEntries.length > 0 && (
              <section className="mb-8">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                  Education
                </h4>
                <div className="space-y-4">
                  {student.educationEntries.map((edu, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{edu.degree || edu.level}</p>
                          <p className="text-gray-600">{edu.institution}</p>
                          {edu.stream && <p className="text-sm text-gray-500">Stream: {edu.stream}</p>}
                          {edu.board && <p className="text-sm text-gray-500">Board: {edu.board}</p>}
                        </div>
                        <div className="text-right">
                          {edu.passingYear && <p className="text-sm text-gray-600">{edu.passingYear}</p>}
                          {edu.percentage && <p className="text-sm font-semibold text-green-600">{edu.percentage}%</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Skills */}
            {student.skills && student.skills.length > 0 && (
              <section className="mb-8">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {student.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Professional Summary */}
            {student.summary && (
              <section className="mb-8">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Professional Summary</h4>
                <p className="text-gray-700 leading-relaxed">{student.summary}</p>
              </section>
            )}

            {/* Professional Experience */}
            {student.professionalExperiences && student.professionalExperiences.length > 0 && (
              <section className="mb-8">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Work Experience
                </h4>
                <div className="space-y-4">
                  {student.professionalExperiences.map((exp, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{exp.jobTitle}</p>
                          <p className="text-gray-600">{exp.company}</p>
                        </div>
                        <p className="text-sm text-gray-500">
                          {exp.startDate} - {exp.isCurrentJob ? 'Present' : exp.endDate}
                        </p>
                      </div>
                      {exp.description && <p className="text-sm text-gray-700">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Projects */}
            {student.projects && student.projects.length > 0 && (
              <section className="mb-8">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Projects
                </h4>
                <div className="space-y-4">
                  {student.projects.map((project, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-900 mb-2">{project.name}</p>
                      <p className="text-sm text-gray-700 mb-3">{project.description}</p>
                      <div className="flex gap-3">
                        {project.githubLink && (
                          <a
                            href={project.githubLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                            GitHub
                          </a>
                        )}
                        {project.websiteLink && (
                          <a
                            href={project.websiteLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Live Demo
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Additional Info */}
            <section className="mb-8">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Additional Information</h4>
              <div className="grid grid-cols-2 gap-4">
                {student.currentLocation && (
                  <div>
                    <p className="text-sm text-gray-600">Current Location</p>
                    <p className="font-medium text-gray-900">{student.currentLocation}</p>
                  </div>
                )}
                {student.availability && (
                  <div>
                    <p className="text-sm text-gray-600">Availability</p>
                    <p className="font-medium text-gray-900">{student.availability}</p>
                  </div>
                )}
                {student.workPreference && (
                  <div>
                    <p className="text-sm text-gray-600">Work Preference</p>
                    <p className="font-medium text-gray-900">{student.workPreference}</p>
                  </div>
                )}
                {student.experience && (
                  <div>
                    <p className="text-sm text-gray-600">Years of Experience</p>
                    <p className="font-medium text-gray-900">{student.experience} years</p>
                  </div>
                )}
                {student.hackathonsParticipated !== undefined && (
                  <div>
                    <p className="text-sm text-gray-600">Hackathons Participated</p>
                    <p className="font-medium text-gray-900">{student.hackathonsParticipated}</p>
                  </div>
                )}
                {student.jobsApplied !== undefined && (
                  <div>
                    <p className="text-sm text-gray-600">Job Applications</p>
                    <p className="font-medium text-gray-900">{student.jobsApplied}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Resume Preview Section */}
            {student.resumeAvailable && (
              <section className="mb-8">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Resume
                </h4>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 mb-4 font-medium">
                    📄 {student.resumeFileName || 'Resume Available'}
                  </p>
                  
                  {/* Download Button */}
                  <button
                    onClick={handleDownloadResume}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Resume
                  </button>
                </div>
              </section>
            )}

            {/* Links */}
            {(student.linkedInUrl || student.githubUrl || student.portfolioUrl) && (
              <section className="mb-8">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Links</h4>
                <div className="flex flex-wrap gap-3">
                  {student.githubUrl && (
                    <a
                      href={student.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      GitHub
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  {student.portfolioUrl && (
                    <a
                      href={student.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2"
                    >
                      Portfolio
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
