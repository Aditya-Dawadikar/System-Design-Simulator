import { useRef, useState } from 'react';

interface DraggableProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  initialPosition?: { x: number; y: number };
}

export default function Draggable({ children, style, className, initialPosition = { x: 0, y: 0 } }: DraggableProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(initialPosition);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

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
    setPos({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  }

  function onMouseUp() {
    setDragging(false);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
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
        ...style,
      }}
    >
      <div onMouseDown={onMouseDown} style={{ cursor: 'grab', userSelect: 'none', width: '100%' }}>
        {/* Drag handle: can style this or add a bar/icon */}
        <div style={{ height: 8, background: 'transparent', width: '100%' }} />
      </div>
      <div>{children}</div>
    </div>
  );
}
