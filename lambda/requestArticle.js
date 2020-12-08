// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0


// Code modified from AWS WildRydes example for 474 Project. Modified by SM

const randomBytes = require('crypto').randomBytes;

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

var article;


exports.handler = (event, context, callback) => {
    if (!event.requestContext.authorizer) {
      errorResponse('Authorization not configured', context.awsRequestId, callback);
      return;
    }

    const requestId = toUrlString(randomBytes(16));
    console.log('Received event (', requestId, '): ', event);

    // Because we're using a Cognito User Pools authorizer, all of the claims
    // included in the authentication token are provided in the request context.
    // This includes the username as well as other attributes.
    const username = event.requestContext.authorizer.claims['cognito:username'];

    // The body field of the event in a proxy integration is a raw string.
    // In order to extract meaningful values, we need to first parse this string
    // into an object. A more robust implementation might inspect the Content-Type
    // header first and use a different parsing strategy based on that value.
    var requestBody = JSON.parse(event.body);

    var requestArticleId = requestBody.Article.Id;
  
    var articleParam = {
        TableName: 'Articles',
        Key: {'ArticleId': requestArticleId},
        ProjectionExpression: "ArticleId, Category, Title, Content, UserProfile",
        ReturnConsumedCapacity: "TOTAL"
    };

    getArticle(articleParam).then(() => {
        // You can use the callback function to provide a return value from your Node.js
        // Lambda functions. The first parameter is used for failed invocations. The
        // second parameter specifies the result data of the invocation.

        // Because this Lambda function is called by an API Gateway proxy integration
        // the result object must use the following structure.
        callback(null, {
            statusCode: 201,
            body: JSON.stringify({
                // Article: {
                //     Id: article.ArticleId,
                //     Title: article.Title,
                //     Content: article.Content
                // }
                article
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            contentType: 'json'
        });
    }).catch((err) => {
        console.error(err);

        // If there is an error during processing, catch it and return
        // from the Lambda function successfully. Specify a 500 HTTP status
        // code and provide an error message in the body. This will provide a
        // more meaningful error response to the end client.
        errorResponse(err.message, context.awsRequestId, callback)
    });
};


function getArticle(articleParam) {
    return ddb.get(articleParam, function(err, data){
        if (err){
            console.log("Error", err);
        }
        else{
            console.log("Success", data);
            article = data.Item;
            console.log("Test", article);

        }
    }).promise();
}

function toUrlString(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function errorResponse(errorMessage, awsRequestId, callback) {
  callback(null, {
    statusCode: 500,
    body: JSON.stringify({
      Error: errorMessage,
      Reference: awsRequestId,
    }),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
}