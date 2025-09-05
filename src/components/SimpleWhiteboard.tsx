"use client";

import { useCallback, useState } from "react";
import { useMutation, useStorage } from "@liveblocks/react/suspense";
import { LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";

type Point = {
  x: number;
  y: number;
};

type DrawingPath = {
  id: string;
  points: Point[];
  color: string;
};

export function SimpleWhiteboard() {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [selectedColor, setSelectedColor] = useState("#000000");

  const paths = useStorage((root) => root.layers);

  const addPath = useMutation(
    ({ storage }, path: DrawingPath) => {
      const layers = storage.get("layers");
      layers.set(path.id, new LiveObject(path));
    },
    []
  );

  const clearCanvas = useMutation(({ storage }) => {
    const layers = storage.get("layers");
    layers.clear();
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsDrawing(true);
    setCurrentPath([point]);
  }, []);

  const draw = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setCurrentPath(prev => [...prev, point]);
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    if (isDrawing && currentPath.length > 1) {
      const pathId = nanoid();
      addPath({
        id: pathId,
        points: currentPath,
        color: selectedColor,
      });
    }
    setIsDrawing(false);
    setCurrentPath([]);
  }, [isDrawing, currentPath, selectedColor, addPath]);

  const pathToSVGPath = (points: Point[]) => {
    if (points.length < 2) return "";
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  const colors = [
    "#000000", "#FF0000", "#00FF00", "#0000FF", 
    "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500"
  ];

  return (
    <div className="w-full h-full flex flex-col">
      {/* 도구 모음 */}
      <div className="flex items-center gap-4 p-4 bg-white border-b">
        <div className="flex gap-2">
          {colors.map((color) => (
            <button
              key={color}
              className={`w-8 h-8 rounded-full border-2 ${
                selectedColor === color ? 'border-gray-800' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </div>
        <button
          onClick={clearCanvas}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          지우기
        </button>
      </div>

      {/* 캔버스 */}
      <div className="flex-1 relative">
        <svg
          className="w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        >
          {/* 저장된 경로들 */}
          {paths && (Array.from(paths) as [string, DrawingPath][]).map(([id, pathData]) => {
            if (!pathData || !pathData.points) return null;
            return (
              <path
                key={id}
                d={pathToSVGPath(pathData.points)}
                stroke={pathData.color}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          
          {/* 현재 그리고 있는 경로 */}
          {currentPath.length > 1 && (
            <path
              d={pathToSVGPath(currentPath)}
              stroke={selectedColor}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
