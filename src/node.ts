import $ = require("jquery");
import { Person } from "./types";
import { Composer } from "./composer";
import { mixIds } from "./id";

export class PersonNode {
  composer: Composer;
  person: Person;
  html: JQuery<HTMLElement>;
  top: VerticalLink | null;
  side: Map<string, HorizontalLink>;

  constructor(composer: Composer, person: Person) {
    this.composer = composer;
    this.person = person;
    this.top = null;
    this.side = new Map<string, HorizontalLink>();
    this.html = $(`
      <div class='person-box'>
        <div>${this.person.name.text()}</div>
      </div>
    `)
  }
  remove() {

  }

  get id(): string {
    return this.person.id;
  }

  setTop(vlink: VerticalLink) {
    if (this.top === null) {
      this.top = vlink;
    } else {
      throw Error("Link already exists");
    }
  }

  hasSide(hlink: HorizontalLink) {
    return this.side.has(hlink.id);
  }
  addSide(hlink: HorizontalLink) {
    if (!this.side.has(hlink.id)) {
      this.side.set(hlink.id, hlink);
    } else {
      throw Error("Link already exists");
    }
  }

  canExpandTop(): boolean {
    return this.top === null && this.person.parents !== null;
  }
  expandTop() {
    let father = this.composer.createNode(this.person.parents!.father);
    let mother = this.composer.createNode(this.person.parents!.mother);
    let hlink = this.composer.bindHorizontal(father, mother);
    this.composer.bindVertical(hlink, this);
  }
  collapseTop() {
    throw Error("Not implemented");
  }

  canExpandSide(): boolean {
    return this.person.has_children_with.length > this.side.size;
  }
  expandSide() {
    for (let person of this.person.has_children_with) {
      if (!this.side.has(mixIds(this.id, person.id))) {
        let node = this.composer.createNode(person);
        this.composer.bindHorizontal(this, node);
      }
    }
  }
  collapseSide() {
    throw Error("Not implemented");
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
    this.expandSide();
    for (let [_, hlink] of this.side) {
      if (hlink.canExpandBottom()) {
        hlink.expandBottom();
      }
    }
  }
  collapseBottom() {
    throw Error("Not implemented");
  }
}

export class HorizontalLink {
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
  remove() {
    throw Error("Not implemented");
  }

  get id(): string {
    return mixIds(this.nodes[0].id, this.nodes[1].id);
  }

  hasBottom(vlink: VerticalLink) {
    return this.bottom.has(vlink.id);
  }
  addBottom(vlink: VerticalLink) {
    if (!this.bottom.has(vlink.id)) {
      this.bottom.set(vlink.id, vlink);
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
    for (let [id, child] of common_children) {
      let node = this.composer.createNode(child);
      this.composer.bindVertical(this, node);
    }
  }
  canCollapseBottom(): boolean {
    return this.bottom.size > 0;
  }
  collapseBottom() {
    throw Error("Not implemented");
  }
}

export class VerticalLink {
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
  remove() {
    throw Error("Not implemented");
  }

  get id(): string {
    return mixIds(this.top.id, this.bottom.id);
  }
}
