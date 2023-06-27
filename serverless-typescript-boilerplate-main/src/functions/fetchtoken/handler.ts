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

const fetchTokenListDetails = async (url: string) => {
  try {
    const response = await axios.get(url);
    const tokenListDetails = response.data;
    const transformedDetails = tokenListDetails.map((value: any) => ({
      address: value.address,
      chainId: value.chainId,
      symbol: value.symbol,
      logoURI: value.logoURI,
      coingecko_id: value.coingeckoId,
      decimals: value.decimals,
    }));
    console.log(`Token list details for URL ${url}:`, transformedDetails);
    return transformedDetails;
  } catch (error) {
    console.error(`Failed to fetch token list details from URL ${url}:`, error);
    return null;
  }
};

export const fetchToken: APIGatewayProxyHandler = async (event) => {
  const { chainId } = event.queryStringParameters as any;
  let chainName: string;
  

  for (const { url, key } of tokenListUrls) {
    if (Number(chainId) === key) {
      chainName = ChainId[key];
      try {
        const tokenListDetails = await fetchTokenListDetails(url);
        console.log(`Token list details for URL ${url}:`, tokenListDetails);

        return formatJSONResponse({
          message: 'Token list details retrieved successfully',
          data: {
            chainId,
            chainName,
            tokenListDetails,
          },
        });
      } catch (error) {
        console.error(`Failed to fetch data for URL ${url}:`, error);
      }
    }
  }

  console.error(`Token list details for chainId ${chainId} not found`);
  return formatJSONResponse({
    message: `Token list details for chainId ${chainId} not found`,
    data: null,
  });
};

export const main = middyfy(fetchToken);
