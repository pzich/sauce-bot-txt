window.addEventListener('load', async () => {
  const fromCorners = [
    [1, 0],
    [0, 0],
    [0, 1],
    [1, 1],
  ];

  const toCorners = [
    [531.231, 544.91],
    [189.201, 456.33],
    [189.362, 930.148],
    [531.637, 1060.405],
  ];

  const textarea = document.querySelector('textarea');

  const loadSVG = (url) => fetch(url)
    .then(resp => resp.text())
    .then(txt => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(txt, 'image/svg+xml');
      return doc.querySelector('svg');
    });

  const [ font, template ] = await Promise.all([
    loadSVG('svgs/font.svg'),
    loadSVG('svgs/template.svg'),
  ]);
  template.querySelector('.corners')?.remove();

  const tsvg = font.cloneNode(false);
  tsvg.setAttribute('width', '0px');
  tsvg.setAttribute('height', '0px');
  tsvg.style.cssText = 'position: absolute; top: -1000px; left: -1000px; opacity: 0.0001;';
  document.body.appendChild(tsvg);
  const tpath = document.createElementNS(tsvg.getAttribute('xmlns'), 'path');
  tsvg.appendChild(tpath);

  const layout = font.cloneNode(false);
  const lpath = font.querySelector('path').cloneNode(false);
  layout.appendChild(lpath);
  document.querySelector('.layout').appendChild(layout);

  document.querySelector('.preview').appendChild(template);

  const pathForChar = (c) => {
    const code = c.charCodeAt(0).toString(16);
    return Array.from(font.querySelectorAll('path'))
      .filter(path => path.getAttribute('data-charcode') === code)[0];
  };

  const rowForString = (str) => {
    const p = document.createElementNS(tsvg.getAttribute('xmlns'), 'path');
    let d = '';

    let cx = 0, h = 0;
    const paths = str.split('').map(pathForChar);
    paths.filter(path => path).forEach((path, i, { length }) => {
      const pd = path.getAttribute('d');
      tpath.setAttribute('d', pd);
      const bbox = tpath.getBBox();
      if (i === 0) cx -= bbox.x;
      d += implode(translate(explode(pd), cx, 0));
      const w = parseFloat(path.getAttribute('data-width'));
      cx += w;
      if (i === length - 1) {
        cx -= bbox.x + bbox.width - w;
      }
      h = Math.max(h, parseFloat(path.getAttribute('data-height')));
    });

    p.setAttribute('d', d);
    p.setAttribute('data-width', cx);
    p.setAttribute('data-height', h);

    return p;
  }

  const update = () => {
    const txt = textarea.value;
    const rows = txt.split('\n').filter(v => v).map(rowForString);

    const w = Math.max.apply(
      null,
      rows.map(row => parseFloat(row.getAttribute('data-width')))
    );

    /*
    const h = rows
      .map(row => parseFloat(row.getAttribute('data-height')))
      .reduce((a, b) => a + b, 0);
    */

    const tpath = template.querySelector('.text');

    if (w === 0 || rows.length == 0) {
      layout.setAttribute('width', '0px');
      layout.setAttribute('height', '0px');
      tpath.setAttribute('d', '');
      return;
    }

    let ld = '';
    lpath.setAttribute('d', ld);

    let cy = 0;
    rows.forEach((row, i, { length }) => {
      const d = implode(translate(explode(row.getAttribute('d')), 0, cy));
      ld += d;
      lpath.setAttribute('d', ld);

      if (i == 0) {
        const { y } = row.getBBox();
        cy -= y;
        const d = implode(translate(explode(row.getAttribute('d')), 0, -y));
        ld += d;
        lpath.setAttribute('d', ld);
      }

      cy += parseFloat(row.getAttribute('data-height'));
    });

    const { y, height } = lpath.getBBox();
    const h = y + height;

    layout.setAttribute('width', `${w}px`);
    layout.setAttribute('height', `${h}px`);

    const d = Array.from(layout.querySelectorAll('path'))
      .map(path => path.getAttribute('d'))
      .join('');

    const mat = getTransform(
      fromCorners.map(p => ([p[0] * w, p[1] * h])),
      toCorners,
    );
    const dt = transformPath(d, mat);

    tpath.setAttribute('d', dt);
  };

  textarea.addEventListener('keyup', update);
  update();

  const flatSVG = () => {
    const svg = template.cloneNode(true);
    const d = Array.from(svg.querySelectorAll('path'))
      .map(path => path.getAttribute('d'))
      .join('');

    while (svg.querySelector('path:nth-child(2)').remove()) { }
    svg.querySelector('path').setAttribute('d', d);

    Array.from(svg.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.remove();
        }
    });

    return svg.outerHTML;
  }

  const copySVG = () => {
    const svg = flatSVG();
    navigator.clipboard.write([
        new ClipboardItem({
          'image/svg+xml': svg,
          'text/plain': svg,
        }),
    ]);
  }

  const downloadSVG = () => {
    const blob = new Blob([flatSVG()], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'download.svg';
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  document.querySelector('button.copy').addEventListener('click', copySVG);
  document.querySelector('button.download').addEventListener('click', downloadSVG);
});
