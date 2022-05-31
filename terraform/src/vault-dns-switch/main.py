import os
import boto3
import logging
import requests

from requests.packages.urllib3.exceptions import InsecureRequestWarning

# Setup logger objects
logging.basicConfig()
logger = logging.getLogger(__name__)

requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

ENDPOINT_CLUSTER_1 = os.getenv("ENDPOINT_CLUSTER_1")
ENDPOINT_CLUSTER_2 = os.getenv("ENDPOINT_CLUSTER_2")
HOSTED_ZONE_NAME = os.getenv("HOSTED_ZONE_NAME")
VAULT_ENDPOINT = os.getenv("VAULT_ENDPOINT")

route53 = boto3.client('route53')


def lambda_handler(event, contex):
    """
    Switching DNS weights between Real Primary and Real Secondart
    """

    if 'log_level' in event and event['log_level'] == 'DEBUG':
        logger.setLevel(logging.DEBUG)
    else:
        logger.setLevel(logging.INFO)

    try:
        primary_endpoint = get_primary()
        logger.info(f"NEW Primary Endpoint --> {primary_endpoint}")

        secondary_endpoint = ENDPOINT_CLUSTER_1 if primary_endpoint == ENDPOINT_CLUSTER_2 else ENDPOINT_CLUSTER_2
        logger.info(f"NEW secondary Endpoint --> {secondary_endpoint}")

        hosted_zone_id = get_hosted_zone_id()

        switch_dns_weights(
            primary_endpoint, secondary_endpoint, hosted_zone_id)

    except Exception as e:
        logger.error(e)
        raise e


def get_primary():
    """
    Returns the NEW Primary Cluster
    """

    primary = ""
    for cluster in (ENDPOINT_CLUSTER_1, ENDPOINT_CLUSTER_2):
        logger.info(f"Checking endpoint {cluster}")
        try:
            primary = check_endpoint(cluster)

            if primary != "":
                return primary
        except Exception as e:
            logger.info(
                f"Something happened when checking endpoint {cluster}")
            logger.error(e)

    raise Exception("No endpoint responded as Primary or responded at all")


def check_endpoint(endpoint):
    endpoint_response_code = requests.get(
        f"https://{endpoint}/v1/sys/health",
        params="perfstandbyok=true",
        verify=False,
        timeout=5
    ).status_code

    if endpoint_response_code == 200:
        # Endpoint responds as primary
        logger.info(
            f"Endpoint {endpoint} responds as Primary - Status Code: {endpoint_response_code}")
        return endpoint
    elif endpoint_response_code == 472:
        # Endpoint responds as DR / Standby
        logger.info(
            f"Endpoint {endpoint} responds as DR - Status Code: {endpoint_response_code}")
    else:
        # Error code or status unknown
        logger.info(
            f"Unknown response from Vault endpoint {endpoint} - Status Code: {endpoint_response_code}")
        logger.info("Cluster is probabily down")

    return ""


def get_hosted_zone_id():
    """
    Return the Hosted Zone ID for the HOSTED_ZONE_NAME
    """
    logger.info("Looking for Hosted Zones")
    hosted_zones = route53.list_hosted_zones()['HostedZones']

    logger.debug(f"Found following hosted zones: {hosted_zones}")

    for zone in hosted_zones:
        if HOSTED_ZONE_NAME in zone['Name']:
            hosted_zone_id = zone['Id'].strip('/hostedzone/')
            logger.info("Found hosted zone id")
            logger.debug(
                f"Found hosted zone id {hosted_zone_id} for {HOSTED_ZONE_NAME}")
            return hosted_zone_id


def switch_dns_weights(primary_endpoint, secondary_endpoint, hosted_zone_id):
    """
    Switch the Weights for the primary and secondary clusters
    """
    try:
        # Take to 0 the weight for the secondary_endpoint AKA the OLD primary
        response = route53.change_resource_record_sets(
            ChangeBatch={
                'Changes': [
                    {
                        'Action': 'UPSERT',
                        'ResourceRecordSet': {
                            'Name': VAULT_ENDPOINT,
                            'Type': 'CNAME',
                            'Weight': 0,
                            'SetIdentifier': f'vault-{"dr" if secondary_endpoint.find("-dr") != -1 else "primary"}',
                            'AliasTarget': {
                                'HostedZoneId': hosted_zone_id,
                                'DNSName': secondary_endpoint,
                                'EvaluateTargetHealth': False,
                            }
                        }
                    }
                ],
                'Comment': f'Weight of endpoint {secondary_endpoint} set to 0'
            },
            HostedZoneId=hosted_zone_id
        )
        logger.info(response['ChangeInfo']['Comment'])

        # Take to 255 the weight for the primary_endpoint AKA the OLD secondary
        response = route53.change_resource_record_sets(
            ChangeBatch={
                'Changes': [
                    {
                        'Action': 'UPSERT',
                        'ResourceRecordSet': {
                            'Name': VAULT_ENDPOINT,
                            'Type': 'CNAME',
                            'Weight': 255,
                            'SetIdentifier': f'vault-{"dr" if primary_endpoint.find("-dr") != -1 else "primary"}',
                            'AliasTarget': {
                                'HostedZoneId': hosted_zone_id,
                                'DNSName': primary_endpoint,
                                'EvaluateTargetHealth': False,
                            }
                        }
                    }
                ],
                'Comment': f'Weight of endpoint {primary_endpoint} set to 255'
            },
            HostedZoneId=hosted_zone_id
        )
        logger.info(response['ChangeInfo']['Comment'])
    except Exception as e:
        raise e
