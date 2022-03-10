import {loadRecommendations} from './api.js';

let _controller;
if (typeof AbortController != 'undefined')  {
    _controller = new AbortController();
}

const _maxTries = 30;
let _resolve;
let _reject;
let _measurementId;
let _to;
let _tries;

export const getRecommendationsMobile = (measurementId) => {
    _measurementId = measurementId;
    _tries = _maxTries;
    document.onvisibilitychange = () => {
        if (document.visibilityState == 'visible') {
            if (_controller) {
                _controller.abort();
                _controller = new AbortController();
            }
            clearTimeout(_to);
            startPolling();
        } else {
            _tries = _maxTries;
        }
    };
    return new Promise((resolve, reject) => {
        _resolve = resolve;
        _reject = reject;
    });
}

export const dispose = () => {
    clearTimeout(_to);
    if (_controller) _controller.abort();
}

const startPolling = async () => {
    try {
        const recommendations = await loadRecommendations(_measurementId, _controller);
        _resolve(recommendations);
    } catch (e) {
        if (--_tries == 0) {
            _reject('Error loading recommendations');
            return;
        }
        _to = setTimeout(()=>{
            startPolling();
        }, 1000);
    }
}
