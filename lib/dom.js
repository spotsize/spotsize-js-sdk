import {start, init} from "./index.js";
import {log} from "./logger.js";

let organizationId;
let productId;
let useMockData;
let spotsizeButton;
let qrContainer;

/*
data-spotsize-organization-id
data-spotsize-product-id
data-spotsize-button
data-spotsize-qr-container
data-spotsize-result-container
data-spotsize-use-mock-data
data-spotsize-no-result-container
data-spotsize-error-container

{length}
{width}
{size}
{size_label}
{size_de}
{size_label_de}
{error}
 */

const QR_CONTAINER = 'spotsizeQrContainer';
const RESULT_CONTAINER = 'spotsizeResultContainer';

const containerNames = [
    QR_CONTAINER,
    RESULT_CONTAINER
];

const containers = {};

export const setupByAttributes = async () => {
    let error = false;
    let organizationIdNode = queryAttribute('spotsize-organization-id');
    let productIdNode = queryAttribute('spotsize-product-id');
    spotsizeButton = queryAttribute('spotsize-button');


    try {
        organizationId = organizationIdNode.dataset.spotsizeOrganizationId;
        productId = productIdNode.dataset.spotsizeProductId;
        parseContainers();
    } catch (e) {
        error = true;
    }

    qrContainer = containers[QR_CONTAINER];

    if (error) {
        if (organizationId !== undefined || productId !== undefined || spotsizeButton !== undefined) {
            throw new Error('Incorrect spotsize data attributes.');
        }
    }

    useMockData = queryAttribute('spotsize-use-mock-data') !== undefined;

    if (spotsizeButton !== undefined) {
        spotsizeButton.removeEventListener('click', startScan);
        spotsizeButton.addEventListener('click', startScan);
    }

    await init(organizationId, true);
};


const queryAttribute = (name) => {
    return document.querySelectorAll(`[data-${name}]`)[0];
}

const startScan = async () => {
    try {
        const result = await start(organizationId, qrContainer.node, {useMockData});
        hideQRContainer();
        showResult(result);
    } catch (e) {
        console.log(e);
    }
};

export const showQRContainer = () => {
    qrContainer.show();
}

export const hideQRContainer = () => {
    qrContainer.hide();
}

const parseContainers = () => {

    containerNames.forEach((key) => {
        let dashed = key.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
        const node = queryAttribute(dashed);
        const display = getComputedStyle(node).display;
        const value = node.dataset[key];
        containers[key] = {
            node: node,
            show: () => {
                node.style.display = display;
            },
            hide: () => {
                node.style.display = 'none';
            }
        };

        switch (value) {
            case undefined:
            case '':
            case 'hidden':
                node.style.display = 'none';
                break;
        }

    });
}

const showResult = (result) => {
    const container = containers[RESULT_CONTAINER];
    container.show();

    const walker = document.createTreeWalker(container.node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        const node = walker.currentNode;
        parsePlaceholders(node, result);
    }
}

const parsePlaceholders = (node, result) => {
    let text = node.nodeValue;

    if (text.includes('{length}')) {
        text = text.replaceAll('{length}', result.length);
    }
    if (text.includes('{width}')) {
        text = text.replaceAll('{width}', result.width);
    }
    if (text.includes('{size}')) {
        text = text.replaceAll('{size}', result.getSize().value);
    }
    if (text.includes('{size_label}')) {
        text = text.replaceAll('{size_label}', result.getSize().label);
    }
    if (new RegExp(/\{size_[a-x]{2}\}+/g).test(text)) {
        const country = text.substring(text.length - 3, text.length - 1);
        const size = result.getSize(country);
        if (size === undefined) {
            console.log(`Size info for "${country}" not available.`);
        }
        text = text.replaceAll(`{size_${country}}`, size !== undefined ? size.value : '');
    }
    if (new RegExp(/\{size_label_[a-x]{2}\}+/g).test(text)) {
        const country = text.substring(text.length - 3, text.length - 1);
        const size = result.getSize(country);
        if (size === undefined) {
            log(`Size info for "${country}" not available.`);
        }
        text = text.replaceAll(`{size_label_${country}}`, size !== undefined ? size.label : '');
    }
    node.nodeValue = text;
}