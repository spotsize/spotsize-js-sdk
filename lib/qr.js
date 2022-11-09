import QRCodeStyling from "qr-code-styling";
import {events} from "./index.js";

const _id = 'sps-cla6wlz200000x874kr2gb4z7';

export const createQR = (link, container) => {
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

export const removeQR = () => {
    const element = document.getElementById(_id);
    if (element && element.parentElement) {
        element.remove();
        if (events.onQRRemoved) events.onQRRemoved();
    }
}


