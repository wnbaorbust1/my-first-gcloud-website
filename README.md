# My First Google Cloud Website

A simple, responsive static website deployed on Google Cloud Platform using App Engine.

## Features

- Clean, modern design with responsive layout
- Hosted on Google Cloud Platform
- Easy deployment with App Engine
- Optimized for performance and security

## Project Structure

```
my-first-gcloud-website/
├── index.html        # Main HTML file
├── style.css         # Stylesheet
├── app.yaml          # App Engine configuration
├── .gcloudignore     # Files to exclude from deployment
├── LICENSE           # MIT License
└── README.md         # This file
```

## Prerequisites

Before you begin, ensure you have:

1. A Google Cloud Platform account ([Sign up here](https://cloud.google.com/))
2. Google Cloud SDK installed ([Installation guide](https://cloud.google.com/sdk/docs/install))
3. A GCP project created

## Setup Instructions

### 1. Install Google Cloud SDK

If you haven't already, install the gcloud CLI:

```bash
# Follow the installation guide for your OS
# https://cloud.google.com/sdk/docs/install
```

### 2. Initialize gcloud

```bash
gcloud init
```

Follow the prompts to:
- Log in to your Google account
- Select or create a GCP project
- Set a default region

### 3. Enable App Engine

```bash
gcloud app create --region=us-central
```

Note: You can only create one App Engine app per project. Choose your region carefully.

## Deployment

### Deploy to App Engine

```bash
gcloud app deploy
```

When prompted:
- Review the service configuration
- Type `Y` to confirm deployment

### View Your Website

After deployment completes:

```bash
gcloud app browse
```

Or visit: `https://YOUR-PROJECT-ID.uc.r.appspot.com`

## Local Development

To test locally, you can use any simple HTTP server:

```bash
# Python 3
python -m http.server 8080

# Node.js (with http-server)
npx http-server -p 8080
```

Then visit `http://localhost:8080` in your browser.

## Monitoring and Management

### View Logs

```bash
gcloud app logs tail -s default
```

### Check App Status

```bash
gcloud app describe
```

### View in Console

Visit the [Google Cloud Console](https://console.cloud.google.com/appengine) to manage your app.

## Customization

### Update Content

1. Edit `index.html` to change the website content
2. Modify `style.css` to adjust styling
3. Redeploy with `gcloud app deploy`

### Add More Pages

1. Create additional HTML files
2. Add handlers in `app.yaml`:

```yaml
- url: /about.html
  static_files: about.html
  upload: about.html
```

## Cost Management

App Engine offers a free tier that includes:
- 28 instance hours per day
- 1 GB outbound traffic per day
- 5 GB Cloud Storage

Monitor your usage in the [GCP Billing Console](https://console.cloud.google.com/billing).

## Troubleshooting

### Deployment Issues

If deployment fails:

```bash
# Check gcloud configuration
gcloud config list

# Verify you're logged in
gcloud auth list

# Check App Engine status
gcloud app describe
```

### Common Errors

- **App Engine not enabled**: Run `gcloud app create`
- **Permission denied**: Ensure you have the App Engine Admin role
- **Region conflicts**: You cannot change region after creating an App Engine app

## Resources

- [App Engine Documentation](https://cloud.google.com/appengine/docs)
- [Google Cloud Console](https://console.cloud.google.com/)
- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)
- [Community Support](https://cloud.google.com/support)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Feel free to fork this project and customize it for your needs!
