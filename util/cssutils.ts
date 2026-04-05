export function css2matrix(s: string): DOMMatrix {
  return new DOMMatrix(s);
}

export function matrix2css(m: DOMMatrix | { $matrix: DOMMatrix }): string {
  let mat: DOMMatrix;
  if ("$matrix" in m) {
    mat = m.$matrix;
  } else {
    mat = m;
  }

  return `matrix(${mat.m11},${mat.m12},${mat.m21},${mat.m22},${mat.m41},${mat.m42})`;
}
