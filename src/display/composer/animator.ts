import { Layout, Solver } from "../../layouts";
import { Composer } from "./composer";

export class Animator {
  composer: Composer;
  layout: Layout;
  solver: Solver | null = null;
  dirty: boolean = false;
  animate: boolean = false;
  static time_step = 40.0;

  constructor(composer: Composer, layout: Layout) {
    this.composer = composer;
    this.layout = layout;
  }

  startAnimation() {
    if (!this.animate) {
      this.continueAnimation();
    }
  }
  continueAnimation() {
    this.animate = true;
    setTimeout(this.solveCallback.bind(this), Animator.time_step);
  }
  stopAnimation() {
    this.animate = false;
  }
  updateSolver() {
    this.dirty = true;
    this.startAnimation();
  }
  restartSolver() {
    if (this.solver !== null) {
      this.solver.reset();
    }
    this.startAnimation();
  }
  solveCallback(time: number) {
    if (!this.animate) {
      return;
    }

    try {
      if (this.dirty) {
        this.solver = this.layout.createSolver(this.composer.nodes, this.composer.hlinks, this.composer.vlinks);
        this.dirty = false;
      }
      if (this.solver === null) {
        throw Error("Solver is null");
      }
      if (this.composer.viewport.node_drag !== null) {
        this.composer.syncNodeDrag();
        this.solver.reset();
      }

      this.solver.compute();
      let cont = this.solver.step(1e-3 * Animator.time_step);
      if (cont) {
        this.continueAnimation();
      } else {
        this.stopAnimation();
      }

      this.solver.pushRefs();
      this.composer.viewport.updateViewport();
    } catch (e) {
      this.stopAnimation();
      throw e;
    }
  }
}