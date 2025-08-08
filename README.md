# Azure Pipeline Batch Deployer

A Vue 3 web application for batch deploying multiple Azure DevOps pipelines with one click. Monitor deployment status in real-time with automatic refresh.

## Features

- **One-Click Batch Deployment**: Deploy multiple pipelines simultaneously
- **Real-time Status Monitoring**: Auto-refresh every 5 seconds to track pipeline progress
- **Simple Configuration**: Enter your Azure DevOps credentials once
- **Batch Import**: Import multiple pipeline/build ID pairs at once
- **Visual Progress Tracking**: See deployment progress with color-coded status indicators
- **Deployment History**: Track all your batch deployments

## Prerequisites

- Node.js (v14 or higher)
- Azure DevOps account with appropriate permissions
- Personal Access Token (PAT) with Build and Release permissions

## Setup

1. **Clone or download this project**

2. **Install dependencies**:
   ```bash
   cd azure-pipeline-deployer
   npm install
   ```

3. **Create Personal Access Token**:
   - Go to Azure DevOps: `https://dev.azure.com/{your-org}/_usersSettings/tokens`
   - Create a new token with these permissions:
     - Build: Read & Execute
     - Release: Read, Write & Execute
   - Copy the token (you won't be able to see it again)

4. **Run the application**:
   ```bash
   npm run dev
   ```

5. **Open in browser**:
   Navigate to `http://localhost:5173`

## Usage

### Initial Configuration

1. Enter your Azure DevOps Organization name
2. Enter your Project name
3. Paste your Personal Access Token
4. Click "Connect" to verify the connection

### Adding Pipelines

**Option 1: Add individually**
- Enter Pipeline ID and Build ID
- Click "Add"

**Option 2: Batch import**
- Use comma-separated format: `pipelineId:buildId, pipelineId:buildId`
- Example: `123:456, 789:012, 345:678`
- Click "Import Batch"

### Deploying

1. Add all pipelines you want to deploy
2. Click "Deploy All" button
3. Watch real-time status updates
4. Click on "View" links to see pipelines in Azure DevOps

### Status Indicators

- **Ready**: Pipeline added, not yet deployed
- **Started/In Progress**: Deployment running
- **Succeeded**: Deployment completed successfully (green)
- **Failed**: Deployment failed (red)

## Configuration Storage

The app stores your Azure DevOps configuration in browser localStorage for convenience. To change configuration, click "Change Config" button.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Security Notes

- PAT tokens are stored in browser localStorage
- For production use, consider implementing proper authentication
- Never commit tokens to version control

## Troubleshooting

**Connection Failed**
- Verify your organization and project names are correct
- Ensure your PAT has the required permissions
- Check that your PAT hasn't expired

**Pipeline Won't Deploy**
- Verify the Pipeline ID and Build ID are correct
- Ensure the build exists and is accessible
- Check that your PAT has Execute permissions

**Status Not Updating**
- The app auto-refreshes every 5 seconds
- Click "Refresh Status" to manually update
- Check browser console for any errors

## CORS Issues

If you encounter CORS errors when connecting to Azure DevOps:
1. Consider using a browser extension to disable CORS for development
2. For production, set up a proxy server or use Azure Functions as a backend

## License

MIT