import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
  ChangeEventHandler,
} from "react";
import { Image as KonvaImage, Layer, Stage, Rect } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";
import { v4 as uuidv4 } from "uuid";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Upload,
  PenTool,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "lucide-react";
import { HexColorPicker } from "react-colorful";
import {
  ImageProps,
  LineProps,
  PaintCanvasProps,
  DrawableID,
} from "@/types/paint.types";
import { Scribble, Sticker } from "./drawables";
import { Vector2d } from "konva/lib/types";

const stickers = await fetchStickerPaths();

async function fetchStickerPaths() {
  const acceptedFormats = ["png", "jpg", "gif"];
  const stickerModules = import.meta.glob("/public/Sticker/*");

  const relativePaths = Object.keys(stickerModules)
    .filter((path) => {
      const isAccepted = acceptedFormats.some((format) =>
        path.toLowerCase().endsWith(`.${format}`),
      );

      if (isAccepted) {
        return true;
      } else {
        console.warn(`File "${path}" does not conform to accepted formats.`);
        return false;
      }
    })
    .map((path) => path.replace("/public/", ""));

  return relativePaths;
}

const CanvasActions = {
  SELECT: "select",
  DRAW: "draw",
} as const;

type CanvasAction = (typeof CanvasActions)[keyof typeof CanvasActions];

