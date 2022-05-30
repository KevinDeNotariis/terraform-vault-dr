const AWS = require("aws-sdk");
const aws4 = require("aws4");
const request = require("got");

const VAULT_ENDPOINT = process.env.VAULT_ENDPOINT;

class awsSignedConfigs {
  constructor(args) {
    this.vaultHost = args.vaultHost;
    this.vaultAppName = args.vaultAppName;
    this.awsRequestUrl = "https://sts.amazonaws.com/";
    this.awsRequestBody = "Action=GetCallerIdentity&Version=2011-06-15";
  }
  getSignedRequest(creds) {
    let awsCreds = {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    };
    if (creds.sessionToken) {
      awsCreds.sessionToken = creds.sessionToken;
    }

    if (this.vaultHost) {
      var signedRequest = aws4.sign(
        {
          service: "sts",
          headers: { "X-Vault-AWS-IAM-Server-ID": this.vaultHost },
          body: this.awsRequestBody,
        },
        awsCreds
      );
    } else {
      var signedRequest = aws4.sign({ service: "sts", body: this.awsRequestBody }, awsCreds);
    }
    return signedRequest;
  }

  getSignedHeaders(creds) {
    let signedRequest = this.getSignedRequest(creds);
    let headers = signedRequest.headers;
    for (let header in headers) {
      if (typeof headers[header] === "number") {
        headers[header] = headers[header].toString();
      }
      headers[header] = [headers[header]];
    }
    return headers;
  }

  getSignedConfigs(creds) {
    let headers = this.getSignedHeaders(creds);

    return {
      role: this.vaultAppName,
      iam_http_request_method: "POST",
      iam_request_url: Buffer.from(this.awsRequestUrl).toString("base64"),
      iam_request_body: Buffer.from(this.awsRequestBody).toString("base64"),
      iam_request_headers: Buffer.from(JSON.stringify(headers)).toString("base64"),
    };
  }
}

class vaultAwsAuth {
  constructor(args) {
    this.vaultHost = args.vaultHost;
    this.vaultAppName = args.vaultAppName;
    this.followAllRedirects = args.followAllRedirects || true;
    this.port = args.port || 8200;
    this.apiVersion = args.apiVersion || "v1";
    this.vaultLoginUrl = args.vaultLoginUrl || "auth/aws/login";
    this.sslRejectUnAuthorized = args.sslRejectUnAuthorized || false;

    this.vaultLoginUrl = encodeURI(this.vaultLoginUrl);
    let urlPrefix = "https://";
    this.uri = urlPrefix + this.vaultHost + ":" + this.port + "/" + this.apiVersion + "/" + this.vaultLoginUrl;
  }

  getOptions(creds) {
    let awsLoginConfigs = new awsSignedConfigs({ vaultHost: this.vaultHost, vaultAppName: this.vaultAppName });
    let options = {
      url: this.uri,
      followAllRedirects: this.followAllRedirects,
      body: awsLoginConfigs.getSignedConfigs(creds),
      https: {
        rejectUnauthorized: this.sslRejectUnAuthorized,
      },
    };
    return options;
  }

  async authenticate() {
    const providerChain = new AWS.CredentialProviderChain();
    let creds = await providerChain.resolvePromise();
    let options = this.getOptions(creds);

    try {
      const response = await request(options.url, {
        json: options.body,
        method: "POST",
        https: options.https,
      });
      let result = JSON.parse(response.body);
      if (result.errors) {
        throw result;
      } else {
        return result;
      }
    } catch (error) {
      if (error.response) {
        let ex = new Error(error.message);
        ex.body = JSON.parse(error.response.body);
        throw ex;
      } else {
        throw error;
      }
    }
  }
}

exports.handler = async (event, context) => {
  const vaultClient = new vaultAwsAuth({
    vaultHost: VAULT_ENDPOINT,
    vaultAppName: event.vaultAWSAuthRole,
  });

  try {
    const success = await vaultClient.authenticate();

    return {
      statusCode: 200,
      body: {
        token: success.auth.client_token,
      },
    };
  } catch (ex) {
    console.log(ex);
    return {
      statusCode: 500,
      body: {
        error: {
          message: ex.message,
          body: ex.body,
        },
      },
    };
  }
};
