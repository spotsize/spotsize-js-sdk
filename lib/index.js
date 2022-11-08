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
    _measurementId = await createMeasurementId(_organizationId);
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
export const start = (productId, qrContainer, options) => {

    _promise = new Promise((resolve, reject) => {

        (async () => {
            if (isAndroid()) {
                return reject("Android is currently not yet supported.");
            }

            if (_organizationId === undefined) {
                reject('organizationId is missing');
                return
            }

            if (productId === undefined) {
                reject('productId is missing');
                return
            }

            if (productId.constructor === Array) {
                if (productId.length === 0) {
                    reject('productId list is empty');
                    return
                }
            } else {
                productId = [productId];
            }

            if (qrContainer === undefined) {
                reject('qrContainer is missing');
                return
            }

            if (_measurementId === undefined) {
                reject('measurementId not defined');
                return
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
                            reject('custom payload is too big');
                            return
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

            if (!installButtonCheck(reject, _organizationId)) return;

            if (events.onStart) events.onStart();

            if (options.useMockData) {
                createQR('https://spotsize.io', qrContainer);
                _to = setTimeout(() => {
                    removeQR();
                    const recommendation = getMockData(productId);
                    recommendation.requestedProductId = productId;
                    recommendation.options = options;

                    storeRecommendationData(Date.now(), 'orgId');

                    if (events.onComplete) events.onComplete(recommendation);
                    resolve(recommendation);
                }, 1000);
                return;
            }

            let data;
            if (isPhone()) {
                const link = createDynamicLink(_organizationId, _measurementId, productId, options);
                _popUpWindow = window.open(link, '_blank')
            } else {
                const linkData = await createShortDynamicLink(_organizationId, _measurementId, productId, options);
                createQR(linkData.shortLink, qrContainer);
            }

            try {
                _recommendation = await getRecommendations(_organizationId, _measurementId);
                _recommendation.requestedProductId = productId;
                _recommendation.options = options;
                storeRecommendationData(_recommendation.id, _organizationId)
                stop();

                _measurementId = await createMeasurementId(_organizationId);
                if (events.onComplete) events.onComplete(_recommendation);
                resolve(_recommendation);
            } catch (error) {
                stop();
                if (events.onError) events.onError(error);
                reject(error);
            }
        })();
    });

    return _promise;
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

const createMeasurementId = (organizationId) => {
    return new Promise((resolve, reject) => {
        (async () => {
            try {
                const measurementData = await createMeasurement(organizationId);
                resolve(measurementData.measurementId);
            } catch (error) {
                reject(error);
            }
        })();
    });
}





const setupByAttributes = () => {
    //
    let error = false;
    let organizationId = queryAttribute('organization-id');
    let productId = queryAttribute('product-id');
    _spotsizeButton = queryAttribute('button');
    _qrContainer = queryAttribute('qr-container');
    _resultContainer = queryAttribute('result-container');

    try {
        _organizationId = organizationId.dataset.spotsizeOrganizationId;
        _productId = productId.dataset.spotsizeProductId;
    } catch(e) {
        error = true;
    }

    if (_qrContainer === undefined) error = true;

    if (error) {
        if (organizationId !== undefined || productId !== undefined || _spotsizeButton !== undefined || _qrContainer !== undefined || _resultContainer !== undefined) {
            console.warn('Incorrect spotsize data attributes.');
        }
        return;
    }

    _useMockData = queryAttribute('use-mock-data') !== undefined;

    if (_spotsizeButton !== undefined) {
        _spotsizeButton.removeEventListener('click', handleSpotsizeButtonClick);
        _spotsizeButton.addEventListener('click', handleSpotsizeButtonClick);
    }

    _qrContainerDisplay = getComputedStyle(_qrContainer).display;
    switch(_qrContainer.dataset.spotsizeQrContainer) {
        case 'hidden':
            _qrContainer.style.display = 'none';
        break;
    }

    _resultContainerDisplay = getComputedStyle(_resultContainer).display;
    switch(_qrContainer.dataset.spotsizeResultContainer) {
        case 'hidden':
            _resultContainer.style.display = 'none';
            break;
    }

    console.log(_qrContainerDisplay);
    init(_organizationId);
}

const handleSpotsizeButtonClick = () => {
    start(_organizationId, _qrContainer);
};

const queryAttribute = (name) => {
    return document.querySelectorAll(`[data-spotsize-${name}]`)[0];
}

window.addEventListener('DOMContentLoaded', (event) => {
    // setupByAttributes();
    console.log('install');
    installButtonCheck();
});
