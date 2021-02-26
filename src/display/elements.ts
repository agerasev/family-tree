import $ = require("jquery");
import { Person, mixIds } from "../data";
import { Composer } from "./composer";
import { Crawler } from "./crawler";

export class NodeButton {
  check: () => boolean;
  run: () => void;
  html: JQuery<HTMLElement>;

  constructor(check: () => boolean, run: () => void, css_class: string, text: string) {
    this.check = check;
    this.run = run;

    let html = $(`<div class='node-button ${css_class}'>${text}</div>`)
    html.on("click", this.run)
    this.html = html;
  }

  refresh() {
    if (this.check()) {
      this.html.removeClass("node-button-hidden");
    } else {
      this.html.addClass("node-button-hidden");
    }
  }
}

export interface Entity {
  id(): string,
  neighbors(): IterableIterator<Entity>,
  remove(): void,
}

export class PersonNode implements Entity {
  composer: Composer;
  person: Person;
  top: VerticalLink | null;
  side: Map<string, HorizontalLink>;
  position: number;
  level: number;
  html: JQuery<HTMLElement>;
  buttons: NodeButton[];

  constructor(composer: Composer, person: Person, position: number, level: number) {
    this.composer = composer;
    this.person = person;
    this.top = null;
    this.side = new Map<string, HorizontalLink>();
    this.position = position;
    this.level = level;

    this.html = $(`
      <div class='person-container' style='left:${300 * (this.position + 1)}px;top:${300 * (this.level + 1)}px;'>
        <div class='person-box'>
          <div>${this.person.name.text()}</div>
        </div>
      </div>
    `)
    let buttons_info: [() => boolean, () => void, string, string][] = [
      [this.canExpandTop, this.expandTop, "person-expand-top", "+"],
      [this.canCollapseTop, this.collapseTop, "person-collapse-top", "−"],
      [this.canExpandBottom, this.expandBottom, "person-expand-bottom", "+"],
      [this.canCollapseBottom, this.collapseBottom, "person-collapse-bottom", "−"],
      [this.canExpandSide, () => this.expandSide(-1), "person-expand-left", "+"],
      [this.canExpandSide, () => this.expandSide(1), "person-expand-right", "+"],
      [this.canCollapseSide, this.collapseSide, "person-collapse-left", "−"],
      [this.canCollapseSide, this.collapseSide, "person-collapse-right", "−"],
    ];
    this.buttons = [];
    for (let [check, run, css_class, text] of buttons_info) {
      let button = new NodeButton(check.bind(this), run.bind(this), css_class, text);
      this.html.append(button.html);
      this.buttons.push(button);
    }
    this.refresh();
  }

  refresh() {
    for (let button of this.buttons) {
      button.refresh();
    }
  }

  id(): string {
    return this.person.id;
  }
  neighbors(): IterableIterator<Entity> {
    return function* (self: PersonNode) {
      if (self.top !== null) {
        yield self.top;
      }
      for (const [_, side] of self.side) {
        yield side;
      }
    }(this);
  }
  remove() {
    this.composer.removeNode(this);
  }

  setTop(vlink: VerticalLink) {
    if (this.top === null) {
      this.top = vlink;
    } else {
      throw Error("Link already exists");
    }
  }

  hasSide(hlink: HorizontalLink) {
    return this.side.has(hlink.id());
  }
  addSide(hlink: HorizontalLink) {
    if (!this.side.has(hlink.id())) {
      this.side.set(hlink.id(), hlink);
    } else {
      throw Error("Link already exists");
    }
  }

  canExpandTop(): boolean {
    return this.top === null && this.person.parents !== null;
  }
  expandTop() {
    let father = this.composer.createNode(this.person.parents!.father, this.position - 0.5, this.level - 1);
    let mother = this.composer.createNode(this.person.parents!.mother, this.position + 0.5, this.level - 1);
    let hlink = this.composer.bindHorizontal(father, mother);
    let vlink = this.composer.bindVertical(hlink, this);

    father.addSide(hlink);
    mother.addSide(hlink);
    hlink.addBottom(vlink);
    this.setTop(vlink);

    father.refresh();
    mother.refresh();
    hlink.refresh();
    this.refresh();
  }
  canCollapseTop(): boolean {
    return this.top !== null;
  }
  collapseTop() {
    if (this.top !== null) {
      let crawler = new Crawler([this.id()]);
      crawler.traverse(this.top);
      for (let [_, node] of crawler.visited) {
        node.remove();
      }
      this.top = null;
      this.refresh();
    }
  }

