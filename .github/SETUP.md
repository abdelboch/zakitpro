# GitHub Actions Setup Guide

This guide explains how to configure GitHub secrets for automated CI/CD deployment.

## Prerequisites

- Admin access to the GitHub repository
- Vercel account with project access
- Node.js and npm installed locally

## Step 1: Get Vercel Credentials

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to project directory
cd /path/to/zakitpro

# Link to existing Vercel project (if not already linked)
vercel link

# View project configuration
cat .vercel/project.json
```

The `.vercel/project.json` file will contain:
```json
{
  "projectId": "prj_xxxxxxxxxxxxx",
  "orgId": "team_xxxxxxxxxxxxx"
}
```

### Option B: From Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project (`zakitpro`)
3. Navigate to **Settings**
4. **Project ID**: Copy from Settings → General
5. **Org ID**: Copy from Settings → General (Organization ID)

### Get Vercel Token

1. Go to https://vercel.com/account/tokens
2. Click **Create Token**
3. Name it: `GitHub Actions - zakitpro`
4. Set scope: **Full Account**
5. Set expiration: **No Expiration** (or set to 1 year and renew annually)
6. Click **Create**
7. **Copy the token immediately** (you won't see it again)

## Step 2: Add Secrets to GitHub

1. Go to your GitHub repository: https://github.com/zakopenc/zakitpro
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add these three secrets:

### Secret 1: VERCEL_TOKEN

- **Name:** `VERCEL_TOKEN`
- **Value:** The token from Step 1 (starts with `vercel_...`)
- Click **Add secret**

### Secret 2: VERCEL_ORG_ID

- **Name:** `VERCEL_ORG_ID`
- **Value:** Your organization/team ID from `.vercel/project.json` (starts with `team_...`)
- Click **Add secret**

### Secret 3: VERCEL_PROJECT_ID

- **Name:** `VERCEL_PROJECT_ID`
- **Value:** Your project ID from `.vercel/project.json` (starts with `prj_...`)
- Click **Add secret**

## Step 3: Verify Setup

### Test Deployment Workflow

1. Make a small change to any file
2. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "Test CI/CD pipeline

   Co-Authored-By: Paperclip <noreply@paperclip.ing>"
   git push origin main
   ```

3. Check GitHub Actions:
   - Go to **Actions** tab on GitHub
   - You should see a "Deploy to Production" workflow running
   - Click on it to view logs

4. Verify deployment succeeded:
   - All jobs should show green checkmarks
   - Visit zakitpro.com to see your changes

### Test PR Preview Workflow

1. Create a feature branch:
   ```bash
   git checkout -b test/ci-preview
   echo "# Test" > test.md
   git add test.md
   git commit -m "Test PR preview"
   git push origin test/ci-preview
   ```

2. Create a Pull Request on GitHub

3. Verify:
   - GitHub Actions runs "PR Preview Deployment"
   - Bot comments with preview URL
   - Preview site is accessible

4. Clean up:
   - Close/delete the test PR
   - Delete the test branch

## Step 4: Configure Notifications (Optional)

### Add Slack Notifications

Edit `.github/workflows/deploy.yml` and add to the `notify` job:

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "🚨 zakitpro.com deployment failed!",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Deployment Failed*\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View logs>"
            }
          }
        ]
      }
```

Then add `SLACK_WEBHOOK_URL` secret to GitHub.

## Troubleshooting

### Error: "Resource not accessible by integration"

**Cause:** GitHub Actions doesn't have permission to comment on PRs.

**Solution:**
1. Go to repository Settings → Actions → General
2. Under "Workflow permissions", select "Read and write permissions"
3. Check "Allow GitHub Actions to create and approve pull requests"
4. Save

### Error: "Vercel token is invalid"

**Cause:** Token expired or incorrect.

**Solution:**
1. Generate a new token at https://vercel.com/account/tokens
2. Update `VERCEL_TOKEN` secret on GitHub
3. Re-run failed workflow

### Error: "Project not found"

**Cause:** Incorrect `VERCEL_PROJECT_ID` or `VERCEL_ORG_ID`.

**Solution:**
1. Run `cat .vercel/project.json` locally
2. Verify the IDs match your GitHub secrets exactly
3. Update secrets if needed

### Deployment succeeds but changes not visible

**Cause:** CDN caching or build cache issues.

**Solution:**
1. Check Vercel dashboard deployment logs
2. Try hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
3. Check Vercel's deployment URL directly (not cached)

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Rotate tokens** annually or when team members leave
3. **Use least-privilege tokens** (Vercel token scoped to specific project if possible)
4. **Enable branch protection** on `main` to require PR reviews
5. **Monitor Actions logs** for suspicious activity

## Next Steps

After CI/CD is configured:

1. ✅ Test workflow with a real article
2. ✅ Set up LinkedIn API integration
3. ✅ Configure monitoring (Sentry, Plausible)
4. ✅ Add content validation rules specific to your needs

## Support

Questions or issues? Contact CTO or create a GitHub issue.

---

**Last Updated:** 2026-03-30
**Maintained by:** CTO (Paperclip Agent)
