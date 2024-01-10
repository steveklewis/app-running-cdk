import { App, Stack, StackProps,
  CfnOutput
} from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { CfnService, CfnVpcIngressConnection } from 'aws-cdk-lib/aws-apprunner';
import { Construct } from 'constructs';

import * as config from '../config.json';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const subnetConfiguration: ec2.SubnetConfiguration = {
      name: 'PrivateSubnetForVpc',
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    };

    const vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      subnetConfiguration: [subnetConfiguration]
    });


    // const vpcConnector = new apprunner.VpcConnector(this, 'VpcConnector', {
    //   vpc,
    //   vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
    //   vpcConnectorName: 'MyVpcConnector',
    // });


    const appRunnerService = new CfnService(this, 'AppRunningService', {
      sourceConfiguration: {
        authenticationConfiguration: {
          connectionArn: config.connectionArn,
        },
        autoDeploymentsEnabled: false,
        codeRepository: {
          codeConfiguration: {
            configurationSource: 'REPOSITORY',
          },
          repositoryUrl: 'https://github.com/steveklewis/app-running',
          sourceCodeVersion: {
            type: 'BRANCH',
            value: 'main',
          },
        },
      },
      networkConfiguration: {
        ingressConfiguration: {
          isPubliclyAccessible: false
        }
      }
    });

    const securityGroupAllowEgress443 = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      description: 'Allow 443 to egress',
      allowAllOutbound: false,
      disableInlineRules: false
    });
    //This will add the rule as an external cloud formation construct
    securityGroupAllowEgress443.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'all 443 egress to AppRunner service')


    const vpcEndpointService : ec2.InterfaceVpcEndpointService = new ec2.InterfaceVpcEndpointService(
      'com.amazonaws.us-east-1.apprunner.requests', 443);

    const vpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'VpcEndpoint', {
      vpc,
      service: vpcEndpointService,
      subnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }),
      securityGroups: [securityGroupAllowEgress443]
    });

    vpcEndpoint.node.addDependency(appRunnerService);

    let vpcIngressConnection = new CfnVpcIngressConnection(this, 'MyCfnVpcIngressConnection', {
      ingressVpcConfiguration: {
        vpcEndpointId: vpcEndpoint.vpcEndpointId,
        vpcId: vpc.vpcId,
      },
      serviceArn: appRunnerService.attrServiceArn,
      // the properties below are optional
      tags: [{
        key: 'key',
        value: 'value',
      }],
      vpcIngressConnectionName: 'vpcIngressConnectionName',
    });

    // App Runner URL output
    new CfnOutput(this, "AppRunnerService Domain Name", {
      value: `https://${vpcIngressConnection.attrDomainName}`,
    });

    // App Runner status
    new CfnOutput(this, "AppRunnerServiceStatus", {
      value: `https://${appRunnerService.attrStatus}`,
    });


    // App Runner ID output
    new CfnOutput(this, "AppRunnerServiceId", {
      value: `https://${appRunnerService.attrServiceId}`,
    });


    // new CfnOutput(this, 'AppRunnerEndpointNetworkInterfaceIds', {
    //   value: vpcEndpoint.vpcEndpointNetworkInterfaceIds.join(","),
    // });
  }
}



// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'app-running-cdk-dev', { env: devEnv });
// new MyStack(app, 'app-running-cdk-prod', { env: prodEnv });

app.synth();