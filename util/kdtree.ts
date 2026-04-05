"use strict";

import * as util from "./util.js";
import { Number3, Vector3 } from "./vectormath.js";

//'ni' is shorthand for 'nodeindex', a point into the typed array data structure

//maximum points per node before splitting
//make sure to raise this after testing
const MAXPOINTS = 16;
const MAXDEPTH = 1024;

let log_everything = false;

/*seems like embedding the points in the nodes, while wasteful of memory,
  should be more cache efficient than referencing another typed array*/
const NXMIN = 0,
  NYMIN = 1,
  NZMIN = 2,
  NXMAX = 3,
  NYMAX = 4,
  NZMAX = 5,
  NSPLITPLANE = 6,
  NSPLITPOS = 7,
  NCHILDA = 8,
  NCHILDB = 9,
  NTOTPOINT = 10,
  TOTN = 11 + MAXPOINTS * 4;

//points are stored (x, y, z, id);

let _insert_split_out = [0, 0];
let _split_tmps = util.cachering.fromConstructor(Vector3, 1024);
let _insert_tmps = util.cachering.fromConstructor(Vector3, 1024);
let _split_tmps_2 = util.cachering.fromConstructor(Vector3, 1024);
let _foreach_tmp = new Vector3(undefined as unknown as number[]);
let _tmp = new Vector3(undefined as unknown as number[]);

interface KDPoint {
  co: InstanceType<typeof Vector3>;
  id: number | undefined;
}

interface KDNodeInfo {
  min: InstanceType<typeof Vector3>;
  max: InstanceType<typeof Vector3>;
  splitpos: number | undefined;
  splitplane: number | undefined;
  id: number | undefined;
}

export class KDTree {
  min: InstanceType<typeof Vector3>;
  max: InstanceType<typeof Vector3>;
  last_warn_time: number;
  _point_cachering: util.cachering<KDPoint>;
  _node_cachering: util.cachering<KDNodeInfo>;
  _search_cachering: util.cachering<InstanceType<typeof Vector3>>;
  usednodes: number;
  data: Float64Array;
  maxdepth: number;
  totpoint: number;
  root: number;

  constructor(min: number[] | InstanceType<typeof Vector3>, max: number[] | InstanceType<typeof Vector3>) {
    this.min = new Vector3(min);
    this.max = new Vector3(max);

    this.last_warn_time = util.time_ms();

    this._point_cachering = new util.cachering(() => {
      return { co: new Vector3(undefined as unknown as number[]), id: undefined };
    }, 512);
    this._node_cachering = new util.cachering(() => {
      return {
        min       : new Vector3(undefined as unknown as number[]),
        max       : new Vector3(undefined as unknown as number[]),
        splitpos  : undefined,
        splitplane: undefined,
        id        : undefined,
      };
    }, 512);
    this._search_cachering = util.cachering.fromConstructor(Vector3, 64);

    this.usednodes = 0;
    this.data = new Float64Array(TOTN * 32);
    this.maxdepth = MAXDEPTH;
    this.totpoint = 0;

    this.root = this.newNode(min, max);
  }

  newNode(min: number[] | InstanceType<typeof Vector3>, max: number[] | InstanceType<typeof Vector3>): number {
    let maxnodes = this.data.length / TOTN;

    if (this.usednodes >= maxnodes) {
      let newdata = new Float64Array(this.data.length * 2);
      let data = this.data;
      let ilen = data.length;

      for (let i = 0; i < ilen; i++) {
        newdata[i] = data[i];
      }

      this.data = newdata;
    }

    let ni = this.usednodes * TOTN;
    let data = this.data;

    for (let j = ni; j < ni + TOTN; j++) {
      data[j] = 0;
    }

    data[ni + NXMIN] = (min as number[])[0];
    data[ni + NYMIN] = (min as number[])[1];
    data[ni + NZMIN] = (min as number[])[2];

    data[ni + NXMAX] = (max as number[])[0];
    data[ni + NYMAX] = (max as number[])[1];
    data[ni + NZMAX] = (max as number[])[2];

    this.usednodes++;

    return ni;
  }

