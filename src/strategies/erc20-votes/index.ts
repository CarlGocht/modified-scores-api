import { formatUnits } from '@ethersproject/units';
import { multicall } from '../../utilsStrategy';

export const author = 'bonustrack';
export const version = '0.1.0';

const abi = ['function getVotes(address account) view returns (uint256)'];

export async function strategy(
  space,
  network,
  provider,
  addresses,
  options,
  snapshot
) {
  const blockTag = typeof snapshot === 'number' ? snapshot : 'latest';
  const response = await multicall(
    network,
    provider,
    abi,
    addresses.map((address: any) => [
      options.address,
      'getVotes',
      [address.toLowerCase()]
    ]),
    { blockTag }
  );
  return Object.fromEntries(
    response.map((value, i) => [
      addresses[i],
      parseFloat(formatUnits(value.toString(), options.decimals))
    ])
  );
}
