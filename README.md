# XFlows: Container Deployment Action

GitHub Action to build, push to ECR, and deploy to AWS ECS or App Runner with Slack notifications. Now with built-in AWS credential management and automatic ECR login - no more separate steps required!

## Features

- Build and push Docker images to Amazon ECR
- Deploy to AWS ECS or AWS App Runner
- Enhanced ECS deployment monitoring
- Beautiful Slack notifications with emojis and GIFs
- Performance optimization options

## Usage

### Basic Example (Simplified)

No more separate AWS credential or ECR login steps needed! XFlows now handles everything internally.

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
    awsAccessKeyId: ${{ secrets.CI_AWS_ACCESS_KEY_ID }}
    awsSecretAccessKey: ${{ secrets.CI_AWS_SECRET_ACCESS_KEY }}
  env:
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

### Using IAM Role (OIDC)

If you're using GitHub OIDC with IAM roles, you can skip the AWS credentials entirely:

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
    awsAccessKeyId: ${{ secrets.CI_AWS_ACCESS_KEY_ID }}
    awsSecretAccessKey: ${{ secrets.CI_AWS_SECRET_ACCESS_KEY }}
    skipHealthCheck: true  # Skip waiting for ECS deployment to stabilize
    skipSlackNotify: true  # Skip Slack notifications
```

### Docker Build Arguments & Caching

You can pass build arguments and use enhanced caching:

```yaml
- name: Deploy with build args and ECR caching
  uses: nanocohub/xflows@v1.012
  with:
    target: ecs
    awsRegion: us-west-2
    ecrRepository: my-app
    imageTag: ${{ github.sha }}
    ecsCluster: my-cluster
    ecsServiceWeb: my-service
    taskDefWebPath: .aws/task-definition.json
    awsAccessKeyId: ${{ secrets.CI_AWS_ACCESS_KEY_ID }}
    awsSecretAccessKey: ${{ secrets.CI_AWS_SECRET_ACCESS_KEY }}
    buildArgs: |
      RAILS_ENV=production
      NODE_ENV=production
    cacheMode: ecr  # Use ECR-based caching for faster builds
    cacheTag: build-cache
```

### Environment Variables

The action requires the following environment variables:

- `SLACK_BOT_TOKEN`: Slack bot token (required only if `slackChannelId` is provided and `skipSlackNotify` is not set to true)

### AWS Authentication

XFlows now supports multiple AWS authentication methods:

1. **Direct credentials** (via action inputs):
   - `awsAccessKeyId`
   - `awsSecretAccessKey`
   - `awsSessionToken` (optional)

2. **Environment variables** (legacy):
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_SESSION_TOKEN` (optional)

3. **IAM roles with OIDC** (GitHub Actions OIDC provider)
   - No credentials needed - uses IAM role assumption

## Input Parameters

### General

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `target` | Deployment target (`ecs` or `apprunner`) | Yes | - |
| `awsRegion` | AWS region | Yes | - |
| `ecrRepository` | ECR repository name | Yes | - |
| `imageTag` | Image tag | No | `staging` |
| `awsAccessKeyId` | AWS access key ID (optional if using IAM role) | No | - |
| `awsSecretAccessKey` | AWS secret access key (optional if using IAM role) | No | - |
| `awsSessionToken` | AWS session token (optional) | No | - |

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
| `cacheMode` | Cache mode: gha, ecr, or registry | No | `gha` |
| `cacheTag` | Cache image tag for ECR/registry caching | No | `cache` |

### Security Scanning

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `skipSecurityScan` | Skip security vulnerability scanning | No | `false` |
| `securitySeverity` | Vulnerability severity levels to check | No | `HIGH,CRITICAL` |
| `securityIgnoreUnfixed` | Ignore unfixed vulnerabilities in scan | No | `true` |

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

## Migration Guide

### From Legacy Workflow (with separate steps)

