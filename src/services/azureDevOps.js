import axios from 'axios';

class AzureDevOpsService {
  constructor() {
    this.config = null;
    this.headers = null;
    this.baseUrl = null;
  }

  initialize(config) {
    this.config = config;
    this.headers = {
      'Authorization': `Basic ${btoa(`:${config.pat}`)}`,
      'Content-Type': 'application/json'
    };
    this.baseUrl = `https://dev.azure.com/${config.organization}/${config.project}/_apis`;
  }

  async testConnection() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/pipelines?api-version=7.0`,
        { headers: this.headers }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getPipelines() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/pipelines?api-version=7.0`,
        { headers: this.headers }
      );
      
      if (response.data && response.data.value) {
        return response.data.value.map(pipeline => ({
          id: pipeline.id,
          name: pipeline.name,
          folder: pipeline.folder || '',
          displayName: pipeline.folder ? `${pipeline.folder}/${pipeline.name}` : pipeline.name
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch pipelines:', error.message);
      return [];
    }
  }

  async getPipelineIdByName(pipelineName) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/pipelines?api-version=7.0`,
        { headers: this.headers }
      );
      
      if (response.data && response.data.value) {
        const pipeline = response.data.value.find(p => 
          p.name.toLowerCase() === pipelineName.toLowerCase()
        );
        if (pipeline) {
          return pipeline.id;
        }
      }
      
      throw new Error(`Pipeline '${pipelineName}' not found`);
    } catch (error) {
      throw new Error(`Failed to find pipeline: ${error.message}`);
    }
  }

  async checkBuildStageStatus(buildId, stageName = 'Deploy QA') {
    try {
      // Get build timeline to check stage status
      const response = await axios.get(
        `${this.baseUrl}/build/builds/${buildId}/timeline?api-version=7.0`,
        { headers: this.headers }
      );
      
      if (response.data && response.data.records) {
        // Look for the stage - it might have different state values
        const stageRecords = response.data.records.filter(
          r => r.type === 'Stage' && r.name === stageName
        );
        
        // Take the most recent stage record if multiple exist
        const stageRecord = stageRecords.length > 0 ? stageRecords[stageRecords.length - 1] : null;
        
        if (stageRecord) {
          // Check various success states
          const successStates = ['succeeded', 'success', 'partiallySucceeded'];
          const completeStates = ['completed', 'finished'];
          
          const isCompleted = completeStates.includes(stageRecord.state) || 
                            stageRecord.state === 'completed';
          const isSuccessful = successStates.includes(stageRecord.result) || 
                             stageRecord.result === 'succeeded';
          
          // Stage is deployed if it's completed with success
          const isDeployed = isCompleted && isSuccessful;
          
          console.log(`Stage ${stageName}: state=${stageRecord.state}, result=${stageRecord.result}, deployed=${isDeployed}`);
          
          return {
            found: true,
            deployed: isDeployed,
            state: stageRecord.state,
            result: stageRecord.result,
            stageName: stageRecord.name
          };
        }
        
        // If stage not found, it might not have run yet (which is ok for some scenarios)
        return {
          found: false,
          deployed: false,
          message: `Stage '${stageName}' has not run yet`
        };
      }
      
      return {
        found: false,
        deployed: false,
        message: 'No timeline data available for this build'
      };
    } catch (error) {
      // Check if build exists
      if (error.response?.status === 404) {
        return {
          found: false,
          deployed: false,
          message: 'Build not found',
          error: true
        };
      }
      throw new Error(`Failed to check build status: ${error.message}`);
    }
  }

  async checkBuildPrerequisites(buildId, targetStage) {
    // Define stage dependencies - only check immediate predecessor
    let prerequisites = [];
    
    if (targetStage === 'Deploy QA') {
      prerequisites = ['Deploy Dev']; // Only check Deploy Dev
    } else if (targetStage === 'Deploy Prod') {
      prerequisites = ['Deploy QA']; // Only check Deploy QA
    }
    // Deploy Dev has no prerequisites
    
    const missingStages = [];
    const failedStages = [];
    
    for (const prereqStage of prerequisites) {
      const result = await this.checkBuildStageStatus(buildId, prereqStage);
      
      if (!result.found) {
        missingStages.push(prereqStage);
      } else if (!result.deployed) {
        if (result.state === 'completed' && result.result === 'failed') {
          failedStages.push(prereqStage);
        } else if (result.state === 'skipped') {
          missingStages.push(prereqStage);
        } else {
          missingStages.push(prereqStage);
        }
      }
    }
    
    if (failedStages.length > 0) {
      return {
        valid: false,
        message: `Cannot deploy to ${targetStage}. The following stages failed: ${failedStages.join(', ')}`
      };
    }
    
    if (missingStages.length > 0) {
      return {
        valid: false,
        message: `Cannot deploy to ${targetStage}. The following stages must be completed first: ${missingStages.join(', ')}`
      };
    }
    
    return { valid: true };
  }

  async getPipelineStages(pipelineId) {
    try {
      // Try to get the pipeline definition which includes stages
      const response = await axios.get(
        `${this.baseUrl}/build/definitions/${pipelineId}?api-version=7.0`,
        { headers: this.headers }
      );
      
      // Extract stages from the pipeline YAML or process
      if (response.data && response.data.process) {
        // For YAML pipelines, stages might be in the process
        if (response.data.process.yamlFilename) {
          // This is a YAML pipeline, stages are defined in YAML
          return ['Build', 'Dev', 'QA', 'Prod']; // Default common stages
        }
      }
      
      return [];
    } catch (error) {
      console.log('Could not fetch pipeline stages:', error.message);
      return [];
    }
  }

  async triggerBatchDeployment(pipelines) {
    const results = [];
    const startTime = new Date();

    for (const pipeline of pipelines) {
      try {
        // Get pipeline ID if name is provided instead of ID
        let pipelineId = pipeline.pipelineId;
        let pipelineName = pipeline.pipelineName;
        
        // Check if pipelineId is actually a name (not a number)
        if (pipelineId && isNaN(pipelineId)) {
          // This looks like a name, not an ID
          pipelineName = pipelineId;
          try {
            pipelineId = await this.getPipelineIdByName(pipelineName);
          } catch (error) {
            throw new Error(`Pipeline '${pipelineName}' not found`);
          }
        } else if (!pipelineName && pipelineId) {
          // We have an ID but no name, fetch the name
          try {
            const pipelineResponse = await axios.get(
              `${this.baseUrl}/pipelines/${pipelineId}?api-version=7.0`,
              { headers: this.headers }
            );
            pipelineName = pipelineResponse.data.name;
          } catch (nameError) {
            console.log('Could not fetch pipeline name:', nameError.message);
          }
        }

        // Get build details to use its artifacts
        const buildResponse = await axios.get(
          `${this.baseUrl}/build/builds/${pipeline.buildId}?api-version=7.0`,
          { headers: this.headers }
        );

        const build = buildResponse.data;

        // Check if the stage has already been run
        let stageHasRun = false;
        let stageRecord = null;
        const targetStage = pipeline.targetStage || 'Deploy Dev';
        
        try {
          const timelineResponse = await axios.get(
            `${this.baseUrl}/build/builds/${pipeline.buildId}/timeline?api-version=7.0`,
            { headers: this.headers }
          );
          
          if (timelineResponse.data && timelineResponse.data.records) {
            stageRecord = timelineResponse.data.records.find(
              r => r.type === 'Stage' && r.name === targetStage
            );
            
            if (stageRecord) {
              // Check if stage has been executed (has a state other than 'pending')
              stageHasRun = stageRecord.state !== 'pending' && stageRecord.state !== null;
              console.log(`Stage '${targetStage}' status: ${stageRecord.state}, has run: ${stageHasRun}`);
            }
          }
        } catch (timelineError) {
          console.log('Could not check stage status:', timelineError.message);
        }
        
        let runResponse;
        
        if (stageHasRun && stageRecord) {
          // Stage has already run - we need to re-run it
          console.log(`Re-running stage '${targetStage}' of build ${pipeline.buildId}`);
          
          try {
            // Method 1: Use the stage retry endpoint
            const retryPayload = {
              state: 'retry',
              forceRetryAllJobs: true
            };
            
            runResponse = await axios.patch(
              `${this.baseUrl}/build/builds/${pipeline.buildId}/stages/${stageRecord.id}?api-version=7.1-preview.1`,
              retryPayload,
              { headers: this.headers }
            );
            
            // Return the build info for consistency
            runResponse.data = { 
              id: pipeline.buildId,
              _links: build._links 
            };
            
          } catch (retryError) {
            console.log('Stage retry failed:', retryError.response?.data || retryError.message);
            
            // Fallback: Try updating the build to retry the stage
            const retryUrl = `${this.baseUrl}/build/builds/${pipeline.buildId}?api-version=7.0`;
            runResponse = await axios.patch(
              retryUrl,
              {
                status: 'retry',
                retryStages: [targetStage]
              },
              { headers: this.headers }
            );
          }
          
        } else {
          // Stage has not run yet - run it for the first time
          console.log(`Running stage '${targetStage}' for the first time on build ${pipeline.buildId}`);
          
          try {
            // Method 1: Update build to run the pending stage
            const runStagePayload = {
              status: 'inProgress',
              stagesToRun: [targetStage]
            };
            
            runResponse = await axios.patch(
              `${this.baseUrl}/build/builds/${pipeline.buildId}?api-version=7.0`,
              runStagePayload,
              { headers: this.headers }
            );
            
          } catch (runError) {
            console.log('Direct stage run failed:', runError.response?.data || runError.message);
            
            // Fallback: Create a continuation run that starts at the desired stage
            const continuationPayload = {
              resources: {
                repositories: {
                  self: {
                    refName: build.sourceBranch,
                    version: build.sourceVersion
                  }
                },
                pipelines: [{
                  pipeline: { id: pipelineId },
                  runId: pipeline.buildId,
                  source: 'specific'
                }]
              },
              templateParameters: {},
              variables: {
                'Build.BuildId': pipeline.buildId.toString(),
                'Build.ContinuationToken': pipeline.buildId.toString()
              },
              stagesToRun: [targetStage],
              previewRun: false
            };
            
            runResponse = await axios.post(
              `${this.baseUrl}/pipelines/${pipelineId}/runs?api-version=7.0`,
              continuationPayload,
              { headers: this.headers }
            );
          }
        }

        const runId = runResponse.data.id || pipeline.buildId;
        
        // Check for pending approvals after starting deployment
        setTimeout(async () => {
          const approvalResult = await this.checkAndApproveDeployment(runId, pipeline.targetStage || 'Deploy Dev');
          if (approvalResult.approved) {
            console.log(`Auto-approved ${approvalResult.count} pending approvals for build ${runId}`);
          }
        }, 3000); // Wait 3 seconds for approval gates to be created
        
        results.push({
          pipelineId: pipelineId,
          pipelineName: pipelineName,
          buildId: pipeline.buildId,
          runId: runId,
          targetStage: pipeline.targetStage || 'Deploy Dev',
          status: 'Started',
          url: runResponse.data._links?.web?.href || build._links?.web?.href,
          startTime: new Date().toISOString(),
          success: true,
          isRerun: true // Flag to indicate this is a rerun
        });
      } catch (error) {
        const errorDetails = {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          details: error.response?.data?.message || error.response?.data?.error || error.response?.data
        };
        
        results.push({
          pipelineId: pipeline.pipelineId,
          pipelineName: pipeline.pipelineName,
          buildId: pipeline.buildId,
          targetStage: pipeline.targetStage || 'Deploy Dev',
          status: 'Failed to start',
          error: errorDetails,
          errorMessage: this.formatErrorMessage(errorDetails),
          success: false
        });
      }
    }

    return {
      batchId: `batch_${Date.now()}`,
      startTime: startTime.toISOString(),
      results
    };
  }

  formatErrorMessage(errorDetails) {
    if (errorDetails.status === 401) {
      return 'Authentication failed. Check your PAT token permissions.';
    } else if (errorDetails.status === 404) {
      return 'Pipeline or Build not found. Verify the IDs are correct.';
    } else if (errorDetails.status === 403) {
      return 'Access denied. Ensure your PAT has required permissions.';
    } else if (errorDetails.status === 400) {
      return `Bad request: ${errorDetails.details || errorDetails.message}`;
    } else if (typeof errorDetails.details === 'string') {
      return errorDetails.details;
    } else {
      return errorDetails.message || 'Unknown error occurred';
    }
  }

  async getRunStatus(runId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/pipelines/runs/${runId}?api-version=7.0`,
        { headers: this.headers }
      );

      // Get stage information and error details
      let stages = [];
      let errorDetails = null;
      
      try {
        const timelineResponse = await axios.get(
          `${this.baseUrl}/build/builds/${runId}/timeline?api-version=7.0`,
          { headers: this.headers }
        );
        
        if (timelineResponse.data && timelineResponse.data.records) {
          stages = timelineResponse.data.records
            .filter(record => record.type === 'Stage')
            .map(stage => ({
              name: stage.name,
              state: stage.state,
              result: stage.result,
              startTime: stage.startTime,
              finishTime: stage.finishTime,
              order: stage.order,
              issues: stage.issues || []
            }))
            .sort((a, b) => a.order - b.order);
          
          // Check for failed stages and extract error messages
          const failedStages = stages.filter(s => s.result === 'failed');
          if (failedStages.length > 0) {
            const errors = [];
            failedStages.forEach(stage => {
              if (stage.issues && stage.issues.length > 0) {
                stage.issues.forEach(issue => {
                  errors.push(`${stage.name}: ${issue.message}`);
                });
              } else {
                errors.push(`${stage.name}: Stage failed`);
              }
            });
            errorDetails = errors.join('; ');
          }
        }
      } catch (stageError) {
        console.log('Could not fetch stage details:', stageError.message);
      }

      // If pipeline failed but no stage errors found, try to get build logs
      if (response.data.result === 'failed' && !errorDetails) {
        try {
          const logsResponse = await axios.get(
            `${this.baseUrl}/build/builds/${runId}/logs?api-version=7.0`,
            { headers: this.headers }
          );
          
          if (logsResponse.data && logsResponse.data.value) {
            // Get the last few log entries which usually contain error info
            const lastLogs = logsResponse.data.value.slice(-5);
            errorDetails = 'Pipeline failed. Check logs for details.';
          }
        } catch (logError) {
          console.log('Could not fetch logs:', logError.message);
        }
      }

      return {
        runId,
        state: response.data.state,
        result: response.data.result || 'pending',
        createdDate: response.data.createdDate,
        finishedDate: response.data.finishedDate,
        url: response.data._links.web.href,
        stages,
        errorDetails
      };
    } catch (error) {
      return {
        runId,
        error: error.message
      };
    }
  }

  async checkAndApproveDeployment(buildId, stageName) {
    try {
      // Get approval IDs for the build and stage
      const approvalsUrl = `${this.baseUrl.replace('/_apis', '')}/_apis/pipelines/approvals?api-version=7.1-preview.1`;
      
      const approvalsResponse = await axios.get(approvalsUrl, { 
        headers: this.headers,
        params: {
          buildId: buildId,
          status: 'pending'
        }
      });
      
      if (approvalsResponse.data && approvalsResponse.data.value) {
        const pendingApprovals = approvalsResponse.data.value.filter(
          approval => approval.status === 'pending' && 
                     (approval.stageName === stageName || !stageName)
        );
        
        for (const approval of pendingApprovals) {
          await this.approveDeployment(approval.id);
          console.log(`Auto-approved deployment for stage: ${approval.stageName || stageName}`);
        }
        
        return {
          approved: pendingApprovals.length > 0,
          count: pendingApprovals.length
        };
      }
      
      return { approved: false, count: 0 };
    } catch (error) {
      // Try alternative approach using Release Management API if pipeline approvals fail
      try {
        return await this.checkAndApproveReleaseDeployment(buildId, stageName);
      } catch (releaseError) {
        console.log('No pending approvals found or approval check failed:', error.message);
        return { approved: false, count: 0 };
      }
    }
  }

  async checkAndApproveReleaseDeployment(buildId, stageName) {
    try {
      // Alternative: Check using Release Management API
      const baseUrl = this.baseUrl.replace('dev.azure.com', 'vsrm.dev.azure.com');
      const approvalsUrl = `${baseUrl}/release/approvals?api-version=7.0`;
      
      const response = await axios.get(approvalsUrl, {
        headers: this.headers,
        params: {
          statusFilter: 'pending',
          top: 100
        }
      });
      
      if (response.data && response.data.value) {
        const pendingApprovals = response.data.value.filter(approval => {
          // Match by build ID or stage name if available
          return approval.status === 'pending' && 
                 (approval.release?.artifacts?.some(a => a.definitionReference?.version?.id === buildId.toString()) ||
                  approval.releaseEnvironment?.name === stageName);
        });
        
        for (const approval of pendingApprovals) {
          await this.approveRelease(approval.id);
          console.log(`Auto-approved release deployment for: ${approval.releaseEnvironment?.name || stageName}`);
        }
        
        return {
          approved: pendingApprovals.length > 0,
          count: pendingApprovals.length
        };
      }
      
      return { approved: false, count: 0 };
    } catch (error) {
      console.log('Release approval check failed:', error.message);
      return { approved: false, count: 0 };
    }
  }

  async approveDeployment(approvalId) {
    try {
      const approvalUrl = `${this.baseUrl.replace('/_apis', '')}/_apis/pipelines/approvals/${approvalId}?api-version=7.1-preview.1`;
      
      const approvalPayload = {
        status: 'approved',
        comment: 'Auto-approved by Azure Pipeline Deployer'
      };
      
      const response = await axios.patch(
        approvalUrl,
        approvalPayload,
        { headers: this.headers }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Failed to approve deployment ${approvalId}:`, error.message);
      throw error;
    }
  }

  async approveRelease(approvalId) {
    try {
      const baseUrl = this.baseUrl.replace('dev.azure.com', 'vsrm.dev.azure.com');
      const approvalUrl = `${baseUrl}/release/approvals/${approvalId}?api-version=7.0`;
      
      const approvalPayload = {
        status: 'approved',
        comments: 'Auto-approved by Azure Pipeline Deployer'
      };
      
      const response = await axios.patch(
        approvalUrl,
        approvalPayload,
        { headers: this.headers }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Failed to approve release ${approvalId}:`, error.message);
      throw error;
    }
  }

  async getBatchStatus(runIds) {
    const statuses = [];
    
    for (const runId of runIds) {
      const status = await this.getRunStatus(runId);
      
      // Check for pending approvals after getting status
      if (status.state === 'inProgress' || status.state === 'pending') {
        const approvalResult = await this.checkAndApproveDeployment(runId, null);
        if (approvalResult.approved) {
          status.approvalStatus = `Auto-approved (${approvalResult.count} approvals)`;
        }
      }
      
      statuses.push(status);
    }

    return statuses;
  }
}

export default new AzureDevOpsService();