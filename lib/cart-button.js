import {loadOrganizationInfo, sendUsageAcknowledgement} from "./api.js";
import {getRecommendationData} from "./recommendation.js";

let _cartButton;
let _recommendation;

const handleButtonClick = async () => {
    try {
        const data = getRecommendationData();
        console.log('send', data);
        if (_recommendation !== undefined || (data != null && data.url === location.href)) {
            const id = _recommendation === undefined ? data.id : _recommendation.id;
            await sendUsageAcknowledgement(id);
            clearRecommendationData();
            if (_cartButton) _cartButton.removeEventListener('click', handleButtonClick);
        }
    } catch (e) {
    }
};

export const installButtonCheck = async (reject, organizationId) => {

    const data = getRecommendationData();
    console.log(data);
    organizationId = organizationId || (data != null && data.oid);
      if (!organizationId) return false;

    try {
        let button;
        const info = await loadOrganizationInfo();

        const type = info.cartButtonIdentifierType;
        const id = info.cartButtonId;
        const clazz = info.cartButtonClass;
        const index = info.cartButtonClassIndex;

        console.log(type)

        if (!type) return reject('CartButtonIdentifierType not defined.');
        if (type === 'NOT_APPLICABLE') return true;
        if (type === 'ID' && !id) return reject('CartButtonId not defined.');
        if (type === 'CLASS' && (clazz === undefined || clazz === '')) return reject('CartButtonClass not defined.');
        if (type === 'CLASS' && (isNaN(index))) return reject('CartButtonClassIndex not defined.');

        if (type === 'ID') {
            button = document.getElementById(id);
        } else if (type === 'CLASS') {
            const elements = document.getElementsByClassName(clazz);
            if (elements.length > 0) {
                button = elements[index];
            }
        }

        if (!button) return reject('"Add to cart button" not found.');
        _cartButton = button;

        console.log(_cartButton);
        button.removeEventListener('click', handleButtonClick);
        button.addEventListener('click', handleButtonClick, false);

        return true;

    } catch (e) {
        if (reject) reject('Error loading organization data. Check your organizationId.');
        return false;
    }
};
