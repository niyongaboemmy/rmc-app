# GitHub Repository Secrets

All secrets must be added via GitHub repository Settings → Secrets and Variables → Actions.

## Required Secrets

| Secret Name          | Description                                | Set When              |
| -------------------- | ------------------------------------------ | --------------------- |
| `AWS_CONFIGURED`     | Set to `'true'` when AWS is provisioned    | On AWS access granted |
| `STAGING_HOST`       | EC2 staging server IP or hostname          | On AWS provisioning   |
| `STAGING_SSH_KEY`    | Private key (PEM) for staging EC2 SSH      | On AWS provisioning   |
| `PRODUCTION_HOST`    | EC2 production server IP or hostname       | Pre-launch            |
| `PRODUCTION_SSH_KEY` | Private key (PEM) for production EC2 SSH   | Pre-launch            |
| `CODECOV_TOKEN`      | Codecov upload token for coverage reports  | On Codecov setup      |
| `SLACK_WEBHOOK_URL`  | Slack incoming webhook for notifications   | On comms setup        |

## How to Add a Secret

```bash
# Via GitHub CLI
gh secret set SECRET_NAME --body "secret-value"

# Or via GitHub web UI:
# Repository → Settings → Secrets and variables → Actions → New repository secret
```

## Environment Variables (non-secret, public config)

Add these under Settings → Secrets and Variables → Actions → Variables:

| Variable Name    | Value   | Purpose                              |
| ---------------- | ------- | ------------------------------------ |
| `AWS_CONFIGURED` | `true`  | Enables the deploy-to-staging job    |

## SSH Key Generation

```bash
# Generate a dedicated deploy key for each environment
ssh-keygen -t ed25519 -C "rmc-deploy-staging" -f ~/.ssh/rmc_staging_deploy

# Add public key to EC2 ~/.ssh/authorized_keys
# Add private key content to STAGING_SSH_KEY secret
```

## Security Notes

- Never log secrets in CI output — GitHub Actions masks known secrets but avoid explicit echo
- Rotate SSH keys every 90 days
- Use separate keys for staging and production
- Revoke access immediately when team members leave
