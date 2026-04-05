import * as util from "../util/util.js";

export const SocketFlags = {
  UPDATE: 1,
};
export const NodeFlags = {
  UPDATE   : 1,
  SORT_TAG1: 2,
  SORT_TAG2: 4,
};
export const RecalcFlags = {
  RUN   : 1,
  RESORT: 2,
};
export const SocketTypes = {
  INPUT : "inputs" as const,
  OUTPUT: "outputs" as const,
};

export type SocketType = "inputs" | "outputs";

export interface SocketDef {
  typeName: string;
  uiName: string;
  flag: number;
}

export interface GraphNodeDef {
  typeName: string;
  uiName: string;
  flag: number;
  inputs: Record<string, EventSocket>;
  outputs: Record<string, EventSocket>;
}

let graphIdGen = 1;

export class EventSocket {
  static socketDef: SocketDef = {
    typeName: "",
    uiName  : "",
    flag    : 0,
  };

  name: string = "";
  id: number = graphIdGen++;
  flag: number = 0;

  edges: EventSocket[] = [];
  node: EventNode | undefined = undefined;

  type: SocketType | undefined = undefined;

  constructor(node?: EventNode) {
    this.node = node;
  }

  get value(): unknown {
    throw new Error("implement me!");
  }

  set value(v: unknown) {
    this.flagUpdate();
  }

  get isUpdated(): number {
    return this.flag & SocketFlags.UPDATE;
  }

  copyFrom(b: EventSocket): this {
    this.name = b.name;
    this.flag = b.flag;

    return this;
  }

  copy(): EventSocket {
    return new (this.constructor as new () => EventSocket)().copyFrom(this);
  }

  flagUpdate(): this | void {
    this.flag |= SocketFlags.UPDATE;

    if (!this.node) {
      return;
    }

    if (this.type === SocketTypes.INPUT) {
      this.node.flagUpdate();
    } else {
      for (let sockb of this.edges) {
        sockb.flag |= SocketFlags.UPDATE;
        sockb.node!.flagUpdate();
      }
    }

    return this;
  }

  flagResort(): this {
    if (this.node) {
      this.node.flagResort();
    }

    return this;
  }

  connect(sockb: EventSocket): this {
    this.edges.push(sockb);
    sockb.edges.push(this);
    return this;
  }

  hasNode(node: EventNode | NodeCapable): boolean {
    for (let sockb of this.edges) {
      if (sockb.node === node || sockb.node!.owner === node) {
        return true;
      }
    }

    return false;
  }

  has(sockb: EventSocket): boolean {
    return this.edges.indexOf(sockb) >= 0;
  }

  disconnect(sockb: EventSocket | undefined = undefined): this {
    this.flagResort();

    if (sockb === undefined) {
      /* Disconnect all. */
      for (let sock of this.edges) {
        sock.flagUpdate();
        sock.edges.remove(this);
      }

      this.edges.length = 0;
      return this;
    }

    sockb.flagUpdate();
    this.edges.remove(sockb);
    return this;
  }
}

const NodeClasses: (new (...args: unknown[]) => NodeCapable)[] = [];

//Interface
export class NodeCapable {
  graphNode?: EventNode;

  static graphNodeDef: GraphNodeDef = {
    typeName: "",
    uiName  : "",
    flag    : 0,

    /* Sockets inherit. */
    inputs : {},
    outputs: {},
  };

  graphExec(): void {}
}

export class EventNode {
  owner: NodeCapable;
  inputs: Record<string, EventSocket> = {};
  outputs: Record<string, EventSocket> = {};
  allsockets: EventSocket[] = [];
  graph: EventGraph | undefined = undefined;
  sortIndex: number = -1;
  id: number = graphIdGen++;
  flag: number = 0;

  static register(cls: { graphNodeDef?: GraphNodeDef }, def: GraphNodeDef): GraphNodeDef {
    cls.graphNodeDef = def;
    if (!def.typeName) {
      throw new Error("Missing graphNodeDef.typeName");
    }

    NodeClasses.push(cls as new (...args: unknown[]) => NodeCapable);

    return def;
  }

  addSocket(type: SocketType, key: string, sock: EventSocket): this {
    (this as unknown as Record<string, Record<string, EventSocket>>)[type][key] = sock;
    sock.name = key;
    sock.node = this;
    sock.type = type;

    return this;
  }

  static isNodeCapable(cls: Record<string, unknown>): boolean {
    return cls.graphNodeDef !== undefined;
  }

