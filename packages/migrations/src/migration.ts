import { ContractAddresses, getContractAddressesForChainOrThrow } from '@emdx-dex/contract-addresses';
import {
    artifacts as assetProxyArtifacts,
    ERC1155ProxyContract,
    ERC20BridgeProxyContract,
    ERC20ProxyContract,
    ERC721ProxyContract,
    MultiAssetProxyContract,
    StaticCallProxyContract,
} from '@0x/contracts-asset-proxy';
import {
    artifacts as coordinatorArtifacts,
    CoordinatorContract,
    CoordinatorRegistryContract,
} from '@0x/contracts-coordinator';
import { artifacts as devUtilsArtifacts, DevUtilsContract } from '@0x/contracts-dev-utils';
import { artifacts as erc1155Artifacts, ERC1155MintableContract } from '@0x/contracts-erc1155';
import { artifacts as erc20Artifacts, DummyERC20TokenContract, WETH9Contract } from '@0x/contracts-erc20';
import { artifacts as erc721Artifacts, DummyERC721TokenContract } from '@0x/contracts-erc721';
import { artifacts as exchangeArtifacts, ExchangeContract } from '@0x/contracts-exchange';
import { artifacts as forwarderArtifacts, ForwarderContract } from '@0x/contracts-exchange-forwarder';
import {
    artifacts as stakingArtifacts,
    StakingProxyContract,
    TestStakingContract,
    ZrxVaultContract,
} from '@0x/contracts-staking';
import {
    AffiliateFeeTransformerContract,
    artifacts as exchangeProxyArtifacts,
    BridgeAdapterContract,
    FillQuoteTransformerContract,
    fullMigrateAsync as fullMigrateExchangeProxyAsync,
    PayTakerTransformerContract,
    PositiveSlippageFeeTransformerContract,
    WethTransformerContract,
} from '@0x/contracts-zero-ex';
import { Web3ProviderEngine } from '@0x/subproviders';
import { BigNumber, providerUtils } from '@0x/utils';
import { SupportedProvider, TxData } from 'ethereum-types';

import { constants } from './utils/constants';
import { erc20TokenInfo, erc721TokenInfo } from './utils/token_info';

const allArtifacts = {
    ...assetProxyArtifacts,
    ...coordinatorArtifacts,
    ...devUtilsArtifacts,
    ...erc1155Artifacts,
    ...erc20Artifacts,
    ...erc721Artifacts,
    ...exchangeArtifacts,
    ...forwarderArtifacts,
    ...stakingArtifacts,
    ...exchangeProxyArtifacts,
    ...assetProxyArtifacts,
};

const { NULL_ADDRESS } = constants;

/**
 * Creates and deploys all the contracts that are required for the latest
 * version of the 0x protocol.
 * @param supportedProvider  Web3 provider instance. Your provider instance should connect to the testnet you want to deploy to.
 * @param txDefaults Default transaction values to use when deploying contracts (e.g., specify the desired contract creator with the `from` parameter).
 * @returns The addresses of the contracts that were deployed.
 */
