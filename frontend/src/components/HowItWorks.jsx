import React from 'react';

const STEPS = [
  {
    num: '01', icon: '📄',
    title: 'Upload Your Resume',
    desc: 'Upload your PDF resume for automatic skill extraction. Our NLP engine identifies technical and soft skills from your experience.',
    color: 'var(--accent)',
  },
  {
    num: '02', icon: '🎯',
    title: 'Choose Your Target Role',
    desc: 'Select from 20+ engineering and tech roles. Each role is backed by 500+ real job postings with weighted skill requirements.',
    color: 'var(--teal)',
  },
  {
    num: '03', icon: '⚡',
    title: 'Get Your Compatibility Score',
    desc: 'Our ML engine uses TF-IDF vectorization and cosine similarity to compute how well your skills match the target role.',
    color: 'var(--amber)',
  },
  {
    num: '04', icon: '🗺️',
    title: 'Follow Your Personalized Roadmap',
    desc: 'Receive a week-by-week learning plan with curated free resources to close your skill gaps and land your dream role.',
    color: '#e879f9',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={{
      maxWidth: 1100, margin: '0 auto', padding: '80px 24px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--teal)',
          letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12,
        }}>[ HOW IT WORKS ]</div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 36,
          letterSpacing: '-1px',
        }}>Four Steps to Clarity</h2>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 20, position: 'relative',
      }}>
        {STEPS.map((step, i) => (
          <div key={step.num} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 28, position: 'relative',
            overflow: 'hidden', transition: 'transform 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = step.color;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
          >
            {/* Step number */}
            <div style={{
              position: 'absolute', top: 16, right: 16,
              fontFamily: 'var(--font-mono)', fontSize: 40, fontWeight: 700,
              color: `${step.color}10`, lineHeight: 1,
            }}>{step.num}</div>

            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, ${step.color}, transparent)`,
            }} />

            <div style={{ fontSize: 28, marginBottom: 16 }}>{step.icon}</div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
              marginBottom: 10, color: 'var(--text-primary)', lineHeight: 1.3,
            }}>{step.title}</h3>
            <p style={{
              color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7,
            }}>{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Tech stack callout */}
      <div style={{
        marginTop: 48, padding: '24px 32px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, display: 'flex', flexWrap: 'wrap', gap: 24,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '1px' }}>BUILT WITH</span>
        {[
          { label: 'React.js', color: '#61dafb' },
          { label: 'Node.js', color: '#68a063' },
          { label: 'Python Flask', color: '#ffd43b' },
          { label: 'TF-IDF', color: 'var(--accent-bright)' },
          { label: 'Cosine Similarity', color: 'var(--teal)' },
          { label: 'pdfplumber', color: 'var(--amber)' },
          { label: 'scikit-learn', color: '#f97316' },
        ].map(tech => (
          <span key={tech.label} style={{
            fontFamily: 'var(--font-mono)', fontSize: 12,
            color: tech.color, background: `${tech.color}12`,
            padding: '4px 12px', borderRadius: 100,
            border: `1px solid ${tech.color}30`,
          }}>{tech.label}</span>
        ))}
      </div>
    </section>
  );
}
