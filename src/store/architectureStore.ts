'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge, XYPosition } from 'reactflow';
import type { ComponentType, NodeConfig, EdgeConfig, ArchitectureTemplate, ServiceGroup } from '@/types';
import { COMPONENT_BY_TYPE, DEFAULT_EDGE_CONFIG } from '@/constants/components';

/**
 * NodeConfig fields that are placement- or role-specific and must NOT be
 * propagated when a config change is applied to an entire service group.
 * Each replica keeps its own placement identity.
 */
const PROPAGATION_SKIP: Set<keyof NodeConfig> = new Set([
  'zoneId', 'regionId', 'dbRole', 'primaryNodeId',
]);

interface ArchitectureStore {
  nodes: Node[];
  edges: Edge[];
  nodeConfigs: Record<string, NodeConfig>;
  edgeConfigs: Record<string, EdgeConfig>;
  /** Service groups produced by services+deployments IaC expansion. */
  serviceGroups: Record<string, ServiceGroup>;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  activeScenarioId: string | null;
  /** Current IaC YAML — kept in sync with the canvas via the simulator page. */
  iacYaml: string;

  addNode: (type: ComponentType, position: XYPosition) => string;
  removeNode: (id: string) => void;
  updateNodeConfig: (id: string, config: Partial<NodeConfig>) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (id: string) => void;
  updateEdgeConfig: (id: string, config: Partial<EdgeConfig>) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setIacYaml: (yaml: string) => void;
  setServiceGroups: (groups: Record<string, ServiceGroup>) => void;
  loadTemplate: (template: ArchitectureTemplate, scenarioId?: string) => void;
  /** Apply a topology from the IaC pipeline without touching activeScenarioId. */
  loadTopology: (template: ArchitectureTemplate) => void;
  exportToJSON: () => string;
  importFromJSON: (json: string) => void;
}

let idCounter = 1;
const genId = () => `node_${idCounter++}_${Date.now()}`;

