import {
    AmbiguousDeleteBanRequest,
    AppGrants,
    AuthenticationRequired,
    AuthorizationProvider,
    Ban,
    BaseResource,
    BattlEyeGUID,
    BohemiaInteractiveId,
    CFToolsClient,
    CFToolsId,
    DayZStatistics,
    DeleteBanRequest,
    DeleteBansRequest,
    DeletePriorityQueueRequest,
    DeleteWhitelistRequest,
    Game,
    GameLabsActionRequest,
    GameServerItem,
    GameServerQueryError,
    GameSession,
    GenericId,
    GetGameServerDetailsRequest,
    GetLeaderboardRequest,
    GetPlayerDetailsRequest,
    DeletePlayerDetailsRequest,
    GetPriorityQueueRequest,
    GetServerInfoRequest,
    GetWhitelistRequest,
    HealPlayerRequest,
    IPAddressType,
    isIpAddress,
    KillPlayerRequest,
    LeaderboardItem,
    ListBansRequest,
    ListGameSessionsRequest,
    OverrideServerApiId,
    Player,
    PriorityQueueItem,
    PutBanRequest,
    PutPriorityQueueItemRequest,
    PutWhitelistItemRequest,
    ServerApiId,
    ServerApiIdRequired,
    ServerInfo,
    ServerResource,
    SpawnItemRequest,
    SteamId64,
    TeleportPlayerRequest,
    WhitelistItem,
    AccountCreationFailed,
} from '../../types';
import {HttpClient} from '../http';
import {URLSearchParams} from 'url';
import crypto from 'crypto';
import {
    GetBanResponse,
    GetGameServerDetailsResponse,
    GetLeaderboardResponse,
    GetPlayerLookupResponseWithNotice,
    GetPlayerResponse,
    GetPlayerResponsePlayer,
    GetPriorityQueueEntry,
    GetServerInfoResponse,
    GetUserLookupResponse,
    ListGameSessionsResponse,
    toHitZones
} from './types';
import {asDate} from './date-to-string';

interface RawBanListAppGrant {
    created_at: string,
    resource: BaseResource,
}

interface RawServerAppGrant {
    created_at: string,
    resource: ServerResource,
}

interface RawAppGrants {
    status: boolean;
    tokens?: {
        banlist?: RawBanListAppGrant[];
        server?: RawServerAppGrant[];
    };
}

export class GotCFToolsClient implements CFToolsClient {
    private readonly auth?: AuthorizationProvider;

    constructor(private client: HttpClient, private serverApiId?: ServerApiId, private enterpriseToken?: string, private hasAccountCreationAccess?: boolean, auth?: AuthorizationProvider) {
        if (auth) {
            this.auth = auth;
        }
    }

    async getAppGrants(): Promise<AppGrants> {
        this.assertAuthentication();
        const response = await this.client.get<RawAppGrants>('v1/@app/grants', {
            context: {
                authorization: await this.auth!.provide(this.client),
            },
        });
        return {
            banlist: response.tokens?.banlist?.map((e) => ({
                ...e,
                created: new Date(e.created_at),
                created_at: undefined
            })) ?? [],
            server: response.tokens?.server?.map((e) => ({
                ...e,
                created: new Date(e.created_at),
                created_at: undefined
            })) ?? [],
        }
    }

