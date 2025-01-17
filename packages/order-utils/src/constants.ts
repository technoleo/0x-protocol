import { getContractAddressesForChainOrThrow } from '@emdx-dex/contract-addresses';
import { BigNumber, NULL_ADDRESS, NULL_BYTES } from '@0x/utils';
import { MethodAbi } from 'ethereum-types';

const ERC20_METHOD_ABI: MethodAbi = {
    constant: false,
    inputs: [
        {
            name: 'tokenContract',
            type: 'address',
        },
    ],
    name: 'ERC20Token',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
};

const ERC721_METHOD_ABI: MethodAbi = {
    constant: false,
    inputs: [
        {
            name: 'tokenContract',
            type: 'address',
        },
        {
            name: 'tokenId',
            type: 'uint256',
        },
    ],
    name: 'ERC721Token',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
};

const MULTI_ASSET_METHOD_ABI: MethodAbi = {
    constant: false,
    inputs: [
        {
            name: 'amounts',
            type: 'uint256[]',
        },
        {
            name: 'nestedAssetData',
            type: 'bytes[]',
        },
    ],
    name: 'MultiAsset',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
};

const ERC1155_METHOD_ABI: MethodAbi = {
    constant: false,
    inputs: [
        { name: 'tokenAddress', type: 'address' },
        { name: 'tokenIds', type: 'uint256[]' },
        { name: 'tokenValues', type: 'uint256[]' },
        { name: 'callbackData', type: 'bytes' },
    ],
    name: 'ERC1155Assets',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
};

const STATIC_CALL_METHOD_ABI: MethodAbi = {
    constant: false,
    inputs: [
        { name: 'callTarget', type: 'address' },
        { name: 'staticCallData', type: 'bytes' },
        { name: 'callResultHash', type: 'bytes32' },
    ],
    name: 'StaticCall',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
};

export const constants = {
    NULL_ADDRESS,
    FAKED_PROVIDER: { isEIP1193: true },
    NULL_BYTES,
    NULL_ERC20_ASSET_DATA: '0xf47261b00000000000000000000000000000000000000000000000000000000000000000',
    // tslint:disable-next-line:custom-no-magic-numbers
    UNLIMITED_ALLOWANCE_IN_BASE_UNITS: new BigNumber(2).pow(256).minus(1),
    TESTRPC_CHAIN_ID: 1337,
    ADDRESS_LENGTH: 20,
    ERC20_ASSET_DATA_MIN_CHAR_LENGTH_WITH_PREFIX: 74, // 36 bytes
    ERC721_ASSET_DATA_MIN_CHAR_LENGTH_WITH_PREFIX: 138, // 68 bytes
    ERC1155_ASSET_DATA_MIN_CHAR_LENGTH_WITH_PREFIX: 266, // 132 bytes
    MULTI_ASSET_DATA_MIN_CHAR_LENGTH_WITH_PREFIX: 138, // 68 bytes
    STATIC_CALL_ASSET_DATA_MIN_CHAR_LENGTH_WITH_PREFIX: 202, // 100 bytes
    SELECTOR_CHAR_LENGTH_WITH_PREFIX: 10, // 4 bytes
    INFINITE_TIMESTAMP_SEC: new BigNumber(2524604400), // Close to infinite
    ZERO_AMOUNT: new BigNumber(0),
    EXCHANGE_DOMAIN_NAME: '0x Protocol',
    EXCHANGE_DOMAIN_VERSION: '3.0.0',
    DEFAULT_DOMAIN_SCHEMA: {
        name: 'EIP712Domain',
        parameters: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
        ],
    },
    EXCHANGE_ORDER_SCHEMA: {
        name: 'Order',
        parameters: [
            { name: 'makerAddress', type: 'address' },
            { name: 'takerAddress', type: 'address' },
            { name: 'feeRecipientAddress', type: 'address' },
            { name: 'senderAddress', type: 'address' },
            { name: 'makerAssetAmount', type: 'uint256' },
            { name: 'takerAssetAmount', type: 'uint256' },
            { name: 'makerFee', type: 'uint256' },
            { name: 'takerFee', type: 'uint256' },
            { name: 'expirationTimeSeconds', type: 'uint256' },
            { name: 'salt', type: 'uint256' },
            { name: 'makerAssetData', type: 'bytes' },
            { name: 'takerAssetData', type: 'bytes' },
            { name: 'makerFeeAssetData', type: 'bytes' },
            { name: 'takerFeeAssetData', type: 'bytes' },
        ],
    },
    EXCHANGE_ZEROEX_TRANSACTION_SCHEMA: {
        name: 'ZeroExTransaction',
        parameters: [
            { name: 'salt', type: 'uint256' },
            { name: 'expirationTimeSeconds', type: 'uint256' },
            { name: 'gasPrice', type: 'uint256' },
            { name: 'signerAddress', type: 'address' },
            { name: 'data', type: 'bytes' },
        ],
    },
    COORDINATOR_DOMAIN_NAME: '0x Protocol Coordinator',
    COORDINATOR_DOMAIN_VERSION: '3.0.0',
    COORDINATOR_APPROVAL_SCHEMA: {
        name: 'CoordinatorApproval',
        parameters: [
            { name: 'txOrigin', type: 'address' },
            { name: 'transactionHash', type: 'bytes32' },
            { name: 'transactionSignature', type: 'bytes' },
        ],
    },
    MAINNET_EXCHANGE_PROXY_DOMAIN: {
        name: 'ZeroEx',
        version: '1.0.0',
        chainId: 1,
        verifyingContract: getContractAddressesForChainOrThrow(1).exchangeProxy,
    },
    EXCHANGE_PROXY_MTX_SCEHMA: {
        name: 'MetaTransactionData',
        parameters: [
            { name: 'signer', type: 'address' },
            { name: 'sender', type: 'address' },
            { name: 'minGasPrice', type: 'uint256' },
            { name: 'maxGasPrice', type: 'uint256' },
            { name: 'expirationTimeSeconds', type: 'uint256' },
            { name: 'salt', type: 'uint256' },
            { name: 'callData', type: 'bytes' },
            { name: 'value', type: 'uint256' },
            { name: 'feeToken', type: 'address' },
            { name: 'feeAmount', type: 'uint256' },
        ],
    },
    ERC20_METHOD_ABI,
    ERC721_METHOD_ABI,
    MULTI_ASSET_METHOD_ABI,
    ERC1155_METHOD_ABI,
    STATIC_CALL_METHOD_ABI,
    IS_VALID_WALLET_SIGNATURE_MAGIC_VALUE: '0xb0671381',
    IS_VALID_VALIDATOR_SIGNATURE_MAGIC_VALUE: '0x42b38674',
    /*
     * The pseudo-token address for ETH used by the Exchange Proxy's `tranformERC20()`.
     */
    ETH_TOKEN_ADDRESS: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
};