  canExpandSide(): boolean {
    return this.person.has_children_with.length > this.side.size;
  }
  expandSide(dir: number) {
    let counter = dir;
    for (let person of this.person.has_children_with) {
      if (!this.side.has(mixIds(this.id(), person.id))) {
        let node = this.composer.createNode(person, this.position + counter, this.level);
        let hlink = this.composer.bindHorizontal(this, node);
        this.addSide(hlink);
        node.addSide(hlink);
        node.refresh();
        counter += dir;
      }
    }
    this.refresh();
  }
  canCollapseSide() {
    return this.side.size > 0;
  }
  collapseSide() {
    let crawler = new Crawler([this.id()]);
    for (let [_, side] of this.side) {
      crawler.traverse(side);
    }
    for (let [_, node] of crawler.visited) {
      node.remove();
    }
    this.side.clear();
    this.refresh();
  }

  canExpandBottom(): boolean {
    if (this.canExpandSide()) {
      return true;
    } else {
      for (let [_, hlink] of this.side) {
        if (hlink.canExpandBottom()) {
          return true;
        }
      }
      return false;
    }
  }
  expandBottom() {
    this.expandSide(1);
    for (let [_, hlink] of this.side) {
      if (hlink.canExpandBottom()) {
        hlink.expandBottom();
        if (hlink.nodes[0].id() !== this.id()) {
          hlink.nodes[0].refresh();
        } else {
          hlink.nodes[1].refresh();
        }
      }
    }
    this.refresh();
  }
  canCollapseBottom() {
    if (!this.canCollapseSide()) {
      return false;
    } else {
      for (let [_, hlink] of this.side) {
        if (hlink.canCollapseBottom()) {
          return true;
        }
      }
      return false;
    }
  }
  collapseBottom() {
    let ignore = [this.id()];
    for (let [sid, _] of this.side) {
      ignore.push(sid);
    }
    let crawler = new Crawler(ignore);
    for (let [_, side] of this.side) {
      for (let [_, node] of side.bottom) {
        crawler.traverse(node);
      }
    }
    for (let [_, node] of crawler.visited) {
      node.remove();
    }
    for (let [_, side] of this.side) {
      side.bottom.clear();
      side.refresh();
      if (side.nodes[0].id() !== this.id()) {
        side.nodes[0].refresh();
      } else {
        side.nodes[1].refresh();
      }
    }
    this.refresh();
  }
}

export class HorizontalLink implements Entity {
  composer: Composer;
  nodes: [PersonNode, PersonNode];
  bottom: Map<string, VerticalLink>;
  html: JQuery<HTMLElement>;

  constructor(composer: Composer, left: PersonNode, right: PersonNode) {
    this.composer = composer;
    this.nodes = [left, right];
    this.bottom = new Map<string, VerticalLink>();
    this.html = $("<div class='horizontal-link'>HorizontalLink</div>");
  }

  refresh() {
    
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
      node.refresh();
      position += 1;
    }
    this.refresh();
  }
  canCollapseBottom(): boolean {
    return this.bottom.size > 0;
  }
  collapseBottom() {
    throw Error("Not implemented");
  }
}

export class VerticalLink implements Entity {
  composer: Composer;
  top: HorizontalLink;
  bottom: PersonNode;
  html: JQuery<HTMLElement>;

  constructor(composer: Composer, top: HorizontalLink, bottom: PersonNode) {
    this.composer = composer;
    this.top = top;
    this.bottom = bottom;
    this.html = $("<div class='vertical-link'>VerticalLink</div>");
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
