import {
    Cache,
    CacheConfiguration,
    CFToolsClient,
    DeletePriorityQueueRequest, DeleteWhitelistRequest,
    GameServerItem,
    GenericId,
    GetGameServerDetailsRequest,
    GetLeaderboardRequest,
    GetPlayerDetailsRequest,
    GetPriorityQueueRequest, GetWhitelistRequest,
    LeaderboardItem,
    OverrideServerApiId,
    Player,
    PriorityQueueItem,
    PutPriorityQueueItemRequest, PutWhitelistItemRequest,
    ServerApiId,
    ServerApiIdRequired
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

    getLeaderboard(request: GetLeaderboardRequest): Promise<LeaderboardItem[]> {
        const key = `${this.serverApiId(request)}:${request.statistic}:${request.order}:${request.limit}`;
        return this.cacheOrDefault('leaderboard', key, () => this.client.getLeaderboard(request));
    }

    getPlayerDetails(id: GenericId | GetPlayerDetailsRequest): Promise<Player> {
        const key = `${this.serverApiId(id)}:${playerId(id).id}`;
        return this.cacheOrDefault('playerDetails', key, () => this.client.getPlayerDetails(id));
    }

    getPriorityQueue(id: GenericId | GetPriorityQueueRequest): Promise<PriorityQueueItem | null> {
        const key = `${this.serverApiId(id)}:${playerId(id).id}`;
        return this.cacheOrDefault('priorityQueue', key, () => this.client.getPriorityQueue(id));
    }

    putPriorityQueue(request: PutPriorityQueueItemRequest): Promise<void> {
        return this.client.putPriorityQueue(request);
    }

    deletePriorityQueue(id: GenericId | DeletePriorityQueueRequest): Promise<void> {
        return this.client.deletePriorityQueue(id);
    }

    getWhitelist(id: GenericId | GetWhitelistRequest): Promise<PriorityQueueItem | null> {
        const key = `${this.serverApiId(id)}:${playerId(id).id}`;
        return this.cacheOrDefault('whitelist', key, () => this.client.getWhitelist(id));
    }

    putWhitelist(request: PutWhitelistItemRequest): Promise<void> {
        return this.client.putWhitelist(request);
    }

    deleteWhitelist(id: GenericId | DeleteWhitelistRequest): Promise<void> {
        return this.client.deleteWhitelist(id);
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