  insert(x: number, y: number, z: number, id?: number): void {
    if (id === undefined) {
      id = z;
      z = 0.0;
    }

    let recurse = (ni: number, depth: number): void => {
      let data = this.data;

      if (depth >= this.maxdepth) {
        if (log_everything || util.time_ms() - this.last_warn_time > 500) {
          console.log(depth);
          console.warn("Malformed data: 3 to insert point", depth, x.toFixed(4), y.toFixed(4), z.toFixed(4), "id=", id);
          this.last_warn_time = util.time_ms();
        }
        return;
      }

      //not a leaf node?
      if (data[ni + NCHILDA] != 0) {
        let axis = data[ni + NSPLITPLANE];
        let split = data[ni + NSPLITPOS];

        let paxis = axis == 0 ? x : axis == 1 ? y : z;

        if (paxis == split) {
          //handle case of points exactly on boundary
          //distribute point randomly to children

          let child = !!(Math.random() > 0.5);
          //console.log("exact!", child, p[axis], split, axis);

          recurse(data[ni + NCHILDA + (child ? 1 : 0)], depth + 1);
        } else if (paxis < split) {
          recurse(data[ni + NCHILDA], depth + 1);
        } else {
          recurse(data[ni + NCHILDB], depth + 1);
        }

        //a full leaf node?
      } else if (data[ni + NTOTPOINT] >= MAXPOINTS) {
        this.split(ni, _insert_split_out);

        this.insert(x, y, z, id);
      } else {
        //add point
        let i = ni + NTOTPOINT + 1 + data[ni + NTOTPOINT] * 4;

        data[i++] = x;
        data[i++] = y;
        data[i++] = z;
        data[i++] = id!;

        data[ni + NTOTPOINT]++;
      }
    };

    recurse(this.root, 0);
    this.totpoint++;
  }

  forEachNode(cb: (n: KDNodeInfo) => void, thisvar?: unknown): void {
    let cachering = this._node_cachering;
    let data = this.data;

    let recurse = (ni: number): void => {
      let n = cachering.next() as KDNodeInfo;

      for (let i = 0; i < 3; i++) {
        n.min[i as Number3] = data[ni + i];
        n.max[i as Number3] = data[ni + 3 + i];
      }

      n.id = ni;
      n.splitplane = data[ni + NSPLITPLANE];
      n.splitpos = data[ni + NSPLITPOS];

      if (thisvar !== undefined) {
        cb.call(thisvar, n);
      } else {
        cb(n);
      }

      if (data[ni + NCHILDA] != 0) {
        recurse(data[ni + NCHILDA]);
        recurse(data[ni + NCHILDB]);
      }
    };

    recurse(this.root);
  }

  iterAllPoints(cb: (p: KDPoint) => void, thisvar?: unknown): void {
    let cachering = this._point_cachering;

    let recurse = (ni: number): void => {
      let data = this.data;

      if (data[ni + NCHILDA] != 0) {
        recurse(data[ni + NCHILDA]);
        recurse(data[ni + NCHILDB]);
      } else {
        let totpoint = data[ni + NTOTPOINT];
        let j = ni + NTOTPOINT + 1;

        for (let i = 0; i < totpoint; i++) {
          let p = cachering.next() as KDPoint;

          p.co[0] = data[j++];
          p.co[1] = data[j++];
          p.co[2] = data[j++];
          p.id = data[j++];

          if (thisvar !== undefined) {
            cb.call(thisvar, p);
          } else {
            cb(p);
          }
        }
      }
    };

    recurse(this.root);
  }

