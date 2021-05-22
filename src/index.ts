import {
    BattlEyeGUID,
    BohemiaInteractiveId,
    CFToolsClient,
    CFToolsId,
    LoginCredentials,
    Player,
    ResourceNotFound,
    ServerApiId,
    SteamId64
} from './domain/client';
import got, {HTTPError} from 'got';
import {URL} from 'url';
import {CFToolsAuthorizationProvider} from './auth';

export class CFToolsClientBuilder {
    private serverApiId: ServerApiId | undefined;
    private credentials: LoginCredentials | undefined;

    public withServerApiId(serverApiId: string): CFToolsClientBuilder {
        this.serverApiId = ServerApiId.of(serverApiId);
        return this;
    }

    public withCredentials(applicationId: string, secret: string): CFToolsClientBuilder {
        this.credentials = LoginCredentials.of(applicationId, secret);
        return this;
    }

    public build(): CFToolsClient {
        if (this.serverApiId === undefined) {
            throw new Error('ServerApiId needs to be set.');
        }
        if (this.credentials === undefined) {
            throw new Error('Credentials need to be provided.');
        }
        return new GotCFToolsClient(this.serverApiId, this.credentials)
    }
}

interface GetPlayerResponse {
    [key: string]: {
        omega: {
            name_history: string[],
        },
    },
}

interface GetUserLookupResponse {
    cftools_id: string,
}

export const baseUrl = 'https://data.cftools.cloud';

class GotCFToolsClient implements CFToolsClient {
    private readonly auth: CFToolsAuthorizationProvider;

    constructor(private serverApiId: ServerApiId, credentials: LoginCredentials) {
        this.auth = new CFToolsAuthorizationProvider(credentials);
    }

    async playerDetails(id: SteamId64 | BattlEyeGUID | BohemiaInteractiveId | CFToolsId): Promise<Player> {
        if (id instanceof CFToolsId) {
            return await this.fetchPlayer(id);
        }
        const cftoolsId = await this.lookup(id);
        return await this.fetchPlayer(cftoolsId);
    }

    private async fetchPlayer(id: CFToolsId) {
        const url: URL = new URL('/v1/server/' + this.serverApiId.id + '/player', baseUrl);
        url.searchParams.append('cftools_id', id.id);
        const token = await this.auth.provideToken();
        try {
            const response = await got(url, {
                headers: {
                    Authorization: 'Bearer ' + token
                }
            }).json<GetPlayerResponse>();
            return {
                names: response[id.id].omega.name_history,
            };
        } catch (error) {
            if (error instanceof HTTPError && error.response.statusCode === 404) {
                throw new ResourceNotFound();
            }
            throw error;
        }
    }

    private async lookup(id: SteamId64 | BattlEyeGUID | BohemiaInteractiveId): Promise<CFToolsId> {
        const url: URL = new URL('/v1/users/lookup', baseUrl);
        let identifier: string;
        if (id instanceof SteamId64 || id instanceof BohemiaInteractiveId) {
            identifier = id.id;
        } else {
            identifier = id.guid;
        }
        url.searchParams.append('identifier', identifier);
        try {
            const response = await got(url).json<GetUserLookupResponse>();
            return CFToolsId.of(response.cftools_id);
        } catch (error) {
            if (error instanceof HTTPError && error.response.statusCode === 404) {
                throw new ResourceNotFound();
            }
            throw error;
        }
    }
}
