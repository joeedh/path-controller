function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
var IndexRangeStack = [];
var _IndexRange = /*#__PURE__*/ function() {
    "use strict";
    function _IndexRange(start, end) {
        _class_call_check(this, _IndexRange);
        _define_property(this, "start", 0);
        _define_property(this, "end", 0);
        _define_property(this, "i", 0);
        _define_property(this, "ret", {
            done: false,
            value: undefined
        });
        this.start = start;
        this.end = end;
    }
    _create_class(_IndexRange, [
        {
            key: Symbol.iterator,
            value: function value() {
                return this;
            }
        },
        {
            key: "next",
            value: function next() {
                if (this.i < this.end) {
                    this.ret.done = false;
                    this.ret.value = this.i++;
                    return this.ret;
                } else {
                    this.finish();
                    this.ret.done = true;
                    return this.ret;
                }
            }
        },
        {
            key: "finish",
            value: function finish() {
                IndexRangeStack.cur--;
            }
        },
        {
            key: "reset",
            value: function reset(start, end) {
                var i = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 0;
                this.start = start;
                this.end = end;
                this.i = i;
                return this;
            }
        },
        {
            key: "return",
            value: function _return() {
                this.reset();
                this.finish();
                return this.ret;
            }
        }
    ]);
    return _IndexRange;
}();
IndexRangeStack = [];
IndexRangeStack.cur = 0;
for(var i = 0; i < 2048; i++){
    IndexRangeStack[i] = new _IndexRange(0, 0);
}
export function IndexRange(len) {
    return IndexRangeStack[IndexRangeStack.cur++].reset(0, len);
}

