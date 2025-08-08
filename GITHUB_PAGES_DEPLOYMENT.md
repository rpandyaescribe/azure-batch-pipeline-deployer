# GitHub Pages Deployment Guide
## Azure Pipeline Deployer

This guide explains how to deploy the Azure Pipeline Deployer to GitHub Pages as a static website.

## Prerequisites

- GitHub account
- Git installed locally
- Node.js 18.x or higher
- npm package manager

## Automatic Deployment with GitHub Actions

### Step 1: Repository Setup

1. Create a new GitHub repository or use existing one
2. Clone the repository locally:
   ```bash
   git clone https://github.com/[username]/[repository-name].git
   cd [repository-name]
   ```

### Step 2: Configure GitHub Actions Workflow

The project includes a pre-configured GitHub Actions workflow at `.github/workflows/deploy-to-pages.yml` that:
- Triggers on push to `trunk` branch
- Builds the Vue application
- Deploys to GitHub Pages automatically

**Important:** Update the repository name in the workflow file:

1. Edit `.github/workflows/deploy-to-pages.yml`
2. Update line 36 with your repository name:
   ```yaml
   VITE_BASE_URL: /your-repository-name/
   ```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under "Source", select **GitHub Actions**
4. Save the settings

### Step 4: Deploy

1. Commit and push your code to the `trunk` branch:
   ```bash
   git add .
   git commit -m "Initial deployment to GitHub Pages"
   git push origin trunk
   ```

2. GitHub Actions will automatically:
   - Install dependencies
   - Build the project using `npm run build`
   - Deploy the `dist` folder to GitHub Pages

3. Monitor the deployment:
   - Go to **Actions** tab in your repository
   - Watch the "Deploy to GitHub Pages" workflow
   - Once complete (green checkmark), your site is live!

### Step 5: Access Your Deployed App

Your app will be available at:
```
https://[username].github.io/[repository-name]/
```

## Manual Deployment

If you prefer to deploy manually without GitHub Actions:

### Option 1: Using gh-pages Package

1. Install gh-pages as a dev dependency:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Add deployment script to `package.json`:
   ```json
   {
     "scripts": {
       "deploy": "npm run build && gh-pages -d dist"
     }
   }
   ```

3. Build and deploy:
   ```bash
   npm run deploy
   ```

### Option 2: Manual Branch Creation

1. Build the project locally:
   ```bash
   npm install
   npm run build
   ```

2. Create and switch to gh-pages branch:
   ```bash
   git checkout -b gh-pages
   ```

3. Copy dist contents to root:
   ```bash
   cp -r dist/* .
   rm -rf dist
   ```

4. Commit and push:
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin gh-pages
   ```

5. Enable GitHub Pages from `gh-pages` branch in repository settings

## Configuration Notes

### Base URL Configuration

The Vite configuration (`vite.config.js`) is set up to handle the base URL automatically:

```javascript
base: process.env.VITE_BASE_URL || '/'
```

This ensures your app works correctly when deployed to GitHub Pages subdirectory.

### CORS and API Calls

Since GitHub Pages only serves static content, all Azure DevOps API calls are made directly from the browser. Ensure your Azure DevOps PAT has appropriate permissions and consider:

1. **CORS Issues**: Azure DevOps APIs support CORS, but you may need to:
   - Use a PAT with proper permissions
   - Ensure your organization allows API access

2. **Security**: Since the PAT is stored in browser localStorage:
   - Users should use PATs with minimal required permissions
   - Consider implementing token rotation reminders

## Updating the Deployment

To update your deployed app:

1. Make changes locally
2. Commit and push to `trunk`:
   ```bash
   git add .
   git commit -m "Update: [description]"
   git push origin trunk
   ```
3. GitHub Actions will automatically redeploy

## Troubleshooting

### Build Fails in GitHub Actions

Check the Actions tab for error logs. Common issues:
- Missing dependencies: Ensure `package-lock.json` is committed
- Build errors: Test build locally with `npm run build`

### 404 Error on Deployed Site

1. Verify GitHub Pages is enabled
2. Check that deployment completed successfully
3. Ensure the base URL in vite.config.js matches your repository name
4. Wait a few minutes for GitHub Pages to propagate changes

### Blank Page After Deployment

1. Check browser console for errors
2. Verify the base path is correct:
   - Repository name in workflow file
   - Base URL in vite.config.js
3. Ensure all assets are loading from correct paths

### API Connection Issues

1. Verify PAT token has correct permissions:
   - Build: Read & Execute
   - Release: Read, Write & Execute
   - Pipeline: Approve
2. Check browser console for CORS errors
3. Ensure Azure DevOps organization allows API access

## Best Practices

1. **Use Environment Secrets**: For production, consider using GitHub Secrets for sensitive data
2. **Custom Domain**: You can add a custom domain in GitHub Pages settings
3. **Caching**: The workflow uses npm cache to speed up builds
4. **Branch Protection**: Consider protecting the `trunk` branch to prevent accidental deployments

## Support

For issues specific to:
- **GitHub Pages**: Check [GitHub Pages documentation](https://docs.github.com/pages)
- **GitHub Actions**: See [GitHub Actions documentation](https://docs.github.com/actions)
- **Vue/Vite**: Refer to [Vite documentation](https://vitejs.dev/guide/static-deploy.html#github-pages)