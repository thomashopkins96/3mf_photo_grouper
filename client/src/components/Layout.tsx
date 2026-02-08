import { useState, useRef, useEffect, ReactNode } from 'react';

interface LayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
}

const STORAGE_KEY = 'panel-width';
const DEFAULT_WIDTH = 50;
const MIN_WIDTH = 20;
const MAX_WIDTH = 80;

export default function Layout({ leftPanel, rightPanel }: LayoutProps) {
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) : DEFAULT_WIDTH;
  });
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(leftWidth));
  }, [leftWidth]);

  const handleMouseDown = () => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    if (e.buttons === 0) {
      handleMouseUp();
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const percentage = ((e.clientX - rect.left) / (rect.width) * 100);
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, percentage));

    setLeftWidth(clamped);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    const handleBlur = () => handleMouseUp();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return (
    <div className="layout" ref={containerRef}>
      <div className="layout-panel layout-panel-left" style={{ width: `calc(${leftWidth}% - 3px)` }}>
        {leftPanel}
      </div>
      <div className="layout-divider" onMouseDown={handleMouseDown} />
      <div className="layout-panel layout-panel-right" style={{ width: `calc(${100 - leftWidth}% - 3px)` }}>
        {rightPanel}
      </div>
    </div>
  );
}


