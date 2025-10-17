import { useState, useRef, useEffect } from "react";
import { GripVertical } from "lucide-react";

interface ResizablePanelProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

const ResizablePanel = ({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 50,
  minWidth = 20,
  maxWidth = 80,
}: ResizablePanelProps) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    const clampedWidth = Math.min(Math.max(newLeftWidth, minWidth), maxWidth);
    setLeftWidth(clampedWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  return (
    <div ref={containerRef} className="flex h-full w-full flex-col lg:flex-row">
      <div
        className="flex-shrink-0 overflow-hidden lg:block"
        style={{ width: window.innerWidth < 1024 ? '100%' : `${leftWidth}%` }}
      >
        {leftPanel}
      </div>
      
      <div
        className="hidden lg:flex flex-shrink-0 w-1 bg-border hover:bg-border/80 cursor-col-resize items-center justify-center group"
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
      </div>
      
      <div
        className="flex-1 overflow-hidden lg:block"
        style={{ width: window.innerWidth < 1024 ? '100%' : `${100 - leftWidth}%` }}
      >
        {rightPanel}
      </div>
    </div>
  );
};

export default ResizablePanel;
