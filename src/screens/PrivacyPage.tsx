export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <nav className="landing-nav">
        <a href="#/" className="wordmark" style={{ textDecoration: 'none' }}>Cue<em>track</em></a>
        <div style={{ flex: 1 }} />
        <a href="#/" className="landing-nav-link">Home</a>
        <a href="#/terms" className="landing-nav-link">Terms</a>
        <a href="#/merge" className="landing-nav-link">Open App</a>
      </nav>

      <div className="legal-body">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: April 2025</p>

        <h2>Overview</h2>
        <p>
          CueTrack is designed with privacy at its core. The tool runs entirely in your
          browser — no data is sent to, processed by, or stored on any server. This
          privacy policy explains what data we do and do not collect.
        </p>

        <h2>Data We Do NOT Collect</h2>
        <ul>
          <li><strong>Cue sheet files:</strong> Your CSV and XLSX files are parsed and processed entirely in the browser. They are never uploaded or transmitted.</li>
          <li><strong>Personal information:</strong> We do not ask for or collect your name, email address, or any other personal data.</li>
          <li><strong>Usage telemetry:</strong> We do not track clicks, page views, or feature usage within the application.</li>
          <li><strong>Accounts:</strong> There are no accounts, logins, or user profiles.</li>
        </ul>

        <h2>Cookies</h2>
        <p>
          CueTrack does not set any cookies. The hosting provider (Vercel) may use
          essential cookies for content delivery, but no tracking or advertising cookies
          are used.
        </p>

        <h2>Local Storage</h2>
        <p>
          The application may use your browser's local storage or session storage for
          UI preferences (such as workflow mode selection). This data never leaves your
          device and can be cleared through your browser settings at any time.
        </p>

        <h2>Third-Party Services</h2>
        <p>
          CueTrack is hosted on Vercel. Vercel may collect standard web server logs
          (IP address, browser type, timestamps) as part of normal content delivery.
          Please refer to{' '}
          <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
            Vercel's Privacy Policy
          </a>{' '}
          for details on their data practices.
        </p>
        <p>
          No other third-party analytics, advertising, or tracking services are used.
        </p>

        <h2>Data Security</h2>
        <p>
          Because your data is processed entirely client-side, it is inherently protected
          from server-side breaches. The site is served over HTTPS to protect the integrity
          of the application code delivered to your browser.
        </p>

        <h2>Children's Privacy</h2>
        <p>
          CueTrack is a professional production tool and is not directed at children under
          13. We do not knowingly collect information from children.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Changes will be posted on
          this page with an updated revision date. Your continued use of CueTrack after
          changes are posted constitutes acceptance of the revised policy.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about this Privacy Policy, please visit{' '}
          <a href="https://cuetrack.com">cuetrack.com</a>.
        </p>
      </div>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="wordmark" style={{ fontSize: 16 }}>Cue<em>track</em></span>
          <div className="landing-footer-links">
            <a href="#/terms">Terms &amp; Conditions</a>
            <a href="#/privacy">Privacy Policy</a>
            <a href="#/merge">Open App</a>
          </div>
          <div className="landing-footer-copy">
            © {new Date().getFullYear()} cuetrack.com. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
