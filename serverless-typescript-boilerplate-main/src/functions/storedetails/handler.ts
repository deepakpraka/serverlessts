import 'source-map-support/register';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { formatJSONResponse } from '@/libs/apiGateway';
import { middyfy } from '@/libs/lambda';
import axios from 'axios';
import { createClient } from 'redis';

enum ChainId {
  SOLANA = 0,
  APTOS = 2,
  POLYGON = 1,
  BINANCE = 3,
  ETHEREUM = 4,
  KLAYTN = 5,
  FANTOM = 6,
  ALL = 8, // New enum value representing all token list details
}

const tokenListUrls = [
  { url: 'https://cache.jup.ag/tokens', key: ChainId.SOLANA },
  { url: 'https://raw.githubusercontent.com/hippospace/aptos-coin-list/main/typescript/src/defaultList.mainnet.json', key: ChainId.APTOS },
  { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/polygon.json', key: ChainId.POLYGON },
  { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/bsc.json', key: ChainId.BINANCE },
  { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/ethereum.json', key: ChainId.ETHEREUM },
  { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/klaytn.json', key: ChainId.KLAYTN },
  { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/fantom.json', key: ChainId.FANTOM },
];

const redisClient = createClient();
redisClient.connect().catch(console.error);

const storeTokenListDetailsInRedis = async (key: ChainId, tokenListDetails: any) => {
  try {
    const redisKey = `tokenList:${key}`;
    const value = JSON.stringify(tokenListDetails);
    const result = await redisClient.set(redisKey, value);
    console.log(`Token list details stored in Redis for key ${key}`);
  } catch (error) {
    console.error(`Failed to store token list details in Redis for key ${key}:`, error);
  }
};

export const storedetails: APIGatewayProxyHandler = async (event) => {
  const { chainId } = event.queryStringParameters as any;
  let chainName: string;

  if (Number(chainId) === ChainId.ALL) {
    try {
      for (const { url, key } of tokenListUrls) {
        const response = await axios.get(url);
        const tokenListDetails = response.data;
        await storeTokenListDetailsInRedis(key, tokenListDetails);
        console.log(`Token list details retrieved from URL ${url} and stored in Redis for key ${key}`);
      }
      return formatJSONResponse({
        message: 'Token list details stored in Redis for all chains',
      });
    } catch (error) {
      console.error('Failed to fetch data or store token list details in Redis:', error);
      return formatJSONResponse({
        message: 'Failed to fetch data or store token list details in Redis',
      }, );
    }
  }

  for (const { url, key } of tokenListUrls) {
    if (Number(chainId) === key) {
      chainName = ChainId[key];
      try {
        const response = await axios.get(url);
        const tokenListDetails = response.data;
        await storeTokenListDetailsInRedis(key, tokenListDetails);
        console.log(`Token list details retrieved from URL ${url} and stored in Redis for key ${key}`);
        return formatJSONResponse({
          message: 'Token list details stored in Redis',
          data: {
            chainId: key,
            chainName,
          },
        });
      } catch (error) {
        console.error(`Failed to fetch data for URL ${url}:`, error);
        return formatJSONResponse({
          message: `Failed to fetch data for URL ${url}`,
        },);
      }
    }
  }

  return formatJSONResponse({
    message: 'Invalid chainId provided',
  },);
};

export const main = middyfy(storedetails);