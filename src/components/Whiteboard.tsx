"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import {
  useMutation,
  useStorage,
  useOthersMapped,
  useSelf,
} from "@liveblocks/react/suspense";
import {
  Camera,
  CanvasMode,
  CanvasState,
  Color,
  LayerType,
  Point,
  Side,
  XYWH,
} from "@/types/whiteboard";
import { LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";

const MAX_LAYERS = 100;

interface WhiteboardProps {
  boardId: string;
}

export function Whiteboard({ boardId }: WhiteboardProps) {
  const layerIds = useStorage((root) => root.layerIds);
  const pencilDraft = useSelf((me) => me.presence.pencilDraft);

  const [canvasState, setCanvasState] = useState<CanvasState>({
    mode: CanvasMode.None,
  });

  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0 });
  const [lastUsedColor, setLastUsedColor] = useState<Color>({
    r: 29,
    g: 78,
    b: 216,
  });

  const insertLayer = useMutation(
    (
      { storage, setMyPresence },
      layerType: LayerType.Ellipse | LayerType.Rectangle | LayerType.Text | LayerType.Note,
      position: Point,
    ) => {
      const liveLayers = storage.get("layers");
      if (liveLayers.size >= MAX_LAYERS) {
        return;
      }

      const liveLayerIds = storage.get("layerIds");
      const layerId = nanoid();
      const layer = new LiveObject({
        type: layerType,
        x: position.x,
        y: position.y,
        height: 100,
        width: 100,
        fill: lastUsedColor,
      });

      liveLayerIds.push(layerId);
      liveLayers.set(layerId, layer);

      setMyPresence({ selection: [layerId] }, { addToHistory: true });
      setCanvasState({ mode: CanvasMode.None });
    },
    [lastUsedColor],
  );

  const translateSelectedLayers = useMutation(
    ({ storage, self }, point: Point) => {
      if (canvasState.mode !== CanvasMode.Translating) {
        return;
      }

      const offset = {
        x: point.x - canvasState.current.x,
        y: point.y - canvasState.current.y,
      };

      const liveLayers = storage.get("layers");

      for (const id of self.presence.selection) {
        const layer = liveLayers.get(id);

        if (layer) {
          layer.update({
            x: layer.get("x") + offset.x,
            y: layer.get("y") + offset.y,
          });
        }
      }

      setCanvasState({ mode: CanvasMode.Translating, current: point });
    },
    [canvasState],
  );

  const unselectLayers = useMutation(({ self, setMyPresence }) => {
    if (self.presence.selection.length > 0) {
      setMyPresence({ selection: [] }, { addToHistory: true });
    }
  }, []);

  const updateSelectionNet = useMutation(
    ({ storage, setMyPresence }, current: Point, origin: Point) => {
      const layers = storage.get("layers").toImmutable();
      setCanvasState({
        mode: CanvasMode.SelectionNet,
        origin,
        current,
      });

      const ids = findIntersectingLayersWithRectangle(
        layerIds,
        layers,
        origin,
        current,
      );

      setMyPresence({ selection: ids });
    },
    [layerIds],
  );

  const startMultiSelection = useCallback((current: Point, origin: Point) => {
    if (Math.abs(current.x - origin.x) + Math.abs(current.y - origin.y) > 5) {
      setCanvasState({
        mode: CanvasMode.SelectionNet,
        origin,
        current,
      });
    }
  }, []);

  const continueDrawing = useMutation(
    ({ self, setMyPresence }, point: Point, e: React.PointerEvent) => {
      const { pencilDraft } = self.presence;

      if (
        canvasState.mode !== CanvasMode.Pencil ||
        e.buttons !== 1 ||
        pencilDraft == null
      ) {
        return;
      }

      setMyPresence({
        cursor: point,
        pencilDraft:
          pencilDraft.length === 1 &&
          pencilDraft[0][0] === point.x &&
          pencilDraft[0][1] === point.y
            ? pencilDraft
            : [...pencilDraft, [point.x, point.y, e.pressure]],
      });
    },
    [canvasState.mode],
  );

  const insertPath = useMutation(
    ({ storage, self, setMyPresence }) => {
      const liveLayers = storage.get("layers");
      const { pencilDraft } = self.presence;

      if (
        pencilDraft == null ||
        pencilDraft.length < 2 ||
        liveLayers.size >= MAX_LAYERS
      ) {
        setMyPresence({ pencilDraft: null });
        return;
      }

      const id = nanoid();
      liveLayers.set(
        id,
        new LiveObject(penDraftToPathLayer(pencilDraft, lastUsedColor)),
      );

      const liveLayerIds = storage.get("layerIds");
      liveLayerIds.push(id);

      setMyPresence({ pencilDraft: null });
      setCanvasState({ mode: CanvasMode.Pencil });
    },
    [lastUsedColor],
  );

  const startDrawing = useMutation(
    ({ setMyPresence }, point: Point, pressure: number) => {
      setMyPresence({
        pencilDraft: [[point.x, point.y, pressure]],
        penColor: lastUsedColor,
      });
    },
    [lastUsedColor],
  );

  const resizeSelectedLayer = useMutation(
    ({ storage, self }, point: Point) => {
      if (canvasState.mode !== CanvasMode.Resizing) {
        return;
      }

      const bounds = resizeBounds(
        canvasState.initialBounds,
        canvasState.corner,
        point,
      );

      const liveLayers = storage.get("layers");
      const layer = liveLayers.get(self.presence.selection[0]);

      if (layer) {
        layer.update(bounds);
      }
    },
    [canvasState],
  );

  const onResizeHandlePointerDown = useCallback(
    (corner: Side, initialBounds: XYWH) => {
      history.pause();
      setCanvasState({
        mode: CanvasMode.Resizing,
        initialBounds,
        corner,
      });
    },
    [],
  );

  const onWheel = useCallback((e: React.WheelEvent) => {
    setCamera((camera) => ({
      x: camera.x - e.deltaX,
      y: camera.y - e.deltaY,
    }));
  }, []);

  const onPointerMove = useMutation(
    ({ setMyPresence }, e: React.PointerEvent) => {
      e.preventDefault();

      const current = pointerEventToCanvasPoint(e, camera);

      if (canvasState.mode === CanvasMode.Pressing) {
        startMultiSelection(current, canvasState.origin);
      } else if (canvasState.mode === CanvasMode.SelectionNet) {
        updateSelectionNet(current, canvasState.origin);
      } else if (canvasState.mode === CanvasMode.Translating) {
        translateSelectedLayers(current);
      } else if (canvasState.mode === CanvasMode.Resizing) {
        resizeSelectedLayer(current);
      } else if (canvasState.mode === CanvasMode.Pencil) {
        continueDrawing(current, e);
      }

      setMyPresence({ cursor: current });
    },
    [
      continueDrawing,
      camera,
      canvasState,
      resizeSelectedLayer,
      translateSelectedLayers,
      startMultiSelection,
      updateSelectionNet,
    ],
  );

  const onPointerLeave = useMutation(({ setMyPresence }) => {
    setMyPresence({ cursor: null });
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const point = pointerEventToCanvasPoint(e, camera);

      if (canvasState.mode === CanvasMode.Inserting) {
        return;
      }

      if (canvasState.mode === CanvasMode.Pencil) {
        startDrawing(point, e.pressure);
        return;
      }

      setCanvasState({ origin: point, mode: CanvasMode.Pressing });
    },
    [camera, canvasState.mode, setCanvasState, startDrawing],
  );

  const onPointerUp = useMutation(
    ({}, e) => {
      const point = pointerEventToCanvasPoint(e, camera);

      if (
        canvasState.mode === CanvasMode.None ||
        canvasState.mode === CanvasMode.Pressing
      ) {
        unselectLayers();
        setCanvasState({
          mode: CanvasMode.None,
        });
      } else if (canvasState.mode === CanvasMode.Pencil) {
        insertPath();
      } else if (canvasState.mode === CanvasMode.Inserting) {
        insertLayer(canvasState.layerType, point);
      } else {
        setCanvasState({
          mode: CanvasMode.None,
        });
      }

      history.resume();
    },
    [
      insertPath,
      camera,
      canvasState,
      history,
      insertLayer,
      unselectLayers,
      setCanvasState,
    ],
  );

  const selections = useOthersMapped((other) => other.presence.selection);

  const onLayerPointerDown = useMutation(
    ({ self, setMyPresence }, e: React.PointerEvent, layerId: string) => {
      if (
        canvasState.mode === CanvasMode.Pencil ||
        canvasState.mode === CanvasMode.Inserting
      ) {
        return;
      }

      history.pause();
      e.stopPropagation();

      const point = pointerEventToCanvasPoint(e, camera);

      if (!self.presence.selection.includes(layerId)) {
        setMyPresence({ selection: [layerId] }, { addToHistory: true });
      }
      setCanvasState({ mode: CanvasMode.Translating, current: point });
    },
    [setCanvasState, camera, history, canvasState.mode],
  );

  const layerIdsToColorSelection = useMemo(() => {
    const layerIdsToColorSelection: Record<string, string> = {};

    for (const user of selections) {
      const [connectionId, selection] = user;

      for (const layerId of selection) {
        layerIdsToColorSelection[layerId] = connectionIdToColor(connectionId);
      }
    }

    return layerIdsToColorSelection;
  }, [selections]);

  const deleteLayers = useMutation(
    ({ storage, setMyPresence }) => {
      const liveLayers = storage.get("layers");
      const liveLayerIds = storage.get("layerIds");

      for (const id of self.presence.selection) {
        liveLayers.delete(id);

        const index = liveLayerIds.indexOf(id);
        if (index !== -1) {
          liveLayerIds.delete(index);
        }
      }

      setMyPresence({ selection: [] }, { addToHistory: true });
    },
    [self.presence.selection],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "Delete":
          deleteLayers();
          break;
        case "z": {
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              history.redo();
            } else {
              history.undo();
            }
            break;
          }
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [deleteLayers, history]);

  return (
    <main className="h-full w-full relative bg-neutral-100 touch-none">
      <Info boardId={boardId} />
      <Participants />
      <Toolbar
        canvasState={canvasState}
        setCanvasState={setCanvasState}
        canRedo={canRedo}
        canUndo={canUndo}
        undo={history.undo}
        redo={history.redo}
      />
      <SelectionTools camera={camera} setLastUsedColor={setLastUsedColor} />
      <svg
        className="h-[100vh] w-[100vw]"
        onWheel={onWheel}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerUp={onPointerUp}
        onPointerDown={onPointerDown}
      >
        <g
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px)`,
          }}
        >
          {layerIds.map((layerId) => (
            <LayerPreview
              key={layerId}
              id={layerId}
              onLayerPointerDown={onLayerPointerDown}
              selectionColor={layerIdsToColorSelection[layerId]}
            />
          ))}
          <SelectionBox onResizeHandlePointerDown={onResizeHandlePointerDown} />
          {canvasState.mode === CanvasMode.SelectionNet &&
            canvasState.current != null && (
              <rect
                className="fill-blue-500/5 stroke-blue-500 stroke-1"
                x={Math.min(canvasState.origin.x, canvasState.current.x)}
                y={Math.min(canvasState.origin.y, canvasState.current.y)}
                width={Math.abs(canvasState.origin.x - canvasState.current.x)}
                height={Math.abs(canvasState.origin.y - canvasState.current.y)}
              />
            )}
          <CursorsPresence />
          {pencilDraft != null && pencilDraft.length > 0 && (
            <Path
              points={pencilDraft}
              fill={colorToCss(lastUsedColor)}
              x={0}
              y={0}
            />
          )}
        </g>
      </svg>
    </main>
  );
}

// Helper functions (simplified versions)
function pointerEventToCanvasPoint(
  e: React.PointerEvent,
  camera: Camera,
): Point {
  return {
    x: Math.round(e.clientX) - camera.x,
    y: Math.round(e.clientY) - camera.y,
  };
}

function colorToCss(color: Color) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function connectionIdToColor(connectionId: number): string {
  const colors = [
    "#DC2626",
    "#D97706", 
    "#059669",
    "#7C3AED",
    "#DB2777"
  ];
  
  return colors[connectionId % colors.length];
}

function penDraftToPathLayer(
  draft: number[][],
  color: Color,
) {
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const point of draft) {
    const [x, y] = point;

    if (left > x) {
      left = x;
    }

    if (top > y) {
      top = y;
    }

    if (right < x) {
      right = x;
    }

    if (bottom < y) {
      bottom = y;
    }
  }

  return {
    type: LayerType.Path,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    fill: color,
    points: draft.map(([x, y, pressure]) => [x - left, y - top, pressure]),
  };
}

function findIntersectingLayersWithRectangle(
  layerIds: readonly string[],
  layers: ReadonlyMap<string, any>,
  a: Point,
  b: Point,
) {
  const rect = {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };

  const ids = [];

  for (const layerId of layerIds) {
    const layer = layers.get(layerId);

    if (layer == null) {
      continue;
    }

    const { x, y, height, width } = layer;

    if (
      rect.x + rect.width > x &&
      rect.x < x + width &&
      rect.y + rect.height > y &&
      rect.y < y + height
    ) {
      ids.push(layerId);
    }
  }

  return ids;
}

function resizeBounds(bounds: XYWH, corner: Side, point: Point): XYWH {
  const result = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };

  if ((corner & Side.Left) === Side.Left) {
    result.x = Math.min(point.x, bounds.x + bounds.width);
    result.width = Math.abs(bounds.x + bounds.width - point.x);
  }

  if ((corner & Side.Right) === Side.Right) {
    result.x = Math.min(point.x, bounds.x);
    result.width = Math.abs(point.x - bounds.x);
  }

  if ((corner & Side.Top) === Side.Top) {
    result.y = Math.min(point.y, bounds.y + bounds.height);
    result.height = Math.abs(bounds.y + bounds.height - point.y);
  }

  if ((corner & Side.Bottom) === Side.Bottom) {
    result.y = Math.min(point.y, bounds.y);
    result.height = Math.abs(point.y - bounds.y);
  }

  return result;
}

// Placeholder components that would need to be implemented
function Info({ boardId }: { boardId: string }) {
  return (
    <div className="absolute top-2 left-2 bg-white rounded-md px-1.5 h-12 flex items-center shadow-md">
      <h1 className="text-sm font-semibold">화이트보드: {boardId}</h1>
    </div>
  );
}

function Participants() {
  return <div className="absolute top-2 right-2 bg-white rounded-md p-3 flex items-center shadow-md">참가자</div>;
}

function Toolbar({ canvasState, setCanvasState, canRedo, canUndo, undo, redo }: any) {
  return (
    <div className="absolute top-1/2 -translate-y-1/2 left-2 flex flex-col gap-y-2">
      <div className="bg-white rounded-md p-1.5 flex gap-y-1 flex-col items-center shadow-md">
        <button
          onClick={() => setCanvasState({ mode: CanvasMode.None })}
          className={`p-2 rounded-md ${canvasState.mode === CanvasMode.None ? 'bg-gray-200' : ''}`}
        >
          선택
        </button>
        <button
          onClick={() => setCanvasState({ mode: CanvasMode.Inserting, layerType: LayerType.Rectangle })}
          className={`p-2 rounded-md ${canvasState.mode === CanvasMode.Inserting && canvasState.layerType === LayerType.Rectangle ? 'bg-gray-200' : ''}`}
        >
          사각형
        </button>
        <button
          onClick={() => setCanvasState({ mode: CanvasMode.Inserting, layerType: LayerType.Ellipse })}
          className={`p-2 rounded-md ${canvasState.mode === CanvasMode.Inserting && canvasState.layerType === LayerType.Ellipse ? 'bg-gray-200' : ''}`}
        >
          원
        </button>
        <button
          onClick={() => setCanvasState({ mode: CanvasMode.Pencil })}
          className={`p-2 rounded-md ${canvasState.mode === CanvasMode.Pencil ? 'bg-gray-200' : ''}`}
        >
          펜
        </button>
      </div>
    </div>
  );
}

function SelectionTools({ camera, setLastUsedColor }: any) {
  return null;
}

function LayerPreview({ id, onLayerPointerDown, selectionColor }: any) {
  const layer = useStorage((root) => root.layers.get(id));

  if (!layer) {
    return null;
  }

  return (
    <g
      className="drop-shadow-md"
      onPointerDown={(e) => onLayerPointerDown(e, id)}
      style={{
        transform: `translate(${layer.x}px, ${layer.y}px)`,
      }}
    >
      {layer.type === LayerType.Rectangle && (
        <rect
          className="fill-blue-500 stroke-1"
          style={{
            transform: `translate(${layer.x}px, ${layer.y}px)`,
          }}
          fill={colorToCss(layer.fill)}
          stroke={selectionColor || "transparent"}
          strokeWidth="1"
          width={layer.width}
          height={layer.height}
        />
      )}
      {layer.type === LayerType.Ellipse && (
        <ellipse
          className="drop-shadow-md"
          style={{
            transform: `translate(${layer.x + layer.width / 2}px, ${layer.y + layer.height / 2}px)`,
          }}
          fill={colorToCss(layer.fill)}
          stroke={selectionColor || "transparent"}
          strokeWidth="1"
          rx={layer.width / 2}
          ry={layer.height / 2}
        />
      )}
    </g>
  );
}

function SelectionBox({ onResizeHandlePointerDown }: any) {
  return null;
}

function CursorsPresence() {
  return null;
}

function Path({ points, fill, x, y }: any) {
  return (
    <path
      className="drop-shadow-md"
      onPointerDown={(e) => e.stopPropagation()}
      d={getSvgPathFromStroke(getStroke(points))}
      style={{
        transform: `translate(${x}px, ${y}px)`,
      }}
      fill={fill}
    />
  );
}

// Simplified stroke functions
function getStroke(points: number[][]) {
  return points.map(([x, y]) => [x, y]);
}

function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
}
