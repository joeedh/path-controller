if (Array.prototype.set === undefined) {
    Array.prototype.set = function set(array, src, dst, count) {
        src = src === undefined ? 0 : src;
        dst = dst === undefined ? 0 : dst;
        count = count === undefined ? array.length :  count;
        
        if (count < 0) {
            throw new RangeError("Count must be >= zero");
        }
        
        let len = Math.min(this.length-dst, array.length-src);
        len = Math.min(len, count);
        
        for (let i=0; i<len; i++) {
            this[dst+i] = array[src+i];
        }
        
        return this;
    };

    if (Float64Array.prototype.set === undefined) {
      Float64Array.prototype.set = Array.prototype.set;
      Float32Array.prototype.set = Array.prototype.set;
      Uint8Array.prototype.set = Array.prototype.set;
      Uint8ClampedArray.prototype.set = Array.prototype.set;
      Int32Array.prototype.set = Array.prototype.set;
      Int16Array.prototype.set = Array.prototype.set;
      Int8Array.prototype.set = Array.prototype.set;
    }
}

if (Array.prototype.reject === undefined) {
    Array.prototype.reject = function reject(func) {
        return this.filter((item) => !func(item));
    };
}

if (window.Symbol == undefined) { //eek!
  window.Symbol = {
    iterator : "$__iterator__$",
    keystr   : "$__keystr__$"
  };
} else {
  Symbol.keystr = Symbol("keystr");
}

window.list = function list(iter) {
  var ret = [];
  
  if (typeof iter == "string") {
    iter = new String();
  }
  
  if (Symbol.iterator in iter) {
    for (var item of iter) {
      ret.push(item);
    }
  } else {
    iter.forEach(function(item) {
      ret.push(item);
    }, this);
  }
  
  return ret;
};

function ArrayIter(array) {
  this.array = array;
  this.i = 0;
  this.ret = {done : false, value : undefined};
}

ArrayIter.prototype[Symbol.iterator] = function() {
  return this;
};

ArrayIter.prototype.next = function() {
  var ret = this.ret;
  
  if (this.i >= this.array.length) {
    ret.done = true;
    ret.value = undefined;
    return ret;
  }
  
  ret.value = this.array[this.i++];
  return ret;
};

//XXX surely browser vendors have fixed this by now. . .
/*Override array iterator to not allocate too much*/

//Array.prototype[Symbol.iterator] = function() {
//  return new ArrayIter(this);
//}

if (Math.fract == undefined) {
  Math.fract = function fract(f) {
    var sn = (f>=0)*2.0-1.0;
    f = f*sn - Math.floor(f*sn);
    
    sn = sn<0.0;
    
    return f*(1-sn) + (1.0-f)*sn;
  };
}

if (Math.tent == undefined) {
  Math.tent = function tent(f) {
    return 1.0 - Math.abs(Math.fract(f)-0.5)*2.0;
  };
}

if (Math.sign == undefined) {
  Math.sign = function sign(f) {
    return (f>0.0)*2.0-1.0;
  };
}

if (Array.prototype.pop_i == undefined) {
  Array.prototype.pop_i = function(idx) {
    if (idx < 0 || idx >= this.length) {
      throw new Error("Index out of range");
    }
    
    while (idx < this.length) {
      this[idx] = this[idx+1];
      idx++;
    }
    
    this.length -= 1;
  };
}

if (Array.prototype.remove == undefined) {
  Array.prototype.remove = function(item, suppress_error) {
    var i = this.indexOf(item);
    
    if (i < 0) {
      if (suppress_error)
        console.trace("Warning: item not in array", item);
      else
        throw new Error("Error: item not in array " + item);
      
      return;
    }
    
    this.pop_i(i);
  };
}

if (String.prototype.contains == undefined) {
  String.prototype.contains = function(substr) {
    return String.search(substr) != null;
  };
}

String.prototype[Symbol.keystr] = function() {
  return this;
};

Number.prototype[Symbol.keystr] = Boolean.prototype[Symbol.keystr] = function() {
  return ""+this;
};

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //Allow using this built library as an AMD module
        //in another project. That other project will only
        //see this AMD call, not the internal modules in
        //the closure below.
        define([], factory);
    } else {
      function getGlobal() {
        return this;
      }
      
      //Browser globals case. Just assign the
      //result to a property on the global.
      
      if (typeof window === "object") {
        window.nstructjs = factory();
      } else if (typeof self === "object") { //browser worker
        self.nstructjs = factory();
      } else if (typeof module === "object") { //node.js
        module.exports = factory();
      }
    }
}(undefined, function () {
    //almond, and your modules will be inlined here
/**
 * @license almond 0.3.3 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/almond/LICENSE
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part, normalizedBaseParts,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name) {
            name = name.split('/');
            lastIndex = name.length - 1;

            // If wanting node ID compatibility, strip .js from end
            // of IDs. Have to do this here, and not in nameToUrl
            // because node allows either .js or non .js to map
            // to same file.
            if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
            }

            // Starts with a '.' so need the baseName
            if (name[0].charAt(0) === '.' && baseParts) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that 'directory' and not name of the baseName's
                //module. For instance, baseName of 'one/two/three', maps to
                //'one/two/three.js', but we want the directory, 'one/two' for
                //this normalization.
                normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                name = normalizedBaseParts.concat(name);
            }

            //start trimDots
            for (i = 0; i < name.length; i++) {
                part = name[i];
                if (part === '.') {
                    name.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && name[2] === '..') || name[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        name.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
            //end trimDots

            name = name.join('/');
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    //Creates a parts array for a relName where first part is plugin ID,
    //second part is resource ID. Assumes relName has already been normalized.
    function makeRelParts(relName) {
        return relName ? splitPrefix(relName) : [];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relParts) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0],
            relResourceName = relParts[1];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relResourceName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relResourceName));
            } else {
                name = normalize(name, relResourceName);
            }
        } else {
            name = normalize(name, relResourceName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i, relParts,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;
        relParts = makeRelParts(relName);

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relParts);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, makeRelParts(callback)).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../node_modules/almond/almond", function(){});

//zebra-style class system, see zebkit.org
define('struct_typesystem',[],function() {
  "use strict";
  
  var exports = {};
  
  function ClassGetter(func) {
    this.func = func;
  }
  function ClassSetter(func) {
    this.func = func;
  }
  
  var prototype_idgen = 1;
  var defined_classes = exports.defined_classes = [];

  var StaticMethod = function StaticMethod(func) {
    this.func = func;
  };
  
  //parent is optional
  var handle_statics = function(cls, methods, parent) {
    for (var i=0; i<methods.length; i++) {
      var m = methods[i];
      
      if (m instanceof StaticMethod) {
        cls[m.func.name] = m.func;
      }
    }
    
    //inherit from parent too.
    //only inherit static methods added to parent with this module, though
    if (parent != undefined) {
      for (var k in parent) {
        var v = parent[k];
        
        if ((typeof v == "object"|| typeof v == "function")
             && "_is_static_method" in v && !(k in cls)) 
        {
          cls[k] = v;
        }
      }
    }
  };

  var Class = exports.Class = function Class(methods) {
    var construct = undefined;
    var parent = undefined;
    
    if (arguments.length > 1) {
      //a parent was passed in
      
      parent = methods;
      methods = arguments[1];
    }
    
    for (var i=0; i<methods.length; i++) {
      var f = methods[i];
      
      if (f.name == "constructor") {
        construct = f;
        break;
      }
    }
    
    if (construct == undefined) {
      console.trace("Warning, constructor was not defined", methods);
      
      if (parent != undefined) {
        construct = function() {
          parent.apply(this, arguments);
        };
      } else {
        construct = function() {
        };
      }
    }
    
    if (parent != undefined) {
      construct.prototype = Object.create(parent.prototype);
    }
    
    construct.prototype.__prototypeid__ = prototype_idgen++;
    construct.__keystr__ = function() {
      return this.prototype.__prototypeid__;
    };
    
    construct.__parent__ = parent;
    construct.__statics__ = [];
    
    var getters = {};
    var setters = {};
    var getset = {};
    
    //handle getters/setters
    for (var i=0; i<methods.length; i++) {
      var f = methods[i];
      if (f instanceof ClassSetter) {
        setters[f.func.name] = f.func;
        getset[f.func.name] = 1;
      } else if (f instanceof ClassGetter) {
        getters[f.func.name] = f.func;
        getset[f.func.name] = 1;
      }
    }
    
    for (var k in getset) {
      var def = {
        enumerable   : true,
        configurable : true,
        get : getters[k],
        set : setters[k]
      };
      
      Object.defineProperty(construct.prototype, k, def);
    }
    
    handle_statics(construct, methods, parent);
    
    if (parent != undefined)
      construct.__parent__ = parent;
    
    for (var i=0; i<methods.length; i++) {
      var f = methods[i];
      
      if (f instanceof StaticMethod || f instanceof ClassGetter || f instanceof ClassSetter)
        continue;

      construct.prototype[f.name] = f;
    }
    
    return construct;
  };
  
  Class.getter = function(func) {
    return new ClassGetter(func);
  };
  Class.setter = function(func) {
    return new ClassSetter(func);
  };
  
  Class.static_method = function(func) {
    func._is_static_method = true;
    
    return new StaticMethod(func);
  };
  
  var EmptySlot = {};
  
  var set = exports.set = Class([
    function constructor(input) {
      this.items = [];
      this.keys = {};
      this.freelist = [];
      
      this.length = 0;
      
      if (input != undefined) {
        input.forEach(function(item) {
          this.add(item);
        }, this);
      }
    },
    
    function add(item) {
      var key = item.__keystr__();
      
      if (key in this.keys) return;
      
      if (this.freelist.length > 0) {
        var i = this.freelist.pop();
        
        this.keys[key] = i;
        items[i] = i;
      } else {
        var i = this.items.length;
        
        this.keys[key] = i;
        this.items.push(item);
      }
      
      this.length++;
    },
    
    function remove(item) {
      var key = item.__keystr__();
      
      if (!(key in this.keys)) {
        console.trace("Warning, item", item, "is not in set");
        return;
      }
      
      var i = this.keys[key];
      this.freelist.push(i);
      this.items[i] = EmptySlot;
      
      delete this.items[i];
      this.length--;
    },
    
    function has(item) {
      return item.__keystr__() in this.keys;
    },
    
    function forEach(func, thisvar) {
      for (var i=0; i<this.items.length; i++) {
        var item = this.items[i];
        
        if (item === EmptySlot) 
          continue;
          
        thisvar != undefined ? func.call(thisvar, time) : func(item);
      }
    }
  ]);

  return exports;
});

define('struct_util',[
  "struct_typesystem"
], function(struct_typesystem) {
  "use strict";
  
  var Class = struct_typesystem.Class;
  
  var exports = {};
  var _o_basic_types = {"String" : 0, "Number" : 0, "Array" : 0, "Function" : 0};
  
  function is_obj_lit(obj) {
    if (obj.constructor.name in _o_basic_types)
      return false;
      
    if (obj.constructor.name == "Object")
      return true;
    if (obj.prototype == undefined)
      return true;
    
    return false;
  }
  
  function set_getkey(obj) {
    if (typeof obj == "number" || typeof obj == "boolean")
      return ""+obj;
    else if (typeof obj == "string")
      return obj;
    else
      return obj.__keystr__();
  }
  
  var set = exports.set = Class([
    function constructor(input) {
      this.items = [];
      this.keys = {};
      this.freelist = [];
      
      this.length = 0;
      
      if (input != undefined && input instanceof Array) {
        for (var i=0; i<input.length; i++) {
          this.add(input[i]);
        }
      } else if (input != undefined && input.forEach != undefined) {
        input.forEach(function(item) {
          this.add(input[i]);
        }, this);
      }
  },
  function add(obj) {
      var key = set_getkey(obj);
      if (key in this.keys) return;
      
      if (this.freelist.length > 0) {
          var i = this.freelist.pop();
          this.keys[key] = i;
          this.items[i] = obj;
      } else {
        this.keys[key] = this.items.length;
        this.items.push(obj);
      }
      
      this.length++;
    },
    function remove(obj, raise_error) {
      var key = set_getkey(obj);
      
      if (!(keystr in this.keys)) {
        if (raise_error)
          throw new Error("Object not in set");
        else
          console.trace("Object not in set", obj);
        return;
      }
      
      var i = this.keys[keystr];
      
      this.freelist.push(i);
      this.items[i] = undefined;
      
      delete this.keys[keystr];
      this.length--;
    },
    
    function has(obj) {
      return set_getkey(obj) in this.keys;
    },
    
    function forEach(func, thisvar) {
      for (var i=0; i<this.items.length; i++) {
        var item = this.items[i];
        
        if (item == undefined) continue;
        
        if (thisvar != undefined)
          func.call(thisvar, item);
        else
          func(item);
      }
    }
  ]);
  
  var IDGen = exports.IDGen = Class([
    function constructor() {
      this.cur_id = 1;
    },
    
    function gen_id() {
      return this.cur_id++;
    },
    
    Class.static_method(function fromSTRUCT(reader) {
      var ret = new IDGen();
      reader(ret);
      return ret;
    })
  ]);
  
  IDGen.STRUCT = [
    "struct_util.IDGen {",
    "  cur_id : int;",
    "}"
  ].join("\n");
  
  return exports;
});

define('struct_binpack',[
  "struct_typesystem", "struct_util"
], function(struct_typesystem, struct_util) {
  var exports = {};
  
  window.STRUCT_ENDIAN = true; //little endian
  
  var Class = struct_typesystem.Class;
  
  var temp_dataview = new DataView(new ArrayBuffer(16));
  var uint8_view = new Uint8Array(temp_dataview.buffer);

  var unpack_context = exports.unpack_context = Class([
    function constructor() {
      this.i = 0;
    }
  ]);
  
  var pack_byte = exports.pack_byte = function(array, val) {
    array.push(val);
  };
  
  var pack_bytes = exports.pack_bytes = function(array, bytes) {
    for (var i=0; i<bytes.length; i++) {
      array.push(bytes[i]);
    }
  };
  
  var pack_int = exports.pack_int = function(array, val) {
    temp_dataview.setInt32(0, val, STRUCT_ENDIAN);
    
    array.push(uint8_view[0]);
    array.push(uint8_view[1]);
    array.push(uint8_view[2]);
    array.push(uint8_view[3]);
  };
  
  exports.pack_float = function(array, val) {
    temp_dataview.setFloat32(0, val, STRUCT_ENDIAN);
    
    array.push(uint8_view[0]);
    array.push(uint8_view[1]);
    array.push(uint8_view[2]);
    array.push(uint8_view[3]);
  };
  
  exports.pack_double = function(array, val) {
    temp_dataview.setFloat64(0, val, STRUCT_ENDIAN);
    
    array.push(uint8_view[0]);
    array.push(uint8_view[1]);
    array.push(uint8_view[2]);
    array.push(uint8_view[3]);
    array.push(uint8_view[4]);
    array.push(uint8_view[5]);
    array.push(uint8_view[6]);
    array.push(uint8_view[7]);
  };
  
  exports.pack_short = function(array, val) {
    temp_dataview.setInt16(0, val, STRUCT_ENDIAN);
    
    array.push(uint8_view[0]);
    array.push(uint8_view[1]);
  };

  var encode_utf8 = exports.encode_utf8 = function encode_utf8(arr, str) {
    for (var i=0; i<str.length; i++) {
      var c = str.charCodeAt(i);
      
      while (c != 0) {
        var uc = c & 127;
        c = c>>7;
        
        if (c != 0)
          uc |= 128;
        
        arr.push(uc);
      }
    }
  };

  var decode_utf8 = exports.decode_utf8 = function decode_utf8(arr) {
    var str = "";
    var i = 0;
    
    while (i < arr.length) {
      var c = arr[i];
      var sum = c & 127;
      var j = 0;
      var lasti = i;
      
      while (i < arr.length && (c & 128)) {
        j += 7;
        i++;
        c = arr[i];
        
        c = (c&127)<<j;
        sum |= c;
      }
      
      if (sum == 0) break;
      
      str += String.fromCharCode(sum);
      i++;
    }
    
    return str;
  };

  var test_utf8 = exports.test_utf8 = function test_utf8()
  {
    var s = "a" + String.fromCharCode(8800) + "b";
    var arr = [];
    
    encode_utf8(arr, s);
    var s2 = decode_utf8(arr);
    
    if (s != s2) {
      throw new Error("UTF-8 encoding/decoding test failed");
    }
    
    return true;
  };

  function truncate_utf8(arr, maxlen)
  {
    var len = Math.min(arr.length, maxlen);
    
    var last_codepoint = 0;
    var last2 = 0;
    
    var incode = false;
    var i = 0;
    var code = 0;
    while (i < len) {
      incode = arr[i] & 128;
      
      if (!incode) {
        last2 = last_codepoint+1;
        last_codepoint = i+1;
      }
      
      i++;
    }
    
    if (last_codepoint < maxlen)
      arr.length = last_codepoint;
    else
      arr.length = last2;
      
    return arr;
  }
  
  var _static_sbuf_ss = new Array(2048);
  var pack_static_string = exports.pack_static_string = function pack_static_string(data, str, length)
  {
    if (length == undefined)
     throw new Error("'length' paremter is not optional for pack_static_string()");
    
    var arr = length < 2048 ? _static_sbuf_ss : new Array();
    arr.length = 0;
    
    encode_utf8(arr, str);
    truncate_utf8(arr, length);
    
    for (var i=0; i<length; i++) {
      if (i >= arr.length) {
        data.push(0);
      } else {
        data.push(arr[i]);
      }
    }
  };

  var _static_sbuf = new Array(32);
  
  /*strings are packed as 32-bit unicode codepoints*/
  var pack_string = exports.pack_string = function pack_string(data, str)
  {
    _static_sbuf.length = 0;
    encode_utf8(_static_sbuf, str);
    
    pack_int(data, _static_sbuf.length);
    
    for (var i=0; i<_static_sbuf.length; i++) {
      data.push(_static_sbuf[i]);
    }
  };
  
  var unpack_bytes = exports.unpack_bytes = function unpack_bytes(dview, uctx, len)
  {
    var ret = new DataView(dview.buffer.slice(uctx.i, uctx.i+len));
    uctx.i += len;
    
    return ret;
  };
  
  var unpack_byte = exports.unpack_byte = function(dview, uctx) {
    return dview.getUint8(uctx.i++);
  };
  
  var unpack_int = exports.unpack_int = function(dview, uctx) {
    uctx.i += 4;
    return dview.getInt32(uctx.i-4, STRUCT_ENDIAN);
  };
  
  exports.unpack_float = function(dview, uctx) {
    uctx.i += 4;
    return dview.getFloat32(uctx.i-4, STRUCT_ENDIAN);
  };
  
  exports.unpack_double = function(dview, uctx) {
    uctx.i += 8;
    return dview.getFloat64(uctx.i-8, STRUCT_ENDIAN);
  };
  
  exports.unpack_short = function(dview, uctx) {
    uctx.i += 2;
    return dview.getInt16(uctx.i-2, STRUCT_ENDIAN);
  };

  var _static_arr_us = new Array(32);
  exports.unpack_string = function(data, uctx) {
    var str = "";
    
    var slen = unpack_int(data, uctx);
    var arr = slen < 2048 ? _static_arr_us : new Array(slen);
    
    arr.length = slen;
    for (var i=0; i<slen; i++) {
      arr[i] = unpack_byte(data, uctx);
    }
    
    return decode_utf8(arr);
  };
  
  var _static_arr_uss = new Array(2048);
  exports.unpack_static_string = function unpack_static_string(data, uctx, length) {
    var str = "";
    
    if (length == undefined)
      throw new Error("'length' cannot be undefined in unpack_static_string()");
    
    var arr = length < 2048 ? _static_arr_uss : new Array(length);
    arr.length = 0;

    var done = false;
    for (var i=0; i<length; i++) {
      var c = unpack_byte(data, uctx);
      
      if (c == 0) {
        done = true;
      }
      
      if (!done && c != 0) {
        arr.push(c);
        //arr.length++;
      }
    }
    
    truncate_utf8(arr, length);
    return decode_utf8(arr);
  };

  return exports;
});

/*
The lexical scanner in this module was inspired by PyPLY

http://www.dabeaz.com/ply/ply.html
*/

define('struct_parseutil',[
  "struct_typesystem", "struct_util"
], function(struct_typesystem, struct_util) {
  "use strict";
  var t;
  
  var Class = struct_typesystem.Class;
  
  var exports = {};
  exports.token = Class([
    function constructor(type, val, lexpos, lineno, lexer, parser) {
      this.type = type;
      this.value = val;
      this.lexpos = lexpos;
      this.lineno = lineno;
      this.lexer = lexer;
      this.parser = parser;
    },
    function toString() {
      if (this.value!=undefined)
        return "token(type="+this.type+", value='"+this.value+"')";
      else 
        return "token(type="+this.type+")";
    }
  ]);
  
  exports.tokdef = Class([
    function constructor(name, regexpr, func) {
      this.name = name;
      this.re = regexpr;
      this.func = func;
    }
  ]);
  
  var PUTIL_ParseError = exports.PUTIL_ParseError = Class(Error, [
    function constructor(msg) {
      Error.call(this);
    }
  ]);
  
  exports.lexer = Class([
    function constructor(tokdef, errfunc) {
      this.tokdef = tokdef;
      this.tokens = new Array();
      this.lexpos = 0;
      this.lexdata = "";
      this.lineno = 0;
      this.errfunc = errfunc;
      this.tokints = {};
      for (var i=0; i<tokdef.length; i++) {
          this.tokints[tokdef[i].name] = i;
      }
      this.statestack = [["__main__", 0]];
      this.states = {"__main__": [tokdef, errfunc]};
      this.statedata = 0;
    },
    function add_state(name, tokdef, errfunc) {
      if (errfunc==undefined) {
          errfunc = function(lexer) {
            return true;
          };
      }
      this.states[name] = [tokdef, errfunc];
    },
    function tok_int(name) {
    },
    function push_state(state, statedata) {
      this.statestack.push([state, statedata]);
      state = this.states[state];
      this.statedata = statedata;
      this.tokdef = state[0];
      this.errfunc = state[1];
    },
    function pop_state() {
      var item=this.statestack[this.statestack.length-1];
      var state=this.states[item[0]];
      this.tokdef = state[0];
      this.errfunc = state[1];
      this.statedata = item[1];
    },
    function input(str) {
      while (this.statestack.length>1) {
        this.pop_state();
      }
      this.lexdata = str;
      this.lexpos = 0;
      this.lineno = 0;
      this.tokens = new Array();
      this.peeked_tokens = [];
    },
    function error() {
      if (this.errfunc != undefined && !this.errfunc(this))
        return;
        
      console.log("Syntax error near line "+this.lineno);

      var next=Math.min(this.lexpos+8, this.lexdata.length);
      console.log("  "+this.lexdata.slice(this.lexpos, next));

      throw new PUTIL_ParseError("Parse error");
    },
    function peek() {
      var tok=this.next(true);
      if (tok==undefined)
        return undefined;
      this.peeked_tokens.push(tok);
      return tok;
    },
    
    function peeknext() {
      if (this.peeked_tokens.length > 0) {
        return this.peeked_tokens[0];
      }
      
      return this.peek();
    },
    function at_end() {
      return this.lexpos>=this.lexdata.length&&this.peeked_tokens.length==0;
    },
    
    //ignore_peek is optional, false
    function next(ignore_peek) {
      if (!ignore_peek && this.peeked_tokens.length>0) {
          var tok=this.peeked_tokens[0];
          this.peeked_tokens.shift();
          return tok;
      }
      
      if (this.lexpos>=this.lexdata.length)
        return undefined;
        
      var ts=this.tokdef;
      var tlen=ts.length;
      var lexdata=this.lexdata.slice(this.lexpos, this.lexdata.length);
      var results=[];
      
      for (var i=0; i<tlen; i++) {
          var t=ts[i];
          if (t.re==undefined)
            continue;
          var res=t.re.exec(lexdata);
          if (res!=null&&res!=undefined&&res.index==0) {
              results.push([t, res]);
          }
      }
      
      var max_res=0;
      var theres=undefined;
      for (var i=0; i<results.length; i++) {
          var res=results[i];
          if (res[1][0].length>max_res) {
              theres = res;
              max_res = res[1][0].length;
          }
      }
      
      if (theres==undefined) {
          this.error();
          return ;
      }
      
      var def=theres[0];
      var token=new exports.token(def.name, theres[1][0], this.lexpos, this.lineno, this, undefined);
      this.lexpos+=token.value.length;
      
      if (def.func) {
          token = def.func(token);
          if (token==undefined) {
              return this.next();
          }
      }
      
      return token;
    }
  ]);
  
  exports.parser = Class([
    function constructor(lexer, errfunc) {
      this.lexer = lexer;
      this.errfunc = errfunc;
      this.start = undefined;
    },
    function parse(data, err_on_unconsumed) {
      if (err_on_unconsumed==undefined)
        err_on_unconsumed = true;
        
      if (data!=undefined)
        this.lexer.input(data);
        
      var ret=this.start(this);
      
      if (err_on_unconsumed && !this.lexer.at_end() && this.lexer.next() != undefined) {
          this.error(undefined, "parser did not consume entire input");
      }
      return ret;
    },
      
    function input(data) {
      this.lexer.input(data);
    },
    
    function error(token, msg) {
      if (msg==undefined)
        msg = "";
      if (token==undefined)
        var estr="Parse error at end of input: "+msg;
      else 
        estr = "Parse error at line "+(token.lineno+1)+": "+msg;
      var buf="1| ";
      var ld=this.lexer.lexdata;
      var l=1;
      for (var i=0; i<ld.length; i++) {
          var c=ld[i];
          if (c=='\n') {
              l++;
              buf+="\n"+l+"| ";
          }
          else {
            buf+=c;
          }
      }
      console.log("------------------");
      console.log(buf);
      console.log("==================");
      console.log(estr);
      if (this.errfunc&&!this.errfunc(token)) {
          return ;
      }
      throw new PUTIL_ParseError(estr);
    },
    function peek() {
      var tok=this.lexer.peek();
      if (tok!=undefined)
        tok.parser = this;
      return tok;
    },
    function peeknext() {
      var tok=this.lexer.peeknext();
      if (tok!=undefined)
        tok.parser = this;
      return tok;
    },
    function next() {
      var tok=this.lexer.next();
      if (tok!=undefined)
        tok.parser = this;
      return tok;
    },
    function optional(type) {
      var tok=this.peek();
      if (tok==undefined)
        return false;
      if (tok.type==type) {
          this.next();
          return true;
      }
      return false;
    },
    function at_end() {
      return this.lexer.at_end();
    },
    function expect(type, msg) {
      var tok=this.next();
      if (msg==undefined)
        msg = type;
      if (tok==undefined||tok.type!=type) {
          this.error(tok, "Expected "+msg);
      }
      return tok.value;
    }
  ]);
  function test_parser() {
    var basic_types=new set(["int", "float", "double", "vec2", "vec3", "vec4", "mat4", "string"]);
    var reserved_tokens=new set(["int", "float", "double", "vec2", "vec3", "vec4", "mat4", "string", "static_string", "array"]);
    function tk(name, re, func) {
      return new exports.tokdef(name, re, func);
    }
    var tokens=[tk("ID", /[a-zA-Z]+[a-zA-Z0-9_]*/, function(t) {
      if (reserved_tokens.has(t.value)) {
          t.type = t.value.toUpperCase();
      }
      return t;
    }), tk("OPEN", /\{/), tk("CLOSE", /}/), tk("COLON", /:/), tk("JSCRIPT", /\|/, function(t) {
      var js="";
      var lexer=t.lexer;
      while (lexer.lexpos<lexer.lexdata.length) {
        var c=lexer.lexdata[lexer.lexpos];
        if (c=="\n")
          break;
        js+=c;
        lexer.lexpos++;
      }
      if (js.endsWith(";")) {
          js = js.slice(0, js.length-1);
          lexer.lexpos--;
      }
      t.value = js;
      return t;
    }), tk("LPARAM", /\(/), tk("RPARAM", /\)/), tk("COMMA", /,/), tk("NUM", /[0-9]/), tk("SEMI", /;/), tk("NEWLINE", /\n/, function(t) {
      t.lexer.lineno+=1;
    }), tk("SPACE", / |\t/, function(t) {
    })];
    var __iter_rt=__get_iter(reserved_tokens);
    var rt;
    while (1) {
      var __ival_rt=__iter_rt.next();
      if (__ival_rt.done) {
          break;
      }
      rt = __ival_rt.value;
      tokens.push(tk(rt.toUpperCase()));
    }
    var a="\n  Loop {\n    eid : int;\n    flag : int;\n    index : int;\n    type : int;\n\n    co : vec3;\n    no : vec3;\n    loop : int | eid(loop);\n    edges : array(e, int) | e.eid;\n\n    loops : array(Loop);\n  }\n  ";
    function errfunc(lexer) {
      return true;
    }
    var lex=new exports.lexer(tokens, errfunc);
    console.log("Testing lexical scanner...");
    lex.input(a);
    var token;
    while (token = lex.next()) {
      console.log(token.toString());
    }
    var parser=new exports.parser(lex);
    parser.input(a);
    function p_Array(p) {
      p.expect("ARRAY");
      p.expect("LPARAM");
      var arraytype=p_Type(p);
      var itername="";
      if (p.optional("COMMA")) {
          itername = arraytype;
          arraytype = p_Type(p);
      }
      p.expect("RPARAM");
      return {type: "array", data: {type: arraytype, iname: itername}}
    }
    function p_Type(p) {
      var tok=p.peek();
      if (tok.type=="ID") {
          p.next();
          return {type: "struct", data: "\""+tok.value+"\""}
      }
      else 
        if (basic_types.has(tok.type.toLowerCase())) {
          p.next();
          return {type: tok.type.toLowerCase()}
      }
      else 
        if (tok.type=="ARRAY") {
          return p_Array(p);
      }
      else {
        p.error(tok, "invalid type "+tok.type);
      }
    }
    function p_Field(p) {
      var field={};
      console.log("-----", p.peek().type);
      field.name = p.expect("ID", "struct field name");
      p.expect("COLON");
      field.type = p_Type(p);
      field.set = undefined;
      field.get = undefined;
      var tok=p.peek();
      if (tok.type=="JSCRIPT") {
          field.get = tok.value;
          p.next();
      }
      tok = p.peek();
      if (tok.type=="JSCRIPT") {
          field.set = tok.value;
          p.next();
      }
      p.expect("SEMI");
      return field;
    }
    function p_Struct(p) {
      var st={};
      st.name = p.expect("ID", "struct name");
      st.fields = [];
      p.expect("OPEN");
      while (1) {
        if (p.at_end()) {
            p.error(undefined);
        }
        else 
          if (p.optional("CLOSE")) {
            break;
        }
        else {
          st.fields.push(p_Field(p));
        }
      }
      return st;
    }
    var ret=p_Struct(parser);
    console.log(JSON.stringify(ret));
  }
  
  return exports;
});
define('struct_parser',[
  "struct_parseutil", "struct_util"
], function(struct_parseutil, struct_util) {
  "use strict";
  
  var exports = {};
  
  //the discontinuous id's are to make sure
  //the version I originally wrote (which had a few application-specific types)
  //and this one do not become totally incompatible.
  var StructEnum = exports.StructEnum = {
    T_INT    : 0,
    T_FLOAT  : 1,
    T_DOUBLE : 2,
    T_STRING : 7,
    T_STATIC_STRING : 8,
    T_STRUCT : 9, 
    T_TSTRUCT : 10,
    T_ARRAY   : 11,
    T_ITER    : 12,
    T_SHORT   : 13,
    T_BYTE    : 14,
    T_BOOL    : 15
  };
  
  var StructTypes = exports.StructTypes = {
    "int": StructEnum.T_INT, 
    "float": StructEnum.T_FLOAT, 
    "double": StructEnum.T_DOUBLE, 
    "string": StructEnum.T_STRING,
    "static_string": StructEnum.T_STATIC_STRING, 
    "struct": StructEnum.T_STRUCT, 
    "abstract": StructEnum.T_TSTRUCT, 
    "array": StructEnum.T_ARRAY, 
    "iter": StructEnum.T_ITER,
    "short": StructEnum.T_SHORT,
    "byte": StructEnum.T_BYTE,
    "bool": StructEnum.T_BOOL
  };
  
  var StructTypeMap = exports.StructTypeMap = {};
  
  for (var k in StructTypes) {
    StructTypeMap[StructTypes[k]] = k;
  }

  function gen_tabstr(t) {
    var s="";
    for (var i=0; i<t; i++) {
        s+="  ";
    }
    return s;
  }
  
  function StructParser() {
    var basic_types=new struct_util.set([
      "int", "float", "double", "string", "short", "byte", "bool"
    ]);
    
    var reserved_tokens=new struct_util.set([
      "int", "float", "double", "string", "static_string", "array", 
      "iter", "abstract", "short", "byte", "bool"
    ]);
  
    function tk(name, re, func) {
      return new struct_parseutil.tokdef(name, re, func);
    }
    
    var tokens=[tk("ID", /[a-zA-Z_]+[a-zA-Z0-9_\.]*/, function(t) {
      if (reserved_tokens.has(t.value)) {
          t.type = t.value.toUpperCase();
      }
      return t;
    }), tk("OPEN", /\{/), tk("EQUALS", /=/), tk("CLOSE", /}/), tk("COLON", /:/), tk("SOPEN", /\[/), tk("SCLOSE", /\]/), tk("JSCRIPT", /\|/, function(t) {
      var js="";
      var lexer=t.lexer;
      while (lexer.lexpos<lexer.lexdata.length) {
        var c=lexer.lexdata[lexer.lexpos];
        if (c=="\n")
          break;
        js+=c;
        lexer.lexpos++;
      }
      if (js.endsWith(";")) {
          js = js.slice(0, js.length-1);
          lexer.lexpos--;
      }
      t.value = js;
      return t;
    }), tk("LPARAM", /\(/), tk("RPARAM", /\)/), tk("COMMA", /,/), tk("NUM", /[0-9]+/), tk("SEMI", /;/), tk("NEWLINE", /\n/, function(t) {
      t.lexer.lineno+=1;
    }), tk("SPACE", / |\t/, function(t) {
    })
    ];
    
    reserved_tokens.forEach(function(rt) {
      tokens.push(tk(rt.toUpperCase()));
    });
    
    function errfunc(lexer) {
      return true;
    }
    
    var lex=new struct_parseutil.lexer(tokens, errfunc);
    var parser=new struct_parseutil.parser(lex);
    
    function p_Static_String(p) {
      p.expect("STATIC_STRING");
      p.expect("SOPEN");
      var num=p.expect("NUM");
      p.expect("SCLOSE");
      return {type: StructEnum.T_STATIC_STRING, data: {maxlength: num}}
    }
    
    function p_DataRef(p) {
      p.expect("DATAREF");
      p.expect("LPARAM");
      var tname=p.expect("ID");
      p.expect("RPARAM");
      return {type: StructEnum.T_DATAREF, data: tname}
    }
    
    function p_Array(p) {
      p.expect("ARRAY");
      p.expect("LPARAM");
      var arraytype=p_Type(p);
      
      var itername="";
      if (p.optional("COMMA")) {
          itername = arraytype.data.replace(/"/g, "");
          arraytype = p_Type(p);
      }
      
      p.expect("RPARAM");
      return {type: StructEnum.T_ARRAY, data: {type: arraytype, iname: itername}}
    }
    
    function p_Iter(p) {
      p.expect("ITER");
      p.expect("LPARAM");
      var arraytype=p_Type(p);
      var itername="";
      
      if (p.optional("COMMA")) {
          itername = arraytype.data.replace(/"/g, "");
          arraytype = p_Type(p);
      }
      
      p.expect("RPARAM");
      return {type: StructEnum.T_ITER, data: {type: arraytype, iname: itername}}
    }
    
    function p_Abstract(p) {
      p.expect("ABSTRACT");
      p.expect("LPARAM");
      var type=p.expect("ID");
      p.expect("RPARAM");
      return {type: StructEnum.T_TSTRUCT, data: type}
    }
    
    function p_Type(p) {
      var tok=p.peek();
      
      if (tok.type=="ID") {
          p.next();
          return {type: StructEnum.T_STRUCT, data: tok.value}
      } else if (basic_types.has(tok.type.toLowerCase())) {
          p.next();
          return {type: StructTypes[tok.type.toLowerCase()]}
      } else if (tok.type=="ARRAY") {
          return p_Array(p);
      } else if (tok.type=="ITER") {
          return p_Iter(p);
      } else if (tok.type=="STATIC_STRING") {
          return p_Static_String(p);
      } else if (tok.type=="ABSTRACT") {
          return p_Abstract(p);
      } else if (tok.type=="DATAREF") {
          return p_DataRef(p);
      } else {
        p.error(tok, "invalid type "+tok.type);
      }
    }
    
    function p_ID_or_num(p) {
      let t = p.peeknext();

      if (t.type == "NUM") {
        p.next();
        return t.value;
      } else {
        return p.expect("ID", "struct field name");
      }
    }
    
    function p_Field(p) {
      var field={};
      
      field.name = p_ID_or_num(p);
      p.expect("COLON");
      
      field.type = p_Type(p);
      field.set = undefined;
      field.get = undefined;
      
      var tok=p.peek();
      if (tok.type=="JSCRIPT") {
          field.get = tok.value;
          p.next();
      }
      
      tok = p.peek();
      if (tok.type=="JSCRIPT") {
          field.set = tok.value;
          p.next();
      }
      
      p.expect("SEMI");
      return field;
    }
    
    function p_Struct(p) {
      var st={};
      
      st.name = p.expect("ID", "struct name");
      
      st.fields = [];
      st.id = -1;
      var tok=p.peek();
      var id=-1;
      if (tok.type=="ID"&&tok.value=="id") {
          p.next();
          p.expect("EQUALS");
          st.id = p.expect("NUM");
      }
      
      p.expect("OPEN");
      while (1) {
        if (p.at_end()) {
            p.error(undefined);
        }
        else 
          if (p.optional("CLOSE")) {
            break;
        }
        else {
          st.fields.push(p_Field(p));
        }
      }
      return st;
    }
    parser.start = p_Struct;
    return parser;
  }
  
  exports.struct_parse = StructParser();
   
  return exports;
});

define('struct_intern',[
  "struct_util", "struct_binpack", "struct_parseutil", "struct_typesystem", "struct_parser"
], function(struct_util, struct_binpack, struct_parseutil, struct_typesystem, struct_parser) {
  "use strict";

  var exports = {};
  
  /*
  
  class SomeClass {
    static newSTRUCT() {
      //returns a new, empty instance of SomeClass
    }
    
    loadSTRUCT(reader) {
      reader(this); //reads data into this instance
    }
    
    //the old api, that both creates and reads
    static fromSTRUCT(reader) {
      let ret = new SomeClass();
      reader(ret);
      return ret;
    }
  }
  SomeClass.STRUCT = `
  SomeClass {
  }
  `
  nstructjs.manager.add_class(SomeClass);
  
  */
  var StructTypeMap = struct_parser.StructTypeMap;
  var StructTypes = struct_parser.StructTypes;
  var Class = struct_typesystem.Class;
  
  var struct_parse = struct_parser.struct_parse;
  var StructEnum = struct_parser.StructEnum;
  
  var _static_envcode_null="";
  var debug_struct=0;
  var packdebug_tablevel=0;
  
  function gen_tabstr(tot) {
    var ret = "";
    
    for (var i=0; i<tot; i++) {
      ret += " ";
    }
    
    return ret;
  }
  
  if (debug_struct) {
      var packer_debug=function(msg) {
        if (msg!=undefined) {
            var t=gen_tabstr(packdebug_tablevel);
            console.log(t+msg);
        } else {
          console.log("Warning: undefined msg");
        }
      };
      var packer_debug_start=function(funcname) {
        packer_debug("Start "+funcname);
        packdebug_tablevel++;
      };
      
      var packer_debug_end=function(funcname) {
        packdebug_tablevel--;
        packer_debug("Leave "+funcname);
      };
  }
  else {
    var packer_debug=function() {};
    var packer_debug_start=function() {};
    var packer_debug_end=function() {};
  }
  
  var _ws_env=[[undefined, undefined]];
  
  var pack_callbacks=[
  function pack_int(data, val) {
    packer_debug("int "+val);
    
    struct_binpack.pack_int(data, val);
  }, function pack_float(data, val) {
    packer_debug("float "+val);
    
    struct_binpack.pack_float(data, val);
  }, function pack_double(data, val) {
    packer_debug("double "+val);
    
    struct_binpack.pack_double(data, val);
  }, 0, 0, 0, 0,
  function pack_string(data, val) {
    if (val==undefined)
      val = "";
    packer_debug("string: "+val);
    packer_debug("int "+val.length);
    
    struct_binpack.pack_string(data, val);
  }, function pack_static_string(data, val, obj, thestruct, field, type) {
    if (val==undefined)
      val = "";
    packer_debug("static_string: '"+val+"' length="+type.data.maxlength);
    
    struct_binpack.pack_static_string(data, val, type.data.maxlength);
  }, function pack_struct(data, val, obj, thestruct, field, type) {
    packer_debug_start("struct "+type.data);
    
    thestruct.write_struct(data, val, thestruct.get_struct(type.data));
    
    packer_debug_end("struct");
  }, function pack_tstruct(data, val, obj, thestruct, field, type) {
    var cls=thestruct.get_struct_cls(type.data);
    var stt=thestruct.get_struct(type.data);
    
    //make sure inheritance is correct
    if (val.constructor.structName!=type.data && (val instanceof cls)) {
        //if (DEBUG.Struct) {
        //    console.log(val.constructor.structName+" inherits from "+cls.structName);
        //}
        stt = thestruct.get_struct(val.constructor.structName);
    } else if (val.constructor.structName==type.data) {
        stt = thestruct.get_struct(type.data);
    } else {
      console.trace();
      throw new Error("Bad struct "+val.constructor.structName+" passed to write_struct");
    }
    
    if (stt.id==0) {
    }
    
    packer_debug_start("tstruct '"+stt.name+"'");
    packer_debug("int "+stt.id);
    
    struct_binpack.pack_int(data, stt.id);
    thestruct.write_struct(data, val, stt);
    
    packer_debug_end("tstruct");
  }, function pack_array(data, val, obj, thestruct, field, type) {
    packer_debug_start("array");
    
    if (val==undefined) {
        console.trace();
        console.log("Undefined array fed to struct struct packer!");
        console.log("Field: ", field);
        console.log("Type: ", type);
        console.log("");
        packer_debug("int 0");
        struct_binpack.pack_int(data, 0);
        return ;
    }
    
    packer_debug("int "+val.length);
    struct_binpack.pack_int(data, val.length);
    
    var d=type.data;
    
    var itername = d.iname;
    var type2 = d.type;
    
    var env=_ws_env;
    for (var i=0; i<val.length; i++) {
        var val2=val[i];
        if (itername!=""&&itername!=undefined&&field.get) {
            env[0][0] = itername;
            env[0][1] = val2;
            val2 = thestruct._env_call(field.get, obj, env);
        }
        var f2={type: type2, get: undefined, set: undefined};
        do_pack(data, val2, obj, thestruct, f2, type2);
    }
    packer_debug_end("array");
  }, function pack_iter(data, val, obj, thestruct, field, type) {
    //this was originally implemented to use ES6 iterators.
    
    packer_debug_start("iter");
    
    if (val==undefined || val.forEach == undefined) {
        console.trace();
        console.log("Undefined iterable list fed to struct struct packer!", val);
        console.log("Field: ", field);
        console.log("Type: ", type);
        console.log("");
        packer_debug("int 0");
        struct_binpack.pack_int(data, 0);
        return ;
    }
    
    var len  = 0.0;
    val.forEach(function(val2) {
      len++;
    }, this);
    
    packer_debug("int "+len);
    struct_binpack.pack_int(data, len);
    
    var d=type.data, itername=d.iname, type2=d.type;
    var env=_ws_env;
    
    var i = 0;
    val.forEach(function(val2) {
      if (i >= len) {
        console.trace("Warning: iterator returned different length of list!", val, i);
        return;
      }
      
      if (itername!=""&&itername!=undefined&&field.get) {
          env[0][0] = itername;
          env[0][1] = val2;
          val2 = thestruct._env_call(field.get, obj, env);
      }
      
      var f2={type: type2, get: undefined, set: undefined};
      do_pack(data, val2, obj, thestruct, f2, type2);
      
      i++;
    }, this);
    
    packer_debug_end("iter");
  }, function pack_short(data, val) {
    packer_debug("short "+val);
    
    struct_binpack.pack_short(data, Math.floor(val));
  }, function pack_byte(data, val) {
    packer_debug("byte "+val);
    
    struct_binpack.pack_byte(data, Math.floor(val));
  }, function pack_bool(data, val) {
    packer_debug("bool "+val);
    
    struct_binpack.pack_byte(data, !!val);
  }];
  
  function do_pack(data, val, obj, thestruct, field, type) {
    pack_callbacks[field.type.type](data, val, obj, thestruct, field, type);
  
  }
  
  function define_empty_class(name) {
    var cls = function() {
    };
    
    cls.prototype = Object.create(Object.prototype);
    cls.constructor = cls.prototype.constructor = cls;
    
    cls.STRUCT = name+" {\n  }\n";
    cls.structName = name;
    
    cls.prototype.loadSTRUCT = function (reader) {
      reader(this);
    };
    
    cls.newSTRUCT = function() {
      return new this();
    };
    
    return cls;
  }
      
  var STRUCT=exports.STRUCT = Class([
    function constructor() {
      this.idgen = new struct_util.IDGen();

      this.structs = {};
      this.struct_cls = {};
      this.struct_ids = {};

      this.compiled_code = {};
      this.null_natives = {};
    
      function define_null_native(name, cls) {
        var obj = define_empty_class(name);
        
        var stt=struct_parse.parse(obj.STRUCT);
        
        stt.id = this.idgen.gen_id();
        
        this.structs[name] = stt;
        this.struct_cls[name] = cls;
        this.struct_ids[stt.id] = stt;
        
        this.null_natives[name] = 1;
      }
      
      define_null_native.call(this, "Object", Object);
    }, 
    
    function forEach(func, thisvar) {
      for (var k in this.structs) {
        var stt = this.structs[k];
        
        if (thisvar != undefined)
          func.call(thisvar, stt);
        else
          func(stt);
      }
    },
    
    //defined_classes is an array of class constructors
    //with STRUCT scripts, *OR* another STRUCT instance
    //
    //defaults to structjs.manager
    function parse_structs(buf, defined_classes) {
      if (defined_classes === undefined) {
        defined_classes = exports.manager;
      }
      
      if (defined_classes instanceof STRUCT) {
        var struct2 = defined_classes;
        defined_classes = [];
        
        for (var k in struct2.struct_cls) {
          defined_classes.push(struct2.struct_cls[k]);
        }
      }
      
      if (defined_classes == undefined) {
        defined_classes = [];
        for (var k in exports.manager.struct_cls) {
          defined_classes.push(exports.manager.struct_cls[k]);
        }
      }
      
      var clsmap={};
      
      for (var i=0; i<defined_classes.length; i++) {
        var cls = defined_classes[i];
        
        if (cls.structName == undefined && cls.STRUCT != undefined) {
          var stt=struct_parse.parse(cls.STRUCT.trim());
          cls.structName = stt.name;
        } else if (cls.structName == undefined && cls.name != "Object") {
          console.log("Warning, bad class in registered class list", cls.name, cls);
          continue;
        }
        
        clsmap[cls.structName] = defined_classes[i];
      }
      
      struct_parse.input(buf);
      
      while (!struct_parse.at_end()) {
        var stt=struct_parse.parse(undefined, false);
        
        if (!(stt.name in clsmap)) {
            if (!(stt.name in this.null_natives))
              console.log("WARNING: struct "+stt.name+" is missing from class list.");

            var dummy = define_empty_class(stt.name);
            
            dummy.STRUCT = STRUCT.fmt_struct(stt);
            dummy.structName = stt.name;
            
            dummy.prototype.structName = dummy.name;
            
            this.struct_cls[dummy.structName] = dummy;
            this.structs[dummy.structName] = stt;
            
            if (stt.id!=-1)
              this.struct_ids[stt.id] = stt;
        } else {
          this.struct_cls[stt.name] = clsmap[stt.name];
          this.structs[stt.name] = stt;
          
          if (stt.id!=-1)
            this.struct_ids[stt.id] = stt;
        }
        
        var tok=struct_parse.peek();
        while (tok!=undefined&&(tok.value=="\n" || tok.value=="\r" || tok.value=="\t" || tok.value==" ")) {
          tok = struct_parse.peek();
        }
      }
    },

    function register(cls, structName) {
      return this.add_class(cls, structName);
    },
    
    function add_class(cls, structName) {
      if (!cls.STRUCT) {
        throw new Error("class " + cls.name + " has no STRUCT script");
      }
      
      var stt=struct_parse.parse(cls.STRUCT);
      
      cls.structName = stt.name;
      
      //create default newSTRUCT
      if (cls.newSTRUCT === undefined) {
        cls.newSTRUCT = function() {
          return new this();
        };
      }
      
      if (structName !== undefined) {
        stt.name = cls.structName = structName;
      } else if (cls.structName === undefined) {
        cls.structName = stt.name;
      } else if (cls.structName !== undefined) {
        stt.name = cls.structName;
      } else {
        throw new Error("Missing structName parameter");
      }
      
      if (stt.id==-1)
        stt.id = this.idgen.gen_id();
        
      this.structs[cls.structName] = stt;
      this.struct_cls[cls.structName] = cls;
      this.struct_ids[stt.id] = stt;
    },

    function get_struct_id(id) {
      return this.struct_ids[id];
    },

    function get_struct(name) {
      if (!(name in this.structs)) {
          console.trace();
          throw new Error("Unknown struct "+name);
      }
      return this.structs[name];
    },

    function get_struct_cls(name) {
      if (!(name in this.struct_cls)) {
          console.trace();
          throw new Error("Unknown struct "+name);
      }
      return this.struct_cls[name];
    },

    Class.static_method(function inherit(child, parent, structName=child.name) {
      if (!parent.STRUCT) {
        return structName+"{\n";
      }
      
      var stt=struct_parse.parse(parent.STRUCT);
      var code=structName+"{\n";
      code+=STRUCT.fmt_struct(stt, true);
      return code;
    }),
    
    /** invoke loadSTRUCT methods on parent objects.  note that 
      reader() is only called once.  it is called however.*/
    Class.static_method(function Super(obj, reader) {
      reader(obj);
      
      function reader2(obj) {
      }
      
      let cls = obj.constructor;
      let bad = cls === undefined || cls.prototype === undefined || cls.prototype.__proto__ === undefined;
      
      if (bad) {
        return;
      }
      
      let parent = cls.prototype.__proto__.constructor;
      bad = bad || parent === undefined;
      
      if (!bad && parent.prototype.loadSTRUCT && parent.prototype.loadSTRUCT !== obj.loadSTRUCT) { //parent.prototype.hasOwnProperty("loadSTRUCT")) {
        parent.prototype.loadSTRUCT.call(obj, reader2);
      }
    }),
    
    /** deprecated.  used with old fromSTRUCT interface. */
    Class.static_method(function chain_fromSTRUCT(cls, reader) {
      var proto=cls.prototype;
      var parent=cls.prototype.prototype.constructor;
      
      var obj=parent.fromSTRUCT(reader);
      var keys=Object.keys(proto);
      
      for (var i=0; i<keys.length; i++) {
          var k=keys[i];
          if (k=="__proto__")
            continue;
          obj[k] = proto[k];
      }
      
      if (proto.toString!=Object.prototype.toString)
        obj.toString = proto.toString;
        
      return obj;
    }),

    Class.static_method(function fmt_struct(stt, internal_only, no_helper_js) {
      if (internal_only==undefined)
        internal_only = false;
      if (no_helper_js==undefined)
        no_helper_js = false;
        
      var s="";
      if (!internal_only) {
          s+=stt.name;
          if (stt.id!=-1)
            s+=" id="+stt.id;
          s+=" {\n";
      }
      var tab="  ";
      function fmt_type(type) {
        if (type.type==StructEnum.T_ARRAY||type.type==StructEnum.T_ITER) {
            if (type.data.iname!=""&&type.data.iname!=undefined) {
                return "array("+type.data.iname+", "+fmt_type(type.data.type)+")";
            }
            else {
              return "array("+fmt_type(type.data.type)+")";
            }
        } else  if (type.type==StructEnum.T_STATIC_STRING) {
            return "static_string["+type.data.maxlength+"]";
        } else if (type.type==StructEnum.T_STRUCT) {
            return type.data;
        } else if (type.type==StructEnum.T_TSTRUCT) {
            return "abstract("+type.data+")";
        } else {
          return StructTypeMap[type.type];
        }
      }
      
      var fields=stt.fields;
      for (var i=0; i<fields.length; i++) {
          var f=fields[i];
          s += tab + f.name+" : "+fmt_type(f.type);
          if (!no_helper_js&&f.get!=undefined) {
              s += " | "+f.get.trim();
          }
          s+=";\n";
      }
      if (!internal_only)
        s+="}";
      return s;
    }),

    function _env_call(code, obj, env) {
      var envcode=_static_envcode_null;
      if (env!=undefined) {
          envcode = "";
          for (var i=0; i<env.length; i++) {
              envcode = "var "+env[i][0]+" = env["+i.toString()+"][1];\n"+envcode;
          }
      }
      var fullcode="";
      if (envcode!==_static_envcode_null)
        fullcode = envcode+code;
      else 
        fullcode = code;
      var func;
      if (!(fullcode in this.compiled_code)) {
          var code2="func = function(obj, env) { "+envcode+"return "+code+"}";
          try {
            eval(code2);
          }
          catch (err) {
              console.log(code2);
              console.log(" ");
              print_stack(err);
              throw err;
          }
          this.compiled_code[fullcode] = func;
      }
      else {
        func = this.compiled_code[fullcode];
      }
      try {
        return func(obj, env);
      }
      catch (err) {
          var code2="func = function(obj, env) { "+envcode+"return "+code+"}";
          console.log(code2);
          console.log(" ");
          print_stack(err);
          throw err;
      }
    },
    
    function write_struct(data, obj, stt) {
      function use_helper_js(field) {
        if (field.type.type==StructEnum.T_ARRAY||field.type.type==StructEnum.T_ITER) {
            return field.type.data.iname==undefined||field.type.data.iname=="";
        }
        return true;
      }
      
      var fields=stt.fields;
      var thestruct=this;
      for (var i=0; i<fields.length; i++) {
          var f=fields[i];
          var t1=f.type;
          var t2=t1.type;
          
          if (use_helper_js(f)) {
              var val;
              var type=t2;
              if (f.get!=undefined) {
                  val = thestruct._env_call(f.get, obj);
              }
              else {
                val = obj[f.name];
              }
              do_pack(data, val, obj, thestruct, f, t1);
          }
          else {
            var val=obj[f.name];
            do_pack(data, val, obj, thestruct, f, t1);
          }
      }
    },

   function write_object(data, obj) {
      var cls=obj.constructor.structName;
      var stt=this.get_struct(cls);
      
      this.write_struct(data, obj, stt);
    },

    function read_object(data, cls_or_struct_id, uctx) {
      var cls, stt;
      
      if (data instanceof Array) {
        data = new DataView(new Uint8Array(data).buffer);
      }
      
      if (typeof cls_or_struct_id == "number") {
        cls = this.struct_cls[this.struct_ids[cls_or_struct_id].name];
      } else {
        cls = cls_or_struct_id;
      }
      
      if (cls === undefined) {
        throw new Error("bad cls_or_struct_id " + cls_or_struct_id);
      }
      
      stt=this.structs[cls.structName];
      
      if (uctx==undefined) {
        uctx = new struct_binpack.unpack_context();
        packer_debug("\n\n=Begin reading=");
      }
      var thestruct=this;
      
      var unpack_funcs=[
        function t_int(type) { //int
          var ret=struct_binpack.unpack_int(data, uctx);
          
          packer_debug("-int "+ret);
          
          return ret;
        }, function t_float(type) {
          var ret=struct_binpack.unpack_float(data, uctx);
          
          packer_debug("-float "+ret);
          
          return ret;
        }, function t_double(type) {
          var ret=struct_binpack.unpack_double(data, uctx);
          
          packer_debug("-double "+ret);
          
          return ret;
        }, 0, 0, 0, 0, 
        function t_string(type) {
          packer_debug_start("string");
          
          var s=struct_binpack.unpack_string(data, uctx);
          
          packer_debug("data: '"+s+"'");
          packer_debug_end("string");
          return s;
        }, function t_static_string(type) {
          packer_debug_start("static_string");
          
          var s=struct_binpack.unpack_static_string(data, uctx, type.data.maxlength);
          
          packer_debug("data: '"+s+"'");
          packer_debug_end("static_string");
          
          return s;
        }, function t_struct(type) {
          packer_debug_start("struct "+type.data);
          
          var cls2=thestruct.get_struct_cls(type.data);
          var ret=thestruct.read_object(data, cls2, uctx);
          
          packer_debug_end("struct");
          return ret;
        }, function t_tstruct(type) {
          packer_debug_start("tstruct");
          
          var id=struct_binpack.unpack_int(data, uctx);
          
          packer_debug("-int "+id);
          if (!(id in thestruct.struct_ids)) {
              packer_debug("struct id: "+id);
              console.trace();
              console.log(id);
              console.log(thestruct.struct_ids);
              packer_debug_end("tstruct");
              throw new Error("Unknown struct type "+id+".");
          }
          
          var cls2=thestruct.get_struct_id(id);
          
          packer_debug("struct name: "+cls2.name);
          cls2 = thestruct.struct_cls[cls2.name];
          
          var ret=thestruct.read_object(data, cls2, uctx);
          
          packer_debug_end("tstruct");
          return ret;
        }, function t_array(type) {
          packer_debug_start("array");
          
          var len=struct_binpack.unpack_int(data, uctx);
          packer_debug("-int "+len);
          
          var arr=new Array(len);
          for (var i=0; i<len; i++) {
              arr[i] = unpack_field(type.data.type);
          }
          
          packer_debug_end("array");
          return arr;
        }, function t_iter(type) {
          packer_debug_start("iter");
          
          var len=struct_binpack.unpack_int(data, uctx);
          packer_debug("-int "+len);
          
          var arr=new Array(len);
          for (var i=0; i<len; i++) {
              arr[i] = unpack_field(type.data.type);
          }
          
          packer_debug_end("iter");
          return arr;
        }, function t_short(type) { //int
          var ret=struct_binpack.unpack_short(data, uctx);
          
          packer_debug("-short "+ret);
          
          return ret;
        }, function t_byte(type) {
          var ret=struct_binpack.unpack_byte(data, uctx);
          
          packer_debug("-byte "+ret);
          
          return ret;
        }, function t_bool(type) {
          var ret=struct_binpack.unpack_byte(data, uctx);
          
          packer_debug("-bool "+ret);
          
          return !!ret;
        }          
      ];
      
      function unpack_field(type) {
        return unpack_funcs[type.type](type);
      }
      
      let was_run = false;
      function load(obj) {
        if (was_run) {
          return;
        }
        
        was_run = true;
        
        var fields=stt.fields;
        var flen=fields.length;
        for (var i=0; i<flen; i++) {
            var f=fields[i];
            var val=unpack_field(f.type);
            obj[f.name] = val;
        }
      }
      
      if (cls.prototype.loadSTRUCT !== undefined) {
        let obj;
        
        if (cls.newSTRUCT !== undefined) {
          obj = cls.newSTRUCT();
        } else {
          obj = new cls();
        }
        
        obj.loadSTRUCT(load);
        return obj;
      } else if (cls.fromSTRUCT !== undefined) {
        console.warn("Warning: class " + cls.name + " is using deprecated fromSTRUCT interface; use newSTRUCT/loadSTRUCT instead");
        return cls.fromSTRUCT(load);
      } else { //default case, make new instance and then call load() on it
        let obj;
        if (cls.newSTRUCT !== undefined) {
          obj = cls.newSTRUCT();
        } else {
          obj = new cls();
        }
        
        load(obj);
        
        return obj;
      }
    }
  ]);
  
  //main struct script manager
  var manager = exports.manager = new STRUCT();
  
  //manager defaults to structjs.manager
  var write_scripts = exports.write_scripts = function write_scripts(manager) {
    if (manager === undefined)
      manager = exports.manager;
    
    var buf="";
    
    manager.forEach(function(stt) {
      buf+=STRUCT.fmt_struct(stt, false, true)+"\n";
    });
    
    var buf2=buf;
    buf = "";
    
    for (var i=0; i<buf2.length; i++) {
        var c=buf2[i];
        if (c=="\n") {
            buf+="\n";
            var i2=i;
            while (i<buf2.length&&(buf2[i]==" "||buf2[i]=="\t"||buf2[i]=="\n")) {
              i++;
            }
            if (i!=i2)
              i--;
        }
        else {
          buf+=c;
        }
    }
    
    return buf;
  };
  
  return exports;
});

if (typeof btoa == "undefined") {
  btoa = function btoa(str) {
    var buffer = new Buffer(""+str, 'binary');
    return buffer.toString('base64');
  };
  
  atob = function atob(str) {
    return new Buffer(str, 'base64').toString('binary');
  };
}

define('struct_filehelper',[
  "struct_intern", "struct_util", "struct_binpack", "struct_parseutil",
  "struct_typesystem", "struct_parser"
], function(structjs, struct_util, struct_binpack, struct_parseutil, 
            struct_typesystem, struct_parser) 
{
  'use strict';
  
  var exports = {};
  var Class = struct_typesystem.Class;
  
  /*
  file format:
    magic signature              : 4 bytes
    file version major           : 2 bytes
    file version minor           : 1 bytes
    file version micro           : 1 bytes
    length of struct scripts     : 4 bytes
    struct scripts for this file : ...
    
    block:
      magic signature for block              : 4 bytes
      length of data  (not including header) : 4 bytes
      id of struct type                      : 4 bytes
      
      data                                   : ...
  */
  
  var FileParams = exports.FileParams = class FileParams {
    constructor() {
      this.magic = "STRT";
      this.ext = ".bin";
      this.blocktypes = ["DATA"];
      
      this.version = {
        major : 0,
        minor : 0,
        micro : 1
      };
    }
  };
  
  //used to define blocks
  var Block = exports.Block = Class([
    function constructor(type_magic, data) {
      this.type = type_magic;
      this.data = data;
    }
  ]);
  
  var FileError = exports.FileError = class FileError {
  };
    
  var FileHelper = exports.FileHelper = Class([
    //params can be FileParams instance, or object literal
    //(it will convert to FileParams)
    function constructor(params) {
      if (params === undefined) {
        params = new FileParams();
      } else {
        var fp = new FileParams();
        
        for (var k in params) {
          fp[k] = params[k];
        }
        params = fp;
      }
      
      this.version = params.version;
      this.blocktypes = params.blocktypes;
      this.magic = params.magic;
      this.ext = params.ext;
      this.struct = undefined;
      this.unpack_ctx = undefined;
    },
    
    function read(dataview) {
      this.unpack_ctx = new struct_binpack.unpack_context();
      
      var magic = struct_binpack.unpack_static_string(dataview, this.unpack_ctx, 4);
      
      if (magic !== this.magic) {
        throw new FileError("corrupted file");
      }
      
      this.version = {};
      this.version.major = struct_binpack.unpack_short(dataview, this.unpack_ctx);
      this.version.minor = struct_binpack.unpack_byte(dataview, this.unpack_ctx);
      this.version.micro = struct_binpack.unpack_byte(dataview, this.unpack_ctx);
      
      var struct = this.struct = new structjs.STRUCT();
      
      var scripts = struct_binpack.unpack_string(dataview, this.unpack_ctx);
      this.struct.parse_structs(scripts, structjs.manager);
      
      var blocks = [];
      var dviewlen = dataview.buffer.byteLength;
      
      while (this.unpack_ctx.i < dviewlen) {
        //console.log("reading block. . .", this.unpack_ctx.i, dviewlen);
        
        var type = struct_binpack.unpack_static_string(dataview, this.unpack_ctx, 4);
        var datalen = struct_binpack.unpack_int(dataview, this.unpack_ctx);
        var bstruct = struct_binpack.unpack_int(dataview, this.unpack_ctx);
        var bdata;
        
        //console.log(type, datalen, bstruct);
        
        if (bstruct == -2) { //string data, e.g. JSON
          bdata = struct_binpack.unpack_static_string(dataview, this.unpack_ctx, datalen);
        } else {
          bdata = struct_binpack.unpack_bytes(dataview, this.unpack_ctx, datalen);
          bdata = struct.read_object(bdata, bstruct, new struct_binpack.unpack_context());
        }
        
        var block = new Block();
        block.type = type;
        block.data =  bdata;
        
        blocks.push(block);
      }
      
      this.blocks = blocks;
      return blocks;
    },
    
    function write(blocks) {
      this.struct = structjs.manager;
      this.blocks = blocks;
      
      var data = [];
      
      struct_binpack.pack_static_string(data, this.magic, 4);
      struct_binpack.pack_short(data, this.version.major);
      struct_binpack.pack_byte(data, this.version.minor & 255);
      struct_binpack.pack_byte(data, this.version.micro & 255);
      
      var scripts = structjs.write_scripts();
      struct_binpack.pack_string(data, scripts);
      
      var struct = this.struct;
      
      for (var block of blocks) {
        if (typeof block.data == "string") { //string data, e.g. JSON
          struct_binpack.pack_static_string(data, block.type, 4);
          struct_binpack.pack_int(data, block.data.length);
          struct_binpack.pack_int(data, -2); //flag as string data
          struct_binpack.pack_static_string(data, block.data, block.data.length);
          continue;
        } 
        
        var structName = block.data.constructor.structName;
        if (structName===undefined || !(structName in struct.structs)) {
          throw new Error("Non-STRUCTable object " + block.data);
        }
        
        var data2 = [];
        var stt = struct.structs[structName];
        
        struct.write_object(data2, block.data);
        
        struct_binpack.pack_static_string(data, block.type, 4);
        struct_binpack.pack_int(data, data2.length);
        struct_binpack.pack_int(data, stt.id);
        
        struct_binpack.pack_bytes(data, data2);
      }
      
      return new DataView(new Uint8Array(data).buffer);
    },
    
    function writeBase64(blocks) {
      var dataview = this.write(blocks);
      
      var str = "";
      var bytes = new Uint8Array(dataview.buffer);
      
      for (var i=0; i<bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
      }
      
      return btoa(str);
    },
    
    function makeBlock(type, data) {
      return new Block(type, data);
    },
    
    function readBase64(base64) {
      var data = atob(base64);
      var data2 = new Uint8Array(data.length);
      
      for (var i=0; i<data.length; i++) {
        data2[i] = data.charCodeAt(i);
      }
      
      return this.read(new DataView(data2.buffer));
    }
  ]);
  /*
    //get type data from structjs.manager
    var classes = {};
    structjs.manager.forEach(function(stt) {
      classes[stt] 
    }, this);
  */
  
  return exports;
});

define('structjs',[
  "struct_intern", "struct_filehelper", "struct_util", "struct_binpack", 
  "struct_parseutil", "struct_typesystem", "struct_parser"
], function(struct_intern, struct_filehelper, struct_util, struct_binpack, 
            struct_parseutil, struct_typesystem, struct_parser)
{
  "use strict";

  var exports = {};
  
  var StructTypeMap = struct_parser.StructTypeMap;
  var StructTypes = struct_parser.StructTypes;
  var Class = struct_typesystem.Class;
  
  //forward struct_intern's exports
  for (var k in struct_intern) {
    exports[k] = struct_intern[k];
  }
  
  exports.register = function register(cls, name) {
    return exports.manager.register(cls, name);
  };
  exports.inherit = function() {
    return exports.STRUCT.inherit(...arguments);
  };
  
  //export other modules
  exports.binpack = struct_binpack;
  exports.util = struct_util;
  exports.typesystem = struct_typesystem;
  exports.parseutil = struct_parseutil;
  exports.parser = struct_parser;
  exports.filehelper = struct_filehelper;
  
  return exports;
});


require(["structjs"]);
    //The modules for your project will be inlined above
    //this snippet. Ask almond to synchronously require the
    //module value for 'main' here and return it as the
    //value to use for the public API for the built file.
    return require('structjs');
}));

let nstructjs$1 = window.nstructjs;

const STRUCT = nstructjs$1.STRUCT;
const manager = nstructjs$1.manager;
const write_scripts = nstructjs$1.write_scripts;
const inherit = nstructjs$1.inherit;

function register(cls) {
  manager.add_class(cls);
}

// THIS FILE IS GENERATED - DO NOT EDIT!
/*!mobile-detect v1.4.4 2019-09-21*/
/*global module:false, define:false*/
/*jshint latedef:false*/
/*!@license Copyright 2013, Heinrich Goebl, License: MIT, see https://github.com/hgoebl/mobile-detect.js*/
(function (define, undefined$1) {
define(function () {
    'use strict';

    var impl = {};

    impl.mobileDetectRules = {
    "phones": {
        "iPhone": "\\biPhone\\b|\\biPod\\b",
        "BlackBerry": "BlackBerry|\\bBB10\\b|rim[0-9]+|\\b(BBA100|BBB100|BBD100|BBE100|BBF100|STH100)\\b-[0-9]+",
        "HTC": "HTC|HTC.*(Sensation|Evo|Vision|Explorer|6800|8100|8900|A7272|S510e|C110e|Legend|Desire|T8282)|APX515CKT|Qtek9090|APA9292KT|HD_mini|Sensation.*Z710e|PG86100|Z715e|Desire.*(A8181|HD)|ADR6200|ADR6400L|ADR6425|001HT|Inspire 4G|Android.*\\bEVO\\b|T-Mobile G1|Z520m|Android [0-9.]+; Pixel",
        "Nexus": "Nexus One|Nexus S|Galaxy.*Nexus|Android.*Nexus.*Mobile|Nexus 4|Nexus 5|Nexus 6",
        "Dell": "Dell[;]? (Streak|Aero|Venue|Venue Pro|Flash|Smoke|Mini 3iX)|XCD28|XCD35|\\b001DL\\b|\\b101DL\\b|\\bGS01\\b",
        "Motorola": "Motorola|DROIDX|DROID BIONIC|\\bDroid\\b.*Build|Android.*Xoom|HRI39|MOT-|A1260|A1680|A555|A853|A855|A953|A955|A956|Motorola.*ELECTRIFY|Motorola.*i1|i867|i940|MB200|MB300|MB501|MB502|MB508|MB511|MB520|MB525|MB526|MB611|MB612|MB632|MB810|MB855|MB860|MB861|MB865|MB870|ME501|ME502|ME511|ME525|ME600|ME632|ME722|ME811|ME860|ME863|ME865|MT620|MT710|MT716|MT720|MT810|MT870|MT917|Motorola.*TITANIUM|WX435|WX445|XT300|XT301|XT311|XT316|XT317|XT319|XT320|XT390|XT502|XT530|XT531|XT532|XT535|XT603|XT610|XT611|XT615|XT681|XT701|XT702|XT711|XT720|XT800|XT806|XT860|XT862|XT875|XT882|XT883|XT894|XT901|XT907|XT909|XT910|XT912|XT928|XT926|XT915|XT919|XT925|XT1021|\\bMoto E\\b|XT1068|XT1092|XT1052",
        "Samsung": "\\bSamsung\\b|SM-G950F|SM-G955F|SM-G9250|GT-19300|SGH-I337|BGT-S5230|GT-B2100|GT-B2700|GT-B2710|GT-B3210|GT-B3310|GT-B3410|GT-B3730|GT-B3740|GT-B5510|GT-B5512|GT-B5722|GT-B6520|GT-B7300|GT-B7320|GT-B7330|GT-B7350|GT-B7510|GT-B7722|GT-B7800|GT-C3010|GT-C3011|GT-C3060|GT-C3200|GT-C3212|GT-C3212I|GT-C3262|GT-C3222|GT-C3300|GT-C3300K|GT-C3303|GT-C3303K|GT-C3310|GT-C3322|GT-C3330|GT-C3350|GT-C3500|GT-C3510|GT-C3530|GT-C3630|GT-C3780|GT-C5010|GT-C5212|GT-C6620|GT-C6625|GT-C6712|GT-E1050|GT-E1070|GT-E1075|GT-E1080|GT-E1081|GT-E1085|GT-E1087|GT-E1100|GT-E1107|GT-E1110|GT-E1120|GT-E1125|GT-E1130|GT-E1160|GT-E1170|GT-E1175|GT-E1180|GT-E1182|GT-E1200|GT-E1210|GT-E1225|GT-E1230|GT-E1390|GT-E2100|GT-E2120|GT-E2121|GT-E2152|GT-E2220|GT-E2222|GT-E2230|GT-E2232|GT-E2250|GT-E2370|GT-E2550|GT-E2652|GT-E3210|GT-E3213|GT-I5500|GT-I5503|GT-I5700|GT-I5800|GT-I5801|GT-I6410|GT-I6420|GT-I7110|GT-I7410|GT-I7500|GT-I8000|GT-I8150|GT-I8160|GT-I8190|GT-I8320|GT-I8330|GT-I8350|GT-I8530|GT-I8700|GT-I8703|GT-I8910|GT-I9000|GT-I9001|GT-I9003|GT-I9010|GT-I9020|GT-I9023|GT-I9070|GT-I9082|GT-I9100|GT-I9103|GT-I9220|GT-I9250|GT-I9300|GT-I9305|GT-I9500|GT-I9505|GT-M3510|GT-M5650|GT-M7500|GT-M7600|GT-M7603|GT-M8800|GT-M8910|GT-N7000|GT-S3110|GT-S3310|GT-S3350|GT-S3353|GT-S3370|GT-S3650|GT-S3653|GT-S3770|GT-S3850|GT-S5210|GT-S5220|GT-S5229|GT-S5230|GT-S5233|GT-S5250|GT-S5253|GT-S5260|GT-S5263|GT-S5270|GT-S5300|GT-S5330|GT-S5350|GT-S5360|GT-S5363|GT-S5369|GT-S5380|GT-S5380D|GT-S5560|GT-S5570|GT-S5600|GT-S5603|GT-S5610|GT-S5620|GT-S5660|GT-S5670|GT-S5690|GT-S5750|GT-S5780|GT-S5830|GT-S5839|GT-S6102|GT-S6500|GT-S7070|GT-S7200|GT-S7220|GT-S7230|GT-S7233|GT-S7250|GT-S7500|GT-S7530|GT-S7550|GT-S7562|GT-S7710|GT-S8000|GT-S8003|GT-S8500|GT-S8530|GT-S8600|SCH-A310|SCH-A530|SCH-A570|SCH-A610|SCH-A630|SCH-A650|SCH-A790|SCH-A795|SCH-A850|SCH-A870|SCH-A890|SCH-A930|SCH-A950|SCH-A970|SCH-A990|SCH-I100|SCH-I110|SCH-I400|SCH-I405|SCH-I500|SCH-I510|SCH-I515|SCH-I600|SCH-I730|SCH-I760|SCH-I770|SCH-I830|SCH-I910|SCH-I920|SCH-I959|SCH-LC11|SCH-N150|SCH-N300|SCH-R100|SCH-R300|SCH-R351|SCH-R400|SCH-R410|SCH-T300|SCH-U310|SCH-U320|SCH-U350|SCH-U360|SCH-U365|SCH-U370|SCH-U380|SCH-U410|SCH-U430|SCH-U450|SCH-U460|SCH-U470|SCH-U490|SCH-U540|SCH-U550|SCH-U620|SCH-U640|SCH-U650|SCH-U660|SCH-U700|SCH-U740|SCH-U750|SCH-U810|SCH-U820|SCH-U900|SCH-U940|SCH-U960|SCS-26UC|SGH-A107|SGH-A117|SGH-A127|SGH-A137|SGH-A157|SGH-A167|SGH-A177|SGH-A187|SGH-A197|SGH-A227|SGH-A237|SGH-A257|SGH-A437|SGH-A517|SGH-A597|SGH-A637|SGH-A657|SGH-A667|SGH-A687|SGH-A697|SGH-A707|SGH-A717|SGH-A727|SGH-A737|SGH-A747|SGH-A767|SGH-A777|SGH-A797|SGH-A817|SGH-A827|SGH-A837|SGH-A847|SGH-A867|SGH-A877|SGH-A887|SGH-A897|SGH-A927|SGH-B100|SGH-B130|SGH-B200|SGH-B220|SGH-C100|SGH-C110|SGH-C120|SGH-C130|SGH-C140|SGH-C160|SGH-C170|SGH-C180|SGH-C200|SGH-C207|SGH-C210|SGH-C225|SGH-C230|SGH-C417|SGH-C450|SGH-D307|SGH-D347|SGH-D357|SGH-D407|SGH-D415|SGH-D780|SGH-D807|SGH-D980|SGH-E105|SGH-E200|SGH-E315|SGH-E316|SGH-E317|SGH-E335|SGH-E590|SGH-E635|SGH-E715|SGH-E890|SGH-F300|SGH-F480|SGH-I200|SGH-I300|SGH-I320|SGH-I550|SGH-I577|SGH-I600|SGH-I607|SGH-I617|SGH-I627|SGH-I637|SGH-I677|SGH-I700|SGH-I717|SGH-I727|SGH-i747M|SGH-I777|SGH-I780|SGH-I827|SGH-I847|SGH-I857|SGH-I896|SGH-I897|SGH-I900|SGH-I907|SGH-I917|SGH-I927|SGH-I937|SGH-I997|SGH-J150|SGH-J200|SGH-L170|SGH-L700|SGH-M110|SGH-M150|SGH-M200|SGH-N105|SGH-N500|SGH-N600|SGH-N620|SGH-N625|SGH-N700|SGH-N710|SGH-P107|SGH-P207|SGH-P300|SGH-P310|SGH-P520|SGH-P735|SGH-P777|SGH-Q105|SGH-R210|SGH-R220|SGH-R225|SGH-S105|SGH-S307|SGH-T109|SGH-T119|SGH-T139|SGH-T209|SGH-T219|SGH-T229|SGH-T239|SGH-T249|SGH-T259|SGH-T309|SGH-T319|SGH-T329|SGH-T339|SGH-T349|SGH-T359|SGH-T369|SGH-T379|SGH-T409|SGH-T429|SGH-T439|SGH-T459|SGH-T469|SGH-T479|SGH-T499|SGH-T509|SGH-T519|SGH-T539|SGH-T559|SGH-T589|SGH-T609|SGH-T619|SGH-T629|SGH-T639|SGH-T659|SGH-T669|SGH-T679|SGH-T709|SGH-T719|SGH-T729|SGH-T739|SGH-T746|SGH-T749|SGH-T759|SGH-T769|SGH-T809|SGH-T819|SGH-T839|SGH-T919|SGH-T929|SGH-T939|SGH-T959|SGH-T989|SGH-U100|SGH-U200|SGH-U800|SGH-V205|SGH-V206|SGH-X100|SGH-X105|SGH-X120|SGH-X140|SGH-X426|SGH-X427|SGH-X475|SGH-X495|SGH-X497|SGH-X507|SGH-X600|SGH-X610|SGH-X620|SGH-X630|SGH-X700|SGH-X820|SGH-X890|SGH-Z130|SGH-Z150|SGH-Z170|SGH-ZX10|SGH-ZX20|SHW-M110|SPH-A120|SPH-A400|SPH-A420|SPH-A460|SPH-A500|SPH-A560|SPH-A600|SPH-A620|SPH-A660|SPH-A700|SPH-A740|SPH-A760|SPH-A790|SPH-A800|SPH-A820|SPH-A840|SPH-A880|SPH-A900|SPH-A940|SPH-A960|SPH-D600|SPH-D700|SPH-D710|SPH-D720|SPH-I300|SPH-I325|SPH-I330|SPH-I350|SPH-I500|SPH-I600|SPH-I700|SPH-L700|SPH-M100|SPH-M220|SPH-M240|SPH-M300|SPH-M305|SPH-M320|SPH-M330|SPH-M350|SPH-M360|SPH-M370|SPH-M380|SPH-M510|SPH-M540|SPH-M550|SPH-M560|SPH-M570|SPH-M580|SPH-M610|SPH-M620|SPH-M630|SPH-M800|SPH-M810|SPH-M850|SPH-M900|SPH-M910|SPH-M920|SPH-M930|SPH-N100|SPH-N200|SPH-N240|SPH-N300|SPH-N400|SPH-Z400|SWC-E100|SCH-i909|GT-N7100|GT-N7105|SCH-I535|SM-N900A|SGH-I317|SGH-T999L|GT-S5360B|GT-I8262|GT-S6802|GT-S6312|GT-S6310|GT-S5312|GT-S5310|GT-I9105|GT-I8510|GT-S6790N|SM-G7105|SM-N9005|GT-S5301|GT-I9295|GT-I9195|SM-C101|GT-S7392|GT-S7560|GT-B7610|GT-I5510|GT-S7582|GT-S7530E|GT-I8750|SM-G9006V|SM-G9008V|SM-G9009D|SM-G900A|SM-G900D|SM-G900F|SM-G900H|SM-G900I|SM-G900J|SM-G900K|SM-G900L|SM-G900M|SM-G900P|SM-G900R4|SM-G900S|SM-G900T|SM-G900V|SM-G900W8|SHV-E160K|SCH-P709|SCH-P729|SM-T2558|GT-I9205|SM-G9350|SM-J120F|SM-G920F|SM-G920V|SM-G930F|SM-N910C|SM-A310F|GT-I9190|SM-J500FN|SM-G903F|SM-J330F",
        "LG": "\\bLG\\b;|LG[- ]?(C800|C900|E400|E610|E900|E-900|F160|F180K|F180L|F180S|730|855|L160|LS740|LS840|LS970|LU6200|MS690|MS695|MS770|MS840|MS870|MS910|P500|P700|P705|VM696|AS680|AS695|AX840|C729|E970|GS505|272|C395|E739BK|E960|L55C|L75C|LS696|LS860|P769BK|P350|P500|P509|P870|UN272|US730|VS840|VS950|LN272|LN510|LS670|LS855|LW690|MN270|MN510|P509|P769|P930|UN200|UN270|UN510|UN610|US670|US740|US760|UX265|UX840|VN271|VN530|VS660|VS700|VS740|VS750|VS910|VS920|VS930|VX9200|VX11000|AX840A|LW770|P506|P925|P999|E612|D955|D802|MS323|M257)|LM-G710",
        "Sony": "SonyST|SonyLT|SonyEricsson|SonyEricssonLT15iv|LT18i|E10i|LT28h|LT26w|SonyEricssonMT27i|C5303|C6902|C6903|C6906|C6943|D2533",
        "Asus": "Asus.*Galaxy|PadFone.*Mobile",
        "NokiaLumia": "Lumia [0-9]{3,4}",
        "Micromax": "Micromax.*\\b(A210|A92|A88|A72|A111|A110Q|A115|A116|A110|A90S|A26|A51|A35|A54|A25|A27|A89|A68|A65|A57|A90)\\b",
        "Palm": "PalmSource|Palm",
        "Vertu": "Vertu|Vertu.*Ltd|Vertu.*Ascent|Vertu.*Ayxta|Vertu.*Constellation(F|Quest)?|Vertu.*Monika|Vertu.*Signature",
        "Pantech": "PANTECH|IM-A850S|IM-A840S|IM-A830L|IM-A830K|IM-A830S|IM-A820L|IM-A810K|IM-A810S|IM-A800S|IM-T100K|IM-A725L|IM-A780L|IM-A775C|IM-A770K|IM-A760S|IM-A750K|IM-A740S|IM-A730S|IM-A720L|IM-A710K|IM-A690L|IM-A690S|IM-A650S|IM-A630K|IM-A600S|VEGA PTL21|PT003|P8010|ADR910L|P6030|P6020|P9070|P4100|P9060|P5000|CDM8992|TXT8045|ADR8995|IS11PT|P2030|P6010|P8000|PT002|IS06|CDM8999|P9050|PT001|TXT8040|P2020|P9020|P2000|P7040|P7000|C790",
        "Fly": "IQ230|IQ444|IQ450|IQ440|IQ442|IQ441|IQ245|IQ256|IQ236|IQ255|IQ235|IQ245|IQ275|IQ240|IQ285|IQ280|IQ270|IQ260|IQ250",
        "Wiko": "KITE 4G|HIGHWAY|GETAWAY|STAIRWAY|DARKSIDE|DARKFULL|DARKNIGHT|DARKMOON|SLIDE|WAX 4G|RAINBOW|BLOOM|SUNSET|GOA(?!nna)|LENNY|BARRY|IGGY|OZZY|CINK FIVE|CINK PEAX|CINK PEAX 2|CINK SLIM|CINK SLIM 2|CINK +|CINK KING|CINK PEAX|CINK SLIM|SUBLIM",
        "iMobile": "i-mobile (IQ|i-STYLE|idea|ZAA|Hitz)",
        "SimValley": "\\b(SP-80|XT-930|SX-340|XT-930|SX-310|SP-360|SP60|SPT-800|SP-120|SPT-800|SP-140|SPX-5|SPX-8|SP-100|SPX-8|SPX-12)\\b",
        "Wolfgang": "AT-B24D|AT-AS50HD|AT-AS40W|AT-AS55HD|AT-AS45q2|AT-B26D|AT-AS50Q",
        "Alcatel": "Alcatel",
        "Nintendo": "Nintendo (3DS|Switch)",
        "Amoi": "Amoi",
        "INQ": "INQ",
        "OnePlus": "ONEPLUS",
        "GenericPhone": "Tapatalk|PDA;|SAGEM|\\bmmp\\b|pocket|\\bpsp\\b|symbian|Smartphone|smartfon|treo|up.browser|up.link|vodafone|\\bwap\\b|nokia|Series40|Series60|S60|SonyEricsson|N900|MAUI.*WAP.*Browser"
    },
    "tablets": {
        "iPad": "iPad|iPad.*Mobile",
        "NexusTablet": "Android.*Nexus[\\s]+(7|9|10)",
        "GoogleTablet": "Android.*Pixel C",
        "SamsungTablet": "SAMSUNG.*Tablet|Galaxy.*Tab|SC-01C|GT-P1000|GT-P1003|GT-P1010|GT-P3105|GT-P6210|GT-P6800|GT-P6810|GT-P7100|GT-P7300|GT-P7310|GT-P7500|GT-P7510|SCH-I800|SCH-I815|SCH-I905|SGH-I957|SGH-I987|SGH-T849|SGH-T859|SGH-T869|SPH-P100|GT-P3100|GT-P3108|GT-P3110|GT-P5100|GT-P5110|GT-P6200|GT-P7320|GT-P7511|GT-N8000|GT-P8510|SGH-I497|SPH-P500|SGH-T779|SCH-I705|SCH-I915|GT-N8013|GT-P3113|GT-P5113|GT-P8110|GT-N8010|GT-N8005|GT-N8020|GT-P1013|GT-P6201|GT-P7501|GT-N5100|GT-N5105|GT-N5110|SHV-E140K|SHV-E140L|SHV-E140S|SHV-E150S|SHV-E230K|SHV-E230L|SHV-E230S|SHW-M180K|SHW-M180L|SHW-M180S|SHW-M180W|SHW-M300W|SHW-M305W|SHW-M380K|SHW-M380S|SHW-M380W|SHW-M430W|SHW-M480K|SHW-M480S|SHW-M480W|SHW-M485W|SHW-M486W|SHW-M500W|GT-I9228|SCH-P739|SCH-I925|GT-I9200|GT-P5200|GT-P5210|GT-P5210X|SM-T311|SM-T310|SM-T310X|SM-T210|SM-T210R|SM-T211|SM-P600|SM-P601|SM-P605|SM-P900|SM-P901|SM-T217|SM-T217A|SM-T217S|SM-P6000|SM-T3100|SGH-I467|XE500|SM-T110|GT-P5220|GT-I9200X|GT-N5110X|GT-N5120|SM-P905|SM-T111|SM-T2105|SM-T315|SM-T320|SM-T320X|SM-T321|SM-T520|SM-T525|SM-T530NU|SM-T230NU|SM-T330NU|SM-T900|XE500T1C|SM-P605V|SM-P905V|SM-T337V|SM-T537V|SM-T707V|SM-T807V|SM-P600X|SM-P900X|SM-T210X|SM-T230|SM-T230X|SM-T325|GT-P7503|SM-T531|SM-T330|SM-T530|SM-T705|SM-T705C|SM-T535|SM-T331|SM-T800|SM-T700|SM-T537|SM-T807|SM-P907A|SM-T337A|SM-T537A|SM-T707A|SM-T807A|SM-T237|SM-T807P|SM-P607T|SM-T217T|SM-T337T|SM-T807T|SM-T116NQ|SM-T116BU|SM-P550|SM-T350|SM-T550|SM-T9000|SM-P9000|SM-T705Y|SM-T805|GT-P3113|SM-T710|SM-T810|SM-T815|SM-T360|SM-T533|SM-T113|SM-T335|SM-T715|SM-T560|SM-T670|SM-T677|SM-T377|SM-T567|SM-T357T|SM-T555|SM-T561|SM-T713|SM-T719|SM-T813|SM-T819|SM-T580|SM-T355Y?|SM-T280|SM-T817A|SM-T820|SM-W700|SM-P580|SM-T587|SM-P350|SM-P555M|SM-P355M|SM-T113NU|SM-T815Y|SM-T585|SM-T285|SM-T825|SM-W708|SM-T835|SM-T830|SM-T837V|SM-T720|SM-T510|SM-T387V",
        "Kindle": "Kindle|Silk.*Accelerated|Android.*\\b(KFOT|KFTT|KFJWI|KFJWA|KFOTE|KFSOWI|KFTHWI|KFTHWA|KFAPWI|KFAPWA|WFJWAE|KFSAWA|KFSAWI|KFASWI|KFARWI|KFFOWI|KFGIWI|KFMEWI)\\b|Android.*Silk\/[0-9.]+ like Chrome\/[0-9.]+ (?!Mobile)",
        "SurfaceTablet": "Windows NT [0-9.]+; ARM;.*(Tablet|ARMBJS)",
        "HPTablet": "HP Slate (7|8|10)|HP ElitePad 900|hp-tablet|EliteBook.*Touch|HP 8|Slate 21|HP SlateBook 10",
        "AsusTablet": "^.*PadFone((?!Mobile).)*$|Transformer|TF101|TF101G|TF300T|TF300TG|TF300TL|TF700T|TF700KL|TF701T|TF810C|ME171|ME301T|ME302C|ME371MG|ME370T|ME372MG|ME172V|ME173X|ME400C|Slider SL101|\\bK00F\\b|\\bK00C\\b|\\bK00E\\b|\\bK00L\\b|TX201LA|ME176C|ME102A|\\bM80TA\\b|ME372CL|ME560CG|ME372CG|ME302KL| K010 | K011 | K017 | K01E |ME572C|ME103K|ME170C|ME171C|\\bME70C\\b|ME581C|ME581CL|ME8510C|ME181C|P01Y|PO1MA|P01Z|\\bP027\\b|\\bP024\\b|\\bP00C\\b",
        "BlackBerryTablet": "PlayBook|RIM Tablet",
        "HTCtablet": "HTC_Flyer_P512|HTC Flyer|HTC Jetstream|HTC-P715a|HTC EVO View 4G|PG41200|PG09410",
        "MotorolaTablet": "xoom|sholest|MZ615|MZ605|MZ505|MZ601|MZ602|MZ603|MZ604|MZ606|MZ607|MZ608|MZ609|MZ615|MZ616|MZ617",
        "NookTablet": "Android.*Nook|NookColor|nook browser|BNRV200|BNRV200A|BNTV250|BNTV250A|BNTV400|BNTV600|LogicPD Zoom2",
        "AcerTablet": "Android.*; \\b(A100|A101|A110|A200|A210|A211|A500|A501|A510|A511|A700|A701|W500|W500P|W501|W501P|W510|W511|W700|G100|G100W|B1-A71|B1-710|B1-711|A1-810|A1-811|A1-830)\\b|W3-810|\\bA3-A10\\b|\\bA3-A11\\b|\\bA3-A20\\b|\\bA3-A30",
        "ToshibaTablet": "Android.*(AT100|AT105|AT200|AT205|AT270|AT275|AT300|AT305|AT1S5|AT500|AT570|AT700|AT830)|TOSHIBA.*FOLIO",
        "LGTablet": "\\bL-06C|LG-V909|LG-V900|LG-V700|LG-V510|LG-V500|LG-V410|LG-V400|LG-VK810\\b",
        "FujitsuTablet": "Android.*\\b(F-01D|F-02F|F-05E|F-10D|M532|Q572)\\b",
        "PrestigioTablet": "PMP3170B|PMP3270B|PMP3470B|PMP7170B|PMP3370B|PMP3570C|PMP5870C|PMP3670B|PMP5570C|PMP5770D|PMP3970B|PMP3870C|PMP5580C|PMP5880D|PMP5780D|PMP5588C|PMP7280C|PMP7280C3G|PMP7280|PMP7880D|PMP5597D|PMP5597|PMP7100D|PER3464|PER3274|PER3574|PER3884|PER5274|PER5474|PMP5097CPRO|PMP5097|PMP7380D|PMP5297C|PMP5297C_QUAD|PMP812E|PMP812E3G|PMP812F|PMP810E|PMP880TD|PMT3017|PMT3037|PMT3047|PMT3057|PMT7008|PMT5887|PMT5001|PMT5002",
        "LenovoTablet": "Lenovo TAB|Idea(Tab|Pad)( A1|A10| K1|)|ThinkPad([ ]+)?Tablet|YT3-850M|YT3-X90L|YT3-X90F|YT3-X90X|Lenovo.*(S2109|S2110|S5000|S6000|K3011|A3000|A3500|A1000|A2107|A2109|A1107|A5500|A7600|B6000|B8000|B8080)(-|)(FL|F|HV|H|)|TB-X103F|TB-X304X|TB-X304F|TB-X304L|TB-X505F|TB-X505L|TB-X505X|TB-X605F|TB-X605L|TB-8703F|TB-8703X|TB-8703N|TB-8704N|TB-8704F|TB-8704X|TB-8704V|TB-7304F|TB-7304I|TB-7304X|Tab2A7-10F|Tab2A7-20F|TB2-X30L|YT3-X50L|YT3-X50F|YT3-X50M|YT-X705F|YT-X703F|YT-X703L|YT-X705L|YT-X705X|TB2-X30F|TB2-X30L|TB2-X30M|A2107A-F|A2107A-H|TB3-730F|TB3-730M|TB3-730X|TB-7504F|TB-7504X",
        "DellTablet": "Venue 11|Venue 8|Venue 7|Dell Streak 10|Dell Streak 7",
        "YarvikTablet": "Android.*\\b(TAB210|TAB211|TAB224|TAB250|TAB260|TAB264|TAB310|TAB360|TAB364|TAB410|TAB411|TAB420|TAB424|TAB450|TAB460|TAB461|TAB464|TAB465|TAB467|TAB468|TAB07-100|TAB07-101|TAB07-150|TAB07-151|TAB07-152|TAB07-200|TAB07-201-3G|TAB07-210|TAB07-211|TAB07-212|TAB07-214|TAB07-220|TAB07-400|TAB07-485|TAB08-150|TAB08-200|TAB08-201-3G|TAB08-201-30|TAB09-100|TAB09-211|TAB09-410|TAB10-150|TAB10-201|TAB10-211|TAB10-400|TAB10-410|TAB13-201|TAB274EUK|TAB275EUK|TAB374EUK|TAB462EUK|TAB474EUK|TAB9-200)\\b",
        "MedionTablet": "Android.*\\bOYO\\b|LIFE.*(P9212|P9514|P9516|S9512)|LIFETAB",
        "ArnovaTablet": "97G4|AN10G2|AN7bG3|AN7fG3|AN8G3|AN8cG3|AN7G3|AN9G3|AN7dG3|AN7dG3ST|AN7dG3ChildPad|AN10bG3|AN10bG3DT|AN9G2",
        "IntensoTablet": "INM8002KP|INM1010FP|INM805ND|Intenso Tab|TAB1004",
        "IRUTablet": "M702pro",
        "MegafonTablet": "MegaFon V9|\\bZTE V9\\b|Android.*\\bMT7A\\b",
        "EbodaTablet": "E-Boda (Supreme|Impresspeed|Izzycomm|Essential)",
        "AllViewTablet": "Allview.*(Viva|Alldro|City|Speed|All TV|Frenzy|Quasar|Shine|TX1|AX1|AX2)",
        "ArchosTablet": "\\b(101G9|80G9|A101IT)\\b|Qilive 97R|Archos5|\\bARCHOS (70|79|80|90|97|101|FAMILYPAD|)(b|c|)(G10| Cobalt| TITANIUM(HD|)| Xenon| Neon|XSK| 2| XS 2| PLATINUM| CARBON|GAMEPAD)\\b",
        "AinolTablet": "NOVO7|NOVO8|NOVO10|Novo7Aurora|Novo7Basic|NOVO7PALADIN|novo9-Spark",
        "NokiaLumiaTablet": "Lumia 2520",
        "SonyTablet": "Sony.*Tablet|Xperia Tablet|Sony Tablet S|SO-03E|SGPT12|SGPT13|SGPT114|SGPT121|SGPT122|SGPT123|SGPT111|SGPT112|SGPT113|SGPT131|SGPT132|SGPT133|SGPT211|SGPT212|SGPT213|SGP311|SGP312|SGP321|EBRD1101|EBRD1102|EBRD1201|SGP351|SGP341|SGP511|SGP512|SGP521|SGP541|SGP551|SGP621|SGP641|SGP612|SOT31|SGP771|SGP611|SGP612|SGP712",
        "PhilipsTablet": "\\b(PI2010|PI3000|PI3100|PI3105|PI3110|PI3205|PI3210|PI3900|PI4010|PI7000|PI7100)\\b",
        "CubeTablet": "Android.*(K8GT|U9GT|U10GT|U16GT|U17GT|U18GT|U19GT|U20GT|U23GT|U30GT)|CUBE U8GT",
        "CobyTablet": "MID1042|MID1045|MID1125|MID1126|MID7012|MID7014|MID7015|MID7034|MID7035|MID7036|MID7042|MID7048|MID7127|MID8042|MID8048|MID8127|MID9042|MID9740|MID9742|MID7022|MID7010",
        "MIDTablet": "M9701|M9000|M9100|M806|M1052|M806|T703|MID701|MID713|MID710|MID727|MID760|MID830|MID728|MID933|MID125|MID810|MID732|MID120|MID930|MID800|MID731|MID900|MID100|MID820|MID735|MID980|MID130|MID833|MID737|MID960|MID135|MID860|MID736|MID140|MID930|MID835|MID733|MID4X10",
        "MSITablet": "MSI \\b(Primo 73K|Primo 73L|Primo 81L|Primo 77|Primo 93|Primo 75|Primo 76|Primo 73|Primo 81|Primo 91|Primo 90|Enjoy 71|Enjoy 7|Enjoy 10)\\b",
        "SMiTTablet": "Android.*(\\bMID\\b|MID-560|MTV-T1200|MTV-PND531|MTV-P1101|MTV-PND530)",
        "RockChipTablet": "Android.*(RK2818|RK2808A|RK2918|RK3066)|RK2738|RK2808A",
        "FlyTablet": "IQ310|Fly Vision",
        "bqTablet": "Android.*(bq)?.*\\b(Elcano|Curie|Edison|Maxwell|Kepler|Pascal|Tesla|Hypatia|Platon|Newton|Livingstone|Cervantes|Avant|Aquaris ([E|M]10|M8))\\b|Maxwell.*Lite|Maxwell.*Plus",
        "HuaweiTablet": "MediaPad|MediaPad 7 Youth|IDEOS S7|S7-201c|S7-202u|S7-101|S7-103|S7-104|S7-105|S7-106|S7-201|S7-Slim|M2-A01L|BAH-L09|BAH-W09|AGS-L09|CMR-AL19",
        "NecTablet": "\\bN-06D|\\bN-08D",
        "PantechTablet": "Pantech.*P4100",
        "BronchoTablet": "Broncho.*(N701|N708|N802|a710)",
        "VersusTablet": "TOUCHPAD.*[78910]|\\bTOUCHTAB\\b",
        "ZyncTablet": "z1000|Z99 2G|z930|z990|z909|Z919|z900",
        "PositivoTablet": "TB07STA|TB10STA|TB07FTA|TB10FTA",
        "NabiTablet": "Android.*\\bNabi",
        "KoboTablet": "Kobo Touch|\\bK080\\b|\\bVox\\b Build|\\bArc\\b Build",
        "DanewTablet": "DSlide.*\\b(700|701R|702|703R|704|802|970|971|972|973|974|1010|1012)\\b",
        "TexetTablet": "NaviPad|TB-772A|TM-7045|TM-7055|TM-9750|TM-7016|TM-7024|TM-7026|TM-7041|TM-7043|TM-7047|TM-8041|TM-9741|TM-9747|TM-9748|TM-9751|TM-7022|TM-7021|TM-7020|TM-7011|TM-7010|TM-7023|TM-7025|TM-7037W|TM-7038W|TM-7027W|TM-9720|TM-9725|TM-9737W|TM-1020|TM-9738W|TM-9740|TM-9743W|TB-807A|TB-771A|TB-727A|TB-725A|TB-719A|TB-823A|TB-805A|TB-723A|TB-715A|TB-707A|TB-705A|TB-709A|TB-711A|TB-890HD|TB-880HD|TB-790HD|TB-780HD|TB-770HD|TB-721HD|TB-710HD|TB-434HD|TB-860HD|TB-840HD|TB-760HD|TB-750HD|TB-740HD|TB-730HD|TB-722HD|TB-720HD|TB-700HD|TB-500HD|TB-470HD|TB-431HD|TB-430HD|TB-506|TB-504|TB-446|TB-436|TB-416|TB-146SE|TB-126SE",
        "PlaystationTablet": "Playstation.*(Portable|Vita)",
        "TrekstorTablet": "ST10416-1|VT10416-1|ST70408-1|ST702xx-1|ST702xx-2|ST80208|ST97216|ST70104-2|VT10416-2|ST10216-2A|SurfTab",
        "PyleAudioTablet": "\\b(PTBL10CEU|PTBL10C|PTBL72BC|PTBL72BCEU|PTBL7CEU|PTBL7C|PTBL92BC|PTBL92BCEU|PTBL9CEU|PTBL9CUK|PTBL9C)\\b",
        "AdvanTablet": "Android.* \\b(E3A|T3X|T5C|T5B|T3E|T3C|T3B|T1J|T1F|T2A|T1H|T1i|E1C|T1-E|T5-A|T4|E1-B|T2Ci|T1-B|T1-D|O1-A|E1-A|T1-A|T3A|T4i)\\b ",
        "DanyTechTablet": "Genius Tab G3|Genius Tab S2|Genius Tab Q3|Genius Tab G4|Genius Tab Q4|Genius Tab G-II|Genius TAB GII|Genius TAB GIII|Genius Tab S1",
        "GalapadTablet": "Android.*\\bG1\\b(?!\\))",
        "MicromaxTablet": "Funbook|Micromax.*\\b(P250|P560|P360|P362|P600|P300|P350|P500|P275)\\b",
        "KarbonnTablet": "Android.*\\b(A39|A37|A34|ST8|ST10|ST7|Smart Tab3|Smart Tab2)\\b",
        "AllFineTablet": "Fine7 Genius|Fine7 Shine|Fine7 Air|Fine8 Style|Fine9 More|Fine10 Joy|Fine11 Wide",
        "PROSCANTablet": "\\b(PEM63|PLT1023G|PLT1041|PLT1044|PLT1044G|PLT1091|PLT4311|PLT4311PL|PLT4315|PLT7030|PLT7033|PLT7033D|PLT7035|PLT7035D|PLT7044K|PLT7045K|PLT7045KB|PLT7071KG|PLT7072|PLT7223G|PLT7225G|PLT7777G|PLT7810K|PLT7849G|PLT7851G|PLT7852G|PLT8015|PLT8031|PLT8034|PLT8036|PLT8080K|PLT8082|PLT8088|PLT8223G|PLT8234G|PLT8235G|PLT8816K|PLT9011|PLT9045K|PLT9233G|PLT9735|PLT9760G|PLT9770G)\\b",
        "YONESTablet": "BQ1078|BC1003|BC1077|RK9702|BC9730|BC9001|IT9001|BC7008|BC7010|BC708|BC728|BC7012|BC7030|BC7027|BC7026",
        "ChangJiaTablet": "TPC7102|TPC7103|TPC7105|TPC7106|TPC7107|TPC7201|TPC7203|TPC7205|TPC7210|TPC7708|TPC7709|TPC7712|TPC7110|TPC8101|TPC8103|TPC8105|TPC8106|TPC8203|TPC8205|TPC8503|TPC9106|TPC9701|TPC97101|TPC97103|TPC97105|TPC97106|TPC97111|TPC97113|TPC97203|TPC97603|TPC97809|TPC97205|TPC10101|TPC10103|TPC10106|TPC10111|TPC10203|TPC10205|TPC10503",
        "GUTablet": "TX-A1301|TX-M9002|Q702|kf026",
        "PointOfViewTablet": "TAB-P506|TAB-navi-7-3G-M|TAB-P517|TAB-P-527|TAB-P701|TAB-P703|TAB-P721|TAB-P731N|TAB-P741|TAB-P825|TAB-P905|TAB-P925|TAB-PR945|TAB-PL1015|TAB-P1025|TAB-PI1045|TAB-P1325|TAB-PROTAB[0-9]+|TAB-PROTAB25|TAB-PROTAB26|TAB-PROTAB27|TAB-PROTAB26XL|TAB-PROTAB2-IPS9|TAB-PROTAB30-IPS9|TAB-PROTAB25XXL|TAB-PROTAB26-IPS10|TAB-PROTAB30-IPS10",
        "OvermaxTablet": "OV-(SteelCore|NewBase|Basecore|Baseone|Exellen|Quattor|EduTab|Solution|ACTION|BasicTab|TeddyTab|MagicTab|Stream|TB-08|TB-09)|Qualcore 1027",
        "HCLTablet": "HCL.*Tablet|Connect-3G-2.0|Connect-2G-2.0|ME Tablet U1|ME Tablet U2|ME Tablet G1|ME Tablet X1|ME Tablet Y2|ME Tablet Sync",
        "DPSTablet": "DPS Dream 9|DPS Dual 7",
        "VistureTablet": "V97 HD|i75 3G|Visture V4( HD)?|Visture V5( HD)?|Visture V10",
        "CrestaTablet": "CTP(-)?810|CTP(-)?818|CTP(-)?828|CTP(-)?838|CTP(-)?888|CTP(-)?978|CTP(-)?980|CTP(-)?987|CTP(-)?988|CTP(-)?989",
        "MediatekTablet": "\\bMT8125|MT8389|MT8135|MT8377\\b",
        "ConcordeTablet": "Concorde([ ]+)?Tab|ConCorde ReadMan",
        "GoCleverTablet": "GOCLEVER TAB|A7GOCLEVER|M1042|M7841|M742|R1042BK|R1041|TAB A975|TAB A7842|TAB A741|TAB A741L|TAB M723G|TAB M721|TAB A1021|TAB I921|TAB R721|TAB I720|TAB T76|TAB R70|TAB R76.2|TAB R106|TAB R83.2|TAB M813G|TAB I721|GCTA722|TAB I70|TAB I71|TAB S73|TAB R73|TAB R74|TAB R93|TAB R75|TAB R76.1|TAB A73|TAB A93|TAB A93.2|TAB T72|TAB R83|TAB R974|TAB R973|TAB A101|TAB A103|TAB A104|TAB A104.2|R105BK|M713G|A972BK|TAB A971|TAB R974.2|TAB R104|TAB R83.3|TAB A1042",
        "ModecomTablet": "FreeTAB 9000|FreeTAB 7.4|FreeTAB 7004|FreeTAB 7800|FreeTAB 2096|FreeTAB 7.5|FreeTAB 1014|FreeTAB 1001 |FreeTAB 8001|FreeTAB 9706|FreeTAB 9702|FreeTAB 7003|FreeTAB 7002|FreeTAB 1002|FreeTAB 7801|FreeTAB 1331|FreeTAB 1004|FreeTAB 8002|FreeTAB 8014|FreeTAB 9704|FreeTAB 1003",
        "VoninoTablet": "\\b(Argus[ _]?S|Diamond[ _]?79HD|Emerald[ _]?78E|Luna[ _]?70C|Onyx[ _]?S|Onyx[ _]?Z|Orin[ _]?HD|Orin[ _]?S|Otis[ _]?S|SpeedStar[ _]?S|Magnet[ _]?M9|Primus[ _]?94[ _]?3G|Primus[ _]?94HD|Primus[ _]?QS|Android.*\\bQ8\\b|Sirius[ _]?EVO[ _]?QS|Sirius[ _]?QS|Spirit[ _]?S)\\b",
        "ECSTablet": "V07OT2|TM105A|S10OT1|TR10CS1",
        "StorexTablet": "eZee[_']?(Tab|Go)[0-9]+|TabLC7|Looney Tunes Tab",
        "VodafoneTablet": "SmartTab([ ]+)?[0-9]+|SmartTabII10|SmartTabII7|VF-1497|VFD 1400",
        "EssentielBTablet": "Smart[ ']?TAB[ ]+?[0-9]+|Family[ ']?TAB2",
        "RossMoorTablet": "RM-790|RM-997|RMD-878G|RMD-974R|RMT-705A|RMT-701|RME-601|RMT-501|RMT-711",
        "iMobileTablet": "i-mobile i-note",
        "TolinoTablet": "tolino tab [0-9.]+|tolino shine",
        "AudioSonicTablet": "\\bC-22Q|T7-QC|T-17B|T-17P\\b",
        "AMPETablet": "Android.* A78 ",
        "SkkTablet": "Android.* (SKYPAD|PHOENIX|CYCLOPS)",
        "TecnoTablet": "TECNO P9|TECNO DP8D",
        "JXDTablet": "Android.* \\b(F3000|A3300|JXD5000|JXD3000|JXD2000|JXD300B|JXD300|S5800|S7800|S602b|S5110b|S7300|S5300|S602|S603|S5100|S5110|S601|S7100a|P3000F|P3000s|P101|P200s|P1000m|P200m|P9100|P1000s|S6600b|S908|P1000|P300|S18|S6600|S9100)\\b",
        "iJoyTablet": "Tablet (Spirit 7|Essentia|Galatea|Fusion|Onix 7|Landa|Titan|Scooby|Deox|Stella|Themis|Argon|Unique 7|Sygnus|Hexen|Finity 7|Cream|Cream X2|Jade|Neon 7|Neron 7|Kandy|Scape|Saphyr 7|Rebel|Biox|Rebel|Rebel 8GB|Myst|Draco 7|Myst|Tab7-004|Myst|Tadeo Jones|Tablet Boing|Arrow|Draco Dual Cam|Aurix|Mint|Amity|Revolution|Finity 9|Neon 9|T9w|Amity 4GB Dual Cam|Stone 4GB|Stone 8GB|Andromeda|Silken|X2|Andromeda II|Halley|Flame|Saphyr 9,7|Touch 8|Planet|Triton|Unique 10|Hexen 10|Memphis 4GB|Memphis 8GB|Onix 10)",
        "FX2Tablet": "FX2 PAD7|FX2 PAD10",
        "XoroTablet": "KidsPAD 701|PAD[ ]?712|PAD[ ]?714|PAD[ ]?716|PAD[ ]?717|PAD[ ]?718|PAD[ ]?720|PAD[ ]?721|PAD[ ]?722|PAD[ ]?790|PAD[ ]?792|PAD[ ]?900|PAD[ ]?9715D|PAD[ ]?9716DR|PAD[ ]?9718DR|PAD[ ]?9719QR|PAD[ ]?9720QR|TelePAD1030|Telepad1032|TelePAD730|TelePAD731|TelePAD732|TelePAD735Q|TelePAD830|TelePAD9730|TelePAD795|MegaPAD 1331|MegaPAD 1851|MegaPAD 2151",
        "ViewsonicTablet": "ViewPad 10pi|ViewPad 10e|ViewPad 10s|ViewPad E72|ViewPad7|ViewPad E100|ViewPad 7e|ViewSonic VB733|VB100a",
        "VerizonTablet": "QTAQZ3|QTAIR7|QTAQTZ3|QTASUN1|QTASUN2|QTAXIA1",
        "OdysTablet": "LOOX|XENO10|ODYS[ -](Space|EVO|Xpress|NOON)|\\bXELIO\\b|Xelio10Pro|XELIO7PHONETAB|XELIO10EXTREME|XELIOPT2|NEO_QUAD10",
        "CaptivaTablet": "CAPTIVA PAD",
        "IconbitTablet": "NetTAB|NT-3702|NT-3702S|NT-3702S|NT-3603P|NT-3603P|NT-0704S|NT-0704S|NT-3805C|NT-3805C|NT-0806C|NT-0806C|NT-0909T|NT-0909T|NT-0907S|NT-0907S|NT-0902S|NT-0902S",
        "TeclastTablet": "T98 4G|\\bP80\\b|\\bX90HD\\b|X98 Air|X98 Air 3G|\\bX89\\b|P80 3G|\\bX80h\\b|P98 Air|\\bX89HD\\b|P98 3G|\\bP90HD\\b|P89 3G|X98 3G|\\bP70h\\b|P79HD 3G|G18d 3G|\\bP79HD\\b|\\bP89s\\b|\\bA88\\b|\\bP10HD\\b|\\bP19HD\\b|G18 3G|\\bP78HD\\b|\\bA78\\b|\\bP75\\b|G17s 3G|G17h 3G|\\bP85t\\b|\\bP90\\b|\\bP11\\b|\\bP98t\\b|\\bP98HD\\b|\\bG18d\\b|\\bP85s\\b|\\bP11HD\\b|\\bP88s\\b|\\bA80HD\\b|\\bA80se\\b|\\bA10h\\b|\\bP89\\b|\\bP78s\\b|\\bG18\\b|\\bP85\\b|\\bA70h\\b|\\bA70\\b|\\bG17\\b|\\bP18\\b|\\bA80s\\b|\\bA11s\\b|\\bP88HD\\b|\\bA80h\\b|\\bP76s\\b|\\bP76h\\b|\\bP98\\b|\\bA10HD\\b|\\bP78\\b|\\bP88\\b|\\bA11\\b|\\bA10t\\b|\\bP76a\\b|\\bP76t\\b|\\bP76e\\b|\\bP85HD\\b|\\bP85a\\b|\\bP86\\b|\\bP75HD\\b|\\bP76v\\b|\\bA12\\b|\\bP75a\\b|\\bA15\\b|\\bP76Ti\\b|\\bP81HD\\b|\\bA10\\b|\\bT760VE\\b|\\bT720HD\\b|\\bP76\\b|\\bP73\\b|\\bP71\\b|\\bP72\\b|\\bT720SE\\b|\\bC520Ti\\b|\\bT760\\b|\\bT720VE\\b|T720-3GE|T720-WiFi",
        "OndaTablet": "\\b(V975i|Vi30|VX530|V701|Vi60|V701s|Vi50|V801s|V719|Vx610w|VX610W|V819i|Vi10|VX580W|Vi10|V711s|V813|V811|V820w|V820|Vi20|V711|VI30W|V712|V891w|V972|V819w|V820w|Vi60|V820w|V711|V813s|V801|V819|V975s|V801|V819|V819|V818|V811|V712|V975m|V101w|V961w|V812|V818|V971|V971s|V919|V989|V116w|V102w|V973|Vi40)\\b[\\s]+|V10 \\b4G\\b",
        "JaytechTablet": "TPC-PA762",
        "BlaupunktTablet": "Endeavour 800NG|Endeavour 1010",
        "DigmaTablet": "\\b(iDx10|iDx9|iDx8|iDx7|iDxD7|iDxD8|iDsQ8|iDsQ7|iDsQ8|iDsD10|iDnD7|3TS804H|iDsQ11|iDj7|iDs10)\\b",
        "EvolioTablet": "ARIA_Mini_wifi|Aria[ _]Mini|Evolio X10|Evolio X7|Evolio X8|\\bEvotab\\b|\\bNeura\\b",
        "LavaTablet": "QPAD E704|\\bIvoryS\\b|E-TAB IVORY|\\bE-TAB\\b",
        "AocTablet": "MW0811|MW0812|MW0922|MTK8382|MW1031|MW0831|MW0821|MW0931|MW0712",
        "MpmanTablet": "MP11 OCTA|MP10 OCTA|MPQC1114|MPQC1004|MPQC994|MPQC974|MPQC973|MPQC804|MPQC784|MPQC780|\\bMPG7\\b|MPDCG75|MPDCG71|MPDC1006|MP101DC|MPDC9000|MPDC905|MPDC706HD|MPDC706|MPDC705|MPDC110|MPDC100|MPDC99|MPDC97|MPDC88|MPDC8|MPDC77|MP709|MID701|MID711|MID170|MPDC703|MPQC1010",
        "CelkonTablet": "CT695|CT888|CT[\\s]?910|CT7 Tab|CT9 Tab|CT3 Tab|CT2 Tab|CT1 Tab|C820|C720|\\bCT-1\\b",
        "WolderTablet": "miTab \\b(DIAMOND|SPACE|BROOKLYN|NEO|FLY|MANHATTAN|FUNK|EVOLUTION|SKY|GOCAR|IRON|GENIUS|POP|MINT|EPSILON|BROADWAY|JUMP|HOP|LEGEND|NEW AGE|LINE|ADVANCE|FEEL|FOLLOW|LIKE|LINK|LIVE|THINK|FREEDOM|CHICAGO|CLEVELAND|BALTIMORE-GH|IOWA|BOSTON|SEATTLE|PHOENIX|DALLAS|IN 101|MasterChef)\\b",
        "MediacomTablet": "M-MPI10C3G|M-SP10EG|M-SP10EGP|M-SP10HXAH|M-SP7HXAH|M-SP10HXBH|M-SP8HXAH|M-SP8MXA",
        "MiTablet": "\\bMI PAD\\b|\\bHM NOTE 1W\\b",
        "NibiruTablet": "Nibiru M1|Nibiru Jupiter One",
        "NexoTablet": "NEXO NOVA|NEXO 10|NEXO AVIO|NEXO FREE|NEXO GO|NEXO EVO|NEXO 3G|NEXO SMART|NEXO KIDDO|NEXO MOBI",
        "LeaderTablet": "TBLT10Q|TBLT10I|TBL-10WDKB|TBL-10WDKBO2013|TBL-W230V2|TBL-W450|TBL-W500|SV572|TBLT7I|TBA-AC7-8G|TBLT79|TBL-8W16|TBL-10W32|TBL-10WKB|TBL-W100",
        "UbislateTablet": "UbiSlate[\\s]?7C",
        "PocketBookTablet": "Pocketbook",
        "KocasoTablet": "\\b(TB-1207)\\b",
        "HisenseTablet": "\\b(F5281|E2371)\\b",
        "Hudl": "Hudl HT7S3|Hudl 2",
        "TelstraTablet": "T-Hub2",
        "GenericTablet": "Android.*\\b97D\\b|Tablet(?!.*PC)|BNTV250A|MID-WCDMA|LogicPD Zoom2|\\bA7EB\\b|CatNova8|A1_07|CT704|CT1002|\\bM721\\b|rk30sdk|\\bEVOTAB\\b|M758A|ET904|ALUMIUM10|Smartfren Tab|Endeavour 1010|Tablet-PC-4|Tagi Tab|\\bM6pro\\b|CT1020W|arc 10HD|\\bTP750\\b|\\bQTAQZ3\\b|WVT101|TM1088|KT107"
    },
    "oss": {
        "AndroidOS": "Android",
        "BlackBerryOS": "blackberry|\\bBB10\\b|rim tablet os",
        "PalmOS": "PalmOS|avantgo|blazer|elaine|hiptop|palm|plucker|xiino",
        "SymbianOS": "Symbian|SymbOS|Series60|Series40|SYB-[0-9]+|\\bS60\\b",
        "WindowsMobileOS": "Windows CE.*(PPC|Smartphone|Mobile|[0-9]{3}x[0-9]{3})|Windows Mobile|Windows Phone [0-9.]+|WCE;",
        "WindowsPhoneOS": "Windows Phone 10.0|Windows Phone 8.1|Windows Phone 8.0|Windows Phone OS|XBLWP7|ZuneWP7|Windows NT 6.[23]; ARM;",
        "iOS": "\\biPhone.*Mobile|\\biPod|\\biPad|AppleCoreMedia",
        "iPadOS": "CPU OS 13",
        "MeeGoOS": "MeeGo",
        "MaemoOS": "Maemo",
        "JavaOS": "J2ME\/|\\bMIDP\\b|\\bCLDC\\b",
        "webOS": "webOS|hpwOS",
        "badaOS": "\\bBada\\b",
        "BREWOS": "BREW"
    },
    "uas": {
        "Chrome": "\\bCrMo\\b|CriOS|Android.*Chrome\/[.0-9]* (Mobile)?",
        "Dolfin": "\\bDolfin\\b",
        "Opera": "Opera.*Mini|Opera.*Mobi|Android.*Opera|Mobile.*OPR\/[0-9.]+$|Coast\/[0-9.]+",
        "Skyfire": "Skyfire",
        "Edge": "Mobile Safari\/[.0-9]* Edge",
        "IE": "IEMobile|MSIEMobile",
        "Firefox": "fennec|firefox.*maemo|(Mobile|Tablet).*Firefox|Firefox.*Mobile|FxiOS",
        "Bolt": "bolt",
        "TeaShark": "teashark",
        "Blazer": "Blazer",
        "Safari": "Version.*Mobile.*Safari|Safari.*Mobile|MobileSafari",
        "WeChat": "\\bMicroMessenger\\b",
        "UCBrowser": "UC.*Browser|UCWEB",
        "baiduboxapp": "baiduboxapp",
        "baidubrowser": "baidubrowser",
        "DiigoBrowser": "DiigoBrowser",
        "Mercury": "\\bMercury\\b",
        "ObigoBrowser": "Obigo",
        "NetFront": "NF-Browser",
        "GenericBrowser": "NokiaBrowser|OviBrowser|OneBrowser|TwonkyBeamBrowser|SEMC.*Browser|FlyFlow|Minimo|NetFront|Novarra-Vision|MQQBrowser|MicroMessenger",
        "PaleMoon": "Android.*PaleMoon|Mobile.*PaleMoon"
    },
    "props": {
        "Mobile": "Mobile\/[VER]",
        "Build": "Build\/[VER]",
        "Version": "Version\/[VER]",
        "VendorID": "VendorID\/[VER]",
        "iPad": "iPad.*CPU[a-z ]+[VER]",
        "iPhone": "iPhone.*CPU[a-z ]+[VER]",
        "iPod": "iPod.*CPU[a-z ]+[VER]",
        "Kindle": "Kindle\/[VER]",
        "Chrome": [
            "Chrome\/[VER]",
            "CriOS\/[VER]",
            "CrMo\/[VER]"
        ],
        "Coast": [
            "Coast\/[VER]"
        ],
        "Dolfin": "Dolfin\/[VER]",
        "Firefox": [
            "Firefox\/[VER]",
            "FxiOS\/[VER]"
        ],
        "Fennec": "Fennec\/[VER]",
        "Edge": "Edge\/[VER]",
        "IE": [
            "IEMobile\/[VER];",
            "IEMobile [VER]",
            "MSIE [VER];",
            "Trident\/[0-9.]+;.*rv:[VER]"
        ],
        "NetFront": "NetFront\/[VER]",
        "NokiaBrowser": "NokiaBrowser\/[VER]",
        "Opera": [
            " OPR\/[VER]",
            "Opera Mini\/[VER]",
            "Version\/[VER]"
        ],
        "Opera Mini": "Opera Mini\/[VER]",
        "Opera Mobi": "Version\/[VER]",
        "UCBrowser": [
            "UCWEB[VER]",
            "UC.*Browser\/[VER]"
        ],
        "MQQBrowser": "MQQBrowser\/[VER]",
        "MicroMessenger": "MicroMessenger\/[VER]",
        "baiduboxapp": "baiduboxapp\/[VER]",
        "baidubrowser": "baidubrowser\/[VER]",
        "SamsungBrowser": "SamsungBrowser\/[VER]",
        "Iron": "Iron\/[VER]",
        "Safari": [
            "Version\/[VER]",
            "Safari\/[VER]"
        ],
        "Skyfire": "Skyfire\/[VER]",
        "Tizen": "Tizen\/[VER]",
        "Webkit": "webkit[ \/][VER]",
        "PaleMoon": "PaleMoon\/[VER]",
        "Gecko": "Gecko\/[VER]",
        "Trident": "Trident\/[VER]",
        "Presto": "Presto\/[VER]",
        "Goanna": "Goanna\/[VER]",
        "iOS": " \\bi?OS\\b [VER][ ;]{1}",
        "Android": "Android [VER]",
        "BlackBerry": [
            "BlackBerry[\\w]+\/[VER]",
            "BlackBerry.*Version\/[VER]",
            "Version\/[VER]"
        ],
        "BREW": "BREW [VER]",
        "Java": "Java\/[VER]",
        "Windows Phone OS": [
            "Windows Phone OS [VER]",
            "Windows Phone [VER]"
        ],
        "Windows Phone": "Windows Phone [VER]",
        "Windows CE": "Windows CE\/[VER]",
        "Windows NT": "Windows NT [VER]",
        "Symbian": [
            "SymbianOS\/[VER]",
            "Symbian\/[VER]"
        ],
        "webOS": [
            "webOS\/[VER]",
            "hpwOS\/[VER];"
        ]
    },
    "utils": {
        "Bot": "Googlebot|facebookexternalhit|Google-AMPHTML|s~amp-validator|AdsBot-Google|Google Keyword Suggestion|Facebot|YandexBot|YandexMobileBot|bingbot|ia_archiver|AhrefsBot|Ezooms|GSLFbot|WBSearchBot|Twitterbot|TweetmemeBot|Twikle|PaperLiBot|Wotbox|UnwindFetchor|Exabot|MJ12bot|YandexImages|TurnitinBot|Pingdom|contentkingapp",
        "MobileBot": "Googlebot-Mobile|AdsBot-Google-Mobile|YahooSeeker\/M1A1-R2D2",
        "DesktopMode": "WPDesktop",
        "TV": "SonyDTV|HbbTV",
        "WebKit": "(webkit)[ \/]([\\w.]+)",
        "Console": "\\b(Nintendo|Nintendo WiiU|Nintendo 3DS|Nintendo Switch|PLAYSTATION|Xbox)\\b",
        "Watch": "SM-V700"
    }
};

    // following patterns come from http://detectmobilebrowsers.com/
    impl.detectMobileBrowsers = {
        fullPattern: /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i,
        shortPattern: /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i,
        tabletPattern: /android|ipad|playbook|silk/i
    };

    var hasOwnProp = Object.prototype.hasOwnProperty,
        isArray;

    impl.FALLBACK_PHONE = 'UnknownPhone';
    impl.FALLBACK_TABLET = 'UnknownTablet';
    impl.FALLBACK_MOBILE = 'UnknownMobile';

    isArray = ('isArray' in Array) ?
        Array.isArray : function (value) { return Object.prototype.toString.call(value) === '[object Array]'; };

    function equalIC(a, b) {
        return a != null && b != null && a.toLowerCase() === b.toLowerCase();
    }

    function containsIC(array, value) {
        var valueLC, i, len = array.length;
        if (!len || !value) {
            return false;
        }
        valueLC = value.toLowerCase();
        for (i = 0; i < len; ++i) {
            if (valueLC === array[i].toLowerCase()) {
                return true;
            }
        }
        return false;
    }

    function convertPropsToRegExp(object) {
        for (var key in object) {
            if (hasOwnProp.call(object, key)) {
                object[key] = new RegExp(object[key], 'i');
            }
        }
    }

    function prepareUserAgent(userAgent) {
        return (userAgent || '').substr(0, 500); // mitigate vulnerable to ReDoS
    }

    (function init() {
        var key, values, value, i, len, verPos, mobileDetectRules = impl.mobileDetectRules;
        for (key in mobileDetectRules.props) {
            if (hasOwnProp.call(mobileDetectRules.props, key)) {
                values = mobileDetectRules.props[key];
                if (!isArray(values)) {
                    values = [values];
                }
                len = values.length;
                for (i = 0; i < len; ++i) {
                    value = values[i];
                    verPos = value.indexOf('[VER]');
                    if (verPos >= 0) {
                        value = value.substring(0, verPos) + '([\\w._\\+]+)' + value.substring(verPos + 5);
                    }
                    values[i] = new RegExp(value, 'i');
                }
                mobileDetectRules.props[key] = values;
            }
        }
        convertPropsToRegExp(mobileDetectRules.oss);
        convertPropsToRegExp(mobileDetectRules.phones);
        convertPropsToRegExp(mobileDetectRules.tablets);
        convertPropsToRegExp(mobileDetectRules.uas);
        convertPropsToRegExp(mobileDetectRules.utils);

        // copy some patterns to oss0 which are tested first (see issue#15)
        mobileDetectRules.oss0 = {
            WindowsPhoneOS: mobileDetectRules.oss.WindowsPhoneOS,
            WindowsMobileOS: mobileDetectRules.oss.WindowsMobileOS
        };
    }());

    /**
     * Test userAgent string against a set of rules and find the first matched key.
     * @param {Object} rules (key is String, value is RegExp)
     * @param {String} userAgent the navigator.userAgent (or HTTP-Header 'User-Agent').
     * @returns {String|null} the matched key if found, otherwise <tt>null</tt>
     * @private
     */
    impl.findMatch = function(rules, userAgent) {
        for (var key in rules) {
            if (hasOwnProp.call(rules, key)) {
                if (rules[key].test(userAgent)) {
                    return key;
                }
            }
        }
        return null;
    };

    /**
     * Test userAgent string against a set of rules and return an array of matched keys.
     * @param {Object} rules (key is String, value is RegExp)
     * @param {String} userAgent the navigator.userAgent (or HTTP-Header 'User-Agent').
     * @returns {Array} an array of matched keys, may be empty when there is no match, but not <tt>null</tt>
     * @private
     */
    impl.findMatches = function(rules, userAgent) {
        var result = [];
        for (var key in rules) {
            if (hasOwnProp.call(rules, key)) {
                if (rules[key].test(userAgent)) {
                    result.push(key);
                }
            }
        }
        return result;
    };

    /**
     * Check the version of the given property in the User-Agent.
     *
     * @param {String} propertyName
     * @param {String} userAgent
     * @return {String} version or <tt>null</tt> if version not found
     * @private
     */
    impl.getVersionStr = function (propertyName, userAgent) {
        var props = impl.mobileDetectRules.props, patterns, i, len, match;
        if (hasOwnProp.call(props, propertyName)) {
            patterns = props[propertyName];
            len = patterns.length;
            for (i = 0; i < len; ++i) {
                match = patterns[i].exec(userAgent);
                if (match !== null) {
                    return match[1];
                }
            }
        }
        return null;
    };

    /**
     * Check the version of the given property in the User-Agent.
     * Will return a float number. (eg. 2_0 will return 2.0, 4.3.1 will return 4.31)
     *
     * @param {String} propertyName
     * @param {String} userAgent
     * @return {Number} version or <tt>NaN</tt> if version not found
     * @private
     */
    impl.getVersion = function (propertyName, userAgent) {
        var version = impl.getVersionStr(propertyName, userAgent);
        return version ? impl.prepareVersionNo(version) : NaN;
    };

    /**
     * Prepare the version number.
     *
     * @param {String} version
     * @return {Number} the version number as a floating number
     * @private
     */
    impl.prepareVersionNo = function (version) {
        var numbers;

        numbers = version.split(/[a-z._ \/\-]/i);
        if (numbers.length === 1) {
            version = numbers[0];
        }
        if (numbers.length > 1) {
            version = numbers[0] + '.';
            numbers.shift();
            version += numbers.join('');
        }
        return Number(version);
    };

    impl.isMobileFallback = function (userAgent) {
        return impl.detectMobileBrowsers.fullPattern.test(userAgent) ||
            impl.detectMobileBrowsers.shortPattern.test(userAgent.substr(0,4));
    };

    impl.isTabletFallback = function (userAgent) {
        return impl.detectMobileBrowsers.tabletPattern.test(userAgent);
    };

    impl.prepareDetectionCache = function (cache, userAgent, maxPhoneWidth) {
        if (cache.mobile !== undefined$1) {
            return;
        }
        var phone, tablet, phoneSized;

        // first check for stronger tablet rules, then phone (see issue#5)
        tablet = impl.findMatch(impl.mobileDetectRules.tablets, userAgent);
        if (tablet) {
            cache.mobile = cache.tablet = tablet;
            cache.phone = null;
            return; // unambiguously identified as tablet
        }

        phone = impl.findMatch(impl.mobileDetectRules.phones, userAgent);
        if (phone) {
            cache.mobile = cache.phone = phone;
            cache.tablet = null;
            return; // unambiguously identified as phone
        }

        // our rules haven't found a match -> try more general fallback rules
        if (impl.isMobileFallback(userAgent)) {
            phoneSized = MobileDetect.isPhoneSized(maxPhoneWidth);
            if (phoneSized === undefined$1) {
                cache.mobile = impl.FALLBACK_MOBILE;
                cache.tablet = cache.phone = null;
            } else if (phoneSized) {
                cache.mobile = cache.phone = impl.FALLBACK_PHONE;
                cache.tablet = null;
            } else {
                cache.mobile = cache.tablet = impl.FALLBACK_TABLET;
                cache.phone = null;
            }
        } else if (impl.isTabletFallback(userAgent)) {
            cache.mobile = cache.tablet = impl.FALLBACK_TABLET;
            cache.phone = null;
        } else {
            // not mobile at all!
            cache.mobile = cache.tablet = cache.phone = null;
        }
    };

    // t is a reference to a MobileDetect instance
    impl.mobileGrade = function (t) {
        // impl note:
        // To keep in sync w/ Mobile_Detect.php easily, the following code is tightly aligned to the PHP version.
        // When changes are made in Mobile_Detect.php, copy this method and replace:
        //     $this-> / t.
        //     self::MOBILE_GRADE_(.) / '$1'
        //     , self::VERSION_TYPE_FLOAT / (nothing)
        //     isIOS() / os('iOS')
        //     [reg] / (nothing)   <-- jsdelivr complaining about unescaped unicode character U+00AE
        var $isMobile = t.mobile() !== null;

        if (
            // Apple iOS 3.2-5.1 - Tested on the original iPad (4.3 / 5.0), iPad 2 (4.3), iPad 3 (5.1), original iPhone (3.1), iPhone 3 (3.2), 3GS (4.3), 4 (4.3 / 5.0), and 4S (5.1)
            t.os('iOS') && t.version('iPad')>=4.3 ||
            t.os('iOS') && t.version('iPhone')>=3.1 ||
            t.os('iOS') && t.version('iPod')>=3.1 ||

            // Android 2.1-2.3 - Tested on the HTC Incredible (2.2), original Droid (2.2), HTC Aria (2.1), Google Nexus S (2.3). Functional on 1.5 & 1.6 but performance may be sluggish, tested on Google G1 (1.5)
            // Android 3.1 (Honeycomb)  - Tested on the Samsung Galaxy Tab 10.1 and Motorola XOOM
            // Android 4.0 (ICS)  - Tested on a Galaxy Nexus. Note: transition performance can be poor on upgraded devices
            // Android 4.1 (Jelly Bean)  - Tested on a Galaxy Nexus and Galaxy 7
            ( t.version('Android')>2.1 && t.is('Webkit') ) ||

            // Windows Phone 7-7.5 - Tested on the HTC Surround (7.0) HTC Trophy (7.5), LG-E900 (7.5), Nokia Lumia 800
            t.version('Windows Phone OS')>=7.0 ||

            // Blackberry 7 - Tested on BlackBerry Torch 9810
            // Blackberry 6.0 - Tested on the Torch 9800 and Style 9670
            t.is('BlackBerry') && t.version('BlackBerry')>=6.0 ||
            // Blackberry Playbook (1.0-2.0) - Tested on PlayBook
            t.match('Playbook.*Tablet') ||

            // Palm WebOS (1.4-2.0) - Tested on the Palm Pixi (1.4), Pre (1.4), Pre 2 (2.0)
            ( t.version('webOS')>=1.4 && t.match('Palm|Pre|Pixi') ) ||
            // Palm WebOS 3.0  - Tested on HP TouchPad
            t.match('hp.*TouchPad') ||

            // Firefox Mobile (12 Beta) - Tested on Android 2.3 device
            ( t.is('Firefox') && t.version('Firefox')>=12 ) ||

            // Chrome for Android - Tested on Android 4.0, 4.1 device
            ( t.is('Chrome') && t.is('AndroidOS') && t.version('Android')>=4.0 ) ||

            // Skyfire 4.1 - Tested on Android 2.3 device
            ( t.is('Skyfire') && t.version('Skyfire')>=4.1 && t.is('AndroidOS') && t.version('Android')>=2.3 ) ||

            // Opera Mobile 11.5-12: Tested on Android 2.3
            ( t.is('Opera') && t.version('Opera Mobi')>11 && t.is('AndroidOS') ) ||

            // Meego 1.2 - Tested on Nokia 950 and N9
            t.is('MeeGoOS') ||

            // Tizen (pre-release) - Tested on early hardware
            t.is('Tizen') ||

            // Samsung Bada 2.0 - Tested on a Samsung Wave 3, Dolphin browser
            // @todo: more tests here!
            t.is('Dolfin') && t.version('Bada')>=2.0 ||

            // UC Browser - Tested on Android 2.3 device
            ( (t.is('UC Browser') || t.is('Dolfin')) && t.version('Android')>=2.3 ) ||

            // Kindle 3 and Fire  - Tested on the built-in WebKit browser for each
            ( t.match('Kindle Fire') ||
                t.is('Kindle') && t.version('Kindle')>=3.0 ) ||

            // Nook Color 1.4.1 - Tested on original Nook Color, not Nook Tablet
            t.is('AndroidOS') && t.is('NookTablet') ||

            // Chrome Desktop 11-21 - Tested on OS X 10.7 and Windows 7
            t.version('Chrome')>=11 && !$isMobile ||

            // Safari Desktop 4-5 - Tested on OS X 10.7 and Windows 7
            t.version('Safari')>=5.0 && !$isMobile ||

            // Firefox Desktop 4-13 - Tested on OS X 10.7 and Windows 7
            t.version('Firefox')>=4.0 && !$isMobile ||

            // Internet Explorer 7-9 - Tested on Windows XP, Vista and 7
            t.version('MSIE')>=7.0 && !$isMobile ||

            // Opera Desktop 10-12 - Tested on OS X 10.7 and Windows 7
            // @reference: http://my.opera.com/community/openweb/idopera/
            t.version('Opera')>=10 && !$isMobile

            ){
            return 'A';
        }

        if (
            t.os('iOS') && t.version('iPad')<4.3 ||
            t.os('iOS') && t.version('iPhone')<3.1 ||
            t.os('iOS') && t.version('iPod')<3.1 ||

            // Blackberry 5.0: Tested on the Storm 2 9550, Bold 9770
            t.is('Blackberry') && t.version('BlackBerry')>=5 && t.version('BlackBerry')<6 ||

            //Opera Mini (5.0-6.5) - Tested on iOS 3.2/4.3 and Android 2.3
            ( t.version('Opera Mini')>=5.0 && t.version('Opera Mini')<=6.5 &&
                (t.version('Android')>=2.3 || t.is('iOS')) ) ||

            // Nokia Symbian^3 - Tested on Nokia N8 (Symbian^3), C7 (Symbian^3), also works on N97 (Symbian^1)
            t.match('NokiaN8|NokiaC7|N97.*Series60|Symbian/3') ||

            // @todo: report this (tested on Nokia N71)
            t.version('Opera Mobi')>=11 && t.is('SymbianOS')
            ){
            return 'B';
        }

        if (
        // Blackberry 4.x - Tested on the Curve 8330
            t.version('BlackBerry')<5.0 ||
            // Windows Mobile - Tested on the HTC Leo (WinMo 5.2)
            t.match('MSIEMobile|Windows CE.*Mobile') || t.version('Windows Mobile')<=5.2

            ){
            return 'C';
        }

        //All older smartphone platforms and featurephones - Any device that doesn't support media queries
        //will receive the basic, C grade experience.
        return 'C';
    };

    impl.detectOS = function (ua) {
        return impl.findMatch(impl.mobileDetectRules.oss0, ua) ||
            impl.findMatch(impl.mobileDetectRules.oss, ua);
    };

    impl.getDeviceSmallerSide = function () {
        return window.screen.width < window.screen.height ?
            window.screen.width :
            window.screen.height;
    };

    /**
     * Constructor for MobileDetect object.
     * <br>
     * Such an object will keep a reference to the given user-agent string and cache most of the detect queries.<br>
     * <div style="background-color: #d9edf7; border: 1px solid #bce8f1; color: #3a87ad; padding: 14px; border-radius: 2px; margin-top: 20px">
     *     <strong>Find information how to download and install:</strong>
     *     <a href="https://github.com/hgoebl/mobile-detect.js/">github.com/hgoebl/mobile-detect.js/</a>
     * </div>
     *
     * @example <pre>
     *     var md = new MobileDetect(window.navigator.userAgent);
     *     if (md.mobile()) {
     *         location.href = (md.mobileGrade() === 'A') ? '/mobile/' : '/lynx/';
     *     }
     * </pre>
     *
     * @param {string} userAgent typically taken from window.navigator.userAgent or http_header['User-Agent']
     * @param {number} [maxPhoneWidth=600] <strong>only for browsers</strong> specify a value for the maximum
     *        width of smallest device side (in logical "CSS" pixels) until a device detected as mobile will be handled
     *        as phone.
     *        This is only used in cases where the device cannot be classified as phone or tablet.<br>
     *        See <a href="http://developer.android.com/guide/practices/screens_support.html">Declaring Tablet Layouts
     *        for Android</a>.<br>
     *        If you provide a value < 0, then this "fuzzy" check is disabled.
     * @constructor
     * @global
     */
    function MobileDetect(userAgent, maxPhoneWidth) {
        this.ua = prepareUserAgent(userAgent);
        this._cache = {};
        //600dp is typical 7" tablet minimum width
        this.maxPhoneWidth = maxPhoneWidth || 600;
    }

    MobileDetect.prototype = {
        constructor: MobileDetect,

        /**
         * Returns the detected phone or tablet type or <tt>null</tt> if it is not a mobile device.
         * <br>
         * For a list of possible return values see {@link MobileDetect#phone} and {@link MobileDetect#tablet}.<br>
         * <br>
         * If the device is not detected by the regular expressions from Mobile-Detect, a test is made against
         * the patterns of <a href="http://detectmobilebrowsers.com/">detectmobilebrowsers.com</a>. If this test
         * is positive, a value of <code>UnknownPhone</code>, <code>UnknownTablet</code> or
         * <code>UnknownMobile</code> is returned.<br>
         * When used in browser, the decision whether phone or tablet is made based on <code>screen.width/height</code>.<br>
         * <br>
         * When used server-side (node.js), there is no way to tell the difference between <code>UnknownTablet</code>
         * and <code>UnknownMobile</code>, so you will get <code>UnknownMobile</code> here.<br>
         * Be aware that since v1.0.0 in this special case you will get <code>UnknownMobile</code> only for:
         * {@link MobileDetect#mobile}, not for {@link MobileDetect#phone} and {@link MobileDetect#tablet}.
         * In versions before v1.0.0 all 3 methods returned <code>UnknownMobile</code> which was tedious to use.
         * <br>
         * In most cases you will use the return value just as a boolean.
         *
         * @returns {String} the key for the phone family or tablet family, e.g. "Nexus".
         * @function MobileDetect#mobile
         */
        mobile: function () {
            impl.prepareDetectionCache(this._cache, this.ua, this.maxPhoneWidth);
            return this._cache.mobile;
        },

        /**
         * Returns the detected phone type/family string or <tt>null</tt>.
         * <br>
         * The returned tablet (family or producer) is one of following keys:<br>
         * <br><tt>iPhone, BlackBerry, HTC, Nexus, Dell, Motorola, Samsung, LG, Sony, Asus,
         * NokiaLumia, Micromax, Palm, Vertu, Pantech, Fly, Wiko, iMobile, SimValley,
         * Wolfgang, Alcatel, Nintendo, Amoi, INQ, OnePlus, GenericPhone</tt><br>
         * <br>
         * If the device is not detected by the regular expressions from Mobile-Detect, a test is made against
         * the patterns of <a href="http://detectmobilebrowsers.com/">detectmobilebrowsers.com</a>. If this test
         * is positive, a value of <code>UnknownPhone</code> or <code>UnknownMobile</code> is returned.<br>
         * When used in browser, the decision whether phone or tablet is made based on <code>screen.width/height</code>.<br>
         * <br>
         * When used server-side (node.js), there is no way to tell the difference between <code>UnknownTablet</code>
         * and <code>UnknownMobile</code>, so you will get <code>null</code> here, while {@link MobileDetect#mobile}
         * will return <code>UnknownMobile</code>.<br>
         * Be aware that since v1.0.0 in this special case you will get <code>UnknownMobile</code> only for:
         * {@link MobileDetect#mobile}, not for {@link MobileDetect#phone} and {@link MobileDetect#tablet}.
         * In versions before v1.0.0 all 3 methods returned <code>UnknownMobile</code> which was tedious to use.
         * <br>
         * In most cases you will use the return value just as a boolean.
         *
         * @returns {String} the key of the phone family or producer, e.g. "iPhone"
         * @function MobileDetect#phone
         */
        phone: function () {
            impl.prepareDetectionCache(this._cache, this.ua, this.maxPhoneWidth);
            return this._cache.phone;
        },

        /**
         * Returns the detected tablet type/family string or <tt>null</tt>.
         * <br>
         * The returned tablet (family or producer) is one of following keys:<br>
         * <br><tt>iPad, NexusTablet, GoogleTablet, SamsungTablet, Kindle, SurfaceTablet,
         * HPTablet, AsusTablet, BlackBerryTablet, HTCtablet, MotorolaTablet, NookTablet,
         * AcerTablet, ToshibaTablet, LGTablet, FujitsuTablet, PrestigioTablet,
         * LenovoTablet, DellTablet, YarvikTablet, MedionTablet, ArnovaTablet,
         * IntensoTablet, IRUTablet, MegafonTablet, EbodaTablet, AllViewTablet,
         * ArchosTablet, AinolTablet, NokiaLumiaTablet, SonyTablet, PhilipsTablet,
         * CubeTablet, CobyTablet, MIDTablet, MSITablet, SMiTTablet, RockChipTablet,
         * FlyTablet, bqTablet, HuaweiTablet, NecTablet, PantechTablet, BronchoTablet,
         * VersusTablet, ZyncTablet, PositivoTablet, NabiTablet, KoboTablet, DanewTablet,
         * TexetTablet, PlaystationTablet, TrekstorTablet, PyleAudioTablet, AdvanTablet,
         * DanyTechTablet, GalapadTablet, MicromaxTablet, KarbonnTablet, AllFineTablet,
         * PROSCANTablet, YONESTablet, ChangJiaTablet, GUTablet, PointOfViewTablet,
         * OvermaxTablet, HCLTablet, DPSTablet, VistureTablet, CrestaTablet,
         * MediatekTablet, ConcordeTablet, GoCleverTablet, ModecomTablet, VoninoTablet,
         * ECSTablet, StorexTablet, VodafoneTablet, EssentielBTablet, RossMoorTablet,
         * iMobileTablet, TolinoTablet, AudioSonicTablet, AMPETablet, SkkTablet,
         * TecnoTablet, JXDTablet, iJoyTablet, FX2Tablet, XoroTablet, ViewsonicTablet,
         * VerizonTablet, OdysTablet, CaptivaTablet, IconbitTablet, TeclastTablet,
         * OndaTablet, JaytechTablet, BlaupunktTablet, DigmaTablet, EvolioTablet,
         * LavaTablet, AocTablet, MpmanTablet, CelkonTablet, WolderTablet, MediacomTablet,
         * MiTablet, NibiruTablet, NexoTablet, LeaderTablet, UbislateTablet,
         * PocketBookTablet, KocasoTablet, HisenseTablet, Hudl, TelstraTablet,
         * GenericTablet</tt><br>
         * <br>
         * If the device is not detected by the regular expressions from Mobile-Detect, a test is made against
         * the patterns of <a href="http://detectmobilebrowsers.com/">detectmobilebrowsers.com</a>. If this test
         * is positive, a value of <code>UnknownTablet</code> or <code>UnknownMobile</code> is returned.<br>
         * When used in browser, the decision whether phone or tablet is made based on <code>screen.width/height</code>.<br>
         * <br>
         * When used server-side (node.js), there is no way to tell the difference between <code>UnknownTablet</code>
         * and <code>UnknownMobile</code>, so you will get <code>null</code> here, while {@link MobileDetect#mobile}
         * will return <code>UnknownMobile</code>.<br>
         * Be aware that since v1.0.0 in this special case you will get <code>UnknownMobile</code> only for:
         * {@link MobileDetect#mobile}, not for {@link MobileDetect#phone} and {@link MobileDetect#tablet}.
         * In versions before v1.0.0 all 3 methods returned <code>UnknownMobile</code> which was tedious to use.
         * <br>
         * In most cases you will use the return value just as a boolean.
         *
         * @returns {String} the key of the tablet family or producer, e.g. "SamsungTablet"
         * @function MobileDetect#tablet
         */
        tablet: function () {
            impl.prepareDetectionCache(this._cache, this.ua, this.maxPhoneWidth);
            return this._cache.tablet;
        },

        /**
         * Returns the (first) detected user-agent string or <tt>null</tt>.
         * <br>
         * The returned user-agent is one of following keys:<br>
         * <br><tt>Chrome, Dolfin, Opera, Skyfire, Edge, IE, Firefox, Bolt, TeaShark, Blazer,
         * Safari, WeChat, UCBrowser, baiduboxapp, baidubrowser, DiigoBrowser, Mercury,
         * ObigoBrowser, NetFront, GenericBrowser, PaleMoon</tt><br>
         * <br>
         * In most cases calling {@link MobileDetect#userAgent} will be sufficient. But there are rare
         * cases where a mobile device pretends to be more than one particular browser. You can get the
         * list of all matches with {@link MobileDetect#userAgents} or check for a particular value by
         * providing one of the defined keys as first argument to {@link MobileDetect#is}.
         *
         * @returns {String} the key for the detected user-agent or <tt>null</tt>
         * @function MobileDetect#userAgent
         */
        userAgent: function () {
            if (this._cache.userAgent === undefined$1) {
                this._cache.userAgent = impl.findMatch(impl.mobileDetectRules.uas, this.ua);
            }
            return this._cache.userAgent;
        },

        /**
         * Returns all detected user-agent strings.
         * <br>
         * The array is empty or contains one or more of following keys:<br>
         * <br><tt>Chrome, Dolfin, Opera, Skyfire, Edge, IE, Firefox, Bolt, TeaShark, Blazer,
         * Safari, WeChat, UCBrowser, baiduboxapp, baidubrowser, DiigoBrowser, Mercury,
         * ObigoBrowser, NetFront, GenericBrowser, PaleMoon</tt><br>
         * <br>
         * In most cases calling {@link MobileDetect#userAgent} will be sufficient. But there are rare
         * cases where a mobile device pretends to be more than one particular browser. You can get the
         * list of all matches with {@link MobileDetect#userAgents} or check for a particular value by
         * providing one of the defined keys as first argument to {@link MobileDetect#is}.
         *
         * @returns {Array} the array of detected user-agent keys or <tt>[]</tt>
         * @function MobileDetect#userAgents
         */
        userAgents: function () {
            if (this._cache.userAgents === undefined$1) {
                this._cache.userAgents = impl.findMatches(impl.mobileDetectRules.uas, this.ua);
            }
            return this._cache.userAgents;
        },

        /**
         * Returns the detected operating system string or <tt>null</tt>.
         * <br>
         * The operating system is one of following keys:<br>
         * <br><tt>AndroidOS, BlackBerryOS, PalmOS, SymbianOS, WindowsMobileOS, WindowsPhoneOS,
         * iOS, iPadOS, MeeGoOS, MaemoOS, JavaOS, webOS, badaOS, BREWOS</tt><br>
         *
         * @returns {String} the key for the detected operating system.
         * @function MobileDetect#os
         */
        os: function () {
            if (this._cache.os === undefined$1) {
                this._cache.os = impl.detectOS(this.ua);
            }
            return this._cache.os;
        },

        /**
         * Get the version (as Number) of the given property in the User-Agent.
         * <br>
         * Will return a float number. (eg. 2_0 will return 2.0, 4.3.1 will return 4.31)
         *
         * @param {String} key a key defining a thing which has a version.<br>
         *        You can use one of following keys:<br>
         * <br><tt>Mobile, Build, Version, VendorID, iPad, iPhone, iPod, Kindle, Chrome, Coast,
         * Dolfin, Firefox, Fennec, Edge, IE, NetFront, NokiaBrowser, Opera, Opera Mini,
         * Opera Mobi, UCBrowser, MQQBrowser, MicroMessenger, baiduboxapp, baidubrowser,
         * SamsungBrowser, Iron, Safari, Skyfire, Tizen, Webkit, PaleMoon, Gecko, Trident,
         * Presto, Goanna, iOS, Android, BlackBerry, BREW, Java, Windows Phone OS, Windows
         * Phone, Windows CE, Windows NT, Symbian, webOS</tt><br>
         *
         * @returns {Number} the version as float or <tt>NaN</tt> if User-Agent doesn't contain this version.
         *          Be careful when comparing this value with '==' operator!
         * @function MobileDetect#version
         */
        version: function (key) {
            return impl.getVersion(key, this.ua);
        },

        /**
         * Get the version (as String) of the given property in the User-Agent.
         * <br>
         *
         * @param {String} key a key defining a thing which has a version.<br>
         *        You can use one of following keys:<br>
         * <br><tt>Mobile, Build, Version, VendorID, iPad, iPhone, iPod, Kindle, Chrome, Coast,
         * Dolfin, Firefox, Fennec, Edge, IE, NetFront, NokiaBrowser, Opera, Opera Mini,
         * Opera Mobi, UCBrowser, MQQBrowser, MicroMessenger, baiduboxapp, baidubrowser,
         * SamsungBrowser, Iron, Safari, Skyfire, Tizen, Webkit, PaleMoon, Gecko, Trident,
         * Presto, Goanna, iOS, Android, BlackBerry, BREW, Java, Windows Phone OS, Windows
         * Phone, Windows CE, Windows NT, Symbian, webOS</tt><br>
         *
         * @returns {String} the "raw" version as String or <tt>null</tt> if User-Agent doesn't contain this version.
         *
         * @function MobileDetect#versionStr
         */
        versionStr: function (key) {
            return impl.getVersionStr(key, this.ua);
        },

        /**
         * Global test key against userAgent, os, phone, tablet and some other properties of userAgent string.
         *
         * @param {String} key the key (case-insensitive) of a userAgent, an operating system, phone or
         *        tablet family.<br>
         *        For a complete list of possible values, see {@link MobileDetect#userAgent},
         *        {@link MobileDetect#os}, {@link MobileDetect#phone}, {@link MobileDetect#tablet}.<br>
         *        Additionally you have following keys:<br>
         * <br><tt>Bot, MobileBot, DesktopMode, TV, WebKit, Console, Watch</tt><br>
         *
         * @returns {boolean} <tt>true</tt> when the given key is one of the defined keys of userAgent, os, phone,
         *                    tablet or one of the listed additional keys, otherwise <tt>false</tt>
         * @function MobileDetect#is
         */
        is: function (key) {
            return containsIC(this.userAgents(), key) ||
                   equalIC(key, this.os()) ||
                   equalIC(key, this.phone()) ||
                   equalIC(key, this.tablet()) ||
                   containsIC(impl.findMatches(impl.mobileDetectRules.utils, this.ua), key);
        },

        /**
         * Do a quick test against navigator::userAgent.
         *
         * @param {String|RegExp} pattern the pattern, either as String or RegExp
         *                        (a string will be converted to a case-insensitive RegExp).
         * @returns {boolean} <tt>true</tt> when the pattern matches, otherwise <tt>false</tt>
         * @function MobileDetect#match
         */
        match: function (pattern) {
            if (!(pattern instanceof RegExp)) {
                pattern = new RegExp(pattern, 'i');
            }
            return pattern.test(this.ua);
        },

        /**
         * Checks whether the mobile device can be considered as phone regarding <code>screen.width</code>.
         * <br>
         * Obviously this method makes sense in browser environments only (not for Node.js)!
         * @param {number} [maxPhoneWidth] the maximum logical pixels (aka. CSS-pixels) to be considered as phone.<br>
         *        The argument is optional and if not present or falsy, the value of the constructor is taken.
         * @returns {boolean|undefined} <code>undefined</code> if screen size wasn't detectable, else <code>true</code>
         *          when screen.width is less or equal to maxPhoneWidth, otherwise <code>false</code>.<br>
         *          Will always return <code>undefined</code> server-side.
         */
        isPhoneSized: function (maxPhoneWidth) {
            return MobileDetect.isPhoneSized(maxPhoneWidth || this.maxPhoneWidth);
        },

        /**
         * Returns the mobile grade ('A', 'B', 'C').
         *
         * @returns {String} one of the mobile grades ('A', 'B', 'C').
         * @function MobileDetect#mobileGrade
         */
        mobileGrade: function () {
            if (this._cache.grade === undefined$1) {
                this._cache.grade = impl.mobileGrade(this);
            }
            return this._cache.grade;
        }
    };

    // environment-dependent
    if (typeof window !== 'undefined' && window.screen) {
        MobileDetect.isPhoneSized = function (maxPhoneWidth) {
            return maxPhoneWidth < 0 ? undefined$1 : impl.getDeviceSmallerSide() <= maxPhoneWidth;
        };
    } else {
        MobileDetect.isPhoneSized = function () {};
    }

    // should not be replaced by a completely new object - just overwrite existing methods
    MobileDetect._impl = impl;
    
    MobileDetect.version = '1.4.4 2019-09-21';

    return MobileDetect;
}); // end of call of define()
})((function (undefined$1) {
    if (typeof module !== 'undefined' && module.exports) {
        return function (factory) { module.exports = factory(); };
    } else if (typeof define === 'function' && define.amd) {
        return define;
    } else if (typeof window !== 'undefined') {
        return function (factory) { window.MobileDetect = factory(); };
    } else {
        // please file a bug if you get this error!
        throw new Error('unknown environment');
    }
})());

let timers = {};

function pollTimer(id, interval) {
  if (!(id in timers)) {
    timers[id] = time_ms();
  }

  if (time_ms() - timers[id] >= interval) {
    timers[id] = time_ms();
    return true;
  }

  return false;
}
window._pollTimer = pollTimer;

let mdetect = undefined;
let mret = undefined;

function isMobile() {
  if (mret === undefined) {
    mdetect = new MobileDetect(navigator.userAgent);
    let ret = mdetect.mobile();

    if (typeof ret === "string") {
      ret = ret.toLowerCase();
    }

    mret = ret;
  }

  return mret;
}

//window._isMobile = isMobile;

class SmartConsoleContext {
  constructor(name, console) {
    this.name = name;

    let c = [random(), random(), random()];
    let sum = Math.sqrt(c[0]*c[0] + c[1]*c[1] + c[2]*c[2]);
    sum = 255 / sum;

    let r = ~~(c[0]*sum);
    let g = ~~(c[1]*sum);
    let b = ~~(c[2]*sum);

    this.color = `rgb(${r},${g},${b})`;
    this.__console = console;

    this.timeInterval = 1500;

    this._last = undefined;
    this._data = {};
    this._data_length = 0;
    this.maxCache = 256;
  }


  hash(args) {
    let args2 = [];
    for (let i=0; i<args.length; i++) {
      args2.push(args[i]);
    }

    return JSON.stringify(args2);
  }

  clearCache() {
    this._data_length = 0;
    this._data = {};
    return this;
  }

  _getData(args) {
    let key = this.hash(args);

    if (!(key in this._data)) {
      if (this._data_length > this.maxCache) {
        this.clearCache();
      }

      this._data[key] = {
        time    : 0,
        count   : 0
      };

      this._data_length++;
    }

    return this._data[key];
  }

  _check(args) {
    let d = this._getData(args);
    let last = this.last;

    this.last = d;

    if (d !== last) {
      d.count = 0;
      d.time = time_ms();
      return true;
    }

    if (time_ms() - d.time > this.timeInterval) {
      //d.time = time_ms();
      //return true;
    }

    return false;
  }

  log() {

    if (this._check(arguments)) {
      window.console.log("%c", "color:"+this.color, ...arguments);
    }
  }

  warn() {
    if (this._check(arguments)) {
      window.console.log("%c"+this.name, "color : "+this.color, ...arguments);
    }
  }

  trace() {
    if (this._check(arguments)) {
      window.console.trace(...arguments);
    }
  }

}

class SmartConsole {
  constructor() {
    this.contexts = {};
  }

  context(name) {
    if (!(name in this.contexts)) {
      this.contexts[name] = new SmartConsoleContext(name, this);
    }

    return this.contexts[name];
  }

  log() {
    let c = this.context("default");
    return c.log(...arguments);
  }
  warn() {
    let c = this.context("default");
    return c.warn(...arguments);
  }
  trace() {
    let c = this.context("default");
    return c.trace(...arguments);
  }
  error() {
    let c = this.context("default");
    return c.error(...arguments);
  }
}

const console$1 = new SmartConsole();

window.tm = 0.0;

var EmptySlot = {};

function getClassParent(cls) {
  let p = cls.prototype;

  if (p) p = p.__proto__;
  if (p) p = p.constructor
  ;
  return p;
}

//make global for debugging purposes in console
window._getClassParent = getClassParent;

function list$1(iterable) {
  let ret = [];

  for (let item of iterable) {
    ret.push(item);
  }

  return ret;
}

/*
* returns all object keys, including
* inherited ones
* */
function getAllKeys(obj) {
  let keys = new Set();

  if (typeof obj !== "object") {
    throw new Error("must pass an object ot getAllKeys; object was: " + obj);
  }

  let p;

  while (p && p !== Object) {
    for (let k in Object.getOwnPropertyDescriptors(obj)) {
      if (k === "__proto__")
        continue;

      keys.add(k);
    }

    for (let k of Object.getOwnPropertySymbols(obj)) {
      keys.add(k);
    }

    p = p.__proto__;
  }

  let cls = obj.constructor;
  if (!cls)
    return keys;

  while (cls) {
    let proto = cls.prototype;
    if (!proto) {
      cls = getClassParent(cls);
      continue;
    }

    for (let k in proto) {
      keys.add(k);
    }

    for (let k in Object.getOwnPropertyDescriptors(proto)) {
      keys.add(k);
    }

    cls = getClassParent(cls);
  }

  return keys;
}

window._getAllKeys = getAllKeys;

function btoa$1(buf) {
  if (buf instanceof ArrayBuffer) {
    buf = new Uint8Array(buf);
  }

  if (typeof buf == "string" || buf instanceof String) {
    return window.btoa(buf);
  }

  var ret = "";
  for (var i=0; i<buf.length; i++) {
    ret += String.fromCharCode(buf[i]);
  }

  return btoa$1(ret);
};

function formatNumberUI(val, isInt=false, decimals=5) {
  if (val === undefined || val === null) {
    val = "0";
  } else if (isNaN(val)) {
    val = "NaN";
  } else if (val === -Infinity) {
    val = "-" + String.fromCharCode(0x221E);
  } else if (val === Infinity) {
    val = "+" + String.fromCharCode(0x221E);
  } else if (!isInt) {
    val = val.toFixed(decimals);
  } else {
    val = ""+Math.floor(val);
  }

  return val;
}

//window.formatNumberUI = formatNumberUI;

function atob$1(buf) {
  let data = window.atob(buf);
  let ret = [];

  for (let i=0; i<data.length; i++) {
    ret.push(data.charCodeAt(i));
  }

  return new Uint8Array(ret);
}

function time_ms() {
  if (window.performance)
    return window.performance.now();
  else
    return new Date().getMilliseconds();
}

function color2css$1(c) {
  var ret = c.length == 3 ? "rgb(" : "rgba(";

  for (var i=0; i<3; i++) {
    if (i > 0)
      ret += ",";

    ret += ~~(c[i]*255);
  }

  if (c.length == 4)
    ret += "," + c[3];
  ret += ")";

  return ret;
}

function merge(obja, objb) {
  return Object.assign({}, obja, objb);
  /*
  var ret = {};

  for (var k in obja) {
    ret[k] = obja[k];
  }

  for (var k in objb) {
    ret[k] = objb[k];
  }

  return ret;
  //*/
};

class cachering extends Array {
  constructor(func, size) {
    super();

    this.cur = 0;

    for (var i=0; i<size; i++) {
      this.push(func());
    }
  }

  static fromConstructor(cls, size) {
    var func = function() {
      return new cls();
    };

    return new cachering(func, size);
  }

  next() {
    var ret = this[this.cur];
    this.cur = (this.cur+1)%this.length;

    return ret;
  }
}

class SetIter {
  constructor(set) {
    this.set = set;
    this.i   = 0;
    this.ret = {done : false, value : undefined};
  }

  [Symbol.iterator]() {
    return this;
  }

  next() {
    var ret = this.ret;

    while (this.i < this.set.items.length && this.set.items[this.i] === EmptySlot) {
      this.i++;
    }

    if (this.i >= this.set.items.length) {
      ret.done = true;
      ret.value = undefined;

      return ret;
    }


    ret.value = this.set.items[this.i++];
    return ret;
  }
}

/**
 Set

 Stores objects in a set; each object is converted to a value via
 a [Symbol.keystr] method, and if that value already exists in the set
 then the object is not added.


* */
class set$1 {
  constructor(input) {
    this.items = [];
    this.keys = {};
    this.freelist = [];

    this.length = 0;

    if (typeof input == "string") {
      input = new String(input);
    }

    if (input != undefined) {
      if (Symbol.iterator in input) {
        for (var item of input) {
          this.add(item);
        }
      } else if ("forEach" in input) {
        input.forEach(function(item) {
          this.add(item);
        }, this);
      } else if (input instanceof Array) {
        for (var i=0; i<input.length; i++) {
          this.add(input[i]);
        }
      }
    }
  }

  [Symbol.iterator] () {
    return new SetIter(this);
  }

  clear() {
    this.items.length = 0;
    this.keys = {};
    this.freelist.length = 0;
    this.length = 0;

    return this;
  }

  copy() {
    let ret = new set$1();
    for (let item of this) {
      ret.add(item);
    }

    return ret;
  }

  add(item) {
    var key = item[Symbol.keystr]();

    if (key in this.keys) return;

    if (this.freelist.length > 0) {
      var i = this.freelist.pop();

      this.keys[key] = i;
      this.items[i] = item;
    } else {
      var i = this.items.length;

      this.keys[key] = i;
      this.items.push(item);
    }

    this.length++;
  }

  remove(item, ignore_existence) {
    var key = item[Symbol.keystr]();

    if (!(key in this.keys)) {
      if (!ignore_existence) {
        console$1.trace("Warning, item", item, "is not in set");
      }
      return;
    }

    var i = this.keys[key];
    this.freelist.push(i);
    this.items[i] = EmptySlot;

    delete this.keys[key];

    this.length--;
  }

  has(item) {
    return item[Symbol.keystr]() in this.keys;
  }

  forEach(func, thisvar) {
    for (var i=0; i<this.items.length; i++) {
      var item = this.items[i];

      if (item === EmptySlot)
        continue;

      thisvar != undefined ? func.call(thisvar, item) : func(item);
    }
  }
}

class HashIter {
  constructor(hash) {
    this.hash = hash;
    this.i = 0;
    this.ret = {done : false, value : undefined};
  }

  next() {
    var items = this.hash._items;

    if (this.i >= items.length) {
      this.ret.done = true;
      this.ret.value = undefined;

      return this.ret;
    }

    do {
      this.i += 2;
    } while (this.i < items.length && items[i] === _hash_null);

    return this.ret;
  }
}

var _hash_null = {};
class hashtable {
  constructor() {
    this._items = [];
    this._keys = {};
    this.length = 0;
  }

  [Symbol.iterator]() {
    return new HashIter(this);
  }

  set(key, val) {
    var key2 = key[Symbol.keystr]();

    var i;
    if (!(key2 in this._keys)) {
      i = this._items.length;

      try {
        this._items.push(0);
        this._items.push(0);
      } catch(error) {
        console$1.log(":::", this._items.length, key, key2, val);
        throw error;
      }

      this._keys[key2] = i;
      this.length++;
    } else {
      i = this._keys[key2];
    }

    this._items[i] = key;
    this._items[i+1] = val;
  }

  remove(key) {
    var key2 = key[Symbol.keystr]();

    if (!(key2 in this._keys)) {
      console$1.trace("Warning, key not in hashtable:", key, key2);
      return;
    }

    var i = this._keys[key2];

    this._items[i] = _hash_null;
    this._items[i+1] = _hash_null;

    delete this._keys[key2];
    this.length--;
  }

  has(key) {
    var key2 = key[Symbol.keystr]();

    return key2 in this._keys;
  }

  get(key) {
    var key2 = key[Symbol.keystr]();

    if (!(key2 in this._keys)) {
      console$1.trace("Warning, item not in hash", key, key2);
      return undefined;
    }

    return this._items[this._keys[key2]+1];
  }

  add(key, val) {
    return this.set(key, val);
  }

  keys() {
    var ret = [];

    for (var i=0; i<this._items.length; i += 2) {
      var key = this._items[i];

      if (key !== _hash_null) {
        ret.push(key);
      }
    }

    return ret;
  }

  values() {
    var ret = [];

    for (var i=0; i<this._items.length; i += 2) {
      var item = this._items[i+1];

      if (item !== _hash_null) {
        ret.push(item);
      }
    }

    return ret;
  }

  forEach(cb, thisvar) {
    if (thisvar == undefined)
      thisvar = self;

    for (var k in this._keys) {
      var i = this._keys[k];

      cb.call(thisvar, k, this._items[i]);
    }
  }
}

class IDGen {
  constructor() {
    this._cur = 1;
  }

  next() {
    return this._cur++;
  }

  copy() {
    let ret = new IDGen();
    ret._cur = this._cur;
    return ret;
  }

  max_cur(id) {
    this._cur = Math.max(this._cur, id+1);
  }

  toJSON() {
    return {
      _cur : this._cur
    };
  }

  static fromJSON(obj) {
    var ret = new IDGen();
    ret._cur = obj._cur;
    return ret;
  }
}

IDGen.STRUCT = `
IDGen {
  _cur : int;
}
`;
nstructjs.manager.add_class(IDGen);


function get_callstack(err) {
  var callstack = [];
  var isCallstackPopulated = false;

  var err_was_undefined = err == undefined;

  if (err == undefined) {
    try {
      _idontexist.idontexist+=0; //doesn't exist- that's the point
    } catch(err1) {
      err = err1;
    }
  }

  if (err != undefined) {
    if (err.stack) { //Firefox
      var lines = err.stack.split('\n');
      var len=lines.length;
      for (var i=0; i<len; i++) {
        if (1) {
          lines[i] = lines[i].replace(/@http\:\/\/.*\//, "|");
          var l = lines[i].split("|");
          lines[i] = l[1] + ": " + l[0];
          lines[i] = lines[i].trim();
          callstack.push(lines[i]);
        }
      }

      //Remove call to printStackTrace()
      if (err_was_undefined) {
        //callstack.shift();
      }
      isCallstackPopulated = true;
    }
    else if (window.opera && e.message) { //Opera
      var lines = err.message.split('\n');
      var len=lines.length;
      for (var i=0; i<len; i++) {
        if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
          var entry = lines[i];
          //Append next line also since it has the file info
          if (lines[i+1]) {
            entry += ' at ' + lines[i+1];
            i++;
          }
          callstack.push(entry);
        }
      }
      //Remove call to printStackTrace()
      if (err_was_undefined) {
        callstack.shift();
      }
      isCallstackPopulated = true;
    }
   }

    var limit = 24;
    if (!isCallstackPopulated) { //IE and Safari
      var currentFunction = arguments.callee.caller;
      var i = 0;
      while (currentFunction && i < 24) {
        var fn = currentFunction.toString();
        var fname = fn.substring(fn.indexOf("function") + 8, fn.indexOf('')) || 'anonymous';
        callstack.push(fname);
        currentFunction = currentFunction.caller;

        i++;
      }
    }

  return callstack;
}

function print_stack$1(err) {
  try {
    var cs = get_callstack(err);
  } catch (err2) {
    console$1.log("Could not fetch call stack.");
    return;
  }

  console$1.log("Callstack:");
  for (var i=0; i<cs.length; i++) {
    console$1.log(cs[i]);
  }
}

window.get_callstack = get_callstack;
window.print_stack = print_stack$1;

function fetch_file(path) {
    var url = location.origin + "/" + path;

    var req = new XMLHttpRequest(
    );

    return new Promise(function(accept, reject) {
      req.open("GET", url);
      req.onreadystatechange = function(e) {
        if (req.status == 200 && req.readyState == 4) {
            accept(req.response);
        } else if (req.status >= 400) {
          reject(req.status, req.statusText);
        }
      };
      req.send();
    });
}

//from:https://en.wikipedia.org/wiki/Mersenne_Twister
function _int32(x) {
  // Get the 31 least significant bits.
  return ~~(((1<<30)-1) & (~~x))
}

class MersenneRandom {
  constructor(seed) {
    // Initialize the index to 0
    this.index = 624;
    this.mt = new Uint32Array(624);

    this.seed(seed);
  }

  random() {
    return this.extract_number() / (1<<30);
  }

  seed(seed) {
    seed = ~~(seed*8192);

    // Initialize the index to 0
    this.index = 624;
    this.mt.fill(0, 0, this.mt.length);

    this.mt[0] = seed;  // Initialize the initial state to the seed

    for (var i=1; i<624; i++) {
      this.mt[i] = _int32(
        1812433253 * (this.mt[i - 1] ^ this.mt[i - 1] >> 30) + i);
    }
  }

  extract_number() {
    if (this.index >= 624)
      this.twist();

    var y = this.mt[this.index];

    // Right shift by 11 bits
    y = y ^ y >> 11;
    // Shift y left by 7 and take the bitwise and of 2636928640
    y = y ^ y << 7 & 2636928640;
    // Shift y left by 15 and take the bitwise and of y and 4022730752
    y = y ^ y << 15 & 4022730752;
    // Right shift by 18 bits
    y = y ^ y >> 18;

    this.index = this.index + 1;

    return _int32(y);
  }

  twist() {
    for (var i=0; i<624; i++) {
      // Get the most significant bit and add it to the less significant
      // bits of the next number
      var y = _int32((this.mt[i] & 0x80000000) +
        (this.mt[(i + 1) % 624] & 0x7fffffff));
      this.mt[i] = this.mt[(i + 397) % 624] ^ y >> 1;

      if (y % 2 != 0)
        this.mt[i] = this.mt[i] ^ 0x9908b0df;
    }

    this.index = 0;
  }
}

var _mt = new MersenneRandom(0);
function random() {
  return _mt.extract_number() / (1<<30);
}

function seed(n) {
//  console.trace("seed called");
  _mt.seed(n);
}

function strhash(str) {
  var hash = 0;

  for (var i=0; i<str.length; i++) {
    var ch = str.charCodeAt(i);

    hash = (hash ^ ch);
    hash = hash < 0 ? -hash : hash;

    hash = (hash*232344 + 4323543) & ((1<<19)-1);
  }

  return hash;
}

var hashsizes = [
  /*2, 5, 11, 19, 37, 67, 127, */223, 383, 653, 1117, 1901, 3251,
   5527, 9397, 15991, 27191, 46229, 78593, 133631, 227177, 38619,
  656587, 1116209, 1897561, 3225883, 5484019, 9322861, 15848867,
  26943089, 45803279, 77865577, 132371489, 225031553
];

var FTAKEN=0, FKEY= 1, FVAL= 2, FTOT=3;

class FastHash extends Array {
  constructor() {
    super();

    this.cursize = 0;
    this.size = hashsizes[this.cursize];
    this.used = 0;

    this.length = this.size*FTOT;
    this.fill(0, 0, this.length);
  }

  resize(size) {
    var table = this.slice(0, this.length);

    this.length = size*FTOT;
    this.size = size;
    this.fill(0, 0, this.length);

    for (var i=0; i<table.length; i += FTOT) {
      if (!table[i+FTAKEN]) continue;

      var key = table[i+FKEY], val = table[i+FVAL];
      this.set(key, val);
    }

    return this;
  }

  get(key) {
    var hash = typeof key == "string" ? strhash(key) : key;
    hash = typeof hash == "object" ? hash.valueOf() : hash;

    var probe = 0;

    var h = (hash + probe) % this.size;

    var _i = 0;
    while (_i++ < 50000 && this[h*FTOT+FTAKEN]) {
      if (this[h*FTOT+FKEY] ==  key) {
        return this[h*FTOT+FVAL];
      }

      probe = (probe+1)*2;
      h = (hash + probe) % this.size;
    }

    return undefined;
  }

  has(key) {
    var hash = typeof key == "string" ? strhash(key) : key;
    hash = typeof hash == "object" ? hash.valueOf() : hash;

    var probe = 0;

    var h = (hash + probe) % this.size;

    var _i = 0;
    while (_i++ < 50000 && this[h*FTOT+FTAKEN]) {
      if (this[h*FTOT+FKEY] ==  key) {
        return true;
      }

      probe = (probe+1)*2;
      h = (hash + probe) % this.size;
    }

    return false;
  }

  set(key, val) {
    var hash = typeof key == "string" ? strhash(key) : key;
    hash = typeof hash == "object" ? hash.valueOf() : hash;

    if (this.used > this.size/3) {
      this.resize(hashsizes[this.cursize++]);
    }

    var probe = 0;

    var h = (hash + probe) % this.size;

    var _i = 0;
    while (_i++ < 50000 && this[h*FTOT+FTAKEN]) {
      if (this[h*FTOT+FKEY] ==  key) {
        this[h*FTOT+FVAL] = val;
        return;
      }

      probe = (probe+1)*2;
      h = (hash + probe) % this.size;
    }

    this[h*FTOT+FTAKEN] = 1;
    this[h*FTOT+FKEY] = key;
    this[h*FTOT+FVAL] = val;

    this.used++;
  }
}

function test_fasthash() {
  var h = new FastHash();
  console$1.log("bleh hash:", strhash("bleh"));

  h.set("bleh", 1);
  h.set("bleh", 2);
  h.set("bleh", 3);

  console$1.log(h);

  return h;
};

class ImageReader {
  load_image() {
    let input = document.createElement("input");
    input.type = "file";

    let doaccept;

    let promise = new Promise((accept, reject) => {
      doaccept = accept;
    });

    input.addEventListener("change", function(e) {
      let files = this.files;
      console$1.log("got file", e, files);

      if (files.length == 0) return;

      var reader = new FileReader();
      var this2 = this;

      reader.onload = (e) => {
        let data = e.target.result;
        let image = new Image();

        image.src = data;
        image.onload = (e) => {
          console$1.log("got image", image.width, image.height);

          let canvas = document.createElement("canvas");
          let g = canvas.getContext("2d");

          canvas.width = image.width;
          canvas.height = image.height;

          g.drawImage(image, 0, 0);
          let idata = g.getImageData(0, 0, image.width, image.height);

          doaccept(idata);
        };
      };

      reader.readAsDataURL(files[0]);
    });

    input.click();
    return promise;
  }

  example() {
    this.load_image().then((idata) => {
      console$1.log(idata);
    });
  }
};

var util1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  timers: timers,
  pollTimer: pollTimer,
  isMobile: isMobile,
  SmartConsoleContext: SmartConsoleContext,
  SmartConsole: SmartConsole,
  console: console$1,
  getClassParent: getClassParent,
  list: list$1,
  getAllKeys: getAllKeys,
  btoa: btoa$1,
  formatNumberUI: formatNumberUI,
  atob: atob$1,
  time_ms: time_ms,
  color2css: color2css$1,
  merge: merge,
  cachering: cachering,
  SetIter: SetIter,
  set: set$1,
  HashIter: HashIter,
  hashtable: hashtable,
  IDGen: IDGen,
  print_stack: print_stack$1,
  fetch_file: fetch_file,
  MersenneRandom: MersenneRandom,
  random: random,
  seed: seed,
  strhash: strhash,
  FastHash: FastHash,
  test_fasthash: test_fasthash,
  ImageReader: ImageReader
});

var sin=Math.sin, cos=Math.cos, abs=Math.abs, log=Math.log,
    asin=Math.asin, exp=Math.exp, acos=Math.acos, fract=Math.fract,
    sign=Math.sign, tent=Math.tent, atan2=Math.atan2, atan=Math.atan,
    pow=Math.pow, sqrt=Math.sqrt, floor=Math.floor, ceil=Math.ceil,
    min=Math.min, max=Math.max, PI=Math.PI, E=2.718281828459045;

var Class = undefined;
var M_SQRT2=Math.sqrt(2.0);
var FLT_EPSILON=2.22e-16;
var DOT_NORM_SNAP_LIMIT = 0.00000000001;

var basic_funcs = {
  equals  : [["b"], "this[X] == b[X]", "&&"],
  /*dot is made manually so it's safe for acos
  dot     : [["b"], "this[X]*b[X]", "+"],
   */
  zero    : [[], "0.0;"],
  negate  : [[], "-this[X];"],
  combine : [["b", "u", "v"], "this[X]*u + this[X]*v;"],
  interp  : [["b", "t"], "this[X] + (b[X] - this[X])*t;"],
  add    : [["b"], "this[X] + b[X];"],
  addFac : [["b", "F"], "this[X] + b[X]*F;"],
  fract  : [[], "Math.fract(this[X]);"],
  sub    : [["b"], "this[X] - b[X];"],
  mul    : [["b"], "this[X] * b[X];"],
  div    : [["b"], "this[X] / b[X];"],
  mulScalar : [["b"], "this[X] * b;"],
  divScalar : [["b"], "this[X] / b;"],
  addScalar : [["b"], "this[X] + b;"],
  subScalar : [["b"], "this[X] - b;"],
  ceil      : [[], "Math.ceil(this[X])"],
  floor     : [[], "Math.floor(this[X])"],
  abs       : [[], "Math.abs(this[X])"],
  min       : [["b"], "Math.min(this[X], b[X])"],
  max       : [["b"], "Math.max(this[X], b[X])"],
  clamp     : [["MIN", "MAX"], "min(max(this[X], MAX), MIN)"],
};

function bounded_acos(fac) {
  if (fac<=-1.0)
    return Math.pi;
  else 
    if (fac>=1.0)
    return 0.0;
  else 
    return Math.acos(fac);
}

function saasin(fac) {
  if (fac<=-1.0)
    return -Math.pi/2.0;
  else 
    if (fac>=1.0)
    return Math.pi/2.0;
  else 
    return Math.asin(fac);
}

var $_v3nd_n1_normalizedDot;
var $_v3nd_n2_normalizedDot;
var $_v3nd4_n1_normalizedDot4;
var $_v3nd4_n2_normalizedDot4;

var HasCSSMatrix=false;
var HasCSSMatrixCopy=false;
var M_SQRT2=Math.sqrt(2.0);
var FLT_EPSILON=2.22e-16;
function internal_matrix() {
  this.m11 = 0.0;
  this.m12 = 0.0;
  this.m13 = 0.0;
  this.m14 = 0.0;
  this.m21 = 0.0;
  this.m22 = 0.0;
  this.m23 = 0.0;
  this.m24 = 0.0;
  this.m31 = 0.0;
  this.m32 = 0.0;
  this.m33 = 0.0;
  this.m34 = 0.0;
  this.m41 = 0.0;
  this.m42 = 0.0;
  this.m43 = 0.0;
  this.m44 = 0.0;
}

var lookat_cache_vs3;
var lookat_cache_vs4;
var makenormalcache;

class Matrix4 {
  constructor(m) {
    if (HasCSSMatrix)
      this.$matrix = new WebKitCSSMatrix;
    else 
      this.$matrix = new internal_matrix();
    this.isPersp = false;
    if (typeof m=='object') {
        if ("length" in m&&m.length>=16) {
            this.load(m);
            return ;
        }
        else 
          if (m instanceof Matrix4) {
            this.load(m);
            return ;
        }
    }
    this.makeIdentity();
  }

  clone() {
    return new Matrix4(this);
  }

  equals(m) {
    let m1 = this.$matrix;
    let m2 = m.$matrix;

    let ok = 1;

    ok = ok && m1.m11 == m2.m11;
    ok = ok && m1.m12 == m2.m12;
    ok = ok && m1.m13 == m2.m13;
    ok = ok && m1.m14 == m2.m14;

    ok = ok && m1.m21 == m2.m21;
    ok = ok && m1.m22 == m2.m22;
    ok = ok && m1.m23 == m2.m23;
    ok = ok && m1.m24 == m2.m24;

    ok = ok && m1.m31 == m2.m31;
    ok = ok && m1.m32 == m2.m32;
    ok = ok && m1.m33 == m2.m33;
    ok = ok && m1.m34 == m2.m34;

    ok = ok && m1.m41 == m2.m41;
    ok = ok && m1.m42 == m2.m42;
    ok = ok && m1.m43 == m2.m43;
    ok = ok && m1.m44 == m2.m44;

    return ok;
  }

  load() {
    if (arguments.length==1&&typeof arguments[0]=='object') {
        var matrix;
        if (arguments[0] instanceof Matrix4) {
            matrix = arguments[0].$matrix;
            this.isPersp = arguments[0].isPersp;
            this.$matrix.m11 = matrix.m11;
            this.$matrix.m12 = matrix.m12;
            this.$matrix.m13 = matrix.m13;
            this.$matrix.m14 = matrix.m14;
            this.$matrix.m21 = matrix.m21;
            this.$matrix.m22 = matrix.m22;
            this.$matrix.m23 = matrix.m23;
            this.$matrix.m24 = matrix.m24;
            this.$matrix.m31 = matrix.m31;
            this.$matrix.m32 = matrix.m32;
            this.$matrix.m33 = matrix.m33;
            this.$matrix.m34 = matrix.m34;
            this.$matrix.m41 = matrix.m41;
            this.$matrix.m42 = matrix.m42;
            this.$matrix.m43 = matrix.m43;
            this.$matrix.m44 = matrix.m44;
            return this;
        }
        else 
          matrix = arguments[0];
        if ("length" in matrix&&matrix.length>=16) {
            this.$matrix.m11 = matrix[0];
            this.$matrix.m12 = matrix[1];
            this.$matrix.m13 = matrix[2];
            this.$matrix.m14 = matrix[3];
            this.$matrix.m21 = matrix[4];
            this.$matrix.m22 = matrix[5];
            this.$matrix.m23 = matrix[6];
            this.$matrix.m24 = matrix[7];
            this.$matrix.m31 = matrix[8];
            this.$matrix.m32 = matrix[9];
            this.$matrix.m33 = matrix[10];
            this.$matrix.m34 = matrix[11];
            this.$matrix.m41 = matrix[12];
            this.$matrix.m42 = matrix[13];
            this.$matrix.m43 = matrix[14];
            this.$matrix.m44 = matrix[15];
            return this;
        }
    }
    
    this.makeIdentity();
    
    return this;
  }

  toJSON() {
    return {isPersp: this.isPersp, items: this.getAsArray()}
  }

  static fromJSON() {
    var mat=new Matrix4();
    mat.load(json.items);
    mat.isPersp = json.isPersp;
    return mat;
  }

  getAsArray() {
    return [this.$matrix.m11, this.$matrix.m12, this.$matrix.m13, this.$matrix.m14, this.$matrix.m21, this.$matrix.m22, this.$matrix.m23, this.$matrix.m24, this.$matrix.m31, this.$matrix.m32, this.$matrix.m33, this.$matrix.m34, this.$matrix.m41, this.$matrix.m42, this.$matrix.m43, this.$matrix.m44];
  }

  getAsFloat32Array() {
    if (HasCSSMatrixCopy) {
        var array=new Float32Array(16);
        this.$matrix.copy(array);
        return array;
    }
    return new Float32Array(this.getAsArray());
  }

  setUniform(ctx, loc, transpose) {
    if (Matrix4.setUniformArray==undefined) {
        Matrix4.setUniformWebGLArray = new Float32Array(16);
        Matrix4.setUniformArray = new Array(16);
    }
    if (HasCSSMatrixCopy)
      this.$matrix.copy(Matrix4.setUniformWebGLArray);
    else {
      Matrix4.setUniformArray[0] = this.$matrix.m11;
      Matrix4.setUniformArray[1] = this.$matrix.m12;
      Matrix4.setUniformArray[2] = this.$matrix.m13;
      Matrix4.setUniformArray[3] = this.$matrix.m14;
      Matrix4.setUniformArray[4] = this.$matrix.m21;
      Matrix4.setUniformArray[5] = this.$matrix.m22;
      Matrix4.setUniformArray[6] = this.$matrix.m23;
      Matrix4.setUniformArray[7] = this.$matrix.m24;
      Matrix4.setUniformArray[8] = this.$matrix.m31;
      Matrix4.setUniformArray[9] = this.$matrix.m32;
      Matrix4.setUniformArray[10] = this.$matrix.m33;
      Matrix4.setUniformArray[11] = this.$matrix.m34;
      Matrix4.setUniformArray[12] = this.$matrix.m41;
      Matrix4.setUniformArray[13] = this.$matrix.m42;
      Matrix4.setUniformArray[14] = this.$matrix.m43;
      Matrix4.setUniformArray[15] = this.$matrix.m44;
      Matrix4.setUniformWebGLArray.set(Matrix4.setUniformArray);
    }
    ctx.uniformMatrix4fv(loc, transpose, Matrix4.setUniformWebGLArray);
  }

  makeIdentity() {
    this.$matrix.m11 = 1;
    this.$matrix.m12 = 0;
    this.$matrix.m13 = 0;
    this.$matrix.m14 = 0;
    this.$matrix.m21 = 0;
    this.$matrix.m22 = 1;
    this.$matrix.m23 = 0;
    this.$matrix.m24 = 0;
    this.$matrix.m31 = 0;
    this.$matrix.m32 = 0;
    this.$matrix.m33 = 1;
    this.$matrix.m34 = 0;
    this.$matrix.m41 = 0;
    this.$matrix.m42 = 0;
    this.$matrix.m43 = 0;
    this.$matrix.m44 = 1;

    //drop isPersp
    this.isPersp = false;
  }

  transpose() {
    var tmp=this.$matrix.m12;
    this.$matrix.m12 = this.$matrix.m21;
    this.$matrix.m21 = tmp;
    tmp = this.$matrix.m13;
    this.$matrix.m13 = this.$matrix.m31;
    this.$matrix.m31 = tmp;
    tmp = this.$matrix.m14;
    this.$matrix.m14 = this.$matrix.m41;
    this.$matrix.m41 = tmp;
    tmp = this.$matrix.m23;
    this.$matrix.m23 = this.$matrix.m32;
    this.$matrix.m32 = tmp;
    tmp = this.$matrix.m24;
    this.$matrix.m24 = this.$matrix.m42;
    this.$matrix.m42 = tmp;
    tmp = this.$matrix.m34;
    this.$matrix.m34 = this.$matrix.m43;
    this.$matrix.m43 = tmp;
  }

  invert() {
    if (HasCSSMatrix) {
        this.$matrix = this.$matrix.inverse();
        return ;
    }
    var det=this._determinant4x4();
    if (Math.abs(det)<1e-08)
      return null;
    this._makeAdjoint();
    this.$matrix.m11/=det;
    this.$matrix.m12/=det;
    this.$matrix.m13/=det;
    this.$matrix.m14/=det;
    this.$matrix.m21/=det;
    this.$matrix.m22/=det;
    this.$matrix.m23/=det;
    this.$matrix.m24/=det;
    this.$matrix.m31/=det;
    this.$matrix.m32/=det;
    this.$matrix.m33/=det;
    this.$matrix.m34/=det;
    this.$matrix.m41/=det;
    this.$matrix.m42/=det;
    this.$matrix.m43/=det;
    this.$matrix.m44/=det;
  }

  translate(x, y, z) {
    if (typeof x=='object'&&"length" in x) {
        var t=x;
        x = t[0];
        y = t[1];
        z = t[2];
    }

    else {
      if (x===undefined)
        x = 0;
      if (y===undefined)
        y = 0;
      if (z===undefined)
        z = 0;
    }

    if (HasCSSMatrix) {
        this.$matrix = this.$matrix.translate(x, y, z);
        return ;
    }

    var matrix=new Matrix4();
    matrix.$matrix.m41 = x;
    matrix.$matrix.m42 = y;
    matrix.$matrix.m43 = z;
    this.multiply(matrix);
    return this;
  }

  scale(x, y, z, w=1.0) {
    if (typeof x=='object'&&"length" in x) {
        var t=x;
        x = t[0];
        y = t[1];
        z = t[2];
    } else {
      if (x===undefined)
        x = 1;

      if (z===undefined) {
          if (y===undefined) {
              y = x;
              z = x;
          } else {
            z = x;
          }
      } else if (y===undefined) {
        y = x;
      }
    }

    if (HasCSSMatrix) {
        this.$matrix = this.$matrix.scale(x, y, z);
        return ;
    }
    var matrix=new Matrix4();
    matrix.$matrix.m11 = x;
    matrix.$matrix.m22 = y;
    matrix.$matrix.m33 = z;
    matrix.$matrix.m44 = w;
    this.multiply(matrix);
  }
  
  euler_rotate(x, y, z, order) {
    if (order == undefined) 
      order = "xyz";
    else
      order = order.toLowerCase();

    if (y === undefined) {
      y = 0.0;
    }
    if (z === undefined) {
      z = 0.0;
    }

    var xmat = new Matrix4();
    var m = xmat.$matrix;
    
    var c = Math.cos(x), s = Math.sin(x);
    
    m.m22 = c; m.m23 = s;
    m.m32 = -s; m.m33 = c;
    
    var ymat = new Matrix4();
    c = Math.cos(y); s = Math.sin(y);
    var m = ymat.$matrix;
    
    m.m11 = c;  m.m13 = s;
    m.m31 = -s; m.m33 = c;
    
    ymat.multiply(xmat);

    var zmat = new Matrix4();
    c = Math.cos(z); s = Math.sin(z);
    var m = zmat.$matrix;
    
    m.m11 = c;  m.m12 = -s;
    m.m21 = s;  m.m22 = c;
    
    zmat.multiply(ymat);
    
    //console.log(""+ymat);
    this.preMultiply(zmat);
  }
  
  toString() {
    var s = "";
    var m = this.$matrix;
    
    function dec(d) {
      var ret = d.toFixed(3);
      
      if (ret[0] != "-") //make room for negative signs
        ret = " " + ret;
      return ret 
    }
    
    s  = dec(m.m11) +", " + dec(m.m12) + ", " + dec(m.m13) + ", " + dec(m.m14) + "\n";
    s += dec(m.m21) +", " + dec(m.m22) + ", " + dec(m.m23) + ", " + dec(m.m24) + "\n";
    s += dec(m.m31) +", " + dec(m.m32) + ", " + dec(m.m33) + ", " + dec(m.m34) + "\n";
    s += dec(m.m41) +", " + dec(m.m42) + ", " + dec(m.m43) + ", " + dec(m.m44) + "\n";
    
    return s
  }
  
  rotate(angle, x, y, z) {
    if (typeof x=='object'&&"length" in x) {
        var t=x;
        x = t[0];
        y = t[1];
        z = t[2];
    }
    else {
      if (arguments.length==1) {
          x = 0;
          y = 0;
          z = 1;
      }
      else 
        if (arguments.length==3) {
          this.rotate(angle, 1, 0, 0);
          this.rotate(x, 0, 1, 0);
          this.rotate(y, 0, 0, 1);
          return ;
      }
    }
    if (HasCSSMatrix) {
        this.$matrix = this.$matrix.rotateAxisAngle(x, y, z, angle);
        return ;
    }
    angle/=2;
    var sinA=Math.sin(angle);
    var cosA=Math.cos(angle);
    var sinA2=sinA*sinA;
    var len=Math.sqrt(x*x+y*y+z*z);
    if (len==0) {
        x = 0;
        y = 0;
        z = 1;
    }
    else 
      if (len!=1) {
        x/=len;
        y/=len;
        z/=len;
    }
    var mat=new Matrix4();
    if (x==1&&y==0&&z==0) {
        mat.$matrix.m11 = 1;
        mat.$matrix.m12 = 0;
        mat.$matrix.m13 = 0;
        mat.$matrix.m21 = 0;
        mat.$matrix.m22 = 1-2*sinA2;
        mat.$matrix.m23 = 2*sinA*cosA;
        mat.$matrix.m31 = 0;
        mat.$matrix.m32 = -2*sinA*cosA;
        mat.$matrix.m33 = 1-2*sinA2;
        mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
        mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
        mat.$matrix.m44 = 1;
    }
    else 
      if (x==0&&y==1&&z==0) {
        mat.$matrix.m11 = 1-2*sinA2;
        mat.$matrix.m12 = 0;
        mat.$matrix.m13 = -2*sinA*cosA;
        mat.$matrix.m21 = 0;
        mat.$matrix.m22 = 1;
        mat.$matrix.m23 = 0;
        mat.$matrix.m31 = 2*sinA*cosA;
        mat.$matrix.m32 = 0;
        mat.$matrix.m33 = 1-2*sinA2;
        mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
        mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
        mat.$matrix.m44 = 1;
    }
    else 
      if (x==0&&y==0&&z==1) {
        mat.$matrix.m11 = 1-2*sinA2;
        mat.$matrix.m12 = 2*sinA*cosA;
        mat.$matrix.m13 = 0;
        mat.$matrix.m21 = -2*sinA*cosA;
        mat.$matrix.m22 = 1-2*sinA2;
        mat.$matrix.m23 = 0;
        mat.$matrix.m31 = 0;
        mat.$matrix.m32 = 0;
        mat.$matrix.m33 = 1;
        mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
        mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
        mat.$matrix.m44 = 1;
    }
    else {
      var x2=x*x;
      var y2=y*y;
      var z2=z*z;
      mat.$matrix.m11 = 1-2*(y2+z2)*sinA2;
      mat.$matrix.m12 = 2*(x*y*sinA2+z*sinA*cosA);
      mat.$matrix.m13 = 2*(x*z*sinA2-y*sinA*cosA);
      mat.$matrix.m21 = 2*(y*x*sinA2-z*sinA*cosA);
      mat.$matrix.m22 = 1-2*(z2+x2)*sinA2;
      mat.$matrix.m23 = 2*(y*z*sinA2+x*sinA*cosA);
      mat.$matrix.m31 = 2*(z*x*sinA2+y*sinA*cosA);
      mat.$matrix.m32 = 2*(z*y*sinA2-x*sinA*cosA);
      mat.$matrix.m33 = 1-2*(x2+y2)*sinA2;
      mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
      mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
      mat.$matrix.m44 = 1;
    }
    this.multiply(mat);
  }

  //this is really like the lookAt method, isn't it.
  makeNormalMatrix(normal, up=undefined) {
    let n = makenormalcache.next().load(normal).normalize();

    if (up === undefined) {
      up = makenormalcache.next().zero();

      if (Math.abs(n[2]) > 0.95) {
        up[1] = 1.0;
      } else {
        up[2] = 1.0;
      }
    }

    let x = makenormalcache.next();
    let y = makenormalcache.next();

    x.load(n).cross(up).normalize();
    y.load(x).cross(n).normalize();
    //y.negate();

    this.makeIdentity();
    let m = this.$matrix;

    m.m11 = x[0];
    m.m12 = x[1];
    m.m13 = x[2];

    m.m21 = y[0];
    m.m22 = y[1];
    m.m23 = y[2];

    m.m31 = n[0];
    m.m32 = n[1];
    m.m33 = n[2];
    m.m44 = 1.0;

    return this;
  }

  preMultiply(mat) {
    var tmp = new Matrix4();
    
    tmp.load(mat);
    tmp.multiply(this);
    
    this.load(tmp);
  }
  
  multiply(mat) {
    if (HasCSSMatrix) {
        this.$matrix = this.$matrix.multiply(mat.$matrix);
        return ;
    }
    
    var m11=(mat.$matrix.m11*this.$matrix.m11+mat.$matrix.m12*this.$matrix.m21+mat.$matrix.m13*this.$matrix.m31+mat.$matrix.m14*this.$matrix.m41);
    var m12=(mat.$matrix.m11*this.$matrix.m12+mat.$matrix.m12*this.$matrix.m22+mat.$matrix.m13*this.$matrix.m32+mat.$matrix.m14*this.$matrix.m42);
    var m13=(mat.$matrix.m11*this.$matrix.m13+mat.$matrix.m12*this.$matrix.m23+mat.$matrix.m13*this.$matrix.m33+mat.$matrix.m14*this.$matrix.m43);
    var m14=(mat.$matrix.m11*this.$matrix.m14+mat.$matrix.m12*this.$matrix.m24+mat.$matrix.m13*this.$matrix.m34+mat.$matrix.m14*this.$matrix.m44);
    var m21=(mat.$matrix.m21*this.$matrix.m11+mat.$matrix.m22*this.$matrix.m21+mat.$matrix.m23*this.$matrix.m31+mat.$matrix.m24*this.$matrix.m41);
    var m22=(mat.$matrix.m21*this.$matrix.m12+mat.$matrix.m22*this.$matrix.m22+mat.$matrix.m23*this.$matrix.m32+mat.$matrix.m24*this.$matrix.m42);
    var m23=(mat.$matrix.m21*this.$matrix.m13+mat.$matrix.m22*this.$matrix.m23+mat.$matrix.m23*this.$matrix.m33+mat.$matrix.m24*this.$matrix.m43);
    var m24=(mat.$matrix.m21*this.$matrix.m14+mat.$matrix.m22*this.$matrix.m24+mat.$matrix.m23*this.$matrix.m34+mat.$matrix.m24*this.$matrix.m44);
    var m31=(mat.$matrix.m31*this.$matrix.m11+mat.$matrix.m32*this.$matrix.m21+mat.$matrix.m33*this.$matrix.m31+mat.$matrix.m34*this.$matrix.m41);
    var m32=(mat.$matrix.m31*this.$matrix.m12+mat.$matrix.m32*this.$matrix.m22+mat.$matrix.m33*this.$matrix.m32+mat.$matrix.m34*this.$matrix.m42);
    var m33=(mat.$matrix.m31*this.$matrix.m13+mat.$matrix.m32*this.$matrix.m23+mat.$matrix.m33*this.$matrix.m33+mat.$matrix.m34*this.$matrix.m43);
    var m34=(mat.$matrix.m31*this.$matrix.m14+mat.$matrix.m32*this.$matrix.m24+mat.$matrix.m33*this.$matrix.m34+mat.$matrix.m34*this.$matrix.m44);
    var m41=(mat.$matrix.m41*this.$matrix.m11+mat.$matrix.m42*this.$matrix.m21+mat.$matrix.m43*this.$matrix.m31+mat.$matrix.m44*this.$matrix.m41);
    var m42=(mat.$matrix.m41*this.$matrix.m12+mat.$matrix.m42*this.$matrix.m22+mat.$matrix.m43*this.$matrix.m32+mat.$matrix.m44*this.$matrix.m42);
    var m43=(mat.$matrix.m41*this.$matrix.m13+mat.$matrix.m42*this.$matrix.m23+mat.$matrix.m43*this.$matrix.m33+mat.$matrix.m44*this.$matrix.m43);
    var m44=(mat.$matrix.m41*this.$matrix.m14+mat.$matrix.m42*this.$matrix.m24+mat.$matrix.m43*this.$matrix.m34+mat.$matrix.m44*this.$matrix.m44);
    this.$matrix.m11 = m11;
    this.$matrix.m12 = m12;
    this.$matrix.m13 = m13;
    this.$matrix.m14 = m14;
    this.$matrix.m21 = m21;
    this.$matrix.m22 = m22;
    this.$matrix.m23 = m23;
    this.$matrix.m24 = m24;
    this.$matrix.m31 = m31;
    this.$matrix.m32 = m32;
    this.$matrix.m33 = m33;
    this.$matrix.m34 = m34;
    this.$matrix.m41 = m41;
    this.$matrix.m42 = m42;
    this.$matrix.m43 = m43;
    this.$matrix.m44 = m44;
  }

  divide(divisor) {
    this.$matrix.m11/=divisor;
    this.$matrix.m12/=divisor;
    this.$matrix.m13/=divisor;
    this.$matrix.m14/=divisor;
    this.$matrix.m21/=divisor;
    this.$matrix.m22/=divisor;
    this.$matrix.m23/=divisor;
    this.$matrix.m24/=divisor;
    this.$matrix.m31/=divisor;
    this.$matrix.m32/=divisor;
    this.$matrix.m33/=divisor;
    this.$matrix.m34/=divisor;
    this.$matrix.m41/=divisor;
    this.$matrix.m42/=divisor;
    this.$matrix.m43/=divisor;
    this.$matrix.m44/=divisor;
  }

  ortho(left, right, bottom, top, near, far) {
    console.warn("Matrix4.ortho() is deprecated, use .orthographic() instead");

    var tx=(left+right)/(left-right);
    var ty=(top+bottom)/(top-bottom);
    var tz=(far+near)/(far-near);
    var matrix=new Matrix4();
    matrix.$matrix.m11 = 2/(left-right);
    matrix.$matrix.m12 = 0;
    matrix.$matrix.m13 = 0;
    matrix.$matrix.m14 = 0;
    matrix.$matrix.m21 = 0;
    matrix.$matrix.m22 = 2/(top-bottom);
    matrix.$matrix.m23 = 0;
    matrix.$matrix.m24 = 0;
    matrix.$matrix.m31 = 0;
    matrix.$matrix.m32 = 0;
    matrix.$matrix.m33 = -2/(far-near);
    matrix.$matrix.m34 = 0;
    matrix.$matrix.m41 = tx;
    matrix.$matrix.m42 = ty;
    matrix.$matrix.m43 = tz;
    matrix.$matrix.m44 = 1;
    this.multiply(matrix);
  }

  frustum(left, right, bottom, top, near, far) {
    var matrix=new Matrix4();
    var A=(right+left)/(right-left);
    var B=(top+bottom)/(top-bottom);
    var C=-(far+near)/(far-near);
    var D=-(2*far*near)/(far-near);
    matrix.$matrix.m11 = (2*near)/(right-left);
    matrix.$matrix.m12 = 0;
    matrix.$matrix.m13 = 0;
    matrix.$matrix.m14 = 0;
    matrix.$matrix.m21 = 0;
    matrix.$matrix.m22 = 2*near/(top-bottom);
    matrix.$matrix.m23 = 0;
    matrix.$matrix.m24 = 0;
    matrix.$matrix.m31 = A;
    matrix.$matrix.m32 = B;
    matrix.$matrix.m33 = C;
    matrix.$matrix.m34 = -1;
    matrix.$matrix.m41 = 0;
    matrix.$matrix.m42 = 0;
    matrix.$matrix.m43 = D;
    matrix.$matrix.m44 = 0;
    this.isPersp = true;
    this.multiply(matrix);
  }

  orthographic(scale, aspect, near, far) {
    let mat = new Matrix4();

    let zscale = far - near;

    mat.scale(2.0/aspect, 2.0, -1.0/scale/zscale, 1.0/scale);
    mat.translate(0.0, 0.0, 0.5*zscale - near);

    this.isPersp = true; //we still make use of homogenous divide
    this.multiply(mat);
    return mat;
  }

  perspective(fovy, aspect, zNear, zFar) {
    var top=Math.tan(fovy*Math.PI/360)*zNear;
    var bottom=-top;
    var left=aspect*bottom;
    var right=aspect*top;
    this.frustum(left, right, bottom, top, zNear, zFar);
  }

  lookat(pos, target, up) {
    var matrix=new Matrix4();
    
    var vec = lookat_cache_vs3.next().load(pos).sub(target);
    var len = vec.vectorLength();
    vec.normalize();
    
    var zvec = vec;
    var yvec = lookat_cache_vs3.next().load(up).normalize();
    var xvec = lookat_cache_vs3.next().load(yvec).cross(zvec).normalize();
    
    //*

    matrix.$matrix.m11 = xvec[0];
    matrix.$matrix.m12 = yvec[0];
    matrix.$matrix.m13 = zvec[0];
    matrix.$matrix.m14 = 0;
    matrix.$matrix.m21 = xvec[1];
    matrix.$matrix.m22 = yvec[1];
    matrix.$matrix.m23 = zvec[1];
    matrix.$matrix.m24 = 0;
    matrix.$matrix.m31 = xvec[2];
    matrix.$matrix.m32 = yvec[2];
    matrix.$matrix.m33 = zvec[2];

    //*
    matrix.$matrix.m11 = xvec[0];
    matrix.$matrix.m12 = xvec[1];
    matrix.$matrix.m13 = xvec[2];
    matrix.$matrix.m14 = 0;
    matrix.$matrix.m21 = yvec[0];
    matrix.$matrix.m22 = yvec[1];
    matrix.$matrix.m23 = yvec[2];
    matrix.$matrix.m24 = 0;
    matrix.$matrix.m31 = zvec[0];
    matrix.$matrix.m32 = zvec[1];
    matrix.$matrix.m33 = zvec[2];
    matrix.$matrix.m34 = 0;
    matrix.$matrix.m41 = pos[0];
    matrix.$matrix.m42 = pos[1];
    matrix.$matrix.m43 = pos[2];
    matrix.$matrix.m44 = 1;
    //*/
  
    this.multiply(matrix);
  }

  makeRotationOnly() {
    var m = this.$matrix;
    
    m.m41 = m.m42 = m.m43 = 0.0;
    m.m44 = 1.0;
    
    return this;
  }

  decompose(_translate, _rotate, _scale, _skew, _perspective) {
    if (this.$matrix.m44==0)
      return false;
    
    var translate, rotate, scale, skew, perspective;
    var translate=(_translate==undefined||!("length" in _translate)) ? new Vector3 : _translate;
    var rotate=(_rotate==undefined||!("length" in _rotate)) ? new Vector3 : _rotate;
    var scale=(_scale==undefined||!("length" in _scale)) ? new Vector3 : _scale;
    var skew=(_skew==undefined||!("length" in _skew)) ? new Vector3 : _skew;
    var perspective=(_perspective==undefined||!("length" in _perspective)) ? new Array(4) : _perspective;
    var matrix=new Matrix4(this);
    matrix.divide(matrix.$matrix.m44);
    var perspectiveMatrix=new Matrix4(matrix);
    perspectiveMatrix.$matrix.m14 = 0;
    perspectiveMatrix.$matrix.m24 = 0;
    perspectiveMatrix.$matrix.m34 = 0;
    perspectiveMatrix.$matrix.m44 = 1;
    if (perspectiveMatrix._determinant4x4()==0)
      return false;
      
    if (matrix.$matrix.m14!=0||matrix.$matrix.m24!=0||matrix.$matrix.m34!=0) {
        var rightHandSide=[matrix.$matrix.m14, matrix.$matrix.m24, matrix.$matrix.m34, matrix.$matrix.m44];
        var inversePerspectiveMatrix=new Matrix4(perspectiveMatrix);
        inversePerspectiveMatrix.invert();
        var transposedInversePerspectiveMatrix=new Matrix4(inversePerspectiveMatrix);
        transposedInversePerspectiveMatrix.transpose();
        
        var v4 = new Vector3(rightHandSide);
        v4.multVecMatrix(transposedInversePerspectiveMatrix);
        
        perspective[0] = v4[0];
        perspective[1] = v4[1];
        perspective[2] = v4[2];
        perspective[3] = v4[3];
        
        matrix.$matrix.m14 = matrix.$matrix.m24 = matrix.$matrix.m34 = 0;
        matrix.$matrix.m44 = 1;
    }
    else {
      perspective[0] = perspective[1] = perspective[2] = 0;
      perspective[3] = 1;
    }
    translate[0] = matrix.$matrix.m41;
    matrix.$matrix.m41 = 0;
    translate[1] = matrix.$matrix.m42;
    matrix.$matrix.m42 = 0;
    translate[2] = matrix.$matrix.m43;
    matrix.$matrix.m43 = 0;
    var row0=new Vector3([matrix.$matrix.m11, matrix.$matrix.m12, matrix.$matrix.m13]);
    var row1=new Vector3([matrix.$matrix.m21, matrix.$matrix.m22, matrix.$matrix.m23]);
    var row2=new Vector3([matrix.$matrix.m31, matrix.$matrix.m32, matrix.$matrix.m33]);
    scale[0] = row0.vectorLength();
    row0.div(scale[0]);
    skew[0] = row0.dot(row1);
    row1.combine(row0, 1.0, -skew[0]);
    scale[1] = row1.vectorLength();
    row1.div(scale[1]);
    skew[0]/=scale[1];
    skew[1] = row1.dot(row2);
    row2.combine(row0, 1.0, -skew[1]);
    skew[2] = row1.dot(row2);
    row2.combine(row1, 1.0, -skew[2]);
    scale[2] = row2.vectorLength();
    row2.div(scale[2]);
    skew[1]/=scale[2];
    skew[2]/=scale[2];
    var pdum3=new Vector3(row1);
    pdum3.cross(row2);
    if (row0.dot(pdum3)<0) {
        for (var i=0; i<3; i++) {
            scale[i]*=-1;
            row[0][i]*=-1;
            row[1][i]*=-1;
            row[2][i]*=-1;
        }
    }
    rotate[1] = Math.asin(-row0[2]);
    if (Math.cos(rotate[1])!=0) {
        rotate[0] = Math.atan2(row1[2], row2[2]);
        rotate[2] = Math.atan2(row0[1], row0[0]);
    }
    else {
      rotate[0] = Math.atan2(-row2[0], row1[1]);
      rotate[2] = 0;
    }
    var rad2deg=180/Math.PI;
    rotate[0]*=rad2deg;
    rotate[1]*=rad2deg;
    rotate[2]*=rad2deg;
    return true;
  }

  _determinant2x2(a, b, c, d) {
    return a*d-b*c;
  }

  _determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3) {
    return a1*this._determinant2x2(b2, b3, c2, c3)-b1*this._determinant2x2(a2, a3, c2, c3)+c1*this._determinant2x2(a2, a3, b2, b3);
  }

  _determinant4x4() {
    var a1=this.$matrix.m11;
    var b1=this.$matrix.m12;
    var c1=this.$matrix.m13;
    var d1=this.$matrix.m14;
    var a2=this.$matrix.m21;
    var b2=this.$matrix.m22;
    var c2=this.$matrix.m23;
    var d2=this.$matrix.m24;
    var a3=this.$matrix.m31;
    var b3=this.$matrix.m32;
    var c3=this.$matrix.m33;
    var d3=this.$matrix.m34;
    var a4=this.$matrix.m41;
    var b4=this.$matrix.m42;
    var c4=this.$matrix.m43;
    var d4=this.$matrix.m44;
    return a1*this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4)-b1*this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4)+c1*this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4)-d1*this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
  }

  _makeAdjoint() {
    var a1=this.$matrix.m11;
    var b1=this.$matrix.m12;
    var c1=this.$matrix.m13;
    var d1=this.$matrix.m14;
    var a2=this.$matrix.m21;
    var b2=this.$matrix.m22;
    var c2=this.$matrix.m23;
    var d2=this.$matrix.m24;
    var a3=this.$matrix.m31;
    var b3=this.$matrix.m32;
    var c3=this.$matrix.m33;
    var d3=this.$matrix.m34;
    var a4=this.$matrix.m41;
    var b4=this.$matrix.m42;
    var c4=this.$matrix.m43;
    var d4=this.$matrix.m44;
    this.$matrix.m11 = this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4);
    this.$matrix.m21 = -this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4);
    this.$matrix.m31 = this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4);
    this.$matrix.m41 = -this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
    this.$matrix.m12 = -this._determinant3x3(b1, b3, b4, c1, c3, c4, d1, d3, d4);
    this.$matrix.m22 = this._determinant3x3(a1, a3, a4, c1, c3, c4, d1, d3, d4);
    this.$matrix.m32 = -this._determinant3x3(a1, a3, a4, b1, b3, b4, d1, d3, d4);
    this.$matrix.m42 = this._determinant3x3(a1, a3, a4, b1, b3, b4, c1, c3, c4);
    this.$matrix.m13 = this._determinant3x3(b1, b2, b4, c1, c2, c4, d1, d2, d4);
    this.$matrix.m23 = -this._determinant3x3(a1, a2, a4, c1, c2, c4, d1, d2, d4);
    this.$matrix.m33 = this._determinant3x3(a1, a2, a4, b1, b2, b4, d1, d2, d4);
    this.$matrix.m43 = -this._determinant3x3(a1, a2, a4, b1, b2, b4, c1, c2, c4);
    this.$matrix.m14 = -this._determinant3x3(b1, b2, b3, c1, c2, c3, d1, d2, d3);
    this.$matrix.m24 = this._determinant3x3(a1, a2, a3, c1, c2, c3, d1, d2, d3);
    this.$matrix.m34 = -this._determinant3x3(a1, a2, a3, b1, b2, b3, d1, d2, d3);
    this.$matrix.m44 = this._determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3);
  }

  loadSTRUCT(reader) {
    reader(this);
    
    this.load(this.mat);
    delete this.mat;
  }
}

Matrix4.STRUCT = `
mat4 {
  mat      : array(float) | obj.getAsArray();
  isPersp  : int | obj.isPersp;
}
`;
nstructjs.manager.add_class(Matrix4);

function make_norm_safe_dot(cls) {
  var _dot = cls.prototype.dot;
  
  cls.prototype._dot = _dot;
  cls.prototype.dot = function(b) {
    var ret = _dot.call(this, b);
    
    if (ret >= 1.0-DOT_NORM_SNAP_LIMIT && ret <= 1.0+DOT_NORM_SNAP_LIMIT)
      return 1.0;
    if (ret >= -1.0-DOT_NORM_SNAP_LIMIT && ret <= -1.0+DOT_NORM_SNAP_LIMIT)
      return -1.0;
      
    return ret;
  };
}

class BaseVector extends Array {
  constructor() {
    super();
    
    //this.xyzw = this.init_swizzle(4);
    //this.xyz = this.init_swizzle(3);
    //this.xy = this.init_swizzle(2);
  }

  copy() {
    return new this.constructor(this);
  }

  load(data) {
    throw new Error("Implement me!");
  }
  
  init_swizzle(size) {
    var ret = {};
    var cls = size == 4 ? Vector4 : (size == 3 ? Vector3 : Vector2);
    
    for (var k in cls.prototype) {
      var v = cls.prototype[k];
      if (typeof v != "function" && !(v instanceof Function))
        continue;
      
      ret[k] = v.bind(this);
    }
    
    return ret;
  }
  
  vectorLength() {
    return sqrt(this.dot(this));
  }
  
  normalize() {
    var l = this.vectorLength();
    if (l > 0.00000001) {
      this.mulScalar(1.0/l);
    }
    
    return this;
  }
  
  static inherit(cls, vectorsize) {
    make_norm_safe_dot(cls);
   
    var f;

    var vectorDotDistance = "f = function vectorDistance(b) {\n";
    for (var i=0; i<vectorsize; i++) {
      vectorDotDistance += "var d"+i+" = this["+i+"]-b["+i+"];\n";
    }
    
    vectorDotDistance += "return (";
    for (var i=0; i<vectorsize; i++) {
      if (i > 0)
        vectorDotDistance += " + ";
      vectorDotDistance += "d"+i+"*d"+i;
    }
    vectorDotDistance += ");\n";
    vectorDotDistance += "};";
    cls.prototype.vectorDotDistance = eval(vectorDotDistance);
    
    var f;
    var vectorDistance = "f = function vectorDistance(b) {\n";
    for (var i=0; i<vectorsize; i++) {
      vectorDistance += "var d"+i+" = this["+i+"]-b["+i+"];\n";
    }
    
    vectorDistance += "return sqrt(";
    for (var i=0; i<vectorsize; i++) {
      if (i > 0)
        vectorDistance += " + ";
      vectorDistance += "d"+i+"*d"+i;
    }
    vectorDistance += ");\n";
    vectorDistance += "};";
    cls.prototype.vectorDistance = eval(vectorDistance);
    
    
    for (var k in basic_funcs) {
      var func = basic_funcs[k];
      var args = func[0];
      var line = func[1];
      var f;
      
      var code = "f = function " + k + "(";
      for (var i=0; i<args.length; i++) {
        if (i > 0)
          code += ", ";
        
        line = line.replace(args[i], args[i].toLowerCase());
        code += args[i].toLowerCase();
      }
      code += ") {\n";

      if (func.length > 2) {
        //make summation
        code += "return ";

        for (var i=0; i<vectorsize; i++) {
          if (i > 0)
            code += func[2];

          code += "(" + line.replace(/X/g, ""+i) + ")";
        }
        code += ";\n";
      } else {
        for (var i = 0; i < vectorsize; i++) {
          var line2 = line.replace(/X/g, "" + i);
          code += "    this[" + i + "] = " + line2 + "\n";
        }
        code += "return this;";
      }
      
      code += "}\n";
      
      //console.log(code);
      var f = eval(code);
      
      cls.prototype[k] = f;
      //console.log(k, f);
    }
  }
}

class Vector4 extends BaseVector {
  constructor(data) {
    super();
    
    if (arguments.length > 1) {
      throw new Error("unexpected argument");
    }
    
    this.length = 4;
    this[0] = this[1] = this[2] = this[3] = 0.0;
    
    if (data != undefined) {
      this.load(data);
    }
  }

  toCSS() {
    let r = ~~(this[0]*255);
    let g = ~~(this[1]*255);
    let b = ~~(this[2]*255);
    let a = this[3];
    return `rgba(${r},${g},${b},${a})`
  }
  
  loadXYZW(x, y, z, w) {
    this[0] = x;
    this[1] = y;
    this[2] = z;
    this[3] = w;

    return this;
  }

  loadXYZ(x, y, z) {
    this[0] = x;
    this[1] = y;
    this[2] = z;

    return this;
  }

  load(data) {
    if (data == undefined) 
      return this;
    
    this[0] = data[0];
    this[1] = data[1];
    this[2] = data[2];
    this[3] = data[3];
    
    return this;
  }
  
  dot(b) {
    return this[0]*b[0] + this[1]*b[1] + this[2]*b[2] + this[3]*b[3];
  }

  mulVecQuat(q) {
    var t0=-this[1]*this[0]-this[2]*this[1]-this[3]*this[2];
    var t1=this[0]*this[0]+this[2]*this[2]-this[3]*this[1];
    var t2=this[0]*this[1]+this[3]*this[0]-this[1]*this[2];
    this[2] = this[0]*this[2]+this[1]*this[1]-this[2]*this[0];
    this[0] = t1;
    this[1] = t2;
    t1 = t0*-this[1]+this[0]*this[0]-this[1]*this[3]+this[2]*this[2];
    t2 = t0*-this[2]+this[1]*this[0]-this[2]*this[1]+this[0]*this[3];
    this[2] = t0*-this[3]+this[2]*this[0]-this[0]*this[2]+this[1]*this[1];
    this[0] = t1;
    this[1] = t2;
    
    return this;
  }

  multVecMatrix(matrix) {
    var x=this[0];
    var y=this[1];
    var z=this[2];
    var w=this[3];

    this[0] = w*matrix.$matrix.m41+x*matrix.$matrix.m11+y*matrix.$matrix.m21+z*matrix.$matrix.m31;
    this[1] = w*matrix.$matrix.m42+x*matrix.$matrix.m12+y*matrix.$matrix.m22+z*matrix.$matrix.m32;
    this[2] = w*matrix.$matrix.m43+x*matrix.$matrix.m13+y*matrix.$matrix.m23+z*matrix.$matrix.m33;
    this[3] = w*matrix.$matrix.m44+x*matrix.$matrix.m14+y*matrix.$matrix.m24+z*matrix.$matrix.m34;
    
    return this[3];
  }
  
  cross(v) {
    var x = this[1]*v[2] - this[2]*v[1];
    var y = this[2]*v[0] - this[0]*v[2];
    var z = this[0]*v[1] - this[1]*v[0];
    
    this[0] = x;
    this[1] = y;
    this[2] = z;
    
    return this;
  }
  
  preNormalizedAngle(v2) {
    if (this.dot(v2)<0.0) {
        var vec=new Vector4();
        vec[0] = -v2[0];
        vec[1] = -v2[1];
        vec[2] = -v2[2];
        vec[3] = -v2[3];
        return Math.pi-2.0*saasin(vec.vectorDistance(this)/2.0);
    }
    else 
      return 2.0*saasin(v2.vectorDistance(this)/2.0);
  }

  loadSTRUCT(reader) {
    reader(this);

    this.load(this.vec);
    delete this.vec;
  }
};
Vector4.STRUCT = `
vec4 {
  vec : array(float) | obj;
}
`;
nstructjs.manager.add_class(Vector4);



var _v3nd_n1_normalizedDot, _v3nd_n2_normalizedDot;
var _v3nd4_n1_normalizedDot4, _v3nd4_n2_normalizedDot4;

class Vector3 extends BaseVector {
  constructor(data) {
    super();
    
    if (arguments.length > 1) {
      throw new Error("unexpected argument");
    }
    
    this.length = 3;
    this[0] = this[1] = this[2] = 0.0;
    
    if (data != undefined) {
      this.load(data);
    }
  }

  toCSS() {
    let r = ~~(this[0]*255);
    let g = ~~(this[1]*255);
    let b = ~~(this[2]*255);
    return `rgb(${r},${g},${b})`
  }

  loadXYZ(x, y, z) {
    this[0] = x;
    this[1] = y;
    this[2] = z;

    return this;
  }

  toJSON() {
    return [this[0], this[1], this[2]];
  }
  
  loadJSON(obj) {
    return this.load(obj);
  }
  
  initVector3() {
    this.length = 3;
    this[0] = this[1] = this[2] = 0;
    return this;
  }
  
  load(data) {
    if (data == undefined) 
      return this;
    
    this[0] = data[0];
    this[1] = data[1];
    this[2] = data[2];
    
    return this;
  }
  
  dot(b) {
    return this[0]*b[0] + this[1]*b[1] + this[2]*b[2];
  }

  normalizedDot(v) {
    $_v3nd_n1_normalizedDot.load(this);
    $_v3nd_n2_normalizedDot.load(v);
    $_v3nd_n1_normalizedDot.normalize();
    $_v3nd_n2_normalizedDot.normalize();
    return $_v3nd_n1_normalizedDot.dot($_v3nd_n2_normalizedDot);
  }

  //normalizedDot4
  static normalizedDot4(v1, v2, v3, v4) {
    $_v3nd4_n1_normalizedDot4.load(v2).sub(v1).normalize();
    $_v3nd4_n2_normalizedDot4.load(v4).sub(v3).normalize();
    
    return $_v3nd4_n1_normalizedDot4.dot($_v3nd4_n2_normalizedDot4);
  }

  multVecMatrix(matrix, ignore_w) {
    if (ignore_w==undefined) {
        ignore_w = false;
    }
    var x=this[0];
    var y=this[1];
    var z=this[2];
    this[0] = matrix.$matrix.m41+x*matrix.$matrix.m11+y*matrix.$matrix.m21+z*matrix.$matrix.m31;
    this[1] = matrix.$matrix.m42+x*matrix.$matrix.m12+y*matrix.$matrix.m22+z*matrix.$matrix.m32;
    this[2] = matrix.$matrix.m43+x*matrix.$matrix.m13+y*matrix.$matrix.m23+z*matrix.$matrix.m33;
    var w=matrix.$matrix.m44+x*matrix.$matrix.m14+y*matrix.$matrix.m24+z*matrix.$matrix.m34;
    if (!ignore_w&&w!=1&&w!=0&&matrix.isPersp) {
        this[0]/=w;
        this[1]/=w;
        this[2]/=w;
    }
    return w;
  }
  
  cross(v) {
    var x = this[1]*v[2] - this[2]*v[1];
    var y = this[2]*v[0] - this[0]*v[2];
    var z = this[0]*v[1] - this[1]*v[0];
    
    this[0] = x;
    this[1] = y;
    this[2] = z;
    
    return this;
  }

  //axis is optional, 0
  rot2d(A, axis) {
    var x = this[0];
    var y = this[1];
    
    if (axis == 1) {
      this[0] = x * cos(A) + y*sin(A);
      this[1] = y * cos(A) - x*sin(A);
    } else {
      this[0] = x * cos(A) - y*sin(A);
      this[1] = y * cos(A) + x*sin(A);
    }
    
    return this;
  }
 
  preNormalizedAngle(v2) {
    if (this.dot(v2)<0.0) {
        var vec=new Vector3();
        vec[0] = -v2[0];
        vec[1] = -v2[1];
        vec[2] = -v2[2];
        return Math.pi-2.0*saasin(vec.vectorDistance(this)/2.0);
    }
    else 
      return 2.0*saasin(v2.vectorDistance(this)/2.0);
  }

  loadSTRUCT(reader) {
    reader(this);

    this.load(this.vec);
    delete this.vec;
  }
}
Vector3.STRUCT = `
vec3 {
  vec : array(float) | obj;
}
`;
nstructjs.manager.add_class(Vector3);

class Vector2 extends BaseVector {
  constructor(data) {
    super();
    
    if (arguments.length > 1) {
      throw new Error("unexpected argument");
    }
    
    this.length = 2;
    this[0] = this[1] = 0.0;
    
    if (data != undefined) {
      this.load(data);
    }
  }

  loadXY(x, y) {
    this[0] = x;
    this[1] = y;

    return this;
  }

  toJSON() {
    return [this[0], this[1]];
  }
  
  loadJSON(obj) {
    return this.load(obj);
  }
  
  load(data) {
    if (data == undefined) 
      return this;
    
    this[0] = data[0];
    this[1] = data[1];
    
    return this;
  }
  
  //axis is optional, 0
  rot2d(A, axis) {
    var x = this[0];
    var y = this[1];
    
    if (axis == 1) {
      this[0] = x * cos(A) + y*sin(A);
      this[1] = y * cos(A) - x*sin(A);
    } else {
      this[0] = x * cos(A) - y*sin(A);
      this[1] = y * cos(A) + x*sin(A);
    }
    
    return this;
  }
  
  dot(b) {
    return this[0]*b[0] + this[1]*b[1];
  }

  multVecMatrix(matrix) {
    var x=this[0];
    var y=this[1];
    var w = 1.0;

    this[0] = w*matrix.$matrix.m41+x*matrix.$matrix.m11+y*matrix.$matrix.m21;
    this[1] = w*matrix.$matrix.m42+x*matrix.$matrix.m12+y*matrix.$matrix.m22;

    if (matrix.isPersp) {
      let w2 = w*matrix.$matrix.m44+x*matrix.$matrix.m14+y*matrix.$matrix.m24;

      if (w2 != 0.0) {
        this[0] /= w2;
        this[1] /= w2;
      }
    }

    return this;
  }

  mulVecQuat(q) {
    let w = 1.0;
    let z = 0.0;

    var t0=-this[1]*this[0]-z*this[1]-w*z;
    var t1=this[0]*this[0]+z*z-w*this[1];
    var t2=this[0]*this[1]+w*this[0]-this[1]*z;

    z = this[0]*z+this[1]*this[1]-z*this[0];

    this[0] = t1;
    this[1] = t2;

    t1 = t0*-this[1]+this[0]*this[0]-this[1]*w+z*z;
    t2 = t0*-z+this[1]*this[0]-z*this[1]+this[0]*w;
    z = t0*-w+z*this[0]-this[0]*z+this[1]*this[1];

    this[0] = t1;
    this[1] = t2;
    
    return this;
  }

  loadSTRUCT(reader) {
    reader(this);

    this.load(this.vec);
    delete this.vec;
  }
};
Vector2.STRUCT = `
vec2 {
  vec : array(float) | obj;
}
`;
nstructjs.manager.add_class(Vector2);

let _quat_vs3_temps = cachering.fromConstructor(Vector3, 64);

class Quat extends Vector4 {
  makeUnitQuat() {
    this[0] = 1.0;
    this[1] = this[2] = this[3] = 0.0;
  }

  isZero() {
    return (this[0]==0&&this[1]==0&&this[2]==0&&this[3]==0);
  }

  mulQuat(qt) {
    var a=this[0]*qt[0]-this[1]*qt[1]-this[2]*qt[2]-this[3]*qt[3];
    var b=this[0]*qt[1]+this[1]*qt[0]+this[2]*qt[3]-this[3]*qt[2];
    var c=this[0]*qt[2]+this[2]*qt[0]+this[3]*qt[1]-this[1]*qt[3];
    this[3] = this[0]*qt[3]+this[3]*qt[0]+this[1]*qt[2]-this[2]*qt[1];
    this[0] = a;
    this[1] = b;
    this[2] = c;
  }

  conjugate() {
    this[1] = -this[1];
    this[2] = -this[2];
    this[3] = -this[3];
  }

  dotWithQuat(q2) {
    return this[0]*q2[0]+this[1]*q2[1]+this[2]*q2[2]+this[3]*q2[3];
  }

  invert() {
    var f= this.dot(this);
    
    if (f==0.0)
      return;
      
    conjugate_qt(q);
    this.mulscalar(1.0/f);
  }

  sub(q2) {
    var nq2=new Quat();
    
    nq2[0] = -q2[0];
    nq2[1] = q2[1];
    nq2[2] = q2[2];
    nq2[3] = q2[3];
    
    this.mul(nq2);
  }

  mulScalarWithFactor(fac) {
    var angle=fac*bounded_acos(this[0]);
    var co=Math.cos(angle);
    var si=Math.sin(angle);
    
    this[0] = co;
    
    var last3=Vector3([this[1], this[2], this[3]]);
    last3.normalize();
    last3.mulScalar(si);
    this[1] = last3[0];
    this[2] = last3[1];
    this[3] = last3[2];
    return this;
  }

  toMatrix(m) {
    if (m == undefined) {
      m=new Matrix4();
    }
    
    var q0=M_SQRT2*this[0];
    var q1=M_SQRT2*this[1];
    var q2=M_SQRT2*this[2];
    var q3=M_SQRT2*this[3];
    var qda=q0*q1;
    var qdb=q0*q2;
    var qdc=q0*q3;
    var qaa=q1*q1;
    var qab=q1*q2;
    var qac=q1*q3;
    var qbb=q2*q2;
    var qbc=q2*q3;
    var qcc=q3*q3;
    m.$matrix.m11 = (1.0-qbb-qcc);
    m.$matrix.m12 = (qdc+qab);
    m.$matrix.m13 = (-qdb+qac);
    m.$matrix.m14 = 0.0;
    m.$matrix.m21 = (-qdc+qab);
    m.$matrix.m22 = (1.0-qaa-qcc);
    m.$matrix.m23 = (qda+qbc);
    m.$matrix.m24 = 0.0;
    m.$matrix.m31 = (qdb+qac);
    m.$matrix.m32 = (-qda+qbc);
    m.$matrix.m33 = (1.0-qaa-qbb);
    m.$matrix.m34 = 0.0;
    m.$matrix.m41 = m.$matrix.m42 = m.$matrix.m43 = 0.0;
    m.$matrix.m44 = 1.0;
    
    return m;
  }

  matrixToQuat(wmat) {
    var mat=new Matrix4(wmat);
    
    mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
    mat.$matrix.m44 = 1.0;
    
    var r1=new Vector3([mat.$matrix.m11, mat.$matrix.m12, mat.$matrix.m13]);
    var r2=new Vector3([mat.$matrix.m21, mat.$matrix.m22, mat.$matrix.m23]);
    var r3=new Vector3([mat.$matrix.m31, mat.$matrix.m32, mat.$matrix.m33]);
    
    r1.normalize();
    r2.normalize();
    r3.normalize();
    
    mat.$matrix.m11 = r1[0];
    mat.$matrix.m12 = r1[1];
    mat.$matrix.m13 = r1[2];
    mat.$matrix.m21 = r2[0];
    mat.$matrix.m22 = r2[1];
    mat.$matrix.m23 = r2[2];
    mat.$matrix.m31 = r3[0];
    mat.$matrix.m32 = r3[1];
    mat.$matrix.m33 = r3[2];
    var tr=0.25*(1.0+mat.$matrix.m11+mat.$matrix.m22+mat.$matrix.m33);
    var s=0;
    if (tr>FLT_EPSILON) {
        s = Math.sqrt(tr);
        this[0] = s;
        s = 1.0/(4.0*s);
        this[1] = ((mat.$matrix.m23-mat.$matrix.m32)*s);
        this[2] = ((mat.$matrix.m31-mat.$matrix.m13)*s);
        this[3] = ((mat.$matrix.m12-mat.$matrix.m21)*s);
    }
    else {
      if (mat.$matrix.m11>mat.$matrix.m22&&mat.$matrix.m11>mat.$matrix.m33) {
          s = 2.0*Math.sqrt(1.0+mat.$matrix.m11-mat.$matrix.m22-mat.$matrix.m33);
          this[1] = (0.25*s);
          s = 1.0/s;
          this[0] = ((mat.$matrix.m32-mat.$matrix.m23)*s);
          this[2] = ((mat.$matrix.m21+mat.$matrix.m12)*s);
          this[3] = ((mat.$matrix.m31+mat.$matrix.m13)*s);
      }
      else 
        if (mat.$matrix.m22>mat.$matrix.m33) {
          s = 2.0*Math.sqrt(1.0+mat.$matrix.m22-mat.$matrix.m11-mat.$matrix.m33);
          this[2] = (0.25*s);
          s = 1.0/s;
          this[0] = ((mat.$matrix.m31-mat.$matrix.m13)*s);
          this[1] = ((mat.$matrix.m21+mat.$matrix.m12)*s);
          this[3] = ((mat.$matrix.m32+mat.$matrix.m23)*s);
      }
      else {
        s = 2.0*Math.sqrt(1.0+mat.$matrix.m33-mat.$matrix.m11-mat.$matrix.m22);
        this[3] = (0.25*s);
        s = 1.0/s;
        this[0] = ((mat.$matrix.m21-mat.$matrix.m12)*s);
        this[1] = ((mat.$matrix.m31+mat.$matrix.m13)*s);
        this[2] = ((mat.$matrix.m32+mat.$matrix.m23)*s);
      }
    }
    this.normalize();
  }

  normalize() {
    var len=Math.sqrt(this.dot(this));
    
    if (len!=0.0) {
        this.mulScalar(1.0/len);
    }
    else {
      this[1] = 1.0;
      this[0] = this[2] = this[3] = 0.0;
    }
    return this;
  }

  axisAngleToQuat(axis, angle) {
    let nor = _quat_vs3_temps.next().load(axis);
    nor.normalize();

    if (nor.dot(nor) != 0.0) {
        var phi=angle/2.0;
        var si=Math.sin(phi);
        this[0] = Math.cos(phi);
        this[1] = nor[0]*si;
        this[2] = nor[1]*si;
        this[3] = nor[2]*si;
    } else {
      this.makeUnitQuat();
    }

    return this;
  }

  rotationBetweenVecs(v1, v2) {
    v1 = new Vector3(v1);
    v2 = new Vector3(v2);
    v1.normalize();
    v2.normalize();
    var axis=new Vector3(v1);
    axis.cross(v2);
    var angle=v1.preNormalizedAngle(v2);
    this.axisAngleToQuat(axis, angle);
  }

  quatInterp(quat2, t) {
    var quat=new Quat();
    var cosom=this[0]*quat2[0]+this[1]*quat2[1]+this[2]*quat2[2]+this[3]*quat2[3];
    if (cosom<0.0) {
        cosom = -cosom;
        quat[0] = -this[0];
        quat[1] = -this[1];
        quat[2] = -this[2];
        quat[3] = -this[3];
    }
    else {
      quat[0] = this[0];
      quat[1] = this[1];
      quat[2] = this[2];
      quat[3] = this[3];
    }
    var omega, sinom, sc1, sc2;
    if ((1.0-cosom)>0.0001) {
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        sc1 = Math.sin((1.0-t)*omega)/sinom;
        sc2 = Math.sin(t*omega)/sinom;
    }
    else {
      sc1 = 1.0-t;
      sc2 = t;
    }
    this[0] = sc1*quat[0]+sc2*quat2[0];
    this[1] = sc1*quat[1]+sc2*quat2[1];
    this[2] = sc1*quat[2]+sc2*quat2[2];
    this[3] = sc1*quat[3]+sc2*quat2[3];
    
    return this;
  }

  loadSTRUCT(reader) {
    reader(this);

    this.load(this.vec);
    delete this.vec;
  }
};
Quat.STRUCT = `
quat {
  vec : array(float) | obj;
}
`;
nstructjs.manager.add_class(Quat);

_v3nd4_n1_normalizedDot4 = new Vector3();
_v3nd4_n2_normalizedDot4 = new Vector3();
_v3nd_n1_normalizedDot = new Vector3();
_v3nd_n2_normalizedDot = new Vector3();

BaseVector.inherit(Vector4, 4);
BaseVector.inherit(Vector3, 3);
BaseVector.inherit(Vector2, 2);

lookat_cache_vs3 = cachering.fromConstructor(Vector3, 64);
lookat_cache_vs4 = cachering.fromConstructor(Vector4, 64);
makenormalcache = cachering.fromConstructor(Vector3, 64);

$_v3nd_n1_normalizedDot = new Vector3();
$_v3nd_n2_normalizedDot = new Vector3();
$_v3nd4_n1_normalizedDot4 = new Vector3();
$_v3nd4_n2_normalizedDot4 = new Vector3();

var vectormath1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  Matrix4: Matrix4,
  BaseVector: BaseVector,
  Vector4: Vector4,
  Vector3: Vector3,
  Vector2: Vector2,
  Quat: Quat
});

/*
all units convert to meters
*/

function normString(s) {
  //remove all whitespace
  s = s.replace(/ /g, "").replace(/\t/g, "");
  return s.toLowerCase();
}

const Units = [];

class Unit {
  static getUnit(name) {
    for (let cls of Units) {
      if (cls.unitDefine().name === name) {
        return cls;
      }
    }

    throw new Error("Unknown unit " + name);
  }

  static register(cls) {
    Units.push(cls);
  }

  //subclassed static methods start here
  static unitDefine() {return {
    name    : "",
    uiname  : "",
    type    : "", //e.g. distance
    icon    : -1,
    pattern : undefined //a re literal to validate strings
  }}

  static parse(string) {

  }

  static validate(string) {
    string = normString(string);
    let def = this.unitDefine();

    let m = string.match(def.pattern);
    if (!m)
      return false;

    return m[0] === string;
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value) {

  }

  static fromInternal(value) {

  }

  static buildString(value, decimals=2) {

  }
}

class MeterUnit extends Unit {
  static unitDefine() {return {
    name    : "meter",
    uiname  : "Meter",
    type    : "distance",
    icon    : -1,
    pattern : /-?\d+(\.\d*)?m$/
  }}

  static parse(string) {
    string = normString(string);
    if (string.endsWith("m")) {
      string = string.slice(0, string.length-1);
    }

    return parseFloat(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value) {
    return value;
  }

  static fromInternal(value) {
    return value;
  }

  static buildString(value, decimals=2) {
    return "" + value + " m";
  }
}

Unit.register(MeterUnit);

class InchUnit extends Unit {
  static unitDefine() {return {
    name    : "inch",
    uiname  : "Inch",
    type    : "distance",
    icon    : -1,
    pattern : /-?\d+(\.\d*)?(in|inch)$/
  }}

  static parse(string) {
    string = string.toLowerCase();
    let i = string.indexOf("i");

    if (i >= 0) {
      string = string.slice(0, i);
    }

    return parseInt(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value) {
    return value*0.0254;
  }

  static fromInternal(value) {
    return value/0.0254;
  }

  static buildString(value, decimals=2) {
    return "" + value.toFixed(decimals) + "in";
  }
}
Unit.register(InchUnit);

let foot_re = /((-?\d+(\.\d*)?ft)(-?\d+(\.\d*)?(in|inch))?)|(-?\d+(\.\d*)?(in|inch))$/;

class FootUnit extends Unit {
  static unitDefine() {return {
    name    : "foot",
    uiname  : "Foot",
    type    : "distance",
    icon    : -1,
    pattern : foot_re
  }}

  static parse(string) {
    string = normString(string);
    let i = string.search("ft");
    let parts = [];
    let vft=0.0, vin=0.0;

    if (i >= 0) {
      parts = string.split("ft");
      let j = parts[1].search("in");

      if (j >= 0) {
        parts = [parts[0]].concat(parts[1].split("in"));
        vin = parseFloat(parts[1]);
      }

      vft = parseFloat(parts[0]);
    } else {
      string = string.replace(/in/g, "");
      vin = parseFloat(string);
    }

    return vin/12.0 + vft;
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value) {
    return value*0.3048;
  }

  static fromInternal(value) {
    return value/0.3048;
  }

  static buildString(value, decimals=2) {
    let vft = ~~(value / 12);
    let vin = value % 12;

    if (vft === 0.0) {
      return vin.toFixed(decimals) + " in";
    }

    let s = "" + vft + " ft";
    if (vin !== 0.0) {
      s += " " + vin.toFixed(decimals) + " in";
    }

    return s;
  }
}
Unit.register(FootUnit);


class MileUnit extends Unit {
  static unitDefine() {return {
    name    : "mile",
    uiname  : "Mile",
    type    : "distance",
    icon    : -1,
    pattern : /-?\d+(\.\d+)?miles$/
  }}

  static parse(string) {
    string = normString(string);
    string = string.replace(/miles/, "");
    return parseFloat(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value) {
    return value*1609.34;
  }

  static fromInternal(value) {
    return value/1609.34;
  }

  static buildString(value, decimals=3) {
    return ""+value.toFixed(decimals) + " miles";
  }
}
Unit.register(MileUnit);

class DegreeUnit extends Unit {
  static unitDefine() {return {
    name    : "degree",
    uiname  : "Degrees",
    type    : "angle",
    icon    : -1,
    pattern : /-?\d+(\.\d+)?(\u00B0|degree|deg|d|degree|degrees)?$/
  }}

  static parse(string) {
    string = normString(string);
    if (string.search("d") >= 0) {
      string = string.slice(0, string.search("d")).trim();
    } else if (string.search("\u00B0") >= 0) {
      string = string.slice(0, string.search("\u00B0")).trim();
    }

    return parseFloat(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value) {
    return value/180.0*Math.PI;
  }

  static fromInternal(value) {
    return value*180.0/Math.PI;
  }

  static buildString(value, decimals=3) {
    return ""+value.toFixed(decimals) + " \u00B0";
  }
};
Unit.register(DegreeUnit);

class RadianUnit extends Unit {
  static unitDefine() {return {
    name    : "radian",
    uiname  : "Radians",
    type    : "angle",
    icon    : -1,
    pattern : /-?\d+(\.\d+)?(r|rad|radian|radians)$/
  }}

  static parse(string) {
    string = normString(string);
    if (string.search("r") >= 0) {
      string = string.slice(0, string.search("r")).trim();
    }

    return parseFloat(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value) {
    return value;
  }

  static fromInternal(value) {
    return value;
  }

  static buildString(value, decimals=3) {
    return ""+value.toFixed(decimals) + " r";
  }
};

Unit.register(RadianUnit);

function setBaseUnit(unit) {
  Unit.baseUnit = unit;
}
function setMetric(val) {
  Unit.isMetric = val;
}

Unit.isMetric = true;
Unit.baseUnit = "meter";

function parseValue(string, baseUnit=undefined) {
  let base;

  if (baseUnit) {
    base = Unit.getUnit(baseUnit);
    if (base === undefined) {
      console.warn("Unknown unit " + baseUnit);
      return NaN;
    }
  } else {
    base = Unit.getUnit(Unit.baseUnit);
  }

  for (let unit of Units) {
    let def = unit.unitDefine();

    if (unit.validate(string)) {
      console.log(unit);
      let value = unit.parse(string);

      value = unit.toInternal(value);
      return base.fromInternal(value);
    }
  }

  return NaN;
}

function convert(value, unita, unitb) {
  if (typeof unita === "string")
    unita = Unit.getUnit(unita);

  if (typeof unitb === "string")
    unitb = Unit.getUnit(unitb);

  return unitb.fromInternal(unita.toInternal(value));
}

/**
 *
 * @param value Note: is not converted to internal unit
 * @param unit: Unit to use, should be a string referencing unit type, see unitDefine().name
 * @returns {*}
 */
function buildString(value, baseUnit=Unit.baseUnit, decimalPlaces=3, displayUnit=Unit.baseUnit) {
  if (typeof baseUnit === "string") {
    baseUnit = Unit.getUnit(baseUnit);
  }
  if (typeof displayUnit === "string") {
    displayUnit = Unit.getUnit(displayUnit);
  }

  if (displayUnit !== baseUnit) {
    value = convert(value, baseUnit, displayUnit);
  }

  return displayUnit.buildString(value, decimalPlaces);
}
window._parseValueTest = parseValue;
window._buildStringTest = buildString;

"use strict";

let PropTypes = {
  INT : 1,
  STRING : 2,
  BOOL : 4,
  ENUM : 8,
  FLAG : 16,
  FLOAT : 32,
  VEC2 : 64,
  VEC3 : 128,
  VEC4 : 256,
  MATRIX4 : 512,
  QUAT : 1024,
  PROPLIST : 4096,
  STRSET : 8192,
  CURVE  : 8192<<1
  //ITER : 8192<<1
};

const PropSubTypes = {
  COLOR : 1
};

//flags
const PropFlags = {
  SELECT            : 1,
  PRIVATE           : 2,
  LABEL             : 4,
  USE_ICONS         : 64,
  USE_CUSTOM_GETSET : 128, //used by controller.js interface
  SAVE_LAST_VALUE   : 256,
  READ_ONLY         : 512,
  SIMPLE_SLIDER     : 1024,
  FORCE_ROLLER_SLIDER : 2048
};

class ToolPropertyIF {
  constructor(type, subtype, apiname, uiname, description, flag, icon) {
    this.data = undefined;

    this.type = type;
    this.subtype = subtype;

    this.apiname = apiname;
    this.uiname = uiname;
    this.description = description;
    this.flag = flag;
    this.icon = icon;
  }

  copyTo(b) {

  }

  copy() {

  }

  _fire(type, arg1, arg2) {
  }

  on(type, cb) {
  }

  off(type, cb) {
  }

  getValue() {
  }

  setValue(val) {
  }

  setStep(step) {
  }

  setRange(min, max) {
  }

  setUnit(unit) {
  }

  //some clients have seperate ui range
  setUIRange(min, max) {
  }

  setIcon(icon) {
  }
}

class StringPropertyIF extends ToolPropertyIF {
  constructor() {
    super(PropTypes.STRING);
  }
}

class NumPropertyIF extends ToolPropertyIF {
};

class IntProperty extends ToolPropertyIF {
  constructor() {
    super(PropTypes.INT);
  }

  setRadix(radix) {
    throw new Error("implement me");
  }
}

class FloatProperty extends ToolPropertyIF {
  constructor() {
    super(PropTypes.FLOAT);
  }

  setDecimalPlaces(n) {
  }
}

class EnumProperty extends ToolPropertyIF {
  constructor(value, valid_values) {
    super(PropTypes.ENUM);

    this.values = {};
    this.keys = {};
    this.ui_value_names = {};
    this.iconmap = {};

    if (valid_values === undefined) return this;

    if (valid_values instanceof Array || valid_values instanceof String) {
      for (var i=0; i<valid_values.length; i++) {
        this.values[valid_values[i]] = valid_values[i];
        this.keys[valid_values[i]] = valid_values[i];
      }
    } else {
      for (var k in valid_values) {
        this.values[k] = valid_values[k];
        this.keys[valid_values[k]] = k;
      }
    }

    for (var k in this.values) {
      var uin = k[0].toUpperCase() + k.slice(1, k.length);

      uin = uin.replace(/\_/g, " ");
      this.ui_value_names[k] = uin;
    }
  }

  addIcons(iconmap) {
    if (this.iconmap === undefined) {
      this.iconmap = {};
    }
    for (var k in iconmap) {
      this.iconmap[k] = iconmap[k];
    }
  }
}

class FlagPropertyIF extends EnumProperty {
  constructor(valid_values) {
    super(PropTypes.FLAG);
  }
}

class Vec2Property extends ToolPropertyIF {
  constructor(valid_values) {
    super(PropTypes.VEC2);
  }
}

class Vec3Property extends ToolPropertyIF {
  constructor(valid_values) {
    super(PropTypes.VEC3);
  }
}

class Vec4Property extends ToolPropertyIF {
  constructor(valid_values) {
    super(PropTypes.VEC4);
  }
}

/**
 * List of other tool props (all of one type)
 */
class ListProperty extends ToolPropertyIF {
  /*
  * Prop must be a ToolProperty subclass instance
  * */
  constructor(prop) {
    super(PropTypes.PROPLIST);

    this.prop = prop;
  }

  copyTo(b) {
  }

  copy() {
  }

  /**
   * clear list
   * */
  clear() {

  }

  push(item=this.prop.copy()) {
  }

  [Symbol.iterator]() {
  }

  get length() {
  }

  set length(val) {
  }
}

//like FlagsProperty but uses strings
class StringSetProperty extends ToolPropertyIF {
  constructor(value=undefined, definition=[]) {
    super(PropTypes.STRSET);
  }

  /*
  * Values can be a string, undefined/null, or a list/set/object-literal of strings.
  * If destructive is true, then existing set will be cleared.
  * */
  setValue(values, destructive=true, soft_fail=true) {
  }

  getValue() {
  }

  addIcons(iconmap) {
  }


  addUINames(map) {
  }

  addDescriptions(map) {
  }

  copyTo(b) {
  }

  copy() {
  }
}

class Curve1DPropertyIF extends ToolPropertyIF {
  constructor(curve, uiname) {
    super(PropTypes.CURVE);

    this.data = curve;
  }

  getValue() {
    return this.curve;
  }

  setValue(curve) {
    if (curve === undefined) {
      return;
    }

    let json = JSON.parse(JSON.stringify(curve));
    this.data.load(json);
  }

  copyTo(b) {
    b.setValue(this.data);
  }
}

var toolprop_abstract1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  PropTypes: PropTypes,
  PropSubTypes: PropSubTypes,
  PropFlags: PropFlags,
  ToolPropertyIF: ToolPropertyIF,
  StringPropertyIF: StringPropertyIF,
  NumPropertyIF: NumPropertyIF,
  IntProperty: IntProperty,
  FloatProperty: FloatProperty,
  EnumProperty: EnumProperty,
  FlagPropertyIF: FlagPropertyIF,
  Vec2Property: Vec2Property,
  Vec3Property: Vec3Property,
  Vec4Property: Vec4Property,
  ListProperty: ListProperty,
  StringSetProperty: StringSetProperty,
  Curve1DPropertyIF: Curve1DPropertyIF
});

"use strict";

/*
Icons are defined in spritesheets that live in
the iconsheet16/32 dom nodes.  Icons are numbered start from
the upper left sprite tile.

This function sets the mapping between icon numbers and names.

The following icons should be in the icon sheet and in this map:

RESIZE      :
SMALL_PLUS  :
TRANSLATE   : for moving things
UI_EXPAND   : panel open icon
UI_COLLAPSE : panel close icon
NOTE_EXCL   : exclamation mark for notifications
*/
function setIconMap(icons) {
  for (let k in icons) {
    Icons[k] = icons[k];
  }
}

let Icons = {
  HFLIP          : 0,
  TRANSLATE      : 1,
  ROTATE         : 2,
  HELP_PICKER    : 3,
  UNDO           : 4,
  REDO           : 5,
  CIRCLE_SEL     : 6,
  BACKSPACE      : 7,
  LEFT_ARROW     : 8,
  RIGHT_ARROW    : 9,
  UI_EXPAND      : 10, //triangle
  UI_COLLAPSE    : 11, //triangle
  FILTER_SEL_OPS : 12,
  SCROLL_DOWN    : 13,
  SCROLL_UP      : 14,
  NOTE_EXCL      : 15,
  TINY_X         : 16,
  FOLDER         : 17,
  FILE           : 18,
  SMALL_PLUS     : 19,
  SMALL_MINUS    : 20,
  MAKE_SEGMENT   : 21,
  MAKE_POLYGON   : 22,
  FACE_MODE      : 23,
  EDGE_MODE      : 24,
  VERT_MODE      : 25,
  CURSOR_ARROW   : 26,
  TOGGLE_SEL_ALL : 27,
  DELETE         : 28,
  RESIZE         : 29,
  Z_UP           : 30,
  Z_DOWN         : 31,
  SPLIT_EDGE     : 32,
  SHOW_ANIMPATHS : 33,
  UNCHECKED      : 34,
  CHECKED        : 35,
  ENUM_UNCHECKED : 36,
  ENUM_CHECKED   : 37,
  APPEND_VERTEX  : 38,
  LARGE_CHECK    : 39
};

let exports = {
  menu_close_time : 500,
  DEBUG : {
    screenborders: false,
    allBordersMovable: false,
    doOnce: false,
    modalEvents : true,
    areaConstraintSolver : false,
    datapaths : false,

    debugUIUpdatePerf : false, //turns async FrameManager.update_intern loop into sync

    screenAreaPosSizeAccesses : false,
    buttonEvents : false,

    /*
    customWindowSize: {
      width: 512, height: 512
    },
    */
  },

  autoSizeUpdate : true,
  showPathsInToolTips: true,

  loadConstants : function(args) {
    for (let k in args) {
      if (k === "loadConstants")
        continue;

      this[k] = args[k];
    }
  }
};

let modalstack = [];

/*
stupid DOM event system.  I hate it.
*/

function eventWasTouch(e) {
  let ret = e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents;
  ret = ret || e.was_touch;

  return ret;
}

function copyEvent(e) {
  let ret = {};
  let keys = [];

  for (let k in e) {
    keys.push(k);
  }

  keys = keys.concat(Object.getOwnPropertySymbols(e));
  keys = keys.concat(Object.getOwnPropertyNames(e));

  for (let k of keys) {
    let v;

    try {
      v = e[k];
    } catch (error) {
      console.warn("read error for event key", k);
      continue;
    }

    if (typeof v == "function") {
      ret[k] = v.bind(e);
    } else {
      ret[k] = v;
    }
  }

  return ret;
}

function pushModalLight(obj, autoStopPropagation=true) {
  if (exports.DEBUG.modalEvents) {
    console.warn("pushModalLight");
  }

  let keys = new Set([
    "keydown", "keyup", "keypress", "mousedown", "mouseup", "touchstart", "touchend",
    "touchcancel", "mousewheel", "mousemove", "mouseover", "mouseout", "mouseenter",
    "mouseleave", "dragstart", "drag", "dragend", "dragexit", "dragleave", "dragover",
    "dragenter", "drop", "pointerdown", "pointermove", "pointerup", "pointercancel"
  ]);

  let ret = {
    keys : keys,
    handlers : {},
    last_mpos : [0, 0]
  };

  let touchmap = {
    "touchstart" : "mousedown",
    "touchmove" : "mousemove",
    "touchend" : "mouseup",
    "touchcancel" : "mouseup"
  };

  function make_default_touchhandler(type, state) {
    return function(e) {
      //console.warn("touch event!", type, touchmap[type], e.touches.length);

      if (touchmap[type] in ret.handlers) {
        let type2 = touchmap[type];

        let e2 = copyEvent(e);

        e2.was_touch = true;
        e2.type = type2;
        e2.button = type == "touchcancel" ? 1 : 0;
        e2.touches = e.touches;

        if (e.touches.length > 0) {
          let dpi = window.devicePixelRatio; //UIBase.getDPI();
          let t = e.touches[0];

          e2.pageX = e2.x = t.pageX;// * dpi;
          e2.pageY = e2.y = t.pageY;// * dpi;
          e2.clientX = t.clientX;// * dpi;
          e2.clientY = t.clientY;// * dpi;
          e2.x = t.clientX;// * dpi;
          e2.y = t.clientY;// * dpi;

          ret.last_mpos[0] = e2.x;
          ret.last_mpos[1] = e2.y;
        } else {
          e2.x = e2.clientX = e2.pageX = e2.screenX = ret.last_mpos[0];
          e2.y = e2.clientY = e2.pageY = e2.screenY = ret.last_mpos[1];
        }

        e2.was_touch = true;
        //console.log(e2.x, e2.y);
        ret.handlers[type2](e2);
      }

      if (autoStopPropagation) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }

  function make_handler(type, key) {
    return function(e) {
      if (key !== undefined)
        obj[key](e);

      if (autoStopPropagation) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }

  let found = {};

  for (let k of keys) {
    let key;

    if (obj[k])
      key = k;
    else if (obj["on"+k])
      key = "on" + k;
    else if (obj["on_"+k])
      key = "on_" + k;
    else if (k in touchmap)
      continue; //default touch event handlers will be done seperately
    else
      key = undefined; //make handler that still blocks events

    //check we don't override other mouse pointer event handlers
    if (key === undefined && k.search("pointer") === 0) {
      continue;
    }

    if (key !== undefined) {
      found[k] = 1;
    }

    let handler = make_handler(k, key);
    ret.handlers[k] = handler;

    let settings = handler.settings = {passive : false, capture : true};
    window.addEventListener(k, handler, settings);
  }

  for (let k in touchmap) {
    if (!(k in found)) {
      //console.log("making touch handler for", '"' + k + '"', ret.handlers[k]);

      ret.handlers[k] = make_default_touchhandler(k, ret);

      let settings = ret.handlers[k].settings = {passive : false, capture : true};
      window.addEventListener(k, ret.handlers[k], settings);
    }
  }

  modalstack.push(ret);

  return ret;
}

function popModalLight(state) {
  if (exports.DEBUG.modalEvents) {
    console.warn("popModalLight");
  }

  if (state === undefined) {
    console.warn("Bad call to popModalLight: state was undefined");
    return;
  }

  if (state !== modalstack[modalstack.length-1]) {
    if (modalstack.indexOf(state) < 0) {
      console.warn("Error in popModalLight; modal handler not found");
      return;
    } else {
      console.warn("Error in popModalLight; called in wrong order");
    }
  }

  for (let k in state.handlers) {
    //console.log(k);
    window.removeEventListener(k, state.handlers[k], state.handlers[k].settings);
  }

  state.handlers = {};
  modalstack.remove(state);
}

function haveModal() {
  return modalstack.length > 0;
}
window._haveModal = haveModal; //for debugging console

var keymap_latin_1 = {
  "Space": 32,
  "Escape" : 27,
  "Enter": 13,
  "Return" : 13,
  "Up" : 38,
  "Down" : 40,
  "Left": 37,
  "Right": 39,

  "Num0": 96,
  "Num1": 97,
  "Num2": 98,
  "Num3": 99,
  "Num4": 100,
  "Num5": 101,
  "Num6": 102,
  "Num7": 103,
  "Num8": 104,
  "Num9": 105,
  "Home": 36,
  "End": 35,
  "Delete": 46,
  "Backspace": 8,
  "Insert": 45,
  "PageUp": 33,
  "PageDown": 34,
  "Tab" : 9,
  "-" : 189,
  "=" : 187,
  "." : 190,
  "/" : 191,
  "," : 188,
  ";" : 186,
  "'" : 222,
  "[" : 219,
  "]" : 221,
  "NumPlus" : 107,
  "NumMinus" : 109,
  "Shift" : 16,
  "Ctrl" : 17,
  "Control" : 17,
  "Alt" : 18
};

for (var i$1=0; i$1<26; i$1++) {
  keymap_latin_1[String.fromCharCode(i$1+65)] = i$1+65;
}
for (var i$1=0; i$1<10; i$1++) {
  keymap_latin_1[String.fromCharCode(i$1+48)] = i$1+48;
}

for (var k in keymap_latin_1) {
  keymap_latin_1[keymap_latin_1[k]] = k;
}

var keymap_latin_1_rev = {};
for (var k in keymap_latin_1) {
  keymap_latin_1_rev[keymap_latin_1[k]] = k;
}

var keymap = keymap_latin_1;
var reverse_keymap = keymap_latin_1_rev;

class HotKey {
  /**action can be a callback or a toolpath string*/
  constructor(key, modifiers, action) {
    this.action = action;
    this.mods = modifiers;
    this.key = keymap[key];
  }

  exec(ctx) {
    if (typeof this.action == "string") {
      ctx.api.execTool(ctx, this.action);
    } else {
      this.action(ctx);
    }
  }

  buildString() {
    let s = "";

    for (let i=0; i<this.mods.length; i++) {
      if (i > 0) {
        s += "+";
      }

      s += this.mods[i].toLowerCase();
    }

    if (this.mods.length > 0) {
      s += "+";
    }

    s += reverse_keymap[this.key];

    return s.trim();
  }
}

class KeyMap extends Array {
  constructor(hotkeys=[]) {
    super();

    for (let hk of hotkeys) {
      this.add(hk);
    }
  }

  handle(ctx, e) {
    let mods = new set$1();
    if (e.shiftKey)
      mods.add("shift");
    if (e.altKey)
      mods.add("alt");
    if (e.ctrlKey) {
      mods.add("ctrl");
    }
    if (e.commandKey) {
      mods.add("command");
    }

    for (let hk of this) {
      let ok = e.keyCode == hk.key;
      if (!ok) continue;

      let count = 0;
      for (let m of hk.mods) {
        m = m.toLowerCase().trim();

        if (!mods.has(m)) {
          ok = false;
          break;
        }

        count++;
      }

      if (count != mods.length) {
        ok = false;
      }

      if (ok) {
        try {
          hk.exec(ctx);
        } catch (error) {
          print_stack$1(error);
          console.log("failed to execute a hotkey", keymap[e.keyCode]);
        }
        return true;
      }
    }
  }

  add(hk) {
    this.push(hk);
  }

  push(hk) {
    super.push(hk);
  }
}

"use strict";

class EventDispatcher {
  constructor() {
    this._cbs = {};
  }

  _fireEvent(type, data) {
    let stop = false;

    data = {
      stopPropagation() {
        stop = true;
      },

      data : data
    };

    if (type in this._cbs) {
      for (let cb of this._cbs[type]) {
        cb(data);
        if (stop) {
          break;
        }
      }
    }
  }

  on(type, cb) {
    if (!(type in this._cbs)) {
      this._cbs[type] = [];
    }

    this._cbs[type].push(cb);
    return this;
  }

  off(type, cb) {
    if (!(type in this._cbs)) {
      console.warn("event handler not in list", type, cb);
      return this;
    }

    let stack = this._cbs[type];
    if (stack.indexOf(cb) < 0) {
      console.warn("event handler not in list", type, cb);
      return this;
    }

    stack.remove(cb);
    return this;
  }
}
function copyMouseEvent(e) {
  let ret = {};
  
  function bind(func, obj) {
    return function() {
      return this._orig.apply(func, arguments);
    }
  }
  
  let exclude = new Set([
    //"prototype",
    //"constructor",
    "__proto__"
  ]);
  
  ret._orig = e;
  
  for (let k in e) {
    let v = e[k];
    
    if (exclude.has(k)) {
      continue;
    }
    
    if (typeof v == "function") {
      v = bind(v);
    }
    
    ret[k] = v;
  }
  
  return ret;
}

const DomEventTypes = {
  on_mousemove   : 'mousemove',
  on_mousedown   : 'mousedown',
  on_mouseup     : 'mouseup',
  on_touchstart  : 'touchstart',
  on_touchcancel : 'touchcanel',
  on_touchmove   : 'touchmove',
  on_touchend    : 'touchend',
  on_mousewheel  : 'mousewheel',
  on_keydown     : 'keydown',
  on_keyup       : 'keyup',
  on_pointerdown : 'pointerdown',
  on_pointermove : 'pointermove',
  on_pointercancel : 'pointercancel',
  on_pointerup   : 'pointerup',

  //on_keypress    : 'keypress'
};

function getDom(dom, eventtype) {
  if (eventtype.startsWith("key"))
    return window;
  return dom;
}

let modalStack = [];
function isModalHead(owner) {
  return modalStack.length == 0 || 
         modalStack[modalStack.length-1] === owner;
}

class EventHandler {
  pushModal(dom, _is_root) {
    this._modalstate = pushModalLight(this);
    return;
    /*
    if (!_is_root) {
      console.trace("pushModal called");
    }
    
    if (this.modal_pushed) {
      console.trace("Error: pushModal called twice", this, dom);
      return;
    }
    
    var this2 = this;
    
    this.modal_pushed = true;
    modalStack.push(this);
    
    let stop_prop = (func) => {
      return (e) => {
        //XXX this isModalHead call really shouldn't be necassary.  argh!
        if (!isModalHead(this))
          return;
        
        if (!_is_root) {
          e.stopPropagation();
          e.preventDefault();
        }
        
          func.call(this, e);
      }
    }
    
    for (var k in DomEventTypes) {
      var type = DomEventTypes[k];
      
      if (this[k] === undefined)
        continue;
      
      if (this["__"+k] === undefined) {
        this["__"+k] = stop_prop(this[k]);
      }
      
      getDom(dom, type).addEventListener(type, this["__"+k], true);
    }
    */
  }
  
  popModal(dom) {
    if (this._modalstate !== undefined) {
      popModalLight(this._modalstate);
      this._modalstate = undefined;
    }
    return;
    console.trace("popModal called");
    
    var ok = modalStack[modalStack.length-1] === this;
    ok = ok && this.modal_pushed;
    
    if (!ok) {
      console.trace("Error: popModal called but pushModal wasn't", this, dom);
      return;
    }
    
    modalStack.pop();
    
    for (var k in DomEventTypes) {
      if (this["__"+k] === undefined)
        continue;

      var type = DomEventTypes[k];
      
      getDom(dom, type).removeEventListener(type, this["__"+k], true);
    }
    
    this.modal_pushed = false;
  }
}

function pushModal(dom, handlers) {
  console.warn("Deprecated call to pathux.events.pushModal; use api in simple_events.js instead");
  let h = new EventHandler();
  
  for (let k in handlers) {
    h[k] = handlers[k];
  }
  
  handlers.popModal = () => {
    return h.popModal(dom);
  };
  
  h.pushModal(dom, false);
  
  return h;
}

const CurveConstructors = [];
const CURVE_VERSION = 1.0;

const CurveFlags = {
  SELECT : 1
};


const TangentModes = {
  SMOOTH : 1,
  BREAK  : 2
};

class CurveTypeData {
  constructor() {
    this.type = this.constructor.name;
  }

  static register(cls) {
    CurveConstructors.push(cls);
  }

  toJSON() {
    return {
      type: this.type
    }
  }

  loadJSON(obj) {
    this.type = obj.type;

    return this;
  }

  redraw() {
    if (this.parent)
      this.parent.redraw();
  }

  get hasGUI() {
    throw new Error("get hasGUI(): implement me!");
  }

  makeGUI(container) {

  }

  killGUI(container) {
    container.clear();
  }

  evaluate(s) {
    throw new Error("implement me!");
  }

  derivative(s) {
    let df = 0.0001;

    if (s > 1.0 - df * 3) {
      return (this.evaluate(s) - this.evaluate(s - df)) / df;
    } else if (s < df * 3) {
      return (this.evaluate(s + df) - this.evaluate(s)) / df;
    } else {
      return (this.evaluate(s + df) - this.evaluate(s - df)) / (2 * df);
    }
  }

  derivative2(s) {
    let df = 0.0001;

    if (s > 1.0 - df * 3) {
      return (this.derivative(s) - this.derivative(s - df)) / df;
    } else if (s < df * 3) {
      return (this.derivative(s + df) - this.derivative(s)) / df;
    } else {
      return (this.derivative(s + df) - this.derivative(s - df)) / (2 * df);
    }
  }

  inverse(y) {
    let steps = 9;
    let ds = 1.0 / steps, s = 0.0;
    let best = undefined;
    let ret = undefined;

    for (let i = 0; i < steps; i++, s += ds) {
      let s1 = s, s2 = s + ds;

      let mid;

      for (let j = 0; j < 11; j++) {
        let y1 = this.evaluate(s1);
        let y2 = this.evaluate(s2);
        mid = (s1 + s2) * 0.5;

        if (Math.abs(y1 - y) < Math.abs(y2 - y)) {
          s2 = mid;
        } else {
          s1 = mid;
        }
      }

      let ymid = this.evaluate(mid);

      if (best === undefined || Math.abs(y - ymid) < best) {
        best = Math.abs(y - ymid);
        ret = mid;
      }
    }

    return ret === undefined ? 0.0 : ret;
  }

  onActive(parent, draw_transform) {
  }

  onInactive(parent, draw_transform) {
  }

  reset() {

  }

  destroy() {
  }

  update() {
    if (this.parent)
      this.parent._on_change();
  }

  draw(canvas, g, draw_transform) {
  }

  loadSTRUCT(reader) {
    reader(this);
  }
}

CurveTypeData.STRUCT = `
CurveTypeData {
  type : string;
}
`;
nstructjs$1.register(CurveTypeData);

class EquationCurve extends CurveTypeData {
  constructor(type) {
    super();

    this.equation = "x";
  }

  static define() {return {
    uiname : "Equation",
    name   : "equation"
  }}

  toJSON() {
    let ret = super.toJSON();

    return Object.assign(ret, {
      equation : this.equation
    });
  }

  loadJSON(obj) {
    super.loadJSON(obj);

    if (obj.equation !== undefined) {
      this.equation = obj.equation;
    }

    return this;
  }

  get hasGUI() {
    return this.uidata !== undefined;
  }

  makeGUI(container, canvas, drawTransform) {
    this.uidata = {
      canvas     : canvas,
      g          : canvas.g,
      draw_trans : drawTransform,
    };

    let text = container.textbox(undefined, this.equation);
    text.onchange = (val) => {
      console.log(val);
      this.equation = val;
      this.update();
      this.redraw();
    };
  }

  killGUI(dom, gui, canvas, g, draw_transform) {
    if (this.uidata !== undefined) {
      this.uidata.textbox.remove();
    }

    this.uidata = undefined;
  }

  evaluate(s) {
    let sin = Math.sin, cos = Math.cos, pi = Math.PI, PI = Math.PI,
      e = Math.E, E = Math.E, tan = Math.tan, abs = Math.abs,
      floor = Math.floor, ceil = Math.ceil, acos = Math.acos,
      asin = Math.asin, atan = Math.atan, cosh = Math.cos,
      sinh = Math.sinh, log = Math.log, pow = Math.pow,
      exp = Math.exp, sqrt = Math.sqrt, cbrt = Math.cbrt,
      min = Math.min, max = Math.max;

    try {
      let x = s;
      let ret = eval(this.equation);

      this._haserror = false;

      return ret;
    } catch (error) {
      this._haserror = true;
      console.log("ERROR!");
      return 0.0;
    }
  }

  derivative(s) {
    let df = 0.0001;

    if (s > 1.0 - df*3) {
      return (this.evaluate(s) - this.evaluate(s - df)) / df;
    } else if (s < df*3) {
      return (this.evaluate(s+df) - this.evaluate(s)) / df;
    } else {
      return (this.evaluate(s+df) - this.evaluate(s-df)) / (2 * df);
    }
  }

  derivative2(s) {
    let df = 0.0001;

    if (s > 1.0 - df*3) {
      return (this.derivative(s) - this.derivative(s - df)) / df;
    } else if (s < df*3) {
      return (this.derivative(s+df) - this.derivative(s)) / df;
    } else {
      return (this.derivative(s+df) - this.derivative(s-df)) / (2 * df);
    }
  }

  inverse(y) {
    let steps = 9;
    let ds = 1.0 / steps, s = 0.0;
    let best = undefined;
    let ret = undefined;

    for (let i=0; i<steps; i++, s += ds) {
      let s1 = s, s2 = s+ds;

      let mid;

      for (let j=0; j<11; j++) {
        let y1 = this.evaluate(s1);
        let y2 = this.evaluate(s2);
        mid = (s1+s2)*0.5;

        if (Math.abs(y1-y) < Math.abs(y2-y)) {
          s2 = mid;
        } else {
          s1 = mid;
        }
      }

      let ymid = this.evaluate(mid);

      if (best === undefined || Math.abs(y - ymid) < best) {
        best = Math.abs(y - ymid);
        ret = mid;
      }
    }

    return ret === undefined ? 0.0 : ret;
  }

  onActive(parent, draw_transform) {
  }

  onInactive(parent, draw_transform) {
  }

  reset() {
    this.equation = "x";
  }

  destroy() {
  }

  draw(canvas, g, draw_transform) {
    g.save();
    if (this._haserror) {

      g.fillStyle = g.strokeStyle = "rgba(255, 50, 0, 0.25)";
      g.beginPath();
      g.rect(0, 0, 1, 1);
      g.fill();

      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(1, 1);
      g.moveTo(0, 1);
      g.lineTo(1, 0);

      g.lineWidth *= 3;
      g.stroke();

      g.restore();
      return;
    }

    g.restore();
  }
}
EquationCurve.STRUCT = nstructjs$1.inherit(EquationCurve, CurveTypeData) + `
  equation : string;
}
`;
nstructjs$1.register(EquationCurve);
CurveTypeData.register(EquationCurve);


class GuassianCurve extends CurveTypeData {
  constructor(type) {
    super();

    this.height = 1.0;
    this.offset = 1.0;
    this.deviation = 0.3; //standard deviation
  }

  static define() {return {
    uiname : "Guassian",
    name   : "guassian"
  }}

  toJSON() {
    let ret = super.toJSON();

    return Object.assign(ret, {
      height    : this.height,
      offset    : this.offset,
      deviation : this.deviation
    });
  }

  loadJSON(obj) {
    super.loadJSON(obj);

    this.height = obj.height !== undefined ? obj.height : 1.0;
    this.offset = obj.offset;
    this.deviation = obj.deviation;

    return this;
  }

  get hasGUI() {
    return this.uidata !== undefined;
  }

  makeGUI(container, canvas, drawTransform) {
    this.uidata = {
      canvas     : canvas,
      g          : canvas.g,
      draw_trans : drawTransform,
    };

    this.uidata.hslider = container.slider(undefined, "Height", this.height, -10, 10, 0.0001);
    this.uidata.hslider.onchange = () => {
      this.height = this.uidata.hslider.value;
      this.redraw();
      this.update();
    };
    this.uidata.oslider = container.slider(undefined, "Offset", this.offset, -10, 10, 0.0001);
    this.uidata.oslider.onchange = () => {
      this.offset = this.uidata.oslider.value;
      this.redraw();
      this.update();
    };
    this.uidata.dslider = container.slider(undefined, "STD Deviation", this.deviation, -10, 10, 0.0001);
    this.uidata.dslider.onchange = () => {
      this.deviation = this.uidata.dslider.value;
      this.redraw();
      this.update();
    };

    /*
    this.uidata.oslider = gui.slider(undefined, "Offset", this.offset,
      -2.5, 2.5, 0.0001, false, false, (val) => {this.offset = val, this.update(), this.redraw();});
    this.uidata.dslider = gui.slider(undefined, "STD Deviation", this.deviation,
      0.0001, 1.25, 0.0001, false, false, (val) => {this.deviation = val, this.update(), this.redraw();});
    //*/
  }

  killGUI(dom, gui, canvas, g, draw_transform) {
    if (this.uidata !== undefined) {
      this.uidata.hslider.remove();
      this.uidata.oslider.remove();
      this.uidata.dslider.remove();
    }

    this.uidata = undefined;
  }

  evaluate(s) {
    let r = this.height * Math.exp(-((s-this.offset)*(s-this.offset)) / (2*this.deviation*this.deviation));
    return r;
  }

  derivative(s) {
    let df = 0.0001;

    if (s > 1.0 - df*3) {
      return (this.evaluate(s) - this.evaluate(s - df)) / df;
    } else if (s < df*3) {
      return (this.evaluate(s+df) - this.evaluate(s)) / df;
    } else {
      return (this.evaluate(s+df) - this.evaluate(s-df)) / (2 * df);
    }
  }

  derivative2(s) {
    let df = 0.0001;

    if (s > 1.0 - df*3) {
      return (this.derivative(s) - this.derivative(s - df)) / df;
    } else if (s < df*3) {
      return (this.derivative(s+df) - this.derivative(s)) / df;
    } else {
      return (this.derivative(s+df) - this.derivative(s-df)) / (2 * df);
    }
  }

  inverse(y) {
    let steps = 9;
    let ds = 1.0 / steps, s = 0.0;
    let best = undefined;
    let ret = undefined;

    for (let i=0; i<steps; i++, s += ds) {
      let s1 = s, s2 = s+ds;

      let mid;

      for (let j=0; j<11; j++) {
        let y1 = this.evaluate(s1);
        let y2 = this.evaluate(s2);
        mid = (s1+s2)*0.5;

        if (Math.abs(y1-y) < Math.abs(y2-y)) {
          s2 = mid;
        } else {
          s1 = mid;
        }
      }

      let ymid = this.evaluate(mid);

      if (best === undefined || Math.abs(y - ymid) < best) {
        best = Math.abs(y - ymid);
        ret = mid;
      }
    }

    return ret === undefined ? 0.0 : ret;
  }
}

GuassianCurve.STRUCT = nstructjs$1.inherit(GuassianCurve, CurveTypeData) + `
  height    : float;
  offset    : float;
  deviation : float;
}
`;
nstructjs$1.register(GuassianCurve);
CurveTypeData.register(GuassianCurve);

"use strict";

var Vector2$1 = Vector2;

let RecalcFlags = {
  BASIS : 1,
  FULL  : 2,
  ALL   : 3,

  //private flag
  FULL_BASIS : 4
};

function mySafeJSONStringify(obj) {
  return JSON.stringify(obj.toJSON(), function(key) {
    let v = this[key];

    if (typeof v === "number") {
      if (v !== Math.floor(v)) {
        v = parseFloat(v.toFixed(5));
      } else {
        v = v;
      }
    }

    return v;
  });
}
function mySafeJSONParse(buf) {
  return JSON.parse(buf, (key, val) => {

  });
};

window.mySafeJSONStringify = mySafeJSONStringify;


var bin_cache = {};
window._bin_cache = bin_cache;

var eval2_rets = cachering.fromConstructor(Vector2$1, 32);

/*
  I hate these stupid curve widgets.  This horrible one here works by
  root-finding the x axis on a two dimensional b-spline (which works
  surprisingly well).
*/

function bez3(a, b, c, t) {
  var r1 = a + (b - a)*t;
  var r2 = b + (c - b)*t;

  return r1 + (r2 - r1)*t;
}

function bez4(a, b, c, d, t) {
  var r1 = bez3(a, b, c, t);
  var r2 = bez3(b, c, d, t);

  return r1 + (r2 - r1)*t;
}

function binomial(n, i) {
  if (i > n) {
    throw new Error("Bad call to binomial(n, i), i was > than n");
  }

  if (i == 0 || i == n) {
    return 1;
  }

  var key = "" + n + "," + i;

  if (key in bin_cache)
    return bin_cache[key];

  var ret = binomial(n-1, i-1) + bin(n-1, i);
  bin_cache[key] = ret;

  return ret;
}
window.bin = binomial;


class Curve1DPoint extends Vector2$1 {
  constructor(co) {
    super(co);

    this.rco = new Vector2$1(co);
    this.sco = new Vector2$1(co);

    //for transform
    this.startco = new Vector2$1();
    this.eid = -1;
    this.flag = 0;

    this.tangent = TangentModes.SMOOTH;
  }

  copy() {
    var ret = new Curve1DPoint(this);

    ret.tangent = this.tangent;
    ret.rco.load(ret);

    return ret;
  }

  toJSON() {
    return {
      0       : this[0],
      1       : this[1],
      eid     : this.eid,
      flag    : this.flag,
      tangent : this.tangent
    };
  }

  static fromJSON(obj) {
    var ret = new Curve1DPoint(obj);

    ret.eid = obj.eid;
    ret.flag = obj.flag;
    ret.tangent = obj.tangent;

    return ret;
  }

  loadSTRUCT(reader) {
    reader(this);

    this.sco.load(this);
    this.rco.load(this);
    this.recalc = RecalcFlags.ALL;
  }
};
Curve1DPoint.STRUCT = `
Curve1DPoint {
  0       : float;
  1       : float;
  eid     : int;
  flag    : int;
  deg     : int;
  tangent : int;
  rco     : vec2;
}
`;
nstructjs$1.register(Curve1DPoint);

class BSplineCurve extends CurveTypeData {
  constructor() {
    super();

    this.fastmode = false;
    this.points = [];
    this.length = 0;
    this.interpolating = false;

    this._ps = [];
    this.hermite = [];
    this.fastmode = false;

    this.deg = 6;
    this.recalc = RecalcFlags.ALL;
    this.basis_tables = [];
    this.eidgen = new IDGen();

    this.add(0, 0);
    this.add(1, 1);

    this.mpos = new Vector2$1();

    this.on_mousedown = this.on_mousedown.bind(this);
    this.on_mousemove = this.on_mousemove.bind(this);
    this.on_mouseup = this.on_mouseup.bind(this);
    this.on_keydown = this.on_keydown.bind(this);
    this.on_touchstart = this.on_touchstart.bind(this);
    this.on_touchmove = this.on_touchmove.bind(this);
    this.on_touchend = this.on_touchend.bind(this);
    this.on_touchcancel = this.on_touchcancel.bind(this);
  }

  static define() {return {
    uiname : "B-Spline",
    name   : "bspline"
  }}

  remove(p) {
    let ret = this.points.remove(p);
    this.length = this.points.length;

    return ret;
  }

  add(x, y, no_update=false) {
    var p = new Curve1DPoint();
    this.recalc = RecalcFlags.ALL;

    p.eid = this.eidgen.next();

    p[0] = x;
    p[1] = y;

    p.sco.load(p);
    p.rco.load(p);

    this.points.push(p);
    if (!no_update) {
      this.update();
    }

    this.length = this.points.length;

    return p;
  }

  update() {
    super.update();
  }

  updateKnots(recalc=true) {
    if (recalc) {
      this.recalc = RecalcFlags.ALL;
    }

    if (!this.interpolating) {
      for (var i = 0; i < this.points.length; i++) {
        this.points[i].rco.load(this.points[i]);
      }
    }

    this.points.sort(function(a, b) {
      return a[0] - b[0];
    });

    this._ps = [];
    if (this.points.length < 2) {
      return;
    }
    var a = this.points[0][0], b = this.points[this.points.length-1][0];

    for (var i=0; i<this.points.length-1; i++) {
      this._ps.push(this.points[i]);
    }

    if (this.points.length < 3) {
      return;
    }

    var l1 = this.points[this.points.length-1];
    var l2 = this.points[this.points.length-2];

    var p = l1.copy();
    p.rco[0] = l1.rco[0] - 0.00004;
    p.rco[1] = l2.rco[1] + (l1.rco[1] - l2.rco[1])*1.0/3.0;
    //this._ps.push(p);

    var p = l1.copy();
    p.rco[0] = l1.rco[0] - 0.00003;
    p.rco[1] = l2.rco[1] + (l1.rco[1] - l2.rco[1])*1.0/3.0;
    //this._ps.push(p);

    var p = l1.copy();
    p.rco[0] = l1.rco[0] - 0.00001;
    p.rco[1] = l2.rco[1] + (l1.rco[1] - l2.rco[1])*1.0/3.0;
    this._ps.push(p);

    var p = l1.copy();
    p.rco[0] = l1.rco[0] - 0.00001;
    p.rco[1] = l2.rco[1] + (l1.rco[1] - l2.rco[1])*2.0/3.0;
    this._ps.push(p);

    this._ps.push(l1);

    if (!this.interpolating) {
      for (var i = 0; i < this._ps.length; i++) {
        this._ps[i].rco.load(this._ps[i]);
      }
    }

    for (var i=0; i<this.points.length; i++) {
      var p = this.points[i];
      var x = p[0], y = p[1];//this.evaluate(x);

      p.sco[0] = x;
      p.sco[1] = y;
    }
  }

  toJSON() {
    let ret = super.toJSON();

    ret.interpolating = this.interpolating;

    var ps = [];
    for (var i=0; i<this.points.length; i++) {
      ps.push(this.points[i].toJSON());
    }

    ret = Object.assign(ret, {
      points : ps,
      deg    : this.deg,
      eidgen : this.eidgen.toJSON()
    });

    return ret;
  }

  loadJSON(obj) {
    super.loadJSON(obj);

    this.interpolating = obj.interpolating;
    this.length = 0;
    this.points = [];
    this._ps = [];

    this.hightlight = undefined;
    this.eidgen = IDGen.fromJSON(obj.eidgen);
    this.recalc = RecalcFlags.ALL;
    this.mpos = [0, 0];

    for (var i=0; i<obj.points.length; i++) {
      this.points.push(Curve1DPoint.fromJSON(obj.points[i]));
    }

    this.deg = obj.deg;

    this.updateKnots();
    this.redraw();
    return this;
  }

  basis(t, i) {
    if (this.recalc & RecalcFlags.FULL_BASIS) {
      return this._basis(t, i);
    }

    if (this.recalc & RecalcFlags.BASIS) {
      this.regen_basis();
      this.recalc &= ~RecalcFlags.BASIS;
    }

    i = Math.min(Math.max(i, 0), this._ps.length-1);
    t = Math.min(Math.max(t, 0.0), 1.0)*0.999999999;

    var table = this.basis_tables[i];

    var s = t*(table.length/4)*0.99999;

    var j = ~~s;
    s -= j;

    j *= 4;
    return table[j] + (table[j+3] - table[j])*s;

    return bez4(table[j], table[j+1], table[j+2], table[j+3], s);
  }

  reset() {
    this.length = 0;
    this.points = [];
    this._ps = [];

    this.add(0, 0, true);
    this.add(1, 1, true);

    this.recalc = 1;
    this.updateKnots();
    this.update();

    return this;
  }

  regen_hermite(steps) {
    //console.log("building spline approx");

    if (steps === undefined) {
      steps = this.fastmode ? 180 : 340;
    }

    if (this.interpolating) {
      steps *= 2;
    }

    this.hermite = new Array(steps);
    var table =this.hermite;

    var eps = 0.00001;
    var dt = (1.0-eps*4.001)/(steps-1);
    var t=eps*4;
    var lastdv1, lastf3;

    for (var j=0; j<steps; j++, t += dt) {
      var f1 = this._evaluate(t-eps*2);
      var f2 = this._evaluate(t-eps);
      var f3 = this._evaluate(t);
      var f4 = this._evaluate(t+eps);
      var f5 = this._evaluate(t+eps*2);

      var dv1 = (f4-f2) / (eps*2);
      dv1 /= steps;

      if (j > 0) {
        var j2 = j-1;

        table[j2*4]   = lastf3;
        table[j2*4+1] = lastf3 + lastdv1/3.0;
        table[j2*4+2] = f3 - dv1/3.0;
        table[j2*4+3] = f3;
      }

      lastdv1 = dv1;
      lastf3 = f3;
    }
  }

  solve_interpolating() {
    //this.recalc |= RecalcFlags.FULL_BASIS;

    for (let p of this._ps) {
      p.rco.load(p);
    }

    this._evaluate2(0.5);

    let error1 = (p) => {
      //return p.vectorDistance(this._evaluate2(p[0]));
      return this._evaluate(p[0]) - p[1];
    };

    let error = (p) => {
      return error1(p);

      /*
      let err = 0.0;
      for (let p of this.points) {
        //err += error1(p)**2;
        err += Math.abs(error1(p));
      }

      //return Math.sqrt(err);
      return err;
      //*/
    };

    let err = 0.0;
    let g = new Vector2$1();

    for (let step=0; step<25; step++) {
      err = 0.0;

      for (let p of this._ps) {
        let r1 = error(p);
        const df = 0.00001;

        err += Math.abs(r1);

        if (p === this._ps[0] || p === this._ps[this._ps.length-1]) {
        //  continue;
        }

        g.zero();

        for (let i = 0; i < 2; i++) {
          let orig = p.rco[i];
          p.rco[i] += df;
          let r2 = error(p);
          p.rco[i] = orig;

          g[i] = (r2 - r1) / df;
        }

        let totgs = g.dot(g);
        //console.log(totgs);

        if (totgs < 0.00000001) {
          continue;
        }

        r1 /= totgs;
        let k = 0.5;

        p.rco[0] += -r1*g[0]*k;
        p.rco[1] += -r1*g[1]*k;
      }

      //console.log("ERR", err);

      this.updateKnots(false);

      let th = this.fastmode ? 0.001 : 0.00005;
      if (err < th) {
        break;
      }
    }

    //this.recalc &= ~RecalcFlags.FULL_BASIS;
  }

  regen_basis() {
    //console.log("building basis functions");
    //var steps = this.fastmode && !this.interpolating ? 64 : 128;
    var steps = this.fastmode ? 64 : 128;

    if (this.interpolating) {
      steps *= 2;
    }

    this.basis_tables = new Array(this._ps.length);

    for (var i=0; i<this._ps.length; i++) {
      var table = this.basis_tables[i] = new Array((steps-1)*4);

      var eps = 0.00001;
      var dt = (1.0-eps*8)/(steps-1);
      var t=eps*4;
      var lastdv1, lastf3;

      for (var j=0; j<steps; j++, t += dt) {
        var f1 = this._basis(t-eps*2, i);
        var f2 = this._basis(t-eps, i);
        var f3 = this._basis(t, i);
        var f4 = this._basis(t+eps, i);
        var f5 = this._basis(t+eps*2, i);

        var dv1 = (f4-f2) / (eps*2);
        dv1 /= steps;

        if (j > 0) {
          var j2 = j-1;

          table[j2*4]   = lastf3;
          table[j2*4+1] = lastf3 + lastdv1/3.0;
          table[j2*4+2] = f3 - dv1/3.0;
          table[j2*4+3] = f3;
        }

        lastdv1 = dv1;
        lastf3 = f3;
      }
    }
  }

  _basis(t, i) {
    var len = this._ps.length;
    var ps = this._ps;

    function safe_inv(n) {
      return n == 0 ? 0 : 1.0 / n;
    }

    function bas(s, i, n) {
      var kp = Math.min(Math.max(i-1, 0), len-1);
      var kn = Math.min(Math.max(i+1, 0), len-1);
      var knn = Math.min(Math.max(i+n, 0), len-1);
      var knn1 = Math.min(Math.max(i+n+1, 0), len-1);
      var ki = Math.min(Math.max(i, 0), len-1);

      if (n == 0) {
        return s >= ps[ki].rco[0] && s < ps[kn].rco[0] ? 1 : 0;
      } else {

        var a = (s-ps[ki].rco[0]) * safe_inv(ps[knn].rco[0]-ps[ki].rco[0]+0.0001);
        var b = (ps[knn1].rco[0] - s) * safe_inv(ps[knn1].rco[0] - ps[kn].rco[0] + 0.0001);

        var ret = a*bas(s, i, n-1) + b*bas(s, i+1, n-1);

        /*
        if (isNaN(ret)) {
          console.log(a, b, s, i, n, len);
          throw new Error();
        }
        //*/

        //if (Math.random() > 0.99) {
        //console.log(ret, a, b, n, i);
        //}
        return ret;
      }
    }

    var p = this._ps[i].rco, nk, pk;
    var deg = this.deg;

    var b = bas(t, i-deg, deg);

    return b;
  }

  evaluate(t) {
    var a = this.points[0].rco, b = this.points[this.points.length-1].rco;

    if (t < a[0]) return a[1];
    if (t > b[0]) return b[1];

    if (this.points.length == 2) {
      t = (t - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1])*t;
    }

    if (this.recalc) {
      this.regen_basis();

      if (this.interpolating) {
        this.solve_interpolating();
      }

      this.regen_hermite();
      this.recalc = 0;
    }

    t *= 0.999999;

    var table = this.hermite;
    var s = t*(table.length/4);

    var i = Math.floor(s);
    s -= i;

    i *= 4;

    return table[i] + (table[i+3] - table[i])*s;
  }

  _evaluate(t) {
    var start_t = t;

    if (this.points.length > 1) {
      var a = this.points[0], b = this.points[this.points.length-1];

      if (t < a[0]) return a[1];
      if (t >= b[0]) return b[1];
    }

    for (var i=0; i<35; i++) {
      var df = 0.0001;
      var ret1 = this._evaluate2(t < 0.5 ? t : t-df);
      var ret2 = this._evaluate2(t < 0.5 ? t+df : t);

      var f1 = Math.abs(ret1[0]-start_t);
      var f2 = Math.abs(ret2[0]-start_t);
      var g = (f2-f1) / df;

      if (f1 == f2) break;

      //if (f1 < 0.0005) break;

      if (f1 == 0.0 || g == 0.0)
        return this._evaluate2(t)[1];

      var fac = -(f1/g)*0.5;
      if (fac == 0.0) {
        fac = 0.01;
      } else if (Math.abs(fac) > 0.1) {
        fac = 0.1*Math.sign(fac);
      }

      t += fac;
      var eps = 0.00001;
      t = Math.min(Math.max(t, eps), 1.0-eps);
    }

    return this._evaluate2(t)[1];
  }

  _evaluate2(t) {
    var ret = eval2_rets.next();

    t *= 0.9999999;

    var totbasis = 0;
    var sumx = 0;
    var sumy = 0;

    for (var i=0; i<this._ps.length; i++) {
      var p = this._ps[i].rco;
      var b = this.basis(t, i);

      sumx += b*p[0];
      sumy += b*p[1];

      totbasis += b;
    }

    if (totbasis != 0.0) {
      sumx /= totbasis;
      sumy /= totbasis;
    }

    ret[0] = sumx;
    ret[1] = sumy;

    return ret;
  }

  get hasGUI() {
    return this.uidata !== undefined;
  }

  _wrapTouchEvent(e) {
    return {
      x          : e.touches.length ? e.touches[0].pageX : this.mpos[0],
      y          : e.touches.length ? e.touches[0].pageY : this.mpos[1],
      button     : 0,
      shiftKey   : e.shiftKey,
      altKey     : e.altKey,
      ctrlKey    : e.ctrlKey,
      isTouch    : true,
      commandKey : e.commandKey,
      stopPropagation : e.stopPropagation(),
      preventDefault : e.preventDefault()
    };
  }

  on_touchstart(e) {
    this.mpos[0] = e.touches[0].pageX;
    this.mpos[1] = e.touches[0].pageY;

    let e2 = this._wrapTouchEvent(e);

    this.on_mousemove(e2);
    this.on_mousedown(e2);
  }

  on_touchmove(e) {
    this.mpos[0] = e.touches[0].pageX;
    this.mpos[1] = e.touches[0].pageY;

    let e2 = this._wrapTouchEvent(e);
    this.on_mousemove(e2);
  }

  on_touchend(e) {
    this.on_mouseup(this._wrapTouchEvent(e));
  }

  on_touchcancel(e) {
    this.on_touchend(e);
  }

  makeGUI(container, canvas, drawTransform) {
    this.uidata = {
      start_mpos  : new Vector2$1(),
      transpoints : [],

      dom         : container,
      canvas      : canvas,
      g           : canvas.g,
      transforming: false,
      draw_trans  : drawTransform
    };

    canvas.addEventListener("touchstart", this.on_touchstart);
    canvas.addEventListener("touchmove", this.on_touchmove);
    canvas.addEventListener("touchend", this.on_touchend);
    canvas.addEventListener("touchcancel", this.on_touchcancel);

    canvas.addEventListener("mousedown", this.on_mousedown);
    canvas.addEventListener("mousemove", this.on_mousemove);
    canvas.addEventListener("mouseup", this.on_mouseup);
    canvas.addEventListener("keydown", this.on_keydown);

    let row = container.row();

    let fullUpdate = () => {
      this.updateKnots();
      this.update();
      this.regen_basis();
      this.recalc = RecalcFlags.ALL;
      this.redraw();
    };

    row.iconbutton(Icons.TINY_X, "Delete Point", () => {
      console.log("delete point");

      for (var i=0; i<this.points.length; i++) {
        var p = this.points[i];

        if (p.flag & CurveFlags.SELECT) {
          this.points.remove(p);
          i--;
        }
      }

      fullUpdate();
    });

    row.button("Reset", () => {
      this.reset();
    });

    row.simpleslider(undefined, "Degree", this.deg, 1, 6, 1, true, true, (slider) => {
      this.deg = Math.floor(slider.value);

      fullUpdate();
      console.log(this.deg);

    });

    row = container.row();
    let check = row.check(undefined, "Interpolating");
    check.checked = this.interpolating;

    check.onchange = () => {
      this.interpolating = check.value;
      console.log(check.value);
      fullUpdate();
    };

    return this;
  }

  killGUI(container, canvas) {
    if (this.uidata !== undefined) {
      let ud = this.uidata;
      this.uidata = undefined;

      console.log("removing event handlers for bspline curve");

      canvas.removeEventListener("touchstart", this.on_touchstart);
      canvas.removeEventListener("touchmove", this.on_touchmove);
      canvas.removeEventListener("touchend", this.on_touchend);
      canvas.removeEventListener("touchcancel", this.on_touchcancel);

      canvas.removeEventListener("mousedown", this.on_mousedown);
      canvas.removeEventListener("mousemove", this.on_mousemove);
      canvas.removeEventListener("mouseup", this.on_mouseup);
      canvas.removeEventListener("keydown", this.on_keydown);
    }

    return this;
  }

  start_transform() {
    this.uidata.transpoints = [];

    for (let p of this.points) {
      if (p.flag & CurveFlags.SELECT) {
        this.uidata.transpoints.push(p);
        p.startco.load(p);
      }
    }
  }

  on_mousedown(e) {
    console.log("bspline mdown", e.x, e.y);

    this.uidata.start_mpos.load(this.transform_mpos(e.x, e.y));
    this.fastmode = true;

    console.log(this.uidata.start_mpos, this.uidata.draw_trans);

    var mpos = this.transform_mpos(e.x, e.y);
    var x=mpos[0], y = mpos[1];
    this.do_highlight(x, y);

    if (this.points.highlight != undefined) {
      if (!e.shiftKey) {
        for (var i=0; i<this.points.length; i++) {
          this.points[i].flag &= ~CurveFlags.SELECT;
        }

        this.points.highlight.flag |= CurveFlags.SELECT;
      } else {
        this.points.highlight.flag ^= CurveFlags.SELECT;
      }


      this.uidata.transforming = true;

      this.start_transform();

      this.updateKnots();
      this.update();
      this.redraw();
      return;
    } else if (!e.isTouch) {
      var p = this.add(this.uidata.start_mpos[0], this.uidata.start_mpos[1]);
      this.points.highlight = p;

      this.updateKnots();
      this.update();
      this.redraw();

      this.points.highlight.flag |= CurveFlags.SELECT;

      this.uidata.transforming = true;
      this.uidata.transpoints = [this.points.highlight];
      this.uidata.transpoints[0].startco.load(this.uidata.transpoints[0]);
    }
  }

  do_highlight(x, y) {
    var trans = this.uidata.draw_trans;
    var mindis = 1e17, minp=undefined;
    var limit = 19/trans[0], limitsqr = limit*limit;

    for (var i=0; i<this.points.length; i++) {
      var p = this.points[i];
      var dx = x-p.sco[0], dy = y-p.sco[1], dis = dx*dx + dy*dy;

      if (dis < mindis && dis < limitsqr) {
        mindis = dis;
        minp = p;
      }
    }

    if (this.points.highlight != minp) {
      this.points.highlight = minp;
      this.redraw();
    }
    //console.log(x, y, minp);
  }

  do_transform(x, y) {
    var off = new Vector2$1([x, y]).sub(this.uidata.start_mpos);

    for (var i=0; i<this.uidata.transpoints.length; i++) {
      var p = this.uidata.transpoints[i];
      p.load(p.startco).add(off);

      p[0] = Math.min(Math.max(p[0], 0), 1);
      p[1] = Math.min(Math.max(p[1], 0), 1);
    }

    this.updateKnots();
    this.update();
    this.redraw();
  }

  transform_mpos(x, y){
    var r = this.uidata.canvas.getClientRects()[0];

    x -= parseInt(r.left);
    y -= parseInt(r.top);

    var trans = this.uidata.draw_trans;

    x = x/trans[0] - trans[1][0];
    y = -y/trans[0] - trans[1][1];

    return [x, y];
  }

  on_mousemove(e) {
    if (e.isTouch && this.uidata.transforming) {
      e.preventDefault();
    }

    var mpos = this.transform_mpos(e.x, e.y);
    var x=mpos[0], y = mpos[1];

    if (this.uidata.transforming) {
      this.do_transform(x, y);
      this.evaluate(0.5);
      //this.update();
      //this.doSave();
    } else {
      this.do_highlight(x, y);
    }
  }

  on_mouseup(e) {
    this.uidata.transforming = false;
    this.fastmode = false;
    this.updateKnots();
    this.update();
  }

  on_keydown(e) {
    console.log(e.keyCode);

    switch (e.keyCode) {
      case 88: //xkeey
      case 46: //delete
        if (this.points.highlight != undefined) {
          this.points.remove(this.points.highlight);
          this.recalc = RecalcFlags.ALL;

          this.points.highlight = undefined;
          this.updateKnots();
          this.update();

          if (this._save_hook !== undefined) {
            this._save_hook();
          }
        }
        break;
    }
  }

  draw(canvas, g, draw_trans) {
    g.save();

    if (this.uidata === undefined) {
      return;
    }

    this.uidata.canvas = canvas;
    this.uidata.g = g;
    this.uidata.draw_trans = draw_trans;

    let sz = draw_trans[0], pan = draw_trans[1];
    g.lineWidth *= 3.0;

    for (var ssi=0; ssi<2; ssi++) {
      break; //uncomment to draw basis functions
      for (var si=0; si<this.points.length; si++) {
        g.beginPath();

        var f = 0;
        for (var i=0; i<steps; i++, f += df) {
          var totbasis = 0;

          for (var j=0; j<this.points.length; j++) {
            totbasis += this.basis(f, j);
          }

          var val = this.basis(f, si);

          if (ssi)
            val /= (totbasis == 0 ? 1 : totbasis);

          (i==0 ? g.moveTo : g.lineTo).call(g, f, ssi ? val : val*0.5, w, w);
        }

        var color, alpha = this.points[si] === this.points.highlight ? 1.0 : 0.7;

        if (ssi) {
          color = "rgba(105, 25, 5,"+alpha+")";
        } else {
          color = "rgba(25, 145, 45,"+alpha+")";
        }
        g.strokeStyle = color;
        g.stroke();
      }
    }

    g.lineWidth /= 3.0;

    let w = 0.03;

    for (let p of this.points) {
      g.beginPath();

      if (p === this.points.highlight) {
        g.fillStyle = "green";
      } else if (p.flag & CurveFlags.SELECT) {
        g.fillStyle = "red";
      } else {
        g.fillStyle = "orange";
      }

      g.rect(p.sco[0]-w/2, p.sco[1]-w/2, w, w);

      g.fill();
    }

    g.restore();
  }

  loadSTRUCT(reader) {
    reader(this);
    super.loadSTRUCT(reader);

    this.updateKnots();
    this.regen_basis();
    this.recalc = RecalcFlags.ALL;
  }
}

BSplineCurve.STRUCT = nstructjs$1.inherit(BSplineCurve, CurveTypeData) + `
  points        : array(Curve1DPoint);
  deg           : int;
  eidgen        : IDGen;
  interpolating : bool;
}
`;
nstructjs$1.register(BSplineCurve);
CurveTypeData.register(BSplineCurve);

"use strict";

var Vector2$2 = Vector2;

function mySafeJSONStringify$1(obj) {
  return JSON.stringify(obj.toJSON(), function(key) {
    let v = this[key];

    if (typeof v === "number") {
      if (v !== Math.floor(v)) {
        v = parseFloat(v.toFixed(5));
      } else {
        v = v;
      }
    }

    return v;
  });
}
function mySafeJSONParse$1(buf) {
  return JSON.parse(buf, (key, val) => {

  });
};

window.mySafeJSONStringify = mySafeJSONStringify$1;

class Curve1D extends EventDispatcher {
  constructor() {
    super();

    this.generators = [];
    this.VERSION = CURVE_VERSION;

    for (let gen of CurveConstructors) {
      gen = new gen();

      gen.parent = this;
      this.generators.push(gen);
    }

    this.generators.active = this.generators[0];
  }

  get generatorType() {
    return this.generators.active ? this.generators.active.type : undefined;
  }

  load(b) {
    if (b === undefined) {
      return;
    }

    let buf1 = mySafeJSONStringify$1(b);
    let buf2 = mySafeJSONStringify$1(this);

    if (buf1 === buf2) {
      return;
    }

    this.loadJSON(JSON.parse(buf1));
    this._on_change();
    this.redraw();

    return this;
  }

  copy() {
    let ret = new Curve1D();
    ret.loadJSON(JSON.parse(mySafeJSONStringify$1(this)));
    return ret;
  }

  _on_change() {

  }

  redraw() {
    this._fireEvent("draw", this);
  }

  setGenerator(type) {
    for (let gen of this.generators) {
      if (gen.type === type || gen.constructor.name === type || gen.constructor === type) {
        if (this.generators.active) {
          this.generators.active.onInactive();
        }

        this.generators.active = gen;
        gen.onActive();

        return;
      }
    }

    throw new Error("unknown curve type" + type);
  }

  get fastmode() {
    return this._fastmode;
  }

  set fastmode(val) {
    this._fastmode = val;

    for (let gen of this.generators) {
      gen.fastmode = val;
    }
  }

  toJSON() {
    let ret = {
      generators       : [],
      VERSION          : this.VERSION,
      active_generator : this.generatorType
    };

    for (let gen of this.generators) {
      ret.generators.push(gen.toJSON());
    }

    return ret;
  }

  getGenerator(type) {
    for (let gen of this.generators) {
      if (gen.type === type) {
        return gen;
      }
    }

    throw new Error("Unknown generator " + type + ".");
  }

  switchGenerator(type) {
    let gen = this.getGenerator(type);

    if (gen !== this.generators.active) {
      let old = this.generators.active;

      this.generators.active = gen;

      old.onInactive(this);
      gen.onActive(this);
    }

    return gen;
  }

  equals(b) {
    //console.log(mySafeJSONStringify(this));
    //console.log(mySafeJSONStringify(b));

    let a = mySafeJSONStringify$1(this).trim();
    let b2 = mySafeJSONStringify$1(b).trim();

    if (a !== b2) {
      console.log(a);
      console.log(b2);
    }

    return a === b2;
  }

  destroy() {
    return this;
  }

  loadJSON(obj) {
    this.VERSION = obj.VERSION;

    //this.generators = [];
    for (let gen of obj.generators) {
      let gen2 = this.getGenerator(gen.type);
      gen2.parent = undefined;
      gen2.reset();
      gen2.loadJSON(gen);
      gen2.parent = this;

      if (gen.type === obj.active_generator) {
        this.generators.active = gen2;
      }

      //this.generators.push(gen2);
    }

    return this;
  }

  evaluate(s) {
    return this.generators.active.evaluate(s);
  }

  derivative(s) {
    return this.generators.active.derivative(s);
  }

  derivative2(s) {
    return this.generators.active.derivative2(s);
  }

  inverse(s) {
    return this.generators.active.inverse(s);
  }

  reset() {
    this.generators.active.reset();
  }

  update() {
    return this.generators.active.update();
  }

  draw(canvas, g, draw_transform) {
    var w=canvas.width, h=canvas.height;

    g.save();

    let sz = draw_transform[0], pan = draw_transform[1];

    g.beginPath();
    g.moveTo(-1, 0);
    g.lineTo(1, 0);
    g.strokeStyle = "red";
    g.stroke();

    g.beginPath();
    g.moveTo(0, -1);
    g.lineTo(0, 1);
    g.strokeStyle = "green";
    g.stroke();

    //g.rect(0, 0, 1, 1);
    //g.fillStyle = "rgb(50, 50, 50)";
    //g.fill();

    var f=0, steps=64;
    var df = 1/(steps-1);
    var w = 6.0/sz;

    let curve = this.generators.active;

    g.beginPath();
    for (var i=0; i<steps; i++, f += df) {
      var val = curve.evaluate(f);

      (i==0 ? g.moveTo : g.lineTo).call(g, f, val, w, w);
    }

    g.strokeStyle = "grey";
    g.stroke();

    if (this.overlay_curvefunc !== undefined) {
      g.beginPath();
      f = 0.0;

      for (var i=0; i<steps; i++, f += df) {
        var val = this.overlay_curvefunc(f);

        (i==0 ? g.moveTo : g.lineTo).call(g, f, val, w, w);
      }

      g.strokeStyle = "green";
      g.stroke();
    }

    this.generators.active.draw(canvas, g, draw_transform);

    g.restore();
    return this;
  }

  loadSTRUCT(reader) {
    this.generators = [];
    reader(this);

    console.log("VERSION", this.VERSION);

    if (this.VERSION <= 0.75) {
      this.generators = [];
      for (let cls of CurveConstructors) {
        this.generators.push(new cls());
      }

      this.generators.active = this.getGenerator("BSplineCurve");
    }

    console.log("ACTIVE", this._active);

    for (let gen of this.generators) {
      if (gen.type === this._active) {
        console.log("found active", this._active);
        this.generators.active = gen;
      }
    }

    delete this._active;
  }
}

Curve1D.STRUCT = `
Curve1D {
  generators  : array(abstract(CurveTypeData));
  _active     : string | obj.generators.active.type;
  VERSION     : float;
}
`;
nstructjs$1.register(Curve1D);

let first = (iter) => {
  if (iter === undefined) {
    return undefined;
  }
  
  if (!(Symbol.iterator in iter)) {
    for (let item in iter) {
      return item;
    }
    
    return undefined;
  }
  
  for (let item of iter) {
    return item;
  }
};

//set PropTypes to custom type integers
function setPropTypes(types) {
  for (let k in types) {
    PropTypes[k] = types[k];
  }
}

const PropSubTypes$1 = {
  COLOR : 1
};

let customPropertyTypes = [];

let PropClasses = {};
function _addClass(cls) {
  PropClasses[new cls().type] = cls;
}

let customPropTypeBase = 17;

class ToolProperty extends ToolPropertyIF {
  constructor(type, subtype, apiname, uiname, description, flag, icon) {
    super();

    this.data = undefined;

    if (type === undefined) {
      type = this.constructor.PROP_TYPE_ID;
    }

    this.type = type;
    this.subtype = subtype;

    //is false if this property still has its default value,
    //i.e. it hasn't been set by the user or anyone else
    this.wasSet = false;

    this.apiname = apiname;
    this.uiname = uiname !== undefined ? uiname : apiname;
    this.description = description;
    this.flag = flag;
    this.icon = icon;
    
    this.callbacks = {};
  } 

  static register(cls) {
    cls.PROP_TYPE_ID = (1<<customPropTypeBase);
    PropTypes[cls.name] = cls.PROP_TYPE_ID;

    customPropTypeBase++;
    customPropertyTypes.push(cls);

    return cls.PROP_TYPE_ID;
  }

  private() {
    this.flag |= PropFlags.PRIVATE;
    return this;
  }

  _fire(type, arg1, arg2) {
    if (this.callbacks[type] === undefined) {
      return;
    }

    for (let cb of this.callbacks[type]) {
      cb.call(this, arg1, arg2);
    }
    return this;
  }

  on(type, cb) {
    if (this.callbacks[type] === undefined) {
      this.callbacks[type] = [];
    }

    this.callbacks[type].push(cb);
    return this;
  }

  off(type, cb) {
    this.callbacks[type].remove(cb);
    return this;
  }

  toJSON() {
    return {
      type        : this.type,
      subtype     : this.subtype,
      apiname     : this.apiname,
      uiname      : this.uiname,
      description : this.description,
      flag        : this.flag,
      icon        : this.icon,
      data        : this.data,
      range       : this.range,
      uiRange     : this.uiRange,
      step        : this.step
    };
  }
  
  loadJSON(obj) {
    this.type = obj.type;
    this.subtype = obj.subtype;
    this.apiname = obj.apiname;
    this.uiname = obj.uiname;
    this.description = obj.description;
    this.flag = obj.flag;
    this.icon = obj.icon;
    this.data = obj.data;
    
    return this;
  }
  
  getValue() {
    return this.data;
  }  
  
  setValue(val) {
    if (this.constructor === ToolProperty) {
      throw new Error("implement me!");
    }

    this.wasSet = true;

    this._fire("change", val);
  }
  
  copyTo(b) {
    b.apiname = this.apiname;
    b.uiname = this.uiname;
    b.description = this.description;
    b.flag = this.flag;
    b.icon = this.icon;
    b.baseUnit = this.baseUnit;
    b.subtype = this.subtype;
    b.displayUnit = this.displayUnit;

    for (let k in this.callbacks) {
      b.callbacks[k] = this.callbacks[k];
    }
  }
  
  copy() { //default copy method
    let ret = new this.constructor();
    
    this.copyTo(ret);
    ret.data = this.data;
    
    return ret;
  }
  
  setStep(step) {
    this.step = step;
    return this;
  }
  
  setRange(min, max) {
    if (min === undefined || max === undefined) {
      throw new Error("min and/or max cannot be undefined");
    }
    
    this.range = [min, max];
    return this;
  }

  setBaseUnit(unit) {
    this.baseUnit = unit;
  }

  setDisplayUnit(unit) {
    this.displayUnit = unit;
  }

  setUIRange(min, max) {
    if (min === undefined || max === undefined) {
      throw new Error("min and/or max cannot be undefined");
    }

    this.uiRange = [min, max];
    return this;
  }

  setIcon(icon) {
    this.icon = icon;
    
    return this;
  }
}

class StringProperty extends ToolProperty {
  constructor(value, apiname, uiname, description, flag, icon) {
    super(PropTypes.STRING, undefined, apiname, uiname, description, flag, icon);
  }
  
  copyTo(b) {
    super.copyTo(b);
    b.data = this.data;
    
    return this;
  }
  
  copy() {
    let ret = new StringProperty();
    this.copyTo(ret);
    return ret;
  }
  
  setValue(val) {
    //fire events
    super.setValue(val);
    this.data = val;
  }
}  
  
let num_res =[
  /([0-9]+)/,
  /((0x)?[0-9a-fA-F]+(h?))/,
  /([0-9]+\.[0-9]*)/,
  /([0-9]*\.[0-9]+)/
];
//num_re = /([0-9]+\.[0-9]*)|([0-9]*\.[0-9]+)/

function isNumber(f) {
  if (f == "NaN" || (typeof f == "number" && isNaN(f))) {
    return false;
  }
  
  f = (""+f).trim();
  
  let ok = false;
  
  for (let re of num_res) {
    let ret = f.match(re);
    if (!ret) {
      ok = false;
      continue;
    }
    
    ok = ret[0].length == f.length;
    if (ok) {
      break;
    }
  }
  
  return ok;
}
_addClass(StringProperty);

window.isNumber = isNumber;

class NumProperty extends ToolProperty {
  constructor(type, value, apiname, 
              uiname, description, flag, icon) {
    super(type, undefined, apiname, uiname, description, flag, icon);
    
    this.data = 0;
    this.range = [0, 0];
  }
};

class _NumberPropertyBase extends ToolProperty {
  constructor(type, value, apiname,
              uiname, description, flag, icon) {
    super(type, undefined, apiname, uiname, description, flag, icon);

    this.data = 0.0;
    this.expRate = 1.33;
    this.step = 0.1;

    this.range = [-1e17, 1e17];
    this.uiRange = undefined; //if undefined, this.range will be used

    if (value !== undefined && value !== null) {
      this.setValue(value);
    }
  }

  get ui_range() {
    console.warn("NumberProperty.ui_range is deprecated");
    return this.uiRange;
  }

  toJSON() {
    let json = super.toJSON();

    json.data = this.data;
    json.expRate = this.expRate;

    return json;
  }

  loadJSON(obj) {
    super.loadJSON(obj);

    this.data = obj.data || this.data;
    this.expRate = obj.expRate || this.expRate;

    return this;
  }

  set ui_range(val) {
    console.warn("NumberProperty.ui_range is deprecated");
    this.uiRange = val;
  }

  copyTo(b) {
    b.data = this.data;
  }


  /*
  * non-linear exponent for number sliders
  * in roll mode
  * */
  setExpRate(exp) {
    this.expRate = exp;
  }

  setValue(val) {
    if (val === undefined || val === null) {
      return;
    }

    if (typeof val !== "number") {
      throw new Error("Invalid number " + val);
    }

    this.data = val;

    super.setValue(val);
    return this;
  }

  loadJSON(obj) {
    super.loadJSON(obj);

    let get = (key) => {
      if (key in obj) {
        this[key] = obj[key];
      }
    };

    get("range");
    get("step");
    get("expRate");
    get("ui_range");

    return this;
  }
}

class IntProperty$1 extends _NumberPropertyBase {
  constructor(value, apiname, 
              uiname, description, flag, icon)  
  {
    super(PropTypes.INT, value, apiname, uiname, description, flag, icon);
    
    this.radix = 10;
  }

  setValue(val) {
    super.setValue(Math.floor(val));
    return this;
  }

  setRadix(radix) {
    this.radix = radix;
  }

  toJSON() {
    let json = super.toJSON();

    json.data = this.data;
    json.radix = this.radix;

    return json;
  }

  loadJSON(obj) {
    super.loadJSON(obj);

    this.data = obj.data || this.data;
    this.radix = obj.radix || this.radix;

    return this;
  }

}
_addClass(IntProperty$1);

class BoolProperty extends ToolProperty {
  constructor(value, apiname,
              uiname, description, flag, icon)
  {
    super(PropTypes.BOOL, undefined, apiname, uiname, description, flag, icon);

    this.data = !!value;
  }

  copyTo(b) {
    super.copyTo(b);
    b.data = this.data;

    return this;
  }

  copy() {
    let ret = new BoolProperty();
    this.copyTo(ret);

    return ret;
  }

  setValue(val) {
    this.data = !!val;
    return this;
  }

  getValue() {
    return this.data;
  }

  toJSON() {
    let ret = super.toJSON();

    return ret;
  }

  loadJSON(obj) {
    super.loadJSON(obj);

    return this;
  }
}
_addClass(BoolProperty);


class FloatProperty$1 extends _NumberPropertyBase {
  constructor(value, apiname, 
              uiname, description, flag, icon)  
  {
    super(PropTypes.FLOAT, value, apiname, uiname, description, flag, icon);
    
    this.decimalPlaces = 4;
  }

  setDecimalPlaces(n) {
    this.decimalPlaces = n;
    return this;
  }

  copyTo(b) {
    super.copyTo(b);
    b.data = this.data;
    return this;
  }

  setValue(val) {
    this.data = val;
    
    //fire events
    super.setValue(val);
    
    return this;
  }

  toJSON() {
    let json = super.toJSON();

    json.data = this.data;
    json.decimalPlaces = this.decimalPlaces;

    return json;
  }

  loadJSON(obj) {
    super.loadJSON(obj);

    this.data = obj.data || this.data;
    this.decimalPlaces = obj.decimalPlaces || this.decimalPlaces;

    return this;
  }
}
_addClass(FloatProperty$1);

class EnumProperty$1 extends ToolProperty {
  constructor(string, valid_values, apiname, 
              uiname, description, flag, icon) 
  {
    super(PropTypes.ENUM, undefined, apiname, uiname, description, flag, icon);
    
    this.values = {};
    this.keys = {};
    this.ui_value_names = {};
    this.descriptions = {};

    if (valid_values === undefined) return this;
    
    if (valid_values instanceof Array || valid_values instanceof String) {
      for (var i=0; i<valid_values.length; i++) {
        this.values[valid_values[i]] = valid_values[i];
        this.keys[valid_values[i]] = valid_values[i];
      }
    } else {
      for (var k in valid_values) {
        this.values[k] = valid_values[k];
        this.keys[valid_values[k]] = k;
      }
    }
    
    if (string === undefined) {
      this.data = first(valid_values);
    } else {
      this.setValue(string);
    }
    
    for (var k in this.values) {
      let uin = k.replace(/[_-]/g, " ").trim();
      uin = uin.split(" ");
      let uiname = "";

      for (let word of uin) {
        uiname += word[0].toUpperCase() + word.slice(1, word.length).toLowerCase() + " ";
      }

      uiname = uiname.trim();

      this.ui_value_names[k] = uiname;
      this.descriptions[k] = uiname;
    }
    
    this.iconmap = {};
  }

  addUINames(map) {
    for (let k in map) {
      this.ui_value_names[k] = map[k];
    }

    return this;
  }

  addDescriptions(map) {
    for (let k in map) {
      this.descriptions[k] = map[k];
    }

    return this;
  }

  addIcons(iconmap) {
    if (this.iconmap === undefined) {
      this.iconmap = {};
    }
    for (var k in iconmap) {
      this.iconmap[k] = iconmap[k];
    }

    return this;
  }

  copyTo(p) {
    super.copyTo(p);

    p.keys = Object.assign({}, this.keys);
    p.values = Object.assign({}, this.values);
    p.data = this.data;
    p.ui_value_names = this.ui_value_names;
    p.update = this.update;
    p.api_update = this.api_update;
    
    p.iconmap = this.iconmap;
    p.descriptions = this.descriptions;
    
    return p;
  }
  
  copy() {
    var p = new EnumProperty$1("dummy", {"dummy" : 0}, this.apiname, this.uiname, this.description, this.flag);

    this.copyTo(p);
    return p;
  }

  getValue() {
    if (this.data in this.values)
      return this.values[this.data];
    else
      return this.data;
  }

  setValue(val) {
    if (!(val in this.values) && (val in this.keys))
      val = this.keys[val];
    
    if (!(val in this.values)) {
      console.warn("Invalid value for enum!", val, this.values);
      return;
    }
    
    this.data = val;
    
    //fire events
    super.setValue(val);
    return this;
  }
}
_addClass(EnumProperty$1);

class FlagProperty extends EnumProperty$1 {
  constructor(string, valid_values, apiname,
              uiname, description, flag, icon) {
    super(string, valid_values, apiname,
          uiname, description, flag, icon);

    this.type = PropTypes.FLAG;
  }

  setValue(bitmask) {
    this.data = bitmask;

    //do not trigger EnumProperty's setValue
    super.setValue(bitmask);
    //ToolProperty.prototype.setValue.call(this, bitmask);
    return this;
  }

  copy() {
    let ret = new FlagProperty();
    this.copyTo(ret);
    
    return ret;
  }
}
_addClass(FlagProperty);

class Vec2Property$1 extends FloatProperty$1 {
  constructor(data, apiname, uiname, description) {
    super(undefined, apiname, uiname, description);

    this.type = PropTypes.VEC2;
    this.data = new Vector2(data);
  }

  setValue(v) {
    this.data.load(v);
    ToolProperty.prototype.setValue.call(this, v);
    return this;
  }

  getValue() {
    return this.data;
  }

  copyTo(b) {
    let data = b.data;
    super.copyTo(b);

    b.data = data;
    b.data.load(this.data);
  }

  copy() {
    let ret = new Vec2Property$1();
    this.copyTo(ret);
    return ret;
  }
}
_addClass(Vec2Property$1);

class Vec3Property$1 extends FloatProperty$1 {
  constructor(data, apiname, uiname, description) {
    super(undefined, apiname, uiname, description);

    this.type = PropTypes.VEC3;
    this.data = new Vector3(data);
  }

  setValue(v) {
    this.data.load(v);
    ToolProperty.prototype.setValue.call(this, v);
    return this;
  }

  getValue() {
    return this.data;
  }

  copyTo(b) {
    let data = b.data;
    super.copyTo(b);

    b.data = data;
    b.data.load(this.data);
  }

  copy() {
    let ret = new Vec3Property$1();
    this.copyTo(ret);
    return ret;
  }
}
_addClass(Vec3Property$1);

class Vec4Property$1 extends FloatProperty$1 {
  constructor(data, apiname, uiname, description) {
    super(undefined, apiname, uiname, description);

    this.type = PropTypes.VEC4;
    this.data = new Vector4(data);
  }

  setValue(v) {
    this.data.load(v);
    ToolProperty.prototype.setValue.call(this, v);
    return this;
  }

  getValue() {
    return this.data;
  }

  copyTo(b) {
    let data = b.data;
    super.copyTo(b);

    b.data = data;
    b.data.load(this.data);
  }

  copy() {
    let ret = new Vec4Property$1();
    this.copyTo(ret);
    return ret;
  }
}
_addClass(Vec4Property$1);

class QuatProperty extends ToolProperty {
  constructor(data, apiname, uiname, description) {
    super(PropTypes.QUAT, undefined, apiname, uiname, description);
    this.data = new Quat(data);
  }

  setValue(v) {
    this.data.load(v);
    super.setValue(v);
    return this;
  }

  getValue() {
    return this.data;
  }

  copyTo(b) {
    super.copyTo(b);
    b.data.load(this.data);
  }

  copy() {
    let ret = new QuatProperty();
    this.copyTo(ret);
    return ret;
  }
}
_addClass(QuatProperty);

class Mat4Property extends ToolProperty {
  constructor(data, apiname, uiname, description) {
    super(PropTypes.MATRIX4, undefined, apiname, uiname, description);
    this.data = new Matrix4(data);
  }

  setValue(v) {
    this.data.load(v);
    super.setValue(v);
    return this;
  }

  getValue() {
    return this.data;
  }

  copyTo(b) {
    super.copyTo(b);

    b.data.load(this.data);
  }

  copy() {
    let ret = new Mat4Property();
    this.copyTo(ret);
    return ret;
  }
}
_addClass(Mat4Property);

/**
 * List of other tool props (all of one type)
 */
class ListProperty$1 extends ToolProperty {
  /*
  * Prop must be a ToolProperty subclass instance
  * */
  constructor(prop, list=[], uiname="") {
    super(PropTypes.PROPLIST);

    this.uiname = uiname;

    if (typeof prop == "number") {
      prop = PropClasses[prop];

      if (prop !== undefined) {
        prop = new prop();
      }
    } else if (prop !== undefined) {
      if (prop instanceof ToolProperty) {
        prop = prop.copy();
      } else {
        prop = new prop();
      }
    }


    this.prop = prop;
    this.value = [];

    for (let val of list) {
      this.push(val);
    }
  }

  copyTo(b) {
    super.copyTo(b);

    b.prop = this.prop.copy();

    for (let prop of this.value) {
      b.value.push(prop.copy());
    }

    return b;
  }

  copy() {
    let ret = new ListProperty$1(this.prop.copy());
    this.copyTo(ret);
    return ret;
  }

  push(item=undefined) {
    if (item === undefined) {
      item = this.prop.copy();
    }

    if (!(item instanceof ToolProperty)) {
      let prop = this.prop.copy();
      prop.setValue(item);
      item = prop;
    }

    this.value.push(item);
    return item;
  }

  clear() {
    this.value.length = 0;
  }

  setValue(value) {
    this.clear();

    for (let item of value) {
      let prop = this.push();

      if (typeof item !== "object") {
        prop.setValue(item);
      } else if (item instanceof prop.constructor) {
        item.copyTo(prop);
      } else {
        console.log(item);
        throw new Error("invalid value " + item);
      }
    }

    super.setValue(value);
    return this;
  }

  getValue() {
    return this.value;
  }

  [Symbol.iterator]() {
    let list = this.value;

    return (function*() {
      for (let item of list) {
        yield item.getValue();
      }
    })();
  }

  get length() {
    return this.value.length;
  }

  set length(val) {
    this.value.length = val;
  }
}

_addClass(ListProperty$1);

//like FlagsProperty but uses strings
class StringSetProperty$1 extends ToolProperty {
  constructor(value=undefined, definition=[]) {
    super(PropTypes.STRSET);

    let values = [];

    this.value = new set$1();

    let def = definition;
    if (Array.isArray(def) || def instanceof set$1 || def instanceof Set) {
      for (let item of def) {
        values.push(item);
      }
    } else if (typeof def === "object") {
      for (let k in def) {
        values.push(k);
      }
    } else if (typeof def === "string") {
      values.push(def);
    }

    this.values = {};
    this.ui_value_names = {};
    this.descriptions = {};
    this.iconmap = {};

    for (let v of values) {
      this.values[v] = v;
      
      let uiname = v.replace(/\_/g, " ").trim();
      uiname = uiname[0].toUpperCase() + uiname.slice(1, uiname.length);

      this.ui_value_names[v] = uiname;
    }

    if (value !== undefined) {
      this.setValue(value);
    }
  }

  /*
  * Values can be a string, undefined/null, or a list/set/object-literal of strings.
  * If destructive is true, then existing set will be cleared.
  * */
  setValue(values, destructive=true, soft_fail=true) {
    let bad = typeof values !== "string";
    bad = bad && typeof values !== "object";
    bad = bad && values !== undefined && values !== null;

    if (bad) {
      if (soft_fail) {
        console.warn("Invalid argument to StringSetProperty.prototype.setValue() " + values);
        return;
      } else {
        throw new Error("Invalid argument to StringSetProperty.prototype.setValue() " + values);
      }
    }

    //handle undefined/null
    if (!values) {
      this.value.clear();
    } else if (typeof values === "string") {
      if (destructive)
        this.value.clear();

      if (!(values in this.values)) {
        if (soft_fail) {
          console.warn(`"${values}" is not in this StringSetProperty`);
          return;
        } else {
          throw new Error(`"${values}" is not in this StringSetProperty`);
        }
      }

      this.value.add(values);
    } else {
      let data = [];

      if (Array.isArray(values) || values instanceof set$1 || values instanceof Set) {
        for (let item of values) {
          data.push(item);
        }
      } else { //object literal?
        for (let k in values) {
          data.push(k);
        }
      }

      for (let item of data) {
        if (!(item in this.values)) {
          if (soft_fail) {
            console.warn(`"${item}" is not in this StringSetProperty`);
            continue;
          } else {
            throw new Error(`"${item}" is not in this StringSetProperty`);
          }
        }

        this.value.add(item);
      }
    }

    super.setValue();
    return this;
  }

  getValue() {
    return this.value;
  }

  addIcons(iconmap) {
    if (iconmap === undefined)
      return;

    for (let k in iconmap) {
      this.iconmap[k] = iconmap[k];
    }

    return this;
  }


  addUINames(map) {
    for (let k in map) {
      this.ui_value_names[k] = map[k];
    }
    
    return this;
  }

  addDescriptions(map) {
    for (let k in map) {
      this.descriptions[k] = map[k];
    }

    return this;
  }

  copyTo(b) {
    super.copyTo(b);

    for (let val of this.value) {
      b.value.add(val);
    }
    
    b.values = {};
    for (let k in this.values) {
      b.values[k] = this.values[k];
    }

    for (let k in this.ui_value_names) {
      b.ui_value_names[k] = this.ui_value_names[k];
    }

    for (let k in this.iconmap) {
      b.iconmap[k] = this.iconmap[k];
    }

    for (let k in this.descriptions) {
      b.descriptions[k] = this.descriptions[k];
    }
  }

  copy() {
    let ret = new StringSetProperty$1(undefined, {});
    this.copyTo(ret);
    return ret;
  }
}

_addClass(StringSetProperty$1);

class Curve1DProperty extends ToolPropertyIF {
  constructor(curve, apiname, uiname, description, flag, icon) {
    super(PropTypes.CURVE, undefined, apiname, uiname, description, flag, icon);

    this.data = new Curve1D();

    if (curve !== undefined) {
      this.setValue(curve);
    }
  }

  getValue() {
    return this.data;
  }

  evaluate(t) {
    return this.data.evaluate(t);
  }

  setValue(curve) {
    if (curve === undefined) {
      return;
    }

    this.data.load(curve);
  }

  copyTo(b) {
    super.copyTo(b);

    b.setValue(this.data);
  }

  copy() {
    let ret = new Curve1DProperty();
    this.copyTo(ret);
    return ret;
  }
}

"use strict";

let ToolClasses = [];

function setContextClass(cls) {
  console.warn("setContextClass is deprecated");
}

const ToolFlags = {
  PRIVATE : 1
};


const UndoFlags = {
  NO_UNDO       : 2,
  IS_UNDO_ROOT  : 4,
  UNDO_BARRIER  :  8,
  HAS_UNDO_DATA : 16
};

class InheritFlag {
  constructor(slots={}) {
    this.slots = slots;
  }
}

class ToolOp extends EventHandler {
  static tooldef() {return {
    uiname   : "!untitled tool",
    toolpath : "logical_module.tool", //logical_module need not match up to real module name
    icon     : -1,
    description : undefined,
    is_modal : false,
    hotkey : undefined,
    undoflag : 0,
    flag     : 0,
    inputs   : {}, //tool properties, enclose in ToolOp.inherit({}) to inherit from parent classes
    outputs  : {}  //tool properties, enclose in ToolOp.inherit({}) to inherit from parent classes
  }}

  static inherit(slots) {
    return new InheritFlag(slots);
  }
  
  //creates a new instance from args
  static invoke(ctx, args) {
    let tool = new this();

    for (let k in args) {
      if (!(k in tool.inputs)) {
        console.warn("Unknown tool argument " + k);
        continue;
      }

      let prop = tool.inputs[k];
      let val = args[k];

      if ((typeof val === "string") && prop.type & (PropTypes.ENUM|PropTypes.FLAG)) {
        if (val in prop.values) {
          val = prop.values[val];
        } else {
          console.warn("Possible invalid enum/flag:", val);
          continue;
        }
      }

      tool.inputs[k].setValue(val);
    }

    return tool;
  }

  genToolString() {
    let def = this.constructor.tooldef();
    let path = def.toolpath + "(";

    for (let k in this.inputs) {
      let prop = this.inputs[k];

      path += k + "=";
      if (prop.type === PropTypes.STRING)
        path += "'";

      if (prop.type === PropTypes.FLOAT) {
        path += prop.getValue().toFixed(3);
      } else {
        path += prop.getValue();
      }
      
      if (prop.type === PropTypes.STRING)
        path += "'";
      path += " ";
    }
    path +=")";
    return path;
  }
  static register(cls) {
    if (ToolClasses.indexOf(cls) >= 0) {
      console.warn("Tried to register same ToolOp class twice:", cls.name, cls);
      return;
    }

    ToolClasses.push(cls);
  }

  static isRegistered(cls) {
    return ToolClasses.indexOf(cls) >= 0;
  }

  static unregister(cls) {
    if (ToolClasses.indexOf(cls) >= 0) {
      ToolClasses.remove(cls);
    }
  }

  constructor() {
    super();

    this._overdraw = undefined;

    var def = this.constructor.tooldef();

    if (def.undoflag !== undefined) {
      this.undoflag = def.undoflag;
    }

    if (def.flag !== undefined) {
      this.flag = def.flag;
    }

    this._accept = this._reject = undefined;
    this._promise = undefined;
    
    for (var k in def) {
      this[k] = def[k];
    }

    let getSlots = (slots, key) => {
      if (slots === undefined)
        return {};

      if (!(slots instanceof InheritFlag)) {
        return slots;
      }

      slots = {};
      let p = this.constructor;

      while (p !== undefined && p !== Object && p !== ToolOp) {
        if (p.tooldef) {
          let def = p.tooldef();

          if (def[key] !== undefined) {
            let slots2 = def[key];
            let stop = !(slots2 instanceof InheritFlag);

            if (slots2 instanceof InheritFlag) {
              slots2 = slots2.slots;
            }

            for (let k in slots2) {
              if (!(k in slots)) {
                slots[k] = slots2[k];
              }
            }

            if (stop) {
              break;
            }
          }

        }
        p = p.prototype.__proto__.constructor;
      }

      return slots;
    };

    let dinputs = getSlots(def.inputs, "inputs");
    let doutputs = getSlots(def.outputs, "outputs");

    this.inputs = {};
    this.outputs = {};
    
    if (dinputs) {
      for (let k in dinputs) {
        this.inputs[k] = dinputs[k].copy();
      }
    }
    
    if (doutputs) {
      for (let k in doutputs) {
        this.outputs[k] = doutputs[k].copy();
      }
    }

    this.drawlines = [];
  }

  //default on_keydown implementation for modal tools,
  //no need to call super() to execute this if you don't want to
  on_keydown(e) {
    switch (e.keyCode) {
      case keymap["Enter"]:
      case keymap["Space"]:
        this.modalEnd(false);
        break;
      case keymap["Escape"]:
        this.modalEnd(true);
        break;
    }
  }

  static canRun(ctx) {
    return true;
  }

  undoPre(ctx) {
    this._undo = _appstate.genUndoFile();
  }
  
  undo(ctx) {
    _appstate.loadUndoFile(this._undo);
  }

  //for compatibility with fairmotion
  exec_pre(ctx) {
    this.execPre(ctx);
  }

  execPre(ctx) {
  }
  exec(ctx) {
  }
  execPost(ctx) {

  }

  //for use in modal mode only
  resetDrawLines() {
    var ctx = this.modal_ctx;
    
    for (var dl of this.drawlines) {
      dl.remove();
    }
    
    this.drawlines.length = 0;
  }
  
  error(msg) {
    console.warn(msg);
  }

  getOverdraw() {
    if (this._overdraw === undefined) {
      this._overdraw = document.createElement("overdraw-x");
      this._overdraw.start(this.modal_ctx.screen);
    }

    return this._overdraw;
  }
  //for use in modal mode only
  addDrawLine(v1, v2, style) {
    let line = this.getOverdraw().line(v1, v2, style);
    this.drawlines.push(line);
    return line;
  }
  
  //returns promise to be executed on modalEnd
  modalStart(ctx) {
    if (this.modalRunning) {
      console.warn("Warning, tool is already in modal mode consuming events");
      return this._promise;
    }
    
    //console.warn("tool modal start");
    
    this.modal_ctx = ctx;
    this.modalRunning = true;

    this._promise = new Promise((accept, reject) => {
      this._accept = accept;
      this._reject = reject;

      this.pushModal(ctx.screen);
    });

    return this._promise;
  }

  /*eek, I've not been using this.
    guess it's a non-enforced contract, I've been naming
    cancel methods 'cancel' all this time.

    XXX fix
  */
  toolCancel() {
  }
  
  modalEnd(was_cancelled) {
    if (this._overdraw !== undefined) {
      this._overdraw.end();
      this._overdraw = undefined;
    }

    //console.log("tool modal end");
    
    if (was_cancelled && this._on_cancel !== undefined) {
      this._accept(this.modal_ctx, true);
      this._on_cancel(this);
    }
    
    this.resetDrawLines();
    
    var ctx = this.modal_ctx;
    
    this.modal_ctx = undefined;
    this.modalRunning = false;
    this.is_modal = false;
    
    this.popModal(_appstate._modal_dom_root);
    
    this._promise = undefined;
    this._accept(ctx, false); //Context, was_cancelled
    this._accept = this._reject = undefined;
  }
}

class ToolMacro extends ToolOp {
  static tooldef() {return {
    uiname : "Tool Macro"
  }}
  
  constructor() {
    super();
    
    this.tools = [];
    this.curtool = 0;
    this.has_modal = false;
    this.connects = [];
  }
  
  connect(srctool, dsttool, callback, thisvar) {
    this.connects.push({
      srctool  : srctool,
      dsttool  : dsttool,
      callback : callback,
      thisvar  : thisvar
    });
    
    return this;
  }
  
  add(tool) {
    if (tool.is_modal) {
      this.is_modal = true;
    }
    
    this.tools.push(tool);
    
    return this;
  }
  
  _do_connections(tool) {
    for (var c of this.connects) {
      if (c.srctool === tool) {
        c.callback.call(c.thisvar, c.srctool, c.dsttool);
      }
    }
  }

  static canRun(ctx) {
    return true;
  }

  /*
  canRun(ctx) {
    if (this.tools.length == 0)
      return false;
    
    //poll first tool only in list
    return this.tools[0].constructor.canRun(ctx);
  }//*/
  
  modalStart(ctx) {
    this._promise = new Promise((function(accept, reject) {
      this._accept = accept;
      this._reject = reject;
    }).bind(this));
    
    this.curtool = 0;

    let i;

    for (i=0; i<this.tools.length; i++) {
      if (this.tools[i].is_modal)
        break;
      
      this.tools[i].undoPre(ctx);
      this.tools[i].execPre(ctx);
      this.tools[i].exec(ctx);
      this.tools[i].execPost(ctx);
      this._do_connections(this.tools[i]);
    }
    
    var on_modal_end = (function on_modal_end() {
        this._do_connections(this.tools[this.curtool]);
        this.curtool++;
        
        while (this.curtool < this.tools.length && 
               !this.tools[this.curtool].is_modal) 
        {
            this.tools[this.curtool].undoPre(ctx);
            this.tools[this.curtool].execPre(ctx);
            this.tools[this.curtool].exec(ctx);
            this.tools[this.curtool].execPost(ctx);
            this._do_connections(this.tools[this.curtool]);
            
            this.curtool++;
        }
        
        if (this.curtool < this.tools.length) {
          this.tools[this.curtool].undoPre(ctx);
          this.tools[this.curtool].modalStart(ctx).then(on_modal_end);
        } else {
          this._accept(this, false);
        }
    }).bind(this);
    
    if (i < this.tools.length) {
      this.curtool = i;
      this.tools[this.curtool].undoPre(ctx);
      this.tools[this.curtool].modalStart(ctx).then(on_modal_end);
    }
    
    return this._promise;
  }
  
  exec(ctx) {
    for (var i=0; i<this.tools.length; i++) {
      this.tools[i].undoPre(ctx);
      this.tools[i].execPre(ctx);
      this.tools[i].exec(ctx);
      this.tools[i].execPost(ctx);
      this._do_connections(this.tools[i]);
    }
  }
  
  undoPre() {
    return; //undoPre is handled in exec() or modalStart()
  }
  
  undo(ctx) {
    for (var i=this.tools.length-1; i >= 0; i--) {
      this.tools[i].undo(ctx);
    }
  }
}

class ToolStack extends Array {
  constructor(ctx) {
    super();

    this.cur = -1;
    this.ctx = ctx;
    this.modalRunning = 0;
  }

  setRestrictedToolContext(ctx) {
    this.toolctx = ctx;
  }

  reset(ctx) {
    if (ctx !== undefined) {
      this.ctx = ctx;
    }

    this.modalRunning = 0;
    this.cur = -1;
    this.length = 0;
  }

  execTool(ctx, toolop) {
    if (this.ctx === undefined) {
      this.ctx = ctx;
    }

    if (!toolop.constructor.canRun(ctx)) {
      console.log("toolop.constructor.canRun returned false");
      return;
    }

    let tctx = this.toolctx !== undefined ? this.toolctx : ctx;
    tctx = tctx.toLocked();

    toolop._execCtx = tctx;

    if (!(toolop.undoflag & UndoFlags.NO_UNDO)) {
      this.cur++;

      //truncate
      this.length = this.cur+1;
      
      this[this.cur] = toolop;
      //let undoPre use full context
      //needed by DataPathSetOp
      toolop.undoPre(ctx.toLocked());
    }
    
    if (toolop.is_modal) {
      this.modalRunning = true;
      
      toolop._on_cancel = (function(toolop) {
        this.pop_i(this.cur);
        this.cur--;
      }).bind(this);
      
      //will handle calling .exec itself
      toolop.modalStart(ctx.toLocked());
    } else {
      toolop.execPre(tctx);
      toolop.exec(tctx);
      toolop.execPost(tctx);
    }
  }
  
  undo() {
    if (this.cur >= 0 && !(this[this.cur].undoflag & UndoFlags.IS_UNDO_ROOT)) {
      let tool = this[this.cur];
      tool.undo(tool._execCtx);
      this.cur--;
    }
  }
  
  redo() {
    if (this.cur >= -1 && this.cur+1 < this.length) {
      this.cur++;

      let tool = this[this.cur];
      let ctx = tool._execCtx;
      //ctx = this.ctx;

      tool.undoPre(ctx);
      tool.execPre(ctx);
      tool.exec(ctx);
      tool.execPost(ctx);
    }
  }
}

let PropFlags$1 = PropFlags,
    PropTypes$1 = PropTypes;

function isVecProperty(prop) {
  if (!prop)
    return false;

  let ok = false;

  ok = ok || prop instanceof Vec2Property;
  ok = ok || prop instanceof Vec3Property;
  ok = ok || prop instanceof Vec4Property;
  ok = ok || prop instanceof Vec2Property$1;
  ok = ok || prop instanceof Vec3Property$1;
  ok = ok || prop instanceof Vec4Property$1;

  ok = ok || prop.type === PropTypes$1.VEC2;
  ok = ok || prop.type === PropTypes$1.VEC3;
  ok = ok || prop.type === PropTypes$1.VEC4;
  ok = ok || prop.type === PropTypes$1.QUAT;

  return ok;
}

const DataFlags = {
  READ_ONLY : 1
};

class DataPathError extends Error {
};

class ListIface {
  getStruct(api, list, key) {

  }
  get(api, list, key) {

  }

  getKey(api, list, obj) {

  }

  getActive(api, list) {

  }

  setActive(api, list, val) {

  }

  set(api, list, key, val) {
    list[key] = val;
  }

  getIter() {

  }

  filter(api, list, filter) {

  }
}

class ToolOpIface {
  constructor() {
  }
  
  static tooldef() {return {
    uiname      : "!untitled tool",
    icon        : -1,
    toolpath    : "logical_module.tool", //logical_module need not match up to real module name
    description : undefined,
    is_modal    : false,
    inputs      : {}, //tool properties
    outputs     : {}  //tool properties
  }}
};

class ModelInterface {
  constructor() {
    this.prefix = "";
  }
  
  getToolDef(path) {
    throw new Error("implement me");
  }

  getToolPathHotkey(ctx, path) {
    return undefined;
  }

  get list() {
    throw new Error("implement me");
    return ListIface;
  }

  createTool(path, inputs={}, constructor_argument=undefined) {
    throw new Error("implement me");
  }
  
  //returns tool class, or undefined if one cannot be found for path
  parseToolPath(path) {
    throw new Error("implement me");
  }
  
  execTool(ctx, path, inputs={}, constructor_argument=undefined) {
    return new Promise((accept, reject) => {
      let tool = path;
      
      try {
        if (typeof tool == "string" || !(tool instanceof ToolOp)) {
          tool = this.createTool(ctx, path, inputs, constructor_argument);
        }
      } catch (error) {
        print_stack$1(error);
        reject(error);
        return;
      }
      
      //give client a chance to change tool instance directly
      accept(tool);
      
      //execute
      try {
        ctx.state.toolstack.execTool(ctx, tool);
      } catch (error) { //for some reason chrome is suppressing errors
        print_stack$1(error);
        throw error;
      }
    });
  }

  //used by simple_controller.js for tagging error messages
  pushReportContext(name) {

  }

  //used by simple_controller.js for tagging error messages
  popReportContext() {

  }

  static toolRegistered(tool) {
    throw new Error("implement me");
  }
  
  static registerTool(tool) {
    throw new Error("implement me");
  }
  
  //not yet supported by path.ux's controller implementation
  massSetProp(ctx, mass_set_path, value) {
    throw new Error("implement me");
  }

  resolveMassSetPaths(ctx, mass_set_path) {
    throw new Error("implement me");
  }
  
  /**
   * @example
   *
   * return {
   *   obj      : [object owning property key]
   *   parent   : [parent of obj]
   *   key      : [property key]
   *   subkey   : used by flag properties, represents a key within the property
   *   value    : [value of property]
   *   prop     : [optional toolprop.ToolProperty representing the property definition]
   *   struct   : [optional datastruct representing the type, if value is an object]
   *   mass_set : mass setter string, if controller implementation supports it
   * }
   */
  resolvePath(ctx, path, ignoreExistence) {
  }
  
  setValue(ctx, path, val) {
    let res = this.resolvePath(ctx, path);
    let prop = res.prop;

    if (prop !== undefined && (prop.flag & PropFlags$1.USE_CUSTOM_GETSET)) {
      prop.setValue(val);
      return;
    }

    if (prop !== undefined) {
      if (prop.type === PropTypes$1.CURVE && !val) {
        throw new DataPathError("can't set curve data to nothing");
      }

      let use_range = (prop.type & (PropTypes$1.INT | PropTypes$1.FLOAT));

      use_range = use_range || (res.subkey && (prop.type & (PropTypes$1.VEC2 | PropTypes$1.VEC3 | PropTypes$1.VEC4)));
      use_range = use_range && prop.range;
      use_range = use_range && !(prop.range[0] === 0.0 && prop.range[1] === 0.0);

      if (use_range) {
        val = Math.min(Math.max(val, prop.range[0]), prop.range[1]);
      }
    }

    let old = res.obj[res.key];

    if (res.subkey !== undefined && res.prop !== undefined && res.prop.type == PropTypes$1.ENUM) {
      let ival = res.prop.values[res.subkey];

      if (val) {
        res.obj[res.key] = ival;
      }
    } else if (res.prop !== undefined && res.prop.type == PropTypes$1.FLAG) {
      let ival = res.prop.values[res.subkey];

      if (val) {
        res.obj[res.key] |= ival;
      } else {
        res.obj[res.key] &= ~ival;
      }
    } else if (res.subkey !== undefined && isVecProperty(res.prop)) {
      res.obj[res.subkey] = val;
    } else if (!(prop !== undefined && prop instanceof ListIface)) {
      res.obj[res.key] = val;
    }

    if (prop !== undefined && prop instanceof ListIface) {
      prop.set(this, res.obj, res.key, val);
    } else if (prop !== undefined) {
      prop.dataref = res.obj;
      prop._fire("change", res.obj[res.key], old);
    }
  }

  getDescription(ctx, path) {
    let rdef = this.resolvePath(ctx, path);
    if (rdef === undefined) {
      throw new DataPathError("invalid path " + path);
    }

    if (!rdef.prop || !(rdef.prop instanceof ToolProperty)) {
      return "";
    }

    let type = rdef.prop.type;
    let prop = rdef.prop;

    if (rdef.subkey !== undefined) {
      let subkey = rdef.subkey;

      if (type & (PropTypes$1.VEC2|PropTypes$1.VEC3|PropTypes$1.VEC4)) {
        if (prop.descriptions && subkey in prop.descriptions) {
          return prop.descriptions[subkey];
        }
      } else if (type & (PropTypes$1.ENUM|PropTypes$1.FLAG)) {
        if (!(subkey in prop.values) && subkey in prop.keys) {
          subkey = prop.keys[subkey];
        };

        if (prop.descriptions && subkey in prop.descriptions) {
          return prop.descriptions[subkey];
        }
      } else if (type === PropTypes$1.PROPLIST) {
        let val = tdef.value;
        if (typeof val === "object" && val instanceof ToolProperty) {
          return val.description;
        }
      }
    }

    return rdef.prop.description ? rdef.prop.description : rdef.prop.uiname;
  }

  getValue(ctx, path) {
    if (typeof ctx == "string") {
      throw new Error("You forgot to pass context to getValue");
    }

    let ret = this.resolvePath(ctx, path);
    
    if (ret === undefined) {
      throw new DataPathError("invalid path", path);
    }
    
    if (ret.prop !== undefined && (ret.prop.flag & PropFlags$1.USE_CUSTOM_GETSET)) {
      ret.prop.dataref = ret.obj;
      
      return ret.prop.getValue();
    }
    
    return this.resolvePath(ctx, path).value;
  }
}

let DataAPIClass = undefined;
function setImplementationClass(cls) {
  DataAPIClass = cls;
}

function registerTool(cls) {
  if (DataAPIClass === undefined) {
    throw new Error("data api not initialized properly; call setImplementationClass");
  }
  
  return DataAPIClass.registerTool(cls);
}

class token {
  constructor(type, val, lexpos, lexlen, lineno, lexer, parser) {
    this.type = type;
    this.value = val;
    this.lexpos = lexpos;
    this.lexlen = lexlen;
    this.lineno = lineno;
    this.lexer = lexer;
    this.parser = parser;
  }

  toString() {
    if (this.value != undefined)
      return "token(type=" + this.type + ", value='" + this.value + "')"
    else
      return "token(type=" + this.type + ")"
  }
}

//func is optional. it takes a function
//with one parameter, token, and either
//a) returns the token, or b) returns
//undefined, in which case the token
//should be ignored by the lexer
class tokdef {
  constructor(name, regexpr, func) {
    this.name = name;
    this.re = regexpr;
    this.func = func;
  }
}

class PUTLParseError extends Error {
}

//errfunc is optional.  it requires
//a function that takes one param, lexer,
//and returns true if the lexer
//should propegate an error when an error
//has happened
class lexer {
  constructor(tokdef, errfunc) {
    this.tokdef = tokdef;
    this.tokens = new Array();
    this.lexpos = 0;
    this.lexdata = "";
    this.lineno = 0;
    this.errfunc = errfunc;
    this.tokints = {};

    for (var i=0; i<tokdef.length; i++) {
      this.tokints[tokdef[i].name] = i;
    }

    this.statestack = [["__main__", 0]];
    this.states = {"__main__" : [tokdef, errfunc]};
    this.statedata = 0; //public variable
  }

//errfunc is optional, defines state-specific error function
  add_state(name, tokdef, errfunc) {
    if (errfunc == undefined) {
      errfunc = function(lexer) { return true; };
    }

    this.states[name] = [tokdef, errfunc];
  }

  tok_int(name) {

  }

  //statedata is optional.
  //it stores state-specific data in lexer.statedata.
  push_state(state, statedata) {
    this.statestack.push([state, statedata]);

    state = this.states[state];
    this.statedata = statedata;

    this.tokdef = state[0];
    this.errfunc = state[1];
  }

  pop_state() {
    var item = this.statestack[this.statestack.length-1];
    var state = this.states[item[0]];

    this.tokdef = state[0];
    this.errfunc = state[1];
    this.statedata = item[1];
  }

  input(str) {
    //go back to main state
    while (this.statestack.length > 1) {
      this.pop_state();
    }

    this.lexdata = str;
    this.lexpos = 0;
    this.lineno = 0;
    this.tokens = new Array();

    this.peeked_tokens = [];
  }

  error() {
    if (this.errfunc != undefined && !this.errfunc(this))
      return;

    console.log("Syntax error near line " + this.lineno);
    var next = Math.min(this.lexpos+8, this.lexdata.length);
    console.log("  " + this.lexdata.slice(this.lexpos, next));

    throw new PUTLParseError("Parse error");
  }

  peek() {
    var tok = this.next(true);

    if (tok == undefined)
      return undefined;

    this.peeked_tokens.push(tok);
    return tok;
  }


  peek_i(i) {
    while (this.peeked_tokens.length <= i) {
      var t = this.peek();
      if (t == undefined)
        return undefined;
    }

    return this.peeked_tokens[i];
  }

  at_end() {
    return this.lexpos >= this.lexdata.length && this.peeked_tokens.length == 0;
  }

  next(ignore_peek) {
    if (ignore_peek != true && this.peeked_tokens.length > 0) {
      var tok = this.peeked_tokens[0];
      this.peeked_tokens.shift();

      return tok;
    }

    if (this.lexpos >= this.lexdata.length)
      return undefined;

    var ts = this.tokdef;
    var tlen = ts.length;

    var lexdata = this.lexdata.slice(this.lexpos, this.lexdata.length);

    var results = [];

    for (var i=0; i<tlen; i++) {
      var t = ts[i];

      if (t.re == undefined)
        continue;

      var res = t.re.exec(lexdata);

      if (res != null && res != undefined && res.index == 0) {
        results.push([t, res]);
      }
    }

    var max_res = 0;
    var theres = undefined;
    for (var i=0; i<results.length; i++) {
      var res = results[i];

      if (res[1][0].length > max_res) {
        theres = res;
        max_res = res[1][0].length;
      }
    }

    if (theres == undefined) {
      this.error();
      return;
    }

    var def = theres[0];

    var lexlen = max_res;
    var tok = new token(def.name, theres[1][0], this.lexpos, lexlen, this.lineno, this, undefined);
    this.lexpos += max_res;

    if (def.func) {
      tok = def.func(tok);
      if (tok == undefined) {
        return this.next();
      }
    }

    return tok;
  }
}

class parser {
  constructor(lexer, errfunc) {
    this.lexer = lexer;
    this.errfunc = errfunc;
    this.start = undefined;
  }

  parse(data, err_on_unconsumed) {
    if (err_on_unconsumed == undefined)
      err_on_unconsumed = true;

    if (data != undefined)
      this.lexer.input(data);

    var ret = this.start(this);
    if (err_on_unconsumed && !this.lexer.at_end() && this.lexer.next() != undefined) {
      //console.log(this.lexer.lexdata.slice(this.lexer.lexpos-1, this.lexer.lexdata.length));
      this.error(undefined, "parser did not consume entire input");
    }

    return ret;
  }

  input(data) {
    this.lexer.input(data);
  }

  error(tok, msg) {
    if (msg == undefined)
      msg = "";

    if (tok == undefined)
      var estr = "Parse error at end of input: " + msg;
    else
      estr = "Parse error at line " + (tok.lineno+1) + ": " + msg;

    var buf = "1| ";
    var ld = this.lexer.lexdata;
    var l = 1;
    for (var i=0; i<ld.length; i++) {
      var c = ld[i];
      if (c == '\n') {
        l++;
        buf += "\n" + l + "| ";
      } else {
        buf += c;
      }
    }

    console.log("------------------");
    console.log(buf);
    console.log("==================");
    console.log(estr);

    if (this.errfunc && !this.errfunc(tok)) {
      return;
    }

    throw new PUTLParseError(estr);
  }

  peek() {
    var tok = this.lexer.peek();
    if (tok != undefined)
      tok.parser = this;

    return tok;
  }

  peek_i(i) {
    var tok = this.lexer.peek_i(i);
    if (tok != undefined)
      tok.parser = this;

    return tok;
  }

  peeknext() {
    return this.peek_i(0);
  }

  next() {
    var tok = this.lexer.next();
    if (tok != undefined)
      tok.parser = this;

    return tok;
  }

  optional(type) {
    var tok = this.peek_i(0);

    if (tok == undefined) return false;

    if (tok.type == type) {
      this.next();
      return true;
    }

    return false;
  }

  at_end() {
    return this.lexer.at_end();
  }

  expect(type, msg) {
    var tok = this.next();

    if (msg == undefined)
      msg = type;

    if (tok == undefined || tok.type != type) {
      this.error(tok, "Expected " + msg + ", not " + tok.type);
    }

    return tok.value;
  }
}

function test_parser() {
  var basic_types = new set([
    "int",
    "float",
    "double",
    "vec2",
    "vec3",
    "vec4",
    "mat4",
    "string"]);

  var reserved_tokens = new set([
    "int",
    "float",
    "double",
    "vec2",
    "vec3",
    "vec4",
    "mat4",
    "string",
    "static_string",
    "array"]);

  function tk(name, re, func) {
    return new tokdef(name, re, func);
  }
  var tokens = [
    tk("ID", /[a-zA-Z]+[a-zA-Z0-9_]*/, function(t) {
      if (reserved_tokens.has(t.value)) {
        t.type = t.value.toUpperCase();
      }

      return t;
    }),
    tk("OPEN", /\{/),
    tk("CLOSE", /}/),
    tk("COLON", /:/),
    tk("JSCRIPT", /\|/, function(t) {
      var js = "";
      var lexer = t.lexer;
      while (lexer.lexpos < lexer.lexdata.length) {
        var c = lexer.lexdata[lexer.lexpos];
        if (c == "\n")
          break;

        js += c;
        lexer.lexpos++;
      }

      if (js.endsWith(";")) {
        js = js.slice(0, js.length-1);
        lexer.lexpos--;
      }

      t.value = js;
      return t;
    }),

    tk("LPARAM", /\(/),
    tk("RPARAM", /\)/),
    tk("COMMA", /,/),
    tk("NUM", /[0-9]/),
    tk("SEMI", /;/),
    tk("NEWLINE", /\n/, function(t) {
      t.lexer.lineno += 1;
    }),
    tk("SPACE", / |\t/, function(t) {
      //throw out non-newline whitespace tokens
    })
  ];

  for (var rt in reserved_tokens) {
    tokens.push(tk(rt.toUpperCase()));
  }

  /*var a =
  Loop {
    eid : int;
    flag : int;
    index : int;
    type : int;

    co : vec3;
    no : vec3;
    loop : int | eid(loop);
    edges : array(e, int) | e.eid;

    loops : array(Loop);
  }
  """;
  */

  function errfunc(lexer) {
    return true; //throw error
  }

  var lex = new lexer(tokens, errfunc);
  console.log("Testing lexical scanner...");

  lex.input(a);

  var tok;
  while (tok = lex.next()) {
    console.log(tok.toString());
  }

  var parser = new parser(lex);
  parser.input(a);

  function p_Array(p) {
    p.expect("ARRAY");
    p.expect("LPARAM");

    var arraytype = p_Type(p);
    var itername = "";

    if (p.optional("COMMA")) {
      itername = arraytype;
      arraytype = p_Type(p);
    }


    p.expect("RPARAM");

    return {type : "array", data : {type : arraytype, iname : itername}};
  }

  function p_Type(p) {
    var tok = p.peek();

    if (tok.type == "ID") {
      p.next();
      return {type : "struct", data : "\"" + tok.value + "\""};
    } else if (basic_types.has(tok.type.toLowerCase())) {
      p.next();
      return {type : tok.type.toLowerCase()};
    } else if (tok.type == "ARRAY") {
      return p_Array(p);
    } else {
      p.error(tok, "invalid type " + tok.type); //(tok.value == "" ? tok.type : tok.value));
    }
  }

  function p_Field(p) {
    var field = {};

    console.log("-----", p.peek().type);

    field.name = p.expect("ID", "struct field name");
    p.expect("COLON");

    field.type = p_Type(p);
    field.set = undefined;
    field.get = undefined;

    var tok = p.peek();
    if (tok.type == "JSCRIPT") {
      field.get =  tok.value;
      p.next();
    }

    tok = p.peek();
    if (tok.type == "JSCRIPT") {
      field.set = tok.value;
      p.next();
    }

    p.expect("SEMI");

    return field;
  }

  function p_Struct(p) {
    var st = {};
    st.name = p.expect("ID", "struct name");
    st.fields = [];

    p.expect("OPEN");

    while (1) {
      if (p.at_end()) {
        p.error(undefined);
      } else if (p.optional("CLOSE")) {
        break;
      } else {
        st.fields.push(p_Field(p));
      }
    }

    return st;
  }

  var ret = p_Struct(parser);

  console.log(JSON.stringify(ret));
}

var parseutil1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  token: token,
  tokdef: tokdef,
  PUTLParseError: PUTLParseError,
  lexer: lexer,
  parser: parser
});

let ToolPaths = {};

var initToolPaths_run = false;

function buildParser() {
  let t = (name, re, func) => new tokdef(name, re, func);

  let tokens = [
    t('ID', /[a-zA-Z_$]+[a-zA-Z0-9_$]*/, (t) => {
      if (t.value == "true" || t.value == "false") {
        t.type = "BOOL";
        t.value = t.value == "true";
      }

      return t;
    }),
    t('LPAREN', /\(/),
    t('RPAREN', /\)/),
    t('LSBRACKET', /\[/),
    t('RSBRACKET', /\]/),
    t('DOT', /\./),
    t('COMMA', /\,/),
    t('EQUALS', /\=/),
    t('STRLIT', /"[^"]*"/, (t) => {
      t.value = t.value.slice(1, t.value.length-1);
      return t;
    }),
    t('STRLIT', /'[^']*'/, (t) => {
      t.value = t.value.slice(1, t.value.length-1);
      return t;
    }),
    t('NUMBER', /-?[0-9]+/, (t) => {
      t.value = parseInt(t.value);
      return t;
    }),
    t('NUMBER', /[0-9]+\.[0-9]*/, (t) => {
      t.value = parseFloat(t.value);
      return t;
    }),
    t('WS', /[ \n\r\t]/, (t) => undefined) //ignore whitespace
  ];

  let lexerror = (t) => {
    console.warn("Parse error");
    return true;
  };

  let valid_datatypes = {
    "STRLIT" : 1, "NUMBER" : 1, "BOOL" : 1
  };

  function p_Start(p) {
    let args = {};

    while (!p.at_end()) {
      let keyword = p.expect("ID");

      p.expect("EQUALS");

      let t = p.next();
      if (!(t.type in valid_datatypes)) {
        throw new PUTLParseError("parse error: unexpected " + t.type);
      }

      args[keyword] = t.value;
    }

    return args;
  }

  let lex = new lexer(tokens, lexerror);
  let p = new parser(lex);
  p.start = p_Start;

  return p;
}

let Parser = buildParser();
/*
let parse_rets = new cachering(() => return {
  toolclass : undefined,
  args : {}
}, 64);
//*/

function parseToolPath(str, check_tool_exists=true) {
  if (!initToolPaths_run) {
    initToolPaths_run = true;
    initToolPaths();
  }

  let i1 = str.search(/\(/);
  let i2 = str.search(/\)/);
  let args = "";

  if (i1 >= 0 && i2 >= 0) {
    args = str.slice(i1+1, i2).trim();
    str = str.slice(0, i1).trim();
  }

  if (!(str in ToolPaths) && check_tool_exists) {
    throw new DataPathError("unknown tool " + str);
  }

  let ret = Parser.parse(args);

  return {
    toolclass : ToolPaths[str],
    args      : ret
  };
}

function testToolParser() {
  let ret = parseToolPath("view3d.sometool(selectmode=1 str='str' bool=true)", false);

  return ret;
}

window.parseToolPath = parseToolPath;
//window._ToolPaths = ToolPaths;

//tool path parser for simple_toolsys.js
function initToolPaths() {
  for (let cls of ToolClasses) {
    if (!cls.hasOwnProperty("tooldef")) { //ignore abstract classes
      continue;
    }

    let def = cls.tooldef();
    let path = def.toolpath;

    ToolPaths[path] = cls;
  }
}

class DataPathSetOp extends ToolOp {
  constructor() {
    super();

    this.propType = -1;
    this._undo = undefined;
  }

  setValue(ctx, val) {
    let prop = this.inputs.prop;
    let path = this.inputs.dataPath.getValue();

    if (path.type & (PropTypes.ENUM|PropTypes.FLAG)) {
      let rdef = ctx.api.resolvePath(ctx, path);
      if (rdef.subkey !== undefined) {
      //  val = rdef.value;
        //val = !!val;
      }
    }

    prop.setValue(val);
  }

  static create(ctx, datapath, value, id, massSetPath) {
    let rdef = ctx.api.resolvePath(ctx, datapath);

    if (rdef === undefined || rdef.prop === undefined) {
      console.warn("DataPathSetOp failed", rdef, rdef.prop);
      return;
    }

    let prop = rdef.prop;
    let tool = new DataPathSetOp();

    tool.propType = prop.type;

    let mask = PropTypes.FLAG|PropTypes.ENUM;
    mask |= PropTypes.VEC2|PropTypes.VEC3|PropTypes.VEC4|PropTypes.QUAT;

    if (rdef.subkey !== undefined && (prop.type & mask)) {
      if (prop.type & (PropTypes.ENUM|PropTypes.FLAG))
        tool.inputs.prop = new IntProperty$1();
      else
        tool.inputs.prop = new FloatProperty$1();

      //value = rdef.obj[rdef.key];
      //console.log("rdef.value", value);
    } else {
      tool.inputs.prop = prop.copy();
    }

    tool.inputs.dataPath.setValue(datapath);

    if (massSetPath) {
      tool.inputs.massSetPath.setValue(massSetPath);
    } else {
      tool.inputs.massSetPath.setValue("");
    }

    tool.id = id;

    tool.setValue(ctx, value);

    return tool;
  }

  hash(massSetPath, dataPath, prop, id) {
    massSetPath = massSetPath === undefined ? "" : massSetPath;
    massSetPath = massSetPath === null ? "" : massSetPath;

    return ""+massSetPath+":"+dataPath+":"+prop+":"+id;
  }

  hashThis() {
    return this.hash(this.inputs.massSetPath.getValue(),
                     this.inputs.dataPath.getValue(),
                     this.propType,
                     this.id);
  }

  undoPre(ctx) {
    if (this.__ctx)
      ctx = this.__ctx;

    this._undo = {};

    let paths = new set$1();

    if (this.inputs.massSetPath.getValue().trim()) {
      let massSetPath = this.inputs.massSetPath.getValue().trim();

      paths = new set$1(ctx.api.resolveMassSetPaths(ctx, massSetPath));

    }

    paths.add(this.inputs.dataPath.getValue());

    for (let path of paths) {
      let rdef = ctx.api.resolvePath(ctx, path);

      if (rdef === undefined) {
        console.warn("Failed to lookup path in DataPathSetOp.undoPre", path);
        continue;
      }

      let prop = rdef.prop;
      let value = rdef.value;

      if (prop.type & (PropTypes.ENUM|PropTypes.FLAG)) {
        this._undo[path] = rdef.obj[rdef.key];
      } else if (isVecProperty(prop)) {
        if (rdef.subkey) {
          this._undo[path] = rdef.value;
        } else {
          this._undo[path] = rdef.value.copy();
        }
      } else {
        let prop2 = prop.copy();
        prop2.setValue(value);

        this._undo[path] = prop2.getValue();
      }
    }
  }

  undo(ctx) {
    if (this.__ctx)
      ctx = this.__ctx;

    for (let path in this._undo) {
      let rdef = ctx.api.resolvePath(ctx, path);

      if (rdef.prop !== undefined && (rdef.prop.type & (PropTypes.ENUM|PropTypes.FLAG))) {
        let old = rdef.obj[rdef.key];

        rdef.obj[rdef.key] = this._undo[path];

        rdef.prop.dataref = rdef.obj;
        rdef.prop._fire("change", rdef.obj[rdef.key], old);
      }
      try {
        ctx.api.setValue(ctx, path, this._undo[path]);
      } catch (error) {
        print_stack$1(error);
        console.warn("Failed to set property in undo for DataPathSetOp");
      }
    }
  }

  exec(ctx) {
    //use saved ctx we got from modal start
    if (this.__ctx) {
      ctx = this.__ctx;
    }

    let path = this.inputs.dataPath.getValue();
    let massSetPath = this.inputs.massSetPath.getValue().trim();

    ctx.api.setValue(ctx, path, this.inputs.prop.getValue());
    if (massSetPath) {
      ctx.api.massSetProp(ctx, massSetPath, this.inputs.prop.getValue());
    }
  }

  modalStart(ctx) {
    this.__ctx = ctx.toLocked();

    //save full, modal ctx
    super.modalStart(this.__ctx);

    this.exec(this.__ctx);
    this.modalEnd(false);
  }

  static tooldef() {return {
    uiname : "Property Set",
    toolpath : "app.prop_set",
    icon : -1,
    is_modal : true,
    inputs : {
      dataPath : new StringProperty(),
      massSetPath : new StringProperty()
    }
  }}
}
ToolOp.register(DataPathSetOp);

let PUTLParseError$1 = PUTLParseError;

let tk = (name, re, func) => new tokdef(name, re, func);
let tokens = [
  tk("ID", /[a-zA-Z_$]+[a-zA-Z_$0-9]*/),
  tk("NUM", /-?[0-9]+/, (t) => {
    t.value = parseInt(t.value);
    return t;
  }),
  tk("STRLIT", /'.*'/, (t) => {
    t.value = t.value.slice(1, t.value.length - 1);
    return t;
  }),
  tk("STRLIT", /".*"/, (t) => {
    t.value = t.value.slice(1, t.value.length - 1);
    return t;
  }),
  tk("DOT", /\./),
  tk("EQUALS", /(\=)|(\=\=)/),
  tk("LSBRACKET", /\[/),
  tk("RSBRACKET", /\]/),
  tk("AND", /\&/),
  tk("WS", /[ \t\n\r]+/, (t) => undefined) //drok token
];

let lexer$1 = new lexer(tokens, (t) => {
  console.warn("Parse error", t);
  throw new DataPathError();
});

let pathParser = new parser(lexer$1);

let tool_classes = ToolClasses;

let tool_idgen = 1;
Symbol.ToolID = Symbol("toolid");

function toolkey(cls) {
  if (!(Symbol.ToolID in cls)) {
    cls[Symbol.ToolID] = tool_idgen++;
  }

  return cls[Symbol.ToolID];
}

let lt = time_ms();
let lastmsg = undefined;
let lcount = 0;

let reportstack = ["api"];
function pushReportName(name) {
  if (reportstack.length > 1024) {
    console.trace("eerk, reportstack overflowed");
    reportstack.length = 0;
    reportstack.push("api");
  }

  reportstack.push(name);
}

function report(msg) {
  let name = reportstack.length === 0 ? "api" : reportstack[reportstack.length-1];

  console$1.context(name).warn(msg);
}

function popReportName() {
  reportstack.pop();
}

const DataTypes = {
  STRUCT: 0,
  DYNAMIC_STRUCT: 1,
  PROP: 2,
  ARRAY: 3
};

class DataPath {
  constructor(path, apiname, prop, type = DataTypes.PROP) {
    this.type = type;
    this.data = prop;
    this.apiname = apiname;
    this.path = path;
    this.flag = 0;
    this.struct = undefined;
  }

  copy() {
    let ret = new DataPath();

    ret.flag = this.flag;
    ret.type = this.type;
    ret.data = this.data;
    ret.apiname = this.apiname;
    ret.path = this.path;
    ret.struct = this.struct;

    return ret;
  }

  setProp(prop) {
    this.data = prop;
  }

  read_only() {
    this.flag |= DataFlags.READ_ONLY;
    return this;
  }

  //XXX this doesn't appear to be implemented
  //
  //get/set will be called
  //like other callbacks,
  //e.g. the real object owning the property
  //will be stored in this.dataref
  customGetSet(get, set) {
    this.data.flag |= PropFlags.USE_CUSTOM_GETSET;

    this.data._getValue = this.data.getValue;
    this.data._setValue = this.data.setValue;

    if (get)
      this.data.getValue = get;

    if (set)
      this.data.setValue = set;

    return this;
  }

  /**db will be executed with underlying data object
   that contains this path in 'this.dataref'

   main event is 'change'
   */
  on(type, cb) {
    if (this.type == DataTypes.PROP) {
      this.data.on(type, cb);
    } else {
      throw new Error("invalid call to DataPath.on");
    }

    return this;
  }

  off(type, cb) {
    if (this.type == DataTypes.PROP) {
      this.data.off(type, cb);
    }
  }

  simpleSlider() {
    this.data.flag |= PropFlags.SIMPLE_SLIDER;
    return this;
  }

  rollerSlider() {
    this.data.flag &= ~PropFlags.SIMPLE_SLIDER;
    this.data.flag |= PropFlags.FORCE_ROLLER_SLIDER;

    return this;
  }

  baseUnit(unit) {
    this.data.setBaseUnit(unit);
    return this;
  }

  displayUnit(unit) {
    this.data.setDisplayUnit(unit);
    return this;
  }

  range(min, max) {
    this.data.setRange(min, max);
    return this;
  }

  uiRange(min, max) {
    this.data.setUIRange(min, max);
    return this;
  }

  decimalPlaces(n) {
    this.data.setDecimalPlaces(n);
    return this;
  }

  expRate(exp) {
    this.data.setExpRate(exp);
    return this;
  }

  radix(r) {
    this.data.setRadix(r);
    return this;
  }

  step(s) {
    this.data.setStep(s);
    return this;
  }

  icon(i) {
    this.data.setIcon(i);
    return this;
  }

  icons(icons) { //for enum/flag properties
    this.data.addIcons(icons);
    return this;
  }

  descriptions(description_map) { //for enum/flag properties
    this.data.addDescriptions(description_map);
  }

  description(d) {
    this.data.description = d;
    return this;
  }
}

class DataList extends ListIface {
  /**
   Okay, this is a simple interface for the controller to access lists,
   whether it's {} object maps, [] arrays, util.set's, or whatever.

   In fairmotion I used a lambda-type filter system, but that was problematic as it
   didn't support any sort of abstraction or composition, so the lamba strings ended up
   like this:
   "($.flag & SELECT) && !($.flag & HIDE) && !($.flag & GHOST) && (ctx.spline.layers.active.id in $.layers)

   Hopefully this new bitmask system will work better.

   * Callbacks is an array of name functions, like so:
   - function getStruct(api, list, key) //return DataStruct type of object in key, key is optional if omitted return base type of all objects?
   - function get(api, list, key)
   - function set(api, list, key, val) //this one has default behavior: list[key] = val
   - function getLength(api, list)
   - function getActive(api, list)
   - function setActive(api, list, key)
   - function getIter(api, list)
   - function getKey(api, list, object) returns object's key in this list, either a string or a number
   * */

  copy() {
    let ret = new DataList([this.cb.get]);

    for (let k in this.cb) {
      ret.cb[k] = this.cb[k];
    }

    return ret;
  }

  constructor(callbacks) {
    super();

    if (callbacks === undefined) {
      throw new DataPathError("missing callbacks argument to DataList");
    }

    this.cb = {};
    for (let cb of callbacks) {
      this.cb[cb.name] = cb;
    }

    let check = (key) => {
      if (!(key in this.cbs)) {
        throw new DataPathError(`Missing ${key} callback in DataList`);
      }
    };
  }

  get(api, list, key) {
    return this.cb.get(api, list, key);
  }

  getLength(api, list) {
    this._check("getLength");
    return this.cb.getLength(api, list);
  }

  _check(cb) {
    if (!(cb in this.cb)) {
      throw new DataPathError(cb + " not supported by this list");
    }
  }

  set(api, list, key, val) {
    if (this.cb.set === undefined) {
      list[key] = val;
    } else {
      this.cb.set(api, list, key, val);
    }
  }

  getIter(api, list) {
    this._check("getIter");
    return this.cb.getIter(api, list);
  }

  filter(api, list, bitmask) {
    this._check("filter");
    return this.cb.filter(api, list, bitmask);
  }

  getActive(api, list) {
    this._check("getActive");
    return this.cb.getActive(api, list);
  }

  setActive(api, list, key) {
    this._check("setActive");
    this.cb.setActive(api, list, key);
  }

  getKey(api, list, obj) {
    this._check("getKey");
    return this.cb.getKey(api, list, obj);
  }

  getStruct(api, list, key) {
    if (this.cb.getStruct !== undefined) {
      return this.cb.getStruct(api, list, key);
    }

    let obj = this.get(api, list, key);

    if (obj === undefined)
      return undefined;

    return api.getStruct(obj.constructor);
  }
}

const StructFlags = {
  NO_UNDO: 1 //struct and its child structs can't participate in undo
             //via the DataPathToolOp
};

class DataStruct {
  constructor(members = [], name = "unnamed") {
    this.members = [];
    this.name = name;
    this.pathmap = {};
    this.flag = 0;

    for (let m of members) {
      this.add(m);
    }
  }

  copy() {
    let ret = new DataStruct();

    ret.name = this.name;
    ret.flag = this.flag;

    for (let m of this.members) {
      let m2 = m.copy();

      //don't copy struct or list references, just
      //direct properties

      if (m2.type === DataTypes.PROP) {
        m2.data = m2.data.copy();
      }

      ret.add(m2);
    }

    return ret;
  }
  /**
   * Like .struct, but the type of struct is looked up
   * for objects at runtime.  Note that to work correctly each object
   * must create its own struct definition via api.mapStruct
   *
   * @param path
   * @param apiname
   * @param uiname
   * @param default_struct : default struct if one can't be looked up
   * @returns {*}
   */
  dynamicStruct(path, apiname, uiname, default_struct = undefined) {
    let ret = default_struct ? default_struct : new DataStruct();

    let dpath = new DataPath(path, apiname, ret, DataTypes.DYNAMIC_STRUCT);

    this.add(dpath);
    return ret;
  }

  struct(path, apiname, uiname, existing_struct = undefined) {
    let ret = existing_struct ? existing_struct : new DataStruct();

    let dpath = new DataPath(path, apiname, ret, DataTypes.STRUCT);

    this.add(dpath);
    return ret;
  }

  color3(path, apiname, uiname, description) {
    let ret = this.vec3(path, apiname, uiname, description);

    ret.data.subtype = PropSubTypes$1.COLOR;
    ret.simpleSlider();

    return ret;
  }

  color4(path, apiname, uiname, description) {
    let ret = this.vec4(path, apiname, uiname, description);

    ret.data.subtype = PropSubTypes$1.COLOR;
    ret.simpleSlider();

    return ret;
  }

  arrayList(path, apiname, structdef, uiname, description) {
    let ret = this.list(path, apiname, [
      function getIter(api, list) {
        return list[Symbol.iterator]();
      },
      function getLength(api, list) {
        return list.length;
      },
      function get(api, list, key) {
        return list[key];
      },
      function set(api, list, key, val) {
        if (typeof key === "string") {
          key = parseInt(key);
        }

        if (key < 0 || key >= list.length) {
          throw new DataPathError("Invalid index " + key);
        }

        list[key] = val;
        window.redraw_viewport();
      },
      function getKey(api, list, obj) {
        return list.indexOf(obj);
      },
      function getStruct(api, list, key) {
        return structdef;
      }]);

    return ret;
  }

  vectorList(size, path, apiname, uiname, description) {
    let type;

    switch (size) {
      case 2:
        type = Vec2Property$1;
        break;
      case 3:
        type = Vec3Property$1;
      case 4:
        type = Vec4Property$1;
    }

    if (type === undefined) {
      throw new DataPathError("Invalid size for vectorList; expected 2 3 or 4");
    }

    let prop = new type(undefined, apiname, uiname, description);

    let pstruct = new DataStruct(undefined, "Vector");
    pstruct.vec3("", "co", "Coords", "Coordinates");

    let ret = this.list(path, apiname, [
      function getIter(api, list) {
        return list[Symbol.iterator]();
      },
      function getLength(api, list) {
        return list.length;
      },
      function get(api, list, key) {
        return list[key];
      },
      function set(api, list, key, val) {
        if (typeof key == "string") {
          key = parseInt(key);
        }

        if (key < 0 || key >= list.length) {
          throw new DataPathError("Invalid index " + key);
        }

        list[key] = val;
        window.redraw_viewport();
      },
      function getKey(api, list, obj) {
        return list.indexOf(obj);
      },
      function getStruct(api, list, key) {
        return pstruct;
      }]);

    return ret;
  }

  bool(path, apiname, uiname, description) {
    let prop = new BoolProperty(undefined, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  vec2(path, apiname, uiname, description) {
    let prop = new Vec2Property$1(undefined, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  vec3(path, apiname, uiname, description) {
    let prop = new Vec3Property$1(undefined, apiname, uiname, description);
    //prop.uiname = uiname;

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  vec4(path, apiname, uiname, description) {
    let prop = new Vec4Property$1(undefined, apiname, uiname, description);
    //prop.uiname = uiname;

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  float(path, apiname, uiname, description) {
    let prop = new FloatProperty$1(0, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  string(path, apiname, uiname, description) {
    let prop = new StringProperty(undefined, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  int(path, apiname, uiname, description, prop=undefined) {
    if (!prop) {
      prop = new IntProperty$1(0, apiname, uiname, description);
    }

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  curve1d(path, apiname, uiname, description) {
    let prop = new Curve1DProperty(undefined);

    prop.apiname = apiname;
    prop.uiname = uiname;
    prop.description = description;

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  enum(path, apiname, enumdef, uiname, description) {
    let prop;

    if (enumdef instanceof EnumProperty$1) {
      prop = enumdef;
    } else {
      prop = new EnumProperty$1(undefined, enumdef, apiname, uiname, description);
    }

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  list(path, apiname, funcs) {
    let array = new DataList(funcs);

    let dpath = new DataPath(path, apiname, array);
    dpath.type = DataTypes.ARRAY;

    this.add(dpath);
    return dpath;
  }

  flags(path, apiname, enumdef, uiname, description) {
    let prop;

    if (enumdef === undefined || !(enumdef instanceof ToolProperty)) {
      prop = new FlagProperty(undefined, enumdef, apiname, uiname, description);
    } else {
      prop = enumdef;
    }

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  add(m) {
    this.members.push(m);
    m.parent = this;

    this.pathmap[m.apiname] = m;

    return this;
  }
}

let _map_struct_idgen = 1;
let _map_structs = {};

window._debug__map_structs = _map_structs; //global for debugging purposes only

let _dummypath = new DataPath();

let DummyIntProperty = new IntProperty$1();
const CLS_API_KEY = "__dp_map_id";

class DataAPI extends ModelInterface {
  constructor() {
    super();
    this.rootContextStruct = undefined;
  }

  get list() {
    return undefined;
  }

  setRoot(sdef) {
    this.rootContextStruct = sdef;
  }

  hasStruct(cls) {
    return cls.hasOwnProperty(CLS_API_KEY);
  }

  getStruct(cls) {
    return this.mapStruct(cls, false);
  }

  mergeStructs(dest, src) {
    for (let m of src.members) {
      dest.add(m.copy());
    }
  }

  inheritStruct(cls, parent, auto_create_parent = false) {
    let st = this.mapStruct(parent, auto_create_parent);

    if (st === undefined) {
      throw new Error("parent has no struct definition");
    }

    st = st.copy();
    st.name = cls.name;

    this._addClass(cls, st);
    return st;
  }

  /**
   * Look up struct definition for a class.
   *
   * @param cls: the class
   * @param auto_create: If true, automatically create definition if not already existing.
   * @returns {IterableIterator<*>}
   */

  _addClass(cls, dstruct) {
    let key =  _map_struct_idgen++;
    cls[CLS_API_KEY] = key;

    _map_structs[key] = dstruct;
  }

  mapStruct(cls, auto_create = true) {
    let key;

    if (!cls.hasOwnProperty(CLS_API_KEY)) {
      key = undefined;
    } else {
      key = cls[CLS_API_KEY];
    }

    if (key === undefined && auto_create) {
      let dstruct = new DataStruct(undefined, cls.name);
      this._addClass(cls, dstruct);
      return dstruct;
    } else if (key === undefined) {
      throw new Error("class does not have a struct definition: " + cls.name);
    }

    return _map_structs[key];
  }

  //used by simple_controller.js for tagging error messages
  pushReportContext(name) {
    pushReportName(name);
  }

  //used by simple_controller.js for tagging error messages
  popReportContext() {
    popReportName();
  }


  /*
  massSetProp operate on lists.  The idea is to
  write a filter str inside a data path, e.g.

  ctx.api.massSetProp(ctx, "obj.list[{$.select}].value", 1);


  * */
  massSetProp(ctx, massSetPath, value) {
    for (let path of this.resolveMassSetPaths(ctx, massSetPath)) {
      this.setValue(ctx, path, value);
    }
  }

  resolveMassSetPaths(ctx, massSetPath) {
    let start = massSetPath.search("{");
    let end = massSetPath.search("}");

    if (start < 0 || end < 0) {
      throw new DataPathError("Invalid mass set datapath: " + massSetPath);
      return;
    }

    let prefix = massSetPath.slice(0, start-1);
    let filter = massSetPath.slice(start+1, end);
    let suffix = massSetPath.slice(end+2, massSetPath.length);

    let rdef = this.resolvePath(ctx, prefix);

    if (!(rdef.prop instanceof DataList)) {
      throw new DataPathError("massSetPath expected a path resolving to a DataList: " + massSetPath);
    }

    let paths = [];

    let list = rdef.prop;

    function applyFilter(obj) {
      let $ = obj;

      return eval(filter);
    }

    for (let obj of list.getIter(this, rdef.value)) {
      if (!applyFilter(obj)) {
        continue;
      }

      let key = ""+list.getKey(this, rdef.value, obj);
      let path = `${prefix}[${key}]${suffix}`;

      paths.push(path);
    }

    return paths;
  }

  resolvePath(ctx, inpath, ignoreExistence = false) {
    try {
      return this.resolvePath_intern(ctx, inpath, ignoreExistence)
    } catch (error) {
      //throw new DataPathError("bad path " + path);
      if (!(error instanceof DataPathError)) {
        print_stack$1(error);
      }

      if (exports.DEBUG.datapaths) {
        print_stack$1(error);
      }

      report("bad path " + inpath);
      return undefined;
    }
  }

  /**
   get meta information for a datapath.

   @param ignoreExistence: don't try to get actual data associated with path,
   just want meta information
   */
  resolvePath_intern(ctx, inpath, ignoreExistence = false) {
    let p = pathParser;
    inpath = inpath.replace("==", "=");

    p.input(inpath);

    let dstruct = this.rootContextStruct;
    let obj = ctx;
    let lastobj = ctx;
    let subkey;
    let lastobj2 = undefined;
    let lastkey = undefined;
    let prop = undefined;

    function p_key() {
      let t = p.peeknext();
      if (t.type == "NUM" || t.type == "STRLIT") {
        p.next();
        return t.value;
      } else {
        throw new PUTLParseError$1("Expected list key");
      }
    }

    let _i = 0;
    while (!p.at_end()) {
      let key = p.expect("ID");
      let path = dstruct.pathmap[key];

      if (path === undefined) {
        if (prop !== undefined && prop instanceof DataList && key === "length") {
          prop.getLength(this, obj);
          key = "length";

          prop = DummyIntProperty;

          prop.name = "length";
          prop.flag = PropFlags.READ_ONLY;

          path = _dummypath;
          path.type = DataTypes.PROP;
          path.data = prop;
          path.struct = path.parent = dstruct;
          path.flag = DataFlags.READ_ONLY;
          path.path = "length";

          /*
          parent: lastobj2,
            obj: lastobj,
            value: obj,
            key: lastkey,
            //*/
        } else if (prop !== undefined && prop instanceof DataList && key === "active") {
          let act = prop.getActive(this, obj);

          if (act === undefined && !ignoreExistence) {
            throw new DataPathError("no active elem ent for list");
          }

          dstruct = prop.getStruct(this, obj, prop.getKey(this, obj, act));
          if (dstruct === undefined) {
            throw new DataPathError("couldn't get data type for " + inpath + "'s element '" + key + "'");
          }

          path = _dummypath;

          path.type = DataTypes.STRUCT;
          path.data = dstruct;
          path.path = key;
        } else {
          throw new DataPathError(inpath + ": unknown property " + key);
        }
      }

      if (path.type === DataTypes.STRUCT) {
        dstruct = path.data;
      } else if (path.type === DataTypes.DYNAMIC_STRUCT) {
        let ok = false;

        if (obj !== undefined) {
          let obj2 = obj[path.path];
          if (obj2 !== undefined) {
            dstruct = this.mapStruct(obj2.constructor, false);
          } else {
            dstruct = path.data;
          }

          if (dstruct === undefined) {
            dstruct = path.data;
          }

          ok = dstruct !== undefined;
        }

        if (!ok) {
          throw new DataPathError("dynamic struct error for path: " + inpath);
        }
      } else {
        prop = path.data;
      }

      if (path.path.search(/\./) >= 0) {
        let keys = path.path.split(/\./);

        for (let key of keys) {
          lastobj2 = lastobj;
          lastobj = obj;
          lastkey = key;

          if (obj === undefined && !ignoreExistence) {
            throw new DataPathError("no data for " + inpath);
          } else if (obj !== undefined) {
            obj = obj[key.trim()];
          }
        }
      } else {
        lastobj2 = lastobj;
        lastobj = obj;

        lastkey = path.path;
        if (obj === undefined && !ignoreExistence) {
          throw new DataPathError("no data for " + inpath);
        } else if (obj !== undefined && path.path !== "") {
          obj = obj[path.path];
        }
      }

      let t = p.peeknext();
      if (t === undefined) {
        break;
      }

      if (t.type == "DOT") {
        p.next();
      } else if (t.type == "EQUALS" && prop !== undefined && (prop.type & (PropTypes.ENUM | PropTypes.FLAG))) {
        p.expect("EQUALS");

        let t2 = p.peeknext();
        let type = t2 && t2.type == "ID" ? "ID" : "NUM";

        let val = p.expect(type);

        let val1 = val;

        if (typeof val == "string") {
          val = prop.values[val];
        }

        if (val === undefined) {
          throw new DataPathError("unknown value " + val1);
        }

        if (val in prop.keys) {
          subkey = prop.keys[val];
        }

        key = path.path;
        obj = !!(lastobj[key] == val);
      } else if (t.type == "AND" && prop !== undefined && (prop.type & (PropTypes.ENUM | PropTypes.FLAG))) {
        p.expect("AND");

        let t2 = p.peeknext();
        let type = t2 && t2.type == "ID" ? "ID" : "NUM";

        let val = p.expect(type);

        let val1 = val;

        if (typeof val == "string") {
          val = prop.values[val];
        }

        if (val === undefined) {
          throw new DataPathError("unknown value " + val1);
        }

        if (val in prop.keys) {
          subkey = prop.keys[val];
        }

        key = path.path;
        obj = !!(lastobj[key] & val);
      } else if (t.type == "LSBRACKET" && prop !== undefined && (prop.type & (PropTypes.ENUM | PropTypes.FLAG))) {
        p.expect("LSBRACKET");

        let t2 = p.peeknext();
        let type = t2 && t2.type == "ID" ? "ID" : "NUM";

        let val = p.expect(type);

        let val1 = val;

        if (typeof val == "string") {
          val = prop.values[val];
        }

        if (val === undefined) {
          console.warn(inpath, prop.values, val1, prop);
          throw new DataPathError("unknown value " + val1);
        }

        if (val in prop.keys) {
          subkey = prop.keys[val];
        }

        key = path.path;
        if (lastobj === undefined && !ignoreExistence) {
          throw new DataPathError("no data for path " + inpath);
        } else if (lastobj !== undefined) {
          if (prop.type == PropTypes.ENUM) {
            obj = !!(lastobj[key] == val);
          } else {
            obj = !!(lastobj[key] & val);
          }
        }

        p.expect("RSBRACKET");
      } else if (t.type === "LSBRACKET" && prop !== undefined && isVecProperty(prop)) {
        p.expect("LSBRACKET");
        let num = p.expect("NUM");
        p.expect("RSBRACKET");

        subkey = num;

        lastobj = obj;
        obj = obj[num];
      } else if (t.type === "LSBRACKET") {
        p.expect("LSBRACKET");

        if (lastobj && lastkey && typeof lastkey === "string" && lastkey.length > 0) {
          lastobj = lastobj[lastkey];
        }

        lastkey = p_key();
        p.expect("RSBRACKET");

        if (!(prop instanceof DataList)) {
          throw new DataPathError("bad property, not a list");
        }

        obj = prop.get(this, lastobj, lastkey);
        dstruct = prop.getStruct(this, lastobj, lastkey);

        if (p.peeknext() !== undefined && p.peeknext().type == "DOT") {
          p.next();
        }
      }

      if (_i++ > 1000) {
        console.warn("infinite loop in resolvePath parser");
        break;
      }
    }

    return {
      parent: lastobj2,
      obj: lastobj,
      value: obj,
      key: lastkey,
      dstruct: dstruct,
      prop: prop,
      subkey: subkey
    };
  }

  resolvePathOld2(ctx, path) {
    let splitchars = new Set([".", "[", "]", "=", "&"]);
    let subkey = undefined;

    path = path.replace(/\=\=/g, "=");

    path = "." + this.prefix + path;

    let p = [""];
    for (let i = 0; i < path.length; i++) {
      let s = path[i];

      if (splitchars.has(s)) {
        if (s != "]") {
          p.push(s);
        }

        p.push("");
        continue;
      }

      p[p.length - 1] += s;
    }

    for (let i = 0; i < p.length; i++) {
      p[i] = p[i].trim();

      if (p[i].length == 0) {
        p.remove(p[i]);
        i--;
      }

      let c = parseInt(p[i]);
      if (!isNaN(c)) {
        p[i] = c;
      }
    }

    let i = 0;

    let parent1, obj = ctx, parent2;
    let key = undefined;
    let dstruct = undefined;
    let arg = undefined;
    let type = "normal";
    let retpath = p;
    let prop;
    let lastkey = key, a;
    let apiname = key;

    while (i < p.length - 1) {
      lastkey = key;
      apiname = key;

      if (dstruct !== undefined && dstruct.pathmap[lastkey]) {
        let dpath = dstruct.pathmap[lastkey];

        apiname = dpath.apiname;
      }

      let a = p[i];
      let b = p[i + 1];

      //check for enum/flag propertys with [] form
      if (a == "[") {
        let ok = false;

        key = b;
        prop = undefined;

        if (dstruct !== undefined && dstruct.pathmap[lastkey]) {
          let dpath = dstruct.pathmap[lastkey];

          if (dpath.type == DataTypes.PROP) {
            prop = dpath.data;
          }
        }

        if (prop !== undefined && (prop.type == PropTypes.ENUM || prop.type == PropTypes.FLAG)) {
          console$1.context("api").log("found flag/enum property");
          ok = true;
        }

        if (ok) {
          if (isNaN(parseInt(key))) {
            key = prop.values[key];
          } else if (typeof key == "int") {
            key = parseInt(key);
          }

          let value = obj;
          if (typeof value == "string") {
            value = prop.values[key];
          }

          if (prop.type == PropTypes.ENUM) {
            value = !!(value == key);
          } else { //flag
            value = !!(value & key);
          }

          if (key in prop.keys) {
            subkey = prop.keys[key];
          }

          obj = value;
          i++;
          continue;
        }
      }

      if (dstruct !== undefined && dstruct.pathmap[lastkey]) {
        let dpath = dstruct.pathmap[lastkey];

        if (dpath.type == DataTypes.PROP) {
          prop = dpath.data;
        }
      }

      if (a == "." || a == "[") {
        key = b;

        parent2 = parent1;
        parent1 = obj;
        obj = obj[b];

        if (obj === undefined || obj === null) {
          break;
        }

        if (typeof obj == "object") {
          dstruct = this.mapStruct(obj.constructor, false);
        }

        i += 2;
        continue;
      } else if (a == "&") {
        obj &= b;
        arg = b;

        if (b in prop.keys) {
          subkey = prop.keys[b];
        }

        i += 2;
        type = "flag";
        continue;
      } else if (a == "=") {
        obj = obj == b;
        arg = b;

        if (b in prop.keys) {
          subkey = prop.keys[b];
        }

        i += 2;
        type = "enum";
        continue;
      } else {
        throw new DataPathError("bad path " + path);
      }

      i++;
    }

    if (lastkey !== undefined && dstruct !== undefined && dstruct.pathmap[lastkey]) {
      let dpath = dstruct.pathmap[key];

      apiname = dpath.apiname;
    }


    if (dstruct !== undefined && dstruct.pathmap[key]) {
      let dpath = dstruct.pathmap[key];

      if (dpath.type == DataTypes.PROP) {
        prop = dpath.data;
      }
    }

    return {
      parent: parent2,
      obj: parent1,
      value: obj,
      key: key,
      dstruct: dstruct,
      subkey: subkey,
      prop: prop,
      arg: arg,
      type: type,
      _path: retpath
    };
  }

  /*returns {
    obj : [object owning property key]
    parent : [parent of obj]
    key : [property key]
    value : [value of property]
    prop : [optional toolprop.ToolProperty representing the property definition]
    struct : [optional datastruct representing the type, if value is an object]
  }
  */
  resolvePathold(ctx, path) {
    path = this.prefix + path;
    path = path.replace(/\[/g, ".").replace(/\]/g, "").trim().split(".");

    let parent1, obj = ctx, parent2;
    let key = undefined;
    let dstruct = undefined;

    for (let c of path) {
      let c2 = parseInt(c);
      if (!isNaN(c2)) {
        c = c2;
      }

      parent2 = parent1;
      parent1 = obj;
      key = c;

      if (typeof obj == "number") {
        //bitmask test
        obj = obj & c;
        break;
      }

      obj = obj[c];

      if (typeof obj == "object") {
        dstruct = this.mapStruct(obj.constructor, false);
      }
    }

    let prop;

    if (dstruct !== undefined && dstruct.pathmap[key]) {
      let dpath = dstruct.pathmap[key];

      if (dpath.type == DataTypes.PROP) {
        prop = dpath.data;
      }
    }

    return {
      parent: parent2,
      obj: parent1,
      value: obj,
      key: key,
      dstruct: dstruct,
      prop: prop
    };
  }

  getToolDef(path) {
    let cls = this.parseToolPath(path);
    if (cls === undefined) {
      throw new DataPathError("unknown path \"" + path + "\"");
    }

    return cls.tooldef();
  }

  getToolPathHotkey(ctx, path) {
    try {
      return this.getToolPathHotkey_intern(ctx, path);
    } catch (error) {
      print_stack$1(error);
      console$1.context("api").log("failed to fetch tool path: " + path);

      return undefined;
    }
  }

  getToolPathHotkey_intern(ctx, path) {
    let screen = ctx.screen;

    function searchKeymap(keymap) {
      if (keymap === undefined) {
        return undefined;
      }

      for (let hk of keymap) {
        if (typeof hk.action == "string" && hk.action == path) {
          return hk.buildString();
        }
      }
    }

    if (screen.sareas.length == 0) {
      return searchKeymap(screen.keymap);
    }

    //client might have its own area subclass with
    //getActiveArea defined (that's encouraged),
    //which is why we don't just call Area.getActiveArea
    let areacls = screen.sareas[0].area.constructor;
    let area = areacls.getActiveArea();

    for (let keymap of area.getKeyMaps()) {
      let ret = searchKeymap(keymap);

      if (ret !== undefined) {
        return ret;
      }
    }

    return this.keymap ? searchKeymap(this.keymap) : false;
  }

  parseToolPath(path) {
    try {
      return parseToolPath(path).toolclass;
    } catch (error) {
      if (error instanceof DataPathError) {
        console.warn("warning, bad tool path", path);
        return undefined;
      } else {
        throw error;
      }
    }
  }

  parseToolArgs(path) {
    return parseToolPath(path).args;
  }

  createTool(ctx, path, inputs = {}) {
    let cls;
    let args;

    if (typeof path == "string" || path instanceof String) {
      //parseToolPath will raise DataPathError if path is malformed
      let tpath = parseToolPath(path);

      cls = tpath.toolclass;
      args = tpath.args;
    } else {
      cls = path;
      args = {};
    }

    let tool = cls.invoke(ctx, args);

    if (inputs !== undefined) {
      for (let k in inputs) {
        if (!(k in tool.inputs)) {
          console.warn(cls.tooldef().uiname + ": Unknown tool property \"" + k + "\"");
          continue;
        }

        tool.inputs[k].setValue(inputs[k]);
      }
    }

    return tool;
  }

  static toolRegistered(cls) {
    return ToolOp.isRegistered(cls);
    //let key = toolkey(cls);
    //return key in tool_classes;
  }

  static registerTool(cls) {
    console.warn("Outdated function simple_controller.DataAPI.registerTool called");

    return ToolOp.register(cls);

    //let key = toolkey(cls);
    //
    //if (!(key in tool_classes)) {
    //  tool_classes[key] = cls;
    //}
  }
}

function registerTool$1(cls) {
  return DataAPI.registerTool(cls);
}

function initSimpleController() {
  initToolPaths();
}
let dpt = DataPathSetOp;

function getDataPathToolOp() {
  return dpt;
}

function setDataPathToolOp(cls) {
  ToolOp.unregister(DataPathSetOp);

  if (!ToolOp.isRegistered(cls)) {
    ToolOp.register(cls);
  }

  dpt = cls;
}

setImplementationClass(DataAPI);

function parsepx(css) {
  return parseFloat(css.trim().replace("px", ""))
}

function color2css$2(c, alpha_override) {
  let r = ~~(c[0]*255);
  let g = ~~(c[1]*255);
  let b = ~~(c[2]*255);
  let a = c.length < 4 ? 1.0 : c[3];

  a = alpha_override !== undefined ? alpha_override : a;

  if (c.length == 3 && alpha_override === undefined) {
    return `rgb(${r},${g},${b})`;
  } else {
    return `rgba(${r},${g},${b}, ${a})`;
  }
}
window.color2css = color2css$2;

let css2color_rets = cachering.fromConstructor(Vector4, 64);
let cmap = {
  red : [1, 0, 0, 1],
  green : [0, 1, 0, 1],
  blue : [0, 0, 1, 1],
  yellow : [1, 1, 0, 1],
  white : [1, 1, 1, 1],
  black : [0, 0, 0, 1],
  grey : [0.7, 0.7, 0.7, 1],
  teal : [0, 1, 1, 1],
  orange : [1,0.55,0.25,1],
  brown  : [0.7, 0.4, 0.3, 1]
};

function color2web(color) {
  function tostr(n) {
    n = ~~(n*255);
    let s = n.toString(16);

    if (s.length > 2) {
      s = s.slice(0, 2);
    }

    while (s.length < 2) {
      s = "0" + s;
    }

    return s;
  }

  if (color.length === 3 || color[3] === 1.0) {
    let r = tostr(color[0]);
    let g = tostr(color[1]);
    let b = tostr(color[2]);

    return "#" + r + g + b;
  } else {
    let r = tostr(color[0]);
    let g = tostr(color[1]);
    let b = tostr(color[2]);
    let a = tostr(color[3]);

    return "#" + r + g + b + a;
  }
}

window.color2web = color2web;

function css2color$1(color) {
  if (!color) {
    return new Vector4([0,0,0,1]);
  }

  color = (""+color).trim();

  let ret = css2color_rets.next();

  if (color[0] === "#") {
    color = color.slice(1, color.length);
    let parts = [];

    for (let i=0; i<color.length>>1; i++) {
      let part = "0x" + color.slice(i*2, i*2+2);
      parts.push(parseInt(part));
    }

    ret.zero();
    let i;
    for (i=0; i<Math.min(parts.length, ret.length); i++) {
      ret[i] = parts[i] / 255.0;
    }

    if (i < 4) {
      ret[3] = 1.0;
    }

    return ret;
  }

  if (color in cmap) {
    return ret.load(cmap[color]);
  }

  color = color.replace("rgba", "").replace("rgb", "").replace(/[\(\)]/g, "").trim().split(",");

  for (let i=0; i<color.length; i++) {
    ret[i] = parseFloat(color[i]);
    if (i < 3) {
      ret[i] /= 255;
    }
  }

  return ret;
}

window.css2color = css2color$1;

function web2color(str) {
  if (typeof str === "string" && str.trim()[0] !== "#") {
    str = "#" + str.trim();
  }

  return css2color$1(str);
}
window.web2color = web2color;

let validate_pat = /\#?[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

function validateWebColor(str) {
  if (typeof str !== "string" && !(str instanceof String))
    return false;

  return str.trim().search(validate_pat) === 0;
}

let theme = {};

window.validateWebColor = validateWebColor;

class CSSFont {
  constructor(args={}) {
    this._size = args.size ? args.size : 12;
    this.font = args.font;
    this.style = args.style !== undefined ? args.style : "normal";
    this.weight = args.weight !== undefined ? args.weight : "normal";
    this.variant = args.variant !== undefined ? args.variant : "normal";
    this.color = args.color;
  }

  set size(val) {
    this._size = val;
  }

  get size() {
    if (isMobile()) {
      let mul = theme.base.mobileTextSizeMultiplier / visualViewport.scale;
      if (mul) {
        return this._size * mul;;
      }
    }

    return this._size;
  }

  copyTo(b) {
    b._size = this._size;
    b.font = this.font;
    b.style = this.style;
    b.color = this.color;
    b.variant = this.variant;
    b.weight = this.weight;
  }

  copy() {
    let ret = new CSSFont();
    this.copyTo(ret);
    return ret;
  }

  genCSS(size=this.size) {
    return `${this.style} ${this.variant} ${this.weight} ${size}px ${this.font}`;
  }

  hash() {
    return this.genCSS + ":" + this.size + ":" + this.color;
  }
}

const DefaultTheme = {
  base : {
    mobileTextSizeMultiplier : 1.5,
    mobileSizeMultiplier : 2, //does not include text

    //used for by icon strips and the like
    "oneAxisPadding" : 6,
    "oneAxisMargin" : 6,

    "FocusOutline" : "rgba(100, 150, 255, 1.0)",

    "BasePackFlag" : 0,
    "ScreenBorderOuter" : "rgba(120, 120, 120, 1.0)",
    "ScreenBorderInner" : "rgba(170, 170, 170, 1.0)",
    "ScreenBorderWidth" : isMobile() ? 5 : 2,
    "ScreenBorderMousePadding" : isMobile() ? 6 : 5,

    "numslider_width" : 24,
    "numslider_height" : 24,

    "defaultWidth" : 32,
    "defaultHeight" : 32,
    
    "ProgressBarBG" : "rgba(110, 110, 110, 1.0)",
    "ProgressBar" : "rgba(75, 175, 255, 1.0)",

    "NoteBG" : "rgba(220, 220, 220, 0.0)",
    "NoteText" : new CSSFont({
      font  : "sans-serif",
      size  : 12,
      color :  "rgba(135, 135, 135, 1.0)",
      weight : "bold"
    }),

    "TabStrokeStyle1" : "rgba(200, 200, 200, 1.0)",
    "TabStrokeStyle2" : "rgba(225, 225, 225, 1.0)",
    "TabInactive" : "rgba(150, 150, 150, 1.0)",
    "TabHighlight" : "rgba(50, 50, 50, 0.2)",

    "DefaultPanelBG" : "rgba(225, 225, 225, 1.0)",
    "InnerPanelBG" : "rgba(195, 195, 195, 1.0)",
    "AreaHeaderBG" : "rgba(205, 205, 205, 1.0)",

    "BoxRadius" : 12,
    "BoxMargin" : 4,
    "BoxDrawMargin" : 2, //how much to shrink rects drawn by drawRoundBox
    "BoxHighlight" : "rgba(155, 220, 255, 1.0)",
    "BoxDepressed" : "rgba(130, 130, 130, 1.0)",
    "BoxBG" : "rgba(170, 170, 170, 1.0)",
    "DisabledBG" : "rgba(110, 110, 110, 1.0)",
    "BoxSubBG" : "rgba(175, 175, 175, 1.0)",
    "BoxSub2BG" : "rgba(125, 125, 125, 1.0)", //for panels
    "BoxBorder" : "rgba(255, 255, 255, 1.0)",

    "MenuBG" : "rgba(250, 250, 250, 1.0)",
    "MenuHighlight" : "rgba(155, 220, 255, 1.0)",

    //fonts
    "DefaultText" : new CSSFont({
      font  : "sans-serif",
      size  : 12,
      color :  "rgba(35, 35, 35, 1.0)",
      weight : "bold"
    }),

    "ToolTipText" : new CSSFont({
      font  : "sans-serif",
      size  : 12,
      color :  "rgba(35, 35, 35, 1.0)",
      weight : "bold"
    }),



    "TabText" : new CSSFont({
      size     : 18,
      color    : "rgba(35, 35, 35, 1.0)",
      font     : "sans-serif",
      //weight   : "bold"
    }),

    "LabelText" : new CSSFont({
      size     : 13,
      color    : "rgba(75, 75, 75, 1.0)",
      font     : "sans-serif",
      weight   : "bold"
    }),

    "HotkeyText" : new CSSFont({
      size     : 12,
      color    : "rgba(130, 130, 130, 1.0)",
      font     : "courier"
      //weight   : "bold"
    }),

    "TitleText" : new CSSFont({
      size     : 16,
      color    : "rgba(55, 55, 55, 1.0)",
      font     : "sans-serif",
      weight   : "bold"
    }),
  },

  menu : {
    MenuText : new CSSFont({
      size     : 12,
      color    : "rgba(25, 25, 25, 1.0)",
      font     : "sans-serif"
      //weight   : "bold"
    }),

    MenuSeparator : `
      width : 100%;
      height : 2px;
      padding : 0px;
      margin : 0px;
      border : none;
      background-color : grey; 
    `,

    MenuBorder : "1px solid grey",
  },


  tooltip : {
    "BoxBG" : "rgb(245, 245, 245, 1.0)",
    "BoxBorder" : "rgb(145, 145, 145, 1.0)"
  },

  richtext : {
    "background-color" : "rgb(200, 200, 200)",
    "DefaultText" : new CSSFont({
      font  : "sans-serif",
      size  : 16,
      color :  "rgba(35, 35, 35, 1.0)",
      weight : "normal"
    })
  },

  button : {
    defaultWidth : 100,
    defaultHeight : 24,
    BoxMargin     : 10
  },
  iconcheck : {

  },

  checkbox : {
    BoxMargin : 2,
    CheckSide : "left"
  },

  iconbutton : {

  },

  numslider : {
    DefaultText : new CSSFont({
      font   : "sans-serif",
      color  : "black",
      size   : 16,
      weight : 'bold'
    }),
    defaultWidth : 100,
    defaultHeight : 29
  },

  curvewidget : {
    CanvasWidth : 256,
    CanvasHeight : 256,
    CanvasBG : "rgba(50, 50, 50, 0.75)"
  },

  numslider_simple : {
    labelOnTop : false,
    TitleText : new CSSFont({
      size : 14
    }),
    BoxBG : "rgb(225, 225, 225)",
    BoxBorder : "rgb(75, 75, 75)",
    SlideHeight : 10,
    DefaultWidth : 135,
    DefaultHeight : 18,
    BoxRadius : 5,
    TextBoxWidth : 45
  },

  colorfield : {
    fieldsize : 32,
    defaultWidth : 200,
    defaultHeight : 200,
    hueheight : 24,
    colorBoxHeight : 24,
    circleSize : 4,
    DefaultPanelBG : "rgba(170, 170, 170, 1.0)"
  },

  listbox : {
    DefaultPanelBG : "rgba(230, 230, 230, 1.0)",
    ListHighlight : "rgba(155, 220, 255, 0.5)",
    ListActive : "rgba(200, 205, 215, 1.0)",
    width : 110,
    height : 200
  },

  dopesheet : {
    treeWidth : 100,
    treeHeight : 600
  },

  colorpickerbutton : {
    defaultWidth  : 100,
    defaultHeight : 25,
    defaultFont   : "LabelText"
  },

  dropbox : {
    dropTextBG : "rgba(250, 250, 250, 0.7)", //if undefined, will use BoxBG
    BoxHighlight : "rgba(155, 220, 255, 0.4)",
    defaultHeight : 24
  }
};

let _ui_base = undefined;

let Vector4$1 = Vector4;

const EnumProperty$2 = EnumProperty$1;

const ErrorColors = {
  WARNING : "yellow",
  ERROR : "red",
  OK : "green"
};

window.__theme = theme;

function setTheme(theme2) {
  //merge theme
  for (let k in theme2) {
    let v = theme2[k];

    if (typeof v !== "object") {
      theme[k] = v;
      continue;
    }

    if (!(k in theme)) {
      theme[k] = {};
    }

    for (let k2 in v) {
      theme[k][k2] = v[k2];
    }
  }
}

setTheme(DefaultTheme);

let _last_report = time_ms();
function report$1(msg) {
  if (time_ms() - _last_report > 350) {
    console.warn(msg);
    _last_report = time_ms();
  }
}

//this function is deprecated
function getDefault(key, elem) {
  console.warn("Deprecated call to ui_base.js:getDefault");

  if (key in theme.base) {
    return theme.base[key];
  } else {
    throw new Error("Unknown default", key);
  }
}

//XXX implement me!
function IsMobile() {
  return false;
};

let keys = ["margin", "padding", "margin-block-start", "margin-block-end"];
keys = keys.concat(["padding-block-start", "padding-block-end"]);

keys = keys.concat(["margin-left", "margin-top", "margin-bottom", "margin-right"]);
keys = keys.concat(["padding-left", "padding-top", "padding-bottom", "padding-right"]);
const marginPaddingCSSKeys = keys;

class _IconManager {
  constructor(image, tilesize, number_of_horizontal_tiles, drawsize) {
    this.tilex = number_of_horizontal_tiles;
    this.tilesize = tilesize;
    this.drawsize = drawsize;

    this.image = image;
  }
  
  canvasDraw(elem, canvas, g, icon, x=0, y=0) {
    let tx = icon % this.tilex;
    let ty = ~~(icon / this.tilex);

    let dpi = elem.getDPI();
    let ts = this.tilesize;
    let ds = this.drawsize;

    g.drawImage(this.image, tx*ts, ty*ts, ts, ts, x, y, ds*dpi, ds*dpi);
  }

  setCSS(icon, dom) {
    dom.style["background"] = this.getCSS(icon);
    dom.style["background-size"] = (this.drawsize*this.tilex) + "px";

    if (!dom.style["width"]) {
      dom.style["width"] = this.drawsize + "px";
    }
    if (!dom.style["height"]) {
      dom.style["height"] = this.drawsize + "px";
    }
  }

  //icon is an integer
  getCSS(icon) {
    if (icon == -1) { //-1 means no icon
      return '';
    }
    
    let ratio = this.drawsize / this.tilesize;

    let x = (-(icon % this.tilex) * this.tilesize) * ratio;
    let y = (-(~~(icon / this.tilex)) * this.tilesize) * ratio;

    //x = ~~x;
    //y = ~~y;

    //console.log(this.tilesize, this.drawsize, x, y);

    return `url("${this.image.src}") ${x}px ${y}px`;
  }
}

class IconManager {
  /**
   images is a list of dom ids of img tags

   sizes is a list of tile sizes, one per image.
   you can control the final *draw* size by passing an array
   of [tilesize, drawsize] instead of just a number.
   */
  constructor(images, sizes, horizontal_tile_count) {
    this.iconsheets = [];
    this.tilex = horizontal_tile_count;
    
    for (let i=0; i<images.length; i++) {
      let size, drawsize;

      if (typeof sizes[i] == "object") {
        size = sizes[i][0], drawsize = sizes[i][1];
      } else {
        size = drawsize = sizes[i];
      }

      if (isMobile()) {
        drawsize = ~~(drawsize * theme.base.mobileSizeMultiplier);
      }

      this.iconsheets.push(new _IconManager(images[i], size, horizontal_tile_count, drawsize));
    }
  }

  load(manager2) {
    this.iconsheets = manager2.iconsheets;
    this.tilex = manager2.tilex;

    return this;
  }

  reset(horizontal_tile_count) {
    this.iconsheets.length = 0;
    this.tilex = horizontal_tile_count;
  }

  add(image, size, drawsize=size) {
    this.iconsheets.push(new _IconManager(image, size, this.tilex, drawsize));
    return this;
  }

  canvasDraw(elem, canvas, g, icon, x=0, y=0, sheet=0) {
    let base = this.iconsheets[sheet];
    
    sheet = this.findSheet(sheet);
    let ds = sheet.drawsize;

    sheet.drawsize = base.drawsize;
    sheet.canvasDraw(elem, canvas, g, icon, x, y);
    sheet.drawsize = ds;
  }
  
  findSheet(sheet) {
    if (sheet === undefined) {
      console.warn("sheet was undefined");
      sheet = 0;
    }
    
    let base = this.iconsheets[sheet];

    /**sigh**/
    let dpi = UIBase.getDPI();
    let minsheet = undefined;
    let goal = dpi*base.drawsize;

    for (let sheet of this.iconsheets) {
      minsheet = sheet;

      if (sheet.drawsize >= goal) {
        break;
      }
    }

    return minsheet === undefined ? base : minsheet;
  }

  getTileSize(sheet=0) {
    return this.iconsheets[sheet].drawsize;
    return this.findSheet(sheet).drawsize;
  }

  getRealSize(sheet=0) {
    return this.iconsheets[sheet].tilesize;
    return this.findSheet(sheet).tilesize;
    //return this.iconsheets[sheet].tilesize;
  }
  
  //icon is an integer
  getCSS(icon, sheet=0) {
    //return this.iconsheets[sheet].getCSS(icon);
    //return this.findSheet(sheet).getCSS(icon);

    let base = this.iconsheets[sheet];
    sheet = this.findSheet(sheet);
    let ds = sheet.drawsize;
    
    sheet.drawsize = base.drawsize;
    let ret = sheet.getCSS(icon);
    sheet.drawsize = ds;
    
    return ret;
  }

  setCSS(icon, dom, sheet=0) {
    //return this.iconsheets[sheet].setCSS(icon, dom);
    
    let base = this.iconsheets[sheet];
    sheet = this.findSheet(sheet);
    let ds = sheet.drawsize;
    
    sheet.drawsize = base.drawsize;
    let ret = sheet.setCSS(icon, dom);
    sheet.drawsize = ds;

    return ret;
  }
}

let iconmanager = new IconManager([
  document.getElementById("iconsheet16"),
  document.getElementById("iconsheet32"),
  document.getElementById("iconsheet48")
], [16, 32, 64], 16);

window._iconmanager = iconmanager; //debug global

//if client code overrides iconsheets, they must follow logical convention
//that the first one is "small" and the second is "large"
let IconSheets = {
  SMALL  : 0,
  LARGE  : 1,
  XLARGE : 2
};

function setIconManager(manager, IconSheetsOverride) {
  iconmanager.load(manager);

  if (IconSheetsOverride !== undefined) {
    for (let k in IconSheetsOverride) {
      IconSheets[k] = IconSheetsOverride[k];
    }
  }
}

function makeIconDiv(icon, sheet=0) {
    let size = iconmanager.getRealSize(sheet);
    let drawsize = iconmanager.getTileSize(sheet);

    let icontest = document.createElement("div");
    
    icontest.style["width"] = icontest.style["min-width"] = drawsize + "px";
    icontest.style["height"] = icontest.style["min-height"] = drawsize + "px";
    
    icontest.style["background-color"] = "orange";
    
    icontest.style["margin"] = "0px";
    icontest.style["padding"] = "0px";

    iconmanager.setCSS(icon, icontest, sheet);

    return icontest;
}

let Vector2$3 = Vector2;
let Matrix4$1 = Matrix4;

let dpistack = [];

const UIFlags = {

};

const PackFlags = {
  INHERIT_WIDTH  : 1,
  INHERIT_HEIGHT : 2,
  VERTICAL : 4,
  USE_ICONS : 8,
  SMALL_ICON : 16,
  LARGE_ICON : 32,

  //internal flags
  STRIP_HORIZ : 512,
  STRIP_VERT : 1024,
  STRIP : 512|1024,
  SIMPLE_NUMSLIDERS : 2048,
  FORCE_ROLLER_SLIDER : 4096
};
 
let first$1 = (iter) => {
  if (iter === undefined) {
    return undefined;
  }
  
  if (!(Symbol.iterator in iter)) {
    for (let item in iter) {
      return item;
    }
    
    return undefined;
  }
  
  for (let item of iter) {
    return item;
  }
};

class SimpleContext {
  constructor(stateobj, api) {
    if (api === undefined) {
      throw new Error("api cannot be undefined, see controller.js");
    }
    this.state = stateobj;
    this.api = api;
  }
}

let _mobile_theme_patterns = [
  /.*width.*/,
  /.*height.*/,
  /.*size.*/,
  /.*margin.*/,
  /.*pad/,
  /.*radius.*/
];


let _idgen = 0;

class UIBase extends HTMLElement {
  constructor() {
    super();

    this._wasAddedToNodeAtSomeTime = false;

    this.visibleToPick = true;

    this._override_class = undefined;
    this.parentWidget = undefined;

    /*
    this.shadow._appendChild = this.shadow.appendChild;
    this.shadow.appendChild = (child) => {
      if (child instanceof UIBase) {
        child.ctx = this.ctx;
        child.parentWidget = this;

        if (child._useDataPathUndo === undefined) {
          child.useDataPathUndo = this.useDataPathUndo;
        }
      }

      return this.shadow._appendChild(child);
    };
    //*/

    this._useDataPathUndo = undefined;
    let tagname = this.constructor.define().tagname;
    
    this._id = tagname.replace(/\-/g, "_") + (_idgen++);

    this.default_overrides = {};
    this.class_default_overrides = {};

    this._last_description = undefined;

    //getting css to flow down properly can be a pain, so
    //some packing settings are set as bitflags here,
    //see PackFlags
    
    /*
    setInterval(() => {
      this.update();
    }, 200);
    //*/

    this._modaldata = undefined;
    this.packflag = this.getDefault("BasePackFlag");
    this._disabled = false;
    this._disdata = undefined;
    this.shadow = this.attachShadow({mode : 'open'});
    this._ctx = undefined;
    
    this._description = undefined;
    
    let style = document.createElement("style");
    style.textContent = `
    .DefaultText {
      font: `+_getFont(this)+`;
    }
    `;
    this.shadow.appendChild(style);
    this._init_done = false;

    //make default touch handlers that send mouse events
    let do_touch = (e, type, button) => {
      button = button === undefined ? 0 : button;
      let e2 = copyEvent(e);

      if (e.touches.length == 0) {
        //hrm, what to do, what to do. . .
      } else {
        let t = e.touches[0];

        e2.pageX = t.pageX;
        e2.pageY = t.pageY;
        e2.screenX = t.screenX;
        e2.screenY = t.screenY;
        e2.clientX = t.clientX;
        e2.clientY = t.clientY;
        e2.x = t.x;
        e2.y = t.y;
      }

      e2.button = button;

      e2 = new MouseEvent(type, e2);

      e2.was_touch = true;
      e2.stopPropagation = e.stopPropagation.bind(e);
      e2.preventDefault = e.preventDefault.bind(e);
      e2.touches = e.touches;

      this.dispatchEvent(e2);
    };

    this.addEventListener("touchstart", (e) => {
      do_touch(e, "mousedown", 0);
    }, {passive : false});
    this.addEventListener("touchmove", (e) => {
      do_touch(e, "mousemove");
    }, {passive : false});
    this.addEventListener("touchcancel", (e) => {
      do_touch(e, "mouseup", 2);
    }, {passive : false});
    this.addEventListener("touchend", (e) => {
      do_touch(e, "mouseup", 0);
    }, {passive : false});
  }

  /**
   causes calls to setPathValue to go through
   toolpath app.datapath_set(path="" newValueJSON="")

   every child will inherit
  */
  set useDataPathUndo(val) {
    this._useDataPathUndo = val;
  }

  get parentWidget() {
    return this._parentWidget;
  }

  set parentWidget(val) {
    if (val) {
      this._wasAddedToNodeAtSomeTime = true;
    }

    this._parentWidget = val;
  }

  get useDataPathUndo() {
    let p = this;

    while (p) {
      if (p._useDataPathUndo !== undefined) {
        return p._useDataPathUndo;
      }

      p = p.parentWidget;
    }

    return false;
  }

  connectedCallback() {

  }

  get description() {

    return this._description;
  }

  set description(val) {
    this._description = val;

    if (val === undefined || val === null) {
      return;
    }

    if (exports.showPathsInToolTips && this.hasAttribute("datapath")) {
      let s = "" + this._description;

      let path = this.getAttribute("datapath");
      s += "\n    path: " + path;

      if (this.hasAttribute("mass_set_path")) {
        let m = this.getAttribute("mass_set_path");
        s += "\n    massSetPath: " + m;
      }
      this.title = s;

    } else {
      this.title = ""+val;
    }
  }

  noMarginsOrPadding() {
    let keys = ["margin", "padding", "margin-block-start", "margin-block-end"];
    keys = keys.concat(["padding-block-start", "padding-block-end"]);
    
    keys = keys.concat(["margin-left", "margin-top", "margin-bottom", "margin-right"]);
    keys = keys.concat(["padding-left", "padding-top", "padding-bottom", "padding-right"]);

    for (let k of keys) {
      this.style[k] = "0px";
    }

    return this;
  }

  /**
   * find owning screen and tell it to update
   * the global tab order
   * */
  regenTabOrder() {
    let screen = this.getScreen();
    if (screen !== undefined) {
      screen.needsTabRecalc = true;
    }

    return this;
  }

  noMargins() {
    this.style["margin"] = this.style["margin-left"] = this.style["margin-right"] = "0px";
    this.style["margin-top"] = this.style["margin-bottom"] = "0px";
    return this;
  }

  noPadding() {
    this.style["padding"] = this.style["padding-left"] = this.style["padding-right"] = "0px";
    this.style["padding-top"] = this.style["padding-bottom"] = "0px";
    return this;
  }

  get background() {
    return this.__background;
  }

  set background(bg) {
    this.__background = bg;
    this.style["background-color"] = bg;
  }

  getTotalRect() {
    let found = false;

    let min = new Vector2$3([1e17, 1e17]);
    let max = new Vector2$3([-1e17, -1e17]);

    let doaabb = (n) => {
      let rs = n.getClientRects();

      for (let r of rs) {
        min[0] = Math.min(min[0], r.x);
        min[1] = Math.min(min[1], r.y);
        max[0] = Math.max(max[0], r.x+r.width);
        max[1] = Math.max(max[1], r.y+r.height);

        found = true;
      }
    };

    doaabb(this);

    this._forEachChildWidget((n) => {
      doaabb(n);
    });

    if (found) {
      return {
        width  : max[0] - min[0],
        height : max[1] - min[1],
        x : min[0],
        y : min[1],
        left : min[0],
        top : min[1],
        right : max[0],
        bottom : max[1]
      };
    } else {
      return undefined;
    }
  }

  parseNumber(value, args={}) {
    value = (""+value).trim().toLowerCase();

    let baseUnit = args.baseUnit || this.baseUnit;
    let isInt = args.isInt || this.isInt;

    let sign = 1.0;

    if (value.startsWith("-")) {
      value = value.slice(1, value.length).trim();
      sign = -1;
    }

    let hexre = /-?[0-9a-f]+h$/;

    if (value.startsWith("0b")) {
      value = value.slice(2, value.length).trim();
      value = parseInt(value, 2);
    } else if (value.startsWith("0x")) {
      value = value.slice(2, value.length).trim();
      value = parseInt(value, 16);
    } else if (value.search(hexre) === 0) {
      value = value.slice(0, value.length-1).trim();
      value = parseInt(value, 16);
    } else {
      value = parseValue(value, baseUnit);
    }

    if (isInt) {
      value = ~~value;
    }

    return value*sign;
  }

  formatNumber(value, args={}) {
    let baseUnit = args.baseUnit || this.baseUnit;
    let displayUnit = args.displayUnit || this.displayUnit;
    let isInt = args.isInt || this.isInt;
    let radix = args.radix || this.radix || 10;
    let decimalPlaces = args.decimalPlaces || this.decimalPlaces;

    //console.log(this.baseUnit, this.displayUnit);

    if (isInt && radix !== 10) {
      let ret = Math.floor(value).toString(radix);

      if (radix === 2)
        return "0b" + ret;
      else if (radix === 16)
        return ret + "h";
    }

    return buildString(value, baseUnit, decimalPlaces, displayUnit);
  }

  setCSS() {
    let zoom = this.getZoom();
    this.style["transform"] = `scale(${zoom},${zoom})`;
  }

  appendChild(child) {
    if (child instanceof UIBase) {
      child.ctx = this.ctx;
      child.parentWidget = this;

      child.useDataPathUndo = this.useDataPathUndo;
    }

    return super.appendChild(child);
  }

    //delayed init
  init() {
    this._init_done = true;

    if (this._id)
      this.setAttribute("id", this._id);
  }
  
  _ondestroy() {
    if (this.tabIndex >= 0) {
      this.regenTabOrder();
    }

    if (this.ondestroy !== undefined) {
      this.ondestroy();
    }
  }
  
  remove(trigger_on_destroy=true) {
    if (this.tabIndex >= 0) {
      this.regenTabOrder();
    }

    super.remove();

    if (trigger_on_destroy) {
      this._ondestroy();
    }

    if (this.on_remove) {
      this.on_remove();
    }

    this.parentWidget = undefined;
  }

  /*
  *
  * called when elements are removed.
  * you should assume the element will be reused later;
  * on_destroy is the callback for when elements are permanently destroyed
  * */
  on_remove() {

  }
  
  removeChild(child, trigger_on_destroy=true) {
    super.removeChild(child);

    if (trigger_on_destroy) {
      child._ondestroy();
    }
  }


  //used by container nodes
  /**
   * Iterates over all child widgets,
   * including ones that might be inside
   * of normal DOM nodes.
   *
   * This is done by recursing into the dom
   * tree and stopping at any node that's
   * descended from ui_base.UIBase
   **/
  _forEachChildWidget(cb, thisvar) {
    let rec = (n) => {
      if (n instanceof UIBase) {
        if (thisvar !== undefined) {
          cb.call(thisvar, n);
        } else {
          cb(n);
        }
      } else {
        for (let n2 of n.childNodes) {
          rec(n2);
        }

        if (n.shadow !== undefined) {
          for (let n2 of n.shadow.childNodes) {
            rec(n2);
          }
        }
      }
    };
    
    for (let n of this.childNodes) {
      rec(n);
    }

    for (let n of this.shadow.childNodes) {
      rec(n);
    }
  }
  
  _init() {
    if (this._init_done) {
      return;
    }

    this._init_done = true;
    this.init();
  }
  
  static setDefault(element) {
    return element;
  }
  
  getWinWidth() {
    return window.innerWidth;
  }
  
  getWinHeight() {
    return window.innerHeight;
  }

  calcZ() {
    let p = this;
    let n = this;

    while (n) {
      if (n.style && n.style["z-index"]) {
        let z = parseFloat(n.style["z-index"]);
        return z;
      }

      n = n.parentNode;

      if (!n) {
        n = p = p.parentWidget;
      }
    }

    return 0;
  }

  pickElement(x, y, marginx=0, marginy=0, nodeclass=UIBase, excluded_classes=undefined) {
    let ret = undefined;

    let retzindex = undefined;

    let testwidget = (n) => {
      if (n instanceof nodeclass) {
        let ok=true;
        ok = n.visibleToPick;
        ok = ok && !n.hidden;
        ok = ok && !(excluded_classes !== undefined && excluded_classes.indexOf(n.constructor) >= 0);

        return ok;
      }
    };

    let rec = (n, widget, widget_zindex, zindex, depth=0) => {
      if (n.style && n.style["z-index"]) {
        if (!(n instanceof UIBase) || n.visibleToPick) {
          zindex = parseInt(n.style["z-index"]);
        }
      }

      if (n.getClientRects && n.getClientRects().length > 0) {
        let rects = n.getClientRects();

        if (testwidget(n)) {
          widget = n;
          widget_zindex = zindex;
        }

        for (let rect of rects) {
          let ok = true;

          if (n instanceof UIBase) {
            ok = ok && n.visibleToPick;
          }

          ok = ok && !n.hidden;
          ok = ok && (retzindex === undefined || widget_zindex >= retzindex);
          ok = ok && (retzindex === undefined || zindex >= retzindex);

          ok =  ok && x >= rect.x-marginx && x <= rect.x+marginx+rect.width;
          ok = ok && y >= rect.y-marginy && y <= rect.y+marginy+rect.height;

          if (ok) {
            ret = widget;
            retzindex = zindex;
          }
        }
      }

      let isleaf = n.childNodes.length === 0;

      if (n.shadow !== undefined) {
        isleaf = isleaf && (n.shadow.childNodes.length === 0);
      }

      if (!isleaf) {
        if (n.shadow !== undefined) {
          for (let i=0; i<n.shadow.childNodes.length; i++) {
            let i2 = i;
            //i2 = n.shadow.childNodes.length - 1 - i;

            let n2 = n.shadow.childNodes[i2];
            rec(n2, widget, widget_zindex, zindex, depth+1);
          }
        }
        for (let i=0; i<n.childNodes.length; i++) {
          let i2 = i;
          //i2 = n.childNodes.length - 1 - i;

          let n2 = n.childNodes[i2];
          rec(n2, widget, widget_zindex, zindex, depth+1);
        }
      }
    };

    let p = this;

    while (p && !p.style["z-index"] && p.style["z-index"] !== 0.0) {
      p = p.parentWidget;
    }
    let zindex = p !== undefined ? parseInt(p.style["z-index"]) : 0;

    rec(this, testwidget(this) ? this : undefined, zindex, zindex);

    return ret;
  }

  set disabled(val) {
    if (!!this._disabled == !!val)
      return;

    if (val && !this._disdata) {
      this._disdata = {
        background : this.background,
        bgcolor : this.style["background-color"],
        DefaultPanelBG : this.default_overrides.DefaultPanelBG,
        BoxBG : this.default_overrides.BoxBG
      };

      let bg = this.getDefault("DisabledBG");

      this.background = bg;
      this.default_overrides.DefaultPanelBG = bg;
      this.default_overrides.BoxBG = bg;
      this.style["background-color"] = bg;

      this._disabled = val;
      this.on_disabled();
    } else if (!val && this._disdata) {
      if (this._disdata.DefaultPanelBG) {
        this.default_overrides.DefaultPanelBG = this._disdata.DefaultPanelBG;
      } else {
        delete this.default_overrides.DefaultPanelBG;
      }

      if (this.boxBG) {
        this.default_overrides.BoxBG = this._disdata.BoxBG;
      } else {
        delete this.default_overrides.BoxBG;
      }

      this.background = this._disdata.background;
      this.style["background-color"] = this._disdata.bgcolor;
      this._disdata = undefined;

      this._disabled = val;
      this.on_enabled();
    }

    this._disabled = val;

    let rec = (n) => {
      if (n instanceof UIBase) {
        n.disabled = val;
      }

      for (let c of n.childNodes) {
        rec(c);
      }

      if (!n.shadow) return;

      for (let c of n.shadow.childNodes) {
        rec(c);
      }
    };

    rec(this);
  }

  on_disabled() {

  }

  on_enabled() {

  }

  pushModal(handlers=this, autoStopPropagation=true) {
    if (this._modaldata !== undefined){
      console.warn("UIBase.prototype.pushModal called when already in modal mode");
      //pop modal stack just to be safe
      popModalLight(this._modaldata);
      this._modaldata = undefined;
    }

    this._modaldata = pushModalLight(handlers, autoStopPropagation);
    return this._modaldata;
  }

  popModal() {
    if (this._modaldata === undefined) {
      console.warn("Invalid call to UIBase.prototype.popModal");
      return;
    }

    popModalLight(this._modaldata);
    this._modaldata = undefined;
  }

  get disabled() {
    return this._disabled;
  }

  flash(color, rect_element=this, timems=355) {
    //console.warn("flash disabled due to bug");
    //return;
    
    console.warn("flash");

    if (typeof color != "object") {
        color = css2color(color);
    }
    color = new Vector4$1(color);
    let csscolor = color2css(color);
    
    if (this._flashtimer !== undefined && this._flashcolor !== csscolor) {
      window.setTimeout(() => {
        this.flash(color, rect_element, timems);
      }, 100);
      
      return;
    } else if (this._flashtimer !== undefined) {
      return;
    }
    
    let rect = rect_element.getClientRects()[0];
    if (rect === undefined) {
      return;
    }
    
    //okay, dom apparently calls onchange() on .remove, so we have
    //to put the timer code first to avoid loops
    let timer;
    let tick = 0;
    let max = ~~(timems/20);

    this._flashtimer = timer = window.setInterval((e) => {
      if (timer === undefined) {
        return
      }
      
      let a = 1.0 - tick / max;
      div.style["background-color"] = color2css(color, a*a*0.5);
      
      if (tick > max) {
        window.clearInterval(timer);
        
        this._flashtimer = undefined;
        this._flashcolor = undefined;
        timer = undefined;
        
        try {
          //this.remove();
          //div.parentNode.insertBefore(this, div);
        } catch (error) {
          console.log("dom removal error");
          div.appendChild(this);
          return;
        }
        
        //console.log(div.parentNode);
        div.remove();
        
        this.focus();
      }
      
      tick++;
    }, 20);

    let div = document.createElement("div");
    
    //this.parentNode.insertBefore(div, this);
    
    try {
      //this.remove();
    } catch (error) {
      console.log("this.remove() failure in UIBase.flash()");
    }        
    
    //div.appendChild(this);

    div.style["pointer-events"] = "none";
    div.tabIndex = undefined;
    div.style["z-index"] = "900";
    div.style["display"] = "float";
    div.style["position"] = "absolute";
    div.style["left"] = rect.x + "px";
    div.style["top"] = rect.y + "px";

    div.style["background-color"] = color2css(color, 0.5);
    div.style["width"] = rect.width + "px";
    div.style["height"] = rect.height + "px";
    div.setAttribute("class", "UIBaseFlash");

    let screen = this.getScreen();
    if (screen !== undefined) {
      screen._enterPopupSafe();
    }

    document.body.appendChild(div);
    this.focus();
    this._flashcolor = csscolor;

    if (screen !== undefined) {
      screen._exitPopupSafe();
    }
  }
  
  destory() {
  }
  
  on_resize(newsize) {
  }
  
  get ctx() {
    return this._ctx;
  }
  
  toJSON() {
    let ret = {};
    
    if (this.hasAttribute("datapath")) {
      ret.datapath = this.getAttribute("datapath");
    }
    
    return ret;
  }
  
  loadJSON(obj) {
    if (!this._init_done) {
      this._init();
    }
  }
  
  getPathValue(ctx, path) {
    try {
      return ctx.api.getValue(ctx, path);
    } catch (error) {
      //report("data path error in ui for" + path);
      return undefined;
    }
  }

  setPathValueUndo(ctx, path, val) {
    let mass_set_path = this.getAttribute("mass_set_path");
    let rdef = ctx.api.resolvePath(ctx, path);
    let prop = rdef.prop;

    if (ctx.api.getValue(ctx, path) == val) {
      return;
    }

    let toolstack = this.ctx.toolstack;
    let head = toolstack[toolstack.cur];

    let bad = head === undefined || !(head instanceof getDataPathToolOp());
    bad = bad || head.hashThis() !== head.hash(mass_set_path, path, prop.type, this._id);

    //if (head !== undefined && head instanceof getDataPathToolOp()) {
      //console.log("===>", bad, head.hashThis());
      //console.log("    ->", head.hash(mass_set_path, path, prop.type, this._id));
    //}

    if (!bad) {
      toolstack.undo();
      head.setValue(ctx, val);
      toolstack.redo();
    } else {
      let toolop = getDataPathToolOp().create(ctx, path, val, this._id, mass_set_path);
      ctx.toolstack.execTool(this.ctx, toolop);
    }
  }

  setPathValue(ctx, path, val) {
    if (this.useDataPathUndo) {
      ctx.api.pushReportContext(this._reportCtxName);

      try {
        this.setPathValueUndo(ctx, path, val);
      } catch (error) {
        ctx.api.popReportContext();

        if (!(error instanceof DataPathError)) {
          throw error;
        } else {
          return;
        }
      }

      ctx.api.popReportContext();
      return;
    }

    ctx.api.pushReportContext(this._reportCtxName);

    try {
      if (this.hasAttribute("mass_set_path")) {
        ctx.api.massSetProp(ctx, this.getAttribute("mass_set_path"), val);
        ctx.api.setValue(ctx, path, val);
      } else {
        ctx.api.setValue(ctx, path, val);
      }
    } catch (error) {
      ctx.api.popReportContext();

      if (!(error instanceof DataPathError)) {
        throw error;
      }

      return;
    }

    ctx.api.popReportContext();
  }

  get _reportCtxName() {
    return ""+this._id;
  }

  getPathMeta(ctx, path) {
    ctx.api.pushReportContext(this._reportCtxName);
    let ret = ctx.api.resolvePath(ctx, path);
    ctx.api.popReportContext();

    return ret !== undefined ? ret.prop : undefined;
  }

  getPathDescription(ctx, path) {
    let ret;
    ctx.api.pushReportContext(this._reportCtxName);

    try {
      ret = ctx.api.getDescription(ctx, path);
    } catch (error) {
      ctx.api.popReportContext();

      if (error instanceof DataPathError) {
        //console.warn("Invalid data path '" + path + "'");
        return undefined;
      } else {
        throw error;
      }
    }

    ctx.api.popReportContext();
    return ret;
  }

  getScreen() {
    if (this.ctx !== undefined)
      return this.ctx.screen;
  }

  isDead() {
    let p = this, lastp = this;

    while (p) {
      lastp = p;

      let parent = p.parentWidget;
      if (!parent) {
        parent = p.parentElement ? p.parentElement : p.parentNode;
      }

      p = parent;

      if (p === document.body) {
        return false;
      }
    }

    return true;
  }
  /*
    adds a method call to the event queue,
    but only if that method (for this instance, as differentiated
    by ._id) isn't there already.

    also, method won't be ran until this.ctx exists
  */
  
  doOnce(func, timeout=undefined) {
    if (func._doOnce === undefined) {
      func._doOnce_reqs = new Set();
      
      func._doOnce = (thisvar) => {
        if (func._doOnce_reqs.has(thisvar._id)) {
          return;
        }
        
        func._doOnce_reqs.add(thisvar._id);
        let f = () => {
          if (this.isDead()) {
            if (func === this._init || !exports.DEBUG.doOnce) {
              return;
            }

            console.warn("Ignoring doOnce call for dead element", this._id, func);
            return;
          }

          if (!this.ctx) {
            if (exports.DEBUG.doOnce) {
              console.warn("doOnce call is waiting for context...", this._id, func);
            }

            window.setTimeout(f, 0);
            return;
          }

          func._doOnce_reqs.delete(thisvar._id);
          func.call(thisvar);
        };

        window.setTimeout(f, timeout);
      };
    }
    
    func._doOnce(this);
  }

  
  set ctx(c) {
    this._ctx = c;

    this._forEachChildWidget((n) => {
      n.ctx = c;
    });
  }
  
  float(x=0, y=0, zindex=undefined) {
    this.style.position = "absolute";
    
    this.style.left = x + "px";
    this.style.top = y + "px";
    
    if (zindex !== undefined) {
      this.style["z-index"] = zindex;
    }
    
    return this;
  }
  
  _ensureChildrenCtx() {
    let ctx = this.ctx;
    if (ctx === undefined) {
      return;
    }
    
    this._forEachChildWidget((n) => {
      n.parentWidget = this;

      if (n.ctx === undefined) {
        n.ctx = ctx;
      }
      
      n._ensureChildrenCtx(ctx);
    });
  }
  
  //called regularly
  update() {
    if (this.ctx && this._description === undefined && this.getAttribute("datapath")) {
      let d = this.getPathDescription(this.ctx, this.getAttribute("datapath"));

      this.description = d;
    }

    if (!this._init_done) {
      this._init();
    }
    
    //this._ensureChildrenCtx();
  }
  
  onadd() {
    //if (this.parentWidget !== undefined) {
    //  this._useDataPathUndo = this.parentWidget._useDataPathUndo;
    //}

    if (!this._init_done) {
      this.doOnce(this._init);
    }

    if (this.tabIndex >= 0) {
      this.regenTabOrder();
    }
  }

  getZoom() {
    if (this.parentWidget !== undefined) {
      return this.parentWidget.getZoom();
    }

    return 1.0;
  }

  /**try to use this method

   scaling ratio (e.g. for high-resolution displays)
   for zoom ratio use getZoom()
   */
  getDPI() {
    if (this.parentWidget !== undefined) {
      return this.parentWidget.getDPI();
    }

    return UIBase.getDPI();
  }

  /**DEPRECATED

    scaling ratio (e.g. for high-resolution displays)
   */
  static getDPI() {
    //if (dpistack.length > 0) {
    //  return dpistack[this.dpistack.length-1];
    //} else {
    if (isMobile()) {
      return window.devicePixelRatio * visualViewport.scale;
    }

    return window.devicePixelRatio;
    //}
  }
  
  /**
   * for saving ui state.
   * see saveUIData() export
   *
   * should fail gracefully.
   */
  saveData() {
    return {
    };
  }

  /**
   * for saving ui state.
   * see saveUIData() export
   *
   * should fail gracefully.
   *
   * also, it doesn't rebuild the object graph,
   * it patches it; for true serialization use
   * the toJSON/loadJSON or STRUCT interfaces.
   */
  loadData(obj) {
    return this;
  }
  
  //parent_cls is a string, tagname of element to extend
  static register(cls) {
    //if (parent_cls !== undefined) {
    // customElements.define(cls.define().tagname, cls, {extends : "div"});
    //} else {
      customElements.define(cls.define().tagname, cls);
    //}
  }

  overrideDefault(key, val) {
    this.default_overrides[key] = val;
  }

  overrideClass(style) {
    this._override_class = style;
  }

  overrideClassDefault(style, key, val) {
    if (!(style in this.class_default_overrides)) {
      this.class_default_overrides[style] = {};
    }

    this.class_default_overrides[style][key] = val;
  }

  _doMobileDefault(key, val) {
    if (!isMobile())
      return val;

    key = key.toLowerCase();
    let ok = false;

    for (let re of _mobile_theme_patterns) {
      if (key.search(re) >= 0) {
        ok = true;
        break;
      }
    }

    if (ok) {
      val *= theme.base.mobileSizeMultiplier;
    }

    return val;
  }

  getDefault(key, doMobile=true) {
    let p = this;

    while (p) {
      if (key in p.default_overrides) {
        let v = p.default_overrides[key];

        return doMobile ? this._doMobileDefault(key, v) : v;
      }

      p = p.parentWidget;
    }

    return this.getClassDefault(key, doMobile);
  }

  getStyleClass() {
    if (this._override_class !== undefined) {
      return this._override_class;
    }

    let p = this.constructor, lastp = undefined;

    while (p && p !== lastp && p !== UIBase && p !== Object) {
      let def = p.define();

      if (def.style) {
        return def.style;
      }

      if (!p.prototype || !p.prototype.__proto__)
        break;

      p = p.prototype.__proto__.constructor;
    }

    return "base";
  }

  getClassDefault(key, doMobile=true) {
    let style = this.getStyleClass();

    let val = undefined;
    let p = this;
    while (p) {
      let def = p.class_default_overrides[style];

      if (def && (key in def)) {
        val = def[key];
        break;
      }

      p = p.parentWidget;
    }

    if (val === undefined && style in theme && key in theme[style]) {
      val = theme[style][key];
    } else if (val === undefined) {
      val = theme.base[key];
    }

    return doMobile ? this._doMobileDefault(key, val) : val;
  }

  getStyle() {
    console.warn("deprecated call to UIBase.getStyle");
    return this.getStyleClass();
  }

  /**
   * Defines core attributes of the class
   *
   * @example
   *
   * static define() {return {
   *   tagname : "custom-element-x",
   *   style : "[style class in theme]"
   * }}
   */
  static define() {
    throw new Error("Missing define() for ux element");
  }
}

function drawRoundBox2(elem, options={}) {
  drawRoundBox(elem, options.canvas, options.g, options.width, options.height, options.r, options.op, options.color, options.margin, options.no_clear);
}

/**okay, I need to refactor this function,
  it needs to take x, y as well as width, height,
  and be usable for more use cases.*/
function drawRoundBox(elem, canvas, g, width, height, r=undefined,
                             op="fill", color=undefined, margin=undefined, no_clear=false) {
    width = width === undefined ? canvas.width : width;
    height = height === undefined ? canvas.height : height;
    g.save();

    let dpi = elem.getDPI();
    
    r = r === undefined ? elem.getDefault("BoxRadius") : r;

    if (margin === undefined) {
      margin = elem.getDefault("BoxDrawMargin");
    }

    r *= dpi;
    let r1=r, r2=r;
    
    if (r > (height - margin*2)*0.5) {
      r1 = (height - margin*2)*0.5;
    }
    
    if (r > (width - margin*2)*0.5) {
      r2 = (width - margin*2)*0.5;
    }
    
    let bg = color;
    
    if (bg === undefined && canvas._background !== undefined) {
      bg = canvas._background;
    } else if (bg === undefined) {
      bg = elem.getDefault("BoxBG");
    }
    
    if (op == "fill" && !no_clear) {
      g.clearRect(0, 0, width, height);
    }
    
    g.fillStyle = bg;
    //hackish!
    g.strokeStyle = color === undefined ? elem.getDefault("BoxBorder") : color;
    
    let w = width, h = height;
    
    let th = Math.PI/4;
    let th2 = Math.PI*0.75;
    
    g.beginPath();

    g.moveTo(margin, margin+r1);
    g.lineTo(margin, h-r1-margin);

    g.quadraticCurveTo(margin, h-margin, margin+r2, h-margin);
    g.lineTo(w-margin-r2, h-margin);
    
    g.quadraticCurveTo(w-margin, h-margin, w-margin, h-margin-r1);
    g.lineTo(w-margin, margin+r1);
    
    g.quadraticCurveTo(w-margin, margin, w-margin-r2, margin);
    g.lineTo(margin+r2, margin);

    g.quadraticCurveTo(margin, margin, margin, margin+r1);
    g.closePath();

    if (op == "clip") {
      g.clip();
    } else if (op == "fill") {
      g.fill();
      g.stroke();
    } else {
      g.stroke();
    }

    g.restore();
};

function _getFont_new(elem, size, font="DefaultText", do_dpi=true) {

  font = elem.getDefault(font);

  return font.genCSS(size);
}

function getFont(elem, size, font="DefaultText", do_dpi=true) {
  return _getFont_new(elem, size, font="DefaultText", do_dpi=true);
}

//size is optional, defaults to font's default size
function _getFont(elem, size, font="DefaultText", do_dpi=true) {
  let dpi = elem.getDPI();

  let font2 = elem.getDefault(font);
  if (font2 !== undefined) {
    //console.warn("New style font detected", font2, font2.genCSS(size));
    return _getFont_new(elem, size, font, do_dpi);
  }

  console.warn("Old style font detected");

  if (!do_dpi) {
    dpi = 1;
  }
  
  if (size !== undefined) {
    return ""+(size * dpi) + "px " + getDefault(font+"Font");
  } else {
    let size = getDefault(font+"Size");

    if (size === undefined) {
      console.warn("Unknown fontsize for font", font);
      size = 14;
    }

    return ""+size+ "px " + getDefault(font+"Font");
  }
}

function _ensureFont(elem, canvas, g, size) {
  let dpi = elem.getDPI();
  //size *= dpi;

  if (g.font) {
    return;
  }

  if (size !== undefined) {
    g.font = ""+Math.ceil(size) + "px sans-serif";
  } else if (!canvas.font) {
    let size = elem.getDefault("DefaultText").size;

    let add = "0"; //Math.ceil(Math.fract((0.5 / dpi))*100);
    
    //size += 4;
    g.font = ""+Math.floor(size) + "." + add + "px sans-serif";
  } else {
    g.font = canvas.font;
  }
}

let _mc;
function get_measure_canvas() {
  if (_mc !== undefined) {
    return _mc;
  }

  _mc = document.createElement("canvas");
  _mc.width = 256;
  _mc.height = 256;
  _mc.g = _mc.getContext("2d");

  return _mc;
}

function measureTextBlock(elem, text, canvas=undefined,
                                 g=undefined, size=undefined, font=undefined) {
  let lines = text.split("\n");

  let ret = {
    width : 0,
    height : 0
  };

  if (size === undefined) {
    if (font !== undefined && typeof font === "object") {
      size = font.size;
    }

    if (size === undefined) {
      size = elem.getDefault("DefaultText").size;
    }
  }

  for (let line of lines) {
    let m = measureText(elem, line, canvas, g, size, font);

    ret.width = Math.max(ret.width, m.width);
    let h = m.height !== undefined ? m.height : size*1.25;

    ret.height += h;
  }

  return ret;
}

function measureText(elem, text, canvas=undefined,
                            g=undefined, size=undefined, font=undefined) {
  if (g === undefined) {
    canvas = get_measure_canvas();
    g = canvas.g;
  }

  if (font !== undefined) {
    if (typeof font === "object" && font instanceof CSSFont) {
      font = font.genCSS(size);
    }

    g.font = font;
  } else {
    _ensureFont(elem, canvas, g, size);
  }

  let ret = g.measureText(text);

  if (ret && isMobile()) {
    let ret2 = {};
    let dpi = UIBase.getDPI();

    for (let k in ret) {
      let v = ret[k];

      if (typeof v === "number") {
        v *= dpi;
        //v *= window.devicePixelRatio;
      }

      ret2[k] = v;
    }

    ret = ret2;
  }
  
  if (size !== undefined) {
    //clear custom font for next time
    g.font = undefined;
  }
  
  return ret;
}

function drawText(elem, x, y, text, canvas, g, color=undefined, size=undefined, font=undefined) {
  if (size === undefined) {
    if (font !== undefined && font instanceof CSSFont) {
      size = font.size;
    } else {
      size = elem.getDefault("DefaultText").size;
    }
  }

  size *= UIBase.getDPI();

  if (font === undefined) {
    _ensureFont(elem, canvas, g, size);
  } else if (typeof font === "object" && font instanceof CSSFont) {
    font = font.genCSS(size);
  }

  if (font) {
    g.font = font;
  }

  if (color === undefined) {
    color = elem.getDefault("DefaultText").color;
  }
  if (typeof color === "object") {
    color = color2css(color);
  }


  g.fillStyle = color;
  g.fillText(text, x+0.5, y+0.5);
  
  if (size !== undefined) {
    //clear custom font for next time
    g.font = undefined;
  }
}

let PIDX=0, PSHADOW=1, PTOT=2;

function saveUIData(node, key) {
  if (key === undefined) {
    throw new Error("ui_base.saveUIData(): key cannot be undefined");
  }
  
  let paths = [];
  
  let rec = (n, path, ni, is_shadow) => {
    path = path.slice(0, path.length); //copy path
    
    let pi = path.length;
    for (let i=0; i<PTOT; i++) {
      path.push(undefined);
    }
    
    path[pi] = ni;
    path[pi+1] = is_shadow;
    
    if (n instanceof UIBase) {
      let path2 = path.slice(0, path.length);
      path2.push(n.saveData());
      
      if (path2[pi+2]) {
        paths.push(path2);
      }
    }
    
    for (let i=0; i<n.childNodes.length; i++) {
      let n2 = n.childNodes[i];
      
      rec(n2, path, i, false);
    }
    
    let shadow = n.shadow;
    
    if (!shadow)
      return;
    
    for (let i=0; i<shadow.childNodes.length; i++) {
      let n2 = shadow.childNodes[i];
      
      rec(n2, path, i, true);
    }
  };
  
  rec(node, [], 0, false);
  
  return JSON.stringify({
    key : key,
    paths : paths,
    _ui_version : 1
  });
}

function loadUIData(node, buf) {
  if (buf === undefined || buf === null) {
    return;
  }
  
  let obj = JSON.parse(buf);
  let key = buf.key;
  
  for (let path of obj.paths) {
    let n = node;
    
    let data = path[path.length-1];
    path = path.slice(2, path.length-1); //in case some api doesn't want me calling .pop()
    
    for (let pi=0; pi<path.length; pi += PTOT) {
      let ni = path[pi], shadow = path[pi+1];
      
      let list;
      
      if (shadow) {
        list = n.shadow;
        
        if (list) {
          list = list.childNodes;
        }
      } else {
        list = n.childNodes;
      }
      
      if (list === undefined || list[ni] === undefined) {
        //console.log("failed to load a ui data block", path);
        n = undefined;
        break;
      }
      
      n = list[ni];
    }
    
    if (n !== undefined && n instanceof UIBase) {
      n._init(); //ensure init's been called, _init will check if it has
      n.loadData(data);
      
      //console.log(n, path, data);
    }
  }
}

"use strict";

let keymap$1 = keymap;

let EnumProperty$3 = EnumProperty$1,
  PropTypes$2 = PropTypes;

let UIBase$1 = UIBase,
  PackFlags$1 = PackFlags,
  IconSheets$1 = IconSheets;

let parsepx$1 = parsepx;

//use .setAttribute("linear") to disable nonlinear sliding
class Button extends UIBase$1 {
  constructor() {
    super();

    let dpi = this.getDPI();

    this._last_update_key = "";

    this._name = "";
    this._namePad = undefined;

    this._last_w = 0;
    this._last_h = 0;

    this._last_dpi = dpi;

    this._lastw = undefined;
    this._lasth = undefined;

    this.dom = document.createElement("canvas");
    this.g = this.dom.getContext("2d");

    this.dom.setAttribute("class", "canvas1");
    this.dom.tabIndex = 0;

    this._last_bg = undefined;

    this.addEventListener("keydown", (e) => {
      if (this.disabled) return;

      if (exports.buttonEvents)
        console.log(e.keyCode);

      switch (e.keyCode) {
        case 27: //escape
          this.blur();
          e.preventDefault();
          e.stopPropagation();
          break;
        case 32: //spacebar
        case 13: //enter
          this.click();
          e.preventDefault();
          e.stopPropagation();
          break;
      }
    });

    this.addEventListener("focusin", () => {
      if (this.disabled) return;

      this._focus = 1;
      this._redraw();
      this.focus();
      //console.log("focus2");
    });

    this.addEventListener("blur", () => {
      if (this.disabled) return;

      this._focus = 0;
      this._redraw();
      //console.log("blur2");
    });

    this._last_disabled = false;
    this._auto_depress = true;

    let style = document.createElement("style");
    style.textContent = `.canvas1 {
      -moz-user-focus: normal;
      moz-user-focus: normal;
      user-focus: normal;
      padding : 0px;
      margin : 0px;
    }
    `;

    this.shadow.appendChild(style);
    let form = this._div = document.createElement("div");

    form.style["tabindex"] = 4;
    form.tabIndex = 4;
    form.setAttribute("type", "hidden");
    form.type ="hidden";
    form.style["-moz-user-focus"] = "normal";
    form.setAttribute("class", "canvas1");
    form.style["padding"] = form.style["margin"] = "0px";

    form.appendChild(this.dom);

    this.shadow.appendChild(form);
  }

  get tabIndex() {
    return this._div.tabIndex;
  }

  set tabIndex(val) {
    this._div.tabIndex = val;
  }

  get boxpad() {
    throw new Error("Button.boxpad is deprecated");
    return this.getDefault("BoxMargin");
  }

  click() {
    if (this._onpress) {
      let rect = this.getClientRects();
      let x = rect.x + rect.width*0.5;
      let y = rect.y + rect.height*0.5;

      let e = {x : x, y : y, stopPropagation : () => {}, preventDefault : () => {}};

      this._onpress(e);
    }

    super.click();
  }
  set boxpad(val) {
    throw new Error("Deprecated call to Button.boxpad setter");

    //console.warn("Deprecated call to Button.boxpad setter");
    //this.overrideDefault("BoxMargin", val);
  }

  init() {
    let dpi = this.getDPI();

    //set default dimensions
    let width = ~~(this.getDefault("defaultWidth"));
    let height = ~~(this.getDefault("defaultHeight"));

    this.dom.style["width"] = width + "px";
    this.dom.style["height"] = height + "px";
    this.dom.style["padding"] = this.dom.style["margin"] = "0px";

    this.dom.width = Math.ceil(width*dpi); //parsepx(this.dom.style["width"])*dpi;
    this.dom.height = Math.ceil(parsepx$1(this.dom.style["height"])*dpi);

    this._name = undefined;
    this.updateName();

    this.bindEvents();
    this._redraw();
  }

  setAttribute(key, val) {
    super.setAttribute(key, val);

    if (key == "name") {
      this.updateName();
      this.updateWidth();
    }
  }

  get r() {
    return this.getDefault("BoxRadius");
  }

  set r(val) {
    this.overrideDefault("BoxRadius", val);
  }

  bindEvents() {
    let press_gen = 0;

    let press = (e) => {
      e.stopPropagation();

      if (exports.buttonEvents)
        console.log("button press", this._pressed);

      if (this.disabled) return;
      if (this._pressed) return;

      this._pressed = true;

      if (this._onpress) {
        this._onpress(this);
      }

      this._redraw();

      e.preventDefault();
    };

    let depress = (e) => {
      if (exports.buttonEvents)
        console.log("button depress");

      if (this._auto_depress) {
        this._pressed = false;

        if (this.disabled) return;
        this._redraw();
      }

      e.preventDefault();
      e.stopPropagation();

      if (e.type === "mouseup" && (e.button || e.was_touch)) {
        return;
      }

      this._redraw();

      if (exports.buttonEvents)
        console.log("button click callback:", this.onclick);

      if (this.onclick && e.touches !== undefined) {
        this.onclick(this);
      }
    };

    this.addEventListener("mousedown", press, {captured : true, passive : false});

    this.addEventListener("touchstart", (e) => {
      press(e);
      if (e.onclick) {
        e.onclick(e);
      }
    }, {captured : true, passive : false});
    this.addEventListener("touchend", depress);
    this.addEventListener("touchcancel", depress);

    this.addEventListener("mouseup", depress, {captured : true, passive : false});

    this.addEventListener("mouseover", (e) => {
      if (this.disabled)
        return;

      this._highlight = true;
      this._repos_canvas();
      this._redraw();
    });

    this.addEventListener("mouseout", (e) => {
      if (this.disabled)
        return;

      this._highlight = false;
      this._repos_canvas();
      this._redraw();
    });
  }

  updateDisabled() {
    if (this._last_disabled != this.disabled) {
      this._last_disabled = this.disabled;

      //setTimeout(() => {
      this.dom._background = this.getDefault("BoxBG");

      this._repos_canvas();
      this._redraw();

      if (exports.buttonEvents)
        console.log("disabled update!", this.disabled, this.style["background-color"]);
      //}, 100);
    }
  }

  updateDefaultSize() {
    let height = ~~(this.getDefault("defaultHeight")) + this.getDefault("BoxMargin");

    let size = this.getDefault("DefaultText").size * 1.33;

    height = ~~Math.max(height, size);
    height = height + "px";

    if (height !== this.style["height"]) {
      this.style["height"] = height;
      this.dom.style["height"] = height;

      this._repos_canvas();
      this._redraw();
    }
  }

  _calcUpdateKey() {
    let ret = this.getDefault("BoxBG") + ":" + this.getDefault("BoxHighlight") + ":";
    ret += this.style["background-color"] + ":";
    ret += this.getDefault("BoxRadius") + ":" + this.getDefault("BoxMargin") + ":";
    ret += this.getAttribute("name") + ":";

    return ret;
  }

  update() {
    super.update();

    if (this.description !== undefined && this.title != this.description) {
      this.title = this.description;
    }

    this.updateDefaultSize();
    this.updateWidth();
    this.updateDPI();
    this.updateName();
    this.updateDisabled();

    if (this.background !== this._last_bg) {
      this._last_bg = this.background;
      this._repos_canvas();
      this._redraw();
    }

    let key = this._calcUpdateKey();
    if (key !== this._last_update_key) {
      this._last_update_key = key;

      this.setCSS();
      this._repos_canvas();
      this._redraw();
    }
  }

  setCSS() {
    super.setCSS();

    let name = this._name;
    if (name === undefined) {
      return;
    }

    let dpi = this.getDPI();

    let pad = this.getDefault("BoxMargin");
    let ts = this.getDefault("DefaultText").size;
    let tw = measureText(this, this._genLabel()).width/dpi + 8 + pad;

    if (this._namePad !== undefined) {
      tw += this._namePad;
    }

    let w = this.getDefault("numslider_width") / dpi;

    w = Math.max(w, tw);
    w = ~~w;
    this.dom.style["width"] = w+"px";
  }

  updateName() {
    let name = this.getAttribute("name");

    if (name !== this._name) {
      this._name = name;

      this.setCSS();
      this._repos_canvas();
      this._redraw();
    }
  }

  updateWidth(w_add=0) {
  }

  _repos_canvas() {
    let dpi = this.getDPI();

    this.dom.width = Math.floor(0.5+parsepx$1(this.dom.style["width"])*dpi);
    this.dom.height = Math.floor(0.5+parsepx$1(this.dom.style["height"])*dpi);
  }

  updateDPI() {
    let dpi = this.getDPI();

    if (this._last_dpi != dpi) {
      //console.log("update dpi", dpi);

      this._last_dpi = dpi;

      this.g.font = undefined; //reset font

      this.setCSS();
      this._repos_canvas();
      this._redraw();
    }

    if (this.style["background-color"]) {
      this.dom._background = this.style["background-color"];
      this.style["background-color"] = "";
    }

    //console.log(">", this.dom.style["background-color"], "-----");
    //console.log("width:", this.clientWidth)
  }

  _genLabel() {
    let text = "" + this._name;

    return text;
  }

  _redraw(draw_text=true) {
    //console.log("button draw");

    let dpi = this.getDPI();

    if (this._pressed) {
      this.dom._background = this.getDefault("BoxDepressed");
    } else if (this._highlight) {
      this.dom._background = this.getDefault("BoxHighlight");
    } else {
      this.dom._background = this.getDefault("BoxBG");
    }

    drawRoundBox(this, this.dom, this.g, undefined, undefined, undefined, undefined);

    if (this._focus) {
      let w = this.dom.width, h = this.dom.height;
      let p = 1/dpi;

      //XXX remove this.g.translate lines after refactoring drawRoundBox, see comment in ui_base.js
      this.g.translate(p, p);
      let lw = this.g.lineWidth;
      this.g.lineWidth = 2*dpi;
      drawRoundBox(this, this.dom, this.g, w-p*2, h-p*2, this.r, "stroke", this.getDefault("BoxHighlight"));
      this.g.lineWidth = lw;
      this.g.translate(-p, -p);
    }

    if (draw_text) {
      this._draw_text();
    }
  }

  _draw_text() {
    let dpi = this.getDPI();

    if (isMobile()) {
      dpi = dpi; //visualViewport.scale;
    }

    let pad = this.getDefault("BoxMargin") * dpi;
    let ts = this.getDefault("DefaultText").size * dpi;

    let text = this._genLabel();
    let font = this.getDefault("DefaultText");

    //console.log(text, "text", this._name);

    let w = this.dom.width, h = this.dom.height;

    let tw = measureText(this, text, undefined, undefined, ts, font).width;

    let cx = pad*0.5;
    let cy = h*0.5 + ts*0.5;

    let g = this.g;
    drawText(this, ~~cx, ~~cy, text, this.dom, g, undefined, ts, font);
  }

  static define() {return {
    tagname : "button-x",
    style : "button"
  };}
}
UIBase$1.register(Button);

"use strict";

function myToFixed(s, n) {
  s = s.toFixed(n);

  while (s.endsWith('0')) {
    s = s.slice(0, s.length-1);
  }
  if (s.endsWith("\.")) {
    s = s.slice(0, s.length-1);
  }

  return s;
}

let keymap$2 = keymap;

let EnumProperty$4 = EnumProperty$1,
  PropTypes$3 = PropTypes;

let UIBase$2 = UIBase,
  PackFlags$2 = PackFlags,
  IconSheets$2 = IconSheets;

let parsepx$2 = parsepx;

class TextBox extends UIBase$2 {
  constructor() {
    super();

    this._width = "min-content";

    this.addEventListener("focusin", () => {
      this._focus = 1;
      this.dom.focus();
    });

    this.addEventListener("blur", () => {
      this._focus = 0;
    });

    let margin = Math.ceil(3 * this.getDPI());

    this._had_error = false;

    this.decimalPlaces = 4;

    this.baseUnit = undefined; //will automatically use defaults
    this.displayUnit = undefined; //will automatically use defaults

    this.dom = document.createElement("input");

    this.dom.tabIndex = 0;
    this.dom.setAttribute("tabindex", 0);
    this.dom.setAttribute("tab-index", 0);
    this.dom.style["margin"] = margin + "px";

    this.dom.setAttribute("type", "textbox");
    this.dom.onchange = (e) => {
      this._change(this.dom.value);
    };

    this.radix = 16;

    this.dom.oninput = (e) => {
      this._change(this.dom.value);
    };

    this.shadow.appendChild(this.dom);

    this.dom.addEventListener("focus", (e) => {
      console.log("Textbox focus");
      this._startModal();
    });

    this.dom.addEventListener("blur", (e) => {
      console.log("Textbox blur");
      if (this._modal) {
        this._endModal(true);
      }
    });

  }

  _startModal() {
    console.log("textbox modal");

    if (this._modal) {
      this._endModal(true);
    }

    let ignore = 0;

    let finish = (ok) => {
      this._endModal(ok);
    };

    let keydown = (e) => {
      e.stopPropagation();

      switch (e.keyCode) {
        case keymap$2.Enter:
          finish(true);
          break;
        case keymap$2.Escape:
          finish(false);
          break;
      }

      console.log(e.keyCode);
      return;
      if (ignore) return;

      let e2 = new KeyboardEvent(e.type, e);

      ignore = 1;
      this.dom.dispatchEvent(e2);
      ignore = 0;
    };

    this._modal = true;
    this.pushModal({
      on_mousemove : (e) => {
        console.log(e.x, e.y);
        e.stopPropagation();
      },

      on_keydown : keydown,
      on_keypress : keydown,
      on_keyup : keydown,

      on_mousedown : (e) => {
        e.stopPropagation();
        console.log("mouse down", e.x, e.y);
      }
    }, false);
  }

  _endModal(ok) {
    console.log("textbox end modal");

    this._modal = false;
    this.popModal();

    if (this.onend) {
      this.onend(ok);
    }
  }

  get tabIndex() {
    return this.dom.tabIndex;
  }

  set tabIndex(val) {
    this.dom.tabIndex = val;
  }

  init() {
    super.init();

    this.style["display"] = "flex";
    this.style["width"] = this._width;

    this.setCSS();
  }

  set width(val) {
    if (typeof val === "number") {
      val += "px";
    }

    this._width = val;
    this.style["width"] = val;
  }

  setCSS() {
    super.setCSS();

    if (this.style["font"]) {
      this.dom.style["font"] = this.style["font"];
    } else {
      this.dom.style["font"] = this.getDefault("DefaultText").genCSS();
    }

    this.dom.style["width"] = this.style["width"];
    this.dom.style["height"] = this.style["height"];
  }

  updateDataPath() {
    if (!this.ctx || !this.hasAttribute("datapath")) {
      return;
    }
    if (this._focus || this._flashtimer !== undefined || (this._had_error && this._focus)) {
      return;
    }

    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));
    if (val === undefined || val === null) {
      this.disabled = true;
      return;
    } else {
      this.disabled = false;
    }


    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));

    let text = this.text;

    if (prop !== undefined && (prop.type == PropTypes$3.INT || prop.type == PropTypes$3.FLOAT)) {
      let is_int = prop.type == PropTypes$3.INT;

      this.radix = prop.radix;

      if (is_int && this.radix === 2) {
        text = val.toString(this.radix);
        text = "0b" + text;
      } else if (is_int && this.radix === 16) {
        text += "h";
      } else {
        text = buildString(val, this.baseUnit, this.decimalPlaces, this.displayUnit);
      }
    } else if (prop !== undefined && prop.type === PropTypes$3.STRING) {
      text = val;
    }

    if (this.text != text) {
      this.text = text;
    }
  }

  update() {
    super.update();

    if (this.dom.style["width"] !== this.style["width"]) {
      this.dom.style["width"] = this.style["width"];
    }
    if (this.dom.style["height"] !== this.style["height"]) {
      this.dom.style["height"] = this.style["height"];
    }

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }

    this.setCSS();
  }

  select() {
    this.dom.select();
    //return this.dom.select.apply(this, arguments);
  }

  focus() {
    return this.dom.focus();
  }

  blur() {
    return this.dom.blur();
  }

  static define() {return {
    tagname : "textbox-x"
  };}

  get text() {
    return this.dom.value;
  }

  set text(value) {
    this.dom.value = value;
  }

  _prop_update(prop, text) {
    if ((prop.type === PropTypes$3.INT || prop.type === PropTypes$3.FLOAT)) {
      let val = parseValue(this.text, this.baseUnit);

      if (!isNumber(this.text.trim())) {
        this.flash(ErrorColors.ERROR, this.dom);
        this.focus();
        this.dom.focus();
        this._had_error = true;
      } else {
        if (this._had_error) {
          this.flash(ErrorColors.OK, this.dom);
        }

        this._had_error = false;
        this.setPathValue(this.ctx, this.getAttribute("datapath"), val);
      }
    } else if (prop.type == PropTypes$3.STRING) {
      this.setPathValue(this.ctx, this.getAttribute("datapath"), this.text);
    }
  }


  _change(text) {
    //console.log("onchange", this.ctx, this, this.dom.__proto__, this.hasFocus);
    //console.log("onchange", this._focus);

    if (this.hasAttribute("datapath") && this.ctx !== undefined) {
      let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));
      //console.log(prop);
      if (prop) {
        this._prop_update(prop, text);
      }
    }

    if (this.onchange) {
      this.onchange(text);
    }
  }
}

UIBase$2.register(TextBox);

function checkForTextBox(screen, x, y) {
  let elem = screen.pickElement(x, y);
  //console.log(elem, x, y);

  if (elem && elem.tagName === "TEXTBOX-X") {
    return true;
  }

  return false;
}

"use strict";

function myToFixed$1(s, n) {
  s = s.toFixed(n);

  while (s.endsWith('0')) {
    s = s.slice(0, s.length-1);
  }
  if (s.endsWith("\.")) {
    s = s.slice(0, s.length-1);
  }

  return s;
}

let keymap$3 = keymap;

let EnumProperty$5 = EnumProperty$1,
    PropTypes$4 = PropTypes;

let UIBase$3 = UIBase, 
    PackFlags$3 = PackFlags,
    IconSheets$3 = IconSheets;

let parsepx$3 = parsepx;

class ValueButtonBase extends Button {
  constructor() {
    super();
  }
  
  get value() {
    return this._value;
  }
  
  set value(val) {
    this._value = val;
    
    if (this.ctx && this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath"), this._value);
    }
  }
  
  updateDataPath() {
    if (!this.hasAttribute("datapath")) return;
    if (this.ctx === undefined) return;
    
    let val =  this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      this.disabled = true;
      return;
    } else {
      if (this.disabled) {
        this._redraw();
      }

      this.disabled = false;
    }

    if (val !== this._value) {
      this._value = val;
      this.updateWidth();
      this._repos_canvas();
      this._redraw();
      this.setCSS();
    }
  }
  
  update() {
    this.updateDataPath();
    
    super.update();
  }
}

//use .setAttribute("linear") to disable nonlinear sliding
class NumSlider extends ValueButtonBase {
  constructor() {
    super();

    this._last_label = undefined;

    this._name = "";
    this._step = 0.1;
    this._value = 0.0;
    this._expRate = 1.333;
    this.decimalPlaces = 4;
    this.radix = 10;

    this.range = [-1e17, 1e17];
    this.isInt = false;

    this._redraw();
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));
    if (!prop)
      return;

    if (prop.expRate) {
      this._expRate = prop.expRate;
    }
    if (prop.radix !== undefined) {
      this.radix = prop.radix;
    }

    if (prop.step) {
      this._step = prop.step;
    }
    if (prop.decimalPlaces !== undefined) {
      this.decimalPlaces = prop.decimalPlaces;
    }

    if (prop.baseUnit !== undefined) {
      this.baseUnit = prop.baseUnit;
    }

    if (prop.displayUnit !== undefined) {
      this.displayUnit = prop.displayUnit;
    }

    super.updateDataPath();
  }

  swapWithTextbox() {
    let tbox = document.createElement("textbox-x");

    tbox.ctx = this.ctx;
    tbox._init();

    tbox.decimalPlaces = this.decimalPlaces;
    tbox.isInt = this.isInt;

    if (this.isInt && this.radix != 10) {
      let text = this.value.toString(this.radix);
      if (this.radix === 2)
        text = "0b" + text;
      else if (this.radix === 16)
        text += "h";

      tbox.text = text;
    } else {
      tbox.text = buildString(this.value, this.baseUnit, this.decimalPlaces, this.displayUnit);
    }

    this.parentNode.insertBefore(tbox, this);
    //this.remove();
    this.hidden = true;
    //this.dom.hidden = true;
    
    let finish = (ok) => {
      tbox.remove();
      this.hidden = false;
      
      if (ok) {
        let val = tbox.text.trim();

        if (this.isInt && this.radix !== 10) {
          val = parseInt(val);
        } else {
          val = parseValue(val, this.baseUnit);
        }

        if (isNaN(val)) {
          console.log("EEK!");
          this.flash(ErrorColors.ERROR);
        } else {
          this.setValue(val);
          
          if (this.onchange) {
            this.onchange(this);
          }
        }
      }
    };

    tbox.onend = finish;
    tbox.focus();
    tbox.select();

    //this.shadow.appendChild(tbox);
    return;
  }
  
  bindEvents() {
    let onmousedown = (e) => {
      if (this.disabled) {
        e.preventDefault();
        e.stopPropagation();
        
        return;
      }
      
      if (e.button == 0 && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        
        this.swapWithTextbox();
      } else if (e.button == 0) {
        this.dragStart(e);
        
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    this.addEventListener("dblclick", (e) => {
      if (this.disabled) {
        e.preventDefault();
        e.stopPropagation();
        
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      this.swapWithTextbox();
    });
    
    this.addEventListener("mousedown", (e) => {
      if (this.disabled) return;
      onmousedown(e);
    });
    
    this.addEventListener("touchstart", (e) => {
      if (this.disabled) return;
      console.log(e);
      
      e.x = e.touches[0].screenX;
      e.y = e.touches[0].screenY;
      
      this.dragStart(e);
      
      e.preventDefault();
      e.stopPropagation();
    }, {passive : false});
    
    //this.addEventListener("touchstart", (e) => {
    //  console.log(e);
    //});
    
    this.addEventListener("mouseover", (e) => {
      if (this.disabled) return;
      
      this.dom._background = this.getDefault("BoxHighlight");
      this._repos_canvas();
      this._redraw();
      //console.log("mouse enter");
    });
    
    this.addEventListener("mouseout", (e) => {
      if (this.disabled) return;

      this.dom._background = this.getDefault("BoxBG");
      this._repos_canvas();
      this._redraw();
      //console.log("mouse leave!");
    });
  }
  
  doRange() {
    if (this.hasAttribute("min")) {
      this.range[0] = parseFloat(this.getAttribute("min"));
    }
    if (this.hasAttribute("max")) {
      this.range[1] = parseFloat(this.getAttribute("max"));
    }

    this._value = Math.min(Math.max(this._value, this.range[0]), this.range[1]);
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this.setValue(val, true, false);
  }

  setValue(value, fire_onchange=true) {
    this._value = value;

    if (this.hasAttribute("integer")) {
      this.isInt = true;
    }

    if (this.isInt) {
      this._value = Math.floor(this._value);
    }

    this.doRange();

    if (this.ctx && this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath"), this._value);
    }

    if (fire_onchange && this.onchange) {
      this.onchange(this.value);
    }
    
    this._redraw();
  }
  
  dragStart(e) {
    if (this.disabled) return;

    let last_background = this.dom._background;
    let cancel;
    
    let startvalue = this.value;
    let value = startvalue;
    
    let startx = e.x, starty = e.y;
    
    this.dom._background = this.getDefault("BoxDepressed");
    let fire = () => {
      if (this.onchange) {
        this.onchange(this);
      }
    };


    let handlers = {
      on_keydown: (e) => {
        switch (e.keyCode) {
          case 27: //escape key
            cancel(true);
          case 13: //enter key
            cancel(false);
            break;
        }

        e.preventDefault();
        e.stopPropagation();
      },

      on_mousemove: (e) => {
        if (this.disabled) return;

        e.preventDefault();
        e.stopPropagation();

        let dx = e.x - startx;
        startx = e.x;

        if (e.shiftKey) {
          dx *= 0.1;
        }

        value += dx * this._step * 0.1;

        let dvalue = value - startvalue;
        let dsign = Math.sign(dvalue);

        if (!this.hasAttribute("linear")) {
          dvalue = Math.pow(Math.abs(dvalue), this._expRate) * dsign;
        }

        this.value = startvalue + dvalue;
        this.doRange();

        /*
        if (e.shiftKey) {
          dx *= 0.1;
          this.value = startvalue2 + dx*0.1*this._step;
          startvalue3 = this.value;
        } else {
          startvalue2 = this.value;
          this.value = startvalue3 + dx*0.1*this._step;
        }*/

        this.updateWidth();
        this._redraw();
        fire();
      },

      on_mouseup: (e) => {
        cancel(false);
        e.preventDefault();
        e.stopPropagation();
      },

      on_mouseout: (e) => {
        //console.log("leave");
        last_background = this.getDefault("BoxBG");

        e.preventDefault();
        e.stopPropagation();
      },

      on_mouseover: (e) => {
        //console.log("over");
        last_background = this.getDefault("BoxHighlight");

        e.preventDefault();
        e.stopPropagation();
      },

      on_mousedown : (e) => {
        this.popModal();
      },
    };
    
    //events.pushModal(this.getScreen(), handlers);
    this.pushModal(handlers);

    cancel = (restore_value) => {
      if (restore_value) {
        this.value = startvalue;
        this.updateWidth();
        fire();
      }
      
      this.dom._background = last_background; //ui_base.getDefault("BoxBG");
      this._redraw();
      
      console.trace("end");
      
      this.popModal();
    };
    
    /*
    cancel = (restore_value) => {
      if (restore_value) {
        this.value = startvalue;
        this.updateWidth();
        fire();
      }
      
      this.dom._background = last_background; //ui_base.getDefault("BoxBG");
      this._redraw();
      
      console.trace("end");
      
      window.removeEventListener("keydown", keydown, true);
      window.removeEventListener("mousemove", mousemove, {captured : true, passive : false});
      
      window.removeEventListener("touchend", touchend, true);
      window.removeEventListener("touchmove", touchmove, {captured : true, passive : false});
      window.removeEventListener("touchcancel", touchcancel, true);
      window.removeEventListener("mouseup", mouseup, true);
      
      this.removeEventListener("mouseover", mouseover, true);
      this.removeEventListener("mouseout", mouseout, true);
    }
    
    window.addEventListener("keydown", keydown, true);
    window.addEventListener("mousemove", mousemove, true);
    window.addEventListener("touchend", touchend, true);
    window.addEventListener("touchmove", touchmove, {captured : true, passive : false});
    window.addEventListener("touchcancel", touchcancel, true);
    window.addEventListener("mouseup", mouseup, true);

    this.addEventListener("mouseover", mouseover, true);
    this.addEventListener("mouseout", mouseout, true);
    //*/
  }

  setCSS() {
    //do not call parent class implementation
    let dpi = this.getDPI();

    let ts = this.getDefault("DefaultText").size;

    let dd = this.isInt ? 5 : this.decimalPlaces + 8;

    let label = this._name;
    if (this.isInt) {
      label += ": 0";
      for (let i=0; i<this.radix; i++) {
        label += "0";
      }
    } else {
      label += ": 0.";
      for (let i=0; i<this.decimalPlaces+1; i++) {
        label += "0";
      }
    }

    let tw = measureText(this, label, undefined, undefined,
                                 ts, this.getDefault("DefaultText")).width ;

    tw += this._getArrowSize()*2.0 + ts;
    tw = ~~tw;

    let defw = this.getDefault("numslider_width");

    //tw = Math.max(tw, w);

    this.style["width"] = tw+"px";
    this.dom.style["width"] = tw+"px";

    this._repos_canvas();
    this._redraw();
  }

  updateName(force) {
    let name = this.getAttribute("name");

    if (force || name !== this._name) {
      this._name = name;
      this.setCSS();
    }

    let label = this._genLabel();
    if (label !== this._last_label) {
      this._last_label = label;
      this.setCSS();
    }
  }
  
  _genLabel() {
    let val = this.value;
    let text;

    if (val === undefined) {
      text = "error";
    } else {
      val = val === undefined ? 0.0 : val;

      val = buildString(val, this.baseUnit, this.decimalPlaces, this.displayUnit);
      //val = myToFixed(val, this.decimalPlaces);

      text = val;
      if (this._name) {
        text = this._name + ": " + text;
      }
    }

    return text;
  }
  
  _redraw() {
    let g = this.g;
    let canvas = this.dom;

    //console.log("numslider draw");
    
    let dpi = this.getDPI();
    let disabled = this.disabled; //this.hasAttribute("disabled");

    let r = this.getDefault("BoxRadius");
    if (this.isInt) {
      r *= 0.25;
    }

    drawRoundBox(this, this.dom, this.g, undefined, undefined,
      r, undefined, disabled ? this.getDefault("DisabledBG") : undefined);

    r *= dpi;
    let pad = this.getDefault("BoxMargin") * dpi;
    let ts = this.getDefault("DefaultText").size;
    
    //if (this.value !== undefined) {
    let text = this._genLabel();

    let tw = measureText(this, text, this.dom, this.g).width;
    let cx = ts + this._getArrowSize();//this.dom.width/2 - tw/2;
    let cy = this.dom.height/2;
    
    drawText(this, cx, cy + ts/2, text, this.dom, this.g);
    //}
    
    g.fillStyle = "rgba(0,0,0,0.1)";
    
    let d = 7, w=canvas.width, h=canvas.height;
    let sz = this._getArrowSize();
    
    g.beginPath();
    g.moveTo(d, h*0.5);
    g.lineTo(d+sz, h*0.5 + sz*0.5);
    g.lineTo(d+sz, h*0.5 - sz*0.5);
    
    g.moveTo(w-d, h*0.5);
    g.lineTo(w-sz-d, h*0.5 + sz*0.5);
    g.lineTo(w-sz-d, h*0.5 - sz*0.5);
    
    g.fill();
  }

  _getArrowSize() {
    return UIBase$3.getDPI()*10;
  }
  static define() {return {
    tagname : "numslider-x",
    style : "numslider"
  };}
}
UIBase$3.register(NumSlider);

class Check extends UIBase$3 {
  constructor() {
    super();
    
    this._checked = false;
    this._highlight = false;
    this._focus = false;

    let shadow = this.shadow;
    
    //let form = document.createElement("form");
    
    let span = document.createElement("span");
    span.setAttribute("class", "checkx");

    span.style["display"] = "flex";
    span.style["flex-direction"] = "row";
    span.style["margin"] = span.style["padding"] = "0px";
    //span.style["background"] = ui_base.iconmanager.getCSS(1);

    let sheet = 0;
    let size = iconmanager.getTileSize(0);

    let check = this.canvas = document.createElement("canvas");
    this.g = check.getContext("2d");

    check.setAttribute("id", check._id);
    check.setAttribute("name", check._id);

    /*
    let doblur = () => {
      this.blur();
    };
    check.addEventListener("mousedown", doblur);
    check.addEventListener("mouseup", doblur);
    check.addEventListener("touchstart", doblur);
    check.addEventListener("touchend", doblur);
    //*/

    let mdown = (e) => {
      this._highlight = false;
      this.checked = !this.checked;
    };

    let mup = (e) => {
      this._highlight = false;
      this.blur();
      this._redraw();
    };

    let mover = (e) => {
      this._highlight = true;
      this._redraw();
    };

    let mleave = (e) => {
      this._highlight = false;
      this._redraw();
    };

    span.addEventListener("mouseover", mover);
    span.addEventListener("mousein", mover);
    span.addEventListener("mouseleave", mleave);
    span.addEventListener("mouseout", mleave);
    this.addEventListener("blur", (e) => {
      this._highlight = this._focus = false;
      this._redraw();
    });
    this.addEventListener("focusin", (e) => {
      this._focus = true;
      this._redraw();
    });
    this.addEventListener("focus", (e) => {
      this._focus = true;
      this._redraw();
    });


    span.addEventListener("mousedown", mdown);
    span.addEventListener("touchstart", mdown);
    span.addEventListener("mouseup", mup);
    span.addEventListener("touchend", mup);

    this.addEventListener("keydown", (e) => {
      switch (e.keyCode) {
        case keymap$3["Escape"]:
          this._highlight = undefined;
          this._redraw();
          e.preventDefault();
          e.stopPropagation();

          this.blur();
          break;
        case keymap$3["Enter"]:
        case keymap$3["Space"]:
          this.checked = !this.checked;
          e.preventDefault();
          e.stopPropagation();
          break;
      }
    });
    this.checkbox = check;

    span.appendChild(check);

    let label = this._label = document.createElement("label");
    label.setAttribute("class", "checkx");
    span.setAttribute("class", "checkx");

    let side = this.getDefault("CheckSide");
    if (side === "right") {
      span.prepend(label);
    } else {
      span.appendChild(label);
    }

    shadow.appendChild(span);
  }

  init() {
    this.tabIndex = 1;
    this.setAttribute("class", "checkx");


    let style = document.createElement("style");
    //let style = this.cssStyleTag();

    let color = this.getDefault("FocusOutline");

    style.textContent = `
      .checkx:focus {
        outline : none;
      }
    `;

    //document.body.prepend(style);
    this.prepend(style);
  }

  get disabled() {
    return super.disabled;
  }

  set disabled(val) {
    super.disabled = val;
    this._redraw();
  }

  get value() {
    return this.checked;
  }

  set value(v) {
    this.checked = v;
  }

  setCSS() {
    this._label.style["font"] = this.getDefault("DefaultText").genCSS();
    this._label.style["color"] = this.getDefault("DefaultText").color;

    super.setCSS();
  }

  updateDataPath() {
    if (!this.getAttribute("datapath")) {
      return;
    }

    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      this.disabled = true;
      return;
    } else {
      this.disabled = false;
    }

    val = !!val;

    if (!!this._checked != !!val) {
      this._checked = val;
      this._redraw();
    }
  }

  _repos_canvas() {
    if (this.canvas === undefined)
      return;

    let r = this.canvas.getClientRects()[0];

    if (r === undefined) {
      return;
    }

  }

  _redraw() {
    if (this.canvas === undefined)
      return;

    let canvas = this.canvas, g = this.g;
    let dpi = UIBase$3.getDPI();
    let tilesize = iconmanager.getTileSize(0);
    let pad = this.getDefault("BoxMargin");

    let csize = tilesize + pad*2;

    canvas.style["margin"] = "2px";
    canvas.style["width"] = csize + "px";
    canvas.style["height"] = csize + "px";

    csize = ~~(csize*dpi + 0.5);
    tilesize = ~~(tilesize*dpi + 0.5);

    canvas.width = csize;
    canvas.height = csize;

    g.clearRect(0, 0, canvas.width, canvas.height);

    g.beginPath();
    g.rect(0, 0, canvas.width, canvas.height);
    g.fill();

    let color;

    if (!this._checked && this._highlight) {
      color = this.getDefault("BoxHighlight");
    }

    drawRoundBox(this, canvas, g, undefined, undefined, undefined, undefined, color);
    if (this._checked) {
      //canvasDraw(elem, canvas, g, icon, x=0, y=0, sheet=0) {
      let x=(csize-tilesize)*0.5, y=(csize-tilesize)*0.5;
      iconmanager.canvasDraw(this, canvas, g, Icons.LARGE_CHECK, x, y);
    }

    if (this._focus) {
      color = this.getDefault("FocusOutline");
      g.lineWidth *= dpi;
      drawRoundBox(this, canvas, g, undefined, undefined, undefined, "stroke", color);
    }
  }

  set checked(v) {
    if (!!this._checked != !!v) {
      this._checked = v;
      //this.dom.checked = v;
      this._redraw();

      if (this.onclick) {
        this.onclick(v);
      }
      if (this.onchange) {
        this.onchange(v);
      }

      if (this.hasAttribute("datapath")) {
        this.setPathValue(this.ctx, this.getAttribute("datapath"), this._checked);
      }
    }
  }
  
  get checked() {
    return this._checked;
  }

  updateDPI() {
    let dpi = UIBase$3.getDPI();

    if (dpi !== this._last_dpi) {
      this._last_dpi = dpi;
      this._redraw();
    }
  }

  update() {
    super.update();

    this.title = this.description;
    this.updateDPI();

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }

    let updatekey = this.getDefault("DefaultText").hash();

    if (updatekey !== this._updatekey) {
      this._updatekey = updatekey;
      this.setCSS();
    }
  }
  
  get label() {
    return this._label.textContent;
  }
  
  set label(l) {
    this._label.textContent = l;
  }
  
  static define() {return {
    tagname : "check-x",
    style   : "checkbox"
  };}
}
UIBase$3.register(Check);

class IconCheck extends Button {
  constructor() {
    super();

    this._checked = undefined;

    this._drawCheck = true;
    this._icon = -1;
    this._icon_pressed = undefined;
    this.iconsheet = IconSheets.LARGE;
  }

  updateDefaultSize() {

  }

  _calcUpdateKey() {
    return super._calcUpdateKey() + ":" + this._icon;
  }

  get drawCheck() {
    return this._drawCheck;
  }

  set drawCheck(val) {
    this._drawCheck = val;
    this._redraw();
  }

  get icon() {
    return this._icon;
  }
  
  set icon(val) {
    this._icon = val;
    this._repos_canvas();
    this._redraw();
  }
  
  get checked() {
    return this._checked;
  }
  
  set checked(val) {
    if (!!val != !!this._checked) {
      this._checked = val;
      this._redraw();

      if (this.onchange) {
        this.onchange(val);
      }
    }
  }
  
  updateDataPath() {
    if (!this.hasAttribute("datapath") || !this.ctx) {
      return;
    }

    if (this._icon < 0) {
      let rdef;
      try {
        rdef = this.ctx.api.resolvePath(this.ctx, this.getAttribute("datapath"));
      } catch(error) {
        if (error instanceof DataPathError) {
          return;
        } else {
          throw error;
        }
      }
      
      if (rdef !== undefined && rdef.prop) {
        let icon, title;

        //console.log("SUBKEY", rdef.subkey, rdef.prop.iconmap);

        if (rdef.subkey && (rdef.prop.type == PropTypes$4.FLAG || rdef.prop.type == PropTypes$4.ENUM)) {
          icon = rdef.prop.iconmap[rdef.subkey];
          title = rdef.prop.descriptions[rdef.subkey];

          if (title === undefined && rdef.subkey.length > 0) {
            title = rdef.subkey;
            title = title[0].toUpperCase() + title.slice(1, title.length).toLowerCase();
          }
        } else {
          icon = rdef.prop.icon;
          title = rdef.prop.description;
        }

        if (icon !== undefined && icon !== this.icon)
          this.icon = icon;
        if (title !== undefined)
          this.description = title;
      }
    }

    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      this.disabled = true;
      return;
    } else {
      this.disabled = false;
    }

    val = !!val;

    if (val != !!this._checked) {
      this._checked = val;
      this._redraw();
    }
  }
  
  update() {
    if (this.description !== undefined && this.title != this.description) {
      this.title = this.description;
    }
    
    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }
    
    super.update();
  }

  _getsize() {
      let margin = this.getDefault("BoxMargin");
      return iconmanager.getTileSize(this.iconsheet) + margin*2;
  }
  
  _repos_canvas() {
    this.dom.style["width"] = this._getsize() + "px";
    this.dom.style["height"] = this._getsize() + "px";

    if (this._div !== undefined) {
      this._div.style["width"] = this._getsize() + "px";
      this._div.style["height"] = this._getsize() + "px";
    }

    super._repos_canvas();
  }

  set icon(f) {
    this._icon = f;
    this._redraw();
  }
  
  get icon() {
    return this._icon;
  }
  
  _onpress() {
    this.checked ^= 1;
    
    if (this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath"), this.checked);
    }

    console.log("click!", this.checked);
    this._redraw();
  }
  
  _redraw() {
    this._repos_canvas();
    
    //this.dom._background = this._checked ? this.getDefault("BoxDepressed") : this.getDefault("BoxBG");
    if (this._checked) {
      this._highlight = false;
    }

    //
    let pressed = this._pressed;
    this._pressed = this._checked;
    super._redraw(false);
    this._pressed = pressed;

    let icon = this._icon;
    
    if (this._checked && this._icon_pressed !== undefined) {
      icon = this._icon_pressed;
    }

    let tsize = iconmanager.getTileSize(this.iconsheet);
    let size = this._getsize();
    let off = size > tsize ? (size - tsize)*0.5 : 0.0;

    this.g.save();
    this.g.translate(off, off);
    iconmanager.canvasDraw(this, this.dom, this.g, icon, undefined, undefined, this.iconsheet);

    if (this.drawCheck) {
      let icon2 = this._checked ? Icons.CHECKED : Icons.UNCHECKED;
      iconmanager.canvasDraw(this, this.dom, this.g, icon2, undefined, undefined, this.iconsheet);
    }

    this.g.restore();
  }
  
  static define() {return {
    tagname : "iconcheck-x",
    style   : "iconcheck"
  };}
}

UIBase$3.register(IconCheck);

class IconButton extends Button {
  constructor() {
    super();

    this._icon = 0;
    this._icon_pressed = undefined;
    this.iconsheet = Icons.LARGE;
  }

  updateDefaultSize() {

  }

  _calcUpdateKey() {
    return super._calcUpdateKey() + ":" + this._icon;
  }

  get icon() {
    return this._icon;
  }
  
  set icon(val) {
    this._icon = val;
    this._repos_canvas();
    this._redraw();
  }
  
  update() {
    if (this.description !== undefined && this.title != this.description) {
      this.title = this.description;
    }

    super.update();
  }

  _getsize() {
    let margin = this.getDefault("BoxMargin");

    return iconmanager.getTileSize(this.iconsheet) + margin*2;
  }
  
  _repos_canvas() {
    this.dom.style["height"] = this._getsize() + "px";
    this.dom.style["width"] = this._getsize() + "px";

    super._repos_canvas();
  }
  
  _redraw() {
    this._repos_canvas();
    
    //this.dom._background = this._checked ? this.getDefault("BoxDepressed") : this.getDefault("BoxBG");
    //
    super._redraw(false);

    let icon = this._icon;
    
    if (this._checked && this._icon_pressed !== undefined) {
      icon = this._icon_pressed;
    }

    let tsize = iconmanager.getTileSize(this.iconsheet);
    let size = this._getsize();

    let dpi = UIBase$3.getDPI();
    let off = size > tsize ? (size - tsize)*0.5*dpi : 0.0;

    this.g.save();
    this.g.translate(off, off);
    iconmanager.canvasDraw(this, this.dom, this.g, icon, undefined, undefined, this.iconsheet);
    this.g.restore();
  }
  
  static define() {return {
    tagname : "iconbutton-x",
    style : "iconbutton",
  };}
}

UIBase$3.register(IconButton);

class Check1 extends Button {
  constructor() {
    super();
    
    this._namePad = 40;
    this._value = undefined;
  }
  
  _redraw() {
    //console.log("button draw");
    
    let dpi = this.getDPI();
    
    let box = 40;
    drawRoundBox(this, this.dom, this.g, box);

    let r = this.getDefault("BoxRadius") * dpi;
    let pad = this.getDefault("BoxMargin") * dpi;
    let ts = this.getDefault("DefaultText").size;
    
    let text = this._genLabel();
    
    //console.log(text, "text", this._name);
    
    let tw = measureText(this, text, this.dom, this.g).width;
    let cx = this.dom.width/2 - tw/2;
    let cy = this.dom.height/2;
    
    drawText(this, box, cy + ts/2, text, this.dom, this.g);
  }

  static define() {return {
    tagname : "check1-x"
  };}
}

UIBase$3.register(Check1);

function saveFile(data, filename="unnamed", exts=[], mime="application/x-octet-stream") {
  let blob = new Blob([data], {type : mime});
  let url = URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", filename);

  a.click();
}

//returns a promise
function loadFile(filename="unnamed", exts=[]) {
  let input = document.createElement("input");
  input.type = "file";

  exts = exts.join(",");

  input.setAttribute("accept", exts);
  return new Promise((accept, reject) => {
    input.onchange = function(e) {
      if (this.files === undefined || this.files.length !== 1) {
        reject("file load error");
        return;
      }

      let file = this.files[0];
      let reader = new FileReader();

      reader.onload = function(e2) {
        accept(e2.target.result);
      };

      reader.readAsArrayBuffer(file);
    };
    input.click();
  });
}

window._testLoadFile = function(exts=["*.*"]) {
  loadFile(undefined, exts).then((data) => {
    console.log("got file data:", data);
  });
};

window._testSaveFile = function() {
  let buf = _appstate.createFile();
  //console.log(buf);
  saveFile(buf, "unnamed.w3d", [".w3d"]);
};

var html5_fileapi1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  saveFile: saveFile,
  loadFile: loadFile
});

//bind module to global var to get at it in console.
//
//note that require has an api for handling circular 
//module refs, in such cases do not use these vars.

var _ui = undefined;

let PropFlags$2 = PropFlags;
let PropSubTypes$2 = PropSubTypes$1;

let EnumProperty$6 = EnumProperty$1;

let Vector2$4 = undefined,
  UIBase$4 = UIBase,
  PackFlags$4 = PackFlags,
  PropTypes$5 = PropTypes;

const SimpleContext$1 = SimpleContext;
const DataPathError$1 = DataPathError;

var list$2 = function list(iter) {
  let ret = [];

  for (let item of iter) {
    ret.push(item);
  }

  return ret;
};

class Label extends UIBase {
  constructor() {
    super();

    this._label = "";

    this.dom = document.createElement("div");
    this.dom.setAttribute("class", "_labelx");

    let style = document.createElement("style");
    style.textContent = `
      div._labelx::selection {
        color: none;
        background: none;
      }
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.dom);

    this.font = "LabelText";
  }

  init() {
    this.dom.style["width"] = "max-content";
  }

  get font() {
    return this._font;
  }

  /**Set a font defined in ui_base.defaults
   e.g. DefaultText*/
  set font(fontDefaultName) {
    if (typeof fontDefaultName === "string") {
      this._font = this.getDefault(fontDefaultName);
      if (!this._font) {
        console.warn("Invalid font", fontDefaultName);
      }
    } else if (typeof fontDefaultName === "object" && fontDefaultName instanceof CSSFont) {
      this._font = fontDefaultName;
    } else {
      console.warn("Invalid font", fontDefaultName);
    }

    this._updateFont();
  }

  _updateFont() {
    let font = this._font;
    if (!font) return;

    this.dom.style["font"] = font.genCSS();
    this.dom.style["color"] = font.color;
  }

  updateDataPath() {
    if (this.ctx === undefined) {
      return;
    }

    let path = this.getAttribute("datapath");
    let prop = this.getPathMeta(this.ctx, path);
    let val = this.getPathValue(this.ctx, path);

    if (val === undefined) {
      return;
    }
    //console.log(path);
    if (prop !== undefined && prop.type == PropTypes$5.INT) {
      val = val.toString(prop.radix);

      if (prop.radix == 2) {
        val = "0b" + val;
      } else if (prop.radix == 16) {
        val += "h";
      }
    } else if (prop !== undefined && prop.type == PropTypes$5.FLOAT && val !== Math.floor(val)) {
      val = val.toFixed(prop.decimalPlaces);
    }

    val = "" + val;

    this.dom.innerText = this._label + val;
  }

  update() {
    this.dom.style["pointer-events"] = this.style["pointer-events"];

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }
  }

  get text() {
    return this._label;
    //return this.dom.innerText;
  }

  set text(text) {
    this._label = text;

    if (!this.hasAttribute("datapath")) {
      this.dom.innerText = text;
    }
  }

  static define() {
    return {
      tagname: "label-x"
    };
  }
}

UIBase.register(Label);

class Container extends UIBase {
  constructor() {
    super();

    this.dataPrefix = '';
    this.inherit_packflag = 0;

    let style = this.styletag = document.createElement("style");
    style.textContent = `
    `;

    this.shadow.appendChild(style);
  }

  init() {
    this.style["display"] = "flex";
    this.style["flex-direction"] = "column";
    this.style["flex-wrap"] = "nowrap";

    this.setCSS();

    super.init();

    this.setAttribute("class", "containerx");
  }

  useIcons(enabled=true) {
    if (enabled) {
      this.packflag |= PackFlags$4.USE_ICONS;
      this.inherit_packflag |= PackFlags$4.USE_ICONS;
    } else {
      this.packflag &= ~PackFlags$4.USE_ICONS;
      this.inherit_packflag &= ~PackFlags$4.USE_ICONS;
    }
  }

  /**
   *
   * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
   * @returns {Container}
   */
  wrap(mode="wrap") {
    this.style["flex-wrap"] = mode;
    return this;
  }

  noMarginsOrPadding() {
    super.noMarginsOrPadding();

    let keys = ["margin", "padding", "margin-block-start", "margin-block-end"];
    keys = keys.concat(["padding-block-start", "padding-block-end"]);

    for (let k of keys) {
      this.style[k] = "0px";
    }

    return this;
  }

  setCSS() {
    this.styletag.textContent = `div.containerx {
        background-color : ${this.getDefault("DefaultPanelBG")};
      }
      `;
  }

  overrideDefault(key, val) {
    super.overrideDefault(key, val);
    this.setCSS();

    return this;
  }

  /*
  * shorthand for:
  *
  * .row().noMarginsOrPadding().oneAxisPadding()
  * */
  strip(m = this.getDefault("oneAxisPadding"), m2 = 0) {
    let horiz = this instanceof RowFrame;
    horiz = horiz || this.style["flex-direction"] === "row";

    let flag = horiz ? PackFlags$4.STRIP_HORIZ : PackFlags$4.STRIP_VERT;

    let strip = (horiz ? this.row() : this.col()).oneAxisPadding(m, m2);
    strip.packflag |= flag;

    let prev = strip.previousElementSibling;
    if (prev !== undefined && (prev.packflag & flag)) {
      if (horiz) {
        prev.style["padding-right"] = "0px";
      } else {
        prev.style["padding-top"] = "0px";
      }
    }

    return strip;
  }

  /**
   * tries to set margin along one axis only in smart manner
   * */
  oneAxisMargin(m = this.getDefault("oneAxisMargin"), m2 = 0) {
    this.style["margin-top"] = this.style["margin-bottom"] = "" + m + "px";
    this.style["margin-left"] = this.style["margin-right"] = "" + m2 + "px";

    return this;
  }

  /**
   * tries to set padding along one axis only in smart manner
   * */
  oneAxisPadding(m = this.getDefault("oneAxisPadding"), m2 = 0) {
    this.style["padding-top"] = this.style["padding-bottom"] = "" + m + "px";
    this.style["padding-left"] = this.style["padding-right"] = "" + m2 + "px";

    return this;
  }

  setMargin(m) {
    this.style["margin"] = m + "px";

    return this;
  }

  setPadding(m) {
    this.style["padding"] = m + "px";

    return this;
  }

  setSize(width, height) {
    if (width !== undefined) {
      if (typeof width == "number")
        this.style["width"] = this.div.style["width"] = ~~width + "px";
      else
        this.style["width"] = this.div.style["width"] = width;
    }

    if (height !== undefined) {
      if (typeof height == "number")
        this.style["height"] = this.div.style["height"] = ~~height + "px";
      else
        this.style["height"] = this.div.style["height"] = height;
    }

    return this;
  }

  set background(bg) {
    this.__background = bg;

    this.styletag.textContent = `div.containerx {
        background-color : ${bg};
      }
    `;
    this.style["background-color"] = bg;
  }

  static define() {
    return {
      tagname: "container-x"
    };
  }

  save() {
  }

  load() {
  }

  saveVisibility() {
    localStorage[this.storagePrefix + "_settings"] = JSON.stringify(this);
    return this;
  }

  loadVisibility() {
    let key = this.storagePrefix + "_settings";
    let ok = true;

    if (key in localStorage) {
      console.log("loading UI visibility state. . .");

      try {
        this.loadJSON(JSON.parse(localStorage[key]));
      } catch (error) {
        print_stack$1(error);
        ok = false;
      }
    }

    return ok;
  }

  toJSON() {
    let ret = {
      opened: !this.closed
    };

    return Object.assign(super.toJSON(), ret);
  }

  _ondestroy() {
    this._forEachChildWidget((n) => {
      n._ondestroy();
    });

    super._ondestroy();
  }

  loadJSON(obj) {
    //console.error("ui.js:Container.loadJSON: implement me!");

    return this;
  }

  redrawCurves() {
    throw new Error("Implement me (properly!)");

    if (this.closed)
      return;

    for (let cw of this.curve_widgets) {
      cw.draw();
    }
  }

  listen() {
    window.setInterval(() => {
      this.update();
    }, 150);
  }

  get children() {
    let list = [];

    this._forEachChildWidget((n) => {
      list.push(n);
    });

    return list
  }

  update() {
    super.update();
    //this._forEachChildWidget((n) => {
    //  n.update();
    //});
  }

  //on_destroy() {
  //  super.on_destroy();
  //this.dat.destroy();
  //}

  appendChild(child) {
    if (child instanceof UIBase) {
      child.ctx = this.ctx;
      child.parentWidget = this;
    }

    let ret = super.appendChild(child);

    if (child instanceof UIBase && child.onadd) {
      child.onadd();
    }

    return ret;
  }

  clear(trigger_on_destroy=true) {
    for (let child of this.children) {
      if (child instanceof UIBase) {
        child.remove(trigger_on_destroy);
      }
    }
  }

  removeChild(child, trigger_on_destroy=true) {
    let ret = super.removeChild(child);

    if (child.on_remove) {
      child.on_remove();
    }

    if (trigger_on_destroy && child.on_destroy) {
      child.on_destroy();
    }

    child.parentWidget = undefined;

    return ret;
  }

  //*
  _prepend(child) {
    return this._add(child, true);
  }//*/

  add(child) {
    return this._add(child);
  }

  _add(child, prepend = false) {
    //paranoia check for if we accidentally got a DOM NodeList
    if (child instanceof NodeList) {
      throw new Error("eek!");
    }

    child.ctx = this.ctx;
    child.parentWidget = this;

    this.shadow.appendChild(child);

    /*
    if (child._ctx) {
      child._init();
    }//*/

    if (child.onadd)
      child.onadd();

    return child;
  }

  /*
  .menu([
    "some_tool_path.tool",
    ui_widgets.Menu.SEP,
    "some_tool_path.another_tool",
    ["Name", () => {console.log("do something")}]
  ])
  */
  menu(title, list, packflag = 0) {
    let dbox = document.createElement("dropbox-x");

    dbox._name = title;
    dbox.setAttribute("simple", true);
    dbox.setAttribute("name", title);

    dbox._build_menu = () => {
      if (this._menu !== undefined && this._menu.parentNode !== undefined) {
        this._menu.remove();
      }

      let menu = dbox._menu = document.createElement("menu-x");
      //menu.setAttribute("name", title);

      let SEP = menu.constructor.SEP;
      let id = 0;
      let cbs = {};

      for (let item of list) {
        if (typeof item == "string") {
          let def;
          try {
            def = this.ctx.api.getToolDef(item);
          } catch (error) {
            menu.addItem("(tool path error)", id++);
            continue;
          }
          //addItemExtra(text, id=undefined, hotkey, icon=-1, add=true) {
          menu.addItemExtra(def.uiname, id, def.hotkey, def.icon);
          let this2 = this;

          cbs[id] = (function (toolpath) {
            return function () {
              this2.ctx.api.execTool(this2.ctx, toolpath);
            }
          })(item);

          id++;
        } else if (item === SEP) {
          menu.seperator();
        } else if (item instanceof Array) {
          let hotkey = item.length > 2 ? item[2] : undefined;
          let icon = item.length > 3 ? item[3] : undefined;

          menu.addItemExtra(item[0], id, hotkey, icon);

          cbs[id] = (function (cbfunc, arg) {
            return function () {
              cbfunc(arg);
            }
          })(item[1], item[2]);

          id++;
        }
      }

      menu.onselect = (id) => {
        cbs[id]();
      };
    };

    dbox.packflag |= packflag;
    dbox.inherit_packflag |= packflag;

    this._add(dbox);
    return dbox;
  }

  tool(path_or_cls, packflag = 0, create_cb = undefined) {
    let cls;

    if (typeof path_or_cls == "string") {
      if (this.ctx === undefined) {
        console.warn("this.ctx was undefined in tool()");
        return;
      }

      cls = this.ctx.api.parseToolPath(path_or_cls);

      if (cls === undefined) {
        console.warn("Unknown tool for toolpath \"" + path_or_cls + "\"");
        return;
      }
    } else {
      cls = path_or_cls;
    }

    packflag |= this.inherit_packflag;
    let hotkey;

    if (create_cb === undefined) {
      create_cb = (cls) => {
        return this.ctx.api.createTool(this.ctx, path_or_cls);
      };
    }

    let cb = () => {
      console.log("tool run");

      let toolob = create_cb(cls);
      this.ctx.api.execTool(this.ctx, toolob);
    };

    let def = cls.tooldef();
    let tooltip = def.description === undefined ? def.uiname : def.description;

    //is there a hotkey hardcoded in the class?
    if (def.hotkey !== undefined) {
      tooltip += "\n\t" + def.hotkey;
      hotkey = def.hotkey;
    } else { //if not, use getToolPathHotkey api
      let path = path_or_cls;

      if (typeof path != "string") {
        path = def.toolpath;
      }

      let hotkey = this.ctx.api.getToolPathHotkey(this.ctx, path);
      if (hotkey !== undefined) {
        tooltip += "\n\tHotkey: " + hotkey;
      }
    }

    let ret;

    if (def.icon !== undefined && (packflag & PackFlags$4.USE_ICONS)) {
      //console.log("iconbutton!");
      ret = this.iconbutton(def.icon, tooltip, cb);

      if (packflag & PackFlags$4.SMALL_ICON) {
        ret.iconsheet = IconSheets.SMALL;
      } else {
        ret.iconsheet = IconSheets.LARGE;
      }

      ret.packflag |= packflag;
    } else {
      ret = this.button(def.uiname, cb);
      ret.description = tooltip;
      ret.packflag |= packflag;
    }

    return ret;
  }

  //supports number types
  textbox(inpath, text="", cb=undefined, packflag = 0) {
    let path;

    if (inpath)
      path = this._joinPrefix(inpath);

    packflag |= this.inherit_packflag;

    let ret = document.createElement("textbox-x");

    if (path !== undefined) {
      ret.setAttribute("datapath", path);
    }

    ret.ctx = this.ctx;
    ret.parentWidget = this;
    ret._init();
    ret.setCSS();
    ret.update();

    ret.packflag |= packflag;
    ret.onchange = cb;
    ret.text = text;

    this._add(ret);
    return ret;
  }

  pathlabel(inpath, label = "") {
    let path;
    if (inpath)
      path = this._joinPrefix(inpath);

    let ret = document.createElement("label-x");

    ret.text = label;
    ret.setAttribute("datapath", path);

    this._add(ret);

    return ret;
  }

  label(text) {
    let ret = document.createElement("label-x");
    ret.text = text;

    this._add(ret);

    return ret;
  }

  /**
   *
   * makes a button for a help picker tool
   * to view tooltips on mobile devices
   * */
  helppicker() {
    let ret = this.iconbutton(Icons.HELP, "Help Picker", () => {
      this.getScreen().hintPickerTool();
    });

    if (isMobile()) {
      ret.iconsheet = 2;
    }

    if (ret.ctx) {
      ret._init();
      ret.setCSS();
    }

    return ret;
  }

  iconbutton(icon, description, cb, thisvar, packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("iconbutton-x");

    ret.packflag |= packflag;

    ret.setAttribute("icon", icon);
    ret.description = description;
    ret.icon = icon;

    if (packflag & PackFlags$4.SMALL_ICON) {
      ret.iconsheet = IconSheets.SMALL;
    } else {
      ret.iconsheet = IconSheets.LARGE;
    }

    ret.onclick = cb;

    this._add(ret);

    return ret;
  }

  button(label, cb, thisvar, id, packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("button-x");

    ret.packflag |= packflag;

    ret.setAttribute("name", label);
    ret.setAttribute("buttonid", id);
    ret.onclick = cb;

    this._add(ret);

    return ret;
  }

  _joinPrefix(path) {
    let prefix = this.dataPrefix.trim();

    return prefix + path;
  }

  colorbutton(inpath, packflag, mass_set_path = undefined) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("color-picker-button-x");

    if (inpath !== undefined) {
      ret.setAttribute("datapath", inpath);
    }

    if (mass_set_path !== undefined) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    ret.packflag |= packflag;

    this._add(ret);
    return ret;
  }

  noteframe(packflag = 0) {
    let ret = document.createElement("noteframe-x");

    ret.packflag |= this.inherit_packflag | packflag;

    this._add(ret);
    return ret;
  }

  curve1d(inpath, packflag=0, mass_set_path=undefined) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("curve-widget-x");

    ret.ctx = this.ctx;
    ret.packflag |= packflag;

    if (inpath)
      ret.setAttribute("datapath", inpath);
    if (mass_set_path)
      ret.setAttribute("mass_set_path", mass_set_path);

    this.add(ret);

    return ret;
  }

  prop(inpath, packflag = 0, mass_set_path = undefined) {
    packflag |= this.inherit_packflag;

    let path = this._joinPrefix(inpath);

    let rdef = this.ctx.api.resolvePath(this.ctx, path, true);

    if (rdef === undefined || rdef.prop === undefined) {
      console.warn("Unknown property at path", path, this.ctx.api.resolvePath(this.ctx, path, true));
      return;
    }
    //slider(path, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag=0) {
    let prop = rdef.prop;

    //console.log(prop, PropTypes, PropSubTypes);

    function makeUIName(name) {
      name = name[0].toUpperCase() + name.slice(1, name.length).toLowerCase();
      name = name.replace(/_/g, " ");
      return name;
    }

    if (prop.type == PropTypes$5.CURVE) {
      return this.curve1d(path, packflag, mass_set_path);
    } else if (prop.type == PropTypes$5.INT || prop.type == PropTypes$5.FLOAT) {
      let ret;
      if (packflag & PackFlags$4.SIMPLE_NUMSLIDERS) {
        ret = this.simpleslider(inpath);
      } else {
        ret = this.slider(inpath);
      }

      ret.packflag |= packflag;

      if (mass_set_path) {
        ret.setAttribute("mass_set_path", mass_set_path);
      }

      return ret;
    } else if (prop.type == PropTypes$5.BOOL) {
      this.check(inpath, prop.uiname, packflag, mass_set_path);
    } else if (prop.type == PropTypes$5.ENUM) {
      if (rdef.subkey !== undefined) {
        let subkey = rdef.subkey;
        let name = rdef.prop.ui_value_names[rdef.subkey];

        if (name === undefined) {
          name = makeUIName(rdef.subkey);
        }

        let check = this.check(inpath, rdef.prop.ui_value_names[subkey], packflag, mass_set_path);
        let tooltip = rdef.prop.descriptions[subkey];

        check.description = tooltip === undefined ? rdef.prop.ui_value_names[subkey] : tooltip;
        check.icon = rdef.prop.iconmap[rdef.subkey];

        return check;
      }
      if (!(packflag & PackFlags$4.USE_ICONS)) {
        let val;
        try {
          val = this.ctx.api.getValue(this.ctx, path);
        } catch (error) {
          if (!(error instanceof DataPathError$1)) {
            throw error;
          }
        }

        this.listenum(inpath, undefined, undefined, val, undefined, undefined, packflag);
      } else {
        this.checkenum(inpath, undefined, packflag);
      }
    } else if (prop.type & (PropTypes$5.VEC2|PropTypes$5.VEC3|PropTypes$5.VEC4)) {
      if (rdef.subkey !== undefined) {
        let ret = (packflag & PackFlags$4.SIMPLE_NUMSLIDERS) ? this.simpleslider(path) : this.slider(path);
        ret.packflag |= packflag;
        return ret;
      } else if (prop.subtype === PropSubTypes$2.COLOR) {
        return this.colorbutton(inpath, packflag, mass_set_path);
        //return this.colorPicker(inpath, packflag, mass_set_path);
      } else {
        let ret = document.createElement("vector-panel-x");

        if (inpath) {
          ret.setAttribute("datapath", inpath);
        }

        if (mass_set_path) {
          ret.setAttribute("mass_set_path", mass_set_path);
        }

        this.add(ret);

        return ret;
      }
    } else if (prop.type == PropTypes$5.FLAG) {
      if (rdef.subkey !== undefined) {
        let tooltip = rdef.prop.descriptions[rdef.subkey];
        let name = rdef.prop.ui_value_names[rdef.subkey];

        if (name === undefined) {
          name = makeUIName(rdef.subkey);
        }

        let ret = this.check(inpath, name, packflag, mass_set_path);

        ret.icon = rdef.prop.iconmap[rdef.subkey];

        if (tooltip) {
          ret.description = tooltip;
        }
      } else {
        for (let k in prop.values) {
          let name = prop.ui_value_names[k];
          let tooltip = prop.descriptions[k];

          if (name === undefined) {
            name = makeUIName(k);
          }

          let ret = this.check(`${inpath}[${k}]`, name, packflag, mass_set_path);

          if (tooltip) {
            ret.description = tooltip;
          }
        }
      }
    }
  }

  check(inpath, name, packflag = 0, mass_set_path = undefined) {
    packflag |= this.inherit_packflag;

    let path = this._joinPrefix(inpath);

    //let prop = this.ctx.getProp(path);
    let ret;
    if (packflag & PackFlags$4.USE_ICONS) {
      ret = document.createElement("iconcheck-x");

      if (packflag & PackFlags$4.SMALL_ICON) {
        ret.iconsheet = IconSheets.SMALL;
      }
    } else {
      ret = document.createElement("check-x");
    }

    ret.packflag |= packflag;
    ret.label = name;
    ret.noMarginsOrPadding();

    if (inpath) {
      ret.setAttribute("datapath", path);
    }

    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    this._add(ret);

    //ret.update();

    return ret;
  }

  checkenum(inpath, name, packflag, enummap, defaultval, callback, iconmap, mass_set_path) {
    packflag = packflag === undefined ? 0 : packflag;
    packflag |= this.inherit_packflag;

    let path = this._joinPrefix(inpath);

    let has_path = path !== undefined;
    let prop;

    if (path !== undefined) {
      prop = this.ctx.api.resolvePath(this.ctx, path, true);

      if (prop !== undefined)
        prop = prop.prop;
    }

    if (path !== undefined) {
      if (prop === undefined) {
        console.warn("Bad path in checkenum", path);
        return;
      }

      let frame;

      if (packflag & PackFlags$4.VERTICAL) {
        frame = this.col();
      } else {
        frame = this.row();
      }

      frame.oneAxisPadding();
      frame.background = this.getDefault("BoxSub2BG");

      if (packflag & PackFlags$4.USE_ICONS) {
        for (let key in prop.values) {
          let check = frame.check(inpath + "["+key+"]", "", packflag);

          check.icon = prop.iconmap[key];
          check.drawCheck = false;

          check.style["padding"] = "0px";
          check.style["margin"] = "0px";

          check.dom.style["padding"] = "0px";
          check.dom.style["margin"] = "0px";

          check.description = prop.descriptions[key];
          //console.log(check.description, key, prop.keys[key], prop.descriptions, prop.keys);
        }
      } else {
        if (name === undefined) {
          name = prop.uiname;
        }

        frame.label(name).font = "TitleText";

        let checks = {};

        let ignorecb = false;

        function makecb(key) {
          return () => {
            if (ignorecb) return;

            ignorecb = true;
            for (let k in checks) {
              if (k !== key) {
                checks[k].checked = false;
              }
            }
            ignorecb = false;

            if (callback) {
              callback(key);
            }
          }
        }

        for (let key in prop.values) {
          let check = frame.check(inpath + " = " + prop.values[key], prop.ui_value_names[key]);
          checks[key] = check;

          if (mass_set_path) {
            check.setAttribute("mass_set_path", mass_set_path);
          }


          check.description = prop.descriptions[prop.keys[key]];
          if (!check.description) {
            check.description = ""+prop.ui_value_names[key];
          }
          check.onchange = makecb(key);
          //console.log("PATH", path);
        }
      }
    }
  }

  checkenum_panel(inpath, name, packflag=0, callback=undefined, mass_set_path=undefined, prop=undefined) {
    packflag = packflag === undefined ? 0 : packflag;
    packflag |= this.inherit_packflag;

    let path = this._joinPrefix(inpath);

    let has_path = path !== undefined;

    if (path !== undefined && prop === undefined) {
      prop = this.ctx.api.resolvePath(this.ctx, path, true);

      if (prop !== undefined)
        prop = prop.prop;
    }

    if (!name && prop) {
      name = prop.uiname;
    }

    if (path !== undefined) {
      if (prop === undefined) {
        console.warn("Bad path in checkenum", path);
        return;
      }

      let frame = this.panel(name, name, packflag);

      frame.oneAxisPadding();
      frame.background = this.getDefault("BoxSub2BG");

      if (packflag & PackFlags$4.USE_ICONS) {
        for (let key in prop.values) {
          let check = frame.check(inpath + " == " + prop.values[key], "", packflag);

          check.icon = prop.iconmap[key];
          check.drawCheck = false;

          check.style["padding"] = "0px";
          check.style["margin"] = "0px";

          check.dom.style["padding"] = "0px";
          check.dom.style["margin"] = "0px";

          check.description = prop.descriptions[key];
          //console.log(check.description, key, prop.keys[key], prop.descriptions, prop.keys);
        }
      } else {
        if (name === undefined) {
          name = prop.uiname;
        }

        frame.label(name).font = "TitleText";

        let checks = {};

        let ignorecb = false;

        function makecb(key) {
          return () => {
            if (ignorecb) return;

            ignorecb = true;
            for (let k in checks) {
              if (k !== key) {
                checks[k].checked = false;
              }
            }
            ignorecb = false;

            if (callback) {
              callback(key);
            }
          }
        }

        for (let key in prop.values) {
          let check = frame.check(inpath + " = " + prop.values[key], prop.ui_value_names[key]);
          checks[key] = check;

          if (mass_set_path) {
            check.setAttribute("mass_set_path", mass_set_path);
          }


          check.description = prop.descriptions[prop.keys[key]];
          if (!check.description) {
            check.description = ""+prop.ui_value_names[key];
          }
          check.onchange = makecb(key);
          //console.log("PATH", path);
        }
      }
    }

  }

  /*
    enummap is an object that maps
    ui names to keys, e.g.:
    
    ui.listenum("color", "Color", {
      RED   : 0,
      GREEN : 1,
      BLUE  : 2
    });

    path can be undefined, in which case, use callback,
    which gets the current enum as an argument

    defaultval cannot be undefined
  */
  listenum(inpath, name, enummap, defaultval, callback, iconmap, packflag = 0) {
    packflag |= this.inherit_packflag;

    let path;

    if (inpath !== undefined) {
      path = this._joinPrefix(inpath);
    }

    let ret = document.createElement("dropbox-x");
    if (enummap !== undefined) {
      if (enummap instanceof EnumProperty$2) {
        ret.prop = enummap;
      } else {
        ret.prop = new EnumProperty$2(defaultval, enummap, path, name);
      }

      if (iconmap !== undefined) {
        ret.prop.addIcons(iconmap);
      }
    } else {
      let res = this.ctx.api.resolvePath(this.ctx, path, true);

      if (res !== undefined) {
        ret.prop = res.prop;

        name = name === undefined ? res.prop.uiname : name;
      }
    }

    if (path !== undefined) {
      ret.setAttribute("datapath", path);
    }

    ret.setAttribute("name", name);

    if (defaultval) {
      ret.setValue(defaultval);
    }

    ret.onchange = callback;
    ret.onselect = callback;

    ret.packflag |= packflag;

    this._add(ret);
    return ret;
  }

  getroot() {
    let p = this;

    while (p.parent !== undefined) {
      p = p.parent;
    }

    return p;
  }

  curve(id, name, default_preset, packflag = 0) {
    packflag |= this.inherit_packflag;

    //XXX don't forget to OR packflag into widget
    throw new Error("implement me!");
  }

  simpleslider(inpath, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag = 0) {
    if (arguments.length === 2 || typeof name === "object") {
      let args = Object.assign({}, name);

      args.packflag = (args.packflag || 0) | PackFlags$4.SIMPLE_NUMSLIDERS;
      return this.slider(inpath, args);
      //new-style api call
    } else {
      return this.slider(inpath, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag | PackFlags$4.SIMPLE_NUMSLIDERS);
    }
  }

  slider(inpath, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag = 0) {
    if (arguments.length === 2 || typeof name === "object") {
      //new-style api call

      let args = name;

      name = args.name;
      defaultval = args.defaultval;
      min = args.min;
      max = args.max;
      step = args.step;
      is_int = args.is_int;
      do_redraw = args.do_redraw;
      callback = args.callback;
      packflag = args.packflag || 0;
    }

    packflag |= this.inherit_packflag;
    let ret;

    if (inpath) {
      let rdef = this.ctx.api.resolvePath(this.ctx, inpath, true);
      if (rdef && rdef.prop && (rdef.prop.flag & PropFlags$2.SIMPLE_SLIDER)) {
        packflag |= PackFlags$4.SIMPLE_NUMSLIDERS;
      }
      if (rdef && rdef.prop && (rdef.prop.flag & PropFlags$2.FORCE_ROLLER_SLIDER)) {
        packflag |= PackFlags$4.FORCE_ROLLER_SLIDER;
      }
    }

    if (packflag & PackFlags$4.SIMPLE_NUMSLIDERS && !(packflag & PackFlags$4.FORCE_ROLLER_SLIDER)) {
      ret = document.createElement("numslider-simple-x");
    } else {
      ret = document.createElement("numslider-x");
    }
    ret.packflag |= packflag;

    let decimals;

    if (inpath) {
      let path = this._joinPrefix(inpath);

      ret.setAttribute("datapath", path);

      let rdef;
      try {
        rdef = this.ctx.api.resolvePath(this.ctx, path, true);
      } catch (error) {
        if (error instanceof DataPathError$1) {
          print_stack$1(error);
          console.warn("Error resolving property", path);
        } else {
          throw error;
        }
      }
      if (rdef && rdef.prop) {
        let prop = rdef.prop;

        let range = prop.uiRange !== undefined ? prop.uiRange : prop.range;
        range = range === undefined ? [-100000, 100000] : range;

        min = min === undefined ? range[0] : min;
        max = max === undefined ? range[1] : max;
        is_int = is_int === undefined ? prop.type === PropTypes$5.INT : is_int;
        name = name === undefined ? prop.uiname : name;
        step = step === undefined ? prop.step : step;
        step = step === undefined ? (is_int ? 1 : 0.1) : step;
        decimals = decimals === undefined ? prop.decimalPlaces : decimals;
      } else {
        console.warn("warning, failed to lookup property info for path", path);
      }
    }

    if (name) {
      ret.setAttribute("name", name);
    }

    if (min !== undefined) {
      ret.range[0] = min;
    }
    if (max !== undefined) {
      ret.range[1] = max;
    }

    if (defaultval !== undefined) {
      ret.setValue(defaultval);
    }

    if (is_int)
      ret.setAttribute("integer", is_int);
    if (decimals !== undefined) {
      ret.decimalPlaces = decimals;
    }

    if (callback) {
      ret.onchange = callback;
    }

    this._add(ret);

    return ret;
  }

  panel(name, id, packflag = 0) {
    id = id === undefined ? name : id;
    packflag |= this.inherit_packflag;

    let ret = document.createElement("panelframe-x");

    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

    ret.setAttribute("title", name);
    ret.setAttribute("id", id);

    this._add(ret);

    ret.ctx = this.ctx;
    ret.contents.ctx = ret.ctx;

    return ret.contents;
  }

  row(packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("rowframe-x");

    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

    this._add(ret);

    ret.ctx = this.ctx;

    return ret;
  }

  listbox(packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("listbox-x");
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

    this._add(ret);
    return ret;
  }

  table(packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("tableframe-x");
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

    this._add(ret);
    return ret;
  }

  col(packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("colframe-x");
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

    this._add(ret);
    return ret;
  }

  colorPicker(inpath, packflag = 0, mass_set_path = undefined) {
    let path;

    if (inpath)
      path = this._joinPrefix(inpath);

    packflag |= this.inherit_packflag;

    let ret = document.createElement("colorpicker-x");

    packflag |= PackFlags$4.SIMPLE_NUMSLIDERS;

    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

    ret.ctx = this.ctx;
    ret.parentWidget = this;
    ret._init();
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;
    ret.constructor.setDefault(ret);

    if (path !== undefined) {
      ret.setAttribute("datapath", path);
    }

    console.warn("mass_set_path", mass_set_path);
    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    //XXX
    window.colorpicker = ret;

    this._add(ret);
    return ret;
  }

  textarea(datapath=undefined, value="", packflag=0, mass_set_path=undefined) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("rich-text-editor-x");
    ret.ctx = this.ctx;

    ret.packflag |= packflag;

    if (value !== undefined) {
      ret.value = value;
    }

    if (datapath)
      ret.setAttribute("datapath", datapath);
    if (mass_set_path)
      ret.setAttribute("mass_set_path", mass_set_path);

    this.add(ret);
    return ret;
  }

  /**
   * html5 viewer
   * */
  viewer(datapath=undefined, value="", packflag=0, mass_set_path=undefined) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("html-viewer-x");
    ret.ctx = this.ctx;

    ret.packflag |= packflag;

    if (value !== undefined) {
      ret.value = value;
    }

    if (datapath)
      ret.setAttribute("datapath", datapath);
    if (mass_set_path)
      ret.setAttribute("mass_set_path", mass_set_path);

    this.add(ret);
    return ret;
  }

  //
  tabs(position = "top", packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("tabcontainer-x");

    ret.constructor.setDefault(ret);
    ret.setAttribute("bar_pos", position);
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;
    ret.ctx = this.ctx;

    this._add(ret);
    return ret;
  }
};

UIBase.register(Container, "div");


class RowFrame extends Container {
  constructor() {
    super();

    let style = document.createElement("style");

    this.shadow.appendChild(style);
  }

  //try to set styling as early as possible
  connectedCallback() {
    super.connectedCallback();

    this.style["display"] = "flex";
    this.style["flex-direction"] = "row";
  }

  init() {
    super.init();

    //this.style["flex-direction"] = "row";
    this.style["display"] = "flex";
    this.style["flex-direction"] = "row";
    this.style["align-items"] = "center";
  }

  oneAxisMargin(m = this.getDefault("oneAxisMargin"), m2 = 0) {
    this.style["margin-left"] = this.style["margin-right"] = m + "px";
    this.style["margin-top"] = this.style["margin-bottom"] = "" + m2 + "px";

    return this;
  }

  oneAxisPadding(m = this.getDefault("oneAxisPadding"), m2 = 0) {
    this.style["padding-left"] = this.style["padding-right"] = "" + m + "px";
    this.style["padding-top"] = this.style["padding-bottom"] = "" + m2 + "px";

    return this;
  }

  update() {
    super.update();
  }

  static define() {
    return {
      tagname: "rowframe-x"
    };
  }
}

UIBase$4.register(RowFrame);

class ColumnFrame extends Container {
  constructor() {
    super();
  }

  init() {
    super.init();

    this.style["display"] = "flex";
    this.style["flex-direction"] = "column";
  }

  update() {
    super.update();
  }

  static define() {
    return {
      tagname: "colframe-x"
    };
  }
}

UIBase$4.register(ColumnFrame);

let UIBase$5 = UIBase;

class RichEditor extends UIBase$5 {
  constructor() {
    super();

    this._disabled = false;
    this._value = "";

    this.textOnlyMode = false;

    this.textarea = document.createElement("div");
    this.textarea.contentEditable = true;
    this.textarea.style["width"] = "100%";
    this.textarea.style["height"] = "100%";
    this.textarea.setAttribute("class", "rich-text-editor");

    this.textarea.style["overflow"] = "scroll";

    this.textarea.style["padding"] = "5px";
    this.textarea.style["font"] = this.getDefault("DefaultText").genCSS();
    this.textarea.style["background-color"] = this.getDefault("background-color");
    this.textarea.style["white-space"] = "pre-wrap";
    this.textarea.setAttribute("white-space", "pre-wrap");

    document.execCommand("styleWithCSS", true);

    window.ta = this;

    this.textarea.addEventListener("selectionchange", (e) => {
      console.log("sel1");
    });

    document.addEventListener("selectionchange", (e, b) => {
      console.log("sel2", document.getSelection().startNode, b);
    });

    this.textarea.addEventListener("input", (e) => {
      if (this.disabled) {
        return;
      }

      console.log("text input", e);

      let text;

      if (this.textOnlyMode) {
        text = this.textarea.innerText;
      } else {
        text = this.textarea.innerHTML;
      }

      if (this.textOnlyMode && text === this._value) {
        //formatting changed?
        console.log("detected formatting change");
        return;
      }

      console.log("text changed", ...arguments);
      let sel = document.getSelection();
      let range = sel.getRangeAt(0);
      console.log(range.startOffset, range.endOffset, range.startContainer);

      let node = sel.anchorNode;
      let off = sel.anchorOffset;

      this._value = text;

      //sel.collapse(node, off);

      if (this.hasAttribute("datapath")) {
        let path = this.getAttribute("datapath");
        this.setPathValue(this.ctx, path, this.value);
      }

      if (this.onchange) {
        this.onchange(this._value);
      }
      if (this.oninput) {
        this.oninput(this._value);
      }

      this.dispatchEvent(new InputEvent(this));
      this.dispatchEvent(new CustomEvent('change'));
    });

    this.shadow.appendChild(this.textarea);
  }

  /**
   * Only available in textOnlyMode.  Called when starting text formatting
  */
  formatStart() {
  }

  /**
  * Only available in textOnlyMode.  Formats html-formated line.
   *
   * @param line : line to format
   * @parem text : whole text
  * */
  formatLine(line, text) {
    return line;
  }

  /**
   * Only available in textOnlyMode.  Called when starting text formatting
   */
  formatEnd() {
  }

  init() {
    super.init();

    document.execCommand("defaultParagraphSeparator", false, "div");


    this.setCSS();
  }

  get disabled() {
    return this._disabled;
  }

  set disabled(val) {
    let changed = !!this._disabled != !!val;

    if (changed || 1) {
      this._disabled = !!val;
      super.disabled = val;

      this.textarea.disabled = val;
      this.textarea.contentEditable = !val;
      this.setCSS();
    }
  }

  set value(val) {
    this._value = val;

    if (this.textOnlyMode) {
      let val2 = "";
      for (let l of val.split("\n")) {
        val2 += l + "<br>";
      }
      val = val2;
    }

    this.textarea.innerHTML = val;
  }

  get value() {
    return this._value;
  }

  setCSS() {
    super.setCSS();

    this.textarea.style["font"] = this.getDefault("DefaultText").genCSS();
    if (this.disabled) {
      this.textarea.style["background-color"] = this.getDefault("DisabledBG");
    } else {
      this.textarea.style["background-color"] = this.getDefault("background-color");
    }
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let path = this.getAttribute("datapath");
    let prop = this.getPathMeta(this.ctx, path);

    if (prop === undefined) {
      console.warn("invalid datapath " + path);

      this.disabled = true;
      return;
    }

    this.disabled = false;
    let value = this.getPathValue(this.ctx, path);

    if (value !== this._value) {
      console.log("text change");
      this.value = value;
    }
  }

  update() {
    super.update();

    this.updateDataPath();
  }

  static define() {return {
    tagname : "rich-text-editor-x",
    style   : "richtext"
  }}
}
UIBase$5.register(RichEditor);

class RichViewer extends UIBase$5 {
  constructor() {
    super();

    this.contents = document.createElement("div");
    this.contents.style["padding"] = "10px";
    this.contents.style["margin"] = "10px";
    this.contents.style["overflow"] = "scroll";

    this.shadow.appendChild(this.contents);
    this._value = "";
  }

  hideScrollBars() {
    this.contents.style["overflow"] = "hidden";
  }

  showScrollBars() {
    this.contents.style["overflow"] = "scroll";
  }

  //transforms text into final html form
  //note that client code is allowed to override this directly
  textTransform(text) {
    return text;
  }
  set value(val) {
    this._value = val;

    this.contents.innerHTML = this.textTransform(val);
  }

  get value() {
    return this._value;
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let path = this.getAttribute("datapath");
    let prop = this.getPathMeta(this.ctx, path);

    if (prop === undefined) {
      console.warn("invalid datapath " + path);

      this.disabled = true;
      return;
    }

    this.disabled = false;
    let value = this.getPathValue(this.ctx, path);

    if (value !== this.value) {
      this.value = value;
    }
  }

  update() {
    super.update();

    this.updateDataPath();
  }

  static define() {return {
    tagname : "html-viewer-x",
    style   : "html_viewer"
  }}
}
UIBase$5.register(RichViewer);

"use strict";

let keymap$4 = keymap;

let EnumProperty$7 = EnumProperty$1,
  PropTypes$6 = PropTypes;

let UIBase$6 = UIBase,
  PackFlags$5 = PackFlags,
  IconSheets$4 = IconSheets;

let parsepx$4 = parsepx;

class NumSliderSimple extends UIBase$6 {
  constructor() {
    super();

    this.baseUnit = undefined;
    this.displayUnit = undefined;

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");

    this.canvas.style["width"] = this.getDefault("DefaultWidth") + "px";
    this.canvas.style["height"] = this.getDefault("DefaultHeight") + "px";
    this.canvas.style["pointer-events"] = "none";

    this.highlight = false;
    this.isInt = false;

    this.shadow.appendChild(this.canvas);
    this.range = [0, 1];

    this.step = 0.1;
    this._value = 0.5;
    this._focus = false;

    this.modal = undefined;
  }

  setValue(val, ignore_events=false) {
    val = Math.min(Math.max(val, this.range[0]), this.range[1]);

    if (this.isInt) {
      val = Math.floor(val);
    }

    if (this._value !== val) {
      this._value = val;
      this._redraw();

      if (this.onchange && !ignore_events) {
        this.onchange(val);
      }

      if (this.getAttribute("datapath")) {
        let path = this.getAttribute("datapath");
        this.setPathValue(this.ctx, path, this._value);
      }
    }
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this.setValue(val);
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let path = this.getAttribute("datapath");

    if (!path || path === "null" || path === "undefined") {
      return;
    }

    let val = this.getPathValue(this.ctx, path);

    if (this.isInt) {
      val = Math.floor(val);
    }

    if (val !== this._value) {
      let prop = this.getPathMeta(this.ctx, path);
      if (!prop) {
        return;
      }
      this.isInt = prop.type === PropTypes$6.INT;

      if (prop.range !== undefined) {
        this.range[0] = prop.range[0];
        this.range[1] = prop.range[1];
      }
      if (prop.uiRange !== undefined) {
        this.uiRange = new Array(2);
        this.uiRange[0] = prop.uiRange[0];
        this.uiRange[1] = prop.uiRange[1];
      }


      //console.log("updating numsplider simple value", val);
      this.value = val;
    }
  }

  _setFromMouse(e) {
    let rect = this.getClientRects()[0];
    if (rect === undefined) {
      return;
    }

    let x = e.x - rect.left;
    let dpi = UIBase$6.getDPI();
    let co = this._getButtonPos();

    let val = this._invertButtonX(x*dpi);
    this.value = val;
  }

  _startModal(e) {
    if (e !== undefined) {
      this._setFromMouse(e);
    }
    let dom = window;
    let evtargs = {capture : false};

    if (this.modal) {
      console.warn("Double call to _startModal!");
      return;
    }

    console.log("start simple numslider modal");

    let end = () => {
      console.log("end simple numslider modal");

      if (this._modal === undefined) {
        console.warn("end called twiced");
        return;
      }

      popModalLight(this._modal);

      this._modal = undefined;
      this.modal = undefined;
    };

    this.modal = {
      mousemove : (e) => {
        this._setFromMouse(e);
      },

      mouseover : (e) => {},
      mouseout : (e) => {},
      mouseleave : (e) => {},
      mouseenter : (e) => {},
      blur : (e) => {},
      focus : (e) => {},

      mouseup: (e) => {
        end();
      },

      keydown : (e) => {
        switch (e.keyCode) {
          case keymap$4["Enter"]:
          case keymap$4["Space"]:
          case keymap$4["Escape"]:
            end();
        }
      }
    };

    function makefunc(f) {
      return (e) => {
        e.stopPropagation();
        e.preventDefault();

        return f(e);
      }
    }

    for (let k in this.modal) {
      this.modal[k] = makefunc(this.modal[k]);
    }
    this._modal = pushModalLight(this.modal);
  }

  init() {
    super.init();

    if (!this.hasAttribute("tab-index")) {
      this.setAttribute("tab-index", 0);
    }

    this.updateSize();

    this.addEventListener("keydown", (e) => {
      console.log("yay keydown", e.keyCode);
      let dt = this.range[1] > this.range[0] ? 1 : -1;

      switch (e.keyCode) {
        case keymap$4["Left"]:
        case keymap$4["Right"]:
          let fac = this.step;

          if (e.shiftKey) {
            fac *= 0.1;
          }

          if (this.isInt) {
            fac = Math.max(fac, 1);
          }

          this.value += e.keyCode === keymap$4["Left"] ? -dt*fac : dt*fac;

          break;
      }
    });

    this.addEventListener("focusin", () => {
      if (this.disabled) return;

      this._focus = 1;
      this._redraw();
      this.focus();
      //console.log("focus2");
    });

    this.addEventListener("mousedown", (e) => {
      this._startModal(e);
    });

    this.addEventListener("mousein", (e) => {
      //console.log("mouse in");
      this.setHighlight(e);
      this._redraw();
    });
    this.addEventListener("mouseout", (e) => {
      //console.log("mouse out");
      this.highlight = false;
      this._redraw();
    });
    this.addEventListener("mouseover", (e) => {
      //console.log("mouse over");
      this.setHighlight(e);
      this._redraw();
    });
    this.addEventListener("mousemove", (e) => {
      this.setHighlight(e);
      this._redraw();
    });
    this.addEventListener("mouseleave", (e) => {
      //console.log("mouse leave");
      this.highlight = false;
      this._redraw();
    });
    this.addEventListener("blur", (e) => {
      //console.log("blur");
      this._focus = 0;
      this.highlight = false;
      this._redraw();
    });

    this.setCSS();
  }

  setHighlight(e) {
    this.highlight =  this.isOverButton(e) ? 2 : 1;
  }

  _redraw() {
    let g = this.g, canvas = this.canvas;
    let w = canvas.width, h = canvas.height;
    let dpi = UIBase$6.getDPI();

    let color = this.getDefault("BoxBG");
    let sh = ~~(this.getDefault("SlideHeight")*dpi + 0.5);

    g.clearRect(0, 0, canvas.width, canvas.height);

    //console.log(color)
    g.fillStyle = color;

    let y = (h - sh)*0.5;

    //export function drawRoundBox(elem, canvas, g, width, height, r=undefined,
    //                             op="fill", color=undefined, margin=undefined, no_clear=false) {

    let r = this.getDefault("BoxRadius");
    r = 3;

    g.translate(0, y);
    drawRoundBox(this, this.canvas, g, w, sh, r, "fill", color, undefined, true);
    g.translate(0, -y);

    //g.beginPath();
    //g.rect(0, y, w, sh);
    //g.fill();

    if (this.highlight === 1) {
      color = this.getDefault("BoxHighlight");
    } else {
      color = this.getDefault("BoxBorder");
    }
    g.strokeStyle = color;
    g.stroke();

    let co = this._getButtonPos();

    g.beginPath();

    if (this.highlight === 2) {
      color = this.getDefault("BoxHighlight");
    } else {
      color = this.getDefault("BoxBorder");
    }

    g.arc(co[0], co[1], Math.abs(co[2]), -Math.PI, Math.PI);
    g.fill();

    g.strokeStyle = color;
    g.stroke();

    g.beginPath();
    g.setLineDash([4, 4]);

    if (this._focus) {
      g.strokeStyle = this.getDefault("BoxHighlight");
      g.arc(co[0], co[1], co[2] - 4, -Math.PI, Math.PI);
      g.stroke();
    }

    g.setLineDash([]);
  }

  isOverButton(e) {
    let x = e.x, y = e.y;
    let rect = this.getClientRects()[0];

    if (!rect) {
      return false;
    }

    x -= rect.left;
    y -= rect.top;

    let co = this._getButtonPos();

    let dpi = UIBase$6.getDPI();
    let dv = new Vector2([co[0]/dpi-x, co[1]/dpi-y]);
    let dis = dv.vectorLength();

    //console.log("dis", dis.toFixed(3));
    return dis < co[2]/dpi;
  }

  _invertButtonX(x) {
    let w = this.canvas.width;
    let dpi = UIBase$6.getDPI();
    let sh = ~~(this.getDefault("SlideHeight")*dpi + 0.5);
    let boxw = this.canvas.height - 4;
    let w2 = w - boxw;

    x = (x - boxw*0.5) / w2;
    x = x*(this.range[1] - this.range[0]) + this.range[0];

    return x;
  }

  _getButtonPos() {
    let w = this.canvas.width;
    let dpi = UIBase$6.getDPI();
    let sh = ~~(this.getDefault("SlideHeight")*dpi + 0.5);
    let x = this._value;
    x = (x - this.range[0]) / (this.range[1] - this.range[0]);
    let boxw = this.canvas.height - 4;
    let w2 = w - boxw;

    //console.log(x, this.range);

    x = x*w2 + boxw*0.5;

    return [x, boxw*0.5, boxw*0.5];
  }
  setCSS() {
    super.setCSS();

    this.canvas.style["width"] = "min-contents";
    this.canvas.style["min-width"] = this.getDefault("DefaultWidth") + "px";
    this.style["min-width"] = this.getDefault("DefaultWidth") + "px";
    this._redraw();
  }

  updateSize() {
    if (this.canvas === undefined) {
      return;
    }

    let rect = this.getClientRects()[0];

    if (rect === undefined) {
      return;
    }

    let dpi = UIBase$6.getDPI();
    let w = ~~(rect.width*dpi), h = ~~(rect.height*dpi);
    let canvas = this.canvas;

    if (w !== canvas.width || h !== canvas.height) {
      //console.log("canvas size update", w, h);
      this.canvas.width = w;
      this.canvas.height = h;

      this.setCSS();
      this._redraw();
    }
  }

  _ondestroy() {
    if (this._modal) {
      popModalLight(this._modal);
      this._modal = undefined;
    }
  }

  update() {
    super.update();

    if (this.getAttribute("tab-index") !== this.tabIndex) {
      this.tabIndex = this.getAttribute("tab-index");
    }

    this.updateSize();
    this.updateDataPath();
  }

  static define() {return {
    tagname : "numslider-simple-base-x",
    style : "numslider_simple"
  }}
}
UIBase$6.register(NumSliderSimple);

class NumSliderSimple2 extends ColumnFrame {
  constructor() {
    super();

    this._value = 0;
    this._name = undefined;
    this.decimalPlaces = 4;
    this.isInt = false;
    this._lock_textbox = false;
    this.labelOnTop = undefined;

    this._last_label_on_top = undefined;

    this.styletag.textContent = `
    .numslider_simple_textbox {
      padding : 0px;
      margin  : 0px;
      height  : 15px;
    }
    `;

    this.container = this;

    this.textbox = document.createElement("textbox-x");
    this.numslider = document.createElement("numslider-simple-base-x");

    this.textbox.range = this.numslider.range;

    this.textbox.setAttribute("class", "numslider_simple_textbox");
  }

  get range() {
    return this.numslider.range;
  }

  get displayUnit() {
    return this.textbox.displayUnit;
  }

  set displayUnit(val) {
    let update = val !== this.displayUnit;

    //console.warn("setting display unit", val);
    this.slider.displayUnit = this.textbox.displayUnit = val;

    if (update) {
      this.updateTextBox();
    }
  }

  get baseUnit() {
    return this.textbox.baseUnit;
  }
  set baseUnit(val) {
    let update = val !== this.baseUnit;

    //console.warn("setting base unit", val);
    this.slider.baseUnit = this.textbox.baseUnit = val;

    if (update) {
      this.updateTextBox();
    }
  }

  init() {
    super.init();

    if (this.hasAttribute("labelOnTop")) {
      this.labelOnTop = this.getAttribute("labelOnTop");
    } else {
      this.labelOnTop = this.getDefault("labelOnTop");
    }

    this.rebuild();
  }

  rebuild() {
    this._last_label_on_top = this.labelOnTop;

    this.container.clear();

    if (this.labelOnTop) {
      this.container = this.row();
    } else {
      this.container = this;
    }

    if (this.hasAttribute("name")) {
      this._name = this.hasAttribute("name");
    } else {
      this._name = "slider";
    }


    this.l = this.container.label(this._name);
    this.l.font = "TitleText";
    this.l.overrideClass("numslider_simple");
    this.l.style["display"] = "float";
    this.l.style["position"] = "relative";
    
    if (!this.labelOnTop) {
      this.l.style["left"] = "8px";
      this.l.style["top"] = "5px";
    }

    let strip = this.container.row();
    strip.add(this.numslider);

    let path = this.hasAttribute("datapath") ? this.getAttribute("datapath") : undefined;

    let textbox = this.textbox;

    textbox.onchange = () => {
      let text = textbox.text;

      if (!isNumber(text)) {
        textbox.flash("red");
        return;
      } else {
        textbox.flash("green");

        let f = parseValue(text, this.baseUnit);

        if (isNaN(f)) {
          this.flash("red");
          return;
        }

        if (this.isInt) {
          f = Math.floor(f);
        }

        this._lock_textbox = 1;
        this.setValue(f);
        this._lock_textbox = 0;
      }
    };

    textbox.ctx = this.ctx;
    textbox.packflag |= this.inherit_packflag;
    textbox._width = this.getDefault("TextBoxWidth")+"px";
    textbox.style["height"] = (this.getDefault("DefaultHeight")-2) + "px";
    textbox._init();

    strip.add(textbox);

    this.linkTextBox();

    let in_onchange = 0;

    this.numslider.onchange = (val) => {
      this._value = this.numslider.value;
      this.updateTextBox();

      if (in_onchange) {
        return;
      }

      if (this.onchange !== undefined) {
        in_onchange++;
        try {
          if (this.onchange) {
            this.onchange(this);
          }
        } catch (error) {
          print_stack$1(error);
        }
      }

      in_onchange--;
    };
  }

  updateTextBox() {
    if (!this._init_done) {
      return;
    }

    if (this._lock_textbox > 0)
      return;

    //this.textbox.text = util.formatNumberUI(this._value, this.isInt, this.decimalPlaces);

    this.textbox.text = this.formatNumber(this._value);
    this.textbox.update();
  }

  linkTextBox() {
    this.updateTextBox();

    let onchange = this.numslider.onchange;
    this.numslider.onchange = (e) => {
      this._value = e.value;
      this.updateTextBox();

      onchange(e);
    };
  }

  setValue(val) {
    this._value = val;
    this.numslider.setValue(val);
    this.updateTextBox();
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this.setValue(val);
  }

  updateName() {
    let name = this.getAttribute("name");

    if (!name && this.hasAttribute("datapath")) {
      let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));

      if (prop) {
        name = prop.uiname;
      }
    }

    if (!name) {
      name = "[error]";
    }

    if (name !== this._name) {
      this._name = name;
      this.l.text = name;
    }
  }

  updateLabelOnTop() {
    if (this.labelOnTop !== this._last_label_on_top) {
      this._last_label_on_top = this.labelOnTop;
      this.rebuild();
    }
  }

  updateDataPath() {
    if (!this.ctx || !this.getAttribute("datapath")) {
      return;
    }

    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));

    if (prop !== undefined && !this.baseUnit && prop.baseUnit) {
      this.baseUnit = prop.baseUnit;
    }

    if (prop !== undefined && !this.displayUnit && prop.displayUnit) {
      this.displayUnit = prop.displayUnit;
    }
  }

  update() {
    this.updateLabelOnTop();
    super.update();

    this.updateDataPath();

    if (this.hasAttribute("min")) {
      this.range[0] = parseFloat(this.getAttribute("min"));
      this.setCSS();
      this._redraw();
    }

    if (this.hasAttribute("max")) {
      this.range[1] = parseFloat(this.getAttribute("max"));
      this.setCSS();
      this._redraw();
    }

    if (this.hasAttribute("integer")) {
      this.isInt = true;
      this.numslider.isInt = true;
    }

    this.updateName();

    this.numslider.description = this.description;
    this.textbox.description = this.title; //get full, transformed toolip

    if (this.hasAttribute("datapath")) {
      this.numslider.setAttribute("datapath", this.getAttribute("datapath"));
    }

    if (this.hasAttribute("mass_set_path")) {
      this.numslider.setAttribute("mass_set_path", this.getAttribute("mass_set_path"));
    }
  }

  setCSS() {
    super.setCSS();

    //textbox.style["margin"] = "5px";

  }

  static define() {return {
    tagname : "numslider-simple-x",
    style : "numslider_simple"
  }}
}
UIBase$6.register(NumSliderSimple2);

class VectorPanel extends ColumnFrame {
  constructor() {
    super();

    this.range = [-1e17, 1e17];

    this.name = "";

    this.axes = "XYZW";
    this.value = new Vector3();
    this.sliders = [];

    let makeParam = (key) => {
      Object.defineProperty(this, key, {
        get : function() {
          return this._getNumParam(key);
        },

        set : function(val) {
          this._setNumParam(key, val);
        }
      });
    };

    this.__range = [-1e17, 1e17];
    this._range = new Array(2);

    Object.defineProperty(this._range, 0, {
      get : () => this.__range[0],
      set : (val) => this.__range[0] = val
    });
    Object.defineProperty(this._range, 1, {
      get : () => this.__range[1],
      set : (val) => this.__range[1] = val
    });

    makeParam("isInt");
    makeParam("radix");
    makeParam("decimalPlaces");
    makeParam("baseUnit");
    makeParam("displayUnit");
    makeParam("step");
    makeParam("expRate");

    window.vp = this;
  }

  init() {
    super.init();
    this.rebuild();
    this.setCSS();

    this.background = this.getDefault("InnerPanelBG");
    this.style["padding"] = "5px";
  }

  _getNumParam(key) {
    return this["_"+key];
  }

  _setNumParam(key, val) {
    if (key === "range") {
      this.__range[0] = val[0];
      this.__range[1] = val[1];

      return;
    }

    this["_"+key] = val;

    for (let slider of this.sliders) {
      slider[key] = val;
    }
  }

  rebuild() {
    this.clear();

    console.warn("rebuilding");

    if (this.name) {
      this.label(this.name);
    }

    this.sliders = [];

    for (let i=0; i<this.value.length; i++) {
      //inpath, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag = 0) {

      let slider = this.slider(undefined, this.axes[i], this.value[i], this.range[0], this.range[1], 0.001, this.isInt);
      slider.axis = i;
      let this2 = this;

      slider.baseUnit = this.baseUnit;
      slider.displayUnit = this.displayUnit;
      slider.isInt = this.isInt;
      slider.range = this.__range;
      slider.radix = this.radix;
      slider.step = this.step;

      slider.onchange = function(e) {
        this2.value[this.axis] = this.value;

        if (this2.hasAttribute("datapath")) {
          this2.setPathValue(this2.ctx, this2.getAttribute("datapath"), this2.value);
        }

        if (this2.onchange) {
          this2.onchange(this2.value);
        }
      };

      this.sliders.push(slider);
    }

    this.setCSS();
  }

  setValue(value) {
    if (!value) {
      return;
    }

    if (value.length !== this.value.length) {
      switch (value.length) {
        case 2:
          this.value = new Vector2(value);
          break;
        case 3:
          this.value = new Vector3(value);
          break;
        case 4:
          this.value = new Vector4(value);
          break;
        default:
          throw new Error("invalid vector size " + value.length);
      }

      this.rebuild();
    } else {
      this.value.load(value);
    }

    if (this.onchange) {
      this.onchange(this.value);
    }

    return this;
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let path = this.getAttribute("datapath");

    let val = this.getPathValue(this.ctx, path);
    if (val === undefined) {
      this.disabled = true;
      return;
    }


    let meta = this.getPathMeta(this.ctx, path);
    let name = meta.uiname !== undefined ? meta.uiname : meta.name;
    if (this.hasAttribute("name")) {
      name = this.getAttribute("name");
    }

    if (name && name !== this.name) {
      this.name = name;
      this.rebuild();
      return;
    }

    let loadNumParam = (k) => {
      if (meta && meta[k] !== undefined && this[k] === undefined) {
        this[k] = meta[k];
      }
    };

    loadNumParam("baseUnit");
    loadNumParam("displayUnit");
    loadNumParam("decimalPlaces");
    loadNumParam("isInt");
    loadNumParam("radix");
    loadNumParam("step");
    loadNumParam("expRate");

    if (meta && meta.range) {
      this.range[0] = meta.range[0];
      this.range[1] = meta.range[1];
    }

    this.disabled = false;

    let length = val.length;

    if (meta)
      length = meta.getValue().length;
    
    if (this.value.length !== length) {
      switch (length) {
        case 2:
          val = new Vector2(val);
          break;
        case 3:
          val = new Vector3(val);
          break;
        case 4:
          val = new Vector4(val);
          break;
        default:
          val = meta.getValue().copy().load(val);
          break;
      }

      this.value = val;
      this.rebuild();

      for (let i=0; i<this.value.length; i++) {
        this.sliders[i].setValue(val[i], false);
        this.sliders[i]._redraw();
      }
    } else {
      if (this.value.vectorDistance(val) > 0) {
        this.value.load(val);

        for (let i=0; i<this.value.length; i++) {
          this.sliders[i].setValue(val[i], false);
          this.sliders[i]._redraw();
        }
      }
    }
  }
  update() {
    super.update();
    this.updateDataPath();
  }

  static define() {return {
    tagname : "vector-panel-x"
  }}
}
UIBase$6.register(VectorPanel);

class ToolTip extends UIBase$6 {
  constructor() {
    super();

    this.visibleToPick = false;
    this.div = document.createElement("div");

    this.styletag = document.createElement("style");
    this.styletag.textContent = `
      div {
        padding : 15px;
      }
    `;

    this.shadow.appendChild(this.styletag);
    this.shadow.appendChild(this.div);
  }

  static show(message, screen, x, y) {
    let ret = document.createElement(this.define().tagname);

    ret.text = message;
    let size = ret._estimateSize();

    console.log(size);
    x = Math.min(Math.max(x, 0), screen.size[0] - size[0]);
    y = Math.min(Math.max(y, 0), screen.size[1] - size[1]);

    ret._popup = screen.popup(ret, x, y);
    ret._popup.add(ret);

    return ret;
  }

  end() {
    this._popup.end();
  }

  init() {
    super.init();
    this.setCSS();
  }

  set text(val) {
    this.div.innerHTML = val.replace(/[\n]/g, "<br>\n");
  }

  get text() {
    return this.div.innerHTML;
  }

  _estimateSize() {
    let text = this.div.textContent;
    let block = measureTextBlock(this, text, undefined, undefined, undefined, this.getDefault("ToolTipText"));

    return [block.width+50, block.height+30];
  }

  setCSS() {
    super.setCSS();

    let color = this.getDefault("BoxBG");
    let bcolor = this.getDefault("BoxBorder");

    this.div.style["background-color"] = color;
    this.div.style["border"] = "2px solid " + bcolor;

    this.div.style["font"] = this.getDefault("ToolTipText").genCSS();
  }

  static define() {return {
    tagname : "tool-tip-x",
    style   : "tooltip"
  }}
};
UIBase$6.register(ToolTip);

function makeGenEnum() {
  let enumdef = {};
  let uinames = {};
  let icons = {};

  for (let cls of CurveConstructors) {
    let def = cls.define();

    let uiname = def.uiname;
    uiname = uiname === undefined ? def.name : uiname;

    enumdef[def.name] = cls.name;
    uinames[def.name] = uiname;
    icons[def.name] = def.icon !== undefined ? def.icon : -1;
  }

  //return enumdef;
  return new EnumProperty$1(undefined, enumdef).addUINames(uinames).addIcons(icons);
}

class Curve1DWidget extends ColumnFrame {
  constructor() {
    super();

    this.useDataPathUndo = false;

    this._on_draw = this._on_draw.bind(this);
    this.drawTransform = [1.0, [0, 0]];

    this._value = new Curve1D();
    this._value.on("draw", this._on_draw);

    this._value._on_change = (msg) => {
      console.warn("value on change");

      if (this.onchange) {
        this.onchange(this._value);
      }

      if (this.hasAttribute("datapath")) {
        let path = this.getAttribute("datapath");
        if (this._value !== undefined) {
          let val = this.getPathValue(this.ctx, path);

          if (val) {
            val.load(this._value);
            this.setPathValue(this.ctx, path, val);
          } else {
            val = this._value.copy();
            this.setPathValue(this.ctx, path, val);
          }
        }
      }
    };

    this._gen_type = undefined;
    this._lastGen = undefined;

    this._last_dpi = undefined;
    this.canvas = document.createElement("canvas");

    this.g = this.canvas.getContext("2d");
    this.canvas.g = this.g;

    window.cw = this;
    this.shadow.appendChild(this.canvas);
  }

  get value() {
    return this._value;
  }

  _on_draw(e) {
    let curve = e.data;

    //console.log("draw");
    this._redraw();
  }

  set value(val) {
    this._value.load(val);
    this.update();
    this._redraw();
  }

  _on_change() {
    if (this.onchange) {
      this.onchange(this);
    }
  }

  init() {
    super.init();

    this.useDataPathUndo = false;
    let row = this.row();

    let prop = makeGenEnum();

    prop.setValue(this.value.generatorType);

    this.dropbox = row.listenum(undefined, "Type", prop, this.value.generatorType, (id) => {
      console.warn("SELECT", id, prop.keys[id]);

      this.value.setGenerator(id);
      this.value._on_change("curve type change");
    });
    this.dropbox._init();

    this.container = this.col();
  }

  setCSS() {
    super.setCSS();

    this.style["width"] = "min-contents";
    this.style["heizght"] = "min-contents";
    this.updateSize();
  }

  updateSize() {
    let dpi = UIBase.getDPI();
    let w = ~~(this.getDefault("CanvasWidth")*dpi);
    let h = ~~(this.getDefault("CanvasHeight")*dpi);

    let bad = w !== this.canvas.width || h !== this.canvas.height;
    bad = bad || dpi !== this._last_dpi;

    if (!bad) {
      return;
    }

    this._last_dpi = true;
    this.canvas.width = w;
    this.canvas.height = h;

    this.canvas.style["width"] = (w/dpi) + "px";
    this.canvas.style["height"] = (h/dpi) + "px";

    this._redraw();
  }

  _redraw() {
    let canvas = this.canvas, g = this.g;

    g.clearRect(0, 0, canvas.width, canvas.height);
    g.beginPath();
    g.rect(0, 0, canvas.width, canvas.height);
    g.fillStyle = this.getDefault("CanvasBG");
    g.fill();

    g.save();

    let scale = Math.max(canvas.width, canvas.height);

    g.lineWidth /= scale;

    this.drawTransform[0] = scale;
    this.drawTransform[1][1] = -1.0;

    g.scale(scale, scale);
    g.translate(0.0, 1.0);
    g.scale(1.0, -1.0);

    this._value.draw(this.canvas, this.g, this.drawTransform);
    g.restore();
  }

  rebuild() {
    let ctx = this.ctx;
    if (ctx === undefined || this.container === undefined) {
      return;
    }


    this._gen_type = this.value.generatorType;
    let col = this.container;

    if (this._lastGen !== undefined) {
      this._lastGen.killGUI(col, this.canvas);
    }

    let onchange = this.dropbox.onchange;
    this.dropbox.onchange = undefined;
    this.dropbox.setValue(this.value.generatorType);
    this.dropbox.onchange = onchange;

    console.log("new curve type", this.value.generatorType, this._gen_type);
    col.clear();

    let gen = this.value.generators.active;
    gen.makeGUI(col, this.canvas);

    this._lastGen = gen;

    this._redraw();
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let path = this.getAttribute("datapath");
    let val = this.getPathValue(this.ctx, path);

    if (this._lastu === undefined) {
      this._lastu = 0;
    }

    if (val && !val.equals(this._value) && time_ms() - this._lastu > 200) {
      this._lastu = time_ms();

      this._value.load(val);
      this.update();
      this._redraw();
    }
  }

  updateGenUI() {
    let bad = this._lastGen !== this.value.generators.active;
    
    if (bad) {
      this.rebuild();
      this._redraw();
    }
  }
  update() {
    super.update();

    this.updateDataPath();
    this.updateSize();
    this.updateGenUI();
  }

  static define() {return {
    tagname : "curve-widget-x",
    style   : "curvewidget"
  }}
}
UIBase.register(Curve1DWidget);

//bind module to global var to get at it in console.
//
//note that require has an api for handling circular
//module refs, in such cases do not use these vars.

var _ui$1 = undefined;

let PropFlags$3 = PropFlags;
let PropSubTypes$3 = PropSubTypes$1;

let EnumProperty$8 = EnumProperty$1;

let Vector2$5 = undefined,
  UIBase$7 = UIBase,
  PackFlags$6 = PackFlags,
  PropTypes$7 = PropTypes;

class PanelFrame extends ColumnFrame {
  constructor() {
    super();

    this.contents = document.createElement("colframe-x");

    this.packflag = this.inherit_packflag = 0;

    this._closed = false;
  }

  saveData() {
    let ret = {
      _closed: this._closed
    };

    return Object.assign(super.saveData(), ret);
  }

  loadData(obj) {
    this.closed = obj._closed;
  }

  clear() {
    this.clear();
    this.add(this.titleframe);
  }

  get inherit_packflag() {
    if (!this.contents) return;
    return this.contents.inherit_packflag;
  }

  set inherit_packflag(val) {
    if (!this.contents) return;
    this.contents.inherit_packflag = val;
  }

  get packflag () {
    if (!this.contents) return;
    return this.contents.packflag;
  }

  set packflag(val) {
    if (!this.contents) return;
    this.contents.packflag = val;
  }

  init() {
    super.init();

    //con.style["margin-left"] = "5px";
    let con = this.titleframe = this.row();

    this.setCSS();

    let row = con;

    let iconcheck = document.createElement("iconcheck-x");
    this.iconcheck = iconcheck;

    this.style["width"] = "100%";

    this.overrideDefault("BoxMargin", 0);
    iconcheck.overrideDefault("BoxMargin", 0);

    iconcheck.noMarginsOrPadding();

    iconcheck.overrideDefault("BoxBG", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("BoxSubBG", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("BoxDepressed", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("BoxBorder", "rgba(0,0,0,0)");

    iconcheck.ctx = this.ctx;
    iconcheck._icon_pressed = Icons.UI_EXPAND;
    iconcheck._icon = Icons.UI_COLLAPSE;
    iconcheck.drawCheck = false;
    iconcheck.iconsheet = IconSheets.SMALL;
    iconcheck.checked = this._closed;

    this.iconcheck.onchange = (e) => {
      this.closed = this.iconcheck.checked;
    };

    row._add(iconcheck);

    //stupid css, let's just hackishly put " " to create spacing2

    let onclick = (e) => {
      console.log("panel header click");
      iconcheck.checked = !iconcheck.checked;
    };

    let label = row.label(this.getAttribute("title"));

    label.overrideDefault("LabelText", this.getDefault("TitleText").copy());
    label.overrideDefault("DefaultText", this.getDefault("TitleText").copy());

    label.noMarginsOrPadding();
    label.addEventListener("mousedown", onclick);
    label.addEventListener("touchdown", onclick);

    row.background = this.getDefault("BoxSubBG");
    row.style["border-radius"] = "5px";

    this.background = this.getDefault("BoxSub2BG");

    row.style["padding-right"] = "20px";
    row.style["padding-left"] = "5px";
    row.style["padding-top"] = "7px";
    row.style["padding-bottom"] = "5px";

    this.contents.ctx = this.ctx;
    this.add(this.contents);
  }

  static define() {
    return {
      tagname: "panelframe-x"
    };
  }

  update() {
    super.update();
  }

  _setVisible(state) {
    if (state) {
      this.contents.remove();
    } else {
      this.add(this.contents, false);
    }

    this.contents.hidden = state;
    return;
    for (let c of this.shadow.childNodes) {
      if (c !== this.titleframe) {
        c.hidden = state;
      }
    }
  }

  _updateClosed() {
    this._setVisible(this._closed);
    this.iconcheck.checked = this._closed;
  }

  get closed() {
    return this._closed;
  }

  set closed(val) {
    let update = !!val != !!this.closed;
    this._closed = val;

    //console.log("closed set", update);
    if (update) {
      this._updateClosed();
    }
  }
}

UIBase$7.register(PanelFrame);

"use strict";

let rgb_to_hsv_rets = new cachering(() => [0, 0, 0], 64);

let Vector2$6 = Vector2,
  Vector3$1 = Vector3,
  Vector4$2 = Vector4,
  Matrix4$2 = Matrix4;

function rgb_to_hsv (r,g,b) {
  var computedH = 0;
  var computedS = 0;
  var computedV = 0;

  if ( r==null || g==null || b==null ||
    isNaN(r) || isNaN(g)|| isNaN(b) ) {
    throw new Error('Please enter numeric RGB values!');
    return;
  }
  /*
  if (r<0 || g<0 || b<0 || r>1.0 || g>1.0 || b>1.0) {
   throw new Error('RGB values must be in the range 0 to 1.0');
   return;
  }//*/

  var minRGB = Math.min(r,Math.min(g,b));
  var maxRGB = Math.max(r,Math.max(g,b));

  // Black-gray-white
  if (minRGB==maxRGB) {
    computedV = minRGB;

    let ret = rgb_to_hsv_rets.next();
    ret[0] = 0, ret[1] = 0, ret[2] = computedV;
    return ret;
  }

  // Colors other than black-gray-white:
  var d = (r==minRGB) ? g-b : ((b==minRGB) ? r-g : b-r);
  var h = (r==minRGB) ? 3 : ((b==minRGB) ? 1 : 5);

  computedH = (60*(h - d/(maxRGB - minRGB))) / 360.0;
  computedS = (maxRGB - minRGB)/maxRGB;
  computedV = maxRGB;

  let ret = rgb_to_hsv_rets.next();
  ret[0] = computedH, ret[1] = computedS, ret[2] = computedV;
  return ret;
}

let hsv_to_rgb_rets = new cachering(() => [0, 0, 0], 64);

function hsv_to_rgb(h, s, v) {
  let c=0, m=0, x=0;
  let ret = hsv_to_rgb_rets.next();

  ret[0] = ret[1] = ret[2] = 0.0;
  h *= 360.0;

  c = v * s;
  x = c * (1.0 - Math.abs(((h / 60.0) % 2) - 1.0));
  m = v - c;
  let color;

  function RgbF_Create(r, g, b) {
    ret[0] = r;
    ret[1] = g;
    ret[2] = b;

    return ret;
  }

  if (h >= 0.0 && h < 60.0)
  {
    color = RgbF_Create(c + m, x + m, m);
  }
  else if (h >= 60.0 && h < 120.0)
  {
    color = RgbF_Create(x + m, c + m, m);
  }
  else if (h >= 120.0 && h < 180.0)
  {
    color = RgbF_Create(m, c + m, x + m);
  }
  else if (h >= 180.0 && h < 240.0)
  {
    color = RgbF_Create(m, x + m, c + m);
  }
  else if (h >= 240.0 && h < 300.0)
  {
    color = RgbF_Create(x + m, m, c + m);
  }
  else if (h >= 300.0)
  {
    color = RgbF_Create(c + m, m, x + m);
  }
  else
  {
    color = RgbF_Create(m, m, m);
  }

  return color;
}

let UIBase$8 = UIBase,
  PackFlags$7 = PackFlags,
  IconSheets$5 = IconSheets;

let UPW = 1.25, VPW = 0.75;

//*
let sample_rets = new cachering(() => [0, 0], 64);
function inv_sample(u, v) {
  let ret = sample_rets.next();

  ret[0] = Math.pow(u, UPW);
  ret[1] = Math.pow(v, VPW);

  return ret;
}

function sample(u, v) {
  let ret = sample_rets.next();

  ret[0] = Math.pow(u, 1.0/UPW);
  ret[1] = Math.pow(v, 1.0/VPW);

  return ret;
}
//*/

let fieldrand = new MersenneRandom(0);

let huefields = {};
function getHueField(width, height, dpi) {
  let key = width + ":" + height + ":" + dpi.toFixed(4);

  if (key in huefields) {
    return huefields[key];
  }

  let field = new ImageData(width, height);
  let idata = field.data;

  for (let i=0; i<width*height; i++) {
    let ix = i % width, iy = ~~(i / width);
    let idx = i*4;

    let rgb = hsv_to_rgb(ix/width, 1, 1);

    idata[idx] = rgb[0]*255;
    idata[idx+1] = rgb[1]*255;
    idata[idx+2] = rgb[2]*255;
    idata[idx+3] = 255;
  }

  //*
  let canvas = document.createElement("canvas");
  canvas.width = field.width;
  canvas.height = field.height;
  let g = canvas.getContext("2d");
  g.putImageData(field, 0, 0);
  field = canvas;
  //*/

  huefields[key] = field;
  return field;
}

let fields = {};
function getFieldImage(fieldsize, width, height, hsva) {
  fieldrand.seed(0);

  let hue = hsva[0];
  let hue_rgb = hsv_to_rgb(hue, 1.0, 1.0);
  let key = fieldsize + ":" + width + ":" + height + ":" + hue.toFixed(5);

  if (key in fields)
    return fields[key];

  //console.log("generation color picker field of size", size);

  let size2 = fieldsize;
  let valpow = 0.75;

  let image = {
    width : width,
    height : height,
    image : new ImageData(fieldsize, fieldsize),

    x2sat : (x) => {
      return Math.min(Math.max(x/width, 0), 1);
    },
    y2val : (y) => {
      y = 1.0 - Math.min(Math.max(y/height, 0), 1);

      return y === 0.0 ? 0.0 : y**valpow;
    },
    sat2x : (s) => {
       return s*width;
    },
    val2y : (v) => {
      if (v == 0)
        return height;

      v = v**(1.0 / valpow);
      return (1.0 - v)*height;
    }
  };

  image.params = {
    box : {
      x : 0,
      y : 0,
      width : width,
      height : height
    }
  };

  let idata = image.image.data;
  for (let i=0; i<idata.length; i += 4) {
    let i2 = i/4;
    let x = i2 % size2, y = ~~(i2 / size2);

    let v = 1.0 - (y / size2);
    let s = (x/size2);

    let rgb = hsv_to_rgb(hsva[0], s, v**valpow);

    idata[i] = rgb[0]*255;
    idata[i+1] = rgb[1]*255;
    idata[i+2] = rgb[2]*255;
    idata[i+3] = 255;
  }

  //*
  let image2 = document.createElement("canvas");
  image2.width = size2;
  image2.height = size2;
  let g = image2.getContext("2d");
  g.putImageData(image.image, 0, 0);
  //*/
  image.canvas = image2;
  image.scale = width / size2;

  fields[key] = image;
  return image;
}

let _update_temp = new Vector4$2();

class SimpleBox {
  constructor(pos=[0, 0], size=[1, 1]) {
    this.pos = new Vector2$6(pos);
    this.size = new Vector2$6(size);
    this.r = 0;
  }
}

class HueField extends UIBase$8 {
  constructor() {
    super();

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");
    this.shadow.appendChild(this.canvas);

    let setFromXY = (x, y) => {
      let dpi = this.getDPI();
      let r = this.getDefault("circleSize");

      let h = x / ((this.canvas.width - r*4)/dpi);
      h = Math.min(Math.max(h, 0.0), 1.0);

      this.hsva[0] = h;

      if (this.onchange !== undefined) {
        this.onchange(this.hsva);
      }

      this._redraw();
    };

    this.addEventListener("mousedown", (e) => {
      let rect = this.canvas.getClientRects()[0];
      let x = e.clientX - rect.x, y = e.clientY - rect.y;

      setFromXY(x, y);

      setTimeout(() => {
        this.pushModal({
          on_mousemove: (e) => {
            let rect = this.canvas.getClientRects()[0];
            let x = e.clientX - rect.x, y = e.clientY - rect.y;

            setFromXY(x, y);
          },
          on_mousedown: (e) => {
            this.popModal();
          },
          on_mouseup: (e) => {
            this.popModal();
          },
          on_keydown: (e) => {
            if (e.keyCode == keymap["Enter"] || e.keyCode == keymap["Escape"] || e.keyCode == keymap["Space"]) {
              this.popModal();
            }
          }
        });
      }, 1);
    });
  }

  _redraw() {
    let g = this.g, canvas = this.canvas;
    let dpi = this.getDPI();

    let w = this.getDefault("defaultWidth");
    let h = this.getDefault("hueheight");

    canvas.width = ~~(w*dpi);
    canvas.height = ~~(h*dpi);

    canvas.style["width"] = w + "px";
    canvas.style["height"] = h + "px";

    let rselector = ~~(this.getDefault("circleSize") * dpi);

    let w2 = canvas.width - rselector*4, h2 = canvas.height;

    g.drawImage(getHueField(w2, h2, dpi), 0, 0, w2, h2, rselector*2, 0, w2, h2);

    let x = this.hsva[0]*(canvas.width - rselector*4) + rselector*2;
    let y = canvas.height*0.5;

    g.beginPath();
    g.arc(x, y, rselector, -Math.PI, Math.PI);
    g.closePath();

    g.strokeStyle = "white";
    g.lineWidth = 3*dpi;
    g.stroke();

    g.strokeStyle = "grey";
    g.lineWidth = 1*dpi;
    g.stroke();

    if (this.disabled) {
      g.beginPath();
      g.fillStyle = "rgba(25,25,25,0.75)";
      g.rect(0, 0, this.canvas.width, this.canvas.height);
      g.fill();
    }
  }

  on_disabled() {
    this._redraw();
  }

  on_enabled() {
    this._redraw();
  }

  static define() {return {
    tagname : "huefield-x",
    style   : "colorfield"
  };}
}

UIBase$8.register(HueField);

class SatValField extends UIBase$8 {
  constructor() {
    super();

    this.hsva = [0,0,0,1];

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");
    this.shadow.appendChild(this.canvas);

    this.onchange = undefined;

    let setFromXY = (x, y) => {
      let field = this._getField();
      let r = ~~(this.getDefault("circleSize")*this.getDPI());

      let sat = field.x2sat(x-r);
      let val = field.y2val(y-r);

      this.hsva[1] = sat;
      this.hsva[2] = val;

      if (this.onchange) {
        this.onchange(this.hsva);
      }

      this._redraw();
    };

    this.canvas.addEventListener("mousedown", (e) => {
      let rect = this.canvas.getClientRects()[0];
      let x = e.clientX - rect.x, y = e.clientY - rect.y;

      setFromXY(x, y);

      setTimeout(() => {
        this.pushModal({
          on_mousemove: (e) => {
            let rect = this.canvas.getClientRects()[0];
            if (rect === undefined) {
              return;
            }
            
            let x = e.clientX - rect.x, y = e.clientY - rect.y;

            setFromXY(x, y);
          },
          on_mousedown: (e) => {
            this.popModal();
          },
          on_mouseup: (e) => {
            this.popModal();
          },
          on_keydown: (e) => {
            if (e.keyCode == keymap["Enter"] || e.keyCode == keymap["Escape"] || e.keyCode == keymap["Space"]) {
              this.popModal();
            }
          }
        });
      }, 1);
    });

    this.canvas.addEventListener("touchstart", (e) => {
      console.log("touch start");
      let rect = this.canvas.getClientRects()[0];
      let x = e.touches[0].clientX - rect.x, y = e.touches[0].clientY - rect.y;

      setFromXY(x, y);

      setTimeout(() => {
        this.pushModal({
          on_mousemove: (e) => {
            let rect = this.canvas.getClientRects()[0];
            let x, y;

            if (e.touches && e.touches.length) {
              x = e.touches[0].clientX - rect.x;
              y = e.touches[0].clientY - rect.y;
            } else {
              x = e.x;
              y = e.y;
            }

            setFromXY(x, y);
          },
          on_touchmove: (e) => {
            let rect = this.canvas.getClientRects()[0];
            let x = e.touches[0].clientX - rect.x, y = e.touches[0].clientY - rect.y;

            setFromXY(x, y);
          },
          on_mousedown: (e) => {
            this.popModal();
          },
          on_touchcancel: (e) => {
            this.popModal();
          },
          on_touchend: (e) => {
            this.popModal();
          },
          on_mouseup: (e) => {
            this.popModal();
          },
          on_keydown: (e) => {
            if (e.keyCode == keymap["Enter"] || e.keyCode == keymap["Escape"] || e.keyCode == keymap["Space"]) {
              this.popModal();
            }
          }
        });
      }, 1);
    });
  }

  _getField() {
    let dpi = this.getDPI();
    let canvas = this.canvas;
    let r = this.getDefault("circleSize");
    let w = this.getDefault("defaultWidth");
    let h = this.getDefault("defaultHeight");

    //r = ~~(r*dpi);

    return getFieldImage(this.getDefault("fieldsize"), w-r*2, h-r*2, this.hsva);
  }

  update(force_update=false) {
    super.update();

    if (force_update) {
      this._redraw();
    }
  }

  _redraw() {
    let g = this.g, canvas = this.canvas;
    let dpi = this.getDPI();

    let w = this.getDefault("defaultWidth");
    let h = this.getDefault("defaultHeight");

    canvas.width = ~~(w*dpi);
    canvas.height = ~~(h*dpi);

    canvas.style["width"] = w + "px";
    canvas.style["height"] = h + "px";
    //SatValField

    let rselector = ~~(this.getDefault("circleSize") * dpi);

    let field = this._getField();
    let image = field.canvas;

    g.globalAlpha = 1.0;
    g.beginPath();
    g.rect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "rgb(200, 200, 200)";
    g.fill();

    g.beginPath();

    let steps = 17;
    let dx = canvas.width / steps;
    let dy = canvas.height / steps;

    for (let i=0; i<steps*steps; i++) {
      let x = (i % steps)*dx, y = (~~(i / steps))*dy;

      if (i % 2 == 0) {
        continue;
      }
      g.rect(x, y, dx, dy);
    }

    g.fillStyle = "rgb(110, 110, 110)";
    g.fill();

    g.globalAlpha = this.hsva[3];
    g.drawImage(image, 0, 0, image.width, image.height, rselector, rselector, canvas.width-rselector*2, canvas.height-rselector*2);

    let hsva = this.hsva;

    let x = field.sat2x(hsva[1])*dpi + rselector;
    let y = field.val2y(hsva[2])*dpi + rselector;
    let r = rselector;

    g.beginPath();
    g.arc(x, y, r, -Math.PI, Math.PI);
    g.closePath();

    g.strokeStyle = "white";
    g.lineWidth = 3*dpi;
    g.stroke();

    g.strokeStyle = "grey";
    g.lineWidth = 1*dpi;
    g.stroke();

    if (this.disabled) {
      g.beginPath();
      g.fillStyle = "rgba(25,25,25,0.75)";
      g.rect(0, 0, this.canvas.width, this.canvas.height);
      g.fill();
    }
  }

  on_disabled() {
    this._redraw();
  }

  on_enabled() {
    this._redraw();
  }

  static define() {return {
    tagname : "satvalfield-x",
    style   : "colorfield"
  };}
}

UIBase$8.register(SatValField);

class ColorField extends ColumnFrame {
  constructor() {
    super();

    this.hsva = [0.05, 0.6, 0.15, 1.0];
    this.rgba = new Vector4$2([0, 0, 0, 0]);

    this._recalcRGBA();

    /*
    this.hbox = new SimpleBox();
    this.svbox = new SimpleBox();
    //*/

    this._last_dpi = undefined;

    let satvalfield = this.satvalfield = document.createElement("satvalfield-x");
    satvalfield.hsva = this.hsva;

    let huefield = this.huefield = document.createElement("huefield-x");
    huefield.hsva = this.hsva;

    huefield.onchange = (e) => {
      this.satvalfield._redraw();
      this._recalcRGBA();

      if (this.onchange) {
        this.onchange(this.rgba);
      }
    };

    satvalfield.onchange = (e) => {
      this._recalcRGBA();

      if (this.onchange) {
        this.onchange(this.rgba);
      }
    };

    this._add(satvalfield);
    this._add(huefield);
    //this.shadow.appendChild(canvas);
    //this.shadow.appendChild(huecanvas);
  }

  setHSVA(h, s, v, a=1.0, fire_onchange=true) {
    this.hsva[0] = h;
    this.hsva[1] = s;
    this.hsva[2] = v;
    this.hsva[3] = a;

    this._recalcRGBA();
    this.update(true);

    if (this.onchange && fire_onchange) {
      this.onchange(this.hsva, this.rgba);
    }
  }

  setRGBA(r, g, b, a=1.0, fire_onchange=true) {
    let hsv = rgb_to_hsv(r, g, b);

    this.hsva[0] = hsv[0];
    this.hsva[1] = hsv[1];
    this.hsva[2] = hsv[2];
    this.hsva[3] = a;

    this._recalcRGBA();
    this.update(true);

    if (this.onchange && fire_onchange) {
      this.onchange(this.hsva, this.rgba);
    }
  }

  _recalcRGBA() {
    let ret = hsv_to_rgb(this.hsva[0], this.hsva[1], this.hsva[2]);

    this.rgba[0] = ret[0];
    this.rgba[1] = ret[1];
    this.rgba[2] = ret[2];
    this.rgba[3] = this.hsva[3];

    return this;
  }

  updateDPI(force_update=false, _in_update=false) {
    let dpi = this.getDPI();

    let update = force_update;
    update = update || dpi != this._last_dpi;

    if (update) {
      this._last_dpi = dpi;

      if (!_in_update)
        this._redraw();

      return true;
    }
  }

  setRGBA(r, g, b, a=1.0, fire_onchange=true) {
    if (bad(r) || bad(g) || bad(b) || bad(a)) {
      console.warn("Invalid value!");
      return;
    }

    let ret = rgb_to_hsv(r, g, b);

    function bad(f) {
      return typeof f !== "number" || isNaN(f);
    }

    this.hsva[0] = ret[0];
    this.hsva[1] = ret[1];
    this.hsva[2] = ret[2];
    this.hsva[3] = a;

    this._recalcRGBA();
    this.update(true);

    if (this.onchange && fire_onchange) {
      this.onchange(this.hsva, this.rgba);
    }
  }
  update(force_update=false) {
    super.update();

    let redraw = false;

    redraw = redraw || this.updateDPI(force_update, true);

    if (redraw) {
      this.satvalfield.update(true);
      this._redraw();
    }
  }

  static define() {return {
    tagname : "colorfield-x",
    style : "colorfield"
  };}

  _redraw() {
    this.satvalfield._redraw();
    this.huefield._redraw();
  }
}
UIBase$8.register(ColorField);

class ColorPicker extends ColumnFrame {
  constructor() {
    super();
  }

  init() {
    super.init();

    this.field = document.createElement("colorfield-x");
    this.field.setAttribute("class", "colorpicker");

    this.field.packflag |= this.inherit_packflag;
    this.field.packflag |= this.packflag;

    this.field.onchange = () => {
      this._setDataPath();
      this._setSliders();

      if (this.onchange) {
        this.onchange(this.field.rgba);
      }
    };

    let style = document.createElement("style");
    style.textContent = `
      .colorpicker {
        background-color : ${this.getDefault("BoxBG")};
      }
    `;

    this._style = style;

    let cb = this.colorbox = document.createElement("div");
    cb.style["width"] = "100%";
    cb.style["height"] = this.getDefault("colorBoxHeight") + "px";
    cb.style["background-color"] = "black";

    this.shadow.appendChild(style);
    this.field.ctx = this.ctx;

    this.add(this.colorbox);
    this.add(this.field);

    this.style["width"] = this.getDefault("defaultWidth") + "px";
  }

  updateColorBox() {
    let r = this.field.rgba[0], g = this.field.rgba[1], b = this.field.rgba[2];
    //let a = this.field.rgba[3];

    r = ~~(r*255);
    g = ~~(g*255);
    b = ~~(b*255);

    let css = `rgb(${r},${g},${b})`;
    this.colorbox.style["background-color"] = css;
  }

  static setDefault(node) {
    let tabs = node.tabs();

    node.cssText = node.textbox();
    node.cssText.onchange = (val) => {
      let ok = validateWebColor(val);
      if (!ok) {
        node.cssText.flash("red");
        return;
      } else {
        node.cssText.flash("green");
      }

      val = val.trim();

      let color = web2color(val);

      console.log(color);

      node._no_update_textbox = true;
      console.log(color);
      node.field.setRGBA(color[0], color[1], color[2], color[3]);
      node._setSliders();

      node._no_update_textbox = false;
    };

    tabs.overrideDefault("DefaultPanelBG", node.getDefault("DefaultPanelBG"));

    let tab = tabs.tab("HSV");

    node.h = tab.slider(undefined, "Hue", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let hsva = node.hsva;
      node.setHSVA(e.value, hsva[1], hsva[2], hsva[3]);
    });

    node.s = tab.slider(undefined, "Saturation", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let hsva = node.hsva;
      node.setHSVA(hsva[0], e.value, hsva[2], hsva[3]);
    });
    node.v = tab.slider(undefined, "Value", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let hsva = node.hsva;
      node.setHSVA(hsva[0], hsva[1], e.value, hsva[3]);
    });
    node.a = tab.slider(undefined, "Alpha", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let hsva = node.hsva;
      node.setHSVA(hsva[0], hsva[1], hsva[2], e.value);
    });

    tab = tabs.tab("RGB");

    node.r = tab.slider(undefined, "R", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let rgba = node.rgba;
      node.setRGBA(e.value, rgba[1], rgba[2], rgba[3]);
    });
    node.g = tab.slider(undefined, "G", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let rgba = node.rgba;
      node.setRGBA(rgba[0], e.value, rgba[2], rgba[3]);
    });
    node.b = tab.slider(undefined, "B", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let rgba = node.rgba;
      node.setRGBA(rgba[0], rgba[1], e.value, rgba[3]);
    });
    node.a2 = tab.slider(undefined, "Alpha", 0.0, 0.0, 1.0, 0.001, false, true, (e) => {
      let rgba = node.rgba;
      node.setRGBA(rgba[0], rgba[1], rgba[2], e.value);
    });

    node._setSliders();
  }

  _setSliders() {
    if (this.h === undefined) {
      //setDefault() wasn't called
      console.warn("colorpicker ERROR");
      return;
    }

    let hsva = this.hsva;
    this.h.setValue(hsva[0], false);
    this.s.setValue(hsva[1], false);
    this.v.setValue(hsva[2], false);
    this.a.setValue(hsva[3], false);

    let rgba = this.rgba;

    this.r.setValue(rgba[0], false);
    this.g.setValue(rgba[1], false);
    this.b.setValue(rgba[2], false);
    this.a2.setValue(rgba[3], false);

    this.updateColorBox();

    if (!this._no_update_textbox) {
      this.cssText.text = color2web(this.field.rgba);
    }
  }

  get hsva() {
    return this.field.hsva;
  }

  get rgba() {
    return this.field.rgba;
  }

  updateDataPath() {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));
    let val =  this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      //console.warn("Bad datapath", this.getAttribute("datapath"));
      this.disabled = true;
      return;
    }

    this.disabled = false;

    _update_temp.load(val);

    if (prop.type == PropTypes.VEC3) {
      _update_temp[3] = 1.0;
    }

    if (_update_temp.vectorDistance(this.field.rgba) > 0.01)  {
      this.field.setRGBA(_update_temp[0], _update_temp[1], _update_temp[2], _update_temp[3], false);
      this._setSliders();
      this.field.update(true);
    }
  }

  update() {
    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }

    super.update();
  }

  _setDataPath() {
    if (this.hasAttribute("datapath")) {
      let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));

      if (prop === undefined) {
        console.warn("Bad data path for color field:", this.getAttribute("datapath"));
      }

      let val = this.field.rgba;
      if (prop !== undefined && prop.type == PropTypes.VEC3) {
        val = new Vector3$1();
        val.load(this.field.rgba);
      }

      this.setPathValue(this.ctx, this.getAttribute("datapath"), val);
    }
  }

  setHSVA(h, s, v, a) {
    this.field.setHSVA(h, s, v, a);
    this._setSliders();
    this._setDataPath();
  }

  setRGBA(r, g, b, a) {
    this.field.setRGBA(r, g, b, a);
    this._setSliders();
    this._setDataPath();
  }

  static define() {return {
    tagname : "colorpicker-x",
    style : "colorfield"
  };}
}

UIBase$8.register(ColorPicker);


class ColorPickerButton extends UIBase$8 {
  constructor() {
    super();

    this._highlight = false;
    this._depress = false;
    this._label = "";

    this.rgba = new Vector4$2([1, 1, 1, 1]);
    this.labelDom = document.createElement("span");
    this.labelDom.textContent = "error";
    this.dom = document.createElement("canvas");
    this.g = this.dom.getContext("2d");

    this.shadow.appendChild(this.labelDom);
    this.shadow.appendChild(this.dom);
  }

  set label(val) {
    this._label = val;
    this.labelDom.textContent = val;
  }

  get label() {
    return this._label;
  }

  init() {
    super.init();
    this._font = "DefaultText"; //this.getDefault("defaultFont");

    let enter = (e) => {
      console.log(e.type);
      this._highlight = true;
      this._redraw();
    };

    let leave = (e) => {
      console.log(e.type);
      this._highlight = false;
      this._redraw();
    };


    this.addEventListener("mousedown", (e) => {
      this.click(e);
    });

    this.addEventListener("mouseover", enter);
    this.addEventListener("mouseleave", leave);
    this.addEventListener("mousein", enter);
    this.addEventListener("mouseout", leave);
    this.addEventListener("focus", enter);
    this.addEventListener("blur", leave);

    this.setCSS();
  }

  click(e) {
    //console.log("click!", this.getAttribute("mass_set_path"));

    if (this.onclick) {
      this.onclick(e);
    }

    let colorpicker = this.ctx.screen.popup(this, this);
    colorpicker.useDataPathUndo = this.useDataPathUndo;

    let path = this.hasAttribute("datapath") ? this.getAttribute("datapath") : undefined;

    let widget = colorpicker.colorPicker(path, undefined, this.getAttribute("mass_set_path"));
    widget._init();

    widget.style["padding"] = "20px";
    widget.onchange = onchange;
  }

  get font() {
    return this._font;
  }

  set font(val) {
    this._font = val;

    this.setCSS();
  }

  _redraw() {
    let canvas = this.dom, g = this.g;

    g.clearRect(0, 0, canvas.width, canvas.height);

    if (this.disabled) {
      let color = "rgb(55, 55, 55)";

      g.save();

      drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "fill", color);
      drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "clip");
      let steps = 10;
      let dt = canvas.width / steps, t = 0;

      g.beginPath();
      g.lineWidth = 2;
      g.strokeStyle = "black";

      for (let i=0; i<steps; i++, t += dt) {
        g.moveTo(t, 0);
        g.lineTo(t+dt, canvas.height);
        g.moveTo(t+dt, 0);
        g.lineTo(t, canvas.height);
      }

      g.stroke();
      g.restore();
      return;
    }

    //do checker pattern for alpha
    g.save();

    let grid1 = "rgb(100, 100, 100)";
    let grid2 = "rgb(175, 175, 175)";

    drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "clip");
    drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "fill", grid1);

    let cellsize = 10;
    let totx = Math.ceil(canvas.width / cellsize), toty = Math.ceil(canvas.height / cellsize);

    //console.log("TOTX, TOTY", totx, toty);

    g.beginPath();
    for (let x=0; x<totx; x++) {
      for (let y=0; y<toty; y++) {
        if ((x+y) & 1) {
          continue;
        }

        g.rect(x*cellsize, y*cellsize, cellsize, cellsize);
      }
    }

    g.fillStyle = grid2;
    g.fill();

    //g.fillStyle = "orange";
    //g.beginPath();
    //g.rect(0, 0, canvas.width, canvas.height);
    //g.fill();

    let color = color2css(this.rgba);
    //console.log(color);
    drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "fill", color, undefined, true);
    //drawRoundBox(elem, canvas, g, width, height, r=undefined, op="fill", color=undefined, pad=undefined) {

    if (this._highlight) {
      //let color = "rgba(200, 200, 255, 0.5)";
      let color = this.getDefault("BoxHighlight");
      drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "fill", color);
    }

    g.restore();
  }

  setCSS() {
    super.setCSS();

    let w = this.getDefault("defaultWidth");
    let h = this.getDefault("defaultHeight");
    let dpi = this.getDPI();

    this.style["width"] = "min-contents" + "px";
    this.style["height"] = h + "px";

    this.style["flex-direction"] = "row";
    this.style["display"] = "flex";

    this.labelDom.style["color"] = this.getDefault(this._font).color;
    this.labelDom.style["font"] = getFont(this, undefined, this._font, false);

    let canvas = this.dom;

    canvas.style["width"] = w + "px";
    canvas.style["height"] = h + "px";
    canvas.width = ~~(w*dpi);
    canvas.height = ~~(h*dpi);

    this._redraw();
  }

  static define() {return {
    tagname : "color-picker-button-x",
    style   : "colorpickerbutton"
  }}

  updateDataPath() {
    if (!(this.hasAttribute("datapath"))) {
      return;
    }

    let path = this.getAttribute("datapath");
    let prop = this.getPathMeta(this.ctx, path);

    if ((prop === undefined || prop.data === undefined) && exports.DEBUG.verboseDataPath) {
      console.log("bad path", path);
      return;
    } else if (prop === undefined) {
      this.disabled = true;
      return;
    }

    this.disabled = false;

    prop = prop;

    if (prop.uiname !== this._label) {
      //console.log(prop);
      this.label = prop.uiname;
    }

    let val = this.getPathValue(this.ctx, path);

    if (val === undefined) {
      let redraw = this.disabled !== true;

      this.disabled = true;

      if (redraw) {
        this._redraw();
      }

      return;
    } else {
      let redraw = this.disabled;

      this.disabled = false;

      if (redraw) {
        this._redraw();
      }
    }

    if (this.rgba.vectorDistance(val) > 0.0001) {
      if (prop.type == PropTypes.VEC3) {
        this.rgba.load(val);
        this.rgba[3] = 1.0;
      } else {
        this.rgba.load(val);
      }

      this._redraw();
    }
  }

  update() {
    super.update();

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }
  }

  redraw() {
    this._redraw();
  }
};
UIBase$8.register(ColorPickerButton);

"use strict";

let UIBase$9 = UIBase, 
    PackFlags$8 = PackFlags,
    IconSheets$6 = IconSheets;

let tab_idgen = 1;
let debug = false;

function getpx(css) {
  return parseFloat(css.trim().replace("px", ""))
}

class TabItem {
  constructor(name, id, tooltip="") {
    this.name = name;
    this.id = id;
    this.tooltip = tooltip;
    
    this.size = [0, 0];
    this.pos = [0, 0];
  }
}

class ModalTabMove extends EventHandler {
  constructor(tab, tbar, dom) {
    super();
    
    this.dom = dom;
    this.tab = tab;
    this.tbar = tbar;
    
    this.mpos = undefined;
  }
  
  finish() {
    if (debug) if (debug) console.log("finish");
    
    this.tbar.tool = undefined;
    this.popModal(this.dom);
    this.tbar.update(true);
  }
  
  on_mousedown(e) {
    if (debug) console.log("yay");
    
    this.finish();
  }
  
  on_touchstart(e) {
    this.finish();
  }
  
  on_touchend(e) {
    this.finish();
  }
  
  on_mouseup(e) {
    this.finish();
  }
  
  on_mousemove(e) {
    if (debug) console.log("SFSDFSD");
    return this._on_move(e, e.x, e.y);
  }
  
  on_touchmove(e) {
    if (e.touches.length == 0)
      return;
    
    let x = e.touches[0].pageX;
    let y = e.touches[0].pageY;
    
    return this._on_move(e, x, y);
  }
  
  _on_move(e, x, y) {
    let r = this.tbar.getClientRects()[0];
    let dpi = UIBase$9.getDPI();

    if (r === undefined) {
      //element was removed during/before move
      this.finish();
      return;
    }

    x -= r.x;
    y -= r.y;
    
    let dx, dy;
    
    x *= dpi;
    y *= dpi;
    
    if (this.mpos === undefined) {
      this.mpos = [0, 0];
      dx = dy = 0;
    } else {
      dx = x - this.mpos[0];
      dy = y - this.mpos[1];
    }
    
    if (debug) console.log(x, y, dx, dy);
    
    let tab = this.tab, tbar = this.tbar;
    let axis = tbar.horiz ? 0 : 1;
    
    if (tbar.horiz) {
      tab.pos[0] += dx;
    } else {
      tab.pos[1] += dy;
    }
    
    let ti = tbar.tabs.indexOf(tab);
    let next = ti < tbar.tabs.length-1 ? tbar.tabs[ti+1] : undefined;
    let prev = ti > 0 ? tbar.tabs[ti-1] : undefined;
    
    if (next !== undefined && tab.pos[axis] > next.pos[axis]) {
      tbar.swapTabs(tab, next);
    } else if (prev !== undefined && tab.pos[axis] < prev.pos[axis]+prev.size[axis]*0.5) {
      tbar.swapTabs(tab, prev);
    }
    
    tbar.update(true);
    
    this.mpos[0] = x;
    this.mpos[1] = y;
  }
  
  on_keydown(e) {
    if (debug) console.log(e.keyCode);
    
    switch (e.keyCode) {
      case 27: //escape
      case 32: //space
      case 13: //enter
      case 9: //tab
        this.finish();
        break;
    }
  }
}

class TabBar extends UIBase$9 {
  constructor() {
    super();
    
    let style = document.createElement("style");
    let canvas = document.createElement("canvas");
    
    this.tabs = [];
    this.tabs.active = undefined;
    this.tabs.highlight = undefined;

    this._last_bgcolor = undefined;

    canvas.style["width"] = "145px";
    canvas.style["height"] = "45px";
    
    this.r = 5;
    
    this.canvas = canvas;
    this.g = canvas.getContext("2d");
    
    style.textContent = `
    `;
    
    this.shadow.appendChild(style);
    this.shadow.appendChild(canvas);
    
    this._last_dpi = undefined;
    this._last_pos = undefined;
    
    this.horiz = true;
    this.onchange = undefined;
    
    let mx, my;
    
    let do_element = (e) => {
      for (let tab of this.tabs) {
        let ok;

        if (this.horiz) {
          ok = mx >= tab.pos[0] && mx <= tab.pos[0] + tab.size[0];
        } else {
          ok = my >= tab.pos[1] && my <= tab.pos[1] + tab.size[1];
        }
        
        if (ok && this.tabs.highlight !== tab) {
          this.tabs.highlight = tab;
          this.update(true);
        }
      }
    };
    
    let do_mouse = (e) => {
      let r = this.canvas.getClientRects()[0];
      
      mx = e.x - r.x;
      my = e.y - r.y;
      
      let dpi = this.getDPI();
      
      mx *= dpi;
      my *= dpi;
      
      do_element(e);
    };
    
    let do_touch = (e) => {
      let r = this.canvas.getClientRects()[0];
      
      if (debug) console.log(e.touches);
      
      mx = e.touches[0].pageX - r.x;
      my = e.touches[0].pageY - r.y;
      
      let dpi = this.getDPI();
      
      mx *= dpi;
      my *= dpi;
      
      do_element(e);
    };
    
    this.canvas.addEventListener("mousemove", (e) => {
      if (debug) console.log("yay");
      
      let r = this.canvas.getClientRects()[0];
      do_mouse(e);
      
      e.preventDefault();
      e.stopPropagation();
    }, false);
    
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length == 0) {
        return;
      }
      
      do_touch(e);
      
      let ht = this.tabs.highlight;
      
      if (ht !== undefined && this.tool === undefined) {
        this.setActive(ht);

        let edom = this.getScreen();
        let tool = new ModalTabMove(ht, this, edom);
        this.tool = tool;
        
        tool.pushModal(edom, false);
      }
      
      e.preventDefault();
      e.stopPropagation();
    }, false);
    
    this.canvas.addEventListener("mousedown", (e) => {
      do_mouse(e);

      if (debug) console.log("mdown");

      if (e.button !== 0) {
        return;
      }
      
      let ht = this.tabs.highlight;
      
      if (ht !== undefined && this.tool === undefined) {
        this.setActive(ht);

        if (this.ctx === undefined) {
          return;
        }
        
        let edom = this.getScreen();
        let tool = new ModalTabMove(ht, this, edom);
        this.tool = tool;
        
        tool.pushModal(edom, false);
      }
      
      e.preventDefault();
      e.stopPropagation();
    }, false);
  }
  
  getTab(name) {
    for (let tab of this.tabs) {
      if (tab.name === name)
        return tab;
    }
    
    return undefined;
  }
  
  saveData() {
    let taborder = [];
    
    for (let tab of this.tabs) {
      taborder.push(tab.name);
    }
    
    let act = this.tabs.active !== undefined ? this.tabs.active.name : "null";
    
    return {
      taborder : taborder,
      active : act
    };
  }
  
  loadData(obj) {
    if (!obj.taborder) {
      return;
    }
    
    let tabs = this.tabs;
    let active = undefined;
    let ntabs = [];

    ntabs.active = undefined;
    ntabs.highlight = undefined;

    for (let tname of obj.taborder) {
      let tab = this.getTab(tname);
      
      if (tab === undefined) {
        continue;
      }
      
      if (tab.name === obj.active) {
        active = tab;
      }
      
      ntabs.push(tab);
    }
    
    for (let tab of tabs) {
      if (ntabs.indexOf(tab) < 0) {
        ntabs.push(tab);
      }
    }

    this.tabs = ntabs;

    if (active !== undefined) {
      this.setActive(active);
    } else {
      this.setActive(this.tabs[0]);
    }

    this.update(true);
    
    return this;
  }
  
  static setDefault(e) {
    e.setAttribute("bar_pos", "top");
    e.updatePos(true);
    
    return e;
  }
  
  swapTabs(a, b) {
    let tabs = this.tabs;
    
    let ai = tabs.indexOf(a);
    let bi = tabs.indexOf(b);
    
    tabs[ai] = b;
    tabs[bi] = a;
    
    this.update(true);
  }
  
  addTab(name, id, tooltip="") {
    let tab = new TabItem(name, id, tooltip);
    this.tabs.push(tab);
    this.update(true);
    
    if (this.tabs.length == 1) {
      this.setActive(this.tabs[0]);
    }

    return tab;
  }
  
  updatePos(force_update=false) {
    let pos = this.getAttribute("bar_pos");
    
    if (pos != this._last_pos || force_update) {
      this._last_pos = pos;
      
      this.horiz = pos == "top" || pos == "bottom";
      if (debug) console.log("tab bar position update", this.horiz);

      if (this.horiz) {
        this.style["width"] = "100%";
        delete this.style["height"];
      } else {
        this.style["height"] = "100%";
        delete this.style["width"];
      }
      
      this._redraw();
    }
  }
  
  updateDPI(force_update=false) {
    let dpi = this.getDPI();
    
    if (dpi !== this._last_dpi) {
      if (debug) console.log("DPI update!");
      this._last_dpi = dpi;
      
      this.updateCanvas(true);
    }
  }
  
  updateCanvas(force_update=false) {
    let canvas = this.canvas;
     
    let dpi = this.getDPI();

    let rwidth = getpx(this.canvas.style["width"]);
    let rheight = getpx(this.canvas.style["height"]);
    
    let width = Math.ceil(rwidth*dpi);
    let height = Math.ceil(rheight*dpi);
    
    let update = force_update;
    if (this.horiz) {
      update = update || canvas.width != width;
    } else {
      update = update || canvas.height != height;
    }
    
    if (update) {
      canvas.width = width;
      canvas.height = height;
      
      this._redraw();
    }
  }
  
  _layout() {
    let g = this.g;
    
    if (debug) console.log("tab layout");
    
    let dpi = this.getDPI();
    let tsize = this.getDefault("TabText").size*1;
    
    g.font = getFont(this, tsize, "TabText");
    
    let axis = this.horiz ? 0 : 1;
    
    let pad = 4*dpi + Math.ceil(tsize*dpi*0.25);
    let x = pad;
    let y = 0;
    
    let h = tsize*dpi + Math.ceil(tsize*dpi*0.5);
    
    for (let tab of this.tabs) {
      let w = g.measureText(tab.name).width;//*dpi;
      
      //don't interfere with tab dragging
      let bad = this.tool !== undefined && tab === this.tabs.active;
      
      if (!bad) {
        tab.pos[axis] = x;
        tab.pos[axis^1] = y;
      }
      
      //tab.size = [0, 0];
      tab.size[axis] = w+pad*2;
      tab.size[axis^1] = h;
      
      x += w + pad*2;
    }
    
    if (this.horiz) {
      this.canvas.style["width"] = Math.ceil(x/dpi + pad/dpi) + "px";
      this.canvas.style["height"] = Math.ceil(h/dpi) + "px";
    } else {
      this.canvas.style["height"] = Math.ceil(x/dpi + pad/dpi) + "px";
      this.canvas.style["width"] = Math.ceil(h/dpi) + "px";
    }
    
    //this.canvas.width = x;
  }
  
  setActive(tab) {
    let update = tab !== this.tabs.active;
    this.tabs.active = tab;
    
    if (update) {
      if (this.onchange)
        this.onchange(tab);
      
      this.update(true);
    }
  }
  
  _redraw() {
    let g = this.g;
    let bgcolor = this.getDefault("DefaultPanelBG");
    
    if (debug) console.log("tab draw");
    
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    g.beginPath();
    g.rect(0, 0, this.canvas.width, this.canvas.height);
    g.fillStyle = bgcolor;
    g.fill();
    
    let dpi = this.getDPI();
    let font = this.getDefault("TabText");
    let tsize = font.size;

    tsize *= dpi;
    g.font = font.genCSS(tsize*dpi);

    g.lineWidth = 2;
    g.strokeStyle = this.getDefault("TabStrokeStyle1");
      
    let r = this.r;
    this._layout();
    let tab;

    for (tab of this.tabs) {
      if (tab === this.tabs.active)
        continue;

      let x = tab.pos[0], y = tab.pos[1];
      let w = tab.size[0], h = tab.size[1];
      //let tw = g.measureText(tab.name).width;
      let tw = measureText(this, tab.name, this.canvas, g, tsize).width;
      
      let x2 = x + (tab.size[this.horiz^1]-tw)*0.5;
      let y2 = y + tsize*1.0;
      
      g.beginPath();
      g.rect(x, y, w, h);
      g.fillStyle = this.getDefault("TabInactive");
      g.fill();
        
      if (tab === this.tabs.highlight) {
        let p = 2;
        
        g.beginPath();
        g.rect(x+p, y+p, w-p*2, h-p*2);
        g.fillStyle = this.getDefault("TabHighlight");
        g.fill();
      }
        
      g.fillStyle = this.getDefault("TabText").color;
      
      if (!this.horiz) {
        let x3 = 0, y3 = y2;
        
        g.save();
        g.translate(x3, y3);
        g.rotate(Math.PI/2);
        g.translate(x3-tsize, -y3-tsize*0.5);
      }
      
      g.fillText(tab.name, x2, y2);
      
      if (!this.horiz) {
        g.restore();
      }
      
      if (tab !== this.tabs[this.tabs.length-1]) {
        g.beginPath();
        g.moveTo(x+w, h-5);
        g.lineTo(x+w, 5);
        g.strokeStyle = this.getDefault("TabStrokeStyle2");
        g.stroke();
      }
    }
    
    let th = tsize;
    
    //draw active tab
    tab = this.tabs.active;
    if (tab === undefined) {
      return;
    } else {
      let x = tab.pos[0], y = tab.pos[1];
      let w = tab.size[0], h = tab.size[1];
      //let tw = g.measureText(tab.name).width;
      let tw = measureText(this, tab.name, this.canvas, g, tsize).width;
      
      let x2 = x + (tab.size[this.horiz^1]-tw)*0.5;
      let y2 = y + tsize;

      g.beginPath();
      g.rect(x, y, w, h);
      g.fillStyle = bgcolor;
      g.fill();
      
      if (!this.horiz) {
        let x3 = 0, y3 = y2;
        
        g.save();
        g.translate(x3, y3);
        g.rotate(Math.PI/2);
        g.translate(-x3-tsize, -y3-tsize*0.5);
      }
      
      g.fillStyle = this.getDefault("TabText").color;

      //y2 += tsize*0.3;
      g.fillText(tab.name, x2, y2);

      if (!this.horiz) {
        g.restore();
      }
      
      if (tab === this.tabs.active) {
        /*
        let x = !this.horiz ? tab.y : tab.x;
        let y = !this.horiz ? tab.x : tab.y;
        let w = !this.horiz ? tab.size[1] : tab.size[0];
        let h = !this.horiz ? tab.size[0] : tab.size[1];
        
        if (!this.horiz) {
          //g.save();
          //g.translate(0, y);
          //g.rotate(Math.PI/16);
          //g.translate(0, -y);
        }//*/
        
        g.beginPath();
        if (this.horiz) {
          g.moveTo(0, h);
          g.lineTo(x-r, h);
          g.lineTo(x, h-r);
          g.lineTo(x, r);
          g.lineTo(x+r, 0);
          g.lineTo(x+w-r, 0);
          g.lineTo(x+w, r);
          g.lineTo(x+w, h-r);
          g.lineTo(x+w+r, h);
          g.lineTo(this.canvas.width, h);
        } else {
          g.moveTo(w, 0);
          g.lineTo(w, y-r);
          g.lineTo(w-r, y);
          g.lineTo(r, y);
          g.lineTo(0, y+r);
          g.lineTo(0, y+h-r);
          g.lineTo(r, y+h);
          g.lineTo(w-r, y+h);
          g.lineTo(w, y+h+r);
          
          g.lineTo(w, this.canvas.height);
        }
        
        let cw = this.horiz ? this.canvas.width : this.canvas.height;
        
        g.stroke();
        

        if (!this.horiz) {
          //g.restore();
        }
      }
    }
  }

  updateStyle() {
    if (this._last_bgcolor != this.getDefault("DefaultPanelBG")) {
      this._last_bgcolor = this.getDefault("DefaultPanelBG");

      this._redraw();
    }
  }

  update(force_update=false) {
    super.update();

    this.updateStyle();
    this.updatePos(force_update);
    this.updateDPI(force_update);
    this.updateCanvas(force_update);
  }
  
  static define() {return {
    tagname : "tabbar-x"
  };}
}
UIBase$9.register(TabBar);

class TabContainer extends UIBase$9 {
  constructor() {
    super();

    this.inherit_packflag = 0;
    this.packflag = 0;

    this.dom = document.createElement("ul");
    this.dom.setAttribute("class", `_tab_ul_${this._id}`);
    
    this.tbar = document.createElement("tabbar-x");
    this.tbar.setAttribute("class", "_tbar_" + this._id);
    this.tbar.constructor.setDefault(this.tbar);
    
    this._remakeStyle();
    this.shadow.appendChild(this.dom);

    this.tabs = {};
    
    this._last_horiz = undefined;
    this._last_bar_pos = undefined;
    this._tab = undefined;

    let li = document.createElement("li");
    li.setAttribute("class", `_tab_li_${this._id}`);
    li.appendChild(this.tbar);
    this.dom.appendChild(li);

    this.tbar.parentWidget = this;

    this.tbar.onchange = (tab) => {
      if (this._tab) {
        HTMLElement.prototype.remove.call(this._tab);
      }
      
      this._tab = this.tabs[tab.id];
      //this._tab = document.createElement("div");
      //this._tab.innerText = "SDfdsfsdyay";

      this._tab.parentWidget = this;
      this._tab.update();

      let li = document.createElement("li");
      li.style["background-color"] = this.getDefault("DefaultPanelBG");
      li.setAttribute("class", `_tab_li_${this._id}`);
      li.appendChild(this._tab);
      
      //XXX why is this necassary?
      //this._tab.style["margin-left"] = "40px";
      this.dom.appendChild(li);

      if (this.onchange) {
        this.onchange(tab);
      }
    };
  }

  init() {
    super.init();
    this.background = this.getDefault("DefaultPanelBG");
  }

  static setDefault(e) {
    e.setAttribute("bar_pos", "top");
    
    return e;
  }
  
  _remakeStyle() {
    let horiz = this.tbar.horiz;
    let display = "flex";
    let flexDir = !horiz ? "row" : "column";
    let bgcolor = this.__background; //this.getDefault("DefaultPanelBG");

    //display = "inline" //XXX
    let style = document.createElement("style");
    style.textContent = `
      ._tab_ul_${this._id} {
        list-style-type : none;
        display : ${display};
        flex-direction : ${flexDir};
        margin : 0px;
        padding : 0px;
        ${!horiz ? "vertical-align : top;" : ""}
      }
      
      ._tab_li_${this._id} {
        display : ${display};
        flex-direction : ${flexDir};
        margin : 0px;
        padding : 0px;
        align-self : flex-start;
        ${!horiz ? "vertical-align : top;" : ""}
      }
      
      ._tbar_${this._id} {
        list-style-type : none;
        align-self : flex-start;
        background-color : ${bgcolor};
        flex-direction : ${flexDir};
        ${!horiz ? "vertical-align : top;" : ""}
      }
    `;
    
    if (this._style)
      this._style.remove();
    this._style = style;
    
    this.shadow.prepend(style);
  }

  tab(name, id=undefined, tooltip=undefined) {
    if (id === undefined) {
      id = tab_idgen++;
    }
    
    let col = document.createElement("colframe-x");

    this.tabs[id] = col;

    col.ctx = this.ctx;
    col._tab = this.tbar.addTab(name, id, tooltip);

    col.inherit_packflag |= this.inherit_packflag;
    col.packflag |= this.packflag;

    //let cls = this.tbar.horiz ? ui.ColumnFrame : ui.RowFrame;

    col.parentWidget = this;
    col.setCSS();

    if (this._tab === undefined) {
      this.setActive(col);
    }

    return col;
  }

  setActive(tab) {
    this.tbar.setActive(tab._tab);
  }

  updateBarPos() {
    let barpos = this.getAttribute("bar_pos");
    
    if (barpos !== this._last_bar_pos) {
      this.horiz = barpos == "top" || barpos == "bottom";
      this._last_bar_pos = barpos;
      
      this.tbar.setAttribute("bar_pos", barpos);
      this.tbar.update(true);
      this.update();
    }
  }
  
  updateHoriz() {
    let horiz = this.tbar.horiz;
    
    if (this._last_horiz !== horiz) {
      this._last_horiz = horiz;
      this._remakeStyle();
    }
  }
  
  update() {
    super.update();
    
    if (this._tab !== undefined) {
      this._tab.update();
    }
    
    this.updateHoriz();
    this.updateBarPos();
    this.tbar.update();
  }
  
  static define() {return {
    tagname : "tabcontainer-x"
  };}
}

UIBase$9.register(TabContainer);

//bind module to global var to get at it in console.

var _ui$2 = undefined;

let PropFlags$4 = PropFlags;
let PropSubTypes$4 = PropSubTypes$1;

let EnumProperty$9 = EnumProperty$1;

let Vector2$7 = undefined,
  UIBase$a = UIBase,
  PackFlags$9 = PackFlags,
  PropTypes$8 = PropTypes;

const SimpleContext$2 = SimpleContext;
const DataPathError$2 = DataPathError;

var list$3 = function list(iter) {
  let ret = [];

  for (let item of iter) {
    ret.push(item);
  }

  return ret;
};

class TableRow extends Container {
  constructor() {
    super();

    this.dom.remove();
    this.dom = document.createElement("tr");

    //kind of dumb, but this.dom doesn't live within this element itself, bleh
    //this.shadow.appendChild(this.dom);
    this.dom.setAttribute("class", "containerx");
  }

  static define() {return {
    tagname : "tablerow-x"
  };}

  _add(child) {
    child.ctx = this.ctx;
    child.parentWidget = this;

    let td = document.createElement("td");
    td.appendChild(child);

    this.dom.appendChild(td);
    child.onadd();
  }
};
UIBase$a.register(TableRow);

class TableFrame extends Container {
  constructor() {
    super();

    this.dom = document.createElement("table");
    this.shadow.appendChild(this.dom);
    this.dom.setAttribute("class", "containerx");

    //this.dom.style["display"] = "block";
  }

  update() {
    this.style["display"] = "inline-block";
    super.update();
  }

  _add(child) {
    child.ctx = this.ctx;
    child.parentWidget = this;
    this.dom.appendChild(child);
    child.onadd();
  }

  row() {
    let tr = document.createElement("tr");
    let cls = "table-tr";

    tr.setAttribute("class", cls);
    this.dom.appendChild(tr);
    let this2 = this;

    function maketd() {
      let td = document.createElement("td");
      tr.appendChild(td);

      td.style["margin"] = tr.style["margin"];
      td.style["padding"] = tr.style["padding"];

      let container = document.createElement("rowframe-x");

      container.ctx = this2.ctx;
      container.setAttribute("class", cls);
      td.setAttribute("class", cls);

      //let div2 = document.createElement("div");
      //div2.setAttribute("class", cls);
      //div2.innerHTML = "sdfsdf";

      //td.appendChild(div2);
      td.appendChild(container);

      return container;
    }

    //hrm wish I could subclass html elements easier
    let ret = {
      _tr : tr,

      style : tr.style,

      focus : function(args) {
        tr.focus(args);
      },

      blur : function(args) {
        tr.blur(args);
      },

      remove : () => {
        tr.remove();
      },

      addEventListener : function(type, cb, arg) {
        tr.addEventListener(type, cb, arg);
      },

      removeEventListener : function(type, cb, arg) {
        tr.removeEventListener(type, cb, arg);
      },

      setAttribute : function(attr, val) {
        if (attr == "class") {
          cls = val;
        }

        tr.setAttribute(attr, val);
      },

      scrollTo : function() {
        return this._tr.scrollTo(...arguments);
      },

      scrollIntoView : function() {
        return this._tr.scrollIntoView(...arguments);
      },

      clear : function() {
        for (let node of list$3(tr.childNodes)) {
          tr.removeChild(node);
        }
      }
    };

    function makefunc(f) {
      ret[f] = function() {
        let container = maketd();

        container.background = tr.style["background-color"]; //"rgba(0,0,0,0)";
        return container[f].apply(container, arguments);
      };
    }

    let _bg = "";

    //need to implement proper proxy here!
    Object.defineProperty(ret, "tabIndex", {
      set : function(f) {
        tr.tabIndex = f;
      },

      get : function(f) {
        return tr.tabIndex;
      }
    });

    Object.defineProperty(ret, "background", {
      set : function(bg) {
        _bg = bg;
        tr.style["background-color"] = bg;

        for (let node of tr.childNodes) {
          if (node.childNodes.length > 0) {
            node.childNodes[0].background = bg;
            node.style["background-color"] = bg;
          }
        }
      }, get : function() {
        return _bg;
      }
    });

    /*
    Object.defineProperty(ret, "class", {
      set(bg) {
        tr.class = bg;
      }
    });//*/

    ret.cell = () => {
      let container = maketd();
      container.background = tr.style["background-color"];
      return container;
    };
    
    //makefunc("cell");
    makefunc("label");
    makefunc("tool");
    makefunc("prop");
    makefunc("pathlabel");
    makefunc("button");
    makefunc("iconbutton");
    makefunc("textbox");
    makefunc("col");
    makefunc("row");
    makefunc("table");
    makefunc("listenum");
    makefunc("check");

    return ret;
  }

  update() {
    super.update();
  }

  clear() {
    super.clear();
    for (let child of list$3(this.dom.childNodes)) {
      child.remove();
    }
  }

  static define() {return {
    tagname : "tableframe-x"
  };}
}
UIBase$a.register(TableFrame);

"use strict";

let EnumProperty$a = EnumProperty$1,
  PropTypes$9 = PropTypes;

let UIBase$b = UIBase,
  PackFlags$a = PackFlags,
  IconSheets$7 = IconSheets;

function getpx$1(css) {
  return parseFloat(css.trim().replace("px", ""))
}

class ListItem extends RowFrame {
  constructor() {
    super();

    let highlight = () => {
      console.log("listitem mouseover");
      this.highlight = true;
      this.setBackground();
    };

    let unhighlight = () => {
      console.log("listitem mouseleave");
      this.highlight = false;
      this.setBackground();
    };

    this.addEventListener("mouseover", highlight);
    this.addEventListener("mousein", highlight);

    this.addEventListener("mouseleave", unhighlight);
    this.addEventListener("mouseout", unhighlight);
    this.addEventListener("blur", unhighlight);

    this.addEventListener("click", (e) => {
      console.log("click!");
      if (this.onclick) {
        this.onclick();
      }
    });

    let style = document.createElement("style");
    style.textContent = `
      .listitem {
        -moz-user-focus: normal;
        moz-user-focus: normal;
        user-focus: normal;
      }
    `;

    this.shadowRoot.prepend(style);
  }

  init() {
    super.init();

    this.setAttribute("class", "listitem");
    this.style["width"] = "100%";
    this.setCSS();
  }

  setBackground() {
    if (this.highlight) {
      this.background = this.getDefault("ListHighlight");
    } else if (this.is_active) {
      this.background = this.getDefault("ListActive");
    } else {
      this.background = this.getDefault("DefaultPanelBG");
    }
  }

  static define() {return {
    tagname : "listitem-x",
    style : "listbox"
  }}
}
UIBase$b.register(ListItem);

class ListBox extends Container {
  constructor() {
    super();

    this.items = [];
    this.idmap = {};
    this.items.active = undefined;
    this.highlight = false;
    this.is_active = false;

    let style = document.createElement("style");
    style.textContent = `
      .listbox {
        -moz-user-focus: normal;
        moz-user-focus: normal;
        user-focus: normal;
      }
    `;
    this.shadow.prepend(style);

    this.onkeydown = (e) => {
      console.log("yay", e.keyCode);

      switch (e.keyCode) {
        case keymap["Up"]:
        case keymap["Down"]:
          if (this.items.length == 0)
            return;

          if (this.items.active === undefined) {
            this.setActive(this.items[0]);
            return;
          }

          let i = this.items.indexOf(this.items.active);
          let dir = e.keyCode == keymap["Up"] ? -1 : 1;

          i = Math.max(Math.min(i+dir, this.items.length-1), 0);
          this.setActive(this.items[i]);

          break;
      }
    };

    //this.addEventListener("keydown", on_keydown);

    //this._table =  this.table();
  }

  setCSS() {
    super.setCSS();
  }

  init() {
    super.init();

    this.setCSS();

    this.style["width"] = this.getDefault("width") + "px";
    this.style["height"] = this.getDefault("height") + "px";
    this.style["overflow"] = "scroll";

    //this.setAttribute("class", "listbox");
    //this.setAttribute("tabindex", 0);
    //this.tabIndex = 0;
  }

  addItem(name, id) {
    let item = document.createElement("listitem-x");

    item._id = id === undefined ? this.items.length : id;
    this.idmap[item._id] = item;

    //item.addEventListener("keydown", this.onkeydown);
    this.tabIndex = 1;
    this.setAttribute("tabindex", 1);

    this.add(item);
    this.items.push(item);

    item.label(name);
    let this2 = this;

    item.onclick = function() {
      this2.setActive(this);
      this.setBackground();
    };

    return item;
  }

  removeItem(item) {
    if (typeof item == "number") {
      item = this.idmap[item];
    }

    item.remove();
    delete this.idmap[item._id];
    this.items.remove(item);
  }

  setActive(item) {
    if (typeof item == "number") {
      item = this.idmap[item];
    }

    console.log("set active!");

    if (item === this.items.active) {
      return;
    }

    if (this.items.active !== undefined) {
      this.items.active.highlight = false;
      this.items.active.is_active = false;
      this.items.active.setBackground();
    }

    item.is_active = true;
    this.items.active = item;

    if (item !== undefined) {
      item.setBackground();
      item.scrollIntoViewIfNeeded();
    }

    if (this.onchange) {
      this.onchange(item._id, item);
    }
  }

  clear() {

  }

  static define() {return {
    tagname : "listbox-x",
    style : "listbox"
  }}
}
UIBase$b.register(ListBox);

"use strict";

let EnumProperty$b = EnumProperty$1,
  PropTypes$a = PropTypes;

let UIBase$c = UIBase,
  PackFlags$b = PackFlags,
  IconSheets$8 = IconSheets;

function getpx$2(css) {
  return parseFloat(css.trim().replace("px", ""))
}

class Menu extends UIBase$c {
  constructor() {
    super();

    this.items = [];

    this.itemindex = 0;
    this.closed = false;
    this.started = false;
    this.activeItem = undefined;

    this.overrideDefault("DefaultText", this.getDefault("MenuText"));

    //we have to make a container for any submenus to
    this.container = document.createElement("span");
    this.container.style["display"] = "flex";

    //this.container.style["background-color"] = "red";
    this.container.setAttribute("class", "menucon");

    this.dom = document.createElement("ul");
    this.dom.setAttribute("class", "menu");
    /*
              place-items: start start;
              flex-wrap : nowrap;
              align-content : start;
              place-content : start;
              justify-content : start;

              align-items : start;
              place-items : start;
              justify-items : start;
    */

    let pad1 = isMobile() ? 15 : 0;

    let style = document.createElement("style");
    style.textContent = `
        .menucon {
          position:absolute;
          float:left;
          
          display: block;
          -moz-user-focus: normal;
        }
        
        ul.menu {
          display        : flex;
          flex-direction : column;
          
          margin : 0px;
          padding : 0px;
          border : ${this.getDefault("MenuBorder")};
          -moz-user-focus: normal;
          background-color: ${this.getDefault("MenuBG")};
        }
        
        .menuitem {
          display : block;
          
          list-style-type:none;
          -moz-user-focus: normal;
          
          margin : 0;
          padding : 0px;
          padding-right: 16px;
          padding-left: 16px;
          padding-top : ${pad1}px;
          padding-bottom : ${pad1}px;
          font : ${this.getDefault("MenuText").genCSS()};
          background-color: ${this.getDefault("MenuBG")};
        }
        
        .menuseparator {
          ${this.getDefault("MenuSeparator")}
        }
        
        .menuitem:focus {
          background-color: ${this.getDefault("MenuHighlight")};
          -moz-user-focus: normal;
        }
      `;

    this.dom.setAttribute("tabindex", -1);

    //let's have the menu wrangler handle key events

    this.container.addEventListener("mouseleave", (e) => {
      console.log("menu out");
      this.close();
    }, false);

    //this.container.appendChild(this.dom);

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.container);
  }

  float(x, y, zindex=undefined) {
    console.log("menu test!");

    let dpi = this.getDPI();
    let rect = this.dom.getClientRects();
    let maxx = this.getWinWidth()-10;
    let maxy = this.getWinHeight()-10;

    console.log(rect.length > 0 ? rect[0] : undefined);

    if (rect.length > 0) {
      rect = rect[0];
      console.log(y + rect.height);
      if (y + rect.height > maxy) {
        console.log("greater");
        y = maxy - rect.height - 1;
      }

      if (x + rect.width > maxx) {
        console.log("greater");
        x = maxx - rect.width - 1;
      }
    }

    super.float(x, y, 50);
  }

  click() {
    if (this.activeItem == undefined)
      return;

    if (this.activeItem !== undefined && this.activeItem._isMenu)
    //ignore
      return;

    if (this.onselect) {
      try {
        console.log(this.activeItem._id, "-----");
        this.onselect(this.activeItem._id);
      } catch (error) {
        print_stack$1(error);
        console.log("Error in menu callback");
      }
    }

    console.log("menu select");
    this.close();
  }

  _ondestroy() {
    if (this.started) {
      menuWrangler.popMenu(this);

      if (this.onclose) {
        this.onclose();
      }
    }
  }

  close() {
    //XXX
    //return;
    if (this.closed) {
      return;
    }

    if (this.started) {
      menuWrangler.popMenu(this);
    }

    this.closed = true;
    this.started = false;

    //if (this._popup.parentNode !== undefined) {
    //  this._popup.remove();
    //}
    if (this._popup) {
      this._popup.end();
      this._popup = undefined;
    }

    this.remove();
    this.dom.remove();

    if (this.onclose) {
      this.onclose(this);
    }
  }

  static define() {return {
    tagname : "menu-x",
    style   : "menu"
  };}

  start_fancy(prepend, setActive=true) {
    return this.startFancy(prepend, setActive);
  }

  startFancy(prepend, setActive=true) {
    console.log("menu fancy start");

    let dom2 = document.createElement("div");
    //let dom2 = document.createElement("div");

    this.dom.setAttribute("class", "menu");
    dom2.setAttribute("class", "menu");

    let sbox = document.createElement("textbox-x");

    dom2.appendChild(sbox);
    dom2.appendChild(this.dom);

    dom2.style["height"] = "300px";
    this.dom.style["height"] = "300px";
    this.dom.style["overflow"] = "scroll";

    if (prepend) {
      this.container.prepend(dom2);
    } else {
      this.container.appendChild(dom2);
    }

    sbox.focus();
    sbox.onchange = () => {
      let t = sbox.text.trim().toLowerCase();

      console.log("applying search", t);

      for (let item of this.items) {
        item.remove();
      }

      for (let item of this.items) {
        let ok = t == "";
        ok = ok || item.innerHTML.toLowerCase().search(t) >= 0;

        if (ok) {
          this.dom.appendChild(item);
        }
        //item.hidden = !ok;
      }
    };

    sbox.addEventListener("keydown", (e) => {
      console.log(e.keyCode);
      switch (e.keyCode) {
        case 27: //escape key
          this.close();
          break;
        case 13: //enter key
          this.click(this.activeItem);
          this.close();
          break;
      }
    });

    if (!setActive)
      return;
  }

  start(prepend=false, setActive=true) {
    this.started = true;
    this.focus();
    menuWrangler.pushMenu(this);

    if (this.items.length > 10) {
      return this.start_fancy(prepend, setActive);
    }

    if (prepend) {
      this.container.prepend(this.dom);
    } else {
      this.container.appendChild(this.dom);
    }

    if (!setActive)
      return;

    window.setTimeout(() => {
      //select first child
      //TODO: cache last child entry

      if (this.activeItem === undefined) {
        this.activeItem = this.dom.childNodes[0];
      }

      if (this.activeItem === undefined) {
        return;
      }

      this.activeItem.focus();
    }, 0);
  }

  addItemExtra(text, id=undefined, hotkey, icon=-1, add=true) {
    let dom = document.createElement("span");

    dom.style["display"] = "inline-flex";

    let icon_div;

    if (1) { //icon >= 0) {
      icon_div = makeIconDiv(icon, IconSheets$8.SMALL);
    } else {
      let tilesize = iconmanager.getTileSize(IconSheets$8.SMALL);

      //tilesize *= window.devicePixelRatio;

      icon_div = document.createElement("span");
      icon_div.style["padding"] = icon_div.style["margin"] = "0px";
      icon_div.style["width"] = tilesize + "px";
      icon_div.style["height"] = tilesize + "px";
    }

    icon_div.style["display"] = "inline-flex";
    icon_div.style["margin-right"] = "1px";
    icon_div.style["align"] = "left";

    let span = document.createElement("span");

    //stupid css doesn't get width right. . .
    span.style["font"] = getFont(this, undefined, "MenuText");

    let dpi = this.getDPI();
    let tsize = this.getDefault("MenuText").size;
    //XXX proportional font fail

    //XXX stupid!
    let canvas = document.createElement("canvas");
    let g = canvas.getContext("2d");

    g.font = span.style["font"];

    let rect = span.getClientRects();

    let twid = Math.ceil(g.measureText(text).width);
    let hwid;
    if (hotkey) {
      g.font = getFont(this, undefined, "HotkeyText");
      hwid = Math.ceil(g.measureText(hotkey).width);
      twid += hwid + 8;
    }

    //let twid = Math.ceil(text.trim().length * tsize / dpi);

    span.innerText = text;

    span.style["word-wrap"] = "none";
    span.style["white-space"] = "pre";
    span.style["overflow"] = "hidden";
    span.style["text-overflow"] = "clip";

    span.style["width"] = ~~(twid) + "px";
    span.style["padding"] = "0px";
    span.style["margin"] = "0px";

    dom.style["width"] = "100%";

    dom.appendChild(icon_div);
    dom.appendChild(span);

    if (hotkey) {
      let hotkey_span = document.createElement("span");
      hotkey_span.innerText = hotkey;
      hotkey_span.style["margin-left"] = "0px";
      hotkey_span.style["margin-right"] = "0px";
      hotkey_span.style["margin"] = "0px";
      hotkey_span.style["padding"] = "0px";

      let al = "right";

      hotkey_span.style["font"] = getFont(this, undefined, "HotkeyText");
      hotkey_span.style["color"] = this.getDefault("HotkeyTextColor");

      //hotkey_span.style["width"] = ~~((hwid + 7)) + "px";
      hotkey_span.style["width"] = "100%";

      hotkey_span.style["text-align"] = al;
      hotkey_span.style["flex-align"] = al;
      //hotkey_span.style["display"] = "inline";
      hotkey_span.style["float"] = "right";
      hotkey_span["flex-wrap"] = "nowrap";

      dom.appendChild(hotkey_span);
    }

    return this.addItem(dom, id, add);
  }

  //item can be menu or text
  addItem(item, id, add=true) {
    id = id === undefined ? item : id;

    if (typeof item == "string" || item instanceof String) {
      let dom = document.createElement("dom");
      dom.textContent = item;
      item = dom;
      //return this.addItemExtra(item, id);
    }

    let li = document.createElement("li");

    li.setAttribute("tabindex", this.itemindex++);
    li.setAttribute("class", "menuitem");

    if (item instanceof Menu) {
      console.log("submenu!");

      let dom = this.addItemExtra(""+item.title, id, "", -1, false);

      //dom = document.createElement("div");
      //dom.innerText = ""+item.title;

      //dom.style["display"] = "inline-block";
      li.style["width"] = "100%";
      li.appendChild(dom);

      li._isMenu = true;
      li._menu = item;

      item.hidden = false;
      item.container = this.container;
    } else {
      li._isMenu = false;
      li.appendChild(item);
    }

    li._id = id;

    this.items.push(li);

    if (add) {
      li.addEventListener("click", (e) => {
        //console.log("menu click!");

        if (this.activeItem !== undefined && this.activeItem._isMenu) {
          //console.log("menu ignore");
          //ignore
          return;
        }

        this.click();
      });

      li.addEventListener("blur", (e) => {
        //console.log("blur", li.getAttribute("tabindex"));
        if (this.activeItem && !this.activeItem._isMenu) {
          this.activeItem = undefined;
        }
      });

      let onfocus = (e) => {
        if (this.activeItem !== undefined && this.activeItem._isMenu) {
          let active = this.activeItem;

          window.setTimeout(() => {
            if (this.activeItem && this.activeItem !== active) {
              active._menu.close();
            }
          }, 10);
        }
        if (li._isMenu) {
          li._menu.onselect = (item) => {
            //console.log("submenu select", item);
            this.onselect(item);
            this.close();
          };

          li._menu.start(false, false);
        }

        this.activeItem = li;
      };

      li.addEventListener("touchend", (e) => {
        onfocus(e);

        if (this.activeItem !== undefined && this.activeItem._isMenu) {
          console.log("menu ignore");
          //ignore
          return;
        }

        this.click();
      });

      li.addEventListener("focus", (e) => {
        onfocus(e);
      });

      li.addEventListener("touchmove", (e) => {
        //console.log("menu touchmove");
        onfocus(e);
        li.focus();
      });

      li.addEventListener("mouseenter", (e) => {
        //console.log("menu mouse enter");
        li.focus();
      });

      this.dom.appendChild(li);
    }

    return li;
  }

  seperator() {
    let bar = document.createElement("div");
    bar.setAttribute("class", "menuseparator");


    this.dom.appendChild(bar);

    return this;
  }

  menu(title) {
    let ret = document.createElement("menu-x");

    ret.setAttribute("title", title);
    this.addItem(ret);

    return ret;
  }

  calcSize() {

  }
}

Menu.SEP = Symbol("menu seperator");
UIBase$c.register(Menu);

class DropBox extends Button {
  constructor() {
    super();

    this.r = 5;
    this._menu = undefined;
    this._auto_depress = false;
    //this.prop = new ui_base.EnumProperty(undefined, {}, "", "", 0);

    this._onpress = this._onpress.bind(this);
  }

  init() {
    super.init();
    this.updateWidth();
  }

  setCSS() {
    //do not call parent classes's setCSS here
  }

  updateWidth() {
    //let ret = super.updateWidth(10);
    let dpi = this.getDPI();

    let ts = this.getDefault("DefaultText").size;
    let tw = measureText(this, this._genLabel(), undefined, undefined, ts).width/dpi + 8;
    tw = ~~tw;

    tw += 15;

    if (!this.getAttribute("simple")) {
      tw += 35;
    }

    if (tw != this._last_w) {
      this._last_w = tw;
      this.dom.style["width"] = tw + "px";
      this.style["width"] = tw + "px";
      this.width = tw;

      this.overrideDefault("defaultWidth", tw);
      this._repos_canvas();
      this._redraw();
    }

    return 0;
  }


  updateDataPath() {
    if (!this.ctx || !this.hasAttribute("datapath")) {
      return;
    }

    let prop = this.getPathMeta(this.ctx, this.getAttribute("datapath"));
    let val = this.getPathValue(this.ctx, this.getAttribute("datapath"));

    if (val === undefined) {
      this.disabled = true;
      return;
    } else {
      this.disabled = false;
    }

    if (this.prop !== undefined) {
      prop = this.prop;
    }

    let name = prop.ui_value_names[prop.keys[val]];
    if (name != this.getAttribute("name")) {
      this.setAttribute("name", name);
      this.updateName();
    }

    //console.log(name, val);
  }

  update() {
    super.update();

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }
  }

  _build_menu() {
    let prop = this.prop;

    if (this.prop === undefined) {
      return;
    }

    if (this._menu !== undefined && this._menu.parentNode !== undefined) {
      this._menu.remove();
    }

    let menu = this._menu = document.createElement("menu-x");
    menu.setAttribute("title", name);

    menu._dropbox = this;

    let valmap = {};
    let enummap = prop.values;
    let iconmap = prop.iconmap;
    let uimap = prop.ui_value_names;

    //console.log("   UIMAP", uimap);

    for (let k in enummap) {
      let uk = k;

      valmap[enummap[k]] = k;

      if (uimap !== undefined && k in uimap) {
        uk = uimap[k];
      }

      //menu.addItem(k, enummap[k], ":");
      if (iconmap && iconmap[k]) {
        menu.addItemExtra(uk, enummap[k], undefined, iconmap[k]);
      } else {
        menu.addItem(uk, enummap[k]);
      }
    }

    menu.onselect = (id) => {
      //console.log("dropbox select");
      this._pressed = false;
      this._redraw();
      //console.trace("got click!", id, ":::");

      this._menu = undefined;
      this.prop.setValue(id);

      this.setAttribute("name", this.prop.ui_value_names[valmap[id]]);
      if (this.onselect) {
        this.onselect(id);
      }

      if (this.hasAttribute("datapath") && this.ctx) {
        console.log("setting data api value", id, this.getAttribute("datapath"));
        this.setPathValue(this.ctx, this.getAttribute("datapath"), id);
      }
    };
  }

  _onpress(e) {
    if (this._menu !== undefined) {
      this._menu.close();
      this._menu = undefined;
      return;
    }

    this._build_menu();

    console.log("menu dropbox click", this._menu);

    if (this._menu === undefined) {
      return;
    }

    this._menu._dropbox = this;
    this.dom._background = this.getDefault("BoxDepressed");
    this._background = this.getDefault("BoxDepressed");
    this._redraw();
    this._pressed = true;
    this.setCSS();

    let onclose = this._menu.onclose;
    this._menu.onclose = () => {
      this._pressed = false;
      this._redraw();

      let menu = this._menu;
      if (menu) {
        this._menu = undefined;
        menu._dropbox = undefined;
      }

      if (onclose) {
        onclose.call(menu);
      }
    };

    let menu = this._menu;
    let screen = this.getScreen();

    let dpi = this.getDPI();

    let x = e.x, y = e.y;
    let rects = this.dom.getClientRects();

    x = rects[0].x;
    y = rects[0].y + Math.ceil(rects[0].height);

    let con = this._popup = menu._popup = screen.popup(this, x, y, false);
    con.noMarginsOrPadding();

    con.add(menu);
    menu.start();
  }

  _redraw() {
    if (this.getAttribute("simple")) {
      let color;

      if (this._highlight) {
        drawRoundBox2(this, {canvas: this.dom, g: this.g, color: this.getDefault("BoxHighlight") });
      }

      if (this._focus) {
        drawRoundBox2(this, {canvas: this.dom, g : this.g, color : this.getDefault("BoxHighlight"), op : "stroke", no_clear : true});
        drawRoundBox(this, this.dom, this.g, undefined, undefined, 2, "stroke");
      }

      this._draw_text();
      return;
    }

    super._redraw(false);

    let g = this.g;
    let w = this.dom.width, h = this.dom.height;
    let dpi = this.getDPI();

    let p = 10*dpi;
    let p2 = 4*dpi;


    //*
    let bg = this.getDefault("dropTextBG");
    if (bg !== undefined) {
      g.fillStyle = bg;

      g.beginPath();
      g.rect(p2, p2, this.dom.width - p2 - h, this.dom.height - p2 * 2);
      g.fill();
    }
    //*/

    g.fillStyle = "rgba(50, 50, 50, 0.2)";
    g.strokeStyle = "rgba(50, 50, 50, 0.8)";
    g.beginPath();
    /*
    g.moveTo(w-p, p);
    g.lineTo(w-(p+h*0.25), h-p);
    g.lineTo(w-(p+h*0.5), p);
    g.closePath();
    //*/

    let sz = 0.3;
    g.moveTo(w-h*0.5-p, p);
    g.lineTo(w-p, p);
    g.moveTo(w-h*0.5-p, p+sz*h/3);
    g.lineTo(w-p, p+sz*h/3);
    g.moveTo(w-h*0.5-p, p+sz*h*2/3);
    g.lineTo(w-p, p+sz*h*2/3);

    g.lineWidth = 1;
    g.stroke();

    this._draw_text();
  }

  set menu(val) {
    this._menu = val;

    if (val !== undefined) {
      this._name = val.title;
      this.updateName();
    }
  }

  setValue(val) {
    if (this.prop !== undefined) {
      this.prop.setValue(val);
      let val2=val;

      if (val2 in this.prop.keys)
        val2 = this.prop.keys[val2];
      val2 = this.prop.ui_value_names[val2];

      this.setAttribute("name", ""+val2);
      this._name = ""+val2;
    } else {
      this.setAttribute("name", ""+val);
      this._name = ""+val;
    }

    if (this.onchange) {
      this.onchange(val);
    }

    this.setCSS();
    this.update();
    this._redraw();
  }

  get menu() {
    return this._menu;
  }

  static define() {return {
    tagname : "dropbox-x",
    style   : "dropbox"
  };}
}

UIBase$c.register(DropBox);

class MenuWrangler {
  constructor() {
    this.screen = undefined;
    this.menustack = [];

    this.closetimer = 0;
    this.closeOnMouseUp = undefined;
  }

  get menu() {
    return this.menustack.length > 0 ? this.menustack[this.menustack.length-1] : undefined;
  }

  pushMenu(menu) {
    if (this.menustack.length === 0) {
      this.closeOnMouseUp = true;
    }

    this.menustack.push(menu);
  }

  popMenu(menu) {
    return this.menustack.pop();
  }

  endMenus() {
    for (let menu of this.menustack) {
      menu.close();
    }

    this.menustack = [];
  }

  on_keydown(e) {
    if (this.menu === undefined) {
      return;
    }

    console.log("key", e.keyCode);
    let menu = this.menu;

    switch (e.keyCode) {
      case 37: //left
      case 39: //right
        if (menu._dropbox) {
          let dropbox = menu._dropbox;

          if (e.keyCode === 37) {
            dropbox = dropbox.previousElementSibling;
          } else {
            dropbox = dropbox.nextElementSibling;
          }

          if (dropbox !== undefined && dropbox instanceof DropBox) {
            this.endMenus();
            dropbox._onpress(e);
          }
        }
        break;
      case 38: //up
      case 40: //down
        let item = menu.activeItem;
        if (!item) {
          item = menu.items[0];
        }

        if (!item) {
          return;
        }

        let item2;
        let i = menu.items.indexOf(item);

        if (e.keyCode == 38) {
          i = (i - 1 + menu.items.length) % menu.items.length;
        } else {
          i = (i + 1) % menu.items.length;
        }

        item2 = menu.items[i];

        if (item2) {
          menu.activeItem = item2;

          item.blur();
          item2.focus();
        }
        break;
      case 13: //return key
      case 32: //space key
        menu.click(menu.activeItem);
        break;
      case 27: //escape key
        menu.close();
        break;
    }
  }

  on_mousedown(e) {
    if (this.menu === undefined || this.screen === undefined) {
      this.closetimer = time_ms();
      return;
    }

    let screen = this.screen;
    let x = e.pageX, y = e.pageY;

    let element = screen.pickElement(x, y);
    console.log("wrangler mousedown", element);

    if (element !== undefined && element instanceof DropBox) {
      this.endMenus();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  on_mouseup(e) {
    if (this.menu === undefined || this.screen === undefined) {
      this.closetimer = time_ms();
      return;
    }

    let screen = this.screen;
    let x = e.pageX, y = e.pageY;

    let element = screen.pickElement(x, y, undefined, undefined, DropBox);
    if (element !== undefined) {
      this.closeOnMouseUp = false;
    } else {
      element = screen.pickElement(x, y, undefined, undefined, Menu);

      //closeOnMouseUp
      if (element && this.closeOnMouseUp) {
        element.click();
      }
    }

  }

  on_mousemove(e) {
    if (this.menu === undefined || this.screen === undefined) {
      this.closetimer = time_ms();
      return;
    }

    let screen = this.screen;
    let x = e.pageX, y = e.pageY;

    let element = screen.pickElement(x, y);

    if (element === undefined) {
      return;
    }

    if (element instanceof DropBox && element.menu !== this.menu && element.getAttribute("simple")) {
      //destroy entire menu stack
      this.endMenus();

      this.closetimer = time_ms();

      //start new menu
      element._onpress(e);
      return;
    }

    let ok = false;

    let w = element;
    while (w) {
      if (w === this.menu) {
        ok = true;
        break;
      }

      if (w instanceof DropBox && w.menu === this.menu) {
        ok = true;
        break;
      }

      w = w.parentWidget;
    }

    if (!ok && (time_ms() - this.closetimer > exports.menu_close_time)) {
      this.endMenus();
    } else if (ok) {
      this.closetimer = time_ms();
    }
  }
}

let menuWrangler = new MenuWrangler();
let wrangerStarted = false;

function startMenuEventWrangling(screen) {
  menuWrangler.screen = screen;

  if (wrangerStarted) {
    return;
  }

  wrangerStarted = true;

  for (let k in DomEventTypes) {
    if (menuWrangler[k] === undefined) {
      continue;
    }

    let dom = k.search("key") >= 0 ? window : document.body;
    dom = window;
    dom.addEventListener(DomEventTypes[k], menuWrangler[k].bind(menuWrangler), {passive : false, capture : true});
  }

  menuWrangler.screen = screen;
}

function setWranglerScreen(screen) {
  startMenuEventWrangling(screen);
}

function getWranglerScreen() {
  return menuWrangler.screen;
}

const LastKey = Symbol("LastToolPanelId");
let tool_idgen$1 = 0;

/*
*
* This panel shows the most recently executed ToolOp's
* settings.  It assumes that recent toolops are accessible
* in ctx.last_tool.
* */
class LastToolPanel extends ColumnFrame {
  constructor() {
    super();

    this._tool_id = undefined;
    this.useDataPathUndo = false;
  }

  init() {
    super.init();

    this.useDataPathUndo = false;
    this.rebuild();
  }

  rebuild() {
    let ctx = this.ctx;
    if (ctx === undefined) {
      this._tool_id = -1; //wait for .ctx
      return;
    }

    this.clear();

    this.label("Recent Command Settings");

    //don't process the root toolop
    let bad = ctx.toolstack.length === 0;
    bad = bad || ctx.toolstack[ctx.toolstack.cur].undoflag & UndoFlags.IS_UNDO_ROOT;

    if (bad) {
      this.setCSS();
      return;
    }

    let tool = ctx.toolstack[ctx.toolstack.cur];
    let def = tool.constructor.tooldef();
    let name = def.uiname !== undefined ? def.uiname : def.name;

    let panel = this.panel(def.uiname);

    let fakecls = {};
    fakecls.constructor = fakecls;

    //in theory it shouldn't matter if multiple last tool panels
    //override _last_tool, since they all access the same data
    this.ctx.state._last_tool = fakecls;
    let lastkey = tool[LastKey];

    let getTool = () => {
      let tool = this.ctx.toolstack[this.ctx.toolstack.cur];
      if (!tool || tool[LastKey] !== lastkey) {
        return undefined;
      }

      return tool;
    };

    let st = this.ctx.api.mapStruct(fakecls, true);
    let paths = [];

    function defineProp(k, key) {
      Object.defineProperty(fakecls, key, {
        get : function() {
          let tool = getTool();
          if (tool) {
            return tool.inputs[k].getValue();
          }
        },

        set : function(val) {
          let tool = getTool();
          if (tool) {
            tool.inputs[k].setValue(val);
            ctx.toolstack.rerun(tool);

            window.redraw_viewport();
          }
        }
      });
    }

    for (let k in tool.inputs) {
      let prop = tool.inputs[k];

      console.log("PROP FLAG", prop.flag, k);
      if (prop.flag & (PropFlags.PRIVATE|PropFlags.READ_ONLY)) {
        continue;
      }

      let uiname = prop.uiname !== undefined ? prop.uiname : k;

      prop.uiname = uiname;
      let apikey = k.replace(/[\t ]/g, "_");

      let dpath = new DataPath(apikey, apikey, prop, DataTypes.PROP);
      st.add(dpath);

      paths.push(dpath);

      defineProp(k, apikey);
    }

    for (let dpath of paths) {
      let path = "last_tool." + dpath.path;

      panel.label(dpath.data.uiname);
      panel.prop(path);
    }
    this.setCSS();

    console.log("Building last tool settings");
  }

  update() {
    super.update();
    let ctx = this.ctx;

    if (ctx.toolstack.length == 0) {
      return;
    }

    let tool = ctx.toolstack[ctx.toolstack.cur];
    if (!(LastKey in tool) || tool[LastKey] !== this._tool_id) {
      tool[LastKey] = tool_idgen$1++;
      this._tool_id = tool[LastKey];

      this.rebuild();
    }
  }

  static define() {return {
    tagname : "last-tool-panel-x"
  }}
}
UIBase.register(LastToolPanel);

"use strict";

function aabb_overlap_area(pos1, size1, pos2, size2) {
  let r1=0.0, r2=0.0;

  for (let i=0; i<2; i++) {
    let a1 = pos1[i], a2 = pos2[i];
    let b1 = pos1[i] + size1[i];
    let b2 = pos2[i] + size2[i];

    if (b1 >= a2 && a1 <= b2) {
      let r = a2 - b1;
      
      if (i) {
        r2 = r;
      } else {
        r1 = r;
      }
    }
  }

  return r1*r2;
}

function aabb_isect_2d(pos1, size1, pos2, size2) {
  var ret=0;
  for (var i=0; i<2; i++) {
    var a=pos1[i];
    var b=pos1[i]+size1[i];
    var c=pos2[i];
    var d=pos2[i]+size2[i];
    if (b>=c&&a<=d)
      ret+=1;
  }
  return ret==2;
};


//XXX refactor to use es6 classes,
//    or at last the class system in typesystem.js
function init_prototype(cls, proto) {
  for (var k in proto) {
    cls.prototype[k] = proto[k];
  }
  
  return cls.prototype;
}

function inherit$1(cls, parent, proto) {
  cls.prototype = Object.create(parent.prototype);
  
  for (var k in proto) {
    cls.prototype[k] = proto[k];
  }
  
  return cls.prototype;
}

var Vector2$8 = Vector2, Vector3$2 = Vector3;
var Vector4$3 = Vector4, Matrix4$3 = Matrix4;

var set$2 = set$1;

//everything below here was compiled from es6 code  
//variables starting with $ are function static local vars,
//like in C.  don't use them outside their owning functions.
//
//except for $_mh and $_swapt.  they were used with a C macro
//preprocessor.
var $_mh, $_swapt;

//XXX destroy me
const feps = 2.22e-16;

const COLINEAR = 1;
const LINECROSS = 2;
const COLINEAR_ISECT = 3;

var _cross_vec1=new Vector3$2();
var _cross_vec2=new Vector3$2();

const SQRT2 = Math.sqrt(2.0);
const FEPS_DATA = {
  F16 : 1.11e-16,
  F32 : 5.96e-08,
  F64 : 4.88e-04
};

/*use 32 bit epsilon by default, since we're often working from
  32-bit float data.  note that javascript uses 64-bit doubles 
  internally.*/
const FEPS = FEPS_DATA.F32;
const FLOAT_MIN = -1e+21;
const FLOAT_MAX = 1e+22;
const Matrix4UI = Matrix4$3;

/*
var Matrix4UI=exports.Matrix4UI = function(loc, rot, size) {
  if (rot==undefined) {
      rot = undefined;
  }
  
  if (size==undefined) {
      size = undefined;
  }
  
  Object.defineProperty(this, "loc", {get: function() {
    var t=new Vector3();
    this.decompose(t);
    return t;
  }, set: function(loc) {
    var l=new Vector3(), r=new Vector3(), s=new Vector3();
    this.decompose(l, r, s);
    this.calc(loc, r, s);
  }});
  
  Object.defineProperty(this, "size", {get: function() {
    var t=new Vector3();
    this.decompose(undefined, undefined, t);
    return t;
  }, set: function(size) {
    var l=new Vector3(), r=new Vector3(), s=new Vector3();
    this.decompose(l, r, s);
    this.calc(l, r, size);
  }});
  
  Object.defineProperty(this, "rot", {get: function() {
    var t=new Vector3();
    this.decompose(undefined, t);
    return t;
  }, set: function(rot) {
    var l=new Vector3(), r=new Vector3(), s=new Vector3();
    this.decompose(l, r, s);
    this.calc(l, rot, s);
  }});
  
  if (loc instanceof Matrix4) {
      this.load(loc);
      return ;
  }
  
  if (rot==undefined)
    rot = [0, 0, 0];
  if (size==undefined)
    size = [1.0, 1.0, 1.0];
  this.makeIdentity();
  this.calc(loc, rot, size);
};

Matrix4UI.prototype = inherit(Matrix4UI, Matrix4, {
  calc : function(loc, rot, size) {
    this.rotate(rot[0], rot[1], rot[2]);
    this.scale(size[0], size[1], size[2]);
    this.translate(loc[0], loc[1], loc[2]);
  }

});
*/

if (FLOAT_MIN!=FLOAT_MIN||FLOAT_MAX!=FLOAT_MAX) {
    FLOAT_MIN = 1e-05;
    FLOAT_MAX = 1000000.0;
    console.log("Floating-point 16-bit system detected!");
}

var _static_grp_points4=new Array(4);
var _static_grp_points8=new Array(8);
function get_rect_points(p, size) {
  var cs;
  if (p.length==2) {
      cs = _static_grp_points4;
      cs[0] = p;
      cs[1] = [p[0]+size[0], p[1]];
      cs[2] = [p[0]+size[0], p[1]+size[1]];
      cs[3] = [p[0], p[1]+size[1]];
  }
  else 
    if (p.length==3) {
      cs = _static_grp_points8;
      cs[0] = p;
      cs[1] = [p[0]+size[0], p[1], p[2]];
      cs[2] = [p[0]+size[0], p[1]+size[1], p[2]];
      cs[3] = [p[0], p[1]+size[0], p[2]];
      cs[4] = [p[0], p[1], p[2]+size[2]];
      cs[5] = [p[0]+size[0], p[1], p[2]+size[2]];
      cs[6] = [p[0]+size[0], p[1]+size[1], p[2]+size[2]];
      cs[7] = [p[0], p[1]+size[0], p[2]+size[2]];
  }
  else {
    throw "get_rect_points has no implementation for "+p.length+"-dimensional data";
  }
  return cs;
};

function get_rect_lines(p, size) {
  var ps=get_rect_points(p, size);
  if (p.length==2) {
      return [[ps[0], ps[1]], [ps[1], ps[2]], [ps[2], ps[3]], [ps[3], ps[0]]];
  }
  else 
    if (p.length==3) {
      var l1=[[ps[0], ps[1]], [ps[1], ps[2]], [ps[2], ps[3]], [ps[3], ps[0]]];
      var l2=[[ps[4], ps[5]], [ps[5], ps[6]], [ps[6], ps[7]], [ps[7], ps[4]]];
      l1.concat(l2);
      l1.push([ps[0], ps[4]]);
      l1.push([ps[1], ps[5]]);
      l1.push([ps[2], ps[6]]);
      l1.push([ps[3], ps[7]]);
      return l1;
  }
  else {
    throw "get_rect_points has no implementation for "+p.length+"-dimensional data";
  }
};

var $vs_simple_tri_aabb_isect=[0, 0, 0];
function simple_tri_aabb_isect(v1, v2, v3, min, max) {
  $vs_simple_tri_aabb_isect[0] = v1;
  $vs_simple_tri_aabb_isect[1] = v2;
  $vs_simple_tri_aabb_isect[2] = v3;
  for (var i=0; i<3; i++) {
      var isect=true;
      for (var j=0; j<3; j++) {
          if ($vs_simple_tri_aabb_isect[j][i]<min[i]||$vs_simple_tri_aabb_isect[j][i]>=max[i])
            isect = false;
      }
      if (isect)
        return true;
  }
  return false;
};

class MinMax {
  constructor(totaxis) {
    if (totaxis==undefined) {
        totaxis = 1;
    }
    this.totaxis = totaxis;
    if (totaxis!=1) {
        let cls;
        
        switch (totaxis) {
          case 2:
            cls = Vector2$8;
            break;
          case 3:
            cls = Vector3$2;
            break;
          case 4:
            cls = Vector4$3;
            break;
          default:
            cls = Array;
            break;
        }
        
        this._min = new cls(totaxis);
        this._max = new cls(totaxis);
        this.min = new cls(totaxis);
        this.max = new cls(totaxis);
    }
    else {
      this.min = this.max = 0;
      this._min = FLOAT_MAX;
      this._max = FLOAT_MIN;
    }
    this.reset();
    this._static_mr_co = new Array(this.totaxis);
    this._static_mr_cs = new Array(this.totaxis*this.totaxis);
  }
  
  load(mm) {
    if (this.totaxis==1) {
        this.min = mm.min;
        this.max = mm.max;
        this._min = mm.min;
        this._max = mm.max;
    }
    else {
      this.min = new Vector3$2(mm.min);
      this.max = new Vector3$2(mm.max);
      this._min = new Vector3$2(mm._min);
      this._max = new Vector3$2(mm._max);
    }
  }
  
  reset() {
    var totaxis=this.totaxis;
    if (totaxis==1) {
        this.min = this.max = 0;
        this._min = FLOAT_MAX;
        this._max = FLOAT_MIN;
    }
    else {
      for (var i=0; i<totaxis; i++) {
          this._min[i] = FLOAT_MAX;
          this._max[i] = FLOAT_MIN;
          this.min[i] = 0;
          this.max[i] = 0;
      }
    }
  }

  minmax_rect(p, size) {
    var totaxis=this.totaxis;
    var cs=this._static_mr_cs;
    if (totaxis==2) {
        cs[0] = p;
        cs[1] = [p[0]+size[0], p[1]];
        cs[2] = [p[0]+size[0], p[1]+size[1]];
        cs[3] = [p[0], p[1]+size[1]];
    }
    else 
      if (totaxis = 3) {
        cs[0] = p;
        cs[1] = [p[0]+size[0], p[1], p[2]];
        cs[2] = [p[0]+size[0], p[1]+size[1], p[2]];
        cs[3] = [p[0], p[1]+size[0], p[2]];
        cs[4] = [p[0], p[1], p[2]+size[2]];
        cs[5] = [p[0]+size[0], p[1], p[2]+size[2]];
        cs[6] = [p[0]+size[0], p[1]+size[1], p[2]+size[2]];
        cs[7] = [p[0], p[1]+size[0], p[2]+size[2]];
    }
    else {
      throw "Minmax.minmax_rect has no implementation for "+totaxis+"-dimensional data";
    }
    for (var i=0; i<cs.length; i++) {
        this.minmax(cs[i]);
    }
  }

  minmax(p) {
    var totaxis=this.totaxis;
    
    if (totaxis==1) {
        this._min = this.min = Math.min(this._min, p);
        this._max = this.max = Math.max(this._max, p);
    } else if (totaxis == 2) {
      this._min[0] = this.min[0] = Math.min(this._min[0], p[0]);
      this._min[1] = this.min[1] = Math.min(this._min[1], p[1]);
      this._max[0] = this.max[0] = Math.max(this._max[0], p[0]);
      this._max[1] = this.max[1] = Math.max(this._max[1], p[1]);
    } else if (totaxis == 3) {
      this._min[0] = this.min[0] = Math.min(this._min[0], p[0]);
      this._min[1] = this.min[1] = Math.min(this._min[1], p[1]);
      this._min[2] = this.min[2] = Math.min(this._min[2], p[2]);
      this._max[0] = this.max[0] = Math.max(this._max[0], p[0]);
      this._max[1] = this.max[1] = Math.max(this._max[1], p[1]);
      this._max[2] = this.max[2] = Math.max(this._max[2], p[2]);
    } else {
      for (var i=0; i<totaxis; i++) {
          this._min[i] = this.min[i] = Math.min(this._min[i], p[i]);
          this._max[i] = this.max[i] = Math.max(this._max[i], p[i]);
      }
    }
  }

  static fromSTRUCT(reader) {
    var ret=new MinMax();
    reader(ret);
    return ret;
  }
};
MinMax.STRUCT = "\n  math.MinMax {\n    min     : vec3;\n    max     : vec3;\n    _min    : vec3;\n    _max    : vec3;\n    totaxis : int;\n  }\n";

function winding(a, b, c, zero_z, tol) {
  if (tol == undefined) tol = 0.0;
  
  for (var i=0; i<a.length; i++) {
      _cross_vec1[i] = b[i]-a[i];
      _cross_vec2[i] = c[i]-a[i];
  }
  if (a.length==2 || zero_z) {
      _cross_vec1[2] = 0.0;
      _cross_vec2[2] = 0.0;
  }
  _cross_vec1.cross(_cross_vec2);
  return _cross_vec1[2]>tol;
};
function inrect_2d(p, pos, size) {
  if (p==undefined||pos==undefined||size==undefined) {
      console.trace();
      console.log("Bad paramters to inrect_2d()");
      console.log("p: ", p, ", pos: ", pos, ", size: ", size);
      return false;
  }
  return p[0]>=pos[0]&&p[0]<=pos[0]+size[0]&&p[1]>=pos[1]&&p[1]<=pos[1]+size[1];
};
var $smin_aabb_isect_line_2d=new Vector2$8();
var $ssize_aabb_isect_line_2d=new Vector2$8();
var $sv1_aabb_isect_line_2d=new Vector2$8();
var $ps_aabb_isect_line_2d=[new Vector2$8(), new Vector2$8(), new Vector2$8()];
var $l1_aabb_isect_line_2d=[0, 0];
var $smax_aabb_isect_line_2d=new Vector2$8();
var $sv2_aabb_isect_line_2d=new Vector2$8();
var $l2_aabb_isect_line_2d=[0, 0];
function aabb_isect_line_2d(v1, v2, min, max) {
  for (var i=0; i<2; i++) {
      $smin_aabb_isect_line_2d[i] = Math.min(min[i], v1[i]);
      $smax_aabb_isect_line_2d[i] = Math.max(max[i], v2[i]);
  }
  $smax_aabb_isect_line_2d.sub($smin_aabb_isect_line_2d);
  $ssize_aabb_isect_line_2d.load(max).sub(min);
  if (!aabb_isect_2d($smin_aabb_isect_line_2d, $smax_aabb_isect_line_2d, min, $ssize_aabb_isect_line_2d))
    return false;
  for (var i=0; i<4; i++) {
      if (inrect_2d(v1, min, $ssize_aabb_isect_line_2d))
        return true;
      if (inrect_2d(v2, min, $ssize_aabb_isect_line_2d))
        return true;
  }
  $ps_aabb_isect_line_2d[0] = min;
  $ps_aabb_isect_line_2d[1][0] = min[0];
  $ps_aabb_isect_line_2d[1][1] = max[1];
  $ps_aabb_isect_line_2d[2] = max;
  $ps_aabb_isect_line_2d[3][0] = max[0];
  $ps_aabb_isect_line_2d[3][1] = min[1];
  $l1_aabb_isect_line_2d[0] = v1;
  $l1_aabb_isect_line_2d[1] = v2;
  for (var i=0; i<4; i++) {
      var a=$ps_aabb_isect_line_2d[i], b=$ps_aabb_isect_line_2d[(i+1)%4];
      $l2_aabb_isect_line_2d[0] = a;
      $l2_aabb_isect_line_2d[1] = b;
      if (line_line_cross($l1_aabb_isect_line_2d, $l2_aabb_isect_line_2d))
        return true;
  }
  return false;
};


function expand_rect2d(pos, size, margin) {
  pos[0]-=Math.floor(margin[0]);
  pos[1]-=Math.floor(margin[1]);
  size[0]+=Math.floor(margin[0]*2.0);
  size[1]+=Math.floor(margin[1]*2.0);
};

function expand_line(l, margin) {
  var c=new Vector3$2();
  c.add(l[0]);
  c.add(l[1]);
  c.mulScalar(0.5);
  l[0].sub(c);
  l[1].sub(c);
  var l1=l[0].vectorLength();
  var l2=l[1].vectorLength();
  l[0].normalize();
  l[1].normalize();
  l[0].mulScalar(margin+l1);
  l[1].mulScalar(margin+l2);
  l[0].add(c);
  l[1].add(c);
  return l;
};

function colinear(a, b, c) {
  for (var i=0; i<3; i++) {
      _cross_vec1[i] = b[i]-a[i];
      _cross_vec2[i] = c[i]-a[i];
  }
  var limit=2.2e-16;
  if (a.vectorDistance(b)<feps*100&&a.vectorDistance(c)<feps*100) {
      return true;
  }
  if (_cross_vec1.dot(_cross_vec1)<limit||_cross_vec2.dot(_cross_vec2)<limit)
    return true;
  _cross_vec1.cross(_cross_vec2);
  return _cross_vec1.dot(_cross_vec1)<limit;
};

var _llc_l1=[new Vector3$2(), new Vector3$2()];
var _llc_l2=[new Vector3$2(), new Vector3$2()];
var _llc_l3=[new Vector3$2(), new Vector3$2()];
var _llc_l4=[new Vector3$2(), new Vector3$2()];

var lli_v1 = new Vector3$2(), lli_v2 = new Vector3$2(), lli_v3 = new Vector3$2(), lli_v4 = new Vector3$2();

var _zero_cn = new Vector3$2();
var _tmps_cn = cachering.fromConstructor(Vector3$2, 64);
var _rets_cn = cachering.fromConstructor(Vector3$2, 64);

//vec1, vec2 should both be normalized
function corner_normal(vec1, vec2, width) {
  var ret = _rets_cn.next().zero();

  var vec = _tmps_cn.next().zero();
  vec.load(vec1).add(vec2).normalize();

  /*
  ret.load(vec).mulScalar(width);
  return ret;
  */

  //handle colinear case
  if (Math.abs(vec1.normalizedDot(vec2)) > 0.9999) {
    if (vec1.dot(vec2) > 0.0001) {
      ret.load(vec1).add(vec2).normalize();
    } else {
      ret.load(vec1).normalize();
    }

    ret.mulScalar(width);

    return ret;
  } else { //XXX
    //ret.load(vec).mulScalar(width);
    //return ret;
  }

  vec1 = _tmps_cn.next().load(vec1).mulScalar(width);
  vec2 = _tmps_cn.next().load(vec2).mulScalar(width);

  var p1 = _tmps_cn.next().load(vec1);
  var p2 = _tmps_cn.next().load(vec2);

  vec1.addFac(vec1, 0.01);
  vec2.addFac(vec2, 0.01);

  var sc = 1.0;

  p1[0] += vec1[1]*sc;
  p1[1] += -vec1[0]*sc;

  p2[0] += -vec2[1]*sc;
  p2[1] += vec2[0]*sc;

  var p = line_line_isect(vec1, p1, vec2, p2, false);

  if (p == undefined || p === COLINEAR_ISECT || p.dot(p) < 0.000001) {
    ret.load(vec1).add(vec2).normalize().mulScalar(width);
  } else {
    ret.load(p);

    if (vec.dot(vec) > 0 && vec.dot(ret) < 0) {
      ret.load(vec).mulScalar(width);
    }
  }

  return ret;
}

//test_segment is optional, true
function line_line_isect(v1, v2, v3, v4, test_segment) {
  test_segment = test_segment === undefined ? true : test_segment;

  if (!line_line_cross(v1, v2, v3, v4)) {
    return undefined;
  }
  
  /*
  on factor;
  off period;
  
  xa := xa1 + (xa2 - xa1)*t1;
  xb := xb1 + (xb2 - xb1)*t2;
  ya := ya1 + (ya2 - ya1)*t1;
  yb := yb1 + (yb2 - yb1)*t2;
  
  f1 := xa - xb;
  f2 := ya - yb;
  
  f := solve({f1, f2}, {t1, t2});
  ft1 := part(f, 1, 1, 2);
  ft2 := part(f, 1, 2, 2);
  
  */
  
  var xa1 = v1[0], xa2 = v2[0], ya1 = v1[1], ya2 = v2[1];
  var xb1 = v3[0], xb2 = v4[0], yb1 = v3[1], yb2 = v4[1];
  
  var div = ((xa1-xa2)*(yb1-yb2)-(xb1-xb2)*(ya1-ya2));
  if (div < 0.00000001) { //parallel but intersecting lines.
    return COLINEAR_ISECT;
  } else { //intersection exists
    var t1 = (-((ya1-yb2)*xb1-(yb1-yb2)*xa1-(ya1-yb1)*xb2))/div;
    
    return lli_v1.load(v1).interp(v2, t1);
  }
}

function line_line_cross(v1, v2, v3, v4) {
  var l1 = _llc_l3, l2 = _llc_l4;
  l1[0].load(v1), l1[1].load(v2), l2[0].load(v3), l2[1].load(v4);
  
  /*
  var limit=feps*1000;
  if (Math.abs(l1[0].vectorDistance(l2[0])+l1[1].vectorDistance(l2[0])-l1[0].vectorDistance(l1[1]))<limit) {
      return true;
  }
  if (Math.abs(l1[0].vectorDistance(l2[1])+l1[1].vectorDistance(l2[1])-l1[0].vectorDistance(l1[1]))<limit) {
      return true;
  }
  if (Math.abs(l2[0].vectorDistance(l1[0])+l2[1].vectorDistance(l1[0])-l2[0].vectorDistance(l2[1]))<limit) {
      return true;
  }
  if (Math.abs(l2[0].vectorDistance(l1[1])+l2[1].vectorDistance(l1[1])-l2[0].vectorDistance(l2[1]))<limit) {
      return true;
  }
  //*/
  
  var a=l1[0];
  var b=l1[1];
  var c=l2[0];
  var d=l2[1];
  var w1=winding(a, b, c);
  var w2=winding(c, a, d);
  var w3=winding(a, b, d);
  var w4=winding(c, b, d);
  return (w1==w2)&&(w3==w4)&&(w1!=w3);
};

var _asi_v1 = new Vector3$2();
var _asi_v2 = new Vector3$2();
var _asi_v3 = new Vector3$2();
var _asi_v4 = new Vector3$2();
var _asi_v5 = new Vector3$2();
var _asi_v6 = new Vector3$2();

function point_in_aabb_2d(p, min, max) {
  return p[0] >= min[0] && p[0] <= max[0] && p[1] >= min[1] && p[1] <= max[1];
}

var _asi2d_v1 = new Vector2$8();
var _asi2d_v2 = new Vector2$8();
var _asi2d_v3 = new Vector2$8();
var _asi2d_v4 = new Vector2$8();
var _asi2d_v5 = new Vector2$8();
var _asi2d_v6 = new Vector2$8();
function aabb_sphere_isect_2d(p, r, min, max) {
  var v1 = _asi2d_v1, v2 = _asi2d_v2, v3 = _asi2d_v3, mvec = _asi2d_v4;
  var v4 = _asi2d_v5;
  
  p = _asi2d_v6.load(p);
  v1.load(p);
  v2.load(p);
  
  min = _asi_v5.load(min);
  max = _asi_v6.load(max);
  
  mvec.load(max).sub(min).normalize().mulScalar(r+0.0001);
  
  v1.sub(mvec);
  v2.add(mvec);
  v3.load(p);
  
  var ret = point_in_aabb_2d(v1, min, max) || point_in_aabb_2d(v2, min, max)
         || point_in_aabb_2d(v3, min, max);
  
  if (ret)
      return ret;
  
  /*
  v1.load(min).add(max).mulScalar(0.5);
  ret = ret || v1.vectorDistance(p) < r;
  
  v1.load(min);
  ret = ret || v1.vectorDistance(p) < r;
  
  v1.load(max);
  ret = ret || v1.vectorDistance(p) < r;
  
  v1[0] = min[0], v1[1] = max[1];
  ret = ret || v1.vectorDistance(p) < r;
  
  v1[0] = max[0], v1[1] = min[1];
  ret = ret || v1.vectorDistance(p) < r;
  */
  //*
  v1.load(min);
  v2[0] = min[0]; v2[1] = max[1];
  ret = ret || dist_to_line_2d(p, v1, v2) < r;
  
  v1.load(max);
  v2[0] = max[0]; v2[1] = max[1];
  ret = ret || dist_to_line_2d(p, v1, v2) < r;

  v1.load(max);
  v2[0] = max[0]; v2[1] = min[1];
  ret = ret || dist_to_line_2d(p, v1, v2) < r;

  v1.load(max);
  v2[0] = min[0]; v2[1] = min[1];
  ret = ret || dist_to_line_2d(p, v1, v2) < r;
  //*/
  return ret;
};

function point_in_aabb(p, min, max) {
  return p[0] >= min[0] && p[0] <= max[0] && p[1] >= min[1] && p[1] <= max[1]
         && p[2] >= min[2] && p[2] <= max[2];
}
function aabb_sphere_isect(p, r, min, max) {
  var v1 = _asi_v1, v2 = _asi_v2, v3 = _asi_v3, mvec = _asi_v4;
  min = _asi_v5.load(min);
  max = _asi_v6.load(max);
  
  if (min.length == 2) {
    min[2] = max[2] = 0.0;
  }
  
  mvec.load(max).sub(min).normalize().mulScalar(r+0.0001);
  v1.sub(mvec);
  v2.add(mvec);
  v3.load(p);
  
  //prevent NaN on 2d vecs
  if (p.length == 2) {
      mvec[2] = v1[2] = v2[2] = v3[2] = 0.0;
  }
  
  return point_in_aabb(v1, min, max) || point_in_aabb(v2, min, max) ||
         point_in_aabb(v3, min, max);
};

function point_in_tri(p, v1, v2, v3) {
  var w1=winding(p, v1, v2);
  var w2=winding(p, v2, v3);
  var w3=winding(p, v3, v1);
  return w1==w2&&w2==w3;
};

function convex_quad(v1, v2, v3, v4) {
  return line_line_cross([v1, v3], [v2, v4]);
};

var $e1_normal_tri=new Vector3$2();
var $e3_normal_tri=new Vector3$2();
var $e2_normal_tri=new Vector3$2();
function normal_tri(v1, v2, v3) {
  $e1_normal_tri[0] = v2[0]-v1[0];
  $e1_normal_tri[1] = v2[1]-v1[1];
  $e1_normal_tri[2] = v2[2]-v1[2];
  $e2_normal_tri[0] = v3[0]-v1[0];
  $e2_normal_tri[1] = v3[1]-v1[1];
  $e2_normal_tri[2] = v3[2]-v1[2];
  $e3_normal_tri[0] = $e1_normal_tri[1]*$e2_normal_tri[2]-$e1_normal_tri[2]*$e2_normal_tri[1];
  $e3_normal_tri[1] = $e1_normal_tri[2]*$e2_normal_tri[0]-$e1_normal_tri[0]*$e2_normal_tri[2];
  $e3_normal_tri[2] = $e1_normal_tri[0]*$e2_normal_tri[1]-$e1_normal_tri[1]*$e2_normal_tri[0];
  
  var _len=Math.sqrt(($e3_normal_tri[0]*$e3_normal_tri[0]+$e3_normal_tri[1]*$e3_normal_tri[1]+$e3_normal_tri[2]*$e3_normal_tri[2]));
  if (_len>1e-05)
    _len = 1.0/_len;
  $e3_normal_tri[0]*=_len;
  $e3_normal_tri[1]*=_len;
  $e3_normal_tri[2]*=_len;
  return $e3_normal_tri;
};

var $n2_normal_quad=new Vector3$2();
function normal_quad(v1, v2, v3, v4) {
  var n=normal_tri(v1, v2, v3);
  $n2_normal_quad[0] = n[0];
  $n2_normal_quad[1] = n[1];
  $n2_normal_quad[2] = n[2];
  n = normal_tri(v1, v3, v4);
  $n2_normal_quad[0] = $n2_normal_quad[0]+n[0];
  $n2_normal_quad[1] = $n2_normal_quad[1]+n[1];
  $n2_normal_quad[2] = $n2_normal_quad[2]+n[2];
  var _len=Math.sqrt(($n2_normal_quad[0]*$n2_normal_quad[0]+$n2_normal_quad[1]*$n2_normal_quad[1]+$n2_normal_quad[2]*$n2_normal_quad[2]));
  if (_len>1e-05)
    _len = 1.0/_len;
  $n2_normal_quad[0]*=_len;
  $n2_normal_quad[1]*=_len;
  $n2_normal_quad[2]*=_len;
  return $n2_normal_quad;
};

var _li_vi=new Vector3$2();

//calc_t is optional, false
function line_isect(v1, v2, v3, v4, calc_t) {
  if (calc_t==undefined) {
      calc_t = false;
  }
  var div=(v2[0]-v1[0])*(v4[1]-v3[1])-(v2[1]-v1[1])*(v4[0]-v3[0]);
  if (div==0.0)
    return [new Vector3$2(), COLINEAR, 0.0];
  var vi=_li_vi;
  vi[0] = 0;
  vi[1] = 0;
  vi[2] = 0;
  vi[0] = ((v3[0]-v4[0])*(v1[0]*v2[1]-v1[1]*v2[0])-(v1[0]-v2[0])*(v3[0]*v4[1]-v3[1]*v4[0]))/div;
  vi[1] = ((v3[1]-v4[1])*(v1[0]*v2[1]-v1[1]*v2[0])-(v1[1]-v2[1])*(v3[0]*v4[1]-v3[1]*v4[0]))/div;
  if (calc_t||v1.length==3) {
      var n1=new Vector2$8(v2).sub(v1);
      var n2=new Vector2$8(vi).sub(v1);
      var t=n2.vectorLength()/n1.vectorLength();
      n1.normalize();
      n2.normalize();
      if (n1.dot(n2)<0.0) {
          t = -t;
      }
      if (v1.length==3) {
          vi[2] = v1[2]+(v2[2]-v1[2])*t;
      }
      return [vi, LINECROSS, t];
  }
  return [vi, LINECROSS];
};

var dt2l_v1 = new Vector2$8();
var dt2l_v2 = new Vector2$8();
var dt2l_v3 = new Vector2$8();
var dt2l_v4 = new Vector2$8();
var dt2l_v5 = new Vector2$8();

function dist_to_line_2d(p, v1, v2, clip, closest_co_out=undefined, t_out=undefined) {
  if (clip == undefined) {
      clip = true;
  }
  
  v1 = dt2l_v4.load(v1);
  v2 = dt2l_v5.load(v2);
  
  var n = dt2l_v1;
  var vec = dt2l_v3;
  
  n.load(v2).sub(v1).normalize();
  vec.load(p).sub(v1);
  
  var t = vec.dot(n);
  if (clip) {
    t = Math.min(Math.max(t, 0.0), v1.vectorDistance(v2));
  }
  
  n.mulScalar(t).add(v1);

  if (closest_co_out) {
    closest_co_out[0] = n[0];
    closest_co_out[1] = n[1];
  }

  if (t_out !== undefined) {
    t_out = t;
  }

  return n.vectorDistance(p);
}

var dt3l_v1 = new Vector3$2();
var dt3l_v2 = new Vector3$2();
var dt3l_v3 = new Vector3$2();
var dt3l_v4 = new Vector3$2();
var dt3l_v5 = new Vector3$2();

function dist_to_line(p, v1, v2, clip) {
  if (clip == undefined) {
      clip = true;
  }
  
  v1 = dt3l_v4.load(v1);
  v2 = dt3l_v5.load(v2);
  
  var n = dt3l_v1;
  var vec = dt3l_v3;
  
  n.load(v2).sub(v1).normalize();
  vec.load(p).sub(v1);
  
  var t = vec.dot(n);
  if (clip) {
    t = Math.min(Math.max(t, 0.0), v1.vectorDistance(v2));
  }
  
  n.mulScalar(t).add(v1);
  
  return n.vectorDistance(p);
}

//p cam be 2d, 3d, or 4d point, v1/v2 however must be full homogenous coordinates
var _cplw_vs4 = cachering.fromConstructor(Vector4$3, 64);
var _cplw_vs3 = cachering.fromConstructor(Vector3$2, 64);
var _cplw_vs2 = cachering.fromConstructor(Vector2$8, 64);

function wclip(x1, x2, w1, w2, near) {
  var r1 = near*w1 - x1;
  var r2 = (w1-w2)*near - (x1-x2);

  if (r2 == 0.0) return 0.0;

  return r1 / r2;
}

function clip(a, b, znear) {
  if (a-b == 0.0) return 0.0;

  return (a - znear) / (a - b);
}

/*clips v1 and v2 to lie within homogenous projection range
  v1 and v2 are assumed to be projected, pre-division Vector4's
  returns a positive number (how much the line was scaled) if either _v1 or _v2 are
  in front of the near clipping plane otherwise, returns 0
 */
function clip_line_w(_v1, _v2, znear, zfar) {
  var v1 = _cplw_vs4.next().load(_v1);
  var v2 = _cplw_vs4.next().load(_v2);

  //are we fully behind the view plane?
  if ((v1[2] < 1.0 && v2[2] < 1.0))
    return false;

  function doclip1(v1, v2, axis) {
    if (v1[axis]/v1[3] < -1) {
      var t = wclip(v1[axis], v2[axis], v1[3], v2[3], -1);
      v1.interp(v2, t);
    } else if (v1[axis]/v1[3] > 1) {
      var t = wclip(v1[axis], v2[axis], v1[3], v2[3], 1);
      v1.interp(v2, t);
    }
  }

  function doclip(v1, v2, axis) {
    doclip1(v1, v2, axis);
    doclip1(v2, v1, axis);
  }

  function dozclip(v1, v2) {
    if (v1[2] < 1) {
      var t = clip(v1[2], v2[2], 1);
      v1.interp(v2, t);
    } else if (v2[2] < 1) {
      var t = clip(v2[2], v1[2], 1);
      v2.interp(v1, t);
    }
  }

  dozclip(v1, v2, 1);
  doclip(v1, v2, 0);
  doclip(v1, v2, 1);

  for (var i=0; i<4; i++) {
    _v1[i] = v1[i];
    _v2[i] = v2[i];
  }

  return !(v1[0]/v1[3] == v2[0]/v2[3] || v1[1]/v2[3] == v2[1]/v2[3]);
};

//clip is optional, true.  clip point to lie within line segment v1->v2
var _closest_point_on_line_cache = cachering.fromConstructor(Vector3$2, 64);
var _closest_point_rets = new cachering(function() {
  return [0, 0];
}, 64);

var _closest_tmps = [new Vector3$2(), new Vector3$2(), new Vector3$2()];
function closest_point_on_line(p, v1, v2, clip) {
  if (clip == undefined)
    clip = true;
  var l1 = _closest_tmps[0], l2 = _closest_tmps[1];
  
  l1.load(v2).sub(v1).normalize();
  l2.load(p).sub(v1);
  
  var t = l2.dot(l1);
  if (clip) {
    t = t*(t<0.0) + t*(t>1.0) + (t>1.0);
  }
  
  var p = _closest_point_on_line_cache.next();
  p.load(l1).mulScalar(t).add(v1);
  var ret = _closest_point_rets.next();
  
  ret[0] = p;
  ret[1] = t;
  
  return ret;
};

/*given input line (a,d) and tangent t,
  returns a circle that goes through both
  a and d, whose normalized tangent at a is the same
  as normalized t.
  
  note that t need not be normalized, this function
  does that itself*/
var _circ_from_line_tan_vs = cachering.fromConstructor(Vector3$2, 32);
var _circ_from_line_tan_ret = new cachering(function() {
  return [new Vector3$2(), 0];
});
function circ_from_line_tan(a, b, t) {
  var p1 = _circ_from_line_tan_vs.next();
  var t2 = _circ_from_line_tan_vs.next();
  var n1 = _circ_from_line_tan_vs.next();
  
  p1.load(a).sub(b);
  t2.load(t).normalize();
  n1.load(p1).normalize().cross(t2).cross(t2).normalize();
  
  var ax = p1[0], ay = p1[1], az=p1[2], nx = n1[0], ny=n1[1], nz=n1[2];
  var r = -(ax*ax + ay*ay + az*az) / (2*(ax*nx + ay*ny +az*nz));
  
  var ret = _circ_from_line_tan_ret.next();
  ret[0].load(n1).mulScalar(r).add(a);
  ret[1] = r;
  
  return ret;
}

var _gtc_e1=new Vector3$2();
var _gtc_e2=new Vector3$2();
var _gtc_e3=new Vector3$2();
var _gtc_p1=new Vector3$2();
var _gtc_p2=new Vector3$2();
var _gtc_v1=new Vector3$2();
var _gtc_v2=new Vector3$2();
var _gtc_p12=new Vector3$2();
var _gtc_p22=new Vector3$2();
var _get_tri_circ_ret = new cachering(function() { return [0, 0]});

function get_tri_circ(a, b, c) {
  var v1=_gtc_v1;
  var v2=_gtc_v2;
  var e1=_gtc_e1;
  var e2=_gtc_e2;
  var e3=_gtc_e3;
  var p1=_gtc_p1;
  var p2=_gtc_p2;
  
  for (var i=0; i<3; i++) {
      e1[i] = b[i]-a[i];
      e2[i] = c[i]-b[i];
      e3[i] = a[i]-c[i];
  }
  
  for (var i=0; i<3; i++) {
      p1[i] = (a[i]+b[i])*0.5;
      p2[i] = (c[i]+b[i])*0.5;
  }
  
  e1.normalize();
  
  v1[0] = -e1[1];
  v1[1] = e1[0];
  v1[2] = e1[2];

  v2[0] = -e2[1];
  v2[1] = e2[0];
  v2[2] = e2[2];

  v1.normalize();
  v2.normalize();

  var cent;
  var type;
  for (var i=0; i<3; i++) {
      _gtc_p12[i] = p1[i]+v1[i];
      _gtc_p22[i] = p2[i]+v2[i];
  }

  var ret=line_isect(p1, _gtc_p12, p2, _gtc_p22);
  cent = ret[0];
  type = ret[1];

  e1.load(a);
  e2.load(b);
  e3.load(c);

  var r=e1.sub(cent).vectorLength();
  if (r<feps)
    r = e2.sub(cent).vectorLength();
  if (r<feps)
    r = e3.sub(cent).vectorLength();
  
  var ret = _get_tri_circ_ret.next();
  ret[0] = cent;
  ret[1] = r;
  
  return ret;
};

function gen_circle(m, origin, r, stfeps) {
  var pi=Math.PI;
  var f=-pi/2;
  var df=(pi*2)/stfeps;
  var verts=new Array();
  for (var i=0; i<stfeps; i++) {
      var x=origin[0]+r*Math.sin(f);
      var y=origin[1]+r*Math.cos(f);
      var v=m.make_vert(new Vector3$2([x, y, origin[2]]));
      verts.push(v);
      f+=df;
  }
  for (var i=0; i<verts.length; i++) {
      var v1=verts[i];
      var v2=verts[(i+1)%verts.length];
      m.make_edge(v1, v2);
  }
  return verts;
};

var cos$1 = Math.cos;
var sin$1 = Math.sin;
//axis is optional, 0
function rot2d(v1, A, axis) {
  var x = v1[0];
  var y = v1[1];
  
  if (axis == 1) {
    v1[0] = x * cos$1(A) + y*sin$1(A);
    v1[2] = y * cos$1(A) - x*sin$1(A);
  } else {
    v1[0] = x * cos$1(A) - y*sin$1(A);
    v1[1] = y * cos$1(A) + x*sin$1(A);
  }
}

function makeCircleMesh(gl, radius, stfeps) {
  var mesh=new Mesh();
  var verts1=gen_circle(mesh, new Vector3$2(), radius, stfeps);
  var verts2=gen_circle(mesh, new Vector3$2(), radius/1.75, stfeps);
  mesh.make_face_complex([verts1, verts2]);
  return mesh;
};
function minmax_verts(verts) {
  var min=new Vector3$2([1000000000000.0, 1000000000000.0, 1000000000000.0]);
  var max=new Vector3$2([-1000000000000.0, -1000000000000.0, -1000000000000.0]);
  var __iter_v=__get_iter(verts);
  var v;
  while (1) {
    var __ival_v=__iter_v.next();
    if (__ival_v.done) {
        break;
    }
    v = __ival_v.value;
    for (var i=0; i<3; i++) {
        min[i] = Math.min(min[i], v.co[i]);
        max[i] = Math.max(max[i], v.co[i]);
    }
  }
  return [min, max];
};

function unproject(vec, ipers, iview) {
  var newvec=new Vector3$2(vec);
  newvec.multVecMatrix(ipers);
  newvec.multVecMatrix(iview);
  return newvec;
};

function project(vec, pers, view) {
  var newvec=new Vector3$2(vec);
  newvec.multVecMatrix(pers);
  newvec.multVecMatrix(view);
  return newvec;
};

var _sh_minv=new Vector3$2();
var _sh_maxv=new Vector3$2();
var _sh_start=[];
var _sh_end=[];

var static_cent_gbw = new Vector3$2();
function get_boundary_winding(points) {
  var cent=static_cent_gbw.zero();
  if (points.length==0)
    return false;
  for (var i=0; i<points.length; i++) {
      cent.add(points[i]);
  }
  cent.divideScalar(points.length);
  var w=0, totw=0;
  for (var i=0; i<points.length; i++) {
      var v1=points[i];
      var v2=points[(i+1)%points.length];
      if (!colinear(v1, v2, cent)) {
          w+=winding(v1, v2, cent);
          totw+=1;
      }
  }
  if (totw>0)
    w/=totw;
  return Math.round(w)==1;
};

class PlaneOps {
  constructor(normal) {
    var no=normal;
    this.axis = [0, 0, 0];
    this.reset_axis(normal);
  }

  reset_axis(no) {
    var ax, ay, az;
    var nx=Math.abs(no[0]), ny=Math.abs(no[1]), nz=Math.abs(no[2]);
    if (nz>nx&&nz>ny) {
        ax = 0;
        ay = 1;
        az = 2;
    }
    else 
      if (nx>ny&&nx>nz) {
        ax = 2;
        ay = 1;
        az = 0;
    }
    else {
      ax = 0;
      ay = 2;
      az = 1;
    }
    this.axis = [ax, ay, az];
  }

  convex_quad(v1, v2, v3, v4) {
    var ax=this.axis;
    v1 = new Vector3$2([v1[ax[0]], v1[ax[1]], v1[ax[2]]]);
    v2 = new Vector3$2([v2[ax[0]], v2[ax[1]], v2[ax[2]]]);
    v3 = new Vector3$2([v3[ax[0]], v3[ax[1]], v3[ax[2]]]);
    v4 = new Vector3$2([v4[ax[0]], v4[ax[1]], v4[ax[2]]]);
    return convex_quad(v1, v2, v3, v4);
  }

  line_isect(v1, v2, v3, v4) {
    var ax=this.axis;
    var orig1=v1, orig2=v2;
    v1 = new Vector3$2([v1[ax[0]], v1[ax[1]], v1[ax[2]]]);
    v2 = new Vector3$2([v2[ax[0]], v2[ax[1]], v2[ax[2]]]);
    v3 = new Vector3$2([v3[ax[0]], v3[ax[1]], v3[ax[2]]]);
    v4 = new Vector3$2([v4[ax[0]], v4[ax[1]], v4[ax[2]]]);
    var ret=line_isect(v1, v2, v3, v4, true);
    var vi=ret[0];
    if (ret[1]==LINECROSS) {
        ret[0].load(orig2).sub(orig1).mulScalar(ret[2]).add(orig1);
    }
    return ret;
  }

  line_line_cross(l1, l2) {
    var ax=this.axis;
    var v1=l1[0], v2=l1[1], v3=l2[0], v4=l2[1];
    v1 = new Vector3$2([v1[ax[0]], v1[ax[1]], 0.0]);
    v2 = new Vector3$2([v2[ax[0]], v2[ax[1]], 0.0]);
    v3 = new Vector3$2([v3[ax[0]], v3[ax[1]], 0.0]);
    v4 = new Vector3$2([v4[ax[0]], v4[ax[1]], 0.0]);
    return line_line_cross([v1, v2], [v3, v4]);
  }

  winding(v1, v2, v3) {
    var ax=this.axis;
    if (v1==undefined)
      console.trace();
    v1 = new Vector3$2([v1[ax[0]], v1[ax[1]], 0.0]);
    v2 = new Vector3$2([v2[ax[0]], v2[ax[1]], 0.0]);
    v3 = new Vector3$2([v3[ax[0]], v3[ax[1]], 0.0]);
    return winding(v1, v2, v3);
  }

  colinear(v1, v2, v3) {
    var ax=this.axis;
    v1 = new Vector3$2([v1[ax[0]], v1[ax[1]], 0.0]);
    v2 = new Vector3$2([v2[ax[0]], v2[ax[1]], 0.0]);
    v3 = new Vector3$2([v3[ax[0]], v3[ax[1]], 0.0]);
    return colinear(v1, v2, v3);
  }

  get_boundary_winding(points) {
    var ax=this.axis;
    var cent=new Vector3$2();
    if (points.length==0)
      return false;
    for (var i=0; i<points.length; i++) {
        cent.add(points[i]);
    }
    cent.divideScalar(points.length);
    var w=0, totw=0;
    for (var i=0; i<points.length; i++) {
        var v1=points[i];
        var v2=points[(i+1)%points.length];
        if (!this.colinear(v1, v2, cent)) {
            w+=this.winding(v1, v2, cent);
            totw+=1;
        }
    }
    if (totw>0)
      w/=totw;
    return Math.round(w)==1;
  }
}

/*
on factor;

px := rox + rnx*t;
py := roy + rny*t;
pz := roz + rnz*t;

f1 := (px-pox)*pnx + (py-poy)*pny + (pz-poz)*pnz;
ff := solve(f1, t);
on fort;
part(ff, 1, 2);
off fort;

* */
var _isrp_ret=new Vector3$2();
function isect_ray_plane(planeorigin, planenormal, rayorigin, raynormal) {
  let po = planeorigin, pn = planenormal, ro = rayorigin, rn = raynormal;
  
  let div = (pn[1]*rn[1]+pn[2]*rn[2]+pn[0]*rn[0]);

  if (Math.abs(div) < 0.00001) {
    return undefined;
  }

  let t = ((po[1]-ro[1])*pn[1]+(po[2]-ro[2])*pn[2]+(po[0]-ro[0])*pn[0])/div;
  _isrp_ret.load(ro).addFac(rn, t);

  return _isrp_ret;
}

function _old_isect_ray_plane(planeorigin, planenormal, rayorigin, raynormal) {
  var p=planeorigin, n=planenormal;
  var r=rayorigin, v=raynormal;

  var d=p.vectorLength();
  var t=-(r.dot(n)-p.dot(n))/v.dot(n);
  _isrp_ret.load(v);
  _isrp_ret.mulScalar(t);
  _isrp_ret.add(r);
  return _isrp_ret;
};

function mesh_find_tangent(mesh, viewvec, offvec, projmat, verts) {
  if (verts==undefined)
    verts = mesh.verts.selected;
  var vset=new set$2();
  var eset=new set$2();
  var __iter_v=__get_iter(verts);
  var v;
  while (1) {
    var __ival_v=__iter_v.next();
    if (__ival_v.done) {
        break;
    }
    v = __ival_v.value;
    vset.add(v);
  }
  var __iter_v=__get_iter(vset);
  var v;
  while (1) {
    var __ival_v=__iter_v.next();
    if (__ival_v.done) {
        break;
    }
    v = __ival_v.value;
    var __iter_e=__get_iter(v.edges);
    var e;
    while (1) {
      var __ival_e=__iter_e.next();
      if (__ival_e.done) {
          break;
      }
      e = __ival_e.value;
      if (vset.has(e.other_vert(v))) {
          eset.add(e);
      }
    }
  }
  if (eset.length==0) {
      return new Vector3$2(offvec);
  }
  var tanav=new Vector3$2();
  var evec=new Vector3$2();
  var tan=new Vector3$2();
  var co2=new Vector3$2();
  var __iter_e=__get_iter(eset);
  var e;
  while (1) {
    var __ival_e=__iter_e.next();
    if (__ival_e.done) {
        break;
    }
    e = __ival_e.value;
    evec.load(e.v1.co).multVecMatrix(projmat);
    co2.load(e.v2.co).multVecMatrix(projmat);
    evec.sub(co2);
    evec.normalize();
    tan[0] = evec[1];
    tan[1] = -evec[0];
    tan[2] = 0.0;
    if (tan.dot(offvec)<0.0)
      tan.mulScalar(-1.0);
    tanav.add(tan);
  }
  tanav.normalize();
  return tanav;
};

class Mat4Stack {
  constructor() {
    this.stack = [];
    this.matrix = new Matrix4$3();
    this.matrix.makeIdentity();
    this.update_func = undefined;
  }

  set_internal_matrix(mat, update_func) {
    this.update_func = update_func;
    this.matrix = mat;
  }

  reset(mat) {
    this.matrix.load(mat);
    this.stack = [];
    if (this.update_func!=undefined)
      this.update_func();
  }

  load(mat) {
    this.matrix.load(mat);
    if (this.update_func!=undefined)
      this.update_func();
  }

  multiply(mat) {
    this.matrix.multiply(mat);
    if (this.update_func!=undefined)
      this.update_func();
  }

  identity() {
    this.matrix.loadIdentity();
    if (this.update_func!=undefined)
      this.update_func();
  }

  push(mat2) {
    this.stack.push(new Matrix4$3(this.matrix));
    if (mat2!=undefined) {
        this.matrix.load(mat2);
        if (this.update_func!=undefined)
          this.update_func();
    }
  }

  pop() {
    var mat=this.stack.pop(this.stack.length-1);
    this.matrix.load(mat);
    if (this.update_func!=undefined)
      this.update_func();
    return mat;
  }
}

class Constraint {
  constructor(name, func, klst, params, k=1.0) {
    this.glst = [];
    this.klst = klst;
    this.k = k;
    this.params = params;
    this.name = name;

    for (let ks of klst) {
      this.glst.push(new Float64Array(ks.length));
    }

    this.df = 0.0005;
    this.threshold = 0.0001;
    this.func = func;
  }

  evaluate(no_dvs=false) {
    let r1 = this.func(this.params);

    if (Math.abs(r1) < this.threshold)
      return 0.0;

    let df = this.df;

    if (no_dvs)
      return r1;

    for (let i=0; i<this.klst.length; i++) {
      let gs = this.glst[i];
      let ks = this.klst[i];

      for (let j=0; j<ks.length; j++) {
        let orig = ks[j];
        ks[j] += df;
        let r2 = this.func(this.params);
        ks[j] = orig;

        gs[j] = (r2 - r1) / df;
      }
    }

    return r1;
  }
}

class Solver {

  constructor() {
    this.constraints = [];
    this.gk = 0.99;
  }

  add(con) {
    this.constraints.push(con);
  }

  solveStep(gk=this.gk) {
    let err = 0.0;

    for (let con of this.constraints) {
      let r1 = con.evaluate();

      if (r1 === 0.0)
        continue;

      err += Math.abs(r1);
      let totgs = 0.0;

      for (let i=0; i<con.klst.length; i++) {
        let ks = con.klst[i], gs = con.glst[i];
        for (let j=0; j<ks.length; j++) {
          totgs += gs[j]*gs[j];
        }
      }

      if (totgs === 0.0)  {
        continue;
      }

      r1 /= totgs;

      for (let i=0; i<con.klst.length; i++) {
        let ks = con.klst[i], gs = con.glst[i];
        for (let j=0; j<ks.length; j++) {
          ks[j] += -r1*gs[j]*con.k*gk;
        }
      }
    }

    return err;
  }

  solve(steps, gk=this.gk) {
    let err = 0.0;

    for (let i=0; i<steps; i++) {
      err = this.solveStep(gk);

      if (err < 0.01 / this.constraints.length) {
        break;
      }
    }

    return err;
  }
}

var solver1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  Constraint: Constraint,
  Solver: Solver
});

"use strict";

let idgen = 0;

class PackNodeVertex extends Vector2 {
  constructor(node, co) {
    super(co);

    this.node = node;
    this._id = idgen++;
    this.edges = [];
    this._absPos = new Vector2();
  }

  get absPos() {
    this._absPos.load(this).add(this.node.pos);
    return this._absPos;
  }

  [Symbol.keystr]() {
    return this._id;
  }
}

class PackNode {
  constructor() {
    this.pos = new Vector2();
    this.vel = new Vector2();
    this.oldpos = new Vector2();
    this._id = idgen++;
    this.size = new Vector2();
    this.verts = [];
  }

  [Symbol.keystr]() {
    return this._id;
  }
}

function copyGraph(nodes) {
  let ret = [];
  let idmap = {};

  for (let n of nodes) {
    let n2 = new PackNode();
    n2._id = n._id;
    n2.pos.load(n.pos);
    n2.vel.load(n.vel);
    n2.size.load(n.size);

    n2.verts = [];
    idmap[n2._id] = n2;

    for (let v of n.verts) {
      let v2 = new PackNodeVertex(n2, v);
      v2._id = v._id;
      idmap[v2._id] = v2;

      n2.verts.push(v2);
    }

    ret.push(n2);
  }

  for (let n of nodes) {
    for (let v of n.verts) {
      let v2 = idmap[v._id];

      for (let v3 of v.edges) {
        v2.edges.push(idmap[v3._id]);
      }
    }
  }

  return ret;
}

function getCenter(nodes) {
  let cent = new Vector2();

  for (let n of nodes) {
    cent.add(n.pos);
  }

  if (nodes.length === 0)
    return cent;

  cent.mulScalar(1.0 / nodes.length);

  return cent;
}

function loadGraph(nodes, copy) {
  let idmap = {};

  for (let i=0; i<nodes.length; i++) {
    nodes[i].pos.load(copy[i].pos);
    nodes[i].oldpos.load(copy[i].oldpos);
    nodes[i].vel.load(copy[i].vel);
  }
}

function graphGetIslands(nodes) {
  let islands = [];
  let visit1 = new set$1();

  let rec = (n, island) => {
    island.push(n);
    visit1.add(n);

    for (let v of n.verts) {
      for (let e of v.edges) {
        let n2 = e.node;
        if (n2 !== n && !visit1.has(n2)) {
          rec(n2, island);
        }
      }
    }
  };

  for (let n of nodes) {
    if (visit1.has(n)) {
      continue;
    }

    let island = [];
    islands.push(island);
    rec(n, island);
  }

  return islands;
}

function graphPack(nodes, margin=15, steps=10, updateCb=undefined) {
  let orignodes = nodes;
  nodes = copyGraph(nodes);

  for (let n of nodes) {
    n.pos[0] += (Math.random()-0.5)*5.0;
    n.pos[1] += (Math.random()-0.5)*5.0;
  }

  let nodemap = {};
  for (let n of nodes) {
    n.vel.zero();
    nodemap[n._id] = n;
    for (let v of n.verts) {
      nodemap[v._id] = v;
    }
  }

  let visit = new set$1();
  let verts = new set$1();
  let isect = [];

  let disableEdges = false;

  function edge_c(params) {
    let [v1, v2] = params;

    if (disableEdges) return 0;

    return v1.absPos.vectorDistance(v2.absPos);
  }

  let p1 = new Vector2();
  let p2 = new Vector2();
  let s1 = new Vector2();
  let s2 = new Vector2();

  function loadBoxes(n1, n2, margin1=margin) {
    p1.load(n1.pos);
    p2.load(n2.pos);
    s1.load(n1.size);
    s2.load(n2.size);

    p1.subScalar(margin1);
    p2.subScalar(margin1);
    s1.addScalar(margin1*2.0);
    s2.addScalar(margin1*2.0);
  }

  let disableArea = false;

  function area_c(params) {
    let [n1, n2] = params;

    if (disableArea)
      return 0.0;

    loadBoxes(n1, n2);

    let a1 = n1.size[0]*n1.size[1];
    let a2 = n2.size[0]*n2.size[1];

    return aabb_overlap_area(p1, s1, p2, s2);
    return (aabb_overlap_area(p1, s1, p2, s2) / (a1+a2));
  }

  let lasterr, besterr, best;
  let err;

  let islands = graphGetIslands(nodes);
  let fakeVerts = [];
  for (let island of islands) {
    let n = island[0];
    let fv = new PackNodeVertex(n);
    fakeVerts.push(fv);
  }

  let solveStep1 = (gk=1.0) => {
    let solver = new Solver();

    isect.length = 0;
    visit = new set$1();

    if (fakeVerts.length > 1) {
      for (let i=1; i<fakeVerts.length; i++) {
        let v1 = fakeVerts[0];
        let v2 = fakeVerts[i];

        let con = new Constraint("edge_c", edge_c, [v1.node.pos, v2.node.pos], [v1, v2]);
        con.k = 0.25;
        solver.add(con);
      }
    }

    for (let n1 of nodes) {
      for (let v of n1.verts) {
        verts.add(v);
        for (let v2 of v.edges) {
          //hueristic to avoid adding same constraint twice
          if (v2._id < v._id) continue;

          let con = new Constraint("edge_c", edge_c, [v.node.pos, v2.node.pos], [v, v2]);
          con.k = 1.0;
          solver.add(con);
        }
      }

      for (let n2 of nodes) {
        if (n1 === n2) continue;
        let key = Math.min(n1._id, n2._id) + ":" + Math.max(n1._id, n2._id);
        if (visit.has(key)) continue;

        loadBoxes(n1, n2);
        let area = aabb_overlap_area(p1, s1, p2, s2);

        if (area > 0.01) {
          isect.push([n1, n2]);
          visit.add(key);
        }
      }

      for (let [n1, n2] of isect) {
        let con = new Constraint("area_c", area_c, [n1.pos, n2.pos], [n1, n2]);
        solver.add(con);
        con.k = 1.0;
      }
    }

    return solver;
  };

  let i = 1;
  let solveStep = (gk=0.5) => {
    let solver = solveStep1();

    if (i % 40 === 0.0) {
      let c1 = getCenter(nodes);

      let rfac = 1000.0;

      if (best) loadGraph(nodes, best);

      for (let n of nodes) {
        n.pos[0] += (Math.random() - 0.5) * rfac;
        n.pos[1] += (Math.random() - 0.5) * rfac;
        n.vel.zero();
      }

      let c2 = getCenter(nodes);
      c1.sub(c2);

      for (let n of nodes) {
        n.pos.add(c1);
      }
    }

    let err = 1e17;

    for (let n of nodes) {
      n.oldpos.load(n.pos);
      n.pos.addFac(n.vel, 0.5);
    }

    disableEdges = false;
    disableArea = true;
    solver.solve(1, gk);

    //solve so boxes don't overlap
    disableEdges = true;
    disableArea = false;

    for (let j=0; j<10; j++) {
      solver = solveStep1();
      err = solver.solve(10, gk);
    }

    for (let n of nodes) {
      n.vel.load(n.pos).sub(n.oldpos);
    }

    //get error from edge constraints

    disableEdges = false;
    disableArea = true;

    err = 0.0;
    for (let con of solver.constraints) {
      err += con.evaluate(true);
    }

    disableEdges = false;
    disableArea = false;

    /*
    loadGraph(orignodes, nodes);
    if (updateCb) {
      updateCb();
    }//*/

    lasterr = err;

    let add = Math.random()*besterr*Math.exp(-i*0.1);

    if (besterr === undefined || err < besterr+add) {
      best = copyGraph(nodes);
      besterr = err;
    }

    i++;

    return err;
  };


  for (let j=0; j<steps; j++) {
    solveStep();
  }

  loadGraph(orignodes, best ? best : nodes);

  if (updateCb) {
    if (nodes._timer !== undefined) {
      window.clearInterval(nodes._timer);
    }

    nodes._timer = window.setInterval(() => {
      let time = time_ms();

      while (time_ms() - time < 50) {
        let err = solveStep();
      }

      if (cconst.DEBUG.boxPacker) {
        console.log("err", (besterr / nodes.length).toFixed(2), (lasterr / nodes.length).toFixed(2), "isects", isect.length);
      }

      if (best) loadGraph(orignodes, best);

      if (updateCb() === false) {
        clearInterval(nodes._timer);
        return;
      }
    }, 100);

    let timer = nodes._timer;

    return {
      stop : () => {
        if (best) loadGraph(nodes, best);

        window.clearInterval(timer);
        nodes._timer = undefined;
      }
    }
  }
}

"use strict";

/*
why am I using a toolstack here at all?  time to remove!
*/

let toolstack_getter = function() {
  throw new Error("must pass a toolstack getter to registerToolStackGetter, I know it's dumb")
};

function registerToolStackGetter(func) {
  toolstack_getter = func;
}

let Vector2$9 = Vector2,
    Vector3$3 = Vector3,
    UndoFlags$1 = UndoFlags,
    ToolFlags$1 = ToolFlags;
//import {keymap} from './events';

class ToolBase extends ToolOp {
  constructor(screen) {
    super();
    this.screen = screen;
   //super();
    
    this._finished = false;
  }

  start() {
    //toolstack_getter().execTool(this);
    this.modalStart(undefined);
  }
  
  cancel() {
    this.finish();
  }
  
  finish() {
    this._finished = true;
    this.overdraw.end();
    this.popModal(this.screen);
  }

  popModal() {
    console.log("popModal called");

    popModalLight(this.modaldata);
    this.modaldata = undefined;
  }

  modalStart(ctx) {
    this.ctx = ctx;

    if (this.modaldata !== undefined) {
      console.log("Error, modaldata was not undefined");
      popModalLight(this.modaldata);
    }

    this.overdraw = document.createElement("overdraw-x");
    this.overdraw.start(this.screen);

    let handlers = {};
    let keys = Object.getOwnPropertyNames(this);
    for (let k in this.__proto__) {
      keys.push(k);
    }
    for (let k of Object.getOwnPropertyNames(this.__proto__)) {
      keys.push(k);
    }

    for (let k in this) {
      keys.push(k);
    }

    for (let k of keys) {
      if (k.startsWith("on")) {
        handlers[k] = this[k].bind(this);
      }
    }

    //window.setTimeout(() => {
      this.modaldata = pushModalLight(handlers);
      //console.log("HANDLERS", this.modaldata.handlers);
      
    //}, 100);

    //window.addEventListener("touchmove", (e) => {
    //  console.log("touchmove");
    //}, {passive : false});
  }
  
  on_mousemove(e) {
  }
  
  on_mouseup(e) {
    this.finish();
  }
  
  on_keydown(e) {
    console.log("s", e.keyCode);
    
    switch (e.keyCode) {
      case keymap.Escape: //esc
        this.cancel();
        break;
      case keymap.Space: //space
      case keymap.Enter: //return
        this.finish();
        break;
    }
  }
}

class AreaResizeTool extends ToolBase {
  constructor(screen, border, mpos) {
    if (screen === undefined) screen = _appstate.screen; //XXX hackish!
    
    super(screen);
    
    this.start_mpos = new Vector2$9(mpos);

    this.sarea = border.sareas[0];
    if (!this.sarea || border.dead) {
      console.log(border.dead, border);
      throw new Error("border corruption");
    }

    this.screen = screen;

    this.side = this.sarea._side(border);
  }

  get border() {
    return this.sarea._borders[this.side];
  }

  static tooldef() {return {
    uiname   : "Resize Area",
    toolpath : "screen.area.resize",
    icon     : Icons.RESIZE,
    description : "change size of area",
    is_modal : true,
    hotkey : undefined,
    undoflag : UndoFlags$1.NO_UNDO,
    flag     : 0,
    inputs   : {}, //tool properties
    outputs  : {}  //tool properties
  }}
  
  getBorders() {
    let horiz = this.border.horiz;
    
    let ret = [];
    let visit = new Set();
    
    let rec = (v) => {
      if (visit.has(v._id)) {
        return;
      }
      
      visit.add(v._id);
      
      for (let border of v.borders) {
        if (border.horiz == horiz && !visit.has(border._id)) {
          visit.add(border._id);
          ret.push(border);
          
          rec(border.otherVertex(v));
        }
      }
    };
    
    rec(this.border.v1);
    rec(this.border.v2);
    
    return ret;
  }

  on_mouseup(e) {
    this.finish();
  }

  finish() {
    super.finish();
    this.screen.snapScreenVerts();
    this.screen.regenBorders();
    this.screen.snapScreenVerts();
    this.screen.loadFromVerts();
  }

  on_keydown(e) {
    switch (e.keyCode) {
      case keymap["Escape"]:
      case keymap["Enter"]:
      case keymap["Space"]:
        this.finish();
        break;
    }
  }
  on_mousemove(e) {
    let mpos = new Vector2$9([e.x, e.y]);
    
    mpos.sub(this.start_mpos);
    
    let axis = this.border.horiz ? 1 : 0;
    
    //console.log(this.border.horiz);
    
    this.overdraw.clear();
    
    let visit = new Set();
    let borders = this.getBorders();

    let color = exports.DEBUG.screenborders ? "rgba(1.0, 0.5, 0.0, 0.1)" : "rgba(1.0, 0.5, 0.0, 1.0)";

    let bad = false;

    for (let border of borders) {
      bad = bad || !this.screen.isBorderMovable(border);

      border.oldv1 = new Vector2$9(border.v1);
      border.oldv2 = new Vector2$9(border.v2);
    }

    if (bad) {
      console.log("border is not movable");
      return;
    }

    let check = () => {
      let count = 0;

      for (let sarea of this.screen.sareas) {
        if (sarea.size[0] < 15 || sarea.size[1] < 15) {
          count++;
        }
      }

      return count;
    };

    let badcount = check();


    let snapMode = true;

    let df = mpos[axis];
    let border = this.border;

    this.screen.moveBorder(border, df, false);

    for (let border of borders) {
      //if false, stead of forcing areas to fit within screen bounds
      //in snapScreenVerts the screen bounds will be modified instead.

      if (border.outer) {
        snapMode = false;
      }

      this.overdraw.line(border.v1, border.v2, color);
    }
    
    this.start_mpos[0] = e.x;
    this.start_mpos[1] = e.y;
    this.screen.loadFromVerts();
    this.screen.setCSS();

    if (check() != badcount) {
      console.log("bad");

      for (let border of borders) {
        border.v1.load(border.oldv1);
        border.v2.load(border.oldv2);
      }
    }


    this.screen.snapScreenVerts(snapMode);
    this.screen.loadFromVerts();
    this.screen.solveAreaConstraints(snapMode);
    this.screen.setCSS();
    this.screen.updateDebugBoxes();
  }
}

//controller.registerTool(AreaResizeTool);

class SplitTool extends ToolBase {
  constructor(screen) {
    if (screen === undefined) screen = _appstate.screen; //XXX hackish!
    
    super(screen);

    this.done = false;
    this.screen = screen;
    this.ctx = screen.ctx;
    this.sarea = undefined;
    this.t = undefined;

    this.started = false;
  }
  
  static tooldef() {return {
    uiname   : "Split Area",
    toolpath : "screen.area.split",
    icon     : Icons.SMALL_PLUS,
    description : "split an area in two",
    is_modal : true,
    hotkey   : "BLEH-B",
    undoflag : UndoFlags$1.NO_UNDO,
    flag     : 0,
    inputs   : {}, //tool properties
    outputs  : {}  //tool properties
  }}
  
  modalStart(ctx) {
    if (this.started) {
      console.trace("double call to modalStart()");
      return;
    }
    
    this.overdraw = document.createElement("overdraw-x");
    this.overdraw.start(this.screen);
    
    super.modalStart(ctx);
  }
  
  cancel() {
    return this.finish(true);
  }
  
  finish(canceled=false) {
    if (this.done) {
      return;
    }

    this.done = true;
    this.overdraw.end();

    this.popModal(this.screen);

    if (canceled || !this.sarea) {
      return;
    }

    let sarea = this.sarea, screen = this.screen;
    let t = this.t;

    screen.splitArea(sarea, t, this.horiz);
    screen._internalRegenAll();
  }
  
  on_mousemove(e) {
    let x = e.x, y = e.y;

    let screen = this.screen;

    let sarea = screen.findScreenArea(x, y);
    console.log(sarea, x, y);

    this.overdraw.clear();

    if (sarea !== undefined) {
      //x -= sarea.pos[0];
      //y -= sarea.pos[1];
      x = (x - sarea.pos[0]) / (sarea.size[0]);
      y = (y - sarea.pos[1]) / (sarea.size[1]);

      let dx = 1.0 - Math.abs(x-0.5);
      let dy = 1.0 - Math.abs(y-0.5);

      this.sarea = sarea;
      let horiz = this.horiz = dx < dy;

      if (horiz) {
        this.t = y;
        this.overdraw.line([sarea.pos[0], e.y], [sarea.pos[0]+sarea.size[0], e.y]);
      } else {
        this.t = x;
        this.overdraw.line([e.x, sarea.pos[1]], [e.x, sarea.pos[1]+sarea.size[1]]);
      }
    }
    //console.warn("sarea:", sarea);

    //let sarea = this.
    //console.log(e.x, e.y);
    //this.overdraw.clear();
    //this.overdraw.line([e.x, e.y-200], [e.x, e.y+200], "grey");
  }
  
  on_mousedown(e) {
  }
  
  on_mouseup(e) {
    this.finish();
    
    if (e.button) {
      this.stopPropagation();
      this.preventDefault();
    }
  }
  
  on_keydown(e) {
    console.log("s", e.keyCode);
    
    switch (e.keyCode) {
      case keymap.Escape: //esc
        this.cancel();
        break;
      case keymap.Space: //space
      case keymap.Enter: //return
        this.finish();
        break;
    }
  }
}

//controller.registerTool(SplitTool);


class AreaDragTool extends ToolBase {
  constructor(screen, sarea, mpos) {
    if (screen === undefined) screen = _appstate.screen; //XXX hackish!
    
    super(screen);
    
    this.cursorbox = undefined;
    this.boxes = [];
    this.boxes.active = undefined;

    this.sarea = sarea;
    this.start_mpos = new Vector2$9(mpos);
    this.screen = screen;
  }
  
  static tooldef() {return {
    uiname   : "Drag Area",
    toolpath : "screen.area.drag",
    icon     : Icons.TRANSLATE,
    description : "move or duplicate area",
    is_modal : true,
    hotkey : undefined,
    undoflag : UndoFlags$1.NO_UNDO,
    flag     : 0,
    inputs   : {}, //tool properties
    outputs  : {}  //tool properties
  }}
  
  finish() {
    super.finish();

    this.screen.regenBorders();
    this.screen.solveAreaConstraints();
    this.screen.snapScreenVerts();
    this.screen._recalcAABB();

    console.log("tool finish");
  }
  
  getBoxRect(b) {
    let sa = b.sarea;
    let pos, size;
    
    if (b.horiz == -1) {
      //replacement mode
      pos = sa.pos;
      size = sa.size;
    } else if (b.horiz) {
      if (b.side == 'b') {
        pos = [sa.pos[0], sa.pos[1]+sa.size[1]*b.t];
        size = [sa.size[0], sa.size[1]*(1.0-b.t)];
      } else {
        pos = [sa.pos[0], sa.pos[1]];
        size = [sa.size[0], sa.size[1]*b.t];
      }
    } else {
      if (b.side == 'r') {
        pos = [sa.pos[0]+sa.size[0]*b.t, sa.pos[1]];
        size = [sa.size[0]*(1.0-b.t), sa.size[1]];
      } else {
        pos = [sa.pos[0], sa.pos[1]];
        size = [sa.size[0]*b.t, sa.size[1]];
      }
    }
    
    let color = "rgba(100, 100, 100, 0.2)";
    
    let ret = this.overdraw.rect(pos, size, color);
    ret.style["pointer-events"] = "none";
    
    return ret;
  }
  
  doSplit(b) {
    if (this.sarea) {
      return this.doSplitDrop(b);
    }
    
    let src = this.sarea, dst = b.sarea;
    let screen = this.screen;
    
    let t = b.t;
    
    screen.splitArea(dst, t, b.horiz);
    screen._internalRegenAll();
  }
  
  doSplitDrop(b) {
    //first check if there was no change
    if (b.horiz == -1 && b.sarea === this.sarea) {
      return;
    }

    console.log("BBBB", b.horiz, b.sarea===this.sarea, b);
    
    let can_rip = false;
    let sa = this.sarea;
    let screen = this.screen;
    
    //rip conditions
    can_rip = sa.size[0] == screen.size[0] || sa.size[1] == screen.size[1];
    can_rip = can_rip && b.sarea !== sa;
    can_rip = can_rip && (b.horiz == -1 || !screen.areasBorder(sa, b.sarea));
    
    let expand = b.horiz == -1 && b.sarea !== sa && screen.areasBorder(b.sarea, sa);
    
    can_rip = can_rip || expand;
    
    console.log("can_rip:", can_rip, expand);
    
    if (can_rip) {
      screen.removeArea(sa);
      screen.snapScreenVerts();
    }
    
    if (b.horiz == -1) {
      //replacement
      let src = this.sarea, dst = b.sarea;
      
      if (can_rip) {
        let mm;
        
        //handle case of one area "consuming" another
        if (expand) {
          mm = screen.minmaxArea(src);
          screen.minmaxArea(dst, mm);
        }
        
        console.log("replacing. . .", expand);
        screen.replaceArea(dst, src);
        
        if (expand) {
          console.log("\nEXPANDING:", src.size[0], src.size[1]);
          
          src.pos[0] = mm.min[0];
          src.pos[1] = mm.min[1];
          
          src.size[0] = mm.max[0] - mm.min[0];
          src.size[1] = mm.max[1] - mm.min[1];

          src.loadFromPosSize();

          screen._internalRegenAll();
        }
      } else {
        //console.log("copying. . .");
        screen.replaceArea(dst, src.copy());
        screen._internalRegenAll();
      }
    } else {
      let src = this.sarea, dst = b.sarea;
      
      let t = b.t;
      
      let nsa = screen.splitArea(dst, t, b.horiz);
      
      if (can_rip) {
        //console.log("replacing");
        screen.replaceArea(nsa, src);
      } else {
        //console.log("copying");
        screen.replaceArea(nsa, src.copy());
      }

      screen._internalRegenAll();
    }
  }
  
  makeBoxes(sa) {
    let sz = isMobile() ? 100 : 40;
    let cx = sa.pos[0] + sa.size[0]*0.5;
    let cy = sa.pos[1] + sa.size[1]*0.5;
    
    let color = this.color = "rgba(200, 200, 200, 0.55)";
    let hcolor = this.hcolor = "rgba(230, 230, 230, 0.75)";
    let idgen = 0;
    let boxes = this.boxes;
    
    let box = (x, y, sz, horiz, t, side) => {
      //console.log(x, y, sz);
      
      let b = this.overdraw.rect([x-sz[0]*0.5, y-sz[1]*0.5], sz, color);
      boxes.push(b);

      b.sarea = sa;
      
      let style = document.createElement("style");
      let cls = `mybox_${idgen++}`;
      
      b.horiz = horiz;
      b.t = t;
      b.side = side;
      b.setAttribute("class", cls);
      b.setAttribute("is_box", true);

      b.addEventListener("mousemove", this.on_mousemove.bind(this));

      let onclick = b.onclick = (e) => {
        let type = e.type.toLowerCase();

        if ((e.type == "mousedown" || e.type == "mouseup") && e.button != 0) {
          return; //another handler will cancel
        }

        console.log("split click");

        if (!this._finished) {
          this.finish();
          this.doSplit(b);
          
          e.preventDefault();
          e.stopPropagation();
        }
      };
      
      b.addEventListener("click", onclick);
      b.addEventListener("mousedown", onclick);
      b.addEventListener("mouseup", onclick);

      b.addEventListener("mouseenter", (e) => {
        console.log("mouse enter box");
        
        if (this.curbox !== undefined) {
          if (this.curbox.rect) {
            this.curbox.rect.remove();
            this.curbox.rect = undefined;
          }
        }
        
        if (b.rect !== undefined) {
          b.rect.remove();
          b.rect = undefined;
        }
        
        b.rect = this.getBoxRect(b);
        this.curbox = b;

        console.log("setting hcolor");
        b.setColor(hcolor);
        //b.style["background-color"] = hcolor;
      });
      
      b.addEventListener("mouseleave", (e) => {
        console.log("mouse leave box");
        
        if (b.rect) {
          b.rect.remove();
          b.rect = undefined;
        }
        
        if (this.curbox === b) {
          this.curbox = undefined;
        }

        b.setColor(color);
        //b.style["background-color"] = color;
      });
      
      style.textContent = `
        .${cls}:hover {
          background-color : orange;
          fill:orange;stroke-width:2
        }
      `;
      //console.log(style.textContent);
      b.appendChild(style);
      b.setAttribute("class", cls);

      return b;
    };
    
    let pad = 5;
    
    if (this.sarea) {
      box(cx, cy, [sz, sz], -1, -1, -1);
    }
    
    box(cx-sz*0.75-pad, cy, [sz*0.5, sz], false, 0.5, 'l');
    box(cx-sz*1.2-pad, cy, [sz*0.25, sz], false, 0.3, 'l');
    
    box(cx+sz*0.75+pad, cy, [sz*0.5, sz], false, 0.5, 'r');
    box(cx+sz*1.2+pad, cy, [sz*0.25, sz], false, 0.7, 'r');
    
    box(cx, cy-sz*0.75-pad, [sz, sz*0.5], true, 0.5, 't');
    box(cx, cy-sz*1.2-pad, [sz, sz*0.25], true, 0.3, 't');
    
    box(cx, cy+sz*0.75+pad, [sz, sz*0.5], true, 0.5, 'b');
    box(cx, cy+sz*1.2+pad, [sz, sz*0.25], true, 0.7, 'b');
  }

  getActiveBox(x, y) {
    for (let n of this.boxes) {
      if (n.hasAttribute && n.hasAttribute("is_box")) {
        let rect = n.getClientRects()[0];

        //console.log(rect.x, rect.y);
        if (x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height) {
          //console.log("found rect");
          return n;
        }
      }
    }
  }

  on_drag(e) {
    this.on_mousemove(e);
  }

  on_dragend(e) {
    this.on_mouseup(e);
  }

  on_mousemove(e) {
    let wid = 55;
    let color = "rgb(200, 200, 200, 0.7)";

    //console.trace("mouse move!", e.x, e.y, this.sarea);

    /*
     manually feed events to boxes so as to work right
     with touch events; note that pushModalLight routes
     touch to mouse events (if no touch handlers are present).
     */
    let n = this.getActiveBox(e.x, e.y);

    if (n !== undefined) {
      n.setColor(this.hcolor); //"rgba(250, 250, 250, 0.75)");
    }
    //console.log("mouse move", n);

    if (this.boxes.active !== undefined && this.boxes.active !== n) {
      this.boxes.active.setColor(this.color);
      this.boxes.active.dispatchEvent(new MouseEvent("mouseleave", e));
    }

    if (n !== undefined) {
      n.dispatchEvent(new MouseEvent("mouseenter", e));
    }

    this.boxes.active = n;
    /*
    let rec = (n) => {
      if (n.hasAttribute && n.hasAttribute("is_box")) {
        let rect = n.getClientRects()[0];

        console.log(rect.x, rect.y);
        if (x >= rect.x && x >= rect.y && x < rect.x+rect.width && y < rect.y+rect.height) {
          console.log("found rect");
          n.dispatchEvent("mouseenter", new MouseEvent("mouseenter", e));
        }
      }
      if (n === undefined || n.childNodes === undefined) {
        return;
      }

      for (let n2 of n.childNodes) {
        rec(n2);
      }
      if (n.shadow) {
        for (let n2 of n.shadow.childNodes) {
          rec(n2);
        }
      }
    };

    rec(this.overdraw);
    //*/
    if (this.sarea === undefined) {
      return;
    }
    
    if (this.cursorbox === undefined) {
      wid = 25;
      this.cursorbox = this.overdraw.rect([e.x-wid*0.5, e.y-wid*0.5], [wid, wid], color);
      this.cursorbox.style["pointer-events"] = "none";
    } else {
      this.cursorbox.style["x"] = (e.x-wid*0.5) + "px";
      this.cursorbox.style["y"] = (e.y-wid*0.5) + "px";
    }
  }
  
  on_mouseup(e) {
    console.log("e.button", e.button, e, e.x, e.y, this.getActiveBox(e.x, e.y));

    if (e.button) {
      e.stopPropagation();
      e.preventDefault();
    } else {
      let box = this.getActiveBox(e.x, e.y);

      if (box !== undefined) {
        box.onclick(e);
      }
    }
    
    this.finish();
  }
  
  modalStart(ctx) {
    super.modalStart(ctx);
    
    let screen = this.screen;
    
    this.overdraw.clear();
    
    if (this.sarea) {
      let sa = this.sarea;
      let box = this.overdraw.rect(sa.pos, sa.size, "rgba(100, 100, 100, 0.5)");
      
      box.style["pointer-events"] = "none";
    }
    
    for (let sa of screen.sareas) {
      this.makeBoxes(sa);
    }
  }
}

//controller.registerTool(AreaDragTool);

class ToolTipViewer extends ToolBase {
  constructor(screen) {
    super(screen);

    this.tooltip = undefined;
    this.element = undefined;
  }

  static tooldef() {return {
    uiname   : "Help Tool",
    toolpath : "screen.help_picker",
    icon     : Icons.HELP,
    description : "view tooltips",
    is_modal : true,
    hotkey : undefined,
    undoflag : UndoFlags$1.NO_UNDO,
    flag     : 0,
    inputs   : {}, //tool properties
    outputs  : {}  //tool properties
  }}

  on_mousemove(e) {
    this.pick(e);
  }

  on_mousedown(e) {
    this.pick(e);
  }

  on_mouseup(e) {
    this.finish();
  }

  finish() {
    super.finish();
  }

  on_keydown(e) {
    switch (e.keyCode) {
      case keymap.Escape:
      case keymap.Enter:
      case Keymap.Space:
        if (this.tooltip) {
          this.tooltip.end();
        }
        this.finish();
        break;
    }
  }
  pick(e) {
    let x = e.x, y = e.y;

    let ele = this.screen.pickElement(x, y);
    console.log(ele ? ele.tagName : ele);

    if (ele !== undefined && ele !== this.element && ele.title) {
      if (this.tooltip) {
        this.tooltip.end();
      }

      this.element = ele;
      let tip = ele.title;

      this.tooltip = ToolTip.show(tip, this.screen, x, y);
    }
    e.preventDefault();
    e.stopPropagation();
  }
}

"use strict";
let SVG_URL = 'http://www.w3.org/2000/svg';

let Vector2$a = Vector2;

class Overdraw extends UIBase {
  constructor() {
    super();

    this.visibleToPick = false;

    this.screen = undefined;
    this.shapes = [];
    this.otherChildren = []; //non-svg elements
    this.font = undefined;

    let style = document.createElement("style");
    style.textContent = `
      .overdrawx {
        pointer-events : none;
      }
    `;
    
    this.shadow.appendChild(style);
    
    this.zindex_base = 1000;
  }

  startNode(node, screen) {
    this.screen = screen;
    this.ctx = screen.ctx;

    if (!this.parentNode) {
      node.appendChild(this);
    }

    this.style["display"] = "float";
    this.style["z-index"] = this.zindex_base;

    this.style["position"] = "absolute";
    this.style["left"] = "0px";
    this.style["top"] = "0px";

    this.style["width"] = "100%"; //screen.size[0] + "px";
    this.style["height"] = "100%"; //screen.size[1] + "px";

    this.style["pointer-events"] = "none";

    this.svg = document.createElementNS(SVG_URL, "svg");
    this.svg.style["width"] = "100%";
    this.svg.style["height"] = "100%";

    this.svg.style["pointer-events"] = "none";

    this.shadow.appendChild(this.svg);
    //this.style["background-color"] = "green";
  }

  start(screen) {
    this.screen = screen;
    this.ctx = screen.ctx;
    
    screen.parentNode.appendChild(this);
    
    this.style["display"] = "float";
    this.style["z-index"] = this.zindex_base;
    
    this.style["position"] = "absolute";
    this.style["left"] = "0px";
    this.style["top"] = "0px";
    
    this.style["width"] = "100%"; //screen.size[0] + "px";
    this.style["height"] = "100%"; //screen.size[1] + "px";
    
    this.style["pointer-events"] = "none";
    
    this.svg = document.createElementNS(SVG_URL, "svg");
    this.svg.style["width"] = "100%";
    this.svg.style["height"] = "100%";
    
    this.shadow.appendChild(this.svg);
    
    //this.style["background-color"] = "green";
  }
  
  clear() {
    for (let child of list(this.svg.childNodes)) {
      child.remove();
    }
    
    for (let child of this.otherChildren) {
      child.remove();
    }
    
    this.otherChildren.length = 0;
  }

  drawTextBubbles(texts, cos, colors) {
    let boxes = [];
    let elems = [];

    let cent = new Vector2$a();

    for (let i=0; i<texts.length; i++) {
      let co = cos[i];
      let text = texts[i];
      let color;

      if (colors !== undefined) {
        color = colors[i];
      }

      cent.add(co);
      let box = this.text(texts[i], co[0], co[1], {color : color});

      boxes.push(box);
      let font = box.style["font"];
      let pat = /[0-9]+px/;
      let size = font.match(pat)[0];

      //console.log("size", size);

      if (size === undefined) {
        size = this.getDefault("DefaultText").size;
      } else {
        size = parsepx(size);
      }

      //console.log(size);
      let tsize = measureTextBlock(this, text, undefined, undefined, size, font);

      box.minsize = [
        ~~tsize.width,
        ~~tsize.height
      ];

      let pad = parsepx(box.style["padding"]);

      box.minsize[0] += pad*2;
      box.minsize[1] += pad*2;

      let x = parsepx(box.style["left"]);
      let y = parsepx(box.style["top"]);

      box.grads = new Array(4);
      box.params = [x, y, box.minsize[0], box.minsize[1]];
      box.startpos = new Vector2$a([x, y]);

      box.setCSS = function() {
        this.style["padding"] = "0px";
        this.style["margin"] = "0px";
        this.style["left"] = ~~this.params[0] + "px";
        this.style["top"] = ~~this.params[1] + "px";
        this.style["width"] = ~~this.params[2] + "px";
        this.style["height"] = ~~this.params[3] + "px";
      };

      box.setCSS();
      //console.log(box.params);
      elems.push(box);
    }

    if (boxes.length === 0) {
      return;
    }

    cent.mulScalar(1.0 / boxes.length);

    function error() {
      let p1 = [0, 0], p2 = [0, 0];
      let s1 = [0, 0], s2 = [0, 0];

      let ret = 0.0;

      for (let box1 of boxes) {
        for (let box2 of boxes) {
          if (box2 === box1) {
            continue;
          }

          s1[0] = box1.params[2];
          s1[1] = box1.params[3];
          s2[0] = box2.params[2];
          s2[1] = box2.params[3];

          let overlap = aabb_overlap_area(box1.params, s1, box2.params, s2);
          ret += overlap;
        }

        ret += box1.startpos.vectorDistance(box1.params)*0.25;
      }

      return ret;
    }

    function solve() {
      //console.log("ERROR", error());
      let r1 = error();
      if (r1 === 0.0) {
        return;
      }

      let df = 0.0001;
      let totgs = 0.0;

      for (let box of boxes) {
        for (let i=0; i<box.params.length; i++) {
          let orig = box.params[i];
          box.params[i] += df;
          let r2 = error();
          box.params[i] = orig;

          box.grads[i] = (r2 - r1) / df;
          totgs += box.grads[i]**2;
        }
      }

      if (totgs === 0.0) {
        return;
      }

      r1 /= totgs;
      let k = 0.4;

      for (let box of boxes) {
        for (let i = 0; i < box.params.length; i++) {
          box.params[i] += -r1*box.grads[i]*k;
        }

        box.params[2] = Math.max(box.params[2], box.minsize[0]);
        box.params[3] = Math.max(box.params[3], box.minsize[1]);

        box.setCSS();
      }
    }

    for (let i=0; i<15; i++) {
      solve();
    }

    for (let box of boxes) {
      elems.push(this.line(box.startpos, box.params));
    }

    return elems;
  }

  text(text, x, y, args={}) {
    args = Object.assign({}, args);

    if (args.font === undefined) {
      if (this.font !== undefined)
        args.font = this.font;
      else
        args.font = this.getDefault("DefaultText").genCSS();
    }

    if (!args["background-color"]) {
      args["background-color"] = "rgba(75, 75, 75, 0.75)";
    }

    args.color = args.color ? args.color : "white";
    if (typeof args.color === "object") {
      args.color = color2css$2(args.color);
    }

    args["padding"] = args["padding"] === undefined ? "5px" : args["padding"];
    args["border-color"] = args["border-color"] ? args["border-color"] : "grey";
    args["border-radius"] = args["border-radius"] ? args["border-radius"] : "25px";
    args["border-width"] = args["border-width"] !== undefined ? args["border-width"] : "2px";

    if (typeof args["border-width"] === "number") {
      args["border-width"] = "" + args["border-width"] + "px";
    }
    if (typeof args["border-radius"] === "number") {
      args["border-radius"] = "" + args["border-radius"] + "px";
    }

      //not sure I need SVG for this. . .
    let box = document.createElement("div");

    box.setAttribute("class", "overdrawx");

    box.style["position"] = "absolute";
    box.style["width"] = "min-contents";
    box.style["height"] = "min-contents";
    box.style["border-width"] = args["border-width"];
    box.style["border-radius"] = "25px";
    box.style["pointer-events"] = "none";
    box.style["z-index"] = this.zindex_base + 1;
    box.style["background-color"] = args["background-color"];
    box.style["padding"] = args["padding"];

    box.style["left"] = x + "px";
    box.style["top"] = y + "px";

    box.style["display"] = "flex";
    box.style["justify-content"] = "center";
    box.style["align-items"] = "center";

    box.innerText = text;
    box.style["font"] = args.font;
    box.style["color"] = args.color;

    this.otherChildren.push(box);
    this.shadow.appendChild(box);

    return box;
  }

  circle(p, r, stroke="black", fill="none") {
    let circle = document.createElementNS(SVG_URL, "circle");
    circle.setAttribute("cx", p[0]);
    circle.setAttribute("cy", p[1]);
    circle.setAttribute("r", r);

    if (fill) {
      circle.setAttribute("style", `stroke:${stroke};stroke-width:2;fill:${fill}`);
    } else {
      circle.setAttribute("style", `stroke:${stroke};stroke-width:2`);
    }

    this.svg.appendChild(circle);

    return circle;
  }

  line(v1, v2, color="black") {
    let line = document.createElementNS(SVG_URL, "line");
    line.setAttribute("x1", v1[0]);
    line.setAttribute("y1", v1[1]);
    line.setAttribute("x2", v2[0]);
    line.setAttribute("y2", v2[1]);
    line.setAttribute("style", `stroke:${color};stroke-width:2`);
    
    this.svg.appendChild(line);
    return line;
  }
  
  rect(p, size, color="black") {
    let line = document.createElementNS(SVG_URL, "rect");
    line.setAttribute("x", p[0]);
    line.setAttribute("y", p[1]);
    line.setAttribute("width", size[0]);
    line.setAttribute("height", size[1]);
    line.setAttribute("style", `fill:${color};stroke-width:2`);

    line.setColor = (color) => {
      line.setAttribute("style", `fill:${color};stroke-width:2`);
    };

    this.svg.appendChild(line);
    return line;
  }
  
  end() {
    this.clear();
    this.remove();
  }
  
  static define() {return {
    tagname : "overdraw-x"
  };}
}

UIBase.register(Overdraw);

let UIBase$d = UIBase;

class Note extends UIBase {
  constructor() {
    super();

    let style = document.createElement("style");

    this._noteid = undefined;
    this.height = 20;

    style.textContent = `
    .notex {
      display : flex;
      flex-direction : row;
      flex-wrap : nowrap;
      height : {this.height}px;
      padding : 0px;
      margin : 0px;
    }
    `;

    this.dom = document.createElement("div");
    this.dom.setAttribute("class", "notex");
    this.color = "red";

    this.shadow.appendChild(style);
    this.shadow.append(this.dom);
    this.setLabel("");
  }

  setLabel(s) {
    let color = this.color;
    if (this.mark === undefined) {
      this.mark = document.createElement("div");
      this.mark.style["display"] = "flex";
      this.mark.style["flex-direction"] = "row";
      this.mark.style["flex-wrap"] = "nowrap";

      //this.mark.style["width"]
      let sheet = 0;

      let size = iconmanager.getTileSize(sheet);

      this.mark.style["width"] = "" + size + "px";
      this.mark.style["height"] = "" + size + "px";

      this.dom.appendChild(this.mark);

      this.ntext = document.createElement("div");
      this.ntext.style["display"] = "inline-flex";
      this.ntext.style["flex-wrap"] = "nowrap";

      this.dom.appendChild(this.ntext);

      iconmanager.setCSS(Icons.NOTE_EXCL, this.mark, sheet);

      //this.mark.style["margin"] = this.ntext.style["margin"] = "0px"
      //this.mark.style["padding"] = this.ntext.style["padding"] = "0px"
      //this.mark.style["background-color"] = color;
    }

    let mark = this.mark, ntext = this.ntext;
    //mark.innerText = "!";
    ntext.innerText = " " + s;
  }

  init() {
    super.init();

    this.setAttribute("class", "notex");

    this.style["display"] = "flex";
    this.style["flex-wrap"] = "nowrap";
    this.style["flex-direction"] = "row";
    this.style["border-radius"] = "7px";
    this.style["padding"] = "2px";

    this.style["color"] = this.getDefault("NoteText").color;
    let clr = css2color$1(this.color);
    clr = color2css$2([clr[0], clr[1], clr[2], 0.25]);

    this.style["background-color"] = clr;
    this.setCSS();
  }

  static define() {return {
    tagname : "note-x"
  }}
}
UIBase$d.register(Note);

class ProgBarNote extends Note {
  constructor() {
    super();

    this._percent = 0.0;
    this.barWidth = 100;

    let bar = this.bar = document.createElement("div");
    bar.style["display"] = "flex";
    bar.style["flex-direction"] = "row";
    bar.style["width"] = this.barWidth + "px";
    bar.style["height"] = this.height + "px";
    bar.style["background-color"] = this.getDefault("ProgressBarBG");
    bar.style["border-radius"] = "12px";
    bar.style["align-items"] = "center";
    bar.style["padding"] = bar.style["margin"] = "0px";

    let bar2 = this.bar2 = document.createElement("div");
    let w = 50.0;

    bar2.style["display"] = "flex";
    bar2.style["flex-direction"] = "row";
    bar2.style["height"] = this.height + "px";
    bar2.style["background-color"] = this.getDefault("ProgressBar");
    bar2.style["border-radius"] = "12px";
    bar2.style["align-items"] = "center";
    bar2.style["padding"] = bar2.style["margin"] = "0px";

    this.bar.appendChild(bar2);
    this.dom.appendChild(this.bar);
  }

  setCSS() {
    super.setCSS();

    let w = ~~(this.percent * this.barWidth + 0.5);

    this.bar2.style["width"] = w + "px";
  }

  set percent(val) {
    this._percent = val;
    this.setCSS();
  }

  get percent() {
    return this._percent;
  }

  init() {
    super.init();
  }

  static define() {return {
    tagname : "note-progress-x"
  }}
}
UIBase$d.register(ProgBarNote);

class NoteFrame extends RowFrame {
  constructor() {
    super();
    this._h = 20;
  }

  init() {
    super.init();

    this.noMarginsOrPadding();

    noteframes.push(this);
    this.background = this.getDefault("NoteBG");
  }

  setCSS() {
    super.setCSS();

    this.style["width"] = "min-contents";
    this.style["height"] = this._h + "px";
  }

  _ondestroy() {
    if (noteframes.indexOf(this) >= 0) {
      noteframes.remove(this);
    }

    super._ondestroy();
  }

  progbarNote(msg, percent, color="rgba(255,0,0,0.2)", timeout=700, id=msg) {
    let note;

    for (let child of this.children) {
      if (child._noteid === id) {
        note = child;
        break;
      }
    }

    let f = (100.0*Math.min(percent, 1.0)).toFixed(1);

    if (note === undefined) {
      note = this.addNote(msg, color, -1, "note-progress-x");
      note._noteid = id;
    }

    //note.setLabel(msg + " " + f + "%");
    note.percent = percent;

    if (percent >= 1.0) {
      //note.setLabel(msg + " " + f + "%");

      window.setTimeout(() => {
        note.remove();
      }, timeout);
    }

    return note;
  }

  addNote(msg, color="rgba(255,0,0,0.2)", timeout=1200, tagname="note-x") {
    //let note = document.createElement("note-x");

    //note.ctx = this.ctx;
    //note.background = "red";
    //note.dom.innerText = msg;

    //this._add(note);

    let note = document.createElement(tagname);

    note.color = color;
    note.setLabel(msg);

    note.style["text-align"] = "center";

    note.style["font"] = getFont(note, "NoteText");
    note.style["color"] = this.getDefault("NoteText").color;

    this.add(note);

    this.noMarginsOrPadding();
    note.noMarginsOrPadding();

    //this.dom.style["position"] = "absolute";
    //this.style["position"] = "absolute";
    //note.style["position"] = "absolute";

    note.style["height"] = this._h + "px";
    note.height = this._h;


    if (timeout != -1) {
      window.setTimeout(() => {
        console.log("remove!");
        note.remove();
      }, timeout);
    }

    //this.appendChild(note);
    return note;

  }

  static define() {return {
    tagname : "noteframe-x"
  }}
}
UIBase$d.register(NoteFrame);

function getNoteFrames(screen) {
  let ret = [];

  let rec = (n) => {

    if (n instanceof NoteFrame) {
      ret.push(n);
    }

    if (n.childNodes !== undefined) {
      for (let node of n.childNodes) {
        rec(node);
      }
    }

    if (n instanceof UIBase && n.shadow !== undefined && n.shadow.childNodes) {
      for (let node of n.shadow.childNodes) {
        rec(node);
      }
    }
  };

  rec(screen);
  return ret;
}

let noteframes = [];

function progbarNote(screen, msg, percent, color, timeout) {
  noteframes = getNoteFrames(screen);

  for (let frame of noteframes) {
    try {
      frame.progbarNote(msg, percent, color, timeout);
    } catch (error) {
      print_stack(error);
      console.log("bad notification frame");
    }
  }
}

function sendNote(screen, msg, color, timeout=1000) {
  noteframes = getNoteFrames(screen);

  console.log(noteframes.length);

  for (let frame of noteframes) {
    console.log(frame);

    try {
      frame.addNote(msg, color, timeout);
    } catch (error) {
      print_stack(error);
      console.log("bad notification frame");
    }
  }
}

window._sendNote = sendNote;

function error(screen, msg, timeout=1000) {
  return sendNote(screen, msg, color2css$2([1.0, 0.0, 0.0, 1.0]), timeout);
}

function warning(screen, msg, timeout=1000) {
  return sendNote(screen, msg, color2css$2([0.78, 0.78, 0.2, 1.0]), timeout);
}

function message(screen, msg, timeout=1000) {
  return sendNote(screen, msg, color2css$2([0.4, 1.0, 0.5, 1.0]), timeout);
}

let SnapLimit = 1;

function snap(c, snap_limit=SnapLimit) {
  if (Array.isArray(c)) {
    for (let i=0; i<c.length; i++) {
      c[i] = Math.floor(c[i]/snap_limit)*snap_limit;
    }
  } else {
    c = Math.floor(c/snap_limit)*snap_limit;
  }

  return c;
}

function snapi(c, snap_limit=SnapLimit) {
  //return snap(c, snap_limit);

  if (Array.isArray(c)) {
    for (let i=0; i<c.length; i++) {
      c[i] = Math.ceil(c[i]/snap_limit)*snap_limit;
    }
  } else {
    c = Math.ceil(c/snap_limit)*snap_limit;
  }

  return c;
}

class ScreenVert extends Vector2 {
  constructor(pos, id, added_id) {
    super(pos);

    this.added_id = added_id;
    this.sareas = [];
    this.borders = [];

    this._id = id;
  }

  static hash(pos, added_id) {
    let x = snap(pos[0]);
    let y = snap(pos[1]);

    return ""+x + ":" + y + ": + added_id";
  }

  valueOf() {
    return ScreenVert.hash(this, this.added_id);
  }

  [Symbol.keystr]() {
    return ScreenVert.hash(this, this.added_id);
  }

  loadSTRUCT(reader) {
    reader(this);
  }
}

ScreenVert.STRUCT = `
pathux.ScreenVert {
  0 : float;
  1 : float;
}
`;
register(ScreenVert);

class ScreenHalfEdge {
  constructor(border, sarea) {
    this.sarea = sarea;
    this.border = border;
    this.side = sarea._side(border);
  }

  get v1() {
    return this.border.v1;
  }

  get v2() {
    return this.border.v2;
  }

  [Symbol.keystr]() {
    return this.sarea._id + ":" + this.border._id;
  }

}

class ScreenBorder extends UIBase {
  constructor() {
    super();

    this.visibleToPick = false;

    this.screen = undefined;
    this.v1 = undefined;
    this.v2 = undefined;
    this._id = undefined;

    this.outer = undefined;

    this.halfedges = []; //all bordering borders, including ones with nonshared verts
    this.sareas = [];

    this._innerstyle = document.createElement("style");
    this._style = undefined;

    this.shadow.appendChild(this._innerstyle);

    this.inner = document.createElement("div");
    //this.inner.innerText = "sdfsdfsdf";
    this.shadow.appendChild(this.inner);

    this.addEventListener("mousedown", (e) => {
      console.log(this.sareas.length, this.sareas, "|||||");

      let ok = this.movable;

      if (!ok) {
        console.log("border is not movable");
        return;
      }

      console.log("area resize start!");
      let tool = new AreaResizeTool(this.screen, this, [e.x, e.y]);

      tool.start();

      e.preventDefault();
      e.stopPropagation();
    });
  }

  get dead() {
    return !this.parentNode;
  }

  get side() {
    throw new Error("side accedd");
  }

  set side(val) {
    throw new Error("side accedd");
  }

  get valence() {
    let ret = 0; //this.sareas.length;
    let horiz = this.horiz;

    let visit = {};

    for (let i = 0; i < 2; i++) {
      let sv = i ? this.v2 : this.v1;
      //console.log(sv);

      for (let sa of sv.borders) {
        if (sa.horiz != this.horiz)
          continue;
        if (sa._id in visit)
          continue;

        visit[sa._id] = 1;

        let a0x = Math.min(this.v1[0], this.v2[0]);
        let a0y = Math.min(this.v1[1], this.v2[1]);
        let a1x = Math.max(this.v1[0], this.v2[0]);
        let a1y = Math.max(this.v1[1], this.v2[1]);

        let b0x = Math.min(sa.v1[0], sa.v2[0]);
        let b0y = Math.min(sa.v1[1], sa.v2[1]);
        let b1x = Math.min(sa.v1[0], sa.v2[0]);
        let b1y = Math.min(sa.v1[1], sa.v2[1]);

        let ok;

        let eps = 0.001;
        if (horiz) {
          ok = (a0y <= b1y + eps && a1y >= a0y - eps);
        } else {
          ok = (a0x <= b1x + eps && a1x >= a0x - eps);
        }

        if (ok) {
          //console.log("found");
          ret += sa.sareas.length;
        }
      }
    }

    return ret;
  }

  otherVertex(v) {
    if (v === this.v1)
      return this.v2;
    else
      return this.v1;
  }

  get horiz() {
    let dx = this.v2[0] - this.v1[0];
    let dy = this.v2[1] - this.v1[1];

    return Math.abs(dx) > Math.abs(dy);
  }

  setCSS() {
    if (this._style === undefined) {
      this._style = document.createElement("style");
      this.appendChild(this._style);
    }

    let pad = this.getDefault("ScreenBorderMousePadding");
    let wid = this.getDefault("ScreenBorderWidth");

    let v1 = this.v1, v2 = this.v2;
    let vec = new Vector2(v2).sub(v1);

    let x = Math.min(v1[0], v2[0]), y = Math.min(v1[1], v2[1]);
    let w, h;
    let cursor, bstyle;


    this.style["display"] = "flex";
    this.style["display"] = this.horiz ? "row" : "column";
    this.style["justify-content"] = "center";
    this.style["align-items"] = "center";

    if (!this.horiz) {
      this.style["padding-left"] = this.style["padding-right"] = pad + "px";
      x -= wid*0.5 + pad;

      w = wid*2;
      h = Math.abs(vec[1]);

      cursor = 'e-resize';
      bstyle = "border-left-style : solid;\n    border-right-style : solid;\n";
      bstyle = "border-top-style : none;\n    border-bottom-style : none;\n";
    } else {
      this.style["padding-top"] = this.style["padding-bottom"] = pad + "px";
      y -= wid*0.5 + pad;

      w = Math.abs(vec[0]);
      h = wid;

      cursor = 'n-resize';
      bstyle = "border-top-style : solid;\n    border-bottom-style : solid;\n";
    }


    let color = this.getDefault("ScreenBorderOuter");
    let debug = exports.DEBUG.screenborders;

    if (debug) {
      wid = 4;
      let alpha = 1.0;
      let c = this.sareas.length*75;

      let r=0, g=0, b=0;

      if (this.movable) {
        b=255;
      }
      if (this.halfedges.length > 1) {
        g=255;
      }
      if (this.outer) {
        r = 255;
      }
      color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }


    let innerbuf = `
        .screenborder_inner_${this._id} {
          ${bstyle}
          ${this.horiz ? 'height' : 'width'} : ${wid}px;
          ${!this.horiz ? 'height' : 'width'} : 100%;
          margin : 0px;
          padding : 0px;
          
          background-color : ${this.getDefault("ScreenBorderInner")};
          border-color : ${color};
          border-width : ${wid*0.5}px;
          border-style : ${debug && this.outer ? "dashed" : "solid"};
          pointer-events : none;
        }`;

    let sbuf = `
        .screenborder_${this._id} {
        }
    `;

    let ok = this.movable;
    for (let sarea of this.sareas) {
      ok = ok || sarea.floating;
    }

    if (ok) {
      sbuf += `
        .screenborder_${this._id}:hover {
          cursor : ${cursor};
        }
      `;
    }

    this._style.textContent = sbuf;
    this._innerstyle.textContent = innerbuf;

    this.setAttribute("class", "screenborder_" + this._id);
    this.inner.setAttribute("class", "screenborder_inner_" + this._id);

    this.style["position"] = "absolute";
    this.style["left"] = x + "px";
    this.style["top"] = y + "px";
    this.style["width"] = w + "px";
    this.style["height"] = h + "px";
    this.style["z-index"] = "25";
  }

  static hash(v1, v2) {
    return Math.min(v1._id, v2._id) + ":" + Math.max(v1._id, v2._id);
  }

  valueOf() {
    return ScreenBorder.hash(this.v1, this.v2);
  }

  [Symbol.keystr]() {
    return ScreenBorder.hash(this.v1, this.v2);
  }

  static define() {
    return {
      tagname: "screenborder-x"
    };
  }
}

UIBase.register(ScreenBorder);

let _ScreenArea = undefined;

let UIBase$e = UIBase;
let Vector2$b = Vector2;
let Screen = undefined;


function setScreenClass(cls) {
  Screen = cls;
}

function getAreaIntName(name) {
  let hash = 0;

  for (let i=0; i<name.length; i++) {
    let c = name.charCodeAt(i);

    if (i % 2 == 0) {
      hash += c<<8;
      hash *= 13;
      hash = hash & ((1<<15)-1);
    } else {
      hash += c;
    }
  }

  return hash;
}
//XXX get rid of me
window.getAreaIntName = getAreaIntName;

//XXX get rid of me
var AreaTypes = {
  TEST_CANVAS_EDITOR : 0
};

function setAreaTypes(def) {
  for (let k in AreaTypes) {
    delete AreaTypes[k];
  }

  for (let k in def) {
    AreaTypes[k] = def[k];
  }
}

let areaclasses = {};
class AreaWrangler {
  constructor() {
    this.stacks = {};
    this.lasts = {};
    this.lastArea = undefined;
    this.stack = [];
    this.idgen = 0;
    this._last_screen_id = undefined;
  }

  _checkWrangler(ctx) {
    if (ctx === undefined) {
      return true;
    }

    if (this._last_screen_id === undefined) {
      this._last_screen_id = ctx.screen._id;
      return true;
    }

    if (ctx.screen._id !== this._last_screen_id) {
      this.reset();

      this._last_screen_id = ctx.screen._id;
      console.warn("contextWrangler detected a new screen; new file?");
      return false;
    }

    return true;
  }

  reset() {
    this.stacks = {};
    this.lasts = {};
    this.lastArea = undefined;
    this.stack = [];
    this._last_screen_id = undefined;

    return this;
  }

  push(type, area, pushLastRef=true) {
    if (pushLastRef || this.lasts[type.name] === undefined) {
      this.lasts[type.name] = area;
      this.lastArea = area;
    }

    if (!(type.name in this.stacks)) {
      this.stacks[type.name] = [];
    }

    this.stacks[type.name].push(area);
    this.stack.push(area);
  }

  pop(type, area) {
    if (!(type.name in this.stacks)) {
      console.warn("pop_ctx_area called in error");
      //throw new Error("pop_ctx_area called in error");
      return;
    }

    if (this.stacks[type.name].length > 0) {
      this.stacks[type.name].pop();
    }

    if (this.stack.length > 0) {
      this.stack.pop();
    }
  }

  getLastArea(type) {
    if (type === undefined) {
      if (this.stack.length > 0) {
        return this.stack[this.stack.length-1];
      } else {
        return this.lastArea;
      }
    } else {
      if (type.name in this.stacks) {
        let stack = this.stacks[type.name];

        if (stack.length > 0) {
          return stack[stack.length-1];
        }
      }

      return this.lasts[type.name];
    }
  }
}

let _ScreenArea$1 = undefined;

let UIBase$f = UIBase;
let Vector2$c = Vector2;
let Screen$1 = undefined;

const AreaFlags = {
  HIDDEN          : 1,
  FLOATING        : 2,
  INDEPENDENT     : 4 //area is indpendent of the screen mesh
};

let contextWrangler = new AreaWrangler();

window._contextWrangler = contextWrangler;

const BorderMask = {
  LEFT    : 1,
  BOTTOM  : 2,
  RIGHT   : 4,
  TOP     : 8,
  ALL     : 1|2|4|8
};

const BorderSides = {
  LEFT   : 0,
  BOTTOM : 1,
  RIGHT  : 2,
  TOP    : 3
};

/**
 * Base class for all editors
 **/
class Area extends UIBase {
  constructor() {
    super();

    /**
     * -----b4----
     *
     * b1       b3
     *
     * -----b2----
     *
     * */

    let def = this.constructor.define();

    //set bits in mask to keep
    //borders from moving
    this.borderLock = def.borderLock || 0;
    this.flag = def.flag || 0;

    this.inactive = true;
    this.areaDragToolEnabled = true;
    
    this.owning_sarea = undefined;
    this._area_id = contextWrangler.idgen++;
    
    this.pos = undefined; //set by screenarea parent
    this.size = undefined; //set by screenarea parent
    this.minSize = [5, 5];
    this.maxSize = [undefined, undefined];

    let appendChild = this.shadow.appendChild;
    this.shadow.appendChild = (child) => {
      appendChild.call(this.shadow, child);
      if (child instanceof UIBase$f) {
        child.parentWidget = this;
      }
    };

    let prepend = this.shadow.prepend;
    this.shadow.prepend = (child) => {
      prepend.call(this.shadow, child);

      if (child instanceof UIBase$f) {
        child.parentWidget = this;
      }
    };
  }

  set floating(val) {
    if (val) {
      this.flag |= AreaFlags.FLOATING;
    } else {
      this.flag &= ~AreaFlags.FLOATING;
    }
  }

  get floating() {
    return ~~(this.flag & AreaFlags.FLOATING);
  }

  init() {
    super.init();

    this.style["overflow"] = "hidden";
    this.noMarginsOrPadding();

    let onover = (e) => {
      //console.log(this._area_id, this.ctx.workspace._area_id);

      //try to trigger correct entry in context area stacks
      this.push_ctx_active();
      this.pop_ctx_active();
    };

    //*
    this.addEventListener("mouseover", onover, {passive : true});
    this.addEventListener("mousemove", onover, {passive : true});
    this.addEventListener("mousein", onover, {passive : true});
    this.addEventListener("mouseenter", onover, {passive : true});
    this.addEventListener("touchstart", onover, {passive : true});
    this.addEventListener("focusin", onover, {passive : true});
    this.addEventListener("focus", onover, {passive : true});
    //*/
  }

  _get_v_suffix() {
    if (this.flag & AreaFlags.INDEPENDENT) {
      return this._id;
    } else {
      return "";
    }
  }


  /**
   * Return a list of keymaps used by this editor
   * @returns {Array<KeyMap>}
   */
  getKeyMaps() {
    return this.keymap !== undefined ? [this.keymap] : [];
  }

  on_fileload(isActiveEditor) {
    contextWrangler.reset();
  }

  buildDataPath() {
    let p = this;
    
    let sarea = this.owning_sarea;
    
    if (sarea === undefined || sarea.screen === undefined) {
      console.warn("Area.buildDataPath(): Failed to build data path");
      return "";
    }
    
    let screen = sarea.screen;
    
    let idx1 = screen.sareas.indexOf(sarea);
    let idx2 = sarea.editors.indexOf(this);
    
    if (idx1 < 0 || idx2 < 0) {
      throw new Error("malformed area data");
    }
    
    let ret = `screen.sareas[${idx1}].editors[${idx2}]`;
    return ret;
  }
  
  saveData() {
    return {
      _area_id : this._area_id,
      areaName : this.areaName
    };
  }
  
  loadData(obj) {
    let id = obj._area_id;
    
    if (id !== undefined && id !== null) {
      this._area_id = id;
    }
  }
  
  draw() {
  }
  
  copy() {
    console.warn("You might want to implement this, Area.prototype.copy based method called");
    let ret = document.createElement(this.constructor.define().tagname);
    return ret;
  }
  
  on_resize(size, oldsize) {
    super.on_resize(size, oldsize);
  }

  on_area_focus() {

  }

  on_area_blur() {

  }

  /** called when editors are swapped with another editor type*/
  on_area_active() {
  }

  /** called when editors are swapped with another editor type*/
  on_area_inactive() {
  }

  /**
   * Get active area as defined by push_ctx_active and pop_ctx_active.
   *
   * Type should be an Area subclass, if undefined the last accessed area
   * will be returned.
   * */
  static getActiveArea(type) {
    return contextWrangler.getLastArea(type);
  }

  /*
  * This is needed so UI controls can know what their parent area is.
  * For example, a slider with data path "view2d.zoomfac" needs to know where
  * to find view2d.
  *
  * Typically this works by adding a field to a ContextOverlay:
  *
  * class ContextOverlay {
  *   get view3d() {
  *     return Area.getActiveArea(View3D);
  *   }
  * }
  *
  * Make sure to wrap event callbacks in push_ctx_active and pop_ctx_active.
  * */
  push_ctx_active(dontSetLastRef=false) {
    contextWrangler.push(this.constructor, this, !dontSetLastRef);
  }

  /**
   * see push_ctx_active
   * */
  pop_ctx_active(dontSetLastRef=false) {
    contextWrangler.pop(this.constructor, this, !dontSetLastRef);
  }
  
  static register(cls) {
    let def = cls.define();
    
    if (!def.areaname) {
      throw new Error("Missing areaname key in define()");
    }
    
    areaclasses[def.areaname] = cls;
    
    UIBase.register(cls);
  }
  
  getScreen() {
    //XXX
    //return _appstate.screen;
    throw new Error("replace me in Area.prototype");
  }
  
  toJSON() {
    return Object.assign(super.toJSON(), {
      areaname : this.constructor.define().areaname,
      _area_id : this._area_id
    });
  }
  
  loadJSON(obj) {
    super.loadJSON(obj);
    this._area_id = obj._area_id;
    
    return this;
  }

  getBarHeight() {
    return this.header.getClientRects()[0].height;
  }

  makeAreaSwitcher(container) {
    let areas = {};
    let icons = {};
    let i = 0;

    for (let k in areaclasses) {
      let cls = areaclasses[k];
      let def = cls.define();

      if (def.flag & AreaFlags.HIDDEN)
        continue;

      let uiname = def.uiname;

      if (uiname === undefined) {
        uiname = k.replace("_", " ").toLowerCase();
        uiname = uiname[0].toUpperCase() + uiname.slice(1, uiname.length);
      }

      areas[uiname] = k;
      icons[uiname] = def.icon !== undefined ? def.icon : -1;
    }


    return container.listenum(undefined, this.constructor.define().uiname, areas, undefined, (id) => {
      let cls = areaclasses[id];
      this.owning_sarea.switch_editor(cls);
    }, icons);

    //return areas;
  }

  makeHeader(container, add_note_area=true) {
    let row = this.header = container.row();

    row.remove();
    container._prepend(row);

    row.background = this.getDefault("AreaHeaderBG");

    let rh = ~~(16*this.getDPI());

    //container.setSize(undefined, rh);
    //row.setSize(undefined, rh);
    //row.setSize(undefined, rh);

    container.noMarginsOrPadding();
    row.noMarginsOrPadding();

    row.style["width"] = "100%";
    row.style["margin"] = "0px";
    row.style["padding"] = "0px";

    let mdown = false;
    let mpos = new Vector2$c();
    
    let mpre = (e, pageX, pageY) => {
      pageX = pageX === undefined ? e.pageX : pageX;
      pageY = pageY === undefined ? e.pageY : pageY;

      let node = this.getScreen().pickElement(pageX, pageY);
      console.log(node.tagName, node === row);
      
      if (node !== row) {
        return false;
      }
      
      return true;
    };
    
    row.addEventListener("mouseout", (e) => {
      //console.log("mouse leave");
      mdown = false;
    });
    row.addEventListener("mouseleave", (e) => {
      //console.log("mouse out");
      mdown = false;
    });
    
    row.addEventListener("mousedown", (e) => {
      if (!mpre(e)) return;
      
      mpos[0] = e.pageX;
      mpos[1] = e.pageY;
      mdown = true;
    }, false);

    let do_mousemove = (e, pageX, pageY) => {
      let mdown2 = e.buttons != 0 || (e.touches && e.touches.length > 0);

      if (!mdown2 || !mpre(e, pageX, pageY)) return;


      if (e.type === "mousemove" && e.was_touch) {
        //okay how are patched events getting here?
        //avoid double call. . .
        return;
      }

      //console.log(mdown);
      let dx = pageX - mpos[0];
      let dy = pageY - mpos[1];

      let dis = dx*dx + dy*dy;
      let limit = 7;

      if (dis > limit*limit) {
        let sarea = this.owning_sarea;
        if (sarea === undefined) {
          console.warn("Error: missing sarea ref");
          return;
        }

        let screen = sarea.screen;
        if (screen === undefined) {
          console.log("Error: missing screen ref");
          return;
        }

        if (!this.areaDragToolEnabled) {
          return;
        }
        mdown = false;
        console.log("area drag tool!", e.type, e);
        screen.areaDragTool(this.owning_sarea);
      }
    };

    //not working on mobile
    //row.setAttribute("draggable", true);
    //row.draggable = true;
    /*
    row.addEventListener("dragstart", (e) => {
      return;
      console.log("drag start!", e);
      e.dataTransfer.setData("text/json", "SplitAreaDrag");

      let canvas = document.createElement("canvas");
      let g = canvas.g;

      canvas.width = 32;
      canvas.height = 32;

      e.dataTransfer.setDragImage(canvas, 0, 0);

      mdown = false;
      console.log("area drag tool!");
      this.getScreen().areaDragTool(this.owning_sarea);
    });

    row.addEventListener("drag", (e) => {
      console.log("drag!", e);
    });*/

    //*
    row.addEventListener("mousemove", (e) => {
      return do_mousemove(e, e.pageX, e.pageY);
    }, false);
      //*/
    row.addEventListener("mouseup", (e) => {
      if (!mpre(e)) return;

      mdown = false;
    }, false);

    row.addEventListener("touchstart", (e) => {
      console.log("touchstart", e);

      if (!mpre(e, e.touches[0].pageX, e.touches[0].pageY)) return;
      
      if (e.touches.length == 0)
        return;
      
      mpos[0] = e.touches[0].pageX;
      mpos[1] = e.touches[0].pageY;
      mdown = true;
    }, false);
    
    row.addEventListener("touchmove", (e) => {
      return do_mousemove(e, e.touches[0].pageX, e.touches[0].pageY);
    }, false);

    let touchend = (e) => {
      let node = this.getScreen().pickElement(e.pageX, e.pageY);
      if (node !== row) {
        return;
      }
      if (e.touches.length == 0)
        return;
      
      mdown = false;
    };
    
    row.addEventListener("touchcancel", (e) => {
      touchend(e);        
    }, false);
    row.addEventListener("touchend", (e) => {
      touchend(e);        
    }, false);

    this.switcher = this.makeAreaSwitcher(row);

    if (isMobile()||1) {
      this.helppicker = row.helppicker();
    }

    if (add_note_area) {
      let notef = document.createElement("noteframe-x");
      notef.ctx = this.ctx;
      row._add(notef);
    }

    this.header = row;
    
    return row;
  }
  
  setCSS() {
    if (this.size !== undefined) {
      this.style["position"] = "absolute";
      //this.style["left"] = this.pos[0] + "px";
      //this.style["top"] = this.pos[1] + "px";
      this.style["width"] = this.size[0] + "px";
      this.style["height"] = this.size[1] + "px";
    }
  }
  
  update() {
    //don't update non-active editors
    if (this.owning_sarea === undefined || this !== this.owning_sarea.area) {
      return;
    }

    super.update();
    
    //see FrameManager.js, we use a single update
    //function for everything now
    //this._forEachChildWidget((n) => {
    //  n.update();
    //});
  }

  loadSTRUCT(reader) {
    reader(this);
  }

  static define() {return {
    tagname  : undefined, // e.g. "areadata-x",
    areaname : undefined, //api name for area type
    uiname   : undefined,
    icon : undefined //icon representing area in MakeHeader's area switching menu. Integer.
  };}

  _isDead() {
    if (this.dead) {
      return true;
    }

    let screen = this.getScreen();

    if (screen === undefined)
      return true;

    if (screen.parentNode === undefined)
      return true;
  }

  //subclassing loadSTRUCTs should either call this, or invoke super.loadSTRUCT()
  afterSTRUCT() {
    let f = () => {
      if (this._isDead()) {
        return;
      }
      if (!this.ctx) {
        this.doOnce(f);
        return;
      }

      try {
        console.log("load ui data");
        loadUIData(this, this.saved_uidata);
        this.saved_uidata = undefined;
      } catch (error) {
        console.log("failed to load ui data");
        print_stack$1(error);
      }
    };

    this.doOnce(f);
  }

  static newSTRUCT(reader) {
    return document.createElement(this.define().tagname);
  }

  loadSTRUCT(reader) {
    reader(this);
  }
  
  _getSavedUIData() {
    return saveUIData(this, "area");
  }
}

Area.STRUCT = `
pathux.Area { 
  flag : int;
  saved_uidata : string | obj._getSavedUIData();
}
`;

nstructjs.manager.add_class(Area);  
//ui_base.UIBase.register(Area);

class ScreenArea extends UIBase {
  constructor() {
    super();
    
    this._borders = [];
    this._verts = [];
    this.dead = false;
    
    this._sarea_id = contextWrangler.idgen++;
    
    this._pos = new Vector2$c();
    this._size = new Vector2$c([512, 512]);

    if (exports.DEBUG.screenAreaPosSizeAccesses) {
      let wrapVector = (name, axis) => {
        Object.defineProperty(this[name], axis, {
          get: function () {
            return this["_" + axis];
          },

          set: function (val) {
            console.warn(`ScreenArea.${name}[${axis}] set:`, val);
            this["_" + axis] = val;
          }
        });
      };

      wrapVector("size", 0);
      wrapVector("size", 1);
      wrapVector("pos", 0);
      wrapVector("pos", 1);
    }

    this.area = undefined;
    this.editors = [];
    this.editormap = {};

    this.addEventListener("mouseover", (e) => {
      if (haveModal()) {
        return;
      }

      //console.log("screen area mouseover");
      let screen = this.getScreen();
      if (screen.sareas.active !== this && screen.sareas.active && screen.sareas.active.area) {
        screen.sareas.active.area.on_area_blur();
      }

      if (screen.sareas.active !== this) {
        this.area.on_area_focus();
      }

      screen.sareas.active = this;
    });

    //this.addEventListener("mouseleave", (e) => {
      //console.log("screen area mouseleave");
    //});
  }
  
  /*
  saveData() {
    return {
      _sarea_id : this._sarea_id,
      pos       : this.pos,
      size      : this.size,
    };
  }
  loadData(obj) {
    super.loadData(obj);

    let id = obj._sarea_id;
    
    let type = obj.areatype;
    
    if (id !== undefined && id !== null) {
      this._sarea_id = id;
    }
    
    for (let area of this.editors) {
      if (area.areaType == type) {
        console.log("             found saved area type");
        
        this.switch_editor(area.constructor);
      }
    }
    
    this.pos.load(obj.pos);
    this.size.load(obj.size);
  }//*/

  get floating() {
    return this.area ? this.area.floating : undefined;
  }

  set floating(val) {
    if (this.area) {
      this.area.floating = val;
    }
  }

  get flag() {
    return this.area ? this.area.flag : 0;
  }

  _get_v_suffix() {
    return this.area ? this.area._get_v_suffix() : "";
  }

  get borderLock() {
    return this.area !== undefined ? this.area.borderLock : 0;
  }

  get minSize() {
    return this.area !== undefined ? this.area.minSize : [5, 5];
  }

  get maxSize() {
    return this.area !== undefined ? this.area.maxSize : [undefined, undefined];
  }

  bringToFront() {
    let screen = this.getScreen();

    this.remove(false);
    screen.sareas.remove(this);

    screen.appendChild(this);

    let zindex = 0;

    if (screen.style["z-index"]) {
      zindex = parseInt(screen.style["z-index"]) + 1;
    }

    for (let sarea of screen.sareas) {
      let zindex = sarea.style["z-index"];
      if (sarea.style["z-index"]) {
        zindex = Math.max(zindex, parseInt(sarea.style["z-index"]) + 1);
      }
    }

    this.style["z-index"] = zindex;
  }

  _side(border) {
    let ret = this._borders.indexOf(border);
    if (ret < 0) {
      throw new Error("border not in screen area");
    }

    return ret;
  }

  init() {
    super.init();

    this.noMarginsOrPadding();
  }

  draw() {
    if (this.area.draw) {
      this.area.push_ctx_active();
      this.area.draw();
      this.area.pop_ctx_active();
    }
  }

  _isDead() {
    if (this.dead) {
      return true;
    }

    let screen = this.getScreen();

    if (screen === undefined)
      return true;

    if (screen.parentNode === undefined)
      return true;
  }

  toJSON() {
    let ret = {
      editors : this.editors,
      _sarea_id : this._sarea_id,
      area : this.area.constructor.define().areaname,
      pos : this.pos,
      size : this.size
    };
    
    return Object.assign(super.toJSON(), ret);
  }

  on_keydown(e) {
    if (this.area.on_keydown) {
      this.area.push_ctx_active();
      this.area.on_keydown(e);
      this.area.pop_ctx_active();
    }
  }

  loadJSON(obj) {
    if (obj === undefined) {
      console.warn("undefined in loadJSON");
      return;
    }

    super.loadJSON(obj);
    
    this.pos.load(obj.pos);
    this.size.load(obj.size);
    
    for (let editor of obj.editors) {
      let areaname = editor.areaname;
      
      //console.log(editor);
      
      let tagname = areaclasses[areaname].define().tagname;
      let area = document.createElement(tagname);
      
      area.owning_sarea = this;
      this.editormap[areaname] = area;
      this.editors.push(this.editormap[areaname]);

      area.pos = new Vector2$c(obj.pos);
      area.size = new Vector2$c(obj.size);
      area.ctx = this.ctx;
      
      area.inactive = true;
      area.loadJSON(editor);
      area.owning_sarea = undefined;
      
      if (areaname === obj.area) {
        this.area = area;
      }
    }
    
    if (this.area !== undefined) {
      this.area.ctx = this.ctx;
      this.area.style["width"] = "100%";
      this.area.style["height"] = "100%";
      this.area.owning_sarea = this;
      
      this.area.pos = this.pos;
      this.area.size = this.size;
      
      this.area.inactive = false;
      this.shadow.appendChild(this.area);
      this.area.on_area_active();
      this.area.onadd();
    }
    
    this.setCSS();
  }

  _ondestroy() {
    super._ondestroy();

    this.dead = true;
    
    for (let editor of this.editors) {
      if (editor === this.area) continue;
      
      editor._ondestroy();
    }
  }
  
  getScreen() {
    if (this.screen !== undefined) {
      return this.screen;
    }

    //try to walk up graph, if possible
    let p = this.parentNode;
    let _i = 0;

    while (p && !(p instanceof Screen$1) && p !== p.parentNode) {
      p = this.parentNode;

      if (_i++ > 1000) {
        console.warn("infinite loop detected in ScreenArea.prototype.getScreen()");
        return undefined;
      }
    }
    
    return p && p instanceof Screen$1 ? p : undefined;
  }
  
  copy(screen) {
    let ret = document.createElement("screenarea-x");
    
    ret.screen = screen;
    ret.ctx = this.ctx;
    
    ret.pos[0] = this.pos[0];
    ret.pos[1] = this.pos[1];
    
    ret.size[0] = this.size[0];
    ret.size[1] = this.size[1];
    
    for (let area of this.editors) {
      let cpy = area.copy();
      
      cpy.ctx = this.ctx;

      cpy.parentWidget = ret;
      ret.editors.push(cpy);

      if (area === this.area) {
        ret.area = cpy;
      }
    }
    
    //console.trace("RET.AREA", this.area, ret.area);

    ret.ctx = this.ctx;

    if (ret.area !== undefined) {
      ret.area.ctx = this.ctx;

      ret.area.pos = ret.pos;
      ret.area.size = ret.size;
      ret.area.owning_sarea = ret;
      ret.area.parentWidget = ret;
      
      ret.shadow.appendChild(ret.area);
      //ret.area.onadd();
      
      if (ret.area._init_done) {
        ret.area.push_ctx_active();
        ret.area.on_area_active();
        ret.area.pop_ctx_active();
      } else {
        ret.doOnce(() => {
          if (this.dead) {
            return;
          }
          ret._init();
          ret.area._init();
          ret.area.push_ctx_active();
          ret.area.on_area_active();
          ret.area.pop_ctx_active();
        });
      }
    }
    
    return ret;
  }

  /**
   *
   * Sets screen verts from pos/size
   * */
  loadFromPosSize() {
    let screen = this.getScreen();
    if (!screen) return;

    for (let b of this._borders) {
      screen.freeBorder(b);
    }

    this.makeBorders(screen);
    this.setCSS();

    return this;
  }

  /**
   *
   * Sets pos/size from screen verts
   * */
  loadFromVerts() {
    if (this._verts.length == 0) {
      return;
    }

    let min = new Vector2$c([1e17, 1e17]);
    let max = new Vector2$c([-1e17, -1e17]);

    for (let v of this._verts) {
      min.min(v);
      max.max(v);
    }
    
    this.pos[0] = min[0];
    this.pos[1] = min[1];

    this.size[0] = max[0]-min[0];
    this.size[1] = max[1]-min[1];

    this.setCSS();
    return this;
  }
  
  on_resize(size, oldsize) {
    super.on_resize(size, oldsize);
    
    if (this.area !== undefined) {
      this.area.on_resize(size, oldsize);
    }      
  }
  
  makeBorders(screen) {
    this._borders.length = 0;
    this._verts.length = 0;
    
    let p = this.pos, s = this.size;

    //s = snapi(new Vector2(s));

    let vs = [
      new Vector2$c([p[0],      p[1]]),
      new Vector2$c([p[0],      p[1]+s[1]]),
      new Vector2$c([p[0]+s[0], p[1]+s[1]]),
      new Vector2$c([p[0]+s[0], p[1]])
    ];

    for (let i=0; i<vs.length; i++) {
      vs[i] = snap(vs[i]);
      vs[i] = screen.getScreenVert(vs[i], i);
      this._verts.push(vs[i]);
    }

    for (let i=0; i<vs.length; i++) {
      let v1 = vs[i], v2 = vs[(i + 1) % vs.length];

      let b = screen.getScreenBorder(this, v1, v2, i);


      for (let j=0; j<2; j++) {
        let v = j ? b.v2 : b.v1;

        if (v.sareas.indexOf(this) < 0) {
          v.sareas.push(this);
        }
      }

      if (b.sareas.indexOf(this) < 0) {
        b.sareas.push(this);
      }
      
      this._borders.push(b);

      b.movable = screen.isBorderMovable(b);
    }
    
    return this;
  }
  
  setCSS() {
    this.style["position"] = "absolute";
    
    this.style["left"] = this.pos[0] + "px";
    this.style["top"] = this.pos[1] + "px";
    
    this.style["width"] = this.size[0] + "px";
    this.style["height"] = this.size[1] + "px";
    
    
    if (this.area !== undefined) {
      this.area.setCSS();
      //this.style["overflow"] = this.area.style["overflow"];
      
      //this.area.style["width"] = this.size[0] + "px";
      //this.area.style["height"] = this.size[1] + "px";
    }
      
    /*
    if (this.area) {
      let area = this.area;
      area.style["position"] = "absolute";
      
      area.style["width"] = this.size[0] + "px";
      area.style["height"] = this.size[1] + "px";
    }
    //*/
  }
  
  appendChild(child) {
    if (child instanceof Area) {
      child.ctx = this.ctx;
      child.pos = this.pos;
      child.size = this.size;
      
      if (this.editors.indexOf(child) < 0) {
        this.editors.push(child);
      }
      
      child.owning_sarea = undefined;
    }
    
    super.appendChild(child);
    
    if (child instanceof UIBase) {
      child.onadd();
    }
  }

  switch_editor(cls) {
    return this.switchEditor(cls);
  }

  switchEditor(cls) {
    let def = cls.define();
    let name = def.areaname;
    
    //areaclasses[name]
    if (!(name in this.editormap)) {
      this.editormap[name] = document.createElement(def.tagname);
      this.editormap[name].ctx = this.ctx;
      this.editormap[name].parentWidget = this;
      this.editormap[name].owning_sarea = this;
      this.editormap[name].inactive = false;
      
      this.editors.push(this.editormap[name]);
    }
    
    //var finish = () => {
      if (this.area !== undefined) {
        //break direct pos/size references for old active area
        this.area.pos = new Vector2$c(this.area.pos);
        this.area.size = new Vector2$c(this.area.size);
        
        this.area.owning_sarea = undefined;
        this.area.inactive = true;
        this.area.push_ctx_active();
        this.area._init(); //check that init was called
        this.area.on_area_inactive();
        this.area.pop_ctx_active();
        
        this.area.remove();
      }
      
      this.area = this.editormap[name];

      this.area.inactive = false;
      this.area.parentWidget = this;

      //. . .and set references to pos/size
      this.area.pos = this.pos;
      this.area.size = this.size;
      this.area.owning_sarea = this;
      this.area.ctx = this.ctx;

      this.area.packflag |= this.packflag;

      this.shadow.appendChild(this.area);

      this.area.style["width"] = "100%";
      this.area.style["height"] = "100%";

      //propegate new size
      this.area.push_ctx_active();
      this.area._init(); //check that init was called
      this.area.on_resize(this.size, this.size);
      this.area.pop_ctx_active();

      this.area.push_ctx_active();
      this.area.on_area_active();
      this.area.pop_ctx_active();

      this.regenTabOrder();
    //}
  }

  _checkWrangler() {
    if (this.ctx)
      contextWrangler._checkWrangler(this.ctx);
  }

  update() {
    this._checkWrangler();

    super.update();

    //flag client controller implementation that
    //this area is active for its type
    if (this.area !== undefined) {
      this.area.owning_sarea = this;
      this.area.parentWidget = this;
      this.area.size = this.size;
      this.area.pos = this.pos;

      let screen = this.getScreen();
      let oldsize = [this.size[0], this.size[1]];

      let moved = screen ? screen.checkAreaConstraint(this, true) : 0;
      //*
      if (moved) {
        if (exports.DEBUG.areaConstraintSolver) {
          console.log("screen constraint solve", moved, this.area.minSize, this.area.maxSize, this.area, this.size);
        }

        screen.solveAreaConstraints();
        screen.regenBorders();
        this.on_resize(oldsize);
      }//*/

      this.area.push_ctx_active(true);
    }

    this._forEachChildWidget((n) => {
      n.update();
    });

    if (this.area !== undefined) {
      this.area.pop_ctx_active(true);
    }
  }

  static newSTRUCT() {
    return document.createElement("screenarea-x");
  }

  afterSTRUCT() {
    for (let area of this.editors) {
      area.pos = this.pos;
      area.size = this.size;
      area.owning_sarea = this;

      area.push_ctx_active();
      area._ctx = this.ctx;
      area.afterSTRUCT();
      area.pop_ctx_active();
    }
  }

  get pos() {
    return this._pos;
  }

  set pos(val) {
    if (exports.DEBUG.screenAreaPosSizeAccesses) {
      console.log("ScreenArea set pos", val);
    }
    this._pos.load(val);
  }

  get size() {
    return this._size;
  }

  set size(val) {
    if (exports.DEBUG.screenAreaPosSizeAccesses) {
      console.log("ScreenArea set size", val);
    }
    this._size.load(val);
  }

  loadSTRUCT(reader) {
    reader(this);

    this.pos = new Vector2$c(this.pos);
    this.size = new Vector2$c(this.size);
    
    //find active editor
    
    let editors = [];

    for (let area of this.editors) {
      if (!area.constructor || !area.constructor.define) {
        //failed to load this area
        continue;
      }

      /*
      if (area.constructor === undefined || area.constructor.define === undefined) {
        console.warn("Missing class for area", area, "maybe buggy loadSTRUCT()?");
        continue;
      }
      //*/
      
      let areaname = area.constructor.define().areaname;

      area.inactive = true;
      area.owning_sarea = undefined;
      this.editormap[areaname] = area;
      
      if (areaname === this.area) {
        this.area = area;
      }

      /*
      * originally inactive areas weren't supposed to have
      * a reference to their owning ScreenAreas.
      *
      * Unfortunately this will cause isDead() to return true,
      * which might lead to nasty problems.
      * */
      area.parentWidget = this;

      editors.push(area);
    }
    this.editors = editors;
    
    if (typeof this.area !== "object") {
      let area = this.editors[0];

      console.warn("Failed to find active area!", this.area);

      if (typeof area !== "object") {
        for (let k in areaclasses) {
          area = areaclasses[k].define().tagname;
          area = document.createElement(area);
          let areaname = area.constructor.define().areaname;

          this.editors.push(area);
          this.editormap[areaname] = area;

          break;
        }
      }

      if (area) {
        this.area = area;
      }
    }

    if (this.area !== undefined) {
      this.area.style["width"] = "100%";
      this.area.style["height"] = "100%";
      this.area.owning_saea = this;
      this.area.parentWidget = this;

      this.area.pos = this.pos;
      this.area.size = this.size;

      this.area.inactive = false;
      this.shadow.appendChild(this.area);

      let f = () => {
        if (this._isDead()) {
          return;
        }

        if (!this.ctx && this.parentNode) {
          console.log("waiting to start. . .");
          this.doOnce(f);
          return;
        }

        this.area.ctx = this.ctx;
        this.area._init(); //ensure init has been called already
        this.area.on_area_active();
        this.area.onadd();
      };

      this.doOnce(f);
    }

  }
  
  static define() {return {
    tagname : "screenarea-x"
  };}
}

ScreenArea.STRUCT = `
pathux.ScreenArea { 
  pos      : vec2;
  size     : vec2;
  type     : string;
  hidden   : bool;
  editors  : array(abstract(pathux.Area));
  area     : string | obj.area.constructor.define().areaname;
}
`;

nstructjs.manager.add_class(ScreenArea);  
UIBase.register(ScreenArea);

var ScreenArea$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  AreaFlags: AreaFlags,
  BorderMask: BorderMask,
  BorderSides: BorderSides,
  Area: Area,
  ScreenArea: ScreenArea,
  setScreenClass: setScreenClass,
  getAreaIntName: getAreaIntName,
  AreaTypes: AreaTypes,
  setAreaTypes: setAreaTypes,
  areaclasses: areaclasses,
  AreaWrangler: AreaWrangler
});

function makePopupArea(area_class, screen, args={}) {
  let sarea = document.createElement("screenarea-x");

  let width = args.width || (screen.size[0]*0.7);
  let height = args.height || (screen.size[1]*0.7);
  let addEscapeKeyHandler = args.addEscapeKeyHandler !== undefined ? args.addEscapeKeyHandler : true;

  sarea.ctx = screen.ctx;
  sarea.size[0] = width;
  sarea.size[1] = height;
  sarea.pos[0] = 100;
  sarea.pos[1] = 100;

  sarea.pos[0] = Math.min(sarea.pos[0], screen.size[0] - sarea.size[0] - 2);
  sarea.pos[1] = Math.min(sarea.pos[1], screen.size[1] - sarea.size[1] - 2);

  sarea.switch_editor(area_class);

  sarea.style["background-color"] = sarea.getDefault("DefaultPanelBG");

  sarea.area.flag |= AreaFlags.FLOATING | AreaFlags.INDEPENDENT;

  screen.appendChild(sarea);
  sarea.setCSS();

  if (addEscapeKeyHandler) {
    sarea.on_keydown = (e) => {
      if (e.keyCode === keymap.Escape) {
        screen.removeArea(sarea);
      }
    };
  }

  sarea.bringToFront();

  return sarea;
}

let _FrameManager = undefined;

let Area$1 = Area;

startMenuEventWrangling();

let _events_started = false;

function registerToolStackGetter$1(func) {
  registerToolStackGetter(func);
}

//XXX why!!!
window._nstructjs = nstructjs;

let Vector2$d = Vector2,
  UIBase$g = UIBase;

let update_stack = new Array(8192);
update_stack.cur = 0;

let screen_idgen = 0;

class Screen$2 extends UIBase {
  constructor() {
    super();

    this.allBordersMovable = exports.DEBUG.allBordersMovable;
    this.needsBorderRegen = true;

    this._popup_safe = 0;

    //if true, will test all areas for keymaps on keypress,
    //not just the active one
    this.testAllKeyMaps = false;

    this.needsTabRecalc = true;
    this._screen_id = screen_idgen++;

    this._popups = [];

    this._ctx = undefined;

    this.keymap = new KeyMap();

    this.size = new Vector2$d([window.innerWidth, window.innerHeight]);
    this.pos = new Vector2$d();

    this.idgen = 0;
    this.sareas = [];
    this.sareas.active = undefined;
    this.mpos = [0, 0];

    this.screenborders = [];
    this.screenverts = [];
    this._vertmap = {};
    this._edgemap = {};
    this._idmap = {};

    //effective bounds of screen
    this._aabb = [new Vector2$d(), new Vector2$d()];

    this.shadow.addEventListener("mousemove", (e) => {
      let elem = this.pickElement(e.x, e.y, 1, 1, ScreenArea);

      //console.log(this.pickElement(e.x, e.y));

      if (elem !== undefined) {
        if (elem.area) {
          //make sure context area stacks are up to date
          elem.area.push_ctx_active();
          elem.area.pop_ctx_active();
        }

        this.sareas.active = elem;
      }

      this.mpos[0] = e.x;
      this.mpos[1] = e.y;
    });

    this.shadow.addEventListener("touchmove", (e) => {
      this.mpos[0] = e.touches[0].pageX;
      this.mpos[1] = e.touches[0].pageY;
    });

  }

  newScreenArea() {
    let ret = document.createElement("screenarea-x");
    ret.ctx = this.ctx;

    if (ret.ctx) {
      ret.init();
    }

    return ret;
  }

  copy() {
    let ret = document.createElement(this.constructor.define().tagname);
    ret.ctx = this.ctx;
    ret._init();

    for (let sarea of this.sareas) {
      let sarea2 = sarea.copy(ret);

      sarea2._ctx = this.ctx;
      sarea2.screen = ret;
      sarea2.parentWidget = ret;

      ret.appendChild(sarea2);
    }

    for (let sarea of ret.sareas) {
      sarea.ctx = this.ctx;
      sarea.area.ctx = this.ctx;

      sarea.area.push_ctx_active();
      sarea._init();
      sarea.area._init();
      sarea.area.pop_ctx_active();

      for (let area of sarea.editors) {
        area.ctx = this.ctx;

        area.push_ctx_active();
        area._init();
        area.pop_ctx_active();
      }
    }

    ret.update();
    ret.regenBorders();
    ret.setCSS();

    return ret;
  }

  findScreenArea(x, y) {
    for (let i=this.sareas.length-1; i>=0; i--) {
      let sarea = this.sareas[i];

      let ok = x >= sarea.pos[0] && x <= sarea.pos[0] + sarea.size[0];
      ok = ok && (y >= sarea.pos[1] && y <= sarea.pos[1] + sarea.size[1]);

      if (ok) {
        return sarea;
      }
    }
  }
  //pickElement(x, y, sx=0, sy=0, nodeclass=undefined) {

  //}

  pickElement(x, y, sx, sy, nodeclass, excluded_classes) {
    if (!this.ctx) {
      console.warn("no ctx in screen");
      return;
    }

    let ret;

    for (let i=this._popups.length-1; i >= 0; i--) {
      let popup = this._popups[i];

      ret = ret || popup.pickElement(...arguments);
    }

    ret = ret || super.pickElement(...arguments);

    return ret;
  }

  _enterPopupSafe() {
    if (this._popup_safe === undefined) {
      this._popup_safe = 0;
    }

    this._popup_safe++;
  }

  * _allAreas() {
    for (let sarea of this.sareas) {
      for (let area of sarea.editors) {
        yield [area, area._area_id, sarea];
      }
    }
  }

  _exitPopupSafe() {
    this._popup_safe = Math.max(this._popup_safe-1, 0);
  }
  /** makes a popup at x,y and returns a new container-x for it */
  popup(owning_node, elem_or_x, y, closeOnMouseOut=true) {
    let x;

    let sarea = this.sareas.active;

    let w = owning_node;
    while (w) {
      if (w instanceof ScreenArea) {
        sarea = w;
        break;
      }
      w = w.parentWidget;
    }

    if (typeof elem_or_x === "object") {
      let r = elem_or_x.getClientRects()[0];

      x = r.x;
      y = r.y;
    } else {
      x = elem_or_x;
    }

    let container = document.createElement("container-x");

    container.ctx = this.ctx;
    container._init();

    let remove = container.remove;
    container.remove = () => {
      if (this._popups.indexOf(container) >= 0) {
        this._popups.remove(container);
      }

      return remove.apply(container, arguments);
    };

    container.background = this.getDefault("BoxSubBG");
    container.style["position"] = "absolute";
    container.style["z-index"] = 205;
    container.style["left"] = x + "px";
    container.style["top"] = y + "px";

    container.parentWidget = this;

    let mm = new MinMax(2);
    let p = new Vector2$d();

    let _update = container.update;
    container.update = () => {
      _update.call(container);

      let rects = container.getClientRects();
      mm.reset();

      for (let r of rects) {
        p[0] = r.x;
        p[1] = r.y;
        mm.minmax(p);

        p[0] += r.width;
        p[1] += r.height;
        mm.minmax(p);
      }

      let x = mm.min[0], y = mm.min[1];

      x = Math.min(x, this.size[0]-(mm.max[0]-mm.min[0]));
      y = Math.min(y, this.size[1]-(mm.max[1]-mm.min[1]));

      container.style["left"] = x + "px";
      container.style["top"] = y + "px";
    };

    document.body.appendChild(container);
    //this.shadow.appendChild(container);
    this.setCSS();

    this._popups.push(container);

    let touchpick, mousepick, keydown;

    let done = false;
    let end = () => {
      if (this._popup_safe) {
        return;
      }

      if (done) return;
      console.log("container end");

      this.ctx.screen.removeEventListener("touchstart", touchpick, true);
      this.ctx.screen.removeEventListener("touchmove", touchpick, true);
      this.ctx.screen.removeEventListener("mousedown", mousepick, true);
      this.ctx.screen.removeEventListener("mousemove", mousepick, true);
      this.ctx.screen.removeEventListener("mouseup", mousepick, true);
      window.removeEventListener("keydown", keydown);

      done = true;
      container.remove();
    };

    container.end = end;

    let _remove = container.remove;
    container.remove = function() {
      if (arguments.length == 0) {
        end();
      }
      _remove.apply(this, arguments);
    };

    container._ondestroy = () => {
      end();
    };

    let bad_time = time_ms();
    let last_pick_time = time_ms();

    mousepick = (e, x, y, do_timeout=true) => {
      if (sarea && sarea.area) {
        sarea.area.push_ctx_active();
        sarea.area.pop_ctx_active();
      }
      //console.log("=======================================================popup touch start");
      //console.log(e);
      
      if (time_ms() - last_pick_time < 250) {
        return;
      }
      last_pick_time = time_ms();

      x = x === undefined ? e.x : x;
      y = y === undefined ? e.y : y;

      let elem = this.pickElement(x, y, 2, 2, undefined, [ScreenBorder]);
      let startelem = elem;

      if (elem === undefined) {
        if (closeOnMouseOut) {
          end();
        }
        return;
      }

      let ok = false;

      while (elem) {
        if (elem === container) {
          ok = true;
          break;
        }
        elem = elem.parentWidget;
      }

      if (!ok) {
        e.stopPropagation();

        do_timeout = !do_timeout || (time_ms() - bad_time > 100);

        if (closeOnMouseOut && do_timeout) {
          end();
        }
      } else {
        bad_time = time_ms();
      }
    };

    touchpick = (e) => {
      let x = e.touches[0].pageX, y = e.touches[0].pageY;

      return mousepick(e, x, y, false);
    };

    keydown = (e) => {
      console.log(e.keyCode);

      switch (e.keyCode) {
        case keymap["Escape"]:
          end();
          break;
      }
    };

    this.ctx.screen.addEventListener("touchstart", touchpick, true);
    this.ctx.screen.addEventListener("touchmove", touchpick, true);
    this.ctx.screen.addEventListener("mousemove", mousepick, true);
    this.ctx.screen.addEventListener("mousedown", mousepick, true);
    this.ctx.screen.addEventListener("mouseup", mousepick, true);
    window.addEventListener("keydown", keydown);

    /*
    container.addEventListener("mouseleave", (e) => {
      console.log("popup mouse leave");
      if (closeOnMouseOut)
        end();
    });
    container.addEventListener("mouseout", (e) => {
      console.log("popup mouse out");
      if (closeOnMouseOut)
        end();
    });
    //*/

    this.calcTabOrder();

    return container;
  }

  _recalcAABB(save=true) {
    let mm = new MinMax(2);

    for (let v of this.screenverts) {
      mm.minmax(v);
    }

    if (save) {
      this._aabb[0].load(mm.min);
      this._aabb[1].load(mm.max);
    }

    return [new Vector2$d(mm.min), new Vector2$d(mm.max)];
  }

  get borders() {
    let this2 = this;

    return (function* () {
      for (let k in this2._edgemap) {
        yield this2._edgemap[k];
      }
    })();
  }

  //XXX look at if this is referenced anywhere
  load() {
  }

  //XXX look at if this is referenced anywhere
  save() {
  }

  popupArea(area_class) {
    return makePopupArea(area_class, this);
  }

  remove(trigger_destroy = true) {
    this.unlisten();

    if (trigger_destroy) {
      return super.remove();
    } else {
      HTMLElement.prototype.remove.call(this);
    }
  }

  unlisten() {
    if (this.listen_timer !== undefined) {
      window.clearInterval(this.listen_timer);
      this.listen_timer = undefined;
    }
  }

  updateSize() {
    if (!exports.autoSizeUpdate) {
      return;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;

    if (isMobile()) {
      width = window.screen.availWidth || window.screen.width;
      height = window.screen.availHeight || window.screen.height;

      //let dpi = UIBase.getDPI();
      let dpi = 0.985 / visualViewport.scale;

      width *= dpi*0.985;
      height *= dpi;
      width = ~~width;
      height = ~~height;
    }

    if (exports.DEBUG.customWindowSize) {
      let s = exports.DEBUG.customWindowSize;
      width = s.width;
      height = s.height; 
    }
    
    if (width !== this.size[0] || height !== this.size[1]) {
      console.log("resizing", width, height, this.size[0], this.size[1]);
      this.on_resize(this.size, [width, height]);
    }
  }

  listen(args={updateSize : true}) {
    setWranglerScreen(this);

    let ctx = this.ctx;
    startEvents(() => ctx.screen);

    if (this.listen_timer !== undefined) {
      return; //already listening
    }

    this._do_updateSize = args.updateSize !== undefined ? args.updateSize : true;

    this.listen_timer = window.setInterval(() => {
      if (this.isDead()) {
        console.log("dead screen");
        this.unlisten();
        return;
      }
      
      this.update();
    }, 150);
  }

  _ondestroy() {
    if (getWranglerScreen() === this) {
      //ui_menu.setWranglerScreen(undefined);
    }

    this.unlisten();

    //unlike other ondestroy functions, this one physically dismantles the DOM tree
    let recurse = (n, second_pass, parent) => {
      if (n.__pass === second_pass) {
        console.warn("CYCLE IN DOM TREE!", n, parent);
        return;
      }

      n.__pass = second_pass;

      n._forEachChildWidget(n2 => {
        if (n === n2)
          return;
        recurse(n2, second_pass, n);

        try {
          if (!second_pass && !n2.__destroyed) {
            n2.__destroyed = true;
            n2._ondestroy();
          }
        } catch (error) {
          print_stack(error);
          console.log("failed to exectue an ondestroy callback");
        }

        n2.__destroyed = true;

        try {
          if (second_pass) {
            n2.remove();
          }
        } catch (error) {
          print_stack(error);
          console.log("failed to remove element after ondestroy callback");
        }
      });
    };

    let id = ~~(Math.random() * 1024 * 1024);

    recurse(this, id);
    recurse(this, id + 1);
  }

  destroy() {
    this._ondestroy();
  }

  clear() {
    this._ondestroy();

    this.sareas = [];
    this.sareas.active = undefined;

    for (let child of list(this.childNodes)) {
      child.remove();
    }
    for (let child of list(this.shadow.childNodes)) {
      child.remove();
    }
  }

  _test_save() {
    let obj = JSON.parse(JSON.stringify(this));
    console.log(JSON.stringify(this));

    this.loadJSON(obj);
  }

  loadJSON(obj, schedule_resize = false) {
    this.clear();
    super.loadJSON();

    for (let sarea of obj.sareas) {
      let sarea2 = document.createElement("screenarea-x");

      sarea2.ctx = this.ctx;
      sarea2.screen = this;

      this.appendChild(sarea2);

      sarea2.loadJSON(sarea);
    }

    this.regenBorders();
    this.setCSS();

    if (schedule_resize) {
      window.setTimeout(() => {
        this.on_resize(this.size, [window.innerWidth, window.innerHeight]);
      }, 50);
    }
  }

  static fromJSON(obj, schedule_resize = false) {
    let ret = document.createElement(this.define().tagname);
    return ret.loadJSON(obj, schedule_resize);
  }

  toJSON() {
    let ret = {
      sareas: this.sareas
    };

    ret.size = this.size;
    ret.idgen = this.idgen;

    return Object.assign(super.toJSON(), ret);
  }

  getHotKey(toolpath) {
    let test = (keymap) => {
      for (let hk of keymap) {
        if (typeof hk.action != "string")
          continue;

        if (hk.action.trim().startsWith(toolpath.trim())) {
          return hk;
        }
      }
    };

    let ret = test(this.keymap);
    if (ret)
      return ret;

    if (this.sareas.active && this.sareas.active.keymap) {
      let area = this.sareas.active.area;

      for (let keymap of area.getKeyMaps()) {
        ret = test(keymap);

        if (ret)
          return ret;
      }
    }

    if (ret === undefined) {
      //just to be safe, check all areas in case the
      //context is confused as to which area is currently "active"

      for (let sarea of this.sareas) {
        let area = sarea.area;

        for (let keymap of area.getKeyMaps()) {
          ret = test(keymap);

          if (ret) {
            return ret;
          }
        }
      }
    }

    return undefined;
  }

  execKeyMap(e) {
    let handled = false;

    //console.warn("execKeyMap called");

    if (this.sareas.active) {
      let area = this.sareas.active.area;
      //console.log(area.getKeyMaps());
      if (!area) {
        console.warn("eek");
        return;
      }
      for (let keymap of area.getKeyMaps()) {
        if (keymap === undefined) {
          console.warn("eek!");
        }
        if (keymap.handle(this.ctx, e)) {
          handled = true;
          break;
        }
      }
    }

    handled = handled || this.keymap.handle(this.ctx, e);

    if (!handled && this.testAllKeyMaps) {
      for (let sarea of this.sareas) {
        if (handled) {
          break;
        }

        for (let keymap of sarea.area.getKeyMaps()) {
          if (keymap.handle(this.ctx, e)) {
            handled = true;
            break;
          }
        }
      }
    }

    return handled;
  }

  static define() {
    return {
      tagname: "screen-x"
    };
  }

  calcTabOrder() {
    let nodes = [];
    let visit = {};

    let rec = (n) => {
      let bad = n.tabIndex < 0 || n.tabIndex === undefined || n.tabIndex === null;

      if (n._id in visit || n.hidden) {
        return;
      }

      visit[n._id] = 1;

      if (!bad) {
        n.__pos = n.getClientRects()[0];
        if (n.__pos) {
          nodes.push(n);
        }
      }

      n._forEachChildWidget((n2) => {
        rec(n2);
      });
    };

    for (let sarea of this.sareas) {
      rec(sarea);
    }

    for (let popup of this._popups) {
      rec(popup);
    }

    //console.log("nodes2", nodes2);
    for (let i=0; i<nodes.length; i++) {
      let n = nodes[i];

      n.tabIndex = i + 1;
      //console.log(n.tabIndex);
    }
  }

  drawUpdate() {
    if (window.redraw_all !== undefined) {
      window.redraw_all();
    }
  }

  update() {
    let move = [];
    for (let child of this.childNodes) {
      if (child instanceof ScreenArea$1) {
        move.push(child);
      }
    }

    for (let child of move) {
      console.warn("moved screen area to shadow");

      HTMLElement.prototype.remove.call(child);
      this.shadow.appendChild(child);
    }

    if (this._do_updateSize) {
      this.updateSize();
    }

    if (this.needsTabRecalc) {
      this.needsTabRecalc = false;
      this.calcTabOrder();
    }

    outer: for (let sarea of this.sareas) {
      for (let b of sarea._borders) {
        let movable = this.isBorderMovable(b);

        if (movable !== b.movable) {
          console.log("detected change in movable borders");
          this.regenBorders();
          break outer;
        }
      }
    }

    if (this._update_gen) {
      let ret;

      /*
      if (cconst.DEBUG.debugUIUpdatePerf) {
          for (ret = this._update_gen.next(); !ret.done; ret = this._update_gen.next()) {}

        this._update_gen = this.update_intern();
        return;
      }
      //*/

      try {
        ret = this._update_gen.next();
      } catch (error) {
        print_stack$1(error);
        console.log("error in update_intern tasklet");
        this._update_gen = undefined;
        return;
      }

      if (ret !== undefined && ret.done) {
        this._update_gen = undefined;
      }
    } else {
      this._update_gen = this.update_intern();
    }
  }

  get ctx() {
    return this._ctx;
  }

  set ctx(val) {
    this._ctx = val;

    //fully recurse tree
    let rec = (n) => {
      if (n instanceof UIBase$g) {
        n.ctx = val;
      }

      for (let n2 of n.childNodes) {
        rec(n2);
      }

      if (n.shadow) {
        for (let n2 of n.shadow.childNodes) {
          rec(n2);
        }
      }
    };

    for (let n of this.childNodes) {
      rec(n);
    }

    for (let n of this.shadow.childNodes) {
      rec(n);
    }
  }

  completeUpdate() {
    for (let step of this.update_intern()) {
    }
  }

  //XXX race condition warning
  update_intern() {
    let popups = this._popups;

    if (this.needsBorderRegen) {
      this.needsBorderRegen = false;
      this.regenBorders();
    }

    super.update();
    let this2 = this;

    //ensure each area has proper ctx set
    for (let sarea of this.sareas) {
      sarea.ctx = this.ctx;
    }

    return (function* () {
      let stack = update_stack;
      stack.cur = 0;

      let lastn = this2;

      function push(n) {
        stack[stack.cur++] = n;
      }

      function pop(n) {
        if (stack.cur < 0) {
          throw new Error("Screen.update(): stack overflow!");
        }

        return stack[--stack.cur];
      }

      let ctx = this2.ctx;

      let SCOPE_POP = Symbol("pop");
      let AREA_CTX_POP = Symbol("pop2");

      let scopestack = [];
      let areastack = [];

      let t = time_ms();
      push(this2);

      for (let p of popups) {
        push(p);
      }

      while (stack.cur > 0) {
        let n = pop();

        if (n === undefined) {
          //console.log("eek!", stack.length);
          continue;
        } else if (n === SCOPE_POP) {
          scopestack.pop();
          continue;
        } else if (n === AREA_CTX_POP) {
          //console.log("POP", areastack[areastack.length-1].constructor.name);
          areastack.pop().pop_ctx_active(ctx, true);
          continue;
        }

        if (n instanceof Area$1) {
          //console.log("PUSH", n.constructor.name);
          areastack.push(n);
          n.push_ctx_active(ctx, true);
          push(AREA_CTX_POP);
        }

        if (!n.hidden && n !== this2 && n instanceof UIBase$g) {
          n._ctx = ctx;

          if (scopestack.length > 0 && scopestack[scopestack.length - 1]) {
            n.parentWidget = scopestack[scopestack.length - 1];

            //if (n.parentWidget && n._useDataPathUndo === undefined && n.parentWidget._useDataPathUndo !== undefined) {
            //  n._useDataPathUndo = n.parentWidget._useDataPathUndo;
            //}
          }

          n.update();
        }

        if (time_ms() - t > 20) {
          yield;
          t = time_ms();
        }

        for (let n2 of n.childNodes) {
          push(n2);
        }

        if (n.shadow === undefined) {
          continue;
        }

        for (let n2 of n.shadow.childNodes) {
          push(n2);
        }

        if (n instanceof UIBase$g) {
          scopestack.push(n);
          push(SCOPE_POP);
        }
      }
    })();
  }

  //load pos/size from screenverts
  loadFromVerts() {
    let old = [0, 0];
    for (let sarea of this.sareas) {
      old[0] = sarea.size[0];
      old[1] = sarea.size[1];

      sarea.loadFromVerts();
      sarea.on_resize(old);
      sarea.setCSS();
    }

    this.setCSS();
  }

  splitArea(sarea, t = 0.5, horiz = true) {
    let w = sarea.size[0], h = sarea.size[1];
    let x = sarea.pos[0], y = sarea.size[1];
    let s1, s2;

    if (!horiz) {
      s1 = sarea;
      if (s1.ctx === undefined) {
        s1.ctx = this.ctx;
      }
      s2 = s1.copy(this);

      s1.size[0] *= t;
      s2.size[0] *= (1.0 - t);

      s2.pos[0] += w * t;
    } else {
      s1 = sarea;
      if (s1.ctx === undefined) {
        s1.ctx = this.ctx;
      }
      s2 = s1.copy(this);

      s1.size[1] *= t;
      s2.size[1] *= (1.0 - t);

      s2.pos[1] += h * t;
    }

    s2.ctx = this.ctx;
    this.appendChild(s2);

    s1.on_resize(s1.size);
    s2.on_resize(s2.size);

    this.regenBorders();
    this.solveAreaConstraints();

    s1.setCSS();
    s2.setCSS();

    this.setCSS();

    //XXX not sure if this is right place to do this or really necassary
    if (s2.area !== undefined)
      s2.area.onadd();

    return s2;
  }

  setCSS() {
    this.style["width"] = this.size[0] + "px";
    this.style["height"] = this.size[1] + "px";

    //call setCSS on borders
    for (let key in this._edgemap) {
      let b = this._edgemap[key];

      b.setCSS();
    }
  }

  regenScreenMesh() {
    this.regenBorders();
  }

  regenBorders_stage2() {
    for (let b of this.screenborders) {
      b.halfedges = [];
    }

    function hashHalfEdge(border, sarea) {
      return border._id + ":" + sarea._id;
    }

    function has_he(border, border2, sarea) {
      for (let he of border.halfedges) {
        if (border2 === he.border && sarea === he.sarea) {
          return true;
        }
      }

      return false;
    }

    for (let b1 of this.screenborders) {
      for (let sarea of b1.sareas) {
        let he = new ScreenHalfEdge(b1, sarea);
        b1.halfedges.push(he);
      }

      let axis = b1.horiz ? 1 : 0;

      let min = Math.min(b1.v1[axis], b1.v2[axis]);
      let max = Math.max(b1.v1[axis], b1.v2[axis]);

      for (let b2 of this.walkBorderLine(b1)) {
        if (b1 === b2) {
          continue;
        }

        let ok = b2.v1[axis] >= min && b2.v1[axis] <= max;
        ok = ok || (b2.v2[axis] >= min && b2.v2[axis] <= max);

        for (let sarea of b2.sareas) {
          let ok2 = ok && !has_he(b2, b1, sarea);
          if (ok2) {
            let he2 = new ScreenHalfEdge(b2, sarea);
            b1.halfedges.push(he2);
          }
        }

      }
    }


    for (let b of this.screenborders) {
      let movable = true;

      for (let sarea of b.sareas) {
        movable = movable && this.isBorderMovable(b);
      }

      b.movable = movable;
    }
  }

  hasBorder(b) {
    return b._id in this._idmap;
  }

  killScreenVertex(v) {
    this.screenverts.remove(v);

    delete this._edgemap[ScreenVert.hash(v)];
    delete this._idmap[v._id];

    return this;
  }

  freeBorder(b, sarea) {
    if (b.sareas.indexOf(sarea) >= 0) {
      b.sareas.remove(sarea);
    }

    let dels = [];

    for (let he of b.halfedges) {
      if (he.sarea === sarea) {
        dels.push([b, he]);
      }

      for (let he2 of he.border.halfedges) {
        if (he2 === he)
          continue;

        if (he2.sarea === sarea) {
          dels.push([he.border, he2]);
        }
      }
    }

    for (let d of dels) {
      if (d[0].halfedges.indexOf(d[1]) < 0) {
        console.warn("Double remove detected; use util.set?");
        continue;
      }

      d[0].halfedges.remove(d[1]);
    }

    if (b.sareas.length === 0) {
      this.killBorder(b);
    }
  }

  killBorder(b) {
    console.log("killing border", b._id, b);
    
    if (this.screenborders.indexOf(b) < 0) {
      console.log("unknown border", b);
      b.remove();
      return;
    }

    this.screenborders.remove(b);

    let del = [];

    for (let he of b.halfedges) {
      if (he === he2)
        continue;

      for (let he2 of he.border.halfedges) {
        if (he2.border === b) {
          del.push([he.border, he2]);
        }
      }
    }

    for (let d of del) {
      d[0].halfedges.remove(d[1]);
    }

    delete this._edgemap[ScreenBorder.hash(b.v1, b.v2)];
    delete this._idmap[b._id];

    b.v1.borders.remove(b);
    b.v2.borders.remove(b);

    if (b.v1.borders.length === 0) {
      this.killScreenVertex(b.v1);
    }
    if (b.v2.borders.length === 0) {
      this.killScreenVertex(b.v2);
    }

    b.remove();

    return this;
  }

  //XXX rename to regenScreenMesh
  regenBorders() {
    for (let k in this._edgemap) {
      let b = this._edgemap[k];

      b.remove();
    }

    this.screenborders = [];
    this._edgemap = {};
    this._vertmap = {};
    this.screenverts.length = 0;

    for (let sarea of this.sareas) {
      if (sarea.hidden) continue;

      sarea.makeBorders(this);
    }

    for (let key in this._edgemap) {
      let b = this._edgemap[key];

      b.setCSS();
    }

    this.regenBorders_stage2();
    this._recalcAABB();

    for (let b of this.screenborders) {
      b.outer = this.isBorderOuter(b);
      b.movable = this.isBorderMovable(b);
      b.setCSS();
    }

    this.updateDebugBoxes();
  }

  _get_debug_overlay() {
    if (!this._debug_overlay) {
      this._debug_overlay = document.createElement("overdraw-x");
      let s = this._debug_overlay;

      s.startNode(this, this);
    }

    return this._debug_overlay;
  }

  updateDebugBoxes() {
    if (exports.DEBUG.screenborders) {
      let overlay = this._get_debug_overlay();
      overlay.clear();

      for (let b of this.screenborders) {
        overlay.line(b.v1, b.v2, "red");
      }
      let del = [];
      for (let child of document.body.childNodes) {
        if (child.getAttribute && child.getAttribute("class") === "__debug") {
          del.push(child);
        }
      }
      for (let n of del) {
        n.remove();
      }

      let box = (x, y, s, text, color = "red") => {
        x -= s * 0.5;
        y -= s * 0.5;

        x = Math.min(Math.max(x, 0.0), this.size[0]-s);
        y = Math.min(Math.max(y, 0.0), this.size[1]-s);

        let ret = document.createElement("div");
        ret.setAttribute("class", "__debug");


        ret.style["position"] = "absolute";
        ret.style["left"] = x + "px";
        ret.style["top"] = y + "px";
        ret.style["height"] = s + "px";
        ret.style["width"] = s + "px";//"200px";
        ret.style["z-index"] = "1000";
        ret.style["pointer-events"] = "none";
        ret.style["padding"] = ret.style["margin"] = "0px";
        ret.style['display'] = "float";
        ret.style["background-color"] = color;
        document.body.appendChild(ret);

        let colors = [
          "orange",
          "black",
          "white",
        ];

        for (let i=2; i>=0; i--) {
          ret = document.createElement("div");

          ret.setAttribute("class", "__debug");

          ret.style["position"] = "absolute";
          ret.style["left"] = x + "px";
          ret.style["top"] = y + "px";
          ret.style["height"] = s + "px";
          ret.style["width"] = "250px";//"200px";
          ret.style["z-index"] = ""+(1005-i-1);
          ret.style["pointer-events"] = "none";
          ret.style["color"] = colors[i];

          let w = (i)*2;
          ret.style["-webkit-text-stroke-width"] = w + "px";
          ret.style["-webkit-text-stroke-color"] = colors[i];
          ret.style["text-stroke-width"] = w + "px";
          ret.style["text-stroke-color"] = colors[i];

          ret.style["padding"] = ret.style["margin"] = "0px";
          ret.style['display'] = "float";
          ret.style["background-color"] = "rgba(0,0,0,0)";
          ret.innerText = ""+text;
          document.body.appendChild(ret);
        }

      };

      for (let v of this.screenverts) {
        box(v[0], v[1], 10 * v.borders.length, ""+v.borders.length, "rgba(255,0,0,0.5)");
      }

      for (let b of this.screenborders) {
        for (let he of b.halfedges) {
          let txt = `${he.side}, ${b.sareas.length}, ${b.halfedges.length}`;
          let p = new Vector2$d(b.v1).add(b.v2).mulScalar(0.5);
          let size = 10 * b.halfedges.length;

          let wadd = 25+size*0.5;
          let axis = b.horiz & 1;

          if (p[axis] > he.sarea.pos[axis]) {
            p[axis] -= wadd;
          } else {
            p[axis] += wadd;
          }
          box(p[0], p[1], size, txt, "rgba(155,255,75,0.5)");
        }
      }
    }
  }

  checkAreaConstraint(sarea, checkOnly=false) {
    let min = sarea.minSize, max = sarea.maxSize;
    let vs = sarea._verts;
    let chg = 0.0;
    let mask = 0;

    let moveBorder = (sidea, sideb, dh) => {
      let b1 = sarea._borders[sidea];
      let b2 = sarea._borders[sideb];
      let bad = 0;

      for (let i=0; i<2; i++) {
        let b = i ? b2 : b1;
        let bad2 = sarea.borderLock & (1<<sidea);

        bad2 = bad2 || !b.movable;
        bad2 = bad2 || this.isBorderOuter(b);

        if (bad2)
          bad |= 1<<i;
      }

      if (bad === 0) {
        this.moveBorder(b1, dh*0.5);
        this.moveBorder(b2, -dh*0.5);
      } else if (bad === 1) {
        this.moveBorder(b2, -dh);
      } else if (bad === 2) {
        this.moveBorder(b1, dh);
      } else if (bad === 3) {
        //both borders are bad, yet we need to move anyway. . .
        //console.warn("got case of two borders being bad");

        if (!this.isBorderOuter(b1)) {
          this.moveBorder(b1, dh);
        } else if (!this.isBorderOuter(b2)) {
          this.moveBorder(b2, -dh);
        } else {
          this.moveBorder(b1, dh * 0.5);
          this.moveBorder(b2, -dh * 0.5);
        }
      }
    };

    if (max[0] !== undefined && sarea.size[0] > max[0]) {
      let dh = (sarea.size[0] - max[0]) ;
      chg += Math.abs(dh);
      mask |= 1;

      moveBorder(0, 2, dh);
    }

    if (min[0] !== undefined && sarea.size[0] < min[0]) {
      let dh = (min[0] - sarea.size[0]);
      chg += Math.abs(dh);
      mask |= 2;

      moveBorder(2, 0, dh);
    }


    if (max[1] !== undefined && sarea.size[1] > max[1]) {
      let dh = (sarea.size[1] - max[1]);
      chg += Math.abs(dh);
      mask |= 4;

      moveBorder(3, 1, dh);
    }

    if (min[1] !== undefined && sarea.size[1] < min[1]) {
      let dh = (min[1] - sarea.size[1]) ;
      chg += Math.abs(dh);
      mask |= 8;

      moveBorder(1, 3, dh);
    }
    
    if (sarea.pos[0]+sarea.size[0] > this.size[0]) {
      mask |= 16;
      let dh = ((this.size[0] - sarea.size[0]) - sarea.pos[0]);

      chg += Math.abs(dh);

      if (sarea.floating) {
        sarea.pos[0] = this.size[0] - sarea.size[0];
        sarea.loadFromPosSize();
      } else {
        this.moveBorder(sarea._borders[0], dh);
        this.moveBorder(sarea._borders[2], dh);
      }
    }
    
    if (chg === 0.0) {
      return false;
    }

    return mask;
  }

  walkBorderLine(b) {
    let visit = new set$1();
    let ret = [b];
    visit.add(b);

    let rec = (b, v) => {
      for (let b2 of v.borders) {
        if (b2 === b) {
          continue;
        }

        if (b2.horiz === b.horiz && !visit.has(b2)) {
          visit.add(b2);
          ret.push(b2);
          rec(b2, b2.otherVertex(v));
        }
      }
    };

    rec(b, b.v1);
    let ret2 = ret;
    ret = [];

    rec(b, b.v2);
    ret2.reverse();

    return ret2.concat(ret);
  }

  moveBorderWithoutVerts(halfedge, df) {
    let side = halfedge.side;
    let sarea = halfedge.sarea;

    switch (side) {
      case 0:
        sarea.pos[0] += df;
        sarea.size[0] -= df;
        break;
      case 1:
        sarea.size[1] += df;
        break;
      case 2:
        sarea.size[0] += df;
        break;
      case 3:
        sarea.pos[1] += df;
        sarea.size[1] -= df;
        break;
    }
  }

  moveBorder(b, df, strict=true) {
    return this.moveBorderSimple(b, df, strict);
  }

  moveBorderSimple(b, df, strict=true) {
    let axis = b.horiz & 1;
    let axis2 = axis^1;

    let min = Math.min(b.v1[axis2], b.v2[axis2]);
    let max = Math.max(b.v1[axis2], b.v2[axis2]);

    let test = (v) => {
      return v[axis2] >= min && v[axis2] <= max;
    };

    let vs = new set$1();

    for (let b2 of this.walkBorderLine(b)) {
      if (strict && !test(b2.v1) && !test(b2.v2)) {
        return false;
      }

      vs.add(b2.v1);
      vs.add(b2.v2);
    }

    for (let v of vs) {
      v[axis] += df;
    }

    for (let v of vs) {
      for (let b of v.borders) {
        for (let sarea of b.sareas) {
          sarea.loadFromVerts();
        }
      }
    }
    return true;
  }

  moveBorderUnused(b, df, strict=true) {
    if (!b) {
      console.warn("missing border");
      return false;
    }

    let axis = b.horiz & 1;

    let vs = new set$1();

    let visit = new set$1();

    let axis2 = axis^1;

    let min = Math.min(b.v1[axis2], b.v2[axis2]);
    let max = Math.max(b.v1[axis2], b.v2[axis2]);

    let test = (v) => {
      return v[axis2] >= min && v[axis2] <= max;
    };

    let first = true;
    let found = false;
    let halfedges = new set$1();
    let borders = new set$1();

    for (let b2 of this.walkBorderLine(b)) {
      /*
      if (first) {
        first = false;
        df = Math.max(Math.abs(df), FrameManager_mesh.SnapLimit) * Math.sign(df);
      }
      found = true;
      for (let sarea of b2.sareas) {
        halfedges.add(new ScreenHalfEdge(b2, sarea))
      }
      vs.add(b2.v1);
      vs.add(b2.v2);
      continue;
      //*/

      if (!strict) {
        vs.add(b2.v1);
        vs.add(b2.v2);
        continue;
      }


      let t1 = test(b2.v1), t2 = test(b2.v2);

      if (!t1 || !t2) {
        found = true;

        if (first) {
          first = false;
          df = Math.max(Math.abs(df), SnapLimit) * Math.sign(df);
        }
      }
      if (!t1 && !t2) {
        continue;
      }

      borders.add(b2);

      //make dummy half edges to keep track of border/sarea pairs
      //and especailly what the border side is
      for (let sarea of b2.sareas) {
        halfedges.add(new ScreenHalfEdge(b2, sarea));
      }

      vs.add(b2.v1);
      vs.add(b2.v2);
    }

    for (let b2 of this.walkBorderLine(b)) {
      if (borders.has(b2)) {
        continue;
      }

      for (let he of b2.halfedges) {
        borders.remove(he.border);
        if (halfedges.has(he)) {
          halfedges.remove(he);
        }
      }
    }

    for (let v of vs) {
      let ok = v[axis2] >= min && v[axis2] <= max;

      if (!ok && strict) {
     //   return false;
      }
    }

    if (!found || !strict) {
      for (let v of vs) {
        v[axis] += df;
      }
    } else {
      let borders = new set$1();

      for (let he of halfedges) {
        borders.add(he.border);
        this.moveBorderWithoutVerts(he, df);
      }

      for (let he of halfedges) {
        he.sarea.loadFromPosSize();
      }

      for (let b of borders) {
        let sareas = b.sareas.slice(0, b.sareas.length);

        this.killBorder(b);
        for (let sarea of sareas) {
          sarea.loadFromPosSize();
        }
      }

      return halfedges.length > 0;
    }


    for (let sarea of b.sareas) {
      sarea.loadFromVerts();
    }

    for (let he of b.halfedges) {
      he.sarea.loadFromVerts();

      for (let sarea of he.border.sareas) {
        sarea.loadFromVerts();
        for (let b2 of sarea._borders) {
          b2.setCSS();
        }
      }
    }

    b.setCSS();

    return true;
  }

  solveAreaConstraints(snapArgument=true) {
    let repeat = false;
    let found = false;

    let time = time_ms();

    for (let i=0; i<10; i++) {
      repeat = false;

      for (let sarea of this.sareas) {
        if (sarea.hidden) continue;

        repeat = repeat || this.checkAreaConstraint(sarea);
      }

      found = found || repeat;

      if (repeat) {
        for (let sarea of this.sareas) {
          sarea.loadFromVerts();
        }

        this.snapScreenVerts(snapArgument);
      } else {
        break;
      }
    }

    if (found) {
      this.snapScreenVerts(snapArgument);
      if (exports.DEBUG.areaConstraintSolver) {
        time = time_ms() - time;

        console.log(`enforced area constraint ${time.toFixed(2)}ms`);
      }
      this._recalcAABB();
      this.setCSS();
    }
  }

  snapScreenVerts(fitToSize=true) {
    let mm = this._recalcAABB();
    let min = mm[0], max = mm[1];

    snap(min);
    snapi(max);

    if (fitToSize) {
      //fit entire screen to, well, the entire screen (size)
      let vec = new Vector2$d(max).sub(min);
      let sz = new Vector2$d(this.size);

      sz.div(vec);

      for (let v of this.screenverts) {
        snap(v.sub(min).mul(sz)).add(this.pos);
      }
    } else {
      for (let v of this.screenverts) {
        snap(v);
      }

      [min, max] = this._recalcAABB();
      snap(min);
      snapi(max);

      this.size.load(max).sub(min);
      this.pos.load(min);
    }


    for (let sarea of this.sareas) {
      if (sarea.hidden) continue;

      let old = new Vector2$d(sarea.size);
      sarea.loadFromVerts();
      sarea.on_resize(old);
    }

    this._recalcAABB();
    this.setCSS();
  }

  on_resize(oldsize, newsize=this.size) {
    console.warn("resizing");

    let ratio = [newsize[0] / oldsize[0], newsize[1] / oldsize[1]];

    //console.log("resize!", ratio);

    for (let v of this.screenverts) {
      v[0] *= ratio[0];
      v[1] *= ratio[1];
    }

    let min = [1e17, 1e17], max = [-1e17, -1e17];
    let olds = [];

    for (let sarea of this.sareas) {
      olds.push([sarea.size[0], sarea.size[1]]);

      sarea.loadFromVerts();
    }

    this.size[0] = newsize[0];
    this.size[1] = newsize[1];

    this.snapScreenVerts();
    this.solveAreaConstraints();
    this._recalcAABB();


    let i = 0;
    for (let sarea of this.sareas) {
      sarea.on_resize(sarea.size, olds[i]);
      sarea.setCSS();
      i++;
    }

    this.regenBorders();
    this.setCSS();
    this.calcTabOrder();

  }

  getScreenVert(pos, added_id="") {
    let key = ScreenVert.hash(pos, added_id);

    if (!(key in this._vertmap)) {
      let v = new ScreenVert(pos, this.idgen++, added_id);

      this._vertmap[key] = v;
      this._idmap[v._id] = v;

      this.screenverts.push(v);
    }

    return this._vertmap[key];
  }

  isBorderOuter(border) {
    let sides = 0;

    for (let he of border.halfedges) {
      sides |= 1 << he.side;
    }

    let bits = 0;
    for (let i=0; i<4; i++) {
      bits += (sides & (1<<i)) ? 1 : 0;
    }

    let ret = bits < 2;
    let floating = false;

    for (let sarea of border.sareas) {
      floating = floating || sarea.floating;
    }

    if (floating) {
      //check if border is on screen limits
      let axis = border.horiz ? 1 : 0;

      ret = Math.abs(border.v1[axis] - this.pos[axis]) < 2;
      ret = ret || Math.abs(border.v1[axis] - this.pos[axis] - this.size[axis]) < 2;
    }

    border.outer = ret;
    return ret;
  }

  isBorderMovable(b, limit = 5) {
    if (this.allBordersMovable)
      return true;

    for (let he of b.halfedges){
      if (he.sarea.borderLock & (1<<he.side)) {
        return false;
      }
    }

    let ok = !this.isBorderOuter(b);

    for (let sarea of b.sareas) {
      if (sarea.floating) {
        ok = true;
        break;
      }
    }

    return ok;
  }

  getScreenBorder(sarea, v1, v2, side) {
    let suffix = sarea._get_v_suffix();

    if (!(v1 instanceof ScreenVert)) {
      v1 = this.getScreenVert(v1, suffix);
    }

    if (!(v2 instanceof ScreenVert)) {
      v2 = this.getScreenVert(v2, suffix);
    }

    let hash = ScreenBorder.hash(v1, v2);

    if (!(hash in this._edgemap)) {
      let sb = this._edgemap[hash] = document.createElement("screenborder-x");

      sb.screen = this;
      sb.v1 = v1;
      sb.v2 = v2;
      sb._id = this.idgen++;

      v1.borders.push(sb);
      v2.borders.push(sb);

      sb.ctx = this.ctx;

      this.screenborders.push(sb);
      this.appendChild(sb);

      sb.setCSS();

      this._edgemap[hash] = sb;
      this._idmap[sb._id] = sb;
    }

    return this._edgemap[hash];
  }

  minmaxArea(sarea, mm = undefined) {
    if (mm === undefined) {
      mm = new MinMax(2);
    }

    for (let b of sarea._borders) {
      mm.minmax(b.v1);
      mm.minmax(b.v2);
    }

    return mm;
  }

  //does sarea1 border sarea2?
  areasBorder(sarea1, sarea2) {
    for (let b of sarea1._borders) {
      for (let sa of b.sareas) {
        if (sa === sarea2)
          return true;
      }
    }

    return false;
  }

  replaceArea(dst, src) {
    if (dst === src)
      return;

    src.pos[0] = dst.pos[0];
    src.pos[1] = dst.pos[1];
    src.size[0] = dst.size[0];
    src.size[1] = dst.size[1];

    src.loadFromPosSize();

    if (this.sareas.indexOf(src) < 0) {
      this.appendChild(src);
    }

    src.setCSS();

    //this.sareas.remove(dst);
    //dst.remove();

    this.removeArea(dst);

    this.regenScreenMesh();
    this.snapScreenVerts();
    this._updateAll();
  }

  //regenerates borders, sets css and calls this.update

  _internalRegenAll() {
    this.snapScreenVerts();
    this._recalcAABB();
    this.calcTabOrder();
    this.setCSS();
  }


  _updateAll() {
    for (let sarea of this.sareas) {
      sarea.setCSS();
    }
    this.setCSS();
    this.update();
  }

  removeArea(sarea) {
    if (this.sareas.indexOf(sarea) < 0) {
      console.warn(sarea, "<- Warning: tried to remove unknown area");
      return;
    }

    this.sareas.remove(sarea);
    sarea.remove();

    for (let i=0; i<2; i++) {
      this.snapScreenVerts();
      this.regenScreenMesh();
    }

    this._updateAll();
    this.drawUpdate();
  }

  appendChild(child) {
    /*
    if (child instanceof UIBase) {
      if (child._useDataPathUndo === undefined) {
        child.useDataPathUndo = this.useDataPathUndo;
      }
    }*/

    if (child instanceof ScreenArea) {
      child.screen = this;
      child.ctx = this.ctx;
      child.parentWidget = this;

      this.sareas.push(child);

      if (child.size.dot(child.size) === 0) {
        child.size[0] = this.size[0];
        child.size[1] = this.size[1];
      }

      if (!child._has_evts) {
        child._has_evts = true;

        let onfocus = (e) => {
          this.sareas.active = child;
        };

        let onblur = (e) => {
          if (this.sareas.active === child) {
            this.sareas.active = undefined;
          }
        };

        child.addEventListener("focus", onfocus);
        child.addEventListener("mouseenter", onfocus);
        child.addEventListener("blur", onblur);
        child.addEventListener("mouseleave", onblur);
      }

      this.regenBorders();
      child.setCSS();
      this.drawUpdate();
      child._init();
    }

    return this.shadow.appendChild(child);
    //return super.appendChild(child);
  }

  add(child) {
    return this.appendChild(child);
  }

  hintPickerTool() {
    (new ToolTipViewer(this)).start();
  }

  splitTool() {
    console.log("screen split!");

    let tool = new SplitTool(this);
    //let tool = new FrameManager_ops.AreaDragTool(this, undefined, this.mpos);
    tool.start();
  }

  areaDragTool(sarea = this.sareas.active) {
    if (sarea === undefined) {
      console.warn("no active screen area");
      return;
    }

    console.log("screen area drag!");

    let mpos = this.mpos;
    let tool = new AreaDragTool(this, this.sareas.active, mpos);

    tool.start();
  }

  makeBorders() {
    for (let sarea of this.sareas) {
      sarea.makeBorders(this);
    }
  }

  on_keydown(e) {
    if (!haveModal() && this.execKeyMap(e)) {
      e.preventDefault();
      return;
    }

    if (!haveModal() && this.sareas.active !== undefined && this.sareas.active.on_keydown) {
      let area = this.sareas.active;
      return this.sareas.active.on_keydown(e);
    }
  }

  on_keyup(e) {
    if (!haveModal() && this.sareas.active !== undefined && this.sareas.active.on_keyup) {
      return this.sareas.active.on_keyup(e);
    }
  }

  on_keypress(e) {
    if (!haveModal() && this.sareas.active !== undefined && this.sareas.active.on_keypress) {
      return this.sareas.active.on_keypress(e);
    }
  }

  draw() {
    for (let sarea of this.sareas) {
      sarea.draw();
    }
  }

  static newSTRUCT() {
    return document.createElement(this.define().tagname);
  }

  afterSTRUCT() {
    for (let sarea of this.sareas) {
      sarea._ctx = this.ctx;
      sarea.afterSTRUCT();
    }
  }

  loadSTRUCT(reader) {
    reader(this);

    //handle old files that might have saved as simple arrays
    this.size = new Vector2$d(this.size);

    let sareas = this.sareas;
    this.sareas = [];

    for (let sarea of sareas) {
      sarea.screen = this;
      sarea.parentWidget = this;

      this.appendChild(sarea);
    }

    this.regenBorders();
    this.setCSS();

    this.doOnce(() => {
      this.loadUIData(this.uidata);
      this.uidata = undefined;
    });

    return this;
  }

  test_struct() {
    let data = [];
    //let scripts = nstructjs.write_scripts();
    nstructjs.manager.write_object(data, this);
    data = new DataView(new Uint8Array(data).buffer);

    let screen2 = nstructjs.manager.read_object(data, this.constructor);
    screen2.ctx = this.ctx;

    for (let sarea of screen2.sareas) {
      sarea.screen = screen2;
      sarea.ctx = this.ctx;
      sarea.area.ctx = this.ctx;
    }

    let parent = this.parentElement;
    this.remove();

    this.ctx.screen = screen2;

    parent.appendChild(screen2);

    //for (let 
    screen2.regenBorders();
    screen2.update();
    screen2.listen();

    screen2.doOnce(() => {
      screen2.on_resize(screen2.size, [window.innerWidth, window.innerHeight]);
    });

    console.log(data);
    return screen2;
  }

  saveUIData() {
    try {
      return saveUIData(this, "screen");
    } catch (error) {
      print_stack$1(error);
      console.log("Failed to save UI state data");
    }
  }

  loadUIData(str) {
    try {
      loadUIData(this, str);
    } catch (error) {
      print_stack$1(error);
      console.log("Failed to load UI state data");
    }
  }
}

Screen$2.STRUCT = `
pathux.Screen { 
  size  : vec2;
  pos   : vec2;
  sareas : array(pathux.ScreenArea);
  idgen : int;
  uidata : string | obj.saveUIData();
}
`;

nstructjs.manager.add_class(Screen$2);
UIBase.register(Screen$2);

setScreenClass(Screen$2);


let get_screen_cb;
function startEvents(getScreenFunc) {
  get_screen_cb = getScreenFunc;

  if (_events_started) {
    return;
  }

  _events_started = true;
  window.addEventListener("keydown", (e) => {
    let screen = get_screen_cb();

    return screen.on_keydown(e);
  });
}

function getImageData(image) {
  if (typeof image == "string") {
    let src = image;
    
    image = new Image();
    image.src = src;
  }
  
  function render() {
    let canvas = document.createElement("canvas");
    let g = canvas.getContext("2d");
    
    canvas.width = image.width;
    canvas.height = image.height;
    
    g.drawImage(image, 0, 0);
    return g.getImageData(0, 0, image.width, image.height);
  }
  
  return new Promise((accept, reject) => {
    if (!image.complete) {
      image.onload = () => {
        console.log("image loaded");
        accept(render(image));
      };
    } else {
      accept(render(image));
    }
  });
}

function loadImageFile() {
  let this2 = this;
  
  return new Promise((accept, reject) => {
    let input = document.createElement("input");
    input.type = "file";
    
    input.addEventListener("change", function(e) {
      let files = this.files;
      console.log("file!", e, this.files);
      
      console.log("got file", e, files);
      if (files.length == 0) return;
      
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        
        let dataurl = img.src = e.target.result;
        
        window._image_url = e.target.result;
        
        img.onload = (e) => {
          this2.getImageData(img).then((data) => {
            data.dataurl = dataurl;
            accept(data);
          });
        };
      };
      
      reader.readAsDataURL(files[0]);
    });
    
    input.click();
  });
}

/*
see doc_src/context.md
*/
window.ccosnt = exports;

const ContextFlags = {
  IS_VIEW : 1
};

class InheritFlag$1 {
  constructor(data) {
    this.data = data;
  }
}

let __idgen = 1;

if (Symbol.ContextID === undefined) {
  Symbol.ContextID = Symbol("ContextID");
}

if (Symbol.CachedDef === undefined) {
  Symbol.CachedDef = Symbol("CachedDef");
}

const OverlayClasses = [];

class ContextOverlay {
  constructor(appstate) {
    this.ctx = undefined; //owning context
    this._state = appstate;
  }

  get state() {
    return this._state;
  }

  onRemove(have_new_file=false) {
  }

  copy() {
    return new this.constructor(this._state);
  }

  validate() {
    throw new Error("Implement me!");
  }


  //base classes override this
  static contextDefine() {
    throw new Error("implement me!");
    return {
      name   :   "",
      flag   :   0
    }
  }

  //don't override this
  static resolveDef() {
    if (this.hasOwnProperty(Symbol.CachedDef)) {
      return this[Symbol.CachedDef];
    }

    let def2 = Symbol.CachedDef = {};

    let def = this.contextDefine();

    if (def === undefined) {
      def = {};
    }

    for (let k in def) {
      def2[k] = def[k];
    }

    if (!("flag") in def) {
      def2.flag = Context.inherit(0);
    }

    let parents = [];
    let p = getClassParent(this);

    while (p && p !== ContextOverlay) {
      parents.push(p);
      p = getClassParent(p);
    }

    if (def2.flag instanceof InheritFlag$1) {
      let flag = def2.flag.data;
      for (let p of parents) {
        let def = p.contextDefine();

        if (!def.flag) {
          continue;
        }else if (def.flag instanceof InheritFlag$1) {
          flag |= def.flag.data;
        } else {
          flag |= def.flag;
          //don't go past non-inheritable parents
          break;
        }
      }

      def2.flag = flag;
    }

    return def2;
  }
}

const excludedKeys = new Set(["onRemove", "reset", "toString",
  "valueOf", "copy", "next", "save", "load", "clear", "hasOwnProperty",
  "toLocaleString", "constructor", "propertyIsEnumerable", "isPrototypeOf",
  "state", "saveProperty", "loadProperty", "getOwningOverlay", "_props"]);

class LockedContext {
  constructor(ctx) {
    this.props = {};

    this.state = ctx.state;
    this.api = ctx.api;
    this.toolstack = ctx.toolstack;

    this.load(ctx);
  }

  toLocked() {
    //just return itself
    return this;
  }

  error() {
    return this.ctx.error(...arguments);
  }
  warning() {
    return this.ctx.warning(...arguments);
  }
  message() {
    return this.ctx.message(...arguments);
  }
  progbar() {
    return this.ctx.progbar(...arguments);
  }

  load(ctx) {
    //let keys = util.getAllKeys(ctx);
    let keys = ctx._props;

    function wrapget(name) {
      return function(ctx2, data) {
        return ctx.loadProperty(ctx2, name, data);
      }
    }

    for (let k of keys) {
      let v;
      if (k === "state" || k === "toolstack" || k === "api") {
        continue;
      }

      if (typeof k === "string" && (k.endsWith("_save") || k.endsWith("_load"))) {
        continue;
      }

      try {
        v = ctx[k];
      } catch (error) {
        if (exports.DEBUG.contextSystem) {
          console.warn("failed to look up property in context: ", k);
        }
        continue;
      }

      let data, getter;
      let overlay = ctx.getOwningOverlay(k);

      if (overlay === undefined) {
        //property must no longer be used?
        continue;
      }

      try {
        if (typeof k === "string" && (overlay[k + "_save"] && overlay[k + "_load"])) {
          data = overlay[k + "_save"]();
          getter = overlay[k + "_load"];
        } else {
          data = ctx.saveProperty(k);
          getter = wrapget(k);
        }
      } catch (error) {
        console.warn("Failed to save context property", k);
        continue;
      }

      this.props[k] = {
        data : data,
        get  : getter
      };
    }

    let defineProp = (name) => {
      Object.defineProperty(this, name, {
        get : function() {
          let def = this.props[name];
          return def.get(this.ctx, def.data)
        }
      });
    };

    for (let k in this.props) {
      defineProp(k);
    }

    this.ctx = ctx;
  }

  setContext(ctx) {
    this.ctx = ctx;

    this.state = ctx.state;
    this.api = ctx.api;
    this.toolstack = ctx.toolstack;
  }
}

let next_key = {};
let idgen$1 = 1;

class Context {
  constructor(appstate) {
    this.state = appstate;

    this._props = new Set();
    this._stack = [];
    this._inside_map = {};
  }

  error(message, timeout=1500) {
    let state = this.state;

    console.warn(message);

    if (state && state.screen) {
      return error(state.screen, message, timeout);
    }
  }

  warning(message, timeout=1500) {
    let state = this.state;

    console.warn(message);

    if (state && state.screen) {
      return warning(state.screen, message, timeout);
    }
  }

  message(msg, timeout=1500) {
    let state = this.state;

    console.warn(msg);

    if (state && state.screen) {
      return message(state.screen, msg, timeout);
    }
  }

  progbar(msg, perc=0.0, timeout=1500, id=msg) {
    let state = this.state;

    if (state && state.screen) {
      //progbarNote(screen, msg, percent, color, timeout) {
      return progbarNote(state.screen, msg, perc, "green", timeout, id);
    }
  }

  validateOverlays() {
    let stack = this._stack;
    let stack2 = [];

    for (let i=0; i<stack.length; i++) {
      if (stack[i].validate()) {
        stack2.push(stack[i]);
      }
    }

    this._stack = stack2;
  }

  hasOverlay(cls) {
    return this.getOverlay(cls) !== undefined;
  }

  getOverlay(cls) {
    for (let overlay of this._stack) {
      if (overlay.constructor === cls) {
        return overlay;
      }
    }
  }

  clear(have_new_file=false) {
    for (let overlay of this._stack) {
      overlay.onRemove(have_new_file);
    }

    this._stack = [];
  }

  //this is implemented by child classes
  //it should load the same default overlays as in constructor
  reset(have_new_file=false) {
    this.clear(have_new_file);
  }

  //returns a new context with overriden properties
  //unlike pushOverlay, overrides can be a simple object
  override(overrides) {
    if (overrides.copy === undefined) {
      overrides.copy = function() {
        return Object.assign({}, this);
      };
    }

    let ctx = this.copy();
    ctx.pushOverlay(overrides);
    return ctx;
  }

  copy() {
    let ret = new this.constructor(this.state);

    for (let item of this._stack) {
      ret.pushOverlay(item.copy());
    }

    return ret;
  }

  /**
   Used by overlay property getters.  If returned,
   the next overlay in the struct will have its getter used.

   Example:

   class overlay {
      get scene() {
        if (some_reason) {
          return Context.super();
        }

        return something_else;
      }
    }
   */
  static super() {
    return next_key;
  }

  /**
   *
   * saves a property into some kind of non-object-reference form
   *
   * */
  saveProperty(key) {
    console.warn("Missing saveProperty implementation in Context; passing through values...");
    return this[key];
  }

  /**
   *
   * lookup property based on saved data
   *
   * */
  loadProperty(ctx, key, data) {
    console.warn("Missing loadProperty implementation in Context; passing through values...");
    return data;
  }

  getOwningOverlay(name, _val_out) {
    let inside_map = this._inside_map;
    let stack = this._stack;

    if (exports.DEBUG.contextSystem) {
      console.log(name, inside_map);
    }

    for (let i=stack.length-1; i >= 0; i--) {
      let overlay = stack[i];
      let ret = next_key;
      
      if (overlay[Symbol.ContextID] === undefined) {
        throw new Error("context corruption");
      }
      
      let ikey = overlay[Symbol.ContextID];
      
      if (exports.DEBUG.contextSystem) {
        console.log(ikey, overlay);
      }

      //prevent infinite recursion
      if (inside_map[ikey]) {
        continue;
      }

      if (overlay.__allKeys.has(name)) {
        if (exports.DEBUG.contextSystem) {
          console.log("getting value");
        }

        inside_map[ikey] = 1;

        try {
          ret = overlay[name];
        } catch (error) {

          inside_map[ikey] = 0;
          throw error;
        }

        inside_map[ikey] = 0;
      }

      if (ret !== next_key) {
        if (_val_out !== undefined) {
          _val_out[0] = ret;
        }
        return overlay;
      }
    }

    if (_val_out !== undefined) {
      _val_out[0] = undefined;
    }

    return undefined;
  }

  ensureProperty(name) {
    if (this.hasOwnProperty(name)) {
      return;
    }

    this._props.add(name);

    Object.defineProperty(this, name, {
      get : function() {
        let ret = [undefined];

        this.getOwningOverlay(name, ret);
        return ret[0];
      }, set : function() {
        throw new Error("Cannot set ctx properties")
      }
    });
  }

  /**
   * Returns a new context that doesn't
   * contain any direct object references
   * except for .state .datalib and .api, but
   * instead uses those three to look up references
   * on property access.
   * */
  toLocked() {
    return new LockedContext(this);
  }

  pushOverlay(overlay) {
    if (!overlay.hasOwnProperty(Symbol.ContextID)) {
      overlay[Symbol.ContextID] = idgen$1++;
    }

    let keys = new Set();
    for (let key of getAllKeys(overlay)) {
      if (!excludedKeys.has(key) && !(typeof key === "string" && key[0] === "_")) {
        keys.add(key);
      }
    }

    overlay.ctx = this;

    if (overlay.__allKeys === undefined) {
      overlay.__allKeys = keys;
    }

    for (let k of keys) {
      let bad = typeof k === "symbol" || excludedKeys.has(k);
      bad = bad || (typeof k === "string" && k[0] === "_");
      bad = bad || (typeof k === "string" && k.endsWith("_save"));
      bad = bad || (typeof k === "string" && k.endsWith("_load"));

      if (bad) {
        continue;
      }

      this.ensureProperty(k);
    }

    if (this._stack.indexOf(overlay) >= 0) {
      console.warn("Overlay already added once");
      if (this._stack[this._stack.length-1] === overlay) {
        console.warn("  Definitely an error, overlay is already at top of stack");
        return;
      }
    }

    this._stack.push(overlay);
  }

  popOverlay(overlay) {
    if (overlay !== this._stack[this._stack.length-1]) {
      console.warn("Context.popOverlay called in error", overlay);
      return;
    }

    overlay.onRemove();
    this._stack.pop();
  }

  removeOverlay(overlay) {
    if (this._stack.indexOf(overlay) < 0) {
      console.warn("Context.removeOverlay called in error", overlay);
      return;
    }

    overlay.onRemove();
    this._stack.remove(overlay);
  }

  static inherit(data) {
    return new InheritFlag$1(data);
  }

  static register(cls) {
    if (cls[Symbol.ContextID]) {
      console.warn("Tried to register same class twice:", cls);
      return;
    }

    cls[Symbol.ContextID] = __idgen++;
    OverlayClasses.push(cls);
  }
}

function test() {
  function testInheritance() {
    class Test0 extends ContextOverlay {
      static contextDefine() {
        return {
          flag: 1
        }
      }
    }

    class Test1 extends Test0 {
      static contextDefine() {
        return {
          flag: 2
        }
      }
    }

    class Test2 extends Test1 {
      static contextDefine() {
        return {
          flag: Context.inherit(4)
        }
      }
    }

    class Test3 extends Test2 {
      static contextDefine() {
        return {
          flag: Context.inherit(8)
        }
      }
    }

    class Test4 extends Test3 {
      static contextDefine() {
        return {
          flag: Context.inherit(16)
        }
      }
    }

    return Test4.resolveDef().flag === 30;
  }

  return testInheritance();
}

if (!test()) {
  throw new Error("Context test failed");
}

let solver = solver1;
let util = util1;
let vectormath = vectormath1;
let toolprop_abstract = toolprop_abstract1;
let html5_fileapi = html5_fileapi1;
let parseutil = parseutil1;
let cconst$1 = exports;

export { Area, AreaFlags, AreaTypes, AreaWrangler, BaseVector, BoolProperty, BorderMask, BorderSides, Button, CSSFont, CURVE_VERSION, Check, Check1, ColorField, ColorPicker, ColorPickerButton, ColumnFrame, Container, Context, ContextFlags, ContextOverlay, Curve1D, Curve1DProperty, Curve1DWidget, CurveConstructors, CurveFlags, CurveTypeData, DataAPI, DataFlags, DataList, DataPath, DataPathError, DataPathSetOp, DataStruct, DataTypes, DomEventTypes, DropBox, EnumProperty$2 as EnumProperty, ErrorColors, EventDispatcher, EventHandler, FlagProperty, FloatProperty$1 as FloatProperty, HotKey, HueField, IconButton, IconCheck, IconManager, IconSheets, Icons, IntProperty$1 as IntProperty, IsMobile, KeyMap, Label, LastToolPanel, ListIface, ListProperty$1 as ListProperty, LockedContext, Mat4Property, Matrix4, Menu, MenuWrangler, ModalTabMove, ModelInterface, NumProperty, NumSlider, NumSliderSimple, NumSliderSimple2, Overdraw, OverlayClasses, PackFlags, PackNode, PackNodeVertex, PanelFrame, PropClasses, PropFlags, PropSubTypes$1 as PropSubTypes, PropTypes, Quat, QuatProperty, RichEditor, RichViewer, RowFrame, STRUCT, SatValField, Screen$2 as Screen, ScreenArea, ScreenBorder, ScreenHalfEdge, ScreenVert, SimpleBox, SimpleContext, StringProperty, StringSetProperty$1 as StringSetProperty, StructFlags, TabBar, TabContainer, TabItem, TableFrame, TableRow, TangentModes, TextBox, ToolClasses, ToolFlags, ToolMacro, ToolOp, ToolOpIface, ToolProperty, ToolStack, ToolTip, UIBase, UIFlags, UndoFlags, ValueButtonBase, Vec2Property$1 as Vec2Property, Vec3Property$1 as Vec3Property, Vec4Property$1 as Vec4Property, Vector2, Vector3, Vector4, VectorPanel, _NumberPropertyBase, _ensureFont, _getFont, _getFont_new, areaclasses, cconst$1 as cconst, checkForTextBox, color2css$2 as color2css, color2web, copyEvent, copyMouseEvent, css2color$1 as css2color, customPropertyTypes, dpistack, drawRoundBox, drawRoundBox2, drawText, eventWasTouch, excludedKeys, getAreaIntName, getDataPathToolOp, getDefault, getFieldImage, getFont, getHueField, getImageData, getWranglerScreen, graphGetIslands, graphPack, haveModal, hsv_to_rgb, html5_fileapi, iconmanager, inherit, initSimpleController, inv_sample, isModalHead, isNumber, isVecProperty, keymap, keymap_latin_1, loadImageFile, loadUIData, makeIconDiv, manager, marginPaddingCSSKeys, measureText, measureTextBlock, menuWrangler, modalStack, modalstack, mySafeJSONParse$1 as mySafeJSONParse, mySafeJSONStringify$1 as mySafeJSONStringify, nstructjs$1 as nstructjs, parsepx, parseutil, pathParser, popModalLight, popReportName, pushModal, pushModalLight, pushReportName, register, registerTool, registerToolStackGetter$1 as registerToolStackGetter, report$1 as report, reverse_keymap, rgb_to_hsv, sample, saveUIData, setAreaTypes, setContextClass, setDataPathToolOp, setIconManager, setIconMap, setImplementationClass, setPropTypes, setScreenClass, setTheme, setWranglerScreen, solver, startEvents, startMenuEventWrangling, tab_idgen, test, theme, toolprop_abstract, util, validateWebColor, vectormath, web2color, write_scripts };
//# sourceMappingURL=pathux.js.map
