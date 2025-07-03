/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_TDDPROJECT_ARN
	STORAGE_TDDPROJECT_NAME
	STORAGE_TDDPROJECT_STREAMARN
Amplify Params - DO NOT EDIT */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.REGION || 'eu-west-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.STORAGE_TDDPROJECT_NAME || 'tddproject-dev';

const logger = {
  info: (message, data = {}) => console.log(JSON.stringify({ level: 'INFO', message, timestamp: new Date().toISOString(), ...data })),
  error: (message, error = {}) => console.error(JSON.stringify({ level: 'ERROR', message, timestamp: new Date().toISOString(), error: error.message || error })),
  warn: (message, data = {}) => console.warn(JSON.stringify({ level: 'WARN', message, timestamp: new Date().toISOString(), ...data }))
};

/**
 * Valide les données utilisateur
 * @param {Object} userData - Les données de l'utilisateur à valider
 * @returns {Array} - Tableau des erreurs de validation
 */
function validateUserData(userData) {
  const errors = [];
  
  if (!userData.name || typeof userData.name !== 'string' || userData.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }
  
  if (userData.name && userData.name.length > 255) {
    errors.push('Name must be less than 256 characters');
  }
  
  if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email.trim())) {
    errors.push('Invalid email format');
  }
  
  if (userData.email && userData.email.length > 255) {
    errors.push('Email must be less than 256 characters');
  }
  
  if (userData.age !== undefined && (!Number.isInteger(userData.age) || userData.age < 0 || userData.age > 150)) {
    errors.push('Age must be a positive integer between 0 and 150');
  }
  
  if (userData.phone) {
    const cleanPhone = userData.phone.replace(/[\s\-\(\)]/g, '');
    if (!/^[\+]?[0-9]{7,15}$/.test(cleanPhone)) {
      errors.push('Invalid phone number format');
    }
  }
  
  return errors;
}

/**
 * Ajoute un utilisateur dans DynamoDB
 * @param {string} userId - L'identifiant de l'utilisateur
 * @param {Object} userData - Les données de l'utilisateur
 * @returns {Promise<Object>} - Résultat de l'opération
 */
async function addUser(userId, userData) {
  logger.info('Starting addUser operation', { userId, userDataKeys: Object.keys(userData) });
  
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    const error = new Error('User ID is required and must be a non-empty string');
    logger.error('Invalid userId provided', { userId, error });
    throw error;
  }

  const validationErrors = validateUserData(userData);
  if (validationErrors.length > 0) {
    const error = new Error(`Validation failed: ${validationErrors.join(', ')}`);
    logger.error('User data validation failed', { userId, validationErrors, error });
    throw error;
  }

  const item = {
    user: userId.trim(),
    name: userData.name.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (userData.email) {
    item.email = userData.email.trim().toLowerCase();
  }
  
  if (userData.age !== undefined) {
    item.age = userData.age;
  }
  
  if (userData.phone) {
    item.phone = userData.phone;
  }

  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: item,
    ConditionExpression: 'attribute_not_exists(#user)',
    ExpressionAttributeNames: {
      '#user': 'user'
    }
  });

  try {
    logger.info('Attempting to create user in DynamoDB', { userId, tableName: TABLE_NAME });
    await dynamodb.send(command);
    
    logger.info('User created successfully', { userId, createdAt: item.createdAt });
    return {
      success: true,
      message: 'User created successfully',
      user: item
    };
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      const userExistsError = new Error('User already exists');
      logger.warn('Attempt to create existing user', { userId, error: userExistsError });
      throw userExistsError;
    }
    logger.error('Failed to create user in DynamoDB', { userId, error });
    throw new Error('Failed to add user');
  }
}

/**
 * Récupère un utilisateur depuis DynamoDB
 * @param {string} userId - L'identifiant de l'utilisateur
 * @returns {Promise<Object>} - L'utilisateur trouvé
 */
async function getUser(userId) {
  logger.info('Starting getUser operation', { userId });
  
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    const error = new Error('User ID is required and must be a non-empty string');
    logger.error('Invalid userId provided for getUser', { userId, error });
    throw error;
  }

  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      user: userId.trim()
    }
  });

  try {
    logger.info('Attempting to retrieve user from DynamoDB', { userId, tableName: TABLE_NAME });
    const result = await dynamodb.send(command);
    
    if (!result.Item) {
      const error = new Error('User not found');
      logger.warn('User not found in database', { userId, error });
      throw error;
    }

    logger.info('User retrieved successfully', { userId, userExists: true });
    return {
      success: true,
      user: result.Item
    };
  } catch (error) {
    if (error.message === 'User not found') {
      throw error;
    }
    logger.error('Failed to retrieve user from DynamoDB', { userId, error });
    throw new Error('Failed to get user');
  }
}

/**
 * Met à jour un utilisateur existant
 * @param {string} userId - L'identifiant de l'utilisateur
 * @param {Object} updateData - Les données à mettre à jour
 * @returns {Promise<Object>} - Résultat de l'opération
 */
