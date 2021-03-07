import $ = require("jquery");
import { Person, mixIds } from "../../data";
import { Composer, side_shift } from "../composer";
import { Entity, NodeButton } from "./base";
import { PersonNode } from "./node";
import style from "../../gen/style-defs";
import { Crawler } from "../crawler";

const stroke_width = parseFloat(style.linkStrokeWidth);
const link_margin = parseFloat(style.linkMargin);
const link_color = style.linkColor;
const button_size = parseFloat(style.nodeButtonSize);
const button_distance = parseFloat(style.nodeButtonDistance);

export class HorizontalLink implements Entity {
  composer: Composer;
  nodes: [PersonNode, PersonNode];
  bottom: Map<string, VerticalLink>;
  update_id: [number, number];
  html: JQuery<HTMLElement>;
  svg: JQuery<SVGElement>;
  buttons: NodeButton[];

  static height: number = parseFloat(style.horizontalLinkHeight);

  constructor(composer: Composer, left: PersonNode, right: PersonNode) {
    this.composer = composer;
    this.nodes = [left, right];
    this.update_id = this.updateId();
    this.bottom = new Map<string, VerticalLink>();
    this.html = $(`
    <div class='horizontal-link'>
      <svg xmlns='http://www.w3.org/2000/svg'>
        <path d='' fill='transparent' stroke='${link_color}' stroke-width='${stroke_width}'/>
      </svg>
    </div>
    `);
    this.svg = this.html.find("svg");
    let buttons_info: [() => boolean, () => void, string, string][] = [
      [this.canExpandBottom, this.expandBottom, "horizontal-link-expand-bottom", "images/plus.svg"],
      [this.canCollapseBottom, this.collapseBottom, "horizontal-link-collapse-bottom", "images/minus.svg"],
    ];
    this.buttons = [];
    for (let [check, run, css_class, text] of buttons_info) {
      let button = new NodeButton(check.bind(this), run.bind(this), css_class, text);
      this.html.append(button.html);
      this.buttons.push(button);
    }
    this.updateButtons();
  }

  needUpdate(): boolean {
    const uid = this.updateId();
    if (this.update_id[0] !== uid[0] || this.update_id[1] !== uid[1]) {
      this.update_id = uid;
      return true;
    }
    return false;
  }
  updateId(): [number, number] {
    return [
      this.composer.getUpdateId(this.nodes[0].position),
      this.composer.getUpdateId(this.nodes[1].position),
    ];
  }
  updateButtons() {
    for (let button of this.buttons) {
      button.updateButtons();
    }
  }
  updatePosition(force?: boolean) {
    const pos = [
      this.composer.hposToPx(this.nodes[0].position),
      this.composer.hposToPx(this.nodes[1].position),
    ];
    if (force || this.needUpdate()) {
      const left = Math.min(pos[0], pos[1]);
      const width = Math.abs(pos[0] - pos[1]);
      const margin = link_margin;
      this.html.css("left", (left - margin) + "px");
      this.html.css("width", (width + 2 * margin) + "px");
      const level = this.composer.vposToPx(Math.max(this.nodes[0].level, this.nodes[1].level));
      this.html.css("top", level + "px");

      const tail = PersonNode.box_height / 2;
      const height = HorizontalLink.height;
      this.svg.width(width + 2 * margin);
      this.svg.height(tail + height + margin);
      this.svg.find("path").attr("d", `
        M ${margin + 0} ${0}
        L ${margin + 0} ${tail}
        C ${margin + 0} ${tail + height},
          ${margin + 0.5 * width} ${tail},
          ${margin + 0.5 * width} ${tail + height}
        C ${margin + 0.5 * width} ${tail},
          ${margin + width} ${tail + height},
          ${margin + width} ${tail}
        L ${margin + width} ${0}
      `);

      this.buttons[0].html.css(
        "left",
        (margin + width / 2 - button_size - button_distance / 2) + "px",
      );
      this.buttons[1].html.css(
        "left",
        (margin + width / 2 + button_distance / 2) + "px",
      );
    }
  }
  center(): number {
    return 0.5 * (this.nodes[0].position + this.nodes[1].position);
  }

  id(): string {
    return mixIds(this.nodes[0].id(), this.nodes[1].id());
  }
  neighbors(): IterableIterator<Entity> {
    return function* (self: HorizontalLink) {
      yield self.nodes[0];
      yield self.nodes[1];
      for (let [_, bottom] of self.bottom) {
        yield bottom;
      }
    }(this);
  }
  remove() {
    this.composer.removeHorizontal(this);
  }

