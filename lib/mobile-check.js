export const isMobile = () => {
    return isAndroid() || isIOS();
}

export const isAndroid = () => {
    return getPlatform() === 'android';
}

export const isIOS = () => {
    return getPlatform() === 'ios';
}

export const isMobileSafari = () => {
    return /iP(ad|hone|od).+Version\/[\d\.]+.*Safari/i.test(navigator.userAgent);
}

export const isIPad = () => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('ipad')) return true;
    if (ua.includes('iphone')) return false;
    if (ua.includes('mac') && ('ontouchend' in document)) return true;
    return false;
}

export const isPhone = () => {
    return isMobile() && !isIPad();
}

const getPlatform = () => {
    const userAgent = window.navigator.userAgent;
    const platform = window.navigator.platform;
    const iosPlatforms = ['iPhone', 'iPad', 'iPod'];
    const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
    const touchPoints = navigator.maxTouchPoints && navigator.maxTouchPoints > 2;
    if ((iosPlatforms.indexOf(platform) !== -1 || macosPlatforms.indexOf(platform) !== -1) && touchPoints) {
        return 'ios';
    }
    if (/Android/.test(userAgent) && touchPoints) {
        return 'android';
    }
    return 'desktop';
}
