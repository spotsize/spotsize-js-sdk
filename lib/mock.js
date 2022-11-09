import {processRecommendationData} from "./recommendation.js";


export const getMockData = (modelIds) => {
    const data = {
        id: 'f7a1e660-f7aa-4400-b4ad-f6c5f564700e',
        length: 260,
        width: 104,
        models: []
    }
    let id = 0;
    data.models = modelIds.map(modelId => {
        return {
            id: String(id++),
            modelId: modelId,
            audience: modelId.toLowerCase().indexOf('female') != -1 ? 'F' : 'M',
            brandName: modelId.split(' ')[0],
            brandId: 0,

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
    return processRecommendationData(data);
};
