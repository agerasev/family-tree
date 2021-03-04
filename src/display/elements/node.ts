import $ = require("jquery");
import { Person, mixIds, Gender } from "../../data";
import { Composer, side_shift } from "../composer";
import { Crawler } from "../crawler";
import { HorizontalLink, VerticalLink } from "./links";
import { Entity, NodeButton } from "./base";
import style from "../../gen/style-defs";

export class PersonNode implements Entity {
  composer: Composer;
  person: Person;
  top: VerticalLink | null;
  side: Map<string, HorizontalLink>;
  position: number;
  level: number;
  html: JQuery<HTMLElement>;
  buttons: NodeButton[];

  static box_width: number = parseFloat(style.personBoxWidth);
  static box_height: number = parseFloat(style.personBoxHeight);
  static container_width: number = parseFloat(style.personContainerWidth);
  static container_height: number = parseFloat(style.personContainerHeight);

  constructor(composer: Composer, person: Person, position: number, level: number) {
    this.composer = composer;
    this.person = person;
    this.top = null;
    this.side = new Map<string, HorizontalLink>();
    this.position = position;
    this.level = level;

    const name = this.person.name;
    const first_family = name.family.length > 0 ? name.family[0] : null;
    const next_family = name.family.slice(1);
    this.html = $(`
      <div class='person-container' style='left: 0px; top: 0px;'>
        <div class='person-box ${this.person.gender == Gender.Male ? "person-male" : "person-female"}'>
          <img class='person-image' src='${this.person.image}'/>
          <div class='person-text'>
            ${first_family ? "<div>" + first_family + "</div>" : ""}
            ${next_family.length > 0 ? "<div>(" + next_family.join(", ") + ")</div>" : ""}
            <div>${name.given}</div>
            ${name.patronymic ? "<div>" + name.patronymic + "</div>" : ""}
          </div>
        </div>
      </div>
    `)
    const [plus, minus] = ["/images/plus.svg", "/images/minus.svg"];
    let buttons_info: [() => boolean, () => void, string, string][] = [
      [this.canExpandTop, this.expandTop, "person-expand-top", plus],
      [this.canCollapseTop, this.collapseTop, "person-collapse-top", minus],
      [this.canExpandBottom, this.expandBottom, "person-expand-bottom", plus],
      [this.canCollapseBottom, this.collapseBottom, "person-collapse-bottom", minus],
      [this.canExpandSide, () => this.expandSide(-1), "person-expand-left", plus],
      [this.canCollapseSide, () => this.collapseSide(-1), "person-collapse-left", minus],
      [this.canExpandSide, () => this.expandSide(1), "person-expand-right", plus],
      [this.canCollapseSide, () => this.collapseSide(1), "person-collapse-right", minus],
    ];
    this.buttons = [];
    for (let [check, run, css_class, icon] of buttons_info) {
      let button = new NodeButton(check.bind(this), run.bind(this), css_class, icon);
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
    this.html.css("left", this.composer.hposToPx(this.position) - 0.5 * PersonNode.container_width + "px");
    this.html.css("top", this.composer.vposToPx(this.level) - 0.5 * PersonNode.container_height + "px");
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
    let father = this.composer.createNode(this.person.parents!.father, this.position - 0.5 * side_shift, this.level - 1);
    let mother = this.composer.createNode(this.person.parents!.mother, this.position + 0.5 * side_shift, this.level - 1);
    let hlink = this.composer.bindHorizontal(father, mother);
    let vlink = this.composer.bindVertical(hlink, this);

    father.addSide(hlink);
    mother.addSide(hlink);
    hlink.addBottom(vlink);
    this.setTop(vlink);

    father.updateButtons();
    mother.updateButtons();
    hlink.updateButtons();
    this.updateButtons();
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
      this.updateButtons();
    }
  }

  canExpandSide(): boolean {
    return this.person.has_children_with.size > this.side.size;
  }
  expandSide(dir: number) {
    for (let [id, person] of this.person.has_children_with) {
      if (!this.side.has(mixIds(this.id(), id))) {
        let node = this.composer.createNode(person, this.position + dir * side_shift, this.level);
        let hlink = this.composer.bindHorizontal(this, node);
        this.addSide(hlink);
        node.addSide(hlink);
        node.updateButtons();
        break;
      }
    }
    this.updateButtons();
  }
  canCollapseSide() {
    return this.side.size > 0;
  }
  collapseSide(dir: number) {
    let crawler = new Crawler([this.id()]);
    let max_dist = null;
    let max_side = null;
    for (let [_, side] of this.side) {
      let pos = dir * side.center();
      if (max_dist === null || pos > max_dist) {
        max_dist = pos;
        max_side = side;
      }
    }
    if (max_side === null) {
      return;
    }
    crawler.traverse(max_side);
    for (let [_, node] of crawler.visited) {
      node.remove();
    }
    this.side.delete(max_side.id());
    this.updateButtons();
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
    let dir = 1;
    while (this.canExpandSide()) {
      this.expandSide(dir);
      dir = -dir;
    }
    for (let [_, hlink] of this.side) {
      if (hlink.canExpandBottom()) {
        hlink.expandBottom();
        if (hlink.nodes[0].id() !== this.id()) {
          hlink.nodes[0].updateButtons();
        } else {
          hlink.nodes[1].updateButtons();
        }
      }
    }
    this.updateButtons();
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
      side.updateButtons();
      if (side.nodes[0].id() !== this.id()) {
        side.nodes[0].updateButtons();
      } else {
        side.nodes[1].updateButtons();
      }
    }
    this.updateButtons();
  }
}
