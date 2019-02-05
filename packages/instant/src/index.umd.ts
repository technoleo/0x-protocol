import { AssetBuyer, BigNumber } from '@0x/asset-buyer';
import { assetDataUtils } from '@0x/order-utils';
import { Provider } from 'ethereum-types';
import * as _ from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {
    DEFAULT_ZERO_EX_CONTAINER_SELECTOR,
    GIT_SHA as GIT_SHA_FROM_CONSTANT,
    INJECTED_DIV_CLASS,
    INJECTED_DIV_ID,
    NPM_PACKAGE_VERSION,
} from './constants';
import { assetMetaDataMap } from './data/asset_meta_data_map';
import { ZeroExInstantOverlay, ZeroExInstantOverlayProps } from './index';
import { Network, OrderSource } from './types';
import { analytics } from './util/analytics';
import { assert } from './util/assert';
import { providerFactory } from './util/provider_factory';
import { signedOrderCoercionUtil } from './util/signed_order_coercion';
import { util } from './util/util';

const isInstantRendered = (): boolean => !!document.getElementById(INJECTED_DIV_ID);

const validateInstantRenderConfig = (config: ZeroExInstantConfig, selector: string) => {
    assert.isValidOrderSource('orderSource', config.orderSource);
    if (!_.isUndefined(config.defaultSelectedAssetData)) {
        assert.isHexString('defaultSelectedAssetData', config.defaultSelectedAssetData);
    }
    if (!_.isUndefined(config.additionalAssetMetaDataMap)) {
        assert.isValidAssetMetaDataMap('additionalAssetMetaDataMap', config.additionalAssetMetaDataMap);
    }
    if (!_.isUndefined(config.defaultAssetBuyAmount)) {
        assert.isNumber('defaultAssetBuyAmount', config.defaultAssetBuyAmount);
    }
    if (!_.isUndefined(config.networkId)) {
        assert.isNumber('networkId', config.networkId);
    }
    if (!_.isUndefined(config.availableAssetDatas)) {
        assert.areValidAssetDatas('availableAssetDatas', config.availableAssetDatas);
    }
    if (!_.isUndefined(config.onClose)) {
        assert.isFunction('onClose', config.onClose);
    }
    if (!_.isUndefined(config.zIndex)) {
        assert.isNumber('zIndex', config.zIndex);
    }
    if (!_.isUndefined(config.affiliateInfo)) {
        assert.isValidAffiliateInfo('affiliateInfo', config.affiliateInfo);
    }
    if (!_.isUndefined(config.provider)) {
        assert.isWeb3Provider('provider', config.provider);
    }
    if (!_.isUndefined(config.walletDisplayName)) {
        assert.isString('walletDisplayName', config.walletDisplayName);
    }
    if (!_.isUndefined(config.shouldDisablePushToHistory)) {
        assert.isBoolean('shouldDisablePushToHistory', config.shouldDisablePushToHistory);
    }
    if (!_.isUndefined(config.shouldDisableAnalyticsTracking)) {
        assert.isBoolean('shouldDisableAnalyticsTracking', config.shouldDisableAnalyticsTracking);
    }
    assert.isString('selector', selector);
};

// Render instant and return a callback that allows you to remove it from the DOM.
const renderInstant = (config: ZeroExInstantConfig, selector: string) => {
    const appendToIfExists = document.querySelector(selector);
    assert.assert(!_.isNull(appendToIfExists), `Could not find div with selector: ${selector}`);
    const appendTo = appendToIfExists as Element;
    const injectedDiv = document.createElement('div');
    injectedDiv.setAttribute('id', INJECTED_DIV_ID);
    injectedDiv.setAttribute('class', INJECTED_DIV_CLASS);
    appendTo.appendChild(injectedDiv);
    const closeInstant = () => {
        analytics.trackInstantClosed();
        if (!_.isUndefined(config.onClose)) {
            config.onClose();
        }
        appendTo.removeChild(injectedDiv);
    };
    const instantOverlayProps = {
        ...config,
        // If we are using the history API, just go back to close
        onClose: () => (config.shouldDisablePushToHistory ? closeInstant() : window.history.back()),
    };
    ReactDOM.render(React.createElement(ZeroExInstantOverlay, instantOverlayProps), injectedDiv);
    return closeInstant;
};

