import $ = require("jquery");
import { Person, mixIds } from "../../data";
import { PersonNode, HorizontalLink, VerticalLink } from "../elements";
import style from "../../gen/style-defs";
import { Layout, Solver } from "../../layouts";
import { Viewport } from "./viewport";
import { Animator } from "./animator";

export const side_shift = 0.1;
const vertical_step = parseFloat(style.personVerticalStep);
const horizontal_step = parseFloat(style.personHorizontalStep);

export type Selection = {
  id: string,
  type: "node" | "hlink",
};

export class Composer {
  nodes: Map<string, PersonNode>;
  hlinks: Map<string, HorizontalLink>;
  vlinks: Map<string, VerticalLink>;
  html: JQuery<HTMLElement>;
  anchor: JQuery<HTMLElement>;

  viewport: Viewport;
  animator: Animator;

  node_drag: {
    id: string;
    pos: number | null;
  } | null = null;
  selected: Selection | null = null;

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

    this.viewport = new Viewport(this);
    this.animator = new Animator(this, layout);
  }

  screenToNodePos(x: number): number {
    return this.viewport.screenToViewport([x, 0.0])[0] / horizontal_step;
  }
  select(sel: Selection | null) {
    if (this.selected !== null) {
      switch (this.selected.type) {
        case "node": {
          this.nodes.get(this.selected.id)!.html.removeClass("person-container-hover");
          break;
        }
        case "hlink": {
          this.hlinks.get(this.selected.id)!.html.removeClass("horizontal-link-hover");
          break;
        }
      }
    }
    if (sel !== null) {
      switch (sel.type) {
        case "node": {
          this.nodes.get(sel.id)!.html.addClass("person-container-hover");
          break;
        }
        case "hlink": {
          this.hlinks.get(sel.id)!.html.addClass("horizontal-link-hover");
          break;
        }
      }
    }
    this.selected = sel;
  }
  syncNodeDrag() {
    if (this.node_drag === null) {
      throw Error("Node is not dragging now");
    }
    if (this.node_drag.pos !== null) {
      let node = this.nodes.get(this.node_drag.id)!;
      node.position = this.screenToNodePos(this.node_drag.pos);
      node.updatePosition(true);
      if (this.animator.solver !== null) {
        this.animator.solver.pullNode(node.id());
      }
    }
  }
  registerNodeMouse(node: PersonNode) {
    const container = node.html[0];
    const box = node.html.find(".person-box")[0];
    const on_down = () => {
      this.node_drag = {
        id: node.id(),
        pos: null,
      };
      this.viewport.drag = true;
      this.animator.restartSolver();
    };
    box.addEventListener("mousedown", (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      on_down();
    });
    box.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length !== 1) {
        return;
      }
      e.stopPropagation();
      on_down();
      this.select({ id: node.id(), type: "node" });
    });
  }
  registerHorizontalLinkMouse(hlink: HorizontalLink) {
    hlink.html[0].addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length !== 1) {
        return;
      }
      e.stopPropagation();
      this.select({ id: hlink.id(), type: "hlink" });
    });
  }

  createNode(person: Person, position: number, level: number): PersonNode {
    if (this.nodes.has(person.id)) {
      return this.nodes.get(person.id)!;
    } else {
      let node = new PersonNode(this, person, position, level);
      this.nodes.set(person.id, node);
      this.anchor.append(node.html);
      this.registerNodeMouse(node);
      node.updatePosition(true);
      this.animator.updateSolver();
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
      this.registerHorizontalLinkMouse(hlink);
      hlink.updatePosition(true);
      this.animator.updateSolver();
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
      vlink.updatePosition(true);
      this.animator.updateSolver();
      return vlink;
    }
  }
  removeNode(node: PersonNode) {
    node.html.detach();
    this.nodes.delete(node.id());
    this.animator.updateSolver();
  }
  removeHorizontal(hlink: HorizontalLink) {
    hlink.html.detach();
    this.hlinks.delete(hlink.id());
    this.animator.updateSolver();
  }
  removeVertical(vlink: VerticalLink) {
    vlink.html.detach();
    this.vlinks.delete(vlink.id());
    this.animator.updateSolver();
  }

  vsizeToPx(vsize: number): number {
    return vertical_step * vsize;
  }
  vposToPx(vpos: number): number {
    return this.vsizeToPx(vpos);
  }
  hsizeToPx(hsize: number): number {
    return horizontal_step * hsize;
  }
  hposToPx(hpos: number): number {
    return this.hsizeToPx(hpos);
  }
  getUpdateId(pos: number): number {
    return Math.round(3 * this.vsizeToPx(pos) / this.viewport.zoom);
  }
}
