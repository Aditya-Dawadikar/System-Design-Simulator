'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge, XYPosition } from 'reactflow';
import type { ComponentType, NodeConfig, EdgeConfig, ArchitectureTemplate } from '@/types';
import { COMPONENT_BY_TYPE, DEFAULT_EDGE_CONFIG } from '@/constants/components';

interface ArchitectureStore {
  nodes: Node[];
  edges: Edge[];
  nodeConfigs: Record<string, NodeConfig>;
  edgeConfigs: Record<string, EdgeConfig>;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

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
  loadTemplate: (template: ArchitectureTemplate) => void;
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
      selectedNodeId: null,
      selectedEdgeId: null,

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
        const { nodeConfigs, edgeConfigs, edges } = get();
        const removedEdgeIds = edges.filter((e) => e.source === id || e.target === id).map((e) => e.id);
        const newNodeConfigs = { ...nodeConfigs };
        delete newNodeConfigs[id];
        const newEdgeConfigs = { ...edgeConfigs };
        removedEdgeIds.forEach((eid) => delete newEdgeConfigs[eid]);
        set((s) => ({
          nodes: s.nodes.filter((n) => n.id !== id),
          edges: s.edges.filter((e) => e.source !== id && e.target !== id),
          nodeConfigs: newNodeConfigs,
          edgeConfigs: newEdgeConfigs,
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        }));
      },

      updateNodeConfig: (id, config) => {
        set((s) => ({
          nodeConfigs: {
            ...s.nodeConfigs,
            [id]: { ...s.nodeConfigs[id], ...config },
          },
        }));
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

      loadTemplate: (template) => {
        set({
          nodes: template.nodes,
          edges: template.edges,
          nodeConfigs: template.nodeConfigs,
          edgeConfigs: template.edgeConfigs,
          selectedNodeId: null,
          selectedEdgeId: null,
        });
      },

      exportToJSON: () => {
        const { nodes, edges, nodeConfigs, edgeConfigs } = get();
        return JSON.stringify({ nodes, edges, nodeConfigs, edgeConfigs }, null, 2);
      },

      importFromJSON: (json) => {
        try {
          const data = JSON.parse(json);
          set({
            nodes: data.nodes ?? [],
            edges: data.edges ?? [],
            nodeConfigs: data.nodeConfigs ?? {},
            edgeConfigs: data.edgeConfigs ?? {},
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
      }),
    }
  )
);
