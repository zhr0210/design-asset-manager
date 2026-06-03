function _mergeNamespaces(n2, m2) {
  for (var i = 0; i < m2.length; i++) {
    const e = m2[i];
    if (typeof e !== "string" && !Array.isArray(e)) {
      for (const k2 in e) {
        if (k2 !== "default" && !(k2 in n2)) {
          const d = Object.getOwnPropertyDescriptor(e, k2);
          if (d) {
            Object.defineProperty(n2, k2, d.get ? d : {
              enumerable: true,
              get: () => e[k2]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n2, Symbol.toStringTag, { value: "Module" }));
}
function getDefaultExportFromCjs(x2) {
  return x2 && x2.__esModule && Object.prototype.hasOwnProperty.call(x2, "default") ? x2["default"] : x2;
}
var jsxRuntime = { exports: {} };
var reactJsxRuntime_production_min = {};
var react = { exports: {} };
var react_production_min = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var l$1 = Symbol.for("react.element"), n$1 = Symbol.for("react.portal"), p$2 = Symbol.for("react.fragment"), q$1 = Symbol.for("react.strict_mode"), r = Symbol.for("react.profiler"), t = Symbol.for("react.provider"), u = Symbol.for("react.context"), v$1 = Symbol.for("react.forward_ref"), w = Symbol.for("react.suspense"), x = Symbol.for("react.memo"), y = Symbol.for("react.lazy"), z$1 = Symbol.iterator;
function A$1(a) {
  if (null === a || "object" !== typeof a) return null;
  a = z$1 && a[z$1] || a["@@iterator"];
  return "function" === typeof a ? a : null;
}
var B$1 = { isMounted: function() {
  return false;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, C$1 = Object.assign, D$1 = {};
function E$1(a, b, e) {
  this.props = a;
  this.context = b;
  this.refs = D$1;
  this.updater = e || B$1;
}
E$1.prototype.isReactComponent = {};
E$1.prototype.setState = function(a, b) {
  if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, a, b, "setState");
};
E$1.prototype.forceUpdate = function(a) {
  this.updater.enqueueForceUpdate(this, a, "forceUpdate");
};
function F() {
}
F.prototype = E$1.prototype;
function G$1(a, b, e) {
  this.props = a;
  this.context = b;
  this.refs = D$1;
  this.updater = e || B$1;
}
var H$1 = G$1.prototype = new F();
H$1.constructor = G$1;
C$1(H$1, E$1.prototype);
H$1.isPureReactComponent = true;
var I$1 = Array.isArray, J = Object.prototype.hasOwnProperty, K$1 = { current: null }, L$1 = { key: true, ref: true, __self: true, __source: true };
function M$1(a, b, e) {
  var d, c = {}, k2 = null, h = null;
  if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k2 = "" + b.key), b) J.call(b, d) && !L$1.hasOwnProperty(d) && (c[d] = b[d]);
  var g = arguments.length - 2;
  if (1 === g) c.children = e;
  else if (1 < g) {
    for (var f2 = Array(g), m2 = 0; m2 < g; m2++) f2[m2] = arguments[m2 + 2];
    c.children = f2;
  }
  if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
  return { $$typeof: l$1, type: a, key: k2, ref: h, props: c, _owner: K$1.current };
}
function N$1(a, b) {
  return { $$typeof: l$1, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
}
function O$1(a) {
  return "object" === typeof a && null !== a && a.$$typeof === l$1;
}
function escape(a) {
  var b = { "=": "=0", ":": "=2" };
  return "$" + a.replace(/[=:]/g, function(a2) {
    return b[a2];
  });
}
var P$1 = /\/+/g;
function Q$1(a, b) {
  return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
}
function R$1(a, b, e, d, c) {
  var k2 = typeof a;
  if ("undefined" === k2 || "boolean" === k2) a = null;
  var h = false;
  if (null === a) h = true;
  else switch (k2) {
    case "string":
    case "number":
      h = true;
      break;
    case "object":
      switch (a.$$typeof) {
        case l$1:
        case n$1:
          h = true;
      }
  }
  if (h) return h = a, c = c(h), a = "" === d ? "." + Q$1(h, 0) : d, I$1(c) ? (e = "", null != a && (e = a.replace(P$1, "$&/") + "/"), R$1(c, b, e, "", function(a2) {
    return a2;
  })) : null != c && (O$1(c) && (c = N$1(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P$1, "$&/") + "/") + a)), b.push(c)), 1;
  h = 0;
  d = "" === d ? "." : d + ":";
  if (I$1(a)) for (var g = 0; g < a.length; g++) {
    k2 = a[g];
    var f2 = d + Q$1(k2, g);
    h += R$1(k2, b, e, f2, c);
  }
  else if (f2 = A$1(a), "function" === typeof f2) for (a = f2.call(a), g = 0; !(k2 = a.next()).done; ) k2 = k2.value, f2 = d + Q$1(k2, g++), h += R$1(k2, b, e, f2, c);
  else if ("object" === k2) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
  return h;
}
function S$1(a, b, e) {
  if (null == a) return a;
  var d = [], c = 0;
  R$1(a, d, "", "", function(a2) {
    return b.call(e, a2, c++);
  });
  return d;
}
function T$1(a) {
  if (-1 === a._status) {
    var b = a._result;
    b = b();
    b.then(function(b2) {
      if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
    }, function(b2) {
      if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
    });
    -1 === a._status && (a._status = 0, a._result = b);
  }
  if (1 === a._status) return a._result.default;
  throw a._result;
}
var U$1 = { current: null }, V$1 = { transition: null }, W$1 = { ReactCurrentDispatcher: U$1, ReactCurrentBatchConfig: V$1, ReactCurrentOwner: K$1 };
function X$2() {
  throw Error("act(...) is not supported in production builds of React.");
}
react_production_min.Children = { map: S$1, forEach: function(a, b, e) {
  S$1(a, function() {
    b.apply(this, arguments);
  }, e);
}, count: function(a) {
  var b = 0;
  S$1(a, function() {
    b++;
  });
  return b;
}, toArray: function(a) {
  return S$1(a, function(a2) {
    return a2;
  }) || [];
}, only: function(a) {
  if (!O$1(a)) throw Error("React.Children.only expected to receive a single React element child.");
  return a;
} };
react_production_min.Component = E$1;
react_production_min.Fragment = p$2;
react_production_min.Profiler = r;
react_production_min.PureComponent = G$1;
react_production_min.StrictMode = q$1;
react_production_min.Suspense = w;
react_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W$1;
react_production_min.act = X$2;
react_production_min.cloneElement = function(a, b, e) {
  if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
  var d = C$1({}, a.props), c = a.key, k2 = a.ref, h = a._owner;
  if (null != b) {
    void 0 !== b.ref && (k2 = b.ref, h = K$1.current);
    void 0 !== b.key && (c = "" + b.key);
    if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
    for (f2 in b) J.call(b, f2) && !L$1.hasOwnProperty(f2) && (d[f2] = void 0 === b[f2] && void 0 !== g ? g[f2] : b[f2]);
  }
  var f2 = arguments.length - 2;
  if (1 === f2) d.children = e;
  else if (1 < f2) {
    g = Array(f2);
    for (var m2 = 0; m2 < f2; m2++) g[m2] = arguments[m2 + 2];
    d.children = g;
  }
  return { $$typeof: l$1, type: a.type, key: c, ref: k2, props: d, _owner: h };
};
react_production_min.createContext = function(a) {
  a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
  a.Provider = { $$typeof: t, _context: a };
  return a.Consumer = a;
};
react_production_min.createElement = M$1;
react_production_min.createFactory = function(a) {
  var b = M$1.bind(null, a);
  b.type = a;
  return b;
};
react_production_min.createRef = function() {
  return { current: null };
};
react_production_min.forwardRef = function(a) {
  return { $$typeof: v$1, render: a };
};
react_production_min.isValidElement = O$1;
react_production_min.lazy = function(a) {
  return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T$1 };
};
react_production_min.memo = function(a, b) {
  return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
};
react_production_min.startTransition = function(a) {
  var b = V$1.transition;
  V$1.transition = {};
  try {
    a();
  } finally {
    V$1.transition = b;
  }
};
react_production_min.unstable_act = X$2;
react_production_min.useCallback = function(a, b) {
  return U$1.current.useCallback(a, b);
};
react_production_min.useContext = function(a) {
  return U$1.current.useContext(a);
};
react_production_min.useDebugValue = function() {
};
react_production_min.useDeferredValue = function(a) {
  return U$1.current.useDeferredValue(a);
};
react_production_min.useEffect = function(a, b) {
  return U$1.current.useEffect(a, b);
};
react_production_min.useId = function() {
  return U$1.current.useId();
};
react_production_min.useImperativeHandle = function(a, b, e) {
  return U$1.current.useImperativeHandle(a, b, e);
};
react_production_min.useInsertionEffect = function(a, b) {
  return U$1.current.useInsertionEffect(a, b);
};
react_production_min.useLayoutEffect = function(a, b) {
  return U$1.current.useLayoutEffect(a, b);
};
react_production_min.useMemo = function(a, b) {
  return U$1.current.useMemo(a, b);
};
react_production_min.useReducer = function(a, b, e) {
  return U$1.current.useReducer(a, b, e);
};
react_production_min.useRef = function(a) {
  return U$1.current.useRef(a);
};
react_production_min.useState = function(a) {
  return U$1.current.useState(a);
};
react_production_min.useSyncExternalStore = function(a, b, e) {
  return U$1.current.useSyncExternalStore(a, b, e);
};
react_production_min.useTransition = function() {
  return U$1.current.useTransition();
};
react_production_min.version = "18.3.1";
{
  react.exports = react_production_min;
}
var reactExports = react.exports;
const React$2 = /* @__PURE__ */ getDefaultExportFromCjs(reactExports);
const React$3 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: React$2
}, [reactExports]);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var f = reactExports, k = Symbol.for("react.element"), l = Symbol.for("react.fragment"), m$1 = Object.prototype.hasOwnProperty, n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, p$1 = { key: true, ref: true, __self: true, __source: true };
function q(c, a, g) {
  var b, d = {}, e = null, h = null;
  void 0 !== g && (e = "" + g);
  void 0 !== a.key && (e = "" + a.key);
  void 0 !== a.ref && (h = a.ref);
  for (b in a) m$1.call(a, b) && !p$1.hasOwnProperty(b) && (d[b] = a[b]);
  if (c && c.defaultProps) for (b in a = c.defaultProps, a) void 0 === d[b] && (d[b] = a[b]);
  return { $$typeof: k, type: c, key: e, ref: h, props: d, _owner: n.current };
}
reactJsxRuntime_production_min.Fragment = l;
reactJsxRuntime_production_min.jsx = q;
reactJsxRuntime_production_min.jsxs = q;
{
  jsxRuntime.exports = reactJsxRuntime_production_min;
}
var jsxRuntimeExports = jsxRuntime.exports;
var client = {};
var reactDom = { exports: {} };
var reactDom_production_min = {};
var scheduler = { exports: {} };
var scheduler_production_min = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
(function(exports) {
  function f2(a, b) {
    var c = a.length;
    a.push(b);
    a: for (; 0 < c; ) {
      var d = c - 1 >>> 1, e = a[d];
      if (0 < g(e, b)) a[d] = b, a[c] = e, c = d;
      else break a;
    }
  }
  function h(a) {
    return 0 === a.length ? null : a[0];
  }
  function k2(a) {
    if (0 === a.length) return null;
    var b = a[0], c = a.pop();
    if (c !== b) {
      a[0] = c;
      a: for (var d = 0, e = a.length, w2 = e >>> 1; d < w2; ) {
        var m2 = 2 * (d + 1) - 1, C2 = a[m2], n2 = m2 + 1, x2 = a[n2];
        if (0 > g(C2, c)) n2 < e && 0 > g(x2, C2) ? (a[d] = x2, a[n2] = c, d = n2) : (a[d] = C2, a[m2] = c, d = m2);
        else if (n2 < e && 0 > g(x2, c)) a[d] = x2, a[n2] = c, d = n2;
        else break a;
      }
    }
    return b;
  }
  function g(a, b) {
    var c = a.sortIndex - b.sortIndex;
    return 0 !== c ? c : a.id - b.id;
  }
  if ("object" === typeof performance && "function" === typeof performance.now) {
    var l2 = performance;
    exports.unstable_now = function() {
      return l2.now();
    };
  } else {
    var p2 = Date, q2 = p2.now();
    exports.unstable_now = function() {
      return p2.now() - q2;
    };
  }
  var r2 = [], t2 = [], u2 = 1, v2 = null, y2 = 3, z2 = false, A2 = false, B2 = false, D2 = "function" === typeof setTimeout ? setTimeout : null, E2 = "function" === typeof clearTimeout ? clearTimeout : null, F2 = "undefined" !== typeof setImmediate ? setImmediate : null;
  "undefined" !== typeof navigator && void 0 !== navigator.scheduling && void 0 !== navigator.scheduling.isInputPending && navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function G2(a) {
    for (var b = h(t2); null !== b; ) {
      if (null === b.callback) k2(t2);
      else if (b.startTime <= a) k2(t2), b.sortIndex = b.expirationTime, f2(r2, b);
      else break;
      b = h(t2);
    }
  }
  function H2(a) {
    B2 = false;
    G2(a);
    if (!A2) if (null !== h(r2)) A2 = true, I2(J2);
    else {
      var b = h(t2);
      null !== b && K2(H2, b.startTime - a);
    }
  }
  function J2(a, b) {
    A2 = false;
    B2 && (B2 = false, E2(L2), L2 = -1);
    z2 = true;
    var c = y2;
    try {
      G2(b);
      for (v2 = h(r2); null !== v2 && (!(v2.expirationTime > b) || a && !M2()); ) {
        var d = v2.callback;
        if ("function" === typeof d) {
          v2.callback = null;
          y2 = v2.priorityLevel;
          var e = d(v2.expirationTime <= b);
          b = exports.unstable_now();
          "function" === typeof e ? v2.callback = e : v2 === h(r2) && k2(r2);
          G2(b);
        } else k2(r2);
        v2 = h(r2);
      }
      if (null !== v2) var w2 = true;
      else {
        var m2 = h(t2);
        null !== m2 && K2(H2, m2.startTime - b);
        w2 = false;
      }
      return w2;
    } finally {
      v2 = null, y2 = c, z2 = false;
    }
  }
  var N2 = false, O2 = null, L2 = -1, P2 = 5, Q2 = -1;
  function M2() {
    return exports.unstable_now() - Q2 < P2 ? false : true;
  }
  function R2() {
    if (null !== O2) {
      var a = exports.unstable_now();
      Q2 = a;
      var b = true;
      try {
        b = O2(true, a);
      } finally {
        b ? S2() : (N2 = false, O2 = null);
      }
    } else N2 = false;
  }
  var S2;
  if ("function" === typeof F2) S2 = function() {
    F2(R2);
  };
  else if ("undefined" !== typeof MessageChannel) {
    var T2 = new MessageChannel(), U2 = T2.port2;
    T2.port1.onmessage = R2;
    S2 = function() {
      U2.postMessage(null);
    };
  } else S2 = function() {
    D2(R2, 0);
  };
  function I2(a) {
    O2 = a;
    N2 || (N2 = true, S2());
  }
  function K2(a, b) {
    L2 = D2(function() {
      a(exports.unstable_now());
    }, b);
  }
  exports.unstable_IdlePriority = 5;
  exports.unstable_ImmediatePriority = 1;
  exports.unstable_LowPriority = 4;
  exports.unstable_NormalPriority = 3;
  exports.unstable_Profiling = null;
  exports.unstable_UserBlockingPriority = 2;
  exports.unstable_cancelCallback = function(a) {
    a.callback = null;
  };
  exports.unstable_continueExecution = function() {
    A2 || z2 || (A2 = true, I2(J2));
  };
  exports.unstable_forceFrameRate = function(a) {
    0 > a || 125 < a ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : P2 = 0 < a ? Math.floor(1e3 / a) : 5;
  };
  exports.unstable_getCurrentPriorityLevel = function() {
    return y2;
  };
  exports.unstable_getFirstCallbackNode = function() {
    return h(r2);
  };
  exports.unstable_next = function(a) {
    switch (y2) {
      case 1:
      case 2:
      case 3:
        var b = 3;
        break;
      default:
        b = y2;
    }
    var c = y2;
    y2 = b;
    try {
      return a();
    } finally {
      y2 = c;
    }
  };
  exports.unstable_pauseExecution = function() {
  };
  exports.unstable_requestPaint = function() {
  };
  exports.unstable_runWithPriority = function(a, b) {
    switch (a) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        a = 3;
    }
    var c = y2;
    y2 = a;
    try {
      return b();
    } finally {
      y2 = c;
    }
  };
  exports.unstable_scheduleCallback = function(a, b, c) {
    var d = exports.unstable_now();
    "object" === typeof c && null !== c ? (c = c.delay, c = "number" === typeof c && 0 < c ? d + c : d) : c = d;
    switch (a) {
      case 1:
        var e = -1;
        break;
      case 2:
        e = 250;
        break;
      case 5:
        e = 1073741823;
        break;
      case 4:
        e = 1e4;
        break;
      default:
        e = 5e3;
    }
    e = c + e;
    a = { id: u2++, callback: b, priorityLevel: a, startTime: c, expirationTime: e, sortIndex: -1 };
    c > d ? (a.sortIndex = c, f2(t2, a), null === h(r2) && a === h(t2) && (B2 ? (E2(L2), L2 = -1) : B2 = true, K2(H2, c - d))) : (a.sortIndex = e, f2(r2, a), A2 || z2 || (A2 = true, I2(J2)));
    return a;
  };
  exports.unstable_shouldYield = M2;
  exports.unstable_wrapCallback = function(a) {
    var b = y2;
    return function() {
      var c = y2;
      y2 = b;
      try {
        return a.apply(this, arguments);
      } finally {
        y2 = c;
      }
    };
  };
})(scheduler_production_min);
{
  scheduler.exports = scheduler_production_min;
}
var schedulerExports = scheduler.exports;
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var aa = reactExports, ca = schedulerExports;
function p(a) {
  for (var b = "https://reactjs.org/docs/error-decoder.html?invariant=" + a, c = 1; c < arguments.length; c++) b += "&args[]=" + encodeURIComponent(arguments[c]);
  return "Minified React error #" + a + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var da = /* @__PURE__ */ new Set(), ea = {};
function fa(a, b) {
  ha(a, b);
  ha(a + "Capture", b);
}
function ha(a, b) {
  ea[a] = b;
  for (a = 0; a < b.length; a++) da.add(b[a]);
}
var ia = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement), ja = Object.prototype.hasOwnProperty, ka = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, la = {}, ma = {};
function oa(a) {
  if (ja.call(ma, a)) return true;
  if (ja.call(la, a)) return false;
  if (ka.test(a)) return ma[a] = true;
  la[a] = true;
  return false;
}
function pa(a, b, c, d) {
  if (null !== c && 0 === c.type) return false;
  switch (typeof b) {
    case "function":
    case "symbol":
      return true;
    case "boolean":
      if (d) return false;
      if (null !== c) return !c.acceptsBooleans;
      a = a.toLowerCase().slice(0, 5);
      return "data-" !== a && "aria-" !== a;
    default:
      return false;
  }
}
function qa(a, b, c, d) {
  if (null === b || "undefined" === typeof b || pa(a, b, c, d)) return true;
  if (d) return false;
  if (null !== c) switch (c.type) {
    case 3:
      return !b;
    case 4:
      return false === b;
    case 5:
      return isNaN(b);
    case 6:
      return isNaN(b) || 1 > b;
  }
  return false;
}
function v(a, b, c, d, e, f2, g) {
  this.acceptsBooleans = 2 === b || 3 === b || 4 === b;
  this.attributeName = d;
  this.attributeNamespace = e;
  this.mustUseProperty = c;
  this.propertyName = a;
  this.type = b;
  this.sanitizeURL = f2;
  this.removeEmptyString = g;
}
var z = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(a) {
  z[a] = new v(a, 0, false, a, null, false, false);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(a) {
  var b = a[0];
  z[b] = new v(b, 1, false, a[1], null, false, false);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function(a) {
  z[a] = new v(a, 2, false, a.toLowerCase(), null, false, false);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(a) {
  z[a] = new v(a, 2, false, a, null, false, false);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(a) {
  z[a] = new v(a, 3, false, a.toLowerCase(), null, false, false);
});
["checked", "multiple", "muted", "selected"].forEach(function(a) {
  z[a] = new v(a, 3, true, a, null, false, false);
});
["capture", "download"].forEach(function(a) {
  z[a] = new v(a, 4, false, a, null, false, false);
});
["cols", "rows", "size", "span"].forEach(function(a) {
  z[a] = new v(a, 6, false, a, null, false, false);
});
["rowSpan", "start"].forEach(function(a) {
  z[a] = new v(a, 5, false, a.toLowerCase(), null, false, false);
});
var ra = /[\-:]([a-z])/g;
function sa(a) {
  return a[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(a) {
  var b = a.replace(
    ra,
    sa
  );
  z[b] = new v(b, 1, false, a, null, false, false);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(a) {
  var b = a.replace(ra, sa);
  z[b] = new v(b, 1, false, a, "http://www.w3.org/1999/xlink", false, false);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(a) {
  var b = a.replace(ra, sa);
  z[b] = new v(b, 1, false, a, "http://www.w3.org/XML/1998/namespace", false, false);
});
["tabIndex", "crossOrigin"].forEach(function(a) {
  z[a] = new v(a, 1, false, a.toLowerCase(), null, false, false);
});
z.xlinkHref = new v("xlinkHref", 1, false, "xlink:href", "http://www.w3.org/1999/xlink", true, false);
["src", "href", "action", "formAction"].forEach(function(a) {
  z[a] = new v(a, 1, false, a.toLowerCase(), null, true, true);
});
function ta(a, b, c, d) {
  var e = z.hasOwnProperty(b) ? z[b] : null;
  if (null !== e ? 0 !== e.type : d || !(2 < b.length) || "o" !== b[0] && "O" !== b[0] || "n" !== b[1] && "N" !== b[1]) qa(b, c, e, d) && (c = null), d || null === e ? oa(b) && (null === c ? a.removeAttribute(b) : a.setAttribute(b, "" + c)) : e.mustUseProperty ? a[e.propertyName] = null === c ? 3 === e.type ? false : "" : c : (b = e.attributeName, d = e.attributeNamespace, null === c ? a.removeAttribute(b) : (e = e.type, c = 3 === e || 4 === e && true === c ? "" : "" + c, d ? a.setAttributeNS(d, b, c) : a.setAttribute(b, c)));
}
var ua = aa.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, va = Symbol.for("react.element"), wa = Symbol.for("react.portal"), ya = Symbol.for("react.fragment"), za = Symbol.for("react.strict_mode"), Aa = Symbol.for("react.profiler"), Ba = Symbol.for("react.provider"), Ca = Symbol.for("react.context"), Da = Symbol.for("react.forward_ref"), Ea = Symbol.for("react.suspense"), Fa = Symbol.for("react.suspense_list"), Ga = Symbol.for("react.memo"), Ha = Symbol.for("react.lazy");
var Ia = Symbol.for("react.offscreen");
var Ja = Symbol.iterator;
function Ka(a) {
  if (null === a || "object" !== typeof a) return null;
  a = Ja && a[Ja] || a["@@iterator"];
  return "function" === typeof a ? a : null;
}
var A = Object.assign, La;
function Ma(a) {
  if (void 0 === La) try {
    throw Error();
  } catch (c) {
    var b = c.stack.trim().match(/\n( *(at )?)/);
    La = b && b[1] || "";
  }
  return "\n" + La + a;
}
var Na = false;
function Oa(a, b) {
  if (!a || Na) return "";
  Na = true;
  var c = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    if (b) if (b = function() {
      throw Error();
    }, Object.defineProperty(b.prototype, "props", { set: function() {
      throw Error();
    } }), "object" === typeof Reflect && Reflect.construct) {
      try {
        Reflect.construct(b, []);
      } catch (l2) {
        var d = l2;
      }
      Reflect.construct(a, [], b);
    } else {
      try {
        b.call();
      } catch (l2) {
        d = l2;
      }
      a.call(b.prototype);
    }
    else {
      try {
        throw Error();
      } catch (l2) {
        d = l2;
      }
      a();
    }
  } catch (l2) {
    if (l2 && d && "string" === typeof l2.stack) {
      for (var e = l2.stack.split("\n"), f2 = d.stack.split("\n"), g = e.length - 1, h = f2.length - 1; 1 <= g && 0 <= h && e[g] !== f2[h]; ) h--;
      for (; 1 <= g && 0 <= h; g--, h--) if (e[g] !== f2[h]) {
        if (1 !== g || 1 !== h) {
          do
            if (g--, h--, 0 > h || e[g] !== f2[h]) {
              var k2 = "\n" + e[g].replace(" at new ", " at ");
              a.displayName && k2.includes("<anonymous>") && (k2 = k2.replace("<anonymous>", a.displayName));
              return k2;
            }
          while (1 <= g && 0 <= h);
        }
        break;
      }
    }
  } finally {
    Na = false, Error.prepareStackTrace = c;
  }
  return (a = a ? a.displayName || a.name : "") ? Ma(a) : "";
}
function Pa(a) {
  switch (a.tag) {
    case 5:
      return Ma(a.type);
    case 16:
      return Ma("Lazy");
    case 13:
      return Ma("Suspense");
    case 19:
      return Ma("SuspenseList");
    case 0:
    case 2:
    case 15:
      return a = Oa(a.type, false), a;
    case 11:
      return a = Oa(a.type.render, false), a;
    case 1:
      return a = Oa(a.type, true), a;
    default:
      return "";
  }
}
function Qa(a) {
  if (null == a) return null;
  if ("function" === typeof a) return a.displayName || a.name || null;
  if ("string" === typeof a) return a;
  switch (a) {
    case ya:
      return "Fragment";
    case wa:
      return "Portal";
    case Aa:
      return "Profiler";
    case za:
      return "StrictMode";
    case Ea:
      return "Suspense";
    case Fa:
      return "SuspenseList";
  }
  if ("object" === typeof a) switch (a.$$typeof) {
    case Ca:
      return (a.displayName || "Context") + ".Consumer";
    case Ba:
      return (a._context.displayName || "Context") + ".Provider";
    case Da:
      var b = a.render;
      a = a.displayName;
      a || (a = b.displayName || b.name || "", a = "" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
      return a;
    case Ga:
      return b = a.displayName || null, null !== b ? b : Qa(a.type) || "Memo";
    case Ha:
      b = a._payload;
      a = a._init;
      try {
        return Qa(a(b));
      } catch (c) {
      }
  }
  return null;
}
function Ra(a) {
  var b = a.type;
  switch (a.tag) {
    case 24:
      return "Cache";
    case 9:
      return (b.displayName || "Context") + ".Consumer";
    case 10:
      return (b._context.displayName || "Context") + ".Provider";
    case 18:
      return "DehydratedFragment";
    case 11:
      return a = b.render, a = a.displayName || a.name || "", b.displayName || ("" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
    case 7:
      return "Fragment";
    case 5:
      return b;
    case 4:
      return "Portal";
    case 3:
      return "Root";
    case 6:
      return "Text";
    case 16:
      return Qa(b);
    case 8:
      return b === za ? "StrictMode" : "Mode";
    case 22:
      return "Offscreen";
    case 12:
      return "Profiler";
    case 21:
      return "Scope";
    case 13:
      return "Suspense";
    case 19:
      return "SuspenseList";
    case 25:
      return "TracingMarker";
    case 1:
    case 0:
    case 17:
    case 2:
    case 14:
    case 15:
      if ("function" === typeof b) return b.displayName || b.name || null;
      if ("string" === typeof b) return b;
  }
  return null;
}
function Sa(a) {
  switch (typeof a) {
    case "boolean":
    case "number":
    case "string":
    case "undefined":
      return a;
    case "object":
      return a;
    default:
      return "";
  }
}
function Ta(a) {
  var b = a.type;
  return (a = a.nodeName) && "input" === a.toLowerCase() && ("checkbox" === b || "radio" === b);
}
function Ua(a) {
  var b = Ta(a) ? "checked" : "value", c = Object.getOwnPropertyDescriptor(a.constructor.prototype, b), d = "" + a[b];
  if (!a.hasOwnProperty(b) && "undefined" !== typeof c && "function" === typeof c.get && "function" === typeof c.set) {
    var e = c.get, f2 = c.set;
    Object.defineProperty(a, b, { configurable: true, get: function() {
      return e.call(this);
    }, set: function(a2) {
      d = "" + a2;
      f2.call(this, a2);
    } });
    Object.defineProperty(a, b, { enumerable: c.enumerable });
    return { getValue: function() {
      return d;
    }, setValue: function(a2) {
      d = "" + a2;
    }, stopTracking: function() {
      a._valueTracker = null;
      delete a[b];
    } };
  }
}
function Va(a) {
  a._valueTracker || (a._valueTracker = Ua(a));
}
function Wa(a) {
  if (!a) return false;
  var b = a._valueTracker;
  if (!b) return true;
  var c = b.getValue();
  var d = "";
  a && (d = Ta(a) ? a.checked ? "true" : "false" : a.value);
  a = d;
  return a !== c ? (b.setValue(a), true) : false;
}
function Xa(a) {
  a = a || ("undefined" !== typeof document ? document : void 0);
  if ("undefined" === typeof a) return null;
  try {
    return a.activeElement || a.body;
  } catch (b) {
    return a.body;
  }
}
function Ya(a, b) {
  var c = b.checked;
  return A({}, b, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: null != c ? c : a._wrapperState.initialChecked });
}
function Za(a, b) {
  var c = null == b.defaultValue ? "" : b.defaultValue, d = null != b.checked ? b.checked : b.defaultChecked;
  c = Sa(null != b.value ? b.value : c);
  a._wrapperState = { initialChecked: d, initialValue: c, controlled: "checkbox" === b.type || "radio" === b.type ? null != b.checked : null != b.value };
}
function ab(a, b) {
  b = b.checked;
  null != b && ta(a, "checked", b, false);
}
function bb(a, b) {
  ab(a, b);
  var c = Sa(b.value), d = b.type;
  if (null != c) if ("number" === d) {
    if (0 === c && "" === a.value || a.value != c) a.value = "" + c;
  } else a.value !== "" + c && (a.value = "" + c);
  else if ("submit" === d || "reset" === d) {
    a.removeAttribute("value");
    return;
  }
  b.hasOwnProperty("value") ? cb(a, b.type, c) : b.hasOwnProperty("defaultValue") && cb(a, b.type, Sa(b.defaultValue));
  null == b.checked && null != b.defaultChecked && (a.defaultChecked = !!b.defaultChecked);
}
function db(a, b, c) {
  if (b.hasOwnProperty("value") || b.hasOwnProperty("defaultValue")) {
    var d = b.type;
    if (!("submit" !== d && "reset" !== d || void 0 !== b.value && null !== b.value)) return;
    b = "" + a._wrapperState.initialValue;
    c || b === a.value || (a.value = b);
    a.defaultValue = b;
  }
  c = a.name;
  "" !== c && (a.name = "");
  a.defaultChecked = !!a._wrapperState.initialChecked;
  "" !== c && (a.name = c);
}
function cb(a, b, c) {
  if ("number" !== b || Xa(a.ownerDocument) !== a) null == c ? a.defaultValue = "" + a._wrapperState.initialValue : a.defaultValue !== "" + c && (a.defaultValue = "" + c);
}
var eb = Array.isArray;
function fb(a, b, c, d) {
  a = a.options;
  if (b) {
    b = {};
    for (var e = 0; e < c.length; e++) b["$" + c[e]] = true;
    for (c = 0; c < a.length; c++) e = b.hasOwnProperty("$" + a[c].value), a[c].selected !== e && (a[c].selected = e), e && d && (a[c].defaultSelected = true);
  } else {
    c = "" + Sa(c);
    b = null;
    for (e = 0; e < a.length; e++) {
      if (a[e].value === c) {
        a[e].selected = true;
        d && (a[e].defaultSelected = true);
        return;
      }
      null !== b || a[e].disabled || (b = a[e]);
    }
    null !== b && (b.selected = true);
  }
}
function gb(a, b) {
  if (null != b.dangerouslySetInnerHTML) throw Error(p(91));
  return A({}, b, { value: void 0, defaultValue: void 0, children: "" + a._wrapperState.initialValue });
}
function hb(a, b) {
  var c = b.value;
  if (null == c) {
    c = b.children;
    b = b.defaultValue;
    if (null != c) {
      if (null != b) throw Error(p(92));
      if (eb(c)) {
        if (1 < c.length) throw Error(p(93));
        c = c[0];
      }
      b = c;
    }
    null == b && (b = "");
    c = b;
  }
  a._wrapperState = { initialValue: Sa(c) };
}
function ib(a, b) {
  var c = Sa(b.value), d = Sa(b.defaultValue);
  null != c && (c = "" + c, c !== a.value && (a.value = c), null == b.defaultValue && a.defaultValue !== c && (a.defaultValue = c));
  null != d && (a.defaultValue = "" + d);
}
function jb(a) {
  var b = a.textContent;
  b === a._wrapperState.initialValue && "" !== b && null !== b && (a.value = b);
}
function kb(a) {
  switch (a) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function lb(a, b) {
  return null == a || "http://www.w3.org/1999/xhtml" === a ? kb(b) : "http://www.w3.org/2000/svg" === a && "foreignObject" === b ? "http://www.w3.org/1999/xhtml" : a;
}
var mb, nb = function(a) {
  return "undefined" !== typeof MSApp && MSApp.execUnsafeLocalFunction ? function(b, c, d, e) {
    MSApp.execUnsafeLocalFunction(function() {
      return a(b, c, d, e);
    });
  } : a;
}(function(a, b) {
  if ("http://www.w3.org/2000/svg" !== a.namespaceURI || "innerHTML" in a) a.innerHTML = b;
  else {
    mb = mb || document.createElement("div");
    mb.innerHTML = "<svg>" + b.valueOf().toString() + "</svg>";
    for (b = mb.firstChild; a.firstChild; ) a.removeChild(a.firstChild);
    for (; b.firstChild; ) a.appendChild(b.firstChild);
  }
});
function ob(a, b) {
  if (b) {
    var c = a.firstChild;
    if (c && c === a.lastChild && 3 === c.nodeType) {
      c.nodeValue = b;
      return;
    }
  }
  a.textContent = b;
}
var pb = {
  animationIterationCount: true,
  aspectRatio: true,
  borderImageOutset: true,
  borderImageSlice: true,
  borderImageWidth: true,
  boxFlex: true,
  boxFlexGroup: true,
  boxOrdinalGroup: true,
  columnCount: true,
  columns: true,
  flex: true,
  flexGrow: true,
  flexPositive: true,
  flexShrink: true,
  flexNegative: true,
  flexOrder: true,
  gridArea: true,
  gridRow: true,
  gridRowEnd: true,
  gridRowSpan: true,
  gridRowStart: true,
  gridColumn: true,
  gridColumnEnd: true,
  gridColumnSpan: true,
  gridColumnStart: true,
  fontWeight: true,
  lineClamp: true,
  lineHeight: true,
  opacity: true,
  order: true,
  orphans: true,
  tabSize: true,
  widows: true,
  zIndex: true,
  zoom: true,
  fillOpacity: true,
  floodOpacity: true,
  stopOpacity: true,
  strokeDasharray: true,
  strokeDashoffset: true,
  strokeMiterlimit: true,
  strokeOpacity: true,
  strokeWidth: true
}, qb = ["Webkit", "ms", "Moz", "O"];
Object.keys(pb).forEach(function(a) {
  qb.forEach(function(b) {
    b = b + a.charAt(0).toUpperCase() + a.substring(1);
    pb[b] = pb[a];
  });
});
function rb(a, b, c) {
  return null == b || "boolean" === typeof b || "" === b ? "" : c || "number" !== typeof b || 0 === b || pb.hasOwnProperty(a) && pb[a] ? ("" + b).trim() : b + "px";
}
function sb(a, b) {
  a = a.style;
  for (var c in b) if (b.hasOwnProperty(c)) {
    var d = 0 === c.indexOf("--"), e = rb(c, b[c], d);
    "float" === c && (c = "cssFloat");
    d ? a.setProperty(c, e) : a[c] = e;
  }
}
var tb = A({ menuitem: true }, { area: true, base: true, br: true, col: true, embed: true, hr: true, img: true, input: true, keygen: true, link: true, meta: true, param: true, source: true, track: true, wbr: true });
function ub(a, b) {
  if (b) {
    if (tb[a] && (null != b.children || null != b.dangerouslySetInnerHTML)) throw Error(p(137, a));
    if (null != b.dangerouslySetInnerHTML) {
      if (null != b.children) throw Error(p(60));
      if ("object" !== typeof b.dangerouslySetInnerHTML || !("__html" in b.dangerouslySetInnerHTML)) throw Error(p(61));
    }
    if (null != b.style && "object" !== typeof b.style) throw Error(p(62));
  }
}
function vb(a, b) {
  if (-1 === a.indexOf("-")) return "string" === typeof b.is;
  switch (a) {
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      return false;
    default:
      return true;
  }
}
var wb = null;
function xb(a) {
  a = a.target || a.srcElement || window;
  a.correspondingUseElement && (a = a.correspondingUseElement);
  return 3 === a.nodeType ? a.parentNode : a;
}
var yb = null, zb = null, Ab = null;
function Bb(a) {
  if (a = Cb(a)) {
    if ("function" !== typeof yb) throw Error(p(280));
    var b = a.stateNode;
    b && (b = Db(b), yb(a.stateNode, a.type, b));
  }
}
function Eb(a) {
  zb ? Ab ? Ab.push(a) : Ab = [a] : zb = a;
}
function Fb() {
  if (zb) {
    var a = zb, b = Ab;
    Ab = zb = null;
    Bb(a);
    if (b) for (a = 0; a < b.length; a++) Bb(b[a]);
  }
}
function Gb(a, b) {
  return a(b);
}
function Hb() {
}
var Ib = false;
function Jb(a, b, c) {
  if (Ib) return a(b, c);
  Ib = true;
  try {
    return Gb(a, b, c);
  } finally {
    if (Ib = false, null !== zb || null !== Ab) Hb(), Fb();
  }
}
function Kb(a, b) {
  var c = a.stateNode;
  if (null === c) return null;
  var d = Db(c);
  if (null === d) return null;
  c = d[b];
  a: switch (b) {
    case "onClick":
    case "onClickCapture":
    case "onDoubleClick":
    case "onDoubleClickCapture":
    case "onMouseDown":
    case "onMouseDownCapture":
    case "onMouseMove":
    case "onMouseMoveCapture":
    case "onMouseUp":
    case "onMouseUpCapture":
    case "onMouseEnter":
      (d = !d.disabled) || (a = a.type, d = !("button" === a || "input" === a || "select" === a || "textarea" === a));
      a = !d;
      break a;
    default:
      a = false;
  }
  if (a) return null;
  if (c && "function" !== typeof c) throw Error(p(231, b, typeof c));
  return c;
}
var Lb = false;
if (ia) try {
  var Mb = {};
  Object.defineProperty(Mb, "passive", { get: function() {
    Lb = true;
  } });
  window.addEventListener("test", Mb, Mb);
  window.removeEventListener("test", Mb, Mb);
} catch (a) {
  Lb = false;
}
function Nb(a, b, c, d, e, f2, g, h, k2) {
  var l2 = Array.prototype.slice.call(arguments, 3);
  try {
    b.apply(c, l2);
  } catch (m2) {
    this.onError(m2);
  }
}
var Ob = false, Pb = null, Qb = false, Rb = null, Sb = { onError: function(a) {
  Ob = true;
  Pb = a;
} };
function Tb(a, b, c, d, e, f2, g, h, k2) {
  Ob = false;
  Pb = null;
  Nb.apply(Sb, arguments);
}
function Ub(a, b, c, d, e, f2, g, h, k2) {
  Tb.apply(this, arguments);
  if (Ob) {
    if (Ob) {
      var l2 = Pb;
      Ob = false;
      Pb = null;
    } else throw Error(p(198));
    Qb || (Qb = true, Rb = l2);
  }
}
function Vb(a) {
  var b = a, c = a;
  if (a.alternate) for (; b.return; ) b = b.return;
  else {
    a = b;
    do
      b = a, 0 !== (b.flags & 4098) && (c = b.return), a = b.return;
    while (a);
  }
  return 3 === b.tag ? c : null;
}
function Wb(a) {
  if (13 === a.tag) {
    var b = a.memoizedState;
    null === b && (a = a.alternate, null !== a && (b = a.memoizedState));
    if (null !== b) return b.dehydrated;
  }
  return null;
}
function Xb(a) {
  if (Vb(a) !== a) throw Error(p(188));
}
function Yb(a) {
  var b = a.alternate;
  if (!b) {
    b = Vb(a);
    if (null === b) throw Error(p(188));
    return b !== a ? null : a;
  }
  for (var c = a, d = b; ; ) {
    var e = c.return;
    if (null === e) break;
    var f2 = e.alternate;
    if (null === f2) {
      d = e.return;
      if (null !== d) {
        c = d;
        continue;
      }
      break;
    }
    if (e.child === f2.child) {
      for (f2 = e.child; f2; ) {
        if (f2 === c) return Xb(e), a;
        if (f2 === d) return Xb(e), b;
        f2 = f2.sibling;
      }
      throw Error(p(188));
    }
    if (c.return !== d.return) c = e, d = f2;
    else {
      for (var g = false, h = e.child; h; ) {
        if (h === c) {
          g = true;
          c = e;
          d = f2;
          break;
        }
        if (h === d) {
          g = true;
          d = e;
          c = f2;
          break;
        }
        h = h.sibling;
      }
      if (!g) {
        for (h = f2.child; h; ) {
          if (h === c) {
            g = true;
            c = f2;
            d = e;
            break;
          }
          if (h === d) {
            g = true;
            d = f2;
            c = e;
            break;
          }
          h = h.sibling;
        }
        if (!g) throw Error(p(189));
      }
    }
    if (c.alternate !== d) throw Error(p(190));
  }
  if (3 !== c.tag) throw Error(p(188));
  return c.stateNode.current === c ? a : b;
}
function Zb(a) {
  a = Yb(a);
  return null !== a ? $b(a) : null;
}
function $b(a) {
  if (5 === a.tag || 6 === a.tag) return a;
  for (a = a.child; null !== a; ) {
    var b = $b(a);
    if (null !== b) return b;
    a = a.sibling;
  }
  return null;
}
var ac = ca.unstable_scheduleCallback, bc = ca.unstable_cancelCallback, cc = ca.unstable_shouldYield, dc = ca.unstable_requestPaint, B = ca.unstable_now, ec = ca.unstable_getCurrentPriorityLevel, fc = ca.unstable_ImmediatePriority, gc = ca.unstable_UserBlockingPriority, hc = ca.unstable_NormalPriority, ic = ca.unstable_LowPriority, jc = ca.unstable_IdlePriority, kc = null, lc = null;
function mc(a) {
  if (lc && "function" === typeof lc.onCommitFiberRoot) try {
    lc.onCommitFiberRoot(kc, a, void 0, 128 === (a.current.flags & 128));
  } catch (b) {
  }
}
var oc = Math.clz32 ? Math.clz32 : nc, pc = Math.log, qc = Math.LN2;
function nc(a) {
  a >>>= 0;
  return 0 === a ? 32 : 31 - (pc(a) / qc | 0) | 0;
}
var rc = 64, sc = 4194304;
function tc(a) {
  switch (a & -a) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return a & 4194240;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return a & 130023424;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 1073741824;
    default:
      return a;
  }
}
function uc(a, b) {
  var c = a.pendingLanes;
  if (0 === c) return 0;
  var d = 0, e = a.suspendedLanes, f2 = a.pingedLanes, g = c & 268435455;
  if (0 !== g) {
    var h = g & ~e;
    0 !== h ? d = tc(h) : (f2 &= g, 0 !== f2 && (d = tc(f2)));
  } else g = c & ~e, 0 !== g ? d = tc(g) : 0 !== f2 && (d = tc(f2));
  if (0 === d) return 0;
  if (0 !== b && b !== d && 0 === (b & e) && (e = d & -d, f2 = b & -b, e >= f2 || 16 === e && 0 !== (f2 & 4194240))) return b;
  0 !== (d & 4) && (d |= c & 16);
  b = a.entangledLanes;
  if (0 !== b) for (a = a.entanglements, b &= d; 0 < b; ) c = 31 - oc(b), e = 1 << c, d |= a[c], b &= ~e;
  return d;
}
function vc(a, b) {
  switch (a) {
    case 1:
    case 2:
    case 4:
      return b + 250;
    case 8:
    case 16:
    case 32:
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return b + 5e3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return -1;
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function wc(a, b) {
  for (var c = a.suspendedLanes, d = a.pingedLanes, e = a.expirationTimes, f2 = a.pendingLanes; 0 < f2; ) {
    var g = 31 - oc(f2), h = 1 << g, k2 = e[g];
    if (-1 === k2) {
      if (0 === (h & c) || 0 !== (h & d)) e[g] = vc(h, b);
    } else k2 <= b && (a.expiredLanes |= h);
    f2 &= ~h;
  }
}
function xc(a) {
  a = a.pendingLanes & -1073741825;
  return 0 !== a ? a : a & 1073741824 ? 1073741824 : 0;
}
function yc() {
  var a = rc;
  rc <<= 1;
  0 === (rc & 4194240) && (rc = 64);
  return a;
}
function zc(a) {
  for (var b = [], c = 0; 31 > c; c++) b.push(a);
  return b;
}
function Ac(a, b, c) {
  a.pendingLanes |= b;
  536870912 !== b && (a.suspendedLanes = 0, a.pingedLanes = 0);
  a = a.eventTimes;
  b = 31 - oc(b);
  a[b] = c;
}
function Bc(a, b) {
  var c = a.pendingLanes & ~b;
  a.pendingLanes = b;
  a.suspendedLanes = 0;
  a.pingedLanes = 0;
  a.expiredLanes &= b;
  a.mutableReadLanes &= b;
  a.entangledLanes &= b;
  b = a.entanglements;
  var d = a.eventTimes;
  for (a = a.expirationTimes; 0 < c; ) {
    var e = 31 - oc(c), f2 = 1 << e;
    b[e] = 0;
    d[e] = -1;
    a[e] = -1;
    c &= ~f2;
  }
}
function Cc(a, b) {
  var c = a.entangledLanes |= b;
  for (a = a.entanglements; c; ) {
    var d = 31 - oc(c), e = 1 << d;
    e & b | a[d] & b && (a[d] |= b);
    c &= ~e;
  }
}
var C = 0;
function Dc(a) {
  a &= -a;
  return 1 < a ? 4 < a ? 0 !== (a & 268435455) ? 16 : 536870912 : 4 : 1;
}
var Ec, Fc, Gc, Hc, Ic, Jc = false, Kc = [], Lc = null, Mc = null, Nc = null, Oc = /* @__PURE__ */ new Map(), Pc = /* @__PURE__ */ new Map(), Qc = [], Rc = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function Sc(a, b) {
  switch (a) {
    case "focusin":
    case "focusout":
      Lc = null;
      break;
    case "dragenter":
    case "dragleave":
      Mc = null;
      break;
    case "mouseover":
    case "mouseout":
      Nc = null;
      break;
    case "pointerover":
    case "pointerout":
      Oc.delete(b.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      Pc.delete(b.pointerId);
  }
}
function Tc(a, b, c, d, e, f2) {
  if (null === a || a.nativeEvent !== f2) return a = { blockedOn: b, domEventName: c, eventSystemFlags: d, nativeEvent: f2, targetContainers: [e] }, null !== b && (b = Cb(b), null !== b && Fc(b)), a;
  a.eventSystemFlags |= d;
  b = a.targetContainers;
  null !== e && -1 === b.indexOf(e) && b.push(e);
  return a;
}
function Uc(a, b, c, d, e) {
  switch (b) {
    case "focusin":
      return Lc = Tc(Lc, a, b, c, d, e), true;
    case "dragenter":
      return Mc = Tc(Mc, a, b, c, d, e), true;
    case "mouseover":
      return Nc = Tc(Nc, a, b, c, d, e), true;
    case "pointerover":
      var f2 = e.pointerId;
      Oc.set(f2, Tc(Oc.get(f2) || null, a, b, c, d, e));
      return true;
    case "gotpointercapture":
      return f2 = e.pointerId, Pc.set(f2, Tc(Pc.get(f2) || null, a, b, c, d, e)), true;
  }
  return false;
}
function Vc(a) {
  var b = Wc(a.target);
  if (null !== b) {
    var c = Vb(b);
    if (null !== c) {
      if (b = c.tag, 13 === b) {
        if (b = Wb(c), null !== b) {
          a.blockedOn = b;
          Ic(a.priority, function() {
            Gc(c);
          });
          return;
        }
      } else if (3 === b && c.stateNode.current.memoizedState.isDehydrated) {
        a.blockedOn = 3 === c.tag ? c.stateNode.containerInfo : null;
        return;
      }
    }
  }
  a.blockedOn = null;
}
function Xc(a) {
  if (null !== a.blockedOn) return false;
  for (var b = a.targetContainers; 0 < b.length; ) {
    var c = Yc(a.domEventName, a.eventSystemFlags, b[0], a.nativeEvent);
    if (null === c) {
      c = a.nativeEvent;
      var d = new c.constructor(c.type, c);
      wb = d;
      c.target.dispatchEvent(d);
      wb = null;
    } else return b = Cb(c), null !== b && Fc(b), a.blockedOn = c, false;
    b.shift();
  }
  return true;
}
function Zc(a, b, c) {
  Xc(a) && c.delete(b);
}
function $c() {
  Jc = false;
  null !== Lc && Xc(Lc) && (Lc = null);
  null !== Mc && Xc(Mc) && (Mc = null);
  null !== Nc && Xc(Nc) && (Nc = null);
  Oc.forEach(Zc);
  Pc.forEach(Zc);
}
function ad(a, b) {
  a.blockedOn === b && (a.blockedOn = null, Jc || (Jc = true, ca.unstable_scheduleCallback(ca.unstable_NormalPriority, $c)));
}
function bd(a) {
  function b(b2) {
    return ad(b2, a);
  }
  if (0 < Kc.length) {
    ad(Kc[0], a);
    for (var c = 1; c < Kc.length; c++) {
      var d = Kc[c];
      d.blockedOn === a && (d.blockedOn = null);
    }
  }
  null !== Lc && ad(Lc, a);
  null !== Mc && ad(Mc, a);
  null !== Nc && ad(Nc, a);
  Oc.forEach(b);
  Pc.forEach(b);
  for (c = 0; c < Qc.length; c++) d = Qc[c], d.blockedOn === a && (d.blockedOn = null);
  for (; 0 < Qc.length && (c = Qc[0], null === c.blockedOn); ) Vc(c), null === c.blockedOn && Qc.shift();
}
var cd = ua.ReactCurrentBatchConfig, dd = true;
function ed(a, b, c, d) {
  var e = C, f2 = cd.transition;
  cd.transition = null;
  try {
    C = 1, fd(a, b, c, d);
  } finally {
    C = e, cd.transition = f2;
  }
}
function gd(a, b, c, d) {
  var e = C, f2 = cd.transition;
  cd.transition = null;
  try {
    C = 4, fd(a, b, c, d);
  } finally {
    C = e, cd.transition = f2;
  }
}
function fd(a, b, c, d) {
  if (dd) {
    var e = Yc(a, b, c, d);
    if (null === e) hd(a, b, d, id, c), Sc(a, d);
    else if (Uc(e, a, b, c, d)) d.stopPropagation();
    else if (Sc(a, d), b & 4 && -1 < Rc.indexOf(a)) {
      for (; null !== e; ) {
        var f2 = Cb(e);
        null !== f2 && Ec(f2);
        f2 = Yc(a, b, c, d);
        null === f2 && hd(a, b, d, id, c);
        if (f2 === e) break;
        e = f2;
      }
      null !== e && d.stopPropagation();
    } else hd(a, b, d, null, c);
  }
}
var id = null;
function Yc(a, b, c, d) {
  id = null;
  a = xb(d);
  a = Wc(a);
  if (null !== a) if (b = Vb(a), null === b) a = null;
  else if (c = b.tag, 13 === c) {
    a = Wb(b);
    if (null !== a) return a;
    a = null;
  } else if (3 === c) {
    if (b.stateNode.current.memoizedState.isDehydrated) return 3 === b.tag ? b.stateNode.containerInfo : null;
    a = null;
  } else b !== a && (a = null);
  id = a;
  return null;
}
function jd(a) {
  switch (a) {
    case "cancel":
    case "click":
    case "close":
    case "contextmenu":
    case "copy":
    case "cut":
    case "auxclick":
    case "dblclick":
    case "dragend":
    case "dragstart":
    case "drop":
    case "focusin":
    case "focusout":
    case "input":
    case "invalid":
    case "keydown":
    case "keypress":
    case "keyup":
    case "mousedown":
    case "mouseup":
    case "paste":
    case "pause":
    case "play":
    case "pointercancel":
    case "pointerdown":
    case "pointerup":
    case "ratechange":
    case "reset":
    case "resize":
    case "seeked":
    case "submit":
    case "touchcancel":
    case "touchend":
    case "touchstart":
    case "volumechange":
    case "change":
    case "selectionchange":
    case "textInput":
    case "compositionstart":
    case "compositionend":
    case "compositionupdate":
    case "beforeblur":
    case "afterblur":
    case "beforeinput":
    case "blur":
    case "fullscreenchange":
    case "focus":
    case "hashchange":
    case "popstate":
    case "select":
    case "selectstart":
      return 1;
    case "drag":
    case "dragenter":
    case "dragexit":
    case "dragleave":
    case "dragover":
    case "mousemove":
    case "mouseout":
    case "mouseover":
    case "pointermove":
    case "pointerout":
    case "pointerover":
    case "scroll":
    case "toggle":
    case "touchmove":
    case "wheel":
    case "mouseenter":
    case "mouseleave":
    case "pointerenter":
    case "pointerleave":
      return 4;
    case "message":
      switch (ec()) {
        case fc:
          return 1;
        case gc:
          return 4;
        case hc:
        case ic:
          return 16;
        case jc:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var kd = null, ld = null, md = null;
function nd() {
  if (md) return md;
  var a, b = ld, c = b.length, d, e = "value" in kd ? kd.value : kd.textContent, f2 = e.length;
  for (a = 0; a < c && b[a] === e[a]; a++) ;
  var g = c - a;
  for (d = 1; d <= g && b[c - d] === e[f2 - d]; d++) ;
  return md = e.slice(a, 1 < d ? 1 - d : void 0);
}
function od(a) {
  var b = a.keyCode;
  "charCode" in a ? (a = a.charCode, 0 === a && 13 === b && (a = 13)) : a = b;
  10 === a && (a = 13);
  return 32 <= a || 13 === a ? a : 0;
}
function pd() {
  return true;
}
function qd() {
  return false;
}
function rd(a) {
  function b(b2, d, e, f2, g) {
    this._reactName = b2;
    this._targetInst = e;
    this.type = d;
    this.nativeEvent = f2;
    this.target = g;
    this.currentTarget = null;
    for (var c in a) a.hasOwnProperty(c) && (b2 = a[c], this[c] = b2 ? b2(f2) : f2[c]);
    this.isDefaultPrevented = (null != f2.defaultPrevented ? f2.defaultPrevented : false === f2.returnValue) ? pd : qd;
    this.isPropagationStopped = qd;
    return this;
  }
  A(b.prototype, { preventDefault: function() {
    this.defaultPrevented = true;
    var a2 = this.nativeEvent;
    a2 && (a2.preventDefault ? a2.preventDefault() : "unknown" !== typeof a2.returnValue && (a2.returnValue = false), this.isDefaultPrevented = pd);
  }, stopPropagation: function() {
    var a2 = this.nativeEvent;
    a2 && (a2.stopPropagation ? a2.stopPropagation() : "unknown" !== typeof a2.cancelBubble && (a2.cancelBubble = true), this.isPropagationStopped = pd);
  }, persist: function() {
  }, isPersistent: pd });
  return b;
}
var sd = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(a) {
  return a.timeStamp || Date.now();
}, defaultPrevented: 0, isTrusted: 0 }, td = rd(sd), ud = A({}, sd, { view: 0, detail: 0 }), vd = rd(ud), wd, xd, yd, Ad = A({}, ud, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: zd, button: 0, buttons: 0, relatedTarget: function(a) {
  return void 0 === a.relatedTarget ? a.fromElement === a.srcElement ? a.toElement : a.fromElement : a.relatedTarget;
}, movementX: function(a) {
  if ("movementX" in a) return a.movementX;
  a !== yd && (yd && "mousemove" === a.type ? (wd = a.screenX - yd.screenX, xd = a.screenY - yd.screenY) : xd = wd = 0, yd = a);
  return wd;
}, movementY: function(a) {
  return "movementY" in a ? a.movementY : xd;
} }), Bd = rd(Ad), Cd = A({}, Ad, { dataTransfer: 0 }), Dd = rd(Cd), Ed = A({}, ud, { relatedTarget: 0 }), Fd = rd(Ed), Gd = A({}, sd, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Hd = rd(Gd), Id = A({}, sd, { clipboardData: function(a) {
  return "clipboardData" in a ? a.clipboardData : window.clipboardData;
} }), Jd = rd(Id), Kd = A({}, sd, { data: 0 }), Ld = rd(Kd), Md = {
  Esc: "Escape",
  Spacebar: " ",
  Left: "ArrowLeft",
  Up: "ArrowUp",
  Right: "ArrowRight",
  Down: "ArrowDown",
  Del: "Delete",
  Win: "OS",
  Menu: "ContextMenu",
  Apps: "ContextMenu",
  Scroll: "ScrollLock",
  MozPrintableKey: "Unidentified"
}, Nd = {
  8: "Backspace",
  9: "Tab",
  12: "Clear",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  19: "Pause",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  45: "Insert",
  46: "Delete",
  112: "F1",
  113: "F2",
  114: "F3",
  115: "F4",
  116: "F5",
  117: "F6",
  118: "F7",
  119: "F8",
  120: "F9",
  121: "F10",
  122: "F11",
  123: "F12",
  144: "NumLock",
  145: "ScrollLock",
  224: "Meta"
}, Od = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function Pd(a) {
  var b = this.nativeEvent;
  return b.getModifierState ? b.getModifierState(a) : (a = Od[a]) ? !!b[a] : false;
}
function zd() {
  return Pd;
}
var Qd = A({}, ud, { key: function(a) {
  if (a.key) {
    var b = Md[a.key] || a.key;
    if ("Unidentified" !== b) return b;
  }
  return "keypress" === a.type ? (a = od(a), 13 === a ? "Enter" : String.fromCharCode(a)) : "keydown" === a.type || "keyup" === a.type ? Nd[a.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: zd, charCode: function(a) {
  return "keypress" === a.type ? od(a) : 0;
}, keyCode: function(a) {
  return "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
}, which: function(a) {
  return "keypress" === a.type ? od(a) : "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
} }), Rd = rd(Qd), Sd = A({}, Ad, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Td = rd(Sd), Ud = A({}, ud, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: zd }), Vd = rd(Ud), Wd = A({}, sd, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Xd = rd(Wd), Yd = A({}, Ad, {
  deltaX: function(a) {
    return "deltaX" in a ? a.deltaX : "wheelDeltaX" in a ? -a.wheelDeltaX : 0;
  },
  deltaY: function(a) {
    return "deltaY" in a ? a.deltaY : "wheelDeltaY" in a ? -a.wheelDeltaY : "wheelDelta" in a ? -a.wheelDelta : 0;
  },
  deltaZ: 0,
  deltaMode: 0
}), Zd = rd(Yd), $d = [9, 13, 27, 32], ae = ia && "CompositionEvent" in window, be = null;
ia && "documentMode" in document && (be = document.documentMode);
var ce = ia && "TextEvent" in window && !be, de = ia && (!ae || be && 8 < be && 11 >= be), ee = String.fromCharCode(32), fe = false;
function ge(a, b) {
  switch (a) {
    case "keyup":
      return -1 !== $d.indexOf(b.keyCode);
    case "keydown":
      return 229 !== b.keyCode;
    case "keypress":
    case "mousedown":
    case "focusout":
      return true;
    default:
      return false;
  }
}
function he(a) {
  a = a.detail;
  return "object" === typeof a && "data" in a ? a.data : null;
}
var ie = false;
function je(a, b) {
  switch (a) {
    case "compositionend":
      return he(b);
    case "keypress":
      if (32 !== b.which) return null;
      fe = true;
      return ee;
    case "textInput":
      return a = b.data, a === ee && fe ? null : a;
    default:
      return null;
  }
}
function ke(a, b) {
  if (ie) return "compositionend" === a || !ae && ge(a, b) ? (a = nd(), md = ld = kd = null, ie = false, a) : null;
  switch (a) {
    case "paste":
      return null;
    case "keypress":
      if (!(b.ctrlKey || b.altKey || b.metaKey) || b.ctrlKey && b.altKey) {
        if (b.char && 1 < b.char.length) return b.char;
        if (b.which) return String.fromCharCode(b.which);
      }
      return null;
    case "compositionend":
      return de && "ko" !== b.locale ? null : b.data;
    default:
      return null;
  }
}
var le = { color: true, date: true, datetime: true, "datetime-local": true, email: true, month: true, number: true, password: true, range: true, search: true, tel: true, text: true, time: true, url: true, week: true };
function me(a) {
  var b = a && a.nodeName && a.nodeName.toLowerCase();
  return "input" === b ? !!le[a.type] : "textarea" === b ? true : false;
}
function ne(a, b, c, d) {
  Eb(d);
  b = oe(b, "onChange");
  0 < b.length && (c = new td("onChange", "change", null, c, d), a.push({ event: c, listeners: b }));
}
var pe = null, qe = null;
function re(a) {
  se(a, 0);
}
function te(a) {
  var b = ue(a);
  if (Wa(b)) return a;
}
function ve(a, b) {
  if ("change" === a) return b;
}
var we = false;
if (ia) {
  var xe;
  if (ia) {
    var ye = "oninput" in document;
    if (!ye) {
      var ze = document.createElement("div");
      ze.setAttribute("oninput", "return;");
      ye = "function" === typeof ze.oninput;
    }
    xe = ye;
  } else xe = false;
  we = xe && (!document.documentMode || 9 < document.documentMode);
}
function Ae() {
  pe && (pe.detachEvent("onpropertychange", Be), qe = pe = null);
}
function Be(a) {
  if ("value" === a.propertyName && te(qe)) {
    var b = [];
    ne(b, qe, a, xb(a));
    Jb(re, b);
  }
}
function Ce(a, b, c) {
  "focusin" === a ? (Ae(), pe = b, qe = c, pe.attachEvent("onpropertychange", Be)) : "focusout" === a && Ae();
}
function De(a) {
  if ("selectionchange" === a || "keyup" === a || "keydown" === a) return te(qe);
}
function Ee(a, b) {
  if ("click" === a) return te(b);
}
function Fe(a, b) {
  if ("input" === a || "change" === a) return te(b);
}
function Ge(a, b) {
  return a === b && (0 !== a || 1 / a === 1 / b) || a !== a && b !== b;
}
var He = "function" === typeof Object.is ? Object.is : Ge;
function Ie(a, b) {
  if (He(a, b)) return true;
  if ("object" !== typeof a || null === a || "object" !== typeof b || null === b) return false;
  var c = Object.keys(a), d = Object.keys(b);
  if (c.length !== d.length) return false;
  for (d = 0; d < c.length; d++) {
    var e = c[d];
    if (!ja.call(b, e) || !He(a[e], b[e])) return false;
  }
  return true;
}
function Je(a) {
  for (; a && a.firstChild; ) a = a.firstChild;
  return a;
}
function Ke(a, b) {
  var c = Je(a);
  a = 0;
  for (var d; c; ) {
    if (3 === c.nodeType) {
      d = a + c.textContent.length;
      if (a <= b && d >= b) return { node: c, offset: b - a };
      a = d;
    }
    a: {
      for (; c; ) {
        if (c.nextSibling) {
          c = c.nextSibling;
          break a;
        }
        c = c.parentNode;
      }
      c = void 0;
    }
    c = Je(c);
  }
}
function Le(a, b) {
  return a && b ? a === b ? true : a && 3 === a.nodeType ? false : b && 3 === b.nodeType ? Le(a, b.parentNode) : "contains" in a ? a.contains(b) : a.compareDocumentPosition ? !!(a.compareDocumentPosition(b) & 16) : false : false;
}
function Me() {
  for (var a = window, b = Xa(); b instanceof a.HTMLIFrameElement; ) {
    try {
      var c = "string" === typeof b.contentWindow.location.href;
    } catch (d) {
      c = false;
    }
    if (c) a = b.contentWindow;
    else break;
    b = Xa(a.document);
  }
  return b;
}
function Ne(a) {
  var b = a && a.nodeName && a.nodeName.toLowerCase();
  return b && ("input" === b && ("text" === a.type || "search" === a.type || "tel" === a.type || "url" === a.type || "password" === a.type) || "textarea" === b || "true" === a.contentEditable);
}
function Oe(a) {
  var b = Me(), c = a.focusedElem, d = a.selectionRange;
  if (b !== c && c && c.ownerDocument && Le(c.ownerDocument.documentElement, c)) {
    if (null !== d && Ne(c)) {
      if (b = d.start, a = d.end, void 0 === a && (a = b), "selectionStart" in c) c.selectionStart = b, c.selectionEnd = Math.min(a, c.value.length);
      else if (a = (b = c.ownerDocument || document) && b.defaultView || window, a.getSelection) {
        a = a.getSelection();
        var e = c.textContent.length, f2 = Math.min(d.start, e);
        d = void 0 === d.end ? f2 : Math.min(d.end, e);
        !a.extend && f2 > d && (e = d, d = f2, f2 = e);
        e = Ke(c, f2);
        var g = Ke(
          c,
          d
        );
        e && g && (1 !== a.rangeCount || a.anchorNode !== e.node || a.anchorOffset !== e.offset || a.focusNode !== g.node || a.focusOffset !== g.offset) && (b = b.createRange(), b.setStart(e.node, e.offset), a.removeAllRanges(), f2 > d ? (a.addRange(b), a.extend(g.node, g.offset)) : (b.setEnd(g.node, g.offset), a.addRange(b)));
      }
    }
    b = [];
    for (a = c; a = a.parentNode; ) 1 === a.nodeType && b.push({ element: a, left: a.scrollLeft, top: a.scrollTop });
    "function" === typeof c.focus && c.focus();
    for (c = 0; c < b.length; c++) a = b[c], a.element.scrollLeft = a.left, a.element.scrollTop = a.top;
  }
}
var Pe = ia && "documentMode" in document && 11 >= document.documentMode, Qe = null, Re = null, Se = null, Te = false;
function Ue(a, b, c) {
  var d = c.window === c ? c.document : 9 === c.nodeType ? c : c.ownerDocument;
  Te || null == Qe || Qe !== Xa(d) || (d = Qe, "selectionStart" in d && Ne(d) ? d = { start: d.selectionStart, end: d.selectionEnd } : (d = (d.ownerDocument && d.ownerDocument.defaultView || window).getSelection(), d = { anchorNode: d.anchorNode, anchorOffset: d.anchorOffset, focusNode: d.focusNode, focusOffset: d.focusOffset }), Se && Ie(Se, d) || (Se = d, d = oe(Re, "onSelect"), 0 < d.length && (b = new td("onSelect", "select", null, b, c), a.push({ event: b, listeners: d }), b.target = Qe)));
}
function Ve(a, b) {
  var c = {};
  c[a.toLowerCase()] = b.toLowerCase();
  c["Webkit" + a] = "webkit" + b;
  c["Moz" + a] = "moz" + b;
  return c;
}
var We = { animationend: Ve("Animation", "AnimationEnd"), animationiteration: Ve("Animation", "AnimationIteration"), animationstart: Ve("Animation", "AnimationStart"), transitionend: Ve("Transition", "TransitionEnd") }, Xe = {}, Ye = {};
ia && (Ye = document.createElement("div").style, "AnimationEvent" in window || (delete We.animationend.animation, delete We.animationiteration.animation, delete We.animationstart.animation), "TransitionEvent" in window || delete We.transitionend.transition);
function Ze(a) {
  if (Xe[a]) return Xe[a];
  if (!We[a]) return a;
  var b = We[a], c;
  for (c in b) if (b.hasOwnProperty(c) && c in Ye) return Xe[a] = b[c];
  return a;
}
var $e = Ze("animationend"), af = Ze("animationiteration"), bf = Ze("animationstart"), cf = Ze("transitionend"), df = /* @__PURE__ */ new Map(), ef = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function ff(a, b) {
  df.set(a, b);
  fa(b, [a]);
}
for (var gf = 0; gf < ef.length; gf++) {
  var hf = ef[gf], jf = hf.toLowerCase(), kf = hf[0].toUpperCase() + hf.slice(1);
  ff(jf, "on" + kf);
}
ff($e, "onAnimationEnd");
ff(af, "onAnimationIteration");
ff(bf, "onAnimationStart");
ff("dblclick", "onDoubleClick");
ff("focusin", "onFocus");
ff("focusout", "onBlur");
ff(cf, "onTransitionEnd");
ha("onMouseEnter", ["mouseout", "mouseover"]);
ha("onMouseLeave", ["mouseout", "mouseover"]);
ha("onPointerEnter", ["pointerout", "pointerover"]);
ha("onPointerLeave", ["pointerout", "pointerover"]);
fa("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
fa("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
fa("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
fa("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
fa("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
fa("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var lf = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), mf = new Set("cancel close invalid load scroll toggle".split(" ").concat(lf));
function nf(a, b, c) {
  var d = a.type || "unknown-event";
  a.currentTarget = c;
  Ub(d, b, void 0, a);
  a.currentTarget = null;
}
function se(a, b) {
  b = 0 !== (b & 4);
  for (var c = 0; c < a.length; c++) {
    var d = a[c], e = d.event;
    d = d.listeners;
    a: {
      var f2 = void 0;
      if (b) for (var g = d.length - 1; 0 <= g; g--) {
        var h = d[g], k2 = h.instance, l2 = h.currentTarget;
        h = h.listener;
        if (k2 !== f2 && e.isPropagationStopped()) break a;
        nf(e, h, l2);
        f2 = k2;
      }
      else for (g = 0; g < d.length; g++) {
        h = d[g];
        k2 = h.instance;
        l2 = h.currentTarget;
        h = h.listener;
        if (k2 !== f2 && e.isPropagationStopped()) break a;
        nf(e, h, l2);
        f2 = k2;
      }
    }
  }
  if (Qb) throw a = Rb, Qb = false, Rb = null, a;
}
function D(a, b) {
  var c = b[of];
  void 0 === c && (c = b[of] = /* @__PURE__ */ new Set());
  var d = a + "__bubble";
  c.has(d) || (pf(b, a, 2, false), c.add(d));
}
function qf(a, b, c) {
  var d = 0;
  b && (d |= 4);
  pf(c, a, d, b);
}
var rf = "_reactListening" + Math.random().toString(36).slice(2);
function sf(a) {
  if (!a[rf]) {
    a[rf] = true;
    da.forEach(function(b2) {
      "selectionchange" !== b2 && (mf.has(b2) || qf(b2, false, a), qf(b2, true, a));
    });
    var b = 9 === a.nodeType ? a : a.ownerDocument;
    null === b || b[rf] || (b[rf] = true, qf("selectionchange", false, b));
  }
}
function pf(a, b, c, d) {
  switch (jd(b)) {
    case 1:
      var e = ed;
      break;
    case 4:
      e = gd;
      break;
    default:
      e = fd;
  }
  c = e.bind(null, b, c, a);
  e = void 0;
  !Lb || "touchstart" !== b && "touchmove" !== b && "wheel" !== b || (e = true);
  d ? void 0 !== e ? a.addEventListener(b, c, { capture: true, passive: e }) : a.addEventListener(b, c, true) : void 0 !== e ? a.addEventListener(b, c, { passive: e }) : a.addEventListener(b, c, false);
}
function hd(a, b, c, d, e) {
  var f2 = d;
  if (0 === (b & 1) && 0 === (b & 2) && null !== d) a: for (; ; ) {
    if (null === d) return;
    var g = d.tag;
    if (3 === g || 4 === g) {
      var h = d.stateNode.containerInfo;
      if (h === e || 8 === h.nodeType && h.parentNode === e) break;
      if (4 === g) for (g = d.return; null !== g; ) {
        var k2 = g.tag;
        if (3 === k2 || 4 === k2) {
          if (k2 = g.stateNode.containerInfo, k2 === e || 8 === k2.nodeType && k2.parentNode === e) return;
        }
        g = g.return;
      }
      for (; null !== h; ) {
        g = Wc(h);
        if (null === g) return;
        k2 = g.tag;
        if (5 === k2 || 6 === k2) {
          d = f2 = g;
          continue a;
        }
        h = h.parentNode;
      }
    }
    d = d.return;
  }
  Jb(function() {
    var d2 = f2, e2 = xb(c), g2 = [];
    a: {
      var h2 = df.get(a);
      if (void 0 !== h2) {
        var k3 = td, n2 = a;
        switch (a) {
          case "keypress":
            if (0 === od(c)) break a;
          case "keydown":
          case "keyup":
            k3 = Rd;
            break;
          case "focusin":
            n2 = "focus";
            k3 = Fd;
            break;
          case "focusout":
            n2 = "blur";
            k3 = Fd;
            break;
          case "beforeblur":
          case "afterblur":
            k3 = Fd;
            break;
          case "click":
            if (2 === c.button) break a;
          case "auxclick":
          case "dblclick":
          case "mousedown":
          case "mousemove":
          case "mouseup":
          case "mouseout":
          case "mouseover":
          case "contextmenu":
            k3 = Bd;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            k3 = Dd;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            k3 = Vd;
            break;
          case $e:
          case af:
          case bf:
            k3 = Hd;
            break;
          case cf:
            k3 = Xd;
            break;
          case "scroll":
            k3 = vd;
            break;
          case "wheel":
            k3 = Zd;
            break;
          case "copy":
          case "cut":
          case "paste":
            k3 = Jd;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            k3 = Td;
        }
        var t2 = 0 !== (b & 4), J2 = !t2 && "scroll" === a, x2 = t2 ? null !== h2 ? h2 + "Capture" : null : h2;
        t2 = [];
        for (var w2 = d2, u2; null !== w2; ) {
          u2 = w2;
          var F2 = u2.stateNode;
          5 === u2.tag && null !== F2 && (u2 = F2, null !== x2 && (F2 = Kb(w2, x2), null != F2 && t2.push(tf(w2, F2, u2))));
          if (J2) break;
          w2 = w2.return;
        }
        0 < t2.length && (h2 = new k3(h2, n2, null, c, e2), g2.push({ event: h2, listeners: t2 }));
      }
    }
    if (0 === (b & 7)) {
      a: {
        h2 = "mouseover" === a || "pointerover" === a;
        k3 = "mouseout" === a || "pointerout" === a;
        if (h2 && c !== wb && (n2 = c.relatedTarget || c.fromElement) && (Wc(n2) || n2[uf])) break a;
        if (k3 || h2) {
          h2 = e2.window === e2 ? e2 : (h2 = e2.ownerDocument) ? h2.defaultView || h2.parentWindow : window;
          if (k3) {
            if (n2 = c.relatedTarget || c.toElement, k3 = d2, n2 = n2 ? Wc(n2) : null, null !== n2 && (J2 = Vb(n2), n2 !== J2 || 5 !== n2.tag && 6 !== n2.tag)) n2 = null;
          } else k3 = null, n2 = d2;
          if (k3 !== n2) {
            t2 = Bd;
            F2 = "onMouseLeave";
            x2 = "onMouseEnter";
            w2 = "mouse";
            if ("pointerout" === a || "pointerover" === a) t2 = Td, F2 = "onPointerLeave", x2 = "onPointerEnter", w2 = "pointer";
            J2 = null == k3 ? h2 : ue(k3);
            u2 = null == n2 ? h2 : ue(n2);
            h2 = new t2(F2, w2 + "leave", k3, c, e2);
            h2.target = J2;
            h2.relatedTarget = u2;
            F2 = null;
            Wc(e2) === d2 && (t2 = new t2(x2, w2 + "enter", n2, c, e2), t2.target = u2, t2.relatedTarget = J2, F2 = t2);
            J2 = F2;
            if (k3 && n2) b: {
              t2 = k3;
              x2 = n2;
              w2 = 0;
              for (u2 = t2; u2; u2 = vf(u2)) w2++;
              u2 = 0;
              for (F2 = x2; F2; F2 = vf(F2)) u2++;
              for (; 0 < w2 - u2; ) t2 = vf(t2), w2--;
              for (; 0 < u2 - w2; ) x2 = vf(x2), u2--;
              for (; w2--; ) {
                if (t2 === x2 || null !== x2 && t2 === x2.alternate) break b;
                t2 = vf(t2);
                x2 = vf(x2);
              }
              t2 = null;
            }
            else t2 = null;
            null !== k3 && wf(g2, h2, k3, t2, false);
            null !== n2 && null !== J2 && wf(g2, J2, n2, t2, true);
          }
        }
      }
      a: {
        h2 = d2 ? ue(d2) : window;
        k3 = h2.nodeName && h2.nodeName.toLowerCase();
        if ("select" === k3 || "input" === k3 && "file" === h2.type) var na = ve;
        else if (me(h2)) if (we) na = Fe;
        else {
          na = De;
          var xa = Ce;
        }
        else (k3 = h2.nodeName) && "input" === k3.toLowerCase() && ("checkbox" === h2.type || "radio" === h2.type) && (na = Ee);
        if (na && (na = na(a, d2))) {
          ne(g2, na, c, e2);
          break a;
        }
        xa && xa(a, h2, d2);
        "focusout" === a && (xa = h2._wrapperState) && xa.controlled && "number" === h2.type && cb(h2, "number", h2.value);
      }
      xa = d2 ? ue(d2) : window;
      switch (a) {
        case "focusin":
          if (me(xa) || "true" === xa.contentEditable) Qe = xa, Re = d2, Se = null;
          break;
        case "focusout":
          Se = Re = Qe = null;
          break;
        case "mousedown":
          Te = true;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          Te = false;
          Ue(g2, c, e2);
          break;
        case "selectionchange":
          if (Pe) break;
        case "keydown":
        case "keyup":
          Ue(g2, c, e2);
      }
      var $a;
      if (ae) b: {
        switch (a) {
          case "compositionstart":
            var ba = "onCompositionStart";
            break b;
          case "compositionend":
            ba = "onCompositionEnd";
            break b;
          case "compositionupdate":
            ba = "onCompositionUpdate";
            break b;
        }
        ba = void 0;
      }
      else ie ? ge(a, c) && (ba = "onCompositionEnd") : "keydown" === a && 229 === c.keyCode && (ba = "onCompositionStart");
      ba && (de && "ko" !== c.locale && (ie || "onCompositionStart" !== ba ? "onCompositionEnd" === ba && ie && ($a = nd()) : (kd = e2, ld = "value" in kd ? kd.value : kd.textContent, ie = true)), xa = oe(d2, ba), 0 < xa.length && (ba = new Ld(ba, a, null, c, e2), g2.push({ event: ba, listeners: xa }), $a ? ba.data = $a : ($a = he(c), null !== $a && (ba.data = $a))));
      if ($a = ce ? je(a, c) : ke(a, c)) d2 = oe(d2, "onBeforeInput"), 0 < d2.length && (e2 = new Ld("onBeforeInput", "beforeinput", null, c, e2), g2.push({ event: e2, listeners: d2 }), e2.data = $a);
    }
    se(g2, b);
  });
}
function tf(a, b, c) {
  return { instance: a, listener: b, currentTarget: c };
}
function oe(a, b) {
  for (var c = b + "Capture", d = []; null !== a; ) {
    var e = a, f2 = e.stateNode;
    5 === e.tag && null !== f2 && (e = f2, f2 = Kb(a, c), null != f2 && d.unshift(tf(a, f2, e)), f2 = Kb(a, b), null != f2 && d.push(tf(a, f2, e)));
    a = a.return;
  }
  return d;
}
function vf(a) {
  if (null === a) return null;
  do
    a = a.return;
  while (a && 5 !== a.tag);
  return a ? a : null;
}
function wf(a, b, c, d, e) {
  for (var f2 = b._reactName, g = []; null !== c && c !== d; ) {
    var h = c, k2 = h.alternate, l2 = h.stateNode;
    if (null !== k2 && k2 === d) break;
    5 === h.tag && null !== l2 && (h = l2, e ? (k2 = Kb(c, f2), null != k2 && g.unshift(tf(c, k2, h))) : e || (k2 = Kb(c, f2), null != k2 && g.push(tf(c, k2, h))));
    c = c.return;
  }
  0 !== g.length && a.push({ event: b, listeners: g });
}
var xf = /\r\n?/g, yf = /\u0000|\uFFFD/g;
function zf(a) {
  return ("string" === typeof a ? a : "" + a).replace(xf, "\n").replace(yf, "");
}
function Af(a, b, c) {
  b = zf(b);
  if (zf(a) !== b && c) throw Error(p(425));
}
function Bf() {
}
var Cf = null, Df = null;
function Ef(a, b) {
  return "textarea" === a || "noscript" === a || "string" === typeof b.children || "number" === typeof b.children || "object" === typeof b.dangerouslySetInnerHTML && null !== b.dangerouslySetInnerHTML && null != b.dangerouslySetInnerHTML.__html;
}
var Ff = "function" === typeof setTimeout ? setTimeout : void 0, Gf = "function" === typeof clearTimeout ? clearTimeout : void 0, Hf = "function" === typeof Promise ? Promise : void 0, Jf = "function" === typeof queueMicrotask ? queueMicrotask : "undefined" !== typeof Hf ? function(a) {
  return Hf.resolve(null).then(a).catch(If);
} : Ff;
function If(a) {
  setTimeout(function() {
    throw a;
  });
}
function Kf(a, b) {
  var c = b, d = 0;
  do {
    var e = c.nextSibling;
    a.removeChild(c);
    if (e && 8 === e.nodeType) if (c = e.data, "/$" === c) {
      if (0 === d) {
        a.removeChild(e);
        bd(b);
        return;
      }
      d--;
    } else "$" !== c && "$?" !== c && "$!" !== c || d++;
    c = e;
  } while (c);
  bd(b);
}
function Lf(a) {
  for (; null != a; a = a.nextSibling) {
    var b = a.nodeType;
    if (1 === b || 3 === b) break;
    if (8 === b) {
      b = a.data;
      if ("$" === b || "$!" === b || "$?" === b) break;
      if ("/$" === b) return null;
    }
  }
  return a;
}
function Mf(a) {
  a = a.previousSibling;
  for (var b = 0; a; ) {
    if (8 === a.nodeType) {
      var c = a.data;
      if ("$" === c || "$!" === c || "$?" === c) {
        if (0 === b) return a;
        b--;
      } else "/$" === c && b++;
    }
    a = a.previousSibling;
  }
  return null;
}
var Nf = Math.random().toString(36).slice(2), Of = "__reactFiber$" + Nf, Pf = "__reactProps$" + Nf, uf = "__reactContainer$" + Nf, of = "__reactEvents$" + Nf, Qf = "__reactListeners$" + Nf, Rf = "__reactHandles$" + Nf;
function Wc(a) {
  var b = a[Of];
  if (b) return b;
  for (var c = a.parentNode; c; ) {
    if (b = c[uf] || c[Of]) {
      c = b.alternate;
      if (null !== b.child || null !== c && null !== c.child) for (a = Mf(a); null !== a; ) {
        if (c = a[Of]) return c;
        a = Mf(a);
      }
      return b;
    }
    a = c;
    c = a.parentNode;
  }
  return null;
}
function Cb(a) {
  a = a[Of] || a[uf];
  return !a || 5 !== a.tag && 6 !== a.tag && 13 !== a.tag && 3 !== a.tag ? null : a;
}
function ue(a) {
  if (5 === a.tag || 6 === a.tag) return a.stateNode;
  throw Error(p(33));
}
function Db(a) {
  return a[Pf] || null;
}
var Sf = [], Tf = -1;
function Uf(a) {
  return { current: a };
}
function E(a) {
  0 > Tf || (a.current = Sf[Tf], Sf[Tf] = null, Tf--);
}
function G(a, b) {
  Tf++;
  Sf[Tf] = a.current;
  a.current = b;
}
var Vf = {}, H = Uf(Vf), Wf = Uf(false), Xf = Vf;
function Yf(a, b) {
  var c = a.type.contextTypes;
  if (!c) return Vf;
  var d = a.stateNode;
  if (d && d.__reactInternalMemoizedUnmaskedChildContext === b) return d.__reactInternalMemoizedMaskedChildContext;
  var e = {}, f2;
  for (f2 in c) e[f2] = b[f2];
  d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = b, a.__reactInternalMemoizedMaskedChildContext = e);
  return e;
}
function Zf(a) {
  a = a.childContextTypes;
  return null !== a && void 0 !== a;
}
function $f() {
  E(Wf);
  E(H);
}
function ag(a, b, c) {
  if (H.current !== Vf) throw Error(p(168));
  G(H, b);
  G(Wf, c);
}
function bg(a, b, c) {
  var d = a.stateNode;
  b = b.childContextTypes;
  if ("function" !== typeof d.getChildContext) return c;
  d = d.getChildContext();
  for (var e in d) if (!(e in b)) throw Error(p(108, Ra(a) || "Unknown", e));
  return A({}, c, d);
}
function cg(a) {
  a = (a = a.stateNode) && a.__reactInternalMemoizedMergedChildContext || Vf;
  Xf = H.current;
  G(H, a);
  G(Wf, Wf.current);
  return true;
}
function dg(a, b, c) {
  var d = a.stateNode;
  if (!d) throw Error(p(169));
  c ? (a = bg(a, b, Xf), d.__reactInternalMemoizedMergedChildContext = a, E(Wf), E(H), G(H, a)) : E(Wf);
  G(Wf, c);
}
var eg = null, fg = false, gg = false;
function hg(a) {
  null === eg ? eg = [a] : eg.push(a);
}
function ig(a) {
  fg = true;
  hg(a);
}
function jg() {
  if (!gg && null !== eg) {
    gg = true;
    var a = 0, b = C;
    try {
      var c = eg;
      for (C = 1; a < c.length; a++) {
        var d = c[a];
        do
          d = d(true);
        while (null !== d);
      }
      eg = null;
      fg = false;
    } catch (e) {
      throw null !== eg && (eg = eg.slice(a + 1)), ac(fc, jg), e;
    } finally {
      C = b, gg = false;
    }
  }
  return null;
}
var kg = [], lg = 0, mg = null, ng = 0, og = [], pg = 0, qg = null, rg = 1, sg = "";
function tg(a, b) {
  kg[lg++] = ng;
  kg[lg++] = mg;
  mg = a;
  ng = b;
}
function ug(a, b, c) {
  og[pg++] = rg;
  og[pg++] = sg;
  og[pg++] = qg;
  qg = a;
  var d = rg;
  a = sg;
  var e = 32 - oc(d) - 1;
  d &= ~(1 << e);
  c += 1;
  var f2 = 32 - oc(b) + e;
  if (30 < f2) {
    var g = e - e % 5;
    f2 = (d & (1 << g) - 1).toString(32);
    d >>= g;
    e -= g;
    rg = 1 << 32 - oc(b) + e | c << e | d;
    sg = f2 + a;
  } else rg = 1 << f2 | c << e | d, sg = a;
}
function vg(a) {
  null !== a.return && (tg(a, 1), ug(a, 1, 0));
}
function wg(a) {
  for (; a === mg; ) mg = kg[--lg], kg[lg] = null, ng = kg[--lg], kg[lg] = null;
  for (; a === qg; ) qg = og[--pg], og[pg] = null, sg = og[--pg], og[pg] = null, rg = og[--pg], og[pg] = null;
}
var xg = null, yg = null, I = false, zg = null;
function Ag(a, b) {
  var c = Bg(5, null, null, 0);
  c.elementType = "DELETED";
  c.stateNode = b;
  c.return = a;
  b = a.deletions;
  null === b ? (a.deletions = [c], a.flags |= 16) : b.push(c);
}
function Cg(a, b) {
  switch (a.tag) {
    case 5:
      var c = a.type;
      b = 1 !== b.nodeType || c.toLowerCase() !== b.nodeName.toLowerCase() ? null : b;
      return null !== b ? (a.stateNode = b, xg = a, yg = Lf(b.firstChild), true) : false;
    case 6:
      return b = "" === a.pendingProps || 3 !== b.nodeType ? null : b, null !== b ? (a.stateNode = b, xg = a, yg = null, true) : false;
    case 13:
      return b = 8 !== b.nodeType ? null : b, null !== b ? (c = null !== qg ? { id: rg, overflow: sg } : null, a.memoizedState = { dehydrated: b, treeContext: c, retryLane: 1073741824 }, c = Bg(18, null, null, 0), c.stateNode = b, c.return = a, a.child = c, xg = a, yg = null, true) : false;
    default:
      return false;
  }
}
function Dg(a) {
  return 0 !== (a.mode & 1) && 0 === (a.flags & 128);
}
function Eg(a) {
  if (I) {
    var b = yg;
    if (b) {
      var c = b;
      if (!Cg(a, b)) {
        if (Dg(a)) throw Error(p(418));
        b = Lf(c.nextSibling);
        var d = xg;
        b && Cg(a, b) ? Ag(d, c) : (a.flags = a.flags & -4097 | 2, I = false, xg = a);
      }
    } else {
      if (Dg(a)) throw Error(p(418));
      a.flags = a.flags & -4097 | 2;
      I = false;
      xg = a;
    }
  }
}
function Fg(a) {
  for (a = a.return; null !== a && 5 !== a.tag && 3 !== a.tag && 13 !== a.tag; ) a = a.return;
  xg = a;
}
function Gg(a) {
  if (a !== xg) return false;
  if (!I) return Fg(a), I = true, false;
  var b;
  (b = 3 !== a.tag) && !(b = 5 !== a.tag) && (b = a.type, b = "head" !== b && "body" !== b && !Ef(a.type, a.memoizedProps));
  if (b && (b = yg)) {
    if (Dg(a)) throw Hg(), Error(p(418));
    for (; b; ) Ag(a, b), b = Lf(b.nextSibling);
  }
  Fg(a);
  if (13 === a.tag) {
    a = a.memoizedState;
    a = null !== a ? a.dehydrated : null;
    if (!a) throw Error(p(317));
    a: {
      a = a.nextSibling;
      for (b = 0; a; ) {
        if (8 === a.nodeType) {
          var c = a.data;
          if ("/$" === c) {
            if (0 === b) {
              yg = Lf(a.nextSibling);
              break a;
            }
            b--;
          } else "$" !== c && "$!" !== c && "$?" !== c || b++;
        }
        a = a.nextSibling;
      }
      yg = null;
    }
  } else yg = xg ? Lf(a.stateNode.nextSibling) : null;
  return true;
}
function Hg() {
  for (var a = yg; a; ) a = Lf(a.nextSibling);
}
function Ig() {
  yg = xg = null;
  I = false;
}
function Jg(a) {
  null === zg ? zg = [a] : zg.push(a);
}
var Kg = ua.ReactCurrentBatchConfig;
function Lg(a, b, c) {
  a = c.ref;
  if (null !== a && "function" !== typeof a && "object" !== typeof a) {
    if (c._owner) {
      c = c._owner;
      if (c) {
        if (1 !== c.tag) throw Error(p(309));
        var d = c.stateNode;
      }
      if (!d) throw Error(p(147, a));
      var e = d, f2 = "" + a;
      if (null !== b && null !== b.ref && "function" === typeof b.ref && b.ref._stringRef === f2) return b.ref;
      b = function(a2) {
        var b2 = e.refs;
        null === a2 ? delete b2[f2] : b2[f2] = a2;
      };
      b._stringRef = f2;
      return b;
    }
    if ("string" !== typeof a) throw Error(p(284));
    if (!c._owner) throw Error(p(290, a));
  }
  return a;
}
function Mg(a, b) {
  a = Object.prototype.toString.call(b);
  throw Error(p(31, "[object Object]" === a ? "object with keys {" + Object.keys(b).join(", ") + "}" : a));
}
function Ng(a) {
  var b = a._init;
  return b(a._payload);
}
function Og(a) {
  function b(b2, c2) {
    if (a) {
      var d2 = b2.deletions;
      null === d2 ? (b2.deletions = [c2], b2.flags |= 16) : d2.push(c2);
    }
  }
  function c(c2, d2) {
    if (!a) return null;
    for (; null !== d2; ) b(c2, d2), d2 = d2.sibling;
    return null;
  }
  function d(a2, b2) {
    for (a2 = /* @__PURE__ */ new Map(); null !== b2; ) null !== b2.key ? a2.set(b2.key, b2) : a2.set(b2.index, b2), b2 = b2.sibling;
    return a2;
  }
  function e(a2, b2) {
    a2 = Pg(a2, b2);
    a2.index = 0;
    a2.sibling = null;
    return a2;
  }
  function f2(b2, c2, d2) {
    b2.index = d2;
    if (!a) return b2.flags |= 1048576, c2;
    d2 = b2.alternate;
    if (null !== d2) return d2 = d2.index, d2 < c2 ? (b2.flags |= 2, c2) : d2;
    b2.flags |= 2;
    return c2;
  }
  function g(b2) {
    a && null === b2.alternate && (b2.flags |= 2);
    return b2;
  }
  function h(a2, b2, c2, d2) {
    if (null === b2 || 6 !== b2.tag) return b2 = Qg(c2, a2.mode, d2), b2.return = a2, b2;
    b2 = e(b2, c2);
    b2.return = a2;
    return b2;
  }
  function k2(a2, b2, c2, d2) {
    var f3 = c2.type;
    if (f3 === ya) return m2(a2, b2, c2.props.children, d2, c2.key);
    if (null !== b2 && (b2.elementType === f3 || "object" === typeof f3 && null !== f3 && f3.$$typeof === Ha && Ng(f3) === b2.type)) return d2 = e(b2, c2.props), d2.ref = Lg(a2, b2, c2), d2.return = a2, d2;
    d2 = Rg(c2.type, c2.key, c2.props, null, a2.mode, d2);
    d2.ref = Lg(a2, b2, c2);
    d2.return = a2;
    return d2;
  }
  function l2(a2, b2, c2, d2) {
    if (null === b2 || 4 !== b2.tag || b2.stateNode.containerInfo !== c2.containerInfo || b2.stateNode.implementation !== c2.implementation) return b2 = Sg(c2, a2.mode, d2), b2.return = a2, b2;
    b2 = e(b2, c2.children || []);
    b2.return = a2;
    return b2;
  }
  function m2(a2, b2, c2, d2, f3) {
    if (null === b2 || 7 !== b2.tag) return b2 = Tg(c2, a2.mode, d2, f3), b2.return = a2, b2;
    b2 = e(b2, c2);
    b2.return = a2;
    return b2;
  }
  function q2(a2, b2, c2) {
    if ("string" === typeof b2 && "" !== b2 || "number" === typeof b2) return b2 = Qg("" + b2, a2.mode, c2), b2.return = a2, b2;
    if ("object" === typeof b2 && null !== b2) {
      switch (b2.$$typeof) {
        case va:
          return c2 = Rg(b2.type, b2.key, b2.props, null, a2.mode, c2), c2.ref = Lg(a2, null, b2), c2.return = a2, c2;
        case wa:
          return b2 = Sg(b2, a2.mode, c2), b2.return = a2, b2;
        case Ha:
          var d2 = b2._init;
          return q2(a2, d2(b2._payload), c2);
      }
      if (eb(b2) || Ka(b2)) return b2 = Tg(b2, a2.mode, c2, null), b2.return = a2, b2;
      Mg(a2, b2);
    }
    return null;
  }
  function r2(a2, b2, c2, d2) {
    var e2 = null !== b2 ? b2.key : null;
    if ("string" === typeof c2 && "" !== c2 || "number" === typeof c2) return null !== e2 ? null : h(a2, b2, "" + c2, d2);
    if ("object" === typeof c2 && null !== c2) {
      switch (c2.$$typeof) {
        case va:
          return c2.key === e2 ? k2(a2, b2, c2, d2) : null;
        case wa:
          return c2.key === e2 ? l2(a2, b2, c2, d2) : null;
        case Ha:
          return e2 = c2._init, r2(
            a2,
            b2,
            e2(c2._payload),
            d2
          );
      }
      if (eb(c2) || Ka(c2)) return null !== e2 ? null : m2(a2, b2, c2, d2, null);
      Mg(a2, c2);
    }
    return null;
  }
  function y2(a2, b2, c2, d2, e2) {
    if ("string" === typeof d2 && "" !== d2 || "number" === typeof d2) return a2 = a2.get(c2) || null, h(b2, a2, "" + d2, e2);
    if ("object" === typeof d2 && null !== d2) {
      switch (d2.$$typeof) {
        case va:
          return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, k2(b2, a2, d2, e2);
        case wa:
          return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, l2(b2, a2, d2, e2);
        case Ha:
          var f3 = d2._init;
          return y2(a2, b2, c2, f3(d2._payload), e2);
      }
      if (eb(d2) || Ka(d2)) return a2 = a2.get(c2) || null, m2(b2, a2, d2, e2, null);
      Mg(b2, d2);
    }
    return null;
  }
  function n2(e2, g2, h2, k3) {
    for (var l3 = null, m3 = null, u2 = g2, w2 = g2 = 0, x2 = null; null !== u2 && w2 < h2.length; w2++) {
      u2.index > w2 ? (x2 = u2, u2 = null) : x2 = u2.sibling;
      var n3 = r2(e2, u2, h2[w2], k3);
      if (null === n3) {
        null === u2 && (u2 = x2);
        break;
      }
      a && u2 && null === n3.alternate && b(e2, u2);
      g2 = f2(n3, g2, w2);
      null === m3 ? l3 = n3 : m3.sibling = n3;
      m3 = n3;
      u2 = x2;
    }
    if (w2 === h2.length) return c(e2, u2), I && tg(e2, w2), l3;
    if (null === u2) {
      for (; w2 < h2.length; w2++) u2 = q2(e2, h2[w2], k3), null !== u2 && (g2 = f2(u2, g2, w2), null === m3 ? l3 = u2 : m3.sibling = u2, m3 = u2);
      I && tg(e2, w2);
      return l3;
    }
    for (u2 = d(e2, u2); w2 < h2.length; w2++) x2 = y2(u2, e2, w2, h2[w2], k3), null !== x2 && (a && null !== x2.alternate && u2.delete(null === x2.key ? w2 : x2.key), g2 = f2(x2, g2, w2), null === m3 ? l3 = x2 : m3.sibling = x2, m3 = x2);
    a && u2.forEach(function(a2) {
      return b(e2, a2);
    });
    I && tg(e2, w2);
    return l3;
  }
  function t2(e2, g2, h2, k3) {
    var l3 = Ka(h2);
    if ("function" !== typeof l3) throw Error(p(150));
    h2 = l3.call(h2);
    if (null == h2) throw Error(p(151));
    for (var u2 = l3 = null, m3 = g2, w2 = g2 = 0, x2 = null, n3 = h2.next(); null !== m3 && !n3.done; w2++, n3 = h2.next()) {
      m3.index > w2 ? (x2 = m3, m3 = null) : x2 = m3.sibling;
      var t3 = r2(e2, m3, n3.value, k3);
      if (null === t3) {
        null === m3 && (m3 = x2);
        break;
      }
      a && m3 && null === t3.alternate && b(e2, m3);
      g2 = f2(t3, g2, w2);
      null === u2 ? l3 = t3 : u2.sibling = t3;
      u2 = t3;
      m3 = x2;
    }
    if (n3.done) return c(
      e2,
      m3
    ), I && tg(e2, w2), l3;
    if (null === m3) {
      for (; !n3.done; w2++, n3 = h2.next()) n3 = q2(e2, n3.value, k3), null !== n3 && (g2 = f2(n3, g2, w2), null === u2 ? l3 = n3 : u2.sibling = n3, u2 = n3);
      I && tg(e2, w2);
      return l3;
    }
    for (m3 = d(e2, m3); !n3.done; w2++, n3 = h2.next()) n3 = y2(m3, e2, w2, n3.value, k3), null !== n3 && (a && null !== n3.alternate && m3.delete(null === n3.key ? w2 : n3.key), g2 = f2(n3, g2, w2), null === u2 ? l3 = n3 : u2.sibling = n3, u2 = n3);
    a && m3.forEach(function(a2) {
      return b(e2, a2);
    });
    I && tg(e2, w2);
    return l3;
  }
  function J2(a2, d2, f3, h2) {
    "object" === typeof f3 && null !== f3 && f3.type === ya && null === f3.key && (f3 = f3.props.children);
    if ("object" === typeof f3 && null !== f3) {
      switch (f3.$$typeof) {
        case va:
          a: {
            for (var k3 = f3.key, l3 = d2; null !== l3; ) {
              if (l3.key === k3) {
                k3 = f3.type;
                if (k3 === ya) {
                  if (7 === l3.tag) {
                    c(a2, l3.sibling);
                    d2 = e(l3, f3.props.children);
                    d2.return = a2;
                    a2 = d2;
                    break a;
                  }
                } else if (l3.elementType === k3 || "object" === typeof k3 && null !== k3 && k3.$$typeof === Ha && Ng(k3) === l3.type) {
                  c(a2, l3.sibling);
                  d2 = e(l3, f3.props);
                  d2.ref = Lg(a2, l3, f3);
                  d2.return = a2;
                  a2 = d2;
                  break a;
                }
                c(a2, l3);
                break;
              } else b(a2, l3);
              l3 = l3.sibling;
            }
            f3.type === ya ? (d2 = Tg(f3.props.children, a2.mode, h2, f3.key), d2.return = a2, a2 = d2) : (h2 = Rg(f3.type, f3.key, f3.props, null, a2.mode, h2), h2.ref = Lg(a2, d2, f3), h2.return = a2, a2 = h2);
          }
          return g(a2);
        case wa:
          a: {
            for (l3 = f3.key; null !== d2; ) {
              if (d2.key === l3) if (4 === d2.tag && d2.stateNode.containerInfo === f3.containerInfo && d2.stateNode.implementation === f3.implementation) {
                c(a2, d2.sibling);
                d2 = e(d2, f3.children || []);
                d2.return = a2;
                a2 = d2;
                break a;
              } else {
                c(a2, d2);
                break;
              }
              else b(a2, d2);
              d2 = d2.sibling;
            }
            d2 = Sg(f3, a2.mode, h2);
            d2.return = a2;
            a2 = d2;
          }
          return g(a2);
        case Ha:
          return l3 = f3._init, J2(a2, d2, l3(f3._payload), h2);
      }
      if (eb(f3)) return n2(a2, d2, f3, h2);
      if (Ka(f3)) return t2(a2, d2, f3, h2);
      Mg(a2, f3);
    }
    return "string" === typeof f3 && "" !== f3 || "number" === typeof f3 ? (f3 = "" + f3, null !== d2 && 6 === d2.tag ? (c(a2, d2.sibling), d2 = e(d2, f3), d2.return = a2, a2 = d2) : (c(a2, d2), d2 = Qg(f3, a2.mode, h2), d2.return = a2, a2 = d2), g(a2)) : c(a2, d2);
  }
  return J2;
}
var Ug = Og(true), Vg = Og(false), Wg = Uf(null), Xg = null, Yg = null, Zg = null;
function $g() {
  Zg = Yg = Xg = null;
}
function ah(a) {
  var b = Wg.current;
  E(Wg);
  a._currentValue = b;
}
function bh(a, b, c) {
  for (; null !== a; ) {
    var d = a.alternate;
    (a.childLanes & b) !== b ? (a.childLanes |= b, null !== d && (d.childLanes |= b)) : null !== d && (d.childLanes & b) !== b && (d.childLanes |= b);
    if (a === c) break;
    a = a.return;
  }
}
function ch(a, b) {
  Xg = a;
  Zg = Yg = null;
  a = a.dependencies;
  null !== a && null !== a.firstContext && (0 !== (a.lanes & b) && (dh = true), a.firstContext = null);
}
function eh(a) {
  var b = a._currentValue;
  if (Zg !== a) if (a = { context: a, memoizedValue: b, next: null }, null === Yg) {
    if (null === Xg) throw Error(p(308));
    Yg = a;
    Xg.dependencies = { lanes: 0, firstContext: a };
  } else Yg = Yg.next = a;
  return b;
}
var fh = null;
function gh(a) {
  null === fh ? fh = [a] : fh.push(a);
}
function hh(a, b, c, d) {
  var e = b.interleaved;
  null === e ? (c.next = c, gh(b)) : (c.next = e.next, e.next = c);
  b.interleaved = c;
  return ih(a, d);
}
function ih(a, b) {
  a.lanes |= b;
  var c = a.alternate;
  null !== c && (c.lanes |= b);
  c = a;
  for (a = a.return; null !== a; ) a.childLanes |= b, c = a.alternate, null !== c && (c.childLanes |= b), c = a, a = a.return;
  return 3 === c.tag ? c.stateNode : null;
}
var jh = false;
function kh(a) {
  a.updateQueue = { baseState: a.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
}
function lh(a, b) {
  a = a.updateQueue;
  b.updateQueue === a && (b.updateQueue = { baseState: a.baseState, firstBaseUpdate: a.firstBaseUpdate, lastBaseUpdate: a.lastBaseUpdate, shared: a.shared, effects: a.effects });
}
function mh(a, b) {
  return { eventTime: a, lane: b, tag: 0, payload: null, callback: null, next: null };
}
function nh(a, b, c) {
  var d = a.updateQueue;
  if (null === d) return null;
  d = d.shared;
  if (0 !== (K & 2)) {
    var e = d.pending;
    null === e ? b.next = b : (b.next = e.next, e.next = b);
    d.pending = b;
    return ih(a, c);
  }
  e = d.interleaved;
  null === e ? (b.next = b, gh(d)) : (b.next = e.next, e.next = b);
  d.interleaved = b;
  return ih(a, c);
}
function oh(a, b, c) {
  b = b.updateQueue;
  if (null !== b && (b = b.shared, 0 !== (c & 4194240))) {
    var d = b.lanes;
    d &= a.pendingLanes;
    c |= d;
    b.lanes = c;
    Cc(a, c);
  }
}
function ph(a, b) {
  var c = a.updateQueue, d = a.alternate;
  if (null !== d && (d = d.updateQueue, c === d)) {
    var e = null, f2 = null;
    c = c.firstBaseUpdate;
    if (null !== c) {
      do {
        var g = { eventTime: c.eventTime, lane: c.lane, tag: c.tag, payload: c.payload, callback: c.callback, next: null };
        null === f2 ? e = f2 = g : f2 = f2.next = g;
        c = c.next;
      } while (null !== c);
      null === f2 ? e = f2 = b : f2 = f2.next = b;
    } else e = f2 = b;
    c = { baseState: d.baseState, firstBaseUpdate: e, lastBaseUpdate: f2, shared: d.shared, effects: d.effects };
    a.updateQueue = c;
    return;
  }
  a = c.lastBaseUpdate;
  null === a ? c.firstBaseUpdate = b : a.next = b;
  c.lastBaseUpdate = b;
}
function qh(a, b, c, d) {
  var e = a.updateQueue;
  jh = false;
  var f2 = e.firstBaseUpdate, g = e.lastBaseUpdate, h = e.shared.pending;
  if (null !== h) {
    e.shared.pending = null;
    var k2 = h, l2 = k2.next;
    k2.next = null;
    null === g ? f2 = l2 : g.next = l2;
    g = k2;
    var m2 = a.alternate;
    null !== m2 && (m2 = m2.updateQueue, h = m2.lastBaseUpdate, h !== g && (null === h ? m2.firstBaseUpdate = l2 : h.next = l2, m2.lastBaseUpdate = k2));
  }
  if (null !== f2) {
    var q2 = e.baseState;
    g = 0;
    m2 = l2 = k2 = null;
    h = f2;
    do {
      var r2 = h.lane, y2 = h.eventTime;
      if ((d & r2) === r2) {
        null !== m2 && (m2 = m2.next = {
          eventTime: y2,
          lane: 0,
          tag: h.tag,
          payload: h.payload,
          callback: h.callback,
          next: null
        });
        a: {
          var n2 = a, t2 = h;
          r2 = b;
          y2 = c;
          switch (t2.tag) {
            case 1:
              n2 = t2.payload;
              if ("function" === typeof n2) {
                q2 = n2.call(y2, q2, r2);
                break a;
              }
              q2 = n2;
              break a;
            case 3:
              n2.flags = n2.flags & -65537 | 128;
            case 0:
              n2 = t2.payload;
              r2 = "function" === typeof n2 ? n2.call(y2, q2, r2) : n2;
              if (null === r2 || void 0 === r2) break a;
              q2 = A({}, q2, r2);
              break a;
            case 2:
              jh = true;
          }
        }
        null !== h.callback && 0 !== h.lane && (a.flags |= 64, r2 = e.effects, null === r2 ? e.effects = [h] : r2.push(h));
      } else y2 = { eventTime: y2, lane: r2, tag: h.tag, payload: h.payload, callback: h.callback, next: null }, null === m2 ? (l2 = m2 = y2, k2 = q2) : m2 = m2.next = y2, g |= r2;
      h = h.next;
      if (null === h) if (h = e.shared.pending, null === h) break;
      else r2 = h, h = r2.next, r2.next = null, e.lastBaseUpdate = r2, e.shared.pending = null;
    } while (1);
    null === m2 && (k2 = q2);
    e.baseState = k2;
    e.firstBaseUpdate = l2;
    e.lastBaseUpdate = m2;
    b = e.shared.interleaved;
    if (null !== b) {
      e = b;
      do
        g |= e.lane, e = e.next;
      while (e !== b);
    } else null === f2 && (e.shared.lanes = 0);
    rh |= g;
    a.lanes = g;
    a.memoizedState = q2;
  }
}
function sh(a, b, c) {
  a = b.effects;
  b.effects = null;
  if (null !== a) for (b = 0; b < a.length; b++) {
    var d = a[b], e = d.callback;
    if (null !== e) {
      d.callback = null;
      d = c;
      if ("function" !== typeof e) throw Error(p(191, e));
      e.call(d);
    }
  }
}
var th = {}, uh = Uf(th), vh = Uf(th), wh = Uf(th);
function xh(a) {
  if (a === th) throw Error(p(174));
  return a;
}
function yh(a, b) {
  G(wh, b);
  G(vh, a);
  G(uh, th);
  a = b.nodeType;
  switch (a) {
    case 9:
    case 11:
      b = (b = b.documentElement) ? b.namespaceURI : lb(null, "");
      break;
    default:
      a = 8 === a ? b.parentNode : b, b = a.namespaceURI || null, a = a.tagName, b = lb(b, a);
  }
  E(uh);
  G(uh, b);
}
function zh() {
  E(uh);
  E(vh);
  E(wh);
}
function Ah(a) {
  xh(wh.current);
  var b = xh(uh.current);
  var c = lb(b, a.type);
  b !== c && (G(vh, a), G(uh, c));
}
function Bh(a) {
  vh.current === a && (E(uh), E(vh));
}
var L = Uf(0);
function Ch(a) {
  for (var b = a; null !== b; ) {
    if (13 === b.tag) {
      var c = b.memoizedState;
      if (null !== c && (c = c.dehydrated, null === c || "$?" === c.data || "$!" === c.data)) return b;
    } else if (19 === b.tag && void 0 !== b.memoizedProps.revealOrder) {
      if (0 !== (b.flags & 128)) return b;
    } else if (null !== b.child) {
      b.child.return = b;
      b = b.child;
      continue;
    }
    if (b === a) break;
    for (; null === b.sibling; ) {
      if (null === b.return || b.return === a) return null;
      b = b.return;
    }
    b.sibling.return = b.return;
    b = b.sibling;
  }
  return null;
}
var Dh = [];
function Eh() {
  for (var a = 0; a < Dh.length; a++) Dh[a]._workInProgressVersionPrimary = null;
  Dh.length = 0;
}
var Fh = ua.ReactCurrentDispatcher, Gh = ua.ReactCurrentBatchConfig, Hh = 0, M = null, N = null, O = null, Ih = false, Jh = false, Kh = 0, Lh = 0;
function P() {
  throw Error(p(321));
}
function Mh(a, b) {
  if (null === b) return false;
  for (var c = 0; c < b.length && c < a.length; c++) if (!He(a[c], b[c])) return false;
  return true;
}
function Nh(a, b, c, d, e, f2) {
  Hh = f2;
  M = b;
  b.memoizedState = null;
  b.updateQueue = null;
  b.lanes = 0;
  Fh.current = null === a || null === a.memoizedState ? Oh : Ph;
  a = c(d, e);
  if (Jh) {
    f2 = 0;
    do {
      Jh = false;
      Kh = 0;
      if (25 <= f2) throw Error(p(301));
      f2 += 1;
      O = N = null;
      b.updateQueue = null;
      Fh.current = Qh;
      a = c(d, e);
    } while (Jh);
  }
  Fh.current = Rh;
  b = null !== N && null !== N.next;
  Hh = 0;
  O = N = M = null;
  Ih = false;
  if (b) throw Error(p(300));
  return a;
}
function Sh() {
  var a = 0 !== Kh;
  Kh = 0;
  return a;
}
function Th() {
  var a = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  null === O ? M.memoizedState = O = a : O = O.next = a;
  return O;
}
function Uh() {
  if (null === N) {
    var a = M.alternate;
    a = null !== a ? a.memoizedState : null;
  } else a = N.next;
  var b = null === O ? M.memoizedState : O.next;
  if (null !== b) O = b, N = a;
  else {
    if (null === a) throw Error(p(310));
    N = a;
    a = { memoizedState: N.memoizedState, baseState: N.baseState, baseQueue: N.baseQueue, queue: N.queue, next: null };
    null === O ? M.memoizedState = O = a : O = O.next = a;
  }
  return O;
}
function Vh(a, b) {
  return "function" === typeof b ? b(a) : b;
}
function Wh(a) {
  var b = Uh(), c = b.queue;
  if (null === c) throw Error(p(311));
  c.lastRenderedReducer = a;
  var d = N, e = d.baseQueue, f2 = c.pending;
  if (null !== f2) {
    if (null !== e) {
      var g = e.next;
      e.next = f2.next;
      f2.next = g;
    }
    d.baseQueue = e = f2;
    c.pending = null;
  }
  if (null !== e) {
    f2 = e.next;
    d = d.baseState;
    var h = g = null, k2 = null, l2 = f2;
    do {
      var m2 = l2.lane;
      if ((Hh & m2) === m2) null !== k2 && (k2 = k2.next = { lane: 0, action: l2.action, hasEagerState: l2.hasEagerState, eagerState: l2.eagerState, next: null }), d = l2.hasEagerState ? l2.eagerState : a(d, l2.action);
      else {
        var q2 = {
          lane: m2,
          action: l2.action,
          hasEagerState: l2.hasEagerState,
          eagerState: l2.eagerState,
          next: null
        };
        null === k2 ? (h = k2 = q2, g = d) : k2 = k2.next = q2;
        M.lanes |= m2;
        rh |= m2;
      }
      l2 = l2.next;
    } while (null !== l2 && l2 !== f2);
    null === k2 ? g = d : k2.next = h;
    He(d, b.memoizedState) || (dh = true);
    b.memoizedState = d;
    b.baseState = g;
    b.baseQueue = k2;
    c.lastRenderedState = d;
  }
  a = c.interleaved;
  if (null !== a) {
    e = a;
    do
      f2 = e.lane, M.lanes |= f2, rh |= f2, e = e.next;
    while (e !== a);
  } else null === e && (c.lanes = 0);
  return [b.memoizedState, c.dispatch];
}
function Xh(a) {
  var b = Uh(), c = b.queue;
  if (null === c) throw Error(p(311));
  c.lastRenderedReducer = a;
  var d = c.dispatch, e = c.pending, f2 = b.memoizedState;
  if (null !== e) {
    c.pending = null;
    var g = e = e.next;
    do
      f2 = a(f2, g.action), g = g.next;
    while (g !== e);
    He(f2, b.memoizedState) || (dh = true);
    b.memoizedState = f2;
    null === b.baseQueue && (b.baseState = f2);
    c.lastRenderedState = f2;
  }
  return [f2, d];
}
function Yh() {
}
function Zh(a, b) {
  var c = M, d = Uh(), e = b(), f2 = !He(d.memoizedState, e);
  f2 && (d.memoizedState = e, dh = true);
  d = d.queue;
  $h(ai.bind(null, c, d, a), [a]);
  if (d.getSnapshot !== b || f2 || null !== O && O.memoizedState.tag & 1) {
    c.flags |= 2048;
    bi(9, ci.bind(null, c, d, e, b), void 0, null);
    if (null === Q) throw Error(p(349));
    0 !== (Hh & 30) || di(c, b, e);
  }
  return e;
}
function di(a, b, c) {
  a.flags |= 16384;
  a = { getSnapshot: b, value: c };
  b = M.updateQueue;
  null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.stores = [a]) : (c = b.stores, null === c ? b.stores = [a] : c.push(a));
}
function ci(a, b, c, d) {
  b.value = c;
  b.getSnapshot = d;
  ei(b) && fi(a);
}
function ai(a, b, c) {
  return c(function() {
    ei(b) && fi(a);
  });
}
function ei(a) {
  var b = a.getSnapshot;
  a = a.value;
  try {
    var c = b();
    return !He(a, c);
  } catch (d) {
    return true;
  }
}
function fi(a) {
  var b = ih(a, 1);
  null !== b && gi(b, a, 1, -1);
}
function hi(a) {
  var b = Th();
  "function" === typeof a && (a = a());
  b.memoizedState = b.baseState = a;
  a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Vh, lastRenderedState: a };
  b.queue = a;
  a = a.dispatch = ii.bind(null, M, a);
  return [b.memoizedState, a];
}
function bi(a, b, c, d) {
  a = { tag: a, create: b, destroy: c, deps: d, next: null };
  b = M.updateQueue;
  null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.lastEffect = a.next = a) : (c = b.lastEffect, null === c ? b.lastEffect = a.next = a : (d = c.next, c.next = a, a.next = d, b.lastEffect = a));
  return a;
}
function ji() {
  return Uh().memoizedState;
}
function ki(a, b, c, d) {
  var e = Th();
  M.flags |= a;
  e.memoizedState = bi(1 | b, c, void 0, void 0 === d ? null : d);
}
function li(a, b, c, d) {
  var e = Uh();
  d = void 0 === d ? null : d;
  var f2 = void 0;
  if (null !== N) {
    var g = N.memoizedState;
    f2 = g.destroy;
    if (null !== d && Mh(d, g.deps)) {
      e.memoizedState = bi(b, c, f2, d);
      return;
    }
  }
  M.flags |= a;
  e.memoizedState = bi(1 | b, c, f2, d);
}
function mi(a, b) {
  return ki(8390656, 8, a, b);
}
function $h(a, b) {
  return li(2048, 8, a, b);
}
function ni(a, b) {
  return li(4, 2, a, b);
}
function oi(a, b) {
  return li(4, 4, a, b);
}
function pi(a, b) {
  if ("function" === typeof b) return a = a(), b(a), function() {
    b(null);
  };
  if (null !== b && void 0 !== b) return a = a(), b.current = a, function() {
    b.current = null;
  };
}
function qi(a, b, c) {
  c = null !== c && void 0 !== c ? c.concat([a]) : null;
  return li(4, 4, pi.bind(null, b, a), c);
}
function ri() {
}
function si(a, b) {
  var c = Uh();
  b = void 0 === b ? null : b;
  var d = c.memoizedState;
  if (null !== d && null !== b && Mh(b, d[1])) return d[0];
  c.memoizedState = [a, b];
  return a;
}
function ti(a, b) {
  var c = Uh();
  b = void 0 === b ? null : b;
  var d = c.memoizedState;
  if (null !== d && null !== b && Mh(b, d[1])) return d[0];
  a = a();
  c.memoizedState = [a, b];
  return a;
}
function ui(a, b, c) {
  if (0 === (Hh & 21)) return a.baseState && (a.baseState = false, dh = true), a.memoizedState = c;
  He(c, b) || (c = yc(), M.lanes |= c, rh |= c, a.baseState = true);
  return b;
}
function vi(a, b) {
  var c = C;
  C = 0 !== c && 4 > c ? c : 4;
  a(true);
  var d = Gh.transition;
  Gh.transition = {};
  try {
    a(false), b();
  } finally {
    C = c, Gh.transition = d;
  }
}
function wi() {
  return Uh().memoizedState;
}
function xi(a, b, c) {
  var d = yi(a);
  c = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
  if (zi(a)) Ai(b, c);
  else if (c = hh(a, b, c, d), null !== c) {
    var e = R();
    gi(c, a, d, e);
    Bi(c, b, d);
  }
}
function ii(a, b, c) {
  var d = yi(a), e = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
  if (zi(a)) Ai(b, e);
  else {
    var f2 = a.alternate;
    if (0 === a.lanes && (null === f2 || 0 === f2.lanes) && (f2 = b.lastRenderedReducer, null !== f2)) try {
      var g = b.lastRenderedState, h = f2(g, c);
      e.hasEagerState = true;
      e.eagerState = h;
      if (He(h, g)) {
        var k2 = b.interleaved;
        null === k2 ? (e.next = e, gh(b)) : (e.next = k2.next, k2.next = e);
        b.interleaved = e;
        return;
      }
    } catch (l2) {
    } finally {
    }
    c = hh(a, b, e, d);
    null !== c && (e = R(), gi(c, a, d, e), Bi(c, b, d));
  }
}
function zi(a) {
  var b = a.alternate;
  return a === M || null !== b && b === M;
}
function Ai(a, b) {
  Jh = Ih = true;
  var c = a.pending;
  null === c ? b.next = b : (b.next = c.next, c.next = b);
  a.pending = b;
}
function Bi(a, b, c) {
  if (0 !== (c & 4194240)) {
    var d = b.lanes;
    d &= a.pendingLanes;
    c |= d;
    b.lanes = c;
    Cc(a, c);
  }
}
var Rh = { readContext: eh, useCallback: P, useContext: P, useEffect: P, useImperativeHandle: P, useInsertionEffect: P, useLayoutEffect: P, useMemo: P, useReducer: P, useRef: P, useState: P, useDebugValue: P, useDeferredValue: P, useTransition: P, useMutableSource: P, useSyncExternalStore: P, useId: P, unstable_isNewReconciler: false }, Oh = { readContext: eh, useCallback: function(a, b) {
  Th().memoizedState = [a, void 0 === b ? null : b];
  return a;
}, useContext: eh, useEffect: mi, useImperativeHandle: function(a, b, c) {
  c = null !== c && void 0 !== c ? c.concat([a]) : null;
  return ki(
    4194308,
    4,
    pi.bind(null, b, a),
    c
  );
}, useLayoutEffect: function(a, b) {
  return ki(4194308, 4, a, b);
}, useInsertionEffect: function(a, b) {
  return ki(4, 2, a, b);
}, useMemo: function(a, b) {
  var c = Th();
  b = void 0 === b ? null : b;
  a = a();
  c.memoizedState = [a, b];
  return a;
}, useReducer: function(a, b, c) {
  var d = Th();
  b = void 0 !== c ? c(b) : b;
  d.memoizedState = d.baseState = b;
  a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: a, lastRenderedState: b };
  d.queue = a;
  a = a.dispatch = xi.bind(null, M, a);
  return [d.memoizedState, a];
}, useRef: function(a) {
  var b = Th();
  a = { current: a };
  return b.memoizedState = a;
}, useState: hi, useDebugValue: ri, useDeferredValue: function(a) {
  return Th().memoizedState = a;
}, useTransition: function() {
  var a = hi(false), b = a[0];
  a = vi.bind(null, a[1]);
  Th().memoizedState = a;
  return [b, a];
}, useMutableSource: function() {
}, useSyncExternalStore: function(a, b, c) {
  var d = M, e = Th();
  if (I) {
    if (void 0 === c) throw Error(p(407));
    c = c();
  } else {
    c = b();
    if (null === Q) throw Error(p(349));
    0 !== (Hh & 30) || di(d, b, c);
  }
  e.memoizedState = c;
  var f2 = { value: c, getSnapshot: b };
  e.queue = f2;
  mi(ai.bind(
    null,
    d,
    f2,
    a
  ), [a]);
  d.flags |= 2048;
  bi(9, ci.bind(null, d, f2, c, b), void 0, null);
  return c;
}, useId: function() {
  var a = Th(), b = Q.identifierPrefix;
  if (I) {
    var c = sg;
    var d = rg;
    c = (d & ~(1 << 32 - oc(d) - 1)).toString(32) + c;
    b = ":" + b + "R" + c;
    c = Kh++;
    0 < c && (b += "H" + c.toString(32));
    b += ":";
  } else c = Lh++, b = ":" + b + "r" + c.toString(32) + ":";
  return a.memoizedState = b;
}, unstable_isNewReconciler: false }, Ph = {
  readContext: eh,
  useCallback: si,
  useContext: eh,
  useEffect: $h,
  useImperativeHandle: qi,
  useInsertionEffect: ni,
  useLayoutEffect: oi,
  useMemo: ti,
  useReducer: Wh,
  useRef: ji,
  useState: function() {
    return Wh(Vh);
  },
  useDebugValue: ri,
  useDeferredValue: function(a) {
    var b = Uh();
    return ui(b, N.memoizedState, a);
  },
  useTransition: function() {
    var a = Wh(Vh)[0], b = Uh().memoizedState;
    return [a, b];
  },
  useMutableSource: Yh,
  useSyncExternalStore: Zh,
  useId: wi,
  unstable_isNewReconciler: false
}, Qh = { readContext: eh, useCallback: si, useContext: eh, useEffect: $h, useImperativeHandle: qi, useInsertionEffect: ni, useLayoutEffect: oi, useMemo: ti, useReducer: Xh, useRef: ji, useState: function() {
  return Xh(Vh);
}, useDebugValue: ri, useDeferredValue: function(a) {
  var b = Uh();
  return null === N ? b.memoizedState = a : ui(b, N.memoizedState, a);
}, useTransition: function() {
  var a = Xh(Vh)[0], b = Uh().memoizedState;
  return [a, b];
}, useMutableSource: Yh, useSyncExternalStore: Zh, useId: wi, unstable_isNewReconciler: false };
function Ci(a, b) {
  if (a && a.defaultProps) {
    b = A({}, b);
    a = a.defaultProps;
    for (var c in a) void 0 === b[c] && (b[c] = a[c]);
    return b;
  }
  return b;
}
function Di(a, b, c, d) {
  b = a.memoizedState;
  c = c(d, b);
  c = null === c || void 0 === c ? b : A({}, b, c);
  a.memoizedState = c;
  0 === a.lanes && (a.updateQueue.baseState = c);
}
var Ei = { isMounted: function(a) {
  return (a = a._reactInternals) ? Vb(a) === a : false;
}, enqueueSetState: function(a, b, c) {
  a = a._reactInternals;
  var d = R(), e = yi(a), f2 = mh(d, e);
  f2.payload = b;
  void 0 !== c && null !== c && (f2.callback = c);
  b = nh(a, f2, e);
  null !== b && (gi(b, a, e, d), oh(b, a, e));
}, enqueueReplaceState: function(a, b, c) {
  a = a._reactInternals;
  var d = R(), e = yi(a), f2 = mh(d, e);
  f2.tag = 1;
  f2.payload = b;
  void 0 !== c && null !== c && (f2.callback = c);
  b = nh(a, f2, e);
  null !== b && (gi(b, a, e, d), oh(b, a, e));
}, enqueueForceUpdate: function(a, b) {
  a = a._reactInternals;
  var c = R(), d = yi(a), e = mh(c, d);
  e.tag = 2;
  void 0 !== b && null !== b && (e.callback = b);
  b = nh(a, e, d);
  null !== b && (gi(b, a, d, c), oh(b, a, d));
} };
function Fi(a, b, c, d, e, f2, g) {
  a = a.stateNode;
  return "function" === typeof a.shouldComponentUpdate ? a.shouldComponentUpdate(d, f2, g) : b.prototype && b.prototype.isPureReactComponent ? !Ie(c, d) || !Ie(e, f2) : true;
}
function Gi(a, b, c) {
  var d = false, e = Vf;
  var f2 = b.contextType;
  "object" === typeof f2 && null !== f2 ? f2 = eh(f2) : (e = Zf(b) ? Xf : H.current, d = b.contextTypes, f2 = (d = null !== d && void 0 !== d) ? Yf(a, e) : Vf);
  b = new b(c, f2);
  a.memoizedState = null !== b.state && void 0 !== b.state ? b.state : null;
  b.updater = Ei;
  a.stateNode = b;
  b._reactInternals = a;
  d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = e, a.__reactInternalMemoizedMaskedChildContext = f2);
  return b;
}
function Hi(a, b, c, d) {
  a = b.state;
  "function" === typeof b.componentWillReceiveProps && b.componentWillReceiveProps(c, d);
  "function" === typeof b.UNSAFE_componentWillReceiveProps && b.UNSAFE_componentWillReceiveProps(c, d);
  b.state !== a && Ei.enqueueReplaceState(b, b.state, null);
}
function Ii(a, b, c, d) {
  var e = a.stateNode;
  e.props = c;
  e.state = a.memoizedState;
  e.refs = {};
  kh(a);
  var f2 = b.contextType;
  "object" === typeof f2 && null !== f2 ? e.context = eh(f2) : (f2 = Zf(b) ? Xf : H.current, e.context = Yf(a, f2));
  e.state = a.memoizedState;
  f2 = b.getDerivedStateFromProps;
  "function" === typeof f2 && (Di(a, b, f2, c), e.state = a.memoizedState);
  "function" === typeof b.getDerivedStateFromProps || "function" === typeof e.getSnapshotBeforeUpdate || "function" !== typeof e.UNSAFE_componentWillMount && "function" !== typeof e.componentWillMount || (b = e.state, "function" === typeof e.componentWillMount && e.componentWillMount(), "function" === typeof e.UNSAFE_componentWillMount && e.UNSAFE_componentWillMount(), b !== e.state && Ei.enqueueReplaceState(e, e.state, null), qh(a, c, e, d), e.state = a.memoizedState);
  "function" === typeof e.componentDidMount && (a.flags |= 4194308);
}
function Ji(a, b) {
  try {
    var c = "", d = b;
    do
      c += Pa(d), d = d.return;
    while (d);
    var e = c;
  } catch (f2) {
    e = "\nError generating stack: " + f2.message + "\n" + f2.stack;
  }
  return { value: a, source: b, stack: e, digest: null };
}
function Ki(a, b, c) {
  return { value: a, source: null, stack: null != c ? c : null, digest: null != b ? b : null };
}
function Li(a, b) {
  try {
    console.error(b.value);
  } catch (c) {
    setTimeout(function() {
      throw c;
    });
  }
}
var Mi = "function" === typeof WeakMap ? WeakMap : Map;
function Ni(a, b, c) {
  c = mh(-1, c);
  c.tag = 3;
  c.payload = { element: null };
  var d = b.value;
  c.callback = function() {
    Oi || (Oi = true, Pi = d);
    Li(a, b);
  };
  return c;
}
function Qi(a, b, c) {
  c = mh(-1, c);
  c.tag = 3;
  var d = a.type.getDerivedStateFromError;
  if ("function" === typeof d) {
    var e = b.value;
    c.payload = function() {
      return d(e);
    };
    c.callback = function() {
      Li(a, b);
    };
  }
  var f2 = a.stateNode;
  null !== f2 && "function" === typeof f2.componentDidCatch && (c.callback = function() {
    Li(a, b);
    "function" !== typeof d && (null === Ri ? Ri = /* @__PURE__ */ new Set([this]) : Ri.add(this));
    var c2 = b.stack;
    this.componentDidCatch(b.value, { componentStack: null !== c2 ? c2 : "" });
  });
  return c;
}
function Si(a, b, c) {
  var d = a.pingCache;
  if (null === d) {
    d = a.pingCache = new Mi();
    var e = /* @__PURE__ */ new Set();
    d.set(b, e);
  } else e = d.get(b), void 0 === e && (e = /* @__PURE__ */ new Set(), d.set(b, e));
  e.has(c) || (e.add(c), a = Ti.bind(null, a, b, c), b.then(a, a));
}
function Ui(a) {
  do {
    var b;
    if (b = 13 === a.tag) b = a.memoizedState, b = null !== b ? null !== b.dehydrated ? true : false : true;
    if (b) return a;
    a = a.return;
  } while (null !== a);
  return null;
}
function Vi(a, b, c, d, e) {
  if (0 === (a.mode & 1)) return a === b ? a.flags |= 65536 : (a.flags |= 128, c.flags |= 131072, c.flags &= -52805, 1 === c.tag && (null === c.alternate ? c.tag = 17 : (b = mh(-1, 1), b.tag = 2, nh(c, b, 1))), c.lanes |= 1), a;
  a.flags |= 65536;
  a.lanes = e;
  return a;
}
var Wi = ua.ReactCurrentOwner, dh = false;
function Xi(a, b, c, d) {
  b.child = null === a ? Vg(b, null, c, d) : Ug(b, a.child, c, d);
}
function Yi(a, b, c, d, e) {
  c = c.render;
  var f2 = b.ref;
  ch(b, e);
  d = Nh(a, b, c, d, f2, e);
  c = Sh();
  if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
  I && c && vg(b);
  b.flags |= 1;
  Xi(a, b, d, e);
  return b.child;
}
function $i(a, b, c, d, e) {
  if (null === a) {
    var f2 = c.type;
    if ("function" === typeof f2 && !aj(f2) && void 0 === f2.defaultProps && null === c.compare && void 0 === c.defaultProps) return b.tag = 15, b.type = f2, bj(a, b, f2, d, e);
    a = Rg(c.type, null, d, b, b.mode, e);
    a.ref = b.ref;
    a.return = b;
    return b.child = a;
  }
  f2 = a.child;
  if (0 === (a.lanes & e)) {
    var g = f2.memoizedProps;
    c = c.compare;
    c = null !== c ? c : Ie;
    if (c(g, d) && a.ref === b.ref) return Zi(a, b, e);
  }
  b.flags |= 1;
  a = Pg(f2, d);
  a.ref = b.ref;
  a.return = b;
  return b.child = a;
}
function bj(a, b, c, d, e) {
  if (null !== a) {
    var f2 = a.memoizedProps;
    if (Ie(f2, d) && a.ref === b.ref) if (dh = false, b.pendingProps = d = f2, 0 !== (a.lanes & e)) 0 !== (a.flags & 131072) && (dh = true);
    else return b.lanes = a.lanes, Zi(a, b, e);
  }
  return cj(a, b, c, d, e);
}
function dj(a, b, c) {
  var d = b.pendingProps, e = d.children, f2 = null !== a ? a.memoizedState : null;
  if ("hidden" === d.mode) if (0 === (b.mode & 1)) b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, G(ej, fj), fj |= c;
  else {
    if (0 === (c & 1073741824)) return a = null !== f2 ? f2.baseLanes | c : c, b.lanes = b.childLanes = 1073741824, b.memoizedState = { baseLanes: a, cachePool: null, transitions: null }, b.updateQueue = null, G(ej, fj), fj |= a, null;
    b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null };
    d = null !== f2 ? f2.baseLanes : c;
    G(ej, fj);
    fj |= d;
  }
  else null !== f2 ? (d = f2.baseLanes | c, b.memoizedState = null) : d = c, G(ej, fj), fj |= d;
  Xi(a, b, e, c);
  return b.child;
}
function gj(a, b) {
  var c = b.ref;
  if (null === a && null !== c || null !== a && a.ref !== c) b.flags |= 512, b.flags |= 2097152;
}
function cj(a, b, c, d, e) {
  var f2 = Zf(c) ? Xf : H.current;
  f2 = Yf(b, f2);
  ch(b, e);
  c = Nh(a, b, c, d, f2, e);
  d = Sh();
  if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
  I && d && vg(b);
  b.flags |= 1;
  Xi(a, b, c, e);
  return b.child;
}
function hj(a, b, c, d, e) {
  if (Zf(c)) {
    var f2 = true;
    cg(b);
  } else f2 = false;
  ch(b, e);
  if (null === b.stateNode) ij(a, b), Gi(b, c, d), Ii(b, c, d, e), d = true;
  else if (null === a) {
    var g = b.stateNode, h = b.memoizedProps;
    g.props = h;
    var k2 = g.context, l2 = c.contextType;
    "object" === typeof l2 && null !== l2 ? l2 = eh(l2) : (l2 = Zf(c) ? Xf : H.current, l2 = Yf(b, l2));
    var m2 = c.getDerivedStateFromProps, q2 = "function" === typeof m2 || "function" === typeof g.getSnapshotBeforeUpdate;
    q2 || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== d || k2 !== l2) && Hi(b, g, d, l2);
    jh = false;
    var r2 = b.memoizedState;
    g.state = r2;
    qh(b, d, g, e);
    k2 = b.memoizedState;
    h !== d || r2 !== k2 || Wf.current || jh ? ("function" === typeof m2 && (Di(b, c, m2, d), k2 = b.memoizedState), (h = jh || Fi(b, c, h, d, r2, k2, l2)) ? (q2 || "function" !== typeof g.UNSAFE_componentWillMount && "function" !== typeof g.componentWillMount || ("function" === typeof g.componentWillMount && g.componentWillMount(), "function" === typeof g.UNSAFE_componentWillMount && g.UNSAFE_componentWillMount()), "function" === typeof g.componentDidMount && (b.flags |= 4194308)) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), b.memoizedProps = d, b.memoizedState = k2), g.props = d, g.state = k2, g.context = l2, d = h) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), d = false);
  } else {
    g = b.stateNode;
    lh(a, b);
    h = b.memoizedProps;
    l2 = b.type === b.elementType ? h : Ci(b.type, h);
    g.props = l2;
    q2 = b.pendingProps;
    r2 = g.context;
    k2 = c.contextType;
    "object" === typeof k2 && null !== k2 ? k2 = eh(k2) : (k2 = Zf(c) ? Xf : H.current, k2 = Yf(b, k2));
    var y2 = c.getDerivedStateFromProps;
    (m2 = "function" === typeof y2 || "function" === typeof g.getSnapshotBeforeUpdate) || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== q2 || r2 !== k2) && Hi(b, g, d, k2);
    jh = false;
    r2 = b.memoizedState;
    g.state = r2;
    qh(b, d, g, e);
    var n2 = b.memoizedState;
    h !== q2 || r2 !== n2 || Wf.current || jh ? ("function" === typeof y2 && (Di(b, c, y2, d), n2 = b.memoizedState), (l2 = jh || Fi(b, c, l2, d, r2, n2, k2) || false) ? (m2 || "function" !== typeof g.UNSAFE_componentWillUpdate && "function" !== typeof g.componentWillUpdate || ("function" === typeof g.componentWillUpdate && g.componentWillUpdate(d, n2, k2), "function" === typeof g.UNSAFE_componentWillUpdate && g.UNSAFE_componentWillUpdate(d, n2, k2)), "function" === typeof g.componentDidUpdate && (b.flags |= 4), "function" === typeof g.getSnapshotBeforeUpdate && (b.flags |= 1024)) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 1024), b.memoizedProps = d, b.memoizedState = n2), g.props = d, g.state = n2, g.context = k2, d = l2) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 1024), d = false);
  }
  return jj(a, b, c, d, f2, e);
}
function jj(a, b, c, d, e, f2) {
  gj(a, b);
  var g = 0 !== (b.flags & 128);
  if (!d && !g) return e && dg(b, c, false), Zi(a, b, f2);
  d = b.stateNode;
  Wi.current = b;
  var h = g && "function" !== typeof c.getDerivedStateFromError ? null : d.render();
  b.flags |= 1;
  null !== a && g ? (b.child = Ug(b, a.child, null, f2), b.child = Ug(b, null, h, f2)) : Xi(a, b, h, f2);
  b.memoizedState = d.state;
  e && dg(b, c, true);
  return b.child;
}
function kj(a) {
  var b = a.stateNode;
  b.pendingContext ? ag(a, b.pendingContext, b.pendingContext !== b.context) : b.context && ag(a, b.context, false);
  yh(a, b.containerInfo);
}
function lj(a, b, c, d, e) {
  Ig();
  Jg(e);
  b.flags |= 256;
  Xi(a, b, c, d);
  return b.child;
}
var mj = { dehydrated: null, treeContext: null, retryLane: 0 };
function nj(a) {
  return { baseLanes: a, cachePool: null, transitions: null };
}
function oj(a, b, c) {
  var d = b.pendingProps, e = L.current, f2 = false, g = 0 !== (b.flags & 128), h;
  (h = g) || (h = null !== a && null === a.memoizedState ? false : 0 !== (e & 2));
  if (h) f2 = true, b.flags &= -129;
  else if (null === a || null !== a.memoizedState) e |= 1;
  G(L, e & 1);
  if (null === a) {
    Eg(b);
    a = b.memoizedState;
    if (null !== a && (a = a.dehydrated, null !== a)) return 0 === (b.mode & 1) ? b.lanes = 1 : "$!" === a.data ? b.lanes = 8 : b.lanes = 1073741824, null;
    g = d.children;
    a = d.fallback;
    return f2 ? (d = b.mode, f2 = b.child, g = { mode: "hidden", children: g }, 0 === (d & 1) && null !== f2 ? (f2.childLanes = 0, f2.pendingProps = g) : f2 = pj(g, d, 0, null), a = Tg(a, d, c, null), f2.return = b, a.return = b, f2.sibling = a, b.child = f2, b.child.memoizedState = nj(c), b.memoizedState = mj, a) : qj(b, g);
  }
  e = a.memoizedState;
  if (null !== e && (h = e.dehydrated, null !== h)) return rj(a, b, g, d, h, e, c);
  if (f2) {
    f2 = d.fallback;
    g = b.mode;
    e = a.child;
    h = e.sibling;
    var k2 = { mode: "hidden", children: d.children };
    0 === (g & 1) && b.child !== e ? (d = b.child, d.childLanes = 0, d.pendingProps = k2, b.deletions = null) : (d = Pg(e, k2), d.subtreeFlags = e.subtreeFlags & 14680064);
    null !== h ? f2 = Pg(h, f2) : (f2 = Tg(f2, g, c, null), f2.flags |= 2);
    f2.return = b;
    d.return = b;
    d.sibling = f2;
    b.child = d;
    d = f2;
    f2 = b.child;
    g = a.child.memoizedState;
    g = null === g ? nj(c) : { baseLanes: g.baseLanes | c, cachePool: null, transitions: g.transitions };
    f2.memoizedState = g;
    f2.childLanes = a.childLanes & ~c;
    b.memoizedState = mj;
    return d;
  }
  f2 = a.child;
  a = f2.sibling;
  d = Pg(f2, { mode: "visible", children: d.children });
  0 === (b.mode & 1) && (d.lanes = c);
  d.return = b;
  d.sibling = null;
  null !== a && (c = b.deletions, null === c ? (b.deletions = [a], b.flags |= 16) : c.push(a));
  b.child = d;
  b.memoizedState = null;
  return d;
}
function qj(a, b) {
  b = pj({ mode: "visible", children: b }, a.mode, 0, null);
  b.return = a;
  return a.child = b;
}
function sj(a, b, c, d) {
  null !== d && Jg(d);
  Ug(b, a.child, null, c);
  a = qj(b, b.pendingProps.children);
  a.flags |= 2;
  b.memoizedState = null;
  return a;
}
function rj(a, b, c, d, e, f2, g) {
  if (c) {
    if (b.flags & 256) return b.flags &= -257, d = Ki(Error(p(422))), sj(a, b, g, d);
    if (null !== b.memoizedState) return b.child = a.child, b.flags |= 128, null;
    f2 = d.fallback;
    e = b.mode;
    d = pj({ mode: "visible", children: d.children }, e, 0, null);
    f2 = Tg(f2, e, g, null);
    f2.flags |= 2;
    d.return = b;
    f2.return = b;
    d.sibling = f2;
    b.child = d;
    0 !== (b.mode & 1) && Ug(b, a.child, null, g);
    b.child.memoizedState = nj(g);
    b.memoizedState = mj;
    return f2;
  }
  if (0 === (b.mode & 1)) return sj(a, b, g, null);
  if ("$!" === e.data) {
    d = e.nextSibling && e.nextSibling.dataset;
    if (d) var h = d.dgst;
    d = h;
    f2 = Error(p(419));
    d = Ki(f2, d, void 0);
    return sj(a, b, g, d);
  }
  h = 0 !== (g & a.childLanes);
  if (dh || h) {
    d = Q;
    if (null !== d) {
      switch (g & -g) {
        case 4:
          e = 2;
          break;
        case 16:
          e = 8;
          break;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          e = 32;
          break;
        case 536870912:
          e = 268435456;
          break;
        default:
          e = 0;
      }
      e = 0 !== (e & (d.suspendedLanes | g)) ? 0 : e;
      0 !== e && e !== f2.retryLane && (f2.retryLane = e, ih(a, e), gi(d, a, e, -1));
    }
    tj();
    d = Ki(Error(p(421)));
    return sj(a, b, g, d);
  }
  if ("$?" === e.data) return b.flags |= 128, b.child = a.child, b = uj.bind(null, a), e._reactRetry = b, null;
  a = f2.treeContext;
  yg = Lf(e.nextSibling);
  xg = b;
  I = true;
  zg = null;
  null !== a && (og[pg++] = rg, og[pg++] = sg, og[pg++] = qg, rg = a.id, sg = a.overflow, qg = b);
  b = qj(b, d.children);
  b.flags |= 4096;
  return b;
}
function vj(a, b, c) {
  a.lanes |= b;
  var d = a.alternate;
  null !== d && (d.lanes |= b);
  bh(a.return, b, c);
}
function wj(a, b, c, d, e) {
  var f2 = a.memoizedState;
  null === f2 ? a.memoizedState = { isBackwards: b, rendering: null, renderingStartTime: 0, last: d, tail: c, tailMode: e } : (f2.isBackwards = b, f2.rendering = null, f2.renderingStartTime = 0, f2.last = d, f2.tail = c, f2.tailMode = e);
}
function xj(a, b, c) {
  var d = b.pendingProps, e = d.revealOrder, f2 = d.tail;
  Xi(a, b, d.children, c);
  d = L.current;
  if (0 !== (d & 2)) d = d & 1 | 2, b.flags |= 128;
  else {
    if (null !== a && 0 !== (a.flags & 128)) a: for (a = b.child; null !== a; ) {
      if (13 === a.tag) null !== a.memoizedState && vj(a, c, b);
      else if (19 === a.tag) vj(a, c, b);
      else if (null !== a.child) {
        a.child.return = a;
        a = a.child;
        continue;
      }
      if (a === b) break a;
      for (; null === a.sibling; ) {
        if (null === a.return || a.return === b) break a;
        a = a.return;
      }
      a.sibling.return = a.return;
      a = a.sibling;
    }
    d &= 1;
  }
  G(L, d);
  if (0 === (b.mode & 1)) b.memoizedState = null;
  else switch (e) {
    case "forwards":
      c = b.child;
      for (e = null; null !== c; ) a = c.alternate, null !== a && null === Ch(a) && (e = c), c = c.sibling;
      c = e;
      null === c ? (e = b.child, b.child = null) : (e = c.sibling, c.sibling = null);
      wj(b, false, e, c, f2);
      break;
    case "backwards":
      c = null;
      e = b.child;
      for (b.child = null; null !== e; ) {
        a = e.alternate;
        if (null !== a && null === Ch(a)) {
          b.child = e;
          break;
        }
        a = e.sibling;
        e.sibling = c;
        c = e;
        e = a;
      }
      wj(b, true, c, null, f2);
      break;
    case "together":
      wj(b, false, null, null, void 0);
      break;
    default:
      b.memoizedState = null;
  }
  return b.child;
}
function ij(a, b) {
  0 === (b.mode & 1) && null !== a && (a.alternate = null, b.alternate = null, b.flags |= 2);
}
function Zi(a, b, c) {
  null !== a && (b.dependencies = a.dependencies);
  rh |= b.lanes;
  if (0 === (c & b.childLanes)) return null;
  if (null !== a && b.child !== a.child) throw Error(p(153));
  if (null !== b.child) {
    a = b.child;
    c = Pg(a, a.pendingProps);
    b.child = c;
    for (c.return = b; null !== a.sibling; ) a = a.sibling, c = c.sibling = Pg(a, a.pendingProps), c.return = b;
    c.sibling = null;
  }
  return b.child;
}
function yj(a, b, c) {
  switch (b.tag) {
    case 3:
      kj(b);
      Ig();
      break;
    case 5:
      Ah(b);
      break;
    case 1:
      Zf(b.type) && cg(b);
      break;
    case 4:
      yh(b, b.stateNode.containerInfo);
      break;
    case 10:
      var d = b.type._context, e = b.memoizedProps.value;
      G(Wg, d._currentValue);
      d._currentValue = e;
      break;
    case 13:
      d = b.memoizedState;
      if (null !== d) {
        if (null !== d.dehydrated) return G(L, L.current & 1), b.flags |= 128, null;
        if (0 !== (c & b.child.childLanes)) return oj(a, b, c);
        G(L, L.current & 1);
        a = Zi(a, b, c);
        return null !== a ? a.sibling : null;
      }
      G(L, L.current & 1);
      break;
    case 19:
      d = 0 !== (c & b.childLanes);
      if (0 !== (a.flags & 128)) {
        if (d) return xj(a, b, c);
        b.flags |= 128;
      }
      e = b.memoizedState;
      null !== e && (e.rendering = null, e.tail = null, e.lastEffect = null);
      G(L, L.current);
      if (d) break;
      else return null;
    case 22:
    case 23:
      return b.lanes = 0, dj(a, b, c);
  }
  return Zi(a, b, c);
}
var zj, Aj, Bj, Cj;
zj = function(a, b) {
  for (var c = b.child; null !== c; ) {
    if (5 === c.tag || 6 === c.tag) a.appendChild(c.stateNode);
    else if (4 !== c.tag && null !== c.child) {
      c.child.return = c;
      c = c.child;
      continue;
    }
    if (c === b) break;
    for (; null === c.sibling; ) {
      if (null === c.return || c.return === b) return;
      c = c.return;
    }
    c.sibling.return = c.return;
    c = c.sibling;
  }
};
Aj = function() {
};
Bj = function(a, b, c, d) {
  var e = a.memoizedProps;
  if (e !== d) {
    a = b.stateNode;
    xh(uh.current);
    var f2 = null;
    switch (c) {
      case "input":
        e = Ya(a, e);
        d = Ya(a, d);
        f2 = [];
        break;
      case "select":
        e = A({}, e, { value: void 0 });
        d = A({}, d, { value: void 0 });
        f2 = [];
        break;
      case "textarea":
        e = gb(a, e);
        d = gb(a, d);
        f2 = [];
        break;
      default:
        "function" !== typeof e.onClick && "function" === typeof d.onClick && (a.onclick = Bf);
    }
    ub(c, d);
    var g;
    c = null;
    for (l2 in e) if (!d.hasOwnProperty(l2) && e.hasOwnProperty(l2) && null != e[l2]) if ("style" === l2) {
      var h = e[l2];
      for (g in h) h.hasOwnProperty(g) && (c || (c = {}), c[g] = "");
    } else "dangerouslySetInnerHTML" !== l2 && "children" !== l2 && "suppressContentEditableWarning" !== l2 && "suppressHydrationWarning" !== l2 && "autoFocus" !== l2 && (ea.hasOwnProperty(l2) ? f2 || (f2 = []) : (f2 = f2 || []).push(l2, null));
    for (l2 in d) {
      var k2 = d[l2];
      h = null != e ? e[l2] : void 0;
      if (d.hasOwnProperty(l2) && k2 !== h && (null != k2 || null != h)) if ("style" === l2) if (h) {
        for (g in h) !h.hasOwnProperty(g) || k2 && k2.hasOwnProperty(g) || (c || (c = {}), c[g] = "");
        for (g in k2) k2.hasOwnProperty(g) && h[g] !== k2[g] && (c || (c = {}), c[g] = k2[g]);
      } else c || (f2 || (f2 = []), f2.push(
        l2,
        c
      )), c = k2;
      else "dangerouslySetInnerHTML" === l2 ? (k2 = k2 ? k2.__html : void 0, h = h ? h.__html : void 0, null != k2 && h !== k2 && (f2 = f2 || []).push(l2, k2)) : "children" === l2 ? "string" !== typeof k2 && "number" !== typeof k2 || (f2 = f2 || []).push(l2, "" + k2) : "suppressContentEditableWarning" !== l2 && "suppressHydrationWarning" !== l2 && (ea.hasOwnProperty(l2) ? (null != k2 && "onScroll" === l2 && D("scroll", a), f2 || h === k2 || (f2 = [])) : (f2 = f2 || []).push(l2, k2));
    }
    c && (f2 = f2 || []).push("style", c);
    var l2 = f2;
    if (b.updateQueue = l2) b.flags |= 4;
  }
};
Cj = function(a, b, c, d) {
  c !== d && (b.flags |= 4);
};
function Dj(a, b) {
  if (!I) switch (a.tailMode) {
    case "hidden":
      b = a.tail;
      for (var c = null; null !== b; ) null !== b.alternate && (c = b), b = b.sibling;
      null === c ? a.tail = null : c.sibling = null;
      break;
    case "collapsed":
      c = a.tail;
      for (var d = null; null !== c; ) null !== c.alternate && (d = c), c = c.sibling;
      null === d ? b || null === a.tail ? a.tail = null : a.tail.sibling = null : d.sibling = null;
  }
}
function S(a) {
  var b = null !== a.alternate && a.alternate.child === a.child, c = 0, d = 0;
  if (b) for (var e = a.child; null !== e; ) c |= e.lanes | e.childLanes, d |= e.subtreeFlags & 14680064, d |= e.flags & 14680064, e.return = a, e = e.sibling;
  else for (e = a.child; null !== e; ) c |= e.lanes | e.childLanes, d |= e.subtreeFlags, d |= e.flags, e.return = a, e = e.sibling;
  a.subtreeFlags |= d;
  a.childLanes = c;
  return b;
}
function Ej(a, b, c) {
  var d = b.pendingProps;
  wg(b);
  switch (b.tag) {
    case 2:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return S(b), null;
    case 1:
      return Zf(b.type) && $f(), S(b), null;
    case 3:
      d = b.stateNode;
      zh();
      E(Wf);
      E(H);
      Eh();
      d.pendingContext && (d.context = d.pendingContext, d.pendingContext = null);
      if (null === a || null === a.child) Gg(b) ? b.flags |= 4 : null === a || a.memoizedState.isDehydrated && 0 === (b.flags & 256) || (b.flags |= 1024, null !== zg && (Fj(zg), zg = null));
      Aj(a, b);
      S(b);
      return null;
    case 5:
      Bh(b);
      var e = xh(wh.current);
      c = b.type;
      if (null !== a && null != b.stateNode) Bj(a, b, c, d, e), a.ref !== b.ref && (b.flags |= 512, b.flags |= 2097152);
      else {
        if (!d) {
          if (null === b.stateNode) throw Error(p(166));
          S(b);
          return null;
        }
        a = xh(uh.current);
        if (Gg(b)) {
          d = b.stateNode;
          c = b.type;
          var f2 = b.memoizedProps;
          d[Of] = b;
          d[Pf] = f2;
          a = 0 !== (b.mode & 1);
          switch (c) {
            case "dialog":
              D("cancel", d);
              D("close", d);
              break;
            case "iframe":
            case "object":
            case "embed":
              D("load", d);
              break;
            case "video":
            case "audio":
              for (e = 0; e < lf.length; e++) D(lf[e], d);
              break;
            case "source":
              D("error", d);
              break;
            case "img":
            case "image":
            case "link":
              D(
                "error",
                d
              );
              D("load", d);
              break;
            case "details":
              D("toggle", d);
              break;
            case "input":
              Za(d, f2);
              D("invalid", d);
              break;
            case "select":
              d._wrapperState = { wasMultiple: !!f2.multiple };
              D("invalid", d);
              break;
            case "textarea":
              hb(d, f2), D("invalid", d);
          }
          ub(c, f2);
          e = null;
          for (var g in f2) if (f2.hasOwnProperty(g)) {
            var h = f2[g];
            "children" === g ? "string" === typeof h ? d.textContent !== h && (true !== f2.suppressHydrationWarning && Af(d.textContent, h, a), e = ["children", h]) : "number" === typeof h && d.textContent !== "" + h && (true !== f2.suppressHydrationWarning && Af(
              d.textContent,
              h,
              a
            ), e = ["children", "" + h]) : ea.hasOwnProperty(g) && null != h && "onScroll" === g && D("scroll", d);
          }
          switch (c) {
            case "input":
              Va(d);
              db(d, f2, true);
              break;
            case "textarea":
              Va(d);
              jb(d);
              break;
            case "select":
            case "option":
              break;
            default:
              "function" === typeof f2.onClick && (d.onclick = Bf);
          }
          d = e;
          b.updateQueue = d;
          null !== d && (b.flags |= 4);
        } else {
          g = 9 === e.nodeType ? e : e.ownerDocument;
          "http://www.w3.org/1999/xhtml" === a && (a = kb(c));
          "http://www.w3.org/1999/xhtml" === a ? "script" === c ? (a = g.createElement("div"), a.innerHTML = "<script><\/script>", a = a.removeChild(a.firstChild)) : "string" === typeof d.is ? a = g.createElement(c, { is: d.is }) : (a = g.createElement(c), "select" === c && (g = a, d.multiple ? g.multiple = true : d.size && (g.size = d.size))) : a = g.createElementNS(a, c);
          a[Of] = b;
          a[Pf] = d;
          zj(a, b, false, false);
          b.stateNode = a;
          a: {
            g = vb(c, d);
            switch (c) {
              case "dialog":
                D("cancel", a);
                D("close", a);
                e = d;
                break;
              case "iframe":
              case "object":
              case "embed":
                D("load", a);
                e = d;
                break;
              case "video":
              case "audio":
                for (e = 0; e < lf.length; e++) D(lf[e], a);
                e = d;
                break;
              case "source":
                D("error", a);
                e = d;
                break;
              case "img":
              case "image":
              case "link":
                D(
                  "error",
                  a
                );
                D("load", a);
                e = d;
                break;
              case "details":
                D("toggle", a);
                e = d;
                break;
              case "input":
                Za(a, d);
                e = Ya(a, d);
                D("invalid", a);
                break;
              case "option":
                e = d;
                break;
              case "select":
                a._wrapperState = { wasMultiple: !!d.multiple };
                e = A({}, d, { value: void 0 });
                D("invalid", a);
                break;
              case "textarea":
                hb(a, d);
                e = gb(a, d);
                D("invalid", a);
                break;
              default:
                e = d;
            }
            ub(c, e);
            h = e;
            for (f2 in h) if (h.hasOwnProperty(f2)) {
              var k2 = h[f2];
              "style" === f2 ? sb(a, k2) : "dangerouslySetInnerHTML" === f2 ? (k2 = k2 ? k2.__html : void 0, null != k2 && nb(a, k2)) : "children" === f2 ? "string" === typeof k2 ? ("textarea" !== c || "" !== k2) && ob(a, k2) : "number" === typeof k2 && ob(a, "" + k2) : "suppressContentEditableWarning" !== f2 && "suppressHydrationWarning" !== f2 && "autoFocus" !== f2 && (ea.hasOwnProperty(f2) ? null != k2 && "onScroll" === f2 && D("scroll", a) : null != k2 && ta(a, f2, k2, g));
            }
            switch (c) {
              case "input":
                Va(a);
                db(a, d, false);
                break;
              case "textarea":
                Va(a);
                jb(a);
                break;
              case "option":
                null != d.value && a.setAttribute("value", "" + Sa(d.value));
                break;
              case "select":
                a.multiple = !!d.multiple;
                f2 = d.value;
                null != f2 ? fb(a, !!d.multiple, f2, false) : null != d.defaultValue && fb(
                  a,
                  !!d.multiple,
                  d.defaultValue,
                  true
                );
                break;
              default:
                "function" === typeof e.onClick && (a.onclick = Bf);
            }
            switch (c) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                d = !!d.autoFocus;
                break a;
              case "img":
                d = true;
                break a;
              default:
                d = false;
            }
          }
          d && (b.flags |= 4);
        }
        null !== b.ref && (b.flags |= 512, b.flags |= 2097152);
      }
      S(b);
      return null;
    case 6:
      if (a && null != b.stateNode) Cj(a, b, a.memoizedProps, d);
      else {
        if ("string" !== typeof d && null === b.stateNode) throw Error(p(166));
        c = xh(wh.current);
        xh(uh.current);
        if (Gg(b)) {
          d = b.stateNode;
          c = b.memoizedProps;
          d[Of] = b;
          if (f2 = d.nodeValue !== c) {
            if (a = xg, null !== a) switch (a.tag) {
              case 3:
                Af(d.nodeValue, c, 0 !== (a.mode & 1));
                break;
              case 5:
                true !== a.memoizedProps.suppressHydrationWarning && Af(d.nodeValue, c, 0 !== (a.mode & 1));
            }
          }
          f2 && (b.flags |= 4);
        } else d = (9 === c.nodeType ? c : c.ownerDocument).createTextNode(d), d[Of] = b, b.stateNode = d;
      }
      S(b);
      return null;
    case 13:
      E(L);
      d = b.memoizedState;
      if (null === a || null !== a.memoizedState && null !== a.memoizedState.dehydrated) {
        if (I && null !== yg && 0 !== (b.mode & 1) && 0 === (b.flags & 128)) Hg(), Ig(), b.flags |= 98560, f2 = false;
        else if (f2 = Gg(b), null !== d && null !== d.dehydrated) {
          if (null === a) {
            if (!f2) throw Error(p(318));
            f2 = b.memoizedState;
            f2 = null !== f2 ? f2.dehydrated : null;
            if (!f2) throw Error(p(317));
            f2[Of] = b;
          } else Ig(), 0 === (b.flags & 128) && (b.memoizedState = null), b.flags |= 4;
          S(b);
          f2 = false;
        } else null !== zg && (Fj(zg), zg = null), f2 = true;
        if (!f2) return b.flags & 65536 ? b : null;
      }
      if (0 !== (b.flags & 128)) return b.lanes = c, b;
      d = null !== d;
      d !== (null !== a && null !== a.memoizedState) && d && (b.child.flags |= 8192, 0 !== (b.mode & 1) && (null === a || 0 !== (L.current & 1) ? 0 === T && (T = 3) : tj()));
      null !== b.updateQueue && (b.flags |= 4);
      S(b);
      return null;
    case 4:
      return zh(), Aj(a, b), null === a && sf(b.stateNode.containerInfo), S(b), null;
    case 10:
      return ah(b.type._context), S(b), null;
    case 17:
      return Zf(b.type) && $f(), S(b), null;
    case 19:
      E(L);
      f2 = b.memoizedState;
      if (null === f2) return S(b), null;
      d = 0 !== (b.flags & 128);
      g = f2.rendering;
      if (null === g) if (d) Dj(f2, false);
      else {
        if (0 !== T || null !== a && 0 !== (a.flags & 128)) for (a = b.child; null !== a; ) {
          g = Ch(a);
          if (null !== g) {
            b.flags |= 128;
            Dj(f2, false);
            d = g.updateQueue;
            null !== d && (b.updateQueue = d, b.flags |= 4);
            b.subtreeFlags = 0;
            d = c;
            for (c = b.child; null !== c; ) f2 = c, a = d, f2.flags &= 14680066, g = f2.alternate, null === g ? (f2.childLanes = 0, f2.lanes = a, f2.child = null, f2.subtreeFlags = 0, f2.memoizedProps = null, f2.memoizedState = null, f2.updateQueue = null, f2.dependencies = null, f2.stateNode = null) : (f2.childLanes = g.childLanes, f2.lanes = g.lanes, f2.child = g.child, f2.subtreeFlags = 0, f2.deletions = null, f2.memoizedProps = g.memoizedProps, f2.memoizedState = g.memoizedState, f2.updateQueue = g.updateQueue, f2.type = g.type, a = g.dependencies, f2.dependencies = null === a ? null : { lanes: a.lanes, firstContext: a.firstContext }), c = c.sibling;
            G(L, L.current & 1 | 2);
            return b.child;
          }
          a = a.sibling;
        }
        null !== f2.tail && B() > Gj && (b.flags |= 128, d = true, Dj(f2, false), b.lanes = 4194304);
      }
      else {
        if (!d) if (a = Ch(g), null !== a) {
          if (b.flags |= 128, d = true, c = a.updateQueue, null !== c && (b.updateQueue = c, b.flags |= 4), Dj(f2, true), null === f2.tail && "hidden" === f2.tailMode && !g.alternate && !I) return S(b), null;
        } else 2 * B() - f2.renderingStartTime > Gj && 1073741824 !== c && (b.flags |= 128, d = true, Dj(f2, false), b.lanes = 4194304);
        f2.isBackwards ? (g.sibling = b.child, b.child = g) : (c = f2.last, null !== c ? c.sibling = g : b.child = g, f2.last = g);
      }
      if (null !== f2.tail) return b = f2.tail, f2.rendering = b, f2.tail = b.sibling, f2.renderingStartTime = B(), b.sibling = null, c = L.current, G(L, d ? c & 1 | 2 : c & 1), b;
      S(b);
      return null;
    case 22:
    case 23:
      return Hj(), d = null !== b.memoizedState, null !== a && null !== a.memoizedState !== d && (b.flags |= 8192), d && 0 !== (b.mode & 1) ? 0 !== (fj & 1073741824) && (S(b), b.subtreeFlags & 6 && (b.flags |= 8192)) : S(b), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(p(156, b.tag));
}
function Ij(a, b) {
  wg(b);
  switch (b.tag) {
    case 1:
      return Zf(b.type) && $f(), a = b.flags, a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
    case 3:
      return zh(), E(Wf), E(H), Eh(), a = b.flags, 0 !== (a & 65536) && 0 === (a & 128) ? (b.flags = a & -65537 | 128, b) : null;
    case 5:
      return Bh(b), null;
    case 13:
      E(L);
      a = b.memoizedState;
      if (null !== a && null !== a.dehydrated) {
        if (null === b.alternate) throw Error(p(340));
        Ig();
      }
      a = b.flags;
      return a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
    case 19:
      return E(L), null;
    case 4:
      return zh(), null;
    case 10:
      return ah(b.type._context), null;
    case 22:
    case 23:
      return Hj(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var Jj = false, U = false, Kj = "function" === typeof WeakSet ? WeakSet : Set, V = null;
function Lj(a, b) {
  var c = a.ref;
  if (null !== c) if ("function" === typeof c) try {
    c(null);
  } catch (d) {
    W(a, b, d);
  }
  else c.current = null;
}
function Mj(a, b, c) {
  try {
    c();
  } catch (d) {
    W(a, b, d);
  }
}
var Nj = false;
function Oj(a, b) {
  Cf = dd;
  a = Me();
  if (Ne(a)) {
    if ("selectionStart" in a) var c = { start: a.selectionStart, end: a.selectionEnd };
    else a: {
      c = (c = a.ownerDocument) && c.defaultView || window;
      var d = c.getSelection && c.getSelection();
      if (d && 0 !== d.rangeCount) {
        c = d.anchorNode;
        var e = d.anchorOffset, f2 = d.focusNode;
        d = d.focusOffset;
        try {
          c.nodeType, f2.nodeType;
        } catch (F2) {
          c = null;
          break a;
        }
        var g = 0, h = -1, k2 = -1, l2 = 0, m2 = 0, q2 = a, r2 = null;
        b: for (; ; ) {
          for (var y2; ; ) {
            q2 !== c || 0 !== e && 3 !== q2.nodeType || (h = g + e);
            q2 !== f2 || 0 !== d && 3 !== q2.nodeType || (k2 = g + d);
            3 === q2.nodeType && (g += q2.nodeValue.length);
            if (null === (y2 = q2.firstChild)) break;
            r2 = q2;
            q2 = y2;
          }
          for (; ; ) {
            if (q2 === a) break b;
            r2 === c && ++l2 === e && (h = g);
            r2 === f2 && ++m2 === d && (k2 = g);
            if (null !== (y2 = q2.nextSibling)) break;
            q2 = r2;
            r2 = q2.parentNode;
          }
          q2 = y2;
        }
        c = -1 === h || -1 === k2 ? null : { start: h, end: k2 };
      } else c = null;
    }
    c = c || { start: 0, end: 0 };
  } else c = null;
  Df = { focusedElem: a, selectionRange: c };
  dd = false;
  for (V = b; null !== V; ) if (b = V, a = b.child, 0 !== (b.subtreeFlags & 1028) && null !== a) a.return = b, V = a;
  else for (; null !== V; ) {
    b = V;
    try {
      var n2 = b.alternate;
      if (0 !== (b.flags & 1024)) switch (b.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if (null !== n2) {
            var t2 = n2.memoizedProps, J2 = n2.memoizedState, x2 = b.stateNode, w2 = x2.getSnapshotBeforeUpdate(b.elementType === b.type ? t2 : Ci(b.type, t2), J2);
            x2.__reactInternalSnapshotBeforeUpdate = w2;
          }
          break;
        case 3:
          var u2 = b.stateNode.containerInfo;
          1 === u2.nodeType ? u2.textContent = "" : 9 === u2.nodeType && u2.documentElement && u2.removeChild(u2.documentElement);
          break;
        case 5:
        case 6:
        case 4:
        case 17:
          break;
        default:
          throw Error(p(163));
      }
    } catch (F2) {
      W(b, b.return, F2);
    }
    a = b.sibling;
    if (null !== a) {
      a.return = b.return;
      V = a;
      break;
    }
    V = b.return;
  }
  n2 = Nj;
  Nj = false;
  return n2;
}
function Pj(a, b, c) {
  var d = b.updateQueue;
  d = null !== d ? d.lastEffect : null;
  if (null !== d) {
    var e = d = d.next;
    do {
      if ((e.tag & a) === a) {
        var f2 = e.destroy;
        e.destroy = void 0;
        void 0 !== f2 && Mj(b, c, f2);
      }
      e = e.next;
    } while (e !== d);
  }
}
function Qj(a, b) {
  b = b.updateQueue;
  b = null !== b ? b.lastEffect : null;
  if (null !== b) {
    var c = b = b.next;
    do {
      if ((c.tag & a) === a) {
        var d = c.create;
        c.destroy = d();
      }
      c = c.next;
    } while (c !== b);
  }
}
function Rj(a) {
  var b = a.ref;
  if (null !== b) {
    var c = a.stateNode;
    switch (a.tag) {
      case 5:
        a = c;
        break;
      default:
        a = c;
    }
    "function" === typeof b ? b(a) : b.current = a;
  }
}
function Sj(a) {
  var b = a.alternate;
  null !== b && (a.alternate = null, Sj(b));
  a.child = null;
  a.deletions = null;
  a.sibling = null;
  5 === a.tag && (b = a.stateNode, null !== b && (delete b[Of], delete b[Pf], delete b[of], delete b[Qf], delete b[Rf]));
  a.stateNode = null;
  a.return = null;
  a.dependencies = null;
  a.memoizedProps = null;
  a.memoizedState = null;
  a.pendingProps = null;
  a.stateNode = null;
  a.updateQueue = null;
}
function Tj(a) {
  return 5 === a.tag || 3 === a.tag || 4 === a.tag;
}
function Uj(a) {
  a: for (; ; ) {
    for (; null === a.sibling; ) {
      if (null === a.return || Tj(a.return)) return null;
      a = a.return;
    }
    a.sibling.return = a.return;
    for (a = a.sibling; 5 !== a.tag && 6 !== a.tag && 18 !== a.tag; ) {
      if (a.flags & 2) continue a;
      if (null === a.child || 4 === a.tag) continue a;
      else a.child.return = a, a = a.child;
    }
    if (!(a.flags & 2)) return a.stateNode;
  }
}
function Vj(a, b, c) {
  var d = a.tag;
  if (5 === d || 6 === d) a = a.stateNode, b ? 8 === c.nodeType ? c.parentNode.insertBefore(a, b) : c.insertBefore(a, b) : (8 === c.nodeType ? (b = c.parentNode, b.insertBefore(a, c)) : (b = c, b.appendChild(a)), c = c._reactRootContainer, null !== c && void 0 !== c || null !== b.onclick || (b.onclick = Bf));
  else if (4 !== d && (a = a.child, null !== a)) for (Vj(a, b, c), a = a.sibling; null !== a; ) Vj(a, b, c), a = a.sibling;
}
function Wj(a, b, c) {
  var d = a.tag;
  if (5 === d || 6 === d) a = a.stateNode, b ? c.insertBefore(a, b) : c.appendChild(a);
  else if (4 !== d && (a = a.child, null !== a)) for (Wj(a, b, c), a = a.sibling; null !== a; ) Wj(a, b, c), a = a.sibling;
}
var X$1 = null, Xj = false;
function Yj(a, b, c) {
  for (c = c.child; null !== c; ) Zj(a, b, c), c = c.sibling;
}
function Zj(a, b, c) {
  if (lc && "function" === typeof lc.onCommitFiberUnmount) try {
    lc.onCommitFiberUnmount(kc, c);
  } catch (h) {
  }
  switch (c.tag) {
    case 5:
      U || Lj(c, b);
    case 6:
      var d = X$1, e = Xj;
      X$1 = null;
      Yj(a, b, c);
      X$1 = d;
      Xj = e;
      null !== X$1 && (Xj ? (a = X$1, c = c.stateNode, 8 === a.nodeType ? a.parentNode.removeChild(c) : a.removeChild(c)) : X$1.removeChild(c.stateNode));
      break;
    case 18:
      null !== X$1 && (Xj ? (a = X$1, c = c.stateNode, 8 === a.nodeType ? Kf(a.parentNode, c) : 1 === a.nodeType && Kf(a, c), bd(a)) : Kf(X$1, c.stateNode));
      break;
    case 4:
      d = X$1;
      e = Xj;
      X$1 = c.stateNode.containerInfo;
      Xj = true;
      Yj(a, b, c);
      X$1 = d;
      Xj = e;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!U && (d = c.updateQueue, null !== d && (d = d.lastEffect, null !== d))) {
        e = d = d.next;
        do {
          var f2 = e, g = f2.destroy;
          f2 = f2.tag;
          void 0 !== g && (0 !== (f2 & 2) ? Mj(c, b, g) : 0 !== (f2 & 4) && Mj(c, b, g));
          e = e.next;
        } while (e !== d);
      }
      Yj(a, b, c);
      break;
    case 1:
      if (!U && (Lj(c, b), d = c.stateNode, "function" === typeof d.componentWillUnmount)) try {
        d.props = c.memoizedProps, d.state = c.memoizedState, d.componentWillUnmount();
      } catch (h) {
        W(c, b, h);
      }
      Yj(a, b, c);
      break;
    case 21:
      Yj(a, b, c);
      break;
    case 22:
      c.mode & 1 ? (U = (d = U) || null !== c.memoizedState, Yj(a, b, c), U = d) : Yj(a, b, c);
      break;
    default:
      Yj(a, b, c);
  }
}
function ak(a) {
  var b = a.updateQueue;
  if (null !== b) {
    a.updateQueue = null;
    var c = a.stateNode;
    null === c && (c = a.stateNode = new Kj());
    b.forEach(function(b2) {
      var d = bk.bind(null, a, b2);
      c.has(b2) || (c.add(b2), b2.then(d, d));
    });
  }
}
function ck(a, b) {
  var c = b.deletions;
  if (null !== c) for (var d = 0; d < c.length; d++) {
    var e = c[d];
    try {
      var f2 = a, g = b, h = g;
      a: for (; null !== h; ) {
        switch (h.tag) {
          case 5:
            X$1 = h.stateNode;
            Xj = false;
            break a;
          case 3:
            X$1 = h.stateNode.containerInfo;
            Xj = true;
            break a;
          case 4:
            X$1 = h.stateNode.containerInfo;
            Xj = true;
            break a;
        }
        h = h.return;
      }
      if (null === X$1) throw Error(p(160));
      Zj(f2, g, e);
      X$1 = null;
      Xj = false;
      var k2 = e.alternate;
      null !== k2 && (k2.return = null);
      e.return = null;
    } catch (l2) {
      W(e, b, l2);
    }
  }
  if (b.subtreeFlags & 12854) for (b = b.child; null !== b; ) dk(b, a), b = b.sibling;
}
function dk(a, b) {
  var c = a.alternate, d = a.flags;
  switch (a.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      ck(b, a);
      ek(a);
      if (d & 4) {
        try {
          Pj(3, a, a.return), Qj(3, a);
        } catch (t2) {
          W(a, a.return, t2);
        }
        try {
          Pj(5, a, a.return);
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      break;
    case 1:
      ck(b, a);
      ek(a);
      d & 512 && null !== c && Lj(c, c.return);
      break;
    case 5:
      ck(b, a);
      ek(a);
      d & 512 && null !== c && Lj(c, c.return);
      if (a.flags & 32) {
        var e = a.stateNode;
        try {
          ob(e, "");
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      if (d & 4 && (e = a.stateNode, null != e)) {
        var f2 = a.memoizedProps, g = null !== c ? c.memoizedProps : f2, h = a.type, k2 = a.updateQueue;
        a.updateQueue = null;
        if (null !== k2) try {
          "input" === h && "radio" === f2.type && null != f2.name && ab(e, f2);
          vb(h, g);
          var l2 = vb(h, f2);
          for (g = 0; g < k2.length; g += 2) {
            var m2 = k2[g], q2 = k2[g + 1];
            "style" === m2 ? sb(e, q2) : "dangerouslySetInnerHTML" === m2 ? nb(e, q2) : "children" === m2 ? ob(e, q2) : ta(e, m2, q2, l2);
          }
          switch (h) {
            case "input":
              bb(e, f2);
              break;
            case "textarea":
              ib(e, f2);
              break;
            case "select":
              var r2 = e._wrapperState.wasMultiple;
              e._wrapperState.wasMultiple = !!f2.multiple;
              var y2 = f2.value;
              null != y2 ? fb(e, !!f2.multiple, y2, false) : r2 !== !!f2.multiple && (null != f2.defaultValue ? fb(
                e,
                !!f2.multiple,
                f2.defaultValue,
                true
              ) : fb(e, !!f2.multiple, f2.multiple ? [] : "", false));
          }
          e[Pf] = f2;
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      break;
    case 6:
      ck(b, a);
      ek(a);
      if (d & 4) {
        if (null === a.stateNode) throw Error(p(162));
        e = a.stateNode;
        f2 = a.memoizedProps;
        try {
          e.nodeValue = f2;
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      break;
    case 3:
      ck(b, a);
      ek(a);
      if (d & 4 && null !== c && c.memoizedState.isDehydrated) try {
        bd(b.containerInfo);
      } catch (t2) {
        W(a, a.return, t2);
      }
      break;
    case 4:
      ck(b, a);
      ek(a);
      break;
    case 13:
      ck(b, a);
      ek(a);
      e = a.child;
      e.flags & 8192 && (f2 = null !== e.memoizedState, e.stateNode.isHidden = f2, !f2 || null !== e.alternate && null !== e.alternate.memoizedState || (fk = B()));
      d & 4 && ak(a);
      break;
    case 22:
      m2 = null !== c && null !== c.memoizedState;
      a.mode & 1 ? (U = (l2 = U) || m2, ck(b, a), U = l2) : ck(b, a);
      ek(a);
      if (d & 8192) {
        l2 = null !== a.memoizedState;
        if ((a.stateNode.isHidden = l2) && !m2 && 0 !== (a.mode & 1)) for (V = a, m2 = a.child; null !== m2; ) {
          for (q2 = V = m2; null !== V; ) {
            r2 = V;
            y2 = r2.child;
            switch (r2.tag) {
              case 0:
              case 11:
              case 14:
              case 15:
                Pj(4, r2, r2.return);
                break;
              case 1:
                Lj(r2, r2.return);
                var n2 = r2.stateNode;
                if ("function" === typeof n2.componentWillUnmount) {
                  d = r2;
                  c = r2.return;
                  try {
                    b = d, n2.props = b.memoizedProps, n2.state = b.memoizedState, n2.componentWillUnmount();
                  } catch (t2) {
                    W(d, c, t2);
                  }
                }
                break;
              case 5:
                Lj(r2, r2.return);
                break;
              case 22:
                if (null !== r2.memoizedState) {
                  gk(q2);
                  continue;
                }
            }
            null !== y2 ? (y2.return = r2, V = y2) : gk(q2);
          }
          m2 = m2.sibling;
        }
        a: for (m2 = null, q2 = a; ; ) {
          if (5 === q2.tag) {
            if (null === m2) {
              m2 = q2;
              try {
                e = q2.stateNode, l2 ? (f2 = e.style, "function" === typeof f2.setProperty ? f2.setProperty("display", "none", "important") : f2.display = "none") : (h = q2.stateNode, k2 = q2.memoizedProps.style, g = void 0 !== k2 && null !== k2 && k2.hasOwnProperty("display") ? k2.display : null, h.style.display = rb("display", g));
              } catch (t2) {
                W(a, a.return, t2);
              }
            }
          } else if (6 === q2.tag) {
            if (null === m2) try {
              q2.stateNode.nodeValue = l2 ? "" : q2.memoizedProps;
            } catch (t2) {
              W(a, a.return, t2);
            }
          } else if ((22 !== q2.tag && 23 !== q2.tag || null === q2.memoizedState || q2 === a) && null !== q2.child) {
            q2.child.return = q2;
            q2 = q2.child;
            continue;
          }
          if (q2 === a) break a;
          for (; null === q2.sibling; ) {
            if (null === q2.return || q2.return === a) break a;
            m2 === q2 && (m2 = null);
            q2 = q2.return;
          }
          m2 === q2 && (m2 = null);
          q2.sibling.return = q2.return;
          q2 = q2.sibling;
        }
      }
      break;
    case 19:
      ck(b, a);
      ek(a);
      d & 4 && ak(a);
      break;
    case 21:
      break;
    default:
      ck(
        b,
        a
      ), ek(a);
  }
}
function ek(a) {
  var b = a.flags;
  if (b & 2) {
    try {
      a: {
        for (var c = a.return; null !== c; ) {
          if (Tj(c)) {
            var d = c;
            break a;
          }
          c = c.return;
        }
        throw Error(p(160));
      }
      switch (d.tag) {
        case 5:
          var e = d.stateNode;
          d.flags & 32 && (ob(e, ""), d.flags &= -33);
          var f2 = Uj(a);
          Wj(a, f2, e);
          break;
        case 3:
        case 4:
          var g = d.stateNode.containerInfo, h = Uj(a);
          Vj(a, h, g);
          break;
        default:
          throw Error(p(161));
      }
    } catch (k2) {
      W(a, a.return, k2);
    }
    a.flags &= -3;
  }
  b & 4096 && (a.flags &= -4097);
}
function hk(a, b, c) {
  V = a;
  ik(a);
}
function ik(a, b, c) {
  for (var d = 0 !== (a.mode & 1); null !== V; ) {
    var e = V, f2 = e.child;
    if (22 === e.tag && d) {
      var g = null !== e.memoizedState || Jj;
      if (!g) {
        var h = e.alternate, k2 = null !== h && null !== h.memoizedState || U;
        h = Jj;
        var l2 = U;
        Jj = g;
        if ((U = k2) && !l2) for (V = e; null !== V; ) g = V, k2 = g.child, 22 === g.tag && null !== g.memoizedState ? jk(e) : null !== k2 ? (k2.return = g, V = k2) : jk(e);
        for (; null !== f2; ) V = f2, ik(f2), f2 = f2.sibling;
        V = e;
        Jj = h;
        U = l2;
      }
      kk(a);
    } else 0 !== (e.subtreeFlags & 8772) && null !== f2 ? (f2.return = e, V = f2) : kk(a);
  }
}
function kk(a) {
  for (; null !== V; ) {
    var b = V;
    if (0 !== (b.flags & 8772)) {
      var c = b.alternate;
      try {
        if (0 !== (b.flags & 8772)) switch (b.tag) {
          case 0:
          case 11:
          case 15:
            U || Qj(5, b);
            break;
          case 1:
            var d = b.stateNode;
            if (b.flags & 4 && !U) if (null === c) d.componentDidMount();
            else {
              var e = b.elementType === b.type ? c.memoizedProps : Ci(b.type, c.memoizedProps);
              d.componentDidUpdate(e, c.memoizedState, d.__reactInternalSnapshotBeforeUpdate);
            }
            var f2 = b.updateQueue;
            null !== f2 && sh(b, f2, d);
            break;
          case 3:
            var g = b.updateQueue;
            if (null !== g) {
              c = null;
              if (null !== b.child) switch (b.child.tag) {
                case 5:
                  c = b.child.stateNode;
                  break;
                case 1:
                  c = b.child.stateNode;
              }
              sh(b, g, c);
            }
            break;
          case 5:
            var h = b.stateNode;
            if (null === c && b.flags & 4) {
              c = h;
              var k2 = b.memoizedProps;
              switch (b.type) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  k2.autoFocus && c.focus();
                  break;
                case "img":
                  k2.src && (c.src = k2.src);
              }
            }
            break;
          case 6:
            break;
          case 4:
            break;
          case 12:
            break;
          case 13:
            if (null === b.memoizedState) {
              var l2 = b.alternate;
              if (null !== l2) {
                var m2 = l2.memoizedState;
                if (null !== m2) {
                  var q2 = m2.dehydrated;
                  null !== q2 && bd(q2);
                }
              }
            }
            break;
          case 19:
          case 17:
          case 21:
          case 22:
          case 23:
          case 25:
            break;
          default:
            throw Error(p(163));
        }
        U || b.flags & 512 && Rj(b);
      } catch (r2) {
        W(b, b.return, r2);
      }
    }
    if (b === a) {
      V = null;
      break;
    }
    c = b.sibling;
    if (null !== c) {
      c.return = b.return;
      V = c;
      break;
    }
    V = b.return;
  }
}
function gk(a) {
  for (; null !== V; ) {
    var b = V;
    if (b === a) {
      V = null;
      break;
    }
    var c = b.sibling;
    if (null !== c) {
      c.return = b.return;
      V = c;
      break;
    }
    V = b.return;
  }
}
function jk(a) {
  for (; null !== V; ) {
    var b = V;
    try {
      switch (b.tag) {
        case 0:
        case 11:
        case 15:
          var c = b.return;
          try {
            Qj(4, b);
          } catch (k2) {
            W(b, c, k2);
          }
          break;
        case 1:
          var d = b.stateNode;
          if ("function" === typeof d.componentDidMount) {
            var e = b.return;
            try {
              d.componentDidMount();
            } catch (k2) {
              W(b, e, k2);
            }
          }
          var f2 = b.return;
          try {
            Rj(b);
          } catch (k2) {
            W(b, f2, k2);
          }
          break;
        case 5:
          var g = b.return;
          try {
            Rj(b);
          } catch (k2) {
            W(b, g, k2);
          }
      }
    } catch (k2) {
      W(b, b.return, k2);
    }
    if (b === a) {
      V = null;
      break;
    }
    var h = b.sibling;
    if (null !== h) {
      h.return = b.return;
      V = h;
      break;
    }
    V = b.return;
  }
}
var lk = Math.ceil, mk = ua.ReactCurrentDispatcher, nk = ua.ReactCurrentOwner, ok = ua.ReactCurrentBatchConfig, K = 0, Q = null, Y = null, Z = 0, fj = 0, ej = Uf(0), T = 0, pk = null, rh = 0, qk = 0, rk = 0, sk = null, tk = null, fk = 0, Gj = Infinity, uk = null, Oi = false, Pi = null, Ri = null, vk = false, wk = null, xk = 0, yk = 0, zk = null, Ak = -1, Bk = 0;
function R() {
  return 0 !== (K & 6) ? B() : -1 !== Ak ? Ak : Ak = B();
}
function yi(a) {
  if (0 === (a.mode & 1)) return 1;
  if (0 !== (K & 2) && 0 !== Z) return Z & -Z;
  if (null !== Kg.transition) return 0 === Bk && (Bk = yc()), Bk;
  a = C;
  if (0 !== a) return a;
  a = window.event;
  a = void 0 === a ? 16 : jd(a.type);
  return a;
}
function gi(a, b, c, d) {
  if (50 < yk) throw yk = 0, zk = null, Error(p(185));
  Ac(a, c, d);
  if (0 === (K & 2) || a !== Q) a === Q && (0 === (K & 2) && (qk |= c), 4 === T && Ck(a, Z)), Dk(a, d), 1 === c && 0 === K && 0 === (b.mode & 1) && (Gj = B() + 500, fg && jg());
}
function Dk(a, b) {
  var c = a.callbackNode;
  wc(a, b);
  var d = uc(a, a === Q ? Z : 0);
  if (0 === d) null !== c && bc(c), a.callbackNode = null, a.callbackPriority = 0;
  else if (b = d & -d, a.callbackPriority !== b) {
    null != c && bc(c);
    if (1 === b) 0 === a.tag ? ig(Ek.bind(null, a)) : hg(Ek.bind(null, a)), Jf(function() {
      0 === (K & 6) && jg();
    }), c = null;
    else {
      switch (Dc(d)) {
        case 1:
          c = fc;
          break;
        case 4:
          c = gc;
          break;
        case 16:
          c = hc;
          break;
        case 536870912:
          c = jc;
          break;
        default:
          c = hc;
      }
      c = Fk(c, Gk.bind(null, a));
    }
    a.callbackPriority = b;
    a.callbackNode = c;
  }
}
function Gk(a, b) {
  Ak = -1;
  Bk = 0;
  if (0 !== (K & 6)) throw Error(p(327));
  var c = a.callbackNode;
  if (Hk() && a.callbackNode !== c) return null;
  var d = uc(a, a === Q ? Z : 0);
  if (0 === d) return null;
  if (0 !== (d & 30) || 0 !== (d & a.expiredLanes) || b) b = Ik(a, d);
  else {
    b = d;
    var e = K;
    K |= 2;
    var f2 = Jk();
    if (Q !== a || Z !== b) uk = null, Gj = B() + 500, Kk(a, b);
    do
      try {
        Lk();
        break;
      } catch (h) {
        Mk(a, h);
      }
    while (1);
    $g();
    mk.current = f2;
    K = e;
    null !== Y ? b = 0 : (Q = null, Z = 0, b = T);
  }
  if (0 !== b) {
    2 === b && (e = xc(a), 0 !== e && (d = e, b = Nk(a, e)));
    if (1 === b) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
    if (6 === b) Ck(a, d);
    else {
      e = a.current.alternate;
      if (0 === (d & 30) && !Ok(e) && (b = Ik(a, d), 2 === b && (f2 = xc(a), 0 !== f2 && (d = f2, b = Nk(a, f2))), 1 === b)) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
      a.finishedWork = e;
      a.finishedLanes = d;
      switch (b) {
        case 0:
        case 1:
          throw Error(p(345));
        case 2:
          Pk(a, tk, uk);
          break;
        case 3:
          Ck(a, d);
          if ((d & 130023424) === d && (b = fk + 500 - B(), 10 < b)) {
            if (0 !== uc(a, 0)) break;
            e = a.suspendedLanes;
            if ((e & d) !== d) {
              R();
              a.pingedLanes |= a.suspendedLanes & e;
              break;
            }
            a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), b);
            break;
          }
          Pk(a, tk, uk);
          break;
        case 4:
          Ck(a, d);
          if ((d & 4194240) === d) break;
          b = a.eventTimes;
          for (e = -1; 0 < d; ) {
            var g = 31 - oc(d);
            f2 = 1 << g;
            g = b[g];
            g > e && (e = g);
            d &= ~f2;
          }
          d = e;
          d = B() - d;
          d = (120 > d ? 120 : 480 > d ? 480 : 1080 > d ? 1080 : 1920 > d ? 1920 : 3e3 > d ? 3e3 : 4320 > d ? 4320 : 1960 * lk(d / 1960)) - d;
          if (10 < d) {
            a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), d);
            break;
          }
          Pk(a, tk, uk);
          break;
        case 5:
          Pk(a, tk, uk);
          break;
        default:
          throw Error(p(329));
      }
    }
  }
  Dk(a, B());
  return a.callbackNode === c ? Gk.bind(null, a) : null;
}
function Nk(a, b) {
  var c = sk;
  a.current.memoizedState.isDehydrated && (Kk(a, b).flags |= 256);
  a = Ik(a, b);
  2 !== a && (b = tk, tk = c, null !== b && Fj(b));
  return a;
}
function Fj(a) {
  null === tk ? tk = a : tk.push.apply(tk, a);
}
function Ok(a) {
  for (var b = a; ; ) {
    if (b.flags & 16384) {
      var c = b.updateQueue;
      if (null !== c && (c = c.stores, null !== c)) for (var d = 0; d < c.length; d++) {
        var e = c[d], f2 = e.getSnapshot;
        e = e.value;
        try {
          if (!He(f2(), e)) return false;
        } catch (g) {
          return false;
        }
      }
    }
    c = b.child;
    if (b.subtreeFlags & 16384 && null !== c) c.return = b, b = c;
    else {
      if (b === a) break;
      for (; null === b.sibling; ) {
        if (null === b.return || b.return === a) return true;
        b = b.return;
      }
      b.sibling.return = b.return;
      b = b.sibling;
    }
  }
  return true;
}
function Ck(a, b) {
  b &= ~rk;
  b &= ~qk;
  a.suspendedLanes |= b;
  a.pingedLanes &= ~b;
  for (a = a.expirationTimes; 0 < b; ) {
    var c = 31 - oc(b), d = 1 << c;
    a[c] = -1;
    b &= ~d;
  }
}
function Ek(a) {
  if (0 !== (K & 6)) throw Error(p(327));
  Hk();
  var b = uc(a, 0);
  if (0 === (b & 1)) return Dk(a, B()), null;
  var c = Ik(a, b);
  if (0 !== a.tag && 2 === c) {
    var d = xc(a);
    0 !== d && (b = d, c = Nk(a, d));
  }
  if (1 === c) throw c = pk, Kk(a, 0), Ck(a, b), Dk(a, B()), c;
  if (6 === c) throw Error(p(345));
  a.finishedWork = a.current.alternate;
  a.finishedLanes = b;
  Pk(a, tk, uk);
  Dk(a, B());
  return null;
}
function Qk(a, b) {
  var c = K;
  K |= 1;
  try {
    return a(b);
  } finally {
    K = c, 0 === K && (Gj = B() + 500, fg && jg());
  }
}
function Rk(a) {
  null !== wk && 0 === wk.tag && 0 === (K & 6) && Hk();
  var b = K;
  K |= 1;
  var c = ok.transition, d = C;
  try {
    if (ok.transition = null, C = 1, a) return a();
  } finally {
    C = d, ok.transition = c, K = b, 0 === (K & 6) && jg();
  }
}
function Hj() {
  fj = ej.current;
  E(ej);
}
function Kk(a, b) {
  a.finishedWork = null;
  a.finishedLanes = 0;
  var c = a.timeoutHandle;
  -1 !== c && (a.timeoutHandle = -1, Gf(c));
  if (null !== Y) for (c = Y.return; null !== c; ) {
    var d = c;
    wg(d);
    switch (d.tag) {
      case 1:
        d = d.type.childContextTypes;
        null !== d && void 0 !== d && $f();
        break;
      case 3:
        zh();
        E(Wf);
        E(H);
        Eh();
        break;
      case 5:
        Bh(d);
        break;
      case 4:
        zh();
        break;
      case 13:
        E(L);
        break;
      case 19:
        E(L);
        break;
      case 10:
        ah(d.type._context);
        break;
      case 22:
      case 23:
        Hj();
    }
    c = c.return;
  }
  Q = a;
  Y = a = Pg(a.current, null);
  Z = fj = b;
  T = 0;
  pk = null;
  rk = qk = rh = 0;
  tk = sk = null;
  if (null !== fh) {
    for (b = 0; b < fh.length; b++) if (c = fh[b], d = c.interleaved, null !== d) {
      c.interleaved = null;
      var e = d.next, f2 = c.pending;
      if (null !== f2) {
        var g = f2.next;
        f2.next = e;
        d.next = g;
      }
      c.pending = d;
    }
    fh = null;
  }
  return a;
}
function Mk(a, b) {
  do {
    var c = Y;
    try {
      $g();
      Fh.current = Rh;
      if (Ih) {
        for (var d = M.memoizedState; null !== d; ) {
          var e = d.queue;
          null !== e && (e.pending = null);
          d = d.next;
        }
        Ih = false;
      }
      Hh = 0;
      O = N = M = null;
      Jh = false;
      Kh = 0;
      nk.current = null;
      if (null === c || null === c.return) {
        T = 1;
        pk = b;
        Y = null;
        break;
      }
      a: {
        var f2 = a, g = c.return, h = c, k2 = b;
        b = Z;
        h.flags |= 32768;
        if (null !== k2 && "object" === typeof k2 && "function" === typeof k2.then) {
          var l2 = k2, m2 = h, q2 = m2.tag;
          if (0 === (m2.mode & 1) && (0 === q2 || 11 === q2 || 15 === q2)) {
            var r2 = m2.alternate;
            r2 ? (m2.updateQueue = r2.updateQueue, m2.memoizedState = r2.memoizedState, m2.lanes = r2.lanes) : (m2.updateQueue = null, m2.memoizedState = null);
          }
          var y2 = Ui(g);
          if (null !== y2) {
            y2.flags &= -257;
            Vi(y2, g, h, f2, b);
            y2.mode & 1 && Si(f2, l2, b);
            b = y2;
            k2 = l2;
            var n2 = b.updateQueue;
            if (null === n2) {
              var t2 = /* @__PURE__ */ new Set();
              t2.add(k2);
              b.updateQueue = t2;
            } else n2.add(k2);
            break a;
          } else {
            if (0 === (b & 1)) {
              Si(f2, l2, b);
              tj();
              break a;
            }
            k2 = Error(p(426));
          }
        } else if (I && h.mode & 1) {
          var J2 = Ui(g);
          if (null !== J2) {
            0 === (J2.flags & 65536) && (J2.flags |= 256);
            Vi(J2, g, h, f2, b);
            Jg(Ji(k2, h));
            break a;
          }
        }
        f2 = k2 = Ji(k2, h);
        4 !== T && (T = 2);
        null === sk ? sk = [f2] : sk.push(f2);
        f2 = g;
        do {
          switch (f2.tag) {
            case 3:
              f2.flags |= 65536;
              b &= -b;
              f2.lanes |= b;
              var x2 = Ni(f2, k2, b);
              ph(f2, x2);
              break a;
            case 1:
              h = k2;
              var w2 = f2.type, u2 = f2.stateNode;
              if (0 === (f2.flags & 128) && ("function" === typeof w2.getDerivedStateFromError || null !== u2 && "function" === typeof u2.componentDidCatch && (null === Ri || !Ri.has(u2)))) {
                f2.flags |= 65536;
                b &= -b;
                f2.lanes |= b;
                var F2 = Qi(f2, h, b);
                ph(f2, F2);
                break a;
              }
          }
          f2 = f2.return;
        } while (null !== f2);
      }
      Sk(c);
    } catch (na) {
      b = na;
      Y === c && null !== c && (Y = c = c.return);
      continue;
    }
    break;
  } while (1);
}
function Jk() {
  var a = mk.current;
  mk.current = Rh;
  return null === a ? Rh : a;
}
function tj() {
  if (0 === T || 3 === T || 2 === T) T = 4;
  null === Q || 0 === (rh & 268435455) && 0 === (qk & 268435455) || Ck(Q, Z);
}
function Ik(a, b) {
  var c = K;
  K |= 2;
  var d = Jk();
  if (Q !== a || Z !== b) uk = null, Kk(a, b);
  do
    try {
      Tk();
      break;
    } catch (e) {
      Mk(a, e);
    }
  while (1);
  $g();
  K = c;
  mk.current = d;
  if (null !== Y) throw Error(p(261));
  Q = null;
  Z = 0;
  return T;
}
function Tk() {
  for (; null !== Y; ) Uk(Y);
}
function Lk() {
  for (; null !== Y && !cc(); ) Uk(Y);
}
function Uk(a) {
  var b = Vk(a.alternate, a, fj);
  a.memoizedProps = a.pendingProps;
  null === b ? Sk(a) : Y = b;
  nk.current = null;
}
function Sk(a) {
  var b = a;
  do {
    var c = b.alternate;
    a = b.return;
    if (0 === (b.flags & 32768)) {
      if (c = Ej(c, b, fj), null !== c) {
        Y = c;
        return;
      }
    } else {
      c = Ij(c, b);
      if (null !== c) {
        c.flags &= 32767;
        Y = c;
        return;
      }
      if (null !== a) a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null;
      else {
        T = 6;
        Y = null;
        return;
      }
    }
    b = b.sibling;
    if (null !== b) {
      Y = b;
      return;
    }
    Y = b = a;
  } while (null !== b);
  0 === T && (T = 5);
}
function Pk(a, b, c) {
  var d = C, e = ok.transition;
  try {
    ok.transition = null, C = 1, Wk(a, b, c, d);
  } finally {
    ok.transition = e, C = d;
  }
  return null;
}
function Wk(a, b, c, d) {
  do
    Hk();
  while (null !== wk);
  if (0 !== (K & 6)) throw Error(p(327));
  c = a.finishedWork;
  var e = a.finishedLanes;
  if (null === c) return null;
  a.finishedWork = null;
  a.finishedLanes = 0;
  if (c === a.current) throw Error(p(177));
  a.callbackNode = null;
  a.callbackPriority = 0;
  var f2 = c.lanes | c.childLanes;
  Bc(a, f2);
  a === Q && (Y = Q = null, Z = 0);
  0 === (c.subtreeFlags & 2064) && 0 === (c.flags & 2064) || vk || (vk = true, Fk(hc, function() {
    Hk();
    return null;
  }));
  f2 = 0 !== (c.flags & 15990);
  if (0 !== (c.subtreeFlags & 15990) || f2) {
    f2 = ok.transition;
    ok.transition = null;
    var g = C;
    C = 1;
    var h = K;
    K |= 4;
    nk.current = null;
    Oj(a, c);
    dk(c, a);
    Oe(Df);
    dd = !!Cf;
    Df = Cf = null;
    a.current = c;
    hk(c);
    dc();
    K = h;
    C = g;
    ok.transition = f2;
  } else a.current = c;
  vk && (vk = false, wk = a, xk = e);
  f2 = a.pendingLanes;
  0 === f2 && (Ri = null);
  mc(c.stateNode);
  Dk(a, B());
  if (null !== b) for (d = a.onRecoverableError, c = 0; c < b.length; c++) e = b[c], d(e.value, { componentStack: e.stack, digest: e.digest });
  if (Oi) throw Oi = false, a = Pi, Pi = null, a;
  0 !== (xk & 1) && 0 !== a.tag && Hk();
  f2 = a.pendingLanes;
  0 !== (f2 & 1) ? a === zk ? yk++ : (yk = 0, zk = a) : yk = 0;
  jg();
  return null;
}
function Hk() {
  if (null !== wk) {
    var a = Dc(xk), b = ok.transition, c = C;
    try {
      ok.transition = null;
      C = 16 > a ? 16 : a;
      if (null === wk) var d = false;
      else {
        a = wk;
        wk = null;
        xk = 0;
        if (0 !== (K & 6)) throw Error(p(331));
        var e = K;
        K |= 4;
        for (V = a.current; null !== V; ) {
          var f2 = V, g = f2.child;
          if (0 !== (V.flags & 16)) {
            var h = f2.deletions;
            if (null !== h) {
              for (var k2 = 0; k2 < h.length; k2++) {
                var l2 = h[k2];
                for (V = l2; null !== V; ) {
                  var m2 = V;
                  switch (m2.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Pj(8, m2, f2);
                  }
                  var q2 = m2.child;
                  if (null !== q2) q2.return = m2, V = q2;
                  else for (; null !== V; ) {
                    m2 = V;
                    var r2 = m2.sibling, y2 = m2.return;
                    Sj(m2);
                    if (m2 === l2) {
                      V = null;
                      break;
                    }
                    if (null !== r2) {
                      r2.return = y2;
                      V = r2;
                      break;
                    }
                    V = y2;
                  }
                }
              }
              var n2 = f2.alternate;
              if (null !== n2) {
                var t2 = n2.child;
                if (null !== t2) {
                  n2.child = null;
                  do {
                    var J2 = t2.sibling;
                    t2.sibling = null;
                    t2 = J2;
                  } while (null !== t2);
                }
              }
              V = f2;
            }
          }
          if (0 !== (f2.subtreeFlags & 2064) && null !== g) g.return = f2, V = g;
          else b: for (; null !== V; ) {
            f2 = V;
            if (0 !== (f2.flags & 2048)) switch (f2.tag) {
              case 0:
              case 11:
              case 15:
                Pj(9, f2, f2.return);
            }
            var x2 = f2.sibling;
            if (null !== x2) {
              x2.return = f2.return;
              V = x2;
              break b;
            }
            V = f2.return;
          }
        }
        var w2 = a.current;
        for (V = w2; null !== V; ) {
          g = V;
          var u2 = g.child;
          if (0 !== (g.subtreeFlags & 2064) && null !== u2) u2.return = g, V = u2;
          else b: for (g = w2; null !== V; ) {
            h = V;
            if (0 !== (h.flags & 2048)) try {
              switch (h.tag) {
                case 0:
                case 11:
                case 15:
                  Qj(9, h);
              }
            } catch (na) {
              W(h, h.return, na);
            }
            if (h === g) {
              V = null;
              break b;
            }
            var F2 = h.sibling;
            if (null !== F2) {
              F2.return = h.return;
              V = F2;
              break b;
            }
            V = h.return;
          }
        }
        K = e;
        jg();
        if (lc && "function" === typeof lc.onPostCommitFiberRoot) try {
          lc.onPostCommitFiberRoot(kc, a);
        } catch (na) {
        }
        d = true;
      }
      return d;
    } finally {
      C = c, ok.transition = b;
    }
  }
  return false;
}
function Xk(a, b, c) {
  b = Ji(c, b);
  b = Ni(a, b, 1);
  a = nh(a, b, 1);
  b = R();
  null !== a && (Ac(a, 1, b), Dk(a, b));
}
function W(a, b, c) {
  if (3 === a.tag) Xk(a, a, c);
  else for (; null !== b; ) {
    if (3 === b.tag) {
      Xk(b, a, c);
      break;
    } else if (1 === b.tag) {
      var d = b.stateNode;
      if ("function" === typeof b.type.getDerivedStateFromError || "function" === typeof d.componentDidCatch && (null === Ri || !Ri.has(d))) {
        a = Ji(c, a);
        a = Qi(b, a, 1);
        b = nh(b, a, 1);
        a = R();
        null !== b && (Ac(b, 1, a), Dk(b, a));
        break;
      }
    }
    b = b.return;
  }
}
function Ti(a, b, c) {
  var d = a.pingCache;
  null !== d && d.delete(b);
  b = R();
  a.pingedLanes |= a.suspendedLanes & c;
  Q === a && (Z & c) === c && (4 === T || 3 === T && (Z & 130023424) === Z && 500 > B() - fk ? Kk(a, 0) : rk |= c);
  Dk(a, b);
}
function Yk(a, b) {
  0 === b && (0 === (a.mode & 1) ? b = 1 : (b = sc, sc <<= 1, 0 === (sc & 130023424) && (sc = 4194304)));
  var c = R();
  a = ih(a, b);
  null !== a && (Ac(a, b, c), Dk(a, c));
}
function uj(a) {
  var b = a.memoizedState, c = 0;
  null !== b && (c = b.retryLane);
  Yk(a, c);
}
function bk(a, b) {
  var c = 0;
  switch (a.tag) {
    case 13:
      var d = a.stateNode;
      var e = a.memoizedState;
      null !== e && (c = e.retryLane);
      break;
    case 19:
      d = a.stateNode;
      break;
    default:
      throw Error(p(314));
  }
  null !== d && d.delete(b);
  Yk(a, c);
}
var Vk;
Vk = function(a, b, c) {
  if (null !== a) if (a.memoizedProps !== b.pendingProps || Wf.current) dh = true;
  else {
    if (0 === (a.lanes & c) && 0 === (b.flags & 128)) return dh = false, yj(a, b, c);
    dh = 0 !== (a.flags & 131072) ? true : false;
  }
  else dh = false, I && 0 !== (b.flags & 1048576) && ug(b, ng, b.index);
  b.lanes = 0;
  switch (b.tag) {
    case 2:
      var d = b.type;
      ij(a, b);
      a = b.pendingProps;
      var e = Yf(b, H.current);
      ch(b, c);
      e = Nh(null, b, d, a, e, c);
      var f2 = Sh();
      b.flags |= 1;
      "object" === typeof e && null !== e && "function" === typeof e.render && void 0 === e.$$typeof ? (b.tag = 1, b.memoizedState = null, b.updateQueue = null, Zf(d) ? (f2 = true, cg(b)) : f2 = false, b.memoizedState = null !== e.state && void 0 !== e.state ? e.state : null, kh(b), e.updater = Ei, b.stateNode = e, e._reactInternals = b, Ii(b, d, a, c), b = jj(null, b, d, true, f2, c)) : (b.tag = 0, I && f2 && vg(b), Xi(null, b, e, c), b = b.child);
      return b;
    case 16:
      d = b.elementType;
      a: {
        ij(a, b);
        a = b.pendingProps;
        e = d._init;
        d = e(d._payload);
        b.type = d;
        e = b.tag = Zk(d);
        a = Ci(d, a);
        switch (e) {
          case 0:
            b = cj(null, b, d, a, c);
            break a;
          case 1:
            b = hj(null, b, d, a, c);
            break a;
          case 11:
            b = Yi(null, b, d, a, c);
            break a;
          case 14:
            b = $i(null, b, d, Ci(d.type, a), c);
            break a;
        }
        throw Error(p(
          306,
          d,
          ""
        ));
      }
      return b;
    case 0:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), cj(a, b, d, e, c);
    case 1:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), hj(a, b, d, e, c);
    case 3:
      a: {
        kj(b);
        if (null === a) throw Error(p(387));
        d = b.pendingProps;
        f2 = b.memoizedState;
        e = f2.element;
        lh(a, b);
        qh(b, d, null, c);
        var g = b.memoizedState;
        d = g.element;
        if (f2.isDehydrated) if (f2 = { element: d, isDehydrated: false, cache: g.cache, pendingSuspenseBoundaries: g.pendingSuspenseBoundaries, transitions: g.transitions }, b.updateQueue.baseState = f2, b.memoizedState = f2, b.flags & 256) {
          e = Ji(Error(p(423)), b);
          b = lj(a, b, d, c, e);
          break a;
        } else if (d !== e) {
          e = Ji(Error(p(424)), b);
          b = lj(a, b, d, c, e);
          break a;
        } else for (yg = Lf(b.stateNode.containerInfo.firstChild), xg = b, I = true, zg = null, c = Vg(b, null, d, c), b.child = c; c; ) c.flags = c.flags & -3 | 4096, c = c.sibling;
        else {
          Ig();
          if (d === e) {
            b = Zi(a, b, c);
            break a;
          }
          Xi(a, b, d, c);
        }
        b = b.child;
      }
      return b;
    case 5:
      return Ah(b), null === a && Eg(b), d = b.type, e = b.pendingProps, f2 = null !== a ? a.memoizedProps : null, g = e.children, Ef(d, e) ? g = null : null !== f2 && Ef(d, f2) && (b.flags |= 32), gj(a, b), Xi(a, b, g, c), b.child;
    case 6:
      return null === a && Eg(b), null;
    case 13:
      return oj(a, b, c);
    case 4:
      return yh(b, b.stateNode.containerInfo), d = b.pendingProps, null === a ? b.child = Ug(b, null, d, c) : Xi(a, b, d, c), b.child;
    case 11:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), Yi(a, b, d, e, c);
    case 7:
      return Xi(a, b, b.pendingProps, c), b.child;
    case 8:
      return Xi(a, b, b.pendingProps.children, c), b.child;
    case 12:
      return Xi(a, b, b.pendingProps.children, c), b.child;
    case 10:
      a: {
        d = b.type._context;
        e = b.pendingProps;
        f2 = b.memoizedProps;
        g = e.value;
        G(Wg, d._currentValue);
        d._currentValue = g;
        if (null !== f2) if (He(f2.value, g)) {
          if (f2.children === e.children && !Wf.current) {
            b = Zi(a, b, c);
            break a;
          }
        } else for (f2 = b.child, null !== f2 && (f2.return = b); null !== f2; ) {
          var h = f2.dependencies;
          if (null !== h) {
            g = f2.child;
            for (var k2 = h.firstContext; null !== k2; ) {
              if (k2.context === d) {
                if (1 === f2.tag) {
                  k2 = mh(-1, c & -c);
                  k2.tag = 2;
                  var l2 = f2.updateQueue;
                  if (null !== l2) {
                    l2 = l2.shared;
                    var m2 = l2.pending;
                    null === m2 ? k2.next = k2 : (k2.next = m2.next, m2.next = k2);
                    l2.pending = k2;
                  }
                }
                f2.lanes |= c;
                k2 = f2.alternate;
                null !== k2 && (k2.lanes |= c);
                bh(
                  f2.return,
                  c,
                  b
                );
                h.lanes |= c;
                break;
              }
              k2 = k2.next;
            }
          } else if (10 === f2.tag) g = f2.type === b.type ? null : f2.child;
          else if (18 === f2.tag) {
            g = f2.return;
            if (null === g) throw Error(p(341));
            g.lanes |= c;
            h = g.alternate;
            null !== h && (h.lanes |= c);
            bh(g, c, b);
            g = f2.sibling;
          } else g = f2.child;
          if (null !== g) g.return = f2;
          else for (g = f2; null !== g; ) {
            if (g === b) {
              g = null;
              break;
            }
            f2 = g.sibling;
            if (null !== f2) {
              f2.return = g.return;
              g = f2;
              break;
            }
            g = g.return;
          }
          f2 = g;
        }
        Xi(a, b, e.children, c);
        b = b.child;
      }
      return b;
    case 9:
      return e = b.type, d = b.pendingProps.children, ch(b, c), e = eh(e), d = d(e), b.flags |= 1, Xi(a, b, d, c), b.child;
    case 14:
      return d = b.type, e = Ci(d, b.pendingProps), e = Ci(d.type, e), $i(a, b, d, e, c);
    case 15:
      return bj(a, b, b.type, b.pendingProps, c);
    case 17:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), ij(a, b), b.tag = 1, Zf(d) ? (a = true, cg(b)) : a = false, ch(b, c), Gi(b, d, e), Ii(b, d, e, c), jj(null, b, d, true, a, c);
    case 19:
      return xj(a, b, c);
    case 22:
      return dj(a, b, c);
  }
  throw Error(p(156, b.tag));
};
function Fk(a, b) {
  return ac(a, b);
}
function $k(a, b, c, d) {
  this.tag = a;
  this.key = c;
  this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
  this.index = 0;
  this.ref = null;
  this.pendingProps = b;
  this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
  this.mode = d;
  this.subtreeFlags = this.flags = 0;
  this.deletions = null;
  this.childLanes = this.lanes = 0;
  this.alternate = null;
}
function Bg(a, b, c, d) {
  return new $k(a, b, c, d);
}
function aj(a) {
  a = a.prototype;
  return !(!a || !a.isReactComponent);
}
function Zk(a) {
  if ("function" === typeof a) return aj(a) ? 1 : 0;
  if (void 0 !== a && null !== a) {
    a = a.$$typeof;
    if (a === Da) return 11;
    if (a === Ga) return 14;
  }
  return 2;
}
function Pg(a, b) {
  var c = a.alternate;
  null === c ? (c = Bg(a.tag, b, a.key, a.mode), c.elementType = a.elementType, c.type = a.type, c.stateNode = a.stateNode, c.alternate = a, a.alternate = c) : (c.pendingProps = b, c.type = a.type, c.flags = 0, c.subtreeFlags = 0, c.deletions = null);
  c.flags = a.flags & 14680064;
  c.childLanes = a.childLanes;
  c.lanes = a.lanes;
  c.child = a.child;
  c.memoizedProps = a.memoizedProps;
  c.memoizedState = a.memoizedState;
  c.updateQueue = a.updateQueue;
  b = a.dependencies;
  c.dependencies = null === b ? null : { lanes: b.lanes, firstContext: b.firstContext };
  c.sibling = a.sibling;
  c.index = a.index;
  c.ref = a.ref;
  return c;
}
function Rg(a, b, c, d, e, f2) {
  var g = 2;
  d = a;
  if ("function" === typeof a) aj(a) && (g = 1);
  else if ("string" === typeof a) g = 5;
  else a: switch (a) {
    case ya:
      return Tg(c.children, e, f2, b);
    case za:
      g = 8;
      e |= 8;
      break;
    case Aa:
      return a = Bg(12, c, b, e | 2), a.elementType = Aa, a.lanes = f2, a;
    case Ea:
      return a = Bg(13, c, b, e), a.elementType = Ea, a.lanes = f2, a;
    case Fa:
      return a = Bg(19, c, b, e), a.elementType = Fa, a.lanes = f2, a;
    case Ia:
      return pj(c, e, f2, b);
    default:
      if ("object" === typeof a && null !== a) switch (a.$$typeof) {
        case Ba:
          g = 10;
          break a;
        case Ca:
          g = 9;
          break a;
        case Da:
          g = 11;
          break a;
        case Ga:
          g = 14;
          break a;
        case Ha:
          g = 16;
          d = null;
          break a;
      }
      throw Error(p(130, null == a ? a : typeof a, ""));
  }
  b = Bg(g, c, b, e);
  b.elementType = a;
  b.type = d;
  b.lanes = f2;
  return b;
}
function Tg(a, b, c, d) {
  a = Bg(7, a, d, b);
  a.lanes = c;
  return a;
}
function pj(a, b, c, d) {
  a = Bg(22, a, d, b);
  a.elementType = Ia;
  a.lanes = c;
  a.stateNode = { isHidden: false };
  return a;
}
function Qg(a, b, c) {
  a = Bg(6, a, null, b);
  a.lanes = c;
  return a;
}
function Sg(a, b, c) {
  b = Bg(4, null !== a.children ? a.children : [], a.key, b);
  b.lanes = c;
  b.stateNode = { containerInfo: a.containerInfo, pendingChildren: null, implementation: a.implementation };
  return b;
}
function al(a, b, c, d, e) {
  this.tag = b;
  this.containerInfo = a;
  this.finishedWork = this.pingCache = this.current = this.pendingChildren = null;
  this.timeoutHandle = -1;
  this.callbackNode = this.pendingContext = this.context = null;
  this.callbackPriority = 0;
  this.eventTimes = zc(0);
  this.expirationTimes = zc(-1);
  this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
  this.entanglements = zc(0);
  this.identifierPrefix = d;
  this.onRecoverableError = e;
  this.mutableSourceEagerHydrationData = null;
}
function bl(a, b, c, d, e, f2, g, h, k2) {
  a = new al(a, b, c, h, k2);
  1 === b ? (b = 1, true === f2 && (b |= 8)) : b = 0;
  f2 = Bg(3, null, null, b);
  a.current = f2;
  f2.stateNode = a;
  f2.memoizedState = { element: d, isDehydrated: c, cache: null, transitions: null, pendingSuspenseBoundaries: null };
  kh(f2);
  return a;
}
function cl(a, b, c) {
  var d = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
  return { $$typeof: wa, key: null == d ? null : "" + d, children: a, containerInfo: b, implementation: c };
}
function dl(a) {
  if (!a) return Vf;
  a = a._reactInternals;
  a: {
    if (Vb(a) !== a || 1 !== a.tag) throw Error(p(170));
    var b = a;
    do {
      switch (b.tag) {
        case 3:
          b = b.stateNode.context;
          break a;
        case 1:
          if (Zf(b.type)) {
            b = b.stateNode.__reactInternalMemoizedMergedChildContext;
            break a;
          }
      }
      b = b.return;
    } while (null !== b);
    throw Error(p(171));
  }
  if (1 === a.tag) {
    var c = a.type;
    if (Zf(c)) return bg(a, c, b);
  }
  return b;
}
function el(a, b, c, d, e, f2, g, h, k2) {
  a = bl(c, d, true, a, e, f2, g, h, k2);
  a.context = dl(null);
  c = a.current;
  d = R();
  e = yi(c);
  f2 = mh(d, e);
  f2.callback = void 0 !== b && null !== b ? b : null;
  nh(c, f2, e);
  a.current.lanes = e;
  Ac(a, e, d);
  Dk(a, d);
  return a;
}
function fl(a, b, c, d) {
  var e = b.current, f2 = R(), g = yi(e);
  c = dl(c);
  null === b.context ? b.context = c : b.pendingContext = c;
  b = mh(f2, g);
  b.payload = { element: a };
  d = void 0 === d ? null : d;
  null !== d && (b.callback = d);
  a = nh(e, b, g);
  null !== a && (gi(a, e, g, f2), oh(a, e, g));
  return g;
}
function gl(a) {
  a = a.current;
  if (!a.child) return null;
  switch (a.child.tag) {
    case 5:
      return a.child.stateNode;
    default:
      return a.child.stateNode;
  }
}
function hl(a, b) {
  a = a.memoizedState;
  if (null !== a && null !== a.dehydrated) {
    var c = a.retryLane;
    a.retryLane = 0 !== c && c < b ? c : b;
  }
}
function il(a, b) {
  hl(a, b);
  (a = a.alternate) && hl(a, b);
}
function jl() {
  return null;
}
var kl = "function" === typeof reportError ? reportError : function(a) {
  console.error(a);
};
function ll(a) {
  this._internalRoot = a;
}
ml.prototype.render = ll.prototype.render = function(a) {
  var b = this._internalRoot;
  if (null === b) throw Error(p(409));
  fl(a, b, null, null);
};
ml.prototype.unmount = ll.prototype.unmount = function() {
  var a = this._internalRoot;
  if (null !== a) {
    this._internalRoot = null;
    var b = a.containerInfo;
    Rk(function() {
      fl(null, a, null, null);
    });
    b[uf] = null;
  }
};
function ml(a) {
  this._internalRoot = a;
}
ml.prototype.unstable_scheduleHydration = function(a) {
  if (a) {
    var b = Hc();
    a = { blockedOn: null, target: a, priority: b };
    for (var c = 0; c < Qc.length && 0 !== b && b < Qc[c].priority; c++) ;
    Qc.splice(c, 0, a);
    0 === c && Vc(a);
  }
};
function nl(a) {
  return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType);
}
function ol(a) {
  return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType && (8 !== a.nodeType || " react-mount-point-unstable " !== a.nodeValue));
}
function pl() {
}
function ql(a, b, c, d, e) {
  if (e) {
    if ("function" === typeof d) {
      var f2 = d;
      d = function() {
        var a2 = gl(g);
        f2.call(a2);
      };
    }
    var g = el(b, d, a, 0, null, false, false, "", pl);
    a._reactRootContainer = g;
    a[uf] = g.current;
    sf(8 === a.nodeType ? a.parentNode : a);
    Rk();
    return g;
  }
  for (; e = a.lastChild; ) a.removeChild(e);
  if ("function" === typeof d) {
    var h = d;
    d = function() {
      var a2 = gl(k2);
      h.call(a2);
    };
  }
  var k2 = bl(a, 0, false, null, null, false, false, "", pl);
  a._reactRootContainer = k2;
  a[uf] = k2.current;
  sf(8 === a.nodeType ? a.parentNode : a);
  Rk(function() {
    fl(b, k2, c, d);
  });
  return k2;
}
function rl(a, b, c, d, e) {
  var f2 = c._reactRootContainer;
  if (f2) {
    var g = f2;
    if ("function" === typeof e) {
      var h = e;
      e = function() {
        var a2 = gl(g);
        h.call(a2);
      };
    }
    fl(b, g, a, e);
  } else g = ql(c, b, a, e, d);
  return gl(g);
}
Ec = function(a) {
  switch (a.tag) {
    case 3:
      var b = a.stateNode;
      if (b.current.memoizedState.isDehydrated) {
        var c = tc(b.pendingLanes);
        0 !== c && (Cc(b, c | 1), Dk(b, B()), 0 === (K & 6) && (Gj = B() + 500, jg()));
      }
      break;
    case 13:
      Rk(function() {
        var b2 = ih(a, 1);
        if (null !== b2) {
          var c2 = R();
          gi(b2, a, 1, c2);
        }
      }), il(a, 1);
  }
};
Fc = function(a) {
  if (13 === a.tag) {
    var b = ih(a, 134217728);
    if (null !== b) {
      var c = R();
      gi(b, a, 134217728, c);
    }
    il(a, 134217728);
  }
};
Gc = function(a) {
  if (13 === a.tag) {
    var b = yi(a), c = ih(a, b);
    if (null !== c) {
      var d = R();
      gi(c, a, b, d);
    }
    il(a, b);
  }
};
Hc = function() {
  return C;
};
Ic = function(a, b) {
  var c = C;
  try {
    return C = a, b();
  } finally {
    C = c;
  }
};
yb = function(a, b, c) {
  switch (b) {
    case "input":
      bb(a, c);
      b = c.name;
      if ("radio" === c.type && null != b) {
        for (c = a; c.parentNode; ) c = c.parentNode;
        c = c.querySelectorAll("input[name=" + JSON.stringify("" + b) + '][type="radio"]');
        for (b = 0; b < c.length; b++) {
          var d = c[b];
          if (d !== a && d.form === a.form) {
            var e = Db(d);
            if (!e) throw Error(p(90));
            Wa(d);
            bb(d, e);
          }
        }
      }
      break;
    case "textarea":
      ib(a, c);
      break;
    case "select":
      b = c.value, null != b && fb(a, !!c.multiple, b, false);
  }
};
Gb = Qk;
Hb = Rk;
var sl = { usingClientEntryPoint: false, Events: [Cb, ue, Db, Eb, Fb, Qk] }, tl = { findFiberByHostInstance: Wc, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" };
var ul = { bundleType: tl.bundleType, version: tl.version, rendererPackageName: tl.rendererPackageName, rendererConfig: tl.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: ua.ReactCurrentDispatcher, findHostInstanceByFiber: function(a) {
  a = Zb(a);
  return null === a ? null : a.stateNode;
}, findFiberByHostInstance: tl.findFiberByHostInstance || jl, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
  var vl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!vl.isDisabled && vl.supportsFiber) try {
    kc = vl.inject(ul), lc = vl;
  } catch (a) {
  }
}
reactDom_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = sl;
reactDom_production_min.createPortal = function(a, b) {
  var c = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
  if (!nl(b)) throw Error(p(200));
  return cl(a, b, null, c);
};
reactDom_production_min.createRoot = function(a, b) {
  if (!nl(a)) throw Error(p(299));
  var c = false, d = "", e = kl;
  null !== b && void 0 !== b && (true === b.unstable_strictMode && (c = true), void 0 !== b.identifierPrefix && (d = b.identifierPrefix), void 0 !== b.onRecoverableError && (e = b.onRecoverableError));
  b = bl(a, 1, false, null, null, c, false, d, e);
  a[uf] = b.current;
  sf(8 === a.nodeType ? a.parentNode : a);
  return new ll(b);
};
reactDom_production_min.findDOMNode = function(a) {
  if (null == a) return null;
  if (1 === a.nodeType) return a;
  var b = a._reactInternals;
  if (void 0 === b) {
    if ("function" === typeof a.render) throw Error(p(188));
    a = Object.keys(a).join(",");
    throw Error(p(268, a));
  }
  a = Zb(b);
  a = null === a ? null : a.stateNode;
  return a;
};
reactDom_production_min.flushSync = function(a) {
  return Rk(a);
};
reactDom_production_min.hydrate = function(a, b, c) {
  if (!ol(b)) throw Error(p(200));
  return rl(null, a, b, true, c);
};
reactDom_production_min.hydrateRoot = function(a, b, c) {
  if (!nl(a)) throw Error(p(405));
  var d = null != c && c.hydratedSources || null, e = false, f2 = "", g = kl;
  null !== c && void 0 !== c && (true === c.unstable_strictMode && (e = true), void 0 !== c.identifierPrefix && (f2 = c.identifierPrefix), void 0 !== c.onRecoverableError && (g = c.onRecoverableError));
  b = el(b, null, a, 1, null != c ? c : null, e, false, f2, g);
  a[uf] = b.current;
  sf(a);
  if (d) for (a = 0; a < d.length; a++) c = d[a], e = c._getVersion, e = e(c._source), null == b.mutableSourceEagerHydrationData ? b.mutableSourceEagerHydrationData = [c, e] : b.mutableSourceEagerHydrationData.push(
    c,
    e
  );
  return new ml(b);
};
reactDom_production_min.render = function(a, b, c) {
  if (!ol(b)) throw Error(p(200));
  return rl(null, a, b, false, c);
};
reactDom_production_min.unmountComponentAtNode = function(a) {
  if (!ol(a)) throw Error(p(40));
  return a._reactRootContainer ? (Rk(function() {
    rl(null, null, a, false, function() {
      a._reactRootContainer = null;
      a[uf] = null;
    });
  }), true) : false;
};
reactDom_production_min.unstable_batchedUpdates = Qk;
reactDom_production_min.unstable_renderSubtreeIntoContainer = function(a, b, c, d) {
  if (!ol(c)) throw Error(p(200));
  if (null == a || void 0 === a._reactInternals) throw Error(p(38));
  return rl(a, b, c, false, d);
};
reactDom_production_min.version = "18.3.1-next-f1338f8080-20240426";
function checkDCE() {
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
    return;
  }
  try {
    __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
  } catch (err) {
    console.error(err);
  }
}
{
  checkDCE();
  reactDom.exports = reactDom_production_min;
}
var reactDomExports = reactDom.exports;
var m = reactDomExports;
{
  client.createRoot = m.createRoot;
  client.hydrateRoot = m.hydrateRoot;
}
/**
 * @remix-run/router v1.23.2
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
function _extends$2() {
  _extends$2 = Object.assign ? Object.assign.bind() : function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends$2.apply(this, arguments);
}
var Action;
(function(Action2) {
  Action2["Pop"] = "POP";
  Action2["Push"] = "PUSH";
  Action2["Replace"] = "REPLACE";
})(Action || (Action = {}));
const PopStateEventType = "popstate";
function createHashHistory(options) {
  if (options === void 0) {
    options = {};
  }
  function createHashLocation(window2, globalHistory) {
    let {
      pathname = "/",
      search = "",
      hash = ""
    } = parsePath(window2.location.hash.substr(1));
    if (!pathname.startsWith("/") && !pathname.startsWith(".")) {
      pathname = "/" + pathname;
    }
    return createLocation(
      "",
      {
        pathname,
        search,
        hash
      },
      // state defaults to `null` because `window.history.state` does
      globalHistory.state && globalHistory.state.usr || null,
      globalHistory.state && globalHistory.state.key || "default"
    );
  }
  function createHashHref(window2, to) {
    let base = window2.document.querySelector("base");
    let href = "";
    if (base && base.getAttribute("href")) {
      let url = window2.location.href;
      let hashIndex = url.indexOf("#");
      href = hashIndex === -1 ? url : url.slice(0, hashIndex);
    }
    return href + "#" + (typeof to === "string" ? to : createPath(to));
  }
  function validateHashLocation(location, to) {
    warning(location.pathname.charAt(0) === "/", "relative pathnames are not supported in hash history.push(" + JSON.stringify(to) + ")");
  }
  return getUrlBasedHistory(createHashLocation, createHashHref, validateHashLocation, options);
}
function invariant(value, message) {
  if (value === false || value === null || typeof value === "undefined") {
    throw new Error(message);
  }
}
function warning(cond, message) {
  if (!cond) {
    if (typeof console !== "undefined") console.warn(message);
    try {
      throw new Error(message);
    } catch (e) {
    }
  }
}
function createKey() {
  return Math.random().toString(36).substr(2, 8);
}
function getHistoryState(location, index) {
  return {
    usr: location.state,
    key: location.key,
    idx: index
  };
}
function createLocation(current, to, state, key) {
  if (state === void 0) {
    state = null;
  }
  let location = _extends$2({
    pathname: typeof current === "string" ? current : current.pathname,
    search: "",
    hash: ""
  }, typeof to === "string" ? parsePath(to) : to, {
    state,
    // TODO: This could be cleaned up.  push/replace should probably just take
    // full Locations now and avoid the need to run through this flow at all
    // But that's a pretty big refactor to the current test suite so going to
    // keep as is for the time being and just let any incoming keys take precedence
    key: to && to.key || key || createKey()
  });
  return location;
}
function createPath(_ref) {
  let {
    pathname = "/",
    search = "",
    hash = ""
  } = _ref;
  if (search && search !== "?") pathname += search.charAt(0) === "?" ? search : "?" + search;
  if (hash && hash !== "#") pathname += hash.charAt(0) === "#" ? hash : "#" + hash;
  return pathname;
}
function parsePath(path) {
  let parsedPath = {};
  if (path) {
    let hashIndex = path.indexOf("#");
    if (hashIndex >= 0) {
      parsedPath.hash = path.substr(hashIndex);
      path = path.substr(0, hashIndex);
    }
    let searchIndex = path.indexOf("?");
    if (searchIndex >= 0) {
      parsedPath.search = path.substr(searchIndex);
      path = path.substr(0, searchIndex);
    }
    if (path) {
      parsedPath.pathname = path;
    }
  }
  return parsedPath;
}
function getUrlBasedHistory(getLocation, createHref, validateLocation, options) {
  if (options === void 0) {
    options = {};
  }
  let {
    window: window2 = document.defaultView,
    v5Compat = false
  } = options;
  let globalHistory = window2.history;
  let action = Action.Pop;
  let listener = null;
  let index = getIndex();
  if (index == null) {
    index = 0;
    globalHistory.replaceState(_extends$2({}, globalHistory.state, {
      idx: index
    }), "");
  }
  function getIndex() {
    let state = globalHistory.state || {
      idx: null
    };
    return state.idx;
  }
  function handlePop() {
    action = Action.Pop;
    let nextIndex = getIndex();
    let delta = nextIndex == null ? null : nextIndex - index;
    index = nextIndex;
    if (listener) {
      listener({
        action,
        location: history.location,
        delta
      });
    }
  }
  function push(to, state) {
    action = Action.Push;
    let location = createLocation(history.location, to, state);
    if (validateLocation) validateLocation(location, to);
    index = getIndex() + 1;
    let historyState = getHistoryState(location, index);
    let url = history.createHref(location);
    try {
      globalHistory.pushState(historyState, "", url);
    } catch (error) {
      if (error instanceof DOMException && error.name === "DataCloneError") {
        throw error;
      }
      window2.location.assign(url);
    }
    if (v5Compat && listener) {
      listener({
        action,
        location: history.location,
        delta: 1
      });
    }
  }
  function replace(to, state) {
    action = Action.Replace;
    let location = createLocation(history.location, to, state);
    if (validateLocation) validateLocation(location, to);
    index = getIndex();
    let historyState = getHistoryState(location, index);
    let url = history.createHref(location);
    globalHistory.replaceState(historyState, "", url);
    if (v5Compat && listener) {
      listener({
        action,
        location: history.location,
        delta: 0
      });
    }
  }
  function createURL(to) {
    let base = window2.location.origin !== "null" ? window2.location.origin : window2.location.href;
    let href = typeof to === "string" ? to : createPath(to);
    href = href.replace(/ $/, "%20");
    invariant(base, "No window.location.(origin|href) available to create URL for href: " + href);
    return new URL(href, base);
  }
  let history = {
    get action() {
      return action;
    },
    get location() {
      return getLocation(window2, globalHistory);
    },
    listen(fn) {
      if (listener) {
        throw new Error("A history only accepts one active listener");
      }
      window2.addEventListener(PopStateEventType, handlePop);
      listener = fn;
      return () => {
        window2.removeEventListener(PopStateEventType, handlePop);
        listener = null;
      };
    },
    createHref(to) {
      return createHref(window2, to);
    },
    createURL,
    encodeLocation(to) {
      let url = createURL(to);
      return {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash
      };
    },
    push,
    replace,
    go(n2) {
      return globalHistory.go(n2);
    }
  };
  return history;
}
var ResultType;
(function(ResultType2) {
  ResultType2["data"] = "data";
  ResultType2["deferred"] = "deferred";
  ResultType2["redirect"] = "redirect";
  ResultType2["error"] = "error";
})(ResultType || (ResultType = {}));
function matchRoutes(routes, locationArg, basename) {
  if (basename === void 0) {
    basename = "/";
  }
  return matchRoutesImpl(routes, locationArg, basename);
}
function matchRoutesImpl(routes, locationArg, basename, allowPartial) {
  let location = typeof locationArg === "string" ? parsePath(locationArg) : locationArg;
  let pathname = stripBasename(location.pathname || "/", basename);
  if (pathname == null) {
    return null;
  }
  let branches = flattenRoutes(routes);
  rankRouteBranches(branches);
  let matches = null;
  for (let i = 0; matches == null && i < branches.length; ++i) {
    let decoded = decodePath(pathname);
    matches = matchRouteBranch(branches[i], decoded);
  }
  return matches;
}
function flattenRoutes(routes, branches, parentsMeta, parentPath) {
  if (branches === void 0) {
    branches = [];
  }
  if (parentsMeta === void 0) {
    parentsMeta = [];
  }
  if (parentPath === void 0) {
    parentPath = "";
  }
  let flattenRoute = (route, index, relativePath) => {
    let meta = {
      relativePath: relativePath === void 0 ? route.path || "" : relativePath,
      caseSensitive: route.caseSensitive === true,
      childrenIndex: index,
      route
    };
    if (meta.relativePath.startsWith("/")) {
      invariant(meta.relativePath.startsWith(parentPath), 'Absolute route path "' + meta.relativePath + '" nested under path ' + ('"' + parentPath + '" is not valid. An absolute child route path ') + "must start with the combined path of all its parent routes.");
      meta.relativePath = meta.relativePath.slice(parentPath.length);
    }
    let path = joinPaths([parentPath, meta.relativePath]);
    let routesMeta = parentsMeta.concat(meta);
    if (route.children && route.children.length > 0) {
      invariant(
        // Our types know better, but runtime JS may not!
        // @ts-expect-error
        route.index !== true,
        "Index routes must not have child routes. Please remove " + ('all child routes from route path "' + path + '".')
      );
      flattenRoutes(route.children, branches, routesMeta, path);
    }
    if (route.path == null && !route.index) {
      return;
    }
    branches.push({
      path,
      score: computeScore(path, route.index),
      routesMeta
    });
  };
  routes.forEach((route, index) => {
    var _route$path;
    if (route.path === "" || !((_route$path = route.path) != null && _route$path.includes("?"))) {
      flattenRoute(route, index);
    } else {
      for (let exploded of explodeOptionalSegments(route.path)) {
        flattenRoute(route, index, exploded);
      }
    }
  });
  return branches;
}
function explodeOptionalSegments(path) {
  let segments = path.split("/");
  if (segments.length === 0) return [];
  let [first, ...rest] = segments;
  let isOptional = first.endsWith("?");
  let required = first.replace(/\?$/, "");
  if (rest.length === 0) {
    return isOptional ? [required, ""] : [required];
  }
  let restExploded = explodeOptionalSegments(rest.join("/"));
  let result = [];
  result.push(...restExploded.map((subpath) => subpath === "" ? required : [required, subpath].join("/")));
  if (isOptional) {
    result.push(...restExploded);
  }
  return result.map((exploded) => path.startsWith("/") && exploded === "" ? "/" : exploded);
}
function rankRouteBranches(branches) {
  branches.sort((a, b) => a.score !== b.score ? b.score - a.score : compareIndexes(a.routesMeta.map((meta) => meta.childrenIndex), b.routesMeta.map((meta) => meta.childrenIndex)));
}
const paramRe = /^:[\w-]+$/;
const dynamicSegmentValue = 3;
const indexRouteValue = 2;
const emptySegmentValue = 1;
const staticSegmentValue = 10;
const splatPenalty = -2;
const isSplat = (s) => s === "*";
function computeScore(path, index) {
  let segments = path.split("/");
  let initialScore = segments.length;
  if (segments.some(isSplat)) {
    initialScore += splatPenalty;
  }
  if (index) {
    initialScore += indexRouteValue;
  }
  return segments.filter((s) => !isSplat(s)).reduce((score, segment) => score + (paramRe.test(segment) ? dynamicSegmentValue : segment === "" ? emptySegmentValue : staticSegmentValue), initialScore);
}
function compareIndexes(a, b) {
  let siblings = a.length === b.length && a.slice(0, -1).every((n2, i) => n2 === b[i]);
  return siblings ? (
    // If two routes are siblings, we should try to match the earlier sibling
    // first. This allows people to have fine-grained control over the matching
    // behavior by simply putting routes with identical paths in the order they
    // want them tried.
    a[a.length - 1] - b[b.length - 1]
  ) : (
    // Otherwise, it doesn't really make sense to rank non-siblings by index,
    // so they sort equally.
    0
  );
}
function matchRouteBranch(branch, pathname, allowPartial) {
  let {
    routesMeta
  } = branch;
  let matchedParams = {};
  let matchedPathname = "/";
  let matches = [];
  for (let i = 0; i < routesMeta.length; ++i) {
    let meta = routesMeta[i];
    let end = i === routesMeta.length - 1;
    let remainingPathname = matchedPathname === "/" ? pathname : pathname.slice(matchedPathname.length) || "/";
    let match = matchPath({
      path: meta.relativePath,
      caseSensitive: meta.caseSensitive,
      end
    }, remainingPathname);
    let route = meta.route;
    if (!match) {
      return null;
    }
    Object.assign(matchedParams, match.params);
    matches.push({
      // TODO: Can this as be avoided?
      params: matchedParams,
      pathname: joinPaths([matchedPathname, match.pathname]),
      pathnameBase: normalizePathname(joinPaths([matchedPathname, match.pathnameBase])),
      route
    });
    if (match.pathnameBase !== "/") {
      matchedPathname = joinPaths([matchedPathname, match.pathnameBase]);
    }
  }
  return matches;
}
function matchPath(pattern, pathname) {
  if (typeof pattern === "string") {
    pattern = {
      path: pattern,
      caseSensitive: false,
      end: true
    };
  }
  let [matcher, compiledParams] = compilePath(pattern.path, pattern.caseSensitive, pattern.end);
  let match = pathname.match(matcher);
  if (!match) return null;
  let matchedPathname = match[0];
  let pathnameBase = matchedPathname.replace(/(.)\/+$/, "$1");
  let captureGroups = match.slice(1);
  let params = compiledParams.reduce((memo, _ref, index) => {
    let {
      paramName,
      isOptional
    } = _ref;
    if (paramName === "*") {
      let splatValue = captureGroups[index] || "";
      pathnameBase = matchedPathname.slice(0, matchedPathname.length - splatValue.length).replace(/(.)\/+$/, "$1");
    }
    const value = captureGroups[index];
    if (isOptional && !value) {
      memo[paramName] = void 0;
    } else {
      memo[paramName] = (value || "").replace(/%2F/g, "/");
    }
    return memo;
  }, {});
  return {
    params,
    pathname: matchedPathname,
    pathnameBase,
    pattern
  };
}
function compilePath(path, caseSensitive, end) {
  if (caseSensitive === void 0) {
    caseSensitive = false;
  }
  if (end === void 0) {
    end = true;
  }
  warning(path === "*" || !path.endsWith("*") || path.endsWith("/*"), 'Route path "' + path + '" will be treated as if it were ' + ('"' + path.replace(/\*$/, "/*") + '" because the `*` character must ') + "always follow a `/` in the pattern. To get rid of this warning, " + ('please change the route path to "' + path.replace(/\*$/, "/*") + '".'));
  let params = [];
  let regexpSource = "^" + path.replace(/\/*\*?$/, "").replace(/^\/*/, "/").replace(/[\\.*+^${}|()[\]]/g, "\\$&").replace(/\/:([\w-]+)(\?)?/g, (_, paramName, isOptional) => {
    params.push({
      paramName,
      isOptional: isOptional != null
    });
    return isOptional ? "/?([^\\/]+)?" : "/([^\\/]+)";
  });
  if (path.endsWith("*")) {
    params.push({
      paramName: "*"
    });
    regexpSource += path === "*" || path === "/*" ? "(.*)$" : "(?:\\/(.+)|\\/*)$";
  } else if (end) {
    regexpSource += "\\/*$";
  } else if (path !== "" && path !== "/") {
    regexpSource += "(?:(?=\\/|$))";
  } else ;
  let matcher = new RegExp(regexpSource, caseSensitive ? void 0 : "i");
  return [matcher, params];
}
function decodePath(value) {
  try {
    return value.split("/").map((v2) => decodeURIComponent(v2).replace(/\//g, "%2F")).join("/");
  } catch (error) {
    warning(false, 'The URL path "' + value + '" could not be decoded because it is is a malformed URL segment. This is probably due to a bad percent ' + ("encoding (" + error + ")."));
    return value;
  }
}
function stripBasename(pathname, basename) {
  if (basename === "/") return pathname;
  if (!pathname.toLowerCase().startsWith(basename.toLowerCase())) {
    return null;
  }
  let startIndex = basename.endsWith("/") ? basename.length - 1 : basename.length;
  let nextChar = pathname.charAt(startIndex);
  if (nextChar && nextChar !== "/") {
    return null;
  }
  return pathname.slice(startIndex) || "/";
}
const ABSOLUTE_URL_REGEX$1 = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const isAbsoluteUrl = (url) => ABSOLUTE_URL_REGEX$1.test(url);
function resolvePath(to, fromPathname) {
  if (fromPathname === void 0) {
    fromPathname = "/";
  }
  let {
    pathname: toPathname,
    search = "",
    hash = ""
  } = typeof to === "string" ? parsePath(to) : to;
  let pathname;
  if (toPathname) {
    if (isAbsoluteUrl(toPathname)) {
      pathname = toPathname;
    } else {
      if (toPathname.includes("//")) {
        let oldPathname = toPathname;
        toPathname = toPathname.replace(/\/\/+/g, "/");
        warning(false, "Pathnames cannot have embedded double slashes - normalizing " + (oldPathname + " -> " + toPathname));
      }
      if (toPathname.startsWith("/")) {
        pathname = resolvePathname(toPathname.substring(1), "/");
      } else {
        pathname = resolvePathname(toPathname, fromPathname);
      }
    }
  } else {
    pathname = fromPathname;
  }
  return {
    pathname,
    search: normalizeSearch(search),
    hash: normalizeHash(hash)
  };
}
function resolvePathname(relativePath, fromPathname) {
  let segments = fromPathname.replace(/\/+$/, "").split("/");
  let relativeSegments = relativePath.split("/");
  relativeSegments.forEach((segment) => {
    if (segment === "..") {
      if (segments.length > 1) segments.pop();
    } else if (segment !== ".") {
      segments.push(segment);
    }
  });
  return segments.length > 1 ? segments.join("/") : "/";
}
function getInvalidPathError(char, field, dest, path) {
  return "Cannot include a '" + char + "' character in a manually specified " + ("`to." + field + "` field [" + JSON.stringify(path) + "].  Please separate it out to the ") + ("`to." + dest + "` field. Alternatively you may provide the full path as ") + 'a string in <Link to="..."> and the router will parse it for you.';
}
function getPathContributingMatches(matches) {
  return matches.filter((match, index) => index === 0 || match.route.path && match.route.path.length > 0);
}
function getResolveToMatches(matches, v7_relativeSplatPath) {
  let pathMatches = getPathContributingMatches(matches);
  if (v7_relativeSplatPath) {
    return pathMatches.map((match, idx) => idx === pathMatches.length - 1 ? match.pathname : match.pathnameBase);
  }
  return pathMatches.map((match) => match.pathnameBase);
}
function resolveTo(toArg, routePathnames, locationPathname, isPathRelative) {
  if (isPathRelative === void 0) {
    isPathRelative = false;
  }
  let to;
  if (typeof toArg === "string") {
    to = parsePath(toArg);
  } else {
    to = _extends$2({}, toArg);
    invariant(!to.pathname || !to.pathname.includes("?"), getInvalidPathError("?", "pathname", "search", to));
    invariant(!to.pathname || !to.pathname.includes("#"), getInvalidPathError("#", "pathname", "hash", to));
    invariant(!to.search || !to.search.includes("#"), getInvalidPathError("#", "search", "hash", to));
  }
  let isEmptyPath = toArg === "" || to.pathname === "";
  let toPathname = isEmptyPath ? "/" : to.pathname;
  let from;
  if (toPathname == null) {
    from = locationPathname;
  } else {
    let routePathnameIndex = routePathnames.length - 1;
    if (!isPathRelative && toPathname.startsWith("..")) {
      let toSegments = toPathname.split("/");
      while (toSegments[0] === "..") {
        toSegments.shift();
        routePathnameIndex -= 1;
      }
      to.pathname = toSegments.join("/");
    }
    from = routePathnameIndex >= 0 ? routePathnames[routePathnameIndex] : "/";
  }
  let path = resolvePath(to, from);
  let hasExplicitTrailingSlash = toPathname && toPathname !== "/" && toPathname.endsWith("/");
  let hasCurrentTrailingSlash = (isEmptyPath || toPathname === ".") && locationPathname.endsWith("/");
  if (!path.pathname.endsWith("/") && (hasExplicitTrailingSlash || hasCurrentTrailingSlash)) {
    path.pathname += "/";
  }
  return path;
}
const joinPaths = (paths) => paths.join("/").replace(/\/\/+/g, "/");
const normalizePathname = (pathname) => pathname.replace(/\/+$/, "").replace(/^\/*/, "/");
const normalizeSearch = (search) => !search || search === "?" ? "" : search.startsWith("?") ? search : "?" + search;
const normalizeHash = (hash) => !hash || hash === "#" ? "" : hash.startsWith("#") ? hash : "#" + hash;
function isRouteErrorResponse(error) {
  return error != null && typeof error.status === "number" && typeof error.statusText === "string" && typeof error.internal === "boolean" && "data" in error;
}
const validMutationMethodsArr = ["post", "put", "patch", "delete"];
new Set(validMutationMethodsArr);
const validRequestMethodsArr = ["get", ...validMutationMethodsArr];
new Set(validRequestMethodsArr);
/**
 * React Router v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
function _extends$1() {
  _extends$1 = Object.assign ? Object.assign.bind() : function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends$1.apply(this, arguments);
}
const DataRouterContext = /* @__PURE__ */ reactExports.createContext(null);
const DataRouterStateContext = /* @__PURE__ */ reactExports.createContext(null);
const NavigationContext = /* @__PURE__ */ reactExports.createContext(null);
const LocationContext = /* @__PURE__ */ reactExports.createContext(null);
const RouteContext = /* @__PURE__ */ reactExports.createContext({
  outlet: null,
  matches: [],
  isDataRoute: false
});
const RouteErrorContext = /* @__PURE__ */ reactExports.createContext(null);
function useHref(to, _temp) {
  let {
    relative
  } = _temp === void 0 ? {} : _temp;
  !useInRouterContext() ? invariant(false) : void 0;
  let {
    basename,
    navigator: navigator2
  } = reactExports.useContext(NavigationContext);
  let {
    hash,
    pathname,
    search
  } = useResolvedPath(to, {
    relative
  });
  let joinedPathname = pathname;
  if (basename !== "/") {
    joinedPathname = pathname === "/" ? basename : joinPaths([basename, pathname]);
  }
  return navigator2.createHref({
    pathname: joinedPathname,
    search,
    hash
  });
}
function useInRouterContext() {
  return reactExports.useContext(LocationContext) != null;
}
function useLocation() {
  !useInRouterContext() ? invariant(false) : void 0;
  return reactExports.useContext(LocationContext).location;
}
function useIsomorphicLayoutEffect(cb2) {
  let isStatic = reactExports.useContext(NavigationContext).static;
  if (!isStatic) {
    reactExports.useLayoutEffect(cb2);
  }
}
function useNavigate() {
  let {
    isDataRoute
  } = reactExports.useContext(RouteContext);
  return isDataRoute ? useNavigateStable() : useNavigateUnstable();
}
function useNavigateUnstable() {
  !useInRouterContext() ? invariant(false) : void 0;
  let dataRouterContext = reactExports.useContext(DataRouterContext);
  let {
    basename,
    future,
    navigator: navigator2
  } = reactExports.useContext(NavigationContext);
  let {
    matches
  } = reactExports.useContext(RouteContext);
  let {
    pathname: locationPathname
  } = useLocation();
  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches, future.v7_relativeSplatPath));
  let activeRef = reactExports.useRef(false);
  useIsomorphicLayoutEffect(() => {
    activeRef.current = true;
  });
  let navigate = reactExports.useCallback(function(to, options) {
    if (options === void 0) {
      options = {};
    }
    if (!activeRef.current) return;
    if (typeof to === "number") {
      navigator2.go(to);
      return;
    }
    let path = resolveTo(to, JSON.parse(routePathnamesJson), locationPathname, options.relative === "path");
    if (dataRouterContext == null && basename !== "/") {
      path.pathname = path.pathname === "/" ? basename : joinPaths([basename, path.pathname]);
    }
    (!!options.replace ? navigator2.replace : navigator2.push)(path, options.state, options);
  }, [basename, navigator2, routePathnamesJson, locationPathname, dataRouterContext]);
  return navigate;
}
const OutletContext = /* @__PURE__ */ reactExports.createContext(null);
function useOutlet(context) {
  let outlet = reactExports.useContext(RouteContext).outlet;
  if (outlet) {
    return /* @__PURE__ */ reactExports.createElement(OutletContext.Provider, {
      value: context
    }, outlet);
  }
  return outlet;
}
function useResolvedPath(to, _temp2) {
  let {
    relative
  } = _temp2 === void 0 ? {} : _temp2;
  let {
    future
  } = reactExports.useContext(NavigationContext);
  let {
    matches
  } = reactExports.useContext(RouteContext);
  let {
    pathname: locationPathname
  } = useLocation();
  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches, future.v7_relativeSplatPath));
  return reactExports.useMemo(() => resolveTo(to, JSON.parse(routePathnamesJson), locationPathname, relative === "path"), [to, routePathnamesJson, locationPathname, relative]);
}
function useRoutes(routes, locationArg) {
  return useRoutesImpl(routes, locationArg);
}
function useRoutesImpl(routes, locationArg, dataRouterState, future) {
  !useInRouterContext() ? invariant(false) : void 0;
  let {
    navigator: navigator2
  } = reactExports.useContext(NavigationContext);
  let {
    matches: parentMatches
  } = reactExports.useContext(RouteContext);
  let routeMatch = parentMatches[parentMatches.length - 1];
  let parentParams = routeMatch ? routeMatch.params : {};
  routeMatch ? routeMatch.pathname : "/";
  let parentPathnameBase = routeMatch ? routeMatch.pathnameBase : "/";
  routeMatch && routeMatch.route;
  let locationFromContext = useLocation();
  let location;
  if (locationArg) {
    var _parsedLocationArg$pa;
    let parsedLocationArg = typeof locationArg === "string" ? parsePath(locationArg) : locationArg;
    !(parentPathnameBase === "/" || ((_parsedLocationArg$pa = parsedLocationArg.pathname) == null ? void 0 : _parsedLocationArg$pa.startsWith(parentPathnameBase))) ? invariant(false) : void 0;
    location = parsedLocationArg;
  } else {
    location = locationFromContext;
  }
  let pathname = location.pathname || "/";
  let remainingPathname = pathname;
  if (parentPathnameBase !== "/") {
    let parentSegments = parentPathnameBase.replace(/^\//, "").split("/");
    let segments = pathname.replace(/^\//, "").split("/");
    remainingPathname = "/" + segments.slice(parentSegments.length).join("/");
  }
  let matches = matchRoutes(routes, {
    pathname: remainingPathname
  });
  let renderedMatches = _renderMatches(matches && matches.map((match) => Object.assign({}, match, {
    params: Object.assign({}, parentParams, match.params),
    pathname: joinPaths([
      parentPathnameBase,
      // Re-encode pathnames that were decoded inside matchRoutes
      navigator2.encodeLocation ? navigator2.encodeLocation(match.pathname).pathname : match.pathname
    ]),
    pathnameBase: match.pathnameBase === "/" ? parentPathnameBase : joinPaths([
      parentPathnameBase,
      // Re-encode pathnames that were decoded inside matchRoutes
      navigator2.encodeLocation ? navigator2.encodeLocation(match.pathnameBase).pathname : match.pathnameBase
    ])
  })), parentMatches, dataRouterState, future);
  if (locationArg && renderedMatches) {
    return /* @__PURE__ */ reactExports.createElement(LocationContext.Provider, {
      value: {
        location: _extends$1({
          pathname: "/",
          search: "",
          hash: "",
          state: null,
          key: "default"
        }, location),
        navigationType: Action.Pop
      }
    }, renderedMatches);
  }
  return renderedMatches;
}
function DefaultErrorComponent() {
  let error = useRouteError();
  let message = isRouteErrorResponse(error) ? error.status + " " + error.statusText : error instanceof Error ? error.message : JSON.stringify(error);
  let stack = error instanceof Error ? error.stack : null;
  let lightgrey = "rgba(200,200,200, 0.5)";
  let preStyles = {
    padding: "0.5rem",
    backgroundColor: lightgrey
  };
  let devInfo = null;
  return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("h2", null, "Unexpected Application Error!"), /* @__PURE__ */ reactExports.createElement("h3", {
    style: {
      fontStyle: "italic"
    }
  }, message), stack ? /* @__PURE__ */ reactExports.createElement("pre", {
    style: preStyles
  }, stack) : null, devInfo);
}
const defaultErrorElement = /* @__PURE__ */ reactExports.createElement(DefaultErrorComponent, null);
class RenderErrorBoundary extends reactExports.Component {
  constructor(props) {
    super(props);
    this.state = {
      location: props.location,
      revalidation: props.revalidation,
      error: props.error
    };
  }
  static getDerivedStateFromError(error) {
    return {
      error
    };
  }
  static getDerivedStateFromProps(props, state) {
    if (state.location !== props.location || state.revalidation !== "idle" && props.revalidation === "idle") {
      return {
        error: props.error,
        location: props.location,
        revalidation: props.revalidation
      };
    }
    return {
      error: props.error !== void 0 ? props.error : state.error,
      location: state.location,
      revalidation: props.revalidation || state.revalidation
    };
  }
  componentDidCatch(error, errorInfo) {
    console.error("React Router caught the following error during render", error, errorInfo);
  }
  render() {
    return this.state.error !== void 0 ? /* @__PURE__ */ reactExports.createElement(RouteContext.Provider, {
      value: this.props.routeContext
    }, /* @__PURE__ */ reactExports.createElement(RouteErrorContext.Provider, {
      value: this.state.error,
      children: this.props.component
    })) : this.props.children;
  }
}
function RenderedRoute(_ref) {
  let {
    routeContext,
    match,
    children
  } = _ref;
  let dataRouterContext = reactExports.useContext(DataRouterContext);
  if (dataRouterContext && dataRouterContext.static && dataRouterContext.staticContext && (match.route.errorElement || match.route.ErrorBoundary)) {
    dataRouterContext.staticContext._deepestRenderedBoundaryId = match.route.id;
  }
  return /* @__PURE__ */ reactExports.createElement(RouteContext.Provider, {
    value: routeContext
  }, children);
}
function _renderMatches(matches, parentMatches, dataRouterState, future) {
  var _dataRouterState;
  if (parentMatches === void 0) {
    parentMatches = [];
  }
  if (dataRouterState === void 0) {
    dataRouterState = null;
  }
  if (future === void 0) {
    future = null;
  }
  if (matches == null) {
    var _future;
    if (!dataRouterState) {
      return null;
    }
    if (dataRouterState.errors) {
      matches = dataRouterState.matches;
    } else if ((_future = future) != null && _future.v7_partialHydration && parentMatches.length === 0 && !dataRouterState.initialized && dataRouterState.matches.length > 0) {
      matches = dataRouterState.matches;
    } else {
      return null;
    }
  }
  let renderedMatches = matches;
  let errors = (_dataRouterState = dataRouterState) == null ? void 0 : _dataRouterState.errors;
  if (errors != null) {
    let errorIndex = renderedMatches.findIndex((m2) => m2.route.id && (errors == null ? void 0 : errors[m2.route.id]) !== void 0);
    !(errorIndex >= 0) ? invariant(false) : void 0;
    renderedMatches = renderedMatches.slice(0, Math.min(renderedMatches.length, errorIndex + 1));
  }
  let renderFallback = false;
  let fallbackIndex = -1;
  if (dataRouterState && future && future.v7_partialHydration) {
    for (let i = 0; i < renderedMatches.length; i++) {
      let match = renderedMatches[i];
      if (match.route.HydrateFallback || match.route.hydrateFallbackElement) {
        fallbackIndex = i;
      }
      if (match.route.id) {
        let {
          loaderData,
          errors: errors2
        } = dataRouterState;
        let needsToRunLoader = match.route.loader && loaderData[match.route.id] === void 0 && (!errors2 || errors2[match.route.id] === void 0);
        if (match.route.lazy || needsToRunLoader) {
          renderFallback = true;
          if (fallbackIndex >= 0) {
            renderedMatches = renderedMatches.slice(0, fallbackIndex + 1);
          } else {
            renderedMatches = [renderedMatches[0]];
          }
          break;
        }
      }
    }
  }
  return renderedMatches.reduceRight((outlet, match, index) => {
    let error;
    let shouldRenderHydrateFallback = false;
    let errorElement = null;
    let hydrateFallbackElement = null;
    if (dataRouterState) {
      error = errors && match.route.id ? errors[match.route.id] : void 0;
      errorElement = match.route.errorElement || defaultErrorElement;
      if (renderFallback) {
        if (fallbackIndex < 0 && index === 0) {
          warningOnce("route-fallback");
          shouldRenderHydrateFallback = true;
          hydrateFallbackElement = null;
        } else if (fallbackIndex === index) {
          shouldRenderHydrateFallback = true;
          hydrateFallbackElement = match.route.hydrateFallbackElement || null;
        }
      }
    }
    let matches2 = parentMatches.concat(renderedMatches.slice(0, index + 1));
    let getChildren = () => {
      let children;
      if (error) {
        children = errorElement;
      } else if (shouldRenderHydrateFallback) {
        children = hydrateFallbackElement;
      } else if (match.route.Component) {
        children = /* @__PURE__ */ reactExports.createElement(match.route.Component, null);
      } else if (match.route.element) {
        children = match.route.element;
      } else {
        children = outlet;
      }
      return /* @__PURE__ */ reactExports.createElement(RenderedRoute, {
        match,
        routeContext: {
          outlet,
          matches: matches2,
          isDataRoute: dataRouterState != null
        },
        children
      });
    };
    return dataRouterState && (match.route.ErrorBoundary || match.route.errorElement || index === 0) ? /* @__PURE__ */ reactExports.createElement(RenderErrorBoundary, {
      location: dataRouterState.location,
      revalidation: dataRouterState.revalidation,
      component: errorElement,
      error,
      children: getChildren(),
      routeContext: {
        outlet: null,
        matches: matches2,
        isDataRoute: true
      }
    }) : getChildren();
  }, null);
}
var DataRouterHook$1 = /* @__PURE__ */ function(DataRouterHook2) {
  DataRouterHook2["UseBlocker"] = "useBlocker";
  DataRouterHook2["UseRevalidator"] = "useRevalidator";
  DataRouterHook2["UseNavigateStable"] = "useNavigate";
  return DataRouterHook2;
}(DataRouterHook$1 || {});
var DataRouterStateHook$1 = /* @__PURE__ */ function(DataRouterStateHook2) {
  DataRouterStateHook2["UseBlocker"] = "useBlocker";
  DataRouterStateHook2["UseLoaderData"] = "useLoaderData";
  DataRouterStateHook2["UseActionData"] = "useActionData";
  DataRouterStateHook2["UseRouteError"] = "useRouteError";
  DataRouterStateHook2["UseNavigation"] = "useNavigation";
  DataRouterStateHook2["UseRouteLoaderData"] = "useRouteLoaderData";
  DataRouterStateHook2["UseMatches"] = "useMatches";
  DataRouterStateHook2["UseRevalidator"] = "useRevalidator";
  DataRouterStateHook2["UseNavigateStable"] = "useNavigate";
  DataRouterStateHook2["UseRouteId"] = "useRouteId";
  return DataRouterStateHook2;
}(DataRouterStateHook$1 || {});
function useDataRouterContext$1(hookName) {
  let ctx = reactExports.useContext(DataRouterContext);
  !ctx ? invariant(false) : void 0;
  return ctx;
}
function useDataRouterState(hookName) {
  let state = reactExports.useContext(DataRouterStateContext);
  !state ? invariant(false) : void 0;
  return state;
}
function useRouteContext(hookName) {
  let route = reactExports.useContext(RouteContext);
  !route ? invariant(false) : void 0;
  return route;
}
function useCurrentRouteId(hookName) {
  let route = useRouteContext();
  let thisRoute = route.matches[route.matches.length - 1];
  !thisRoute.route.id ? invariant(false) : void 0;
  return thisRoute.route.id;
}
function useRouteError() {
  var _state$errors;
  let error = reactExports.useContext(RouteErrorContext);
  let state = useDataRouterState();
  let routeId = useCurrentRouteId();
  if (error !== void 0) {
    return error;
  }
  return (_state$errors = state.errors) == null ? void 0 : _state$errors[routeId];
}
function useNavigateStable() {
  let {
    router
  } = useDataRouterContext$1(DataRouterHook$1.UseNavigateStable);
  let id2 = useCurrentRouteId(DataRouterStateHook$1.UseNavigateStable);
  let activeRef = reactExports.useRef(false);
  useIsomorphicLayoutEffect(() => {
    activeRef.current = true;
  });
  let navigate = reactExports.useCallback(function(to, options) {
    if (options === void 0) {
      options = {};
    }
    if (!activeRef.current) return;
    if (typeof to === "number") {
      router.navigate(to);
    } else {
      router.navigate(to, _extends$1({
        fromRouteId: id2
      }, options));
    }
  }, [router, id2]);
  return navigate;
}
const alreadyWarned$1 = {};
function warningOnce(key, cond, message) {
  if (!alreadyWarned$1[key]) {
    alreadyWarned$1[key] = true;
  }
}
function logV6DeprecationWarnings(renderFuture, routerFuture) {
  if ((renderFuture == null ? void 0 : renderFuture.v7_startTransition) === void 0) ;
  if ((renderFuture == null ? void 0 : renderFuture.v7_relativeSplatPath) === void 0 && true) ;
}
function Navigate(_ref4) {
  let {
    to,
    replace: replace2,
    state,
    relative
  } = _ref4;
  !useInRouterContext() ? invariant(false) : void 0;
  let {
    future,
    static: isStatic
  } = reactExports.useContext(NavigationContext);
  let {
    matches
  } = reactExports.useContext(RouteContext);
  let {
    pathname: locationPathname
  } = useLocation();
  let navigate = useNavigate();
  let path = resolveTo(to, getResolveToMatches(matches, future.v7_relativeSplatPath), locationPathname, relative === "path");
  let jsonPath = JSON.stringify(path);
  reactExports.useEffect(() => navigate(JSON.parse(jsonPath), {
    replace: replace2,
    state,
    relative
  }), [navigate, jsonPath, relative, replace2, state]);
  return null;
}
function Outlet(props) {
  return useOutlet(props.context);
}
function Route(_props) {
  invariant(false);
}
function Router(_ref5) {
  let {
    basename: basenameProp = "/",
    children = null,
    location: locationProp,
    navigationType = Action.Pop,
    navigator: navigator2,
    static: staticProp = false,
    future
  } = _ref5;
  !!useInRouterContext() ? invariant(false) : void 0;
  let basename = basenameProp.replace(/^\/*/, "/");
  let navigationContext = reactExports.useMemo(() => ({
    basename,
    navigator: navigator2,
    static: staticProp,
    future: _extends$1({
      v7_relativeSplatPath: false
    }, future)
  }), [basename, future, navigator2, staticProp]);
  if (typeof locationProp === "string") {
    locationProp = parsePath(locationProp);
  }
  let {
    pathname = "/",
    search = "",
    hash = "",
    state = null,
    key = "default"
  } = locationProp;
  let locationContext = reactExports.useMemo(() => {
    let trailingPathname = stripBasename(pathname, basename);
    if (trailingPathname == null) {
      return null;
    }
    return {
      location: {
        pathname: trailingPathname,
        search,
        hash,
        state,
        key
      },
      navigationType
    };
  }, [basename, pathname, search, hash, state, key, navigationType]);
  if (locationContext == null) {
    return null;
  }
  return /* @__PURE__ */ reactExports.createElement(NavigationContext.Provider, {
    value: navigationContext
  }, /* @__PURE__ */ reactExports.createElement(LocationContext.Provider, {
    children,
    value: locationContext
  }));
}
function Routes(_ref6) {
  let {
    children,
    location
  } = _ref6;
  return useRoutes(createRoutesFromChildren(children), location);
}
new Promise(() => {
});
function createRoutesFromChildren(children, parentPath) {
  if (parentPath === void 0) {
    parentPath = [];
  }
  let routes = [];
  reactExports.Children.forEach(children, (element, index) => {
    if (!/* @__PURE__ */ reactExports.isValidElement(element)) {
      return;
    }
    let treePath = [...parentPath, index];
    if (element.type === reactExports.Fragment) {
      routes.push.apply(routes, createRoutesFromChildren(element.props.children, treePath));
      return;
    }
    !(element.type === Route) ? invariant(false) : void 0;
    !(!element.props.index || !element.props.children) ? invariant(false) : void 0;
    let route = {
      id: element.props.id || treePath.join("-"),
      caseSensitive: element.props.caseSensitive,
      element: element.props.element,
      Component: element.props.Component,
      index: element.props.index,
      path: element.props.path,
      loader: element.props.loader,
      action: element.props.action,
      errorElement: element.props.errorElement,
      ErrorBoundary: element.props.ErrorBoundary,
      hasErrorBoundary: element.props.ErrorBoundary != null || element.props.errorElement != null,
      shouldRevalidate: element.props.shouldRevalidate,
      handle: element.props.handle,
      lazy: element.props.lazy
    };
    if (element.props.children) {
      route.children = createRoutesFromChildren(element.props.children, treePath);
    }
    routes.push(route);
  });
  return routes;
}
/**
 * React Router DOM v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}
function isModifiedEvent(event) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}
function shouldProcessLinkClick(event, target) {
  return event.button === 0 && // Ignore everything but left clicks
  (!target || target === "_self") && // Let browser handle "target=_blank" etc.
  !isModifiedEvent(event);
}
const _excluded = ["onClick", "relative", "reloadDocument", "replace", "state", "target", "to", "preventScrollReset", "viewTransition"], _excluded2 = ["aria-current", "caseSensitive", "className", "end", "style", "to", "viewTransition", "children"];
const REACT_ROUTER_VERSION = "6";
try {
  window.__reactRouterVersion = REACT_ROUTER_VERSION;
} catch (e) {
}
const ViewTransitionContext = /* @__PURE__ */ reactExports.createContext({
  isTransitioning: false
});
const START_TRANSITION = "startTransition";
const startTransitionImpl = React$3[START_TRANSITION];
function HashRouter(_ref5) {
  let {
    basename,
    children,
    future,
    window: window2
  } = _ref5;
  let historyRef = reactExports.useRef();
  if (historyRef.current == null) {
    historyRef.current = createHashHistory({
      window: window2,
      v5Compat: true
    });
  }
  let history = historyRef.current;
  let [state, setStateImpl] = reactExports.useState({
    action: history.action,
    location: history.location
  });
  let {
    v7_startTransition
  } = future || {};
  let setState = reactExports.useCallback((newState) => {
    v7_startTransition && startTransitionImpl ? startTransitionImpl(() => setStateImpl(newState)) : setStateImpl(newState);
  }, [setStateImpl, v7_startTransition]);
  reactExports.useLayoutEffect(() => history.listen(setState), [history, setState]);
  reactExports.useEffect(() => logV6DeprecationWarnings(future), [future]);
  return /* @__PURE__ */ reactExports.createElement(Router, {
    basename,
    children,
    location: state.location,
    navigationType: state.action,
    navigator: history,
    future
  });
}
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined" && typeof window.document.createElement !== "undefined";
const ABSOLUTE_URL_REGEX = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const Link = /* @__PURE__ */ reactExports.forwardRef(function LinkWithRef(_ref7, ref) {
  let {
    onClick,
    relative,
    reloadDocument,
    replace: replace2,
    state,
    target,
    to,
    preventScrollReset,
    viewTransition
  } = _ref7, rest = _objectWithoutPropertiesLoose(_ref7, _excluded);
  let {
    basename
  } = reactExports.useContext(NavigationContext);
  let absoluteHref;
  let isExternal = false;
  if (typeof to === "string" && ABSOLUTE_URL_REGEX.test(to)) {
    absoluteHref = to;
    if (isBrowser) {
      try {
        let currentUrl = new URL(window.location.href);
        let targetUrl = to.startsWith("//") ? new URL(currentUrl.protocol + to) : new URL(to);
        let path = stripBasename(targetUrl.pathname, basename);
        if (targetUrl.origin === currentUrl.origin && path != null) {
          to = path + targetUrl.search + targetUrl.hash;
        } else {
          isExternal = true;
        }
      } catch (e) {
      }
    }
  }
  let href = useHref(to, {
    relative
  });
  let internalOnClick = useLinkClickHandler(to, {
    replace: replace2,
    state,
    target,
    preventScrollReset,
    relative,
    viewTransition
  });
  function handleClick(event) {
    if (onClick) onClick(event);
    if (!event.defaultPrevented) {
      internalOnClick(event);
    }
  }
  return (
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    /* @__PURE__ */ reactExports.createElement("a", _extends({}, rest, {
      href: absoluteHref || href,
      onClick: isExternal || reloadDocument ? onClick : handleClick,
      ref,
      target
    }))
  );
});
const NavLink = /* @__PURE__ */ reactExports.forwardRef(function NavLinkWithRef(_ref8, ref) {
  let {
    "aria-current": ariaCurrentProp = "page",
    caseSensitive = false,
    className: classNameProp = "",
    end = false,
    style: styleProp,
    to,
    viewTransition,
    children
  } = _ref8, rest = _objectWithoutPropertiesLoose(_ref8, _excluded2);
  let path = useResolvedPath(to, {
    relative: rest.relative
  });
  let location = useLocation();
  let routerState = reactExports.useContext(DataRouterStateContext);
  let {
    navigator: navigator2,
    basename
  } = reactExports.useContext(NavigationContext);
  let isTransitioning = routerState != null && // Conditional usage is OK here because the usage of a data router is static
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useViewTransitionState(path) && viewTransition === true;
  let toPathname = navigator2.encodeLocation ? navigator2.encodeLocation(path).pathname : path.pathname;
  let locationPathname = location.pathname;
  let nextLocationPathname = routerState && routerState.navigation && routerState.navigation.location ? routerState.navigation.location.pathname : null;
  if (!caseSensitive) {
    locationPathname = locationPathname.toLowerCase();
    nextLocationPathname = nextLocationPathname ? nextLocationPathname.toLowerCase() : null;
    toPathname = toPathname.toLowerCase();
  }
  if (nextLocationPathname && basename) {
    nextLocationPathname = stripBasename(nextLocationPathname, basename) || nextLocationPathname;
  }
  const endSlashPosition = toPathname !== "/" && toPathname.endsWith("/") ? toPathname.length - 1 : toPathname.length;
  let isActive = locationPathname === toPathname || !end && locationPathname.startsWith(toPathname) && locationPathname.charAt(endSlashPosition) === "/";
  let isPending = nextLocationPathname != null && (nextLocationPathname === toPathname || !end && nextLocationPathname.startsWith(toPathname) && nextLocationPathname.charAt(toPathname.length) === "/");
  let renderProps = {
    isActive,
    isPending,
    isTransitioning
  };
  let ariaCurrent = isActive ? ariaCurrentProp : void 0;
  let className;
  if (typeof classNameProp === "function") {
    className = classNameProp(renderProps);
  } else {
    className = [classNameProp, isActive ? "active" : null, isPending ? "pending" : null, isTransitioning ? "transitioning" : null].filter(Boolean).join(" ");
  }
  let style = typeof styleProp === "function" ? styleProp(renderProps) : styleProp;
  return /* @__PURE__ */ reactExports.createElement(Link, _extends({}, rest, {
    "aria-current": ariaCurrent,
    className,
    ref,
    style,
    to,
    viewTransition
  }), typeof children === "function" ? children(renderProps) : children);
});
var DataRouterHook;
(function(DataRouterHook2) {
  DataRouterHook2["UseScrollRestoration"] = "useScrollRestoration";
  DataRouterHook2["UseSubmit"] = "useSubmit";
  DataRouterHook2["UseSubmitFetcher"] = "useSubmitFetcher";
  DataRouterHook2["UseFetcher"] = "useFetcher";
  DataRouterHook2["useViewTransitionState"] = "useViewTransitionState";
})(DataRouterHook || (DataRouterHook = {}));
var DataRouterStateHook;
(function(DataRouterStateHook2) {
  DataRouterStateHook2["UseFetcher"] = "useFetcher";
  DataRouterStateHook2["UseFetchers"] = "useFetchers";
  DataRouterStateHook2["UseScrollRestoration"] = "useScrollRestoration";
})(DataRouterStateHook || (DataRouterStateHook = {}));
function useDataRouterContext(hookName) {
  let ctx = reactExports.useContext(DataRouterContext);
  !ctx ? invariant(false) : void 0;
  return ctx;
}
function useLinkClickHandler(to, _temp) {
  let {
    target,
    replace: replaceProp,
    state,
    preventScrollReset,
    relative,
    viewTransition
  } = _temp === void 0 ? {} : _temp;
  let navigate = useNavigate();
  let location = useLocation();
  let path = useResolvedPath(to, {
    relative
  });
  return reactExports.useCallback((event) => {
    if (shouldProcessLinkClick(event, target)) {
      event.preventDefault();
      let replace2 = replaceProp !== void 0 ? replaceProp : createPath(location) === createPath(path);
      navigate(to, {
        replace: replace2,
        state,
        preventScrollReset,
        relative,
        viewTransition
      });
    }
  }, [location, navigate, path, replaceProp, state, target, to, preventScrollReset, relative, viewTransition]);
}
function useViewTransitionState(to, opts) {
  if (opts === void 0) {
    opts = {};
  }
  let vtContext = reactExports.useContext(ViewTransitionContext);
  !(vtContext != null) ? invariant(false) : void 0;
  let {
    basename
  } = useDataRouterContext(DataRouterHook.useViewTransitionState);
  let path = useResolvedPath(to, {
    relative: opts.relative
  });
  if (!vtContext.isTransitioning) {
    return false;
  }
  let currentPath = stripBasename(vtContext.currentLocation.pathname, basename) || vtContext.currentLocation.pathname;
  let nextPath = stripBasename(vtContext.nextLocation.pathname, basename) || vtContext.nextLocation.pathname;
  return matchPath(path.pathname, nextPath) != null || matchPath(path.pathname, currentPath) != null;
}
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && array.indexOf(className) === index;
}).join(" ");
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Icon = reactExports.forwardRef(
  ({
    color = "currentColor",
    size = 24,
    strokeWidth = 2,
    absoluteStrokeWidth,
    className = "",
    children,
    iconNode,
    ...rest
  }, ref) => {
    return reactExports.createElement(
      "svg",
      {
        ref,
        ...defaultAttributes,
        width: size,
        height: size,
        stroke: color,
        strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
        className: mergeClasses("lucide", className),
        ...rest
      },
      [
        ...iconNode.map(([tag, attrs]) => reactExports.createElement(tag, attrs)),
        ...Array.isArray(children) ? children : [children]
      ]
    );
  }
);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const createLucideIcon = (iconName, iconNode) => {
  const Component = reactExports.forwardRef(
    ({ className, ...props }, ref) => reactExports.createElement(Icon, {
      ref,
      iconNode,
      className: mergeClasses(`lucide-${toKebabCase(iconName)}`, className),
      ...props
    })
  );
  Component.displayName = `${iconName}`;
  return Component;
};
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Activity = createLucideIcon("Activity", [
  [
    "path",
    {
      d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
      key: "169zse"
    }
  ]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Archive = createLucideIcon("Archive", [
  ["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1", key: "1wp1u1" }],
  ["path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8", key: "1s80jp" }],
  ["path", { d: "M10 12h4", key: "a56b0p" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ArrowLeft = createLucideIcon("ArrowLeft", [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ArrowRight = createLucideIcon("ArrowRight", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Boxes = createLucideIcon("Boxes", [
  [
    "path",
    {
      d: "M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",
      key: "lc1i9w"
    }
  ],
  ["path", { d: "m7 16.5-4.74-2.85", key: "1o9zyk" }],
  ["path", { d: "m7 16.5 5-3", key: "va8pkn" }],
  ["path", { d: "M7 16.5v5.17", key: "jnp8gn" }],
  [
    "path",
    {
      d: "M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",
      key: "8zsnat"
    }
  ],
  ["path", { d: "m17 16.5-5-3", key: "8arw3v" }],
  ["path", { d: "m17 16.5 4.74-2.85", key: "8rfmw" }],
  ["path", { d: "M17 16.5v5.17", key: "k6z78m" }],
  [
    "path",
    {
      d: "M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",
      key: "1xygjf"
    }
  ],
  ["path", { d: "M12 8 7.26 5.15", key: "1vbdud" }],
  ["path", { d: "m12 8 4.74-2.85", key: "3rx089" }],
  ["path", { d: "M12 13.5V8", key: "1io7kd" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Brain = createLucideIcon("Brain", [
  [
    "path",
    {
      d: "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",
      key: "l5xja"
    }
  ],
  [
    "path",
    {
      d: "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z",
      key: "ep3f8r"
    }
  ],
  ["path", { d: "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4", key: "1p4c4q" }],
  ["path", { d: "M17.599 6.5a3 3 0 0 0 .399-1.375", key: "tmeiqw" }],
  ["path", { d: "M6.003 5.125A3 3 0 0 0 6.401 6.5", key: "105sqy" }],
  ["path", { d: "M3.477 10.896a4 4 0 0 1 .585-.396", key: "ql3yin" }],
  ["path", { d: "M19.938 10.5a4 4 0 0 1 .585.396", key: "1qfode" }],
  ["path", { d: "M6 18a4 4 0 0 1-1.967-.516", key: "2e4loj" }],
  ["path", { d: "M19.967 17.484A4 4 0 0 1 18 18", key: "159ez6" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Calendar = createLucideIcon("Calendar", [
  ["path", { d: "M8 2v4", key: "1cmpym" }],
  ["path", { d: "M16 2v4", key: "4m81vk" }],
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "1hopcy" }],
  ["path", { d: "M3 10h18", key: "8toen8" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Check = createLucideIcon("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ChevronDown = createLucideIcon("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ChevronRight = createLucideIcon("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CircleAlert = createLucideIcon("CircleAlert", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["line", { x1: "12", x2: "12", y1: "8", y2: "12", key: "1pkeuh" }],
  ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16", key: "4dfq90" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CircleCheck = createLucideIcon("CircleCheck", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CircleHelp = createLucideIcon("CircleHelp", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CircleX = createLucideIcon("CircleX", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m15 9-6 6", key: "1uzhvr" }],
  ["path", { d: "m9 9 6 6", key: "z0biqf" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ClipboardCheck = createLucideIcon("ClipboardCheck", [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1", key: "tgr4d6" }],
  [
    "path",
    {
      d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
      key: "116196"
    }
  ],
  ["path", { d: "m9 14 2 2 4-4", key: "df797q" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Clock = createLucideIcon("Clock", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CloudDownload = createLucideIcon("CloudDownload", [
  ["path", { d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242", key: "1pljnt" }],
  ["path", { d: "M12 12v9", key: "192myk" }],
  ["path", { d: "m8 17 4 4 4-4", key: "1ul180" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Compass = createLucideIcon("Compass", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polygon", { points: "16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76", key: "m9r19z" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Copy = createLucideIcon("Copy", [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Cpu = createLucideIcon("Cpu", [
  ["rect", { width: "16", height: "16", x: "4", y: "4", rx: "2", key: "14l7u7" }],
  ["rect", { width: "6", height: "6", x: "9", y: "9", rx: "1", key: "5aljv4" }],
  ["path", { d: "M15 2v2", key: "13l42r" }],
  ["path", { d: "M15 20v2", key: "15mkzm" }],
  ["path", { d: "M2 15h2", key: "1gxd5l" }],
  ["path", { d: "M2 9h2", key: "1bbxkp" }],
  ["path", { d: "M20 15h2", key: "19e6y8" }],
  ["path", { d: "M20 9h2", key: "19tzq7" }],
  ["path", { d: "M9 2v2", key: "165o2o" }],
  ["path", { d: "M9 20v2", key: "i2bqo8" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Database = createLucideIcon("Database", [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
  ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
  ["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Download = createLucideIcon("Download", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
  ["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const EllipsisVertical = createLucideIcon("EllipsisVertical", [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "12", cy: "5", r: "1", key: "gxeob9" }],
  ["circle", { cx: "12", cy: "19", r: "1", key: "lyex9k" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ExternalLink = createLucideIcon("ExternalLink", [
  ["path", { d: "M15 3h6v6", key: "1q9fwt" }],
  ["path", { d: "M10 14 21 3", key: "gplh6r" }],
  ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", key: "a6xqqp" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const FileSearch = createLucideIcon("FileSearch", [
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  [
    "path",
    { d: "M4.268 21a2 2 0 0 0 1.727 1H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3", key: "ms7g94" }
  ],
  ["path", { d: "m9 18-1.5-1.5", key: "1j6qii" }],
  ["circle", { cx: "5", cy: "14", r: "3", key: "ufru5t" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Filter = createLucideIcon("Filter", [
  ["polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3", key: "1yg77f" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const FolderOpen = createLucideIcon("FolderOpen", [
  [
    "path",
    {
      d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",
      key: "usdka0"
    }
  ]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const FolderTree = createLucideIcon("FolderTree", [
  [
    "path",
    {
      d: "M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z",
      key: "hod4my"
    }
  ],
  [
    "path",
    {
      d: "M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z",
      key: "w4yl2u"
    }
  ],
  ["path", { d: "M3 5a2 2 0 0 0 2 2h3", key: "f2jnh7" }],
  ["path", { d: "M3 3v13a2 2 0 0 0 2 2h3", key: "k8epm1" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Gauge = createLucideIcon("Gauge", [
  ["path", { d: "m12 14 4-4", key: "9kzdfg" }],
  ["path", { d: "M3.34 19a10 10 0 1 1 17.32 0", key: "19p75a" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Globe = createLucideIcon("Globe", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", key: "13o1zl" }],
  ["path", { d: "M2 12h20", key: "9i4pu4" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const HardDrive = createLucideIcon("HardDrive", [
  ["line", { x1: "22", x2: "2", y1: "12", y2: "12", key: "1y58io" }],
  [
    "path",
    {
      d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
      key: "oot6mr"
    }
  ],
  ["line", { x1: "6", x2: "6.01", y1: "16", y2: "16", key: "sgf278" }],
  ["line", { x1: "10", x2: "10.01", y1: "16", y2: "16", key: "1l4acy" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Image = createLucideIcon("Image", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const KeyRound = createLucideIcon("KeyRound", [
  ["path", { d: "M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z", key: "167ctg" }],
  ["circle", { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor", key: "w0ekpg" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Layers = createLucideIcon("Layers", [
  [
    "path",
    {
      d: "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",
      key: "8b97xw"
    }
  ],
  ["path", { d: "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65", key: "dd6zsq" }],
  ["path", { d: "m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65", key: "ep9fru" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const LayoutDashboard = createLucideIcon("LayoutDashboard", [
  ["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" }],
  ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" }],
  ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" }],
  ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ListChecks = createLucideIcon("ListChecks", [
  ["path", { d: "m3 17 2 2 4-4", key: "1jhpwq" }],
  ["path", { d: "m3 7 2 2 4-4", key: "1obspn" }],
  ["path", { d: "M13 6h8", key: "15sg57" }],
  ["path", { d: "M13 12h8", key: "h98zly" }],
  ["path", { d: "M13 18h8", key: "oe0vm4" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const LoaderCircle = createLucideIcon("LoaderCircle", [
  ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Maximize2 = createLucideIcon("Maximize2", [
  ["polyline", { points: "15 3 21 3 21 9", key: "mznyad" }],
  ["polyline", { points: "9 21 3 21 3 15", key: "1avn1i" }],
  ["line", { x1: "21", x2: "14", y1: "3", y2: "10", key: "ota7mn" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Merge = createLucideIcon("Merge", [
  ["path", { d: "m8 6 4-4 4 4", key: "ybng9g" }],
  ["path", { d: "M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22", key: "1hyw0i" }],
  ["path", { d: "m20 22-5-5", key: "1m27yz" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Minimize2 = createLucideIcon("Minimize2", [
  ["polyline", { points: "4 14 10 14 10 20", key: "11kfnr" }],
  ["polyline", { points: "20 10 14 10 14 4", key: "rlmsce" }],
  ["line", { x1: "14", x2: "21", y1: "10", y2: "3", key: "o5lafz" }],
  ["line", { x1: "3", x2: "10", y1: "21", y2: "14", key: "1atl0r" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Moon = createLucideIcon("Moon", [
  ["path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z", key: "a7tn18" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Palette = createLucideIcon("Palette", [
  ["circle", { cx: "13.5", cy: "6.5", r: ".5", fill: "currentColor", key: "1okk4w" }],
  ["circle", { cx: "17.5", cy: "10.5", r: ".5", fill: "currentColor", key: "f64h9f" }],
  ["circle", { cx: "8.5", cy: "7.5", r: ".5", fill: "currentColor", key: "fotxhn" }],
  ["circle", { cx: "6.5", cy: "12.5", r: ".5", fill: "currentColor", key: "qy21gx" }],
  [
    "path",
    {
      d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",
      key: "12rzf8"
    }
  ]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const PanelRight = createLucideIcon("PanelRight", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "M15 3v18", key: "14nvp0" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Pen = createLucideIcon("Pen", [
  ["path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z", key: "5qss01" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Play = createLucideIcon("Play", [
  ["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Plus = createLucideIcon("Plus", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Power = createLucideIcon("Power", [
  ["path", { d: "M12 2v10", key: "mnfbl" }],
  ["path", { d: "M18.4 6.6a9 9 0 1 1-12.77.04", key: "obofu9" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const RefreshCw = createLucideIcon("RefreshCw", [
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
  ["path", { d: "M8 16H3v5", key: "1cv678" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const RotateCcw = createLucideIcon("RotateCcw", [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const RotateCw = createLucideIcon("RotateCw", [
  ["path", { d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8", key: "1p45f6" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Save = createLucideIcon("Save", [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Search$1 = createLucideIcon("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Server = createLucideIcon("Server", [
  ["rect", { width: "20", height: "8", x: "2", y: "2", rx: "2", ry: "2", key: "ngkwjq" }],
  ["rect", { width: "20", height: "8", x: "2", y: "14", rx: "2", ry: "2", key: "iecqi9" }],
  ["line", { x1: "6", x2: "6.01", y1: "6", y2: "6", key: "16zg32" }],
  ["line", { x1: "6", x2: "6.01", y1: "18", y2: "18", key: "nzw8ys" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Settings$1 = createLucideIcon("Settings", [
  [
    "path",
    {
      d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
      key: "1qme2f"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ShieldAlert = createLucideIcon("ShieldAlert", [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "M12 8v4", key: "1got3b" }],
  ["path", { d: "M12 16h.01", key: "1drbdi" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ShieldCheck = createLucideIcon("ShieldCheck", [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const SlidersVertical = createLucideIcon("SlidersVertical", [
  ["line", { x1: "4", x2: "4", y1: "21", y2: "14", key: "1p332r" }],
  ["line", { x1: "4", x2: "4", y1: "10", y2: "3", key: "gb41h5" }],
  ["line", { x1: "12", x2: "12", y1: "21", y2: "12", key: "hf2csr" }],
  ["line", { x1: "12", x2: "12", y1: "8", y2: "3", key: "1kfi7u" }],
  ["line", { x1: "20", x2: "20", y1: "21", y2: "16", key: "1lhrwl" }],
  ["line", { x1: "20", x2: "20", y1: "12", y2: "3", key: "16vvfq" }],
  ["line", { x1: "2", x2: "6", y1: "14", y2: "14", key: "1uebub" }],
  ["line", { x1: "10", x2: "14", y1: "8", y2: "8", key: "1yglbp" }],
  ["line", { x1: "18", x2: "22", y1: "16", y2: "16", key: "1jxqpz" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Sparkles = createLucideIcon("Sparkles", [
  [
    "path",
    {
      d: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
      key: "4pj2yx"
    }
  ],
  ["path", { d: "M20 3v4", key: "1olli1" }],
  ["path", { d: "M22 5h-4", key: "1gvqau" }],
  ["path", { d: "M4 17v2", key: "vumght" }],
  ["path", { d: "M5 18H3", key: "zchphs" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const SquareCheckBig = createLucideIcon("SquareCheckBig", [
  ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }],
  ["path", { d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11", key: "1jnkn4" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const SquareTerminal = createLucideIcon("SquareTerminal", [
  ["path", { d: "m7 11 2-2-2-2", key: "1lz0vl" }],
  ["path", { d: "M11 13h4", key: "1p7l4v" }],
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Square = createLucideIcon("Square", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Star = createLucideIcon("Star", [
  [
    "polygon",
    {
      points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",
      key: "8f66p6"
    }
  ]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Sun = createLucideIcon("Sun", [
  ["circle", { cx: "12", cy: "12", r: "4", key: "4exip2" }],
  ["path", { d: "M12 2v2", key: "tus03m" }],
  ["path", { d: "M12 20v2", key: "1lh1kg" }],
  ["path", { d: "m4.93 4.93 1.41 1.41", key: "149t6j" }],
  ["path", { d: "m17.66 17.66 1.41 1.41", key: "ptbguv" }],
  ["path", { d: "M2 12h2", key: "1t8f8n" }],
  ["path", { d: "M20 12h2", key: "1q8mjw" }],
  ["path", { d: "m6.34 17.66-1.41 1.41", key: "1m8zz5" }],
  ["path", { d: "m19.07 4.93-1.41 1.41", key: "1shlcs" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Tag = createLucideIcon("Tag", [
  [
    "path",
    {
      d: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",
      key: "vktsd0"
    }
  ],
  ["circle", { cx: "7.5", cy: "7.5", r: ".5", fill: "currentColor", key: "kqv944" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Trash2 = createLucideIcon("Trash2", [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const TrendingUp = createLucideIcon("TrendingUp", [
  ["polyline", { points: "22 7 13.5 15.5 8.5 10.5 2 17", key: "126l90" }],
  ["polyline", { points: "16 7 22 7 22 13", key: "kwv8wd" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const TriangleAlert = createLucideIcon("TriangleAlert", [
  [
    "path",
    {
      d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
      key: "wmoenq"
    }
  ],
  ["path", { d: "M12 9v4", key: "juzpu7" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Type = createLucideIcon("Type", [
  ["polyline", { points: "4 7 4 4 20 4 20 7", key: "1nosan" }],
  ["line", { x1: "9", x2: "15", y1: "20", y2: "20", key: "swin9y" }],
  ["line", { x1: "12", x2: "12", y1: "4", y2: "20", key: "1tx1rr" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const User = createLucideIcon("User", [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const WandSparkles = createLucideIcon("WandSparkles", [
  [
    "path",
    {
      d: "m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72",
      key: "ul74o6"
    }
  ],
  ["path", { d: "m14 7 3 3", key: "1r5n42" }],
  ["path", { d: "M5 6v4", key: "ilb8ba" }],
  ["path", { d: "M19 14v4", key: "blhpug" }],
  ["path", { d: "M10 2v2", key: "7u0qdc" }],
  ["path", { d: "M7 8H3", key: "zfb6yr" }],
  ["path", { d: "M21 16h-4", key: "1cnmox" }],
  ["path", { d: "M11 3H9", key: "1obp7u" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Wrench = createLucideIcon("Wrench", [
  [
    "path",
    {
      d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
      key: "cbrjhi"
    }
  ]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const X = createLucideIcon("X", [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Zap = createLucideIcon("Zap", [
  [
    "path",
    {
      d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
      key: "1xq2db"
    }
  ]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ZoomIn = createLucideIcon("ZoomIn", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["line", { x1: "21", x2: "16.65", y1: "21", y2: "16.65", key: "13gj7c" }],
  ["line", { x1: "11", x2: "11", y1: "8", y2: "14", key: "1vmskp" }],
  ["line", { x1: "8", x2: "14", y1: "11", y2: "11", key: "durymu" }]
]);
/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ZoomOut = createLucideIcon("ZoomOut", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["line", { x1: "21", x2: "16.65", y1: "21", y2: "16.65", key: "13gj7c" }],
  ["line", { x1: "8", x2: "14", y1: "11", y2: "11", key: "durymu" }]
]);
const __vite_import_meta_env__$1 = {};
const createStoreImpl = (createState) => {
  let state;
  const listeners = /* @__PURE__ */ new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const getInitialState = () => initialState;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const destroy = () => {
    if ((__vite_import_meta_env__$1 ? "production" : void 0) !== "production") {
      console.warn(
        "[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."
      );
    }
    listeners.clear();
  };
  const api2 = { setState, getState, getInitialState, subscribe, destroy };
  const initialState = state = createState(setState, getState, api2);
  return api2;
};
const createStore = (createState) => createState ? createStoreImpl(createState) : createStoreImpl;
var withSelector = { exports: {} };
var withSelector_production = {};
var shim$2 = { exports: {} };
var useSyncExternalStoreShim_production = {};
/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var React$1 = reactExports;
function is$1(x2, y2) {
  return x2 === y2 && (0 !== x2 || 1 / x2 === 1 / y2) || x2 !== x2 && y2 !== y2;
}
var objectIs$1 = "function" === typeof Object.is ? Object.is : is$1, useState = React$1.useState, useEffect$1 = React$1.useEffect, useLayoutEffect = React$1.useLayoutEffect, useDebugValue$2 = React$1.useDebugValue;
function useSyncExternalStore$2(subscribe, getSnapshot) {
  var value = getSnapshot(), _useState = useState({ inst: { value, getSnapshot } }), inst = _useState[0].inst, forceUpdate = _useState[1];
  useLayoutEffect(
    function() {
      inst.value = value;
      inst.getSnapshot = getSnapshot;
      checkIfSnapshotChanged(inst) && forceUpdate({ inst });
    },
    [subscribe, value, getSnapshot]
  );
  useEffect$1(
    function() {
      checkIfSnapshotChanged(inst) && forceUpdate({ inst });
      return subscribe(function() {
        checkIfSnapshotChanged(inst) && forceUpdate({ inst });
      });
    },
    [subscribe]
  );
  useDebugValue$2(value);
  return value;
}
function checkIfSnapshotChanged(inst) {
  var latestGetSnapshot = inst.getSnapshot;
  inst = inst.value;
  try {
    var nextValue = latestGetSnapshot();
    return !objectIs$1(inst, nextValue);
  } catch (error) {
    return true;
  }
}
function useSyncExternalStore$1(subscribe, getSnapshot) {
  return getSnapshot();
}
var shim$1 = "undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement ? useSyncExternalStore$1 : useSyncExternalStore$2;
useSyncExternalStoreShim_production.useSyncExternalStore = void 0 !== React$1.useSyncExternalStore ? React$1.useSyncExternalStore : shim$1;
{
  shim$2.exports = useSyncExternalStoreShim_production;
}
var shimExports = shim$2.exports;
/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var React = reactExports, shim = shimExports;
function is(x2, y2) {
  return x2 === y2 && (0 !== x2 || 1 / x2 === 1 / y2) || x2 !== x2 && y2 !== y2;
}
var objectIs = "function" === typeof Object.is ? Object.is : is, useSyncExternalStore = shim.useSyncExternalStore, useRef = React.useRef, useEffect = React.useEffect, useMemo = React.useMemo, useDebugValue$1 = React.useDebugValue;
withSelector_production.useSyncExternalStoreWithSelector = function(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
  var instRef = useRef(null);
  if (null === instRef.current) {
    var inst = { hasValue: false, value: null };
    instRef.current = inst;
  } else inst = instRef.current;
  instRef = useMemo(
    function() {
      function memoizedSelector(nextSnapshot) {
        if (!hasMemo) {
          hasMemo = true;
          memoizedSnapshot = nextSnapshot;
          nextSnapshot = selector(nextSnapshot);
          if (void 0 !== isEqual && inst.hasValue) {
            var currentSelection = inst.value;
            if (isEqual(currentSelection, nextSnapshot))
              return memoizedSelection = currentSelection;
          }
          return memoizedSelection = nextSnapshot;
        }
        currentSelection = memoizedSelection;
        if (objectIs(memoizedSnapshot, nextSnapshot)) return currentSelection;
        var nextSelection = selector(nextSnapshot);
        if (void 0 !== isEqual && isEqual(currentSelection, nextSelection))
          return memoizedSnapshot = nextSnapshot, currentSelection;
        memoizedSnapshot = nextSnapshot;
        return memoizedSelection = nextSelection;
      }
      var hasMemo = false, memoizedSnapshot, memoizedSelection, maybeGetServerSnapshot = void 0 === getServerSnapshot ? null : getServerSnapshot;
      return [
        function() {
          return memoizedSelector(getSnapshot());
        },
        null === maybeGetServerSnapshot ? void 0 : function() {
          return memoizedSelector(maybeGetServerSnapshot());
        }
      ];
    },
    [getSnapshot, getServerSnapshot, selector, isEqual]
  );
  var value = useSyncExternalStore(subscribe, instRef[0], instRef[1]);
  useEffect(
    function() {
      inst.hasValue = true;
      inst.value = value;
    },
    [value]
  );
  useDebugValue$1(value);
  return value;
};
{
  withSelector.exports = withSelector_production;
}
var withSelectorExports = withSelector.exports;
const useSyncExternalStoreExports = /* @__PURE__ */ getDefaultExportFromCjs(withSelectorExports);
const __vite_import_meta_env__ = {};
const { useDebugValue } = React$2;
const { useSyncExternalStoreWithSelector } = useSyncExternalStoreExports;
let didWarnAboutEqualityFn = false;
const identity = (arg) => arg;
function useStore(api2, selector = identity, equalityFn) {
  if ((__vite_import_meta_env__ ? "production" : void 0) !== "production" && equalityFn && !didWarnAboutEqualityFn) {
    console.warn(
      "[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"
    );
    didWarnAboutEqualityFn = true;
  }
  const slice = useSyncExternalStoreWithSelector(
    api2.subscribe,
    api2.getState,
    api2.getServerState || api2.getInitialState,
    selector,
    equalityFn
  );
  useDebugValue(slice);
  return slice;
}
const createImpl = (createState) => {
  if ((__vite_import_meta_env__ ? "production" : void 0) !== "production" && typeof createState !== "function") {
    console.warn(
      "[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`."
    );
  }
  const api2 = typeof createState === "function" ? createStore(createState) : createState;
  const useBoundStore = (selector, equalityFn) => useStore(api2, selector, equalityFn);
  Object.assign(useBoundStore, api2);
  return useBoundStore;
};
const create = (createState) => createState ? createImpl(createState) : createImpl;
const api$6 = window.electronAPI;
function mapDbAssetToAsset(dbAsset) {
  const isHttp = (p2) => p2 && (p2.startsWith("http://") || p2.startsWith("https://"));
  const thumbnailPath = dbAsset.thumbnail_path ? isHttp(dbAsset.thumbnail_path) ? dbAsset.thumbnail_path : `local-file://${dbAsset.thumbnail_path}` : "";
  const fileUrl = dbAsset.file_path ? isHttp(dbAsset.file_path) ? dbAsset.file_path : `local-file://${dbAsset.file_path}` : "";
  return {
    id: dbAsset.id,
    title: dbAsset.title,
    fileName: dbAsset.file_name,
    filePath: dbAsset.file_path,
    thumbnailPath,
    fileUrl,
    sourceSiteId: dbAsset.source_site_id,
    sourceSiteName: dbAsset.source_site_name,
    sourcePageUrl: dbAsset.source_page_url || "",
    originalUrl: dbAsset.original_url || "",
    width: dbAsset.width || 0,
    height: dbAsset.height || 0,
    fileSize: dbAsset.file_size || 0,
    fileType: dbAsset.file_type || "JPG",
    dominantColor: dbAsset.dominant_color,
    browserPageTitle: dbAsset.browser_page_title || "",
    captureMethod: dbAsset.capture_method || "search",
    aiTagStatus: dbAsset.ai_tag_status || "not_started",
    aiTaggedAt: dbAsset.ai_tagged_at || "",
    aiPromptStatus: dbAsset.ai_prompt_status || "not_started",
    aiPrompt: dbAsset.ai_prompt || "",
    aiCaption: dbAsset.ai_caption || "",
    aiCaptionSource: dbAsset.ai_caption_source || "",
    aiCaptionUpdatedAt: dbAsset.ai_caption_updated_at || "",
    aiCaptionIsUserEdited: dbAsset.ai_caption_is_user_edited || 0,
    aiOcrText: dbAsset.ai_ocr_text || "",
    aiOcrSource: dbAsset.ai_ocr_source || "",
    aiOcrUpdatedAt: dbAsset.ai_ocr_updated_at || "",
    aiAnalysisStatus: dbAsset.ai_analysis_status || "not_started",
    aiAnalysisJson: dbAsset.ai_analysis_json || "",
    lastTagUpdatedAt: dbAsset.last_tag_updated_at || "",
    color_palette_json: dbAsset.color_palette_json || "",
    tags: dbAsset.tags || [],
    createdAt: dbAsset.created_at
  };
}
function mapDbTagToTag(dbTag) {
  let parsedAliases = [];
  try {
    parsedAliases = dbTag.aliases ? JSON.parse(dbTag.aliases) : [];
  } catch (e) {
    parsedAliases = Array.isArray(dbTag.aliases) ? dbTag.aliases : [];
  }
  return {
    id: dbTag.id,
    name: dbTag.name,
    normalizedName: dbTag.normalized_name || dbTag.name.toLowerCase(),
    slug: dbTag.slug || "",
    type: dbTag.type || "custom",
    color: dbTag.color || "bg-slate-100 text-slate-700 border border-slate-200",
    description: dbTag.description || "",
    shorthand: dbTag.shorthand || "",
    aliases: parsedAliases,
    parentId: dbTag.parent_id || null,
    isCategory: !!dbTag.is_category,
    isSystem: !!dbTag.is_system,
    usageCount: dbTag.usage_count || 0,
    createdAt: dbTag.created_at,
    updatedAt: dbTag.updated_at || dbTag.created_at
  };
}
const useAssetStore = create((set, get) => ({
  assets: [],
  tags: [],
  selectedAsset: null,
  activeTagSearchQueries: [],
  bulkSelectedAssetIds: [],
  assetRelations: {},
  searchQuery: "",
  filterSite: "",
  filterTag: "",
  includePending: false,
  setSelectedAsset: (asset) => {
    set({ selectedAsset: asset });
    if (asset) {
      get().loadAssetTags(asset.id);
    }
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterSite: (filterSite) => set({ filterSite }),
  setFilterTag: (filterTag) => {
    set({ filterTag });
    if (filterTag) {
      get().addActiveTagSearchQuery(`tag:${filterTag}`);
    }
  },
  setIncludePending: (includePending) => {
    set({ includePending });
    get().loadAssets();
  },
  // Bulk Assets Selection
  toggleBulkSelectedAssetId: (id2) => {
    const list = get().bulkSelectedAssetIds;
    if (list.includes(id2)) {
      set({ bulkSelectedAssetIds: list.filter((x2) => x2 !== id2) });
    } else {
      set({ bulkSelectedAssetIds: [...list, id2] });
    }
  },
  clearBulkSelectedAssetIds: () => set({ bulkSelectedAssetIds: [] }),
  // Tag Search Queries
  addActiveTagSearchQuery: (query) => {
    const queries = get().activeTagSearchQueries;
    if (!queries.includes(query)) {
      const updated = [...queries, query];
      set({ activeTagSearchQueries: updated });
      get().loadAssets();
    }
  },
  removeActiveTagSearchQuery: (query) => {
    const queries = get().activeTagSearchQueries;
    const updated = queries.filter((x2) => x2 !== query);
    set({ activeTagSearchQueries: updated });
    if (query.startsWith("tag:")) {
      const tagVal = query.substring(4);
      if (get().filterTag === tagVal) {
        set({ filterTag: "" });
      }
    }
    get().loadAssets();
  },
  clearActiveTagSearchQueries: () => {
    set({ activeTagSearchQueries: [], filterTag: "" });
    get().loadAssets();
  },
  loadAssets: async () => {
    if (api$6) {
      try {
        const queries = get().activeTagSearchQueries;
        const includePending = get().includePending;
        const dbAssets = await api$6.listAssets({
          keyword: queries.length > 0 ? queries.join(" ") : void 0,
          includePending
        });
        const mappedAssets = dbAssets.map(mapDbAssetToAsset);
        set({ assets: mappedAssets });
        const currentSel = get().selectedAsset;
        if (currentSel) {
          const matched = mappedAssets.find((a) => a.id === currentSel.id);
          if (matched) {
            set({ selectedAsset: matched });
          }
        }
      } catch (err) {
        console.error("[Store] Failed to load assets from DB:", err);
      }
    }
  },
  addAsset: async (assetData) => {
    const assetId = `ast-${Math.random().toString(36).substr(2, 9)}`;
    const newDbAsset = {
      id: assetId,
      title: assetData.title,
      file_name: assetData.fileName,
      file_path: assetData.filePath,
      thumbnail_path: assetData.thumbnailPath,
      source_site_id: assetData.sourceSiteId,
      source_site_name: assetData.sourceSiteName,
      source_page_url: assetData.sourcePageUrl,
      original_url: assetData.originalUrl,
      width: assetData.width,
      height: assetData.height,
      file_size: assetData.fileSize,
      file_type: assetData.fileType,
      dominant_color: assetData.dominantColor,
      browser_page_title: assetData.browserPageTitle || null,
      capture_method: assetData.captureMethod || "search"
    };
    if (api$6) {
      try {
        const res = await api$6.saveAsset(newDbAsset, assetData.tags);
        if (res.success) {
          await get().loadAssets();
          await get().loadTags();
        }
      } catch (err) {
        console.error("[Store] Failed to save asset via IPC:", err);
      }
    }
  },
  deleteAsset: async (id2) => {
    if (api$6) {
      try {
        const res = await api$6.deleteAsset(id2);
        if (res.success) {
          await get().loadAssets();
          await get().loadTags();
        }
      } catch (err) {
        console.error("[Store] Failed to delete asset via IPC:", err);
      }
    }
  },
  // Tag CRUD Operations
  loadTags: async () => {
    if (api$6) {
      try {
        const res = await api$6.tagList();
        if (res.success) {
          set({ tags: res.tags.map(mapDbTagToTag) });
        }
      } catch (err) {
        console.error("[Store] Failed to load tags:", err);
      }
    }
  },
  createTag: async (input) => {
    if (api$6) {
      const res = await api$6.tagCreate(input);
      if (res.success) {
        await get().loadTags();
        return res.tag;
      }
      throw new Error(res.error);
    }
  },
  updateTag: async (id2, input) => {
    if (api$6) {
      const res = await api$6.tagUpdate(id2, input);
      if (res.success) {
        await get().loadTags();
        await get().loadAssets();
        if (get().selectedAsset) {
          await get().loadAssetTags(get().selectedAsset.id);
        }
        return res.tag;
      }
      throw new Error(res.error);
    }
  },
  deleteTag: async (id2) => {
    if (api$6) {
      const res = await api$6.tagDelete(id2);
      if (res.success) {
        await get().loadTags();
        await get().loadAssets();
        if (get().selectedAsset) {
          await get().loadAssetTags(get().selectedAsset.id);
        }
        return res.id;
      }
      throw new Error(res.error);
    }
  },
  mergeTags: async (sourceTagId, targetTagId) => {
    if (api$6) {
      const res = await api$6.tagMerge(sourceTagId, targetTagId);
      if (res.success) {
        await get().loadTags();
        await get().loadAssets();
        if (get().selectedAsset) {
          await get().loadAssetTags(get().selectedAsset.id);
        }
      }
      return res;
    }
  },
  createAlias: async (tagId, alias) => {
    if (api$6) {
      const res = await api$6.tagCreateAlias(tagId, alias);
      if (res.success) {
        await get().loadTags();
      }
      return res;
    }
  },
  removeAlias: async (tagId, alias) => {
    if (api$6) {
      const res = await api$6.tagRemoveAlias(tagId, alias);
      if (res.success) {
        await get().loadTags();
      }
      return res;
    }
  },
  setParent: async (tagId, parentId) => {
    if (api$6) {
      const res = await api$6.tagSetParent(tagId, parentId);
      if (res.success) {
        await get().loadTags();
      }
      return res;
    }
  },
  // Relations
  loadAssetTags: async (assetId) => {
    if (api$6) {
      try {
        const res = await api$6.assetTagListByAsset(assetId);
        if (res.success) {
          set((state) => ({
            assetRelations: {
              ...state.assetRelations,
              [assetId]: res.relations
            }
          }));
        }
      } catch (err) {
        console.error("[Store] Failed to load asset tags relations:", err);
      }
    }
  },
  addTagToAsset: async (assetId, tagId, options) => {
    if (api$6) {
      const res = await api$6.assetTagAdd(assetId, tagId, options);
      if (res.success) {
        await get().loadAssetTags(assetId);
        await get().loadAssets();
        await get().loadTags();
      }
    }
  },
  removeTagFromAsset: async (assetId, tagId) => {
    if (api$6) {
      const res = await api$6.assetTagRemove(assetId, tagId);
      if (res.success) {
        await get().loadAssetTags(assetId);
        await get().loadAssets();
        await get().loadTags();
      }
    }
  },
  batchAddTagsToAssets: async (assetIds, tagIds, options) => {
    if (api$6) {
      const res = await api$6.assetTagBatchAdd(assetIds, tagIds, options);
      if (res.success) {
        await get().loadAssets();
        await get().loadTags();
        for (const aid of assetIds) {
          await get().loadAssetTags(aid);
        }
      }
    }
  },
  batchRemoveTagsFromAssets: async (assetIds, tagIds) => {
    if (api$6) {
      const res = await api$6.assetTagBatchRemove(assetIds, tagIds);
      if (res.success) {
        await get().loadAssets();
        await get().loadTags();
        for (const aid of assetIds) {
          await get().loadAssetTags(aid);
        }
      }
    }
  },
  replaceTagsForAssets: async (assetIds, oldTagId, newTagId) => {
    if (api$6) {
      const res = await api$6.assetTagReplace(assetIds, oldTagId, newTagId);
      if (res.success) {
        await get().loadAssets();
        await get().loadTags();
        for (const aid of assetIds) {
          await get().loadAssetTags(aid);
        }
      }
    }
  },
  confirmAiTag: async (assetTagId, assetId) => {
    if (api$6) {
      const res = await api$6.assetTagConfirmAi(assetTagId);
      if (res.success) {
        await get().loadAssetTags(assetId);
        await get().loadAssets();
        await get().loadTags();
      }
    }
  },
  rejectAiTag: async (assetTagId, assetId) => {
    if (api$6) {
      const res = await api$6.assetTagRejectAi(assetTagId);
      if (res.success) {
        await get().loadAssetTags(assetId);
        await get().loadAssets();
        await get().loadTags();
      }
    }
  },
  updateAssetCaption: async (assetId, caption) => {
    if (api$6) {
      const res = await api$6.updateAssetCaption(assetId, caption);
      if (res.success) {
        await get().loadAssets();
      }
    }
  },
  resetAssetCaptionEdited: async (assetId) => {
    if (api$6) {
      const res = await api$6.resetAssetCaptionEdited(assetId);
      if (res.success) {
        await get().loadAssets();
      }
    }
  },
  // Real AI tagging trigger. Mock fallbacks are intentionally blocked in product UI.
  generateMockAiSuggestions: async (assetId, modelsToRun) => {
    if (!api$6) {
      return { success: false, error: "Electron API is unavailable." };
    }
    try {
      const asset = get().assets.find((a) => a.id === assetId);
      if (!asset) {
        return { success: false, error: "Asset not found in library." };
      }
      console.log("[Store] Dispatching tag enqueue to Python AI Worker REST service...");
      const tagRes = await api$6.aiEnqueueTag(assetId, asset.filePath, 0, modelsToRun);
      if (!tagRes?.success) {
        return {
          success: false,
          error: tagRes?.error || "Python AI Worker 未连接，已阻止本地 mock 标签写入。"
        };
      }
      const batchRes = await api$6.aiProcessBatch();
      if (!batchRes?.success) {
        return {
          success: false,
          error: batchRes?.error || "Python AI Worker 未能启动真实打标批处理。"
        };
      }
      let finalStatus = "running";
      const startTime = Date.now();
      while (Date.now() - startTime < 45e3) {
        await get().loadAssets();
        const updatedAsset = get().assets.find((a) => a.id === assetId);
        if (updatedAsset) {
          finalStatus = updatedAsset.aiTagStatus;
          if (finalStatus === "synced" || finalStatus === "completed" || finalStatus === "failed") {
            break;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (finalStatus === "failed") {
        return { success: false, error: "真实 AI 打标任务失败，请检查 Python Worker 日志和模型依赖。" };
      }
      if (finalStatus !== "synced" && finalStatus !== "completed") {
        return { success: false, error: "真实 AI 打标任务超时，未写入 mock 标签。" };
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: `真实 AI 打标不可用，已阻止 mock fallback：${err?.message || String(err)}`
      };
    } finally {
      await get().loadAssetTags(assetId);
      await get().loadAssets();
      await get().loadTags();
    }
  },
  generateDeepAnalysis: async (assetId) => {
    if (api$6) {
      try {
        const asset = get().assets.find((a) => a.id === assetId);
        if (!asset) return;
        console.log("[Store] Dispatching generateDeepAnalysis to Qwen-VL analysis worker...");
        const res = await api$6.aiAnalysisGenerate(assetId, asset.filePath);
        if (res && res.success) {
          await api$6.aiProcessBatch();
          let isComplete = false;
          const startTime = Date.now();
          while (!isComplete && Date.now() - startTime < 45e3) {
            await get().loadAssets();
            const updatedAsset = get().assets.find((a) => a.id === assetId);
            if (updatedAsset) {
              const status = updatedAsset.aiAnalysisStatus;
              if (status === "synced" || status === "completed" || status === "failed") {
                isComplete = true;
                break;
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      } catch (err) {
        console.error("[Store] Failed to generate Qwen-VL deep analysis:", err);
      } finally {
        await get().loadAssetTags(assetId);
        await get().loadAssets();
        await get().loadTags();
      }
    }
  },
  runPromptReverse: async (assetId, modelId, modelPath, options) => {
    if (api$6 && api$6.aiWorkerRunPromptReverse) {
      try {
        const asset = get().assets.find((a) => a.id === assetId);
        if (!asset) return { success: false, error: "Asset not found in library." };
        set((state) => {
          const updatedAssets = state.assets.map((a) => {
            if (a.id === assetId) {
              return { ...a, aiPromptStatus: "running" };
            }
            return a;
          });
          const matched = updatedAssets.find((a) => a.id === assetId);
          return {
            assets: updatedAssets,
            selectedAsset: matched || state.selectedAsset
          };
        });
        const res = await api$6.aiWorkerRunPromptReverse({ assetId, filePath: asset.filePath, modelId, modelPath, ...options });
        await get().loadAssets();
        return res;
      } catch (err) {
        console.error("[Store] runPromptReverse failed:", err);
        set((state) => {
          const updatedAssets = state.assets.map((a) => {
            if (a.id === assetId) {
              return { ...a, aiPromptStatus: "failed" };
            }
            return a;
          });
          const matched = updatedAssets.find((a) => a.id === assetId);
          return {
            assets: updatedAssets,
            selectedAsset: matched || state.selectedAsset
          };
        });
        return { success: false, error: String(err) };
      }
    }
    return { success: false, error: "electronAPI is offline." };
  }
}));
useAssetStore.getState().loadAssets();
useAssetStore.getState().loadTags();
if (api$6 && api$6.onAiTaskSynced) {
  const win = window;
  if (typeof win.__cleanup_ai_task_synced__ === "function") {
    try {
      win.__cleanup_ai_task_synced__();
    } catch (e) {
      console.warn("[Store] Error cleaning up previous AI task synced listener:", e);
    }
  }
  win.__cleanup_ai_task_synced__ = api$6.onAiTaskSynced(async (_event, data) => {
    console.log("[Store] Received AI completed task synced notification for asset:", data.assetId);
    const store = useAssetStore.getState();
    await store.loadAssets();
    await store.loadTags();
    if (store.selectedAsset && store.selectedAsset.id === data.assetId) {
      await store.loadAssetTags(data.assetId);
    }
  });
}
const api$5 = window.electronAPI;
function mapDbTaskToTask(dbTask) {
  return {
    id: dbTask.id,
    assetTitle: dbTask.asset_title,
    sourceSiteId: dbTask.source_site_id,
    sourceSiteName: dbTask.source_site_name || (dbTask.source_site_id === "tapnow" ? "TapNow" : dbTask.source_site_id.charAt(0).toUpperCase() + dbTask.source_site_id.slice(1)),
    sourcePageUrl: dbTask.source_page_url || "",
    downloadUrl: dbTask.download_url,
    savePath: dbTask.save_path,
    status: dbTask.status,
    progress: dbTask.progress,
    errorMessage: dbTask.error_message,
    retryCount: dbTask.retry_count,
    fileSize: 1024 * 1024 * 1.5,
    // Default mock size 1.5MB
    thumbnailUrl: dbTask.download_url,
    // Pre-populate with standard image url
    browserPageTitle: dbTask.browser_page_title || "",
    captureMethod: dbTask.capture_method || "search"
  };
}
const useDownloadStore = create((set, get) => ({
  tasks: [],
  activeDownloadsCount: 0,
  loadDownloads: async () => {
    if (api$5) {
      try {
        const dbTasks = await api$5.listDownloads();
        set({
          tasks: dbTasks.map(mapDbTaskToTask),
          activeDownloadsCount: dbTasks.filter((t2) => t2.status === "downloading").length
        });
      } catch (err) {
        console.error("[Store] Failed to load download tasks from DB:", err);
      }
    }
  },
  enqueueDownload: async (item) => {
    console.log("[Store] enqueueDownload starting for:", item);
    const taskId = `dl-${Math.random().toString(36).substr(2, 9)}`;
    const fileSuffix = taskId.replace("dl-", "");
    const cleanTitle = item.title.toLowerCase().replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "-").substring(0, 60);
    const finalFilename = cleanTitle ? `${cleanTitle}_${fileSuffix}.jpg` : `${fileSuffix}.jpg`;
    const newTask = {
      id: taskId,
      assetTitle: item.title,
      sourceSiteId: item.sourceSite.toLowerCase(),
      sourceSiteName: item.sourceSite,
      sourcePageUrl: item.sourcePageUrl,
      downloadUrl: item.downloadUrl,
      savePath: `~/DesignAssetManager/library/${finalFilename}`,
      status: "waiting",
      progress: 0,
      retryCount: 0,
      fileSize: Math.floor(Math.random() * 5 * 1024 * 1024) + 500 * 1024,
      thumbnailUrl: item.thumbnailUrl,
      browserPageTitle: item.browserPageTitle,
      captureMethod: item.captureMethod || "search"
    };
    set((state) => ({
      tasks: [newTask, ...state.tasks]
    }));
    if (api$5) {
      try {
        const dbTask = {
          id: newTask.id,
          asset_title: newTask.assetTitle,
          source_site_id: newTask.sourceSiteId,
          source_site_name: newTask.sourceSiteName,
          source_page_url: newTask.sourcePageUrl,
          download_url: newTask.downloadUrl,
          save_path: newTask.savePath,
          status: newTask.status,
          progress: newTask.progress,
          retry_count: newTask.retryCount,
          browser_page_title: newTask.browserPageTitle || null,
          capture_method: newTask.captureMethod || "search"
        };
        await api$5.saveDownload(dbTask);
      } catch (err) {
        console.error("[Store] Failed to save download queue task:", err);
      }
    }
    await get().retryTask(taskId);
  },
  retryTask: async (id2) => {
    set((state) => ({
      tasks: state.tasks.map(
        (t2) => t2.id === id2 ? { ...t2, status: "downloading", progress: 0, errorMessage: void 0 } : t2
      )
    }));
    if (api$5) {
      try {
        const task = get().tasks.find((t2) => t2.id === id2);
        if (task) {
          await api$5.saveDownload({
            id: task.id,
            asset_title: task.assetTitle,
            source_site_id: task.sourceSiteId,
            source_site_name: task.sourceSiteName,
            source_page_url: task.sourcePageUrl,
            download_url: task.downloadUrl,
            save_path: task.savePath,
            status: "downloading",
            progress: 0,
            retry_count: task.retryCount,
            browser_page_title: task.browserPageTitle || null,
            capture_method: task.captureMethod || "search"
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
    const interval = setInterval(async () => {
      let isDone = false;
      set((state) => {
        const tasks = state.tasks.map((t2) => {
          if (t2.id === id2) {
            const nextProgress = Math.min(t2.progress + Math.floor(Math.random() * 15) + 5, 100);
            const nextStatus = nextProgress === 100 ? "completed" : "downloading";
            if (nextProgress === 100) {
              isDone = true;
              setTimeout(async () => {
                const finalFilename = t2.savePath.split("/").pop() || `${t2.assetTitle.toLowerCase().replace(/\s+/g, "-")}.jpg`;
                await useAssetStore.getState().addAsset({
                  title: t2.assetTitle,
                  fileName: finalFilename,
                  filePath: t2.savePath,
                  thumbnailPath: t2.thumbnailUrl,
                  sourceSiteId: t2.sourceSiteId,
                  sourceSiteName: t2.sourceSiteName,
                  sourcePageUrl: t2.sourcePageUrl,
                  originalUrl: t2.downloadUrl,
                  width: 1920,
                  height: 1080,
                  fileSize: t2.fileSize || 1024 * 1024,
                  fileType: "JPG",
                  tags: ["Scraped", t2.sourceSiteName],
                  browserPageTitle: t2.browserPageTitle,
                  captureMethod: t2.captureMethod
                });
              }, 50);
            }
            if (api$5) {
              api$5.saveDownload({
                id: t2.id,
                asset_title: t2.assetTitle,
                source_site_id: t2.sourceSiteId,
                source_site_name: t2.sourceSiteName,
                source_page_url: t2.sourcePageUrl,
                download_url: t2.downloadUrl,
                save_path: t2.savePath,
                status: nextStatus,
                progress: nextProgress,
                retry_count: t2.retryCount,
                browser_page_title: t2.browserPageTitle || null,
                capture_method: t2.captureMethod || "search"
              }).catch(console.error);
            }
            return {
              ...t2,
              progress: nextProgress,
              status: nextStatus
            };
          }
          return t2;
        });
        const activeCount = tasks.filter((t2) => t2.status === "downloading").length;
        return { tasks, activeDownloadsCount: activeCount };
      });
      if (isDone) {
        clearInterval(interval);
      }
    }, 300);
  },
  clearCompleted: async () => {
    if (api$5) {
      try {
        await api$5.clearDownloads();
        await get().loadDownloads();
      } catch (err) {
        console.error(err);
      }
    } else {
      set((state) => ({
        tasks: state.tasks.filter((t2) => t2.status !== "completed")
      }));
    }
  }
}));
useDownloadStore.getState().loadDownloads();
if (api$5 && api$5.onInjectedDownloadTrigger) {
  const win = window;
  if (typeof win.__cleanup_injected_download__ === "function") {
    try {
      win.__cleanup_injected_download__();
    } catch (e) {
      console.warn("[Store] Error cleaning up previous download trigger listener:", e);
    }
  }
  win.__cleanup_injected_download__ = api$5.onInjectedDownloadTrigger(async (_event, item) => {
    console.log("[Store] Received injected download trigger for URL:", item.downloadUrl);
    await useDownloadStore.getState().enqueueDownload({
      title: item.title,
      sourceSite: item.sourceSite,
      sourcePageUrl: item.sourcePageUrl,
      downloadUrl: item.downloadUrl,
      thumbnailUrl: item.thumbnailUrl,
      captureMethod: item.captureMethod,
      browserPageTitle: item.browserPageTitle
    });
  });
}
const TRANSLATIONS = {
  zh: {
    // Sidebar
    "menu.dashboard": "仪表盘",
    "menu.sites": "网站账号",
    "menu.browser": "素材浏览器",
    "menu.search": "传统搜索",
    "menu.downloads": "下载队列",
    "menu.library": "本地素材库",
    "menu.tags": "标签管理",
    "menu.aiConsole": "AI 控制台",
    "menu.settings": "设置",
    // Tooltips
    "tooltip.theme.light": "切换至白天模式",
    "tooltip.theme.dark": "切换至黑夜模式",
    "tooltip.lang.en": "Switch to English",
    "tooltip.lang.zh": "切换至中文"
  },
  en: {
    // Sidebar
    "menu.dashboard": "Dashboard",
    "menu.sites": "Accounts",
    "menu.browser": "Browser",
    "menu.search": "Search",
    "menu.downloads": "Downloads",
    "menu.library": "Library",
    "menu.tags": "Tags",
    "menu.aiConsole": "AI Console",
    "menu.settings": "Settings",
    // Tooltips
    "tooltip.theme.light": "Switch to Day Mode",
    "tooltip.theme.dark": "Switch to Night Mode",
    "tooltip.lang.en": "Switch to English",
    "tooltip.lang.zh": "切换至中文"
  }
};
const getInitialTheme = () => {
  const saved = localStorage.getItem("app-theme");
  if (saved === "dark" || saved === "light") {
    return saved;
  }
  return "light";
};
const applyTheme = (theme) => {
  const root = window.document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};
const getInitialLanguage = () => {
  const saved = localStorage.getItem("app-lang");
  if (saved === "en" || saved === "zh") {
    return saved;
  }
  return "zh";
};
applyTheme(getInitialTheme());
const useUIStore = create((set, get) => ({
  theme: getInitialTheme(),
  language: getInitialLanguage(),
  toggleTheme: () => {
    const nextTheme = get().theme === "light" ? "dark" : "light";
    localStorage.setItem("app-theme", nextTheme);
    applyTheme(nextTheme);
    set({ theme: nextTheme });
  },
  setLanguage: (lang) => {
    localStorage.setItem("app-lang", lang);
    set({ language: lang });
  },
  t: (key) => {
    const lang = get().language;
    return TRANSLATIONS[lang][key] || key;
  }
}));
const navItems = [
  { to: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { to: "/sites", label: "网站账号", icon: Globe },
  { to: "/browser", label: "素材浏览器", icon: Compass },
  { to: "/search", label: "传统搜索", icon: Search$1 },
  { to: "/downloads", label: "下载队列", icon: CloudDownload, hasBadge: true },
  { to: "/library", label: "本地素材库", icon: Image },
  { to: "/tag-manager", label: "标签管理", icon: Tag },
  { to: "/ai-console", label: "AI 控制台", icon: Cpu },
  { to: "/settings", label: "设置", icon: Settings$1 }
];
function Sidebar() {
  const [isHovered, setIsHovered] = reactExports.useState(false);
  const tasks = useDownloadStore((s) => s.tasks);
  const downloadingCount = tasks.filter((task) => task.status === "downloading" || task.status === "waiting").length;
  const { theme, toggleTheme } = useUIStore();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "aside",
    {
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      className: `fixed bottom-0 left-0 top-0 z-50 flex h-full w-64 shrink-0 select-none flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-out dark:border-slate-800 dark:bg-slate-950 ${isHovered ? "translate-x-0 shadow-2xl shadow-slate-900/15" : "-translate-x-[calc(100%-12px)]"}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-100 px-6 dark:border-slate-900", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white shadow-md shadow-brand-500/20", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4.5 w-4.5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[14px] font-semibold leading-tight text-slate-800 dark:text-slate-200", children: "Design Asset" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500", children: "Manager" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "flex-1 space-y-1 overflow-y-auto px-4 py-6", children: navItems.map((item) => {
          const Icon2 = item.icon;
          const badge = item.hasBadge && downloadingCount > 0 ? downloadingCount : void 0;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            NavLink,
            {
              to: item.to,
              title: item.label,
              className: ({ isActive }) => `flex min-h-[40px] items-center justify-between rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold transition-premium ${isActive ? "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900/50 dark:hover:text-slate-200"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { className: "h-4.5 w-4.5 shrink-0 stroke-[2]" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: item.label })
                ] }),
                badge !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-[10.5px] font-bold text-white", children: badge })
              ]
            },
            item.to
          );
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex shrink-0 justify-center border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-900 dark:bg-slate-950/20", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: toggleTheme,
            title: theme === "light" ? "切换至深色模式" : "切换至浅色模式",
            className: "flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm outline-none transition-premium hover:border-brand-200 hover:bg-slate-50 hover:text-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-brand-900 dark:hover:bg-slate-850 dark:hover:text-brand-400",
            children: theme === "light" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Moon, { className: "h-4.5 w-4.5 stroke-[2]" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Sun, { className: "h-4.5 w-4.5 stroke-[2] text-amber-500" })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `pointer-events-none absolute bottom-0 right-0 top-0 flex w-3 items-center justify-center transition-opacity duration-300 ${isHovered ? "opacity-0" : "opacity-100"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-16 w-[3px] rounded-full bg-brand-500/80 shadow-[0_0_8px_rgba(99,102,241,0.55)]" }) })
      ]
    }
  );
}
const pageTitles = {
  "/dashboard": "仪表盘",
  "/sites": "网站账号管理",
  "/browser": "素材浏览器",
  "/search": "全网素材检索",
  "/downloads": "下载队列",
  "/library": "本地素材库",
  "/tag-manager": "标签管理中心",
  "/ai-console": "AI 控制台",
  "/settings": "系统偏好设置"
};
function Topbar() {
  const location = useLocation();
  const tasks = useDownloadStore((s) => s.tasks);
  const isDownloading = tasks.some((task) => task.status === "downloading");
  const title = pageTitles[location.pathname] || "设计素材管理器";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex h-16 shrink-0 select-none items-center justify-between border-b border-slate-200 bg-white px-8 transition-colors dark:border-slate-800 dark:bg-slate-950", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "min-w-0 truncate text-[15.5px] font-bold tracking-tight text-slate-800 dark:text-slate-100", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-6 flex shrink-0 items-center gap-3", children: [
      isDownloading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-600 dark:border-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-400", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { className: "h-3.5 w-3.5 fill-emerald-600/10 dark:fill-emerald-400/10" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11.5px] font-bold tracking-wide", children: "下载中" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-slate-500 transition-colors hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "h-3.5 w-3.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-semibold tracking-wide", children: "SQLite 正常" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-indigo-600 dark:border-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-400", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-3.5 w-3.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-semibold tracking-wide", children: "安全加密" })
      ] })
    ] })
  ] });
}
const DESKTOP_MIN_WIDTH = 1120;
function AppShell() {
  const location = useLocation();
  const isBrowserRoute = location.pathname === "/browser";
  const shouldShowTopbar = location.pathname !== "/library";
  if (isBrowserRoute) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800 dark:bg-slate-950 dark:text-slate-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "relative h-full w-full flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "scrollbar-none h-screen w-screen overflow-auto bg-slate-50 font-sans text-slate-800 dark:bg-slate-950 dark:text-slate-100", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full min-h-[720px]", style: { minWidth: DESKTOP_MIN_WIDTH }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Sidebar, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-3 flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950", children: [
      shouldShowTopbar && /* @__PURE__ */ jsxRuntimeExports.jsx(Topbar, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "scrollbar-none relative flex-1 overflow-auto bg-slate-50 p-8 dark:bg-slate-950", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-full min-w-[1040px] flex-col", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) }) })
    ] })
  ] }) });
}
const api$4 = window.electronAPI;
function mapDbSiteToSite(dbSite) {
  return {
    id: dbSite.id,
    name: dbSite.name,
    baseUrl: dbSite.base_url,
    searchUrlTemplate: dbSite.search_url_template,
    requiresAuth: dbSite.requires_auth === 1,
    authStatePath: dbSite.auth_state_path,
    authStatus: dbSite.auth_status,
    notes: dbSite.notes
  };
}
const useSiteStore = create((set, get) => ({
  sites: [],
  loading: false,
  loadSites: async () => {
    set({ loading: true });
    if (api$4) {
      try {
        const dbSites = await api$4.listSites();
        set({ sites: dbSites.map(mapDbSiteToSite) });
      } catch (err) {
        console.error("[Store] Failed to load sites from DB:", err);
      }
    }
    set({ loading: false });
  },
  addSite: async (siteData) => {
    set({ loading: true });
    const newSite = {
      id: Math.random().toString(36).substr(2, 9),
      name: siteData.name,
      base_url: siteData.baseUrl,
      search_url_template: siteData.searchUrlTemplate,
      requires_auth: siteData.requiresAuth ? 1 : 0,
      auth_status: siteData.requiresAuth ? "unlogged" : "logged",
      notes: siteData.notes
    };
    if (api$4) {
      try {
        const res = await api$4.saveSite(newSite);
        if (res.success) {
          await get().loadSites();
        }
      } catch (err) {
        console.error("[Store] Failed to save site via IPC:", err);
      }
    }
    set({ loading: false });
  },
  deleteSite: async (id2) => {
    if (api$4) {
      try {
        const res = await api$4.deleteSite(id2);
        if (res.success) {
          await get().loadSites();
        }
      } catch (err) {
        console.error("[Store] Failed to delete site via IPC:", err);
      }
    }
  },
  updateSiteStatus: (id2, status) => {
    set((state) => ({
      sites: state.sites.map((s) => s.id === id2 ? { ...s, authStatus: status } : s)
    }));
  },
  startLogin: async (id2) => {
    const site = get().sites.find((s) => s.id === id2);
    if (!site) return;
    get().updateSiteStatus(id2, "logging_in");
    if (api$4) {
      try {
        await api$4.startLoginSite(id2);
      } catch (err) {
        console.error("[Store] startLoginSite IPC error:", err);
        get().updateSiteStatus(id2, "unlogged");
      }
    }
  },
  completeLogin: async (id2) => {
    const site = get().sites.find((s) => s.id === id2);
    if (!site) return;
    set({ loading: true });
    if (api$4) {
      try {
        const res = await api$4.completeLoginSite(id2);
        if (res.success) {
          await get().loadSites();
        } else {
          console.error("[Store] completeLoginSite failed:", res.error);
          get().updateSiteStatus(id2, "unlogged");
        }
      } catch (err) {
        console.error("[Store] completeLoginSite IPC error:", err);
        get().updateSiteStatus(id2, "unlogged");
      }
    }
    set({ loading: false });
  }
}));
useSiteStore.getState().loadSites();
function Dashboard() {
  const assets = useAssetStore((s) => s.assets);
  const sites = useSiteStore((s) => s.sites);
  const tasks = useDownloadStore((s) => s.tasks);
  const activeDownloads = tasks.filter((t2) => t2.status === "downloading" || t2.status === "waiting").length;
  const completedCount = tasks.filter((t2) => t2.status === "completed").length;
  const stats = [
    {
      label: "本地素材总数",
      value: assets.length,
      icon: Image,
      color: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/10"
    },
    {
      label: "已配置网站数",
      value: sites.length,
      icon: Globe,
      color: "from-violet-500 to-purple-600",
      shadow: "shadow-violet-500/10"
    },
    {
      label: "今日已完成下载",
      value: completedCount,
      icon: CloudDownload,
      color: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-500/10"
    },
    {
      label: "活跃下载任务",
      value: activeDownloads,
      icon: TrendingUp,
      color: "from-amber-500 to-orange-600",
      shadow: "shadow-amber-500/10"
    }
  ];
  const recentAssets = assets.slice(0, 4);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-8 select-none flex-1 flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-panel p-8 rounded-2xl flex items-center justify-between shadow-premium bg-white/80", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-600 text-[10.5px] font-bold tracking-wide flex items-center gap-1 uppercase", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "w-3 h-3" }),
          " MVP Alpha"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-slate-800 tracking-tight", children: "下午好，视觉主理人" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 text-[12.5px] font-medium max-w-xl", children: "Design Asset Manager 已就绪。您可以轻松管理网站授权、一键抓取素材图片并自动索引归入您的本地工作流。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Link,
        {
          to: "/search",
          className: "px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[13px] shadow-lg shadow-brand-500/25 transition-premium flex items-center gap-2",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "去抓取素材" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "w-4 h-4 stroke-[2.5]" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-6", children: stats.map((stat, idx) => {
      const Icon2 = stat.icon;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: `p-6 rounded-2xl bg-white border border-slate-100 shadow-premium flex items-center justify-between hover:shadow-card-hover transition-premium`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-400 text-[11.5px] font-semibold", children: stat.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-bold text-slate-800 tracking-tight", children: stat.value })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-12 h-12 rounded-xl bg-gradient-to-tr ${stat.color} flex items-center justify-center text-white ${stat.shadow} shadow-lg`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { className: "w-5 h-5" }) })
          ]
        },
        idx
      );
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-2 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[14px] font-bold text-slate-700", children: "最近加入的素材" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Link,
            {
              to: "/library",
              className: "text-[12px] font-semibold text-brand-500 hover:text-brand-600 transition-colors flex items-center gap-1",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "查看全部素材库" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "w-3.5 h-3.5" })
              ]
            }
          )
        ] }),
        recentAssets.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-4", children: recentAssets.map((asset) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "group relative rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-premium hover:shadow-card-hover transition-premium p-3",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 relative", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: asset.thumbnailPath,
                    alt: asset.title,
                    className: "w-full h-full object-cover group-hover:scale-105 transition-premium"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur text-[9.5px] font-bold text-slate-600 shadow-sm", children: asset.sourceSiteName })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[12.5px] font-bold text-slate-700 truncate", children: asset.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-[10px] text-slate-400 font-medium", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    asset.fileType,
                    " • ",
                    (asset.fileSize / 1024 / 1024).toFixed(1),
                    "MB"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: new Date(asset.createdAt).toLocaleDateString() })
                ] })
              ] })
            ]
          },
          asset.id
        )) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-64 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-white gap-3 shadow-premium", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "w-8 h-8 stroke-[1.5]" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12px] font-medium", children: "本地素材库为空，快去抓取第一张素材吧！" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[14px] font-bold text-slate-700 px-1", children: "站点快捷动作" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl border border-slate-100 bg-white shadow-premium p-6 space-y-4", children: sites.map((site) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-premium border border-transparent hover:border-slate-100",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col overflow-hidden", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12.5px] font-bold text-slate-700", children: site.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-400 font-medium truncate", children: site.baseUrl })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: `px-2 py-0.5 rounded-full text-[9.5px] font-bold ${site.authStatus === "logged" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-500"}`,
                  children: site.authStatus === "logged" ? "已授权" : "未登录"
                }
              )
            ]
          },
          site.id
        )) })
      ] })
    ] })
  ] });
}
function Sites() {
  const { sites, addSite, deleteSite, startLogin, completeLogin } = useSiteStore();
  const [showModal, setShowModal] = reactExports.useState(false);
  const [startingId, setStartingId] = reactExports.useState(null);
  const [completingId, setCompletingId] = reactExports.useState(null);
  const [name, setName] = reactExports.useState("");
  const [baseUrl, setBaseUrl] = reactExports.useState("");
  const [searchUrlTemplate, setSearchUrlTemplate] = reactExports.useState("");
  const [requiresAuth, setRequiresAuth] = reactExports.useState(true);
  const [notes, setNotes] = reactExports.useState("");
  const handleAddSite = async (e) => {
    e.preventDefault();
    if (!name || !baseUrl) return;
    await addSite({
      name,
      baseUrl,
      searchUrlTemplate: searchUrlTemplate || `${baseUrl}/search?q={{keyword}}`,
      requiresAuth,
      notes
    });
    setShowModal(false);
    setName("");
    setBaseUrl("");
    setSearchUrlTemplate("");
    setRequiresAuth(true);
    setNotes("");
  };
  const handleStartLogin = async (id2) => {
    setStartingId(id2);
    await startLogin(id2);
    setStartingId(null);
  };
  const handleCompleteLogin = async (id2) => {
    setCompletingId(id2);
    await completeLogin(id2);
    setCompletingId(null);
  };
  const getStatusBadge = (status) => {
    switch (status) {
      case "logged":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1", children: "已登录" });
      case "unlogged":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1", children: "未登录" });
      case "expired":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-600 border border-rose-100 flex items-center gap-1", children: "已过期" });
      case "reauth":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1", children: "需要重登" });
      case "logging_in":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1 animate-pulse", children: "正在登录..." });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 flex-1 flex flex-col select-none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 text-[12px] font-medium", children: "配置您需要搜索、爬取图片素材的网站源，并维护独立登录态。" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setShowModal(true),
          className: "px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[12.5px] shadow-lg shadow-brand-500/15 transition-premium flex items-center gap-2",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-4 h-4 stroke-[2.5]" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "配置新网站" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: sites.map((site) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "rounded-2xl border border-slate-100 bg-white p-6 shadow-premium hover:shadow-card-hover transition-premium flex flex-col justify-between min-h-[190px] group relative",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "w-5 h-5 stroke-[1.8]" }) }),
              getStatusBadge(site.authStatus)
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[13.5px] font-bold text-slate-700", children: site.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10.5px] text-slate-400 font-medium truncate", children: site.baseUrl }),
              site.notes && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11.5px] text-slate-400 font-medium line-clamp-1 mt-1", children: site.notes })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mt-6 border-t border-slate-50 pt-4", children: [
            site.requiresAuth ? site.authStatus === "logging_in" ? (
              /* Glowing complete authorization trigger button */
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => handleCompleteLogin(site.id),
                  disabled: completingId !== null,
                  className: "flex-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-[11.5px] transition-premium flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 animate-pulse",
                  children: completingId === site.id ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-3.5 h-3.5 animate-spin" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "抓取会话数据中..." })
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SquareCheckBig, { className: "w-3.5 h-3.5" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "我已完成登录" })
                  ] })
                }
              )
            ) : (
              /* Launch Chrome trigger button */
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => handleStartLogin(site.id),
                  disabled: startingId !== null || completingId !== null,
                  className: "flex-1 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:bg-slate-100 text-white disabled:text-slate-400 font-semibold text-[11.5px] transition-premium flex items-center justify-center gap-1.5 shadow-sm shadow-brand-500/5",
                  children: startingId === site.id ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-3.5 h-3.5 animate-spin" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "启动 Chrome 中..." })
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(KeyRound, { className: "w-3.5 h-3.5" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: site.authStatus === "logged" ? "重新登录网站" : "登录网站授权" })
                  ] })
                }
              )
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-[11px] font-semibold text-slate-400 text-center py-1.5 bg-slate-50 rounded-lg", children: "无需用户登录授权" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => deleteSite(site.id),
                className: "w-9 h-9 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-premium",
                title: "删除配置",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4" })
              }
            )
          ] })
        ]
      },
      site.id
    )) }),
    showModal && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-[460px] rounded-2xl bg-white border border-slate-100 shadow-premium p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[14.5px] font-bold text-slate-700", children: "配置新素材源网站" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-400 font-medium", children: "配置新网站抓取规则，可指定搜索 URL 模板。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleAddSite, className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-[11.5px] font-bold text-slate-500", children: "网站名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              placeholder: "e.g. Pinterest",
              required: true,
              value: name,
              onChange: (e) => setName(e.target.value),
              className: "w-full px-3.5 py-2 text-[12.5px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-medium"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-[11.5px] font-bold text-slate-500", children: "网站根域名 (Base URL)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "url",
              placeholder: "https://pinterest.com",
              required: true,
              value: baseUrl,
              onChange: (e) => setBaseUrl(e.target.value),
              className: "w-full px-3.5 py-2 text-[12.5px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-medium"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-[11.5px] font-bold text-slate-500", children: "搜索 URL 模板" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[9.5px] text-slate-400 font-medium flex items-center gap-0.5", children: [
              "使用 ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "bg-slate-100 px-1 py-0.5 rounded", children: "{{keyword}}" }),
              " 占位符"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              placeholder: "https://pinterest.com/search/pins/?q={{keyword}}",
              value: searchUrlTemplate,
              onChange: (e) => setSearchUrlTemplate(e.target.value),
              className: "w-full px-3.5 py-2 text-[12.5px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-medium"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3.5 bg-slate-50 rounded-xl", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12px] font-bold text-slate-700", children: "需要手动登录" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-400 font-medium", children: "使用 Playwright 多开窗口手动登录并保存 storageState" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: requiresAuth,
              onChange: (e) => setRequiresAuth(e.target.checked),
              className: "w-4.5 h-4.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-[11.5px] font-bold text-slate-500", children: "备注" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "textarea",
            {
              placeholder: "e.g. 包含丰富的插画、壁纸和UI素材",
              rows: 2,
              value: notes,
              onChange: (e) => setNotes(e.target.value),
              className: "w-full px-3.5 py-2 text-[12.5px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-medium resize-none"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 pt-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setShowModal(false),
              className: "flex-1 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 font-semibold text-[12.5px] transition-premium border border-slate-100",
              children: "取消"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "submit",
              className: "flex-1 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[12.5px] transition-premium shadow-md shadow-brand-500/10",
              children: "保存配置"
            }
          )
        ] })
      ] })
    ] }) })
  ] });
}
const api$3 = window.electronAPI;
const useBrowserStore = create((set) => {
  if (api$3 && api$3.onBrowserStateChange) {
    const win = window;
    if (typeof win.__cleanup_browser_state_change__ === "function") {
      try {
        win.__cleanup_browser_state_change__();
      } catch (e) {
        console.warn("[BrowserStore] Error cleaning up previous browser state listener:", e);
      }
    }
    win.__cleanup_browser_state_change__ = api$3.onBrowserStateChange((_event, state) => {
      set({
        currentUrl: state.url || "",
        pageTitle: state.title || "",
        canGoBack: !!state.canGoBack,
        canGoForward: !!state.canGoForward,
        isLoading: !!state.isLoading
      });
    });
  }
  return {
    currentUrl: "",
    pageTitle: "",
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
    activeSiteId: "",
    setCurrentUrl: (url) => set({ currentUrl: url }),
    setPageTitle: (pageTitle) => set({ pageTitle }),
    setCanGoBack: (canGoBack) => set({ canGoBack }),
    setCanGoForward: (canGoForward) => set({ canGoForward }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setActiveSiteId: (activeSiteId) => set({ activeSiteId }),
    loadUrl: async (url, siteId) => {
      console.log("[BrowserStore] loadUrl called for:", url, siteId, "electronAPI exists:", !!api$3);
      set({ activeSiteId: siteId, isLoading: true });
      if (api$3) {
        try {
          console.log("[BrowserStore] Calling api.browserLoadUrl...");
          await api$3.browserLoadUrl(url, siteId);
        } catch (err) {
          console.error("[BrowserStore] Failed to load URL:", err);
          set({ isLoading: false });
        }
      } else {
        console.log("[BrowserStore] electronAPI is missing, falling back to mock...");
        set({ currentUrl: url, pageTitle: "Mock Web Page", isLoading: false });
      }
    },
    goBack: async () => {
      if (api$3) {
        try {
          await api$3.browserGoBack();
        } catch (err) {
          console.error("[BrowserStore] Failed to go back:", err);
        }
      }
    },
    goForward: async () => {
      if (api$3) {
        try {
          await api$3.browserGoForward();
        } catch (err) {
          console.error("[BrowserStore] Failed to go forward:", err);
        }
      }
    },
    reload: async () => {
      if (api$3) {
        try {
          await api$3.browserReload();
        } catch (err) {
          console.error("[BrowserStore] Failed to reload:", err);
        }
      }
    },
    stop: async () => {
      if (api$3) {
        try {
          await api$3.browserStop();
        } catch (err) {
          console.error("[BrowserStore] Failed to stop:", err);
        }
      }
    }
  };
});
const api$2 = window.electronAPI;
function BrowserViewport() {
  const containerRef = reactExports.useRef(null);
  const [showSpinner, setShowSpinner] = reactExports.useState(true);
  reactExports.useEffect(() => {
    if (!api$2) return;
    const updateBounds = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      api$2.browserResize({
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }).catch(console.error);
    };
    api$2.browserShow().then(() => {
      setTimeout(updateBounds, 100);
    }).catch(console.error);
    window.addEventListener("resize", updateBounds);
    const resizeObserver = new ResizeObserver(() => {
      updateBounds();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    let unsubscribe;
    if (api$2.onBrowserStateChange) {
      unsubscribe = api$2.onBrowserStateChange((_event, state) => {
        if (state.url && state.url !== "about:blank") {
          setShowSpinner(false);
        }
      });
    }
    return () => {
      window.removeEventListener("resize", updateBounds);
      resizeObserver.disconnect();
      if (unsubscribe) unsubscribe();
      if (api$2) {
        api$2.browserHide().catch(console.error);
      }
    };
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      ref: containerRef,
      className: "w-full h-full bg-slate-50 border border-slate-200/60 rounded-2xl overflow-hidden shadow-inner relative flex items-center justify-center",
      children: showSpinner && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-slate-100/50 flex items-center justify-center z-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center space-y-2 pointer-events-none select-none", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 text-[12px] font-semibold tracking-wide", children: "正在载入内嵌浏览器视图..." })
      ] }) })
    }
  );
}
function BrowserPage() {
  const navigate = useNavigate();
  const sites = useSiteStore((s) => s.sites);
  const loadSites = useSiteStore((s) => s.loadSites);
  const {
    currentUrl,
    pageTitle,
    canGoBack,
    canGoForward,
    isLoading,
    activeSiteId,
    loadUrl,
    goBack,
    goForward,
    reload,
    stop
  } = useBrowserStore();
  const [urlInput, setUrlInput] = reactExports.useState("");
  const [isLeftOpen, setIsLeftOpen] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (loadSites) {
      loadSites();
    }
  }, []);
  reactExports.useEffect(() => {
    setUrlInput(currentUrl);
  }, [currentUrl]);
  reactExports.useEffect(() => {
    console.log("[BrowserPage] sites list changed:", sites.map((s) => s.id), "activeSiteId:", activeSiteId);
    if (sites.length > 0 && !activeSiteId) {
      const firstSite = sites[0];
      console.log("[BrowserPage] Triggering default loadUrl for first site:", firstSite.baseUrl, firstSite.id);
      loadUrl(firstSite.baseUrl, firstSite.id);
    }
  }, [sites, activeSiteId]);
  const handleNavigate = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    let formattedUrl = urlInput.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }
    loadUrl(formattedUrl, activeSiteId || "custom");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex h-full select-none overflow-hidden p-4 bg-slate-50 relative", children: [
    !isLeftOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        onMouseEnter: () => setIsLeftOpen(true),
        className: "absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-16 rounded-r-xl bg-slate-200 hover:bg-brand-500 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-premium z-30 shadow-sm border border-l-0 border-slate-350/40",
        title: "展开网站导航",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "w-3 h-3 stroke-[3]" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        onMouseLeave: () => setIsLeftOpen(false),
        className: `h-full shrink-0 transition-all duration-300 ease-out overflow-hidden z-20 ${isLeftOpen ? "w-56 opacity-100 mr-4" : "w-0 opacity-0 mr-0"}`,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-56 glass-panel p-4 rounded-2xl bg-white/95 shadow-premium flex flex-col h-full overflow-hidden border border-slate-200/50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3.5 px-1 shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "w-4 h-4 text-brand-500" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-slate-800 text-[13px] tracking-wide", children: "灵感网站导航" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto space-y-1.5 pr-0.5", children: [
            sites.map((site) => {
              const isSelected = site.id === activeSiteId;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => loadUrl(site.baseUrl, site.id),
                  className: `w-full text-left px-3.5 py-3 rounded-xl transition-premium text-[12px] font-semibold flex items-center justify-between border ${isSelected ? "bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/10" : "bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-600 hover:text-slate-800"}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate mr-2", children: site.name }),
                    site.requiresAuth && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: `text-[8.5px] font-bold px-1.5 py-0.5 rounded-md ${isSelected ? "bg-white/20 text-white" : site.authStatus === "logged" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`,
                        children: site.authStatus === "logged" ? "已登" : "未登"
                      }
                    )
                  ]
                },
                site.id
              );
            }),
            sites.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-10 text-slate-400 space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Compass, { className: "w-6 h-6 mx-auto stroke-[1.5]" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold", children: "暂无配置网站" })
            ] })
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col gap-4 h-full min-w-0 overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-panel p-3.5 rounded-2xl bg-white/80 shadow-premium shrink-0 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => navigate("/dashboard"),
              className: "px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-premium text-[12.5px] font-bold active:scale-95 border border-slate-200 shadow-sm shrink-0",
              title: "返回系统主页",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutDashboard, { className: "w-4 h-4 text-brand-500" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "返回主页" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: goBack,
                disabled: !canGoBack,
                className: "w-8 h-8 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-premium border border-transparent active:scale-95 text-slate-600",
                title: "后退",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "w-4 h-4 stroke-[2.5]" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: goForward,
                disabled: !canGoForward,
                className: "w-8 h-8 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-premium border border-transparent active:scale-95 text-slate-600",
                title: "前进",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "w-4 h-4 stroke-[2.5]" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: isLoading ? stop : reload,
                className: "w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-premium border border-transparent active:scale-95 text-slate-600",
                title: isLoading ? "停止" : "刷新",
                children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-4 h-4 stroke-[2.5]" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCw, { className: "w-3.5 h-3.5 stroke-[2.5]" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleNavigate, className: "flex-1 flex items-center relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Search$1, { className: "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: urlInput,
                onChange: (e) => setUrlInput(e.target.value),
                placeholder: "输入网址回车，或输入快捷网站...",
                className: "w-full pl-10 pr-4 py-2 text-[12.5px] font-medium rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium bg-white/70"
              }
            )
          ] })
        ] }),
        pageTitle && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-1 text-[11.5px] font-semibold text-slate-500 border-t border-slate-100 pt-2 shrink-0 select-none", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-slate-400", children: "当前网页:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-slate-700 font-bold", children: pageTitle })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 relative overflow-hidden min-h-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BrowserViewport, {}) })
    ] })
  ] });
}
const MOCK_RESULTS = [
  {
    id: "res-1",
    title: "Minimalist Interior Design Canvas",
    thumbnailUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
    sourcePageUrl: "https://unsplash.com/photos/minimalist-interior",
    sourceSite: "Unsplash",
    width: 1920,
    height: 1280,
    fileType: "JPG"
  },
  {
    id: "res-2",
    title: "3D Glossy Holographic Shapes",
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    sourcePageUrl: "https://unsplash.com/photos/3d-shapes",
    sourceSite: "Unsplash",
    width: 2400,
    height: 1800,
    fileType: "PNG"
  },
  {
    id: "res-3",
    title: "Abstract Fluid Ink Painting",
    thumbnailUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1200&q=80",
    sourcePageUrl: "https://unsplash.com/photos/fluid-ink",
    sourceSite: "Pinterest",
    width: 1600,
    height: 2400,
    fileType: "JPG"
  }
];
const api$1 = window.electronAPI;
const useSearchStore = create((set, get) => ({
  siteId: "tapnow",
  keyword: "",
  searching: false,
  results: [],
  setSiteId: (siteId) => set({ siteId }),
  setKeyword: (keyword) => set({ keyword }),
  search: async () => {
    const { siteId, keyword } = get();
    if (!keyword.trim()) return;
    set({ searching: true, results: [] });
    if (api$1) {
      try {
        console.log(`[Store] Querying crawler for siteId: ${siteId}, query: "${keyword}"`);
        const res = await api$1.runSearch({ siteId, keyword });
        if (res.success) {
          set({ results: res.results, searching: false });
          return;
        } else {
          console.error("[Store] Search IPC failed:", res.error);
        }
      } catch (err) {
        console.error("[Store] Search IPC execution error:", err);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
    set({
      results: MOCK_RESULTS.map((item) => ({
        ...item,
        id: `res-${Math.random().toString(36).substr(2, 9)}`,
        title: `${keyword} - ${item.title}`
      })),
      searching: false
    });
  }
}));
function Search() {
  const sites = useSiteStore((s) => s.sites);
  const { siteId, keyword, searching, results, setSiteId, setKeyword, search } = useSearchStore();
  const { enqueueDownload, tasks } = useDownloadStore();
  const handleSearch = (e) => {
    e.preventDefault();
    search();
  };
  const getTaskStatus = (url) => {
    const matched = tasks.find((t2) => t2.downloadUrl === url);
    return matched ? matched.status : null;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 flex-1 flex flex-col select-none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "glass-panel p-5 rounded-2xl shadow-premium bg-white/80", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSearch, className: "flex flex-col md:flex-row gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:w-60 relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            value: siteId,
            onChange: (e) => setSiteId(e.target.value),
            className: "w-full pl-10 pr-4 py-2.5 text-[12.5px] font-semibold bg-white border border-slate-200 focus:border-brand-500 rounded-xl outline-none transition-premium cursor-pointer text-slate-700 appearance-none",
            children: sites.map((site) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: site.id, children: [
              site.name,
              " (",
              site.authStatus === "logged" ? "已授权" : "公共免登",
              ")"
            ] }, site.id))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search$1, { className: "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            placeholder: "输入灵感关键词，例如: Abstract 3D, Minimalist UI, Cyberpunk Graphic...",
            required: true,
            value: keyword,
            onChange: (e) => setKeyword(e.target.value),
            className: "w-full pl-10 pr-4 py-2.5 text-[12.5px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-medium"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "submit",
          disabled: searching || !keyword.trim(),
          className: "px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-100 text-white disabled:text-slate-400 font-semibold text-[12.5px] transition-premium shadow-md shadow-brand-500/10 flex items-center justify-center gap-2",
          children: searching ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 animate-spin" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "正在提取页面图片..." })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Search$1, { className: "w-4 h-4 stroke-[2.5]" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "立即抓取素材" })
          ] })
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 flex flex-col", children: searching ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-24", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-8 h-8 stroke-[1.5] text-brand-500 animate-spin" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12.5px] font-medium", children: "Playwright 正在拉取目标网站并智能分析图片节点..." })
    ] }) : results.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "waterfall-grid", children: results.map((item) => {
      const status = getTaskStatus(item.imageUrl || "");
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "waterfall-item group rounded-2xl overflow-hidden border border-slate-100 bg-white p-3 shadow-premium hover:shadow-card-hover transition-premium",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl overflow-hidden bg-slate-50 relative group/img cursor-zoom-in", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "img",
                {
                  src: item.thumbnailUrl,
                  alt: item.title,
                  className: "w-full h-auto object-cover group-hover:scale-[1.02] transition-premium"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-slate-900/10 opacity-0 group-hover/img:opacity-100 transition-premium" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/50 text-white font-bold text-[9px] shadow-sm tracking-wide", children: item.width && item.height ? `${item.width} x ${item.height}` : "自适应" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3.5 space-y-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[12.5px] font-bold text-slate-700 leading-snug line-clamp-2", children: item.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-slate-400 font-semibold uppercase tracking-wide", children: item.sourceSite })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => enqueueDownload({
                    title: item.title || "Scraped Image",
                    sourceSite: item.sourceSite,
                    sourcePageUrl: item.sourcePageUrl,
                    downloadUrl: item.imageUrl || "",
                    thumbnailUrl: item.thumbnailUrl
                  }),
                  disabled: status !== null,
                  className: `flex-1 py-2 px-3 rounded-lg font-bold text-[11.5px] transition-premium flex items-center justify-center gap-1.5 ${status === "completed" ? "bg-slate-100 text-slate-500" : status !== null ? "bg-brand-50 text-brand-600" : "bg-brand-500 hover:bg-brand-600 text-white shadow-sm"}`,
                  children: status === "completed" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "w-3.5 h-3.5" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "已在库中" })
                  ] }) : status !== null ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-3.5 h-3.5 animate-pulse" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "下载中..." })
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-3.5 h-3.5" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "抓取下载" })
                  ] })
                }
              ) })
            ] })
          ]
        },
        item.id
      );
    }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-24 border-2 border-dashed border-slate-200 bg-white rounded-2xl shadow-premium", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "w-8 h-8 stroke-[1.5]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12px] font-medium", children: "这里将展示智能抓取的页面素材图片结果" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10.5px] text-slate-400 font-medium", children: "请在顶部选择网站，输入您需要的分类或创意词，点击“立即抓取”。" })
    ] }) })
  ] });
}
function DownloadQueue() {
  const { tasks, retryTask, clearCompleted } = useDownloadStore();
  const getStatusLabel = (status) => {
    switch (status) {
      case "completed":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-100", children: "已完成" });
      case "failed":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold border border-rose-100", children: "失败" });
      case "downloading":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-bold border border-indigo-100", children: "下载中" });
      default:
        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold border border-slate-200", children: "排队等待" });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 flex-1 flex flex-col select-none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 text-[12px] font-medium", children: "查看您已提交的图片资源并发抓取下载任务进程状态。" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: clearCompleted,
          className: "px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-semibold text-[12.5px] transition-premium flex items-center gap-1.5",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "清空已完成" })
          ]
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 flex flex-col", children: tasks.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl border border-slate-100 bg-white shadow-premium overflow-hidden divide-y divide-slate-100", children: tasks.map((task) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "p-5 flex items-center justify-between gap-6 hover:bg-slate-50/50 transition-premium",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-14 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "img",
            {
              src: task.thumbnailUrl,
              alt: task.assetTitle,
              className: "w-full h-full object-cover"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0 space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[13px] font-bold text-slate-700 truncate", children: task.assetTitle }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold text-slate-400 shrink-0 bg-slate-50 px-2 py-0.5 rounded uppercase", children: task.sourceSiteName })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
                task.fileSize && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10.5px] font-semibold text-slate-400", children: [
                  (task.fileSize / 1024 / 1024).toFixed(2),
                  " MB"
                ] }),
                getStatusLabel(task.status)
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: `h-full rounded-full transition-all duration-300 ${task.status === "completed" ? "bg-emerald-500" : task.status === "failed" ? "bg-rose-500" : "bg-brand-500"}`,
                  style: { width: `${task.progress}%` }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] font-bold text-slate-400 w-8 text-right shrink-0", children: [
                task.progress,
                "%"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0 flex items-center gap-2", children: [
            task.status === "failed" && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => retryTask(task.id),
                className: "w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-premium shadow-sm shadow-indigo-500/5",
                title: "重试下载",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "a",
              {
                href: task.sourcePageUrl,
                target: "_blank",
                rel: "noreferrer",
                className: "w-9 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-premium",
                title: "查看来源页面",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "w-4 h-4" })
              }
            )
          ] })
        ]
      },
      task.id
    )) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-28 border-2 border-dashed border-slate-200 bg-white rounded-2xl shadow-premium", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CloudDownload, { className: "w-9 h-9 stroke-[1.5]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12px] font-medium", children: "当前没有任何下载队列任务" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10.5px] text-slate-400 font-medium", children: "您在“素材搜索”中发起的下载项目会在本队列中显示进度。" })
    ] }) })
  ] });
}
const DEFAULT_PROMPT_TEMPLATE_ID = "qwen3vl.design_prompt.v1";
const DEFAULT_PROMPT_REVERSE_MAX_TOKENS = 1536;
const DEFAULT_QWEN3VL_DESIGN_PROMPT = `你是一位专业的 AI 图像提示词专家和高级视觉设计师。

请仔细分析这张设计参考图，并生成一段可复用的图像生成提示词（Prompt）。

请严格以合规的 JSON 格式返回结果，仅包含以下字段，不要输出任何额外的 Markdown 标记（如 \`\`\`json）或解释性文本：
englishPrompt, chineseDescription, shortCaption, styleTags, subjectTags, compositionTags, colorTags, usageTags, negativePromptSuggestion。

分析时请专注于：
- 视觉风格（如扁平插画、写实摄影、奢华黑金、3D渲染等）
- 画面主体与细节特征
- 版式布局与构图方式（如对称、三分法、对角线、居中等）
- 色彩搭配（主色调、辅助色、渐变与对比度）
- 光影调性与照明效果
- 文字区域分布与排版感受
- 图形元素、背景装饰与画面意境
- 商业设计用途建议

要求：
1. 不要简单地罗列物体，请详细描述如何重建这种设计风格。
2. englishPrompt 字段必须为英文（适合 Midjourney/Stable Diffusion 绘图输入），描述画面并包含核心风格词。
3. chineseDescription 字段必须为中文，详尽剖析画面的设计美学与视觉呈现。
4. styleTags、subjectTags、compositionTags、colorTags、usageTags 字段必须全部使用中文标签，不要输出英文标签。
5. 请勿幻想出无法阅读的乱码文字。`;
const OPENAI_COMPATIBLE_REVERSE_PROMPT = DEFAULT_QWEN3VL_DESIGN_PROMPT;
const defaultLlamaBackend = {
  id: "llama-local-openai",
  name: "Llama 本地量化模型服务",
  type: "llama-openai",
  enabled: false,
  baseUrl: "http://127.0.0.1:8080/v1",
  apiKey: "local",
  defaultModel: "",
  timeoutMs: 12e4,
  capabilities: {
    chat: true,
    vision: false,
    embeddings: false,
    jsonOutput: true,
    modelList: true,
    modelManagement: false
  },
  priority: 50,
  notes: "适用于 llama.cpp / llama-server / llama.app 暴露的 OpenAI-compatible API。"
};
const defaultPromptReverseSettings = {
  backendMode: "llama-openai",
  selectedNativeModelId: "qwen3-vl-4b-instruct",
  selectedExternalBackendId: "llama-local-openai",
  selectedExternalModel: "",
  maxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
  maxImageSize: 1024,
  temperature: 0.6,
  topP: 0.9
};
const api = window.electronAPI;
const useSettingsStore = create((set, get) => ({
  settings: {
    libraryPath: "~/DesignAssetManager/library",
    concurrency: 3,
    delayInterval: 1.5,
    saveOriginalUrl: true,
    autoThumbnail: true,
    // Default Text Color Palette settings
    enableTextColorPalette: true,
    textDetectionProvider: "none",
    textDetectionTimeoutMs: 3e3,
    maxTextBoxes: 30,
    minTextBoxConfidence: 0.5,
    // OCR Enhancements R3
    enableTextColorAnalysis: true,
    textBoxProvider: "easyocr",
    ocrTimeoutMs: 3e3,
    maxTextBoxesPerImage: 30,
    autoInstallAllowed: false,
    lastOcrEnvCheckAt: "",
    cachedOcrEnvStatus: null,
    // Qwen3-VL & AI settings defaults
    modelRootDir: "~/DesignAssetManager/AIModels",
    selectedPromptModelId: "qwen3-vl-4b-instruct",
    // Update default model to 4B stable recommended
    selectedPromptModelPath: "~/DesignAssetManager/AIModels/qwen/qwen3-vl-4b-instruct",
    qwen3vlMaxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
    qwen3vlMaxImageSize: 1024,
    qwen3vlTemperature: 0.6,
    qwen3vlTopP: 0.9,
    aiBackends: [defaultLlamaBackend],
    promptReverseSettings: defaultPromptReverseSettings,
    promptReverseTemplates: [],
    modelCompatStatuses: {},
    memoryPolicy: {
      clearGpuBeforePromptReverse: "auto",
      forceClearWhenInsufficient: true,
      minFreeVramGBBeforeQwen8B: 10,
      maxGpuMemoryUsagePercent: 92,
      enableGpuMemoryGuard: true,
      enableGpuMemoryPollingDuringInference: true,
      gpuMemoryPollIntervalMs: 1e3
    }
  },
  loadSettings: async () => {
    if (api && api.settingsLoad) {
      try {
        const loaded = await api.settingsLoad();
        set({ settings: loaded });
        console.log("[SettingsStore] Settings loaded from backend:", loaded);
      } catch (err) {
        console.error("[SettingsStore] Failed to load settings:", err);
      }
    }
  },
  updateSettings: async (newSettings) => {
    const previous = get().settings;
    const updated = { ...previous, ...newSettings };
    set({ settings: updated });
    if (api && api.settingsSave) {
      try {
        const saved = await api.settingsSave(newSettings);
        set({ settings: saved });
        console.log("[SettingsStore] Settings saved to backend:", saved);
      } catch (err) {
        set({ settings: previous });
        console.error("[SettingsStore] Failed to save settings to backend, rolled back:", err);
        throw err;
      }
    }
  },
  clearCache: async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log("App visual cache cleared successfully.");
  }
}));
function LibrarySidebar({
  selectedAsset,
  assetsCount,
  activeTagSearchQueries,
  groupedSidebarTags,
  groupTitles,
  clearActiveTagSearchQueries,
  addActiveTagSearchQuery,
  removeActiveTagSearchQuery
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `transition-all duration-300 ease-in-out flex flex-col h-full shrink-0 font-sans select-none ${selectedAsset ? "w-0 opacity-0 p-0 border-0 mr-0 pointer-events-none overflow-hidden" : "w-56 border border-slate-200 rounded-2xl bg-white shadow-premium p-4 mr-6 overflow-y-auto"}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 pb-4 border-b border-slate-100 shrink-0 text-[12px] font-semibold text-slate-500", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wide px-2.5", children: "标签智能过滤器" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: clearActiveTagSearchQueries,
              className: `w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-center justify-between cursor-pointer ${activeTagSearchQueries.length === 0 ? "bg-brand-50 text-brand-700 font-bold" : "hover:bg-slate-50 text-slate-600"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Compass, { className: "w-4 h-4 stroke-[1.8]" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "全部素材资源" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold", children: assetsCount })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => addActiveTagSearchQuery("special:untagged"),
              className: `w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-center justify-between cursor-pointer ${activeTagSearchQueries.includes("special:untagged") ? "bg-rose-50 text-rose-700 font-bold border border-rose-100" : "hover:bg-slate-50 text-slate-600"}`,
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersVertical, { className: "w-4 h-4 stroke-[1.8] text-rose-400" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "无任何标签素材" })
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => addActiveTagSearchQuery("special:ai_pending"),
              className: `w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-center justify-between cursor-pointer ${activeTagSearchQueries.includes("special:ai_pending") ? "bg-purple-50 text-purple-700 font-bold border border-purple-100" : "hover:bg-slate-50 text-slate-600"}`,
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "w-4 h-4 stroke-[1.8] text-purple-500 animate-pulse" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "AI 待确认标签" })
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-4 pt-4 text-[12px] font-sans", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wide px-2.5", children: "标签维度词汇" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4 max-h-[50vh] overflow-y-auto px-0.5", children: Object.entries(groupTitles).map(([typeKey, title]) => {
            const list = groupedSidebarTags[typeKey] || [];
            if (list.length === 0) return null;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h6", { className: "text-[9.5px] font-bold text-slate-400 px-2 uppercase tracking-wide", children: title }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0.5 pl-1.5", children: list.map((tag) => {
                const tagQuery = `tag:${tag.name}`;
                const isActive = activeTagSearchQueries.includes(tagQuery);
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    onClick: () => {
                      if (isActive) {
                        removeActiveTagSearchQuery(tagQuery);
                      } else {
                        addActiveTagSearchQuery(tagQuery);
                      }
                    },
                    className: `w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-between transition-colors cursor-pointer ${isActive ? "bg-brand-50 text-brand-700 font-bold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "truncate pr-1", children: [
                        "#",
                        tag.name
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] bg-slate-100 text-slate-400 px-1 rounded font-bold shrink-0", children: tag.usageCount })
                    ]
                  },
                  tag.id
                );
              }) })
            ] }, typeKey);
          }) })
        ] })
      ]
    }
  );
}
function LibraryToolbar({
  searchQuery,
  setSearchQuery,
  showFilterPanel,
  setShowFilterPanel,
  filterSite,
  setFilterSite,
  filterTag,
  setFilterTag,
  includePending,
  setIncludePending,
  uniqueSites,
  tags,
  activeTagSearchQueries,
  handleClearFilters
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-panel p-4 rounded-2xl shadow-premium bg-white/80 flex flex-col md:flex-row items-center gap-4 shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 w-full relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search$1, { className: "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            placeholder: "在素材库中搜索标题，或输入标签语法检索 (例：tag:极简 type:style)...",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            className: "w-full pl-10 pr-4 py-2.5 text-[11.5px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-semibold text-slate-700"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => setShowFilterPanel(!showFilterPanel),
          className: `px-4 py-2.5 rounded-xl border text-[11.5px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${showFilterPanel ? "bg-brand-50 text-brand-700 border-brand-300 shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Filter, { className: "w-4 h-4 text-slate-500" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "高级筛选" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: `w-3.5 h-3.5 transition-transform duration-200 ${showFilterPanel ? "rotate-90" : ""}` })
          ]
        }
      ),
      (searchQuery || filterSite || filterTag || activeTagSearchQueries.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: handleClearFilters,
          className: "px-3.5 py-2.5 text-[11.5px] font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 flex items-center gap-1 shrink-0 cursor-pointer",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-3.5 h-3.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "重置筛选" })
          ]
        }
      )
    ] }),
    showFilterPanel && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-panel p-4 rounded-2xl shadow-premium bg-white/90 border border-slate-100 flex flex-wrap gap-4 items-center shrink-0 animate-in slide-in-from-top duration-300", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full md:w-56 relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: filterSite,
            onChange: (e) => setFilterSite(e.target.value),
            className: "w-full pl-10 pr-4 py-2 text-[11.5px] font-bold bg-white border border-slate-200 rounded-xl outline-none transition-premium cursor-pointer text-slate-600 appearance-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "全部网站来源" }),
              uniqueSites.map(([id2, name]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: id2, children: name }, id2))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full md:w-56 relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tag, { className: "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: filterTag,
            onChange: (e) => setFilterTag(e.target.value),
            className: "w-full pl-10 pr-4 py-2 text-[11.5px] font-bold bg-white border border-slate-200 rounded-xl outline-none transition-premium cursor-pointer text-slate-600 appearance-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "全部已使用标签" }),
              tags.map((tag) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: tag.name, children: tag.name }, tag.id))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2.5 px-4.5 py-2.5 bg-white/95 hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer transition-premium shadow-sm text-[11.5px] font-bold text-slate-600", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "checkbox",
            checked: includePending,
            onChange: (e) => setIncludePending(e.target.checked),
            className: "w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "w-3.5 h-3.5 text-purple-500 stroke-[2]" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "包含 AI 待确认标签" })
        ] })
      ] })
    ] })
  ] });
}
function AssetWaterfallGrid({
  filteredAssets,
  selectedAsset,
  bulkSelectedAssetIds,
  setSelectedAsset,
  toggleBulkSelectedAssetId
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: filteredAssets.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "waterfall-grid flex-1", children: filteredAssets.map((asset) => {
    const isSelected = selectedAsset?.id === asset.id;
    const isChecked = bulkSelectedAssetIds.includes(asset.id);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        onClick: () => setSelectedAsset(asset),
        className: `waterfall-item group rounded-2xl overflow-hidden border p-3 bg-white shadow-premium hover:shadow-card-hover transition-premium cursor-pointer relative ${isSelected ? "border-brand-500 ring-2 ring-brand-500/10" : "border-slate-100"} ${isChecked ? "ring-2 ring-brand-500/25 border-brand-400 bg-brand-50/5" : ""}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl overflow-hidden bg-slate-50 relative aspect-auto", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "img",
              {
                src: asset.thumbnailPath,
                alt: asset.title,
                className: "w-full h-auto object-cover group-hover:scale-[1.02] transition-premium"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur text-[9.5px] font-bold text-slate-500 shadow-sm", children: asset.sourceSiteName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  toggleBulkSelectedAssetId(asset.id);
                },
                className: `absolute top-2.5 left-2.5 w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${isChecked ? "bg-brand-500 border-brand-500 text-white scale-105 shadow-md shadow-brand-500/20" : "bg-white/90 border-slate-300 backdrop-blur opacity-0 group-hover:opacity-100 hover:scale-105 hover:bg-white hover:border-slate-400"}`,
                children: isChecked && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-3.5 h-3.5 stroke-[3]" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3.5 space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[12.5px] font-bold text-slate-700 leading-snug line-clamp-1", children: asset.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1", children: [
              asset.tags.slice(0, 3).map((tag, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "px-2 py-0.5 rounded text-[9.5px] font-semibold bg-slate-50 border border-slate-100 text-slate-500",
                  children: tag
                },
                idx
              )),
              asset.tags.length > 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-50 text-slate-400", children: [
                "+",
                asset.tags.length - 3
              ] })
            ] })
          ] })
        ]
      },
      asset.id
    );
  }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-32 border-2 border-dashed border-slate-200 bg-white rounded-2xl shadow-premium", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Maximize2, { className: "w-9 h-9 stroke-[1.5]" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12px] font-medium", children: "没有找到符合搜索条件的素材资产" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10.5px] text-slate-400 font-medium", children: "请调整上面的关键词搜索、左侧过滤器或重置条件重试。" })
  ] }) });
}
function TagChip({
  name,
  type = "custom",
  colorClass,
  source = "manual",
  confidence = 1,
  status = "confirmed",
  modelName,
  onRemove,
  onClick,
  showHoverTooltip = true
}) {
  const getTypeColors = (t2) => {
    const maps = {
      style: "bg-indigo-50 text-indigo-700 border border-indigo-200",
      color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      usage: "bg-blue-50 text-blue-700 border border-blue-200",
      layout: "bg-amber-50 text-amber-700 border border-amber-200",
      scene: "bg-rose-50 text-rose-700 border border-rose-200",
      source: "bg-slate-100 text-slate-700 border border-slate-200",
      ai: "bg-purple-50 text-purple-700 border border-purple-200",
      custom: "bg-pink-50 text-pink-700 border border-pink-200"
    };
    return maps[t2] || maps.custom;
  };
  const baseColors = colorClass || getTypeColors(type);
  const isAi = source.startsWith("ai_") || source === "ai";
  const isPending = status === "pending";
  const isRejected = status === "rejected";
  if (isRejected) return null;
  const getSourceLabel = (src) => {
    if (src === "manual") return "用户手动";
    if (src === "ai_wd_tagger") return "WD Tagger AI";
    if (src === "ai_florence") return "Florence-2 AI";
    if (src === "ai_joycaption") return "JoyCaption AI";
    if (src === "ai_qwen_vl") return "Qwen2.5-VL AI";
    if (src === "filename") return "文件名解析";
    if (src === "website") return "网页抓取";
    return src;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative group/chip inline-block select-none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick,
        disabled: !onClick,
        className: `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${onClick ? "hover:scale-[1.02] active:scale-95 cursor-pointer" : "cursor-default"} ${isPending ? "bg-white/80 text-slate-500 border border-dashed border-slate-300" : baseColors} ${confidence < 0.6 && isPending ? "opacity-60" : "opacity-100"}`,
        children: [
          isAi && /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: `w-3 h-3 ${isPending ? "text-purple-400" : "text-purple-600 animate-pulse"}` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: name }),
          onRemove && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              onClick: (e) => {
                e.stopPropagation();
                onRemove();
              },
              className: "w-3.5 h-3.5 rounded-full hover:bg-black/10 inline-flex items-center justify-center text-current/80 cursor-pointer ml-0.5",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-2.5 h-2.5" })
            }
          )
        ]
      }
    ),
    showHoverTooltip && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 rounded-xl bg-slate-900/95 backdrop-blur text-white shadow-xl opacity-0 scale-95 group-hover/chip:opacity-100 group-hover/chip:scale-100 pointer-events-none transition-all duration-200 ease-out font-sans", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5 text-[10px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center border-b border-white/10 pb-1 mb-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-slate-300 uppercase tracking-wide", children: "标签详情" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-white/20 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase", children: type })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Compass, { className: "w-3 h-3 text-slate-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "分类: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-brand-300", children: type })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
          isAi ? /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "w-3 h-3 text-purple-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "w-3 h-3 text-slate-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "来源: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-slate-200", children: getSourceLabel(source) })
          ] })
        ] }),
        isAi && modelName && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "w-3 h-3 text-slate-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "truncate", children: [
            "模型: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold font-mono text-slate-300", children: modelName })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-3 h-3 rounded-full border border-slate-400 flex items-center justify-center font-bold text-[7px] text-slate-400", children: "%" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "置信度: ",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-bold text-slate-200", children: [
              (confidence * 100).toFixed(0),
              "%"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-3 h-3 rounded-full bg-white/20 flex items-center justify-center text-[7px]", children: "S" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "状态: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `font-bold ${isPending ? "text-amber-400 animate-pulse" : "text-emerald-400"}`, children: isPending ? "待确认" : "已确认" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/95" })
    ] })
  ] });
}
function TagInput({
  onSelectTag,
  onAddCustomTag,
  placeholder = "添加标签...",
  excludeTagNames = []
}) {
  const tags = useAssetStore((s) => s.tags);
  const [inputValue, setInputValue] = reactExports.useState("");
  const [showDropdown, setShowDropdown] = reactExports.useState(false);
  const [highlightedIndex, setHighlightedIndex] = reactExports.useState(0);
  const containerRef = reactExports.useRef(null);
  const filteredSuggestions = tags.filter((tag) => {
    const matchSearch = tag.name.toLowerCase().includes(inputValue.toLowerCase()) || tag.aliases.some((a) => a.toLowerCase().includes(inputValue.toLowerCase()));
    const notExcluded = !excludeTagNames.includes(tag.name);
    return matchSearch && notExcluded;
  }).slice(0, 8);
  const hasExactMatch = tags.some(
    (tag) => tag.name.toLowerCase() === inputValue.trim().toLowerCase()
  );
  reactExports.useEffect(() => {
    setHighlightedIndex(0);
  }, [inputValue]);
  reactExports.useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(
        (prev) => prev < filteredSuggestions.length + (hasExactMatch ? 0 : 1) - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(
        (prev) => prev > 0 ? prev - 1 : filteredSuggestions.length + (hasExactMatch ? 0 : 1) - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;
      const isCreateOptionActive = !hasExactMatch && highlightedIndex === filteredSuggestions.length;
      if (filteredSuggestions.length > 0 && highlightedIndex < filteredSuggestions.length) {
        onSelectTag(filteredSuggestions[highlightedIndex].id);
        setInputValue("");
        setShowDropdown(false);
      } else if (isCreateOptionActive || !hasExactMatch) {
        onAddCustomTag(trimmed);
        setInputValue("");
        setShowDropdown(false);
      } else {
        const matched = tags.find((t2) => t2.name.toLowerCase() === trimmed.toLowerCase());
        if (matched) {
          onSelectTag(matched.id);
          setInputValue("");
          setShowDropdown(false);
        }
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };
  const handleSelectSuggestion = (tag) => {
    onSelectTag(tag.id);
    setInputValue("");
    setShowDropdown(false);
  };
  const handleCreateCustom = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onAddCustomTag(trimmed);
      setInputValue("");
      setShowDropdown(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: containerRef, className: "relative w-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search$1, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: inputValue,
          onChange: (e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          },
          onFocus: () => setShowDropdown(true),
          onKeyDown: handleKeyDown,
          placeholder,
          className: "w-full pl-9 pr-4 py-1.5 text-[11.5px] font-medium rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
        }
      )
    ] }),
    showDropdown && (inputValue.trim() !== "" || filteredSuggestions.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute z-40 top-full left-0 w-full mt-1.5 rounded-xl border border-slate-100 bg-white/95 backdrop-blur shadow-xl max-h-60 overflow-y-auto p-1 font-sans", children: [
      filteredSuggestions.map((tag, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => handleSelectSuggestion(tag),
          onMouseEnter: () => setHighlightedIndex(idx),
          className: `w-full text-left px-3 py-1.5 rounded-lg text-[11.5px] font-medium flex items-center justify-between transition-colors ${highlightedIndex === idx ? "bg-brand-50 text-brand-700 font-bold" : "text-slate-600 hover:bg-slate-50"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `w-2.5 h-2.5 rounded-full ${tag.color.split(" ")[0] || "bg-slate-400"}` }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: tag.name })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider scale-90", children: tag.type })
          ]
        },
        tag.id
      )),
      !hasExactMatch && inputValue.trim() !== "" && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: handleCreateCustom,
          onMouseEnter: () => setHighlightedIndex(filteredSuggestions.length),
          className: `w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border-t border-slate-50 mt-1 transition-colors ${highlightedIndex === filteredSuggestions.length ? "bg-brand-50 text-brand-700 font-bold" : "text-brand-500 hover:bg-slate-50"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-3.5 h-3.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              '快速创建新标签 "',
              inputValue.trim(),
              '"'
            ] })
          ]
        }
      ),
      filteredSuggestions.length === 0 && hasExactMatch && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-2 text-[10.5px] text-slate-400 font-medium text-center", children: "该标签已添加" })
    ] })
  ] });
}
function AssetTagPanel({ assetId }) {
  const assetRelations = useAssetStore((s) => s.assetRelations);
  const { addTagToAsset, removeTagFromAsset, createTag, addActiveTagSearchQuery } = useAssetStore();
  const relations = assetRelations[assetId] || [];
  const uniqueRelations = React$2.useMemo(() => {
    const seen = /* @__PURE__ */ new Set();
    return relations.filter((r2) => {
      if (seen.has(r2.tag_id)) return false;
      seen.add(r2.tag_id);
      return true;
    });
  }, [relations]);
  const confirmedRelations = uniqueRelations.filter((r2) => r2.status === "confirmed");
  const handleSelectExistingTag = async (tagId) => {
    try {
      await addTagToAsset(assetId, tagId, {
        source: "manual",
        status: "confirmed"
      });
    } catch (e) {
      console.error(e);
    }
  };
  const handleCreateAndAddTag = async (tagName) => {
    try {
      const newTag = await createTag({
        name: tagName,
        type: "custom",
        color: "bg-pink-50 text-pink-700 border border-pink-200"
      });
      if (newTag) {
        await addTagToAsset(assetId, newTag.id, {
          source: "manual",
          status: "confirmed"
        });
      }
    } catch (e) {
      console.error(e);
    }
  };
  const handleRemoveTag = async (tagId) => {
    try {
      await removeTagFromAsset(assetId, tagId);
    } catch (e) {
      console.error(e);
    }
  };
  const activeTagNames = confirmedRelations.map((r2) => r2.tag_name);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3.5 font-sans", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tag, { className: "w-3.5 h-3.5 text-slate-400" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "素材标签管理" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1.5 max-h-40 overflow-y-auto px-0.5 py-0.5", children: [
      confirmedRelations.map((rel) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        TagChip,
        {
          name: rel.tag_name,
          type: rel.tag_type,
          colorClass: rel.tag_color,
          source: rel.source,
          confidence: rel.confidence,
          status: rel.status,
          modelName: rel.model_name || void 0,
          onRemove: () => handleRemoveTag(rel.tag_id),
          onClick: () => addActiveTagSearchQuery(`tag:${rel.tag_name}`)
        },
        rel.id
      )),
      confirmedRelations.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-slate-400 font-medium italic block py-0.5", children: "暂无已确认标签，请在下方添加或开启 AI 特征反推。" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      TagInput,
      {
        onSelectTag: handleSelectExistingTag,
        onAddCustomTag: handleCreateAndAddTag,
        excludeTagNames: activeTagNames,
        placeholder: "搜索或输入后按回车快速添加标签..."
      }
    ) })
  ] });
}
const ColorSwatch = ({ color, onCopy }) => {
  const [hovered, setHovered] = reactExports.useState(false);
  const [showOptions, setShowOptions] = reactExports.useState(false);
  const [copiedFormat, setCopiedFormat] = reactExports.useState(null);
  const rgb = Array.isArray(color.rgb) ? color.rgb : [0, 0, 0];
  const hsl = Array.isArray(color.hsl) ? color.hsl : [0, 0, 0];
  const rgbStr = `rgb(${rgb.join(", ")})`;
  const hslStr = `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
  const cssVarStr = `--color-${color.role || "swatch"}: ${color.hex};`;
  const handleCopy = async (text, format, e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFormat(format);
      if (onCopy) onCopy(text);
      setTimeout(() => setCopiedFormat(null), 2e3);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
    setShowOptions(false);
  };
  const getRoleLabel = (role) => {
    switch (role) {
      case "background":
        return "主背景色";
      case "primary":
        return "主色调";
      case "secondary":
        return "辅助色";
      case "accent":
        return "点缀色";
      default:
        return "配色";
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "relative group flex flex-col items-center",
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => {
        setHovered(false);
        setShowOptions(false);
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            onClick: (e) => handleCopy(color.hex, "HEX", e),
            className: "relative w-16 h-16 rounded-xl shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-110 hover:-translate-y-1 active:scale-95 border border-white/10 flex items-center justify-center overflow-hidden",
            style: { backgroundColor: color.hex },
            children: [
              copiedFormat === "HEX" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center animate-fade-in", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-6 h-6 text-white animate-scale-up" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "span",
                {
                  className: "absolute bottom-1 right-1.5 text-[9px] font-mono select-none",
                  style: { color: color.textColor, opacity: 0.6 },
                  children: [
                    color.percentage,
                    "%"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowOptions(!showOptions);
                  },
                  className: "absolute top-1 right-1 p-0.5 rounded-full hover:bg-black/20 text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  style: { color: color.textColor },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(EllipsisVertical, { className: "w-3.5 h-3.5" })
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1.5 text-xs font-mono font-medium text-slate-400 group-hover:text-slate-200 transition-colors select-all", children: color.hex }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500 font-sans", children: color.family }),
        showOptions && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute z-30 bottom-20 right-0 w-44 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-2xl p-1.5 flex flex-col gap-0.5 animate-scale-up text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1", children: "复制颜色格式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: (e) => handleCopy(color.hex, "HEX", e),
              className: "flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all text-left",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  "HEX (",
                  color.hex,
                  ")"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-3 h-3 text-slate-500" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: (e) => handleCopy(rgbStr, "RGB", e),
              className: "flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all text-left",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "RGB" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-3 h-3 text-slate-500" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: (e) => handleCopy(hslStr, "HSL", e),
              className: "flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all text-left",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "HSL" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-3 h-3 text-slate-500" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: (e) => handleCopy(cssVarStr, "CSS", e),
              className: "flex items-center justify-between px-2.5 py-1.5 text-[11px] font-mono rounded-lg text-amber-300 hover:bg-white/10 transition-all text-left",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "CSS 变量" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-3 h-3 text-amber-500/70" })
              ]
            }
          )
        ] }),
        hovered && !showOptions && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute z-20 bottom-24 bg-slate-950/85 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl p-3 flex flex-col gap-1 w-48 text-left animate-fade-in pointer-events-none select-none", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold text-slate-100", children: getRoleLabel(color.role) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] font-mono bg-white/10 text-slate-300 px-1.5 py-0.5 rounded-full", children: [
              color.percentage,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 text-[10px] text-slate-400 gap-y-1 gap-x-2 font-mono", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "HEX:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "col-span-2 text-slate-200 text-right", children: color.hex }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "RGB:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "col-span-2 text-slate-200 text-right", children: rgb.join(", ") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "HSL:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "col-span-2 text-slate-200 text-right", children: [
              hsl[0],
              "°, ",
              hsl[1],
              "%, ",
              hsl[2],
              "%"
            ] }),
            color.contrastWhite !== void 0 && color.contrastBlack !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "col-span-2", children: "对比白/黑:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-200 text-right font-medium", children: [
                color.contrastWhite,
                ":",
                color.contrastBlack
              ] })
            ] }),
            color.confidence !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "置信度:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "col-span-2 text-slate-200 text-right font-medium", children: [
                Math.round(color.confidence * 100),
                "%"
              ] })
            ] }),
            color.from_boxes !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "文字框数:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "col-span-2 text-slate-200 text-right font-medium", children: [
                color.from_boxes,
                " 个"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 border-t border-white/5 pt-1.5 text-[9.5px] text-slate-500 italic text-center", children: "点击复制 HEX 色值" })
        ] })
      ]
    }
  );
};
const ColorPalettePanel = ({ asset }) => {
  const [loading, setLoading] = reactExports.useState(false);
  const [toastMessage, setToastMessage] = reactExports.useState(null);
  useAssetStore((state) => state.loadAssets);
  let palette = null;
  try {
    if (asset?.color_palette_json) {
      palette = JSON.parse(asset.color_palette_json);
    }
  } catch (err) {
    console.error("[ColorPalettePanel] Failed to parse palette JSON:", err);
  }
  const triggerToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 2500);
  };
  const handleCopyText = (text) => {
    triggerToast(`已复制 HEX 色值: ${text}`);
  };
  const imagePalette = palette?.image_palette;
  const textPalette = palette?.text_palette;
  const themes = imagePalette?.themes;
  const swatches = imagePalette?.colors || imagePalette?.swatches || [];
  const textSwatches = textPalette?.colors || textPalette?.swatches || [];
  const textForegrounds = textSwatches.filter((s) => s.role !== "text_background");
  let textBgHex = "";
  let textBgSourceCount = 0;
  const textBgSwatch = textSwatches.find((s) => s.role === "text_background");
  if (textBgSwatch) {
    textBgHex = textBgSwatch.hex;
    textBgSourceCount = textBgSwatch.from_boxes || textBgSwatch.sourceCount || 1;
  } else if (textPalette?.background_colors && textPalette.background_colors.length > 0) {
    textBgHex = textPalette.background_colors[0];
    textBgSourceCount = textPalette.processed_text_box_count || 1;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 flex flex-col gap-6 text-left select-none relative overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-slate-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Palette, { className: "w-4 h-4 text-purple-400" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-bold tracking-tight", children: "色卡" })
    ] }) }),
    !palette && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center py-8 text-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-5 h-5 text-purple-400 animate-spin" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-slate-400 animate-pulse", children: "正在自动提取色卡中..." })
    ] }),
    palette && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-6", children: [
      themes && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1.5", children: [
        themes.isWarm && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20", children: "暖色调" }),
        themes.isCool && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20", children: "冷色调" }),
        themes.isNeutral && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded-full border border-slate-500/20", children: "中性色" }),
        themes.isHighSaturation && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20", children: "高饱和" }),
        themes.isLowSaturation && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20", children: "低饱和" }),
        themes.hasBlackGold && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold bg-yellow-600/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20", children: "黑金配色" }),
        themes.hasBluePurpleGradient && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20", children: "蓝紫渐变" }),
        themes.hasRedOrangeTone && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20", children: "红橙色调" }),
        themes.backgroundType === "dark" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold bg-black/30 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800", children: "深色背景" }),
        themes.backgroundType === "light" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold bg-white/10 text-slate-300 px-2 py-0.5 rounded-full border border-white/10", children: "浅色背景" })
      ] }),
      imagePalette?.dominant && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 border-b border-slate-800/40 pb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-bold text-slate-400 tracking-wider uppercase", children: "画面主导色 (Dominant Color)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[11px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "w-12 h-8 rounded-lg border border-white/10 shadow-inner cursor-pointer hover:scale-105 transition-transform flex-shrink-0",
              style: { backgroundColor: imagePalette.dominant.hex },
              onClick: () => {
                navigator.clipboard.writeText(imagePalette.dominant.hex);
                handleCopyText(imagePalette.dominant.hex);
              },
              title: "点击复制 Hex"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-0.5 justify-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-200 text-xs font-mono", children: imagePalette.dominant.hex }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-slate-500 text-[10px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                "色系: ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-400 font-semibold", children: imagePalette.dominant.family })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "•" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                "RGB: ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-slate-400", children: imagePalette.dominant.rgb ? imagePalette.dominant.rgb.join(", ") : "" })
              ] })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-bold text-slate-400 tracking-wider uppercase", children: "全图色卡配色" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-4 gap-y-4 gap-x-2", children: swatches.map((color, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          ColorSwatch,
          {
            color: {
              ...color,
              percentage: color.percentage ?? 10
            },
            onCopy: handleCopyText
          },
          `img-swatch-${idx}`
        )) })
      ] }),
      (() => {
        const textStatus = textPalette?.status || textPalette?.textColorStatus || "none";
        const skipReason = textPalette?.skipReason;
        const detectedCount = textPalette?.detected_text_box_count || 0;
        const provider = textPalette?.provider || "unknown";
        const durationMs = textPalette?.duration_ms || 180;
        const isSuccess = textPalette?.status === "success" || textPalette?.textColorStatus === "success" || textStatus === "completed";
        if (textStatus === "skipped") {
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[11px] text-amber-400 font-medium animate-in fade-in duration-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-4 h-4 text-amber-500 flex-shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              skipReason === "paddleocr_not_installed" && "文字颜色分析已跳过：PaddleOCR 未安装",
              skipReason === "rapidocr_not_installed" && "文字颜色分析已跳过：RapidOCR 未安装",
              skipReason === "disabled_by_user" && "文字颜色分析已关闭",
              skipReason === "provider_none" && "文字颜色分析已关闭",
              skipReason === "no_text_detected" && "文字颜色分析已跳过：未检测到任何文字",
              !["paddleocr_not_installed", "rapidocr_not_installed", "disabled_by_user", "provider_none", "no_text_detected"].includes(skipReason) && "文字颜色分析已跳过"
            ] })
          ] });
        }
        if (textStatus === "failed") {
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 p-3 bg-rose-500/5 rounded-xl border border-rose-500/10 text-[11px] text-rose-400 font-medium animate-in fade-in duration-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-4 h-4 text-rose-500 flex-shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "文字颜色分析失败" })
            ] }),
            textPalette.warnings && textPalette.warnings.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "text-[10px] text-rose-300 font-mono mt-1 whitespace-pre-wrap select-text leading-normal max-h-24 overflow-y-auto scrollbar-thin bg-slate-950/20 p-2 rounded-lg border border-slate-900/50", children: textPalette.warnings.join("\n") })
          ] });
        }
        if (isSuccess && textForegrounds.length > 0 && !textPalette?.isMock) {
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 border-t border-slate-800/60 pt-4 animate-in fade-in duration-300", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-slate-400", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Type, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-bold tracking-wider uppercase", children: "文字设计配色" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[9.5px] text-slate-500 font-semibold flex items-center gap-1.5 font-mono", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/40 text-slate-400", children: provider }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  detectedCount,
                  " 框"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "•" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  durationMs,
                  "ms"
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-5 gap-2", children: textForegrounds.map((color, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                ColorSwatch,
                {
                  color: {
                    ...color,
                    percentage: color.percentage ?? Math.round((color.confidence || 0) * 100),
                    isDark: color.hsl ? color.hsl[2] < 45 : true,
                    textColor: color.hsl ? color.hsl[2] > 50 ? "#000000" : "#FFFFFF" : "#FFFFFF"
                  },
                  onCopy: handleCopyText
                },
                `text-swatch-${idx}`
              )) }),
              textBgHex && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-2 bg-slate-950/40 rounded-lg border border-slate-800 text-[10px] text-slate-400", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-300", children: "文字区域背景色:" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "w-3.5 h-3.5 rounded border border-white/10",
                    style: { backgroundColor: textBgHex },
                    title: `HEX: ${textBgHex}`
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-slate-500", children: textBgHex }),
                textBgSourceCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-auto text-[9px] text-slate-500", children: [
                  "分析自 ",
                  textBgSourceCount,
                  " 个提取的文字框"
                ] })
              ] })
            ] })
          ] });
        }
        return null;
      })()
    ] }),
    toastMessage && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute bottom-4 left-4 right-4 bg-slate-950/90 text-slate-100 text-xs px-3 py-2 rounded-xl border border-slate-700/60 shadow-2xl flex items-center gap-2 animate-slide-up", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-4 h-4 text-emerald-400 flex-shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: toastMessage })
    ] })
  ] });
};
const TYPE_LABEL_MAP = {
  design: { type: "商业设计图 (DESIGN)", model: "Florence-2 & CLIP" },
  ui: { type: "界面截图 (UI)", model: "Florence-2" },
  document: { type: "文档大图 (DOCUMENT)", model: "Florence-2" },
  anime: { type: "动漫原画 (ANIME)", model: "WD Tagger" },
  illustration: { type: "手绘插画 (ILLUSTRATION)", model: "RAM++" },
  photo: { type: "摄影照片 (PHOTO)", model: "RAM++" },
  product: { type: "商品展示 (PRODUCT)", model: "RAM++" },
  unknown: { type: "未知类别 (UNKNOWN)", model: "Rule-based Fallback" }
};
const PIPELINE_MAP = {
  anime: ["wd_tagger"],
  illustration: ["ram", "design_rule"],
  photo: ["ram", "design_rule"],
  product: ["ram", "design_rule"],
  design: ["ram", "florence2", "design_rule"],
  ui: ["ram", "florence2", "design_rule"],
  document: ["ram", "florence2", "design_rule"],
  unknown: ["ram", "design_rule"]
};
const BASE_LAYER_MODELS = {
  ram: { name: "RAM++ 通用标签", desc: "通用图像与多标签泛用推理，建议大多数素材开启。" }
};
const ENHANCED_LAYER_MODELS = {
  florence2: { name: "Florence-2 画面描述 / 设计语义", desc: "图片场景详细描述、设计图语义复判。" },
  design_rule: { name: "DesignRule 设计规则", desc: "排版、版式、比例、来源、设计用途规则辅助。" },
  wd_tagger: { name: "WD Tagger 动漫标签", desc: "二次元 / 动漫 / 角色特征提取，仅动漫素材建议开启。" },
  clip: { name: "CLIP Classifier 设计词典分类", desc: "零样本分类与自定义设计词典匹配。" }
};
const MODEL_DISPLAY_NAMES = {
  ram: { name: "RAM++", desc: "通用画风与多标签反推" },
  florence2: { name: "Florence-2", desc: "图片场景详细描述" },
  wd_tagger: { name: "WD Tagger", desc: "二次元/动漫特征提取" },
  clip: { name: "CLIP Classifier", desc: "零样本特征分类器" },
  design_rule: { name: "DesignRule", desc: "排版与版式规则辅助" }
};
function TagSuggestionPanel({ assetId }) {
  const api2 = window.electronAPI;
  const selectedAsset = useAssetStore((s) => s.selectedAsset);
  const assetRelations = useAssetStore((s) => s.assetRelations);
  const { confirmAiTag, rejectAiTag, generateMockAiSuggestions } = useAssetStore();
  const [scanningState, setScanningState] = reactExports.useState("idle");
  const [detectedType, setDetectedType] = reactExports.useState("");
  const [customModels, setCustomModels] = reactExports.useState([]);
  const [taggingError, setTaggingError] = reactExports.useState(null);
  React$2.useEffect(() => {
    setDetectedType("");
    if (!selectedAsset) return;
    let active = true;
    const fetchRealRoute = async () => {
      try {
        if (api2 && api2.assetsGetCustomCategory) {
          const customRes = await api2.assetsGetCustomCategory(selectedAsset.id);
          if (active && customRes && customRes.success && customRes.category) {
            setDetectedType(customRes.category);
            return;
          }
        }
        if (api2 && api2.aiRoutingPreview) {
          const routeRes = await api2.aiRoutingPreview(selectedAsset.filePath);
          if (active && routeRes && routeRes.routing_result) {
            const realType = routeRes.routing_result.asset_type;
            setDetectedType(realType);
          }
        }
      } catch (e) {
      }
    };
    fetchRealRoute();
    return () => {
      active = false;
    };
  }, [assetId, selectedAsset?.filePath]);
  React$2.useEffect(() => {
    if (detectedType && PIPELINE_MAP[detectedType]) {
      setCustomModels(PIPELINE_MAP[detectedType]);
    } else {
      setCustomModels(["ram", "clip"]);
    }
  }, [detectedType]);
  if (!selectedAsset) return null;
  const relations = assetRelations[assetId] || [];
  const pendingSuggestions = React$2.useMemo(() => {
    const pending = relations.filter((r2) => r2.status === "pending");
    const seen = /* @__PURE__ */ new Set();
    return pending.filter((r2) => {
      const name = r2.tag_name.toLowerCase().trim();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [relations]);
  const handleCategoryChange = async (e) => {
    const newCategory = e.target.value;
    setDetectedType(newCategory);
    try {
      if (api2 && api2.assetsSaveCustomCategory) {
        await api2.assetsSaveCustomCategory(selectedAsset.id, newCategory);
      }
    } catch (err) {
      console.error("[UI] Failed to save custom category override:", err);
    }
  };
  const handleModelToggle = (model) => {
    setCustomModels((prev) => {
      if (prev.includes(model)) {
        return prev.filter((m2) => m2 !== model);
      } else {
        return [...prev, model];
      }
    });
  };
  const triggerAiTagging = async () => {
    setTaggingError(null);
    setScanningState("routing");
    try {
      setScanningState("tagging");
      const result = await generateMockAiSuggestions(assetId, customModels);
      if (!result.success) {
        setTaggingError(result.error || "真实 AI 打标不可用。");
        return;
      }
      setScanningState("completed");
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (e) {
      setTaggingError(e?.message || String(e));
    } finally {
      setScanningState("idle");
    }
  };
  const scanning = scanningState !== "idle";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 font-sans text-[12px] border-t border-slate-100 pt-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "w-3.5 h-3.5 text-purple-500 animate-pulse" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "AI 视觉特征 analysis" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          disabled: scanning || customModels.length === 0,
          onClick: triggerAiTagging,
          className: "px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-3 h-3 ${scanning ? "animate-spin" : ""}` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: scanning ? "分析中..." : "AI 智能打标" })
          ]
        }
      )
    ] }),
    taggingError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10.5px] font-semibold text-amber-700", children: taggingError }),
    !scanning && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 animate-in fade-in slide-in-from-top-1 duration-300", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { className: "w-4 h-4 text-purple-500 shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-500 font-semibold truncate", children: "预估视觉分类：" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              disabled: scanning,
              value: detectedType || "unknown",
              onChange: handleCategoryChange,
              className: "appearance-none pl-3 pr-8 py-1.5 bg-white border border-slate-200 hover:border-purple-300 text-purple-700 font-bold rounded-xl shadow-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-300 transition-all text-[11px]",
              children: Object.entries(TYPE_LABEL_MAP).map(([key, item]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: key, className: "font-semibold text-slate-700", children: item.type.split(" (")[0] }, key))
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "w-3.5 h-3.5 text-purple-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-slate-100 dark:border-slate-800/80 pt-2.5 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "w-3 h-3 text-purple-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "第一组：基础标签层" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-1.5", children: Object.entries(BASE_LAYER_MODELS).map(([key, model]) => {
            const isChecked = customModels.includes(key);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                onClick: () => !scanning && handleModelToggle(key),
                className: `flex flex-col p-2 rounded-xl border transition-all duration-200 cursor-pointer select-none ${isChecked ? "bg-purple-500/[0.04] border-purple-200/90 text-purple-700 font-bold" : "bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50 hover:border-slate-300"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-[10.5px]", children: model.name }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        className: `w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${isChecked ? "bg-purple-600 border-purple-600 text-white" : "border-slate-300"}`,
                        children: isChecked && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-2.5 h-2.5 stroke-[4.5]" })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] text-slate-400 mt-0.5 leading-tight", children: model.desc })
                ]
              },
              key
            );
          }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "w-3 h-3 text-indigo-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "第二组：专项增强层" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-1.5", children: Object.entries(ENHANCED_LAYER_MODELS).map(([key, model]) => {
            const isChecked = customModels.includes(key);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                onClick: () => !scanning && handleModelToggle(key),
                className: `flex flex-col p-2 rounded-xl border transition-all duration-200 cursor-pointer select-none ${isChecked ? "bg-purple-500/[0.04] border-purple-200/90 text-purple-700 font-bold" : "bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50 hover:border-slate-300"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-[10.5px]", children: model.name }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        className: `w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${isChecked ? "bg-purple-600 border-purple-600 text-white" : "border-slate-300"}`,
                        children: isChecked && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-2.5 h-2.5 stroke-[4.5]" })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] text-slate-400 mt-0.5 leading-tight", children: model.desc })
                ]
              },
              key
            );
          }) })
        ] })
      ] })
    ] }) }),
    scanning && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 animate-in fade-in slide-in-from-top-3 duration-300", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl px-4 py-3 flex items-center gap-3 border text-[11px] font-semibold bg-white/40 border-purple-500/20 text-purple-700 shadow-md shadow-purple-500/5 backdrop-blur-md", children: [
      scanningState !== "completed" ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 animate-spin text-purple-500 shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-4.5 h-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-3 h-3 stroke-[3.5]" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "leading-relaxed leading-none transition-all duration-300", children: [
        scanningState === "routing" && "正在提交真实 AI Worker 打标任务...",
        scanningState === "classified" && `已识别/锁定类型: ${TYPE_LABEL_MAP[detectedType]?.type || detectedType.toUpperCase()}`,
        scanningState === "tagging" && `正在等待真实模型返回：[${customModels.map((m2) => MODEL_DISPLAY_NAMES[m2]?.name || m2).join(", ")}]`,
        scanningState === "completed" && "真实 AI 标签建议已完成。"
      ] })
    ] }) }),
    pendingSuggestions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 bg-purple-50/20 border border-purple-100/50 p-3 rounded-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] font-bold text-purple-600 flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { className: "w-3.5 h-3.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "AI 标签推荐 (待确认)" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5 pt-1", children: pendingSuggestions.map((rel) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-[10px] font-semibold bg-white text-slate-600 border border-dashed border-purple-200 shadow-sm",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: rel.tag_name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[8px] bg-purple-100 text-purple-800 px-1 rounded ml-0.5", children: [
              (rel.confidence * 100).toFixed(0),
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => confirmAiTag(rel.id, assetId),
                className: "w-4.5 h-4.5 rounded-full hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 inline-flex items-center justify-center transition-colors cursor-pointer",
                title: "确认采纳此标签",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-2.5 h-2.5 stroke-[3]" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => rejectAiTag(rel.id, assetId),
                className: "w-4.5 h-4.5 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600 inline-flex items-center justify-center transition-colors cursor-pointer",
                title: "拒绝此标签",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-2.5 h-2.5" })
              }
            )
          ]
        },
        rel.id
      )) })
    ] }),
    pendingSuggestions.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 border border-dashed border-slate-200 bg-white text-center rounded-xl text-[10.5px] text-slate-400 font-medium", children: "该素材暂无 AI 智能标签建议。点击上方“AI 智能打标”生成推荐标签。" })
  ] });
}
function AssetOriginalViewerModal({
  asset,
  onClose
}) {
  const [scaleMode, setScaleMode] = reactExports.useState("fit");
  const [scale, setScale] = reactExports.useState(1);
  const [realWidth, setRealWidth] = reactExports.useState(asset.width || 0);
  const [realHeight, setRealHeight] = reactExports.useState(asset.height || 0);
  const [copied, setCopied] = reactExports.useState(false);
  const viewportRef = reactExports.useRef(null);
  const handleImageLoad = (e) => {
    const img = e.currentTarget;
    if (!realWidth || !realHeight) {
      setRealWidth(img.naturalWidth);
      setRealHeight(img.naturalHeight);
    }
  };
  reactExports.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "=" || e.key === "+") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key === "0") {
        handleResetZoom();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [realWidth, realHeight]);
  const handleZoomIn = () => {
    setScaleMode("custom");
    setScale((prev) => Math.min(5, Number((prev + 0.1).toFixed(2))));
  };
  const handleZoomOut = () => {
    setScaleMode("custom");
    setScale((prev) => Math.max(0.1, Number((prev - 0.1).toFixed(2))));
  };
  const handleResetZoom = () => {
    setScaleMode("custom");
    setScale(1);
  };
  const handleToggleFit = () => {
    if (scaleMode === "fit") {
      setScaleMode("custom");
      setScale(1);
    } else {
      setScaleMode("fit");
    }
  };
  const copyPathToClipboard = () => {
    navigator.clipboard.writeText(asset.filePath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  const openLocalFolder = () => {
    const api2 = window.electronAPI;
    if (api2 && typeof api2.showItemInFolder === "function") {
      api2.showItemInFolder(asset.filePath);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex flex-col bg-slate-950/98 backdrop-blur-md animate-in fade-in duration-200 select-none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-16 px-6 border-b border-slate-900 bg-slate-950 flex items-center justify-between text-slate-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[13px] font-bold text-white max-w-[300px] md:max-w-[450px] truncate", children: asset.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-slate-400 font-semibold tracking-wide mt-0.5", children: [
          realWidth,
          " × ",
          realHeight,
          " PX • ",
          (asset.fileSize / 1024 / 1024).toFixed(2),
          " MB • ",
          asset.fileType
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleZoomOut,
            title: "缩小",
            className: "w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-400 hover:text-white cursor-pointer",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomOut, { className: "w-4 h-4" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleResetZoom,
            title: "重置为 100% 原始尺寸",
            className: "px-2.5 h-8 text-[11px] font-bold hover:bg-slate-800 rounded-lg flex items-center justify-center transition-colors min-w-[55px] cursor-pointer",
            children: scaleMode === "fit" ? "自适应" : `${Math.round(scale * 100)}%`
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleZoomIn,
            title: "放大",
            className: "w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-400 hover:text-white cursor-pointer",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomIn, { className: "w-4 h-4" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-[1px] h-4 bg-slate-800 mx-1" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleToggleFit,
            title: scaleMode === "fit" ? "切换到原图尺寸 (100%)" : "切换到自适应屏幕",
            className: "px-3 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 text-[11px] font-bold transition-all cursor-pointer",
            children: scaleMode === "fit" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Maximize2, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "100% 原图" })
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Minimize2, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "适应屏幕" })
            ] })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: copyPathToClipboard,
            title: "复制文件路径",
            className: "w-9 h-9 rounded-xl border border-slate-800 hover:bg-slate-900 flex items-center justify-center transition-colors text-slate-400 hover:text-white cursor-pointer",
            children: copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-4 h-4 text-emerald-500" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-4 h-4" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: openLocalFolder,
            title: "在文件夹中显示",
            className: "w-9 h-9 rounded-xl border border-slate-800 hover:bg-slate-900 flex items-center justify-center transition-colors text-slate-400 hover:text-white cursor-pointer",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { className: "w-4 h-4" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-[1px] h-6 bg-slate-800 mx-1" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: onClose,
            className: "w-9 h-9 bg-slate-900 hover:bg-red-500 hover:text-white text-slate-400 rounded-xl flex items-center justify-center transition-all cursor-pointer",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-4 h-4" })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        ref: viewportRef,
        className: "flex-1 w-full overflow-auto flex bg-slate-950/40 p-10 relative select-none",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "m-auto relative flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: asset.fileUrl || asset.thumbnailPath,
            alt: asset.title,
            onLoad: handleImageLoad,
            className: "shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] rounded-lg transition-all duration-75 ease-out select-none border border-slate-800/40",
            style: {
              width: scaleMode === "fit" ? "auto" : `${realWidth * scale}px`,
              height: scaleMode === "fit" ? "auto" : `${realHeight * scale}px`,
              maxWidth: scaleMode === "fit" ? "100%" : "none",
              maxHeight: scaleMode === "fit" ? "calc(100vh - 12rem)" : "none",
              objectFit: "contain"
            }
          }
        ) })
      }
    )
  ] });
}
function AssetCaptionPanel({
  selectedAsset,
  updateAssetCaption,
  resetAssetCaptionEdited,
  generateMockAiSuggestions
}) {
  const [isEditingCaption, setIsEditingCaption] = reactExports.useState(false);
  const [tempCaption, setTempCaption] = reactExports.useState("");
  const [isRegeneratingCaption, setIsRegeneratingCaption] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setIsEditingCaption(false);
  }, [selectedAsset.id]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-slate-100 pt-4 space-y-2.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "w-3.5 h-3.5 text-indigo-500" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "画面描述" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
        selectedAsset.aiCaptionIsUserEdited === 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: async () => {
              await resetAssetCaptionEdited(selectedAsset.id);
            },
            className: "px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold transition-all cursor-pointer",
            title: "恢复为 AI 默认生成的描述",
            children: "恢复AI描述"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: async () => {
              setIsRegeneratingCaption(true);
              try {
                await resetAssetCaptionEdited(selectedAsset.id);
                const result = await generateMockAiSuggestions(selectedAsset.id, ["florence2"]);
                if (!result.success) {
                  console.warn("[AssetCaptionPanel] Real caption/tag worker unavailable:", result.error);
                }
              } catch (e) {
                console.error(e);
              } finally {
                setIsRegeneratingCaption(false);
              }
            },
            disabled: isRegeneratingCaption,
            className: "px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer",
            children: isRegeneratingCaption ? "生成中..." : "重新生成"
          }
        )
      ] })
    ] }),
    isEditingCaption ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          value: tempCaption,
          onChange: (e) => setTempCaption(e.target.value),
          className: "w-full text-[11px] p-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-300 font-sans min-h-[60px]",
          placeholder: "请输入画面描述..."
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 justify-end", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setIsEditingCaption(false),
            className: "px-2.5 py-1 text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer",
            children: "取消"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: async () => {
              await updateAssetCaption(selectedAsset.id, tempCaption);
              setIsEditingCaption(false);
            },
            className: "px-2.5 py-1 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg text-[10.5px] font-bold transition-all shadow-sm cursor-pointer",
            children: "保存"
          }
        )
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-50/50 border border-slate-100 p-3 rounded-2xl space-y-2 relative group/caption", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11.5px] text-slate-600 leading-relaxed font-sans select-text whitespace-pre-wrap", children: selectedAsset.aiCaption || /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-400 italic", children: "暂无画面描述。点击“重新生成”或“编辑”添加描述。" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-1 text-[9.5px] text-slate-400 border-t border-slate-100/50 pt-2 font-sans", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "来源:",
          " ",
          selectedAsset.aiCaptionIsUserEdited === 1 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-amber-600 font-bold", children: "用户已编辑，AI不会自动覆盖" }) : selectedAsset.aiCaptionSource === "ai_florence" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-indigo-600 font-bold", children: "Florence-2" }) : "未知"
        ] }),
        selectedAsset.aiCaptionUpdatedAt && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: new Date(selectedAsset.aiCaptionUpdatedAt).toLocaleString() })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => {
            setTempCaption(selectedAsset.aiCaption || "");
            setIsEditingCaption(true);
          },
          className: "absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-white shadow-sm border border-slate-100 hover:border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all opacity-0 group-hover/caption:opacity-100 cursor-pointer",
          title: "编辑描述",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pen, { className: "w-3 h-3" })
        }
      )
    ] })
  ] });
}
function AssetPromptReversePanel({
  selectedAsset,
  settings,
  activeModelLocal,
  promptReverseLoading,
  promptReverseError,
  handleRunPromptReverse,
  setSelectedAsset
}) {
  const [showEnglishPrompt, setShowEnglishPrompt] = reactExports.useState(true);
  const [copiedPromptField, setCopiedPromptField] = reactExports.useState(null);
  const [ggufModels, setGgufModels] = reactExports.useState([]);
  const [nativeModels, setNativeModels] = reactExports.useState([]);
  const [loadingModels, setLoadingModels] = reactExports.useState(true);
  const [startingServer, setStartingServer] = reactExports.useState(false);
  const [serverError, setServerError] = reactExports.useState(null);
  const [selectedCustomTemplateId, setSelectedCustomTemplateId] = reactExports.useState(settings.promptReverseTemplates?.[0]?.id ?? "");
  const promptBackendMode = settings.promptReverseSettings?.backendMode ?? "llama-openai";
  reactExports.useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const api2 = window.electronAPI;
        if (api2) {
          const [gguf, native] = await Promise.all([
            api2.llamaRuntimeListLocalModels ? api2.llamaRuntimeListLocalModels() : [],
            api2.aiModelList ? api2.aiModelList() : []
          ]);
          if (active) {
            setGgufModels(gguf || []);
            setNativeModels(native || []);
          }
        }
      } catch (e) {
        console.error("Failed to load models list", e);
      } finally {
        if (active) setLoadingModels(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [settings]);
  reactExports.useEffect(() => {
    setCopiedPromptField(null);
  }, [selectedAsset.id]);
  reactExports.useEffect(() => {
    if (!selectedCustomTemplateId && settings.promptReverseTemplates?.[0]?.id) {
      setSelectedCustomTemplateId(settings.promptReverseTemplates[0].id);
    }
  }, [selectedCustomTemplateId, settings.promptReverseTemplates]);
  const dropdownOptions = [
    ...ggufModels.filter((m2) => m2.isDownloaded).map((m2) => ({
      value: `gguf:${m2.id}`,
      label: `${m2.name}`,
      isDownloaded: true,
      model: m2,
      type: "gguf"
    })),
    ...nativeModels.filter((m2) => m2.isDownloaded).map((m2) => ({
      value: `native:${m2.id}`,
      label: `${m2.displayName} (Native)`,
      isDownloaded: true,
      model: m2,
      type: "native"
    }))
  ];
  const activeValue = promptBackendMode === "llama-openai" ? `gguf:${ggufModels.find((m2) => m2.filename === settings.promptReverseSettings?.selectedExternalModel)?.id || ""}` : `native:${settings.selectedPromptModelId || ""}`;
  const selectedOption = dropdownOptions.find((o) => o.value === activeValue) || dropdownOptions[0];
  const buildGgufSettings = (model) => {
    const backends = settings.aiBackends ?? [];
    const llamaBackend = backends.find((backend) => backend.id === "llama-local-openai");
    const nextBackend = {
      ...llamaBackend ?? {
        id: "llama-local-openai",
        name: "Llama 本地量化模型服务",
        type: "llama-openai",
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "local",
        timeoutMs: 12e4,
        priority: 50,
        notes: "适用于 llama.cpp / llama-server 暴露的 OpenAI-compatible API。"
      },
      enabled: true,
      type: "llama-openai",
      defaultModel: model.filename,
      capabilities: {
        ...llamaBackend?.capabilities ?? {},
        chat: true,
        vision: true,
        embeddings: false,
        jsonOutput: true,
        modelList: true,
        modelManagement: false
      }
    };
    const nextBackends = backends.some((backend) => backend.id === nextBackend.id) ? backends.map((backend) => backend.id === nextBackend.id ? nextBackend : backend) : [nextBackend, ...backends];
    return {
      ...settings,
      aiBackends: nextBackends,
      promptReverseSettings: {
        ...settings.promptReverseSettings ?? {
          maxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
          maxImageSize: 1024,
          temperature: 0.6,
          topP: 0.9
        },
        backendMode: "llama-openai",
        selectedExternalBackendId: "llama-local-openai",
        selectedExternalModel: model.filename
      }
    };
  };
  reactExports.useEffect(() => {
    if (loadingModels || promptBackendMode !== "native-qwen3vl") return;
    const preferredGguf = ggufModels.find((model) => model.isDownloaded && model.id === "qwen3-vl-2b-instruct-q4-k-m") ?? ggufModels.find((model) => model.isDownloaded);
    if (!preferredGguf) return;
    const api2 = window.electronAPI;
    if (!api2?.settingsSave) return;
    void api2.settingsSave(buildGgufSettings(preferredGguf)).then(async () => {
      const { loadSettings } = useSettingsStore.getState();
      await loadSettings();
    }).catch((error) => {
      console.error("Failed to switch prompt reverse route to GGUF/Llama", error);
    });
  }, [ggufModels, loadingModels, promptBackendMode]);
  const handleModelChange = async (e) => {
    const val = e.target.value;
    const api2 = window.electronAPI;
    if (!api2) return;
    const option = dropdownOptions.find((o) => o.value === val);
    if (!option) return;
    if (option.type === "gguf") {
      await api2.settingsSave(buildGgufSettings(option.model));
    } else {
      const nextSettings = {
        ...settings,
        selectedPromptModelId: option.model.id,
        promptReverseSettings: {
          ...settings.promptReverseSettings ?? {
            maxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
            maxImageSize: 1024,
            temperature: 0.6,
            topP: 0.9
          },
          backendMode: "native-qwen3vl"
        }
      };
      await api2.settingsSave(nextSettings);
    }
    const { loadSettings } = useSettingsStore.getState();
    await loadSettings();
  };
  const handleRun = async (templateOptions) => {
    setServerError(null);
    const api2 = window.electronAPI;
    if (!api2) return;
    if (!selectedOption) {
      alert("请先选择一个模型！");
      return;
    }
    if (!selectedOption.isDownloaded) {
      alert("请先前往 AI 控制台配置或下载该模型！");
      return;
    }
    if (selectedOption.type === "gguf") {
      try {
        setStartingServer(true);
        await api2.settingsSave(buildGgufSettings(selectedOption.model));
        const { loadSettings } = useSettingsStore.getState();
        await loadSettings();
        const status = await api2.llamaRuntimeGetStatus();
        const targetModelPath = selectedOption.model.modelPath;
        const pathNormalize = (p2) => p2.replace(/\\/g, "/").toLowerCase();
        const isRunningCorrectModel = status.phase === "complete" && status.serverPid && status.modelPath && pathNormalize(status.modelPath) === pathNormalize(targetModelPath);
        if (!isRunningCorrectModel) {
          if (status.serverPid) {
            await api2.llamaRuntimeStopServer();
          }
          const startRes = await api2.llamaRuntimeStartServer({ modelPath: targetModelPath });
          if (startRes.phase !== "complete") {
            throw new Error(startRes.error?.message || "Llama 本地服务启动超时，请确认依赖完整。");
          }
        }
      } catch (err) {
        setServerError(`Llama 本地量化模型启动失败: ${err.message || err}`);
        setStartingServer(false);
        return;
      } finally {
        setStartingServer(false);
      }
    }
    await handleRunPromptReverse(templateOptions);
  };
  const selectedCustomTemplate = settings.promptReverseTemplates?.find((template) => template.id === selectedCustomTemplateId);
  const handleCustomRun = async () => {
    if (!selectedCustomTemplate) {
      alert("请先在 AI 控制台添加自定义反推提示词模板。");
      return;
    }
    await handleRun({
      promptTemplateId: selectedCustomTemplate.id,
      promptTemplateText: selectedCustomTemplate.content
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-slate-100 pt-4 space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "w-3.5 h-3.5 text-brand-500 animate-pulse" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "图片反推" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 bg-slate-50/50 border border-slate-100 p-2.5 rounded-2xl select-none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-[9.5px] font-bold text-slate-400 block uppercase tracking-wide", children: "反推模型选择" }),
      loadingModels ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-slate-400 flex items-center gap-1.5 py-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-3.5 h-3.5 animate-spin" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "正在检测本地模型..." })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        "select",
        {
          value: activeValue,
          onChange: handleModelChange,
          className: "w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-brand-500 cursor-pointer shadow-sm transition-all",
          children: dropdownOptions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "未找到可用模型" }) : dropdownOptions.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: opt.value, children: opt.label }, opt.value))
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 rounded-2xl border border-brand-100 bg-brand-50/40 p-3 dark:border-brand-900/50 dark:bg-brand-950/20", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10.5px] font-extrabold text-brand-700 dark:text-brand-300", children: "自定义反推" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[9.5px] font-semibold text-slate-400", children: "使用 AI 控制台中保存的自定义提示词模板" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4 text-brand-500" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "select",
        {
          value: selectedCustomTemplateId,
          onChange: (event) => setSelectedCustomTemplateId(event.target.value),
          className: "w-full rounded-xl border border-brand-100 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-brand-500 dark:border-brand-900 dark:bg-slate-950 dark:text-slate-200",
          children: settings.promptReverseTemplates?.length ? settings.promptReverseTemplates.map((template) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: template.id, children: template.name }, template.id)) : /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "暂无自定义模板" })
        }
      ),
      selectedCustomTemplate && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-20 overflow-y-auto rounded-xl bg-white/80 p-2 text-[9.5px] font-semibold leading-4 text-slate-500 dark:bg-slate-900 dark:text-slate-400", children: selectedCustomTemplate.content }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: handleCustomRun,
          disabled: !selectedCustomTemplate || promptReverseLoading || startingServer,
          className: "w-full rounded-xl bg-brand-500 px-3 py-2 text-[11px] font-black text-white shadow-sm transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50",
          children: "使用自定义提示词反推"
        }
      )
    ] }),
    (() => {
      const status = selectedAsset.aiPromptStatus || "not_started";
      if (startingServer) {
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl p-4 bg-brand-500/[0.02] border border-brand-500/10 flex flex-col items-center justify-center gap-3 text-center min-h-[140px] animate-pulse", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-6 h-6 animate-spin text-brand-500" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11.5px] font-bold text-brand-700", children: "⚡ 正在启动并加载本地量化引擎..." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[9.5px] text-slate-400 font-medium", children: "首次加载或切换模型需要加载显存，请耐心等待 (约数秒)" })
          ] })
        ] });
      }
      if (promptReverseLoading || status === "running") {
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl p-4 bg-brand-500/[0.02] border border-brand-500/10 flex flex-col items-center justify-center gap-3 text-center min-h-[140px] animate-pulse", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-6 h-6 animate-spin text-brand-500" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11.5px] font-bold text-brand-700", children: "⚡ 正在执行高级图像反推..." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[9.5px] text-slate-400 font-medium", children: "正在分析风格、主体与画面细节 (推理中)" })
          ] })
        ] });
      }
      if (serverError || promptReverseError) {
        const err = serverError ? { message: serverError } : promptReverseError;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl p-4 bg-rose-50 border border-rose-100 flex flex-col gap-2 font-sans select-none", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11.5px] font-extrabold text-rose-700", children: "❌ 反推失败" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-rose-500 leading-relaxed font-semibold", children: err.code === "GPU_MEMORY_INSUFFICIENT" || err.code === "CUDA_OUT_OF_MEMORY" ? "显存不足！请关闭其他占用显卡的程序，或改用 Qwen3-VL-4B/2B 系列模型。" : err.message || "推理运行出错，请确认依赖包与模型文件完整。" }),
          err.stderr && /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "mt-1 group cursor-pointer", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "text-[9px] text-rose-600 font-bold hover:text-rose-800 transition-colors select-none outline-none flex items-center gap-1 cursor-pointer", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "📋 查看完整错误日志 (Terminal Console Log)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[7px] inline-block transform group-open:rotate-90 transition-transform", children: "▶" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "mt-1.5 p-2 bg-slate-900 border border-slate-800 text-[8.5px] text-rose-400 font-mono rounded-lg max-h-[140px] overflow-auto select-text whitespace-pre-wrap leading-normal cursor-text", children: err.stderr })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => handleRun(),
              className: "mt-1 w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-sm",
              children: "重试反推"
            }
          )
        ] });
      }
      if (selectedAsset.aiPrompt) {
        let promptData = {};
        try {
          promptData = JSON.parse(selectedAsset.aiPrompt);
        } catch (e) {
          promptData = { englishPrompt: selectedAsset.aiPrompt, chineseDescription: "原始非结构化反推结果。" };
        }
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 font-sans animate-in fade-in duration-300 flex flex-col", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end mb-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-full border border-slate-200/50 w-fit select-none", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => setShowEnglishPrompt(true),
                className: `px-3 py-1 text-[9px] font-extrabold rounded-full transition-all cursor-pointer ${showEnglishPrompt ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-500"}`,
                children: "显示英文提示词"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => setShowEnglishPrompt(false),
                className: `px-3 py-1 text-[9px] font-extrabold rounded-full transition-all cursor-pointer ${!showEnglishPrompt ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-500"}`,
                children: "仅中文解析"
              }
            )
          ] }) }),
          showEnglishPrompt && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 mb-2 animate-in slide-in-from-top-1 duration-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9.5px] font-bold text-slate-400 uppercase tracking-wide", children: "英文 Prompt (SD / Midjourney)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => {
                    navigator.clipboard.writeText(promptData.englishPrompt || "");
                    setCopiedPromptField("prompt");
                    setTimeout(() => setCopiedPromptField(null), 2e3);
                  },
                  className: "px-2 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1",
                  children: [
                    copiedPromptField === "prompt" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-2.5 h-2.5 text-emerald-500" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-2.5 h-2.5" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: copiedPromptField === "prompt" ? "已复制" : "复制 Prompt" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-50/70 border border-slate-100 p-3 rounded-2xl text-[11px] text-slate-600 leading-relaxed font-sans select-text break-all max-h-36 overflow-y-auto scrollbar-thin shadow-sm", children: promptData.englishPrompt })
          ] }),
          promptData.chineseDescription && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9.5px] font-bold text-slate-400 uppercase tracking-wide", children: "中文画面解析描述" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-50/70 border border-slate-100 p-3 rounded-2xl text-[11px] text-slate-600 leading-relaxed font-sans select-text shadow-sm", children: promptData.chineseDescription })
          ] }),
          promptData.negativePromptSuggestion && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9.5px] font-bold text-slate-400 uppercase tracking-wide", children: "负面词建议 (Negative Prompt)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => {
                    navigator.clipboard.writeText(promptData.negativePromptSuggestion || "");
                    setCopiedPromptField("negative");
                    setTimeout(() => setCopiedPromptField(null), 2e3);
                  },
                  className: "px-2 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded text-[9.5px] font-bold transition-all cursor-pointer",
                  children: copiedPromptField === "negative" ? "已复制" : "复制"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-50/70 border border-slate-100 p-2.5 rounded-xl text-[10.5px] text-slate-500 leading-relaxed font-mono select-text shadow-sm", children: promptData.negativePromptSuggestion })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 border-t border-slate-100/50 pt-2 text-[10.5px] leading-relaxed", children: [
            Array.isArray(promptData.styleTags) && promptData.styleTags.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-400 font-bold mr-1", children: "风格词:" }),
              promptData.styleTags.map((t2, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-[9px]", children: t2 }, i))
            ] }),
            Array.isArray(promptData.colorTags) && promptData.colorTags.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-400 font-bold mr-1", children: "色彩词:" }),
              promptData.colorTags.map((t2, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold text-[9px]", children: t2 }, i))
            ] }),
            Array.isArray(promptData.subjectTags) && promptData.subjectTags.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-400 font-bold mr-1", children: "主体词:" }),
              promptData.subjectTags.map((t2, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-600 font-bold text-[9px]", children: t2 }, i))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-[9px] text-slate-400 pt-1.5 border-t border-slate-50 select-none", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              "模型: ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-brand-500 font-bold", children: selectedOption?.model?.name || selectedOption?.model?.displayName || "未知" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => handleRun(),
                className: "px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg font-bold transition-all cursor-pointer shadow-sm",
                children: "重新反推"
              }
            )
          ] })
        ] });
      }
      if (selectedOption?.isDownloaded) {
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-50/50 border border-dashed border-slate-200 p-4 text-center rounded-2xl space-y-2.5 font-sans select-none", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-slate-400 font-semibold leading-relaxed", children: [
            "已就绪！当前高级反推激活模型为 ",
            selectedOption.model.name || selectedOption.model.displayName,
            "。"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => handleRun(),
              className: "w-full py-2 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white rounded-xl shadow-sm hover:shadow text-[11.5px] font-bold transition-premium flex items-center justify-center gap-1.5 cursor-pointer shrink-0",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "w-3.5 h-3.5 stroke-[2.5]" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "🚀 开始图片反推" })
              ]
            }
          )
        ] });
      }
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-50/50 border border-dashed border-slate-200 p-4 text-center rounded-2xl space-y-2.5 font-sans select-none", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-slate-400 font-semibold leading-relaxed", children: [
          "请先前往 AI 控制台配置或下载高级反推模型 ",
          selectedOption?.model?.name || selectedOption?.model?.displayName || "",
          "。"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => {
              setSelectedAsset(null);
              window.location.hash = "#/ai-console";
            },
            className: "w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[11px] font-bold transition-premium flex items-center justify-center gap-1.5 cursor-pointer shrink-0",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Settings$1, { className: "w-3.5 h-3.5 text-slate-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "前往 AI 控制台配置" })
            ]
          }
        )
      ] });
    })()
  ] });
}
function AssetDeleteButton({
  assetId,
  deleteAsset
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      onClick: () => deleteAsset(assetId),
      className: "w-full mt-6 py-2 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-500 border border-slate-100 hover:border-rose-100 text-slate-400 font-bold text-[12px] transition-premium flex items-center justify-center gap-1.5 cursor-pointer shrink-0",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3.5 h-3.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "移出素材库" })
      ]
    }
  );
}
function AssetInspectorDrawer({
  selectedAsset,
  assetRelations,
  settings,
  activeModelLocal,
  promptReverseLoading,
  promptReverseError,
  setSelectedAsset,
  handleRunPromptReverse,
  updateAssetCaption,
  resetAssetCaptionEdited,
  generateMockAiSuggestions,
  generateDeepAnalysis,
  confirmAiTag,
  rejectAiTag,
  deleteAsset
}) {
  const [isViewModalOpen, setIsViewModalOpen] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-80 border border-slate-200 rounded-2xl bg-white shadow-premium flex flex-col h-full shrink-0 overflow-hidden animate-in slide-in-from-right duration-300 relative select-none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => setSelectedAsset(null),
        className: "absolute top-4 right-4 z-10 w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-4 h-4" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 border-b border-slate-100 p-6 pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[14px] font-bold text-slate-800 pr-8", children: "素材详细分析" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "scrollbar-none min-h-0 flex-1 overflow-y-auto px-6 pb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 relative group/view", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: selectedAsset.fileUrl || selectedAsset.thumbnailPath,
            alt: selectedAsset.title,
            className: "w-full h-auto object-cover max-h-48"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setIsViewModalOpen(true),
            className: "absolute inset-0 bg-slate-900/40 opacity-0 group-hover/view:opacity-100 transition-premium flex items-center justify-center text-white text-[12px] font-bold gap-1 cursor-pointer w-full border-none outline-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Maximize2, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "查看大图" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 space-y-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10.5px] font-bold text-slate-400 uppercase tracking-wide", children: "资源名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[13px] font-bold text-slate-700 leading-snug", children: selectedAsset.title })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3.5 text-[11.5px] border-t border-slate-50 pt-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-400 font-semibold flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "w-3.5 h-3.5 text-slate-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "来源网站:" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-700 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100", children: selectedAsset.sourceSiteName })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-400 font-semibold flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Maximize2, { className: "w-3.5 h-3.5 text-slate-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "图片规格:" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-700 font-bold", children: [
              selectedAsset.width,
              " x ",
              selectedAsset.height,
              " (",
              selectedAsset.fileType,
              ")"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-400 font-semibold flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "w-3.5 h-3.5 text-slate-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "文件大小:" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-700 font-bold", children: [
              (selectedAsset.fileSize / 1024 / 1024).toFixed(2),
              " MB"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-400 font-semibold flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-3.5 h-3.5 text-slate-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "下载日期:" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-700 font-bold", children: new Date(selectedAsset.createdAt).toLocaleDateString() })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 border-t border-slate-50 pt-4 text-[11.5px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-400 font-semibold flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { className: "w-3.5 h-3.5 text-slate-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "本地存储目录:" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "text-[10px] bg-slate-50 border border-slate-100 p-2 rounded-lg text-slate-500 font-mono select-text break-all", children: selectedAsset.filePath })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-400 font-semibold flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "w-3.5 h-3.5 text-slate-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "原始来源 URL:" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "a",
              {
                href: selectedAsset.sourcePageUrl,
                target: "_blank",
                rel: "noreferrer",
                className: "text-[10px] bg-slate-50 border border-slate-100 p-2 rounded-lg text-brand-500 font-mono hover:underline flex items-center justify-between gap-1 break-all",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: selectedAsset.sourcePageUrl }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "w-3 h-3 shrink-0" })
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-slate-50 pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AssetTagPanel, { assetId: selectedAsset.id }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-slate-100 pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ColorPalettePanel, { asset: selectedAsset }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AssetCaptionPanel,
          {
            selectedAsset,
            updateAssetCaption,
            resetAssetCaptionEdited,
            generateMockAiSuggestions
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-slate-50 pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TagSuggestionPanel, { assetId: selectedAsset.id }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        AssetPromptReversePanel,
        {
          selectedAsset,
          settings,
          activeModelLocal,
          promptReverseLoading,
          promptReverseError,
          handleRunPromptReverse,
          setSelectedAsset
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        AssetDeleteButton,
        {
          assetId: selectedAsset.id,
          deleteAsset
        }
      )
    ] }),
    isViewModalOpen && reactDomExports.createPortal(
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        AssetOriginalViewerModal,
        {
          asset: selectedAsset,
          onClose: () => setIsViewModalOpen(false)
        }
      ),
      document.body
    )
  ] });
}
function BulkActionDock({
  bulkSelectedAssetIds,
  setBulkActionType,
  handleBulkConfirmAi,
  clearBulkSelectedAssetIds
}) {
  if (bulkSelectedAssetIds.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur text-white px-6 py-4 rounded-2xl shadow-premium border border-slate-800 flex items-center gap-6 animate-in slide-in-from-bottom duration-300 z-40 text-[12.5px] font-sans", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-5.5 h-5.5 rounded-full bg-brand-500 flex items-center justify-center font-bold text-[11px] text-white", children: bulkSelectedAssetIds.length }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-200", children: "个素材已被选中" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 w-px bg-slate-800" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setBulkActionType("add"),
          className: "px-4 py-2 bg-brand-500 hover:bg-brand-600 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 text-[11.5px]",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-3.5 h-3.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "批量打标签" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setBulkActionType("remove"),
          className: "px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 text-[11.5px]",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3.5 h-3.5 text-slate-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "批量删标签" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: handleBulkConfirmAi,
          className: "px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 text-[11.5px]",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-3.5 h-3.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "批量确认 AI" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 w-px bg-slate-800" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: clearBulkSelectedAssetIds,
        className: "px-3 py-2 text-slate-400 hover:text-white font-bold transition-colors cursor-pointer text-[11.5px]",
        children: "取消选择"
      }
    )
  ] });
}
function TagSelector({
  selectedTagIds,
  onToggleTag,
  onClose,
  title = "选择标签"
}) {
  const tags = useAssetStore((s) => s.tags);
  const [search, setSearch] = reactExports.useState("");
  const categoryNames = {
    style: "风格 (Style)",
    color: "色彩 (Color)",
    usage: "用途 (Usage)",
    layout: "版式 (Layout)",
    scene: "场景 (Scene)",
    source: "来源 (Source)",
    ai: "AI 智能打标",
    custom: "用户自定义 (Custom)"
  };
  const filteredTags = tags.filter(
    (t2) => t2.name.toLowerCase().includes(search.toLowerCase()) || t2.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase()))
  );
  const groupedTags = {};
  for (const tag of filteredTags) {
    if (!groupedTags[tag.type]) {
      groupedTags[tag.type] = [];
    }
    groupedTags[tag.type].push(tag);
  }
  const categoryOrder = ["style", "color", "usage", "layout", "scene", "source", "ai", "custom"];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full flex flex-col h-96 bg-white rounded-2xl border border-slate-100 shadow-premium overflow-hidden font-sans", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[13px] font-bold text-slate-800 flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tag, { className: "w-4 h-4 text-brand-500" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: title })
      ] }),
      onClose && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onClose,
          className: "w-6 h-6 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-3.5 h-3.5" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 bg-slate-50/50 border-b border-slate-50 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search$1, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          placeholder: "搜索标签或别名...",
          value: search,
          onChange: (e) => setSearch(e.target.value),
          className: "w-full pl-9 pr-4 py-1.5 text-[11px] font-semibold bg-white rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-4", children: [
      categoryOrder.map((catKey) => {
        const catTags = groupedTags[catKey] || [];
        if (catTags.length === 0) return null;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h5", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1", children: categoryNames[catKey] || catKey }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5", children: catTags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: () => onToggleTag(tag.id),
                className: `inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-semibold transition-all border ${isSelected ? "bg-brand-50 text-brand-700 border-brand-300 shadow-sm font-bold scale-[1.01]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`,
                children: [
                  isSelected && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-3 h-3 text-brand-600 stroke-[2.5]" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: tag.name }),
                  tag.usageCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[8.5px] px-1 rounded font-bold ${isSelected ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-400"}`, children: tag.usageCount })
                ]
              },
              tag.id
            );
          }) })
        ] }, catKey);
      }),
      filteredTags.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-16 text-center text-slate-400 text-[11px] font-medium", children: "没有匹配的标签，您可以尝试在详情面板中直接创建。" })
    ] })
  ] });
}
function BulkActionModal({
  bulkActionType,
  bulkActionTags,
  setBulkActionTags,
  setBulkActionType,
  executeBulkAction
}) {
  if (!bulkActionType) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-[450px] animate-in zoom-in-95 duration-200 bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      TagSelector,
      {
        title: bulkActionType === "add" ? "批量添加标签关联" : "批量移除标签关联",
        selectedTagIds: bulkActionTags,
        onToggleTag: (tagId) => {
          setBulkActionTags(
            (prev) => prev.includes(tagId) ? prev.filter((x2) => x2 !== tagId) : [...prev, tagId]
          );
        },
        onClose: () => {
          setBulkActionType(null);
          setBulkActionTags([]);
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-slate-50/50 px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => {
            setBulkActionType(null);
            setBulkActionTags([]);
          },
          className: "px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-[11px] transition-colors cursor-pointer",
          children: "取消"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: executeBulkAction,
          disabled: bulkActionTags.length === 0,
          className: "px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-[11px] shadow-sm disabled:opacity-50 transition-premium cursor-pointer",
          children: [
            "确认执行批量修改 (",
            bulkActionTags.length,
            " 个标签)"
          ]
        }
      )
    ] })
  ] }) });
}
const LIBRARY_TAG_GROUP_TITLES = {
  style: "风格",
  color: "色彩",
  usage: "用途",
  layout: "版式",
  scene: "场景",
  source: "来源",
  custom: "自定义"
};
function useActivePromptModel(settings) {
  const [activeModel, setActiveModel] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const refreshActiveModel = reactExports.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api2 = window.electronAPI;
      if (api2 && api2.aiModelList) {
        const list = await api2.aiModelList();
        const activeId = settings.selectedPromptModelId || "qwen3-vl-8b-instruct";
        const matched = list.find((m2) => m2.id === activeId);
        setActiveModel(matched || null);
      }
    } catch (e) {
      console.error(e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [settings.selectedPromptModelId]);
  reactExports.useEffect(() => {
    refreshActiveModel();
  }, [refreshActiveModel]);
  return {
    activeModel,
    refreshActiveModel,
    loading,
    error
  };
}
function usePromptReverse(selectedAssetId) {
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const clearError = reactExports.useCallback(() => {
    setError(null);
  }, []);
  const run = reactExports.useCallback(async (assetId, modelId, localPath, options) => {
    setLoading(true);
    setError(null);
    try {
      const { runPromptReverse } = useAssetStore.getState();
      const res = await runPromptReverse(assetId, modelId, localPath || "", options);
      if (!res.success && res.error) {
        setError(res.error);
        return res;
      }
      return res;
    } catch (err) {
      const wrappedError = { code: "EXCEPTION", message: String(err) };
      setError(wrappedError);
      return { success: false, error: wrappedError };
    } finally {
      setLoading(false);
    }
  }, []);
  reactExports.useEffect(() => {
    setError(null);
  }, [selectedAssetId]);
  return {
    run,
    loading,
    error,
    clearError
  };
}
function Library() {
  const {
    assets,
    tags,
    selectedAsset,
    searchQuery,
    filterSite,
    activeTagSearchQueries,
    bulkSelectedAssetIds,
    setSelectedAsset,
    setSearchQuery,
    setFilterSite,
    addActiveTagSearchQuery,
    removeActiveTagSearchQuery,
    clearActiveTagSearchQueries,
    toggleBulkSelectedAssetId,
    clearBulkSelectedAssetIds,
    batchAddTagsToAssets,
    batchRemoveTagsFromAssets,
    confirmAiTag,
    rejectAiTag,
    deleteAsset,
    loadAssets,
    loadTags,
    filterTag,
    setFilterTag,
    includePending,
    setIncludePending,
    assetRelations,
    updateAssetCaption,
    resetAssetCaptionEdited,
    generateMockAiSuggestions,
    generateDeepAnalysis
  } = useAssetStore();
  const [showFilterPanel, setShowFilterPanel] = reactExports.useState(false);
  const [bulkActionType, setBulkActionType] = reactExports.useState(null);
  const [bulkActionTags, setBulkActionTags] = reactExports.useState([]);
  const [isEditingCaption, setIsEditingCaption] = reactExports.useState(false);
  const [tempCaption, setTempCaption] = reactExports.useState("");
  const [copiedOcr, setCopiedOcr] = reactExports.useState(false);
  const { settings, loadSettings } = useSettingsStore();
  const {
    activeModel: activeModelLocal
  } = useActivePromptModel(settings);
  const {
    run: runPromptReverseAction,
    loading: promptReverseLoading,
    error: promptReverseError
  } = usePromptReverse(selectedAsset?.id);
  const handleRunPromptReverse = async (options) => {
    if (!selectedAsset) return;
    const latestSettings = useSettingsStore.getState().settings;
    const backendMode = latestSettings.promptReverseSettings?.backendMode ?? "llama-openai";
    if (backendMode === "native-qwen3vl") {
      if (!activeModelLocal) return;
      await runPromptReverseAction(selectedAsset.id, activeModelLocal.id, activeModelLocal.localPath, options);
      return;
    }
    await runPromptReverseAction(
      selectedAsset.id,
      latestSettings.promptReverseSettings?.selectedExternalModel || latestSettings.promptReverseSettings?.selectedExternalBackendId || backendMode,
      "",
      options
    );
  };
  reactExports.useEffect(() => {
    setIsEditingCaption(false);
    setCopiedOcr(false);
  }, [selectedAsset?.id]);
  reactExports.useEffect(() => {
    loadAssets();
    loadTags();
    loadSettings();
  }, []);
  const filteredAssets = assets.filter((asset) => {
    const matchSearch = searchQuery ? asset.title.toLowerCase().includes(searchQuery.toLowerCase()) || asset.tags.some((t2) => t2.toLowerCase().includes(searchQuery.toLowerCase())) : true;
    const matchSite = filterSite ? asset.sourceSiteId === filterSite : true;
    return matchSearch && matchSite;
  });
  const uniqueSites = Array.from(
    new Map(assets.map((item) => [item.sourceSiteId, item.sourceSiteName])).entries()
  );
  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterSite("");
    clearActiveTagSearchQueries();
  };
  const executeBulkAction = async () => {
    if (bulkActionTags.length === 0) return;
    try {
      if (bulkActionType === "add") {
        await batchAddTagsToAssets(bulkSelectedAssetIds, bulkActionTags, {
          source: "manual",
          status: "confirmed"
        });
      } else if (bulkActionType === "remove") {
        await batchRemoveTagsFromAssets(bulkSelectedAssetIds, bulkActionTags);
      }
      setBulkActionType(null);
      setBulkActionTags([]);
      clearBulkSelectedAssetIds();
    } catch (e) {
      alert(`批量操作失败: ${e}`);
    }
  };
  const handleBulkConfirmAi = async () => {
    const api2 = window.electronAPI;
    if (!api2) return;
    try {
      for (const assetId of bulkSelectedAssetIds) {
        const res = await api2.assetTagListByAsset(assetId);
        if (res.success) {
          const pending = res.relations.filter((r2) => r2.status === "pending");
          for (const rel of pending) {
            await api2.assetTagConfirmAi(rel.id);
          }
        }
      }
      await loadAssets();
      clearBulkSelectedAssetIds();
      alert("批量采纳 AI 标签建议成功");
    } catch (e) {
      alert(`批量采纳失败: ${e}`);
    }
  };
  const groupedSidebarTags = {};
  for (const tag of tags) {
    if (tag.usageCount > 0) {
      if (!groupedSidebarTags[tag.type]) {
        groupedSidebarTags[tag.type] = [];
      }
      groupedSidebarTags[tag.type].push(tag);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex h-full relative overflow-hidden select-none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      LibrarySidebar,
      {
        selectedAsset,
        assetsCount: assets.length,
        activeTagSearchQueries,
        groupedSidebarTags,
        groupTitles: LIBRARY_TAG_GROUP_TITLES,
        clearActiveTagSearchQueries,
        addActiveTagSearchQuery,
        removeActiveTagSearchQuery
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `scrollbar-none flex-1 flex flex-col space-y-4 h-full overflow-y-auto pr-1 ${selectedAsset ? "mr-[344px]" : ""}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `fixed top-[2.5vh] z-30 ${selectedAsset ? "left-[2.75rem] right-[23.5rem]" : "left-[18.25rem] right-8"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        LibraryToolbar,
        {
          searchQuery,
          setSearchQuery,
          showFilterPanel,
          setShowFilterPanel,
          filterSite,
          setFilterSite,
          filterTag,
          setFilterTag,
          includePending,
          setIncludePending,
          uniqueSites,
          tags,
          activeTagSearchQueries,
          handleClearFilters
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: showFilterPanel ? "pt-36" : "pt-20", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        AssetWaterfallGrid,
        {
          filteredAssets,
          selectedAsset,
          bulkSelectedAssetIds,
          setSelectedAsset,
          toggleBulkSelectedAssetId
        }
      ) })
    ] }),
    selectedAsset && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed right-8 top-[2.5vh] z-40 h-[95vh] max-h-[95vh] shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      AssetInspectorDrawer,
      {
        selectedAsset,
        assetRelations,
        settings,
        activeModelLocal,
        promptReverseLoading,
        promptReverseError,
        setSelectedAsset,
        handleRunPromptReverse,
        updateAssetCaption,
        resetAssetCaptionEdited,
        generateMockAiSuggestions,
        generateDeepAnalysis,
        confirmAiTag,
        rejectAiTag,
        deleteAsset
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      BulkActionDock,
      {
        bulkSelectedAssetIds,
        setBulkActionType,
        handleBulkConfirmAi,
        clearBulkSelectedAssetIds
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      BulkActionModal,
      {
        bulkActionType,
        bulkActionTags,
        setBulkActionTags,
        setBulkActionType,
        executeBulkAction
      }
    )
  ] });
}
const MANAGED_PATH_KEYS = [
  "userDataDir",
  "configDir",
  "logsDir",
  "debugDir",
  "cacheDir",
  "tempDir",
  "runtimeDir",
  "modelsDir",
  "databaseDir"
];
const STATUS_STYLE$1 = {
  ok: "border-emerald-100 bg-emerald-50 text-emerald-700",
  warning: "border-amber-100 bg-amber-50 text-amber-700",
  error: "border-rose-100 bg-rose-50 text-rose-700",
  skipped: "border-slate-200 bg-slate-50 text-slate-500",
  unknown: "border-slate-200 bg-slate-50 text-slate-500"
};
function PathGovernanceSummary({ report }) {
  const summary = reactExports.useMemo(() => buildSummary(report), [report]);
  if (!report) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-slate-100 bg-slate-50/70 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-[12px] font-black text-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FolderTree, { className: "h-4 w-4 text-slate-400" }),
        "Path governance"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[10.5px] font-semibold leading-5 text-slate-400", children: "No Doctor report has been loaded yet." })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-slate-100 bg-slate-50/70 p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-[12px] font-black text-slate-800", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FolderTree, { className: "h-4 w-4 text-brand-500" }),
          "Path governance"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[10.5px] font-semibold leading-5 text-slate-400", children: "Read-only managed path summary from the latest Doctor report." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${STATUS_STYLE$1[summary.status]}`, children: summary.status })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 grid grid-cols-1 gap-2", children: summary.paths.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(PathRow, { item }, item.key)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid grid-cols-1 gap-2 md:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SummaryBox,
        {
          icon: TriangleAlert,
          label: "Warnings",
          items: summary.warnings,
          empty: "No path warnings reported."
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SummaryBox,
        {
          icon: ShieldAlert,
          label: "Permission probes",
          items: summary.permissions,
          empty: "No permission probe warnings reported."
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "mt-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "cursor-pointer select-none text-[10px] font-black text-slate-400 transition-colors hover:text-slate-600", children: "Details" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 space-y-2 text-[10px] font-semibold leading-5 text-slate-500", children: summary.details.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-slate-200 bg-white px-3 py-2", children: item }, item)) })
    ] })
  ] });
}
function PathRow({ item }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-black text-slate-500", children: item.key }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[10px] font-semibold text-slate-500", title: maskPath(item.path), children: maskPath(item.path) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `rounded-full border px-2 py-0.5 text-[9px] font-black ${STATUS_STYLE$1[item.status ?? "unknown"]}`, children: item.status ?? "unknown" })
  ] });
}
function SummaryBox({
  icon: Icon2,
  label,
  items,
  empty
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 rounded-xl border border-slate-200 bg-white p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-[10px] font-black uppercase text-slate-500", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { className: "h-3.5 w-3.5" }),
      label
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 space-y-1", children: (items.length > 0 ? items : [empty]).slice(0, 5).map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-semibold leading-5 text-slate-500", children: item }, item)) })
  ] });
}
function buildSummary(report) {
  const pathCheck = report?.checks.find((check) => check.id === "path") ?? null;
  const permissionCheck = report?.checks.find((check) => check.id === "permission") ?? null;
  const paths = collectPaths(pathCheck, permissionCheck);
  const warnings = collectAuditItems(pathCheck);
  const permissions = collectPermissionItems(permissionCheck);
  const status = resolveSummaryStatus(pathCheck, permissionCheck, warnings, permissions);
  return {
    status,
    paths,
    warnings,
    permissions,
    details: [
      `${paths.length} managed path entries summarized.`,
      `${warnings.length} path warnings or blocking issues reported.`,
      `${permissions.length} permission probe warnings reported.`
    ]
  };
}
function collectPaths(pathCheck, permissionCheck) {
  const details = pathCheck?.details ?? {};
  const rawPaths = asRecord(details.paths);
  const logPaths = asRecord(details.logPaths);
  const cacheTempPaths = asRecord(details.cacheTempPaths);
  const auditByKey = /* @__PURE__ */ new Map();
  const checkedPaths = asArray(asRecord(details.audit).checkedPaths);
  for (const item of checkedPaths) {
    const record = asRecord(item);
    const key = String(record.key ?? "");
    if (!key) continue;
    auditByKey.set(key, {
      key,
      path: stringValue(record.path),
      status: statusValue(record.status),
      warningCount: asArray(record.warnings).length,
      issueCount: asArray(record.blockingIssues).length
    });
  }
  const permissionByLabel = /* @__PURE__ */ new Map();
  const permissionDetails = permissionCheck?.details ?? {};
  for (const groupKey of ["paths", "logPaths", "cacheTempPaths"]) {
    for (const item of asArray(asRecord(permissionDetails)[groupKey])) {
      const record = asRecord(item);
      const label = String(record.label ?? "");
      if (label) permissionByLabel.set(label, record.writable === true);
    }
  }
  return MANAGED_PATH_KEYS.map((key) => {
    const pathRecord = asRecord(rawPaths[key]);
    const logRecord = asRecord(logPaths[key]);
    const cacheRecord = asRecord(cacheTempPaths[key]);
    const auditRecord = auditByKey.get(key);
    const pathValue = stringValue(pathRecord.path) ?? stringValue(logRecord.path) ?? stringValue(cacheRecord.path) ?? auditRecord?.path;
    const warningCount = auditRecord?.warningCount ?? 0;
    const issueCount = auditRecord?.issueCount ?? 0;
    return {
      key,
      path: pathValue,
      exists: booleanValue(pathRecord.exists),
      isDirectory: booleanValue(pathRecord.isDirectory),
      writable: permissionByLabel.get(key),
      warningCount,
      issueCount,
      status: statusForPath(pathCheck?.status, permissionByLabel.get(key), warningCount, issueCount)
    };
  });
}
function collectAuditItems(pathCheck) {
  const audit = asRecord(pathCheck?.details?.audit);
  return [...asStringArray(audit.blockingIssues), ...asStringArray(audit.warnings)].map(maskPath);
}
function collectPermissionItems(permissionCheck) {
  const details = permissionCheck?.details ?? {};
  const items = [];
  for (const groupKey of ["paths", "logPaths", "cacheTempPaths"]) {
    for (const item of asArray(asRecord(details)[groupKey])) {
      const record = asRecord(item);
      if (record.writable === false) {
        items.push(`${String(record.label ?? "path")}: ${String(record.error ?? "not writable")}`);
      }
    }
  }
  return items.map(maskPath);
}
function resolveSummaryStatus(pathCheck, permissionCheck, warnings, permissions) {
  if (pathCheck?.status === "error" || permissionCheck?.status === "error") return "error";
  if (warnings.length > 0 || permissions.length > 0 || pathCheck?.status === "warning" || permissionCheck?.status === "warning") return "warning";
  if (pathCheck || permissionCheck) return "ok";
  return "unknown";
}
function statusForPath(pathStatus, writable, warningCount, issueCount) {
  if (issueCount > 0) return "error";
  if (warningCount > 0 || writable === false || pathStatus === "warning") return "warning";
  if (writable === true || pathStatus === "ok") return "ok";
  return "unknown";
}
function maskPath(value) {
  if (!value) return "unknown";
  const normalized = value.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 2) return normalized;
  return `.../${parts.slice(-2).join("/")}`;
}
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function asStringArray(value) {
  return asArray(value).map((item) => String(item));
}
function stringValue(value) {
  return typeof value === "string" ? value : void 0;
}
function booleanValue(value) {
  return typeof value === "boolean" ? value : void 0;
}
function statusValue(value) {
  return value === "ok" || value === "warning" || value === "error" || value === "skipped" ? value : "unknown";
}
const CHECK_ORDER = ["system", "path", "node", "python", "port", "native-deps", "ai-worker", "permission"];
const INFO_LABELS$1 = {
  platform: "系统",
  arch: "架构",
  profile: "运行配置",
  overall: "总体状态",
  generatedAt: "生成时间",
  lastRunAt: "最近体检"
};
const CHECK_LABELS = {
  system: "系统平台",
  path: "路径治理",
  node: "Node 环境",
  python: "Python 环境",
  port: "端口占用",
  "native-deps": "原生依赖",
  "ai-worker": "AI Worker 服务",
  permission: "读写权限"
};
const STATUS_LABELS$2 = {
  idle: "未检测",
  loading: "检测中",
  ok: "正常",
  warning: "提醒",
  error: "错误",
  skipped: "跳过"
};
const STATUS_STYLES$1 = {
  idle: "border-slate-200 bg-slate-50 text-slate-500",
  loading: "border-brand-100 bg-brand-50 text-brand-600",
  ok: "border-emerald-100 bg-emerald-50 text-emerald-700",
  warning: "border-amber-100 bg-amber-50 text-amber-700",
  error: "border-rose-100 bg-rose-50 text-rose-700",
  skipped: "border-slate-200 bg-slate-50 text-slate-500"
};
function getDoctorApi() {
  const electronAPI = window.electronAPI;
  return electronAPI?.doctor ?? null;
}
function formatDate$1(value) {
  if (!value) return "无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
function stringifyDetails(details) {
  if (!details) return "无";
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}
function statusIcon$1(status) {
  if (status === "loading") return /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" });
  if (status === "ok") return /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4" });
  if (status === "warning" || status === "error") return /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-4 w-4" });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "h-4 w-4" });
}
function DoctorPanel() {
  const [report, setReport] = reactExports.useState(null);
  const [knownChecks, setKnownChecks] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [busyCheckId, setBusyCheckId] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [repairMessage, setRepairMessage] = reactExports.useState(null);
  const overallStatus = loading ? "loading" : report?.overallStatus ?? "idle";
  const lastRunAt = report?.generatedAt ?? null;
  const orderedChecks = reactExports.useMemo(() => {
    const resultById = new Map(report?.checks.map((check) => [check.id, check]) ?? []);
    const labelById = new Map(knownChecks.map((check) => [check.id, check.label]));
    const ids = /* @__PURE__ */ new Set([...CHECK_ORDER, ...knownChecks.map((check) => check.id), ...resultById.keys()]);
    return Array.from(ids).map((id2) => ({
      id: id2,
      label: resultById.get(id2)?.label ?? labelById.get(id2) ?? id2,
      result: resultById.get(id2) ?? null
    }));
  }, [knownChecks, report]);
  const loadLastReport = async () => {
    const api2 = getDoctorApi();
    if (!api2) {
      setError("当前运行环境未暴露 Doctor API。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [lastReportResponse, checksResponse] = await Promise.all([api2.getLastReport(), api2.listChecks()]);
      if (!lastReportResponse.success) throw new Error(lastReportResponse.error || "读取上次体检结果失败。");
      if (!checksResponse.success) throw new Error(checksResponse.error || "读取体检项列表失败。");
      setReport(lastReportResponse.report ?? null);
      setKnownChecks(checksResponse.checks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };
  reactExports.useEffect(() => {
    void loadLastReport();
  }, []);
  const handleRunDoctor = async () => {
    const api2 = getDoctorApi();
    if (!api2) {
      setError("当前运行环境未暴露 Doctor API。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api2.runAll();
      if (!response.success || !response.report) throw new Error(response.error || "体检运行失败。");
      setReport(response.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };
  const handleClear = async () => {
    const api2 = getDoctorApi();
    if (!api2) {
      setError("当前运行环境未暴露 Doctor API。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api2.clearLastReport();
      if (!response.success) throw new Error(response.error || "清除体检结果失败。");
      setReport(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };
  const handleRunSingleCheck = async (checkId) => {
    const api2 = getDoctorApi();
    if (!api2?.runCheck) {
      setError("当前运行环境未暴露单项体检接口。");
      return;
    }
    setBusyCheckId(checkId);
    setError(null);
    try {
      const response = await api2.runCheck(checkId);
      if (!response.success || !response.check) throw new Error(response.error || "单项体检失败。");
      upsertCheckResult(response.check);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyCheckId(null);
    }
  };
  const handleRepair = async (check) => {
    const api2 = getDoctorApi();
    if (!api2?.repairCheck) {
      setError("当前运行环境未暴露一键修复接口。");
      return;
    }
    setBusyCheckId(check.id);
    setRepairMessage(null);
    setError(null);
    try {
      const response = await api2.repairCheck(check.id);
      if (!response.success || !response.check) throw new Error(response.error || "一键修复失败。");
      upsertCheckResult(response.check);
      setRepairMessage(response.repair?.message ?? "已完成软件内修复并重新检测。");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyCheckId(null);
    }
  };
  const upsertCheckResult = (nextCheck) => {
    setReport((current) => {
      if (!current) {
        return {
          id: `doctor-single-${Date.now()}`,
          generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          platform: "unknown",
          arch: "unknown",
          profile: "unknown",
          overallStatus: nextCheck.status === "error" ? "error" : nextCheck.status === "warning" ? "warning" : "ok",
          checks: [nextCheck]
        };
      }
      const nextChecks = current.checks.some((check) => check.id === nextCheck.id) ? current.checks.map((check) => check.id === nextCheck.id ? nextCheck : check) : [...current.checks, nextCheck];
      const overallStatus2 = nextChecks.some((check) => check.status === "error") ? "error" : nextChecks.some((check) => check.status === "warning") ? "warning" : "ok";
      return { ...current, generatedAt: (/* @__PURE__ */ new Date()).toISOString(), overallStatus: overallStatus2, checks: nextChecks };
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-[24px] border border-white bg-white p-6 shadow-premium", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600", children: statusIcon$1(overallStatus) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[14px] font-black text-slate-900", children: "系统环境体检" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] font-semibold leading-5 text-slate-400", children: "用于检测当前系统、路径、Python、Node、端口、AI Worker 与原生依赖状态。错误项会提供安全修复入口和单项复检。" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${STATUS_STYLES$1[overallStatus]}`, children: STATUS_LABELS$2[overallStatus] })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-[11px] font-bold leading-5 text-rose-700", children: error }),
    repairMessage && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-[11px] font-bold leading-5 text-emerald-700", children: repairMessage }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 grid grid-cols-2 gap-2 text-[10.5px] font-bold text-slate-500", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile$1, { label: "platform", value: report?.platform === "darwin" ? "macOS" : report?.platform ?? "未检测" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile$1, { label: "arch", value: report?.arch ?? "未检测" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile$1, { label: "profile", value: report?.profile ?? "未检测" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile$1, { label: "overall", value: report?.overallStatus ? STATUS_LABELS$2[report.overallStatus] : "未检测" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile$1, { label: "generatedAt", value: formatDate$1(report?.generatedAt), wide: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile$1, { label: "lastRunAt", value: formatDate$1(lastRunAt), wide: true })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 flex flex-wrap gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PanelButton$1, { onClick: handleRunDoctor, disabled: loading, icon: Activity, children: "一键体检" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PanelButton$1, { onClick: handleRunDoctor, disabled: loading || !report, icon: RotateCcw, children: "重新体检" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PanelButton$1, { onClick: loadLastReport, disabled: loading, icon: RefreshCw, children: "刷新上次结果" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PanelButton$1, { onClick: handleClear, disabled: loading || !report, icon: Trash2, children: "清除结果" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PathGovernanceSummary, { report }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 space-y-2", children: orderedChecks.map(({ id: id2, label, result }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      CheckRow,
      {
        id: id2,
        label: CHECK_LABELS[id2] ?? label,
        result,
        busy: busyCheckId === id2,
        onRerun: () => handleRunSingleCheck(id2),
        onRepair: result ? () => handleRepair(result) : void 0
      },
      id2
    )) })
  ] });
}
function InfoTile$1({ label, value, wide = false }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `min-w-0 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 ${wide ? "col-span-2" : ""}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[9px] font-black text-slate-400", children: INFO_LABELS$1[label] ?? label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 truncate text-[11px] font-black text-slate-700", title: value, children: value })
  ] });
}
function PanelButton$1({
  children,
  disabled,
  icon: Icon2,
  onClick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick,
      disabled,
      className: "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { className: "h-3.5 w-3.5" }),
        children
      ]
    }
  );
}
function CheckRow({
  id: id2,
  label,
  result,
  busy,
  onRerun,
  onRepair
}) {
  const status = result?.status ?? "idle";
  const needsRepair = status === "warning" || status === "error";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-slate-100 bg-slate-50/70 p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${STATUS_STYLES$1[status]}`, children: [
            statusIcon$1(status),
            STATUS_LABELS$2[status]
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[11.5px] font-black text-slate-800", children: label })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[10.5px] font-semibold leading-5 text-slate-500", children: result?.message ?? "尚未运行该检测项。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[10px] font-black text-slate-400", children: result ? `${result.durationMs}ms` : "-" })
    ] }),
    result?.fixSuggestion && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-[10px] font-bold leading-5 text-amber-700", children: result.fixSuggestion }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: onRerun,
          disabled: busy,
          className: "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50",
          children: [
            busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3 w-3 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-3 w-3" }),
            "重检此项"
          ]
        }
      ),
      needsRepair && onRepair && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: onRepair,
          className: "inline-flex items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1.5 text-[10px] font-black text-brand-600 hover:bg-brand-100",
          children: [
            id2 === "ai-worker" || id2 === "port" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { className: "h-3 w-3" }),
            "一键修复"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "mt-2 group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "cursor-pointer select-none text-[10px] font-black text-slate-400 transition-colors hover:text-slate-600", children: [
        "原始详情 · ",
        id2
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-[10px] leading-5 text-slate-500", children: stringifyDetails(result?.details) })
    ] })
  ] });
}
const statusStyles = {
  not_analyzed: "border-slate-200 bg-slate-50 text-slate-600",
  loading: "border-blue-200 bg-blue-50 text-blue-700",
  safe_to_apply: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blocked: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  no_changes: "border-slate-200 bg-white text-slate-600"
};
const statusLabels = {
  not_analyzed: "Not analyzed",
  loading: "Checking",
  safe_to_apply: "Safe to apply later",
  blocked: "Blocked",
  failed: "Failed",
  no_changes: "No changes"
};
function SettingsMigrationPanel() {
  const [status, setStatus] = reactExports.useState("not_analyzed");
  const [plan, setPlan] = reactExports.useState(null);
  const [analysis, setAnalysis] = reactExports.useState(null);
  const [backups, setBackups] = reactExports.useState([]);
  const [activeAction, setActiveAction] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const api2 = getSettingsMigrationApi();
  const isBusy = status === "loading";
  const displayedChanges = reactExports.useMemo(() => {
    if (plan?.changes?.length) return plan.changes;
    if (analysis?.changes?.length) return analysis.changes;
    return [];
  }, [analysis, plan]);
  const displayedWarnings = plan?.warnings?.length ? plan.warnings : analysis?.warnings ?? [];
  const displayedBlockingIssues = plan?.blockingIssues?.length ? plan.blockingIssues : analysis?.blockingIssues ?? [];
  const runAction = async (label, action) => {
    if (!api2) {
      setStatus("failed");
      setError("Settings migration API is unavailable in preload.");
      return;
    }
    setStatus("loading");
    setActiveAction(label);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setStatus("failed");
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setActiveAction(null);
    }
  };
  const handleAnalyze = () => runAction("Analyzing", async () => {
    const response = await api2.analyze();
    if (!response.success || !response.data) {
      throw new Error(response.error ?? "Analyze failed.");
    }
    setAnalysis(response.data);
    setStatus(getReportPanelStatus(response.data));
  });
  const handleCreatePlan = () => runAction("Creating plan", async () => {
    const response = await api2.createPlan();
    if (!response.success || !response.data) {
      throw new Error(response.error ?? "Plan creation failed.");
    }
    setPlan(response.data);
    setAnalysis(response.data.dryRunResult.report);
    setStatus(getPlanPanelStatus(response.data));
  });
  const handleDryRun = () => runAction("Dry run", async () => {
    const response = await api2.dryRun();
    if (!response.success || !response.data) {
      throw new Error(response.error ?? "Dry run failed.");
    }
    setPlan(response.data);
    setAnalysis(response.data.dryRunResult.report);
    setStatus(getPlanPanelStatus(response.data));
  });
  const handleRefreshBackups = () => runAction("Refreshing backups", async () => {
    const response = await api2.listBackups();
    if (!response.success || !response.data) {
      throw new Error(response.error ?? "Backup refresh failed.");
    }
    setBackups(response.data.backups);
    setStatus((current) => current === "loading" ? "not_analyzed" : current);
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-[24px] border border-white bg-white p-6 shadow-premium", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardCheck, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[14px] font-black text-slate-900", children: "Settings migration dry run" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] font-semibold leading-5 text-slate-400", children: "Read-only compatibility checks for future cross-platform settings migration." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 text-[10.5px] font-bold leading-5 text-cyan-800", children: "This panel is read-only. It does not write settings.json, does not auto-migrate, does not overwrite paths, and exposes no write or restore controls." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid grid-cols-2 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ActionButton, { label: "Analyze", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileSearch, { className: "h-3.5 w-3.5" }), busy: activeAction === "Analyzing", disabled: isBusy, onClick: handleAnalyze }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ActionButton, { label: "Plan", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardCheck, { className: "h-3.5 w-3.5" }), busy: activeAction === "Creating plan", disabled: isBusy, onClick: handleCreatePlan }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ActionButton, { label: "Dry run", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-3.5 w-3.5" }), busy: activeAction === "Dry run", disabled: isBusy, onClick: handleDryRun }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ActionButton, { label: "Backups", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-3.5 w-3.5" }), busy: activeAction === "Refreshing backups", disabled: isBusy, onClick: handleRefreshBackups })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-[11px] font-bold leading-5 text-rose-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "mt-0.5 h-4 w-4 shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: error })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PlanSummary, { plan, analysis }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ChangeList, { changes: displayedChanges }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TextList, { title: "Warnings", items: displayedWarnings, tone: "warning" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TextList, { title: "Blocking issues", items: displayedBlockingIssues, tone: "blocked" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(BackupList, { backups })
    ] })
  ] });
}
function getSettingsMigrationApi() {
  return window.electronAPI?.settingsMigration ?? null;
}
function getPlanPanelStatus(plan) {
  if (plan.blockingIssues.length > 0 || !plan.canApply) return "blocked";
  if (!plan.changes.length && !plan.warnings.length) return "no_changes";
  return "safe_to_apply";
}
function getReportPanelStatus(report) {
  if (report.blockingIssues.length > 0 || !report.safeToApplyLater) return "blocked";
  if (!report.wouldChange && !report.warnings.length) return "no_changes";
  return "safe_to_apply";
}
function StatusBadge({ status }) {
  const icon = status === "failed" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "h-3.5 w-3.5" }) : status === "blocked" ? /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3.5 w-3.5" }) : status === "loading" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3.5 w-3.5" });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyles[status]}`, children: [
    icon,
    statusLabels[status]
  ] });
}
function ActionButton({
  label,
  icon,
  busy,
  disabled,
  onClick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick,
      disabled,
      className: "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50",
      children: [
        busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }) : icon,
        label
      ]
    }
  );
}
function PlanSummary({ plan, analysis }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "rounded-2xl border border-slate-100 bg-slate-50/80 p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "cursor-pointer text-[11.5px] font-black text-slate-700", children: "Plan summary" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[10.5px] font-bold text-slate-500", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValue, { label: "id", value: plan?.id ?? "-" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValue, { label: "generatedAt", value: plan?.generatedAt ?? "-" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValue, { label: "sourceVersion", value: String(plan?.sourceVersion ?? analysis?.originalVersion ?? "-") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValue, { label: "targetVersion", value: String(plan?.targetVersion ?? analysis?.targetVersion ?? "-") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValue, { label: "status", value: plan?.status ?? "-" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValue, { label: "canApply", value: plan ? String(plan.canApply) : "-" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValue, { label: "canRollback", value: plan ? String(plan.canRollback) : "-" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(KeyValue, { label: "backupRequired", value: plan ? String(plan.backupRequired) : "-" })
    ] })
  ] });
}
function KeyValue({ label, value }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "truncate text-slate-400", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "mt-0.5 truncate text-slate-700", title: value, children: value })
  ] });
}
function ChangeList({ changes }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "rounded-2xl border border-slate-100 bg-white p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "cursor-pointer text-[11.5px] font-black text-slate-700", children: [
      "Changes (",
      changes.length,
      ")"
    ] }),
    changes.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 space-y-2", children: changes.map((change) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "rounded-xl bg-slate-50 p-2 text-[10.5px] font-bold leading-5 text-slate-500", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-black text-slate-700", children: change.field }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 rounded-full bg-white px-2 py-0.5 text-[9.5px] font-black uppercase text-slate-400", children: change.type }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: change.message })
    ] }, `${change.field}-${change.type}-${change.message}`)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-[10.5px] font-bold text-slate-400", children: "No changes loaded." })
  ] });
}
function TextList({ title, items, tone }) {
  const colorClass = tone === "warning" ? "text-amber-700 bg-amber-50 border-amber-100" : "text-rose-700 bg-rose-50 border-rose-100";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: `rounded-2xl border p-3 ${items.length ? colorClass : "border-slate-100 bg-white text-slate-500"}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "cursor-pointer text-[11.5px] font-black", children: [
      title,
      " (",
      items.length,
      ")"
    ] }),
    items.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 space-y-1.5 text-[10.5px] font-bold leading-5", children: items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: item }, item)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-[10.5px] font-bold text-slate-400", children: "None reported." })
  ] });
}
function BackupList({ backups }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "rounded-2xl border border-slate-100 bg-white p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "flex cursor-pointer items-center gap-2 text-[11.5px] font-black text-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Archive, { className: "h-3.5 w-3.5" }),
      "Backups (",
      backups.length,
      ")"
    ] }),
    backups.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 space-y-2", children: backups.map((backup) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "rounded-xl bg-slate-50 p-2 text-[10.5px] font-bold leading-5 text-slate-500", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate font-black text-slate-700", title: backup.name, children: backup.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: backup.createdAt ?? "Unknown time" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatSize(backup.sizeBytes) })
      ] })
    ] }, backup.name)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-[10.5px] font-bold text-slate-400", children: "No backup summaries loaded." })
  ] });
}
function formatSize(sizeBytes) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "0 B";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}
function Settings() {
  const { settings, updateSettings, clearCache, loadSettings } = useSettingsStore();
  const [libraryPath, setLibraryPath] = reactExports.useState(settings.libraryPath);
  const [modelRootDir, setModelRootDir] = reactExports.useState(settings.modelRootDir || "~/DesignAssetManager/AIModels");
  const [concurrency, setConcurrency] = reactExports.useState(settings.concurrency);
  const [delayInterval, setDelayInterval] = reactExports.useState(settings.delayInterval);
  const [saveOriginalUrl, setSaveOriginalUrl] = reactExports.useState(settings.saveOriginalUrl);
  const [autoThumbnail, setAutoThumbnail] = reactExports.useState(settings.autoThumbnail);
  const [saving, setSaving] = reactExports.useState(false);
  const [clearing, setClearing] = reactExports.useState(false);
  const [toast, setToast] = reactExports.useState(null);
  reactExports.useEffect(() => {
    loadSettings();
  }, []);
  reactExports.useEffect(() => {
    setLibraryPath(settings.libraryPath);
    setModelRootDir(settings.modelRootDir || "~/DesignAssetManager/AIModels");
    setConcurrency(settings.concurrency);
    setDelayInterval(settings.delayInterval);
    setSaveOriginalUrl(settings.saveOriginalUrl);
    setAutoThumbnail(settings.autoThumbnail);
  }, [settings]);
  const handleSelectFolder = async (currentPath, setter) => {
    const api2 = window.electronAPI;
    if (!api2?.settingsSelectFolder) return;
    const result = await api2.settingsSelectFolder({ defaultPath: currentPath });
    if (typeof result === "string" && result) setter(result);
  };
  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        libraryPath,
        modelRootDir,
        concurrency,
        delayInterval,
        saveOriginalUrl,
        autoThumbnail
      });
      setToast("系统偏好已保存");
      window.setTimeout(() => setToast(null), 2200);
    } finally {
      setSaving(false);
    }
  };
  const handleClearCache = async () => {
    setClearing(true);
    try {
      await clearCache();
      setToast("临时视觉缓存已清理");
      window.setTimeout(() => setToast(null), 2200);
    } finally {
      setClearing(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto bg-slate-50/70 pb-10", children: [
    toast && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed right-8 top-20 z-50 inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white px-4 py-2.5 text-[12px] font-extrabold text-emerald-700 shadow-card-hover", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4" }),
      toast
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full space-y-6 px-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10.5px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Settings$1, { className: "h-3.5 w-3.5 text-brand-500" }),
            "Preferences"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-3 text-[24px] font-black tracking-tight text-slate-950", children: "系统偏好设置" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[12.5px] font-semibold text-slate-500", children: "管理素材存储、下载节流和本地运行目录。AI 模型、反推、后端与显存防护已集中到 AI 控制台。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Link,
          {
            to: "/ai-console",
            className: "inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-[12px] font-black text-white shadow-card-hover transition-all hover:bg-slate-800",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4" }),
              "前往 AI 控制台",
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSave, className: "space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-[24px] border border-white bg-white p-6 shadow-premium", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-6 flex items-center gap-3 border-b border-slate-100 pb-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "h-5 w-5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[15px] font-black text-slate-900", children: "下载与本地素材库偏好" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[11.5px] font-semibold text-slate-400", children: "这些设置影响素材入库、下载速度和本地缓存位置。" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-7", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Field$1, { label: "本地素材库物理路径", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { className: "absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: libraryPath, onChange: (event) => setLibraryPath(event.target.value), className: "control pl-10", required: true })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => handleSelectFolder(libraryPath, setLibraryPath),
                    className: "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-black text-slate-600 transition-colors hover:bg-slate-50",
                    children: "浏览文件夹"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[10.5px] font-semibold text-slate-400", children: "抓取的原图与缩略图默认存放在这里，支持多盘迁移。" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Field$1, { label: "AI 模型与运行时存储目录", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(HardDrive, { className: "absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: modelRootDir, onChange: (event) => setModelRootDir(event.target.value), className: "control pl-10", required: true })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => handleSelectFolder(modelRootDir, setModelRootDir),
                    className: "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-black text-slate-600 transition-colors hover:bg-slate-50",
                    children: "选择目录"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[10.5px] font-semibold text-slate-400", children: "Qwen3-VL、GGUF、mmproj、llama.cpp 运行时与安装缓存会存放在这里。具体模型、后端和反推策略请在 AI 控制台配置。" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              SliderField,
              {
                label: "并发下载任务上限",
                value: concurrency,
                suffix: "个并发",
                min: 1,
                max: 8,
                step: 1,
                onChange: setConcurrency,
                marks: ["1 单图模式", "3 默认并发", "8 高速模式"]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              SliderField,
              {
                label: "请求延迟间隔",
                value: delayInterval,
                suffix: "秒延迟",
                min: 0,
                max: 5,
                step: 0.5,
                onChange: setDelayInterval,
                marks: ["0 秒", "1.5 秒推荐", "5 秒深度节流"]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                ToggleCard,
                {
                  title: "保存原始来源 URL",
                  caption: "保留素材来源页面，方便后续回溯。",
                  checked: saveOriginalUrl,
                  onChange: setSaveOriginalUrl
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                ToggleCard,
                {
                  title: "自动生成缩略图",
                  caption: "入库后自动生成本地预览图。",
                  checked: autoThumbnail,
                  onChange: setAutoThumbnail
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-[24px] border border-white bg-white p-6 shadow-premium", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-5 w-5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[14px] font-black text-slate-900", children: "本地优先与数据隔离" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] font-semibold leading-5 text-slate-400", children: "反推、OCR、色彩提取和模型下载均遵循本地优先原则。不要在日志或报告中暴露素材路径、私有数据或密钥。" })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DoctorPanel, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsMigrationPanel, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[24px] border border-white bg-white p-6 shadow-premium", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "flex items-center gap-2 text-[14px] font-black text-slate-900", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4.5 w-4.5 text-rose-500" }),
              "临时视觉缓存清理"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[11px] font-semibold leading-5 text-slate-400", children: "清理运行中产生的预览和页面渲染缓存，不会删除素材库中已入库的文件。" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: handleClearCache,
                disabled: clearing,
                className: "mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] font-black text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50",
                children: [
                  clearing ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4" }),
                  "立即清理缓存数据"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "submit",
              disabled: saving,
              className: "flex w-full items-center justify-center gap-2 rounded-[22px] bg-brand-500 px-4 py-3.5 text-[13px] font-black text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-600 disabled:opacity-50",
              children: [
                saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4.5 w-4.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-4.5 w-4.5" }),
                "保存配置并应用偏好"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] });
}
function Field$1({ label, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mb-2 block text-[12px] font-black text-slate-600", children: label }),
    children
  ] });
}
function SliderField({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
  marks
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-slate-100 pt-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12px] font-black text-slate-600", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-black text-brand-600", children: [
        value,
        " ",
        suffix
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "range",
        min,
        max,
        step,
        value,
        onChange: (event) => onChange(Number(event.target.value)),
        className: "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-500"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 flex justify-between text-[10px] font-bold text-slate-400", children: marks.map((mark) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: mark }, mark)) })
  ] });
}
function ToggleCard({
  title,
  caption,
  checked,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-colors hover:bg-white", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[12.5px] font-black text-slate-800", children: title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 block text-[10.5px] font-semibold leading-5 text-slate-400", children: caption })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked, onChange: (event) => onChange(event.target.checked), className: "mt-1 h-4 w-4 shrink-0 accent-brand-500" })
  ] });
}
const PRESET_COLORS = [
  { label: "靛蓝 (Style)", value: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  { label: "薄荷 (Color)", value: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  { label: "海蓝 (Usage)", value: "bg-blue-50 text-blue-700 border border-blue-200" },
  { label: "琥珀 (Layout)", value: "bg-amber-50 text-amber-700 border border-amber-200" },
  { label: "玫瑰 (Scene)", value: "bg-rose-50 text-rose-700 border border-rose-200" },
  { label: "石板 (Source)", value: "bg-slate-100 text-slate-700 border border-slate-200" },
  { label: "丁香 (AI)", value: "bg-purple-50 text-purple-700 border border-purple-200" },
  { label: "粉红 (Custom)", value: "bg-pink-50 text-pink-700 border border-pink-200" }
];
const TAG_TYPES = [
  { label: "风格 (Style)", value: "style" },
  { label: "色彩 (Color)", value: "color" },
  { label: "用途 (Usage)", value: "usage" },
  { label: "版式 (Layout)", value: "layout" },
  { label: "场景 (Scene)", value: "scene" },
  { label: "来源 (Source)", value: "source" },
  { label: "AI (AI Generated)", value: "ai" },
  { label: "自定义 (Custom)", value: "custom" }
];
function TagEditDialog({ tag, isOpen, onClose }) {
  const { createTag, updateTag, tags } = useAssetStore();
  const [name, setName] = reactExports.useState("");
  const [type, setType] = reactExports.useState("custom");
  const [color, setColor] = reactExports.useState(PRESET_COLORS[0].value);
  const [description, setDescription] = reactExports.useState("");
  const [shorthand, setShorthand] = reactExports.useState("");
  const [parentId, setParentId] = reactExports.useState("");
  const [isCategory, setIsCategory] = reactExports.useState(false);
  const [aliasInput, setAliasInput] = reactExports.useState("");
  const [aliases, setAliases] = reactExports.useState([]);
  const [error, setError] = reactExports.useState("");
  reactExports.useEffect(() => {
    if (isOpen) {
      setError("");
      if (tag) {
        setName(tag.name);
        setType(tag.type);
        setColor(tag.color);
        setDescription(tag.description || "");
        setShorthand(tag.shorthand || "");
        setParentId(tag.parentId || "");
        setIsCategory(tag.isCategory);
        setAliases(tag.aliases || []);
      } else {
        setName("");
        setType("custom");
        setColor(PRESET_COLORS[7].value);
        setDescription("");
        setShorthand("");
        setParentId("");
        setIsCategory(false);
        setAliases([]);
      }
    }
  }, [tag, isOpen]);
  if (!isOpen) return null;
  const potentialParents = tags.filter(
    (t2) => t2.isCategory && (!tag || t2.id !== tag.id)
  );
  const handleAddAlias = () => {
    const trimmed = aliasInput.trim();
    if (trimmed && !aliases.includes(trimmed)) {
      setAliases([...aliases, trimmed]);
      setAliasInput("");
    }
  };
  const handleRemoveAlias = (val) => {
    setAliases(aliases.filter((x2) => x2 !== val));
  };
  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("标签名称不能为空");
      return;
    }
    try {
      if (tag) {
        await updateTag(tag.id, {
          name: trimmedName,
          type,
          color,
          description,
          shorthand,
          parentId: parentId || void 0,
          isCategory,
          aliases
          // Note: Handled by store/IPC
        });
        const removed = tag.aliases.filter((x2) => !aliases.includes(x2));
        const added = aliases.filter((x2) => !tag.aliases.includes(x2));
        const api2 = window.electronAPI;
        if (api2) {
          for (const item of added) {
            await api2.tagCreateAlias(tag.id, item);
          }
          for (const item of removed) {
            await api2.tagRemoveAlias(tag.id, item);
          }
        }
      } else {
        const created = await createTag({
          name: trimmedName,
          type,
          color,
          description,
          shorthand,
          parentId: parentId || void 0,
          isCategory
        });
        const api2 = window.electronAPI;
        if (api2 && created) {
          for (const item of aliases) {
            await api2.tagCreateAlias(created.id, item);
          }
        }
      }
      onClose();
    } catch (err) {
      console.error("[Dialog] Save tag failed:", err);
      setError(String(err));
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm select-none", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-[450px] bg-white rounded-2xl border border-slate-100 shadow-premium overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[14px] font-bold text-slate-800", children: tag ? "编辑标签参数" : "新建自定义标签" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onClose,
          className: "w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-4 h-4" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSave, className: "flex-1 overflow-y-auto p-6 space-y-4 text-[12px] font-sans", children: [
      error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-start gap-2 text-[11px] font-semibold", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-4 h-4 shrink-0 mt-0.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: error })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "font-bold text-slate-500 uppercase tracking-wider", children: "标签名称 *" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            required: true,
            value: name,
            onChange: (e) => setName(e.target.value),
            placeholder: "例如：极简主义...",
            className: "w-full px-4 py-2 border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl outline-none font-medium text-slate-700"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "font-bold text-slate-500 uppercase tracking-wider", children: "类型分类" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              value: type,
              onChange: (e) => setType(e.target.value),
              className: "w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-slate-600 font-semibold cursor-pointer",
              children: TAG_TYPES.map((t2) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t2.value, children: t2.label }, t2.value))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5 flex flex-col justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "inline-flex items-center gap-2 cursor-pointer pb-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: isCategory,
              onChange: (e) => setIsCategory(e.target.checked),
              className: "rounded text-brand-500 focus:ring-brand-500 w-4 h-4 border-slate-200"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-600", children: "设为大类 (Category)" })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "font-bold text-slate-500 uppercase tracking-wider", children: "色彩配置" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-4 gap-2", children: PRESET_COLORS.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setColor(item.value),
            className: `py-2 px-1 rounded-xl text-[10px] font-bold text-center border transition-all ${color === item.value ? "ring-2 ring-brand-500/20 border-brand-500 font-extrabold scale-[1.03]" : "border-slate-200 hover:bg-slate-50"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle ${item.value.split(" ")[0]}` }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "align-middle text-slate-600", children: item.label.split(" ")[0] })
            ]
          },
          item.value
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "font-bold text-slate-500 uppercase tracking-wider", children: "缩写/英文代号" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: shorthand,
              onChange: (e) => setShorthand(e.target.value),
              placeholder: "例如：minimal",
              className: "w-full px-4 py-2 border border-slate-200 focus:border-brand-500 rounded-xl outline-none font-semibold text-slate-700"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "font-bold text-slate-500 uppercase tracking-wider", children: "归属父级分类" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              value: parentId,
              onChange: (e) => setParentId(e.target.value),
              className: "w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-slate-600 font-semibold cursor-pointer",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "无父级(顶层大类)" }),
                potentialParents.map((t2) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t2.id, children: t2.name }, t2.id))
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "font-bold text-slate-500 uppercase tracking-wider", children: "描述说明" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            value: description,
            onChange: (e) => setDescription(e.target.value),
            placeholder: "标签含义或设计风格特点备注...",
            rows: 2,
            className: "w-full px-4 py-2 border border-slate-200 focus:border-brand-500 rounded-xl outline-none font-medium text-slate-700"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5 border-t border-slate-50 pt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "font-bold text-slate-500 uppercase tracking-wider", children: "标签别名管理" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: aliasInput,
              onChange: (e) => setAliasInput(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddAlias();
                }
              },
              placeholder: "例如：现代极简、无印风...",
              className: "flex-1 px-4 py-1.5 border border-slate-200 focus:border-brand-500 rounded-xl outline-none font-medium"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: handleAddAlias,
              className: "px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold border border-slate-200 rounded-xl transition-colors inline-flex items-center gap-1",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "添加" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto px-1 py-1", children: [
          aliases.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "span",
            {
              className: "px-2.5 py-0.5 rounded-lg text-[10.5px] bg-slate-50 border border-slate-200 text-slate-500 font-semibold inline-flex items-center gap-1",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  X,
                  {
                    onClick: () => handleRemoveAlias(item),
                    className: "w-3 h-3 hover:bg-slate-200 rounded cursor-pointer"
                  }
                )
              ]
            },
            item
          )),
          aliases.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-400 font-medium italic", children: "无配置别名，输入别名有助搜索" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onClose,
          className: "px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 font-bold text-[12px] transition-colors",
          children: "取消"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: handleSave,
          className: "px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-[12px] shadow shadow-brand-500/10 transition-premium",
          children: "保存并应用"
        }
      )
    ] })
  ] }) });
}
function TagMergeDialog({
  isOpen,
  onClose,
  initialSourceTagId = ""
}) {
  const { tags, mergeTags } = useAssetStore();
  const [sourceTagId, setSourceTagId] = reactExports.useState("");
  const [targetTagId, setTargetTagId] = reactExports.useState("");
  const [error, setError] = reactExports.useState("");
  const [success, setSuccess] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (isOpen) {
      setSourceTagId(initialSourceTagId);
      setTargetTagId("");
      setError("");
      setSuccess(false);
    }
  }, [isOpen, initialSourceTagId]);
  if (!isOpen) return null;
  const handleMerge = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!sourceTagId || !targetTagId) {
      setError("必须选择要合并的源标签和目标标签");
      return;
    }
    if (sourceTagId === targetTagId) {
      setError("源标签和目标标签不能是同一个");
      return;
    }
    try {
      await mergeTags(sourceTagId, targetTagId);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("[Dialog] Tag merge failed:", err);
      setError(String(err));
    }
  };
  const sourceTagOptions = tags;
  const targetTagOptions = tags.filter((t2) => t2.id !== sourceTagId);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm select-none", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-[420px] bg-white rounded-2xl border border-slate-100 shadow-premium overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-[13.5px] font-bold text-slate-800 flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Merge, { className: "w-4.5 h-4.5 text-brand-500" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "合并去重标签" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onClose,
          className: "w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-4 h-4" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleMerge, className: "p-6 space-y-4 text-[12px] font-sans", children: [
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-[11px] font-semibold", children: error }),
      success && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-[11px] font-bold text-center", children: "标签合并成功！正在刷新..." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl flex gap-2.5 leading-relaxed text-[11px] font-medium", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleHelp, { className: "w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-bold text-amber-900 mb-0.5", children: "合并操作说明：" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "list-disc list-inside space-y-1 text-amber-800/90 pl-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              "所有原先打有 ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "源标签" }),
              " 的素材，都会自动变更为 ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "目标标签" }),
              "；"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "源标签" }),
              " 的所有别名、关系等都会转移并并入 ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "目标标签" }),
              "；"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              "合并完成后，",
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "源标签" }),
              " 将被",
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "永久删除" }),
              "且无法撤销。"
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "font-bold text-slate-500 uppercase tracking-wider", children: "选择源标签 (将被合并并删除)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: sourceTagId,
            onChange: (e) => {
              setSourceTagId(e.target.value);
              if (targetTagId === e.target.value) {
                setTargetTagId("");
              }
            },
            className: "w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-slate-600 font-semibold cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "点击选择源标签..." }),
              sourceTagOptions.map((t2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: t2.id, children: [
                t2.name,
                " (",
                t2.type,
                ") - 使用 ",
                t2.usageCount,
                " 次"
              ] }, t2.id))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "font-bold text-slate-500 uppercase tracking-wider", children: "选择目标标签 (将被合并并保留)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: targetTagId,
            onChange: (e) => setTargetTagId(e.target.value),
            disabled: !sourceTagId,
            className: "w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-slate-600 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "点击选择目标标签..." }),
              targetTagOptions.map((t2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: t2.id, children: [
                t2.name,
                " (",
                t2.type,
                ") - 使用 ",
                t2.usageCount,
                " 次"
              ] }, t2.id))
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onClose,
          className: "px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 font-bold text-[12px] transition-colors",
          children: "取消"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: handleMerge,
          disabled: !sourceTagId || !targetTagId || sourceTagId === targetTagId,
          className: "px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-[12px] shadow shadow-brand-500/10 transition-premium disabled:opacity-50 disabled:cursor-not-allowed",
          children: "确认合并并清退源标签"
        }
      )
    ] })
  ] }) });
}
function TagManagerPage() {
  const { tags, deleteTag } = useAssetStore();
  const [search, setSearch] = reactExports.useState("");
  const [filterType, setFilterType] = reactExports.useState("");
  const [sortOrder, setSortOrder] = reactExports.useState("usage");
  const [isEditOpen, setIsEditOpen] = reactExports.useState(false);
  const [editingTag, setEditingTag] = reactExports.useState(null);
  const [isMergeOpen, setIsMergeOpen] = reactExports.useState(false);
  const [mergeSourceId, setMergeSourceId] = reactExports.useState("");
  const [aiStatus, setAiStatus] = reactExports.useState(null);
  const [isUnloading, setIsUnloading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const fetchStatus = async () => {
      const api2 = window.electronAPI;
      if (api2 && api2.aiModelStatus) {
        try {
          const res = await api2.aiModelStatus();
          if (res) {
            setAiStatus(res);
          }
        } catch (e) {
          console.error("Failed to fetch AI status:", e);
        }
      }
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 3e3);
    return () => clearInterval(timer);
  }, []);
  const categoryNames = {
    style: "风格 (Style)",
    color: "色彩 (Color)",
    usage: "用途 (Usage)",
    layout: "版式 (Layout)",
    scene: "场景 (Scene)",
    source: "来源 (Source)",
    ai: "AI 智能打标",
    custom: "用户自定义 (Custom)"
  };
  const filteredTags = tags.filter((t2) => {
    const matchSearch = t2.name.toLowerCase().includes(search.toLowerCase()) || t2.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase())) || (t2.shorthand || "").toLowerCase().includes(search.toLowerCase());
    const matchType = filterType ? t2.type === filterType : true;
    return matchSearch && matchType;
  }).sort((a, b) => {
    if (sortOrder === "usage") {
      return b.usageCount - a.usageCount || a.name.localeCompare(b.name);
    } else {
      return a.name.localeCompare(b.name);
    }
  });
  const handleCreateNew = () => {
    setEditingTag(null);
    setIsEditOpen(true);
  };
  const handleEdit = (tag) => {
    setEditingTag(tag);
    setIsEditOpen(true);
  };
  const handleMerge = (tag) => {
    setMergeSourceId(tag.id);
    setIsMergeOpen(true);
  };
  const handleDelete = async (id2, name) => {
    if (confirm(`确认要永久删除标签 "${name}" 吗？这一操作不可恢复，已关联素材的关系将被解除。`)) {
      try {
        await deleteTag(id2);
      } catch (err) {
        alert(`删除失败: ${err}`);
      }
    }
  };
  const getParentName = (parentId) => {
    if (!parentId) return "-";
    const p2 = tags.find((t2) => t2.id === parentId);
    return p2 ? p2.name : "-";
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col space-y-6 h-full overflow-y-auto pr-1 select-none font-sans pb-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-[17px] font-bold text-slate-800 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tag, { className: "w-5 h-5 text-brand-500" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "素材库标签管理中心 (Tag Studio)" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-400 text-[11px] font-medium leading-none", children: "统一配置风格、色彩、排版、主客体等维度多阶标签词汇，支持同义词别名聚合与合并清洗。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => {
              setMergeSourceId("");
              setIsMergeOpen(true);
            },
            className: "px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-[12px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Merge, { className: "w-4 h-4 text-slate-500" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "合并去重" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: handleCreateNew,
            className: "px-4.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-[12px] transition-premium flex items-center gap-1.5 cursor-pointer shadow shadow-brand-500/10",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-4.5 h-4.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "新建标签" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-panel p-4 rounded-2xl shadow-premium bg-white/80 flex flex-col md:flex-row items-center gap-4 shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 w-full relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search$1, { className: "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            placeholder: "搜索标签名称、英文缩写或别名...",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            className: "w-full pl-10 pr-4 py-2.5 text-[12px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-semibold text-slate-700"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full md:w-56 relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Compass, { className: "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: filterType,
            onChange: (e) => setFilterType(e.target.value),
            className: "w-full pl-10 pr-4 py-2.5 text-[12px] font-bold bg-white border border-slate-200 rounded-xl outline-none transition-premium cursor-pointer text-slate-600 appearance-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "全部类别类型" }),
              Object.entries(categoryNames).map(([key, val]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: key, children: val }, key))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full md:w-48 relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersVertical, { className: "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: sortOrder,
            onChange: (e) => setSortOrder(e.target.value),
            className: "w-full pl-10 pr-4 py-2.5 text-[12px] font-bold bg-white border border-slate-200 rounded-xl outline-none transition-premium cursor-pointer text-slate-600 appearance-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "usage", children: "按使用次数降序" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "name", children: "按拼音名称排序" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 bg-white border border-slate-100 rounded-2xl shadow-premium overflow-hidden flex flex-col min-h-[300px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-left border-collapse font-sans", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-slate-50 border-b border-slate-100 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3.5 w-44", children: "标签视觉形态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3.5 w-32", children: "类别分类" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3.5 w-32", children: "英语别名/简写" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3.5", children: "中文别名数组" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3.5 w-32", children: "父级关系" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3.5 w-24 text-center", children: "使用频数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3.5 w-32 text-center", children: "管理操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { className: "divide-y divide-slate-50 text-[11.5px] text-slate-600 font-medium", children: [
        filteredTags.map((tag) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "tr",
          {
            className: "hover:bg-slate-50/50 transition-colors group/row",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TagChip,
                {
                  name: tag.name,
                  type: tag.type,
                  colorClass: tag.color,
                  source: "manual",
                  status: "confirmed",
                  showHoverTooltip: false
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3.5 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]", children: categoryNames[tag.type]?.split(" ")[0] || tag.type }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3.5 font-mono text-[10.5px] text-slate-400", children: tag.shorthand || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3.5 text-slate-400 truncate max-w-xs", children: tag.aliases && tag.aliases.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1", children: tag.aliases.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-slate-100/80 px-1.5 py-0.5 rounded text-[9.5px] text-slate-500", children: a }, a)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "italic text-[10px] text-slate-300", children: "无" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3.5 font-semibold text-slate-500", children: tag.isCategory ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9.5px] bg-brand-50 text-brand-600 border border-brand-100 px-1.5 py-0.5 rounded-md font-bold", children: "大类(目录)" }) : getParentName(tag.parentId) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3.5 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `px-2 py-0.5 font-extrabold text-[10.5px] rounded-md ${tag.usageCount > 0 ? "bg-brand-50 text-brand-700 border border-brand-100" : "bg-slate-100 text-slate-400"}`, children: [
                tag.usageCount,
                " 次"
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3.5 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-1 opacity-80 group-hover/row:opacity-100 transition-opacity", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => handleEdit(tag),
                    className: "w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer",
                    title: "修改标签参数",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pen, { className: "w-3.5 h-3.5" })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => handleMerge(tag),
                    className: "w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer",
                    title: "此标签向其他标签合并",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Merge, { className: "w-3.5 h-3.5" })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => handleDelete(tag.id, tag.name),
                    className: "w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer",
                    title: "彻底移除此标签",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3.5 h-3.5" })
                  }
                )
              ] }) })
            ]
          },
          tag.id
        )),
        filteredTags.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, className: "py-24 text-center text-slate-400 font-semibold flex-col gap-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-8 h-8 stroke-[1.5]" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "素材库中暂未匹配到对应的标签词汇" })
        ] }) }) })
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      TagEditDialog,
      {
        isOpen: isEditOpen,
        onClose: () => {
          setIsEditOpen(false);
          setEditingTag(null);
        },
        tag: editingTag
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      TagMergeDialog,
      {
        isOpen: isMergeOpen,
        onClose: () => {
          setIsMergeOpen(false);
          setMergeSourceId("");
        },
        initialSourceTagId: mergeSourceId
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-panel p-4 mt-6 rounded-2xl flex items-center justify-between font-sans border border-slate-100/50 bg-white/70 shadow-premium shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { className: "w-4.5 h-4.5 animate-pulse" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12.5px] font-black text-slate-700", children: "AI 智能打标算力状态" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `w-1.5 h-1.5 rounded-full ${aiStatus?.offline ? "bg-rose-400 animate-ping" : "bg-emerald-500 animate-pulse"}` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9.5px] font-bold text-slate-400 leading-none", children: aiStatus?.offline ? "离线 (本地降级)" : "运行中" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-400 font-semibold mt-0.5 leading-none", children: aiStatus?.offline ? "本地打标服务未开启，暂时无法使用反推。" : `GPU: ${aiStatus?.gpu_status?.device_name || "NVIDIA Card"} • 显存利用: ${aiStatus?.gpu_status?.utilization_percent || 0}% • 任务积压: ${aiStatus?.queue_stats?.queued || 0} 个` })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Link,
        {
          to: "/ai-console",
          className: "px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-100 hover:border-purple-200 rounded-xl font-extrabold text-[11px] transition-premium flex items-center gap-1 cursor-pointer shadow shadow-purple-500/5 hover:scale-[1.02] active:scale-[0.98]",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "管理 AI 算力中心 →" })
        }
      )
    ] })
  ] });
}
const STATUS_LABELS$1 = {
  ready: "就绪",
  optional: "可选",
  planned: "规划中",
  fallback: "回退",
  unavailable: "不可用"
};
const STATUS_STYLES = {
  ready: "border-emerald-100 bg-emerald-50 text-emerald-700",
  optional: "border-sky-100 bg-sky-50 text-sky-700",
  planned: "border-amber-100 bg-amber-50 text-amber-700",
  fallback: "border-slate-200 bg-slate-50 text-slate-600",
  unavailable: "border-rose-100 bg-rose-50 text-rose-700"
};
function MacOSAiCapabilityMatrix({ probe }) {
  if (!probe) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[12px] font-black text-slate-800 dark:text-slate-200", children: "macOS 细项能力矩阵" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[10.5px] font-bold leading-5 text-slate-500 dark:text-slate-400", children: "把 Python MPS、ONNX Runtime、CLIP/SigLIP ONNX 以及 Llama 路线拆到可见的 optional 能力上，方便确认下一步该补哪一段。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10.5px] font-black text-slate-500 dark:text-slate-400", children: [
        "Torch ",
        probe.torch.version ?? "unknown",
        " / ONNX ",
        probe.onnxruntime.version ?? "unknown",
        " / MLX ",
        probe.mlx.version ?? "unknown"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 grid gap-2 xl:grid-cols-3", children: probe.lanes.map((lane) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-slate-200/60 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900/60", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between gap-2 mb-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[11px] font-black text-slate-800 dark:text-slate-200", children: lane.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `shrink-0 rounded-full border px-1.5 py-px text-[8.5px] font-black ${STATUS_STYLES[lane.status]}`, children: STATUS_LABELS$1[lane.status] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-1 sm:grid-cols-2", children: lane.capabilities.map((capability) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-1 rounded-md border border-slate-100 bg-slate-50/70 px-2 py-1 dark:border-slate-800 dark:bg-slate-950", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 truncate", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold text-slate-600 dark:text-slate-300", children: capability.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-[8.5px] font-medium text-slate-400 dark:text-slate-500", children: capability.modelFamily ?? capability.backend ?? capability.role })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `shrink-0 rounded-full border px-1.5 py-px text-[8px] font-black ${STATUS_STYLES[capability.status]}`, children: STATUS_LABELS$1[capability.status] })
      ] }, capability.id)) })
    ] }, lane.id)) })
  ] });
}
const STATUS_STYLE = {
  idle: "border-slate-200 bg-slate-50 text-slate-500",
  starting: "border-brand-100 bg-brand-50 text-brand-600",
  running: "border-emerald-100 bg-emerald-50 text-emerald-700",
  stopping: "border-amber-100 bg-amber-50 text-amber-700",
  stopped: "border-slate-200 bg-slate-50 text-slate-500",
  unhealthy: "border-amber-100 bg-amber-50 text-amber-700",
  failed: "border-rose-100 bg-rose-50 text-rose-700",
  disabled: "border-slate-200 bg-slate-100 text-slate-500",
  ok: "border-emerald-100 bg-emerald-50 text-emerald-700",
  warning: "border-amber-100 bg-amber-50 text-amber-700",
  error: "border-rose-100 bg-rose-50 text-rose-700",
  unknown: "border-slate-200 bg-slate-50 text-slate-500"
};
const STATUS_LABELS = {
  idle: "空闲",
  starting: "启动中",
  running: "运行中",
  stopping: "停止中",
  stopped: "已停止",
  unhealthy: "异常",
  failed: "失败",
  disabled: "已禁用",
  ok: "正常",
  warning: "提醒",
  error: "错误",
  unknown: "未知"
};
const INFO_LABELS = {
  active: "当前运行时",
  total: "总数",
  running: "运行中",
  issues: "问题",
  displayName: "显示名称",
  baseUrl: "服务地址",
  lastCheck: "最近检查",
  pid: "进程 PID",
  error: "错误",
  platform: "平台",
  machine: "机器架构",
  isMacOS: "macOS",
  isAppleSilicon: "Apple Silicon",
  clipSiglipOnnx: "CLIP/SigLIP ONNX"
};
function getAiRuntimeApi() {
  const electronAPI = window.electronAPI;
  return electronAPI?.aiRuntime ?? null;
}
function formatDate(value) {
  if (!value) return "从未检查";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
function displayValue(value) {
  if (value === "None") return "无";
  if (value === "Never") return "从未检查";
  if (value === "unknown") return "未知";
  return value;
}
function actionLabel(label) {
  return {
    "Set active": "设为当前",
    Start: "启动",
    Stop: "停止",
    Restart: "重启",
    "Health check": "健康检查",
    "Health check all": "全部健康检查"
  }[label] ?? label;
}
function stringifyMetadata(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) return "{}";
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return String(metadata);
  }
}
function isMacOSAiBranchMetadata(value) {
  return Boolean(value && typeof value === "object" && value.marker === "macos-ai-branch" && Array.isArray(value.lanes));
}
function getMacOSAiBranchRuntime(runtimes) {
  for (const runtime of runtimes) {
    const branch = runtime.metadata?.macosAiBranch;
    if (isMacOSAiBranchMetadata(branch)) return branch;
  }
  return null;
}
function statusText(status) {
  return {
    ready: "就绪",
    optional: "可选",
    planned: "规划中",
    fallback: "回退",
    unavailable: "不可用"
  }[status];
}
function branchStatusStyle(status) {
  return {
    ready: "border-emerald-100 bg-emerald-50 text-emerald-700",
    optional: "border-sky-100 bg-sky-50 text-sky-700",
    planned: "border-amber-100 bg-amber-50 text-amber-700",
    fallback: "border-slate-200 bg-slate-50 text-slate-600",
    unavailable: "border-rose-100 bg-rose-50 text-rose-700"
  }[status];
}
function statusIcon(status) {
  if (status === "running" || status === "ok") return /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3.5 w-3.5" });
  if (status === "failed" || status === "error" || status === "unhealthy" || status === "warning") return /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3.5 w-3.5" });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "h-3.5 w-3.5" });
}
function AiRuntimePanel() {
  const [runtimes, setRuntimes] = reactExports.useState([]);
  const [activeRuntime, setActiveRuntime] = reactExports.useState(null);
  const [healthResults, setHealthResults] = reactExports.useState({});
  const [macOSWorkerProbe, setMacOSWorkerProbe] = reactExports.useState(null);
  const [macOSWorkerProbeError, setMacOSWorkerProbeError] = reactExports.useState(null);
  const [pythonMpsStatus, setPythonMpsStatus] = reactExports.useState(null);
  const [pythonMpsStatusError, setPythonMpsStatusError] = reactExports.useState(null);
  const [clipSiglipOnnxStatus, setClipSiglipOnnxStatus] = reactExports.useState(null);
  const [clipSiglipOnnxStatusError, setClipSiglipOnnxStatusError] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(false);
  const [busyRuntimeId, setBusyRuntimeId] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [lastAction, setLastAction] = reactExports.useState(null);
  const activeRuntimeId = activeRuntime?.id ?? null;
  const hasRuntimes = runtimes.length > 0;
  const macosAiBranch = reactExports.useMemo(() => getMacOSAiBranchRuntime(runtimes), [runtimes]);
  const runtimeSummary = reactExports.useMemo(() => {
    const running = runtimes.filter((runtime) => runtime.status === "running").length;
    const failed = runtimes.filter((runtime) => runtime.status === "failed" || runtime.status === "unhealthy").length;
    return { running, failed, total: runtimes.length };
  }, [runtimes]);
  const loadRuntimes = async () => {
    const api2 = getAiRuntimeApi();
    if (!api2) {
      setError("当前运行环境未暴露 AI 运行时接口。");
      return;
    }
    setLoading(true);
    setError(null);
    setMacOSWorkerProbeError(null);
    setPythonMpsStatusError(null);
    setClipSiglipOnnxStatusError(null);
    try {
      const [listResponse, activeResponse, macOSProbeResponse, pythonMpsResponse] = await Promise.all([
        api2.listRuntimes(),
        api2.getActiveRuntime(),
        api2.getMacOSCapabilities(),
        api2.getPythonMpsStatus()
      ]);
      if (!listResponse.success || !listResponse.data) throw new Error(listResponse.error || "读取 AI 运行时列表失败。");
      if (!activeResponse.success) throw new Error(activeResponse.error || "读取当前 AI 运行时失败。");
      setRuntimes(listResponse.data.runtimes);
      setActiveRuntime(activeResponse.data ?? null);
      if (macOSProbeResponse.success && macOSProbeResponse.data) {
        setMacOSWorkerProbe(macOSProbeResponse.data.capabilities);
        setMacOSWorkerProbeError(macOSProbeResponse.data.error ?? null);
      } else {
        setMacOSWorkerProbe(null);
        setMacOSWorkerProbeError(macOSProbeResponse.error || "读取 macOS Worker 能力失败。");
      }
      if (pythonMpsResponse.success && pythonMpsResponse.data) {
        setPythonMpsStatus(pythonMpsResponse.data);
        setPythonMpsStatusError(pythonMpsResponse.data.error ?? null);
      } else {
        setPythonMpsStatus(null);
        setPythonMpsStatusError(pythonMpsResponse.error || "读取 Python MPS 兼容性失败。");
      }
      const clipSiglipResponse = await api2.getClipSiglipOnnxStatus();
      if (clipSiglipResponse.success && clipSiglipResponse.data) {
        setClipSiglipOnnxStatus(clipSiglipResponse.data);
        setClipSiglipOnnxStatusError(clipSiglipResponse.data.error ?? null);
      } else {
        setClipSiglipOnnxStatus(null);
        setClipSiglipOnnxStatusError(clipSiglipResponse.error || "读取 CLIP/SigLIP ONNX 兼容性失败。");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };
  reactExports.useEffect(() => {
    void loadRuntimes();
  }, []);
  const replaceRuntimeState = (state) => {
    if (!state) return;
    setRuntimes((current) => current.map((runtime) => runtime.id === state.id ? state : runtime));
    setActiveRuntime((current) => current?.id === state.id ? state : current);
  };
  const runOperation = async (runtimeId, label, operation) => {
    const api2 = getAiRuntimeApi();
    if (!api2) {
      setError("当前运行环境未暴露 AI 运行时接口。");
      return;
    }
    setBusyRuntimeId(runtimeId);
    setError(null);
    try {
      const response = await operation(api2, runtimeId);
      if (!response.success || !response.data) throw new Error(response.error || `${actionLabel(label)}失败。`);
      if (!response.data.success) throw new Error(response.data.error || `${actionLabel(label)}被运行时拒绝。`);
      replaceRuntimeState(response.data.state);
      setLastAction(`${actionLabel(label)}：${runtimeId}`);
      if (label === "Set active") {
        setActiveRuntime(response.data.state);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyRuntimeId(null);
    }
  };
  const runHealthCheck = async (runtimeId) => {
    const api2 = getAiRuntimeApi();
    if (!api2) {
      setError("当前运行环境未暴露 AI 运行时接口。");
      return;
    }
    setBusyRuntimeId(runtimeId);
    setError(null);
    try {
      const response = await api2.healthCheck(runtimeId);
      if (!response.success || !response.data) throw new Error(response.error || "健康检查失败。");
      setHealthResults((current) => ({ ...current, [runtimeId]: response.data }));
      const stateResponse = await api2.getRuntimeState(runtimeId);
      if (stateResponse.success) replaceRuntimeState(stateResponse.data);
      setLastAction(`健康检查：${runtimeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyRuntimeId(null);
    }
  };
  const runHealthCheckAll = async () => {
    const api2 = getAiRuntimeApi();
    if (!api2) {
      setError("当前运行环境未暴露 AI 运行时接口。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api2.healthCheckAll();
      if (!response.success || !response.data) throw new Error(response.error || "全部健康检查失败。");
      setHealthResults(Object.fromEntries(response.data.map((result) => [result.runtimeId, result])));
      await loadRuntimes();
      setLastAction("全部健康检查");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-[24px] border border-white bg-white p-6 shadow-premium dark:border-slate-800 dark:bg-slate-900", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-start gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[15px] font-black text-slate-900 dark:text-slate-50", children: "AI 运行时管理" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[12px] font-semibold leading-6 text-slate-500 dark:text-slate-400", children: "这里用于查看和手动控制当前 AI 运行时状态。启动、停止、重启会通过主进程运行时管理器执行，并显示健康检查结果。" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500", children: [
        runtimeSummary.running,
        "/",
        runtimeSummary.total,
        " 运行中"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-[10.5px] font-bold leading-5 text-amber-700", children: "运行时操作会经过 Electron 主进程的安全 IPC。外部服务、模型下载和运行时安装仍由各自模块管理，不会在本面板自动触发。" }),
    macosAiBranch && /* @__PURE__ */ jsxRuntimeExports.jsx(MacOSAiBranchPanel, { branch: macosAiBranch }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(MacOSAiWorkerProbePanel, { probe: macOSWorkerProbe, error: macOSWorkerProbeError }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-2xl border border-slate-100 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[12px] font-black text-slate-800 dark:text-slate-200", children: "Python MPS 兼容性检查" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[10.5px] font-bold leading-5 text-slate-500 dark:text-slate-400", children: "这个检查器会确认 PyTorch MPS、torchvision、transformers 与小模型家族是否已经具备可用的 macOS 兼容性。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${pythonMpsStatus?.compatible ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`, children: pythonMpsStatus?.compatible ? "可兼容" : pythonMpsStatus ? pythonMpsStatus.status === "planned" ? "待补齐" : "不可用" : "未检查" })
      ] }),
      pythonMpsStatus && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid grid-cols-2 gap-3 text-[10.5px] font-bold text-slate-500 lg:grid-cols-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "displayName", value: pythonMpsStatus.runtime ?? "torch.mps" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "platform", value: pythonMpsStatus.compatible ? "compatible" : "incompatible" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "machine", value: pythonMpsStatus.status }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "error", value: pythonMpsStatusError ?? "None", wide: true })
      ] }),
      !pythonMpsStatus && pythonMpsStatusError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 rounded-xl border border-amber-100 bg-amber-50/80 p-3 text-[10.5px] font-bold leading-5 text-amber-700", children: pythonMpsStatusError })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-2xl border border-slate-100 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[12px] font-black text-slate-800 dark:text-slate-200", children: "CLIP/SigLIP ONNX 兼容性检查" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[10.5px] font-bold leading-5 text-slate-500 dark:text-slate-400", children: "这个检查器会确认本地 Python 依赖和 ONNX 图结构是否足以支撑 macOS 的 embedding 路线。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${clipSiglipOnnxStatus?.compatible ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`, children: clipSiglipOnnxStatus?.compatible ? "可兼容" : clipSiglipOnnxStatus ? "待补齐" : "未检查" })
      ] }),
      clipSiglipOnnxStatus && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid grid-cols-2 gap-3 text-[10.5px] font-bold text-slate-500 lg:grid-cols-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "displayName", value: clipSiglipOnnxStatus.runtime ?? "optimum.onnxruntime" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "platform", value: clipSiglipOnnxStatus.compatible ? "compatible" : "incompatible" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "machine", value: clipSiglipOnnxStatus.diagnostics?.onnxruntime ? "onnxruntime" : "unknown" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "error", value: clipSiglipOnnxStatusError ?? "None", wide: true })
      ] }),
      !clipSiglipOnnxStatus && clipSiglipOnnxStatusError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 rounded-xl border border-amber-100 bg-amber-50/80 p-3 text-[10.5px] font-bold leading-5 text-amber-700", children: clipSiglipOnnxStatusError })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-[11px] font-bold leading-5 text-rose-700", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid grid-cols-1 gap-3 text-[10.5px] font-bold text-slate-500 sm:grid-cols-2 lg:grid-cols-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "active", value: activeRuntimeId ?? "None", wide: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "total", value: String(runtimeSummary.total) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "running", value: String(runtimeSummary.running) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "issues", value: String(runtimeSummary.failed) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PanelButton, { onClick: loadRuntimes, disabled: loading, icon: RefreshCw, children: "刷新状态" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PanelButton, { onClick: runHealthCheckAll, disabled: loading || !hasRuntimes, icon: Activity, children: "全部检查" })
    ] }),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-[11px] font-black text-brand-600", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }),
      "正在读取运行时状态..."
    ] }),
    !loading && !hasRuntimes && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-[11px] font-bold leading-5 text-slate-500", children: "当前没有已注册的 AI 运行时。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 space-y-3", children: runtimes.map((runtime) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      RuntimeCard,
      {
        runtime,
        active: runtime.id === activeRuntimeId,
        busy: busyRuntimeId === runtime.id,
        healthResult: healthResults[runtime.id],
        onSelect: () => runOperation(runtime.id, "Set active", (api2, id2) => api2.selectActiveRuntime(id2)),
        onStart: () => runOperation(runtime.id, "Start", (api2, id2) => api2.startRuntime(id2)),
        onStop: () => runOperation(runtime.id, "Stop", (api2, id2) => api2.stopRuntime(id2)),
        onRestart: () => runOperation(runtime.id, "Restart", (api2, id2) => api2.restartRuntime(id2)),
        onHealthCheck: () => runHealthCheck(runtime.id)
      },
      runtime.id
    )) }),
    lastAction && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-[10.5px] font-black text-emerald-700", children: [
      "最近操作：",
      lastAction
    ] })
  ] });
}
function MacOSAiBranchPanel({ branch }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-start md:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[13px] font-black text-slate-900", children: "macOS AI 分支" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 text-[11px] font-bold leading-5 text-slate-500", children: [
          "Python MPS、ONNX Runtime 与 Llama 三条路线的阶段性能力图。当前阶段：",
          branch.phase,
          " / ",
          branch.platform,
          "/",
          branch.arch
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${branch.isCurrentPlatform ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`, children: branch.isCurrentPlatform ? "当前平台" : "非当前平台" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 grid gap-3 xl:grid-cols-3", children: branch.lanes.map((lane) => /* @__PURE__ */ jsxRuntimeExports.jsx(MacOSAiLaneCard, { lane }, lane.id)) }),
    branch.warnings.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 space-y-1 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-[10.5px] font-bold leading-5 text-amber-700", children: branch.warnings.map((warning2) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: warning2 }, warning2)) })
  ] });
}
function MacOSAiWorkerProbePanel({ probe, error }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-start md:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[13px] font-black text-slate-900", children: "macOS Worker 实时探测" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[11px] font-bold leading-5 text-slate-500", children: "这里显示 Python Worker 当前探测到的 MPS、ONNX Runtime 和 MLX 状态，帮助确认真实运行时能力是否已经可用。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${probe?.isMacOS ? "border-indigo-100 bg-white text-indigo-700" : "border-slate-200 bg-white text-slate-500"}`, children: probe ? `${probe.platform}/${probe.machine}` : "等待探测" })
    ] }),
    probe && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid grid-cols-2 gap-3 text-[10.5px] font-bold text-slate-500 lg:grid-cols-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "platform", value: probe.platform }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "machine", value: probe.machine }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "isMacOS", value: probe.isMacOS ? "yes" : "no" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "isAppleSilicon", value: probe.isAppleSilicon ? "yes" : "no" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "clipSiglipOnnx", value: statusText(probe.clipSiglipOnnx.status) })
    ] }),
    probe && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 grid gap-3 xl:grid-cols-3", children: probe.lanes.map((lane) => /* @__PURE__ */ jsxRuntimeExports.jsx(MacOSAiLaneCard, { lane }, lane.id)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(MacOSAiCapabilityMatrix, { probe }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 rounded-xl border border-amber-100 bg-amber-50/80 p-3 text-[10.5px] font-bold leading-5 text-amber-700", children: error }),
    !probe && !error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 rounded-xl border border-slate-200 bg-white p-3 text-[10.5px] font-bold leading-5 text-slate-500", children: "暂未获取到 Worker 探测结果。" })
  ] });
}
function MacOSAiLaneCard({ lane }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-white bg-white p-3 shadow-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[12px] font-black text-slate-900", children: lane.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[10.5px] font-bold leading-5 text-slate-500", children: lane.summary })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${branchStatusStyle(lane.status)}`, children: statusText(lane.status) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 space-y-1.5", children: lane.capabilities.map((capability) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[10.5px] font-black text-slate-700", children: capability.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 truncate text-[9.5px] font-bold text-slate-400", children: capability.backend ?? capability.role })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `rounded-full border px-2 py-0.5 text-[9px] font-black ${branchStatusStyle(capability.status)}`, children: statusText(capability.status) })
    ] }, capability.id)) })
  ] });
}
function RuntimeCard({
  runtime,
  active,
  busy,
  healthResult,
  onSelect,
  onStart,
  onStop,
  onRestart,
  onHealthCheck
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-slate-100 bg-slate-50/70 p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${STATUS_STYLE[runtime.status] ?? STATUS_STYLE.unknown}`, children: [
            statusIcon(runtime.status),
            STATUS_LABELS[runtime.status] ?? runtime.status
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${STATUS_STYLE[runtime.healthStatus] ?? STATUS_STYLE.unknown}`, children: STATUS_LABELS[runtime.healthStatus] ?? runtime.healthStatus }),
          active && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[9.5px] font-black text-indigo-700", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { className: "h-3 w-3" }),
            "当前"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h5", { className: "mt-2 truncate text-[12.5px] font-black text-slate-900", children: String(runtime.metadata?.displayName ?? runtime.id) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[10.5px] font-bold text-slate-400", children: [
          runtime.kind,
          " / ",
          runtime.id
        ] })
      ] }),
      busy && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 shrink-0 animate-spin text-brand-500" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid grid-cols-2 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "displayName", value: String(runtime.metadata?.displayName ?? runtime.id), wide: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "baseUrl", value: runtime.baseUrl ?? "None", wide: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "lastCheck", value: formatDate(runtime.lastHealthCheckAt) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "pid", value: runtime.pid === null ? "None" : String(runtime.pid) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoTile, { label: "error", value: runtime.lastError ?? "None", wide: true })
    ] }),
    healthResult && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `mt-3 rounded-xl border p-3 text-[10.5px] font-bold leading-5 ${STATUS_STYLE[healthResult.status] ?? STATUS_STYLE.unknown}`, children: [
      healthResult.message || STATUS_LABELS[healthResult.status] || healthResult.status,
      " (",
      healthResult.durationMs,
      "ms)"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeButton, { onClick: onHealthCheck, disabled: busy, icon: Activity, children: "健康检查" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeButton, { onClick: onSelect, disabled: busy || active, icon: Star, children: "设为当前" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeButton, { onClick: onStart, disabled: busy, icon: Play, children: "启动" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeButton, { onClick: onStop, disabled: busy, icon: Power, children: "停止" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeButton, { onClick: onRestart, disabled: busy, icon: RotateCcw, children: "重启" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "mt-3 group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "cursor-pointer select-none text-[10px] font-black text-slate-400 transition-colors hover:text-slate-600", children: "元数据" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-[10px] leading-5 text-slate-500", children: stringifyMetadata(runtime.metadata) })
    ] })
  ] });
}
function InfoTile({ label, value, wide = false }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `min-w-0 rounded-xl border border-slate-100 bg-white/80 p-2.5 ${wide ? "col-span-2" : ""}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[9.5px] font-black text-slate-400", children: INFO_LABELS[label] ?? label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 truncate text-[10.5px] font-black text-slate-700", title: value, children: displayValue(value) })
  ] });
}
function PanelButton({
  children,
  disabled,
  icon: Icon2,
  onClick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick,
      disabled,
      className: "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { className: "h-3.5 w-3.5" }),
        children
      ]
    }
  );
}
function RuntimeButton({
  children,
  disabled,
  icon: Icon2,
  onClick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick,
      disabled,
      className: "inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { className: "h-3 w-3" }),
        children
      ]
    }
  );
}
const COOPERATIVE_MODEL_ID_BY_ROW_ID = {
  ram: "ram-plus",
  florence2: "florence-2-large",
  clip: "clip-vit-b-32",
  wd_tagger: "wd-vit-tagger-v3"
};
const MODEL_ROWS = [
  {
    id: "ram",
    name: "RAM++",
    role: "通用语义标签",
    capability: "主体、场景、构图和语义标签识别",
    source: "Python AI Worker",
    accent: "bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900/60"
  },
  {
    id: "florence2",
    name: "Florence-2",
    role: "图文描述与 OCR",
    capability: "详细描述、OCR 提取和版面文字分析",
    source: "Python AI Worker",
    accent: "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/60"
  },
  {
    id: "clip",
    name: "OpenCLIP",
    role: "设计语义分类",
    capability: "风格、排版、视觉构图和相似性分类",
    source: "Python AI Worker",
    accent: "bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/60"
  },
  {
    id: "wd_tagger",
    name: "WD Tagger v3",
    role: "插画与动漫标签",
    capability: "插画、角色、姿态和图像标签预测",
    source: "Python AI Worker",
    accent: "bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-900/60"
  },
  {
    id: "joycaption",
    name: "JoyCaption v2",
    role: "深层提示词反推",
    capability: "为复杂视觉素材生成提示词和长描述",
    source: "Python AI Worker",
    accent: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/60"
  },
  {
    id: "qwen_vl",
    name: "Qwen3-VL",
    role: "多模态视觉理解",
    capability: "视觉推理、提示词反推和结构化理解",
    source: "本地原生推理 / OpenAI-compatible",
    accent: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/60"
  }
];
const DEFAULT_LLAMA_BACKEND = {
  id: "llama-local-openai",
  name: "Llama 本地量化模型服务",
  type: "llama-openai",
  enabled: false,
  baseUrl: "http://127.0.0.1:8080/v1",
  apiKey: "local",
  defaultModel: "",
  timeoutMs: 12e4,
  capabilities: {
    chat: true,
    vision: false,
    embeddings: false,
    jsonOutput: true,
    modelList: true,
    modelManagement: false
  },
  priority: 50,
  notes: "适用于 llama.cpp / llama-server 暴露的 OpenAI-compatible API。"
};
const DEFAULT_PROMPT_SETTINGS = {
  backendMode: "llama-openai",
  selectedNativeModelId: "qwen3-vl-4b-instruct",
  selectedExternalBackendId: "llama-local-openai",
  selectedExternalModel: "",
  maxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
  maxImageSize: 1024,
  temperature: 0.6,
  topP: 0.9
};
const DEFAULT_MEMORY_POLICY = {
  clearGpuBeforePromptReverse: "auto",
  forceClearWhenInsufficient: true,
  minFreeVramGBBeforeQwen8B: 10,
  maxGpuMemoryUsagePercent: 92,
  enableGpuMemoryGuard: true,
  enableGpuMemoryPollingDuringInference: true,
  gpuMemoryPollIntervalMs: 1e3
};
const PROMPT_TEMPLATE_LIBRARY = [
  {
    id: DEFAULT_PROMPT_TEMPLATE_ID,
    label: "统一默认反推提示词",
    language: "中文",
    runtime: "Qwen3-VL GGUF / Llama / OpenAI-compatible",
    text: DEFAULT_QWEN3VL_DESIGN_PROMPT
  },
  {
    id: "openai-compatible.vision_prompt.v1",
    label: "OpenAI-compatible 兼容展示",
    language: "中文",
    runtime: "Llama / OpenAI-compatible Vision API",
    text: OPENAI_COMPATIBLE_REVERSE_PROMPT
  }
];
const createExternalBackend = (index) => ({
  ...DEFAULT_LLAMA_BACKEND,
  id: `external-openai-${Date.now()}`,
  name: `OpenAI-compatible 服务 ${index + 1}`,
  type: "openai-compatible",
  enabled: false,
  apiKey: "",
  priority: 100 + index,
  notes: "自定义 OpenAI-compatible API 推理服务。"
});
function isDeveloperMockEnabled() {
  try {
    return new URLSearchParams(window.location.search).get("devMock") === "1" || localStorage.getItem("dam.devMockTelemetry") === "1";
  } catch {
    return false;
  }
}
function normalizeWorkerGpuStatus(raw) {
  if (!raw) {
    return {
      available: false,
      isMock: false,
      deviceName: "Unknown GPU",
      totalMb: 0,
      usedMb: 0,
      freeMb: 0,
      usagePercent: 0,
      error: null
    };
  }
  if ("cudaAvailable" in raw || "totalVramGB" in raw) {
    return {
      available: Boolean(raw.success && raw.cudaAvailable),
      isMock: false,
      deviceName: raw.gpuName || "Unknown GPU",
      totalMb: Math.round(Number(raw.totalVramGB || 0) * 1024),
      usedMb: Math.round(Number(raw.usedVramGB || 0) * 1024),
      freeMb: Math.round(Number(raw.freeVramGB || 0) * 1024),
      usagePercent: Number(raw.usagePercent || 0),
      error: raw.error ?? null
    };
  }
  return {
    available: Boolean(raw.available),
    isMock: Boolean(raw.is_mock),
    deviceName: raw.device_name || "Unknown GPU",
    totalMb: Number(raw.total_vram_mb || 0),
    usedMb: Number(raw.used_vram_mb || 0),
    freeMb: Number(raw.free_vram_mb || 0),
    usagePercent: Number(raw.utilization_percent || 0),
    error: raw.error ?? null
  };
}
function formatGb(mb2) {
  if (!mb2 || mb2 <= 0) return "未知";
  return `${(mb2 / 1024).toFixed(1)} GB`;
}
function formatReleaseDate(value) {
  if (!value) return "未知";
  return value;
}
function normalizeStability(value) {
  return {
    stable: "稳定",
    "gpu-sensitive": "显存敏感",
    experimental: "实验"
  }[value ?? ""] ?? (value || "未知");
}
function currentReverseModelCode(promptSettings, selectedPromptModelId, selectedBackend) {
  if (promptSettings.backendMode === "native-qwen3vl") return selectedPromptModelId || promptSettings.selectedNativeModelId || "未选择";
  return promptSettings.selectedExternalModel || selectedBackend?.defaultModel || selectedBackend?.name || "未选择";
}
function currentReversePromptPreview(promptSettings) {
  if (promptSettings.backendMode === "native-qwen3vl") {
    return {
      title: DEFAULT_PROMPT_TEMPLATE_ID,
      text: DEFAULT_QWEN3VL_DESIGN_PROMPT
    };
  }
  return {
    title: DEFAULT_PROMPT_TEMPLATE_ID,
    text: DEFAULT_QWEN3VL_DESIGN_PROMPT
  };
}
function backendHealthText(backend, backendResults) {
  return backendResults[`health:${backend.id}`] || backendResults[`models:${backend.id}`] || null;
}
function summarizeFallbackBackends(backends, backendResults, matcher, emptyCaption) {
  const matches = backends.filter(matcher);
  const enabled = matches.filter((backend) => backend.enabled);
  const latestHealth = matches.map((backend) => backendHealthText(backend, backendResults)).find(Boolean);
  const primary = enabled[0] ?? matches[0] ?? null;
  if (!primary) {
    return { value: "未配置", caption: emptyCaption };
  }
  return {
    value: enabled.length > 0 ? "已启用" : "已配置",
    caption: latestHealth || primary.defaultModel || primary.name
  };
}
function summarizeOllamaFallback(backends, backendResults) {
  return summarizeFallbackBackends(
    backends,
    backendResults,
    (backend) => backend.type === "ollama" || /ollama/i.test(backend.name) || /:11434\b/.test(backend.baseUrl),
    "Qwen2.5-VL Ollama fallback"
  );
}
function summarizeExternalHttpFallback(backends, backendResults) {
  return summarizeFallbackBackends(
    backends,
    backendResults,
    (backend) => backend.type === "openai-compatible" || backend.type === "custom" || backend.type === "lm-studio",
    "OpenAI-compatible / LM Studio / custom HTTP"
  );
}
function GpuMemoryChart({
  samples,
  totalMb,
  telemetryTrusted
}) {
  const points = samples.length ? samples : [{ time: Date.now(), usagePercent: 0, freeMb: 0 }];
  const width = 320;
  const height = 76;
  const maxIndex = Math.max(1, points.length - 1);
  const line = points.map((sample, index) => {
    const x2 = index / maxIndex * width;
    const y2 = height - Math.min(100, Math.max(0, sample.usagePercent)) / 100 * height;
    return `${index === 0 ? "M" : "L"} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }).join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-brand-100 bg-brand-50/40 p-2 text-[10px] font-bold text-slate-600 shadow-inner dark:border-brand-900/50 dark:bg-brand-950/20 dark:text-slate-300", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "专用 GPU 内存" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: telemetryTrusted ? formatGb(totalMb) : "Unknown" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative h-[72px] overflow-hidden rounded-lg border border-brand-100 bg-white/80 dark:border-brand-900/50 dark:bg-slate-950/60", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "absolute inset-0 opacity-70",
          style: {
            backgroundImage: "linear-gradient(rgba(99,102,241,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.10) 1px, transparent 1px)",
            backgroundSize: "16px 8px"
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: `0 0 ${width} ${height}`, className: "absolute inset-0 h-full w-full", preserveAspectRatio: "none", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: area, fill: telemetryTrusted ? "rgba(99, 102, 241, 0.18)" : "rgba(100, 116, 139, 0.12)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: line, fill: "none", stroke: telemetryTrusted ? "#6366f1" : "#64748b", strokeWidth: "2" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-brand-100 bg-white/90 px-2 py-0.5 text-[11px] text-brand-600 shadow-sm dark:border-brand-900/70 dark:bg-slate-900/90 dark:text-brand-300", children: "专用 GPU 内存" })
    ] })
  ] });
}
function PromptPreview({ title, text }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1 flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[10px] font-black uppercase tracking-wide text-brand-500 dark:text-brand-300", children: title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 text-[9px] font-black text-slate-400 dark:text-slate-500", children: "滚动查看完整提示词" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-[104px] overflow-y-auto rounded-lg bg-white px-2 py-1.5 text-[10.5px] font-bold leading-5 text-slate-500 dark:bg-slate-900 dark:text-slate-400 whitespace-pre-wrap", children: text })
  ] });
}
function TaskListPreview({ queueStats }) {
  const rows = [
    { label: "运行中", value: queueStats.running || 0, tone: "bg-emerald-500" },
    { label: "排队中", value: queueStats.queued || 0, tone: "bg-sky-500" },
    { label: "已完成", value: queueStats.completed || 0, tone: "bg-slate-400" },
    { label: "失败", value: queueStats.failed || 0, tone: "bg-rose-500" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2", children: rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `h-2 w-2 shrink-0 rounded-full ${row.tone}` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: row.label })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-slate-950 dark:text-slate-50", children: row.value })
  ] }, row.label)) });
}
function PromptSystemPanel({
  activePromptTitle,
  promptSettings,
  customTemplates,
  updateSettings
}) {
  const [templateName, setTemplateName] = reactExports.useState("");
  const [templateContent, setTemplateContent] = reactExports.useState("");
  const templates = [
    ...PROMPT_TEMPLATE_LIBRARY,
    ...customTemplates.map((template) => ({
      id: template.id,
      label: template.name,
      language: template.language,
      runtime: "用户自定义模板",
      text: template.content
    }))
  ];
  const saveTemplate = async () => {
    const name = templateName.trim();
    const content = templateContent.trim();
    if (!name || !content) return;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const next = {
      id: `custom.prompt.${Date.now()}`,
      name,
      content,
      language: "zh-CN",
      createdAt: now,
      updatedAt: now
    };
    await updateSettings({ promptReverseTemplates: [...customTemplates, next] });
    setTemplateName("");
    setTemplateContent("");
  };
  const removeTemplate = async (id2) => {
    await updateSettings({ promptReverseTemplates: customTemplates.filter((template) => template.id !== id2) });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[15px] font-black text-slate-950 dark:text-slate-50", children: "反推提示词系统" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 max-w-3xl text-[11.5px] font-semibold leading-5 text-slate-400 dark:text-slate-500", children: "将原本隐藏在推理脚本里的提示词模板前端化展示。这里展示文本指令系统；图片输入仍由运行时安全传入，不在控制台展示 base64 或文件内容。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { tone: "muted", children: promptSettings.backendMode === "native-qwen3vl" ? "当前：统一默认模板" : "当前：统一默认模板" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-4 xl:grid-cols-2", children: templates.map((template) => {
      const active = activePromptTitle === template.id;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `rounded-2xl border p-4 ${active ? "border-brand-200 bg-brand-50/60 dark:border-brand-900/70 dark:bg-brand-950/20" : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-start justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "truncate text-[13px] font-black text-slate-900 dark:text-slate-100", children: template.label }),
              active && /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { tone: "good", children: "当前使用" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: template.id }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "/" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: template.language }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "/" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: template.runtime })
            ] })
          ] }),
          template.id.startsWith("custom.prompt.") && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => removeTemplate(template.id),
              className: "rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-600 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
              children: "删除"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "max-h-[300px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-white bg-white p-4 text-[11px] font-semibold leading-6 text-slate-600 shadow-inner dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300", children: template.text })
      ] }, template.id);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[13px] font-black text-slate-900 dark:text-slate-100", children: "添加自定义提示词模板" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)_auto]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "模板名称", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: templateName, onChange: (event) => setTemplateName(event.target.value), className: "control", placeholder: "例如：商品海报深度反推" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "完整提示词", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            value: templateContent,
            onChange: (event) => setTemplateContent(event.target.value),
            className: "control min-h-[120px] resize-y",
            placeholder: "输入完整反推提示词。建议继续要求返回 englishPrompt、chineseDescription、shortCaption 以及中文 tags。"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { tone: "primary", onClick: saveTemplate, disabled: !templateName.trim() || !templateContent.trim(), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
          "添加模板"
        ] }) })
      ] })
    ] })
  ] });
}
function statusTone(tone) {
  return {
    good: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300",
    warn: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300",
    bad: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300",
    muted: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
  }[tone];
}
function StatusPill({ tone, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-flex items-center rounded-full border px-2.5 py-1 text-[10.5px] font-extrabold ${statusTone(tone)}`, children });
}
function MiniButton({
  children,
  onClick,
  disabled,
  tone = "default"
}) {
  const toneClass = tone === "primary" ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-800 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white" : tone === "danger" ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      onClick,
      disabled,
      className: `inline-flex min-h-[38px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-[11.5px] font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`,
      children
    }
  );
}
function AiConsolePage() {
  const { settings, updateSettings, loadSettings } = useSettingsStore();
  const [activeTab, setActiveTab] = reactExports.useState("overview");
  const [settingsOpen, setSettingsOpen] = reactExports.useState(false);
  const [selectedModelId, setSelectedModelId] = reactExports.useState(null);
  const [expandedModelFamilies, setExpandedModelFamilies] = reactExports.useState({ qwen_vl: true });
  const [aiStatus, setAiStatus] = reactExports.useState(null);
  const [gpuStatus, setGpuStatus] = reactExports.useState(null);
  const [modelsList, setModelsList] = reactExports.useState([]);
  const [localGgufModels, setLocalGgufModels] = reactExports.useState([]);
  const [gpuSamples, setGpuSamples] = reactExports.useState([]);
  const [macOSWorkerProbe, setMacOSWorkerProbe] = reactExports.useState(null);
  const [pythonMpsStatus, setPythonMpsStatus] = reactExports.useState(null);
  const [clipSiglipOnnxStatus, setClipSiglipOnnxStatus] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState({});
  const [toast, setToast] = reactExports.useState(null);
  const [clearResult, setClearResult] = reactExports.useState(null);
  const [backendResults, setBackendResults] = reactExports.useState({});
  const [backendModelLists, setBackendModelLists] = reactExports.useState({});
  const [llamaHardware, setLlamaHardware] = reactExports.useState(null);
  const [llamaPlan, setLlamaPlan] = reactExports.useState(null);
  const [llamaStatus, setLlamaStatus] = reactExports.useState(null);
  const [llamaTest, setLlamaTest] = reactExports.useState(null);
  const [llamaRunning, setLlamaRunning] = reactExports.useState(false);
  const [selectedLlamaModelId, setSelectedLlamaModelId] = reactExports.useState("");
  const [llamaInstallLogs, setLlamaInstallLogs] = reactExports.useState([]);
  const [logs, setLogs] = reactExports.useState([]);
  const [cooperativeModels, setCooperativeModels] = reactExports.useState({});
  const [cooperativeCleanups, setCooperativeCleanups] = reactExports.useState([]);
  const [textBoxProvider, setTextBoxProvider] = reactExports.useState(settings.textBoxProvider ?? "easyocr");
  const [enableTextColorAnalysis, setEnableTextColorAnalysis] = reactExports.useState(settings.enableTextColorAnalysis ?? true);
  const [ocrTimeoutMs, setOcrTimeoutMs] = reactExports.useState(settings.ocrTimeoutMs ?? 15e3);
  const [maxTextBoxesPerImage, setMaxTextBoxesPerImage] = reactExports.useState(settings.maxTextBoxesPerImage ?? 30);
  const [selectedPromptModelId, setSelectedPromptModelId] = reactExports.useState(settings.selectedPromptModelId ?? "qwen3-vl-4b-instruct");
  const [promptSettings, setPromptSettings] = reactExports.useState(settings.promptReverseSettings ?? DEFAULT_PROMPT_SETTINGS);
  const [memoryPolicy, setMemoryPolicy] = reactExports.useState({ ...DEFAULT_MEMORY_POLICY, ...settings.memoryPolicy ?? {} });
  const [aiBackends, setAiBackends] = reactExports.useState(settings.aiBackends?.length ? settings.aiBackends : [DEFAULT_LLAMA_BACKEND]);
  const devMockEnabled = isDeveloperMockEnabled();
  const workerGpu = normalizeWorkerGpuStatus(aiStatus?.gpu_status);
  const directGpu = normalizeWorkerGpuStatus(gpuStatus);
  const effectiveGpu = workerGpu.available || workerGpu.isMock ? workerGpu : directGpu;
  const isWorkerOffline = aiStatus?.offline ?? true;
  const isMockTelemetry = effectiveGpu.isMock;
  const telemetryTrusted = effectiveGpu.available && (!effectiveGpu.isMock || devMockEnabled);
  const loadedModels = aiStatus?.loaded_models ?? {};
  const queueStats = aiStatus?.queue_stats ?? { queued: 0, running: 0, completed: 0, failed: 0 };
  const selectedBackend = aiBackends.find((backend) => backend.id === promptSettings.selectedExternalBackendId);
  const ollamaFallback = reactExports.useMemo(() => summarizeOllamaFallback(aiBackends, backendResults), [aiBackends, backendResults]);
  const externalHttpFallback = reactExports.useMemo(() => summarizeExternalHttpFallback(aiBackends, backendResults), [aiBackends, backendResults]);
  const activeBackendLabel = promptSettings.backendMode === "native-qwen3vl" ? "Python Transformers 实验路线" : selectedBackend?.name || (promptSettings.backendMode === "llama-openai" ? "Llama 本地服务" : "OpenAI-compatible");
  const activeReverseModel = currentReverseModelCode(promptSettings, selectedPromptModelId, selectedBackend);
  const activePromptPreview = currentReversePromptPreview(promptSettings);
  const riskTone = reactExports.useMemo(() => {
    if (!telemetryTrusted) return "warn";
    if (effectiveGpu.usagePercent >= memoryPolicy.maxGpuMemoryUsagePercent) return "bad";
    if (effectiveGpu.freeMb > 0 && effectiveGpu.freeMb < memoryPolicy.minFreeVramGBBeforeQwen8B * 1024) return "warn";
    return "good";
  }, [effectiveGpu.freeMb, effectiveGpu.usagePercent, memoryPolicy.maxGpuMemoryUsagePercent, memoryPolicy.minFreeVramGBBeforeQwen8B, telemetryTrusted]);
  const selectedModel = selectedModelId ? MODEL_ROWS.find((model) => model.id === selectedModelId) : null;
  const selectedExternalModels = promptSettings.selectedExternalBackendId ? backendModelLists[promptSettings.selectedExternalBackendId] ?? [] : [];
  const installedNativeModels = modelsList.filter((model) => model.isDownloaded);
  const installedGgufModels = localGgufModels.filter((model) => model.isDownloaded);
  const installedModelCount = installedNativeModels.length + installedGgufModels.length;
  const currentNativeModel = modelsList.find((model) => model.id === selectedPromptModelId);
  const currentGgufModel = localGgufModels.find((model) => model.filename === promptSettings.selectedExternalModel || model.id === promptSettings.selectedExternalModel);
  const currentModelReady = promptSettings.backendMode === "native-qwen3vl" ? Boolean(currentNativeModel?.isDownloaded) : promptSettings.backendMode === "llama-openai" ? Boolean(currentGgufModel?.isDownloaded || llamaStatus?.serverPid) : Boolean(selectedBackend?.enabled);
  const latestLogLine = logs[0] ?? "暂无本地操作日志";
  const pushLog = (message) => {
    setLogs((prev) => [`${(/* @__PURE__ */ new Date()).toLocaleTimeString()} ${message}`, ...prev].slice(0, 80));
  };
  const pushLlamaInstallLog = (message) => {
    setLlamaInstallLogs((prev) => [`${(/* @__PURE__ */ new Date()).toLocaleTimeString()} ${message}`, ...prev].slice(0, 160));
  };
  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };
  const setBusy = (key, value) => {
    setLoading((prev) => ({ ...prev, [key]: value }));
  };
  const fetchConsoleStatus = async (source = "auto") => {
    const api2 = window.electronAPI;
    setBusy("refresh", true);
    try {
      if (!api2) {
        setAiStatus({ offline: true, error: "Electron bridge is unavailable in browser preview." });
        setGpuStatus(null);
        setModelsList([]);
        if (source === "manual") {
          showToast("浏览器预览无法连接桌面端 AI 服务");
          pushLog("Preview mode: Electron bridge unavailable");
        }
        return;
      }
      const [status, gpu, models, llama, ggufModels, macOSProbe, clipSiglipStatus] = await Promise.all([
        api2.aiModelStatus?.().catch((err) => ({ offline: true, error: String(err) })),
        api2.aiWorkerGetGpuStatus?.().catch(() => null),
        api2.aiModelList?.().catch(() => []),
        api2.llamaRuntimeGetStatus?.().catch(() => null),
        api2.llamaRuntimeListLocalModels?.().catch(() => []),
        api2.aiRuntime?.getMacOSCapabilities ? api2.aiRuntime.getMacOSCapabilities().catch(() => null) : Promise.resolve(null),
        api2.aiRuntime?.getClipSiglipOnnxStatus ? api2.aiRuntime.getClipSiglipOnnxStatus().catch(() => null) : Promise.resolve(null)
      ]);
      setAiStatus(status);
      setGpuStatus(gpu);
      setModelsList(Array.isArray(models) ? models : []);
      setLocalGgufModels(Array.isArray(ggufModels) ? ggufModels : []);
      if (llama) {
        setLlamaStatus(llama);
        if (typeof llama.serverRunning === "boolean") {
          setLlamaRunning(llama.serverRunning);
        }
      }
      if (macOSProbe?.success && macOSProbe.data?.capabilities) {
        setMacOSWorkerProbe(macOSProbe.data.capabilities);
      } else {
        setMacOSWorkerProbe(null);
      }
      if (status?.offline === false && api2.aiRuntime?.getPythonMpsStatus) {
        const pythonMps = await api2.aiRuntime.getPythonMpsStatus().catch(() => null);
        if (pythonMps?.success && pythonMps.data) {
          setPythonMpsStatus(pythonMps.data);
        } else {
          setPythonMpsStatus(null);
        }
      } else {
        setPythonMpsStatus(null);
      }
      if (clipSiglipStatus?.success && clipSiglipStatus.data) {
        setClipSiglipOnnxStatus(clipSiglipStatus.data);
      } else {
        setClipSiglipOnnxStatus(null);
      }
      if (promptSettings?.backendMode === "llama-openai" && typeof llama?.serverRunning !== "boolean" && !llama?.serverPid) {
        try {
          const baseUrl = aiBackends.find((b) => b.id === promptSettings.selectedExternalBackendId)?.baseUrl;
          const result = await api2.llamaHealthCheck?.(baseUrl).catch(() => ({ running: false }));
          if (result?.running) {
            setLlamaRunning(true);
            if (llama) {
              setLlamaStatus({ ...llama, serverPid: 1, phase: "running" });
            }
          } else {
            setLlamaRunning(false);
          }
        } catch {
          setLlamaRunning(false);
        }
      } else {
        setLlamaRunning(Boolean(llama?.serverRunning || llama?.serverPid));
      }
      const sample = normalizeWorkerGpuStatus(status?.gpu_status).available ? normalizeWorkerGpuStatus(status?.gpu_status) : normalizeWorkerGpuStatus(gpu);
      setGpuSamples((prev) => {
        const next = [...prev, { time: Date.now(), usagePercent: sample.usagePercent, freeMb: sample.freeMb }];
        return next.slice(-24);
      });
      if (source === "manual") {
        showToast(status?.offline ? "AI Worker 未连接，状态已刷新" : "AI 状态已刷新");
        pushLog(status?.offline ? "Manual refresh: worker offline" : "Manual refresh completed");
      }
    } catch (err) {
      if (source === "manual") {
        showToast("刷新失败，详情已写入日志");
        pushLog(`Manual refresh failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      setBusy("refresh", false);
    }
  };
  reactExports.useEffect(() => {
    loadSettings();
    fetchConsoleStatus();
    fetchCooperativeModels();
    const timer = window.setInterval(fetchConsoleStatus, 5e3);
    return () => window.clearInterval(timer);
  }, []);
  reactExports.useEffect(() => {
    setTextBoxProvider(settings.textBoxProvider ?? "easyocr");
    setEnableTextColorAnalysis(settings.enableTextColorAnalysis ?? true);
    setOcrTimeoutMs(settings.ocrTimeoutMs ?? 15e3);
    setMaxTextBoxesPerImage(settings.maxTextBoxesPerImage ?? 30);
    setSelectedPromptModelId(settings.selectedPromptModelId ?? "qwen3-vl-4b-instruct");
    setPromptSettings(settings.promptReverseSettings ?? DEFAULT_PROMPT_SETTINGS);
    setMemoryPolicy({ ...DEFAULT_MEMORY_POLICY, ...settings.memoryPolicy ?? {} });
    setAiBackends(settings.aiBackends?.length ? settings.aiBackends : [DEFAULT_LLAMA_BACKEND]);
  }, [settings]);
  const handleSaveAiSettings = async () => {
    setBusy("save", true);
    try {
      await updateSettings({
        enableTextColorAnalysis,
        textBoxProvider,
        ocrTimeoutMs,
        maxTextBoxesPerImage,
        selectedPromptModelId,
        selectedPromptModelPath: modelsList.find((model) => model.id === selectedPromptModelId)?.localPath ?? settings.selectedPromptModelPath,
        promptReverseSettings: {
          ...promptSettings,
          selectedNativeModelId: selectedPromptModelId
        },
        memoryPolicy,
        aiBackends
      });
      showToast("AI 设置已保存");
      pushLog("AI settings saved");
    } finally {
      setBusy("save", false);
    }
  };
  const [installingMacOSDeps, setInstallingMacOSDeps] = reactExports.useState(false);
  const handleInstallMacOSDeps = async () => {
    const api2 = window.electronAPI;
    if (!api2?.macosAiInstallDeps) {
      showToast("安装接口不可用");
      return;
    }
    setInstallingMacOSDeps(true);
    showToast("正在安装 macOS AI 依赖 (torch, transformers, onnxruntime)...");
    pushLog("macOS AI deps installation started");
    try {
      const result = await api2.macosAiInstallDeps();
      if (result?.success) {
        showToast("macOS AI 依赖安装完成");
        pushLog("macOS AI deps installation completed");
      } else {
        const message = result?.error || result?.output || `安装进程退出码 ${result?.exitCode ?? "unknown"}`;
        showToast("安装失败：" + String(message).slice(0, 120));
        pushLog("macOS AI deps install failed: " + String(message));
      }
      await fetchConsoleStatus("manual");
    } catch (err) {
      showToast("安装失败: " + String(err));
      pushLog("macOS AI deps install failed: " + String(err));
    } finally {
      setInstallingMacOSDeps(false);
    }
  };
  const handleClearGpuMemory = async () => {
    const api2 = window.electronAPI;
    if (!api2?.aiWorkerClearGpuMemory) {
      setClearResult({ success: false, before: null, after: null, error: "当前环境无法访问桌面端显存清理接口。" });
      showToast("显存清理接口不可用");
      pushLog("VRAM clear unavailable");
      return;
    }
    setBusy("clear", true);
    try {
      const result = await api2.aiWorkerClearGpuMemory();
      setClearResult(result);
      showToast(result?.success ? "显存清理已完成" : "显存清理失败");
      pushLog(result?.success ? "VRAM clear completed" : `VRAM clear failed: ${result?.error || "unknown error"}`);
      await fetchConsoleStatus();
    } finally {
      setBusy("clear", false);
    }
  };
  const handleForceUnload = async () => {
    const api2 = window.electronAPI;
    if (!api2?.aiModelUnload) {
      showToast("模型卸载接口不可用");
      pushLog("Model unload unavailable");
      return;
    }
    setBusy("unload", true);
    try {
      const result = await api2.aiModelUnload();
      showToast(result?.success ? "已卸载 Worker 中的模型" : "模型卸载失败");
      pushLog(result?.success ? "Python worker models unloaded" : `Model unload failed: ${result?.error || "unknown error"}`);
      await fetchConsoleStatus();
    } finally {
      setBusy("unload", false);
    }
  };
  const fetchCooperativeModels = async () => {
    const api2 = window.electronAPI;
    if (!api2?.cooperativeModelList) return;
    try {
      const result = await api2.cooperativeModelList();
      if (result?.success && Array.isArray(result.models)) {
        const state = {};
        for (const m2 of result.models) {
          state[m2.id] = {
            isDownloaded: Boolean(m2.isDownloaded),
            isDownloading: false,
            progress: m2.isDownloaded ? 100 : 0,
            message: m2.isDownloaded ? "已下载" : "未下载",
            localPath: m2.localPath
          };
        }
        setCooperativeModels(state);
      }
    } catch (err) {
      pushLog("Cooperative model list failed: " + String(err));
    }
  };
  const handleDownloadCooperativeModel = async (modelId) => {
    const api2 = window.electronAPI;
    if (!api2?.cooperativeModelDownload) {
      showToast("模型下载接口不可用");
      return;
    }
    const registryModelId = COOPERATIVE_MODEL_ID_BY_ROW_ID[modelId] ?? modelId;
    setCooperativeModels((prev) => ({
      ...prev,
      [registryModelId]: { ...prev[registryModelId] || { isDownloaded: false, isDownloading: false, progress: 0, message: "" }, isDownloading: true, progress: 0, message: "准备下载..." }
    }));
    try {
      const result = await api2.cooperativeModelDownload(registryModelId);
      if (!result?.success) {
        setCooperativeModels((prev) => ({
          ...prev,
          [registryModelId]: { ...prev[registryModelId] || { isDownloaded: false, isDownloading: false, progress: 0, message: "" }, isDownloading: false, message: result?.error || "下载启动失败" }
        }));
        showToast("下载启动失败：" + (result?.error || "未知错误"));
        pushLog("Cooperative model download failed: " + (result?.error || "unknown"));
      }
    } catch (err) {
      setCooperativeModels((prev) => ({
        ...prev,
        [registryModelId]: { ...prev[registryModelId] || { isDownloaded: false, isDownloading: false, progress: 0, message: "" }, isDownloading: false, message: String(err) }
      }));
      pushLog("Cooperative model download error: " + String(err));
    }
  };
  const handleCancelCooperativeDownload = async (modelId) => {
    const api2 = window.electronAPI;
    if (!api2?.cooperativeModelCancelDownload) return;
    const registryModelId = COOPERATIVE_MODEL_ID_BY_ROW_ID[modelId] ?? modelId;
    try {
      await api2.cooperativeModelCancelDownload(registryModelId);
      setCooperativeModels((prev) => ({
        ...prev,
        [registryModelId]: { ...prev[registryModelId] || { isDownloaded: false, isDownloading: false, progress: 0, message: "" }, isDownloading: false, message: "已取消" }
      }));
      showToast("已取消下载");
    } catch (err) {
      pushLog("Cooperative model cancel failed: " + String(err));
    }
  };
  const handleDeleteCooperativeModel = async (modelId) => {
    const api2 = window.electronAPI;
    if (!api2?.cooperativeModelDelete) return;
    const registryModelId = COOPERATIVE_MODEL_ID_BY_ROW_ID[modelId] ?? modelId;
    try {
      const result = await api2.cooperativeModelDelete(registryModelId);
      if (result?.success) {
        setCooperativeModels((prev) => ({
          ...prev,
          [registryModelId]: { isDownloaded: false, isDownloading: false, progress: 0, message: "已删除" }
        }));
        showToast("模型已删除");
        pushLog("Cooperative model deleted: " + registryModelId);
      } else {
        showToast("删除失败：" + (result?.error || "未知错误"));
      }
    } catch (err) {
      pushLog("Cooperative model delete failed: " + String(err));
    }
  };
  reactExports.useEffect(() => {
    const api2 = window.electronAPI;
    if (!api2?.onCooperativeModelDownloadProgress) return;
    for (const cleanup of cooperativeCleanups) {
      try {
        cleanup();
      } catch {
      }
    }
    const cleanups = [];
    const modelIds = Object.values(COOPERATIVE_MODEL_ID_BY_ROW_ID);
    for (const modelId of modelIds) {
      const cleanup = api2.onCooperativeModelDownloadProgress(modelId, (_event, data) => {
        if (!data || !data.type) return;
        setCooperativeModels((prev) => {
          const existing = prev[modelId] || { isDownloaded: false, isDownloading: false, progress: 0, message: "" };
          if (data.type === "progress") {
            return { ...prev, [modelId]: { ...existing, isDownloading: true, progress: data.progress ?? existing.progress, message: data.message || existing.message } };
          }
          if (data.type === "complete" || data.type === "exit" && data.success) {
            return { ...prev, [modelId]: { ...existing, isDownloaded: true, isDownloading: false, progress: 100, message: "下载完成" } };
          }
          if (data.type === "error" || data.type === "exit" && !data.success) {
            return { ...prev, [modelId]: { ...existing, isDownloading: false, isDownloaded: false, message: data.error?.message || data.message || "下载失败" } };
          }
          return prev;
        });
      });
      cleanups.push(cleanup);
    }
    setCooperativeCleanups(cleanups);
    return () => {
      for (const cleanup of cleanups) {
        try {
          cleanup();
        } catch {
        }
      }
    };
  }, []);
  const updateBackend = (id2, patch) => {
    setAiBackends((prev) => prev.map((backend) => backend.id === id2 ? { ...backend, ...patch } : backend));
  };
  const addBackend = () => {
    setAiBackends((prev) => [...prev, createExternalBackend(prev.length)]);
    setActiveTab("services");
    showToast("已添加推理服务草稿");
    pushLog("External backend draft added");
  };
  const testBackend = async (backend) => {
    const api2 = window.electronAPI;
    if (!api2?.aiBackendHealthCheck) {
      setBackendResults((prev) => ({ ...prev, [`health:${backend.id}`]: "当前环境无法访问桌面端推理服务健康检查接口。" }));
      showToast("推理服务健康检查接口不可用");
      pushLog(`${backend.name} health check unavailable`);
      return;
    }
    setBusy(`health:${backend.id}`, true);
    try {
      const result = await api2.aiBackendHealthCheck({ backendId: backend.id, config: backend });
      setBackendResults((prev) => ({
        ...prev,
        [`health:${backend.id}`]: result.success ? `连接成功${result.latencyMs ? ` / ${result.latencyMs}ms` : ""}` : `${result.error?.code ?? "BACKEND_CONNECTION_FAILED"}: ${result.error?.message ?? "连接失败"}`
      }));
      showToast(result.success ? "推理服务连接成功" : "推理服务连接失败");
      pushLog(`${backend.name} health check ${result.success ? "passed" : "failed"}`);
    } finally {
      setBusy(`health:${backend.id}`, false);
    }
  };
  const fetchBackendModels = async (backend) => {
    const api2 = window.electronAPI;
    if (!api2?.aiBackendListModels) {
      setBackendResults((prev) => ({ ...prev, [`models:${backend.id}`]: "当前环境无法访问桌面端模型列表接口。" }));
      showToast("模型列表接口不可用");
      pushLog(`${backend.name} model list unavailable`);
      return;
    }
    setBusy(`models:${backend.id}`, true);
    try {
      const result = await api2.aiBackendListModels({ backendId: backend.id, config: backend });
      if (result.success) {
        const models = result.models.map((model) => model.id);
        setBackendModelLists((prev) => ({ ...prev, [backend.id]: models }));
        setBackendResults((prev) => ({ ...prev, [`models:${backend.id}`]: `已读取 ${models.length} 个模型` }));
        showToast(`已读取 ${models.length} 个模型`);
      } else {
        setBackendResults((prev) => ({
          ...prev,
          [`models:${backend.id}`]: `${result.error?.code ?? "BACKEND_MODEL_LIST_FAILED"}: ${result.error?.message ?? "拉取失败"}`
        }));
        showToast("模型列表拉取失败");
      }
    } finally {
      setBusy(`models:${backend.id}`, false);
    }
  };
  const detectLlamaHardware = async () => {
    const api2 = window.electronAPI;
    if (!api2?.llamaRuntimeDetectHardware) {
      showToast("硬件分析接口不可用");
      pushLog("Llama hardware detection unavailable");
      return;
    }
    setBusy("llama-detect", true);
    try {
      const hardware = await api2.llamaRuntimeDetectHardware();
      setLlamaHardware(hardware);
      showToast("硬件分析完成");
      pushLog(`Llama hardware detected: ${hardware.gpuName || "no NVIDIA GPU"}`);
    } finally {
      setBusy("llama-detect", false);
    }
  };
  const createLlamaPlan = async () => {
    const api2 = window.electronAPI;
    if (!api2?.llamaRuntimeCreateInstallPlan) {
      showToast("安装方案接口不可用");
      pushLog("Llama install plan unavailable");
      return;
    }
    setBusy("llama-plan", true);
    try {
      const plan = await api2.llamaRuntimeCreateInstallPlan({ modelRootDir: settings.modelRootDir });
      setLlamaPlan(plan);
      setSelectedLlamaModelId(plan.recommendedModel.id);
      setLlamaInstallLogs([
        `${(/* @__PURE__ */ new Date()).toLocaleTimeString()} 安装方案已生成：${plan.accelerator} / ${plan.recommendedModel.name}`,
        ...plan.warnings.map((warning2) => `${(/* @__PURE__ */ new Date()).toLocaleTimeString()} 提示：${warning2}`)
      ].slice(0, 160));
      showToast("安装方案已生成");
      pushLog(`Llama install plan created: ${plan.accelerator} / ${plan.recommendedModel.name}`);
    } finally {
      setBusy("llama-plan", false);
    }
  };
  const createSelectedLlamaPlan = () => {
    if (!llamaPlan) return null;
    const selectedModel2 = llamaPlan.modelCandidates.find((model) => model.id === selectedLlamaModelId) ?? llamaPlan.recommendedModel;
    const separator = llamaPlan.installRoot.includes("\\") ? "\\" : "/";
    return {
      ...llamaPlan,
      recommendedModel: selectedModel2,
      modelDir: `${llamaPlan.installRoot.replace(/[\\/]+$/, "")}${separator}models${separator}gguf${separator}${selectedModel2.id}`
    };
  };
  const startLlamaInstall = async () => {
    const api2 = window.electronAPI;
    const plan = createSelectedLlamaPlan();
    if (!api2?.llamaRuntimeStartInstall || !plan) {
      showToast(plan ? "安装接口不可用" : "请先生成安装方案");
      pushLog(plan ? "Llama install API unavailable" : "Llama install blocked: no plan");
      return;
    }
    setBusy("llama-install", true);
    pushLlamaInstallLog(`开始安装：${plan.accelerator} / ${plan.recommendedModel.name}`);
    let unsubscribe;
    if (api2.onLlamaRuntimeInstallProgress) {
      unsubscribe = api2.onLlamaRuntimeInstallProgress(plan.installId, (_event, data) => {
        setLlamaStatus((prev) => ({
          ...prev ?? { baseUrl: plan.baseUrl },
          installId: data.installId,
          phase: data.phase,
          progress: data.progress,
          message: data.message,
          installRoot: plan.installRoot,
          runtimeDir: plan.runtimeDir,
          baseUrl: plan.baseUrl,
          error: data.error
        }));
        pushLlamaInstallLog(`${data.phase} ${data.progress}% - ${data.message}${data.detail ? ` ${data.detail}` : ""}`);
      });
    }
    try {
      const status = await api2.llamaRuntimeStartInstall({ plan });
      setLlamaStatus(status);
      showToast(status.phase === "complete" ? "Llama 安装完成" : status.message || "Llama 安装状态已更新");
      pushLog(status.phase === "complete" ? "Llama install completed" : `Llama install: ${status.message}`);
      await fetchConsoleStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      showToast("Llama 安装失败");
      pushLlamaInstallLog(`安装失败：${message}`);
      pushLog(`Llama install failed: ${message}`);
    } finally {
      unsubscribe?.();
      setBusy("llama-install", false);
    }
  };
  const cancelLlamaInstall = async () => {
    const api2 = window.electronAPI;
    if (!api2?.llamaRuntimeCancelInstall) {
      showToast("取消安装接口不可用");
      pushLog("Llama install cancel unavailable");
      return;
    }
    setBusy("llama-cancel-install", true);
    try {
      const status = await api2.llamaRuntimeCancelInstall();
      setLlamaStatus(status);
      showToast("已请求取消 Llama 安装");
      pushLlamaInstallLog("已请求取消安装");
      pushLog("Llama install cancel requested");
    } finally {
      setBusy("llama-cancel-install", false);
    }
  };
  const startLlamaServer = async () => {
    const api2 = window.electronAPI;
    if (!api2?.llamaRuntimeStartServer) {
      showToast("启动推理接口不可用");
      pushLog("Llama server start unavailable");
      return;
    }
    setBusy("llama-start", true);
    try {
      const status = await api2.llamaRuntimeStartServer(llamaPlan ? { plan: llamaPlan } : void 0);
      setLlamaStatus(status);
      showToast(status.phase === "complete" ? "Llama 服务已启动" : status.message || "Llama 服务状态已更新");
      pushLog(status.phase === "complete" ? "Llama server started" : `Llama server: ${status.message}`);
    } finally {
      setBusy("llama-start", false);
    }
  };
  const stopLlamaServer = async () => {
    const api2 = window.electronAPI;
    if (!api2?.llamaRuntimeStopServer) {
      showToast("停止推理服务接口不可用");
      pushLog("Llama server stop unavailable");
      return;
    }
    setBusy("llama-stop", true);
    try {
      const status = await api2.llamaRuntimeStopServer();
      setLlamaStatus(status);
      showToast("Llama 推理服务已停止");
      pushLog("Llama server stopped");
      await fetchConsoleStatus();
    } finally {
      setBusy("llama-stop", false);
    }
  };
  const testLlamaServer = async () => {
    const api2 = window.electronAPI;
    if (!api2?.llamaRuntimeTestServer) {
      setLlamaTest({
        success: false,
        baseUrl: "http://127.0.0.1:8080/v1",
        models: [],
        chatOk: false,
        error: { code: "BRIDGE_UNAVAILABLE", message: "当前环境无法访问桌面端 Llama 连接测试接口。" }
      });
      showToast("Llama 连接测试接口不可用");
      pushLog("Llama server test unavailable");
      return;
    }
    setBusy("llama-test", true);
    try {
      const result = await api2.llamaRuntimeTestServer({ baseUrl: "http://127.0.0.1:8080/v1" });
      setLlamaTest(result);
      showToast(result.success ? "Llama 连接测试成功" : "Llama 连接测试失败");
      pushLog(result.success ? `Llama server test passed: ${result.models.join(", ") || "no model name"}` : `Llama server test failed: ${result.error?.message || "unknown error"}`);
    } finally {
      setBusy("llama-test", false);
    }
  };
  const openModelDetail = (model) => {
    setSelectedModelId(model.id);
    setActiveTab("models");
    if (model.id === "qwen_vl") {
      setExpandedModelFamilies((prev) => ({ ...prev, qwen_vl: !prev.qwen_vl }));
    }
    showToast(`已打开 ${model.name} 详情`);
    pushLog(`Model detail opened: ${model.name}`);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full overflow-y-auto text-slate-900 dark:text-slate-100", children: [
    toast && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed right-8 top-20 z-50 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-[12px] font-extrabold text-emerald-700 shadow-card-hover dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-4 w-4" }),
      toast
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-full flex-col gap-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "min-w-0 flex-1 space-y-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10.5px] font-black uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3.5 w-3.5 text-brand-500" }),
              "核心管理模块"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-3 text-[26px] font-black tracking-tight text-slate-950 dark:text-slate-50", children: "AI 运行控制台" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 max-w-3xl text-[13px] font-semibold leading-6 text-slate-500 dark:text-slate-400", children: "集中管理本地模型、视觉提示词反推、自动化打标流程、推理服务与显存安全策略。" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { tone: "primary", onClick: () => setSettingsOpen(true), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "relative inline-flex h-4 w-4 items-center justify-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "h-4 w-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Settings$1, { className: "absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-slate-950 dark:bg-slate-50" })
              ] }),
              "AI 设置"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { onClick: () => fetchConsoleStatus("manual"), disabled: loading.refresh, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `h-4 w-4 ${loading.refresh ? "animate-spin" : ""}` }),
              "刷新状态"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { tone: "danger", onClick: handleClearGpuMemory, disabled: loading.clear, children: [
              loading.clear ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4" }),
              "安全释放显存"
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatusCard,
            {
              icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Gauge, { className: "h-4 w-4" }),
              title: "GPU 与显存",
              value: telemetryTrusted ? `${formatGb(effectiveGpu.totalMb - effectiveGpu.freeMb)} / ${formatGb(effectiveGpu.totalMb)}` : "Unknown",
              caption: telemetryTrusted ? `当前占用 ${effectiveGpu.usagePercent.toFixed(0)}%，可用 ${formatGb(effectiveGpu.freeMb)}` : "暂无可信物理显存指标",
              tone: !telemetryTrusted ? "warn" : riskTone,
              action: "查看日志",
              onAction: () => {
                setActiveTab("logs");
                pushLog("GPU telemetry diagnostic opened");
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(GpuMemoryChart, { samples: gpuSamples, totalMb: effectiveGpu.totalMb, telemetryTrusted })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatusCard,
            {
              icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { className: "h-4 w-4" }),
              title: "当前反推模型",
              value: activeReverseModel,
              caption: promptSettings.backendMode === "native-qwen3vl" ? "Python Transformers 实验路线" : activeBackendLabel,
              tone: currentModelReady ? "good" : "warn",
              action: "查看模型",
              onAction: () => setActiveTab("models"),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(PromptPreview, { title: activePromptPreview.title, text: activePromptPreview.text })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatusCard,
            {
              icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ListChecks, { className: "h-4 w-4" }),
              title: "任务列表",
              value: `${queueStats.running || 0} 运行 / ${queueStats.queued || 0} 排队`,
              caption: `${queueStats.completed || 0} 完成 / ${queueStats.failed || 0} 失败`,
              tone: queueStats.failed ? "warn" : "good",
              action: "查看运行日志",
              onAction: () => setActiveTab("logs"),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(TaskListPreview, { queueStats })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatusCard,
            {
              icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Boxes, { className: "h-4 w-4" }),
              title: "模型就绪",
              value: `${installedModelCount} 个已安装`,
              caption: `${currentModelReady ? "当前模型可用" : "当前模型未就绪"} / ${isWorkerOffline ? "Worker 离线" : "Worker 在线"}`,
              tone: currentModelReady && !isWorkerOffline ? "good" : "warn",
              action: "管理模型",
              onAction: () => setActiveTab("models")
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-800", children: [
          ["overview", "总览", Activity],
          ["models", "模型", Boxes],
          ["services", "推理服务", Server],
          ["runtime", "AI 运行时管理", ShieldCheck],
          ["prompts", "反推提示词", WandSparkles],
          ["logs", "日志", SquareTerminal]
        ].map(([id2, label, Icon2]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setActiveTab(id2),
            className: `inline-flex min-h-[38px] items-center gap-2 rounded-xl px-3.5 py-2 text-[12px] font-black transition-all ${activeTab === id2 ? "bg-slate-950 text-white shadow-premium dark:bg-slate-100 dark:text-slate-950" : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { className: "h-4 w-4" }),
              label
            ]
          },
          id2
        )) }),
        activeTab === "overview" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          OverviewWorkspace,
          {
            promptMode: promptSettings.backendMode,
            activeReverseModel,
            activeBackendLabel,
            currentModelReady,
            installedNativeModels,
            installedGgufModels,
            queueStats,
            isWorkerOffline,
            llamaStatus,
            llamaRunning,
            macOSWorkerProbe,
            onInstallMacOSDeps: handleInstallMacOSDeps,
            installingMacOSDeps,
            pythonMpsStatus,
            clipSiglipOnnxStatus,
            ollamaFallback,
            externalHttpFallback,
            selectedBackend,
            latestLogLine,
            telemetryTrusted,
            effectiveGpu,
            riskTone,
            setActiveTab
          }
        ),
        activeTab === "models" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ModelsWorkspace,
          {
            modelsList,
            localGgufModels,
            loadedModels,
            selectedModel,
            selectedModelId,
            expandedModelFamilies,
            selectedPromptModelId,
            promptSettings,
            memoryPolicy,
            setMemoryPolicy,
            telemetryTrusted,
            isMockTelemetry,
            devMockEnabled,
            effectiveGpu,
            riskTone,
            clearResult,
            loading,
            openModelDetail,
            fetchConsoleStatus,
            handleForceUnload,
            handleClearGpuMemory,
            cooperativeModels,
            onDownloadCooperativeModel: handleDownloadCooperativeModel,
            onCancelCooperativeDownload: handleCancelCooperativeDownload,
            onDeleteCooperativeModel: handleDeleteCooperativeModel
          }
        ),
        activeTab === "services" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          BackendsWorkspace,
          {
            aiBackends,
            promptSettings,
            setPromptSettings,
            updateBackend,
            addBackend,
            testBackend,
            fetchBackendModels,
            backendResults,
            backendModelLists,
            selectedExternalModels,
            loading,
            llamaHardware,
            llamaPlan,
            llamaStatus,
            llamaTest,
            selectedLlamaModelId,
            setSelectedLlamaModelId,
            llamaInstallLogs,
            localGgufModels,
            detectLlamaHardware,
            createLlamaPlan,
            startLlamaInstall,
            cancelLlamaInstall,
            startLlamaServer,
            stopLlamaServer,
            testLlamaServer
          }
        ),
        activeTab === "runtime" && /* @__PURE__ */ jsxRuntimeExports.jsx(AiRuntimePanel, {}),
        activeTab === "prompts" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          PromptSystemPanel,
          {
            activePromptTitle: activePromptPreview.title,
            promptSettings,
            customTemplates: settings.promptReverseTemplates ?? [],
            updateSettings
          }
        ),
        activeTab === "logs" && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-[22px] border border-slate-800 bg-slate-950 p-5 text-slate-200 shadow-premium", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[15px] font-black", children: "运行日志" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MiniButton, { onClick: () => setLogs([]), children: "清空可见日志" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-[520px] space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-4 font-mono text-[11px] leading-6 text-slate-300", children: logs.length ? logs.map((line, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: line }, `${line}-${index}`)) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-slate-500", children: "暂无本地操作日志。" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "aside",
        {
          className: `fixed bottom-8 right-8 top-24 z-40 w-[420px] max-w-[calc(100vw-4rem)] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/35 ${settingsOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`,
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full flex-col", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[16px] font-black text-slate-950 dark:text-slate-50", children: "AI 设置" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500", children: "提取、反推、推理服务和安全策略" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setSettingsOpen(false), className: "rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-4 overflow-y-auto p-5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsBlock, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(WandSparkles, { className: "h-4 w-4" }), title: "文字与色彩提取", caption: "自动检测画面文字和色彩前景", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[12px] font-extrabold text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300", children: [
                  "启用文字色彩分析",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: enableTextColorAnalysis, onChange: (event) => setEnableTextColorAnalysis(event.target.checked), className: "h-4 w-4 accent-brand-500" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "文字定位引擎", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: textBoxProvider, onChange: (event) => setTextBoxProvider(event.target.value), className: "control", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "none", children: "暂不启用" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "easyocr", children: "EasyOCR（推荐）" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "rapidocr", children: "RapidOCR" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "paddleocr", children: "PaddleOCR ONNX" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "mock", children: "开发者虚拟检测框" })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "最大定位框数量", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", min: 5, max: 100, value: maxTextBoxesPerImage, onChange: (event) => setMaxTextBoxesPerImage(Number(event.target.value)), className: "control" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "单图提取超时（毫秒）", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", min: 1e3, max: 6e4, step: 1e3, value: ocrTimeoutMs, onChange: (event) => setOcrTimeoutMs(Number(event.target.value)), className: "control" }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingsBlock, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { className: "h-4 w-4" }), title: "AI 高级反推", caption: "配置多模态提示词反推引擎", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "反推核心引擎", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "select",
                  {
                    value: promptSettings.backendMode,
                    onChange: (event) => {
                      const mode = event.target.value;
                      const firstBackend = aiBackends.find((backend) => backend.type === mode);
                      setPromptSettings((prev) => ({
                        ...prev,
                        backendMode: mode,
                        selectedExternalBackendId: mode === "native-qwen3vl" ? prev.selectedExternalBackendId : firstBackend?.id ?? prev.selectedExternalBackendId
                      }));
                    },
                    className: "control",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "llama-openai", children: "Qwen3-VL GGUF / Llama 本地接口" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "native-qwen3vl", children: "Python Transformers 实验路线" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "openai-compatible", children: "自定义 OpenAI-compatible" })
                    ]
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "原生反推模型", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: selectedPromptModelId, onChange: (event) => setSelectedPromptModelId(event.target.value), className: "control", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "qwen3-vl-4b-instruct", children: "qwen3-vl-4b-instruct" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "qwen3-vl-8b-instruct", children: "qwen3-vl-8b-instruct" })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "输出长度", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", min: 64, max: 4096, value: promptSettings.maxNewTokens, onChange: (event) => setPromptSettings((prev) => ({ ...prev, maxNewTokens: Number(event.target.value) })), className: "control" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "温度", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", min: 0, max: 2, step: 0.1, value: promptSettings.temperature, onChange: (event) => setPromptSettings((prev) => ({ ...prev, temperature: Number(event.target.value) })), className: "control" }) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { onClick: () => setActiveTab("services"), children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(PanelRight, { className: "h-4 w-4" }),
                  "管理推理服务"
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-slate-100 p-5 dark:border-slate-800", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: handleSaveAiSettings,
                disabled: loading.save,
                className: "flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-[13px] font-black text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-600 disabled:opacity-50",
                children: [
                  loading.save ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-4 w-4" }),
                  "保存 AI 设置"
                ]
              }
            ) })
          ] })
        }
      ),
      false
    ] })
  ] });
}
function OverviewWorkspace(props) {
  const smokeGguf = props.installedGgufModels.find((model) => model.id === "qwen3-vl-2b-instruct-q4-k-m") ?? props.installedGgufModels[0] ?? null;
  const llamaServerRunning = props.llamaRunning ?? Boolean(props.llamaStatus?.serverRunning || props.llamaStatus?.serverPid);
  const serviceState = props.promptMode === "llama-openai" ? llamaServerRunning ? "Llama 服务运行中" : "Llama 服务未运行" : props.promptMode === "openai-compatible" ? props.selectedBackend?.enabled ? "外部服务已启用" : "外部服务未启用" : props.isWorkerOffline ? "Worker 离线" : "Worker 在线";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[15px] font-black text-slate-950 dark:text-slate-50", children: "运行驾驶舱" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500", children: "聚合当前反推链路、服务健康、任务队列与模型就绪状态。" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { tone: props.currentModelReady ? "good" : "warn", children: props.currentModelReady ? "可执行" : "需配置" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 grid gap-3 md:grid-cols-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "当前反推链路", value: props.activeReverseModel, caption: props.activeBackendLabel }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "服务状态", value: serviceState, caption: props.promptMode === "native-qwen3vl" ? "Python Worker" : "OpenAI-compatible API" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "任务队列", value: `${props.queueStats.running || 0} 运行 / ${props.queueStats.queued || 0} 排队`, caption: `${props.queueStats.completed || 0} 完成 / ${props.queueStats.failed || 0} 失败` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "显存水位", value: props.telemetryTrusted ? `${props.effectiveGpu.usagePercent.toFixed(0)}%` : "Unknown", caption: props.telemetryTrusted ? `${formatGb(props.effectiveGpu.freeMb)} 可用` : "未知状态按风险处理" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[15px] font-black text-slate-950 dark:text-slate-50", children: "模型摘要" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500", children: "只统计本机已安装且可选择的模型版本。" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { onClick: () => props.setActiveTab("models"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Boxes, { className: "h-4 w-4" }),
            "查看模型"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "Python Transformers 模型", value: `${props.installedNativeModels.length} 个`, caption: props.installedNativeModels.map((m2) => m2.id).join(" / ") || "暂无已安装版本" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "GGUF 量化模型", value: `${props.installedGgufModels.length} 个`, caption: props.installedGgufModels.map((m2) => m2.filename).slice(0, 2).join(" / ") || "暂无已安装版本" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[15px] font-black text-slate-950 dark:text-slate-50", children: "macOS 路线概览" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500", children: "把 Python MPS、ONNX Runtime 和 Llama 路线放到同一屏里查看。" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { tone: props.macOSWorkerProbe?.isMacOS ? "good" : "muted", children: props.macOSWorkerProbe?.isMacOS ? "macOS 探测已连接" : "等待探测" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { tone: "primary", onClick: props.onInstallMacOSDeps, disabled: props.installingMacOSDeps, children: [
              props.installingMacOSDeps ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3 w-3 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-3 w-3" }),
              "安装 macOS AI 依赖"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "MPS", value: props.macOSWorkerProbe?.torch.mpsAvailable ? "可用" : "回退", caption: props.macOSWorkerProbe?.torch.version ? `torch ${props.macOSWorkerProbe.torch.version}` : "尚未探测" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "Python MPS 兼容性", value: props.pythonMpsStatus?.compatible ? "可兼容" : props.pythonMpsStatus ? props.pythonMpsStatus.status === "planned" ? "待补齐" : "不可用" : "未检查", caption: props.pythonMpsStatus?.runtime ?? "ai/model/python-mps/status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "ONNX Runtime", value: props.macOSWorkerProbe?.onnxruntime.available ? "可用" : "回退", caption: props.macOSWorkerProbe?.onnxruntime.providers.join(" / ") || "尚未探测" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "CLIP/SigLIP ONNX", value: props.macOSWorkerProbe?.clipSiglipOnnx.available ? "可用" : "规划中", caption: props.macOSWorkerProbe?.clipSiglipOnnx.version ? `${props.macOSWorkerProbe.clipSiglipOnnx.backend ?? "optimum"} ${props.macOSWorkerProbe.clipSiglipOnnx.version}` : "尚未探测" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "CLIP/SigLIP 兼容性", value: props.clipSiglipOnnxStatus?.compatible ? "可兼容" : props.clipSiglipOnnxStatus ? "待补齐" : "未检查", caption: props.clipSiglipOnnxStatus?.runtime ?? "ai/model/clip-siglip-onnx/status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "MLX", value: props.macOSWorkerProbe?.mlx.available ? "可用" : "规划中", caption: props.macOSWorkerProbe?.mlx.version ? `mlx ${props.macOSWorkerProbe.mlx.version}` : "尚未探测" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "Llama 路线", value: llamaServerRunning ? "运行中" : props.llamaStatus?.phase || "未启动", caption: llamaServerRunning ? `${props.llamaStatus?.serverModels?.slice(0, 1).join("") || "llama-server"} 健康检查通过` : props.llamaStatus?.serverPid ? `PID ${props.llamaStatus.serverPid}` : "llama.app / llama.cpp Metal / Ollama" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "Qwen2.5-VL Ollama fallback", value: props.ollamaFallback.value, caption: props.ollamaFallback.caption }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "external HTTP fallback", value: props.externalHttpFallback.value, caption: props.externalHttpFallback.caption }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "Smoke GGUF", value: smokeGguf?.isDownloaded ? "已下载" : smokeGguf?.isDownloading ? "下载中" : "未下载", caption: smokeGguf ? smokeGguf.name : "Qwen3-VL 2B Q4_K_M" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RuntimeTile, { label: "Vision mmproj", value: smokeGguf?.mmprojFilename ? smokeGguf.isDownloaded ? "已就绪" : smokeGguf.isDownloading ? "下载中" : "待下载" : "无需", caption: smokeGguf?.mmprojFilename || "mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-[11px] font-bold leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400", children: [
          "当前 macOS 目标模型优先级：Qwen3-VL GGUF ",
          ">",
          " Qwen3-VL MLX ",
          ">",
          " Qwen2.5-VL Ollama fallback ",
          ">",
          " external HTTP fallback。"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(MacOSAiCapabilityMatrix, { probe: props.macOSWorkerProbe })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[15px] font-black text-slate-950 dark:text-slate-50", children: "服务健康" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { tone: props.riskTone, children: props.riskTone === "good" ? "正常" : props.riskTone === "bad" ? "关注" : "未知" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 text-[12px] font-bold text-slate-500 dark:text-slate-400", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950", children: [
            "Python Worker：",
            props.isWorkerOffline ? "离线" : "在线"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950", children: [
            "Llama 服务：",
            llamaServerRunning ? "运行中" : props.llamaStatus?.phase || "未运行"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950", children: [
            "外部服务：",
            props.selectedBackend?.name || "未选择"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[15px] font-black text-slate-950 dark:text-slate-50", children: "最近事件" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { onClick: () => props.setActiveTab("logs"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SquareTerminal, { className: "h-4 w-4" }),
            "日志"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-[11px] leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400", children: props.latestLogLine })
      ] })
    ] })
  ] });
}
function RuntimeTile({ label, value, caption }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10.5px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 truncate text-[18px] font-black text-slate-950 dark:text-slate-50", children: value }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 truncate text-[11px] font-bold text-slate-500 dark:text-slate-400", children: caption })
  ] });
}
function ModelsWorkspace(props) {
  const installedNative = props.modelsList.filter((model) => model.isDownloaded);
  const installedGguf = props.localGgufModels.filter((model) => model.isDownloaded);
  const qwenExpanded = Boolean(props.expandedModelFamilies.qwen_vl);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[15px] font-black text-slate-950 dark:text-slate-50", children: "模型与任务矩阵" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500", children: "能力模块保持混合展示，Qwen3-VL 展开为本机已安装版本集合。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { onClick: () => props.fetchConsoleStatus("manual"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-4 w-4" }),
            "更新列表"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { tone: "danger", onClick: props.handleForceUnload, disabled: props.loading.unload, children: [
            props.loading.unload ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4" }),
            "卸载全部模型"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: MODEL_ROWS.map((model) => {
        const loaded = Boolean(props.loadedModels[model.id]);
        const isSelected = props.selectedModelId === model.id;
        const installedCount = model.id === "qwen_vl" ? installedNative.length + installedGguf.length : 0;
        const isCooperative = model.id === "ram" || model.id === "florence2" || model.id === "clip" || model.id === "wd_tagger";
        const cooperativeRegistryId = COOPERATIVE_MODEL_ID_BY_ROW_ID[model.id] ?? model.id;
        const coopState = isCooperative ? props.cooperativeModels[cooperativeRegistryId] : void 0;
        const isDownloaded = coopState?.isDownloaded ?? false;
        const isDownloading = coopState?.isDownloading ?? false;
        const downloadProgress = coopState?.progress ?? 0;
        const downloadMessage = coopState?.message ?? "";
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: `grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all cursor-pointer ${isSelected ? "border-brand-500 bg-brand-50 text-slate-950 shadow-premium ring-1 ring-brand-200 dark:border-brand-400 dark:bg-brand-950/45 dark:text-slate-50 dark:ring-brand-700/50" : "border-slate-200/70 bg-white hover:border-brand-100 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-brand-900 dark:hover:bg-slate-900"}`,
              onClick: () => props.openModelDetail(model),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `flex h-9 w-9 items-center justify-center rounded-xl border ${model.accent}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Boxes, { className: "h-4 w-4" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[13px] font-black ${isSelected ? "text-slate-950 dark:text-slate-50" : "text-slate-800 dark:text-slate-200"}`, children: model.name }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] font-extrabold ${isSelected ? "text-brand-700 dark:text-brand-200" : "text-slate-400 dark:text-slate-500"}`, children: model.role }),
                    model.id === "qwen_vl" && /* @__PURE__ */ jsxRuntimeExports.jsxs(StatusPill, { tone: installedCount ? "good" : "muted", children: [
                      installedCount,
                      " 个已安装版本"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `mt-1 flex flex-wrap items-center gap-2 text-[10.5px] font-bold ${isSelected ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}`, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: model.capability }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1 w-1 rounded-full bg-current opacity-40" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isCooperative ? isDownloaded ? "已安装 · 本地文件" : "HuggingFace 仓库" : model.source })
                  ] }),
                  isCooperative && (isDownloading || downloadProgress > 0 && downloadProgress < 100) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 w-full", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        className: "h-full rounded-full bg-brand-500 transition-all duration-300",
                        style: { width: `${downloadProgress}%` }
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 text-[9.5px] font-bold text-slate-400 dark:text-slate-500", children: downloadMessage })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1.5", onClick: (e) => e.stopPropagation(), children: isCooperative ? isDownloaded ? /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { tone: "danger", onClick: () => props.onDeleteCooperativeModel(model.id), children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3" }),
                  "删除"
                ] }) : isDownloading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { tone: "default", onClick: () => props.onCancelCooperativeDownload(model.id), children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Square, { className: "h-3 w-3" }),
                  "取消"
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { tone: "primary", onClick: () => props.onDownloadCooperativeModel(model.id), children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-3 w-3" }),
                  "下载"
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { tone: loaded ? "good" : "muted", children: loaded ? "已加载" : "未加载" }),
                  model.id === "qwen_vl" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: `h-4 w-4 text-slate-400 transition-transform ${qwenExpanded ? "rotate-180" : ""}` }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-4 w-4 text-slate-300 dark:text-slate-600" })
                ] }) })
              ]
            }
          ),
          model.id === "qwen_vl" && qwenExpanded && /* @__PURE__ */ jsxRuntimeExports.jsx(
            QwenVersionCollection,
            {
              nativeModels: installedNative,
              ggufModels: installedGguf,
              selectedPromptModelId: props.selectedPromptModelId,
              promptSettings: props.promptSettings
            }
          )
        ] }, model.id);
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MemoryGuardPanel,
        {
          telemetryTrusted: props.telemetryTrusted,
          isMockTelemetry: props.isMockTelemetry,
          devMockEnabled: props.devMockEnabled,
          effectiveGpu: props.effectiveGpu,
          memoryPolicy: props.memoryPolicy,
          setMemoryPolicy: props.setMemoryPolicy,
          riskTone: props.riskTone,
          clearResult: props.clearResult,
          onClear: props.handleClearGpuMemory,
          clearing: props.loading.clear
        }
      ),
      props.selectedModel && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[15px] font-black text-slate-950 dark:text-slate-50", children: props.selectedModel.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[12px] font-semibold leading-6 text-slate-500 dark:text-slate-400", children: props.selectedModel.capability }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950", children: [
            "来源：",
            props.selectedModel.source
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950", children: [
            "状态：",
            props.loadedModels[props.selectedModel.id] ? "已加载" : "未加载"
          ] })
        ] })
      ] })
    ] })
  ] });
}
function QwenVersionCollection(props) {
  const versions = [
    ...props.nativeModels.map((model) => ({
      id: `native:${model.id}`,
      code: model.id,
      name: model.displayName ?? model.id,
      size: model.modelSize,
      quantization: model.quantization === "none" ? "Native" : model.quantization,
      runtime: model.runtime ?? "transformers",
      stability: model.stability,
      releaseDate: model.officialReleaseDate,
      current: props.promptSettings.backendMode === "native-qwen3vl" && props.selectedPromptModelId === model.id
    })),
    ...props.ggufModels.map((model) => ({
      id: `gguf:${model.id}`,
      code: model.filename,
      name: model.name,
      size: model.parameterSize,
      quantization: model.quantization,
      runtime: "llama.cpp / GGUF",
      stability: model.stability ?? "stable",
      releaseDate: model.officialReleaseDate,
      current: props.promptSettings.backendMode === "llama-openai" && props.promptSettings.selectedExternalModel === model.filename
    }))
  ];
  if (!versions.length) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-[12px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400", children: "尚未检测到已安装的 Qwen3-VL Native 或 GGUF 版本。" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-0 space-y-2 rounded-2xl border border-brand-100 bg-brand-50/35 p-3 dark:border-brand-900/60 dark:bg-brand-950/15 sm:ml-12", children: versions.map((version) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 rounded-xl border border-white bg-white p-3 text-[11px] font-bold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 md:grid-cols-[minmax(0,1fr)_auto]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[12px] font-black text-slate-900 dark:text-slate-100", children: version.name }),
        version.current && /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { tone: "good", children: "当前使用" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 truncate font-mono text-[10.5px] text-slate-500 dark:text-slate-400", children: version.code })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2 md:min-w-[330px] md:grid-cols-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(VersionMeta, { label: "规模", value: version.size || "未知" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(VersionMeta, { label: "量化", value: version.quantization || "未知" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(VersionMeta, { label: "稳定性", value: normalizeStability(version.stability) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(VersionMeta, { label: "官方发布", value: formatReleaseDate(version.releaseDate) })
    ] })
  ] }, version.id)) });
}
function VersionMeta({ label, value }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-900", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[9px] font-black text-slate-400 dark:text-slate-500", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[10.5px] font-black text-slate-700 dark:text-slate-200", children: value })
  ] });
}
function StatusCard({
  icon,
  title,
  value,
  caption,
  tone,
  action,
  onAction,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[20px] border border-slate-200 bg-white p-5 shadow-premium transition-all hover:-translate-y-0.5 hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2 text-[11.5px] font-black text-slate-500 dark:text-slate-400", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-brand-500", children: icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: title })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { tone, children: tone === "good" ? "正常" : tone === "bad" ? "关注" : tone === "warn" ? "未知" : "参数" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 truncate text-[20px] font-black tracking-tight text-slate-950 dark:text-slate-50", children: value }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 min-h-[18px] truncate text-[11px] font-bold text-slate-400 dark:text-slate-500", children: caption }),
    children && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3", children }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: onAction,
        className: "mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-[11px] font-black text-slate-500 transition-colors hover:bg-white hover:text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200",
        children: action
      }
    )
  ] });
}
function MemoryGuardPanel({
  telemetryTrusted,
  isMockTelemetry,
  devMockEnabled,
  effectiveGpu,
  memoryPolicy,
  setMemoryPolicy,
  riskTone,
  clearResult,
  onClear,
  clearing,
  expanded
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900 ${expanded ? "" : "xl:sticky xl:top-0"}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "flex items-center gap-2 text-[15px] font-black text-slate-950 dark:text-slate-50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-4 w-4 text-emerald-500" }),
          "显存安全策略"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500", children: "跟随模型配置使用，不再作为独立模块。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { tone: riskTone, children: riskTone === "good" ? "安全" : riskTone === "bad" ? "高负载" : "未知" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-[12px] font-black text-slate-700 dark:text-slate-300", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: telemetryTrusted ? effectiveGpu.deviceName : "物理 GPU 状态未识别" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: telemetryTrusted ? `${effectiveGpu.usagePercent.toFixed(0)}%` : "Unknown" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: `h-full rounded-full ${riskTone === "bad" ? "bg-rose-500" : riskTone === "warn" ? "bg-amber-400" : "bg-emerald-500"}`,
          style: { width: `${telemetryTrusted ? Math.min(100, Math.max(0, effectiveGpu.usagePercent)) : 0}%` }
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid grid-cols-2 gap-2 text-[10.5px] font-bold text-slate-500 dark:text-slate-400", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "空闲：",
          telemetryTrusted ? formatGb(effectiveGpu.freeMb) : "未知"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "总量：",
          telemetryTrusted ? formatGb(effectiveGpu.totalMb) : "未知"
        ] })
      ] }),
      isMockTelemetry && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10.5px] font-extrabold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300", children: devMockEnabled ? "Dev mock only，不参与安全判断。" : "Mock metrics disabled，不参与显存安全判断。" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "防护策略", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: memoryPolicy.clearGpuBeforePromptReverse, onChange: (event) => setMemoryPolicy((prev) => ({ ...prev, clearGpuBeforePromptReverse: event.target.value })), className: "control", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "always", children: "保守：每次反推前清理" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "auto", children: "平衡：紧张时自动清理" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "never", children: "性能：仅明显不足时拦截" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "占用红线（%）", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", min: 50, max: 99, value: memoryPolicy.maxGpuMemoryUsagePercent, onChange: (event) => setMemoryPolicy((prev) => ({ ...prev, maxGpuMemoryUsagePercent: Number(event.target.value) })), className: "control" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-extrabold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300", children: [
        "显存不足时自动清理",
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: memoryPolicy.forceClearWhenInsufficient, onChange: (event) => setMemoryPolicy((prev) => ({ ...prev, forceClearWhenInsufficient: event.target.checked })), className: "h-4 w-4 accent-brand-500" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: onClear, disabled: clearing, className: "mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-[12px] font-black text-brand-600 transition-all hover:bg-brand-100 disabled:opacity-50 dark:border-brand-900/60 dark:bg-brand-950/30 dark:text-brand-300 dark:hover:bg-brand-950/50", children: [
      clearing ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4" }),
      "安全释放显存"
    ] }),
    clearResult && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `mt-3 rounded-2xl border p-3 text-[11px] font-bold leading-5 ${clearResult.success ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"}`, children: [
      clearResult.success ? "清理完成" : `清理失败：${clearResult.error || "未知错误"}`,
      clearResult.before && clearResult.after && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 text-[10px] opacity-80", children: [
        "清理前可用 ",
        clearResult.before.freeGB.toFixed(1),
        " GB / 清理后可用 ",
        clearResult.after.freeGB.toFixed(1),
        " GB"
      ] })
    ] })
  ] });
}
function BackendsWorkspace(props) {
  const installedGguf = props.localGgufModels.filter((model) => model.isDownloaded);
  const selectedPlanModel = props.llamaPlan?.modelCandidates.find((model) => model.id === props.selectedLlamaModelId) ?? props.llamaPlan?.recommendedModel ?? null;
  const installInProgress = props.llamaStatus ? ["detecting", "planning", "downloading", "extracting", "installing"].includes(props.llamaStatus.phase) : false;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[15px] font-black text-slate-950 dark:text-slate-50", children: "外部服务连接" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500", children: "管理 OpenAI-compatible API 与可作为反推链路的本地服务。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { tone: "primary", onClick: props.addBackend, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
          "添加服务"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: props.aiBackends.map((backend) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "服务名称", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: backend.name, onChange: (event) => props.updateBackend(backend.id, { name: event.target.value }), className: "control" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "接口类型", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: backend.type, onChange: (event) => props.updateBackend(backend.id, { type: event.target.value }), className: "control", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "llama-openai", children: "Llama 本地接口" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "openai-compatible", children: "OpenAI-compatible" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "ollama", children: "Ollama fallback" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "lm-studio", children: "LM Studio" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "custom", children: "Custom HTTP" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Base URL", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: backend.baseUrl, onChange: (event) => props.updateBackend(backend.id, { baseUrl: event.target.value }), className: "control" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "默认模型", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: backend.defaultModel ?? "", onChange: (event) => props.updateBackend(backend.id, { defaultModel: event.target.value }), className: "control" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: backend.enabled, onChange: (event) => props.updateBackend(backend.id, { enabled: event.target.checked }), className: "h-4 w-4 accent-brand-500" }),
            "启用"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { onClick: () => props.testBackend(backend), disabled: props.loading[`health:${backend.id}`], children: [
            props.loading[`health:${backend.id}`] ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "h-4 w-4" }),
            "测试健康度"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { onClick: () => props.fetchBackendModels(backend), disabled: props.loading[`models:${backend.id}`], children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "h-4 w-4" }),
            "获取模型列表"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => props.setPromptSettings((prev) => ({ ...prev, backendMode: backend.type === "llama-openai" ? "llama-openai" : "openai-compatible", selectedExternalBackendId: backend.id })),
              className: "rounded-xl bg-brand-50 px-3 py-2 text-[11px] font-black text-brand-600 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-950/60",
              children: "用作反推服务"
            }
          )
        ] }),
        (props.backendResults[`health:${backend.id}`] || props.backendResults[`models:${backend.id}`]) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400", children: props.backendResults[`health:${backend.id}`] || props.backendResults[`models:${backend.id}`] })
      ] }, backend.id)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[15px] font-black text-slate-950 dark:text-slate-50", children: "Llama 本地推理服务" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500", children: "管理 llama.cpp、GGUF 模型、视觉 mmproj 与本地 OpenAI 接口。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { tone: props.llamaStatus?.serverPid ? "good" : props.llamaStatus?.phase === "error" ? "bad" : "muted", children: props.llamaStatus?.serverPid ? "运行中" : props.llamaStatus?.phase === "error" ? "异常" : "已停止" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { onClick: props.detectLlamaHardware, disabled: props.loading["llama-detect"], children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { className: "h-4 w-4" }),
          "硬件分析"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { onClick: props.createLlamaPlan, disabled: props.loading["llama-plan"], children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(HardDrive, { className: "h-4 w-4" }),
          "安装方案"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { tone: "primary", onClick: props.startLlamaInstall, disabled: !props.llamaPlan || props.loading["llama-install"] || installInProgress, children: [
          props.loading["llama-install"] ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "h-4 w-4" }),
          "开始安装"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { tone: "danger", onClick: props.cancelLlamaInstall, disabled: !installInProgress || props.loading["llama-cancel-install"], children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }),
          "取消安装"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { onClick: props.startLlamaServer, disabled: props.loading["llama-start"], children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "h-4 w-4" }),
          "启动推理"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { onClick: props.stopLlamaServer, disabled: props.loading["llama-stop"], children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Square, { className: "h-4 w-4" }),
          "停止服务"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { onClick: props.testLlamaServer, disabled: props.loading["llama-test"], children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "h-4 w-4" }),
          "连接测试"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(MiniButton, { onClick: () => window.electronAPI?.llamaRuntimeOpenInstallRoot?.(), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { className: "h-4 w-4" }),
          "安装目录"
        ] })
      ] }),
      props.llamaPlan && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[12px] font-black text-slate-800 dark:text-slate-200", children: "安装方案候选" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 text-[10.5px] font-bold text-slate-400 dark:text-slate-500", children: [
              "Runtime ",
              props.llamaPlan.runtimeVersion,
              " / ",
              props.llamaPlan.accelerator,
              " / ",
              props.llamaPlan.downloadSource ?? "huggingface"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(StatusPill, { tone: "warn", children: [
            "推荐：",
            props.llamaPlan.recommendedModel.name
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            value: selectedPlanModel?.id ?? props.llamaPlan.recommendedModel.id,
            onChange: (event) => props.setSelectedLlamaModelId(event.target.value),
            className: "control",
            children: props.llamaPlan.modelCandidates.map((model) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: model.id, children: [
              model.name,
              " / ",
              model.quantization,
              " / ",
              model.parameterSize,
              " / ",
              model.estimatedSizeGB,
              " GB"
            ] }, model.id))
          }
        ),
        selectedPlanModel && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10.5px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate font-black text-slate-800 dark:text-slate-200", children: selectedPlanModel.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 truncate font-mono text-[10px]", children: selectedPlanModel.filename }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1", children: [
            selectedPlanModel.parameterSize,
            " / ",
            selectedPlanModel.quantization,
            " / 约 ",
            selectedPlanModel.estimatedSizeGB,
            " GB / 建议显存 ",
            selectedPlanModel.recommendedMinVramGB,
            " GB / ",
            selectedPlanModel.supportsVision ? "含视觉 mmproj" : "文本模型"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden", children: props.llamaPlan.modelCandidates.map((model) => {
          const active = (selectedPlanModel?.id ?? props.llamaPlan?.recommendedModel.id) === model.id;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => props.setSelectedLlamaModelId(model.id),
              className: `w-full rounded-xl border px-3 py-2 text-left transition-all ${active ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-200" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[11.5px] font-black", children: model.name }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 rounded-lg bg-white/70 px-2 py-0.5 text-[10px] font-black dark:bg-slate-950/60", children: model.quantization })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 truncate font-mono text-[10px] opacity-75", children: model.filename }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 text-[10px] font-bold opacity-75", children: [
                  model.parameterSize,
                  " / 约 ",
                  model.estimatedSizeGB,
                  " GB / 建议显存 ",
                  model.recommendedMinVramGB,
                  " GB / ",
                  model.supportsVision ? "含视觉 mmproj" : "文本模型"
                ] })
              ]
            },
            model.id
          );
        }) }),
        props.llamaPlan.warnings.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10.5px] font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300", children: props.llamaPlan.warnings.map((warning2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          "• ",
          warning2
        ] }, warning2)) })
      ] }),
      (props.llamaStatus?.installId || props.llamaInstallLogs.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[12px] font-black text-slate-800 dark:text-slate-200", children: "安装进度与终端输出" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10.5px] font-black text-slate-400 dark:text-slate-500", children: [
            props.llamaStatus?.phase ?? "idle",
            " / ",
            props.llamaStatus?.progress ?? 0,
            "%"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full rounded-full bg-brand-500 transition-all", style: { width: `${Math.max(0, Math.min(100, props.llamaStatus?.progress ?? 0))}%` } }) }),
        props.llamaStatus?.message && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400", children: props.llamaStatus.message }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "scrollbar-none mt-3 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-[10px] leading-5 text-slate-200 dark:border-slate-800", children: props.llamaInstallLogs.length ? props.llamaInstallLogs.map((line, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: line }, `${line}-${index}`)) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-slate-500", children: "暂无安装日志" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] font-bold leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          "当前显卡：",
          props.llamaHardware?.gpuName || "尚未检测"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          "物理显存：",
          props.llamaHardware?.totalVramGB ? `${props.llamaHardware.totalVramGB} GB` : "未知"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          "安装方案：",
          props.llamaPlan ? `${props.llamaPlan.accelerator} / ${props.llamaPlan.recommendedModel.name}` : "尚未生成"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          "服务状态：",
          props.llamaStatus?.serverPid ? `进程 PID ${props.llamaStatus.serverPid}` : props.llamaStatus?.phase || "已停止"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          "当前 GGUF：",
          props.llamaStatus?.modelPath ? props.llamaStatus.modelPath.split(/[\\/]/).pop() : "未选择"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          "mmproj：",
          props.llamaStatus?.mmprojPath ? props.llamaStatus.mmprojPath.split(/[\\/]/).pop() : "未加载"
        ] }),
        props.llamaTest && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: props.llamaTest.success ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300", children: [
          "连接测试：",
          props.llamaTest.success ? "连接成功" : props.llamaTest.error?.message || "无法连接"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-3 text-[12px] font-black text-slate-800 dark:text-slate-200", children: "已安装 GGUF 模型" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: installedGguf.length ? installedGguf.map((model) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate font-black text-slate-800 dark:text-slate-200", children: model.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 truncate font-mono text-[10px]", children: model.filename })
        ] }, model.id)) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400", children: "暂无已安装 GGUF 模型。" }) })
      ] })
    ] })
  ] });
}
function SettingsBlock({ icon, title, caption, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[20px] border border-slate-200 bg-white p-4 shadow-premium dark:border-slate-800 dark:bg-slate-900", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300", children: icon }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[13px] font-black text-slate-900 dark:text-slate-50", children: title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[10.5px] font-bold text-slate-400 dark:text-slate-500", children: caption })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children })
  ] });
}
function Field({ label, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block space-y-1.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10.5px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500", children: label }),
    children
  ] });
}
function App() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(HashRouter, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Routes, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Route, { path: "/", element: /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, {}), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { index: true, element: /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/dashboard", replace: true }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "dashboard", element: /* @__PURE__ */ jsxRuntimeExports.jsx(Dashboard, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "sites", element: /* @__PURE__ */ jsxRuntimeExports.jsx(Sites, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "browser", element: /* @__PURE__ */ jsxRuntimeExports.jsx(BrowserPage, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "search", element: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "downloads", element: /* @__PURE__ */ jsxRuntimeExports.jsx(DownloadQueue, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "library", element: /* @__PURE__ */ jsxRuntimeExports.jsx(Library, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "tag-manager", element: /* @__PURE__ */ jsxRuntimeExports.jsx(TagManagerPage, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "ai-console", element: /* @__PURE__ */ jsxRuntimeExports.jsx(AiConsolePage, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "settings", element: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "*", element: /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/dashboard", replace: true }) })
  ] }) }) });
}
client.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React$2.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
