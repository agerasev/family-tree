import $ = require("jquery");
import {Person} from "./types";

export class Node {
  person: Person;
  html: JQuery<HTMLElement>;
  links: {
    up: VerticalLink | null,
    side: HorizontalLink[],
    down: VerticalLink[],
  };

  constructor(person: Person) {
    this.person = person;
    this.links = { up: null, side: [], down: [] }
    this.html = $(`
      <div class='person-box'>
        <div>${this.person.name.text()}</div>
      </div>
    `)
  }
  remove() {

  }

  expand_up() {
    const parents = this.person.parents;
    if (this.links.up === null && (parents.father !== null || parents.mother !== null)) {
      let [father_node, mother_node]: [Node | null, Node | null] = [null, null];
      if (parents.father !== null) {
        father_node = new Node(parents.father);
      }
      if (parents.mother !== null) {
        mother_node = new Node(parents.mother);
      }
      let hlink = new HorizontalLink(father_node, mother_node);
      if (father_node !== null) {
        father_node.links.side.push(hlink);
      }
      if (mother_node !== null) {
        mother_node.links.side.push(hlink);
      }
      let vlink = new VerticalLink(hlink, this);
      this.links.up = vlink;
    }
  }
  collapse_up() {

  }

  expand_side() {

  }
  collapse_side() {

  }

  expand_down() {

  }
  collapse_down() {

  }
}

export class HorizontalLink {
  nodes: [Node | null, Node | null];
  down: VerticalLink | null;
  html: JQuery<HTMLElement>;

  constructor(left: Node | null, right: Node | null) {
    if (left === null && right === null) {
      throw Error("Both ends of horizontal link are 'null'");
    }
    this.nodes = [left, right];
    this.down = null;
    this.html = $("<div>HorizontalLink</div>");
  }
  remove() {

  }
}

export class VerticalLink {
  up: HorizontalLink;
  down: Node;
  html: JQuery<HTMLElement>;

  constructor(up: HorizontalLink, down: Node) {
    this.up = up;
    this.down = down;
    this.html = $("<div>VerticalLink</div>");
  }
  remove() {

  }
}
