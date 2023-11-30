import * as util from '../util/util.js'

export const SocketFlags = {
  UPDATE: 1
};
export const NodeFlags = {
  UPDATE   : 1,
  SORT_TAG1: 2,
  SORT_TAG2: 4,
};
export const RecalcFlags = {
  RUN   : 1,
  RESORT: 2
};
export const SocketTypes = {
  INPUT : "inputs",
  OUTPUT: "outputs"
};

let graphIdGen = 1;

export class EventSocket {
  static socketDef = {
    typeName: "",
    uiName  : "",
    flag    : 0,
  }

  name = ""
  id = graphIdGen++;
  flag = 0;

  edges = [];
  node = undefined;

  type = undefined;

  constructor(node) {
    this.node = node;
  }

  get value() {
    throw new Error("implement me!");
  }

  set value(v) {
    this.flagUpdate();
  }

  get isUpdated() {
    return this.flag & SocketFlags.UPDATE;
  }

  copyFrom(b) {
    this.name = b.name;
    this.flag = b.flag;

    return this;
  }

  copy() {
    return (new this.constructor()).copyFrom(this);
  }

  flagUpdate() {
    this.flag |= SocketFlags.UPDATE;

    if (!this.node) {
      return;
    }

    if (this.type === SocketTypes.INPUT) {
      this.node.flagUpdate();
    } else {
      for (let sockb of this.edges) {
        sockb.flag |= SocketFlags.UPDATE;
        sockb.node.flagUpdate();
      }
    }

    return this;
  }

  flagResort() {
    if (this.node) {
      this.node.flagResort();
    }

    return this;
  }

  connect(sockb) {
    this.edges.push(sockb);
    sockb.edges.push(this);
    return this;
  }

  hasNode(node) {
    for (let sockb of this.edges) {
      if (sockb.node === node || sockb.node.owner === node) {
        return true;
      }
    }

    return false;
  }

  has(sockb) {
    return this.edges.indexOf(sockb) >= 0;
  }

