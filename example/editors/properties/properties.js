import {UIBase, PackFlags, Icons, nstructjs, KeyMap, HotKey, util,
        PackNode, PackNodeVertex, Vector2, graphPack} from '../../pathux.js';

import {Editor} from "../editor_base.js";

export class PropsEditor extends Editor {
  constructor() {
    super();

    this.minSize = [55, undefined];
    //this.maxSize = [350, undefined]
  }

  getKeyMaps() {
    return [

    ]
  }

  init() {
    super.init();

    let tabs = this.tabs = this.container.tabs("left");

    let tab1 = tabs.tab("Mass Set Example");
    this.buildMassSetExample(tab1);
    this.buildFill(tabs.tab("Fill"));

    let tab2 = tabs.tab("Settings");

    let strip = tab2.row().strip();

    strip.prop("data.angle1");
    strip.label("is internally: ");
    strip.pathlabel("data.angle1");

    strip = tab2.row().strip();
    strip.prop("data.angle2");
    strip.label("is internally: ");
    strip.pathlabel("data.angle2");

    strip = tab2.row().strip();
    strip.simpleslider("data.angle1");
    strip.label("is internally: ");
    strip.pathlabel("data.angle1");

    strip = tab2.row().strip();
    strip.simpleslider("data.angle2");
    strip.label("is internally: ");
    strip.pathlabel("data.angle2");

    strip = tab2.row().strip();
    strip.prop("data.vector_test");

    let col = tab2.col();
    col.pathlabel("data.vector_test[0]");
    col.pathlabel("data.vector_test[1]");
    col.pathlabel("data.vector_test[2]");
    col.pathlabel("data.vector_test[3]");

    tabs.setActive(tab1);

    this.buildCurve(tabs.tab("Curve Mapping"));
    this.buildGraphPack(tabs.tab("Graph Packing"));

    this.setCSS();
  }

  copy() {
    let ret = document.createElement(this.constructor.define().tagname);
    ret.ctx = this.ctx;
    return ret;
  }


  buildGraphPack(tab) {
    let nodes = this._nodes = [];
    let nodemap = this._nodemap = {};
    let draw;

    let canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    let scale = 0.25;

    canvas.addEventListener("wheel", (e) => {
      let df = Math.sign(e.deltaY)*0.05;
      scale *= 1.0 - df;

      console.log("scale", scale);

      draw();
    });

    let rand = new util.MersenneRandom();
    let count = 29;
    let size = (canvas.width*canvas.height) / count;
    size = Math.sqrt(size)*0.75;

    for (let i=0; i<count; i++) {
      let n = new PackNode();
      n.pos[0] = 0;
      n.pos[1] = 0;

      n.size[0] = (rand.random()*0.5+0.5)*size;
      n.size[1] = (rand.random()*0.5+0.5)*size;

      for (let i=0; i<2; i++) {
        let scount = Math.random()*8;
        let x = i ? n.size[0] : 0;
        let y = 0, socksize = Math.min(20, n.size[1]/scount);

        for (let j=0; j<scount; j++) {
          let v = new PackNodeVertex(n, [x, y]);
          v.side = i;
          n.verts.push(v);

          y += socksize;
        }
      }

      nodemap[n._id] = n;
      nodes.push(n);
    }

    let ri;
    function randitem(array) {
      ri = ~~(Math.random()*array.length*0.99999);
      return array[ri];
    }

    let visit2 = new Set();

    for (let i=0; i<count*2; i++) {
      //let n1 = randitem(nodes), n2 = randitem(nodes);
      let ri = i % nodes.length;

      let n1 = nodes[ri];

      let ri2 = (ri + 1) % nodes.length;
      let n2 = nodes[ri2];

      if (visit2.has(n1._id)) {
        continue;
      }

      if (n1 === n2)
        continue;

      visit2.add(n1._id);

      let s1 = randitem(n1.verts);
      let s2 = randitem(n2.verts);

      if (!s1 || !s2) continue;

      s1.edges.push(s2);
      s2.edges.push(s1);
    }
    canvas.g = canvas.getContext("2d");

    canvas.style["border"] = "1px solid orange";

    draw = () => {
      let g = canvas.g;

      g.resetTransform();
      g.clearRect(0, 0, canvas.width, canvas.height);

      g.translate(canvas.width*0.5, canvas.height*0.5);
      g.scale(scale, scale);
      g.translate(-canvas.width*0.5, -canvas.height*0.5);
      g.lineWidth = 2.0 / scale;

      g.beginPath();
      g.strokeStyle = "black";

      for (let node of nodes) {
        for (let v of node.verts) {
          let p1 = new Vector2(v).add(node.pos);

          for (let v2 of v.edges) {
            let p2 = new Vector2(v2).add(v2.node.pos);
            g.moveTo(p1[0], p1[1]);
            g.lineTo(p2[0], p2[1]);
          }
        }
      }
      g.stroke();

      g.fillStyle = "teal";
      g.strokeStyle = "orange";

      g.beginPath();
      for (let node of nodes) {
        g.rect(node.pos[0], node.pos[1], node.size[0], node.size[1]);
      }
      g.fill();
      g.stroke();
    };

    tab.button("pack", () => {
      console.log("pack!");
      //graphPack(nodes, undefined, undefined, draw);
      graphPack(nodes, undefined, 25);

      draw();
    });

    tab.shadow.appendChild(canvas);
    draw();

  }
  buildCurve(tab) {
    tab.prop("data.curvemap");
    //let c = document.createElement("curve-widget-x");
    //tab.add(c);
  }

  buildFill(tab) {
    let col = tab.col();
    let mass_path = "canvas.paths[{$.id % 2 === 0}].material.color";
    col.prop("canvas.paths.active.material.color", undefined, mass_path);
  }

  buildMassSetExample(tab) {
    let col = tab.col();

    let path = "canvas.paths.active.material.color"
    let massSetPath = "canvas.paths[{$.id % 2 === 0}].material.color";

    col.label("Stripe fun!");
    let ret = col.prop(path, undefined, massSetPath);
    ret.style["padding"] = "10px";

    col.viewer(undefined, `
      <h2>Mass Paths Example</h2>
      <p>This is an example of setting multiple items in a list at once.</p>
      <p>Path.ux reads properties from a single datapath, but writes to multiple
      ones. This works by putting filters inside of lists.  For example:</p>
        
      <pre>"canvas.paths[{$.id % 2 === 0}].material.color"</pre>
      
      Will write to all items in canvas.paths whose .id members are a multiple of 2.
      
      <h3>Full example</h3>      
      <pre>
let path = "canvas.paths.active.material.color"
let massSetPath 
  = "canvas.paths[{$.id % 2 === 0}].material.color";

col.prop(path, undefined, massSetPath);</pre>
    `);
  }

  static define() {return {
    tagname  : "props-editor-x",
    areaname : "props",
    uiname   : "Properties",
    icon     : -1
  }}
};
Editor.register(PropsEditor);
PropsEditor.STRUCT = nstructjs.STRUCT.inherit(PropsEditor, Editor) + `
}
`;
nstructjs.register(PropsEditor);
