import {createServer, Server} from 'http';
import {Got} from 'got';
import {GotHttpClient, HttpClient, httpClient} from './http';
import {
    Authorization,
    AuthorizationType, BearerAuthorization,
    CFToolsUnavailable,
    DuplicateResourceCreation,
    GrantRequired,
    RequestLimitExceeded,
    ResourceNotConfigured,
    ResourceNotFound,
    TimeoutError,
    TokenExpired, TokenExpiredInfo,
    UnknownError
} from '../types';

describe('http', () => {
    let server: Server;
    let httpResponse: {
        code: number,
        errorText: string,
        request_id?: string,
    };
    let client: Got;
    let http: HttpClient;

    beforeAll(async () => {
        server = createServer((req, res) => {
            res.writeHead(httpResponse.code);
            res.write(JSON.stringify({
                error: httpResponse.errorText,
                request_id: httpResponse.request_id || undefined,
                status: httpResponse.code === 200,
                headers: req.headers,
            }));
            res.end();
        });

        await new Promise((resolve) => {
            server.listen(8081, () => {
                resolve(undefined);
            });
        });

        client = httpClient(false).extend({
            retry: 0,
            prefixUrl: 'http://127.0.0.1:8081'
        });
    });

    beforeEach(() => {
        http = new GotHttpClient(client, undefined);
        httpResponse = {
            code: 200,
            errorText: 'none',
        };
    });

    it('uses own user-agent', async () => {
        httpResponse = {code: 200, errorText: ''};

        await expect(http.get('exists')).resolves.toMatchObject({headers: expect.objectContaining({'user-agent': expect.stringMatching('^cftools-sdk/.*')})});
    });

    it('throws ResourceNotFound on 404', async () => {
        httpResponse = {code: 404, errorText: 'invalid-resource'};

        await expect(http.get('not-found')).rejects.toThrowError(new ResourceNotFound('http://127.0.0.1:8081/not-found'));
    });

    it('throws ResourceNotConfigured on 404 with invalid-bucket', async () => {
        httpResponse = {code: 404, errorText: 'invalid-bucket'};

        await expect(http.get('invalid-bucket/queuepriority')).rejects.toThrowError(new ResourceNotConfigured('queuepriority'));
    });

    it('throws RequestLimitExceeded on 429', async () => {
        httpResponse = {code: 429, errorText: 'rate-limited'};

        await expect(http.get('rate-limited')).rejects.toThrowError(new RequestLimitExceeded('http://127.0.0.1:8081/rate-limited'));
    });

    it('throws DuplicateResourceCreation on 400 with duplicate', async () => {
        httpResponse = {code: 400, errorText: 'duplicate'};

        await expect(http.get('duplicate')).rejects.toThrowError(new DuplicateResourceCreation('http://127.0.0.1:8081/duplicate'));
    });

    it('throws UnknownError on 500 with unexpected-error', async () => {
        httpResponse = {code: 500, errorText: 'unexpected-error', request_id: 'SOME_ID'};

        await expect(http.get('unexpected-error')).rejects.toThrowError(new UnknownError('http://127.0.0.1:8081/unexpected-error', 'SOME_ID'));
    });

    it('throws TimeoutError on 500 with timeout', async () => {
        httpResponse = {code: 500, errorText: 'timeout'};

        await expect(http.get('timeout')).rejects.toThrowError(new TimeoutError('http://127.0.0.1:8081/timeout'));
    });

    it('throws CFToolsUnavailable on 500 with system-unavailable', async () => {
        httpResponse = {code: 500, errorText: 'system-unavailable'};

        await expect(http.get('system-unavailable')).rejects.toThrowError(new CFToolsUnavailable('http://127.0.0.1:8081/system-unavailable'));
    });

    it('throws GrantRequired on 403 with no-grant', async () => {
        httpResponse = {code: 403, errorText: 'no-grant'};

        await expect(http.get('no-grant')).rejects.toThrowError(new GrantRequired('http://127.0.0.1:8081/no-grant'));
    });

    describe('TokenExpired', () => {
        it('does retry the request when token-expired error occurs', async () => {
            const auth = {
                async provide(): Promise<Authorization> {
                    return new BearerAuthorization(AuthorizationType.BEARER, '', new Date(), new Date());
                },
                reportExpired() {
                    httpResponse = {code: 200, errorText: ''};
                }
            };
            http = new GotHttpClient(client, auth)
            httpResponse = {code: 403, errorText: 'expired-token'};

            await expect(http.get('expired-token', {
                context: {
                    authorization: await auth.provide(),
                }
            })).resolves.toMatchObject({error: '', status: true});
        });

        it('throws TokenExpired on 403 with expired-token after authorization reported as expired', async () => {
            const auth = {
                async provide(): Promise<Authorization> {
                    return new BearerAuthorization(AuthorizationType.BEARER, '', new Date(), new Date());
                },
                reportExpired() {
                }
            };
            http = new GotHttpClient(client, auth)
            httpResponse = {code: 403, errorText: 'expired-token'};

            await expect(http.get('expired-token', {
                context: {
                    authorization: await auth.provide(),
                }
            })).rejects.toThrowError(new TokenExpired('http://127.0.0.1:8081/expired-token', {} as TokenExpiredInfo));
        });
    });

    afterAll(() => {
        server.close();
    });
});
