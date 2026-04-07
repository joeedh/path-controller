let indexRangeStack: IndexRangeStack;

class _IndexRange {
  start = 0;
  end = 0;
  i = 0;
  ret = { done: false, value: undefined } as { done: boolean; value: number | undefined };

  constructor(start: number, end: number) {
    this.start = start;
    this.end = end;
  }

  [Symbol.iterator]() {
    return this;
  }

  next() {
    if (this.i < this.end) {
      this.ret.done = false;
      this.ret.value = this.i++;
      return this.ret;
    } else {
      this.finish();
      this.ret.done = true;
      return this.ret;
    }
  }

  finish() {
    indexRangeStack.cur--;
  }

  reset(start = 0, end = 0, i = 0) {
    this.start = start;
    this.end = end;
    this.i = i;
    return this;
  }

  return() {
    this.reset();
    this.finish();
    return this.ret;
  }
}

class IndexRangeStack extends Array<_IndexRange> {
  cur = 0;
}

indexRangeStack = new IndexRangeStack(2048);
for (let i = 0; i < 2048; i++) {
  indexRangeStack[i] = new _IndexRange(0, 0);
}

export function IndexRange(len: number): Iterable<number> {
  return indexRangeStack[indexRangeStack.cur++].reset(0, len) as unknown as Iterable<number>;
}
