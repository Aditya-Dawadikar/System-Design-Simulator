import { useRef, useState } from 'react';

interface ResizableDraggableProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  initialPosition?: { x: number; y: number };
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
}

export default function ResizableDraggable({
  children,
  style,
  className,
  initialPosition = { x: 0, y: 0 },
  initialHeight = 300,
  minHeight = 120,
  maxHeight = 800,
}: ResizableDraggableProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(initialPosition);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [height, setHeight] = useState(initialHeight);
  const [resizing, setResizing] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(initialHeight);

  function onMouseDown(e: React.MouseEvent) {
    if (nodeRef.current && e.button === 0) {
      setDragging(true);
      setOffset({
        x: e.clientX - pos.x,
        y: e.clientY - pos.y,
      });
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
  }

  function onMouseMove(e: MouseEvent) {
    if (dragging) {
      setPos({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      });
    } else if (resizing) {
      const newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartHeight + (resizeStartY - e.clientY)));
      setHeight(newHeight);
    }
  }

  function onMouseUp() {
    setDragging(false);
    setResizing(false);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  function onResizeHandleDown(e: React.MouseEvent) {
    e.stopPropagation();
    setResizing(true);
    setResizeStartY(e.clientY);
    setResizeStartHeight(height);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  return (
    <div
      ref={nodeRef}
      className={className}
      style={{
        position: 'fixed',
        left: pos.x,
        bottom: pos.y,
        zIndex: 2000,
        cursor: dragging ? 'grabbing' : 'grab',
        height,
        minHeight,
        maxHeight,
        width: '100vw',
        ...style,
      }}
    >
      <div onMouseDown={onMouseDown} style={{ cursor: 'grab', userSelect: 'none', width: '100%' }}>
        {/* Drag handle */}
        <div style={{ height: 8, background: 'transparent', width: '100%' }} />
      </div>
      <div style={{ height: height - 16, overflow: 'auto' }}>{children}</div>
      {/* Resize handle at the top edge */}
      <div
        onMouseDown={onResizeHandleDown}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: 8,
          cursor: 'ns-resize',
          zIndex: 10,
          background: 'linear-gradient(to bottom, #17203044 60%, transparent)',
        }}
      />
    </div>
  );
}
