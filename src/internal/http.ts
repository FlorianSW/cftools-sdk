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

interface RequestWithContext<T> {
    request: Promise<T>,
    context?: Record<string, unknown>,
}

export class GotHttpClient implements HttpClient {
    constructor(private readonly auth?: AuthorizationProvider, private readonly client: Got = httpClient) {
    }

    get<T>(url: string, options?: OptionsOfTextResponseBody): Promise<T> {
        return this.withErrorHandler((context?: Record<string, unknown>) => {
            return {
                context: context || options?.context,
                request: this.client(url, this.populateContext(options, context)).json<T>()
            }
        });
    }

    delete<T>(url: string, options?: OptionsOfTextResponseBody): Promise<T> {
        return this.withErrorHandler((context?: Record<string, unknown>) => {
            return {
                context: context || options?.context,
                request: this.client.delete(url, this.populateContext(options)).json<T>(),
            }
        });
    }

    post<T>(url: string, options?: OptionsOfTextResponseBody): Promise<T> {
        return this.withErrorHandler((context?: Record<string, unknown>) => {
            return {
                context: context || options?.context,
                request: this.client.post(url, this.populateContext(options)).json<T>(),
            }
        });
    }

    protected populateContext(options?: OptionsOfTextResponseBody, contextOverride?: Record<string, unknown>): OptionsOfTextResponseBody | undefined {
        const context = contextOverride || options?.context;
        if (options && context?.authorization && context.authorization instanceof Authorization) {
            options.headers = {
                ...options.headers,
                Authorization: context.authorization.asHeader()
            }
        }
        return options;
    }

    protected async withErrorHandler<T>(requestFn: (newContext?: Record<string, unknown>) => RequestWithContext<T>): Promise<T> {
        const r = requestFn(undefined);
        try {
            return await r.request;
        } catch (error: any) {
            const err = fromHttpError(error, r.context?.authorization as Authorization);
            if (err instanceof TokenExpired) {
                this.auth?.reportExpired();
                const authorization = await this.auth?.provide();
                try {
                    return await requestFn({
                        ...r.context,
                        authorization: authorization,
                    }).request;
                } catch (e: any) {
                    throw fromHttpError(e, authorization);
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

export function fromHttpError(error: HTTPError, auth?: Authorization): Error {
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
        return new TokenExpired(error.request.requestUrl, {
            type: auth!!.type,
            token: auth!!.token,
            created: auth!!.created,
            expiresAt: auth!!.expiresAt,
        });
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
