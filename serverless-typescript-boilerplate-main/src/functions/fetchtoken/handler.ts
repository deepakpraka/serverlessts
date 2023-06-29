import 'source-map-support/register';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { formatJSONResponse } from '@/libs/apiGateway';
import { middyfy } from '@/libs/lambda';
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

const retrieveTokenListDetailsFromRedis = async (key: ChainId) => {
  try {
    const redisKey = `tokenList:${key}`;
    const value = await redisClient.get(redisKey);
    if (value) {
      const tokenListDetails = JSON.parse(value);
      return tokenListDetails;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Failed to retrieve token list details from Redis for key ${key}:`, error);
    return null;
  }
};

export const fetchtoken: APIGatewayProxyHandler = async (event) => {
  const { chainId } = event.queryStringParameters as any;
  let chainName: string;

  if (Number(chainId) === ChainId.ALL) {
    const allTokenListDetails = {};
    try {
      for (const { key } of tokenListUrls) {
        const storedTokenListDetails = await retrieveTokenListDetailsFromRedis(key);
        if (storedTokenListDetails) {
          allTokenListDetails[key] = storedTokenListDetails;
        }
      }

      console.log(`Token list details retrieved from Redis for all chains`);
      return formatJSONResponse({
        message: 'Token list details retrieved from Redis',
        data: {
          allTokenListDetails,
        },
      });
    } catch (error) {
      console.error(`Failed to retrieve token list details from Redis:`, error);
      return formatJSONResponse({
        message: 'Failed to retrieve token list details from Redis',
      });
    }
  }

  for (const {  key } of tokenListUrls) {
    if (Number(chainId) === key) {
      chainName = ChainId[key];
      try {
        const storedTokenListDetails = await retrieveTokenListDetailsFromRedis(key);
        if (storedTokenListDetails) {
          console.log(`Token list details retrieved from Redis for key ${key}`);
          return formatJSONResponse({
            message: 'Token list details retrieved from Redis',
            data: {
              chainId: key,
              chainName,
              tokenListDetails: storedTokenListDetails,
            },
          });
        } else {
          console.log(`Token list details not found in Redis for key ${key}`);
          return formatJSONResponse({
            message: 'Token list details not found in Redis',
          });
        }
      } catch (error) {
        console.error(`Failed to retrieve token list details from Redis for key ${key}:`, error);
        return formatJSONResponse({
          message: 'Failed to retrieve token list details from Redis',
        });
      }
    }
  }

  return formatJSONResponse({
    message: 'Invalid chainId provided',
  });
};

export const main = middyfy(fetchtoken);
