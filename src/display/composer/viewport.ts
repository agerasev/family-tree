import $ = require("jquery");

export class Viewport {
  html: JQuery<HTMLElement>;
  anchor: JQuery<HTMLElement>;

  width: number;
  height: number;
  position: [number, number];
  zoom: number = 1.0;
  drag: boolean = false;
  drag_pos: [number, number] = [0, 0];
  node_drag: {
    id: string;
    pos: number;
  } | null = null;

  constructor(html: JQuery<HTMLElement>, anchor: JQuery<HTMLElement>) {
    this.html = html;
    this.anchor = anchor;

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
      this.node_drag = null;
    };
    const on_move = ([x, y]: [number, number]) => {
      if (this.node_drag === null) {
        this.onShift([x - this.drag_pos[0], y - this.drag_pos[1]]);
        this.drag_pos = [x, y];
      } else {
        this.node_drag.pos = x;
      }
    };

    this.html[0].onmousedown = (e: MouseEvent) => {
      e.preventDefault();
      on_down([e.clientX, e.clientY]);
    };
    this.html[0].onmouseup = (e: MouseEvent) => {
      e.preventDefault();
      on_up_or_leave();
    };
    this.html[0].onmouseleave = (e: MouseEvent) => {
      e.preventDefault();
      on_up_or_leave();
    };
    this.html[0].onmousemove = (e: MouseEvent) => {
      if (this.drag) {
        e.preventDefault();
        on_move([e.clientX, e.clientY]);
      }
    };
    this.html[0].onwheel = (e: WheelEvent) => {
      e.preventDefault();
      this.onZoom(e.deltaY, [e.clientX, e.clientY]);
    };

    this.html[0].ontouchstart = (e: TouchEvent) => {
      e.preventDefault();
      on_down([e.touches[0].clientX, e.touches[0].clientY]);
      alert("On down");
    };
    this.html[0].ontouchend = (e: TouchEvent) => {
      e.preventDefault();
      on_up_or_leave();
    };
    this.html[0].ontouchmove = (e: TouchEvent) => {
      e.preventDefault();
      switch (e.touches.length) {
        case 1: {
          on_move([e.touches[0].clientX, e.touches[0].clientY]);
        }
        case 2: {
          break;
        }
        default: {
          break;
        }
      }
    };
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
    this.anchor.css("left", cx + "px");
    this.anchor.css("top", cy + "px");
    //this.anchor.css("scale", (1.0 / this.zoom).toString());
    this.anchor.css("transform", "scale(" + (1.0 / this.zoom).toString() + ")");
  }
  updateScreen() {
    let rect = this.html[0].getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.updateViewport();
  }

  onZoom(delta: number, [sx, sy] : [number, number]) {
    let zoom = this.zoom * Math.pow(2.0, 0.25 * Math.sign(delta));
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