// PaintCanvas Component
const PaintCanvas = forwardRef(({ backgroundImage }: PaintCanvasProps, ref) => {
  const [MIN_STROKE_WIDTH, MAX_STROKE_WIDTH] = [5, 30];
  const BTN_TOP = "bottom-56";
  const BTN_BOTTOM = "bottom-2";
  const BTN_DELETE_COLOR = "rgb(220 38 38)";

  // Simulating fetching the endpoints from the context
  // example implementation:
  // const sheet = useSheetContext();
  // const endpoints = sheet.data.enabledFeatures.stickerList;
  const endPoints = [
    "/sticker/ammar.png",
    "/sticker/a.png",
    "/sticker/b.png",
    "/sticker/c.png",
  ];

  const [loadedStickers, setLoadedStickers] = useState<string[]>(stickers);
  const [drawables, setDrawables] = useState<(ImageProps | LineProps)[]>([]);
  const [color, setColor] = useState<string>("#ffffff");
  const [selectedId, setSelectedId] = useState<DrawableID>("");
  const [canvasReady, setCanvasReady] = useState(false);
  const [actionState, setActionState] = useState<CanvasAction>(
    CanvasActions.SELECT,
  );

  const [tabVisible, setTabVisible] = useState<string>("");

  const canvas = useMemo(() => {
    const node: HTMLCanvasElement = document.createElement("canvas");
    return node;
  }, []);

  const strokeWidthDisplay = useRef<HTMLDivElement>(null);
  const sliderValue = useRef([15]);
  const stageRef = useRef<Konva.Stage>(null);
  const stickerLayerRef = useRef<Konva.Layer>(null);
  const backgroundLayerRef = useRef<Konva.Layer>(null);
  const isPainting = useRef(false);
  const currentShapeId = useRef<DrawableID | null>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tabsRef = useRef<React.ElementRef<typeof Tabs>>(null); // Type Tabs
  const hexPickerRef = useRef<HTMLDivElement>(null);
  const btnDivRef = useRef<HTMLDivElement>(null);
  const movingItem = useRef<string>("");
  const container = useRef<HTMLDivElement>(null);
  const dim = useRef({ y: 0, x: 0, w: 10, h: 10, layerW: 10, layerH: 10 });

  useEffect(() => {
    if (container.current) {
      const c = container.current;
      const w = c.clientWidth;
      const h = c.clientHeight;
      const displayRatio = c.clientWidth / c.clientHeight;
      const imgRatio = backgroundImage.width / backgroundImage.height;

      let layerW, layerH;

      if (imgRatio > displayRatio) {
        layerW = c.clientWidth;
        layerH =
          (c.clientWidth / backgroundImage.width) * backgroundImage.height;
      } else {
        layerW =
          (c.clientHeight / backgroundImage.height) * backgroundImage.width;
        layerH = c.clientHeight;
      }

      const x = (w - layerW) / 2;
      const y = (h - layerH) / 2;

      dim.current = { x, y, w, h, layerW, layerH };
      setCanvasReady(true);
    }
  });

  useEffect(() => {
    if (canvasReady) {
      const [width, height] = [dim.current.layerW, dim.current.layerH];

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (ctx && backgroundImage) {
        // Draw the provided HTMLImageElement onto the canvas
        ctx.drawImage(backgroundImage, 0, 0, width, height);
      }
      console.log("dimension updated: ", width, height);
    }
  }, [backgroundImage, canvasReady]);

  const getStickers = () => {
    endPoints.forEach((endPoint) => {
      const img = new Image();
      const src = `https://bucket.syncphoto.hk/2002${endPoint}`;
      img.src = src;
      img.onload = () => {
        setLoadedStickers((prev) => [...prev.filter((s) => s !== src), src]);
      };
      img.onerror = () => console.warn(`Failed to fetch: ${src}`);
    });
  };

  useEffect(() => {
    console.log("Fetching your stickers");
    getStickers();
  }, []);

  useImperativeHandle(ref, () => ({
    getStageRef: () => stageRef.current!,
    getBackgroundLayer: () => backgroundLayerRef.current!,
    getStickerLayer: () => stickerLayerRef.current!,
    getDrawables: () => drawables,
    getCanvas: () => canvas,
    getDimensions: () => dim.current!,
  }));

  const toggleTabs = () => {
    if (tabVisible === "hidden") setTabVisible("");
    else setTabVisible("hidden");
  };

  const handleStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>) => {
      hexPickerRef.current?.classList.add("hidden");
      if (actionState === CanvasActions.SELECT) {
        // User deselecting
        if (
          e.target === stageRef.current ||
          e.target.attrs.name === "emptySpace"
        ) {
          setSelectedId("");
        }
        stageRef.current?.draggable(true);
        return;
      }

      isPainting.current = true;
      const stage = stageRef.current;
      const pos = stage?.getRelativePointerPosition();
      if (!pos) return;

      const newId = uuidv4();
      currentShapeId.current = newId;

      setDrawables((prev) => [
        ...prev,
        {
          id: newId,
          points: [pos.x - dim.current.x, pos.y - dim.current.y],
          color: color,
          strokeWidth: sliderValue.current[0],
          type: "line",
        },
      ]);
    },
    [actionState, drawables, color, sliderValue, dim],
  );

  const getDistance = (p1: Point, p2: Point) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const getCenter = (p1: Point, p2: Point): Point => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  };

  type Point = {
    x: number;
    y: number;
  };
  const lastDist = useRef<number>(0);
  const lastCenter = useRef<Point | undefined>(undefined);

  const handlePinchZoom = (
    stage: Konva.Stage,
    touch1: Touch,
    touch2: Touch,
  ) => {
    stage.draggable(false);

    const p1 = { x: touch1.clientX, y: touch1.clientY };
    const p2 = { x: touch2.clientX, y: touch2.clientY };

    if (!lastCenter.current) {
      lastCenter.current = getCenter(p1, p2);
      return;
    }

    const newCenter = getCenter(p1, p2);
    const dist = getDistance(p1, p2);

    if (!lastDist.current) {
      lastDist.current = dist;
    }

    const pointTo = {
      x: (newCenter.x - stage.x()) / stage.scaleX(),
      y: (newCenter.y - stage.y()) / stage.scaleX(),
    };

    const calculatedScale = stage.scaleX() * (dist / lastDist.current);
    const scale = Math.min(Math.max(calculatedScale, 1), 4);

    stage.scaleX(scale);
    stage.scaleY(scale);

    const dx = newCenter.x - lastCenter.current.x;
    const dy = newCenter.y - lastCenter.current.y;

    const newPos = {
      x: newCenter.x - pointTo.x * scale + dx,
      y: newCenter.y - pointTo.y * scale + dy,
    };

    const limitX = stage.width() * scale - stage.width();
    const limitY = stage.height() * scale - stage.height();

    const newX = Math.min(Math.max(newPos.x, -limitX), 0);
    const newY = Math.min(Math.max(newPos.y, -limitY), 0);

    stage.position({ x: newX, y: newY });

    lastDist.current = dist;
    lastCenter.current = newCenter;
  };

  const updateDrawablePoints = (pos) => {
    if (!isPainting.current || !pos || !currentShapeId.current) return;

    setDrawables((prev) =>
      prev.map((scribble) =>
        scribble.id === currentShapeId.current && scribble.type === "line"
          ? {
              ...scribble,
              points: [
                ...scribble.points,
                pos.x - dim.current.x,
                pos.y - dim.current.y,
              ],
            }
          : scribble,
      ),
    );
  };

  const handleStageMouseMove = useCallback(
    (evt: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>) => {
      const stage = stageRef.current!;
      const pos = stage?.getRelativePointerPosition();

      if (stage) {
        const e = evt as KonvaEventObject<TouchEvent>;
        e.evt.preventDefault();

        if (e.evt.touches && e.evt.touches.length === 2) {
          const [touch1, touch2] = e.evt.touches;
          handlePinchZoom(stage, touch1, touch2);
          return;
        }
      }

      if (actionState === CanvasActions.SELECT) return;

      updateDrawablePoints(pos);
    },
    [actionState, dim],
  );

  const handleStageMouseUp = useCallback(() => {
    isPainting.current = false;
    lastDist.current = 0;
    lastCenter.current = undefined;
  }, []);

  const handleOnWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current!;
    const oldScale = stage.scaleX();
    const pointer = stage.getRelativePointerPosition();
    const scaleBy = 1.03;

    if (!pointer) return;

    var mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    let direction = e.evt.deltaY > 0 ? 1 : -1;

    if (e.evt.ctrlKey) {
      direction = -direction;
    }

    var calculatedScale =
      direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const newScale = Math.min(Math.max(calculatedScale, 1), 4);

    stage.scale({ x: newScale, y: newScale });

    const limitX = stage.width() * newScale - stage.width();
    const limitY = stage.height() * newScale - stage.height();

    var newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    const newX = Math.min(Math.max(newPos.x, -limitX), 0);
    const newY = Math.min(Math.max(newPos.y, -limitY), 0);

    stage.position({ x: newX, y: newY });
  }, []);

  const addSticker = useCallback(
    (src: string) => {
      setDrawables((prev) => [
        ...prev,
        {
          id: uuidv4(),
          src: src,
          width: 100,
          height: 100,
          x: 100,
          y: 100,
          type: "image",
        },
      ]);
    },
    [drawables],
  );

  const handleColorChange = useCallback(
    (inputValue: string | undefined) => {
      if (!inputValue) return;
      const isValidHexColor = /^#[0-9A-Fa-f]{6}$/.test(inputValue);
      if (isValidHexColor) {
        setColor(inputValue);
      }
    },
    [drawables, selectedId],
  );

  const handleSliderChange = useCallback(
    (value: number[]) => {
      if (!sliderValue.current || !strokeWidthDisplay.current) return;
      sliderValue.current = value;
      strokeWidthDisplay.current.innerText = value[0].toString();
    },
    [drawables, selectedId, sliderValue],
  );

  const handleShowPicker = useCallback(() => {
    if (hexPickerRef.current) {
      hexPickerRef.current.classList.toggle("hidden");
    }
  }, []);

  const handleDrawableSelect = (id: DrawableID) => {
    if (actionState === CanvasActions.SELECT) setSelectedId(id);
  };

  const deleteSelected = (id: DrawableID) => {
    setDrawables((prev) => prev.filter((drawable) => drawable.id !== id));
    setSelectedId("");
  };

  const withinBounds = (touch: { x: number; y: number }, div: DOMRect) => {
    return (
      touch.x >= div.left &&
      touch.x <= div.right &&
      touch.y >= div.top &&
      touch.y <= div.bottom
    );
  };

  const handleDrawableOnDragStart = (id: DrawableID) => {
    movingItem.current = id;
  };

  const handleDrawableOnDragEnd = (id: DrawableID) => {
    // Place holder for future extensions
  };

  const handlePointerUp = (e: React.PointerEvent | React.MouseEvent) => {
    const btn = buttonRef.current;
    const btnDiv = btnDivRef.current;
    const rect = btnDiv?.getBoundingClientRect();
    if (rect) {
      const pos = { x: e.clientX, y: e.clientY };
      if (withinBounds(pos, rect)) {
        if (movingItem.current) deleteSelected(movingItem.current);
      }
    }
    movingItem.current = "";
    if (btn) btn.style.backgroundColor = "";
  };

  const handlePointerMove = (e: React.PointerEvent | React.MouseEvent) => {
    const btn = buttonRef.current;
    const btnDiv = btnDivRef.current;
    const rect = btnDiv?.getBoundingClientRect();

    if (rect && btn) {
      const pos = { x: e.clientX, y: e.clientY };
      if (withinBounds(pos, rect) && movingItem.current)
        btn.style.backgroundColor = BTN_DELETE_COLOR;
      else btn.style.backgroundColor = "";
    }
  };

  const handleDragBound = (pos: Vector2d): Vector2d => {
    const stage = stageRef.current;
    if (!stage) return pos;
    const scale = stage.scaleX();

    const limitX = stage.width() * scale - stage.width();
    const limitY = stage.height() * scale - stage.height();

    const newX = Math.min(Math.max(pos.x, -limitX), 0);
    const newY = Math.min(Math.max(pos.y, -limitY), 0);

    if (pos.y != newY) window.scrollBy(0, -pos.y);

    return {
      x: newX,
      y: newY,
    };
  };

  const handleFileUpload: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!e.target?.files) throw new Error("Failed to uplaod file");
    const file = e.target?.files[0];
    const src = URL.createObjectURL(file);
    // check file extension
    setLoadedStickers((prev) => [...prev, src]);
  };

  const clipFunc = (context: any) => {
    context.beginPath();
    context.rect(0, 0, dim.current.layerW, dim.current.layerH); // Define the rectangular clipping area
    context.clip();
  };

  return (
    <div
      ref={container}
      className="relative h-full grow flex justify-center items-center bg-black"
      onPointerDown={handlePointerMove}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <Stage
        ref={stageRef}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={handleStageMouseDown}
        onTouchMove={handleStageMouseMove}
        onTouchEnd={handleStageMouseUp}
        draggable={actionState === CanvasActions.SELECT}
        onWheel={handleOnWheel}
        dragBoundFunc={handleDragBound}
        width={dim.current.w}
        height={dim.current.h}
        className="h-full grow flex justify-center items-center bg-black"
      >
        <Layer
          ref={backgroundLayerRef}
          name="backgroundLayer"
          x={dim.current.x}
          y={dim.current.y}
        >
          <KonvaImage
            image={canvas}
            width={dim.current.layerW}
            height={dim.current.layerH}
            name="background"
          />
        </Layer>
        <Layer
          ref={stickerLayerRef}
          name="stickerLayer"
          x={dim.current.x}
          y={dim.current.y}
          clipFunc={clipFunc}
        >
          <Rect
            x={0}
            y={0}
            width={dim.current.layerW}
            height={dim.current.layerH}
            opacity={0}
            name="emptySpace"
          />
          {drawables.map((drawable) => {
            if (drawable.type === "image") {
              return (
                <Sticker
                  key={drawable.id}
                  image={drawable}
                  isSelected={drawable.id === selectedId}
                  onSelect={() => handleDrawableSelect(drawable.id)}
                  onDragStart={(id) => handleDrawableOnDragStart(id)}
                  onDragEnd={(id) => handleDrawableOnDragEnd(id)}
                />
              );
            } else if (drawable.type === "line") {
              return (
                <Scribble
                  key={drawable.id}
                  line={drawable}
                  isSelected={drawable.id == selectedId}
                  onSelect={() => {
                    handleDrawableSelect(drawable.id);
                  }}
                  onDragStart={(id) => handleDrawableOnDragStart(id)}
                  onDragEnd={(id) => handleDrawableOnDragEnd(id)}
                />
              );
            }
          })}
        </Layer>
      </Stage>

      {/* Toggling Button */}
      <div
        className={`touch-none flex items-center justify-center absolute w-20 h-20 left-1/2 transform -translate-x-1/2 p-2
                 ${tabVisible === "hidden" ? BTN_BOTTOM : BTN_TOP}`}
        ref={btnDivRef}
      >
        <button
          className={`p-2 rounded-full bg-gray-200 hover:bg-gray-300`}
          onClick={toggleTabs}
          ref={buttonRef}
        >
          {selectedId ? (
            <TrashIcon className="w-6 h-6" />
          ) : tabVisible === "hidden" ? (
            <ChevronUpIcon className="w-6 h-6" />
          ) : (
            <ChevronDownIcon className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Paint Canvas Control */}
      <Tabs
        ref={tabsRef}
        defaultValue={
          actionState === CanvasActions.SELECT ? "sticker" : "scribble"
        }
        className={`absolute bg-white pt-4 px-4 shadow-lg z-10 bottom-0 left-0 right-0 
            transition-opacity duration-300 ease-in-out transform ${tabVisible} ${
              tabVisible === "hidden" ? "opacity-0" : "opacity-100"
            }`}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            className="flex-1 text-center"
            value="sticker"
            onClick={() => {
              setActionState(CanvasActions.SELECT);
            }}
          >
            Stickers
          </TabsTrigger>
          <TabsTrigger
            className="flex-1 text-center"
            value="scribble"
            onClick={() => {
              setActionState(CanvasActions.DRAW);
              setSelectedId("");
            }}
          >
            Hand-draw Text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sticker" className="bg-white h-[150px] ">
          <div className="flex overflow-x-auto space-x-4 py-4">
            {loadedStickers.map((sticker: string) => (
              <div
                onClick={() => addSticker(sticker)}
                className="overflow-hidden flex-shrink-0 w-24 h-24 ml-2 border rounded-lg cursor-pointer flex items-center justify-center"
              >
                <img src={sticker} alt="Sticker" />
              </div>
            ))}
            <div className="flex-shrink-0 w-24 h-24 ml-2 border rounded-lg cursor-pointer flex items-center justify-center">
              <label>
                <input
                  className="hidden"
                  type="file"
                  onChange={handleFileUpload}
                />
                <Upload />
                Upload
              </label>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="scribble"
          className="bg-white relative h-[150px] p-1 space-y-6"
        >
          {/* Color Picker Section */}
          <div className="flex items-center space-x-4">
            <div
              className="w-8 h-8 rounded-full border"
              style={{
                backgroundColor: color,
              }}
              onClick={handleShowPicker}
            />
            <input
              ref={colorInputRef}
              type="text"
              className="border px-2 py-1 rounded flex-grow"
              placeholder={color}
              onChange={() => handleColorChange(colorInputRef.current?.value)}
            />
          </div>

          <div className="flex justify-center items-center space-x-4">
            <div className="flex-col items-center">
              <PenTool />
              <span className="flex-shrik-0 text-xs whitespace-nowrap">
                Pen Size
              </span>
            </div>
            <Slider
              className=""
              defaultValue={sliderValue.current}
              min={MIN_STROKE_WIDTH}
              max={MAX_STROKE_WIDTH}
              onValueChange={handleSliderChange}
            />{" "}
            <div
              ref={strokeWidthDisplay}
              className="w-12 h-10 flex items-center justify-center border p-2 text-center"
            >
              {sliderValue.current[0]}
            </div>
          </div>

          <div ref={hexPickerRef} className="absolute left-10 -top-56 hidden">
            <HexColorPicker color={color} onChange={handleColorChange} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
});

export default PaintCanvas;
