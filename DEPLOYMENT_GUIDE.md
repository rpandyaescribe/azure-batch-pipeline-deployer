# Azure Static Web Apps Deployment Guide
## Vue 3 Azure Pipeline Deployer

This guide provides comprehensive instructions for deploying the Vue 3 Azure Pipeline Deployer application to Azure Static Web Apps.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Manual Deployment (Upload Method)](#manual-deployment-upload-method)
3. [Automated Deployment via Azure DevOps](#automated-deployment-via-azure-devops)
4. [Post-Deployment Configuration](#post-deployment-configuration)
5. [Troubleshooting](#troubleshooting)

## Prerequisites

- Azure subscription with Static Web Apps enabled
- Node.js 18.x or higher
- npm or yarn package manager
- Azure CLI (optional, for command-line deployment)
- Azure DevOps account (for automated deployment)

## Manual Deployment (Upload Method)

### Step 1: Build the Application

1. Navigate to your project directory:
   ```bash
   cd C:\Users\rpandya\azure-pipeline-deployer
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Build the application for production:
   ```bash
   npm run build
   ```
   
   This creates a `dist` folder with the compiled application.

### Step 2: Create Azure Static Web App

1. **Via Azure Portal:**
   - Go to the [Azure Portal](https://portal.azure.com)
   - Click "Create a resource" → "Static Web App"
   - Fill in the basic information:
     - **Subscription**: Select your Azure subscription
     - **Resource Group**: Create new or select existing
     - **Name**: Choose a unique name (e.g., "azure-pipeline-deployer")
     - **Plan**: Select Free tier for development/testing
     - **Region**: Choose the region closest to your users
   - In the deployment section:
     - **Source**: Choose "Other" (for manual upload)
   - Click "Review + Create" → "Create"

2. **Via Azure CLI (Alternative):**
   ```bash
   az staticwebapp create \
     --name azure-pipeline-deployer \
     --resource-group your-resource-group \
     --source https://github.com/your-username/your-repo \
     --location "Central US" \
     --branch main \
     --app-location "/" \
     --output-location "dist"
   ```

### Step 3: Upload Built Files

1. **Method 1: Azure Portal Upload**
   - Go to your Static Web App in the Azure Portal
   - Click on "Overview" → "Functions and content"
   - Click "Browse files" or use the upload interface
   - Upload the entire contents of the `dist` folder
   - Ensure `staticwebapp.config.json` is in the root

2. **Method 2: Azure CLI Upload**
   ```bash
   az staticwebapp deployment create \
     --name azure-pipeline-deployer \
     --resource-group your-resource-group \
     --source ./dist
   ```

3. **Method 3: VS Code Extension**
   - Install the "Azure Static Web Apps" extension
   - Right-click the `dist` folder
   - Select "Deploy to Static Web App"
   - Follow the prompts

## Automated Deployment via Azure DevOps

### Step 1: Set Up Azure DevOps Project

1. Create a new Azure DevOps project or use existing one
2. Push your code to Azure DevOps repository
3. Ensure the `azure-pipelines.yml` file is in the root directory

### Step 2: Create Static Web App with CI/CD

1. **Create Static Web App:**
   - In Azure Portal, create a Static Web App
   - Choose "Azure DevOps" as the source
   - Select your organization, project, and repository
   - Set build details:
     - **Branch**: main
     - **Build preset**: Custom
     - **App location**: `/`
     - **Output location**: `dist`

2. **Configure Pipeline Variables:**
   - In Azure DevOps, go to Pipelines → Library
   - Create a variable group or add variables to the pipeline:
     - `AZURE_STATIC_WEB_APPS_API_TOKEN`: Get this from the Azure Portal (Static Web App → Manage deployment token)

### Step 3: Run the Pipeline

1. The pipeline will trigger automatically on commits to the main branch
2. Monitor the build in Azure DevOps Pipelines
3. Check the deployment status in Azure Portal

## Post-Deployment Configuration

### 1. Configure Custom Domain (Optional)

1. In Azure Portal, go to your Static Web App
2. Navigate to "Custom domains"
3. Click "Add" and follow the DNS configuration steps

### 2. Environment Variables

If your app needs environment variables:
1. Go to "Configuration" in your Static Web App
2. Add application settings as needed
3. These will be available as `process.env.VARIABLE_NAME` in your app

### 3. Authentication (Optional)

To add authentication:
1. Go to "Authentication" in your Static Web App
2. Configure identity providers as needed
3. Update your Vue app to handle authentication

### 4. CORS Verification

The `staticwebapp.config.json` includes CORS settings for Azure DevOps APIs:
- `https://dev.azure.com` - For Azure DevOps REST APIs
- `https://vsrm.dev.azure.com` - For Azure DevOps Release Management APIs

Verify these work correctly after deployment.

## Configuration Files Explained

### staticwebapp.config.json
This file handles:
- **Routing**: SPA routing with fallback to index.html
- **Security Headers**: Content Security Policy, XSS protection, etc.
- **Caching**: Optimal caching for static assets
- **CORS**: Allows API calls to Azure DevOps
- **MIME Types**: Proper content type serving

### azure-pipelines.yml
This pipeline:
- **Builds** the Vue app using Node.js 18.x
- **Caches** node_modules for faster builds
- **Tests** the application (add test steps as needed)
- **Deploys** to Azure Static Web Apps using the deployment token

### vite.config.js Updates
The configuration includes:
- **Production optimizations**: Chunk splitting, asset organization
- **Azure Static Web Apps compatibility**: Proper base path and asset handling
- **Performance**: Vendor chunk separation for better caching

## Troubleshooting

### Build Issues
- **Error: "npm ci failed"**: Delete `node_modules` and `package-lock.json`, then run `npm install`
- **Vite build errors**: Check console for specific errors, ensure all dependencies are installed

### Deployment Issues
- **404 errors**: Verify `staticwebapp.config.json` is in the root of your deployment
- **API calls failing**: Check CORS settings in `staticwebapp.config.json`
- **Assets not loading**: Verify the `base` path in `vite.config.js` is set to `/`

### Azure DevOps API Issues
- **401 Unauthorized**: Verify your PAT token has the correct permissions
- **CORS errors**: Ensure the Azure DevOps URLs are in the CSP policy

### Performance Issues
- **Slow loading**: Enable source maps temporarily to debug: set `sourcemap: true` in `vite.config.js`
- **Large bundle size**: Review the vendor chunks configuration and consider code splitting

## Security Considerations

1. **PAT Token Security**: Never commit PAT tokens to source control
2. **CSP Policy**: The current policy is restrictive but allows necessary Azure DevOps API calls
3. **HTTPS**: Azure Static Web Apps enforces HTTPS automatically
4. **Authentication**: Consider adding Azure AD authentication for production use

## Monitoring and Maintenance

1. **Application Insights**: Enable in Azure Portal for monitoring
2. **Log Analytics**: Configure for detailed logging
3. **Health Checks**: Implement application health endpoints
4. **Updates**: Regularly update dependencies for security patches

## Cost Optimization

- **Free Tier**: Suitable for development/testing (100 GB bandwidth, 0.5 GB storage)
- **Standard Tier**: For production use with custom domains and higher limits
- **Monitor Usage**: Check bandwidth and storage usage regularly

## Additional Resources

- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Vue.js Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Azure DevOps Pipelines](https://docs.microsoft.com/en-us/azure/devops/pipelines/)

## Support

For issues specific to this application:
1. Check the troubleshooting section above
2. Review Azure Static Web Apps logs in the Azure Portal
3. Check Azure DevOps pipeline logs for build/deployment issues