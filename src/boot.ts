import { forwardIfOld, receiveMove } from './move.ts';

// The move has to finish before main.ts reads storage at import time.
// (No top-level await: the build targets es2020.)
void (async () => {
  if (await forwardIfOld()) return;
  await receiveMove();
  await import('./main.ts');
})();
