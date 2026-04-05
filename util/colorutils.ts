import * as util from "../util/util.js";
import { Vector3, Vector4 } from "../util/vectormath.js";

const rgb_to_hsv_rets = new util.cachering(() => [0, 0, 0], 64);

export function rgb_to_hsv(r: number, g: number, b: number): number[] {
  let computedH = 0;
  let computedS = 0;
  let computedV = 0;

  if (r == null || g == null || b == null || isNaN(r) || isNaN(g) || isNaN(b)) {
    throw new Error(`Please enter numeric RGB values! r: ${r} g: ${g} b: ${b}`);
  }

  const minRGB = Math.min(r, Math.min(g, b));
  const maxRGB = Math.max(r, Math.max(g, b));

  // Black-gray-white
  if (minRGB === maxRGB) {
    computedV = minRGB;

    const ret = rgb_to_hsv_rets.next();
    (ret[0] = 0), (ret[1] = 0), (ret[2] = computedV);
    return ret;
  }

  // Colors other than black-gray-white:
  const d = r === minRGB ? g - b : b === minRGB ? r - g : b - r;
  const h = r === minRGB ? 3 : b === minRGB ? 1 : 5;

  computedH = (60 * (h - d / (maxRGB - minRGB))) / 360.0;
  computedS = (maxRGB - minRGB) / maxRGB;
  computedV = maxRGB;

  const ret = rgb_to_hsv_rets.next();
  (ret[0] = computedH), (ret[1] = computedS), (ret[2] = computedV);
  return ret;
}

const hsv_to_rgb_rets = new util.cachering(() => [0, 0, 0], 64);

export function hsv_to_rgb(h: number, s: number, v: number): number[] {
  let c = 0,
    m = 0,
    x = 0;
  const ret = hsv_to_rgb_rets.next();

  ret[0] = ret[1] = ret[2] = 0.0;
  h *= 360.0;

  c = v * s;
  x = c * (1.0 - Math.abs(((h / 60.0) % 2) - 1.0));
  m = v - c;
  let color: number[];

  function RgbF_Create(r: number, g: number, b: number): number[] {
    ret[0] = r;
    ret[1] = g;
    ret[2] = b;

    return ret;
  }

  if (h >= 0.0 && h < 60.0) {
    color = RgbF_Create(c + m, x + m, m);
  } else if (h >= 60.0 && h < 120.0) {
    color = RgbF_Create(x + m, c + m, m);
  } else if (h >= 120.0 && h < 180.0) {
    color = RgbF_Create(m, c + m, x + m);
  } else if (h >= 180.0 && h < 240.0) {
    color = RgbF_Create(m, x + m, c + m);
  } else if (h >= 240.0 && h < 300.0) {
    color = RgbF_Create(x + m, m, c + m);
  } else if (h >= 300.0) {
    color = RgbF_Create(c + m, m, x + m);
  } else {
    color = RgbF_Create(m, m, m);
  }

  return color;
}

const rgb_to_cmyk_rets = new util.cachering(() => new Vector4(), 512);
const cmyk_to_rgb_rets = new util.cachering(() => new Vector3(), 512);

export function cmyk_to_rgb(c: number, m: number, y: number, k: number) {
  const ret = cmyk_to_rgb_rets.next();

  if (k === 1.0) {
    ret.zero();
    return ret;
  }

  c = c - c * k + k;
  m = m - m * k + k;
  y = y - y * k + k;

  ret[0] = 1.0 - c;
  ret[1] = 1.0 - m;
  ret[2] = 1.0 - y;

  return ret;
}

export function rgb_to_cmyk(r: number, g: number, b: number) {
  //CMYK and CMY values from 0 to 1
  const ret = rgb_to_cmyk_rets.next();

  let C = 1.0 - r;
  let M = 1.0 - g;
  let Y = 1.0 - b;

  let var_K = 1;

  if (C < var_K) var_K = C;
  if (M < var_K) var_K = M;
  if (Y < var_K) var_K = Y;
  if (var_K === 1) {
    //Black
    C = 0;
    M = 0;
    Y = 0;
  } else {
    C = (C - var_K) / (1 - var_K);
    M = (M - var_K) / (1 - var_K);
    Y = (Y - var_K) / (1 - var_K);
  }

  const K = var_K;

  ret[0] = C;
  ret[1] = M;
  ret[2] = Y;
  ret[3] = K;

  return ret;
}
