import test from 'node:test';
import assert from 'node:assert/strict';
import { roomWindAt } from '../src/room-tree-wind.js';

test('an indoor gust reaches a tree to the right later, with a calm interval between gusts', () => {
  const x = .405;
  const laterX = x + .25;
  const peak = 7400 * (.34 + x * .66);
  const travel = 7400 * (laterX - x) * .66;
  assert.equal(roomWindAt(0, x).strength, 0);
  assert.ok(roomWindAt(peak, x).strength > .999);
  assert.ok(roomWindAt(peak, laterX).strength < .5);
  assert.ok(roomWindAt(peak + travel, laterX).strength > .999);
  assert.ok(roomWindAt(peak + 7400, x).strength > .999);
});
