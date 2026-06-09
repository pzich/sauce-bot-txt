const explode = (d) => {
  if (!d) return [];
  const commands = d.match(/[a-z][^a-z]*/ig);
  const pieces = commands.map(
    command =>
      command.match(/[a-z]|-?[0-9.]+[, ]?/ig)
        .map(p => p.replaceAll(/[, ]/g, ''))
        .map((p, i) => (i > 0) ? parseFloat(p) : p)
  );
  return pieces;
}

const implode = (pieces, accuracy = 3) =>
  pieces.map(command => {
    const cmd = command.shift();
    return `${cmd}${command.map(num => num.toFixed(accuracy)).join(',')}`;
  }).join('');

const transformPath = (d, M) => {
  const pieces = explode(d);

  pieces.forEach(command => {
    let i = 1;
    while (i < command.length) {
      const point = [ command[i], command[i + 1] ];
      const out = applyMatrix4x4(point, M);
      command[i] = out[0];
      command[i + 1] = out[1];
      i += 2;
    }
  });

  return implode(pieces);
}

const translate = (pieces, x, y) => {
  return pieces.map(
    cmd => cmd.map((v, i) => i === 0 ? v : (i % 2 === 1) ? v + x : v + y)
  )
}

const scale = (pieces, x, y) => {
  return pieces.map(
    cmd => cmd.map((v, i) => i === 0 ? v : (i % 2 === 1) ? v * x : v * y)
  )
}
