import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import PaintCanvas from "./paintcanvas";
import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import { ImageProps, LineProps } from "@/types/paint.types";
import { parseGIF, decompressFrames } from "gifuct-js";

interface Step3NonElderlyProps {
  stepFunctions: {
    goBack: () => void;
    goNext: () => void;
  };
}

const getFileType: (fileName: string) => "image" | "gif" = (fileName) => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  console.log("Extension: " + extension);

  switch (extension) {
    case "jpg":
    case "jpeg":
    case "png":
      return "image";
    case "gif":
      return "gif";
    default:
      return "image";
  }
};

const extractFramesAndDuration: (
  fileName: string,
) => Promise<[HTMLCanvasElement[], number[], ImageData[], number[][]]> = async (
  fileName,
) => {
  const frameCanvasList: HTMLCanvasElement[] = [];
  const frameDurationList: number[] = [];
  const imageDataList: ImageData[] = [];
  const framePositionList: number[][] = [];
  try {
    const response = await fetch(fileName);
    const arrayBuffer = await response.arrayBuffer();
    const gif = parseGIF(arrayBuffer);
    const frames = decompressFrames(gif, true);

    frames.forEach((frame: any) => {
      const { dims, patch } = frame;
      const imageData = new ImageData(
        new Uint8ClampedArray(patch),
        dims.width,
        dims.height,
      );
      const canvas = document.createElement("canvas");
      // canvas.width = dims.width;
      // canvas.height = dims.height;

      frameCanvasList.push(canvas);
      frameDurationList.push(frame.delay);
      imageDataList.push(imageData);
      framePositionList.push([
        frame.dims.left as number,
        frame.dims.top as number,
      ]);

      console.log(frame.disposalType);
    });
  } catch (error) {
    const e = error as Error;
    throw new Error(
      `Could not extract gif files. Please make sure that your file type is correct! \n ${e.message}`,
    );
  }
  return [frameCanvasList, frameDurationList, imageDataList, framePositionList];
};

