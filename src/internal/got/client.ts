import {
    AmbiguousDeleteBanRequest,
    AuthenticationRequired,
    AuthorizationProvider,
    Ban,
    CFToolsClient,
    CFToolsId,
    DeleteBanRequest,
    DeleteBansRequest,
    DeletePriorityQueueRequest,
    DeleteWhitelistRequest,
    Game,
    GameServerItem,
    GameServerQueryError,
    GameSession,
    GenericId,
    GetGameServerDetailsRequest,
    GetLeaderboardRequest,
    GetPlayerDetailsRequest,
    GetPriorityQueueRequest,
    GetServerInfoRequest,
    GetWhitelistRequest,
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
    SpawnItemRequest,
    SteamId64,
    TeleportPlayerRequest,
    WhitelistItem
} from '../../types';
import {HttpClient} from '../http';
import {URLSearchParams} from 'url';
import crypto from 'crypto';
import {
    GetBanResponse,
    GetGameServerDetailsResponse,
    GetLeaderboardResponse,
    GetPlayerResponse,
    GetPriorityQueueEntry,
    GetServerInfoResponse,
    GetUserLookupResponse,
    ListGameSessionsResponse,
    toHitZones,
    toWeaponBreakdown
} from './types';
import {asDate} from './date-to-string';

export class GotCFToolsClient implements CFToolsClient {
    private readonly auth?: AuthorizationProvider;

    constructor(private client: HttpClient, private serverApiId?: ServerApiId, auth?: AuthorizationProvider) {
        if (auth) {
            this.auth = auth;
        }
    }

    async getPlayerDetails(playerId: GetPlayerDetailsRequest | GenericId): Promise<Player> {
        this.assertAuthentication();
        const id = await this.resolve(playerId);
        const response = await this.client.get<GetPlayerResponse>(
            `v1/server/${this.resolveServerApiId('serverApiId' in playerId ? playerId : undefined).id}/player`,
            {
                searchParams: {
                    cftools_id: id.id,
                },
                context: {
                    authorization: await this.auth!.provide(),
                }
            }
        );
        const player = response[id.id];
        return {
            names: player.omega.name_history,
            statistics: {
                kills: player.game.general?.kills || 0,
                deaths: player.game.general?.deaths || 0,
                suicides: player.game.general?.suicides || 0,
                environmentDeaths: player.game.general?.environment_deaths || 0,
                infectedDeaths: player.game.general?.infected_deaths || 0,
                hits: player.game.general?.hits || 0,
                longestShot: player.game.general?.longest_shot || 0,
                longestKill: player.game.general?.longest_kill || 0,
                weaponsBreakdown: toWeaponBreakdown(player.game.general?.weapons),
                hitZones: toHitZones(player.game.general?.zones),
                killDeathRatio: player.game.general?.kdratio || 0,
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
        const response = await this.client.get<GetLeaderboardResponse>(`v1/server/${this.resolveServerApiId(request).id}/leaderboard`, {
            searchParams: params,
            context: {
                authorization: await this.auth!.provide(),
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
        const response = await this.client.get<GetPriorityQueueEntry>(`v1/server/${this.resolveServerApiId('serverApiId' in playerId ? playerId : undefined).id}/queuepriority`, {
            searchParams: {
                cftools_id: id.id,
            },
            context: {
                authorization: await this.auth!.provide(),
            }
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
                authorization: await this.auth!.provide(),
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
                authorization: await this.auth!.provide(),
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
                authorization: await this.auth!.provide(),
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
                authorization: await this.auth!.provide(),
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
                authorization: await this.auth!.provide(),
            },
        });
    }

    async getGameServerDetails(request: GetGameServerDetailsRequest): Promise<GameServerItem> {
        const hash = crypto.createHash('sha1');
        hash.update(request.game);
        hash.update(request.ip);
        hash.update(request.port.toString(10));
        const serverResource = hash.digest('hex');

        const response = await this.client.get<GetGameServerDetailsResponse>(`v1/gameserver/${serverResource}`);
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
                authorization: await this.auth!.provide(),
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
                authorization: await this.auth!.provide(),
            },
        });

        return response.sessions.map((s) => {
            let bans: GameSession['bans'] = {
                count: s.info.ban_count,
            };
            let profile = undefined;
            if (s.persona) {
                profile = {
                    name: s.persona.profile.name,
                    private: s.persona.profile.private,
                    avatar: new URL(s.persona.profile.avatar),
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
            } as GameSession
        });
    }

    async spawnItem(request: SpawnItemRequest): Promise<void> {
        const body = {
            gamesession_id: request.session.id,
            object: request.itemClass,
            quantity: request.quantity || 1,
        };
        await this.client.post(`v0/server/${this.resolveServerApiId(request).id}/gameLabs/spawn`, {
            body: JSON.stringify(body),
            context: {
                authorization: await this.auth!.provide(),
            },
        });
    }

    async teleport(request: TeleportPlayerRequest): Promise<void> {
        const body = {
            gamesession_id: request.session.id,
            coords: [request.coordinates.x, request.coordinates.y]
        };
        await this.client.post(`v0/server/${this.resolveServerApiId(request).id}/gameLabs/teleport`, {
            body: JSON.stringify(body),
            context: {
                authorization: await this.auth!.provide(),
            },
        });
    }

    async listBans(request: ListBansRequest): Promise<Ban[]> {
        const response = await this.client.get<GetBanResponse>(`v1/banlist/${request.list.id}/bans`, {
            searchParams: {
                filter: (await this.resolve(request)).id,
            },
            context: {
                authorization: await this.auth!.provide(),
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
            format: 'cftools_id',
            identifier: (await this.resolve(request)).id,
            reason: request.reason,
        };
        if (request.expiration && request.expiration !== 'Permanent') {
            requestBody.expires_at = request.expiration.toISOString();
        }
        await this.client.post(`v1/banlist/${request.list.id}/bans`, {
            body: JSON.stringify(requestBody),
            context: {
                authorization: await this.auth!.provide(),
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
                authorization: await this.auth!.provide(),
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

        const response = await this.client.get<GetUserLookupResponse>('v1/users/lookup', {
            searchParams: {
                identifier: playerId.id,
            },
        });
        return CFToolsId.of(response.cftools_id);
    }
}
