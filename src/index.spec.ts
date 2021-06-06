import {config} from 'dotenv';
import {
    AuthenticationRequired,
    BattlEyeGUID,
    BohemiaInteractiveId,
    CFToolsClient,
    CFToolsId,
    Game,
    GameServerItem,
    InvalidCredentials,
    Player,
    PriorityQueueItem,
    ResourceNotFound,
    ServerApiId,
    ServerApiIdRequired,
    Statistic,
    SteamId64,
    SteamWorkshopMod
} from './types';
import {CFToolsClientBuilder} from './index';

describe('CFToolsClient', () => {
    const existingCfToolsId = CFToolsId.of('5fc7f9a050ae5adf01df9bdd');
    let client: CFToolsClient;

    beforeEach(() => {
        config();
        client = new CFToolsClientBuilder()
            .withServerApiId(process.env.CFTOOLS_SERVER_API_ID || '')
            .withCredentials(process.env.CFTOOLS_APPLICATION_ID || '', process.env.CFTOOLS_SECRET || '')
            .build();
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
            await expect(client.getPlayerDetails(existingCfToolsId)).resolves.toStrictEqual({
                names: ['FlorianSW'],
                playtime: expect.any(Number),
                sessions: expect.any(Number),
                statistics: {
                    infectedDeaths: expect.any(Number),
                    deaths: expect.any(Number),
                    kills: expect.any(Number),
                    environmentDeaths: expect.any(Number),
                    suicides: expect.any(Number),
                    hits: expect.any(Number),
                    killDeathRatio: expect.any(Number),
                    longestKill: expect.any(Number),
                    longestShot: expect.any(Number),
                    hitZones: {
                        brain: expect.any(Number),
                        head: expect.any(Number),
                        leftArm: expect.any(Number),
                        leftFoot: expect.any(Number),
                        leftLeg: expect.any(Number),
                        rightArm: expect.any(Number),
                        rightHand: expect.any(Number),
                        rightLeg: expect.any(Number),
                        torso: expect.any(Number),
                    },
                    weaponsBreakdown: {},
                }
            } as Player);
        });

        it('returns player for Steam ID', async () => {
            await expect(client.getPlayerDetails(SteamId64.of('76561198012102485'))).resolves.toMatchObject({
                names: ['FlorianSW']
            } as Player);
        });

        it('returns player for BE GUID', async () => {
            await expect(client.getPlayerDetails(BattlEyeGUID.of('290f76ca6675a5b80a573756481d3767'))).resolves.toMatchObject({
                names: ['FlorianSW']
            } as Player);
        });

        it('returns player for BIS ID', async () => {
            await expect(client.getPlayerDetails(BohemiaInteractiveId.of('9WWg8tLpyc6G-shAuda4gA_crUBpqJcFIdx3Q5-kgTk='))).resolves.toMatchObject({
                names: ['FlorianSW']
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
                names: ['FlorianSW']
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

            expect(leaderboard[0].name).toBe('FlorianSW');
        });
    });

    describe('priority queue', () => {
        afterEach(async () => {
            await client.deletePriorityQueue(existingCfToolsId);
        });

        it('returns null if not in priority queue', async () => {
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
            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + 1);
            await client.putPriorityQueue({
                id: existingCfToolsId,
                comment: 'A_COMMENT',
            });

            await expect(client.getPriorityQueue(existingCfToolsId)).resolves.toHaveProperty('expiration', 'Permanent');
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
                name: expect.stringContaining('Rostow by go2tech.de'),
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
                        general: 12.0,
                        night: 2.0,
                    },
                },
                geolocation: {
                    available: false,
                    city: {
                        region: null,
                        name: null,
                    },
                    continent: 'EU',
                    country: {
                        code: 'FR',
                        name: 'France'
                    },
                    timezone: 'Europe/Paris',
                },
                mods: expect.arrayContaining([{
                    fileId: 2344585107,
                    name: 'Rostow',
                }] as SteamWorkshopMod[]),
                map: 'rostow',
                online: true,
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
                        slots: 40,
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
    });
});