export const useArchitectureStore = create<ArchitectureStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      nodeConfigs: {},
      edgeConfigs: {},
      serviceGroups: {},
      selectedNodeId: null,
      selectedEdgeId: null,
      activeScenarioId: null,
      iacYaml: '',

      addNode: (type, position) => {
        const def = COMPONENT_BY_TYPE[type];
        const id = genId();
        const node: Node = {
          id,
          type: type,
          position,
          data: { label: def.label },
        };
        set((s) => ({
          nodes: [...s.nodes, node],
          nodeConfigs: { ...s.nodeConfigs, [id]: { ...def.defaults, label: def.label } },
        }));
        return id;
      },

      removeNode: (id) => {
        const { nodeConfigs, edgeConfigs, edges, serviceGroups } = get();
        const removedEdgeIds = edges.filter((e) => e.source === id || e.target === id).map((e) => e.id);
        const newNodeConfigs = { ...nodeConfigs };
        delete newNodeConfigs[id];
        const newEdgeConfigs = { ...edgeConfigs };
        removedEdgeIds.forEach((eid) => delete newEdgeConfigs[eid]);

        // Remove node from any service group it belongs to
        const newServiceGroups: Record<string, ServiceGroup> = {};
        for (const [groupId, group] of Object.entries(serviceGroups)) {
          const remaining = group.nodeIds.filter((nid) => nid !== id);
          if (remaining.length > 0) {
            newServiceGroups[groupId] = { ...group, nodeIds: remaining };
          }
          // If all nodes removed, the group is dropped entirely
        }

        set((s) => ({
          nodes: s.nodes.filter((n) => n.id !== id),
          edges: s.edges.filter((e) => e.source !== id && e.target !== id),
          nodeConfigs: newNodeConfigs,
          edgeConfigs: newEdgeConfigs,
          serviceGroups: newServiceGroups,
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        }));
      },

      updateNodeConfig: (id, config) => {
        set((s) => {
          const updatedConfigs: Record<string, NodeConfig> = {
            ...s.nodeConfigs,
            [id]: { ...s.nodeConfigs[id], ...config },
          };

          // Propagate non-placement fields to service group siblings
          const group = Object.values(s.serviceGroups).find((g) => g.nodeIds.includes(id));
          if (group) {
            const propagated: Partial<NodeConfig> = {};
            for (const [key, value] of Object.entries(config)) {
              if (!PROPAGATION_SKIP.has(key as keyof NodeConfig)) {
                (propagated as Record<string, unknown>)[key] = value;
              }
            }
            if (Object.keys(propagated).length > 0) {
              for (const siblingId of group.nodeIds) {
                if (siblingId !== id) {
                  updatedConfigs[siblingId] = {
                    ...(updatedConfigs[siblingId] ?? s.nodeConfigs[siblingId]),
                    ...propagated,
                  };
                }
              }
            }
          }

          return { nodeConfigs: updatedConfigs };
        });
      },

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),

      addEdge: (edge) => {
        set((s) => ({
          edges: [...s.edges.filter((e) => e.id !== edge.id), edge],
          edgeConfigs: {
            ...s.edgeConfigs,
            [edge.id]: s.edgeConfigs[edge.id] ?? { ...DEFAULT_EDGE_CONFIG },
          },
        }));
      },

      removeEdge: (id) => {
        const newEdgeConfigs = { ...get().edgeConfigs };
        delete newEdgeConfigs[id];
        set((s) => ({
          edges: s.edges.filter((e) => e.id !== id),
          edgeConfigs: newEdgeConfigs,
          selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
        }));
      },

      updateEdgeConfig: (id, config) => {
        set((s) => ({
          edgeConfigs: {
            ...s.edgeConfigs,
            [id]: { ...(s.edgeConfigs[id] ?? DEFAULT_EDGE_CONFIG), ...config },
          },
        }));
      },

      setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
      setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
      setIacYaml: (yaml) => set({ iacYaml: yaml }),
      setServiceGroups: (groups) => set({ serviceGroups: groups }),

      loadTemplate: (template, scenarioId) => {
        set({
          nodes: template.nodes,
          edges: template.edges,
          nodeConfigs: template.nodeConfigs,
          edgeConfigs: template.edgeConfigs,
          serviceGroups: template.serviceGroups ?? {},
          selectedNodeId: null,
          selectedEdgeId: null,
          activeScenarioId: scenarioId,
          iacYaml: '',  // cleared; auto-sync will regenerate from the new topology
        });
      },

      loadTopology: (template) => {
        set({
          nodes: template.nodes,
          edges: template.edges,
          nodeConfigs: template.nodeConfigs,
          edgeConfigs: template.edgeConfigs,
          serviceGroups: template.serviceGroups ?? {},
          selectedNodeId: null,
          selectedEdgeId: null,
          iacYaml: '',  // cleared; auto-sync will regenerate
        });
      },

      exportToJSON: () => {
        const { nodes, edges, nodeConfigs, edgeConfigs, serviceGroups } = get();
        return JSON.stringify({ nodes, edges, nodeConfigs, edgeConfigs, serviceGroups }, null, 2);
      },

      importFromJSON: (json) => {
        try {
          const data = JSON.parse(json);
          set({
            nodes: data.nodes ?? [],
            edges: data.edges ?? [],
            nodeConfigs: data.nodeConfigs ?? {},
            edgeConfigs: data.edgeConfigs ?? {},
            serviceGroups: data.serviceGroups ?? {},
          });
        } catch {
          console.error('Failed to import JSON');
        }
      },
    }),
    {
      name: 'architecture-store',
      partialize: (s) => ({
        nodes: s.nodes,
        edges: s.edges,
        nodeConfigs: s.nodeConfigs,
        edgeConfigs: s.edgeConfigs,
        serviceGroups: s.serviceGroups,
        iacYaml: s.iacYaml,
      }),
    }
  )
);
