# cftools-sdk

[![npm](https://img.shields.io/npm/v/cftools-sdk?style=flat-square)](https://www.npmjs.com/package/cftools-sdk)
[![Discord](https://img.shields.io/discord/729467994832371813?color=7289da&label=Discord&logo=discord&logoColor=ffffff&style=flat-square)](https://go2tech.de/discord)

This library provides convenient methods to work with the [CFTools Cloud](https://www.cftools.cloud) API from a nodejs/JavaScript project.

## Installation

Install via npm:

```sh
npm install cftools-sdk
```

## Usage

The main piece you will work with is the `CFToolsClient`.
It provides methods to interact with the API actions of CFTools Cloud and are documented in the corresponding interface.

Create a new instance of the client with the builder as shown in this example:

```typescript
import {CFToolsClientBuilder, SteamId64} from 'cftools-sdk';

const client = new CFToolsClientBuilder()
    .withServerApiId('your-server-api-id')
    .withCredentials('your-application-id', 'your-secret');

client.getPriorityQueue(SteamId64.of('a-steam-id')).then((item: PriorityQueueItem) => {
    // Do something
});
```

## Contribution

This library is not complete yet and needs your help: What methods and features are missing?
How can the documentation be improved?
Simply create an issue in the Github repository with as much details as possible.

Pull requests are welcome as well :)
