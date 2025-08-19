# XFlows: Container Deployment Action

GitHub Action to build, push to ECR, and deploy to AWS ECS or App Runner with Slack notifications.

## Features

- Build and push Docker images to Amazon ECR
- Deploy to AWS ECS or AWS App Runner
- Enhanced ECS deployment monitoring
- Beautiful Slack notifications with emojis and GIFs
- Performance optimization options

## Usage

### Basic Example

```yaml
- name: Deploy to ECS
  uses: nanocohub/xflows@v1.012
  with:
    target: ecs
    awsRegion: us-west-2
    ecrRepository: my-app
    imageTag: ${{ github.sha }}
    ecsCluster: my-cluster
    ecsServiceWeb: my-service
    taskDefWebPath: .aws/task-definition.json
    containerWebName: web
    slackChannelId: C012345ABCDE
    environmentName: Production
  env:
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

### CI/CD Performance Optimization

For CI/CD pipelines where you want faster execution and don't need the waiting and monitoring features:

```yaml
- name: Deploy to ECS (Fast Mode)
  uses: nanocohub/xflows@v1.012
  with:
    target: ecs
    awsRegion: us-west-2
    ecrRepository: my-app
    imageTag: ${{ github.sha }}
    ecsCluster: my-cluster
    ecsServiceWeb: my-service
    taskDefWebPath: .aws/task-definition.json
    skipHealthCheck: true  # Skip waiting for ECS deployment to stabilize
    skipSlackNotify: true  # Skip Slack notifications
```

### Docker Build Arguments

You can pass build arguments to your Docker build:

```yaml
- name: Deploy with build args
  uses: nanocohub/xflows@v1.012
  with:
    # ... other parameters
    buildArgs: |
      RAILS_ENV=production
      NODE_ENV=production
```

### Environment Variables

The action requires the following environment variables:

- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`: AWS credentials
- `SLACK_BOT_TOKEN`: Slack bot token (required only if `slackChannelId` is provided and `skipSlackNotify` is not set to true)

## Input Parameters

### General

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `target` | Deployment target (`ecs` or `apprunner`) | Yes | - |
| `awsRegion` | AWS region | Yes | - |
| `ecrRepository` | ECR repository name | Yes | - |
| `imageTag` | Image tag | No | `staging` |

### Docker Build

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `buildContext` | Build context directory | No | `.` |
| `dockerfile` | Dockerfile path | No | `Dockerfile` |
| `buildTarget` | Target stage in multi-stage builds | No | - |
| `buildPlatforms` | Build platforms | No | - |
| `buildArgs` | Build arguments | No | - |
| `extraImageTags` | Additional image tags | No | - |
| `extraLabels` | Additional labels | No | - |

### ECS Deployment

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `ecsCluster` | ECS cluster name | Only for ECS | - |
| `ecsServiceWeb` | ECS web service name | Only for ECS | - |
| `ecsServiceWorker` | ECS worker service name | No | - |
| `taskDefWebPath` | Path to web task definition | Only for ECS | - |
| `taskDefWorkerPath` | Path to worker task definition | No | - |
| `containerWebName` | Web container name | No | `web` |
| `containerWorkerName` | Worker container name | No | `sidekiq` |
| `skipHealthCheck` | Skip ECS health check to speed up CI/CD workflows | No | `false` |

### App Runner Deployment

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `appRunnerServiceArn` | App Runner service ARN | Only for App Runner | - |
| `appRunnerAccessRoleArn` | App Runner access role ARN | No | - |
| `appRunnerCpu` | App Runner CPU configuration | No | `1 vCPU` |
| `appRunnerMemory` | App Runner memory configuration | No | `2 GB` |

### Slack Notifications

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `slackChannelId` | Slack channel ID for notifications | No | - |
| `environmentName` | Environment name for notifications | No | `Staging` |
| `skipSlackNotify` | Skip Slack notifications to avoid noise in CI/CD workflows | No | `false` |

## Outputs

| Name | Description |
|------|-------------|
| `imageDigest` | SHA256 digest of the pushed image |
| `imageRef` | Complete image reference (registry/repository@sha256:digest) |
