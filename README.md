# Marketing CDN

A content delivery network (CDN) powered by Cloudflare Workers and R2 storage for serving marketing assets.

## Overview

This CDN serves marketing assets through Cloudflare's global edge network, providing fast and reliable content delivery. It uses Cloudflare Workers for request handling and R2 for asset storage.

## Architecture

- **Storage**: Cloudflare R2 bucket for asset storage
- **Edge Network**: Cloudflare Workers for request handling and caching
- **Custom Domain**: Configured through Cloudflare DNS

## Important Links

- [R2 Bucket Dashboard](https://dash.cloudflare.com/YOUR_ACCOUNT_ID/workers/services/view/marketing-cdn/production?time-window=1440&versionFilter=all)
- [Workers Dashboard](https://dash.cloudflare.com/YOUR_ACCOUNT_ID/r2/default/buckets/marketing-cdn)

## Usage

### Uploading Assets

Assets can be uploaded to the R2 bucket through:

- Cloudflare Dashboard
- AWS S3 compatible API
- Wrangler CLI

### Accessing Assets

Assets can be accessed through the CDN URL:

```
https://files.point.com/asset-name-path
```

## Configuration

### Prerequisites

- Cloudflare Account
- Wrangler CLI (for development)

### Environment Variables

Required environment variables in your Worker:

```
R2_BUCKET_NAME=your-bucket-name
ALLOWED_ORIGINS=comma,separated,origins
```

## Development

1. Install Wrangler:

```bash
npm install -g wrangler
```

2. Login to Cloudflare:

```bash
wrangler login
```

3. Deploy the Worker:

```bash
wrangler deploy
```

## Security

- Access control through allowed origins
- Asset path validation
- Cache-Control headers management
- Optional: Custom authentication mechanisms
