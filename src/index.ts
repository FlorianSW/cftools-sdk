import {
    BohemiaInteractiveId,
    CFToolsClient,
    CFToolsId,
    GenericId,
    GetLeaderboardRequest,
    LeaderboardItem,
    LoginCredentials,
    Player,
    PriorityQueueItem,
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
            playtime: number,
            sessions: number,
        },
        game: {
            general: {
                environment_deaths: number,
                suicides: number,
            }
        }
    },
}

interface GetUserLookupResponse {
    cftools_id: string,
}

interface GetLeaderboardResponse {
    leaderboard: {
        cftools_id: string,
        environment_deaths: number,
        latest_name: string,
        playtime: number,
        rank: number,
        suicides: number,
    }[]
}

interface GetPriorityQueueEntry {
    entries: {
        created_at: string,
        creator: {
            cftools_id: string
        },
        meta: {
            comment: string,
            expiration: string | null,
            from_api: boolean
        },
        updated_at: string,
        user: {
            cftools_id: string
        },
        uuid: string
    }[]
}

class GotCFToolsClient implements CFToolsClient {
    private readonly auth: CFToolsAuthorizationProvider;

    constructor(private serverApiId: ServerApiId, credentials: LoginCredentials) {
        this.auth = new CFToolsAuthorizationProvider(credentials);
    }

    async getPlayerDetails(playerId: GenericId): Promise<Player> {
        const id = await this.resolve(playerId);
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

    async getLeaderboard(request: GetLeaderboardRequest): Promise<LeaderboardItem[]> {
        const token = await this.auth.provideToken();
        let url = `v1/server/${this.serverApiId.id}/leaderboard?stat=${request.statistic}&`;
        if (request.order === 'ASC') {
            url = `${url}order=-1&`;
        } else {
            url = `${url}order=1&`;
        }
        if (request.limit && request.limit > 0 && request.limit <= 100) {
            url = `${url}limit=${request.limit}&`;
        }
        const response = await httpClient(url, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        }).json<GetLeaderboardResponse>();
        return response.leaderboard.map((raw) => {
            return {
                name: raw.latest_name,
                rank: raw.rank,
                suicides: raw.suicides,
                environmentDeaths: raw.environment_deaths,
                playtime: raw.playtime,
                id: CFToolsId.of(raw.cftools_id),
            } as LeaderboardItem;
        });
    }

    async getPriorityQueue(playerId: GenericId): Promise<PriorityQueueItem | null> {
        const id = await this.resolve(playerId);
        const response = await httpClient(`v1/server/${this.serverApiId.id}/queuepriority?cftools_id=${id.id}`, {
            headers: {
                Authorization: 'Bearer ' + await this.auth.provideToken()
            }
        }).json<GetPriorityQueueEntry>();
        if (response.entries.length === 0) {
            return null;
        }
        const entry = response.entries[0];
        return {
            createdBy: CFToolsId.of(entry.creator.cftools_id),
            comment: entry.meta.comment,
            expiration: entry.meta.expiration ? new Date(entry.meta.expiration) : 'Permanent',
            created: new Date(entry.created_at)
        } as PriorityQueueItem;
    }

    private async resolve(id: GenericId): Promise<CFToolsId> {
        if (id instanceof CFToolsId) {
            return id;
        }
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
