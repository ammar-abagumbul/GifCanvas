import Konva from "konva";

declare global {
  interface Window {
    gifler: any; // Adjust the type as necessary
    GIF: any;
    parseGIF: any;
    decompressFrames: any;
  }
}

export type ImageProps = {
  id: string;
  src: string;
  width: number;
  height: number;
  x: number;
  y: number;
  type: "image" | "gif";
};

export type LineProps = {
  id: string;
  color: string;
  points: number[];
  strokeWidth: number;
  type: "line";
};

export type DrawableID = string;

export type DraggableShapeProps = {
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (id: DrawableID) => void;
  onDragEnd: (id: DrawableID) => void;
  nodeRef: React.RefObject<any>;
  transformerRef: React.RefObject<Konva.Transformer>;
  shapeProps: any;
};

export type PaintCanvasProps = {
  backgroundImage: HTMLImageElement;
};
