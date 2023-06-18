import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { formatJSONResponse } from '@/libs/apiGateway';
import { createClient } from 'redis';
import axios from 'axios';

enum ChainId {
  SOLANA = 0,
  APTOS = 1,
  POLYGON = 2,
  BINANCE = 3,
  ETHEREUM = 4,
  KLAYTN = 5,
  FANTOM = 6,
}

const redisClient = createClient();
redisClient.connect().catch(console.error);

const fetchAndStoreTokenListDetails = async (url: string, key: ChainId, redisClient: any) => {
  try {
    const response = await axios.get(url);
    const tokenListDetails = response.data;

    const redisKey = `tokenList:${key}`;
    const value = JSON.stringify(tokenListDetails);
    await redisClient.set(redisKey, value);

    console.log(`Token list details stored for URL ${url} and key ${key}`);
  } catch (error) {
    console.error(`Failed to store token list details for URL ${url} and key ${key} in Redis:`, error);
  }
};

export const storeTokenList: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent & { body: string }) => {
  try {
    const chainId = event.pathParameters?.chainId;

    if (!chainId) {
      return formatJSONResponse({
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing chainId parameter' }),
      });
    }

    const url = event.body;

    if (!url) {
      return formatJSONResponse({
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing URL in the request body' }),
      });
    }

    const key: ChainId = parseInt(chainId);
    await fetchAndStoreTokenListDetails(url, key, redisClient);

    return formatJSONResponse({
      message: 'Token list details stored in Redis successfully',
    });
  } catch (error) {
    return formatJSONResponse({
      statusCode: 500,
      body: JSON.stringify({ error: 'An error occurred while storing the token list details in Redis' }),
    });
  }
};
