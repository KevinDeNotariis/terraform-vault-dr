const got = require("got");

class DrOperations {
  constructor({ token, apiVersion = "v1", cluster_1, cluster_2 }) {
    this.token = token;
    this.apiVersion = apiVersion;
    this.cluster_1 = cluster_1;
    this.cluster_2 = cluster_2;
  }

  async isEndpointPrimary({ endpoint }) {
    const drSecondaryCode = 333;
    const path = `sys/health?drsecondarycode=${drSecondaryCode}&perfstandbyok=true`;
    const url = `https://${endpoint}/${this.apiVersion}/${path}`;

    try {
      const res = await got(url, {
        method: "GET",
      });
      return res.statusCode !== drSecondaryCode;
    } catch (err) {
      if (err.response.statusCode === drSecondaryCode) {
        return false;
      }
      throw err;
    }
  }

  async setPrimaryAndSecondaryEndpoints() {
    console.log("Inferring and setting which endpoint is the real primary and secondary");
    try {
      this.primaryEndpoint = (await this.isEndpointPrimary({ endpoint: this.cluster_1 }))
        ? this.cluster_1
        : this.cluster_2;
      console.log(`  --> Primary ${this.primaryEndpoint}`);
    } catch (err) {
      console.log(`${this.cluster_1} is down, setting ${this.cluster_2} as current secondary to be promoted`);
      try {
        // Before setting the cluster_2 as secondary, we need to make sure that it is alive
        await this.isEndpointPrimary({ endpoint: this.cluster_2 });
      } catch (err) {
        console.log(`${this.cluster_2} also seems to not be reachable`);
        throw err;
      }
      this.primaryEndpoint = this.cluster_1;
      this.secondaryEndpoint = this.cluster_2;
    }

    // If we checked the REAL primary and it is alive, then we need to check the secondary to ensure
    // that it is alive too, otherwise we might demote the primary without promoting the secondary
    if (this.primaryEndpoint === this.cluster_1) {
      try {
        await this.isEndpointPrimary({ endpoint: this.cluster_2 });
      } catch (err) {
        // If the secondary is down, we throw an error.. something is wrong.
        console.log(err);
        throw err;
      }
    }

    this.secondaryEndpoint = this.primaryEndpoint === this.cluster_1 ? this.cluster_2 : this.cluster_1;

    console.log(`  --> Secondary ${this.secondaryEndpoint}`);
  }

  async enableReplication({ endpoint }) {
    console.log(`Enabling Replication in endpoint: ${endpoint}`);
    const url = `https://${endpoint}/${this.apiVersion}/sys/replication/dr/primary/enable`;

    try {
      const res = await got(url, {
        method: "POST",
        headers: {
          "X-Vault-Token": this.token,
        },
      }).json();

      console.log("  --> Replication Enabled");
      return res;
    } catch (err) {
      throw err;
    }
  }

  async revokeSecondaryToken({ endpoint, secondaryId }) {
    console.log(`Revoking secondary token with id: ${secondaryId}`);
    const url = `https://${endpoint}/${this.apiVersion}/sys/replication/dr/primary/revoke-secondary`;
    const body = { id: secondaryId };

    try {
      const res = await got(url, {
        method: "POST",
        headers: {
          "X-Vault-Token": this.token,
        },
        body: JSON.stringify(body),
      }).json();

      console.log("  --> Secondary token revoked");
      return res;
    } catch (err) {
      throw err;
    }
  }

  async promoteEndpoint({ endpoint }) {
    console.log(`Promoting cluster ${endpoint}`);
    const url = `https://${endpoint}/${this.apiVersion}/sys/replication/dr/secondary/promote`;
    const body = { dr_operation_token: this.token };

    try {
      const res = await got(url, {
        method: "POST",
        headers: {
          "X-Vault-Token": this.token,
        },
        body: JSON.stringify(body),
      }).json();

      console.log("  --> Cluster Promoted");
      return res;
    } catch (err) {
      console.log("Error in promoting cluster");
      throw err;
    }
  }

  async demoteEndpoint({ endpoint }) {
    console.log(`Demoting cluster ${endpoint}`);
    const url = `https://${endpoint}/${this.apiVersion}/sys/replication/dr/primary/demote`;

    try {
      const res = await got(url, {
        method: "POST",
        headers: {
          "X-Vault-Token": this.token,
        },
      }).json();

      console.log("  --> Cluster Demoted");
      return res;
    } catch (err) {
      console.log("Error in demoting cluster");
      throw err;
    }
  }