  //new_nodes_out is an array
  split(ni: number, new_nodes_out?: number[]): void {
    //find split point
    let data = this.data;
    let startk = ni + NTOTPOINT + 1;
    let totp = data[ni + NTOTPOINT];

    let bestaxis: number | undefined = undefined;
    let bestsplit: number | undefined = undefined;
    let bestfit: number | undefined = undefined;

    if (totp == 0) {
      console.warn("TRIED TO SPLIT AN EMPTY NODE!");
    }

    //find best split axis
    for (let axis = 0; axis < 3; axis++) {
      let centroid = 0;
      let amin = 1e17,
        amax = -1e17;

      for (let j = 0, k = startk; j < totp; j++, k += 4) {
        centroid += data[k + axis];

        amin = Math.min(data[k + axis], amin);
        amax = Math.max(data[k + axis], amax);
      }

      if (amax - amin < 0.0001) {
        continue;
      }

      centroid /= totp;
      let fit = 0;

      for (let j = 0, k = startk; j < totp; j++, k += 4) {
        fit += data[k + axis] < centroid ? -1 : 1;
      }
      fit = Math.abs(fit);

      let size = 0;
      for (let k = 0; k < 3; k++) {
        size += Math.max(data[ni + 3 + k], data[ni + k]);
      }

      let aspect = (data[ni + 3 + axis] - data[ni + axis]) / size;

      if (aspect > 0 && aspect < 1) aspect = 1 / aspect;

      if (fit != totp && aspect > 0.001) {
        fit += aspect * 7.0;
      }

      //console.log("A2", aspect);

      if (bestaxis === undefined || fit < bestfit!) {
        bestfit = fit;
        bestsplit = centroid;
        bestaxis = axis;
      }
    }

    if (bestaxis === undefined) {
      if (util.time_ms() - this.last_warn_time > 500) {
        console.warn("Failed to split node; points were probably all duplicates of each other");
        this.last_warn_time = util.time_ms();
      }

      return;
    }

    //      console.log(bestsplit, bestaxis, ni);

    //split
    let min1 = (_split_tmps.next() as InstanceType<typeof Vector3>).zero!();
    let max1 = (_split_tmps.next() as InstanceType<typeof Vector3>).zero!();
    let min2 = (_split_tmps.next() as InstanceType<typeof Vector3>).zero!();
    let max2 = (_split_tmps.next() as InstanceType<typeof Vector3>).zero!();

    for (let i = 0; i < 3; i++) {
      min1[i as Number3] = data[ni + i];
      max1[i as Number3] = data[ni + NXMAX + i];
    }

    min2.load!(min1);
    max2.load!(max1);

    max1[bestaxis as Number3] = bestsplit!;
    min2[bestaxis as Number3] = bestsplit!;

    let c1 = this.newNode(min1, max1);
    let c2 = this.newNode(min2, max2);

    data = this.data;

    data[ni + NCHILDA] = c1;
    data[ni + NCHILDB] = c2;
    data[ni + NSPLITPOS] = bestsplit!;
    data[ni + NSPLITPLANE] = bestaxis;

    totp = data[ni + NTOTPOINT];
    startk = ni + NTOTPOINT + 1;

    data[ni + NTOTPOINT] = 0;

    if (new_nodes_out !== undefined) {
      new_nodes_out[0] = c1;
      new_nodes_out[1] = c2;
    }

    for (let k = startk, j = 0; j < totp; j++, k += 4) {
      this.insert(data[k], data[k + 1], data[k + 2], data[k + 3]);
    }
  }

  forEachPoint(x: number, y: number, r: number, callback: (id: number) => boolean | void, thisvar?: unknown): void {
    let p = _foreach_tmp;

    p[0] = x;
    p[1] = y;
    p[2] = 0;

    return this.search(p, r, callback, thisvar);
  }

