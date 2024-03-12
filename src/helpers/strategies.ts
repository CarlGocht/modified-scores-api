// import snapshot from '@snapshot-labs/strategies';
// import snapshot from 'strategy-test';

import strategies from '../strategies';
import { clone } from '../utils';

let strategiesCache;

export default function getStrategies() {
  if (strategiesCache) {
    return strategiesCache;
  }

  strategiesCache = Object.fromEntries(
    Object.entries(clone(strategies)).map(([key, strategy]) => [
      key,
      // @ts-ignore
      { key, ...strategy }
    ])
  );

  return strategiesCache;
}
