import {getRecommendationsMobile} from "./get-recommendations-mobile.js";
import {loadRecommendationsSocket} from "./api.js";
import {isMobile} from "./mobile-check.js";

const _id = 'sps-cla6wmkh70001x874t7shjegc';

const storageKey = () => {
    return location.href;
}

export const storeRecommendationData = (recommendationId, organizationId) => {
    let storedData = {};
    try {
        storedData = JSON.parse(localStorage.getItem(_id)) || {};
    } catch {
    }

    const data = {
        id: recommendationId,
        time: Date.now(),
        url: location.href,
        oid: organizationId
    }
    storedData[storageKey()] = data;
    localStorage.setItem(_id, JSON.stringify(storedData));
}

export const getRecommendationData = () => {
    try {
        const data = localStorage.getItem(_id);
        if (!data) return undefined;
        return JSON.parse(data)[storageKey()];
    } catch {
        return undefined;
    }
}

export const clearRecommendationData = () => {
    try {
        const data = localStorage.getItem(_id);
        if (!data) return;
        const storedData = JSON.parse(data);
        storedData[storageKey()] = null;
        delete storedData[storageKey()];
        localStorage.setItem(_id, JSON.stringify(storedData));
    } catch {
    }
}

export const getRecommendations = (organizationId, measurementId) => {
    return new Promise((resolve, reject) => {
        (async () => {
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
        })();
    });
}

export const processRecommendationData = (data) => {
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