  //if callback returns true then the search will stop
  search(
    p: number[] | InstanceType<typeof Vector3>,
    r: number,
    callback: (id: number) => boolean | void,
    thisvar?: unknown
  ): void {
    let stop = false;

    let data = this.data;
    let cachering = this._point_cachering;
    let co = this._search_cachering.next() as InstanceType<typeof Vector3>;

    let recurse = (ni: number): void => {
      if (stop) {
        return;
      }

      if (data[ni + NCHILDA] != 0) {
        for (let si = 0; si < 2; si++) {
          let ni2 = data[ni + NCHILDA + si];
          let ok = 0;

          for (let i = 0; i < 3; i++) {
            let a = data[ni2 + i],
              b = data[ni2 + i + 3];

            //console.log(a, b, p[i], r);
            ok += p[i as Number3]! + 2 * r >= a && p[i as Number3]! - 2 * r <= b ? 1 : 0;
          }

          if (ok == 3) {
            recurse(ni2);
          }
        }
      } else if (data[ni + NCHILDA] == 0) {
        let totp = data[ni + NTOTPOINT];
        let k = ni + NTOTPOINT + 1;

        for (let j = 0; j < totp; j++, k += 4) {
          co[0] = data[k];
          co[1] = data[k + 1];
          co[2] = data[k + 2];

          let dx = co[0] - p[0];
          let dy = co[1] - p[1];
          let dz = (p as number[]).length > 2 ? co[2] - p[2] : 0;

          if (dx * dx + dy * dy + dz * dz < r * r) {
            let dostop: boolean | void;

            if (thisvar) {
              dostop = callback.call(thisvar, data[k + 3]);
            } else {
              dostop = callback(data[k + 3]);
            }

            if (dostop) {
              stop = true;
              break;
            }
          }
        }
      }
    };

    recurse(this.root);
  }

  draw(g: CanvasRenderingContext2D): void {
    let d = this.data;

    let recurse = (ni: number): void => {
      g.beginPath();
      g.rect(d[ni + NXMIN], d[ni + NYMIN], d[ni + NXMAX] - d[ni + NXMIN], d[ni + NYMAX] - d[ni + NYMIN]);
      g.strokeStyle = "orange";
      g.fillStyle = "rgba(255, 150, 50, 0.25)";
      g.stroke();

      if (d[ni + NCHILDA] == 0.0) {
        //leaf node?
        g.fill();

        let r = (0.25 * (this.max[0] - this.min[0])) / Math.sqrt(this.totpoint);
        let totpoint = d[ni + NTOTPOINT];

        g.beginPath();

        for (let i = 0; i < totpoint * 4; i += 4) {
          let i2 = ni + NTOTPOINT + 1 + i;

          let x = d[i2],
            y = d[i2 + 1],
            z = d[i2 + 2],
            id = d[i2 + 3];

          g.moveTo(x, y);
          g.arc(x, y, r, -Math.PI, Math.PI);
        }

        g.fillStyle = "rgba(100, 150, 250, 0.5)";
        g.fill();
      }

      if (d[ni + NCHILDA] != 0) {
        recurse(d[ni + NCHILDA]);
        recurse(d[ni + NCHILDB]);
      }
    };

    recurse(this.root);
  }

