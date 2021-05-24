import {createServer, Server} from 'http';
import {Got} from 'got';
import {httpClient} from './http';
import {
    CFToolsUnavailable,
    DuplicateResourceCreation, GrantRequired,
    RequestLimitExceeded,
    ResourceNotFound,
    TimeoutError, TokenExpired,
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

    beforeAll(async () => {
        server = createServer((req, res) => {
            res.writeHead(httpResponse.code);
            res.write(JSON.stringify({
                error: httpResponse.errorText,
                request_id: httpResponse.request_id || undefined,
                status: false
            }));
            res.end();
        });

        await new Promise((resolve) => {
            server.listen(8081, () => {
                resolve(undefined);
            });
        });

        client = httpClient.extend({
            retry: 0,
            prefixUrl: 'http://127.0.0.1:8081'
        });
    });

    beforeEach(() => {
        httpResponse = {
            code: 200,
            errorText: 'none',
        };
    });

    it('throws ResourceNotFound on 404', async () => {
        httpResponse = {code: 404, errorText: 'invalid-resource'};

        await expect(client('not-found')).rejects.toThrowError(new ResourceNotFound());
    });

    it('throws RequestLimitExceeded on 429', async () => {
        httpResponse = {code: 429, errorText: 'rate-limited'};

        await expect(client('rate-limited')).rejects.toThrowError(new RequestLimitExceeded());
    });

    it('throws DuplicateResourceCreation on 400 with duplicate', async () => {
        httpResponse = {code: 429, errorText: 'duplicate'};

        await expect(client('duplicate')).rejects.toThrowError(new DuplicateResourceCreation());
    });

    it('throws UnknownError on 500 with unexpected-error', async () => {
        httpResponse = {code: 500, errorText: 'unexpected-error', request_id: 'SOME_ID'};

        await expect(client('unexpected-error')).rejects.toThrowError(new UnknownError('SOME_ID'));
    });

    it('throws TimeoutError on 500 with timeout', async () => {
        httpResponse = {code: 500, errorText: 'timeout'};

        await expect(client('timeout')).rejects.toThrowError(new TimeoutError());
    });

    it('throws CFToolsUnavailable on 500 with system-unavailable', async () => {
        httpResponse = {code: 500, errorText: 'system-unavailable'};

        await expect(client('system-unavailable')).rejects.toThrowError(new CFToolsUnavailable());
    });

    it('throws GrantRequired on 403 with no-grant', async () => {
        httpResponse = {code: 403, errorText: 'no-grant'};

        await expect(client('no-grant')).rejects.toThrowError(new GrantRequired());
    });

    it('throws TokenExpired on 403 with expired-token', async () => {
        httpResponse = {code: 403, errorText: 'expired-token'};

        await expect(client('expired-token')).rejects.toThrowError(new TokenExpired());
    });

    afterAll(() => {
        server.close();
    });
});
