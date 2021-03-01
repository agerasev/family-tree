import { Layout, Solver } from "./base";
import { PersonNode, HorizontalLink, VerticalLink } from "../display";
import { func } from "ts-interface-checker";

const maxVel = 1.0;

const abs = Math.abs;
const max = Math.max;
const min = Math.min;
function clamp(a: number, l: number, h: number) {
  return min(max(a, l), h);
}

export type Elast = {
  node: number,
  hor: number,
  ver: number,
  hor_inter: number,
  ver_inter: number,
};

export interface Scenario {
  time: number,
  elastByTime(time: number): Elast,
}

export class UpdateScenario implements Scenario {
  time: number = 8;
  elastByTime(time: number): Elast {
    return {
      node: 1.0,
      hor: 0.2,
      ver: 0.1,
      hor_inter: 5.0,
      ver_inter: 5.0,
    };
  }
}

export class RearrangeScenaio implements Scenario {
  time: number = 12;
  elastByTime(time: number): Elast {
    let w = null;
    time = 3.0 * time / this.time;
    if (time >= 0.0 && time <= 1.0) {
      w = [1.0, 0.0];
    } else if (time >= 1.0 && time <= 2.0) {
      w = [2.0 - time, time - 1.0];
    } else if (time >= 2.0 && time <= 3.0) {
      w = [0.0, 1.0];
    } else {
      throw Error("Time is out of bounds");
    }
    return {
      node: w[0] * 0.1 + w[1] * 2.0,
      hor: w[0] * 2.0 + w[1] * 0.2,
      ver: w[0] * 0.1 + w[1] * 0.1,
      hor_inter: w[0] * 5.0 + w[1] * 0.1,
      ver_inter: w[0] * 5.0 + w[1] * 0.1,
    };
  }
}

class NodeState {
  ref: PersonNode;
  pos: number;
  vel: number;
  //acc: number;
  mass: number;

  constructor(ref: PersonNode) {
    this.ref = ref;
    this.pos = ref.position + 0.001 * Math.random();
    this.vel = 0.0;
    //this.acc = 0.0;
    this.mass = 1.0;
  }

