import {Request, cancelAllRequests} from './request'
import {initializeApp} from 'firebase/app';
import QRCodeStyling from 'qr-code-styling';
import {Client} from '@stomp/stompjs';
import {isMobile, isIOS, isAndroid, isMobileSafari, isIPad} from './mobile-check';

export const version = '1.1.2';
export {isMobile};
export {isIOS};
export {isAndroid};

const _baseURL = '_BACKEND_';
const _socketURL = '_SOCKET_';

const _qrId = 'sps-ckwz3cjnv00016g66jm0knh3t';

let _to;
let _window;
let _subscription0;
let _subscription1;
let _socketClient;

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

console.log('ipad', isIPad());

/**
 * @param {String} organizationId - Your provided organizationId
 * @param {[String]} modelIds - List of modelIds to get recommendations for
 * @param {HTMLElement} qrContainer - Element to add the QR
 * @param {Boolean} useMockData - Pass 'true' to directly receive mocked data and bypass the actual scan flow
 * @return {Promise<Recommendation>} A promise to the recommendation data
 */
export const start = (organizationId, modelIds, qrContainer, useMockData) => {
    return new Promise(async (resolve, reject) => {

        if (isAndroid()) {
            return reject("Android is currently not yet supported.");
        }

        if (organizationId === undefined) {
            reject('organizationId is missing');
            return
        }
        if (modelIds === undefined) {
            reject('modelIds are missing');
            return
        }
        if (modelIds.length === 0) {
            reject('modelIds are empty');
            return
        }
        if (qrContainer === undefined) {
            reject('qrContainer is missing');
            return
        }

        _window = undefined;
        removeQR();
        cancelAllRequests();
        clearTimeout(_to);

        if (events.onStart) events.onStart();

        if (useMockData) {
            createQR('https://spotsize.io', qrContainer);
            _to = setTimeout(() => {
                resolve(getMockData(modelIds));
            }, 1000);
            return;
        }

        try {
            let data;
            if (isMobile() && !isIPad()) {
                _window = window.open('', '_blank')
                data = await createIdAndLink(organizationId, modelIds);
                _window.location = data.link
            } else {
                data = await createIdAndLink(organizationId, modelIds);
                createQR(data.link, qrContainer);
            }
            const recommendation = await getRecommendations(organizationId, data.measurmentId);
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

const createIdAndLink = (organizationId, modelIds) => {
    return new Promise(async (resolve, reject) => {
        try {
            const measurementData = await createMeasurement(organizationId);
            const linkData = await createLink(organizationId, measurementData.measurementId, modelIds);
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

const createLink = async (organizationId, measurementId, modelIds) => {
    let href = location.href;
    if (isMobileSafari()) {
        href = `${href.split('#')[0]}#sps${Date.now()}`;
    }
    const data = {
        p: isMobile() ? 'm' : 'd',
        o: organizationId,
        m: measurementId,
        mo: modelIds,
        l: href,
        s: isMobileSafari()
    }

    const payload = btoa(JSON.stringify(data));
    // const platform =  isMobile() ? 'm' : 'd';
    // const link = `https://spotsize.io/scan/${platform}/${organizationId}/${measurementId}/${(modelIds.join('@').split(' ').join('_'))}`

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
                    resolve(JSON.parse(payload.body));
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
        id: '00000000-0000-0000-0000-000000000000',
        createdAt: '2021-01-01T12:00:00.000',
        measurementId: '00000000-0000-0000-0000-000000000000',
        models: []
    }
    let id = 0;
    data.models = modelIds.map(modelId => {
        return {
            id: id++,
            modelId: modelId,
            audience: modelId.toLowerCase().indexOf('female') != -1 ? 'F' : 'M',
            sizeId: 5838,
            sizeClassId: 12,
            sizeClassIdent: 'PERFECT_FIT',
            brandName: modelId.split(' ')[0],
            brandId: 0,
            length: 260,
            width: 104,
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
    return data;
};
