import got, {CancelableRequest, Got, HTTPError, Response} from 'got';
import {
    CFToolsUnavailable,
    DuplicateResourceCreation,
    GrantRequired,
    RequestLimitExceeded,
    ResourceNotFound,
    TimeoutError,
    TokenExpired,
    UnknownError
} from '../types';
import {OptionsOfTextResponseBody} from 'got/dist/source/types';

const baseUrl = 'https://data.cftools.cloud';

function errorMessage(response: Response) {
    const body = JSON.parse(response.body as string);

    return 'error' in body ? body.error : '';
}

export function fromHttpError(error: HTTPError): Error {
    const response = error.response;
    if (response.statusCode === 404) {
        return new ResourceNotFound();
    }
    if (response.statusCode === 429) {
        return new RequestLimitExceeded();
    }
    if (response.statusCode === 400 && errorMessage(response) === 'duplicate') {
        return new DuplicateResourceCreation();
    }
    if (response.statusCode === 403 && errorMessage(response) === 'no-grant') {
        return new GrantRequired();
    }
    if (response.statusCode === 403 && errorMessage(response) === 'expired-token') {
        return new TokenExpired();
    }
    if (response.statusCode === 500 && errorMessage(response) === 'unexpected-error') {
        return new UnknownError(JSON.parse(response.body as string).request_id);
    }
    if (response.statusCode === 500 && errorMessage(response) === 'timeout') {
        return new TimeoutError();
    }
    if (response.statusCode === 500 && errorMessage(response) === 'system-unavailable') {
        return new CFToolsUnavailable();
    }
    return error;
}

export async function get<T>(url: string, options?: OptionsOfTextResponseBody): Promise<T> {
    return withErrorHandler(httpClient(url, options).json<T>());
}

export async function post<T>(url: string, options?: OptionsOfTextResponseBody): Promise<T> {
    return withErrorHandler(httpClient.post(url, options).json<T>());
}

export async function httpDelete<T>(url: string, options?: OptionsOfTextResponseBody): Promise<T> {
    return withErrorHandler(httpClient.delete(url, options).json<T>());
}

async function withErrorHandler<T>(request: Promise<T>): Promise<T> {
    try {
        return await request;
    } catch (error) {
        throw fromHttpError(error);
    }
}

export const httpClient = got.extend({
    prefixUrl: baseUrl,
});
