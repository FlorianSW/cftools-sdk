import {
    AuthenticationRequired,
    BohemiaInteractiveId,
    CFToolsClient,
    CFToolsId,
    DeletePriorityQueueRequest,
    GameServerItem,
    GenericId,
    GetGameServerDetailsRequest,
    GetLeaderboardRequest,
    GetPlayerDetailsRequest,
    GetPriorityQueueRequest,
    HitZones,
    LeaderboardItem,
    LoginCredentials,
    OverrideServerApiId,
    Player,
    PriorityQueueItem,
    PutPriorityQueueItemRequest,
    ServerApiId,
    ServerApiIdRequired,
    SteamId64,
    WeaponStatistic
} from './types';
import {CFToolsAuthorizationProvider} from './internal/auth';
import {get, httpDelete, post} from './internal/http';
import {URLSearchParams} from 'url';
import * as crypto from 'crypto';

export class CFToolsClientBuilder {
    private serverApiId: ServerApiId | undefined;
    private credentials: LoginCredentials | undefined;

    /**
     * Set the default server api ID identifying the CFTools Cloud server instance.
     * This default API ID is not required. Methods will allow to override this default id, otherwise this ID
     * needs to be set in order for the method to succeed.
     *
     * Methods that require authentication are marked in their documentation, that they require an authenticated client.
     */
    public withServerApiId(serverApiId: string): CFToolsClientBuilder {
        this.serverApiId = ServerApiId.of(serverApiId);
        return this;
    }

    /**
     * Sets the API credentials used to authenticate against endpoints that require authentication.
     * Not every endpoint of the CFTools Cloud API requires authentication. Where not needed, the SDK will make
     * unauthenticated requests. Whenever an endpoint requires authentication, these credentials must be set in order
     * for the method to succeed.
     */
    public withCredentials(applicationId: string, secret: string): CFToolsClientBuilder {
        this.credentials = LoginCredentials.of(applicationId, secret);
        return this;
    }

    public build(): CFToolsClient {
        return new GotCFToolsClient(this.serverApiId, this.credentials)
    }
}

interface GetPlayerResponseHitZones {
    brain?: number,
    head?: number,
    leftarm?: number,
    leftfoot?: number,
    leftleg?: number,
    rightarm?: number,
    righthand?: number,
    rightleg?: number,
    torso?: number,
}

