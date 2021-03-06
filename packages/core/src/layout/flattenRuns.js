import Run from '../models/Run';

const flattenRuns = (runs = []) => {
  const regularRuns = runs.filter(run => run.start !== run.end);
  const emptyRuns = runs.filter(run => run.start === run.end);

  const regularFlattenRuns = flattenRegularRuns(regularRuns);
  const emptyFlattenRuns = flattenEmptyRuns(emptyRuns);
  const sortRuns = (a, b) => a.start - b.start || a.end - b.end;

  return [...regularFlattenRuns, ...emptyFlattenRuns].sort(sortRuns);
};

const flattenEmptyRuns = runs => {
  const points = runs.reduce((acc, run) => {
    if (!acc.includes(run.start)) {
      return [...acc, run.start];
    }

    return acc;
  }, []);

  return points.map(point => {
    const pointRuns = runs.filter(run => run.start === point);
    const attrs = pointRuns.reduce((acc, run) => Object.assign({}, acc, run.attributes), {});

    return new Run(point, point, attrs);
  });
};

const flattenRegularRuns = runs => {
  const res = [];
  const points = [];

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    points.push(['start', run.start, run.attributes, i]);
    points.push(['end', run.end, run.attributes, i]);
  }

  points.sort((a, b) => a[1] - b[1] || a[3] - b[3]);

  let start = -1;
  let attrs = {};
  const stack = [];

  for (const [type, offset, attributes] of points) {
    if (start !== -1 && start < offset) {
      res.push(new Run(start, offset, attrs));
    }

    if (type === 'start') {
      stack.push(attributes);
      attrs = Object.assign({}, attrs, attributes);
    } else {
      attrs = {};

      for (let i = 0; i < stack.length; i++) {
        if (stack[i] === attributes) {
          stack.splice(i--, 1);
        } else {
          Object.assign(attrs, stack[i]);
        }
      }
    }

    start = offset;
  }

  return res;
};

export default flattenRuns;
