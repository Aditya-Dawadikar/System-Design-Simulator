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
  latencyHistory: Record<string, number[]>;  // latencyMs per node, last 40 ticks
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
  latencyHistory: {},
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
    set({ running: false, _intervalId: null, tick: 0, nodeMetrics: {}, edgeMetrics: {}, events: [], history: {}, latencyHistory: {} });
  },

  setPeakRps: (rps) => set({ peakRps: rps }),
  setPattern: (pattern) => set({ pattern }),

  _tick: () => {
    const { tick, peakRps, pattern, history } = get();
    const { nodes, edges, nodeConfigs, edgeConfigs } = useArchitectureStore.getState();

    const currentRps = peakRps * getTrafficMultiplier(pattern, tick);
    const prevMetrics = get().nodeMetrics;
    const result = runSimulationTick({ nodes, edges, nodeConfigs, edgeConfigs }, currentRps, tick, prevMetrics, history);

    // Update RPS history (last 40 points, used by predictive autoscaling)
    const newHistory: Record<string, number[]> = {};
    for (const [id, m] of Object.entries(result.nodeMetrics)) {
      const prev = history[id] ?? [];
      newHistory[id] = [...prev.slice(-39), m.rpsIn];
    }

    // Update latency history (last 40 points, used by percentile chart)
    const prevLatencyHistory = get().latencyHistory;
    const newLatencyHistory: Record<string, number[]> = {};
    for (const [id, m] of Object.entries(result.nodeMetrics)) {
      const prev = prevLatencyHistory[id] ?? [];
      newLatencyHistory[id] = [...prev.slice(-39), m.latencyMs];
    }

    // Generate events
    const fmtMs = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms.toFixed(0)}ms`;
    const newEvents: LogEvent[] = [];
    for (const [id, m] of Object.entries(result.nodeMetrics)) {
      const prev = prevMetrics[id];
      const cfg  = useArchitectureStore.getState().nodeConfigs[id];
      const lbl  = cfg?.label ?? id;

      // Generic load events
      if (!prev?.failed && m.failed) {
        newEvents.push({ tick: tick + 1, level: 'error', message: `${lbl} OVERLOADED`, nodeId: id });
      } else if (prev?.failed && !m.failed) {
        newEvents.push({ tick: tick + 1, level: 'info', message: `${lbl} recovered`, nodeId: id });
      } else if (!prev?.failed && m.load > 0.75 && (prev?.load ?? 0) <= 0.75) {
        newEvents.push({ tick: tick + 1, level: 'warn', message: `${lbl} load at ${Math.round(m.load * 100)}% — approaching capacity`, nodeId: id });
      }

      // Component-specific failure mode events
      const d  = m.detail;
      const pd = prev?.detail;

      if (d?.kind === 'pubsub') {
        const prevLag = pd?.kind === 'pubsub' ? pd.subscriberLagMs : 0;
        if (d.subscriberLagMs > 2000 && prevLag <= 2000)
          newEvents.push({ tick: tick + 1, level: 'warn', message: `${lbl} subscriber lag ${fmtMs(d.subscriberLagMs)} — consumers falling behind`, nodeId: id });
      }
      if (d?.kind === 'cloud_function') {
        if (d.coldStarts > 0 && (pd?.kind !== 'cloud_function' || pd.coldStarts === 0))
          newEvents.push({ tick: tick + 1, level: 'warn', message: `${lbl} cold starts ×${d.coldStarts} — concurrency ramp`, nodeId: id });
        if (d.throttledInvocations > 0 && (pd?.kind !== 'cloud_function' || pd.throttledInvocations === 0))
          newEvents.push({ tick: tick + 1, level: 'error', message: `${lbl} throttling ${d.throttledInvocations}/s — max concurrency reached`, nodeId: id });
      }
      if (d?.kind === 'database') {
        const prevQueue    = pd?.kind === 'database' ? pd.queryQueueDepth    : 0;
        const prevRejected = pd?.kind === 'database' ? (pd.writeRejectedRps ?? 0) : 0;
        const currentRejected = d.writeRejectedRps ?? 0;
        const prevLag      = pd?.kind === 'database' ? pd.replicationLagMs   : 0;
        if (d.queryQueueDepth > 0 && prevQueue === 0)
          newEvents.push({ tick: tick + 1, level: 'error', message: `${lbl} connection pool exhausted — ${d.queryQueueDepth} queries queuing`, nodeId: id });
        if (currentRejected > 0 && prevRejected === 0)
          newEvents.push({ tick: tick + 1, level: 'error', message: `${lbl} write rejected — replica cannot serve writes (${Math.round(currentRejected)} rps routed incorrectly)`, nodeId: id });
        if (currentRejected === 0 && prevRejected > 0)
          newEvents.push({ tick: tick + 1, level: 'info', message: `${lbl} write traffic cleared — replica healthy`, nodeId: id });
        if (d.replicationLagMs > 200 && prevLag <= 200)
          newEvents.push({ tick: tick + 1, level: 'warn', message: `${lbl} replication lag ${Math.round(d.replicationLagMs)}ms — primary write load high`, nodeId: id });
      }
      if (d?.kind === 'worker_pool') {
        const prevBacklog = pd?.kind === 'worker_pool' ? pd.taskBacklogMs : 0;
        if (d.taskBacklogMs > 2000 && prevBacklog <= 2000)
          newEvents.push({ tick: tick + 1, level: 'warn', message: `${lbl} task backlog ${fmtMs(d.taskBacklogMs)} — queue depth ${Math.round(d.queueDepth)}`, nodeId: id });
      }
      if (d?.kind === 'app_server' && d.scalingEvent) {
        const prevEvent = pd?.kind === 'app_server' ? pd.scalingEvent : null;
        if (d.scalingEvent !== prevEvent) {
          const msg =
            d.scalingEvent === 'up-warm'
              ? `${lbl} warm-pool +1 → ${d.activeInstances} inst — CPU ${d.cpuPct.toFixed(0)}%`
              : d.scalingEvent === 'up-cold'
              ? `${lbl} cold-start provisioning (+1) — CPU ${d.cpuPct.toFixed(0)}% (ready in ${d.pendingCountdown} ticks)`
              : `${lbl} scale-in → ${d.activeInstances} inst — CPU ${d.cpuPct.toFixed(0)}%`;
          newEvents.push({ tick: tick + 1, level: 'k8s', message: msg, nodeId: id });
        }
      }
      if (d?.kind === 'load_balancer') {
        const prevScale = pd?.kind === 'load_balancer' ? pd.scalingEvent : false;
        if (d.scalingEvent && !prevScale)
          newEvents.push({ tick: tick + 1, level: 'k8s', message: `${lbl} auto-scale signal — ${Math.round(d.activeConnections).toLocaleString()} active conns`, nodeId: id });
        const prevFailedTargets = pd?.kind === 'load_balancer' ? pd.failedTargets : 0;
        const prevNoZonesAvailable = pd?.kind === 'load_balancer' ? pd.noZonesAvailable : false;
        if (d.noZonesAvailable && !prevNoZonesAvailable) {
          newEvents.push({ tick: tick + 1, level: 'error', message: `${lbl} no zones available for routing`, nodeId: id });
        } else if (!d.noZonesAvailable && prevNoZonesAvailable) {
          newEvents.push({ tick: tick + 1, level: 'info', message: `${lbl} routing restored — ${d.availableZones}/${d.totalZones} zone(s) available`, nodeId: id });
        } else if (d.failedTargets > 0 && prevFailedTargets === 0) {
          newEvents.push({ tick: tick + 1, level: 'warn', message: `${lbl} health check: ${d.failedTargets} target(s) unhealthy — rerouting to remaining targets`, nodeId: id });
        } else if (d.failedTargets === 0 && prevFailedTargets > 0) {
          newEvents.push({ tick: tick + 1, level: 'info', message: `${lbl} all targets healthy — traffic balanced`, nodeId: id });
        }
      }
      if (d?.kind === 'global_accelerator') {
        const prevFailed = pd?.kind === 'global_accelerator' ? pd.failedRegions : 0;
        if (d.failedRegions > 0 && prevFailed === 0)
          newEvents.push({ tick: tick + 1, level: 'warn', message: `${lbl} failover active — ${d.failedRegions} endpoint(s) down, rerouting ${d.reroutedRps.toFixed(0)} rps`, nodeId: id });
        if (d.failedRegions === 0 && prevFailed > 0)
          newEvents.push({ tick: tick + 1, level: 'info', message: `${lbl} all endpoints healthy — failover cleared`, nodeId: id });
      }
      if (d?.kind === 'firewall') {
        const prevBlocked = pd?.kind === 'firewall' ? pd.blockedRps : 0;
        if (d.blockedRps > 0 && prevBlocked === 0)
          newEvents.push({ tick: tick + 1, level: 'warn', message: `${lbl} blocking ${d.blockedRps.toFixed(0)} rps — detection efficiency ${Math.round(d.detectionEfficiency * 100)}%`, nodeId: id });
        if (d.blockedRps === 0 && prevBlocked > 0)
          newEvents.push({ tick: tick + 1, level: 'info', message: `${lbl} traffic clear — no blocks active`, nodeId: id });
      }
      if (d?.kind === 'nat_gateway') {
        const prevDropped = pd?.kind === 'nat_gateway' ? pd.droppedPackets : 0;
        if (d.droppedPackets > 0 && prevDropped === 0)
          newEvents.push({ tick: tick + 1, level: 'warn', message: `${lbl} dropping ${d.droppedPackets} pkt/s — bandwidth limit reached`, nodeId: id });
        if (d.droppedPackets === 0 && prevDropped > 0)
          newEvents.push({ tick: tick + 1, level: 'info', message: `${lbl} bandwidth within limits`, nodeId: id });
      }
    }

    set((s) => ({
      tick: tick + 1,
      nodeMetrics: result.nodeMetrics,
      edgeMetrics: result.edgeMetrics,
      history: newHistory,
      latencyHistory: newLatencyHistory,
      events: newEvents.length ? [...s.events, ...newEvents].slice(-100) : s.events,
    }));
  },

}));
