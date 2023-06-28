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
  OTHER = 8,
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

const retrieveTokenListDetailsFromRedis = async (key: ChainId) => {
  try {
    const redisKey = `tokenList:${key}`;
    const value = await redisClient.get(redisKey);
    if (value) {
      const tokenListDetails = JSON.parse(value);
      console.log(`Token list details retrieved from Redis for key ${key}`);
      return tokenListDetails;
    } else {
      console.log(`Token list details not found in Redis for key ${key}`);
      return null;
    }
  } catch (error) {
    console.error(`Failed to retrieve token list details from Redis for key ${key}:`, error);
    return null;
  }
};

export const storedetails: APIGatewayProxyHandler = async (event) => {
  const { chainId } = event.queryStringParameters as any;

  if (chainId !== undefined) {
    const selectedChainId = Number(chainId);
    const selectedTokenList = tokenListUrls.find((entry) => entry.key === selectedChainId);

    if (selectedTokenList) {
      const { url, key } = selectedTokenList;
      const chainName = ChainId[key];

      const storedTokenListDetails = await retrieveTokenListDetailsFromRedis(key);
      if (storedTokenListDetails) {
        return formatJSONResponse({
          message: 'Token list details retrieved successfully from Redis',
          data: {
            chainId: selectedChainId,
            chainName,
            allTokenListDetails: storedTokenListDetails,
          },
        });
      } else {
        const response = await axios.get(url);
        const allTokenListDetails = response.data;
        await storeTokenListDetailsInRedis(key, allTokenListDetails);
        return formatJSONResponse({
          message: 'Token list details retrieved successfully from Redis',
          data: {
            chainId: selectedChainId,
            chainName,
            allTokenListDetails,
          },
        });
      }
    } else if (selectedChainId === ChainId.OTHER) {
      const storedTokenListDetails = await retrieveTokenListDetailsFromRedis(selectedChainId);
      if (storedTokenListDetails) {
        return formatJSONResponse({
          message: 'Token list details retrieved successfully from Redis',
          data: {
            chainId: selectedChainId,
            chainName: ChainId[selectedChainId],
            allTokenListDetails: storedTokenListDetails,
          },
        });
      } else {
        const allTokenListDetails: any = {};
        for (const { url, key } of tokenListUrls) {
          const response = await axios.get(url);
          const tokenListDetails = response.data;
          allTokenListDetails[key] = tokenListDetails;
          await storeTokenListDetailsInRedis(key, tokenListDetails);
        }
        return formatJSONResponse({
          message: 'Token list details retrieved successfully from Redis',
          data: {
            chainId: selectedChainId,
            chainName: ChainId[selectedChainId],
            allTokenListDetails,
          },
        });
      }
    } else {
      return formatJSONResponse({
        message: `Token list details not found for chainId ${chainId}`,
        data: null,
      });
    }
  } else {
    const allTokenListDetails: any = {};
    for (const { url, key } of tokenListUrls) {
      const response = await axios.get(url);
      const tokenListDetails = response.data;
      allTokenListDetails[ChainId[key]] = tokenListDetails;
      await storeTokenListDetailsInRedis(key, tokenListDetails);
    }
    return formatJSONResponse({
      message: 'Token list details retrieved successfully from Redis',
      data: allTokenListDetails,
    });
  }
};

export const main = middyfy(storedetails);