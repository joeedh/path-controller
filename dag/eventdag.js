import * as util from '../util/util.js'

export const RecalcFlags = {
  RUN: 1,
  RESORT: 2
}
export class EventSocket {
}

export class EventNode {
  owner = undefined;
  inputs = {};
  outputs = {};
}
