interface LandingPageProps {
  onLaunch: () => void;
}

export default function LandingPage({ onLaunch }: LandingPageProps) {
  return (
    <div className="landing">
      {/* NAV */}
      <nav className="landing-nav">
        <span className="wordmark">Cue<em>track</em></span>
        <div style={{ flex: 1 }} />
        <a href="#/terms" className="landing-nav-link">Terms</a>
        <a href="#/privacy" className="landing-nav-link">Privacy</a>
        <button className="btn btn-primary btn-sm" onClick={onLaunch}>Open App</button>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-badge">Free &amp; browser-based — no sign-up required</div>
          <h1 className="landing-h1">
            Merge cue sheets.<br />
            <span className="landing-h1-accent">One authoritative document.</span>
          </h1>
          <p className="landing-subtitle">
            CueTrack helps stage managers, lighting designers, and production teams
            combine multiple cue sheet annotations into a single reconciled master.
            Upload CSVs, review conflicts side-by-side, and export a clean merged sheet
            — all without leaving your browser.
          </p>
          <div className="landing-cta-row">
            <button className="btn btn-primary" onClick={onLaunch} style={{ padding: '12px 32px', fontSize: 14 }}>
              Launch Sheet Merge →
            </button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="landing-section">
        <h2 className="landing-h2">How it works</h2>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-num">1</div>
            <h3 className="landing-step-title">Import</h3>
            <p className="landing-step-desc">
              Upload 2–5 CSV cue sheet exports. Tag each with the person or department who created it.
            </p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-num">2</div>
            <h3 className="landing-step-title">Compare</h3>
            <p className="landing-step-desc">
              CueTrack matches cues by type and timecode, highlights conflicts, and auto-merges agreements.
            </p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-num">3</div>
            <h3 className="landing-step-title">Review</h3>
            <p className="landing-step-desc">
              Walk through each conflict. Pick a value, enter a custom one, or load a reference video for context.
            </p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-num">4</div>
            <h3 className="landing-step-title">Export</h3>
            <p className="landing-step-desc">
              Download a merged CSV ready for import, plus an optional XLSX decision report.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="landing-section">
        <h2 className="landing-h2">Built for production teams</h2>
        <div className="landing-features">
          <div className="landing-feature">
            <div className="landing-feature-icon">🔒</div>
            <h3 className="landing-feature-title">100% client-side</h3>
            <p className="landing-feature-desc">
              Your cue sheets never leave your machine. All processing happens in the browser — nothing is uploaded to any server.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">⚡</div>
            <h3 className="landing-feature-title">Smart matching</h3>
            <p className="landing-feature-desc">
              Configurable timecode tolerance clusters cues from different annotators into matched groups automatically.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">🎬</div>
            <h3 className="landing-feature-title">Video reference</h3>
            <p className="landing-feature-desc">
              Load a rehearsal recording and CueTrack seeks to each conflict's timecode so you can verify in context.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">📊</div>
            <h3 className="landing-feature-title">Decision report</h3>
            <p className="landing-feature-desc">
              Export a full XLSX audit trail of every merge decision — who said what, and which value you chose.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">🎭</div>
            <h3 className="landing-feature-title">Multiple workflows</h3>
            <p className="landing-feature-desc">
              New show, recreation, or session comparison — choose the workflow that matches your process.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">🆓</div>
            <h3 className="landing-feature-title">Free forever</h3>
            <p className="landing-feature-desc">
              No accounts, no subscriptions, no limits. CueTrack is a free tool for the production community.
            </p>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="landing-section">
        <h2 className="landing-h2">Who it's for</h2>
        <div className="landing-usecases">
          <div className="landing-usecase">
            <h3 className="landing-usecase-title">Stage Managers</h3>
            <p className="landing-usecase-desc">
              Reconcile calling scripts from multiple tech runs into one definitive cue-by-cue document.
            </p>
          </div>
          <div className="landing-usecase">
            <h3 className="landing-usecase-title">Lighting Designers</h3>
            <p className="landing-usecase-desc">
              Merge cue lists from your assistant, associate, and your own notes into a single master.
            </p>
          </div>
          <div className="landing-usecase">
            <h3 className="landing-usecase-title">Production Teams</h3>
            <p className="landing-usecase-desc">
              Combine department-specific annotations (lights, audio, deck, rail) into a unified production cue sheet.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-section" style={{ textAlign: 'center', paddingBottom: 80 }}>
        <h2 className="landing-h2">Ready to merge?</h2>
        <p className="landing-subtitle" style={{ maxWidth: 500, margin: '0 auto 24px' }}>
          No sign-up. No install. Just open the tool and drop in your CSVs.
        </p>
        <button className="btn btn-primary" onClick={onLaunch} style={{ padding: '12px 32px', fontSize: 14 }}>
          Launch Sheet Merge →
        </button>
      </section>

      {/* FOOTER */}
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
