import 'source-map-support/register';

import type { ValidatedEventAPIGatewayProxyEvent } from '@/libs/apiGateway';
import { formatJSONResponse } from '@/libs/apiGateway';
import { middyfy } from '@/libs/lambda';

import schema from './schema';
import axios from 'axios';
 import Redis from 'ioredis';

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
  

const fetchtoken: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event,
) => {
    let redisClient = createClient()
    redisClient.connect().then(()=>{
    console.log("connected")
}).catch(console.error)

 const tokenListUrls = [
  
   'https://cache.jup.ag/tokens' ,
    'https://raw.githubusercontent.com/hippospace/aptos-coin-list/main/typescript/src/defaultList.mainnet.json',
    'https://raw.githubusercontent.com/0xAnto/token-lists/main/polygon.json',
    'https://raw.githubusercontent.com/0xAnto/token-lists/main/bsc.json',
    'https://raw.githubusercontent.com/0xAnto/token-lists/main/ethereum.json',
    'https://raw.githubusercontent.com/0xAnto/token-lists/main/klaytn.json',
    'https://raw.githubusercontent.com/0xAnto/token-lists/main/fantom.json',
  ]
  const tokenListUrls_ = [
    { url: 'https://cache.jup.ag/tokens', key: ChainId.SOLANA },
    { url: 'https://raw.githubusercontent.com/hippospace/aptos-coin-list/main/typescript/src/defaultList.mainnet.json', key: ChainId.APTOS },
    { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/polygon.json', key: ChainId.POLYGON },
    { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/bsc.json', key: ChainId.BINANCE },
    { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/ethereum.json', key: ChainId.ETHEREUM },
    { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/klaytn.json', key: ChainId.KLAYTN },
    { url: 'https://raw.githubusercontent.com/0xAnto/token-lists/main/fantom.json', key: ChainId.FANTOM },
  ];
  
    
  // Function to fetch token list details from a specific URL
  async function fetchTokenListDetails(url: any) {
    try {
      const response = await axios.get(url);
      const tokenListDetails = response.data;
      const transformeddetails = tokenListDetails.map((value: any )=>{
        
        return {
          address: value.address,
          chainId:value.chainId,
          symbol:value.symbol,
          logoURI:value.logoURI,
          coingecko_id:value.coingeckoId,
          decimals:value.decimals,
          

        }
      })
      

            console.log(`Token list details for URL ${url}:`, transformeddetails);
            return transformeddetails; 
          } catch (error) {
            console.error(`Failed to fetch token list details from URL ${url}:`, error);
            return null; 
          }
        }
        


//   // Fetch token list details from a specific URL and store in Redis
async function fetchAndStoreTokenListDetails(list: { url: string, key: ChainId }) {

  const tokenListDetails = await fetchTokenListDetails(list.url);
  if (tokenListDetails) {
    await storeTokenListDetailsInRedis(list.key, tokenListDetails);
  } else {
    console.log(Error)
  }
}
    


// // Store token list details in Redis
async function storeTokenListDetailsInRedis(key: ChainId, tokenListDetails: any) {
  try {
    const redisKey = `tokenList:${key}`;

    const value = JSON.stringify(tokenListDetails);
    await redisClient.set(redisKey, value)
     
  } catch (error) {
    console.error(`Failed to store token list details for key ${key} in Redis:`, error);
  }

  }




// // Fetch all token list details and store in Redis
async function fetchAllTokenListDetails(arg : ChainId) {
  
    for (let i = 0; i < tokenListUrls_.length; i++) {
    await fetchAndStoreTokenListDetails(tokenListUrls_[i]);
if (arg === tokenListUrls_[i].key) {
  try {
    const response = await axios.get(tokenListUrls_[i].url);
    console.log(`Response for URL ${tokenListUrls_[i].url}:`, response.data);
  } catch (error) {
    console.error(`Failed to fetch data for URL ${tokenListUrls_[i].url}:`, error);
  }
}
}
}

//       
 fetchAllTokenListDetails(ChainId.POLYGON);

 // Retrieve token list details from Redis
async function retrieveTokenListDetailsFromRedis(key: ChainId) {
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
}

// Example usage
retrieveTokenListDetailsFromRedis(ChainId.POLYGON);

 



  
  return formatJSONResponse({
    message: 200,
    event,
  });
};

export const main = middyfy(fetchtoken);
