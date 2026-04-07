import React, { useMemo } from 'react';
import LogoImage from './logo_png.png';
import { getSomethingXUrl } from '../config/redirectUrls';
import './JobsFooter.css';

const NAV_LINKS = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'institute', label: 'Institute', path: '/institutes' },
  { key: 'students', label: 'Students', path: '/students' },
  { key: 'industry', label: 'Industry', path: '/industry' },
];

const RESOURCE_LINKS = [
  { key: 'partnership', label: 'Partnership', path: '/partnership' },
  { key: 'resource', label: 'Resource', path: '/resources' },
  { key: 'stories', label: 'Success Stories', path: '/success-stories' },
  { key: 'blog', label: 'Blog', path: '/blog' },
];

export default function JobsFooter() {
  const baseUrl = useMemo(() => getSomethingXUrl().replace(/\/$/, ''), []);

  const resolveUrl = (path) => `${baseUrl}${path}`;

  return (
    <footer className="jobs-footer" aria-label="Jobs footer">
      <div className="jobs-footer__overlay" />
      <div className="jobs-footer__inner">
        <div className="jobs-footer__col jobs-footer__brand">
          <div className="jobs-footer__logo-row">
            <img src={LogoImage} alt="SaarthiX" className="jobs-footer__logo" />
            <span className="jobs-footer__brand-name">SaarthiX</span>
          </div>
          <p className="jobs-footer__brand-text">
            Connecting students, institutes, and industry in one smart space. Learn, grow, and create opportunities together.
          </p>
          <p className="jobs-footer__tagline">Empowering Dreams, Building Futures!</p>
        </div>

        <div className="jobs-footer__col">
          <h4 className="jobs-footer__heading">Navigation</h4>
          <ul className="jobs-footer__links">
            {NAV_LINKS.map((item) => (
              <li key={item.key}>
                <a href={resolveUrl(item.path)} className="jobs-footer__link">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="jobs-footer__col">
          <h4 className="jobs-footer__heading">Resources</h4>
          <ul className="jobs-footer__links">
            {RESOURCE_LINKS.map((item) => (
              <li key={item.key}>
                <a href={resolveUrl(item.path)} className="jobs-footer__link">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="jobs-footer__col">
          <h4 className="jobs-footer__heading">Contact</h4>
          <ul className="jobs-footer__contact">
            <li>1705, 19th Main Road, Sector 2 HSR Layout, Bengaluru, 560102, India</li>
            <li>+91 779 550 0937</li>
            <li>support@nattlabs.com</li>
            <li>Mon - Fri: 9:00 AM - 6:00 PM · Sat: 10:00 AM - 4:00 PM</li>
          </ul>
        </div>
      </div>

      <div className="jobs-footer__bar">
        <div className="jobs-footer__bar-inner">
          <div className="jobs-footer__bar-links">
            <a href={resolveUrl('/about-us#privacy')} className="jobs-footer__bar-link">Privacy</a>
            <a href={resolveUrl('/about-us#privacy')} className="jobs-footer__bar-link">Terms</a>
            <a href={resolveUrl('/contact')} className="jobs-footer__bar-link">Contact</a>
          </div>
          <span className="jobs-footer__copy">© 2026 SaarthiX. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
