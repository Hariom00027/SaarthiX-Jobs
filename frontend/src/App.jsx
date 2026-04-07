import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import JobList from './components/JobList';
import JobBuilder from './components/JobBuilder';
import JobTracker from './components/JobTracker';
import EditProfile from './components/EditProfile';
import ProfileBuilder from './components/ProfileBuilder';
import IndustryApplications from './components/IndustryApplications';
import IndustryHackathons from './components/IndustryHackathons';
import HackathonForm from './components/HackathonForm';
import ApplicantHackathons from './components/ApplicantHackathons';
import HackathonApplicationDashboard from './components/HackathonApplicationDashboard';
import ApplicantResults from './components/ApplicantResults';
import IndustryHackathonDashboard from './components/IndustryHackathonDashboard';
import IndustryHackathonResults from './components/IndustryHackathonResults';
import IndustryCertificatePublishPage from './components/IndustryCertificatePublishPage';
import StudentDatabase from './components/StudentDatabase';
import StudentDatabaseIntro from './components/StudentDatabaseIntro';
import DemoViewSwitcher from './components/DemoViewSwitcher';
import JobsFooter from './components/JobsFooter';
import { useAuth } from './context/AuthContext';
import { redirectToSomethingX } from './config/redirectUrls';

function BuildProfileRouteGuard() {
  const { user } = useAuth();

  React.useEffect(() => {
    if (user?.userType === 'INDUSTRY' || user?.userType === 'INSTITUTE') {
      redirectToSomethingX('/edit-your-details');
    }
  }, [user]);

  if (user?.userType === 'INDUSTRY' || user?.userType === 'INSTITUTE') {
    return null;
  }

  return <ProfileBuilder />;
}

function AppShell() {
  const location = useLocation();
  const { isIndustry } = useAuth();
  const searchParams = new URLSearchParams(location.search || '');
  const isEmbeddedProfileBuilder =
    searchParams.get('embed') === '1' &&
    (location.pathname === '/build-profile' || location.pathname === '/view-profile');

  return (
    <div className="min-h-screen bg-gray-50">
      {!isEmbeddedProfileBuilder && <Navbar />}
      {!isEmbeddedProfileBuilder && <DemoViewSwitcher />}
      <Routes>
        <Route
          path="/"
          element={<Navigate to={isIndustry ? "/manage-applications" : "/apply-jobs"} replace />}
        />
        <Route
          path="/apply-jobs"
          element={isIndustry ? <Navigate to="/manage-applications" replace /> : <JobList />}
        />
        <Route path="/post-jobs" element={<JobBuilder />} />
        <Route path="/job-tracker" element={<JobTracker />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/build-profile" element={<BuildProfileRouteGuard />} />
        <Route path="/view-profile" element={<BuildProfileRouteGuard />} />
        <Route path="/manage-applications" element={<IndustryApplications />} />
        <Route path="/manage-hackathons" element={<IndustryHackathons />} />
        <Route path="/create-hackathon" element={<HackathonForm />} />
        <Route path="/edit-hackathon" element={<HackathonForm />} />
        <Route path="/browse-hackathons" element={<ApplicantHackathons />} />
        <Route path="/hackathon-application/:applicationId" element={<HackathonApplicationDashboard />} />
        <Route path="/hackathon-application/:applicationId/results" element={<ApplicantResults />} />
        <Route path="/industry/hackathon/:hackathonId/dashboard" element={<IndustryHackathonDashboard />} />
        <Route path="/industry/hackathon/:hackathonId/results" element={<IndustryHackathonResults />} />
        <Route path="/industry/hackathon/:hackathonId/publish-certificates" element={<IndustryCertificatePublishPage />} />
        <Route path="/student-database" element={<StudentDatabaseIntro />} />
        <Route path="/student-database/browse" element={<StudentDatabase />} />
      </Routes>
      {!isEmbeddedProfileBuilder && <JobsFooter />}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

function App() {
  // Get basename calculated in main.jsx
  // This is set synchronously before React renders, ensuring Router gets correct basename
  const basename = window.__JOBS_BASENAME__ || '/';

  console.log('[Jobs App] Using basename:', basename, 'Current pathname:', window.location.pathname);

  return (
    <AuthProvider>
      <Router basename={basename}>
        <AppShell />
      </Router>
    </AuthProvider>
  );
}

export default App;
