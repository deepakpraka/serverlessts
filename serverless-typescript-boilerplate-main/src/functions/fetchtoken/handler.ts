import 'source-map-support/register';
import type { ValidatedEventAPIGatewayProxyEvent } from '@/libs/apiGateway';
import { formatJSONResponse } from '@/libs/apiGateway';
import { middyfy } from '@/libs/lambda';
import schema from './schema';
import axios from 'axios';
import { createClient } from 'redis';

enum ChainId {
  SOLANA = 0,
  APTOS = 1,
  POLYGON = 2,
  BINANCE = 3,
  ETHEREUM = 4,
  KLAYTN = 5,
  FANTOM = 6,
}

const fetchTokenListDetails = async (url: string) => {
  try {
    const response = await axios.get(url);
    const tokenListDetails = response.data;
    const transformedDetails = tokenListDetails.map((value: any) => {
      return {
        address: value.address,
        chainId: value.chainId,
        symbol: value.symbol,
        logoURI: value.logoURI,
        coingecko_id: value.coingeckoId,
        decimals: value.decimals,
      };
    });

    console.log(`Token list details for URL ${url}:`, transformedDetails);
    return transformedDetails;
  } catch (error) {
    console.error(`Failed to fetch token list details from URL ${url}:`, error);
    return null;
  }
};

const fetchAndStoreTokenListDetails = async (url: string, key: ChainId, redisClient: any) => {
  const tokenListDetails = await fetchTokenListDetails(url);
  if (tokenListDetails) {
    try {
      const redisKey = `tokenList:${key}`;
      const value = JSON.stringify(tokenListDetails);
      await redisClient.set(redisKey, value);
    } catch (error) {
      console.error(`Failed to store token list details for key ${key} in Redis:`, error);
    }
  } else {
    console.log('Error');
  }
};

const fetchAllTokenListDetails = async (arg: ChainId, redisClient: any) => {
  const tokenListUrls_ = [
    { url: 'https://cache.jup.ag/tokens', key: ChainId.SOLANA },
    { url: 'https://raw.githubusercontent.com/hippospace/aptos-coin-list/main/typescript/src/defaultList.mainnet.json', key: ChainId.APTOS },
    { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/polygon.json', key: ChainId.POLYGON },
    { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/bsc.json', key: ChainId.BINANCE },
    { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/ethereum.json', key: ChainId.ETHEREUM },
    { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/klaytn.json', key: ChainId.KLAYTN },
    { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/fantom.json', key: ChainId.FANTOM },
  ];

  for (const { url, key } of tokenListUrls_) {
    await fetchAndStoreTokenListDetails(url, key, redisClient);
    if (arg === key) {
      try {
        const response = await axios.get(url);
        console.log(`Response for URL ${url}:`, response.data);
      } catch (error) {
        console.error(`Failed to fetch data for URL ${url}:`, error);
      }
    }
  }
};

const retrieveTokenListDetailsFromRedis = async (key: ChainId, redisClient: any) => {
  try {
    const redisKey = `tokenList:${key}`;

    // Get the value from Redis
    const value = await redisClient.get(redisKey);
    if (value) {
      const tokenListDetails = JSON.parse(value);
      console.log(`Token list details for key ${key}:`, tokenListDetails);
      return tokenListDetails;
    } else {
      console.error(`Token list details for key ${key} not found in Redis`);
      return null;
    }
  } catch (error) {
    console.error(`Failed to retrieve token list details from Redis for key ${key}:`, error);
    return null;
  }
};

const redisClient = createClient();
redisClient
  .connect()
  .then(() => {
    console.log('connected');
  })
  .catch(console.error);

const fetchtoken: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const chainIdParam = event.queryStringParameters?.chainId;
  const chainId: ChainId = chainIdParam ? parseInt(chainIdParam) : ChainId.SOLANA;

  let chainName: string;

  switch (chainId) {
    case ChainId.SOLANA:
      chainName = 'Solana';
      break;
    case ChainId.APTOS:
      chainName = 'Aptos';
      break;
    case ChainId.POLYGON:
      chainName = 'Polygon';
      break;
    case ChainId.BINANCE:
      chainName = 'Binance';
      break;
    case ChainId.ETHEREUM:
      chainName = 'Ethereum';
      break;
    case ChainId.KLAYTN:
      chainName = 'Klaytn';
      break;
    case ChainId.FANTOM:
      chainName = 'Fantom';
      break;
    default:
      chainName = 'Unknown';
      break;
  }

  await fetchAllTokenListDetails(chainId, redisClient);

  const tokenListDetails = await retrieveTokenListDetailsFromRedis(chainId, redisClient);

  return formatJSONResponse({
    message: 'Token list details retrieved successfully',
    data: {
      chainId,
      chainName,
      tokenListDetails,
    },
  });
};

export const main = middyfy(fetchtoken);
//