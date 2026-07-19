import { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProjectInfo {
  name: string;
  languages: string[];
  frameworks: string[];
  packageManager: string;
  buildTool: string;
  testFramework: string;
  linter: string;
  dirs: string[];
  hasSrc: boolean;
  hasTests: boolean;
  hasDocs: boolean;
  hasCI: boolean;
  hasDocker: boolean;
}

interface ContextSection {
  icon: string;
  title: string;
  content: string;
  present: boolean;
  score: number;
}

interface Suggestion {
  icon: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  detail: string;
}

// ─── Demo Data ──────────────────────────────────────────────────────────────

const DEMO_PROJECT: ProjectInfo = {
  name: 'my-awesome-app',
  languages: ['TypeScript', 'JavaScript', 'CSS'],
  frameworks: ['Next.js', 'React', 'Tailwind CSS'],
  packageManager: 'pnpm',
  buildTool: 'Next.js',
  testFramework: 'Vitest',
  linter: 'ESLint',
  dirs: ['src/components', 'src/app', 'src/lib', 'src/hooks', 'public', 'tests'],
  hasSrc: true,
  hasTests: true,
  hasDocs: true,
  hasCI: true,
  hasDocker: false,
};

const DEMO_SECTIONS: ContextSection[] = [
  { icon: '📋', title: 'Project Overview', content: 'Full-stack Next.js application with TypeScript and Tailwind CSS', present: true, score: 95 },
  { icon: '🛠️', title: 'Tech Stack', content: 'Next.js 15, React 19, TypeScript 5.5, Tailwind CSS, Prisma, PostgreSQL', present: true, score: 90 },
  { icon: '💻', title: 'Commands', content: 'dev, build, start, test, lint, typecheck, format', present: true, score: 88 },
  { icon: '🏛️', title: 'Architecture', content: 'App Router, Server Components, API routes, component library, utilities', present: true, score: 85 },
  { icon: '📐', title: 'Conventions', content: 'Functional components, named exports, co-located tests, strict TypeScript', present: true, score: 80 },
  { icon: '🛡️', title: 'Guardrails', content: 'No `any`, no new deps without approval, no inline styles', present: true, score: 92 },
  { icon: '📚', title: 'References', content: 'API docs, component guidelines, data fetching patterns', present: false, score: 30 },
];

const DEMO_SUGGESTIONS: Suggestion[] = [
  { icon: '📚', severity: 'medium', message: 'Add References section', detail: 'Link to your API documentation and coding guidelines for deeper context.' },
  { icon: '📏', severity: 'low', message: 'Consider splitting long file', detail: 'Your CLAUDE.md is 180 lines. Consider progressive disclosure with `@imports`.' },
];

// ─── Components ─────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 120, strokeWidth = 8 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#3fb950' : score >= 60 ? '#d29922' : '#f85149';

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#21262d"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <div className="score-text">
        <span className="score-value">{score}</span>
        <span className="score-label">/100</span>
      </div>
    </div>
  );
}

