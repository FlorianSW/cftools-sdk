import {
    BattlEyeGUID,
    BohemiaInteractiveId,
    CFToolsClient,
    CFToolsId,
    LoginCredentials,
    Player,
    ServerApiId,
    SteamId64
} from './types';
import {CFToolsAuthorizationProvider} from './internal/auth';
import {httpClient} from './internal/http';

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
        const token = await this.auth.provideToken();
        const response = await httpClient(`v1/server/${this.serverApiId.id}/player?cftools_id=${id.id}`, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        }).json<GetPlayerResponse>();
        return {
            names: response[id.id].omega.name_history,
        };
    }

    private async lookup(id: SteamId64 | BattlEyeGUID | BohemiaInteractiveId): Promise<CFToolsId> {
        let identifier: string;
        if (id instanceof SteamId64 || id instanceof BohemiaInteractiveId) {
            identifier = id.id;
        } else {
            identifier = id.guid;
        }

        const response = await httpClient(`v1/users/lookup?identifier=${identifier}`).json<GetUserLookupResponse>();
        return CFToolsId.of(response.cftools_id);
    }
}
