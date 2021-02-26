import $ = require("jquery");
import { mixIds } from "./id";
import { PersonNode, HorizontalLink, VerticalLink } from "./node";
import { Person } from "./types";

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

  createNode(person: Person): PersonNode {
    if (this.nodes.has(person.id)) {
      return this.nodes.get(person.id)!;
    } else {
      let node = new PersonNode(this, person);
      this.nodes.set(person.id, node);
      this.html.append(node.html);
      return node;
    }
  }
  bindHorizontal(left: PersonNode, right: PersonNode): HorizontalLink {
    const id = mixIds(left.id, right.id);
    if (this.hlinks.has(id)) {
      return this.hlinks.get(id)!;
    } else {
      let hlink = new HorizontalLink(this, left, right);
      this.hlinks.set(id, hlink);
      left.addSide(hlink);
      right.addSide(hlink);
      this.html.append(hlink.html);
      return hlink;
    }
  }
  bindVertical(top: HorizontalLink, bottom: PersonNode): VerticalLink {
    const id = mixIds(top.id, bottom.id);
    if (this.vlinks.has(id)) {
      return this.vlinks.get(id)!;
    } else {
      let vlink = new VerticalLink(this, top, bottom);
      this.vlinks.set(id, vlink);
      top.addBottom(vlink);
      bottom.setTop(vlink);
      this.html.append(vlink.html);
      return vlink;
    }
  }
}
