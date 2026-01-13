"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

type DeviceType = "desktop" | "tablet" | "mobile";

interface DeviceFrameProps {
  device: DeviceType;
  children: React.ReactNode;
  className?: string;
  onWidthChange?: (width: number) => void;
}

const deviceConfigs = {
  desktop: {
    width: "100%",
    minWidth: 320,
    maxWidth: Infinity,
    label: "Desktop",
  },
  tablet: {
    width: 768,
    minWidth: 320,
    maxWidth: 1024,
    label: "Tablet",
  },
  mobile: {
    width: 375,
    minWidth: 280,
    maxWidth: 480,
    label: "Mobile",
  },
};

const DeviceFrame = ({ device, children, className, onWidthChange }: DeviceFrameProps) => {
  const config = deviceConfigs[device];
  const containerRef = useRef<HTMLDivElement>(null);
  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const showResizeHandle = device !== "desktop";
  const currentWidth = customWidth ?? (typeof config.width === "number" ? config.width : null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startWidth = currentWidth ?? 375;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) * 2; // *2 because we drag from center
      const newWidth = Math.max(
        config.minWidth,
        Math.min(config.maxWidth, startWidth + deltaX)
      );
      setCustomWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [currentWidth, config.minWidth, config.maxWidth, onWidthChange]);

  // Reset custom width when device changes
  const prevDeviceRef = useRef(device);
  if (prevDeviceRef.current !== device) {
    prevDeviceRef.current = device;
    if (customWidth !== null) {
      setCustomWidth(null);
    }
  }

  if (device === "desktop") {
    return (
      <div className={cn("w-full", className)}>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("flex justify-center", className)}>
      <motion.div
        className="relative"
        style={{ width: currentWidth ?? config.width }}
        initial={false}
        animate={customWidth === null ? { width: config.width } : undefined}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Device Frame */}
        <div className="rounded-lg border-2 border-border bg-card shadow-lg overflow-hidden">
          {/* Device chrome */}
          <div className="h-6 bg-muted flex items-center justify-center gap-1.5 border-b border-border">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
            {currentWidth && (
              <span className="absolute right-3 text-[10px] text-muted-foreground font-mono">
                {Math.round(currentWidth)}px
              </span>
            )}
          </div>
          <div className="overflow-auto">{children}</div>
        </div>

        {/* Resize Handles */}
        {showResizeHandle && (
          <>
            {/* Right Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={cn(
                "absolute top-1/2 -right-3 -translate-y-1/2 z-10",
                "w-4 h-12 rounded-full",
                "bg-border hover:bg-primary/50 transition-colors",
                "flex items-center justify-center cursor-ew-resize",
                "group",
                isDragging && "bg-primary"
              )}
            >
              <GripVertical className={cn(
                "w-3 h-3 text-muted-foreground group-hover:text-primary-foreground transition-colors",
                isDragging && "text-primary-foreground"
              )} />
            </div>

            {/* Left Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={cn(
                "absolute top-1/2 -left-3 -translate-y-1/2 z-10",
                "w-4 h-12 rounded-full",
                "bg-border hover:bg-primary/50 transition-colors",
                "flex items-center justify-center cursor-ew-resize",
                "group",
                isDragging && "bg-primary"
              )}
            >
              <GripVertical className={cn(
                "w-3 h-3 text-muted-foreground group-hover:text-primary-foreground transition-colors",
                isDragging && "text-primary-foreground"
              )} />
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default DeviceFrame;
