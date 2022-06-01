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

export {isMobile};
export {isIOS};
export {isAndroid};

const __baseURL = 'https://api-staging.spotsize.io';
const __socketURL = 'wss://api-staging.spotsize.io/ws/recommendations';

const _id = 'sps-ckwz3cjnv00016g66jm0knh3t';

let _to;
let _popUpWindow;
let _button;
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

    _promise = new Promise(async (resolve, reject) => {

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

        if (!installButtonCheck(reject)) return;

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

const removeQR = () => {
    const element = document.getElementById(_id);
    if (element && element.parentElement) {
        element.remove();
        if (events.onQRRemoved) events.onQRRemoved();
    }
}

const createMeasurementId = (organizationId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const measurementData = await createMeasurement(organizationId);
            resolve(measurementData.measurementId);
        } catch (error) {
            reject(error);
        }
    });
}

const storageKey = () => {
    return location.href;
}

const storeRecommendationData = (recommendationId, organizationId) => {
    let storedData = {};
    try {
        storedData = JSON.parse(localStorage.getItem(_id)) || {};
    } catch {}

    const data = {
        id: recommendationId,
        time: Date.now(),
        url: location.href,
        oid: organizationId
    }
    storedData[storageKey()] = data;
    localStorage.setItem(_id, JSON.stringify(storedData));
}

const getRecommendationData = () => {
    try {
        const data = localStorage.getItem(_id);
        if (!data) return undefined;
        return JSON.parse(data)[storageKey()];
    } catch {
        return undefined;
    }
}

const clearRecommendationData = () => {
    try {
        const data = localStorage.getItem(_id);
        if (!data) return;
        const storedData = JSON.parse(data);
        storedData[storageKey()] = null;
        delete storedData[storageKey()];
        localStorage.setItem(_id, JSON.stringify(storedData));
    } catch {  }
}

const getRecommendations = (organizationId, measurementId) => {
    return new Promise(async (resolve, reject) => {

        if (isMobile()) {
            try {
                const recommendations = await getRecommendationsMobile(measurementId);
                resolve(processRecommendationData(recommendations));
            } catch (e) {
                reject('Error loading recommendations on mobile');
            }
        } else {
            try {
                const recommendations = await loadRecommendationsSocket(measurementId);
                resolve(processRecommendationData(recommendations));
            } catch (e) {
                reject('Error loading recommendations from socket');
            }
        }
    });
}

const processRecommendationData = (data) => {
    const products = data.models;
    const hasProducts = products.length > 0;
    const productsMap = {};
    const productsList = [];

    function createSize(obj) {
        return {
            value: obj.labelNumber,
            category: obj.labelCategory.toUpperCase(),
            label: `${obj.labelCategory.toUpperCase()} ${obj.labelNumber}`
        };
    }

    for (let p in products) {
        const product = products[p];
        const labels = product.labels;
        const pdata = {
            id: product.modelId,
            categories: labels.map(e => e.labelCategory.toUpperCase()),
            getSize: function (category) {
                if (labels.length === 0) {
                    return undefined;
                }
                if (category === undefined) {
                    return createSize(product.labels[0]);
                }
                if (category.constructor !== String) {
                    return undefined;
                }

                category = category.toUpperCase();
                for (let n in labels) {
                    const label = labels[n];
                    if (label.labelCategory.toUpperCase().includes(category, 0)) {
                        return createSize(label);
                    }
                }
            }
        }
        productsMap[product.modelId] = pdata;
        productsList.push(pdata);
    }

    return {
        id: data.id,
        width: Math.round(data.width),
        length: Math.round(data.length),
        status: hasProducts ? 'SUCCESS' : 'NO_PRODUCT_FOUND',
        products: productsMap,
        //Obsolete: will be removed
        models: products,
        getProduct: function (productId) {
            return productsMap[productId];
        },
        getSize(category) {
            if (!hasProducts) {
                return undefined;
            }
            return productsList[0].getSize(category);
        }
    }
};

const createQR = (link, container) => {
    const qr = new QRCodeStyling({
        width: 1024,
        height: 1024,
        type: 'canvas',
        data: link,
        backgroundOptions: {
            color: 'rgba(0,0,0,0)',
        }
    });
    qr._canvas.style = 'width:100%;height:100%';
    qr._canvas.setAttribute('id', _id);
    qr.append(container);
    if (events.onQRShown) events.onQRShown();
}


const getMockData = (modelIds) => {
    const data = {
        id: 'f7a1e660-f7aa-4400-b4ad-f6c5f564700e',
        length: 260,
        width: 104,
        models: []
    }
    let id = 0;
    data.models = modelIds.map(modelId => {
        return {
            id: String(id++),
            modelId: modelId,
            audience: modelId.toLowerCase().indexOf('female') != -1 ? 'F' : 'M',
            brandName: modelId.split(' ')[0],
            brandId: 0,

            hasFeedback: false,
            labels: [
                {
                    'labelId': 46,
                    'labelNumber': '42',
                    'labelText': 'EU',
                    'labelCategory': 'EU'
                }, {
                    'labelId': 47,
                    'labelNumber': '8',
                    'labelText': 'UK',
                    'labelCategory': 'UK'
                }, {
                    'labelId': 48,
                    'labelNumber': '8,5',
                    'labelText': 'US',
                    'labelCategory': 'US'
                }, {
                    'labelId': 50,
                    'labelNumber': '26,5',
                    'labelText': 'JP',
                    'labelCategory': 'JP'
                }
            ]
        }
    });
    return processRecommendationData(data);
};

const handleButtonClick = async () => {
    try {
        const data = getRecommendationData();
        if (_recommendation !== undefined || (data != null && data.url === location.href)) {
            const id = _recommendation === undefined ? data.id : _recommendation.id;
            await sendUsageAcknowledgement(id);
            clearRecommendationData();
            if (_button) _button.removeEventListener('click', handleButtonClick);
        }
    } catch (e) { }
};

const installButtonCheck = async (reject) => {
    const data = getRecommendationData();
    const organizationId = (data != null && data.oid) || _organizationId;

    if (!organizationId) return false;

    try {
        const info = await loadOrganizationInfo();

        const type = info.cartButtonIdentifierType;
        const id = info.cartButtonId;
        const clazz = info.cartButtonClass;
        const index = info.cartButtonClassIndex;

        if (!type) return reject('CartButtonIdentifierType not defined.');
        if (type === 'NOT_APPLICABLE') return true;
        if (type === 'ID' && !id) return reject('CartButtonId not defined.');
        if (type === 'CLASS' && (clazz === undefined || clazz === '')) return reject('CartButtonClass not defined.');
        if (type === 'CLASS' && (isNaN(index))) return reject('CartButtonClassIndex not defined.');

        let button;
        if (type === 'ID') {
            button = document.getElementById(id);
        } else if (type === 'CLASS') {
            const elements = document.getElementsByClassName(clazz);
            if (elements.length > 0) {
                button = elements[index];
            }
        }

        if (!button) return reject('"Add to cart button" not found.');
        _button = button;

        button.removeEventListener('click', handleButtonClick);
        button.addEventListener('click', handleButtonClick, false);

        return true;

    } catch {
        if (reject) reject('Error loading organization data. Check your organizationId.');
        return false;
    }
};

window.addEventListener('DOMContentLoaded', (event) => {
    installButtonCheck();
});
