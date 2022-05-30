const AWS = require("aws-sdk");
const DrOperations = require("./DrOperations");

const DR_OPERATION_TOKEN_SECRET_NAME = process.env.DR_OPERATION_TOKEN_SECRET_NAME;

const secretsManager = new AWS.SecretsManager({ region: process.env.AWS_REGION });

exports.handler = async (event, context) => {
  try {
    const token = await getTokenFromSecretsManager();

    const drOperations = new DrOperations({
      token: token,
      apiVersion: "v1",
      cluster_1: process.env.ENDPOINT_CLUSTER_1,
      cluster_2: process.env.ENDPOINT_CLUSTER_2,
    });
    let res;
    switch (event.operation) {
      case "disaster_recovery":
        const secondaryId = event.secondaryId || "dr-secondary";
        res = await drOperations.demoteAndPromotePlusLink({ secondaryId });
        break;
      default:
        throw new Error(`No action for operation '${event.operation}' found`);
    }

    return {
      statusCode: 200,
      body: res,
    };
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const getTokenFromSecretsManager = async () => {
  const params = { SecretId: DR_OPERATION_TOKEN_SECRET_NAME };
  const res = await secretsManager.getSecretValue(params).promise();

  return JSON.parse(res.SecretString)[Object.keys(JSON.parse(res.SecretString))[0]];
};