    async getPlayerDetails(playerId: GetPlayerDetailsRequest | GenericId): Promise<Player> {
        this.assertAuthentication();
        const id = await this.resolve(playerId);
        const response = await this.client.get<GetPlayerResponse>(
            `v2/server/${this.resolveServerApiId('serverApiId' in playerId ? playerId : undefined).id}/player`,
            {
                searchParams: {
                    cftools_id: id.id,
                },
                context: {
                    authorization: await this.auth!.provide(this.client),
                },
            }
        );
        const player = response[id.id] as GetPlayerResponsePlayer;
        const identities = response.identities;
        return {
            names: player.omega.name_history,
            statistics: {
                dayz: {
                    deaths: {
                        animals: player.game.dayz?.animal_deaths || 0,
                        environment: player.game.dayz?.environment_deaths || 0,
                        explosions: player.game.dayz?.explosion_deaths || 0,
                        other: player.game.dayz?.deaths || 0,
                        infected: player.game.dayz?.infected_deaths || 0,
                        suicides: player.game.dayz?.suicides || 0,
                    },
                    hits: player.game.dayz?.hits || 0,
                    kills: {
                        players: player.game.dayz?.kills?.players || 0,
                        infected: player.game.dayz?.kills?.infected || 0,
                        animals: player.game.dayz?.kills?.animals || 0,
                    },
                    kdratio: player.game.dayz?.kdratio || 0,
                    longestKill: player.game.dayz?.longest_kill || 0,
                    longestShot: player.game.dayz?.longest_shot || 0,
                    zones: toHitZones(player.game.dayz?.zones),
                    weapons: Object.fromEntries(Object.entries(player.game.dayz?.weapons || {}).map((e) => {
                        const w = e[1];
                        return [e[0], {
                            ...w,
                            zones: toHitZones(w.zones),
                            longestKill: w.longest_kill,
                            longestShot: w.longest_shot,
                        } as DayZStatistics['weapons'][string]];
                    })),
                },
            },
            playtime: player.omega.playtime,
            sessions: player.omega.sessions,
            identities: {
                battleye: BattlEyeGUID.of(identities.battleye.guid),
                bohemia: BohemiaInteractiveId.of(identities.bohemiainteractive.uid),
                steam: SteamId64.of(identities.steam.steam64),
                cftools: id
            }
        };
    }