  balance(): this {
    /*
    balance tree.  idea is to do one level at a time, insert all points, subdivide all nodes in that
    level that needs subdivision and only then recurse.

    we can't do that with this data structure which is optimized for speed of memory access.
    so we have to build a temporary structure.
    */

    class BalanceNode extends Array<number> {
      min: InstanceType<typeof Vector3>;
      max: InstanceType<typeof Vector3>;
      bestpos: number | undefined;
      bestaxis: number | undefined;
      bestfit: number | undefined;
      nodes: [BalanceNode | undefined, BalanceNode | undefined];

      constructor(min: InstanceType<typeof Vector3>, max: InstanceType<typeof Vector3>) {
        super();

        this.min = new Vector3(min);
        this.max = new Vector3(max);
        this.bestpos = undefined;
        this.bestaxis = undefined;
        this.bestfit = undefined;

        this.nodes = [undefined, undefined];
      }
    }

    let min = new Vector3(undefined as unknown as number[]);
    let max = new Vector3(undefined as unknown as number[]);

    for (let i = 0; i < 3; i++) {
      min[i as Number3] = this.data[this.root + i];
      max[i as Number3] = this.data[this.root + 3 + i];
    }

    let root = new BalanceNode(min, max);

    this.iterAllPoints((p: KDPoint) => {
      for (let j = 0; j < 3; j++) {
        root.push(p.co[j as Number3]!);
      }

      root.push(p.id!);
    });

    let recurse = (node: BalanceNode, depth: number): void => {
      if (depth >= this.maxdepth) {
        if (log_everything || util.time_ms() - this.last_warn_time > 500) {
          console.warn("Malformed data: failed to insert point during balancing, depth:", depth);
          this.last_warn_time = util.time_ms();
        }

        return;
      }

      if (node.length / 4 < MAXPOINTS) {
        return;
      }

      let bestfit: number | undefined = undefined,
        bestpos: number | undefined = undefined,
        bestaxis: number | undefined = undefined;
      let size = 0;

      for (let axis = 0; axis < 3; axis++) {
        size = Math.max(size, node.max[axis as Number3]! - node.min[axis as Number3]!);
      }

      for (let axis = 0; axis < 3; axis++) {
        let centroid = 0;
        let amin = 1e17,
          amax = -1e17;

        for (let i = 0; i < node.length; i += 4) {
          centroid += node[i + axis];

          amin = Math.min(amin, node[i + axis]);
          amax = Math.max(amax, node[i + axis]);
        }

        //points lie in axis's plane?
        if (amax - amin < 0.00001) {
          continue;
        }

        centroid /= node.length / 4;

        let fit = 0;

        for (let i = 0; i < node.length; i += 4) {
          fit += node[i + axis] < centroid ? -1 : 1;
        }
        fit = Math.abs(fit);

        let aspect = (node.max[axis as Number3]! - node.min[axis as Number3]!) / size;

        if (aspect > 0 && aspect < 1) aspect = 1 / aspect;

        if (fit != node.length / 4 && aspect > 0.001) {
          fit += aspect * 7.0;
        }

        if (bestfit === undefined || fit < bestfit) {
          bestfit = fit;
          bestpos = centroid;
          bestaxis = axis;
        }
      }

      if (bestfit === undefined) {
        console.warn("data integrity error in balance(), node was fill with duplicate points");
        return;
      }

      node.bestpos = bestpos;
      node.bestaxis = bestaxis;
      node.bestfit = bestfit;

      //console.log(bestaxis, bestpos, bestfit);

      min.load!(node.min);
      max.load!(node.max);

      max[bestaxis! as Number3] = bestpos!;
      let n1 = new BalanceNode(min, max);

      max.load!(node.max);
      min[bestaxis! as Number3] = bestpos!;
      let n2 = new BalanceNode(min, max);

      for (let i = 0; i < node.length; i += 4) {
        let child = node[i + bestaxis!] < bestpos! ? n1 : n2;

        for (let j = 0; j < 4; j++) {
          child.push(node[i + j]);
        }
      }

      node.nodes[0] = n1;
      node.nodes[1] = n2;

      node.length = 0;

      recurse(n1, depth + 1);
      recurse(n2, depth + 1);
    };

    recurse(root, 0);

    this.data.fill(0, 0, this.data.length);
    this.usednodes = 0;
    this.root = this.newNode(root.min, root.max);

    let recurse2 = (node: BalanceNode, ni: number): void => {
      if (node.nodes[0] !== undefined) {
        this.data[ni + NSPLITPLANE] = node.bestaxis!;
        this.data[ni + NSPLITPOS] = node.bestpos!;

        let n1 = this.newNode(node.nodes[0].min, node.nodes[0].max);
        let n2 = this.newNode(node.nodes[1]!.min, node.nodes[1]!.max);

        this.data[ni + NCHILDA] = n1;
        this.data[ni + NCHILDB] = n2;

        recurse2(node.nodes[0], n1);
        recurse2(node.nodes[1]!, n2);
      } else {
        //console.log("yay, found points", ni, node.length/4);
        let data = this.data;

        data[ni + NTOTPOINT] = node.length / 4;

        let j = ni + NTOTPOINT + 1;

        for (let i = 0; i < node.length; i += 4) {
          if (i / 4 >= MAXPOINTS) {
            console.warn("ran over MAXPOINTS in balance!", node.length / 4);
            break;
          }

          for (let k = 0; k < 4; k++) {
            data[j++] = node[i + k];
          }
        }
      }
    };

    recurse2(root, this.root);

    return this;
  }
}