function CoverageBar({ label, covered, total }: { label: string; covered: number; total: number }) {
  const pct = Math.round((covered / total) * 100);
  return (
    <div className="coverage-bar">
      <div className="coverage-label">
        <span>{label}</span>
        <span>{covered}/{total}</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectInfo }) {
  return (
    <div className="card project-card">
      <div className="card-header">
        <span className="card-icon">📁</span>
        <h3>Project Overview</h3>
      </div>
      <div className="project-name">
        <span className="name-label">{project.name}</span>
        <span className="pm-badge">{project.packageManager}</span>
      </div>
      <div className="project-details">
        <div className="detail-row">
          <span className="detail-label">Languages</span>
          <div className="detail-tags">
            {project.languages.map(l => <span key={l} className="tag tag-lang">{l}</span>)}
          </div>
        </div>
        <div className="detail-row">
          <span className="detail-label">Frameworks</span>
          <div className="detail-tags">
            {project.frameworks.map(f => <span key={f} className="tag tag-fw">{f}</span>)}
          </div>
        </div>
        <div className="detail-row">
          <span className="detail-label">Tools</span>
          <div className="detail-tags">
            {project.buildTool && <span className="tag tag-tool">{project.buildTool}</span>}
            {project.testFramework && <span className="tag tag-tool">{project.testFramework}</span>}
            {project.linter && <span className="tag tag-tool">{project.linter}</span>}
          </div>
        </div>
      </div>
      <div className="project-features">
        {project.hasSrc && <span className="feature">📂 src/</span>}
        {project.hasTests && <span className="feature">🧪 tests/</span>}
        {project.hasDocs && <span className="feature">📖 docs/</span>}
        {project.hasCI && <span className="feature">⚙️ CI</span>}
        {project.hasDocker && <span className="feature">🐳 Docker</span>}
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: ContextSection }) {
  return (
    <div className={`card section-card ${section.present ? '' : 'missing'}`}>
      <div className="section-header">
        <span className="section-icon">{section.icon}</span>
        <div className="section-info">
          <span className="section-title">{section.title}</span>
          <span className="section-preview">{section.content}</span>
        </div>
        <div className="section-score">
          <span className={`score-badge ${section.score >= 70 ? 'good' : section.score >= 40 ? 'ok' : 'bad'}`}>
            {section.score}%
          </span>
          {!section.present && <span className="missing-badge">Missing</span>}
        </div>
      </div>
    </div>
  );
}

