import got, {Got, HTTPError, Response} from 'got';
import {
    Authorization, AuthorizationProvider,
    CFToolsUnavailable,
    DuplicateResourceCreation,
    GrantRequired,
    RequestLimitExceeded, ResourceNotConfigured,
    ResourceNotFound,
    TimeoutError,
    TokenExpired,
    UnknownError
} from '../types';
import {OptionsOfTextResponseBody} from 'got/dist/source/types';

const baseUrl = 'https://data.cftools.cloud';

export interface HttpClient {
    get<T>(url: string, options?: OptionsOfTextResponseBody): Promise<T>

    post<T>(url: string, options?: OptionsOfTextResponseBody): Promise<T>

    delete<T>(url: string, options?: OptionsOfTextResponseBody): Promise<T>
}

export class GotHttpClient implements HttpClient {
    constructor(private readonly auth?: AuthorizationProvider, private readonly client: Got = httpClient) {
    }

    get<T>(url: string, options?: OptionsOfTextResponseBody): Promise<T> {
        return this.withErrorHandler(() => this.client(url, options).json<T>());
    }

    delete<T>(url: string, options?: OptionsOfTextResponseBody): Promise<T> {
        return this.withErrorHandler(() => this.client.delete(url, options).json<T>());
    }

    post<T>(url: string, options?: OptionsOfTextResponseBody): Promise<T> {
        return this.withErrorHandler(() => this.client.post(url, options).json<T>());
    }

    async withErrorHandler<T>(requestFn: () => Promise<T>): Promise<T> {
        try {
            return await requestFn();
        } catch (error) {
            const err = fromHttpError(error);
            if (err instanceof TokenExpired) {
                try {
                    this.auth?.reportExpired();
                    return await requestFn();
                } catch (e) {
                    throw fromHttpError(e);
                }
            }
            throw err;
        }
    }
}

function errorMessage(response: Response) {
    const body = JSON.parse(response.body as string);

    return 'error' in body ? body.error : '';
}

export function fromHttpError(error: HTTPError): Error {
    const response = error.response;
    if (response.statusCode === 404 && errorMessage(response) === 'invalid-bucket') {
        const parts = error.request.requestUrl.split('/');
        return new ResourceNotConfigured(parts[parts.length - 1]);
    }
    if (response.statusCode === 404) {
        return new ResourceNotFound(error.request.requestUrl);
    }
    if (response.statusCode === 429) {
        return new RequestLimitExceeded(error.request.requestUrl);
    }
    if (response.statusCode === 400 && errorMessage(response) === 'duplicate') {
        return new DuplicateResourceCreation(error.request.requestUrl);
    }
    if (response.statusCode === 403 && errorMessage(response) === 'no-grant') {
        return new GrantRequired(error.request.requestUrl);
    }
    if (response.statusCode === 403 && errorMessage(response) === 'expired-token') {
        return new TokenExpired(error.request.requestUrl);
    }
    if (response.statusCode === 500 && errorMessage(response) === 'unexpected-error') {
        return new UnknownError(error.request.requestUrl, JSON.parse(response.body as string).request_id);
    }
    if (response.statusCode === 500 && errorMessage(response) === 'timeout') {
        return new TimeoutError(error.request.requestUrl);
    }
    if (response.statusCode === 500 && errorMessage(response) === 'system-unavailable') {
        return new CFToolsUnavailable(error.request.requestUrl);
    }
    return error;
}

export const httpClient = got.extend({
    prefixUrl: baseUrl,
});
