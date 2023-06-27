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

// Define the token list details
const tokenListDetails = {
  [ChainId.SOLANA]: {
  
  },
  [ChainId.APTOS]: {
    
  },
  [ChainId.POLYGON]: {
    
  },
  [ChainId.BINANCE]: {
    
  },
  [ChainId.ETHEREUM]: {
    
  },
  [ChainId.KLAYTN]: {
    
  },
  [ChainId.FANTOM]: {
    
  },
};

const newToken = [{
  address: '0x789xyz',
  name: 'New Token',
  symbol: 'NTK'
}]

export const storeTokenListDetailsInRedis: APIGatewayProxyHandler = async () => {
  try {
    for (const chainId in tokenListDetails) {
      const redisKey = `tokenList:${chainId}`;
      const existingTokenListDetails = await redisClient.get(redisKey);

      if (!existingTokenListDetails) {
        tokenListDetails[chainId] = newToken;
        await redisClient.set(redisKey, JSON.stringify(tokenListDetails[chainId]));
      }
    }

    return formatJSONResponse({
      status: 200,
      message: 'added tokens in redis successfully',
    });
  } catch (error) {
    return formatJSONResponse({
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    });
  }
};

export const main = middyfy(storeTokenListDetailsInRedis);
