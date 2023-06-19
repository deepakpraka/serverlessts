import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { formatJSONResponse } from '@/libs/apiGateway';
import { createClient } from 'redis';
import { middyfy } from '@/libs/lambda';

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

export const getTokenListDetails: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent & { body: string }) => {
  try {
    const chainIdParam = event.queryStringParameters?.chainId;
    const chainId: ChainId = chainIdParam ? parseInt(chainIdParam) : ChainId.POLYGON;

    if (!chainId) {
      return formatJSONResponse({
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing chainId parameter' }),
      });
    }

    const redisKey = `tokenList:${chainId}`;
    const tokenListDetails = await redisClient.get(redisKey);

    if (tokenListDetails) {
      return formatJSONResponse({
        data: JSON.parse(tokenListDetails),
        status: 200,
        message: 'Token list details retrieved from Redis successfully',
      });
    } else {
      return formatJSONResponse({
        statusCode: 404,
        body: JSON.stringify({ error: 'Token list details not found for the specified chainId' }),
      });
    }
  } catch (error) {
    return formatJSONResponse({
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    });
  }
};

export const main = middyfy(getTokenListDetails);
