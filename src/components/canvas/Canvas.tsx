'use client';

import { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  type NodeTypes,
  type EdgeTypes,
  type Connection,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useArchitectureStore } from '@/store/architectureStore';
import type { ComponentType } from '@/types';

import CdnNode from './nodes/CdnNode';
import LoadBalancerNode from './nodes/LoadBalancerNode';
import AppServerNode from './nodes/AppServerNode';
import CacheNode from './nodes/CacheNode';
import DatabaseNode from './nodes/DatabaseNode';
import CloudStorageNode from './nodes/CloudStorageNode';
import BlockStorageNode from './nodes/BlockStorageNode';
import NetworkStorageNode from './nodes/NetworkStorageNode';
import PubSubNode from './nodes/PubSubNode';
import CloudFunctionNode from './nodes/CloudFunctionNode';
import CronJobNode from './nodes/CronJobNode';
import WorkerPoolNode from './nodes/WorkerPoolNode';
import CommentNode from './nodes/CommentNode';
import TrafficGeneratorNode from './nodes/TrafficGeneratorNode';
import RateLimiterNode from './nodes/RateLimiterNode';
import ServiceMeshNode from './nodes/ServiceMeshNode';
import RegionNode from './nodes/RegionNode';
import AvailabilityZoneNode from './nodes/AvailabilityZoneNode';
import GlobalAcceleratorNode from './nodes/GlobalAcceleratorNode';
import EdgeWire from './EdgeWire';


// Move nodeTypes and edgeTypes outside the component to avoid React Flow warning
export const nodeTypes: NodeTypes = {
  cdn: CdnNode,
  load_balancer: LoadBalancerNode,
  app_server: AppServerNode,
  cache: CacheNode,
  database: DatabaseNode,
  cloud_storage: CloudStorageNode,
  block_storage: BlockStorageNode,
  network_storage: NetworkStorageNode,
  pubsub: PubSubNode,
  cloud_function: CloudFunctionNode,
  cron_job: CronJobNode,
  worker_pool: WorkerPoolNode,
  comment: CommentNode,
  traffic_generator: TrafficGeneratorNode,
  rate_limiter: RateLimiterNode,
  service_mesh: ServiceMeshNode,
  region: RegionNode,
  availability_zone: AvailabilityZoneNode,
  global_accelerator: GlobalAcceleratorNode,
};

export const edgeTypes: EdgeTypes = {
  wire: EdgeWire,
};

type ContextMenu =
  | { type: 'node'; nodeId: string; x: number; y: number }
  | { type: 'edge'; edgeId: string; x: number; y: number };

export default function Canvas() {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const setNodes = useArchitectureStore((s) => s.setNodes);
  const setEdges = useArchitectureStore((s) => s.setEdges);
  const addEdge = useArchitectureStore((s) => s.addEdge);
  const addNode = useArchitectureStore((s) => s.addNode);
  const removeNode = useArchitectureStore((s) => s.removeNode);
  const setSelectedNode = useArchitectureStore((s) => s.setSelectedNode);
  const setSelectedEdge = useArchitectureStore((s) => s.setSelectedEdge);
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId);
  const nodeConfigs = useArchitectureStore((s) => s.nodeConfigs);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes(applyNodeChanges(changes, nodes)),
    [nodes, setNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges(applyEdgeChanges(changes, edges)),
    [edges, setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const newEdge: Edge = {
        id: `edge_${connection.source}_${connection.target}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: 'wire',
      };
      addEdge(newEdge);
    },
    [addEdge]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setContextMenu(null);
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      setContextMenu(null);
      setSelectedEdge(edge.id);
    },
    [setSelectedEdge]
  );

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      const bounds = wrapperRef.current?.getBoundingClientRect();
      setContextMenu({
        type: 'node',
        nodeId: node.id,
        x: event.clientX - (bounds?.left ?? 0),
        y: event.clientY - (bounds?.top ?? 0),
      });
    },
    []
  );

  const onEdgeContextMenu: EdgeMouseHandler = useCallback(
    (event, edge) => {
      event.preventDefault();
      const bounds = wrapperRef.current?.getBoundingClientRect();
      setContextMenu({
        type: 'edge',
        edgeId: edge.id,
        x: event.clientX - (bounds?.left ?? 0),
        y: event.clientY - (bounds?.top ?? 0),
      });
    },
    []
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('componentType') as ComponentType;
      if (!type) return;

      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds) return;

      // Get position relative to the wrapper; React Flow handles the viewport transform
      const position = {
        x: event.clientX - bounds.left - 104,
        y: event.clientY - bounds.top - 60,
      };

      addNode(type, position);
    },
    [addNode]
  );

  const handleDeleteEdge = useCallback(() => {
    if (contextMenu && contextMenu.type === 'edge') {
      useArchitectureStore.getState().removeEdge(contextMenu.edgeId);
      setContextMenu(null);
    }
  }, [contextMenu]);

  const handleDuplicateNode = useCallback(() => {
    if (!contextMenu || contextMenu.type !== 'node') return;
    const original = nodes.find((n) => n.id === contextMenu.nodeId);
    if (!original) return;
    const newId = addNode(original.type as ComponentType, {
      x: original.position.x + 32,
      y: original.position.y + 32,
    });
    const originalConfig = nodeConfigs[contextMenu.nodeId];
    if (originalConfig) {
      useArchitectureStore.getState().updateNodeConfig(newId, { ...originalConfig });
    }
    setContextMenu(null);
  }, [contextMenu, nodes, nodeConfigs, addNode]);

  const handleDeleteNode = useCallback(() => {
    if (!contextMenu || contextMenu.type !== 'node') return;
    removeNode(contextMenu.nodeId);
    setContextMenu(null);
  }, [contextMenu, removeNode]);

  const nodesWithSelection: Node[] = nodes.map((n) => ({
    ...n,
    selected: n.id === selectedNodeId,
    // Container nodes sit behind all resource nodes and cannot be connected
    zIndex: n.type === 'region' ? -2 : n.type === 'availability_zone' ? -1 : 0,
    connectable: n.type !== 'region' && n.type !== 'availability_zone',
  }));

  return (
    <div
      ref={wrapperRef}
      style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--bg-base)' }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodesWithSelection}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        defaultEdgeOptions={{ type: 'wire' }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="var(--border)"
          gap={24}
          size={1}
        />
        <Controls
          style={{
            bottom: 24,
            left: 24,
          }}
        />
      </ReactFlow>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'absolute',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 0',
            zIndex: 1000,
            minWidth: 140,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {contextMenu.type === 'node' && (
            <>
              <button
                onClick={handleDuplicateNode}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '7px 14px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
              >
                Duplicate
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
              <button
                onClick={handleDeleteNode}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '7px 14px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-red)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--accent-red) 10%, transparent)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
              >
                Delete
              </button>
            </>
          )}
          {contextMenu.type === 'edge' && (
            <button
              onClick={handleDeleteEdge}
              style={{
                display: 'block',
                width: '100%',
                padding: '7px 14px',
                background: 'none',
                border: 'none',
                color: 'var(--accent-red)',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                fontSize: 12,
                letterSpacing: '0.02em',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--accent-red) 10%, transparent)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
            >
              Delete Edge
            </button>
          )}
        </div>
      )}
    </div>
  );
}