    async deletePlayerDetails(id: GenericId | DeletePlayerDetailsRequest): Promise<void> {
        this.assertAuthentication();
        const cftoolsId = await this.resolve(id);
        await this.client.delete(`v2/server/${this.resolveServerApiId('serverApiId' in id ? id : undefined).id}/player`, {
            searchParams: {
                cftools_id: cftoolsId.id,
            },
            context: {
                authorization: await this.auth!.provide(this.client),
            },
        });
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
        const response = await this.client.get<GetLeaderboardResponse>(`v1/server/${this.resolveServerApiId(request).id}/leaderboard`, {
            searchParams: params,
            context: {
                authorization: await this.auth!.provide(this.client),
            },
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
                killDeathRatio: raw.kdratio,
                longestKill: raw.longest_kill,
                longestShot: raw.longest_shot,
            } as LeaderboardItem;
        });
    }

    async getPriorityQueue(playerId: GetPriorityQueueRequest | GenericId): Promise<PriorityQueueItem | null> {
        this.assertAuthentication();
        const id = await this.resolve(playerId);
        const response = await this.client.get<GetPriorityQueueEntry>(`v1/server/${this.resolveServerApiId('serverApiId' in playerId ? playerId : undefined).id}/queuepriority`, {
            searchParams: {
                cftools_id: id.id,
            },
            context: {
                authorization: await this.auth!.provide(this.client),
            },
        });
        const entry = response.entries.find((e) => e.user.cftools_id === id.id);
        if (!entry) {
            return null;
        }
        return {
            createdBy: CFToolsId.of(entry.creator.cftools_id),
            comment: entry.meta.comment,
            expiration: entry.meta.expiration ? asDate(entry.meta.expiration) : 'Permanent',
            created: new Date(entry.created_at)
        } as PriorityQueueItem;
    }

    async putPriorityQueue(request: PutPriorityQueueItemRequest): Promise<void> {
        this.assertAuthentication();
        const id = await this.resolve(request.id);
        const requestBody: any = {
            cftools_id: id.id,
            comment: request.comment,
        };
        if (request.expires && request.expires !== 'Permanent') {
            requestBody.expires_at = request.expires.toISOString();
        }
        await this.client.post(`v1/server/${this.resolveServerApiId(request).id}/queuepriority`, {
            body: JSON.stringify(requestBody),
            context: {
                authorization: await this.auth!.provide(this.client),
            },
        });
    }

    async deletePriorityQueue(playerId: DeletePriorityQueueRequest | GenericId): Promise<void> {
        this.assertAuthentication();
        const id = await this.resolve(playerId);
        await this.client.delete(`v1/server/${this.resolveServerApiId('serverApiId' in playerId ? playerId : undefined).id}/queuepriority`, {
            searchParams: {
                cftools_id: id.id
            },
            context: {
                authorization: await this.auth!.provide(this.client),
            },
        });
    }

    async getWhitelist(playerId: GetWhitelistRequest | GenericId): Promise<WhitelistItem | null> {
        this.assertAuthentication();
        const id = await this.resolve(playerId);
        const response = await this.client.get<GetPriorityQueueEntry>(`v1/server/${this.resolveServerApiId('serverApiId' in playerId ? playerId : undefined).id}/whitelist`, {
            searchParams: {
                cftools_id: id.id,
            },
            context: {
                authorization: await this.auth!.provide(this.client),
            },
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
        } as WhitelistItem;
    }

    async putWhitelist(request: PutWhitelistItemRequest): Promise<void> {
        this.assertAuthentication();
        const id = await this.resolve(request.id);
        const requestBody: any = {
            cftools_id: id.id,
            comment: request.comment,
        };
        if (request.expires && request.expires !== 'Permanent') {
            requestBody.expires_at = request.expires.toISOString();
        }
        await this.client.post(`v1/server/${this.resolveServerApiId(request).id}/whitelist`, {
            body: JSON.stringify(requestBody),
            context: {
                authorization: await this.auth!.provide(this.client),
            },
        });
    }

    async deleteWhitelist(playerId: DeleteWhitelistRequest | GenericId): Promise<void> {
        this.assertAuthentication();
        const id = await this.resolve(playerId);
        await this.client.delete(`v1/server/${this.resolveServerApiId('serverApiId' in playerId ? playerId : undefined).id}/whitelist`, {
            searchParams: {
                cftools_id: id.id
            },
            context: {
                authorization: await this.auth!.provide(this.client),
            },
        });
    }

    async getGameServerDetails(request: GetGameServerDetailsRequest): Promise<GameServerItem> {
        const hash = crypto.createHash('sha1');
        hash.update(request.game);
        hash.update(request.ip);
        hash.update(request.port.toString(10));
        const serverResource = hash.digest('hex');

        const response = await this.client.get<GetGameServerDetailsResponse>(`v1/gameserver/${serverResource}`,
            {
                context: {
                    authorization: await this.auth!.provide(this.client),
                },
            }
        );
        const server = response[serverResource];
        if (server._object.error !== 'GameServerQueryError.NONE') {
            throw new GameServerQueryError(server._object.error);
        }
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

    async getServerInfo(request: GetServerInfoRequest): Promise<ServerInfo> {
        const response = await this.client.get<GetServerInfoResponse>(`v1/server/${this.resolveServerApiId(request).id}/info`, {
            context: {
                authorization: await this.auth!.provide(this.client),
            },
        });

        let game: Game;
        if (response.server.gameserver.game === 1) {
            game = Game.DayZ;
        } else {
            throw new Error('Unsupported game: ' + response.server.gameserver.game);
        }
        return {
            nickname: response.server._object.nickname,
            game: game,
            connection: {
                usedProtocol: response.server.connection.protcol_used as 'UDP_RCON_BATTLEYE_DZ',
                peerVersion: response.server.connection.peer_version,
            },
            owner: CFToolsId.of(response.server._object.resource_owner),
        };
    }

    async listGameSessions(request: ListGameSessionsRequest): Promise<GameSession[]> {
        const response = await this.client.get<ListGameSessionsResponse>(`v1/server/${this.resolveServerApiId(request).id}/GSM/list`, {
            context: {
                authorization: await this.auth!.provide(this.client),
            },
        });

        return response.sessions.map((s) => {
            let bans: GameSession['bans'] = {
                count: s.info.ban_count,
            };
            let profile: GameSession['profile'] | undefined = undefined;
            if (s.persona && s.persona.profile) {
                let avatar: URL | undefined;
                if (s.persona.profile.avatar) {
                    try {
                        avatar = new URL(s.persona.profile.avatar);
                    } catch (e) {
                        console.warn('Could not parse Avatar URL of profile: ' +
                            s.persona.profile.avatar + '; CFToolsId: ' + s.cftools_id + '; SteamId: ' + s.gamedata.steam64);
                    }
                }
                profile = {
                    name: s.persona.profile.name,
                    private: s.persona.profile.private,
                    avatar: avatar,
                };
                bans = {
                    ...bans,
                    gameBanned: !!s.persona.bans.game,
                    communityBanned: s.persona.bans.community,
                    economyBanned: !!s.persona.bans.economy,
                    vacBanned: !!s.persona.bans.vac,
                }
            }
            return {
                id: s.id,
                bans: bans,
                profile: profile,
                cftoolsId: CFToolsId.of(s.cftools_id),
                playerName: s.gamedata.player_name,
                steamId: SteamId64.of(s.gamedata.steam64),
                live: {
                    loadTime: s.live.load_time,
                    ping: s.live.ping ? {
                        actual: s.live.ping.actual,
                        trend: s.live.ping.trend,
                    } : undefined,
                    position: {
                        join: s.live.position.join ? {
                            x: s.live.position.join[0],
                            y: s.live.position.join[1],
                            z: s.live.position.join[2],
                        } : undefined,
                        latest: s.live.position.latest ? {
                            x: s.live.position.latest[0],
                            y: s.live.position.latest[1],
                            z: s.live.position.latest[2],
                        } : undefined,
                        leave: s.live.position.leave ? {
                            x: s.live.position.leave[0],
                            y: s.live.position.leave[1],
                            z: s.live.position.leave[2],
                        } : undefined,
                    },
                    loaded: s.live.loaded,
                },
            } as GameSession
        });
    }

    async spawnItem(request: SpawnItemRequest): Promise<void> {
        const body: GameLabsActionRequest = {
            serverApiId: request.serverApiId,
            actionCode: 'CFCloud_SpawnPlayerItem',
            actionContext: 'player',
            referenceKey: request.session.steamId.id,
            parameters: {
                item: {
                    dataType: 'string',
                    valueString: request.itemClass,
                },
                quantity: {
                    dataType: 'int',
                    valueInt: request.quantity || 1,
                },
                debug: {
                    dataType: 'boolean',
                    valueBoolean: request.debug ?? false,
                },
                stacked: {
                    dataType: 'boolean',
                    valueBoolean: request.stacked ?? false,
                },
            },
        };
        await this.gameLabsAction(body);
    }

    async healPlayer(request: HealPlayerRequest): Promise<void> {
        const body: GameLabsActionRequest = {
            serverApiId: request.serverApiId,
            actionCode: 'CFCloud_HealPlayer',
            actionContext: 'player',
            referenceKey: request.session.steamId.id,
            parameters: {},
        };
        await this.gameLabsAction(body);
    }

    async killPlayer(request: KillPlayerRequest): Promise<void> {
        const body: GameLabsActionRequest = {
            serverApiId: request.serverApiId,
            actionCode: 'CFCloud_KillPlayer',
            actionContext: 'player',
            referenceKey: request.session.steamId.id,
            parameters: {},
        };
        await this.gameLabsAction(body);
    }

    async gameLabsAction(request: GameLabsActionRequest): Promise<void> {
        const body = {
            actionCode: request.actionCode,
            actionContext: request.actionContext,
            referenceKey: request.referenceKey,
            parameters: {...request.parameters},
        };
        await this.client.post(`v1/server/${this.resolveServerApiId(request).id}/GameLabs/action`, {
            body: JSON.stringify(body),
            context: {
                authorization: await this.auth!.provide(this.client),
            },
        });
    }

    async teleport(request: TeleportPlayerRequest): Promise<void> {
        const body: GameLabsActionRequest = {
            serverApiId: request.serverApiId,
            actionCode: 'CFCloud_TeleportPlayer',
            actionContext: 'player',
            referenceKey: request.session.steamId.id,
            parameters: {
                vector: {
                    dataType: 'vector',
                    valueVectorX: request.coordinates.x,
                    valueVectorY: request.coordinates.y,
                    valueVectorZ: request.coordinates.z,
                },
            },
        };
        await this.gameLabsAction(body);
    }

    async listBans(request: ListBansRequest): Promise<Ban[]> {
        let playerId: GenericId = request.playerId;
        if (!isIpAddress(request.playerId)) {
            playerId = (await this.resolve(request))
        }
        const response = await this.client.get<GetBanResponse>(`v1/banlist/${request.list.id}/bans`, {
            searchParams: {
                filter: playerId.id,
            },
            context: {
                authorization: await this.auth!.provide(this.client),
            },
        });
        if (response.entries.length === 0) {
            return [];
        }
        return response.entries.map((ban) => {
            return {
                id: ban.id,
                reason: ban.reason,
                expiration: ban.expires_at ? asDate(ban.expires_at) : 'Permanent',
                created: asDate(ban.created_at),
                status: ban.status,
            }
        });
    }

    async putBan(request: PutBanRequest): Promise<void> {
        const requestBody: any = {
            reason: request.reason,
        };
        const id = request.playerId;
        if (isIpAddress(id) && id.type === IPAddressType.v4) {
            requestBody.identifier = id.id;
            requestBody.format = 'ipv4';
        } else {
            requestBody.identifier = (await this.resolve({playerId: request.playerId})).id;
            requestBody.format = 'cftools_id';
        }
        if (request.expiration && request.expiration !== 'Permanent') {
            requestBody.expires_at = request.expiration.toISOString();
        }
        await this.client.post(`v1/banlist/${request.list.id}/bans`, {
            body: JSON.stringify(requestBody),
            context: {
                authorization: await this.auth!.provide(this.client),
            },
        });
    }

    async deleteBan(request: DeleteBanRequest): Promise<void> {
        let ban: Ban | null;
        if (request.ban) {
            ban = request.ban;
        } else if (request.playerId) {
            const bans = await this.listBans({
                list: request.list,
                playerId: request.playerId
            });
            if (bans.length > 1) {
                throw new AmbiguousDeleteBanRequest();
            }
            ban = bans[0];
        } else {
            throw Error('At least one identifier is needed, none received.');
        }
        if (!ban) {
            return;
        }
        await this.client.delete(`v1/banlist/${request.list.id}/bans`, {
            searchParams: {
                ban_id: ban.id,
            },
            context: {
                authorization: await this.auth!.provide(this.client),
            },
        });
    }

    async deleteBans(request: DeleteBansRequest): Promise<void> {
        const bans = await this.listBans(request);
        for (let ban of bans) {
            await this.deleteBan({
                list: request.list,
                ban: ban,
            });
        }
    }

    async resolve(id: GenericId | { playerId: GenericId }): Promise<CFToolsId>
    async resolve(id: GenericId | { playerId: GenericId }): Promise<CFToolsId> {
        let playerId: GenericId;
        if ('playerId' in id) {
            playerId = id.playerId;
        } else {
            playerId = id;
        }
        if (playerId instanceof CFToolsId) {
            return playerId;
        }

        const requestUsesAccountCreation = this.hasAccountCreationAccess === true
            && this.enterpriseToken !== undefined
            && playerId instanceof SteamId64;

        let response;
        try {
            response = await this.client.get<GetUserLookupResponse>('v1/users/lookup', {
                searchParams: {
                    identifier: playerId.id,
                },
                context: {
                    authorization: await this.auth!.provide(this.client),
                },
            });
        } catch (err) {
            // Note: We could just apply the `create` param above, but this parameter is only ever
            // allowed when there is no existing user with the supplied identity token.
            if (requestUsesAccountCreation) {
                response = await this.client.get<GetPlayerLookupResponseWithNotice>('v1/users/lookup', {
                    searchParams: {
                        identifier: playerId.id,
                        create: true,
                    },
                    context: {
                        authorization: await this.auth!.provide(this.client),
                    },
                });
                if (response.notice !== 'Account Creation API account created') {
                    throw new AccountCreationFailed(playerId.id, response.notice);
                }
            }
            else {
                throw err;
            }
        }
        return CFToolsId.of(response.cftools_id);
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
}
