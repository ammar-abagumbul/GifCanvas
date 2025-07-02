import {
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  Image as KonvaImage,
  Line as KonvaLine,
  Transformer,
} from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";
import useImage from "use-image";
import {
  ImageProps,
  LineProps,
  DraggableShapeProps,
  DrawableID,
} from "@/types/paint.types";

// DraggableShape component for handling different types of shapes (images, gifs, lines)
const DraggableShape: React.FC<DraggableShapeProps> = ({
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
  nodeRef,
  transformerRef,
  shapeProps,
}) => {
  useEffect(() => {
    if (isSelected && nodeRef.current && transformerRef.current) {
      transformerRef.current.nodes([nodeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, nodeRef, transformerRef]);

  // Common drag handlers for both shapes
  const handleDragEnd = useCallback(
    (e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>) => {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) onDragEnd(shapeProps.id);
    },
    [onDragEnd],
  );

  const handleDragStart = useCallback(
    (e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>) => {
      onDragStart(shapeProps.id);
    },
    [onDragStart]
  )

  return (
    <>
      {shapeProps.type === "image" ? (
        <KonvaImage
          ref={nodeRef}
          draggable={isSelected}
          {...shapeProps}
          onClick={onSelect}
          onTap={onSelect}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      ) : (
        <KonvaLine
          ref={nodeRef}
          draggable={isSelected}
          {...shapeProps}
          onClick={onSelect}
          onTap={onSelect}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      )}

      {isSelected && (
        <Transformer
          ref={transformerRef}
          flipEnabled={true}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};

const Sticker = ({
  image,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  image: ImageProps;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (id: DrawableID) => void;
  onDragEnd: (id: DrawableID) => void;
}) => {
  const [stickerImage] = useImage(image.src);
  const imageRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const scaledHeight = stickerImage
    ? (image.width * stickerImage.height) / stickerImage.width
    : 0;

  const shapeProps = {
    type: "image",
    x: image.x,
    y: image.y,
    id: image.id,
    width: image.width,
    height: scaledHeight,
    image: stickerImage,
  };

  return (
    <DraggableShape
      isSelected={isSelected}
      onSelect={onSelect}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      nodeRef={imageRef}
      transformerRef={transformerRef}
      shapeProps={shapeProps}
    />
  );
};

const Scribble = ({
  line,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  line: LineProps;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (id: DrawableID) => void;
  onDragEnd: (id: DrawableID) => void;
}) => {
  const lineRef = useRef<Konva.Line>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const shapeProps = {
    type: "line",
    id: line.id,
    lineCap: "round",
    lineJoin: "round",
    stroke: line.color,
    strokeWidth: line.strokeWidth,
    points: line.points,
  };

  return (
    <DraggableShape
      isSelected={isSelected}
      onSelect={onSelect}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      nodeRef={lineRef}
      transformerRef={transformerRef}
      shapeProps={shapeProps}
    />
  );
};

export { Sticker, Scribble };
