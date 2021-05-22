import got from 'got';
import {ResourceNotFound} from '../types';

const baseUrl = 'https://data.cftools.cloud';

export const httpClient = got.extend({
    prefixUrl: baseUrl,
    hooks: {
        afterResponse: [(response) => {
            if (response.statusCode === 404) {
                throw new ResourceNotFound();
            }
            return response;
        }],
    },
});
