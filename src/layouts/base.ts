import { PersonNode, HorizontalLink, VerticalLink } from "../display";

export interface Solver {
  step(time?: number): boolean,
  updateRefs(): void,
}

export interface Layout {
  createSolver(nodes: Map<string, PersonNode>, hlinks: Map<string, HorizontalLink>, vlinks: Map<string, VerticalLink>): Solver,
}