export default function Step3NonElderly({
  stepFunctions,
}: Step3NonElderlyProps) {
  const progress = (3 / 4) * 100;

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null);

  // useEffect's
  useEffect(() => {
    loadImage();
  }, []);

  // useRef's
  const canvasRef = useRef<{
    getStageRef: () => Konva.Stage;
    getBackgroundLayer: () => Konva.Layer;
    getStickerLayer: () => Konva.Layer;
    getDrawables: () => (ImageProps | LineProps)[];
    getCanvas: () => HTMLCanvasElement;
    getDimensions: () => {
      w: number;
      h: number;
      y: number;
      x: number;
      layerW: number; // equivalent for canvasDimensions width and height
      layerH: number;
    };
  }>(null);

  // This is where the image source is set
  const imageSourceRef = useRef("../../glasses.gif");

  const loadImage = async () => {
    const img = new Image();
    img.src = imageSourceRef.current;
    img.onload = () => {
      setBackgroundImage(img);
    };
    img.onerror = () => {
      throw new Error("File is corrupt or file does not exist.");
    };
  };

  const download = (url: string, destination: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = destination;
    link.click();
  };

  const deselectCanvas = () => {
    const t = canvasRef.current?.getStickerLayer().findOne("Transformer");

    if (t instanceof Konva.Transformer) {
      t.nodes([]); // Clear the transformer nodes
      canvasRef.current?.getStickerLayer()?.batchDraw(); // Redraw the layer
    }
  };

  const exportCanvasAsStatic = async () => {
    deselectCanvas();

    const bgImg = backgroundImage;
    const bgLayer = canvasRef.current!.getBackgroundLayer();
    const stickerLayer = canvasRef.current!.getStickerLayer();
    const stage = canvasRef.current!.getStageRef();
    const dims = canvasRef.current!.getDimensions();

    if (!bgImg) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = bgImg.width;
    exportCanvas.height = bgImg.height;
    const exportCtx = exportCanvas.getContext("2d");

    // Reset scale and position
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });

    if (!exportCtx) return;
    exportCtx.drawImage(bgImg, 0, 0);

    exportCtx.drawImage(
      stickerLayer.toCanvas({ pixelRatio: 1 }),
      0,
      0,
      dims.layerW,
      dims.layerH,
      0,
      0,
      exportCanvas.width,
      exportCanvas.height,
    );

    const imgDataUrl = exportCanvas.toDataURL("image/png");
    download(imgDataUrl, "exportedKonva");
  };

  const exportCanvasAsGIF = async () => {
    deselectCanvas();
    if (getFileType(imageSourceRef.current) === "image") return;
    const dims = canvasRef.current!.getDimensions();

    const gif = new window.GIF({
      workers: 2,
      quality: 10,
      width: dims.layerW,
      height: dims.layerH,
      workerScript: "/worker/gif.worker.js",
    });

    const [frames, frameDurations, images, framePositions] =
      await extractFramesAndDuration(imageSourceRef.current);
    const stickerLayer = canvasRef.current!.getStickerLayer();
    const stickerAsCanvas = stickerLayer.toCanvas();
    const [width, height] = [images[0].width, images[0].height];

    // Create a cumulative "gifCanvas" to persist GIF state across frames
    const gifCanvas = document.createElement("canvas");
    gifCanvas.width = width;
    gifCanvas.height = height;
    const gifCtx = gifCanvas.getContext("2d");
    if (!gifCtx) throw new Error("Failed to get gifCanvas context");

    // Process and overlay sticker and background layers
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      frame.width = width;
      frame.height = height;

      const ctx = frame.getContext("2d");
      if (ctx) {
        const tempCanvas = document.createElement("canvas");
        // First frame always has the correct dimensions
        // subsequent frames could be patches which could be smaller
        tempCanvas.width = width;
        tempCanvas.height = height;

        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) throw new Error("Failed to get tempCanvas context");

        const scaleX = frame.width / images[0].width;
        const scaleY = frame.height / images[0].height;

        // Draw the patch onto the tempCanvas whilst positioning the patch correctly
        tempCtx.putImageData(
          images[i],
          framePositions[i][0],
          framePositions[i][1],
        );

        // Composite the patch onto the cumulative gifCanvas
        // gifCtx.scale(scaleX, scaleY);
        gifCtx.drawImage(tempCanvas, 0, 0);
        // gifCtx.scale(1 / scaleX, 1 / scaleY);

        // Draw the cumulative gifCanvas onto the current frame
        ctx.drawImage(gifCanvas, 0, 0);

        // Overlay the sticker layer
        ctx.drawImage(
          stickerAsCanvas,
          0,
          0,
          dims.layerW,
          dims.layerH,
          0,
          0,
          width,
          height,
        );

        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    gif.setOptions({
      width,
      height,
    });

    // add to gif worker for merging
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const imgData = frame.toDataURL("image/png");
      const img = new Image();
      img.src = imgData;
      img.onload = () => {
        gif.addFrame(img, { delay: frameDurations[i] });
        console.log(`Imgages: ${img.width}w, ${img.height}h`);
      };
    }

    setTimeout(() => {
      gif.on("finished", (blob: any) => {
        console.log("Download commencing");
        const url = URL.createObjectURL(blob);
        download(url, "exportedKonva.gif");
      });

      gif.render();
    }, 200);
  };
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold">Sticker Editor</h1>
            <span className="text-sm text-muted-foreground">Step 3 of 4</span>
          </div>
          <Progress value={progress} className="h-1" />
          <p className="text-sm text-muted-foreground">
            Easily design and personalize stickers for your photo
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between">
            <Button variant="outline" onClick={stepFunctions.goBack}>
              Back
            </Button>
            <Button
              className="flex-grow ml-5"
              onClick={() => {
                if (getFileType(imageSourceRef.current) === "gif")
                  exportCanvasAsGIF();
                exportCanvasAsStatic();
              }}
            >
              Next
            </Button>
          </div>
        </div>

        {/*  TODO: Save and next button. */}
      </div>

      {/*TODO: Make grid dimensions dynamic */}
      {/*<div className="flex justify-center items-center h-full w-full">*/}
      {backgroundImage && (
        <PaintCanvas backgroundImage={backgroundImage} ref={canvasRef} />
      )}
      {/*</div>*/}
    </div>
  );
}
