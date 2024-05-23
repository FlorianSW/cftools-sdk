import {
    Ban,
    Cache,
    CacheConfiguration,
    CFToolsClient,
    DeleteBanRequest,
    DeletePriorityQueueRequest,
    DeleteWhitelistRequest,
    GameServerItem,
    GenericId,
    ListBansRequest,
    GetGameServerDetailsRequest,
    GetLeaderboardRequest,
    GetPlayerDetailsRequest,
    DeletePlayerDetailsRequest,
    GetPriorityQueueRequest,
    GetWhitelistRequest,
    LeaderboardItem,
    OverrideServerApiId,
    Player,
    PriorityQueueItem,
    PutBanRequest,
    PutPriorityQueueItemRequest,
    PutWhitelistItemRequest,
    ServerApiId,
    ServerApiIdRequired,
    DeleteBansRequest,
    ServerInfo,
    GetServerInfoRequest,
    ListGameSessionsRequest,
    GameSession,
    SpawnItemRequest, TeleportPlayerRequest, CFToolsId, GameLabsActionRequest, HealPlayerRequest, KillPlayerRequest
} from '../types';

function playerId(id: GenericId | { playerId: GenericId }): GenericId {
    let playerId;
    if ('playerId' in id) {
        playerId = id.playerId;
    } else {
        playerId = id;
    }
    return playerId;
}

export class CachingCFToolsClient implements CFToolsClient {
    constructor(
        private readonly cache: Cache,
        private readonly config: CacheConfiguration,
        private readonly client: CFToolsClient,
        private readonly defaultServerApiId?: ServerApiId
    ) {
    }

    getGameServerDetails(request: GetGameServerDetailsRequest): Promise<GameServerItem> {
        const key = `${request.game}:${request.ip}:${request.port}`;
        return this.cacheOrDefault('gameServerDetails', key, () => this.client.getGameServerDetails(request));
    }

    getServerInfo(request: GetServerInfoRequest): Promise<ServerInfo> {
        const key = `${this.serverApiId(request).id}`;
        return this.cacheOrDefault('serverInfo', key, () => this.client.getServerInfo(request));
    }

    listGameSessions(request: ListGameSessionsRequest): Promise<GameSession[]> {
        const key = `${this.serverApiId(request).id}`;
        return this.cacheOrDefault('gameSessions', key, () => this.client.listGameSessions(request));
    }

    spawnItem(request: SpawnItemRequest): Promise<void> {
        return this.client.spawnItem(request);
    }

    gameLabsAction(request: GameLabsActionRequest): Promise<void> {
        return this.client.gameLabsAction(request);
    }

    teleport(request: TeleportPlayerRequest): Promise<void> {
        return this.client.teleport(request);
    }

    healPlayer(request: HealPlayerRequest): Promise<void> {
        return this.client.healPlayer(request);
    }

    killPlayer(request: KillPlayerRequest): Promise<void> {
        return this.client.killPlayer(request);
    }

    getLeaderboard(request: GetLeaderboardRequest): Promise<LeaderboardItem[]> {
        const key = `${this.serverApiId(request).id}:${request.statistic}:${request.order}:${request.limit}`;
        return this.cacheOrDefault('leaderboard', key, () => this.client.getLeaderboard(request));
    }

    getPlayerDetails(id: GenericId | GetPlayerDetailsRequest): Promise<Player> {
        const key = `${this.serverApiId(id).id}:${playerId(id).id}`;
        return this.cacheOrDefault('playerDetails', key, () => this.client.getPlayerDetails(id));
    }

    deletePlayerDetails(id: GenericId | DeletePlayerDetailsRequest): Promise<void> {
        return this.client.deletePlayerDetails(id);
    }

    getPriorityQueue(id: GenericId | GetPriorityQueueRequest): Promise<PriorityQueueItem | null> {
        const key = `${this.serverApiId(id).id}:${playerId(id).id}`;
        return this.cacheOrDefault('priorityQueue', key, () => this.client.getPriorityQueue(id));
    }

    putPriorityQueue(request: PutPriorityQueueItemRequest): Promise<void> {
        return this.client.putPriorityQueue(request);
    }

    deletePriorityQueue(id: GenericId | DeletePriorityQueueRequest): Promise<void> {
        return this.client.deletePriorityQueue(id);
    }

    getWhitelist(id: GenericId | GetWhitelistRequest): Promise<PriorityQueueItem | null> {
        const key = `${this.serverApiId(id).id}:${playerId(id).id}`;
        return this.cacheOrDefault('whitelist', key, () => this.client.getWhitelist(id));
    }

    putWhitelist(request: PutWhitelistItemRequest): Promise<void> {
        return this.client.putWhitelist(request);
    }

    deleteWhitelist(id: GenericId | DeleteWhitelistRequest): Promise<void> {
        return this.client.deleteWhitelist(id);
    }

    listBans(request: ListBansRequest): Promise<Ban[]> {
        const key = `${request.list.id}:${request.playerId?.id}`;
        return this.cacheOrDefault('banlist', key, () => this.client.listBans(request));
    }

    putBan(request: PutBanRequest): Promise<void> {
        return this.client.putBan(request);
    }

    deleteBan(request: DeleteBanRequest): Promise<void> {
        return this.client.deleteBan(request);
    }

    deleteBans(request: DeleteBansRequest): Promise<void> {
        return this.client.deleteBans(request);
    }

    resolve(id: GenericId | { playerId: GenericId }): Promise<CFToolsId> {
        let playerId: GenericId;
        if ('playerId' in id) {
            playerId = id.playerId;
        } else {
            playerId = id;
        }
        return this.cacheOrDefault('resolve', playerId.id, () => this.client.resolve(id));
    }

    private serverApiId(r: OverrideServerApiId | GenericId): ServerApiId {
        let server = this.defaultServerApiId;
        if ('serverApiId' in r && r.serverApiId) {
            server = r.serverApiId
        }
        if (!server) {
            throw new ServerApiIdRequired();
        }
        return server;
    }

    private async cacheOrDefault<T>(category: keyof CacheConfiguration, key: string, orElse: () => Promise<T>): Promise<T> {
        const cacheKey = `${category}:${key}`;
        let result = this.cache.get<T>(cacheKey);
        if (result !== undefined) {
            return result;
        }
        result = await orElse();
        this.cache.set(cacheKey, result, this.config[category]);
        return result;
    }
}
