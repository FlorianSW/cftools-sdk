import {config} from 'dotenv';
import {CFToolsClient, CFToolsId, InvalidCredentials, Player, ResourceNotFound, SteamId64} from './types';
import {CFToolsClientBuilder} from './index';

config();

describe('CFToolsClient', () => {
    let client: CFToolsClient;

    beforeEach(() => {
        client = new CFToolsClientBuilder()
            .withServerApiId(process.env.CFTOOLS_SERVER_API_ID || '')
            .withCredentials(process.env.CFTOOLS_APPLICATION_ID || '', process.env.CFTOOLS_SECRET || '')
            .build();
    });

    describe('authentication', () => {
        it('returns invalid credentials on wrong credentials', () => {
            process.env.CFTOOLS_API_TOKEN = '';
            client = new CFToolsClientBuilder()
                .withServerApiId(process.env.CFTOOLS_SERVER_API_ID || '')
                .withCredentials('INVALID', 'INVALID')
                .build();

            expect(client.playerDetails(CFToolsId.of('UNKNOWN'))).rejects.toThrowError(new InvalidCredentials())
        });
    });

    describe('playerDetails', () => {
        it('returns not found for unknown CFTools ID', async () => {
            await expect(client.playerDetails(CFToolsId.of('5fc7f9a050ae5adf01df9bbb'))).rejects.toThrowError(new ResourceNotFound());
        });

        it('returns player for CFTools ID', async () => {
            await expect(client.playerDetails(CFToolsId.of('5fc7f9a050ae5adf01df9bdd'))).resolves.toStrictEqual({
                names: ['FlorianSW']
            } as Player);
        });

        it('returns player for Steam ID', async () => {
            await expect(client.playerDetails(SteamId64.of('76561198012102485'))).resolves.toMatchObject({
                names: ['FlorianSW']
            } as Player);
        });

        it('returns player for BE GUID', async () => {
            await expect(client.playerDetails(SteamId64.of('290f76ca6675a5b80a573756481d3767'))).resolves.toMatchObject({
                names: ['FlorianSW']
            } as Player);
        });

        it('returns player for BIS ID', async () => {
            await expect(client.playerDetails(SteamId64.of('9WWg8tLpyc6G-shAuda4gA_crUBpqJcFIdx3Q5-kgTk='))).resolves.toMatchObject({
                names: ['FlorianSW']
            } as Player);
        });
    });
});
