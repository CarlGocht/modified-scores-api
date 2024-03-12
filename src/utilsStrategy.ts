import fetch from 'cross-fetch';
import _strategies from './strategies';
import snapshot from '@snapshot-labs/snapshot.js';
import { getDelegations } from './utils/delegation';
import { getVp, getDelegations as getCoreDelegations } from './utils/vp';
import { createHash } from 'crypto';

export function sha256(str) {
  return createHash('sha256').update(str).digest('hex');
}

async function callStrategy(space, network, addresses, strategy, snapshot) {
  if (
    (snapshot !== 'latest' && strategy.params?.start > snapshot) ||
    (strategy.params?.end &&
      (snapshot === 'latest' || snapshot > strategy.params?.end))
  )
    return {};

  if (!_strategies.hasOwnProperty(strategy.name)) {
    throw new Error(`Invalid strategy: ${strategy.name}`);
  }

  const score: any = await _strategies[strategy.name].strategy(
    space,
    network,
    getProvider(network),
    addresses,
    strategy.params,
    snapshot
  );
  const addressesLc = addresses.map((address) => address.toLowerCase());
  return Object.fromEntries(
    Object.entries(score).filter(
      ([address, vp]: any[]) =>
        vp > 0 && addressesLc.includes(address.toLowerCase())
    )
  );
}

export async function getScoresDirect(
  space: string,
  strategies: any[],
  network: string,
  provider,
  addresses: string[],
  snapshot: number | string = 'latest'
) {
  try {
    console.log("in getScoresDirect")
    const networks = strategies.map((s) => s.network || network);
    console.log("after strategies.map networks")
    const snapshots = await getSnapshots(network, snapshot, provider, networks);
    console.log("after getSnapshots")
    // @ts-ignore
    if (addresses.length === 0) return strategies.map(() => ({}));
    console.log("calling strategies")
    return await Promise.all(
      strategies.map((strategy) =>
        callStrategy(
          space,
          strategy.network || network,
          addresses,
          strategy,
          snapshots[strategy.network || network]
        )
      )
    );
  } catch (e) {
    return Promise.reject(e);
  }
}

export function customFetch(url, options, timeout = 20000): Promise<any> {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('API request timeout')), timeout)
    )
  ]);
}

export const {
  multicall,
  Multicaller,
  subgraphRequest,
  ipfsGet,
  call,
  getDelegatesBySpace,
  getBlockNumber,
  getProvider,
  getSnapshots,
  SNAPSHOT_SUBGRAPH_URL
} = snapshot.utils;

export default {
  getScoresDirect,
  multicall,
  Multicaller,
  subgraphRequest,
  ipfsGet,
  call,
  getDelegatesBySpace,
  getBlockNumber,
  getProvider,
  getDelegations,
  getSnapshots,
  SNAPSHOT_SUBGRAPH_URL,
  getVp,
  getCoreDelegations
};
