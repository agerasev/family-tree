import $ = require("jquery");
import { Person, mixIds } from "../data";
import { PersonNode, HorizontalLink, VerticalLink } from "./elements";
import style from "../gen/style-defs";
import { Layout, Solver } from "../layouts";

export const side_shift = 0.1;

export class Composer {
  nodes: Map<string, PersonNode>;
  hlinks: Map<string, HorizontalLink>;
  vlinks: Map<string, VerticalLink>;
  html: JQuery<HTMLElement>;
  anchor: JQuery<HTMLElement>;
  
  layout: Layout;
  solver: Solver | null = null;
  dirty: boolean = false;
  loop: ReturnType<typeof window.requestAnimationFrame> | null = null;
  prev_step: number = 0.0;
  static min_step = 40.0;
  static max_step = 80.0;

  width: number;
  height: number;
  position: [number, number];
  zoom: number = 1.0;
  drag: boolean = false;
  node_drag: {
    id: string;
    pos: number;
  } | null = null;

  constructor(parent: JQuery<HTMLElement>, layout: Layout) {
    this.nodes = new Map<string, PersonNode>();
    this.hlinks = new Map<string, HorizontalLink>();
    this.vlinks = new Map<string, VerticalLink>();
    this.html = $(`
    <div class='composer-container'>
      <div class='composer-anchor'>
      </div>
    </div>
    `);
    this.anchor = this.html.find(".composer-anchor");
    parent.append(this.html);

    this.layout = layout;

    [this.width, this.height] = [0, 0];
    this.position = [ 0.0, 0.0 ];
    this.zoom = 1.0;
    this.updateScreen();

    this.html[0].onwheel = (e: WheelEvent) => {
      e.preventDefault();
      this.onZoom(e.deltaY, [e.clientX, e.clientY]);
    };

    this.html[0].onmousedown = (e: MouseEvent) => {
      e.preventDefault();
      this.drag = true;
    };
    let leaveCallback = (e: MouseEvent) => {
      e.preventDefault();
      this.drag = false;
      this.node_drag = null;
    };
    this.html[0].onmouseup = leaveCallback;
    this.html[0].onmouseleave = leaveCallback;

    this.html[0].onmousemove = (e: MouseEvent) => {
      if (this.drag) {
        e.preventDefault();
        if (this.node_drag === null) {
          this.onShift([e.movementX, e.movementY]);
        } else {
          this.node_drag.pos = this.screenToNodePos(e.clientX);
        }
      }
    };
  }
  static node_step = parseFloat(style.personHorizontalStep);
  screenToNodePos(x: number): number {
    return this.screenToViewport([x, 0.0])[0] / Composer.node_step;
  }
  syncNodeDrag() {
    if (this.node_drag === null) {
      throw Error("Node is not dragging now");
    }
    let node = this.nodes.get(this.node_drag.id)!;
    node.position = this.node_drag.pos;
    node.updatePosition();
    if (this.solver !== null) {
      this.solver.pullNode(node.id());
    }
  }
  registerNodeMouse(node: PersonNode) {
    let elem = node.html.find(".person-box")[0];
    elem.onmousedown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.node_drag = {
        id: node.id(),
        pos: this.screenToNodePos(e.clientX),
      };
      this.drag = true;
      this.restartSolver();
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

  createNode(person: Person, position: number, level: number): PersonNode {
    if (this.nodes.has(person.id)) {
      return this.nodes.get(person.id)!;
    } else {
      let node = new PersonNode(this, person, position, level);
      this.nodes.set(person.id, node);
      this.anchor.append(node.html);
      this.registerNodeMouse(node);
      node.updatePosition();
      this.updateSolver();
      return node;
    }
  }
  bindHorizontal(left: PersonNode, right: PersonNode): HorizontalLink {
    const id = mixIds(left.id(), right.id());
    if (this.hlinks.has(id)) {
      return this.hlinks.get(id)!;
    } else {
      let hlink = new HorizontalLink(this, left, right);
      this.hlinks.set(id, hlink);
      this.anchor.append(hlink.html);
      hlink.updatePosition();
      this.updateSolver();
      return hlink;
    }
  }
  bindVertical(top: HorizontalLink, bottom: PersonNode): VerticalLink {
    const id = mixIds(top.id(), bottom.id());
    if (this.vlinks.has(id)) {
      return this.vlinks.get(id)!;
    } else {
      let vlink = new VerticalLink(this, top, bottom);
      this.vlinks.set(id, vlink);
      this.anchor.append(vlink.html);
      vlink.updatePosition();
      this.updateSolver();
      return vlink;
    }
  }
  removeNode(node: PersonNode) {
    node.html.detach();
    this.nodes.delete(node.id());
    this.updateSolver();
  }
  removeHorizontal(hlink: HorizontalLink) {
    hlink.html.detach();
    this.hlinks.delete(hlink.id());
    this.updateSolver();
  }
  removeVertical(vlink: VerticalLink) {
    vlink.html.detach();
    this.vlinks.delete(vlink.id());
    this.updateSolver();
  }

  vsizeToPx(vsize: number): number {
    return parseFloat(style.personVerticalStep) * vsize;
  }
  vposToPx(vpos: number): number {
    return this.vsizeToPx(vpos);
  }
  hsizeToPx(hsize: number): number {
    return parseFloat(style.personHorizontalStep) * hsize;
  }
  hposToPx(hpos: number): number {
    return this.hsizeToPx(hpos);
  }

  startAnimation() {
    if (this.loop === null) {
      this.continueAnimation();
    }
  }
  continueAnimation() {
    this.loop = window.requestAnimationFrame(this.solveCallback.bind(this));
  }
  updateSolver() {
    this.dirty = true;
    this.startAnimation();
  }
  restartSolver() {
    if (this.solver !== null) {
      this.solver.reset();
    }
    this.startAnimation();
  }
  stopAnimation() {
    if (this.loop !== null) {
      window.cancelAnimationFrame(this.loop);
      this.loop = null;
    }
  }
  solveCallback(time: number) {
    if (this.loop === null) {
      return;
    }
    let dt = time - this.prev_step;
    if (dt < Composer.min_step) {
      this.continueAnimation();
      return;
    }

    try {
      if (this.dirty) {
        this.solver = this.layout.createSolver(this.nodes, this.hlinks, this.vlinks);
        this.dirty = false;
      }
      if (this.solver === null) {
        throw Error("Solver is null");
      }
      if (this.node_drag !== null) {
        this.syncNodeDrag();
        this.solver.reset();
      }

      this.solver.compute();
      let cont = this.solver.step(1e-3 * Math.min(dt, Composer.max_step));
      if (cont) {
        this.continueAnimation();
      } else {
        this.stopAnimation();
      }
      this.prev_step = time;

      this.solver.pushRefs();
      this.updateViewport();
    } catch (e) {
      this.stopAnimation();
      throw e;
    }
  }
}
