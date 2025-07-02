declare module "gifler" {
  export interface GiflerOptions {
    src?: string;
    delay?: number;
    loop?: boolean;
    width?: number;
    height?: number;
  }

  export interface Animation {
    animateInCanvas: (canvas: HTMLCanvasElement) => void;
    stop: () => void;
    onDrawFrame: (ctx: CanvasRenderingContext2D, frame: any) => void;
  }

  export interface Gifler {
    addFrame(image: HTMLImageElement | CanvasImageSource): void;
    render(callback: (data: string) => void): void;
    on(event: string, callback: () => void): void;
    get: (callback: (anim: Animation) => void) => void;
  }

  export function gifler(src: string): Gifler;
}

