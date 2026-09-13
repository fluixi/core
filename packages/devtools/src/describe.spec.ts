// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { describeNode } from './describe.js';

describe('describeNode', () => {
  it('names an element by tag, id and the first of its classes', () => {
    const el = document.createElement('li');
    el.id = 'row';
    el.className = 'done urgent extra';
    // Two classes: past that it stops being a label and starts being a selector.
    expect(describeNode(el)).toBe('li#row.done.urgent');
  });

  it('names a text node by the element it sits in', () => {
    const el = document.createElement('span');
    const text = document.createTextNode('3');
    el.appendChild(text);
    expect(describeNode(text)).toBe('text in span');
  });

  it('names an empty hole by where it will go', () => {
    const el = document.createElement('ul');
    const marker = document.createComment('');
    el.appendChild(marker);
    expect(describeNode(marker)).toBe('slot in ul');
  });

  it('survives an svg element, whose className is not a string', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    svg.setAttribute('class', 'dot');
    expect(describeNode(svg)).toBe('circle.dot');
  });

  it('says so rather than throwing when there is nothing to describe', () => {
    expect(describeNode(null)).toBe('detached');
    expect(describeNode({ nope: true })).toBe('detached');
  });
});