  hasBottom(vlink: VerticalLink) {
    return this.bottom.has(vlink.id());
  }
  addBottom(vlink: VerticalLink) {
    if (!this.bottom.has(vlink.id())) {
      this.bottom.set(vlink.id(), vlink);
    } else {
      throw Error("Link already exists");
    }
  }

  commonChildren(): Map<string, Person> {
    let left_children = new Set<string>();
    let common_children = new Map<string, Person>();
    for (let left_child of this.nodes[0].person.children) {
      left_children.add(left_child.id);
    }
    for (let right_child of this.nodes[1].person.children) {
      if (left_children.has(right_child.id)) {
        common_children.set(right_child.id, right_child);
      }
    }
    return common_children;
  }
  canExpandBottom(): boolean {
    return this.commonChildren().size > this.bottom.size;
  }
  expandBottom() {
    let common_children = this.commonChildren();
    let level = Math.max(this.nodes[0].level, this.nodes[1].level) + 1;
    let center = 0.5 * (this.nodes[0].position + this.nodes[1].position);
    let position = center - 0.5 * side_shift * (common_children.size - 1);
    for (let [id, child] of common_children) {
      if (this.bottom.has(mixIds(id, this.id()))) {
        continue;
      }
      let node = this.composer.createNode(child, position, level);
      let vlink = this.composer.bindVertical(this, node);
      this.addBottom(vlink);
      node.setTop(vlink);
      node.updateButtons();
      position += side_shift;
    }
    this.updateButtons();
    this.nodes[0].updateButtons();
    this.nodes[1].updateButtons();
  }
  canCollapseBottom(): boolean {
    return this.bottom.size > 0;
  }
  collapseBottom() {
    let ignore = [this.id()];
    let crawler = new Crawler(ignore);
    for (let [_, node] of this.bottom) {
      crawler.traverse(node);
    }
    for (let [_, node] of crawler.visited) {
      node.remove();
    }
    this.bottom.clear();
    this.updateButtons();
    this.nodes[0].updateButtons();
    this.nodes[1].updateButtons();
  }
}

export class VerticalLink implements Entity {
  composer: Composer;
  top: HorizontalLink;
  bottom: PersonNode;
  update_id: [number, number];
  html: JQuery<HTMLElement>;
  svg: JQuery<SVGElement>;

  static height: number = parseFloat(style.verticalLinkHeight);

  constructor(composer: Composer, top: HorizontalLink, bottom: PersonNode) {
    this.composer = composer;
    this.top = top;
    this.bottom = bottom;
    this.update_id = this.updateId();
    this.html = $(`
    <div class='vertical-link'>
      <svg xmlns='http://www.w3.org/2000/svg'>
        <path d='' fill='transparent' stroke='${link_color}' stroke-width='${stroke_width}'/>
      </svg>
    </div>
    `);
    this.svg = this.html.find("svg");
  }

  needUpdate(): boolean {
    const uid = this.updateId();
    if (this.update_id[0] !== uid[0] || this.update_id[1] !== uid[1]) {
      this.update_id = uid;
      return true;
    }
    return false;
  }
  updateId(): [number, number] {
    return [
      this.composer.getUpdateId(this.top.center()),
      this.composer.getUpdateId(this.bottom.position),
    ];
  }
  updatePosition(force?: boolean) {
    if (force || this.needUpdate()) {
      let top_center = this.composer.hposToPx(this.top.center());
      let bottom_center = this.composer.hposToPx(this.bottom.position);
      let left = Math.min(top_center, bottom_center);
      let width = Math.abs(top_center - bottom_center);
      this.html.css("left", ((left) - link_margin) + "px");
      this.html.css("width", (width + 2 * link_margin) + "px");
      let level = Math.max(this.top.nodes[0].level, this.top.nodes[1].level);
      this.html.css("top", (this.composer.vposToPx(level) + 0.5 * PersonNode.box_height + HorizontalLink.height) + "px");

      const margin = link_margin;
      const tail = 0.5 * PersonNode.box_height;
      const height = VerticalLink.height;
      this.svg.width(width + 2 * link_margin);
      this.svg.height(height + tail);
      const begin = top_center - left;
      const end = bottom_center - left;
      this.svg.find("path").attr("d", `
        M ${margin + begin} ${0}
        C ${margin + begin} ${height},
          ${margin + end} ${0},
          ${margin + end} ${height}
        L ${margin + end} ${height + tail}
      `);
    }
  }

  id(): string {
    return mixIds(this.top.id(), this.bottom.id());
  }
  neighbors(): IterableIterator<Entity> {
    return function* (self: VerticalLink) {
      yield self.top;
      yield self.bottom;
    }(this);
  }
  remove() {
    this.composer.removeVertical(this);
  }
}
