import $ = require("jquery");
import { Person, mixIds } from "../data";
import { PersonNode, HorizontalLink, VerticalLink } from "./elements";
import style from "../gen/style-defs";

export class Composer {
  nodes: Map<string, PersonNode>;
  hlinks: Map<string, HorizontalLink>;
  vlinks: Map<string, VerticalLink>;
  html: JQuery<HTMLElement>;
  anchor: JQuery<HTMLElement>;

  width: number;
  height: number;
  position: [number, number];
  zoom: number;
  drag: boolean;

  constructor(parent: JQuery<HTMLElement>) {
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

    [this.width, this.height] = [0, 0];
    this.position = [ 0.0, 0.0 ];
    this.zoom = 1.0;
    this.updateViewport();

    this.html[0].onwheel = (e: WheelEvent) => {
      e.preventDefault();
      this.onZoom(e.deltaY, [e.clientX, e.clientY]);
    };

    this.drag = false;
    this.html[0].onmousedown = (e: MouseEvent) => {
      e.preventDefault();
      this.drag = true;
    };
    let leaveCallback = (e: MouseEvent) => {
      e.preventDefault();
      this.drag = false;
    };
    this.html[0].onmouseup = leaveCallback;
    this.html[0].onmouseleave = leaveCallback;
    this.html[0].onmousemove = (e: MouseEvent) => {
      if (this.drag) {
        e.preventDefault();
        this.onShift([e.movementX, e.movementY]);
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
  updatePosition() {
    let [cx, cy] = this.viewportToScreen([0.0, 0.0]);
    this.anchor.css("left", cx + "px");
    this.anchor.css("top", cy + "px");
    this.anchor.css("scale", (1.0 / this.zoom).toString());
  }
  updateViewport() {
    let rect = this.html[0].getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.updatePosition();
  }

  onZoom(delta: number, [sx, sy] : [number, number]) {
    let zoom = this.zoom * Math.pow(2.0, 0.1 * delta);
    let dz = this.zoom - zoom;
    this.position[0] += (sx - 0.5 * this.width) * dz;
    this.position[1] += (sy - 0.5 * this.height) * dz;
    this.zoom = zoom;
    this.updatePosition();
  }
  onShift([dx, dy]: [number, number]) {
    this.position[0] -= dx * this.zoom;
    this.position[1] -= dy * this.zoom;
    this.updatePosition();
  }

  createNode(person: Person, position: number, level: number): PersonNode {
    if (this.nodes.has(person.id)) {
      return this.nodes.get(person.id)!;
    } else {
      let node = new PersonNode(this, person, position, level);
      this.nodes.set(person.id, node);
      this.anchor.append(node.html);
      node.updatePosition();
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
      return vlink;
    }
  }
  removeNode(node: PersonNode) {
    node.html.detach();
    this.nodes.delete(node.id());
  }
  removeHorizontal(hlink: HorizontalLink) {
    hlink.html.detach();
    this.hlinks.delete(hlink.id());
  }
  removeVertical(vlink: VerticalLink) {
    vlink.html.detach();
    this.vlinks.delete(vlink.id());
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
}