export async function runMigrationsAsync(
    supportedProvider: SupportedProvider,
    txDefaults: TxData,
): Promise<ContractAddresses> {
    const provider = providerUtils.standardizeOrThrow(supportedProvider);
    const chainId = new BigNumber(await providerUtils.getChainIdAsync(provider));

    // Proxies
    const erc20Proxy = await ERC20ProxyContract.deployFrom0xArtifactAsync(
        assetProxyArtifacts.ERC20Proxy,
        provider,
        txDefaults,
        allArtifacts,
    );
    const erc721Proxy = await ERC721ProxyContract.deployFrom0xArtifactAsync(
        assetProxyArtifacts.ERC721Proxy,
        provider,
        txDefaults,
        allArtifacts,
    );

    // ZRX
    const zrxToken = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
        erc20Artifacts.DummyERC20Token,
        provider,
        txDefaults,
        allArtifacts,
        '0x Protocol Token',
        'ZRX',
        new BigNumber(18),
        new BigNumber(1000000000000000000000000000),
    );

    // Ether token
    const etherToken = await WETH9Contract.deployFrom0xArtifactAsync(
        erc20Artifacts.WETH9,
        provider,
        txDefaults,
        allArtifacts,
    );

    // WRBTC: https://github.com/Think-and-Dev/wrbtc
    const etherTokenAddress = "0x09b6ca5e4496238a1f176aea6bb607db96c2286e";

    // Exchange
    const exchange = await ExchangeContract.deployFrom0xArtifactAsync(
        exchangeArtifacts.Exchange,
        provider,
        txDefaults,
        allArtifacts,
        chainId,
    );

    // Dummy ERC20 tokens
    for (const token of erc20TokenInfo) {
        const totalSupply = new BigNumber(1000000000000000000000000000);
        // tslint:disable-next-line:no-unused-variable
        const dummyErc20Token = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
            erc20Artifacts.DummyERC20Token,
            provider,
            txDefaults,
            allArtifacts,
            token.name,
            token.symbol,
            token.decimals,
            totalSupply,
        );
    }

    // ERC721
    // tslint:disable-next-line:no-unused-variable
    const cryptoKittieToken = await DummyERC721TokenContract.deployFrom0xArtifactAsync(
        erc721Artifacts.DummyERC721Token,
        provider,
        txDefaults,
        allArtifacts,
        erc721TokenInfo[0].name,
        erc721TokenInfo[0].symbol,
    );

    // 1155 Asset Proxy
    const erc1155Proxy = await ERC1155ProxyContract.deployFrom0xArtifactAsync(
        assetProxyArtifacts.ERC1155Proxy,
        provider,
        txDefaults,
        allArtifacts,
    );

    const staticCallProxy = await StaticCallProxyContract.deployFrom0xArtifactAsync(
        assetProxyArtifacts.StaticCallProxy,
        provider,
        txDefaults,
        allArtifacts,
    );

    const multiAssetProxy = await MultiAssetProxyContract.deployFrom0xArtifactAsync(
        assetProxyArtifacts.MultiAssetProxy,
        provider,
        txDefaults,
        allArtifacts,
    );

    await erc20Proxy.addAuthorizedAddress(exchange.address).awaitTransactionSuccessAsync(txDefaults);
    await erc721Proxy.addAuthorizedAddress(exchange.address).awaitTransactionSuccessAsync(txDefaults);
    await erc1155Proxy.addAuthorizedAddress(exchange.address).awaitTransactionSuccessAsync(txDefaults);
    await multiAssetProxy.addAuthorizedAddress(exchange.address).awaitTransactionSuccessAsync(txDefaults);

    // MultiAssetProxy
    await erc20Proxy.addAuthorizedAddress(multiAssetProxy.address).awaitTransactionSuccessAsync(txDefaults);
    await erc721Proxy.addAuthorizedAddress(multiAssetProxy.address).awaitTransactionSuccessAsync(txDefaults);
    await erc1155Proxy.addAuthorizedAddress(multiAssetProxy.address).awaitTransactionSuccessAsync(txDefaults);
    await multiAssetProxy.registerAssetProxy(erc20Proxy.address).awaitTransactionSuccessAsync(txDefaults);
    await multiAssetProxy.registerAssetProxy(erc721Proxy.address).awaitTransactionSuccessAsync(txDefaults);
    await multiAssetProxy.registerAssetProxy(erc1155Proxy.address).awaitTransactionSuccessAsync(txDefaults);
    await multiAssetProxy.registerAssetProxy(staticCallProxy.address).awaitTransactionSuccessAsync(txDefaults);

    // Register the Asset Proxies to the Exchange
    await exchange.registerAssetProxy(erc20Proxy.address).awaitTransactionSuccessAsync(txDefaults);
    await exchange.registerAssetProxy(erc721Proxy.address).awaitTransactionSuccessAsync(txDefaults);
    await exchange.registerAssetProxy(erc1155Proxy.address).awaitTransactionSuccessAsync(txDefaults);
    await exchange.registerAssetProxy(multiAssetProxy.address).awaitTransactionSuccessAsync(txDefaults);
    await exchange.registerAssetProxy(staticCallProxy.address).awaitTransactionSuccessAsync(txDefaults);

    // CoordinatorRegistry
    const coordinatorRegistry = await CoordinatorRegistryContract.deployFrom0xArtifactAsync(
        coordinatorArtifacts.CoordinatorRegistry,
        provider,
        txDefaults,
        allArtifacts,
    );

    // Coordinator
    const coordinator = await CoordinatorContract.deployFrom0xArtifactAsync(
        coordinatorArtifacts.Coordinator,
        provider,
        txDefaults,
        allArtifacts,
        exchange.address,
        chainId,
    );

    // Dev Utils
    const devUtils = await DevUtilsContract.deployWithLibrariesFrom0xArtifactAsync(
        devUtilsArtifacts.DevUtils,
        devUtilsArtifacts,
        provider,
        txDefaults,
        allArtifacts,
        exchange.address,
        NULL_ADDRESS,
        NULL_ADDRESS,
    );

    // tslint:disable-next-line:no-unused-variable
    const erc1155DummyToken = await ERC1155MintableContract.deployFrom0xArtifactAsync(
        erc1155Artifacts.ERC1155Mintable,
        provider,
        txDefaults,
        allArtifacts,
    );

    const erc20BridgeProxy = await ERC20BridgeProxyContract.deployFrom0xArtifactAsync(
        assetProxyArtifacts.ERC20BridgeProxy,
        provider,
        txDefaults,
        allArtifacts,
    );
    await exchange.registerAssetProxy(erc20BridgeProxy.address).awaitTransactionSuccessAsync(txDefaults);
    await erc20BridgeProxy.addAuthorizedAddress(exchange.address).awaitTransactionSuccessAsync(txDefaults);
    await erc20BridgeProxy.addAuthorizedAddress(multiAssetProxy.address).awaitTransactionSuccessAsync(txDefaults);
    await multiAssetProxy.registerAssetProxy(erc20BridgeProxy.address).awaitTransactionSuccessAsync(txDefaults);

    const zrxProxy = erc20Proxy.address;
    const zrxVault = await ZrxVaultContract.deployFrom0xArtifactAsync(
        stakingArtifacts.ZrxVault,
        provider,
        txDefaults,
        allArtifacts,
        zrxProxy,
        zrxToken.address,
    );

    // Note we use TestStakingContract as the deployed bytecode of a StakingContract
    // has the tokens hardcoded
    const stakingLogic = await TestStakingContract.deployFrom0xArtifactAsync(
        stakingArtifacts.TestStaking,
        provider,
        txDefaults,
        allArtifacts,
        etherTokenAddress,
        zrxVault.address,
    );

    const stakingProxy = await StakingProxyContract.deployFrom0xArtifactAsync(
        stakingArtifacts.StakingProxy,
        provider,
        txDefaults,
        allArtifacts,
        stakingLogic.address,
    );

    await erc20Proxy.addAuthorizedAddress(zrxVault.address).awaitTransactionSuccessAsync(txDefaults);

    // Reference the Proxy as the StakingContract for setup
    const stakingDel = await new TestStakingContract(stakingProxy.address, provider, txDefaults);
    await stakingProxy.addAuthorizedAddress(txDefaults.from).awaitTransactionSuccessAsync(txDefaults);
    await stakingDel.addExchangeAddress(exchange.address).awaitTransactionSuccessAsync(txDefaults);
    await exchange.setProtocolFeeCollectorAddress(stakingProxy.address).awaitTransactionSuccessAsync(txDefaults);
    await exchange.setProtocolFeeMultiplier(new BigNumber(70000)).awaitTransactionSuccessAsync(txDefaults);

    await zrxVault.addAuthorizedAddress(txDefaults.from).awaitTransactionSuccessAsync(txDefaults);
    await zrxVault.setStakingProxy(stakingProxy.address).awaitTransactionSuccessAsync(txDefaults);
    await stakingLogic.addAuthorizedAddress(txDefaults.from).awaitTransactionSuccessAsync(txDefaults);
    await stakingLogic.addExchangeAddress(exchange.address).awaitTransactionSuccessAsync(txDefaults);

    // Forwarder
    // Deployed after Exchange and Staking is configured as it queries
    // in the constructor
    const { exchangeV2: exchangeV2Address } = getContractAddressesForChainOrThrow(chainId.toNumber());
    const forwarder = await ForwarderContract.deployFrom0xArtifactAsync(
        forwarderArtifacts.Forwarder,
        provider,
        txDefaults,
        allArtifacts,
        exchange.address,
        exchangeV2Address || NULL_ADDRESS,
        etherTokenAddress,
    );

    // JAM
    // tslint:disable-next-line:no-unused-variable
    const jamToken = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
        erc20Artifacts.DummyERC20Token,
        provider,
        txDefaults,
        allArtifacts,
        'JAM Token',
        'JAM',
        new BigNumber(18),
        new BigNumber(1000000000000000000000000000),
    );

    // Exchange Proxy //////////////////////////////////////////////////////////

    const bridgeAdapter = await BridgeAdapterContract.deployFrom0xArtifactAsync(
        exchangeProxyArtifacts.BridgeAdapter,
        provider,
        txDefaults,
        allArtifacts,
        etherTokenAddress,
    );

    const exchangeProxy = await fullMigrateExchangeProxyAsync(txDefaults.from, provider, txDefaults);
    const exchangeProxyFlashWalletAddress = await exchangeProxy.getTransformWallet().callAsync();

    // Deploy transformers.
    const wethTransformer = await WethTransformerContract.deployFrom0xArtifactAsync(
        exchangeProxyArtifacts.WethTransformer,
        provider,
        txDefaults,
        allArtifacts,
        etherTokenAddress,
    );
    const payTakerTransformer = await PayTakerTransformerContract.deployFrom0xArtifactAsync(
        exchangeProxyArtifacts.PayTakerTransformer,
        provider,
        txDefaults,
        allArtifacts,
    );
    const affiliateFeeTransformer = await AffiliateFeeTransformerContract.deployFrom0xArtifactAsync(
        exchangeProxyArtifacts.AffiliateFeeTransformer,
        provider,
        txDefaults,
        allArtifacts,
    );
    const fillQuoteTransformer = await FillQuoteTransformerContract.deployFrom0xArtifactAsync(
        exchangeProxyArtifacts.FillQuoteTransformer,
        provider,
        txDefaults,
        allArtifacts,
        bridgeAdapter.address,
        exchangeProxy.address,
    );
    const positiveSlippageFeeTransformer = await PositiveSlippageFeeTransformerContract.deployFrom0xArtifactAsync(
        exchangeProxyArtifacts.PositiveSlippageFeeTransformer,
        provider,
        txDefaults,
        allArtifacts,
    );
    const contractAddresses = {
        erc20Proxy: erc20Proxy.address,
        erc721Proxy: erc721Proxy.address,
        erc1155Proxy: erc1155Proxy.address,
        zrxToken: zrxToken.address,
        etherToken: etherTokenAddress,
        exchange: exchange.address,
        assetProxyOwner: NULL_ADDRESS,
        erc20BridgeProxy: erc20BridgeProxy.address,
        zeroExGovernor: NULL_ADDRESS,
        forwarder: forwarder.address,
        coordinatorRegistry: coordinatorRegistry.address,
        coordinator: coordinator.address,
        multiAssetProxy: multiAssetProxy.address,
        staticCallProxy: staticCallProxy.address,
        devUtils: devUtils.address,
        exchangeV2: exchangeV2Address || NULL_ADDRESS,
        zrxVault: zrxVault.address,
        staking: stakingLogic.address,
        stakingProxy: stakingProxy.address,
        erc20BridgeSampler: NULL_ADDRESS,
        chaiBridge: NULL_ADDRESS,
        dydxBridge: NULL_ADDRESS,
        godsUnchainedValidator: NULL_ADDRESS,
        broker: NULL_ADDRESS,
        chainlinkStopLimit: NULL_ADDRESS,
        maximumGasPrice: NULL_ADDRESS,
        dexForwarderBridge: NULL_ADDRESS,
        exchangeProxyGovernor: NULL_ADDRESS,
        exchangeProxy: exchangeProxy.address,
        exchangeProxyTransformerDeployer: txDefaults.from,
        exchangeProxyFlashWallet: exchangeProxyFlashWalletAddress,
        exchangeProxyLiquidityProviderSandbox: NULL_ADDRESS,
        transformers: {
            wethTransformer: wethTransformer.address,
            payTakerTransformer: payTakerTransformer.address,
            fillQuoteTransformer: fillQuoteTransformer.address,
            affiliateFeeTransformer: affiliateFeeTransformer.address,
            positiveSlippageFeeTransformer: positiveSlippageFeeTransformer.address,
        },
    };
    return contractAddresses;
}

let _cachedContractAddresses: ContractAddresses;

/**
 * Exactly like runMigrationsAsync but will only run the migrations the first
 * time it is called. Any subsequent calls will return the cached contract
 * addresses.
 * @param provider  Web3 provider instance. Your provider instance should connect to the testnet you want to deploy to.
 * @param txDefaults Default transaction values to use when deploying contracts (e.g., specify the desired contract creator with the `from` parameter).
 * @returns The addresses of the contracts that were deployed.
 */
export async function runMigrationsOnceAsync(
    provider: Web3ProviderEngine,
    txDefaults: TxData,
): Promise<ContractAddresses> {
    if (_cachedContractAddresses !== undefined) {
        return _cachedContractAddresses;
    }
    _cachedContractAddresses = await runMigrationsAsync(provider, txDefaults);
    return _cachedContractAddresses;
}
