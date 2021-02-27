import $ = require("jquery");
import { Person, mixIds } from "../data";
import { PersonNode, HorizontalLink, VerticalLink } from "./elements";
import style from "../gen/style-defs";

export class Composer {
  nodes: Map<string, PersonNode>;
  hlinks: Map<string, HorizontalLink>;
  vlinks: Map<string, VerticalLink>;
  html: JQuery<HTMLElement>;

  constructor() {
    this.nodes = new Map<string, PersonNode>();
    this.hlinks = new Map<string, HorizontalLink>();
    this.vlinks = new Map<string, VerticalLink>();
    this.html = $("<div class='composer-box'></div>");
  }

  createNode(person: Person, position: number, level: number): PersonNode {
    if (this.nodes.has(person.id)) {
      return this.nodes.get(person.id)!;
    } else {
      let node = new PersonNode(this, person, position, level);
      this.nodes.set(person.id, node);
      this.html.append(node.html);
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
      this.html.append(hlink.html);
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
      this.html.append(vlink.html);
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