  async demotePrimaryAndPromoteSecondary({ primaryEndpoint, secondaryEndpoint }) {
    const res = {};
    try {
      res.demotion = await this.demoteEndpoint({ endpoint: primaryEndpoint });
    } catch (err) {
      res.demotion = {
        error: err,
      };
    }
    try {
      res.promotion = await this.promoteEndpoint({ endpoint: secondaryEndpoint });
      return res;
    } catch (err) {
      throw err;
    }
  }

  async autoDemotePrimaryAndPromoteSecondary() {
    try {
      await this.setPrimaryAndSecondaryEndpoints();
    } catch (err) {
      throw err;
    }

    const res = {};
    try {
      res.demotion = await this.demoteEndpoint({ endpoint: this.primaryEndpoint });
    } catch (err) {
      res.demotion = {
        error: err,
      };
    }
    try {
      res.promotion = await this.promoteEndpoint({ endpoint: this.secondaryEndpoint });
      return res;
    } catch (err) {
      throw err;
    }
  }

  async generateAndReturnSecondaryToken({ endpoint, secondaryId }) {
    console.log(`Generating Secondary Token with id: ${secondaryId}`);
    const url = `https://${endpoint}/${this.apiVersion}/sys/replication/dr/primary/secondary-token`;
    const body = { id: secondaryId };

    try {
      const res = await got(url, {
        method: "POST",
        headers: {
          "X-Vault-Token": this.token,
        },
        body: JSON.stringify(body),
      }).json();

      console.log("  --> Token generated");
      return res.wrap_info.token;
    } catch (err) {
      throw err;
    }
  }

  async updatePrimary({ secondaryEndpoint, primaryEndpoint, secondaryToken }) {
    console.log("Updating Primary in the Secondary cluster using the secondary token");
    const url = `https://${secondaryEndpoint}/${this.apiVersion}/sys/replication/dr/secondary/update-primary`;
    const body = {
      dr_operation_token: this.token,
      primary_api_addr: `https://${primaryEndpoint}`,
      token: secondaryToken,
    };

    try {
      const res = await got(url, {
        method: "POST",
        headers: {
          "X-Vault-Token": this.token,
        },
        body: JSON.stringify(body),
      }).json();

      console.log("  --> Assigned Primary to the Secondary correctly updated");
      return res;
    } catch (err) {
      throw err;
    }
  }

  async autoGenerateSecondaryTokenAndUpdateInSecondary({ secondaryId }) {
    try {
      await this.setPrimaryAndSecondaryEndpoints();
    } catch (err) {
      throw err;
    }

    try {
      await this.enableReplication({ endpoint: this.primaryEndpoint });
    } catch (err) {
      console.log("  --> Replication is already enabled");
    }
    try {
      await this.revokeSecondaryToken({ endpoint: this.primaryEndpoint, secondaryId });
    } catch (err) {
      console.log("  --> Secondary token does not exist");
    }

    try {
      const secondaryToken = await this.generateAndReturnSecondaryToken({
        endpoint: this.primaryEndpoint,
        secondaryId,
      });
      const res = await this.updatePrimary({
        secondaryEndpoint: this.secondaryEndpoint,
        primaryEndpoint: this.primaryEndpoint,
        secondaryToken,
      });

      return res;
    } catch (err) {
      throw err;
    }
  }

  async generateSecondaryTokenAndUpdateInSecondary({ primaryEndpoint, secondaryEndpoint, secondaryId }) {
    try {
      await this.enableReplication({ endpoint: primaryEndpoint });
    } catch (err) {
      console.log("  --> Replication is already enabled");
    }
    try {
      await this.revokeSecondaryToken({ endpoint: primaryEndpoint, secondaryId });
    } catch (err) {
      console.log("  --> Secondary token does not exist");
    }

    try {
      const secondaryToken = await this.generateAndReturnSecondaryToken({
        endpoint: primaryEndpoint,
        secondaryId,
      });
      const res = await this.updatePrimary({
        secondaryEndpoint: secondaryEndpoint,
        primaryEndpoint: primaryEndpoint,
        secondaryToken,
      });

      return res;
    } catch (err) {
      throw err;
    }
  }

  async demoteAndPromotePlusLink({ secondaryId }) {
    return new Promise(async (resolve, reject) => {
      const res = {};
      try {
        res.demoteAndPromote = await this.autoDemotePrimaryAndPromoteSecondary({});
      } catch (err) {
        reject(err);
      }
      const newPrimary = this.secondaryEndpoint;
      const newSecondary = this.primaryEndpoint;

      console.log("\nWaiting 10 seconds...\n");
      setTimeout(async () => {
        try {
          res.link = await this.generateSecondaryTokenAndUpdateInSecondary({
            secondaryId,
            primaryEndpoint: newPrimary,
            secondaryEndpoint: newSecondary,
          });
          resolve(res);
        } catch (err) {
          reject(err);
        }
      }, 10000);
    });
  }
}

module.exports = DrOperations;