**Before (multiple steps):**
```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v1
  with:
    aws-access-key-id: ${{ secrets.CI_AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.CI_AWS_SECRET_ACCESS_KEY }}
    aws-region: us-west-2

- name: Login to Amazon ECR
  id: login-ecr
  uses: aws-actions/amazon-ecr-login@v2

- name: Deploy to ECS
  uses: nanocohub/xflows@v1.012
  with:
    target: ecs
    awsRegion: us-west-2
    ecrRepository: my-app
    # ... other parameters
```

**After (single step with new features):**
```yaml
- name: Deploy to ECS (with parallel deployments & caching)
  uses: nanocohub/xflows@v1.02
  with:
    target: ecs
    awsRegion: us-west-2
    ecrRepository: my-app
    awsAccessKeyId: ${{ secrets.CI_AWS_ACCESS_KEY_ID }}
    awsSecretAccessKey: ${{ secrets.CI_AWS_SECRET_ACCESS_KEY }}
    cacheMode: ecr
    cacheTag: build-cache
    securitySeverity: HIGH,CRITICAL
    # ... other parameters
```

## 🚀 New Features

### Parallel ECS Deployments
All ECS services (web, worker, admin) now deploy **simultaneously** instead of sequentially:
- **60-70% faster** deployments for multi-service setups
- **Independent service updates** - one service failure doesn't block others
- **Real-time progress tracking** for each service

### Enhanced Caching
Choose your caching strategy:

| Mode | Description | Performance |
|------|-------------|-------------|
| `gha` | GitHub Actions cache (default) | Good for small projects |
| `ecr` | ECR-based layer caching | **40-50% faster** for large projects |
| `registry` | Generic registry caching | Flexible for custom registries |

**ECR caching benefits:**
- Persistent across workflow runs
- Shared across branches
- Faster layer reuse for multi-stage builds
- Reduced build times on subsequent runs

### Security Scanning 🔒
**Non-blocking** security vulnerability scanning with Trivy:
- **Automatic scanning** after image build
- **Warning-only** - never blocks deployment
- **Configurable severity levels** (HIGH, CRITICAL by default)
- **Ignores unfixed vulnerabilities** by default
- **Detailed vulnerability reports** in logs

### Development Process 🛠️
**Enhanced development workflow with quality checks:**

```bash
# Development commands
pnpm run typecheck      # TypeScript type checking
pnpm run lint          # ESLint code quality checks
pnpm run lint:fix      # Auto-fix linting issues
pnpm run test          # Run test suite

# Package with quality checks
pnpm run package       # Type check + lint + build
pnpm run package:skip-checks  # Build only (faster)

# Full CI pipeline
pnpm run ci            # typecheck + lint + test
```

**Pre-package validation ensures:**
- ✅ TypeScript compilation passes
- ✅ No unused variables or imports
- ✅ Consistent code style
- ✅ Node.js compatibility
- ✅ ES2022 syntax compliance

```yaml
- name: Deploy with security scanning
  uses: nanocohub/xflows@v1.012
  with:
    # ... other parameters
    securitySeverity: "HIGH,CRITICAL"  # Check HIGH and CRITICAL
    securityIgnoreUnfixed: true        # Ignore unfixed issues
    # skipSecurityScan: true           # Optionally skip scanning
```

**Security scan output example:**
```
🔍 Scanning image for security vulnerabilities...
✅ No critical or high-severity vulnerabilities found
ℹ️ 2 MEDIUM, 5 LOW severity issues (informational)
```

**If vulnerabilities found:**
```
🚨 Security vulnerabilities detected (non-blocking):
   Found 3 vulnerabilities (1 CRITICAL, 2 HIGH)
   ⚠️ 1 CRITICAL vulnerabilities found
   ⚠️ 2 HIGH vulnerabilities found
💡 Review vulnerabilities with: trivy image --severity HIGH,CRITICAL <image>
```

## Outputs

| Name | Description |
|------|-------------|
| `imageDigest` | SHA256 digest of the pushed image |
| `imageRef` | Complete image reference (registry/repository@sha256:digest) |
