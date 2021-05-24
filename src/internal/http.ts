import got, {Response} from 'got';
import {
    CFToolsUnavailable,
    DuplicateResourceCreation, GrantRequired,
    RequestLimitExceeded,
    ResourceNotFound,
    TimeoutError, TokenExpired, UnknownError
} from '../types';
import {AfterResponseHook} from 'got/dist/source/as-promise/types';

const baseUrl = 'https://data.cftools.cloud';

function error(response: Response) {
    const body = JSON.parse(response.body as string);

    return 'error' in body ? body.error : '';
}

const errorHandler: AfterResponseHook = (response: Response) => {
    if (response.statusCode === 404) {
        throw new ResourceNotFound();
    }
    if (response.statusCode === 429) {
        throw new RequestLimitExceeded();
    }
    if (response.statusCode === 400 && error(response) === 'duplicate') {
        throw new DuplicateResourceCreation();
    }
    if (response.statusCode === 403 && error(response) === 'no-grant') {
        throw new GrantRequired();
    }
    if (response.statusCode === 403 && error(response) === 'expired-token') {
        throw new TokenExpired();
    }
    if (response.statusCode === 500 && error(response) === 'unexpected-error') {
        throw new UnknownError(JSON.parse(response.body as string).request_id);
    }
    if (response.statusCode === 500 && error(response) === 'timeout') {
        throw new TimeoutError();
    }
    if (response.statusCode === 500 && error(response) === 'system-unavailable') {
        throw new CFToolsUnavailable();
    }
    return response;
}

export const httpClient = got.extend({
    prefixUrl: baseUrl,
    hooks: {
        afterResponse: [errorHandler],
    },
});
