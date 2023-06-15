export default {
  type: 'object',
  properties: {
    name: { type: 'string' },
    queryStringParameters: {
      type: 'object',
      properties: {
        chainId: { type: 'string', enum: ['0', '1', '2', '3', '4', '5', '6'] },
      },
      additionalProperties: false,
    },
  },
  required: ['name'],
} as const;