function ContextPreview({ sections }: { sections: ContextSection[] }) {
  const content = `# My Awesome App\n\n> Auto-generated by ContextPilot\n\n${
    sections.filter(s => s.present).map(s => 
      `## ${s.icon} ${s.title}\n${s.content}`
    ).join('\n\n')
  }`;

  return (
    <div className="card preview-card">
      <div className="card-header">
        <span className="card-icon">👁️</span>
        <h3>Live Preview</h3>
        <span className="preview-type">CLAUDE.md</span>
      </div>
      <pre className="preview-content">{content}</pre>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const severityColors: Record<string, string> = {
    high: '#f85149',
    medium: '#d29922',
    low: '#58a6ff',
  };

  return (
    <div className="card suggestion-card">
      <div className="suggestion-icon">{suggestion.icon}</div>
      <div className="suggestion-body">
        <div className="suggestion-header">
          <span className="suggestion-msg">{suggestion.message}</span>
          <span className="suggestion-severity" style={{ color: severityColors[suggestion.severity] }}>
            {suggestion.severity}
          </span>
        </div>
        <p className="suggestion-detail">{suggestion.detail}</p>
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────

export default function App() {
  const [project] = useState<ProjectInfo>(DEMO_PROJECT);
  const [sections] = useState<ContextSection[]>(DEMO_SECTIONS);
  const [suggestions] = useState<Suggestion[]>(DEMO_SUGGESTIONS);
  const [selectedTab, setSelectedTab] = useState<'claude' | 'cursor'>('claude');
  const [activeView, setActiveView] = useState<'overview' | 'preview' | 'suggestions'>('overview');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated background
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext('2d');
    if (!context) return;

    const canvas = canvasEl as HTMLCanvasElement;
    const ctx = context;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number }> = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
      });
    }

    let animId: number;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(88, 166, 255, 0.15)';
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      animId = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Calculate aggregate metrics
  const overallScore = Math.round(sections.reduce((a, s) => a + s.score, 0) / sections.length);
  const coverageCount = sections.filter(s => s.present).length;
  const totalSections = sections.length;

  return (
    <div className="app">
      <canvas ref={canvasRef} className="bg-canvas" />

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo">🧠</span>
          <div className="logo-text">
            <h1>ContextPilot</h1>
            <span className="subtitle">AI Context Dashboard</span>
          </div>
        </div>
        <div className="header-right">
          <div className="status-badge">
            <span className="status-dot" />
            <span>Project Scanned</span>
          </div>
          <button className="btn btn-primary" onClick={() => {}}>↻ Rescan</button>
        </div>
      </header>

      <main className="main">
        {/* Top Metrics Row */}
        <section className="metrics-row">
          <div className="metric-card score-card">
            <ScoreRing score={overallScore} />
            <div className="metric-info">
              <span className="metric-value">{overallScore}/100</span>
              <span className="metric-label">Overall Context Score</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{coverageCount}/{totalSections}</div>
            <div className="metric-label">Sections Covered</div>
            <CoverageBar label="" covered={coverageCount} total={totalSections} />
          </div>
          <div className="metric-card">
            <div className="metric-value">{project.frameworks.length}</div>
            <div className="metric-label">Frameworks</div>
            <div className="metric-tags">
              {project.frameworks.map(f => <span key={f} className="tag tag-fw">{f}</span>)}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{project.languages.length}</div>
            <div className="metric-label">Languages</div>
            <div className="metric-tags">
              {project.languages.map(l => <span key={l} className="tag tag-lang">{l}</span>)}
            </div>
          </div>
        </section>

        {/* Tab Bar */}
        <div className="tab-bar">
          <button className={`tab ${activeView === 'overview' ? 'active' : ''}`} onClick={() => setActiveView('overview')}>
            📊 Overview
          </button>
          <button className={`tab ${activeView === 'preview' ? 'active' : ''}`} onClick={() => setActiveView('preview')}>
            👁️ Preview
          </button>
          <button className={`tab ${activeView === 'suggestions' ? 'active' : ''}`} onClick={() => setActiveView('suggestions')}>
            💡 Suggestions ({suggestions.length})
          </button>
          <div className="tab-spacer" />
          <div className="format-tabs">
            <button className={`format-tab ${selectedTab === 'claude' ? 'active' : ''}`} onClick={() => setSelectedTab('claude')}>
              CLAUDE.md
            </button>
            <button className={`format-tab ${selectedTab === 'cursor' ? 'active' : ''}`} onClick={() => setSelectedTab('cursor')}>
              .cursorrules
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="content-grid">
          {activeView === 'overview' && (
            <>
              <ProjectCard project={project} />
              <div className="sections-list">
                {sections.map(s => <SectionCard key={s.title} section={s} />)}
              </div>
            </>
          )}

          {activeView === 'preview' && (
            <div className="preview-full">
              <ContextPreview sections={sections} />
            </div>
          )}

          {activeView === 'suggestions' && (
            <div className="suggestions-list">
              <div className="card suggestions-header">
                <h3>💡 Improvement Suggestions</h3>
                <p>These recommendations will help your AI tools understand your project better.</p>
              </div>
              {suggestions.map((s, i) => <SuggestionCard key={i} suggestion={s} />)}
              {suggestions.length === 0 && (
                <div className="card empty-state">
                  <span className="empty-icon">🎉</span>
                  <h3>No Suggestions</h3>
                  <p>Your context is well-optimized! Your AI tools have everything they need.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <section className="quick-actions">
          <h3>🚀 Quick Actions</h3>
          <div className="action-grid">
            <button className="action-card">
              <span className="action-icon">📋</span>
              <span className="action-title">Copy CLAUDE.md</span>
              <span className="action-desc">Copy to clipboard</span>
            </button>
            <button className="action-card">
              <span className="action-icon">💾</span>
              <span className="action-title">Save All Files</span>
              <span className="action-desc">Write CLAUDE.md + .cursorrules</span>
            </button>
            <button className="action-card">
              <span className="action-icon">📤</span>
              <span className="action-title">Export Config</span>
              <span className="action-desc">contextpilot.json config</span>
            </button>
            <button className="action-card">
              <span className="action-icon">🔄</span>
              <span className="action-title">Enable Watch</span>
              <span className="action-desc">Auto-update on changes</span>
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>ContextPilot v0.1.0</span>
        <a href="https://github.com/namangoyal3/contextpilot" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">MCP Spec</a>
      </footer>
    </div>
  );
}
