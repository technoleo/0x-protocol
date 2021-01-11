import { BigNumber, NULL_BYTES } from '@0x/utils';
import { BlockParam } from 'ethereum-types';

import { SamplerOverrides } from '../../types';
import { ERC20BridgeSamplerContract } from '../../wrappers';

import { BalancerPoolsCache } from './balancer_utils';
import { BancorService } from './bancor_service';
import { CreamPoolsCache } from './cream_utils';
import { SamplerOperations } from './sampler_operations';
import { BatchedOperation, LiquidityProviderRegistry, TokenAdjacencyGraph } from './types';

/**
 * Generate sample amounts up to `maxFillAmount`.
 */
export function getSampleAmounts(maxFillAmount: BigNumber, numSamples: number, expBase: number = 1): BigNumber[] {
    const distribution = [...Array<BigNumber>(numSamples)].map((_v, i) => new BigNumber(expBase).pow(i));
    const stepSizes = distribution.map(d => d.div(BigNumber.sum(...distribution)));
    const amounts = stepSizes.map((_s, i) => {
        if (i === numSamples - 1) {
            return maxFillAmount;
        }
        return maxFillAmount
            .times(BigNumber.sum(...[0, ...stepSizes.slice(0, i + 1)]))
            .integerValue(BigNumber.ROUND_UP);
    });
    return amounts;
}

type BatchedOperationResult<T> = T extends BatchedOperation<infer TResult> ? TResult : never;

/**
 * Encapsulates interactions with the `ERC20BridgeSampler` contract.
 */
export class DexOrderSampler extends SamplerOperations {
    constructor(
        _samplerContract: ERC20BridgeSamplerContract,
        private readonly _samplerOverrides?: SamplerOverrides,
        balancerPoolsCache?: BalancerPoolsCache,
        creamPoolsCache?: CreamPoolsCache,
        tokenAdjacencyGraph?: TokenAdjacencyGraph,
        liquidityProviderRegistry?: LiquidityProviderRegistry,
        bancorServiceFn: () => Promise<BancorService | undefined> = async () => undefined,
    ) {
        super(
            _samplerContract,
            balancerPoolsCache,
            creamPoolsCache,
            tokenAdjacencyGraph,
            liquidityProviderRegistry,
            bancorServiceFn,
        );
    }

    /* Type overloads for `executeAsync()`. Could skip this if we would upgrade TS. */

    // prettier-ignore
    public async executeAsync<
        T1
    >(block: BlockParam, ...ops: [T1]): Promise<[
        BatchedOperationResult<T1>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2
    >(block: BlockParam, ...ops: [T1, T2]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3
    >(block: BlockParam, ...ops: [T1, T2, T3]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4
    >(block: BlockParam, ...ops: [T1, T2, T3, T4]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4, T5
    >(block: BlockParam, ...ops: [T1, T2, T3, T4, T5]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>,
        BatchedOperationResult<T5>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4, T5, T6
    >(block: BlockParam, ...ops: [T1, T2, T3, T4, T5, T6]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>,
        BatchedOperationResult<T5>,
        BatchedOperationResult<T6>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4, T5, T6, T7
    >(block: BlockParam, ...ops: [T1, T2, T3, T4, T5, T6, T7]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>,
        BatchedOperationResult<T5>,
        BatchedOperationResult<T6>,
        BatchedOperationResult<T7>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4, T5, T6, T7, T8
    >(block: BlockParam, ...ops: [T1, T2, T3, T4, T5, T6, T7, T8]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>,
        BatchedOperationResult<T5>,
        BatchedOperationResult<T6>,
        BatchedOperationResult<T7>,
        BatchedOperationResult<T8>
    ]>;

    /**
     * Run a series of operations from `DexOrderSampler.ops` in a single transaction.
     */
    public async executeAsync(block: BlockParam, ...ops: any[]): Promise<any[]> {
        return this.executeBatchAsync(block, ops);
    }

    /**
     * Run a series of operations from `DexOrderSampler.ops` in a single transaction.
     * Takes an arbitrary length array, but is not typesafe.
     */
    public async executeBatchAsync<T extends Array<BatchedOperation<any>>>(block: BlockParam, ops: T): Promise<any[]> {
        const callDatas = ops.map(o => o.encodeCall());
        const { overrides } = this._samplerOverrides ? this._samplerOverrides : { overrides: undefined };

        // All operations are NOOPs
        if (callDatas.every(cd => cd === NULL_BYTES)) {
            return callDatas.map((_callData, i) => ops[i].handleCallResults(NULL_BYTES));
        }
        // Execute all non-empty calldatas.
        const rawCallResults = await this._samplerContract
            .batchCall(callDatas.filter(cd => cd !== NULL_BYTES))
            .callAsync({ overrides }, block);
        // Return the parsed results.
        let rawCallResultsIdx = 0;
        return callDatas.map((callData, i) => {
            const result = callData !== NULL_BYTES ? rawCallResults[rawCallResultsIdx++] : NULL_BYTES;
            return ops[i].handleCallResults(result);
        });
    }
}
