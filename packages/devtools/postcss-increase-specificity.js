import selectorParser from 'postcss-selector-parser';

const DEFAULT_REPEAT = 5;

function isInsideGlobal(node) {
  let current = node.parent;
  while (current) {
    if (current.type === 'pseudo' && current.value.startsWith(':global')) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function countConsecutiveClassRun(parent, classNode) {
  const nodes = parent.nodes;
  const index = nodes.indexOf(classNode);
  let count = 1;

  for (let i = index - 1; i >= 0; i--) {
    const node = nodes[i];
    if (node.type !== 'class' || node.value !== classNode.value) {
      break;
    }
    count++;
  }

  for (let i = index + 1; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type !== 'class' || node.value !== classNode.value) {
      break;
    }
    count++;
  }

  return count;
}

function boostClass(classNode, repeat) {
  const parent = classNode.parent;
  const existing = countConsecutiveClassRun(parent, classNode);
  const toAdd = repeat - existing;

  if (toAdd <= 0) {
    return;
  }

  const nodes = parent.nodes;
  let index = nodes.indexOf(classNode);

  while (
    index + 1 < nodes.length &&
    nodes[index + 1].type === 'class' &&
    nodes[index + 1].value === classNode.value
  ) {
    index++;
  }

  let anchor = nodes[index];

  for (let i = 0; i < toAdd; i++) {
    const clone = selectorParser.className({ value: classNode.value });
    parent.insertAfter(anchor, clone);
    anchor = clone;
  }
}

function boostSelector(selector, repeat) {
  selector.walkClasses((classNode) => {
    if (isInsideGlobal(classNode)) {
      return;
    }

    const parent = classNode.parent;
    const index = parent.nodes.indexOf(classNode);
    const prev = index > 0 ? parent.nodes[index - 1] : null;

    if (prev?.type === 'class' && prev.value === classNode.value) {
      return;
    }

    boostClass(classNode, repeat);
  });
}

const increaseSpecificity = (opts = {}) => {
  const repeat = opts.repeat ?? DEFAULT_REPEAT;

  return {
    postcssPlugin: 'postcss-increase-specificity',

    Rule(rule) {
      if (!rule.selector.includes('.')) {
        return;
      }

      const transform = selectorParser((selectors) => {
        selectors.each((selector) => {
          boostSelector(selector, repeat);
        });
      });

      rule.selector = transform.processSync(rule.selector);
    },
  };
};

increaseSpecificity.postcss = true;

export default increaseSpecificity;
