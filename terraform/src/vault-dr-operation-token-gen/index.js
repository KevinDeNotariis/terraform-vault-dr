const AWS = require("aws-sdk");
const got = require("got");

const DR_OPERATION_TOKEN_SECRET_NAME = process.env.DR_OPERATION_TOKEN_SECRET_NAME;
const DR_OPERATION_TOKEN_VAULT_ROLE_NAME = process.env.DR_OPERATION_TOKEN_VAULT_ROLE_NAME;
const AWS_AUTH_LAMBDA_NAME = process.env.AWS_AUTH_LAMBDA_NAME;
const AWS_AUTH_ROLE = process.env.AWS_AUTH_ROLE;
const VAULT_ENDPOINT = process.env.VAULT_ENDPOINT;

const lambda = new AWS.Lambda({
  region: process.env.AWS_REGION,
});

const secretsManager = new AWS.SecretsManager({
  region: process.env.AWS_REGION,
});

exports.handler = async (event, context) => {
  const token = await getVaultTokenFromLambda();

  const dr_token = await generateDRToken(token);

  try {
    await uploadTokenToSecretsManager(dr_token);
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      response: err,
    };
  }

  return {
    statusCode: 200,
    response: "DR Batch Token Created and uploaded sucessfully",
  };
};

const getVaultTokenFromLambda = async () => {
  console.log("Logging into Vault");
  const lambda_response = await lambda
    .invoke({
      FunctionName: AWS_AUTH_LAMBDA_NAME,
      Payload: JSON.stringify({
        vaultAWSAuthRole: AWS_AUTH_ROLE,
      }),
    })
    .promise();

  const response = JSON.parse(lambda_response.Payload);

  if (response.statusCode !== 200) {
    throw new Error(
      JSON.stringify({
        statusCode: response.statusCode,
        response: response,
      })
    );
  }

  console.log("  --> Token Retrieved");
  return response.body.token;
};

const generateDRToken = async (token) => {
  const apiVersion = "v1";
  const path = `auth/token/create/${DR_OPERATION_TOKEN_VAULT_ROLE_NAME}`;
  const body = { ttl: "8h" };

  const res = await got(`https://${VAULT_ENDPOINT}/${apiVersion}/${path}`, {
    method: "POST",
    headers: {
      "X-Vault-Token": token,
    },
    https: {
      rejectUnauthorized: false,
    },
    body: JSON.stringify(body),
  }).json();

  return res.auth.client_token;
};

const uploadTokenToSecretsManager = async (dr_token) => {
  const params = {
    SecretId: DR_OPERATION_TOKEN_SECRET_NAME,
    SecretString: JSON.stringify({ dr_token }),
  };

  const res = await secretsManager.putSecretValue(params).promise();

  return res;
};
