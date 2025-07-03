const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.REGION || 'eu-west-1'
});

const TABLE_NAME = process.env.STORAGE_TDDPROJECT_NAME || 'tddproject';

/**
 * Ajoute un utilisateur dans DynamoDB
 * @param {string} userId - L'identifiant de l'utilisateur
 * @param {Object} userData - Les données de l'utilisateur
 * @returns {Promise<Object>} - Résultat de l'opération
 */
async function addUser(userId, userData) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const item = {
    user: userId,
    ...userData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const params = {
    TableName: TABLE_NAME,
    Item: item,
    ConditionExpression: 'attribute_not_exists(#user)',
    ExpressionAttributeNames: {
      '#user': 'user'
    }
  };

  try {
    await dynamodb.put(params).promise();
    return {
      success: true,
      message: 'User created successfully',
      user: item
    };
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      throw new Error('User already exists');
    }
    console.error('Error adding user:', error);
    throw new Error('Failed to add user');
  }
}

/**
 * Récupère un utilisateur depuis DynamoDB
 * @param {string} userId - L'identifiant de l'utilisateur
 * @returns {Promise<Object>} - L'utilisateur trouvé
 */
async function getUser(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      user: userId
    }
  };

  try {
    const result = await dynamodb.get(params).promise();
    
    if (!result.Item) {
      throw new Error('User not found');
    }

    return {
      success: true,
      user: result.Item
    };
  } catch (error) {
    if (error.message === 'User not found') {
      throw error;
    }
    console.error('Error getting user:', error);
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
  if (!userId) {
    throw new Error('User ID is required');
  }

  const updateExpression = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  Object.keys(updateData).forEach((key, index) => {
    updateExpression.push(`#attr${index} = :val${index}`);
    expressionAttributeNames[`#attr${index}`] = key;
    expressionAttributeValues[`:val${index}`] = updateData[key];
  });

  updateExpression.push(`#updatedAt = :updatedAt`);
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  const params = {
    TableName: TABLE_NAME,
    Key: {
      user: userId
    },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: 'attribute_exists(#user)',
    ReturnValues: 'ALL_NEW'
  };

  expressionAttributeNames['#user'] = 'user';

  try {
    const result = await dynamodb.update(params).promise();
    return {
      success: true,
      message: 'User updated successfully',
      user: result.Attributes
    };
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      throw new Error('User not found');
    }
    console.error('Error updating user:', error);
    throw new Error('Failed to update user');
  }
}

/**
 * Handler principal de la fonction Lambda
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  try {
    if (event.Records) {
      for (const record of event.Records) {
        console.log('DynamoDB Record:', JSON.stringify(record, null, 2));
        
        if (record.eventName === 'INSERT') {
          console.log('New user created:', record.dynamodb.NewImage);
        } else if (record.eventName === 'MODIFY') {
          console.log('User updated:', record.dynamodb.NewImage);
        } else if (record.eventName === 'REMOVE') {
          console.log('User deleted:', record.dynamodb.OldImage);
        }
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'DynamoDB trigger processed successfully',
          processedRecords: event.Records.length
        })
      };
    }

    const { action, userId, userData } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'addUser':
        const addResult = await addUser(userId, userData);
        return {
          statusCode: 201,
          body: JSON.stringify(addResult)
        };

      case 'getUser':
        const getResult = await getUser(userId);
        return {
          statusCode: 200,
          body: JSON.stringify(getResult)
        };

      case 'updateUser':
        const updateResult = await updateUser(userId, userData);
        return {
          statusCode: 200,
          body: JSON.stringify(updateResult)
        };

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Invalid action. Supported actions: addUser, getUser, updateUser'
          })
        };
    }

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};

module.exports = {
  handler: exports.handler,
  addUser,
  getUser,
  updateUser
};
