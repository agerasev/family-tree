import { Layout, Solver } from "./base";
import { PersonNode, HorizontalLink, VerticalLink } from "../display";
import { Solver as NativeSolver } from "../solver";

export class WasmSolver implements Solver {
  nodes: Map<string, PersonNode>;
  hlinks: Map<string, HorizontalLink>;
  vlinks: Map<string, VerticalLink>;
  native: NativeSolver;

  time: number = 0.0;
  total: number;

  constructor(total: number, nodes: Map<string, PersonNode>, hlinks: Map<string, HorizontalLink>, vlinks: Map<string, VerticalLink>) {
    this.total = total;

    this.nodes = nodes;
    this.hlinks = hlinks;
    this.vlinks = vlinks;

    this.native = NativeSolver.new();

    for (let [id, node] of this.nodes) {
      this.native.add_node(id, node.position, node.level, (pos: number) => {
        node.position = pos;
      });
    }
    for (let [id, hlink] of this.hlinks) {
      this.native.add_hlink(id, hlink.nodes[0].id(), hlink.nodes[1].id());
    }
    for (let [id, vlink] of this.vlinks) {
      this.native.add_vlink(id, vlink.top.id(), vlink.bottom.id());
    }
  }
  solve(dt?: number): boolean {
    if (dt === undefined) {
      throw Error("Time step must be defined");
    }
    if (this.time >= this.total) {
      return false;
    }

    this.native.solve(dt);
    this.time += dt;

    return true;
  }
  pushRefs() {
    this.native.sync();

    for (let [_, node] of this.nodes) {
      node.updatePosition();
    }
    for (let [_, hlink] of this.hlinks) {
      hlink.updatePosition();
    }
    for (let [_, vlink] of this.vlinks) {
      vlink.updatePosition();
    }
  }
  pullNode(id: string) {
    this.native.update_node(id, this.nodes.get(id)!.position);
  }
  reset() {
    this.time = 0.0;
  }
}

export class WasmLayout implements Layout {
  createSolver(
    nodes: Map<string, PersonNode>,
    hlinks: Map<string, HorizontalLink>,
    vlinks: Map<string, VerticalLink>,
  ): WasmSolver {
    return new WasmSolver(
      8.0,
      nodes,
      hlinks,
      vlinks,
    );
  }
}
