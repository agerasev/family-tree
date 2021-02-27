import $ = require("jquery");
import { Person, mixIds } from "../../data";
import { Composer } from "../composer";
import { Entity, NodeButton } from "./base";
import { PersonNode } from "./node";
import style from "../../gen/style-defs";
import { Crawler } from "../crawler";

const link_margin = parseFloat(style.linkMargin);
const stroke_width = parseFloat(style.strokeWidth);

export class HorizontalLink implements Entity {
  composer: Composer;
  nodes: [PersonNode, PersonNode];
  bottom: Map<string, VerticalLink>;
  html: JQuery<HTMLElement>;
  svg: JQuery<SVGElement>;
  buttons: NodeButton[];

  static height: number = parseFloat(style.horizontalLinkHeight);

  constructor(composer: Composer, left: PersonNode, right: PersonNode) {
    this.composer = composer;
    this.nodes = [left, right];
    this.bottom = new Map<string, VerticalLink>();
    this.html = $(`
    <div class='horizontal-link'>
      <svg xmlns='http://www.w3.org/2000/svg'>
        <path d='' fill='transparent' stroke='black' stroke-width='${stroke_width}'/>
      </svg>
    </div>
    `);
    this.svg = this.html.find("svg");
    let buttons_info: [() => boolean, () => void, string, string][] = [
      [this.canExpandBottom, this.expandBottom, "horizontal-link-expand-bottom", "+"],
      [this.canCollapseBottom, this.collapseBottom, "horizontal-link-collapse-bottom", "−"],
    ];
    this.buttons = [];
    for (let [check, run, css_class, text] of buttons_info) {
      let button = new NodeButton(check.bind(this), run.bind(this), css_class, text);
      this.html.append(button.html);
      this.buttons.push(button);
    }
    this.updateButtons();
  }

  updateButtons() {
    for (let button of this.buttons) {
      button.updateButtons();
    }
  }
  updatePosition() {
    let left = Math.min(this.nodes[0].position, this.nodes[1].position);
    let width = Math.abs(this.nodes[0].position - this.nodes[1].position);
    const px_width = this.composer.hsizeToPx(width);
    const px_margin = link_margin;
    this.html.css("left", (this.composer.hposToPx(left) - px_margin) + "px");
    this.html.css("width", (px_width + 2 * px_margin) + "px");
    let level = Math.max(this.nodes[0].level, this.nodes[1].level)
    this.html.css("top", (this.composer.vposToPx(level) + 0.5 * PersonNode.box_height) + "px");

    const px_height = HorizontalLink.height;
    this.svg.width(px_width + 2 * px_margin);
    this.svg.height(px_height + px_margin);
    this.svg.find("path").attr("d", `
      M ${px_margin + 0} ${0}
      C ${px_margin + 0} ${px_height},
        ${px_margin + 0.5 * px_width} ${0},
        ${px_margin + 0.5 * px_width} ${px_height}
      C ${px_margin + 0.5 * px_width} ${0},
        ${px_margin + px_width} ${px_height},
        ${px_margin + px_width} ${0}
    `);

    this.buttons[0].html.css("left", (0.5 * px_width - parseFloat(style.nodeButtonSize) - 0.5 * parseFloat(style.nodeButtonDistance)) + "px");
    this.buttons[1].html.css("left", (0.5 * px_width + 0.5 * parseFloat(style.nodeButtonDistance)) + "px");
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
    let common_children = new Map<string, Person>();
    for (let left_child of this.nodes[0].person.children) {
      common_children.set(left_child.id, left_child);
    }
    for (let right_child of this.nodes[1].person.children) {
      common_children.set(right_child.id, right_child);
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
    let position = center - 0.5 * (common_children.size - 1);
    for (let [id, child] of common_children) {
      let node = this.composer.createNode(child, position, level);
      let vlink = this.composer.bindVertical(this, node);
      this.addBottom(vlink);
      node.setTop(vlink);
      node.updateButtons();
      position += 1;
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
  html: JQuery<HTMLElement>;
  svg: JQuery<SVGElement>;

  static height: number = parseFloat(style.verticalLinkHeight);

  constructor(composer: Composer, top: HorizontalLink, bottom: PersonNode) {
    this.composer = composer;
    this.top = top;
    this.bottom = bottom;
    this.html = $(`
    <div class='vertical-link'>
      <svg xmlns='http://www.w3.org/2000/svg'>
        <path d='' fill='transparent' stroke='black' stroke-width='1'/>
      </svg>
    </div>
    `);
    this.svg = this.html.find("svg");
  }

  updatePosition() {
    let top_center = 0.5 * (this.top.nodes[0].position + this.top.nodes[1].position);
    let bottom_center = this.bottom.position;
    let left = Math.min(top_center, bottom_center);
    let width = Math.abs(top_center - bottom_center);
    const px_width = this.composer.hsizeToPx(width);
    this.html.css("left", (this.composer.hposToPx(left) - link_margin) + "px");
    this.html.css("width", (px_width + 2 * link_margin) + "px");
    let level = Math.max(this.top.nodes[0].level, this.top.nodes[1].level);
    this.html.css("top", (this.composer.vposToPx(level) + 0.5 * PersonNode.box_height + HorizontalLink.height) + "px");

    const px_margin = link_margin;
    const px_height = VerticalLink.height;
    this.svg.width(px_width + 2 * link_margin);
    this.svg.height(px_height);
    const begin = this.composer.hsizeToPx(top_center - left);
    const end = this.composer.hsizeToPx(bottom_center - left);
    this.svg.find("path").attr("d", `
      M ${px_margin + begin} ${0}
      C ${px_margin + begin} ${px_height},
        ${px_margin + end} ${0},
        ${px_margin + end} ${px_height}
    `);
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
