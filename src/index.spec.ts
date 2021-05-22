import {config} from 'dotenv';
import {
    BattlEyeGUID,
    BohemiaInteractiveId,
    CFToolsClient,
    CFToolsId,
    InvalidCredentials,
    Player,
    PriorityQueueItem,
    ResourceNotFound,
    Statistic,
    SteamId64
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

            await expect(client.getPlayerDetails(CFToolsId.of('UNKNOWN'))).rejects.toThrowError(new InvalidCredentials())
        });
    });

    describe('playerDetails', () => {
        it('returns not found for unknown CFTools ID', async () => {
            await expect(client.getPlayerDetails(CFToolsId.of('5fc7f9a050ae5adf01df9bbb'))).rejects.toThrowError(new ResourceNotFound());
        });

        it('returns player for CFTools ID', async () => {
            await expect(client.getPlayerDetails(existingCfToolsId)).resolves.toStrictEqual({
                names: ['FlorianSW']
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
    });
});
