/*
 * Ease
 * Visit http://createjs.com/ for documentation, updates and examples.
 *
 * Copyright (c) 2010 gskinner.com, inc.
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @module TweenJS
 */

/**
 * The Ease class provides a collection of easing functions for use with TweenJS. It does not use the standard 4 param
 * easing signature. Instead it uses a single param which indicates the current linear ratio (0 to 1) of the tween.
 *
 * Most methods on Ease can be passed directly as easing functions:
 *
 *      createjs.Tween.get(target).to({x:100}, 500, createjs.Ease.linear);
 *
 * However, methods beginning with "get" will return an easing function based on parameter values:
 *
 *      createjs.Tween.get(target).to({y:200}, 500, createjs.Ease.getPowIn(2.2));
 *
 * Please see the <a href="http://www.createjs.com/Demos/TweenJS/Tween_SparkTable">spark table demo</a> for an
 * overview of the different ease types on <a href="http://tweenjs.com">TweenJS.com</a>.
 *
 * <em>Equations derived from work by Robert Penner.</em>
 * @class Ease
 * @static
 **/

type EasingFunction = (t: number) => number;

class Ease {
  private constructor() {
    throw "Ease cannot be instantiated.";
  }

  // static methods and properties
  /**
   * @method linear
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static linear: EasingFunction = function (t: number): number {
    return t;
  };

  /**
   * Identical to linear.
   * @method none
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static none: EasingFunction = Ease.linear;

  /**
   * Mimics the simple -100 to 100 easing in Adobe Flash/Animate.
   * @method get
   * @param {Number} amount A value from -1 (ease in) to 1 (ease out) indicating the strength and direction of the ease.
   * @static
   * @return {Function}
   **/
  static get(amount: number): EasingFunction {
    if (amount < -1) {
      amount = -1;
    } else if (amount > 1) {
      amount = 1;
    }
    return function (t: number): number {
      if (amount == 0) {
        return t;
      }
      if (amount < 0) {
        return t * (t * -amount + 1 + amount);
      }
      return t * ((2 - t) * amount + (1 - amount));
    };
  }

  /**
   * Configurable exponential ease.
   * @method getPowIn
   * @param {Number} pow The exponent to use (ex. 3 would return a cubic ease).
   * @static
   * @return {Function}
   **/
  static getPowIn(pow: number): EasingFunction {
    return function (t: number): number {
      return Math.pow(t, pow);
    };
  }

  /**
   * Configurable exponential ease.
   * @method getPowOut
   * @param {Number} pow The exponent to use (ex. 3 would return a cubic ease).
   * @static
   * @return {Function}
   **/
  static getPowOut(pow: number): EasingFunction {
    return function (t: number): number {
      return 1 - Math.pow(1 - t, pow);
    };
  }

  /**
   * Configurable exponential ease.
   * @method getPowInOut
   * @param {Number} pow The exponent to use (ex. 3 would return a cubic ease).
   * @static
   * @return {Function}
   **/
  static getPowInOut(pow: number): EasingFunction {
    return function (t: number): number {
      if ((t *= 2) < 1) return 0.5 * Math.pow(t, pow);
      return 1 - 0.5 * Math.abs(Math.pow(2 - t, pow));
    };
  }

