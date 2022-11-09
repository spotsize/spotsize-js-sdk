import {loadOrganizationInfo, sendUsageAcknowledgement} from "./api.js";
import {getRecommendationData} from "./recommendation.js";

let _cartButton;
let _recommendation;

const handleButtonClick = async () => {
    try {
        const data = getRecommendationData();

        if (_recommendation !== undefined || (data != null && data.url === location.href)) {
            const id = _recommendation === undefined ? data.id : _recommendation.id;
            await sendUsageAcknowledgement(id);
            clearRecommendationData();
            if (_cartButton) _cartButton.removeEventListener('click', handleButtonClick);
        }
    } catch (e) {
    }
};

export const installButtonCheck = async (organizationId) => {


    const data = getRecommendationData();

    organizationId = organizationId || (data != null && data.oid);
    if (!organizationId) return false;

    try {
        let button;
        const info = await loadOrganizationInfo();

        const type = info.cartButtonIdentifierType;
        const id = info.cartButtonId;
        const clazz = info.cartButtonClass;
        const index = info.cartButtonClassIndex;

        if (!type) throw Error('CartButtonIdentifierType not defined.');
        if (type === 'NOT_APPLICABLE') return;
        if (type === 'ID' && !id) throw Error('CartButtonId not defined.');
        if (type === 'CLASS' && (clazz === undefined || clazz === '')) throw Error('CartButtonClass not defined.');
        if (type === 'CLASS' && (isNaN(index))) throw Error('CartButtonClassIndex not defined.');

        if (type === 'ID') {
            button = document.getElementById(id);
        } else if (type === 'CLASS') {
            const elements = document.getElementsByClassName(clazz);
            if (elements.length > 0) {
                button = elements[index];
            }
        }

        if (!button) return;
        _cartButton = button;

        button.removeEventListener('click', handleButtonClick);
        button.addEventListener('click', handleButtonClick, false);

    } catch (e) {

    }
};
