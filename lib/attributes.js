import {start, init} from "./index.js";
import {log} from "./logger.js";

let organizationId;
let productId;
let productName;
let useMockData;
let spotsizeButton;
let qrContainer;

const ATTRIBUTE_ORGANIZATION_ID = 'spotsize-organization-id';
const ATTRIBUTE_PRODUCT_ID = 'spotsize-product-id';
const ATTRIBUTE_BUTTON = 'spotsize-button';
const ATTRIBUTE_USE_MOCK_DATA = 'spotsize-use-mock-data';
const ATTRIBUTE_PRODUCT_NAME = 'spotsize-product-name';

const ATTRIBUTE_QR_CONTAINER = 'spotsize-qr-container';
const ATTRIBUTE_RESULT_CONTAINER = 'spotsize-result-container';
const ATTRIBUTE_NO_RESULT_CONTAINER = 'spotsize-no-result-container';
const ATTRIBUTE_ERROR_CONTAINER = 'spotsize-error-container';

const containerNames = [
    ATTRIBUTE_RESULT_CONTAINER,
    ATTRIBUTE_QR_CONTAINER,
    ATTRIBUTE_NO_RESULT_CONTAINER,
    ATTRIBUTE_ERROR_CONTAINER,
];

const containers = {};

export const setupByAttributes = async () => {
    let error = false;
    let organizationIdNode = queryAttribute(ATTRIBUTE_ORGANIZATION_ID);
    let productIdNode = queryAttribute(ATTRIBUTE_PRODUCT_ID);
    let productNameNode = queryAttribute(ATTRIBUTE_PRODUCT_NAME)
    spotsizeButton = queryAttribute(ATTRIBUTE_BUTTON);

    if (organizationIdNode === undefined && productIdNode === undefined && spotsizeButton === undefined) {
        return;
    }

    try {
        organizationId = organizationIdNode.dataset.spotsizeOrganizationId;
        productId = productIdNode.dataset.spotsizeProductId;
        if (productNameNode !== undefined) productName = productNameNode.dataset.spotsizeProductName;
        parseContainers();
    } catch (e) {
        error = true;
    }

    qrContainer = containers[ATTRIBUTE_QR_CONTAINER];

    if (error) {
        if (organizationId !== undefined || productId !== undefined || spotsizeButton !== undefined) {
            throw new Error('Incorrect spotsize data attributes.');
        }
        return;
    }


    useMockData = queryAttribute(ATTRIBUTE_USE_MOCK_DATA) !== undefined;

    if (spotsizeButton !== undefined) {
        spotsizeButton.removeEventListener('click', startScan);
        spotsizeButton.addEventListener('click', startScan);
    }

    await init(organizationId);
};


const queryAttribute = (name) => {
    return document.querySelectorAll(`[data-${name}]`)[0];
}

const startScan = async () => {
    try {
        const options = productName !== undefined ? {productName} : {};
        const result = await start(productId, qrContainer.node, options);
        hideQRContainer();
        showResult(result);
    } catch (e) {
        log(e);
        showError(e);
    }
};

export const showQRContainer = () => {
    if (qrContainer !== undefined) qrContainer.show();
}

export const hideQRContainer = () => {
    if (qrContainer !== undefined) qrContainer.hide();
}

const parseContainers = () => {

    containerNames.forEach((key) => {
        const node = queryAttribute(key);
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
    if (result.status === 'SUCCESS') {
        const container = containers[ATTRIBUTE_RESULT_CONTAINER];
        container.show();

        const walker = document.createTreeWalker(container.node, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            parseResultPlaceholders(walker.currentNode, result);
        }
    } else {
        const container = containers[ATTRIBUTE_NO_RESULT_CONTAINER];
        container.show();
    }
}

const showError = (error) => {
    const container = containers[ATTRIBUTE_ERROR_CONTAINER];
    container.show();

    const walker = document.createTreeWalker(container.node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        let text = walker.currentNode.nodeValue;
        if (text.includes('{error}')) {
            text = text.replaceAll('{error}', error);
        }
        walker.currentNode.nodeValue = text;
    }
}

const parseResultPlaceholders = (node, result) => {

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

        const country = text.match(/\{size_(.*?)\}/)[1];
        const size = result.getSize(country);
        if (size === undefined) {
            log(`Size info for "${country}" not available.`);
        }
        text = text.replaceAll(`{size_${country}}`, size !== undefined ? size.value : '');
    }
    if (new RegExp(/\{size_label_[a-x]{2}\}+/g).test(text)) {
        const country = text.match(/\{size_label_(.*?)\}/)[1];
        const size = result.getSize(country);
        if (size === undefined) {
            log(`Size info for "${country}" not available.`);
        }
        text = text.replaceAll(`{size_label_${country}}`, size !== undefined ? size.label : '');
    }
    node.nodeValue = text;
}