async function updateUser(userId, updateData) {
  logger.info('Starting updateUser operation', { userId, updateDataKeys: Object.keys(updateData) });
  
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    const error = new Error('User ID is required and must be a non-empty string');
    logger.error('Invalid userId provided for updateUser', { userId, error });
    throw error;
  }

  const validationErrors = validateUserData(updateData);
  if (validationErrors.length > 0) {
    const error = new Error(`Validation failed: ${validationErrors.join(', ')}`);
    logger.error('Update data validation failed', { userId, validationErrors, error });
    throw error;
  }

  const cleanUpdateData = { ...updateData };
  if (cleanUpdateData.name) {
    cleanUpdateData.name = cleanUpdateData.name.trim();
  }
  if (cleanUpdateData.email) {
    cleanUpdateData.email = cleanUpdateData.email.trim().toLowerCase();
  }

  const updateExpression = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  Object.keys(cleanUpdateData).forEach((key, index) => {
    updateExpression.push(`#attr${index} = :val${index}`);
    expressionAttributeNames[`#attr${index}`] = key;
    expressionAttributeValues[`:val${index}`] = cleanUpdateData[key];
  });

  updateExpression.push(`#updatedAt = :updatedAt`);
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      user: userId.trim()
    },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: 'attribute_exists(#user)',
    ReturnValues: 'ALL_NEW'
  });

  expressionAttributeNames['#user'] = 'user';

  try {
    logger.info('Attempting to update user in DynamoDB', { userId, tableName: TABLE_NAME });
    const result = await dynamodb.send(command);
    
    logger.info('User updated successfully', { userId, updatedAt: expressionAttributeValues[':updatedAt'] });
    return {
      success: true,
      message: 'User updated successfully',
      user: result.Attributes
    };
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      const userNotFoundError = new Error('User not found');
      logger.warn('Attempt to update non-existent user', { userId, error: userNotFoundError });
      throw userNotFoundError;
    }
    logger.error('Failed to update user in DynamoDB', { userId, error });
    throw new Error('Failed to update user');
  }
}

/**
 * Handler principal de la fonction Lambda
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || 'unknown';
  logger.info('Lambda handler started', { requestId, eventType: event.Records ? 'DynamoDB' : 'API' });

  try {
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
        },
        body: ''
      };
    }

    if (event.Records) {
      logger.info('Processing DynamoDB trigger event', { recordCount: event.Records.length, requestId });
      
      for (const record of event.Records) {
        logger.info('Processing DynamoDB record', { 
          eventName: record.eventName, 
          userId: record.dynamodb.Keys?.user?.S,
          requestId 
        });
        
        if (record.eventName === 'INSERT') {
          logger.info('New user created via DynamoDB trigger', { 
            userId: record.dynamodb.Keys?.user?.S,
            requestId 
          });
        } else if (record.eventName === 'MODIFY') {
          logger.info('User updated via DynamoDB trigger', { 
            userId: record.dynamodb.Keys?.user?.S,
            requestId 
          });
        } else if (record.eventName === 'REMOVE') {
          logger.info('User deleted via DynamoDB trigger', { 
            userId: record.dynamodb.Keys?.user?.S,
            requestId 
          });
        }
      }
      
      logger.info('DynamoDB trigger processing completed', { 
        processedRecords: event.Records.length, 
        requestId 
      });
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
        },
        body: JSON.stringify({
          message: 'DynamoDB trigger processed successfully',
          processedRecords: event.Records.length,
          requestId
        })
      };
    }

    const { action, userId, userData } = JSON.parse(event.body || '{}');
    logger.info('Processing API request', { action, userId: userId ? 'provided' : 'missing', requestId });

    switch (action) {
      case 'addUser':
        logger.info('Executing addUser action', { userId, requestId });
        const addResult = await addUser(userId, userData);
        return {
          statusCode: 201,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
          },
          body: JSON.stringify(addResult)
        };

      case 'getUser':
        logger.info('Executing getUser action', { userId, requestId });
        const getResult = await getUser(userId);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
          },
          body: JSON.stringify(getResult)
        };

      case 'updateUser':
        logger.info('Executing updateUser action', { userId, requestId });
        const updateResult = await updateUser(userId, userData);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
          },
          body: JSON.stringify(updateResult)
        };

      default:
        logger.warn('Invalid action requested', { action, requestId });
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
          },
          body: JSON.stringify({
            error: 'Invalid action. Supported actions: addUser, getUser, updateUser',
            requestId
          })
        };
    }

  } catch (error) {
    logger.error('Lambda handler error', { error, requestId });
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
      },
      body: JSON.stringify({
        error: error.message,
        requestId
      })
    };
  }
};

module.exports = {
  handler: exports.handler,
  addUser,
  getUser,
  updateUser,
  validateUserData
};
