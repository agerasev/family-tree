import { Layout, Solver } from "./base";
import { PersonNode, HorizontalLink, VerticalLink } from "../display";

class NodeState {
  ref: PersonNode;
  pos: [number, number];
  vel: [number, number];
  //acc: [number, number];
  mass: number;

  constructor(ref: PersonNode) {
    this.ref = ref;
    this.pos = [ref.position + 0.001 * Math.random(), ref.level];
    this.vel = [0.0, 0.0];
    //this.acc = [0.0, 0.0];
    this.mass = 1.0;
  }

  applyForce(f: [number, number]) {
    this.vel[0] += f[0] / this.mass;
    this.vel[1] += f[1] / this.mass;
  }
  step(dt: number) {
    this.pos[0] += this.vel[0] * dt;
    this.pos[1] += this.vel[1] * dt;
    this.vel = [0.0, 0.0];
  }
  updateRef() {
    this.ref.position = this.pos[0];
    this.ref.updatePosition();
  }
  interact(other: NodeState, elast: number) {
    let d = this.pos[0] - other.pos[0];
    const l = Math.abs(d);
    const cl = 1.0;
    if (l < cl) {
      d /= l;
      const f = elast * d * (cl - l);
      this.applyForce([f, 0.0]);
      other.applyForce([-f, 0.0]);
    }
  }
}

class HLinkState {
  ref: HorizontalLink;
  nodes: [NodeState, NodeState];

  constructor(ref: HorizontalLink, nodes: [NodeState, NodeState]) {
    if (ref.nodes[0].id() !== nodes[0].ref.id() || ref.nodes[1].id() !== nodes[1].ref.id()) {
      throw Error("Reference mismatch");
    }
    this.ref = ref;
    this.nodes = nodes;
  }

  applyForce(f: [number, number]) {
    const m = this.nodes[0].mass + this.nodes[1].mass;
    const w = [this.nodes[0].mass / m, this.nodes[1].mass / m];
    this.nodes[0].applyForce([w[0] * f[0], w[0] * f[1]]);
    this.nodes[1].applyForce([w[1] * f[0], w[1] * f[1]]);
  }
  interact(elast: number) {
    let d = (this.nodes[0].pos[0] - this.nodes[1].pos[0]);
    const l = Math.abs(d);
    const cl = 1.0;
    d /= l;
    const f = elast * d * (cl - l);
    this.nodes[0].applyForce([f, 0.0]);
    this.nodes[1].applyForce([-f, 0.0]);
  }
  center(): [number, number] {
    return [
      0.5 * (this.nodes[0].pos[0] + this.nodes[1].pos[0]),
      0.5 * (this.nodes[0].pos[1] + this.nodes[0].pos[1]),
    ];
  }
  updateRef() {
    this.ref.updatePosition();
  }
}

class VLinkState {
  ref: VerticalLink;
  top: HLinkState;
  bottom: NodeState;

  constructor(ref: VerticalLink, top: HLinkState, bottom: NodeState) {
    if (ref.top.id() !== top.ref.id() || ref.bottom.id() !== bottom.ref.id()) {
      throw Error("Reference mismatch");
    }
    this.ref = ref;
    this.top = top;
    this.bottom = bottom;
  }
  interact(elast: number) {
    let d = (this.bottom.pos[0] - this.top.center()[0]);
    const f = elast * d;
    this.top.applyForce([f, 0.0]);
    this.bottom.applyForce([-f, 0.0]);
  }
  updateRef() {
    this.ref.updatePosition();
  }
}

export class SpringSolver implements Solver {
  nodes: Map<string, NodeState>;
  hlinks: Map<string, HLinkState>;
  vlinks: Map<string, VLinkState>;
  levels: Map<number, NodeState[]>;
  elast?: {
    node: number,
    hor: number,
    ver: number,
  };

  time: number;
  counter: number = 0;

  constructor(time: number, nodes: Map<string, NodeState>, hlinks: Map<string, HLinkState>, vlinks: Map<string, VLinkState>) {
    this.time = time;

    this.nodes = nodes;
    this.hlinks = hlinks;
    this.vlinks = vlinks;

    this.levels = new Map<number, NodeState[]>();
    for (let [_, node] of this.nodes) {
      const level = node.ref.level;
      if (!this.levels.has(level)) {
        this.levels.set(level, [node]);
      } else {
        this.levels.get(level)!.push(node);
      }
    }
  }
  setElast(node: number, hor: number, ver: number) {
    this.elast = { node, hor, ver };
  }
  step(time?: number): boolean {
    if (this.counter >= this.time) {
      return false;
    }
    
    if (time === undefined) {
      throw Error("Time step must be defined");
    }
    if (this.elast === undefined) {
      throw Error("Elasticity factors must be set");
    }

    for (let [_, nodes] of this.levels) {
      for (let i = 0; i < nodes.length; ++i) {
        for (let j = i + 1; j < nodes.length; ++j) {
          nodes[i].interact(nodes[j], this.elast.node);
        }
      }
    }
    for (let [_, hlink] of this.hlinks) {
      hlink.interact(this.elast.hor);
    }
    for (let [_, vlink] of this.vlinks) {
      vlink.interact(this.elast.ver);
    }

    for (let [_, node] of this.nodes) {
      node.step(time);
    }
    this.counter += time;

    return true;
  }
  updateRefs() {
    for (let [_, node] of this.nodes) {
      node.updateRef();
    }
    for (let [_, hlink] of this.hlinks) {
      hlink.updateRef();
    }
    for (let [_, vlink] of this.vlinks) {
      vlink.updateRef();
    }
  }
}

export class SpringLayout implements Layout {
  createSolver(
    in_nodes: Map<string, PersonNode>,
    in_hlinks: Map<string, HorizontalLink>,
    in_vlinks: Map<string, VerticalLink>,
  ): SpringSolver {
    let nodes = new Map<string, NodeState>();
    let hlinks = new Map<string, HLinkState>();
    let vlinks = new Map<string, VLinkState>();

    for (let [id, node] of in_nodes) {
      nodes.set(id, new NodeState(node));      
    }
    for (let [id, hlink] of in_hlinks) {
      hlinks.set(id, new HLinkState(
        hlink,
        [
          nodes.get(hlink.nodes[0].id())!,
          nodes.get(hlink.nodes[1].id())!,
        ],
      ));
    }
    for (let [id, vlink] of in_vlinks) {
      vlinks.set(id, new VLinkState(
        vlink,
        hlinks.get(vlink.top.id())!,
        nodes.get(vlink.bottom.id())!,
      ));
    }

    let solver = new SpringSolver(10.0, nodes, hlinks, vlinks);
    solver.setElast(2.0, 0.2, 0.1);

    return solver;
  }
}
