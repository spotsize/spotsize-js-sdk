import {initializeApp} from 'firebase/app';
import {Request, cancelAllRequests} from "./request.js";
import {Client} from "@stomp/stompjs";
import {isMobile, isMobileSafari} from "./mobile-check.js";

let _organizationId;
let _baseUrl;
let _socketUrl;
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

export const init = (organizationId, baseUrl, socketUrl) => {
    _baseUrl = baseUrl;
    _socketUrl = socketUrl;
    _organizationId = organizationId;
    initializeApp(firebaseConfig);
}

export const dispose = () => {
    cancelAllRequests();
    if (_subscription0) _subscription0.unsubscribe();
    if (_subscription1) _subscription1.unsubscribe();
    if (_socketClient) _socketClient.deactivate();
}

export const createMeasurement = () => {
    const request = new Request(`${_baseUrl}/measurements`)
        .post()
        .json()
        .header('Accept', 'application/vnd.spotsize.app-v1.0.0+json')
        .header('organization-external-id', _organizationId)
        .body({organization: _organizationId});
    return request.send();
}

export const loadRecommendationsSocket = async (measurementId) => {
    return new Promise((resolve, reject) => {
        const client = _socketClient = new Client({brokerURL: _socketUrl});

        client.onConnect = frame => {
            _subscription0 = client.subscribe(`/topic/completed/${measurementId}`, payload => {
                try {
                    resolve(JSON.parse(payload.body));
                    window.focus();
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

export const loadRecommendations = (measurementId, controller) => {
    const request = new Request(`${_baseUrl}/recommendations/measurement/${measurementId}`, controller)
        .get()
        .json()
        .header('Accept', 'application/vnd.spotsize.app-v1.0.0+json')
        .header('organization-external-id', _organizationId);
    return request.send();
}

export const createDynamicLink =  (organizationId, measurementId, productId, options) => {
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

    return longDynamicLink;
}


