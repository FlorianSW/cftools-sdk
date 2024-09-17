import {config} from 'dotenv';
import {
    AmbiguousDeleteBanRequest,
    AuthenticationRequired,
    Ban,
    Banlist,
    BattlEyeGUID,
    BohemiaInteractiveId,
    CFToolsClient,
    CFToolsId,
    Game,
    GameServerItem,
    GameServerQueryError,
    InvalidCredentials,
    IPAddress,
    Player,
    PriorityQueueItem,
    PutBanRequest,
    ResourceNotFound,
    ServerApiId,
    ServerApiIdRequired,
    ServerInfo,
    Statistic,
    SteamId64,
    SteamWorkshopMod
} from './types';
import {CFToolsClientBuilder, httpClient} from './index';
import {GotCFToolsClient} from './internal/got/client';
import {GotHttpClient, HttpClient} from './internal/http';

// disabled as I do not own a CFTools subscription/server anymore, so no way to test against it in this :(
xdescribe('CFToolsClient', () => {
    const existingCfToolsId = CFToolsId.of('5fc7f9a050ae5adf01df9bdd');
    let client: CFToolsClient;
    let banlist: Banlist;

    beforeEach(() => {
        config();
        client = new CFToolsClientBuilder()
            .withServerApiId(process.env.CFTOOLS_SERVER_API_ID || '')
            .withCredentials(process.env.CFTOOLS_APPLICATION_ID || '', process.env.CFTOOLS_SECRET || '')
            .build();

        banlist = Banlist.of(process.env.CFTOOLS_BANLIST || '');
    });

    describe('authentication', () => {
        it('returns invalid credentials on wrong credentials', async () => {
            process.env.CFTOOLS_API_TOKEN = '';
            client = new CFToolsClientBuilder()
                .withServerApiId(process.env.CFTOOLS_SERVER_API_ID || '')
                .withCredentials(process.env.CFTOOLS_APPLICATION_ID || '', 'INVALID')
                .build();

            await expect(client.getPlayerDetails(CFToolsId.of('UNKNOWN'))).rejects.toThrowError(InvalidCredentials)
        });

        it('throws when executing functions which require auth without auth', async () => {
            client = new CFToolsClientBuilder().withServerApiId(process.env.CFTOOLS_SERVER_API_ID || '').build();

            await expect(client.getPlayerDetails(existingCfToolsId)).rejects.toThrowError(AuthenticationRequired);
        });
    });

    describe('playerDetails', () => {
        it('returns not found for unknown CFTools ID', async () => {
            await expect(client.getPlayerDetails(CFToolsId.of('5fc7f9a050ae5adf01df9bbb'))).rejects.toThrowError(ResourceNotFound);
        });

        it('returns player for CFTools ID', async () => {
            const player = await client.getPlayerDetails(CFToolsId.of("5fc7f9a050ae5adf01df9bdd"));

            expect(player).toStrictEqual({
                names: expect.arrayContaining(['FlorianSW']),
                playtime: expect.any(Number),
                sessions: expect.any(Number),
            } as Player);
        });

        it('returns player for Steam ID', async () => {
            await expect(client.getPlayerDetails(SteamId64.of('76561198012102485'))).resolves.toMatchObject({
                names: expect.arrayContaining(['FlorianSW']),
            } as Player);
        });

        it('returns player for BE GUID', async () => {
            await expect(client.getPlayerDetails(BattlEyeGUID.of('290f76ca6675a5b80a573756481d3767'))).resolves.toMatchObject({
                names: expect.arrayContaining(['FlorianSW']),
            } as Player);
        });

        it('returns player for BIS ID', async () => {
            await expect(client.getPlayerDetails(BohemiaInteractiveId.of('9WWg8tLpyc6G-shAuda4gA_crUBpqJcFIdx3Q5-kgTk='))).resolves.toMatchObject({
                names: expect.arrayContaining(['FlorianSW']),
            } as Player);
        });

        it('throws on missing server api ID', async () => {
            client = new CFToolsClientBuilder()
                .withCredentials(process.env.CFTOOLS_APPLICATION_ID || '', process.env.CFTOOLS_SECRET || '')
                .build();

            await expect(client.getPlayerDetails(existingCfToolsId)).rejects.toThrowError(ServerApiIdRequired);
        });

        it('uses overridden server api ID', async () => {
            client = new CFToolsClientBuilder()
                .withCredentials(process.env.CFTOOLS_APPLICATION_ID || '', process.env.CFTOOLS_SECRET || '')
                .build();

            await expect(client.getPlayerDetails({
                playerId: existingCfToolsId,
                serverApiId: ServerApiId.of(process.env.CFTOOLS_SERVER_API_ID || '')
            })).resolves.toMatchObject({
                names: expect.arrayContaining(['FlorianSW']),
            } as Player);
        });
    });

    describe('leaderboard', () => {
        it('returns players on leaderboard', async () => {
            const leaderboard = await client.getLeaderboard({
                order: 'ASC',
                statistic: Statistic.PLAYTIME,
                limit: 2
            });

            expect(leaderboard[0].id).toEqual(existingCfToolsId);
        });
    });

    describe('priority queue', () => {
        afterEach(async () => {
            await client.deletePriorityQueue(existingCfToolsId);
            await client.deletePriorityQueue(CFToolsId.of(process.env.CFTOOLS_BANABLE_CFTOOLS_ID || ''));
        });

        it('returns null if not in priority queue', async () => {
            await client.putPriorityQueue({
                id: CFToolsId.of(process.env.CFTOOLS_BANABLE_CFTOOLS_ID || ''),
                expires: 'Permanent',
                comment: 'Test',
            });
            await expect(client.getPriorityQueue(existingCfToolsId)).resolves.toBeNull();
        });

        it('throws ResourceNotFound on missing identifier', async () => {
            await expect(client.getPriorityQueue(SteamId64.of('76561199999900000'))).rejects.toThrowError(ResourceNotFound);
        });

        it('persists priority queue item', async () => {
            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + 1);
            await client.putPriorityQueue({
                id: existingCfToolsId,
                comment: 'A_COMMENT',
                expires: expireDate
            });

            await expect(client.getPriorityQueue(existingCfToolsId)).resolves.toMatchObject({
                createdBy: existingCfToolsId,
                comment: 'A_COMMENT',
                expiration: expireDate,
            } as PriorityQueueItem);
        });

        it('creates a permanent priority queue entry', async () => {
            await client.putPriorityQueue({
                id: existingCfToolsId,
                comment: 'A_COMMENT',
            });

            await expect(client.getPriorityQueue(existingCfToolsId)).resolves.toHaveProperty('expiration', 'Permanent');
        });
    });

    describe('whitelist', () => {
        afterEach(async () => {
            await client.deleteWhitelist(existingCfToolsId);
        });

        it('returns null for non-existent whitelist entry', async () => {
            await expect(client.getWhitelist(existingCfToolsId)).resolves.toBeNull();
        });

        it('throws ResourceNotFound on missing identifier', async () => {
            await expect(client.getWhitelist(SteamId64.of('76561199999900000'))).rejects.toThrowError(ResourceNotFound);
        });

        it('persists whitelist item', async () => {
            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + 1);
            await client.putWhitelist({
                id: existingCfToolsId,
                comment: 'A_COMMENT',
                expires: expireDate
            });

            await expect(client.getWhitelist(existingCfToolsId)).resolves.toMatchObject({
                createdBy: existingCfToolsId,
                comment: 'A_COMMENT',
                expiration: expireDate,
            } as PriorityQueueItem);
        });

        it('creates a permanent whitelist entry', async () => {
            await client.putWhitelist({
                id: existingCfToolsId,
                comment: 'A_COMMENT',
            });

            await expect(client.getWhitelist(existingCfToolsId)).resolves.toHaveProperty('expiration', 'Permanent');
        });
    });

    // does only work when there is a player online, hence not running automatically
    xit('spawns item', async () => {
        let serverApiId = ServerApiId.of(process.env.CFTOOLS_SERVER_API_ID || '');
        const sessions = await client.listGameSessions({
            serverApiId: serverApiId,
        });
        await client.spawnItem({
            session: sessions.find((s) => s.steamId.id === '76561198012102485')!!,
            serverApiId: serverApiId,
            itemClass: 'AKM',
        });
    });

    // does only work when there is a player online, hence not running automatically
    xit('teleports player', async () => {
        let serverApiId = ServerApiId.of(process.env.CFTOOLS_SERVER_API_ID || '');
        const sessions = await client.listGameSessions({
            serverApiId: serverApiId,
        });
        await client.teleport({
            session: sessions.find((s) => s.steamId.id === '76561198012102485')!!,
            serverApiId: serverApiId,
            coordinates: {
                x: 2962.07,
                y: 12152.5,
                z: 230,
            },
        });
    });

    // does only work when there is a player online, hence not running automatically
    xit('heals player', async () => {
        let serverApiId = ServerApiId.of(process.env.CFTOOLS_SERVER_API_ID || '');
        const sessions = await client.listGameSessions({
            serverApiId: serverApiId,
        });
        await client.healPlayer({
            session: sessions.find((s) => s.steamId.id === '76561198012102485')!!,
            serverApiId: serverApiId,
        });
    });

    // does only work when there is a player online, hence not running automatically
    xit('kills player', async () => {
        let serverApiId = ServerApiId.of(process.env.CFTOOLS_SERVER_API_ID || '');
        const sessions = await client.listGameSessions({
            serverApiId: serverApiId,
        });
        await client.killPlayer({
            session: sessions.find((s) => s.steamId.id === '76561198012102485')!!,
            serverApiId: serverApiId,
        });
    });

    // does only work when there is a player online, hence not running automatically
    xit('raw gamelabs action', async () => {
        let serverApiId = ServerApiId.of(process.env.CFTOOLS_SERVER_API_ID || '');
        await client.gameLabsAction({
            referenceKey: '76561198012102485',
            actionContext: 'player',
            actionCode: 'CFCloud_ExplodePlayer',
            serverApiId: serverApiId,
            parameters: {},
        });
    });

    describe('getGameServerDetails', () => {
        it('returns game server details for existing server', async () => {
            const ip = '37.59.34.178';
            const server = await client.getGameServerDetails({
                game: Game.DayZ,
                ip: ip,
                port: 2302,
            });

            expect(server).toMatchObject({
                name: expect.any(String),
                host: {
                    address: ip,
                    gamePort: 2302,
                    queryPort: 27016
                },
                attributes: {
                    dlc: false,
                    dlcs: {
                        livonia: false,
                    },
                    experimental: false,
                    hive: 'private',
                    modded: true,
                    official: false,
                },
                environment: {
                    perspectives: {
                        firstPersonPerspective: true,
                        thirdPersonPerspective: true,
                    },
                    timeAcceleration: {
                        general: 6,
                        night: 4,
                    },
                },
                geolocation: {
                    available: false,
                    city: {
                        region: '',
                        name: '',
                    },
                    continent: 'EU',
                    country: {
                        code: 'FR',
                        name: 'France'
                    },
                    timezone: 'Europe/Paris',
                },
                mods: expect.arrayContaining([{
                    fileId: 1564026768,
                    name: 'Community Online Tools',
                }] as SteamWorkshopMod[]),
                map: expect.any(String),
                online: expect.any(Boolean),
                rating: expect.any(Number),
                rank: expect.any(Number),
                security: {
                    vac: true,
                    battleye: true,
                    password: false,
                },
                status: {
                    players: {
                        online: expect.any(Number),
                        slots: expect.any(Number),
                        queue: expect.any(Number),
                    },
                },
                version: expect.any(String),
            } as Partial<GameServerItem>);
        });

        it('returns not found for non-existing server', async () => {
            await expect(client.getGameServerDetails({
                game: Game.DayZ,
                ip: '127.0.0.1',
                port: 2302,
            })).rejects.toThrowError(ResourceNotFound);
        });

        it('throws with GameServerQueryError', async () => {
            client = new GotCFToolsClient({
                get: url => Promise.resolve({
                    [url.replace('v1/gameserver/', '')]: {
                        _object: {
                            error: 'GameServerQueryError.GENERIC',
                        }
                    }
                })
            } as HttpClient);

            await expect(client.getGameServerDetails({
                game: Game.DayZ,
                ip: '127.0.0.1',
                port: 2302,
            })).rejects.toThrowError(GameServerQueryError);
        });
    });

    describe('getServerInfo', () => {
        it('returns server info', async () => {
            expect(await client.getServerInfo({})).toMatchObject({
                nickname: 'Chernarus',
                connection: {
                    peerVersion: '1.219',
                    usedProtocol: 'UDP_RCON_BATTLEYE_DZ',
                },
                game: Game.DayZ,
                owner: expect.any(CFToolsId),
            } as Partial<ServerInfo>);
        });
    });

    describe('listGameSessions', () => {
        it('returns game sessions', async () => {
            expect(await client.listGameSessions({})).toStrictEqual(expect.any(Array));
        });
    });

    describe('ban management', () => {
        afterEach(async () => {
            await client.deleteBans({
                playerId: CFToolsId.of(process.env.CFTOOLS_BANABLE_CFTOOLS_ID || ''),
                list: banlist
            });
        });

        it('returns null on missing ban', async () => {
            await expect(client.listBans({
                playerId: existingCfToolsId,
                list: banlist
            })).resolves.toEqual([]);
        });

        it('persists ban', async () => {
            await client.putBan({
                playerId: CFToolsId.of(process.env.CFTOOLS_BANABLE_CFTOOLS_ID || ''),
                list: banlist,
                expiration: 'Permanent',
                reason: 'cftools-sdk test'
            });
            await expect(client.listBans({
                playerId: CFToolsId.of(process.env.CFTOOLS_BANABLE_CFTOOLS_ID || ''),
                list: banlist
            })).resolves.toEqual(expect.arrayContaining([
                expect.objectContaining({
                    id: expect.any(String),
                    created: expect.any(Date),
                    expiration: 'Permanent',
                    reason: 'cftools-sdk test',
                    status: 'Ban.ACTIVE',
                } as Ban)
            ]));
        });

        it('persists IP ban', async () => {
            await client.putBan({
                playerId: IPAddress.ofIpv4('127.0.0.1'),
                list: banlist,
                expiration: 'Permanent',
                reason: 'cftools-sdk test'
            });
            await expect(client.listBans({
                playerId: IPAddress.ofIpv4('127.0.0.1'),
                list: banlist
            })).resolves.toEqual(expect.arrayContaining([
                expect.objectContaining({
                    id: expect.any(String),
                    created: expect.any(Date),
                    expiration: 'Permanent',
                    reason: 'cftools-sdk test',
                    status: 'Ban.ACTIVE',
                } as Ban)
            ]));
            await client.deleteBan({
                playerId: IPAddress.ofIpv4('127.0.0.1'),
                list: banlist
            });
        });

        it('deletes ban by ban ID', async () => {
            const playerId = CFToolsId.of(process.env.CFTOOLS_BANABLE_CFTOOLS_ID || '');
            await client.putBan({
                playerId: playerId,
                list: banlist,
                expiration: 'Permanent',
                reason: 'cftools-sdk test'
            });
            const ban = await client.listBans({
                playerId: playerId,
                list: banlist
            });

            await client.deleteBan({
                list: banlist,
                ban: ban[0],
            });

            await expect(client.listBans({
                playerId: playerId,
                list: banlist
            })).resolves.toEqual([]);
        });

        it('throws error when player has more than one ban', async () => {
            const playerId = CFToolsId.of(process.env.CFTOOLS_BANABLE_CFTOOLS_ID || '');
            const details: PutBanRequest = {
                playerId: playerId,
                list: banlist,
                expiration: 'Permanent',
                reason: 'cftools-sdk test'
            };
            await client.putBan(details);
            await client.putBan(details);

            await expect(client.deleteBan({
                playerId: playerId,
                list: banlist
            })).rejects.toThrowError(AmbiguousDeleteBanRequest);
        });
    });
});
