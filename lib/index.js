import QRCodeStyling from 'qr-code-styling';
import {isMobile, isIOS, isAndroid, isPhone, isIPad} from './mobile-check';
import {getRecommendationsMobile, dispose as disposeGetRecommendationsMobile} from './get-recommendations-mobile.js';
import {
    init as initApi,
    dispose as disposeApi,
    loadOrganizationInfo,
    createMeasurement,
    loadRecommendationsSocket,
    createDynamicLink,
    createShortDynamicLink,
    sendUsageAcknowledgement
} from './api.js';

import {createQR, removeQR} from "./qr.js";
import {getMockData} from "./mock.js";
import {getRecommendations, storeRecommendationData} from "./recommendation.js";
import {installButtonCheck} from "./cart-button.js";
import {setupByAttributes, showQRContainer, hideQRContainer} from "./dom.js";
import {log} from "./logger.js";

export {isMobile};
export {isIOS};
export {isAndroid};

const __baseURL = 'https://api-staging.spotsize.io';
const __socketURL = 'wss://api-staging.spotsize.io/ws/recommendations';

let _to;
let _popUpWindow;
let _cartButton;
let _baseURL;
let _socketURL;
let _organizationId;
let _measurementId;
let _recommendation;

let _promise;

export const events = {
    onQRShown: null,
    onQRRemoved: null,
    onStart: null,
    onStop: null,
    onError: null,
    onComplete: null
}

/**
 * @param {string} organizationId - Your provided organizationId
 * @param {boolean} useTestEnv - Use test environment
 */
export const init = async (organizationId, useTestEnv) => {
    _organizationId = organizationId;
    _baseURL = __baseURL;
    _socketURL = __socketURL;

    if (useTestEnv) {
        _baseURL = _baseURL.replace('api-staging', 'api-dev');
        _socketURL = _socketURL.replace('api-staging', 'api-dev');
    }
    initApi(_organizationId, _baseURL, _socketURL);
    try {
        _measurementId = await createMeasurementId(_organizationId);
    } catch(e) {
        throw Error('Loading organization data failed. Check your organizationId.');
    }
}

/**
 * @typedef {Object} Options
 * @property {string} productName The product name to be shown in the native app result screen.
 * @property {boolean} useMockData Set to 'true' to directly receive mock data and bypass the actual scan flow
 * @property {Object} payload Custom payload that is returned along with the recommendation
 */

/**
 * @param {string|[string]} productId - Single productId, a list of productIds to get recommendations for
 * @param {HTMLElement} qrContainer - Element to add the QR
 * @param {Options} options - Optional settings
 * @return {Promise<Recommendation>} A promise to the recommendation data
 */
export const start = async (productId, qrContainer, options) => {
    if (isAndroid()) {
        throw Error("Android is currently not yet supported.");
    }

    if (_organizationId === undefined) {
        throw Error('organizationId is missing');
     }

    if (productId === undefined) {
        throw Error('productId is missing');
     }

    if (productId.constructor === Array) {
        if (productId.length === 0) {
            throw Error('productId list is empty');
        }
    } else {
        productId = [productId];
    }

    if (qrContainer === undefined) {
        throw Error('qrContainer is missing');
     }

    if (_measurementId === undefined) {
        throw Error('measurementId not defined');
    }

    if (options) {
        if (options.constructor === Boolean) {
            options = {
                useMockData: true
            }
        } else {
            if (options.payload) {
                const str = JSON.stringify(options.payload);
                if (str.length > 300) {
                    throw Error('custom payload is too big');
                }
            }
        }
    } else {
        options = {};
    }

    productId = productId.map(e => String(e));

    _popUpWindow = undefined;
    removeQR();
    disposeApi();
    clearTimeout(_to);

    try {
        await installButtonCheck(_organizationId)
    } catch (e) {
        throw Error(e);
    }

    if (events.onStart) events.onStart();

    if (options.useMockData) {
        showQRContainer();
        createQR('https://spotsize.io', qrContainer);
        const r = await new Promise((resolve) => {
            _to = setTimeout(() => {
                removeQR();
                const recommendation = getMockData(productId);
                recommendation.requestedProductId = productId;
                recommendation.options = options;

                storeRecommendationData(Date.now(), 'orgId');

                if (events.onComplete) events.onComplete(recommendation);
                resolve(recommendation);
            }, 1000);
        });
        return r;
    }

    try {
        if (isPhone()) {
            const link = createDynamicLink(_organizationId, _measurementId, productId, options);
            _popUpWindow = window.open(link, '_blank')
        } else {
            const linkData = await createShortDynamicLink(_organizationId, _measurementId, productId, options);
            createQR(linkData.shortLink, qrContainer);
        }


        _recommendation = await getRecommendations(_organizationId, _measurementId);
        _recommendation.requestedProductId = productId;
        _recommendation.options = options;
        storeRecommendationData(_recommendation.id, _organizationId)
        stop();

        _measurementId = await createMeasurementId(_organizationId);
        if (events.onComplete) events.onComplete(_recommendation);
        return _recommendation;
    } catch (error) {
        stop();
        if (events.onError) events.onError(error);
        throw new Error(error);
    }
}

const closePopUpWindow = () => {
    if (_popUpWindow) _popUpWindow.close();
    _popUpWindow = undefined;
}

const _stop = () => {
    removeQR();
    disposeApi();
    clearTimeout(_to);
    closePopUpWindow();
    disposeGetRecommendationsMobile();

    document.onvisibilitychange = undefined;
}

export const stop = () => {
    _stop();
    if (events.onStop) events.onStop();
}

const createMeasurementId = async (organizationId) => {
    const measurementData = await createMeasurement(organizationId);
    return measurementData.measurementId;
}

window.addEventListener('DOMContentLoaded', async (event) => {
    try {
        await setupByAttributes();
        await installButtonCheck();
    } catch (e) {
        log(e);
    }
});



