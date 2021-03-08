import $ = require("jquery");
import { Composer } from "./composer";

export class Viewport {
  composer: Composer;

  width: number;
  height: number;
  position: [number, number];
  zoom: number = 1.0;
  drag: boolean = false;
  drag_pos: [number, number] | null = null;
  pinch_length: number | null = null;

  constructor(composer: Composer) {
    this.composer = composer;

    [this.width, this.height] = [0, 0];
    this.position = [ 0.0, 0.0 ];
    this.zoom = 1.0;
    this.updateScreen();

    const on_down = ([x, y]: [number, number]) => {
      this.drag = true;
      this.drag_pos = [x, y];
    };
    const on_up_or_leave = () => {
      this.drag = false;
      this.composer.node_drag = null;
    };
    const on_move = ([x, y]: [number, number]) => {
      if (this.composer.node_drag === null) {
        if (this.drag_pos !== null) {
          this.onShift([x - this.drag_pos[0], y - this.drag_pos[1]]);
        }
        this.drag_pos = [x, y];
      } else {
        this.composer.node_drag.pos = x;
      }
    };

    const raw_html = this.composer.html[0];

    raw_html.addEventListener("mousedown", (e: MouseEvent) => {
      e.preventDefault();
      on_down([e.clientX, e.clientY]);
    });
    raw_html.addEventListener("mouseup", (e: MouseEvent) => {
      e.preventDefault();
      on_up_or_leave();
    });
    raw_html.addEventListener("mouseleave", (e: MouseEvent) => {
      e.preventDefault();
      on_up_or_leave();
    });
    raw_html.addEventListener("mousemove", (e: MouseEvent) => {
      if (this.drag) {
        e.preventDefault();
        on_move([e.clientX, e.clientY]);
      }
    });
    raw_html.addEventListener("wheel", (e: WheelEvent) => {
      e.preventDefault();
      this.onZoom(Math.pow(2.0, 0.25 * Math.sign(-e.deltaY)), [e.clientX, e.clientY]);
    });

    raw_html.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      this.drag_pos = null;
      this.pinch_length = null;
      if (e.touches.length !== 1) {
        return;
      }
      on_down([e.touches[0].clientX, e.touches[0].clientY]);
      this.composer.select(null);
    });
    raw_html.addEventListener("touchend", (e: TouchEvent) => {
      e.preventDefault();
      this.drag_pos = null;
      this.pinch_length = null;
      if (e.touches.length !== 0) {
        return;
      }
      on_up_or_leave();
    });
    raw_html.addEventListener("touchmove", (e: TouchEvent) => {
      e.preventDefault();
      switch (e.touches.length) {
        case 1: {
          this.pinch_length = null;
          on_move([e.touches[0].clientX, e.touches[0].clientY]);
          break;
        }
        case 2: {
          this.drag_pos = null;
          this.composer.node_drag = null;
          const [x0, y0] = [e.touches[0].clientX, e.touches[0].clientY];
          const [x1, y1] = [e.touches[1].clientX, e.touches[1].clientY];
          const [cx, cy] = [0.5 * (x0 + x1), 0.5 * (y0 + y1)];
          const [dx, dy] = [x1 - x0, y1 - y0];
          const l = Math.sqrt(dx * dx + dy * dy);
          if (this.pinch_length !== null) {
            this.onZoom(l / this.pinch_length, [cx, cy]);
          }
          this.pinch_length = l;
          break;
        }
        default: {
          this.drag_pos = null;
          this.pinch_length = null;
          this.composer.node_drag = null;
          break;
        }
      }
    });
  }

  screenToViewport([x, y]: [number, number]): [number, number] {
    return [
      this.zoom * (x - 0.5 * this.width) + this.position[0],
      this.zoom * (y - 0.5 * this.height) + this.position[1],
    ];
  }
  viewportToScreen([x, y]: [number, number]): [number, number] {
    return [
      (x - this.position[0]) / this.zoom + 0.5 * this.width,
      (y - this.position[1]) / this.zoom + 0.5 * this.height,
    ];
  }
  updateViewport() {
    let [cx, cy] = this.viewportToScreen([0.0, 0.0]);
    this.composer.anchor.css("left", cx + "px");
    this.composer.anchor.css("top", cy + "px");
    //this.anchor.css("scale", (1.0 / this.zoom).toString());
    this.composer.anchor.css("transform", "scale(" + (1.0 / this.zoom).toString() + ")");
  }
  updateScreen() {
    let rect = this.composer.html[0].getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.updateViewport();
  }

  onZoom(factor: number, [sx, sy] : [number, number]) {
    let zoom = this.zoom / factor;
    let dz = this.zoom - zoom;
    this.position[0] += (sx - 0.5 * this.width) * dz;
    this.position[1] += (sy - 0.5 * this.height) * dz;
    this.zoom = zoom;
    this.updateViewport();
  }
  onShift([dx, dy]: [number, number]) {
    this.position[0] -= dx * this.zoom;
    this.position[1] -= dy * this.zoom;
    this.updateViewport();
  }
}