export interface ZeroExInstantConfig extends ZeroExInstantOverlayProps {
    shouldDisablePushToHistory?: boolean;
}

export const render = (config: ZeroExInstantConfig, selector: string = DEFAULT_ZERO_EX_CONTAINER_SELECTOR) => {
    if (!_.isString(config.orderSource)) {
        config.orderSource = config.orderSource.map(signedOrderCoercionUtil.bigNumberCoercion);
    }

    validateInstantRenderConfig(config, selector);

    if (config.shouldDisablePushToHistory) {
        if (!isInstantRendered()) {
            renderInstant(config, selector);
        }
        return;
    }
    // Before we render, push to history saying that instant is showing for this part of the history.
    window.history.pushState({ zeroExInstantShowing: true }, '0x Instant');
    let removeInstant = renderInstant(config, selector);
    // If the integrator defined a popstate handler, save it to __zeroExInstantIntegratorsPopStateHandler
    // unless we have already done so on a previous render.
    const anyWindow = window as any;
    const popStateExistsAndNotSetPreviously = window.onpopstate && !anyWindow.__zeroExInstantIntegratorsPopStateHandler;
    anyWindow.__zeroExInstantIntegratorsPopStateHandler = popStateExistsAndNotSetPreviously
        ? anyWindow.onpopstate.bind(window)
        : util.boundNoop;
    const onPopStateHandler = (e: PopStateEvent) => {
        anyWindow.__zeroExInstantIntegratorsPopStateHandler(e);
        const newState = e.state;
        if (newState && newState.zeroExInstantShowing) {
            // We have returned to a history state that expects instant to be rendered.
            if (!isInstantRendered()) {
                removeInstant = renderInstant(config, selector);
            }
        } else {
            // History has changed to a different state.
            if (isInstantRendered()) {
                removeInstant();
            }
        }
    };
    window.onpopstate = onPopStateHandler;
};

export const assetDataForERC20TokenAddress = (tokenAddress: string): string => {
    assert.isETHAddressHex('tokenAddress', tokenAddress);
    return assetDataUtils.encodeERC20AssetData(tokenAddress);
};

export const hasMetaDataForAssetData = (assetData: string): boolean => {
    assert.isHexString('assetData', assetData);
    return assetMetaDataMap[assetData] !== undefined;
};

export const hasLiquidityForAssetDataAsync = async (
    assetData: string,
    orderSource: OrderSource,
    networkId: Network = Network.Mainnet,
    provider?: Provider,
): Promise<boolean> => {
    assert.isHexString('assetData', assetData);
    assert.isValidOrderSource('orderSource', orderSource);
    assert.isNumber('networkId', networkId);

    if (provider !== undefined) {
        assert.isWeb3Provider('provider', provider);
    }

    const bestProvider: Provider = provider || providerFactory.getFallbackNoSigningProvider(networkId);

    const assetBuyerOptions = { networkId };

    const assetBuyer = _.isString(orderSource)
        ? AssetBuyer.getAssetBuyerForStandardRelayerAPIUrl(bestProvider, orderSource, assetBuyerOptions)
        : AssetBuyer.getAssetBuyerForProvidedOrders(bestProvider, orderSource, assetBuyerOptions);

    const liquidity = await assetBuyer.getLiquidityForAssetDataAsync(assetData);
    return liquidity.ethValueAvailableInWei.gt(new BigNumber(0));
};

// Write version info to the exported object for debugging
export const GIT_SHA = GIT_SHA_FROM_CONSTANT;
export const NPM_VERSION = NPM_PACKAGE_VERSION;
