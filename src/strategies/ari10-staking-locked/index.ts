import { BigNumberish } from '@ethersproject/bignumber';
import { formatUnits } from '@ethersproject/units';
import { Multicaller } from '../../utilsStrategy';

export const author = 'oritwoen';
export const version = '0.1.0';

const abi = [
  'function userInfo(uint256, address) external view returns (uint256 amount, uint256 lockedAmount)'
];

export async function strategy(
  space,
  network,
  provider,
  addresses,
  options,
  snapshot
): Promise<Record<string, number>> {
  const blockTag = typeof snapshot === 'number' ? snapshot : 'latest';

  const multi = new Multicaller(network, provider, abi, { blockTag });

  addresses.forEach((address) =>
    multi.call(address, options.address, 'userInfo', [0, address])
  );

  const result: Record<string, BigNumberish> = await multi.execute();

  return Object.fromEntries(
    Object.entries(result).map(([address, info]) => [
      address,
      parseFloat(formatUnits(info[options.input], 18)) * options.weight
    ])
  );
}
