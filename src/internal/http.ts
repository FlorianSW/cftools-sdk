import got, {Got, Headers, Hooks, HTTPError, Response} from 'got';
import {
    Authorization,
    AuthorizationProvider,
    CFToolsUnavailable,
    DuplicateResourceCreation,
    GrantRequired,
    RequestLimitExceeded,
    ResourceNotConfigured,
    ResourceNotFound,
    TimeoutError,
    TokenExpired,
    UnknownError
} from '../types';
import {OptionsOfTextResponseBody} from 'got/dist/source/types';
import pkg from "../../package.json";

const baseUrl = 'https://data.cftools.cloud';
const enterpriseBaseUrl = 'https://epr-data.cftools.cloud';

const redactHeaders = [
    'x-enterprise-access-token',
    'authorization'
];
const redactPaths = [
    '/v1/auth/register'
];

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
    constructor(private readonly client: Got, public readonly auth?: AuthorizationProvider) {
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

    protected populateContext(options?: OptionsOfTextResponseBody, contextOverride?: Record<string, unknown>): OptionsOfTextResponseBody {
        const context = contextOverride || options?.context;
        if (options && context?.authorization) {
            options.headers = {
                ...options.headers,
                ...(context.authorization as Authorization).asHeader(),
            }
        }
        return options ? options : {};
    }

    protected async withErrorHandler<T>(requestFn: (newContext?: Record<string, unknown>) => RequestWithContext<T>): Promise<T> {
        const r = requestFn(undefined);
        try {
            return await r.request;
        } catch (error: any) {
            const err = fromHttpError(error, r.context?.authorization as Authorization);
            if (err instanceof TokenExpired) {
                this.auth?.reportExpired();
                const authorization: Authorization | undefined = await this.auth?.provide(this.client);
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

export function fromHttpError(error: HTTPError, auth?: Authorization): Error | HTTPError {
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
        return auth!!.throwExpired(error.request.requestUrl);
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

export interface HttpClientOptions {
    enableDebugLogging?: boolean,
    logBody?: boolean,

    userAgent?: string,
}

function redactedHeaders(h: Headers): Headers {
    const r = {...h};
    for (let header of redactHeaders) {
        if (header in r) {
            r[header] = '[REDACTED]';
        }
    }
    return r;
}

/**
 * Helper method to create an instance of HttpClient. The return type is Got, the internal HTTP client library used
 * in this SDK.
 * This method is exported for pure development usage, only. Its API is not guaranteed to be stable in any way and may
 * change, even in patch releases.
 * It may or may not exist in future releases, may be renamed, moved, unexported or anything alike. Use with caution and
 * only, if you really know what you do.
 *
 * @unstable
 * @param enterprise
 * @param options
 */
export function httpClient(enterprise: boolean, options?: HttpClientOptions): Got {
    const hooks: Hooks = {};
    if (options?.enableDebugLogging) {
        hooks.beforeError = [(error) => {
            let body = '[DISABLED]';
            if (options.logBody) {
                const raw = error.response?.rawBody.toString();
                body = raw ? raw : body;
            }
            console.log(`RequestError: ${error.request?.options.method} ${error.request?.options.url} - ${error.response?.statusCode} - ${error.code} - ${body}`);
            return error;
        }];
        hooks.beforeRequest = [(op) => {
            let body = '[DISABLED]';
            const raw = op.body;
            if (options.logBody && raw) {
                if (redactPaths.includes(op.url.pathname)) {
                    body = '[REDACTED]';
                } else if (typeof raw === 'string') {
                    body = raw;
                } else if ('toString' in raw) {
                    body = raw.toString();
                } else {
                    body = `[UNSUPPORTED ${typeof body}]`;
                }
            }
            console.log(`Doing: ${op.method} ${op.url} - ${JSON.stringify(redactedHeaders(op.headers))} - ${body}`);
        }];
        hooks.afterResponse = [(response, retryWithMergedOptions) => {
            let body = '[DISABLED]';
            if (redactPaths.includes(response.request.options.url.pathname) && response.statusCode < 400) {
                body = '[REDACTED]';
            } else if (options.logBody) {
                body = response.rawBody.toString();
            }
            console.log(`Response: ${response.method} ${response.requestUrl} - ${response.statusCode} - ${body}`);
            return response;
        }];
    }
    const headers: Headers = {};
    if (options?.userAgent) {
        headers['user-agent'] = options.userAgent;
    } else {
        headers['user-agent'] = `cftools-sdk/${pkg.version} (https://github.com/floriansw/cftools-sdk)`;
    }
    return got.extend({
        prefixUrl: enterprise ? enterpriseBaseUrl : baseUrl,
        hooks: hooks,
        headers: headers,
    });
}
