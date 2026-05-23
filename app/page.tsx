import Link from 'next/link'
import GraphHero from '@/components/landing/GraphHero'

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: 'var(--font-serif), Inter, system-ui, sans-serif',
        overflowX: 'hidden',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 48px',
          borderBottom: '1px solid #e0f2fe',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.4px' }}>
          idea<span style={{ color: '#0ea5e9' }}>vault</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a
            href="https://github.com"
            style={{ fontSize: 14, color: '#64748b', textDecoration: 'none' }}
          >
            GitHub
          </a>
          <Link
            href="/auth/login"
            style={{ fontSize: 14, color: '#64748b', textDecoration: 'none' }}
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: '#0ea5e9',
              border: 'none',
              padding: '8px 20px',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          minHeight: 'calc(100vh - 61px)',
          alignItems: 'center',
        }}
      >
        {/* Left: copy */}
        <div style={{ padding: '80px 64px 80px 48px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 100,
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 500,
              color: '#0284c7',
              letterSpacing: '0.3px',
              marginBottom: 32,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#0ea5e9',
                display: 'inline-block',
              }}
            />
            AI-powered knowledge base
          </div>

          <h1
            style={{
              fontSize: 'clamp(42px, 5vw, 68px)',
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: '-2.5px',
              marginBottom: 24,
              color: '#0f172a',
            }}
          >
            Your ideas,
            <br />
            <span style={{ color: '#0ea5e9' }}>interconnected.</span>
          </h1>

          <p
            style={{
              fontSize: 18,
              color: '#475569',
              lineHeight: 1.7,
              maxWidth: 440,
              marginBottom: 44,
            }}
          >
            Drop a raw thought and watch AI structure it into a living knowledge
            graph. Your encrypted second brain — self-hostable, model-agnostic.
          </p>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link
              href="/auth/signup"
              style={{
                display: 'inline-block',
                background: '#0ea5e9',
                color: '#fff',
                fontWeight: 600,
                fontSize: 15,
                padding: '13px 30px',
                borderRadius: 10,
                textDecoration: 'none',
                letterSpacing: '-0.2px',
                boxShadow: '0 4px 24px rgba(14,165,233,0.25)',
              }}
            >
              Start for free
            </Link>
            <a
              href="https://github.com"
              style={{
                display: 'inline-block',
                background: 'transparent',
                color: '#64748b',
                fontSize: 15,
                padding: '13px 24px',
                borderRadius: 10,
                textDecoration: 'none',
                border: '1px solid #e2e8f0',
              }}
            >
              Self-host →
            </a>
          </div>

          {/* Social proof strip */}
          <div
            style={{
              marginTop: 48,
              paddingTop: 32,
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              gap: 32,
            }}
          >
            {[
              { value: 'AES-256', label: 'encrypted' },
              { value: 'BYOK', label: 'any LLM model' },
              { value: 'Open', label: 'source' },
            ].map(stat => (
              <div key={stat.value}>
                <div
                  style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: graph */}
        <div
          style={{
            height: '100%',
            minHeight: 520,
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 60%, #f8faff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 48,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle dot grid */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(circle, #bae6fd 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              opacity: 0.4,
            }}
          />
          <div style={{ position: 'relative', width: '100%', maxWidth: 480, aspectRatio: '1' }}>
            <GraphHero />
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section
        style={{
          borderTop: '1px solid #e0f2fe',
          padding: '64px 48px',
          background: '#f8faff',
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
          }}
        >
          {[
            {
              icon: '⬡',
              title: 'AI structuring',
              desc: 'Raw thoughts become rich, interlinked wiki-style pages automatically.',
            },
            {
              icon: '◎',
              title: 'Knowledge graph',
              desc: 'See every idea in context through a live force-directed network.',
            },
            {
              icon: '⊠',
              title: 'AES-256 encrypted',
              desc: 'Per-user keys. Everything stored is readable only by you.',
            },
            {
              icon: '⌁',
              title: 'Bring your own key',
              desc: 'Works with Anthropic, OpenAI, Gemini, or a local Ollama model.',
            },
          ].map((feat, i) => (
            <div
              key={feat.title}
              style={{
                padding: '32px 36px',
                borderRight: i < 3 ? '1px solid #e0f2fe' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  color: '#38bdf8',
                  marginBottom: 14,
                  fontWeight: 300,
                  lineHeight: 1,
                }}
              >
                {feat.icon}
              </div>
              <div
                style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}
              >
                {feat.title}
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.65 }}>
                {feat.desc}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
