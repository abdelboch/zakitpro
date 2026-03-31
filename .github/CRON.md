# Vercel Cron Jobs Configuration

This project uses Vercel Cron Jobs for automated LinkedIn post processing.

## Configured Cron Jobs

### LinkedIn Queue Processor

- **Path**: `/api/linkedin/queue/process`
- **Schedule**: `0 9,14 * * *` (9 AM and 2 PM UTC daily)
- **Purpose**: Processes scheduled LinkedIn posts from the queue
- **Requirements**: LinkedIn authentication must be active

The cron job:
1. Checks for posts scheduled before the current time
2. Attempts to post them to LinkedIn
3. Handles retries (up to 3 attempts per post)
4. Marks posts as 'posted' or 'failed'

## Configuration

Cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/linkedin/queue/process",
      "schedule": "0 9,14 * * *"
    }
  ]
}
```

## Schedule Format

Vercel uses standard cron expression format:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of the month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of the week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

### Common Patterns

- `0 9 * * *` - Every day at 9:00 AM UTC
- `0 9,14 * * *` - Every day at 9:00 AM and 2:00 PM UTC (current)
- `0 */4 * * *` - Every 4 hours
- `0 9 * * 1-5` - Every weekday at 9:00 AM UTC
- `0 9 * * 1` - Every Monday at 9:00 AM UTC

## Security

The queue processor endpoint can optionally check for a `CRON_SECRET` environment variable to prevent unauthorized execution:

```bash
# In Vercel environment variables
CRON_SECRET=your_random_secret_here
```

If set, the cron job must include the header:
```
x-cron-secret: your_random_secret_here
```

Vercel automatically adds this header to cron requests when the environment variable is set.

## Manual Testing

Test the cron endpoint manually:

```bash
# Without secret
curl -X POST https://zakitpro.com/api/linkedin/queue/process

# With secret
curl -X POST https://zakitpro.com/api/linkedin/queue/process \
  -H "x-cron-secret: your_secret"
```

## Monitoring

- View cron execution logs in Vercel dashboard: Project → Cron Jobs
- Check success/failure rates
- Review execution times
- Monitor for errors

## Updating Schedule

To change the cron schedule:

1. Edit `vercel.json`
2. Update the `schedule` field
3. Commit and push to main
4. Vercel will automatically update the cron job

## Debugging

If posts aren't being processed:

1. **Check authentication**: Visit `/admin/linkedin` and verify connection status
2. **Check queue**: Visit `/admin/linkedin` and review queued posts
3. **Check logs**: View Vercel function logs for errors
4. **Manual trigger**: Use the "Process Now" button in the admin dashboard
5. **Verify schedule**: Ensure posts have `scheduledTime` in the past or no `scheduledTime` set

## Rate Limits

LinkedIn API limits:
- 100 posts per day
- Cron processes scheduled posts only (not all pending posts)
- Additional manual posts via admin dashboard count toward this limit

## Alternative: GitHub Actions Cron

If not using Vercel, you can trigger the endpoint via GitHub Actions:

```yaml
name: Process LinkedIn Queue

on:
  schedule:
    - cron: '0 9,14 * * *'

jobs:
  process-queue:
    runs-on: ubuntu-latest
    steps:
      - name: Process LinkedIn Queue
        run: |
          curl -X POST ${{ secrets.SITE_URL }}/api/linkedin/queue/process \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

## Resources

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Cron Expression Generator](https://crontab.guru/)