  applyForce(f: number) {
    this.vel += f / this.mass;
  }
  step(dt: number) {
    this.pos += clamp(this.vel, -maxVel, maxVel) * dt;
    this.vel = 0.0;
  }
  updateRef() {
    this.ref.position = this.pos;
    this.ref.updatePosition();
  }
  interact(other: NodeState, elast: number) {
    let d = this.pos - other.pos;
    const l = abs(d);
    const cl = 1.0;
    if (l < cl) {
      d /= l;
      const f = elast * d * min(4.0 * (cl - l), 1.0);
      this.applyForce(f);
      other.applyForce(-f);
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

  applyForce(f: number) {
    this.applyForceWeighted(f, [this.nodes[0].mass, this.nodes[1].mass]);
  }
  applyForceWeighted(f: number, w: [number, number]) {
    const ws = w[0] + w[1];
    this.nodes[0].applyForce((w[0] / ws) * f);
    this.nodes[1].applyForce((w[1] / ws) * f);
  }
  act(elast: number) {
    let d = (this.nodes[0].pos - this.nodes[1].pos);
    const f = elast * clamp(d, -1.0, 1.0);
    this.nodes[0].applyForce(-f);
    this.nodes[1].applyForce(f);
  }
  intersect(other: HLinkState, elast: number) {
    if (this.hasCommonNode(other)) {
      return;
    }
    const [tc, oc] = [this.center(), other.center()];
    const [ts, os] = [this.size(), other.size()];
    let d = tc - oc;
    let l = abs(d);
    let r = 0.5 * (ts + os) + 1.0;
    if (l < r) {
      d /= l;
      const f = elast * d * (r - l);
      let this_node = null;
      let other_node = null;
      if (d > 0.0) {
        this_node = this.nodesSorted()[0];
        other_node = other.nodesSorted()[1];
      } else {
        this_node = this.nodesSorted()[1];
        other_node = other.nodesSorted()[0];
      }
      this_node.applyForce(f);
      other_node.applyForce(-f);
    }
  }
  hasCommonNode(other: HLinkState): boolean {
    return (
      this.nodes[0] === other.nodes[0] ||
      this.nodes[0] === other.nodes[1] ||
      this.nodes[1] === other.nodes[0] ||
      this.nodes[1] === other.nodes[1]
    );
  }
  nodesSorted(): [NodeState, NodeState] {
    if (this.nodes[0].pos <= this.nodes[1].pos) {
      return [this.nodes[0], this.nodes[1]];
    } else {
      return [this.nodes[1], this.nodes[0]];
    }
  }
  size(): number {
    return abs(this.nodes[0].pos - this.nodes[1].pos);
  }
  center(): number {
    return 0.5 * (this.nodes[0].pos + this.nodes[1].pos);
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
  act(elast: number) {
    let d = (this.bottom.pos - this.top.center());
    const f = elast * clamp(d, -1.0, 1.0);
    this.top.applyForce(f);
    this.bottom.applyForce(-f);
  }
  intersect(other: VLinkState, elast: number) {
    if (this.top === other.top) {
      return;
    }
    let left = null;
    let right = null;
    if (this.top.center() < other.top.center()) {
      left = this;
      right = other;
    } else {
      left = other;
      right = this;
    }
    let d = left.bottom.pos - right.bottom.pos;
    if (d > -1.0) {
      const f = elast * (d + 1.0);
      left.bottom.applyForce(-f);
      right.bottom.applyForce(f);
    }
  }
  updateRef() {
    this.ref.updatePosition();
  }
}

function pushToMapOfArrays<K, V>(map: Map<K, V[]>, key: K, value: V) {
  if (!map.has(key)) {
    map.set(key, [value]);
  } else {
    map.get(key)!.push(value);
  }
}

function forEachPair<T>(array: T[], func: (a: T, b: T) => void) {
  for (let i = 0; i < array.length; ++i) {
    for (let j = i + 1; j < array.length; ++j) {
      func(array[i], array[j]);
    }
  }
}

export class SpringSolver implements Solver {
  nodes: Map<string, NodeState>;
  hlinks: Map<string, HLinkState>;
  vlinks: Map<string, VLinkState>;
  node_levels: Map<number, NodeState[]>;
  hlink_levels: Map<number, HLinkState[]>;
  vlink_levels: Map<number, VLinkState[]>;

  scenario: Scenario;
  time: number = 0.0;

  constructor(scenario: Scenario, nodes: Map<string, NodeState>, hlinks: Map<string, HLinkState>, vlinks: Map<string, VLinkState>) {
    this.scenario = scenario;

    this.nodes = nodes;
    this.hlinks = hlinks;
    this.vlinks = vlinks;

    this.node_levels = new Map<number, NodeState[]>();
    for (let [_, node] of this.nodes) {
      pushToMapOfArrays(this.node_levels, node.ref.level, node);
    }
    this.hlink_levels = new Map<number, HLinkState[]>();
    for (let [_, hlink] of this.hlinks) {
      const level = hlink.ref.nodes[0].level;
      if (level !== hlink.ref.nodes[1].level) {
        continue;
      }
      pushToMapOfArrays(this.hlink_levels, level, hlink);
    }
    this.vlink_levels = new Map<number, VLinkState[]>();
    for (let [_, vlink] of this.vlinks) {
      pushToMapOfArrays(this.vlink_levels, vlink.ref.bottom.level, vlink);
    }
  }
  step(dt?: number): boolean {
    if (dt === undefined) {
      throw Error("Time step must be defined");
    }
    if (this.time >= this.scenario.time) {
      return false;
    }
    const elast = this.scenario.elastByTime(this.time);

    for (let [_, nodes] of this.node_levels) {
      forEachPair(nodes, (a, b) => a.interact(b, elast.node));
    }
    for (let [_, hlink] of this.hlinks) {
      hlink.act(elast.hor);
    }
    for (let [_, vlink] of this.vlinks) {
      vlink.act(elast.ver);
    }
    for (let [_, hlinks] of this.hlink_levels) {
      forEachPair(hlinks, (a, b) => a.intersect(b, elast.hor_inter));
    }
    for (let [_, vlinks] of this.vlink_levels) {
      forEachPair(vlinks, (a, b) => a.intersect(b, elast.ver_inter));
    }

    for (let [_, node] of this.nodes) {
      node.step(dt);
    }
    this.time += dt;

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

    return new SpringSolver(new UpdateScenario(), nodes, hlinks, vlinks);
  }
}