  /**
   * @method quadIn
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static quadIn: EasingFunction = Ease.getPowIn(2);
  /**
   * @method quadOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static quadOut: EasingFunction = Ease.getPowOut(2);
  /**
   * @method quadInOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static quadInOut: EasingFunction = Ease.getPowInOut(2);

  /**
   * @method cubicIn
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static cubicIn: EasingFunction = Ease.getPowIn(3);
  /**
   * @method cubicOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static cubicOut: EasingFunction = Ease.getPowOut(3);
  /**
   * @method cubicInOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static cubicInOut: EasingFunction = Ease.getPowInOut(3);

  /**
   * @method quartIn
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static quartIn: EasingFunction = Ease.getPowIn(4);
  /**
   * @method quartOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static quartOut: EasingFunction = Ease.getPowOut(4);
  /**
   * @method quartInOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static quartInOut: EasingFunction = Ease.getPowInOut(4);

  /**
   * @method quintIn
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static quintIn: EasingFunction = Ease.getPowIn(5);
  /**
   * @method quintOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static quintOut: EasingFunction = Ease.getPowOut(5);
  /**
   * @method quintInOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static quintInOut: EasingFunction = Ease.getPowInOut(5);

  /**
   * @method sineIn
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static sineIn: EasingFunction = function (t: number): number {
    return 1 - Math.cos((t * Math.PI) / 2);
  };

  /**
   * @method sineOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static sineOut: EasingFunction = function (t: number): number {
    return Math.sin((t * Math.PI) / 2);
  };

  /**
   * @method sineInOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static sineInOut: EasingFunction = function (t: number): number {
    return -0.5 * (Math.cos(Math.PI * t) - 1);
  };

  /**
   * Configurable "back in" ease.
   * @method getBackIn
   * @param {Number} amount The strength of the ease.
   * @static
   * @return {Function}
   **/
  static getBackIn(amount: number): EasingFunction {
    return function (t: number): number {
      return t * t * ((amount + 1) * t - amount);
    };
  }
  /**
   * @method backIn
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static backIn: EasingFunction = Ease.getBackIn(1.7);

  /**
   * Configurable "back out" ease.
   * @method getBackOut
   * @param {Number} amount The strength of the ease.
   * @static
   * @return {Function}
   **/
  static getBackOut(amount: number): EasingFunction {
    return function (t: number): number {
      return --t * t * ((amount + 1) * t + amount) + 1;
    };
  }
  /**
   * @method backOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static backOut: EasingFunction = Ease.getBackOut(1.7);

  /**
   * Configurable "back in out" ease.
   * @method getBackInOut
   * @param {Number} amount The strength of the ease.
   * @static
   * @return {Function}
   **/
  static getBackInOut(amount: number): EasingFunction {
    amount *= 1.525;
    return function (t: number): number {
      if ((t *= 2) < 1) return 0.5 * (t * t * ((amount + 1) * t - amount));
      return 0.5 * ((t -= 2) * t * ((amount + 1) * t + amount) + 2);
    };
  }
  /**
   * @method backInOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static backInOut: EasingFunction = Ease.getBackInOut(1.7);

  /**
   * @method circIn
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static circIn: EasingFunction = function (t: number): number {
    return -(Math.sqrt(1 - t * t) - 1);
  };

  /**
   * @method circOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static circOut: EasingFunction = function (t: number): number {
    return Math.sqrt(1 - --t * t);
  };

  /**
   * @method circInOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static circInOut: EasingFunction = function (t: number): number {
    if ((t *= 2) < 1) return -0.5 * (Math.sqrt(1 - t * t) - 1);
    return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
  };

  /**
   * @method bounceIn
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static bounceIn: EasingFunction = function (t: number): number {
    return 1 - Ease.bounceOut(1 - t);
  };

  /**
   * @method bounceOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static bounceOut: EasingFunction = function (t: number): number {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  };

  /**
   * @method bounceInOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static bounceInOut: EasingFunction = function (t: number): number {
    if (t < 0.5) return Ease.bounceIn(t * 2) * 0.5;
    return Ease.bounceOut(t * 2 - 1) * 0.5 + 0.5;
  };

  /**
   * Configurable elastic ease.
   * @method getElasticIn
   * @param {Number} amplitude
   * @param {Number} period
   * @static
   * @return {Function}
   **/
  static getElasticIn(amplitude: number, period: number): EasingFunction {
    var pi2 = Math.PI * 2;
    return function (t: number): number {
      if (t == 0 || t == 1) return t;
      var s = (period / pi2) * Math.asin(1 / amplitude);
      return -(amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin(((t - s) * pi2) / period));
    };
  }
  /**
   * @method elasticIn
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static elasticIn: EasingFunction = Ease.getElasticIn(1, 0.3);

  /**
   * Configurable elastic ease.
   * @method getElasticOut
   * @param {Number} amplitude
   * @param {Number} period
   * @static
   * @return {Function}
   **/
  static getElasticOut(amplitude: number, period: number): EasingFunction {
    var pi2 = Math.PI * 2;
    return function (t: number): number {
      if (t == 0 || t == 1) return t;
      var s = (period / pi2) * Math.asin(1 / amplitude);
      return amplitude * Math.pow(2, -10 * t) * Math.sin(((t - s) * pi2) / period) + 1;
    };
  }
  /**
   * @method elasticOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static elasticOut: EasingFunction = Ease.getElasticOut(1, 0.3);

  /**
   * Configurable elastic ease.
   * @method getElasticInOut
   * @param {Number} amplitude
   * @param {Number} period
   * @static
   * @return {Function}
   **/
  static getElasticInOut(amplitude: number, period: number): EasingFunction {
    var pi2 = Math.PI * 2;
    return function (t: number): number {
      var s = (period / pi2) * Math.asin(1 / amplitude);
      if ((t *= 2) < 1)
        return -0.5 * (amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin(((t - s) * pi2) / period));
      return amplitude * Math.pow(2, -10 * (t -= 1)) * Math.sin(((t - s) * pi2) / period) * 0.5 + 1;
    };
  }
  /**
   * @method elasticInOut
   * @param {Number} t
   * @static
   * @return {Number}
   **/
  static elasticInOut: EasingFunction = Ease.getElasticInOut(1, 0.3 * 1.5);
}

export default Ease;
