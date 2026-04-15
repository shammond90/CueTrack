export default function TermsPage() {
  return (
    <div className="legal-page">
      <nav className="landing-nav">
        <a href="#/" className="wordmark" style={{ textDecoration: 'none' }}>Cue<em>track</em></a>
        <div style={{ flex: 1 }} />
        <a href="#/" className="landing-nav-link">Home</a>
        <a href="#/privacy" className="landing-nav-link">Privacy</a>
        <a href="https://app.cuetrack.com" className="landing-nav-link">Open App</a>
      </nav>

      <div className="legal-body">
        <h1>Terms &amp; Conditions</h1>
        <p className="legal-updated">Last updated: April 2025</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using CueTrack ("the Service"), you agree to be bound by these
          Terms &amp; Conditions. If you do not agree, please do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          CueTrack is a free, browser-based tool for merging and reconciling cue sheet data.
          All processing occurs entirely on the client side within your web browser. No data
          is uploaded to or stored on any server.
        </p>

        <h2>3. No Account Required</h2>
        <p>
          The Service does not require registration or an account. There are no login
          credentials or user profiles associated with your use of CueTrack.
        </p>

        <h2>4. Intellectual Property</h2>
        <p>
          The CueTrack name, design, and codebase are the property of cuetrack.com. Your cue
          sheet data remains entirely your own. The Service does not claim any rights to
          content you process using the tool.
        </p>

        <h2>5. Client-Side Processing</h2>
        <p>
          All file parsing, matching, merging, and exporting happens within your browser. Your
          files are never transmitted over the network. This means your data stays private by
          design — not by policy alone.
        </p>

        <h2>6. Disclaimer of Warranties</h2>
        <p>
          The Service is provided "as is" and "as available" without warranties of any kind,
          either express or implied, including but not limited to the implied warranties of
          merchantability, fitness for a particular purpose, or non-infringement. We do not
          warrant that the Service will be uninterrupted, error-free, or that the results
          obtained from the Service will be accurate or reliable.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          In no event shall cuetrack.com be liable for any indirect, incidental, special,
          consequential, or punitive damages arising out of or related to your use of the
          Service, including but not limited to loss of data, loss of revenue, or production
          delays, whether or not we have been advised of the possibility of such damages.
        </p>

        <h2>8. Use at Your Own Risk</h2>
        <p>
          CueTrack is a productivity tool. You are responsible for reviewing all merged
          output before using it in a production environment. Always verify critical cue
          data against original sources.
        </p>

        <h2>9. Modifications</h2>
        <p>
          We reserve the right to modify these Terms at any time. Changes will be reflected
          on this page with an updated date. Continued use of the Service after changes
          constitutes acceptance of the revised Terms.
        </p>

        <h2>10. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with applicable law,
          without regard to conflict-of-law principles.
        </p>

        <h2>11. Contact</h2>
        <p>
          For questions about these Terms, please visit{' '}
          <a href="https://cuetrack.com">cuetrack.com</a>.
        </p>
      </div>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="wordmark" style={{ fontSize: 16 }}>Cue<em>track</em></span>
          <div className="landing-footer-links">
            <a href="#/terms">Terms &amp; Conditions</a>
            <a href="#/privacy">Privacy Policy</a>
            <a href="https://app.cuetrack.com">Open App</a>
          </div>
          <div className="landing-footer-copy">
            © {new Date().getFullYear()} cuetrack.com. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
