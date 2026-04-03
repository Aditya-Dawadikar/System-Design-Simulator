'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/shared/ThemeProvider';
import { useArchitectureStore } from '@/store/architectureStore';
import { useSimulationStore } from '@/store/simulationStore';
import { DEFAULT_TEMPLATE } from '@/templates/defaultTemplate';
import { ARCHITECTURE_LIBRARY, type ArchitectureEntry } from '@/templates/architectures';
import { SCENARIO_LIBRARY, type ScenarioEntry } from '@/templates/scenarios';

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner:     'var(--accent-green)',
  intermediate: 'var(--accent-yellow)',
  advanced:     'var(--accent-red)',
};

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function matchesSearch(searchTerm: string, parts: Array<string | undefined>) {
  if (!searchTerm) {
    return true;
  }

  return parts.some((part) => part?.toLowerCase().includes(searchTerm));
}

export default function Dashboard() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const loadTemplate = useArchitectureStore((s) => s.loadTemplate);
  const stop = useSimulationStore((s) => s.stop);
  const reset = useSimulationStore((s) => s.reset);

  function openPlayground() {
    router.push('/simulator');
  }

  function openFreshPlayground() {
    stop();
    reset();
    loadTemplate(DEFAULT_TEMPLATE);
    router.push('/simulator');
  }

  function openArchitecture(entry: ArchitectureEntry) {
    stop();
    reset();
    loadTemplate(entry.template);
    router.push('/simulator');
  }

  function openScenario(entry: ScenarioEntry) {
    stop();
    reset();
    loadTemplate(entry.template, entry.id);
    router.push('/simulator');
  }

  const ARCH_PAGE_SIZE = 3;
  const SCENARIO_PAGE_SIZE = 3;
  const [searchQuery, setSearchQuery] = useState('');
  const [archVisible, setArchVisible] = useState(ARCH_PAGE_SIZE);
  const [scenarioVisible, setScenarioVisible] = useState(SCENARIO_PAGE_SIZE);

  const searchTerm = normalizeSearchValue(searchQuery);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setArchVisible(ARCH_PAGE_SIZE);
    setScenarioVisible(SCENARIO_PAGE_SIZE);
  }

  const filteredArchitectures = ARCHITECTURE_LIBRARY.filter((entry) =>
    matchesSearch(searchTerm, [entry.name, entry.description, entry.difficulty, ...entry.tags])
  );

  const filteredScenarios = SCENARIO_LIBRARY.filter((entry) =>
    matchesSearch(searchTerm, [
      entry.name,
      entry.description,
      entry.difficulty,
      ...entry.tags,
      entry.docs.overview,
      ...entry.docs.functionalRequirements,
      ...entry.docs.nonFunctionalRequirements,
      ...entry.docs.constraints,
    ])
  );

  const visibleArchitectures = filteredArchitectures.slice(0, archVisible);
  const visibleScenarios = filteredScenarios.slice(0, scenarioVisible);
  const hasSearchResults = filteredArchitectures.length > 0 || filteredScenarios.length > 0;

  return (
    <div style={{
      height: '100vh',
      background: 'var(--bg-base)',
      fontFamily: "'JetBrains Mono', monospace",
      color: 'var(--text)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        height: 52,
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        gap: 12,
        flexShrink: 0,
      }}>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: 14, letterSpacing: 3 }}>
          SYSTEM DESIGN SIMULATOR
        </span>
        <span style={{ color: 'var(--border)', fontSize: 11 }}>|</span>
        <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>Drag · Wire · Simulate</span>
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: 4,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '40px 40px 60px', maxWidth: 1280, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Hero label */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>
            {'// SELECT MODE'}
          </div>
          <div style={{ width: 40, height: 2, background: 'var(--accent-cyan)', borderRadius: 1 }} />
        </div>

        {/* Playground card */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Continue / Open */}
            <PlaygroundCard
              title="Open Playground"
              subtitle="Resume your last session"
              description="Continue where you left off. Your canvas is saved automatically in the browser."
              icon="◈"
              accentColor="var(--accent-cyan)"
              onClick={openPlayground}
              primary
            />
            {/* New blank */}
            <PlaygroundCard
              title="New Playground"
              subtitle="Start fresh"
              description="Load a blank starter canvas with a traffic generator and an app server."
              icon="+"
              accentColor="var(--accent-green)"
              onClick={openFreshPlayground}
            />
          </div>
        </div>

        <div style={{ marginBottom: 48 }}>
          <div style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: 'var(--text)', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                  FIND TEMPLATES ACROSS LIBRARIES
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>
                  Search architecture library and real-world scenarios from one input.
                </div>
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: 10, letterSpacing: 1 }}>
                {filteredArchitectures.length} architectures · {filteredScenarios.length} scenarios
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--accent-cyan)',
                fontSize: 13,
                pointerEvents: 'none',
              }}>
                /&gt;
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.currentTarget.value)}
                placeholder="Search by name, tag, difficulty, domain, or requirement"
                aria-label="Search architecture library and real-world scenarios"
                style={{
                  width: '100%',
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  padding: '12px 14px 12px 40px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {searchTerm && !hasSearchResults && (
              <div style={{
                border: '1px solid var(--accent-red)33',
                background: 'var(--accent-red)0f',
                color: 'var(--text-dim)',
                borderRadius: 6,
                padding: '12px 14px',
                fontSize: 11,
                lineHeight: 1.6,
              }}>
                No architecture templates or scenarios matched “{searchQuery.trim()}”. Try a component name, domain, or tag.
              </div>
            )}
          </div>
        </div>

        {/* Architecture Library */}
        <div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>
              {'// ARCHITECTURE LIBRARY'}
            </div>
            <div style={{ width: 40, height: 2, background: 'var(--accent-purple)', borderRadius: 1 }} />
            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 10 }}>
              Pre-built reference architectures. Load one into the simulator to explore its behaviour.
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {visibleArchitectures.map((entry) => (
              <ArchitectureCard
                key={entry.id}
                entry={entry}
                onLoad={() => openArchitecture(entry)}
              />
            ))}
          </div>
          {filteredArchitectures.length === 0 && searchTerm && (
            <EmptyLibraryState label="architectures" accentColor="var(--accent-purple)" />
          )}
          {archVisible < filteredArchitectures.length && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <button
                onClick={() => setArchVisible((v) => Math.min(v + ARCH_PAGE_SIZE, filteredArchitectures.length))}
                style={{
                  padding: '7px 24px',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  background: 'transparent',
                  color: 'var(--text-dim)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-purple)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-purple)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
                }}
              >
                Load more ({filteredArchitectures.length - archVisible} remaining)
              </button>
            </div>
          )}
        </div>

        {/* Real-World Scenarios */}
        <div style={{ marginTop: 56 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>
              {'// REAL-WORLD SCENARIOS'}
            </div>
            <div style={{ width: 40, height: 2, background: 'var(--accent-orange)', borderRadius: 1 }} />
            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 10 }}>
              Industry-specific architectures modelled after production systems. Each scenario is tuned to surface realistic failure modes.
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {visibleScenarios.map((entry) => (
              <ScenarioCard
                key={entry.id}
                entry={entry}
                onLoad={() => openScenario(entry)}
              />
            ))}
          </div>
          {filteredScenarios.length === 0 && searchTerm && (
            <EmptyLibraryState label="scenarios" accentColor="var(--accent-orange)" />
          )}
          {scenarioVisible < filteredScenarios.length && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <button
                onClick={() => setScenarioVisible((v) => Math.min(v + SCENARIO_PAGE_SIZE, filteredScenarios.length))}
                style={{
                  padding: '7px 24px',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  background: 'transparent',
                  color: 'var(--text-dim)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-orange)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-orange)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
                }}
              >
                Load more ({filteredScenarios.length - scenarioVisible} remaining)
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Playground Card
// ---------------------------------------------------------------------------

interface PlaygroundCardProps {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  accentColor: string;
  onClick: () => void;
  primary?: boolean;
}

function PlaygroundCard({ title, subtitle, description, icon, accentColor, onClick, primary }: PlaygroundCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--bg-panel)',
        border: `1px solid ${primary ? accentColor : 'var(--border)'}`,
        borderRadius: 8,
        padding: '24px 28px',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: "'JetBrains Mono', monospace",
        color: 'var(--text)',
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = accentColor;
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-base)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = primary ? accentColor : 'var(--border)';
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-panel)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          fontSize: 22,
          color: accentColor,
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-base)',
          border: `1px solid ${accentColor}22`,
          borderRadius: 6,
        }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, letterSpacing: 1 }}>{title}</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>{description}</div>
    </button>
  );
}

