import { Entity } from "./elements";

export class Crawler {
  blacklist: string[];
  visited: Map<string, Entity>;

  constructor(blacklist: string[]) {
    this.blacklist = blacklist;
    this.visited = new Map<string, Entity>();
  }

  traverse(node: Entity) {
    const id = node.id();
    if (this.blacklist.includes(id) || this.visited.has(id)) {
      return;
    }
    this.visited.set(id, node);
    for (let neighbor of node.neighbors()) {
      this.traverse(neighbor);
    }
  }
}
