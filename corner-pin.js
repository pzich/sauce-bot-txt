function normalizePoints(points) {
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;

  let avgDist = 0;
  for (const p of points) {
    const dx = p[0] - cx;
    const dy = p[1] - cy;
    avgDist += Math.sqrt(dx * dx + dy * dy);
  }
  avgDist /= points.length;

  const scale = Math.SQRT2 / avgDist;

  const T = [
    [scale, 0, -scale * cx],
    [0, scale, -scale * cy],
    [0, 0, 1]
  ];

  const normalized = points.map(p => ([
    scale * (p[0] - cx),
    scale * (p[1] - cy)
  ]));

  return { normalized, T };
}

function computeHomography3x3(src, dst) {
  const A = [];
  const b = [];

  for (let i = 0; i < 4; i++) {
    const [ x, y ] = src[i];
    const [ u, v ] = dst[i];

    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);

    b.push(u);
    b.push(v);
  }

  const h = solveLinearSystem(A, b);

  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1]
  ];
}

function multiply3x3(A, B) {
  const result = Array(3).fill(0).map(() => Array(3).fill(0));

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }

  return result;
}

function invert3x3(m) {
  const [
    [a, b, c],
    [d, e, f],
    [g, h, i]
  ] = m;

  const A =  (e * i - f * h);
  const B = -(d * i - f * g);
  const C =  (d * h - e * g);
  const D = -(b * i - c * h);
  const E =  (a * i - c * g);
  const F = -(a * h - b * g);
  const G =  (b * f - c * e);
  const H = -(a * f - c * d);
  const I =  (a * e - b * d);

  const det = a * A + b * B + c * C;

  if (Math.abs(det) < 1e-10) {
    throw new Error("Matrix not invertible");
  }

  const invDet = 1 / det;

  return [
    [A * invDet, D * invDet, G * invDet],
    [B * invDet, E * invDet, H * invDet],
    [C * invDet, F * invDet, I * invDet]
  ];
}

function solveLinearSystem(A, b) {
  const n = A.length;

  for (let i = 0; i < n; i++) {
    A[i] = A[i].concat(b[i]);
  }

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];

    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-10) {
      throw new Error("Singular matrix");
    }

    for (let j = i; j <= n; j++) {
      A[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = A[k][i];
      for (let j = i; j <= n; j++) {
        A[k][j] -= factor * A[i][j];
      }
    }
  }

  return A.map(row => row[n]);
}

function computeHomographyStable(quad1, quad2) {
  const { normalized: q1, T: T1 } = normalizePoints(quad1);
  const { normalized: q2, T: T2 } = normalizePoints(quad2);

  const Hn = computeHomography3x3(q1, q2);

  const T2_inv = invert3x3(T2);

  return multiply3x3(multiply3x3(T2_inv, Hn), T1);
}

function sortQuad(points) {
  const cx = points.reduce((s, p) => s + p[0], 0) / 4;
  const cy = points.reduce((s, p) => s + p[1], 0) / 4;

  return points
    .map(p => ({
      ...p,
      angle: Math.atan2(p[1] - cy, p[0] - cx)
    }))
    .sort((a, b) => a.angle - b.angle);
}

function to4x4(H) {
  return [
    H[0][0], H[1][0], 0, H[2][0],
    H[0][1], H[1][1], 0, H[2][1],
    0,       0,       1, 0,
    H[0][2], H[1][2], 0, H[2][2]
  ];
}

const getTransform = (src, dst) => to4x4(computeHomographyStable(src, dst));

function applyMatrix4x4(point, Mx) {
  const x = point[0];
  const y = point[1];
  const z = point[2] ?? 0;

  const M = [
    Mx[0], Mx[4], Mx[8],  Mx[12],
    Mx[1], Mx[5], Mx[9],  Mx[13],
    Mx[2], Mx[6], Mx[10], Mx[14],
    Mx[3], Mx[7], Mx[11], Mx[15],
  ];

  const nx =
    M[0] * x +
    M[1] * y +
    M[2] * z +
    M[3];

  const ny =
    M[4] * x +
    M[5] * y +
    M[6] * z +
    M[7];

  const nz =
    M[8] * x +
    M[9] * y +
    M[10] * z +
    M[11];

  const nw =
    M[12] * x +
    M[13] * y +
    M[14] * z +
    M[15];

  if (Math.abs(nw) > 1e-10) {
    return [
      nx / nw,
      ny / nw,
      nz / nw
    ];
  } else {
    return [ nx, ny, nz ];
  }
}
