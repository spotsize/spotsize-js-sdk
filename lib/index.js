import {Request, cancelAllRequests} from './request'
import {initializeApp} from 'firebase/app';
import QRCodeStyling from 'qr-code-styling';
import {Client} from '@stomp/stompjs';
import {isMobile, isIOS, isAndroid, isMobileSafari, isIPad} from './mobile-check';

export {isMobile};
export {isIOS};
export {isAndroid};

const __baseURL = 'https://api-staging.spotsize.io';
const __socketURL = 'wss://api-staging.spotsize.io/ws/recommendations';

const _qrId = 'sps-ckwz3cjnv00016g66jm0knh3t';

let _to;
let _window;
let _subscription0;
let _subscription1;
let _socketClient;
let _baseURL;
let _socketURL;
let _organizationId;

const firebaseConfig = {
    apiKey: 'AIzaSyDGjQwkdAZzVtUvNfKdgLg3neMqFhQY7_A',
    authDomain: 'spotsize.firebaseapp.com',
    projectId: 'spotsize',
    storageBucket: 'spotsize.appspot.com',
    messagingSenderId: '728636615727',
    appId: '1:728636615727:web:4a88778e478f2d9b856ada'
};
initializeApp(firebaseConfig);

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
export const init = (organizationId, useTestEnv) => {
    _organizationId = organizationId;
    _baseURL = __baseURL;
    _socketURL = __socketURL;
    if (useTestEnv) {
        _baseURL = _baseURL.replace('api-staging', 'api-dev');
        _socketURL = _socketURL.replace('api-staging', 'api-dev');
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
export const start = (productId, qrContainer, options) => {
    return new Promise(async (resolve, reject) => {

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

        _window = undefined;
        removeQR();
        cancelAllRequests();
        clearTimeout(_to);

        if (events.onStart) events.onStart();

        if (options.useMockData) {
            createQR('https://spotsize.io', qrContainer);
            _to = setTimeout(() => {
                removeQR();
                resolve(getMockData(productId));
            }, 1000);
            return;
        }

        try {
            let data;
            if (isMobile() && !isIPad()) {
                _window = window.open('', '_blank')
                data = await createIdAndLink(_organizationId, productId, options);
                _window.location = data.link
            } else {
                data = await createIdAndLink(_organizationId, productId, options);
                createQR(data.link, qrContainer);
            }
            const recommendation = await getRecommendations(_organizationId, data.measurmentId);
            stop();
            if (events.onComplete) events.onComplete(recommendation);
            resolve(recommendation);
        } catch (error) {
            stop();
            if (events.onError) events.onError(error);
            reject(error);
        }
    });
}

const closePopUpWindow = () => {
    if (_window) _window.close();
    _window = undefined;
}

export const stop = () => {
    removeQR();
    cancelAllRequests();
    clearTimeout(_to);
    closePopUpWindow();
    if (events.onStop) events.onStop();
    if (_subscription0) _subscription0.unsubscribe();
    if (_subscription1) _subscription1.unsubscribe();
    if (_socketClient) _socketClient.deactivate();
}

const removeQR = () => {
    const element = document.getElementById(_qrId);
    if (element && element.parentElement) {
        element.remove();
        if (events.onQRRemoved) events.onQRRemoved();
    }
}

const createIdAndLink = (organizationId, productId, options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const measurementData = await createMeasurement(organizationId);
            const linkData = await createLink(organizationId, measurementData.measurementId, productId, options);
            resolve({
                link: linkData.shortLink,
                measurmentId: measurementData.measurementId
            });
        } catch (error) {
            reject(error);
        }
    });
}

const createMeasurement = (organizationId) => {
    const request = new Request(`${_baseURL}/measurements`)
        .post()
        .json()
        .header('Accept', 'application/vnd.spotsize.app-v1.0.0+json')
        .header('organization-external-id', organizationId)
        .body({organization: organizationId});
    return request.send();
}

const createLink = async (organizationId, measurementId, productId, options) => {
    let href = location.href;
    if (isMobileSafari()) {
        href = `${href.split('#')[0]}#sps${Date.now()}`;
    }
    const data = {
        p: isMobile() ? 'm' : 'd',
        o: organizationId,
        m: measurementId,
        mo: productId,
        l: href,
        s: isMobileSafari(),
        pl: options.payload,
        n: options.productName
    }

    const payload = btoa(JSON.stringify(data));
    const link = `https://spotsize.io/scan/${encodeURIComponent(payload)}`;

    //Android
    const apn = 'io.spotsize.spotsizeapp';
    //iOS
    const ibi = 'io.spotsize.spotsizeapp';
    const isi = '1567859533';

    //Preview
    const st = ' ';
    const sd = ' ';
    const si = '';

    const longDynamicLink = `https://usespotsize.page.link/?link=${link}&apn=${apn}&ibi=${ibi}&isi=${isi}&st=${st}&sd=${sd}&si=${si}`;
    const body = {longDynamicLink}

    const url = `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${firebaseConfig.apiKey}`;
    const request = new Request(url)
        .post()
        .json()
        .body(body);
    return request.send();
}

const getRecommendations = (organizationId, measurementId) => {
    return new Promise((resolve, reject) => {
        const client = _socketClient = new Client({brokerURL: _socketURL});

        client.onConnect = frame => {
            _subscription0 = client.subscribe(`/topic/completed/${measurementId}`, payload => {
                try {
                    resolve(processRecommendationData(JSON.parse(payload.body)));
                } catch (error) {
                    reject('Payload error');
                }
            });
            _subscription1 = client.subscribe(`/topic/errors/${measurementId}`, payload => {
                reject('Recommendation could not be created');
            });
        }
        client.onStompError = frame => {
            reject('Socket error');
        }
        client.activate();
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
                    console.log(label);
                    if (label.labelCategory.toUpperCase() === category) {
                        return createSize(label);
                    }
                }
            }
        }
        productsMap[product.modelId] = pdata;
        productsList.push(pdata);
    }

    return {
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
    qr._canvas.style = 'height: 100%';
    qr._canvas.setAttribute('id', _qrId);
    qr.append(container);
    if (events.onQRShown) events.onQRShown();
}

const getMockData = (modelIds) => {
    const data = {
        length: 260,
        width: 104,
        models: []
    }
    let id = 0;
    data.models = modelIds.map(modelId => {
        return {
            id: id++,
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