  disconnect(sockb = undefined) {
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

const NodeClasses = [];

//Interface
export class NodeCapable {
  graphNode = undefined;

  static graphNodeDef = {
    typeName: "",
    uiName  : "",
    flag    : 0,

    /* Sockets inherit. */
    inputs : {},
    outputs: {}
  };

  graphExec() {
  }
}

export class EventNode {
  owner = undefined;
  inputs = {};
  outputs = {};
  allsockets = [];
  graph = undefined;
  sortIndex = -1;
  id = graphIdGen++;
  flag = 0;

  static register(cls, def) {
    cls.graphNodeDef = def;
    if (!def.typeName) {
      throw new Error("Missing graphNodeDef.typeName")
    }

    NodeClasses.push(cls);

    return def;
  }

  addSocket(type, key, sock) {
    this[type][key] = sock;
    sock.name = key;
    sock.node = this;
    sock.type = type;

    return this;
  }

  static isNodeCapable(cls) {
    return cls.graphNodeDef !== undefined;
  }

  constructor(owner) {
    this.owner = owner;

    let cls = owner.constructor;

    let getSockets = (key) => {
      let socks = {};

      let p = cls;
      while (p) {
        if (p.graphNodeDef) {
          let socksDef = p.graphNodeDef[key] || {};

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
        p = p.__proto__;
      }

      return socks;
    }

    this.inputs = getSockets("inputs");
    this.outputs = getSockets("outputs");
  }

  static init(owner) {
    owner.graphNode = new EventNode(owner);
    return owner.graphNode;
  }

  flagUpdate() {
    this.flag |= NodeFlags.UPDATE;

    if (this.graph) {
      this.graph.flagUpdate(this);
    }

    return this;
  }

  flagResort() {
    if (this.graph) {
      this.graph.flagResort(this);
    }
    return this;
  }
}

export class EventGraph {
  nodes = [];
  flag = 0;
  nodeIdMap = new Map()
  sockIdMap = new Map()
  sortlist = [];
  queueReq = undefined;
  #skipQueueExec = 0;

  constructor() {
  }

  add(node) {
    node = this.eventNode(node);

    node.graph = this;
    this.nodeIdMap.set(node.id, node);

    this.nodes.push(node);
    this.flagResort(node);
    this.flagUpdate(node);
  }

  has(node) {
    node = this.eventNode(node);
    return this.nodeIdMap.has(node.id);
  }

  eventNode(node) {
    if (!(node instanceof EventNode)) {
      node = node.graphNode;
    }

    if (node === undefined) {
      console.warn("Not an event node:", arguments[0]);
      throw new Error("Not an event node");
    }

    return node;
  }

  remove(node) {
    node = this.eventNode(node);

    if (node === undefined) {
      throw new Error("EventGraph.prototype.remove(): node was undefined");
    }

    if (!this.nodeIdMap.get(node.id)) {
      throw new Error("Node is not in event graph");
    }

    this.nodeIdMap.delete(node.id);

    for (let sock of Array.from(node.eventNode.allsockets)) {
      this.sockIdMap.delete(sock.id);

      try {
        sock.disconnect();
      } catch (error) {
        util.print_stack(error);
        console.error("Failed to disconnect a socket");
      }
    }

    node.graph = undefined;
    this.nodes.remove(node);
    this.flagResort();
  }

  flagResort(node) {
    if (node) {
      node = this.eventNode(node);
    }

    this.flag |= RecalcFlags.RESORT | RecalcFlags.RUN;

    return this;
  }

  flagUpdate(node) {
    node = this.eventNode(node);

    this.flag |= RecalcFlags.RUN;

    if (!this.#skipQueueExec) {
      this.queueExec();
    }

    return this;
  }

  sort() {
    console.warn("Sorting Graph");

    this.flag &= ~RecalcFlags.RESORT;

    for (let n of this.nodes) {
      n.flag &= ~(NodeFlags.SORT_TAG1 | NodeFlags.SORT_TAG2);
    }

    let sortlist = this.sortlist;
    this.sortlist.length = 0;

    let dosort = (n) => {
      if (n.flag & NodeFlags.SORT_TAG2) {
        console.error("Cycle in event dag!", n);
        return;
      }

      n.flag |= NodeFlags.SORT_TAG2;

      for (let [k, socka] of Object.entries(n.inputs)) {
        for (let sockb of socka.edges) {
          let n2 = sockb.node;
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
          let n2 = sockb.node;

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

  queueExec() {
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

  exec() {
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
        util.print_stack(error);
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
            sockb.node.flag |= SocketFlags.UPDATE;
          }

          sock.flag &= ~SocketFlags.UPDATE;
        }
      }
    }

    this.#skipQueueExec--;
  }
}

export const theEventGraph = new EventGraph();

const strBoolMap = {
  "true" : "false",
  "false": "true",
  "on"   : "off",
  "off"  : "on",
  "yes"  : "no",
  "no"   : "yes",
}

export class DependSocket extends EventSocket {
  static socketDef = {
    typeName: "depend",
    uiName  : "depend",
    flag    : 0,
  }

  #value = undefined;

  get value() {
    return this.#value;
  }

  set value(v) {
    this.#value = v;
  }

  copyFrom(b) {
    super.copyFrom(b);

    this.#value = b.#value;

    return this;
  }
}

export const PropSocketModes = {
  REPLACE: 0,
  MIN    : 1,
  MAX    : 2,
}

export class PropertySocket extends EventSocket {
  static socketDef = {
    typeName: "property_socket",
    uiName  : "Property Socket",
    flag    : 0,
  }

  mixMode = PropSocketModes.REPLACE;

  #binding = {
    obj: null,
    key: "",
  }

  #callbacks = []; //(newval, oldval) => val
  #invert = false; //Invert bool or number properties

  oldValue = undefined;

  mode(mixmode) {
    this.mixMode = mixmode;
    return this;
  }

  copyFrom(b) {
    super.copyFrom(b);

    this.#invert = b.#invert;
    this.#callbacks = Array.from(b.#callbacks);
    this.#binding = b.#binding;

    return this;
  }

  invert(state = true) {
    this.#invert = state;
    return this;
  }

  callback(cb) {
    this.#callbacks.push(cb);
    return this;
  }

  get value() {
    let bind = this.#binding;
    return bind.obj ? bind.obj[bind.key] : undefined;
  }

  set value(v) {
    let old = this.value;
    if (this.#callbacks.length > 0) {
      for (let cb of this.#callbacks) {
        v = cb(v, old);
      }
    }

    if (this.#invert && (typeof v === "number" || typeof v === "boolean" || typeof v === "undefined")) {
      v = !v;
    } else if (this.#invert && typeof v === "string") {
      let s = v.toLowerCase().trim();
      if (s in strBoolMap) {
        v = strBoolMap[s];
      }
    }

    let bind = this.#binding;
    if (bind.obj) {
      bind.obj[bind.key] = v;
    } else {
      console.warn("Attempt to set unbound property socket", this);
    }
  }

  bind(obj, key) {
    this.#binding.obj = obj;
    this.#binding.key = key;

    return this;
  }
}
