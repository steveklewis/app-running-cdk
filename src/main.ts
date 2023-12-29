import { App, Stack, StackProps } from 'aws-cdk-lib';
// import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { CfnService } from 'aws-cdk-lib/aws-apprunner';
import { Construct } from 'constructs';

import * as config from '../config.json';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    // VPC
    // const vpc = new ec2.Vpc(this, 'Vpc', {
    //   ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16')
    // });

    // const vpcEndpoint = new ec2.VpcEndpoint(this, 'VpcEndpoint');

    // const vpcConnector = new apprunner.VpcConnector(this, 'VpcConnector', {
    //   vpc,
    //   vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
    //   vpcConnectorName: 'MyVpcConnector',
    // });


    new CfnService(this, 'AppRunningService', {
      sourceConfiguration: {
        authenticationConfiguration: {
          connectionArn: config.connectionArn
        },
        autoDeploymentsEnabled: false,
        codeRepository: {
          codeConfiguration: {
            configurationSource: "REPOSITORY"
          },
          repositoryUrl: 'https://github.com/steveklewis/app-running',
          sourceCodeVersion: {
            type: 'BRANCH',
            value: 'main',
          },
        },
      },
    });
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