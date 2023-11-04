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
    .withCredentials('your-application-id', 'your-secret')
    .build();

client.getPriorityQueue(SteamId64.of('a-steam-id')).then((item: PriorityQueueItem) => {
    // Do something
});
```

### API Reference

You can find the API reference for the SDK in [the documentation page](https://floriansw.github.io/cftools-sdk/).

### Caching

When using the SDK for a component that acts directly upon user interactions, consider that the CFTools Cloud API utilises a rate limit to protect for unusual load and abusive behaviour.
This SDK provides a way to circumvent a user issuing more requests to your program then the CFTools Cloud API allows you to do against a specific endpoint.
Enabling caching for the CFToolsClient will cache successful responses from the CFTools Cloud API with a provided Cache and will hold this information up to the configured expiration time.
The SDK ships with one Cache, which holds responses in-memory.

You can enable caching with the builder:

```typescript
import {CFToolsClientBuilder, SteamId64} from 'cftools-sdk';

const client = new CFToolsClientBuilder()
    .withCache()
    .withServerApiId('your-server-api-id')
    .withCredentials('your-application-id', 'your-secret')
    .build();

client.getPriorityQueue(SteamId64.of('a-steam-id')).then((item: PriorityQueueItem) => {
    // Do something
});
```

Note, that mutable operations (like adding a priority queue entry) will never be cached.

### Enterprise API

By default, the cftools-sdk uses the general purpose [Data API](https://developer.cftools.cloud/documentation/data-api).
In addition to that, the enterprise API is supported as well, which is a special-built API with some restrictions of the Data API lifted.

You can setup the SDK to use the Enterprise API with the builder:

```typescript
import {CFToolsClientBuilder, SteamId64} from 'cftools-sdk';

const client = new CFToolsClientBuilder()
    .withServerApiId('your-server-api-id')
    .withCredentials('your-application-id', 'your-secret')
    .withEnterpriseApi('your-enterprise-api-key')
    .build();

client.getPriorityQueue(SteamId64.of('a-steam-id')).then((item: PriorityQueueItem) => {
    // Do something
});
```

## Contribution

This library is not complete yet and needs your help: What methods and features are missing?
How can the documentation be improved?
Simply create an issue in the Github repository with as much details as possible.

Pull requests are welcome as well :)
