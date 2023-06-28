import 'source-map-support/register';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { formatJSONResponse } from '@/libs/apiGateway';
import { middyfy } from '@/libs/lambda';
import axios from 'axios';

enum ChainId {
  SOLANA = 0,
  APTOS = 2,
  POLYGON = 1,
  BINANCE = 3,
  ETHEREUM = 4,
  KLAYTN = 5,
  FANTOM = 6,
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

const storeTokenListDetailsInRedis = async (key: ChainId, tokenListDetails: any) => {
  try {
    // Store token list details in Redis using the key
    console.log(`Token list details stored in Redis for key ${key}`);
  } catch (error) {
    console.error(`Failed to store token list details in Redis for key ${key}:`, error);
  }
};

const fetchAllTokenListDetails = async () => {
  for (const { url, key } of tokenListUrls) {
    try {
      const response = await axios.get(url);
      const tokenListDetails = response.data;
      await storeTokenListDetailsInRedis(key, tokenListDetails);
      console.log(`Token list details for URL ${url} stored in Redis.`);
    } catch (error) {
      console.error(`Failed to fetch or store token list details from URL ${url}:`, error);
    }
  }
};

export const storedetails: APIGatewayProxyHandler = async (event) => {
  const { chainId } = event.queryStringParameters as any;
  let chainName: string;

  for (const { url, key } of tokenListUrls) {
    if (Number(chainId) === key) {
      chainName = ChainId[key];
      try {
        const response = await axios.get(url);
        const storeddetails = response.data;
        await storeTokenListDetailsInRedis(chainId, storeddetails);
        console.log(`Token list details retrieved from Redis for URL ${url}`);
        return formatJSONResponse({
          message: 'Token list details retrieved successfully from Redis',
          data: {
            chainId: key,
            chainName,
            storeddetails,
            newTokenProperties,
             

          },
        });
      } catch (error) {
        console.error(`Failed to fetch data for URL ${url}:`, error);
      }
    }
  }
};

export const main = middyfy(storedetails);

// Call the function to fetch all token list details
fetchAllTokenListDetails();

// New token properties
const newTokenProperties = {
  address: '0x1234567890', // Replace with the actual address
  chainId: 7, // Replace with the appropriate chainId
  symbol: 'NTK', // Replace with the symbol
  logoURI: 'https://example.com/new-token.png', // Replace with the actual logo URI
  coingecko_id: 'new-token', // Replace with the actual Coingecko ID
  decimals: 18, // Replace with the appropriate number of decimals
};

// Call the function to add the new token to all chainIds
addNewTokenToAllChainIds(newTokenProperties);

async function addNewTokenToAllChainIds(newTokenProperties: any) {
  for (const { key } of tokenListUrls) {
    try {
      const response = await axios.get(tokenListUrls[key].url);
      const tokenListDetails = response.data;

      if (tokenListDetails) {
        const newToken = { ...newTokenProperties };
        tokenListDetails.tokens.push(newToken);
        await storeTokenListDetailsInRedis(key, tokenListDetails);
        console.log(`New token added to token list for chainId ${key}`);
      } else {
        console.error(`Token list details not found for chainId ${key}`);
      }
    } catch (error) {
      console.error(`Failed to add new token to token list for chainId ${key}:`, error);
    }
  }
}