function EmptyLibraryState({ label, accentColor }: { label: string; accentColor: string }) {
  return (
    <div style={{
      marginTop: 16,
      padding: '14px 16px',
      border: `1px dashed ${accentColor}55`,
      borderRadius: 6,
      color: 'var(--text-dim)',
      fontSize: 11,
      background: 'var(--bg-panel)',
    }}>
      No {label} matched the current search.
    </div>
  );
}

// ---------------------------------------------------------------------------
// Architecture Card
// ---------------------------------------------------------------------------

interface ArchitectureCardProps {
  entry: ArchitectureEntry;
  onLoad: () => void;
}

// ---------------------------------------------------------------------------
// Scenario Card  (declared early so it's in scope below)
// ---------------------------------------------------------------------------

interface ScenarioCardProps {
  entry: ScenarioEntry;
  onLoad: () => void;
}

function ArchitectureCard({ entry, onLoad }: ArchitectureCardProps) {
  const diffColor = DIFFICULTY_COLOR[entry.difficulty] ?? 'var(--text-dim)';
  const nodeCount = entry.template.nodes.length;
  const edgeCount = entry.template.edges.length;

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--text-dim)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{entry.name}</div>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          color: diffColor,
          border: `1px solid ${diffColor}44`,
          borderRadius: 3,
          padding: '1px 6px',
          whiteSpace: 'nowrap',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}>
          {entry.difficulty}
        </span>
      </div>

      {/* Description */}
      <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.65 }}>{entry.description}</div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {entry.tags.map((tag) => (
          <span key={tag} style={{
            fontSize: 9,
            color: 'var(--accent-cyan)',
            background: 'var(--accent-cyan)11',
            border: '1px solid var(--accent-cyan)33',
            borderRadius: 3,
            padding: '2px 7px',
            letterSpacing: 0.5,
          }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          {nodeCount} nodes · {edgeCount} edges
        </span>
        <button
          onClick={onLoad}
          style={{
            padding: '5px 14px',
            border: '1px solid var(--accent-green)',
            borderRadius: 4,
            background: 'transparent',
            color: 'var(--accent-green)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.05em',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-green)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--bg-base)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-green)';
          }}
        >
          Load →
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scenario Card
// ---------------------------------------------------------------------------

function ScenarioCard({ entry, onLoad }: ScenarioCardProps) {
  const diffColor = DIFFICULTY_COLOR[entry.difficulty] ?? 'var(--text-dim)';
  const nodeCount = entry.template.nodes.length;
  const edgeCount = entry.template.edges.length;

  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition: 'border-color 0.15s',
        borderLeft: '3px solid var(--accent-orange)',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-orange)'; }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'var(--border)';
        el.style.borderLeftColor = 'var(--accent-orange)';
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{entry.name}</div>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          color: diffColor,
          border: `1px solid ${diffColor}44`,
          borderRadius: 3,
          padding: '1px 6px',
          whiteSpace: 'nowrap',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}>
          {entry.difficulty}
        </span>
      </div>

      {/* Description */}
      <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.65 }}>{entry.description}</div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {entry.tags.map((tag) => (
          <span key={tag} style={{
            fontSize: 9,
            color: 'var(--accent-orange)',
            background: 'var(--accent-orange)11',
            border: '1px solid var(--accent-orange)33',
            borderRadius: 3,
            padding: '2px 7px',
            letterSpacing: 0.5,
          }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          {nodeCount} nodes · {edgeCount} edges
        </span>
        <button
          onClick={onLoad}
          style={{
            padding: '5px 14px',
            border: '1px solid var(--accent-orange)',
            borderRadius: 4,
            background: 'transparent',
            color: 'var(--accent-orange)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.05em',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-orange)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--bg-base)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-orange)';
          }}
        >
          Load →
        </button>
      </div>
    </div>
  );
}
