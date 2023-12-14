import {Vector2} from "./vectormath";

export declare function graphPack(nodes: any, margin_or_args = 15, steps = 10, updateCb?: any);

export declare class PackNodeVertex extends Vector2 {
  absPos: Vector2;
}

export declare class PackNode {
  pos: Vector2;
  vel: Vector2;
  oldpos: Vector2;
  startpos: Vector2;
  size: Vector2;
  verts: PackNodeVertex[];
}
