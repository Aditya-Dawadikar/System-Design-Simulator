'use client';
import { create } from 'zustand';
import type { TrafficPattern, NodeMetrics, EdgeMetrics, LogEvent } from '@/types';
import { runSimulationTick } from '@/simulation/SimulationEngine';
import { useArchitectureStore } from './architectureStore';

interface SimulationStore {
  running: boolean;
  tick: number;
  peakRps: number;
  pattern: TrafficPattern;
  nodeMetrics: Record<string, NodeMetrics>;
  edgeMetrics: Record<string, EdgeMetrics>;
  events: LogEvent[];
  history: Record<string, number[]>;
  _intervalId: ReturnType<typeof setInterval> | null;

  start: () => void;
  stop: () => void;
  reset: () => void;
  setPeakRps: (rps: number) => void;
  setPattern: (pattern: TrafficPattern) => void;
  _tick: () => void;
}

function getTrafficMultiplier(pattern: TrafficPattern, tick: number): number {
  switch (pattern) {
    case 'steady': return 1.0;
    case 'ramp':   return Math.min(1 + (tick / 60) * 0.6, 1.6);
    case 'spike':  return (tick % 30) < 5 ? 3.5 : 0.35;
    case 'wave':   return 0.5 + 0.5 * Math.sin((tick / 20) * Math.PI * 2);
    case 'chaos':  return 0.3 + Math.random() * 1.4;
    default:       return 1.0;
  }
}

export const useSimulationStore = create<SimulationStore>()((set, get) => ({
  running: false,
  tick: 0,
  peakRps: 3000,
  pattern: 'steady',
  nodeMetrics: {},
  edgeMetrics: {},
  events: [],
  history: {},
  _intervalId: null,

  start: () => {
    if (get().running) return;
    const id = setInterval(() => get()._tick(), 500);
    set({ running: true, _intervalId: id });
    const { tick, peakRps, pattern } = get();
    set((s) => ({ events: [...s.events, { tick, level: 'info' as const, message: `Simulation started — ${peakRps.toLocaleString()} rps ${pattern.toUpperCase()} pattern` }].slice(-100) }));
  },

  stop: () => {
    const { _intervalId } = get();
    if (_intervalId) clearInterval(_intervalId);
    set({ running: false, _intervalId: null });
  },

  reset: () => {
    const { _intervalId } = get();
    if (_intervalId) clearInterval(_intervalId);
    set({ running: false, _intervalId: null, tick: 0, nodeMetrics: {}, edgeMetrics: {}, events: [], history: {} });
  },

  setPeakRps: (rps) => set({ peakRps: rps }),
  setPattern: (pattern) => set({ pattern }),

  _tick: () => {
    const { tick, peakRps, pattern, history } = get();
    const { nodes, edges, nodeConfigs, edgeConfigs } = useArchitectureStore.getState();

    const currentRps = peakRps * getTrafficMultiplier(pattern, tick);
    const result = runSimulationTick({ nodes, edges, nodeConfigs, edgeConfigs }, currentRps, tick);

    // Update history (last 40 points)
    const newHistory: Record<string, number[]> = {};
    for (const [id, m] of Object.entries(result.nodeMetrics)) {
      const prev = history[id] ?? [];
      newHistory[id] = [...prev.slice(-39), m.rpsIn];
    }

    // Generate events
    const newEvents: LogEvent[] = [];
    for (const [id, m] of Object.entries(result.nodeMetrics)) {
      const prev = get().nodeMetrics[id];
      if (!prev?.failed && m.failed) {
        const cfg = useArchitectureStore.getState().nodeConfigs[id];
        newEvents.push({ tick: tick + 1, level: 'error', message: `${cfg?.label ?? id} OVERLOADED`, nodeId: id });
      } else if (prev?.failed && !m.failed) {
        const cfg = useArchitectureStore.getState().nodeConfigs[id];
        newEvents.push({ tick: tick + 1, level: 'info', message: `${cfg?.label ?? id} recovered`, nodeId: id });
      } else if (!prev?.failed && m.load > 0.75 && (prev?.load ?? 0) <= 0.75) {
        const cfg = useArchitectureStore.getState().nodeConfigs[id];
        newEvents.push({ tick: tick + 1, level: 'warn', message: `${cfg?.label ?? id} load at ${Math.round(m.load * 100)}% — approaching capacity`, nodeId: id });
      }
    }

    set((s) => ({
      tick: tick + 1,
      nodeMetrics: result.nodeMetrics,
      edgeMetrics: result.edgeMetrics,
      history: newHistory,
      events: newEvents.length ? [...s.events, ...newEvents].slice(-100) : s.events,
    }));
  },

}));