interface GetPlayerResponseWeapons {
    [className: string]: {
        damage?: number,
        deaths?: number,
        hits?: number,
        kills?: number,
        longest_kill?: number,
        longest_shot?: number,
        zones?: GetPlayerResponseHitZones,
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
                kills?: number,
                deaths?: number,
                environment_deaths?: number,
                infected_deaths?: number,
                suicides?: number,
                hits?: number,
                kdratio?: number,
                longest_kill?: number,
                longest_shot?: number,
                weapons?: GetPlayerResponseWeapons,
                zones?: GetPlayerResponseHitZones
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
        deaths: number,
        environment_deaths: number,
        hits: number,
        infected_deaths: number,
        kdratio: number,
        kills: number,
        latest_name: string,
        longest_kill: number,
        longest_shot: number,
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

interface GetGameServerDetailsResponse {
    [key: string]: {
        attributes: {
            dlc: boolean,
            dlcs: {
                livonia: boolean,
            },
            experimental: boolean,
            hive: 'private' | 'public',
            modded: boolean,
            official: boolean,
            shard: string,
            whitelist: boolean,
        },
        environment: {
            perspectives: {
                '1rd': boolean,
                '3rd': boolean,
            },
            time: string,
            time_acceleration: {
                general: number,
                night: number
            },
        },
        game: number,
        geolocation: {
            available: boolean,
            city: {
                name: string | null,
                region: string | null,
            },
            continent: string,
            country: {
                code: string,
                name: string,
            },
            timezone: string,
        },
        host: {
            address: string,
            game_port: number,
            os: 'w' | 'l',
            query_port: number,
        },
        map: string,
        mods: {
            file_id: number,
            name: string,
        }[],
        name: string,
        offline: boolean,
        online: boolean,
        publisher: {
            monetization: boolean,
        },
        rank: number,
        rating: number,
        security: {
            battleye: boolean,
            password: boolean,
            vac: boolean,
        },
        status: {
            bots: boolean,
            players: number,
            queue: {
                active: boolean,
                size: number,
            },
            slots: number,
        },
        version: string
    },
}

function asDate(dateAsString: string): Date {
    if (dateAsString.indexOf('+') !== -1 || dateAsString.endsWith('Z')) {
        return new Date(dateAsString)
    }
    return new Date(dateAsString + 'Z')
}

function toHitZones(zones?: GetPlayerResponseHitZones): HitZones {
    return {
        torso: zones?.torso || 0,
        rightLeg: zones?.rightleg || 0,
        rightHand: zones?.righthand || 0,
        rightArm: zones?.rightarm || 0,
        leftLeg: zones?.leftleg || 0,
        head: zones?.head || 0,
        leftFoot: zones?.leftfoot || 0,
        leftArm: zones?.leftarm || 0,
        brain: zones?.brain || 0,
    };
}

function toWeaponBreakdown(weapons?: GetPlayerResponseWeapons): { [className: string]: WeaponStatistic } {
    const entries = weapons ? Object.entries(weapons): [];
    const result: { [className: string]: WeaponStatistic } = {};
    for (let w of entries) {
        result[w[0]] = {
            damage: w[1].damage || 0,
            hits: w[1].hits || 0,
            deaths: w[1].deaths || 0,
            kills: w[1].kills || 0,
            longestKill: w[1].longest_kill || 0,
            longestShot: w[1].longest_shot || 0,
            hitZones: toHitZones(w[1].zones),
        } as WeaponStatistic
    }

    return result;
}

class GotCFToolsClient implements CFToolsClient {
    private readonly auth?: CFToolsAuthorizationProvider;

    constructor(private serverApiId?: ServerApiId, credentials?: LoginCredentials) {
        if (credentials) {
            this.auth = new CFToolsAuthorizationProvider(credentials);
        }
    }

    async getPlayerDetails(playerId: GetPlayerDetailsRequest | GenericId): Promise<Player> {
        this.assertAuthentication();
        const id = await this.resolve(playerId);
        const response = await get<GetPlayerResponse>(
            `v1/server/${this.resolveServerApiId('serverApiId' in playerId ? playerId : undefined).id}/player`,
            {
                searchParams: {
                    cftools_id: id.id,
                },
                headers: {
                    Authorization: 'Bearer ' + await this.auth!.provideToken()
                }
            }
        );
        const player = response[id.id];
        return {
            names: player.omega.name_history,
            statistics: {
                kills: player.game.general.kills || 0,
                deaths: player.game.general.deaths || 0,
                suicides: player.game.general.suicides || 0,
                environmentDeaths: player.game.general.environment_deaths || 0,
                infectedDeaths: player.game.general.infected_deaths || 0,
                hits: player.game.general.hits || 0,
                longestShot: player.game.general.longest_shot || 0,
                longestKill: player.game.general.longest_kill || 0,
                weaponsBreakdown: toWeaponBreakdown(player.game.general.weapons),
                hitZones: toHitZones(player.game.general.zones),
                killDeathRatio: player.game.general.kdratio || 0,
            },
            playtime: player.omega.playtime,
            sessions: player.omega.sessions,
        };
    }

    async getLeaderboard(request: GetLeaderboardRequest): Promise<LeaderboardItem[]> {
        this.assertAuthentication();
        const params = new URLSearchParams();
        params.append('stat', request.statistic);
        if (request.order === 'ASC') {
            params.append('order', '-1');
        } else {
            params.append('order', '1');
        }
        if (request.limit && request.limit > 0 && request.limit <= 100) {
            params.append('limit', request.limit.toString());
        }
        const response = await get<GetLeaderboardResponse>(`v1/server/${this.resolveServerApiId(request).id}/leaderboard`, {
            searchParams: params,
            headers: {
                Authorization: 'Bearer ' + await this.auth!.provideToken()
            }
        });
        return response.leaderboard.map((raw) => {
            return {
                name: raw.latest_name,
                rank: raw.rank,
                suicides: raw.suicides || 0,
                environmentDeaths: raw.environment_deaths || 0,
                kills: raw.kills || 0,
                deaths: raw.deaths || 0,
                playtime: raw.playtime,
                id: CFToolsId.of(raw.cftools_id),
                hits: raw.hits,
                killDeathRation: raw.kdratio,
                longestKill: raw.longest_kill,
                longestShot: raw.longest_shot,
            } as LeaderboardItem;
        });
    }

    async getPriorityQueue(playerId: GetPriorityQueueRequest | GenericId): Promise<PriorityQueueItem | null> {
        this.assertAuthentication();
        const id = await this.resolve(playerId);
        const response = await get<GetPriorityQueueEntry>(`v1/server/${this.resolveServerApiId('serverApiId' in playerId ? playerId : undefined).id}/queuepriority`, {
            searchParams: {
                cftools_id: id.id,
            },
            headers: {
                Authorization: 'Bearer ' + await this.auth!.provideToken()
            }
        });
        if (response.entries.length === 0) {
            return null;
        }
        const entry = response.entries[0];
        return {
            createdBy: CFToolsId.of(entry.creator.cftools_id),
            comment: entry.meta.comment,
            expiration: entry.meta.expiration ? asDate(entry.meta.expiration) : 'Permanent',
            created: new Date(entry.created_at)
        } as PriorityQueueItem;
    }

    async putPriorityQueue(request: PutPriorityQueueItemRequest): Promise<void> {
        this.assertAuthentication();
        let expires = '';
        if (request.expires && request.expires !== 'Permanent') {
            expires = request.expires.toISOString();
        }
        await post(`v1/server/${this.resolveServerApiId(request).id}/queuepriority`, {
            body: JSON.stringify({
                cftools_id: request.id.id,
                comment: request.comment,
                expires_at: expires
            }),
            headers: {
                Authorization: 'Bearer ' + await this.auth!.provideToken()
            },
        });
    }

    async deletePriorityQueue(playerId: DeletePriorityQueueRequest | GenericId): Promise<void> {
        this.assertAuthentication();
        const id = await this.resolve(playerId);
        await httpDelete(`v1/server/${this.resolveServerApiId('serverApiId' in playerId ? playerId : undefined).id}/queuepriority`, {
            searchParams: {
                cftools_id: id.id
            },
            headers: {
                Authorization: 'Bearer ' + await this.auth!.provideToken()
            },
        });
    }

    async getGameServerDetails(request: GetGameServerDetailsRequest): Promise<GameServerItem> {
        const hash = crypto.createHash('sha1');
        hash.update(request.game);
        hash.update(request.ip);
        hash.update(request.port.toString(10));
        const serverResource = hash.digest('hex');

        const response = await get<GetGameServerDetailsResponse>(`v1/gameserver/${serverResource}`);
        const server = response[serverResource];
        return {
            name: server.name,
            version: server.version,
            status: {
                players: {
                    slots: server.status.slots,
                    online: server.status.players,
                    queue: server.status.queue.size,
                },
            },
            security: {
                vac: server.security.vac,
                battleye: server.security.battleye,
                password: server.security.password,
            },
            rating: server.rating,
            rank: server.rank,
            online: server.online,
            map: server.map,
            mods: server.mods.map((m) => {
                return {
                    name: m.name,
                    fileId: m.file_id,
                };
            }),
            geolocation: {
                timezone: server.geolocation.timezone,
                country: server.geolocation.country,
                continent: server.geolocation.continent,
                city: server.geolocation.city,
                available: server.geolocation.available,
            },
            environment: {
                perspectives: {
                    firstPersonPerspective: server.environment.perspectives['1rd'],
                    thirdPersonPerspective: server.environment.perspectives['3rd'],
                },
                timeAcceleration: server.environment.time_acceleration,
                time: server.environment.time,
            },
            attributes: {
                dlc: server.attributes.dlc,
                dlcs: server.attributes.dlcs,
                official: server.attributes.official,
                modded: server.attributes.modded,
                hive: server.attributes.hive,
                experimental: server.attributes.experimental,
                whitelist: server.attributes.whitelist,
            },
            host: {
                address: server.host.address,
                gamePort: server.host.game_port,
                queryPort: server.host.query_port,
            },
        } as GameServerItem
    }

    private assertAuthentication() {
        if (!this.auth) {
            throw new AuthenticationRequired();
        }
    }

    private resolveServerApiId(request?: OverrideServerApiId): ServerApiId {
        if (request?.serverApiId) {
            return request.serverApiId;
        }
        if (this.serverApiId) {
            return this.serverApiId;
        }
        throw new ServerApiIdRequired();
    }

    private async resolve(id: GenericId | { playerId: GenericId }): Promise<CFToolsId> {
        let playerId: GenericId;
        if ('playerId' in id) {
            playerId = id.playerId;
        } else {
            playerId = id;
        }
        if (playerId instanceof CFToolsId) {
            return playerId;
        }
        let identifier: string;
        if (playerId instanceof SteamId64 || playerId instanceof BohemiaInteractiveId) {
            identifier = playerId.id;
        } else {
            identifier = playerId.guid;
        }

        const response = await get<GetUserLookupResponse>('v1/users/lookup', {
            searchParams: {
                identifier,
            },
        });
        return CFToolsId.of(response.cftools_id);
    }
}

export * from './types';
