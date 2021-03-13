import { Layout, Solver } from "../../layouts";
import { Composer } from "./composer";

export interface AnimationTimer {
  animate: boolean,

  startAnimation(callback: (time: number) => void): void,
  continueAnimation(): void,
  stopAnimation(): void,
}

export class Timeout implements AnimationTimer {
  animate: boolean = false;
  callback: ((time: number) => void) | null = null;
  static time_step = 40.0;

  constructor() {}
  timeoutCallback = () => {
    this.callback!(Timeout.time_step);
  }

  startAnimation(callback: (time: number) => void) {
    this.callback = callback;
    if (!this.animate) {
      this.continueAnimation();
    }
  }
  continueAnimation() {
    this.animate = true;
    setTimeout(this.timeoutCallback, Timeout.time_step);
  }
  stopAnimation() {
    this.animate = false;
  }
}

export class FrameTimer implements AnimationTimer {
  animate: boolean = false;
  callback: ((time: number) => void) | null = null;
  prev_time: number = 0.0;
  static max_step = 80.0;

  constructor() {}
  frameCallback = (abs_time: number) => {
    let dt = Math.min(abs_time - this.prev_time, FrameTimer.max_step);
    this.prev_time = abs_time;
    this.callback!(dt);
  }

  startAnimation(callback: (time: number) => void) {
    this.callback = callback;
    if (!this.animate) {
      this.continueAnimation();
    }
  }
  continueAnimation() {
    this.animate = true;
    window.requestAnimationFrame(this.frameCallback);
  }
  stopAnimation() {
    this.animate = false;
  }
}

export class Animator {
  composer: Composer;
  layout: Layout;
  solver: Solver | null = null;
  timer: AnimationTimer;
  dirty: boolean = false;

  constructor(composer: Composer, layout: Layout, timer: AnimationTimer) {
    this.composer = composer;
    this.layout = layout;
    this.timer = timer;
  }

  updateSolver() {
    this.dirty = true;
    this.timer.startAnimation(this.solveCallback);
  }
  restartSolver() {
    if (this.solver !== null) {
      this.solver.reset();
    }
    this.timer.startAnimation(this.solveCallback);
  }
  solveCallback = (time: number) => {
    if (!this.timer.animate) {
      return;
    }

    try {
      if (this.dirty) {
        this.solver = this.layout.createSolver(
          this.composer.nodes,
          this.composer.hlinks,
          this.composer.vlinks,
        );
        this.dirty = false;
      }
      if (this.solver === null) {
        throw Error("Solver is null");
      }
      if (this.composer.node_drag !== null) {
        this.composer.syncNodeDrag();
        this.solver.reset();
      }

      let cont = this.solver.solve(1e-3 * time);
      if (cont) {
        this.timer.continueAnimation();
      } else {
        this.timer.stopAnimation();
      }

      this.solver.pushRefs();
      this.composer.viewport.updateViewport();
    } catch (e) {
      this.timer.stopAnimation();
      throw e;
    }
  }
}