  constructor(owner: NodeCapable) {
    this.owner = owner;

    let cls = owner.constructor as unknown as Record<string, unknown>;

    let getSockets = (key: SocketType): Record<string, EventSocket> => {
      let socks: Record<string, EventSocket> = {};

      let p = cls as Record<string, unknown> | null;
      while (p) {
        if (p.graphNodeDef) {
          let graphNodeDef = p.graphNodeDef as GraphNodeDef;
          let socksDef = graphNodeDef[key] || {};

          for (let k in socksDef) {
            if (!(k in socks)) {
              socks[k] = socksDef[k].copy();
              socks[k].name = k;
              socks[k].node = this;
              socks[k].type = key;

              this.allsockets.push(socks[k]);
            }
          }
        }
        p = Object.getPrototypeOf(p) as Record<string, unknown> | null;
      }

      return socks;
    };

    this.inputs = getSockets("inputs");
    this.outputs = getSockets("outputs");
  }

  static init(owner: NodeCapable): EventNode {
    owner.graphNode = new EventNode(owner);
    return owner.graphNode;
  }

  flagUpdate(): this {
    this.flag |= NodeFlags.UPDATE;

    if (this.graph) {
      this.graph.flagUpdate(this);
    }

    return this;
  }

  flagResort(): this {
    if (this.graph) {
      this.graph.flagResort(this);
    }
    return this;
  }
}

export class EventGraph {
  nodes: EventNode[] = [];
  flag: number = 0;
  nodeIdMap: Map<number, EventNode> = new Map();
  sockIdMap: Map<number, EventSocket> = new Map();
  sortlist: EventNode[] = [];
  queueReq: number | true | undefined = undefined;
  #skipQueueExec: number = 0;

  constructor() {}

  add(node: EventNode | NodeCapable): void {
    let eventNode = this.eventNode(node);

    eventNode.graph = this;
    this.nodeIdMap.set(eventNode.id, eventNode);

    this.nodes.push(eventNode);
    this.flagResort(eventNode);
    this.flagUpdate(eventNode);
  }

  has(node: EventNode | NodeCapable): boolean {
    let eventNode = this.eventNode(node);
    return this.nodeIdMap.has(eventNode.id);
  }

  eventNode(node: EventNode | NodeCapable): EventNode {
    if (!(node instanceof EventNode)) {
      node = node.graphNode!;
    }

    if (node === undefined) {
      console.warn("Not an event node:", arguments[0]);
      throw new Error("Not an event node");
    }

    return node;
  }

  remove(node: EventNode | NodeCapable): void {
    let eventNode = this.eventNode(node);

    if (eventNode === undefined) {
      throw new Error("EventGraph.prototype.remove(): node was undefined");
    }

    if (!this.nodeIdMap.get(eventNode.id)) {
      throw new Error("Node is not in event graph");
    }

    this.nodeIdMap.delete(eventNode.id);

    for (let sock of Array.from(eventNode.allsockets)) {
      this.sockIdMap.delete(sock.id);

      try {
        sock.disconnect();
      } catch (error) {
        util.print_stack(error as Error);
        console.error("Failed to disconnect a socket");
      }
    }

    eventNode.graph = undefined;
    this.nodes.remove(eventNode);
    this.flagResort();
  }

  flagResort(node?: EventNode | NodeCapable): this {
    if (node) {
      this.eventNode(node);
    }

    this.flag |= RecalcFlags.RESORT | RecalcFlags.RUN;

    return this;
  }

  flagUpdate(node: EventNode | NodeCapable): this {
    this.eventNode(node);

    this.flag |= RecalcFlags.RUN;

    if (!this.#skipQueueExec) {
      this.queueExec();
    }

    return this;
  }

  sort(): void {
    console.warn("Sorting Graph");

    this.flag &= ~RecalcFlags.RESORT;

    for (let n of this.nodes) {
      n.flag &= ~(NodeFlags.SORT_TAG1 | NodeFlags.SORT_TAG2);
    }

    let sortlist = this.sortlist;
    this.sortlist.length = 0;

    let dosort = (n: EventNode): void => {
      if (n.flag & NodeFlags.SORT_TAG2) {
        console.error("Cycle in event dag!", n);
        return;
      }

      n.flag |= NodeFlags.SORT_TAG2;

      for (let [k, socka] of Object.entries(n.inputs)) {
        for (let sockb of socka.edges) {
          let n2 = sockb.node!;
          if (!(n2.flag & NodeFlags.SORT_TAG1)) {
            dosort(n2);
          }
        }
      }

      n.flag &= ~NodeFlags.SORT_TAG2;
      n.flag |= NodeFlags.SORT_TAG1;
      n.sortIndex = sortlist.length;
      sortlist.push(n);

      for (let [k, socka] of Object.entries(n.outputs)) {
        for (let sockb of socka.edges) {
          let n2 = sockb.node!;

          if (!(n2.flag & NodeFlags.SORT_TAG1)) {
            dosort(n2);
          }
        }
      }
    };

    for (let n of this.nodes) {
      if (!(n.flag & NodeFlags.SORT_TAG1)) {
        dosort(n);
      }
    }
  }

