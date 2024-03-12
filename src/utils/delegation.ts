import { getAddress } from '@ethersproject/address';
import {
  SNAPSHOT_SUBGRAPH_URL,
  getDelegatesBySpace,
  subgraphRequest
} from '../utilsStrategy';

const DELEGATION_DATA_CACHE = {};

function filterDelegationDataByAddresses(delegatesBySpace, addresses) {
  const addressesLc = addresses.map((addresses) => addresses.toLowerCase());

  const delegations = delegatesBySpace.filter(
    (delegation: any) =>
      addressesLc.includes(delegation.delegate) &&
      !addressesLc.includes(delegation.delegator)
  );
  if (!delegations) return {};

  const delegationsReverse = {};
  delegations.forEach(
    (delegation: any) =>
      (delegationsReverse[delegation.delegator] = delegation.delegate)
  );
  delegations
    .filter((delegation: any) => delegation.space !== '')
    .forEach(
      (delegation: any) =>
        (delegationsReverse[delegation.delegator] = delegation.delegate)
    );

  const data = Object.fromEntries(
    addresses.map((address: string) => [
      address,
      Object.entries(delegationsReverse)
        .filter(([, delegate]) => address.toLowerCase() === delegate)
        .map(([delegator]) => getAddress(delegator))
    ])
  );

  return data;
}

export async function getDelegationsBySpaceAndAddressesFromGraphAPI(
  space: string,
  network: string,
  addresses: string[],
  snapshot = 'latest'
) {
  const url = SNAPSHOT_SUBGRAPH_URL[network];

  if (!url) {
    return Promise.reject(
      `Delegation subgraph not available for network ${network}`
    );
  }
  const PAGE_SIZE = 1000;
  let result = [];
  let page = 0;

  const spaceIn = ['', space];
  if (space.includes('.eth')) spaceIn.push(space.replace('.eth', ''));
  const orCondition = addresses.map((address) => ({
    delegate: address,
    space_in: spaceIn
  }));

  const params: any = {
    delegations: {
      __args: {
        where: {
          or: orCondition
        },
        first: 1000,
        skip: 0
      },
      delegator: true,
      space: true,
      delegate: true
    }
  };

  if (snapshot !== 'latest') {
    params.delegations.__args.block = { number: snapshot };
  }

  while (true) {
    params.delegations.__args.skip = page * PAGE_SIZE;

    const pageResult = await subgraphRequest(url, params);
    const pageDelegations = pageResult.delegations || [];
    result = result.concat(pageDelegations);
    page++;
    if (pageDelegations.length < PAGE_SIZE) break;
  }

  return result;
}

export async function getDelegationsBySpaceAndAddresses(
  space: string,
  network: string,
  addresses: string[],
  snapshot?: string
) {
  const delegatesBySpace = await getDelegationsBySpaceAndAddressesFromGraphAPI(
    space,
    network,
    addresses,
    snapshot
  );
  const data = filterDelegationDataByAddresses(delegatesBySpace, addresses);
  return data;
}

// delegations with overrides
export async function getDelegations(space, network, addresses, snapshot) {
  const delegatesBySpace = await getDelegatesBySpace(network, space, snapshot);
  const data = filterDelegationDataByAddresses(delegatesBySpace, addresses);
  return data;
}

function getDelegationReverseData(delegation) {
  return {
    delegate: delegation.delegate,
    delegateAddress: getAddress(delegation.delegate),
    delegator: delegation.delegator,
    delegatorAddress: getAddress(delegation.delegator)
  };
}

export async function getDelegationsData(space, network, addresses, snapshot) {
  const cacheKey = `${space}-${network}-${snapshot}`;
  let delegationsReverse = DELEGATION_DATA_CACHE[cacheKey];

  if (!delegationsReverse) {
    delegationsReverse = {};

    const delegatesBySpace = await getDelegationsBySpaceAndAddresses(
      space,
      network,
      addresses,
      snapshot
    );

    delegatesBySpace.forEach(
      (delegation: any) =>
        (delegationsReverse[delegation.delegator] =
          getDelegationReverseData(delegation))
    );
    delegatesBySpace
      .filter((delegation: any) => delegation.space !== '')
      .forEach(
        (delegation: any) =>
          (delegationsReverse[delegation.delegator] =
            getDelegationReverseData(delegation))
      );

    if (space === 'stgdao.eth' && snapshot !== 'latest') {
      // TODO: implement LRU so memory doesn't explode
      // we only cache stgdao for now
      console.log(`[with-delegation] Caching ${cacheKey}`);
      DELEGATION_DATA_CACHE[cacheKey] = delegationsReverse;
    }
  }
  return {
    delegations: Object.fromEntries(
      addresses.map((address) => [
        address,
        Object.values(delegationsReverse)
          .filter((data) => address.toLowerCase() === (data as any).delegate)
          .map((data) => (data as any).delegatorAddress)
      ])
    ),
    allDelegators: Object.values(delegationsReverse).map(
      (data) => (data as any).delegatorAddress
    )
  };
}