  queueExec(): void {
    console.warn("queueExec", this.queueReq);

    this.flag |= RecalcFlags.RUN;

    if (this.queueReq !== undefined) {
      return;
    }

    this.queueReq = true;
    this.queueReq = window.setTimeout(() => {
      this.queueReq = undefined;
      this.exec();
    }, 0);
  }

  exec(): void {
    this.flag &= ~RecalcFlags.RUN;

    if (this.flag & RecalcFlags.RESORT) {
      this.sort();
    }

    console.warn("Executing Graph");

    this.#skipQueueExec++;

    let sortlist = this.sortlist;
    for (let n of sortlist) {
      if (!(n.flag & NodeFlags.UPDATE)) {
        continue;
      }

      try {
        n.owner.graphExec();
      } catch (error) {
        util.print_stack(error as Error);
        console.error("Error during event graph execution");
      }

      n.flag &= ~NodeFlags.UPDATE;

      for (let k in n.inputs) {
        let sock = n.inputs[k];
        sock.flag &= ~SocketFlags.UPDATE;
      }

      for (let k in n.outputs) {
        let sock = n.outputs[k];

        if (sock.flag & SocketFlags.UPDATE) {
          for (let sockb of sock.edges) {
            sockb.flag |= SocketFlags.UPDATE;
            sockb.node!.flag |= NodeFlags.UPDATE;
          }

          sock.flag &= ~SocketFlags.UPDATE;
        }
      }
    }

    this.#skipQueueExec--;
  }
}

export const theEventGraph: EventGraph = new EventGraph();

const strBoolMap: Record<string, string> = {
  "true" : "false",
  "false": "true",
  "on"   : "off",
  "off"  : "on",
  "yes"  : "no",
  "no"   : "yes",
};

export class DependSocket extends EventSocket {
  static socketDef: SocketDef = {
    typeName: "depend",
    uiName  : "depend",
    flag    : 0,
  };

  #value: unknown = undefined;

  get value(): unknown {
    return this.#value;
  }

  set value(v: unknown) {
    this.#value = v;
  }

  copyFrom(b: DependSocket): this {
    super.copyFrom(b);

    this.#value = b.#value;

    return this;
  }
}

export const PropSocketModes = {
  REPLACE: 0,
  MIN    : 1,
  MAX    : 2,
};

type PropertyCallback<T = any> = (newval: T, oldval?: T) => T;

export class PropertySocket<T = any> extends EventSocket {
  static socketDef: SocketDef = {
    typeName: "property_socket",
    uiName  : "Property Socket",
    flag    : 0,
  };

  mixMode: number = PropSocketModes.REPLACE;

  #binding: { obj: any; key: string } = {
    obj: null,
    key: "",
  };

  #callbacks: PropertyCallback<T>[] = []; //(newval, oldval) => val
  #invert: boolean = false; //Invert bool or number properties

  oldValue?: T = undefined;

  mode(mixmode: number): this {
    this.mixMode = mixmode;
    return this;
  }

  copyFrom(b: PropertySocket): this {
    super.copyFrom(b);

    this.#invert = b.#invert;
    this.#callbacks = Array.from(b.#callbacks);
    this.#binding = b.#binding;

    return this;
  }

  invert(state: boolean = true): this {
    this.#invert = state;
    return this;
  }

  callback(cb: PropertyCallback): this {
    this.#callbacks.push(cb);
    return this;
  }

  get value(): T | undefined {
    let bind = this.#binding;
    return bind.obj ? bind.obj[bind.key] : undefined;
  }

  set value(v: T) {
    let old = this.value;
    if (this.#callbacks.length > 0) {
      for (let cb of this.#callbacks) {
        v = cb(v, old);
      }
    }

    if (this.#invert && (typeof v === "number" || typeof v === "boolean" || typeof v === "undefined")) {
      v = !v as unknown as T;
    } else if (this.#invert && typeof v === "string") {
      let s = v.toLowerCase().trim();
      if (s in strBoolMap) {
        v = strBoolMap[s] as unknown as T;
      }
    }

    let bind = this.#binding;
    if (bind.obj) {
      bind.obj[bind.key] = v;
    } else {
      console.warn("Attempt to set unbound property socket", this);
    }
  }

  bind(obj: any, key: string): this {
    this.#binding.obj = obj;
    this.#binding.key = key;

    return this;
  }
}
